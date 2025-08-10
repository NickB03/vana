# Contributing to Vana

Thank you for your interest in contributing to Vana! This document provides guidelines and instructions for contributing to the project.

## 🎯 Getting Started

1. **Fork the Repository**
   - Fork the project on GitHub
   - Clone your fork locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/vana.git
   cd vana
   ```

2. **Set Up Development Environment**
   ```bash
   # Install dependencies
   make install
   
   # Set up Google Cloud authentication
   gcloud auth application-default login
   
   # Configure environment
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Guidelines

### Code Style

- **Python**: Follow PEP 8
- **Type Hints**: Use type hints for all function parameters and returns
- **Docstrings**: Add docstrings to all public functions and classes
- **Comments**: Write clear comments for complex logic

### Testing

All contributions must include appropriate tests:

```bash
# Run tests before submitting
make test

# Check code style
make lint

# Type checking
make typecheck
```

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

Example:
```
feat(agent): add data analysis agent

Implements a new agent type for data analysis with support for
CSV, JSON, and Excel file processing.

Closes #123
```

## 🔄 Pull Request Process

1. **Update Documentation**
   - Update README.md if needed
   - Add/update docstrings
   - Update CHANGELOG.md

2. **Ensure Tests Pass**
   ```bash
   make test
   make lint
   make typecheck
   ```

3. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes were made and why
   - Include screenshots for UI changes

4. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Tests pass locally
   - [ ] Added new tests
   - [ ] Updated existing tests
   
   ## Checklist
   - [ ] Code follows project style
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No new warnings
   ```

## 🏗️ Project Structure

```
vana/
├── app/                 # Main application code
│   ├── agent.py        # Agent implementation
│   ├── server.py       # FastAPI server
│   └── auth/           # Authentication system
├── tests/              # Test suites
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── performance/   # Performance tests
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

## 🧪 Testing Guidelines

### Writing Tests

```python
# Example test structure
import pytest
from app.agent import ResearchAgent

class TestResearchAgent:
    @pytest.fixture
    def agent(self):
        return ResearchAgent()
    
    @pytest.mark.asyncio
    async def test_research_query(self, agent):
        result = await agent.research("test query")
        assert result is not None
        assert "citations" in result
```

### Test Categories

- **Unit Tests**: Test individual functions/methods
- **Integration Tests**: Test component interactions
- **Performance Tests**: Test speed and memory usage
- **E2E Tests**: Test complete workflows

## 🐛 Reporting Issues

### Bug Reports

Please include:
- Python version
- OS and version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages/logs

### Feature Requests

Please include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Additional context

## 💡 Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue`:
- Documentation improvements
- Test coverage additions
- Bug fixes
- Code refactoring

### Priority Areas

- **Agent Development**: New agent types and capabilities
- **Testing**: Increase test coverage
- **Documentation**: Improve guides and examples
- **Performance**: Optimization opportunities
- **Security**: Security enhancements

## 📚 Resources

- [Google ADK Documentation](https://cloud.google.com/products/ai)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Python Style Guide (PEP 8)](https://www.python.org/dev/peps/pep-0008/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what's best for the community

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Public or private harassment
- Publishing private information without permission

## 📞 Getting Help

- Check existing [issues](https://github.com/NickB03/vana/issues)
- Review [documentation](docs/)
- Ask questions in issues with the `question` label

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Vana! 🚀