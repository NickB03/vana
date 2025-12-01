/**
 * SSE Streaming handler
 * Transforms OpenRouter streaming responses and injects reasoning/search results
 *
 * SSE Event Format (Claude-like streaming):
 * - reasoning_step: Individual reasoning step (sent progressively)
 * - reasoning: Complete structured reasoning (legacy, still supported)
 * - web_search: Search results
 * - content chunks: LLM response text
 */

import { transformArtifactCode } from "../artifact-transformer.ts";
import type { StructuredReasoning, ReasoningStep } from "../../_shared/reasoning-generator.ts";
import type { SearchResult } from "./search.ts";

/**
 * Creates a transform stream that:
 * 1. Injects reasoning progressively as individual step events (Claude-like)
 * 2. Injects web search results as SSE event (if available)
 * 3. Transforms artifact code to fix invalid imports
 */
export function createStreamTransformer(
  structuredReasoning: StructuredReasoning | null,
  searchResult: SearchResult,
  requestId: string
): TransformStream<string, string> {
  // Closure-scoped state variables - unique per stream instance
  let buffer = "";
  let insideArtifact = false;
  let reasoningStepsSent = 0; // Track how many reasoning steps have been sent
  let searchSent = false; // Track if search event was sent
  let reasoningComplete = false; // Track if all reasoning has been sent

  return new TransformStream({
    async start(controller) {
      // ========================================
      // CLAUDE-LIKE STREAMING: Send reasoning steps progressively
      // ========================================
      // Instead of sending all reasoning at once, we send each step as a
      // separate SSE event. This creates a smooth, animated experience
      // where the UI updates as each step "arrives".
      //
      // Note: The reasoning was pre-generated, but we stream it progressively
      // to match the UX of models with native thinking (like GLM-4.6).
      // ========================================
      if (structuredReasoning && structuredReasoning.steps.length > 0) {
        const steps = structuredReasoning.steps;

        // Send each step as a separate event with progressive delays
        // This prevents all steps from arriving at once and flashing through
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

          // Progressive delay between steps (simulates real thinking)
          // First step: instant, subsequent steps: 800ms apart
          if (i < steps.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }

        // Send reasoning complete event with full structure (for saving)
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
          `[${requestId}] 🧠 Sent ${steps.length} reasoning steps progressively (Claude-like streaming)`
        );
      }

      // ========================================
      // WEB SEARCH: Send search results after reasoning
      // Frontend can display these results in a special UI component
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
      buffer += chunk;

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
          if (!fullArtifactMatch) break; // No more complete artifacts

          const [fullMatch, openTag, content, closeTag] = fullArtifactMatch;

          try {
            const result = transformArtifactCode(content);

            if (result.hadIssues) {
              console.log("🔧 Auto-fixed artifact imports:", result.changes);
              // Replace the artifact content with transformed version
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
            // Continue with original artifact - better than breaking the stream
            break;
          }

          // Check if there are more artifacts to process
          if (!buffer.includes("</artifact>")) {
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
        buffer = "";
      } else if (buffer.length > 50000) {
        // Safety: if buffer gets too large, send it anyway to avoid memory issues
        console.warn("⚠️ Buffer overflow - sending untransformed artifact");
        controller.enqueue(buffer);
        buffer = "";
        insideArtifact = false;
      }
      // Otherwise, keep buffering until artifact is complete
    },
    flush(controller) {
      // Send any remaining buffered content
      if (buffer) {
        controller.enqueue(buffer);
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
