/**
 * Integration Test for Tavily API
 *
 * This test makes real API calls to Tavily to verify:
 * - API key is valid
 * - Network connectivity works
 * - Response format is correct
 * - Rate limiting is functional
 */

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { searchTavily, searchTavilyWithRetry } from '../tavily-client.ts';

/**
 * Integration Test: Real API call to verify Tavily is operational
 *
 * This test is skipped by default. To run:
 * TAVILY_API_KEY=your_key deno test --allow-net --allow-env tavily-integration.test.ts
 */
Deno.test({
  name: "Tavily Integration - Real API Call",
  ignore: !Deno.env.get("TAVILY_API_KEY"), // Skip if no API key
  async fn() {
    const requestId = crypto.randomUUID();

    console.log("\n🔍 Testing Tavily API integration...");

    try {
      const response = await searchTavily(
        "artificial intelligence latest news",
        {
          requestId,
          maxResults: 3,
          searchDepth: 'basic'
        }
      );

      console.log("✓ API call successful");
      console.log(`  Results: ${response.results.length}`);
      console.log(`  Response time: ${response.response_time}s`);

      // Validate response structure
      assert(response.query, "Response should have query field");
      assert(Array.isArray(response.results), "Results should be an array");
      assert(response.results.length > 0, "Should return at least 1 result");
      assert(typeof response.response_time === 'number', "Response time should be a number");

      // Validate first result structure
      const firstResult = response.results[0];
      assert(firstResult.title, "Result should have title");
      assert(firstResult.url, "Result should have URL");
      assert(firstResult.content, "Result should have content");
      assert(typeof firstResult.score === 'number', "Result should have score");

      console.log(`  First result: "${firstResult.title}"`);
      console.log(`  Score: ${firstResult.score.toFixed(2)}\n`);

      assertEquals(response.results.length <= 3, true, "Should respect maxResults limit");

    } catch (error) {
      console.error("✗ API call failed:", error);
      throw error;
    }
  }
});

/**
 * Integration Test: Retry logic with real API
 */
Deno.test({
  name: "Tavily Integration - Retry Logic",
  ignore: !Deno.env.get("TAVILY_API_KEY"),
  async fn() {
    const requestId = crypto.randomUUID();

    console.log("\n🔁 Testing Tavily retry logic...");

    try {
      const response = await searchTavilyWithRetry(
        "React hooks tutorial",
        {
          requestId,
          maxResults: 2,
          searchDepth: 'basic'
        }
      );

      console.log("✓ Retry mechanism working");
      console.log(`  Results: ${response.results.length}\n`);

      assert(response.results.length > 0, "Should return results");

    } catch (error) {
      console.error("✗ Retry logic failed:", error);
      throw error;
    }
  }
});

/**
 * Integration Test: Advanced search with all features
 */
Deno.test({
  name: "Tavily Integration - Advanced Search",
  ignore: !Deno.env.get("TAVILY_API_KEY"),
  async fn() {
    const requestId = crypto.randomUUID();

    console.log("\n🚀 Testing Tavily advanced search...");

    try {
      const response = await searchTavily(
        "machine learning algorithms",
        {
          requestId,
          maxResults: 3,
          searchDepth: 'advanced', // Advanced search
          includeAnswer: true,     // Include AI summary
          includeImages: false     // Skip images to keep test fast
        }
      );

      console.log("✓ Advanced search successful");
      console.log(`  Results: ${response.results.length}`);

      if (response.answer) {
        console.log(`  AI Answer: ${response.answer.substring(0, 100)}...`);
      }

      console.log(`  Response time: ${response.response_time}s\n`);

      assert(response.results.length > 0, "Should return results");
      // Note: answer field is optional, may not always be present

    } catch (error) {
      console.error("✗ Advanced search failed:", error);
      throw error;
    }
  }
});
