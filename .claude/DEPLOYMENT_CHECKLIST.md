# mxbai Embeddings Deployment Checklist

## ✅ Completed Steps

### 1. Local Embedding Generation
- [x] Downloaded mixedbread-ai/mxbai-embed-large-v1 in LM Studio
- [x] Updated `create_embeddings.py` to use mxbai model
- [x] Generated 132 embeddings (1024 dimensions, 3.9 MB)
- [x] Verified embedding quality with test queries

### 2. Database Migration
- [x] Created migration `20251112_update_embeddings_to_1024.sql`
- [x] Updated schema to support 1024-dimensional vectors
- [x] Updated `match_intent_examples` function signature
- [x] Applied migration to production database

### 3. Embedding Upload
- [x] Updated `upload_embeddings.py` for 1024-dim validation
- [x] Uploaded all 132 embeddings to production Supabase
- [x] Verified upload with sample queries (85.4% similarity for "build a todo app" → react)

### 4. Runtime Code Updates
- [x] Updated `intent-detector-embeddings.ts` with:
  - LM Studio support (localhost:1234)
  - OpenRouter fallback (production)
  - Special query prompt: "Represent this sentence for searching relevant passages: "
  - Regex fallback if no embedding service available
- [x] Removed Supabase AI dependency
- [x] Added comprehensive error handling

## ⏳ Pending Steps

### 5. Deploy Edge Functions to Production

**Command:**
```bash
# Deploy the chat function with updated intent detector
supabase functions deploy chat
```

**What this does:**
- Uploads `supabase/functions/chat/` to production
- Includes updated `intent-detector-embeddings.ts`
- Enables runtime embedding generation via OpenRouter

**Required Environment Variable:**
```bash
# Set OpenRouter embedding key for runtime embeddings (all environments)
supabase secrets set OPENROUTER_EMBEDDING_KEY=sk-or-v1-your-key-here

# For local development, also set in .env.local:
echo "OPENROUTER_EMBEDDING_KEY=sk-or-v1-your-key-here" >> .env.local
```

**Get OpenRouter Key:**
1. Go to https://openrouter.ai/keys
2. Create new key
3. Cost: ~$0.0001 per 1M tokens (qwen/qwen3-embedding-0.6b)

### 6. Test End-to-End in Production

**Test Prompts:**
```
1. "build a todo list app" → Should detect: react
2. "generate a sunset image" → Should detect: image
3. "write a Python sort function" → Should detect: code
4. "create a login flowchart" → Should detect: mermaid
5. "what is React?" → Should detect: chat
```

**Expected Logs** (check via Supabase Dashboard → Edge Functions → Logs):
```
🎯 Using OpenRouter for query embedding: qwen/qwen3-embedding-0.6b
🎯 Intent Detection: {
  intent: 'react',
  confidence: 'high',
  similarity: '0.854',
  matchedExample: 'make a todo list app...',
  userPrompt: 'build a todo list app...',
  latencyMs: 180
}
```

## 🔧 Deployment Commands

### Option A: Deploy with OpenRouter (Recommended for Production)

```bash
# 1. Set OpenRouter embedding key
supabase secrets set OPENROUTER_EMBEDDING_KEY=your-key-here

# 2. Deploy chat function
supabase functions deploy chat

# 3. Verify deployment
curl -X POST https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"build a todo app"}],"isGuest":true}'
```

### Option B: Deploy without OpenRouter (Regex Fallback)

```bash
# Deploy without setting OPENROUTER_EMBEDDING_KEY
supabase functions deploy chat

# Note: Will automatically fall back to regex-based detection (less accurate)
```

## 📊 Architecture Summary

```
User Prompt → Chat Edge Function
           ↓
    Intent Detection (intent-detector-embeddings.ts)
           ↓
    Generate Query Embedding:
      • Try OpenRouter (production) ← mxbai-embed-large-v1
      • Fallback to regex if unavailable
           ↓
    Search Supabase pgvector:
      • 132 pre-computed embeddings (1024-dim)
      • Cosine similarity search
      • Return top match
           ↓
    Route to Appropriate Handler:
      • react → generate-artifact function
      • image → generate-image function
      • chat → direct chat response
```

## 🎯 Success Criteria

- [ ] Edge function deployed successfully
- [ ] OpenRouter embedding key set (optional but recommended)
- [ ] Test prompts return correct intent (>80% similarity)
- [ ] Latency < 500ms for intent detection
- [ ] No errors in production logs

## 📝 Files Modified

| File | Status | Purpose |
|------|--------|---------|
| `create_embeddings.py` | ✅ | Generate embeddings via LM Studio |
| `upload_embeddings.py` | ✅ | Upload to Supabase |
| `intent_embeddings.json` | ✅ | 3.9 MB, 1024-dim embeddings |
| `supabase/migrations/20251112_update_embeddings_to_1024.sql` | ✅ | Schema update |
| `supabase/functions/chat/intent-detector-embeddings.ts` | ✅ | Runtime detection |
| `.claude/LOCAL_EMBEDDINGS_MIGRATION.md` | ✅ | Full migration guide |
| `.claude/MXBAI_EMBEDDINGS_SUMMARY.md` | ✅ | Quick reference |

## 🚀 Next Action

**Run this command to deploy:**
```bash
supabase functions deploy chat
```

Then test in production at: https://your-domain.com

---

**Status**: Ready for deployment
**Date**: November 12, 2025
**Model**: mixedbread-ai/mxbai-embed-large-v1 (1024 dimensions)
