/**
 * Example usage of Tavily API Client
 *
 * This file demonstrates how to use the Tavily client in Edge Functions.
 * Copy these patterns when implementing web search in your functions.
 */

import {
  searchTavily,
  searchTavilyWithRetry,
  searchTavilyWithRetryTracking,
  formatSearchContext,
  calculateTavilyCost,
  logTavilyUsage,
  type SearchTavilyOptions,
  type TavilySearchResponse
} from '../tavily-client.ts';

/**
 * Example 1: Basic search
 */
export async function basicSearchExample() {
  const requestId = crypto.randomUUID();

  try {
    const results = await searchTavily(
      "latest developments in artificial intelligence",
      {
        requestId,
        maxResults: 5,
        searchDepth: 'basic'
      }
    );

    console.log(`Found ${results.results.length} results`);
    console.log(results);
  } catch (error) {
    console.error(`Search failed:`, error);
  }
}

/**
 * Example 2: Search with retry logic
 */
export async function searchWithRetryExample() {
  const requestId = crypto.randomUUID();

  try {
    const results = await searchTavilyWithRetry(
      "current weather patterns",
      {
        requestId,
        maxResults: 3,
        searchDepth: 'basic'
      }
    );

    console.log(`Search successful after retries`);
    return results;
  } catch (error) {
    console.error(`Search failed after retries:`, error);
    throw error;
  }
}

/**
 * Example 3: Search with retry tracking (for analytics)
 */
export async function searchWithTrackingExample() {
  const requestId = crypto.randomUUID();
  const userId = "user_123";
  const startTime = Date.now();

  try {
    const { response, retryCount } = await searchTavilyWithRetryTracking(
      "machine learning tutorials",
      {
        requestId,
        userId,
        isGuest: false,
        functionName: 'chat',
        maxResults: 5,
        searchDepth: 'basic'
      }
    );

    const latencyMs = Date.now() - startTime;
    const estimatedCost = calculateTavilyCost('basic');

    // Log usage to database (fire-and-forget)
    await logTavilyUsage({
      requestId,
      functionName: 'chat',
      userId,
      isGuest: false,
      query: "machine learning tutorials",
      resultCount: response.results.length,
      searchDepth: 'basic',
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount
    });

    console.log(`Search completed with ${retryCount} retries`);
    return response;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log failure
    await logTavilyUsage({
      requestId,
      functionName: 'chat',
      userId,
      isGuest: false,
      query: "machine learning tutorials",
      resultCount: 0,
      searchDepth: 'basic',
      latencyMs,
      statusCode: 500,
      estimatedCost: 0,
      errorMessage,
      retryCount: 0
    });

    throw error;
  }
}

/**
 * Example 4: Format results for LLM context injection
 */
export async function formatForLLMExample() {
  const requestId = crypto.randomUUID();

  const results = await searchTavilyWithRetry(
    "best practices for React hooks",
    {
      requestId,
      maxResults: 5,
      searchDepth: 'basic',
      includeAnswer: true // Get AI-generated summary
    }
  );

  // Format for LLM consumption
  const context = formatSearchContext(results, {
    includeUrls: true,
    includeScores: false, // Hide relevance scores from LLM
    maxResults: 3 // Only use top 3 results
  });

  console.log("Formatted context for LLM:\n", context);

  // Use in system prompt or user message
  const systemPrompt = `You are a helpful assistant. Use the following web search results to answer the user's question:\n\n${context}`;

  return systemPrompt;
}

/**
 * Example 5: Advanced search with images
 */
export async function advancedSearchExample() {
  const requestId = crypto.randomUUID();

  const results = await searchTavily(
    "data visualization examples",
    {
      requestId,
      maxResults: 5,
      searchDepth: 'advanced', // More thorough search
      includeImages: true, // Include image results
      includeAnswer: true // Include AI summary
    }
  );

  console.log(`Found ${results.results.length} results`);

  if (results.answer) {
    console.log(`AI Summary: ${results.answer}`);
  }

  if (results.images && results.images.length > 0) {
    console.log(`Found ${results.images.length} images:`);
    results.images.forEach((img, i) => {
      console.log(`  [${i + 1}] ${img.url}`);
      if (img.description) {
        console.log(`      ${img.description}`);
      }
    });
  }

  return results;
}

/**
 * Example 6: Complete Edge Function integration
 */
export async function edgeFunctionIntegrationExample(
  req: Request
): Promise<Response> {
  const requestId = crypto.randomUUID();

  // Parse request body
  const { query, userId, isGuest } = await req.json();

  const startTime = Date.now();

  try {
    // Perform search with retry tracking
    const { response, retryCount } = await searchTavilyWithRetryTracking(
      query,
      {
        requestId,
        userId,
        isGuest,
        functionName: 'search',
        maxResults: 5,
        searchDepth: 'basic'
      }
    );

    const latencyMs = Date.now() - startTime;
    const estimatedCost = calculateTavilyCost('basic');

    // Log usage (fire-and-forget)
    logTavilyUsage({
      requestId,
      functionName: 'search',
      userId,
      isGuest,
      query,
      resultCount: response.results.length,
      searchDepth: 'basic',
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount
    });

    // Format for LLM
    const context = formatSearchContext(response, {
      includeUrls: true,
      includeScores: false,
      maxResults: 5
    });

    // Return formatted response
    return new Response(
      JSON.stringify({
        success: true,
        results: response,
        context,
        metadata: {
          requestId,
          resultCount: response.results.length,
          latencyMs,
          retryCount
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log failure
    logTavilyUsage({
      requestId,
      functionName: 'search',
      userId,
      isGuest,
      query,
      resultCount: 0,
      searchDepth: 'basic',
      latencyMs,
      statusCode: 500,
      estimatedCost: 0,
      errorMessage,
      retryCount: 0
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        requestId
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
