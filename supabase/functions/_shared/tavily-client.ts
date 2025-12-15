/**
 * Tavily API Client
 *
 * Provides real-time web search AND content extraction capabilities via Tavily API.
 * Enables grounded, factual responses with up-to-date information from the web.
 *
 * Key Features:
 * - Real-time web search with AI-optimized results (Search API)
 * - URL content extraction for reading full webpage content (Extract API)
 * - Context formatting for LLM injection
 * - Automatic retry with exponential backoff
 * - Request tracking and logging
 * - Cost tracking and analytics
 *
 * API Documentation: https://docs.tavily.com/docs/tavily-api/introduction
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { RETRY_CONFIG, TAVILY_CONFIG } from './config.ts';

// Tavily API configuration
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
const TAVILY_BASE_URL = "https://api.tavily.com";

/**
 * Custom error class for Tavily API errors with status code tracking
 * Enables proper retry logic without string parsing
 */
export class TavilyAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'TavilyAPIError';
  }
}

// Validate API key
if (!TAVILY_API_KEY) {
  console.warn(
    "⚠️  TAVILY_API_KEY not configured - web search will fail.\n" +
    "Get your key from: https://tavily.com\n" +
    "Set it with: supabase secrets set TAVILY_API_KEY=tvly-..."
  );
}

/**
 * Tavily search request parameters
 */
export interface TavilySearchRequest {
  /** Search query string */
  query: string;
  /** Number of results to return (default: 5, max: 10 for Basic plan) */
  max_results?: number;
  /** Include raw content from search results (default: false) */
  include_raw_content?: boolean;
  /** Include images in results (default: false) */
  include_images?: boolean;
  /** Include answer summary (default: false) */
  include_answer?: boolean;
  /** Search depth: 'basic' or 'advanced' (default: 'basic') */
  search_depth?: 'basic' | 'advanced';
  /** Domain filter: include only these domains */
  include_domains?: string[];
  /** Domain filter: exclude these domains */
  exclude_domains?: string[];
}

/**
 * Individual search result from Tavily
 */
export interface TavilySearchResult {
  /** Page title */
  title: string;
  /** Page URL */
  url: string;
  /** Relevant content snippet */
  content: string;
  /** Raw page content (if include_raw_content: true) */
  raw_content?: string;
  /** Relevance score (0-1) */
  score: number;
}

/**
 * Image result from Tavily
 */
export interface TavilyImageResult {
  /** Image URL */
  url: string;
  /** Image description */
  description?: string;
}

/**
 * Complete Tavily API response
 */
export interface TavilySearchResponse {
  /** Search query that was executed */
  query: string;
  /** Array of search results */
  results: TavilySearchResult[];
  /** AI-generated answer summary (if include_answer: true) */
  answer?: string;
  /** Image results (if include_images: true) */
  images?: TavilyImageResult[];
  /** Response time in seconds */
  response_time?: number;
}

/**
 * Options for searchTavily function
 */
export interface SearchTavilyOptions {
  /** Request ID for tracing */
  requestId?: string;
  /** User ID for usage tracking */
  userId?: string;
  /** Whether user is a guest (for analytics) */
  isGuest?: boolean;
  /** Function name for logging */
  functionName?: string;
  /** Number of results to return (default: 5) */
  maxResults?: number;
  /** Search depth: 'basic' or 'advanced' (default: 'basic') */
  searchDepth?: 'basic' | 'advanced';
  /** Include AI-generated answer summary */
  includeAnswer?: boolean;
  /** Include images in results */
  includeImages?: boolean;
}

/**
 * Retry result with tracking
 */
export interface TavilyRetryResult {
  response: TavilySearchResponse;
  retryCount: number;
}

// ============================================================================
// EXTRACT API - Types and Interfaces
// ============================================================================

/**
 * Tavily Extract request parameters
 */
export interface TavilyExtractRequest {
  /** Array of URLs to extract content from (max 20 per request) */
  urls: string[];
  /** Include images from the extracted content (default: false) */
  include_images?: boolean;
  /** Extract depth: 'basic' extracts main content, 'advanced' extracts more context */
  extract_depth?: 'basic' | 'advanced';
}

/**
 * Individual extraction result from Tavily
 */
export interface TavilyExtractResult {
  /** The URL that was extracted */
  url: string;
  /** Extracted raw content from the page (markdown/text format) */
  raw_content: string;
  /** Images found on the page (if include_images: true) */
  images?: string[];
}

/**
 * Failed extraction result
 */
export interface TavilyExtractFailedResult {
  /** The URL that failed to extract */
  url: string;
  /** Error message explaining the failure */
  error: string;
}

/**
 * Complete Tavily Extract API response
 */
export interface TavilyExtractResponse {
  /** Successfully extracted results */
  results: TavilyExtractResult[];
  /** URLs that failed to extract */
  failed_results?: TavilyExtractFailedResult[];
  /** Response time in seconds */
  response_time?: number;
}

/**
 * Options for extractUrls function
 */
export interface ExtractUrlsOptions {
  /** Request ID for tracing */
  requestId?: string;
  /** User ID for usage tracking */
  userId?: string;
  /** Whether user is a guest (for analytics) */
  isGuest?: boolean;
  /** Function name for logging */
  functionName?: string;
  /** Include images in extraction */
  includeImages?: boolean;
  /** Extract depth: 'basic' or 'advanced' */
  extractDepth?: 'basic' | 'advanced';
}

/**
 * Retry result for Extract API
 */
export interface TavilyExtractRetryResult {
  response: TavilyExtractResponse;
  retryCount: number;
}

/**
 * Search the web using Tavily API
 *
 * @param query - Search query string
 * @param options - Configuration options
 * @returns Search results from Tavily
 *
 * @example
 * ```ts
 * const results = await searchTavily(
 *   "latest developments in AI",
 *   { requestId, maxResults: 5 }
 * );
 * ```
 */
export async function searchTavily(
  query: string,
  options?: SearchTavilyOptions
): Promise<TavilySearchResponse> {
  const {
    requestId = crypto.randomUUID(),
    maxResults = 5,
    searchDepth = 'basic',
    includeAnswer = false,
    includeImages = false
  } = options || {};

  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  if (!query || query.trim().length === 0) {
    throw new Error("Search query cannot be empty");
  }

  // P2: Query length validation (max 500 characters per Tavily API limits)
  if (query.trim().length > 500) {
    throw new Error(`Search query exceeds maximum length of 500 characters (current: ${query.trim().length})`);
  }

  // P1: Cost estimation warning for advanced search
  if (searchDepth === 'advanced') {
    console.warn(
      `[${requestId}] ⚠️  Using advanced search depth - estimated cost: $0.002 (2x basic rate). ` +
      `Consider using basic search for cost optimization.`
    );
  }

  console.log(`[${requestId}] 🔍 Tavily search: "${query.substring(0, 100)}..." (max_results: ${maxResults}, depth: ${searchDepth})`);

  const requestBody: TavilySearchRequest = {
    query: query.trim(),
    max_results: Math.min(maxResults, 10), // Cap at API limit
    search_depth: searchDepth,
    include_answer: includeAnswer,
    include_images: includeImages,
    include_raw_content: false // Saves tokens
  };

  // P0: Add timeout using AbortSignal
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TAVILY_CONFIG.SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${TAVILY_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // API authentication uses Bearer token format (verified via Tavily API docs)
        // Format: "Bearer tvly-YOUR_API_KEY"
        "Authorization": `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal // P0: Timeout protection
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[${requestId}] ❌ Tavily API error (${response.status}):`,
        errorText.substring(0, 200)
      );
      // P1: Throw TavilyAPIError with status code for proper retry logic
      throw new TavilyAPIError(
        `Tavily API error: ${response.status}`,
        response.status,
        errorText
      );
    }

    const data: TavilySearchResponse = await response.json();
    // Response body is implicitly drained by response.json() call above.
    // No manual drainage needed as the response body is fully consumed
    // when parsing JSON, preventing connection leaks.

    console.log(
      `[${requestId}] ✅ Tavily returned ${data.results.length} results` +
      (data.answer ? " with answer summary" : "") +
      (data.images ? ` and ${data.images.length} images` : "")
    );

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // P0: Handle AbortError from timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(
        `[${requestId}] ❌ Tavily search timed out after ${TAVILY_CONFIG.SEARCH_TIMEOUT_MS}ms`
      );
      throw new TavilyAPIError(
        `Search request timed out after ${TAVILY_CONFIG.SEARCH_TIMEOUT_MS}ms`,
        408, // Request Timeout
        'timeout'
      );
    }

    // Re-throw TavilyAPIError or other errors
    throw error;
  }
}

/**
 * Search Tavily with exponential backoff retry logic
 * Handles transient failures gracefully
 *
 * @param query - Search query string
 * @param options - Configuration options
 * @param retryCount - Current retry attempt (internal)
 * @returns Search results from Tavily
 */
export async function searchTavilyWithRetry(
  query: string,
  options?: SearchTavilyOptions,
  retryCount = 0
): Promise<TavilySearchResponse> {
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    return await searchTavily(query, { ...options, requestId });
  } catch (error) {
    // P1: Improved error type checking using custom TavilyAPIError
    let isRetryable = false;
    let statusCode = 0;
    let errorMessage = '';

    if (error instanceof TavilyAPIError) {
      // Direct status code checking (no string parsing needed)
      statusCode = error.statusCode;
      errorMessage = error.message;
      isRetryable =
        statusCode === 429 || // Rate limited
        statusCode === 503 || // Service unavailable
        statusCode === 408; // Request timeout
    } else if (error instanceof Error) {
      // Generic network errors (ECONNRESET, DNS failures, etc.)
      errorMessage = error.message;
      isRetryable =
        errorMessage.includes("network") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ECONNREFUSED");
    } else {
      errorMessage = String(error);
    }

    if (isRetryable && retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delayMs = Math.min(
        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS
      );

      console.log(
        `[${requestId}] Tavily error (status: ${statusCode || 'network'}), retrying after ${delayMs}ms ` +
        `(${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES}): ${errorMessage.substring(0, 100)}`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));

      return searchTavilyWithRetry(query, options, retryCount + 1);
    }

    // Not retryable or max retries exceeded
    console.error(`[${requestId}] ❌ Tavily search failed:`, errorMessage);
    throw error;
  }
}

/**
 * Search Tavily with retry tracking - returns both results and retry count
 * Use this when you need to log the actual number of retries that occurred
 *
 * @param query - Search query string
 * @param options - Configuration options
 * @returns Object with search results and retry count
 */
export async function searchTavilyWithRetryTracking(
  query: string,
  options?: SearchTavilyOptions
): Promise<TavilyRetryResult> {
  const requestId = options?.requestId || crypto.randomUUID();

  // Internal recursive function that tracks retry count
  async function attemptWithRetry(retryCount = 0): Promise<TavilyRetryResult> {
    try {
      const response = await searchTavily(query, { ...options, requestId });
      return { response, retryCount };
    } catch (error) {
      // P1: Improved error type checking using custom TavilyAPIError
      let isRetryable = false;
      let statusCode = 0;
      let errorMessage = '';

      if (error instanceof TavilyAPIError) {
        // Direct status code checking (no string parsing needed)
        statusCode = error.statusCode;
        errorMessage = error.message;
        isRetryable =
          statusCode === 429 || // Rate limited
          statusCode === 503 || // Service unavailable
          statusCode === 408; // Request timeout
      } else if (error instanceof Error) {
        // Generic network errors (ECONNRESET, DNS failures, etc.)
        errorMessage = error.message;
        isRetryable =
          errorMessage.includes("network") ||
          errorMessage.includes("ECONNRESET") ||
          errorMessage.includes("ETIMEDOUT") ||
          errorMessage.includes("ECONNREFUSED");
      } else {
        errorMessage = String(error);
      }

      if (isRetryable && retryCount < RETRY_CONFIG.MAX_RETRIES) {
        const delayMs = Math.min(
          RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
          RETRY_CONFIG.MAX_DELAY_MS
        );

        console.log(
          `[${requestId}] Tavily error (status: ${statusCode || 'network'}), retrying after ${delayMs}ms ` +
          `(${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES}): ${errorMessage.substring(0, 100)}`
        );

        await new Promise(resolve => setTimeout(resolve, delayMs));

        return attemptWithRetry(retryCount + 1);
      }

      throw error;
    }
  }

  return attemptWithRetry(0);
}

/**
 * Format Tavily search results for LLM context injection
 * Converts search results into a structured format optimized for AI consumption
 *
 * @param searchResults - Tavily search response
 * @param options - Formatting options
 * @returns Formatted context string for LLM
 *
 * @example
 * ```ts
 * const results = await searchTavily("AI news");
 * const context = formatSearchContext(results);
 * // Use context in system prompt or user message
 * ```
 */
export function formatSearchContext(
  searchResults: TavilySearchResponse,
  options?: {
    includeUrls?: boolean;
    includeScores?: boolean;
    maxResults?: number;
  }
): string {
  const {
    includeUrls = true,
    includeScores = false,
    maxResults = 5
  } = options || {};

  if (!searchResults.results || searchResults.results.length === 0) {
    return `No search results found for query: "${searchResults.query}"`;
  }

  let context = `Web Search Results for: "${searchResults.query}"\n\n`;

  // Include AI-generated answer if available
  if (searchResults.answer) {
    context += `Summary: ${searchResults.answer}\n\n`;
  }

  // Format each search result
  const resultsToInclude = searchResults.results.slice(0, maxResults);

  resultsToInclude.forEach((result, index) => {
    context += `[${index + 1}] ${result.title}\n`;

    if (includeUrls) {
      context += `URL: ${result.url}\n`;
    }

    if (includeScores) {
      context += `Relevance: ${(result.score * 100).toFixed(1)}%\n`;
    }

    context += `${result.content}\n\n`;
  });

  // Add metadata footer
  context += `---\n`;
  context += `Results: ${resultsToInclude.length} of ${searchResults.results.length} total\n`;

  if (searchResults.response_time) {
    context += `Search time: ${searchResults.response_time.toFixed(2)}s\n`;
  }

  return context;
}

/**
 * Calculate cost for a Tavily API call
 * Pricing (Basic plan): $0.001 per search request
 *
 * Note: Advanced search depth costs more but pricing varies by plan.
 * This is a conservative estimate for the Basic plan.
 *
 * @param searchDepth - Search depth used ('basic' or 'advanced')
 * @returns Estimated cost in USD
 */
export function calculateTavilyCost(searchDepth: 'basic' | 'advanced' = 'basic'): number {
  // Basic plan pricing
  const BASIC_COST_PER_SEARCH = 0.001;
  const ADVANCED_MULTIPLIER = 2; // Estimate - advanced search costs ~2x

  return searchDepth === 'advanced'
    ? BASIC_COST_PER_SEARCH * ADVANCED_MULTIPLIER
    : BASIC_COST_PER_SEARCH;
}

/**
 * Log Tavily usage to database for admin dashboard analytics
 * Fire-and-forget logging - doesn't block the response
 *
 * Database Schema:
 * - provider: Supports 'openrouter', 'gemini', and 'tavily'
 * - model: For Tavily, uses format 'tavily-search-{basic|advanced}'
 * - input_tokens/output_tokens: Always 0 for search API (not token-based)
 * - estimated_cost: Cost per search request based on search depth
 * - prompt_preview: Contains the actual search query sent to Tavily (may be rewritten)
 *                   If originalQuery is provided and different, formats as "original → rewritten"
 *
 * @param logData - Usage data to log
 */
export async function logTavilyUsage(logData: {
  requestId: string;
  functionName: string;
  userId?: string;
  isGuest: boolean;
  query: string;
  originalQuery?: string;
  resultCount: number;
  searchDepth: 'basic' | 'advanced';
  latencyMs: number;
  statusCode: number;
  estimatedCost: number;
  errorMessage?: string;
  retryCount: number;
}): Promise<void> {
  try {
    // Create service role client for database access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Format prompt_preview to show both original and rewritten query if applicable
    let promptPreview = logData.query.substring(0, 200);
    if (logData.originalQuery && logData.originalQuery !== logData.query) {
      promptPreview = `${logData.originalQuery} → ${logData.query}`.substring(0, 200);
    }

    const { error } = await supabase.from("ai_usage_logs").insert({
      request_id: logData.requestId,
      function_name: logData.functionName,
      provider: 'tavily',
      model: `tavily-search-${logData.searchDepth}`,
      user_id: logData.userId || null,
      is_guest: logData.isGuest,
      input_tokens: 0, // Search API doesn't use tokens
      output_tokens: 0,
      total_tokens: 0,
      latency_ms: logData.latencyMs,
      status_code: logData.statusCode,
      estimated_cost: logData.estimatedCost,
      error_message: logData.errorMessage || null,
      retry_count: logData.retryCount,
      prompt_preview: promptPreview,
      response_length: logData.resultCount
    });

    if (error) {
      console.error(`[${logData.requestId}] Failed to log Tavily usage:`, error);
      // Don't throw - logging failures shouldn't break the main flow
    } else {
      console.log(`[${logData.requestId}] 📊 Tavily usage logged to database`);
    }
  } catch (error) {
    console.error(`[${logData.requestId}] Exception logging Tavily usage:`, error);
    // Swallow error - logging is best-effort
  }
}

// ============================================================================
// EXTRACT API - Implementation
// ============================================================================

/**
 * Extract content from URLs using Tavily Extract API
 *
 * Use this to fetch and read the full content of web pages when users share URLs
 * or when you need to read linked resources. Complements the Search API which
 * finds pages - Extract actually reads them.
 *
 * @param urls - Array of URLs to extract content from (max 20)
 * @param options - Configuration options
 * @returns Extracted content from each URL
 *
 * @example
 * ```ts
 * const results = await extractUrls(
 *   ["https://example.com/article"],
 *   { requestId, extractDepth: 'basic' }
 * );
 * ```
 */
export async function extractUrls(
  urls: string[],
  options?: ExtractUrlsOptions
): Promise<TavilyExtractResponse> {
  const {
    requestId = crypto.randomUUID(),
    extractDepth = 'basic',
    includeImages = false
  } = options || {};

  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  if (!urls || urls.length === 0) {
    throw new Error("URLs array cannot be empty");
  }

  // Tavily Extract API limit: max 20 URLs per request
  if (urls.length > 20) {
    throw new Error(`Maximum 20 URLs per request (received: ${urls.length})`);
  }

  // Validate URLs format
  const invalidUrls = urls.filter(url => {
    try {
      new URL(url);
      return false;
    } catch {
      return true;
    }
  });

  if (invalidUrls.length > 0) {
    throw new Error(`Invalid URL(s): ${invalidUrls.join(', ')}`);
  }

  console.log(`[${requestId}] 📄 Tavily extract: ${urls.length} URL(s) (depth: ${extractDepth})`);

  const requestBody: TavilyExtractRequest = {
    urls,
    extract_depth: extractDepth,
    include_images: includeImages
  };

  // Add timeout using AbortSignal
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TAVILY_CONFIG.SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${TAVILY_BASE_URL}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[${requestId}] ❌ Tavily Extract API error (${response.status}):`,
        errorText.substring(0, 200)
      );
      throw new TavilyAPIError(
        `Tavily Extract API error: ${response.status}`,
        response.status,
        errorText
      );
    }

    const data: TavilyExtractResponse = await response.json();

    const successCount = data.results?.length || 0;
    const failedCount = data.failed_results?.length || 0;

    console.log(
      `[${requestId}] ✅ Tavily extracted ${successCount} URL(s)` +
      (failedCount > 0 ? `, ${failedCount} failed` : "")
    );

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle AbortError from timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(
        `[${requestId}] ❌ Tavily extract timed out after ${TAVILY_CONFIG.SEARCH_TIMEOUT_MS}ms`
      );
      throw new TavilyAPIError(
        `Extract request timed out after ${TAVILY_CONFIG.SEARCH_TIMEOUT_MS}ms`,
        408, // Request Timeout
        'timeout'
      );
    }

    throw error;
  }
}

/**
 * Extract URLs with exponential backoff retry logic
 *
 * @param urls - Array of URLs to extract content from
 * @param options - Configuration options
 * @param retryCount - Current retry attempt (internal)
 * @returns Extracted content from each URL
 */
export async function extractUrlsWithRetry(
  urls: string[],
  options?: ExtractUrlsOptions,
  retryCount = 0
): Promise<TavilyExtractResponse> {
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    return await extractUrls(urls, { ...options, requestId });
  } catch (error) {
    let isRetryable = false;
    let statusCode = 0;
    let errorMessage = '';

    if (error instanceof TavilyAPIError) {
      statusCode = error.statusCode;
      errorMessage = error.message;
      isRetryable =
        statusCode === 429 || // Rate limited
        statusCode === 503 || // Service unavailable
        statusCode === 408;   // Request timeout
    } else if (error instanceof Error) {
      errorMessage = error.message;
      isRetryable =
        errorMessage.includes("network") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ECONNREFUSED");
    } else {
      errorMessage = String(error);
    }

    if (isRetryable && retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delayMs = Math.min(
        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS
      );

      console.log(
        `[${requestId}] Tavily extract error (status: ${statusCode || 'network'}), retrying after ${delayMs}ms ` +
        `(${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES}): ${errorMessage.substring(0, 100)}`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));

      return extractUrlsWithRetry(urls, options, retryCount + 1);
    }

    console.error(`[${requestId}] ❌ Tavily extract failed:`, errorMessage);
    throw error;
  }
}

/**
 * Format Tavily extract results for LLM context injection
 * Converts extracted content into a structured format for AI consumption
 *
 * @param extractResults - Tavily extract response
 * @param options - Formatting options
 * @returns Formatted context string for LLM
 *
 * @example
 * ```ts
 * const results = await extractUrls(["https://example.com"]);
 * const context = formatExtractContext(results);
 * // Use context in system prompt or user message
 * ```
 */
export function formatExtractContext(
  extractResults: TavilyExtractResponse,
  options?: {
    /** Maximum content length per URL (default: 5000 chars) */
    maxContentLength?: number;
    /** Include URLs in output (default: true) */
    includeUrls?: boolean;
  }
): string {
  const {
    maxContentLength = 5000,
    includeUrls = true
  } = options || {};

  if (!extractResults.results || extractResults.results.length === 0) {
    if (extractResults.failed_results && extractResults.failed_results.length > 0) {
      return `Failed to extract content from URLs:\n${
        extractResults.failed_results.map(f => `- ${f.url}: ${f.error}`).join('\n')
      }`;
    }
    return "No content was extracted from the provided URLs.";
  }

  let context = `Extracted Web Content\n${'='.repeat(50)}\n\n`;

  extractResults.results.forEach((result, index) => {
    context += `[${index + 1}] `;

    if (includeUrls) {
      context += `${result.url}\n`;
      context += `${'-'.repeat(40)}\n`;
    }

    // Truncate content if too long
    let content = result.raw_content;
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + '\n... [content truncated]';
    }

    context += `${content}\n\n`;
  });

  // Report any failures
  if (extractResults.failed_results && extractResults.failed_results.length > 0) {
    context += `\n⚠️ Failed to extract:\n`;
    extractResults.failed_results.forEach(failed => {
      context += `- ${failed.url}: ${failed.error}\n`;
    });
  }

  // Add metadata
  context += `\n---\n`;
  context += `Successfully extracted: ${extractResults.results.length} URL(s)\n`;

  if (extractResults.response_time) {
    context += `Extract time: ${extractResults.response_time.toFixed(2)}s\n`;
  }

  return context;
}

/**
 * Calculate cost for a Tavily Extract API call
 * Pricing: 1 credit per 5 URLs (basic plan)
 *
 * @param urlCount - Number of URLs extracted
 * @param extractDepth - Extract depth used ('basic' or 'advanced')
 * @returns Estimated cost in USD
 */
export function calculateExtractCost(
  urlCount: number,
  extractDepth: 'basic' | 'advanced' = 'basic'
): number {
  // Basic plan: 1 credit per 5 URLs = ~$0.001 per 5 URLs
  const CREDIT_COST = 0.001;
  const URLS_PER_CREDIT = 5;
  const ADVANCED_MULTIPLIER = 2;

  const credits = Math.ceil(urlCount / URLS_PER_CREDIT);
  const baseCost = credits * CREDIT_COST;

  return extractDepth === 'advanced'
    ? baseCost * ADVANCED_MULTIPLIER
    : baseCost;
}
