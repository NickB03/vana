# Contributing to Vana

Thank you for your interest in contributing to Vana! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Community](#community)

## Code of Conduct

This project adheres to the [Google Open Source Code of Conduct](https://opensource.google/conduct/). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the Repository**: Click the "Fork" button on the GitHub repository page
2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vana.git
   cd vana
   ```
3. **Add Upstream Remote**:
   ```bash
   git remote add upstream https://github.com/original-org/vana.git
   ```

## Development Setup

### Prerequisites

- Python 3.10+
- uv (Python package manager)
- Node.js 18+
- Google Cloud SDK
- Terraform
- make

### Initial Setup

```bash
# Install dependencies
make install

# Set up pre-commit hooks
uv run pre-commit install

# Configure Google Cloud (for testing)
gcloud auth application-default login
```

### Environment Configuration

Create a `.env` file in the project root:

```bash
# For local development with AI Studio
GOOGLE_GENAI_USE_VERTEXAI=False
GOOGLE_API_KEY=your-api-key-here

# For Vertex AI development
# GOOGLE_GENAI_USE_VERTEXAI=True
# GOOGLE_CLOUD_PROJECT=your-project-id
# GOOGLE_CLOUD_LOCATION=us-central1
```

## How to Contribute

### Types of Contributions

- **Bug Fixes**: Fix issues reported in GitHub Issues
- **Features**: Implement new functionality (discuss first in Issues)
- **Documentation**: Improve README, docstrings, or wiki
- **Tests**: Add missing tests or improve test coverage
- **Performance**: Optimize code for better performance
- **Refactoring**: Improve code structure and maintainability

### Contribution Process

1. **Check Existing Issues**: Look for open issues or create a new one
2. **Discuss**: For major changes, discuss your approach in the issue
3. **Implement**: Make your changes following our guidelines
4. **Test**: Ensure all tests pass and add new ones if needed
5. **Submit**: Create a pull request with a clear description

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

Example:
```
feat(agents): add timeout handling to research evaluator

- Implement configurable timeout for evaluation phase
- Add retry logic for transient failures
- Update tests to cover timeout scenarios

Closes #123
```

## Code Standards

### Python Code Style

- Follow PEP 8
- Use type hints for all functions
- Maximum line length: 88 characters (Black default)
- Use descriptive variable and function names
- Add docstrings to all public functions and classes

Example:
```python
from typing import Dict, List, Optional

def process_research_findings(
    findings: List[Dict[str, Any]], 
    confidence_threshold: float = 0.8
) -> Optional[Dict[str, Any]]:
    """Process research findings and filter by confidence.
    
    Args:
        findings: List of research finding dictionaries
        confidence_threshold: Minimum confidence score (0.0-1.0)
        
    Returns:
        Filtered findings dictionary or None if no findings meet threshold
        
    Raises:
        ValueError: If confidence_threshold is not between 0.0 and 1.0
    """
    if not 0.0 <= confidence_threshold <= 1.0:
        raise ValueError("Confidence threshold must be between 0.0 and 1.0")
    
    # Implementation here
    ...
```

### TypeScript/React Code Style

- Use ESLint and Prettier configurations
- Prefer functional components with hooks
- Use TypeScript strict mode
- Define interfaces for all props

Example:
```typescript
interface ResearchResultProps {
  findings: Finding[];
  onSelect: (finding: Finding) => void;
  isLoading?: boolean;
}

export const ResearchResult: React.FC<ResearchResultProps> = ({
  findings,
  onSelect,
  isLoading = false,
}) => {
  // Component implementation
};
```

## Testing Guidelines

### Running Tests

```bash
# Run all tests
make test

# Run specific test file
uv run pytest tests/unit/test_agent.py

# Run with coverage
uv run pytest --cov=app tests/

# Run linting
make lint
```

### Writing Tests

- Aim for >80% code coverage
- Write unit tests for all new functions
- Include integration tests for agent workflows
- Use meaningful test names that describe the scenario

Example:
```python
import pytest
from app.agent import plan_generator

@pytest.mark.asyncio
async def test_plan_generator_creates_five_line_plan():
    """Test that plan generator creates exactly 5 research lines."""
    # Test implementation
    ...

@pytest.mark.asyncio
async def test_plan_generator_handles_ambiguous_topics():
    """Test that plan generator uses search for ambiguous topics."""
    # Test implementation
    ...
```

### Testing Agents

Use the ADK evaluation framework:

```python
# tests/integration/test_research_pipeline.evalset.json
{
  "eval_set_id": "research_pipeline_eval",
  "eval_cases": [
    {
      "eval_id": "sustainability_research",
      "conversation": [
        {
          "user_content": {
            "parts": [{"text": "Research sustainable energy solutions"}]
          },
          "expected_plan_elements": ["solar", "wind", "storage"],
          "min_sources": 5
        }
      ]
    }
  ]
}
```

## Documentation

### Code Documentation

- Add docstrings to all public functions and classes
- Include parameter descriptions and return types
- Document exceptions that may be raised
- Add inline comments for complex logic

### README Updates

When adding features, update the README:
- Add to feature list if significant
- Update configuration section if new settings
- Add to API documentation if new endpoints
- Include in architecture diagrams if structural

### Architecture Decisions

For significant changes, create an ADR (Architecture Decision Record):

```markdown
# ADR-001: Use ChromaDB for Document Storage

## Status
Accepted

## Context
We need a vector database for storing and retrieving documentation...

## Decision
We will use ChromaDB because...

## Consequences
- Positive: Fast semantic search...
- Negative: Additional dependency...
```

## Submitting Changes

### Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

5. **Create Pull Request** on GitHub

### Pull Request Template

```markdown
## Description
Brief description of changes

## Related Issue
Fixes #(issue number)

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Maintainers review code quality and design
3. **Feedback**: Address review comments
4. **Approval**: Requires approval from at least one maintainer
5. **Merge**: Maintainer merges using squash and merge

## Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Wiki**: For detailed documentation

### Communication Guidelines

- Be respectful and constructive
- Provide context and examples
- Search existing issues before creating new ones
- Use clear, descriptive titles

### Recognition

Contributors are recognized in:
- Release notes
- Contributors file
- Project documentation

Thank you for contributing to Vana! Your efforts help make this project better for everyone.