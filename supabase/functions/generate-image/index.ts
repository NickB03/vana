import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { MODELS } from "../_shared/config.ts";

const OPENROUTER_GEMINI_IMAGE_KEY = Deno.env.get("OPENROUTER_GEMINI_IMAGE_KEY");
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const { prompt, mode, baseImage, sessionId } = await req.json();

    console.log(`🎨 [generate-image] Request received: mode=${mode}, prompt length=${prompt?.length}`);

    // Input validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      console.error("❌ [generate-image] Invalid prompt");
      return new Response(
        JSON.stringify({ error: "Prompt is required and must be non-empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Prompt too long (max 2000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mode || !["generate", "edit"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Mode must be 'generate' or 'edit'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "edit" && (!baseImage || !baseImage.startsWith("data:image/"))) {
      return new Response(
        JSON.stringify({ error: "Edit mode requires valid base64 image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    if (!OPENROUTER_GEMINI_IMAGE_KEY) {
      console.error("❌ OPENROUTER_GEMINI_IMAGE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Image generation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userType = user ? `user ${user.id}` : "guest";
    console.log(`🎨 Image ${mode} request from ${userType}:`, prompt.substring(0, 100));

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
    console.log(`🎨 Calling OpenRouter (${MODELS.GEMINI_FLASH_IMAGE})`);
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
      const errorText = await response.text();
      console.error("❌ OpenRouter error:", response.status, errorText);

      if (response.status === 429 || response.status === 403) {
        return new Response(
          JSON.stringify({
            error: "API quota exceeded. Please try again in a moment.",
            retryable: true
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Image generation failed",
          details: errorText.substring(0, 200),
          retryable: true
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("✅ OpenRouter response received");

    // CRITICAL DEBUG: Log full API response structure
    console.log("=== OPENROUTER API RESPONSE DEBUG ===");
    console.log("Full response:", JSON.stringify(data, null, 2));
    console.log("Has choices?", !!data.choices);
    console.log("Choice count:", data.choices?.length);
    if (data.choices?.[0]) {
      console.log("First choice message:", JSON.stringify(data.choices[0].message, null, 2));
    }
    console.log("=== END DEBUG ===");

    // Extract image from OpenRouter response
    // OpenRouter format for Gemini Flash Image: data.choices[0].message.images[0].url
    let imageData: string | undefined;

    const message = data.choices?.[0]?.message;

    // First, check for images array (Gemini Flash Image format)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const imageUrl = message.images[0].image_url?.url;
      if (imageUrl) {
        imageData = imageUrl;
        console.log("✅ Found image URL in images array:", imageUrl.substring(0, 100));
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
          console.log("✅ Found image URL in content:", content.substring(0, 100));
        }
        // If it starts with data:image, it's already a data URL
        else if (content.startsWith('data:image')) {
          imageData = content;
          console.log("✅ Found image data URL");
        }
        // Otherwise might be base64 without prefix
        else if (content.length > 100 && !content.includes(' ')) {
          imageData = `data:image/png;base64,${content}`;
          console.log("✅ Found base64 image data (added prefix)");
        }
      }
      // Check if content is an array (multipart response)
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'image_url' && part.image_url?.url) {
            imageData = part.image_url.url;
            console.log("✅ Found image URL in multipart content");
            break;
          }
        }
      }
    }

    if (!imageData) {
      console.error("❌ No image data found in OpenRouter response");
      console.error("Full response for debugging:", JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: "The AI model failed to generate an image. The response format was unexpected. Please try again.",
          debug: {
            hasResponse: !!data,
            hasChoices: !!data.choices,
            choiceCount: data.choices?.length || 0,
            messageContentType: typeof message?.content
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Image ${mode} successful`);

    // Upload to Supabase Storage with signed URL
    let imageUrl = imageData; // Default to base64 if upload fails
    let storageWarning: string | undefined;

    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();

      // Generate unique filename with random token for security
      const randomToken = crypto.randomUUID();
      const userFolder = user ? user.id : "guest";
      const fileName = `${userFolder}/${randomToken}_${Date.now()}.png`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '31536000' // 1 year cache
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        storageWarning = `Image storage failed (${uploadError.message}). Using temporary base64 - image may not persist long-term.`;
      } else {
        // Get signed URL (7 days expiry) for private bucket access
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('generated-images')
          .createSignedUrl(fileName, 604800); // 7 days = 604800 seconds

        if (urlError || !signedUrlData?.signedUrl) {
          console.error("Failed to create signed URL:", urlError);
          storageWarning = `Failed to generate secure URL (${urlError?.message || 'No URL returned'}). Using temporary base64 - image may not persist long-term.`;
        } else {
          imageUrl = signedUrlData.signedUrl;
          console.log(`Image uploaded successfully with signed URL (7 days expiry)`);
        }
      }
    } catch (storageError) {
      console.error("Storage upload failed, using base64:", storageError);
      storageWarning = `Storage system error (${storageError instanceof Error ? storageError.message : 'Unknown error'}). Using temporary base64 - image may not persist long-term.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageData, // Base64 for immediate display
        imageUrl,  // Storage URL for database persistence (or base64 if storage failed)
        prompt,
        storageWarning // Include warning when operating in degraded mode
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (e) {
    console.error("Generate image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
