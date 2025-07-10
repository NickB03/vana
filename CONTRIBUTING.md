# Contributing to VANA

Thank you for your interest in contributing to VANA! This guide will help you get started with contributing to our multi-agent AI orchestration system.

## 🌟 Ways to Contribute

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new capabilities and improvements
- **Code Contributions**: Implement features, fix bugs, improve performance
- **Documentation**: Enhance guides, examples, and API documentation
- **Testing**: Improve test coverage and quality
- **Community**: Help others in discussions and provide support

## 🚀 Getting Started

### Prerequisites

- Python 3.13+
- Poetry for dependency management
- Git for version control
- Google Cloud API key for testing

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/vana.git
   cd vana
   ```

2. **Set Up Development Environment**
   ```bash
   # Install dependencies
   poetry install
   
   # Install pre-commit hooks
   poetry run pre-commit install
   
   # Set up environment
   cp .env.example .env
   # Add your GOOGLE_API_KEY
   ```

3. **Verify Setup**
   ```bash
   # Run tests
   poetry run pytest
   
   # Start the backend
   python main.py
   
   # Check health
   curl http://localhost:8081/health
   ```

## 📋 Development Workflow

### 1. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Your Changes

Follow our coding standards and best practices (see below).

### 3. Test Your Changes

```bash
# Run unit tests
poetry run pytest tests/unit -v

# Run integration tests
poetry run pytest tests/integration -v

# Run validation scripts
python validate_workflow_engine.py
python validate_task_analyzer.py

# Check code quality
poetry run black .
poetry run isort .
poetry run flake8
poetry run mypy .
```

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add new agent coordination feature

- Implement dynamic agent selection
- Add performance metrics collection
- Update documentation

Closes #123"
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

## 📝 Coding Standards

### Python Code Style

We follow PEP 8 with some modifications:

```python
# Use descriptive variable names
user_input = request.get("input")

# Add type hints
async def process_request(input_text: str) -> Dict[str, Any]:
    """Process user input through VANA agents."""
    pass

# Use docstrings for all public functions
def analyze_task(task: str) -> TaskAnalysis:
    """Analyze a task and determine routing strategy.
    
    Args:
        task: The task description to analyze
        
    Returns:
        TaskAnalysis object with routing information
    """
    pass

# Handle errors gracefully
try:
    result = await agent.process(task)
except AgentException as e:
    logger.error(f"Agent processing failed: {e}")
    return {"error": "Processing failed", "details": str(e)}
```

### Code Organization

```
lib/
├── _tools/              # ADK tool implementations
│   ├── __init__.py
│   ├── file_tools.py    # File operations
│   ├── search_tools.py  # Search functionality
│   └── workflow_tools.py# Workflow management
├── _shared/             # Shared utilities
│   ├── __init__.py
│   ├── logging.py       # Logging configuration
│   └── validation.py    # Input validation
└── agents/              # Agent implementations
    ├── __init__.py
    └── base_agent.py    # Base agent class
```

### Testing Standards

Write comprehensive tests for all new features:

```python
import pytest
from unittest.mock import Mock, patch
from your_module import your_function

class TestYourFunction:
    """Test suite for your_function."""
    
    @pytest.mark.asyncio
    async def test_successful_execution(self):
        """Test successful function execution."""
        result = await your_function("test input")
        assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling in function."""
        with pytest.raises(ValueError):
            await your_function("")
    
    @patch('your_module.external_service')
    async def test_with_mocked_service(self, mock_service):
        """Test function with mocked external dependency."""
        mock_service.return_value = "mocked response"
        result = await your_function("test")
        assert "mocked response" in result
```

## 🐛 Bug Reports

### Before Submitting

1. **Search existing issues** to avoid duplicates
2. **Update to latest version** to see if the issue persists
3. **Check documentation** for expected behavior

### Bug Report Template

```markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Send request to '...'
2. With input '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., macOS, Ubuntu]
- Python version: [e.g., 3.13.2]
- VANA version: [e.g., commit hash]

**Additional Context**
- Error logs
- Configuration files
- Screenshots (if applicable)
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
How do you envision this feature working?

**Alternatives Considered**
Other approaches you've considered.

**Implementation Notes**
Technical considerations or suggestions.
```

## 🏗️ Architecture Guidelines

### Adding New Agents

1. **Inherit from BaseAgent**
   ```python
   from lib.agents.base_agent import BaseAgent
   
   class MyAgent(BaseAgent):
       async def process(self, task: str) -> Dict[str, Any]:
           # Implementation
           pass
   ```

2. **Register with Orchestrator**
   ```python
   # In agents/__init__.py
   from .my_agent import MyAgent
   
   AVAILABLE_AGENTS = {
       "my_agent": MyAgent,
       # ... other agents
   }
   ```

3. **Add Tests**
   ```python
   # tests/agents/test_my_agent.py
   class TestMyAgent:
       # Comprehensive test suite
       pass
   ```

### Adding New Tools

1. **Follow ADK Patterns**
   ```python
   from google.adk.tools import FunctionTool
   
   async def my_tool(param: str) -> str:
       """Tool description for ADK."""
       # Implementation
       return result
   
   # Register as FunctionTool
   my_function_tool = FunctionTool(my_tool)
   ```

2. **Add Error Handling**
   ```python
   async def robust_tool(param: str) -> str:
       try:
           result = await process(param)
           return json.dumps({"status": "success", "result": result})
       except Exception as e:
           logger.error(f"Tool error: {e}")
           return json.dumps({"status": "error", "message": str(e)})
   ```

## 📖 Documentation Guidelines

### Code Documentation

- Use clear, descriptive docstrings
- Include type hints for all functions
- Add inline comments for complex logic
- Document configuration options

### User Documentation

- Write for different skill levels
- Include practical examples
- Keep it up-to-date with code changes
- Test all code examples

## 🔍 Review Process

### Pull Request Guidelines

1. **Clear Description**: Explain what and why
2. **Reference Issues**: Link related issues
3. **Test Coverage**: Include tests for new code
4. **Documentation**: Update docs as needed
5. **Small Commits**: Keep changes focused

### Review Criteria

- **Functionality**: Does it work as intended?
- **Code Quality**: Follows standards and best practices?
- **Testing**: Adequate test coverage?
- **Documentation**: Clear and complete?
- **Performance**: No significant regressions?

## 🤝 Community Guidelines

### Code of Conduct

- **Be respectful**: Treat everyone with kindness and respect
- **Be inclusive**: Welcome developers of all backgrounds
- **Be collaborative**: Share knowledge and help others
- **Be constructive**: Provide helpful feedback

### Communication

- **GitHub Issues**: For bugs and feature requests
- **Discord**: For real-time community discussion
- **Discussions**: For questions and general topics

## 🎯 Project Roadmap

### Current Priorities

1. **Performance Optimization**: Improve response times
2. **Enhanced Testing**: Increase coverage and reliability
3. **Documentation**: Complete API and developer guides
4. **Agent Development**: Add specialized capabilities

### Future Plans

- Distributed agent execution
- Advanced workflow templates
- Real-time collaboration features
- Enterprise integrations

## 📚 Resources

### Learning Materials

- [Google ADK Documentation](https://github.com/google/adk)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Python Async Programming](https://docs.python.org/3/library/asyncio.html)

### Development Tools

- **Poetry**: Dependency management
- **pytest**: Testing framework
- **Black**: Code formatting
- **mypy**: Type checking
- **pre-commit**: Git hooks

## 🙋 Getting Help

### Before Asking

1. Check the documentation
2. Search existing issues
3. Review the FAQ

### Where to Ask

- **Technical Questions**: GitHub Discussions
- **Bug Reports**: GitHub Issues
- **General Chat**: Discord server
- **Security Issues**: Email security@vana.ai

---

## 📜 License

By contributing to VANA, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to VANA!** Your efforts help make this project better for everyone. 🚀