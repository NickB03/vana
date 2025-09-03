# CI Pipeline Rollback Plan

## 🚨 Emergency Rollback Procedures

**Last Updated**: September 3, 2025  
**Git Commit**: Apply before rolling back to previous version

### Quick Rollback Commands

```bash
# 1. Immediate rollback to previous working version
git checkout HEAD~1 -- .github/workflows/ci-local.yml
git commit -m "EMERGENCY: Rollback CI pipeline to previous version"

# 2. Or rollback to specific commit (replace COMMIT_HASH)
git checkout <COMMIT_HASH> -- .github/workflows/ci-local.yml
git commit -m "ROLLBACK: CI pipeline to working version"

# 3. Or use git revert (safer for shared branches)
git revert <COMMIT_HASH> --no-edit
```

## 🔧 Changes Made (For Reference)

### 1. Backend uv PATH Resolution Fix
**File**: `.github/workflows/ci-local.yml` (lines 51-93)

**Original Issue**: uv command not found after installation  
**Fix Applied**: Container-friendly uv installation with PATH persistence

**Rollback Considerations**:
- If uv installation still fails, the original fallback paths are still there
- The new approach adds more verbose logging and error handling
- **Risk Level**: LOW - Backward compatible with multiple fallback strategies

### 2. Frontend Jest Configuration Fix  
**File**: `.github/workflows/ci-local.yml` (lines 117-163)

**Original Issue**: Jest passWithNoTests flag not working correctly  
**Fix Applied**: Enhanced Jest handling with setup file creation and multiple fallback strategies

**Rollback Considerations**:
- Creates jest.setup.js file if missing - this is safe
- Uses multiple test execution strategies - if one fails, others are tried
- **Risk Level**: LOW - Non-destructive changes with fallbacks

### 3. Security Scan Directory Structure Fix
**File**: `.github/workflows/ci-local.yml` (lines 174-201)

**Original Issue**: Security scan looking for wrong directory structure  
**Fix Applied**: Adaptive directory scanning based on actual project structure

**Rollback Considerations**:
- Now scans both app/ directory and root directory intelligently
- Added proper exclusions for .venv and node_modules
- **Risk Level**: VERY LOW - Only improves existing functionality

### 4. Enhanced Error Handling
**File**: `.github/workflows/ci-local.yml` (multiple locations)

**Original Issue**: Silent failures and poor error reporting  
**Fix Applied**: Comprehensive error handling and logging

**Rollback Considerations**:
- Only adds better error messages and handling
- Does not change core functionality
- **Risk Level**: VERY LOW - Only improves debugging

## 🚦 Rollback Decision Matrix

| Scenario | Action | Command |
|----------|--------|---------|
| Complete CI failure | Immediate rollback | `git checkout HEAD~1 -- .github/workflows/ci-local.yml` |
| Backend tests failing | Rollback backend section only | Manual edit or selective rollback |
| Frontend tests failing | Rollback frontend section only | Manual edit or selective rollback |
| Security scan issues | Rollback security section only | Manual edit or selective rollback |
| Performance degradation | Monitor first, then decide | Check logs, then rollback if needed |

## 🔍 Monitoring & Validation

### Key Metrics to Monitor
1. **CI Pipeline Success Rate**: Should be ≥95%
2. **Build Time**: Should not increase by >20%
3. **Error Clarity**: Better error messages should help debugging

### Validation Checklist
- [ ] Backend tests run successfully
- [ ] Frontend builds without errors
- [ ] Security scans find correct directories
- [ ] Error messages are helpful
- [ ] No new failures introduced

### Testing Commands
```bash
# Run the test strategy script
./scripts/test-ci-fixes.sh

# Check CI syntax
yq eval . .github/workflows/ci-local.yml >/dev/null

# Validate GitHub Actions syntax (if gh CLI available)
gh workflow validate .github/workflows/ci-local.yml
```

## 📞 Emergency Contacts & Procedures

### If Rollback is Needed:

1. **Stop any running CI jobs** in GitHub Actions
2. **Execute rollback command** (see Quick Rollback Commands above)
3. **Push changes immediately**:
   ```bash
   git push origin main
   ```
4. **Verify rollback worked** by triggering a new CI run
5. **Document the issue** in project issues/tickets

### Alternative Approaches (If Primary Fails)

#### Backend Alternative: Manual uv Installation
```yaml
- name: Setup uv (Alternative)
  run: |
    wget https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-gnu.tar.gz
    tar -xzf uv-x86_64-unknown-linux-gnu.tar.gz
    sudo mv uv /usr/local/bin/
    uv --version
```

#### Frontend Alternative: Skip Tests Temporarily
```yaml
- name: Build frontend (Skip Tests)
  run: |
    cd frontend
    pnpm install --frozen-lockfile
    pnpm build  # Skip tests temporarily
```

#### Security Alternative: Skip Security Scans
```yaml
- name: Security scan (Alternative)
  run: |
    echo "Security scans temporarily disabled due to CI issues"
    echo "Manual security review required before deployment"
```

## 📈 Success Criteria for Fixes

### ✅ Success Indicators:
- Backend tests complete without uv PATH errors
- Frontend builds successfully with proper test handling
- Security scans find and analyze correct directories
- Clear, actionable error messages when failures occur
- No increase in build time >20%

### ❌ Rollback Triggers:
- CI success rate drops below 80%
- Any critical pipeline step fails consistently
- Build times increase >50%
- New errors introduced that weren't present before
- Security scans fail to run at all

## 🔒 Trade-offs Made

### Benefits:
- ✅ More robust uv installation with multiple fallback paths
- ✅ Better Jest test handling with setup file creation
- ✅ Adaptive security scanning based on actual project structure
- ✅ Comprehensive error handling and logging
- ✅ Backward compatibility maintained

### Potential Risks:
- ⚠️ Slightly longer CI execution time due to additional checks
- ⚠️ More complex bash scripts (but with better error handling)
- ⚠️ Additional file creation (jest.setup.js) - but safely handled

### Mitigation Strategies:
- All changes include fallback strategies
- Error handling prevents silent failures
- Verbose logging helps with debugging
- No breaking changes to core functionality

---

**Remember**: The goal is to maintain CI pipeline stability while fixing the three critical issues. If any fix causes more problems than it solves, rollback immediately using the procedures above.