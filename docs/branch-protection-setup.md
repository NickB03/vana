# Branch Protection & Coverage Tracking Setup Guide

This guide walks you through setting up branch protection rules and visual coverage tracking for the llm-chat-site repository.

## Overview

**What's Included:**
- ✅ GitHub branch protection rules (prevents broken code from merging)
- ✅ Codecov integration (visual coverage tracking and PR comments)
- ✅ Automated quality gates (lint, test, build must pass)
- ✅ Coverage trend tracking (see coverage changes over time)

---

## Quick Start (5 Minutes)

### 1. Set Up Codecov

**a) Create Codecov Account**
1. Go to [https://codecov.io](https://codecov.io)
2. Sign in with your GitHub account
3. Select `llm-chat-site` repository
4. Copy the upload token

**b) Add Codecov Token to GitHub Secrets**
1. Go to: `https://github.com/NickB03/llm-chat-site/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `CODECOV_TOKEN`
4. Value: *paste the token from Codecov*
5. Click **Add secret**

### 2. Enable Branch Protection

Run the automated setup script:

```bash
./scripts/setup-branch-protection.sh
```

This configures protection rules for the `main` branch automatically.

### 3. Verify Setup

**Test with a PR:**
```bash
# Create test branch
git checkout -b test/verify-protection

# Make a trivial change
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify branch protection"

# Push and create PR
git push -u origin test/verify-protection
gh pr create --title "Test: Branch Protection" --body "Verifying CI/CD setup"
```

**Expected Behavior:**
- ✅ GitHub Actions runs automatically
- ✅ Codecov uploads coverage report
- ✅ PR shows coverage changes
- ✅ Cannot merge until checks pass

---

## Detailed Configuration

### Branch Protection Rules

The following rules are enforced on the `main` branch:

#### ✅ Required Status Checks
- **quality** job must pass before merging
  - Includes: lint, test, coverage, build

#### ✅ Pull Request Reviews
- **1 approving review** required
- Stale reviews dismissed on new commits
- Prevents merging your own PRs

#### ✅ Force Push Prevention
- No force pushes to `main`
- Prevents rewriting history
- Protects against accidental overwrites

#### ✅ Branch Deletion Prevention
- `main` branch cannot be deleted
- Prevents catastrophic accidents

---

## Codecov Configuration

### Coverage Thresholds

**Project Coverage (Overall):**
- Target: 70%
- Threshold: 2% drop allowed
- Status: Fails CI if exceeded

**Patch Coverage (New Code):**
- Target: 75%
- Threshold: 5% variance allowed
- Ensures new code is well-tested

### Ignored Files

Coverage tracking ignores:
- Test files (`**/*.test.ts`, `**/*.test.tsx`)
- Test directories (`**/__tests__/**`, `src/test/**`)
- Type definitions (`**/*.d.ts`)
- Entry points (`src/main.tsx`)
- Scripts and documentation

See `codecov.yml` for full configuration.

---

## CI/CD Workflow

### GitHub Actions Workflow

**File:** `.github/workflows/frontend-quality.yml`

**Triggers:**
- Push to `main` branch
- Pull requests to any branch

**Jobs:**

1. **Lint** - ESLint checks
2. **Test** - Run full test suite with coverage
3. **Upload Coverage** - Send to Codecov
4. **Build** - Verify production build works
5. **Artifact** - Upload coverage HTML report

**Runtime:** ~2-3 minutes

---

## Codecov Features

### 1. PR Comments

Codecov automatically comments on PRs with:
- Coverage changes (e.g., `+2.5%` or `-1.2%`)
- Diff coverage (coverage of changed lines)
- Visual coverage sunburst chart

**Example:**
```
Coverage: 74.21% (+0.5%)
Diff coverage: 89.3%
Files changed: 3

✅ Coverage increased!
```

### 2. Coverage Badges

Add to README.md:
```markdown
[![codecov](https://codecov.io/gh/NickB03/llm-chat-site/branch/main/graph/badge.svg)](https://codecov.io/gh/NickB03/llm-chat-site)
```

### 3. Coverage Trends

View coverage history at:
```
https://codecov.io/gh/NickB03/llm-chat-site
```

**Features:**
- Line charts showing coverage over time
- File-level coverage drilldown
- Commit-level coverage changes
- Coverage sunburst visualization

### 4. GitHub Checks Integration

Codecov integrates with GitHub's Checks API:
- ✅ Green check if coverage meets threshold
- ❌ Red X if coverage drops too much
- Blocks merge if configured

---

## Manual Configuration (Alternative)

If the automated script fails, configure manually:

### Step 1: Branch Protection via GitHub UI

1. Go to: `https://github.com/NickB03/llm-chat-site/settings/branches`
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require status checks to pass before merging
     - Search and add: `quality`
   - ✅ Require pull request reviews before merging
     - Required approvals: `1`
     - Dismiss stale reviews: ✅
   - ✅ Do not allow bypassing the above settings
   - ✅ Restrict who can push to matching branches: (leave empty)
   - ✅ Allow force pushes: ❌
   - ✅ Allow deletions: ❌
5. Click **Create** or **Save changes**

### Step 2: Verify Protection

```bash
# This should fail
git push origin main --force
# Error: protected branch main

# This should work
git push origin feature/my-branch
```

---

## Troubleshooting

### "quality check not found"

**Problem:** GitHub Actions workflow not running

**Solution:**
1. Go to Actions tab: `https://github.com/NickB03/llm-chat-site/actions`
2. Enable workflows if disabled
3. Re-run the workflow manually

### "Codecov token invalid"

**Problem:** Wrong token or not set

**Solution:**
1. Regenerate token at: `https://codecov.io/gh/NickB03/llm-chat-site/settings`
2. Update GitHub secret: `CODECOV_TOKEN`
3. Re-run workflow

### "Coverage decreased" but tests pass

**Problem:** New code lacks tests

**Solution:**
1. Check Codecov PR comment for affected files
2. Add tests for uncovered lines
3. Push update to PR

### Cannot merge PR

**Problem:** Required checks not passing

**Solution:**
1. Click "Details" next to failed check
2. Fix the issue (failing tests, coverage drop, etc.)
3. Push fix to PR branch
4. Wait for checks to re-run

---

## Best Practices

### For Developers

1. **Always create branches**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Write tests for new code**
   - Aim for 75%+ coverage on new code
   - Run `npm run test:coverage` locally

3. **Check CI before requesting review**
   - Ensure all checks pass
   - Review coverage changes
   - Fix any issues

4. **Request reviews early**
   - Don't wait until PR is "perfect"
   - Get feedback on approach

### For Reviewers

1. **Check Codecov report**
   - Verify coverage didn't drop significantly
   - Look for untested critical paths

2. **Run tests locally** (for complex changes)
   ```bash
   git fetch origin pull/123/head:pr-123
   git checkout pr-123
   npm install
   npm run test
   ```

3. **Approve only when ready**
   - All checks passing
   - Code quality acceptable
   - Tests comprehensive

---

## Maintenance

### Updating Coverage Thresholds

As coverage improves, increase thresholds:

**Edit `codecov.yml`:**
```yaml
coverage:
  status:
    project:
      default:
        target: 75%  # Increase from 70%
```

**Edit `vitest.config.ts`:**
```typescript
thresholds: {
  statements: 60,  // Increase from 55
  branches: 55,    // Increase from 50
  functions: 60,   // Increase from 55
  lines: 60        // Increase from 55
}
```

### Updating Protection Rules

**Via Script:**
```bash
./scripts/setup-branch-protection.sh
```

**Via GitHub UI:**
1. Go to: `https://github.com/NickB03/llm-chat-site/settings/branches`
2. Click **Edit** next to `main` protection rule
3. Update settings
4. Click **Save changes**

---

## References

- **GitHub Branch Protection:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- **Codecov Documentation:** https://docs.codecov.com/docs
- **GitHub Actions:** https://docs.github.com/en/actions
- **Vitest Coverage:** https://vitest.dev/guide/coverage.html

---

## Summary

**✅ Setup Complete When:**
- Branch protection rules are active
- Codecov token is configured
- GitHub Actions runs on PRs
- Coverage reports appear on PRs
- Cannot force push to `main`

**🎯 Goals Achieved:**
- Prevent broken code from merging
- Track coverage trends over time
- Enforce code review process
- Automate quality gates
- Visualize test coverage

---

*Last Updated: 2025-11-14*
