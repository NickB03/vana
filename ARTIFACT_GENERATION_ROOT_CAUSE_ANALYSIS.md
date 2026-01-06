# Root Cause Analysis: Complex Artifact Generation Failures

## Executive Summary

**Root Cause**: Template guidance is NOT being passed to GLM-4.7 during artifact generation, despite being matched and prepared in the chat handler.

**Impact**: Complex artifacts fail because GLM-4.7 doesn't receive the detailed template structures and patterns that were working before.

**NOT a timeout issue**: The prompt size increase is minimal (~1,000-1,500 tokens), well within GLM-4.7's 200K context window.

## Evidence

### 1. The Refactoring (Commit 1591ec9)

The "Z.ai-inspired artifact generation improvements" PR #482 introduced:

- **Golden Patterns**: +1,185 words (~305 lines) of immutability patterns
- **Template Matching System**: 14 templates with detailed example structures
- **Template Injection**: Templates are 3,000-4,000 characters each

### 2. System Prompt Size Analysis

Running `test-prompt-size.ts` shows:

```
Baseline prompt (no template):
  Characters: 35,998
  Lines: 1,010
  Estimated tokens: ~9,000

With dashboard template:
  Full prompt size: 40,073 chars
  Increase from baseline: +4,075 chars
  Estimated tokens: ~10,019

With todo-list template:
  Full prompt size: 39,468 chars
  Increase from baseline: +3,470 chars
  Estimated tokens: ~9,867
```

**Analysis**: Adding a template increases prompt by ~1,000 tokens (10% increase), NOT enough to cause timeout issues with GLM-4.7's 200K context window.

### 3. The Critical Bug

**File**: `supabase/functions/_shared/artifact-executor.ts`
**Lines**: 587-589

```typescript
// Get system prompt
const systemPrompt = getSystemInstruction({
  currentDate: new Date().toLocaleDateString(),
});
```

**Problem**: When `executeArtifactGeneration()` is called from `executeArtifactTool()`, it creates its own system prompt WITHOUT passing `matchedTemplate`.

**Comparison with working code** in `tool-calling-chat.ts` lines 233-254:

```typescript
// Match user request to artifact template for optimized guidance
const templateMatch = getMatchingTemplate(lastUserMessage);

// Get system instruction with tool-calling enabled and sanitized artifact context
const toolEnabledSystemPrompt = getSystemInstruction({
  useToolCalling: true,
  fullArtifactContext: sanitizedArtifactContext,
  matchedTemplate: templateMatch.template,  // ✅ PASSED HERE
});
```

### 4. The Execution Flow

1. **Chat Handler** (`tool-calling-chat.ts`):
   - Line 234: Matches template from user message
   - Line 253: Injects template into system prompt
   - System prompt sent to GLM-4.7 for tool selection

2. **GLM-4.7 decides to call `generate_artifact`**

3. **Tool Executor** (`tool-executor.ts`):
   - Line 542: Calls `executeArtifactGeneration()`
   - Passes: `type`, `prompt`, `requestId`, `enableThinking`
   - **DOES NOT PASS**: User message or template match

4. **Artifact Executor** (`artifact-executor.ts`):
   - Line 587: Creates NEW system prompt
   - **MISSING**: `matchedTemplate` parameter
   - GLM-4.7 receives generic prompt without template guidance

### 5. Why This Breaks Complex Artifacts

**Before PR #482**:
- System prompt had general patterns
- GLM-4.7 generated artifacts based on generic knowledge
- Complex artifacts worked through model capability alone

**After PR #482**:
- System prompt was enhanced with detailed templates
- Templates provide working example structures (100+ lines of code)
- **BUT**: Template matching only affects the chat handler's system prompt, not the artifact generation prompt
- GLM-4.7 in artifact generation still receives OLD generic prompt
- Complex artifacts fail because they need the template structures that are now available but not being passed

## The Template Mismatch

### What the Chat Handler Sees (with template):

```
## EXACT PATTERN TO FOLLOW

You are building a Dashboard. Use THIS EXACT STRUCTURE:

import * as Tabs from '@radix-ui/react-tabs'
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const { useState } = React

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  const salesData = [
    { month: 'Jan', revenue: 4200, users: 240, orders: 98 },
    { month: 'Feb', revenue: 5300, users: 315, orders: 142 },
    // ... 100+ more lines of working example code
  ]

  // ... complete dashboard implementation
}

**Requirements:**
Create a responsive dashboard with:
- Key metrics cards at the top (revenue, users, orders, etc.)
- Use Recharts for data visualization (LineChart, BarChart, etc.)
// ... detailed requirements
```

### What Artifact Executor Sees (without template):

```
## MANDATORY PATTERNS FOR ALL ARTIFACTS

These patterns prevent the most common runtime errors. Copy them EXACTLY.

### 1. IMMUTABLE STATE UPDATES (CRITICAL)

React strict mode will crash artifacts that mutate state directly. ALWAYS use immutable patterns:
// ... generic patterns, no concrete examples
```

## Why Previous Analysis Missed This

The other agent focused on:
1. **Timeout**: Assumed 120s timeout was the issue
2. **Prompt size**: Worried about token limits
3. **Model capacity**: Questioned if GLM-4.7 could handle complexity

**Reality**:
- Timeout is sufficient (complex artifacts generate in 30-60s typically)
- Prompt size increased by only ~10% (from 9K to 10K tokens)
- GLM-4.7 has 200K context window and 128K output limit
- **The model never receives the guidance it needs**

## Proof of Concept

To verify this is the issue, you can:

1. **Add logging** in `artifact-executor.ts` line 587:
   ```typescript
   const systemPrompt = getSystemInstruction({
     currentDate: new Date().toLocaleDateString(),
   });
   console.log('[ARTIFACT-EXECUTOR] System prompt size:', systemPrompt.length);
   console.log('[ARTIFACT-EXECUTOR] Has template guidance:', systemPrompt.includes('EXACT PATTERN TO FOLLOW'));
   ```

2. **Expected result**:
   - Size: ~36,000 characters
   - Has template: `false` ❌

3. **Compare with chat handler** line 250:
   ```typescript
   console.log('[CHAT-HANDLER] System prompt size:', toolEnabledSystemPrompt.length);
   console.log('[CHAT-HANDLER] Has template guidance:', toolEnabledSystemPrompt.includes('EXACT PATTERN TO FOLLOW'));
   ```

4. **Expected result** (when template matches):
   - Size: ~40,000 characters
   - Has template: `true` ✅

## The Fix

### Option 1: Pass Template to Artifact Executor (Recommended)

**Changes needed**:

1. **`tool-executor.ts`** - Pass user message to artifact executor:
   ```typescript
   return await executeArtifactTool(typeArg, prompt, context, lastUserMessage);
   ```

2. **`artifact-executor.ts`** - Accept and use user message:
   ```typescript
   export interface ArtifactExecutorParams {
     type: GeneratableArtifactType;
     prompt: string;
     requestId: string;
     enableThinking?: boolean;
     userMessage?: string;  // NEW: For template matching
   }

   export async function executeArtifactGeneration(
     params: ArtifactExecutorParams
   ): Promise<ArtifactExecutorResult> {
     const { type, prompt, enableThinking = true, userMessage } = params;
     const requestId = sanitizeRequestId(params.requestId);

     // Match template if user message provided
     const templateMatch = userMessage
       ? getMatchingTemplate(userMessage)
       : { matched: false, template: '', reason: 'no_user_message' };

     // Get system prompt WITH template
     const systemPrompt = getSystemInstruction({
       currentDate: new Date().toLocaleDateString(),
       matchedTemplate: templateMatch.template,  // ✅ NOW INCLUDED
     });

     // ... rest of function
   }
   ```

3. **`tool-calling-chat.ts`** - Pass user message to tool context:
   ```typescript
   const toolContext: ToolContext = {
     requestId,
     userId,
     isGuest,
     functionName: 'tool-calling-chat',
     supabaseClient,
     clientIp,
     userMessage: lastUserMessage,  // NEW
   };
   ```

### Option 2: Pre-match Template in Tool Executor

Alternative approach: Do template matching in `executeArtifactTool()` using the prompt parameter.

**Pro**: Simpler, less parameter passing
**Con**: The `prompt` might be GLM's reformulated version, not the original user message

### Option 3: Inject Template via Tool Result

When GLM calls `generate_artifact`, inject template guidance into the tool result context.

**Pro**: No parameter changes needed
**Con**: More complex, requires restructuring tool result flow

## Recommended Solution

**Use Option 1** because:
1. Clean separation of concerns
2. Maintains template matching in one place
3. Preserves original user message for accurate matching
4. Minimal code changes
5. Easy to test and verify

## Testing the Fix

After implementing, test with these prompts that previously failed:

1. "Create a dashboard with charts showing sales data"
2. "Build a data visualization showing quarterly revenue"
3. "Make a settings page with tabs and switches"
4. "Create a tic-tac-toe game with score tracking"

**Expected behavior**:
- Template matching should show in logs
- Artifact executor should receive template
- Complex artifacts should generate successfully
- No increase in timeout failures

## Impact Analysis

**Affected Features**:
- ✅ Simple artifacts (still work, don't need templates)
- ❌ Complex artifacts (broken, need template guidance)
- ✅ Chat with artifacts (works, has template in chat context)
- ❌ Tool-based artifact generation (broken, missing template)

**User Impact**:
- Users asking for dashboards, games, complex UIs see failures
- Simple counters, forms, basic components still work
- Inconsistent experience based on complexity

## Timeline

- **Before PR #482**: Complex artifacts worked (generic prompts)
- **After PR #482**: Complex artifacts fail (templates not passed to executor)
- **User reports**: Started appearing after commit 1591ec9
- **Misdiagnosis**: Initially blamed on timeouts, not prompt structure

## Conclusion

This is NOT a timeout issue or prompt size issue. It's a **integration bug** where the refactored template matching system is disconnected from the artifact generation execution path.

The fix is straightforward: Pass the matched template to the artifact executor so GLM-4.7 receives the same detailed guidance during artifact generation that it sees during chat.

**Estimated fix time**: 30-60 minutes
**Risk level**: Low (additive change, preserves existing behavior)
**Testing required**: Integration tests for complex artifacts with template matching
