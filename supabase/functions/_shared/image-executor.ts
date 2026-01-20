/**
 * Image Generation Executor Service
 *
 * Pure business logic module for AI image generation using OpenRouter Gemini Flash Image.
 * Handles image generation and editing modes with automatic storage upload and retry logic.
 *
 * This module handles ONLY business logic - callers are responsible for:
 * - HTTP request/response handling
 * - CORS headers
 * - Authentication/session validation
 * - Rate limiting checks
 *
 * Key Features:
 * - Generate and edit modes with OpenRouter Gemini Flash Image
 * - Robust image extraction from multiple response formats
 * - Automatic storage upload with retry logic
 * - Graceful degradation when storage fails (returns base64)
 * - Comprehensive error handling with standardized error codes
 * - Detailed logging with request tracing
 *
 * Usage:
 * ```typescript
 * const result = await executeImageGeneration({
 *   prompt: "A beautiful sunset",
 *   mode: "generate",
 *   requestId: "abc123",
 *   userId: "user-id",
 *   supabaseClient: supabase
 * });
 *
 * if (result.storageSucceeded) {
 *   console.log(`Image stored at: ${result.imageUrl}`);
 * } else {
 *   console.warn(`Degraded mode: ${result.storageWarning}`);
 * }
 * ```
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { MODELS, STORAGE_CONFIG } from "./config.ts";
import { ErrorCode } from "./error-handler.ts";
import { uploadWithRetry } from "./storage-retry.ts";

// ============================================================================
// Security Constants
// ============================================================================

const MAX_PROMPT_LENGTH = 2000;
const MAX_REQUEST_ID_LENGTH = 64;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Maximum base64 image size to prevent DoS (10MB) */
const MAX_BASE64_SIZE = 10 * 1024 * 1024;

/** API request timeout in milliseconds (45s) */
const API_TIMEOUT_MS = 45000;

/** Whitelist of allowed image MIME types for base64 data URLs */
const ALLOWED_IMAGE_TYPES = [
  'data:image/png;base64,',
  'data:image/jpeg;base64,',
  'data:image/jpg;base64,',
  'data:image/webp;base64,',
  'data:image/gif;base64,',
] as const;

/**
 * Check if a string is an HTTP/HTTPS URL
 */
function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Fetch an image from a URL and convert to base64 data URL
 * Used to convert storage URLs to the format required by OpenRouter
 *
 * @param imageUrl - HTTP/HTTPS URL of the image
 * @param requestId - Request ID for logging
 * @returns Base64 data URL (e.g., data:image/png;base64,...)
 */
async function fetchImageAsBase64(imageUrl: string, requestId: string): Promise<string> {
  console.log(`[${requestId}] 📥 Fetching image from URL for edit mode...`);

  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(10000), // 10 second timeout for image fetch
  });

  if (!response.ok) {
    throw new ImageExecutionError(
      `Failed to fetch base image: ${response.status} ${response.statusText}`,
      ErrorCode.INVALID_INPUT,
      requestId
    );
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  console.log(`[${requestId}] ✅ Image fetched and converted to base64 (${Math.round(base64.length / 1024)}KB)`);

  return `data:${contentType};base64,${base64}`;
}

// Fallback to FLASH key for local development where IMAGE key might not be set
const OPENROUTER_GEMINI_IMAGE_KEY = Deno.env.get("OPENROUTER_GEMINI_IMAGE_KEY")
  || Deno.env.get("OPENROUTER_GEMINI_FLASH_KEY");

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Image generation mode
 * - generate: Create new image from text prompt
 * - edit: Modify existing image based on prompt
 */
export type ImageMode = "generate" | "edit";

/**
 * Valid aspect ratios for image generation
 */
export type AspectRatio = "1:1" | "16:9" | "9:16";

/** Valid image generation modes */
const VALID_IMAGE_MODES = new Set<ImageMode>(['generate', 'edit']);

/** Valid aspect ratios */
const VALID_ASPECT_RATIOS = new Set<AspectRatio>(['1:1', '16:9', '9:16']);

/**
 * Validate if a string is a valid image generation mode
 * Used for defense-in-depth input validation in tool-executor
 *
 * @param mode - String to validate
 * @returns True if mode is a valid ImageMode
 */
export function isValidImageMode(mode: string): mode is ImageMode {
  return VALID_IMAGE_MODES.has(mode as ImageMode);
}

/**
 * Validate if a string is a valid aspect ratio
 * Used for defense-in-depth input validation in tool-executor
 *
 * @param ratio - String to validate
 * @returns True if ratio is a valid AspectRatio
 */
export function isValidAspectRatio(ratio: string): ratio is AspectRatio {
  return VALID_ASPECT_RATIOS.has(ratio as AspectRatio);
}

/**
 * Base parameters shared by all image generation modes
 */
interface BaseImageParams {
  /** Text description of desired image or edit */
  prompt: string;

  /** Aspect ratio for generated image (default: "1:1") */
  aspectRatio?: AspectRatio;

  /** Request ID for tracing and logging */
  requestId: string;

  /** User ID for storage folder (undefined = guest) */
  userId?: string;

  /** Supabase client for storage operations */
  supabaseClient: SupabaseClient;
}

/**
 * Parameters for generating a new image from text prompt
 */
interface GenerateImageParams extends BaseImageParams {
  /** Generation mode */
  mode: "generate";

  /** Base image is not allowed in generate mode */
  baseImage?: never;
}

/**
 * Parameters for editing an existing image based on prompt
 */
interface EditImageParams extends BaseImageParams {
  /** Edit mode */
  mode: "edit";

  /** Base64 data URL or HTTP URL of image to edit (required for edit mode) */
  baseImage: string;
}

/**
 * Parameters for image generation execution
 *
 * Discriminated union that enforces:
 * - generate mode: Cannot have baseImage
 * - edit mode: Must have baseImage
 */
export type ImageExecutorParams = GenerateImageParams | EditImageParams;

/**
 * Result of image generation execution
 */
export interface ImageExecutorResult {
  /** Base64 data URL for immediate display in browser */
  imageData: string;

  /** Storage URL (signed URL) or base64 if storage failed */
  imageUrl: string;

  /** Original prompt used for generation */
  prompt: string;

  /** Whether storage upload succeeded */
  storageSucceeded: boolean;

  /** Warning message if operating in degraded mode (storage failed) */
  storageWarning?: string;

  /** Execution time in milliseconds */
  latencyMs: number;
}

/**
 * Custom error class for image generation failures
 * Includes error code for standardized error handling
 */
export class ImageExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode | string,
    public readonly requestId: string,
    cause?: Error
  ) {
    super(message);
    this.name = "ImageExecutionError";
    if (cause) {
      this.cause = cause;
    }
  }
}

// ============================================================================
// Security Helper Functions
// ============================================================================

/**
 * Sanitize request ID to prevent injection attacks
 *
 * Limits length and removes potentially dangerous characters that could
 * be used for log injection or command injection attacks.
 *
 * @param requestId - Raw request ID from caller
 * @returns Sanitized request ID safe for logging
 */
function sanitizeRequestId(requestId: string): string {
  return requestId
    .substring(0, MAX_REQUEST_ID_LENGTH)
    .replace(/[^\w-]/g, "");
}

/**
 * Convert unknown error to Error instance
 *
 * Handles cases where thrown value is not an Error object.
 * Essential for consistent error handling in catch blocks.
 *
 * @param error - Unknown error value
 * @returns Error instance
 */
function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Sanitize error messages before logging or throwing
 *
 * Prevents sensitive information leakage through error messages.
 * Truncates long messages and removes potential PII.
 *
 * @param message - Raw error message
 * @returns Sanitized error message safe for logging
 */
function sanitizeErrorMessage(message: string): string {
  return message
    .substring(0, 500)
    .replace(/Bearer\s+[\w-]+/gi, "Bearer [REDACTED]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
}

/**
 * Validate executor parameters
 *
 * Performs fail-fast validation to catch errors early.
 * Throws ImageExecutionError with appropriate error codes.
 *
 * @param params - Executor parameters to validate
 * @param safeRequestId - Sanitized request ID for error messages
 * @throws {ImageExecutionError} If validation fails
 */
function validateParams(params: ImageExecutorParams, safeRequestId: string): void {
  const { prompt, mode, baseImage } = params;

  // Validate prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new ImageExecutionError(
      "Prompt is required and must be non-empty",
      ErrorCode.INVALID_INPUT,
      safeRequestId
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new ImageExecutionError(
      `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`,
      ErrorCode.INVALID_INPUT,
      safeRequestId
    );
  }

  // Validate mode
  if (!mode || !["generate", "edit"].includes(mode)) {
    throw new ImageExecutionError(
      "Mode must be 'generate' or 'edit'",
      ErrorCode.INVALID_INPUT,
      safeRequestId
    );
  }

  // Validate baseImage for edit mode
  if (mode === "edit") {
    if (!baseImage || typeof baseImage !== "string") {
      throw new ImageExecutionError(
        "Edit mode requires baseImage parameter",
        ErrorCode.INVALID_INPUT,
        safeRequestId
      );
    }

    // Check if it's an HTTP URL (storage URL) - will be converted to base64 later
    const isUrlImage = isHttpUrl(baseImage);

    // SECURITY: Validate MIME type whitelist for base64 data URLs
    const isValidDataUrl = ALLOWED_IMAGE_TYPES.some(type =>
      baseImage.toLowerCase().startsWith(type)
    );

    if (!isUrlImage && !isValidDataUrl) {
      throw new ImageExecutionError(
        "Base image must be a valid image URL or PNG, JPEG, WebP, or GIF data URL",
        ErrorCode.INVALID_INPUT,
        safeRequestId
      );
    }

    // Only validate size and structure for base64 data URLs, not HTTP URLs
    if (!isUrlImage) {
      // SECURITY: Validate base64 size to prevent DoS
      if (baseImage.length > MAX_BASE64_SIZE) {
        throw new ImageExecutionError(
          `Base image too large (max ${MAX_BASE64_SIZE / 1024 / 1024}MB)`,
          ErrorCode.INVALID_INPUT,
          safeRequestId
        );
      }

      // SECURITY: Validate base64 structure
      const base64Part = baseImage.split(',')[1];
      if (!base64Part || !/^[A-Za-z0-9+/=]+$/.test(base64Part.substring(0, 100))) {
        throw new ImageExecutionError(
          "Invalid base64 image data",
          ErrorCode.INVALID_INPUT,
          safeRequestId
        );
      }
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build OpenRouter message format based on generation mode
 *
 * Generate mode: Simple text prompt
 * Edit mode: Multipart message with image and text
 *
 * @param prompt - Text description
 * @param mode - Generation mode
 * @param baseImage - Base64 image for edit mode
 * @returns OpenRouter-formatted messages array
 */
function buildMessages(
  prompt: string,
  mode: ImageMode,
  baseImage?: string
): Array<{ role: string; content: unknown }> {
  if (mode === "generate") {
    return [
      {
        role: "user",
        content: prompt
      }
    ];
  } else {
    // Edit mode - include image in message
    return [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: baseImage } }
        ]
      }
    ];
  }
}

/**
 * Extract image data from OpenRouter API response
 *
 * Handles multiple response formats from different models:
 * 1. Gemini Flash Image format: data.choices[0].message.images[0].image_url.url
 * 2. Content field formats:
 *    - Direct URL (starts with http)
 *    - Data URL (starts with data:image)
 *    - Raw base64 (no prefix)
 * 3. Multipart content array
 *
 * @param data - OpenRouter API response
 * @param requestId - Request ID for logging
 * @returns Base64 data URL or null if not found
 */
function extractImageFromResponse(data: unknown, requestId: string): string | null {
  // Type-safe access to nested properties
  const dataObj = data as Record<string, unknown> | null;
  const choices = dataObj?.choices as Array<{
    message?: Record<string, unknown>;
    delta?: Record<string, unknown>;
  }> | undefined;

  // Check both streaming (delta) and non-streaming (message) formats
  // Note: Image generation is typically non-streaming, but we check both for consistency
  const message = choices?.[0]?.delta || choices?.[0]?.message;

  if (!message) {
    console.error(`[${requestId}] ❌ No message or delta in API response`);
    return null;
  }

  // Format 1: Check for images array (Gemini Flash Image format)
  if (message.images && Array.isArray(message.images) && message.images.length > 0) {
    const imageUrl = message.images[0].image_url?.url;
    if (imageUrl) {
      console.log(`[${requestId}] ✅ Found image URL in images array`);
      return imageUrl;
    }
  }

  // Format 2: Check content field
  const content = message.content;

  if (!content) {
    console.error(`[${requestId}] ❌ No content in message`);
    return null;
  }

  // Format 2a: Content is a string
  if (typeof content === "string") {
    // HTTP URL
    if (content.startsWith("http")) {
      console.log(`[${requestId}] ✅ Found HTTP image URL in content`);
      return content;
    }

    // Data URL (already properly formatted)
    if (content.startsWith("data:image")) {
      console.log(`[${requestId}] ✅ Found data URL in content`);
      return content;
    }

    // Raw base64 without prefix (assume PNG)
    if (content.length > 100 && !content.includes(" ")) {
      console.log(`[${requestId}] ✅ Found base64 data (adding prefix)`);
      return `data:image/png;base64,${content}`;
    }
  }

  // Format 2b: Content is an array (multipart response)
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === "image_url" && part.image_url?.url) {
        console.log(`[${requestId}] ✅ Found image URL in multipart content`);
        return part.image_url.url;
      }
    }
  }

  console.error(`[${requestId}] ❌ No valid image data found in response`);
  console.error(`[${requestId}] Content type: ${typeof content}`);
  return null;
}

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute image generation with OpenRouter Gemini Flash Image
 *
 * Main entry point for image generation. Handles the complete workflow:
 * 1. Validate parameters
 * 2. Call OpenRouter API
 * 3. Extract image from response
 * 4. Upload to Supabase Storage with retry
 * 5. Return result with success/degraded mode info
 *
 * @param params - Execution parameters
 * @returns Image generation result with URLs and metadata
 * @throws {ImageExecutionError} For validation errors or fatal failures
 *
 * @example
 * ```typescript
 * const result = await executeImageGeneration({
 *   prompt: "A sunset over mountains",
 *   mode: "generate",
 *   requestId: "req-123",
 *   userId: "user-456",
 *   supabaseClient: supabase
 * });
 *
 * console.log(`Generated in ${result.latencyMs}ms`);
 * if (!result.storageSucceeded) {
 *   console.warn(`Warning: ${result.storageWarning}`);
 * }
 * ```
 */
export async function executeImageGeneration(
  params: ImageExecutorParams
): Promise<ImageExecutorResult> {
  const startTime = Date.now();

  // Sanitize request ID immediately for security
  const safeRequestId = sanitizeRequestId(params.requestId);

  try {
    // Validate parameters (fail-fast)
    validateParams(params, safeRequestId);

    const { prompt, mode, aspectRatio = "1:1", baseImage, userId, supabaseClient } = params;

    console.log(
      `[${safeRequestId}] 🎨 Image ${mode} request (${aspectRatio}): "${prompt.substring(0, 100)}..."`
    );

    // Check API key is configured
    if (!OPENROUTER_GEMINI_IMAGE_KEY) {
      throw new ImageExecutionError(
        "Image generation service not configured",
        ErrorCode.SERVICE_UNAVAILABLE,
        safeRequestId
      );
    }

    // Convert HTTP URL to base64 if needed (for edit mode with storage URLs)
    let processedBaseImage = baseImage;
    if (mode === "edit" && baseImage && isHttpUrl(baseImage)) {
      try {
        processedBaseImage = await fetchImageAsBase64(baseImage, safeRequestId);
      } catch (fetchError) {
        console.error(`[${safeRequestId}] ❌ Failed to fetch base image:`, fetchError);
        throw new ImageExecutionError(
          fetchError instanceof ImageExecutionError
            ? fetchError.message
            : `Failed to fetch base image from URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          ErrorCode.INVALID_INPUT,
          safeRequestId
        );
      }
    }

    // Build OpenRouter message format
    const messages = buildMessages(prompt, mode, processedBaseImage);

    // Call OpenRouter Gemini Flash Image API with timeout
    console.log(`[${safeRequestId}] 🎨 Calling OpenRouter (${MODELS.GEMINI_FLASH_IMAGE})`);

    // SECURITY: Add timeout to prevent resource exhaustion from slow responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_GEMINI_IMAGE_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "https://your-domain.com",
          "X-Title": "AI Chat Assistant - Image Generation"
        },
        body: JSON.stringify({
          model: MODELS.GEMINI_FLASH_IMAGE,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
          image_config: {
            aspect_ratio: aspectRatio
          }
        }),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const err = toError(fetchError);

      if (err.name === 'AbortError') {
        console.error(`[${safeRequestId}] ❌ OpenRouter API timeout after ${API_TIMEOUT_MS}ms`);
        throw new ImageExecutionError(
          "Image generation timed out",
          ErrorCode.SERVICE_UNAVAILABLE,
          safeRequestId
        );
      }

      console.error(`[${safeRequestId}] ❌ Network error:`, sanitizeErrorMessage(err.message));
      throw new ImageExecutionError(
        "Network error communicating with image service",
        ErrorCode.AI_ERROR,
        safeRequestId,
        err
      );
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[${safeRequestId}] ❌ OpenRouter API error: ${response.status}`,
        sanitizeErrorMessage(errorText.substring(0, 200))
      );

      throw new ImageExecutionError(
        `OpenRouter API error: ${response.status}`,
        ErrorCode.AI_ERROR,
        safeRequestId
      );
    }

    const data = await response.json();
    console.log(`[${safeRequestId}] ✅ OpenRouter response received`);

    // Extract image from response
    const imageData = extractImageFromResponse(data, safeRequestId);

    if (!imageData) {
      console.error(`[${safeRequestId}] ❌ No image data in response`);
      console.error(`[${safeRequestId}] Response structure:`, JSON.stringify({
        hasResponse: !!data,
        hasChoices: !!data.choices,
        choiceCount: data.choices?.length || 0,
        messageType: typeof data.choices?.[0]?.message?.content
      }));

      throw new ImageExecutionError(
        "The AI model failed to generate an image. The response format was unexpected.",
        ErrorCode.AI_ERROR,
        safeRequestId
      );
    }

    console.log(`[${safeRequestId}] ✅ Image ${mode} successful`);

    // Upload to Supabase Storage with retry logic
    let imageUrl = imageData; // Default to base64 if upload fails
    let storageWarning: string | undefined;
    let storageSucceeded = false;

    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();

      // Generate unique filename with random token for security
      const randomToken = crypto.randomUUID();
      const userFolder = userId || "guest";
      const fileName = `${userFolder}/${randomToken}_${Date.now()}.png`;

      console.log(`[${safeRequestId}] 📤 Uploading image to storage: ${fileName}`);

      // Upload to storage with automatic retry logic
      const uploadResult = await uploadWithRetry(
        supabaseClient,
        STORAGE_CONFIG.BUCKET_NAME,
        fileName,
        blob,
        {
          contentType: STORAGE_CONFIG.DEFAULT_CONTENT_TYPE,
          cacheControl: STORAGE_CONFIG.CACHE_CONTROL
        },
        STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
        safeRequestId
      );

      imageUrl = uploadResult.url;
      storageSucceeded = true;

      const expiryDays = STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS / 86400;
      console.log(
        `[${safeRequestId}] ✅ Image uploaded with signed URL (${expiryDays} days expiry)`
      );

    } catch (storageError) {
      const error = toError(storageError);
      const errorMsg = sanitizeErrorMessage(error.message);

      console.error(
        `[${safeRequestId}] ⚠️ Storage upload failed after retries, using base64:`,
        errorMsg
      );

      storageWarning = `Storage system error (${errorMsg}). Using temporary base64 - image may not persist long-term.`;
    }

    const latencyMs = Date.now() - startTime;

    console.log(
      `[${safeRequestId}] ✅ Image generation completed in ${latencyMs}ms ` +
      `(storage: ${storageSucceeded ? "succeeded" : "degraded mode"})`
    );

    return {
      imageData,
      imageUrl,
      prompt,
      storageSucceeded,
      storageWarning,
      latencyMs
    };

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Re-throw ImageExecutionError as-is
    if (error instanceof ImageExecutionError) {
      console.error(
        `[${safeRequestId}] ❌ Image generation failed (${latencyMs}ms):`,
        sanitizeErrorMessage(error.message)
      );
      throw error;
    }

    // Wrap unknown errors
    const wrappedError = toError(error);
    const errorMsg = sanitizeErrorMessage(wrappedError.message);

    console.error(
      `[${safeRequestId}] ❌ Unexpected error during image generation (${latencyMs}ms):`,
      errorMsg
    );

    throw new ImageExecutionError(
      "An unexpected error occurred during image generation",
      ErrorCode.INTERNAL_ERROR,
      safeRequestId,
      wrappedError
    );
  }
}
