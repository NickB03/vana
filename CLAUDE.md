# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & CROSS-SESSION MEMORY

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP
5. **🔥 ALWAYS CHECK MEMORY FIRST** before searching files or claiming ignorance

#### Technology Stack
- **Framework**: React 18+ with TypeScript
- **UI Library**: shadcn/ui components via CLI and MCP tools
- **Component Library**: Prompt-Kit (shadcn registry) https://www.prompt-kit.com/llms-full.txt
- **Icons**: Lucide React
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand or React Query
- **Real-time**: EventSource API for SSE
- **Build Tool**: Turbopack
- **Testing**: React Testing Library

- **Architecture Patterns**:
  - **Tailwind Configuration**: Ensure `tailwind.config.js` is properly configured with all necessary utility classes enabled and scanning the correct files for style generation
  - **Global Styles**: Include any global CSS or base styles recommended by ShadCN, such as importing required global CSS files or Tailwind base layers that components depend on
  - **Style Conflicts**: Avoid conflicting CSS or other UI frameworks that may override Tailwind/ShadCN styles. Keep the stylesheet stack minimal by using only Tailwind and ShadCN to prevent style conflicts
  - **Version Compatibility**: Verify that React and Next.js versions are compatible with ShadCN components and meet any documented version requirements

### 🧠 CRITICAL: Cross-Session Memory Protocol

**EVERY NEW SESSION MUST START WITH MEMORY CHECK:**
```bash
# 1. List all stored memory
mcp__claude-flow__memory_usage --action list

# 2. Search for relevant knowledge
mcp__claude-flow__memory_search --pattern "knowledge|project|architecture"

# 3. Retrieve key project data
mcp__claude-flow__memory_usage --action retrieve --key "project/current-state"
mcp__claude-flow__memory_usage --action retrieve --key "knowledge/project-config"
```

**❌ NEVER claim you "don't know" without checking memory first**  
**✅ ALWAYS retrieve stored knowledge before file searches**

**MANDATORY PATTERNS:**
- **Memory First**: ALWAYS check memory before any other operations
- **Memory Writing**: ALWAYS store discoveries, progress, and results during work
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 💾 CRITICAL: Proactive Memory Writing Protocol

**EVERY AGENT MUST STORE:**
- **Discoveries**: `discoveries/[timestamp]` - Real-time findings
- **Progress**: `progress/[task-id]` - Current status updates
- **Results**: `results/[task-id]` - Final outcomes  
- **Learnings**: `learnings/[topic]` - Knowledge for future agents

**Example Memory Storage:**
```bash
# Store discoveries immediately
mcp__claude-flow__memory_usage --action store --key "discoveries/$(date +%s)" --value "Found OAuth implementation in app/auth/"

# Store progress during work
mcp__claude-flow__memory_usage --action store --key "progress/api-build" --value "Completed user endpoints, working on admin"

# Store final results
mcp__claude-flow__memory_usage --action store --key "results/api-build" --value "Successfully implemented REST API with JWT auth"
```
**Essential Data Stored in Memory:** **NEED TO CONFIRM IF DIRS MATCH CURRENT SETUP**
- `project/current-state` - Current project architecture and status
- `knowledge/project-config` - Project configuration and settings
- `instructions/development-guide` - Development guidelines and procedures
- `project/post-cleanup-status` - System status and cleanup info
- `environment/variables` - Environment-specific configuration

### 🎯 CRITICAL: Claude Code Task Tool for Agent Execution

**Claude Code's Task tool is the PRIMARY way to spawn agents:**
```javascript
// ✅ CORRECT: Use Claude Code's Task tool for parallel agent execution
[Single Message]:
  Task("Research agent", "Analyze requirements and patterns...", "researcher")
  Task("Coder agent", "Implement core features...", "coder")
  Task("Tester agent", "Create comprehensive tests...", "tester")
  Task("Reviewer agent", "Review code quality...", "reviewer")
  Task("Architect agent", "Design system architecture...", "system-architect")
```

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types for coordination
- `mcp__claude-flow__task_orchestrate` - Orchestrate high-level workflows

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## Dev environment overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

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

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start  # Optional: Enhanced coordination
claude mcp add flow-nexus npx flow-nexus@latest mcp start  # Optional: Cloud features
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

**Key MCP Tool Categories:**
- **Swarm & Agents**: `swarm_init`, `swarm_scale`, `agent_spawn`, `task_orchestrate`
- **Sandboxes**: `sandbox_create`, `sandbox_execute`, `sandbox_upload` (cloud execution)
- **Templates**: `template_list`, `template_deploy` (pre-built project templates)
- **Neural AI**: `neural_train`, `neural_patterns`, `seraphina_chat` (AI assistant)
- **GitHub**: `github_repo_analyze`, `github_pr_manage` (repository management)
- **Real-time**: `execution_stream_subscribe`, `realtime_subscribe` (live monitoring)
- **Storage**: `storage_upload`, `storage_list` (cloud file management)

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages

### Example Full-Stack Development:

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")
  
  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }
  
  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
# AUTO-LOAD CROSS-SESSION KNOWLEDGE:
mcp__claude-flow__memory_usage --action retrieve --key "knowledge/project-config"
mcp__claude-flow__memory_usage --action retrieve --key "project/current-state"
mcp__claude-flow__memory_search --pattern "project|architecture|config"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
# MANDATORY: Store discoveries and progress in memory
mcp__claude-flow__memory_usage --action store --key "discoveries/[timestamp]" --value "[findings]"
mcp__claude-flow__memory_usage --action store --key "progress/[task-id]" --value "[current_status]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
# MANDATORY: Store final results and learnings
mcp__claude-flow__memory_usage --action store --key "results/[task-id]" --value "[final_outcome]"
mcp__claude-flow__memory_usage --action store --key "learnings/[session-id]" --value "[what_was_learned]"
```

## 🎯 Concurrent Execution Examples

### ✅ OPTIMIZED WORKFLOW: Maximum Parallel Efficiency (8-12 Agents)

```javascript
// Step 1: MCP tools set up adaptive coordination (recommended)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "adaptive", maxAgents: 12 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "system-architect" }
  mcp__claude-flow__agent_spawn { type: "backend-dev" }
  mcp__claude-flow__agent_spawn { type: "frontend-dev" }
  mcp__claude-flow__agent_spawn { type: "tester" }
  mcp__claude-flow__agent_spawn { type: "reviewer" }
  mcp__claude-flow__agent_spawn { type: "perf-analyzer" }
  mcp__claude-flow__agent_spawn { type: "security-manager" }

// Step 2: Claude Code Task tool spawns ACTUAL agents (MAXIMUM PARALLEL)
[Single Message - 8-12 Agent Parallel Execution]:
  // Primary development agents
  Task("Research Specialist", "Analyze requirements, patterns, and best practices. Store findings in memory.", "researcher")
  Task("System Architect", "Design overall architecture and data flows. Document decisions.", "system-architect")
  Task("Backend Developer", "Implement REST API, authentication, and business logic.", "backend-dev")
  Task("Frontend Developer", "Build UI components and user interactions. Follow shadcn patterns.", "coder")
  Task("Database Engineer", "Design schema, optimize queries, handle migrations.", "code-analyzer")
  
  // Quality assurance agents
  Task("Test Engineer", "Create comprehensive test suite with 95%+ coverage.", "tester")
  Task("Code Reviewer", "Review code quality, security, and best practices.", "reviewer")
  Task("Performance Analyst", "Analyze and optimize performance bottlenecks.", "perf-analyzer")
  
  // Specialized coordination agents
  Task("Security Auditor", "Security review, vulnerability assessment, compliance.", "security-manager")
  Task("DevOps Engineer", "CI/CD, deployment, monitoring, infrastructure.", "cicd-engineer")
  Task("Documentation Agent", "API docs, technical documentation, guides.", "api-docs")
  Task("Integration Coordinator", "Ensure all components work together seamlessly.", "task-orchestrator")
  
  // Batch ALL todos in ONE call (10-15 recommended)
  TodoWrite { todos: [
    {content: "Research API patterns and best practices", status: "in_progress", activeForm: "Researching API patterns and best practices"},
    {content: "Design system architecture and data flows", status: "in_progress", activeForm: "Designing system architecture and data flows"},
    {content: "Implement backend REST API endpoints", status: "pending", activeForm: "Implementing backend REST API endpoints"},
    {content: "Build frontend UI components and interactions", status: "pending", activeForm: "Building frontend UI components and interactions"},
    {content: "Design and optimize database schema", status: "pending", activeForm: "Designing and optimizing database schema"},
    {content: "Create comprehensive test suite (95%+ coverage)", status: "pending", activeForm: "Creating comprehensive test suite"},
    {content: "Perform security audit and vulnerability assessment", status: "pending", activeForm: "Performing security audit and vulnerability assessment"},
    {content: "Analyze and optimize performance bottlenecks", status: "pending", activeForm: "Analyzing and optimizing performance bottlenecks"},
    {content: "Set up CI/CD pipeline and deployment", status: "pending", activeForm: "Setting up CI/CD pipeline and deployment"},
    {content: "Generate API documentation and guides", status: "pending", activeForm: "Generating API documentation and guides"},
    {content: "Review code quality and best practices", status: "pending", activeForm: "Reviewing code quality and best practices"},
    {content: "Integrate all components and test workflows", status: "pending", activeForm: "Integrating all components and testing workflows"},
    {content: "Monitor system performance and optimization", status: "pending", activeForm: "Monitoring system performance and optimization"},
    {content: "Validate deployment readiness and documentation", status: "pending", activeForm: "Validating deployment readiness and documentation"}
  ]}
  
  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/src/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

- **Session Stats**: Tracked in memory for performance monitoring

**🚨 CRITICAL FOR NEW SESSIONS:**
Before claiming you don't know something about the project, ALWAYS check these memory keys!

## CodeRabbit CLI Integration

### VS Code Tasks for CodeRabbit

The following VS Code tasks are available via **Cmd+Shift+P** → "Tasks: Run Task":

**AI Workflow (Recommended):**
- **CodeRabbit: Prompt Only (AI Workflow)** - AI prompts for Claude Code integration
- **CodeRabbit: AI Analysis (Uncommitted)** - AI prompts for uncommitted changes only

**Interactive Workflow:**
- **CodeRabbit: Interactive Review** - Full interactive mode
- **CodeRabbit: Plain Text Review** - Non-interactive plain text output
- **CodeRabbit: Uncommitted Changes** - Review only uncommitted changes
- **CodeRabbit: Committed Changes** - Review only committed changes  
- **CodeRabbit: Custom Config** - Use CLAUDE.md as configuration

### Claude Code Commands

Use these commands to trigger CodeRabbit via VS Code terminal:

```bash
# Direct script execution (recommended)
./scripts/coderabbit-helper.sh plain          # Plain text review
./scripts/coderabbit-helper.sh interactive    # Interactive review
./scripts/coderabbit-helper.sh uncommitted    # Uncommitted changes only
./scripts/coderabbit-helper.sh --help         # Show all options

# Alternative: VS Code task commands
code --command workbench.action.tasks.runTask "CodeRabbit: Plain Text Review"
code --command workbench.action.tasks.runTask "CodeRabbit: Interactive Review"
code --command workbench.action.tasks.runTask "CodeRabbit: Uncommitted Changes"
```

### Workflow Integration

**Two workflow modes available:**

#### AI-Driven Workflow (Preferred for Claude Code)
1. **User types**: `/cr-prompt` (or variations) in Claude Code
2. **Claude Code runs**: CodeRabbit `--prompt-only` automatically
3. **Claude Code**: Processes CodeRabbit analysis and implements fixes
4. **Benefit**: Seamless AI-to-AI knowledge transfer without terminal switching

#### Interactive Workflow (For complex issues)
1. **Claude Code**: Suggests running CodeRabbit via helper script
2. **Terminal**: CodeRabbit analyzes code in new VS Code terminal
3. **User**: Reviews CodeRabbit output and shares relevant findings
4. **Claude Code**: Works with CodeRabbit findings to implement fixes

**CRITICAL**: Use CodeRabbit `--prompt-only` for AI workflow integration!
**NEVER perform manual code analysis when CodeRabbit CLI is available!**

### Quick Commands

#### AI Workflow (Recommended)

**NEW: Claude Code Slash Commands** 🎉
```bash
/cr-prompt              # Analyze all changes
/cr-prompt uncommitted  # Only uncommitted changes
/cr-prompt committed    # Only committed changes
/cr-config              # Use CLAUDE.md configuration
/cr-help                # Show all CodeRabbit commands
```

**Manual Terminal Commands** (fallback)
```bash
# User runs in terminal, shares output with Claude Code
coderabbit --prompt-only                    # AI analysis prompts for Claude Code
coderabbit --prompt-only --type uncommitted # Only uncommitted changes  
coderabbit --prompt-only --config CLAUDE.md # Use project configuration
```

#### Interactive Workflow (Helper Scripts)
```bash
# Preferred: Use Node.js helper (better error handling)
node scripts/claude-coderabbit.js plain

# Alternative: Use shell script directly  
./scripts/coderabbit-helper.sh plain

# For specific scenarios
node scripts/claude-coderabbit.js uncommitted  # Review only uncommitted changes
node scripts/claude-coderabbit.js config       # Use CLAUDE.md configuration
```

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Flow-Nexus Platform: https://flow-nexus.ruv.io (registration required for cloud features)

---

Remember: **Memory First, Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
