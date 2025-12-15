/**
 * Query Rewriter Module
 *
 * Optimizes user queries for web search using fast LLM inference.
 * Similar to ChatGPT's query rewriting that improves search precision.
 *
 * Key optimizations:
 * - Removes conversational filler ("can you", "please", etc.)
 * - Adds temporal context when needed (current year)
 * - Extracts core search intent
 * - Handles context from conversation
 *
 * Uses Gemini Flash Lite for fast, low-cost inference (~300ms).
 *
 * @module query-rewriter
 */

import { callGeminiFlashWithRetry } from './openrouter-client.ts';
import { getCurrentYear } from './config.ts';

/**
 * Options for query rewriting
 */
export interface RewriteOptions {
  /** Request ID for logging and tracing */
  requestId: string;
  /** Optional conversation context to help with query understanding */
  conversationContext?: string;
  /** Maximum tokens for the rewritten query (default: 50) */
  maxTokens?: number;
}

/**
 * Result of query rewriting
 */
export interface RewriteResult {
  /** The original query as submitted */
  originalQuery: string;
  /** The optimized search query */
  rewrittenQuery: string;
  /** Time taken for rewriting in milliseconds */
  latencyMs: number;
  /** Whether rewriting was skipped (used original) */
  skipped?: boolean;
  /** Reason for skipping if applicable */
  skipReason?: string;
}

/**
 * Rewrite user query for optimal search results
 *
 * Uses Gemini Flash Lite to transform natural language queries
 * into search-optimized queries. Returns original query if rewriting fails.
 *
 * @param query - The original user query
 * @param options - Rewrite options including requestId
 * @returns RewriteResult with original and rewritten queries
 *
 * @example
 * ```typescript
 * const result = await rewriteSearchQuery(
 *   "Can you please tell me what the weather is like in NYC?",
 *   { requestId: "req-123" }
 * );
 * // result.rewrittenQuery: "weather NYC"
 * ```
 */
export async function rewriteSearchQuery(
  query: string,
  options: RewriteOptions
): Promise<RewriteResult> {
  const startTime = Date.now();
  const { requestId, conversationContext, maxTokens = 50 } = options;

  // Check if we should skip rewriting
  const skipCheck = shouldRewriteQuery(query);
  if (!skipCheck.shouldRewrite) {
    const latencyMs = Date.now() - startTime;
    console.log(`[${requestId}] 📝 Query rewrite skipped: ${skipCheck.reason}`);
    return {
      originalQuery: query,
      rewrittenQuery: query,
      latencyMs,
      skipped: true,
      skipReason: skipCheck.reason
    };
  }

  // Build the rewrite prompt
  const currentYear = getCurrentYear();
  const prompt = `Rewrite this for web search. Be concise. Output ONLY the search query, nothing else.

User query: "${query}"
${conversationContext ? `Context: ${conversationContext}` : ''}

Rules:
- Remove conversational filler (please, can you, I want to, tell me)
- Keep specific names, dates, technical terms exactly as written
- Add year (${currentYear}) only if asking about "latest", "current", or "recent"
- Don't add year for historical or timeless questions
- Maximum 10 words
- No quotes or special formatting in output

Search query:`;

  try {
    const httpResponse = await callGeminiFlashWithRetry(
      [{ role: 'user', content: prompt }],
      {
        max_tokens: maxTokens,
        temperature: 0, // Deterministic for consistent results
        requestId
      }
    );

    if (!httpResponse.ok) {
      console.warn(
        `[${requestId}] Query rewrite API error (${httpResponse.status}), using original`
      );
      // CRITICAL: Drain response body to prevent resource leak
      // Unconsumed response bodies hold onto network resources and memory
      try {
        await httpResponse.text();
      } catch {
        // Ignore drain errors
      }
      return {
        originalQuery: query,
        rewrittenQuery: query,
        latencyMs: Date.now() - startTime
      };
    }

    const responseData = await httpResponse.json();
    let rewrittenQuery =
      responseData.choices?.[0]?.message?.content?.trim() || query;

    // Clean up any artifacts from the LLM response
    rewrittenQuery = cleanupRewrittenQuery(rewrittenQuery);

    const latencyMs = Date.now() - startTime;

    // Log the transformation
    if (rewrittenQuery !== query) {
      console.log(
        `[${requestId}] 📝 Query rewritten in ${latencyMs}ms: "${query}" → "${rewrittenQuery}"`
      );
    } else {
      console.log(
        `[${requestId}] 📝 Query unchanged after rewrite (${latencyMs}ms): "${query}"`
      );
    }

    return {
      originalQuery: query,
      rewrittenQuery,
      latencyMs
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.warn(`[${requestId}] Query rewrite failed, using original:`, error);

    return {
      originalQuery: query,
      rewrittenQuery: query, // Fallback to original
      latencyMs
    };
  }
}

/**
 * Check result from shouldRewriteQuery
 */
interface ShouldRewriteResult {
  shouldRewrite: boolean;
  reason?: string;
}

/**
 * Check if query rewriting would improve results
 * Skip for already-optimized or simple queries to save latency/cost
 *
 * @param query - The query to check
 * @returns Object indicating whether to rewrite and why
 *
 * @example
 * ```typescript
 * shouldRewriteQuery('NYC weather') // { shouldRewrite: false, reason: 'Query too short' }
 * shouldRewriteQuery('Can you tell me about React hooks?') // { shouldRewrite: true }
 * ```
 */
export function shouldRewriteQuery(query: string): ShouldRewriteResult {
  const trimmedQuery = query.trim();
  const lowerTrimmedQuery = trimmedQuery.toLowerCase();
  const words = trimmedQuery.split(/\s+/).length;

  // Skip if it's a URL (case-insensitive check)
  if (lowerTrimmedQuery.startsWith('http://') || lowerTrimmedQuery.startsWith('https://')) {
    return { shouldRewrite: false, reason: 'Query is a URL' };
  }

  // Skip if it contains code blocks
  if (trimmedQuery.includes('```')) {
    return { shouldRewrite: false, reason: 'Query contains code block' };
  }

  // Conversational markers that indicate rewriting would help
  const conversationalMarkers = [
    /^(can you|could you|please|i want|help me|show me|tell me|what is|what are|how do|how does|why is|why do|when did|where is|where are)/i
  ];

  // Check for conversational patterns first (before length check)
  // Even short queries like "What is X?" benefit from rewriting
  const hasConversationalMarker = conversationalMarkers.some((marker) =>
    marker.test(trimmedQuery)
  );

  if (hasConversationalMarker) {
    return { shouldRewrite: true };
  }

  // Skip very short queries without conversational markers (likely already optimized keywords)
  if (words <= 3) {
    return { shouldRewrite: false, reason: 'Query too short (≤3 words)' };
  }

  // Rewrite if it's a longer question (5+ words with ?)
  const isLongQuestion = words >= 5 && trimmedQuery.includes('?');

  if (isLongQuestion) {
    return { shouldRewrite: true };
  }

  // Default: don't rewrite short, non-conversational queries
  return { shouldRewrite: false, reason: 'Query already appears optimized' };
}

/**
 * Clean up artifacts from LLM rewrite response
 *
 * @param query - The raw rewritten query from LLM
 * @returns Cleaned query string
 */
function cleanupRewrittenQuery(query: string): string {
  let cleaned = query.trim();

  // Remove surrounding quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove common LLM artifacts
  cleaned = cleaned
    .replace(/^search query:\s*/i, '')
    .replace(/^query:\s*/i, '')
    .replace(/^here is.*?:\s*/i, '')
    .replace(/^the search query is:\s*/i, '')
    .trim();

  return cleaned;
}
