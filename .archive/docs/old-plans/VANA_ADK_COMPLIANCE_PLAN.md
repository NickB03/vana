# VANA ADK Compliance Re-engineering Plan

**Created**: December 2024  
**Approval Required**: Nick must approve all custom implementations  
**Phase**: Addition to Phase 1 Enhancement Plan

## Executive Summary

This plan outlines the systematic re-engineering of all non-compliant agents in the VANA system to achieve 100% Google ADK compliance. Each agent will be updated individually following strict ADK standards.

### Key Decisions
- ❌ **Delete Code Execution Specialist** - Move to future roadmap
- ✅ **Update 9 agents** to full compliance
- 🎯 **Strict ADK patterns** - No custom implementations without approval

---

## Phase 1 ADK Compliance Tasks (Updated)

### 1. Remove Code Execution Specialist ❌
**Priority**: IMMEDIATE  
**Estimated Time**: 1 hour

**Tasks**:
1. Delete `/agents/specialists/code_execution_specialist.py`
2. Remove from enhanced orchestrator imports
3. Remove from unified tools registry
4. Update documentation to remove references
5. Clean up any test files
6. Add to future roadmap document

**Files to Update**:
- `agents/vana/enhanced_orchestrator.py` - Remove import and routing
- `lib/_tools/unified_tools.py` - Remove code execution tools
- `docs/VANA_AGENT_INVENTORY.md` - Remove entry
- `docs/VANA_ENHANCEMENT_PLAN.md` - Add to roadmap
- Any test files referencing code execution

---

### 2. VANA Chat Agent ⚠️ → ✅
**Priority**: HIGH  
**Estimated Time**: 2-3 hours  
**Approval Required**: Custom tool implementations

**Current Issues**:
- Custom tools not using FunctionTool wrapper
- Missing async patterns in some areas

**Tasks**:
1. Convert `chat_interface` tool to ADK pattern:
   ```python
   async def chat_interface(message: str, context: Dict, tool_context: ToolContext) -> str:
       # Implementation
   ```
2. Convert `session_management` tool to ADK pattern
3. Wrap all tools with FunctionTool
4. Update agent initialization to use wrapped tools
5. Test chat functionality

**Implementation Pattern**:
```python
from google.adk.tools import FunctionTool

# Convert tools to async functions returning strings
async def chat_interface(...) -> str:
    try:
        # Implementation
        return "Success: message processed"
    except Exception as e:
        return f"Error: {str(e)}"

# Wrap tools
tools = [
    FunctionTool(chat_interface, name="chat_interface"),
    FunctionTool(session_management, name="session_management")
]

# Update agent
vana_chat_agent = LlmAgent(
    name="vana_chat",
    model="gemini-2.0-flash",
    tools=tools
)
```

---

### 3. DevOps Specialist ⚠️ → ✅
**Priority**: MEDIUM  
**Estimated Time**: 2 hours

**Current Issues**:
- Some tools need async conversion
- Real config generation works but needs async

**Tasks**:
1. Convert all 6 tools to async:
   - `generate_ci_config`
   - `create_dockerfile`
   - `setup_kubernetes`
   - `configure_monitoring`
   - `optimize_deployment`
   - `manage_infrastructure`
2. Ensure all return strings (not dicts)
3. Add proper ToolContext usage
4. Update tests

**Example Conversion**:
```python
# Before
def generate_ci_config(platform: str, ...) -> Dict[str, Any]:
    # Implementation
    return {"status": "success", "config": config}

# After
async def generate_ci_config(
    platform: str, 
    ...,
    tool_context: ToolContext
) -> str:
    try:
        # Implementation
        return f"CI config generated:\n{config}"
    except Exception as e:
        return f"Error generating CI config: {str(e)}"
```

---

### 4. QA Specialist ⚠️ → ✅
**Priority**: MEDIUM  
**Estimated Time**: 3 hours  
**Approval Required**: Test execution integration

**Current Issues**:
- Some mock test generation
- Needs real test execution

**Tasks**:
1. Replace mock test generation with real patterns
2. Integrate with pytest/unittest for execution
3. Convert all tools to async
4. Add real coverage analysis
5. Implement test result parsing

**Custom Implementation Needs Approval**:
- Test runner integration
- Coverage tool integration
- Test framework detection

---

### 5. UI/UX Specialist ⚠️ → ✅
**Priority**: LOW  
**Estimated Time**: 4 hours  
**Approval Required**: Design tool integration

**Current Issues**:
- Mock UI generation
- Needs integration with design tools

**Tasks**:
1. Replace mock UI generation
2. Add real accessibility testing (axe-core)
3. Integrate with component libraries
4. Convert all tools to async
5. Add real CSS/styling analysis

**Custom Implementation Needs Approval**:
- Component library integration
- Design system integration
- Accessibility testing tools

---

### 6. Sequential Workflow Manager ⚠️ → ✅
**Priority**: HIGH  
**Estimated Time**: 2 hours

**Current Issues**:
- Needs async conversion
- State management improvements

**Tasks**:
1. Convert to async/await patterns
2. Update state management to use ToolContext
3. Improve error handling
4. Add timeout support
5. Update tests

---

### 7. Loop Workflow Manager ⚠️ → ✅
**Priority**: MEDIUM  
**Estimated Time**: 2 hours

**Current Issues**:
- Complex state management
- Needs async patterns

**Tasks**:
1. Simplify state management
2. Convert to async patterns
3. Add iteration limits
4. Improve condition evaluation
5. Add comprehensive logging

---

### 8. State-Driven Workflow Engine ⚠️ → ✅
**Priority**: LOW  
**Estimated Time**: 3 hours

**Current Issues**:
- Complex state logic
- Needs simplification

**Tasks**:
1. Refactor state machine logic
2. Convert to async patterns
3. Add state validation
4. Improve transition handling
5. Add state persistence

---

### 9. Project Development Workflow ❌ → ✅
**Priority**: LOW  
**Estimated Time**: 4 hours  
**Approval Required**: Project management integration

**Current Issues**:
- Old patterns throughout
- Mock implementations
- Needs complete refactor

**Tasks**:
1. Complete rewrite following ADK patterns
2. Remove all mock implementations
3. Add real project tracking
4. Integrate with project management tools
5. Add milestone tracking

**Custom Implementation Needs Approval**:
- Project management tool integration
- Milestone tracking system
- Resource allocation logic

---

## Implementation Schedule

### Week 1: Critical Updates
- Day 1: Remove Code Execution Specialist
- Day 2-3: Update VANA Chat Agent
- Day 4-5: Update Sequential Workflow Manager

### Week 2: Core Specialists
- Day 1-2: Update DevOps Specialist
- Day 3-4: Update QA Specialist
- Day 5: Update Loop Workflow Manager

### Week 3: Remaining Updates
- Day 1-2: Update UI/UX Specialist
- Day 3: Update State-Driven Workflow
- Day 4-5: Update Project Development Workflow

---

## ADK Compliance Checklist

For each agent update, ensure:

### ✅ Tool Requirements
- [ ] All tools are async functions
- [ ] All tools return strings (not dicts)
- [ ] All tools accept ToolContext parameter
- [ ] All tools wrapped with FunctionTool
- [ ] Error handling returns error strings

### ✅ Agent Requirements
- [ ] Uses LlmAgent from google.adk.agents
- [ ] Proper model specification
- [ ] Clear instruction/persona
- [ ] Tools passed as list
- [ ] No mock data or simulations

### ✅ Testing Requirements
- [ ] Unit tests for each tool
- [ ] Integration tests for agent
- [ ] Error case coverage
- [ ] Performance benchmarks
- [ ] Documentation updated

---

## Approval Process

### Custom Implementations Requiring Nick's Approval:
1. **Test Runner Integration** (QA Specialist)
2. **Design Tool Integration** (UI/UX Specialist)
3. **Project Management Integration** (Project Workflow)
4. **Any External API Integration**
5. **Any Non-Standard ADK Patterns**

### Approval Template
```markdown
## Custom Implementation Request

**Agent**: [Agent Name]
**Tool**: [Tool Name]
**Reason**: Why standard ADK patterns don't suffice
**Proposed Solution**: Detailed implementation plan
**Alternatives Considered**: Other options evaluated
**Impact**: How this affects ADK compliance
```

---

## Success Metrics

### Target: 100% ADK Compliance
- All agents use async patterns
- No mock data anywhere
- All tools return strings
- Proper error handling throughout
- Full test coverage

### Validation
- Run ADK compliance validator
- Performance benchmarks
- Integration tests pass
- Documentation complete

---

## Future Roadmap Items

### Code Execution (Removed from Phase 1)
- Secure sandbox implementation
- Multi-language support
- Resource limits
- Output streaming
- Error isolation

*To be implemented in Phase 4 after security review*

---

## Notes

1. Each agent should be updated in isolation
2. Run full test suite after each update
3. Document any deviations from standard patterns
4. Get approval before custom implementations
5. Keep backwards compatibility where possible

---

*This plan is part of Phase 1 VANA Enhancement Plan*  
*All custom implementations require Nick's approval*