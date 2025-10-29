# Next Agent Instructions

## 🎯 Project Overview

You are working on **Vana Bot** (www.vana.bot), an AI-powered chat assistant application built with:
- **Frontend:** Vite, React, TypeScript, shadcn/ui, Tailwind CSS
- **Backend:** Lovable Cloud (managed Supabase)
- **Deployment:** Lovable Cloud with automatic deployments
- **Development:** Hybrid approach using Claude Code (VSCode) + Lovable AI

## 📍 Current Status

**Branch:** `feature/workflow-documentation`
**Status:** Clean branch with comprehensive workflow documentation, ready to merge
**Dev Server:** Running on `http://localhost:8080`

**What was just completed:**
- Created complete workflow documentation for Lovable + Claude Code development
- Added Claude agent configurations
- Updated .gitignore to exclude temporary files
- All documentation is committed and pushed to GitHub

## 🔧 Available Tools & Resources

### Supabase MCP Server ⚡ IMPORTANT

**You have access to a configured Supabase MCP server:**
- **Project:** `vana-dev` (development Supabase instance)
- **Tools available:**
  - `list_tables` - View all database tables
  - `execute_sql` - Run SQL queries
  - `apply_migration` - Create/apply database migrations
  - `list_migrations` - View migration history
  - `get_logs` - Check service logs
  - `get_advisors` - Security and performance recommendations
  - `search_docs` - Search Supabase documentation
  - And more...

**Use the MCP server for:**
- Database exploration and analysis
- Creating migrations
- Testing queries locally
- Security audits
- Performance optimization

### Development Environment

**Local Development:**
```bash
npm run dev          # Frontend with Lovable Cloud backend
npm run dev:local    # Frontend + local edge functions (if configured)
```

**Current Setup:**
- Main branch: Up to date with production
- Feature branch: `feature/workflow-documentation` (ready to merge)
- Lovable working branch: Should be set to match Git branch

## 📚 CRITICAL DOCUMENTS - READ FIRST

**Before doing ANYTHING, read these documents in order:**

### 1. **WORKFLOW_GUIDE_INDEX.md** (5 minutes)
- Master navigation for all documentation
- Quick reference for daily workflow
- **Start here to understand the system**

### 2. **ACTUAL_WORKFLOW.md** (20 minutes)
- **MOST IMPORTANT** - Complete Lovable workflow
- How Lovable working branch setting works
- Feature branch workflow with FREE preview testing
- Three development scenarios (Claude Code only, Lovable AI only, Hybrid)
- Safety rules and credit optimization
- **YOU MUST READ THIS** to understand how to work safely

### 3. **COLLABORATION_WORKFLOW.md** (15 minutes)
- When to use Claude Code vs Lovable AI
- Three collaboration patterns (Backend-First, Frontend-First, Parallel)
- Decision framework for tool selection
- Daily workflow examples
- Cost optimization strategies

### 4. **PREVIEW_TESTING_GUIDE.md** (Reference as needed)
- How to use FREE Lovable preview testing
- Testing checklists for different scenarios
- Debugging strategies

### 5. **CLAUDE.md** (Reference as needed)
- Project-specific instructions and patterns
- Architecture overview
- Common commands and conventions

## 🚨 CRITICAL WORKFLOW RULES

**Before making ANY changes, understand these rules:**

### Rule 1: Feature Branch Workflow
```
❌ NEVER commit directly to main
✅ ALWAYS create feature branches
✅ ALWAYS switch Lovable working branch to match Git branch
```

### Rule 2: Lovable Working Branch
```
Lovable Dashboard → Project Settings → Working Branch

When you create: git checkout -b feature/my-feature
You MUST set: Lovable working branch → feature/my-feature

This ensures Lovable AI commits to YOUR branch, not main!
```

### Rule 3: Preview Before Merging
```
✅ Push to feature branch
✅ Wait 30-60 seconds for preview
✅ Test at preview URL (FREE!)
✅ Only merge when preview is perfect
✅ Switch Lovable to main before publishing
```

### Rule 4: Tool Selection
```
Frontend changes → Claude Code (local VSCode)
Backend changes → Lovable AI (or use Supabase MCP server)
Database schema → Lovable AI or Supabase MCP server
Testing → Preview (FREE) + Local dev
```

## 🎯 Your Task: Create Plan and Assign Agents

### Step 1: Understand Current State

**First actions:**
```bash
# 1. Check current branch
git status

# 2. Check what files are in working directory
ls -la

# 3. Explore the database using Supabase MCP
# Use: mcp__plugin_supabase-toolkit_supabase__list_tables
# Use: mcp__plugin_supabase-toolkit_supabase__execute_sql

# 4. Check dev server status
# It should be running on http://localhost:8080
```

### Step 2: Ask User for Goals

**Use the AskUserQuestion tool to understand what they want to accomplish:**

Example questions:
- "What feature or improvement would you like to work on next?"
- "Are you focusing on frontend, backend, or both?"
- "Do you need database changes for this feature?"
- "Should I merge the workflow documentation to main first?"

### Step 3: Create Detailed Plan

Based on user input, create a comprehensive plan:

1. **Assess Requirements**
   - What needs to be built?
   - Frontend changes needed?
   - Backend/database changes needed?
   - Testing strategy?

2. **Choose Development Approach**
   - Backend-First (Lovable AI then Claude Code)?
   - Frontend-First (Claude Code then Lovable AI)?
   - Parallel Development (both at once)?

3. **Database Planning** (if needed)
   - Use Supabase MCP server to explore current schema
   - Plan migrations using `apply_migration`
   - Check security with `get_advisors`

4. **Break Down Tasks**
   - Small, manageable steps
   - Clear dependencies
   - Assignable to specialized agents

### Step 4: Use Task Tool to Assign Agents

**Available agent types for delegation:**

**Frontend Development:**
- `frontend-developer` - React components, UI implementation
- `ui-ux-designer` - Design systems, user experience
- `typescript-pro` - TypeScript patterns and types

**Backend Development:**
- `backend-architect` - API design, architecture
- `supabase-toolkit:*` - Database operations (USE THE MCP SERVER!)
- `fastapi-pro` / `python-pro` - If building Python services

**Testing & Quality:**
- `test-automator` - Test generation and automation
- `performance-engineer` - Performance optimization
- `security-auditor` - Security scanning and audits

**Documentation:**
- `docs-architect` - Technical documentation
- `tutorial-engineer` - Onboarding guides

**Example Task Assignments:**
```
Task 1: Backend - Database Schema
→ Use Supabase MCP server directly
→ Or assign: backend-architect with MCP tools

Task 2: Frontend - Component Development
→ Assign: frontend-developer
→ Tools: Read, Write, Edit, Bash (for npm run dev)

Task 3: Testing Strategy
→ Assign: test-automator
→ After development completes

Task 4: Documentation
→ Assign: docs-architect
→ Document new features
```

## 🔍 Using the Supabase MCP Server

**To explore the database:**
```
1. List all tables:
   mcp__plugin_supabase-toolkit_supabase__list_tables

2. Query data:
   mcp__plugin_supabase-toolkit_supabase__execute_sql
   Query: "SELECT * FROM chat_sessions LIMIT 5"

3. Check security:
   mcp__plugin_supabase-toolkit_supabase__get_advisors
   Type: "security"

4. Create migration:
   mcp__plugin_supabase-toolkit_supabase__apply_migration
   Name: "add_new_field"
   Query: "ALTER TABLE..."
```

**Database Schema (Current):**
- `chat_sessions` - User chat sessions
- `chat_messages` - Messages in sessions
- `user_preferences` - User settings
- Plus auth tables (managed by Supabase Auth)

## 📋 Example Workflow for Next Task

**Scenario: User wants to add a new feature**

```
1. Ask user what they want to build
   └─> Use AskUserQuestion tool

2. Explore current database (if backend needed)
   └─> Use Supabase MCP server tools
   └─> Understand current schema

3. Create feature branch
   └─> git checkout -b feature/new-feature
   └─> git push origin feature/new-feature
   └─> Remind user: Switch Lovable working branch!

4. Plan the implementation
   └─> Backend first or Frontend first?
   └─> What agents are needed?

5. Assign tasks to specialized agents
   └─> Use Task tool with appropriate agent types
   └─> Provide clear instructions and context

6. For backend work:
   └─> Use Supabase MCP server for migrations
   └─> Or ask Lovable AI (user must switch working branch!)

7. For frontend work:
   └─> Develop locally (npm run dev)
   └─> Test immediately
   └─> Commit when working

8. Preview testing
   └─> Push to feature branch
   └─> Wait for Lovable preview
   └─> Test thoroughly (FREE!)

9. Merge when perfect
   └─> git merge to main
   └─> Switch Lovable to main
   └─> Click "Publish"
```

## ⚠️ Common Pitfalls to Avoid

1. **DON'T commit directly to main**
   - Always use feature branches
   - Always switch Lovable working branch to match

2. **DON'T forget to use preview testing**
   - It's FREE - use it liberally
   - Catch issues before production

3. **DON'T ignore the MCP server**
   - You have direct database access
   - Use it for exploration and migrations
   - Faster than asking Lovable for simple queries

4. **DON'T skip reading the workflow docs**
   - Understanding the workflow is CRITICAL
   - It prevents breaking production
   - It saves Lovable credits

5. **DON'T merge without testing**
   - Always preview first
   - Test on mobile (at least DevTools)
   - Check console for errors

## 🎓 Your First Actions

**Immediately do these steps:**

1. **Read ACTUAL_WORKFLOW.md** (20 minutes)
   - This is non-negotiable
   - You cannot proceed safely without this

2. **Check current status:**
   ```bash
   git status
   git branch
   ls -la
   ```

3. **Explore database using MCP:**
   ```
   List tables
   Check current schema
   Understand data structure
   ```

4. **Ask user for their goals:**
   - What do they want to build?
   - What's the priority?
   - Should workflow docs be merged first?

5. **Create a detailed plan**
   - Break into small tasks
   - Identify dependencies
   - Choose development approach

6. **Assign specialized agents**
   - Use Task tool
   - Provide complete context
   - Monitor progress

## 🚀 Success Criteria

You'll know you're on the right track when:

✅ You've read and understood ACTUAL_WORKFLOW.md
✅ You understand the feature branch + Lovable working branch workflow
✅ You're using the Supabase MCP server for database operations
✅ You're creating detailed plans before starting development
✅ You're delegating to specialized agents appropriately
✅ You're testing in preview before merging
✅ Production (www.vana.bot) stays stable and working

## 📞 Getting Help

If confused about anything:

1. **Workflow questions** → Read ACTUAL_WORKFLOW.md again
2. **Tool selection** → Read COLLABORATION_WORKFLOW.md
3. **Testing strategy** → Read PREVIEW_TESTING_GUIDE.md
4. **Database questions** → Use Supabase MCP server tools
5. **Project patterns** → Read CLAUDE.md

## 🎯 Final Checklist Before Starting

- [ ] Read ACTUAL_WORKFLOW.md (20 min)
- [ ] Read WORKFLOW_GUIDE_INDEX.md (5 min)
- [ ] Understand feature branch workflow
- [ ] Understand Lovable working branch setting
- [ ] Know how to use Supabase MCP server
- [ ] Checked current git status
- [ ] Explored database with MCP tools
- [ ] Asked user for their goals
- [ ] Created detailed implementation plan
- [ ] Ready to assign specialized agents

---

**Remember:** You're not doing all the work yourself. Your job is to:
1. Understand the project and workflow
2. Gather requirements from the user
3. Create a comprehensive plan
4. Delegate to specialized agents
5. Coordinate the work
6. Ensure testing and quality

**You're the orchestrator, not the implementer.**

Good luck! 🚀

---

**Last updated:** 2025-10-28
**Branch:** feature/workflow-documentation
**Status:** Ready for next task
