/**
 * Tool-Calling Chat Handler
 *
 * Orchestrates GLM-4.6 tool-calling for chat with web search integration.
 *
 * Flow:
 * 1. Send user message to GLM with tools enabled
 * 2. Stream GLM response, detecting native tool_calls in response
 * 3. If tool call detected: execute tool, inject results, continue GLM response
 * 4. Stream final response to client with SSE events for tool execution
 *
 * SSE Events Emitted:
 * - tool_call_start: When tool call is detected { type, toolName, arguments }
 * - tool_result: When tool execution completes { type, toolName, success, sourceCount? }
 * - reasoning_status: Live thinking status for ticker { type, content }
 * - content_chunk: Regular content chunks (OpenAI-compatible format)
 *
 * Architecture:
 * - Uses getGLMToolDefinitions() from tool-definitions.ts for tool catalog
 * - Uses processGLMStream for native tool call detection
 * - Uses executeTool from tool-executor.ts for tool execution
 * - Uses callGLMWithToolResult for continuation with tool results
 * - Maintains OpenAI-compatible SSE format for frontend compatibility
 */

import {
  callGLMWithRetry,
  processGLMStream,
  callGLMWithToolResult,
  parseStatusMarker,
  type ToolCall,
  type NativeToolCall,
} from '../../_shared/glm-client.ts';
import {
  executeTool,
  formatResultForGLM,
  type ToolContext,
} from '../../_shared/tool-executor.ts';
import {
  getGLMToolDefinitions,
} from '../../_shared/tool-definitions.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { getSystemInstruction } from '../../_shared/system-prompt-inline.ts';

/**
 * Mode hint for biasing tool selection.
 * - 'artifact': Bias towards artifact generation
 * - 'image': Bias towards image generation
 * - 'auto': Let model decide based on intent
 */
export type ModeHint = 'artifact' | 'image' | 'auto';

/**
 * Parameters for tool-calling chat handler
 */
export interface ToolCallingChatParams {
  /** Conversation messages (OpenAI format) */
  messages: Array<{ role: string; content: string }>;
  /** Full artifact context (editing context + guidance) */
  fullArtifactContext: string;
  /** Injected web search context (if any) */
  searchContext: string;
  /** Injected URL extract context (if any) */
  urlExtractContext: string;
  /** User ID for logging (null for guests) */
  userId: string | null;
  /** Whether the user is a guest */
  isGuest: boolean;
  /** Request ID for observability */
  requestId: string;
  /** CORS headers */
  corsHeaders: Record<string, string>;
  /** Rate limit headers */
  rateLimitHeaders: Record<string, string>;
  /** Mode hint to bias tool selection (optional, defaults to 'auto') */
  modeHint?: ModeHint;
  /** Supabase client for storage operations (required for image generation) */
  supabaseClient?: SupabaseClient;
}

/**
 * Helper function to parse tool call arguments from JSON string
 *
 * @param args - JSON string containing tool arguments
 * @param logPrefix - Prefix for logging (e.g., "[request-id]")
 * @returns Parsed arguments object, or empty object if parsing fails
 */
function parseToolArguments(
  args: string,
  logPrefix: string
): Record<string, unknown> {
  try {
    return JSON.parse(args);
  } catch {
    console.warn(
      `${logPrefix} ⚠️ Failed to parse tool call arguments: ${args}`
    );
    return {};
  }
}

/**
 * Handle tool-calling chat with GLM-4.6
 *
 * Orchestrates the full tool-calling flow:
 * 1. Call GLM with tools enabled (browser.search)
 * 2. Stream response while detecting tool calls
 * 3. Execute tools when detected
 * 4. Continue GLM response with tool results
 * 5. Stream final response to client
 *
 * @param params - Handler parameters
 * @returns Response with SSE body
 *
 * @example
 * ```typescript
 * const response = await handleToolCallingChat({
 *   messages: [{ role: "user", content: "What are the latest AI news?" }],
 *   systemPrompt: getSystemInstruction({ useToolCalling: true }),
 *   searchContext: "",
 *   urlExtractContext: "",
 *   userId: "user-123",
 *   isGuest: false,
 *   requestId: "req-456",
 *   corsHeaders: {},
 *   rateLimitHeaders: {}
 * });
 * ```
 */
/**
 * Builds mode hint suffix for system prompt.
 * Biases the model towards using specific tools based on user's mode selection.
 */
function buildModeHintPrompt(modeHint: ModeHint): string {
  switch (modeHint) {
    case 'artifact':
      return `

IMPORTANT: The user has explicitly selected ARTIFACT MODE. You SHOULD use the generate_artifact tool for this request unless it's clearly just a question or simple chat message. Create interactive React components, HTML, SVG, diagrams, or code as appropriate.`;

    case 'image':
      return `

IMPORTANT: The user has explicitly selected IMAGE MODE. You SHOULD use the generate_image tool for this request unless it's clearly just a question or simple chat message. Generate images based on their description.`;

    case 'auto':
    default:
      return `

Analyze the user's request and use appropriate tools when needed:
- If they want to create something visual, interactive, or code-based, use generate_artifact
- If they want an image, photo, illustration, or artwork, use generate_image
- If they need current information, news, or real-time data, use browser.search
- For general questions, respond directly without using tools`;
  }
}

export async function handleToolCallingChat(
  params: ToolCallingChatParams
): Promise<Response> {
  const {
    messages,
    fullArtifactContext,
    searchContext,
    urlExtractContext,
    userId,
    isGuest,
    requestId,
    corsHeaders,
    rateLimitHeaders,
    modeHint = 'auto',
    supabaseClient,
  } = params;

  const logPrefix = `[${requestId}]`;

  console.log(`${logPrefix} 🔧 Starting unified tool-calling chat with GLM-4.6 (modeHint=${modeHint})`);

  // Get all tool definitions for unified handler
  // Spread into mutable array to satisfy GLM client's type requirements
  const allTools = [...getGLMToolDefinitions()];
  const toolNames = allTools.map(t => t.name).join(', ');
  console.log(`${logPrefix} 🔧 Tools available: ${toolNames}`);

  // Get system instruction with tool-calling enabled and artifact context
  const toolEnabledSystemPrompt = getSystemInstruction({
    useToolCalling: true,
    fullArtifactContext,
  });

  // Combine with search/URL context if provided
  let finalSystemPrompt = toolEnabledSystemPrompt;
  if (searchContext) {
    finalSystemPrompt += `\n\nREAL-TIME WEB SEARCH RESULTS:\n${searchContext}`;
  }
  if (urlExtractContext) {
    finalSystemPrompt += `\n\nURL CONTENT:\n${urlExtractContext}`;
  }

  // Add mode hint to bias tool selection
  finalSystemPrompt += buildModeHintPrompt(modeHint);

  // Build user prompt from messages (combine all user messages)
  const userPrompt = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n\n');

  // ========================================
  // Create SSE stream for client
  // ========================================
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      /**
       * Send SSE event to client
       * Follows OpenAI-compatible SSE format
       */
      function sendEvent(data: unknown) {
        const json = JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${json}\n\n`));
      }

      /**
       * Send OpenAI-compatible content chunk
       * Format: data: {"choices":[{"delta":{"content":"..."}}]}
       */
      function sendContentChunk(content: string) {
        sendEvent({
          choices: [
            {
              delta: {
                content,
              },
            },
          ],
        });
      }

      // ========================================
      // Track last status marker for deduplication
      // ========================================
      let lastStatusMarker: string | null = null;

      try {
        // NOTE: With native function calling, GLM returns tool_calls in the response
        // instead of XML in content. No content buffering/stripping needed.

        // ========================================
        // STEP 1: Call GLM with native function calling
        // ========================================
        const glmResponse = await callGLMWithRetry(
          finalSystemPrompt,
          userPrompt,
          {
            requestId,
            userId: userId || undefined,
            isGuest,
            functionName: 'chat',
            stream: true,
            enableThinking: true, // Reasoning enabled for better tool selection
            tools: allTools,
            temperature: 0.7,
            max_tokens: 8000,
          }
        );

        if (!glmResponse.ok) {
          const errorText = await glmResponse.text();
          console.error(`${logPrefix} ❌ GLM API error:`, glmResponse.status, errorText);

          sendEvent({
            type: 'error',
            error: 'Failed to connect to AI service',
            requestId,
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        // ========================================
        // STEP 2: Stream response with NATIVE tool call detection
        // ========================================
        const toolContext: ToolContext = {
          requestId,
          userId: userId || undefined,
          isGuest,
          functionName: 'chat',
          supabaseClient, // Required for image generation storage
        };

        let nativeToolCallDetected = false;
        let detectedNativeToolCall: NativeToolCall | undefined;

        // Accumulate reasoning text for status marker parsing
        let fullReasoningAccumulated = '';

        // Process stream with native tool call detection
        // GLM now uses OpenAI-compatible tool_calls in response instead of XML
        const streamResult = await processGLMStream(
          glmResponse,
          {
            onReasoningChunk: async (chunk: string) => {
              // Accumulate reasoning text for status marker parsing
              fullReasoningAccumulated += chunk;

              // Parse status markers from accumulated reasoning content
              const statusMarker = parseStatusMarker(fullReasoningAccumulated);
              if (statusMarker && statusMarker !== lastStatusMarker) {
                const statusEvent = {
                  type: 'reasoning_status',
                  content: statusMarker,
                  source: 'glm_marker',
                  timestamp: Date.now(),
                };
                sendEvent(statusEvent);
                lastStatusMarker = statusMarker;
              }
            },

            onContentChunk: async (chunk: string) => {
              // With native tool calling, content is clean (no XML to strip)
              // Forward directly to client
              sendContentChunk(chunk);
            },

            onNativeToolCall: async (toolCall: NativeToolCall) => {
              nativeToolCallDetected = true;
              detectedNativeToolCall = toolCall;

              // Parse arguments from JSON string
              const parsedArgs = parseToolArguments(
                toolCall.function.arguments,
                logPrefix
              );

              console.log(
                `${logPrefix} 🔧 Native tool call detected: ${toolCall.function.name} with args:`,
                parsedArgs
              );

              // Notify client that tool call started
              sendEvent({
                type: 'tool_call_start',
                toolName: toolCall.function.name,
                arguments: parsedArgs,
                timestamp: Date.now(),
              });
            },

            onComplete: async (fullReasoning: string, fullContent: string) => {
              console.log(
                `${logPrefix} ✅ GLM stream complete: reasoning=${fullReasoning.length}chars, content=${fullContent.length}chars`
              );
            },

            onError: async (error: Error) => {
              console.error(`${logPrefix} ❌ Stream error:`, error);
              sendEvent({
                type: 'error',
                error: error.message,
                requestId,
              });
            },
          },
          requestId
        );

        // Check if we got native tool calls from the stream result
        if (streamResult.nativeToolCalls && streamResult.nativeToolCalls.length > 0 && !nativeToolCallDetected) {
          // TODO: Support multiple tool calls in parallel (currently only first is processed)
          if (streamResult.nativeToolCalls.length > 1) {
            console.warn(`${logPrefix} ⚠️ Multiple tool calls detected (${streamResult.nativeToolCalls.length}), only processing first`);
          }
          // Tool calls were detected in stream processing
          nativeToolCallDetected = true;
          detectedNativeToolCall = streamResult.nativeToolCalls[0];
        }

        // NOTE: With native function calling, retry logic is no longer needed
        // GLM properly completes tool calls via the API instead of XML in content

        // ========================================
        // STEP 3: Execute tool if detected (using native tool call)
        // ========================================
        if (nativeToolCallDetected && detectedNativeToolCall) {
          // Convert NativeToolCall to ToolCall format for executeTool
          const parsedArgs = parseToolArguments(
            detectedNativeToolCall.function.arguments,
            logPrefix
          );

          const toolCallForExecution: ToolCall = {
            id: detectedNativeToolCall.id,
            name: detectedNativeToolCall.function.name,
            arguments: parsedArgs,
          };

          console.log(`${logPrefix} 🔧 Executing tool: ${toolCallForExecution.name}`);

          const toolResult = await executeTool(toolCallForExecution, toolContext);

          console.log(
            `${logPrefix} 🔧 Tool execution ${toolResult.success ? 'succeeded' : 'failed'}: ${toolResult.latencyMs}ms`
          );

          // Notify client of tool result
          sendEvent({
            type: 'tool_result',
            toolName: toolResult.toolName,
            success: toolResult.success,
            sourceCount: toolResult.data?.sourceCount,
            latencyMs: toolResult.latencyMs,
            timestamp: Date.now(),
          });

          // Send tool-specific results to client
          if (toolResult.success) {
            switch (toolResult.toolName) {
              case 'browser.search': {
                // Maps Tavily response to WebSearchResults format expected by frontend
                if (toolResult.data?.searchResults) {
                  const tavilyResults = toolResult.data.searchResults;
                  sendEvent({
                    type: 'web_search',
                    data: {
                      query: tavilyResults.query,
                      sources: tavilyResults.results.map((result: { title: string; url: string; content: string; score?: number }) => ({
                        title: result.title,
                        url: result.url,
                        snippet: result.content,
                        relevanceScore: result.score,
                      })),
                      timestamp: Date.now(),
                      searchTime: toolResult.latencyMs,
                    },
                  });
                  console.log(`${logPrefix} 📤 Sent web_search event with ${tavilyResults.results.length} sources`);
                }
                break;
              }

              case 'generate_artifact': {
                // Send artifact result to client
                if (toolResult.data?.artifactCode) {
                  sendEvent({
                    type: 'artifact_complete',
                    artifactCode: toolResult.data.artifactCode,
                    artifactType: toolResult.data.artifactType,
                    artifactTitle: toolResult.data.artifactTitle,
                    reasoning: toolResult.data.artifactReasoning,
                    timestamp: Date.now(),
                    latencyMs: toolResult.latencyMs,
                  });
                  console.log(`${logPrefix} 📤 Sent artifact_complete event (type=${toolResult.data.artifactType})`);
                }
                break;
              }

              case 'generate_image': {
                // Send image result to client
                if (toolResult.data?.imageUrl || toolResult.data?.imageData) {
                  sendEvent({
                    type: 'image_complete',
                    imageUrl: toolResult.data.imageUrl,
                    imageData: toolResult.data.imageData,
                    storageSucceeded: toolResult.data.storageSucceeded,
                    degradedMode: toolResult.data.degradedMode,
                    timestamp: Date.now(),
                    latencyMs: toolResult.latencyMs,
                  });
                  console.log(`${logPrefix} 📤 Sent image_complete event (storage=${toolResult.data.storageSucceeded})`);
                }
                break;
              }

              default:
                console.log(`${logPrefix} ℹ️ No specific event for tool: ${toolResult.toolName}`);
            }
          }

          // ========================================
          // STEP 4: Continue GLM with tool results
          // ========================================
          if (toolResult.success) {
            const formattedResult = formatResultForGLM(
              toolCallForExecution,
              toolResult
            );

            console.log(
              `${logPrefix} 🔧 Continuing GLM with tool result (${formattedResult.length} chars)`
            );

            // Track continuation reasoning for status markers
            let continuationReasoningText = '';

            // Call GLM again with tool results
            await callGLMWithToolResult(
              finalSystemPrompt,
              userPrompt,
              toolCallForExecution,
              toolResult.data?.formattedContext || 'Tool execution failed',
              {
                onReasoningChunk: async (chunk: string) => {
                  // Accumulate reasoning for status marker parsing
                  continuationReasoningText += chunk;

                  // Parse status markers from accumulated continuation reasoning
                  const statusMarker = parseStatusMarker(continuationReasoningText);
                  if (statusMarker && statusMarker !== lastStatusMarker) {
                    const statusEvent = {
                      type: 'reasoning_status',
                      content: statusMarker,
                      source: 'glm_marker',
                      timestamp: Date.now(),
                    };
                    sendEvent(statusEvent);
                    lastStatusMarker = statusMarker;
                  }
                },

                onContentChunk: async (chunk: string) => {
                  sendContentChunk(chunk);
                },

                onComplete: async (fullReasoning: string, fullContent: string) => {
                  console.log(
                    `${logPrefix} ✅ GLM continuation complete: content=${fullContent.length}chars`
                  );
                },

                onError: async (error: Error) => {
                  console.error(`${logPrefix} ❌ Continuation error:`, error);
                  sendEvent({
                    type: 'error',
                    error: error.message,
                    requestId,
                  });
                },
              },
              {
                requestId,
                userId: userId || undefined,
                isGuest,
                functionName: 'chat',
                stream: true,
                enableThinking: true,
                tools: allTools,
              }
            );

            console.log(
              `${logPrefix} ✅ Tool-calling chat complete with continuation`
            );
          } else {
            // Tool execution failed - inform user but continue
            console.warn(
              `${logPrefix} ⚠️ Tool execution failed: ${toolResult.error}`
            );

            sendContentChunk(
              `\n\n(Note: Web search encountered an error, but I can still help based on my training data.)\n\n`
            );
          }
        }

        // ========================================
        // STEP 5: Finalize stream
        // ========================================

        console.log(`${logPrefix} ✅ Tool-calling chat stream complete`);

        // Send [DONE] marker (OpenAI-compatible)
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(`${logPrefix} ❌ Tool-calling chat error:`, errorMessage);

        sendEvent({
          type: 'error',
          error: 'An error occurred during processing',
          details: errorMessage,
          requestId,
        });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  // ========================================
  // Return SSE Response
  // ========================================
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      ...rateLimitHeaders,
      'X-Request-ID': requestId,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
