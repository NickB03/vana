# Local Embeddings Migration Guide

## Overview

This guide documents the migration from Supabase AI embeddings to locally-generated embeddings using LM Studio with the **mixedbread-ai/mxbai-embed-large-v1** model - a SOTA embedding model that outperforms OpenAI's text-embedding-3-large.

### Architecture

```
┌─────────────────────┐
│  LM Studio (Local)  │ → Generate 1024-dim embeddings
│   mxbai-embed-v1    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ intent_embeddings   │ → Store locally as JSON
│       .json         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Postgres  │ → Upload and store embeddings
│   pgvector (1024)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Runtime Search    │ → Cosine similarity via SQL
│  (Edge Functions)   │
└─────────────────────┘
```

**Key Benefits:**
- ✅ **SOTA embeddings**: Outperforms OpenAI text-embedding-3-large on MTEB
- ✅ **Higher quality**: 1024 dimensions vs 384 (Supabase AI gte-small)
- ✅ **Optimized for retrieval**: Built specifically for search tasks
- ✅ **Local generation**: Free & no rate limits for creating embeddings
- ✅ **Flexible runtime**: LM Studio (dev) or OpenRouter (production)
- ✅ **Fast search**: pgvector cosine similarity in Supabase

## Step 1: Generate Embeddings Locally

### Prerequisites
1. **Install LM Studio**: Download from https://lmstudio.ai
2. **Download Model**: In LM Studio, search for and download `mixedbread-ai/mxbai-embed-large-v1`
3. **Start Server**: Click "Start Server" in LM Studio (localhost:1234)

**Why mxbai-embed-large-v1?**
- #1 on MTEB benchmark for BERT-large sized models (March 2024)
- Optimized retrieval with special query prompts
- Supports Matryoshka representation (can reduce to 512 dims if needed)
- Native binary quantization support for efficiency

### Generate Embeddings

```bash
# Install Python dependencies
pip3 install requests

# Generate embeddings (takes ~2-3 minutes for 132 examples)
python3 create_embeddings.py
```

**Output:** `intent_embeddings.json` (3.9 MB, 132 examples, 1024 dimensions each)

## Step 2: Apply Database Migration

The migration updates the Supabase schema to support 1024-dimensional vectors:

```bash
# Apply migration to production database
supabase db push
```

**What it does:**
- Drops old 384-dim table
- Creates new 1024-dim table with pgvector support
- Updates `match_intent_examples` function for 1024 dimensions
- Creates IVFFlat index for fast similarity search (11 lists for ~132 examples)

## Step 3: Upload Embeddings to Supabase

### Get Service Role Key

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Copy the **Service Role Key** (⚠️ Keep this secret!)

### Set Environment Variables

```bash
# Set Supabase credentials (replace with your values)
export SUPABASE_URL="https://vznhbocnuykdmjvujaka.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### Run Upload Script

```bash
# Install Supabase Python client
pip3 install supabase

# Upload embeddings to database
python3 upload_embeddings.py
```

**Expected Output:**
```
🚀 Supabase Intent Embeddings Uploader
====================================
✅ Supabase URL: https://vznhbocnuykdmjvujaka.supabase.co
📂 Loading embeddings from JSON...
   Loaded 132 examples
   Embedding dimension: 768

🔌 Connecting to Supabase...
   Connected successfully

🗑️  Clearing existing intent_examples data...
   Deleted 0 existing records

📤 Uploading embeddings to Supabase...
   Processing intent: 'react' (34 examples)
      Uploaded batch (34/132)
   Processing intent: 'image' (25 examples)
      Uploaded batch (59/132)
   ...

🔍 Verifying upload...
   ✅ SUCCESS! 132 records uploaded and verified
      react: 34 examples
      image: 25 examples
      code: 20 examples
      mermaid: 15 examples
      markdown: 15 examples
      chat: 15 examples
      svg: 8 examples

====================================
✅ Upload complete!
====================================
```

## Step 4: Runtime Embedding Generation

✅ **SOLVED**: Runtime embedding generation now supports both local dev and production.

### How It Works

The system tries multiple embedding sources in order:

1. **LM Studio** (localhost:1234) - For local development
2. **OpenRouter** (with API key) - For production deployment
3. **Regex fallback** - If neither available

### Important: Query Prompt

The **mxbai-embed-large-v1** model requires a special prompt for query embeddings:

```
"Represent this sentence for searching relevant passages: " + user_query
```

**Critical**: This prompt is used ONLY for queries, NOT for document embeddings!
- ✅ Document embeddings (stored): No special prompt
- ✅ Query embeddings (runtime): Uses the special prompt

This is already handled in `intent-detector-embeddings.ts`.

### Setup: OpenRouter for All Environments

**Production:**
```bash
# Set in Supabase secrets
supabase secrets set OPENROUTER_EMBEDDING_KEY=sk-or-v1-your-key-here
```

**Local Development:**
```bash
# Add to .env.local
echo "OPENROUTER_EMBEDDING_KEY=sk-or-v1-your-key-here" >> .env.local
```

**Cost**: qwen/qwen3-embedding-0.6b: ~$0.0001 per 1M tokens (extremely cheap)

## Step 5: Verify Intent Detection

### Test in Development

```bash
# Start local development
npm run dev
supabase functions serve
```

### Test Prompts

Try these prompts in your chat interface and check the logs:

1. **Image intent**: "generate a sunset over mountains"
2. **React intent**: "build a todo list app"
3. **Code intent**: "write a Python function to merge sort"
4. **Mermaid intent**: "create a flowchart for user login"
5. **Chat intent**: "what is React?"

### Expected Logs

**Expected logs (all environments):**
```
🎯 Using OpenRouter for query embedding: qwen/qwen3-embedding-0.6b
🎯 Intent Detection: {
  intent: 'image',
  confidence: 'high',
  similarity: '0.943',
  matchedExample: 'generate a sunset over mountains...',
  userPrompt: 'generate a sunset over mountains...',
  latencyMs: 180
}
```

## Maintenance

### Adding New Intent Examples

1. Edit `supabase/functions/intent-examples/index.ts`
2. Add new examples to the appropriate category
3. Re-run embedding generation:
   ```bash
   python3 create_embeddings.py
   python3 upload_embeddings.py
   ```

### Monitoring

Check embedding quality and accuracy:

```sql
-- View all stored embeddings
SELECT intent, text, vector_dims(embedding) as dims
FROM intent_examples;

-- Test similarity search manually
SELECT intent, text,
  1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM intent_examples
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

## Files Created/Modified

- ✅ `create_embeddings.py` - Generate embeddings via LM Studio (mxbai model)
- ✅ `upload_embeddings.py` - Upload to Supabase
- ✅ `intent_embeddings.json` - Local embedding storage (3.9 MB, 1024-dim)
- ✅ `supabase/migrations/20251112_update_embeddings_to_1024.sql` - Schema update
- ✅ `supabase/functions/chat/intent-detector-embeddings.ts` - Runtime detection
- ✅ `.claude/LOCAL_EMBEDDINGS_MIGRATION.md` - This guide

## Troubleshooting

### LM Studio Connection Failed

```
Error: Failed to generate embedding. Is LM Studio running on localhost:1234?
```

**Solution**: Start LM Studio and enable the server

### Dimension Mismatch Error

```
Error: Vector dimension mismatch: expected 1024, got XXX
```

**Solution**: Ensure both stored and runtime embeddings are 1024-dimensional
- Stored: Run `create_embeddings.py` with mxbai-embed-large-v1
- Runtime: Use text-embedding-3-large (OpenRouter) or mxbai (LM Studio)

### Upload Failed: Permission Denied

```
Error: permission denied for table intent_examples
```

**Solution**: Use Service Role Key, not anon key

### Zero Results at Runtime

```
No similar examples found (similarity < 50%)
```

**Solution**: Check that embeddings were uploaded correctly:

```sql
SELECT COUNT(*) FROM intent_examples; -- Should be 132
```

## Migration Status

1. ✅ **Embeddings generated locally** (1024-dim via mxbai-embed-large-v1)
2. ✅ **Database schema updated** (supports 1024-dim vectors)
3. ✅ **Runtime embedding generation** (LM Studio + OpenRouter fallback)
4. ⏳ **Upload embeddings to Supabase** (waiting for you to run upload script)
5. ⏳ **End-to-end testing** (after upload)

## Quick Start Checklist

```bash
# 1. Verify embeddings were generated
ls -lh intent_embeddings.json  # Should be ~3.9 MB

# 2. Set environment variables
export SUPABASE_URL="https://vznhbocnuykdmjvujaka.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 3. Upload embeddings
python3 upload_embeddings.py

# 4. (Optional) Set OpenRouter key for production
supabase secrets set OPENROUTER_API_KEY=your-key-here

# 5. Test locally
npm run dev
supabase functions serve
# Try test prompts in your chat interface
```

---

**Last Updated**: November 12, 2025
**Model**: mixedbread-ai/mxbai-embed-large-v1 (1024 dimensions)
**Status**: ✅ Ready for upload and testing
