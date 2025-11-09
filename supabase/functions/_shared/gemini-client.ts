/**
 * Gemini API Client Helper
 * Provides utilities for calling Google AI Studio Gemini API
 * Handles message format conversion from OpenAI-style to Gemini-native format
 */

/**
 * Round-robin counter for key rotation
 * Persists across function invocations within the same isolate
 */
const keyRotationCounters: Record<string, number> = {};

/**
 * Get list of available API keys for a given key pool
 * Supports multiple keys with _1, _2, _3 suffixes for round-robin rotation
 * @param baseKeyName - Base environment variable name (e.g., "GOOGLE_AI_STUDIO_KEY_CHAT")
 * @returns Array of available API keys
 */
function getAvailableKeys(baseKeyName: string): string[] {
  const keys: string[] = [];

  // Try base key first (without suffix)
  const baseKey = Deno.env.get(baseKeyName);
  if (baseKey) {
    keys.push(baseKey);
  }

  // Try numbered keys (_1, _2, _3, etc.)
  for (let i = 1; i <= 6; i++) {
    const key = Deno.env.get(`${baseKeyName}_${i}`);
    if (key) {
      keys.push(key);
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
    throw new Error(
      `${keyName} not configured. ` +
      `Set it with: supabase secrets set ${keyName}=your_key\n` +
      "Get your key from: https://aistudio.google.com/app/apikey"
    );
  }

  // Initialize counter for this key pool if not exists
  if (!(keyName in keyRotationCounters)) {
    keyRotationCounters[keyName] = 0;
  }

  // Get next key using round-robin
  const keyIndex = keyRotationCounters[keyName] % availableKeys.length;
  const selectedKey = availableKeys[keyIndex];

  // Increment counter for next request
  keyRotationCounters[keyName] = (keyRotationCounters[keyName] + 1) % availableKeys.length;

  // Validate API key format (Google AI Studio keys start with "AIza")
  if (!selectedKey.startsWith("AIza") || selectedKey.length < 30) {
    console.warn(
      `⚠️ ${keyName} key #${keyIndex + 1} may be invalid. ` +
      "Expected format: AIzaSy... (39 characters)"
    );
  }

  console.log(`🔑 Using ${keyName} key #${keyIndex + 1} of ${availableKeys.length}`);

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
 */
export function extractTextFromGeminiResponse(responseData: any): string {
  return responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
