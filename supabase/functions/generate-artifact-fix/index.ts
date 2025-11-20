import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callKimiWithRetryTracking, extractTextFromKimi, extractTokenUsage, calculateKimiCost, logAIUsage } from "../_shared/openrouter-client.ts";
import { getCorsHeaders } from "../_shared/cors-config.ts";
import { MODELS, RATE_LIMITS } from "../_shared/config.ts";
import { handleKimiError } from "../_shared/api-error-handler.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { content, type, errorMessage } = requestBody;

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service_role client for rate limiting checks
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ============================================================================
    // CRITICAL SECURITY: Rate Limiting (Defense-in-Depth)
    // ============================================================================
    // Parallelize API throttle and user rate limit checks for faster response
    // This prevents:
    // 1. API abuse (unlimited expensive Kimi K2 requests)
    // 2. Service degradation (overwhelming external APIs)
    // 3. Financial damage (Kimi K2 costs ~$0.02 per 1K tokens)
    // ============================================================================
    const [
      { data: apiThrottleResult, error: apiThrottleError },
      { data: userRateLimitResult, error: userRateLimitError }
    ] = await Promise.all([
      // Check Kimi API throttle (10 RPM for artifact generation - stricter than chat)
      serviceClient.rpc("check_api_throttle", {
        p_api_name: "kimi-k2",
        p_max_requests: RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS,
        p_window_seconds: RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS
      }),
      // Check authenticated user rate limit (50 requests per 5 hours)
      serviceClient.rpc("check_user_rate_limit", {
        p_user_id: user.id,
        p_max_requests: RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS,
        p_window_hours: RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS
      })
    ]);

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
      console.warn(`[${requestId}] 🚨 API throttle exceeded for Kimi K2 artifact fix`);
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
      console.warn(`[${requestId}] 🚨 User rate limit exceeded (${RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS} per ${RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS}h)`);
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

    console.log(`[${requestId}] Generating fix for artifact type: ${type}, user: ${user.id}, error:`, errorMessage.substring(0, 100));

    // Track timing for latency calculation
    const startTime = Date.now();

    // Build context-aware system prompt based on artifact type
    let systemPrompt = `You are an expert code debugger and fixer. Your task is to analyze the provided code and fix the error.

IMPORTANT RULES:
1. Return ONLY the fixed code, no explanations or markdown code blocks
2. Preserve the original structure and functionality as much as possible
3. Fix ONLY the specific error mentioned
4. Do not add comments explaining the fix
5. Ensure the code is complete and runnable`;

    // Add type-specific guidance
    if (type === "react") {
      systemPrompt += `\n\nREACT ARTIFACT RULES:
- Cannot use @/components/ui/* imports (use Radix UI primitives instead)
- Cannot use localStorage or sessionStorage (use useState instead)
- Must have a default export
- Available libraries: React, Radix UI (@radix-ui/*), Tailwind CSS, lucide-react, recharts, framer-motion
- Use CDN-available libraries only (no npm imports in artifacts)
- Components must start with uppercase letter`;
    } else if (type === "html") {
      systemPrompt += `\n\nHTML ARTIFACT RULES:
- Ensure all tags are properly closed
- Add missing viewport meta tags for responsive design
- Include alt attributes on images for accessibility
- Avoid inline event handlers (prefer script tags)`;
    } else if (type === "code") {
      systemPrompt += `\n\nCODE ARTIFACT RULES:
- Ensure balanced braces and parentheses
- Check for syntax errors
- Avoid using eval() for security`;
    }

    // Prepare user prompt for Kimi K2-Thinking
    const userPrompt = `Fix this ${type} artifact that has the following error:

ERROR: ${errorMessage}

CODE:
${content}

Return ONLY the fixed code without any explanations or markdown formatting.`;

    // Call Kimi K2-Thinking via OpenRouter with retry logic and tracking
    console.log(`[${requestId}] 🚀 Routing to Kimi K2-Thinking for artifact fix (reasoning model)`);
    const { response, retryCount } = await callKimiWithRetryTracking(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.3, // Lower temperature for more deterministic fixes
        max_tokens: 8000,
        requestId
      }
    );

    if (!response.ok) {
      return await handleKimiError(response, requestId, corsHeaders);
    }

    const data = await response.json();
    let fixedCode = extractTextFromKimi(data, requestId);

    if (!fixedCode) {
      throw new Error("No fixed code returned from AI");
    }

    // Clean up any markdown code blocks that might have been added
    fixedCode = fixedCode.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();

    // Extract token usage for cost tracking
    const tokenUsage = extractTokenUsage(data);
    const estimatedCost = calculateKimiCost(tokenUsage.inputTokens, tokenUsage.outputTokens);

    console.log(`[${requestId}] Generated fix, original length: ${content.length}, fixed length: ${fixedCode.length}`);
    console.log(`[${requestId}] 💰 Token usage:`, {
      input: tokenUsage.inputTokens,
      output: tokenUsage.outputTokens,
      total: tokenUsage.totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    });

    // Log usage to database for admin dashboard (fire-and-forget, non-blocking)
    const latencyMs = Date.now() - startTime;
    logAIUsage({
      requestId,
      functionName: 'generate-artifact-fix',
      provider: 'openrouter',
      model: MODELS.KIMI_K2,
      userId: user.id,
      isGuest: false,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount, // Now uses actual retry count from tracking function
      promptPreview: errorMessage.substring(0, 200),
      responseLength: fixedCode.length
    }).catch(err => console.error(`[${requestId}] Failed to log usage:`, err));
    console.log(`[${requestId}] 📊 Usage logged to database`);

    return new Response(JSON.stringify({ fixedCode }), {
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
