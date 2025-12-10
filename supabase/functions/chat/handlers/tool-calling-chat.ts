/**
 * Tool-Calling Chat Handler
 *
 * Orchestrates GLM-4.6 tool-calling for chat with web search integration.
 *
 * Flow:
 * 1. Send user message to GLM with tools enabled
 * 2. Stream GLM response, detecting <tool_call> tags in content
 * 3. If tool call detected: execute tool, inject results, continue GLM response
 * 4. Stream final response to client with SSE events for tool execution
 *
 * SSE Events Emitted:
 * - tool_call_start: When tool call is detected { type, toolName, arguments }
 * - tool_result: When tool execution completes { type, toolName, success, sourceCount? }
 * - reasoning_chunk: GLM reasoning content (from delta.reasoning_content)
 * - content_chunk: Regular content chunks (OpenAI-compatible format)
 * - reasoning_complete: Final reasoning summary
 *
 * Architecture:
 * - Uses GLM_SEARCH_TOOL from glm-client.ts for tool definitions
 * - Uses processGLMStreamWithToolDetection for tool call detection
 * - Uses executeTool from tool-executor.ts for tool execution
 * - Uses callGLMWithToolResult for continuation with tool results
 * - Maintains OpenAI-compatible SSE format for frontend compatibility
 */

import {
  callGLMWithRetry,
  processGLMStreamWithToolDetection,
  callGLMWithToolResult,
  GLM_SEARCH_TOOL,
  type GLMStreamCallbacks,
  type ToolCall,
} from '../../_shared/glm-client.ts';
import {
  executeTool,
  formatResultForGLM,
  type ToolContext,
} from '../../_shared/tool-executor.ts';
import { getSystemInstruction } from '../../_shared/system-prompt-inline.ts';

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
  } = params;

  const logPrefix = `[${requestId}]`;

  console.log(`${logPrefix} 🔧 Starting tool-calling chat with GLM-4.6`);

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

  // Build user prompt from messages (combine all user messages)
  const userPrompt = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n\n');

  console.log(
    `${logPrefix} 🔧 Tool-calling enabled with tools: ${GLM_SEARCH_TOOL.name}`
  );

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

      try {
        // ========================================
        // STEP 1: Call GLM with tools enabled
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
            enableThinking: true,
            tools: [GLM_SEARCH_TOOL],
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
        // STEP 2: Stream response with tool detection
        // ========================================
        const toolContext: ToolContext = {
          requestId,
          userId: userId || undefined,
          isGuest,
          functionName: 'chat',
        };

        let toolCallDetected = false;
        let detectedToolCall: ToolCall | undefined;

        // Process stream with tool detection
        const streamResult = await processGLMStreamWithToolDetection(
          glmResponse,
          {
            onReasoningChunk: async (chunk: string) => {
              // Forward reasoning chunks to client
              sendEvent({
                type: 'reasoning_chunk',
                content: chunk,
                timestamp: Date.now(),
              });
            },

            onContentChunk: async (chunk: string) => {
              // Forward content chunks to client
              // Use OpenAI-compatible format
              sendContentChunk(chunk);
            },

            onToolCallDetected: async (toolCall: ToolCall) => {
              toolCallDetected = true;
              detectedToolCall = toolCall;

              console.log(
                `${logPrefix} 🔧 Tool call detected: ${toolCall.name} with args:`,
                toolCall.arguments
              );

              // Notify client that tool call started
              sendEvent({
                type: 'tool_call_start',
                toolName: toolCall.name,
                arguments: toolCall.arguments,
                timestamp: Date.now(),
              });
            },

            onComplete: async (fullReasoning: string, fullContent: string) => {
              console.log(
                `${logPrefix} ✅ GLM stream complete: reasoning=${fullReasoning.length}chars, content=${fullContent.length}chars`
              );

              // Send reasoning_complete event
              if (fullReasoning.length > 0) {
                sendEvent({
                  type: 'reasoning_complete',
                  reasoning: fullReasoning.substring(0, 500),
                  timestamp: Date.now(),
                });
              }
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

        // ========================================
        // STEP 3: Execute tool if detected
        // ========================================
        if (toolCallDetected && detectedToolCall) {
          console.log(`${logPrefix} 🔧 Executing tool: ${detectedToolCall.name}`);

          const toolResult = await executeTool(detectedToolCall, toolContext);

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

          // ========================================
          // STEP 4: Continue GLM with tool results
          // ========================================
          if (toolResult.success) {
            const formattedResult = formatResultForGLM(
              detectedToolCall,
              toolResult
            );

            console.log(
              `${logPrefix} 🔧 Continuing GLM with tool result (${formattedResult.length} chars)`
            );

            // Call GLM again with tool results
            const continuationResult = await callGLMWithToolResult(
              finalSystemPrompt,
              userPrompt,
              detectedToolCall,
              toolResult.data?.formattedContext || 'Tool execution failed',
              {
                onReasoningChunk: async (chunk: string) => {
                  sendEvent({
                    type: 'reasoning_chunk',
                    content: chunk,
                    timestamp: Date.now(),
                  });
                },

                onContentChunk: async (chunk: string) => {
                  sendContentChunk(chunk);
                },

                onComplete: async (fullReasoning: string, fullContent: string) => {
                  console.log(
                    `${logPrefix} ✅ GLM continuation complete: content=${fullContent.length}chars`
                  );

                  if (fullReasoning.length > 0) {
                    sendEvent({
                      type: 'reasoning_complete',
                      reasoning: fullReasoning.substring(0, 500),
                      timestamp: Date.now(),
                    });
                  }
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
                tools: [GLM_SEARCH_TOOL],
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
