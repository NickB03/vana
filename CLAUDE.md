# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 Critical Requirements

**Python 3.13+ is MANDATORY** - The codebase will NOT function properly with older Python versions due to:
- Modern async patterns required by Google ADK
- SSL/TLS compatibility for production services
- Performance optimizations critical for agent coordination

Always verify: `python3 --version` should show Python 3.13.x

## 🏗️ Project Overview

VANA is a multi-agent AI system built on Google's Agent Development Kit (ADK) that orchestrates specialized agents for complex tasks. The system uses Gemini 2.0 Flash model and implements a distributed architecture with tool-based capabilities.

### Architecture Pattern
- **VANA Orchestrator**: Central hub with 8 core tools (plus optional memory) that delegates to specialists
- **Specialist Agents**: Code execution, data science, and domain-specific agents
- **Tool Ecosystem**: ADK tools provide capabilities (file ops, search, memory, etc.)
- **Shared Services**: Memory management, security, monitoring layers

## 🛠️ Development Commands

### Backend (Python/FastAPI)
```bash
# Install dependencies (requires Python 3.13+)
poetry install

# Start backend server
python main.py
# OR
./start_backend.sh

# Run specific tests
poetry run pytest -m unit          # Fast unit tests
poetry run pytest -m agent         # Agent tests
poetry run pytest -m integration   # Integration tests
poetry run pytest -m e2e          # End-to-end tests

# Code quality (run before committing)
poetry run black .                 # Format code
poetry run isort .                 # Sort imports
poetry run flake8                  # Linting
poetry run mypy .                  # Type checking
poetry run bandit -r .             # Security scan

# Run validation scripts
python scripts/run_critical_evaluation.py
./scripts/run_all_tests.sh
```

### Frontend (React/TypeScript)
```bash
cd vana-ui
npm install                        # Install dependencies
npm run dev                        # Start dev server (port 5173)
npm run build                      # Production build
npm run lint                       # ESLint checks
```

## 🏛️ Key Architecture Components

### Agent System (`agents/`)
- **VANA Orchestrator** (`agents/vana/team.py`): Main coordinator using Gemini 2.0 Flash
- **Code Execution** (`agents/code_execution/`): Sandboxed execution (fallback mode when Docker unavailable)
- **Data Science** (`agents/data_science/`): ML and analytics capabilities
- **Proxy Agents**: Memory/Orchestration agents delegate to VANA for backward compatibility

### Core Libraries (`lib/`)
- **ADK Tools** (`lib/_tools/`): File operations, search, system tools
- **MCP Integration** (`lib/mcp/`): Model Context Protocol for extensible integrations
- **Shared Services** (`lib/_shared_libraries/`): Memory, optimization, utilities
- **Sandbox** (`lib/sandbox/`): Secure code execution environment

### API Layer
- FastAPI application in `main.py`
- Streaming API backend for UI integration
- CORS configured for ports 5173, 5177 and 5179
- Health check endpoint: `GET /health`

## ⚠️ Known Issues & Solutions

### Critical Bug
- **Issue**: `coordinated_search_tool` error at `lib/_tools/search_coordinator.py:425`
- **Workaround**: Use individual search tools directly

### Infrastructure Status
- ✅ Core tools: 100% functional
- ✅ Agent system: Working
- ⚠️ Vector search: Not configured (using in-memory fallback)
- ⚠️ Docker: Optional (system works in fallback mode)

## 🔍 Common Development Tasks

### Adding a New Tool
1. Create tool in `lib/_tools/` following ADK pattern
2. Register in appropriate agent's tool list
3. Add tests in `tests/tools/`
4. Update tool documentation in `docs/api/tools/`

### Modifying Agent Behavior
1. Agent definitions in `agents/*/team.py` or `agents/*/specialist.py`
2. Model selection and prompts are configurable
3. Tools are loaded via ADK's tool system
4. Test with `poetry run pytest -m agent`

### Working with MCP Servers
1. MCP servers in `lib/mcp/servers/`
2. Registry in `lib/mcp/core/mcp_registry.py`
3. Add new servers following existing patterns (GitHub, Brave Search examples)

## 📋 Testing Strategy

Test markers hierarchy:
- `unit`: Fast, isolated component tests
- `agent`: Single agent logic tests
- `integration`: Multi-component communication
- `e2e`: Full system workflows
- `security`: Security and access control
- `performance`: Benchmarking tests

Always run relevant tests before committing:
```bash
poetry run pytest -m "unit or agent" -v  # Quick tests
poetry run pytest --cov=lib --cov=agents # With coverage
```

## 🚀 Deployment

- **Local**: Use `python main.py` or Docker Compose
- **Production**: Google Cloud Run ready (see `deployment/`)
- **Environment Variables**: Copy `.env.example` to `.env`
- **Required**: `GOOGLE_API_KEY` for Gemini models

## 💡 Tips

1. **Memory Service**: Currently using in-memory fallback. Vector DB integration pending.
2. **Code Execution**: Works in fallback mode without Docker. Full sandbox requires Docker.
3. **Frontend Submodule**: `vana-ui` is a git submodule. Use `git submodule update --init` if needed.
4. **API Keys**: Set `GOOGLE_API_KEY` for web search and AI features.
5. **Streaming Responses**: Backend supports streaming for real-time agent responses.

## 🔧 Claude Code Configuration

### Permission System
The project includes an optimized permission configuration in `.claude/settings.local.json` that reduces confirmation prompts by ~80% while maintaining security. This allows common development commands to execute immediately without interruption.

- **Auto-allowed**: Git operations, file reading, development tools, safe file operations
- **Always confirms**: `sudo` commands, system modifications, destructive operations
- **Configuration**: See `.claude/settings.local.json` for full permission list
- **Guide**: Refer to `CLAUDE_PERMISSIONS_GUIDE.md` for detailed information

### Development Documentation
Development artifacts should be saved to `.development/` directory (gitignored):
- Reports → `.development/reports/`
- Analysis → `.development/analysis/`
- Summaries → `.development/summaries/`
- Claude artifacts → `.development/claude-artifacts/`

See `CLAUDE_DEVELOPMENT_GUIDE.md` for documentation organization guidelines.