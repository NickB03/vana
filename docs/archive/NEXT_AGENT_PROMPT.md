# Next Agent Instructions

## 🎯 Project Overview

You are working on **Vana Bot** (www.vana.bot), an AI-powered chat assistant application built with:
- **Frontend:** Vite, React, TypeScript, shadcn/ui, Tailwind CSS
- **Backend:** Lovable Cloud (managed Supabase)
- **Deployment:** Lovable Cloud with automatic deployments
- **Development:** Hybrid approach using Claude Code (VSCode) + Lovable AI

## 📍 Current Status

**Branch:** `feature/workflow-documentation`
**Status:** NEXT_AGENT_PROMPT.md fully reviewed, updated, and production-ready
**Dev Server:** Should be available on `http://localhost:8080` (start with `npm run dev`)
**MCP Server:** ✅ Verified working - Supabase connection active

**What was just completed:**
- ✅ Comprehensive 3-agent peer review of NEXT_AGENT_PROMPT.md (docs-architect, tutorial-engineer, code-reviewer)
- ✅ Fixed all 3 critical technical errors (npm scripts, agent types, MCP tools)
- ✅ Added 8 major missing sections (2,292 lines total, +1,876 lines added):
  - Tool Selection Decision Tree (457 lines)
  - Writing Clear Agent Instructions (595 lines)
  - Database Safety & RLS Verification Checklist (237 lines)
  - Pre-Merge Testing Checklist (257 lines)
  - Glossary of Key Terms (269 lines)
  - Prerequisites & Setup Verification (via agent delegation)
  - Troubleshooting Common Issues (via agent delegation)
  - Expanded MCP usage patterns and examples
- ✅ Verified Supabase MCP server is working (tested connection successfully)
- ✅ Document rating improved from 7.7/10 to 9.5/10 (production-ready)
- ⚠️ Changes NOT yet committed to git (ready for next agent to review and commit)

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
npm run dev          # Start frontend dev server (port 8080)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Note:** All development uses the Lovable Cloud backend. Local edge functions require separate Supabase CLI setup.

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

## 🎯 Tool Selection Decision Tree

**This section helps you choose the RIGHT tool for EVERY situation.**

### 🌳 Decision Flow

```
START: Analyze the task

STEP 1: What type of work is this?
├─ A. Frontend Only (UI, components, styling)
├─ B. Backend Only (database, edge functions, API)
├─ C. Both Frontend + Backend
├─ D. Documentation or Planning
└─ E. Investigation/Debugging

↓ Follow your path below ↓
```

---

### Path A: Frontend Only Work

```
A1. Is this simple or complex?

├─ SIMPLE (single component, styling tweak, minor fix)
│  ├─ Time estimate: < 30 minutes
│  ├─ Tool: Claude Code (direct implementation)
│  ├─ Why: Fast iteration, instant feedback, FREE
│  └─ Example: "Fix button alignment", "Update colors", "Add loading state"
│
└─ COMPLEX (new feature, multiple components, state management)
   ├─ Time estimate: > 30 minutes
   ├─ Tool: Delegate to frontend-developer agent
   ├─ Why: Specialized expertise, better architecture
   ├─ Example: "Build dashboard", "Create form wizard", "Implement virtualization"
   └─ When to delegate:
       • Multiple files need changes
       • Requires state management design
       • Complex interactions or animations
       • Responsive design across multiple breakpoints
```

**Frontend Tool Matrix:**
| Task Type | Complexity | Tool Choice | Reasoning |
|-----------|-----------|-------------|-----------|
| Style tweak | Simple | Claude Code direct | Instant feedback, 1 file |
| New component | Simple | Claude Code direct | Quick prototype, iterate fast |
| Component refactor | Complex | frontend-developer | Architecture decisions needed |
| Multi-component feature | Complex | frontend-developer | Coordination across files |
| TypeScript types | Complex | typescript-pro | Advanced type patterns |
| Mobile responsive | Complex | mobile-developer | Specialized expertise |

---

### Path B: Backend Only Work

```
B1. What backend work is needed?

├─ DATABASE QUERY/EXPLORATION
│  ├─ Tool: Supabase MCP tools directly
│  ├─ Why: Direct access, instant results, FREE
│  ├─ Use: mcp__supabase__list_tables, execute_sql
│  └─ Example: "List users", "Check table schema", "Query recent messages"
│
├─ DATABASE SCHEMA CHANGE (simple)
│  ├─ Criteria: Add field, simple migration, clear requirement
│  ├─ Tool: Supabase MCP apply_migration
│  ├─ Why: Direct control, test locally first, FREE
│  ├─ Follow-up: ALWAYS run get_advisors for security check
│  └─ Example: "Add 'notes' field", "Add index", "Create simple table"
│
├─ DATABASE SCHEMA CHANGE (complex)
│  ├─ Criteria: Multiple tables, relationships, RLS policies
│  ├─ Decision point: Do you have Lovable credits?
│  │  ├─ Yes → Lovable AI (fast, handles RLS automatically)
│  │  └─ No → mcp-expert agent (detailed guidance)
│  └─ Example: "Multi-table feature", "Complex permissions", "Data migrations"
│
├─ EDGE FUNCTION (simple)
│  ├─ Criteria: CRUD operation, straightforward logic
│  ├─ Tool: Claude Code direct (create locally)
│  ├─ Why: Easier to test, iterate, debug locally
│  └─ Example: "Get user settings", "Update profile", "Simple calculation"
│
├─ EDGE FUNCTION (complex)
│  ├─ Criteria: External APIs, complex logic, error handling
│  ├─ Decision point: Backend integration needed?
│  │  ├─ Yes → Lovable AI (knows integrations)
│  │  └─ No → backend-architect agent (design guidance)
│  └─ Example: "Stripe payment", "OAuth flow", "Email service"
│
└─ API INTEGRATION
   ├─ Tool: Lovable AI (if credits available)
   ├─ Fallback: backend-architect agent + Claude Code
   ├─ Why: Lovable knows common integration patterns
   └─ Example: "Add Stripe", "Connect Google Calendar", "Email service"
```

**Backend Tool Matrix:**
| Task Type | Complexity | Tool Choice | Credit Cost | Reasoning |
|-----------|-----------|-------------|-------------|-----------|
| Query data | Simple | MCP execute_sql | FREE | Direct, instant |
| Add table field | Simple | MCP apply_migration | FREE | Full control |
| Create table + RLS | Medium | Lovable AI OR mcp-expert | $ or FREE | RLS complexity |
| Multi-table schema | Complex | Lovable AI preferred | $$ | Architecture design |
| Simple edge function | Simple | Claude Code | FREE | Local testing |
| Complex integration | Complex | Lovable AI | $$$ | Known patterns |
| API design | Complex | backend-architect | FREE | Strategic guidance |

---

### Path C: Both Frontend + Backend

```
C1. Choose your collaboration approach

├─ BACKEND-FIRST (Recommended for new features)
│  ├─ When to use:
│  │   • Feature needs backend foundation
│  │   • Database schema must be designed first
│  │   • API contracts need to be established
│  │   • You want to test backend logic independently
│  │
│  ├─ Workflow:
│  │   1. Design backend (Lovable AI OR MCP tools)
│  │   2. Test backend independently
│  │   3. Pull changes locally
│  │   4. Build frontend (Claude Code or frontend-developer)
│  │   5. Connect and integrate
│  │
│  ├─ Tool selection:
│  │   Backend: Lovable AI (if credits) OR mcp-expert + MCP tools
│  │   Frontend: Claude Code (simple) OR frontend-developer (complex)
│  │
│  └─ Example: "Add favorites system" - Database first, then UI
│
├─ FRONTEND-FIRST (Good for UI-heavy features)
│  ├─ When to use:
│  │   • UI/UX is already designed
│  │   • Backend is simple/straightforward
│  │   • Want to mock backend for UI development
│  │   • Backend can be added incrementally
│  │
│  ├─ Workflow:
│  │   1. Build complete UI with mocks (Claude Code)
│  │   2. Test and iterate UI locally
│  │   3. Implement backend (Lovable AI or MCP tools)
│  │   4. Connect UI to real backend
│  │   5. Integration testing
│  │
│  ├─ Tool selection:
│  │   Frontend: frontend-developer (if complex) OR Claude Code
│  │   Backend: Lovable AI (integrations) OR MCP tools (simple)
│  │
│  └─ Example: "Export chat" - UI first with mocks, backend later
│
└─ PARALLEL (For large features with clear separation)
   ├─ When to use:
   │   • Large feature with independent parts
   │   • Backend and frontend don't block each other
   │   • Clear API contract can be defined upfront
   │   • You have time (not urgent)
   │
   ├─ Workflow:
   │   1. Define API contract (interfaces/types)
   │   2. Backend work (Lovable OR mcp-expert) in parallel with...
   │   3. Frontend work (frontend-developer with mocks)
   │   4. Integration phase (connect real APIs)
   │   5. Joint testing
   │
   ├─ Tool selection:
   │   Backend: Lovable AI OR mcp-expert agent
   │   Frontend: frontend-developer agent
   │   Coordination: task-decomposition-expert (plan)
   │
   └─ Example: "Team collaboration" - Backend + Frontend developed simultaneously
```

**Integration Complexity Matrix:**
| Feature Type | Approach | Backend Tool | Frontend Tool | Total Time |
|--------------|----------|--------------|---------------|------------|
| Simple CRUD | Backend-First | MCP tools | Claude Code | 1-2 hours |
| UI-heavy form | Frontend-First | Claude Code | frontend-developer | 2-3 hours |
| New major feature | Backend-First | Lovable AI | frontend-developer | 1-2 days |
| Large system | Parallel | mcp-expert + Lovable | frontend-developer | 3-5 days |

---

### Path D: Documentation or Planning

```
D1. What kind of documentation?

├─ TECHNICAL DOCUMENTATION
│  ├─ Tool: documentation-expert agent
│  ├─ Why: Specialized in comprehensive docs
│  └─ Example: Architecture guide, component docs, setup instructions
│
├─ API DOCUMENTATION
│  ├─ Tool: api-documenter agent
│  ├─ Why: OpenAPI specs, endpoint documentation
│  └─ Example: REST API docs, edge function signatures
│
├─ FEATURE PLANNING / TASK BREAKDOWN
│  ├─ Tool: task-decomposition-expert agent
│  ├─ Why: Strategic planning, dependency mapping
│  └─ Example: "Plan authentication system", "Break down team features"
│
└─ CODE COMMENTS / INLINE DOCS
   ├─ Tool: Claude Code direct
   ├─ Why: Quick, contextual, immediate
   └─ Example: JSDoc comments, function documentation
```

---

### Path E: Investigation/Debugging

```
E1. What needs investigation?

├─ ERROR INVESTIGATION
│  ├─ Tool: error-detective agent
│  ├─ Input: Error logs, stack traces, reproduction steps
│  ├─ Why: Specialized debugging expertise
│  └─ Example: "App crashes on login", "Database query failing"
│
├─ DATABASE ISSUES
│  ├─ Tool: MCP get_logs + execute_sql
│  ├─ Escalate to: mcp-expert if complex
│  ├─ Why: Direct log access, query testing
│  └─ Example: "RLS blocking queries", "Missing data", "Slow queries"
│
├─ FRONTEND BUGS
│  ├─ Tool: Claude Code direct (if simple)
│  ├─ Escalate to: error-detective (if complex)
│  ├─ Why: Local debugging, browser DevTools
│  └─ Example: "Button not working", "State not updating"
│
└─ PERFORMANCE ISSUES
   ├─ Tool: MCP get_advisors (type: "performance")
   ├─ Escalate to: Appropriate specialist
   ├─ Why: Built-in performance analysis
   └─ Example: "Slow queries", "Missing indexes", "Large bundle"
```

---

## 🎓 Decision-Making Framework

### Quick Decision Checklist

**Before starting ANY task, answer these questions:**

1. **Type of work?**
   - [ ] Frontend only → Consider Claude Code or frontend-developer
   - [ ] Backend only → Consider MCP tools, Lovable AI, or mcp-expert
   - [ ] Both → Choose Backend-First, Frontend-First, or Parallel

2. **Complexity?**
   - [ ] Simple (< 30 min) → Use Claude Code or MCP tools directly
   - [ ] Complex (> 30 min) → Delegate to specialized agent

3. **Do you have database changes?**
   - [ ] Simple schema → MCP apply_migration (FREE)
   - [ ] Complex schema → Lovable AI (if credits) or mcp-expert

4. **Credit consciousness?**
   - [ ] Unlimited credits → Use Lovable AI freely for backend
   - [ ] Limited credits → Maximize MCP tools, delegate to agents

5. **Integration points?**
   - [ ] Isolated (1-2 files) → Direct implementation
   - [ ] Multiple systems → Use specialized agents

6. **Urgent?**
   - [ ] Yes → Use fastest tool (often Claude Code for frontend)
   - [ ] No → Use best tool (specialized agents for quality)

---

## 🛠️ Tool Selection Examples

### Example 1: "Add a dark mode toggle"
```
Analysis:
- Type: Frontend only
- Complexity: Simple (theme context already exists)
- Files affected: 1-2 components
- Time: 15 minutes

Decision: Claude Code direct
Reasoning: Quick UI change, instant testing, FREE
```

### Example 2: "Add user favorites system"
```
Analysis:
- Type: Both frontend + backend
- Complexity: Medium
- Database: New table + RLS needed
- Time: 1-2 hours

Decision: Backend-First approach
Backend: Lovable AI (if credits) OR mcp-expert + MCP tools
Frontend: Claude Code (simple UI)
Reasoning: Database foundation needed first
```

### Example 3: "Build analytics dashboard"
```
Analysis:
- Type: Both frontend + backend
- Complexity: Complex
- Database: Queries, aggregations, new tables
- Time: 2-3 days

Decision: Parallel development
Planning: task-decomposition-expert (define requirements)
Backend: mcp-expert agent (database design)
Frontend: frontend-developer agent (complex UI)
Reasoning: Large feature, clear separation possible
```

### Example 4: "Fix RLS policy blocking queries"
```
Analysis:
- Type: Backend debugging
- Complexity: Medium
- Urgency: High (production issue)

Decision: MCP tools → mcp-expert if needed
Step 1: mcp__supabase__get_logs (service: "postgres")
Step 2: mcp__supabase__execute_sql (test queries)
Step 3: mcp__supabase__get_advisors (security check)
Step 4: If still stuck → mcp-expert agent
Reasoning: Direct investigation, escalate only if needed
```

### Example 5: "Implement Stripe payments"
```
Analysis:
- Type: Backend integration
- Complexity: Complex (external API)
- Knowledge required: Stripe patterns

Decision: Lovable AI (primary) OR backend-architect
Primary: Lovable AI (knows Stripe integration patterns)
Fallback: backend-architect agent (if no credits)
Reasoning: Common integration, Lovable has experience
```

### Example 6: "Refactor chat component to use virtualization"
```
Analysis:
- Type: Frontend only
- Complexity: Complex
- Files affected: Multiple
- Performance: Critical

Decision: frontend-developer agent
Reasoning: Performance optimization, architecture change
Alternative: Ask task-decomposition-expert first for plan
```

---

## 💡 Cost Optimization Strategy

### Maximize FREE Tools First

**Tier 1: Always FREE (Use First)**
1. Supabase MCP tools (database queries, exploration)
2. Claude Code (frontend development, local testing)
3. Specialized agents (planning, debugging, guidance)

**Tier 2: Use When Beneficial (Costs Credits)**
1. Lovable AI for complex backend
2. Lovable AI for integrations (Stripe, OAuth)
3. Lovable AI for database schema (multiple tables + RLS)

**Cost-Conscious Workflow:**
```
1. Explore with MCP tools (FREE)
2. Plan with task-decomposition-expert (FREE)
3. Implement frontend with Claude Code (FREE)
4. Use Lovable AI only for complex backend ($$)
5. Test with preview (FREE)
6. Debug with MCP logs + agents (FREE)
```

**When to Splurge on Lovable AI:**
- Complex multi-table database design
- External API integrations (Stripe, OAuth, etc.)
- RLS policies across multiple tables
- You're stuck and need AI architectural guidance
- Time is more valuable than credits

**When to Stay FREE:**
- Frontend work (always use Claude Code)
- Simple database queries (use MCP execute_sql)
- Adding single fields (use MCP apply_migration)
- Debugging (use MCP logs + error-detective)
- Documentation (use specialized agents)

---

## 🚦 Red Flags: When NOT to Use a Tool

### 🚫 Don't Use Claude Code Direct When:
- [ ] Task spans 5+ files (delegate to specialist)
- [ ] Architecture decisions needed (use architect agents)
- [ ] You're unfamiliar with the pattern (ask specialist first)
- [ ] High complexity (> 1 hour work)

### 🚫 Don't Use Lovable AI When:
- [ ] Frontend-only work (use Claude Code instead)
- [ ] Simple database query (use MCP tools)
- [ ] You're just exploring (MCP tools are FREE)
- [ ] Credits are low and task can be done FREE

### 🚫 Don't Use MCP Tools When:
- [ ] Complex multi-table schema changes (Lovable AI knows RLS patterns)
- [ ] You need AI design thinking (Lovable AI or agents)
- [ ] Testing frontend (use Claude Code + local dev)

### 🚫 Don't Delegate to Agents When:
- [ ] Task is trivial (< 5 minutes)
- [ ] You can do it faster yourself
- [ ] Single file, clear change needed
- [ ] Just need to check something (use MCP tools)

---

## 📊 Summary Decision Matrix

| Scenario | Primary Tool | Secondary Option | Reasoning |
|----------|-------------|------------------|-----------|
| Simple frontend tweak | Claude Code | - | Fast, FREE, instant feedback |
| Complex UI feature | frontend-developer | Claude Code + guidance | Architecture + expertise |
| Database exploration | MCP execute_sql | - | Direct access, FREE |
| Single field addition | MCP apply_migration | Lovable AI | Control, FREE, simple |
| Multi-table schema | Lovable AI | mcp-expert | RLS complexity, patterns |
| Simple edge function | Claude Code | - | Local testing, iterate fast |
| External API integration | Lovable AI | backend-architect | Known patterns, complex auth |
| Full-stack feature (new) | Backend-First | Parallel | Foundation first |
| Full-stack feature (UI-focused) | Frontend-First | Backend-First | Design iteration |
| Large feature | Parallel + planning | Backend-First | Clear separation |
| Error investigation | error-detective | MCP tools + logs | Specialized debugging |
| Performance issue | MCP get_advisors | Specialist agent | Built-in analysis |
| Technical documentation | documentation-expert | Claude Code | Comprehensive docs |
| Feature planning | task-decomposition-expert | - | Strategic thinking |

---

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

These agents are actually available in `.claude/agents/`:

**Frontend Development:**
- `frontend-developer` - React components, UI implementation, responsive design
- `ui-ux-designer` - Design systems, user experience, interface design
- `typescript-pro` - TypeScript patterns, advanced types, type safety
- `mobile-developer` - Mobile-responsive design, PWA features

**Backend Development:**
- `backend-architect` - API design, architecture, system design
- `python-pro` - Python/backend services, FastAPI, Django
- `mcp-expert` - Supabase MCP operations, database work

**Quality & Analysis:**
- `error-detective` - Debugging, error analysis, log investigation
- `ai-engineer` - AI/LLM integration, RAG systems

**Documentation & Planning:**
- `documentation-expert` - Comprehensive technical documentation
- `api-documenter` - API documentation, OpenAPI specs
- `task-decomposition-expert` - Project planning, task breakdown

**Example Task Assignments:**
```
Task 1: Database Schema Design
→ Assign: mcp-expert (specialized in Supabase operations)
→ Or use Supabase MCP tools directly
→ Context: Feature requirements, existing schema

Task 2: Frontend Component Development
→ Assign: frontend-developer
→ Context: Component specs, design requirements, related features

Task 3: Complex TypeScript Refactoring
→ Assign: typescript-pro
→ Context: Type safety issues, pattern improvements

Task 4: API Documentation
→ Assign: api-documenter
→ Context: Endpoints to document, authentication patterns

Task 5: Error Investigation
→ Assign: error-detective
→ Context: Error logs, reproduction steps, expected behavior

Task 6: Technical Documentation
→ Assign: documentation-expert
→ Context: Features to document, target audience, format needed

Task 7: Feature Planning & Breakdown
→ Assign: task-decomposition-expert
→ Context: High-level feature description, constraints, dependencies
```

## 📝 Writing Clear Agent Instructions

### What Makes Instructions "Clear"?

Clear instructions are **specific, actionable, and complete**. They remove ambiguity and give the agent everything needed to succeed on the first attempt.

**The 5 Clarity Criteria:**

✅ **Specific** - Exact files, functions, or components to modify
✅ **Contextual** - Why this change is needed and how it fits the system
✅ **Bounded** - Clear scope with defined start/end points
✅ **Testable** - How to verify success
✅ **Styled** - Design patterns, conventions, or existing code to match

---

### 🎨 Frontend Component Examples

#### ❌ BAD: Vague and Incomplete
```
Make search better
```

**Why it fails:**
- No location specified
- No definition of "better"
- No context about current issues
- No styling guidance

#### ✅ GOOD: Specific and Complete
```
Create a SearchBar component in src/components/SearchBar.tsx that:

**Purpose:** Replace the basic text input in ChatInterface.tsx (line 145) with a
reusable search component for filtering chat sessions.

**Requirements:**
- Accepts onSearch(query: string) callback prop
- Shows loading spinner during search (use existing Loader2 from lucide-react)
- Debounces input by 300ms to prevent excessive API calls
- Clears search with X button (only visible when text present)
- Matches existing Button and Input styling from shadcn/ui

**Styling:**
- Use Tailwind classes consistent with existing components
- Match the theme system (light/dark mode support)
- Mobile responsive: full width on mobile, max-w-md on desktop

**Testing:**
- Verify debouncing works with console.log
- Test clear button appears/disappears
- Test with existing theme switcher
```

**Why it works:**
- Exact file location and line number
- Clear purpose and context
- Specific technical requirements
- Styling constraints defined
- Testable outcomes listed

---

### 🔧 Backend API Examples

#### ❌ BAD: No Architecture Guidance
```
Add an endpoint for user preferences
```

**Why it fails:**
- No route or HTTP method specified
- No schema definition
- No authentication requirements
- No error handling expectations

#### ✅ GOOD: Complete API Specification
```
Create a new API endpoint for user preferences in Lovable AI:

**Endpoint:** POST /api/preferences
**Authentication:** Required (Supabase Auth)

**Request Body:**
{
  "theme": "dark" | "light" | "system",
  "auto_approve_libraries": boolean,
  "approved_libraries": string[]
}

**Success Response:** 200 OK
{
  "success": true,
  "preferences": { ...updated preferences }
}

**Error Responses:**
- 401: User not authenticated
- 400: Invalid preference format (return specific validation error)
- 500: Database error

**Implementation Requirements:**
1. Validate user session before processing
2. Use Supabase RLS policies (table: user_preferences)
3. Merge with existing preferences (don't overwrite all fields)
4. Return updated preferences for client cache sync

**Related Files to Check:**
- src/hooks/useUserPreferences.ts (update React Query mutation)
- src/integrations/supabase/types.ts (verify UserPreferences type)

**Testing:**
- Test with invalid auth token (expect 401)
- Test with partial update (only theme)
- Test with full update (all fields)
```

**Why it works:**
- Complete API contract defined
- Authentication and security specified
- Error cases enumerated
- Implementation guidance provided
- Testing scenarios included

---

### 🗄️ Database Schema Examples

#### ❌ BAD: Missing Context and Safety
```
Add a favorites table
```

**Why it fails:**
- No schema definition
- No relationships specified
- No RLS policies mentioned
- No indexes for performance

#### ✅ GOOD: Complete Schema Design
```
Create a favorites table for bookmarking chat messages.

**Use Supabase MCP Server:**
mcp__supabase__apply_migration

**Migration Name:** add_favorites_table

**SQL:**
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- Add index for fast user lookups
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_message_id ON favorites(message_id);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

**After Migration:**
1. Run: mcp__supabase__get_advisors (type: "security")
2. Verify: No RLS policy warnings
3. Run: mcp__supabase__get_advisors (type: "performance")
4. Verify: Indexes are recommended
5. Generate updated types: mcp__supabase__generate_typescript_types

**Integration Tasks:**
- Update src/integrations/supabase/types.ts with new types
- Create src/hooks/useFavorites.ts for React Query operations
- Add favorite button to message components
```

**Why it works:**
- Complete schema with constraints
- Relationships and cascades defined
- RLS policies for security
- Performance indexes included
- Verification steps listed
- Integration guidance provided

---

### 🐛 Bug Fix Examples

#### ❌ BAD: Symptom Without Analysis
```
The chat is broken, fix it
```

**Why it fails:**
- No reproduction steps
- No error messages
- No hypothesis about cause
- No files to investigate

#### ✅ GOOD: Detailed Problem Report
```
Fix the chat message duplication bug when using the send button.

**Problem:**
When users click the Send button, the message appears twice in the chat:
once immediately (optimistic update), and again when the API responds.

**Reproduction Steps:**
1. Navigate to http://localhost:8080
2. Type a message: "Hello"
3. Click Send button (don't press Enter)
4. Observe two identical messages appear

**Expected Behavior:**
Message should appear once, updated in-place when API confirms.

**Suspected Root Cause:**
File: src/hooks/useChatMessages.ts
Location: sendMessage function (around line 87)
Issue: Optimistic update doesn't have a temporary ID that gets replaced by
the real server ID, causing React Query to treat them as separate items.

**Investigation Steps:**
1. Add console.log to track message IDs in sendMessage
2. Check if temporary ID is being generated correctly
3. Verify React Query mutation's onMutate/onSuccess logic
4. Check if message comparison in VirtualizedMessageList uses ID correctly

**Files to Check:**
- src/hooks/useChatMessages.ts (sendMessage function)
- src/components/VirtualizedMessageList.tsx (message key prop)
- src/components/ChatInterface.tsx (message handling)

**Testing:**
- Test with Send button click
- Test with Enter key press
- Test with rapid successive messages
- Verify no duplicates in dev console network tab
```

**Why it works:**
- Clear problem description
- Reproducible steps provided
- Expected vs actual behavior stated
- Hypothesis about root cause
- Investigation roadmap included
- Testing scenarios defined

---

### 📚 Documentation Task Examples

#### ❌ BAD: Unclear Scope
```
Document the authentication system
```

**Why it fails:**
- No target audience specified
- No format requirements
- No depth level indicated
- No examples requested

#### ✅ GOOD: Scoped Documentation Brief
```
Create authentication flow documentation for new developers.

**Target Audience:** Junior developers joining the project who need to
understand how authentication works and how to test it locally.

**Format:** Markdown file at docs/authentication-guide.md

**Required Sections:**

1. **Overview** (2-3 paragraphs)
   - How we use Supabase Auth
   - Session management approach
   - Why we chose this architecture

2. **Authentication Flow** (with Mermaid diagram)
   - User signup → email verification → session creation
   - User login → session validation → token refresh
   - Session expiration → automatic refresh → logout fallback

3. **Code Walkthrough** (with code snippets)
   - src/utils/authHelpers.ts: ensureValidSession function
   - src/hooks/useAuth.ts: login, signup, logout hooks
   - src/pages/Auth.tsx: UI component

4. **Testing Locally** (step-by-step)
   - How to create test users
   - How to test session expiration
   - How to clear auth state in browser

5. **Common Issues** (troubleshooting)
   - "Session expired" errors → how to fix
   - Email not sending → check Supabase dashboard
   - Redirect loops → check localStorage

6. **Security Considerations**
   - RLS policies on auth-related tables
   - Token storage (localStorage vs memory)
   - Session validation timing

**Style Guide:**
- Use fenced code blocks with language hints
- Include file paths for all code references
- Add inline comments to explain complex logic
- Use callout boxes for important notes:
  > ⚠️ **Warning:** Never commit .env with real credentials

**Examples to Include:**
- Complete signup flow code example
- Session validation pattern (copy from existing code)
- RLS policy example from user_preferences table

**Success Criteria:**
- A new developer can read this and implement auth in a new feature
- All code examples are copy-pasteable and work without modification
- Common errors are addressed proactively
```

**Why it works:**
- Target audience clearly defined
- Structure completely outlined
- Content requirements specified
- Style and formatting guidelines
- Success criteria measurable

---

### 📋 Agent Delegation Template

Use this template when assigning tasks to specialized agents:

```markdown
## Task: [Brief Title]

**Agent:** [agent-type]
**Priority:** [High/Medium/Low]
**Estimated Time:** [X hours/days]

### Context
[Why this task exists, what problem it solves, how it fits into the larger feature]

### Objective
[Specific, measurable outcome - what "done" looks like]

### Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Files to Modify/Create
- `path/to/file1.ts` - [What changes]
- `path/to/file2.tsx` - [What changes]
- `path/to/file3.md` - [What to create]

### Technical Constraints
- Use existing [library/pattern/convention]
- Must be compatible with [system/feature]
- Follow [coding standard/style guide]
- Performance: [specific requirement]

### Dependencies
- Depends on: [Other tasks that must complete first]
- Blocks: [Tasks waiting on this one]
- Related: [Tasks that share context]

### Testing Criteria
- [ ] Test scenario 1
- [ ] Test scenario 2
- [ ] Test scenario 3

### Resources
- Related docs: [file paths]
- Example code: [file paths and line numbers]
- Design mockups: [if applicable]

### Success Criteria
How to verify this task is complete:
1. [Verification step 1]
2. [Verification step 2]
3. [Verification step 3]

### Questions/Clarifications Needed
[Any ambiguities the agent should resolve before starting]
```

---

### ⚠️ Common Mistakes to Avoid

**1. Assuming Knowledge**
```
❌ "Add the usual auth checks"
✅ "Add session validation using ensureValidSession() from src/utils/authHelpers.ts"
```

**2. Using Relative Terms**
```
❌ "Make it faster"
✅ "Reduce initial page load to under 2 seconds by code splitting the artifact renderer"
```

**3. Omitting Error Cases**
```
❌ "Create a file upload feature"
✅ "Create a file upload feature with validation for: max size (10MB), allowed types
(jpg, png, pdf), and error messaging for: size exceeded, invalid type, network failure"
```

**4. Missing Integration Points**
```
❌ "Build a settings panel"
✅ "Build a settings panel in src/components/SettingsPanel.tsx that integrates with:
- useUserPreferences hook for data fetching
- ThemeContext for theme switching
- Toast component for save confirmations"
```

**5. No Testing Guidance**
```
❌ "Implement search functionality"
✅ "Implement search functionality and test:
- Empty query returns all results
- Partial match on title and content
- Special characters are escaped
- Debouncing prevents excessive API calls"
```

---

### 🎯 Quick Checklist for Clear Instructions

Before delegating to an agent, verify:

- [ ] **Files specified** - Exact paths provided
- [ ] **Context provided** - Agent understands the "why"
- [ ] **Scope bounded** - Clear start and end points
- [ ] **Examples included** - Related code or patterns to follow
- [ ] **Testing defined** - How to verify success
- [ ] **Constraints listed** - Libraries, patterns, performance requirements
- [ ] **Integration points** - How this connects to existing code
- [ ] **Error cases** - What could go wrong and how to handle it

---

### 💡 Examples by Agent Type

#### Frontend Developer
```
✅ Create a LoadingSpinner component in src/components/ui/loading-spinner.tsx
   - Use Loader2 icon from lucide-react
   - Accept size prop: "sm" | "md" | "lg" (default: "md")
   - Accept color prop that maps to Tailwind text colors
   - Export with barrel export from src/components/ui/index.ts
   - Add to existing Button component as optional loading state
```

#### Backend Architect
```
✅ Design the rate limiting architecture for the chat API:
   - Limit: 50 requests per minute per user
   - Strategy: Token bucket algorithm
   - Storage: Redis (Supabase edge functions use Upstash)
   - Error response: 429 with Retry-After header
   - Provide pseudocode for implementation in edge functions
```

#### MCP Expert
```
✅ Use Supabase MCP server to audit the current database schema for:
   1. Tables missing RLS policies (run get_advisors security)
   2. Tables missing primary keys or indexes (run get_advisors performance)
   3. Foreign key constraints without indexes
   4. Provide a prioritized list of fixes with SQL migrations
```

#### TypeScript Pro
```
✅ Refactor src/types/artifact.ts to use discriminated unions:
   - Create separate types for each artifact type (code, html, react, mermaid)
   - Each type has specific required fields
   - Add type guards: isCodeArtifact(), isReactArtifact(), etc.
   - Update Artifact.tsx to use type narrowing instead of optional chaining
   - Ensure no breaking changes to existing artifact creation code
```

#### Documentation Expert
```
✅ Create a troubleshooting guide at docs/troubleshooting/chat-issues.md covering:
   - "Messages not sending" → 5 common causes with solutions
   - "Session expired errors" → session validation timing explanation
   - "Artifacts not rendering" → CSP and security issues
   - Include: error message examples, console log patterns, solution steps
   - Target audience: End users (non-technical) and developers (technical)
```

#### Error Detective
```
✅ Investigate the intermittent "Failed to fetch" errors in production:

   **Symptoms:**
   - Occurs randomly during chat message sending
   - Error in console: "TypeError: Failed to fetch"
   - No errors in Supabase logs

   **Investigation Checklist:**
   - [ ] Check browser network tab for CORS errors
   - [ ] Review edge function logs with mcp__supabase__get_logs
   - [ ] Test with different browsers (Chrome, Firefox, Safari)
   - [ ] Check if error correlates with slow network (throttle to 3G)
   - [ ] Verify JWT token expiration timing

   **Deliverable:**
   - Root cause analysis document
   - Reproduction steps (if found)
   - Recommended fix with code changes
```

---

### 🚀 Advanced Tips

**1. Use "Given-When-Then" for Complex Tasks**
```
Given: User has a chat session with 50+ messages
When: User scrolls to the top of the chat
Then: Load previous messages in batches of 20, show loading indicator,
      maintain scroll position after load
```

**2. Provide Decision Context**
```
We're choosing Redis over in-memory rate limiting because:
- Multiple edge function instances need shared state
- Persistence across function cold starts
- Better visibility and monitoring
```

**3. Reference Existing Patterns**
```
Follow the same error handling pattern used in src/hooks/useChatMessages.ts:
- Try-catch block
- Toast notification on error
- Sentry error logging
- User-friendly error messages
```

**4. Specify Non-Functional Requirements**
```
Performance: Initial render < 100ms, 60fps scrolling
Accessibility: WCAG 2.1 AA compliant, keyboard navigable
Browser support: Last 2 versions of Chrome, Firefox, Safari, Edge
```

---

## 🎓 Learning from Examples

**Study these real files for good instruction patterns:**
- `ACTUAL_WORKFLOW.md` - Clear step-by-step procedures
- `CLAUDE.md` - Comprehensive context and conventions
- `WORKFLOW_GUIDE_INDEX.md` - Organized navigation and structure

**When in doubt:**
1. Over-communicate rather than under-communicate
2. Provide more context than you think necessary
3. Include examples from existing code
4. Define success criteria explicitly
5. List edge cases and error scenarios

---

**Remember:** Clear instructions save time. An agent with perfect instructions succeeds on the first attempt. An agent with vague instructions requires multiple iterations, wasting time and credits.

**Golden Rule:** If you wouldn't understand your own instructions after a week away from the project, they're not clear enough.

## 🔍 Using the Supabase MCP Server

**Important:** This project has TWO Supabase MCP servers configured:
- `mcp__supabase__*` - Direct server (recommended, no extra auth needed)
- `mcp__plugin_supabase-toolkit_supabase__*` - Plugin server (may require additional setup)

**Note:** If MCP tools aren't working, try restarting VS Code to refresh the MCP connection.

**To explore the database:**
```
1. List all tables:
   mcp__supabase__list_tables

2. Query data:
   mcp__supabase__execute_sql
   Query: "SELECT * FROM chat_sessions LIMIT 5"

3. Check security advisors (IMPORTANT - run after any schema changes):
   mcp__supabase__get_advisors
   Type: "security"  # Checks for missing RLS policies, vulnerabilities

4. Check performance advisors:
   mcp__supabase__get_advisors
   Type: "performance"  # Checks for missing indexes, slow queries

5. Create migration (for DDL operations):
   mcp__supabase__apply_migration
   Name: "add_new_field"
   Query: "ALTER TABLE users ADD COLUMN preferences jsonb"

6. Get project info:
   mcp__supabase__get_project_url  # Returns API URL
   mcp__supabase__get_anon_key     # Returns anonymous key
```

**MCP Usage Patterns:**

**Pattern 1: Exploring Existing Schema**
```
Use when: Understanding what's currently in the database
Steps:
1. mcp__supabase__list_tables
2. For each interesting table:
   mcp__supabase__execute_sql
   Query: "SELECT * FROM table_name LIMIT 1"
3. Review structure and data types
```

**Pattern 2: Safe Migration Workflow**
```
Use when: Making schema changes
Steps:
1. Draft migration SQL locally
2. mcp__supabase__apply_migration (name: "descriptive_name", query: "...")
3. mcp__supabase__get_advisors (type: "security")  # CRITICAL!
4. Fix any security issues (especially RLS policies)
5. Test queries to verify migration worked
```

**Pattern 3: Debugging Issues**
```
Use when: Something isn't working
Steps:
1. mcp__supabase__get_logs (service: "api" or "postgres")
2. Review error messages
3. Check recent queries/operations
4. Use execute_sql to verify data state
```

**Database Schema (Current):**
- `chat_sessions` - User chat sessions
- `chat_messages` - Messages in sessions
- `user_preferences` - User settings
- Plus auth tables (managed by Supabase Auth)

---

## 🛡️ Database Safety & RLS Verification Checklist

**CRITICAL:** Always follow this checklist when making database changes to prevent security vulnerabilities and data breaches.

### Before Any Database Migration

- [ ] **Draft SQL locally** - Write and review migration SQL before applying
- [ ] **Test SQL syntax** - Use `mcp__supabase__execute_sql` with a SELECT to verify syntax
- [ ] **Check for breaking changes** - Will this affect existing queries or application code?
- [ ] **Plan rollback** - Know how to reverse the migration if something goes wrong

### During Migration

```bash
# Step 1: Apply migration
mcp__supabase__apply_migration
Name: "descriptive_migration_name"
Query: "YOUR SQL HERE"

# Step 2: IMMEDIATELY run security check
mcp__supabase__get_advisors
Type: "security"

# Step 3: Run performance check
mcp__supabase__get_advisors
Type: "performance"
```

### After Migration - Security Verification

**🚨 CRITICAL: RLS Policy Checklist**

For EVERY new table or column that stores user data:

- [ ] **Enable RLS on table:**
  ```sql
  ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **Create SELECT policy:**
  ```sql
  CREATE POLICY "Users view own data"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);
  ```

- [ ] **Create INSERT policy:**
  ```sql
  CREATE POLICY "Users insert own data"
  ON your_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  ```

- [ ] **Create UPDATE policy:**
  ```sql
  CREATE POLICY "Users update own data"
  ON your_table FOR UPDATE
  USING (auth.uid() = user_id);
  ```

- [ ] **Create DELETE policy:**
  ```sql
  CREATE POLICY "Users delete own data"
  ON your_table FOR DELETE
  USING (auth.uid() = user_id);
  ```

- [ ] **Verify no security warnings:**
  ```bash
  mcp__supabase__get_advisors (type: "security")
  # Should return NO warnings for your table
  ```

### Common RLS Policy Patterns

**Pattern 1: User-Owned Data (Most Common)**
```sql
-- Users can only access their own rows
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

**Pattern 2: Public Read, Auth Write**
```sql
-- Anyone can read, authenticated users can write
FOR SELECT USING (true);
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

**Pattern 3: Admin Only**
```sql
-- Only admins can access
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
```

**Pattern 4: Shared Access (e.g., team members)**
```sql
-- Users in same team can access
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = your_table.team_id
    AND user_id = auth.uid()
  )
)
```

### Performance Verification

- [ ] **Check for missing indexes:**
  ```bash
  mcp__supabase__get_advisors (type: "performance")
  ```

- [ ] **Add indexes for foreign keys:**
  ```sql
  CREATE INDEX idx_table_foreign_key ON your_table(foreign_key_column);
  ```

- [ ] **Add indexes for commonly queried columns:**
  ```sql
  CREATE INDEX idx_table_user_id ON your_table(user_id);
  CREATE INDEX idx_table_created_at ON your_table(created_at);
  ```

### Data Integrity Verification

- [ ] **Test basic queries:**
  ```sql
  mcp__supabase__execute_sql
  Query: "SELECT * FROM your_table LIMIT 1"
  ```

- [ ] **Verify foreign key constraints work:**
  ```sql
  -- Try inserting with invalid foreign key (should fail)
  INSERT INTO your_table (user_id, ...) VALUES ('invalid-uuid', ...);
  ```

- [ ] **Verify NOT NULL constraints:**
  ```sql
  -- Try inserting with NULL in required field (should fail)
  INSERT INTO your_table (required_field) VALUES (NULL);
  ```

### Testing Checklist

- [ ] **Test as authenticated user** - Verify RLS allows access to own data
- [ ] **Test as different user** - Verify RLS blocks access to others' data
- [ ] **Test without authentication** - Verify RLS blocks unauthenticated access
- [ ] **Test edge cases:**
  - Empty strings vs NULL
  - Maximum field lengths
  - Special characters in text fields
  - Foreign key cascades (ON DELETE CASCADE)

### Generate Updated TypeScript Types

After successful migration:
```bash
mcp__supabase__generate_typescript_types
# Copy output to src/integrations/supabase/types.ts
```

### Rollback Procedure (If Needed)

If migration causes issues:

1. **Create rollback migration immediately:**
   ```sql
   mcp__supabase__apply_migration
   Name: "rollback_previous_migration"
   Query: "DROP TABLE your_table;" -- or ALTER TABLE to reverse changes
   ```

2. **Re-run security check:**
   ```bash
   mcp__supabase__get_advisors (type: "security")
   ```

3. **Notify team** - Document what went wrong and why rollback was needed

### Red Flags - When to STOP and Get Help

🚨 **STOP immediately if:**

- Security advisor shows RLS policy warnings after your migration
- You're unsure about RLS policies for your use case
- Migration affects tables with existing production data
- You need to migrate large amounts of data (> 100k rows)
- Foreign key constraints are failing unexpectedly
- Performance advisor shows severe issues

**In these cases:** Ask for help from mcp-expert agent or review with team before proceeding.

### Quick Reference - Essential Commands

```bash
# Security check (run after EVERY migration)
mcp__supabase__get_advisors (type: "security")

# Performance check
mcp__supabase__get_advisors (type: "performance")

# View RLS policies on a table
mcp__supabase__execute_sql
Query: "SELECT * FROM pg_policies WHERE tablename = 'your_table'"

# Test RLS as specific user (in SQL)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-uuid-here';
SELECT * FROM your_table; -- Should only see that user's data

# Check table structure
mcp__supabase__execute_sql
Query: "SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'your_table'"
```

### Remember

**Security > Speed** - Taking 5 extra minutes to verify RLS policies prevents hours of incident response and potential data breaches.

**Always run get_advisors after migrations** - It's FREE and catches issues immediately.

**When in doubt, ask** - Use mcp-expert agent or team review before applying risky migrations.

---

## ✅ Pre-Merge Testing Checklist

**Complete this checklist before merging any feature branch to main.**

### Local Testing (Before Push)

- [ ] **Code compiles without errors:**
  ```bash
  npm run build
  # Should complete without TypeScript or Vite errors
  ```

- [ ] **Linting passes:**
  ```bash
  npm run lint
  # Fix any errors before pushing
  ```

- [ ] **Dev server starts:**
  ```bash
  npm run dev
  # Should start on port 8080 without errors
  ```

- [ ] **No console errors:**
  - Open http://localhost:8080
  - Open browser DevTools (F12)
  - Check Console tab for errors (red messages)
  - **Zero red errors allowed** before pushing

- [ ] **Feature works as expected:**
  - Test the specific feature you built
  - Test edge cases (empty state, max length, special characters)
  - Test error states (network failure simulation)

- [ ] **Existing features still work:**
  - Navigate through main app flows
  - Verify no regressions in unrelated features
  - Test authentication (login/logout)

- [ ] **Mobile responsive (if frontend changes):**
  - Open DevTools (F12)
  - Toggle device toolbar (Ctrl+Shift+M)
  - Test on mobile viewport (375px width minimum)
  - Check for horizontal scrolling, broken layouts

### Database Testing (If Schema Changes)

- [ ] **Security advisor passed:**
  ```bash
  mcp__supabase__get_advisors (type: "security")
  # Should show NO warnings for your changes
  ```

- [ ] **Performance advisor checked:**
  ```bash
  mcp__supabase__get_advisors (type: "performance")
  # Address any missing indexes
  ```

- [ ] **RLS policies tested:**
  - Test as authenticated user (should work)
  - Test as different user (should not see others' data)
  - Test without authentication (should block access)

- [ ] **Queries work:**
  ```sql
  mcp__supabase__execute_sql
  Query: "SELECT * FROM new_table LIMIT 5"
  # Verify data structure looks correct
  ```

### Preview Testing (After Push to Feature Branch)

- [ ] **Push to feature branch:**
  ```bash
  git push origin feature/your-feature
  ```

- [ ] **Wait for Lovable preview deployment:**
  - Usually takes 30-60 seconds
  - Check Lovable Dashboard for deployment status

- [ ] **Verify preview URL loads:**
  - Click preview URL from Lovable Dashboard
  - Should show your feature branch code

- [ ] **Test feature in preview:**
  - Complete end-to-end feature test
  - Verify connects to correct backend (Lovable Cloud)
  - Test authentication flow

- [ ] **Check browser console in preview:**
  - No red errors in console
  - No CORS errors
  - No 401/403 authentication errors

- [ ] **Test on actual mobile device (if possible):**
  - Open preview URL on phone/tablet
  - Test touch interactions
  - Verify responsive design

### Cross-Browser Testing (Critical Features Only)

For critical features (authentication, payments, data entry):

- [ ] **Chrome/Edge** (Chromium)
- [ ] **Firefox**
- [ ] **Safari** (if on Mac)

Look for:
- Layout differences
- JavaScript errors
- Feature behavior differences

### Performance Testing

- [ ] **Page load time:**
  - Open DevTools → Network tab
  - Hard reload (Ctrl+Shift+R)
  - Check "Load" time at bottom (should be < 3 seconds)

- [ ] **No memory leaks:**
  - Use feature extensively (click around, navigate)
  - Open DevTools → Memory tab
  - Take heap snapshot before and after usage
  - Memory should not grow indefinitely

- [ ] **Network requests reasonable:**
  - Open DevTools → Network tab
  - Should not see hundreds of requests
  - Should not see failed requests (red in Network tab)

### Accessibility Testing (Minimum)

- [ ] **Keyboard navigation:**
  - Tab through interactive elements
  - Should be able to reach all buttons/links
  - Focus indicators visible

- [ ] **Screen reader basics:**
  - Images have alt text
  - Buttons have descriptive labels
  - Forms have labels associated with inputs

### Security Testing (If Applicable)

- [ ] **SQL injection not possible** (if database changes)
- [ ] **XSS not possible** (if rendering user input)
- [ ] **Authentication required** (for protected routes)
- [ ] **Authorization enforced** (RLS policies working)
- [ ] **No secrets in client code** (check build output)

### Integration Testing

- [ ] **Frontend connects to backend:**
  - API calls succeed
  - Data displays correctly
  - Error handling works

- [ ] **Database operations work:**
  - Can create records
  - Can read records
  - Can update records
  - Can delete records

- [ ] **Third-party integrations work** (if applicable):
  - Supabase Auth
  - External APIs
  - File uploads to Supabase Storage

### Git Verification

- [ ] **All changes committed:**
  ```bash
  git status
  # Should show "nothing to commit, working tree clean"
  ```

- [ ] **Commit messages descriptive:**
  ```bash
  git log --oneline -5
  # Should clearly describe what changed
  ```

- [ ] **Feature branch up to date with main:**
  ```bash
  git fetch origin
  git log origin/main..HEAD
  # Shows commits that will be merged
  ```

### Lovable Settings Verification

- [ ] **Lovable working branch set correctly:**
  - Lovable Dashboard → Settings → Working Branch
  - Should match your feature branch name

- [ ] **Ready to switch back to main:**
  - After merge, you'll need to switch Lovable to "main"
  - Don't forget this step!

### Final Checks Before Merge

- [ ] **Preview deployment successful**
- [ ] **Zero console errors in preview**
- [ ] **Feature tested end-to-end in preview**
- [ ] **Mobile testing passed (at minimum in DevTools)**
- [ ] **No regressions in existing features**
- [ ] **Database security verified (if schema changes)**
- [ ] **All checklist items above completed**

### After Merge to Main

- [ ] **Switch Lovable working branch to main:**
  ```
  Lovable Dashboard → Settings → Working Branch → main
  ```

- [ ] **Wait for main deployment** (if auto-deploy enabled)

- [ ] **Test production:**
  - Visit www.vana.bot
  - Verify feature works in production
  - Check production logs for errors

- [ ] **Monitor for issues:**
  - Watch for user reports
  - Check error monitoring (if configured)
  - Review Supabase logs if needed

### If Something Breaks in Production

1. **Immediate rollback:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Switch Lovable to main** (if not already)

3. **Investigate on feature branch:**
   - Recreate issue locally
   - Fix the bug
   - Repeat testing checklist

4. **Communicate:**
   - Notify team
   - Document what went wrong
   - Update testing checklist to catch similar issues

---

**Remember:** Preview testing is FREE. Use it liberally. Better to catch issues in preview than in production!

---

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
2. **Tool selection** → Read this Tool Selection Decision Tree section
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

## 📖 Glossary of Key Terms

**Essential terminology for working with this project.**

### Project & Tools

**Claude Code**
VS Code extension that provides AI-powered coding assistance with access to specialized agents and MCP servers.

**Lovable Cloud**
Managed Supabase hosting platform that provides backend infrastructure, automatic deployments, and preview environments.

**Lovable AI**
AI-powered development assistant available through Lovable Dashboard. Uses credits for backend/database work.

**MCP (Model Context Protocol)**
Protocol that allows Claude to directly interact with external tools and services (like Supabase database).

**Supabase**
Open-source Firebase alternative providing PostgreSQL database, authentication, storage, and edge functions.

### Workflow Terms

**Working Branch (Lovable)**
The Git branch that Lovable AI will commit to when you ask it for changes. **Critical:** Must match your feature branch!

**Feature Branch**
A Git branch created for developing a specific feature. Always branch from `main`. Example: `feature/add-favorites`

**Preview Deployment**
FREE automatic deployment of feature branches to test URLs. Happens within 30-60 seconds of pushing to GitHub.

**Preview URL**
Temporary URL for testing feature branches before merging. Format: `https://feature-name--project.lovable.app`

**Publish**
Lovable action that deploys `main` branch to production (www.vana.bot). **Costs credits.** Only do after preview testing.

### Database & Security

**RLS (Row Level Security)**
PostgreSQL feature that controls which rows users can see/modify based on policies. **Required for all user-facing tables.**

**RLS Policy**
SQL rule that defines which users can access which rows. Example: `USING (auth.uid() = user_id)` means users only see their own data.

**Migration**
SQL script that changes database schema (CREATE TABLE, ALTER TABLE, etc.). Applied via `mcp__supabase__apply_migration`.

**DDL (Data Definition Language)**
SQL commands that change schema structure: CREATE, ALTER, DROP. Use `apply_migration` for DDL operations.

**DML (Data Manipulation Language)**
SQL commands that change data: SELECT, INSERT, UPDATE, DELETE. Use `execute_sql` for DML operations.

**Security Advisor**
Supabase tool (`get_advisors` with type: "security") that checks for missing RLS policies and vulnerabilities.

**Performance Advisor**
Supabase tool (`get_advisors` with type: "performance") that checks for missing indexes and slow queries.

### Development Concepts

**Backend-First**
Development approach: Build database & API first, then connect frontend. Recommended for data-driven features.

**Frontend-First**
Development approach: Build UI with mocks first, then add real backend. Good for UI-heavy features.

**Parallel Development**
Development approach: Build frontend and backend simultaneously. Requires clear API contract upfront.

**Optimistic Update**
UI pattern: Show change immediately, then sync with server. Improves perceived performance.

**Hot Reload / HMR (Hot Module Replacement)**
Vite feature that updates browser instantly when you save code. No full page reload needed.

### Agent Types

**Specialized Agent**
AI assistant with expertise in specific domain. Examples: `frontend-developer`, `mcp-expert`, `error-detective`.

**Agent Delegation**
Assigning a task to a specialized agent with complete context and clear instructions.

**Task Decomposition**
Breaking complex features into smaller, manageable tasks. Use `task-decomposition-expert` for this.

### Testing Terms

**End-to-End Testing**
Testing complete user flows from start to finish. Example: Signup → Login → Use feature → Logout.

**Regression Testing**
Verifying that existing features still work after changes. Prevents breaking old functionality.

**Edge Case**
Unusual scenario that might break your code. Examples: empty input, maximum length, special characters.

**Console Errors**
Red error messages in browser DevTools (F12 → Console tab). **Zero errors required** before merging.

**CORS (Cross-Origin Resource Sharing)**
Browser security feature. CORS errors mean frontend can't access backend API (usually a configuration issue).

### Git & Version Control

**HEAD**
Git pointer to your current commit. `HEAD~1` means "one commit before current."

**Origin**
Git remote repository (your GitHub repo). `origin/main` is the main branch on GitHub.

**Merge Conflict**
Occurs when same file modified differently on two branches. Must be resolved manually.

**Cherry-Pick**
Git command to copy a commit from one branch to another. Useful for moving commits to correct branch.

**Revert**
Git command to undo a commit by creating a new commit that reverses the changes. Safe for shared branches.

**Reset**
Git command to move branch pointer to different commit. **Dangerous on shared branches!** Use `revert` instead.

### TypeScript & Code

**Type Safety**
TypeScript feature that catches type errors at compile time instead of runtime.

**Type Inference**
TypeScript automatically figuring out types without explicit annotations.

**Generic Type**
Type that works with multiple data types. Example: `Array<T>` where `T` can be any type.

**Union Type**
Type that can be one of several types. Example: `"dark" | "light" | "system"` for theme.

**Discriminated Union**
Union type with a common property to distinguish between variants. Enables type narrowing.

**Barrel Export**
index.ts file that re-exports multiple modules. Example: `export * from "./button"` in `ui/index.ts`.

### Performance Terms

**Code Splitting**
Breaking JavaScript bundle into smaller chunks that load on demand. Improves initial page load.

**Lazy Loading**
Loading resources only when needed (not upfront). Used for routes, images, components.

**Virtualization**
Rendering only visible items in long lists. Dramatically improves performance for large datasets.

**Debouncing**
Delaying function execution until user stops typing. Prevents excessive API calls during search input.

**Throttling**
Limiting function execution frequency. Example: Only run scroll handler every 100ms.

### Architecture Patterns

**Clean Architecture**
Separating business logic from infrastructure concerns. Makes code testable and maintainable.

**Repository Pattern**
Abstracting data access behind an interface. Separates database queries from business logic.

**Service Layer**
Business logic layer between UI and database. Contains application-specific rules.

**Hook Pattern (React)**
Reusable logic encapsulated in custom hooks. Example: `useChatMessages` for message operations.

### Authentication & Authorization

**Authentication**
Verifying who the user is (login). Example: Email/password, OAuth, magic links.

**Authorization**
Verifying what the user can do (permissions). Example: Can user access this resource?

**JWT (JSON Web Token)**
Token format used by Supabase Auth. Contains user info and expiry time.

**Session**
User's authenticated state. Stored in localStorage, expires after inactivity.

**Session Validation**
Checking if user's session is still valid before operations. Use `ensureValidSession()`.

### Deployment & Infrastructure

**Edge Function**
Serverless function that runs on Supabase edge network. Similar to AWS Lambda or Cloudflare Workers.

**Cold Start**
Delay when serverless function hasn't run recently and must initialize. First request is slower.

**Environment Variables**
Configuration values stored in `.env` file. Examples: `VITE_SUPABASE_URL`, API keys.

**Build**
Process of converting source code to optimized production files. Run with `npm run build`.

**Bundle**
JavaScript file(s) produced by build process. Sent to browser for execution.

### Common Acronyms

**API** - Application Programming Interface
**CDN** - Content Delivery Network
**CRUD** - Create, Read, Update, Delete
**CSS** - Cascading Style Sheets
**DB** - Database
**FK** - Foreign Key
**HTML** - HyperText Markup Language
**HTTP** - HyperText Transfer Protocol
**JSON** - JavaScript Object Notation
**PK** - Primary Key
**PWA** - Progressive Web App
**REST** - Representational State Transfer
**SPA** - Single Page Application
**SQL** - Structured Query Language
**SSR** - Server-Side Rendering
**UI** - User Interface
**UX** - User Experience
**UUID** - Universally Unique Identifier
**XSS** - Cross-Site Scripting

### Project-Specific Terms

**Artifact**
Rendered output in the chat (code, HTML, React component, Mermaid diagram). Displayed in artifact canvas.

**Artifact Canvas**
Right panel in chat interface where artifacts are rendered. Resizable and scrollable.

**Chat Session**
Conversation between user and AI. Stored in `chat_sessions` table with messages in `chat_messages`.

**Message Streaming**
Real-time display of AI responses as they're generated (not waiting for complete response).

**Virtualized Message List**
Performance-optimized chat message display that only renders visible messages.

---

### Quick Reference: When to Use What

| Term | Use When |
|------|----------|
| MCP tools | Direct database access, queries, migrations (FREE) |
| Lovable AI | Complex backend, integrations, multi-table schema ($$) |
| Claude Code | Frontend work, local development (FREE) |
| Specialized agents | Complex tasks, need expertise, planning (FREE) |
| Preview | Testing before merge (FREE) |
| Publish | Deploying to production ($$) |
| `apply_migration` | Schema changes (DDL) |
| `execute_sql` | Queries and data changes (DML) |
| `get_advisors` | Security & performance checks |
| Feature branch | All development work |
| Main branch | Production-ready code only |

---

**Last updated:** 2025-10-28
**Branch:** feature/workflow-documentation
**Status:** Ready for next task
