import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callGLMWithRetryTracking, extractTextAndReasoningFromGLM, extractGLMTokenUsage, calculateGLMCost, logGLMUsage, handleGLMError } from "../_shared/glm-client.ts";
import { getCorsHeaders } from "../_shared/cors-config.ts";
import { MODELS, RATE_LIMITS, DEFAULT_MODEL_PARAMS } from "../_shared/config.ts";
import { getRelevantPatterns, getTypeSpecificGuidance } from "../_shared/artifact-rules/error-patterns.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { content, type, errorMessage, validationContext } = requestBody;

    // Input validation
    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid content format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type || typeof type !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid type format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!errorMessage || typeof errorMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid error message format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (content.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Content too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================================
    // Authentication: Optional (supports both authenticated users and guests)
    // ============================================================================
    // Mirrors the pattern from generate-artifact/index.ts
    // Invalid/missing auth tokens are treated as guest requests
    // ============================================================================
    let user = null;
    const authHeader = req.headers.get("Authorization");

    let supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Validate authentication if header provided
    if (authHeader) {
      supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        user = authUser;
      }
      // Note: Invalid tokens fall through as guest (user = null)
    }

    // Determine guest status based on ACTUAL auth result (not header presence)
    const isGuest = !user;

    // Create service_role client for rate limiting checks
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ============================================================================
    // CRITICAL SECURITY: Rate Limiting (Defense-in-Depth)
    // ============================================================================
    // Parallelize API throttle and guest/user rate limit checks for faster response
    // This prevents:
    // 1. API abuse (unlimited expensive GLM-4.7 requests)
    // 2. Service degradation (overwhelming external APIs)
    // 3. Rate-limit bypass via fake auth tokens (now fixed!)
    // ============================================================================
    const [
      { data: apiThrottleResult, error: apiThrottleError },
      rateLimitResult
    ] = await Promise.all([
      // Check GLM-4.7 API throttle (10 RPM for artifact generation - stricter than chat)
      serviceClient.rpc("check_api_throttle", {
        p_api_name: "glm-4.7",
        p_max_requests: RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS,
        p_window_seconds: RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS
      }),
      // Check appropriate rate limit based on VALIDATED auth status
      isGuest ? (async () => {
        // Get client IP address (trusted headers set by Supabase Edge infrastructure)
        // X-Forwarded-For is sanitized by Supabase proxy to prevent spoofing
        const rawClientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
          || req.headers.get("x-real-ip");

        let clientIp: string;
        if (!rawClientIp) {
          // SECURITY: Generate unique ID instead of shared "unknown" bucket
          clientIp = `no-ip_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
          console.warn(
            `[generate-artifact-fix] SECURITY: Missing IP headers (x-forwarded-for, x-real-ip). ` +
            `Using unique identifier: ${clientIp}. Check proxy configuration.`
          );
        } else {
          clientIp = rawClientIp;
        }

        return await serviceClient.rpc("check_guest_rate_limit", {
          p_identifier: clientIp,
          p_max_requests: RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS,
          p_window_hours: RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS
        });
      })() : serviceClient.rpc("check_user_rate_limit", {
        p_user_id: user!.id,
        p_max_requests: RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS,
        p_window_hours: RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS
      })
    ]);

    // Extract rate limit data and error from the result
    const { data: userRateLimitResult, error: userRateLimitError } = rateLimitResult;

    // Generate unique request ID for tracking
    const requestId = crypto.randomUUID();

    // Handle API throttle check results
    if (apiThrottleError) {
      console.error(`[${requestId}] API throttle check error:`, apiThrottleError);
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable",
          requestId,
          retryable: true
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
      );
    } else if (apiThrottleResult && !apiThrottleResult.allowed) {
      console.warn(`[${requestId}] 🚨 API throttle exceeded for GLM-4.7 artifact fix`);
      return new Response(
        JSON.stringify({
          error: "API rate limit exceeded. Please try again in a moment.",
          rateLimitExceeded: true,
          resetAt: apiThrottleResult.reset_at,
          retryAfter: apiThrottleResult.retry_after
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": apiThrottleResult.total.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(apiThrottleResult.reset_at).getTime().toString(),
            "Retry-After": apiThrottleResult.retry_after.toString(),
            "X-Request-ID": requestId
          }
        }
      );
    }

    // Handle user rate limit check results
    let rateLimitHeaders = {};
    if (userRateLimitError) {
      console.error(`[${requestId}] User rate limit check error:`, userRateLimitError);
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable",
          requestId,
          retryable: true
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
      );
    } else if (userRateLimitResult && !userRateLimitResult.allowed) {
      const limitConfig = isGuest ? RATE_LIMITS.ARTIFACT.GUEST : RATE_LIMITS.ARTIFACT.AUTHENTICATED;
      console.warn(`[${requestId}] 🚨 ${isGuest ? 'Guest' : 'User'} rate limit exceeded (${limitConfig.MAX_REQUESTS} per ${limitConfig.WINDOW_HOURS}h)`);
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          rateLimitExceeded: true,
          resetAt: userRateLimitResult.reset_at
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": userRateLimitResult.total.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(userRateLimitResult.reset_at).getTime().toString(),
            "X-Request-ID": requestId
          }
        }
      );
    } else if (userRateLimitResult) {
      // Add rate limit headers to successful responses
      rateLimitHeaders = {
        "X-RateLimit-Limit": userRateLimitResult.total.toString(),
        "X-RateLimit-Remaining": userRateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": new Date(userRateLimitResult.reset_at).getTime().toString()
      };
    }

    console.log(`[${requestId}] Generating fix for artifact type: ${type}, user: ${isGuest ? 'guest' : user!.id}, error:`, errorMessage.substring(0, 100));

    // Track timing for latency calculation
    const startTime = Date.now();

    // Get dynamic error-specific patterns (Lyra-optimized approach)
    const relevantPatterns = getRelevantPatterns(errorMessage);
    const typeGuidance = getTypeSpecificGuidance(type);

    // Build validation context section if available
    const validationSection = validationContext ? `
[VALIDATION CONTEXT]

${validationContext.multipleMutations ? `⚠️ MULTIPLE MUTATIONS DETECTED: This code mutates the same array/object in multiple places.
Auto-fix was DISABLED to prevent "Identifier already declared" errors.
You MUST manually refactor using one of these patterns:
- Use a single mutable copy at function start
- Use functional patterns (map, filter, reduce)
- Use separate variables for each mutation site
` : ''}
${validationContext.autoFixDisabled ? `⚠️ AUTO-FIX WAS DISABLED: The validation system detected issues too complex to auto-fix.
Pay special attention to immutability patterns.
` : ''}
${validationContext.specificIssues?.length > 0 ? `Specific issues detected:
${validationContext.specificIssues.map((issue: string) => `- ${issue}`).join('\n')}
` : ''}` : '';

    // Build focused system prompt with dynamic pattern injection
    const systemPrompt = `You are an expert artifact debugger.

[CRITICAL - ERROR CONTEXT]

ERROR: ${errorMessage}
ARTIFACT TYPE: ${type}
${validationSection}
[FIX PATTERNS]

${relevantPatterns.map((pattern, i) => `${i + 1}. ${pattern}`).join('\n')}

${typeGuidance}

[OUTPUT REQUIREMENTS]

- Return ONLY the complete fixed code
- No explanations or markdown code blocks
- Preserve original structure and functionality
- Fix the ACTUAL error, not symptoms
- Ensure code is complete and runnable`;

    // DEPRECATED: Old static prompt approach
    // Old approach included full pattern library regardless of error type
    // New approach: Dynamic injection of 3-5 relevant patterns only
    // Token reduction: ~650 tokens → ~200 tokens (68% reduction)
    // Quality improvement: Focused fixes, less over-engineering

    // Prepare user prompt for GLM-4.7 (thinking mode enabled)
    const userPrompt = `Fix this ${type} artifact that has the following error:

ERROR: ${errorMessage}

CODE:
${content}

Return ONLY the fixed code without any explanations or markdown formatting.`;

    // Call GLM-4.7 via Z.ai API with retry logic and tracking
    console.log(`[${requestId}] 🚀 Routing to GLM-4.7 for artifact fix (reasoning model)`);
    const { response, retryCount } = await callGLMWithRetryTracking(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.6, // Lower temperature for more deterministic fixes (GLM scale)
        max_tokens: DEFAULT_MODEL_PARAMS.ARTIFACT_MAX_TOKENS,
        requestId,
        enableThinking: true // Enable reasoning for better debugging
      }
    );

    if (!response.ok) {
      return await handleGLMError(response, requestId, corsHeaders);
    }

    const data = await response.json();
    const { text: extractedCode, reasoning: glmReasoning } = extractTextAndReasoningFromGLM(data, requestId);

    if (!extractedCode) {
      throw new Error("No fixed code returned from AI");
    }

    // Structured reasoning parsing removed - ReasoningProvider generates semantic status updates
    const reasoningSteps = null;

    // Clean up any markdown code blocks that might have been added
    const fixedCode = extractedCode.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();

    // Extract token usage for cost tracking
    const tokenUsage = extractGLMTokenUsage(data);
    const estimatedCost = calculateGLMCost(tokenUsage.inputTokens, tokenUsage.outputTokens);

    console.log(`[${requestId}] Generated fix, original length: ${content.length}, fixed length: ${fixedCode.length}`);
    console.log(`[${requestId}] 💰 Token usage:`, {
      input: tokenUsage.inputTokens,
      output: tokenUsage.outputTokens,
      total: tokenUsage.totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    });

    // Log usage to database for admin dashboard (fire-and-forget, non-blocking)
    const latencyMs = Date.now() - startTime;
    logGLMUsage({
      requestId,
      functionName: 'generate-artifact-fix',
      provider: 'z.ai',
      model: MODELS.GLM_4_7,
      userId: isGuest ? null : user!.id,
      isGuest,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount,
      promptPreview: errorMessage.substring(0, 200),
      responseLength: fixedCode.length
    }).catch(err => console.error(`[${requestId}] Failed to log usage:`, err));
    console.log(`[${requestId}] 📊 Usage logged to database`);

    return new Response(JSON.stringify({
      fixedCode,
      reasoning: glmReasoning,
      reasoningSteps: reasoningSteps
    }), {
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders,
        "Content-Type": "application/json",
        "X-Request-ID": requestId
      },
    });
  } catch (e) {
    console.error(`Generate artifact fix error:`, e);
    return new Response(
      JSON.stringify({ error: "An error occurred while generating the fix" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
