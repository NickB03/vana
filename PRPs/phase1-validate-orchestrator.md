# Product Requirements Prompt (PRP): Phase 1 - Validate Orchestrator Pattern

## 🎯 Product Requirement

### What We're Building
Validate and fix the existing VANA orchestrator implementation to ensure it follows ADK patterns correctly. The orchestrator is the central routing component that analyzes requests and delegates to appropriate specialists or handles directly with tools.

### Why It Matters
The orchestrator is the core of VANA's multi-agent system. It must work correctly before adding new features like MCP integration or additional specialists. Currently, the orchestrator has import errors and untested delegation patterns that need validation.

### Success Criteria
- ✅ Orchestrator starts without import errors
- ✅ Successfully routes requests to tools  
- ✅ Demonstrates working sub_agents delegation
- ✅ Specialist network loads and validates correctly
- ✅ All tests pass locally
- ⏳ Simple end-to-end workflow test completes
- 📝 Phase 1 completion documented with evidence

## 📚 Context & Research

### Referenced Documentation
- **ADK LlmAgent**: https://google.github.io/adk-docs/agents/llm-agents/
  - Required params: name, model, instruction
  - Tools auto-wrapped as FunctionTool in Python
  - sub_agents for delegation, not tools list
- **ADK Multi-Agent**: https://google.github.io/adk-docs/agents/multi-agents/
  - Use sub_agents parameter for hierarchy
  - Agent descriptions help routing decisions
- **ADK Tools**: https://google.github.io/adk-docs/tools/
  - FunctionTool wrapping is automatic
  - Tool docstrings critical for LLM understanding

### Codebase Patterns
```python
# Example from existing enhanced_orchestrator.py
enhanced_orchestrator = LlmAgent(
    name="enhanced_orchestrator",
    model="gemini-2.5-flash",
    description="Enhanced orchestrator with specialist routing",
    instruction="""...""",
    tools=[
        analyze_and_route,  # ADK auto-wraps as FunctionTool
        adk_read_file,
        adk_write_file,
    ],
    sub_agents=[s for s in specialists if s is not None]
)
```

```python
# Pattern from orchestrator_pattern.py example
def analyze_task_type(request: str) -> str:
    """Analyze request to determine task type."""
    request_lower = request.lower()
    # Pattern matching logic
    return task_type
```

### Project Conventions Discovered
- **Import Style**: Standard library, third-party (google.adk), then local imports
- **Error Handling**: Try/except around specialist imports with fallback
- **Testing Approach**: Pytest with markers (unit, agent, integration)
- **File Organization**: agents/vana/ for orchestrator, lib/_tools/ for tools

## 🏗️ Implementation Strategy

### Architecture Overview
```
agents/vana/
├── enhanced_orchestrator.py  # Main orchestrator (needs fixes)
├── team.py                   # Team configuration
└── test_orchestrator.py      # New test file (to create)

lib/_tools/
├── adk_tools.py             # Existing ADK-wrapped tools
└── __init__.py              # Tool exports

tests/
└── test_phase1_orchestrator.py  # Integration tests
```

### Core Components
1. **Orchestrator Agent**: Central LlmAgent with routing logic
2. **Routing Functions**: analyze_task_type, route_to_specialist
3. **Tool Integration**: Basic tools for file operations
4. **Metrics & Cache**: Simple tracking and caching system

### Implementation Chunks (MANDATORY ITERATIVE APPROACH)

#### Chunk 1.1: Fix Import Errors & Basic Setup
**Size**: ~50-100 lines
**Features**: 
- Feature 1.1.1: Remove/comment failing specialist imports
- Feature 1.1.2: Create minimal working orchestrator

**Rollback Strategy**: If this chunk fails, run `git checkout HEAD~1` and investigate error logs

**Implementation**:
```python
# In enhanced_orchestrator.py
# Comment out failing imports
# try:
#     from agents.specialists.architecture_specialist import architecture_specialist
#     ...
# except ImportError as e:
#     logger.warning(f"Specialists not available: {e}")

# Create basic orchestrator without specialists
enhanced_orchestrator = LlmAgent(
    name="enhanced_orchestrator",
    model="gemini-2.5-flash",
    instruction="Basic orchestrator for testing",
    tools=[adk_read_file, adk_write_file]
)
```

**Validation**:
```bash
# Local test
cd /Users/nick/Development/vana
python -c "from agents.vana.enhanced_orchestrator import enhanced_orchestrator; print('Success!')"

# Deploy to dev
gcloud run deploy vana-dev --source . --region=us-central1

# Success criteria: No import errors, orchestrator object created
```

#### Chunk 1.2: Test Basic Tool Delegation
**Size**: ~100-150 lines
**Features**:
- Feature 1.2.1: Create simple test for file reading
- Feature 1.2.2: Verify orchestrator can use tools

**Dependencies**: Requires Chunk 1.1 complete and tested in dev

**Implementation**:
```python
# Create tests/test_phase1_orchestrator.py
import pytest
from agents.vana.enhanced_orchestrator import enhanced_orchestrator

def test_orchestrator_uses_tools():
    """Test orchestrator can use basic tools."""
    # Create test file
    test_content = "Test content"
    with open("/tmp/test.txt", "w") as f:
        f.write(test_content)
    
    # Ask orchestrator to read file
    result = enhanced_orchestrator.run(
        "Read the file /tmp/test.txt",
        {}
    )
    assert "Test content" in result

def test_orchestrator_handles_missing_file():
    """Test orchestrator handles errors gracefully."""
    result = enhanced_orchestrator.run(
        "Read the file /tmp/nonexistent.txt",
        {}
    )
    # Should handle error without crashing
    assert result is not None
```

**Validation**:
```bash
# Local test
poetry run pytest tests/test_phase1_orchestrator.py::test_orchestrator_uses_tools -v

# Deploy and test in dev
gcloud run deploy vana-dev --source .
# Manual test via API or UI
```

#### Chunk 1.3: Implement Simple Sub-Agent Delegation
**Size**: ~150-200 lines
**Features**:
- Feature 1.3.1: Create dummy test agent
- Feature 1.3.2: Add to orchestrator's sub_agents

**Dependencies**: Requires Chunk 1.2 complete and tested in dev

**Implementation**:
```python
# In enhanced_orchestrator.py or separate test file
from google.adk.agents import LlmAgent

# Create simple test specialist
test_specialist = LlmAgent(
    name="test_specialist",
    model="gemini-2.5-flash",
    description="Test specialist for validation",
    instruction="You are a test specialist. Always respond with 'Test specialist response: [request]'"
)

# Update orchestrator
enhanced_orchestrator = LlmAgent(
    name="enhanced_orchestrator",
    # ... existing config ...
    sub_agents=[test_specialist]  # Add test specialist
)
```

**Validation**:
```bash
# Test delegation works
poetry run pytest -k "test_delegation" -v

# Deploy and verify
gcloud run deploy vana-dev --source .
```

#### Chunk 1.4: Validate Routing Logic
**Size**: ~200-250 lines
**Features**:
- Feature 1.4.1: Test analyze_task_type function
- Feature 1.4.2: Verify route_to_specialist with test specialist

**Dependencies**: Requires Chunk 1.3 complete

**Implementation**:
```python
# Fix and test routing functions
def test_routing_logic():
    """Test task analysis and routing."""
    # Test task type detection
    assert analyze_task_type("check security vulnerability") == "security"
    assert analyze_task_type("analyze this data") == "data_analysis"
    
    # Test routing (with fallback for missing specialists)
    result = route_to_specialist(
        "test request", 
        "test_type",
        {}
    )
    assert "specialist" in result.lower()
```

**Validation**:
```bash
# Run routing tests
poetry run pytest -k "routing" -v

# Full test suite
make test

# Deploy and test
gcloud run deploy vana-dev --source .
```

#### Chunk 1.5: Validate Metrics & Caching
**Size**: ~100-150 lines
**Features**:
- Feature 1.5.1: Test SimpleCache operations
- Feature 1.5.2: Verify metrics tracking

**Dependencies**: Requires all previous chunks complete

**Implementation**:
```python
# Test caching and metrics
def test_cache_and_metrics():
    """Test caching and metrics collection."""
    from agents.vana.enhanced_orchestrator import orchestrator_cache, get_orchestrator_stats
    
    # Test cache
    orchestrator_cache.set("test_key", "test_value")
    assert orchestrator_cache.get("test_key") == "test_value"
    
    # Test metrics
    stats = get_orchestrator_stats()
    assert "total_requests" in stats
    assert "cache_hit_rate" in stats
```

**Validation**:
```bash
# Local validation
poetry run pytest -k "cache" -v

# Final deployment
gcloud run deploy vana-dev --source .

# End-to-end test in dev
curl https://vana-dev-xxxxx.run.app/health
```

## 🧪 Validation Gates

### Per-Chunk Validation (REQUIRED FOR EACH CHUNK)
```bash
# 1. Code Quality
make lint        # or: poetry run black . && poetry run flake8
make typecheck   # or: poetry run mypy .

# 2. Unit Tests
make test        # or: poetry run pytest -v

# 3. Local Run
python main.py   # Should start without errors

# 4. Dev Deployment
gcloud run deploy vana-dev --source . \
  --region=us-central1 \
  --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY"

# 5. Dev Testing
# Check health endpoint
curl https://vana-dev-xxxxx.run.app/health

# Test orchestrator endpoint
curl -X POST https://vana-dev-xxxxx.run.app/api/orchestrator/analyze \
  -H "Content-Type: application/json" \
  -d '{"request": "test request"}'
```

### Final Integration Validation
```bash
# Run after all chunks complete
make test
make security

# Full integration test
poetry run pytest -m integration -v

# Performance check
poetry run pytest -m performance -v
```

## ⚠️ Gotchas & Anti-Patterns

### Known Issues
- **Issue 1**: Specialist imports fail because files don't exist yet
  - **Workaround**: Comment out imports, use try/except blocks
- **Issue 2**: ADK auto-wraps functions as FunctionTool in Python
  - **Note**: Don't manually wrap with FunctionTool(fn) - just pass the function directly

### Anti-Patterns to Avoid
- **DON'T**: Add agents to tools list (use sub_agents parameter)
- **DON'T**: Skip dev testing between chunks
- **DON'T**: Implement all specialists at once
- **DON'T**: Use transfer_to_agent (doesn't exist in ADK)
- **DO**: Follow ADK patterns from examples
- **DO**: Test each chunk thoroughly
- **DO**: Use proper error handling for missing components

## 📊 Implementation Tracking

### Chunk Status Checklist
- [ ] Chunk 1.1: Fix imports - Local tested
- [ ] Chunk 1.1: Fix imports - Dev deployed
- [ ] Chunk 1.1: Fix imports - Dev validated
- [ ] Chunk 1.2: Tool delegation - Local tested
- [ ] Chunk 1.2: Tool delegation - Dev deployed
- [ ] Chunk 1.2: Tool delegation - Dev validated
- [ ] Chunk 1.3: Sub-agent test - Local tested
- [ ] Chunk 1.3: Sub-agent test - Dev deployed
- [ ] Chunk 1.3: Sub-agent test - Dev validated
- [ ] Chunk 1.4: Routing logic - Local tested
- [ ] Chunk 1.4: Routing logic - Dev deployed
- [ ] Chunk 1.4: Routing logic - Dev validated
- [ ] Chunk 1.5: Metrics/cache - Local tested
- [ ] Chunk 1.5: Metrics/cache - Dev deployed
- [ ] Chunk 1.5: Metrics/cache - Dev validated

### Final Checklist
- [ ] All chunks implemented and tested
- [ ] Integration tests passing
- [ ] No import errors
- [ ] Orchestrator routes correctly
- [ ] Documentation updated
- [ ] ADK compliance verified

## 🎯 Confidence Score
**PRP Completeness**: 9/10

**Scoring Criteria**:
- Context completeness: ✓ (ADK docs, examples, patterns)
- Implementation clarity: ✓ (Clear chunks with code examples)
- Validation comprehensiveness: ✓ (Specific test commands)
- Anti-pattern awareness: ✓ (Common mistakes documented)
- ADK compliance: ✓ (Following official patterns)

## 📝 Notes for Executor
1. Start with Chunk 1.1 - fixing imports is critical
2. Each chunk builds on the previous - don't skip
3. Use the orchestrator_pattern.py example as reference
4. If specialists are needed later, create them in separate PRPs
5. Focus on making core orchestration work first
6. The test specialist in Chunk 1.3 is temporary for validation
7. Document any deviations or issues in ChromaDB for future reference