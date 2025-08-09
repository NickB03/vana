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

## 🧪 CLAUDE-FLOW ORCHESTRATION

Activate flow via:
