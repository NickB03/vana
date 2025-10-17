# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vana is a multi-agent AI platform built on Google's Agent Development Kit (ADK). It consists of a FastAPI backend with specialized AI agents and a Next.js frontend for real-time interaction.

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

**CORRECT GOOGLE ADK CHAT IMPLEMENTATION**:
- An ADK dispatcher-led agent network runs on port 8080. The dispatcher routes to planning and research sub-agents (e.g., `plan_generator`, `section_planner`, `section_researcher`, `research_evaluator`, `enhanced_search_executor`, `report_composer`).
- FastAPI backend (port 8000) should **proxy requests to ADK**, not run its own orchestrator

## Key Architecture

**Backend** (`/app`): FastAPI + Google ADK + LiteLLM/Gemini models
- Multi-agent system with specialized AI agents
- Real-time streaming via Server-Sent Events (SSE)
- Session management with GCS persistence
- Authentication: JWT/OAuth2/Firebase/development modes

**Frontend** (`/frontend`): Next.js + React + TypeScript + shadcn/ui (Prompt-Kit)
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
   - Provides `/health` and `/agent_network_sse/{sessionId}`; research SSE via ADK-compliant `GET /apps/{app}/users/{user}/sessions/{session}/run`

2. **Google Agent Development Kit (ADK)** (Port **8080**)
   - ADK refernce material located in /docs/adk/refs demonstrate proper ADK patterns and configuration
   - ADK web UI for agent management
   - Run with: `adk web agents/ --port 8080`
   - Provides visual interface for agent development
   - Manages ADK-specific agent configurations

3. **Frontend (Next.js)** (Port **3000**)
   - React-based user interface
   - Connects to FastAPI backend on port 8000
   - Real-time SSE streaming for chat updates

### Starting All Services (Recommended)
To prevent port conflicts and ensure a clean startup, use the dedicated script to launch all Vana services concurrently. This script will automatically terminate any old processes before starting new ones.

**This is the recommended way to start the development environment.**

```bash
# Start all services with PM2 (recommended for local dev)
pm2 start ecosystem.config.js
# Services:
# - Backend:  http://localhost:8000
# - ADK:      http://localhost:8080
# - Frontend: http://localhost:3000
```

PM2 manages these processes:
- **Backend API** (Port 8000)
- **Google ADK** (Port 8080)
- **Frontend UI** (Port 3000) - The frontend is pinned to port 3000 to guarantee stability.

### Important Configuration
- Frontend `.env.local` must have: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
- Frontend ADK path config (optional): `NEXT_PUBLIC_ADK_APP_NAME` (default: `vana`), `NEXT_PUBLIC_ADK_DEFAULT_USER` (default: `default`)
- The frontend connects to FastAPI (port 8000), NOT directly to ADK (port 8080)
- SSE endpoints:
  - Agent network: `/agent_network_sse/{sessionId}`
  - Research run (ADK-compliant): `GET /apps/{app}/users/{user}/sessions/{session}/run`
  - Recommended (secure) frontend proxy paths: `/api/sse/agent_network_sse/{sessionId}`, `/api/sse/apps/{app}/users/{user}/sessions/{session}/run`
- Quick check: `curl http://127.0.0.1:8000/health` or `lsof -i :8000`

#### Frontend SSE Proxy (Security)
To prevent JWT exposure in browser URLs, the frontend provides a secure SSE proxy under `/api/sse/...` which forwards Authorization headers server‑side and streams responses:
- Map `/api/sse/agent_network_sse/{sessionId}` → upstream `/agent_network_sse/{sessionId}`
- Map `/api/sse/apps/{app}/users/{user}/sessions/{session}/run` → upstream `/apps/{app}/users/{user}/sessions/{session}/run`
Use these proxy paths in the UI for all SSE connections.

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

## Code Style Guidelines

### Python (Backend)
```python
# Follow PEP 8 with project-specific conventions
# Linting: Ruff (configured in pyproject.toml)
# Formatting: Ruff format
# Type checking: mypy

# Type hints required for all functions
def process_message(message: str, user_id: int) -> dict[str, Any]:
    """Process user message and return response.

    Args:
        message: The user's input message
        user_id: Unique user identifier

    Returns:
        Dict containing processed response
    """
    return {"status": "success", "data": message}

# Use descriptive variable names
user_session_data = get_session(user_id)  # ✅ Good
usd = get_session(user_id)                # ❌ Bad

# Max line length: 100 characters
# Use trailing commas in multi-line structures
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://app.vana.com",  # ✅ Trailing comma
]
```

### TypeScript/React (Frontend)
```typescript
// ESLint + Prettier configured in .eslintrc
// Use functional components with hooks
// Props interfaces defined before components

// ✅ Correct pattern
interface ChatMessageProps {
  message: string;
  timestamp: Date;
  userId: string;
}

export function ChatMessage({ message, timestamp, userId }: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="chat-message">
      {message}
    </div>
  );
}

// Import order (enforced by ESLint):
// 1. React imports
import { useState, useEffect } from 'react';
// 2. Third-party libraries
import { format } from 'date-fns';
// 3. Local components
import { Button } from '@/components/ui/button';
// 4. Types
import type { Message } from '@/types';

// Naming conventions:
// - Components: PascalCase (ChatMessage)
// - Hooks: camelCase with 'use' prefix (useMessages)
// - Constants: UPPER_SNAKE_CASE (API_URL)
// - Functions: camelCase (handleSubmit)
```

### General Standards
- **DRY Principle**: Extract repeated logic into reusable functions
- **KISS Principle**: Keep implementations simple and readable
- **Comments**: Only for complex logic; code should be self-documenting
- **Error Handling**: Always handle errors explicitly, never silent failures
- **Async/Await**: Prefer over raw promises for readability
- **Security**: Never commit secrets, use environment variables

### File Organization
See [Project Structure](#project-structure) section below for complete directory layout.


## Project Structure

```
/app                      # Backend (FastAPI + ADK)
  /auth                   # Authentication modules
  /models                 # Data models
  /routes                 # API endpoints
  /integration           # ADK integration
  /tools                 # Agent tools
  server.py              # Main FastAPI app
  agent.py               # ADK agent definitions

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
1. **PRIMARY**: Google Gemini 2.5 Pro Flash requires Google AI Studio API key in `.env.local`
2. **FALLBACK**: OpenRouter with Qwen 3 Coder (FREE) - Set `OPENROUTER_API_KEY` in `.env.local`

## Testing Strategy

- **Backend**: 342+ tests covering auth, SSE, agents, sessions
- **Frontend**: Jest unit tests + Playwright E2E tests
- **Coverage requirement**: 85% minimum
- Run `make test` before committing changes

See [Common Development Commands](#common-development-commands) for test execution commands and [Test-Driven Development](#test-driven-development-tdd) for TDD workflow.


## Test-Driven Development (TDD)

### TDD Workflow: Red-Green-Refactor

**1. RED**: Write failing test first
```bash
# Backend example
uv run pytest tests/unit/test_new_feature.py -v
# Should fail - feature doesn't exist yet
```

```python
# tests/unit/test_message_processor.py
def test_process_message_returns_formatted_response():
    processor = MessageProcessor()
    result = processor.process("Hello")
    assert result["status"] == "success"
    assert result["data"] == "Hello"
    assert "timestamp" in result
```

**2. GREEN**: Implement minimal code to pass
```python
# app/services/message_processor.py
from datetime import datetime

class MessageProcessor:
    def process(self, message: str) -> dict[str, Any]:
        return {
            "status": "success",
            "data": message,
            "timestamp": datetime.utcnow().isoformat()
        }
```

**3. REFACTOR**: Clean up while keeping tests green
```python
# Refactor for better structure
class MessageProcessor:
    def process(self, message: str) -> dict[str, Any]:
        return self._create_response(message)

    def _create_response(self, data: str) -> dict[str, Any]:
        return {
            "status": "success",
            "data": data,
            "timestamp": self._get_timestamp()
        }

    def _get_timestamp(self) -> str:
        return datetime.utcnow().isoformat()
```

### Frontend TDD Example
```typescript
// tests/components/ChatMessage.test.tsx
describe('ChatMessage', () => {
  it('renders message content', () => {
    render(<ChatMessage message="Hello" timestamp={new Date()} userId="1" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

// Then implement component to pass test
export function ChatMessage({ message }: ChatMessageProps) {
  return <div>{message}</div>;
}
```

### TDD Agents
See [Available Claude Flow Agents](#-available-claude-flow-agents-54-total) for complete agent list including TDD-specific agents.

### Best Practices
1. Write tests before implementation
2. Keep tests small and focused (one assertion per test preferred)
3. Use descriptive test names that explain the behavior
4. Mock external dependencies
5. Run tests frequently during development
6. Aim for >85% code coverage

## Google ADK Agent Starter Pack Guidance

### Core Principles
- Modify only the code tied to the requested change; keep surrounding structure, comments, and formatting intact.
- Mirror the repository's existing patterns before introducing new logic. Inspect nearby modules to match naming, templating, and directory placement.
- Search across `src/base_template/`, `src/deployment_targets/`, `.github/`, `.cloudbuild/`, and `docs/` so configuration, CI/CD, and documentation stay aligned.

### Architecture Snapshot
- **Templating Pipeline:** Cookiecutter variable substitution, Jinja2 logic execution, and templated file/directory names. A failure in any phase breaks project generation.
- **Key Directories:** `src/base_template/` (global defaults), `src/deployment_targets/` (environment overrides), `agents/` (self-contained templates with `.template/templateconfig.yaml`), and `src/cli/commands` for CLI entry points such as `create.py` and `setup_cicd.py`.
- **Template Processing Flow:** `src/cli/utils/template.py` copies the base template, overlays deployment target files, then applies agent-specific files.

### Jinja2 Rules of Thumb
- Close every `{% if %}`, `{% for %}`, and `{% raw %}` block to avoid generation failures.
- Use `{{ }}` for substitutions and `{% %}` for control flow logic.
- Trim whitespace with `{%-` / `-%}` when rendered output should not include extra newlines.

### Terraform and CI/CD Expectations
- Maintain a single `app_sa` service account across deployment targets; assign roles via `app_sa_roles` and reference the account consistently.
- Keep GitHub Actions (`.github/workflows/`) and Cloud Build (`.cloudbuild/`) workflows in sync, including variable naming (`${{ vars.X }}` vs. `${_X}`) and Terraform-managed secrets.

### Layer Overrides and Cross-File Dependencies
- Respect the four-layer order: base template → deployment target → frontend type → agent template. Place edits in the minimal layer and propagate overrides where necessary.
- Coordinate updates across `templateconfig.yaml`, `cookiecutter.json`, rendered templates, and CI/CD manifests to prevent drift.
- Wrap agent- or target-specific logic in conditionals such as `{% if cookiecutter.agent_name == "adk_live" %}`.

### Testing and Validation
- Exercise multiple combinations: agent types (`adk_live`, `adk_base`), deployment targets (`cloud_run`, `agent_engine`), and feature flags (`data_ingestion`, frontend options).
- Example scaffold command:
    ```bash
    uv run agent-starter-pack create myagent-$(date +%s) --output-dir target
    ```
- Watch for hardcoded URLs, missing conditionals, or dependency mismatches when introducing new extras.

## 🔍 Chrome DevTools MCP - Browser Verification Tool

**⚠️ CRITICAL**: Agents MUST verify frontend changes in real browsers. **NEVER assume tests passing = working UI.**

### When to Use (MANDATORY)
**ALWAYS use for**: Frontend changes, SSE debugging, auth flows, API integrations, performance issues, responsive design, network requests
**NEVER**: Assume tests alone verify browser behavior

### Essential Tools

**Input**: `click`, `fill`, `fill_form`, `hover`, `drag`, `upload_file`, `handle_dialog`
**Navigation**: `navigate_page`, `new_page`, `close_page`, `wait_for`
**Debugging**: `take_snapshot` (prefer over screenshot), `take_screenshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`
**Performance**: `performance_start_trace`, `performance_stop_trace`, `emulate_cpu`, `emulate_network`, `resize_page`

For complete tool list, see [MCP Tool Categories](#mcp-tool-categories) section.

### Core Verification Workflow
```javascript
// 1. Start services & navigate
Bash "make dev &"
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000" }

// 2. Inspect & interact
mcp__chrome-devtools__take_snapshot
mcp__chrome-devtools__fill { uid: "input-id", value: "test" }
mcp__chrome-devtools__click { uid: "button-id" }

// 3. Verify results
mcp__chrome-devtools__wait_for { text: "Success", timeout: 5000 }
mcp__chrome-devtools__list_console_messages
mcp__chrome-devtools__list_network_requests { resourceTypes: ["xhr", "fetch"] }
```

### Visual Iteration Workflow (Screenshot-Based UI Development)

**Pattern**: Design → Implement → Screenshot → Compare → Iterate

```javascript
// 1. Take baseline screenshot of target design
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000/design" }
mcp__chrome-devtools__take_screenshot { filePath: "/tmp/design-target.png" }

// 2. Implement UI changes
Write "frontend/src/components/Feature.tsx"

// 3. Capture implementation screenshot
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000/feature" }
mcp__chrome-devtools__take_screenshot { filePath: "/tmp/feature-v1.png" }

// 4. Compare visually and iterate
Read "/tmp/design-target.png"
Read "/tmp/feature-v1.png"
// Analyze differences, make adjustments

// 5. Test responsive layouts
mcp__chrome-devtools__resize_page { width: 375, height: 667 }  // Mobile
mcp__chrome-devtools__take_screenshot { filePath: "/tmp/feature-mobile.png" }
mcp__chrome-devtools__resize_page { width: 1920, height: 1080 }  // Desktop
mcp__chrome-devtools__take_screenshot { filePath: "/tmp/feature-desktop.png" }
```

**Use Cases**:
- Match design mockups pixel-perfectly
- Verify component styling across viewports
- Document UI states (loading, error, success)
- Capture before/after for refactoring
- Create visual regression tests

### SSE/Real-Time Debugging
```javascript
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000/chat" }
mcp__chrome-devtools__performance_start_trace { reload: true, autoStop: false }
mcp__chrome-devtools__fill { uid: "message-input", value: "test query" }
mcp__chrome-devtools__click { uid: "send-button" }
mcp__chrome-devtools__list_network_requests { resourceTypes: ["eventsource"] }
mcp__chrome-devtools__list_console_messages
mcp__chrome-devtools__performance_stop_trace
```

### Configuration

**Quick Setup**:
```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --channel stable --headless false
```

**If "Chrome Canary not found" error**:
```bash
claude mcp remove chrome-devtools
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --channel stable
```

**Channels**: `stable` (recommended), `canary`, `beta`, `dev`
**Options**: `--headless true/false`, `--isolated`, `--executablePath <path>`

For detailed configuration, see: https://github.com/salesforce/chrome-devtools-mcp

## Environment Configuration

Required `.env.local` variables:
- `BRAVE_API_KEY` - For web search capabilities
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `OPENROUTER_API_KEY` - For free AI model (recommended)
- `JWT_SECRET_KEY` - For authentication (or set `AUTH_REQUIRE_SSE_AUTH=false` for dev)

## 🚀 Available Claude Flow Agents (54 Total)

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

See [MCP Tool Categories](#mcp-tool-categories) for complete tool listing.

**KEY**: MCP coordinates strategy + verifies in browser, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@latest mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start  # Optional: Enhanced coordination
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

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages
5. **CRITICAL**: Use Chrome DevTools MCP to verify all frontend changes in live browser (see [Chrome DevTools MCP section](#-chrome-devtools-mcp---browser-verification-tool))


### Example Full-Stack Development:

For additional workflow patterns, see [Concurrent Execution Examples](#-concurrent-execution-examples) below.

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

// CRITICAL: After implementation, verify in browser (see Chrome DevTools MCP section)
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

### Best Practices
1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first
8. Always verify frontend changes in browser (see [Chrome DevTools MCP section](#-chrome-devtools-mcp---browser-verification-tool))


## Recommended Workflow (Anthropic Best Practices)

### Explore-Plan-Code-Commit Pattern

**Phase 1: EXPLORE**
```bash
# Before coding, explore the codebase
Read "relevant-file.py"
Glob "**/*.tsx"  # Find relevant files
Grep "class MessageProcessor" --output_mode content

# Understand the architecture
Read "app/server.py"
Read "frontend/src/App.tsx"
```

**Phase 2: PLAN**
```bash
# Create implementation plan
TodoWrite { todos: [
  {content: "Analyze existing authentication flow", status: "in_progress"},
  {content: "Design new OAuth integration", status: "pending"},
  {content: "Implement OAuth client", status: "pending"},
  {content: "Write tests for OAuth flow", status: "pending"},
  {content: "Update documentation", status: "pending"}
]}
```

**Phase 3: CODE**
```bash
# Implement incrementally, testing at each step
Write "app/auth/oauth.py"  # Implement
Bash "uv run pytest tests/unit/test_oauth.py"  # Test
Edit "app/server.py"  # Integrate
Bash "uv run pytest tests/integration/"  # Verify

# For frontend - verify in browser after changes
Write "frontend/src/auth/OAuthButton.tsx"
Bash "npm --prefix frontend test"
# Use Chrome DevTools MCP for browser verification (see dedicated section)
```

**Phase 4: VERIFY**
```bash
# Verify reasonableness at each step
Bash "make test"  # All tests pass
Bash "make lint"  # No linting errors
# For frontend: Use Chrome DevTools MCP to check browser console (see dedicated section)
```

**Phase 5: COMMIT**
```bash
# Commit with clear message
Bash "git add app/auth/oauth.py tests/unit/test_oauth.py"
Bash "git commit -m 'feat: add OAuth authentication support

- Implement OAuth 2.0 client
- Add tests for OAuth flow
- Update server integration

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>'
```

### Think Modes
- Use `planner` agent for complex architectural decisions
- Use `researcher` agent to investigate best practices
- Use `reviewer` agent for code quality checks
- Break complex problems into smaller, manageable tasks

### Course-Correction
- If tests fail unexpectedly, stop and investigate
- If implementation becomes complex, revisit the plan
- Ask for clarification when requirements are ambiguous
- Don't continue if something seems fundamentally wrong

## Context Management

### When to Use /clear
Context accumulates during long sessions and can affect Claude's performance. Use `/clear` to reset:

**Clear context when:**
1. Completing a major feature (entire workflow done)
2. Switching to an unrelated task
3. Claude seems confused or gives unexpected responses
4. Context has grown very large (20+ file reads)
5. Starting a new day of work

**Don't clear context when:**
- In the middle of implementing a feature
- Debugging an ongoing issue
- Need recent conversation history
- Working on related tasks

### How /clear Works
- Removes conversation history
- Preserves CLAUDE.md instructions
- Keeps important files in context (you can re-read if needed)
- Resets to fresh state

### Best Practices
```bash
# After completing authentication feature
/clear

# New task: "Now let's implement the chat interface"
Read "frontend/src/App.tsx"  # Re-establish context
TodoWrite { todos: [...] }  # New task list
```

### Alternative: /compact
Use `/compact` instead of `/clear` when you want to:
- Compress context without losing history
- Keep working on the same feature
- Maintain conversation flow

## Advanced Techniques

### Git Worktrees (Parallel Development)
Work on multiple features simultaneously without branch switching:

```bash
# Create worktree for new feature
git worktree add ../vana-oauth-feature feature/oauth-integration

# Now you have two directories:
# ~/Projects/vana          (main branch)
# ~/Projects/vana-oauth-feature  (feature/oauth-integration branch)

# Use Case 1: Multiple Claude instances
# Terminal 1 (main development)
cd ~/Projects/vana
claude  # Instance 1 working on main

# Terminal 2 (feature branch)
cd ~/Projects/vana-oauth-feature
claude  # Instance 2 working on OAuth

# Use Case 2: Parallel testing
# One worktree for development, another for testing
git worktree add ../vana-test main  # Clean testing environment
```

**Benefits:**
- No branch switching disruption
- Run tests on main while developing on feature
- Multiple Claude instances on different branches
- Faster context switching

### Multiple Claude Instances
Run several Claude Code instances for specialized tasks:

**Pattern 1: Role Separation**
```bash
# Terminal 1: Backend Development
cd ~/Projects/vana
claude
# Task: "Implement new API endpoints"

# Terminal 2: Frontend Development
cd ~/Projects/vana
claude
# Task: "Build UI components for new feature"

# Terminal 3: Testing & QA
cd ~/Projects/vana
claude
# Task: "Write tests and verify functionality"
```

**Pattern 2: Feature Isolation (with worktrees)**
```bash
# Instance 1: Feature A
cd ~/Projects/vana-feature-a
claude  # Working on authentication

# Instance 2: Feature B
cd ~/Projects/vana-feature-b
claude  # Working on chat interface

# Instance 3: Bug Fixes
cd ~/Projects/vana
claude  # Fixing production issues on main
```

**Pattern 3: Review & Development**
```bash
# Instance 1: Development
claude  # Implementing features

# Instance 2: Code Review
claude  # Reviewing and testing changes
# Use: reviewer agent, run tests, check code quality

# Instance 3: Documentation
claude  # Writing docs and updating README
```

### Headless Mode (Automation)
Use Claude Code in scripts and CI/CD pipelines:

```bash
# Automated code review
claude --headless "Review all changes in app/routes/ for security issues"

# Automated testing
claude --headless "Run all tests and report failures"

# Automated refactoring
claude --headless "Refactor app/services/message_processor.py to use async/await"

# CI/CD Integration
# .github/workflows/claude-review.yml
- name: Claude Code Review
  run: |
    claude --headless "Review PR changes for:
    1. Security vulnerabilities
    2. Code quality issues
    3. Test coverage
    4. Performance concerns"
```

**Use Cases:**
- Automated code reviews in CI/CD
- Batch processing tasks
- Scheduled refactoring
- Test generation
- Documentation updates

### Custom Slash Commands
Create reusable workflows for common tasks:

**Available in this project:**
- `/sparc` - SPARC methodology workflows
- `/cr-config` - CodeRabbit integration
- `/batchtools` - Parallel batch operations
- `/claude-flow-swarm` - Multi-agent coordination

**Creating Custom Commands:**
1. Add files to `.claude/commands/` directory
2. Define command behavior in markdown
3. Use for repetitive workflows

**Example: Custom testing command**
```markdown
# .claude/commands/full-test.md
---
name: full-test
description: Run complete test suite with coverage
---

Run the following commands in sequence:
1. Backend tests: `make test`
2. Frontend tests: `npm --prefix frontend test`
3. E2E tests: `npm --prefix frontend run test:e2e`
4. Check coverage: `make coverage-report`
```

Usage: `/full-test`

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

# Agent Development Kit (ADK)

An open-source, code-first Python toolkit for building, evaluating, and deploying sophisticated AI agents with flexibility and control.

Agent Development Kit (ADK) is a flexible and modular framework for developing and deploying AI agents. While optimized for Gemini and the Google ecosystem, ADK is model-agnostic, deployment-agnostic, and is built for compatibility with other frameworks. ADK was designed to make agent development feel more like software development, to make it easier for developers to create, deploy, and orchestrate agentic architectures that range from simple tasks to complex workflows.


✨ Key Features

Rich Tool Ecosystem
: Utilize pre-built tools, custom functions,
  OpenAPI specs, or integrate existing tools to give agents diverse
  capabilities, all for tight integration with the Google ecosystem.

Code-First Development
: Define agent logic, tools, and orchestration
  directly in Python for ultimate flexibility, testability, and versioning.

Modular Multi-Agent Systems
: Design scalable applications by composing
  multiple specialized agents into flexible hierarchies.

Deploy Anywhere
: Easily containerize and deploy agents on Cloud Run or
  scale seamlessly with Vertex AI Agent Engine.

🤖 Agent2Agent (A2A) Protocol and ADK Integration

For remote agent-to-agent communication, ADK integrates with the A2A protocol. See this  example for how they can work together.


🚀 Installation


Stable Release (Recommended)


You can install the latest stable version of ADK using pip:


pip install google-adk


The release cadence is weekly.


This version is recommended for most users as it represents the most recent official release.


Development Version


Bug fixes and new features are merged into the main branch on GitHub first. If you need access to changes that haven't been included in an official PyPI release yet, you can install directly from the main branch:


pip install git+https://github.com/google/adk-python.git@main


Note: The development version is built directly from the latest code commits. While it includes the newest fixes and features, it may also contain experimental changes or bugs not present in the stable release. Use it primarily for testing upcoming changes or accessing critical fixes before they are officially released.


📚 Documentation


Explore the full documentation for detailed guides on building, evaluating, and
  deploying agents:



Documentation


🏁 Feature Highlight


Define a single agent:


from google.adk.agents import Agent
from google.adk.tools import google_search

root_agent = Agent(
    name="search_assistant",
    model="gemini-2.0-flash", # Or your preferred Gemini model
    instruction="You are a helpful assistant. Answer user questions using Google Search when needed.",
    description="An assistant that can search the web.",
    tools=[google_search]
)



Define a multi-agent system:


Define a multi-agent system with coordinator agent, greeter agent, and task execution agent. Then ADK engine and the model will guide the agents works together to accomplish the task.


from google.adk.agents import LlmAgent, BaseAgent

# Define individual agents
greeter = LlmAgent(name="greeter", model="gemini-2.0-flash", ...)
task_executor = LlmAgent(name="task_executor", model="gemini-2.0-flash", ...)

# Create parent agent and assign children via sub_agents
coordinator = LlmAgent(
    name="Coordinator",
    model="gemini-2.0-flash",
    description="I coordinate greetings and tasks.",
    sub_agents=[ # Assign sub_agents here
        greeter,
        task_executor
    ]
)



Development UI


A built-in development UI to help you test, evaluate, debug, and showcase your agent(s).


Evaluate Agents


adk eval \
    samples_for_testing/hello_world \
    samples_for_testing/hello_world/hello_world_eval_set_001.evalset.json

**Source:** [adk-python repository](https://github.com/google/adk-python)

## ADK Documentation Resources

Comprehensive documentation available at [ADK Docs](https://github.com/google/adk-docs):

### Core Concepts
- **Agents**: Custom agents, LLM agents, multi-agent systems, workflow agents (loop, parallel, sequential)
- **Tools**: Built-in tools, function tools, OpenAPI integration, MCP tools, Google Cloud tools, authentication
- **Sessions & Context**: Session tracking, state management, memory service, conversational context

### Development & Deployment
- **Getting Started**: Installation, quickstart guides, testing agents
- **Deployment**: Cloud Run, GKE, Vertex AI Agent Engine
- **Streaming**: SSE streaming, WebSocket streaming, bidi-streaming, streaming tools
- **Advanced Features**: Callbacks, events, artifacts, runtime configuration

### Best Practices & Resources (docs/adk/refs)
- **Observability**: Arize AX integration, Phoenix integration
- **Safety & Security**: Security guidelines for AI agents
- **Tutorials**: Agent team building, progressive examples
- **Community**: Community resources, contributing guide

[Full documentation index →](https://github.com/google/adk-docs/blob/main/docs/)
[Python API Reference →](https://github.com/google/adk-docs/blob/main/docs/api-reference/python/)

---

Remember: **Claude Flow coordinates, Claude Code creates!**
