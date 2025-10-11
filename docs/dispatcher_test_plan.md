# Dispatcher Pattern - Comprehensive Test Plan

## Overview

This document outlines the complete testing strategy for the new dispatcher-based multi-agent architecture. The dispatcher pattern routes user requests to specialized agents (generalist, research, code writer, creative writer) based on request analysis.

## Architecture Summary

```
User Request → dispatcher_agent (orchestrator)
                ├── generalist_agent (simple Q&A, greetings)
                ├── research_agent (formerly interactive_planner_agent)
                ├── code_writer_agent (programming tasks)
                └── creative_writer_agent (creative content)
```

## Test Categories

### 1. Routing Accuracy Tests

**Objective**: Verify dispatcher correctly routes requests to appropriate specialists

#### Test Cases

| Test ID | Input | Expected Route | Rationale |
|---------|-------|----------------|-----------|
| RT-001 | "Hello" | generalist_agent | Simple greeting |
| RT-002 | "What's the weather?" | generalist_agent | Simple factual question |
| RT-003 | "Research AI trends in 2024" | research_agent | Requires web search |
| RT-004 | "Create a research plan for quantum computing" | research_agent | Requires planning |
| RT-005 | "Write a Python function to sort a list" | code_writer_agent | Programming request |
| RT-006 | "Debug this JavaScript code: ..." | code_writer_agent | Code debugging |
| RT-007 | "Write a poem about sunset" | creative_writer_agent | Creative writing |
| RT-008 | "Generate marketing copy for a product" | creative_writer_agent | Creative content |
| RT-009 | "Research and write code for..." | research_agent | Ambiguous - prefer research |
| RT-010 | "Tell me about yourself" | generalist_agent | Conversational |

### 2. Integration Tests

**Objective**: Ensure dispatcher integrates seamlessly with existing infrastructure

#### Test Cases

- **IT-001**: SSE streaming works end-to-end through dispatcher
  - Verify SSE connection established
  - Verify events stream correctly
  - Verify proper event types (research_update, agent_network_update)
  - Verify [DONE] signal sent

- **IT-002**: Agent network events propagate correctly
  - Verify before_agent_callback executes
  - Verify after_agent_callback executes
  - Verify agent_network_tracking_callback executes
  - Verify SSE broadcaster receives events

- **IT-003**: Memory tools function with dispatcher
  - Test store_memory_tool through dispatcher
  - Test retrieve_memories_tool through dispatcher
  - Test delete_memory_tool through dispatcher
  - Verify user isolation maintained

- **IT-004**: Session persistence works
  - Verify session created correctly
  - Verify session state persists across calls
  - Verify session cleanup on completion
  - Verify GCS backup (if enabled)

- **IT-005**: Error handling and graceful degradation
  - Test specialist agent failure recovery
  - Test network timeout handling
  - Test invalid input handling
  - Verify error events sent via SSE

### 3. Regression Tests

**Objective**: Ensure existing functionality unchanged by dispatcher introduction

#### Test Cases

- **RG-001**: Research plan generation unchanged
  - Input: "Research climate change impacts"
  - Verify plan_generator tool called
  - Verify plan structure matches expected format
  - Verify approval workflow intact

- **RG-002**: Research execution pipeline unchanged
  - Verify section_planner executes
  - Verify section_researcher performs web searches
  - Verify research_evaluator provides feedback
  - Verify enhanced_search_executor runs on 'fail' grade
  - Verify report_composer generates final report

- **RG-003**: Citations and sources preserved
  - Verify grounding_chunks collected
  - Verify grounding_supports tracked
  - Verify citation replacement works
  - Verify markdown links formatted correctly

- **RG-004**: Memory system unchanged
  - Verify user preferences stored/retrieved
  - Verify namespace filtering works
  - Verify tag-based filtering works
  - Verify importance-based ordering works
  - Verify TTL expiration works

- **RG-005**: Multi-turn conversations maintained
  - Test conversation context preservation
  - Test plan refinement workflow
  - Test approval → execution flow
  - Verify user feedback incorporation

### 4. Performance Tests

**Objective**: Measure performance impact of dispatcher layer

#### Test Cases

- **PT-001**: Routing latency measurement
  - Baseline: Direct agent invocation time
  - With dispatcher: Dispatcher + agent invocation time
  - Target: <100ms overhead for routing decision

- **PT-002**: Token usage analysis
  - Measure dispatcher prompt tokens
  - Measure specialist invocation tokens
  - Compare to pre-dispatcher total
  - Target: <10% token increase

- **PT-003**: Memory consumption
  - Measure memory before dispatcher
  - Measure memory with dispatcher + 4 specialists loaded
  - Target: <50MB additional memory

- **PT-004**: Transfer loop detection
  - Test for infinite routing loops
  - Verify max_depth or escalation works
  - Test cyclic dependency handling

- **PT-005**: Concurrent request handling
  - Test 10 simultaneous requests
  - Verify proper session isolation
  - Verify no cross-talk between sessions
  - Measure p50, p95, p99 latency

### 5. Edge Case Tests

**Objective**: Test unusual or boundary conditions

#### Test Cases

- **EC-001**: Empty input
  - Input: ""
  - Expected: Error or prompt for input

- **EC-002**: Very long input (>10k chars)
  - Verify truncation or chunking
  - Verify no crashes

- **EC-003**: Multilingual input
  - Test non-English requests
  - Verify routing still works

- **EC-004**: Malformed requests
  - Test JSON parsing errors
  - Test missing required fields
  - Test invalid session IDs

- **EC-005**: Rapid sequential requests
  - Test 100 requests in 1 second
  - Verify rate limiting (if applicable)
  - Verify queue management

- **EC-006**: Agent unavailability
  - Test when specialist agent crashes
  - Test when ADK service down
  - Verify fallback behavior

## Test Coverage Requirements

### Code Coverage Targets
- **Unit Tests**: 95%+ coverage of dispatcher logic
- **Integration Tests**: 90%+ coverage of routing + specialist invocation
- **Overall**: Maintain 85%+ project-wide coverage (existing requirement)

### Critical Paths to Cover
1. ✅ Dispatcher routing decision logic
2. ✅ AgentTool invocation mechanism
3. ✅ SSE event broadcasting through dispatcher
4. ✅ Error propagation and handling
5. ✅ Session state management
6. ✅ Memory tool integration
7. ✅ Callback chain execution
8. ✅ Research pipeline execution
9. ✅ Citation system
10. ✅ Multi-turn conversation flow

## Test Data

### Sample Inputs by Category

**Greetings/Simple**:
```python
SIMPLE_QUERIES = [
    "Hello",
    "Hi there",
    "What's up?",
    "Good morning",
    "How are you?",
    "Tell me about yourself",
    "What can you do?",
]
```

**Research Queries**:
```python
RESEARCH_QUERIES = [
    "Research the latest developments in quantum computing",
    "What are the top AI trends in 2024?",
    "Investigate the impact of climate change on agriculture",
    "Create a comprehensive report on renewable energy",
    "Analyze the effectiveness of various vaccine types",
]
```

**Code Queries**:
```python
CODE_QUERIES = [
    "Write a Python function to implement binary search",
    "Debug this code: def sort(arr): return sorted(arr)[::-1]",
    "Create a REST API using FastAPI",
    "Implement a linked list in JavaScript",
    "Fix the memory leak in this C++ code",
]
```

**Creative Queries**:
```python
CREATIVE_QUERIES = [
    "Write a short story about time travel",
    "Generate marketing copy for eco-friendly products",
    "Create a poem about the ocean",
    "Draft a compelling blog post about productivity",
    "Write dialogue for a sci-fi movie scene",
]
```

## Test Environment Setup

### Prerequisites
1. Backend running on port 8000
2. ADK service running on port 8080
3. PostgreSQL database available
4. Redis (optional, for session caching)
5. Test environment variables configured

### Environment Variables
```bash
# .env.test
GOOGLE_API_KEY=test-key
AUTH_REQUIRE_SSE_AUTH=false
REDIS_ENABLED=false
SESSION_STORAGE_ENABLED=false
```

## Test Execution

### Running Tests

```bash
# All dispatcher tests
pytest tests/unit/test_dispatcher.py -v

# Specific test category
pytest tests/unit/test_dispatcher.py::TestDispatcherRouting -v

# Integration tests (requires services running)
pytest tests/integration/test_dispatcher_integration.py -v --requires-server

# Performance tests
pytest tests/performance/test_dispatcher_performance.py -v

# Generate coverage report
pytest tests/unit/test_dispatcher.py --cov=app.agent --cov-report=html
```

### CI/CD Integration

Tests should be integrated into existing CI pipeline:
1. Unit tests run on every commit
2. Integration tests run on PR
3. Performance tests run nightly
4. Coverage reports uploaded to codecov

## Success Criteria

### Functional
- ✅ All routing accuracy tests pass (100%)
- ✅ All integration tests pass (100%)
- ✅ All regression tests pass (100%)
- ✅ No existing functionality broken

### Performance
- ✅ Routing overhead <100ms
- ✅ Token usage increase <10%
- ✅ Memory increase <50MB
- ✅ No routing loops detected

### Quality
- ✅ Code coverage ≥95% for new code
- ✅ Overall coverage maintained ≥85%
- ✅ No new linting errors
- ✅ Type checking passes

## Risk Assessment

### High Risk Areas
1. **Breaking existing research functionality** (Mitigation: Comprehensive regression tests)
2. **SSE streaming issues** (Mitigation: Integration tests with real SSE connections)
3. **Session state corruption** (Mitigation: Concurrent request tests)
4. **Memory leaks from agent instances** (Mitigation: Performance monitoring)

### Low Risk Areas
1. Dispatcher routing logic (simple conditional logic)
2. Memory tools integration (already tested, unchanged)
3. Basic generalist responses (stateless, simple)

## Test Maintenance

### When to Update Tests
- Adding new specialist agents → Add routing tests
- Modifying routing logic → Update unit tests
- Changing SSE event format → Update integration tests
- Performance degradation → Add performance regression tests

### Test Data Management
- Keep sample queries in separate fixtures
- Version test data with schema changes
- Document expected outputs for regression tests

## Appendix A: Mock Strategies

### Unit Test Mocks
```python
# Mock ADK components
mock_invocation_context = MagicMock()
mock_session = MagicMock()
mock_agent_tool = MagicMock()

# Mock specialist agents
mock_research_agent = MagicMock(spec=LlmAgent)
mock_generalist_agent = MagicMock(spec=LlmAgent)
```

### Integration Test Setup
```python
# Use real ADK instances but mock external services
@pytest.fixture
def adk_test_environment():
    # Real agent instances
    # Mock Brave Search
    # Mock database (test DB)
    # Real SSE broadcaster (in-memory)
    pass
```

## Appendix B: Performance Benchmarks

### Baseline (Pre-Dispatcher)
- Average request latency: 250ms
- Token usage per request: ~1500 tokens
- Memory usage: 180MB

### Target (With Dispatcher)
- Average request latency: <350ms (+100ms acceptable)
- Token usage per request: ~1650 tokens (+10%)
- Memory usage: <230MB (+50MB)

## Appendix C: Test Report Template

```markdown
# Dispatcher Test Report - [Date]

## Summary
- Total Tests: X
- Passed: X
- Failed: X
- Skipped: X
- Coverage: X%

## Test Results by Category
- Routing Accuracy: X/X passed
- Integration: X/X passed
- Regression: X/X passed
- Performance: X/X passed

## Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Test: [Test ID]
   - Status: Open/Fixed

## Performance Metrics
- Routing overhead: Xms (target: <100ms)
- Token usage: X tokens (target: <1650)
- Memory: XMB (target: <230MB)

## Recommendations
1. [Action item]
2. [Action item]
```
