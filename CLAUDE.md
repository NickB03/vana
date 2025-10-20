# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚡ Quick Reference (Start Here!)

**Most Critical Rules:**
1. ✅ ALWAYS verify frontend changes in live browser with Chrome DevTools MCP
2. ✅ NEVER commit .env.local or secrets
3. ✅ Use `pm2 start ecosystem.config.js` to start all services (Backend 8000, ADK 8080, Frontend 3000)
4. ✅ Backend: Python + FastAPI + ADK. Frontend: Next.js + React + TypeScript + shadcn/ui
5. ✅ Tests: `make test` before committing
6. ✅ FastAPI proxies to ADK (port 8080) - don't run separate orchestrator

**Common Commands:**
```bash
pm2 start ecosystem.config.js  # Start all services (recommended)
make test                       # Run all tests
make lint                       # Check code quality
make dev-backend               # Backend only (port 8000)
make dev-frontend              # Frontend only (port 3000)
npm --prefix frontend test     # Frontend tests
uv run pytest tests/unit/test_*.py -v  # Single backend test
```

**Key Files:**
- Backend: `/app/server.py` (FastAPI), `/app/agent.py` (ADK agents)
- Frontend: `/frontend/src/app/page.tsx` (main page)
- Config: `.env.local` (local development - NEVER commit)
- Tests: `/tests/unit/`, `/tests/integration/`, `/frontend/tests/`

**Decision Trees:**
- **MCP vs Claude Code**: Use MCP for coordination/monitoring/browser verification. Use Claude Code for file edits/bash/git.
- **ADK vs FastAPI**: Modify `/app/agent.py` for agent logic. Modify `/app/routes/` for API endpoints.
- **When to Ask**: Before modifying auth, database schema, or deploying to production.

**Environment Variables (Required):**
- `GOOGLE_API_KEY` (REQUIRED) - Primary AI model
- `OPENROUTER_API_KEY` (REQUIRED) - Fallback model
- `BRAVE_API_KEY` (OPTIONAL) - Web search
- `JWT_SECRET_KEY` (REQUIRED for auth) - Or set `AUTH_REQUIRE_SSE_AUTH=false` for dev

**Context Priority (if limited):**
1. Critical warnings (DO NOT rules, browser verification)
2. Architecture (3 services, ports, SSE streaming)
3. Code style (Python/TypeScript patterns)

## 🚫 DO NOT (Critical Rules)

- **DO NOT** assume frontend tests passing = working UI. Always verify in browser with Chrome DevTools MCP.
- **DO NOT** commit `.env.local`, API keys, secrets, or any sensitive data
- **DO NOT** modify ADK agent definitions without testing in ADK web UI first (`adk web agents/ --port 8080`)
- **DO NOT** create new test files unless explicitly requested by user
- **DO NOT** use theme accent colors for body text or UI labels (use neutral colors only)
- **DO NOT** manually edit `package.json` or `pyproject.toml` - use package managers (`npm install`, `uv add`)
- **DO NOT** modify database schema without user approval
- **DO NOT** deploy to production without explicit user permission
- **DO NOT** introduce new dependencies on deprecated `/agent_network_sse` endpoint
- **DO NOT** skip the Explore-Plan-Code-Commit workflow for complex changes
- **DO NOT** run FastAPI's own orchestrator - it should proxy to ADK on port 8080

## Project Overview

Vana is a multi-agent AI platform built on Google's Agent Development Kit (ADK). It consists of:

**Backend** (`/app`): FastAPI + Google ADK + LiteLLM/Gemini models
- Multi-agent system with specialized AI agents
- Real-time streaming via Server-Sent Events (SSE)
- Session management with GCS persistence
- Authentication: JWT/OAuth2/Firebase/development modes

**Frontend** (`/frontend`): Next.js 13+ + React + TypeScript + shadcn/ui (Prompt-Kit theme)
- Real-time chat interface with SSE streaming
- Performance-optimized React patterns
- Responsive design with Tailwind CSS

**ADK Integration**: ADK dispatcher-led agent network runs on port 8080, routing to specialized sub-agents (`plan_generator`, `section_planner`, `section_researcher`, `research_evaluator`, `enhanced_search_executor`, `report_composer`).

**Local ADK Reference Library**: `/docs/adk/refs/` contains 14+ production-ready ADK repositories including official Google samples, A2A protocols, agent-starter-pack templates, and real-world implementations.

## 🚀 Service Architecture & Ports

### Three Services (All Required)

1. **FastAPI Backend** (Port **8000**)
   - Main API server (`app.server`)
   - Proxies to ADK for agent orchestration
   - Handles SSE streams, sessions, authentication
   - SSE Endpoint: `POST /run_sse` (canonical)

2. **Google ADK** (Port **8080**)
   - ADK web UI for agent management
   - Run: `adk web agents/ --port 8080`
   - Manages agent configurations and orchestration

3. **Frontend** (Port **3000**)
   - Next.js React UI
   - Connects to FastAPI (port 8000), NOT directly to ADK
   - Real-time SSE streaming for chat

### Starting Services

**Recommended (PM2):**
```bash
pm2 start ecosystem.config.js
# Services: Backend (8000), ADK (8080), Frontend (3000)
```

**Alternative (Manual):**
```bash
make dev-backend   # Terminal 1
adk web agents/ --port 8080  # Terminal 2
make dev-frontend  # Terminal 3
```

**Health Check:**
```bash
curl http://127.0.0.1:8000/health
lsof -i :8000  # Check if port is in use
```

### Configuration

**Frontend `.env.local`:**
- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` (REQUIRED)
- `NEXT_PUBLIC_ADK_APP_NAME=vana` (default)
- `NEXT_PUBLIC_ADK_DEFAULT_USER=default` (default)

**Security:**
- Frontend SSE proxy at `/api/sse/...` prevents JWT exposure in browser URLs
- CSRF validation on all POST endpoints (frontend must send `X-CSRF-Token`)
- Authentication cookies use `secure=True` in production

## Common Development Commands

### Backend Development
```bash
make install                    # Install dependencies (uses uv)
make dev-backend               # Start backend (port 8000)
make test                      # All tests
make test-unit                 # Unit tests only
make test-integration          # Integration tests only
uv run pytest tests/unit/test_specific.py -v  # Single test
make lint                      # Run all linters (codespell, ruff, mypy)
make typecheck                 # Type checking only
uv run ruff check . --fix      # Auto-fix linting issues
```

### Frontend Development
```bash
make dev-frontend              # Start frontend (port 3000)
npm --prefix frontend run build       # Production build
npm --prefix frontend run lint        # ESLint
npm --prefix frontend run typecheck   # TypeScript checking
npm --prefix frontend run test        # Jest tests
npm --prefix frontend run test:e2e    # Playwright E2E tests
```

### Full Stack
```bash
make dev                       # Start both backend and frontend
make playground                # ADK Playground (port 8501)
```

### Dependency Management
```bash
# Backend (Python)
uv add <package>               # Add dependency
uv remove <package>            # Remove dependency
# DO NOT manually edit pyproject.toml

# Frontend (Node.js)
npm --prefix frontend install <package>   # Add dependency
npm --prefix frontend uninstall <package> # Remove dependency
# DO NOT manually edit package.json
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

### Frontend-Specific Rules
- **UI Components**: Use shadcn/ui components from Prompt-Kit theme
- **Theme Colors**: Use accent colors ONLY for buttons/accents/status indicators. Body text and UI labels must use neutral colors (dark gray/black in light mode, light gray/white in dark mode)
- **Responsive Design**: Test at breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop)
- **Performance**: Use React.memo, useMemo, useCallback for expensive operations

### General Standards
- **DRY Principle**: Extract repeated logic into reusable functions
- **KISS Principle**: Keep implementations simple and readable
- **Comments**: Only for complex logic; code should be self-documenting
- **Error Handling**: Always handle errors explicitly, never silent failures
- **Async/Await**: Prefer over raw promises for readability
- **Security**: Never commit secrets, use environment variables

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :8000  # Backend
lsof -i :8080  # ADK
lsof -i :3000  # Frontend

# Kill the process
kill -9 <PID>

# Or stop all PM2 processes
pm2 kill
```

### Frontend Tests Pass but Browser Shows Errors
```bash
# Use Chrome DevTools MCP to debug
mcp__chrome-devtools__list_console_messages
mcp__chrome-devtools__list_network_requests { resourceTypes: ["xhr", "fetch", "eventsource"] }
```

### SSE Streaming Not Working
1. Check: Is `ENABLE_ADK_CANONICAL_STREAM=true` set in backend `.env.local`?
2. Check: Is ADK running on port 8080? (`lsof -i :8080`)
3. Check: Is FastAPI proxy configured correctly? (`curl http://127.0.0.1:8000/health`)
4. Check browser console for SSE connection errors

### Authentication Failures
1. Check: Is `JWT_SECRET_KEY` set in `.env.local`?
2. For dev: Set `AUTH_REQUIRE_SSE_AUTH=false` to disable auth
3. Check: Are cookies being set correctly? (inspect browser DevTools > Application > Cookies)

### GCS Session Persistence Issues
1. Check: Is `GOOGLE_CLOUD_PROJECT` set in `.env.local`?
2. Check: Are GCP credentials configured? (`gcloud auth list`)
3. Fallback: Sessions will use in-memory storage if GCS unavailable

### ADK Agent Not Responding
1. Test in ADK web UI first: `adk web agents/ --port 8080`
2. Check ADK logs for errors
3. Verify agent definitions in `/app/agent.py`

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

### Chrome DevTools MCP - Essential Tools

**Input**: `click`, `fill`, `fill_form`, `hover`, `drag`, `upload_file`, `handle_dialog`
**Navigation**: `navigate_page`, `new_page`, `close_page`, `wait_for`
**Debugging**: `take_snapshot` (prefer over screenshot), `take_screenshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`
**Performance**: `performance_start_trace`, `performance_stop_trace`, `emulate_cpu`, `emulate_network`, `resize_page`

### Core Verification Workflow
```javascript
// 1. Start services & navigate
// (Services should already be running via pm2)
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })

// 2. Inspect & interact
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__fill({ uid: "input-id", value: "test" })
mcp__chrome-devtools__click({ uid: "button-id" })

// 3. Verify results
mcp__chrome-devtools__wait_for({ text: "Success", timeout: 5000 })
mcp__chrome-devtools__list_console_messages()
mcp__chrome-devtools__list_network_requests({ resourceTypes: ["xhr", "fetch"] })
```

### SSE/Real-Time Debugging
```javascript
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/chat" })
mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: false })
mcp__chrome-devtools__fill({ uid: "message-input", value: "test query" })
mcp__chrome-devtools__click({ uid: "send-button" })
mcp__chrome-devtools__list_network_requests({ resourceTypes: ["eventsource"] })
mcp__chrome-devtools__list_console_messages()
mcp__chrome-devtools__performance_stop_trace()
```

### Configuration
```bash
# Quick setup (recommended)
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --channel stable --headless false

# If "Chrome Canary not found" error
claude mcp remove chrome-devtools
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --channel stable
```

**Channels**: `stable` (recommended), `canary`, `beta`, `dev`
**Options**: `--headless true/false`, `--isolated`, `--executablePath <path>`

For detailed configuration: https://github.com/salesforce/chrome-devtools-mcp

## SSE Streaming (Server-Sent Events)

**Current Status**: Using canonical ADK streaming contract

**Primary Endpoint:**
- `POST /run_sse` - Canonical endpoint (enable with `ENABLE_ADK_CANONICAL_STREAM=true`)

**Legacy Endpoints (backward compatible):**
- `GET /apps/{app}/users/{user}/sessions/{session}/run` - Legacy SSE
- `POST /apps/{app}/users/{user}/sessions/{session}/run` - Trigger research

**Configuration:**
- Backend: Set `ENABLE_ADK_CANONICAL_STREAM=true` in `.env.local`
- Frontend: Set `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true` in `.env.local`
- Default: `false` (legacy mode) for safe rollout

**Frontend SSE Proxy (Security):**
- Canonical: `/api/sse/run_sse` → upstream `POST /run_sse`
- Legacy: `/api/sse/apps/{app}/users/{user}/sessions/{session}/run` → upstream `GET /apps/{app}/users/{user}/sessions/{session}/run`

**Security Requirements:**
- CSRF validation on all POST endpoints (frontend must send `X-CSRF-Token`)
- Keep `ALLOW_UNAUTHENTICATED_SSE` empty outside local development

## 🔀 Git Workflow

### Branch Naming
```bash
feature/<description>  # New features
fix/<description>      # Bug fixes
docs/<description>     # Documentation
refactor/<description> # Code refactoring
test/<description>     # Test additions/fixes
```

### Commit Message Format
```bash
# Use conventional commits format
<type>: <description>

<optional body>

<optional footer>

# Examples:
feat: add OAuth authentication support
fix: resolve SSE connection timeout issue
docs: update API documentation
refactor: simplify agent coordination logic
test: add unit tests for message processing
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Request Requirements
1. Create branch from `main`
2. Make changes and commit with clear messages
3. Run `make test` and `make lint` before pushing
4. Push branch and create PR
5. Add descriptive PR title and description
6. Wait for CI checks to pass
7. Request review if needed

### Commit Footer (Optional)
```bash
🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Testing Strategy

**Run before committing:** `make test`

### Test-Driven Development (TDD)
Follow Red-Green-Refactor cycle:
1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green

### Test File Locations & Naming
**Backend:**
- Unit tests: `/tests/unit/test_*.py`
- Integration tests: `/tests/integration/test_*.py`
- Middleware tests: `/tests/middleware/test_*.py`

**Frontend:**
- Unit tests: `/frontend/tests/*.test.ts` or `/frontend/tests/*.test.tsx`
- E2E tests: `/frontend/tests/e2e/*.spec.ts`

### Running Tests
```bash
# Backend
make test                    # All tests
make test-unit              # Unit tests only
make test-integration       # Integration tests only
uv run pytest tests/unit/test_specific.py -v  # Single test file

# Frontend
npm --prefix frontend test           # Jest tests
npm --prefix frontend run test:e2e   # Playwright E2E tests
```

### TDD Agents
Use `tdd-london-swarm`, `tester`, or `production-validator` agents for TDD workflows.

## Project Structure

```
/app                      # Backend (FastAPI + ADK)
  /auth                   # Authentication modules
  /models                 # Data models
  /routes                 # API endpoints
  /integration           # ADK integration
  /tools                 # Agent tools
  /middleware            # Security, CSRF, rate limiting
  server.py              # Main FastAPI app
  agent.py               # ADK agent definitions

/frontend                 # Frontend (Next.js 13+ App Router)
  /src
    /app                  # Next.js pages and API routes
    /components           # React components
    /hooks                # Custom hooks (includes store.ts, types.ts)
    /lib                  # Utilities and API client
  /tests                  # Frontend tests (Jest/Playwright)

/tests                   # Backend test suite
  /unit                 # Unit tests
  /integration          # Integration tests
  /middleware           # Middleware tests

/docs/adk/refs          # Local ADK reference library (14+ repos)
```

## ADK Documentation (Google Agent Development Kit)

### Overview
ADK is a flexible, code-first Python toolkit for building AI agents. While optimized for Gemini and Google ecosystem, it's model-agnostic and deployment-agnostic.

### Key Features
- **Rich Tool Ecosystem**: Pre-built tools, custom functions, OpenAPI specs
- **Code-First Development**: Define agent logic in Python
- **Modular Multi-Agent Systems**: Compose specialized agents into hierarchies
- **Deploy Anywhere**: Cloud Run, GKE, Vertex AI Agent Engine

### Installation
```bash
pip install google-adk  # Stable release (recommended)
pip install git+https://github.com/google/adk-python.git@main  # Development version
```

### Basic Usage
```python
from google.adk.agents import Agent
from google.adk.tools import google_search

root_agent = Agent(
    name="search_assistant",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant. Answer user questions using Google Search when needed.",
    description="An assistant that can search the web.",
    tools=[google_search]
)
```

### Local ADK Reference Library (`/docs/adk/refs/`)
A curated collection of **14+ production-ready reference repositories** cloned locally:

**Official Google ADK** (3 repos)
- `official-adk-python/` - Core Python SDK
- `official-adk-samples/` - Official examples

**Agent-to-Agent (A2A) Communication** (3 repos)
- `a2a-official-samples/` - Official A2A protocol implementations
- `a2a-multi-agent-samples/` - Advanced multi-agent patterns
- `awesome-a2a-protocol/` - Comprehensive A2A resource directory

**Production Templates**
- `agent-starter-pack/` - GCP production templates with Terraform, CI/CD ⭐
- `frontend-nextjs-fullstack/` - Full-stack Next.js + ADK integration

**Real-World Examples** (Financial Services)
- `marcus-ng-cymbal-bank/` - Hierarchical multi-agent banking platform
- `luis-sala-agent-bakeoff/` - Real-time streaming with debugging
- `brandon-hancock-agent-bakeoff/` - Multi-agent A2A orchestration
- `ayo-adedeji-finserv-agents/` - Hybrid AI + algorithmic architecture

**Quick Start**: See `/docs/adk/refs/README.md` for detailed descriptions and key files.

**Online Documentation:**
- [Full documentation](https://github.com/google/adk-docs/blob/main/docs/)
- [Python API Reference](https://github.com/google/adk-docs/blob/main/docs/api-reference/python/)

### ADK Web UI
```bash
adk web agents/ --port 8080  # Launch ADK web UI for agent management
```

## Recommended Workflow (Anthropic Best Practices)

### Explore-Plan-Code-Commit Pattern

**Phase 1: EXPLORE**
```bash
# Before coding, explore the codebase
# Use Claude Code's Read tool to view files
# Use Glob to find relevant files: **/*.tsx
# Use Grep to search for specific patterns
```

**Phase 2: PLAN**
```bash
# Create implementation plan with TodoWrite
# Break down complex tasks into smaller steps
# Use 'think' mode for complex architectural decisions
```

**Phase 3: CODE**
```bash
# Implement incrementally, testing at each step
# For backend: Write code, run tests, verify
# For frontend: Write code, run tests, verify in browser with Chrome DevTools MCP
```

**Phase 4: VERIFY**
```bash
make test  # All tests pass
make lint  # No linting errors
# For frontend: Use Chrome DevTools MCP to check browser console
```

**Phase 5: COMMIT**
```bash
# Commit with clear conventional commit message
# Include optional Claude Code footer
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

---

**Remember**: Claude Flow coordinates, Claude Code creates!


