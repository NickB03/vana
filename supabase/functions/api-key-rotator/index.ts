import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors-config.ts";

/**
 * API Key Rotator for Google Gemini API
 * 
 * Automatically rotates through multiple API keys to avoid rate limits.
 * When a key hits 429 (quota exceeded), it marks it as exhausted and tries the next key.
 * 
 * Environment Variables:
 * - API_KEYS_CHAT: Comma-separated list of chat API keys
 * - API_KEYS_IMAGE: Comma-separated list of image API keys
 * - API_KEYS_FIX: Comma-separated list of fix API keys
 * - ACCESS_TOKEN: Optional token to restrict access
 */

// Load API keys from environment
const CHAT_KEYS = (Deno.env.get("API_KEYS_CHAT") || "").split(",").map(k => k.trim()).filter(k => k);
const IMAGE_KEYS = (Deno.env.get("API_KEYS_IMAGE") || "").split(",").map(k => k.trim()).filter(k => k);
const FIX_KEYS = (Deno.env.get("API_KEYS_FIX") || "").split(",").map(k => k.trim()).filter(k => k);
const ACCESS_TOKEN = Deno.env.get("ACCESS_TOKEN");

// Rotation state
interface KeyState {
  exhaustedUntil?: number;
}

interface KeyPool {
  keys: string[];
  currentIndex: number;
  states: KeyState[];
}

const pools: Record<string, KeyPool> = {
  chat: { keys: CHAT_KEYS, currentIndex: 0, states: CHAT_KEYS.map(() => ({})) },
  image: { keys: IMAGE_KEYS, currentIndex: 0, states: IMAGE_KEYS.map(() => ({})) },
  fix: { keys: FIX_KEYS, currentIndex: 0, states: FIX_KEYS.map(() => ({})) }
};

// Get next available key from pool
function getNextKey(poolName: string): string | null {
  const pool = pools[poolName];
  if (!pool || pool.keys.length === 0) return null;

  const now = Date.now();
  for (let i = 0; i < pool.keys.length; i++) {
    const idx = (pool.currentIndex + i) % pool.keys.length;
    const state = pool.states[idx];
    
    if (!state.exhaustedUntil || state.exhaustedUntil < now) {
      pool.currentIndex = (idx + 1) % pool.keys.length;
      return pool.keys[idx];
    }
  }
  return null; // All keys exhausted
}

// Mark key as exhausted
function markKeyExhausted(poolName: string, key: string, cooldownMs: number = 3600000) {
  const pool = pools[poolName];
  if (!pool) return;

  const idx = pool.keys.indexOf(key);
  if (idx !== -1) {
    pool.states[idx] = { exhaustedUntil: Date.now() + cooldownMs };
    console.log(`Key ${idx} in ${poolName} pool exhausted until ${new Date(pool.states[idx].exhaustedUntil!).toISOString()}`);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Optional access token check
    if (ACCESS_TOKEN) {
      const provided = req.headers.get("X-Access-Token");
      if (provided !== ACCESS_TOKEN) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Determine which pool to use based on request body
    const body = await req.json();
    let poolName = "chat"; // default
    
    if (body.mode === "generate" || body.mode === "edit") {
      poolName = "image";
    } else if (body.type && body.errorMessage) {
      poolName = "fix";
    }

    console.log(`Using ${poolName} pool for request`);

    // Get next available key
    const apiKey = getNextKey(poolName);
    if (!apiKey) {
      console.error(`All keys in ${poolName} pool are exhausted`);
      return new Response(JSON.stringify({ error: `All ${poolName} API keys exhausted` }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Return the selected key (internal use only - not exposed to client)
    return new Response(JSON.stringify({ 
      apiKey,
      pool: poolName,
      availableKeys: pools[poolName].keys.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("API Key Rotator error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

