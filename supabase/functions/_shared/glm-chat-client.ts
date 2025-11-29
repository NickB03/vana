// deno-lint-ignore-file no-explicit-any
/**
 * GLM-4.6 Chat API Client
 *
 * Dedicated client for Z.ai's GLM-4.6 model for streaming chat responses.
 * Uses OpenAI-compatible API format with thinking mode support.
 *
 * Key Features:
 * - OpenAI-compatible message format
 * - Built-in thinking/reasoning mode
 * - SSE streaming for real-time responses
 * - Automatic retry with exponential backoff
 * - Timeout handling with AbortController
 * - Comprehensive error handling
 *
 * API Documentation: https://docs.z.ai/guides/llm/glm-4.6
 *
 * Streaming Behavior:
 * GLM streams `reasoning_content` FIRST (thinking process),
 * then `content` (actual chat response).
 */

import { MODELS, RETRY_CONFIG } from './config.ts';

// GLM API configuration
const GLM_API_KEY = Deno.env.get("GLM_API_KEY");
const GLM_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
const DEFAULT_TIMEOUT_MS = 30000; // 30 second timeout for chat requests

// Validate GLM key
if (!GLM_API_KEY) {
  console.warn(
    "⚠️  GLM_API_KEY not configured - chat will fail.\n" +
    "Get your key from: https://z.ai\n" +
    "Set it with: supabase secrets set GLM_API_KEY=your-key"
  );
}

/**
 * Message format for GLM chat API (OpenAI-compatible)
 */
export interface GLMChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Configuration options for GLM chat requests
 */
export interface GLMChatOptions {
  /** Temperature for response randomness (0-2, default: 1.0) */
  temperature?: number;
  /** Maximum tokens in the response */
  max_tokens?: number;
  /** Request ID for logging and tracking */
  requestId?: string;
  /** Enable SSE streaming (default: true) */
  stream?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable thinking mode for reasoning (default: false for chat) */
  enableThinking?: boolean;
}

/**
 * Custom error class for GLM chat API errors
 */
export class GLMChatError extends Error {
  public statusCode: number;
  public requestId?: string;
  public retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    requestId?: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = "GLMChatError";
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.retryable = retryable;
  }
}

/**
 * Call GLM-4.6 for streaming chat responses
 * Uses OpenAI-compatible format with optional thinking mode
 *
 * @param messages - Array of conversation messages
 * @param options - Configuration options
 * @returns Response object with streaming body
 *
 * @example
 * ```typescript
 * const response = await callGLMChat([
 *   { role: "system", content: "You are a helpful assistant." },
 *   { role: "user", content: "What is React?" }
 * ], {
 *   temperature: 0.7,
 *   stream: true,
 *   requestId: "req-123"
 * });
 *
 * // Stream the response
 * const reader = response.body.getReader();
 * const decoder = new TextDecoder();
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *   console.log(decoder.decode(value));
 * }
 * ```
 */
export async function callGLMChat(
  messages: GLMChatMessage[],
  options?: GLMChatOptions
): Promise<Response> {
  const {
    temperature = 1.0, // GLM recommends 1.0 for general evaluations
    max_tokens = 8000,
    requestId = crypto.randomUUID(),
    stream = true,
    timeout = DEFAULT_TIMEOUT_MS,
    enableThinking = false // Thinking disabled by default for chat
  } = options || {};

  if (!GLM_API_KEY) {
    throw new GLMChatError(
      "GLM_API_KEY not configured",
      500,
      requestId,
      false
    );
  }

  console.log(
    `[${requestId}] 🤖 Routing to GLM-4.6 chat via Z.ai API ` +
    `(thinking: ${enableThinking}, stream: ${stream}, timeout: ${timeout}ms)`
  );

  // Create AbortController for timeout handling
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  try {
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
        stream,
        // GLM-specific: thinking mode for reasoning
        thinking: enableThinking ? { type: "enabled" } : { type: "disabled" }
      }),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[${requestId}] Request timeout after ${timeout}ms`);
      throw new GLMChatError(
        `Request timeout after ${timeout}ms`,
        408,
        requestId,
        true
      );
    }

    // Handle network errors
    console.error(`[${requestId}] Network error calling GLM chat:`, error);
    throw new GLMChatError(
      error instanceof Error ? error.message : "Network error",
      500,
      requestId,
      true
    );
  }
}

/**
 * Call GLM chat with exponential backoff retry logic
 * Handles transient failures gracefully
 *
 * @param messages - Array of conversation messages
 * @param options - Configuration options
 * @param retryCount - Current retry attempt (internal, do not set)
 * @returns Response object
 *
 * @example
 * ```typescript
 * const response = await callGLMChatWithRetry([
 *   { role: "user", content: "Hello!" }
 * ], {
 *   temperature: 0.7,
 *   requestId: "req-456"
 * });
 * ```
 */
export async function callGLMChatWithRetry(
  messages: GLMChatMessage[],
  options?: GLMChatOptions,
  retryCount = 0
): Promise<Response> {
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    const response = await callGLMChat(messages, {
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
        console.log(
          `[${requestId}] ${errorType} (${response.status}). ` +
          `Retry ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES} after ${actualDelayMs}ms`
        );

        await new Promise(resolve => setTimeout(resolve, actualDelayMs));

        return callGLMChatWithRetry(messages, options, retryCount + 1);
      } else {
        console.error(`[${requestId}] Max retries exceeded (status: ${response.status})`);
      }
    }

    return response;
  } catch (error) {
    // Retry on network errors and timeouts
    if (error instanceof GLMChatError && error.retryable && retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delayMs = Math.min(
        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS
      );
      console.log(
        `[${requestId}] Retryable error (${error.message}), ` +
        `retrying after ${delayMs}ms (${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES})`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));

      return callGLMChatWithRetry(messages, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Extract text from streaming GLM chat chunk (SSE format)
 * Handles both reasoning_content and content deltas
 *
 * @param chunkData - Parsed JSON chunk from SSE stream
 * @returns Object with content and reasoning_content (if present)
 *
 * @example
 * ```typescript
 * // SSE chunk format:
 * // data: {"choices":[{"delta":{"content":"Hello"}}]}
 *
 * const chunk = JSON.parse(jsonStr);
 * const { content, reasoning } = extractStreamChunk(chunk);
 * // content: "Hello"
 * // reasoning: null
 * ```
 */
export function extractStreamChunk(chunkData: any): {
  content: string | null;
  reasoning: string | null;
} {
  const delta = chunkData?.choices?.[0]?.delta;

  if (!delta) {
    return { content: null, reasoning: null };
  }

  return {
    content: delta.content || null,
    reasoning: delta.reasoning_content || null
  };
}

/**
 * Extract complete response from non-streaming GLM response
 *
 * @param responseData - JSON response from GLM API
 * @param requestId - Optional request ID for logging
 * @returns Object with text content and reasoning (if present)
 *
 * @example
 * ```typescript
 * const data = await response.json();
 * const { text, reasoning } = extractCompleteResponse(data, "req-789");
 * // text: "React is a JavaScript library..."
 * // reasoning: "First, I'll explain what React is..." (if thinking mode enabled)
 * ```
 */
export function extractCompleteResponse(
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
        `${logPrefix} 🧠 GLM chat response: ${text.length} chars | ` +
        `Reasoning: ${reasoning.length} chars (finish_reason: ${finishReason})`
      );
    } else {
      console.log(
        `${logPrefix} ✅ GLM chat response: ${text.length} chars | ` +
        `No reasoning (finish_reason: ${finishReason})`
      );
    }

    return { text, reasoning };
  }

  // Error case - log the structure for debugging
  const finishReason = responseData?.choices?.[0]?.finish_reason;
  console.error(
    `${logPrefix} ❌ Failed to extract response from GLM chat (finish_reason: ${finishReason}):`,
    JSON.stringify(responseData).substring(0, 200)
  );

  return { text: "", reasoning: null };
}

/**
 * Extract token usage from GLM response for cost tracking
 *
 * @param responseData - JSON response from GLM API
 * @returns Object with input/output token counts
 *
 * @example
 * ```typescript
 * const data = await response.json();
 * const { inputTokens, outputTokens, totalTokens } = extractTokenUsage(data);
 * // inputTokens: 150
 * // outputTokens: 200
 * // totalTokens: 350
 * ```
 */
export function extractTokenUsage(responseData: any): {
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
 * Calculate cost for a GLM-4.6 chat API call
 * Pricing: Based on Z.ai Coding Plan pricing
 * Note: Adjust these values based on actual Z.ai pricing
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 *
 * @example
 * ```typescript
 * const cost = calculateCost(150, 200);
 * // cost: 0.000075 (150 input + 200 output tokens)
 * ```
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  // Z.ai Coding Plan pricing (estimate - adjust based on actual pricing)
  // GLM-4.6 is competitive with other frontier models
  const INPUT_COST_PER_M = 0.10;  // $0.10 per 1M input tokens (estimate)
  const OUTPUT_COST_PER_M = 0.30; // $0.30 per 1M output tokens (estimate)

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;

  return inputCost + outputCost;
}

/**
 * Handle GLM chat API errors with appropriate error messages
 *
 * @param response - Failed Response object
 * @param requestId - Request ID for tracking
 * @returns GLMChatError with details
 *
 * @example
 * ```typescript
 * const response = await callGLMChat(messages);
 * if (!response.ok) {
 *   const error = await handleAPIError(response, "req-123");
 *   throw error;
 * }
 * ```
 */
export async function handleAPIError(
  response: Response,
  requestId: string
): Promise<GLMChatError> {
  const status = response.status;
  let errorText = "";

  try {
    errorText = await response.text();
  } catch {
    errorText = "Unable to read error response";
  }

  console.error(`[${requestId}] GLM chat API error (${status}):`, errorText.substring(0, 200));

  // Rate limit exceeded
  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    return new GLMChatError(
      `Rate limit exceeded. Retry after ${retryAfter}s`,
      429,
      requestId,
      true
    );
  }

  // Service unavailable
  if (status === 503) {
    return new GLMChatError(
      "GLM service temporarily unavailable",
      503,
      requestId,
      true
    );
  }

  // Unauthorized (bad API key)
  if (status === 401) {
    return new GLMChatError(
      "GLM API authentication failed. Check API key configuration.",
      401,
      requestId,
      false
    );
  }

  // Bad request (invalid parameters)
  if (status === 400) {
    return new GLMChatError(
      `Bad request: ${errorText.substring(0, 100)}`,
      400,
      requestId,
      false
    );
  }

  // Generic error
  return new GLMChatError(
    `Failed to generate chat response: ${errorText.substring(0, 100)}`,
    status,
    requestId,
    false
  );
}
