# LiteLLM API Key Rotation - Quick Start

## 🚀 5-Minute Setup

### Step 1: Get More API Keys (15 minutes)

You need 2-3 API keys per feature (8 keys total recommended):

1. **Create 2-3 Google accounts** (use Gmail, can be throwaway accounts)
2. **Get API keys** from each account:
   - Visit: https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key (starts with `AIza...`)
3. **Repeat** for each account

**Why multiple accounts?**
- Each Google account = separate project = independent rate limits
- 3 keys for images = 45 RPM instead of 15 RPM
- 3 keys for chat = 6 RPM instead of 2 RPM

### Step 2: Configure Environment (2 minutes)

```bash
# Copy the example file
cp .env.example .env

# Edit .env and paste your API keys
nano .env  # or use your favorite editor
```

**Minimum configuration (works with existing keys):**
```env
GOOGLE_AI_STUDIO_KEY_CHAT=AIza...your_existing_chat_key
GOOGLE_AI_STUDIO_KEY_IMAGE=AIza...your_existing_image_key
GOOGLE_AI_STUDIO_KEY_FIX=AIza...your_existing_fix_key
```

**Recommended configuration (with rotation):**
```env
# Chat keys (3 keys = 6 RPM total)
GOOGLE_AI_STUDIO_KEY_CHAT=AIza...key1
GOOGLE_AI_STUDIO_KEY_CHAT_2=AIza...key2
GOOGLE_AI_STUDIO_KEY_CHAT_3=AIza...key3

# Image keys (3 keys = 45 RPM total)
GOOGLE_AI_STUDIO_KEY_IMAGE=AIza...key4
GOOGLE_AI_STUDIO_KEY_IMAGE_2=AIza...key5
GOOGLE_AI_STUDIO_KEY_IMAGE_3=AIza...key6

# Fix keys (2 keys = 4 RPM total)
GOOGLE_AI_STUDIO_KEY_FIX=AIza...key7
GOOGLE_AI_STUDIO_KEY_FIX_2=AIza...key8
```

### Step 3: Start LiteLLM (1 minute)

```bash
# Start the proxy
docker-compose up -d

# Check if it's running
docker-compose ps

# View logs
docker-compose logs -f litellm

# Test the health endpoint
curl http://localhost:4000/health
```

**Expected output:**
```json
{"status": "healthy"}
```

### Step 4: Access the Dashboard (Optional)

Open your browser to: **http://localhost:4000/ui**

You'll see:
- ✅ Active models and keys
- ✅ Request count per key
- ✅ Success/failure rates
- ✅ Cache hit rates
- ✅ Real-time monitoring

---

## 🎯 How It Works

### Before (Single Key)
```
Your App → Google API (Key 1) → 429 Error ❌
```
**Problem:** Hit rate limit after 2 requests/minute

### After (LiteLLM with 3 Keys)
```
Your App → LiteLLM Proxy → Google API (Key 1) ✅
Your App → LiteLLM Proxy → Google API (Key 2) ✅
Your App → LiteLLM Proxy → Google API (Key 3) ✅
Your App → LiteLLM Proxy → Google API (Key 1) ✅  [Key 1 quota reset]
```
**Result:** 6 requests/minute (3x capacity) + automatic failover

### When a Key Hits Limit
```
Request 1 → Key 1 → 429 Error → Retry with Key 2 → Success ✅
```
**Seamless:** Your app never sees the 429 error!

---

## 📊 Benefits You Get

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| **Chat RPM** | 2 | 6 | 3x capacity |
| **Image RPM** | 15 | 45 | 3x capacity |
| **Fix RPM** | 2 | 4 | 2x capacity |
| **Downtime on 429** | Yes ❌ | No ✅ | Automatic failover |
| **Response Caching** | No | Yes ✅ | 20-30% fewer API calls |
| **Monitoring** | No | Yes ✅ | Real-time dashboard |

---

## 🔧 Integration with Supabase (Next Step)

### Option 1: Local Development (Easiest)

**No code changes needed!** Just update environment variables:

```bash
# In your Supabase .env.local
GEMINI_API_BASE_URL=http://localhost:4000/v1
```

Your Supabase functions will now route through LiteLLM automatically.

### Option 2: Production Deployment

Deploy LiteLLM to a cloud service:

**Recommended: Railway (Free Tier)**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then update Supabase secrets:
```bash
supabase secrets set GEMINI_API_BASE_URL=https://your-litellm.railway.app/v1
```

---

## 🛠️ Common Commands

```bash
# Start LiteLLM
docker-compose up -d

# Stop LiteLLM
docker-compose down

# View logs
docker-compose logs -f litellm

# Restart after config changes
docker-compose restart litellm

# Check status
curl http://localhost:4000/health

# View all models
curl http://localhost:4000/models

# Test chat endpoint
curl -X POST http://localhost:4000/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-pro-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 📚 Next Steps

1. ✅ **Get more API keys** (15 min) - Create 2-3 Google accounts
2. ✅ **Start LiteLLM** (1 min) - Run `docker-compose up -d`
3. ✅ **Test it works** (2 min) - Visit http://localhost:4000/ui
4. ⏭️ **Update Supabase functions** (10 min) - Point to LiteLLM proxy
5. ⏭️ **Monitor usage** (ongoing) - Check dashboard regularly

---

## 🆘 Troubleshooting

**LiteLLM won't start:**
```bash
# Check Docker is running
docker ps

# Check logs for errors
docker-compose logs litellm

# Verify config file syntax
cat litellm_config.yaml
```

**Keys not working:**
```bash
# Verify keys are set
docker-compose exec litellm env | grep GEMINI

# Test a key directly
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

**Still getting 429 errors:**
- Check if all keys are exhausted (view dashboard)
- Add more keys to the pool
- Increase cooldown_time in config
- Enable caching to reduce API calls

---

## 📖 Full Documentation

See `.claude/API_KEY_ROTATION_GUIDE.md` for complete details.

**Official LiteLLM Docs:** https://docs.litellm.ai/

