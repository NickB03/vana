# Development Workflows

This document provides detailed development workflows and best practices for working on the Vana project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Daily Development Workflow](#daily-development-workflow)
- [Testing Workflow](#testing-workflow)
- [Frontend Development](#frontend-development)
- [Backend Development](#backend-development)
- [ADK Agent Development](#adk-agent-development)
- [Git Workflow](#git-workflow)
- [Code Review Process](#code-review-process)
- [Debugging Techniques](#debugging-techniques)

## Getting Started

### Prerequisites

**Required:**
- Python 3.10+ with `uv` package manager
- Node.js 18+ with `npm`
- Google Cloud SDK (for GCS session storage)
- Git

**Optional:**
- Docker (for containerized development)
- PM2 (for process management)

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/NickB03/vana.git
cd vana

# 2. Install backend dependencies
make install

# 3. Install frontend dependencies
npm --prefix frontend install

# 4. Copy environment template
cp .env.example .env.local

# 5. Configure required environment variables
# Edit .env.local and add:
# - GOOGLE_API_KEY (REQUIRED)
# - OPENROUTER_API_KEY (REQUIRED)
# - BRAVE_API_KEY (OPTIONAL)
# - JWT_SECRET_KEY (REQUIRED for auth, or set AUTH_REQUIRE_SSE_AUTH=false)
```

### Environment Configuration

**Minimal Development Setup:**
```bash
# .env.local
GOOGLE_API_KEY=your_google_api_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
AUTH_REQUIRE_SSE_AUTH=false  # Disable auth for local dev
ENVIRONMENT=development
```

**Full Production-Like Setup:**
```bash
# .env.local
GOOGLE_API_KEY=your_google_api_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
BRAVE_API_KEY=your_brave_api_key_here
JWT_SECRET_KEY=your_secret_key_here
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
AUTH_REQUIRE_SSE_AUTH=true
ENVIRONMENT=development
ENABLE_ADK_CANONICAL_STREAM=true
```

## Development Environment Setup

### Starting All Services

**Recommended (PM2):**
```bash
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Stop all services
pm2 stop all

# Restart all services
pm2 restart all

# Kill all services
pm2 kill
```

**Alternative (Manual in separate terminals):**
```bash
# Terminal 1: Backend
make dev-backend

# Terminal 2: ADK
adk web agents/ --port 8080

# Terminal 3: Frontend
make dev-frontend
```

### Verifying Setup

```bash
# Check backend health
curl http://127.0.0.1:8000/health

# Check ADK is running
curl http://127.0.0.1:8080/health

# Check frontend (open in browser)
open http://localhost:3000

# Check all ports
lsof -i :8000  # Backend
lsof -i :8080  # ADK
lsof -i :3000  # Frontend
```

## Daily Development Workflow

### Recommended Pattern: Explore-Plan-Code-Commit

**Phase 1: EXPLORE**
```bash
# Before making changes, understand the codebase
# Read relevant files
# Search for patterns
# Understand dependencies
```

**Phase 2: PLAN**
```bash
# Create a plan for your changes
# Break down into small tasks
# Identify affected files
# Consider edge cases
```

**Phase 3: CODE**
```bash
# Implement changes incrementally
# Test after each change
# Commit frequently with clear messages
```

**Phase 4: VERIFY**
```bash
# Run all tests
make test

# Check code quality
make lint

# For frontend: Verify in browser
# Use Chrome DevTools MCP to check console and network
```

**Phase 5: COMMIT**
```bash
# Commit with conventional commit format
git add <files>
git commit -m "feat: add new feature"
```

## Testing Workflow

### Backend Testing

**Run all tests:**
```bash
make test
```

**Run specific test types:**
```bash
make test-unit              # Unit tests only
make test-integration       # Integration tests only
uv run pytest tests/unit/test_specific.py -v  # Single test file
uv run pytest tests/unit/test_specific.py::test_function -v  # Single test
```

**Test with coverage:**
```bash
uv run pytest --cov=app --cov-report=html tests/
open htmlcov/index.html  # View coverage report
```

**Watch mode (auto-rerun on changes):**
```bash
uv run pytest-watch tests/
```

### Frontend Testing

**Run all tests:**
```bash
npm --prefix frontend test
```

**Run specific tests:**
```bash
npm --prefix frontend test -- ChatInterface.test.tsx
npm --prefix frontend test -- --watch  # Watch mode
```

**E2E tests:**
```bash
npm --prefix frontend run test:e2e
npm --prefix frontend run test:e2e -- --headed  # With browser visible
```

**Type checking:**
```bash
npm --prefix frontend run typecheck
```

### Test-Driven Development (TDD)

**Red-Green-Refactor Cycle:**

1. **Red**: Write failing test first
```python
# tests/unit/test_new_feature.py
def test_new_feature():
    result = new_feature("input")
    assert result == "expected_output"
```

2. **Green**: Implement minimal code to pass
```python
# app/new_feature.py
def new_feature(input: str) -> str:
    return "expected_output"
```

3. **Refactor**: Improve code while keeping tests green
```python
# app/new_feature.py
def new_feature(input: str) -> str:
    # Add proper implementation
    processed = process_input(input)
    return format_output(processed)
```

## Frontend Development

### Component Development Workflow

1. **Create component file:**
```bash
# frontend/src/components/NewComponent.tsx
```

2. **Implement component with TypeScript:**
```typescript
interface NewComponentProps {
  title: string;
  onAction: () => void;
}

export function NewComponent({ title, onAction }: NewComponentProps) {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

3. **Write tests:**
```typescript
// frontend/tests/NewComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NewComponent } from '@/components/NewComponent';

test('renders title and handles click', () => {
  const mockAction = jest.fn();
  render(<NewComponent title="Test" onAction={mockAction} />);
  
  expect(screen.getByText('Test')).toBeInTheDocument();
  
  fireEvent.click(screen.getByText('Action'));
  expect(mockAction).toHaveBeenCalled();
});
```

4. **Verify in browser (CRITICAL):**
```bash
# Start services if not running
pm2 start ecosystem.config.js

# Use Chrome DevTools MCP to verify
# Check console for errors
# Test interactions
# Verify responsive design
```

### Styling Guidelines

**Use shadcn/ui components:**
```typescript
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

<Button variant="default">Click me</Button>
```

**Theme colors (Prompt-Kit):**
- **Accent colors**: Use ONLY for buttons, accents, status indicators
- **Body text**: Use neutral colors (dark gray/black in light mode, light gray/white in dark mode)

**Responsive design:**
```typescript
// Test at these breakpoints
// 375px (mobile)
// 768px (tablet)
// 1024px (desktop)

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

## Backend Development

### API Endpoint Development

1. **Define Pydantic model:**
```python
# app/models/chat_models.py
from pydantic import BaseModel

class NewRequest(BaseModel):
    query: str
    options: dict[str, Any] = {}
```

2. **Create route:**
```python
# app/routes/new_routes.py
from fastapi import APIRouter, Depends
from app.models.chat_models import NewRequest

router = APIRouter(prefix="/api/new", tags=["new"])

@router.post("/endpoint")
async def new_endpoint(
    request: NewRequest,
    current_user: User = Depends(get_current_user)
):
    # Implementation
    return {"success": True}
```

3. **Register router:**
```python
# app/server.py
from app.routes.new_routes import router as new_router

app.include_router(new_router)
```

4. **Write tests:**
```python
# tests/unit/test_new_routes.py
from fastapi.testclient import TestClient

def test_new_endpoint(client: TestClient):
    response = client.post("/api/new/endpoint", json={
        "query": "test"
    })
    assert response.status_code == 200
    assert response.json()["success"] is True
```

### Database Changes

**Adding new table:**
```python
# app/models/database.py
from sqlalchemy import Column, String, DateTime

class NewTable(Base):
    __tablename__ = "new_table"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Migration (if using Alembic):**
```bash
# Generate migration
alembic revision --autogenerate -m "Add new_table"

# Apply migration
alembic upgrade head
```

## ADK Agent Development

### Creating New Agent

1. **Define agent in `/app/agent.py`:**
```python
from google.adk.agents import LlmAgent

new_agent = LlmAgent(
    name="new_agent",
    model="gemini-2.0-flash",
    instruction="You are a specialized agent that...",
    description="Agent for specific task",
    tools=[tool1, tool2]
)
```

2. **Add to agent hierarchy:**
```python
dispatcher = LlmAgent(
    name="dispatcher",
    model="gemini-2.0-flash",
    description="Coordinates workflow",
    sub_agents=[
        existing_agent,
        new_agent  # Add here
    ]
)
```

3. **Test in ADK web UI:**
```bash
adk web agents/ --port 8080
# Open http://localhost:8080
# Test agent in UI before integrating
```

4. **Write integration test:**
```python
# tests/integration/test_new_agent.py
async def test_new_agent_execution():
    result = await new_agent.run("test query")
    assert result.success
    assert "expected content" in result.content
```

### Agent Best Practices

- **Single Responsibility**: Each agent should have one clear purpose
- **Clear Instructions**: Write detailed system instructions
- **Tool Selection**: Only include necessary tools
- **Error Handling**: Handle tool failures gracefully
- **State Management**: Use `output_key` for state sharing between agents

## Git Workflow

### Branch Naming

```bash
feature/<description>  # New features
fix/<description>      # Bug fixes
docs/<description>     # Documentation
refactor/<description> # Code refactoring
test/<description>     # Test additions/fixes
```

### Commit Message Format

```bash
<type>: <description>

<optional body>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat: add OAuth authentication support

Implements OAuth 2.0 flow with Google provider.
Includes token refresh and session management.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pull Request Workflow

1. **Create feature branch:**
```bash
git checkout -b feature/new-feature
```

2. **Make changes and commit:**
```bash
git add <files>
git commit -m "feat: add new feature"
```

3. **Run tests before pushing:**
```bash
make test
make lint
```

4. **Push branch:**
```bash
git push origin feature/new-feature
```

5. **Create PR on GitHub:**
- Add descriptive title
- Fill out PR template
- Link related issues
- Request reviewers

6. **Address review feedback:**
```bash
# Make changes
git add <files>
git commit -m "fix: address review feedback"
git push origin feature/new-feature
```

7. **Merge after approval:**
- Squash and merge (preferred)
- Delete branch after merge

## Code Review Process

### As Author

**Before requesting review:**
- [ ] All tests pass
- [ ] Code is linted
- [ ] Frontend changes verified in browser
- [ ] Documentation updated
- [ ] No console errors or warnings

**During review:**
- Respond to all comments
- Ask clarifying questions
- Make requested changes promptly
- Re-request review after changes

### As Reviewer

**What to check:**
- [ ] Code follows style guidelines
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities
- [ ] Performance considerations
- [ ] Error handling is robust
- [ ] Documentation is clear

**Review checklist:**
```markdown
- [ ] Code quality and readability
- [ ] Test coverage
- [ ] Security considerations
- [ ] Performance impact
- [ ] Documentation completeness
- [ ] Breaking changes noted
```

## Debugging Techniques

### Backend Debugging

**Using Python debugger:**
```python
# Add breakpoint
import pdb; pdb.set_trace()

# Or use ipdb for better experience
import ipdb; ipdb.set_trace()
```

**Logging:**
```python
import logging

logger = logging.getLogger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message", exc_info=True)
```

**FastAPI debug mode:**
```bash
# In .env.local
DEBUG=true

# Or run with reload
uvicorn app.server:app --reload --log-level debug
```

### Frontend Debugging

**Browser DevTools:**
```javascript
// Console logging
console.log('Debug:', data);
console.error('Error:', error);
console.table(arrayData);

// Debugger statement
debugger;
```

**React DevTools:**
- Install React DevTools browser extension
- Inspect component props and state
- Profile component renders

**Chrome DevTools MCP (CRITICAL):**
```javascript
// Check console messages
mcp__chrome-devtools__list_console_messages()

// Check network requests
mcp__chrome-devtools__list_network_requests({ resourceTypes: ["xhr", "fetch", "eventsource"] })

// Take snapshot of current page
mcp__chrome-devtools__take_snapshot()

// Evaluate JavaScript in page context
mcp__chrome-devtools__evaluate_script({ script: "console.log(window.location)" })
```

### SSE Debugging

**Backend:**
```python
# Add logging to SSE broadcaster
logger.info(f"Broadcasting event to session {session_id}: {event}")
```

**Frontend:**
```typescript
// Log all SSE events
eventSource.addEventListener('message', (e) => {
  console.log('[SSE]', e.data);
});

eventSource.onerror = (error) => {
  console.error('[SSE Error]', error);
};
```

**Network tab:**
- Open browser DevTools → Network tab
- Filter by "EventSource"
- Check connection status and events

### ADK Debugging

**ADK web UI:**
```bash
adk web agents/ --port 8080
# Open http://localhost:8080
# View agent execution logs
# Inspect agent state
```

**ADK logs:**
```python
# Enable ADK debug logging
import logging
logging.getLogger("google.adk").setLevel(logging.DEBUG)
```

---

For architecture details, see `ARCHITECTURE.md`.
For troubleshooting, see `TROUBLESHOOTING.md`.

