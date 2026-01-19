# Ralph Loop Phase 2: Build Foundation + Wire Into Chat

Copy and paste this command into Claude Code:

```
/ralph-loop "
# Vanilla Sandpack Refactor - Phase 2 (Orchestrator Mode)

## Your Role
You are the ORCHESTRATOR. You do NOT execute tasks directly.
You read state, determine the next task, spawn a sub-agent to execute it, then update state.

## Prerequisites Check (First Iteration Only)
Verify in tracker that Phase 1.5 = COMPLETE and Phase 2 = COMPLETE.
If not complete, output: <promise>BLOCKED</promise> with message 'Run RALPH-PHASE-1 first'

## Orchestration Loop (EVERY ITERATION)

### Step 1: Read State
Read docs/vanilla-sandpack-refactor-plan.md and extract:
- ITERATION_COUNT, NEXT_TASK, STUCK_COUNT
- Phase 3 and Phase 4 task lists

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
All Phase 3 AND Phase 4 tasks [x] → <promise>PHASE2_COMPLETE</promise>
STUCK_COUNT >= 5 → <promise>BLOCKED</promise>

---

## Sub-Agent Task Prompts

### 3.1: Create system-prompt-v2.ts
---PROMPT START---
You are creating a new system prompt file for the vanilla Sandpack artifact system.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Create supabase/functions/_shared/system-prompt-v2.ts (~200 lines)

REFERENCE: Read the existing system prompt patterns in the codebase.

REQUIREMENTS:
1. Export a function that returns the system prompt string
2. Include artifact format instructions:
   - Use <artifact type='application/vnd.ant.react' title='...'>
   - Require default export: export default function App()
   - Tailwind CSS only (no CSS files)
3. Package whitelist (ONLY these):
   - react, react-dom
   - recharts
   - framer-motion
   - lucide-react
   - @radix-ui/* (primitives only)
4. Explicit restrictions:
   - NO @/ imports (sandbox isolation)
   - NO external API calls
   - NO localStorage/sessionStorage
5. Keep it simple - ~200 lines max

VERIFICATION:
Run: npx tsc --noEmit
Expected: No TypeScript errors

Git commit: 'feat: add system-prompt-v2 for vanilla Sandpack'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 3.2: Create SimpleArtifactRenderer.tsx
---PROMPT START---
You are creating the new vanilla Sandpack artifact renderer.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Create src/components/SimpleArtifactRenderer.tsx (~150 lines)

REFERENCE: Read src/pages/SandpackTest.tsx for working Sandpack patterns.

REQUIREMENTS:
1. Use @codesandbox/sandpack-react
2. Props: { code: string; type: string; onError?: (error: string) => void }
3. For React artifacts (application/vnd.ant.react):
   - SandpackProvider with react template
   - Fixed dependencies: react, recharts, framer-motion, lucide-react
   - Tailwind via CDN in index.html
   - SandpackPreview for rendering
   - SandpackConsole for errors (collapsible)
4. For non-React types: passthrough to existing simple renderers
5. Error handling:
   - Capture Sandpack errors
   - Display 'Ask AI to Fix' button when errors occur
   - Call onError callback with error message
6. Styling: Match existing artifact panel aesthetics

VERIFICATION:
Run: npx tsc --noEmit
Expected: No TypeScript errors

Git commit: 'feat: add SimpleArtifactRenderer with vanilla Sandpack'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 3.3: Create artifact-tool-v2.ts
---PROMPT START---
You are creating the minimal artifact tool handler.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Create supabase/functions/_shared/artifact-tool-v2.ts (~50 lines)

REQUIREMENTS:
1. Export function to handle generate_artifact tool calls
2. Parse artifact from AI response (extract code between <artifact> tags)
3. NO code transformations (no autoFixArtifactCode)
4. NO validation layers (Sandpack will show errors naturally)
5. Return: { code: string; type: string; title: string }
6. Handle edge cases: missing tags, empty code

VERIFICATION:
Run: npx tsc --noEmit
Expected: No TypeScript errors

Git commit: 'feat: add artifact-tool-v2 (minimal handler)'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 3.4: Verify non-React renderers
---PROMPT START---
You are verifying that non-React artifact renderers still work.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Verify HTML, SVG, Mermaid, Markdown, Code renderers

INSTRUCTIONS:
1. Find existing renderer components for these types
2. Verify they are NOT deleted and still exported
3. Verify SimpleArtifactRenderer passes non-React types to them
4. If any are missing, document in tracker

VERIFICATION:
Run: npm run build
Expected: Build succeeds

Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 4.1: Update tool-calling-chat.ts
---PROMPT START---
You are wiring the new artifact tool into the chat handler.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Update supabase/functions/chat/handlers/tool-calling-chat.ts

INSTRUCTIONS:
1. Import artifact-tool-v2 instead of old artifact handlers
2. Update generate_artifact tool definition:
   - Keep same tool name and parameters
   - Use v2 handler for processing
3. Remove imports of deleted artifact files
4. Simplify tool response handling (no validation layer)

VERIFICATION:
Run: npm run build
Expected: Build succeeds with no import errors

Git commit: 'refactor: wire artifact-tool-v2 into chat handler'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 4.2: Update chat components
---PROMPT START---
You are updating chat components to use the new renderer.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Update chat components to use SimpleArtifactRenderer

INSTRUCTIONS:
1. Find where artifacts are rendered in chat (likely ChatMessage or ChatInterface)
2. Replace ArtifactRenderer with SimpleArtifactRenderer
3. Update imports
4. Keep artifact panel layout
5. Keep streaming support if present

VERIFICATION:
Run: npm run build
Expected: Build succeeds

Git commit: 'refactor: use SimpleArtifactRenderer in chat'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

### 4.3: Implement 'Ask AI to Fix' flow
---PROMPT START---
You are implementing the error recovery flow.
Branch: refactor/vanilla-sandpack-artifacts

TASK: Implement 'Ask AI to Fix' button functionality

INSTRUCTIONS:
1. In SimpleArtifactRenderer, the 'Ask AI to Fix' button should:
   - Capture the current error message
   - Capture the current code
   - Call a callback prop: onRequestFix({ error, code })
2. In the chat component:
   - Handle onRequestFix callback
   - Send new message to AI: 'Fix this artifact error: [error] Code: [code]'
   - This triggers normal chat flow which regenerates artifact

VERIFICATION:
Run: npm run build
Expected: Build succeeds

BROWSER TEST (do this manually after agent returns):
- Use Chrome extension to test at localhost:8080
- Create artifact that has an error
- Click 'Ask AI to Fix'
- Verify new message sent

Git commit: 'feat: implement Ask AI to Fix error flow'
Return 'SUCCESS' or 'FAILED: {reason}'
---PROMPT END---

---

## Phase 3 Tasks
- [ ] 3.1: Create system-prompt-v2.ts
- [ ] 3.2: Create SimpleArtifactRenderer.tsx
- [ ] 3.3: Create artifact-tool-v2.ts
- [ ] 3.4: Verify non-React renderers

## Phase 4 Tasks
- [ ] 4.1: Update tool-calling-chat.ts
- [ ] 4.2: Update chat components
- [ ] 4.3: Implement 'Ask AI to Fix' flow

## Completion
When all tasks [x] AND npm run build succeeds:
<promise>PHASE2_COMPLETE</promise>
" --max-iterations 25 --completion-promise "PHASE2_COMPLETE"
```

## Key Difference: Detailed Agent Prompts

Each sub-agent gets:
- **Specific file to create/modify**
- **Exact requirements** (not general guidance)
- **Reference files** to read for patterns
- **Verification command** to run
- **Expected commit message**

This gives each agent enough context to work independently with a fresh 200k window.
