# LLM-Driven Search Integration: Implementation Plan

**Date:** December 15, 2025
**Status:** Ready for Implementation
**Priority:** High

## Executive Summary

This plan upgrades Vana's search capabilities from regex-based intent detection to LLM-driven tool-calling, matching the approach used by ChatGPT, Gemini, and Claude. The implementation enables the AI model to autonomously decide when to search, what queries to use, and how to incorporate results.

## Current State Analysis

### What We Have ✅

| Component | Location | Status |
|-----------|----------|--------|
| GLM Search Tool Definition | `glm-client.ts:92-105` | Complete |
| Tool-Calling Handler | `tool-calling-chat.ts` | Complete |
| Tool Executor (Tavily) | `tool-executor.ts` | Complete |
| Tool Call Parser | `glm-tool-parser.ts` | Complete |
| Feature Flag System | `config.ts:383-391` | Complete |
| SSE Event Streaming | `tool-calling-chat.ts:149-168` | Complete |
| System Prompt w/ Tools | `system-prompt-inline.ts:28-68` | Complete |

### Current Gaps 🔄

| Gap | Impact | Priority |
|-----|--------|----------|
| Feature flag disabled by default | Tool-calling path not active | P0 |
| No query rewriting | Suboptimal search queries | P1 |
| No search result citations | No source transparency | P1 |
| No multi-step search | Can't handle complex queries | P2 |
| Legacy regex path still primary | Inconsistent behavior | P0 |

## Implementation Plan

### Phase 1: Enable Tool-Calling (Immediate - 30 min)

**Objective:** Switch from regex-based search to LLM-driven tool-calling.

#### 1.1 Update Default Feature Flags

**File:** `supabase/functions/_shared/config.ts`

```typescript
// BEFORE (current)
USE_GLM_TOOL_CALLING: Deno.env.get('USE_GLM_TOOL_CALLING') === 'true',
GLM_TOOL_CALLING_ROLLOUT_PERCENT: getEnvInt('GLM_TOOL_CALLING_ROLLOUT_PERCENT', 0, 0),

// AFTER (full rollout - pre-launch)
USE_GLM_TOOL_CALLING: Deno.env.get('USE_GLM_TOOL_CALLING') !== 'false', // Default: enabled
GLM_TOOL_CALLING_ROLLOUT_PERCENT: getEnvInt('GLM_TOOL_CALLING_ROLLOUT_PERCENT', 100, 0), // Default: 100%
```

#### 1.2 Deploy Configuration

```bash
# Set environment variables in Supabase (optional - defaults now enabled)
supabase secrets set USE_GLM_TOOL_CALLING=true
supabase secrets set GLM_TOOL_CALLING_ROLLOUT_PERCENT=100

# Deploy updated Edge Functions
./scripts/deploy-simple.sh prod
```

#### 1.3 Feature Flag Interaction

**Important:** When `USE_GLM_TOOL_CALLING=true`, the GLM model decides when to search. This replaces the legacy regex-based detection.

If `TAVILY_ALWAYS_SEARCH=true` is also set, disable it to avoid double-searching:
```bash
supabase secrets set TAVILY_ALWAYS_SEARCH=false
```

---

### Phase 2: Query Rewriting (1-2 hours)

**Objective:** Improve search quality by letting the LLM optimize queries before searching.

#### 2.1 Create Query Rewriter Module

**File:** `supabase/functions/_shared/query-rewriter.ts` (NEW)

```typescript
/**
 * Query Rewriter
 *
 * Optimizes user queries for web search using fast LLM inference.
 * Similar to ChatGPT's query rewriting that improves search precision.
 */

import { callGeminiFlashWithRetry } from './openrouter-client.ts';

export interface RewriteOptions {
  requestId: string;
  conversationContext?: string;
  maxTokens?: number;
}

export interface RewriteResult {
  originalQuery: string;
  rewrittenQuery: string;
  latencyMs: number;
}

/**
 * Rewrite user query for optimal search results
 *
 * Key optimizations:
 * - Removes conversational filler ("can you", "please", etc.)
 * - Adds temporal context when needed (current year)
 * - Extracts core search intent
 * - Handles context from conversation
 */
export async function rewriteSearchQuery(
  query: string,
  options: RewriteOptions
): Promise<RewriteResult> {
  const startTime = Date.now();
  const { requestId, conversationContext, maxTokens = 50 } = options;

  // Fast rewrite prompt
  const prompt = `Rewrite this for web search. Be concise. Output ONLY the search query.

User query: "${query}"
${conversationContext ? `Context: ${conversationContext}` : ''}

Rules:
- Remove conversational filler (please, can you, I want to)
- Keep specific names, dates, technical terms
- Add year (2025) only if asking about "latest" or "current"
- Don't add year for historical/timeless questions
- Max 10 words

Search query:`;

  try {
    const httpResponse = await callGeminiFlashWithRetry([
      { role: 'user', content: prompt }
    ], {
      max_tokens: maxTokens,
      temperature: 0, // Deterministic
      requestId
    });


    if (!httpResponse.ok) {
      console.warn(`[${requestId}] Query rewrite API error (${httpResponse.status}), using original`);
      return { originalQuery: query, rewrittenQuery: query, latencyMs: Date.now() - startTime };
    }

    const responseData = await httpResponse.json();
    const rewrittenQuery = responseData.choices?.[0]?.message?.content?.trim() || query;

    const latencyMs = Date.now() - startTime;
    console.log(`[${requestId}] 📝 Query rewritten in ${latencyMs}ms: "${query}" → "${rewrittenQuery}"`);

    return {
      originalQuery: query,
      rewrittenQuery,
      latencyMs
    };
  } catch (error) {
    console.warn(`[${requestId}] Query rewrite failed, using original:`, error);
    return {
      originalQuery: query,
      rewrittenQuery: query, // Fallback to original
      latencyMs: Date.now() - startTime
    };
  }
}

/**
 * Check if query rewriting would improve results
 * Skip for already-optimized or simple queries
 */
export function shouldRewriteQuery(query: string): boolean {
  const words = query.split(' ').length;
  
  // Skip if it's a URL or code
  if (query.startsWith('http') || query.includes('```')) {
    return false;
  }
  
  // Skip very short queries (likely already optimized)
  if (words <= 3) {
    return false;
  }
  
  // Rewrite if it has conversational markers (longer queries only)
  const conversationalMarkers = [
    /^(can you|could you|please|i want|help me|show me|tell me)/i,
    /^(what is|what are|how do|how does|why is|why do|when did|where is)/i
  ];
  
  // Also rewrite if it's a longer question (5+ words with ?)
  if (words >= 5 && query.includes('?')) {
    return true;
  }
  
  return conversationalMarkers.some(marker => marker.test(query));
}
```

#### 2.2 Integrate Query Rewriter into Tool Executor

**File:** `supabase/functions/_shared/tool-executor.ts`

Add the import at the top of the file, then modify the `executeSearchTool` function:

```typescript
// At the top of tool-executor.ts
import { rewriteSearchQuery, shouldRewriteQuery } from './query-rewriter.ts';

// Inside executeSearchTool():
async function executeSearchTool(
  query: string,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { requestId, userId, isGuest, functionName = 'tool-executor' } = context;

  // QUERY REWRITING (NEW)
  let searchQuery = query;
  if (shouldRewriteQuery(query)) {
    const rewriteResult = await rewriteSearchQuery(query, { requestId });
    searchQuery = rewriteResult.rewrittenQuery;
  }

  console.log(`[${requestId}] 🔍 Executing browser.search: "${searchQuery}"`);

  // ... rest of the function uses searchQuery instead of query
}
```

---

### Phase 3: Improve Search Tool Description (30 min)

**Objective:** Better prompt engineering for when GLM should use search.

#### 3.1 Enhanced Tool Definition

**File:** `supabase/functions/_shared/glm-client.ts`

```typescript
export const GLM_SEARCH_TOOL: GLMToolDefinition = {
  name: "browser.search",
  description: `Search the web for current, real-time information. USE THIS TOOL when:

ALWAYS SEARCH FOR:
- Recent events, news, or developments (anything since 2024)
- Real-time data: weather, stock prices, sports scores, cryptocurrency
- Current status: "is [service] down?", "current price of X"
- Latest versions, releases, or updates
- Time-sensitive queries with words: "latest", "current", "recent", "now", "today", "2025"
- Facts that may have changed since 2024

NEVER SEARCH FOR:
- General knowledge, definitions, or explanations
- Historical events (before 2024)
- How-to guides, tutorials, or code examples
- Math, science, or logic problems
- Creative writing or brainstorming

When uncertain, err on the side of searching. Users prefer current information.`,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "A concise, optimized search query (not the full user message). Remove filler words. Include year for time-sensitive topics."
      }
    },
    required: ["query"]
  }
};
```

#### 3.2 Sync System Prompt Tool Section

**Important:** The tool description is also defined in `system-prompt-inline.ts:28-68` (`TOOL_CALLING_SECTION`).
Ensure both definitions stay synchronized, or consider removing duplication:

**Option A (Recommended):** Keep `GLM_SEARCH_TOOL` as the single source of truth and generate `TOOL_CALLING_SECTION` from it:

```typescript
// In system-prompt-inline.ts
import { GLM_SEARCH_TOOL } from './glm-client.ts';

export const TOOL_CALLING_SECTION = `
# Available Tools

## ${GLM_SEARCH_TOOL.name}
${GLM_SEARCH_TOOL.description}
...
`;
```

**Option B:** Update both files manually to match.

---

### Phase 4: Citation Support (1-2 hours)

**Objective:** Display sources in the UI and require citations in responses.

#### 4.1 Update System Prompt for Citations

**File:** `supabase/functions/_shared/system-prompt-inline.ts`

Update `TOOL_CALLING_SECTION`:

```typescript
export const TOOL_CALLING_SECTION = `
# Available Tools

You have access to the following tools to help answer user questions:

## browser.search
Search the web for current, real-time information.

**WHEN TO USE:**
- Recent events, news, developments (2024+)
- Real-time data (weather, prices, scores)
- Questions with "latest", "current", "today", "2025"
- Facts that may have changed

**HOW TO USE:**
<tool_call>
  <name>browser.search</name>
  <arguments>
    <query>concise search query here</query>
  </arguments>
</tool_call>

**AFTER RECEIVING RESULTS:**
1. Cite sources using inline markers: [1], [2], [3]
2. At the end, list sources like this:

**Sources:**
[1] [Title](URL)
[2] [Title](URL)

3. If results are insufficient, say so honestly
4. Never fabricate sources or URLs
`;
```

#### 4.2 Parse Citations in Frontend

**File:** `src/components/prompt-kit/message.tsx`

```tsx
/**
 * Source reference for citations
 */
interface Source {
  title: string;
  url: string;
}

/**
 * Map Tavily results to Source format
 * Use this when passing search results to citation parser
 */
function mapSearchResultsToSources(results: Array<{ title: string; url: string }>): Source[] {
  return results.map(r => ({
    title: r.title || 'Source',
    url: r.url
  }));
}

/**
 * Parse citations in message content and convert to clickable links
 * Handles [1], [2], etc. citation markers
 */
function parseCitations(content: string, sources?: Source[]): React.ReactNode {
  // Early return if no sources to link
  if (!sources?.length) return content;

  const citationRegex = /\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // Use matchAll for precise index-based replacement
  for (const match of content.matchAll(citationRegex)) {
    const citationNum = parseInt(match[1], 10);
    const source = sources[citationNum - 1];
    const matchIndex = match.index!;

    // Add text before this citation
    if (matchIndex > lastIndex) {
      parts.push(content.slice(lastIndex, matchIndex));
    }

    // Add citation link or plain text
    if (source) {
      parts.push(
        <Tooltip key={key++} content={source.title}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-500 hover:text-blue-600 hover:underline cursor-pointer text-sm font-medium"
          >
            [{citationNum}]
          </a>
        </Tooltip>
      );
    } else {
      // Citation number exists but no matching source - keep as plain text
      parts.push(`[${citationNum}]`);
    }

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text after last citation
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : content;
}
```

---

### Phase 5: Multi-Step Search (Future Enhancement)

**Objective:** Handle complex queries requiring multiple searches (like Perplexity Pro).

This is a future enhancement that would involve:
1. Detecting queries that need decomposition
2. Breaking into sub-queries
3. Executing searches in parallel
4. Synthesizing results

**Complexity:** High
**Priority:** P2 (Future)

---

## Configuration Changes Summary

### Environment Variables

| Variable | Old Default | New Default | Purpose |
|----------|-------------|-------------|---------|
| `USE_GLM_TOOL_CALLING` | `false` | `true` (default enabled) | Enable LLM-driven search |
| `GLM_TOOL_CALLING_ROLLOUT_PERCENT` | `0` | `100` | Full rollout (pre-launch) |

### Code Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `config.ts` | Modify | Update default values |
| `query-rewriter.ts` | New | Query optimization module |
| `tool-executor.ts` | Modify | Integrate query rewriting |
| `glm-client.ts` | Modify | Enhanced tool description |
| `system-prompt-inline.ts` | Modify | Citation requirements |

---

## Testing Plan

### Unit Tests

```typescript
// Test query rewriting
describe('Query Rewriter', () => {
  it('should produce concise search queries', async () => {
    const result = await rewriteSearchQuery(
      "Can you please tell me what the weather is like in NYC?",
      { requestId: 'test' }
    );
    // Use semantic assertions - check for key terms, not exact match
    const query = result.rewrittenQuery.toLowerCase();
    expect(query.length).toBeLessThan(50); // Should be concise
    expect(query).toMatch(/weather|nyc|new york/i); // Should contain key terms
    expect(query).not.toMatch(/can you|please|tell me/i); // Should remove filler
  });

  it('should include year for time-sensitive queries', async () => {
    const result = await rewriteSearchQuery(
      "What are the latest React features?",
      { requestId: 'test' }
    );
    // Check for year OR recent indicators
    expect(result.rewrittenQuery).toMatch(/2025|latest|recent|new/i);
    expect(result.rewrittenQuery.toLowerCase()).toContain("react");
  });

  it('should preserve technical terms', async () => {
    const result = await rewriteSearchQuery(
      "How do I use useEffect in React?",
      { requestId: 'test' }
    );
    const query = result.rewrittenQuery.toLowerCase();
    expect(query).toContain("useeffect");
    expect(query).toContain("react");
  });

  it('should handle already-optimized queries', async () => {
    const result = await rewriteSearchQuery(
      "React 19 features",
      { requestId: 'test' }
    );
    // Short optimized queries might not change much
    expect(result.rewrittenQuery.toLowerCase()).toContain("react");
  });
});

// Test shouldRewriteQuery heuristic
describe('shouldRewriteQuery', () => {
  it('should skip URLs', () => {
    expect(shouldRewriteQuery('https://example.com')).toBe(false);
  });

  it('should skip code blocks', () => {
    expect(shouldRewriteQuery('```console.log()```')).toBe(false);
  });

  it('should skip very short queries', () => {
    expect(shouldRewriteQuery('NYC weather')).toBe(false);
  });

  it('should rewrite conversational queries', () => {
    expect(shouldRewriteQuery('Can you tell me about React hooks?')).toBe(true);
    expect(shouldRewriteQuery('Please help me understand TypeScript')).toBe(true);
  });
});
```

### Integration Tests

```typescript
// Test full tool-calling flow
describe('Tool-Calling Search', () => {
  const testCases = [
    { query: "what's the weather in NYC", shouldSearch: true },
    { query: "explain how React hooks work", shouldSearch: false },
    { query: "latest news about AI", shouldSearch: true },
    { query: "write a story about a cat", shouldSearch: false },
    { query: "current stock price of Apple", shouldSearch: true },
  ];

  testCases.forEach(({ query, shouldSearch }) => {
    it(`should ${shouldSearch ? '' : 'not '}search for: "${query}"`, async () => {
      const response = await sendChatMessage(query);
      expect(response.searchExecuted).toBe(shouldSearch);
    });
  });
});
```

### Manual Testing Checklist

- [ ] Tool-calling triggers for current events queries
- [ ] Tool-calling does NOT trigger for general knowledge
- [ ] Query rewriting improves search results
- [ ] Citations appear in responses with sources
- [ ] SSE events stream correctly (`tool_call_start`, `tool_result`)
- [ ] Fallback works if Tavily fails
- [ ] Performance acceptable (< 500ms added latency)

---

## Rollback Plan

If issues occur after deployment:

```bash
# Option 1: Disable via environment variable
supabase secrets set USE_GLM_TOOL_CALLING=false

# Option 2: Redeploy previous version
git checkout HEAD~1 -- supabase/functions/_shared/config.ts
./scripts/deploy-simple.sh prod
```

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Search Trigger Accuracy | ~70% (regex) | >90% (LLM) | Manual eval |
| False Positive Rate | ~15% | <5% | Log analysis |
| Search Latency | N/A | <500ms added | Monitoring |
| User Satisfaction | TBD | Improved | Feedback |

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Enable Tool-Calling | 30 min | None |
| Phase 2: Query Rewriting | 1-2 hours | Phase 1 |
| Phase 3: Tool Description | 30 min | Phase 1 |
| Phase 4: Citation Support | 1-2 hours | Phase 1 |
| Phase 5: Multi-Step (Future) | TBD | All above |

**Total Estimated Time:** 3-5 hours for Phases 1-4

---

## Appendix: Architecture Comparison

### Before (Regex-Based)

```
User Query → shouldPerformWebSearch() (regex) → Tavily Search → Context Injection → GLM Response
```

### After (LLM-Driven)

```
User Query → GLM-4.6 w/ browser.search tool → Model Decides → Query Rewriting → Tavily Search → GLM Continuation w/ Results
```

### Industry Comparison

| Feature | Vana (After) | ChatGPT | Gemini | Perplexity |
|---------|--------------|---------|--------|------------|
| LLM Search Decision | ✅ | ✅ | ✅ | ✅ |
| Query Rewriting | ✅ | ✅ | ❌ | ✅ |
| Confidence Threshold | ❌ | ❌ | ✅ | ❌ |
| Multi-Step Search | ❌ | ❌ | ❌ | ✅ |
| Citation Support | ✅ | ✅ | ✅ | ✅ |
| Memory Integration | ❌ | ✅ | ❌ | ❌ |
