/**
 * SSE Streaming handler
 * Transforms OpenRouter and GLM streaming responses and injects reasoning/search results
 *
 * SSE Event Format (Claude-like streaming):
 * - reasoning_status: Live phase-based status updates (for ticker display)
 * - reasoning_complete: Final reasoning summary
 * - web_search: Search results
 * - content chunks: LLM response text
 *
 * GLM-4.6 Integration:
 * - Parses SSE delta.reasoning_content from GLM thinking mode
 * - Extracts [STATUS: ...] markers for live status updates
 * - Accumulates reasoning content for final summary
 */

import { transformArtifactCode } from "../artifact-transformer.ts";
import type { StructuredReasoning } from "../../_shared/reasoning-generator.ts";
import type { SearchResult } from "./search.ts";
import { parseStatusMarker } from "../../_shared/glm-client.ts";

/**
 * Creates a transform stream that:
 * 1. Parses GLM SSE format to extract reasoning_content and content
 * 2. Extracts [STATUS: ...] markers for live status updates
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
  let searchSent = false;
  let reasoningComplete = false;

  // GLM SSE parsing state
  let fullReasoningContent = ""; // Accumulated reasoning_content from GLM

  // Content output buffer (for artifact transforms and final output)
  let contentBuffer = "";

  // Tool call stripping state (prevents raw <tool_call> XML from reaching client)
  let toolCallInProgress = false;

  // Status marker tracking (for [STATUS: ...] extraction)
  let lastStatusMarker: string | null = null;

  /**
   * Strip <tool_call>...</tool_call> XML blocks from content
   * This prevents raw tool call syntax from appearing in chat responses
   *
   * NOTE: With native function calling (OpenAI-compatible tools API), GLM should
   * no longer emit XML tool calls in content. This function is retained as a
   * safety fallback for edge cases or if the model unexpectedly reverts to XML format.
   *
   * @param content - The content to sanitize
   * @param depth - Recursion depth (to prevent infinite loops on malformed XML)
   */
  function stripToolCallXml(content: string, depth = 0): string {
    // Prevent infinite recursion on malformed XML (max 10 tool calls per chunk)
    const MAX_RECURSION_DEPTH = 10;
    if (depth > MAX_RECURSION_DEPTH) {
      console.warn(`[${requestId}] ⚠️ Max recursion depth exceeded in stripToolCallXml - returning content as-is`);
      return content;
    }

    // Check if we're inside a tool call block
    const toolCallStartIdx = content.indexOf('<tool_call>');
    const toolCallEndIdx = content.indexOf('</tool_call>');

    if (toolCallStartIdx !== -1) {
      if (toolCallEndIdx !== -1 && toolCallEndIdx > toolCallStartIdx) {
        // Complete tool call block - strip it entirely
        const beforeToolCall = content.substring(0, toolCallStartIdx);
        const afterToolCall = content.substring(toolCallEndIdx + '</tool_call>'.length);
        toolCallInProgress = false;
        // Recursively strip in case there are multiple tool calls
        return stripToolCallXml(beforeToolCall + afterToolCall, depth + 1);
      } else {
        // Incomplete tool call - return content before it, mark in progress
        toolCallInProgress = true;
        return content.substring(0, toolCallStartIdx);
      }
    } else if (toolCallInProgress) {
      // We're inside a tool call block waiting for closing tag
      if (toolCallEndIdx !== -1) {
        // Found end tag - discard tool call content, return the rest
        toolCallInProgress = false;
        return stripToolCallXml(content.substring(toolCallEndIdx + '</tool_call>'.length), depth + 1);
      }
      // Still inside tool call, discard everything
      return '';
    }

    return content;
  }

  return new TransformStream({
    async start(controller) {
      // ========================================
      // WEB SEARCH: Send search results if available
      // ========================================
      if (searchResult.searchExecuted && searchResult.searchResultsData && !searchSent) {
        const searchEvent = {
          type: "web_search",
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
                timestamp: Date.now(),
              };
              controller.enqueue(`data: ${JSON.stringify(completeEvent)}\n\n`);
              reasoningComplete = true;
              console.log(`[${requestId}] 🧠 GLM reasoning complete: ${fullReasoningContent.length} chars`);
            }

            // Clean up buffers to prevent memory leaks
            fullReasoningContent = "";
            contentBuffer = "";

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

                // Extract [STATUS: ...] marker from accumulated reasoning
                const statusMarker = parseStatusMarker(fullReasoningContent);
                if (statusMarker && statusMarker !== lastStatusMarker) {
                  const statusEvent = {
                    type: "reasoning_status",
                    content: statusMarker,
                    source: 'glm_marker',
                    timestamp: Date.now(),
                  };
                  controller.enqueue(`data: ${JSON.stringify(statusEvent)}\n\n`);
                  lastStatusMarker = statusMarker;
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
      // STEP 3: Output buffered content (with tool call stripping)
      // ========================================
      if (!insideArtifact) {
        // Strip any <tool_call> XML before sending to client
        const sanitizedBuffer = stripToolCallXml(buffer);
        if (sanitizedBuffer) {
          controller.enqueue(sanitizedBuffer);
        }
        buffer = "";
      } else if (buffer.length > 50000) {
        // Safety: if buffer gets too large, send it anyway
        console.warn("⚠️ Buffer overflow - sending untransformed artifact");
        const sanitizedBuffer = stripToolCallXml(buffer);
        if (sanitizedBuffer) {
          controller.enqueue(sanitizedBuffer);
        }
        buffer = "";
        insideArtifact = false;
      }
    },

    async flush(controller) {
      // Send any remaining buffered content (with tool call stripping)
      if (buffer) {
        const sanitizedBuffer = stripToolCallXml(buffer);
        if (sanitizedBuffer) {
          controller.enqueue(sanitizedBuffer);
        }
      }

      // Emit final reasoning_complete if not already done
      if (fullReasoningContent.length > 0 && !reasoningComplete) {
        const completeEvent = {
          type: "reasoning_complete",
          reasoning: fullReasoningContent.substring(0, 500),
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
