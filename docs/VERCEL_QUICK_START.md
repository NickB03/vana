# Vercel Migration - Quick Start Checklist

**Goal:** Get fork running on Vercel in ~2 hours

---

## ✅ Pre-Flight Checklist

Before starting, you need:
- [ ] GitHub account
- [ ] Access to Supabase dashboard (vana-dev project)
- [ ] Terminal access
- [ ] ~2 hours of focused time

---

## 🚀 Quick Start (Copy/Paste Ready)

### Step 1: Fork Repository (5 min)
```
1. Go to: https://github.com/NickB03/llm-chat-site
2. Click "Fork" → Name it "llm-chat-site-dev" → Create fork
```

### Step 2: Clone & Setup (10 min)
```bash
cd ~/Projects
git clone https://github.com/NickB03/llm-chat-site-dev.git llm-chat-site-fork
cd llm-chat-site-fork

# Create .env (replace YOUR_KEY with actual key from Supabase dashboard)
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="vznhbocnuykdmjvujaka"
VITE_SUPABASE_URL="https://vznhbocnuykdmjvujaka.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_KEY"
EOF

# Update config
sed -i '' 's/xfwlneedhqealtktaacv/vznhbocnuykdmjvujaka/g' supabase/config.toml

# Install & test
npm install
npm run dev
```

**✅ Checkpoint:** App loads at http://localhost:8080

---

### Step 3: Configure Supabase Auth (5 min)
```
1. Go to: https://supabase.com/dashboard/project/vznhbocnuykdmjvujaka
2. Authentication → URL Configuration
3. Add redirect URL: https://*.vercel.app/**
4. Save
```

---

### Step 4: Setup GitHub Actions (10 min)
```bash
# Login to Supabase CLI
npx supabase login
# Copy the access token shown

# Add to GitHub:
# 1. Go to: https://github.com/NickB03/llm-chat-site-dev/settings/secrets/actions
# 2. New secret: SUPABASE_ACCESS_TOKEN = [paste token]
# 3. New secret: SUPABASE_PROJECT_ID = vznhbocnuykdmjvujaka
```

**✅ Checkpoint:** Both secrets visible in GitHub settings

---

### Step 5: Deploy to Vercel (15 min)
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (follow prompts with defaults)
vercel

# Add environment variables
vercel env add VITE_SUPABASE_PROJECT_ID production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

# Deploy to production
vercel --prod
```

**✅ Checkpoint:** App live at https://llm-chat-site-dev.vercel.app

---

### Step 6: Update Supabase for Vercel (3 min)
```
1. Supabase Dashboard → Authentication → URL Configuration
2. Add redirect URL: https://llm-chat-site-dev.vercel.app/**
3. Update Site URL: https://llm-chat-site-dev.vercel.app
4. Save
```

---

### Step 7: Test Everything (20 min)

**Checklist:**
- [ ] Visit production URL
- [ ] Can send guest message
- [ ] Can sign up (check email)
- [ ] Can login
- [ ] Can create artifact
- [ ] Create PR → Vercel creates preview
- [ ] Push Edge Function change → GitHub Action deploys

**✅ All tests pass?** You're done!

---

## 🎯 What You've Accomplished

After these steps, you now have:

✅ **Fork deployed to Vercel** (free, unlimited deploys)
✅ **Auth working** (Supabase Auth, no code changes)
✅ **Auto-deployment** (push to main = instant deploy)
✅ **Preview deployments** (every PR gets preview URL)
✅ **Edge Functions auto-deploy** (via GitHub Actions)

**And Lovable production still running!** Zero risk.

---

## 📊 Next Steps

**Short Term (Next 1-2 weeks):**
1. Use both platforms in parallel
2. Track metrics:
   - Deploy frequency
   - Performance
   - Costs
   - Developer experience

**Long Term (After testing):**
1. Review data
2. Choose platform
3. If Vercel wins: migrate production
4. If Lovable wins: delete fork

---

## 🆘 Quick Troubleshooting

**Build fails on Vercel?**
```bash
# Check build locally first
npm run build
# Fix any errors, then redeploy
```

**Auth not working?**
```
# Check redirect URLs in Supabase Dashboard
# Must include: https://*.vercel.app/**
```

**Edge Functions not deploying?**
```
# Check GitHub Actions logs
# Verify secrets are set correctly
```

**Environment variables missing?**
```bash
# List current env vars
vercel env ls

# Add missing ones
vercel env add VARIABLE_NAME production
```

---

## 📞 Need Help?

**Stuck on a step?**
1. Check `docs/VERCEL_MIGRATION_PLAN.md` for detailed explanations
2. Vercel Discord: https://vercel.com/discord
3. Supabase Discord: https://discord.supabase.com

**Want to start over?**
```bash
# Delete Vercel project
vercel remove llm-chat-site-dev

# Delete fork from GitHub settings
# Start from Step 1 again
```

---

**★ Insight ─────────────────────────────────────**
This quick start gets you from zero to deployed in under 2 hours. Each step has a clear checkpoint so you can verify progress. If something breaks, you know exactly where to look.
─────────────────────────────────────────────────

---

*Total Time: ~2 hours | Difficulty: Intermediate | Risk: None (fork strategy)*
