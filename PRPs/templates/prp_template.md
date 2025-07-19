# Product Requirements Prompt (PRP): [FEATURE_NAME]

## 🎯 Product Requirement

### What We're Building
[Clear description of the feature/functionality]

### Why It Matters
[Business/technical justification]

### Success Criteria
[Measurable outcomes that indicate success]

## 📚 Context & Research

### Referenced Documentation
- **ADK Documentation**: [Specific URLs and sections]
- **Library Docs**: [API references with URLs]
- **Code Examples**: [Links to examples in codebase]
- **External Resources**: [Blog posts, GitHub examples]

### Codebase Patterns
```python
# Example from existing code showing pattern to follow
# File: path/to/example.py
```

### Project Conventions Discovered
- **Import Style**: [How imports are organized]
- **Error Handling**: [Project's error patterns]
- **Testing Approach**: [How tests are structured]
- **File Organization**: [Module structure]

## 🏗️ Implementation Strategy

### Architecture Overview
```
[Directory structure and component relationships]
```

### Core Components
1. **Component A**: [Description and responsibility]
2. **Component B**: [Description and responsibility]
3. **Integration Layer**: [How they connect]

### Implementation Chunks (MANDATORY ITERATIVE APPROACH)

#### Chunk 1: [Feature Name] - Foundation
**Size**: ~100-200 lines
**Features**: 
- Feature 1.1: [Specific functionality]
- Feature 1.2: [Specific functionality]

**Implementation**:
```python
# Pseudocode showing approach
```

**Validation**:
```bash
# Local test
make test
python main.py

# Deploy to dev
gcloud run deploy vana-dev --source .

# Success criteria for this chunk
```

#### Chunk 2: [Feature Name] - Core Logic
**Size**: ~150-250 lines
**Features**:
- Feature 2.1: [Specific functionality]
- Feature 2.2: [Specific functionality]

**Dependencies**: Requires Chunk 1 complete and tested in dev

**Implementation**:
```python
# Pseudocode showing approach
```

**Validation**:
```bash
# Same validation pattern for each chunk
```

[Continue with more chunks as needed...]

## 🧪 Validation Gates

### Per-Chunk Validation (REQUIRED FOR EACH CHUNK)
```bash
# 1. Code Quality
make lint
make typecheck

# 2. Unit Tests
make test

# 3. Local Run
python main.py

# 4. Dev Deployment
gcloud run deploy vana-dev --source .

# 5. Dev Testing
# [Specific test commands for dev environment]
```

### Final Integration Validation
```bash
# Run after all chunks complete
make test
make security
# Full integration test suite
```

## ⚠️ Gotchas & Anti-Patterns

### Known Issues
- **Issue 1**: [Description and workaround]
- **Issue 2**: [Library quirk or version issue]

### Anti-Patterns to Avoid
- **DON'T**: Implement entire phases at once
- **DON'T**: Skip dev testing between chunks
- **DON'T**: Use patterns not in ADK documentation
- **DO**: Follow existing project patterns
- **DO**: Test each chunk thoroughly

## 📊 Implementation Tracking

### Chunk Status Checklist
- [ ] Chunk 1: Foundation - Local tested
- [ ] Chunk 1: Foundation - Dev deployed
- [ ] Chunk 1: Foundation - Dev validated
- [ ] Chunk 2: Core Logic - Local tested
- [ ] Chunk 2: Core Logic - Dev deployed
- [ ] Chunk 2: Core Logic - Dev validated
[Continue for all chunks...]

### Final Checklist
- [ ] All chunks implemented and tested
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] ADK compliance verified

## 🎯 Confidence Score
**PRP Completeness**: [X/10]

**Scoring Criteria**:
- Context completeness (examples, docs, patterns)
- Implementation clarity (pseudocode, chunks)
- Validation comprehensiveness
- Anti-pattern awareness
- ADK compliance

## 📝 Notes for Executor
[Any special instructions or context for the AI executing this PRP]