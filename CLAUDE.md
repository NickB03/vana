# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**CRITICAL REQUIREMENT**: When implementing any features, you MUST follow the ADK Starter Pack Getting Started guide EXACTLY. Query the ChromaDB collections (`adk_documentation` and `adk_knowledge_base_v2`) before any implementation. Any deviation from the starter pack instructions requires explicit user approval.

## WORKSPACE STRUCTURE

**IMPORTANT**: This project uses a dual-directory structure with a hybrid workflow:

### `/Users/nick/Development/vana/`
- **Purpose**: Main ADK project directory (Git repository)
- **Usage**: ALL development work happens here
- **Launch Claude Code from here**: Avoids virtual environment conflicts
- **Contains**: Project code, .mcp.json config pointing to vana_vscode services

### `/Users/nick/Development/vana_vscode/`
- **Purpose**: MCP data storage and development tools (NOT tracked in git)
- **Usage**: Stores ChromaDB, memory databases, Claude documentation
- **Contents**: .claude/, scripts/, .chroma_db/, .memory_db/, MCP server code
- **Do NOT launch Claude from here**: Always use /vana directory

**HYBRID WORKFLOW**
1. **Always** launch Claude Code from `/vana/` directory
2. The `.mcp.json` in `/vana/` points to MCP servers in `/vana_vscode/`
3. All code changes happen in `/vana/` (no need to switch directories)
4. MCP data persists in `/vana_vscode/` (not tracked in git)
5. No virtual environment conflicts - everything just works!:

## Project Overview: Vana (Virtual Autonomous Network Agents)

Vana is a multi-agent AI system based on Google's Agent Development Kit (ADK) for Python. The project uses the `adk_gemini_fullstack` template as its foundation to create a sophisticated, production-ready research agent system with human-in-the-loop capabilities.

### Key Characteristics
- **NOT using Google Agent Engine** - Uses Cloud Run deployment with different memory system and instantiation process
- Based on Google ADK Starter Pack patterns (https://googlecloudplatform.github.io/agent-starter-pack/)
- Implements multi-agent workflows with Gemini for planning, reasoning, and synthesis
- **Custom Vana Frontend**: Replaced ADK default UI with custom React frontend featuring WebSocket-based real-time updates
- **Mobile-First Design**: Responsive UI with bottom sheet thinking panel and touch-optimized interactions
- **Advanced UI Components**: ContextualLoading, AgentProgress, MessageActions with comprehensive design system
- Includes enhanced FastAPI backend with persistent session storage and health monitoring

## Google Cloud Configuration

### Project Details
- **Project ID**: analystai-454200
- **Project Number**: 960076421399
- **Region**: us-central1
- **Google Secret Manager used for API keys and other sensitive information**

### Cloud Run Endpoints
- **Development**: https://vana-dev-960076421399.us-central1.run.app
- **Production**: https://vana-prod-960076421399.us-central1.run.app
- **CI/CD**: System will utilize Google ADK developed CI/CD pipeline https://googlecloudplatform.github.io/agent-starter-pack/guide/deployment.html

### RAG Configuration
- **RAG Engine Corpus**: projects/analystai-454200/locations/us-central1/ragCorpora/2305843009213693952
- **Embedding Model**: text-embedding-005
- **Vector Database**: RagManaged vector store

### Storage Buckets
- `analystai-454200-vana-logs-data` - Logs and telemetry data
- `analystai-454200-vana-builds` - Build artifacts
- `analystai-454200-vana-session-storage` - **NEW**: Persistent session storage (auto-created)
- `analystai-454200-vector-search-docs` - Vector search documentation
- `analystai-454200-vector-search` - Vector search data
- `analystai-454200-storage` - General storage
- `analystai-454200_cloudbuild` - Cloud Build artifacts

### Services Configuration
- **Google Secrets Manager**: https://console.cloud.google.com/security/secret-manager
- **Firebase Auth**: For user authentication
- **Vertex AI**: For RAG and embeddings
- **Cloud Build**: For CI/CD pipelines

## MCP Server Architecture **These MCP's are for local development only and NOT part of VANA's system**

The workspace integrates 5 MCP servers (configured in `.mcp.json`):

1. **chroma-vana**: Persistent vector database for document storage/retrieval
   - Data stored in `.chroma_db/`
   - Python module: `lib.mcp.servers.chroma_server` (needs implementation)
   - Auto-approved tools: `chroma_query_documents`, `chroma_get_documents`, `chroma_get_collection_count`, `chroma_list_collections`, `chroma_add_documents`

2. **memory-mcp**: Graph-based knowledge/memory storage
   - Data stored in `.memory_db/`
   - Python module: `lib.mcp.servers.memory_server`
   - Auto-approved tools: `create_entities`, `create_relations`, `add_observations`, `search_nodes`, `read_graph`

3. **firecrawl**: Web scraping and crawling service
   - NPX-based server: `npx -y firecrawl-mcp`
   - API Key: [Stored in environment variable FIRECRAWL_API_KEY]

4. **linear**: Linear issue tracking integration
   - NPX-based server: `npx -y @mseep/linear-mcp-server`
   - Requires LINEAR_API_KEY environment variable
   - Auto-approved tools: `get_ticket`, `get_my_issues`, `search_issues`, `create_issue`

5. **kanban-board**: Local kanban task management
   - External Python server at `/Users/nick/Development/kanban/`
   - Data stored in `/Users/nick/Development/kanban/kanban-data.json`
   - Auto-approved all task management tools

## ADK Gemini Fullstack Architecture **First starter pack multi-agent team being deploye. We will deploy additional agent teams**

### Two-Phase Workflow

#### Phase 1 (Current): Plan & Refine (Human-in-the-Loop) 
1. User provides research topic
2. Agent generates research plan with goals
3. User approves or refines the plan
4. Uses tags: [RESEARCH], [DELIVERABLE], [MODIFIED], [NEW], [IMPLIED]

#### Phase 2: Execute Autonomous Research
1. **Outlining**: Converts plan to structured outline
2. **Iterative Research Loop**:
   - Search for information
   - Critique findings for gaps
   - Refine with follow-up searches
3. **Compose Final Report**: Creates polished report with citations

### Key Agent Components
- `interactive_planner_agent`: Handles planning phase
- `section_researcher` & `enhanced_search_executor`: Perform searches
- `report_composer_with_citations`: Creates final report
- `plan_generator` & `section_planner`: Used for timeline labels

### Configuration Files
- `app/agent.py`: Core agent logic and sub-agent definitions
- `app/config.py`: ResearchConfiguration dataclass with parameters
- `deployment/terraform/`: Infrastructure as code
- Frontend code in `/frontend` directory

## Development Commands

### Prerequisites
- **uv**: Python package manager - [Install](https://docs.astral.sh/uv/getting-started/installation/)
- **Google Cloud SDK**: For GCP services - [Install](https://cloud.google.com/sdk/docs/install)
- **Terraform**: For infrastructure deployment - [Install](https://developer.hashicorp.com/terraform/downloads)
- **make**: Build automation tool (pre-installed on most Unix-based systems)
- **Python 3.10+**: Required for ADK

### Project Setup (Using ADK Starter Pack)
```bash
# Create new Vana project with ADK
agent-starter-pack create vana -a adk_gemini_fullstack -d cloud_run

# Include data ingestion for RAG
agent-starter-pack create vana -a adk_gemini_fullstack -d cloud_run --include-data-ingestion -ds vertex_ai_vector_search
```

### Local Development
```bash
cd vana
make install       # Install all required dependencies using uv
make dev          # Run both frontend and backend locally
make dev-backend  # Start only the ADK API server
make dev-frontend # Start only the React frontend
make playground   # Launch local dev with backend and frontend using 'adk web' command
```

### Testing and Validation
```bash
make lint          # Run code quality checks (codespell, ruff, mypy)
make test          # Run unit and integration tests
uv run jupyter lab # Launch Jupyter notebook for prototyping
```

### Deployment
```bash
# Development deployment (manual)
gcloud config set project analystai-454200
make setup-dev-env  # Set up development environment resources using Terraform
make backend        # Deploy agent to Cloud Run (use IAP=true for Identity-Aware Proxy)

# Production deployment (automated CI/CD)
uvx agent-starter-pack setup-cicd  # One-command deployment of entire CI/CD pipeline

# Local backend testing
make local-backend  # Launch local development server
```

### Working with PRP (Project Requirement Plans)
```bash
# Generate a new PRP for a feature
/generate-prp feature-file.md

# Execute an existing PRP
/execute-prp PRPs/feature-name.md
```

## Project Structure

**CRITICAL**: This project uses a dual-directory structure. Understanding which files go where is essential.

### Directory Structure Overview

```
/Users/nick/Development/
├── vana/                      # 🚀 MAIN PROJECT REPOSITORY (Git-tracked)
│   ├── .claude_workspace/    # Working documents (Git-tracked)
│   │   ├── analysis/         # Technical analysis documents
│   │   ├── guides/           # Implementation guides and references
│   │   └── plans/            # Implementation and migration plans
│   ├── .cloudbuild/          # Cloud Build CI/CD configurations
│   ├── app/                  # Backend FastAPI application
│   │   └── utils/            # Utility modules
│   ├── deployment/           # Terraform infrastructure
│   │   └── terraform/
│   │       ├── dev/          # Dev environment config
│   │       │   └── vars/
│   │       └── vars/
│   ├── docs/                 # Documentation assets
│   │   └── images/
│   ├── frontend/             # Custom Vana React frontend (replaced ADK default)
│   │   └── src/
│   │       ├── components/   # ChatInterface, ThinkingPanel, etc.
│   │       │   └── ui/      # Custom AI components & kibo-ui
│   │       ├── hooks/        # useWebSocket and other hooks
│   │       ├── services/     # WebSocket service implementation
│   │       └── types/        # TypeScript definitions
│   ├── notebooks/            # Jupyter notebooks for agent development
│   └── tests/                # Test suite
│       ├── integration/
│       ├── load_test/
│       └── unit/
│
└── vana_vscode/              # 💻 DEVELOPMENT WORKSPACE (NOT Git-tracked)
    ├── .chroma_db/           # ChromaDB storage (persistent)
    ├── .claude/              # Claude-specific documentation
    │   ├── adk-documentation/  # Scraped ADK docs
    │   ├── agents/           # Agent-specific docs
    │   ├── commands/         # Command definitions
    │   ├── settings/         # Settings configs
    │   ├── specs/            # Specification documents
    │   │   └── vana-adk-setup/
    │   ├── steering/         # Steering documents
    │   └── system-prompts/   # System prompt templates
    ├── .claude_workspace/    # Development tools and scripts
    │   └── scripts/          # Utility scripts
    ├── .memory_db/           # Memory graph storage (persistent)
    ├── .vscode/              # VS Code configuration
    ├── lib/                  # Python library code
    │   └── mcp/
    │       └── servers/      # MCP server implementations
    └── venv/                 # Python virtual environment for MCP

```

### File Organization Rules

#### What Goes in `/vana/` (Main Repository)
- ✅ **All production code**: Python, JavaScript, TypeScript files
- ✅ **Project configuration**: Makefile, pyproject.toml, package.json
- ✅ **Application code**: Backend (app/), frontend code
- ✅ **Infrastructure**: Terraform configurations, Cloud Build files
- ✅ **Tests**: All test files and test data
- ✅ **Documentation**: README.md (project docs only)
- ✅ **Dependencies**: requirements.txt, package-lock.json
- ✅ **Git files**: .gitignore, .gitattributes

#### What Goes in `/vana_vscode/` (Workspace)
- 💻 **Claude configuration**: .mcp.json, CLAUDE.md
- 💻 **AI documentation**: .claude/ directory with specs and steering
- 💻 **Development tools**: .claude_workspace/scripts/
- 💻 **Local databases**: .chroma_db/, .memory_db/
- 💻 **IDE configuration**: .vscode/ settings
- 💻 **Session artifacts**: Temporary files, logs, debugging outputs
- 💻 **MCP server data**: All MCP-related storage

#### Synchronization Rules
2. **Code changes**: ALWAYS make in `/vana/` directory
3. **Documentation updates**: Edit in `/vana_vscode/.claude/`, don't sync to main repo
4. **Scripts and tools**: Keep in `/vana_vscode/.claude_workspace/scripts/`

### Working Directory Guidelines

```bash
# ALWAYS work from the vana directory
cd /Users/nick/Development/vana

# Launch Claude Code
claude-code .

# Run the application
make dev

# Deploy to development
make backend

# Run tests
make test
```

**Note**: You no longer need to switch between directories or worry about virtual environments!

### Important Reminders
- 🚨 **NEVER** commit `.mcp.json`, `.chroma_db/`, or `.memory_db/` to git
- 🚨 **NEVER** create production code in `/vana_vscode/`
- 🚨 **ALWAYS** run git commands from `/vana/` directory
- 🚨 **ALWAYS** keep MCP server data in `/vana_vscode/`

## Development Workflow

### 1. Initial Setup
- Install prerequisites: uv, Google Cloud SDK, Terraform, make
- Configure Google Cloud authentication with proper project ID
- Create project using `agent-starter-pack create` command
- Run `make install` to set up dependencies

### 2. ADK Development Workflow ("Bring Your Own Agent")
1. **Prototype**: Build your AI agent logic using notebooks in `notebooks/` directory
   - Use `adk_app_testing.ipynb` for testing agent functionality
   - Use `evaluating_adk_agent.ipynb` for performance evaluation
2. **Integrate**: Import your agent into the app by editing `app/agent.py`
3. **Test**: Use `make playground` to explore agent functionality
   - Features: chat history, user feedback, various input types
   - Auto-reloads on code changes
4. **Deploy**: Set up CI/CD pipelines with `uvx agent-starter-pack setup-cicd`
5. **Monitor**: Track performance using Cloud Logging, Tracing, and Looker Studio

### 4. Iterative Development
- Use TodoWrite tool to track all tasks
- Test locally with `make dev` or `make playground` before deployment
- Deploy to dev environment with `make backend` for validation
- Only proceed to next chunk after successful deployment
- Use `make lint` and `make test` before committing changes

### 5. MCP Server Usage (Local Development Only)
- **ChromaDB**: Store/retrieve code patterns, documentation, ADK examples
- **Memory Graph**: Create entities and relations for project knowledge
- **Kanban Board**: Track implementation tasks and progress
- **Firecrawl**: Scrape documentation and web resources
- **Linear** (NOT ACTIVE): Manage issues and tickets

## Recent Architectural Improvements (v1.0.0)

### Backend Enhancements by frontend-api-specialist

#### Session Management Upgrade
- **Persistent Storage**: Migrated from `session_service_uri = None` to Google Cloud Storage
- **Automatic Provisioning**: `session_service_uri = f"gs://{project_id}-vana-session-storage"`
- **Bucket Auto-Creation**: Automatic bucket creation during server startup
- **State Preservation**: Sessions now persist across server restarts and deployments

#### Health Monitoring & Service Reliability
- **New Health Endpoint**: Added `/health` endpoint for comprehensive service validation
- **Enhanced Error Handling**: Improved error recovery across all backend services
- **Memory Management**: WeakMap-based service factory preventing memory leaks
- **Dependency Cleanup**: Removed unused `socket.io-client` package from dependencies

#### Configuration & Environment
- **Flexible Configuration**: App configuration now driven by environment variables
- **Dynamic Endpoints**: Backend configuration adapts to environment settings
- **Enhanced Monitoring**: Improved tracing and logging capabilities

### Frontend Enhancements by llm-ui-designer

#### Mobile-First Design System
- **Responsive Bottom Sheet**: Thinking panel converted to responsive bottom sheet for mobile
- **Touch Optimization**: Enhanced touch interactions and gesture handling
- **Progressive Disclosure**: Intelligent information architecture reducing cognitive load

#### New Advanced UI Components

**ContextualLoading Component** (`/frontend/src/components/ui/ContextualLoading.tsx`)
- Phase-specific loading states (Planning → Researching → Evaluating → Composing)
- Contextual activity messages that cycle automatically
- Progress tracking with time estimates and elapsed time display
- Animated state transitions with theme-aware styling
- Support for both determinate and indeterminate progress indicators

**AgentProgress Component** (`/frontend/src/components/AgentProgress.tsx`)
- Grouped agent activity visualization with status tracking
- Collapsible detail levels (minimal, summary, detailed)
- Real-time status indicators (active, complete, pending)
- Progress bars with confidence scoring
- Agent-specific task breakdown and activity monitoring

**MessageActions Component** (`/frontend/src/components/MessageActions.tsx`)
- Copy message content to clipboard with visual feedback
- Regenerate response functionality
- Feedback collection system (thumbs up/down with optional text)
- Share functionality using native browser sharing API
- Download/save message content as text files
- Contextual menu system with smooth animations

#### Design System & Performance
- **Comprehensive Design Tokens**: Standardized spacing, colors, states, and visual hierarchy
- **Animation System**: Consistent motion design using Framer Motion
- **Accessibility Features**: ARIA labels, keyboard navigation, screen reader support
- **Performance Optimization**: Retry logic, timeout handling, connection health monitoring

#### Environment Configuration
- **Frontend Environment Variables**: New comprehensive configuration system
- **Performance Tuning**: Configurable retry attempts, delays, and timeouts
- **Debug Capabilities**: Enhanced logging and development tools

### Updated Component Architecture

#### New Component Locations
```
frontend/src/components/
├── ui/
│   ├── ContextualLoading.tsx     # NEW: Phase-aware loading states
│   └── kibo-ui/                  # AI-specific component library
├── AgentProgress.tsx             # NEW: Multi-agent visualization
├── MessageActions.tsx            # NEW: Message interaction system
├── ChatInterface.tsx             # Enhanced with new components
└── SimplifiedThinkingPanel.tsx   # Mobile-optimized thinking panel
```

#### Environment Variables (Frontend)
```bash
# API Configuration
VITE_API_URL=http://localhost:8000    # Backend API URL
VITE_APP_NAME=app                     # App name for API endpoints

# Performance Configuration  
VITE_MAX_RETRIES=5                    # Maximum retry attempts
VITE_RETRY_DELAY=1000                 # Delay between retries (ms)
VITE_TIMEOUT=30000                    # Request timeout (ms)
VITE_ENABLE_LOGGING=true              # Enable debug logging
```

### Development Impact

#### Updated Development Workflow
1. **Health Monitoring**: Use `/health` endpoint to verify service status during development
2. **Session Persistence**: Sessions now maintained across development server restarts
3. **Mobile Testing**: Test responsive design and touch interactions on mobile devices
4. **Component Development**: Use new UI components as building blocks for future features

#### Enhanced Testing Capabilities
- **Service Health**: Automated health check validation
- **Mobile Responsiveness**: Touch interaction and viewport testing
- **Loading States**: Contextual loading behavior validation
- **User Actions**: Message interaction and feedback system testing

## Memory System Best Practices (ChromaDB & Knowledge Graph)

### ChromaDB Usage Guidelines

#### 1. Document Storage Strategy
- **Code Patterns**: Store reusable code snippets with full context (imports, usage examples)
- **Documentation**: Index technical docs, API references, and ADK patterns
- **Session Context**: Store important decisions and rationale from coding sessions
- **Metadata Standards**: Always include: `file_path`, `content_type`, `language`, `timestamp`, `source`

#### 2. Collection Organization

**IMPORTANT**: Use existing collection names as-is. Do not rename.

**Existing Collections** (DO NOT RENAME):
- `adk_documentation`: Core ADK concepts and architecture overview (8 structured sections covering architecture, patterns, deployment)
- `adk_knowledge_base_v2`: Comprehensive ADK reference documentation (106 detailed pages including API docs, examples, implementation guides)

**Understanding the Collections**:
- Despite the "v2" suffix, `adk_knowledge_base_v2` is the primary reference collection
- Think of `adk_documentation` as the "executive summary" and `adk_knowledge_base_v2` as the "detailed manual"

**Future Collections** (use proper naming convention `[domain]_[content_type]`):
- `vana_code_patterns`: Reusable code templates and implementations
- `vana_project_context`: Project-specific configurations and decisions
- `vana_error_solutions`: Known errors and their solutions

#### 3. Query Best Practices
- Always query relevant collections before implementing new features
- Use metadata filtering to narrow results (e.g., `{"language": "python", "framework": "adk"}`)
- Combine semantic search with keyword filtering for precision
- Query multiple related collections for comprehensive context

**Collection Selection Guide**:
| Task Type | Primary Collection | Secondary Collection |
|-----------|-------------------|---------------------|
| Understanding ADK concepts | `adk_documentation` | `adk_knowledge_base_v2` |
| Finding implementation details | `adk_knowledge_base_v2` | `vana_code_patterns` |
| Looking for code examples | `adk_knowledge_base_v2` | `vana_code_patterns` |
| Checking project decisions | `vana_project_context` | - |
| Debugging errors | `vana_error_solutions` | `adk_knowledge_base_v2` |

#### 4. Autonomous Update Triggers
Claude should automatically update ChromaDB when:
- Discovering new code patterns during implementation
- Finding solutions to errors or bugs
- Learning project-specific conventions
- Documenting architectural decisions

### Knowledge Graph (Memory MCP) Guidelines

#### 1. Entity Modeling for Vana Project
```
Core Entities:
- Project Components (agents, services, modules)
- Dependencies (libraries, frameworks, APIs)
- Configuration (settings, environment variables)
- Development Tasks (features, bugs, improvements)
- Decisions (architectural choices, trade-offs)
```

#### 2. Relationship Patterns
- `USES`: Component dependencies
- `IMPLEMENTS`: Feature implementations
- `CONFIGURES`: Configuration relationships
- `RESOLVES`: Bug fixes and solutions
- `DEPENDS_ON`: Inter-component dependencies

#### 3. When to Use Knowledge Graph vs ChromaDB
| Use Case | ChromaDB | Knowledge Graph |
|----------|----------|-----------------|
| Finding similar code | ✓ | |
| Tracking dependencies | | ✓ |
| Storing code examples | ✓ | |
| Project architecture | | ✓ |
| Error solutions | ✓ | |
| Decision history | | ✓ |

#### 4. Autonomous Graph Updates
Claude should update the knowledge graph when:
- Creating new components or modules
- Establishing dependencies between components
- Making architectural decisions
- Discovering important relationships
- Tracking task progress and completions

### Integration Patterns

#### 1. Cross-System Queries
```python
# Example: Finding code and its relationships
# 1. Search ChromaDB for similar implementations
similar_code = chroma_query_documents(
    queries=["implement authentication"],
    collection="code_patterns"
)

# 2. Get relationships from knowledge graph
for code in similar_code:
    entity = search_nodes(query=code['metadata']['component'])
    dependencies = read_graph(entity_ids=[entity['id']], depth=2)
```

#### 2. Session Memory Pattern
- **Short-term**: Use ChromaDB for current session context
- **Long-term**: Transfer important decisions to knowledge graph
- **Cross-reference**: Link ChromaDB documents to graph entities

#### 3. Consistency Maintenance
- Use shared identifiers between systems
- Implement bi-directional references
- Regular validation of cross-system links
- Clean up orphaned entries

### Specific Instructions for Claude Code

#### Before Starting Any Task:
1. Query ChromaDB for similar implementations or patterns
2. Check knowledge graph for project relationships and dependencies
3. Look for previous decisions or solutions in both systems

#### During Implementation:
1. Store new patterns discovered in ChromaDB with rich metadata
2. Update knowledge graph with new components and relationships
3. Document decisions and rationale in appropriate system

#### After Completing Tasks:
1. Add successful solutions to ChromaDB for future reference
2. Update knowledge graph with completed implementations
3. Create observations for important learnings

#### CRUD Operations:
- **Create**: Add new documents/entities when discovering patterns or creating components
- **Read**: Always check memory before implementing (prevents redundant work)
- **Update**: Modify existing entries when patterns evolve or improve
- **Delete**: Remove outdated patterns, but preserve in knowledge graph for history

### Performance Optimization

1. **Batch Operations**: Group multiple updates together
2. **Selective Indexing**: Only index high-value content
3. **Query Optimization**: Use metadata filters before semantic search
4. **Cache Management**: Reuse recent query results within same session

### Example Workflow

```python
# 1. Starting a new feature
# Query for similar features
existing_patterns = chroma_query_documents(
    queries=["implement user authentication"],
    collection="code_patterns",
    n_results=5
)

# Check project structure
auth_components = search_nodes(
    query="authentication",
    entity_type="component"
)

# 2. During implementation
# Store new pattern discovered
chroma_add_documents(
    documents=[new_auth_pattern],
    metadatas=[{
        "type": "authentication",
        "framework": "fastapi",
        "tested": True
    }],
    collection="code_patterns"
)

# Update knowledge graph
create_entities([{
    "name": "AuthenticationModule",
    "type": "component",
    "attributes": {"path": "app/auth", "status": "implemented"}
}])

# 3. After completion
# Add observations about the implementation
add_observations([{
    "entity_id": auth_module_id,
    "content": "Implemented JWT-based authentication with refresh tokens",
    "tags": ["security", "authentication", "completed"]
}])
```

## Monitoring and Observability

The application uses OpenTelemetry for comprehensive observability:
- **Cloud Trace**: All traces and spans for performance monitoring
- **Cloud Logging**: Centralized logging for debugging and audit
- **BigQuery**: Long-term storage of all events for analysis
- **Looker Studio Dashboard**: [Template Dashboard](https://lookerstudio.google.com/reporting/46b35167-b38b-4e44-bd37-701ef4307418/page/tEnnC) for visualizing events

### Monitoring Setup
1. Events are automatically sent to Cloud Trace and Logging
2. BigQuery stores events for historical analysis
3. Use the Looker Studio template (see "Setup Instructions" tab in dashboard)
4. Monitor performance metrics and user interactions

## Important Implementation Notes

1. **Cloud Run vs Agent Engine**: Vana specifically uses Cloud Run deployment, NOT Google Agent Engine. This affects memory system and instantiation patterns.

2. **ADK Patterns**: Follow patterns from the adk_gemini_fullstack template, especially the two-phase workflow and agent naming conventions.

3. **Frontend Integration**: Agent names in backend must match frontend expectations for proper UI updates and timeline tracking.

4. **Validation Gates**: Always run `make lint` and `make test` before deployment. Use the make commands for consistency.

5. **Documentation**: 
   - Keep all working documentation in `.claude_workspace/`
   - Move inactive docs to `.claude_workspace/.archive/`
   - GEMINI.md provides context for AI tools like Gemini CLI

6. **Memory Systems**: Always use ChromaDB and Knowledge Graph to maintain context and prevent redundant work. Query before implementing, store after learning.

7. **Agent Starter Pack Version**: This project was generated with `googleCloudPlatform/agent-starter-pack` version `0.10.0`

## Environment Variables

Required environment variables for full functionality:
- `GOOGLE_API_KEY`: For Gemini API access
- `LINEAR_API_KEY`: For Linear integration (if using)
- `CHROMA_CLIENT_TYPE`: Set to "persistent" for ChromaDB
- `CHROMA_DATA_DIR`: Path to ChromaDB storage
  
### Implementation Notes
- Execute tasks one at a time from tasks.md
- Each task includes specific validation steps
- Use `make` commands for consistency
- Run ADK evaluation tests using CLI methods (not Web UI)
- Deploy to Cloud Run development environment for testing

## Hybrid Setup Configuration (IMPORTANT)
1. **`.mcp.json` in `/vana/`**: Points to MCP servers in `/vana_vscode/`
2. **Working directory**: Always `/vana/` (avoids venv conflicts)
3. **MCP data storage**: Remains in `/vana_vscode/` (not in git)

### Key Files
- `/vana/.mcp.json`: MCP configuration (in .gitignore)
- `/vana/.venv/`: Project virtual environment (managed by uv)
- `/vana_vscode/.chroma_db/`: ChromaDB persistent storage
- `/vana_vscode/.memory_db/`: Knowledge graph storage
- `/vana_vscode/lib/mcp/servers/`: MCP server implementations

### If You Need to Debug MCP
```bash
# Check if MCP servers are accessible
cd /vana
# Use ChromaDB or Memory tools - they should work automatically
```

## References

- **ADK Documentation**: `.claude/adk-documentation/`
- **Google ADK Starter Pack**: https://googlecloudplatform.github.io/agent-starter-pack/
- **ADK Python SDK**: https://github.com/google/adk-python
- **ADK Samples**: https://github.com/google/adk-samples/tree/main/python/agents/gemini-fullstack