import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { shouldGenerateImage, getArtifactGuidance } from "./intent-detector.ts";
import { validateArtifactRequest, generateGuidanceFromValidation } from "./artifact-validator.ts";
import { transformArtifactCode } from "./artifact-transformer.ts";
import { convertToGeminiFormat, extractSystemMessage, getApiKey } from "../_shared/gemini-client.ts";
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
    const { messages, sessionId, currentArtifact, isGuest } = requestBody;

    // Debug logging
    console.log("Request body:", JSON.stringify({ messages: messages?.length, sessionId, isGuest, hasArtifact: !!currentArtifact }));

    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return new Response(
          JSON.stringify({ error: "Invalid message format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!["user", "assistant", "system"].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: "Invalid message role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (typeof msg.content !== "string" || msg.content.length > 50000) {
        return new Response(
          JSON.stringify({ error: "Message content too long" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (msg.content.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Message content cannot be empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Check Gemini API throttle (15 RPM) - applies to all requests
    const { data: apiThrottleResult, error: apiThrottleError } = await serviceClient
      .rpc("check_api_throttle", {
        p_api_name: "gemini",
        p_max_requests: 15,
        p_window_seconds: 60
      });

    if (apiThrottleError) {
      console.error("API throttle check error:", apiThrottleError);
      // Continue anyway to avoid blocking users due to throttle errors
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

    // Guest rate limiting (20 requests per 5 hours)
    let rateLimitHeaders = {};
    if (isGuest) {
      // Get client identifier (IP address or fallback)
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || req.headers.get("x-real-ip")
        || "unknown";

      const { data: rateLimitResult, error: rateLimitError } = await serviceClient
        .rpc("check_guest_rate_limit", {
          p_identifier: clientIp,
          p_max_requests: 20,
          p_window_hours: 5
        });

      if (rateLimitError) {
        console.error("Rate limit check error:", rateLimitError);
        // Continue anyway to avoid blocking users due to rate limit errors
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
        return new Response(JSON.stringify({
          error: "No authorization header",
          debug: { isGuest, type: typeof isGuest, notIsGuest: !isGuest }
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        console.error("User rate limit check error:", userRateLimitError);
        // Continue anyway to avoid blocking users due to rate limit errors
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
          return new Response(
            JSON.stringify({ error: 'Unauthorized access to session' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    // Guest users already have supabase client initialized above

    console.log("Checking for API key...");
    // Get API key with automatic round-robin rotation
    const GOOGLE_AI_STUDIO_KEY = getApiKey("GOOGLE_AI_STUDIO_KEY_CHAT");
    console.log("✅ API key found, length:", GOOGLE_AI_STUDIO_KEY.length);

    console.log("Starting chat stream for session:", sessionId);

    // Detect image generation requests using intent detection
    const lastUserMessage = messages[messages.length - 1];
    const isImageRequest = lastUserMessage && shouldGenerateImage(lastUserMessage.content);

    if (isImageRequest) {
      console.log("Image generation request detected");

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

        if (imageResponse.error) {
          console.error("Image generation error:", {
            error: imageResponse.error,
            status: imageResponse.status,
            data: imageResponse.data
          });
          const errorMessage = "I encountered an issue generating the image. Please try again.";
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
            { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" } }
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
          { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" } }
        );
      } catch (imgError) {
        console.error("Image generation failed:", imgError);
        const errorMessage = "I encountered an issue generating the image. Please try again.";
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "text/event-stream" } }
        );
      }
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


    // Prepare messages for Gemini API (convert from OpenAI format)
    const geminiMessages = convertToGeminiFormat(contextMessages);

    // Call Gemini streaming API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${GOOGLE_AI_STUDIO_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔴 Google AI Studio error:", response.status, errorText);
      console.error("🔴 Response headers:", JSON.stringify(Object.fromEntries(response.headers)));

      if (response.status === 429 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "API quota exceeded. Please try again later.", details: errorText }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Preserve 503 status for transient "model overloaded" errors
      if (response.status === 503) {
        return new Response(
          JSON.stringify({
            error: "AI service temporarily unavailable",
            status: response.status,
            details: errorText,
            retryable: true
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ error: "AI service error", status: response.status, details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        "Content-Type": "text/event-stream"
      },
    });
  } catch (e) {
    console.error("❌ Chat function error:", e);
    console.error("Error name:", e?.name);
    console.error("Error message:", e?.message);
    console.error("Error stack:", e?.stack);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request",
        details: e?.message || String(e)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
