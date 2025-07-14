# VANA Developer Guide

Complete guide for contributing to and developing with the VANA multi-agent AI system.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Contributing Guidelines](#contributing-guidelines)
3. [Code Standards](#code-standards)
4. [Testing Framework](#testing-framework)
5. [Tool Development](#tool-development)
6. [Agent Development](#agent-development)
7. [Debugging & Troubleshooting](#debugging--troubleshooting)

## Development Setup

### Prerequisites

- **Python 3.13+** (MANDATORY - see CLAUDE.md for requirements)
- **Poetry** for dependency management
- **Git** for version control
- **Google Cloud SDK** (for cloud features)
- **Docker** (optional - system falls back gracefully)

### Environment Setup

```bash
# Clone repository
git clone https://github.com/your-org/vana.git
cd vana

# Verify Python version
python3 --version  # Must be 3.13+

# Setup Poetry environment
poetry env use python3.13
poetry install

# Verify installation
poetry run python -c "
from agents.vana.team import root_agent
print(f'✅ VANA loaded with {len(root_agent.tools)} tools')
"
```

### Development Environment

```bash
# Copy environment template
cp .env.template .env.local

# Configure for development
cat << EOF >> .env.local
VANA_MODEL=gemini-2.5-flash
ENVIRONMENT=development
ANTHROPIC_LOG=debug
EOF

# Test development setup
poetry run python main.py
```

## Contributing Guidelines

### Code Contribution Process

1. **Fork and Clone**
   ```bash
   git fork https://github.com/your-org/vana.git
   git clone https://github.com/your-username/vana.git
   cd vana
   git remote add upstream https://github.com/your-org/vana.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow code standards below
   - Add tests for new functionality
   - Update documentation

4. **Test Changes**
   ```bash
   # Run test suite
   poetry run pytest
   
   # Run quality checks
   poetry run black .
   poetry run isort .
   poetry run flake8
   poetry run mypy .
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Use the provided PR template
   - Include clear description of changes
   - Reference any related issues

### Issue Reporting

When reporting issues:

1. **Search existing issues** first
2. **Use issue templates** provided in `.github/ISSUE_TEMPLATE/`
3. **Include system information**:
   ```bash
   python3 --version
   poetry --version
   uname -a
   ```
4. **Provide reproduction steps**
5. **Include relevant logs** with debug enabled

## Code Standards

### Python Code Style

- **Formatter**: Black with 120 character line length
- **Import Organization**: isort
- **Type Hints**: Required for all public functions
- **Docstrings**: Google-style docstrings for all public APIs

```python
# Example function with proper style
def create_agent_tool(
    name: str,
    description: str,
    parameters: Dict[str, Any]
) -> FunctionTool:
    """Create a standardized agent tool.
    
    Args:
        name: Tool name following snake_case convention
        description: Clear description of tool functionality
        parameters: Tool parameters schema
        
    Returns:
        Configured FunctionTool instance
        
    Raises:
        ValidationError: If parameters are invalid
    """
    validate_tool_parameters(parameters)
    
    return FunctionTool(
        name=name,
        description=description,
        parameters=parameters,
        function=create_tool_function(name)
    )
```

### File Organization

```
lib/
├── _tools/                 # Tool implementations
│   ├── adk_tools.py       # Core ADK tools
│   ├── agent_tools.py     # Agent coordination
│   └── standardized_*.py  # Standardized tool categories
├── _shared_libraries/      # Shared services
│   ├── vector_search_service.py
│   ├── intelligent_cache.py
│   └── coordination_manager.py
├── security/              # Security components
│   ├── security_manager.py
│   └── audit_logger.py
└── monitoring/            # Monitoring components
    ├── performance_monitor.py
    └── health_check.py
```

### Error Handling Patterns

```python
# Standard error handling pattern
try:
    result = perform_operation()
    logger.info("Operation completed successfully", extra={
        "operation": "example",
        "result_count": len(result)
    })
    return {"success": True, "result": result}
except SpecificError as e:
    logger.error(f"Specific error occurred: {e}", extra={
        "operation": "example",
        "error_type": type(e).__name__
    })
    return {"success": False, "error": str(e)}
except Exception as e:
    logger.exception("Unexpected error occurred", extra={
        "operation": "example"
    })
    return {"success": False, "error": "Internal error"}
```

## Testing Framework

### Test Structure

```
tests/
├── framework/             # Testing framework
│   ├── agent_intelligence_validator.py
│   ├── response_quality_analyzer.py
│   └── adk_compliance_validator.py
├── unit/                  # Unit tests
│   ├── test_tools.py
│   └── test_agents.py
├── integration/           # Integration tests
│   ├── test_agent_coordination.py
│   └── test_memory_system.py
└── e2e/                   # End-to-end tests
    └── test_workflows.py
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run specific test categories
poetry run pytest -m unit          # Unit tests
poetry run pytest -m integration   # Integration tests
poetry run pytest -m e2e           # End-to-end tests

# Run with coverage
poetry run pytest --cov=agents --cov=lib --cov=tools

# Production parity testing
poetry run python tests/run_production_parity_tests.py --smoke-only
```

### Writing Tests

```python
# Example unit test
import pytest
from agents.vana.team import root_agent

class TestVANAOrchestrator:
    def test_agent_initialization(self):
        """Test VANA orchestrator initializes correctly."""
        assert root_agent is not None
        assert len(root_agent.tools) == 9
        
    def test_tool_loading(self):
        """Test all core tools load properly."""
        tool_names = [tool.name for tool in root_agent.tools]
        expected_tools = ["read_file", "write_file", "echo"]
        
        for tool in expected_tools:
            assert tool in tool_names

    @pytest.mark.asyncio
    async def test_basic_task_processing(self):
        """Test basic task processing works."""
        result = await root_agent.process_request("Echo 'test'")
        assert "test" in result.lower()
```

## Tool Development

### Creating New Tools

1. **Follow Standardized Pattern**:
   ```python
   # lib/_tools/custom_tools.py
   from google.adk.tools import FunctionTool
   
   def create_custom_tool() -> FunctionTool:
       return FunctionTool(
           name="custom_operation",
           description="Performs custom operation",
           parameters={
               "type": "object",
               "properties": {
                   "input": {"type": "string", "description": "Input data"}
               },
               "required": ["input"]
           },
           function=custom_operation_impl
       )
   
   async def custom_operation_impl(input: str) -> Dict[str, Any]:
       """Implementation of custom operation."""
       try:
           result = process_input(input)
           return {"success": True, "result": result}
       except Exception as e:
           logger.error(f"Custom operation failed: {e}")
           return {"success": False, "error": str(e)}
   ```

2. **Add to Tool Registry**:
   ```python
   # agents/vana/team.py
   def load_conditional_tools():
       tools = []
       if has_permission("custom"):
           from lib._tools.custom_tools import create_custom_tool
           tools.append(create_custom_tool())
       return tools
   ```

3. **Update Permissions**:
   ```json
   // .claude/settings.local.json
   {
     "permissions": {
       "allow": ["custom_operation"]
     }
   }
   ```

### Tool Testing

```python
# tests/unit/test_custom_tools.py
import pytest
from lib._tools.custom_tools import custom_operation_impl

class TestCustomTools:
    @pytest.mark.asyncio
    async def test_custom_operation_success(self):
        result = await custom_operation_impl("test input")
        assert result["success"] is True
        assert "result" in result
        
    @pytest.mark.asyncio
    async def test_custom_operation_error(self):
        result = await custom_operation_impl("invalid")
        assert result["success"] is False
        assert "error" in result
```

## Agent Development

### Creating New Agents

1. **Agent Class Structure**:
   ```python
   # agents/custom/agent.py
   from google.adk.llm_agents import LlmAgent
   from lib._tools.custom_tools import create_custom_tools
   
   class CustomAgent(LlmAgent):
       def __init__(self):
           tools = create_custom_tools()
           super().__init__(
               name="Custom Agent",
               model="gemini-2.5-flash",
               tools=tools,
               instructions="You are a specialized agent for custom tasks."
           )
   
   # Create instance
   custom_agent = CustomAgent()
   ```

2. **Integration with VANA**:
   ```python
   # agents/vana/team.py
   def get_specialist_agent(agent_type: str):
       if agent_type == "custom":
           from agents.custom.agent import custom_agent
           return custom_agent
       # ... other agents
   ```

3. **Agent Communication**:
   ```python
   async def delegate_to_custom_agent(task: Dict[str, Any]) -> Dict[str, Any]:
       """Delegate task to custom agent."""
       agent = get_specialist_agent("custom")
       result = await agent.process_request(task["description"])
       return {
           "agent": "custom",
           "task": task,
           "result": result
       }
   ```

## Debugging & Troubleshooting

### Debug Configuration

```bash
# Enable debug logging
export ANTHROPIC_LOG=debug

# Run with detailed output
poetry run python main.py 2>&1 | tee debug.log
```

### Common Debug Patterns

```python
# Add debug logging
import logging
logger = logging.getLogger(__name__)

def debug_function():
    logger.debug("Function starting", extra={
        "function": "debug_function",
        "parameters": locals()
    })
    
    try:
        result = operation()
        logger.debug("Operation successful", extra={
            "result_type": type(result).__name__
        })
        return result
    except Exception as e:
        logger.exception("Operation failed", extra={
            "error_type": type(e).__name__
        })
        raise
```

### Performance Profiling

```bash
# Profile with cProfile
poetry run python -m cProfile -o profile.stats main.py

# Analyze profile
poetry run python -c "
import pstats
stats = pstats.Stats('profile.stats')
stats.sort_stats('cumulative').print_stats(20)
"
```

### Memory Debugging

```python
# Memory usage monitoring
import psutil
import os

def monitor_memory():
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    logger.info("Memory usage", extra={
        "rss_mb": memory_info.rss / 1024 / 1024,
        "vms_mb": memory_info.vms / 1024 / 1024
    })
```

## Development Workflow

### Daily Development

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Run health checks**:
   ```bash
   poetry run python -c "
   from agents.vana.team import root_agent
   print(f'✅ System health: {len(root_agent.tools)} tools loaded')
   "
   ```

3. **Code quality before commit**:
   ```bash
   poetry run black .
   poetry run isort .
   poetry run flake8
   poetry run mypy .
   poetry run pytest -x
   ```

### Release Process

1. **Version Bump**: Update version in `pyproject.toml`
2. **Changelog**: Update `CHANGELOG.md` with changes
3. **Testing**: Run full test suite including production parity tests
4. **Documentation**: Update relevant documentation
5. **Tag Release**: Create git tag and push

## Getting Help

### Internal Resources
- **Architecture Documentation**: Understanding system design
- **API Reference**: Complete tool documentation
- **Troubleshooting Guide**: Common issues and solutions

### Community Resources
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Code Reviews**: Learn from PR feedback

### Development Team
- **Code Reviews**: All changes reviewed by team members
- **Architecture Decisions**: Discussed in GitHub issues
- **Best Practices**: Documented and enforced through CI

---

*Developer guide reflects actual system as of January 2025 | Infrastructure: 46.2% functional*