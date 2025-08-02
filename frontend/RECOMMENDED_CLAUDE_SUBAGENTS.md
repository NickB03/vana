# Recommended Claude Code Subagents for Vana Frontend Development

## Core Development Agents

### 1. **adk-multi-agent-engineer** ✅ (Already Available)
**Purpose**: ADK integration and multi-agent system architecture
**Use Cases**:
- Designing ADK service layer
- Implementing agent communication patterns
- Troubleshooting ADK-specific issues
- Optimizing agent workflow integration

### 2. **frontend-api-specialist** ✅ (Already Available)
**Purpose**: React development and API integration
**Use Cases**:
- React component architecture
- SSE/WebSocket implementation
- Performance optimization
- State management patterns

## Recommended Additional Agents

### 3. **spec-requirements** → **spec-design** → **spec-tasks**
**Purpose**: Structured specification workflow
**Use Cases**:
- Creating detailed component specifications
- Designing state management architecture
- Planning test strategies
- Breaking down implementation into tasks

### 4. **spec-test**
**Purpose**: Comprehensive test planning and implementation
**Use Cases**:
- Writing test specifications
- Creating E2E test scenarios
- Implementing integration tests
- Test coverage analysis

### 5. **deep-research-synthesizer**
**Purpose**: Research and analysis
**Use Cases**:
- Researching SSE best practices
- Analyzing React performance patterns
- Investigating ADK integration approaches
- Competitive analysis of similar UIs

### 6. **github-docs-architect**
**Purpose**: Documentation creation
**Use Cases**:
- Writing comprehensive README
- Creating API documentation
- Developing contributor guidelines
- Building architecture decision records (ADRs)

## Workflow Integration

### Phase 1: Planning & Design
1. **deep-research-synthesizer**: Research best practices
2. **spec-requirements**: Define requirements
3. **spec-design**: Create architecture design
4. **spec-judge**: Validate design decisions

### Phase 2: Implementation
1. **adk-multi-agent-engineer**: ADK integration
2. **frontend-api-specialist**: React implementation
3. **spec-tasks**: Break down into tasks
4. **spec-impl**: Code implementation

### Phase 3: Testing & Documentation
1. **spec-test**: Create test suite
2. **github-docs-architect**: Write documentation
3. **spec-judge**: Quality assessment

### Phase 4: Optimization
1. **frontend-api-specialist**: Performance tuning
2. **adk-multi-agent-engineer**: Agent optimization
3. **deep-research-synthesizer**: Performance research

## Agent Collaboration Patterns

### For Complex Features
```
spec-requirements → spec-design → spec-judge → spec-tasks → 
[frontend-api-specialist + adk-multi-agent-engineer] → spec-test
```

### For Bug Fixes
```
frontend-api-specialist (diagnosis) → spec-impl (fix) → spec-test (verify)
```

### For Performance Issues
```
deep-research-synthesizer → frontend-api-specialist → spec-impl
```

### For Documentation
```
github-docs-architect → spec-judge (review) → spec-impl (updates)
```

## Best Practices

### 1. **Sequential Workflow**
- Always start with requirements/research
- Design before implementation
- Test after implementation
- Document throughout

### 2. **Parallel Execution**
- Run research while designing
- Implement UI and ADK integration in parallel
- Write tests alongside implementation

### 3. **Quality Gates**
- Use spec-judge at design phase
- Validate with spec-test before merge
- Review with github-docs-architect for clarity

### 4. **Specialized Usage**
- Complex ADK issues → adk-multi-agent-engineer
- React patterns → frontend-api-specialist
- Unknown best practices → deep-research-synthesizer
- Test coverage → spec-test

## Implementation Strategy

### Week 1: Foundation
- **Primary**: frontend-api-specialist, adk-multi-agent-engineer
- **Support**: spec-requirements, spec-design

### Week 2: Core Features
- **Primary**: spec-impl, frontend-api-specialist
- **Support**: spec-tasks, adk-multi-agent-engineer

### Week 3: Advanced Features
- **Primary**: frontend-api-specialist, spec-impl
- **Support**: spec-test, deep-research-synthesizer

### Week 4: Polish
- **Primary**: spec-test, github-docs-architect
- **Support**: spec-judge, frontend-api-specialist

## Success Metrics

- **Code Quality**: spec-judge approval on all major components
- **Test Coverage**: spec-test validates > 80% coverage
- **Documentation**: github-docs-architect signs off
- **Performance**: frontend-api-specialist confirms targets met
- **ADK Integration**: adk-multi-agent-engineer validates patterns

This agent team provides comprehensive coverage for all aspects of the frontend rebuild, ensuring high quality, proper architecture, and seamless ADK integration.