# Vercel + Supabase Migration Plan

**Objective:** Set up parallel deployment on Vercel (fork) to test independent workflow while keeping Lovable production running.

**Timeline:** 2-3 hours setup, 1-2 weeks testing
**Risk:** Low (fork strategy keeps production untouched)

---

## 📋 Phase 1: Fork & Local Setup (30 minutes)

### Task 1: Create GitHub Fork
```bash
# 1. Go to: https://github.com/NickB03/llm-chat-site
# 2. Click "Fork" button (top right)
# 3. Name: llm-chat-site-dev
# 4. Description: "Vercel deployment testing fork"
# 5. ✅ Copy default branch only
# 6. Click "Create fork"
```

**Verification:** Fork visible at `https://github.com/NickB03/llm-chat-site-dev`

---

### Task 2: Clone Fork Locally
```bash
# Navigate to projects directory
cd ~/Projects

# Clone the fork (different directory from main repo)
git clone https://github.com/NickB03/llm-chat-site-dev.git llm-chat-site-fork

# Enter directory
cd llm-chat-site-fork

# Verify remote
git remote -v
# Should show: origin  https://github.com/NickB03/llm-chat-site-dev.git
```

**Verification:** Directory exists at `~/Projects/llm-chat-site-fork`

---

### Task 3: Get Supabase Credentials

**Option A: Use MCP (Fastest)**
```bash
# Already connected to vana-dev via MCP
# Get the publishable key
```

**Option B: Supabase Dashboard**
```bash
# 1. Login to: https://supabase.com/dashboard
# 2. Select project: vana-dev (vznhbocnuykdmjvujaka)
# 3. Go to: Settings → API
# 4. Copy these values:
#    - Project URL
#    - anon public key
```

**Save these for next step!**

---

### Task 4: Configure Environment
```bash
# In fork directory: ~/Projects/llm-chat-site-fork

# Create .env file
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="vznhbocnuykdmjvujaka"
VITE_SUPABASE_URL="https://vznhbocnuykdmjvujaka.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key_here"
EOF

# Replace "your_anon_key_here" with actual key from Task 3
```

**Verification:** `cat .env` shows correct values

---

### Task 5: Update Supabase Config
```bash
# Update project_id in config.toml
sed -i '' 's/xfwlneedhqealtktaacv/vznhbocnuykdmjvujaka/g' supabase/config.toml

# Verify change
grep "project_id" supabase/config.toml
# Should show: project_id = "vznhbocnuykdmjvujaka"
```

**Verification:** Config file updated

---

### Task 6: Install Dependencies & Test
```bash
# Install packages
npm install

# Start dev server
npm run dev

# Test in browser: http://localhost:8080
# ✅ App loads without errors
# ✅ Can create guest session
# ✅ Can send messages
```

**Verification:** Local dev works with vana-dev backend

---

## 📋 Phase 2: Supabase Auth Configuration (15 minutes)

### Task 7: Configure Auth URLs

**In Supabase Dashboard:**
```
1. Go to: https://supabase.com/dashboard/project/vznhbocnuykdmjvujaka
2. Navigate to: Authentication → URL Configuration
3. Update fields:

   Site URL:
   http://localhost:8080

   Redirect URLs (add all):
   http://localhost:8080/**
   https://*.vercel.app/**

   (We'll add your custom domain later)

4. Click "Save"
```

**Verification:** URLs saved in Supabase dashboard

---

### Task 8: Test Auth Locally
```bash
# With dev server running (npm run dev)

# Test signup:
# 1. Go to http://localhost:8080
# 2. Click "Sign Up"
# 3. Enter email/password
# 4. Check email for confirmation

# Test login:
# 1. Click "Login"
# 2. Enter credentials
# 3. Should redirect to chat

# Test session:
# 1. Refresh page
# 2. Should stay logged in
```

**Verification:** Auth flows work locally with vana-dev

---

## 📋 Phase 3: GitHub Actions Setup (20 minutes)

### Task 9: Generate Supabase Access Token
```bash
# Login to Supabase CLI
npx supabase login

# This opens browser to create access token
# Follow prompts:
# 1. Authorize CLI access
# 2. Copy the access token shown
# 3. Save it securely (you'll need it for GitHub secrets)
```

**Save this token!** You won't be able to see it again.

---

### Task 10: Add GitHub Secrets

**In GitHub Fork Repository:**
```
1. Go to: https://github.com/NickB03/llm-chat-site-dev/settings/secrets/actions

2. Click "New repository secret"

3. Add SUPABASE_ACCESS_TOKEN:
   Name: SUPABASE_ACCESS_TOKEN
   Value: [paste token from Task 9]

4. Click "Add secret"

5. Add SUPABASE_PROJECT_ID:
   Name: SUPABASE_PROJECT_ID
   Value: vznhbocnuykdmjvujaka

6. Click "Add secret"
```

**Verification:** Both secrets visible in repository settings

---

### Task 11: Verify GitHub Action File

The `.github/workflows/deploy-edge-functions.yml` file was already created. Verify it exists:

```bash
cat .github/workflows/deploy-edge-functions.yml

# Should contain workflow for deploying Edge Functions
```

**Verification:** Workflow file exists and looks correct

---

## 📋 Phase 4: Vercel Deployment (30 minutes)

### Task 12: Install Vercel CLI
```bash
# Install globally
npm install -g vercel

# Login to Vercel
vercel login

# Follow prompts (opens browser)
# - Authenticate with GitHub/Email
# - Return to terminal
```

**Verification:** `vercel --version` shows version number

---

### Task 13: Deploy to Vercel
```bash
# In fork directory
cd ~/Projects/llm-chat-site-fork

# Initialize Vercel project
vercel

# Answer prompts:
# ? Set up and deploy "~/Projects/llm-chat-site-fork"? [Y/n] Y
# ? Which scope? [Your Account]
# ? Link to existing project? [y/N] N
# ? What's your project's name? llm-chat-site-dev
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] N

# Vercel will:
# ✅ Upload code
# ✅ Build project
# ✅ Deploy to preview URL
# ✅ Show deployment URL (save this!)
```

**Verification:** App deployed, preview URL accessible

---

### Task 14: Add Environment Variables to Vercel

**Option A: Via CLI (Recommended)**
```bash
# Add each variable
vercel env add VITE_SUPABASE_PROJECT_ID production
# Paste: vznhbocnuykdmjvujaka

vercel env add VITE_SUPABASE_URL production
# Paste: https://vznhbocnuykdmjvujaka.supabase.co

vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
# Paste: [your anon key]

# Redeploy to production with env vars
vercel --prod
```

**Option B: Via Dashboard**
```
1. Go to: https://vercel.com/dashboard
2. Select project: llm-chat-site-dev
3. Go to: Settings → Environment Variables
4. Add each variable:
   - VITE_SUPABASE_PROJECT_ID
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
5. Redeploy from dashboard
```

**Verification:** Environment variables visible in Vercel dashboard

---

### Task 15: Update Supabase Auth for Vercel URL

**In Supabase Dashboard:**
```
1. Authentication → URL Configuration
2. Add your Vercel production URL to Redirect URLs:

   https://llm-chat-site-dev.vercel.app/**

3. Update Site URL if desired:
   https://llm-chat-site-dev.vercel.app

4. Click "Save"
```

**Verification:** Vercel URL in Supabase redirect list

---

## 📋 Phase 5: Testing & Validation (45 minutes)

### Task 16: Test Production Deployment

**Functional Testing:**
```
1. Open: https://llm-chat-site-dev.vercel.app

2. Test Guest Mode:
   ✅ Can send messages
   ✅ Chat interface works
   ✅ Artifact rendering works

3. Test Sign Up:
   ✅ Can create account
   ✅ Receives confirmation email
   ✅ Can confirm email

4. Test Login:
   ✅ Can log in
   ✅ Session persists
   ✅ Can log out

5. Test Chat Features:
   ✅ Can create new session
   ✅ Can load previous sessions
   ✅ Messages save correctly

6. Test Artifacts:
   ✅ Can create artifacts
   ✅ Artifacts render correctly
   ✅ Can edit artifacts
```

**Verification:** All features work on Vercel deployment

---

### Task 17: Test GitHub Actions Edge Function Deployment

**Make a test change to Edge Function:**
```bash
# In fork directory
cd ~/Projects/llm-chat-site-fork

# Edit the chat Edge Function (make small comment change)
echo "// Test deployment $(date)" >> supabase/functions/chat/index.ts

# Commit and push
git add supabase/functions/chat/index.ts
git commit -m "test: verify Edge Function auto-deployment"
git push origin main

# Watch GitHub Actions
# Go to: https://github.com/NickB03/llm-chat-site-dev/actions
# Should see workflow running
```

**Verification:**
- ✅ GitHub Action runs successfully
- ✅ Edge Function deployed to vana-dev
- ✅ Can verify in Supabase dashboard

---

### Task 18: Test Preview Deployments

**Create a test branch:**
```bash
# Create feature branch
git checkout -b feature/test-preview

# Make small UI change
echo "<!-- Test preview deployment -->" >> src/pages/Home.tsx

# Push to GitHub
git add .
git commit -m "test: preview deployment"
git push origin feature/test-preview

# Go to GitHub and create Pull Request
# Vercel will auto-create preview deployment
```

**Verification:**
- ✅ Vercel bot comments on PR with preview URL
- ✅ Preview deployment accessible
- ✅ Changes visible in preview

---

## 📋 Phase 6: Comparison & Decision (1-2 weeks)

### Task 19: Run Parallel for Testing Period

**Run both setups simultaneously:**

| Environment | URL | Backend | Purpose |
|-------------|-----|---------|---------|
| **Production (Lovable)** | lovable.app URL | xfwlneedhqealtktaacv | Keep running, real users |
| **Staging (Vercel)** | vercel.app URL | vznhbocnuykdmjvujaka | Test, compare metrics |

**Track these metrics:**
```
1. Deployment frequency
   - How many times you deploy
   - Time to deploy

2. Performance
   - Page load times (use Vercel Analytics)
   - Edge Function latency
   - Artifact rendering speed

3. Costs
   - Lovable credit usage
   - Vercel usage (free tier limits)
   - Supabase usage

4. Developer Experience
   - Ease of deployment
   - Preview deployment value
   - Debugging tools
   - Build times

5. Reliability
   - Uptime
   - Error rates
   - Edge cases
```

**Verification:** Data collected for comparison

---

### Task 20: Document Findings & Decide

**Create comparison document:**
```markdown
# Lovable vs Vercel: Real-World Comparison

## Metrics After 2 Weeks

### Deployments
- Lovable: X deploys, Y credits used ($Z)
- Vercel: X deploys, $0

### Performance
- Page Load (Lovable): X ms
- Page Load (Vercel): Y ms

### Costs Projection
- Lovable: $X/month
- Vercel + Supabase: $Y/month

### Developer Experience
- Lovable: [notes]
- Vercel: [notes]

## Decision
[Choose platform based on data]

## Migration Plan
[If switching to Vercel, document migration steps]
```

**Verification:** Decision documented with data to support it

---

## 🎯 Success Criteria

**Phase 1-4 Complete When:**
- ✅ Fork deployed to Vercel
- ✅ Auth working on Vercel
- ✅ Edge Functions auto-deploy via GitHub Actions
- ✅ Both Lovable and Vercel running in parallel

**Phase 5 Complete When:**
- ✅ All features tested and working on Vercel
- ✅ Preview deployments working
- ✅ Edge Function deployment confirmed

**Phase 6 Complete When:**
- ✅ 1-2 weeks of comparison data collected
- ✅ Platform decision made with data backing
- ✅ Migration plan created (if switching)

---

## 🔄 Rollback Plan

**If Something Goes Wrong:**

1. **Production is safe** - Lovable still running
2. **Fork is isolated** - Can delete without affecting main
3. **Easy cleanup:**
   ```bash
   # Delete Vercel project
   vercel remove llm-chat-site-dev

   # Delete fork
   # Go to: https://github.com/NickB03/llm-chat-site-dev/settings
   # Scroll to "Danger Zone"
   # Click "Delete this repository"
   ```

**No risk to production!**

---

## 📞 Support Resources

**Vercel:**
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord
- Status: https://vercel-status.com

**Supabase:**
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Status: https://status.supabase.com

**GitHub Actions:**
- Docs: https://docs.github.com/actions
- Community: https://github.community

---

## 🎓 Key Learnings

**★ Insight ─────────────────────────────────────**
This fork strategy gives you risk-free experimentation. You'll get hands-on experience with:
- Vercel's deployment workflow
- GitHub Actions automation
- Supabase multi-environment setup
- Preview deployments for PRs
- Real-world cost and performance data

After 1-2 weeks, you'll have concrete data to make an informed decision rather than guessing.
─────────────────────────────────────────────────

---

## ⏱️ Time Estimates

| Phase | Tasks | Estimated Time | Actual Time |
|-------|-------|----------------|-------------|
| Phase 1 | Fork & Local Setup | 30 min | ___ |
| Phase 2 | Auth Configuration | 15 min | ___ |
| Phase 3 | GitHub Actions | 20 min | ___ |
| Phase 4 | Vercel Deployment | 30 min | ___ |
| Phase 5 | Testing | 45 min | ___ |
| Phase 6 | Comparison | 1-2 weeks | ___ |
| **Total Setup** | **Tasks 1-18** | **~2.5 hours** | ___ |

---

## 📝 Notes

**Track issues and observations here:**

```
Date: ___________
Task: ___________
Issue: ___________
Resolution: ___________
```

---

*Last Updated: 2025-11-05*
*Version: 1.0*
