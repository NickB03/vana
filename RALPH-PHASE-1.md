# Ralph Loop Phase 1: Documentation Cleanup + Delete Complexity

Copy and paste this command into Claude Code:

```
/ralph-loop "
# Vanilla Sandpack Refactor - Phase 1 (Orchestrator Mode)

## Your Role
You are the ORCHESTRATOR. You do NOT execute tasks directly.
You read state, determine the next task, spawn a sub-agent to execute it, then update state.

## Orchestration Loop (EVERY ITERATION)

### Step 1: Read State
Read \`docs/vanilla-sandpack-refactor-plan.md\` and extract:
- ITERATION_COUNT
- NEXT_TASK
- STUCK_COUNT
- Phase 1.5 and Phase 2 task lists

### Step 2: Increment Iteration
Update the tracker file:
- ITERATION_COUNT += 1
- Add row to Iteration Log table

### Step 3: Spawn Sub-Agent for NEXT_TASK
Use the Task tool to delegate the actual work:

Task tool call:
- subagent_type: 'general-purpose'
- description: '{NEXT_TASK short description}'
- prompt: See task-specific prompts below

### Step 4: Process Agent Result
When agent returns:
- If SUCCESS: Mark task [x] in tracker, set NEXT_TASK to next unchecked item, reset STUCK_COUNT
- If FAILED: Increment STUCK_COUNT, keep same NEXT_TASK, log failure reason

### Step 5: Check Completion
If all Phase 1.5 AND Phase 2 tasks are [x]:
- Update Phase Status table
- Output: <promise>PHASE1_COMPLETE</promise>

If STUCK_COUNT >= 5:
- Output: <promise>BLOCKED</promise>

---

## Sub-Agent Task Prompts

### For Phase 1.5 Doc Updates
---PROMPT START---
You are completing a documentation cleanup task.
Branch: refactor/vanilla-sandpack-artifacts

TASK: {specific task from tracker}

INSTRUCTIONS:
1. Read the target file
2. Remove/update references to deleted artifact files:
   - artifact-executor.ts (DELETED)
   - template-matcher.ts (DELETED)
   - artifact-rules/ directory (DELETED)
   - artifact-validator.ts (DELETED)
   - bundle-artifact/ (DELETED)
3. Update to reference new vanilla Sandpack system
4. Save the file
5. Git commit with message: 'docs: {brief description}'

VERIFICATION:
Run: grep -E 'artifact-executor|template-matcher|artifact-rules' {filepath}
Expected: No matches

Return 'SUCCESS' if task complete, or 'FAILED: {reason}' if blocked.
---PROMPT END---

### For Phase 2 Deletions
---PROMPT START---
You are completing a file deletion task.
Branch: refactor/vanilla-sandpack-artifacts

TASK: {specific deletion from tracker}

INSTRUCTIONS:
1. Delete the specified file(s): {file paths}
2. Run: npm run build
3. If build fails with import errors:
   - Find files importing the deleted module
   - Remove or update those imports
   - Re-run npm run build
4. Git commit with message: 'refactor: delete {what was deleted}'

VERIFICATION:
Run: npm run build
Expected: Build succeeds

Return 'SUCCESS' if build passes, or 'FAILED: {reason}' if blocked.
---PROMPT END---

---

## Phase 1.5 Tasks (Documentation)
- [ ] 1.5.2.1: Update docs/TOOL_CALLING_SYSTEM.md
- [ ] 1.5.2.2: Update docs/ERROR_CODES.md
- [ ] 1.5.3.1: Update docs/TROUBLESHOOTING.md
- [ ] 1.5.3.2: Update docs/DEVELOPMENT_PATTERNS.md
- [ ] 1.5.3.3: Update docs/INDEX.md
- [ ] 1.5.3.4: Update docs/CONFIGURATION.md
- [ ] 1.5.3.5: Update docs/ARCHITECTURE_DIAGRAMS.md

## Phase 2 Tasks (Deletions)
- [ ] 2.1.1: Delete supabase/functions/_shared/artifact-rules/ (15 files)
- [ ] 2.1.2: Delete supabase/functions/bundle-artifact/
- [ ] 2.1.3: Delete supabase/functions/generate-artifact-fix/
- [ ] 2.1.4: Delete _shared/artifact-executor.ts
- [ ] 2.1.5: Delete _shared/artifact-validator.ts
- [ ] 2.1.6: Delete _shared/artifact-structure.ts
- [ ] 2.1.7: Delete _shared/bundle-cache.ts, bundle-metrics.ts
- [ ] 2.1.8: Delete _shared/prebuilt-bundles.ts, prebuilt-bundles.json
- [ ] 2.1.9: Delete _shared/system-prompt-inline.ts
- [ ] 2.2.1: Delete src/components/ArtifactRenderer.tsx
- [ ] 2.2.2: Delete src/components/BundledArtifactFrame.tsx
- [ ] 2.2.3: Delete src/utils/artifact*.ts, exportNormalizer.ts
- [ ] 2.3.1: Delete all artifact test files

## Completion
When all tasks [x] AND npm run build succeeds:
<promise>PHASE1_COMPLETE</promise>
" --max-iterations 25 --completion-promise "PHASE1_COMPLETE"
```

## How This Works

1. **Main session stays small** - Only reads tracker, spawns agents, updates state
2. **Each task gets fresh 200k** - Sub-agent reads only what it needs
3. **State persists in tracker file** - Both orchestrator and agents read/write it
4. **Failures are isolated** - One agent failing doesn't pollute orchestrator context

## Expected Behavior

```
Iteration 1: Read tracker → Spawn agent for "Update TOOL_CALLING_SYSTEM.md" → Agent completes → Update tracker
Iteration 2: Read tracker → Spawn agent for "Update ERROR_CODES.md" → Agent completes → Update tracker
...
Iteration N: All tasks complete → Output PHASE1_COMPLETE
```
