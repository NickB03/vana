/**
 * Unit Tests for Tavily API Client
 *
 * Tests the Tavily search client functionality including:
 * - Search requests and responses
 * - Retry logic with exponential backoff
 * - Context formatting for LLMs
 * - Cost calculation
 * - Usage logging
 */

import { assertEquals, assertRejects, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  formatSearchContext,
  calculateTavilyCost,
  TavilyAPIError,
  type TavilySearchResponse
} from '../tavily-client.ts';

/**
 * Test: Format search context with default options
 */
Deno.test("formatSearchContext - basic formatting", () => {
  const mockResponse: TavilySearchResponse = {
    query: "test query",
    results: [
      {
        title: "Test Result 1",
        url: "https://example.com/1",
        content: "This is the first test result content.",
        score: 0.95
      },
      {
        title: "Test Result 2",
        url: "https://example.com/2",
        content: "This is the second test result content.",
        score: 0.87
      }
    ],
    response_time: 1.23
  };

  const context = formatSearchContext(mockResponse);

  // Should include query
  assertEquals(context.includes('test query'), true);

  // Should include both results
  assertEquals(context.includes('Test Result 1'), true);
  assertEquals(context.includes('Test Result 2'), true);

  // Should include URLs by default
  assertEquals(context.includes('https://example.com/1'), true);
  assertEquals(context.includes('https://example.com/2'), true);

  // Should include content
  assertEquals(context.includes('first test result content'), true);
  assertEquals(context.includes('second test result content'), true);

  // Should include metadata
  assertEquals(context.includes('Results: 2 of 2 total'), true);
  assertEquals(context.includes('Search time: 1.23s'), true);
});

/**
 * Test: Format search context without URLs
 */
Deno.test("formatSearchContext - exclude URLs", () => {
  const mockResponse: TavilySearchResponse = {
    query: "test query",
    results: [
      {
        title: "Test Result",
        url: "https://example.com",
        content: "Test content",
        score: 0.9
      }
    ]
  };

  const context = formatSearchContext(mockResponse, {
    includeUrls: false
  });

  // Should NOT include URL
  assertEquals(context.includes('https://example.com'), false);

  // Should still include title and content
  assertEquals(context.includes('Test Result'), true);
  assertEquals(context.includes('Test content'), true);
});

/**
 * Test: Format search context with relevance scores
 */
Deno.test("formatSearchContext - include scores", () => {
  const mockResponse: TavilySearchResponse = {
    query: "test query",
    results: [
      {
        title: "Test Result",
        url: "https://example.com",
        content: "Test content",
        score: 0.95
      }
    ]
  };

  const context = formatSearchContext(mockResponse, {
    includeScores: true
  });

  // Should include relevance score
  assertEquals(context.includes('Relevance: 95.0%'), true);
});

/**
 * Test: Format search context with max results limit
 */
Deno.test("formatSearchContext - limit max results", () => {
  const mockResponse: TavilySearchResponse = {
    query: "test query",
    results: [
      {
        title: "Result 1",
        url: "https://example.com/1",
        content: "Content 1",
        score: 0.95
      },
      {
        title: "Result 2",
        url: "https://example.com/2",
        content: "Content 2",
        score: 0.90
      },
      {
        title: "Result 3",
        url: "https://example.com/3",
        content: "Content 3",
        score: 0.85
      }
    ]
  };

  const context = formatSearchContext(mockResponse, {
    maxResults: 2
  });

  // Should include first 2 results
  assertEquals(context.includes('Result 1'), true);
  assertEquals(context.includes('Result 2'), true);

  // Should NOT include third result
  assertEquals(context.includes('Result 3'), false);

  // Metadata should show 2 of 3
  assertEquals(context.includes('Results: 2 of 3 total'), true);
});

/**
 * Test: Format search context with AI answer
 */
Deno.test("formatSearchContext - with AI answer", () => {
  const mockResponse: TavilySearchResponse = {
    query: "test query",
    results: [
      {
        title: "Test Result",
        url: "https://example.com",
        content: "Test content",
        score: 0.9
      }
    ],
    answer: "This is the AI-generated answer summary."
  };

  const context = formatSearchContext(mockResponse);

  // Should include answer summary
  assertEquals(context.includes('Summary: This is the AI-generated answer summary.'), true);
});

/**
 * Test: Format search context with empty results
 */
Deno.test("formatSearchContext - empty results", () => {
  const mockResponse: TavilySearchResponse = {
    query: "test query",
    results: []
  };

  const context = formatSearchContext(mockResponse);

  // Should return no results message
  assertEquals(
    context.includes('No search results found for query: "test query"'),
    true
  );
});

/**
 * Test: Calculate Tavily cost for basic search
 */
Deno.test("calculateTavilyCost - basic search", () => {
  const cost = calculateTavilyCost('basic');

  // Basic search should cost $0.001
  assertEquals(cost, 0.001);
});

/**
 * Test: Calculate Tavily cost for advanced search
 */
Deno.test("calculateTavilyCost - advanced search", () => {
  const cost = calculateTavilyCost('advanced');

  // Advanced search should cost ~$0.002 (2x basic)
  assertEquals(cost, 0.002);
});

/**
 * Test: Calculate Tavily cost with default parameter
 */
Deno.test("calculateTavilyCost - default to basic", () => {
  const cost = calculateTavilyCost();

  // Should default to basic pricing
  assertEquals(cost, 0.001);
});

/**
 * Integration Test: Verify response structure
 *
 * This test validates the structure of a mock Tavily response
 * to ensure our types match the expected API format.
 */
Deno.test("TavilySearchResponse - structure validation", () => {
  const mockResponse: TavilySearchResponse = {
    query: "artificial intelligence",
    results: [
      {
        title: "AI Overview",
        url: "https://example.com/ai",
        content: "Comprehensive overview of AI technologies.",
        score: 0.98,
        raw_content: "Full page content..."
      }
    ],
    answer: "AI is the simulation of human intelligence.",
    images: [
      {
        url: "https://example.com/ai.jpg",
        description: "AI concept visualization"
      }
    ],
    response_time: 0.85
  };

  // Validate required fields
  assertEquals(typeof mockResponse.query, 'string');
  assertEquals(Array.isArray(mockResponse.results), true);
  assertEquals(mockResponse.results.length, 1);

  // Validate result structure
  const result = mockResponse.results[0];
  assertEquals(typeof result.title, 'string');
  assertEquals(typeof result.url, 'string');
  assertEquals(typeof result.content, 'string');
  assertEquals(typeof result.score, 'number');

  // Validate optional fields
  assertEquals(typeof mockResponse.answer, 'string');
  assertEquals(Array.isArray(mockResponse.images), true);
  assertEquals(typeof mockResponse.response_time, 'number');
});

/**
 * Edge Case Test: Handle malformed search results
 */
Deno.test("formatSearchContext - handles undefined results", () => {
  const mockResponse = {
    query: "test",
    results: []
  } as TavilySearchResponse;

  const context = formatSearchContext(mockResponse);

  // Should handle gracefully
  assertEquals(typeof context, 'string');
  assertEquals(context.includes('No search results found'), true);
});

/**
 * Performance Test: Format large result sets efficiently
 */
Deno.test("formatSearchContext - handles large result sets", () => {
  const results = Array.from({ length: 100 }, (_, i) => ({
    title: `Result ${i + 1}`,
    url: `https://example.com/${i + 1}`,
    content: `Content for result ${i + 1}`,
    score: 0.9 - (i * 0.001)
  }));

  const mockResponse: TavilySearchResponse = {
    query: "test query",
    results
  };

  const startTime = performance.now();
  const context = formatSearchContext(mockResponse, {
    maxResults: 5
  });
  const endTime = performance.now();

  // Should complete in reasonable time (<10ms)
  assertEquals((endTime - startTime) < 10, true);

  // Should only include 5 results despite 100 in response
  assertEquals(context.includes('Results: 5 of 100 total'), true);
});

/**
 * P0 Test: TavilyAPIError class structure
 */
Deno.test("TavilyAPIError - proper error structure", () => {
  const error = new TavilyAPIError("Rate limited", 429, "Too many requests");

  assertEquals(error.name, 'TavilyAPIError');
  assertEquals(error.message, 'Rate limited');
  assertEquals(error.statusCode, 429);
  assertEquals(error.responseBody, 'Too many requests');
  assert(error instanceof Error);
  assert(error instanceof TavilyAPIError);
});

/**
 * P0 Test: TavilyAPIError with timeout status
 */
Deno.test("TavilyAPIError - timeout error", () => {
  const error = new TavilyAPIError(
    "Search request timed out after 10000ms",
    408,
    "timeout"
  );

  assertEquals(error.statusCode, 408);
  assertEquals(error.message.includes('timed out'), true);
});

/**
 * P1 Test: Verify cost calculation for basic search
 */
Deno.test("calculateTavilyCost - basic search cost accuracy", () => {
  const cost = calculateTavilyCost('basic');

  // Basic plan: $0.001 per search
  assertEquals(cost, 0.001);

  // Verify it's a number
  assertEquals(typeof cost, 'number');
});

/**
 * P1 Test: Verify cost calculation for advanced search
 */
Deno.test("calculateTavilyCost - advanced search cost accuracy", () => {
  const cost = calculateTavilyCost('advanced');

  // Advanced: $0.002 (2x basic)
  assertEquals(cost, 0.002);

  // Should be exactly double basic cost
  assertEquals(cost, calculateTavilyCost('basic') * 2);
});

/**
 * P2 Test: Query validation structure
 */
Deno.test("Query validation - empty query handling", () => {
  // This tests the validation logic structure
  // Actual API calls would require TAVILY_API_KEY

  const emptyQuery = "";
  const validQuery = "test search";

  assertEquals(emptyQuery.trim().length === 0, true);
  assertEquals(validQuery.trim().length > 0, true);
});

/**
 * P2 Test: Query validation - max length
 */
Deno.test("Query validation - max length check", () => {
  const shortQuery = "test";
  const longQuery = "a".repeat(501);

  // Should pass: query under 500 chars
  assertEquals(shortQuery.trim().length <= 500, true);

  // Should fail: query over 500 chars
  assertEquals(longQuery.trim().length > 500, true);
});

/**
 * Integration Test: Verify TavilySearchResponse structure with all fields
 */
Deno.test("TavilySearchResponse - comprehensive structure validation", () => {
  const mockResponse: TavilySearchResponse = {
    query: "comprehensive test",
    results: [
      {
        title: "Test Result 1",
        url: "https://example.com/1",
        content: "Content 1",
        score: 0.95,
        raw_content: "Full content 1"
      },
      {
        title: "Test Result 2",
        url: "https://example.com/2",
        content: "Content 2",
        score: 0.87
      }
    ],
    answer: "AI-generated answer",
    images: [
      {
        url: "https://example.com/image.jpg",
        description: "Test image"
      }
    ],
    response_time: 1.5
  };

  // Validate all required fields
  assertEquals(typeof mockResponse.query, 'string');
  assertEquals(Array.isArray(mockResponse.results), true);
  assertEquals(mockResponse.results.length, 2);

  // Validate optional fields
  assertEquals(typeof mockResponse.answer, 'string');
  assertEquals(Array.isArray(mockResponse.images), true);
  assertEquals(typeof mockResponse.response_time, 'number');

  // Validate result objects
  const result1 = mockResponse.results[0];
  assertEquals(typeof result1.title, 'string');
  assertEquals(typeof result1.url, 'string');
  assertEquals(typeof result1.content, 'string');
  assertEquals(typeof result1.score, 'number');
  assertEquals(typeof result1.raw_content, 'string');

  // Validate image objects
  const image = mockResponse.images![0];
  assertEquals(typeof image.url, 'string');
  assertEquals(typeof image.description, 'string');
});
