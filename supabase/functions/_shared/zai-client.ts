/**
 * ZAI / GLM API Client
 *
 * Thin wrapper around https://api.zai-g.com/v1/chat/completions using
 * an OpenAI-compatible request format. Designed to be a drop-in alternative
 * to the existing OpenRouter Gemini chat client.
 */

import type { OpenRouterMessage } from "./openrouter-client.ts";
import { MODELS } from "./config.ts";

const ZAI_GLM_API_KEY = Deno.env.get("ZAI_GLM_API_KEY");
const ZAI_BASE_URL = "https://api.zai-g.com/v1";

export interface ZaiChatOptions {
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  stream?: boolean;
}

/**
 * Call ZAI GLM chat completions API.
 *
 * Uses OpenAI-compatible messages and supports both streaming and
 * non-streaming responses.
 */
export async function callZaiGLMChat(
  messages: OpenRouterMessage[],
  options?: ZaiChatOptions
): Promise<Response> {
  const {
    temperature = 0.7,
    max_tokens = 8000,
    requestId = crypto.randomUUID(),
    stream = false,
  } = options || {};

  if (!ZAI_GLM_API_KEY) {
    throw new Error(
      "ZAI_GLM_API_KEY not configured.\n" +
        "Set it with: supabase secrets set ZAI_GLM_API_KEY=zai-...\n" +
        "Get your key from your Zhipu AI / ZAI dashboard."
    );
  }

  // MODELS.ZAI_GLM_4_5 is stored as provider/model; ZAI expects just the model id
  const modelId = MODELS.ZAI_GLM_4_5.split("/")[1];

  console.log(
    `[${requestId}] 🚀 Routing to GLM (${modelId}) via ZAI provider (stream: ${stream})`,
  );

  const response = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ZAI_GLM_API_KEY}`,
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream,
      temperature,
      max_tokens,
    }),
  });

  return response;
}

/**
 * Call ZAI GLM with simple exponential backoff retry logic.
 * Mirrors the pattern used for OpenRouter clients.
 */
export async function callZaiGLMChatWithRetry(
  messages: OpenRouterMessage[],
  options?: ZaiChatOptions,
  retryCount = 0,
): Promise<Response> {
  const requestId = options?.requestId || crypto.randomUUID();

  const maxRetries = 3;
  const initialDelayMs = 1000;
  const maxDelayMs = 10000;
  const backoffMultiplier = 2;

  try {
    const response = await callZaiGLMChat(messages, { ...options, requestId });

    if (response.ok) {
      return response;
    }

    // Handle rate limiting (429) and service overload (503) with exponential backoff
    if ((response.status === 429 || response.status === 503) && retryCount < maxRetries) {
      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, retryCount),
        maxDelayMs,
      );

      const retryAfter = response.headers.get("Retry-After");
      const actualDelayMs = retryAfter ? parseInt(retryAfter) * 1000 : delayMs;

      const errorType = response.status === 429 ? "Rate limited" : "Service overloaded";
      console.log(
        `[${requestId}] ${errorType} (${response.status}). Retry ${
          retryCount + 1
        }/${maxRetries} after ${actualDelayMs}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, actualDelayMs));

      return callZaiGLMChatWithRetry(messages, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < maxRetries) {
      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, retryCount),
        maxDelayMs,
      );
      console.log(
        `[${requestId}] Network error, retrying after ${delayMs}ms:`,
        error,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      return callZaiGLMChatWithRetry(messages, options, retryCount + 1);
    }

    throw error;
  }
}

