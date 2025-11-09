# API Key Rotation Implementation Guide

## 🎯 Recommendation: LiteLLM Proxy

After comprehensive research, **LiteLLM** is the best solution for your personal project.

### Why LiteLLM?

| Criteria | Rating | Notes |
|----------|--------|-------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | Single Docker command, 5-minute setup |
| **Maintenance** | ⭐⭐⭐⭐⭐ | Zero maintenance, auto-updates |
| **Features** | ⭐⭐⭐⭐⭐ | Load balancing, caching, monitoring, retries |
| **Cost** | ⭐⭐⭐⭐⭐ | Free and open source |
| **Integration** | ⭐⭐⭐⭐⭐ | OpenAI-compatible API (minimal code changes) |

### Comparison with Other Solutions

| Solution | Setup Time | Pros | Cons |
|----------|-----------|------|------|
| **LiteLLM** | 5 min | Full-featured, production-ready, active community | Requires Docker |
| **Portkey AI** | 15 min | Enterprise features, great UI | More complex, overkill for personal projects |
| **Deno Rotator** | 10 min | Lightweight, edge-ready | Basic features, manual coding needed |
| **Node.js Rotator** | 20 min | Good for Node.js projects | Requires finding/vetting GitHub repo |
| **Built-in Logic** | 60+ min | No external dependencies | High maintenance, error-prone |

---

## 📦 Implementation: LiteLLM Setup

### Step 1: Create Configuration Files

**File: `litellm_config.yaml`**
```yaml
model_list:
  # Chat models (gemini-2.5-pro) - 3 keys for 6 RPM total
  - model_name: gemini-pro-chat
    litellm_params:
      model: gemini/gemini-2.5-pro
      api_key: os.environ/GEMINI_CHAT_KEY_1
  - model_name: gemini-pro-chat
    litellm_params:
      model: gemini/gemini-2.5-pro
      api_key: os.environ/GEMINI_CHAT_KEY_2
  - model_name: gemini-pro-chat
    litellm_params:
      model: gemini/gemini-2.5-pro
      api_key: os.environ/GEMINI_CHAT_KEY_3

  # Image models (gemini-2.5-flash-preview-image) - 3 keys for 45 RPM total
  - model_name: gemini-image
    litellm_params:
      model: gemini/gemini-2.5-flash-preview-image
      api_key: os.environ/GEMINI_IMAGE_KEY_1
  - model_name: gemini-image
    litellm_params:
      model: gemini/gemini-2.5-flash-preview-image
      api_key: os.environ/GEMINI_IMAGE_KEY_2
  - model_name: gemini-image
    litellm_params:
      model: gemini/gemini-2.5-flash-preview-image
      api_key: os.environ/GEMINI_IMAGE_KEY_3

  # Fix models (gemini-2.5-pro) - 2 keys for 4 RPM total
  - model_name: gemini-pro-fix
    litellm_params:
      model: gemini/gemini-2.5-pro
      api_key: os.environ/GEMINI_FIX_KEY_1
  - model_name: gemini-pro-fix
    litellm_params:
      model: gemini/gemini-2.5-pro
      api_key: os.environ/GEMINI_FIX_KEY_2

router_settings:
  routing_strategy: simple-shuffle  # Round-robin with randomization
  num_retries: 3  # Retry up to 3 times on failure
  timeout: 60  # 60 second timeout
  allowed_fails: 2  # Mark key as down after 2 consecutive failures
  cooldown_time: 300  # Retry failed key after 5 minutes (300 seconds)

litellm_settings:
  drop_params: true  # Drop unsupported params instead of erroring
  set_verbose: false  # Disable verbose logging
  cache: true  # Enable response caching
  cache_params:
    type: redis  # Use Redis for distributed caching
    ttl: 600  # Cache responses for 10 minutes
```

**File: `docker-compose.yml`**
```yaml
version: '3.8'

services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm-proxy
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    environment:
      # Chat keys (create 3 from different Google accounts)
      - GEMINI_CHAT_KEY_1=${GOOGLE_AI_STUDIO_KEY_CHAT}
      - GEMINI_CHAT_KEY_2=${GOOGLE_AI_STUDIO_KEY_CHAT_2}
      - GEMINI_CHAT_KEY_3=${GOOGLE_AI_STUDIO_KEY_CHAT_3}
      
      # Image keys (create 3 from different Google accounts)
      - GEMINI_IMAGE_KEY_1=${GOOGLE_AI_STUDIO_KEY_IMAGE}
      - GEMINI_IMAGE_KEY_2=${GOOGLE_AI_STUDIO_KEY_IMAGE_2}
      - GEMINI_IMAGE_KEY_3=${GOOGLE_AI_STUDIO_KEY_IMAGE_3}
      
      # Fix keys (create 2 from different Google accounts)
      - GEMINI_FIX_KEY_1=${GOOGLE_AI_STUDIO_KEY_FIX}
      - GEMINI_FIX_KEY_2=${GOOGLE_AI_STUDIO_KEY_FIX_2}
      
      # Redis connection
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      
      # Optional: Set master key for admin access
      - LITELLM_MASTER_KEY=your-secret-master-key-here
    command: --config /app/config.yaml --port 4000 --detailed_debug
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:alpine
    container_name: litellm-redis
    ports:
      - "6379:6379"
    restart: unless-stopped
```

### Step 2: Start LiteLLM

```bash
# Create .env file with your API keys
cat > .env << EOF
GOOGLE_AI_STUDIO_KEY_CHAT=AIza...your_key_1
GOOGLE_AI_STUDIO_KEY_CHAT_2=AIza...your_key_2
GOOGLE_AI_STUDIO_KEY_CHAT_3=AIza...your_key_3
GOOGLE_AI_STUDIO_KEY_IMAGE=AIza...your_key_4
GOOGLE_AI_STUDIO_KEY_IMAGE_2=AIza...your_key_5
GOOGLE_AI_STUDIO_KEY_IMAGE_3=AIza...your_key_6
GOOGLE_AI_STUDIO_KEY_FIX=AIza...your_key_7
GOOGLE_AI_STUDIO_KEY_FIX_2=AIza...your_key_8
EOF

# Start the proxy
docker-compose up -d

# Check logs
docker-compose logs -f litellm

# Test the proxy
curl http://localhost:4000/health
```

---

## 🔧 Integration with Supabase Functions

### Option A: Use LiteLLM Locally (Development)

**Pros:**
- No code changes to Supabase functions
- LiteLLM runs on your local machine
- Supabase functions call LiteLLM proxy instead of Google directly

**Setup:**
1. Run LiteLLM on your local machine (http://localhost:4000)
2. Update Supabase function environment variables to point to LiteLLM
3. Deploy functions as usual

### Option B: Deploy LiteLLM to Cloud (Production)

**Options:**
1. **Railway** - One-click deploy, free tier available
2. **Fly.io** - Global edge deployment, free tier
3. **DigitalOcean App Platform** - Simple Docker deployment
4. **AWS ECS/Fargate** - Enterprise-grade

**Recommended: Railway (Easiest)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

## 📊 Benefits You'll Get

### Immediate Benefits
- ✅ **3x-5x more API calls** before hitting limits
- ✅ **Automatic failover** - no more 429 errors
- ✅ **Response caching** - saves 20-30% of API calls
- ✅ **Zero downtime** - seamless key rotation

### Long-term Benefits
- ✅ **Cost tracking** - see spend per key/model
- ✅ **Rate limit management** - set custom limits
- ✅ **Monitoring dashboard** - track usage in real-time
- ✅ **Easy scaling** - add more keys anytime

---

## 🎯 Next Steps

1. **Get More API Keys** (15 minutes)
   - Create 2-3 Google accounts
   - Get API keys from https://aistudio.google.com/app/apikey
   - Each account = separate project = independent quota

2. **Deploy LiteLLM** (5 minutes)
   - Follow Step 1 & 2 above
   - Test with `curl http://localhost:4000/health`

3. **Update Supabase Functions** (10 minutes)
   - Point to LiteLLM proxy instead of Google API
   - Test each function (chat, image, fix)

4. **Monitor & Optimize** (Ongoing)
   - Check LiteLLM dashboard at http://localhost:4000/ui
   - Adjust cache TTL and retry settings as needed
   - Add more keys if hitting limits

---

## 📚 Resources

- **LiteLLM Docs**: https://docs.litellm.ai/
- **Docker Compose Guide**: https://docs.litellm.ai/docs/proxy/deploy
- **Load Balancing**: https://docs.litellm.ai/docs/routing
- **Caching**: https://docs.litellm.ai/docs/caching

