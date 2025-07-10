# 🤝 Contributing to VANA

Thank you for your interest in contributing to VANA! This guide will help you get started with contributing to our multi-agent AI system.

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Report bugs through [GitHub Issues](https://github.com/NickB03/vana/issues)
- Include detailed reproduction steps
- Provide system information and logs

### ✨ Feature Requests
- Suggest new features or improvements
- Describe the use case and expected behavior
- Consider implementation complexity

### 📝 Documentation
- Improve existing documentation
- Add examples and tutorials
- Fix typos and clarify instructions

### 💻 Code Contributions
- Fix bugs and implement features
- Add new agents or tools
- Improve performance and reliability

### 🧪 Testing
- Write unit and integration tests
- Test new features and bug fixes
- Improve test coverage

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/vana.git
cd vana

# Add upstream remote
git remote add upstream https://github.com/NickB03/vana.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
poetry install

# Install pre-commit hooks
pre-commit install

# Copy environment template
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### 3. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bug fix branch
git checkout -b fix/issue-number-description
```

## 📋 Development Guidelines

### Code Style

#### Python Standards
- Follow [PEP 8](https://pep8.org/) style guide
- Use [Black](https://black.readthedocs.io/) for code formatting
- Use [Ruff](https://docs.astral.sh/ruff/) for linting
- Add type hints for all functions

### Testing Requirements

#### Unit Tests
```python
import pytest
from unittest.mock import Mock, patch
from agents.example.agent import ExampleAgent

class TestExampleAgent:
    """Test suite for ExampleAgent."""

    @pytest.fixture
    def agent(self):
        """Create agent instance for testing."""
        config = {"test_mode": True}
        return ExampleAgent(config)

    def test_process_request_success(self, agent):
        """Test successful request processing."""
        message = "test message"
        result = agent.process_request(message)

        assert result["success"] is True
        assert "data" in result
        assert result["message"] == "Task completed successfully"
```

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run specific test file
poetry run pytest tests/unit/test_agent.py

# Run with coverage
poetry run pytest --cov=agents --cov=lib --cov=tools

# Run integration tests
poetry run pytest tests/integration/

# Run with verbose output
poetry run pytest -v
```

### Test Categories

#### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Fast execution (< 1 second per test)
- Located in `tests/unit/`

#### Integration Tests
- Test component interactions
- Use real services when possible
- Moderate execution time (< 30 seconds per test)
- Located in `tests/integration/`

#### End-to-End Tests
- Test complete workflows
- Use production-like environment
- Longer execution time (< 5 minutes per test)
- Located in `tests/e2e/`

## 📝 Pull Request Process

### 1. Prepare Your Changes

```bash
# Ensure your branch is up to date
git fetch upstream
git rebase upstream/main

# Run tests and linting
poetry run pytest
poetry run black .
poetry run ruff check .

# Run pre-commit hooks
pre-commit run --all-files
```

### 2. Create Pull Request

#### PR Title Format
- `feat: add new agent for travel booking`
- `fix: resolve vector search timeout issue`
- `docs: update API reference documentation`
- `test: add integration tests for file operations`

#### PR Description Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or breaking changes documented)

## Related Issues
Fixes #123
Related to #456
```

## 🎯 Best Practices

### Performance
- Profile code for performance bottlenecks
- Use caching for expensive operations
- Implement proper error handling
- Monitor resource usage

### Security
- Validate all inputs
- Use secure authentication methods
- Protect sensitive data
- Follow security best practices

### Maintainability
- Write clear, self-documenting code
- Use meaningful variable names
- Keep functions small and focused
- Maintain consistent code style

## 📞 Getting Help

### Community Support
- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Documentation**: Check existing guides and references

### Development Questions
- **Architecture**: Review system design documents
- **Implementation**: Check existing code examples
- **Testing**: Follow established test patterns

---

**Thank you for contributing to VANA!** 🎉

Your contributions help make VANA a better multi-agent AI system for everyone.
