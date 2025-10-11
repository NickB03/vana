# Dispatcher Test Suite - Quick Reference

## Overview
Comprehensive test suite for the new dispatcher-based multi-agent architecture. Tests verify routing accuracy, integration with existing systems, backward compatibility, and performance.

## Quick Start

```bash
# Run all dispatcher tests
pytest tests/unit/test_dispatcher.py tests/integration/test_dispatcher*.py -v

# Unit tests only (fast, no services needed)
pytest tests/unit/test_dispatcher.py -v

# Integration + Regression (requires backend + ADK)
pytest tests/integration/test_dispatcher*.py --requires-server -v
```

## Test Files

| File | Type | Tests | Duration | Services Needed |
|------|------|-------|----------|-----------------|
| `test_dispatcher.py` | Unit | 37+ | 5s | None |
| `test_dispatcher_integration.py` | Integration | 9 | 5min | Backend + ADK |
| `test_dispatcher_regression.py` | Regression | 10 | 10min | Backend + ADK |
| `test_dispatcher_performance.py` | Performance | 7 | 5min | Backend + ADK |

## Test Coverage

### Unit Tests (`test_dispatcher.py`)
- ✅ Agent import and configuration
- ✅ Routing logic verification
- ✅ Sub-agent structure
- ✅ Transfer prevention (no loops)
- ✅ Callback integration
- ✅ Backward compatibility
- ✅ **Coverage: >95%**

### Integration Tests
- ✅ Greeting routing to generalist
- ✅ Research routing to interactive_planner
- ✅ SSE streaming end-to-end
- ✅ Memory tools integration
- ✅ Multi-turn conversations
- ✅ Concurrent sessions
- ✅ Error handling

### Regression Tests
- ✅ Research plan generation unchanged
- ✅ Research pipeline execution intact
- ✅ Citations and sources preserved
- ✅ Memory system functional
- ✅ Approval workflow works
- ✅ API backward compatible

### Performance Tests
- ✅ Routing latency <500ms (target)
- ✅ p95 latency <1000ms (target)
- ✅ Memory overhead <100MB (target)
- ✅ No routing loops
- ✅ Concurrent request handling

## Prerequisites

### For Unit Tests
```bash
# No services needed
pytest tests/unit/test_dispatcher.py -v
```

### For Integration/Regression/Performance Tests
```bash
# Terminal 1: Start backend
make dev-backend

# Terminal 2: Start ADK
adk web agents/ --port 8080

# Terminal 3: Run tests
pytest tests/integration/test_dispatcher*.py --requires-server -v
```

## Success Criteria

- ✅ **63+ total tests pass**
- ✅ **Unit test coverage >95%**
- ✅ **Overall coverage maintained ≥85%**
- ✅ **No existing functionality broken**
- ✅ **Performance targets met**

## Expected Test Output

```
tests/unit/test_dispatcher.py::TestDispatcherImport ✓✓✓✓ (4)
tests/unit/test_dispatcher.py::TestDispatcherConfiguration ✓✓✓✓✓ (15)
tests/unit/test_dispatcher.py::TestDispatcherRoutingLogic ✓✓✓ (3)
tests/unit/test_dispatcher.py::TestMemoryToolsIntegration ✓✓ (2)
tests/unit/test_dispatcher.py::TestBackwardCompatibility ✓✓✓✓ (4)
...

================================= 37+ passed in 5.23s =================================
```

## Common Commands

```bash
# Fast unit tests
pytest tests/unit/test_dispatcher.py -v

# Full test suite with coverage
pytest tests/unit/test_dispatcher.py \
       tests/integration/test_dispatcher*.py \
       --cov=app.agent --cov=app.agents --cov-report=html

# Performance tests with metrics
pytest tests/performance/test_dispatcher_performance.py -v -s

# Single test
pytest tests/unit/test_dispatcher.py::TestDispatcherImport::test_root_agent_is_dispatcher -v

# Tests by marker
pytest -m integration -v
pytest -m performance -v
```

## Architecture Tested

```
User Request → dispatcher_agent (orchestrator)
                ├── generalist_agent (simple Q&A, greetings)
                └── interactive_planner_agent (research, planning)
                     └── research_pipeline (execution)
                          ├── section_planner
                          ├── section_researcher
                          ├── research_evaluator
                          ├── enhanced_search_executor
                          └── report_composer
```

## Documentation

- **Test Plan**: `docs/dispatcher_test_plan.md` (comprehensive strategy)
- **Execution Guide**: `docs/dispatcher_test_execution_guide.md` (detailed how-to)
- **This File**: Quick reference

## Troubleshooting

### Services Not Running
```bash
# Auto-skip if services unavailable (expected behavior)
pytest tests/integration/test_dispatcher_integration.py -v
# Tests will skip with message: "Backend not running on port 8000"
```

### Run Just Working Tests
```bash
# Unit tests always work (no dependencies)
pytest tests/unit/test_dispatcher.py -v
```

### Check Coverage
```bash
pytest tests/unit/test_dispatcher.py --cov=app.agent --cov-report=term-missing
```

## Key Test Cases

### Routing Accuracy
```python
# Simple greeting → generalist_agent
"Hello" → generalist_agent

# Research request → interactive_planner_agent
"Research AI trends" → interactive_planner_agent

# Ambiguous (default to research per "when in doubt" rule)
"Tell me about AI" → interactive_planner_agent
```

### Integration Scenarios
- SSE streaming through dispatcher
- Memory tool usage (store/retrieve/delete)
- Multi-turn conversations
- Concurrent sessions (isolation)
- Error recovery

### Regression Coverage
- Research plan generation
- Web search execution
- Citation system
- Report composition
- Approval workflow

### Performance Metrics
- Routing decision: <500ms
- p95 latency: <1000ms
- Memory increase: <100MB
- No infinite loops

## CI/CD Integration

```bash
# Pre-commit (fast)
pytest tests/unit/test_dispatcher.py -v

# PR validation (comprehensive)
pytest tests/unit/test_dispatcher.py \
       tests/integration/test_dispatcher*.py \
       --cov=app.agent --cov=app.agents \
       --cov-fail-under=95 -v

# Nightly (full suite)
pytest tests/unit/test_dispatcher.py \
       tests/integration/test_dispatcher*.py \
       tests/performance/test_dispatcher*.py -v
```

## Test Statistics

- **Total Tests**: 63+
- **Unit Tests**: 37+ (5 seconds)
- **Integration Tests**: 9 (5 minutes)
- **Regression Tests**: 10 (10 minutes)
- **Performance Tests**: 7 (5 minutes)
- **Code Coverage**: >95% (dispatcher code), >85% (project)

## Next Steps After Testing

1. ✅ Review coverage report: `open htmlcov/index.html`
2. ✅ Check performance metrics against benchmarks
3. ✅ Verify no new warnings or deprecations
4. ✅ Update documentation if needed
5. ✅ Commit tests with implementation

## Contact

For questions or issues:
- Review `docs/dispatcher_test_plan.md` for detailed strategy
- Review `docs/dispatcher_test_execution_guide.md` for troubleshooting
- Check `dispatcher_plan.md` for implementation details

---

**Version**: 1.0.0
**Last Updated**: 2024-01-11
**Status**: ✅ Complete and Ready for Use
