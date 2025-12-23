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
  getToolResultContent,
  type ToolContext,
} from '../../_shared/tool-executor.ts';
import {
  getGLMToolDefinitions,
} from '../../_shared/tool-definitions.ts';
import { ToolParameterValidator } from '../../_shared/tool-validator.ts';
import { ToolRateLimiter } from '../../_shared/tool-rate-limiter.ts';
import { ToolExecutionTracker } from '../../_shared/tool-execution-tracker.ts';
import { PromptInjectionDefense } from '../../_shared/prompt-injection-defense.ts';
import { SafeErrorHandler } from '../../_shared/safe-error-handler.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { getSystemInstruction } from '../../_shared/system-prompt-inline.ts';
import {
  createReasoningProvider,
  createNoOpReasoningProvider,
  type IReasoningProvider
} from '../../_shared/reasoning-provider.ts';
import { FEATURE_FLAGS, USE_REASONING_PROVIDER } from '../../_shared/config.ts';

/**
 * Mode hint for biasing tool selection.
 * - 'artifact': Bias towards artifact generation
 * - 'image': Bias towards image generation
 * - 'auto': Let model decide based on intent
 */
export type ModeHint = 'artifact' | 'image' | 'auto';
export type ToolChoice = 'auto' | 'generate_artifact' | 'generate_image';

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
  /** Tool choice to force a specific tool call (optional, defaults to 'auto') */
  toolChoice?: ToolChoice;
  /** Supabase client for storage operations (required for image generation) */
  supabaseClient?: SupabaseClient;
  /** Supabase service client for tool rate limiting */
  serviceClient: SupabaseClient;
  /** Client IP for tool-specific guest rate limiting */
  clientIp: string;
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
    toolChoice = 'auto',
    supabaseClient,
    serviceClient,
    clientIp,
  } = params;

  const logPrefix = `[${requestId}]`;

  console.log(
    `${logPrefix} 🔧 Starting unified tool-calling chat with GLM-4.6 ` +
    `(modeHint=${modeHint}, toolChoice=${toolChoice})`
  );

  // Get all tool definitions for unified handler
  // Spread into mutable array to satisfy GLM client's type requirements
  const allTools = [...getGLMToolDefinitions()];
  const toolNames = allTools.map(t => t.name).join(', ');
  console.log(`${logPrefix} 🔧 Tools available: ${toolNames}`);

  // SECURITY: Sanitize user-controlled prompt injections
  const sanitizedModeHint = PromptInjectionDefense.sanitizeModeHint(modeHint);
  const sanitizedArtifactContext = PromptInjectionDefense.sanitizeArtifactContext(fullArtifactContext);

  // Get system instruction with tool-calling enabled and sanitized artifact context
  const toolEnabledSystemPrompt = getSystemInstruction({
    useToolCalling: true,
    fullArtifactContext: sanitizedArtifactContext,
  });

  // Combine with search/URL context if provided
  let baseSystemPrompt = toolEnabledSystemPrompt;
  if (searchContext) {
    baseSystemPrompt += `\n\nREAL-TIME WEB SEARCH RESULTS:\n${searchContext}`;
  }
  if (urlExtractContext) {
    baseSystemPrompt += `\n\nURL CONTENT:\n${urlExtractContext}`;
  }

  const resolveModeHint = (currentToolChoice: ToolChoice): ModeHint => {
    if (currentToolChoice === 'generate_artifact') return 'artifact';
    if (currentToolChoice === 'generate_image') return 'image';
    return sanitizedModeHint;
  };

  const buildConversationMessages = (systemPrompt: string) => ([
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => {
        // Keep all user messages
        if (m.role === 'user') return true;
        // Filter out blank/empty assistant messages (prevent malformed sequences)
        if (m.role === 'assistant') {
          const hasContent = m.content && m.content.trim().length > 0;
          if (!hasContent) {
            console.warn(`Filtering blank assistant message from conversation history`, { requestId });
          }
          return hasContent;
        }
        return true;
      })
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
  ]);

  // Keep userPrompt for backward compatibility with tool continuations
  // (callGLMWithToolResult still uses it as fallback)
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

      // Initialize ReasoningProvider for semantic status generation
      let reasoningProvider: IReasoningProvider;

      if (USE_REASONING_PROVIDER) {
        reasoningProvider = createReasoningProvider(requestId, async (event) => {
          // Emit reasoning status via SSE
          sendEvent({
            type: event.type,
            content: event.message,
            phase: event.phase,
            source: event.metadata.source,
            timestamp: event.metadata.timestamp,
          });
        });
        await reasoningProvider.start();
        console.log(`${logPrefix} ReasoningProvider started`);
      } else {
        reasoningProvider = createNoOpReasoningProvider();
      }

      const toolRateLimiter = FEATURE_FLAGS.RATE_LIMIT_DISABLED
        ? null
        : new ToolRateLimiter(serviceClient);

      const executionTracker = new ToolExecutionTracker(requestId);

      const buildSystemPrompt = (currentToolChoice: ToolChoice, fallbackNote?: string) => {
        const sessionModeHint = resolveModeHint(currentToolChoice);
        let systemPrompt = baseSystemPrompt + buildModeHintPrompt(sessionModeHint);
        if (fallbackNote) {
          systemPrompt += `\n\n${fallbackNote}`;
        }
        return systemPrompt;
      };

      const executeToolWithSecurity = async (
        toolCallForExecution: ToolCall,
        toolContext: ToolContext
      ) => {
        const startTime = Date.now();

        try {
          const validatedArgs = ToolParameterValidator.validate(
            toolCallForExecution.name,
            toolCallForExecution.arguments
          );

          if (toolRateLimiter) {
            await toolRateLimiter.checkToolRateLimit(toolCallForExecution.name, {
              isGuest,
              userId: userId || undefined,
              clientIp,
              requestId,
            });
          }

          const sanitizedToolCall: ToolCall = {
            ...toolCallForExecution,
            arguments: validatedArgs as Record<string, unknown>,
          };

          return await executionTracker.trackExecution(
            sanitizedToolCall.name,
            () => executeTool(sanitizedToolCall, toolContext)
          );
        } catch (error) {
          const { response } = SafeErrorHandler.toSafeResponse(error, requestId, {
            toolName: toolCallForExecution.name,
          });

          return {
            success: false,
            toolName: toolCallForExecution.name,
            error: response.error.message,
            latencyMs: Date.now() - startTime,
          };
        }
      };

      try {
        const sendSafeError = (error: unknown, context?: Record<string, unknown>) => {
          const { response } = SafeErrorHandler.toSafeResponse(error, requestId, context);
          sendEvent({
            type: 'error',
            error: response.error.message,
            requestId,
            retryable: response.error.retryable,
          });
        };

        const toolContext: ToolContext = {
          requestId,
          userId: userId || undefined,
          isGuest,
          functionName: 'chat',
          supabaseClient, // Required for image generation storage
        };

        const FALLBACK_NOTE =
          'The requested tool failed. Respond directly and avoid calling tools unless absolutely necessary.';

        const runToolCallingPass = async (
          currentToolChoice: ToolChoice,
          allowAutoFallback: boolean,
          fallbackNote?: string
        ): Promise<void> => {
          // NOTE: With native function calling, GLM returns tool_calls in the response
          // instead of XML in content. No content buffering/stripping needed.
          const systemPrompt = buildSystemPrompt(currentToolChoice, fallbackNote);
          const conversationMessages = buildConversationMessages(systemPrompt);

          // ========================================
          // STEP 1: Call GLM with native function calling
          // ========================================
          const glmResponse = await callGLMWithRetry(
            systemPrompt,
            userPrompt,
            {
              requestId,
              userId: userId || undefined,
              isGuest,
              functionName: 'chat',
              stream: true,
              enableThinking: true, // Reasoning enabled for better tool selection
              tools: allTools,
              toolChoice: currentToolChoice,
              temperature: 0.7,
              max_tokens: 8000,
              // BUG FIX: Pass full conversation history for multi-turn context
              conversationMessages,
            }
          );

          if (!glmResponse.ok) {
            const errorText = await glmResponse.text();
            console.error(`${logPrefix} ❌ GLM API error:`, glmResponse.status, errorText);
            sendSafeError(new Error('GLM API error'), {
              status: glmResponse.status,
              errorText,
            });
            return;
          }

          // ========================================
          // STEP 2: Stream response with NATIVE tool call detection
          // ========================================
          let nativeToolCallDetected = false;
          let detectedNativeToolCall: NativeToolCall | undefined;

          // Accumulate reasoning text for context
          let fullReasoningAccumulated = '';
          let lastStatusMarker = '';

          // Process stream with native tool call detection
          // GLM now uses OpenAI-compatible tool_calls in response instead of XML
          const streamResult = await processGLMStream(
            glmResponse,
            {
              onReasoningChunk: async (chunk: string) => {
                // Accumulate reasoning text for context
                fullReasoningAccumulated += chunk;

                // FIX (2025-12-22): Forward reasoning chunks to frontend for live display
                sendEvent({
                  type: 'reasoning_chunk',
                  chunk: chunk,
                });

                // Parse [STATUS:] markers and emit status updates
                const statusMarker = parseStatusMarker(fullReasoningAccumulated);
                if (statusMarker && statusMarker !== lastStatusMarker) {
                  lastStatusMarker = statusMarker;
                  sendEvent({
                    type: 'status_update',
                    status: statusMarker,
                  });
                  console.log(`${logPrefix} 📊 Status marker: "${statusMarker}"`);
                }

                // Process through ReasoningProvider for semantic status generation
                await reasoningProvider.processReasoningChunk(chunk);
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
                sendSafeError(error, { stage: 'glm-stream' });
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

            const toolResult = await executeToolWithSecurity(toolCallForExecution, toolContext);

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

                    // FIX (2025-12-22): Send accumulated reasoning to frontend for display
                    if (fullReasoningAccumulated) {
                      sendEvent({
                        type: 'reasoning_complete',
                        reasoning: fullReasoningAccumulated,
                        reasoningSteps: null, // Structured steps not used with [STATUS:] markers
                      });
                      console.log(`${logPrefix} 📤 Sent reasoning_complete event (${fullReasoningAccumulated.length} chars)`);
                    }
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
              // RFC-001: Use getToolResultContent which handles ALL tool types correctly
              // This fixes the bug where artifact/image tools fell back to "Tool execution failed"
              const resultContent = getToolResultContent(toolResult);

              console.log(
                `${logPrefix} 🔧 Continuing GLM with tool result: ${toolResult.toolName} (${resultContent.length} chars)`
              );

              // Track continuation reasoning for context
              let continuationReasoningText = '';
              let lastContinuationStatusMarker = '';

              // BUG FIX (2025-12-20): Pass the assistant's tool_calls to the continuation
              // This ensures GLM has the proper conversation context and returns a real response
              // instead of a blank response
              const previousAssistantToolCalls = streamResult.nativeToolCalls || [];

              // BUG FIX (2025-12-21): Wrap GLM continuation in a timeout as safety measure
              // If continuation hangs for 90s (beyond GLM's internal 60s chunk timeout),
              // we still ensure the stream completes rather than hanging indefinitely.
              const GLM_CONTINUATION_TIMEOUT_MS = 90000; // 90 seconds

              const continuationPromise = callGLMWithToolResult(
                systemPrompt,
                userPrompt,
                toolCallForExecution,
                resultContent,  // FIX: Now works for all tool types!
                {
                  onReasoningChunk: async (chunk: string) => {
                    // Accumulate reasoning for context
                    continuationReasoningText += chunk;

                    // FIX (2025-12-22): Forward continuation reasoning chunks to frontend
                    sendEvent({
                      type: 'reasoning_chunk',
                      chunk: chunk,
                    });

                    // Parse [STATUS:] markers and emit status updates
                    const statusMarker = parseStatusMarker(continuationReasoningText);
                    if (statusMarker && statusMarker !== lastContinuationStatusMarker) {
                      lastContinuationStatusMarker = statusMarker;
                      sendEvent({
                        type: 'status_update',
                        status: statusMarker,
                      });
                      console.log(`${logPrefix} 📊 Continuation status marker: "${statusMarker}"`);
                    }

                    // Process through ReasoningProvider for semantic status generation
                    await reasoningProvider.processReasoningChunk(chunk);
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
                    sendSafeError(error, { stage: 'glm-continuation' });
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
                  toolChoice: currentToolChoice,
                  // BUG FIX: Pass full conversation history for tool continuation context
                  conversationMessages,
                },
                previousAssistantToolCalls  // BUG FIX: Pass tool_calls for context!
              );

              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('GLM continuation timeout')), GLM_CONTINUATION_TIMEOUT_MS);
              });

              try {
                await Promise.race([continuationPromise, timeoutPromise]);
              } catch (continuationError) {
                // Log the error but continue to [DONE] - don't let continuation issues block stream completion
                console.error(`${logPrefix} ❌ GLM continuation failed/timeout:`, continuationError);
                sendContentChunk('\n\n(The response was interrupted. Please try again if incomplete.)');
              }

              console.log(
                `${logPrefix} ✅ Tool-calling chat complete with continuation`
              );
            } else {
              // Tool execution failed - inform user but continue
              console.warn(
                `${logPrefix} ⚠️ Tool execution failed: ${toolResult.error}`
              );

              if (allowAutoFallback && currentToolChoice !== 'auto') {
                sendEvent({
                  type: 'warning',
                  message: 'Tool execution failed. Falling back to auto mode.',
                  timestamp: Date.now(),
                });
                await runToolCallingPass('auto', false, FALLBACK_NOTE);
                return;
              }

              sendContentChunk(
                `\n\n(Note: The requested tool failed, but I can still help.)\n\n`
              );
            }
          }
        };

        await runToolCallingPass(toolChoice, true);

        // ========================================
        // STEP 5: Finalize stream
        // ========================================

        // Cleanup ReasoningProvider
        if (reasoningProvider) {
          await reasoningProvider.finalize('response');
          reasoningProvider.destroy();
          console.log(`${logPrefix} ReasoningProvider finalized`);
        }

        executionTracker.destroy();

        console.log(`${logPrefix} ✅ Tool-calling chat stream complete`);

        // Send [DONE] marker (OpenAI-compatible)
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(`${logPrefix} ❌ Tool-calling chat error:`, errorMessage);

        // Cleanup ReasoningProvider on error
        if (reasoningProvider) {
          reasoningProvider.destroy();
          console.log(`${logPrefix} ReasoningProvider destroyed (error path)`);
        }

        executionTracker.destroy();

        const { response } = SafeErrorHandler.toSafeResponse(error, requestId, {
          stage: 'tool-calling-chat',
        });

        sendEvent({
          type: 'error',
          error: response.error.message,
          requestId,
          retryable: response.error.retryable,
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
