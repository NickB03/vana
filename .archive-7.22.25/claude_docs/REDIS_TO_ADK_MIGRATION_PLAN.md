# Redis to ADK State Migration Plan

**Date**: January 21, 2025  
**Priority**: CRITICAL BLOCKER  
**Estimated Time**: 4-6 hours  

## 🎯 Objective

Replace Redis-based state management with ADK-compliant session state patterns to unblock Phase 3.

## 📋 Implementation Chunks

### Chunk 0.1: Backup & Dependency Analysis (15 min)
**Goal**: Safely backup current state and analyze dependencies

```bash
# Actions:
1. Create backup of state_manager.py
2. Search for all Redis imports/usage
3. Document affected files
4. Create safety snapshot
```

**Validation**:
- ✓ Backup created in .archive/
- ✓ Dependency list documented
- ✓ No data loss risk

---

### Chunk 0.2: Remove Redis Dependency (15 min)
**Goal**: Clean Redis from project dependencies

```bash
# Actions:
1. Remove Redis from pyproject.toml
2. Run poetry lock --no-update
3. Run poetry install
4. Verify Redis is gone
```

**Validation**:
- ✓ poetry show | grep redis (should be empty)
- ✓ Project still installs correctly
- ✓ No import errors

---

### Chunk 0.3: Create ADK State Manager Interface (30 min)
**Goal**: Build minimal ADK-compliant state manager

```python
# Create lib/workflows/adk_state_manager.py
# Implement:
- __init__(session)
- get_workflow_status()
- set_workflow_status()
- Basic state operations
```

**Validation**:
- ✓ Unit test passes
- ✓ Can create instance
- ✓ Basic get/set works

---

### Chunk 0.4: Implement State Prefixes (30 min)
**Goal**: Add ADK state prefix support

```python
# Add to adk_state_manager.py:
- set_user_preference() with user: prefix
- set_app_config() with app: prefix  
- set_temp_data() with temp: prefix
- Proper prefix handling
```

**Validation**:
- ✓ Prefixes correctly applied
- ✓ State scoping works
- ✓ Unit tests pass

---

### Chunk 0.5: Archive Old State Manager (15 min)
**Goal**: Safely remove Redis implementation

```bash
# Actions:
1. Move state_manager.py to .archive/
2. Update any imports (if found)
3. Verify nothing breaks
```

**Validation**:
- ✓ No import errors
- ✓ make test passes
- ✓ API starts correctly

---

### Chunk 0.6: Integration Test with Session Service (30 min)
**Goal**: Test with real ADK session services

```python
# Create test script:
1. Test with InMemorySessionService
2. Verify state persistence within session
3. Test prefix behaviors
4. Document results
```

**Validation**:
- ✓ InMemory test passes
- ✓ State prefixes work correctly
- ✓ No regression in functionality

---

### Chunk 0.7: Local Deployment Test (30 min)
**Goal**: Verify everything works locally

```bash
# Actions:
1. python main.py
2. Test basic API endpoints
3. Verify agents still work
4. Check for any Redis errors
```

**Validation**:
- ✓ API starts without errors
- ✓ No Redis import failures
- ✓ Agents respond correctly

---

### Chunk 0.8: Cloud Run Dev Test (45 min)
**Goal**: Deploy and test in development environment

```bash
# Actions:
1. gcloud run deploy vana-dev --source .
2. Test key endpoints
3. Verify state operations
4. Monitor logs for errors
```

**Validation**:
- ✓ Deployment successful
- ✓ No Redis errors in logs
- ✓ State operations working

---

### Chunk 0.9: Documentation Update (30 min)
**Goal**: Update all documentation

```markdown
# Update:
1. CLAUDE.md - Remove Redis references
2. README.md - Update state info
3. ChromaDB - Store implementation
```

**Validation**:
- ✓ Docs accurate
- ✓ No Redis mentions
- ✓ ChromaDB updated

---

### Chunk 0.10: Final Verification (30 min)
**Goal**: Complete validation before Phase 3

```bash
# Checklist:
1. All tests passing
2. Dev environment stable
3. Documentation updated
4. Ready for Phase 3
```

**Validation**:
- ✓ Complete test suite passes
- ✓ 24hr stability in dev
- ✓ Team sign-off

## 🚦 Go/No-Go Criteria

Before proceeding to each chunk:
1. Previous chunk fully validated
2. No blocking errors
3. Tests passing

Before proceeding to Phase 3:
1. All Redis removed
2. ADK state working
3. Dev environment stable
4. Documentation complete

## ⏱️ Timeline

- **Total Estimate**: 4-6 hours
- **Chunks 0.1-0.5**: 2 hours (Core implementation)
- **Chunks 0.6-0.8**: 2 hours (Testing/deployment)
- **Chunks 0.9-0.10**: 1 hour (Documentation/verification)

## 🔄 Rollback Plan

If any chunk fails:
1. Revert to previous git commit
2. Restore Redis dependency if needed
3. Document failure reason
4. Adjust plan accordingly

## 📊 Success Metrics

1. **Zero Redis Dependencies**: `poetry show | grep redis` returns nothing
2. **All Tests Pass**: `make test` completes successfully
3. **Dev Deployment Stable**: 24 hours without state errors
4. **ADK Compliance**: Using proper session.state patterns

## 🎯 Next Phase Readiness

After completing all chunks:
- ✅ Redis completely removed
- ✅ ADK state patterns implemented
- ✅ All tests passing
- ✅ Documentation updated
- ✅ Ready for Phase 3: MCP Integration

---

**Start Time**: _________________  
**End Time**: _________________  
**Actual Duration**: _________________  
**Issues Encountered**: _________________