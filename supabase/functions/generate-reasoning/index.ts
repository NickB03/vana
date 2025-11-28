/**
 * Generate Reasoning Edge Function
 *
 * Lightweight endpoint that generates structured reasoning using Gemini Flash.
 * Called in parallel with /generate-artifact to provide immediate reasoning
 * while artifact generation runs in the background.
 *
 * This enables real-time reasoning streaming even when using direct artifact routing.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import {
  generateStructuredReasoning,
  createFallbackReasoning,
  type StructuredReasoning
} from "../_shared/reasoning-generator.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] 🧠 Generate reasoning request received`);

  try {
    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Generating reasoning for: "${prompt.substring(0, 50)}..."`);

    // Generate structured reasoning using fast Gemini Flash model
    // This typically completes in 2-4 seconds
    let reasoning: StructuredReasoning;

    try {
      reasoning = await generateStructuredReasoning(
        prompt,
        context || [], // Optional conversation context
        {
          maxSteps: 3,      // Keep it concise for artifacts
          timeout: 8000,    // 8 second timeout
        }
      );

      console.log(`[${requestId}] ✅ Generated ${reasoning.steps.length} reasoning steps`);
    } catch (reasoningError) {
      console.warn(`[${requestId}] ⚠️ Reasoning generation failed, using fallback:`, reasoningError);
      reasoning = createFallbackReasoning(
        reasoningError instanceof Error ? reasoningError.message : "Processing your request"
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        reasoning,
        requestId,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Generate reasoning error:`, error);

    return new Response(
      JSON.stringify({
        error: "Failed to generate reasoning",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
