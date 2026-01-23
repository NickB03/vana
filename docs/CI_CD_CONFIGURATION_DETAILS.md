# CI/CD Configuration Details - Vanilla Sandpack Refactor

**Purpose**: Technical reference for how CI/CD workflows are configured and why they're appropriate for this refactor

**Audience**: DevOps engineers, developers implementing tests, on-call engineers

---

## 1. Workflow Trigger Configuration

### 1.1 Frontend Quality Workflow

**File**: `.github/workflows/frontend-quality.yml`

**When It Runs**:
```yaml
on:
  pull_request:        # Always run on PR (any branch)
  push:
    branches:
      - main           # Always run on push to main
```

**Purpose**: Catch regressions before merge (PR) and verify merged code (main)

**Jobs**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Validate critical files (index.html, package.json, etc.)
5. Run lint (ESLint)
6. Run tests (`npm run test`)
7. Build production bundle

**Why This Matters for Refactor**:
- Validates no artifact code was accidentally referenced
- Ensures build succeeds (no import errors)
- Catches TypeScript errors in SimpleArtifactRenderer
- Verifies CLAUDE.md compliance (MUST Rules)

**Blocking**:
- ✅ If lint fails → PR blocked
- ✅ If tests fail → PR blocked
- ✅ If build fails → PR blocked
- ✅ If validation fails → PR blocked

---

### 1.2 Edge Functions Tests Workflow

**File**: `.github/workflows/edge-functions-tests.yml`

**When It Runs**:
```yaml
on:
  pull_request:
    paths:
      - 'supabase/functions/_shared/**'
      - 'supabase/functions/**/index.ts'
      - '.github/workflows/edge-functions-tests.yml'
  push:
    branches: [main]
    paths:
      - 'supabase/functions/_shared/**'
      - 'supabase/functions/**/index.ts'
```

**Purpose**: Test Edge Functions changes with strict coverage requirements

**Key Feature - Path Filtering**:
```
Only runs if supabase/functions/** changed
```

**For Vanilla Sandpack Refactor**:
- Will trigger because `artifact-generator-structured.ts` is new
- Will trigger because deleted artifacts removed
- Tests must pass (90% coverage threshold)

**Coverage Requirement**:
```
Minimum: 90% for edge functions
- Deno coverage tool measures line coverage
- Fails if <90%
- Upgrade files: artifact-generation-e2e.test.ts (NEW)
```

**Quality Checks**:
- Lint: `deno lint supabase/functions/_shared/`
- Format: `deno fmt --check`
- Type check: `deno check *.ts`

**Blocking**:
- ✅ If tests <90% coverage → FAIL (must pass)
- ✅ If lint errors → FAIL
- ✅ If type errors → FAIL

---

### 1.3 E2E Tests Workflow

**File**: `.github/workflows/e2e-tests.yml`

**When It Runs**:
```yaml
on:
  push:
    branches: [main]

# Skip condition:
if: "!contains(github.event.head_commit.message, '[skip e2e]')"
```

**Purpose**: Detect UI regressions after merge (not before)

**Why Post-Merge Only**:
- Uses mocked APIs (fast)
- Tests UI interactions, not backend logic
- Runs after all other checks pass
- Provides final safety net

**For Vanilla Sandpack Refactor**:
- Tests chat interface still works
- Tests artifact panel renders
- Tests error display
- Validates "Ask AI to Fix" button presence

**Can Be Skipped**:
```bash
git commit -m "feat: minor doc change [skip e2e]"
# E2E won't run (allowed for doc-only changes)
```

**Blocking**:
- ⚠️ Only informational (doesn't block merge)
- But failures should be investigated
- Upload artifacts for debugging

---

### 1.4 Integration Tests Workflow

**File**: `.github/workflows/integration-tests.yml`

**When It Runs**:
```yaml
on:
  workflow_dispatch:           # Manual trigger
  schedule:
    - cron: '0 6 * * *'       # Daily at 6 AM UTC
  push:
    branches: [main]
    paths:
      - 'supabase/functions/_shared/__tests__/*-integration.test.ts'
      - 'supabase/functions/_shared/**/*.ts'
      - 'supabase/functions/deno.json'
      - '.github/workflows/integration-tests.yml'
```

**Purpose**: Real API testing with live Gemini/Tavily

**NOT Blocking PR**:
- Manual trigger only (developer runs it)
- Scheduled daily (catches regressions)
- No automatic PR requirement

**For Vanilla Sandpack Refactor**:
- Can run manually before merge for extra confidence
- Cost: ~$0.01-0.03 per full run
- Time: 5-10 minutes with Supabase startup

**When to Run**:
```bash
# Before PR (optional but recommended)
gh workflow run integration-tests.yml --ref refactor/vanilla-sandpack-artifacts

# Or manually in GitHub UI
# Actions → Integration Tests → Run workflow
```

**Blocking**:
- ❌ Does NOT block merge
- ⚠️ Failures indicate API issues
- Consider running before merge for confidence

---

### 1.5 Deploy Edge Functions Workflow

**File**: `.github/workflows/deploy-edge-functions.yml`

**When It Runs**:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'
```

**Purpose**: Auto-deploy functions to production on merge

**Key Behavior**:
1. Checkout full git history
2. Link to production Supabase
3. Attempt to push migrations first (best effort)
4. Deploy all Edge Functions

**For Vanilla Sandpack Refactor**:
- Triggered when `chat/index.ts` updated (artifact-generator-structured integrated)
- No migrations needed (this refactor code-only)
- Functions deployed automatically

**Error Handling**:
```yaml
- name: Push Migrations First
  continue-on-error: true  # Don't fail if no migrations
  run: supabase db push --linked --include-all || echo "::warning::..."
```

**Why `continue-on-error`**:
- Refactor has no schema changes
- Migrations may be already applied
- Failure to push migrations shouldn't block function deploy

**Blocking**:
- ✅ If function deploy fails → FAIL (webhook shows error)
- ⚠️ PR can't "force push" to main (GitHub protection)
- ⚠️ Bad code merged = bad functions deployed

---

## 2. Test Requirements by Phase

### 2.1 Pre-PR (Local Development)

**Locally, before pushing**:

```bash
# 1. Unit tests must pass
npm run test
# Expected: All tests pass, coverage ≥55%

# 2. Integration tests (optional but recommended)
supabase start
npm run test:integration
# Real API calls, slow, optional for refactor

# 3. Build must succeed
npm run build
# Expected: No errors, dist/ created

# 4. TypeScript clean
npx tsc --noEmit
# Expected: No type errors

# 5. E2E critical (optional before PR)
npm run test:e2e:headed
# Expected: All critical tests pass
```

**Why Matters**:
- Catch errors before pushing
- Avoid PR with failing tests
- Save CI/CD runner time

---

### 2.2 PR Phase (Automated CI/CD)

**When PR created, GitHub Actions runs**:

```
PR Created
  ↓
frontend-quality.yml
├─ Lint
├─ Test
├─ Build
└─ Critical files validation
  ↓
edge-functions-tests.yml (if functions changed)
├─ Test with 90% coverage threshold
├─ Lint
└─ Type check
  ↓
Results
├─ ALL PASS → PR ready for review ✅
├─ Some FAIL → Fix and push commit (re-run auto)
└─ TBD → Review comment from maintainer
```

**What Blocks Merge**:
```
Must PASS to merge:
├─ frontend-quality.yml (all jobs)
├─ edge-functions-tests.yml (all jobs if triggered)
└─ Code review (manual approval)
```

**What Doesn't Block**:
```
Non-blocking:
├─ E2E tests (run after merge)
├─ Integration tests (manual trigger)
└─ Deployment workflows (only run on main)
```

---

### 2.3 Post-Merge (Automatic Deployment)

**When PR merged to main**:

```
Merge to main
  ↓
frontend-quality.yml (reruns on main push)
├─ Lint
├─ Test
├─ Build
└─ Critical files validation
  ↓
deploy-edge-functions.yml (if functions changed)
├─ Link to production
├─ Push migrations (if any)
└─ Deploy functions
  ↓
deploy-migrations.yml (if migrations changed)
├─ Link to production
└─ Apply migrations
  ↓
e2e-tests.yml (on main push)
├─ Build with mock APIs
└─ Run E2E tests
  ↓
Cloudflare Pages (auto-deploy)
├─ Builds frontend
├─ Deploys to production
└─ Invalidates CDN cache
```

**Parallelization**:
- Most workflows run in parallel
- If critical file validation fails → catches early
- If build fails → all deploy skipped
- If E2E fails → INFORMATIONAL (already deployed)

---

## 3. Test Coverage Requirements

### 3.1 Frontend Coverage

**Requirement**: ≥55% overall

**Where It's Measured**: `npm run test:coverage`

**What It Includes**:
```
src/                    ← Components, utilities, hooks
  ├─ components/       (high coverage expected)
  ├─ hooks/           (medium coverage)
  ├─ utils/           (medium coverage)
  └─ pages/           (lower coverage OK)
```

**For Vanilla Sandpack**:
```
SimpleArtifactRenderer.tsx       ← Should be ≥80% (new)
ArtifactErrorBoundary.tsx        ← Should be ≥70% (new)
artifact-generator-structured.ts ← Should be ≥80% (new)
artifact-complexity.ts           ← Should be ≥80% (new)
```

**How Coverage Works**:
```
1. Tests run with coverage instrumentation
2. Coverage reporter generates report
3. Report shows % by file
4. Aggregate % calculated
5. Must be ≥55% to pass
```

**In CI/CD**:
```yaml
# frontend-quality.yml
- name: Test
  run: npm run test
  env:
    NODE_OPTIONS: --max-old-space-size=4096
  # Coverage runs locally (too slow for CI)
```

---

### 3.2 Edge Functions Coverage

**Requirement**: ≥90% for `supabase/functions/_shared/**`

**Where It's Measured**: `.github/workflows/edge-functions-tests.yml`

**Configuration**:
```bash
deno test \
  --allow-env \
  --allow-net \
  --allow-read \
  --coverage=coverage \
  --parallel \
  supabase/functions/_shared/__tests__/
```

**For Vanilla Sandpack**:
```
artifact-generation-e2e.test.ts
├─ Coverage: ≥80% minimum
├─ Tests: Generation → compile → no errors
└─ Validates: Gemini 3 Flash output quality

artifact-generator-structured.ts
├─ Coverage: ≥80% minimum
├─ Tests: Generate → validate (Zod) → return artifact
└─ Validates: JSON schema structured output flow

artifact-complexity.ts
├─ Coverage: ≥80% minimum
├─ Tests: Analyze → classify → return complexity result
└─ Validates: Complexity detection for routing
```

**Strict Requirement**:
```yaml
if [ "$COVERAGE_INT" -lt 90 ]; then
  echo "❌ Coverage is below 90% threshold"
  exit 1  # FAILS PR
fi
```

---

## 4. Secrets Management

### 4.1 GitHub Secrets Configuration

**Required Secrets** (for CI/CD):

| Secret | Used By | Purpose |
|--------|---------|---------|
| `SUPABASE_ACCESS_TOKEN` | deploy-*.yml | Authenticate with Supabase |
| `SUPABASE_PROJECT_ID` | deploy-*.yml | Identify production project |
| `SUPABASE_DB_PASSWORD` | deploy-migrations.yml | Database authentication |
| `GLM_API_KEY` | integration-tests.yml | Google's Gemini API |
| `OPENROUTER_GEMINI_FLASH_KEY` | integration-tests.yml | OpenRouter Gemini access |
| `OPENROUTER_GEMINI_IMAGE_KEY` | integration-tests.yml | Image generation access |
| `TAVILY_API_KEY` | integration-tests.yml | Web search API |
| `CODECOV_TOKEN` | edge-functions-tests.yml | Coverage reporting (optional) |

**Verification**:
```bash
# List all secrets
gh secret list --repo NickB03/llm-chat-site

# Expected output (no values shown):
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
SUPABASE_DB_PASSWORD
...
```

**Adding Secret**:
```bash
gh secret set SUPABASE_ACCESS_TOKEN --repo NickB03/llm-chat-site
# Paste value when prompted (never echo to terminal)
```

---

### 4.2 Secret Injection

**In Workflows**:
```yaml
- name: Deploy functions
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
  run: supabase link --project-ref $PROJECT_ID
```

**Security**:
- ✅ Secrets never logged
- ✅ Never printed to stdout
- ✅ Only used in runtime environment
- ✅ Each workflow job gets fresh copy
- ✅ Secrets not available to PR from forks (security)

**For Refactor**:
- No new secrets needed
- Existing secrets work with Edge Functions
- artifact-generator-structured.ts uses same Gemini API keys

---

## 5. Critical File Validation

### 5.1 Protected Files

**File**: `scripts/validate-critical-files.cjs`

**Protected Files**:
```
- index.html      (entry point)
- package.json    (dependencies)
- vite.config.ts  (build config)
- tsconfig.json   (TypeScript config)
```

**Why Protected**:
- Corruption = app broken entirely
- Git redirects to these files = disaster
- Example bad pattern:
  ```bash
  # ❌ DANGEROUS
  git show HEAD:index.html > index.html
  # If file doesn't exist in HEAD, git outputs error message
  # → Error message written to index.html, corrupting it!
  ```

**Validation Rules**:
```javascript
// From validate-critical-files.cjs
const requiredPatterns = {
  'index.html': [
    '<html',
    '<body',
    '<div',
  ],
  'package.json': [
    '{',
    '"dependencies"',
    '"devDependencies"',
  ],
  'vite.config.ts': [
    'export default',
    'defineConfig',
  ],
  'tsconfig.json': [
    '{',
    '"compilerOptions"',
  ]
};
```

**In CI/CD**:
```yaml
- name: Validate critical files
  run: node scripts/validate-critical-files.cjs
  # Runs early, before any git operations
```

**For Refactor**:
- These files NOT changed by refactor
- Validation passes automatically
- Protects against accidental corruption

---

## 6. Deployment Automatic Triggers

### 6.1 Path-Based Triggers

**Edge Functions Deploy**:
```yaml
paths:
  - 'supabase/functions/**'
```

For refactor:
```
Modified paths:
├─ supabase/functions/chat/index.ts (uses artifact-generator-structured)
├─ supabase/functions/_shared/artifact-generator-structured.ts (NEW)
├─ supabase/functions/_shared/artifact-complexity.ts (NEW)
├─ supabase/functions/_shared/schemas/artifact-schema.ts (NEW)
└─ (many other functions/* files)
↓
deploy-edge-functions.yml TRIGGERS
```

**Migrations Deploy**:
```yaml
paths:
  - 'supabase/migrations/**'
```

For refactor:
```
Modified paths:
├─ (none)
↓
deploy-migrations.yml DOES NOT TRIGGER
(Code-only refactor, no schema changes)
```

**Benefits**:
- Only affected components deploy
- Faster feedback (skip unnecessary jobs)
- Clear causality (changed this → deployed that)

---

### 6.2 Deployment Order

**If Both Functions and Migrations Changed**:

```
Merge to main
  ↓
deploy-migrations.yml runs
  ├─ Applies schema changes
  └─ Must succeed
  ↓
deploy-edge-functions.yml runs
  ├─ Functions use updated schema
  └─ Must succeed
```

**Why Migrations First**:
- Schema must exist before functions reference it
- Fail-fast if migration broken
- Functions won't deploy to broken schema

**For Refactor** (no migrations):
```
Merge to main
  ↓
deploy-edge-functions.yml runs only
  ├─ Functions deployed immediately
  └─ Cloudflare also auto-deploys
```

---

## 7. Error Handling Strategy

### 7.1 Fail-Fast Approach

**Frontend Quality**:
```yaml
steps:
  - lint        # Stop here if fail
  - test        # Stop here if fail
  - build       # Stop here if fail
```

**Rationale**:
- Find first error immediately
- Fix and push new commit
- Re-run CI automatically

**Example**:
```
Commit 1: Typo in TypeScript
  ↓
CI fails at "lint" (1 min)
  ↓
Dev sees error, fixes typo
  ↓
Commit 2: Pushed
  ↓
CI reruns, passes (1 min)
```

---

### 7.2 Partial Failure Handling

**Edge Functions Deploy + Migration Failure**:
```yaml
- name: Push Migrations
  continue-on-error: true  # Don't stop here
  run: supabase db push --linked

- name: Deploy Functions
  run: supabase functions deploy  # Always runs
```

**Why**:
- Refactor has no migrations
- Skipping should not block function deploy
- If migration needed, it failed for reason other than refactor

**Blocking Failures**:
```
✅ Function deploy fails → ENTIRE WORKFLOW FAILS
   (GitHub shows red X)

✅ Migration push fails (non-critical) → Workflow continues
   (GitHub shows warning ⚠️)
```

---

## 8. Rollback via CI/CD

### 8.1 Frontend Rollback

**Not via CI/CD**:
```
Cloudflare Dashboard
  ↓
Deployments tab
  ↓
Find previous deployment
  ↓
Click "Rollback"
  ↓
Done (2 min)
```

**Why Not CI/CD**:
- Too fast to use CI/CD
- One-click in dashboard
- No code changes needed

---

### 8.2 Edge Functions Rollback

**Via CI/CD + PR**:
```
Create hotfix branch
  ↓
git revert <bad-commit>
  ↓
git push → Create PR
  ↓
CI runs on PR
  ↓
Fast-track review
  ↓
Merge to main
  ↓
deploy-edge-functions.yml auto-triggers
  ↓
Functions revert to previous version
  ↓
Done (5-10 min)
```

**Example**:
```bash
git checkout main && git pull
git checkout -b hotfix/revert-sandpack
git revert abc1234  # Bad merge commit
git push -u origin hotfix/revert-sandpack

gh pr create \
  --title "[HOTFIX] Revert Sandpack refactor" \
  --body "Reverting commit abc1234 due to [reason]"
```

---

## 9. Monitoring & Alerting via CI/CD

### 9.1 Available via GitHub Actions

**Build Status Page**:
```
Actions tab
  ↓
Shows all workflow runs
  ↓
Indicates pass/fail
  ↓
Click to view logs
```

**PR Status Checks**:
```
PR page
  ↓
Shows which checks passed/failed
  ↓
Can re-run failed checks
  ↓
Required checks must pass to merge
```

**For Refactor**:
- PR shows: frontend-quality ✅, edge-functions-tests ✅
- All checks must pass before merge
- Team can see exact failures

---

### 9.2 Post-Deploy Monitoring (External)

**Not Built Into GitHub Actions**:
```
Production Error Monitoring
  ↓
Requires: Sentry, DataDog, New Relic, etc.
  ↓
Phase 5.5.4 task: Configure Sentry alerts
  ↓
Set up 24-hour monitoring window
```

**GitHub Actions Gaps**:
- ❌ Can't trigger alerts on production error rate spike
- ❌ Can't measure artifact success rate
- ❌ Can't track generation latency
- ⚠️ Workflows finish quickly (can't monitor production)

**Solution**:
- Use Sentry for error tracking
- Use CloudFlare Analytics for performance
- Manual monitoring dashboard

---

## 10. CI/CD Configuration Summary for Refactor

### What Changes Need to Happen

**New Test Files**:
```
✅ artifact-generation-e2e.test.ts  (Phase 5.1)
   - Added to supabase/functions/_shared/__tests__/
   - Automatically picked up by edge-functions-tests.yml
   - Must reach 90% coverage

✅ SimpleArtifactRenderer.test.tsx  (Phase 5.1)
   - Added to src/components/__tests__/
   - Automatically picked up by frontend-quality.yml
   - Contributes to overall 55% coverage
```

**No CI/CD Workflow Changes Needed**:
```
❌ Don't modify deploy-edge-functions.yml
❌ Don't modify deploy-migrations.yml
❌ Don't modify frontend-quality.yml
❌ Don't modify edge-functions-tests.yml
❌ Don't modify e2e-tests.yml
```

**Why**:
- Existing workflows automatically pick up new tests
- Coverage thresholds already defined
- No special configuration needed

---

### What Tests Will Run on PR

```
PR Created on refactor/vanilla-sandpack-artifacts
  ↓
frontend-quality.yml:
├─ Lint (eslint)
├─ Test (npm run test) ← New tests here
├─ Build (npm run build)
└─ Critical files (validate)
  ↓
edge-functions-tests.yml:
├─ Test (deno test) ← New tests here
├─ 90% coverage check (MUST PASS)
├─ Lint (deno lint)
└─ Type check (deno check)
  ↓
All must PASS to merge
```

---

### Success Criteria

**PR Passes All Checks** ✅:
```
frontend-quality:
├─ Lint: ✅ PASS
├─ Test: ✅ PASS (includes new tests)
├─ Build: ✅ PASS
└─ Validation: ✅ PASS

edge-functions-tests:
├─ Test: ✅ PASS (includes new tests)
├─ Coverage: ✅ ≥90% (achieved with new tests)
├─ Lint: ✅ PASS
└─ Type check: ✅ PASS

Code Review: ✅ APPROVED

Merge: ✅ SUCCESS
  ↓
Auto-Deploy: ✅ TRIGGERED
```

**Post-Merge Monitoring** (24 hours):
```
Manual observation (Phase 5.5.4):
├─ Sentry dashboard checked
├─ Error rate monitored
├─ Success rate verified
├─ Latency tracked
└─ "Ask AI to Fix" usage monitored
```

---

## Conclusion

The CI/CD system is well-designed for this refactor:

1. ✅ **Fail-fast**: Errors caught quickly
2. ✅ **Automated**: No manual deployment possible
3. ✅ **Safe**: Multiple gates before production
4. ✅ **Clear**: Path-based triggers prevent accidents
5. ✅ **Observable**: Logs available for debugging

The main work is completing the tests (Phase 5.1) to leverage these workflows fully.

