# VANA Quick Start Guide

Get up and running with VANA in under 10 minutes.

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

## 2. Environment Configuration

```bash
# Copy environment template
cp .env.template .env.local

# Edit .env.local with your settings
# Minimum required:
echo "VANA_MODEL=gemini-2.0-flash" >> .env.local
echo "ENVIRONMENT=development" >> .env.local
```

## 3. Test Basic Functionality

```bash
# Test core agent loading
poetry run python -c "
from agents.vana.team import root_agent
print('✅ VANA agent loaded successfully')
print(f'Available tools: {len(root_agent.tools)}')
"

# Test memory system
poetry run python -c "
from lib._shared_libraries.adk_memory_service import ADKMemoryService
service = ADKMemoryService()
print('✅ Memory service initialized')
"
```

## 4. Run Your First Agent

```bash
# Start the development server
poetry run python main.py
```

You should see output similar to:
```
INFO:agents.vana.team:VANA Orchestrator initialized with 9 tools
INFO:lib._shared_libraries.adk_memory_service:Initialized InMemoryMemoryService
✅ VANA system ready
```

## 5. Basic Usage Examples

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

## System Status Check

Run this command to verify system health:

```bash
poetry run python -c "
import sys
print(f'Python: {sys.version}')

try:
    from agents.vana.team import root_agent
    print('✅ Core agents: Working')
except Exception as e:
    print(f'❌ Core agents: {e}')

try:
    from lib._shared_libraries.adk_memory_service import ADKMemoryService
    print('✅ Memory service: Working')
except Exception as e:
    print(f'❌ Memory service: {e}')

print('\\n🎯 VANA Quick Start Complete!')
"
```

## Next Steps

1. **[User Guide](../user-guide/README.md)** - Comprehensive usage documentation
2. **[API Reference](../api/README.md)** - Complete tool documentation  
3. **[Deployment Guide](../deployment/README.md)** - Production deployment
4. **[Troubleshooting](../troubleshooting/README.md)** - Common issues and solutions

## Known Limitations

- **Infrastructure Status**: 46.2% working (some advanced features in development)
- **Vector Search**: Not available in current build
- **Docker Execution**: Falls back to local execution
- **Coordinated Search**: Tool has known integration issues

## Need Help?

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Browse comprehensive guides
- **Community**: Join discussions and get support

---

*Last Updated: January 2025 | Tested with Python 3.13+ | Infrastructure: 46.2% functional*