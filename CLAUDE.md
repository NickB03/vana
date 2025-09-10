# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL: PORT MANAGEMENT RULE

**ABSOLUTE RULE: NEVER CHANGE DESIGNATED PORTS**

### **Designated Ports:**
- **Frontend (Next.js)**: `3000` - NEVER change
- **Backend (FastAPI)**: `8000` - NEVER change

### **When Ports Are Occupied:**
1. **KILL the process using the port**
2. **LAUNCH service on the designated port**  
3. **NEVER adapt to alternative ports**

**Enforcement Commands:**
```bash
# Kill port 3000 and start frontend
kill -9 $(lsof -ti:3000) 2>/dev/null || true && npm run dev

# Kill port 8000 and start backend  
kill -9 $(lsof -ti:8000) 2>/dev/null || true && make dev-backend

# Use utility script
npm run clear-ports
```

**Violating this rule leads to configuration errors and test failures.**

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `.claude_workspace/` - **Working documents, drafts, notes, and temporary files during development**
- `/docs` - **Official project documentation only (API docs, architecture docs, etc.)**
- `/app` - Backend application code
- `/frontend` - Frontend code (under development)
- `/tests` - Test files
- `/scripts` - Utility scripts
- `/deployment` - Deployment configurations

**IMPORTANT DISTINCTION:**
- `.claude_workspace/` = Your workspace for drafts, analysis, working notes, temporary docs
- `/docs` = Final, polished project documentation for the repository

## 🔄 Repository Structure & Workflow

**PROJECT REPOSITORY:**
```
/Users/nick/Development/vana (Primary Repository)
├── /app                    # Backend (Python/FastAPI with Google ADK)
├── /frontend               # Frontend (Next.js) - Under development
├── /tests                  # Integration and unit tests
├── /docs                   # Documentation
└── All production code lives here
```

## Project Overview

Vana is a multi-agent AI research platform built on Google's Agent Development Kit (ADK) that transforms complex research questions into comprehensive reports. The system orchestrates 8 specialized AI agents working collaboratively with real-time streaming capabilities via Server-Sent Events (SSE).

## Tech Stack

**Backend:**
- Python 3.10+ with FastAPI
- Google ADK 1.8.0 for agent orchestration
- Google Gemini 2.5 Pro/Flash via AI Studio (primary - FREE with rate limits) / OpenRouter (fallback) for AI models
- PostgreSQL, ChromaDB for data storage
- JWT/OAuth2 authentication

**Frontend (Under Development):**
- Next.js with shadcn/ui components on port 3000
- Modern React components with TypeScript and Tailwind CSS

## Commands

### Development
```bash
# Install dependencies (uses uv package manager)
make install

# Start backend development server
make dev-backend     # Runs on http://localhost:8000

# Run ADK playground
make playground      # Runs on http://localhost:8501

# Run tests with coverage
make test           # Runs unit and integration tests

# Code quality checks
make lint           # Runs codespell, ruff, mypy
make typecheck      # Type checking only

# Docker development
make docker-up      # Start services in Docker
make docker-down    # Stop Docker services
make docker-logs    # View Docker logs
```

### Testing
```bash
# Run all tests (unit + integration)
make test                              # Primary test command

# Run specific test categories
make test-unit                         # Unit tests only
make test-integration                  # Integration tests only
make test-performance                  # Performance tests only

# Run with coverage reporting
make test-coverage                     # All tests with HTML coverage report
```

### Claude Flow Integration
```bash
# Hook commands for task coordination
make cf-pre-task TASK_DESC="description"    # Before starting task
make cf-post-task TASK_ID=123              # After completing task
make cf-session-end SESSION_ID=abc         # End session

# Development with hooks
make dev-with-hooks
make test-with-hooks
make build-with-hooks
```

## Project Architecture

### Directory Structure
```
/vana
├── /app                    # Backend (FastAPI + Google ADK)
│   ├── server.py          # Main FastAPI server
│   ├── agent.py           # ADK agent implementation
│   ├── models.py          # Data models
│   ├── config.py          # Configuration
│   ├── /auth              # Authentication logic
│   ├── /configuration     # Config management
│   └── /monitoring        # Metrics and logging
├── /tests                  # Test suite (NEW STRUCTURE)
│   ├── /unit              # Unit tests (app/, auth/, security/)
│   ├── /integration       # Integration tests (api/, sse/, adk/)
│   └── /performance       # Performance tests
├── /.claude_workspace/     # Claude working files and archives
│   └── /archived/         # Archived old test files
├── /docs                   # Documentation
├── /scripts               # Utility scripts
└── /deployment            # Deployment configs
```

### Key Components

**Multi-Agent System:**
- Team Leader: Coordinates research process
- Plan Generator & Section Planner: Research strategy
- Section Researcher & Enhanced Search: Information gathering
- Research Evaluator & Escalation Checker: Quality control
- Report Writer: Final report synthesis

**API Endpoints:**
- `/health` - Health check
- `/api/run_sse` - Execute research with SSE streaming
- `/api/apps/{app}/users/{user}/sessions` - Session management
- `/auth/login` - Authentication

## Configuration

### Environment Variables (.env.local)
```bash
# Required
BRAVE_API_KEY=your-brave-search-api-key
GOOGLE_CLOUD_PROJECT=your-project-id

# AI Model Configuration
# Primary: Google AI Studio (FREE with rate limits for development)
GOOGLE_API_KEY=your-google-ai-studio-api-key  # Get from https://aistudio.google.com/apikey

# Fallback: OpenRouter (optional - used when Google rate limits hit)
OPENROUTER_API_KEY=your-key  # Optional fallback

# Authentication
JWT_SECRET_KEY=your-jwt-secret  # For JWT auth
# OR set AUTH_REQUIRE_SSE_AUTH=false for development
```

### AI Model Selection
- **Primary**: Google Gemini 2.5 Pro/Flash via AI Studio (FREE tier with rate limits) - used for development to reduce API costs
- **Fallback**: OpenRouter with Qwen 3 Coder - automatically used when Google rate limits are hit or GOOGLE_API_KEY not set
- The system automatically handles model switching based on availability and rate limits

## Development Workflow

### Working with Agents
The codebase includes comprehensive agent tests in `tests/integration/test_adk_integration.py` and `tests/integration/test_agent.py` that demonstrate agent orchestration patterns.

### Authentication System
Multiple auth methods supported:
- OAuth2/JWT (primary)
- Firebase Auth
- API keys
- Development mode (AUTH_REQUIRE_SSE_AUTH=false)

See `app/auth/` for implementation details.

### Real-time Streaming
SSE implementation in `app/server.py` with memory leak prevention (see `tests/unit/test_sse_memory_leak_fixes.py`).

## CI/CD Pipeline

### Enterprise-Grade Optimized Pipeline
The project uses a sophisticated, multi-stage CI/CD pipeline (`ci-cd.yml`) with advanced security, performance optimization, and testing coordination running on self-hosted Digital Ocean VPS infrastructure.

### Pipeline Architecture

#### Security Gate System
- **Fork PR Protection**: Automatic security validation for external contributions
- **Repository Trust Verification**: Blocks untrusted fork PRs from self-hosted runners
- **Security Scanning**: Comprehensive vulnerability detection with artifact reporting
- **SBOM Generation**: Software Bill of Materials for compliance and security tracking

#### Performance Optimizations
- **Intelligent Caching**: Multi-level UV dependency caching with restore keys
- **Path-based Triggering**: Ignores documentation-only changes (`.md`, `docs/`, `.claude_workspace/`)
- **Conditional Execution**: Jobs run only when dependencies succeed
- **Parallel Processing**: Matrix strategy for concurrent test execution

#### Testing Strategy
- **Matrix Testing**: Parallel execution of unit and integration test suites
- **Fail-Fast Disabled**: Ensures all test categories complete for comprehensive feedback
- **Relaxed Validation**: Optimized for development phase with warning tolerance
- **Artifact Collection**: Test results, coverage reports, and security scans preserved

### Pipeline Stages

#### 1. Security Gate (Fork PR Protection)
```yaml
Triggers: pull_request_target events
Security: Validates repository trust before self-hosted execution
Output: Approval status for subsequent jobs
```

#### 2. Setup & Dependency Management
```yaml
Caching Strategy: Multi-level UV cache with Python version pinning
Performance: Cache-hit optimization reduces setup time significantly  
Environment: Python 3.10.17 with UV package manager
```

#### 3. Security Scanning
```yaml
Tools: Custom security scanner (scripts/security_scan.py)
Reporting: JSON security reports with 30-day retention
Configuration: Fail-on-critical vulnerabilities enabled
```

#### 4. Code Quality & Linting
```yaml
Checks: Ruff formatting, linting, codespell, mypy type checking
Strategy: Relaxed validation with warning tolerance
Performance: Runs in parallel with testing for efficiency
```

#### 5. Matrix Testing
```yaml
Strategy: Parallel unit and integration test execution
Matrix Dimensions: [unit, integration]
Failure Handling: Non-blocking failures during optimization phase
Artifacts: Test results, coverage reports (7-day retention)
```

#### 6. Build & Validation
```yaml
Validation: Application structure and dependency verification
SBOM: Automated Software Bill of Materials generation
Artifacts: Build artifacts and frozen requirements (30-day retention)
```

#### 7. Pipeline Summary
```yaml
Reporting: Comprehensive status summary across all stages
Decision Logic: Smart success/failure determination
Monitoring: Critical vs. warning-level failure classification
```

### Advanced Features

#### Smart Triggering
- **Events**: `push` (main), `pull_request_target` (main), `workflow_dispatch`
- **Path Exclusions**: Documentation and workspace changes ignored
- **Security Context**: Different handling for internal vs. external PRs

#### Artifact Management
- **Security Reports**: 30-day retention for compliance tracking
- **Test Results**: 7-day retention for debugging and analysis
- **Build Artifacts**: SBOM and frozen dependencies for deployment
- **Coverage Reports**: HTML coverage reports for quality monitoring

#### Self-Hosted Infrastructure
- **Platform**: Digital Ocean VPS runners for consistent environment
- **Performance**: No GitHub Actions minute consumption
- **Security**: Isolated execution environment for sensitive operations
- **Scalability**: Dedicated resources for parallel job execution

#### Environment Configuration
```bash
# Optimized environment variables
UV_CACHE_DIR: ~/.cache/uv          # UV package manager cache
PYTHONDONTWRITEBYTECODE: 1         # Performance optimization  
PYTHONUNBUFFERED: 1                # Real-time output streaming
CI: true                           # CI environment detection
NODE_ENV: test                     # Frontend testing configuration
```

### Pipeline Commands

#### Available Make Commands
```bash
make test                    # Full test suite (unit + integration)
make test-unit              # Unit tests only
make test-integration       # Integration tests only  
make test-performance       # Performance benchmarks
make lint                   # Code quality checks
make typecheck             # Type validation
make install               # Dependency installation
```

#### Manual Execution
- **GitHub UI**: `workflow_dispatch` for on-demand pipeline runs
- **Local Testing**: All pipeline commands available via Makefile
- **Debugging**: Individual stage execution for troubleshooting

### Quality Gates

#### Success Criteria
- **Critical**: Setup and Build stages must succeed
- **Optional**: Linting and testing may have warnings during optimization
- **Security**: All security scans must pass for deployment readiness

#### Failure Handling
- **Graceful Degradation**: Warnings don't block pipeline completion
- **Comprehensive Reporting**: All failures logged with context
- **Smart Recovery**: Cache restoration and dependency retry logic

### Integration Benefits

#### Development Workflow
- **Fast Feedback**: Parallel execution reduces pipeline time
- **Quality Assurance**: Multi-layered validation ensures code quality
- **Security First**: Automated vulnerability detection and prevention
- **Artifact Preservation**: Long-term retention for compliance and debugging

#### Deployment Readiness
- **SBOM Compliance**: Automated software inventory for security teams
- **Dependency Tracking**: Frozen requirements for reproducible deployments  
- **Security Validation**: Comprehensive scanning before production release
- **Quality Metrics**: Coverage and performance data for monitoring

This enterprise-grade pipeline provides robust CI/CD capabilities with advanced security, performance optimization, and comprehensive testing while maintaining development velocity through intelligent caching and parallel execution strategies.

## Testing Strategy

Test coverage target: 85%+

### Current Test Structure:
- **Unit Tests** (`tests/unit/`): App logic, auth, security components
- **Integration Tests** (`tests/integration/`): API endpoints, SSE streaming, ADK agents  
- **Performance Tests** (`tests/performance/`): Load testing, benchmarks

### Previous Test Files (Archived):
Legacy test files preserved in `.claude_workspace/archived/tests_backup_*`:
- Health endpoint tests
- Security middleware tests  
- Rate limiting tests

### Test Commands:
- `make test` - Run unit + integration tests
- `make test-coverage` - Generate HTML coverage reports
- `make lint` - Code quality checks (includes test files)

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY COORDINATE:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

## 🚀 Available Agents

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

## SPARC Development Methodology

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Workflow Phases
1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🚨 CRITICAL: UI Component Rules - MUST FOLLOW

### ❌ ABSOLUTELY FORBIDDEN
1. **NEVER manually create UI components** - No writing component code from scratch
2. **NEVER copy/paste from shadcn docs** - Use CLI instead
3. **NEVER modify core shadcn files directly** - Extend via imports
4. **NEVER guess component implementation** - Use view command first
5. **NEVER ignore existing components** - Always check what's installed

### ✅ MANDATORY UI WORKFLOW

#### Adding New UI Components
```bash
# 1. ALWAYS check existing components first
ls frontend/src/components/ui/

# 2. Search for the component
npx shadcn@latest search @shadcn

# 3. Preview before adding
npx shadcn@latest view @shadcn/[component]

# 4. Add via CLI ONLY
npx shadcn@latest add @shadcn/[component]

# 5. Verify installation
cat frontend/src/components/ui/[component].tsx
```

### 📦 Currently Installed shadcn Components
- alert, avatar, badge, button, card, dialog
- dropdown-menu, form, icons, input, label, progress
- scroll-area, select, separator, sheet, sidebar
- skeleton, tabs, tooltip

## MCP Server Configuration

### Quick Setup
```bash
# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Add Browsertools MCP server for UI testing
claude mcp add browsertools npx @browsertools/mcp

# Add Shadcn MCP server for UI components
claude mcp add shadcn npx shadcn-mcp
```

### MCP Tool Categories
- **Coordination**: `swarm_init`, `agent_spawn`, `task_orchestrate`
- **Monitoring**: `swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`
- **Memory & Neural**: `memory_usage`, `neural_status`, `neural_train`, `neural_patterns`
- **GitHub Integration**: `github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`
- **Browser Automation**: `mcp__browsertools__` - Browser control via MCP
- **UI Components**: `mcp__shadcn__` - Component management via MCP

## Important Notes

- **Frontend Status**: Frontend is under active development with Next.js and shadcn/ui components.
- **Docker Support**: Full Docker support available via docker-compose for local development.
- **Production Deployment**: Cloud Run deployment commands are available but currently disabled in Makefile (see commented sections).
- **Session Persistence**: Sessions are persisted to allow resuming work across restarts.
- **Memory Management**: Comprehensive memory leak prevention for long-running deployments.
- **Concurrent Execution**: ALL operations must be batched in single messages for proper parallel execution.