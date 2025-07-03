# VANA Multi-Agent AI System Instructions

This file provides unified guidance for all code agents (Cline, Claude Code, etc.) working with the VANA codebase.

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

## Project Context: VANA Multi-Agent AI System

You are working on VANA, a sophisticated multi-agent AI system built on Google's Agent Development Kit (ADK). This is a production-ready system with specific architectural patterns and requirements.

## Dual Memory System Protocol

**MANDATORY**: You have access to a dual memory system - BOTH ChromaDB MCP and Memory MCP (Knowledge Graph). Use this IMMEDIATELY when starting any session:

### Session Start Protocol (MANDATORY)

**Step 1: ChromaDB Context Loading**
```python
# Query user preferences and communication style
chroma_query_documents(
    collection_name="vana_memory",
    query_texts=["Nick preferences communication workflow"],
    n_results=3
)

# Query current project status and recent work
chroma_query_documents(
    collection_name="vana_memory", 
    query_texts=["Nick VANA project current status"],
    n_results=5
)

# Query technical patterns and development preferences
chroma_query_documents(
    collection_name="vana_memory",
    query_texts=["Nick technical patterns Python Poetry"],
    n_results=3
)
```

**Step 2: Knowledge Graph Context Loading**
```python
# Check overall graph status
read_graph()

# Load user entity and preferences
search_nodes("Nick")

# Load project context and current status
search_nodes("VANA_Project")
```

**Step 3: Status Reporting**
After loading context, ALWAYS report:
- ✅ **Success**: "✅ Nick context loaded: [brief summary of key patterns retrieved]"
- ❌ **Failure**: "❌ Memory servers unavailable - operating without persistent context"

**Fallback Protocol:**
If memory servers are unavailable, continue with session but inform user of limited context.

### Continuous Storage

Autonomously store insights using BOTH systems:

```
# ChromaDB (Unstructured) - Server: chroma-vana
Tool: chroma_add_documents
Content: "[Insight or decision]. Source: [Agent Name]."

# Knowledge Graph (Structured) - Server: memory-mcp
Tool: add_observations
Entity: "[relevant entity like VANA_Project or Nick]"
Observations: ["[specific fact or insight]"]
```

### Memory Tools Available

#### ChromaDB MCP Tools (Unstructured Text Storage) - Server: chroma-vana

**Core Operations:**
- `chroma_query_documents(collection_name, query_texts, n_results=5)` - Semantic search of ChromaDB
- `chroma_add_documents(collection_name, documents, ids, metadatas=None)` - Add new information to vector database
- `chroma_get_documents(collection_name, ids=None, limit=None)` - Retrieve specific documents
- `chroma_list_collections()` - List all available collections
- `chroma_get_collection_count(collection_name)` - View database statistics

**Usage Examples:**
```python
# Query for context
chroma_query_documents(
    collection_name="vana_memory",
    query_texts=["Nick preferences communication workflow"],
    n_results=5
)

# Store new insights
chroma_add_documents(
    collection_name="vana_memory", 
    documents=["Decision: Use Python 3.13 for all VANA development"],
    ids=["decision_20250103_001"],
    metadatas=[{"type": "technical_decision", "agent": "Claude"}]
)

# Retrieve specific documents
chroma_get_documents(
    collection_name="vana_memory",
    limit=10
)
```

#### Memory MCP Tools (Knowledge Graph - Structured Data) - Server: memory-mcp

**Entity Management:**
- `create_entities(entities)` - Create new entities with observations
- `add_observations(observations)` - Add facts to existing entities
- `delete_entities(entityNames)` - Remove entities and their relations
- `delete_observations(deletions)` - Remove specific observations

**Relationship Management:**
- `create_relations(relations)` - Create relationships between entities
- `delete_relations(relations)` - Remove specific relationships

**Query Operations:**
- `read_graph()` - Read entire knowledge graph
- `search_nodes(query)` - Search for entities/relationships
- `open_nodes(names)` - Get specific entities by name

**Usage Examples:**
```python
# Create entities
create_entities([{
    "name": "VANA_Project",
    "entityType": "project",
    "observations": ["Uses Python 3.13", "Built on Google ADK"]
}])

# Add relationships
create_relations([{
    "from": "Nick",
    "to": "VANA_Project", 
    "relationType": "manages"
}])

# Search for information
search_nodes("Nick preferences")

# Add new observations
add_observations([{
    "entityName": "Nick",
    "contents": ["Prefers concise responses", "Uses autonomous workflow"]
}])
```

#### Known Issues & Workarounds
- **AVOID**: `chroma_peek_collection` (numpy serialization error)
- **AVOID**: `chroma_get_collection_info` (numpy serialization error)
- **USE INSTEAD**: `chroma_get_documents` with limit parameter for previewing data
- **MCP SERVER RESTART**: If tools become unresponsive, restart the MCP servers

### Memory Best Practices

#### When to Use Each System
- **ChromaDB**: Long conversations, complex technical explanations, code snippets
- **Knowledge Graph**: Facts, relationships, status updates, structured project data

#### Storage Patterns
- Use specific, searchable entity names (e.g., "VANA_Production_Environment", "Nick")
- Store observations with clear, actionable language
- Always check existing context before storing duplicates
- Update project status entities after significant changes
- Store rationale for technical decisions without being asked
- Create relations to show dependencies (e.g., "Nick manages VANA_Project")

#### Data Hygiene Protocol (MANDATORY)
When code or documentation changes occur, you MUST actively maintain memory accuracy:

1. **File Modifications**: When editing/deleting files, search for and update/delete corresponding memory entries
2. **Function/Class Changes**: Remove outdated documentation about deleted or renamed functions
3. **Project Structure Changes**: Update memory when directories are moved or reorganized
4. **Stale Information**: Proactively delete contradictory or outdated information
5. **Before Storing**: Search for existing similar content and delete/update rather than duplicate

**Delete Triggers:**
- File deleted → Delete all memory chunks referencing that file
- Function renamed → Delete old function documentation, store new
- Implementation changed → Delete outdated implementation details
- Error fixed → Delete memory of the error pattern
- Deprecated features → Delete old usage patterns

## Development Commands

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

### Code Quality (Run BEFORE commits)

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
├── tests/                   # AI Agent Testing Framework
├── tools/                   # External tool integrations
├── scripts/                # Utility and deployment scripts
├── config/                 # Configuration files
├── memory-bank/            # Legacy file-based memory (deprecated)
├── dashboard/              # Unused - available for Streamlit admin dashboard
└── archive/                # Historical artifacts (ignore for current development)
```

### Key Directories
- `lib/_tools/` - 59+ standardized tool implementations
- `lib/_shared_libraries/` - Vector search, caching, coordination
- `docs/` - Comprehensive system documentation
- `vscode-dev-docs/` - VS Code development tools (SEPARATE from VANA docs)

## Tool Usage Guidelines

### Tool Categories & Permissions

#### Core Tools (Always Available)
- **File Operations**: Read, Write, Edit, MultiEdit
- **Search Tools**: Grep, Glob, LS  
- **System Tools**: Bash (with restrictions), WebFetch, WebSearch
- **Memory Tools**: ChromaDB MCP tools (`chroma-vana`) for vector search operations
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
      "chroma-vana",           // ChromaDB MCP tools
      "memory-mcp",            // Knowledge Graph MCP tools
      "mcp__GitHub__*"         // GitHub MCP tools
    ],
    "deny": []
  }
}
```

#### MCP Server Configuration

**ChromaDB MCP Server Setup:**
Configure in `/Users/nick/.claude.json` under `projects`:

```json
{
  "mcpServers": {
    "chroma-vana": {
      "type": "stdio",
      "command": "uvx",
      "args": ["chroma-mcp"],
      "env": {
        "CHROMA_HOST": "localhost",
        "CHROMA_PORT": "8000",
        "CHROMA_COLLECTION_NAME": "vana_memory"
      }
    },
    "memory-mcp": {
      "type": "stdio", 
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_STORAGE_PATH": "./.memory_graph"
      }
    }
  }
}
```

**Tool Permissions Setup:**
In `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "chroma-vana",
      "memory-mcp",
      "Bash(python:*)",
      "Bash(poetry:*)",
      "Bash(git:*)"
    ]
  }
}
```

**Server Health Checks:**
```python
# Test ChromaDB connection
chroma_list_collections()

# Test Memory MCP connection  
read_graph()

# If servers are unresponsive, restart session
```

**CRITICAL Configuration Notes:**
- API keys and secrets **MUST** be placed inside the `env` object
- Do **NOT** pass secrets as command-line arguments
- Always restart agent session after configuration changes
- Ensure ChromaDB is running on localhost:8000 before starting agents
- Memory MCP stores data in `.memory_graph` directory by default

### Tool Usage Best Practices

#### Search Strategy
```python
# For broad searches across codebase - use Task agent
Task(prompt="Find all files implementing authentication")

# For specific file patterns - use Glob
Glob(pattern="**/*auth*.py")

# For content search - use Grep
Grep(pattern="authenticate.*user", include="*.py")
```

#### File Operations
- **Always read before editing**: Use Read tool first
- **Batch edits**: Use MultiEdit for multiple changes to same file
- **Verify paths**: Use LS to confirm directory structure

#### Memory Protocol
```python
# Session start - MANDATORY
chroma_query_documents(
    collection_name="vana_memory",
    query_texts=["VANA project Nick recent work"],
    n_results=5
)

# Continuous storage - AUTONOMOUS
chroma_add_documents(
    collection_name="vana_memory",
    documents=["Important decision or insight"],
    ids=["unique_id_timestamp"],
    metadatas=[{"category": "technical_decision"}]
)
```

### Tool Error Handling

#### Common Issues & Solutions
1. **"Tool not found"** → Check permissions in settings.local.json
2. **"Permission denied"** → Add specific pattern to allow list
3. **"MCP server error"** → Verify server config in .claude.json
4. **API timeout errors** → Break operations into smaller chunks

## Code Style & Standards

- **NO COMMENTS** unless explicitly requested
- Follow existing code patterns and conventions
- Always check imports and existing libraries before adding new ones
- Use structured logging via `lib/logging/structured_logger.py`
- Security: No hardcoded credentials, use Google Secret Manager
- Type hints required for all functions
- Use Black with 120 character line length
- Follow isort for import organization
- Comprehensive docstrings for public APIs

## Communication Style (Nick's Preferences)

- Concise, direct responses (1-3 sentences preferred)
- Autonomous operation without excessive confirmation requests
- Focus on doing rather than explaining unless asked
- Immediate memory storage of important decisions
- Proactive use of ChromaDB for context continuity

## Workflow Pattern

1. **Start**: Query ChromaDB for project context
2. **Work**: Use existing patterns, minimal explanations
3. **Store**: Autonomously save insights to ChromaDB
4. **Test**: Run quality checks before completion
5. **Commit**: Only when explicitly requested

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

## Memory System Maintenance

### Automatic Cleanup System
VANA includes automated ChromaDB duplicate cleanup to maintain database performance and search precision.

**When to Execute Auto Cleanup Scripts:**
```bash
# Start automatic cleanup service (run once at project setup)
./scripts/start_auto_cleanup.sh

# Stop automatic cleanup service (when needed for maintenance)
./scripts/stop_auto_cleanup.sh
```

**Monitoring Commands:**
```bash
# Check if auto cleanup is running  
ps aux | grep auto_memory_cleanup

# View cleanup activity logs
tail -f auto_cleanup.log

# Manual cleanup status check
cat scripts/auto_cleanup.pid
```

## Current Project Status

Check ChromaDB for latest status. Key areas:
- ChromaDB MCP migration: ✅ Complete
- Multi-AI integration: ✅ Configured for multiple agents
- Production parity testing: ✅ Available
- Documentation reorganization: ✅ VS Code docs separated

## Documentation & Evidence Standards

- **Memory First:** Autonomously store ALL important decisions, patterns, and learnings using both `chroma-vana` and `memory-mcp` servers without being prompted
- **Proactive Evidence Capture:** Automatically document test results, deployment status, and validation evidence
- **Automatic Relationship Mapping:** Continuously update relations to track dependencies between components, tools, and processes
- **Continuous Status Updates:** Maintain real-time project status through persistent memory
- **User Correction Protocol:** When Nick provides corrections or additional context, immediately update relevant memory

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

## Troubleshooting

### Common Issues
1. **Python Version**: Always verify Python 3.13+ before any operations
2. **Memory Server Errors**: Check MCP server configuration and restart if needed
3. **Tool Permission Errors**: Verify permissions in `.claude/settings.local.json`
4. **Import Errors**: Run `poetry install` to ensure all dependencies are available

### Emergency Commands
```bash
# Reset environment
poetry env use python3.13
poetry install

# Check system status
poetry run python tests/run_production_parity_tests.py --smoke-only

# Reset memory servers (if needed)
./scripts/stop_auto_cleanup.sh
./scripts/start_auto_cleanup.sh
```

---

**Note**: This instruction file is designed to work across multiple code agents (Cline, Claude Code, etc.) while maintaining consistency and technical accuracy. All agents share the same dual memory system for perfect continuity across sessions.
