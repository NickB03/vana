// deno-lint-ignore-file no-explicit-any
/**
 * OpenRouter API Client
 *
 * Supports Gemini 2.5 Flash Lite via OpenRouter for:
 * - Chat conversations
 * - Summaries
 * - Title generation
 * - Fast parallel reasoning
 *
 * Key Features:
 * - OpenAI-compatible API format
 * - Automatic retry with exponential backoff
 * - Usage logging for admin dashboard
 * - Cost tracking and analytics
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { MODELS, RETRY_CONFIG } from './config.ts';

// API key for Gemini Flash Lite
const OPENROUTER_GEMINI_FLASH_KEY = Deno.env.get("OPENROUTER_GEMINI_FLASH_KEY");
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Validate Gemini Flash key (for chat/summaries/titles)
if (!OPENROUTER_GEMINI_FLASH_KEY) {
  console.warn(
    "⚠️  OPENROUTER_GEMINI_FLASH_KEY not configured - chat/summaries/titles will fail.\n" +
    "Get your key from: https://openrouter.ai/keys\n" +
    "Set it with: supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-..."
  );
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Extract token usage from OpenRouter response for cost tracking
 *
 * @param responseData - JSON response from OpenRouter
 * @returns Object with input/output token counts
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
 * Log AI usage to database for admin dashboard analytics
 * Fire-and-forget logging - doesn't block the response
 *
 * @param logData - Usage data to log
 */
export async function logAIUsage(logData: {
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
    // Create service role client for database access
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
      console.error(`[${logData.requestId}] Failed to log AI usage:`, error);
      // Don't throw - logging failures shouldn't break the main flow
    } else {
      console.log(`[${logData.requestId}] 📊 Usage logged to database`);
    }
  } catch (error) {
    console.error(`[${logData.requestId}] Exception logging AI usage:`, error);
    // Swallow error - logging is best-effort
  }
}

// ============================================================================
// Gemini 2.5 Flash Lite Functions (for Chat, Summaries, Titles)
// ============================================================================

export interface GeminiFlashOptions {
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  stream?: boolean;
  model?: string;
}

/**
 * Call Gemini 2.5 Flash Lite via OpenRouter for chat, summaries, and titles
 * Uses OpenAI-compatible format with streaming support
 *
 * @param messages - Array of messages in OpenAI format
 * @param options - Configuration options
 * @returns Response object (streamed or complete)
 */
export async function callGeminiFlash(
  messages: OpenRouterMessage[],
  options?: GeminiFlashOptions
): Promise<Response> {
  const {
    temperature = 0.7,
    max_tokens = 8000,
    requestId = crypto.randomUUID(),
    stream = false,
    model = MODELS.GEMINI_FLASH
  } = options || {};

  if (!OPENROUTER_GEMINI_FLASH_KEY) {
    throw new Error(
      "OPENROUTER_GEMINI_FLASH_KEY not configured.\n" +
      "Set it with: supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-..."
    );
  }

  console.log(`[${requestId}] 🚀 Routing to Gemini 2.5 Flash Lite via OpenRouter (stream: ${stream})`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_GEMINI_FLASH_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_URL") || "https://your-domain.com",
      "X-Title": "AI Chat Assistant"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream,
      // OpenRouter-specific optimizations
      transforms: stream ? ["middle-out"] : undefined
    })
  });

  return response;
}

/**
 * Call Gemini Flash with exponential backoff retry logic
 * Handles transient failures gracefully
 *
 * @param messages - Array of messages
 * @param options - Configuration options
 * @param retryCount - Current retry attempt (internal)
 * @returns Response object
 */
export async function callGeminiFlashWithRetry(
  messages: OpenRouterMessage[],
  options?: GeminiFlashOptions,
  retryCount = 0
): Promise<Response> {
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    const response = await callGeminiFlash(messages, {
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
        // Unconsumed response bodies hold onto network resources and memory
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

        return callGeminiFlashWithRetry(messages, options, retryCount + 1);
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

      return callGeminiFlashWithRetry(messages, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Extract text from Gemini Flash response (OpenAI-compatible format)
 * Handles both streaming chunks and complete responses
 *
 * @param responseData - JSON response from OpenRouter
 * @param requestId - Optional request ID for logging
 * @returns Extracted text content
 */
export function extractTextFromGeminiFlash(responseData: any, requestId?: string): string {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // Streaming chunk format: choices[0].delta.content
  if (responseData?.choices?.[0]?.delta?.content) {
    return responseData.choices[0].delta.content;
  }

  // Complete response format: choices[0].message.content
  if (responseData?.choices?.[0]?.message?.content) {
    const text = responseData.choices[0].message.content;
    console.log(`${logPrefix} ✅ Extracted text from Gemini Flash, length: ${text.length} characters`);
    return text;
  }

  // Direct content field
  if (responseData?.content && typeof responseData.content === 'string') {
    console.log(`${logPrefix} ✅ Extracted text from direct content field, length: ${responseData.content.length}`);
    return responseData.content;
  }

  // Error case - log the structure for debugging
  console.error(
    `${logPrefix} ❌ Failed to extract text from response:`,
    JSON.stringify(responseData).substring(0, 200)
  );
  return "";
}
