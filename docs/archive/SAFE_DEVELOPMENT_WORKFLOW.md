# Safe Development Workflow: Prevent Breaking Production

## 🎯 Your Critical Question

**The concern:**
```
Local edge functions → Commit to main → Lovable sees changes → Auto-deploys → Breaks production?
```

**You're absolutely right to worry about this!**

---

## ⚠️ How Lovable Deployment Works

### What Lovable Watches

```
Your Git Repository:
├── main branch         ← Lovable watches THIS for production
├── feature branches    ← Lovable creates PREVIEW deployments
└── dev branch          ← Lovable creates STAGING deployment
```

### Auto-Deployment Rules

**Lovable automatically deploys when:**

1. **Push to `main` branch** → Production deployment
2. **Push to feature branch** → Preview deployment (separate URL)
3. **Push to `dev` branch** → Staging deployment (if configured)

**Key insight:** Lovable deploys **whatever is in the branch**, including edge functions!

---

## ✅ The Safe Strategy: Git Branch Workflow

### Rule #1: NEVER Commit Untested Code to Main

```
❌ BAD WORKFLOW:
1. Edit edge function locally
2. Commit to main
3. Push
4. Lovable deploys
5. Production breaks!

✅ GOOD WORKFLOW:
1. Create feature branch
2. Edit edge function locally
3. Test with local backend
4. Commit to feature branch
5. Push feature branch
6. Test Lovable preview
7. Merge to main when verified
8. Production gets working code!
```

---

## 🏗️ The Complete Safe Workflow

### Phase 1: Local Development (FREE, Safe)

```bash
# 1. Create feature branch
git checkout -b feature/chat-export

# 2. Start local backend
npm run dev:local

# 3. Develop and test
# - Edit edge functions
# - Edit frontend
# - Test everything locally
# - Iterate until working

# 4. Commit to feature branch (NOT main!)
git add .
git commit -m "feat: add chat export (tested locally)"

# 5. Push feature branch
git push origin feature/chat-export
```

**At this point:**
- ✅ Production (main) is untouched
- ✅ Your changes are saved
- ✅ Lovable creates a PREVIEW deployment
- ✅ No production impact!

---

### Phase 2: Preview Testing (Lovable Preview Environment)

```
After pushing feature branch:

1. Lovable creates preview URL:
   https://feature-chat-export.lovable.app
   (or similar preview URL)

2. Test in preview environment:
   - Real Lovable Cloud backend
   - Your new edge functions deployed to PREVIEW only
   - Separate from production
   - Safe to break!

3. If it works:
   → Proceed to Phase 3

4. If it breaks:
   → Fix locally (Phase 1)
   → Push to feature branch again
   → Test preview again
   → Repeat until working
```

**Production still untouched!** ✅

---

### Phase 3: Merge to Production (When Ready)

```bash
# Only when preview is tested and working:

# 1. Switch to main
git checkout main

# 2. Pull latest (in case others pushed)
git pull origin main

# 3. Merge your feature
git merge feature/chat-export

# 4. Push to main
git push origin main

# 5. Lovable deploys to PRODUCTION
# Feature is now live for all users
```

**Now production gets the working code!**

---

## 🔒 Production Safety Rules

### Rule 1: Feature Branches for Everything

```bash
# Always start new work with a branch
git checkout -b feature/my-feature

# NEVER:
git checkout main
# edit files
git commit
git push  # ❌ This breaks production!
```

---

### Rule 2: Test Locally First

```bash
# Before pushing ANYTHING:
npm run dev:local

# Test:
# - Edge functions work?
# - Frontend works?
# - No errors?

# Then and only then:
git push origin feature/my-feature
```

---

### Rule 3: Use Preview Deployments

```
Push to feature branch
    ↓
Lovable creates preview
    ↓
Test preview thoroughly
    ↓
If working → Merge to main
If broken → Fix and push to feature again
```

---

### Rule 4: Small, Tested Changes

```
Good: Small feature, well tested, single purpose
Bad: Massive changes, multiple features, untested
```

---

## 📋 Branch Strategy

### Branch Types

```
main
├── Production code ONLY
├── Always deployable
├── Lovable auto-deploys here
└── Protected: Only merge tested code

feature/feature-name
├── Work in progress
├── Safe to break
├── Lovable creates preview
└── Test here before merging

dev (optional)
├── Integration branch
├── Lovable staging environment
└── Merge features here first, then to main
```

---

## 🔄 Complete Example Workflow

### Scenario: Add Image Editing Feature

**Week 1: Local Development**

```bash
# Day 1: Start feature
git checkout -b feature/image-editing
npm run dev:local

# Day 2-3: Develop locally
# Edit: supabase/functions/edit-image/index.ts
# Edit: src/components/ImageEditor.tsx
# Test locally, iterate

# Day 4: Works locally!
git add .
git commit -m "feat: image editing working locally"
git push origin feature/image-editing
```

**At this point:**
- ✅ Production unchanged
- ✅ Code saved in Git
- ✅ Lovable creates preview

---

**Week 2: Preview Testing**

```
# Day 5: Test Lovable preview
Visit: https://feature-image-editing.lovable.app

Test:
- Sign up
- Upload image
- Edit image
- Verify edge function works

Find bug: Image too large crashes function
```

**Fix the bug:**

```bash
# Still on feature/image-editing branch
# Edit function to handle large images
npm run dev:local
# Test fix locally
git commit -m "fix: handle large images"
git push origin feature/image-editing

# Lovable updates preview automatically
# Test again: Works now!
```

---

**Week 2: Deploy to Production**

```bash
# Day 6: Preview works perfectly!
# Merge to production:

git checkout main
git pull origin main
git merge feature/image-editing
git push origin main

# Lovable deploys to production
# Feature is live!

# Optional: Delete feature branch
git branch -d feature/image-editing
git push origin --delete feature/image-editing
```

**Production now has the working feature!**

---

## 💡 Advanced: Local-Only Testing Files

### Keep Test Files Out of Production

**Create `.gitignore` entries for test files:**

```bash
# .gitignore (add these)

# Local testing only
supabase/.env.local
.env.local

# Test data
test-data/
*.test.ts
*.spec.ts
```

---

### Development vs Production Edge Functions

**Option: Conditional logic in edge functions:**

```typescript
// supabase/functions/chat/index.ts

const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';

if (isDevelopment) {
  console.log('Running in development mode');
  // Extra logging
  // Test data
  // Relaxed validation
}

// Production code
```

**Set environment:**
```bash
# Local: supabase/.env.local
ENVIRONMENT=development

# Production: Lovable dashboard
ENVIRONMENT=production
```

---

## 🚨 What If You Accidentally Push to Main?

### Emergency Rollback

**If you pushed broken code to main:**

```bash
# Option 1: Revert the commit
git revert HEAD
git push origin main

# Lovable redeploys (without broken code)
# Production restored!
```

**Option 2: Roll back to previous commit**

```bash
# Find last working commit
git log --oneline

# Reset to that commit
git reset --hard <commit-hash>

# Force push (use with caution!)
git push origin main --force

# Lovable redeploys previous version
# Production restored!
```

**Option 3: Use Lovable's rollback feature**

```
1. Open Lovable dashboard
2. Go to: Deployments
3. Click: Previous deployment
4. Click: "Restore this version"
```

---

## 📊 Workflow Comparison

### Without Branches (DANGEROUS)

```
Edit code → Commit to main → Push → Production breaks ❌

Problems:
- No testing phase
- Instant production impact
- Hard to rollback
- Scary to develop
```

### With Branches (SAFE)

```
Create branch → Edit code → Test locally → Push feature →
Test preview → Merge to main → Production updated ✅

Benefits:
- Test before production
- Preview environment
- Easy rollback
- Safe to experiment
```

---

## 🎯 Best Practices Summary

### Do ✅

1. **Always use feature branches**
   ```bash
   git checkout -b feature/name
   ```

2. **Test locally first**
   ```bash
   npm run dev:local
   ```

3. **Push to feature branch**
   ```bash
   git push origin feature/name
   ```

4. **Test Lovable preview**
   ```
   Visit preview URL
   Verify everything works
   ```

5. **Merge to main when ready**
   ```bash
   git checkout main
   git merge feature/name
   git push
   ```

6. **Small, focused changes**
   - One feature per branch
   - Test thoroughly
   - Merge quickly

---

### Don't ❌

1. **Never commit directly to main**
   ```bash
   # ❌ Don't do this:
   git checkout main
   # edit files
   git push
   ```

2. **Don't push untested code**
   ```bash
   # Test locally first!
   npm run dev:local
   ```

3. **Don't merge without preview testing**
   ```
   Always test the preview deployment
   ```

4. **Don't make massive changes**
   ```
   Small changes = safer
   ```

5. **Don't skip commits**
   ```
   Commit often
   Each commit = save point
   ```

---

## 🔧 Git Configuration for Safety

### Protect Main Branch (Optional)

**In GitHub settings:**

```
Repository → Settings → Branches → Branch protection rules

Add rule for main:
☑ Require pull request reviews before merging
☑ Require status checks to pass
☑ Require branches to be up to date
☐ Include administrators (if you want)
```

**This forces you to use feature branches!**

---

### Pre-commit Hooks (Optional)

**Install husky for pre-commit checks:**

```bash
npm install --save-dev husky

# Add to package.json:
{
  "scripts": {
    "prepare": "husky install"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint"
    }
  }
}
```

**Prevents committing broken code!**

---

## 📚 Quick Reference

### Starting New Feature

```bash
git checkout -b feature/my-feature
npm run dev:local
# develop and test
git add .
git commit -m "feat: description"
git push origin feature/my-feature
```

### Testing in Preview

```
1. Push to feature branch
2. Lovable creates preview URL
3. Test preview thoroughly
4. Fix issues if needed
5. Push fixes to feature branch
6. Test again
```

### Deploying to Production

```bash
git checkout main
git pull origin main
git merge feature/my-feature
git push origin main
# Lovable deploys to production
```

### Emergency Rollback

```bash
git revert HEAD
git push origin main
# Or use Lovable dashboard restore
```

---

## ✅ Your Questions Answered

### Q: "If I commit edge functions, does it break prod?"

**A:** Only if you commit to `main` branch!

**Safe way:**
```bash
# Commit to feature branch (safe)
git checkout -b feature/my-feature
git commit
git push origin feature/my-feature  # ✅ Production safe!

# Only affects production when:
git checkout main
git merge feature/my-feature
git push origin main  # ← This deploys to production
```

---

### Q: "How do I test edge functions without deploying?"

**A:** Use local backend!

```bash
# Test locally (no deployment)
npm run dev:local
# Edge functions run on localhost:54321
# No Git push needed
# Completely local

# When working:
git push origin feature/name  # Preview only
# Test preview
git merge to main  # Production deployment
```

---

### Q: "Can I develop without fear of breaking prod?"

**A:** Yes! With this workflow:

1. **Always use feature branches** ✅
2. **Test locally first** ✅
3. **Use preview deployments** ✅
4. **Merge to main only when tested** ✅

**Result:** Production is always protected!

---

## 🎉 Summary

### The Safe Workflow

```
1. Create feature branch (git checkout -b feature/name)
   ↓
2. Develop locally (npm run dev:local)
   ↓
3. Test locally (iterate until working)
   ↓
4. Push to feature branch (git push origin feature/name)
   ↓
5. Test Lovable preview (separate from production)
   ↓
6. Merge to main (git merge)
   ↓
7. Production deployment (Lovable auto-deploys)
   ↓
8. Success! (Production gets tested code)
```

### Key Principles

1. **main branch = production** (always deployable)
2. **feature branches = safe testing** (preview deployments)
3. **Local first** (test before pushing)
4. **Preview second** (test before merging)
5. **Production last** (merge only when verified)

---

**With this workflow, you CANNOT accidentally break production!** ✅

---

## 🚀 Next Steps

### Set Up Your Workflow

1. **Create a feature branch now**
   ```bash
   git checkout -b feature/test-workflow
   ```

2. **Make a small change**
   ```bash
   # Edit something small
   # Test locally
   git commit -m "test: workflow"
   ```

3. **Push to feature branch**
   ```bash
   git push origin feature/test-workflow
   ```

4. **Check Lovable for preview URL**
   ```
   Should create preview deployment
   Test it!
   ```

5. **Merge to main when ready**
   ```bash
   git checkout main
   git merge feature/test-workflow
   git push origin main
   ```

**Now you know the safe workflow!**

---

**Want me to walk you through creating your first feature branch?** 🎯
