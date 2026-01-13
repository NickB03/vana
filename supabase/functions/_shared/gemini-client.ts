// deno-lint-ignore-file no-explicit-any
/**
 * Unified Gemini Client via OpenRouter
 *
 * Single client for ALL LLM operations using Gemini 3 Flash:
 * - Artifact generation (with thinking mode)
 * - Title generation (fast mode)
 * - Conversation summaries (fast mode)
 * - Query rewriting (fast mode)
 *
 * Replaces: glm-client.ts, glm-chat-router.ts
 * Simplifies: All LLM operations use OpenRouter + Gemini
 *
 * Gemini 3 Flash Specifications:
 * - Model ID: google/gemini-3-flash-preview
 * - Context: 1M tokens (vs GLM's 200K)
 * - Pricing: $0.50/M input, $3/M output
 * - Thinking: reasoning.effort levels (minimal, low, medium, high)
 * - Tool calling: Full OpenAI-compatible support
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { MODELS, RETRY_CONFIG } from './config.ts';

// API configuration
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_GEMINI_FLASH_KEY");
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Validate API key
if (!OPENROUTER_KEY) {
  console.warn(
    "⚠️  OPENROUTER_GEMINI_FLASH_KEY not configured - Gemini operations will fail.\n" +
    "Get your key from: https://openrouter.ai/keys\n" +
    "Set it with: supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-..."
  );
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Message format for Gemini (OpenAI-compatible)
 */
export interface GeminiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * Tool definition for function calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: unknown;
    }>;
    required: string[];
  };
}

/**
 * Parsed tool call from response
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  thoughtSignature?: string;  // Gemini 3 signature preservation for extended thinking
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Thinking/reasoning levels for Gemini
 */
export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Options for calling Gemini
 */
export interface CallGeminiOptions {
  model?: string;  // Default: GEMINI_3_FLASH
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  userId?: string;
  isGuest?: boolean;
  functionName?: string;
  promptPreview?: string;
  stream?: boolean;
  enableThinking?: boolean;  // Enable reasoning mode
  thinkingLevel?: ThinkingLevel;  // Thinking effort level
  tools?: ToolDefinition[];
  toolChoice?: "auto" | { type: "function"; function: { name: string } };
  timeoutMs?: number;
  mediaResolution?: 'low' | 'medium' | 'high' | 'ultra_high';  // Image/video processing quality
}

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

/**
 * Call Gemini 3 Flash via OpenRouter
 *
 * @param messages - Array of messages in OpenAI format
 * @param options - Configuration options
 * @returns Response object (streamed or complete)
 */
export async function callGemini(
  messages: GeminiMessage[],
  options?: CallGeminiOptions
): Promise<Response> {
  const {
    model = MODELS.GEMINI_3_FLASH,
    temperature = 1.0,
    max_tokens = 8000,
    requestId = crypto.randomUUID(),
    stream = false,
    enableThinking = false,
    thinkingLevel = 'medium',
    tools,
    toolChoice,
    timeoutMs = 120000,
    mediaResolution
  } = options || {};

  console.log(
    `[${requestId}] 🚀 Calling Gemini 3 Flash via OpenRouter ` +
    `(stream: ${stream}, thinking: ${enableThinking ? thinkingLevel : 'off'})`
  );

  // Build request body
  const body: any = {
    model,
    messages,
    temperature,
    max_tokens,
    stream,
    // OpenRouter-specific optimizations
    transforms: stream ? ["middle-out"] : undefined
  };

  // Add thinking/reasoning if enabled
  if (enableThinking) {
    body.reasoning = {
      effort: thinkingLevel
    };
  }

  // Add media resolution for image/video processing (Gemini 3 feature)
  if (mediaResolution) {
    body.media_resolution = mediaResolution;
  }

  // Add tools if provided
  if (tools && tools.length > 0) {
    body.tools = tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    if (toolChoice) {
      body.tool_choice = toolChoice;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_URL") || "https://your-domain.com",
        "X-Title": "AI Chat Assistant"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[${requestId}] ⏱️  Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Call Gemini with exponential backoff retry logic
 *
 * @param messages - Array of messages
 * @param options - Configuration options
 * @param retryCount - Current retry attempt (internal)
 * @returns Response object
 */
export async function callGeminiWithRetry(
  messages: GeminiMessage[],
  options?: CallGeminiOptions,
  retryCount = 0
): Promise<Response> {
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    const response = await callGemini(messages, {
      ...options,
      requestId
    });

    if (response.ok) {
      return response;
    }

    // Handle rate limiting (429) and service overload (503)
    if (response.status === 429 || response.status === 503) {
      if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
        // CRITICAL: Drain response body to prevent resource leak
        await response.text();

        const delayMs = Math.min(
          RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
          RETRY_CONFIG.MAX_DELAY_MS
        );

        const retryAfter = response.headers.get('Retry-After');
        const actualDelayMs = retryAfter ? parseInt(retryAfter) * 1000 : delayMs;

        const errorType = response.status === 429 ? "Rate limited" : "Service overloaded";
        console.log(
          `[${requestId}] ${errorType} (${response.status}). ` +
          `Retry ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES} after ${actualDelayMs}ms`
        );

        await new Promise(resolve => setTimeout(resolve, actualDelayMs));
        return callGeminiWithRetry(messages, options, retryCount + 1);
      } else {
        console.error(`[${requestId}] Max retries exceeded (status: ${response.status})`);
      }
    }

    return response;

  } catch (error) {
    if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delayMs = Math.min(
        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS
      );
      console.log(`[${requestId}] Network error, retrying after ${delayMs}ms:`, error);

      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callGeminiWithRetry(messages, options, retryCount + 1);
    }

    throw error;
  }
}

// ============================================================================
// ARTIFACT GENERATION
// ============================================================================

/**
 * Generate artifact using Gemini 3 Flash with thinking mode
 *
 * @param systemPrompt - System instructions
 * @param userPrompt - User request
 * @param options - Configuration options
 * @returns Response object (streamed)
 */
export async function generateArtifact(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    enableThinking?: boolean;
    thinkingLevel?: ThinkingLevel;
    tools?: ToolDefinition[];
    toolChoice?: "auto" | { type: "function"; function: { name: string } };
    requestId?: string;
    userId?: string;
    isGuest?: boolean;
  }
): Promise<Response> {
  const {
    enableThinking = true,  // Default ON for artifacts
    thinkingLevel = 'medium',
    tools,
    toolChoice,
    requestId = crypto.randomUUID(),
    userId,
    isGuest = false
  } = options || {};

  const messages: GeminiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  return await callGeminiWithRetry(messages, {
    model: MODELS.GEMINI_3_FLASH,
    temperature: 1.0,
    max_tokens: 32000,  // Gemini 3 Flash supports larger outputs
    requestId,
    userId,
    isGuest,
    functionName: 'generate-artifact',
    promptPreview: userPrompt.substring(0, 200),
    stream: true,  // Always stream artifacts
    enableThinking,
    thinkingLevel,
    tools,
    toolChoice,
    timeoutMs: 120000
  });
}

// ============================================================================
// FAST TASKS (titles, summaries, queries)
// ============================================================================

/**
 * Generate conversation title using Gemini (fast mode)
 *
 * @param conversationHistory - Recent messages formatted as string
 * @param requestId - Optional request ID for logging
 * @returns Generated title
 */
export async function generateTitle(
  conversationHistory: string,
  requestId?: string
): Promise<string> {
  const rid = requestId || crypto.randomUUID();

  const systemPrompt = `You are a title generator for an AI chat application.

Your task: Generate concise, descriptive conversation titles.

Output requirements:
- Maximum 50 characters
- Capture the main topic or user intent
- Use title case (capitalize major words)
- No quotes, no explanation, just the title
- If coding-related, include the technology (e.g., "React Todo App")
- If question-based, summarize the topic (e.g., "Python List Sorting")`;

  const userPrompt = `Generate a title for this conversation:

${conversationHistory}

Title:`;

  const messages: GeminiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const response = await callGeminiWithRetry(messages, {
    model: MODELS.GEMINI_FLASH,  // Use 2.5 Flash Lite for fast, cheap title generation
    temperature: 0.7,
    max_tokens: 50,
    requestId: rid,
    functionName: 'generate-title',
    promptPreview: conversationHistory.substring(0, 100),
    enableThinking: false,
    timeoutMs: 30000
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${rid}] Title generation failed:`, errorText);
    throw new Error(`Title generation failed: ${response.status}`);
  }

  const data = await response.json();
  return extractText(data, rid) || "New Chat";
}

/**
 * Generate conversation summary using Gemini 2.5 Flash Lite (fast mode)
 *
 * @param conversationHistory - Full conversation formatted as string
 * @param requestId - Optional request ID for logging
 * @returns Generated summary
 */
export async function generateSummary(
  conversationHistory: string,
  requestId?: string
): Promise<string> {
  const rid = requestId || crypto.randomUUID();

  const systemPrompt = `You are a conversation summarizer for an AI chat application.

Your task: Create concise summaries for conversation history compression.

Output requirements:
- 2-3 sentences maximum
- Capture: main topic, key decisions/outcomes, any pending items
- Use past tense for completed items, present for ongoing
- Preserve important technical details (library names, error messages, etc.)
- Focus on information that helps continue the conversation later`;

  const userPrompt = `Summarize this conversation for context retention:

${conversationHistory}

Summary:`;

  const messages: GeminiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const response = await callGeminiWithRetry(messages, {
    model: MODELS.GEMINI_FLASH,  // Use 2.5 Flash Lite for fast, cheap summarization
    temperature: 0.7,
    max_tokens: 200,
    requestId: rid,
    functionName: 'summarize-conversation',
    promptPreview: conversationHistory.substring(0, 100),
    enableThinking: false,
    timeoutMs: 30000
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${rid}] Summary generation failed:`, errorText);
    throw new Error(`Summary generation failed: ${response.status}`);
  }

  const data = await response.json();
  return extractText(data, rid) || "";
}

/**
 * Rewrite search query for better results using Gemini (fast mode)
 *
 * @param query - Original search query
 * @param context - Optional conversation context
 * @param requestId - Optional request ID for logging
 * @returns Rewritten query
 */
export async function rewriteQuery(
  query: string,
  context?: string,
  requestId?: string
): Promise<string> {
  const rid = requestId || crypto.randomUUID();

  const systemPrompt = `You are a search query optimizer for web search.

Your task: Transform conversational questions into effective search queries.

Optimization rules:
- Remove conversational filler ("can you", "please", "I want to know")
- Extract core keywords and entities
- Add current year (${new Date().getFullYear()}) for time-sensitive topics
- Keep technical terms intact (API names, library versions)
- Output: Just the optimized query, nothing else`;

  const userPrompt = context
    ? `Optimize for web search using conversation context.

Context: ${context}

Original query: ${query}

Optimized query:`
    : `Optimize for web search.

Original query: ${query}

Optimized query:`;

  const messages: GeminiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const response = await callGeminiWithRetry(messages, {
    model: MODELS.GEMINI_3_FLASH,
    temperature: 1.0,  // Gemini 3 recommended temperature
    max_tokens: 100,
    requestId: rid,
    functionName: 'query-rewriter',
    promptPreview: query.substring(0, 100),
    enableThinking: false,  // Fast mode
    timeoutMs: 30000
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${rid}] Query rewrite failed:`, errorText);
    // Return original query on failure
    return query;
  }

  const data = await response.json();
  return extractText(data, rid) || query;
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

/**
 * Extract text content from Gemini response
 * Handles both streaming chunks and complete responses
 *
 * @param data - Response data (JSON)
 * @param requestId - Optional request ID for logging
 * @returns Extracted text content
 */
export function extractText(data: any, requestId?: string): string {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // Streaming chunk format: choices[0].delta.content
  if (data?.choices?.[0]?.delta?.content) {
    return data.choices[0].delta.content;
  }

  // Complete response format: choices[0].message.content
  if (data?.choices?.[0]?.message?.content) {
    const text = data.choices[0].message.content;
    console.log(`${logPrefix} ✅ Extracted text (${text.length} chars)`);
    return text;
  }

  // Direct content field
  if (data?.content && typeof data.content === 'string') {
    console.log(`${logPrefix} ✅ Extracted text from direct content (${data.content.length} chars)`);
    return data.content;
  }

  // Error case - log structure for debugging
  console.error(
    `${logPrefix} ❌ Failed to extract text from response:`,
    JSON.stringify(data).substring(0, 200)
  );
  return "";
}

/**
 * Extract tool calls from Gemini response
 * Handles both streaming (delta) and non-streaming (message) formats
 *
 * @param data - Response data (JSON)
 * @param requestId - Optional request ID for logging
 * @returns Array of tool calls or null
 */
export function extractToolCalls(data: any, requestId?: string): ToolCall[] | null {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // Check both streaming (delta) and non-streaming (message) formats
  // Streaming: data.choices[0].delta.tool_calls
  // Non-streaming: data.choices[0].message.tool_calls
  const toolCalls = data?.choices?.[0]?.delta?.tool_calls
    || data?.choices?.[0]?.message?.tool_calls;

  if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
    return null;
  }

  try {
    const parsed: ToolCall[] = toolCalls.map((tc: any) => ({
      id: tc.id,
      name: tc.function?.name || '',
      arguments: typeof tc.function?.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function?.arguments || {},
      // Preserve thought signature for Gemini 3 extended thinking (supports both camelCase and snake_case)
      thoughtSignature: tc.thoughtSignature || tc.thought_signature || undefined
    }));

    console.log(`${logPrefix} 🔧 Extracted ${parsed.length} tool call(s)`);
    return parsed;

  } catch (error) {
    console.error(`${logPrefix} ❌ Failed to parse tool calls:`, error);
    return null;
  }
}

/**
 * Extract reasoning details from Gemini response
 * Handles both streaming (delta) and non-streaming (message) formats
 * Gemini uses reasoning_details array vs GLM's reasoning_content
 *
 * @param data - Response data (JSON)
 * @param requestId - Optional request ID for logging
 * @returns Reasoning text or null
 */
export function extractReasoning(data: any, requestId?: string): string | null {
  const logPrefix = requestId ? `[${requestId}]` : "";

  // Check both streaming (delta) and non-streaming (message) formats
  // Streaming: data.choices[0].delta.reasoning_details
  // Non-streaming: data.choices[0].message.reasoning_details
  const reasoningDetails = data?.choices?.[0]?.delta?.reasoning_details
    || data?.choices?.[0]?.message?.reasoning_details;

  if (!reasoningDetails || !Array.isArray(reasoningDetails)) {
    return null;
  }

  try {
    // Concatenate all reasoning steps
    const reasoning = reasoningDetails
      .map((step: any) => step.content || '')
      .filter((content: string) => content.length > 0)
      .join('\n\n');

    if (reasoning.length > 0) {
      console.log(`${logPrefix} 🧠 Extracted reasoning (${reasoning.length} chars)`);
      return reasoning;
    }

    return null;

  } catch (error) {
    console.error(`${logPrefix} ❌ Failed to parse reasoning:`, error);
    return null;
  }
}

/**
 * Extract token usage from Gemini response
 *
 * @param data - Response data (JSON)
 * @returns Token usage object
 */
export function extractTokenUsage(data: any): TokenUsage {
  const usage = data?.usage || {};
  return {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0
  };
}

/**
 * Calculate cost for Gemini 3 Flash
 * Pricing: $0.50/M input, $3/M output
 *
 * @param inputTokens - Input token count
 * @param outputTokens - Output token count
 * @returns Estimated cost in USD
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const INPUT_PRICE_PER_M = 0.50;
  const OUTPUT_PRICE_PER_M = 3.00;

  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M;

  return inputCost + outputCost;
}

// ============================================================================
// USAGE LOGGING
// ============================================================================

/**
 * Log AI usage to database for admin dashboard analytics
 * Fire-and-forget logging - doesn't block the response
 *
 * @param logData - Usage data to log
 */
export async function logGeminiUsage(logData: {
  requestId: string;
  functionName: string;
  userId?: string;
  isGuest: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  estimatedCost: number;
  errorMessage?: string;
  retryCount: number;
  promptPreview?: string;
  responseLength?: number;
}): Promise<void> {
  try {
    // Create service role client for database access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error } = await supabase.from("ai_usage_logs").insert({
      request_id: logData.requestId,
      function_name: logData.functionName,
      provider: 'openrouter',
      model: MODELS.GEMINI_3_FLASH,
      user_id: logData.userId || null,
      is_guest: logData.isGuest,
      input_tokens: logData.inputTokens,
      output_tokens: logData.outputTokens,
      total_tokens: logData.totalTokens,
      latency_ms: logData.latencyMs,
      status_code: logData.statusCode,
      estimated_cost: logData.estimatedCost,
      error_message: logData.errorMessage || null,
      retry_count: logData.retryCount,
      prompt_preview: logData.promptPreview?.substring(0, 200) || null,
      response_length: logData.responseLength || null
    });

    if (error) {
      console.error(`[${logData.requestId}] Failed to log AI usage:`, error);
      // Don't throw - logging failures shouldn't break the main flow
    } else {
      console.log(`[${logData.requestId}] 📊 Usage logged to database`);
    }
  } catch (error) {
    console.error(`[${logData.requestId}] Exception logging AI usage:`, error);
    // Swallow error - logging is best-effort
  }
}

/**
 * Call Gemini with tool result and continue conversation
 *
 * Used for tool-calling flow after tool execution completes.
 * Builds proper conversation history with tool context and continues the response.
 *
 * @param systemPrompt - System instructions
 * @param userPrompt - Original user message
 * @param toolCall - The tool call that was executed
 * @param toolResult - Result from tool execution (formatted as string)
 * @param previousAssistantToolCalls - Tool calls from the previous assistant message
 * @param options - Configuration options
 * @returns Response object (streamed)
 */
export async function callGeminiWithToolResult(
  systemPrompt: string,
  userPrompt: string,
  toolCall: ToolCall,
  toolResult: string,
  previousAssistantToolCalls: ToolCall[],
  options?: CallGeminiOptions
): Promise<Response> {
  const requestId = options?.requestId || crypto.randomUUID();

  console.log(
    `[${requestId}] 🔄 Continuing Gemini with tool result: ${toolCall.name} ` +
    `(result: ${toolResult.length} chars)`
  );

  // Build conversation history with tool context
  // Format: system → user → assistant (with tool_calls) → tool (with result)
  const messages: GeminiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
    {
      role: "assistant",
      content: "", // Empty content when assistant made tool calls
      tool_calls: previousAssistantToolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments)
        },
        // Include thought signature for Gemini 3 extended thinking continuation
        ...(tc.thoughtSignature ? { thoughtSignature: tc.thoughtSignature } : {})
      }))
    },
    {
      role: "tool",
      content: toolResult,
      tool_call_id: toolCall.id,
      name: toolCall.name
    }
  ];

  // Call Gemini with the enriched conversation history
  return await callGeminiWithRetry(messages, {
    ...options,
    requestId,
    stream: true // Tool continuations are always streamed
  });
}

/**
 * Process streaming response and extract text + reasoning
 * Handles SSE stream parsing for Gemini
 *
 * @param response - Fetch response with streaming body
 * @param requestId - Request ID for logging
 * @returns Async generator yielding chunks
 */
export async function* processGeminiStream(
  response: Response,
  requestId: string
): AsyncGenerator<{ type: 'content' | 'reasoning' | 'tool_call' | 'error'; data: any }, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(`[${requestId}] ✅ Stream complete`);
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;

        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            console.log(`[${requestId}] 🏁 Stream done marker received`);
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Extract content chunks
            const content = parsed?.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: 'content', data: content };
            }

            // Extract tool calls
            const toolCalls = extractToolCalls(parsed, requestId);
            if (toolCalls) {
              yield { type: 'tool_call', data: toolCalls };
            }

            // Extract reasoning (if available in streaming)
            const reasoning = extractReasoning(parsed, requestId);
            if (reasoning) {
              yield { type: 'reasoning', data: reasoning };
            }

          } catch (error) {
            console.warn(`[${requestId}] Failed to parse SSE chunk:`, error);
          }
        }
      }
    }

  } catch (error) {
    console.error(`[${requestId}] ❌ Stream processing error:`, error);
    yield { type: 'error', data: error };
  } finally {
    reader.releaseLock();
  }
}
