# ADK Compliance Implementation Plan

**Created**: 2025-01-14  
**Status**: In Progress  
**Owner**: Development Team  
**Tracking**: Update checkboxes as tasks are completed. DO NOT modify the plan structure.

## Summary
This plan addresses critical deviations from Google ADK best practices in the VANA codebase. Implementation will reduce code complexity by ~70%, improve reliability, and ensure future ADK compatibility.

**Key Discovery**: `agent_tool` IS available in ADK 1.1.1 via `from google.adk.tools.agent_tool import AgentTool`

## Critical Implementation Notes
- **DO NOT MODIFY** the plan structure or requirements
- **DO NOT SKIP** phases - they have dependencies
- **CHECK OFF** items as completed
- **ADD NOTES** in the Notes section only
- **USE** feature flags for gradual rollout

---

## Phase 1: Fix Agent-as-Tool Pattern (Week 1)
**Impact**: High | **Risk**: Medium | **Code Reduction**: ~2,000 lines

### Pre-requisites
- [x] Create feature branch: `git checkout -b feature/adk-compliance-phase-1`
- [x] Set up feature flag: `USE_OFFICIAL_AGENT_TOOL=false` in `.env`
- [ ] Run baseline metrics: `python scripts/collect_baseline_metrics.py > metrics/baseline.json`
- [ ] Document current agent tool usage in `docs/current-agent-tools.md`

### Implementation Tasks

#### 1.1 Update Imports and Dependencies
- [ ] Add import to `lib/_tools/agent_tools.py`: `from google.adk.tools.agent_tool import AgentTool as ADKAgentTool`
- [x] Verify import works: `python -c "from google.adk.tools.agent_tool import AgentTool; print('Success')"`
- [x] Update pyproject.toml if needed (current: google-adk ^1.1.1)

#### 1.2 Remove Custom Implementations
- [x] Delete file: `lib/tools/agent_as_tool.py` (390 lines)
- [x] Remove custom `AgentTool` class from `lib/_tools/agent_tools.py`
- [x] Remove `AgentToolWrapper` class
- [x] Remove `AgentToolRegistry` class
- [x] Remove `agent_tool_registry` global instance

#### 1.3 Create New Implementation
- [x] Add to `lib/_tools/agent_tools.py`:
```python
def create_specialist_agent_tool(specialist_agent, name=None, description=None):
    """Create an ADK AgentTool from a specialist agent."""
    from google.adk.tools.agent_tool import AgentTool
    return AgentTool(agent=specialist_agent)
```

#### 1.4 Update Specialist Tool Creation
- [x] Update `agents/vana/enhanced_orchestrator.py`
  - [x] Remove old import: `from lib.tools.agent_as_tool import create_specialist_tools`
  - [x] Add new import: `from lib._tools.agent_tools import create_specialist_tools`
  - [x] Replace tool creation pattern
- [x] Update `agents/vana/team_original.py` (no changes needed)
- [x] Update `agents/specialists/agent_tools.py` (no changes needed)
- [x] Update any other files using `create_specialist_tools`

#### 1.5 Testing
- [x] Run unit tests: `pytest tests/unit/tools/test_agent_tools_adk_compliant.py -v`
- [x] Run integration tests: (created new test file)
- [ ] Performance benchmark: `python scripts/benchmark_agent_tools.py --before-after`
- [x] Verify no references to old implementation: `! grep -r "AgentToolWrapper" lib/ agents/`

#### 1.6 Feature Flag Testing
- [x] Test with flag OFF (legacy behavior)
- [x] Test with flag ON (new ADK behavior)
- [x] Verify fallback works correctly

### Success Criteria
- [x] All agent-tool imports use official ADK
- [x] No custom async execution layers remain
- [x] All specialist tool tests pass
- [ ] Performance metrics show <100ms overhead
- [x] Feature flag controls behavior correctly

### Phase 1 Completion
- [x] Code review completed
- [ ] PR approved and merged
- [ ] Documentation updated
- [ ] Team notified of completion

---

## Phase 2: Remove Custom Coordination Tools (Week 2)
**Impact**: High | **Risk**: Low | **Code Reduction**: ~500 lines

### Pre-requisites
- [ ] Phase 1 completed and stable
- [ ] Create feature branch: `git checkout -b feature/adk-compliance-phase-2`
- [ ] Document current coordination patterns

### Implementation Tasks

#### 2.1 Remove Custom Coordination Functions
- [ ] In `lib/_tools/adk_tools.py`:
  - [ ] Remove `coordinate_task` function
  - [ ] Remove `delegate_to_agent` function
  - [ ] Remove related FunctionTool wrappers
- [ ] In `lib/_tools/__init__.py`:
  - [ ] Remove exports for `adk_coordinate_task`
  - [ ] Remove exports for `adk_delegate_to_agent`

#### 2.2 Update Agent Configurations
- [ ] Update all files in `agents/vana/`:
  - [ ] `team.py` - remove coordination tools from tools list
  - [ ] `team_original.py` - remove coordination tools
  - [ ] `team_minimal.py` - remove coordination tools
  - [ ] `team_simple.py` - remove coordination tools
  - [ ] `enhanced_team.py` - remove coordination tools
- [ ] Update all files in `agents/workflows/`:
  - [ ] Remove coordination tool usage
  - [ ] Replace with `sub_agents` pattern where needed

#### 2.3 Update Instructions
- [ ] Remove references to coordination tools in agent instructions
- [ ] Update to use `transfer_to_agent` built-in function
- [ ] Simplify routing logic

#### 2.4 Testing
- [ ] Run tests: `pytest tests/integration/test_agent_delegation.py -v`
- [ ] Verify no coordination tool references: `! grep -r "coordinate_task\|delegate_to_agent" lib/ agents/`
- [ ] Test multi-agent workflows still function

### Success Criteria
- [ ] No references to coordinate_task or delegate_to_agent
- [ ] All agents use standard ADK delegation patterns
- [ ] Integration tests pass for multi-agent workflows
- [ ] No performance degradation

### Phase 2 Completion
- [ ] Code review completed
- [ ] PR approved and merged
- [ ] Documentation updated

---

## Phase 3: Simplify Agent Instructions (Week 3)
**Impact**: Medium | **Risk**: Low | **Complexity Reduction**: 80%

### Pre-requisites
- [ ] Create feature branch: `git checkout -b feature/adk-compliance-phase-3`
- [ ] Document current instruction lengths

### Implementation Tasks

#### 3.1 Refactor VANA Instructions
- [ ] Update `agents/vana/team.py`:
  - [ ] Current lines: _____ (measure first)
  - [ ] Reduce to <50 lines
  - [ ] Focus on interface role only
- [ ] Update `agents/vana/team_original.py`:
  - [ ] Current lines: 300+
  - [ ] Reduce to <50 lines
  - [ ] Remove complex decision trees

#### 3.2 Simplify Specialist Instructions
- [ ] `agents/specialists/architecture_specialist.py` - reduce to <50 lines
- [ ] `agents/specialists/security_specialist.py` - reduce to <50 lines
- [ ] `agents/specialists/data_science_specialist.py` - reduce to <50 lines
- [ ] `agents/specialists/devops_specialist.py` - reduce to <50 lines
- [ ] `agents/specialists/qa_specialist.py` - reduce to <50 lines
- [ ] `agents/specialists/ui_specialist.py` - reduce to <50 lines

#### 3.3 Simplify Orchestrator Instructions
- [ ] `agents/vana/enhanced_orchestrator.py` - focus on routing only
- [ ] Remove redundant examples
- [ ] Remove complex conditional logic

#### 3.4 Testing
- [ ] A/B test simplified instructions
- [ ] Verify user experience consistency
- [ ] Run conversation quality tests

### Success Criteria
- [ ] No agent instruction exceeds 50 lines
- [ ] All instructions focus on single responsibility
- [ ] User experience remains consistent
- [ ] Response quality maintained or improved

### Phase 3 Completion
- [ ] Code review completed
- [ ] PR approved and merged
- [ ] Documentation updated

---

## Phase 4: Clean Up Transfer Mechanisms (Week 4)
**Impact**: Medium | **Risk**: Medium | **Code Reduction**: ~1,000 lines

### Pre-requisites
- [ ] Phases 1 & 2 completed
- [ ] Create feature branch: `git checkout -b feature/adk-compliance-phase-4`
- [ ] Profile current orchestrator performance

### Implementation Tasks

#### 4.1 Simplify Enhanced Orchestrator
- [ ] In `agents/vana/enhanced_orchestrator.py`:
  - [ ] Remove custom caching implementation
  - [ ] Remove LRU cache imports and usage
  - [ ] Remove metrics collection layers
  - [ ] Remove complex routing scoring
  - [ ] Keep only basic routing logic
  - [ ] Ensure <200 lines total

#### 4.2 Remove Orchestrator Metrics
- [ ] Delete file: `lib/_shared_libraries/orchestrator_metrics.py`
- [ ] Remove metric imports from orchestrator files
- [ ] Remove metric collection calls
- [ ] Remove performance tracking code

#### 4.3 Simplify Routing
- [ ] Replace scoring algorithms with simple pattern matching
- [ ] Remove multi-criteria routing
- [ ] Use direct specialist mapping

#### 4.4 Testing
- [ ] Performance tests: routing <50ms
- [ ] Verify routing accuracy maintained
- [ ] Load test simplified orchestrator

### Success Criteria
- [ ] Orchestrator under 200 lines total
- [ ] No custom caching implementations
- [ ] Routing decisions in <50ms
- [ ] All routing tests pass

### Phase 4 Completion
- [ ] Code review completed
- [ ] PR approved and merged
- [ ] Performance report generated

---

## Phase 5: Standardize State Management (Week 5)
**Impact**: Low | **Risk**: Low | **Maintainability**: High

### Pre-requisites
- [ ] Phases 1, 2, and 4 completed
- [ ] Create feature branch: `git checkout -b feature/adk-compliance-phase-5`
- [ ] Document current state management patterns

### Implementation Tasks

#### 5.1 Remove Workflow Checkpoints
- [ ] Update `agents/workflows/sequential_workflow_manager.py`:
  - [ ] Remove checkpoint save/restore logic
  - [ ] Remove checkpoint imports
  - [ ] Use ADK session state
- [ ] Update `agents/workflows/parallel_workflow_manager.py`
- [ ] Update `agents/workflows/loop_workflow_manager.py`
- [ ] Remove checkpoint-related utilities

#### 5.2 Convert to ADK Session State
- [ ] Replace all `checkpoint_manager.save_state()` with `context.session.state.update()`
- [ ] Replace all `checkpoint_manager.load_state()` with `context.session.state.get()`
- [ ] Remove custom state serialization
- [ ] Remove state versioning code

#### 5.3 Remove Progress Tracking Overlays
- [ ] Remove custom progress tracking
- [ ] Use ADK event system for progress
- [ ] Remove progress visualization code

#### 5.4 Testing
- [ ] Verify state persistence works
- [ ] Test workflow recovery
- [ ] Verify no state loss during transitions

### Success Criteria
- [ ] No custom state management code
- [ ] All state in ADK session
- [ ] Workflow tests pass
- [ ] State migration completed

### Phase 5 Completion
- [ ] Code review completed
- [ ] PR approved and merged
- [ ] Final metrics collected

---

## Testing Strategy

### Continuous Testing (All Phases)
- [ ] Unit tests after each file modification: `pytest -m unit`
- [ ] Linting after changes: `flake8 agents/ lib/`
- [ ] Type checking: `mypy agents/ lib/ --strict`

### Phase-End Testing
- [ ] Phase 1: Integration tests + Performance benchmark
- [ ] Phase 2: Multi-agent workflow tests
- [ ] Phase 3: Conversation quality tests
- [ ] Phase 4: Performance tests + Load tests
- [ ] Phase 5: State persistence tests

### Final Validation
- [ ] Full test suite: `pytest -v`
- [ ] Performance benchmarks: All targets met
- [ ] Code coverage: >90%
- [ ] ADK compliance check: `python scripts/validate_adk_compliance.py --strict`

---

## Rollback Procedures

### Feature Flags
```bash
# In .env file
USE_OFFICIAL_AGENT_TOOL=false  # Phase 1 rollback
USE_SIMPLE_ORCHESTRATOR=false  # Phase 4 rollback
USE_ADK_STATE_ONLY=false      # Phase 5 rollback
```

### Emergency Rollback Script
```bash
./scripts/emergency_rollback.sh [phase_number]
```

### Rollback Checklist
- [ ] Revert feature flags
- [ ] Deploy previous version
- [ ] Verify system stability
- [ ] Document rollback reason
- [ ] Plan remediation

---

## Progress Tracking

### Week 1 Status
- [ ] Phase 1 started
- [ ] Phase 1 completed
- Issues encountered: _____
- Actual code reduction: _____

### Week 2 Status
- [ ] Phase 2 started
- [ ] Phase 2 completed
- Issues encountered: _____
- Actual code reduction: _____

### Week 3 Status
- [ ] Phase 3 started
- [ ] Phase 3 completed
- Issues encountered: _____
- Complexity reduction: _____%

### Week 4 Status
- [ ] Phase 4 started
- [ ] Phase 4 completed
- Issues encountered: _____
- Performance improvement: _____%

### Week 5 Status
- [ ] Phase 5 started
- [ ] Phase 5 completed
- Issues encountered: _____
- Total code reduction: _____

---

## Final Validation

### Metrics Achieved
- [ ] Total lines removed: _____ (target: 4,000)
- [ ] Complexity reduction: _____% (target: 70%)
- [ ] Performance improvement: _____x (target: 3x)
- [ ] ADK compliance: _____% (target: 100%)

### Documentation Updates
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] Architecture docs updated
- [ ] API docs regenerated

### Team Communication
- [ ] Implementation complete announcement
- [ ] Lessons learned documented
- [ ] Knowledge transfer sessions held
- [ ] Success metrics shared

---

## Notes Section
*Add implementation notes here. Do not modify the plan above.*

### Implementation Notes:
- 2025-01-14: Phase 1 started
- Successfully verified ADK AgentTool is available in google.adk.tools.agent_tool
- Removed lib/tools/agent_as_tool.py (390 lines)
- Replaced custom AgentTool implementation with ADK-compliant version
- Created feature flag USE_OFFICIAL_AGENT_TOOL for gradual rollout
- All tests passing with both legacy and ADK modes

### Issues Encountered:
- 

### Decisions Made:
- 

### Lessons Learned:
- 

---

**Remember**: This plan is immutable. Only check off completed items and add notes in the Notes section.