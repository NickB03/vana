# Claude Code + Lovable AI: Collaboration Workflow

## 🎯 Overview

This guide focuses on **how to effectively use both Claude Code (local VSCode) and Lovable AI together** to maximize productivity while minimizing costs and avoiding conflicts.

## 🤝 Tool Strengths

### Claude Code (You're Using It Now!)

**Best for:**
- ✅ Frontend component development
- ✅ Complex TypeScript refactoring
- ✅ UI/UX implementation and iteration
- ✅ Edge function development (local testing)
- ✅ Code review and optimization
- ✅ Multi-file changes
- ✅ Detailed debugging

**Why use Claude Code:**
- Instant feedback (no deployment wait)
- Free local testing (no Lovable credits)
- Full VSCode features (git, extensions, debugging)
- Complex logic and algorithms
- Precise control over implementation

---

### Lovable AI

**Best for:**
- ✅ Database schema changes
- ✅ Adding database fields/tables
- ✅ RLS policy updates
- ✅ Edge function scaffolding
- ✅ Backend integrations (Stripe, OAuth, etc.)
- ✅ Quick backend modifications
- ✅ Authentication configuration

**Why use Lovable AI:**
- Understands your backend architecture
- Handles database migrations automatically
- Creates boilerplate quickly
- Manages Supabase configuration
- Fewer steps for backend work

---

## 🔄 Collaboration Patterns

### Pattern 1: Backend-First (Lovable → Claude Code)

**When to use:** Adding a new feature that needs backend support first

**Steps:**
```bash
# 1. Create feature branch
git checkout -b feature/user-favorites
git push origin feature/user-favorites

# 2. Switch Lovable to feature branch
# Lovable Dashboard → Project Settings → Working Branch → feature/user-favorites

# 3. Ask Lovable AI for backend
```

**In Lovable.dev chat:**
```
"Add a favorites system to the app:
- Add 'favorites' table with user_id and chat_session_id
- Add RLS policies for user access
- Add 'is_favorite' boolean to chat_sessions table
- Create edge function to toggle favorite status"
```

**Lovable responds and commits to feature branch automatically**

```bash
# 4. Pull Lovable's changes locally
git pull origin feature/user-favorites

# 5. Switch to Claude Code (VSCode)
npm run dev:local

# 6. Build the frontend
```

**Ask Claude Code (me!):**
```
"Create a favorites UI:
- Add star icon to chat sessions in sidebar
- Toggle favorite status on click
- Show favorites at the top of the list
- Add favorites filter toggle"
```

**Claude Code implements the UI, you test locally**

```bash
# 7. Commit frontend changes
git add .
git commit -m "feat: favorites UI"
git push origin feature/user-favorites

# 8. Preview the complete feature (FREE)
# Visit Lovable preview URL

# 9. Merge when ready
git checkout main
git merge feature/user-favorites
git push origin main

# 10. Switch Lovable to main → Publish
```

**Result:** Backend + Frontend feature completed with minimal back-and-forth

---

### Pattern 2: Frontend-First (Claude Code → Lovable)

**When to use:** You know exactly what UI you want, backend is simple

**Steps:**
```bash
# 1. Create feature branch
git checkout -b feature/chat-export
git push origin feature/chat-export

# 2. Switch Lovable to feature branch
# Project Settings → Working Branch → feature/chat-export

# 3. Start local development
npm run dev:local

# 4. Build UI first with Claude Code
```

**Ask Claude Code:**
```
"Create a chat export feature:
- Add export button to chat header
- Create export dialog with format options (PDF, MD, TXT)
- Add loading state
- Handle success/error states
- Mock the API call for now"
```

**Claude Code creates the complete UI with mocked API**

```bash
# 5. Test UI locally, iterate until perfect
# Commit frontend
git add .
git commit -m "feat: chat export UI"
git push origin feature/chat-export

# 6. Switch to Lovable AI for backend
```

**In Lovable.dev chat:**
```
"Create edge function for chat export:
- Function name: export-chat
- Input: session_id, format (pdf/md/txt)
- Fetch all messages for session
- Format based on type
- Return formatted content
- Handle errors gracefully"
```

**Lovable creates the edge function and commits**

```bash
# 7. Pull backend changes
git pull origin feature/chat-export

# 8. Connect UI to real API
# (Claude Code updates the mocked calls to use real edge function)

# 9. Test locally
npm run dev:local

# 10. Preview, merge, publish (same as Pattern 1)
```

**Result:** UI-first approach with backend added when ready

---

### Pattern 3: Parallel Development (Both at Once)

**When to use:** Large feature, backend and frontend can be developed independently

**Steps:**
```bash
# 1. Create feature branch
git checkout -b feature/team-collaboration
git push origin feature/team-collaboration

# 2. Switch Lovable to feature branch

# 3. Split the work
```

**In Lovable.dev chat:**
```
"Create team collaboration backend:
- Add teams table with name, owner_id
- Add team_members table with team_id, user_id, role
- Add team_chat_sessions linking table
- Create edge functions for:
  - create-team
  - invite-member
  - share-chat
- Add RLS policies for team access"
```

**While Lovable is working, start frontend in parallel:**

```bash
# In VSCode with Claude Code
npm run dev:local
```

**Ask Claude Code:**
```
"Create team UI components:
- TeamList component (shows user's teams)
- TeamCreate modal
- TeamInvite modal
- ShareChatDialog component
- Mock the API calls with TypeScript interfaces"
```

**Both work simultaneously on different parts!**

```bash
# 4. Periodically pull Lovable's commits
git pull origin feature/team-collaboration

# 5. Update mocked calls to use real APIs as Lovable finishes

# 6. Push frontend changes
git push origin feature/team-collaboration

# 7. Preview, test, merge, publish
```

**Result:** Faster development, both tools working in parallel

---

## 💡 Coordination Strategies

### Strategy 1: Communication in Commits

**Leave clear commit messages for context:**

```bash
# Claude Code commits
git commit -m "feat: team UI (waiting for backend API)"
git commit -m "feat: connected to Lovable's create-team function"

# Lovable commits (via Lovable AI)
# Lovable automatically includes detailed commit messages
```

**Why:** Helps you track what's done by whom

---

### Strategy 2: Use Branch Descriptions

**Add a description to your feature branch:**

```bash
# In GitHub, add branch description:
"Feature: Team Collaboration
- Backend: Lovable AI (database + edge functions)
- Frontend: Claude Code (components + UI)
- Status: Backend complete, frontend in progress"
```

---

### Strategy 3: Preview Early, Preview Often

**After ANY significant change from either tool:**

```bash
git push origin feature/your-branch
# Visit preview URL (FREE!)
# Test the integrated feature
```

**Why:** Catches integration issues early before merging to main

---

## 🎯 Decision Framework

### When to Start with Lovable AI

**Use this checklist:**
- [ ] Feature needs database changes
- [ ] Feature needs new edge functions
- [ ] Backend integration required (Stripe, OAuth)
- [ ] You're not sure how to structure the backend
- [ ] Backend is complex (Lovable knows the architecture)

**→ Start with Lovable AI → Pull changes → Build UI with Claude Code**

---

### When to Start with Claude Code

**Use this checklist:**
- [ ] UI-first feature (design is clear)
- [ ] Backend is simple or already exists
- [ ] Pure frontend work (styling, components)
- [ ] Complex TypeScript logic
- [ ] Need many iterations (faster locally)

**→ Build UI with Claude Code → Ask Lovable for simple backend if needed**

---

### When to Work in Parallel

**Use this checklist:**
- [ ] Large feature with clear frontend/backend split
- [ ] You have time (not urgent)
- [ ] Backend and frontend are independent
- [ ] You understand both sides well

**→ Lovable builds backend, Claude Code builds frontend, integrate at the end**

---

## 🚨 Avoiding Conflicts

### Rule 1: One Tool Per File

**Principle:** Don't edit the same file with both tools simultaneously

**Examples:**

**✅ Good:**
- Lovable: `supabase/functions/create-team/index.ts`
- Claude Code: `src/components/TeamCreate.tsx`
- No overlap, no conflicts

**❌ Bad:**
- Lovable: Edits `src/components/ChatInterface.tsx`
- You: Also editing `ChatInterface.tsx` locally
- Conflict on next pull!

**Solution:** If you need both tools on same file, do it sequentially:
1. Lovable makes changes → Commit
2. Pull locally
3. Claude Code makes additional changes → Commit
4. Push

---

### Rule 2: Pull Before Push

**Always:**
```bash
git pull origin feature/your-branch
# Resolve any conflicts
git push origin feature/your-branch
```

**Why:** Lovable may have committed while you were working locally

---

### Rule 3: Coordinate on Edge Functions

**If you're developing edge functions locally:**

**Option A: Claude Code owns it**
- Develop locally with `npm run dev:local`
- Test thoroughly
- Push to Git
- Don't ask Lovable to modify it

**Option B: Lovable owns it**
- Let Lovable create/modify it
- Pull changes
- Don't edit locally (or edit carefully and push)

**Option C: Handoff**
- Lovable creates initial scaffold
- Pull locally
- Claude Code refines it
- Push final version
- Don't ask Lovable to modify again

---

## 📋 Daily Workflow Examples

### Example 1: Quick UI Tweak (Claude Code Only)

**Scenario:** Fix button alignment in chat interface

```bash
# Morning
git checkout -b feature/fix-button-alignment
git push origin feature/fix-button-alignment

# Switch Lovable to feature branch
# Project Settings → Working Branch → feature/fix-button-alignment

# VSCode with Claude Code
npm run dev:local
```

**Ask Claude Code:**
```
"Fix the send button alignment in ChatInterface:
- Should align with input field baseline
- Add proper spacing
- Ensure mobile responsive"
```

**Claude Code fixes it, you test locally**

```bash
git add .
git commit -m "fix: send button alignment"
git push origin feature/fix-button-alignment

# Preview (FREE) - looks good!

git checkout main
git merge feature/fix-button-alignment
git push origin main

# Switch Lovable to main → Publish
```

**Time:** 15 minutes
**Credits used:** 0 (no Lovable AI involved)

---

### Example 2: New Feature with Backend (Lovable → Claude Code)

**Scenario:** Add tags to chat sessions

```bash
# Morning
git checkout -b feature/chat-tags
git push origin feature/chat-tags

# Switch Lovable to feature/chat-tags
```

**In Lovable.dev chat:**
```
"Add tags feature:
- Add tags array field to chat_sessions table (text[])
- Add edge function to update tags
- Ensure RLS policies allow user to update own session tags"
```

**Lovable implements (5 minutes), commits to feature branch**

```bash
# Pull backend changes
git pull origin feature/chat-tags

# Build UI with Claude Code
npm run dev:local
```

**Ask Claude Code:**
```
"Create tags UI:
- Tag input component (with autocomplete from existing tags)
- Display tags as pills on chat session
- Click to add/remove tags
- Show tags in sidebar
- Add tag filter"
```

**Claude Code builds UI (30 minutes)**

```bash
git add .
git commit -m "feat: tags UI"
git push origin feature/chat-tags

# Preview (FREE)
# Test adding tags, filtering, etc.
# Works perfectly!

git checkout main
git merge feature/chat-tags
git push origin main

# Switch Lovable to main → Publish
```

**Time:** 45 minutes
**Credits used:** 1 (one Lovable AI request)
**Result:** Complete feature with backend + frontend

---

### Example 3: Complex Feature (Parallel Development)

**Scenario:** Add real-time collaboration to chats

**Day 1: Setup and Backend (Lovable)**
```bash
git checkout -b feature/realtime-collab
git push origin feature/realtime-collab
# Switch Lovable to feature/realtime-collab
```

**In Lovable.dev:**
```
"Add real-time collaboration:
- Add collaborators table (session_id, user_id, role, joined_at)
- Add presence system with Supabase Realtime
- Edge function to invite collaborator
- Edge function to track presence
- RLS policies for shared access"
```

**Day 1: Frontend Structure (Claude Code)**
```bash
npm run dev:local
```

**Ask Claude Code:**
```
"Create collaboration UI components:
- CollaboratorList (shows active users)
- InviteCollaborator modal
- PresenceIndicator
- SharedChatBanner
- Mock all API calls for now"
```

**Day 2: Integration**
```bash
# Pull Lovable's backend work
git pull origin feature/realtime-collab

# Update Claude Code's mocked calls to real APIs
```

**Ask Claude Code:**
```
"Connect collaboration UI to real backend:
- Replace mocks with real edge function calls
- Set up Supabase Realtime subscriptions
- Handle presence updates
- Test error cases"
```

**Day 3: Testing and Refinement**
```bash
# Test locally
npm run dev:local

# Push all changes
git push origin feature/realtime-collab

# Preview (FREE)
# Test with multiple users
# Iterate on issues

# When perfect:
git checkout main
git merge feature/realtime-collab
git push origin main

# Switch Lovable to main → Publish
```

**Time:** 3 days
**Credits used:** 1-2 (Lovable AI requests)
**Result:** Complex real-time feature using both tools' strengths

---

## 🎨 Workflow Visualization

### Sequential (Backend First)
```
┌─────────────────┐
│  Lovable AI     │ Create backend
│  (5 mins)       │ Database + Edge Functions
└────────┬────────┘
         │ commit
         ↓
┌─────────────────┐
│  git pull       │ Pull backend changes
└────────┬────────┘
         ↓
┌─────────────────┐
│  Claude Code    │ Build frontend UI
│  (30-60 mins)   │ Components + Logic
└────────┬────────┘
         │ commit
         ↓
┌─────────────────┐
│  Preview (FREE) │ Test complete feature
└────────┬────────┘
         │ if good
         ↓
┌─────────────────┐
│  Merge & Deploy │ main → Publish
└─────────────────┘
```

### Parallel Development
```
┌─────────────────┐         ┌─────────────────┐
│  Lovable AI     │         │  Claude Code    │
│  Backend        │         │  Frontend       │
│  (async)        │         │  (local)        │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ commit                    │ commit
         ↓                           ↓
         └───────────┬───────────────┘
                     │ git pull/push
                     ↓
         ┌───────────────────────┐
         │  Integration Testing  │
         │  (Preview - FREE)     │
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │  Merge & Deploy       │
         └───────────────────────┘
```

---

## 💰 Cost Optimization

### Maximize FREE Work

**Do these locally (FREE):**
- All frontend development
- UI iterations and refinements
- TypeScript refactoring
- Edge function development (with local Supabase)
- Testing and debugging
- Multiple iterations

**Use Lovable AI for (Costs Credits):**
- Database schema changes
- Complex backend integrations
- When you need AI assistance for backend
- Initial edge function scaffolds

**Strategy:**
1. Do 90% locally with Claude Code (FREE)
2. Use Lovable AI for final 10% (backend needs)
3. Preview everything (FREE)
4. Deploy once when perfect

**Result:** Minimal Lovable credits, maximum productivity

---

## 🎯 Best Practices Summary

### Do ✅

1. **Choose the right tool for the job**
   - Frontend → Claude Code
   - Backend → Lovable AI

2. **Pull before you push**
   ```bash
   git pull origin feature/your-branch
   git push origin feature/your-branch
   ```

3. **Preview often (it's FREE!)**
   - After Lovable AI changes → Preview
   - After Claude Code changes → Preview
   - Before merging → Preview

4. **Work on feature branches**
   - Never directly on main
   - Switch Lovable working branch to match
   - Merge only when tested

5. **Communicate via commits**
   - Clear commit messages
   - Indicate which tool made the change
   - Note dependencies or WIP

6. **Test locally first**
   - `npm run dev:local` for frontend
   - Local Supabase for backend (if set up)
   - Push only when working

---

### Don't ❌

1. **Don't edit same files simultaneously**
   - Causes merge conflicts
   - Pick one tool per file

2. **Don't push untested code**
   - Test locally first
   - Preview before merging

3. **Don't forget to switch Lovable branch**
   - Always verify working branch matches your Git branch
   - Prevents commits to wrong branch

4. **Don't merge without preview**
   - Always preview (FREE) before merging
   - Catch integration issues early

5. **Don't skip Git operations**
   - Commit often
   - Push regularly
   - Pull before starting work

---

## 🚀 Getting Started

### First Collaboration Session

**Try this simple workflow to practice:**

```bash
# 1. Create test feature
git checkout -b feature/test-workflow
git push origin feature/test-workflow

# 2. Switch Lovable to feature/test-workflow
# Project Settings → Working Branch

# 3. Ask Lovable for simple backend
```

**In Lovable:**
```
"Add a 'notes' text field to chat_sessions table"
```

```bash
# 4. Pull changes
git pull origin feature/test-workflow

# 5. Ask Claude Code for frontend
```

**In Claude Code:**
```
"Add a notes textarea to the chat settings, connected to the new notes field"
```

```bash
# 6. Test locally
npm run dev:local

# 7. Push
git add .
git commit -m "test: notes feature"
git push origin feature/test-workflow

# 8. Preview (FREE)

# 9. Merge
git checkout main
git merge feature/test-workflow
git push origin main

# 10. Publish
# Switch Lovable to main → Click Publish
```

**Congratulations!** You've completed your first Claude Code + Lovable AI collaboration.

---

## 📚 Quick Reference

### Starting New Feature
```bash
git checkout -b feature/name
git push origin feature/name
# Switch Lovable: Project Settings → Working Branch → feature/name
```

### Backend Work (Lovable)
```
1. Open Lovable.dev
2. Verify working branch is correct
3. Chat with Lovable AI
4. Wait for commit
5. git pull locally
```

### Frontend Work (Claude Code)
```
1. npm run dev:local
2. Ask Claude Code for help
3. Develop and test locally
4. git add . && git commit
5. git push origin feature/name
```

### Preview Testing
```
1. git push origin feature/name
2. Visit Lovable preview URL (FREE)
3. Test thoroughly
4. If issues: fix and push again
5. If good: merge to main
```

### Deploy to Production
```
1. git checkout main
2. git merge feature/name
3. git push origin main
4. Lovable: Working Branch → main
5. Click "Publish" → www.vana.bot
```

---

## ✅ You're Ready!

You now have a complete collaboration workflow between Claude Code and Lovable AI.

**Key Takeaways:**
- ✅ Use the right tool for each job
- ✅ Coordinate via Git and branches
- ✅ Preview often (it's FREE!)
- ✅ Merge only when tested
- ✅ Minimize Lovable AI usage to save credits

**Start collaborating and building amazing features!** 🚀
