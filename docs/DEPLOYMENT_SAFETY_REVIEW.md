# Vanilla Sandpack Artifact Refactor - Deployment Safety Review

**Date**: 2026-01-18
**Branch**: `refactor/vanilla-sandpack-artifacts`
**Scope**: Phase 5.5 (CI/CD & Deployment Prep) and Phase 6 (PR Creation & Merge) review

---

## Executive Summary

The CI/CD and deployment infrastructure is **well-designed with proper safeguards** for the vanilla Sandpack refactor. The system enforces PR-based deployments, comprehensive testing, and automated safety checks. However, there are **critical action items** required before merge:

1. **Missing Artifact Test Coverage** - 5,000+ lines of tests deleted with minimal replacement
2. **Incomplete Monitoring/Observability Setup** - Alert thresholds proposed but not configured
3. **Manual Rollback Procedure** - Not yet documented or tested
4. **Pre-PR Checklist** - Not fully automated in CI/CD

---

## 1. Deployment Workflow Verification

### 1.1 PR-Based Enforcement (ENFORCED ✅)

**Status**: PROPERLY CONFIGURED

The system enforces PR-based deployments through multiple layers:

**Code Level** (`CLAUDE.md` Rule #10):
```markdown
10. **Deployment Process**: NEVER deploy directly to production —
    ALL changes require PR review and automated testing
```

**Documentation Level** (`scripts/DEPLOYMENT-WORKFLOW.md`):
```markdown
⚠️ CRITICAL: ALL production deployments go through PR process.
```

**Implementation**:
- No manual deployment scripts that bypass GitHub
- All deployments triggered by `git push` to `main`
- Changes only reach `main` via merged PR
- CI/CD workflows configured on `push: branches: [main]` trigger

**Safeguards**:
- Feature branches use `refactor/vanilla-sandpack-artifacts`
- PR required before merge to main
- Automated CI checks run on PR (not optional)
- Code review gate before merge

### 1.2 CI/CD Workflow Configuration (VERIFIED ✅)

**Edge Functions Deployment** (`.github/workflows/deploy-edge-functions.yml`):

✅ **Proper Triggers**:
```yaml
on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']  # Only deploys when functions change
  workflow_dispatch:
    inputs:
      dry_run: boolean  # Allows test deployments
```

✅ **Correct Sequence**:
1. Checkout full git history (`fetch-depth: 0`)
2. Link to production project
3. **Ensure migrations applied first** (fail-fast)
4. Deploy Edge Functions
5. Report summary

✅ **Error Handling**:
```bash
supabase db push --linked --include-all || echo "::warning::Migration push failed"
```
The `continue-on-error: true` allows functions to deploy even if migrations fail, which is intentional since migrations are only needed if schema changed (this refactor has no schema changes).

**Database Migrations Deployment** (`.github/workflows/deploy-migrations.yml`):

✅ **Proper Configuration**:
```yaml
on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']  # Only runs if migrations changed
```

✅ **Required Secrets**:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

**Note**: Vanilla Sandpack refactor has NO schema changes, so `deploy-migrations.yml` won't trigger. This is correct.

### 1.3 CI/CD Test Gates (VERIFIED ✅)

**Frontend Quality** (`.github/workflows/frontend-quality.yml`):

Runs on PR and `main` push:
- ✅ Critical files validation (prevents file corruption)
- ✅ Lint checks (ESLint)
- ✅ Unit tests (`npm run test`)
- ✅ Production build verification (`npm run build`)

**Edge Functions Tests** (`.github/workflows/edge-functions-tests.yml`):

Runs on changes to `supabase/functions/**`:
- ✅ Unit tests with coverage (90% threshold)
- ✅ Lint checks (deno lint)
- ✅ Type checking (deno check)
- ✅ Coverage upload to Codecov

**Integration Tests** (`.github/workflows/integration-tests.yml`):

Manually triggered (not blocking merge):
- ✅ Full Supabase startup with local database
- ✅ Real API calls to Gemini/Tavily (provider selection)
- ✅ Daily scheduled runs for regression detection
- ✅ Cost tracking for API usage

**E2E Tests** (`.github/workflows/e2e-tests.yml`):

Runs after merge to main:
- ✅ Mocked APIs (tests UI interactions, not backend)
- ✅ Full production build verification
- ✅ Playwright test execution
- ✅ Artifact preservation for debugging

---

## 2. Rollback Plan Assessment

### 2.1 Current Rollback Capabilities

**Frontend Rollback** (Cloudflare Pages): ✅ AVAILABLE
```markdown
From DEPLOYMENT-WORKFLOW.md:
- Dashboard → Deployments → Click previous → "Rollback"
- One-click reversion to any previous deployment
```

**Edge Functions/Database Rollback**: ⚠️ PARTIALLY DOCUMENTED

From `CI_CD.md`:
```bash
1. Create hotfix branch from last known good commit
2. Test locally (npm run test, integration tests, build)
3. Create PR with [HOTFIX] prefix
4. Fast-track review → Merge → Auto-deploy
```

**Limitation**: Rollback requires creating a NEW PR. Cannot directly revert commits on production.

### 2.2 Rollback Testing Requirements (ACTION ITEM)

**Missing**: Phase 5.5.3 requires documented and tested rollback procedure.

**Recommended Implementation**:

1. **Document Rollback Procedure** (in PR description):
   ```markdown
   ## Rollback Plan

   **Frontend**: Cloudflare Pages → Deployments → Rollback to [previous hash]
   **Edge Functions**: Create hotfix PR reverting to commit [hash]
   **Database**: (N/A - no schema changes in this refactor)

   **Estimated Rollback Time**:
   - Frontend: <2 minutes (one-click)
   - Edge Functions: 5-10 minutes (PR creation + merge)
   ```

2. **Test Rollback on Feature Branch** (before merge):
   ```bash
   # Example: Create test commit, verify it can be reverted
   git log --oneline -1  # Note commit hash
   git revert <commit-hash>
   # Verify build succeeds
   npm run build
   npm run test
   ```

3. **Post-Merge Monitoring Window** (24 hours):
   - Monitor error rates
   - Ready to create hotfix PR if needed
   - Keep team on standby

### 2.3 Rollback Time Estimates

| Component | Scenario | Time | Method |
|-----------|----------|------|--------|
| Frontend | Rollback to previous deployment | <2 min | Cloudflare one-click |
| Edge Functions | Revert broken function | 5-10 min | Create hotfix PR + merge |
| Database | Schema rollback needed | 10-15 min | Create hotfix PR + manual schema revert |
| Full system | Complete rollback | <15 min | Combination above |

**Note**: This refactor requires NO database changes, so database rollback time is theoretical.

---

## 3. Monitoring & Observability Assessment

### 3.1 Proposed Monitoring from Phase 5.5.4

The refactor plan proposes:
- Verify Sentry integration captures Sandpack errors
- Error tracking: artifact generation, compilation, imports, "Ask AI to Fix" usage
- Alerts: >5% error rate, >2% timeout rate

### 3.2 Current Monitoring Status

**What's Configured** ✅:
- Edge Functions can log to Supabase (built-in)
- Sentry integration exists in codebase (if configured)

**What's Missing** ⚠️:
- Sentry configuration not verified
- Alert thresholds not set up in Sentry
- "Ask AI to Fix" usage metrics not instrumented
- Post-merge monitoring checklist not created

### 3.3 Recommended Monitoring Setup (ACTION ITEM)

**Before Merge**:

1. **Verify Sentry Integration** (if using):
   ```bash
   # Check if Sentry is initialized in frontend
   grep -r "Sentry.init" src/

   # Check if Edge Functions have error reporting
   grep -r "captureException" supabase/functions/
   ```

2. **Instrument Artifact System**:
   ```typescript
   // In artifact-tool-v2.ts
   captureEvent({
     message: 'Artifact generated',
     tags: { artifact_type: 'react', status: 'success' }
   });

   captureException(error, {
     tags: { artifact_type: 'react', phase: 'generation' }
   });
   ```

3. **Create Sentry Alerts**:
   - Artifact generation error rate > 5%
   - Sandpack compilation timeout rate > 2%
   - Package import failures
   - "Ask AI to Fix" invocation rate (to track error frequency)

**Post-Merge Monitoring Window**:

1. **First 1 hour** (critical period):
   - Check Sentry dashboard for errors
   - Monitor Edge Function logs
   - Watch real-time chat interactions

2. **First 24 hours** (observation period):
   - Track daily error rates (target: <2%)
   - Monitor artifact success rate (target: >95%)
   - Review "Ask AI to Fix" usage (baseline)
   - Check generation latency (target: <2s)

3. **Metrics to Track**:
   ```
   - Artifact generation success rate
   - Average generation latency
   - Sandpack compilation error rate
   - Package import error rate
   - "Ask AI to Fix" invocation frequency
   - User-reported issues (GitHub/support)
   ```

---

## 4. Pre-PR Checklist Feasibility

### 4.1 Current Checklist (Phase 5.5.1)

```bash
# 1. Unit tests
npm run test

# 2. Integration tests
supabase start
npm run test:integration

# 3. Production build
npm run build

# 4. E2E critical paths
npm run test:e2e:headed

# 5. Coverage
npm run test:coverage  # Must show ≥55%

# 6. TypeScript
npx tsc --noEmit

# 7. Chrome DevTools verification
# (Manual - use Chrome DevTools MCP)
```

### 4.2 Automation Status

| Step | Automated | CI/CD Blocked | Notes |
|------|-----------|---------------|-------|
| Unit tests | ✅ Yes | ✅ Yes (frontend-quality.yml) | Runs on PR |
| Integration tests | ✅ Yes | ⚠️ No (manual trigger) | Scheduled daily, not blocking |
| Build verification | ✅ Yes | ✅ Yes (frontend-quality.yml) | Runs on PR |
| E2E critical paths | ✅ Yes | ⚠️ No (after merge) | Runs only on main push |
| Coverage check | ✅ Yes | ✅ Yes (frontend-quality.yml) | Min 55%, edge-functions 90% |
| TypeScript check | ❌ No | ✅ Partial (via build) | Build catches TS errors |
| Chrome verification | ❌ No | ❌ No | Manual step required |

### 4.3 Recommended Automation Improvements

**Missing in CI/CD** (before merge):

1. **Add E2E critical tests to PR workflow** (currently only on main):
   ```yaml
   # In frontend-quality.yml
   - name: Run E2E critical paths
     run: npm run test:e2e:headed -- --grep "@critical"
   ```

2. **Add integration tests to PR workflow** (optional, but recommended):
   ```yaml
   # In frontend-quality.yml
   - name: Run integration tests
     run: |
       supabase start
       npm run test:integration
   ```

3. **Add explicit TypeScript check**:
   ```yaml
   - name: TypeScript check
     run: npx tsc --noEmit
   ```

### 4.4 Chrome DevTools Verification (MANUAL)

Step 7 (Chrome DevTools MCP) cannot be automated. Recommended approach:

```markdown
## Pre-Merge Verification (Manual)

Before creating PR, verify artifact rendering:

1. Start dev server: `npm run dev`
2. Open Chrome DevTools MCP
3. Test 6 sample artifacts:
   - [ ] Simple counter
   - [ ] Todo list
   - [ ] Analytics dashboard
   - [ ] Animated card
   - [ ] Icon gallery
   - [ ] Memory game
4. Verify no console errors
5. Test "Ask AI to Fix" flow (optional)
```

---

## 5. Specific Recommendations for Vanilla Sandpack Refactor

### 5.1 Critical Action Items (BLOCKING MERGE)

#### 1. Create Artifact Test Suite (PRIORITY 10/10)

**Current State**: ~5,000 lines of artifact tests deleted with minimal replacement

**Required Tests**:
```
supabase/functions/_shared/__tests__/
├── artifact-generation-e2e.test.ts (NEW - REQUIRED)
├── sandpack-rendering.test.ts (NEW - REQUIRED)
└── error-handling.test.ts (NEW - REQUIRED)

src/components/__tests__/
├── SimpleArtifactRenderer.test.tsx (NEW - REQUIRED)
└── ArtifactErrorBoundary.test.tsx (NEW - REQUIRED)
```

**Minimum Test Coverage**:
- Artifact generation E2E: ≥80% coverage
- Sandpack rendering: ≥80% coverage
- Error handling: ≥70% coverage
- Overall: ≥55% maintained

**Verification**:
```bash
npm run test:coverage
# Expected output: Coverage ≥55% overall, ≥80% for artifact modules
```

**Status**: Phase 5.1 lists these tests as BLOCKING. Must complete before PR.

#### 2. Document and Test Rollback Procedure (PRIORITY 9/10)

**Required Documentation**:
```markdown
## Rollback Plan

**Last known good commit**: [commit hash from merge]
**Estimated rollback time**: <15 minutes total

### Frontend Rollback
1. Cloudflare Dashboard → Deployments
2. Find deployment before [merge hash]
3. Click "Rollback"
4. Verify site loads at [domain]

### Edge Functions Rollback
1. git checkout main && git pull
2. git checkout -b hotfix/revert-sandpack
3. git revert [merge commit hash]
4. npm run test && npm run build
5. gh pr create --title "[HOTFIX] Revert Sandpack refactor"
6. Merge PR → Auto-deploy

### Emergency Contact
- On-call engineer: [name/phone]
- Team Slack: #deployments
```

**Testing Required** (before PR):
```bash
# Create test commit
echo "test" > test.txt
git add test.txt
git commit -m "test: revert test"
TEST_COMMIT=$(git rev-parse HEAD)

# Test revert
git revert $TEST_COMMIT
git reset --hard HEAD~1  # Clean up

# Verify build still works
npm run build
npm run test
```

#### 3. Set Up Monitoring and Alerts (PRIORITY 8/10)

**Required Setup**:

In Sentry (or equivalent error tracking):
1. Create alert: `artifact.generation.error_rate > 5%` → Page on-call
2. Create alert: `artifact.timeout_rate > 2%` → Slack #deployments
3. Create dashboard: Artifact system health
4. Tag all errors with: `artifact_type`, `phase`, `error_code`

**Post-Merge Monitoring Checklist**:
```markdown
## 24-Hour Post-Merge Monitoring

**Hour 1** (Critical Period):
- [ ] Check Sentry dashboard - no new artifact errors
- [ ] Test chat with artifact generation prompt
- [ ] Verify "Ask AI to Fix" button appears on errors

**Hour 6** (Stability Check):
- [ ] Review error logs - any patterns?
- [ ] Check artifact success rate (target: >95%)
- [ ] Verify no user-reported issues

**Hour 24** (Final Assessment):
- [ ] Review aggregate metrics
- [ ] Artifact error rate (target: <2%)
- [ ] Generation latency (target: <2s avg)
- [ ] Determine if rollback needed
```

### 5.2 Recommended Action Items (NOT BLOCKING)

#### 1. Add E2E Critical Tests to PR Workflow

Currently E2E tests only run AFTER merge. Recommend:

```yaml
# In .github/workflows/frontend-quality.yml
- name: Run E2E critical tests
  run: npm run test:e2e -- --grep "@critical"
```

**Benefit**: Catch UI regressions before merge
**Cost**: +5 minutes per PR

#### 2. Add TypeScript Check to CI

```yaml
# In .github/workflows/frontend-quality.yml
- name: Type check
  run: npx tsc --noEmit
```

**Benefit**: Catch type errors earlier
**Cost**: <1 minute per PR

#### 3. Create Post-Merge Runbook

Document:
- Who monitors first 24 hours
- What metrics to check
- Escalation procedure if error rate spikes
- How to trigger hotfix PR

**Location**: `docs/SANDPACK_REFACTOR_RUNBOOK.md`

---

## 6. Safety Checklist for Merge

Use this before creating the PR:

```markdown
## Pre-PR Safety Checklist

### Code Quality
- [ ] All 6 artifact types tested and working
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Coverage meets 55% minimum: `npm run test:coverage`
- [ ] No hardcoded model names (use MODELS.*)

### Testing Coverage
- [ ] Artifact generation E2E tests created (≥80% coverage)
- [ ] Sandpack rendering tests created (≥80% coverage)
- [ ] Error handling tests created (≥70% coverage)
- [ ] All 6 sample artifacts have automated tests
- [ ] Package whitelist enforcement tested

### Build & Deployment
- [ ] Production build succeeds: `npm run build`
- [ ] All unit tests pass: `npm run test`
- [ ] Integration tests pass: `npm run test:integration`
- [ ] E2E critical tests pass locally: `npm run test:e2e:headed`

### Documentation
- [ ] Rollback procedure documented in PR
- [ ] Monitoring plan in PR description
- [ ] Post-merge runbook created
- [ ] ARTIFACT_SYSTEM.md updated
- [ ] CLAUDE.md references verified

### Monitoring Setup
- [ ] Sentry integration verified (if using)
- [ ] Alert thresholds configured
- [ ] Dashboard created for artifact metrics
- [ ] Team notified of merge timing

### Manual Verification
- [ ] Chrome DevTools: Test all 6 sample artifacts
- [ ] "Ask AI to Fix" flow works
- [ ] Error messages are helpful
- [ ] Package import errors caught gracefully

### Final Checks
- [ ] Branch is clean, only refactor changes
- [ ] No debug code or console.log
- [ ] No orphaned imports
- [ ] Code review completed
```

---

## 7. Risk Assessment

### 7.1 Deployment Risks (LOW - Mitigated)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Artifact generation fails | Low | High | E2E tests, Sentry monitoring |
| Sandpack rendering breaks | Low | High | Component tests, Chrome verification |
| Package imports fail | Low | Medium | Whitelist enforcement tests |
| "Ask AI to Fix" doesn't work | Low | Medium | Error flow tests, manual verification |
| Rollback takes too long | Low | High | Documented procedure, <15 min target |
| Silent errors not caught | Medium | High | Sentry alerts, post-merge monitoring |

**Overall Risk**: LOW-MEDIUM (well-mitigated with proper testing)

### 7.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| On-call engineer unavailable | Low | High | Runbook documentation |
| PR blocked on failed test | Medium | Low | Re-run CI if transient |
| Database migration issues | Low | N/A | No schema changes in refactor |
| Performance regression | Low | Medium | Latency monitoring post-merge |

---

## 8. Deployment Process (Step-by-Step)

### 8.1 Before Creating PR (Day -1)

```bash
# 1. Complete all tests locally
npm run test
supabase start
npm run test:integration
npm run build
npm run test:e2e:headed

# 2. Verify coverage
npm run test:coverage  # Must show ≥55%

# 3. Test rollback procedure
git log --oneline -1  # Note current commit
echo "test" > test.txt && git add test.txt && git commit -m "test"
git revert HEAD
npm run build  # Verify clean state
git reset --hard HEAD~1  # Clean up
```

### 8.2 Creating PR (Day 0)

```bash
# Push feature branch to GitHub
git push origin refactor/vanilla-sandpack-artifacts

# Create PR with comprehensive description
gh pr create --title "refactor: vanilla Sandpack artifact system" \
  --body-file PR_DESCRIPTION.md
```

**PR Description Template** (from refactor plan):
```markdown
## Summary
Replaces ~15,000 lines of artifact complexity with minimal vanilla Sandpack.

## Test Coverage
- ✅ Artifact generation E2E tests (new)
- ✅ Sandpack rendering tests (new)
- ✅ 6 sample artifacts automated
- ✅ Coverage: X% (≥55% required)

## Verification
- [x] All unit tests pass
- [x] Integration tests pass
- [x] Build succeeds
- [x] Coverage maintained

## Rollback Plan
Documented in ROLLBACK_PLAN.md

## Monitoring
Errors will be tracked in Sentry for 24 hours post-merge.
Alert thresholds: 5% error rate, 2% timeout rate
```

### 8.3 PR Phase (Day 0-1)

```
CI/CD Workflow:
├─ frontend-quality.yml runs
│  ├─ Lint checks
│  ├─ Unit tests (must pass)
│  ├─ Build verification (must pass)
│  └─ Coverage check (must be ≥55%)
├─ edge-functions-tests.yml runs (if functions changed)
│  ├─ Tests (90% coverage)
│  ├─ Lint
│  └─ Type check
└─ Code review (manual gate)
```

**What happens if tests fail**:
- Fix failing test
- Push new commit
- CI automatically re-runs
- Repeat until all green

**What happens if review has comments**:
- Address feedback
- Push fix commits (no rebase needed)
- Re-request review
- Merge once approved

### 8.4 Merge (Day 1)

```bash
# GitHub: Click "Merge pull request"
# (after all checks green + review approved)

# Or via CLI:
gh pr merge --auto  # Waits for all checks
```

**Automatic Deployment Triggers**:
- Frontend: Cloudflare Pages auto-deploys `main` branch
- Edge Functions: `deploy-edge-functions.yml` runs if `supabase/functions/**` changed
- Migrations: `deploy-migrations.yml` runs if `supabase/migrations/**` changed (not applicable)

### 8.5 Post-Merge (Day 1-2)

**Immediately After Merge** (first 5 minutes):
```
1. Monitor GitHub Actions dashboard
2. Verify Cloudflare deployment succeeds
3. Verify Edge Functions deployment succeeds
4. Check production site loads
```

**First Hour** (critical monitoring):
```
1. Check Sentry dashboard
2. Test artifact generation manually
3. Review error logs
4. Stand by for hotfix if needed
```

**First 24 Hours** (observation period):
```
1. Daily review of artifact success rate
2. Monitor error trends
3. Check user-reported issues
4. Finalize decision: Success or Rollback?
```

---

## 9. Success Criteria

Refactor is successful if, 24 hours post-merge:

- ✅ **Zero Critical Errors**: No artifact system outages
- ✅ **Low Error Rate**: <2% error rate (5% alert threshold not breached)
- ✅ **Good Success Rate**: >95% artifact generation success
- ✅ **Fast Generation**: <2s average latency
- ✅ **Clean Rollback**: If rollback needed, <15 minutes execution
- ✅ **No Major Issues**: Zero user-reported critical bugs

---

## 10. Conclusion

**Deployment readiness**: CONDITIONAL ✅

The CI/CD infrastructure is solid and properly configured. **However, merge is NOT recommended without**:

1. ✅ Complete artifact test suite (currently listed as Phase 5.1 - NOT STARTED)
2. ✅ Documented and tested rollback procedure (Phase 5.5.3 - NOT STARTED)
3. ✅ Monitoring setup and post-merge runbook (Phase 5.5.4 - PARTIALLY DONE)

These are all listed as REQUIRED in the refactor plan (Phase 5 - BLOCKING BEFORE MERGE).

**Recommended Action**: Do not create PR until Phase 5 is fully complete. The Phase 5.5 and 6 CI/CD infrastructure is ready; the bottleneck is test coverage and observability.

---

## Appendix: Files Reviewed

| File | Status | Notes |
|------|--------|-------|
| `.github/workflows/deploy-edge-functions.yml` | ✅ Proper | Auto-deploys on function changes |
| `.github/workflows/deploy-migrations.yml` | ✅ Proper | Auto-deploys on schema changes |
| `.github/workflows/frontend-quality.yml` | ✅ Good | Runs tests, lint, build on PR |
| `.github/workflows/edge-functions-tests.yml` | ✅ Proper | 90% coverage threshold |
| `.github/workflows/e2e-tests.yml` | ✅ Good | Runs after merge on main |
| `.github/workflows/e2e-manual.yml` | ✅ Good | Manual E2E trigger with filters |
| `.github/workflows/integration-tests.yml` | ✅ Good | Real API testing, scheduled |
| `docs/CI_CD.md` | ✅ Comprehensive | Good reference documentation |
| `scripts/DEPLOYMENT-WORKFLOW.md` | ✅ Clear | Enforces PR-based deployment |
| `scripts/verify-deployment.cjs` | ✅ Useful | Cache verification tool |
| `CLAUDE.md` | ✅ Updated | Rule #10 enforces PR process |
| `vanilla-sandpack-refactor-plan.md` | ⚠️ Incomplete | Phase 5 tests NOT STARTED |

