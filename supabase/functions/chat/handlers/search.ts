/**
 * Web search handler
 * Handles Tavily web search integration
 */

import {
  searchTavilyWithRetryTracking,
  formatSearchContext,
  calculateTavilyCost,
  logTavilyUsage,
} from "../../_shared/tavily-client.ts";
import { TAVILY_CONFIG } from "../../_shared/config.ts";

export interface SearchResult {
  searchContext: string;
  searchResultsData: {
    query: string;
    sources: Array<{
      title: string;
      url: string;
      snippet: string;
      relevanceScore: number;
    }>;
    timestamp: number;
  } | null;
  searchExecuted: boolean;
}

/**
 * Performs web search using Tavily API
 */
export async function performWebSearch(
  userMessage: string,
  userId: string | null,
  isGuest: boolean,
  requestId: string
): Promise<SearchResult> {
  try {
    const searchStartTime = Date.now();

    console.log(`[${requestId}] Executing Tavily web search`);

    // Execute Tavily search with retry logic
    const { response: searchResults, retryCount } =
      await searchTavilyWithRetryTracking(userMessage, {
        requestId,
        userId: userId ?? undefined,
        isGuest,
        functionName: "chat",
        maxResults: TAVILY_CONFIG.DEFAULT_MAX_RESULTS,
        searchDepth: TAVILY_CONFIG.DEFAULT_SEARCH_DEPTH,
        includeAnswer: TAVILY_CONFIG.DEFAULT_INCLUDE_ANSWER,
      });

    const searchLatencyMs = Date.now() - searchStartTime;
    const estimatedCost = calculateTavilyCost(
      TAVILY_CONFIG.DEFAULT_SEARCH_DEPTH
    );

    console.log(
      `[${requestId}]  Tavily search completed: ${searchResults.results.length} results in ${searchLatencyMs}ms`
    );

    // Format search results for context injection
    const searchContext = formatSearchContext(searchResults, {
      includeUrls: true,
      includeScores: false,
      maxResults: TAVILY_CONFIG.DEFAULT_MAX_RESULTS,
    });

    // Store formatted results for frontend UI
    const searchResultsData = {
      query: userMessage,
      sources: searchResults.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content.substring(0, 200), // Truncate for UI
        relevanceScore: result.score,
      })),
      timestamp: Date.now(),
    };

    // Fire-and-forget logging to database (don't block response)
    logTavilyUsage({
      requestId,
      functionName: "chat",
      userId: userId ?? undefined,
      isGuest,
      query: userMessage,
      resultCount: searchResults.results.length,
      searchDepth: TAVILY_CONFIG.DEFAULT_SEARCH_DEPTH,
      latencyMs: searchLatencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount,
    }).catch((logError) => {
      console.warn(`[${requestId}] Failed to log Tavily usage:`, logError);
    });

    return {
      searchContext,
      searchResultsData,
      searchExecuted: true,
    };
  } catch (searchError) {
    console.error(
      `[${requestId}]   Web search failed, continuing without search:`,
      searchError
    );

    // Graceful degradation - continue without search results
    const errorMessage =
      searchError instanceof Error ? searchError.message : String(searchError);

    // Log the search failure for monitoring
    logTavilyUsage({
      requestId,
      functionName: "chat",
      userId: userId ?? undefined,
      isGuest,
      query: userMessage,
      resultCount: 0,
      searchDepth: TAVILY_CONFIG.DEFAULT_SEARCH_DEPTH,
      latencyMs: 0,
      statusCode: 500,
      estimatedCost: 0,
      errorMessage,
      retryCount: 0,
    }).catch((logError) => {
      console.warn(`[${requestId}] Failed to log Tavily error:`, logError);
    });

    return {
      searchContext: "",
      searchResultsData: null,
      searchExecuted: false,
    };
  }
}
