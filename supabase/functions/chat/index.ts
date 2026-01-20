/**
 * Chat Function - Main Orchestrator
 * Coordinates middleware and handlers for chat streaming
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

// Middleware
import {
  validateInput,
  validateCumulativeContextSize,
  truncateArtifactContext,
  truncateUrlExtractContext,
} from "./middleware/validation.ts";
import { authenticateUser, verifySessionOwnership } from "./middleware/auth.ts";
import {
  checkApiThrottle,
  checkGuestRateLimit,
  checkUserRateLimit,
} from "./middleware/rateLimit.ts";

// Handlers
import { extractUrlContent } from "./handlers/url-extract.ts";
import { handleToolCallingChat, type ModeHint } from "./handlers/tool-calling-chat.ts";

// Shared utilities
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors-config.ts";
import { MODELS } from "../_shared/config.ts";
import { selectContext, extractEntities } from "../_shared/context-selector.ts";
import { calculateContextBudget } from "../_shared/token-counter.ts";
// Artifact validation functions removed during cleanup
// import {
//   validateArtifactRequest,
//   generateGuidanceFromValidation,
// } from "../_shared/artifact-validator.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Generate unique request ID for observability
  const requestId = crypto.randomUUID();
  const rawClientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip");

  let clientIp: string;
  if (!rawClientIp) {
    // SECURITY: Generate unique ID instead of shared "unknown" bucket
    clientIp = `no-ip_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    console.warn(
      `[chat] SECURITY: Missing IP headers (x-forwarded-for, x-real-ip). ` +
      `Using unique identifier: ${clientIp}. Check proxy configuration.`
    );
  } else {
    clientIp = rawClientIp;
  }

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
      toolChoice,
      includeReasoning,
      assistantMessageId,
    } = validationResult.data!;

    console.log(`[${requestId}] Processing request:`, {
      messages: messages.length,
      sessionId,
      isGuest,
      hasArtifact: !!currentArtifact,
      toolChoice,
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
    // STEP 5: Reasoning (handled by Gemini thinking mode in streaming)
    // ========================================
    if (includeReasoning) {
      console.log(`[${requestId}] 🧠 Reasoning will come from Gemini thinking mode (SSE stream)`);
    }

    // ========================================
    // STEP 6: Tool Calling (LLM-driven intent)
    // ========================================
    // All intent decisions (artifact/image/search) are handled by Gemini tool-calling.
    // The UI can still override via toolChoice, but we do not use regex/embedding routing.

    // ========================================
    // STEP 6b: URL Content Extraction (if URLs detected)
    // ========================================
    // Extract content from any URLs the user shared in their message
    // This runs in parallel with normal processing since it's independent
    const urlExtractResult = await extractUrlContent(
      lastUserContent,
      user?.id || null,
      isGuest,
      requestId
    );

    if (urlExtractResult.extractionExecuted) {
      console.log(
        `[${requestId}] 📄 Extracted content from ${urlExtractResult.extractedUrlsData?.successCount || 0} URL(s)`
      );
    }

    // ========================================
    // STEP 7: Tool-Calling Chat Streaming (LLM-driven)
    // ========================================
    console.log(`🎯 Intent handled by tool-calling (toolChoice=${toolChoice})`);

    // Tool-calling is the primary path (LLM decides intent/tools).
    console.log(`[${requestId}] 🔧 Using Gemini tool-calling (LLM intent)`);

      // ========================================
      // Smart Context Management (Issue #127)
      // ========================================
      // Apply token-aware context selection to fit within model limits
      // while preserving important messages (code, decisions, entities)
      const tokenBudget = calculateContextBudget(MODELS.GEMINI_FLASH);
      const trackedEntities = extractEntities(messages.map(m => ({
        role: m.role,
        content: m.content,
      })));

      console.log(`[${requestId}] Context management: budget=${tokenBudget}, entities=${trackedEntities.size}`);

      const contextResult = await selectContext(
        messages.map(m => ({ role: m.role, content: m.content })),
        tokenBudget,
        {
          trackedEntities,
          alwaysKeepRecent: 5,
          summaryBudget: 500,
        }
      );

      console.log(`[${requestId}] Context strategy: ${contextResult.strategy}, tokens=${contextResult.totalTokens}, kept=${contextResult.selectedMessages.length}/${messages.length}`);

      // Use selected messages as context
      let contextMessages = contextResult.selectedMessages;

      // If we need to summarize, try to get cached summary or trigger summarization
      if (contextResult.summarizedMessages.length > 0) {
        try {
          const cacheResponse = await supabase.functions.invoke("cache-manager", {
            body: { sessionId, operation: "get" },
          });

          if (cacheResponse.data?.cached?.summary) {
            // Prepend cached summary to context
            contextMessages = [
              { role: "system", content: `Previous conversation summary: ${cacheResponse.data.cached.summary}` },
              ...contextResult.selectedMessages,
            ];
            console.log(`[${requestId}] Using cached summary for ${contextResult.summarizedMessages.length} summarized messages`);
          }
        } catch (cacheError) {
          console.warn(`[${requestId}] Cache fetch failed:`, cacheError);
        }
      }

      // Artifact validation removed during cleanup - functionality moved to tool-calling system
      let artifactGuidance = "";

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
      let fullArtifactContext = (artifactContext || artifactGuidance)
        ? artifactContext + (artifactGuidance ? `\n\n${artifactGuidance}` : '')
        : '';

      // Get URL extract context (may need truncation)
      let urlExtractContext = urlExtractResult.extractedContext || '';

      // ========================================
      // STEP 8: Cumulative Context Size Validation
      // ========================================
      // Truncate oversized context components before validation
      const artifactTruncation = truncateArtifactContext(fullArtifactContext, requestId);
      const urlTruncation = truncateUrlExtractContext(urlExtractContext, requestId);

      fullArtifactContext = artifactTruncation.content;
      urlExtractContext = urlTruncation.content;

      // Log truncation feedback for user visibility
      if (artifactTruncation.wasTruncated) {
        console.log(
          `[${requestId}] 📝 Artifact context truncated: ${artifactTruncation.originalLength?.toLocaleString()} → ${artifactTruncation.truncatedLength?.toLocaleString()} chars`
        );
      }
      if (urlTruncation.wasTruncated) {
        console.log(
          `[${requestId}] 🔗 URL extract context truncated: ${urlTruncation.originalLength?.toLocaleString()} → ${urlTruncation.truncatedLength?.toLocaleString()} chars`
        );
      }

      // Validate cumulative context size (messages + artifact + search + URL extracts)
      const cumulativeValidation = validateCumulativeContextSize({
        messages: contextMessages,
        artifactContext: fullArtifactContext,
        searchContext: '', // Search context is added by tool-calling, currently empty
        urlExtractContext,
      }, requestId);

      if (!cumulativeValidation.ok) {
        console.error(`[${requestId}] ❌ Cumulative context validation failed`);
        return new Response(
          JSON.stringify({
            error: cumulativeValidation.error!.userMessage,
            errorCode: 'CONTEXT_SIZE_EXCEEDED',
            requestId,
            breakdown: cumulativeValidation.breakdown,
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-Request-ID": requestId,
            },
          }
        );
      }

      // Derive mode hint from frontend flags
      const modeHint: ModeHint = toolChoice === 'generate_image'
        ? 'image'
        : toolChoice === 'generate_artifact'
          ? 'artifact'
          : 'auto';

      return handleToolCallingChat({
        messages: contextMessages,
        fullArtifactContext,
        searchContext: '',
        urlExtractContext, // Already truncated if needed
        userId: user?.id || null,
        sessionId,
        isGuest,
        requestId,
        corsHeaders,
        rateLimitHeaders,
        modeHint,
        toolChoice,
        supabaseClient: supabase,
        serviceClient,
        clientIp,
        assistantMessageId,
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
