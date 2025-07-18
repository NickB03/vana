# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 Critical Requirements

**Python 3.13+ is MANDATORY** - The codebase will NOT function properly with older Python versions due to:
- Modern async patterns required by Google ADK
- SSL/TLS compatibility for production services
- Performance optimizations critical for agent coordination

**Development Process** - When responding to the user you should never respond without first completing all assigned tasks.  The only exception is if you need to ask clarifying questions in order ot continue. You should always use documented facts when responding you should never make assumptions based on partial knowledge. Before responding to the user always check your response and provide it an accuracy score from 1 through 10. ie; 10/10 (you confirmed your answer through documentation) 0/10 (you are making assumptions) 5/10 (you have a good idea but need to confirm)

Always verify: `python3 --version` should show Python 3.13.x

## 🏗️ Project Overview

VANA is an advanced agentic AI system featuring hierarchical multi-agent orchestration built on Google's Agent Development Kit (ADK). VANA is being migrated to ADK native patterns, but the core functionality is preserved. VANA is not operationally ready right now.  The last work done on VANA was to remove all documentation, outdated files, outdated code with the goal of making VANA a clean state to implement our required updates.  The goal is to align VANA with ADK standards while preserving some of the custom features that were implemented.

### 🆕 Agentic AI Architecture 

* TBD

## 🛠️ Development Commands

### 🚀 Quick Start
```bash
# One-command setup and run
make setup && make dev
```

### Makefile Commands
```bash
# Development
make help          # Show all available commands
make setup         # Install all dependencies
make dev           # Start development environment
make backend       # Start backend only

# Testing & Quality
make test          # Run all tests
make format        # Format code with black
make lint          # Run linting checks
make security      # Run security scan
make clean         # Clean generated files

# Docker
make docker-up     # Start with Docker Compose
make docker-down   # Stop Docker services
make docker-logs   # View Docker logs

# Deployment (Note: Scripts not yet implemented)
# Use gcloud commands directly for now
```

### Backend (Python/FastAPI)
```bash
# Install dependencies (requires Python 3.13+)
poetry install

# Start backend server
python main.py

# Run specific tests with markers
poetry run pytest -m unit          # Fast unit tests
poetry run pytest -m agent         # Agent tests
poetry run pytest -m integration   # Integration tests
poetry run pytest -m e2e          # End-to-end tests
poetry run pytest -m security      # Security tests
poetry run pytest -m performance   # Performance tests

# Code quality (run before committing)
poetry run black .                 # Format code
poetry run isort .                 # Sort imports
poetry run flake8                  # Linting
poetry run mypy .                  # Type checking
poetry run bandit -r .             # Security scan
```

### Development Environment Options
```bash
# Option 1: Make commands (recommended)
make setup && make dev

# Option 2: Docker Compose
docker-compose up

# Option 3: Manual startup
python main.py
```

## 🏛️ Key Architecture Components

### Agent System (`agents/`)
TBD

### Core Libraries (`lib/`)
TBD

### API Layer
TBD

## ⚠️ Known Issues & Solutions
TBD

### Infrastructure Status
TBD

## 🔍 Common Development Tasks

### Adding a New Tool
1. Create tool in `lib/_tools/` following ADK pattern
2. Register in appropriate agent's tool list
3. Add tests (test directory structure TBD)
4. Update documentation (docs structure TBD)

### Modifying Agent Behavior
1. Agent definitions in `agents/*/team.py` or `agents/*/specialist.py`
2. Model selection and prompts are configurable
3. Tools are loaded via ADK's tool system
4. Test with `poetry run pytest -m agent`

### Working with MCP Servers
**⚠️ CRITICAL: ChromaDB and Memory MCP servers are VS Code development tools ONLY - they are NOT part of the VANA runtime**

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
- **Location**: `lib/_shared_libraries/adk_memory_service.py` (Active, not archived)
- **Usage**: Automatically managed by VANA agents
- **Storage**: In-memory (development) or vector DB (production)
- **Purpose**: Agent task history and coordination
- **Status**: Implemented but vector search dependency archived

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
# ❌ WRONG - Will deploy from wrong directory
cd lib
gcloud run deploy vana-dev --source .

# ✅ CORRECT - Will deploy full project (~385 files)
cd /Users/nick/Development/vana
gcloud run deploy vana-dev --source .

# ✅ SAFE PATTERN - Use absolute paths when needed
python /Users/nick/Development/vana/main.py
```

#### Deployment Checklist:
1. **Verify directory**: `pwd` should show `/Users/nick/Development/vana`
2. **Check file count**: `find . -type f | wc -l` should show ~385 files (excluding .git and .archive)
3. **Verify Dockerfile**: `ls -la Dockerfile*` should show Dockerfile
4. **Note**: Frontend (vana-ui) has been archived - API only deployment

### Cloud Run Deployment Commands

#### Standard Deployment (Recommended)
```bash
# Ensure you're in project root
cd /Users/nick/Development/vana

# Note: Frontend (vana-ui) has been archived - API only deployment

# Deploy to development
gcloud run deploy vana-dev \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY,ENVIRONMENT=development" \
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
  --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY,ENVIRONMENT=production" \
  --port=8081 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --max-instances=50
```

#### Warning Signs of Wrong Directory:
- "Creating temporary archive of 102 file(s)" → You're in a subdirectory
- "Building using Buildpacks" → Missing Dockerfile, likely in wrong directory
- "totalling 811.4 KiB" → Too small, should be several MiB
- ADK web UI loads instead of VANA → Deployed from wrong directory

#### Recovery from Failed Deployment:
```bash
# 1. Return to project root
cd /Users/nick/Development/vana

# 2. Verify correct directory
pwd  # Should show: /Users/nick/Development/vana

# 3. Delete failed service (if needed)
gcloud run services delete vana-dev --region=us-central1 --quiet

# 4. Redeploy from correct directory
gcloud run deploy vana-dev --source . --region=us-central1 ...
```

### Deployment Types
- **Local**: Use `python main.py` or Docker Compose
- **Development**: Deploy to vana-dev for testing
- **Production**: Deploy to vana-prod with higher resource limits
- **Environment Variables**: Copy `.env.example` to `.env`
- **Required**: `GOOGLE_API_KEY` for Gemini models

## 💡 Tips

1. **Memory Service**: Currently using in-memory fallback. Vector DB integration pending.
2. **Code Execution**: Works in fallback mode without Docker. Full sandbox requires Docker.
3. **API Keys**: Set `GOOGLE_API_KEY` for Gemini models and web search features.
4. **Web Search Configuration**: 
   - **Primary**: Google Custom Search API (automatic with `GOOGLE_API_KEY`)
   - **Optional**: Set `GOOGLE_CSE_ID` for custom search engine (uses default if not set)
   - **Fallback**: DuckDuckGo when Google is unavailable or quota exceeded
   - **No Brave API Required**: Removed dependency on `BRAVE_API_KEY`
5. **Streaming Responses**: Backend supports streaming for real-time agent responses.

## 🔧 Claude Code Configuration

### Permission System
The project includes an optimized permission configuration in `.claude/settings.local.json` that reduces confirmation prompts by ~80% while maintaining security. This allows common development commands to execute immediately without interruption.

- **Auto-allowed**: Git operations, file reading, development tools, safe file operations
- **Always confirms**: `sudo` commands, system modifications, destructive operations
- **Configuration**: See `.claude/settings.local.json` for full permission list
- **Guide**: Permission guide has been archived

### Development Documentation
Development artifacts should be saved to `.development/` directory (gitignored):
- **Analysis** → `.development/analysis/` (currently has ADK analysis files)
- **ADK Resources** → `.development/adk-crash-course/`
- **Backups** → `.development/backups/`
- **Other artifacts** → Create subdirectories as needed

⚠️ MCP tools are for VS Code development sessions with Claude only.
They are NOT part of VANA's runtime memory or storage systems.

## 📁 New Development Files

### Configuration Files
- **Makefile**: Unified commands for all operations
- **docker-compose.yml**: Full stack development with PostgreSQL
- **.vscode/tasks.json**: VS Code task integration
- **.vscode/launch.json**: Debugging configurations

### Scripts
None currently - all functionality is available through Makefile commands

### Documentation
Currently minimal - this CLAUDE.md file serves as the primary developer guide

## 🔄 Code Quality

Use the Makefile commands or Poetry directly for code quality checks:

```bash
# Format and lint
make format   # Runs black
make lint     # Runs flake8
make security # Runs bandit

# Or use Poetry directly
poetry run black .
poetry run isort .
poetry run flake8
poetry run mypy .
poetry run bandit -r .
```