/**
 * SSE Streaming handler
 * Transforms OpenRouter streaming responses and injects reasoning/search results
 */

import { transformArtifactCode } from "../artifact-transformer.ts";
import type { StructuredReasoning } from "../../_shared/reasoning-generator.ts";
import type { SearchResult } from "./search.ts";

/**
 * Creates a transform stream that:
 * 1. Injects reasoning as first SSE event
 * 2. Injects web search results as second SSE event (if available)
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
  let reasoningSent = false; // Track if reasoning event was sent
  let searchSent = false; // Track if search event was sent

  return new TransformStream({
    start(controller) {
      // ========================================
      // CHAIN OF THOUGHT: Send reasoning as FIRST SSE event
      // ========================================
      if (structuredReasoning && !reasoningSent) {
        const reasoningEvent = {
          type: "reasoning",
          sequence: 0,
          timestamp: Date.now(),
          data: structuredReasoning,
        };

        controller.enqueue(`data: ${JSON.stringify(reasoningEvent)}\n\n`);
        reasoningSent = true;

        console.log(
          `[${requestId}] =ä Sent reasoning event with ${structuredReasoning.steps.length} steps`
        );
      }

      // ========================================
      // WEB SEARCH: Send search results as SECOND SSE event (optional)
      // Frontend can display these results in a special UI component
      // ========================================
      if (searchResult.searchExecuted && searchResult.searchResultsData && !searchSent) {
        const searchEvent = {
          type: "web_search",
          sequence: 1,
          timestamp: Date.now(),
          data: searchResult.searchResultsData,
        };

        controller.enqueue(`data: ${JSON.stringify(searchEvent)}\n\n`);
        searchSent = true;

        console.log(
          `[${requestId}] =ä Sent web search results: ${searchResult.searchResultsData.sources.length} sources`
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
              console.log("=' Auto-fixed artifact imports:", result.changes);
              // Replace the artifact content with transformed version
              buffer = buffer.replace(
                fullMatch,
                openTag + result.transformedContent + closeTag
              );
            }
          } catch (error) {
            console.error(
              "L Transform failed, sending original artifact:",
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
        console.warn("  Buffer overflow - sending untransformed artifact");
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
