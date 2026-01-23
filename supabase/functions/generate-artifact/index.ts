/**
 * ============================================================================
 * DEPRECATED: Standalone Artifact Generation Endpoint
 * ============================================================================
 *
 * STATUS: DEPRECATED - DO NOT USE
 * TODO: Remove this endpoint in a future release (target: Q2 2026)
 *
 * REASON FOR DEPRECATION:
 * This endpoint is a legacy code path that is NO LONGER CALLED by the frontend.
 * The main chat flow (`/chat` endpoint) now handles artifact generation via:
 *   - supabase/functions/_shared/tool-executor.ts (routes `generate_artifact` tool calls)
 *   - supabase/functions/_shared/artifact-generator-structured.ts (JSON schema outputs)
 *
 * KEY DIFFERENCES FROM MAIN FLOW:
 * 1. This file uses the old `artifact-validator.ts` (now stubbed)
 * 2. This file uses `generateArtifact()` from gemini-client.ts directly
 * 3. The main flow uses structured outputs with JSON schema validation
 * 4. The main flow integrates with tool calling and streaming in the chat context
 *
 * WHY IT STILL EXISTS:
 * - Left in place for potential rollback scenarios
 * - May be useful for standalone artifact generation API in the future
 * - Removal requires verifying no external integrations depend on it
 *
 * MIGRATION PATH:
 * All artifact generation should go through the `/chat` endpoint with the
 * `generate_artifact` tool call. See artifact-generator-structured.ts for implementation.
 *
 * RELATED FILES:
 * - supabase/functions/_shared/artifact-generator-structured.ts (current implementation)
 * - supabase/functions/_shared/tool-executor.ts (tool routing)
 * - supabase/functions/chat/index.ts (main entry point)
 *
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  generateArtifact,
  extractText,
  extractReasoning,
  extractTokenUsage,
  calculateCost,
  logGeminiUsage
} from "../_shared/gemini-client.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { MODELS, RATE_LIMITS, FEATURE_FLAGS } from "../_shared/config.ts";
import { validateArtifactCode, autoFixArtifactCode } from "../_shared/artifact-validator.ts";
import { getSystemInstruction } from "../_shared/system-prompt-inline.ts";

// NOTE: Retry logic handled in gemini-client.ts
// generateArtifact() uses callGeminiWithRetry() for exponential backoff

// DEPRECATION WARNING: Log when this endpoint is called to track any unexpected usage
console.warn('[DEPRECATED] generate-artifact endpoint loaded. This endpoint is deprecated - use /chat with generate_artifact tool instead.');

// Use shared system prompt for artifact generation
const ARTIFACT_SYSTEM_PROMPT = getSystemInstruction({ currentDate: new Date().toLocaleDateString() });


serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Generate unique request ID for tracking
    const requestId = crypto.randomUUID();

    // DEPRECATION: Log all requests to this endpoint for monitoring
    // This helps track any unexpected usage before removal
    console.warn(`[${requestId}] [DEPRECATED] /generate-artifact endpoint called. ` +
      `Origin: ${origin || 'unknown'}. ` +
      `This endpoint is deprecated - use /chat with generate_artifact tool instead.`);

    const requestBody = await req.json();
    const { prompt, artifactType, sessionId, stream = false } = requestBody;

    // Input validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt is required and must be non-empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (prompt.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Prompt too long (max 10,000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (artifactType && !["react", "html", "svg", "code", "mermaid", "markdown"].includes(artifactType)) {
      return new Response(
        JSON.stringify({ error: "Invalid artifact type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================================
    // CRITICAL SECURITY: Authentication Validation BEFORE Rate Limiting
    // ============================================================================
    // FIX: Validate auth FIRST to prevent rate-limit bypass with fake tokens
    // Invalid/missing auth tokens must be treated as guest requests, not skipped
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
    // 1. API abuse (unlimited expensive Kimi K2 requests)
    // 2. Service degradation (overwhelming external APIs)
    // 3. Financial damage (Kimi K2 costs ~$0.02 per 1K tokens)
    // 4. Rate-limit bypass via fake auth tokens (now fixed!)
    // ============================================================================

    // Skip rate limiting if feature flag is set (for local development only!)
    if (FEATURE_FLAGS.RATE_LIMIT_DISABLED) {
      console.warn(`[${requestId}] ⚠️ Rate limiting DISABLED via feature flag - development mode only!`);
    }

    let rateLimitData: { allowed: boolean; remaining: number; total: number; reset_at: string } | null = null;
    let rateLimitHeaders: Record<string, string> = {};

    if (!FEATURE_FLAGS.RATE_LIMIT_DISABLED) {
      const [
        { data: apiThrottleResult, error: apiThrottleError },
        rateLimitResult
      ] = await Promise.all([
        // Check Gemini 3 Flash API throttle (10 RPM for artifact generation - stricter than chat)
        serviceClient.rpc("check_api_throttle", {
          p_api_name: "gemini-3-flash",
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
              `[generate-artifact] SECURITY: Missing IP headers (x-forwarded-for, x-real-ip). ` +
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
        console.warn(`[${requestId}] 🚨 API throttle exceeded for Gemini 3 Flash artifact generation`);
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

      // Handle rate limit check results (guest or authenticated)
      const { data: rlData, error: rateLimitError } = rateLimitResult;
      rateLimitData = rlData;

      if (rateLimitError) {
        const errorType = isGuest ? "Guest" : "User";
        console.error(`[${requestId}] ${errorType} rate limit check error:`, rateLimitError);
        return new Response(
          JSON.stringify({
            error: "Service temporarily unavailable",
            requestId,
            retryable: true
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
        );
      } else if (rateLimitData && !rateLimitData.allowed) {
        if (isGuest) {
          console.warn(`[${requestId}] 🚨 Guest rate limit exceeded (${RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS} per ${RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS}h)`);
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded. Please sign in to continue using artifact generation.",
              rateLimitExceeded: true,
              resetAt: rateLimitData.reset_at
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "X-RateLimit-Limit": rateLimitData.total.toString(),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": new Date(rateLimitData.reset_at).getTime().toString(),
                "X-Request-ID": requestId
              }
            }
          );
        } else {
          console.warn(`[${requestId}] 🚨 User rate limit exceeded (${RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS} per ${RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS}h)`);
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded. Please try again later.",
              rateLimitExceeded: true,
              resetAt: rateLimitData.reset_at
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "X-RateLimit-Limit": rateLimitData.total.toString(),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": new Date(rateLimitData.reset_at).getTime().toString(),
                "X-Request-ID": requestId
              }
            }
          );
        }
      } else if (rateLimitData) {
        // Add rate limit headers to successful responses
        rateLimitHeaders = {
          "X-RateLimit-Limit": rateLimitData.total.toString(),
          "X-RateLimit-Remaining": rateLimitData.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitData.reset_at).getTime().toString()
        };
      }
    } // End of rate limiting block

    const userType = user ? `user ${user.id}` : "guest";
    console.log(`[${requestId}] Artifact generation request from ${userType}:`, prompt.substring(0, 100));

    // Track timing for latency calculation
    const startTime = Date.now();

    // Construct user prompt for Gemini 3 Flash
    // CRITICAL: Must be explicit about format to ensure pure JSX/React component code
    // for Babel transpilation
    const userPrompt = artifactType === 'react'
      ? `Create a React component for: ${prompt}

CRITICAL FORMAT REQUIREMENTS:
1. Return ONLY pure JSX/React code - NO HTML document structure
2. Do NOT include <!DOCTYPE>, <html>, <head>, <body>, or <script> tags
3. Do NOT wrap the code in HTML - just the React component code
4. Start with imports or the component function directly
5. End with "export default ComponentName;" - nothing after that

CORRECT FORMAT EXAMPLE:
<artifact type="application/vnd.ant.react" title="My Component">
const { useState, useEffect } = React;

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-4">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

export default App;
</artifact>

WRONG FORMAT (DO NOT DO THIS):
<artifact type="application/vnd.ant.react" title="My Component">
function App() { ... }
<!DOCTYPE html>
<html>...</html>
</artifact>

Now create the React component wrapped in artifact tags:`
      : `Create an artifact for: ${prompt}

IMPORTANT: Return the COMPLETE artifact wrapped in XML tags like: <artifact type="application/vnd.ant.react" title="Descriptive Title">YOUR CODE HERE</artifact>

For React artifacts: Return ONLY pure JSX/React component code. Do NOT include <!DOCTYPE>, <html>, <head>, <body> tags. The code will be transpiled by Babel, not rendered as a full HTML page.

Include the opening <artifact> tag, the complete code, and the closing </artifact> tag.`;

    // ============================================================================
    // STREAMING MODE: Real-time Gemini thinking + content streaming (SSE)
    // ============================================================================
    // When stream=true, we stream Gemini's native thinking (reasoning_details) first,
    // then the artifact content. This provides true real-time feedback instead of
    // fake animations on pre-received data.
    //
    // SSE Event Format:
    // - event: reasoning_chunk / data: { chunk: "..." }
    // - event: reasoning_complete / data: { reasoning: "full text" }
    // - event: status_update / data: { status: "action phrase" }
    // - event: content_chunk / data: { chunk: "..." }
    // - event: artifact_complete / data: { artifactCode, reasoning, reasoningSteps }
    // - event: error / data: { error: "message" }
    // ============================================================================
    if (stream) {
      console.log(`[${requestId}] 🌊 Streaming mode enabled - using SSE for GLM response`);

      // Create SSE response stream
      const encoder = new TextEncoder();
      const streamHeaders = {
        ...corsHeaders,
        ...rateLimitHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Request-ID": requestId,
      };

      // Use TransformStream for SSE output
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Helper to send SSE events
      const sendEvent = async (event: string, data: unknown) => {
        const eventStr = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        await writer.write(encoder.encode(eventStr));
      };

      // Start streaming GLM response in background
      (async () => {
        // Declare state variables at outer scope for cleanup and access
        let fullReasoning = "";

        try {
          // Call Gemini with streaming enabled
          const geminiResponse = await generateArtifact(
            ARTIFACT_SYSTEM_PROMPT,
            userPrompt,
            {
              enableThinking: true,
              thinkingLevel: 'medium',
              requestId,
            }
          );

          if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error(`[${requestId}] Gemini streaming error (${geminiResponse.status}):`, errorText.substring(0, 200));
            await sendEvent("error", { error: `Gemini API error: ${geminiResponse.status}`, requestId });
            await writer.close();
            return;
          }

          // ============================================================================
          // STREAM PROCESSING: Parse SSE stream from Gemini
          // ============================================================================
          let artifactCode = '';
          let reasoning: string | null = null;

          const reader = geminiResponse.body?.getReader();
          if (!reader) {
            throw new Error('Response body is null');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue;
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);

                    // Extract content chunks
                    const content = extractText(parsed, requestId);
                    if (content) {
                      artifactCode += content;
                      await sendEvent("content_chunk", { chunk: content });
                    }

                    // Extract reasoning chunks
                    const reasoningChunk = extractReasoning(parsed, requestId);
                    if (reasoningChunk) {
                      fullReasoning += reasoningChunk;
                      await sendEvent("reasoning_chunk", { chunk: reasoningChunk });
                      if (!reasoning) reasoning = reasoningChunk;
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Send reasoning complete event
          if (fullReasoning) {
            const cleanedReasoning = fullReasoning
              .replace(/<artifact[^>]*>[\s\S]*?<\/artifact>/gi, '[artifact code]')
              .replace(/<\/?artifact[^>]*>/gi, '')
              .trim();

            await sendEvent("reasoning_complete", {
              reasoning: cleanedReasoning,
              reasoningSteps: null,
            });

            console.log(`[${requestId}] 🧠 Reasoning sent (cleaned: ${fullReasoning.length} → ${cleanedReasoning.length} chars)`);
          }

          // Post-process artifact code (artifactCode already declared above)

          // Strip HTML document structure if present
          if (artifactType === 'react' || artifactCode.includes('application/vnd.ant.react')) {
            const htmlDocPattern = /<!DOCTYPE\s+html[\s\S]*$/i;
            if (htmlDocPattern.test(artifactCode)) {
              console.log(`[${requestId}] ⚠️  Stripping HTML document structure from streamed artifact`);
              artifactCode = artifactCode.replace(htmlDocPattern, '').trim();
              artifactCode = artifactCode.replace(/<\/artifact>\s*$/i, '').trim();
              if (artifactCode.includes('<artifact') && !artifactCode.includes('</artifact>')) {
                artifactCode = artifactCode + '\n</artifact>';
              }
            }
          }

          // ============================================================================
          // VALIDATION: Gemini 3 Flash doesn't have GLM-specific syntax issues
          // ============================================================================
          // Gemini generates cleaner code than GLM, so we skip pre-validation

          // ALWAYS run autoFixArtifactCode to ensure:
          // - Duplicate imports are merged (PHASE 0)
          // - TypeScript is stripped (PHASE 1)
          // - All auto-fixable issues are proactively fixed (PHASE 2+)
          const { fixed, changes } = autoFixArtifactCode(artifactCode);
          if (changes.length > 0) {
            console.log(`[${requestId}] ✅ Auto-fixed ${changes.length} streaming artifact issue(s): ${changes.join(', ')}`);
            artifactCode = fixed;
          }

          // Validate AFTER auto-fix to catch remaining issues
          const validation = validateArtifactCode(artifactCode, artifactType || 'react');
          if (!validation.valid) {
            console.warn(`[${requestId}] ⚠️  Validation issues after auto-fix:`, validation.issues);
          }

          // Structured reasoning parsing removed - ReasoningProvider generates semantic status updates
          const reasoningSteps = null;

          // ============================================================================
          // FINALIZATION: Generate completion summary
          // ============================================================================
          const artifactDescription = artifactType === 'react'
            ? 'React component'
            : artifactType || 'artifact';
          const finalSummary = `Completed ${artifactDescription} based on your request`;

          // Emit final status update
          await sendEvent("status_update", { status: finalSummary, final: true });
          console.log(`[${requestId}] ✅ Final status: "${finalSummary}"`);

          // Send final completion event
          await sendEvent("artifact_complete", {
            success: true,
            artifactCode,
            reasoning,
            reasoningSteps,
            finalSummary, // Include for frontend to use in ticker
            requestId,
            validation: {
              autoFixed: !validation.valid && validation.canAutoFix,
              issueCount: validation.issues.length,
            },
          });

          // Log usage (fire-and-forget)
          const latencyMs = Date.now() - startTime;
          logGeminiUsage({
            requestId,
            functionName: 'generate-artifact-stream',
            userId: user?.id,
            isGuest: !user,
            inputTokens: 0, // Not available in streaming mode
            outputTokens: 0,
            totalTokens: 0,
            latencyMs,
            statusCode: 200,
            estimatedCost: 0,
            retryCount: 0,
            promptPreview: prompt.substring(0, 200),
            responseLength: artifactCode.length,
          }).catch(err => console.error(`[${requestId}] Failed to log streaming usage:`, err));

          console.log(`[${requestId}] ✅ Streaming artifact complete: ${artifactCode.length} chars in ${latencyMs}ms`);

          await writer.close();
        } catch (error) {
          console.error(`[${requestId}] Streaming error:`, error);

          try {
            await sendEvent("error", { error: error instanceof Error ? error.message : "Unknown streaming error", requestId });
            await writer.close();
          } catch (closeError) {
            // Expected: writer may already be closed
            // Log unexpected errors for investigation
            if (!(closeError instanceof TypeError && String(closeError).includes('closed'))) {
              console.error(`[${requestId}] Unexpected error during error handling cleanup:`, closeError);
            }
          }
        }
      })();

      // Return SSE response immediately
      return new Response(readable, { headers: streamHeaders });
    }

    // ============================================================================
    // NON-STREAMING MODE: Original behavior (wait for complete response)
    // ============================================================================
    // Call Gemini 3 Flash via OpenRouter with retry logic
    console.log(`[${requestId}] 🤖 Calling Gemini 3 Flash via OpenRouter`);
    const response = await generateArtifact(
      ARTIFACT_SYSTEM_PROMPT,
      userPrompt,
      {
        enableThinking: true,
        thinkingLevel: 'medium',
        requestId,
        userId: user?.id,
        isGuest: !user,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Gemini API error (${response.status}):`, errorText.substring(0, 200));
      return new Response(
        JSON.stringify({
          error: `Gemini API error: ${response.status}`,
          requestId,
          retryable: true
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Request-ID": requestId
          }
        }
      );
    }

    // Process the streaming response to collect all data
    let rawArtifactCode = '';
    let geminiReasoning: string | null = null;
    let finishReason: string | null = null;
    let tokenUsageData: { inputTokens: number; outputTokens: number; totalTokens: number } | null = null;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Extract content
              const content = extractText(parsed, requestId);
              if (content) {
                rawArtifactCode += content;
              }

              // Extract reasoning
              const reasoning = extractReasoning(parsed, requestId);
              if (reasoning && !geminiReasoning) {
                geminiReasoning = reasoning;
              }

              // Extract finish reason
              if (parsed?.choices?.[0]?.finish_reason) {
                finishReason = parsed.choices[0].finish_reason;
              }

              // Extract token usage
              if (parsed?.usage) {
                tokenUsageData = extractTokenUsage(parsed);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Log finish_reason for debugging token limit issues
    console.log(`[${requestId}] 📊 Generation complete: finish_reason="${finishReason}"`);

    if (finishReason === "length") {
      console.warn(`[${requestId}] ⚠️  HIT TOKEN LIMIT - Response truncated at ${tokenUsageData?.outputTokens || 'unknown'} output tokens`);
      console.warn(`[${requestId}] ⚠️  Consider: 1) Simplifying prompt, 2) Increasing max_tokens further, 3) Using model with higher limits`);
    }

    let artifactCode = rawArtifactCode;

    // Structured reasoning parsing removed - ReasoningProvider generates semantic status updates
    const reasoningSteps = null;

    // ============================================================================
    // POST-GENERATION CLEANUP: Strip HTML Document Structure from React Artifacts
    // ============================================================================
    // AI models sometimes append full HTML documents after the React code
    // This causes Babel transpilation to fail with "Unexpected token '<'"
    // We need to strip everything after the React component ends
    if (artifactType === 'react' || artifactCode.includes('application/vnd.ant.react')) {
      // Check if there's HTML document structure after React code
      const htmlDocPattern = /<!DOCTYPE\s+html[\s\S]*$/i;
      if (htmlDocPattern.test(artifactCode)) {
        console.log(`[${requestId}] ⚠️  Detected HTML document structure in React artifact - stripping...`);

        // Remove everything from <!DOCTYPE onwards
        artifactCode = artifactCode.replace(htmlDocPattern, '').trim();

        // Also clean up any trailing </artifact> that might have been duplicated
        artifactCode = artifactCode.replace(/<\/artifact>\s*$/i, '').trim();

        // Re-add the closing tag if the artifact tag is present
        if (artifactCode.includes('<artifact') && !artifactCode.includes('</artifact>')) {
          artifactCode = artifactCode + '\n</artifact>';
        }

        console.log(`[${requestId}] ✅ Stripped HTML document structure, cleaned length: ${artifactCode.length}`);
      }
    }

    // ============================================================================
    // VALIDATION: Gemini 3 Flash doesn't have GLM-specific syntax issues
    // ============================================================================
    // Gemini generates cleaner code than GLM, so we skip pre-validation

    // ============================================================================
    // POST-GENERATION VALIDATION & AUTO-FIX
    // ============================================================================
    // ALWAYS run autoFixArtifactCode to ensure:
    // - Duplicate imports are merged (PHASE 0)
    // - TypeScript is stripped (PHASE 1)
    // - All auto-fixable issues are proactively fixed (PHASE 2+)
    const { fixed, changes } = autoFixArtifactCode(artifactCode);

    if (changes.length > 0) {
      console.log(`[${requestId}] ✅ Auto-fixed ${changes.length} issue(s):`, changes);
      artifactCode = fixed;
    }

    // Validate AFTER auto-fix to catch remaining issues
    const validation = validateArtifactCode(artifactCode, artifactType || 'react');

    if (!validation.valid) {
      console.warn(`[${requestId}] ⚠️  Validation issues after auto-fix:`, validation.issues);
    } else {
      console.log(`[${requestId}] ✅ Artifact code validated successfully`);
    }

    // Extract token usage for cost tracking
    const tokenUsage = tokenUsageData || { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const estimatedCost = calculateCost(tokenUsage.inputTokens, tokenUsage.outputTokens);

    console.log(`[${requestId}] 💰 Token usage:`, {
      input: tokenUsage.inputTokens,
      output: tokenUsage.outputTokens,
      total: tokenUsage.totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    });

    // Log usage to database for admin dashboard (fire-and-forget, non-blocking)
    const latencyMs = Date.now() - startTime;
    logGeminiUsage({
      requestId,
      functionName: 'generate-artifact',
      userId: user?.id,
      isGuest: !user,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount: 0,
      promptPreview: prompt.substring(0, 200),
      responseLength: artifactCode.length
    }).catch(err => console.error(`[${requestId}] Failed to log usage:`, err));
    console.log(`[${requestId}] 📊 Usage logged to database`);

    if (!artifactCode || artifactCode.trim().length === 0) {
      console.error(`[${requestId}] Empty artifact code returned from API`);
      return new Response(
        JSON.stringify({
          error: "Failed to generate artifact. Please try again with a different prompt.",
          requestId
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Request-ID": requestId
          }
        }
      );
    }

    console.log(`[${requestId}] Artifact generated successfully, length: ${artifactCode.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        artifactCode,
        reasoning: geminiReasoning,        // Raw Gemini reasoning text
        reasoningSteps,                    // Structured format for UI
        prompt,
        requestId,
        // Include validation metadata for downstream components
        validation: {
          autoFixed: !validation.valid && validation.canAutoFix,
          issueCount: validation.issues.length,
          issueSummary: validation.issues.map(i => i.message)
        }
      }),
      {
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        },
      }
    );

  } catch (e) {
    console.error("Generate artifact error:", e);
    return new Response(
      JSON.stringify({
        error: "An error occurred while generating the artifact",
        details: e instanceof Error ? e.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
