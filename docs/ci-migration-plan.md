# CI/CD Pipeline Simplification - Migration Plan

## 🎯 Executive Summary

**Problem**: 7 workflow files with 1,432 total lines, complex dependencies, duplicate setups
**Solution**: 2 clean workflows with 220 total lines, 84% reduction in complexity

## 📊 Complexity Reduction

### Before (Current State)
- **Total Files**: 7 workflows
- **Total Lines**: 1,432 lines
- **Main Issues**:
  - main-ci.yml: 586 lines (over-engineered matrix)
  - deploy.yml: 348 lines (disabled but still present)
  - local-build.yml: 266 lines (duplicates main-ci)
  - Inconsistent pnpm versions (v2, v4, v9)
  - Complex job dependencies and conditions
  - Over-engineered caching strategies

### After (Simplified State)
- **Total Files**: 2 workflows
- **Total Lines**: ~220 lines
- **Key Improvements**:
  - ci.yml: 140 lines (covers all testing)
  - deploy.yml: 80 lines (clean deployment)
  - Consistent tooling versions
  - Simple, readable structure
  - Fast feedback loops

## 🏗️ New Architecture

### 1. ci.yml - Main CI Pipeline
**Triggers**: Push to main/develop, PRs
**Jobs**:
- **test**: Matrix strategy (Backend + Frontend in parallel)
- **security**: Security scans (main branch only)
- **e2e**: Playwright tests (main branch only)
- **ci-status**: Required status check

### 2. deploy.yml - Manual Deployment
**Triggers**: Manual dispatch only
**Jobs**:
- **deploy**: Single job for staging or production

## 📋 Migration Steps

### Phase 1: Backup & Preparation
1. **Create backup branch**:
   ```bash
   git checkout -b ci-migration-backup
   git push -u origin ci-migration-backup
   ```

2. **Document current secrets**:
   - AUTH_SECRET
   - POSTGRES_URL
   - BLOB_READ_WRITE_TOKEN
   - REDIS_URL
   - GCP_SA_KEY

### Phase 2: Deploy New Workflows
1. **The new files are already created**:
   - ✅ `/Users/nick/Development/vana/.github/workflows/ci.yml`
   - ✅ `/Users/nick/Development/vana/.github/workflows/deploy.yml` (updated)

2. **Test the new CI pipeline**:
   ```bash
   git add .github/workflows/ci.yml
   git commit -m "Add simplified CI pipeline"
   git push
   ```

### Phase 3: Remove Old Workflows
**Files to DELETE**:
```bash
rm .github/workflows/main-ci.yml           # 586 lines
rm .github/workflows/local-build.yml       # 266 lines  
rm .github/workflows/dependency-check.yml  # 56 lines
rm .github/workflows/security-scan.yml     # 62 lines
rm .github/workflows/test-gcp-auth.yml     # 52 lines
rm .github/workflows/coderabbit-pushover.yml # 62 lines
```

**Keep these files in frontend/** (they're for the frontend subdirectory):
- `frontend/.github/workflows/lint.yml`
- `frontend/.github/workflows/playwright.yml`

### Phase 4: Update Branch Protection Rules
1. **GitHub Repository Settings > Branches**
2. **Edit main branch protection**:
   - Remove old status checks:
     - "Local Build & Test Pipeline"
     - "Backend Tests"
     - "Frontend Tests"
   - Add new required status check:
     - "CI Status" (from ci.yml)

### Phase 5: Clean Up Scripts
1. **Remove unused scripts** (if any):
   ```bash
   find scripts/ -name "*ci*" -o -name "*deploy*" | grep -v essential
   ```

2. **Update documentation**:
   - Update README.md CI badge if present
   - Update any references to old workflow names

## 🔧 Key Benefits

### Performance Improvements
- **Faster builds**: Matrix parallelization reduces total time
- **Smart caching**: Built-in Node.js/pnpm caching
- **Conditional execution**: Security and E2E only when needed

### Maintainability
- **Single source of truth**: One CI file instead of 7
- **Standard patterns**: Uses GitHub Actions best practices
- **Clear separation**: CI vs Deployment concerns

### Developer Experience
- **Fast feedback**: Basic tests run on every PR
- **Clear status**: Single status check to watch
- **Manual deployment**: Explicit control over releases

## 🚨 Rollback Plan

If issues arise:
1. **Revert the changes**:
   ```bash
   git revert HEAD~1
   git push
   ```

2. **Or restore from backup**:
   ```bash
   git checkout ci-migration-backup -- .github/workflows/
   git commit -m "Restore original CI workflows"
   git push
   ```

## ⚠️ Pre-Migration Checklist

- [ ] Backup branch created
- [ ] All secrets documented
- [ ] Team notified of migration
- [ ] Branch protection rules identified
- [ ] Test environment available for validation

## 🎯 Post-Migration Validation

1. **Create a test PR** and verify:
   - ✅ Backend tests run and pass
   - ✅ Frontend lint/build succeeds
   - ✅ Status check appears in PR

2. **Merge to main** and verify:
   - ✅ Security scan runs (main only)
   - ✅ E2E tests execute (main only)

3. **Test manual deployment**:
   - ✅ Staging deployment works
   - ✅ Production deployment works (if ready)

## 📞 Support

If issues occur during migration:
1. Check GitHub Actions logs for specific errors
2. Verify secrets are properly configured
3. Ensure branch protection rules are updated
4. Use rollback plan if needed

---

**Migration Timeline**: Can be completed in 1-2 hours
**Risk Level**: Low (full rollback available)
**Expected Downtime**: None (CI only)