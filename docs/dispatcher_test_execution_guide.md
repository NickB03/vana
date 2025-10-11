# Dispatcher Test Execution Guide

## Quick Start

```bash
# Run all dispatcher tests
pytest tests/unit/test_dispatcher.py tests/integration/test_dispatcher*.py tests/performance/test_dispatcher*.py -v

# Run only unit tests (no services required)
pytest tests/unit/test_dispatcher.py -v

# Run integration tests (requires backend + ADK services)
pytest tests/integration/test_dispatcher_integration.py --requires-server -v

# Run regression tests (requires backend + ADK services)
pytest tests/integration/test_dispatcher_regression.py --requires-server -v

# Run performance tests (requires backend + ADK services)
pytest tests/performance/test_dispatcher_performance.py --requires-server -v

# Run with coverage
pytest tests/unit/test_dispatcher.py --cov=app.agent --cov=app.agents --cov-report=html
```

## Test Suite Overview

### 1. Unit Tests (`test_dispatcher.py`)
**Location**: `tests/unit/test_dispatcher.py`
**Duration**: ~5 seconds
**Services Required**: None
**Coverage**: 37+ tests

#### Test Categories:
- **Import Tests** (4 tests): Verify agents can be imported
- **Configuration Tests** (15 tests): Verify agent setup and configuration
- **Routing Logic Tests** (3 tests): Verify instruction-based routing
- **Integration Tests** (8 tests): Verify component integration
- **Error Handling** (1 test): Verify graceful error handling
- **Backward Compatibility** (4 tests): Verify existing code still works
- **Architecture Tests** (2 tests): Verify agent network structure

#### Running Unit Tests:
```bash
# All unit tests
pytest tests/unit/test_dispatcher.py -v

# Specific test class
pytest tests/unit/test_dispatcher.py::TestDispatcherConfiguration -v

# Single test
pytest tests/unit/test_dispatcher.py::TestDispatcherImport::test_import_dispatcher_agent -v

# With detailed output
pytest tests/unit/test_dispatcher.py -v -s

# Generate coverage report
pytest tests/unit/test_dispatcher.py --cov=app.agent --cov=app.agents.generalist --cov-report=term-missing
```

#### Expected Results:
```
✓ 37+ tests pass
✓ Coverage: >95% for dispatcher code
✓ Execution time: <10 seconds
✓ No warnings or errors
```

### 2. Integration Tests (`test_dispatcher_integration.py`)
**Location**: `tests/integration/test_dispatcher_integration.py`
**Duration**: ~2-5 minutes
**Services Required**: Backend (port 8000) + ADK (port 8080)
**Coverage**: 9 integration scenarios

#### Test Scenarios:
1. Greeting routing to generalist
2. Research query routing
3. SSE streaming through dispatcher
4. Memory tools through dispatcher
5. Agent network events
6. Multi-turn conversations
7. Concurrent sessions
8. Error handling
9. Session persistence

#### Prerequisites:
```bash
# Terminal 1: Start backend
make dev-backend
# OR
uv run --env-file .env.local uvicorn app.server:app --reload --port 8000

# Terminal 2: Start ADK service
adk web agents/ --port 8080

# Terminal 3: Run tests
pytest tests/integration/test_dispatcher_integration.py --requires-server -v
```

#### Running Integration Tests:
```bash
# All integration tests
pytest tests/integration/test_dispatcher_integration.py -v -m integration

# Skip if services not running
pytest tests/integration/test_dispatcher_integration.py -v
# (Tests will auto-skip if services unavailable)

# With debug output
pytest tests/integration/test_dispatcher_integration.py -v -s

# Single test
pytest tests/integration/test_dispatcher_integration.py::test_dispatcher_routes_greeting_to_generalist -v
```

#### Expected Results:
```
✓ 9 tests pass
✓ SSE streaming works
✓ Agent routing correct
✓ Session isolation maintained
✓ No connection errors
```

### 3. Regression Tests (`test_dispatcher_regression.py`)
**Location**: `tests/integration/test_dispatcher_regression.py`
**Duration**: ~5-10 minutes
**Services Required**: Backend (port 8000) + ADK (port 8080)
**Coverage**: 10 regression scenarios

#### Test Scenarios:
1. Research plan generation unchanged
2. Research pipeline execution unchanged
3. Sources and citations preserved
4. Memory system unchanged
5. Approval workflow unchanged
6. Iterative refinement loop unchanged
7. Report composer still works
8. Section planner unchanged
9. Backward compatibility API unchanged

#### Running Regression Tests:
```bash
# All regression tests
pytest tests/integration/test_dispatcher_regression.py -v -m integration

# With timeout (some tests are slow)
pytest tests/integration/test_dispatcher_regression.py -v --timeout=300

# Critical regression tests only
pytest tests/integration/test_dispatcher_regression.py -k "plan_generation or pipeline or memory" -v
```

#### Expected Results:
```
✓ 10 tests pass
✓ Existing functionality intact
✓ API endpoints unchanged
✓ Research pipeline works
✓ Memory tools functional
```

### 4. Performance Tests (`test_dispatcher_performance.py`)
**Location**: `tests/performance/test_dispatcher_performance.py`
**Duration**: ~3-5 minutes
**Services Required**: Backend (port 8000) + ADK (port 8080)
**Coverage**: 7 performance scenarios

#### Test Scenarios:
1. Dispatcher routing latency
2. Memory overhead measurement
3. Concurrent request performance
4. Routing decision speed
5. No routing loops
6. Session isolation performance

#### Running Performance Tests:
```bash
# All performance tests
pytest tests/performance/test_dispatcher_performance.py -v -m performance

# With verbose output (shows metrics)
pytest tests/performance/test_dispatcher_performance.py -v -s

# Specific performance test
pytest tests/performance/test_dispatcher_performance.py::test_dispatcher_routing_latency -v -s
```

#### Expected Results:
```
✓ p95 latency <1000ms (simple queries)
✓ Routing overhead <500ms
✓ Memory increase <100MB
✓ No routing loops detected
✓ Concurrent requests handle well
```

#### Performance Benchmarks:
```
DISPATCHER ROUTING PERFORMANCE (Simple Queries)
============================================================
Latency p50: 250.00ms
Latency p95: 450.00ms
Latency p99: 600.00ms
Latency avg: 300.00ms
Latency max: 650.00ms
Events avg: 4.2
============================================================
```

## Complete Test Run

### Full Test Suite (All Tests)
```bash
# Run everything (requires services)
pytest tests/unit/test_dispatcher.py \
       tests/integration/test_dispatcher_integration.py \
       tests/integration/test_dispatcher_regression.py \
       tests/performance/test_dispatcher_performance.py \
       -v --tb=short

# With coverage
pytest tests/unit/test_dispatcher.py \
       tests/integration/test_dispatcher_integration.py \
       -v --cov=app.agent --cov=app.agents --cov-report=html

# Quick sanity check (unit tests only)
pytest tests/unit/test_dispatcher.py -v
```

### CI/CD Integration
```bash
# CI pipeline command (in .github/workflows/)
pytest tests/unit/test_dispatcher.py \
       --cov=app.agent \
       --cov=app.agents \
       --cov-report=xml \
       --cov-fail-under=95 \
       --junit-xml=dispatcher-test-report.xml
```

## Troubleshooting

### Services Not Running
**Error**: `pytest.skip("Backend not running on port 8000")`

**Solution**:
```bash
# Start backend
make dev-backend

# Start ADK
adk web agents/ --port 8080

# Verify services
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8080/health  # May return 404, that's ok if service is up
```

### Tests Timeout
**Error**: `pytest.TimeoutError` or `httpx.TimeoutException`

**Solution**:
```bash
# Increase timeout
pytest tests/integration/test_dispatcher_integration.py -v --timeout=600

# Or run individual tests
pytest tests/integration/test_dispatcher_integration.py::test_sse_streaming_through_dispatcher -v
```

### Port Already in Use
**Error**: `OSError: [Errno 48] Address already in use`

**Solution**:
```bash
# Kill existing processes
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Restart services
./start_all_services.sh
```

### Import Errors
**Error**: `ImportError: cannot import name 'dispatcher_agent'`

**Solution**:
```bash
# Ensure you're in project root
cd /Users/nick/Projects/vana

# Verify Python path
export PYTHONPATH=.

# Re-run tests
pytest tests/unit/test_dispatcher.py -v
```

### Memory Test Failures
**Error**: `AssertionError: Memory increase 150.00MB seems excessive`

**Solution**:
- Memory tests are environment-dependent
- Adjust threshold in test if needed
- Run on clean system with minimal background processes
- Memory tests are informational, not strict

### Integration Test Skips
**Behavior**: Tests automatically skip if services unavailable

**This is expected behavior**:
```python
except httpx.ConnectError:
    pytest.skip("Backend not running on port 8000")
```

Start services to run tests.

## Test Coverage Report

### Generate HTML Coverage Report
```bash
# Unit tests coverage
pytest tests/unit/test_dispatcher.py --cov=app.agent --cov=app.agents --cov-report=html

# Open report
open htmlcov/index.html
```

### Coverage Targets
```
app/agent.py (dispatcher_agent)           : >95%
app/agents/generalist.py                  : >95%
Overall project coverage (maintained)      : >85%
```

### Expected Coverage Output
```
---------- coverage: platform darwin, python 3.10.x -----------
Name                                Stmts   Miss  Cover
-------------------------------------------------------
app/agent.py                          150      5    97%
app/agents/generalist.py               12      0   100%
-------------------------------------------------------
TOTAL                                 162      5    97%
```

## Test Markers

### Available Markers
```python
@pytest.mark.integration  # Integration test
@pytest.mark.requires_server  # Requires backend + ADK services
@pytest.mark.performance  # Performance test
@pytest.mark.slow  # Slow running test
```

### Running by Marker
```bash
# Only integration tests
pytest -m integration -v

# Only performance tests
pytest -m performance -v

# Exclude slow tests
pytest -m "not slow" -v

# Integration tests that require server
pytest -m "integration and requires_server" -v
```

## Continuous Integration

### Pre-commit Checks
```bash
# Before committing, run:
pytest tests/unit/test_dispatcher.py -v
make lint
make typecheck
```

### PR Checks
```bash
# Full test suite for PR
pytest tests/unit/test_dispatcher.py \
       tests/integration/test_dispatcher_integration.py \
       --cov=app.agent --cov=app.agents \
       --cov-report=xml \
       --cov-fail-under=95 \
       -v
```

### Nightly Checks
```bash
# Full suite including performance
pytest tests/unit/test_dispatcher.py \
       tests/integration/test_dispatcher*.py \
       tests/performance/test_dispatcher*.py \
       -v --cov-report=html
```

## Manual Test Execution

### Test Dispatcher Manually
```bash
# Option 1: Through pytest
python tests/integration/test_dispatcher_integration.py

# Option 2: Through curl
curl -X POST http://127.0.0.1:8000/apps/vana/users/default/sessions/test-123/run \
     -H "Content-Type: application/json" \
     -d '{"query": "Hello"}'

curl http://127.0.0.1:8000/apps/vana/users/default/sessions/test-123/run
```

### Test Routing Manually
```bash
# Start Python REPL
python

>>> from app.agent import dispatcher_agent, root_agent
>>> print(f"Root agent: {root_agent.name}")
>>> print(f"Sub-agents: {[a.name for a in dispatcher_agent.sub_agents]}")
>>> print(f"Instruction: {dispatcher_agent.instruction[:200]}")
```

## Test Data

### Sample Test Queries
**Simple (→ generalist_agent)**:
```python
["Hello", "Hi there", "Good morning", "Thanks", "How are you?"]
```

**Research (→ interactive_planner_agent)**:
```python
["Research AI trends", "What are the latest developments in X?",
 "Investigate climate change", "Analyze effectiveness of Y"]
```

**Ambiguous (→ interactive_planner_agent per "when in doubt" rule)**:
```python
["Tell me about Python", "What's happening with AI?",
 "Explain quantum computing"]
```

## Success Criteria Summary

### Unit Tests
- ✅ 37+ tests pass
- ✅ Coverage >95% for dispatcher code
- ✅ No import errors
- ✅ No linting errors

### Integration Tests
- ✅ 9 tests pass
- ✅ SSE streaming works
- ✅ Routing decisions correct
- ✅ Session isolation maintained

### Regression Tests
- ✅ 10 tests pass
- ✅ Research functionality unchanged
- ✅ Memory tools work
- ✅ API backward compatible

### Performance Tests
- ✅ 7 tests pass
- ✅ p95 latency <1000ms
- ✅ Memory overhead acceptable
- ✅ No routing loops

### Overall
- ✅ 63+ total tests
- ✅ Project coverage ≥85%
- ✅ All critical paths covered
- ✅ No existing functionality broken

## Next Steps

After running tests:

1. **Review coverage report**: `open htmlcov/index.html`
2. **Check for warnings**: Review test output for deprecation warnings
3. **Performance analysis**: Compare metrics to benchmarks
4. **Fix failures**: Address any failing tests before merging
5. **Update documentation**: If behavior changes, update docs

## Getting Help

- Review test plan: `docs/dispatcher_test_plan.md`
- Check agent implementation: `app/agent.py` and `app/agents/generalist.py`
- Review dispatcher plan: `dispatcher_plan.md`
- CI/CD pipeline: `.github/workflows/`

## Test File Locations

```
tests/
├── unit/
│   └── test_dispatcher.py                      # 37+ unit tests
├── integration/
│   ├── test_dispatcher_integration.py          # 9 integration tests
│   └── test_dispatcher_regression.py           # 10 regression tests
└── performance/
    └── test_dispatcher_performance.py          # 7 performance tests

docs/
├── dispatcher_test_plan.md                     # Comprehensive test plan
└── dispatcher_test_execution_guide.md          # This file
```

---

**Last Updated**: 2024-01-11
**Test Suite Version**: 1.0.0
**Total Tests**: 63+
**Expected Duration**: Unit: 5s, Integration: 5min, Performance: 5min
