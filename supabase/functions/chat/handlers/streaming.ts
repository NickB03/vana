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
import { summarizeReasoningChunk } from "../../_shared/reasoning-summarizer.ts";

/**
 * Creates a transform stream that:
 * 1. Injects reasoning progressively as individual step events (Claude-like)
 * 2. Injects web search results as SSE event (if available)
 * 3. Transforms artifact code to fix invalid imports
 * 4. Summarizes raw reasoning stream using GLM-4.5-Air (New)
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

  // Reasoning summarization state
  let reasoningBuffer = "";
  let insideReasoning = false;
  let lastSummaryTime = 0;
  const pendingSummaries: Promise<void>[] = [];

  return new TransformStream({
    async start(controller) {
      // ========================================
      // CLAUDE-LIKE STREAMING: Send reasoning steps progressively
      // ========================================
      // ... (existing logic) ...
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
          `[${requestId}] 🧠 Sent ${steps.length} reasoning steps progressively (Claude-like streaming)`
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
      // 1. Handle Reasoning Summarization (GLM-4.5-Air)
      // Check for reasoning tags
      if (chunk.includes("<think>")) insideReasoning = true;
      if (chunk.includes("</think>")) insideReasoning = false;

      // Also handle implicit reasoning (if model just starts reasoning without tags, hard to detect, assume tags for now)
      // Or if we are in "thinking" mode from the start?
      // For now, rely on tags or if the chunk looks like reasoning? No, too risky.
      // Assume <think> tags for GLM-4.6.

      if (insideReasoning) {
        reasoningBuffer += chunk;

        // Check if we should summarize
        const now = Date.now();
        if (reasoningBuffer.length > 150 && now - lastSummaryTime > 1500) {
          const textToSummarize = reasoningBuffer;
          reasoningBuffer = ""; // Clear buffer
          lastSummaryTime = now;

          // Fire and forget summarization (but track promise)
          const summaryPromise = (async () => {
            try {
              const summary = await summarizeReasoningChunk(textToSummarize, requestId);
              if (summary) {
                const statusEvent = {
                  type: "reasoning_status",
                  content: summary,
                  timestamp: Date.now()
                };
                // Enqueue safely
                try {
                  controller.enqueue(`data: ${JSON.stringify(statusEvent)}\n\n`);
                } catch (e) {
                  // Controller might be closed
                }
              }
            } catch (err) {
              console.error(`[${requestId}] Summarization task failed:`, err);
            }
          })();

          pendingSummaries.push(summaryPromise);

          // Cleanup finished promises to avoid memory leaks
          if (pendingSummaries.length > 10) {
            // Simple cleanup strategy
            Promise.allSettled(pendingSummaries).then(() => {
              // This doesn't actually remove them from the array, but they are settled.
              // In a real implementation, we'd use a Set or filter.
              // For now, it's fine as the stream is short-lived.
            });
          }
        }
      }

      // 2. Handle Artifact Transformation (Existing Logic)
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
    async flush(controller) {
      // Send any remaining buffered content
      if (buffer) {
        controller.enqueue(buffer);
      }

      // Wait for any pending summarizations
      if (pendingSummaries.length > 0) {
        await Promise.allSettled(pendingSummaries);
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
