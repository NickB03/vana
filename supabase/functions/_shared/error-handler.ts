/**
 * Centralized Error Response Handler
 *
 * Eliminates duplicate error handling code across edge functions.
 * Provides consistent error response formats with proper headers and status codes.
 *
 * @module error-handler
 */

import { HTTP_STATUS } from "./config.ts";

/**
 * Error response data structure
 */
export interface ErrorResponse {
  error: string;
  requestId: string;
  details?: string;
  retryable?: boolean;
  rateLimitExceeded?: boolean;
  resetAt?: string;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  total: number;
  remaining: number;
  resetAt: string;
}

/**
 * Centralized error response builder
 *
 * Usage:
 * ```ts
 * const errors = ErrorResponseBuilder.create(origin, requestId);
 * return errors.validation("Invalid input");
 * return errors.rateLimited(resetAt, 0, 100);
 * ```
 */
export class ErrorResponseBuilder {
  private constructor(
    private readonly corsHeaders: Record<string, string>,
    private readonly requestId: string
  ) {}

  /**
   * Factory method to create an error builder instance
   */
  static create(origin: string | null, requestId: string): ErrorResponseBuilder {
    // Get allowed origins from environment variable
    const envOrigins = Deno.env.get("ALLOWED_ORIGINS");

    const allowedOrigins = envOrigins
      ? envOrigins.split(",").map(o => o.trim()).filter(Boolean)
      : [
          // Development defaults - include common Vite ports for development flexibility
          "http://localhost:8080",
          "http://localhost:8081",
          "http://localhost:8082",
          "http://localhost:8083",
          "http://localhost:8084",
          "http://localhost:8085",
          "http://localhost:8086",
          "http://localhost:8087",
          "http://localhost:8088",
          "http://localhost:8089",
          "http://localhost:8090",
          "http://localhost:5173",
          "http://127.0.0.1:8080",
          "http://127.0.0.1:8081",
          "http://127.0.0.1:8082",
          "http://127.0.0.1:8083",
          "http://127.0.0.1:8084",
          "http://127.0.0.1:8085",
          "http://127.0.0.1:8086",
          "http://127.0.0.1:8087",
          "http://127.0.0.1:8088",
          "http://127.0.0.1:8089",
          "http://127.0.0.1:8090",
          "http://127.0.0.1:5173",
        ];

    // Validate origin against whitelist - use first allowed origin as secure fallback
    const corsOrigin = origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0];

    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
    };

    return new ErrorResponseBuilder(corsHeaders, requestId);
  }

  /**
   * Create error builder with pre-built CORS headers
   */
  static withHeaders(
    corsHeaders: Record<string, string>,
    requestId: string
  ): ErrorResponseBuilder {
    return new ErrorResponseBuilder(corsHeaders, requestId);
  }

  /**
   * Validation error (400 Bad Request)
   */
  validation(message: string, details?: string): Response {
    return this.jsonResponse(
      {
        error: message,
        requestId: this.requestId,
        details
      },
      HTTP_STATUS.BAD_REQUEST
    );
  }

  /**
   * Unauthorized error (401 Unauthorized)
   */
  unauthorized(message = "Unauthorized", details?: string): Response {
    return this.jsonResponse(
      {
        error: message,
        requestId: this.requestId,
        details
      },
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  /**
   * Forbidden error (403 Forbidden)
   */
  forbidden(message = "Forbidden", details?: string): Response {
    return this.jsonResponse(
      {
        error: message,
        requestId: this.requestId,
        details
      },
      HTTP_STATUS.FORBIDDEN
    );
  }

  /**
   * Rate limit exceeded error (429 Too Many Requests)
   */
  rateLimited(
    resetAt: string,
    remaining: number,
    total: number,
    message = "Rate limit exceeded. Please try again later."
  ): Response {
    return new Response(
      JSON.stringify({
        error: message,
        rateLimitExceeded: true,
        resetAt,
        requestId: this.requestId
      }),
      {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers: {
          ...this.corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": this.requestId,
          "X-RateLimit-Limit": total.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(resetAt).getTime().toString(),
          "Retry-After": this.calculateRetryAfter(resetAt).toString()
        }
      }
    );
  }

  /**
   * Internal server error (500 Internal Server Error)
   */
  internal(message = "An error occurred while processing your request", details?: string): Response {
    return this.jsonResponse(
      {
        error: message,
        requestId: this.requestId,
        details
      },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * Service unavailable error (503 Service Unavailable)
   */
  serviceUnavailable(
    message = "Service temporarily unavailable",
    retryable = true,
    retryAfter?: number
  ): Response {
    const headers: Record<string, string> = {
      ...this.corsHeaders,
      "Content-Type": "application/json",
      "X-Request-ID": this.requestId
    };

    if (retryAfter) {
      headers["Retry-After"] = retryAfter.toString();
    }

    return new Response(
      JSON.stringify({
        error: message,
        requestId: this.requestId,
        retryable
      }),
      {
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        headers
      }
    );
  }

  /**
   * Handle API response errors with appropriate status codes
   */
  async apiError(response: Response, context?: string): Promise<Response> {
    const errorText = await response.text();

    console.error(
      `[${this.requestId}] API error ${context ? `(${context})` : ""}:`,
      response.status,
      errorText.substring(0, 200)
    );

    // Rate limiting
    if (response.status === HTTP_STATUS.TOO_MANY_REQUESTS || response.status === HTTP_STATUS.FORBIDDEN) {
      const retryAfter = response.headers.get("Retry-After");
      return this.jsonResponse(
        {
          error: "API quota exceeded. Please try again in a moment.",
          requestId: this.requestId,
          retryable: true,
          details: errorText.substring(0, 200)
        },
        HTTP_STATUS.TOO_MANY_REQUESTS,
        retryAfter ? { "Retry-After": retryAfter } : undefined
      );
    }

    // Service overloaded (transient error)
    if (response.status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
      return this.serviceUnavailable(
        "AI service temporarily unavailable",
        true
      );
    }

    // Generic API error
    return this.jsonResponse(
      {
        error: response.status >= 500 ? "AI service error" : "Request failed",
        requestId: this.requestId,
        details: errorText.substring(0, 200),
        retryable: response.status >= 500
      },
      response.status
    );
  }

  /**
   * Convert error to streaming response format
   */
  toStreamResponse(message: string, additionalHeaders?: Record<string, string>): Response {
    const errorMessage = `${message} (Request ID: ${this.requestId})`;
    const streamData = `data: ${JSON.stringify({
      choices: [{ delta: { content: errorMessage } }]
    })}\n\ndata: [DONE]\n\n`;

    return new Response(streamData, {
      headers: {
        ...this.corsHeaders,
        ...additionalHeaders,
        "Content-Type": "text/event-stream",
        "X-Request-ID": this.requestId
      }
    });
  }

  /**
   * Generic JSON response builder
   */
  private jsonResponse(
    body: object,
    status: number,
    additionalHeaders?: Record<string, string>
  ): Response {
    return new Response(
      JSON.stringify(body),
      {
        status,
        headers: {
          ...this.corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": this.requestId,
          ...additionalHeaders
        }
      }
    );
  }

  /**
   * Calculate retry-after seconds from reset timestamp
   */
  private calculateRetryAfter(resetAt: string): number {
    const resetTime = new Date(resetAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((resetTime - now) / 1000));
  }
}

/**
 * Custom error class for validation errors that can be thrown and caught
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Custom error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(
    message = "Unauthorized",
    public readonly details?: string
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly resetAt: string,
    public readonly total: number,
    public readonly remaining: number = 0
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}
