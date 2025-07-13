# VANA Development Guide

## Overview

This guide covers development setup, best practices, and common workflows for contributing to VANA.

## Prerequisites

### Required Software
- **Python 3.13+** (mandatory for ADK compatibility)
- **Node.js 20+** and npm
- **Poetry** for Python dependency management
- **Git** for version control
- **Docker** (optional but recommended)

### API Keys
- **Google API Key** for Gemini models (required)
- **Google Cloud Project ID** (required)

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/vana.git
cd vana
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
# Required variables:
# - GOOGLE_API_KEY=your-api-key
# - GOOGLE_CLOUD_PROJECT=your-project-id
```

### 3. Backend Setup

```bash
# Install Python dependencies
poetry install

# Activate virtual environment
poetry shell

# Verify Python version
python --version  # Should be 3.13+

# Run backend server
python main.py
# Or for all features:
python main_agentic.py
```

### 4. Frontend Setup

```bash
# Navigate to frontend
cd vana-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Docker Setup (Optional)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Project Structure

```
vana/
├── agents/                    # Agent definitions
│   ├── vana/                 # Main orchestrator
│   │   ├── team.py          # VANA chat agent
│   │   ├── team_agentic.py  # Agentic configuration
│   │   └── enhanced_orchestrator.py  # V2 orchestrator
│   ├── specialists/          # Specialist agents
│   │   ├── architecture_specialist.py
│   │   ├── security_specialist.py
│   │   └── ...
│   └── workflows/            # Workflow managers
├── lib/                      # Core libraries
│   ├── _tools/              # ADK-compliant tools
│   ├── _shared_libraries/   # Shared services
│   └── response_formatter.py # Output cleaning
├── vana-ui/                 # React frontend
│   └── src/
│       ├── components/      # UI components
│       ├── pages/          # Page components
│       └── services/       # API integration
├── tests/                   # Test suites
├── docs/                    # Documentation
├── main.py                  # Main entry point
└── docker-compose.yml       # Container config
```

## Key Development Areas

### 1. Working with Agents

#### Creating a New Specialist

```python
# agents/specialists/new_specialist.py
from google_adk import agent
from lib._tools import Tool

@agent(
    name="new_specialist",
    model="gemini-2.0-flash",
    tools=[tool1, tool2],
    system_instruction="""
    You are a specialist in...
    """
)
async def new_specialist_agent(request: str):
    """Process specialized requests"""
    pass
```

#### Adding to Orchestrator

```python
# agents/vana/enhanced_orchestrator.py
def route_to_specialist(self, query: str):
    if "new domain" in query.lower():
        return "new_specialist"
    # ... existing routing logic
```

### 2. Implementing Tools

Tools must follow ADK patterns:

```python
# lib/_tools/new_tool.py
from google_adk import Tool

class NewTool(Tool):
    """Tool description for ADK"""
    
    name = "new_tool"
    description = "What this tool does"
    
    async def run(self, params: dict) -> dict:
        """Execute tool logic"""
        # Implementation
        return {"result": "success"}
```

### 3. ThinkingPanel Integration

#### Backend Event Emission

```python
# In streaming function
yield f"data: {json.dumps({
    'type': 'thinking',
    'content': 'Processing step description',
    'agent': 'specialist_name',
    'status': 'active'
})}\n\n"
```

#### Frontend Handling

```typescript
// In Chat component
const handleThinkingEvent = (data: any) => {
  const step: ThinkingStep = {
    icon: getAgentIcon(data.agent),
    summary: data.content,
    status: data.status || 'active'
  };
  setThinkingSteps(prev => [...prev, step]);
};
```

### 4. API Development

#### Adding New Endpoints

```python
# main.py or api/endpoints.py
@app.post("/api/v1/new-endpoint")
async def new_endpoint(request: Request):
    """Endpoint documentation"""
    data = await request.json()
    # Process request
    return {"result": "data"}
```

#### SSE Streaming

```python
async def stream_response(data: str):
    """Stream server-sent events"""
    # Thinking events
    yield f"data: {json.dumps({'type': 'thinking', ...})}\n\n"
    
    # Content chunks
    yield f"data: {json.dumps({'type': 'content', ...})}\n\n"
    
    # Completion
    yield f"data: {json.dumps({'type': 'done'})}\n\n"
```

## Testing

### Running Tests

```bash
# All tests
make test
# Or: poetry run pytest

# Specific test categories
poetry run pytest -m unit        # Unit tests
poetry run pytest -m agent       # Agent tests
poetry run pytest -m integration # Integration tests
poetry run pytest -m e2e        # End-to-end tests

# With coverage
poetry run pytest --cov=lib --cov=agents

# Specific test file
poetry run pytest tests/test_orchestrator.py -v
```

### Writing Tests

```python
# tests/test_new_feature.py
import pytest
from agents.vana.enhanced_orchestrator import EnhancedOrchestrator

@pytest.mark.unit
def test_orchestrator_routing():
    """Test orchestrator routes correctly"""
    orchestrator = EnhancedOrchestrator()
    
    # Test security routing
    result = orchestrator.analyze_query("check security vulnerabilities")
    assert result.specialist == "security_specialist"
    
    # Test caching
    result2 = orchestrator.analyze_query("check security vulnerabilities")
    assert result2.from_cache == True
```

### Testing ThinkingPanel

```bash
# Run integration test
python test_thinking_panel.py
```

## Code Quality

### Pre-commit Hooks

```bash
# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

### Linting & Formatting

```bash
# Format Python code
poetry run black .
poetry run isort .

# Lint Python
poetry run flake8
poetry run mypy .

# Security scan
poetry run bandit -r .

# Frontend
cd vana-ui
npm run lint
npm run format
```

## Common Development Tasks

### 1. Adding Response Formatting

```python
# Use ResponseFormatter for clean output
from lib.response_formatter import ResponseFormatter

output = ResponseFormatter.format_response(raw_output)
```

### 2. Updating Environment Variables

```bash
# Add to .env.example
NEW_VARIABLE=default-value

# Document in README.md or DEPLOYMENT_GUIDE.md
```

### 3. Debugging SSE Streaming

```javascript
// Browser console
const es = new EventSource('/chat');
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

### 4. Performance Optimization

```python
# Use orchestrator caching
@lru_cache(maxsize=100)
def expensive_operation(query: str):
    # Cached operation
    pass

# Monitor metrics
logger.info("orchestrator_routing", {
    "query": query,
    "cache_hit": True,
    "response_time_ms": 45
})
```

## Troubleshooting

### Common Issues

#### Python Version Error
```bash
# Error: Python 3.13+ required
# Solution: Install Python 3.13
brew install python@3.13  # macOS
# Or use pyenv
```

#### Module Import Errors
```bash
# Error: ModuleNotFoundError
# Solution: Ensure in poetry shell
poetry shell
poetry install
```

#### Frontend Build Issues
```bash
# Error: npm errors
# Solution: Clean install
cd vana-ui
rm -rf node_modules package-lock.json
npm install
```

#### SSE Not Working
```javascript
// Check CORS settings in main.py
// Ensure correct API_URL in frontend
```

## Best Practices

### 1. Agent Development
- Keep agents focused on single domains
- Use appropriate Gemini models
- Limit tools per agent (6 max per ADK)
- Document system instructions clearly

### 2. Tool Implementation
- Make tools async when possible
- Handle errors gracefully
- Validate inputs
- Return structured data

### 3. Frontend Development
- Use TypeScript for type safety
- Implement proper error boundaries
- Test SSE reconnection logic
- Optimize re-renders

### 4. Security
- Never commit API keys
- Validate all user inputs
- Use ResponseFormatter for output
- Implement rate limiting

## Release Process

### 1. Version Bumping
```bash
# Update version in pyproject.toml
poetry version patch  # or minor/major
```

### 2. Testing
```bash
# Run full test suite
make test

# Build Docker image
docker build -t vana:test .
```

### 3. Documentation
- Update CHANGELOG.md
- Update API documentation
- Update deployment guide

### 4. Deployment
```bash
# Tag release
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Deploy (varies by platform)
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following coding standards
4. Write/update tests
5. Run linting and tests
6. Commit with clear messages
7. Push to branch
8. Open Pull Request

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in discussions
- Create detailed bug reports

## Resources

- [Google ADK Documentation](https://github.com/google/adk)
- [Gemini API Reference](https://ai.google.dev/api)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)