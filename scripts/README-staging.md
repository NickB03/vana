# Staging Environment Setup Guide

Complete guide for deploying and managing the Vana staging environment on Supabase.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Setting Secrets](#setting-secrets)
5. [Deployment](#deployment)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Quick Start

**TL;DR** - Set up staging in 5 minutes:

```bash
# 1. Create staging project on Supabase
# Visit: https://supabase.com/dashboard

# 2. Link local project to staging
supabase link --project-ref <your-staging-ref>

# 3. Copy and fill secrets template
cp scripts/staging-secrets.template.env scripts/staging-secrets.env
# Edit staging-secrets.env with your API keys

# 4. Deploy everything
./scripts/deploy-simple.sh staging

# 5. Verify deployment
curl https://<project-ref>.supabase.co/functions/v1/health
```

---

## Prerequisites

### Required Tools
- **Supabase CLI** (v1.0+): `npm install -g supabase`
- **Node.js** (v18+): For local development
- **Git**: For version control
- **curl** or **httpie**: For testing endpoints

### Required Accounts
- **Supabase Account**: https://supabase.com/dashboard
- **OpenRouter Account**: https://openrouter.ai (for Gemini Flash API)
- **Z.ai Account**: https://docs.z.ai (for GLM-4.6 API)

### Optional Accounts (Enhanced Features)
- **Tavily**: https://tavily.com (for web search)
- **Upstash**: https://upstash.com (for Redis caching)

---

## Initial Setup

### 1. Create Staging Project

**Via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Configure:
   - **Name**: `vana-staging` (or your preferred name)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
   - **Plan**: Free tier is sufficient for staging

### 2. Get Your Project Reference

After project creation:
- **Project Ref**: Found in Project Settings → General → Reference ID
- **Example**: `abc123defghijk`
- **You'll need this for all CLI commands**

### 3. Link Local Project to Staging

```bash
# Link to staging project
supabase link --project-ref <your-staging-ref>

# Verify link
supabase projects list
```

### 4. Set Up Database

```bash
# Push all migrations to staging database
supabase db push --linked

# Verify tables exist
supabase db diff --linked
```

**Expected tables:**
- `chat_sessions`
- `chat_messages`
- `guest_rate_limits`
- `ai_usage_tracking`
- `message_feedback`
- `response_quality_logs`
- `api_throttle_state`

---

## Setting Secrets

### 1. Get API Keys

**OpenRouter (Required):**
1. Visit https://openrouter.ai/keys
2. Create new API key
3. Copy key (starts with `sk-or-v1-...`)
4. Save for `OPENROUTER_GEMINI_FLASH_KEY`

**Z.ai / GLM-4.6 (Required):**
1. Visit https://docs.z.ai or https://bigmodel.cn
2. Sign up for Coding Plan
3. Generate API key
4. Save for `GLM_API_KEY`

**Tavily (Optional):**
1. Visit https://tavily.com
2. Sign up and get API key
3. Save for `TAVILY_API_KEY`

**Upstash Redis (Optional):**
1. Visit https://console.upstash.com
2. Create new Redis database
3. Copy REST URL and Token
4. Save for `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Create Secrets File

```bash
# Copy template
cp scripts/staging-secrets.template.env scripts/staging-secrets.env

# Edit with your favorite editor
nano scripts/staging-secrets.env
# or
code scripts/staging-secrets.env
```

**Minimum required values:**
```bash
OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-your-key-here
GLM_API_KEY=your-glm-api-key-here
ALLOWED_ORIGINS=https://your-staging-domain.pages.dev,http://localhost:8080
```

### 3. Set Secrets in Supabase

```bash
# Set all secrets at once
supabase secrets set --env-file scripts/staging-secrets.env --project-ref <your-staging-ref>

# Verify secrets are set (values will be redacted)
supabase secrets list --project-ref <your-staging-ref>
```

**Expected output:**
```
NAME                        VALUE (REDACTED)
OPENROUTER_GEMINI_FLASH_KEY sk-or-v1-****
GLM_API_KEY                 ****
ALLOWED_ORIGINS             https://****
```

### 4. Update Individual Secrets (If Needed)

```bash
# Update single secret
supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=new-key --project-ref <your-staging-ref>

# Unset secret
supabase secrets unset SECRET_NAME --project-ref <your-staging-ref>
```

---

## Deployment

### Option 1: Use Setup Script (Recommended)

```bash
# Deploy everything (database + edge functions)
./scripts/deploy-simple.sh staging

# You'll be prompted for project-ref if not already linked
```

**What the script does:**
1. Checks Supabase CLI is installed
2. Links to staging project
3. Pushes database migrations
4. Deploys all edge functions
5. Verifies deployment

### Option 2: Manual Deployment

**Deploy Database:**
```bash
supabase db push --project-ref <your-staging-ref>
```

**Deploy All Edge Functions:**
```bash
# Deploy from functions directory
cd supabase/functions

# Deploy each function
supabase functions deploy chat --project-ref <your-staging-ref>
supabase functions deploy generate-artifact --project-ref <your-staging-ref>
supabase functions deploy generate-artifact-fix --project-ref <your-staging-ref>
supabase functions deploy bundle-artifact --project-ref <your-staging-ref>
supabase functions deploy generate-title --project-ref <your-staging-ref>
supabase functions deploy generate-image --project-ref <your-staging-ref>
supabase functions deploy summarize-conversation --project-ref <your-staging-ref>
supabase functions deploy health --project-ref <your-staging-ref>
supabase functions deploy admin-analytics --project-ref <your-staging-ref>
supabase functions deploy cache-manager --project-ref <your-staging-ref>
supabase functions deploy intent-examples --project-ref <your-staging-ref>
```

**Deploy Single Function (for updates):**
```bash
supabase functions deploy chat --project-ref <your-staging-ref> --no-verify-jwt
```

---

## Verification

### 1. Health Check

```bash
# Test health endpoint
curl https://<project-ref>.supabase.co/functions/v1/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-12-04T...",
  "version": "1.0.0"
}
```

### 2. Test Chat Endpoint

```bash
# Test chat with authentication
curl -X POST https://<project-ref>.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{
    "message": "Hello, test message",
    "sessionId": "test-session-123"
  }'
```

**Get Anon Key:**
- Supabase Dashboard → Project Settings → API → `anon` `public` key

### 3. Test Artifact Generation

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate-artifact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{
    "prompt": "Create a simple React button component",
    "sessionId": "test-session-123"
  }'
```

### 4. Check Database

```bash
# Connect to staging database
supabase db diff --linked

# Run SQL query
supabase db execute --linked "SELECT COUNT(*) FROM chat_sessions;"
```

### 5. Check Function Logs

```bash
# View logs for specific function
supabase functions logs chat --project-ref <your-staging-ref>

# Follow logs in real-time
supabase functions logs chat --project-ref <your-staging-ref> --follow
```

### 6. Verify Frontend Deployment

**If using Cloudflare Pages:**
```bash
# Build production bundle
npm run build

# Deploy to Cloudflare Pages (staging)
# Follow Cloudflare Pages deployment guide
```

**Environment Variables for Frontend:**
- `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your anon key
- `VITE_SUPABASE_PROJECT_ID`: Your project ref
- `VITE_ENABLE_ANALYTICS`: `false` (for staging)

---

## Troubleshooting

### Common Issues

#### 1. "Function not found" or 404 errors

**Symptom:** `{"error": "Function not found"}`

**Solutions:**
```bash
# Verify function is deployed
supabase functions list --project-ref <your-staging-ref>

# Redeploy function
supabase functions deploy <function-name> --project-ref <your-staging-ref>

# Check function logs for errors
supabase functions logs <function-name> --project-ref <your-staging-ref>
```

#### 2. CORS errors in browser

**Symptom:** `Access-Control-Allow-Origin` error in console

**Solutions:**
```bash
# Verify ALLOWED_ORIGINS is set correctly
supabase secrets list --project-ref <your-staging-ref> | grep ALLOWED_ORIGINS

# Update CORS origins (include your frontend URL)
supabase secrets set ALLOWED_ORIGINS=https://staging.example.com,http://localhost:8080 --project-ref <your-staging-ref>

# Redeploy affected functions
supabase functions deploy chat --project-ref <your-staging-ref>
```

#### 3. "Invalid API key" errors

**Symptom:** 401 or 403 errors from AI providers

**Solutions:**
```bash
# Verify secrets are set
supabase secrets list --project-ref <your-staging-ref>

# Test API keys manually
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_GEMINI_FLASH_KEY"

# Update secret
supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=new-key --project-ref <your-staging-ref>
```

#### 4. Rate limit exceeded (local dev)

**Symptom:** 429 errors when testing locally

**Solutions:**
```bash
# Increase rate limits for staging
supabase secrets set RATE_LIMIT_CHAT_GUEST_MAX=100 --project-ref <your-staging-ref>
supabase secrets set RATE_LIMIT_ARTIFACT_GUEST_MAX=100 --project-ref <your-staging-ref>

# Or disable rate limiting entirely (STAGING ONLY)
supabase secrets set RATE_LIMIT_DISABLED=true --project-ref <your-staging-ref>
```

#### 5. Database migration errors

**Symptom:** "Migration failed" or schema mismatch

**Solutions:**
```bash
# Check migration status
supabase db diff --linked

# Reset database (WARNING: deletes all data)
supabase db reset --linked

# Push migrations again
supabase db push --linked
```

#### 6. Function timeout errors

**Symptom:** 504 Gateway Timeout

**Solutions:**
```bash
# Check function logs for slow operations
supabase functions logs <function-name> --project-ref <your-staging-ref>

# Common causes:
# - Large bundle-artifact requests (increase timeout in code)
# - Slow external API calls (add timeout to fetch)
# - Database query performance (check indexes)

# Verify function size (must be < 10MB)
du -sh supabase/functions/<function-name>
```

#### 7. "Cannot read property of undefined" in artifacts

**Symptom:** Blank artifact or React errors

**Causes:**
- Dual React instances (server bundle didn't externalize React)
- Invalid `@/` imports (not allowed in artifacts)
- Missing npm packages in bundle

**Solutions:**
```bash
# Check artifact validation logs
supabase functions logs generate-artifact --project-ref <your-staging-ref>

# Verify bundle-artifact is working
curl -X POST https://<project-ref>.supabase.co/functions/v1/bundle-artifact \
  -H "Content-Type: application/json" \
  -d '{"code": "import React from \"react\"; export default () => <div>Test</div>;"}'

# Check for @/ imports in error logs
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check function logs for errors
- Monitor API usage/costs
- Review rate limit hits

**Monthly:**
- Rotate API keys
- Review and clean up old sessions
- Update dependencies

**Quarterly:**
- Security audit
- Performance review
- Cost optimization

### Monitoring

**Function Metrics:**
```bash
# View function invocations
supabase functions stats --project-ref <your-staging-ref>

# Check error rates
supabase functions logs <function-name> --project-ref <your-staging-ref> | grep ERROR
```

**Database Metrics:**
- Dashboard → Database → Usage
- Monitor: Disk usage, Connection count, Query performance

**API Costs:**
- OpenRouter: https://openrouter.ai/activity
- Z.ai: Check your Z.ai dashboard
- Upstash: https://console.upstash.com

### Cleanup

**Clear old sessions:**
```sql
-- Delete sessions older than 30 days
DELETE FROM chat_sessions
WHERE created_at < NOW() - INTERVAL '30 days';

-- Cascade will delete related messages
```

**Reset rate limits:**
```sql
-- Clear all rate limit counters
DELETE FROM guest_rate_limits;
DELETE FROM api_throttle_state;
```

---

## Deployment Checklist

Before deploying to staging:

- [ ] API keys obtained and tested
- [ ] Secrets file created and filled
- [ ] Secrets set in Supabase
- [ ] Database migrations pushed
- [ ] All edge functions deployed
- [ ] Health endpoint returns 200
- [ ] Chat endpoint tested
- [ ] Artifact generation tested
- [ ] CORS configured correctly
- [ ] Frontend environment variables set
- [ ] Function logs checked for errors
- [ ] Rate limits configured appropriately
- [ ] Monitoring alerts set up

---

## Next Steps

After staging is working:

1. **Set up CI/CD**: Automate deployments on git push
2. **Configure monitoring**: Set up alerts for errors/downtime
3. **Load testing**: Test with realistic traffic
4. **Security review**: Audit RLS policies and API access
5. **Production deployment**: Follow same process for production environment

---

## Support

**Documentation:**
- Main README: `/README.md`
- CLAUDE.md: `/CLAUDE.md`
- GLM-4.6 Guide: `.claude/docs/GLM-4.6-CAPABILITIES.md`
- Artifact Guide: `.claude/artifact-import-restrictions.md`

**Supabase Resources:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs
- CLI Reference: https://supabase.com/docs/reference/cli

**AI Provider Resources:**
- OpenRouter: https://openrouter.ai/docs
- Z.ai: https://docs.z.ai
- Tavily: https://docs.tavily.com

---

## Quick Reference

**Essential Commands:**
```bash
# Deploy everything
./scripts/deploy-simple.sh staging

# Set secrets
supabase secrets set --env-file staging-secrets.env --project-ref <ref>

# List secrets
supabase secrets list --project-ref <ref>

# Deploy single function
supabase functions deploy <name> --project-ref <ref>

# View logs
supabase functions logs <name> --project-ref <ref> --follow

# Push migrations
supabase db push --project-ref <ref>

# Health check
curl https://<ref>.supabase.co/functions/v1/health
```

**Important URLs:**
- Supabase Project: `https://<project-ref>.supabase.co`
- Edge Functions: `https://<project-ref>.supabase.co/functions/v1/`
- Database: `https://<project-ref>.supabase.co/rest/v1/`
- Dashboard: `https://supabase.com/dashboard/project/<project-ref>`
