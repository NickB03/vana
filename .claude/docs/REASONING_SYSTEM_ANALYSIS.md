# Reasoning System Deep Analysis

**Author**: Claude Code (Ultrathink Analysis)
**Date**: 2025-12-05
**Status**: Comprehensive technical audit

---

## Executive Summary

The reasoning system has evolved through multiple iterations, resulting in **significant complexity, duplicate code, and unclear responsibilities**. This document provides a complete map of the system, identifies problems, and recommends fixes.

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| Duplicate Code Patterns | 6 | HIGH |
| Dead/Deprecated Code | 4 files | MEDIUM |
| Inconsistent Phase Systems | 3 different definitions | HIGH |
| Missing Error Handling | 2 gaps | MEDIUM |
| Type Mismatches | 2 | LOW |

---

## System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            USER SENDS MESSAGE                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    useChatMessages.tsx (Frontend Hook)                       │
│  • Detects artifact request pattern                                          │
│  • Calls /generate-artifact with stream=true                                 │
│  • Manages phase-based ticker (9 phases defined locally)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              generate-artifact/index.ts (Edge Function)                      │
│  • Calls GLM-4.6 with thinking mode enabled                                  │
│  • Uses processGLMStream() to handle SSE                                     │
│  • Parses reasoning incrementally via parseReasoningIncrementally()          │
│  • Emits SSE events: reasoning_step, thinking_update, content_chunk, etc.    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
┌─────────────────────────────┐    ┌─────────────────────────────────────────┐
│    glm-client.ts            │    │    glm-reasoning-parser.ts               │
│  • callGLMWithRetryTracking │    │  • parseGLMReasoningToStructured()       │
│  • processGLMStream()       │    │  • parseReasoningIncrementally()          │
│  • extractTextAndReasoning  │    │  • 6 phases defined (PHASE_CONFIG)        │
│  • Handles reasoning_content│    │  • detectThinkingPhase()                  │
│    and content chunks       │    │  • extractSections() - section detection  │
└─────────────────────────────┘    └─────────────────────────────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────┐
                     │   SSE Events to Frontend       │
                     │  • reasoning_step              │
                     │  • thinking_update             │
                     │  • reasoning_complete          │
                     │  • content_chunk               │
                     │  • artifact_complete           │
                     └────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    useChatMessages.tsx (Event Handling)                      │
│  • Accumulates streamingReasoningSteps                                       │
│  • Uses local detectPhase() - 9 phases (DIFFERENT from backend!)             │
│  • Updates reasoningStatus for ticker pill                                   │
│  • Calls onDelta() with progress updates                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ReasoningDisplay.tsx (UI Component)                       │
│  • Receives: reasoningSteps, streamingReasoningText, reasoningStatus         │
│  • Uses extractStatusText() from reasoningTextExtractor.ts                   │
│  • Timer via useReasoningTimer() hook                                        │
│  • Sanitizes content with DOMPurify                                          │
│  • Claude-style pill with expand/collapse                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Inventory

### Core Files (Active)

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `_shared/glm-client.ts` | GLM API client with streaming | 647 | ✅ Active |
| `_shared/glm-reasoning-parser.ts` | Raw text → structured reasoning | 930 | ✅ Active |
| `generate-artifact/index.ts` | Artifact generation with SSE | ~500 | ✅ Active |
| `src/hooks/useChatMessages.tsx` | Frontend SSE handling | ~900 | ✅ Active |
| `src/components/ReasoningDisplay.tsx` | UI component | 499 | ✅ Active |
| `src/types/reasoning.ts` | Zod schemas & types | 161 | ✅ Active |
| `src/utils/reasoningTextExtractor.ts` | Status extraction | ~1200 | ✅ Active |
| `src/hooks/useReasoningTimer.ts` | Timer hook | ~50 | ✅ Active |

### Deprecated/Dead Files

| File | Purpose | Status | Recommendation |
|------|---------|--------|----------------|
| `_shared/reasoning-generator.ts` | OpenRouter-based reasoning | ⚠️ DEPRECATED | **DELETE** - superseded by GLM thinking mode |
| `_shared/reasoning-summarizer.ts` | GLM-4.5-AirX summarization | ⚠️ UNUSED | **DELETE** - superseded by phase-based ticker |
| `generate-reasoning/index.ts` | Fast parallel reasoning endpoint | ⚠️ DEPRECATED | **DELETE** - now integrated in generate-artifact |
| `src/components/ui/reasoning.tsx` | Compound component primitives | ⚠️ RARELY USED | **REVIEW** - may be dead code |

---

## Problem #1: Duplicate Phase Definitions (CRITICAL)

### The Problem

Phase detection logic exists in **THREE different places** with **DIFFERENT definitions**:

#### Location A: `glm-reasoning-parser.ts` (Backend)
```typescript
// Lines 504-535: 6 phases
const PHASE_CONFIG: Record<ThinkingPhase, PhaseConfig> = {
  starting:     { minChars: 0,   displayMessage: 'Thinking...' },
  analyzing:    { minChars: 50,  displayMessage: 'Analyzing the request...' },
  planning:     { minChars: 200, displayMessage: 'Planning the implementation...' },
  implementing: { minChars: 400, displayMessage: 'Building the solution...' },
  styling:      { minChars: 600, displayMessage: 'Applying styling...' },
  finalizing:   { minChars: 800, displayMessage: 'Finalizing the solution...' },
};
```

#### Location B: `useChatMessages.tsx` (Frontend)
```typescript
// Lines 18-52: 9 phases (MORE than backend!)
type ThinkingPhase =
  | 'starting'
  | 'analyzing'
  | 'planning'
  | 'structuring'     // ← NOT IN BACKEND
  | 'implementing'
  | 'adding_logic'    // ← NOT IN BACKEND
  | 'styling'
  | 'polishing'       // ← NOT IN BACKEND
  | 'finalizing';
```

#### Location C: `reasoningTextExtractor.ts` (Client utility)
```typescript
// Lines 993-1041: 6 phases (different thresholds!)
const PHASE_CONFIG = {
  starting:     { minChars: 0 },
  analyzing:    { minChars: 100 },   // ← Different from backend!
  planning:     { minChars: 300 },   // ← Different from backend!
  implementing: { minChars: 500 },   // ← Different from backend!
  styling:      { minChars: 800 },   // ← Different from backend!
  finalizing:   { minChars: 1200 },  // ← Different from backend!
};
```

### Impact

- Frontend expects 9 phases but backend only sends 6
- Phase transitions happen at different character thresholds
- User sees inconsistent progress messages
- "structuring", "adding_logic", "polishing" phases never trigger from backend

### Fix

**Create a single source of truth** in a shared config:

```typescript
// src/config/reasoning-phases.ts (frontend)
// supabase/functions/_shared/reasoning-phases.ts (backend, symlinked)
export const REASONING_PHASES = {
  starting:     { minChars: 0,    message: 'Thinking...' },
  analyzing:    { minChars: 50,   message: 'Analyzing the request...' },
  planning:     { minChars: 200,  message: 'Planning the approach...' },
  implementing: { minChars: 400,  message: 'Building the solution...' },
  styling:      { minChars: 600,  message: 'Applying styles...' },
  finalizing:   { minChars: 800,  message: 'Wrapping up...' },
} as const;
```

---

## Problem #2: Timer Implementation Scattered

### The Problem

Timer logic exists in **THREE places**:

1. **useReasoningTimer.ts** (hook)
   - Returns formatted string ("2s", "1m 23s")
   - Resets when `isActive` becomes false

2. **ReasoningDisplay.tsx** (component state)
   - Stores `finalElapsedTime` to persist after streaming
   - Uses `lastElapsedTimeRef` as fallback

3. **ChatInterface.tsx** (parent)
   - Stores `lastMessageElapsedTime`
   - Passes via `parentElapsedTime` prop

### Impact

- Timer can desync when components remount
- Complex coordination required between 3 locations
- Brittle: any refactor risks breaking timer

### Fix

Consolidate to single timer context:

```typescript
// src/contexts/ReasoningTimerContext.tsx
export function ReasoningTimerProvider({ children }) {
  const [timers, setTimers] = useState<Map<string, number>>(); // messageId → elapsed
  // ... single source of truth for all timers
}
```

---

## Problem #3: Validation Logic Split

### The Problem

Validation happens in **multiple places** with **slightly different rules**:

| Location | Type | XSS Patterns | Length Checks |
|----------|------|--------------|---------------|
| `src/types/reasoning.ts` | Zod + manual | 6 patterns | Via Zod schema |
| `_shared/reasoning-generator.ts` | Manual | 6 patterns (same) | Manual checks |
| `useChatMessages.tsx` line 596-610 | Inline check | None | phase, title, items |
| `ReasoningDisplay.tsx` line 103-104 | parseReasoningSteps() | Via Zod | Via Zod |

### Impact

- Same XSS patterns duplicated (drift risk)
- Different validation depths at different points
- Confusion about which validation is authoritative

### Fix

Use Zod schema as **single source of truth**, import in both frontend and backend:

```typescript
// Shared validation (copy to both frontend and backend)
import { StructuredReasoningSchema } from './reasoning-types';

function validateReasoning(data: unknown) {
  return StructuredReasoningSchema.safeParse(data);
}
```

---

## Problem #4: Unused Props & Dead Paths

### ReasoningDisplay Receives Unused Data

```typescript
interface ReasoningDisplayProps {
  reasoning?: string | null;           // ✅ Used (legacy fallback)
  reasoningSteps?: StructuredReasoning; // ✅ Used (primary)
  streamingReasoningText?: string;     // ⚠️ RARELY USED (only if no steps)
  reasoningStatus?: string;            // ✅ Used (ticker label)
  // ...
}
```

The `streamingReasoningText` prop is **accumulated but rarely displayed** because:
1. Backend now sends structured `reasoning_step` events
2. Frontend prefers `reasoningSteps` over raw text
3. Raw text fallback path exists but almost never triggers

### Fix

- Document the fallback hierarchy clearly
- Consider removing `streamingReasoningText` if truly unused
- Or, rename to `fallbackReasoningText` for clarity

---

## Problem #5: Legacy Code Still Referenced

### reasoning-summarizer.ts

```typescript
// Uses MODELS.GLM_4_AIRX which doesn't exist in config.ts!
import { MODELS } from "./config.ts";

const response = await callGeminiFlash(
  // ...
  { model: MODELS.GLM_4_AIRX }  // ← This model constant doesn't exist!
);
```

This file:
- References a non-existent model
- Is never imported anywhere
- Was replaced by phase-based ticker system

### generate-reasoning endpoint

Referenced in documentation but deprecated:
- `CLAUDE.md` mentions it as "deprecated, now integrated in generate-artifact"
- `config.toml` still has entry: `[functions.generate-reasoning]`
- May still be deployable but should be removed

---

## Problem #6: Inconsistent Error Handling

### Missing Error Tracking

Several locations catch errors but only log to console:

```typescript
// glm-reasoning-parser.ts line 115
} catch (error) {
  console.error('[GLM Parser] Parsing failed, using fallback:', error);
  return createFallbackReasoning(trimmed);
}

// reasoning.ts line 86
// TODO: Log to monitoring service (Sentry, DataDog, etc.)
```

### No Error Boundaries for Structured Reasoning

If Zod parsing fails mid-stream, the entire reasoning display can break.
`ReasoningErrorBoundary` exists but only catches render errors, not parsing errors.

---

## Problem #7: Content-Length Based Phase Detection

### The Problem

Phase transitions are based on **character count thresholds**:

```typescript
if (contentLength > 2000 && currentPhase === 'implementing') {
  newPhase = 'styling';
}
```

This is fragile because:
- Small artifacts may never reach styling phase
- Large artifacts may reach finalizing too early
- No relationship to actual content semantics

### Better Approach

Use **event-driven phase transitions** from backend:

```typescript
// Backend sends explicit phase events
await sendEvent("phase_transition", {
  phase: 'styling',
  reason: 'CSS classes detected in output'
});
```

---

## Dead Code Inventory

### Files to DELETE

```
supabase/functions/_shared/reasoning-summarizer.ts    # Uses non-existent model
supabase/functions/_shared/reasoning-generator.ts     # Superseded by GLM thinking
supabase/functions/generate-reasoning/                # Entire directory (deprecated)
```

### Files to REVIEW

```
src/components/ui/reasoning.tsx                       # Compound components, rarely used
src/utils/reasoningTextExtractor.ts                   # 1200+ lines, partially used
```

---

## Recommended Actions

### Immediate (P0)

1. **Unify phase definitions** into single shared config
2. **Delete deprecated files**: reasoning-summarizer.ts, reasoning-generator.ts, generate-reasoning/
3. **Add error tracking** to parsing failures (Sentry integration)

### Short-term (P1)

4. **Consolidate timer logic** into single context provider
5. **Document fallback hierarchy** for ReasoningDisplay props
6. **Remove config.toml entry** for generate-reasoning
7. **Update documentation** (CLAUDE.md, README) to reflect current architecture

### Medium-term (P2)

8. **Simplify reasoningTextExtractor.ts** - 1200 lines is excessive
9. **Consider removing** streamingReasoningText if truly unused
10. **Add integration tests** for ReasoningDisplay + useChatMessages coordination
11. **Implement semantic phase detection** instead of character-count based

---

## Appendix A: SSE Event Types

| Event | Source | Data Shape | Used By |
|-------|--------|-----------|---------|
| `reasoning_step` | generate-artifact | `{ step: ReasoningStep, stepIndex, currentThinking }` | useChatMessages |
| `thinking_update` | generate-artifact | `{ chunk, progress }` | useChatMessages |
| `reasoning_chunk` | generate-artifact (legacy) | `{ chunk }` | useChatMessages |
| `reasoning_complete` | generate-artifact | `{ reasoning, reasoningSteps, stepCount }` | useChatMessages |
| `content_chunk` | generate-artifact | `{ chunk }` | useChatMessages |
| `artifact_complete` | generate-artifact | `{ artifactCode, reasoning, reasoningSteps }` | useChatMessages |
| `error` | generate-artifact | `{ error, requestId }` | useChatMessages |

---

## Appendix B: Type Definitions

### StructuredReasoning (Zod schema)

```typescript
const StructuredReasoningSchema = z.object({
  steps: z.array(z.object({
    phase: z.enum(['research', 'analysis', 'solution', 'custom']),
    title: z.string().min(1).max(500),
    icon: z.enum(['search', 'lightbulb', 'target', 'sparkles']).optional(),
    items: z.array(z.string().min(1).max(2000)).min(1).max(20),
    timestamp: z.number().optional(),
  })).min(1).max(10),
  summary: z.string().max(1000).optional(),
});
```

### StreamProgress

```typescript
interface StreamProgress {
  stage: GenerationStage;
  message: string;
  artifactDetected: boolean;
  percentage: number;
  reasoningSteps?: StructuredReasoning;
  streamingReasoningText?: string;
  reasoningStatus?: string;
  searchResults?: WebSearchResults;
}
```

---

## Appendix C: Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| glm-reasoning-parser.ts | glm-reasoning-parser.test.ts | ✅ |
| reasoning-generator.ts | reasoning-generator.test.ts | ⚠️ (for deprecated code) |
| ReasoningDisplay.tsx | ReasoningDisplay.test.tsx, ReasoningDisplayGLM.test.tsx, etc. | ✅ |
| reasoning.ts (types) | reasoning.test.ts | ✅ |
| reasoningTextExtractor.ts | reasoningTextExtractor.test.ts | ✅ |
| useReasoningTimer.ts | useReasoningTimer.test.ts | ✅ |

---

## Conclusion

The reasoning system works but has accumulated significant technical debt:

1. **Duplicate code** makes maintenance difficult
2. **Inconsistent phase definitions** cause UX confusion
3. **Dead code** wastes cognitive overhead
4. **Missing error tracking** hides production issues

Prioritize **unifying phase definitions** and **deleting deprecated code** for immediate impact.
