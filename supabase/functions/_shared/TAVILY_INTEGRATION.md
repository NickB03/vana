# Tavily Search API Integration

## Overview

The Tavily API client provides real-time web search capabilities for AI responses, enabling grounded and factual answers with up-to-date information from the web.

**Key Features:**
- Real-time web search with AI-optimized results
- Automatic retry logic with exponential backoff
- LLM-friendly context formatting
- Cost tracking and analytics
- Usage logging for admin dashboard

## Files

- **`tavily-client.ts`** - Main client implementation
- **`config.ts`** - Configuration constants (RATE_LIMITS.TAVILY, TAVILY_CONFIG)
- **`__tests__/tavily-client.test.ts`** - Unit tests
- **`__tests__/tavily-client.example.ts`** - Usage examples

## Setup

### 1. Get API Key

Sign up at [Tavily.com](https://tavily.com) and get your API key from the dashboard.

### 2. Set Environment Variable

```bash
# Development (local)
echo "TAVILY_API_KEY=tvly-..." >> .env

# Production (Supabase)
supabase secrets set TAVILY_API_KEY=tvly-...
```

### 3. Verify Configuration

The client will log a warning if the API key is not configured:

```
⚠️  TAVILY_API_KEY not configured - web search will fail.
Get your key from: https://tavily.com
Set it with: supabase secrets set TAVILY_API_KEY=tvly-...
```

## Basic Usage

### Simple Search

```typescript
import { searchTavily } from '../_shared/tavily-client.ts';

const results = await searchTavily(
  "latest developments in artificial intelligence",
  {
    requestId: crypto.randomUUID(),
    maxResults: 5,
    searchDepth: 'basic'
  }
);

console.log(`Found ${results.results.length} results`);
```

### Search with Retry Logic

```typescript
import { searchTavilyWithRetry } from '../_shared/tavily-client.ts';

try {
  const results = await searchTavilyWithRetry(
    "current weather patterns",
    {
      requestId,
      maxResults: 3,
      searchDepth: 'basic'
    }
  );

  // Process results
} catch (error) {
  console.error(`Search failed after retries:`, error);
}
```

## Advanced Usage

### Search with Retry Tracking (for Analytics)

```typescript
import {
  searchTavilyWithRetryTracking,
  calculateTavilyCost,
  logTavilyUsage
} from '../_shared/tavily-client.ts';

const requestId = crypto.randomUUID();
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

} catch (error) {
  // Handle error
}
```

### Format Results for LLM Context Injection

```typescript
import {
  searchTavilyWithRetry,
  formatSearchContext
} from '../_shared/tavily-client.ts';

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
  includeScores: false, // Hide relevance scores
  maxResults: 3 // Only use top 3 results
});

// Inject into system prompt
const systemPrompt = `You are a helpful assistant. Use the following web search results to answer the user's question:\n\n${context}`;
```

### Advanced Search with Images

```typescript
const results = await searchTavily(
  "data visualization examples",
  {
    requestId,
    maxResults: 5,
    searchDepth: 'advanced', // More thorough search
    includeImages: true,     // Include image results
    includeAnswer: true      // Include AI summary
  }
);

console.log(`Found ${results.results.length} results`);

if (results.answer) {
  console.log(`AI Summary: ${results.answer}`);
}

if (results.images && results.images.length > 0) {
  console.log(`Found ${results.images.length} images`);
}
```

## API Reference

### Functions

#### `searchTavily(query, options?)`

Search the web using Tavily API.

**Parameters:**
- `query: string` - Search query string
- `options?: SearchTavilyOptions` - Configuration options

**Returns:** `Promise<TavilySearchResponse>`

**Options:**
```typescript
interface SearchTavilyOptions {
  requestId?: string;        // Request ID for tracing
  userId?: string;           // User ID for analytics
  isGuest?: boolean;         // Guest flag for analytics
  functionName?: string;     // Function name for logging
  maxResults?: number;       // Number of results (default: 5, max: 10)
  searchDepth?: 'basic' | 'advanced'; // Search depth (default: 'basic')
  includeAnswer?: boolean;   // Include AI summary (default: false)
  includeImages?: boolean;   // Include images (default: false)
}
```

#### `searchTavilyWithRetry(query, options?, retryCount?)`

Search with automatic retry logic using exponential backoff.

**Parameters:**
- Same as `searchTavily()`
- `retryCount?: number` - Internal retry counter

**Returns:** `Promise<TavilySearchResponse>`

**Retry Logic:**
- Max retries: 2 (from `RETRY_CONFIG.MAX_RETRIES`)
- Exponential backoff: 1s → 2s → 4s (max 10s)
- Retries on: 429 (rate limit), 503 (service unavailable), network errors

#### `searchTavilyWithRetryTracking(query, options?)`

Search with retry tracking for analytics.

**Parameters:**
- Same as `searchTavily()`

**Returns:** `Promise<TavilyRetryResult>`

```typescript
interface TavilyRetryResult {
  response: TavilySearchResponse;
  retryCount: number;
}
```

#### `formatSearchContext(searchResults, options?)`

Format search results for LLM context injection.

**Parameters:**
- `searchResults: TavilySearchResponse` - Search response from Tavily
- `options?: FormatOptions` - Formatting options

**Returns:** `string` - Formatted context for LLM

**Format Options:**
```typescript
{
  includeUrls?: boolean;     // Include URLs (default: true)
  includeScores?: boolean;   // Include relevance scores (default: false)
  maxResults?: number;       // Max results to include (default: 5)
}
```

**Output Format:**
```
Web Search Results for: "query here"

Summary: AI-generated answer (if includeAnswer: true)

[1] Result Title 1
URL: https://example.com/1
Content snippet here...

[2] Result Title 2
URL: https://example.com/2
Content snippet here...

---
Results: 2 of 5 total
Search time: 0.85s
```

#### `calculateTavilyCost(searchDepth?)`

Calculate estimated cost for a Tavily API call.

**Parameters:**
- `searchDepth?: 'basic' | 'advanced'` - Search depth (default: 'basic')

**Returns:** `number` - Estimated cost in USD

**Pricing:**
- Basic search: $0.001 per request
- Advanced search: $0.002 per request (~2x basic)

#### `logTavilyUsage(logData)`

Log Tavily usage to database for analytics (fire-and-forget).

**Parameters:**
```typescript
{
  requestId: string;
  functionName: string;
  userId?: string;
  isGuest: boolean;
  query: string;
  resultCount: number;
  searchDepth: 'basic' | 'advanced';
  latencyMs: number;
  statusCode: number;
  estimatedCost: number;
  errorMessage?: string;
  retryCount: number;
}
```

**Returns:** `Promise<void>`

**Note:** This function never throws - logging failures are swallowed to avoid breaking the main flow.

## Configuration

### Rate Limits

Defined in `config.ts`:

```typescript
export const RATE_LIMITS = {
  TAVILY: {
    API_THROTTLE: {
      MAX_REQUESTS: 10,
      WINDOW_SECONDS: 60
    },
    GUEST: {
      MAX_REQUESTS: 10,
      WINDOW_HOURS: 5
    },
    AUTHENTICATED: {
      MAX_REQUESTS: 50,
      WINDOW_HOURS: 5
    }
  }
}
```

### Tavily Configuration

```typescript
export const TAVILY_CONFIG = {
  DEFAULT_MAX_RESULTS: 5,          // Default number of results
  MAX_RESULTS_LIMIT: 10,           // Max allowed (Basic plan)
  DEFAULT_SEARCH_DEPTH: 'basic',   // Default search depth
  SEARCH_TIMEOUT_MS: 10000,        // Search timeout
  DEFAULT_INCLUDE_ANSWER: false,   // Include AI summary
  DEFAULT_INCLUDE_IMAGES: false    // Include images
}
```

## Error Handling

### Common Errors

1. **API Key Not Configured**
   ```typescript
   Error: TAVILY_API_KEY not configured
   ```
   **Solution:** Set the environment variable

2. **Empty Query**
   ```typescript
   Error: Search query cannot be empty
   ```
   **Solution:** Validate query before calling

3. **Rate Limit Exceeded (429)**
   - Automatically retried with exponential backoff
   - Logged for analytics

4. **Service Unavailable (503)**
   - Automatically retried with exponential backoff
   - Logged for analytics

### Error Recovery

The client implements automatic retry logic:

```typescript
try {
  const results = await searchTavilyWithRetry(query, options);
  // Success
} catch (error) {
  // Failed after all retries
  console.error('Search failed:', error);

  // Fallback to non-web-search response
  return generateFallbackResponse();
}
```

## Performance Considerations

### Search Latency

- **Basic search:** ~0.5-2 seconds
- **Advanced search:** ~1-5 seconds
- **Network overhead:** ~100-500ms

**Optimization:**
- Use `searchDepth: 'basic'` for faster responses
- Limit `maxResults` to minimum needed
- Set `includeAnswer: false` to save time
- Set `includeImages: false` if not needed

### Token Usage

Search results consume LLM tokens when injected as context.

**Estimate:**
- 5 results with snippets: ~1,000 tokens
- 10 results with snippets: ~2,000 tokens
- With AI summary: +200-500 tokens

**Optimization:**
- Use `formatSearchContext({ maxResults: 3 })` to limit tokens
- Set `includeUrls: false` to save ~50 tokens per result
- Use `includeAnswer: true` for concise summary instead of full results

### Cost Management

**Pricing (Basic plan):**
- $5/month for 1,000 API calls
- $0.001 per basic search
- $0.002 per advanced search (estimate)

**Best practices:**
- Only search when necessary (user explicitly asks for recent info)
- Cache search results for same queries (consider 5-minute TTL)
- Use basic search depth unless user requests comprehensive results
- Monitor usage via `ai_usage_logs` table

## Testing

Run the test suite:

```bash
cd supabase/functions
deno task test _shared/__tests__/tavily-client.test.ts
```

**Test Coverage:**
- ✅ Context formatting with various options
- ✅ Cost calculation for different search depths
- ✅ Response structure validation
- ✅ Edge cases (empty results, malformed data)
- ✅ Performance tests (large result sets)

## Integration Example

Complete Edge Function integration:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  searchTavilyWithRetryTracking,
  formatSearchContext,
  calculateTavilyCost,
  logTavilyUsage
} from "../_shared/tavily-client.ts";
import { ErrorResponseBuilder } from "../_shared/error-handler.ts";
import { TAVILY_CONFIG } from "../_shared/config.ts";

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("Origin");
  const errors = ErrorResponseBuilder.create(origin, requestId);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: errors.corsHeaders });
  }

  try {
    const { query, userId, isGuest } = await req.json();

    if (!query || query.trim().length === 0) {
      return errors.validation("Query is required");
    }

    const startTime = Date.now();

    // Perform search with retry tracking
    const { response, retryCount } = await searchTavilyWithRetryTracking(
      query,
      {
        requestId,
        userId,
        isGuest,
        functionName: 'web-search',
        maxResults: TAVILY_CONFIG.DEFAULT_MAX_RESULTS,
        searchDepth: TAVILY_CONFIG.DEFAULT_SEARCH_DEPTH
      }
    );

    const latencyMs = Date.now() - startTime;
    const estimatedCost = calculateTavilyCost('basic');

    // Log usage (fire-and-forget)
    logTavilyUsage({
      requestId,
      functionName: 'web-search',
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

    return new Response(
      JSON.stringify({
        success: true,
        results: response,
        context,
        metadata: { requestId, latencyMs, retryCount }
      }),
      {
        status: 200,
        headers: {
          ...errors.corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    return errors.internal("Search failed", error.message);
  }
});
```

## Troubleshooting

### Issue: "TAVILY_API_KEY not configured"

**Cause:** Environment variable not set

**Solution:**
```bash
supabase secrets set TAVILY_API_KEY=tvly-...
```

### Issue: Search returning empty results

**Causes:**
1. Query too specific or narrow
2. API key invalid or expired
3. Rate limit exceeded

**Solutions:**
1. Broaden the search query
2. Verify API key in Tavily dashboard
3. Check rate limit logs in `ai_usage_logs` table

### Issue: High latency (>5s per search)

**Causes:**
1. Using `searchDepth: 'advanced'`
2. Large `maxResults` value
3. Network congestion
4. Tavily API overloaded

**Solutions:**
1. Use `searchDepth: 'basic'` for faster results
2. Reduce `maxResults` to 3-5
3. Implement client-side caching
4. Use retry logic (already implemented)

### Issue: High costs

**Causes:**
1. Too many searches per session
2. Using advanced search unnecessarily

**Solutions:**
1. Only search when user explicitly requests recent information
2. Cache results for identical queries (5-minute TTL)
3. Use basic search depth by default
4. Monitor usage via analytics dashboard

## Best Practices

1. **Always use retry logic**
   ```typescript
   // ✅ GOOD
   const results = await searchTavilyWithRetry(query, options);

   // ❌ BAD (no retry on transient failures)
   const results = await searchTavily(query, options);
   ```

2. **Log usage for analytics**
   ```typescript
   const { response, retryCount } = await searchTavilyWithRetryTracking(...);
   await logTavilyUsage({ ... }); // Fire-and-forget
   ```

3. **Format results for LLMs**
   ```typescript
   const context = formatSearchContext(response, {
     includeUrls: true,
     includeScores: false, // Don't clutter LLM context
     maxResults: 5
   });
   ```

4. **Handle errors gracefully**
   ```typescript
   try {
     const results = await searchTavilyWithRetry(query, options);
   } catch (error) {
     // Fallback to non-web-search response
     return generateResponseWithoutWebSearch();
   }
   ```

5. **Validate queries before searching**
   ```typescript
   if (!query || query.trim().length === 0) {
     return errors.validation("Query is required");
   }

   if (query.length > 500) {
     return errors.validation("Query too long (max 500 chars)");
   }
   ```

## Roadmap

Future enhancements:

- [ ] Query caching (5-minute TTL for identical queries)
- [ ] Domain filtering support (include/exclude specific domains)
- [ ] Search result ranking and deduplication
- [ ] Multi-query parallel search (for comprehensive research)
- [ ] Integration with chat streaming (progressive result display)
- [ ] Smart search triggering (detect when user needs recent info)
- [ ] Cost optimization via result caching
- [ ] A/B testing: basic vs advanced search depth

## References

- [Tavily API Documentation](https://docs.tavily.com/docs/tavily-api/introduction)
- [Tavily API Pricing](https://tavily.com/pricing)
- [OpenRouter Client](./openrouter-client.ts) - Similar pattern reference
- [Error Handler](./error-handler.ts) - Error handling utilities
- [Configuration](./config.ts) - Rate limits and constants
