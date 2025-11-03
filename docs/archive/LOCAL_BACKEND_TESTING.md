# True Local Development: Test Backend Changes Locally

## 🎯 The Problem You Identified

**Current workflow issue:**
```
Change code in VSCode
  ↓
Push to GitHub
  ↓
Lovable pulls & deploys ($$$ credits)
  ↓
Test in Lovable
  ↓
Find bugs
  ↓
Repeat... (more credits burned)
```

**This is expensive and slow!**

---

## ✅ The Solution: Local Backend for Testing

**Better workflow:**
```
Change code in VSCode
  ↓
Test locally with LOCAL backend (FREE)
  ↓
Iterate until it works (FREE)
  ↓
When perfect, push ONCE to GitHub
  ↓
Lovable deploys ($ 1 credit only)
  ↓
Works first time!
```

**Save credits, save time, faster iteration!**

---

## 🏗️ Architecture: Dual Environment Setup

### Setup Overview

```
┌─────────────────────────────────────────────────┐
│     LOCAL DEVELOPMENT (Your Machine)           │
│                                                 │
│  VSCode + Claude Code                          │
│         ↓                                       │
│  localhost:8080 (Frontend)                     │
│         ↓                                       │
│  localhost:54321 (LOCAL Edge Functions)        │
│         ↓                                       │
│  YOUR Dev Supabase (Free Tier)                 │
│  - Test database                                │
│  - Test data                                    │
│  - Safe to break!                               │
└─────────────────────────────────────────────────┘
                   │
                   │ When ready, push
                   ↓
┌─────────────────────────────────────────────────┐
│     PRODUCTION (Lovable Cloud)                  │
│                                                 │
│  Lovable Cloud Supabase                        │
│  - Real users                                   │
│  - Production data                              │
│  - Stable, tested code only                     │
└─────────────────────────────────────────────────┘
```

### The Strategy

**Development:** Your own Supabase project (free tier)
- Test backend changes
- Experiment freely
- Break things safely
- No Lovable credits used

**Production:** Lovable Cloud (managed)
- Deploy only tested code
- Push once when it works
- Minimal Lovable credits

---

## 🚀 Setup Guide (One-Time, 30 Minutes)

### Step 1: Create Your Dev Supabase Project (5 min)

**Create a FREE development project:**

```
1. Visit: https://supabase.com/dashboard
2. Click: "New project"
3. Organization: Your personal org
4. Name: "my-app-local-dev" (or whatever you want)
5. Database Password: Choose a strong password
6. Region: Choose closest to you
7. Plan: Free (no credit card needed!)
8. Click: "Create new project"
9. Wait: ~2 minutes for project to initialize
```

**This is YOUR project for testing!**
- Free tier: Unlimited requests for development
- 500 MB database
- 1 GB file storage
- Perfect for local testing

---

### Step 2: Export Schema from Lovable (10 min)

**Get your current database schema:**

**Option A: Via Lovable AI (Easiest)**
```
1. Open Lovable.dev
2. Chat with Lovable AI:
   "Export the complete database schema as SQL including all tables, RLS policies, and functions"
3. Copy the SQL output
4. Save to: schema-export.sql
```

**Option B: Ask Lovable to show you tables**
```
Chat: "Show me all database tables and their schemas"
Manually recreate in SQL format
```

**What you need:**
- All table definitions
- All RLS policies
- All database functions
- All indexes

---

### Step 3: Import Schema to Your Dev Supabase (5 min)

**Apply the schema:**

```
1. Go to YOUR Dev Supabase Dashboard
2. Click: SQL Editor
3. Click: "New query"
4. Paste your exported schema SQL
5. Click: "Run"
6. Verify: Check Tables tab to see all tables created
```

**You now have a copy of your production schema!**

---

### Step 4: Add Sample Test Data (Optional, 5 min)

**Create test data for development:**

```sql
-- In SQL Editor, create test user and chats
INSERT INTO chat_sessions (id, user_id, title, created_at)
VALUES
  ('test-session-1', 'test-user-id', 'Test Chat 1', now()),
  ('test-session-2', 'test-user-id', 'Test Chat 2', now());

INSERT INTO chat_messages (session_id, role, content, created_at)
VALUES
  ('test-session-1', 'user', 'Hello, test message', now()),
  ('test-session-1', 'assistant', 'Test response', now());
```

**Now you have test data to work with!**

---

### Step 5: Configure Local Environment (5 min)

**Set up your local backend configuration:**

```bash
# Create local config
cp supabase/.env.local.example supabase/.env.local

# Edit the file
nano supabase/.env.local
```

**Add these values:**

```bash
# ============================================================================
# LOCAL DEVELOPMENT ENVIRONMENT
# ============================================================================

# AI Provider (for testing)
AI_PROVIDER=gemini

# Google Gemini API Keys (YOUR keys for testing)
GOOGLE_API_KEY=your_actual_gemini_chat_key
GOOGLE_IMAGE_API_KEY=your_actual_gemini_image_key

# Lovable API Key (keep for testing rollback)
LOVABLE_API_KEY=your_lovable_key

# YOUR DEV SUPABASE (from Step 1)
SUPABASE_URL=https://YOUR-DEV-PROJECT.supabase.co
SUPABASE_ANON_KEY=your_dev_anon_key

# Redis (OPTIONAL - can use dummy values for testing)
UPSTASH_REDIS_REST_URL=https://dummy-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=dummy_token

# Note: Edge functions will still work without real Redis
# They just won't cache (which is fine for testing)
```

**Where to find YOUR dev Supabase credentials:**
```
Your Dev Supabase Dashboard:
→ Settings
→ API
→ Copy: URL and anon/public key
```

---

### Step 6: Configure Frontend to Use Local Backend (2 min)

**Create .env.local for frontend:**

```bash
# Create frontend local config
cp .env .env.local

# Edit it
nano .env.local
```

**Add these values:**

```bash
# Point frontend to YOUR dev Supabase
VITE_SUPABASE_URL=https://YOUR-DEV-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_dev_anon_key

# Use local functions
VITE_USE_LOCAL_FUNCTIONS=true
```

**Now frontend talks to your local backend!**

---

### Step 7: Test Local Setup (3 min)

**Start everything locally:**

```bash
# Start local edge functions + frontend
npm run dev:local
```

**This starts:**
- Local edge functions on port 54321
- Frontend on port 8080
- Both using YOUR dev Supabase

**Check browser console:**
```
[API] Mode: LOCAL functions
[API] Functions URL: http://localhost:54321/functions/v1
```

**Test it works:**
1. Visit: http://localhost:8080
2. Sign up/login (creates user in YOUR dev DB)
3. Send chat message → Should get Gemini response
4. Check YOUR dev Supabase → Data is there!

**Success! You're running fully local!** ✅

---

## 🔄 Your New Workflow

### Daily Development (FREE, No Lovable Credits)

```bash
# 1. Start local backend + frontend
npm run dev:local

# 2. Make changes in VSCode
# - Edit components
# - Modify edge functions
# - Change logic
# - Break things (it's local!)

# 3. Test immediately
# Reload localhost:8080
# Changes take effect instantly
# No push, no deploy, no credits

# 4. Iterate quickly
# Change code → Save → Test → Repeat
# All on your machine
# Completely FREE

# 5. When it works perfectly
git add .
git commit -m "feat: tested and working feature"
git push

# 6. Lovable deploys (1 credit used)
# Works first time because you tested locally!
```

---

### Backend Changes (Edge Functions)

**Scenario: Add new edge function for chat export**

```bash
# 1. Running local backend
npm run dev:local

# 2. Create new function
mkdir supabase/functions/export-chat
nano supabase/functions/export-chat/index.ts

# 3. Write function code
# (I can help you with this!)

# 4. Test immediately
# Call from frontend: localhost:8080
# Function runs locally: localhost:54321
# Check logs in terminal

# 5. Iterate until perfect
# Edit function → Save → Test → Repeat
# See logs in real-time
# No deployment needed

# 6. When working, push ONCE
git push

# 7. Ask Lovable to implement
# Open Lovable.dev
# Chat: "I've created export-chat function, please deploy it"
# OR: Lovable auto-deploys from Git
```

---

### Frontend + Backend Changes

**Scenario: Add image editing feature**

```bash
# 1. Start local
npm run dev:local

# 2. Backend: Create edge function
# supabase/functions/edit-image/index.ts
# Implements Gemini image editing

# 3. Frontend: Create UI component
# src/components/ImageEditor.tsx
# Calls the edge function

# 4. Test together locally
# Both frontend and backend on your machine
# Iterate quickly
# Fix issues immediately

# 5. When both work perfectly
git push

# 6. Deploy to Lovable (1 push, minimal credits)
```

---

## 💰 Cost Comparison

### Old Workflow (Expensive)

```
10 iterations to get feature working
= 10 pushes to GitHub
= 10 Lovable deployments
= 10 credits burned
= Slow (wait for each deployment)
```

### New Workflow (Cheap)

```
10 iterations locally (FREE)
= 0 pushes during development
= 0 Lovable deployments
= 0 credits used
= Fast (instant feedback)

Then:
1 push when finished
= 1 Lovable deployment
= 1 credit used
= Feature works first time
```

**Savings: 90% less credits!**

---

## 🎯 When to Use Each Environment

### Use LOCAL Backend When:

✅ **Developing new features**
- Write code
- Test changes
- Iterate quickly
- Experiment freely

✅ **Testing edge functions**
- New API endpoints
- Backend logic changes
- Integrations
- Error handling

✅ **Learning and experimentation**
- Try new approaches
- Break things safely
- Test ideas
- Debug issues

✅ **Working on complex features**
- Need many iterations
- Unsure of approach
- Want fast feedback

---

### Use LOVABLE When:

✅ **Database schema changes**
- Add tables
- Modify columns
- Change RLS policies
- Lovable AI handles this better

✅ **Final deployment**
- Feature is tested and working
- Ready for production
- Push once

✅ **Quick backend changes**
- Simple modifications
- Lovable AI can do it fast
- Don't need local testing

✅ **Production data needed**
- Testing with real user data
- Production-only scenarios

---

## 🛠️ Advanced: Syncing Production Data (Optional)

### If You Need Real Data Locally

**Export from Lovable Cloud:**

```
1. Open Lovable.dev
2. Go to: Cloud → Database → Tables
3. For each table:
   - Click table
   - Click "Export CSV"
   - Save file
```

**Import to YOUR dev Supabase:**

```
1. Go to YOUR Dev Supabase
2. Table Editor
3. For each table:
   - Click table
   - Insert → Import data from CSV
   - Upload file
   - Import
```

**Now you have production data locally for testing!**

**Caution:**
- Only do this with anonymized/test data
- Don't put sensitive user data on dev machine
- Follow data privacy rules

---

## 🔧 Switching Between Environments

### Switch to Local Backend

```bash
# Edit .env.local
VITE_USE_LOCAL_FUNCTIONS=true
VITE_SUPABASE_URL=https://YOUR-DEV-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_dev_key

# Start local
npm run dev:local
```

### Switch to Production Backend

```bash
# Edit .env.local
VITE_USE_LOCAL_FUNCTIONS=false
VITE_SUPABASE_URL=https://xfwlneedhqealtktaacv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_prod_key

# Start frontend only
npm run dev
```

### Or Use Environment Scripts

**Create npm scripts for easy switching:**

```json
// package.json
"scripts": {
  "dev": "vite",
  "dev:local": "concurrently \"npm run supabase:serve\" \"cross-env VITE_USE_LOCAL_FUNCTIONS=true vite\"",
  "dev:prod": "cross-env VITE_USE_LOCAL_FUNCTIONS=false vite"
}
```

**Then:**
```bash
npm run dev:local   # Use local backend
npm run dev:prod    # Use production backend
```

---

## 📋 Local Development Checklist

### Initial Setup (One-time)
- [ ] Create dev Supabase project
- [ ] Export schema from Lovable
- [ ] Import schema to dev Supabase
- [ ] Add test data
- [ ] Configure supabase/.env.local
- [ ] Configure .env.local
- [ ] Test local setup works

### Daily Workflow
- [ ] Start: `npm run dev:local`
- [ ] Develop and test locally
- [ ] Iterate until working
- [ ] Push to Git ONCE
- [ ] Lovable deploys
- [ ] Verify in production

---

## 💡 Pro Tips

### 1. Keep Dev DB in Sync

**Periodically update your dev schema:**
```
Every few weeks:
1. Export schema from Lovable
2. Drop dev database
3. Recreate with new schema
4. Or run migrations manually
```

### 2. Use Git Branches

**Feature branches work great with local testing:**
```bash
git checkout -b feature/export
# Develop locally
# Test thoroughly
# Push when done
git push origin feature/export
# Lovable creates preview
# Merge to main when approved
```

### 3. Monitor Local Function Logs

**Terminal shows real-time logs:**
```
[chat] Request received
[chat] Using AI provider: gemini
[chat] Generating response...
[chat] Response sent
```

**Debug easily without Lovable!**

### 4. Test Both Providers Locally

**Switch between Gemini and Lovable:**
```bash
# Edit supabase/.env.local
AI_PROVIDER=gemini    # Test Gemini
AI_PROVIDER=lovable   # Test Lovable

# Restart functions
# Ctrl+C and npm run dev:local
```

**Test both before pushing!**

---

## ⚠️ Important Notes

### Your Dev Supabase is NOT Production

**Remember:**
- Separate database
- Separate users
- Test data only
- Safe to break
- Free tier

**Production (Lovable Cloud):**
- Real users
- Real data
- Must be stable
- Costs credits

**Never confuse the two!**

---

### Supabase Free Tier Limits

**Your dev project has:**
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 50,000 monthly active users
- ✅ 500,000 edge function invocations
- ✅ Unlimited API requests

**More than enough for testing!**

---

## 🎉 Benefits Summary

### What You Get

✅ **Save Lovable Credits**
- Test locally (FREE)
- Push once when done (1 credit)
- 90% credit savings

✅ **Faster Development**
- Instant feedback
- No wait for deployment
- Rapid iteration

✅ **Safe Experimentation**
- Break things locally
- No production impact
- Learn freely

✅ **Full Control**
- See function logs
- Debug easily
- Test both AI providers
- Modify anything

✅ **Better Testing**
- Test complete features
- Frontend + backend together
- Catch bugs before production

---

## 🚀 Ready to Set Up?

### Quick Start

```bash
# 1. Create dev Supabase project (5 min)
Visit: https://supabase.com/dashboard
Create: "my-app-local-dev"

# 2. Get schema from Lovable (2 min)
Ask Lovable AI: "Export database schema"

# 3. Import to dev Supabase (2 min)
SQL Editor → Paste → Run

# 4. Configure local env (3 min)
cp supabase/.env.local.example supabase/.env.local
# Add your dev Supabase credentials

cp .env .env.local
# Add your dev Supabase URL

# 5. Test it works! (2 min)
npm run dev:local
# Visit localhost:8080
# Try chat, check console

# Total: 15 minutes setup
# Result: Save 90% of Lovable credits forever!
```

---

## 📚 Quick Reference

### Commands
```bash
npm run dev:local    # Local backend + frontend
npm run dev:prod     # Production backend + frontend
npm run dev          # Production backend (default)
```

### Environment Variables
```bash
# supabase/.env.local (backend)
AI_PROVIDER=gemini
GOOGLE_API_KEY=xxx
SUPABASE_URL=https://YOUR-DEV.supabase.co

# .env.local (frontend)
VITE_USE_LOCAL_FUNCTIONS=true
VITE_SUPABASE_URL=https://YOUR-DEV.supabase.co
```

### Workflow
```
Develop → Test Locally → Iterate → Push Once → Deploy
```

---

## ✅ Your New Reality

**Before (Expensive):**
- Code in VSCode
- Push to GitHub (credit)
- Test in Lovable (credit)
- Find bug (credit)
- Repeat 10x (10 credits)

**After (Cheap):**
- Code in VSCode
- Test locally (FREE)
- Iterate 10x (FREE)
- Push when perfect (1 credit)
- Works first time!

**Result:** 90% savings + 10x faster iteration! 🎉

---

**Ready to set this up? I can walk you through each step!**
