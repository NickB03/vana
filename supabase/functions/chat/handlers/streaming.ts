/**
 * SSE Streaming handler
 * Transforms OpenRouter and GLM streaming responses and injects reasoning/search results
 *
 * SSE Event Format (Claude-like streaming):
 * - reasoning_step: Individual reasoning step (sent progressively)
 * - reasoning_status: Live phase-based status updates (for ticker display)
 * - reasoning_complete: Final reasoning summary 
 * - web_search: Search results
 * - content chunks: LLM response text
 *
 * GLM-4.6 Integration (Phase 2):
 * - Parses SSE delta.reasoning_content from GLM thinking mode
 * - Uses parseReasoningIncrementally for progressive step detection
 * - Replaces legacy <think> tag detection with proper SSE parsing
 */

import { transformArtifactCode } from "../artifact-transformer.ts";
import type { StructuredReasoning, ReasoningStep } from "../../_shared/reasoning-generator.ts";
import type { SearchResult } from "./search.ts";
import {
  parseReasoningIncrementally,
  createIncrementalParseState,
  type IncrementalParseState,
} from "../../_shared/glm-reasoning-parser.ts";

/**
 * Creates a transform stream that:
 * 1. Parses GLM SSE format to extract reasoning_content and content
 * 2. Uses parseReasoningIncrementally for progressive step detection (Claude-like)
 * 3. Injects web search results as SSE event (if available)
 * 4. Transforms artifact code to fix invalid imports
 */
export function createStreamTransformer(
  structuredReasoning: StructuredReasoning | null,
  searchResult: SearchResult,
  requestId: string
): TransformStream<string, string> {
  // Closure-scoped state variables - unique per stream instance
  let buffer = "";
  let sseBuffer = ""; // Buffer for accumulating SSE lines
  let insideArtifact = false;
  let reasoningStepsSent = 0;
  let searchSent = false;
  let reasoningComplete = false;

  // GLM SSE parsing state
  let fullReasoningContent = ""; // Accumulated reasoning_content from GLM
  let parseState: IncrementalParseState = createIncrementalParseState();
  let lastStatusUpdate = 0;
  const STATUS_UPDATE_INTERVAL_MS = parseInt(
    Deno.env.get("REASONING_STATUS_INTERVAL_MS") || "800"
  ); // Don't spam status updates

  // Content output buffer (for artifact transforms and final output)
  let contentBuffer = "";

  return new TransformStream({
    async start(controller) {
      // ========================================
      // PRE-STREAMED REASONING: Send if provided upfront (legacy fallback path)
      // ========================================
      // This handles the case where reasoning was generated separately (e.g., Gemini fallback)
      // When GLM thinking mode is enabled, reasoning comes via SSE stream instead
      if (structuredReasoning && structuredReasoning.steps.length > 0) {
        const steps = structuredReasoning.steps;

        // Send each step as a separate event with progressive delays
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const stepEvent = {
            type: "reasoning_step",
            step: {
              phase: step.phase,
              title: step.title,
              icon: step.icon,
              items: step.items,
            },
            stepIndex: i,
            currentThinking: step.title,
            timestamp: Date.now(),
          };

          controller.enqueue(`data: ${JSON.stringify(stepEvent)}\n\n`);
          reasoningStepsSent++;

          if (i < steps.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }

        const completeEvent = {
          type: "reasoning_complete",
          reasoning: structuredReasoning.summary || "",
          reasoningSteps: structuredReasoning,
          stepCount: steps.length,
          timestamp: Date.now(),
        };
        controller.enqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
        reasoningComplete = true;

        console.log(
          `[${requestId}] 🧠 Sent ${steps.length} reasoning steps progressively (pre-streamed)`
        );
      }

      // ========================================
      // WEB SEARCH: Send search results after reasoning
      // ========================================
      if (searchResult.searchExecuted && searchResult.searchResultsData && !searchSent) {
        const searchEvent = {
          type: "web_search",
          sequence: reasoningStepsSent + 1,
          timestamp: Date.now(),
          data: searchResult.searchResultsData,
        };

        controller.enqueue(`data: ${JSON.stringify(searchEvent)}\n\n`);
        searchSent = true;

        console.log(
          `[${requestId}] 🔍 Sent web search results: ${searchResult.searchResultsData.sources.length} sources`
        );
      }
    },

    transform(chunk, controller) {
      // ========================================
      // STEP 1: Parse GLM SSE format
      // ========================================
      // GLM sends SSE like: data: {"choices":[{"delta":{"reasoning_content":"..."}}]}
      // We need to extract reasoning_content and content separately

      sseBuffer += chunk;

      // Process complete SSE lines from buffer
      let newlineIndex: number;
      while ((newlineIndex = sseBuffer.indexOf("\n")) !== -1) {
        const line = sseBuffer.slice(0, newlineIndex).trim();
        sseBuffer = sseBuffer.slice(newlineIndex + 1);

        // Skip empty lines and comments
        if (!line || line.startsWith(":")) continue;

        // Parse SSE data line
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);

          // Check for stream end marker
          if (jsonStr === "[DONE]") {
            // Send reasoning_complete if we had reasoning content
            if (fullReasoningContent.length > 0 && !reasoningComplete) {
              const completeEvent = {
                type: "reasoning_complete",
                reasoning: fullReasoningContent.substring(0, 500),
                stepCount: reasoningStepsSent,
                timestamp: Date.now(),
              };
              controller.enqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
              reasoningComplete = true;
              console.log(`[${requestId}] 🧠 GLM reasoning complete: ${fullReasoningContent.length} chars`);
            }

            // Clean up buffers to prevent memory leaks
            fullReasoningContent = "";
            contentBuffer = "";
            parseState = createIncrementalParseState();

            // Forward the [DONE] marker
            controller.enqueue(`${line}\n\n`);
            continue;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed?.choices?.[0]?.delta;

            if (delta) {
              // Handle reasoning_content from GLM thinking mode
              if (delta.reasoning_content) {
                fullReasoningContent += delta.reasoning_content;

                // Parse incrementally for Claude-like progressive steps
                const parseResult = parseReasoningIncrementally(fullReasoningContent, parseState);
                parseState = parseResult.state;

                // Emit new step if detected
                if (parseResult.newStep) {
                  const stepEvent = {
                    type: "reasoning_step",
                    step: parseResult.newStep,
                    stepIndex: reasoningStepsSent,
                    currentThinking: parseResult.currentThinking,
                    timestamp: Date.now(),
                  };
                  controller.enqueue(`data: ${JSON.stringify(stepEvent)}\n\n`);
                  reasoningStepsSent++;
                }

                // Emit status update if enough time has passed
                const now = Date.now();
                if (now - lastStatusUpdate > STATUS_UPDATE_INTERVAL_MS) {
                  const statusEvent = {
                    type: "reasoning_status",
                    content: parseResult.currentThinking,
                    timestamp: now,
                  };
                  controller.enqueue(`data: ${JSON.stringify(statusEvent)}\n\n`);
                  lastStatusUpdate = now;
                }

                // Don't forward reasoning_content - it's been processed
                continue;
              }

              // Handle regular content
              if (delta.content) {
                contentBuffer += delta.content;
                // Forward content directly (will be artifact-transformed below)
              }
            }
          } catch (parseError: unknown) {
            // Log parse error for debugging but continue processing
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.warn(
              `[${requestId}] ⚠️ Failed to parse GLM SSE chunk:`,
              {
                jsonStr: jsonStr.substring(0, 200) + (jsonStr.length > 200 ? "..." : ""),
                error: errorMessage,
              }
            );
            // Forward the malformed line as-is to maintain stream continuity
          }
        }

        // Forward non-parsed lines (including content deltas)
        if (!line.includes("reasoning_content")) {
          buffer += line + "\n";
        }
      }

      // ========================================
      // STEP 2: Handle Artifact Transformation
      // ========================================
      // Check if we're entering an artifact
      if (!insideArtifact && buffer.includes("<artifact")) {
        const artifactStartMatch = buffer.match(/<artifact[^>]*>/);
        if (artifactStartMatch) {
          insideArtifact = true;
        }
      }

      // Check if we have complete artifact(s) and process ALL of them
      if (insideArtifact && buffer.includes("</artifact>")) {
        // Loop to handle multiple artifacts in a single response
        while (true) {
          const fullArtifactMatch = buffer.match(
            /(<artifact[^>]*>)([\s\S]*?)(<\/artifact>)/
          );
          if (!fullArtifactMatch) break;

          const [fullMatch, openTag, content, closeTag] = fullArtifactMatch;

          try {
            const result = transformArtifactCode(content);

            if (result.hadIssues) {
              console.log("🔧 Auto-fixed artifact imports:", result.changes);
              buffer = buffer.replace(
                fullMatch,
                openTag + result.transformedContent + closeTag
              );
            }
          } catch (error) {
            console.error(
              "❌ Transform failed, sending original artifact:",
              error
            );
            break;
          }

          if (!buffer.includes("</artifact>")) {
            insideArtifact = false;
            break;
          }
        }
        insideArtifact = false;
      }

      // ========================================
      // STEP 3: Output buffered content
      // ========================================
      if (!insideArtifact) {
        controller.enqueue(buffer);
        buffer = "";
      } else if (buffer.length > 50000) {
        // Safety: if buffer gets too large, send it anyway
        console.warn("⚠️ Buffer overflow - sending untransformed artifact");
        controller.enqueue(buffer);
        buffer = "";
        insideArtifact = false;
      }
    },

    async flush(controller) {
      // Send any remaining buffered content
      if (buffer) {
        controller.enqueue(buffer);
      }

      // Emit final reasoning_complete if not already done
      if (fullReasoningContent.length > 0 && !reasoningComplete) {
        const completeEvent = {
          type: "reasoning_complete",
          reasoning: fullReasoningContent.substring(0, 500),
          stepCount: reasoningStepsSent,
          timestamp: Date.now(),
        };
        controller.enqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
        console.log(`[${requestId}] 🧠 GLM reasoning finalized: ${fullReasoningContent.length} chars`);
      }
    },
  });
}

/**
 * Creates a streaming response with transformed content
 */
export function createStreamingResponse(
  responseBody: ReadableStream<Uint8Array>,
  structuredReasoning: StructuredReasoning | null,
  searchResult: SearchResult,
  corsHeaders: Record<string, string>,
  rateLimitHeaders: Record<string, string>,
  requestId: string
): Response {
  const transformedStream = responseBody
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      createStreamTransformer(structuredReasoning, searchResult, requestId)
    )
    .pipeThrough(new TextEncoderStream());

  return new Response(transformedStream, {
    headers: {
      ...corsHeaders,
      ...rateLimitHeaders,
      "X-Request-ID": requestId,
      "Content-Type": "text/event-stream",
    },
  });
}
