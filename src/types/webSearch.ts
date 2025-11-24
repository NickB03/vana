import { z } from 'zod';

/**
 * Zod schemas for runtime validation of web search results
 * Prevents crashes from malformed Tavily API responses
 */

// Runtime validation schema for individual search source
export const WebSearchSourceSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url().max(2000),
  snippet: z.string().max(5000),
  favicon: z.string().url().max(2000).optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  publishedDate: z.string().optional(),
});

// Runtime validation schema for complete search results
export const WebSearchResultsSchema = z.object({
  query: z.string().min(1).max(1000),
  sources: z.array(WebSearchSourceSchema).min(1).max(20),
  timestamp: z.number(),
  searchTime: z.number().optional(), // Time taken for search in ms
});

// Infer TypeScript types from Zod schemas (single source of truth)
export type WebSearchSource = z.infer<typeof WebSearchSourceSchema>;
export type WebSearchResults = z.infer<typeof WebSearchResultsSchema>;

// Configuration constants
export const WEB_SEARCH_CONFIG = {
  MAX_SOURCES: 20,
  MAX_TITLE_LENGTH: 500,
  MAX_SNIPPET_LENGTH: 5000,
  MAX_URL_LENGTH: 2000,
  MAX_QUERY_LENGTH: 1000,
  SNIPPET_TRUNCATE_LENGTH: 200, // For UI display
  ENABLE_VIRTUALIZATION_THRESHOLD: 10,
} as const;

/**
 * Safe parsing function with error logging
 * Returns null if validation fails (graceful degradation)
 */
export function parseWebSearchResults(data: unknown): WebSearchResults | null {
  try {
    return WebSearchResultsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[WebSearchParser] Invalid search results:', {
        errors: error.errors,
        rawData: data,
      });
    }
    return null;
  }
}

/**
 * Extract domain name from URL for display
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Truncate snippet for display with ellipsis
 */
export function truncateSnippet(snippet: string, maxLength = WEB_SEARCH_CONFIG.SNIPPET_TRUNCATE_LENGTH): string {
  if (snippet.length <= maxLength) return snippet;
  return snippet.slice(0, maxLength).trim() + '...';
}

/**
 * Get favicon URL from domain (uses Google's favicon service as fallback)
 */
export function getFaviconUrl(url: string, providedFavicon?: string): string {
  if (providedFavicon) return providedFavicon;

  try {
    const domain = extractDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=example.com&sz=32`;
  }
}
