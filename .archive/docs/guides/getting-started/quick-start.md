# VANA Quick Start Guide

Get up and running with VANA's hierarchical agentic AI system in under 10 minutes.

## Prerequisites

- **Python 3.13+** (CRITICAL requirement)
- **Poetry** for dependency management
- **Git** for repository management
- **Google Cloud Project** (for production deployment)

## Environment Verification

First, verify your Python version:

```bash
python3 --version
# Must show Python 3.13.x or higher
```

If you don't have Python 3.13+, install it before continuing.

## 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/vana.git
cd vana

# Verify Python environment
poetry env use python3.13
poetry install

# Verify installation
poetry run python --version
```

## 2. Choose Your Mode

### Standard Mode (Legacy)
```bash
# Uses flat 3-agent architecture
python main.py
```

### Agentic Mode (Recommended)
```bash
# Uses hierarchical 5-level agent system
python main_agentic.py
```

## 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Minimum required:
echo "VANA_MODEL=gemini-2.5-flash" >> .env
echo "ENVIRONMENT=development" >> .env
echo "GOOGLE_API_KEY=your-api-key" >> .env

# For agentic mode (optional)
echo "VANA_AGENT_MODULE=agents.vana.team_agentic" >> .env
```

## 4. Test Basic Functionality

### Standard Mode Test
```bash
# Test core agent loading
poetry run python -c "
from agents.vana.team import root_agent
print('✅ VANA agent loaded successfully')
print(f'Available tools: {len(root_agent.tools)}')
"
```

### Agentic Mode Test
```bash
# Test hierarchical agent system
poetry run python -c "
from agents.vana.team_agentic import root_agent
print('✅ VANA Chat Agent loaded')
print(f'Sub-agents: {len(root_agent.sub_agents)}')
if root_agent.sub_agents:
    orchestrator = root_agent.sub_agents[0]
    print(f'✅ Master Orchestrator: {orchestrator.name}')
    print(f'✅ Specialists: {len(orchestrator.sub_agents)}')
"
```

## 5. Run Your First Agent

### Standard Mode
```bash
# Start the development server
poetry run python main.py
```

You should see:
```
INFO:agents.vana.team:VANA Orchestrator initialized with 9 tools
INFO:lib._shared_libraries.adk_memory_service:Initialized InMemoryMemoryService
✅ VANA system ready
```

### Agentic Mode (Recommended)
```bash
# Start the hierarchical agent server
poetry run python main_agentic.py
```

You should see:
```
🚀 Starting VANA Agentic AI Server...
📊 Phase 1: Hierarchical Agent System Active
✅ Root Agent: VANA_Chat
✅ Sub-agents: 1
✅ Orchestrator: HierarchicalTaskManager
✅ Specialists: 5
```

## 6. Basic Usage Examples

### File Operations
```python
# Example: Reading project files
from agents.vana.team import root_agent

# The agent can read and analyze files
result = await root_agent.process_request(
    "Read the README.md file and summarize the project"
)
```

### Task Coordination
```python
# Example: Complex task delegation
result = await root_agent.process_request(
    "Analyze the project structure and create a report on the architecture"
)
```

## 7. Test the API

### Standard Mode
```bash
# Test /run endpoint
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "What is 2+2?"}'
```

### Agentic Mode
```bash
# Test /api/v1/chat endpoint
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze the system architecture"}'

# Check health with enhanced info
curl http://localhost:8081/health
```

## System Status Check

Run this command to verify system health:

```bash
poetry run python scripts/test_agentic_system.py
```

## Next Steps

1. **[User Guide](../user-guide/README.md)** - Comprehensive usage documentation
2. **[API Reference](../api/README.md)** - Complete tool documentation  
3. **[Deployment Guide](../deployment/README.md)** - Production deployment
4. **[Troubleshooting](../troubleshooting/README.md)** - Common issues and solutions

## Known Status

### Phase 1 Complete ✅
- **Hierarchical Agent System**: 5-level architecture active
- **Infrastructure Utilization**: Increased from 46.2% to ~65%
- **Active Specialists**: 5 agents (Architecture, DevOps, QA, UI/UX, Data Science)
- **Task Routing**: Intelligent complexity-based routing

### In Development 🚧
- **Phase 2**: Tool redistribution from VANA to specialists
- **Phase 3**: Project Management agents (Sequential/Parallel/Loop)
- **Phase 4**: Maintenance agents (Memory/Planning/Learning)
- **Code Execution**: Temporarily disabled (sandboxing improvements)

### Known Limitations ⚠️
- **Vector Search**: Requires Google Cloud setup
- **Coordinated Search**: Import error in search_coordinator.py

## Need Help?

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Browse comprehensive guides
- **Community**: Join discussions and get support

---

*Last Updated: July 2025 | Version: 2.0.0-alpha | Phase 1 Complete | Infrastructure: ~65% functional*