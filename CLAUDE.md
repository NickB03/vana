# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: Concurrent Execution Rules

**ABSOLUTE RULE**: ALL operations MUST be concurrent/parallel in ONE message:

### 🔴 Mandatory Patterns:
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ minimum)
- **Task tool**: ALWAYS spawn ALL agents in ONE message
- **File operations**: ALWAYS batch ALL reads/writes/edits
- **Bash commands**: ALWAYS batch ALL terminal operations
- **Memory operations**: ALWAYS batch ALL store/retrieve

### ⚡ Golden Rule: "1 MESSAGE = ALL RELATED OPERATIONS"

✅ **CORRECT**: Everything in ONE message
```javascript
[Single Message]:
  - TodoWrite { todos: [10+ todos] }
  - Task("Agent 1"), Task("Agent 2"), Task("Agent 3")
  - Read("file1.js"), Read("file2.js")
  - Write("output1.js"), Write("output2.js")
  - Bash("npm install"), Bash("npm test")
```

❌ **WRONG**: Multiple messages (6x slower!)

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code
- `.claude_workspace/` - Claude-specific working files

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL:
- File operations (Read/Write/Edit/Glob/Grep)
- Code generation & programming
- Bash commands & system operations
- TodoWrite & task management
- Git operations & package management
- Testing, debugging & implementation

### MCP Tools ONLY:
- **claude-flow**: Swarm orchestration, SPARC modes, neural training
- **ruv-swarm**: Advanced swarm coordination, DAA agents
- **chroma-vana**: ChromaDB for ADK documentation queries
- **memory-mcp**: Knowledge graph and entity relationships
- **firecrawl**: Web scraping, search, and research
- **kibo-ui**: UI component library and templates
- **playwright**: Browser automation and testing
- **browser-tools-mcp**: Browser debugging and audits

**Key**: MCP coordinates, Claude Code executes!

## 🧭 PROJECT OVERVIEW (Local Dev Only)

**Project:** Vana (Virtual Autonomous Network Agents)  
**Foundation:** Google ADK `adk_gemini_fullstack`  
**UI:** 🚧 **FRONTEND REBUILD IN PROGRESS** (2025-08-09 to 2025-08-15)  
**Backend:** FastAPI + persistent session store ✅ **FULLY FUNCTIONAL**  
**Deployment:** Local-only in this profile (no prod actions)

**CRITICAL REQUIREMENT:** Follow the ADK Starter Pack "Getting Started" guide **exactly**. Before any implementation, query ChromaDB collections for official Google ADK documentation. If results are unclear, pause and ask for clarification rather than guessing.

## 📁 WORKSPACE STRUCTURE

### /Users/nick/Development/vana/
- Main ADK project directory (Git tracked)
- **Always launch Claude Code from here** (prevents virtualenv/CWD issues)
- Keep root clean (essential files only)
- Never save working files, text/mds and tests to the root folder

### /Users/nick/Development/vana/.claude_workspace/
- Working area for Claude documentation and planning
- Structure:
  - `planning/` — active planning docs
  - `reports/` — implementation & progress reports
  - `archive/` — completed docs (by type)
  - `temp/` — temporary working files
  - `screenshots/` — Playwright test screenshots
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

## 📦 SPARC Commands (Claude Flow Integration)

### Core:
- `npx claude-flow sparc modes` - List modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute mode
- `npx claude-flow sparc tdd "<feature>"` - TDD workflow
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel modes
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline

### Build (Vana Project):
- `make test` - Run Python tests
- `make lint` - Run linters
- `make typecheck` - Type checking
- `make dev-frontend` - Start frontend (port 5173)
- `make dev-backend` - Start backend (port 8000)

## 🤖 Agent Reference (54 Total)

### Core Development
| Agent | Purpose |
|-------|---------|
| coder | Implementation |
| reviewer | Code quality |
| tester | Test creation |
| planner | Strategic planning |
| researcher | Information gathering |

### Swarm Coordination
| Agent | Purpose |
|-------|---------|
| hierarchical-coordinator | Queen-led |
| mesh-coordinator | Peer-to-peer |
| adaptive-coordinator | Dynamic topology |
| collective-intelligence-coordinator | Hive-mind |
| swarm-memory-manager | Distributed memory |

### Specialized
| Agent | Purpose |
|-------|---------|
| backend-dev | API development |
| frontend-api-specialist | Modern frontend & React |
| mobile-dev | React Native |
| ml-developer | Machine learning |
| system-architect | High-level design |
| sparc-coder | TDD implementation |
| production-validator | Real validation |
| adk-multi-agent-engineer | Google ADK specialist |

### GitHub Integration
| Agent | Purpose |
|-------|---------|
| github-modes | Comprehensive integration |
| pr-manager | Pull requests |
| code-review-swarm | Multi-agent review |
| issue-tracker | Issue management |
| release-manager | Release coordination |

### Performance & Consensus
| Agent | Purpose |
|-------|---------|
| perf-analyzer | Bottleneck identification |
| performance-benchmarker | Performance testing |
| byzantine-coordinator | Fault tolerance |
| raft-manager | Leader election |
| consensus-builder | Decision-making |

## 🚀 Swarm Patterns

### Full-Stack Swarm (8 agents)
```bash
Task("Architecture", "...", "system-architect")
Task("Backend", "...", "backend-dev")
Task("Frontend", "...", "frontend-api-specialist")
Task("Database", "...", "coder")
Task("API Docs", "...", "api-docs")
Task("CI/CD", "...", "cicd-engineer")
Task("Testing", "...", "performance-benchmarker")
Task("Validation", "...", "production-validator")
```

### Agent Count Rules
1. **CLI Args First**: `npx claude-flow@alpha --agents 5`
2. **Auto-Decide**: Simple (3-4), Medium (5-7), Complex (8-12)

## 📋 Agent Coordination Protocol

### Every Agent MUST:

**1️⃣ START:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING (After EVERY step):**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[decision]"
```

**3️⃣ END:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]" --analyze-performance true
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🛠️ MCP Setup

### Key MCP Tools:
- `mcp__claude-flow__swarm_init` - Setup topology
- `mcp__claude-flow__agent_spawn` - Create agents
- `mcp__claude-flow__task_orchestrate` - Coordinate tasks
- `mcp__claude-flow__memory_usage` - Persistent memory
- `mcp__claude-flow__swarm_status` - Monitor progress

### Memory Management:
- Use `mcp__claude-flow__memory_usage` for persistent memory operations
- Actions: `store`, `retrieve`, `list`, `delete`, `search`
- Namespace isolation for different contexts (default: "default")
- TTL support for time-based expiration
- Pattern-based search with `mcp__claude-flow__memory_search`

### Memory Best Practices:
1. **Session Persistence**: Use `mcp__claude-flow__memory_persist` for cross-session data
2. **Namespace Organization**: Create logical namespaces for different features/modules
3. **Regular Backups**: Use `mcp__claude-flow__memory_backup` before major changes
4. **Compression**: Use `mcp__claude-flow__memory_compress` for large datasets

## 🔍 DOCUMENTATION RETRIEVAL (MANDATORY BEFORE NEW FEATURES)

### ChromaDB Collections (Google ADK Official Documentation Only)
1. **Query Required Collections:**
   - `adk_documentation` - Official Google ADK documentation
   - `adk_knowledge_base_v2` - ADK examples and best practices
   
2. **Query Strategy:**
   - Use semantic search for concepts and patterns
   - Use keyword search for specific APIs and methods
   - Cross-reference both collections for comprehensive understanding

3. **ChromaDB Usage:**
   - ChromaDB is **exclusively** for official Google ADK documentation
   - Do NOT store project-specific data in ChromaDB
   - Use claude-flow memory system for project state and context

4. **Validation:**
   - If docs are unclear, **pause and ask questions**
   - Never proceed with assumptions or guesses
   - Verify against official ADK patterns before implementation

## 🧠 PLAN MODE POLICY (LOCAL DEV)

**Default:** OFF for routine local development.
**plan_mode_default:** false

**While in Plan Mode**
- Allowed: read/list/grep/search, task planning, web fetch/search (read-only)
- Disallowed: file writes, package installs, process changes
- Present a multi-step plan and wait for approval before execution

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

### 4. Output Proof in Work Report
For **every** completed task, output a `.claude_workspace/reports/<task>.work.txt` containing:
- Exact terminal output from **all** test steps above.
- File paths to Playwright screenshots.
- SSE/E2E logs if applicable.

### Completion Criteria
A task is **only complete** if:
1. All commands exit with code `0`.
2. Frontend responds on port `5173` and backend responds on port `8000` (or SSE passes).
3. Playwright MCP run confirms correct UI/state.
4. Required logs and screenshots are saved and referenced in the work report.

## 📊 Progress Format

```
📊 Progress Overview
├── Total: X | ✅ Complete: X | 🔄 Active: X | ⭕ Todo: X
└── Priority: 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW
```

## 📈 Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## 🎯 Performance Tips

1. **Batch Everything** - Multiple operations = 1 message
2. **Parallel First** - Think concurrent execution
3. **Memory is Key** - Cross-agent coordination
4. **Monitor Progress** - Real-time tracking
5. **Enable Hooks** - Automated coordination

## 🔄 Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## 💡 Integration Tips
1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## ⚡ Quick Examples

### Research Task
```javascript
// Single message with all operations
mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 5 }
mcp__claude-flow__agent_spawn { type: "researcher" }
mcp__claude-flow__agent_spawn { type: "code-analyzer" }
mcp__claude-flow__task_orchestrate { task: "Research patterns" }
```

### Development Task
```javascript
// All todos in ONE call
TodoWrite { todos: [
  { id: "1", content: "Design API", status: "in_progress", priority: "high" },
  { id: "2", content: "Implement auth", status: "pending", priority: "high" },
  { id: "3", content: "Write tests", status: "pending", priority: "medium" },
  { id: "4", content: "Documentation", status: "pending", priority: "low" }
]}
```

## 🔗 Resources

- Vana ADK Project: https://github.com/NickB03/vana
- Claude Flow Docs: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- SPARC: https://github.com/ruvnet/claude-flow/docs/sparc.md

## 📞 Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Version: Claude Flow v2.0.0

---

**Remember**: Claude Flow coordinates, Claude Code creates!

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.