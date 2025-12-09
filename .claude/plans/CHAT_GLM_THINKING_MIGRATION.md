# Chat GLM-4.6 Thinking Mode Migration Plan

> **Status**: Planning
> **Created**: 2025-12-09
> **Goal**: Migrate chat to use GLM-4.6 with thinking mode, aligning with artifact generation architecture
> **Reference**: `.claude/plans/GLM_MIGRATION_PLAN.md` (archived, partially complete)

## Executive Summary

The chat function currently uses GLM-4.6 **without thinking mode** and generates reasoning via a **separate Gemini Flash Lite call**. This is inefficient and inconsistent with artifact generation, which uses GLM-4.6 **with thinking mode** and parses the native `reasoning_content`.

This migration will:
1. Enable `enableThinking: true` in the GLM chat router
2. Use `processGLMStream()` and `glm-reasoning-parser.ts` (same as artifacts)
3. Integrate `AICommentator` (GLM-4.5-Air) for semantic status updates
4. Remove the legacy Gemini reasoning call
5. Fix the `MODELS.GLM_4_AIR` typo bug

## Current State Analysis

### Architecture Comparison

| Component | Artifacts (Target) | Chat (Current) |
|-----------|-------------------|----------------|
| Model | GLM-4.6 | GLM-4.6 |
| Thinking Mode | ✅ `enableThinking: true` | ❌ `enableThinking: false` |
| Reasoning Source | GLM `reasoning_content` | Separate Gemini call |
| Parser | `glm-reasoning-parser.ts` | `reasoning-generator.ts` |
| Status Updates | `AICommentator` (GLM-4.5-Air) | `reasoning-summarizer.ts` (broken) |
| Streaming | `processGLMStream()` | Custom transform stream |

### GLM_MIGRATION_PLAN.md Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Cleanup | ✅ Complete | No Kimi/K2T references |
| Phase 2: GLM Chat Client | ✅ Complete | `glm-client.ts` exists |
| Phase 3: Model Router | ✅ Complete | `glm-chat-router.ts` with circuit breaker |
| Phase 4: Function Updates | ⚠️ **Partial** | Chat uses GLM but thinking disabled |
| Phase 5: Simplify Keys | ❌ Not started | Still multiple keys |

### Identified Bugs

| Bug | File | Severity |
|-----|------|----------|
| `MODELS.GLM_4_AIR` doesn't exist | `reasoning-summarizer.ts:38` | 🔴 TypeScript error |
| Duplicate docstrings | `streaming.ts:16-29` | ⚠️ Minor |

## Files to Modify

### Critical Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `_shared/glm-chat-router.ts` | Modify | Enable `enableThinking: true` |
| `chat/index.ts` | Major refactor | Remove `generateStructuredReasoning()`, use `processGLMStream()` |
| `chat/handlers/streaming.ts` | Major refactor | Use `AICommentator`, remove `reasoning-summarizer` usage |
| `_shared/reasoning-summarizer.ts` | Bug fix | `GLM_4_AIR` → `GLM_4_5_AIR` |

### Secondary Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `chat/handlers/image.ts` | Minor | Update reasoning type imports |
| `chat/handlers/artifact.ts` | Minor | Update reasoning type imports |

### Files to Deprecate (After Migration)

| File | Reason |
|------|--------|
| `_shared/reasoning-generator.ts` | Replaced by GLM native thinking + `glm-reasoning-parser.ts` |
| `_shared/reasoning-summarizer.ts` | Replaced by `AICommentator` |

## Implementation Phases

### Phase 0: Bug Fixes (Immediate)
**Risk**: Low | **Rollback**: Simple revert

- [ ] Fix `MODELS.GLM_4_AIR` → `MODELS.GLM_4_5_AIR` in `reasoning-summarizer.ts`
- [ ] Run type check to verify fix

### Phase 1: Enable GLM Thinking Mode
**Risk**: Medium | **Rollback**: Set `enableThinking: false`

- [ ] Modify `glm-chat-router.ts:159` to set `enableThinking: true`
- [ ] Add feature flag `USE_GLM_THINKING_FOR_CHAT` for gradual rollout
- [ ] Update tests in `__tests__/glm-chat-router.test.ts`

### Phase 2: Integrate processGLMStream()
**Risk**: High | **Rollback**: Revert to old streaming logic

- [ ] Import `processGLMStream` and `GLMStreamCallbacks` from `glm-client.ts`
- [ ] Replace custom transform stream with `processGLMStream()` pattern
- [ ] Handle `onReasoningChunk`, `onContentChunk`, `onComplete` callbacks
- [ ] Parse reasoning with `parseGLMReasoningToStructured()` from `glm-reasoning-parser.ts`

### Phase 3: Integrate AICommentator
**Risk**: Medium | **Rollback**: Remove commentator, keep basic streaming

- [ ] Import `AICommentator` from `ai-commentator.ts`
- [ ] Initialize commentator with appropriate callbacks
- [ ] Emit `status_update` events during reasoning phase
- [ ] Add phase detection (analyzing, planning, implementing, etc.)

### Phase 4: Remove Legacy Reasoning
**Risk**: Medium | **Rollback**: Re-enable Gemini reasoning call

- [ ] Remove `generateStructuredReasoning()` call from `chat/index.ts`
- [ ] Remove `reasoning-summarizer.ts` import from `streaming.ts`
- [ ] Update type imports to use `glm-reasoning-parser.ts` types
- [ ] Update `handlers/image.ts` and `handlers/artifact.ts` type imports

### Phase 5: Cleanup & Documentation
**Risk**: Low | **Rollback**: N/A

- [ ] Add deprecation notices to `reasoning-generator.ts`
- [ ] Add deprecation notices to `reasoning-summarizer.ts`
- [ ] Update CLAUDE.md architecture documentation
- [ ] Update GLM_MIGRATION_PLAN.md status

## Detailed Code Changes

### glm-chat-router.ts (Phase 1)

```typescript
// Line 159: Change from
enableThinking: false, // Disable thinking mode for chat (only for artifacts)

// To:
enableThinking: Deno.env.get('USE_GLM_THINKING_FOR_CHAT') !== 'false', // Enable thinking by default
```

### chat/index.ts (Phase 2-4)

**Remove:**
```typescript
// Lines 37-41: Remove these imports
import {
  generateStructuredReasoning,
  createFallbackReasoning,
  type StructuredReasoning,
} from "../_shared/reasoning-generator.ts";

// Lines 224-258: Remove the entire STEP 5 reasoning generation block
```

**Add:**
```typescript
// New imports
import { processGLMStream, parseStatusMarker } from "../_shared/glm-client.ts";
import { parseGLMReasoningToStructured, parseReasoningIncrementally } from "../_shared/glm-reasoning-parser.ts";
import { AICommentator } from "../_shared/ai-commentator.ts";
```

### streaming.ts (Phase 2-3)

**Major refactor** to use the artifact streaming pattern:
- Remove `summarizeReasoningChunk` import
- Remove `reasoningBuffer`, `insideReasoning`, `lastSummaryTime` state
- Instead of injecting pre-generated reasoning, emit reasoning as it arrives from GLM

### reasoning-summarizer.ts (Phase 0)

```typescript
// Line 38: Fix typo
model: MODELS.GLM_4_5_AIR,  // was: MODELS.GLM_4_AIR
```

## Test Requirements (TDD)

### New Tests to Write

| Test File | Test Cases |
|-----------|------------|
| `glm-chat-router.test.ts` | Test `enableThinking: true` produces reasoning in response |
| `chat/handlers/__tests__/streaming-glm.test.ts` | Test GLM stream parsing with reasoning chunks |
| `chat/__tests__/chat-reasoning-integration.test.ts` | End-to-end: user message → GLM thinking → reasoning events |

### Existing Tests to Update

| Test File | Updates Needed |
|-----------|----------------|
| `reasoning-generator.test.ts` | Add deprecation notice, keep tests for backward compat |
| `glm-chat-router.test.ts` | Update mocks to expect `enableThinking: true` |

### Test Scenarios

1. **Basic chat with thinking**
   - Input: User message "What is React?"
   - Expected: GLM responds with `reasoning_content` + `content`
   - Verify: `reasoning_step` events emitted before content

2. **Reasoning parsing**
   - Input: Raw GLM reasoning text with numbered steps
   - Expected: Parsed into `StructuredReasoning` format
   - Verify: Steps have correct phases, titles, items

3. **AICommentator integration**
   - Input: Reasoning chunks arriving over time
   - Expected: `status_update` events with semantic summaries
   - Verify: Anti-flicker cooldown works, no duplicate statuses

4. **Fallback to OpenRouter**
   - Input: GLM fails with 503
   - Expected: Falls back to Gemini Flash Lite
   - Verify: Fallback uses old reasoning pattern (or skips reasoning)

5. **Feature flag disabled**
   - Input: `USE_GLM_THINKING_FOR_CHAT=false`
   - Expected: Uses old pattern (Gemini reasoning)
   - Verify: Backward compatibility maintained

## Rollback Strategy

Each phase has an independent rollback:

| Phase | Rollback Method |
|-------|-----------------|
| Phase 0 | Simple revert (bug fix) |
| Phase 1 | Set `USE_GLM_THINKING_FOR_CHAT=false` |
| Phase 2-3 | Revert `streaming.ts` and `chat/index.ts` |
| Phase 4 | Re-add `generateStructuredReasoning()` call |
| Phase 5 | N/A (documentation only) |

**Full rollback**: Revert all changes, set `enableThinking: false` in router.

## Success Metrics

- [ ] All existing chat tests pass
- [ ] New GLM thinking tests pass
- [ ] Response quality maintained or improved
- [ ] Latency comparable (±500ms acceptable)
- [ ] No increase in error rates
- [ ] Reasoning UI displays correctly (Claude-like ticker)

## Dependencies

- GLM-4.6 API key configured (`GLM_API_KEY`)
- GLM-4.5-Air available for AICommentator
- No changes needed to frontend `ReasoningDisplay.tsx` (same SSE event format)

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 0 | 15 min | None |
| Phase 1 | 1-2 hours | Phase 0 |
| Phase 2 | 2-4 hours | Phase 1 |
| Phase 3 | 1-2 hours | Phase 2 |
| Phase 4 | 1 hour | Phase 3 |
| Phase 5 | 30 min | Phase 4 |

**Total**: 6-10 hours

## Notes

- The frontend `ReasoningDisplay.tsx` already handles `reasoning_step` and `status_update` events (used by artifacts), so no frontend changes are needed.
- The `handlers/image.ts` and `handlers/artifact.ts` files call separate Edge Functions that handle their own reasoning. They receive `structuredReasoning` from the main chat flow, which will now come from GLM instead of Gemini.
- Consider keeping `reasoning-generator.ts` as a fallback for the OpenRouter path (when GLM fails).

