# Going Public: Security & Privacy Checklist

**Generated**: 2025-12-20
**Status**: 🔴 NOT READY - Critical issues must be resolved before going public

---

## Executive Summary

This document outlines all changes required before transitioning from a private to public GitHub repository. The analysis found **critical security issues** that would expose production API keys if the repository went public without remediation.

### Priority Legend
- 🔴 **CRITICAL** - Must fix before going public (security/legal risk)
- 🟠 **HIGH** - Strongly recommended before going public
- 🟡 **MEDIUM** - Should address but won't block
- 🟢 **LOW** - Nice to have

---

## 🔴 CRITICAL: Secrets in Git History

### The Problem

The file `supabase/.env.local.backup` was committed to git on December 18, 2025 (commit `8886bcb`) and contains **real production API keys**:

| Secret | Value (First 20 chars) | Risk |
|--------|------------------------|------|
| GLM_API_KEY | `28e74695852e450b9f...` | Full Z.ai API access |
| OPENROUTER_GEMINI_FLASH_KEY | `sk-or-v1-7beee8c8...` | OpenRouter billing |
| OPENROUTER_GEMINI_IMAGE_KEY | `sk-or-v1-7beee8c8...` | OpenRouter billing |
| GOOGLE_KEY_1 | `AIzaSyCGK4dDk8a-K1A...` | Google API billing |
| GOOGLE_KEY_2 | `AIzaSyBQX8mGS8xSv9U...` | Google API billing |
| GOOGLE_KEY_3 | `AIzaSyArU0XvHpQe1ca...` | Google API billing |
| TAVILY_API_KEY | `tvly-dev-175jffth...` | Tavily API access |

### Why This Is Catastrophic

Even if you delete the file now, **git history preserves it forever**. Anyone cloning the public repo can:
```bash
git log -p --all -S "sk-or-v1"  # Find all API keys instantly
```

### Required Actions

#### Option A: Fresh Repository (Recommended)

1. **Rotate ALL exposed keys immediately** (do this regardless of option chosen)
2. Create a new repository with no history
3. Copy current files (excluding secrets)
4. This guarantees no secrets leak

```bash
# Create fresh repo
mkdir llm-chat-site-public
cd llm-chat-site-public
git init
# Copy files from old repo (excluding .git, .env files, backups)
rsync -av --exclude='.git' --exclude='*.env*' --exclude='backups/' ../llm-chat-site/ .
git add .
git commit -m "Initial public release"
```

#### Option B: Rewrite Git History (Risky)

Use BFG Repo-Cleaner or `git filter-repo` to remove the file from history:

```bash
# Using BFG (faster, simpler)
bfg --delete-files .env.local.backup
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify cleanup
git log -p --all -S "sk-or-v1" | head -20  # Should return nothing
```

**Warning**: This rewrites all commit hashes. Anyone who has cloned the repo will have conflicts.

#### Regardless of Option: Rotate Keys NOW

Even for a private repo, these keys are compromised in git history:

| Service | Action | Dashboard |
|---------|--------|-----------|
| OpenRouter | Generate new API key | https://openrouter.ai/keys |
| Google AI Studio | Regenerate all 3 keys | https://makersuite.google.com/app/apikey |
| Z.ai (GLM) | Regenerate API key | https://z.ai/dashboard |
| Tavily | Regenerate API key | https://tavily.com/dashboard |

---

## 🔴 CRITICAL: Currently Tracked Secret Files

### Files with secrets currently in git:

| File | Status | Action Required |
|------|--------|-----------------|
| `supabase/.env.local.backup` | ⚠️ TRACKED with real keys | Remove from repo & history |
| `supabase/.env.local.template` | ✅ OK (placeholders only) | Keep |
| `.env.example` | ✅ OK (placeholders only) | Keep |

### Fix .gitignore Gaps

Add to `.gitignore`:
```gitignore
# Backup env files (prevent future accidents)
**/*.env.backup
**/.env.*.backup
supabase/.env.local.backup
```

---

## 🔴 CRITICAL: No Open Source License

### The Problem

The repository has **no LICENSE file**. Without a license:
- No one can legally use, modify, or distribute the code
- Contributors have no legal protection
- The project cannot be considered "open source"

### Required Action

Add a LICENSE file to the repository root. Recommended options:

| License | Best For | Key Terms |
|---------|----------|-----------|
| **MIT** | Maximum adoption | Very permissive, requires attribution |
| **Apache 2.0** | Enterprise use | Permissive + patent protection |
| **GPL-3.0** | Copyleft protection | Derivatives must also be open source |

**Recommended**: MIT License (most common for similar projects)

```bash
# Create MIT License
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 Nick Bohmer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

---

## 🟠 HIGH: Infrastructure Details Exposed

### Supabase Project ID

The production Supabase project ID `vznhbocnuykdmjvujaka` appears in **31+ files**:

| File | Line | Context |
|------|------|---------|
| `supabase/config.toml` | 1 | `project_id = "vznhbocnuykdmjvujaka"` |
| `README.md` | 477 | Production URL example |
| `AGENTS.md` | 656 | Production URL example |
| `CLAUDE.md` | 691+ | Docker container names |
| `index.html` | 41 | Preconnect hint |
| `docs/API_REFERENCE.md` | 4 | Base URL |
| `docs/TROUBLESHOOTING.md` | 45+ | Debug instructions |
| `scripts/backup-db.sh` | 11 | Default backup target |
| `.claude/*.md` | various | Development docs |

### Risk Assessment

- **Moderate**: Project ID is semi-public (appears in API URLs)
- **Concern**: Makes targeted attacks easier
- **Docker container names** reference the project ID

### Recommended Actions

1. **For config.toml**: Replace with placeholder for public repo
   ```toml
   project_id = "your-project-id"
   ```

2. **For documentation**: Use placeholders like `<your-project-ref>` or `example-project-id`

3. **For index.html**: Consider if preconnect is needed in source (it's also set dynamically)

---

## 🟠 HIGH: Hardcoded Admin Email

### Location

```typescript
// src/pages/AdminDashboard.tsx:104
const adminCheck = user?.email === 'nick@vana.bot' ||

// supabase/functions/admin-analytics/index.ts:36
const isAdmin = user.email === 'nick@vana.bot' ||
```

### Risk

- Exposes admin email address
- Email could be targeted for phishing
- Hard-coded values are bad practice

### Recommended Action

Move to environment variable or database configuration:

```typescript
// Better approach
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',');
const isAdmin = ADMIN_EMAILS.includes(user.email);
```

---

## 🟡 MEDIUM: Sensitive Documentation

### Files to Review

| File | Content | Action |
|------|---------|--------|
| `.claude/ANALYTICS_VIEWS_SECURITY_ASSESSMENT.md` | Security audit with project ID | Redact project ID |
| `RLS_POLICY_REMEDIATION_PLAN.md` | Security remediation details | Consider removing |
| `IMPLEMENTATION_PLAN_ISSUE_340_SECURE.md` | Security implementation details | Review for sensitive info |

### Internal Development Docs

The `.claude/` directory contains extensive development documentation. While not security-critical, consider:
- Are there any embarrassing comments?
- Any customer-specific information?
- Any abandoned ideas that could confuse contributors?

---

## 🟡 MEDIUM: Demo Videos

### Current State

`Demos/*.mp4` is in `.gitignore` but the directory structure suggests demo videos exist.

### Recommendation

- Ensure no demo videos show:
  - Production data
  - Admin interfaces with real data
  - API keys in console/network tabs
  - Personal information

---

## 🟢 LOW: Cleanup Recommendations

### Files to Review/Remove

| File/Pattern | Reason | Action |
|--------------|--------|--------|
| `ROADMAP.md` | Internal planning | Keep or update for public |
| `.claude/plans/*.md` | Implementation plans | Keep (shows project maturity) |
| `*.lovable-backup` | Legacy backups | Already gitignored ✅ |
| `backups/` | Database backups | Already gitignored ✅ |

### Repository Metadata Updates

For a public repository, update:

1. **README.md**
   - [ ] Remove internal setup instructions
   - [ ] Add contribution guidelines
   - [ ] Add code of conduct
   - [ ] Add security policy (SECURITY.md)

2. **package.json**
   - [ ] Verify `repository` field
   - [ ] Add `bugs` and `homepage` fields
   - [ ] Verify `author` field

3. **GitHub Settings** (after going public)
   - [ ] Add topics/tags
   - [ ] Configure issue templates
   - [ ] Set up branch protection for `main`
   - [ ] Configure Dependabot

---

## Pre-Flight Checklist

### Before Going Public

- [ ] **ROTATE ALL EXPOSED API KEYS** (critical - do this first!)
- [ ] Remove `supabase/.env.local.backup` from git history (Option A or B above)
- [ ] Add `supabase/.env.local.backup` to `.gitignore`
- [ ] Add LICENSE file (MIT recommended)
- [ ] Replace hardcoded Supabase project ID with placeholders
- [ ] Move admin email to environment variable
- [ ] Review and redact security documentation
- [ ] Add SECURITY.md with vulnerability reporting instructions
- [ ] Add CONTRIBUTING.md
- [ ] Update README.md for public audience
- [ ] Run final secret scan: `git log -p --all | grep -E "(sk-|AIza|tvly-)" | head -20`

### After Going Public

- [ ] Enable GitHub secret scanning
- [ ] Enable Dependabot security updates
- [ ] Set up branch protection rules
- [ ] Monitor for unexpected clones/forks

---

## Summary of Required Changes

| Priority | Issue | Effort | Impact if Ignored |
|----------|-------|--------|-------------------|
| 🔴 CRITICAL | Secrets in git history | 2-4 hours | API keys stolen, billing fraud |
| 🔴 CRITICAL | No LICENSE file | 5 minutes | No legal use rights |
| 🔴 CRITICAL | Tracked .env.backup file | 30 minutes | Active secret exposure |
| 🟠 HIGH | Project ID exposed | 1-2 hours | Targeted attacks easier |
| 🟠 HIGH | Hardcoded admin email | 30 minutes | Phishing target, bad practice |
| 🟡 MEDIUM | Sensitive docs | 1 hour | Potential embarrassment |
| 🟢 LOW | Repo polish | 2-3 hours | Less professional appearance |

**Estimated Total Effort**: 6-10 hours (assuming fresh repo approach)

---

## Questions Before Proceeding

1. **Fresh repo or history rewrite?** Fresh repo is safer but loses commit history.
2. **Which license?** MIT is most permissive, Apache 2.0 adds patent protection.
3. **Keep development docs?** `.claude/` directory shows project maturity but also internal thinking.
4. **Rename repository?** Current name `llm-chat-site` is generic; consider `vana` or similar.
