# Multiple Google AI Studio API Keys Setup

**Purpose**: Use separate API keys from different Google AI Studio projects to pool rate limits

**Strategy**:
- **Key 1 (CHAT)**: Chat, title generation, summarization
- **Key 2 (IMAGE)**: Image generation (isolated due to higher quota needs)

---

## Step 1: Add Your API Keys to `.env`

Replace the placeholder values:

```bash
# Key 1: Chat, Title & Summarization (Project A)
GOOGLE_AI_STUDIO_KEY_CHAT="AIzaSy...your_actual_chat_key_here"

# Key 2: Image Generation (Project B)
GOOGLE_AI_STUDIO_KEY_IMAGE="AIzaSy...your_actual_image_key_here"
```

---

## Step 2: Set Keys in Supabase Secrets

```bash
# Set both keys in Supabase (required for deployed edge functions)
supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT=AIzaSy...your_actual_chat_key_here
supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE=AIzaSy...your_actual_image_key_here
```

---

## Step 3: Deploy Updated Edge Functions

```bash
# Deploy all functions to pick up the new key names
supabase functions deploy chat
supabase functions deploy generate-title
supabase functions deploy generate-image
supabase functions deploy summarize-conversation
```

**Deployment time**: ~2-3 minutes total

---

## Step 4: Verify Deployment

```bash
# Run the verification test
./scripts/test-migration-verification.sh
```

**Expected output**:
```
✅ Chat function working
✅ SSE streaming format detected
✅ No Lovable Cloud references found
✅ GOOGLE_AI_STUDIO_KEY_CHAT configured in Supabase
✅ GOOGLE_AI_STUDIO_KEY_IMAGE configured in Supabase
```

---

## Function → Key Mapping

| Function | Uses Key | Purpose |
|----------|----------|---------|
| `chat` | `GOOGLE_AI_STUDIO_KEY_CHAT` | Main chat streaming |
| `generate-title` | `GOOGLE_AI_STUDIO_KEY_CHAT` | Auto-title generation |
| `summarize-conversation` | `GOOGLE_AI_STUDIO_KEY_CHAT` | Conversation summaries |
| `generate-image` | `GOOGLE_AI_STUDIO_KEY_IMAGE` | Image generation (isolated quota) |

---

## Benefits of This Approach

### 1. **Rate Limit Pooling**
Each Google AI Studio project has independent rate limits:
- Free tier: ~60 requests/minute per project
- With 2 projects: Effectively ~120 requests/minute

### 2. **Image Generation Isolation**
Image generation is quota-intensive. By isolating it:
- Image requests don't exhaust chat quota
- Chat remains responsive even during heavy image generation
- Better demo experience (no "rate limited" errors during presentations)

### 3. **Cost Tracking**
Separate projects enable per-feature cost tracking in Google Cloud Console

---

## Troubleshooting

### Error: "GOOGLE_AI_STUDIO_KEY_CHAT is not configured"
**Fix**:
```bash
# Check if secret is set
supabase secrets list

# If missing, set it
supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT=your_key_here

# Redeploy affected functions
supabase functions deploy chat
supabase functions deploy generate-title
supabase functions deploy summarize-conversation
```

### Error: "GOOGLE_AI_STUDIO_KEY_IMAGE is not configured"
**Fix**:
```bash
supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE=your_key_here
supabase functions deploy generate-image
```

### Test Individual Functions

```bash
# Test chat function
curl -X POST "https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/chat" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"sessionId":"test","isGuest":true}'

# Test image function (requires auth)
curl -X POST "https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-image" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A sunset","mode":"generate"}'
```

---

## Next Steps After Setup

1. ✅ Verify all edge functions work
2. ✅ Test in browser (`npm run dev`)
3. ✅ Take screenshots for portfolio
4. ✅ Document quota usage in Google AI Studio dashboard

---

## API Key Best Practices

### Security
- ✅ Never commit API keys to git
- ✅ Use Supabase secrets for production
- ✅ Rotate keys if accidentally exposed

### Monitoring
- Check quota usage: https://aistudio.google.com/app/apikey
- Set up alerts for quota exhaustion
- Monitor rate limit errors in Supabase logs

### Scaling
If you hit rate limits frequently:
1. Create additional Google AI Studio projects
2. Add more keys to `.env` and Supabase secrets
3. Implement round-robin key rotation in edge functions

---

*Last Updated: 2025-01-07*
*Related: `.claude/MIGRATION_ACTION_PLAN.md`, `.claude/MIGRATION_QUICK_START.md`*
