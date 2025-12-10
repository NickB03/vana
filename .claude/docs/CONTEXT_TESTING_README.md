# Context Retention Testing Strategy

## Overview

This document describes the comprehensive testing strategy implemented to validate context retention fixes in the Vana chat system. The strategy addresses the critical bug where pronouns like "there" should correctly refer to previously mentioned entities (e.g., "Garland Christmas event").

## Quick Start

### Running the Test Suite

```bash
# Run all context retention tests
node scripts/run-context-tests.js

# Run specific test categories
deno test supabase/functions/_shared/context-selector.test.ts --allow-all
deno test tests/integration/context-retention.spec.ts --allow-all
deno test tests/regression/context-bugs.spec.ts --allow-all
deno test tests/performance/context-management.spec.ts --allow-all
```

### Test Coverage

The test suite includes:

- **Unit Tests** (3 files): Context selection, ranking, and entity resolution
- **Integration Tests** (1 file): End-to-end context validation
- **Regression Tests** (1 file): Bug prevention and validation
- **Performance Tests** (1 file): Scalability and efficiency
- **Test Data** (1 file): Conversation scenarios and expected results

## Test Architecture

### 1. Unit Tests (`supabase/functions/_shared/`)

#### `context-selector.test.ts`
Tests the core context selection logic:
- Message selection within token budgets
- Prioritization of recent messages
- Entity tracking and preservation
- Summary generation capabilities

#### `context-ranker.test.ts`
Tests message importance ranking:
- Recency scoring with exponential decay
- Entity density calculation
- Question/answer detection
- Code content identification
- Decision point detection

#### `entity-resolution.test.ts`
Tests pronoun and reference resolution:
- Pronoun mapping ("it", "there", "they", etc.)
- Entity type detection
- Ambiguity handling
- Context-based resolution

### 2. Integration Tests (`tests/integration/`)

#### `context-retention.spec.ts`
End-to-end testing of the complete context flow:
- Pronoun resolution in real conversations
- Location/event reference handling
- Multi-turn conversation context
- Mixed artifact + chat scenarios
- Guest vs authenticated user sessions
- Edge case handling

### 3. Regression Tests (`tests/regression/`)

#### `context-bugs.spec.ts`
Validates that specific critical bugs remain fixed:
- History flattening prevention
- Artifact context inclusion
- Natural language entity extraction
- Pronoun resolution implementation
- System prompt context handling

### 4. Performance Tests (`tests/performance/`)

#### `context-management.spec.ts`
Ensures context management is efficient:
- Linear scaling with conversation size
- Entity extraction performance
- Pronoun resolution speed
- Memory usage efficiency
- Mixed content type handling

## Test Scenarios

### Pronoun Resolution Tests
1. **"it" Reference**
   - Input: "Create a React component", "Style it"
   - Expected: AI understands "it" refers to the component

2. **"there" Reference (Primary Issue)**
   - Input: "Tell me about Garland event", "What's there?"
   - Expected: AI understands "there" refers to Garland event

3. **"they" Reference**
   - Input: "Organize volunteers and vendors", "Contact them"
   - Expected: AI understands "they" refers to both groups

### Location/Event Tests
1. Event location references
2. Multi-event distinction
3. Venue and activity context

### Multi-turn Tests
1. Topic switching and return
2. Deep context chains (10+ turns)
3. Context compression preservation

### Mixed Artifact Tests
1. Artifact context references
2. Artifact + conversation mixing
3. Editing context preservation

## Test Execution

### Automated Test Runner

The `scripts/run-context-tests.js` script provides:
- Comprehensive test execution
- Detailed reporting
- Performance metrics
- Failure analysis
- JSON report generation

### Test Categories

| Category | Files | Description |
|----------|-------|-------------|
| Unit Tests | 3 | Core logic validation |
| Integration | 1 | End-to-end flow testing |
| Regression | 1 | Bug prevention |
| Performance | 1 | Scalability validation |

### Expected Results

#### Functional Metrics
- **Pronoun Resolution Rate**: > 95% correct
- **Entity Tracking Accuracy**: > 90% correct
- **Context Preservation**: > 98% important contexts
- **Artifact Context Integration**: 100% inclusion

#### Performance Metrics
- **Context Selection Time**: < 100ms
- **Entity Extraction Time**: < 50ms
- **Memory Usage**: Linear scaling
- **Response Time**: No significant degradation

## Test Data

### Test Conversation Scenarios

The test data includes realistic conversation scenarios:
- **Pronoun Resolution Tests**: Christmas event planning
- **Location Tests**: Garland Community Center references
- **Multi-turn Tests**: Complex conversation flows
- **Edge Cases**: Ambiguous and contradictory references

### Entity Sets

Test data includes various entity types:
- Event Entities: ["Christmas", "Garland", "Community Center"]
- Code Entities: ["calculateTotal", "EventPlanner", "TodoList"]
- Natural Language Entities: ["volunteers", "decorations", "parking"]

## Continuous Integration

### Recommended CI Setup

```yaml
# .github/workflows/context-tests.yml
name: Context Retention Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  context-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Unit Tests
      run: deno test supabase/functions/_shared/context-*.test.ts --allow-all
    - name: Run Integration Tests
      run: node scripts/run-context-tests.js
```

### Quality Gates

- **Test Coverage**: > 90% line coverage
- **Pass Rate**: 100% required for production
- **Performance**: All performance targets met
- **Regression**: Zero regressions allowed

## Troubleshooting

### Common Issues

1. **Test Data Missing**
   - Run: Ensure all test files exist
   - Check: `tests/test-data/context-test-conversations.json`

2. **Permission Errors**
   - Run: `deno test --allow-all`
   - Note: Test runner needs network access for integration tests

3. **Performance Failures**
   - Check: System resources during testing
   - Monitor: Memory usage and CPU time

4. **Integration Test Failures**
   - Verify: Supabase services running
   - Check: Environment variables configured

### Debug Mode

For detailed debugging:
```bash
deno test --allow-all --trace-event --log-level debug
```

## Reporting

### JSON Report

The test runner generates a detailed JSON report:
```json
{
  "timestamp": "2025-12-09T00:00:00.000Z",
  "summary": {
    "totalTests": 100,
    "passed": 95,
    "failed": 5,
    "passRate": "95.0%"
  },
  "categories": {
    "Unit Tests": { "passed": 30, "failed": 0 },
    "Integration Tests": { "passed": 25, "failed": 2 },
    "Regression Tests": { "passed": 20, "failed": 1 },
    "Performance Tests": { "passed": 20, "failed": 2 }
  },
  "failures": [/* detailed failure information */]
}
```

### Visual Reports

For enhanced reporting:
- Generate HTML reports with test visualization
- Create trend analysis for performance metrics
- Build CI/CD dashboards for test quality monitoring

## Contributing

### Adding New Tests

1. **Unit Tests**: Add to appropriate `_shared/` file
2. **Integration Tests**: Add to `tests/integration/`
3. **Regression Tests**: Add to `tests/regression/`
4. **Performance Tests**: Add to `tests/performance/`

### Test Data

1. Add new conversation scenarios to `tests/test-data/`
2. Update entity sets for new test cases
3. Document expected outcomes clearly

### Test Guidelines

- Follow existing naming conventions
- Include clear test descriptions
- Add both positive and negative test cases
- Document edge cases thoroughly
- Ensure tests are deterministic

## Future Enhancements

### Planned Improvements

1. **AI-Powered Test Generation**
   - Generate test conversations from real user interactions
   - Create edge case scenarios automatically
   - Improve test coverage with AI assistance

2. **Enhanced Performance Monitoring**
   - Real-time performance dashboards
   - Automated performance regression detection
   - Memory leak identification

3. **Cross-Browser Testing**
   - Validate context retention across browsers
   - Test mobile-specific context scenarios
   - Ensure consistent behavior across devices

4. **Load Testing**
   - High-concurrency context handling
   - Stress testing with multiple simultaneous users
   - Database performance under load

## Conclusion

This comprehensive testing strategy ensures that the context retention functionality works correctly and remains robust as the system evolves. By focusing on the specific issue of pronoun resolution while also testing broader context management, we can deliver a reliable chat experience that maintains conversation context effectively.

The multi-layered approach combines unit testing for component validation, integration testing for end-to-end flows, performance testing for scalability, and regression testing for long-term reliability. This ensures that context retention fixes work correctly and continue to work as the system grows.