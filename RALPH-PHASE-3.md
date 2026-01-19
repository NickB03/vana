# Ralph Loop Phase 3: Test, Validate & PR

Copy and paste this command into Claude Code:

```
/ralph-loop "
# Vanilla Sandpack Refactor - Phase 3 (Orchestrator Mode)

## Your Role
You are the ORCHESTRATOR. You do NOT execute tasks directly.
You read state, determine the next task, spawn a sub-agent to execute it, then update state.

## Prerequisites Check (First Iteration Only)
Verify in tracker that Phases 1.5, 2, 2.5 3, 4 are COMPLETE.
If not, output: <promise>BLOCKED</promise> with message 'Run previous phases first'

## Orchestration Loop (EVERY ITERATION)

### Step 1: Read State
Read docs/vanilla-sandpack-refactor-plan.md and extract:
- ITERATION_COUNT, NEXT_TASK, STUCK_COUNT
- Phase 5, 5.5, and 6 task lists

### Step 2: Increment Iteration
Update tracker: ITERATION_COUNT += 1, add Iteration Log row

### Step 3: Spawn Sub-Agent for NEXT_TASK
Use the Task tool:

Task tool call:
- subagent_type: 'general-purpose'
- description: '{NEXT_TASK short description}'
- prompt: See task-specific prompts below

### Step 4: Process Agent Result
- SUCCESS: Mark [x], set NEXT_TASK, reset STUCK_COUNT
- FAILED: Increment STUCK_COUNT, log failure

### Step 5: Check Completion
All Phase 5, 5.5, AND 6 tasks [x] → <promise>COMPLETE</promise>
STUCK_COUNT >= 5 → <promise>BLOCKED</promise>

---

## Sub-Agent Task Prompts

### 5.1.1: Artifact Generation E2E Test
---PROMPT START---
You are creating an E2E test for artifact generation.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Create supabase/functions/_shared/__tests__/artifact-generation-e2e.test.ts

REQUIREMENTS:
1. Test that AI generates valid React component from prompt
2. Test that generated code has required default export
3. Test that tool calling pipeline returns artifact successfully
4. Test that invalid syntax is handled gracefully
5. Use vitest for testing
6. Mock the AI response if needed for deterministic tests

REFERENCE: Look at existing test patterns in __tests__/ directories

VERIFICATION:
Run: npm run test -- artifact-generation-e2e
Expected: All tests pass

Git commit: 'test: add artifact generation E2E tests'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 5.1.2: Sandpack Rendering Tests
---PROMPT START---
You are creating component tests for SimpleArtifactRenderer.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Create src/components/__tests__/SimpleArtifactRenderer.test.tsx

REQUIREMENTS:
1. Test renders simple counter component successfully
2. Test displays Sandpack console errors to user
3. Test shows 'Ask AI to Fix' button when errors occur
4. Test loads whitelisted dependencies
5. Test handles package import errors gracefully
6. Use vitest and @testing-library/react

REFERENCE: Look at existing component test patterns

VERIFICATION:
Run: npm run test -- SimpleArtifactRenderer
Expected: All tests pass

Git commit: 'test: add SimpleArtifactRenderer component tests'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 5.1.3: Sample Artifact Fixtures
---PROMPT START---
You are creating automated tests for sample artifacts.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Create test fixtures and tests for 6 sample artifacts

REFERENCE: Extract samples from src/pages/SandpackTest.tsx

ARTIFACTS TO TEST:
1. Simple Counter (basic React hooks)
2. Todo List (state arrays)
3. Analytics Dashboard (Recharts integration)
4. Animated Card (Framer Motion)
5. Icon Gallery (Lucide icons)
6. Memory Game (complex state logic)

REQUIREMENTS:
1. Create src/test-fixtures/sample-artifacts.ts with code strings
2. Create test that renders each fixture
3. Each test: Render → Wait for compile → Assert no errors

VERIFICATION:
Run: npm run test -- sample-artifacts
Expected: All 6 artifacts render without errors

Git commit: 'test: add sample artifact rendering tests'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 5.1.4: Package Whitelist Tests
---PROMPT START---
You are creating tests for package whitelist enforcement.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Test that disallowed packages are rejected gracefully

REQUIREMENTS:
1. Test importing axios → clear error message
2. Test importing d3 → clear error message
3. Test importing shadcn → clear error message
4. Verify error messages guide users

VERIFICATION:
Run: npm run test -- whitelist
Expected: All tests pass

Git commit: 'test: add package whitelist enforcement tests'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 5.1.5: Error Handling Tests
---PROMPT START---
You are creating tests for error handling flows.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Test error capture and display

REQUIREMENTS:
1. Test syntax errors display in Sandpack console
2. Test 'Ask AI to Fix' callback triggers correctly
3. Test runtime errors captured and displayed
4. Test missing default export shows helpful error

VERIFICATION:
Run: npm run test -- error-handling
Expected: All tests pass

Git commit: 'test: add error handling flow tests'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 5.2: Manual Testing Matrix
---PROMPT START---
You are running the manual testing matrix.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Verify all artifact types render correctly

INSTRUCTIONS:
1. Start dev server: npm run dev
2. Use browser to test each artifact type:
   - React: counter, dashboard, animation
   - HTML: static page
   - SVG: vector graphic
   - Mermaid: flowchart
   - Markdown: document
   - Code: Python snippet
3. Document results in tracker

This task requires browser interaction - document what to test.

Return 'SUCCESS: Manual testing checklist created' or 'FAILED: {reason}'
---PROMPT END---

### 5.3: Integration Tests
---PROMPT START---
You are verifying integration tests pass.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Run and verify integration tests

INSTRUCTIONS:
1. Ensure supabase is running: supabase start
2. Run: npm run test:integration
3. If failures, investigate and fix
4. Update chat-endpoint-integration.test.ts if needed for new artifact flow

VERIFICATION:
Run: npm run test:integration
Expected: All tests pass

Git commit (if changes): 'test: update integration tests for vanilla Sandpack'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 5.4: Regression Tests
---PROMPT START---
You are verifying no regressions in existing functionality.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Verify non-artifact features still work

CHECKLIST:
1. Chat scrolling works
2. Virtualizer not broken
3. Message loading works
4. Auth flow works
5. All existing E2E tests pass

VERIFICATION:
Run: npm run test:e2e:headed
Expected: All E2E tests pass

Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 5.5: Coverage Check
---PROMPT START---
You are verifying test coverage meets requirements.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Ensure coverage >= 55%

INSTRUCTIONS:
1. Run: npm run test:coverage
2. Check 'All files' line for overall coverage
3. If below 55%, identify gaps and add tests

VERIFICATION:
Run: npm run test:coverage
Expected: Coverage >= 55%

Return 'SUCCESS: Coverage is X%' or 'FAILED: Coverage is X%, need Y% more'
---PROMPT END---

### 5.5.1: Pre-PR Checklist
---PROMPT START---
You are running the full pre-PR verification.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Run all verification commands

COMMANDS (all must pass):
1. npm run test
2. npm run test:integration
3. npm run build
4. npm run test:e2e:headed (or note if skipped)
5. npm run test:coverage (must show >= 55%)
6. npx tsc --noEmit

Document all results.

Return 'SUCCESS: All checks pass' or 'FAILED: {which check failed}'
---PROMPT END---

### 5.5.2: CI/CD Workflow Check
---PROMPT START---
You are verifying CI/CD workflows.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Confirm auto-deploy on merge

INSTRUCTIONS:
1. Read .github/workflows/deploy-edge-functions.yml
2. Verify it triggers on supabase/functions/** changes
3. Confirm no manual deployment steps needed
4. Document the deployment flow

Return 'SUCCESS: CI/CD will auto-deploy' or 'FAILED: {issue}'
---PROMPT END---

### 5.5.3: Rollback Plan
---PROMPT START---
You are documenting the rollback plan.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Document rollback procedure in tracker

ADD TO TRACKER:
## Rollback Plan
1. Merge point commit: {get from git log main}
2. Rollback command: git revert {merge-commit}
3. Create hotfix PR from revert
4. Emergency contact: {note to fill in}

Return 'SUCCESS: Rollback plan documented'
---PROMPT END---

### 6.1: Final Cleanup
---PROMPT START---
You are doing final code cleanup before PR.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Clean up any orphaned code

INSTRUCTIONS:
1. Search for orphaned imports of deleted files
2. Remove any unused artifact references
3. Clean up any TODO comments from this refactor
4. Run npm run build to verify

VERIFICATION:
Run: npm run build
Expected: Clean build with no warnings about missing imports

Git commit: 'chore: final cleanup for vanilla Sandpack refactor'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 6.2: Create PR
---PROMPT START---
You are creating the pull request.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Create PR with comprehensive description

PR TITLE: refactor: vanilla Sandpack artifact system (-13K lines)

PR BODY:
## Summary
Replaces ~15,000 lines of artifact complexity with minimal vanilla Sandpack implementation.

## Changes
- Deleted: artifact-rules/ (15 files, 261KB)
- Deleted: bundle-artifact, generate-artifact-fix endpoints
- Deleted: artifact-executor, artifact-validator, bundler utils
- Created: SimpleArtifactRenderer (vanilla Sandpack)
- Created: artifact-tool-v2 (~50 lines, replaces 1,300)
- Created: system-prompt-v2 (~200 lines, replaces 400)

## Test Coverage
- Artifact generation E2E tests (NEW)
- Sandpack rendering tests (NEW)
- 6 sample artifacts automated (NEW)
- All integration tests pass
- Coverage: X% (>= 55% required)

## Verification Checklist
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E critical paths pass
- [ ] Production build succeeds
- [ ] Test coverage >= 55%

Obsoletes PRs: #538, #540

COMMAND: gh pr create --title 'refactor: vanilla Sandpack artifact system' --body '{body above}'

Return 'SUCCESS: PR created at {URL}' or 'FAILED: {reason}'
---PROMPT END---

---

## Task Lists

### Phase 5: Test & Validate
- [ ] 5.1.1: Artifact generation E2E test
- [ ] 5.1.2: Sandpack rendering tests
- [ ] 5.1.3: Sample artifact fixtures
- [ ] 5.1.4: Package whitelist tests
- [ ] 5.1.5: Error handling tests
- [ ] 5.2: Manual testing matrix
- [ ] 5.3: Integration tests
- [ ] 5.4: Regression tests
- [ ] 5.5: Coverage check

### Phase 5.5: CI/CD Prep
- [ ] 5.5.1: Pre-PR checklist
- [ ] 5.5.2: CI/CD workflow check
- [ ] 5.5.3: Rollback plan

### Phase 6: PR Creation
- [ ] 6.1: Final cleanup
- [ ] 6.2: Create PR

## Completion
When all tasks [x] AND PR created:
<promise>COMPLETE</promise>
" --max-iterations 15 --completion-promise "COMPLETE"
```

## Sub-Agent Benefits for Testing Phase

The testing phase especially benefits from fresh contexts:
- Each test file gets full 200k to understand what it's testing
- No accumulated context from deletion/creation phases
- Agent can read test patterns fresh without prior assumptions
