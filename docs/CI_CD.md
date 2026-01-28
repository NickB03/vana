# Build and Deployment

## CI/CD Pipelines

**Location**: `.github/workflows/`

### Required GitHub Actions Secrets

The following secrets must be configured in GitHub repository settings (Settings → Secrets and variables → Actions):

| Secret | Purpose | How to Obtain |
|--------|---------|---------------|
| `SUPABASE_ACCESS_TOKEN` | API authentication for Supabase CLI | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | Production project reference ID | Supabase Dashboard → Project Settings (e.g., `vznhbocnuykdmjvujaka`) |
| `SUPABASE_DB_PASSWORD` | Database password for migrations | Supabase Dashboard → Settings → Database → Connection string |

**Verify secrets are set**:
```bash
gh secret list --repo NickB03/llm-chat-site
```

### Automated Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `frontend-quality.yml` | PR + push to `main` | Lint, test, build verification |
| `edge-functions-tests.yml` | PR + push (functions changed) | Test Edge Functions with 90% coverage |
| `deploy-migrations.yml` | Push to `main` (migrations changed) | Apply database migrations to production |
| `deploy-edge-functions.yml` | Push to `main` (functions changed) | Deploy Edge Functions to production |
| `e2e-tests.yml` | Push to `main` | E2E tests with mocked APIs (post-merge) |
| `e2e-manual.yml` | Manual trigger | Run E2E tests with filters (@critical) |
| `integration-tests.yml` | Manual + daily schedule | Real API tests (Gemini, Tavily) |
| `model-config-guard.yml` | PR + push to `main` | Validate model names match snapshot |
| `ai-guardrails.yml` | PR + push to `main` | Validate critical files not corrupted |
| `gemini-dispatch.yml` | Manual trigger | Gemini-powered PR triage |

### Migration Deployment Flow

```
Push to main (migrations/** changed)
    ↓
deploy-migrations.yml
    ↓
1. Checkout with full git history
2. Link to production Supabase
3. Run `supabase db push --linked`
4. ⚠️ Fail pipeline if migrations fail
```

**Critical**: Migrations must apply cleanly or the entire deployment fails. This prevents partial schema updates that could break the app.

### Edge Functions Deployment Flow

```
Push to main (functions/** changed)
    ↓
deploy-edge-functions.yml
    ↓
1. Checkout with full git history
2. Link to production Supabase
3. Run migrations first (fail-fast on error)
4. Deploy all Edge Functions
```

**Why migrations first?**: Ensures database schema is up-to-date before deploying functions that depend on it.

## Deployment Workflow

### Production Deployment (Automatic via CI/CD)

**⚠️ CRITICAL**: ALL production deployments MUST go through the PR process. Direct deployments are prohibited.

**Workflow**:
```
1. Create feature branch
2. Make changes (code, migrations, functions)
3. Run full test suite locally
4. Create Pull Request
5. Automated CI checks run:
   - Unit tests
   - Integration tests
   - E2E critical tests
   - TypeScript validation
   - Build verification
6. Code review by team
7. Merge to main → Auto-deploy
```

**Auto-Deploy Triggers**:
- **Database Migrations**: Changes to `supabase/migrations/**` → `deploy-migrations.yml`
- **Edge Functions**: Changes to `supabase/functions/**` → `deploy-edge-functions.yml`

### Local Testing (Development Only)

**Test Individual Function Locally**:
```bash
supabase functions serve <function-name>
```

**Example**:
```bash
supabase functions serve chat
curl http://localhost:54321/functions/v1/chat
```

**Test Migrations Locally**:
```bash
supabase db reset    # Resets local DB and applies all migrations
```

### Emergency Hotfix Process

**Only for critical production issues**:

1. **Create hotfix branch** from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/critical-bug-description
   ```

2. **Make minimal fix** and test locally:
   ```bash
   npm run test
   npm run test:integration
   npm run build
   ```

3. **Create PR with `[HOTFIX]` prefix**:
   ```bash
   gh pr create --title "[HOTFIX] Fix critical bug description" --body "Critical fix for production issue"
   ```

4. **Fast-track review** → Merge → Auto-deploy

**Hotfix PRs**:
- Must include link to production incident/error
- Must be minimal scope (single issue)
- Must pass all CI checks
- Must have immediate reviewer assigned

## Build Optimization

### Code Splitting

**Location**: `vite.config.ts`

**Vendor Chunks**:
- `vendor-react` — React core (18.3.1)
- `vendor-ui` — shadcn/ui components
- `vendor-markdown` — Markdown rendering (react-markdown, remark, rehype)
- `vendor-query` — TanStack Query
- `vendor-supabase` — Supabase client

**Benefits**:
- Parallel downloads for faster initial load
- Better caching (vendor chunks rarely change)
- Smaller main bundle

### Compression

**Enabled Formats**:
- Brotli (`.br` files) — 15-20% smaller than Gzip
- Gzip (`.gz` files) — Universal fallback

**Configuration** (`vite.config.ts`):
```typescript
viteCompression({
  algorithm: 'brotliCompress',
  ext: '.br',
  threshold: 1024  // Only compress files > 1KB
})
```

### Minification

**Tool**: Terser (via Vite)

**Configuration**:
```typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,      // Remove console.log in production
      drop_debugger: true,
      pure_funcs: ['console.info', 'console.debug']
    }
  }
}
```

### Service Worker (PWA)

**Features**:
- Offline support for cached routes
- Immediate activation (no waiting for page reload)
- Cache strategies:
  - **Supabase API**: NetworkFirst (30s cache)
  - **Images**: NetworkFirst (5min cache)
  - **Static assets**: CacheFirst (immutable)

**Configuration**: `vite.config.ts` (VitePWA plugin)

### Bundle Size Reduction

**Externalized Prompts**:
- System prompts moved to `system-prompt-inline.ts`
- Reduces bundle size by 52%
- Prompts only loaded when needed (Edge Functions)

**Tree Shaking**:
- Removes unused exports from dependencies
- Requires ES modules (not CommonJS)
- Configured automatically by Vite

## Demo Video Compression

### Requirements

**Target Size**: 2-5 MB for hero/demo videos (max 10 MB)

**Why?**:
- Cloudflare Pages build size limits
- Faster page loads
- Better mobile experience

### FFmpeg Compression Command

**Standard Compression**:
```bash
ffmpeg -i source.mp4 \
  -c:v libx264 -crf 23 -preset slow \
  -an \
  -movflags +faststart \
  public/Demos/output-compressed.mp4
```

**Parameter Reference**:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `-c:v libx264` | H.264 codec | Universal browser support |
| `-crf` | 18-28 (lower=better) | Quality level. 23 = good balance, 20 = high quality |
| `-preset slow` | Compression efficiency | Better compression, slower encode |
| `-an` | No audio | Remove audio track (demos don't need it) |
| `-movflags +faststart` | Streaming | Enables progressive playback |

**Optional: Resize**:
```bash
# 720p (smaller file)
-vf "scale=1280:-2"

# 1080p
-vf "scale=1920:-2"
```

### Best Practices

**Format Strategy**:
```html
<video>
  <source src="demo.webm" type="video/webm">  <!-- Smallest -->
  <source src="demo.mp4" type="video/mp4">    <!-- Fallback -->
</video>
```

**Location**: `public/Demos/` (served statically by Vite/Cloudflare)

**Verification**:
```bash
# Check file size
ls -lh public/Demos/demo-compressed.mp4

# Target: 2-5 MB
```

## Critical Files Protection

### The Problem

**NEVER redirect git command output to critical files!**

**Why**:
```bash
# ❌ DANGEROUS - Corrupts file if git command fails
git show HEAD:index.html > index.html

# If file doesn't exist in commit, git outputs:
# fatal: path 'index.html' does not exist in 'HEAD'
# → This error message gets written to index.html, corrupting it!
```

### Protected Files

**Pre-commit hook validates**:
- `index.html`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`

**Validation Script**: `scripts/validate-critical-files.cjs`

### Safe Alternative

```bash
# ✅ CORRECT - View output first, then manually copy if needed
git show HEAD:index.html

# Or use git restore
git restore --source=HEAD~1 index.html
```

### Recovery

**If file corrupted**:
```bash
# Restore from last known good commit
git checkout HEAD~1 -- index.html

# Or restore from specific commit
git checkout <commit-hash> -- index.html
```

**Verification**:
```bash
# Before committing, validate critical files
node scripts/validate-critical-files.cjs
```

## Environment Setup

### Production Secrets

**Set all secrets**:
```bash
cd supabase
supabase secrets set --env-file functions/.env
```

**Verify secrets**:
```bash
supabase secrets list
```

### Local Development

**File Location**: `supabase/functions/.env` (auto-loaded)

**Restart Required**: After changing `.env`, restart Supabase
```bash
supabase stop && supabase start
```

**Verify Loaded**:
```bash
docker exec supabase_edge_runtime_* printenv | grep -iE "OPENROUTER|GEMINI|TAVILY"
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| FCP (First Contentful Paint) | < 1.5s | ✅ 1.2s |
| LCP (Largest Contentful Paint) | < 2.5s | ✅ 2.1s |
| TTI (Time to Interactive) | < 3.5s | ✅ 3.0s |
| CLS (Cumulative Layout Shift) | < 0.1 | ✅ 0.05 |
| Bundle Size (main) | < 500KB | ✅ 420KB |
| Test Coverage | > 55% | ✅ 74% |
| Test Execution | < 3s | ✅ 2.8s |
| CI/CD Runtime | < 5min | ✅ 4.2min |

## Troubleshooting Deployment

### Migration Failures

**Symptom**: `deploy-migrations.yml` fails

**Common Causes**:
- SQL syntax error in migration
- Foreign key constraint violation
- Duplicate migration timestamp
- Schema drift (local ≠ production)
- Authentication errors (missing SUPABASE_DB_PASSWORD)

**Authentication Error Fix**:
If you see `failed to connect as temp role` or `password authentication failed`:
```bash
# The workflow needs SUPABASE_DB_PASSWORD secret
# Get password from: Supabase Dashboard → Settings → Database → Connection string
gh secret set SUPABASE_DB_PASSWORD --repo NickB03/llm-chat-site

# Verify secret is set
gh secret list --repo NickB03/llm-chat-site | grep SUPABASE_DB_PASSWORD
```

**Migration Fix**:
```bash
# Check migration status
supabase migration list

# Repair local schema
supabase db pull

# Or reset and reapply
supabase db reset
```

### Edge Function Deployment Failures

**Symptom**: `deploy-edge-functions.yml` fails

**Common Causes**:
- Function size > 10MB
- Invalid Deno import URLs
- Missing environment variables
- TypeScript errors

**Fix**:
```bash
# Check function size
du -sh supabase/functions/<function-name>

# Test locally first
supabase functions serve <function-name>

# Check for TypeScript errors
cd supabase/functions && deno task test
```

### Build Failures (Cloudflare Pages)

**Symptom**: Cloudflare Pages build fails

**Common Causes**:
- Demo videos too large (> 25MB per file)
- Missing environment variables
- npm install errors
- Out of memory (build worker)

**Fix**:
```bash
# Compress large videos
ffmpeg -i source.mp4 -crf 23 -preset slow compressed.mp4

# Test build locally
npm run build

# Check build logs on Cloudflare dashboard
```

## References

- **CI/CD Workflows**: `.github/workflows/`
  - `deploy-migrations.yml` — Database migration deployment
  - `deploy-edge-functions.yml` — Edge Function deployment
  - `ai-guardrails.yml` — Critical file validation
- **Vite Config**: `vite.config.ts`
- **Critical Files Validator**: `scripts/validate-critical-files.cjs`
- **Supabase CLI Docs**: https://supabase.com/docs/reference/cli
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages
