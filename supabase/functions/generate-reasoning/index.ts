/**
 * Generate Reasoning Edge Function
 *
 * @deprecated This endpoint is currently NOT being called by the frontend.
 * As of the GLM-4.6 migration (Nov 2025), artifact generation now uses GLM's
 * native thinking mode, which streams reasoning directly from /generate-artifact.
 *
 * This endpoint is kept for:
 * 1. Potential future use as a standalone reasoning API
 * 2. Fallback if GLM native thinking is disabled
 * 3. Reference implementation for Gemini-based structured reasoning
 *
 * Original purpose:
 * Lightweight endpoint that generates structured reasoning using Gemini Flash.
 * Called in parallel with /generate-artifact to provide immediate reasoning
 * while artifact generation runs in the background.
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
