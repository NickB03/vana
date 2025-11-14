import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { shouldGenerateImage, shouldGenerateArtifact, getArtifactType, getArtifactGuidance, needsClarification } from "./intent-detector-embeddings.ts";
import { validateArtifactRequest, generateGuidanceFromValidation } from "./artifact-validator.ts";
import { transformArtifactCode } from "./artifact-transformer.ts";
import { callGeminiFlashWithRetry, extractTextFromGeminiFlash, type OpenRouterMessage } from "../_shared/openrouter-client.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { getSystemInstruction } from "../_shared/system-prompt-inline.ts";

// Helper function to extract meaningful title from prompt
function extractImageTitle(prompt: string): string {
  // Remove "generate image of" type phrases
  const cleaned = prompt
    .replace(/^(generate|create|make|draw|design|show me|paint|illustrate)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork)\s+(of\s+)?/i, '')
    .trim();
  
  // Capitalize first letter and limit length
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 50 ? title.substring(0, 47) + '...' : title;
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const requestBody = await req.json();
    const { messages, sessionId, currentArtifact, isGuest, forceImageMode, forceArtifactMode } = requestBody;

    // Generate unique request ID for observability and error correlation
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing request for session:`, sessionId);

    // Debug logging
    console.log(`[${requestId}] 🚀 CODE VERSION: 2025-11-13-v2-DEPLOYED 🚀`);
    console.log(`[${requestId}] Request body:`, JSON.stringify({
      messages: messages?.length,
      sessionId,
      isGuest,
      hasArtifact: !!currentArtifact,
      forceImageMode,
      forceArtifactMode
    }));

    // Input validation
    if (!messages || !Array.isArray(messages)) {
      console.error(`[${requestId}] Invalid messages format`);
      return new Response(
        JSON.stringify({ error: "Invalid messages format", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
      );
    }

    if (messages.length > 100) {
      console.error(`[${requestId}] Too many messages in conversation:`, messages.length);
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
      );
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        console.error(`[${requestId}] Invalid message format:`, msg);
        return new Response(
          JSON.stringify({ error: "Invalid message format", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
        );
      }

      if (!["user", "assistant", "system"].includes(msg.role)) {
        console.error(`[${requestId}] Invalid message role:`, msg.role);
        return new Response(
          JSON.stringify({ error: "Invalid message role", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
        );
      }

      if (typeof msg.content !== "string" || msg.content.length > 50000) {
        console.error(`[${requestId}] Message content too long:`, typeof msg.content, msg.content?.length);
        return new Response(
          JSON.stringify({ error: "Message content too long", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
        );
      }

      if (msg.content.trim().length === 0) {
        console.error(`[${requestId}] Empty message content`);
        return new Response(
          JSON.stringify({ error: "Message content cannot be empty", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
        );
      }
    }
    
    let user = null;

    // Create supabase client for ALL users (guest and authenticated)
    // Guests get basic anon key access, auth users get enhanced client
    let supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Create service_role client for rate limiting checks
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parallelize API throttle and guest rate limit checks for faster response
    const [
      { data: apiThrottleResult, error: apiThrottleError },
      guestRateLimitResult
    ] = await Promise.all([
      // Check Gemini API throttle (15 RPM) - applies to all requests
      serviceClient.rpc("check_api_throttle", {
        p_api_name: "gemini",
        p_max_requests: 15,
        p_window_seconds: 60
      }),
      // Check guest rate limit if applicable
      isGuest ? (async () => {
        // Get client IP address (trusted headers set by Supabase Edge infrastructure)
        // X-Forwarded-For is sanitized by Supabase proxy to prevent spoofing
        const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
          || req.headers.get("x-real-ip")
          || "unknown";

        return await serviceClient.rpc("check_guest_rate_limit", {
          p_identifier: clientIp,
          p_max_requests: 20,
          p_window_hours: 5
        });
      })() : Promise.resolve({ data: null, error: null })
    ]);

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
            "Retry-After": apiThrottleResult.retry_after.toString()
          }
        }
      );
    }

    // Handle guest rate limit check results
    let rateLimitHeaders = {};
    if (isGuest && guestRateLimitResult) {
      const { data: rateLimitResult, error: rateLimitError } = guestRateLimitResult;

      if (rateLimitError) {
        console.error(`[${requestId}] Guest rate limit check error:`, rateLimitError);
        return new Response(
          JSON.stringify({
            error: "Service temporarily unavailable",
            requestId,
            retryable: true
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
        );
      } else if (rateLimitResult && !rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please sign in to continue using the chat.",
            rateLimitExceeded: true,
            resetAt: rateLimitResult.reset_at
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-RateLimit-Limit": rateLimitResult.total.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": new Date(rateLimitResult.reset_at).getTime().toString()
            }
          }
        );
      } else if (rateLimitResult) {
        // Add rate limit headers to successful responses
        rateLimitHeaders = {
          "X-RateLimit-Limit": rateLimitResult.total.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitResult.reset_at).getTime().toString()
        };
      }
    }

    // Authenticated users - verify auth and recreate client with auth header
    if (!isGuest) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        console.error(`[${requestId}] No authorization header for authenticated user`);
        return new Response(JSON.stringify({
          error: "No authorization header",
          requestId,
          debug: { isGuest, type: typeof isGuest, notIsGuest: !isGuest }
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId },
        });
      }

      // Recreate client with auth header for authenticated access
      supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error(`[${requestId}] Invalid auth token`);
        return new Response(JSON.stringify({ error: "Unauthorized", requestId }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId },
        });
      }
      user = authUser;

      // Authenticated user rate limiting (100 requests per 5 hours)
      const { data: userRateLimitResult, error: userRateLimitError } = await serviceClient
        .rpc("check_user_rate_limit", {
          p_user_id: user.id,
          p_max_requests: 100,
          p_window_hours: 5
        });

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
              "X-RateLimit-Reset": new Date(userRateLimitResult.reset_at).getTime().toString()
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

      // Verify session ownership if sessionId is provided
      if (sessionId) {
        const { data: session, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('user_id')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session || session.user_id !== user.id) {
          console.error(`[${requestId}] Unauthorized session access:`, { sessionId, userId: user.id, sessionError });
          return new Response(
            JSON.stringify({ error: 'Unauthorized access to session', requestId }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
          );
        }
      }
    }
    // Guest users already have supabase client initialized above

    console.log("Starting chat stream for session:", sessionId);

    // ============================================================================
    // 🎯 ARCHITECTURE DECISION: Intelligent Model Routing
    // ============================================================================
    // Split requests by intent to use the optimal AI model for each task:
    // - Regular chat: Flash model (fast, cheap, ~2s response)
    // - Code artifacts: Pro model (high quality, ~5s response)
    // - Images: Flash-Image model (specialized capability, ~10s)
    //
    // This gives us:
    // ✅ Independent rate limits per feature (separate API key pools)
    // ✅ Cost optimization (don't use Pro for simple chat)
    // ✅ Better user experience (faster response for common queries)
    // ============================================================================

    // Analyze user prompt to determine which specialized model to use
    const lastUserMessage = messages[messages.length - 1];

    // DEBUG: Log intent detection result
    console.log(`[${requestId}] Analyzing prompt for intent:`, lastUserMessage.content.substring(0, 100));

    // Check if we need clarification FIRST (unless force mode is enabled)
    if (!forceImageMode && lastUserMessage) {
      const clarificationQuestion = await needsClarification(lastUserMessage.content);
      if (clarificationQuestion) {
        console.log(`[${requestId}] ❓ Medium confidence - requesting clarification`);
        // Return clarifying question to user
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: clarificationQuestion } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream", "X-Request-ID": requestId } }
        );
      }
    }

    // Check for explicit user control FIRST (force modes bypass intent detection entirely)
    // Priority: forceArtifactMode > forceImageMode > intent detection
    // Version: 2025-11-13-v2 (cache bust)

    // If artifact mode is explicitly enabled, skip all other checks
    if (forceArtifactMode) {
      console.log(`[${requestId}] 🎯 FORCE ARTIFACT MODE - skipping intent detection`);
      // Jump to artifact generation (will be handled by the artifact check below)
    }
    // If image mode is explicitly enabled and artifact mode is NOT enabled
    else if (forceImageMode) {
      console.log(`[${requestId}] 🎯 FORCE IMAGE MODE - skipping intent detection`);
      // Proceed with image generation
    }

    // Check for image generation (only if not forcing artifact mode)
    const isImageRequest = !forceArtifactMode && (forceImageMode || (lastUserMessage && await shouldGenerateImage(lastUserMessage.content)));
    console.log(`[${requestId}] Image intent detected:`, isImageRequest, forceImageMode ? '(forced by user)' : '(detected)');

    if (isImageRequest) {
      console.log("🎯 Intent detected: IMAGE generation");
      console.log("🔀 Routing to: generate-image (Flash-Image model)");

      try {
        // Get auth header to pass to generate-image function
        const authHeader = req.headers.get("Authorization");

        // Call generate-image edge function with auth header
        const imageResponse = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: lastUserMessage.content,
            mode: 'generate',
            sessionId
          },
          headers: authHeader ? { Authorization: authHeader } : {}
        });

        // Enhanced error logging for debugging
        console.log(`[${requestId}] Image response structure:`, {
          hasError: !!imageResponse.error,
          error: imageResponse.error,
          status: imageResponse.status,
          hasData: !!imageResponse.data,
          dataKeys: imageResponse.data ? Object.keys(imageResponse.data) : []
        });

        if (imageResponse.error) {
          // Log the full error for debugging
          console.error(`[${requestId}] ❌ Image generation error details:`, {
            error: imageResponse.error,
            errorMessage: imageResponse.error?.message,
            status: imageResponse.status,
            dataError: imageResponse.data?.error,
            dataDetails: imageResponse.data?.details,
            fullData: JSON.stringify(imageResponse.data).substring(0, 500)
          });

          // Check if the error data contains useful information
          const errorDetails = imageResponse.data?.details || imageResponse.data?.error || imageResponse.error?.message || "Unknown error";

          const errorMessage = `I encountered an issue generating the image. ${errorDetails}. Please try again. (Request ID: ${requestId})`;
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
            { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream", "X-Request-ID": requestId } }
          );
        }

        // Use storage URL for both display and database
        const { imageUrl, prompt } = imageResponse.data;
        const title = extractImageTitle(prompt);

        // Stream storage URL (works for both display and saving)
        const artifactResponse = `I've generated an image for you: ${title}\n\n<artifact type="image" title="${title}">${imageUrl}</artifact>`;

        // Stream the response - frontend will save this URL to database
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: artifactResponse } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, ...rateLimitHeaders, "X-Request-ID": requestId, "Content-Type": "text/event-stream" } }
        );
      } catch (imgError) {
        console.error(`[${requestId}] Image generation failed:`, imgError);
        const errorMessage = `I encountered an issue generating the image. Please try again. (Request ID: ${requestId})`;
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream", "X-Request-ID": requestId } }
        );
      }
    }

    // Detect artifact generation requests (non-image artifacts)
    // Check for force artifact mode first (explicit user control bypasses intent detection)
    const isArtifactRequest = forceArtifactMode || (lastUserMessage && await shouldGenerateArtifact(lastUserMessage.content));

    if (isArtifactRequest) {
      const artifactType = await getArtifactType(lastUserMessage.content);
      console.log(`🎯 Intent detected: ARTIFACT generation (${artifactType})`, forceArtifactMode ? '(forced by user)' : '(detected)');
      console.log("🔀 Routing to: generate-artifact (Pro model)");

      // Retry configuration for artifact generation
      const MAX_ARTIFACT_RETRIES = 2; // Total of 3 attempts (initial + 2 retries)
      const ARTIFACT_RETRY_DELAYS = [3000, 6000]; // 3s, 6s delays

      let lastError: any = null;

      console.log(`[${requestId}] Starting artifact generation with retry logic (max ${MAX_ARTIFACT_RETRIES + 1} attempts)`);

      for (let attempt = 0; attempt <= MAX_ARTIFACT_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = ARTIFACT_RETRY_DELAYS[attempt - 1];
            console.log(`[${requestId}] Retrying artifact generation (attempt ${attempt + 1}/${MAX_ARTIFACT_RETRIES + 1}) after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.log(`[${requestId}] First attempt at artifact generation`);
          }

          // Get auth header to pass to generate-artifact function
          const authHeader = req.headers.get("Authorization");

          // Call generate-artifact edge function with auth header
          const artifactResponse = await supabase.functions.invoke('generate-artifact', {
            body: {
              prompt: lastUserMessage.content,
              artifactType,
              sessionId
            },
            headers: authHeader ? { Authorization: authHeader } : {}
          });

          // Check for retryable errors (503 service overloaded)
          // Supabase functions.invoke returns { data, error } structure
          if (artifactResponse.error) {
            const errorData = artifactResponse.data;
            // Check if this is a retryable 503 error
            const isRetryable = errorData?.retryable === true;

            // Enhanced logging for debugging
            console.error(`[${requestId}] Artifact generation error (attempt ${attempt + 1}/${MAX_ARTIFACT_RETRIES + 1}):`, {
              error: artifactResponse.error,
              errorMessage: artifactResponse.error?.message,
              retryable: isRetryable,
              errorData: errorData,
              fullResponse: JSON.stringify(artifactResponse)
            });

            // If retryable and we have retries left, continue to next iteration
            if (isRetryable && attempt < MAX_ARTIFACT_RETRIES) {
              lastError = artifactResponse;
              console.log(`[${requestId}] Will retry after ${ARTIFACT_RETRY_DELAYS[attempt]}ms...`);
              continue; // This will trigger the retry with delay
            }

            // Non-retryable error or out of retries
            const errorMessage = errorData?.error || `I encountered an issue generating the artifact. Please try again. (Request ID: ${requestId})`;
            console.error(`[${requestId}] Returning error to user: ${errorMessage}`);
            return new Response(
              `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
              { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream", "X-Request-ID": requestId } }
            );
          }

          // Success! Get artifact code from response
          const { artifactCode } = artifactResponse.data;

          if (attempt > 0) {
            console.log(`[${requestId}] Artifact generation succeeded on attempt ${attempt + 1}`);
          }

          // Stream the artifact response
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: artifactCode } }] })}\n\ndata: [DONE]\n\n`,
            { headers: { ...corsHeaders, ...rateLimitHeaders, "X-Request-ID": requestId, "Content-Type": "text/event-stream" } }
          );

        } catch (artifactError) {
          console.error(`[${requestId}] Artifact generation exception (attempt ${attempt + 1}):`, artifactError);
          lastError = artifactError;

          // If we have retries left, continue to next iteration
          if (attempt < MAX_ARTIFACT_RETRIES) {
            continue;
          }
        }
      }

      // All retries exhausted
      console.error(`[${requestId}] Artifact generation failed after ${MAX_ARTIFACT_RETRIES + 1} attempts`);
      const errorMessage = `I encountered an issue generating the artifact after multiple attempts. The AI service may be temporarily overloaded. Please try again in a moment. (Request ID: ${requestId})`;
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
        { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream", "X-Request-ID": requestId } }
      );
    }

    // Try to get cached context with summary
    let contextMessages = messages;
    try {
      const cacheResponse = await supabase.functions.invoke("cache-manager", {
        body: { sessionId, operation: "get" },
      });
      
      if (cacheResponse.data?.cached) {
        const { messages: cachedMessages, summary } = cacheResponse.data.cached;
        console.log("Using cached context with summary");
        
        // If we have a summary, use it as context instead of all messages
        if (summary) {
          contextMessages = [
            { role: "system", content: `Previous conversation summary: ${summary}` },
            ...messages.slice(-5) // Include last 5 messages for immediate context
          ];
        } else {
          contextMessages = cachedMessages;
        }
      }
    } catch (cacheError) {
      console.warn("Cache fetch failed, using provided messages:", cacheError);
    }

    // Add artifact type guidance based on intent detection
    let artifactGuidance = lastUserMessage ? getArtifactGuidance(lastUserMessage.content) : "";

    // Validate artifact request for potential import issues
    if (lastUserMessage) {
      const validation = validateArtifactRequest(lastUserMessage.content);
      if (!validation.isValid) {
        const validationGuidance = generateGuidanceFromValidation(validation);
        artifactGuidance += validationGuidance;
        console.log("Artifact validation warnings:", validation.warnings);
      }
    }

    // Add artifact editing context if provided
    let artifactContext = "";
    if (currentArtifact) {
      artifactContext = `

CURRENT ARTIFACT CONTEXT (User is editing this):
Title: ${currentArtifact.title}
Type: ${currentArtifact.type}
Current Code:
\`\`\`
${currentArtifact.content}
\`\`\`

When the user asks for changes, modifications, or improvements, you should:
1. Understand what they want to change in the current artifact
2. Generate an UPDATED version of the entire artifact with their requested changes
3. Preserve the parts they didn't ask to change
4. Use the same artifact type and structure unless they explicitly want to change it
5. Always provide the COMPLETE updated artifact code, not just the changes

Treat this as an iterative improvement of the existing artifact.`;
    }

    // Combine artifact guidance with context
    const fullArtifactContext = (artifactContext || artifactGuidance)
      ? artifactContext + (artifactGuidance ? `\n\n${artifactGuidance}` : '')
      : '';

    // Load system instruction from inline template (works in both local and deployed Edge Functions)
    const systemInstruction = getSystemInstruction({ fullArtifactContext });

    // Prepare messages for OpenRouter (OpenAI-compatible format)
    const openRouterMessages: OpenRouterMessage[] = [
      { role: "system", content: systemInstruction },
      ...contextMessages.filter(m => m.role !== "system").map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }))
    ];

    // 🎯 Intent detected: REGULAR CHAT (no artifacts or images)
    // 🔀 Using: Gemini 2.5 Flash Lite via OpenRouter (fast, reliable streaming)
    console.log("🎯 Intent detected: REGULAR CHAT");
    console.log("🔀 Using: Gemini 2.5 Flash Lite via OpenRouter (streaming response)");

    // Call OpenRouter with Gemini 2.5 Flash Lite model (fast, reliable for chat)
    // Artifacts are handled by separate generate-artifact function
    const response = await callGeminiFlashWithRetry(openRouterMessages, {
      temperature: 0.7,
      max_tokens: 8000,
      requestId,
      stream: true
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] 🔴 OpenRouter error:`, response.status, errorText);
      console.error(`[${requestId}] 🔴 Response headers:`, JSON.stringify(Object.fromEntries(response.headers)));

      if (response.status === 429 || response.status === 403) {
        return new Response(
          JSON.stringify({
            error: "API rate limit exceeded. Please try again later.",
            requestId,
            details: errorText
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId },
          }
        );
      }

      // Preserve 503 status for transient "model overloaded" errors
      if (response.status === 503) {
        return new Response(
          JSON.stringify({
            error: "AI service temporarily unavailable",
            requestId,
            status: response.status,
            details: errorText,
            retryable: true
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId },
          }
        );
      }

      return new Response(JSON.stringify({
        error: "AI service error",
        requestId,
        status: response.status,
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId },
      });
    }

    // Trigger background tasks (fire and forget) - only for authenticated users
    if (supabase) {
      (async () => {
        try {
          // Update cache
          await supabase.functions.invoke("cache-manager", {
            body: { sessionId, operation: "update" },
          });

          // Trigger summarization check
          await supabase.functions.invoke("summarize-conversation", {
            body: { sessionId },
          });
        } catch (bgError) {
          console.warn("Background task error:", bgError);
        }
      })();
    }

    // Transform streaming response to fix artifact imports
    // Uses closure-scoped state per stream instance (truly isolated)
    const transformedStream = response.body!.pipeThrough(new TextDecoderStream()).pipeThrough(
      (() => {
        // Closure-scoped state variables - unique per stream instance
        let buffer = '';
        let insideArtifact = false;

        return new TransformStream({
          transform(chunk, controller) {
            buffer += chunk;

            // Check if we're entering an artifact
            if (!insideArtifact && buffer.includes('<artifact')) {
              const artifactStartMatch = buffer.match(/<artifact[^>]*>/);
              if (artifactStartMatch) {
                insideArtifact = true;
              }
            }

            // Check if we have complete artifact(s) and process ALL of them
            if (insideArtifact && buffer.includes('</artifact>')) {
              // Loop to handle multiple artifacts in a single response
              while (true) {
                const fullArtifactMatch = buffer.match(/(<artifact[^>]*>)([\s\S]*?)(<\/artifact>)/);
                if (!fullArtifactMatch) break; // No more complete artifacts

                const [fullMatch, openTag, content, closeTag] = fullArtifactMatch;

                try {
                  const result = transformArtifactCode(content);

                  if (result.hadIssues) {
                    console.log("🔧 Auto-fixed artifact imports:", result.changes);
                    // Replace the artifact content with transformed version
                    buffer = buffer.replace(fullMatch, openTag + result.transformedContent + closeTag);
                  }
                } catch (error) {
                  console.error("❌ Transform failed, sending original artifact:", error);
                  // Continue with original artifact - better than breaking the stream
                  break;
                }

                // Check if there are more artifacts to process
                if (!buffer.includes('</artifact>')) {
                  insideArtifact = false;
                  break;
                }
              }
              insideArtifact = false;
            }

            // Send everything before the current artifact (or everything if no artifact)
            if (!insideArtifact) {
              // No active artifact - send the buffer
              controller.enqueue(buffer);
              buffer = '';
            } else if (buffer.length > 50000) {
              // Safety: if buffer gets too large, send it anyway to avoid memory issues
              console.warn("⚠️ Buffer overflow - sending untransformed artifact");
              controller.enqueue(buffer);
              buffer = '';
              insideArtifact = false;
            }
            // Otherwise, keep buffering until artifact is complete
          },
          flush(controller) {
            // Send any remaining buffered content
            if (buffer) {
              controller.enqueue(buffer);
            }
          }
        });
      })()
    ).pipeThrough(new TextEncoderStream());

    return new Response(transformedStream, {
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders,
        "X-Request-ID": requestId,
        "Content-Type": "text/event-stream"
      },
    });
  } catch (e) {
    // Generate request ID if not already created (error happened before request ID generation)
    const errorRequestId = typeof requestId !== 'undefined' ? requestId : crypto.randomUUID();

    console.error(`[${errorRequestId}] ❌ Chat function error:`, e);
    console.error(`[${errorRequestId}] Error name:`, e?.name);
    console.error(`[${errorRequestId}] Error message:`, e?.message);
    console.error(`[${errorRequestId}] Error stack:`, e?.stack);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request",
        requestId: errorRequestId,
        details: e?.message || String(e)
      }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(req.headers.get("Origin")),
          "Content-Type": "application/json",
          "X-Request-ID": errorRequestId
        },
      }
    );
  }
});
