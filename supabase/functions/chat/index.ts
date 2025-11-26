/**
 * Chat Function - Main Orchestrator
 * Coordinates middleware and handlers for chat streaming
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

// Middleware
import { validateInput } from "./middleware/validation.ts";
import { authenticateUser, verifySessionOwnership } from "./middleware/auth.ts";
import {
  checkApiThrottle,
  checkGuestRateLimit,
  checkUserRateLimit,
} from "./middleware/rateLimit.ts";

// Handlers
import { detectUserIntent } from "./handlers/intent.ts";
import { performWebSearch } from "./handlers/search.ts";
import { generateImage } from "./handlers/image.ts";
import { generateArtifact } from "./handlers/artifact.ts";
import { createStreamingResponse } from "./handlers/streaming.ts";

// Shared utilities
import {
  callGeminiFlashWithRetry,
  type OpenRouterMessage,
} from "../_shared/openrouter-client.ts";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors-config.ts";
import { getSystemInstruction } from "../_shared/system-prompt-inline.ts";
import {
  generateStructuredReasoning,
  createFallbackReasoning,
  type StructuredReasoning,
} from "../_shared/reasoning-generator.ts";
import { TAVILY_CONFIG } from "../_shared/config.ts";
import { getArtifactGuidance } from "./intent-detector-embeddings.ts";
import {
  validateArtifactRequest,
  generateGuidanceFromValidation,
} from "./artifact-validator.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Generate unique request ID for observability
  const requestId = crypto.randomUUID();

  try {
    console.log(`[${requestId}] 🚀 CODE VERSION: 2025-11-25-MODULAR-REFACTOR 🚀`);

    // ========================================
    // STEP 1: Input Validation
    // ========================================
    const validationResult = await validateInput(req, requestId);
    if (!validationResult.ok) {
      return new Response(JSON.stringify(validationResult.error), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      });
    }

    const {
      messages,
      sessionId,
      currentArtifact,
      isGuest,
      forceImageMode,
      forceArtifactMode,
      includeReasoning,
    } = validationResult.data!;

    console.log(`[${requestId}] Processing request:`, {
      messages: messages.length,
      sessionId,
      isGuest,
      hasArtifact: !!currentArtifact,
      forceImageMode,
      forceArtifactMode,
    });

    // ========================================
    // STEP 2: Rate Limiting
    // ========================================
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check API throttle (applies to all requests)
    const apiThrottleResult = await checkApiThrottle(serviceClient, requestId);
    if (!apiThrottleResult.ok) {
      return new Response(JSON.stringify(apiThrottleResult.error), {
        status: apiThrottleResult.status || 503,
        headers: {
          ...corsHeaders,
          ...apiThrottleResult.headers,
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      });
    }

    // Check rate limits based on user type
    let rateLimitHeaders: Record<string, string> = {};
    if (isGuest) {
      const guestRateLimit = await checkGuestRateLimit(
        req,
        serviceClient,
        requestId
      );
      if (!guestRateLimit.ok) {
        return new Response(JSON.stringify(guestRateLimit.error), {
          status: guestRateLimit.status || 503,
          headers: {
            ...corsHeaders,
            ...guestRateLimit.headers,
            "Content-Type": "application/json",
            "X-Request-ID": requestId,
          },
        });
      }
      rateLimitHeaders = guestRateLimit.headers;
    }

    // ========================================
    // STEP 3: Authentication
    // ========================================
    const authResult = await authenticateUser(req, isGuest, requestId);
    if (!authResult.ok) {
      return new Response(JSON.stringify(authResult.error), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      });
    }

    const supabase = authResult.supabase;
    const user = authResult.user;

    // For authenticated users, check user-specific rate limits and verify session ownership
    if (!isGuest && user) {
      const userRateLimit = await checkUserRateLimit(
        user.id,
        serviceClient,
        requestId
      );
      if (!userRateLimit.ok) {
        return new Response(JSON.stringify(userRateLimit.error), {
          status: userRateLimit.status || 503,
          headers: {
            ...corsHeaders,
            ...userRateLimit.headers,
            "Content-Type": "application/json",
            "X-Request-ID": requestId,
          },
        });
      }
      rateLimitHeaders = userRateLimit.headers;

      // Verify session ownership
      const sessionVerification = await verifySessionOwnership(
        supabase,
        sessionId,
        user.id,
        requestId
      );
      if (!sessionVerification.ok) {
        return new Response(JSON.stringify(sessionVerification.error), {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Request-ID": requestId,
          },
        });
      }
    }

    console.log(`[${requestId}] Starting chat stream for session:`, sessionId);

    const lastUserMessage = messages[messages.length - 1];
    const lastUserContent = lastUserMessage?.content || "";

    // ========================================
    // STEP 4: Intent Detection
    // ========================================
    const intent = await detectUserIntent({
      forceArtifactMode,
      forceImageMode,
      lastUserMessage: lastUserContent,
    });

    console.log(`[${requestId}] Intent:`, intent.type, "-", intent.reasoning);

    // ========================================
    // STEP 5: Generate Reasoning (if requested)
    // ========================================
    let structuredReasoning: StructuredReasoning | null = null;

    if (includeReasoning && lastUserMessage) {
      console.log(
        `[${requestId}] 🧠 Generating reasoning for: "${lastUserContent.substring(
          0,
          50
        )}..."`
      );

      try {
        structuredReasoning = await generateStructuredReasoning(
          lastUserContent,
          messages.filter((m) => m.role !== "system") as OpenRouterMessage[],
          {
            maxSteps: 3, // Limit for faster generation
            timeout: 8000, // 8s timeout
          }
        );

        console.log(
          `[${requestId}] ✅ Reasoning generated: ${structuredReasoning.steps.length} steps`
        );
      } catch (reasoningError) {
        console.error(
          `[${requestId}] ⚠️ Reasoning generation failed:`,
          reasoningError
        );
        // Use fallback reasoning instead of blocking the response
        structuredReasoning = createFallbackReasoning(reasoningError.message);
      }
    }

    // ========================================
    // STEP 6: Web Search (if needed)
    // ========================================
    const searchResult = intent.shouldSearch
      ? await performWebSearch(
          lastUserContent,
          user?.id || null,
          isGuest,
          requestId
        )
      : {
          searchContext: "",
          searchResultsData: null,
          searchExecuted: false,
        };

    // ========================================
    // STEP 7: Route by Intent
    // ========================================
    const authHeader = req.headers.get("Authorization");

    // Route to image generation
    if (intent.type === "image") {
      const imageResult = await generateImage(
        supabase,
        lastUserContent,
        sessionId,
        authHeader,
        structuredReasoning,
        requestId
      );

      return new Response(imageResult.sseResponse, {
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          "X-Request-ID": requestId,
          "Content-Type": "text/event-stream",
        },
      });
    }

    // Route to artifact generation
    if (intent.type === "artifact") {
      const artifactResult = await generateArtifact(
        supabase,
        lastUserContent,
        intent.artifactType,
        sessionId,
        authHeader,
        structuredReasoning,
        requestId
      );

      return new Response(artifactResult.sseResponse, {
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          "X-Request-ID": requestId,
          "Content-Type": "text/event-stream",
        },
      });
    }

    // ========================================
    // STEP 8: Regular Chat Streaming (default case)
    // ========================================
    console.log("🎯 Intent detected: REGULAR CHAT");
    console.log("🔀 Using: Gemini 2.5 Flash Lite via OpenRouter (streaming response)");

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
    const systemInstruction = getSystemInstruction({
      fullArtifactContext,
      alwaysSearchEnabled: TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED
    });

    // Inject web search context if search was executed
    let searchContextMessage = "";
    if (searchResult.searchExecuted && searchResult.searchContext) {
      searchContextMessage = `

REAL-TIME WEB SEARCH RESULTS:
The following information was retrieved from the web to answer the user's query:

${searchResult.searchContext}

Use this information to provide an accurate, up-to-date response. Cite the sources when relevant.`;

      console.log(
        `[${requestId}] 📤 Injecting search context (${searchResult.searchContext.length} chars) into system message`
      );
    }

    // Prepare messages for OpenRouter (OpenAI-compatible format)
    const openRouterMessages: OpenRouterMessage[] = [
      { role: "system", content: systemInstruction + searchContextMessage },
      ...contextMessages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

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

    // Transform and stream the response with reasoning and search results
    return createStreamingResponse(
      response.body!,
      structuredReasoning,
      searchResult,
      corsHeaders,
      rateLimitHeaders,
      requestId
    );
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
