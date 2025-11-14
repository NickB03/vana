# Quick Setup Checklist

## Branch Protection & Coverage Tracking Setup

### ⏱️ Time Required: 5 minutes

---

## Step 1: Codecov Setup (2 min)

- [ ] Go to [codecov.io](https://codecov.io)
- [ ] Sign in with GitHub
- [ ] Select `llm-chat-site` repository
- [ ] Copy upload token
- [ ] Add token to GitHub Secrets:
  - Go to: https://github.com/NickB03/llm-chat-site/settings/secrets/actions
  - New secret: `CODECOV_TOKEN`
  - Paste token value

**Verification:** GitHub Secrets shows `CODECOV_TOKEN` (green checkmark)

---

## Step 2: Run Branch Protection Script (1 min)

```bash
./scripts/setup-branch-protection.sh
```

**Expected Output:**
```
✓ GitHub CLI authenticated
✓ Branch protection enabled
✓ Require status checks to pass
✓ Require pull request reviews
✓ Prevent force pushes to main
```

**Verification:** Script completes without errors

---

## Step 3: Enable GitHub Actions (30 sec)

- [ ] Go to: https://github.com/NickB03/llm-chat-site/actions
- [ ] Enable workflows if disabled
- [ ] Click "Frontend Quality" workflow
- [ ] Verify it's enabled (green dot)

**Verification:** Actions tab shows "Frontend Quality" workflow

---

## Step 4: Test with a PR (2 min)

```bash
# Create test branch
git checkout -b test/verify-ci-setup

# Make trivial change
echo "\n# CI/CD Setup Verified" >> README.md

# Commit and push
git add README.md
git commit -m "test: verify CI/CD setup"
git push -u origin test/verify-ci-setup

# Create PR
gh pr create --title "Test: CI/CD Verification" --body "Testing branch protection and coverage tracking"
```

**Expected Behavior:**
- ✅ GitHub Actions starts automatically
- ✅ Codecov uploads coverage
- ✅ PR shows coverage badge
- ✅ All checks pass (lint, test, build)

**Verification:** PR shows green checkmarks for all checks

---

## Step 5: Cleanup Test PR (30 sec)

```bash
# Close and delete test PR
gh pr close test/verify-ci-setup --delete-branch
git checkout main
```

---

## ✅ Setup Complete!

### What You Have Now:

**Protection:**
- ✅ Cannot push directly to `main`
- ✅ Cannot force push to `main`
- ✅ Cannot delete `main` branch
- ✅ Requires 1 approval before merge
- ✅ Requires all checks to pass

**Coverage Tracking:**
- ✅ Visual coverage reports on PRs
- ✅ Coverage trend charts
- ✅ Automatic PR comments
- ✅ Coverage badges available

**Quality Gates:**
- ✅ Lint must pass
- ✅ Tests must pass (293 tests)
- ✅ Coverage must meet threshold (55%)
- ✅ Build must succeed

---

## Common Issues

### "quality check not found"
**Fix:** Enable workflows in Actions tab

### "Codecov upload failed"
**Fix:** Check `CODECOV_TOKEN` secret is set correctly

### "Cannot push to protected branch"
**Fix:** Create PR instead of pushing directly to `main`

---

## Next Steps

### Optional Enhancements:

1. **Add Coverage Badge to README:**
   ```markdown
   [![codecov](https://codecov.io/gh/NickB03/llm-chat-site/graph/badge.svg)](https://codecov.io/gh/NickB03/llm-chat-site)
   ```
   See: `docs/codecov-badges.md`

2. **Increase Coverage Thresholds:**
   - Edit `vitest.config.ts`
   - Raise thresholds as coverage improves

3. **Add More Reviewers:**
   - Edit branch protection rules
   - Increase required approvals to 2

---

## Documentation

- **Full Setup Guide:** [`docs/branch-protection-setup.md`](branch-protection-setup.md)
- **Codecov Badges:** [`docs/codecov-badges.md`](codecov-badges.md)
- **Testing Guide:** [`docs/testing-ci.md`](testing-ci.md)
- **Coverage Workflow:** [`docs/testing-coverage.md`](testing-coverage.md)

---

**Last Updated:** 2025-11-14
