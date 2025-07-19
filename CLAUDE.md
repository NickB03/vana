# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## 🚨 Critical Requirements

**Python 3.13+ is MANDATORY** - The codebase will NOT function properly with older Python versions due to:
- Modern async patterns required by Google ADK
- SSL/TLS compatibility for production services
- Performance optimizations critical for agent coordination

**Development Process** - When responding to the user you should never respond without first completing all assigned tasks.  The only exception is if you need to ask clarifying questions in order to continue. You should always use documented facts when responding you should never make assumptions based on partial knowledge. Before responding to the user always check your response and provide it an accuracy score from 1 through 10. ie; 10/10 (you confirmed your answer through documentation) 0/10 (you are making assumptions) 5/10 (you have a good idea but need to confirm)

**ADK Compliance is MANDATORY** - Before implementing ANY code for VANA:
1. **ALWAYS** search the ADK knowledge base in ChromaDB first
2. **NEVER** implement patterns not documented in ADK
3. **VERIFY** all agent, tool, and deployment patterns against ADK docs
4. **UPDATE** the ADK knowledge base weekly (see ADK KB section)

### 🔴 CRITICAL: Required ADK Pattern Verification

Before implementing ANY code, you MUST query the ADK knowledge base for these core patterns:

#### 1. **Agent Creation Patterns** (ALWAYS CHECK FIRST)
```python
# Query for proper LlmAgent initialization
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["LlmAgent initialization", "agent name description model", "agent identity"],
    n_results=5
)
```

Key ADK Rules:
- ALWAYS use `LlmAgent` (or `Agent`) class, never custom implementations
- REQUIRED parameters: `name`, `model`, `instruction`
- Agent names must be unique, descriptive (e.g., `security_analyst`, not `agent1`)
- NEVER use reserved names like `user`
- Description is CRITICAL for multi-agent systems

#### 2. **Tool Implementation Patterns** (CHECK BEFORE CREATING TOOLS)
```python
# Query for FunctionTool patterns
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["FunctionTool", "tool docstring", "tool parameters", "creating effective tools"],
    n_results=5
)
```

Key ADK Rules:
- Functions are automatically wrapped as FunctionTool in Python
- Tool docstrings are CRITICAL - LLM uses them to understand tool purpose
- MUST include: What it does, When to use it, Parameter descriptions, Return format
- Parameters MUST have type hints, no defaults, be JSON serializable
- Return type MUST be a dictionary

#### 3. **Multi-Agent Orchestration** (CHECK BEFORE AGENT DELEGATION)
```python
# Query for multi-agent patterns
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["sub_agents", "AgentTool", "workflow agents", "agent delegation"],
    n_results=5
)
```

Key ADK Rules:
- Use `sub_agents` parameter for agent hierarchy, NOT tools list
- Use `AgentTool` wrapper when adding agent to tools list
- Workflow agents (Sequential, Parallel, Loop) do NOT use LLMs
- Agent descriptions are used by other agents for routing decisions

#### 4. **Common ADK Anti-Patterns to AVOID**
```python
# Query for mistakes and best practices
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["common mistakes", "best practices", "anti-patterns", "output_schema limitations"],
    n_results=5
)
```

NEVER DO:
- Create custom agent classes when ADK patterns exist
- Mix agents in tools list without AgentTool wrapper
- Use output_schema with tools (they're mutually exclusive)
- Implement custom flow control instead of Workflow agents
- Skip tool docstrings or use vague descriptions

### 📚 ADK Crash Course Examples
Key examples to reference (query ChromaDB for patterns):
- **Basic Agent**: `1-basic-agent/` - Minimal LlmAgent setup
- **Multi-Agent**: `7-multi-agent/` - Proper sub_agents and AgentTool usage
- **Workflow Agents**: `10-sequential-agent/`, `11-parallel-agent/`, `12-loop-agent/`
- **State Management**: `5-sessions-and-state/`, `6-persistent-storage/`

ALWAYS cross-reference your implementation with these examples by querying:
```python
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["example: <pattern you're implementing>"],
    n_results=3
)
```

**ChromaDB Long-Term Memory** - MUST be used proactively:
1. **Store** important decisions, architecture choices, and implementation details
2. **Query** before making assumptions about previous work or patterns
3. **Update** when discovering new patterns or completing major features
4. **Search** for context from previous conversations and implementations

Always verify: `python3 --version` should show Python 3.13.x

## 🎯 Context Engineering Principles

This project follows Context Engineering methodology for AI-assisted development:

### Core Workflow
1. **Initial Feature Request** - Define requirements in `INITIAL.md`
2. **Generate PRP** - Run `/generate-prp INITIAL.md` to create comprehensive blueprint
3. **Execute PRP** - Run `/execute-prp PRPs/feature-name.md` to implement
4. **Validate** - Follow validation loops defined in PRP

### Key Principles
- **High Information Density**: Every interaction should be information-rich
- **Comprehensive Context**: PRPs include all necessary implementation details
- **Validation Loops**: Built-in quality checks at each phase
- **Anti-Pattern Awareness**: Explicitly define what NOT to do

### Development Guidelines
- Always read existing PRPs before starting work
- Maintain task tracking in validation loops
- Follow project conventions identified in research phase
- Never assume missing context - ask for clarification
- Use examples from `examples/` folder as reference

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

### MCP Configuration

**MCP servers are configured in `.mcp.json` at the project root**:
```json
// .mcp.json
{
  "mcpServers": {
    "chroma-vana": {
      "autoApprove": ["chroma_query_documents", "chroma_get_documents", "chroma_get_collection_count", "chroma_list_collections", "chroma_add_documents"],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "python",
      "args": ["-m", "lib.mcp.servers.chroma_server"],
      "env": {
        "CHROMA_CLIENT_TYPE": "persistent",
        "CHROMA_DATA_DIR": "/Users/nick/Development/vana/.chroma_db"
      }
    },
    "memory-mcp": {
      "autoApprove": ["create_entities", "create_relations", "add_observations", "search_nodes", "read_graph"],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "python",
      "args": ["-m", "lib.mcp.servers.memory_server"],
      "env": {}
    },
    "firecrawl": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "$FIRECRAWL_API_KEY"
      }
    }
  }
}
```

**Note**: 
- These MCP servers are Claude Code development tools only, not part of VANA's runtime
- Stateful servers (Chroma, Memory) use Python implementations
- Stateless tools (Firecrawl) use NPM packages via npx
- Environment variables use `$VAR_NAME` syntax and must be set in your shell

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
TBD

## 📐 Project Conventions

### Code Organization
- **Agents**: All agents in `agents/` directory, following ADK LlmAgent pattern
- **Tools**: Consolidated in `lib/_tools/`, using ADK FunctionTool wrapper
- **Shared Libraries**: Core services in `lib/_shared_libraries/`
- **File Length**: Keep files under 500 lines for maintainability

### Import Patterns
```python
# Standard library imports first
import os
import sys

# Third-party imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Local imports (use absolute imports)
from lib._tools import adk_read_file
from lib.logging_config import get_logger
```

### ADK Patterns
- **Agent Definition**: Use LlmAgent with clear name, model, description, instruction
- **Tool Registration**: Wrap functions with FunctionTool or use as direct imports
- **Sub-agents**: Use sub_agents parameter, not tools list for agent delegation
- **Memory**: Use ADK memory patterns, not custom implementations

### Testing Patterns
- **Test Location**: Tests in `/tests` directory mirroring source structure
- **Test Naming**: `test_<module_name>.py` for test files
- **Markers**: Use pytest markers (unit, agent, integration, e2e, security, performance)
- **Coverage**: Aim for 80%+ test coverage on new code
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

## 📝 Claude Code Workspace Rules

### Temporary File Management
To prevent document sprawl and repository contamination, Claude Code MUST follow these rules:

#### 1. **ALWAYS Use Claude Workspace for Temporary Files**
```bash
# ✅ CORRECT - All temporary work goes in workspace
.claude_workspace/analysis.md
.claude_workspace/test_script.py
.claude_workspace/investigation_notes.md

# ❌ WRONG - Never create temp files in these locations
./random_analysis.md          # Don't pollute root
./lib/temp_investigation.md   # Don't pollute source
./agents/scratch_test.py      # Don't mix with production code
```

#### 2. **What Goes Where**
| File Type | Location | Example |
|-----------|----------|---------|
| Temporary analysis/planning | `.claude_workspace/` | `auth_analysis.md` |
| Scratch Python scripts | `.claude_workspace/` | `test_api.py` |
| Investigation notes | `.claude_workspace/` | `debug_notes.md` |
| VANA source code | Proper directories | `lib/`, `agents/`, `tests/` |
| Project docs | Root (only when needed) | `README.md`, `CLAUDE.md` |
| Active feature requests | Root | `INITIAL_*.md` (user created) |

#### 3. **Before Creating ANY File**
Ask yourself:
1. Is this temporary work? → Use `.claude_workspace/`
2. Is this VANA source code? → Use proper directory structure
3. Is this a requested document? → Only then create in root

#### 4. **Workspace Cleanup**
The `.claude_workspace/` directory:
- Is completely gitignored
- Can be cleaned anytime without data loss
- Should contain ONLY temporary work
- Has a `cleanup.sh` script for manual cleaning

#### 5. **Important: Date/Timestamp Handling**
When creating files that need timestamps:
```bash
# Always use system date, not training date
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE=$(date +"%Y-%m-%d")
```

### Examples of Correct Usage
```bash
# Starting investigation
echo "# Auth Pattern Analysis" > .claude_workspace/auth_investigation.md

# Testing something
cat > .claude_workspace/test_pattern.py << 'EOF'
# Quick test of ADK pattern
from google.adk import LlmAgent
# ... test code ...
EOF

# Saving important findings to ChromaDB (not a file)
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_patterns",
    documents=["Important pattern discovered..."],
    ids=[f"pattern_{timestamp}"],
    metadatas=[{"type": "discovery", "date": system_date}]
)

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

## 📚 ADK Knowledge Base

### Overview
The ADK Knowledge Base is a ChromaDB-powered semantic search system containing all Google ADK documentation. This is MANDATORY for all VANA development to ensure ADK compliance.

**Collection Name**: `adk_complete_docs`
**Location**: `.development/adk-knowledge-base/`
**Current Status**: 66 pages indexed, 16 document chunks

### Searching the ADK Knowledge Base

#### 1. Basic Pattern Search
```python
# Search for specific ADK patterns
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["LlmAgent implementation"],
    n_results=5
)
```

#### 2. Category-Specific Search
```python
# Search within a specific category
mcp__chroma-vana__chroma_get_documents(
    collection_name="adk_complete_docs",
    where={"category": "agents"},
    limit=10
)
```

#### 3. Code Example Search
```python
# Find documents with code examples
mcp__chroma-vana__chroma_get_documents(
    collection_name="adk_complete_docs",
    where={"has_code_examples": True},
    limit=20
)
```

#### 4. Multi-Query Search
```python
# Search for multiple related concepts
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=[
        "FunctionTool implementation",
        "tool registration patterns",
        "ToolContext usage"
    ],
    n_results=3
)
```

### Required ADK Checks Before Implementation

**ALWAYS perform these checks before writing ANY code:**

1. **Agent Implementation Check**
   ```python
   mcp__chroma-vana__chroma_query_documents(
       collection_name="adk_complete_docs",
       query_texts=["LlmAgent", "BaseAgent", "agent initialization"],
       n_results=5
   )
   ```

2. **Tool Pattern Check**
   ```python
   mcp__chroma-vana__chroma_query_documents(
       collection_name="adk_complete_docs",
       query_texts=["FunctionTool", "tool registration", "ToolContext"],
       n_results=5
   )
   ```

3. **Multi-Agent Pattern Check**
   ```python
   mcp__chroma-vana__chroma_query_documents(
       collection_name="adk_complete_docs",
       query_texts=["sub_agents", "multi-agent orchestration"],
       n_results=5
   )
   ```

4. **Deployment Pattern Check**
   ```python
   mcp__chroma-vana__chroma_query_documents(
       collection_name="adk_complete_docs",
       query_texts=["Cloud Run deployment", "ADK deployment"],
       n_results=5
   )
   ```

### ADK KB Status Tracking

#### Check Index Status
```bash
# Quick status check
cd .development/adk-knowledge-base/
./check_adk_index.sh

# Detailed status with Python
python3 index_tracker.py
```

#### View Current Coverage
- **Indexed**: 5 URLs, 16 document chunks
- **Pending**: 28 URLs awaiting indexing
- **Manifest**: `.development/adk-knowledge-base/index_manifest.json`

### Updating the ADK Knowledge Base

#### Weekly Update Process (MANDATORY)
1. **Check for ADK Updates**
   ```python
   # Crawl ADK docs for changes
   mcp__firecrawl__firecrawl_crawl(
       url="https://google.github.io/adk-docs/",
       maxDepth=3,
       limit=100,
       scrapeOptions={"formats": ["markdown"]}
   )
   ```

2. **Process New Content**
   ```python
   # Check crawl status
   mcp__firecrawl__firecrawl_check_crawl_status(
       id="<crawl_job_id>"
   )
   ```

3. **Update ChromaDB**
   ```python
   # Add new documents
   mcp__chroma-vana__chroma_add_documents(
       collection_name="adk_complete_docs",
       documents=["<processed_content>"],
       ids=["<unique_doc_id>"],
       metadatas=[{
           "source": "<url>",
           "category": "<category>",
           "last_updated": "<date>"
       }]
   )
   ```

4. **Update Tracking**
   ```bash
   cd .development/adk-knowledge-base/
   python3 index_tracker.py
   ```

#### Emergency Full Re-index
Only if corruption detected:
```python
# Delete and recreate collection
mcp__chroma-vana__chroma_delete_collection(collection_name="adk_complete_docs")
mcp__chroma-vana__chroma_create_collection(
    collection_name="adk_complete_docs",
    embedding_function_name="default"
)
# Then re-run full crawl and indexing
```

### Common ADK Patterns Reference

Based on indexed documentation, always follow these patterns:

1. **Agent Creation**
   - Use `LlmAgent` class, not custom implementations
   - Always provide: name, model, description, instruction
   - Register tools via `tools` parameter
   - Use `sub_agents` for delegation, not tools list

2. **Tool Implementation**
   - Wrap with `FunctionTool` or use direct imports
   - Include proper type hints and docstrings
   - Return structured responses
   - Handle ToolContext when needed

3. **Multi-Agent Systems**
   - Use ADK's native orchestration patterns
   - Implement proper agent hierarchy
   - Follow session management guidelines
   - Use ADK memory patterns

4. **Deployment**
   - Follow ADK Cloud Run deployment specs
   - Use proper service configuration
   - Implement health checks as documented
   - Follow ADK security guidelines

### Troubleshooting ADK KB

#### Collection Not Found
```python
# List all collections
mcp__chroma-vana__chroma_list_collections()
```

#### Search Not Returning Results
```python
# Check document count
mcp__chroma-vana__chroma_get_collection_count(
    collection_name="adk_complete_docs"
)
```

#### View All Indexed URLs
```python
# Get all documents with metadata
mcp__chroma-vana__chroma_get_documents(
    collection_name="adk_complete_docs",
    limit=1000,
    include=["metadatas"]
)
```

## 💾 Proactive ChromaDB Usage

### Long-Term Memory Collections

**IMPORTANT**: ChromaDB should be used proactively for maintaining context across sessions. Create and use these collections:

1. **vana_architecture** - System architecture decisions
2. **vana_implementations** - Completed feature implementations
3. **vana_patterns** - Discovered patterns and best practices
4. **vana_issues** - Known issues and their solutions

### Examples of Proactive Usage

#### 1. Before Starting Any Task
```python
# Check for previous work on similar features
mcp__chroma-vana__chroma_query_documents(
    collection_name="vana_implementations",
    query_texts=["similar feature keywords"],
    n_results=5
)
```

#### 2. After Implementing a Feature
```python
# Store implementation details
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_implementations",
    documents=["Feature X implemented using ADK pattern Y with considerations Z"],
    ids=["feature_x_implementation_2025_01_19"],
    metadatas=[{
        "feature": "Feature X",
        "date": "2025-01-19",
        "files_modified": ["file1.py", "file2.py"],
        "adk_patterns_used": ["LlmAgent", "FunctionTool"]
    }]
)
```

#### 3. When Making Architecture Decisions
```python
# Store architecture decision
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_architecture",
    documents=["Decided to use pattern X because of reasons Y and Z"],
    ids=["arch_decision_pattern_x_2025_01_19"],
    metadatas=[{
        "decision_type": "pattern_choice",
        "date": "2025-01-19",
        "rationale": "Performance and ADK compliance"
    }]
)
```

#### 4. When Encountering Issues
```python
# Store issue and solution
mcp__chroma-vana__chroma_add_documents(
    collection_name="vana_issues",
    documents=["Issue: X occurred when Y. Solution: Do Z instead."],
    ids=["issue_x_solution_2025_01_19"],
    metadatas=[{
        "issue_type": "implementation",
        "date": "2025-01-19",
        "resolved": True
    }]
)
```

### Creating Memory Collections
```python
# Create collections if they don't exist
for collection_name in ["vana_architecture", "vana_implementations", "vana_patterns", "vana_issues"]:
    try:
        mcp__chroma-vana__chroma_create_collection(
            collection_name=collection_name,
            embedding_function_name="default"
        )
    except:
        pass  # Collection already exists
```

**Remember**: ChromaDB is your long-term memory. Use it to maintain context across sessions and prevent repeating mistakes or rediscovering patterns.
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.