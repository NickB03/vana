/**
 * Tool-Calling Chat Handler
 *
 * Orchestrates Gemini 3 Flash tool-calling for chat with web search integration.
 *
 * Flow:
 * 1. Send user message to Gemini with tools enabled
 * 2. Stream Gemini response, detecting native tool_calls in response
 * 3. If tool call detected: execute tool, inject results, continue Gemini response
 * 4. Stream final response to client with SSE events for tool execution
 *
 * SSE Events Emitted:
 * - tool_call_start: When tool call is detected { type, toolName, arguments }
 * - tool_result: When tool execution completes { type, toolName, success, sourceCount? }
 * - reasoning_status: Live thinking status for ticker { type, content }
 * - content_chunk: Regular content chunks (OpenAI-compatible format)
 *
 * Architecture:
 * - Uses getGeminiToolDefinitions() from tool-definitions.ts for tool catalog
 * - Uses processGeminiStream for native tool call detection
 * - Uses executeTool from tool-executor.ts for tool execution
 * - Uses callGeminiWithToolResult for continuation with tool results
 * - Maintains OpenAI-compatible SSE format for frontend compatibility
 */

import {
  callGeminiWithRetry,
  processGeminiStream,
  callGeminiWithToolResult,
} from '../../_shared/gemini-client.ts';
import {
  executeTool,
  getToolResultContent,
  type ToolContext,
} from '../../_shared/tool-executor.ts';
import {
  getGeminiToolDefinitions,
} from '../../_shared/tool-definitions.ts';
import { ToolParameterValidator } from '../../_shared/tool-validator.ts';
import { ToolRateLimiter } from '../../_shared/tool-rate-limiter.ts';
import { ToolExecutionTracker } from '../../_shared/tool-execution-tracker.ts';
import { PromptInjectionDefense } from '../../_shared/prompt-injection-defense.ts';
import { SafeErrorHandler } from '../../_shared/safe-error-handler.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { getSystemInstruction } from '../../_shared/system-prompt-inline.ts';
import { getMatchingTemplate } from '../../_shared/artifact-rules/template-matcher.ts';
import { FEATURE_FLAGS, DEFAULT_MODEL_PARAMS } from '../../_shared/config.ts';
import { saveArtifact } from '../../_shared/artifact-saver.ts';
import { saveMessageStub } from '../../_shared/message-stub-saver.ts';
import { analyzeArtifactComplexity } from '../../_shared/artifact-complexity.ts';
import { extractStatusFromReasoning } from '../../_shared/reasoning-status-extractor.ts';

// Tool call types - define inline for tool call handling
// Used for processing native tool calls from Gemini API
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface NativeToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Helper function to log detailed debug information for premade card failures
 * Only logs when DEBUG_PREMADE_CARDS=true
 */
function logPremadeDebug(requestId: string, message: string, data?: Record<string, unknown>) {
  if (FEATURE_FLAGS.DEBUG_PREMADE_CARDS) {
    const logData = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    console.log(`[PREMADE-DEBUG][${requestId}] ${message}${logData}`);
  }
}

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
  /** Session ID for message association */
  sessionId: string | undefined;
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
  /** Pre-generated UUID for the assistant message (enables artifact DB linking) */
  assistantMessageId?: string;
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
 * Handle tool-calling chat with Gemini 3 Flash
 *
 * Orchestrates the full tool-calling flow:
 * 1. Call Gemini with tools enabled (browser.search, generate_artifact, generate_image)
 * 2. Stream response while detecting tool calls
 * 3. Execute tools when detected
 * 4. Continue Gemini response with tool results
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
  // Common guidance for when NOT to use tools
  const noToolGuidance = `
DO NOT use any tools for:
- Very short messages (1-3 words) like "test", "skip", "hi", "thanks", "ok"
- Simple questions that can be answered directly
- Feedback or acknowledgments from the user
- Messages asking for clarification or more information
- Greetings or casual conversation`;

  switch (modeHint) {
    case 'artifact':
      return `

ARTIFACT MODE: The user wants to create something visual or interactive.
Use generate_artifact when their message describes something to BUILD or CREATE.
${noToolGuidance}

If the message is a clear creation request (e.g., "make a calculator", "create a chart"), use generate_artifact.
If unsure whether they want an artifact, ask for clarification instead of generating.`;

    case 'image':
      return `

IMAGE MODE: The user wants to generate an image.
Use generate_image when their message describes an image to CREATE.
${noToolGuidance}

If the message is a clear image request (e.g., "draw a cat", "create a logo"), use generate_image.
If unsure whether they want an image, ask for clarification instead of generating.`;

    case 'auto':
    default:
      return `

Analyze the user's request carefully before using tools:
${noToolGuidance}

Only use tools when there's a CLEAR request:
- generate_artifact: User explicitly wants to CREATE something visual/interactive/code-based
- generate_image: User explicitly wants an image, photo, illustration, or artwork
- browser.search: User needs current information, news, or real-time data

When in doubt, respond conversationally and ask what they'd like to create.`;
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
    sessionId,
    isGuest,
    requestId,
    corsHeaders,
    rateLimitHeaders,
    modeHint = 'auto',
    toolChoice = 'auto',
    supabaseClient,
    serviceClient,
    clientIp,
    assistantMessageId,
  } = params;

  const logPrefix = `[${requestId}]`;

  console.log(
    `${logPrefix} 🔧 Starting unified tool-calling chat with Gemini 3 Flash ` +
    `(modeHint=${modeHint}, toolChoice=${toolChoice})`
  );

  // Get all tool definitions for unified handler
  // Spread into mutable array to satisfy Gemini client's type requirements
  const allTools = [...getGeminiToolDefinitions()];
  const toolNames = allTools.map(t => t.name).join(', ');
  console.log(`${logPrefix} 🔧 Tools available: ${toolNames}`);

  // SECURITY: Sanitize user-controlled prompt injections
  const sanitizedModeHint = PromptInjectionDefense.sanitizeModeHint(modeHint);
  const sanitizedArtifactContext = PromptInjectionDefense.sanitizeArtifactContext(fullArtifactContext);

  // Get the last user message for template matching
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .pop()?.content || '';

  // Match user request to artifact template for optimized guidance
  const templateMatch = getMatchingTemplate(lastUserMessage);

  // Log template matching result for observability
  if (templateMatch.matched) {
    console.log(
      `${logPrefix} 🎯 Template matched: ${templateMatch.templateId} ` +
      `(confidence: ${templateMatch.confidence}%)`
    );
  } else {
    console.log(
      `${logPrefix} 📋 No template match: reason=${templateMatch.reason}` +
      (templateMatch.confidence ? `, best_confidence=${templateMatch.confidence}%` : '')
    );

    // Warn if close to threshold (useful for tuning template keywords)
    if (templateMatch.reason === 'low_confidence' && templateMatch.templateId) {
      console.warn(
        `${logPrefix} 🎯 Template match below threshold: ` +
        `templateId=${templateMatch.templateId}, confidence=${templateMatch.confidence}%, ` +
        `threshold=30%, message="${lastUserMessage.slice(0, 100)}..."`
      );
    }
  }

  // Get system instruction with tool-calling enabled and sanitized artifact context
  const toolEnabledSystemPrompt = getSystemInstruction({
    useToolCalling: true,
    fullArtifactContext: sanitizedArtifactContext,
    matchedTemplate: templateMatch.template,
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

  const convertToolChoice = (currentToolChoice: ToolChoice): "auto" | { type: "function"; function: { name: string } } => {
    if (currentToolChoice === 'auto') return 'auto';
    return {
      type: 'function',
      function: { name: currentToolChoice }
    };
  };

  const buildConversationMessages = (systemPrompt: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> => ([
    { role: 'system' as const, content: systemPrompt },
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
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
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
       * Track stream state to prevent double-close errors
       */
      let streamClosed = false;

      /**
       * Send SSE event to client
       * Follows OpenAI-compatible SSE format
       * Includes guard to prevent enqueueing after stream closure
       */
      function sendEvent(data: unknown) {
        if (streamClosed) {
          console.warn(`[${requestId}] Attempted to send event after stream closed:`, JSON.stringify(data).substring(0, 100));
          return;
        }

        try {
          const json = JSON.stringify(data);
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('cannot close or enqueue')) {
            console.warn(`[${requestId}] Stream already closed, marking as closed and ignoring event`);
            streamClosed = true;
          } else {
            throw error;
          }
        }
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

      // ReasoningProvider removed - no longer generating LLM-based status messages

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
          // Enhanced logging for premade card debugging - validation phase
          logPremadeDebug(requestId, 'Validating tool parameters', {
            toolName: toolCallForExecution.name,
            argumentKeys: Object.keys(toolCallForExecution.arguments),
            arguments: toolCallForExecution.arguments,
          });

          const validatedArgs = ToolParameterValidator.validate(
            toolCallForExecution.name,
            toolCallForExecution.arguments
          );

          logPremadeDebug(requestId, 'Tool parameter validation passed', {
            toolName: toolCallForExecution.name,
            validatedArgKeys: Object.keys(validatedArgs),
          });

          if (toolRateLimiter) {
            logPremadeDebug(requestId, 'Checking tool rate limit', {
              toolName: toolCallForExecution.name,
              isGuest,
              hasUserId: !!userId,
            });

            await toolRateLimiter.checkToolRateLimit(toolCallForExecution.name, {
              isGuest,
              userId: userId || undefined,
              clientIp,
              requestId,
            });

            logPremadeDebug(requestId, 'Tool rate limit check passed', {
              toolName: toolCallForExecution.name,
            });
          }

          const sanitizedToolCall: ToolCall = {
            ...toolCallForExecution,
            arguments: validatedArgs as unknown as Record<string, unknown>,
          };

          logPremadeDebug(requestId, 'Executing tool via executionTracker', {
            toolName: sanitizedToolCall.name,
          });

          return await executionTracker.trackExecution(
            sanitizedToolCall.name,
            () => executeTool(sanitizedToolCall, toolContext)
          );
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Enhanced logging for premade card debugging - error path
          logPremadeDebug(requestId, 'Tool execution error in security wrapper', {
            toolName: toolCallForExecution.name,
            error: errorMessage,
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            latencyMs,
            stack: error instanceof Error ? error.stack : undefined,
          });

          const { response } = SafeErrorHandler.toSafeResponse(error, requestId, {
            toolName: toolCallForExecution.name,
          });

          return {
            success: false,
            toolName: toolCallForExecution.name,
            error: response.error.message,
            latencyMs,
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
          userMessage: lastUserMessage, // For template matching in artifact generation
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
          // State tracking for reasoning status extraction
          // ========================================
          let lastEmittedStatus: string | null = null;
          let lastStatusTime = Date.now();
          const STATUS_COOLDOWN_MS = 2000; // Prevent flickering

          // Emit initial status
          sendEvent({ type: 'status_update', status: 'Analyzing your request...' });

          // ========================================
          // STEP 1: Call Gemini with native function calling
          // ========================================
          const geminiResponse = await callGeminiWithRetry(
            conversationMessages,
            {
              requestId,
              userId: userId || undefined,
              isGuest,
              functionName: 'chat',
              stream: true,
              enableThinking: true, // Reasoning enabled for better tool selection
              tools: allTools,
              toolChoice: convertToolChoice(currentToolChoice),
              temperature: 0.7,
              max_tokens: DEFAULT_MODEL_PARAMS.CHAT_MAX_TOKENS,
            }
          );

          if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error(`${logPrefix} ❌ Gemini API error:`, geminiResponse.status, errorText);
            sendSafeError(new Error('Gemini API error'), {
              status: geminiResponse.status,
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

          // Process stream with native tool call detection
          // Gemini uses OpenAI-compatible tool_calls in response
          for await (const chunk of processGeminiStream(geminiResponse, requestId)) {
            if (chunk.type === 'content') {
              // Forward content directly to client
              sendContentChunk(chunk.data);
            } else if (chunk.type === 'reasoning') {
              // Accumulate reasoning text for context
              fullReasoningAccumulated += chunk.data;

              // Try to extract contextual status
              const now = Date.now();
              if (now - lastStatusTime >= STATUS_COOLDOWN_MS) {
                // Extract from recent accumulated text (last 500 chars captures most status phrases)
                // This prevents missing patterns split across chunk boundaries
                const recentText = fullReasoningAccumulated.slice(-500);
                const extraction = extractStatusFromReasoning(recentText);
                // Only emit if we have a high or medium confidence match
                if (extraction.status && extraction.status !== lastEmittedStatus &&
                    (extraction.confidence === 'high' || extraction.confidence === 'medium')) {
                  sendEvent({
                    type: 'reasoning_status',
                    status: extraction.status,
                    confidence: extraction.confidence,
                  });
                  lastEmittedStatus = extraction.status;
                  lastStatusTime = now;
                  console.log(`${logPrefix} 📊 Extracted status: "${extraction.status}" (${extraction.confidence} confidence, pattern: ${extraction.pattern})`);
                }
              }

              // Forward reasoning chunks to frontend for live display
              sendEvent({
                type: 'reasoning_chunk',
                chunk: chunk.data,
              });
            } else if (chunk.type === 'tool_call') {
              // Tool calls detected
              const toolCalls = chunk.data;
              if (toolCalls && toolCalls.length > 0) {
                nativeToolCallDetected = true;
                detectedNativeToolCall = {
                  id: toolCalls[0].id,
                  type: 'function',
                  function: {
                    name: toolCalls[0].name,
                    arguments: JSON.stringify(toolCalls[0].arguments)
                  }
                };

                console.log(
                  `${logPrefix} 🔧 Native tool call detected: ${toolCalls[0].name} with args:`,
                  toolCalls[0].arguments
                );

                // Send semantic status update for ticker display
                const toolStatusMessage = (() => {
                  switch (toolCalls[0].name) {
                    case 'generate_artifact':
                      return 'Planning your interactive component...';
                    case 'generate_image':
                      return 'Preparing to create your image...';
                    case 'browser.search':
                      return 'Searching the web for relevant information...';
                    default:
                      return `Preparing to use ${toolCalls[0].name}...`;
                  }
                })();
                sendEvent({
                  type: 'status_update',
                  status: toolStatusMessage,
                });

                // Notify client that tool call started
                sendEvent({
                  type: 'tool_call_start',
                  toolName: toolCalls[0].name,
                  arguments: toolCalls[0].arguments,
                  timestamp: Date.now(),
                });
              }
            } else if (chunk.type === 'error') {
              console.error(`${logPrefix} ❌ Stream error:`, chunk.data);
              sendSafeError(chunk.data, { stage: 'gemini-stream' });
            }
          }

          console.log(
            `${logPrefix} ✅ Gemini stream complete: reasoning=${fullReasoningAccumulated.length}chars`
          );

          // NOTE: With native function calling, retry logic is no longer needed
          // Gemini properly completes tool calls via the API

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

            // For artifact generation, analyze and log complexity
            if (toolCallForExecution.name === 'generate_artifact') {
              const artifactArgs = toolCallForExecution.arguments as {
                artifactType?: string;
                prompt?: string;
              };
              const complexity = analyzeArtifactComplexity(
                artifactArgs.artifactType || 'react',
                artifactArgs.prompt || ''
              );
              console.log(
                `${logPrefix} 📊 Artifact complexity: ${complexity.reason} ` +
                `(isComplex=${complexity.isComplex}, tokens=${complexity.estimatedTokens})`
              );
              // Log factors for debugging
              logPremadeDebug(requestId, 'Artifact complexity analysis', {
                isComplex: complexity.isComplex,
                reason: complexity.reason,
                estimatedTokens: complexity.estimatedTokens,
                factors: complexity.factors,
              });
            }

            // Send execution status update for ticker display
            const executionStatusMessage = (() => {
              switch (toolCallForExecution.name) {
                case 'generate_artifact': {
                  // Try to extract artifact type from arguments for more specific messaging
                  const args = toolCallForExecution.arguments as { artifactType?: string };
                  const artifactType = args.artifactType || 'component';
                  return `Building your ${artifactType}...`;
                }
                case 'generate_image':
                  return 'Creating your image with AI...';
                case 'browser.search':
                  return 'Fetching search results...';
                default:
                  return `Executing ${toolCallForExecution.name}...`;
              }
            })();
            sendEvent({
              type: 'status_update',
              status: executionStatusMessage,
            });

            // Enhanced logging for premade card debugging
            logPremadeDebug(requestId, 'Tool execution started', {
              toolName: toolCallForExecution.name,
              toolCallId: toolCallForExecution.id,
              arguments: toolCallForExecution.arguments,
              context: {
                userId: toolContext.userId,
                isGuest: toolContext.isGuest,
                functionName: toolContext.functionName,
                hasSupabaseClient: !!toolContext.supabaseClient,
              },
            });

            const toolResult = await executeToolWithSecurity(toolCallForExecution, toolContext);

            // Enhanced logging for premade card debugging
            logPremadeDebug(requestId, 'Tool execution completed', {
              toolName: toolResult.toolName,
              success: toolResult.success,
              latencyMs: toolResult.latencyMs,
              error: toolResult.error,
              dataKeys: toolResult.data ? Object.keys(toolResult.data) : [],
            });

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

                    // Send completion status update
                    sendEvent({
                      type: 'status_update',
                      status: `Found ${tavilyResults.results.length} relevant sources`,
                    });
                  }
                  break;
                }

                case 'generate_artifact': {
                  // TODO: Implement streaming artifact generation with progress events
                  // Currently artifact generation happens in a single tool execution,
                  // but artifact-generator-structured.ts supports streaming with:
                  // - artifact_progress events (analyzing, thinking, generating, validating)
                  // - artifact_error events (with userFriendlyMessage, technicalError, retryable)
                  // These events should be forwarded through the SSE stream for better UX.

                  // Send artifact result to client
                  if (toolResult.data?.artifactCode) {
                    // Send completion status update
                    const artifactTitle = toolResult.data.artifactTitle || 'your component';
                    sendEvent({
                      type: 'status_update',
                      status: `Completed ${artifactTitle}`,
                    });

                    // Save artifact to database if we have a message ID and valid session
                    // Guest sessions don't have DB records, so generate client-side ID for them
                    let savedArtifactId: string | undefined;

                    if (isGuest) {
                      // GUEST MODE: Generate a content-based artifact ID for client-side rendering
                      // Guest artifacts are not persisted to DB (no session FK), but the frontend
                      // needs an ID to render the artifact card during streaming
                      const contentHash = await crypto.subtle.digest(
                        'SHA-256',
                        new TextEncoder().encode(toolResult.data.artifactCode || '')
                      );
                      const hashHex = Array.from(new Uint8Array(contentHash))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                      savedArtifactId = `guest-art-${hashHex.substring(0, 16)}`;
                      console.log(`${logPrefix} 🎭 Generated guest artifact ID: ${savedArtifactId} (not persisted)`);
                    } else if (assistantMessageId && serviceClient && sessionId) {
                      // AUTHENTICATED MODE: Persist to database
                      // CRITICAL: Create message stub first to satisfy FK constraint
                      // The frontend will update this message with full content after streaming
                      const stubResult = await saveMessageStub(
                        serviceClient,
                        assistantMessageId,
                        sessionId,
                        isGuest,
                        requestId
                      );

                      if (!stubResult.success) {
                        console.warn(`${logPrefix} ⚠️ Failed to create message stub: ${stubResult.error}`);
                        console.warn(`${logPrefix} ⚠️ Artifact save will likely fail due to FK constraint`);
                      }

                      // DEBUG: Log artifact before saving to DB
                      console.log(`${logPrefix} 💾 Saving artifact to DB:`, {
                        artifactContentLength: toolResult.data.artifactCode?.length ?? 0,
                        artifactContentPreview: toolResult.data.artifactCode?.substring(0, 100)
                      });

                      const saveResult = await saveArtifact(
                        serviceClient,
                        {
                          sessionId: sessionId, // REQUIRED for two-phase save
                          messageId: assistantMessageId, // Link to message (optional during streaming)
                          artifactType: toolResult.data.artifactType || 'react',
                          artifactTitle: toolResult.data.artifactTitle || 'Untitled Artifact',
                          artifactContent: toolResult.data.artifactCode,
                        },
                        requestId
                      );

                      if (saveResult.success) {
                        savedArtifactId = saveResult.artifactId;
                        console.log(`${logPrefix} 💾 Artifact saved to DB: ${savedArtifactId}`);
                      } else {
                        console.warn(`${logPrefix} ⚠️ Failed to save artifact to DB: ${saveResult.error}`);
                        // Continue anyway - artifact will still be sent to client
                      }
                    } else {
                      console.log(`${logPrefix} ℹ️ Skipping artifact DB save (no assistantMessageId, serviceClient, or sessionId)`);
                    }

                    sendEvent({
                      type: 'artifact_complete',
                      artifactCode: toolResult.data.artifactCode,
                      artifactType: toolResult.data.artifactType,
                      artifactTitle: toolResult.data.artifactTitle,
                      artifactId: savedArtifactId, // Include the saved artifact ID
                      persisted: !!savedArtifactId, // Indicates if artifact was durably stored in DB
                      reasoning: toolResult.data.artifactReasoning,
                      timestamp: Date.now(),
                      latencyMs: toolResult.latencyMs,
                    });
                    console.log(`${logPrefix} 📤 Sent artifact_complete event (type=${toolResult.data.artifactType}, artifactId=${savedArtifactId || 'not-saved'}, persisted=${!!savedArtifactId})`);
                  }
                  break;
                }

                case 'generate_image': {
                  // Send image result to client
                  if (toolResult.data?.imageUrl || toolResult.data?.imageData) {
                    // Send completion status update
                    sendEvent({
                      type: 'status_update',
                      status: 'Image created successfully',
                    });

                    // Generate artifact ID for image display
                    // For guests: Generate client-side ID since no DB persistence
                    // For authenticated: Use storage-based ID if available
                    let imageArtifactId: string | undefined;
                    if (isGuest) {
                      const imageContent = toolResult.data.imageUrl || toolResult.data.imageData || '';
                      const contentHash = await crypto.subtle.digest(
                        'SHA-256',
                        new TextEncoder().encode(imageContent.substring(0, 1000)) // Hash first 1KB for performance
                      );
                      const hashHex = Array.from(new Uint8Array(contentHash))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                      imageArtifactId = `guest-img-${hashHex.substring(0, 16)}`;
                      console.log(`${logPrefix} 🎭 Generated guest image artifact ID: ${imageArtifactId}`);
                    }

                    sendEvent({
                      type: 'image_complete',
                      imageUrl: toolResult.data.imageUrl,
                      imageData: toolResult.data.imageData,
                      storageSucceeded: toolResult.data.storageSucceeded,
                      degradedMode: toolResult.data.degradedMode,
                      artifactId: imageArtifactId, // Include artifact ID for frontend rendering
                      timestamp: Date.now(),
                      latencyMs: toolResult.latencyMs,
                    });
                    console.log(`${logPrefix} 📤 Sent image_complete event (storage=${toolResult.data.storageSucceeded}, artifactId=${imageArtifactId || 'none'})`);
                  }
                  break;
                }

                default:
                  console.log(`${logPrefix} ℹ️ No specific event for tool: ${toolResult.toolName}`);
              }
            }

            // Send accumulated reasoning to frontend for display (ALL response types)
            if (fullReasoningAccumulated) {
              sendEvent({
                type: 'reasoning_complete',
                reasoning: fullReasoningAccumulated,
                reasoningSteps: null, // ReasoningProvider generates semantic status updates instead
              });
              console.log(`${logPrefix} 📤 Sent reasoning_complete event (${fullReasoningAccumulated.length} chars)`);
            }

            // ========================================
            // STEP 4: Continue Gemini with tool results
            // ========================================
            if (toolResult.success) {
              // RFC-001: Use getToolResultContent which handles ALL tool types correctly
              // This fixes the bug where artifact/image tools fell back to "Tool execution failed"
              const resultContent = getToolResultContent(toolResult);

              console.log(
                `${logPrefix} 🔧 Continuing Gemini with tool result: ${toolResult.toolName} (${resultContent.length} chars)`
              );

              // Track continuation reasoning for context
              let continuationReasoningText = '';

              // BUG FIX (2025-12-20): Pass the assistant's tool_calls to the continuation
              // This ensures Gemini has the proper conversation context and returns a real response
              // instead of a blank response
              const previousAssistantToolCalls: ToolCall[] = detectedNativeToolCall ? [{
                id: detectedNativeToolCall.id,
                name: detectedNativeToolCall.function.name,
                arguments: JSON.parse(detectedNativeToolCall.function.arguments)
              }] : [];

              // BUG FIX (2025-12-21): Wrap Gemini continuation in a timeout as safety measure
              // If continuation hangs for 90s, ensure the stream completes rather than hanging indefinitely.
              const GEMINI_CONTINUATION_TIMEOUT_MS = 90000; // 90 seconds

              // Send continuation status update
              sendEvent({ type: 'status_update', status: 'Analyzing results and formulating response...' });

              const continuationResponse = await callGeminiWithToolResult(
                systemPrompt,
                userPrompt,
                toolCallForExecution,
                resultContent,  // FIX: Now works for all tool types!
                previousAssistantToolCalls,  // BUG FIX: Pass tool_calls for context!
                {
                  requestId,
                  userId: userId || undefined,
                  isGuest,
                  functionName: 'chat',
                  stream: true,
                  enableThinking: true,
                  tools: allTools,
                  toolChoice: convertToolChoice(currentToolChoice),
                }
              );

              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Gemini continuation timeout')), GEMINI_CONTINUATION_TIMEOUT_MS);
              });

              const continuationStreamPromise = (async () => {
                // Process continuation stream
                for await (const chunk of processGeminiStream(continuationResponse, requestId)) {
                  if (chunk.type === 'content') {
                    sendContentChunk(chunk.data);
                  } else if (chunk.type === 'reasoning') {
                    continuationReasoningText += chunk.data;
                    sendEvent({
                      type: 'reasoning_chunk',
                      chunk: chunk.data,
                    });
                  } else if (chunk.type === 'error') {
                    console.error(`${logPrefix} ❌ Continuation stream error:`, chunk.data);
                    sendSafeError(chunk.data, { stage: 'gemini-continuation' });
                  }
                }
                console.log(
                  `${logPrefix} ✅ Gemini continuation complete`
                );
              })();

              try {
                await Promise.race([continuationStreamPromise, timeoutPromise]);
              } catch (continuationError) {
                // Log the error but continue to [DONE] - don't let continuation issues block stream completion
                console.error(`${logPrefix} ❌ Gemini continuation failed/timeout:`, continuationError);
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

              // Enhanced logging for premade card debugging
              logPremadeDebug(requestId, 'Tool execution failure details', {
                toolName: toolResult.toolName,
                error: toolResult.error,
                latencyMs: toolResult.latencyMs,
                retryCount: toolResult.retryCount,
                willAutoFallback: allowAutoFallback && currentToolChoice !== 'auto',
                currentToolChoice,
                allowAutoFallback,
              });

              if (allowAutoFallback && currentToolChoice !== 'auto') {
                sendEvent({
                  type: 'warning',
                  message: 'Tool execution failed. Falling back to auto mode.',
                  timestamp: Date.now(),
                });
                await runToolCallingPass('auto', false, FALLBACK_NOTE);
                return;
              }

              // IMPROVED: Show specific error details to help user understand what went wrong
              const errorDetails = toolResult.error ? `: ${toolResult.error}` : '';
              const timeInfo = toolResult.latencyMs ? ` (after ${Math.round(toolResult.latencyMs / 1000)}s)` : '';
              sendContentChunk(
                `\n\n(Note: The requested tool failed${timeInfo}${errorDetails})\n\n`
              );
            }
          }
        };

        await runToolCallingPass(toolChoice, true);

        // ========================================
        // STEP 5: Hallucination Detection + Finalize stream
        // ========================================

        // Check tool execution tracker for hallucination detection
        // The executionTracker tracks all tool calls and their success/failure status
        const executionStats = executionTracker.getStats();
        const toolExecutions = executionStats.toolExecutions;
        const artifactToolCalled = toolExecutions.some(s => s.toolName === 'generate_artifact' && s.success);
        const imageToolCalled = toolExecutions.some(s => s.toolName === 'generate_image' && s.success);

        // Log tool execution summary for observability
        if (toolExecutions.length > 0) {
          console.log(`${logPrefix} 📊 Tool execution summary:`, toolExecutions.map(s => ({
            tool: s.toolName,
            success: s.success,
            durationMs: s.durationMs,
            error: s.error
          })));
        }

        // Note: Full content-based hallucination detection would require accumulating
        // streamed content. For now, we rely on the improved system prompt to prevent
        // hallucinations, and log tool execution metrics for monitoring.
        if (!artifactToolCalled && !imageToolCalled && toolExecutions.length === 0) {
          console.log(`${logPrefix} ℹ️ Response completed without tool calls (conversational response)`);
        }

        executionTracker.destroy();

        console.log(`${logPrefix} ✅ Tool-calling chat stream complete`);

        // Send [DONE] marker (OpenAI-compatible)
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        streamClosed = true;
        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(`${logPrefix} ❌ Tool-calling chat error:`, errorMessage);

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
        streamClosed = true;
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
