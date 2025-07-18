# VANA Active Runtime Files Documentation

This document lists every file that is actively used in the VANA runtime system, explaining its purpose and role in the architecture.

## Entry Points

### `main.py`
**Purpose**: Primary FastAPI application entry point for production deployment
- Initializes the FastAPI app with CORS middleware
- Defines the `/chat` endpoint for synchronous responses
- Handles VANA agent initialization and request processing
- Used for standard HTTP API interactions

### `main_agentic.py`
**Purpose**: Alternative entry point with enhanced specialist context support
- Extends main.py with specialized agent context handling
- Provides additional endpoints for specialist-specific requests
- Includes debugging and monitoring capabilities
- Used when running VANA with full specialist awareness

## API Layer

### `api/endpoints.py`
**Purpose**: Defines core API endpoint handlers
- Contains request/response models
- Implements chat endpoint logic
- Handles session management
- Provides health check endpoints

### `api/__init__.py`
**Purpose**: Makes api directory a Python package
- Exports endpoint definitions

## Core Orchestration

### `agents/base_agents.py`
**Purpose**: Centralized agent registry and reference management
- Stores the `root_agent` variable required by ADK
- Provides agent registration functionality
- Manages agent lifecycle and references
- Critical for ADK compliance

### `agents/vana/team.py`
**Purpose**: Main VANA orchestrator agent definition
- Defines the primary VANA agent using Google ADK
- Uses Gemini 2.0 Flash as the model
- Equipped with coordination tools from adk_tools
- Routes requests to appropriate specialists

### `agents/vana/enhanced_orchestrator.py`
**Purpose**: Enhanced orchestration with intelligent routing
- Implements multi-criteria routing (confidence, complexity, security)
- Includes LRU caching for performance
- Provides metrics collection
- Handles specialist selection and delegation

## Active Specialists

### `agents/specialists/architecture_specialist.py`
**Purpose**: Code architecture analysis specialist
- Analyzes codebase structure and patterns
- Detects design patterns and anti-patterns
- Evaluates code quality metrics
- Provides architectural recommendations

### `agents/specialists/data_science_specialist.py`
**Purpose**: Data analysis and statistical computations
- Performs statistical analysis without external dependencies
- Handles data cleaning and transformation
- Generates insights from data
- Pure Python implementation (no pandas/numpy)

### `agents/specialists/security_specialist.py`
**Purpose**: Security vulnerability detection and analysis
- ELEVATED priority for security-critical tasks
- Scans for OWASP Top 10 vulnerabilities
- Analyzes authentication and encryption
- Generates security reports

### `agents/specialists/devops_specialist.py`
**Purpose**: DevOps and deployment assistance
- Generates CI/CD configurations
- Creates monitoring setups
- Handles deployment strategies
- Provides infrastructure recommendations

### `agents/specialists/content_creation_specialist.py`
**Purpose**: Content generation and documentation
- Creates technical documentation
- Generates README files
- Writes API documentation
- Produces user guides

### `agents/specialists/research_specialist.py`
**Purpose**: Technical research and information gathering
- Conducts web searches for technical information
- Analyzes and summarizes research findings
- Provides comparative analysis
- Cites sources and references

## Specialist Tools

### `agents/specialists/architecture_tools.py`
**Purpose**: Tools for architecture analysis
- AST-based code analysis functions
- Pattern detection algorithms
- Dependency graph generation
- Complexity calculations

### `agents/specialists/data_science_tools.py`
**Purpose**: Statistical and data manipulation tools
- Pure Python statistical functions
- Data cleaning utilities
- Basic visualization support
- Mathematical computations

### `agents/specialists/security_tools.py`
**Purpose**: Security scanning and analysis tools
- Vulnerability pattern matching
- Security configuration checks
- Dependency vulnerability scanning
- Encryption analysis

### `agents/specialists/devops_tools.py`
**Purpose**: DevOps automation tools
- Configuration file generators
- Docker/Kubernetes manifest creation
- CI/CD pipeline builders
- Monitoring configuration tools

## Core Tools

### `lib/_tools/__init__.py`
**Purpose**: Tool package initialization and exports
- Exports all available tools
- Provides tool discovery mechanism

### `lib/_tools/adk_tools.py`
**Purpose**: Core ADK-compliant tools
- `file_read`: Read file contents
- `file_write`: Write to files
- `search_files`: Search across codebase
- `list_directory`: List directory contents
- `get_system_info`: System information
- `delegate_to_agent`: Agent coordination

### `lib/_tools/adk_mcp_tools.py`
**Purpose**: Model Context Protocol integration
- Bridges ADK tools with MCP functionality
- Handles tool context management
- Provides session-aware tool execution

### `lib/_tools/google_search_v2.py`
**Purpose**: Web search implementation
- Primary: Google Custom Search API integration
- Fallback: DuckDuckGo when Google unavailable
- Handles rate limiting and quotas
- Returns structured search results

### `lib/_tools/web_search_sync.py`
**Purpose**: Synchronous wrapper for web search
- Provides sync interface for async search tools
- Used by specialists that require web search
- Handles timeout and error scenarios

## Essential Libraries

### `lib/logging_config.py`
**Purpose**: Centralized logging configuration
- Sets up structured logging
- Configures log levels per module
- Handles log formatting
- Integrates with monitoring systems

### `lib/response_formatter.py`
**Purpose**: Standardizes response formatting
- Ensures consistent API responses
- Handles error formatting
- Provides response templates
- Manages response metadata

### `lib/context/specialist_context.py`
**Purpose**: Manages specialist execution context
- Tracks specialist state during execution
- Provides context to tools
- Handles specialist-specific configurations
- Manages execution boundaries

### `lib/_shared_libraries/orchestrator_metrics.py`
**Purpose**: Performance monitoring and metrics
- Tracks response times
- Monitors specialist usage
- Collects tool execution metrics
- Provides performance insights

### `lib/_shared_libraries/adk_memory_service.py`
**Purpose**: VANA's memory and state management
- NOT the MCP memory (that's VS Code only)
- Handles conversation history
- Manages agent state between requests
- Provides context persistence

## ADK Integration

### `lib/adk_integration/__init__.py`
**Purpose**: ADK integration module initialization
- Exports integration components

### `lib/adk_integration/event_stream.py`
**Purpose**: ADK event streaming support
- Handles streaming responses
- Manages event propagation
- Provides real-time updates

### `lib/adk_integration/silent_handoff.py`
**Purpose**: Seamless agent delegation
- Implements silent handoff protocol
- Manages context transfer between agents
- Ensures smooth specialist transitions

### `lib/adk_integration/main_integration.py`
**Purpose**: Main ADK processing pipeline
- Integrates ADK with VANA's architecture
- Handles request/response transformation
- Manages ADK-specific features

## Configuration Files

### `pyproject.toml`
**Purpose**: Python project configuration
- Defines project dependencies
- Specifies Python version requirements
- Contains build configuration
- Lists all required packages

### `poetry.lock`
**Purpose**: Locked dependency versions
- Ensures reproducible builds
- Locks specific package versions
- Maintains dependency tree
- Critical for deployment consistency

### `.env.example`
**Purpose**: Environment variable template
- Documents required environment variables
- Provides example values
- Includes API key placeholders
- Serves as configuration reference

### `.gitignore`
**Purpose**: Git ignore patterns
- Excludes generated files
- Ignores environment files
- Prevents committing secrets
- Keeps repository clean

## Package Initialization Files

### `agents/__init__.py`
**Purpose**: Makes agents directory a package

### `agents/vana/__init__.py`
**Purpose**: Makes vana subdirectory a package

### `agents/specialists/__init__.py`
**Purpose**: Makes specialists directory a package
- May contain specialist discovery logic

### `lib/__init__.py`
**Purpose**: Makes lib directory a package

### `lib/_tools/__init__.py`
**Purpose**: Tool package initialization
- Exports tool functions

### `lib/_shared_libraries/__init__.py`
**Purpose**: Shared libraries package initialization

### `lib/context/__init__.py`
**Purpose**: Context package initialization

### `api/__init__.py`
**Purpose**: API package initialization

---

## Architecture Overview

The VANA runtime follows this flow:

1. **Entry** → `main.py` receives requests
2. **API** → `endpoints.py` processes and validates
3. **Orchestration** → `enhanced_orchestrator.py` routes to specialists
4. **Specialists** → Execute with their specific tools
5. **Integration** → ADK integration handles responses
6. **Response** → Formatted and returned to client

Total active runtime: **~40 essential files** out of 500+ in the full project.