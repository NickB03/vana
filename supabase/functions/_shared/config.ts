/**
 * Centralized Configuration Constants
 *
 * All magic numbers and configuration values extracted to a single source of truth.
 * This improves maintainability and makes it easy to adjust limits without hunting
 * through multiple files.
 *
 * @module config
 */

/**
 * Feature Flags
 *
 * Environment-controlled feature toggles for development and production.
 *
 * @example
 * ```bash
 * # Disable rate limiting for local development
 * RATE_LIMIT_DISABLED=true supabase functions serve
 * ```
 */
export const FEATURE_FLAGS = {
  /**
   * Disable all rate limiting checks.
   * Set RATE_LIMIT_DISABLED=true to bypass rate limits during development.
   * WARNING: Never enable this in production!
   */
  RATE_LIMIT_DISABLED: Deno.env.get('RATE_LIMIT_DISABLED') === 'true',

  /**
   * Enable enhanced debug logging for premade card artifact generation.
   * Set DEBUG_PREMADE_CARDS=true to log detailed execution traces.
   * Useful for troubleshooting why premade cards fail to generate artifacts.
   */
  DEBUG_PREMADE_CARDS: Deno.env.get('DEBUG_PREMADE_CARDS') === 'true',

  /**
   * Automatically attempt an AI fix pass when artifact validation fails.
   * Enabled by default; set AUTO_FIX_ARTIFACTS=false to disable.
   */
  AUTO_FIX_ARTIFACTS: Deno.env.get('AUTO_FIX_ARTIFACTS') !== 'false',
} as const;

// Status generation removed - no longer needed with Gemini 3 Flash migration

/**
 * Safely parse an integer from environment variable with validation
 *
 * @param key - Environment variable name
 * @param defaultValue - Default value if env var is not set or invalid
 * @param min - Optional minimum allowed value (defaults to 0)
 * @returns Parsed integer or default value
 *
 * @example
 * ```ts
 * const maxRequests = getEnvInt('RATE_LIMIT_GUEST_MAX', 20); // Returns 20 if not set
 * const windowHours = getEnvInt('RATE_LIMIT_GUEST_WINDOW', 5, 1); // Min value of 1
 * ```
 */
function getEnvInt(key: string, defaultValue: number, min: number = 0): number {
  const value = Deno.env.get(key);
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  // Validate parsed value is a valid number and meets minimum requirement
  if (isNaN(parsed) || parsed < min) {
    console.warn(
      `[config] Invalid value for ${key}="${value}". Using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return parsed;
}

/**
 * Rate limiting configurations for different user types and APIs
 *
 * All values can be overridden via environment variables for dynamic adjustment
 * without redeployment (useful for DDoS mitigation and abuse scenarios).
 *
 * Environment Variables:
 * - RATE_LIMIT_GUEST_MAX: Guest max requests (default: 20)
 * - RATE_LIMIT_GUEST_WINDOW: Guest window hours (default: 5)
 * - RATE_LIMIT_AUTH_MAX: Authenticated max requests (default: 100)
 * - RATE_LIMIT_AUTH_WINDOW: Authenticated window hours (default: 5)
 * - RATE_LIMIT_API_THROTTLE_RPM: API throttle RPM (default: 15)
 * - RATE_LIMIT_API_THROTTLE_WINDOW: API throttle window seconds (default: 60)
 * - RATE_LIMIT_ARTIFACT_API_MAX: Artifact API max requests (default: 10)
 * - RATE_LIMIT_ARTIFACT_API_WINDOW: Artifact API window seconds (default: 60)
 * - RATE_LIMIT_ARTIFACT_GUEST_MAX: Artifact guest max requests (default: 5)
 * - RATE_LIMIT_ARTIFACT_GUEST_WINDOW: Artifact guest window hours (default: 5)
 * - RATE_LIMIT_ARTIFACT_AUTH_MAX: Artifact auth max requests (default: 50)
 * - RATE_LIMIT_ARTIFACT_AUTH_WINDOW: Artifact auth window hours (default: 5)
 * - RATE_LIMIT_IMAGE_API_MAX: Image API max requests (default: 15)
 * - RATE_LIMIT_IMAGE_API_WINDOW: Image API window seconds (default: 60)
 * - RATE_LIMIT_IMAGE_GUEST_MAX: Image guest max requests (default: 20)
 * - RATE_LIMIT_IMAGE_GUEST_WINDOW: Image guest window hours (default: 5)
 * - RATE_LIMIT_IMAGE_AUTH_MAX: Image auth max requests (default: 50)
 * - RATE_LIMIT_IMAGE_AUTH_WINDOW: Image auth window hours (default: 5)
 * - RATE_LIMIT_TAVILY_API_MAX: Tavily API max requests (default: 10)
 * - RATE_LIMIT_TAVILY_API_WINDOW: Tavily API window seconds (default: 60)
 * - RATE_LIMIT_TAVILY_GUEST_MAX: Tavily guest max requests (default: 10)
 * - RATE_LIMIT_TAVILY_GUEST_WINDOW: Tavily guest window hours (default: 5)
 * - RATE_LIMIT_TAVILY_AUTH_MAX: Tavily auth max requests (default: 50)
 * - RATE_LIMIT_TAVILY_AUTH_WINDOW: Tavily auth window hours (default: 5)
 *
 * @example
 * ```bash
 * # Temporarily tighten guest limits during DDoS
 * supabase secrets set RATE_LIMIT_GUEST_MAX=5
 * supabase secrets set RATE_LIMIT_GUEST_WINDOW=1
 *
 * # No redeployment needed - changes take effect immediately
 * ```
 */
export const RATE_LIMITS = {
  /** Guest user limits (IP-based) */
  GUEST: {
    MAX_REQUESTS: getEnvInt('RATE_LIMIT_GUEST_MAX', 20, 1),
    WINDOW_HOURS: getEnvInt('RATE_LIMIT_GUEST_WINDOW', 5, 1)
  },
  /** Authenticated user limits */
  AUTHENTICATED: {
    MAX_REQUESTS: getEnvInt('RATE_LIMIT_AUTH_MAX', 100, 1),
    WINDOW_HOURS: getEnvInt('RATE_LIMIT_AUTH_WINDOW', 5, 1)
  },
  /** API-level throttling to prevent overwhelming external services */
  API_THROTTLE: {
    GEMINI_RPM: getEnvInt('RATE_LIMIT_API_THROTTLE_RPM', 15, 1),
    WINDOW_SECONDS: getEnvInt('RATE_LIMIT_API_THROTTLE_WINDOW', 60, 1)
  },
  /** Artifact generation rate limits (more restrictive due to expensive Gemini 3 Flash model) */
  ARTIFACT: {
    /** API throttle for artifact generation (stricter than chat) */
    API_THROTTLE: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_ARTIFACT_API_MAX', 10, 1),
      WINDOW_SECONDS: getEnvInt('RATE_LIMIT_ARTIFACT_API_WINDOW', 60, 1)
    },
    /** Guest user limits for artifacts (very restrictive to encourage sign-up) */
    GUEST: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_ARTIFACT_GUEST_MAX', 5, 1),
      WINDOW_HOURS: getEnvInt('RATE_LIMIT_ARTIFACT_GUEST_WINDOW', 5, 1)
    },
    /** Authenticated user limits for artifacts (lower than chat due to cost) */
    AUTHENTICATED: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_ARTIFACT_AUTH_MAX', 50, 1),
      WINDOW_HOURS: getEnvInt('RATE_LIMIT_ARTIFACT_AUTH_WINDOW', 5, 1)
    }
  },
  /** Image generation rate limits (prevent API quota abuse) */
  IMAGE: {
    /** API throttle for image generation (aligned with OpenRouter Gemini Flash Image limits) */
    API_THROTTLE: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_IMAGE_API_MAX', 15, 1),
      WINDOW_SECONDS: getEnvInt('RATE_LIMIT_IMAGE_API_WINDOW', 60, 1)
    },
    /** Guest user limits for images (restrictive to prevent abuse) */
    GUEST: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_IMAGE_GUEST_MAX', 20, 1),
      WINDOW_HOURS: getEnvInt('RATE_LIMIT_IMAGE_GUEST_WINDOW', 5, 1)
    },
    /** Authenticated user limits for images (higher for registered users) */
    AUTHENTICATED: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_IMAGE_AUTH_MAX', 50, 1),
      WINDOW_HOURS: getEnvInt('RATE_LIMIT_IMAGE_AUTH_WINDOW', 5, 1)
    }
  },
  /** Tavily web search rate limits (prevent API quota abuse) */
  TAVILY: {
    /** API throttle for Tavily searches (aligned with Basic plan limits) */
    API_THROTTLE: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_TAVILY_API_MAX', 10, 1),
      WINDOW_SECONDS: getEnvInt('RATE_LIMIT_TAVILY_API_WINDOW', 60, 1)
    },
    /** Guest user limits for searches (restrictive to prevent abuse) */
    GUEST: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_TAVILY_GUEST_MAX', 10, 1),
      WINDOW_HOURS: getEnvInt('RATE_LIMIT_TAVILY_GUEST_WINDOW', 5, 1)
    },
    /** Authenticated user limits for searches */
    AUTHENTICATED: {
      MAX_REQUESTS: getEnvInt('RATE_LIMIT_TAVILY_AUTH_MAX', 50, 1),
      WINDOW_HOURS: getEnvInt('RATE_LIMIT_TAVILY_AUTH_WINDOW', 5, 1)
    }
  }
} as const;

/**
 * Input validation limits to prevent abuse and ensure data integrity
 */
export const VALIDATION_LIMITS = {
  /** Maximum messages per conversation to prevent memory issues */
  MAX_MESSAGES_PER_CONVERSATION: 100,
  /** Maximum content length per message (characters) - increased from 50K to handle long code + conversation history */
  MAX_MESSAGE_CONTENT_LENGTH: 100000,
  /** Maximum prompt length for image generation */
  MAX_PROMPT_LENGTH: 2000,
  /** Maximum image title length */
  MAX_IMAGE_TITLE_LENGTH: 50
} as const;

/**
 * Retry configuration for handling transient failures
 * Uses exponential backoff: delay = INITIAL_DELAY_MS * (BACKOFF_MULTIPLIER ^ retryCount), capped at MAX_DELAY_MS
 */
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts (total attempts = MAX_RETRIES + 1) */
  MAX_RETRIES: 2,
  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
  /** Initial delay for exponential backoff (ms) */
  INITIAL_DELAY_MS: 1000,
  /** Maximum delay cap for exponential backoff (ms) */
  MAX_DELAY_MS: 10000
} as const;

/**
 * Storage configuration for generated images
 */
export const STORAGE_CONFIG = {
  /** Supabase storage bucket name */
  BUCKET_NAME: 'generated-images',
  /** Signed URL expiry time in seconds (7 days) */
  SIGNED_URL_EXPIRY_SECONDS: 604800,
  /** Cache control header value (1 year) */
  CACHE_CONTROL: '31536000',
  /** Default image content type */
  DEFAULT_CONTENT_TYPE: 'image/png'
} as const;

/**
 * API endpoint configurations
 */
export const API_ENDPOINTS = {
  OPENROUTER: {
    BASE_URL: 'https://openrouter.ai/api/v1',
    CHAT_COMPLETIONS: '/chat/completions'
  }
} as const;

/**
 * Model configurations
 */
export const MODELS = {
  /** Gemini 2.5 Flash Lite for titles, summaries, and chat fallback (fast, cheap) */
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  /** Gemini 3 Flash for chat, artifacts, and query rewrite (reasoning capabilities)
   *
   * Specifications:
   * - 1M context window (1,048,576 tokens)
   * - 65K max output tokens (65,536)
   * - Reasoning mode: reasoning.effort levels (minimal, low, medium, high)
   * - Full OpenAI-compatible tool calling
   * - Pricing: $0.50/M input, $3/M output
   *
   * @see https://openrouter.ai/google/gemini-3-flash-preview
   */
  GEMINI_3_FLASH: 'google/gemini-3-flash-preview',
  /** Gemini Flash Image for image generation */
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image'
} as const;

/**
 * Default AI model parameters
 *
 * Gemini 3 Flash supports up to 65K output tokens (65,536) with 1M context window.
 * Using generous limits for maximum quality on this demo site.
 */
export const DEFAULT_MODEL_PARAMS = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 16000,
  CHAT_MAX_TOKENS: 16000,
  ARTIFACT_MAX_TOKENS: 16000,
  IMAGE_MAX_TOKENS: 1024
} as const;

/**
 * Image generation configuration
 */
export const IMAGE_CONFIG = {
  DEFAULT_ASPECT_RATIO: '1:1',
  MODES: {
    GENERATE: 'generate',
    EDIT: 'edit'
  }
} as const;

/**
 * Valid message roles
 */
export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export type MessageRole = typeof MESSAGE_ROLES[number];

/**
 * Valid artifact types
 */
export const ARTIFACT_TYPES = ['image', 'html', 'react', 'code', 'svg', 'mermaid', 'markdown'] as const;
export type ArtifactType = typeof ARTIFACT_TYPES[number];

/**
 * HTTP Status codes used in the application
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Context window configuration for chat
 */
export const CONTEXT_CONFIG = {
  /** Number of recent messages to include when using summary */
  RECENT_MESSAGE_COUNT: 5,
  /** Maximum buffer size for stream transformation (bytes) */
  MAX_STREAM_BUFFER_SIZE: 50000
} as const;

/**
 * Tavily web search configuration
 */
export const TAVILY_CONFIG = {
  /** Default number of search results to return */
  DEFAULT_MAX_RESULTS: 5,
  /** Maximum allowed results (Basic plan limit) */
  MAX_RESULTS_LIMIT: 10,
  /** Default search depth */
  DEFAULT_SEARCH_DEPTH: 'basic' as const,
  /** Search timeout in milliseconds */
  SEARCH_TIMEOUT_MS: 10000,
  /** Enable answer summaries by default */
  DEFAULT_INCLUDE_ANSWER: false,
  /** Enable images by default */
  DEFAULT_INCLUDE_IMAGES: false,
  /**
   * Always-Search Mode: Force web search for ALL chat responses (not artifacts/images)
   *
   * WARNING: Set to false in production! When true, bypasses smart search intent detection
   * and searches on EVERY message (increases latency and API costs).
   *
   * PROS:
   * - Guaranteed current information in every response
   * - Reduces hallucination (grounded in real sources)
   * - Better citation culture
   *
   * CONS:
   * - Cost: $0.001 per message (1000x increase for typical usage)
   * - Latency: +2-4s per response
   * - API limits: Tavily Basic = 1000 requests/month free tier
   * - Unnecessary for conceptual queries ("What is React?")
   *
   * RECOMMENDATION: Keep false in production unless you have:
   * - Tavily Pro plan (higher limits)
   * - Use case requiring maximum factual grounding
   * - Budget for increased API costs
   *
   * To enable, set via environment variable:
   * supabase secrets set TAVILY_ALWAYS_SEARCH=true
   */
  ALWAYS_SEARCH_ENABLED: Deno.env.get('TAVILY_ALWAYS_SEARCH') === 'true'
} as const;

/**
 * Get the current year dynamically
 * Used for search prompts and temporal context in system prompts
 *
 * @returns Current year as number
 *
 * @example
 * ```typescript
 * const year = getCurrentYear(); // 2025
 * const searchInstruction = `Search for events since ${year}`;
 * ```
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get a relative phrasing for search recency ("since YYYY")
 * This is more maintainable than hardcoding years in prompts
 *
 * @param offset - Number of years before current year (default: 1)
 * @returns Formatted string like "since 2024"
 *
 * @example
 * ```typescript
 * getSearchRecencyPhrase() // "since 2024" (if current year is 2025)
 * getSearchRecencyPhrase(0) // "since 2025"
 * getSearchRecencyPhrase(2) // "since 2023"
 * ```
 */
export function getSearchRecencyPhrase(offset: number = 1): string {
  return `since ${getCurrentYear() - offset}`;
}

/**
 * Gemini API timeout configuration
 * Controls timeout limits for Gemini API requests to prevent hanging connections
 *
 * Environment Variables:
 * - GEMINI_REQUEST_TIMEOUT_MS: Non-streaming request timeout (default: 60000 / 60s)
 * - GEMINI_STREAM_TIMEOUT_MS: Streaming request timeout (default: 120000 / 2min)
 * - GEMINI_CHUNK_TIMEOUT_MS: Timeout between stream chunks (default: 30000 / 30s)
 *
 * @example
 * ```bash
 * # Increase timeout for complex artifact generation (Gemini 3 Flash with thinking mode)
 * supabase secrets set GEMINI_REQUEST_TIMEOUT_MS=90000
 * supabase secrets set GEMINI_STREAM_TIMEOUT_MS=240000
 * ```
 */
export const GEMINI_CONFIG = {
  /** Timeout for non-streaming Gemini requests in milliseconds (default: 60s) */
  REQUEST_TIMEOUT_MS: getEnvInt('GEMINI_REQUEST_TIMEOUT_MS', 60000, 1),
  /** Timeout for streaming Gemini requests in milliseconds (default: 4min for Gemini 3 Flash) */
  STREAM_TIMEOUT_MS: getEnvInt('GEMINI_STREAM_TIMEOUT_MS', 240000, 1),
  /** Timeout between stream chunks in milliseconds (default: 30s) */
  CHUNK_TIMEOUT_MS: getEnvInt('GEMINI_CHUNK_TIMEOUT_MS', 30000, 1),
} as const;
