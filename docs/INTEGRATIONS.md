# Integrations

## Tavily Web Search

**Location**: `supabase/functions/_shared/tavily-client.ts`

### Overview

Provides real-time web search and content extraction capabilities for grounded AI responses via the Tavily API.

### Features

**AI-Optimized Results**:
- Search results formatted specifically for LLM consumption
- Concise summaries instead of raw HTML
- Relevance ranking for AI context

**Content Extraction**:
- Full webpage content reading for detailed analysis
- Markdown conversion for clean text processing
- Image and link extraction

**Cost Tracking**:
- Built-in analytics for API usage monitoring
- Logs all search queries to `ai_usage_logs` table
- Estimated cost calculation

**Retry Logic**:
- Exponential backoff for resilient requests
- Automatic retry on timeout (up to 3 attempts)
- Circuit breaker pattern for API failures

**Context Formatting**:
- Automatic formatting for injection into AI prompts
- Token-aware result truncation
- Deduplication of similar results

### Usage

**Basic Search**:
```typescript
import { searchWeb } from './tavily-client.ts';

const results = await searchWeb({
  query: "React hooks best practices",
  max_results: 5,
  include_raw_content: true
});
```

**Advanced Search**:
```typescript
const results = await searchWeb({
  query: "TypeScript generics tutorial",
  max_results: 10,
  include_raw_content: true,
  search_depth: "advanced",     // "basic" | "advanced"
  include_images: true,
  include_answer: true           // AI-generated answer from Tavily
});
```

**Response Format**:
```typescript
{
  results: [
    {
      title: "React Hooks Guide",
      url: "https://example.com/hooks",
      content: "Comprehensive guide to React hooks...",
      score: 0.95,
      raw_content: "Full webpage content..."  // If include_raw_content=true
    }
  ],
  answer: "React hooks are...",  // If include_answer=true
  images: [...]                  // If include_images=true
}
```

### Configuration

**Environment Variables**:
```bash
TAVILY_API_KEY=tvly-...                  # Required
TAVILY_ALWAYS_SEARCH=false               # Force search on all messages
```

**Smart Intent Detection** (default):
- AI decides when web search is needed based on query
- Only searches when query requires real-time information
- Reduces latency and API costs

**Force Search Mode** (`TAVILY_ALWAYS_SEARCH=true`):
- **WARNING**: Testing only!
- Every chat message triggers web search
- +2-4s latency per message
- 1000x increase in API costs

**Configuration Details**: See `supabase/functions/_shared/config.ts` TAVILY_CONFIG

### Query Rewriting

**Location**: `supabase/functions/_shared/query-rewriter.ts`

Before queries reach Tavily, they pass through an LLM-powered optimization layer that improves search precision:

**How It Works**:
1. **Skip Detection**: Checks if query is already optimized (short, URL, code block)
2. **LLM Rewriting**: Sends conversational queries to Gemini 3 Flash
3. **Temporal Enhancement**: Adds current year for time-sensitive queries
4. **Cleanup**: Removes LLM artifacts (quotes, prefixes)
5. **Fallback**: Returns original query on failure

**Model**: Gemini 3 Flash via OpenRouter API
- Temperature: 0 (deterministic)
- Max tokens: 50 (concise output)
- Latency: ~300ms

**Optimization Rules**:
- Remove conversational filler ("please", "can you", "tell me")
- Keep technical terms exactly as written
- Add year (2025) only for "latest", "current", "recent" queries
- Maintain specific names and dates
- Maximum 10 words output

**Examples**:
```typescript
// Verbose → Concise
"Can you help me find information about TypeScript decorators?"
→ "TypeScript decorators"

// Temporal context
"What's the latest Next.js version?"
→ "latest Next.js version 2025"

// Already optimized
"React hooks tutorial"
→ "React hooks tutorial" (unchanged)
```

**Skip Conditions**:
- Query ≤3 words (likely already optimized keywords)
- Starts with `http://` or `https://` (URL)
- Contains code blocks (```)
- Already appears optimized (no conversational markers)

**Conversational Markers Detected**:
```typescript
/^(can you|could you|please|i want|help me|show me|tell me|
   what is|what are|how do|how does|why is|why do|
   when did|where is|where are)/i
```

**Usage**:
```typescript
import { rewriteSearchQuery } from './query-rewriter.ts';

const result = await rewriteSearchQuery(
  "Can you tell me about React hooks?",
  { requestId: 'req-123' }
);
// {
//   originalQuery: "Can you tell me about React hooks?",
//   rewrittenQuery: "React hooks",
//   latencyMs: 287,
//   skipped: false
// }
```

**Result Format**:
```typescript
interface RewriteResult {
  originalQuery: string;
  rewrittenQuery: string;
  latencyMs: number;
  skipped?: boolean;      // True if rewriting was skipped
  skipReason?: string;    // Why rewriting was skipped
}
```

**Error Handling**:
- API failures: Falls back to original query
- Timeout: Uses original query (no retry at rewriter level)
- Empty response: Uses original query
- All failures logged for monitoring

### Integration with Chat

**Tool-Based Search Flow**:
```typescript
// 1. AI decides to search via tool calling
{
  "tool": "browser.search",
  "parameters": {
    "query": "latest React 19 features",
    "max_results": 5
  }
}

// 2. Query rewriter optimizes the search query
const { rewrittenQuery } = await rewriteSearchQuery(
  "latest React 19 features",
  { requestId }
);
// rewrittenQuery: "latest React features 2025"

// 3. Optimized query sent to Tavily
const results = await searchWeb({ query: rewrittenQuery, max_results: 5 });

// 4. Results formatted and injected into AI context
const formattedResults = formatSearchResultsForAI(results);
const contextWithSearch = `${userMessage}\n\n[Search Results]\n${formattedResults}`;
```

**Automatic Context Injection**:
```typescript
// Search results automatically formatted and injected into AI context
const formattedResults = formatSearchResultsForAI(results);
const contextWithSearch = `${userMessage}\n\n[Search Results]\n${formattedResults}`;
```

### Error Handling

**API Errors**:
```typescript
try {
  const results = await searchWeb({ query });
} catch (err) {
  if (err.code === 'TAVILY_API_KEY_MISSING') {
    // API key not configured
  } else if (err.code === 'TAVILY_RATE_LIMIT') {
    // Rate limit exceeded
  } else if (err.code === 'TAVILY_TIMEOUT') {
    // Request timeout (after retries)
  }
}
```

**Graceful Degradation**:
- If search fails, AI responds without search results
- User notified via warning message
- Search failure logged to `ai_usage_logs`

### Analytics

**Tracked Metrics**:
- Total search queries
- Average response time
- API cost per search
- Results quality (click-through rates)

**Dashboard**: `/admin` (admin-only access)

### Rate Limits

**Tavily API Limits**:
- Free tier: 1,000 searches/month
- Pro tier: Custom limits

**Application Limits** (per-tool rate limiting):
- Guest users: 30 searches per 5 hours (default: 30)
- Authenticated users: 50 searches per 5 hours (default: 50)

**See**: `.claude/TOOL_CALLING_SYSTEM.md` for rate limit details

### Best Practices

**Query Optimization**:
```typescript
// ❌ Too broad
await searchWeb({ query: "programming" });

// ✅ Specific and actionable
await searchWeb({ query: "Python async/await best practices 2025" });
```

**Result Count**:
```typescript
// ❌ Too many results (slow, expensive)
await searchWeb({ query, max_results: 50 });

// ✅ Optimal for most queries
await searchWeb({ query, max_results: 5 });
```

**Content Depth**:
```typescript
// Use basic for simple queries
await searchWeb({ query, search_depth: "basic" });

// Use advanced only when needed (more expensive)
await searchWeb({ query, search_depth: "advanced", include_raw_content: true });
```

## CDN Fallback System

**Location**: `supabase/functions/_shared/cdn-fallback.ts`

### Overview

Provides resilient multi-CDN strategy for ESM package loading with automatic failover.

### Features

**Multi-Provider Fallback**:
- Primary: esm.sh (fast, reliable)
- Secondary: esm.run (fallback)
- Tertiary: jsdelivr (last resort)
- 3-second timeout per provider

**Parallel Verification**:
- Checks all CDNs simultaneously
- Returns fastest successful response
- Health monitoring with detailed logging

**React Externalization**:
- Proper `?external=react,react-dom` handling
- Prevents dual React instance bugs
- Import map shims for compatibility

### Usage

**Basic Package URL**:
```typescript
import { getWorkingCdnUrl } from './cdn-fallback.ts';

const result = await getWorkingCdnUrl('lodash', '4.17.21', requestId);
if (result) {
  console.log(`Using ${result.provider}: ${result.url}`);
  // result.url = "https://esm.sh/lodash@4.17.21"
}
```

**React Package (with externalization)**:
```typescript
const result = await getWorkingCdnUrl('framer-motion', '10.16.4', requestId);
// result.url = "https://esm.sh/framer-motion@10.16.4?external=react,react-dom"
```

### Response Format

```typescript
{
  provider: 'esm.sh',
  url: 'https://esm.sh/package@version',
  latency: 234  // milliseconds
}
```

### Fallback Chain

```
1. Try esm.sh (3s timeout)
   ↓ (fails)
2. Try esm.run (3s timeout)
   ↓ (fails)
3. Try jsdelivr (3s timeout)
   ↓ (fails)
4. Return null (no CDN available)
```

### Health Monitoring

**Logged Metrics**:
- CDN availability percentage
- Average response times
- Failure reasons
- Provider selection frequency

**Location**: Console logs in Edge Functions (search for "CDN fallback")

### Error Handling

**All CDNs Failed**:
```typescript
const result = await getWorkingCdnUrl('package', 'version', requestId);
if (!result) {
  // No CDN available - use prebuilt bundles or fail gracefully
  throw new Error('Unable to load package: all CDNs unavailable');
}
```

**Timeout Handling**:
- Each CDN gets 3 seconds to respond
- Parallel checks minimize total wait time
- Fastest successful response wins

### Integration with Artifact Bundling

**Bundle Artifact Function**:
```typescript
// Uses CDN fallback for npm package resolution
const cdnUrl = await getWorkingCdnUrl(packageName, version, requestId);
if (cdnUrl) {
  dependencies[packageName] = cdnUrl.url;
}
```

**Prebuilt Bundles Prioritization**:
- Check prebuilt bundles first (O(1) lookup)
- Only use CDN fallback for packages not prebuilt
- See `.claude/ARCHITECTURE.md` for prebuilt bundle details

## References

- **Tavily Client**: `supabase/functions/_shared/tavily-client.ts`
- **CDN Fallback**: `supabase/functions/_shared/cdn-fallback.ts`
- **Tavily API Docs**: https://docs.tavily.com
- **esm.sh Docs**: https://esm.sh
