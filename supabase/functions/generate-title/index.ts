import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callGemini, extractTextFromGeminiResponse } from "../_shared/gemini-client.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const requestBody = await req.json();
    const { message } = requestBody;
    
    // Input validation
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid message format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (message.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Message too long" }),
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

    const GOOGLE_AI_STUDIO_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY_CHAT");
    if (!GOOGLE_AI_STUDIO_KEY) {
      throw new Error("GOOGLE_AI_STUDIO_KEY_CHAT is not configured");
    }

    console.log("Generating title for message:", message.substring(0, 50));

    const systemInstruction = "You are a title generator. Generate a short, concise title (max 6 words) for the conversation based on the user's first message. Return ONLY the title, nothing else.";

    const contents = [
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    const response = await callGemini("gemini-2.5-flash-lite", contents, {
      systemInstruction,
      keyName: "GOOGLE_AI_STUDIO_KEY_CHAT"  // Use shared chat key pool for title generation
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI Studio error:", response.status, errorText);

      if (response.status === 429 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "API quota exceeded" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const title = extractTextFromGeminiResponse(data).trim() || "New Chat";

    console.log("Generated title:", title);

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Generate title error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred while generating the title" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
