/**
 * Gemini API Client Helper
 * Provides utilities for calling Google AI Studio Gemini API
 * Handles message format conversion from OpenAI-style to Gemini-native format
 */

/**
 * Round-robin counter for key rotation
 * Persists across function invocations within the same isolate
 * Note: Edge Functions may cold-start frequently, so we also use random selection as fallback
 */
const keyRotationCounters: Record<string, number> = {};

/**
 * Get a random integer between 0 (inclusive) and max (exclusive)
 */
function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/**
 * Get list of available API keys for a given key pool
 * Maps feature-specific key pools to the existing GOOGLE_KEY_1 through GOOGLE_KEY_6 secrets
 * @param baseKeyName - Base environment variable name (e.g., "GOOGLE_AI_STUDIO_KEY_CHAT")
 * @returns Array of available API keys
 */
function getAvailableKeys(baseKeyName: string): string[] {
  const keys: string[] = [];

  // Map feature-specific key pools to existing numbered secrets
  // This allows us to use the existing GOOGLE_KEY_1 through GOOGLE_KEY_10 without renaming
  const keyMapping: Record<string, number[]> = {
    "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],         // Chat (Flash model) uses keys 1-2 (4 RPM total)
    "GOOGLE_AI_STUDIO_KEY_ARTIFACT": [3, 4, 5, 6], // Artifact generation + fixing (Pro model) uses keys 3-6 (8 RPM total)
    "GOOGLE_AI_STUDIO_KEY_IMAGE": [7, 8, 9, 10], // Image generation uses keys 7-10 (60 RPM total)
  };

  // Get the key indices for this pool
  const keyIndices = keyMapping[baseKeyName];

  if (keyIndices) {
    // Use the mapped indices to get keys from GOOGLE_KEY_N
    for (const index of keyIndices) {
      const key = Deno.env.get(`GOOGLE_KEY_${index}`);
      if (key) {
        keys.push(key);
      }
    }
  } else {
    // Fallback: try the base key name directly (for backwards compatibility)
    const baseKey = Deno.env.get(baseKeyName);
    if (baseKey) {
      keys.push(baseKey);
    }
  }

  return keys;
}

/**
 * Get next API key using round-robin rotation
 * Automatically rotates through available keys to distribute load
 * @param keyName - Environment variable name (e.g., "GOOGLE_AI_STUDIO_KEY_CHAT")
 * @returns API key string
 */
function getValidatedApiKey(keyName: string = "GOOGLE_AI_STUDIO_KEY"): string {
  const availableKeys = getAvailableKeys(keyName);

  if (availableKeys.length === 0) {
    // Provide helpful error message based on the key pool
    const keyMapping: Record<string, string> = {
      "GOOGLE_AI_STUDIO_KEY_CHAT": "GOOGLE_KEY_1 and GOOGLE_KEY_2",
      "GOOGLE_AI_STUDIO_KEY_ARTIFACT": "GOOGLE_KEY_3, GOOGLE_KEY_4, GOOGLE_KEY_5, and GOOGLE_KEY_6",
      "GOOGLE_AI_STUDIO_KEY_IMAGE": "GOOGLE_KEY_7, GOOGLE_KEY_8, GOOGLE_KEY_9, and GOOGLE_KEY_10",
    };
    const requiredKeys = keyMapping[keyName] || keyName;

    throw new Error(
      `${keyName} not configured. Required secrets: ${requiredKeys}\n` +
      `Set them with: supabase secrets set GOOGLE_KEY_N=your_key\n` +
      "Get keys from: https://aistudio.google.com/app/apikey"
    );
  }

  // Initialize counter for this key pool if not exists
  // Use random starting point to distribute load even with cold starts
  if (!(keyName in keyRotationCounters)) {
    keyRotationCounters[keyName] = getRandomInt(availableKeys.length);
  }

  // Get next key using round-robin (with random starting point)
  const keyIndex = keyRotationCounters[keyName] % availableKeys.length;
  const selectedKey = availableKeys[keyIndex];

  // Increment counter for next request (within this isolate)
  keyRotationCounters[keyName] = (keyRotationCounters[keyName] + 1) % availableKeys.length;

  // DEBUG: Log which key is being used (without exposing the actual key)
  const keyMapping: Record<string, number[]> = {
    "GOOGLE_AI_STUDIO_KEY_CHAT": [1, 2],
    "GOOGLE_AI_STUDIO_KEY_ARTIFACT": [3, 4, 5, 6],
    "GOOGLE_AI_STUDIO_KEY_IMAGE": [7, 8, 9, 10],
  };
  const mappedIndices = keyMapping[keyName];
  if (mappedIndices) {
    const actualKeyIndex = mappedIndices[keyIndex];
    console.log(`🔑 Using GOOGLE_KEY_${actualKeyIndex} (position ${keyIndex + 1}/${availableKeys.length} in pool)`);
  }

  // Validate API key format (Google AI Studio keys start with "AIza")
  if (!selectedKey.startsWith("AIza") || selectedKey.length < 30) {
    // Extract pool name without index to avoid information disclosure
    const poolName = keyName.split('_').pop() || 'unknown';
    console.warn(
      `⚠️ Invalid API key format detected in ${poolName} pool. ` +
      "Expected format: AIzaSy... (39 characters). Check your secrets configuration."
    );
  }

  // Log key pool being used without exposing key indices
  const poolName = keyName.split('_').pop() || 'unknown';
  console.log(`🔑 Using key pool: ${poolName} (${availableKeys.length} keys available)`);

  return selectedKey;
}

/**
 * Public API to get an API key with round-robin rotation
 * @param keyName - Environment variable name (e.g., "GOOGLE_AI_STUDIO_KEY_CHAT")
 * @returns API key string
 */
export function getApiKey(keyName: string = "GOOGLE_AI_STUDIO_KEY"): string {
  return getValidatedApiKey(keyName);
}

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

export interface OpenAIStyleMessage {
  role: "system" | "user" | "assistant";
  content: string;
  parts?: Array<{ text?: string; type?: string; image_url?: { url: string } }>;
}

/**
 * Convert OpenAI-style messages to Gemini format
 * System messages are filtered out (handled separately via systemInstruction)
 */
export function convertToGeminiFormat(messages: OpenAIStyleMessage[]): GeminiMessage[] {
  return messages
    .filter(msg => msg.role !== "system")
    .map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: msg.parts || [{ text: msg.content }]
    }));
}

/**
 * Extract system message from messages array
 * Gemini uses a separate systemInstruction field for system prompts
 */
export function extractSystemMessage(messages: OpenAIStyleMessage[]): string | null {
  const systemMsg = messages.find(msg => msg.role === "system");
  return systemMsg?.content || null;
}

/**
 * Call Gemini API with streaming
 * Uses Server-Sent Events (SSE) for incremental responses
 */
export async function callGeminiStream(
  model: string,
  contents: GeminiMessage[],
  options?: {
    systemInstruction?: string;
    tools?: any[];
    temperature?: number;
    topK?: number;
    topP?: number;
    keyName?: string;
  }
): Promise<Response> {
  const GOOGLE_API_KEY = getValidatedApiKey(options?.keyName);

  const body: any = {
    contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      topK: options?.topK ?? 40,
      topP: options?.topP ?? 0.95,
    }
  };

  if (options?.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    };
  }

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }

  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    }
  );
}

/**
 * Call Gemini API without streaming
 * Returns complete response in single request
 */
export async function callGemini(
  model: string,
  contents: GeminiMessage[],
  options?: {
    systemInstruction?: string;
    temperature?: number;
    topK?: number;
    topP?: number;
    keyName?: string;
  }
): Promise<Response> {
  const GOOGLE_API_KEY = getValidatedApiKey(options?.keyName);

  const body: any = {
    contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      topK: options?.topK ?? 40,
      topP: options?.topP ?? 0.95,
    }
  };

  if (options?.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    };
  }

  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    }
  );
}

/**
 * Extract text content from Gemini response
 * Handles the candidates[0].content.parts[0].text structure
 * Now with enhanced logging for debugging
 */
export function extractTextFromGeminiResponse(responseData: any, requestId?: string): string {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // Try standard format: candidates[0].content.parts[0].text
  if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
    const text = responseData.candidates[0].content.parts[0].text;
    console.log(`${logPrefix} Extracted text from candidates format, length: ${text.length}`);
    return text;
  }

  // Try direct content.parts format
  if (responseData?.content?.parts?.[0]?.text) {
    const text = responseData.content.parts[0].text;
    console.log(`${logPrefix} Extracted text from direct content format, length: ${text.length}`);
    return text;
  }

  // Try root-level text
  if (responseData?.text && typeof responseData.text === 'string') {
    console.log(`${logPrefix} Extracted text from root level, length: ${responseData.text.length}`);
    return responseData.text;
  }

  // Log structure if extraction failed
  console.error(`${logPrefix} Failed to extract text. Response structure:`, JSON.stringify(responseData, null, 2).substring(0, 500));
  return "";
}

/**
 * Parse Gemini SSE stream chunk
 * Converts "data: {...}" format to JSON object
 */
export function parseGeminiStreamChunk(line: string): any {
  if (line.startsWith("data: ")) {
    try {
      return JSON.parse(line.slice(6));
    } catch {
      return null;
    }
  }
  return null;
}
