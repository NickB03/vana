# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 Critical Requirements

**Python 3.13+ is MANDATORY** - The codebase will NOT function properly with older Python versions due to:
- Modern async patterns required by Google ADK
- SSL/TLS compatibility for production services
- Performance optimizations critical for agent coordination

Always verify: `python3 --version` should show Python 3.13.x

## 🏗️ Project Overview

VANA is an advanced agentic AI system featuring hierarchical multi-agent orchestration built on Google's Agent Development Kit (ADK). With Phase 4 complete, VANA implements an enterprise-ready multi-level agent hierarchy with intelligent task routing, working specialist agents with real tools, workflow managers, and enhanced orchestration V2 with adaptive learning.

### 🆕 Agentic AI Architecture (Phase 4 Complete)

**Multi-Level Hierarchy**:
1. **VANA Chat Agent**: User interface, minimal tools, conversation handling
2. **Master Orchestrator**: Enhanced with caching, metrics, priority routing
3. **Project Managers**: Sequential/Parallel/Loop workflows (✅ Phase 4 complete)
4. **Specialist Agents**: Working specialists with real tools (✅ All complete):
   - **Architecture Specialist**: AST analysis, patterns, refactoring
   - **Data Science Specialist**: Statistics, analysis, cleaning
   - **Security Specialist (ELEVATED)**: Priority routing, scanning
   - **DevOps Specialist**: CI/CD, deployment, monitoring
   - **QA Specialist**: Test generation, coverage analysis
   - **UI/UX Specialist**: Component generation, accessibility
5. **Maintenance Agents**: Memory, Planning, Learning agents (Future enhancement)

**✅ Active Components** (Phase 4 Complete):
- ✅ VANA Chat + Enhanced Master Orchestrator + Orchestrator V2
- ✅ Working Specialist Agents with real tools
- ✅ Workflow Managers (Sequential, Parallel, Loop)
- ✅ Intelligent routing with multi-criteria scoring
- ✅ LRU caching for performance and metrics
- ✅ Thread-safe registry with double-checked locking
- ✅ Comprehensive test coverage (unit, integration, e2e)
- ✅ Adaptive learning and performance optimization
- ⏳ Maintenance agents (Future enhancement)

## 🛠️ Development Commands

### 🚀 Quick Start (NEW!)
```bash
# One-command setup and run
make setup && make dev

# Alternative: Use intelligent startup script
./scripts/start-dev.sh
```

### Makefile Commands (NEW!)
```bash
# Development
make help          # Show all available commands
make setup         # Install all dependencies
make dev           # Start full development environment
make backend       # Start backend only
make frontend      # Start frontend only

# Testing & Quality
make test          # Run all tests
make test-unit     # Unit tests only
make test-agent    # Agent tests only
make format        # Format code with black
make lint          # Run linting checks
make security      # Run security scan
make clean         # Clean generated files

# Docker
make docker-up     # Start with Docker Compose
make docker-down   # Stop Docker services
make docker-logs   # View Docker logs
```

### Backend (Python/FastAPI)
```bash
# Install dependencies (requires Python 3.13+)
poetry install

# Start backend server
python main.py                     # Standard
python main_agentic.py            # Agentic AI backend
./start_backend.sh                # Using startup script

# Environment validation (NEW!)
./scripts/validate-env.sh         # Check all prerequisites

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

### Development Environment Options (NEW!)
```bash
# Option 1: Make commands (recommended)
make setup && make dev

# Option 2: Docker Compose
docker-compose up

# Option 3: Improved startup script
./scripts/start-dev.sh            # Interactive with checks
./scripts/start-dev.sh --docker   # Force Docker mode
./scripts/start-dev.sh --local    # Force local mode

# Option 4: VS Code
# Press Cmd+Shift+B to start development environment
```

## 🏛️ Key Architecture Components

### Agent System (`agents/`)
- **VANA Orchestrator** (`agents/vana/team.py`): Main coordinator using Gemini 2.5 Flash
- **Enhanced Orchestrator** (`agents/vana/enhanced_orchestrator.py`): Phase 3 routing with caching/metrics
- **Specialists** (`agents/specialists/`): Phase 3 working specialists:
  - `architecture_specialist.py` + `architecture_tools.py`: Real AST analysis
  - `data_science_specialist.py` + `data_science_tools.py`: Pure Python stats
  - `security_specialist.py` + `security_tools.py`: ELEVATED priority scanning
  - `devops_specialist.py` + `devops_tools.py`: Config generation
- **Code Execution** (`agents/code_execution/`): Sandboxed execution (temp disabled)
- **Legacy Data Science** (`agents/data_science/`): Original implementation

### Core Libraries (`lib/`)
- **ADK Tools** (`lib/_tools/`): File operations, search, system tools
  - **Web Search** (`lib/_tools/google_search_v2.py`): Google Custom Search with DuckDuckGo fallback
- **Tool Registry** (`lib/_tools/registry.py`): Phase 3 thread-safe tool management
- **MCP Integration** (`lib/mcp/`): Model Context Protocol for VS Code only
- **Shared Services** (`lib/_shared_libraries/`):
  - `adk_memory_service.py`: VANA's actual memory (not MCP)
  - `orchestrator_metrics.py`: Phase 3 performance monitoring
- **Sandbox** (`lib/sandbox/`): Secure code execution environment

### API Layer
- FastAPI application in `main.py`
- Streaming API backend for UI integration
- CORS configured for ports 5173, 5177 and 5179
- Health check endpoint: `GET /health`

## ⚠️ Known Issues & Solutions

### Phase 3 Fixes Applied
- **Fixed**: Thread safety in registry.py (double-checked locking)
- **Fixed**: Missing imports in data_science/specialist.py
- **Fixed**: SQL injection pattern detection
- **Fixed**: Type errors in specialist tool placeholders

### Infrastructure Status
- ✅ Core tools: 100% functional
- ✅ Agent system: 4 working specialists + enhanced orchestrator
- ✅ Performance: <100ms routing, <1s average response
- ⚠️ Vector search: Not configured (using in-memory fallback)
- ⚠️ Docker: Optional (system works in fallback mode)
- ⚠️ Code Execution: Temporarily disabled (sandbox issues)

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
**⚠️ CRITICAL: MCP servers are VS Code development tools ONLY - they are NOT part of the VANA runtime**

1. MCP servers in `lib/mcp/servers/` are for VS Code Claude integration
2. Registry in `lib/mcp/core/mcp_registry.py` manages VS Code MCP connections
3. **Chroma MCP**: VS Code tool for semantic search during development (NOT VANA's memory)
4. **Memory MCP**: VS Code tool for maintaining dev context (NOT VANA's memory)
5. VANA's actual memory is in `lib/_shared_libraries/adk_memory_service.py`

## 🔌 MCP (Model Context Protocol) - VS Code Development Tools Only

**⚠️ CRITICAL DISTINCTION**:
- **MCP Tools**: Exclusively for VS Code local development with Claude
- **VANA Memory**: Production memory system in `lib/_shared_libraries/adk_memory_service.py`
- **These are completely separate systems**

### Available MCP Servers (VS Code Only)

#### 1. **Chroma Vector Database** (`mcp__chroma-vana`) - VS Code Development Tool
**NOT VANA's memory system** - This is a VS Code tool for semantic search during development.

**VS Code Usage**:
```python
# In VS Code with Claude - helps search your codebase
mcp__chroma-vana__chroma_create_collection(
    collection_name="dev_context",
    embedding_function_name="default"
)
```

#### 2. **Memory Management** (`mcp__memory-mcp`) - VS Code Development Tool
**NOT VANA's memory system** - This is a VS Code tool for maintaining context during development.

**VS Code Usage**:
```python
# In VS Code with Claude - helps remember development context
mcp__memory-mcp__create_entities(
    entities=[{
        "name": "Current Feature",
        "entityType": "task",
        "observations": ["Working on Docker setup"]
    }]
)
```

### VS Code MCP Configuration

**Configure in VS Code Claude extension settings** (not in VANA's .env files):
```json
// VS Code settings.json
{
  "mcp.servers": {
    "chroma-vana": {
      "command": "python",
      "args": ["-m", "lib.mcp.servers.chroma_server"]
    },
    "memory-mcp": {
      "command": "python",
      "args": ["-m", "lib.mcp.servers.memory_server"]
    }
  }
}
```

### VANA's Actual Memory System

VANA uses its own memory service for agent coordination:
- **Location**: `lib/_shared_libraries/adk_memory_service.py`
- **Usage**: Automatically managed by VANA agents
- **Storage**: In-memory (development) or vector DB (production)
- **Purpose**: Agent task history and coordination

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

### ⚠️ CRITICAL: Directory Requirements

**ALWAYS deploy from the project root directory** (`/Users/nick/Development/vana`). Deploying from subdirectories will cause failures.

#### Common Directory Issues and Solutions:
```bash
# ❌ WRONG - Will deploy only frontend (102 files)
cd vana-ui
gcloud run deploy vana-staging --source .

# ✅ CORRECT - Will deploy full project (795 files)
cd /Users/nick/Development/vana
gcloud run deploy vana-staging --source .

# ✅ SAFE PATTERN - Use subshells for temporary directory changes
(cd vana-ui && npm run build)  # Returns to original directory after
```

#### Deployment Checklist:
1. **Verify directory**: `pwd` should show `/Users/nick/Development/vana`
2. **Check file count**: `find . -type f | wc -l` should show ~795 files
3. **Verify Dockerfile**: `ls -la Dockerfile*` should show Dockerfile
4. **Frontend built**: `ls -la vana-ui/dist/index.html` should exist

### Cloud Run Deployment Commands

#### Standard Deployment (Recommended)
```bash
# Ensure you're in project root
cd /Users/nick/Development/vana

# Build frontend first
(cd vana-ui && npm run build)

# Deploy to staging
gcloud run deploy vana-staging \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="USE_OFFICIAL_AGENT_TOOL=true,USE_ADK_COORDINATION=true,USE_ADK_EVENTS=true,GOOGLE_API_KEY=$GOOGLE_API_KEY" \
  --port=8081 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --max-instances=10

# Deploy to production
gcloud run deploy vana-prod \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="USE_OFFICIAL_AGENT_TOOL=true,USE_ADK_COORDINATION=true,USE_ADK_EVENTS=true,GOOGLE_API_KEY=$GOOGLE_API_KEY" \
  --port=8081 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --max-instances=50
```

#### Warning Signs of Wrong Directory:
- "Creating temporary archive of 102 file(s)" → You're in vana-ui/
- "Building using Buildpacks" → Missing Dockerfile, likely in wrong directory
- "totalling 811.4 KiB" → Too small, should be ~7.4 MiB
- ADK web UI loads instead of VANA → Deployed from wrong directory

#### Recovery from Failed Deployment:
```bash
# 1. Return to project root
cd /Users/nick/Development/vana

# 2. Verify correct directory
pwd  # Should show: /Users/nick/Development/vana

# 3. Delete failed service (if needed)
gcloud run services delete vana-staging --region=us-central1 --quiet

# 4. Redeploy from correct directory
gcloud run deploy vana-staging --source . --region=us-central1 ...
```

### Deployment Types
- **Local**: Use `python main.py` or Docker Compose
- **Staging**: Deploy to vana-staging for testing
- **Production**: Deploy to vana-prod with higher resource limits
- **Environment Variables**: Copy `.env.example` to `.env`
- **Required**: `GOOGLE_API_KEY` for Gemini models

## 💡 Tips

1. **Memory Service**: Currently using in-memory fallback. Vector DB integration pending.
2. **Code Execution**: Works in fallback mode without Docker. Full sandbox requires Docker.
3. **Frontend Submodule**: `vana-ui` is a git submodule. Use `git submodule update --init` if needed.
4. **API Keys**: Set `GOOGLE_API_KEY` for Gemini models and web search features.
5. **Web Search Configuration**: 
   - **Primary**: Google Custom Search API (automatic with `GOOGLE_API_KEY`)
   - **Optional**: Set `GOOGLE_CSE_ID` for custom search engine (uses default if not set)
   - **Fallback**: DuckDuckGo when Google is unavailable or quota exceeded
   - **No Brave API Required**: Removed dependency on `BRAVE_API_KEY`
6. **Streaming Responses**: Backend supports streaming for real-time agent responses.

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
- **VS Code MCP data** → `.development/claude-memory/` (local dev context only)

**MCP Integration Guides (VS Code Development Only)**:
- `docs/mcp/CHROMA_MCP_GUIDE.md` - VS Code semantic search tool
- `docs/mcp/MEMORY_MCP_GUIDE.md` - VS Code context management tool

⚠️ These MCP tools are for VS Code development sessions with Claude only.
They are NOT part of VANA's runtime memory or storage systems.

See `CLAUDE_DEVELOPMENT_GUIDE.md` for documentation organization guidelines.

## 📁 New Development Files

### Configuration Files
- **Makefile**: Unified commands for all operations
- **docker-compose.yml**: Full stack development with PostgreSQL
- **Dockerfile.dev**: Development-optimized container
- **.pre-commit-config.yaml**: Enhanced code quality hooks
- **.vscode/tasks.json**: VS Code task integration
- **.vscode/launch.json**: Debugging configurations
- **.devcontainer/devcontainer.json**: Dev container support

### Scripts
- **scripts/validate-env.sh**: Environment validation with detailed checks
- **scripts/start-dev.sh**: Intelligent startup script with Docker/local modes
- **start-vana-ui.sh**: Improved with dependency checks and colors

### Documentation
- **DEVELOPMENT.md**: Comprehensive developer guide
- **TROUBLESHOOTING.md**: Common issues and solutions

## 🔄 Pre-commit Hooks

The project now includes comprehensive pre-commit hooks:

```bash
# Install pre-commit hooks
pre-commit install

# Run manually on all files
pre-commit run --all-files
```

**Included Hooks**:
- Black (Python formatting)
- isort (Import sorting)
- Flake8 (Linting)
- Bandit (Security checks)
- Shellcheck (Shell script validation)
- File checks (trailing whitespace, large files, etc.)