import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { MODELS, RATE_LIMITS, STORAGE_CONFIG } from "../_shared/config.ts";
import { ErrorResponseBuilder } from "../_shared/error-handler.ts";
import { uploadWithRetry } from "../_shared/storage-retry.ts";

// Fallback to FLASH key for local development where IMAGE key might not be set
const OPENROUTER_GEMINI_IMAGE_KEY = Deno.env.get("OPENROUTER_GEMINI_IMAGE_KEY")
  || Deno.env.get("OPENROUTER_GEMINI_FLASH_KEY");
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // NOTE: OPTIONS requests are handled automatically by Supabase Edge Runtime
  // with default CORS configuration. We only handle actual requests (POST, GET, etc.)

  // SECURITY FIX #3: Generate requestId immediately after CORS check (before validation)
  // This ensures all error responses include a traceable request ID
  const requestId = crypto.randomUUID();
  const errors = ErrorResponseBuilder.withHeaders(corsHeaders, requestId);

  try {
    // Parse and validate JSON body (catch syntax errors)
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error(`❌ [${requestId}] Invalid JSON in request body:`, jsonError);
      return errors.validation(
        "Invalid JSON in request body",
        jsonError instanceof Error ? jsonError.message : "Failed to parse JSON"
      );
    }

    const { prompt, mode, baseImage, sessionId } = requestBody;

    console.log(`🎨 [${requestId}] Request received: mode=${mode}, prompt length=${prompt?.length}`);

    // SECURITY FIX #4: Use ErrorResponseBuilder for consistent error handling
    // Input validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      console.error(`❌ [${requestId}] Invalid prompt`);
      return errors.validation("Prompt is required and must be non-empty");
    }

    if (prompt.length > 2000) {
      return errors.validation("Prompt too long (max 2000 characters)");
    }

    if (!mode || !["generate", "edit"].includes(mode)) {
      return errors.validation("Mode must be 'generate' or 'edit'");
    }

    if (mode === "edit" && (!baseImage || !baseImage.startsWith("data:image/"))) {
      return errors.validation("Edit mode requires valid base64 image");
    }

    // Support both authenticated and guest users (similar to chat function)
    let user = null;
    const authHeader = req.headers.get("Authorization");

    // Create supabase client for storage operations (works for both auth and guest)
    let supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    if (authHeader) {
      // Authenticated user - verify token and recreate client with auth
      supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        user = authUser;
      }
    }

    // Guest users are allowed (user will be null)
    const isGuest = !user;

    // ============================================================================
    // CRITICAL SECURITY: Rate Limiting (Defense-in-Depth)
    // ============================================================================
    // Prevent unlimited image generation which could:
    // 1. Drain OpenRouter API quota
    // 2. Cause financial damage ($$ per image generation)
    // 3. Degrade service for legitimate users
    // ============================================================================

    // Create service_role client for rate limiting checks
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parallelize API throttle and guest/user rate limit checks
    const [
      { data: apiThrottleResult, error: apiThrottleError },
      rateLimitResult
    ] = await Promise.all([
      // Check OpenRouter Gemini Flash Image API throttle (15 RPM)
      serviceClient.rpc("check_api_throttle", {
        p_api_name: "openrouter-gemini-image",
        p_max_requests: RATE_LIMITS.IMAGE.API_THROTTLE.MAX_REQUESTS,
        p_window_seconds: RATE_LIMITS.IMAGE.API_THROTTLE.WINDOW_SECONDS
      }),
      // Check appropriate rate limit based on auth status
      isGuest ? (async () => {
        // Get client IP address (trusted headers set by Supabase Edge infrastructure)
        // X-Forwarded-For is sanitized by Supabase proxy to prevent spoofing
        const rawClientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
          || req.headers.get("x-real-ip");

        let clientIp: string;
        if (!rawClientIp) {
          // SECURITY: Generate unique ID instead of shared "unknown" bucket
          clientIp = `no-ip_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
          console.warn(
            `[generate-image] SECURITY: Missing IP headers (x-forwarded-for, x-real-ip). ` +
            `Using unique identifier: ${clientIp}. Check proxy configuration.`
          );
        } else {
          clientIp = rawClientIp;
        }

        return await serviceClient.rpc("check_guest_rate_limit", {
          p_identifier: clientIp,
          p_max_requests: RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS,
          p_window_hours: RATE_LIMITS.IMAGE.GUEST.WINDOW_HOURS
        });
      })() : serviceClient.rpc("check_user_rate_limit", {
        p_user_id: user!.id,
        p_max_requests: RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS,
        p_window_hours: RATE_LIMITS.IMAGE.AUTHENTICATED.WINDOW_HOURS
      })
    ]);

    // SECURITY FIX #1: Validate API throttle RPC response structure
    // Critical: Prevent null pointer errors that could bypass rate limiting
    if (apiThrottleError) {
      console.error(`[${requestId}] API throttle check error:`, apiThrottleError);
      return errors.serviceUnavailable("Service temporarily unavailable", true);
    }

    // Validate response structure before accessing properties
    if (!apiThrottleResult || typeof apiThrottleResult !== 'object') {
      console.error(`[${requestId}] CRITICAL: Invalid API throttle response:`, apiThrottleResult);
      return errors.serviceUnavailable("Rate limiting check failed", true);
    }

    if (!('allowed' in apiThrottleResult) || !('reset_at' in apiThrottleResult)) {
      console.error(`[${requestId}] CRITICAL: Missing required fields in throttle response:`, apiThrottleResult);
      return errors.serviceUnavailable("Rate limiting check failed", true);
    }

    // Now safe to check throttle status
    if (!apiThrottleResult.allowed) {
      console.warn(`[${requestId}] 🚨 API throttle exceeded for image generation`);
      return errors.rateLimited(
        apiThrottleResult.reset_at,
        0,
        apiThrottleResult.total || RATE_LIMITS.IMAGE.API_THROTTLE.MAX_REQUESTS,
        "API rate limit exceeded. Please try again in a moment."
      );
    }

    // SECURITY FIX #2: Validate user/guest rate limit RPC response structure
    // Critical: Prevent null pointer errors that could bypass rate limiting
    const { data: rateLimitData, error: rateLimitError } = rateLimitResult;

    if (rateLimitError) {
      console.error(`[${requestId}] Rate limit check error:`, rateLimitError);
      return errors.serviceUnavailable("Service temporarily unavailable", true);
    }

    // Validate response structure before accessing properties
    if (!rateLimitData || typeof rateLimitData !== 'object') {
      console.error(`[${requestId}] CRITICAL: Invalid rate limit response:`, rateLimitData);
      return errors.serviceUnavailable("Rate limiting check failed", true);
    }

    if (!('allowed' in rateLimitData) || !('reset_at' in rateLimitData)) {
      console.error(`[${requestId}] CRITICAL: Missing required fields in rate limit response:`, rateLimitData);
      return errors.serviceUnavailable("Rate limiting check failed", true);
    }

    // Now safe to check rate limit status
    if (!rateLimitData.allowed) {
      const limitType = isGuest ? "guest" : "authenticated user";
      const limit = isGuest ? RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS : RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS;
      const window = isGuest ? RATE_LIMITS.IMAGE.GUEST.WINDOW_HOURS : RATE_LIMITS.IMAGE.AUTHENTICATED.WINDOW_HOURS;

      console.warn(`[${requestId}] 🚨 Rate limit exceeded for ${limitType} (${limit} requests per ${window} hours)`);

      return errors.rateLimited(
        rateLimitData.reset_at,
        rateLimitData.remaining || 0,
        rateLimitData.total || limit,
        `Rate limit exceeded. ${limitType}s are limited to ${limit} image generations per ${window} hours.`
      );
    }

    // Rate limit passed - log success
    console.log(`[${requestId}] ✅ Rate limit check passed for ${isGuest ? 'guest' : 'user'} (remaining: ${rateLimitData.remaining})`);

    if (!OPENROUTER_GEMINI_IMAGE_KEY) {
      console.error(`❌ [${requestId}] OPENROUTER_GEMINI_IMAGE_KEY not configured`);
      return errors.internal("Image generation service not configured");
    }

    const userType = user ? `user ${user.id}` : "guest";
    console.log(`🎨 [${requestId}] Image ${mode} request from ${userType}:`, prompt.substring(0, 100));

    // Build OpenRouter message format
    let messages;
    if (mode === "generate") {
      messages = [
        {
          role: "user",
          content: prompt
        }
      ];
    } else {
      // Edit mode - include image in message
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: baseImage } }
          ]
        }
      ];
    }

    // Call OpenRouter Gemini Flash Image API
    console.log(`🎨 [${requestId}] Calling OpenRouter (${MODELS.GEMINI_FLASH_IMAGE})`);
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
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
          aspect_ratio: "1:1"  // Square images by default
        }
      })
    });

    if (!response.ok) {
      return await errors.apiError(response, "OpenRouter image generation");
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] OpenRouter response received`);

    // CRITICAL DEBUG: Log full API response structure
    console.log(`=== [${requestId}] OPENROUTER API RESPONSE DEBUG ===`);
    console.log(`Full response:`, JSON.stringify(data, null, 2));
    console.log(`Has choices?`, !!data.choices);
    console.log(`Choice count:`, data.choices?.length);
    if (data.choices?.[0]) {
      console.log(`First choice message:`, JSON.stringify(data.choices[0].message, null, 2));
    }
    console.log(`=== [${requestId}] END DEBUG ===`);

    // Extract image from OpenRouter response
    // OpenRouter format for Gemini Flash Image: data.choices[0].message.images[0].url
    let imageData: string | undefined;

    const message = data.choices?.[0]?.message;

    // First, check for images array (Gemini Flash Image format)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const imageUrl = message.images[0].image_url?.url;
      if (imageUrl) {
        imageData = imageUrl;
        console.log(`✅ [${requestId}] Found image URL in images array:`, imageUrl.substring(0, 100));
      }
    }
    // Fallback: check content field
    else if (message?.content) {
      const content = message.content;

      // Check if content is a string (might be URL or base64)
      if (typeof content === 'string') {
        // If it starts with http, it's a URL
        if (content.startsWith('http')) {
          imageData = content;
          console.log(`✅ [${requestId}] Found image URL in content:`, content.substring(0, 100));
        }
        // If it starts with data:image, it's already a data URL
        else if (content.startsWith('data:image')) {
          imageData = content;
          console.log(`✅ [${requestId}] Found image data URL`);
        }
        // Otherwise might be base64 without prefix
        else if (content.length > 100 && !content.includes(' ')) {
          imageData = `data:image/png;base64,${content}`;
          console.log(`✅ [${requestId}] Found base64 image data (added prefix)`);
        }
      }
      // Check if content is an array (multipart response)
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'image_url' && part.image_url?.url) {
            imageData = part.image_url.url;
            console.log(`✅ [${requestId}] Found image URL in multipart content`);
            break;
          }
        }
      }
    }

    if (!imageData) {
      console.error(`❌ [${requestId}] No image data found in OpenRouter response`);
      console.error(`[${requestId}] Full response for debugging:`, JSON.stringify(data));
      return errors.internal(
        "The AI model failed to generate an image. The response format was unexpected. Please try again.",
        JSON.stringify({
          hasResponse: !!data,
          hasChoices: !!data.choices,
          choiceCount: data.choices?.length || 0,
          messageContentType: typeof message?.content
        })
      );
    }

    console.log(`✅ [${requestId}] Image ${mode} successful`);

    // Upload to Supabase Storage with retry logic and signed URL
    let imageUrl = imageData; // Default to base64 if upload fails
    let storageWarning: string | undefined;
    let storageSucceeded = false;

    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();

      // Generate unique filename with random token for security
      const randomToken = crypto.randomUUID();
      const userFolder = user ? user.id : "guest";
      const fileName = `${userFolder}/${randomToken}_${Date.now()}.png`;

      console.log(`[${requestId}] Uploading image to storage: ${fileName}`);

      // Upload to storage with automatic retry logic
      const uploadResult = await uploadWithRetry(
        supabase,
        STORAGE_CONFIG.BUCKET_NAME,
        fileName,
        blob,
        {
          contentType: STORAGE_CONFIG.DEFAULT_CONTENT_TYPE,
          cacheControl: STORAGE_CONFIG.CACHE_CONTROL
        },
        STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
        requestId
      );

      imageUrl = uploadResult.url;
      storageSucceeded = true;
      console.log(`[${requestId}] Image uploaded successfully with signed URL (${STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS / 86400} days expiry)`);

    } catch (storageError) {
      console.error(`[${requestId}] Storage upload failed after retries, using base64:`, storageError);
      storageWarning = `Storage system error (${storageError instanceof Error ? storageError.message : 'Unknown error'}). Using temporary base64 - image may not persist long-term.`;
    }

    // SECURITY FIX #6: Return 206 Partial Content when storage fails (degraded mode)
    // This signals to the client that the request succeeded but with limited functionality
    const responseStatus = storageSucceeded ? 200 : 206;
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-Request-ID": requestId
    };

    if (!storageSucceeded) {
      // Add warning header to indicate degraded mode
      responseHeaders["Warning"] = '199 - "Image generated but storage failed. Using temporary base64."';
      console.warn(`[${requestId}] ⚠️ Returning 206 Partial Content - storage failed, using degraded mode`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageData, // Base64 for immediate display
        imageUrl,  // Storage URL for database persistence (or base64 if storage failed)
        prompt,
        storageWarning, // Include warning when operating in degraded mode
        degradedMode: !storageSucceeded // Explicit flag for client
      }),
      {
        status: responseStatus,
        headers: responseHeaders
      }
    );

  } catch (e) {
    console.error(`[${requestId}] Generate image error:`, e);
    return errors.internal(
      "An error occurred while processing your request",
      e instanceof Error ? e.message : "Unknown error"
    );
  }
});
