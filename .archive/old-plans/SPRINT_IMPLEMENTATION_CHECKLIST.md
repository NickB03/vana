# Sprint Implementation Checklist

**MANDATORY**: Complete each section before proceeding to implementation.

## Phase 1: Analysis (BEFORE touching any code)

### 1. Read and Document Current State
- [ ] Read EVERY file mentioned in the plan completely
- [ ] Document current functionality in analysis notes
- [ ] Count actual lines in files to be modified
- [ ] Verify line counts match plan estimates (±20%)

### 2. Understand Existing Code
- [ ] List all classes/functions in files to be modified
- [ ] Identify which are being removed vs kept
- [ ] Document all current imports and exports
- [ ] Note any backward compatibility requirements

### 3. Validate Plan Instructions
- [ ] Re-read plan instructions word-by-word
- [ ] Highlight action verbs: "Add", "Remove", "Update", "Replace"
- [ ] Verify scope: If it says "Add import", that means ONE line
- [ ] Check for mismatches between plan and reality

## Phase 2: Planning (BEFORE implementation)

### 4. Create Change Specification
- [ ] Write exact diffs for each file
- [ ] Show before/after for each change
- [ ] Ensure changes match plan scope
- [ ] Calculate total lines added/removed

### 5. Backward Compatibility Check
- [ ] List all public APIs that must be preserved
- [ ] Plan feature flag implementation
- [ ] Ensure gradual rollout is possible
- [ ] Document migration path

### 6. Test Planning
- [ ] Identify existing tests that must pass
- [ ] Run tests BEFORE making changes
- [ ] Save baseline test results
- [ ] Plan new tests for new functionality

## Phase 3: Implementation

### 7. Incremental Changes
- [ ] Make ONE change at a time
- [ ] Run tests after EACH change
- [ ] Commit working state frequently
- [ ] Use feature flags for new code paths

### 8. Scope Verification
- [ ] Count lines changed vs plan estimate
- [ ] If exceeding plan by >50%, STOP and verify
- [ ] Ensure prerequisites are completed
- [ ] Don't skip "documentation" steps

### 9. Testing and Validation
- [ ] All existing tests still pass
- [ ] New tests for new functionality pass
- [ ] Feature flags work in both modes
- [ ] No unintended breaking changes

## Warning Signs to STOP Implementation

🛑 **STOP if any of these occur:**
- Deleting more code than specified in plan
- Rewriting files instead of updating them
- Breaking existing tests
- Changing files not mentioned in plan
- Line count changes exceed plan by >50%
- Skipping prerequisites to "save time"

## Sprint Principles

1. **Literal Interpretation**: Do EXACTLY what the plan says
2. **Preserve First**: Keep existing code unless explicitly told to remove
3. **Incremental Progress**: Small changes with validation
4. **Document Everything**: Analysis before implementation
5. **Test Continuously**: Verify nothing breaks at each step

## Example Interpretation Guide

| Plan Says | Do This | NOT This |
|-----------|---------|----------|
| "Add import X" | Add one import line | Rewrite the imports section |
| "Remove class Y" | Delete only class Y | Delete the entire file |
| "Update function Z" | Modify function Z only | Rewrite surrounding code |
| "Create new file" | Create exactly as specified | Add extra "helpful" features |

---

**Remember**: The plan is carefully designed with dependencies and risk management. Following it literally ensures success.