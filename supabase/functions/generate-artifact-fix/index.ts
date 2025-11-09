import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callGemini } from "../_shared/gemini-client.ts";
import { getCorsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { content, type, errorMessage } = requestBody;

    // Input validation
    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid content format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type || typeof type !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid type format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!errorMessage || typeof errorMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid error message format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (content.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Content too long" }),
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

    const GOOGLE_AI_STUDIO_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY_FIX");
    if (!GOOGLE_AI_STUDIO_KEY) {
      throw new Error("GOOGLE_AI_STUDIO_KEY_FIX is not configured");
    }

    console.log(`Generating fix for artifact type: ${type}, user: ${user.id}, error:`, errorMessage.substring(0, 100));

    // Build context-aware system prompt based on artifact type
    let systemPrompt = `You are an expert code debugger and fixer. Your task is to analyze the provided code and fix the error.

IMPORTANT RULES:
1. Return ONLY the fixed code, no explanations or markdown code blocks
2. Preserve the original structure and functionality as much as possible
3. Fix ONLY the specific error mentioned
4. Do not add comments explaining the fix
5. Ensure the code is complete and runnable`;

    // Add type-specific guidance
    if (type === "react") {
      systemPrompt += `\n\nREACT ARTIFACT RULES:
- Cannot use @/components/ui/* imports (use Radix UI primitives instead)
- Cannot use localStorage or sessionStorage (use useState instead)
- Must have a default export
- Available libraries: React, Radix UI (@radix-ui/*), Tailwind CSS, lucide-react, recharts, framer-motion
- Use CDN-available libraries only (no npm imports in artifacts)
- Components must start with uppercase letter`;
    } else if (type === "html") {
      systemPrompt += `\n\nHTML ARTIFACT RULES:
- Ensure all tags are properly closed
- Add missing viewport meta tags for responsive design
- Include alt attributes on images for accessibility
- Avoid inline event handlers (prefer script tags)`;
    } else if (type === "code") {
      systemPrompt += `\n\nCODE ARTIFACT RULES:
- Ensure balanced braces and parentheses
- Check for syntax errors
- Avoid using eval() for security`;
    }

    // Prepare Gemini API request
    const contents = [
      {
        role: "user",
        parts: [{
          text: `Fix this ${type} artifact that has the following error:

ERROR: ${errorMessage}

CODE:
${content}

Return ONLY the fixed code without any explanations or markdown formatting.`
        }]
      }
    ];

    // Call Gemini API using shared client
    const response = await callGemini("gemini-2.5-pro", contents, {
      systemInstruction: systemPrompt,
      temperature: 0.3, // Lower temperature for more deterministic fixes
      keyName: "GOOGLE_AI_STUDIO_KEY_FIX"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI Studio error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ error: "AI API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let fixedCode = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!fixedCode) {
      throw new Error("No fixed code returned from AI");
    }

    // Clean up any markdown code blocks that might have been added
    fixedCode = fixedCode.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();

    console.log("Generated fix, original length:", content.length, "fixed length:", fixedCode.length);

    return new Response(JSON.stringify({ fixedCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Generate artifact fix error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred while generating the fix" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
