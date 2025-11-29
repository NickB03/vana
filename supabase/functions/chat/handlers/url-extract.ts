/**
 * URL Content Extraction Handler
 *
 * Detects URLs in user messages and extracts their content using Tavily Extract API.
 * This enables the AI to read and understand web pages that users share in chat.
 *
 * Use Cases:
 * - User pastes an article URL and asks for a summary
 * - User shares documentation links for context
 * - User asks questions about content from a specific webpage
 */

import {
  extractUrlsWithRetry,
  formatExtractContext,
  calculateExtractCost,
  type TavilyExtractResponse,
} from "../../_shared/tavily-client.ts";

export interface UrlExtractResult {
  /** Formatted content for LLM context injection */
  extractedContext: string;
  /** Structured data for frontend UI display */
  extractedUrlsData: {
    urls: string[];
    successCount: number;
    failedCount: number;
    timestamp: number;
  } | null;
  /** Whether extraction was executed */
  extractionExecuted: boolean;
  /** URLs that were detected in the message */
  detectedUrls: string[];
}

/**
 * URL detection regex
 * Matches http/https URLs with common patterns
 * Excludes common false positives (e.g., version numbers like v1.2.3)
 */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Domains to exclude from extraction (internal, auth, etc.)
 */
const EXCLUDED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'supabase.co',  // Internal Supabase URLs
  'supabase.com',
];

/**
 * Maximum URLs to extract per message (to prevent abuse)
 */
const MAX_URLS_PER_MESSAGE = 5;

/**
 * Maximum content length per URL to include in context
 */
const MAX_CONTENT_PER_URL = 4000;

/**
 * Detect URLs in a message
 *
 * @param message - User message to scan for URLs
 * @returns Array of detected URLs
 */
export function detectUrls(message: string): string[] {
  const matches = message.match(URL_REGEX) || [];

  // Filter out excluded domains and deduplicate
  const validUrls = matches
    .filter(url => {
      try {
        const parsed = new URL(url);
        return !EXCLUDED_DOMAINS.some(domain =>
          parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
        );
      } catch {
        return false;
      }
    })
    .filter((url, index, self) => self.indexOf(url) === index) // Dedupe
    .slice(0, MAX_URLS_PER_MESSAGE); // Limit count

  return validUrls;
}

/**
 * Check if URL extraction should be performed
 *
 * @param message - User message
 * @param detectedUrls - URLs found in the message
 * @returns Whether to perform extraction
 */
export function shouldExtractUrls(message: string, detectedUrls: string[]): boolean {
  if (detectedUrls.length === 0) {
    return false;
  }

  // Always extract if user explicitly asks to read/summarize/explain a URL
  const explicitReadPatterns = [
    /\b(read|summarize|explain|analyze|review|check|look at|what does|what's in|tell me about)\b/i,
    /\b(this (article|page|link|url|site|website|doc|documentation))\b/i,
    /\b(from (the|this) (link|url|page|article))\b/i,
  ];

  const hasExplicitReadIntent = explicitReadPatterns.some(pattern =>
    pattern.test(message)
  );

  if (hasExplicitReadIntent) {
    return true;
  }

  // For messages with URLs but no explicit read intent, still extract
  // if the message is short (likely just sharing a link for context)
  const isShortMessageWithUrl = message.length < 200 && detectedUrls.length > 0;

  return isShortMessageWithUrl;
}

/**
 * Extract content from URLs in a user message
 *
 * @param userMessage - The user's message containing URLs
 * @param userId - User ID for analytics (null for guests)
 * @param isGuest - Whether this is a guest user
 * @param requestId - Request ID for tracing
 * @returns Extraction result with context and metadata
 */
export async function extractUrlContent(
  userMessage: string,
  userId: string | null,
  isGuest: boolean,
  requestId: string
): Promise<UrlExtractResult> {
  // Detect URLs in the message
  const detectedUrls = detectUrls(userMessage);

  // Check if we should extract
  if (!shouldExtractUrls(userMessage, detectedUrls)) {
    return {
      extractedContext: "",
      extractedUrlsData: null,
      extractionExecuted: false,
      detectedUrls,
    };
  }

  try {
    const extractStartTime = Date.now();

    console.log(`[${requestId}] 📄 Extracting content from ${detectedUrls.length} URL(s)`);

    // Execute Tavily extract with retry logic
    const extractResults: TavilyExtractResponse = await extractUrlsWithRetry(
      detectedUrls,
      {
        requestId,
        userId: userId ?? undefined,
        isGuest,
        functionName: "chat",
        extractDepth: 'basic',
        includeImages: false,
      }
    );

    const extractLatencyMs = Date.now() - extractStartTime;
    const successCount = extractResults.results?.length || 0;
    const failedCount = extractResults.failed_results?.length || 0;

    console.log(
      `[${requestId}] ✅ URL extraction completed: ${successCount} success, ${failedCount} failed in ${extractLatencyMs}ms`
    );

    // Format extracted content for context injection
    const extractedContext = formatExtractContext(extractResults, {
      maxContentLength: MAX_CONTENT_PER_URL,
      includeUrls: true,
    });

    // Store structured data for frontend UI
    const extractedUrlsData = {
      urls: detectedUrls,
      successCount,
      failedCount,
      timestamp: Date.now(),
    };

    // Log usage for analytics (fire-and-forget)
    // Note: Reusing Tavily search logging pattern - could create dedicated extract logging
    const estimatedCost = calculateExtractCost(detectedUrls.length, 'basic');
    console.log(`[${requestId}] 📊 URL extract cost estimate: $${estimatedCost.toFixed(4)}`);

    return {
      extractedContext,
      extractedUrlsData,
      extractionExecuted: true,
      detectedUrls,
    };
  } catch (extractError) {
    console.error(
      `[${requestId}] ❌ URL extraction failed, continuing without extracted content:`,
      extractError
    );

    // Graceful degradation - continue without extracted content
    return {
      extractedContext: "",
      extractedUrlsData: null,
      extractionExecuted: false,
      detectedUrls,
    };
  }
}
