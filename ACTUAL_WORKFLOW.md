# The Actual Workflow: Claude Code + Lovable

## 🎯 How It Really Works

Based on your clarification, here's the **actual** workflow:

### Lovable's Behavior
- ✅ Lovable has **working branch** setting in project settings
- ✅ Lovable commits directly to whatever branch is set
- ✅ No PR/branch option in Lovable itself
- ✅ Preview is FREE (no credits used)
- ✅ "Publish" button deploys to production (www.vana.bot)

### Your Workflow Goal
```
Claude Code (local dev)
    ↓
Feature branch
    ↓
Lovable (switch to feature branch)
    ↓
Preview (free, test changes)
    ↓
Merge to main
    ↓
Lovable "Publish" → www.vana.bot
```

---

## ✅ The Complete Safe Workflow

### Scenario A: Claude Code Development (Frontend/Edge Functions)

**When you want to develop locally and test backend:**

```bash
# 1. Create feature branch
git checkout -b feature/chat-export

# 2. Develop locally with local backend
npm run dev:local
# - Edit frontend: src/components/
# - Edit edge functions: supabase/functions/
# - Test locally with YOUR dev Supabase
# - Iterate until working

# 3. Commit to feature branch
git add .
git commit -m "feat: add chat export (tested locally)"

# 4. Push feature branch
git push origin feature/chat-export

# 5. Switch Lovable to feature branch
# Lovable Dashboard → Project Settings → Working Branch → feature/chat-export

# 6. Preview the changes (FREE)
# Visit preview URL (no credits used)
# Test with Lovable Cloud backend
# Verify everything works

# 7. If working, merge to main
git checkout main
git pull origin main
git merge feature/chat-export
git push origin main

# 8. Switch Lovable back to main
# Lovable Dashboard → Project Settings → Working Branch → main

# 9. Click "Publish" in Lovable
# Deploys to www.vana.bot
```

---

### Scenario B: Lovable AI Development (Backend Changes)

**When you want Lovable AI to make backend changes:**

```bash
# 1. Create feature branch locally
git checkout -b feature/add-tags
git push origin feature/add-tags

# 2. Switch Lovable to feature branch
# Lovable Dashboard → Project Settings → Working Branch → feature/add-tags

# 3. Ask Lovable AI for backend changes
# Lovable.dev chat: "Add tags array field to chat_sessions table"
# Lovable commits directly to feature/add-tags

# 4. Preview the changes (FREE)
# Check preview URL
# Test the new backend feature

# 5. Pull changes locally
git pull origin feature/add-tags

# 6. Add frontend code in Claude Code
npm run dev:local
# Use the new backend feature in UI
# Test locally

# 7. Commit frontend changes
git add .
git commit -m "feat: add tags UI"
git push origin feature/add-tags

# 8. Preview again (FREE)
# Test complete feature

# 9. Merge to main
git checkout main
git merge feature/add-tags
git push origin main

# 10. Switch Lovable back to main
# Lovable Dashboard → Working Branch → main

# 11. Click "Publish" in Lovable
# Live at www.vana.bot
```

---

### Scenario C: Hybrid Development (Both Tools)

**Complex feature using both Claude Code and Lovable:**

```bash
# 1. Create feature branch
git checkout -b feature/image-editing
git push origin feature/image-editing

# 2. Switch Lovable to feature branch
# Project Settings → Working Branch → feature/image-editing

# 3. Backend: Ask Lovable AI
# "Create edge function for image editing with Gemini"
# Lovable commits to feature/image-editing

# 4. Pull backend changes
git pull origin feature/image-editing

# 5. Frontend: Develop in Claude Code
npm run dev:local
# Create src/components/ImageEditor.tsx
# Wire up to new edge function
# Test locally

# 6. Commit frontend
git add .
git commit -m "feat: image editor UI"
git push origin feature/image-editing

# 7. Preview complete feature (FREE)
# Test at preview URL

# 8. Iterate if needed
# Fix issues locally or via Lovable
# Push changes to feature branch
# Preview again

# 9. When perfect, merge to main
git checkout main
git merge feature/image-editing
git push origin main

# 10. Switch Lovable to main
# Working Branch → main

# 11. Publish to production
# Click "Publish" → www.vana.bot
```

---

## 🔑 Key Insights

### Lovable Working Branch Setting

**This is the key to safe development!**

```
Lovable Project Settings → Working Branch:

Options:
- main (production)
- feature/your-branch (safe development)
- dev (staging, if you use it)
```

**How it works:**
- Lovable commits to whatever branch is set
- You can preview any branch (FREE)
- Only "Publish" from main goes to www.vana.bot

---

### Preview vs Publish

**Preview (FREE):**
- Any branch can be previewed
- No credits used
- Test changes safely
- Separate environment

**Publish (Production):**
- Click "Publish" button
- Deploys to www.vana.bot
- Only do this from main branch
- When feature is tested

---

## 📋 Checklist Workflow

### Starting New Feature

- [ ] Create feature branch: `git checkout -b feature/name`
- [ ] Push to origin: `git push origin feature/name`
- [ ] Switch Lovable working branch: Project Settings → feature/name
- [ ] Develop (Claude Code or Lovable or both)
- [ ] Preview changes (FREE, verify working)

### During Development

**For Claude Code work:**
- [ ] Develop locally: `npm run dev:local`
- [ ] Test with local backend (YOUR dev Supabase)
- [ ] Commit to feature branch
- [ ] Push to feature branch
- [ ] Preview (FREE)

**For Lovable work:**
- [ ] Ensure Lovable is on feature branch
- [ ] Ask Lovable AI for changes
- [ ] Lovable commits to feature branch
- [ ] Preview (FREE)
- [ ] Pull locally if continuing in Claude Code

### Deploying to Production

- [ ] Feature is tested in preview
- [ ] Merge to main: `git merge feature/name`
- [ ] Push main: `git push origin main`
- [ ] Switch Lovable to main: Working Branch → main
- [ ] Click "Publish" in Lovable
- [ ] Verify at www.vana.bot

---

## 🛡️ Safety Rules

### Rule 1: Keep Lovable on Feature Branch During Development

```
❌ BAD:
Lovable on main → Make changes → Commits to main → Risky!

✅ GOOD:
Lovable on feature branch → Make changes → Commits to feature → Safe!
```

---

### Rule 2: Only Publish from Main

```
❌ BAD:
Feature branch → Click "Publish" → Untested code to production

✅ GOOD:
Test feature branch → Merge to main → Switch Lovable to main → Publish
```

---

### Rule 3: Preview Before Merging

```
Always preview feature branch first (FREE)
Test thoroughly
Then merge to main
```

---

### Rule 4: Coordinate Lovable Branch Setting

```
Before asking Lovable AI:
1. Check which branch Lovable is on
2. Switch to feature branch if needed
3. Then ask Lovable to make changes
```

---

## 💰 Credit Usage

### What Uses Lovable Credits

**Lovable AI changes:**
- Database schema changes (via Lovable AI)
- Edge function creation (via Lovable AI)
- Backend integrations (via Lovable AI)

**These use credits regardless of branch**

---

### What's FREE

**Preview deployments:**
- Any branch can be previewed
- No credits for previewing
- Test as much as you want

**Git operations:**
- Switching working branch (FREE)
- Committing (FREE)
- Pushing (FREE)
- Merging (FREE)

**Publishing:**
- Click "Publish" (FREE - just deploys what's already there)

---

### Credit Savings Strategy

**Old approach (expensive):**
```
Main branch → Lovable AI change → Test → Fix → Test → Fix
= Multiple AI requests = More credits
```

**New approach (cheaper):**
```
Feature branch → Develop locally (FREE) → Test locally (FREE) →
Push to feature → Preview (FREE) →
Ask Lovable AI once when ready (1 credit) →
Preview again (FREE) → Merge → Publish
= Fewer AI requests = Fewer credits
```

---

## 🔄 Daily Workflow Examples

### Example 1: Quick Frontend Change (Claude Code Only)

```bash
# Morning
git checkout -b feature/fix-button
npm run dev:local
# Fix button styling
git commit -m "fix: button alignment"
git push origin feature/fix-button

# Switch Lovable to feature branch
# Preview (FREE) - looks good!

# Merge
git checkout main
git merge feature/fix-button
git push

# Switch Lovable to main → Publish
# Live on www.vana.bot
```

**Time: 15 minutes**
**Credits: 0 (no Lovable AI used)**

---

### Example 2: Backend Change (Lovable AI)

```bash
# Create feature branch
git checkout -b feature/add-favorites
git push origin feature/add-favorites

# Switch Lovable to feature/add-favorites
# Ask Lovable AI: "Add favorites feature to database"
# Lovable commits to feature branch

# Preview (FREE) - test the new field
# Pull locally
git pull origin feature/add-favorites

# Add UI in Claude Code
npm run dev:local
# Create favorites button
git commit -m "feat: favorites UI"
git push origin feature/add-favorites

# Preview (FREE) - complete feature works!

# Merge to main
git checkout main
git merge feature/add-favorites
git push

# Switch Lovable to main → Publish
```

**Time: 30 minutes**
**Credits: 1 (one Lovable AI request)**

---

### Example 3: Complex Feature (Both Tools)

```bash
# Day 1: Setup
git checkout -b feature/chat-templates
git push origin feature/chat-templates

# Switch Lovable to feature/chat-templates
# Ask Lovable AI: "Create template system for chats"
# Lovable creates database tables + edge functions

# Day 2: Frontend
git pull origin feature/chat-templates
npm run dev:local
# Build template UI with Claude Code
# Test locally with YOUR dev Supabase
git commit -m "feat: template UI"
git push origin feature/chat-templates

# Preview (FREE) - test with Lovable backend

# Day 3: Refinements
# Fix issues locally
# Preview again (FREE)
# Iterate until perfect

# Day 4: Deploy
git checkout main
git merge feature/chat-templates
git push

# Switch Lovable to main → Publish
```

**Time: 4 days**
**Credits: 1-2 (Lovable AI requests only)**
**Local testing: FREE**
**Preview testing: FREE**

---

## 🎯 Best Practices

### 1. Always Create Feature Branch First

```bash
# Start any work with:
git checkout -b feature/descriptive-name
git push origin feature/descriptive-name
```

---

### 2. Switch Lovable Branch Before AI Requests

```
Before asking Lovable AI:
1. Check Lovable working branch
2. Switch to your feature branch
3. Then ask Lovable for changes
```

---

### 3. Preview Early and Often (It's FREE!)

```
After any change:
1. Push to feature branch
2. Preview (no credits)
3. Catch issues early
4. Iterate quickly
```

---

### 4. Use Local Backend for Heavy Iteration

```
When developing:
1. Test locally first (YOUR dev Supabase)
2. Iterate quickly (FREE)
3. Push when working
4. Preview once (FREE)
5. Merge to main
```

---

### 5. Keep Lovable and Git in Sync

```
Before working:
1. Check Lovable working branch
2. Check your Git branch
3. Make sure they match!
```

---

## 📊 Tool Responsibilities

### Claude Code (Local Development)

**Use for:**
- ✅ Frontend components
- ✅ TypeScript/JavaScript code
- ✅ Styling and UI
- ✅ Edge function development
- ✅ Testing and iteration
- ✅ Code refactoring

**Benefits:**
- Instant feedback
- Local testing (FREE)
- No credits used
- Full control

---

### Lovable AI (Backend Integration)

**Use for:**
- ✅ Database schema changes
- ✅ Complex backend integration
- ✅ Edge function scaffolding
- ✅ Auth configuration
- ✅ Quick backend changes

**Benefits:**
- AI understands your backend
- Handles migrations
- Creates boilerplate
- Fast backend setup

---

### Lovable Preview (Testing)

**Use for:**
- ✅ Testing with Lovable Cloud backend
- ✅ Real environment testing
- ✅ Before merging to main
- ✅ Showing features to others

**Benefits:**
- FREE (no credits)
- Real backend
- Safe testing
- Shareable URL

---

### Lovable Publish (Deployment)

**Use for:**
- ✅ Deploying to www.vana.bot
- ✅ Production releases
- ✅ Only from main branch

**Benefits:**
- One-click deployment
- Managed hosting
- Automatic updates

---

## ⚠️ Common Pitfalls

### Pitfall 1: Lovable on Wrong Branch

**Problem:**
```
You're working on feature/new-feature
Lovable is on main
You ask Lovable AI to make changes
Lovable commits to main (production!)
```

**Solution:**
```
Always check Lovable working branch before AI requests!
Switch to feature branch first
```

---

### Pitfall 2: Forgetting to Merge

**Problem:**
```
Feature branch is tested
You click "Publish" from feature branch
Untested code might go to production
```

**Solution:**
```
Always merge to main first
Then switch Lovable to main
Then publish
```

---

### Pitfall 3: Not Using Local Backend

**Problem:**
```
Make changes in Claude Code
Push to feature branch every time
Preview every time
Slow iteration
```

**Solution:**
```
Use local backend (YOUR dev Supabase)
Test locally first (FREE, fast)
Push when working
Preview once
```

---

## ✅ Quick Reference

### Branch Management

```bash
# Create feature branch
git checkout -b feature/name
git push origin feature/name

# Switch Lovable
Project Settings → Working Branch → feature/name

# When done
git checkout main
git merge feature/name
git push

# Switch Lovable back
Working Branch → main

# Publish
Click "Publish" button
```

---

### Local Development

```bash
# Frontend + Local Backend
npm run dev:local

# Frontend + Production Backend
npm run dev
```

---

### Lovable Settings

```
Project Settings:
├── Working Branch: [Select branch]
├── Preview URL: [Auto-generated per branch]
└── Publish: [Deploys to www.vana.bot from main]
```

---

## 🎉 Summary

**Your Actual Workflow:**

1. **Create feature branch** (`git checkout -b feature/name`)
2. **Switch Lovable** to feature branch (Project Settings)
3. **Develop:**
   - Claude Code: Local testing with YOUR dev Supabase (FREE)
   - Lovable AI: Backend changes (credits used)
4. **Preview:** Test feature branch (FREE)
5. **Iterate:** Until working perfectly
6. **Merge:** To main (`git merge feature/name`)
7. **Switch Lovable** to main
8. **Publish:** Click button → www.vana.bot

**Key Benefits:**
- ✅ Safe development (feature branches)
- ✅ Free local testing (YOUR dev Supabase)
- ✅ Free preview testing (Lovable preview)
- ✅ Save Lovable credits (test locally first)
- ✅ Production protection (only publish from main)

---

**This matches your actual setup! Want to practice this workflow?** 🚀
