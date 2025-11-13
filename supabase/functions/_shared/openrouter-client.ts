/**
 * OpenRouter API Client - For Kimi K2-Thinking (Artifact Generation Only)
 *
 * This client is specifically designed for artifact generation and fixing,
 * replacing the unreliable Gemini Pro free tier with Kimi K2-Thinking.
 *
 * Key Features:
 * - Reasoning model optimized for code generation
 * - Reliable (no 503 errors like Gemini free tier)
 * - Cost-effective ($0.15 input / $2.50 output per 1M tokens)
 * - OpenAI-compatible API format
 * - Automatic usage logging for admin dashboard
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_K2T_KEY");
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Retry configuration for handling transient API failures
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

if (!OPENROUTER_API_KEY) {
  throw new Error(
    "OPENROUTER_K2T_KEY not configured.\n" +
    "Get your key from: https://openrouter.ai/keys\n" +
    "Set it with: supabase secrets set OPENROUTER_K2T_KEY=sk-or-v1-..."
  );
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallKimiOptions {
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  userId?: string; // For usage tracking
  isGuest?: boolean; // For usage tracking
  functionName?: string; // 'generate-artifact' or 'generate-artifact-fix'
  promptPreview?: string; // First 200 chars for debugging
}

/**
 * Call Kimi K2-Thinking for artifact generation or fixing
 * Uses OpenAI-compatible format (no conversion needed)
 *
 * @param systemPrompt - System instruction for the model
 * @param userPrompt - User's prompt or code to fix
 * @param options - Temperature, max tokens, request ID
 * @returns Response object
 */
export async function callKimi(
  systemPrompt: string,
  userPrompt: string,
  options?: CallKimiOptions
): Promise<Response> {
  const {
    temperature = 0.7,
    max_tokens = 8000,
    requestId = crypto.randomUUID()
  } = options || {};

  console.log(`[${requestId}] 🤖 Routing to Kimi K2-Thinking via OpenRouter`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("SITE_URL") || "https://your-domain.com",
      "X-Title": "AI Chat App - Artifact Generation"
    },
    body: JSON.stringify({
      model: "moonshotai/kimi-k2-thinking",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature,
      max_tokens,
      // OpenRouter-specific optimizations
      transforms: ["middle-out"], // Compression for faster responses
      route: "fallback" // Auto-fallback if Kimi unavailable
    })
  });

  return response;
}

/**
 * Call Kimi with exponential backoff retry logic
 * Handles transient failures gracefully
 *
 * @param systemPrompt - System instruction
 * @param userPrompt - User prompt
 * @param options - Configuration options
 * @param retryCount - Current retry attempt (internal)
 * @returns Response object
 */
export async function callKimiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  options?: CallKimiOptions,
  retryCount = 0
): Promise<Response> {
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    const response = await callKimi(systemPrompt, userPrompt, {
      ...options,
      requestId
    });

    if (response.ok) {
      return response;
    }

    // Handle rate limiting (429) and service overload (503) with exponential backoff
    if (response.status === 429 || response.status === 503) {
      if (retryCount < RETRY_CONFIG.maxRetries) {
        const delayMs = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
          RETRY_CONFIG.maxDelayMs
        );

        const retryAfter = response.headers.get('Retry-After');
        const actualDelayMs = retryAfter ? parseInt(retryAfter) * 1000 : delayMs;

        const errorType = response.status === 429 ? "Rate limited" : "Service overloaded";
        console.log(`[${requestId}] ${errorType} (${response.status}). Retry ${retryCount + 1}/${RETRY_CONFIG.maxRetries} after ${actualDelayMs}ms`);

        await new Promise(resolve => setTimeout(resolve, actualDelayMs));

        return callKimiWithRetry(systemPrompt, userPrompt, options, retryCount + 1);
      } else {
        console.error(`[${requestId}] Max retries exceeded (status: ${response.status})`);
      }
    }

    return response;
  } catch (error) {
    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delayMs = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelayMs
      );
      console.log(`[${requestId}] Network error, retrying after ${delayMs}ms:`, error);

      await new Promise(resolve => setTimeout(resolve, delayMs));

      return callKimiWithRetry(systemPrompt, userPrompt, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Extract text from OpenRouter response (OpenAI-compatible format)
 * Handles both successful and error responses
 *
 * @param responseData - JSON response from OpenRouter
 * @param requestId - Optional request ID for logging
 * @returns Extracted text content
 */
export function extractTextFromKimi(responseData: any, requestId?: string): string {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // OpenAI-compatible format: choices[0].message.content
  if (responseData?.choices?.[0]?.message?.content) {
    const text = responseData.choices[0].message.content;
    console.log(`${logPrefix} ✅ Extracted artifact from Kimi, length: ${text.length} characters`);
    return text;
  }

  // Error case - log the structure for debugging
  console.error(
    `${logPrefix} ❌ Failed to extract text from response:`,
    JSON.stringify(responseData).substring(0, 200)
  );
  return "";
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
 * Calculate cost for a Kimi K2-Thinking API call
 * Pricing: $0.15 per 1M input tokens, $2.50 per 1M output tokens
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateKimiCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_M = 0.15;
  const OUTPUT_COST_PER_M = 2.50;

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;

  return inputCost + outputCost;
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
