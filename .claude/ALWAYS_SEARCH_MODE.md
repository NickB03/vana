# Always-Search Mode

## Overview

Always-Search Mode forces web search for **every** chat message (excluding artifacts and images), ensuring all LLM responses are grounded in current, real-time information from the web.

## How It Works

### Default Behavior (Intent-Based)

By default, web search triggers only when:
- User asks explicit search requests: `"search for"`, `"find information about"`
- Temporal keywords detected: `"latest"`, `"current"`, `"today"`, `"2025"`, `"recent"`
- Information patterns: `"what is the latest"`, `"news about"`, `"price of"`

### Always-Search Mode (RAG-First)

When enabled, **every** chat response automatically:
1. Executes Tavily web search with user's query
2. Injects 5 search results into LLM context
3. LLM synthesizes response using search results + its knowledge
4. All responses cite sources and prioritize current data

## Configuration

### Enable Always-Search Mode

```bash
# Set via Supabase secrets
supabase secrets set TAVILY_ALWAYS_SEARCH=true --project-ref YOUR_PROJECT_REF

# Verify it's set
supabase secrets list --project-ref YOUR_PROJECT_REF
```

### Disable Always-Search Mode (Default)

```bash
# Remove the secret OR set to false
supabase secrets unset TAVILY_ALWAYS_SEARCH --project-ref YOUR_PROJECT_REF
# OR
supabase secrets set TAVILY_ALWAYS_SEARCH=false --project-ref YOUR_PROJECT_REF
```

### Check Current Status

```bash
# View edge function logs
supabase functions logs chat --project-ref YOUR_PROJECT_REF

# Look for:
# ✅ Always-search enabled: "[requestId] 🔍 Always-search mode enabled"
# ❌ Always-search disabled: "[requestId] 🔍 Web search intent detected" (only when triggered)
```

## Architecture

### Search Flow

```
User sends message
     ↓
Check: Is it artifact/image request?
     ├─ YES → Skip search (artifacts don't need current data)
     └─ NO  → Continue
           ↓
     Check: TAVILY_ALWAYS_SEARCH=true?
           ├─ YES → Execute search
           └─ NO  → Check intent detection
                 ├─ Temporal keywords? → Execute search
                 ├─ Explicit search request? → Execute search
                 └─ None → Skip search
                       ↓
     Search executed → Inject into system message
                       ↓
     LLM receives: System prompt + search context + user message
                       ↓
     LLM responds with cited, current information
```

### Code Locations

1. **Configuration** (`supabase/functions/_shared/config.ts:225-248`):
   ```typescript
   TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED: Deno.env.get('TAVILY_ALWAYS_SEARCH') === 'true'
   ```

2. **Search Logic** (`supabase/functions/chat/index.ts:394-411`):
   ```typescript
   const shouldSearch = lastUserMessage &&
     !forceArtifactMode && // Exclude artifacts
     !forceImageMode && // Exclude images
     (
       TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED || // Always-search mode
       shouldPerformWebSearch(lastUserMessage.content) // Intent detection
     );
   ```

3. **System Prompt** (`supabase/functions/_shared/system-prompt-inline.ts:288-320`):
   - Dynamically adjusts based on `alwaysSearchEnabled` parameter
   - Tells LLM if search runs for every message or selectively

### Exclusions (No Search)

- **Artifact generation requests** (`forceArtifactMode=true`)
- **Image generation requests** (`forceImageMode=true`)
- **Rationale**: Code/diagrams/images don't benefit from current web data

## Trade-offs

### ✅ Advantages

| Benefit | Impact |
|---------|--------|
| **Guaranteed current info** | Every response uses real-time data (no stale knowledge) |
| **Reduced hallucination** | LLM grounded in real sources, not imagination |
| **Better citations** | All responses naturally include source URLs |
| **Transparency** | Users see what sources were used (SSE event) |
| **Consistent UX** | Predictable behavior (search always happens) |

### ❌ Disadvantages

| Cost | Impact |
|------|--------|
| **💰 API Cost** | $0.001 per message → 1000 messages = $1.00 |
| **⏱️ Latency** | +2-4 seconds per response (search time) |
| **📊 Rate Limits** | Tavily Basic = 1000 searches/month (free tier) |
| **🤔 Unnecessary Searches** | Queries like "What is React?" don't need web search |
| **🚫 Quota Exhaustion** | High-volume users hit caps quickly |

### Cost Analysis

**Tavily Pricing** (Basic Plan):
- **Free tier**: 1000 searches/month
- **Per search**: $0.001 (Basic) or $0.002 (Advanced)
- **After free tier**: $0.001/search

**Example Monthly Costs**:

| Users | Msgs/User/Day | Total Searches/Month | Free Tier | Paid Cost |
|-------|---------------|---------------------|-----------|-----------|
| 10 | 10 | 3,000 | 1,000 | $2.00 |
| 50 | 10 | 15,000 | 1,000 | $14.00 |
| 100 | 10 | 30,000 | 1,000 | $29.00 |
| 1000 | 10 | 300,000 | 1,000 | $299.00 |

**When to Enable**:
- ✅ You have Tavily Pro plan (higher limits)
- ✅ Use case demands maximum factual grounding (medical, legal, financial)
- ✅ Budget allocated for search API costs
- ✅ User base is small/controlled

**When to Keep Disabled**:
- ❌ High-volume production app (>100 users)
- ❌ Limited budget
- ❌ Many conceptual/educational queries
- ❌ Using Tavily Basic free tier

## Monitoring

### Check Search Execution

```sql
-- Query ai_usage_logs for Tavily searches
SELECT
  created_at,
  provider,
  model,
  is_guest,
  prompt_preview,
  latency_ms,
  estimated_cost,
  status_code
FROM ai_usage_logs
WHERE provider = 'tavily'
ORDER BY created_at DESC
LIMIT 50;
```

### Metrics to Track

1. **Search Volume**: `COUNT(*) WHERE provider = 'tavily'`
2. **Average Latency**: `AVG(latency_ms) WHERE provider = 'tavily'`
3. **Monthly Cost**: `SUM(estimated_cost) WHERE provider = 'tavily'`
4. **Error Rate**: `COUNT(*) WHERE provider = 'tavily' AND status_code != 200`

### Alerts

Set up monitoring for:
- **Cost threshold**: Alert if monthly spend > $X
- **Rate limit hits**: Alert on 429 status codes
- **Search failures**: Alert if error rate > 5%
- **Latency spikes**: Alert if P95 latency > 6s

## Testing

### Test Always-Search Mode

1. **Enable mode**:
   ```bash
   supabase secrets set TAVILY_ALWAYS_SEARCH=true --project-ref YOUR_PROJECT_REF
   ```

2. **Deploy function**:
   ```bash
   supabase functions deploy chat --project-ref YOUR_PROJECT_REF
   ```

3. **Test conceptual query** (should still search):
   ```
   User: "What is React?"
   Expected: Search executed, sources cited, current React info
   Logs: "[requestId] 🔍 Always-search mode enabled"
   ```

4. **Test artifact request** (should NOT search):
   ```
   User: "Create a React dashboard" (with forceArtifactMode=true)
   Expected: No search executed, artifact generated
   Logs: No search log entry
   ```

5. **Check UI**:
   - Web search results card appears for every chat message
   - Sources displayed with URLs
   - Reasoning shows search was used

### Test Intent-Based Mode (Default)

1. **Disable mode**:
   ```bash
   supabase secrets unset TAVILY_ALWAYS_SEARCH --project-ref YOUR_PROJECT_REF
   ```

2. **Deploy function**:
   ```bash
   supabase functions deploy chat --project-ref YOUR_PROJECT_REF
   ```

3. **Test conceptual query** (should NOT search):
   ```
   User: "What is React?"
   Expected: No search, LLM uses training data
   Logs: No search log entry
   ```

4. **Test temporal query** (should search):
   ```
   User: "What's the latest news about React?"
   Expected: Search executed, current news provided
   Logs: "[requestId] 🔍 Web search intent detected"
   ```

## System Prompt Changes

When always-search is enabled, the LLM receives:

```
# Real-Time Web Search

You have access to real-time web search through Tavily, which runs for EVERY message you receive.

The system will ALWAYS fetch web search results and inject them into your context.

**Important**: All your responses are grounded in real-time web search results.
```

When always-search is disabled, the LLM receives:

```
# Real-Time Web Search

You have access to real-time web search through Tavily, which automatically activates for queries requiring current information.

The system will automatically fetch web search results and inject them into your context.

**Important**: If a query needs current info, it will be automatically searched.
```

## Frequently Asked Questions

### Q: Does always-search affect artifacts/images?

**A**: No. Artifacts and images explicitly skip search because they don't benefit from current web data. A React component or image doesn't need real-time information to be generated correctly.

### Q: What happens if Tavily API fails?

**A**: Graceful degradation. The chat continues without search results, and the LLM responds using its training data. The error is logged for monitoring.

### Q: Can users disable search per-message?

**A**: Not currently implemented. Search is controlled via environment variable (global setting). To add per-message control, you'd need to:
1. Add `disableSearch: boolean` to request body
2. Update `shouldSearch` logic to check this flag
3. Update frontend to provide toggle

### Q: How does this affect rate limiting?

**A**: Always-search DOES NOT bypass Tavily rate limits:
- **API throttle**: 10 requests/60 seconds (enforced at edge function level)
- **Guest limits**: 10 searches/5 hours
- **Authenticated limits**: 50 searches/5 hours

High-volume users will hit caps faster with always-search enabled.

### Q: Can I use always-search with intent detection?

**A**: Yes! That's exactly how it's implemented. The logic is:

```typescript
shouldSearch = !artifact && !image && (ALWAYS_SEARCH || intentDetected)
```

This means:
- **Always-search ON**: Every chat message searches
- **Always-search OFF**: Only messages with temporal/search keywords

### Q: What if I want search for artifacts too?

**A**: Edit `chat/index.ts:399-405` and remove the exclusions:

```typescript
const shouldSearch = lastUserMessage && (
  TAVILY_CONFIG.ALWAYS_SEARCH_ENABLED ||
  shouldPerformWebSearch(lastUserMessage.content)
);
```

**Warning**: This will significantly increase search volume and costs.

## Recommendations

### For Production Apps

**Keep always-search DISABLED** and rely on intent detection unless:
- You're building a research/fact-checking app
- You have Tavily Pro plan (higher limits)
- User base is small and controlled
- Budget is allocated for search costs

### For Development/Testing

**Enable always-search temporarily** to:
- Test search integration
- Verify citation behavior
- Benchmark latency impact
- Estimate costs for your use case

Then disable before scaling to production.

### Hybrid Approach (Recommended)

1. **Default**: Intent-based search (disabled always-search)
2. **Power users**: Offer "Research Mode" toggle in UI (per-session override)
3. **Premium tier**: Enable always-search for paid users only

This balances cost control with user needs.

## Related Documentation

- **Tavily Integration**: `supabase/functions/_shared/TAVILY_INTEGRATION.md`
- **Intent Detection**: `supabase/functions/chat/intent-detector-embeddings.ts`
- **Configuration**: `supabase/functions/_shared/config.ts`
- **System Prompt**: `supabase/functions/_shared/system-prompt-inline.ts`

## Changelog

- **2025-11-24**: Initial implementation of always-search mode with environment variable control
