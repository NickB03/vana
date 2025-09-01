# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vana** is a multi-agent AI research platform built on Google's Agent Development Kit (ADK). It orchestrates 8 specialized AI agents to transform complex research questions into comprehensive, well-sourced reports using a two-phase approach: interactive planning followed by autonomous research execution.

### Tech Stack
- **Backend**: Python 3.10+, FastAPI, Google ADK 1.8.0, LiteLLM
- **Frontend**: Next.js 15, React 19 RC, TypeScript, shadcn/ui components  
- **Testing**: Pytest, Playwright, 340+ tests
- **Package Management**: UV (Python), pnpm (Node.js)
- **AI Models**: Primary - OpenRouter/Qwen3 Coder (free), Fallback - Google Gemini

## Core Development Commands

### Local Development
```bash
# Install all dependencies (Python + Node)
make install

# Start full stack development
make dev              # Both backend (8000) and frontend (3000)
make dev-backend      # Backend only on port 8000
make dev-frontend     # Frontend only on port 3000

# ADK playground
make playground       # Port 8501
```

### Testing & Quality
```bash
# Run all tests (unit + integration)
make test

# Code quality checks
make lint            # Ruff + MyPy + Codespell
make typecheck       # Type checking only

# Run specific test suites  
uv run pytest tests/unit -v
uv run pytest tests/integration -v
uv run pytest tests/performance -v

# Frontend tests
cd frontend && pnpm test
```

### Build & Deploy
```bash
# Local build validation
make build-local

# Docker development
make docker-build    # Build images
make docker-up       # Start services
make docker-down     # Stop services
```

## High-Level Architecture

### System Overview
The codebase implements a sophisticated multi-agent research system with real-time streaming capabilities:

```
Client → FastAPI Server → Google ADK Runtime → Agent Fleet → AI Models
           ↓                    ↓                  ↓           ↓
      SSE Streaming       Session Storage    Tool Registry  LiteLLM/Gemini
```

### Key Components

#### Backend (`/app`)
- **server.py**: FastAPI application, SSE streaming endpoints, authentication middleware
- **agent.py**: 8 specialized research agents (Team Leader, Plan Generator, Researchers, Evaluators, Report Writer)
- **auth/**: Multi-auth support (OAuth2/JWT, Firebase, API keys, dev mode)
- **utils/sse_broadcaster.py**: Real-time event streaming with memory leak prevention
- **monitoring/**: Performance metrics, alerting, caching optimizations
- **tools/brave_search.py**: Web search integration

#### Frontend (`/frontend`)
- **app/**: Next.js app router pages and layouts
- **components/**: React components using shadcn/ui design system
- **lib/**: Core utilities, database migrations, AI SDK integration
- **hooks/**: Custom React hooks for SSE, auth, UI state management

#### Testing (`/tests`)
- **unit/**: Component isolation tests
- **integration/**: API and agent workflow tests
- **performance/**: Memory leak detection, benchmarking
- **e2e/**: Full workflow validation

### Hivemind CRDT & Gossip
- Data types: G-Counter, PN-Counter, LWW-Register, OR-Set, OR-Map, RGA, Vector Clocks
- Sync: Gossip + anti-entropy with vector-clock-based reconciliation and Byzantine-tolerant checks
- Paths: `src/hive-mind/crdt/**`, `src/hive-mind/gossip/**`, `src/hive-mind/consensus/**`
- Core APIs: `applyDelta()`, `merge()`, `snapshot()`, `startSync()`, `stopSync()`
- Config env: `HIVEMIND_NODE_ID`, `HIVEMIND_PEERS`, `HIVEMIND_GOSSIP_INTERVAL_MS`
- Testing: `pnpm test` (ensure CRDT suites are included)

### Authentication Flow
The system supports multiple authentication modes configured via environment:
1. **Development**: `AUTH_REQUIRED=false` bypasses auth
2. **JWT**: Token-based auth with `JWT_SECRET_KEY`
3. **Firebase**: Managed auth service integration
4. **API Keys**: Simple key-based access

### Agent Coordination
Agents work in two phases:
1. **Planning Phase**: User reviews and approves research plan
2. **Execution Phase**: 8 agents work in parallel with quality checks

Each agent has specific responsibilities:
- Team Leader coordinates task distribution
- Planning agents structure research  
- Research agents gather information
- Quality agents validate results
- Report Writer synthesizes final output

### Real-Time Streaming
SSE (Server-Sent Events) provides live updates:
- Progress tracking per agent
- Token usage monitoring
- Error handling with graceful degradation
- Automatic reconnection logic

## Development Guidelines

### Environment Configuration
Create `.env.local` with:
```bash
# Required
BRAVE_API_KEY=your-brave-key
GOOGLE_CLOUD_PROJECT=your-project-id

# AI Models (choose one approach)
OPENROUTER_API_KEY=your-key  # Primary - FREE Qwen3 Coder
# Or rely on Google Cloud auth for Gemini fallback

# Authentication (choose one)
JWT_SECRET_KEY=your-secret  # For JWT auth
AUTH_REQUIRED=false         # For development
```

### Code Style
- Python: Ruff formatter, MyPy type checking, 88 char lines
- TypeScript: Biome formatter, ESLint, strict mode
- Tests: Pytest with asyncio, >85% coverage target
- Components: Always use shadcn CLI, never create manually

### Testing Strategy
- Write tests before implementation (TDD approach)
- Use fixtures in `conftest.py` for common setup
- Mock external services (Google Cloud, APIs)  
- Test both success and error paths
- Include performance regression tests

### Common Workflows

#### Adding New Features
1. Create feature branch from `main`
2. Write tests first
3. Implement with type hints
4. Run `make test && make lint`
5. Update documentation if needed

#### Creating Pull Requests with CodeRabbit Review
```bash
# 1. Create and push your feature branch
git checkout -b feature/your-feature
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature

# 2. Create PR via GitHub CLI (CodeRabbit auto-reviews)
gh pr create --title "feat: your feature" --body "Description of changes"

# 3. Apply CodeRabbit suggestions automatically
make coderabbit-apply PR=123  # Replace 123 with your PR number

# Or use the quick command
make crr ARGS="--pr 123 --apply"

# 4. CodeRabbit will automatically:
# - Review security, type safety, best practices
# - Check MyPy annotations for Python
# - Validate TypeScript types for frontend
# - Suggest improvements in PR comments
```

#### CodeRabbit Commands in PR Comments
You can trigger CodeRabbit actions by commenting on your PR:
- `@coderabbitai review` - Request comprehensive review
- `@coderabbitai mypy` - Check type annotations
- `@coderabbitai summary` - Generate PR summary

#### Debugging SSE Streaming
- Check `/health` endpoint first
- Monitor browser DevTools Network tab
- Look for memory leaks in long connections
- Verify CORS settings for cross-origin

#### Working with Agents
- Agents are defined in `app/agent.py`
- Each has specific tools and prompts
- Test individually before integration
- Monitor token usage per agent

## Critical Notes

### Performance Optimizations
- UV package manager for 40% faster Python installs
- Dependency groups minimize installation overhead
- SSE broadcaster prevents memory leaks
- Session persistence via GCS for stateless deploys

### Security Considerations  
- Never commit secrets (use `.env.local`)
- Validate all user inputs
- Rate limiting on API endpoints
- CORS configuration for production

### CI/CD Pipeline
- Parallel test execution matrix
- Smart change detection skips unchanged code
- UV caching for fast dependency resolution
- Automatic security scanning with Bandit/Safety

## Claude Flow & MCP Integration

### MCP Server Setup
```bash
# Add Claude Flow MCP server for agent coordination
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

### Memory Management
Use MCP memory tools for cross-session persistence and agent coordination:
```javascript
// Store memory
mcp__claude-flow__memory_usage { 
  action: "store", 
  key: "project/context", 
  value: "data",
  namespace: "vana"
}

// Retrieve memory
mcp__claude-flow__memory_usage { 
  action: "retrieve", 
  key: "project/context",
  namespace: "vana"
}

// Search memory patterns
mcp__claude-flow__memory_search {
  pattern: "api/*",
  namespace: "vana"
}
```

### Swarm Coordination
Initialize multi-agent swarms for complex tasks:
```javascript
// Initialize swarm topology
mcp__claude-flow__swarm_init { 
  topology: "mesh",  // or "hierarchical", "ring", "star"
  maxAgents: 6 
}

// Spawn specialized agents
mcp__claude-flow__agent_spawn { type: "researcher" }
mcp__claude-flow__agent_spawn { type: "coder" }
mcp__claude-flow__agent_spawn { type: "tester" }

// Orchestrate tasks
mcp__claude-flow__task_orchestrate {
  task: "Implement new feature with tests",
  strategy: "parallel"
}
```

### SPARC Development Methodology
Use SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) for systematic development:

```bash
# Core SPARC commands
npx claude-flow sparc modes              # List available modes
npx claude-flow sparc run <mode> "<task>" # Execute specific mode
npx claude-flow sparc tdd "<feature>"     # Run complete TDD workflow

# Batch execution
npx claude-flow sparc batch <modes> "<task>"  # Parallel execution
npx claude-flow sparc pipeline "<task>"        # Full pipeline
```

### Available MCP Tools

#### Coordination & Orchestration
- `swarm_init`, `agent_spawn`, `task_orchestrate` - Multi-agent coordination
- `swarm_status`, `agent_list`, `agent_metrics` - Monitoring
- `task_status`, `task_results` - Task tracking

#### Memory & State
- `memory_usage` - Store/retrieve persistent memory
- `memory_search` - Pattern-based memory search  
- `memory_backup`, `memory_restore` - Backup management
- `memory_namespace` - Namespace management

#### Performance & Neural
- `neural_status`, `neural_train`, `neural_patterns` - AI model management
- `benchmark_run`, `performance_report` - Performance analysis
- `bottleneck_analyze` - Identify performance issues

#### GitHub Integration
- `github_repo_analyze` - Repository analysis
- `github_pr_manage` - Pull request management
- `github_issue_track` - Issue tracking

### Hooks for Agent Coordination
When spawning agents, use coordination hooks:

```bash
# Before task
npx claude-flow@alpha hooks pre-task --description "task"

# After file edits
npx claude-flow@alpha hooks post-edit --file "file.py" --memory-key "swarm/agent/step"

# End session
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Troubleshooting

### Common Issues
- **Import errors**: Run `make install` to sync dependencies
- **Type errors**: Check `uv run mypy .` output
- **SSE not working**: Verify CORS and auth settings
- **Tests failing**: Ensure Google Cloud auth is configured
- **MCP not working**: Ensure `claude mcp add` command was run

### Debug Commands
```bash
# Check Python environment
uv pip list

# Verify Node modules
cd frontend && pnpm list

# Test API directly
curl http://localhost:8000/health

# Check Docker logs
make docker-logs

# Test MCP connection
npx claude-flow@alpha mcp test

# Check swarm status
npx claude-flow@alpha swarm status
```