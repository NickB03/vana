# CLAUDE.md

## 🧠 SYSTEM RULES — DO NOT EDIT

**Authoritative Scope:** This file defines the rules Claude Code must follow for this repository. User prompts and ad-hoc instructions must comply with CLAUDE.md.

**CRITICAL REQUIREMENT:** Follow the ADK Starter Pack “Getting Started” guide **exactly**. Before any implementation, query ChromaDB collections `adk_documentation` and `adk_knowledge_base_v2`. If results are unclear, pause and ask for clarification rather than guessing.

**Permissions Source of Truth:** Runtime approvals/config are defined in `.claude/permissions.dev.json`. If that file conflicts with CLAUDE.md wording, **the permissions file wins**.

---

## 📁 WORKSPACE STRUCTURE

### /Users/nick/Development/vana/
- Main ADK project directory (Git tracked)
- **Always launch Claude Code from here** (prevents virtualenv/CWD issues)
- Keep root clean (essential files only)

### /Users/nick/Development/vana/.claude_workspace/
- Working area for Claude documentation and planning
- Structure:
  - `planning/` — active planning docs
  - `reports/` — implementation & progress reports
  - `archive/` — completed docs (by type)
  - `temp/` — temporary working files
- Use this for **all** non-essential documentation

### /Users/nick/Development/vana_vscode/
- MCP data storage (**not** Git tracked)
- Contains: `.claude/`, `.chroma_db/`, `.memory_db/`, MCP server code
- **Never** launch Claude from here

### Workflow Rules
- Launch from `/vana/` only
- `/vana/.mcp.json` points to MCPs in `/vana_vscode/` (view-only by default)
- All **code** changes live in `/vana/`
- MCP data persists in `/vana_vscode/`
- Documentation & reports live in `.claude_workspace/`
- **Do not** start from `/vana_vscode/` (ensures correct CWD for subagents)

---

## 🧭 PROJECT OVERVIEW (Local Dev Only)

**Project:** Vana (Virtual Autonomous Network Agents)  
**Foundation:** Google ADK `adk_gemini_fullstack`  
**UI:** 🚧 **FRONTEND REBUILD IN PROGRESS** (2025-08-09 to 2025-08-15)  
**Backend:** FastAPI + persistent session store ✅ **FULLY FUNCTIONAL**  
**Deployment:** Local-only in this profile (no prod actions)

---

## ☁️ CLOUD & RAG CONFIGURATION (READ-ONLY IDENTIFIERS)

- **Project Number:** `960076421399`
- **Project ID:** `analystai-454200`
- **Region:** `us-central1`
- **Secrets:** Google Secret Manager
- **Auth:** Firebase Auth
- **CI/CD:** Cloud Build (if/when enabled)

### RAG
- **Corpus:** `ragCorpora/2305843009213693952`
- **Embedding Model:** `text-embedding-005`
- **Vector DB:** `RagManaged`

### Buckets
- Logs: `vana-logs-data`
- Builds: `vana-builds`
- Sessions: `vana-session-storage`
- Vectors: `vector-search`

> These values are **read-only** here. Secrets remain in GSM; `.env*` files must not be written without explicit approval.

---

## 🔐 LOCAL DEVELOPMENT CONFIGURATION

**IMPORTANT:** For local development, use `.env.local` files (NOT `.env`):

1. **Root Directory:** `/Users/nick/Development/vana/.env.local`
   - Contains API keys for local development (Brave Search, OpenRouter, etc.)
   - CORS configuration for local dev servers
   
2. **App Directory:** `/Users/nick/Development/vana/app/.env.local`
   - Backend-specific configuration
   - Session database URIs
   - Google Cloud project settings

### Configuration Loading
- The Makefile automatically loads `.env.local` via `uv run --env-file .env.local`
- **Never commit `.env.local` files** - they contain sensitive API keys
- `.env.local` is in `.gitignore` to prevent accidental commits
- For production, secrets are stored in Google Secret Manager (GSM)

### Required Environment Variables for Local Dev
```bash
# .env.local
BRAVE_API_KEY=<get-from-gsm-or-brave-dashboard>
OPENROUTER_API_KEY=<if-using-openrouter>
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
GOOGLE_CLOUD_PROJECT=analystai-454200
```

**Security Note:** The Brave API key was previously exposed in source code and needs rotation. Get the new key from GSM: `projects/960076421399/secrets/brave-api-key`

---

## 🧠 PLAN MODE POLICY (LOCAL DEV)

**Default:** OFF for routine local development.

**Start in Plan Mode** only when the task is risky:
- DB schema/migrations or destructive DB ops
- Sweeping multi-area refactors
- RAG ingestion/corpus writes or retrieval pipeline changes
- Toolchain/infra changes (Node/Python/Docker, CI, MCP routing)
- Mass file operations (create/move/delete across many paths)

**While in Plan Mode**
- Allowed: read/list/grep/search, task planning, web fetch/search (read-only)
- Disallowed: file writes, package installs, process changes
- Present a multi-step plan and wait for approval before execution

---

## 🛑 MEMORY & CONTEXT HYGIENE

- Do **not** mix Vana project data with `memory-mcp` experimentation data
- `memory-mcp` usage is for local experiments only
- Re-read `CLAUDE.md` at session start or when it changes (avoid cached rules)

---

## 🧵 PARALLEL EXECUTION DIRECTIVES

Prefer parallelization for larger features using a 7-task split:

1. Component  
2. Styles  
3. Tests  
4. Types  
5. Hooks  
6. Integration  
7. Docs & Validation

**Per-task artifact:** write `./.claude_workspace/reports/<task>.work.txt` including:
- Files changed
- Commands run
- Test status/results

Use `claude-flow` swarm when changes span multiple areas.  
**Concurrency cap:** aim for ≤4 parallel jobs; exceed only if CPU is idle and work is I/O-bound.

---

## 🔍 DOCUMENTATION RETRIEVAL (MANDATORY BEFORE NEW FEATURES)

1. Query ChromaDB:
   - `adk_documentation`
   - `adk_knowledge_base_v2`
2. Use both semantic and keyword queries
3. If docs are unclear, **pause and ask questions**; do not proceed with guesses

---

## 🧪 TESTING REQUIREMENTS

All tasks **MUST** run the following in order before being marked complete.

### 1. Static & Unit Checks
Run static analysis and unit tests:
```bash
make test
make lint
make typecheck
```
- Fail immediately if any command exits with a non-zero code.

---

### 2. Local Runtime Smoke Tests

#### Frontend Check (port 5173):
```bash
make dev-frontend &
sleep 10
curl -f http://localhost:5173 || (echo "❌ Frontend did not respond on port 5173" && exit 1)
pkill -f "make dev-frontend"
```
- Ensures the frontend boots successfully and responds.

#### Backend Check (port 8000):
```bash
make dev-backend &
sleep 10
curl -f http://localhost:8000/health || (echo "❌ Backend did not respond on port 8000" && exit 1)
pkill -f "make dev-backend"
```
- Ensures the backend boots successfully and responds to a health check.

#### If SSE-only service (no /health endpoint):
```bash
pytest tests/e2e/test_sse.py --maxfail=1 --disable-warnings -q
```
- Verifies the SSE stream connects and produces valid event data.

---

### 3. End-to-End UI Verification (Playwright MCP)
Run Playwright MCP tests:
```bash
npx playwright test tests/ui
```
- Must verify core UI elements or SSE output are visible and correct.
- Capture screenshots on pass/fail and store them in:
```
.claude_workspace/reports/screenshots/
```

---

### 4. Output Proof in Work Report
For **every** completed task, output a `.claude_workspace/reports/<task>.work.txt` containing:
- Exact terminal output from **all** test steps above.
- File paths to Playwright screenshots.
- SSE/E2E logs if applicable.

---

### Completion Criteria
A task is **only complete** if:
1. All commands exit with code `0`.
2. Frontend responds on port `5173` and backend responds on port `8000` (or SSE passes).
3. Playwright MCP run confirms correct UI/state.
4. Required logs and screenshots are saved and referenced in the work report.