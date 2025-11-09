import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callGemini } from "../_shared/gemini-client.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const { prompt, mode, baseImage, sessionId } = await req.json();

    // Input validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
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

    const GOOGLE_AI_STUDIO_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY_IMAGE");
    if (!GOOGLE_AI_STUDIO_KEY) {
      throw new Error("GOOGLE_AI_STUDIO_KEY_IMAGE is not configured");
    }

    const userType = user ? `user ${user.id}` : "guest";
    console.log(`Image ${mode} request from ${userType}:`, prompt.substring(0, 100));

    // Construct Gemini messages based on mode
    let contents;
    if (mode === "generate") {
      contents = [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ];
    } else {
      // Edit mode - extract base64 data from data URL
      const base64Data = baseImage.split(',')[1];
      const mimeType = baseImage.match(/data:([^;]+);/)?.[1] || 'image/png';

      contents = [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ];
    }

    // Call Gemini image generation API with correct API key
    const response = await callGemini("gemini-2.5-flash-image", contents, {
      keyName: "GOOGLE_AI_STUDIO_KEY_IMAGE"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI Studio error:", response.status, errorText);

      if (response.status === 429 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "API quota exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Image generation failed. Please try again." }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Google AI Studio response received");

    // CRITICAL DEBUG: Log full API response structure to diagnose image generation issues
    console.log("=== GEMINI API RESPONSE DEBUG ===");
    console.log("Full response:", JSON.stringify(data, null, 2));
    console.log("Has candidates?", !!data.candidates);
    console.log("Candidate count:", data.candidates?.length);
    if (data.candidates?.[0]) {
      console.log("First candidate parts:", JSON.stringify(data.candidates[0].content?.parts, null, 2));
    }
    console.log("=== END DEBUG ===");

    // Extract base64 image from Gemini response
    // Gemini format: data.candidates[0].content.parts[0].inlineData.data
    let imageData: string | undefined;

    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        // Log each part to see what we're getting
        console.log("Checking part:", {
          hasInlineData: !!part.inlineData,
          hasText: !!part.text,
          partKeys: Object.keys(part)
        });

        if (part.inlineData?.data) {
          // Convert to data URL format
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageData = `data:${mimeType};base64,${part.inlineData.data}`;
          console.log("✅ Found image data, mimeType:", mimeType, "size:", part.inlineData.data.length);
          break;
        } else if (part.text) {
          // DIAGNOSTIC: Model returned text instead of image
          console.warn("⚠️ Model returned TEXT instead of IMAGE:", part.text.substring(0, 200));
        }
      }
    }

    if (!imageData) {
      console.error("❌ No image data found in Gemini response");
      console.error("Full response for debugging:", JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: "The AI model failed to generate an image. This may be due to content restrictions or a temporary issue. Please try again with a different prompt.",
          debug: {
            hasResponse: !!data,
            hasCandidates: !!data.candidates,
            candidateCount: data.candidates?.length || 0,
            firstPartType: data.candidates?.[0]?.content?.parts?.[0] ? Object.keys(data.candidates[0].content.parts[0])[0] : 'none'
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Image ${mode} successful, size: ${imageData.length} bytes`);

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
