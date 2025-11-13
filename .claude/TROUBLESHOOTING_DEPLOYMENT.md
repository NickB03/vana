# Troubleshooting: Chat Function Hanging

## Issue Observed

When testing "build a todo list app", the chat function request is pending for 15+ seconds without response.

## Possible Causes

### 1. OpenRouter Embedding Key Not Properly Set
**Most Likely Issue**

The Edge Function might not be able to access `OPENROUTER_EMBEDDING_KEY`.

**Check:**
```bash
# Verify the secret is set
supabase secrets list

# Should show: OPENROUTER_EMBEDDING_KEY
```

**Fix:**
```bash
# Reset the secret
supabase secrets set OPENROUTER_EMBEDDING_KEY=sk-or-v1-your-actual-key
```

### 2. OpenRouter API Error

The OpenRouter API might be rejecting requests.

**Check Logs:**
```bash
# View Edge Function logs in Supabase Dashboard
# Go to: Project → Edge Functions → chat → Logs
```

**Look for:**
- `⚠️  OPENROUTER_EMBEDDING_KEY not set`
- `OpenRouter error: 401` (invalid key)
- `OpenRouter error: 429` (rate limit)
- `OpenRouter embedding failed`

### 3. Dimension Mismatch

Though unlikely (we verified), there could be a mismatch between query and stored embeddings.

**Verify Database:**
```sql
-- Check stored embedding dimensions
SELECT
  intent,
  vector_dims(embedding) as dimensions,
  COUNT(*) as count
FROM intent_examples
GROUP BY intent, vector_dims(embedding);

-- Should show: 1024 dimensions for all intents
```

### 4. Cold Start + Slow OpenRouter Response

First request can be slow due to:
- Edge Function cold start (~2-5s)
- OpenRouter API call (~1-3s)
- pgvector search (~0.1s)
- Gemini API call (~5-10s)

**Total**: ~8-18s for first request

**Solution**: Wait longer or retry

## Debugging Steps

### Step 1: Check Edge Function Logs

**Via Dashboard:**
1. Go to https://supabase.com/dashboard/project/vznhbocnuykdmjvujaka/functions
2. Click "chat" function
3. Click "Logs" tab
4. Look for recent errors

**Expected Success Logs:**
```
🎯 Using OpenRouter for query embedding: qwen/qwen3-embedding-0.6b
🎯 Intent Detection: {
  intent: 'react',
  confidence: 'high',
  similarity: '0.854',
  ...
}
```

**Error Logs to Watch For:**
```
⚠️  OPENROUTER_EMBEDDING_KEY not set
❌ OpenRouter embedding failed
❌ No embedding service available
```

### Step 2: Test OpenRouter Key Directly

```bash
# Test your OpenRouter key
curl https://openrouter.ai/api/v1/embeddings \
  -H "Authorization: Bearer $OPENROUTER_EMBEDDING_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen3-embedding-0.6b",
    "input": "test",
    "dimensions": 1024
  }'

# Should return: {"data":[{"embedding":[...]}]}
```

### Step 3: Verify Database Embeddings

```bash
# Connect to Supabase and check
python3 -c "
from supabase import create_client
import os

supabase = create_client(
    'https://vznhbocnuykdmjvujaka.supabase.co',
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)

# Check total count
result = supabase.table('intent_examples').select('id', count='exact').execute()
print(f'Total embeddings: {result.count}')

# Check sample
sample = supabase.table('intent_examples').select('intent, text').limit(3).execute()
for r in sample.data:
    print(f'{r[\"intent\"]}: {r[\"text\"][:50]}')
"
```

### Step 4: Test with Regex Fallback

To verify the issue is embedding-related:

**Temporarily remove OpenRouter dependency:**
```typescript
// In intent-detector-embeddings.ts, line 97
export async function detectIntent(prompt: string): Promise<IntentResult> {
  // Temporarily bypass embeddings
  return detectIntentRegex(prompt);

  // ... rest of code
}
```

Redeploy and test. If this works, the issue is definitely with OpenRouter embeddings.

## Quick Fixes

### Fix 1: Verify and Reset OpenRouter Key

```bash
# Check if key is set
supabase secrets list

# Reset it
supabase secrets set OPENROUTER_EMBEDDING_KEY=sk-or-v1-your-key

# Redeploy (forces function restart)
supabase functions deploy chat
```

### Fix 2: Add Timeout to OpenRouter Call

Update `intent-detector-embeddings.ts`:

```typescript
const response = await fetch(OPENROUTER_URL, {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({ /* ... */ }),
  signal: AbortSignal.timeout(10000) // 10 second timeout
});
```

### Fix 3: Increase Function Timeout

Edge Functions have a default 60s timeout, but you can verify:

```bash
# Check function config
cat supabase/functions/chat/index.ts | head -20
```

## Testing Checklist

- [ ] OpenRouter key is set in Supabase secrets
- [ ] Test OpenRouter API directly (curl command above)
- [ ] Check Supabase Edge Function logs for errors
- [ ] Verify 132 embeddings exist in database
- [ ] All embeddings are 1024 dimensions
- [ ] Try with a fresh chat session
- [ ] Wait at least 30 seconds for first request
- [ ] Check browser console for frontend errors

## Success Criteria

When working correctly, you should see:

1. **Browser Network Tab:**
   - POST /functions/v1/chat → 200 OK
   - Response time: 8-18s (first request), 3-8s (subsequent)

2. **Edge Function Logs:**
   ```
   🎯 Using OpenRouter for query embedding: qwen/qwen3-embedding-0.6b
   🎯 Intent Detection: { intent: 'react', confidence: 'high', similarity: '0.854' }
   ```

3. **Chat UI:**
   - Message sent successfully
   - AI response streams in
   - Artifact generated (for react intent)

## If All Else Fails

**Rollback to Regex Detection:**

```bash
# Temporarily use regex-only detection
git checkout HEAD~1 supabase/functions/chat/intent-detector-embeddings.ts
supabase functions deploy chat
```

This will use keyword matching instead of embeddings until you resolve the OpenRouter issue.

## Next Steps

1. **Check Supabase Dashboard logs** (most important)
2. **Verify OpenRouter key** with curl test
3. **Wait 30+ seconds** for cold start
4. **Try another prompt** to rule out fluke

---

**Status**: Deployment complete, testing in progress
**Issue**: Request hanging (15+ seconds)
**Most Likely Cause**: OpenRouter key not accessible or API error
**Next Action**: Check Supabase Edge Function logs
