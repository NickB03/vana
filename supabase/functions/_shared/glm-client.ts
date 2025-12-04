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
  role: "system" | "user" | "assistant";
  content: string;
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
}

export interface RetryResult {
  response: Response;
  retryCount: number;
}

/**
 * Call GLM-4.6 for artifact generation or fixing
 * Uses OpenAI-compatible format with optional thinking mode
 *
 * @param systemPrompt - System instruction for the model
 * @param userPrompt - User's prompt or code to fix
 * @param options - Temperature, max tokens, request ID, thinking mode
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
    stream = false // Streaming disabled by default for backward compatibility
  } = options || {};

  if (!GLM_API_KEY) {
    throw new Error("GLM_API_KEY not configured");
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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
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
