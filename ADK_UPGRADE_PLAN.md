# Google ADK Upgrade Plan: 1.8.0 → 1.17.0

**Date**: October 25, 2025
**Status**: Ready for Execution
**Risk Level**: LOW-MEDIUM

---

## Executive Summary

Vana is currently running **Google ADK 1.8.0** (released September 2025). The latest stable version is **ADK 1.17.0** (released October 22, 2025), representing **9 minor releases** with significant feature additions and bug fixes.

**Recommendation**: ✅ **PROCEED WITH UPGRADE**

**Rationale**:
- No major breaking changes affecting Vana's current implementation
- Significant performance improvements (parallel tool calling, context caching)
- Enhanced stability and bug fixes
- New features unlock optimization opportunities
- Low risk due to backward compatibility focus

---

## Version Analysis

### Current State
```toml
[project.dependencies]
google-adk~=1.8.0  # Current version
```

### Target State
```toml
[project.dependencies]
google-adk~=1.17.0  # Target version
```

### Version History (1.8.0 → 1.17.0)
- 1.17.0 (Oct 22, 2025) - Service registry, session rewind, parallel agent improvements
- 1.16.0 (Oct 8, 2025) - Context compaction, pause/resume support
- 1.15.1 (Sep 26, 2025) - Agent Engine deployment fixes
- 1.15.0 (Sep 24, 2025) - Context caching, static instructions
- 1.14.1 (Sep 12, 2025) - A2A logging fixes
- 1.14.0 (Sep 10, 2025) - Tool confirmation, GKE executor, BigQuery enhancements
- 1.13.0 (Earlier) - Various improvements
- 1.12.x → 1.9.0 - Progressive enhancements

---

## Impact Analysis

### Files Requiring Changes

| File | Impact | Changes Required |
|------|--------|------------------|
| `/pyproject.toml` | ✅ Required | Update ADK version constraint |
| `/app/agent.py` | ⚠️ Review | Verify callback signatures |
| `/app/integration/adk_init.py` | ⚠️ Review | Verify service injection patterns |
| `/app/enhanced_callbacks.py` | ⚠️ Review | Verify callback implementations |
| All test files | ✅ Required | Run full test suite |

### Breaking Changes Assessment

#### 1. Callback System (v1.17.0)
**Change**: Migration from `invocation_context` to `callback_context`
**Status**: ✅ **NO ACTION NEEDED**
**Reason**: Vana already uses `CallbackContext` correctly
```python
# Current implementation (CORRECT):
def collect_research_sources_callback(callback_context: CallbackContext) -> None:
    session = callback_context._invocation_context.session
```

#### 2. MCP Toolset Naming (v1.17.0)
**Change**: `MCPToolset` → `McpToolset`
**Status**: ✅ **NO ACTION NEEDED**
**Reason**: Vana doesn't use MCP toolsets

#### 3. Service Registry (v1.17.0)
**Change**: New generic service registration system
**Status**: ⚠️ **VERIFY CUSTOM SERVICE**
**Reason**: Vana uses custom `VerifiedSessionService` - needs compatibility check
**Action**: Test session service initialization and verification logic

#### 4. Context Caching (v1.15.0)
**Change**: New `context_cache_config` and static instructions
**Status**: 🚀 **OPTIMIZATION OPPORTUNITY**
**Reason**: Can reduce API costs and improve response times
**Action**: Consider implementing in future optimization phase

#### 5. Pause/Resume (v1.16.0)
**Change**: Session pause/resume capabilities
**Status**: 🚀 **FEATURE OPPORTUNITY**
**Reason**: Could enhance user experience for long-running research
**Action**: Future enhancement, not required for upgrade

---

## Upgrade Steps

### Phase 1: Pre-Upgrade Validation ✅
- [x] Document current ADK version (1.8.0)
- [x] Analyze changelog for breaking changes
- [x] Identify affected files
- [x] Create rollback plan
- [x] Backup current state (git branch)

### Phase 2: Dependency Update
```bash
# Update ADK version
uv add "google-adk~=1.17.0"

# Verify installation
python -c "import google.adk; print(google.adk.__version__)"
```

### Phase 3: Code Review & Refactoring
1. **Verify Callback Implementations**
   - Review all callbacks in `/app/enhanced_callbacks.py`
   - Ensure `CallbackContext` usage is correct
   - Check for any deprecated patterns

2. **Verify Service Injection**
   - Test `VerifiedSessionService` initialization
   - Verify ADK web server integration
   - Check session persistence

3. **Review Agent Definitions**
   - No changes expected (backward compatible)
   - Verify all agent configurations still work

### Phase 4: Testing
```bash
# Run all backend tests
make test

# Run specific ADK integration tests
uv run pytest tests/integration/ -v

# Test ADK web UI
adk web agents/ --port 8080

# Test FastAPI backend
make dev-backend

# Test frontend integration
make dev-frontend
```

### Phase 5: Browser Verification
```bash
# Start all services
pm2 start ecosystem.config.js

# Use Chrome DevTools MCP to verify:
# 1. SSE streaming works
# 2. Agent network updates broadcast correctly
# 3. Research sources collected properly
# 4. Chat interface functions normally
```

### Phase 6: Production Deployment
- Deploy to staging environment first
- Monitor logs for deprecation warnings
- Run smoke tests
- Deploy to production if all tests pass

---

## Risk Assessment

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Callback signature mismatch | LOW | HIGH | Already using correct signatures |
| Custom session service breaks | LOW | HIGH | Comprehensive testing + rollback plan |
| SSE streaming issues | LOW | MEDIUM | Browser verification with Chrome DevTools |
| Performance regression | VERY LOW | MEDIUM | Benchmark before/after |
| Breaking changes in dependencies | LOW | HIGH | Lock file preserves working versions |

### Overall Risk: **LOW-MEDIUM**

**Confidence Level**: 85%
**Reason**:
- ADK maintains strong backward compatibility
- Vana's code already follows best practices
- No major architectural changes required
- Comprehensive testing plan in place

---

## Rollback Plan

### If Upgrade Fails

#### Option 1: Git Rollback (Recommended)
```bash
# Revert to current state
git checkout main
git branch -D feature/adk-upgrade

# Verify rollback
python -c "import google.adk; print(google.adk.__version__)"  # Should show 1.8.0
```

#### Option 2: Manual Rollback
```bash
# Downgrade ADK
uv add "google-adk~=1.8.0"

# Reinstall dependencies
uv sync

# Restart services
pm2 restart all
```

#### Option 3: Emergency Rollback (Production)
```bash
# Deploy previous Docker image
# OR restore from backup
# OR use blue-green deployment switch
```

### Rollback Triggers
- Tests fail after upgrade
- SSE streaming broken
- Session service errors
- Agent network communication fails
- Browser verification shows errors

---

## Optimization Opportunities (Post-Upgrade)

### 1. Context Caching (NEW in v1.15.0)
**Benefit**: Reduce API costs, faster response times
**Implementation**:
```python
from google.adk import App
from google.adk.context_cache import ContextCacheConfig

root_app = App(
    root_agent=dispatcher_agent,
    context_cache_config=ContextCacheConfig(
        static_instruction=genai_types.Content(
            parts=[genai_types.Part(text="System prompt here...")]
        ),
        ttl=3600,  # 1 hour cache
    )
)
```

### 2. Static Instructions (NEW in v1.15.0)
**Benefit**: Better caching, clearer agent definitions
**Implementation**: Move static system prompts to `static_instruction` parameter

### 3. Tool Confirmation Flow (NEW in v1.14.0)
**Benefit**: User control over sensitive operations
**Implementation**: Add confirmation for web searches or data operations

### 4. Session Rewind (NEW in v1.17.0)
**Benefit**: Time-travel debugging, user undo functionality
**Implementation**: Allow users to rewind research sessions

---

## Testing Checklist

### Backend Tests
- [ ] All unit tests pass (`make test-unit`)
- [ ] All integration tests pass (`make test-integration`)
- [ ] No deprecation warnings in logs
- [ ] Agent definitions load correctly
- [ ] Tools execute successfully

### ADK Integration Tests
- [ ] ADK web UI launches (`adk web agents/ --port 8080`)
- [ ] Agent network visible in UI
- [ ] Sessions persist correctly
- [ ] Custom `VerifiedSessionService` works
- [ ] Session verification prevents race conditions

### FastAPI Backend Tests
- [ ] Backend starts successfully (`make dev-backend`)
- [ ] Health check passes (`curl http://127.0.0.1:8000/health`)
- [ ] SSE endpoint responds (`POST /run_sse`)
- [ ] Session management works
- [ ] Authentication works (if enabled)

### Frontend Integration Tests
- [ ] Frontend starts successfully (`make dev-frontend`)
- [ ] Chat interface loads
- [ ] User can send messages
- [ ] SSE streaming displays in real-time
- [ ] Agent network updates appear
- [ ] Research sources collected
- [ ] Citations formatted correctly

### Browser Verification (Chrome DevTools MCP)
- [ ] Navigate to `http://localhost:3000`
- [ ] Send test query: "search for Python testing frameworks"
- [ ] Verify SSE connection: `list_network_requests({ resourceTypes: ["eventsource"] })`
- [ ] Check console: `list_console_messages()` (no errors)
- [ ] Verify quick search mode works
- [ ] Verify deep research mode works
- [ ] Test mode selection flow

---

## Success Criteria

✅ Upgrade is successful if:
1. All tests pass (backend + frontend)
2. No deprecation warnings
3. SSE streaming works in browser
4. Agent network updates broadcast correctly
5. Session service functions normally
6. Performance equal or better than 1.8.0
7. No console errors in browser
8. User experience unchanged or improved

---

## Timeline

- **Phase 1 (Pre-Upgrade)**: ✅ Complete (30 minutes)
- **Phase 2 (Dependency Update)**: 5 minutes
- **Phase 3 (Code Review)**: 15 minutes
- **Phase 4 (Testing)**: 30 minutes
- **Phase 5 (Browser Verification)**: 20 minutes
- **Phase 6 (Documentation)**: 10 minutes

**Total Estimated Time**: ~2 hours

---

## References

### Documentation
- [ADK Python GitHub](https://github.com/google/adk-python)
- [ADK Changelog](https://github.com/google/adk-python/blob/main/CHANGELOG.md)
- [ADK PyPI Page](https://pypi.org/project/google-adk/)
- Local ADK refs: `/docs/adk/refs/`

### Related Files
- `/pyproject.toml` - Dependency management
- `/app/agent.py` - Agent definitions
- `/app/integration/adk_init.py` - Custom ADK initialization
- `/app/enhanced_callbacks.py` - Callback implementations
- `/app/services/verified_session_service.py` - Custom session service

---

## Notes

### Why This Upgrade is Low Risk
1. **Backward Compatibility**: ADK team maintains strong backward compatibility
2. **Current Best Practices**: Vana already uses recommended patterns
3. **No Major Rewrites**: Agent definitions and tools work as-is
4. **Comprehensive Testing**: Multiple verification layers
5. **Easy Rollback**: Git branch + package downgrade available

### Why This Upgrade is Valuable
1. **Bug Fixes**: 9 releases worth of stability improvements
2. **Performance**: Context caching, parallel tool calling
3. **Features**: Session pause/resume, context compaction
4. **Future-Proofing**: Stay current with ADK ecosystem
5. **Optimization**: Unlock new performance opportunities

---

**Prepared By**: Google ADK Super Agent
**Approval Status**: Ready for Execution
**Next Action**: Begin Phase 2 (Dependency Update)
