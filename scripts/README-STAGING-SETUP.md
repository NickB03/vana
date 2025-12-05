# Staging Environment Setup Guide

## Quick Start

```bash
./scripts/setup-staging.sh
```

## What This Script Does

The `setup-staging.sh` script performs a complete staging environment setup for Vana:

### 1. Prerequisites Check
- Verifies Supabase CLI is installed
- Shows CLI version information

### 2. Project Linking
- Links repository to staging project (`tkqubuaqzqjvrcnlipts`)
- Skips re-linking if already connected to staging
- Creates `.git/supabase-project-ref` tracking file

### 3. Database Migrations
- Pushes all 17 migration files to staging database
- Creates tables: `chat_sessions`, `chat_messages`, `guest_rate_limits`, etc.
- Creates storage bucket: `artifact-bundles`
- Sets up RLS policies and indexes

### 4. Table Verification
- Verifies 7 critical tables exist and are accessible
- Prompts to continue if tables are missing

### 5. Edge Functions Deployment
- Deploys all 12 Edge Functions with progress tracking
- Shows individual deployment status for each function
- Handles deployment failures gracefully (120s timeout per function)

**Functions deployed:**
- `chat` - Main chat streaming
- `generate-artifact` - Artifact generation with GLM-4.6
- `generate-artifact-fix` - Error fixing
- `generate-title` - Session title generation
- `cache-manager` - Cache utilities
- `summarize-conversation` - Context summarization
- `generate-image` - AI image generation
- `bundle-artifact` - Server-side npm bundling
- `generate-reasoning` - Fast parallel reasoning
- `health` - System health monitoring
- `intent-examples` - Intent detection examples
- `admin-analytics` - Analytics dashboard data

### 6. Storage Verification
- Provides instructions to verify `artifact-bundles` bucket
- Shows manual creation steps if bucket is missing

### 7. Secrets Configuration
- Lists all required and optional secrets
- Provides two methods to set secrets (Dashboard + CLI)
- Shows secret descriptions and use cases

## Required Secrets

These MUST be set before production use:

```bash
OPENROUTER_GEMINI_FLASH_KEY    # OpenRouter API key for Gemini Flash Lite
GLM_API_KEY                    # Z.ai API key for GLM-4.6
ALLOWED_ORIGINS                # CORS allowed origins (e.g., "https://vana.dev,https://staging.vana.dev")
```

## Optional Secrets

Recommended for full functionality:

```bash
OPENROUTER_GEMINI_IMAGE_KEY    # Image generation (10-key rotation in prod)
TAVILY_API_KEY                 # Web search integration
UPSTASH_REDIS_REST_URL         # Caching layer
UPSTASH_REDIS_REST_TOKEN       # Caching layer auth
RATE_LIMIT_DISABLED            # Set to "true" to disable rate limiting
```

## Setting Secrets

### Method 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/tkqubuaqzqjvrcnlipts/settings/vault
2. Click "New Secret"
3. Add each secret with its value

### Method 2: Supabase CLI

```bash
supabase secrets set SECRET_NAME=value --project-ref tkqubuaqzqjvrcnlipts
```

Example:
```bash
supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-xxx... --project-ref tkqubuaqzqjvrcnlipts
supabase secrets set GLM_API_KEY=your-glm-key --project-ref tkqubuaqzqjvrcnlipts
supabase secrets set ALLOWED_ORIGINS="https://staging.vana.dev" --project-ref tkqubuaqzqjvrcnlipts
```

## Verifying Setup

### 1. Check Storage Bucket

Visit: https://supabase.com/dashboard/project/tkqubuaqzqjvrcnlipts/storage/buckets

Verify `artifact-bundles` bucket exists with:
- Public: No
- File size limit: 10MB
- Allowed MIME types: text/html

### 2. Test Health Endpoint

```bash
curl https://tkqubuaqzqjvrcnlipts.supabase.co/functions/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T23:17:00.000Z"
}
```

### 3. View Edge Function Logs

```bash
supabase functions logs --project-ref tkqubuaqzqjvrcnlipts
```

Or specific function:
```bash
supabase functions logs chat --project-ref tkqubuaqzqjvrcnlipts
```

### 4. Test Frontend Connection

Update `.env` file:
```bash
VITE_SUPABASE_URL=https://tkqubuaqzqjvrcnlipts.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<staging-anon-key>
VITE_SUPABASE_PROJECT_ID=tkqubuaqzqjvrcnlipts
```

Then run:
```bash
npm run dev
```

## Troubleshooting

### Script Fails: "Supabase CLI not found"

Install Supabase CLI:
```bash
# macOS
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Script Fails: "Failed to link to staging project"

1. Verify you're logged in:
   ```bash
   supabase login
   ```

2. Check project ref is correct: `tkqubuaqzqjvrcnlipts`

3. Verify you have access to the project in Supabase Dashboard

### Migration Errors

1. Check migration file syntax
2. Review migration logs for specific errors
3. Verify database connectivity
4. Run individual migration manually:
   ```bash
   supabase db execute --file supabase/migrations/FILE_NAME.sql
   ```

### Function Deployment Failures

Common issues:
1. **Timeout (>120s)** - Function may be too large or have slow imports
2. **Syntax errors** - Check TypeScript/Deno code in function
3. **Missing dependencies** - Verify `_shared/` imports are accessible
4. **Size limit** - Functions must be < 10MB

Debug specific function:
```bash
supabase functions deploy FUNCTION_NAME --project-ref tkqubuaqzqjvrcnlipts --debug
```

### Storage Bucket Missing

If migration didn't create bucket, create manually:

1. Go to: https://supabase.com/dashboard/project/tkqubuaqzqjvrcnlipts/storage/buckets
2. Click "New bucket"
3. Configure:
   - Name: `artifact-bundles`
   - Public: **No** (private bucket)
   - File size limit: `10485760` (10MB)
   - Allowed MIME types: `text/html`

Then apply RLS policies from migration file:
`supabase/migrations/20251122000000_create_artifact_bundles_bucket.sql`

## Post-Setup Checklist

- [ ] All Edge Functions deployed successfully (12/12)
- [ ] Critical tables verified (7/7)
- [ ] Storage bucket exists (`artifact-bundles`)
- [ ] Required secrets set (3/3)
- [ ] Health endpoint returns 200 OK
- [ ] Frontend connects to staging successfully
- [ ] Test chat message sends successfully
- [ ] Test artifact generation works
- [ ] Test image generation works (if OPENROUTER_GEMINI_IMAGE_KEY set)

## Next Steps

1. **Test Core Functionality**
   - Send chat messages
   - Generate artifacts (React, HTML, Mermaid)
   - Test error fixing for artifacts
   - Generate session titles
   - Test image generation

2. **Configure CORS**
   - Set `ALLOWED_ORIGINS` to your staging domain
   - Example: `https://staging.vana.dev`

3. **Deploy Frontend**
   - Update `.env` with staging credentials
   - Deploy to Cloudflare Pages or your hosting platform

4. **Monitor Performance**
   - Check Edge Function logs
   - Monitor database performance
   - Review rate limiting effectiveness

5. **When Ready for Production**
   ```bash
   ./scripts/deploy-simple.sh prod
   ```

## Script Behavior

- **Idempotent**: Safe to run multiple times
- **Interactive**: Prompts for confirmation before proceeding
- **Verbose**: Shows detailed progress with timestamps
- **Resilient**: Continues on non-critical failures with user confirmation
- **Color-coded**: Green (success), Red (error), Yellow (warning), Blue (info)

## Files Modified

- `.git/supabase-project-ref` - Tracks current project reference

## Environment Variables

The script does NOT modify environment variables. You must manually update:

- Frontend `.env` file for local development
- Cloudflare Pages environment variables for production deployment
- Supabase secrets via Dashboard or CLI

## Related Scripts

- `./scripts/deploy-simple.sh` - Deploy to staging or production
- `./scripts/backup-db.sh` - Backup production database (if exists)

## Support

- Supabase Dashboard: https://supabase.com/dashboard/project/tkqubuaqzqjvrcnlipts
- Supabase Docs: https://supabase.com/docs
- OpenRouter Docs: https://openrouter.ai/docs
- Z.ai Docs: https://docs.z.ai
