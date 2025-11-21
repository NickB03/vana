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
 * Rate limiting configurations for different user types and APIs
 */
export const RATE_LIMITS = {
  /** Guest user limits (IP-based) */
  GUEST: {
    MAX_REQUESTS: 20,
    WINDOW_HOURS: 5
  },
  /** Authenticated user limits */
  AUTHENTICATED: {
    MAX_REQUESTS: 100,
    WINDOW_HOURS: 5
  },
  /** API-level throttling to prevent overwhelming external services */
  API_THROTTLE: {
    GEMINI_RPM: 15,
    WINDOW_SECONDS: 60
  },
  /** Artifact generation rate limits (more restrictive due to expensive Kimi K2 model) */
  ARTIFACT: {
    /** API throttle for artifact generation (stricter than chat) */
    API_THROTTLE: {
      MAX_REQUESTS: 10,
      WINDOW_SECONDS: 60
    },
    /** Guest user limits for artifacts (very restrictive to encourage sign-up) */
    GUEST: {
      MAX_REQUESTS: 5,
      WINDOW_HOURS: 5
    },
    /** Authenticated user limits for artifacts (lower than chat due to cost) */
    AUTHENTICATED: {
      MAX_REQUESTS: 50,
      WINDOW_HOURS: 5
    }
  },
  /** Image generation rate limits (prevent API quota abuse) */
  IMAGE: {
    /** API throttle for image generation (aligned with OpenRouter Gemini Flash Image limits) */
    API_THROTTLE: {
      MAX_REQUESTS: 15,
      WINDOW_SECONDS: 60
    },
    /** Guest user limits for images (restrictive to prevent abuse) */
    GUEST: {
      MAX_REQUESTS: 20,
      WINDOW_HOURS: 5
    },
    /** Authenticated user limits for images (higher for registered users) */
    AUTHENTICATED: {
      MAX_REQUESTS: 50,
      WINDOW_HOURS: 5
    }
  }
} as const;

/**
 * Input validation limits to prevent abuse and ensure data integrity
 */
export const VALIDATION_LIMITS = {
  /** Maximum messages per conversation to prevent memory issues */
  MAX_MESSAGES_PER_CONVERSATION: 100,
  /** Maximum content length per message (characters) */
  MAX_MESSAGE_CONTENT_LENGTH: 50000,
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
  /** Gemini 2.5 Flash Lite for chat/summaries/titles */
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  /** Kimi K2-Thinking for artifact generation */
  KIMI_K2: 'moonshotai/kimi-k2-thinking',
  /** Gemini Flash Image for image generation */
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image'
} as const;

/**
 * Default AI model parameters
 */
export const DEFAULT_MODEL_PARAMS = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 8000,
  CHAT_MAX_TOKENS: 8000,
  ARTIFACT_MAX_TOKENS: 8000,
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
