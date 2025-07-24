# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## 🚨 Critical Requirements

**Python 3.13+ is MANDATORY** - The codebase will NOT function properly with older Python versions due to:
- Modern async patterns required by Google ADK
- SSL/TLS compatibility for production services
- Performance optimizations critical for agent coordination

**Development Process** - When responding to the user you should never respond without first completing all assigned tasks. The only exception is if you need to ask clarifying questions in order to continue. You should always use documented facts when responding you should never make assumptions based on partial knowledge. Before responding to the user always check your response and provide it an accuracy score from 1 through 10. ie; 10/10 (you confirmed your answer through documentation) 0/10 (you are making assumptions) 5/10 (you have a good idea but need to confirm)

**Agent Starter Kit First** - VANA is being rebuilt using Google's Agent Starter Kit (ASK) as the foundation:
1. **NO MODIFICATIONS** until ASK agents are verified working
2. **TEST FIRST** - Confirm multi-agent flow works with only .env changes
3. **DOCUMENT BASELINE** - Record working behavior before ANY changes
4. **VERIFY DEPLOYMENT** - Ensure ASK deploys successfully to Cloud Run

## 🎯 Development Philosophy

### Current Phase: Agent Starter Kit Verification
We are in the **verification phase**. The goal is to:
1. Install Agent Starter Kit using `uvx agent-starter-pack create`
2. Configure ONLY environment variables (no code changes)
3. Test the multi-agent sample flow works as expected
4. Deploy using ASK's cloudbuild.yaml
5. Document the baseline behavior

**DO NOT**:
- Modify agent code until verification complete
- Add new features or tools
- Change agent instructions or prompts
- Integrate with existing VANA code

**DO**:
- Use ASK's provided agents exactly as delivered
- Map environment variables to our Google Cloud setup
- Test thoroughly at each step
- Document what works and what doesn't

## 🧠 Memory Protocol

### Available Collections
After cleanup, we now have only:
1. **adk_complete_docs** - Official Google ADK documentation (96 chunks)
2. **adk_agent_starter_pack** - For storing ASK patterns and test results

### Required Memory Searches

Before ANY action, search for ADK patterns:
```python
# Check ADK documentation
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["<relevant_pattern>"],
    n_results=5
)
```

### Store ASK Verification Results
After testing ASK components:
```python
# Document baseline behavior
mcp__chroma-vana__chroma_add_documents(
    collection_name="adk_agent_starter_pack",
    documents=["ASK component X tested: behavior Y observed"],
    ids=["ask_test_<component>_<date>"],
    metadatas=[{"type": "baseline_test", "date": "<YYYY-MM-DD>", "status": "working/failed"}]
)
```

## 🏗️ Project Status

### Current State
- **Phase**: Agent Starter Kit Installation & Verification
- **Status**: Project cleaned and archived, ready for ASK
- **Archived**: All v1 code moved to `.archive-7.22.25/`
- **Memory**: Cleaned to contain only ADK documentation

### Immediate Goals
1. Run `uvx agent-starter-pack create vana-ask`
2. Configure environment variables
3. Test multi-agent research example
4. Deploy to Cloud Run using ASK's cloudbuild.yaml
5. Document verified working state

### Architecture Components
- **Agent System**: TBD (pending ASK verification)
- **Tools**: TBD (pending ASK verification)  
- **Memory**: TBD (pending ASK verification)
- **Deployment**: Will use ASK's cloudbuild.yaml

## 🛠️ Development Commands

### Agent Starter Kit Commands
```bash
# Install Agent Starter Kit
uvx agent-starter-pack create vana-ask

# After installation, use ASK's commands
cd vana-ask
python -m agent_framework.agent  # Run the agent
```

### Existing VANA Commands (for reference)
```bash
# Environment setup
python3 --version  # Must show 3.13.x
poetry install     # Install dependencies

# Development
make help          # Show all available commands
make setup         # Install all dependencies
make dev           # Start development environment

# Testing
poetry run pytest  # Run tests

# Code quality
make format        # Format code
make lint          # Run linting
make security      # Security scan
```

## 🚀 Deployment

### Agent Starter Kit Deployment (PRIMARY)
ASK includes its own `cloudbuild.yaml` for Google Cloud Build:
```bash
# From ASK directory after verification
gcloud builds submit --config=cloudbuild.yaml

# Or direct Cloud Run deployment for testing
gcloud run deploy ask-vana \
  --source . \
  --region=us-central1 \
  --set-env-vars="GOOGLE_GEMINI_API_KEY=$GOOGLE_API_KEY"
```

### Deployment Verification Steps
1. **Local Testing First**: Verify agents work locally
2. **Environment Variables**: Set required keys in .env
3. **Cloud Build**: Use ASK's cloudbuild.yaml
4. **Cloud Run**: Verify deployment succeeds
5. **Test Endpoints**: Confirm API responds correctly

### Environment Variables
Required for ASK (check ASK documentation for full list):
- `GOOGLE_GEMINI_API_KEY` - For Gemini model access
- `PORT` - Server port (default 8080 for Cloud Run)
- Additional variables per ASK requirements

## 📐 Project Conventions

### During Verification Phase
- **NO CODE MODIFICATIONS** to ASK samples
- **Document Everything** - Record all test results
- **Environment Only** - Only modify .env files
- **Test Systematically** - Follow ASK examples exactly

### File Organization (Temporary)
```
vana/
├── .archive-7.22.25/     # All archived V1 code
├── vana-ask/             # Agent Starter Kit installation
├── frontend/             # Preserved React frontend
├── lib/                  # Core infrastructure (logging, security, etc.)
└── CLAUDE.md            # This file
```

## 🔧 Configuration

### MCP Servers (Development Tools)
MCP servers remain available for development:
- **ChromaDB**: For searching documentation
- **Memory**: For maintaining development context
- Located in `lib/mcp/servers/`
- Configured in `.mcp.json`

### VS Code Settings
- Permission configuration in `.claude/settings.local.json`
- Auto-approves common development operations
- Maintains security for system-level changes

## 📚 ADK Knowledge Base

The ADK Knowledge Base contains all Google ADK documentation and is MANDATORY for development.

**Collection**: `adk_complete_docs` (96 documents)

### Required Checks Before ANY Implementation
```python
# 1. Agent patterns
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["LlmAgent", "agent initialization"],
    n_results=5
)

# 2. Tool patterns  
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["FunctionTool", "tool registration"],
    n_results=5
)

# 3. Multi-agent patterns
mcp__chroma-vana__chroma_query_documents(
    collection_name="adk_complete_docs",
    query_texts=["sub_agents", "multi-agent orchestration"],
    n_results=5
)
```

## 🔥 CRITICAL: Verification-First Approach

**ABSOLUTE REQUIREMENT**: No custom development until ASK verification is complete.

### ✅ Correct Approach
1. Install Agent Starter Kit
2. Configure environment variables only
3. Test provided examples work
4. Deploy using ASK's tools
5. Document baseline behavior
6. ONLY THEN consider modifications

### ❌ Invalid Actions (During Verification)
- Modifying agent code
- Adding custom tools
- Changing prompts or instructions  
- Integrating V1 VANA code
- Creating new agents

### 📝 Verification Checklist
- [ ] ASK installed successfully
- [ ] Environment variables configured
- [ ] Local multi-agent example works
- [ ] Deployment to Cloud Run succeeds
- [ ] API endpoints respond correctly
- [ ] Baseline behavior documented

Only after ALL items are checked can we proceed to customization phase.

## 📝 Workspace Rules

### Temporary File Management
All temporary work goes in `.claude_workspace/`:
```bash
# ✅ CORRECT
.claude_workspace/ask_test_results.md
.claude_workspace/deployment_notes.md

# ❌ WRONG  
./test_results.md      # Don't pollute root
./agents/notes.md      # Don't mix with code
```

### What Goes Where
| File Type | Location | Example |
|-----------|----------|---------|
| ASK test results | `.claude_workspace/` | `ask_baseline_test.md` |
| Deployment notes | `.claude_workspace/` | `ask_deployment_log.md` |
| ASK installation | `vana-ask/` | (or chosen directory name) |
| Archived V1 code | `.archive-7.22.25/` | All old implementations |

## 🎯 Success Metrics

The Agent Starter Kit verification is complete when:
1. **Multi-agent example runs** without code modifications
2. **Deployment succeeds** using ASK's cloudbuild.yaml
3. **API responds** to test queries correctly
4. **Baseline documented** in ChromaDB
5. **No V1 code mixing** - clean ASK implementation

Only after achieving these metrics should we proceed with ANY customization or integration work.

---
*Last Updated: January 22, 2025 - Prepared for Agent Starter Kit verification phase*