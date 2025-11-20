/**
 * Shared API Error Handler for OpenRouter/Kimi Responses
 *
 * Provides consistent error handling across artifact generation functions.
 * Handles specific error codes (429, 403, 503) with appropriate retry semantics.
 *
 * @module api-error-handler
 */

import { HTTP_STATUS } from "./config.ts";
import { ErrorResponseBuilder } from "./error-handler.ts";

/**
 * Options for handling API errors
 */
export interface ApiErrorHandlerOptions {
  /** Request ID for tracing */
  requestId: string;
  /** CORS headers to include in response */
  corsHeaders: Record<string, string>;
  /** Optional context for logging (e.g., "Kimi K2-Thinking", "Gemini Flash") */
  context?: string;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  requestId: string;
  retryable?: boolean;
  details?: string;
  rateLimitExceeded?: boolean;
  resetAt?: string;
  retryAfter?: number;
}

/**
 * Handle API response errors with consistent behavior across functions
 *
 * Supports:
 * - 429 (Rate Limit) with retry-after headers
 * - 403 (Forbidden/Quota) treated as rate limit
 * - 503 (Service Unavailable) with retryable flag
 * - Generic fallback with actual status code preservation
 *
 * @param response - The failed API response
 * @param options - Error handling configuration
 * @returns Standardized error response
 *
 * @example
 * ```ts
 * if (!response.ok) {
 *   return await handleApiError(response, {
 *     requestId,
 *     corsHeaders,
 *     context: "Kimi K2-Thinking"
 *   });
 * }
 * ```
 */
export async function handleApiError(
  response: Response,
  options: ApiErrorHandlerOptions
): Promise<Response> {
  const { requestId, corsHeaders, context } = options;
  const errorText = await response.text();

  // Log error with context
  const contextStr = context ? `(${context}) ` : "";
  console.error(
    `[${requestId}] API error ${contextStr}status=${response.status}:`,
    errorText.substring(0, 200)
  );

  const errors = ErrorResponseBuilder.withHeaders(corsHeaders, requestId);

  // Handle quota/rate limit errors (429 or 403)
  if (response.status === HTTP_STATUS.TOO_MANY_REQUESTS || response.status === HTTP_STATUS.FORBIDDEN) {
    // Extract retry-after if available
    const retryAfter = response.headers.get("Retry-After");
    const resetTime = retryAfter
      ? new Date(Date.now() + parseInt(retryAfter) * 1000).toISOString()
      : new Date(Date.now() + 60000).toISOString(); // Default 1 min

    return new Response(
      JSON.stringify({
        error: "API quota exceeded. Please try again in a moment.",
        requestId,
        retryable: true,
        rateLimitExceeded: true,
        resetAt: resetTime,
        retryAfter: retryAfter ? parseInt(retryAfter) : 60
      } as ApiErrorResponse),
      {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          ...(retryAfter && { "Retry-After": retryAfter })
        }
      }
    );
  }

  // Handle service overload (503)
  if (response.status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
    return new Response(
      JSON.stringify({
        error: "AI service is temporarily overloaded. Please try again in a moment.",
        requestId,
        retryable: true
      } as ApiErrorResponse),
      {
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        }
      }
    );
  }

  // Generic API error - preserve actual status code
  const isServerError = response.status >= 500;
  return new Response(
    JSON.stringify({
      error: isServerError
        ? "AI service error. Please try again."
        : "Request failed. Please check your input and try again.",
      requestId,
      retryable: isServerError,
      details: errorText.substring(0, 200)
    } as ApiErrorResponse),
    {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Request-ID": requestId
      }
    }
  );
}

/**
 * Quick helper for common OpenRouter/Kimi error handling pattern
 *
 * @example
 * ```ts
 * const { response, retryCount } = await callKimiWithRetryTracking(...);
 * if (!response.ok) {
 *   return handleKimiError(response, requestId, corsHeaders);
 * }
 * ```
 */
export async function handleKimiError(
  response: Response,
  requestId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  return handleApiError(response, {
    requestId,
    corsHeaders,
    context: "Kimi K2-Thinking"
  });
}

/**
 * Quick helper for Gemini API error handling
 */
export async function handleGeminiError(
  response: Response,
  requestId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  return handleApiError(response, {
    requestId,
    corsHeaders,
    context: "Gemini Flash"
  });
}
