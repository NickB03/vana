# Tavily Integration Testing Guide

## Quick Start

### 1. Set API Key (Required)
```bash
supabase secrets set TAVILY_API_KEY=tvly-xxxxxxxxxxxxx --project-ref <ref>
```

Get your key from: https://tavily.com

### 2. Deploy Function
```bash
cd supabase/functions
supabase functions deploy chat --project-ref <ref>
```

### 3. Monitor Logs
```bash
supabase functions logs chat --tail
```

---

## Test Cases

### ✅ Test 1: Basic Search Query
**User Input**: `"what is the latest news about AI?"`

**Expected Logs**:
```
🔍 [requestId] Web search intent detected
✅ [requestId] Tavily search completed: 5 results in 843ms
📤 [requestId] Injecting search context (1247 chars) into system message
```

**Expected Response**: AI mentions recent AI news with source citations

---

### ✅ Test 2: Temporal Query
**User Input**: `"what is the current price of Bitcoin?"`

**Expected Logs**:
```
🔍 [requestId] Temporal/information pattern detected
✅ [requestId] Tavily search completed: 5 results in 612ms
```

**Expected Response**: AI provides current Bitcoin price from web

---

### ✅ Test 3: Non-Search Query
**User Input**: `"explain how React hooks work"`

**Expected Logs**:
```
🎯 Intent detected: REGULAR CHAT
🔀 Using: Gemini 2.5 Flash Lite via OpenRouter
```

**Expected Response**: Normal chat response, NO search triggered

---

### ✅ Test 4: Search + Image Request
**User Input**: `"generate an image of the latest iPhone model"`

**Expected Logs**:
```
🔍 [requestId] Web search intent detected
✅ [requestId] Tavily search completed: 5 results in 734ms
🎯 Intent detected: IMAGE generation
```

**Expected Response**: Image generated with context from search results

---

### ✅ Test 5: Graceful Degradation (API Key Missing)
**Setup**: Remove TAVILY_API_KEY temporarily
```bash
supabase secrets unset TAVILY_API_KEY --project-ref <ref>
```

**User Input**: `"what is the latest news about AI?"`

**Expected Logs**:
```
⚠️ [requestId] Web search failed, continuing without search: TAVILY_API_KEY not configured
```

**Expected Response**: Chat continues without search results (graceful fallback)

**Cleanup**: Re-add API key
```bash
supabase secrets set TAVILY_API_KEY=tvly-xxxxxxxxxxxxx --project-ref <ref>
```

---

### ✅ Test 6: Database Usage Logging
**After running searches**, verify logs:

```sql
SELECT
  request_id,
  function_name,
  provider,
  prompt_preview,
  response_length,
  latency_ms,
  estimated_cost,
  retry_count,
  created_at
FROM ai_usage_logs
WHERE provider = 'tavily'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: Rows with `provider = 'tavily'`, `latency_ms > 0`, `estimated_cost = 0.001`

---

## Debugging

### No Search Triggered When Expected
**Check**:
1. Logs show `🔍 Web search intent detected`?
2. If not, pattern matching may need tuning
3. Try more explicit: `"search for latest AI news"`

### Search Fails with Error
**Check**:
1. `TAVILY_API_KEY` is set correctly
2. API key is valid (test at https://tavily.com)
3. Network connectivity from Supabase Edge
4. Rate limits not exceeded (10/minute)

### High Latency
**Check**:
1. Tavily API response time (normally 500-2000ms)
2. Network latency between Supabase and Tavily
3. Consider caching for identical queries

### Search Context Not Appearing in Response
**Check**:
1. `searchExecuted = true` in logs
2. `📤 Injecting search context` appears in logs
3. Context length (should be >0 chars)
4. AI may not use context if irrelevant

---

## Performance Benchmarks

| Metric | Expected Range | Alert If |
|--------|----------------|----------|
| Search trigger rate | 5-15% of chats | >30% (too aggressive) |
| Search latency | 500-2000ms | >3000ms |
| Success rate | >98% | <95% |
| Daily cost | $0.50-$2.00 (500-2000 searches) | >$10/day |
| Error rate | <2% | >5% |

---

## Common Issues

### Issue: "TAVILY_API_KEY not configured"
**Solution**:
```bash
supabase secrets set TAVILY_API_KEY=tvly-xxxxxxxxxxxxx --project-ref <ref>
```

### Issue: Rate limit exceeded
**Solution**: Wait 60 seconds or increase limits in `config.ts`

### Issue: Search results not relevant
**Solution**: Adjust `shouldPerformWebSearch()` patterns to be more selective

### Issue: High cost
**Solution**:
1. Reduce `DEFAULT_MAX_RESULTS` from 5 to 3
2. Tighten search intent detection patterns
3. Implement caching for identical queries

---

## Rollback Plan

If integration causes issues:

```bash
# Disable search by removing API key
supabase secrets unset TAVILY_API_KEY --project-ref <ref>

# Chat will continue working, search will gracefully fail
```

Full rollback:
```bash
git revert <commit-hash>
cd supabase/functions
supabase functions deploy chat --project-ref <ref>
```

---

## Success Criteria

Integration is successful when:

- ✅ Search queries trigger web search (check logs)
- ✅ Non-search queries don't trigger search
- ✅ Search failures don't break chat (graceful degradation)
- ✅ Search results appear in AI responses
- ✅ Usage logged to database correctly
- ✅ Latency <3 seconds for search requests
- ✅ Cost <$5/day in production

---

## Next Steps After Testing

1. Monitor production logs for 24 hours
2. Check usage metrics in database
3. Gather user feedback on search accuracy
4. Consider adding frontend UI for search results
5. Implement caching if needed
6. Tune intent detection patterns based on real usage
