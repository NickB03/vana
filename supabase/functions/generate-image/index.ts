import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Image ${mode} request from user ${user.id}:`, prompt.substring(0, 100));

    // Construct messages based on mode
    let messages;
    if (mode === "generate") {
      messages = [
        { role: "user", content: prompt }
      ];
    } else {
      // Edit mode
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: baseImage }
            }
          ]
        }
      ];
    }

    // Call Lovable AI with image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages,
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Workspace quota exceeded. Please upgrade your plan." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Image generation failed. Please try again." }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Lovable AI response received");

    // Extract base64 image - check multiple possible locations
    let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Fallback: check if image is directly in content
    if (!imageData && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      // Check if content contains base64 image data
      if (typeof content === 'string' && content.includes('data:image/')) {
        const match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (match) {
          imageData = match[0];
        }
      }
    }

    if (!imageData) {
      console.error("No image data in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          error: "The AI model failed to generate an image. This may be due to content restrictions or a temporary issue. Please try again with a different prompt." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Image ${mode} successful, size: ${imageData.length} bytes`);

    // Upload to Supabase Storage with signed URL (1 hour expiry)
    let imageUrl = imageData; // Default to base64 if upload fails
    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();
      
      // Generate unique filename with random token for security
      const randomToken = crypto.randomUUID();
      const fileName = `${user.id}/${randomToken}_${Date.now()}.png`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      } else {
        // Get signed URL with 1 hour expiry for better security
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('generated-images')
          .createSignedUrl(fileName, 3600); // 1 hour expiry
        
        if (signedUrlError) {
          console.error("Signed URL error:", signedUrlError);
        } else {
          imageUrl = signedUrlData.signedUrl;
          console.log(`Image uploaded with signed URL (expires in 1 hour)`);
        }
      }
    } catch (storageError) {
      console.error("Storage upload failed, using base64:", storageError);
      // Continue with base64 as fallback
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageData, // Base64 for immediate display
        imageUrl,  // Storage URL for database persistence
        prompt
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
