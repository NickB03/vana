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
import { MODELS, RETRY_CONFIG, GLM_CONFIG, getSearchRecencyPhrase } from './config.ts';
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
  timeoutMs?: number; // Request timeout in milliseconds (default: 60000 for non-streaming, 120000 for streaming)
}

export interface RetryResult {
  response: Response;
  retryCount: number;
}

/**
 * Default web search tool definition for GLM
 *
 * This is the primary tool for web search via Tavily API.
 * The description is carefully crafted to guide the LLM on when to search.
 */
export const GLM_SEARCH_TOOL: GLMToolDefinition = {
  name: "browser.search",
  // SIMPLIFIED: Long multi-line descriptions inside XML tags caused GLM to truncate tool calls
  // Keep description concise and single-line to ensure reliable tool call generation
  description: `Search the web for current information (${getSearchRecencyPhrase()}). Use for: recent news, real-time data (weather, stocks, sports), current prices, latest versions. Do NOT use for: general knowledge, historical facts, how-to guides, math problems.`,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Optimized search query with year for time-sensitive topics"
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

When you need to use a tool, you MUST output a COMPLETE tool call with ALL tags:

<tool_call>
<name>tool.name</name>
<arguments>
<arg_name>value</arg_name>
</arguments>
</tool_call>

CRITICAL: You MUST include the closing </tool_call> tag. Without it, the tool will not execute.

Example of a COMPLETE browser.search tool call:
<tool_call>
<name>browser.search</name>
<arguments>
<query>your search query here</query>
</arguments>
</tool_call>

After calling a tool, WAIT for the tool result before continuing your response.`;
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
    toolResultContext,
    timeoutMs
  } = options || {};

  if (!GLM_API_KEY) {
    throw new Error("GLM_API_KEY not configured");
  }

  // NOTE: Native function calling is used - tools are passed in the request body, not the system prompt
  if (tools && tools.length > 0) {
    console.log(`[${requestId}] 🔧 Tools enabled: ${tools.map(t => t.name).join(", ")}`);
  }

  // Build messages array
  const messages: GLMMessage[] = [
    { role: "system", content: systemPrompt },
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

  // Create AbortController for timeout protection
  // Streaming requests get longer timeout since they need to process full response
  const defaultTimeout = stream ? GLM_CONFIG.STREAM_TIMEOUT_MS : GLM_CONFIG.REQUEST_TIMEOUT_MS;
  const timeout = timeoutMs || defaultTimeout;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[${requestId}] ⏱️ GLM request timeout after ${timeout}ms - aborting`);
    controller.abort();
  }, timeout);

  try {
    // Build request body
    const requestBody: Record<string, unknown> = {
      // Extract model name from "provider/model-name" format
      model: MODELS.GLM_4_6.split('/').pop(),
      messages,
      temperature,
      max_tokens,
      stream, // Enable SSE streaming when requested
      // GLM-specific: thinking mode for reasoning
      thinking: enableThinking ? { type: "enabled" } : { type: "disabled" }
    };

    // Add native function calling if tools provided
    // GLM supports OpenAI-compatible tools format
    if (tools && tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      requestBody.tool_choice = "auto";
      console.log(`[${requestId}] 🔧 Native function calling enabled with ${tools.length} tools`);
    }

    const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
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
 * Native tool call from GLM (OpenAI-compatible format)
 */
export interface NativeToolCall {
  id: string;
  function: {
    name: string;
    arguments: string; // JSON string
  };
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
  /** Called when native tool call is detected (OpenAI-compatible format) */
  onNativeToolCall?: (toolCall: NativeToolCall) => void | Promise<void>;
}

// Re-export parseToolCall from glm-tool-parser for backward compatibility
export { parseToolCall } from './glm-tool-parser.ts';

/**
 * Read with timeout - wraps reader.read() with a timeout promise
 * Returns null if timeout occurs, signaling stream stall
 */
async function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array> | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([reader.read(), timeoutPromise]);
  } finally {
    // Always clear timeout, even if reader.read() throws
    clearTimeout(timeoutId);
  }
}

/**
 * Process a streaming GLM response (SSE format)
 *
 * GLM streams reasoning_content FIRST (the thinking process),
 * then content (the actual response/artifact).
 *
 * @param response - Streaming Response from GLM API
 * @param callbacks - Callbacks for handling streaming chunks
 * @param requestId - Request ID for logging
 * @param chunkTimeoutMs - Timeout between chunks (default: from GLM_CONFIG.CHUNK_TIMEOUT_MS) - if no data arrives within this time, stream is considered stalled
 * @returns Promise that resolves when stream completes
 */
export async function processGLMStream(
  response: Response,
  callbacks: GLMStreamCallbacks,
  requestId?: string,
  chunkTimeoutMs = GLM_CONFIG.CHUNK_TIMEOUT_MS
): Promise<{ reasoning: string; content: string; finishReason?: string; nativeToolCalls?: NativeToolCall[] }> {
  const logPrefix = requestId ? `[${requestId}]` : "";

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReasoning = "";
  let fullContent = "";
  let finishReason: string | undefined;

  // Native tool call accumulation (OpenAI-compatible streaming format)
  // Tool calls come in chunks with: id, function.name, then incremental function.arguments
  const toolCallAccumulators: Map<number, { id: string; name: string; arguments: string }> = new Map();

  try {
    // Labeled loop to allow breaking out of both loops when [DONE] is received
    readLoop: while (true) {
      // Use timeout-protected read to prevent infinite hangs
      const result = await readWithTimeout(reader, chunkTimeoutMs);

      // Timeout occurred - stream stalled
      if (result === null) {
        const err = new Error(`Stream stalled - no data received in ${chunkTimeoutMs}ms`);
        console.error(`${logPrefix} ⏱️ ${err.message}`);
        await callbacks.onError?.(err);
        // Cancel the reader to clean up resources
        await reader.cancel();
        throw err;
      }

      const { done, value } = result;
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
            const chunkFinishReason = parsed?.choices?.[0]?.finish_reason;

            // Capture finish_reason when present (usually in final chunk)
            if (chunkFinishReason) {
              finishReason = chunkFinishReason;
              console.log(`${logPrefix} 📊 Stream finish_reason: ${finishReason}`);
            }

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

              // Handle native tool_calls (OpenAI-compatible streaming format)
              // Tool calls stream incrementally: first chunk has id + name, subsequent chunks have arguments
              if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                for (const toolCallDelta of delta.tool_calls) {
                  const index = toolCallDelta.index ?? 0;

                  // Get or create accumulator for this tool call
                  if (!toolCallAccumulators.has(index)) {
                    toolCallAccumulators.set(index, { id: '', name: '', arguments: '' });
                  }
                  const accumulator = toolCallAccumulators.get(index)!;

                  // Accumulate id (usually in first chunk)
                  if (toolCallDelta.id) {
                    accumulator.id = toolCallDelta.id;
                  }

                  // Accumulate function name (usually in first chunk)
                  if (toolCallDelta.function?.name) {
                    accumulator.name = toolCallDelta.function.name;
                    console.log(`${logPrefix} 🔧 Native tool call detected: ${accumulator.name}`);
                  }

                  // Accumulate function arguments (streams incrementally)
                  if (toolCallDelta.function?.arguments) {
                    accumulator.arguments += toolCallDelta.function.arguments;
                  }
                }
              }
            }
          } catch (parseError) {
            // Non-JSON line, skip
            console.warn(`${logPrefix} Failed to parse SSE chunk:`, parseError);
          }
        }
      }
    }

    // Convert accumulated tool calls to NativeToolCall array
    const nativeToolCalls: NativeToolCall[] = [];
    for (const [, accumulator] of toolCallAccumulators) {
      if (accumulator.id && accumulator.name) {
        const toolCall: NativeToolCall = {
          id: accumulator.id,
          function: {
            name: accumulator.name,
            arguments: accumulator.arguments
          }
        };
        nativeToolCalls.push(toolCall);

        // Invoke callback for each detected tool call
        console.log(`${logPrefix} 🔧 Native tool call complete: ${toolCall.function.name}(${toolCall.function.arguments})`);
        await callbacks.onNativeToolCall?.(toolCall);
      }
    }

    console.log(`${logPrefix} ✅ Stream processed: reasoning=${fullReasoning.length} chars, content=${fullContent.length} chars, finish_reason=${finishReason || 'none'}, tool_calls=${nativeToolCalls.length}`);
    await callbacks.onComplete?.(fullReasoning, fullContent);

    return {
      reasoning: fullReasoning,
      content: fullContent,
      finishReason,
      nativeToolCalls: nativeToolCalls.length > 0 ? nativeToolCalls : undefined
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`${logPrefix} ❌ Stream error:`, err);
    await callbacks.onError?.(err);
    throw err;
  }
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
