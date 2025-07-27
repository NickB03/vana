# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**CRITICAL REQUIREMENT**: When implementing any features, you MUST follow the ADK Starter Pack Getting Started guide EXACTLY. Query the ChromaDB collections (`adk_documentation` and `adk_knowledge_base_v2`) before any implementation. Any deviation from the starter pack instructions requires explicit user approval.

## WORKSPACE STRUCTURE

**IMPORTANT**: This project uses a dual-directory structure:

### `/Users/nick/Development/vana/`
- **Purpose**: Clean ADK project directory (main repository)
- **Usage**: All project implementation and ADK setup
- **Note**: This is where ALL code changes should be made

### `/Users/nick/Development/vana_vscode/`
- **Purpose**: Local development workspace (NOT tracked in git)
- **Usage**: Claude Code sessions run from here
- **Contents**: .claude/, .claude_workspace/, ChromaDB, memory, MCP servers, documentation

**WORKFLOW**: Always run sessions from `/vana_vscode/` but implement changes in `/vana/`

## Steering Documents

The following steering documents provide focused guidance for AI assistants working on this project:

- **[Product Steering](.claude/steering/product.md)**: Product purpose, core features, user value proposition, and business logic rules
- **[Technical Steering](.claude/steering/tech.md)**: Tech stack, build system, common commands, and technical conventions
- **[Structure Steering](.claude/steering/structure.md)**: Directory organization, file naming patterns, component architecture, and key file locations

## Specification Documents

The following specification documents define the setup and implementation plan for Vana:

- **[ADK Setup Requirements](.claude/specs/vana-adk-setup/requirements.md)**: Requirements for setting up Vana following the ADK Getting Started guide
- **[ADK Setup Design](.claude/specs/vana-adk-setup/design.md)**: Technical design for the setup process and architecture
- **[ADK Setup Tasks](.claude/specs/vana-adk-setup/tasks.md)**: Implementation tasks for setting up the project

### Working with Specs

When implementing complex features or following detailed guides:
1. Use `/generate-prp` to create new specification documents
2. Use `/execute-prp` to execute existing specifications
3. Specs follow a three-phase workflow: Requirements → Design → Tasks
4. Each phase requires explicit user approval before proceeding
5. Implementation should follow tasks.md step-by-step, executing one task at a time

## Project Overview: Vana (Virtual Autonomous Network Agents)

Vana is a multi-agent AI system based on Google's Agent Development Kit (ADK) for Python. The project uses the `adk_gemini_fullstack` template as its foundation to create a sophisticated, production-ready research agent system with human-in-the-loop capabilities.

### Key Characteristics
- **NOT using Google Agent Engine** - Uses Cloud Run deployment with different memory system and instantiation process
- Based on Google ADK Starter Pack patterns (https://googlecloudplatform.github.io/agent-starter-pack/)
- Implements multi-agent workflows with Gemini for planning, reasoning, and synthesis
- Includes React frontend and FastAPI backend architecture

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

## ADK Gemini Fullstack Architecture

### Two-Phase Workflow

#### Phase 1: Plan & Refine (Human-in-the-Loop)
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
make install    # Install dependencies
make dev       # Run both frontend and backend locally
make playground # Interactive testing environment
```

### Testing and Validation
```bash
make lint      # Run linters (black, isort, flake8)
make typecheck # Type checking with mypy
make test      # Run pytest suite
python main.py # Test local execution
```

### Deployment
```bash
# Development deployment
gcloud config set project analystai-454200
make setup-dev-env
make backend

# Full CI/CD setup
uvx agent-starter-pack setup-cicd
```

### Working with PRP (Project Requirement Plans)
```bash
# Generate a new PRP for a feature
/generate-prp feature-file.md

# Execute an existing PRP
/execute-prp PRPs/feature-name.md
```

## Project Structure

```
vana/
├── CLAUDE.md                  # This file - project guidance
├── .mcp.json                  # MCP server configurations
├── .claude/                   # Claude-specific documentation
│   ├── specs/                # Specification documents
│   │   └── vana-adk-setup/  # ADK setup specifications
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   ├── steering/             # Steering documents
│   │   ├── product.md
│   │   ├── tech.md
│   │   └── structure.md
│   └── .archive/             # Archived documentation
├── .cloudbuild/               # Cloud Build CI/CD configurations
│   ├── deploy-to-prod.yaml
│   ├── pr_checks.yaml
│   └── staging.yaml
├── app/                       # Backend FastAPI application
│   ├── agent.py              # Core agent definitions
│   ├── config.py             # Configuration
│   ├── server.py             # FastAPI server
│   └── utils/                # Utility modules
│       ├── gcs.py
│       ├── tracing.py
│       └── typing.py
├── frontend/                  # React frontend application
├── deployment/                # Terraform infrastructure
│   └── terraform/
│       ├── variables.tf
│       ├── dev/
│       │   ├── variables.tf
│       │   └── vars/
│       │       └── env.tfvars
│       └── vars/
│           └── env.tfvars
├── tests/                     # Test suite
├── notebooks/                 # Jupyter notebooks
├── Makefile                   # Build automation
├── pyproject.toml            # Python project configuration
├── README.md                 # Project documentation
└── .venv/                    # Python virtual environment

vana_vscode/ (separate workspace directory)
├── .claude_workspace/         # Development tools and scripts
│   └── scripts/              # Utility scripts
├── .chroma_db/               # ChromaDB storage
├── .memory_db/               # Memory graph storage
└── .vscode/                  # VS Code configuration
    └── info.md              # Project credentials

```

### File Organization Rules
1. **Scripts and tools** → `.claude_workspace/scripts/`
2. **Documentation** → `.claude/`
3. **Production code** → Main project directories (`app/`, `lib/`, etc.)
4. **Temporary files** → Clean up immediately after use
5. **No loose files in root** → Everything should have a proper location

## Development Workflow

### 1. Initial Setup
- Install agent-starter-pack and create project structure
- Configure Google Cloud authentication
- Set up Python environment with required dependencies

### 2. PRP Workflow Guidelines
- PRPs must include comprehensive context, documentation URLs, and code examples
- Implementation must be broken into small chunks (1-2 features max per chunk)
- Each chunk requires local testing and dev deployment validation
- Use ChromaDB to store ADK patterns and implementation decisions

### 3. Iterative Development
- Use TodoWrite tool to track all tasks
- Test locally with `make dev` before deployment
- Deploy to dev environment for validation
- Only proceed to next chunk after successful deployment

### 4. MCP Server Usage
- **ChromaDB**: Store/retrieve code patterns, documentation, ADK examples
- **Memory Graph**: Create entities and relations for project knowledge
- **Kanban Board**: Track implementation tasks and progress
- **Firecrawl**: Scrape documentation and web resources
- **Linear** (NOT ACTIVE): Manage issues and tickets

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

## Important Implementation Notes

1. **Cloud Run vs Agent Engine**: Vana specifically uses Cloud Run deployment, NOT Google Agent Engine. This affects memory system and instantiation patterns.

2. **ADK Patterns**: Follow patterns from the adk_gemini_fullstack template, especially the two-phase workflow and agent naming conventions.

3. **Frontend Integration**: Agent names in backend must match frontend expectations for proper UI updates and timeline tracking.

4. **Validation Gates**: Always run lint, typecheck, and tests before deployment. Use the make commands for consistency.

5. **Documentation**: Keep all working documentation in `.claude/`. Move inactive docs to `.claude/.archive/`.

6. **Memory Systems**: Always use ChromaDB and Knowledge Graph to maintain context and prevent redundant work. Query before implementing, store after learning.

## Environment Variables

Required environment variables for full functionality:
- `GOOGLE_API_KEY`: For Gemini API access
- `LINEAR_API_KEY`: For Linear integration (if using)
- `CHROMA_CLIENT_TYPE`: Set to "persistent" for ChromaDB
- `CHROMA_DATA_DIR`: Path to ChromaDB storage

## Current Status and Next Steps

### Completed
- ✅ Project research and documentation gathering
- ✅ ADK documentation scraped and stored in ChromaDB collections
- ✅ Project structure organized with .claude directory
- ✅ Specification documents created for ADK setup (requirements, design, tasks)
- ✅ ChromaDB MCP server implementation
- ✅ Memory MCP server implementation
- ✅ Project renamed from my-awesome-agent to vana
- ✅ All Terraform configurations updated with Google Cloud project IDs
- ✅ GitHub repository cleaned up (removed old secrets, environments, workflows)

### Ready for Implementation
- 📋 **ADK Setup Tasks**: See [.claude/specs/vana-adk-setup/tasks.md](.claude/specs/vana-adk-setup/tasks.md)
  - Task 1: Retrieve and validate Getting Started guide
  - Task 2: Verify prerequisites (Python 3.10+, gcloud, Terraform, uv)
  - Task 3: Install ADK Starter Pack
  - Task 4-12: Complete setup following official guide
  
### Implementation Notes
- Execute tasks one at a time from tasks.md
- Each task includes specific validation steps
- Use `make` commands for consistency
- Run ADK evaluation tests using CLI methods (not Web UI)
- Deploy to Cloud Run development environment for testing

## References

- **ADK Documentation**: `.claude/adk-documentation/`
- **Google ADK Starter Pack**: https://googlecloudplatform.github.io/agent-starter-pack/
- **ADK Python SDK**: https://github.com/google/adk-python
- **ADK Samples**: https://github.com/google/adk-samples/tree/main/python/agents/gemini-fullstack