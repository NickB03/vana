# VANA System Patterns

## Architectural Principles

### Agent-Based Architecture
- **VANA Orchestrator**: Central coordinator with comprehensive toolset
- **Specialist Agents**: Domain-specific agents (Data Science, Code Execution)
- **Proxy Agents**: Discovery pattern for backward compatibility
- **Dynamic Creation**: Agents created on-demand based on task requirements

### Tool Standardization Pattern
```python
# All tools follow this pattern in lib/_tools/
from google.adk.tools import FunctionTool

def create_my_tool():
    return FunctionTool(
        name="tool_name",
        description="Clear tool description",
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

### Structured Logging Pattern
```python
from lib.logging.structured_logger import logger

logger.info("Operation started",
           extra={"operation": "example", "user_id": "123"})
```

## Code Organization

### Directory Structure
```
agents/          # Agent implementations
lib/_tools/      # Standardized tool implementations (59+ tools)
lib/_shared_libraries/  # Shared services and utilities
docs/            # System documentation
tests/           # AI Agent Testing Framework
vscode-dev-docs/ # VS Code development tools (SEPARATE from VANA)
```

### Import Patterns
- Always check existing imports before adding new dependencies
- Use absolute imports from lib/ modules
- Follow existing library usage patterns in the codebase

### File Naming Conventions
- Snake_case for Python files
- Descriptive names indicating functionality
- Group related tools in standardized_*_tools.py files

## Memory Architecture

### Dual Memory System (VS Code Development Only)
- **ChromaDB**: Unstructured text storage for semantic search
- **Knowledge Graph**: Structured entity-relationship storage
- **Note**: This is for development context, NOT production VANA memory

### Production Memory (Google ADK)
- Uses Google ADK memory services in `lib/_shared_libraries/adk_memory_service.py`
- Completely separate from development memory systems

## Security Patterns

### Credential Management
- No hardcoded credentials in code
- Use Google Secret Manager integration
- Environment variables in .env.local (never committed)

### Access Control
- Implement proper validation for sensitive operations
- Use audit logging for security-relevant actions
- Follow OWASP security guidelines

## Testing Patterns

### Production Parity Testing
```bash
# ALWAYS use this for testing
poetry run python tests/run_production_parity_tests.py --smoke-only
poetry run python tests/run_production_parity_tests.py --full
```

### AI Agent Testing Framework
- `tests/framework/agent_intelligence_validator.py` - Reasoning consistency
- `tests/framework/response_quality_analyzer.py` - Accuracy analysis
- `tests/framework/adk_compliance_validator.py` - Google ADK validation

## Development Workflow

1. **Environment Verification**: Always check Python 3.13+ requirement
2. **Memory Protocol**: Query ChromaDB for context at session start
3. **Code Quality**: Run black, isort, flake8, mypy before commits
4. **Testing**: Use Production Parity Testing Framework
5. **Documentation**: Keep implementation docs in docs/, dev tools in vscode-dev-docs/