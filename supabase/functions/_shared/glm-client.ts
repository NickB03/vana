// deno-lint-ignore-file no-explicit-any
/**
 * GLM-4.6 API Client
 *
 * Dedicated client for Z.ai's GLM-4.6 model for artifact generation and fixing.
 * Uses OpenAI-compatible API format with thinking mode support.
 *
 * Key Features:
 * - OpenAI-compatible message format
 * - Built-in thinking/reasoning mode
 * - Automatic retry with exponential backoff
 * - Usage logging for admin dashboard
 * - Cost tracking and analytics
 *
 * API Documentation: https://docs.z.ai/guides/llm/glm-4.6
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { MODELS, RETRY_CONFIG } from './config.ts';
import { parseToolCall } from './glm-tool-parser.ts';

// GLM API configuration
const GLM_API_KEY = Deno.env.get("GLM_API_KEY");
const GLM_BASE_URL = "https://api.z.ai/api/coding/paas/v4";

// Validate GLM key
if (!GLM_API_KEY) {
  console.warn(
    "⚠️  GLM_API_KEY not configured - artifact generation will fail.\n" +
    "Get your key from: https://z.ai\n" +
    "Set it with: supabase secrets set GLM_API_KEY=your-key"
  );
}

export interface GLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string; // For tool result messages
  name?: string; // For tool result messages (tool name)
}

/**
 * Tool definition interface for GLM function calling
 * Based on OpenAI-compatible tools format
 */
export interface GLMToolDefinition {
  name: string;  // e.g., "browser.search"
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      default?: unknown;
    }>;
    required: string[];
  };
}

/**
 * Parsed tool call from GLM response
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CallGLMOptions {
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  userId?: string;
  isGuest?: boolean;
  functionName?: string;
  promptPreview?: string;
  enableThinking?: boolean;
  stream?: boolean; // Enable SSE streaming
  tools?: GLMToolDefinition[]; // Tool definitions for function calling
  toolResultContext?: string; // Injected tool results for continuation
}

export interface RetryResult {
  response: Response;
  retryCount: number;
}

/**
 * Default web search tool definition for GLM
 * Use when the AI needs current information, recent events, prices, news, etc.
 */
export const GLM_SEARCH_TOOL: GLMToolDefinition = {
  name: "browser.search",
  description: "Search the web for current information, recent events, prices, news, or any query requiring up-to-date data. Use when users ask about recent developments or real-time information.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to find relevant information"
      }
    },
    required: ["query"]
  }
};

/**
 * Build tool definition section for system prompt
 * Converts GLMToolDefinition[] into XML format that GLM expects
 *
 * @param tools - Array of tool definitions
 * @returns XML-formatted tool definitions to append to system prompt
 *
 * @example
 * ```typescript
 * const toolSection = buildToolSystemPromptSection([GLM_SEARCH_TOOL]);
 * const systemPrompt = basePrompt + "\n\n" + toolSection;
 * ```
 */
export function buildToolSystemPromptSection(tools: GLMToolDefinition[]): string {
  if (!tools || tools.length === 0) {
    return "";
  }

  const toolDefinitions = tools.map(tool => {
    const params = Object.entries(tool.parameters.properties)
      .map(([name, prop]) => {
        const required = tool.parameters.required.includes(name) ? " (required)" : "";
        const defaultVal = prop.default !== undefined ? ` [default: ${JSON.stringify(prop.default)}]` : "";
        return `  - ${name}: ${prop.type}${required}${defaultVal} - ${prop.description}`;
      })
      .join("\n");

    return `<tool name="${tool.name}">
  <description>${tool.description}</description>
  <parameters>
${params}
  </parameters>
</tool>`;
  }).join("\n\n");

  return `
## Available Tools

You have access to the following tools to assist users:

${toolDefinitions}

## Tool Usage Instructions

When you need to use a tool, output a tool call in this exact XML format:

<tool_call>
  <name>tool.name</name>
  <arguments>
    <arg_name>value</arg_name>
  </arguments>
</tool_call>

After calling a tool, WAIT for the tool result before continuing your response.
The tool result will be provided in a subsequent message, and you should then complete your answer using the information provided.

IMPORTANT: Only use tools when necessary to answer the user's question. Do not use tools for general conversation.`;
}

/**
 * Call GLM-4.6 for artifact generation or fixing
 * Uses OpenAI-compatible format with optional thinking mode
 *
 * @param systemPrompt - System instruction for the model
 * @param userPrompt - User's prompt or code to fix
 * @param options - Temperature, max tokens, request ID, thinking mode, tools
 * @returns Response object
 */
export async function callGLM(
  systemPrompt: string,
  userPrompt: string,
  options?: CallGLMOptions
): Promise<Response> {
  const {
    temperature = 1.0, // GLM recommends 1.0 for general evaluations
    max_tokens = 8000,
    requestId = crypto.randomUUID(),
    enableThinking = true, // Enable reasoning by default for artifact generation
    stream = false, // Streaming disabled by default for backward compatibility
    tools,
    toolResultContext
  } = options || {};

  if (!GLM_API_KEY) {
    throw new Error("GLM_API_KEY not configured");
  }

  // Enhance system prompt with tool definitions if tools provided
  let enhancedSystemPrompt = systemPrompt;
  if (tools && tools.length > 0) {
    const toolSection = buildToolSystemPromptSection(tools);
    enhancedSystemPrompt = systemPrompt + "\n\n" + toolSection;
    console.log(`[${requestId}] 🔧 Tools enabled: ${tools.map(t => t.name).join(", ")}`);
  }

  // Build messages array
  const messages: GLMMessage[] = [
    { role: "system", content: enhancedSystemPrompt },
    { role: "user", content: userPrompt }
  ];

  // If tool result context is provided, inject it as a tool message
  if (toolResultContext) {
    messages.push({
      role: "tool",
      content: toolResultContext
    });
    console.log(`[${requestId}] 🔧 Tool result context injected (${toolResultContext.length} chars)`);
  }

  console.log(`[${requestId}] 🤖 Routing to GLM-4.6 via Z.ai API (thinking: ${enableThinking}, stream: ${stream})`);

  const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GLM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      // Extract model name from "provider/model-name" format
      model: MODELS.GLM_4_6.split('/').pop(),
      messages,
      temperature,
      max_tokens,
      stream, // Enable SSE streaming when requested
      // GLM-specific: thinking mode for reasoning
      thinking: enableThinking ? { type: "enabled" } : { type: "disabled" }
    })
  });

  return response;
}

/**
 * Call GLM with exponential backoff retry logic
 * Handles transient failures gracefully
 *
 * @param systemPrompt - System instruction
 * @param userPrompt - User prompt
 * @param options - Configuration options
 * @param retryCount - Current retry attempt (internal)
 * @returns Response object
 */
export async function callGLMWithRetry(
  systemPrompt: string,
  userPrompt: string,
  options?: CallGLMOptions,
  retryCount = 0
): Promise<Response> {
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    const response = await callGLM(systemPrompt, userPrompt, {
      ...options,
      requestId
    });

    if (response.ok) {
      return response;
    }

    // Handle rate limiting (429) and service overload (503) with exponential backoff
    if (response.status === 429 || response.status === 503) {
      if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
        // CRITICAL: Drain response body to prevent resource leak
        await response.text();

        const delayMs = Math.min(
          RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
          RETRY_CONFIG.MAX_DELAY_MS
        );

        const retryAfter = response.headers.get('Retry-After');
        const actualDelayMs = retryAfter ? parseInt(retryAfter) * 1000 : delayMs;

        const errorType = response.status === 429 ? "Rate limited" : "Service overloaded";
        console.log(`[${requestId}] ${errorType} (${response.status}). Retry ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES} after ${actualDelayMs}ms`);

        await new Promise(resolve => setTimeout(resolve, actualDelayMs));

        return callGLMWithRetry(systemPrompt, userPrompt, options, retryCount + 1);
      } else {
        console.error(`[${requestId}] Max retries exceeded (status: ${response.status})`);
      }
    }

    return response;
  } catch (error) {
    if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delayMs = Math.min(
        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS
      );
      console.log(`[${requestId}] Network error, retrying after ${delayMs}ms:`, error);

      await new Promise(resolve => setTimeout(resolve, delayMs));

      return callGLMWithRetry(systemPrompt, userPrompt, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Call GLM with retry tracking - returns both response and retry count
 * Use this when you need to log the actual number of retries that occurred
 *
 * @param systemPrompt - System instruction
 * @param userPrompt - User prompt
 * @param options - Configuration options
 * @returns Object with response and retryCount
 */
export async function callGLMWithRetryTracking(
  systemPrompt: string,
  userPrompt: string,
  options?: CallGLMOptions
): Promise<RetryResult> {
  const requestId = options?.requestId || crypto.randomUUID();

  async function attemptWithRetry(retryCount = 0): Promise<RetryResult> {
    try {
      const response = await callGLM(systemPrompt, userPrompt, {
        ...options,
        requestId
      });

      if (response.ok) {
        return { response, retryCount };
      }

      // Handle rate limiting (429) and service overload (503) with exponential backoff
      if (response.status === 429 || response.status === 503) {
        if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
          await response.text();

          const delayMs = Math.min(
            RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
            RETRY_CONFIG.MAX_DELAY_MS
          );

          const retryAfter = response.headers.get('Retry-After');
          const actualDelayMs = retryAfter ? parseInt(retryAfter) * 1000 : delayMs;

          const errorType = response.status === 429 ? "Rate limited" : "Service overloaded";
          console.log(`[${requestId}] ${errorType} (${response.status}). Retry ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES} after ${actualDelayMs}ms`);

          await new Promise(resolve => setTimeout(resolve, actualDelayMs));

          return attemptWithRetry(retryCount + 1);
        } else {
          console.error(`[${requestId}] Max retries exceeded (status: ${response.status})`);
        }
      }

      return { response, retryCount };
    } catch (error) {
      if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
        const delayMs = Math.min(
          RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
          RETRY_CONFIG.MAX_DELAY_MS
        );
        console.log(`[${requestId}] Network error, retrying after ${delayMs}ms:`, error);

        await new Promise(resolve => setTimeout(resolve, delayMs));

        return attemptWithRetry(retryCount + 1);
      }

      throw error;
    }
  }

  return attemptWithRetry(0);
}

/**
 * Extract text from GLM response (OpenAI-compatible format)
 * Handles both regular and thinking mode responses
 *
 * @param responseData - JSON response from GLM API
 * @param requestId - Optional request ID for logging
 * @returns Extracted text content
 */
export function extractTextFromGLM(responseData: any, requestId?: string): string {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // OpenAI-compatible format: choices[0].message.content
  if (responseData?.choices?.[0]?.message?.content) {
    const text = responseData.choices[0].message.content;
    const finishReason = responseData.choices[0].finish_reason;

    // Log if there was reasoning content (thinking mode)
    const reasoningContent = responseData.choices[0].message.reasoning_content;
    if (reasoningContent) {
      console.log(`${logPrefix} 🧠 GLM reasoning used: ${reasoningContent.length} chars`);
    }

    console.log(`${logPrefix} ✅ Extracted artifact from GLM-4.6, length: ${text.length} characters (finish_reason: ${finishReason})`);
    return text;
  }

  // Error case - log the structure for debugging
  const finishReason = responseData?.choices?.[0]?.finish_reason;
  console.error(
    `${logPrefix} ❌ Failed to extract text from GLM response (finish_reason: ${finishReason}):`,
    JSON.stringify(responseData).substring(0, 200)
  );
  return "";
}

/**
 * Extract both text content and reasoning from GLM response
 * Returns both the artifact content and the thinking/reasoning process
 *
 * This is the proper long-term solution for GLM reasoning extraction.
 * Use this when you need to store or display the reasoning process separately.
 *
 * @param responseData - JSON response from GLM API
 * @param requestId - Optional request ID for logging
 * @returns Object with text content and reasoning content (null if not present)
 *
 * @example
 * ```typescript
 * const { text, reasoning } = extractTextAndReasoningFromGLM(responseData, requestId);
 * // text: The artifact code/content
 * // reasoning: The thinking process (if thinking mode was enabled)
 * ```
 */
export function extractTextAndReasoningFromGLM(
  responseData: any,
  requestId?: string
): { text: string; reasoning: string | null } {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // OpenAI-compatible format: choices[0].message.content and reasoning_content
  if (responseData?.choices?.[0]?.message?.content) {
    const text = responseData.choices[0].message.content;
    const reasoning = responseData.choices[0].message.reasoning_content || null;
    const finishReason = responseData.choices[0].finish_reason;

    // Log extraction details
    if (reasoning) {
      console.log(
        `${logPrefix} 🧠 GLM reasoning extracted: ${reasoning.length} chars | ` +
        `Content: ${text.length} chars (finish_reason: ${finishReason})`
      );
    } else {
      console.log(
        `${logPrefix} ✅ Extracted artifact from GLM-4.6: ${text.length} chars | ` +
        `No reasoning content (finish_reason: ${finishReason})`
      );
    }

    return { text, reasoning };
  }

  // Error case - log the structure for debugging
  const finishReason = responseData?.choices?.[0]?.finish_reason;
  console.error(
    `${logPrefix} ❌ Failed to extract text/reasoning from GLM response (finish_reason: ${finishReason}):`,
    JSON.stringify(responseData).substring(0, 200)
  );

  return { text: "", reasoning: null };
}

/**
 * Extract token usage from GLM response for cost tracking
 *
 * @param responseData - JSON response from GLM API
 * @returns Object with input/output token counts
 */
export function extractGLMTokenUsage(responseData: any): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  const usage = responseData?.usage || {};
  return {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0
  };
}

/**
 * Calculate cost for a GLM-4.6 API call
 * Pricing: Based on Z.ai Coding Plan pricing
 * Note: Adjust these values based on actual Z.ai pricing
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateGLMCost(inputTokens: number, outputTokens: number): number {
  // Z.ai Coding Plan pricing (estimate - adjust based on actual pricing)
  // GLM-4.6 is competitive with other frontier models
  const INPUT_COST_PER_M = 0.10;  // $0.10 per 1M input tokens (estimate)
  const OUTPUT_COST_PER_M = 0.30; // $0.30 per 1M output tokens (estimate)

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;

  return inputCost + outputCost;
}

/**
 * Log GLM AI usage to database for admin dashboard analytics
 * Fire-and-forget logging - doesn't block the response
 *
 * @param logData - Usage data to log
 */
export async function logGLMUsage(logData: {
  requestId: string;
  functionName: string;
  provider: string;
  model: string;
  userId?: string;
  isGuest: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  estimatedCost: number;
  errorMessage?: string;
  retryCount: number;
  promptPreview?: string;
  responseLength?: number;
}): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error } = await supabase.from("ai_usage_logs").insert({
      request_id: logData.requestId,
      function_name: logData.functionName,
      provider: logData.provider,
      model: logData.model,
      user_id: logData.userId || null,
      is_guest: logData.isGuest,
      input_tokens: logData.inputTokens,
      output_tokens: logData.outputTokens,
      total_tokens: logData.totalTokens,
      latency_ms: logData.latencyMs,
      status_code: logData.statusCode,
      estimated_cost: logData.estimatedCost,
      error_message: logData.errorMessage || null,
      retry_count: logData.retryCount,
      prompt_preview: logData.promptPreview?.substring(0, 200) || null,
      response_length: logData.responseLength || null
    });

    if (error) {
      console.error(`[${logData.requestId}] Failed to log GLM usage:`, error);
    } else {
      console.log(`[${logData.requestId}] 📊 GLM usage logged to database`);
    }
  } catch (error) {
    console.error(`[${logData.requestId}] Exception logging GLM usage:`, error);
  }
}

/**
 * Parse [STATUS: ...] markers from GLM reasoning text
 *
 * GLM emits status markers during thinking like [STATUS: analyzing requirements]
 * to indicate current action. These are parsed and sent as SSE events to the frontend.
 *
 * If multiple markers exist, returns the LAST one (most recent status).
 *
 * @param text - The reasoning text to parse (can be partial/accumulated)
 * @returns The status text (trimmed) or null if no complete marker found
 *
 * @example
 * parseStatusMarker("[STATUS: analyzing code]") // "analyzing code"
 * parseStatusMarker("thinking... [STATUS: ") // null (incomplete)
 * parseStatusMarker("no status here") // null
 * parseStatusMarker("[STATUS: start] ... [STATUS: finish]") // "finish" (last marker)
 */
export function parseStatusMarker(text: string): string | null {
  // Match all [STATUS: ...] patterns - must have closing bracket
  const statusPattern = /\[STATUS:\s*([^\]]+)\]/g;
  const matches = Array.from(text.matchAll(statusPattern));

  if (matches.length > 0) {
    // Return the LAST match (most recent status)
    const lastMatch = matches[matches.length - 1];
    return lastMatch[1].trim();
  }

  return null;
}

/**
 * Callback type for streaming GLM responses
 *
 * NOTE: Callbacks can be async - processGLMStream will await them.
 * This is critical for SSE streaming where sendEvent() must complete
 * before processing the next chunk.
 */
export interface GLMStreamCallbacks {
  onReasoningChunk?: (chunk: string) => void | Promise<void>;
  onContentChunk?: (chunk: string) => void | Promise<void>;
  onComplete?: (fullReasoning: string, fullContent: string) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onToolCallDetected?: (toolCall: ToolCall) => void | Promise<void>;
}

// Re-export parseToolCall from glm-tool-parser for backward compatibility
export { parseToolCall } from './glm-tool-parser.ts';

/**
 * Process a streaming GLM response (SSE format)
 *
 * GLM streams reasoning_content FIRST (the thinking process),
 * then content (the actual response/artifact).
 *
 * @param response - Streaming Response from GLM API
 * @param callbacks - Callbacks for handling streaming chunks
 * @param requestId - Request ID for logging
 * @returns Promise that resolves when stream completes
 */
export async function processGLMStream(
  response: Response,
  callbacks: GLMStreamCallbacks,
  requestId?: string
): Promise<{ reasoning: string; content: string }> {
  const logPrefix = requestId ? `[${requestId}]` : "";

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReasoning = "";
  let fullContent = "";

  try {
    // Labeled loop to allow breaking out of both loops when [DONE] is received
    readLoop: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from buffer
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        // Skip empty lines and comments
        if (!line || line.startsWith(":")) continue;

        // Parse SSE data line
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);

          // Check for stream end marker
          if (jsonStr === "[DONE]") {
            console.log(`${logPrefix} 🏁 GLM stream complete`);
            break readLoop; // CRITICAL: Break outer loop, not just inner buffer loop
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed?.choices?.[0]?.delta;

            if (delta) {
              // GLM streams reasoning_content first, then content
              // CRITICAL: Await callbacks to ensure SSE events are sent before continuing
              if (delta.reasoning_content) {
                fullReasoning += delta.reasoning_content;
                await callbacks.onReasoningChunk?.(delta.reasoning_content);
              }

              if (delta.content) {
                fullContent += delta.content;
                await callbacks.onContentChunk?.(delta.content);
              }
            }
          } catch (parseError) {
            // Non-JSON line, skip
            console.warn(`${logPrefix} Failed to parse SSE chunk:`, parseError);
          }
        }
      }
    }

    console.log(`${logPrefix} ✅ Stream processed: reasoning=${fullReasoning.length} chars, content=${fullContent.length} chars`);
    await callbacks.onComplete?.(fullReasoning, fullContent);

    return { reasoning: fullReasoning, content: fullContent };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`${logPrefix} ❌ Stream error:`, err);
    await callbacks.onError?.(err);
    throw err;
  }
}

/**
 * Process a streaming GLM response with tool call detection
 * Buffers content to detect <tool_call> tags and invokes callback when found
 *
 * This wraps processGLMStream with additional tool detection logic.
 * When a tool call is detected, the onToolCallDetected callback is invoked,
 * and the stream completes with toolCallDetected flag set.
 *
 * @param response - Streaming Response from GLM API
 * @param callbacks - Callbacks for handling streaming chunks and tool calls
 * @param requestId - Request ID for logging
 * @returns Promise with reasoning, content, and optional tool call
 *
 * @example
 * ```typescript
 * const result = await processGLMStreamWithToolDetection(response, {
 *   onReasoningChunk: (chunk) => console.log("Thinking:", chunk),
 *   onContentChunk: (chunk) => console.log("Response:", chunk),
 *   onToolCallDetected: async (toolCall) => {
 *     // Execute tool and call GLM again with results
 *     const toolResult = await executeTool(toolCall);
 *     // ... continue conversation
 *   }
 * }, requestId);
 * ```
 */
export async function processGLMStreamWithToolDetection(
  response: Response,
  callbacks: GLMStreamCallbacks,
  requestId?: string
): Promise<{ reasoning: string; content: string; toolCall?: ToolCall }> {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // Wrap callbacks to buffer content and detect tool calls
  let contentBuffer = "";
  let toolCallDetected = false;

  const wrappedCallbacks: GLMStreamCallbacks = {
    ...callbacks,
    onContentChunk: async (chunk: string) => {
      contentBuffer += chunk;

      // Check for complete tool call in buffer
      if (!toolCallDetected && contentBuffer.includes("</tool_call>")) {
        const toolCall = parseToolCall(contentBuffer);
        if (toolCall) {
          toolCallDetected = true;
          console.log(`${logPrefix} 🔧 Tool call detected: ${toolCall.name} with args:`, toolCall.arguments);
          await callbacks.onToolCallDetected?.(toolCall);
        }
      }

      // Pass through to original callback
      await callbacks.onContentChunk?.(chunk);
    }
  };

  // Process stream with wrapped callbacks
  const result = await processGLMStream(response, wrappedCallbacks, requestId);

  // Check for tool call one final time in complete content
  let toolCall: ToolCall | undefined;
  if (contentBuffer.includes("</tool_call>")) {
    const parsed = parseToolCall(contentBuffer);
    if (parsed) {
      toolCall = parsed;
      console.log(`${logPrefix} 🔧 Final tool call parsed: ${toolCall.name}`);
    }
  }

  return {
    ...result,
    toolCall
  };
}

/**
 * Continue GLM conversation after tool execution
 * Injects tool results and resumes streaming for final response
 *
 * @param originalSystemPrompt - Original system prompt (without tool definitions)
 * @param originalUserPrompt - Original user prompt
 * @param toolCall - The tool call that was executed
 * @param toolResult - The result from tool execution
 * @param callbacks - Callbacks for handling streaming chunks
 * @param options - Call options (temperature, requestId, etc.)
 * @returns Promise with reasoning and final content
 *
 * @example
 * ```typescript
 * // After detecting tool call and executing it:
 * const searchResults = await executeSearch(toolCall.arguments.query);
 * const toolResultText = formatSearchResults(searchResults);
 *
 * const finalResponse = await callGLMWithToolResult(
 *   systemPrompt,
 *   userPrompt,
 *   toolCall,
 *   toolResultText,
 *   { onContentChunk: (chunk) => streamToClient(chunk) },
 *   { requestId, stream: true, tools: [GLM_SEARCH_TOOL] }
 * );
 * ```
 */
export async function callGLMWithToolResult(
  originalSystemPrompt: string,
  originalUserPrompt: string,
  toolCall: ToolCall,
  toolResult: string,
  callbacks: GLMStreamCallbacks,
  options?: CallGLMOptions
): Promise<{ reasoning: string; content: string }> {
  const requestId = options?.requestId || crypto.randomUUID();
  const logPrefix = `[${requestId}]`;

  // Format tool result as XML for context
  const toolResultContext = `
<tool_result>
  <tool_call_id>${toolCall.id}</tool_call_id>
  <name>${toolCall.name}</name>
  <status>success</status>
  <result>
${toolResult}
  </result>
</tool_result>

Use the above tool result to answer the user's original question. Provide a complete, helpful response based on this information.`;

  console.log(`${logPrefix} 🔧 Continuing with tool result (${toolResult.length} chars)`);

  // Call GLM with tool result context
  const response = await callGLMWithRetry(
    originalSystemPrompt,
    originalUserPrompt,
    {
      ...options,
      requestId,
      stream: true, // Always stream for tool continuations
      toolResultContext
    }
  );

  if (!response.ok) {
    throw new Error(`GLM API error: ${response.status} ${response.statusText}`);
  }

  // Process the streaming response
  return await processGLMStream(response, callbacks, requestId);
}

/**
 * Handle GLM API errors with appropriate responses
 *
 * @param response - Failed Response object
 * @param requestId - Request ID for tracking
 * @param corsHeaders - CORS headers to include
 * @returns Formatted error Response
 */
export async function handleGLMError(
  response: Response,
  requestId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const status = response.status;
  let errorText = "";

  try {
    errorText = await response.text();
  } catch {
    errorText = "Unable to read error response";
  }

  console.error(`[${requestId}] GLM API error (${status}):`, errorText.substring(0, 200));

  // Rate limit exceeded
  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    return new Response(
      JSON.stringify({
        error: "GLM API rate limit exceeded. Please try again later.",
        rateLimitExceeded: true,
        retryAfter: parseInt(retryAfter),
        requestId
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": retryAfter,
          "X-Request-ID": requestId
        }
      }
    );
  }

  // Service unavailable
  if (status === 503) {
    return new Response(
      JSON.stringify({
        error: "GLM service temporarily unavailable. Please try again.",
        retryable: true,
        requestId
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        }
      }
    );
  }

  // Unauthorized (bad API key)
  if (status === 401) {
    return new Response(
      JSON.stringify({
        error: "GLM API authentication failed. Please check API key configuration.",
        requestId
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        }
      }
    );
  }

  // Generic error
  return new Response(
    JSON.stringify({
      error: "Failed to generate artifact. Please try again.",
      details: errorText.substring(0, 100),
      requestId
    }),
    {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Request-ID": requestId
      }
    }
  );
}
