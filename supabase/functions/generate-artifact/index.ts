import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callGLM, callGLMWithRetryTracking, extractTextFromGLM, extractTextAndReasoningFromGLM, extractGLMTokenUsage, calculateGLMCost, logGLMUsage, handleGLMError, processGLMStream, parseStatusMarker } from "../_shared/glm-client.ts";
import { parseGLMReasoningToStructured, parseReasoningIncrementally, createIncrementalParseState, type IncrementalParseState } from "../_shared/glm-reasoning-parser.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { MODELS, RATE_LIMITS, FEATURE_FLAGS } from "../_shared/config.ts";
import { validateArtifactCode, autoFixArtifactCode, preValidateAndFixGlmSyntax } from "../_shared/artifact-validator.ts";
import { getSystemInstruction } from "../_shared/system-prompt-inline.ts";
import {
  createReasoningProvider,
  type IReasoningProvider,
  type ReasoningEvent,
  type ReasoningEventCallback,
} from "../_shared/reasoning-provider.ts";

// NOTE: Retry logic handled in glm-client.ts
// callGLMWithRetryTracking() handles exponential backoff automatically

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
        // Check GLM-4.6 API throttle (10 RPM for artifact generation - stricter than chat)
        serviceClient.rpc("check_api_throttle", {
          p_api_name: "glm-4.6",
          p_max_requests: RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS,
          p_window_seconds: RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS
        }),
        // Check appropriate rate limit based on VALIDATED auth status
        isGuest ? (async () => {
          // Get client IP address (trusted headers set by Supabase Edge infrastructure)
          // X-Forwarded-For is sanitized by Supabase proxy to prevent spoofing
          const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
            || req.headers.get("x-real-ip")
            || "unknown";

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
        console.warn(`[${requestId}] 🚨 API throttle exceeded for GLM-4.6 artifact generation`);
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

    // Construct user prompt for GLM-4.6
    // CRITICAL: Must be explicit about format - GLM tends to generate full HTML documents
    // when we need pure JSX/React component code for Babel transpilation
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
    // STREAMING MODE: Real-time GLM thinking + content streaming (SSE)
    // ============================================================================
    // When stream=true, we stream GLM's native thinking (reasoning_content) first,
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
        // Declare ReasoningProvider at outer scope for cleanup in catch block
        let reasoningProvider: IReasoningProvider | null = null;

        try {
          // Call GLM with streaming enabled
          const glmResponse = await callGLM(
            ARTIFACT_SYSTEM_PROMPT,
            userPrompt,
            {
              temperature: 1.0,
              max_tokens: 16000,
              requestId,
              enableThinking: true,
              stream: true, // Enable SSE streaming from GLM
            }
          );

          if (!glmResponse.ok) {
            const errorText = await glmResponse.text();
            console.error(`[${requestId}] GLM streaming error (${glmResponse.status}):`, errorText.substring(0, 200));
            await sendEvent("error", { error: `GLM API error: ${glmResponse.status}`, requestId });
            await writer.close();
            return;
          }

          // ============================================================================
          // CLAUDE-LIKE STREAMING: Parse reasoning into steps instead of raw chunks
          // ============================================================================
          // Instead of streaming raw reasoning_content text (verbose, hard to read),
          // we incrementally parse it into structured steps and emit them one-by-one.
          // This provides a clean, Claude-like "Thinking..." experience with discrete
          // reasoning steps appearing progressively.
          //
          // SSE Events (new format):
          // - reasoning_step: { step: ReasoningStep, currentThinking: string }
          // - status_update: { status: string } (from [STATUS: ...] markers)
          // - thinking_update: { currentThinking: string, progress: number }
          // - reasoning_complete: { reasoning: string, reasoningSteps: StructuredReasoning }
          // - content_chunk: { chunk: string }
          // - artifact_complete: { ... }
          // ============================================================================

          let incrementalState: IncrementalParseState = createIncrementalParseState();
          let fullReasoning = "";
          const accumulatedSteps: Array<{ phase: string; title: string; icon?: string; items: string[] }> = [];
          let lastEmittedStatus: string | null = null; // Track last emitted status to avoid duplicates

          // ============================================================================
          // AI SIDECAR: Semantic status updates via ReasoningProvider
          // ============================================================================
          // ReasoningProvider provides hybrid LLM + phase-based fallback:
          //    - Circuit breaker pattern for LLM failures
          //    - Typed events with full metadata
          //    - Automatic phase detection and transitions
          //    - Proper resource cleanup via destroy()
          //
          // Provides semantic status updates more meaningful than [STATUS:] markers.
          // ============================================================================
          console.log(`[${requestId}] 🎛️ Status provider: ReasoningProvider`);

          // ReasoningProvider event adapter: converts typed events to SSE format
          const reasoningEventAdapter: ReasoningEventCallback = async (event: ReasoningEvent) => {
            // Only emit if different from last [STATUS:] marker
            if (event.message !== lastEmittedStatus) {
              const source = event.type === 'reasoning_final' ? 'completion' :
                             event.type === 'reasoning_heartbeat' ? 'heartbeat' : 'reasoning_provider';
              const isFinal = event.type === 'reasoning_final';

              await sendEvent("status_update", {
                status: event.message,
                source,
                ...(isFinal && { final: true }),
                // Include metadata for debugging/analytics
                phase: event.phase,
                metadata: event.metadata,
              });
              console.log(`[${requestId}] 🎯 ReasoningProvider [${event.type}]: "${event.message}"`);
            }
          };

          // Create ReasoningProvider
          reasoningProvider = createReasoningProvider(requestId, reasoningEventAdapter, {
            config: {
              minBufferChars: 150,
              maxBufferChars: 500,
              maxWaitMs: 3000,
              minUpdateIntervalMs: 1500,
              timeoutMs: 2000,
            },
          });
          // Start the provider (emits initial status, starts heartbeat timer)
          await reasoningProvider.start();

          // Unified interface for pushing chunks
          const pushChunk = async (chunk: string) => {
            await reasoningProvider.processReasoningChunk(chunk);
          };

          // Unified interface for notifying content phase
          const notifyContentPhase = async () => {
            await reasoningProvider.setPhase('implementing');
          };

          // Process GLM SSE stream with incremental step detection
          const { reasoning, content } = await processGLMStream(
            glmResponse,
            {
              onReasoningChunk: async (chunk: string) => {
                // Accumulate full reasoning text
                fullReasoning += chunk;

                // ============================================================================
                // DUAL STATUS SOURCES: [STATUS:] markers + ReasoningProvider
                // ============================================================================
                // 1. [STATUS: ...] markers: Fast-path, parsed from GLM's raw reasoning
                // 2. ReasoningProvider: Hybrid LLM+fallback for semantic status updates
                //
                // The [STATUS:] markers take precedence when available (lower latency).
                // ReasoningProvider provides semantic updates when markers are absent.
                // ============================================================================

                // Feed chunk to ReasoningProvider (async, non-blocking)
                await pushChunk(chunk);

                // STATUS MARKER DETECTION: Parse [STATUS: ...] markers from reasoning
                // GLM emits [STATUS: action phrase] markers during thinking to indicate
                // current action. We detect these and emit status_update SSE events.
                const currentStatus = parseStatusMarker(fullReasoning);
                if (currentStatus && currentStatus !== lastEmittedStatus) {
                  // New status detected - emit it immediately
                  await sendEvent("status_update", { status: currentStatus });
                  console.log(`[${requestId}] 📊 Status marker: "${currentStatus}"`);
                  lastEmittedStatus = currentStatus;
                }

                // Incrementally parse for new steps
                const result = parseReasoningIncrementally(fullReasoning, incrementalState);
                incrementalState = result.state;

                if (result.newStep) {
                  // New complete step detected - emit it
                  accumulatedSteps.push(result.newStep);
                  await sendEvent("reasoning_step", {
                    step: result.newStep,
                    stepIndex: accumulatedSteps.length - 1,
                    currentThinking: result.currentThinking,
                  });
                  console.log(`[${requestId}] 🧠 Emitted reasoning step ${accumulatedSteps.length}: "${result.newStep.title}"`);
                } else {
                  // No new step, but update current thinking indicator periodically
                  // Only send updates every 200 chars to avoid flooding
                  if (fullReasoning.length % 200 < chunk.length) {
                    await sendEvent("thinking_update", {
                      currentThinking: result.currentThinking,
                      progress: Math.min(45, 5 + (fullReasoning.length / 100)),
                    });
                  }
                }
              },
              onContentChunk: async (chunk: string) => {
                // Notify sidecar that we're in content generation phase
                // This triggers proactive heartbeat updates during code generation
                await notifyContentPhase();

                // Also feed content chunks to the sidecar for semantic analysis
                // During code generation, the sidecar can analyze what's being built
                // (e.g., "Writing React component", "Adding event handlers")
                await pushChunk(chunk);

                await sendEvent("content_chunk", { chunk });
              },
              onComplete: async (fullReasoningText: string, _fullContent: string) => {
                // Send final reasoning complete event with structured data
                if (fullReasoningText) {
                  const finalReasoningSteps = parseGLMReasoningToStructured(fullReasoningText);
                  await sendEvent("reasoning_complete", {
                    reasoning: fullReasoningText,
                    reasoningSteps: finalReasoningSteps,
                    stepCount: accumulatedSteps.length,
                  });
                }
              },
              onError: async (error: Error) => {
                console.error(`[${requestId}] GLM stream error:`, error);
                await sendEvent("error", { error: error.message, requestId });
              },
            },
            requestId
          );

          // Post-process artifact code
          let artifactCode = content;

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
          // PRE-VALIDATION: Fix GLM syntax issues BEFORE sending to client
          // ============================================================================
          // This is the FIRST line of defense - catches GLM syntax bugs (const * as,
          // unquoted imports, orphaned chains) before they reach the client.
          // Prevents bundling failures and client-side rendering errors.
          const preValidation = preValidateAndFixGlmSyntax(artifactCode, requestId);
          if (preValidation.issues.length > 0) {
            console.log(`[${requestId}] 🔧 Pre-validation fixed ${preValidation.issues.length} GLM syntax issue(s) in streaming mode`);
            artifactCode = preValidation.fixed;
          }

          // Validate and auto-fix artifact code (catches other issues like reserved keywords, mutations)
          const validation = validateArtifactCode(artifactCode, artifactType || 'react');
          if (!validation.valid && validation.canAutoFix) {
            const { fixed, changes } = autoFixArtifactCode(artifactCode);
            if (changes.length > 0) {
              console.log(`[${requestId}] ✅ Auto-fixed ${changes.length} streaming artifact issue(s)`);
              artifactCode = fixed;
            }
          }

          // Parse reasoning to structured format
          const reasoningSteps = reasoning ? parseGLMReasoningToStructured(reasoning) : null;

          // ============================================================================
          // FINALIZATION: Generate summary and clean up ReasoningProvider
          // ============================================================================
          // ReasoningProvider handles final status emission internally via finalize()
          // Extract artifact description from the prompt for the summary
          const artifactDescription = artifactType === 'react'
            ? 'React component'
            : artifactType || 'artifact';
          await reasoningProvider.finalize(`${artifactDescription} based on your request`);

          // Note: finalSummary is set to simple fallback - the final event was already emitted via the adapter
          const finalSummary = "Artifact complete";

          // If we have a final summary, update the last step's title in reasoningSteps
          // so the ticker shows the summary after streaming ends
          if (finalSummary && reasoningSteps && reasoningSteps.steps.length > 0) {
            reasoningSteps.steps[reasoningSteps.steps.length - 1].title = finalSummary;
          }

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
          logGLMUsage({
            requestId,
            functionName: 'generate-artifact-stream',
            provider: 'z.ai',
            model: MODELS.GLM_4_6,
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

          // Note: ReasoningProvider cleanup already happened in finalize()

          await writer.close();
        } catch (error) {
          console.error(`[${requestId}] Streaming error:`, error);

          // Clean up status provider on error
          if (reasoningProvider) {
            reasoningProvider.destroy();
          }

          try {
            await sendEvent("error", { error: error instanceof Error ? error.message : "Unknown streaming error", requestId });
            await writer.close();
          } catch {
            // Writer may already be closed
          }
        }
      })();

      // Return SSE response immediately
      return new Response(readable, { headers: streamHeaders });
    }

    // ============================================================================
    // NON-STREAMING MODE: Original behavior (wait for complete response)
    // ============================================================================
    // Call GLM-4.6 via Z.ai API with retry logic and tracking
    console.log(`[${requestId}] 🤖 Routing to GLM-4.6 via Z.ai API`);
    const { response, retryCount } = await callGLMWithRetryTracking(
      ARTIFACT_SYSTEM_PROMPT,
      userPrompt,
      {
        temperature: 1.0, // GLM recommends 1.0 for general evaluations
        max_tokens: 16000, // ✅ INCREASED: Doubled from 8000 to handle complex artifacts (Radix UI dialogs, etc.)
        requestId,
        enableThinking: true // Enable reasoning for better artifact generation
      }
    );

    if (!response.ok) {
      return await handleGLMError(response, requestId, corsHeaders);
    }

    const data = await response.json();

    // Log finish_reason for debugging token limit issues
    const finishReason = data?.choices?.[0]?.finish_reason;
    console.log(`[${requestId}] 📊 Generation complete: finish_reason="${finishReason}"`);

    if (finishReason === "length") {
      console.warn(`[${requestId}] ⚠️  HIT TOKEN LIMIT - Response truncated at ${data?.usage?.completion_tokens || 'unknown'} output tokens`);
      console.warn(`[${requestId}] ⚠️  Consider: 1) Simplifying prompt, 2) Increasing max_tokens further, 3) Using model with higher limits`);
    }

    const { text: rawArtifactCode, reasoning: glmReasoning } = extractTextAndReasoningFromGLM(data, requestId);
    let artifactCode = rawArtifactCode;

    // Convert GLM reasoning to structured format for UI
    const reasoningSteps = glmReasoning ? parseGLMReasoningToStructured(glmReasoning) : null;

    // ============================================================================
    // POST-GENERATION CLEANUP: Strip HTML Document Structure from React Artifacts
    // ============================================================================
    // GLM-4.6 sometimes appends full HTML documents after the React code
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
    // PRE-VALIDATION: Fix GLM syntax issues BEFORE sending to client
    // ============================================================================
    // This is the FIRST line of defense - catches GLM syntax bugs (const * as,
    // unquoted imports, orphaned chains) before they reach the client.
    // Prevents bundling failures and client-side rendering errors.
    const preValidation = preValidateAndFixGlmSyntax(artifactCode, requestId);
    if (preValidation.issues.length > 0) {
      console.log(`[${requestId}] 🔧 Pre-validation fixed ${preValidation.issues.length} GLM syntax issue(s)`);
      artifactCode = preValidation.fixed;
    }

    // ============================================================================
    // POST-GENERATION VALIDATION & AUTO-FIX
    // ============================================================================
    // Validate artifact code for common issues:
    // - Reserved keywords (eval, arguments, etc.)
    // - Invalid imports (@/components/ui/*)
    // - Immutability violations (array mutations)
    const validation = validateArtifactCode(artifactCode, artifactType || 'react');

    if (!validation.valid && validation.canAutoFix) {
      console.log(`[${requestId}] ⚠️  Validation issues detected, attempting auto-fix...`);

      // Log specific issue types
      const issueTypes = {
        reserved: validation.issues.filter(i => i.message.includes("Reserved keyword")).length,
        imports: validation.issues.filter(i => i.message.includes("import")).length,
        immutability: validation.issues.filter(i => i.message.includes("mutate") || i.message.includes("Direct array assignment")).length
      };

      if (issueTypes.reserved > 0) console.log(`[${requestId}] 🔧 Reserved keyword issues: ${issueTypes.reserved}`);
      if (issueTypes.imports > 0) console.log(`[${requestId}] 🔧 Import issues: ${issueTypes.imports}`);
      if (issueTypes.immutability > 0) console.log(`[${requestId}] 🔧 Immutability violations: ${issueTypes.immutability}`);

      const { fixed, changes } = autoFixArtifactCode(artifactCode);

      if (changes.length > 0) {
        console.log(`[${requestId}] ✅ Auto-fixed ${changes.length} issue(s):`, changes);
        artifactCode = fixed;

        // Re-validate after fixes
        const revalidation = validateArtifactCode(artifactCode, artifactType || 'react');
        if (!revalidation.valid) {
          console.warn(`[${requestId}] ⚠️  Some issues remain after auto-fix:`, revalidation.issues);
        } else {
          console.log(`[${requestId}] ✅ All issues resolved after auto-fix`);
        }
      }
    } else if (!validation.valid) {
      console.warn(`[${requestId}] ⚠️  Validation issues detected (cannot auto-fix):`, validation.issues);
    } else {
      console.log(`[${requestId}] ✅ Artifact code validated successfully (no issues)`);
    }

    // Extract token usage for cost tracking
    const tokenUsage = extractGLMTokenUsage(data);
    const estimatedCost = calculateGLMCost(tokenUsage.inputTokens, tokenUsage.outputTokens);

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
      functionName: 'generate-artifact',
      provider: 'z.ai',
      model: MODELS.GLM_4_6,
      userId: user?.id,
      isGuest: !user,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount,
      promptPreview: prompt.substring(0, 200),
      responseLength: artifactCode.length
    }).catch(err => console.error(`[${requestId}] Failed to log usage:`, err));
    console.log(`[${requestId}] 📊 Usage logged to database (${retryCount} retries)`);

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
        reasoning: glmReasoning,           // Raw GLM reasoning text
        reasoningSteps,                     // Structured format for UI
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
