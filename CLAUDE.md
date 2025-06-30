# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL PYTHON VERSION REQUIREMENT

**PYTHON 3.13 IS MANDATORY FOR VANA SYSTEM**

⚠️ **PRODUCTION CRITICAL**: VANA requires Python 3.13+ for proper functionality. Using any version less than 3.13 will cause production errors and system instability.

**Environment Verification:**
```bash
# Verify Python version (MUST be 3.13+)
python3 --version  # Should show Python 3.13.x
poetry env info    # Virtualenv Python should be 3.13.x

# If not Python 3.13, fix immediately:
poetry env use python3.13
poetry install
```

**Why Python 3.13 is Required:**
- Modern async patterns required by Google ADK
- SSL/TLS compatibility for production services  
- Type hints and syntax features used throughout codebase
- Performance optimizations critical for agent coordination
- Memory management improvements for multi-agent operations

## Common Development Commands

### Testing

⚠️ **CRITICAL**: Always use the new Production Parity Testing Framework to ensure tests match production environment.

```bash
# NEW: Production Parity Testing (RECOMMENDED)
poetry run python tests/run_production_parity_tests.py --smoke-only  # Critical smoke tests
poetry run python tests/run_production_parity_tests.py --full        # Full test suite
poetry run python tests/framework/production_parity_validator.py     # Environment validation

# Legacy pytest (use with caution - may not reflect production)
poetry run pytest -m unit          # Unit tests
poetry run pytest -m agent         # Agent intelligence tests  
poetry run pytest -m integration   # Integration tests
poetry run pytest -m e2e           # End-to-end tests
poetry run pytest -m security      # Security tests
poetry run pytest -m performance   # Performance tests

# Run with coverage
poetry run pytest --cov=agents --cov=lib --cov=tools
```

**Production Parity Testing Features:**
- ✅ Tests run in Poetry environment (matches production Docker)
- ✅ Validates all critical dependencies are available
- ✅ Tests against actual production endpoints
- ✅ Smoke tests for critical functionality
- ✅ Environment validation ensures test reliability

### Code Quality
```bash
# Format code
poetry run black .
poetry run isort .

# Lint code
poetry run flake8

# Type checking
poetry run mypy .

# Security audit
poetry run bandit -r . -f json

# Run all quality checks
poetry run black . && poetry run isort . && poetry run flake8 && poetry run mypy .
```

### Development Server
```bash
# Install dependencies
poetry install

# Configure environment (copy .env.template to .env.local and configure)
cp .env.template .env.local

# Run development server
python main.py

# Run with Docker
docker build -t vana .
docker run -p 8080:8080 vana
```

### Deployment
```bash
# Deploy to development
./deployment/deploy-dev.sh

# Deploy to production
./deployment/deploy-prod.sh
```

## Architecture Overview

VANA is a multi-agent AI system built on Google's Agent Development Kit (ADK) with optimized orchestration patterns. The system uses AGOR-inspired coordination with dynamic agent creation and intelligent tool management.

### Core Design Principles
- **Dynamic Agent Orchestration** - Strategy-based execution with on-demand agent creation
- **Advanced Tool Optimization** - Intelligent caching, consolidation, and performance monitoring
- **Enhanced Tool Standardization** - Consistent interfaces across tools
- **Cloud-Native Design** - Google Cloud integration with auto-scaling and resilience

### Agent Architecture
- **VANA Orchestrator** (`agents/vana/team.py`) - Central coordinator with comprehensive toolset
  - Core tools (file operations, search, system tools)
  - Conditional tools (specialist capabilities, orchestration tools)
  - Agent coordination tools (delegation, status monitoring)
  - Workflow management tools (multi-step workflow execution)
- **Data Science Specialist** (`agents/data_science/specialist.py`) - Data analysis and ML
  - Data processing, visualization, statistical computing
  - Integrated analysis tools and workflow management
- **Proxy Agents** - Discovery pattern for backward compatibility
  - Memory, Orchestration, Specialists, Workflows agents delegate to VANA

### Deprecated/Future Components
- **Code Execution Specialist** - Temporarily removed from build to focus on core functionality
  - Will be reintroduced once primary agents and tools are optimized

### Project Structure
```
vana/
├── agents/                    # Agent implementations
│   ├── vana/                 # Main VANA orchestrator
│   ├── data_science/         # Data science specialist
│   └── [proxy agents]/       # Memory, orchestration, specialists, workflows
├── lib/                      # Core libraries
│   ├── _tools/              # Standardized tool implementations (59+ tools)
│   ├── _shared_libraries/   # Shared services (vector search, caching, coordination)
│   ├── sandbox/             # Reserved for future secure execution environment
│   ├── security/            # Security manager, access control, audit logging
│   ├── monitoring/          # Performance monitoring, health checks
│   └── mcp/                 # MCP (Model Context Protocol) integration
├── docs/                    # Comprehensive documentation
│   ├── architecture/        # System design and patterns
│   ├── guides/             # Developer and user guides
│   ├── deployment/         # Cloud deployment and local setup
│   ├── api/                # API reference and tool integration
│   └── troubleshooting/    # Common issues and solutions
├── tests/                   # AI Agent Testing Framework
│   ├── framework/          # Agent intelligence validation
│   ├── unit/               # Tool and component tests
│   ├── integration/        # Multi-agent coordination tests
│   └── e2e/                # End-to-end workflow tests
├── tools/                   # External tool integrations
├── scripts/                # Utility and deployment scripts
├── config/                 # Configuration files
├── memory-bank/            # Legacy file-based memory (deprecated - use Memory MCP server)
├── dashboard/              # Unused - available for Streamlit admin dashboard
└── archive/                # Historical artifacts (ignore for current development)
```

### Tool Categories & Key Files

#### Core Tool Implementations (`lib/_tools/`)
- **`adk_tools.py`** - Core ADK tool implementations (file ops, search, system)
- **`agent_tools.py`** - Agent coordination and delegation tools
- **`task_analyzer.py`** - Intelligent task analysis and classification
- **`workflow_engine.py`** - Multi-step workflow management
- **`standardized_*_tools.py`** - Standardized tool categories (file, search, system, KG)

#### Shared Libraries (`lib/_shared_libraries/`)
- **`vector_search_service.py`** - Vertex AI vector search integration
- **`intelligent_cache.py`** - Performance-optimized caching system
- **`coordination_manager.py`** - Multi-agent coordination logic
- **`task_router.py`** - Intelligent task routing and delegation

#### Security & Monitoring (`lib/security/`, `lib/monitoring/`)
- **`security_manager.py`** - Access control and security validation
- **`audit_logger.py`** - Security audit logging
- **`performance_monitor.py`** - System performance tracking
- **`health_check.py`** - Service health monitoring

### Documentation Structure (`docs/`)

#### Architecture Documentation
- **`architecture/overview.md`** - System design and optimization principles
- **`architecture/agents.md`** - Agent system detailed documentation
- **`architecture/tools.md`** - Tool organization and implementation patterns

#### Developer Resources
- **`guides/developer-guide.md`** - Development setup and contribution guidelines
- **`guides/api-reference.md`** - Complete API documentation
- **`guides/ai-agent-development-guide.md`** - AI agent development patterns

#### Deployment & Operations
- **`deployment/cloud-deployment.md`** - Google Cloud Run deployment
- **`deployment/security-guide.md`** - Security best practices
- **`deployment/local-setup.md`** - Local development environment

#### User & Getting Started
- **`getting-started/installation.md`** - Installation and setup
- **`getting-started/quick-start.md`** - Quick start guide
- **`user/getting-started.md`** - End-user documentation

## Tool Usage Guidelines

### Tool Categories & Permissions

#### Core Tools (Always Available)
- **File Operations**: Read, Write, Edit, MultiEdit
- **Search Tools**: Grep, Glob, LS  
- **System Tools**: Bash (with restrictions), WebFetch, WebSearch
- **Memory Tools**: All `mcp__memory__*` tools for ChromaDB operations
- **Development Tools**: Task agent for complex searches

#### Conditional Tools (Require Permissions)
Tools must be explicitly allowed in `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(python:*)",        // Python execution
      "Bash(poetry:*)",        // Poetry commands
      "Bash(git:*)",           // Git operations
      "WebFetch(domain:*)",    // Web fetching by domain
      "mcp__memory__*",        // Memory MCP tools
      "mcp__GitHub__*"         // GitHub MCP tools
    ],
    "deny": []
  }
}
```

#### MCP Server Tools
Configure in `/Users/nick/.claude.json` under `projects`:
```json
{
  "mcpServers": {
    "memory": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/memory-server.js"],
      "env": {
        "API_KEY": "key_here"  // CRITICAL: Keys in env object
      }
    }
  }
}
```

### Tool Usage Best Practices

#### 1. Search Strategy
```python
# For broad searches across codebase - use Task agent
Task(prompt="Find all files implementing authentication")

# For specific file patterns - use Glob
Glob(pattern="**/*auth*.py")

# For content search - use Grep
Grep(pattern="authenticate.*user", include="*.py")
```

#### 2. File Operations
- **Always read before editing**: Use Read tool first
- **Batch edits**: Use MultiEdit for multiple changes to same file
- **Verify paths**: Use LS to confirm directory structure

#### 3. Memory Tool Protocol
```python
# Session start - MANDATORY
mcp__memory__search_memory(query="VANA project Nick recent work")

# Continuous storage - AUTONOMOUS
mcp__memory__store_memory(
    content="Important decision or insight",
    metadata={"category": "technical_decision"}
)

# Status checks
mcp__memory__memory_stats()  # Database health
mcp__memory__operation_status()  # Real-time tracking
```

#### 4. Bash Command Restrictions
```bash
# Allowed with proper permissions
poetry run pytest  # Requires Bash(poetry:*)
git status        # Requires Bash(git:*)

# Always quote paths with spaces
cd "/path with spaces/directory"

# Avoid these commands - use dedicated tools instead
find .            # Use Glob instead
grep -r           # Use Grep tool instead
cat file.txt      # Use Read tool instead
```

### Tool Error Handling

#### Common Issues & Solutions
1. **"Tool not found"** → Check permissions in settings.local.json
2. **"Permission denied"** → Add specific pattern to allow list
3. **"MCP server error"** → Verify server config in .claude.json
4. **API timeout errors** → Break operations into smaller chunks

### Tool Performance Guidelines

1. **Batch Operations**: Call multiple tools in single message for parallel execution
2. **Incremental Approach**: For large files, create in chunks < 7KB
3. **Search Optimization**: Use specific patterns to reduce result sets
4. **Memory Efficiency**: Store insights immediately, search before storing duplicates

## Development Guidelines

### Agent Development
- Follow Google ADK patterns with proper tool registration using `adk.FunctionTool`
- Implement comprehensive error handling and structured logging
- Use security best practices with input validation and access control
- Leverage the AI Agent Testing Framework for validation

### Tool Implementation Standards
- All tools follow standardized patterns in `lib/_tools/`
- Use structured logging via `lib/logging/structured_logger.py`
- Implement proper input validation and error handling
- Include type hints and comprehensive docstrings
- Follow the tool standardization patterns established in existing implementations

### Testing Approach
VANA includes a comprehensive **AI Agent Testing Framework** (`tests/framework/`):
- **`agent_intelligence_validator.py`** - Tests reasoning consistency and tool selection
- **`response_quality_analyzer.py`** - Analyzes accuracy, completeness, relevance
- **`adk_compliance_validator.py`** - Validates Google ADK patterns and integration
- **`performance_benchmarker.py`** - Response times, throughput, resource usage

### Security Requirements
- No hardcoded credentials - use Google Secret Manager integration
- Implement proper access control for sensitive operations
- Use audit logging for security-relevant actions (`lib/security/audit_logger.py`)
- Follow OWASP security guidelines for web components

### Code Style & Quality
- Use Black with 120 character line length
- Follow isort for import organization
- Type hints for all function signatures
- Comprehensive docstrings for public APIs
- Security validation with Bandit

## Environment Configuration

### Required Environment Variables (in .env.local)
```bash
# Core Configuration
VANA_MODEL=gemini-2.0-flash  # Default AI model
GOOGLE_CLOUD_PROJECT=your-project-id

# Environment
ENVIRONMENT=development  # or production
```

### Google Cloud Setup
- Authenticate with `gcloud auth application-default login`
- API keys automatically loaded from Google Secret Manager
- Ensure proper IAM permissions for Vertex AI, Cloud Run, and other services

### Optional Dependencies
For enhanced document processing capabilities:
```bash
# PDF processing
pip install PyPDF2>=3.0.0

# Image processing and OCR
pip install Pillow>=10.0.0 pytesseract>=0.3.10

# System-level Tesseract (for OCR)
brew install tesseract  # macOS
sudo apt-get install tesseract-ocr  # Ubuntu/Debian
```

## Key Development Patterns

### Agent Tool Registration
```python
from google.adk.tools import FunctionTool

def create_my_tool():
    return FunctionTool(
        name="my_tool",
        description="Tool description",
        parameters={...},
        function=my_function
    )
```

### Error Handling Pattern
```python
try:
    result = perform_operation()
    return {"success": True, "result": result}
except Exception as e:
    logger.error(f"Operation failed: {e}")
    return {"success": False, "error": str(e)}
```

### Structured Logging
```python
from lib.logging.structured_logger import logger

logger.info("Operation started",
           extra={"operation": "example", "user_id": "123"})
```

### Local Development Memory Protocol (VS Code Environment)

**IMPORTANT NOTE:** The following memory systems are for the **local development environment within VS Code** and are used by the agent to maintain context during development sessions. They are **completely separate** from the VANA application's own memory system, which uses the Google ADK (`lib/_shared_libraries/adk_memory_service.py`).

Claude Code uses a sophisticated dual memory architecture for persistent context and knowledge management during development:

#### Dual Memory Systems for Local Development

**1. ChromaDB Vector Database (Unstructured Text)**
- **Purpose**: Semantic search on documents and conversation history for the development session.
- **Implementation**: Custom MCP server at `scripts/local_memory_server.py`.
- **Database**: `.memory_db/`
- **Tools**: `mcp__memory__search_memory`, `mcp__memory__store_memory`, `mcp__memory__index_files`, etc.
- **Note**: This is a local development tool, not part of the VANA application.

**2. Knowledge Graph Memory (Structured Data)**
- **Purpose**: Storing facts, entities, and their relationships for the development session.
- **Implementation**: Official `@modelcontextprotocol/server-memory` MCP server.
- **Tools**: `mcp__memory__create_entities`, `mcp__memory__create_relations`, `mcp__memory__search_nodes`, etc.
- **Note**: This is a local development tool, not part of the VANA application.

**Memory System Structure:**
- **Entities**: People, organizations, events, concepts (e.g., "Nick", "VANA_Project", "Python_3.13_Requirement")
- **Relations**: Directed connections between entities (e.g., "Nick manages VANA_Project")
- **Observations**: Discrete facts about entities (e.g., "Prefers concise responses", "Requires Python 3.13+")

**Memory Categories to Track:**
- **Project Status**: Current state, priorities, blockers, next steps
- **Technical Decisions**: Architecture choices, tool preferences, patterns
- **User Preferences**: Communication style, workflow preferences, pain points
- **System Knowledge**: Deployment URLs, testing patterns, known issues
- **Relationships**: Team connections, tool dependencies, service relationships

**Memory Usage Protocol:**
1. **Session Start**: MANDATORY - Always begin with Nick context retrieval and explicit status confirmation:
   - Search "Nick preferences communication workflow" (communication style, autonomous expectations)
   - Search "Nick VANA project current status" (project state, recent work, priorities)
   - Search "Nick technical patterns Python Poetry" (Python 3.13+, documentation standards)
   - **SUCCESS**: Report "✅ Nick context loaded: [brief summary of key patterns retrieved]"
   - **FAILURE**: Report "❌ Memory server unavailable - operating without persistent context"
   - Read `.claude/` files for current project state regardless of memory status
   
**CRITICAL Memory Tool Names:**
- **ALWAYS use**: `mcp__memory__search_memory` (NOT `memory:search_memory`)
- **ALWAYS use**: `mcp__memory__store_memory` (NOT `memory:store_memory`)
- **ALWAYS use**: `mcp__memory__memory_stats` for database status
- **ALWAYS use**: `mcp__memory__operation_status` for operation tracking
- **ALWAYS use**: `mcp__memory__index_files` for indexing directories
would it
**Memory Best Practices:**
- Use specific, searchable entity names (e.g., "VANA_Production_Environment")
- Store observations with clear, actionable language
- Create relations to show dependencies and impacts
- Update project status entities after each significant change

### Documentation & Evidence Standards

- **Memory First:** Autonomously store ALL important decisions, patterns, and learnings using `mcp__memory__store_memory` without being prompted
- **Proactive Evidence Capture:** Automatically document test results, deployment status, and validation evidence using `mcp__memory__store_memory`
- **Automatic Relationship Mapping:** Continuously update relations to track dependencies between components, tools, and processes in custom ChromaDB
- **Continuous Status Updates:** Maintain real-time project status through persistent memory using `mcp__memory__store_memory`
- **User Correction Protocol:** When Nick provides corrections or additional context, immediately update relevant memory using `mcp__memory__store_memory`

### Design Impact Assessment Protocol

Before any code changes:
1. Use TodoWrite to systematically identify affected functions, modules, tools
2. **Automatically store** assumptions, risks, and intended impacts using `mcp__memory__store_memory`
3. **Autonomously create/update** memory relations to show system dependencies using `mcp__memory__store_memory`
4. **Proactively update** relevant memory entities during and immediately after making changes using `mcp__memory__store_memory`
5. **Store rationale** for technical decisions using `mcp__memory__store_memory` without being asked
6. For large refactors or high-impact edits, confirm with user before execution

**Memory Decision Framework:**
- **Always Store**: Technical decisions, user preferences, system insights, error patterns
- **Never Ask**: "Should I remember this?" - use judgment to store relevant information
- **Immediate Storage**: Store insights the moment they're discovered or decided
- **User Role**: Nick augments, corrects, or provides additional context to existing memories

**Memory & Context Management:**
- **Proactive Storage**: I autonomously store important insights throughout sessions without waiting for commands
- **Pre-Compact Protocol**: Use `/memory-consolidate` before Claude Code's `/compact` command for optimal context management
- **Consolidation Priority**: When `/memory-consolidate` is triggered, prioritize high-value information storage
- **Available Commands**: 
  - `/memory-consolidate` - Store session insights in Memory MCP before compacting
  - `/memory-status` - Check Memory MCP health and recent updates
  - `/finish-feature` - Complete feature development with memory update
  - `/deploy-prep` - Prepare for deployment with memory checkpoint
  - `/session-handoff` - End session with complete memory update

**Custom ChromaDB Memory (Production System):**
- **Setup**: Custom ChromaDB server automatically running at startup
- **Commands**: 
  - `mcp__memory__search_memory` - Semantic search of ChromaDB with visual feedback
  - `mcp__memory__store_memory` - Add new information to ChromaDB vector database
  - `mcp__memory__index_files` - Index directory contents
  - `mcp__memory__memory_stats` - View database statistics (current: 2,343+ chunks)
  - `mcp__memory__operation_status` - Real-time operation dashboard with progress tracking
- **Optimal Workflow**: Continuous autonomous storage → `/compact` → session continues with preserved knowledge
- **Autonomous Pattern**: I continuously store important information during conversations using `mcp__memory__store_memory`, not just at consolidation points

### Memory System Maintenance

**Automatic Cleanup System**: VANA includes automated ChromaDB duplicate cleanup to maintain database performance and search precision.

**When to Execute Auto Cleanup Scripts:**
```bash
# Start automatic cleanup service (run once at project setup)
./scripts/start_auto_cleanup.sh

# Stop automatic cleanup service (when needed for maintenance)
./scripts/stop_auto_cleanup.sh
```

**Auto Cleanup Triggers:**
- **Proactive Setup**: Run `start_auto_cleanup.sh` when setting up VANA development environment
- **Performance Degradation**: If memory search becomes slow or returns poor results
- **Database Growth**: When `mcp__memory__memory_stats` shows excessive chunk count growth
- **Manual Cleanup Needed**: If `mcp__memory__operation_status` indicates duplicate accumulation
- **Session Start**: Check if auto cleanup service is running during environment verification

**Service Features:**
- Runs every 6 hours automatically in background
- Triggers cleanup when 10+ duplicate chunks detected
- Preserves most recent versions based on timestamps
- Comprehensive logging in `auto_cleanup.log`
- PID tracking for service management

**Monitoring Commands:**
```bash
# Check if auto cleanup is running  
ps aux | grep auto_memory_cleanup

# View cleanup activity logs
tail -f auto_cleanup.log

# Manual cleanup status check
cat scripts/auto_cleanup.pid
```

## Important Implementation Notes

### Multi-Agent Coordination
- **Primary agents**: VANA Orchestrator, Data Science Specialist
- **Proxy pattern** for discovery compatibility with legacy agent references
- **Coordination** through standardized ADK patterns and tool interfaces
- **Focus**: Core functionality and tool optimization before expanding capabilities

### Tool Architecture
- Standardized tools with consistent interfaces
- Intelligent caching and performance optimization
- Conditional tool loading based on available dependencies
- Comprehensive error handling and graceful degradation

### Deployment
- Production: Google Cloud Run with auto-scaling
- Development: Local Poetry environment with Docker support
- CI/CD: Automated deployment scripts in `deployment/` directory

## MCP Server Configuration Guide

To ensure all custom tools and MCP servers function correctly with Claude Code, follow these critical configuration steps. Failure to do so will result in API errors and disabled tools.

### 1. Configure Servers in `.claude.json`

All MCP servers must be defined in the `projects` section of `/Users/nick/.claude.json`.

**Correct Configuration:**
- API keys and other secrets **MUST** be placed inside the `env` object.
- Do **NOT** pass secrets as command-line arguments using `--env`.

✅ **Correct Example:**
```json
"brave-search": {
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-brave-search"
  ],
  "env": {
    "BRAVE_API_KEY": "YOUR_API_KEY_HERE"
  }
}
```

❌ **Incorrect Example:**
```json
"brave-search": {
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-brave-search",
    "--env",
    "BRAVE_API_KEY=YOUR_API_KEY_HERE"
  ],
  "env": {}
}
```

### 2. Enable Tool Permissions in `.claude/settings.local.json`

After adding a server in `.claude.json`, you **MUST** grant permission for its tool to be used.

1.  Open the project-specific settings file at `.claude/settings.local.json`.
2.  Add the exact name of the tool to the `permissions.allow` array.

✅ **Correct Example:**
If you add the `memory` and `sequentialthinking` servers, you must add their names to the `allow` list:
```json
"permissions": {
  "allow": [
    "Bash(git:*)",
    "WebFetch(domain:google.com)",
    "memory",
    "sequentialthinking"
  ],
  "deny": []
}
```

**Troubleshooting Checklist:**
1.  **API Error (`invalid_request_error`)?** -> Check your server configurations in `/Users/nick/.claude.json`. Ensure all API keys are in the `env` object.
2.  **Tool Not Appearing?** -> Check your permissions in `.claude/settings.local.json`. Make sure the tool name is in the `allow` list.
3.  **Restart Claude Code:** Always restart your Claude Code session after making changes to these configuration files.

## System Status Note

The system is currently undergoing a complete documentation rewrite to accurately reflect its actual state. Previous validation showed 46.2% infrastructure working. Please refer to the Ground Truth Validation Report for accurate system status information.

This architecture provides a foundation for AI-powered multi-agent applications with comprehensive tooling, security, and monitoring capabilities.
