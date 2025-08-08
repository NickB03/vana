
# CLAUDE.md

## 🧠 SYSTEM RULES - DO NOT EDIT

**CRITICAL REQUIREMENT**: Follow the ADK Starter Pack Getting Started guide **EXACTLY**. Query the ChromaDB collections (`adk_documentation` and `adk_knowledge_base_v2`) before any implementation. Any deviation requires explicit user approval.

---

## 📁 WORKSPACE STRUCTURE

### /Users/nick/Development/vana/
- Main ADK project directory (Git tracked)
- Launch Claude Code from here (prevents virtualenv issues)
- Keep root directory clean (essential files only)

### /Users/nick/Development/vana/.claude_workspace/
- Claude Code working directory for documentation and planning
- Structure:
  - `/planning/` - Active planning documents
  - `/reports/` - Implementation and progress reports
  - `/archive/` - Old/completed documents (organized by type)
  - `/temp/` - Temporary working files
- Use this for ALL non-essential documentation

### /Users/nick/Development/vana_vscode/
- MCP data storage (NOT git tracked)
- Contains: .claude/, .chroma_db/, .memory_db/, MCP server code
- DO NOT launch Claude from here

### Workflow Rules
- Always launch Claude from `/vana/`
- `.mcp.json` in `/vana/` points to MCPs in `/vana_vscode/`
- All code changes go in `/vana/`
- MCP data persists in `/vana_vscode/`
- Documentation and reports go in `.claude_workspace/`

---

## 🧭 PROJECT OVERVIEW

**Project Name**: Vana (Virtual Autonomous Network Agents)  
**Foundation**: Google ADK `adk_gemini_fullstack`  
**UI**: Custom React frontend (WebSocket-enabled)  
**Backend**: FastAPI + persistent session store  
**Deployment**: Cloud Run, CI/CD via Google ADK pipeline

---

## ☁️ CLOUD & RAG CONFIGURATION

- **Project ID**: analystai-454200
- **Region**: us-central1
- **Secrets**: Google Secret Manager
- **Auth**: Firebase Auth
- **CI/CD**: Cloud Build pipelines

### RAG
- **Corpus**: `ragCorpora/2305843009213693952`
- **Embedding Model**: `text-embedding-005`
- **Vector DB**: `RagManaged`

### Buckets
- Logs: `vana-logs-data`
- Builds: `vana-builds`
- Sessions: `vana-session-storage`
- Vectors: `vector-search`

---

## 🧠 PLAN MODE POLICY

All implementations involving:
- Claude Flow orchestration
- Multi-agent workflows
- CI/CD operations
- Data ingestion or RAG changes  
**MUST start in Plan Mode.**

Claude must:
- Present a full multi-step plan
- Wait for user approval before executing
- Exit Plan Mode only after permission granted

---

## 🛑 MEMORY & CONTEXT HYGIENE

### Separation Rules
- Claude MUST NOT mix VANA and memory-MCP data
- Memory-MCP is for local experimentation only

### Context Refresh
- Re-read CLAUDE.md on every session start or CLAUDE.md change
- Avoid using cached rules

---

## 🧵 PARALLEL EXECUTION DIRECTIVES

Claude must **parallelize all feature requests** via 7-task split:

1. Component  
2. Styles  
3. Tests  
4. Types  
5. Hooks  
6. Integration  
7. Docs & Validation

Use `claude-flow` swarm if tasks affect multiple areas.

---

## 🔍 DOCUMENTATION RETRIEVAL

Before implementing **any new feature**:
1. Query ChromaDB:
   - `adk_documentation`
   - `adk_knowledge_base_v2`
2. Use semantic and keyword queries
3. Abort implementation if docs are unclear

---

## 🧪 CLAUDE-FLOW ORCHESTRATION RULES

Claude-flow is activated via:
```bash
npx -y claude-flow@alpha mcp start
```

Flow mode must:
- Use swarm spawning for multi-tool coordination
- Parallelize implementation based on dependency graph
- Reuse MCP tool interfaces

---

## 🚫 FILE SAFETY BOUNDARIES

**Safe to edit**:
- /vana/src/
- /vana/tests/
- /vana/docs/

**Never touch**:
- /vana_vscode/
- /venv/
- /.pytest_cache/
- /.mcp.json

---

## 🧪 TESTING RULES

- Write Pytest-based tests for new endpoints or agents
- Run tests before every commit:
```bash
pytest --maxfail=2
```
- Claude MUST NOT deploy without passing tests

---

## 🧰 MCP TOOLS INDEX

Documented tools available for:
- `chroma-vana`: Document storage/query
- `memory-mcp`: Knowledge graph
- `firecrawl`: Web scraping/research
- `docker-mcp`: Container operations
- `playwright`: Browser automation
- `browser-tools`: Audit tools (accessibility, SEO, perf)
- `kibo-ui`: UI design components
- `claude-flow`: Flow orchestration and agent swarms

---

## ✅ COMMITTING & DEPLOYMENT

Claude must:
- Format code before commits
- Commit message format:
```
<Title> (max 6 words)

Body: Explain what was implemented, tools used, and changes to CLAUDE.md if applicable.
```
- Deploy only from main branch after successful tests

---

## 🔓 AUTO-APPROVAL PERMISSIONS

### Commands Requiring NO Approval (Auto-Execute):
- **File Operations:**
  - Read any file in `/vana/` directory
  - Edit files in: `/vana/src/`, `/vana/frontend/src/`, `/vana/app/`, `/vana/tests/`
  - Create test files (`*.test.ts`, `*.test.tsx`, `*.test.py`)
  - Create type definitions (`*.d.ts`, `types/*.ts`)
  
- **Development Commands:**
  - All npm commands: `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`
  - Python commands: `pytest`, `python -m`, `pip list`, `pip show`
  - Git read commands: `git status`, `git diff`, `git log`, `git branch`, `git remote`
  - Directory navigation: `cd`, `pwd`, `ls`, `find`, `grep`
  - Process management: `ps`, `kill` (for dev servers only)
  - Environment checks: `which`, `node -v`, `python --version`, `npm -v`
  
- **MCP Operations:**
  - All ChromaDB queries and document additions
  - Memory graph operations (create, search, update)
  - Firecrawl web scraping
  - Kibo UI component queries
  - Claude Flow swarm operations (except production deployment)
  
- **Testing & Validation:**
  - Running all test suites
  - Linting and formatting
  - Type checking
  - Building for development
  - Starting development servers

### Commands Still Requiring Approval:
- **Critical Operations:**
  - `git push` to remote repositories
  - `gcloud` deployment commands
  - Database migrations or deletions
  - Production environment changes
  - Modifying `.env` files with secrets
  - Installing new packages (`npm install`, `pip install`)
  - Modifying CI/CD pipeline files
  - Changes to authentication/security code
  - Deleting files or directories
  - Modifying files outside `/vana/` directory
  
- **System Operations:**
  - Creating or modifying shell scripts
  - Changing file permissions (`chmod`, `chown`)
  - Network configuration changes
  - Docker operations on production containers
  - Modifying `.mcp.json` or MCP server configs

### Auto-Commit Rules:
- Claude can auto-commit (but NOT push) when:
  - All tests pass
  - Linting has no errors
  - Type checking passes
  - Changes are within approved directories
  - Commit follows the specified format
  
### Parallel Execution:
- Claude can run multiple approved commands in parallel without asking
- Batch operations on multiple files are auto-approved if individual operations would be

---
