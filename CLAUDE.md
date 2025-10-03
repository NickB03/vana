# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vana is a multi-agent AI research platform built on Google's Agent Development Kit (ADK) that transforms complex research questions into comprehensive reports. It consists of a FastAPI backend with 8 specialized AI agents and a Next.js frontend for real-time interaction.

## ⚠️ CRITICAL: Browser Verification Required

**NEVER assume frontend changes work based on tests alone!**

When working on ANY frontend code (`/frontend` directory):
1. ✅ Make code changes
2. ✅ Run unit tests
3. ✅ **MANDATORY**: Use Chrome DevTools MCP to verify in live browser
4. ✅ Check console for errors: `mcp__chrome-devtools__list_console_messages`
5. ✅ Verify network requests: `mcp__chrome-devtools__list_network_requests`
6. ✅ Test UI interactions: `mcp__chrome-devtools__click`, `mcp__chrome-devtools__fill`
7. ✅ Confirm SSE streams work (for chat/research features)

**Why?** Tests can pass while the browser has:
- Console errors
- Network failures
- SSE connection issues
- Authentication problems
- UI rendering bugs

See [Chrome DevTools MCP section](#-chrome-devtools-mcp---critical-debugging--verification-tool) for detailed usage.

## ⚠️ CRITICAL ARCHITECTURE ISSUE (MUST FIX)

**INCORRECT IMPLEMENTATION (Current Problem)**:
- `/app/research_agents.py` contains `MultiAgentResearchOrchestrator` that incorrectly simulates agents
- This orchestrator tries to use its own LLM calls (OpenRouter/Gemini) instead of ADK
- **This is WRONG and causes the "no response" issue**

**CORRECT IMPLEMENTATION**:
- The 8 research agents (Team Leader, Plan Generator, Section Planner, etc.) are **ADK agents on port 8080**
- FastAPI backend (port 8000) should **proxy requests to ADK**, not run its own orchestrator
- Flow: Frontend → FastAPI → ADK Agents (port 8080) → Response via SSE

**TO FIX THE ISSUE**:
Replace orchestrator calls in `/app/routes/adk_routes.py` (lines 340-370) with:
```python
import httpx
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8080/run",
        json={
            "appName": "vana",
            "userId": user_id,
            "sessionId": session_id,
            "newMessage": {"parts": [{"text": research_query}]},
            "streaming": True
        }
    )
```

## Key Architecture

**Backend** (`/app`): FastAPI + Google ADK + LiteLLM/Gemini models
- Multi-agent system with 8 specialized research agents
- Real-time streaming via Server-Sent Events (SSE)
- Session management with GCS persistence
- Authentication: JWT/OAuth2/Firebase/development modes

**Frontend** (`/frontend`): Next.js + React + TypeScript + shadcn/ui
- Real-time chat interface with SSE streaming
- Performance-optimized React patterns
- Responsive design with Tailwind CSS

## 🚀 Service Architecture & Ports

### Service Components
The system consists of three main services that must be running:

1. **FastAPI Backend** (Port **8000**)
   - Main API server (`app.server`)
   - Handles SSE streams for chat
   - Manages sessions and authentication
   - Provides `/health` and `/api/run_sse` endpoints

2. **Google Agent Development Kit (ADK)** (Port **8080**)
   - ADK web UI for agent management
   - Run with: `adk web agents/ --port 8080`
   - Provides visual interface for agent development
   - Manages ADK-specific agent configurations

3. **Frontend (Next.js)** (Port **3000**)
   - React-based user interface
   - Connects to FastAPI backend on port 8000
   - Real-time SSE streaming for chat updates

### Starting All Services
```bash
# 1. Start FastAPI backend (port 8000)
make dev-backend
# OR
ENVIRONMENT=development AUTH_REQUIRE_SSE_AUTH=false uv run --env-file .env.local uvicorn app.server:app --reload --port 8000

# 2. Start ADK web UI (port 8080) - if needed
adk web agents/ --port 8080

# 3. Start frontend (port 3000)
make dev-frontend
# OR
cd frontend && npm run dev
```

### Important Configuration
- Frontend `.env.local` must have: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
- The frontend connects to FastAPI (port 8000), NOT to ADK (port 8080)
- SSE endpoints: `/api/run_sse/{sessionId}` and `/agent_network_sse/{sessionId}`
- Quick check: `curl http://127.0.0.1:8000/health` or `lsof -i :8000` to confirm the backend is running before invoking CLI agents.

## Common Development Commands

### Backend Development
```bash
# Install dependencies (uses uv package manager)
make install

# Start backend development server (port 8000)
make dev-backend
# Alternative: uv run --env-file .env.local uvicorn app.server:app --reload --port 8000

# Run backend tests
make test                    # All tests
make test-unit              # Unit tests only
make test-integration       # Integration tests only
uv run pytest tests/unit/test_specific.py -v  # Single test file

# Code quality
make lint                   # Run all linters (codespell, ruff, mypy)
make typecheck             # Type checking only
uv run ruff check . --fix  # Auto-fix linting issues
```

### Frontend Development
```bash
# Start frontend development server (port 3000)
make dev-frontend
# Alternative: npm --prefix frontend run dev

# Frontend commands (run from frontend/ directory)
npm run build              # Production build
npm run lint               # ESLint
npm run typecheck          # TypeScript checking
npm run test               # Jest tests
npm run test:e2e           # Playwright E2E tests
```

### Full Stack Development
```bash
# Start both backend and frontend
make dev                   # Runs both servers concurrently

# ADK Playground (for testing agents)
make playground            # Launches on port 8501
```

## Project Structure

```
/app                      # Backend (FastAPI + ADK)
  /auth                   # Authentication modules
  /models                 # Data models
  /routes                 # API endpoints
  /integration           # ADK integration
  /tools                 # Agent tools
  server.py              # Main FastAPI app
  agent.py               # ADK agent definition
  research_agents.py     # 8 specialized agents

/frontend                 # Frontend (Next.js)
  /src
    /components          # React components
    /hooks              # Custom React hooks
    /services           # API services
    /stores             # State management (Zustand)
    /types              # TypeScript types
  /tests                # Frontend tests

/tests                   # Backend test suite
  /unit                 # Unit tests
  /integration          # Integration tests
  /performance          # Performance tests
```

## AI Model Configuration

The system uses a two-tier model approach:
1. **PRIMARY**: OpenRouter with Qwen 3 Coder (FREE) - Set `OPENROUTER_API_KEY` in `.env.local`
2. **FALLBACK**: Google Gemini 2.5 Pro/Flash - Requires Google Cloud auth

## Testing Strategy

- **Backend**: 342+ tests covering auth, SSE, agents, sessions
- **Frontend**: Jest unit tests + Playwright E2E tests
- **Coverage requirement**: 85% minimum
- Run `make test` before committing changes

## 🔍 Chrome DevTools MCP - Critical Debugging & Verification Tool

**⚠️ CRITICAL REQUIREMENT**: Agents MUST use Chrome DevTools MCP to verify frontend changes work in real browsers. **NEVER assume something works just because tests pass.**

### What It Does
Chrome DevTools MCP provides live browser control and inspection capabilities, enabling agents to:
- Debug web applications in real-time
- Verify UI changes and interactions
- Analyze performance and network behavior
- Capture detailed browser insights

### When to Use (MANDATORY for Frontend Work)

**ALWAYS use Chrome DevTools MCP when:**
1. Making frontend UI changes
2. Debugging SSE streaming connections
3. Testing authentication flows
4. Verifying API integrations
5. Analyzing performance issues
6. Debugging browser console errors
7. Testing responsive designs
8. Validating form submissions
9. Checking network requests
10. **ANY TIME you make changes to `/frontend` directory**

**NEVER:**
- Assume tests passing means it works in browser
- Skip browser verification for "simple" changes
- Rely solely on unit tests for UI verification

**IF Chrome DevTools MCP Fails:**
If you get a "Chrome Canary not found" error:
1. **DO NOT give up on browser verification**
2. Check the [Configuration section](#configuration) for solutions
3. Inform the user they need to reconfigure Chrome DevTools MCP
4. Provide the specific command to fix: `claude mcp remove chrome-devtools && claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --channel stable`
5. Continue with other verification methods (check test output, review code for obvious errors)
6. Document that browser verification was skipped due to configuration issue

### Available Tools

#### Input Automation
- `mcp__chrome-devtools__click` - Click elements
- `mcp__chrome-devtools__fill` - Fill form fields
- `mcp__chrome-devtools__fill_form` - Fill multiple fields at once
- `mcp__chrome-devtools__hover` - Hover over elements
- `mcp__chrome-devtools__drag` - Drag and drop
- `mcp__chrome-devtools__upload_file` - File uploads
- `mcp__chrome-devtools__handle_dialog` - Handle browser dialogs

#### Navigation & Page Management
- `mcp__chrome-devtools__navigate_page` - Navigate to URL
- `mcp__chrome-devtools__navigate_page_history` - Back/forward navigation
- `mcp__chrome-devtools__new_page` - Open new tab
- `mcp__chrome-devtools__close_page` - Close tab
- `mcp__chrome-devtools__select_page` - Switch between tabs
- `mcp__chrome-devtools__list_pages` - List all open tabs
- `mcp__chrome-devtools__wait_for` - Wait for text/elements

#### Debugging & Inspection
- `mcp__chrome-devtools__take_snapshot` - Capture page structure (PREFER THIS over screenshots)
- `mcp__chrome-devtools__take_screenshot` - Visual screenshots
- `mcp__chrome-devtools__evaluate_script` - Execute JavaScript
- `mcp__chrome-devtools__list_console_messages` - View console logs
- `mcp__chrome-devtools__list_network_requests` - View network activity
- `mcp__chrome-devtools__get_network_request` - Get specific request details

#### Performance Analysis
- `mcp__chrome-devtools__performance_start_trace` - Start performance recording
- `mcp__chrome-devtools__performance_stop_trace` - Stop recording
- `mcp__chrome-devtools__performance_analyze_insight` - Analyze performance insights
- `mcp__chrome-devtools__emulate_cpu` - Throttle CPU (1-20x slowdown)
- `mcp__chrome-devtools__emulate_network` - Throttle network (3G/4G)
- `mcp__chrome-devtools__resize_page` - Test responsive layouts

### Integration with Development Workflow

#### Typical Frontend Verification Flow:
```javascript
// 1. Make code changes
Write "frontend/src/components/Chat.tsx"

// 2. Start services if not running
Bash "make dev-backend &"
Bash "make dev-frontend &"

// 3. Navigate to application
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000" }

// 4. Take snapshot to see page structure
mcp__chrome-devtools__take_snapshot

// 5. Interact with UI
mcp__chrome-devtools__fill { uid: "search-input", value: "test query" }
mcp__chrome-devtools__click { uid: "submit-button" }

// 6. Wait for response
mcp__chrome-devtools__wait_for { text: "Results", timeout: 5000 }

// 7. Check console for errors
mcp__chrome-devtools__list_console_messages

// 8. Verify network requests
mcp__chrome-devtools__list_network_requests { resourceTypes: ["xhr", "fetch"] }

// 9. Take screenshot for documentation (if needed)
mcp__chrome-devtools__take_screenshot { filePath: "verification.png" }
```

#### SSE Stream Debugging Example:
```javascript
// 1. Navigate to chat interface
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000/chat" }

// 2. Start performance trace
mcp__chrome-devtools__performance_start_trace { reload: true, autoStop: false }

// 3. Send message to trigger SSE
mcp__chrome-devtools__fill { uid: "message-input", value: "test research query" }
mcp__chrome-devtools__click { uid: "send-button" }

// 4. Monitor network for SSE connection
mcp__chrome-devtools__list_network_requests { resourceTypes: ["eventsource"] }

// 5. Check console for SSE events
mcp__chrome-devtools__list_console_messages

// 6. Stop trace and analyze
mcp__chrome-devtools__performance_stop_trace
```

### Best Practices

1. **Always take snapshots first** - Use `take_snapshot` over `take_screenshot` for element interaction
2. **Check console errors** - Always call `list_console_messages` after interactions
3. **Verify network requests** - Use `list_network_requests` to ensure API calls succeed
4. **Use performance tracing** - For debugging slow loads or SSE issues
5. **Test responsive designs** - Use `resize_page` to test different viewports
6. **Emulate slow conditions** - Use CPU/network throttling to catch performance issues

### Common Debugging Scenarios

#### Debug SSE Connection Issues:
1. Navigate to app
2. Open network monitoring
3. Send message
4. Check for SSE connection in network requests
5. Verify console for errors
6. Check if auth tokens are present

#### Debug UI Rendering Issues:
1. Take snapshot of page
2. Check console for React errors
3. Verify element UIDs are correct
4. Take screenshot for visual verification

#### Debug Performance:
1. Start performance trace
2. Perform user actions
3. Stop trace
4. Analyze insights for bottlenecks
5. Check Core Web Vitals

### Configuration

Chrome DevTools MCP requires proper Chrome installation and configuration.

#### Common Error: Chrome Canary Not Found

**Error**: `Could not find Google Chrome executable for channel 'canary'`

**Root Cause**: Chrome DevTools MCP is configured to use Chrome Canary channel, but it's not installed.

**Solutions** (choose one):

**Option 1: Use Stable Chrome (Recommended)**
```bash
# Check MCP server configuration
claude mcp list

# If chrome-devtools is configured with canary channel, reconfigure:
claude mcp remove chrome-devtools
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --channel stable
```

**Option 2: Install Chrome Canary**
1. Download from https://www.google.com/chrome/canary/
2. Install to `/Applications/Google Chrome Canary.app`
3. Restart Claude Code

**Option 3: Specify Custom Chrome Path**
```bash
# Use your system's Chrome installation
claude mcp remove chrome-devtools
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest \
  --executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

#### Recommended MCP Configuration

For Claude Code, configure Chrome DevTools MCP with stable channel:

```bash
# Add Chrome DevTools MCP with stable Chrome
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --channel stable --headless false
```

**Available Channels:**
- `stable` - Regular Chrome (recommended)
- `canary` - Chrome Canary (cutting-edge features)
- `beta` - Chrome Beta
- `dev` - Chrome Dev

**Useful Options:**
- `--headless true` - Run without visible browser window
- `--headless false` - Show browser window (better for debugging)
- `--isolated` - Use temporary profile (clean state each time)
- `--executablePath <path>` - Custom Chrome location

#### Verify Configuration

After configuring, test that Chrome DevTools MCP works:
```bash
# List MCP servers to confirm configuration
claude mcp list

# The chrome-devtools entry should show --channel stable or your custom path
```

#### Requirements

Before using Chrome DevTools MCP:
```bash
# Ensure services are running
make dev  # Starts both backend and frontend

# Confirm Chrome is installed
which "Google Chrome" || open -a "Google Chrome"
```

## Environment Configuration

Required `.env.local` variables:
- `BRAVE_API_KEY` - For web search capabilities
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `OPENROUTER_API_KEY` - For free AI model (recommended)
- `JWT_SECRET_KEY` - For authentication (or set `AUTH_REQUIRE_SSE_AUTH=false` for dev)

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools Provide Specialized Capabilities:

#### Coordination (Claude Flow / Ruv-Swarm)
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

#### Browser Debugging & Verification (Chrome DevTools)
- **CRITICAL**: Live browser testing and verification
- Real-time UI debugging
- Network and performance monitoring
- Console error detection
- SSE stream debugging
- Visual verification

**KEY**: MCP coordinates strategy + verifies in browser, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@latest mcp start  # v3.0+ with Claude Agent SDK
claude mcp add ruv-swarm npx ruv-swarm@latest mcp start  # Optional: Enhanced coordination
claude mcp add flow-nexus npx flow-nexus@latest mcp start  # Optional: Cloud features

# Install Claude Agent SDK (required for v3.0+)
npm install @anthropic-ai/claude-code@latest --save
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### Chrome DevTools (Browser Debugging & Verification)
**Input**: `click`, `fill`, `fill_form`, `hover`, `drag`, `upload_file`, `handle_dialog`
**Navigation**: `navigate_page`, `navigate_page_history`, `new_page`, `close_page`, `select_page`, `list_pages`, `wait_for`
**Debugging**: `take_snapshot`, `take_screenshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`, `get_network_request`
**Performance**: `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`, `emulate_cpu`, `emulate_network`, `resize_page`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

### Flow-Nexus MCP Tools (Optional Advanced Features)
Flow-Nexus extends MCP capabilities with 70+ cloud-based orchestration tools:

**Key MCP Tool Categories:**
- **Swarm & Agents**: `swarm_init`, `swarm_scale`, `agent_spawn`, `task_orchestrate`
- **Sandboxes**: `sandbox_create`, `sandbox_execute`, `sandbox_upload` (cloud execution)
- **Templates**: `template_list`, `template_deploy` (pre-built project templates)
- **Neural AI**: `neural_train`, `neural_patterns`, `seraphina_chat` (AI assistant)
- **GitHub**: `github_repo_analyze`, `github_pr_manage` (repository management)
- **Real-time**: `execution_stream_subscribe`, `realtime_subscribe` (live monitoring)
- **Storage**: `storage_upload`, `storage_list` (cloud file management)

**Authentication Required:**
- Register: `mcp__flow-nexus__user_register` or `npx flow-nexus@latest register`
- Login: `mcp__flow-nexus__user_login` or `npx flow-nexus@latest login`
- Access 70+ specialized MCP tools for advanced orchestration

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages
5. **CRITICAL**: Use Chrome DevTools MCP to verify all frontend changes in live browser

### Example Full-Stack Development:

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")

  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }

  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"

// CRITICAL: After implementation, verify in browser
[Browser Verification]:
  Bash "make dev &"  // Start services
  mcp__chrome-devtools__navigate_page { url: "http://localhost:3000" }
  mcp__chrome-devtools__take_snapshot  // See page structure
  mcp__chrome-devtools__fill_form { elements: [...test data...] }
  mcp__chrome-devtools__click { uid: "submit-button" }
  mcp__chrome-devtools__wait_for { text: "Success" }
  mcp__chrome-devtools__list_console_messages  // Check for errors
  mcp__chrome-devtools__list_network_requests { resourceTypes: ["xhr", "fetch"] }
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@latest hooks pre-task --description "[task]"
npx claude-flow@latest hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@latest hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@latest hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@latest hooks post-task --task-id "[task]"
npx claude-flow@latest hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT WORKFLOW: MCP Coordinates, Claude Code Executes

```javascript
// Step 1: MCP tools set up coordination (optional, for complex tasks)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }

// Step 2: Claude Code Task tool spawns ACTUAL agents that do the work
[Single Message - Parallel Agent Execution]:
  // Claude Code's Task tool spawns real agents concurrently
  Task("Research agent", "Analyze API requirements and best practices. Check memory for prior decisions.", "researcher")
  Task("Coder agent", "Implement REST endpoints with authentication. Coordinate via hooks.", "coder")
  Task("Database agent", "Design and implement database schema. Store decisions in memory.", "code-analyzer")
  Task("Tester agent", "Create comprehensive test suite with 90% coverage.", "tester")
  Task("Reviewer agent", "Review code quality and security. Document findings.", "reviewer")
  
  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {id: "1", content: "Research API patterns", status: "in_progress", priority: "high"},
    {id: "2", content: "Design database schema", status: "in_progress", priority: "high"},
    {id: "3", content: "Implement authentication", status: "pending", priority: "high"},
    {id: "4", content: "Build REST endpoints", status: "pending", priority: "high"},
    {id: "5", content: "Write unit tests", status: "pending", priority: "medium"},
    {id: "6", content: "Integration tests", status: "pending", priority: "medium"},
    {id: "7", content: "API documentation", status: "pending", priority: "low"},
    {id: "8", content: "Performance optimization", status: "pending", priority: "low"}
  ]}
  
  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/src/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

With v3.0 Claude Agent SDK integration:
- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement** (up to 4x with batch operations)
- **30% faster retry operations**
- **73% faster memory operations**
- **50% faster checkpoint creation**
- **27+ neural models**

## Hooks Integration

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

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. **ALWAYS use Chrome DevTools MCP for frontend verification** - Never assume tests pass = works in browser
2. Start with basic swarm init
3. Scale agents gradually
4. Use memory for context
5. Monitor progress regularly
6. Train patterns from success
7. Enable hooks automation
8. Use GitHub tools first
9. **Check console errors and network requests** after every frontend change
10. **Use performance tracing** to debug SSE and real-time features

## Migration to v3.0 with Claude Agent SDK

### Key Changes

**API Method Updates:**
- `client.executeWithRetry(request)` → `client.makeRequest(request)`
- `memory.persistToDisk()` → `memory.store(key, value)`
- `checkpoints.executeValidations()` → `checkpoints.create()`

**Configuration Updates:**
```json
// Old (v2.x)
{
  "retryAttempts": 3,
  "retryDelay": 1000
}

// New (v3.0+)
{
  "retryPolicy": {
    "maxAttempts": 3,
    "initialDelay": 1000,
    "backoffMultiplier": 2
  }
}
```

**Required Dependencies:**
```bash
npm install @anthropic-ai/claude-code@latest --save
```

**Configuration File Version:**
Update `.claude-flow.config.json` version to `"3.0.0"` and add SDK integration:
```json
{
  "version": "3.0.0",
  "sdk": {
    "anthropic": {
      "enabled": true,
      "integration": "@anthropic-ai/claude-code",
      "mode": "orchestration"
    }
  }
}
```

### Migration Checklist
- [x] Update MCP servers to latest versions
- [x] Install @anthropic-ai/claude-code SDK
- [x] Update .claude-flow.config.json to v3.0
- [x] Add retryPolicy configuration
- [x] Update SDK integration settings
- [ ] Test all workflows and swarm coordination
- [ ] Validate performance improvements

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Flow-Nexus Platform: https://flow-nexus.ruv.io (registration required for cloud features)

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
