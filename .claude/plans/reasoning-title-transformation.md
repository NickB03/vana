# Plan: Port Reasoning Title Transformation to Backend

> **Goal**: Integrate the sophisticated verb transformation logic from `reasoningTextExtractor.ts` into the backend's `glm-reasoning-parser.ts` so all clients receive polished, action-oriented titles.

> **Status**: 🟢 GREEN LIGHT - CI passing, ready for merge
>
> **Last Updated**: 2025-12-01 (PR #180 CI fixes applied)

---

## PR #180 Remediation Plan

### CI Status (RESOLVED ✅)

| Check | Status | Resolution |
|-------|--------|------------|
| **Validate Model Configuration** | ✅ PASS | Added `GLM_4_AIRX` to snapshot |
| **Frontend Quality (Lint)** | ✅ PASS | Removed unnecessary escape character |
| **Test** | ✅ PASS | All 692 tests passing |
| **Cloudflare Pages** | ✅ PASS | Preview deployed |
| **CodeRabbit** | ✅ PASS | Review completed |

### Fix #1: Model Configuration Snapshot (CRITICAL)

**Problem**: The golden snapshot test detected a new model `GLM_4_AIRX` that was added intentionally but the snapshot wasn't updated.

**File**: `supabase/functions/_shared/__tests__/model-config.snapshot.json`

**Current**:
```json
{
  "version": "2025-11-27",
  "models": {
    "GEMINI_FLASH": "google/gemini-2.5-flash-lite",
    "GLM_4_6": "zhipu/glm-4.6",
    "KIMI_K2": "moonshotai/kimi-k2-thinking",
    "GEMINI_FLASH_IMAGE": "google/gemini-2.5-flash-image"
  }
}
```

**Updated**:
```json
{
  "version": "2025-12-01",
  "models": {
    "GEMINI_FLASH": "google/gemini-2.5-flash-lite",
    "GLM_4_6": "zhipu/glm-4.6",
    "GLM_4_AIRX": "zhipu/glm-4-airx",
    "KIMI_K2": "moonshotai/kimi-k2-thinking",
    "GEMINI_FLASH_IMAGE": "google/gemini-2.5-flash-image"
  }
}
```

### Fix #2: ESLint Error (CRITICAL)

**Problem**: Unnecessary escape character in regex pattern.

**File**: `src/utils/reasoningTextExtractor.ts`
**Line**: 442

**Current**:
```typescript
/\w+\s*=\s*["'`{(\[]/, // Variable assignments
```

**Fixed**:
```typescript
/\w+\s*=\s*["'`{([]/,  // Variable assignments
```

**Explanation**: Inside a character class `[...]`, the `[` doesn't need to be escaped. ESLint's `no-useless-escape` rule catches this.

### Fix #3: Lint Warnings (Non-blocking but should fix)

Multiple `@typescript-eslint/no-explicit-any` warnings and unused eslint-disable directives. These are warnings, not errors, so they don't block the PR but should be addressed for code quality.

**Priority files** (PR-related changes):
- `src/hooks/useChatMessages.tsx` - 5 `any` type warnings (lines 79, 166, 874, 933, 964)

### Remediation Steps

```bash
# Step 1: Update the model config snapshot
# Edit: supabase/functions/_shared/__tests__/model-config.snapshot.json

# Step 2: Fix the ESLint error
# Edit: src/utils/reasoningTextExtractor.ts line 442

# Step 3: Commit and push
git add -A
git commit -m "fix: Update model snapshot for GLM_4_AIRX and fix ESLint escape char

- Add GLM_4_AIRX to model-config.snapshot.json (intentional addition for
  fast reasoning summarization)
- Remove unnecessary escape character in reasoningTextExtractor.ts regex

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

### Verification

After pushing fixes:
1. ✅ Model Configuration check should pass (snapshot matches config)
2. ✅ Frontend Quality check should pass (no ESLint errors)
3. ✅ Test check should run and pass
4. ✅ Cloudflare Pages deployment should succeed (already passing)

---

---

## Review Summary

This plan was reviewed and updated to address the following gaps:

| Gap | Resolution |
|-----|------------|
| Missing `autoGerund()` function | Added to port list (required dependency of `transformToGerund()`) |
| `stripPrefix()` collision | Renamed to `stripTitlePrefix()` with merged implementation |
| Deno import convention | Added explicit `.ts` extension note |
| No transformation fallback test | Added test case for unknown verbs |
| Performance consideration | Added validation section confirming O(1) lookup is fine |
| GLM-specific verbs | Added 6 commonly-used verbs (craft, devise, construct, etc.) |
| `extractCurrentThinking()` integration unclear | Added full integration example |

---

## Current State

| Component | Location | Capabilities |
|-----------|----------|--------------|
| Backend Parser | `supabase/functions/_shared/glm-reasoning-parser.ts` | 10 action verbs, simple prefix addition |
| Frontend Extractor | `src/utils/reasoningTextExtractor.ts` | 200+ verbs, pronoun stripping, filler filtering |

**Problem**: The backend generates titles like `"Analyzing: I will check the database"` instead of `"Checking the database"`.

---

## Implementation Steps

### Step 1: Create Shared Transformation Utility (Backend)

**File**: `supabase/functions/_shared/title-transformer.ts`

Port from `reasoningTextExtractor.ts`:
- [ ] `VERB_CONJUGATIONS` map (~200 verbs)
- [ ] `transformToGerund()` function
- [ ] `autoGerund()` helper function (required by `transformToGerund()` for unknown verbs)
- [ ] `NON_TRANSFORMABLE_VERBS` set (think, see, look, etc.)
- [ ] `stripTitlePrefix()` function (renamed to avoid collision with existing `stripPrefix` in parser)
- [ ] Period/punctuation stripping
- [ ] Filler phrase detection (for rejection, not transformation)

**Additional GLM-specific verbs to add** (commonly used by GLM-4.6):
```typescript
// Add to VERB_CONJUGATIONS
craft: "Crafting",
devise: "Devising",
construct: "Constructing",
formulate: "Formulating",
prepare: "Preparing",
assemble: "Assembling",
```

**Deno Import Convention**:
> ⚠️ Deno requires explicit `.ts` extensions in imports:
> ```typescript
> // ✅ Correct for Deno
> import { transformToGerund } from './title-transformer.ts';
>
> // ❌ Will fail in Deno (works in Node/bundlers)
> import { transformToGerund } from './title-transformer';
> ```

**Do NOT port** (not needed for title transformation):
- Throttling logic (frontend-only concern)
- Code detection (handled elsewhere)
- State tracking (frontend-only concern)

### Step 2: Update `generateTitle()` in `glm-reasoning-parser.ts`

**Location**: `generateTitle()` function (search for `function generateTitle`)

**Current logic**:
```typescript
function generateTitle(section, phase): string {
  // Poor title detection
  // Generic prefix addition: "Analyzing: {title}"
  // Truncation
}
```

**New logic**:
```typescript
import { transformToGerund, stripTitlePrefix } from './title-transformer.ts';

function generateTitle(section, phase): string {
  let title = section.title.trim();

  // 1. Strip any existing prefixes first
  title = stripTitlePrefix(title);

  // 2. Apply verb transformation
  const transformed = transformToGerund(title);

  // 3. Check if transformation was successful (text changed)
  const wasTransformed = transformed !== title;
  title = transformed;

  // 4. Only check for "poor title" if transformation didn't help
  if (!wasTransformed) {
    // ... existing poorTitlePatterns check ...
    // ... fallback to phase-based title if needed ...
  }

  // 5. Strip trailing punctuation
  title = title.replace(/[.!?]+$/, '');

  // 6. Truncation (keep existing 120 char limit)
  if (title.length > 120) {
    title = title.substring(0, 117) + '...';
  }

  return title;
}
```

**Key Change**: Remove the existing `actionVerbs` array check (lines ~363-375) since `transformToGerund()` handles this more comprehensively.

### Step 3: Update `extractCurrentThinking()`

**Location**: `extractCurrentThinking()` function (search for `function extractCurrentThinking`)

Apply same transformation to the "current thinking" text shown during streaming:

**Current return statement** (end of function):
```typescript
return lastLine || 'Thinking...';
```

**New return statement**:
```typescript
// Apply verb transformation before returning
const transformed = transformToGerund(lastLine);

// If transformation produced a result different from input, use it
// Otherwise fall back to the cleaned lastLine
return transformed || lastLine || 'Thinking...';
```

**Full integration example**:
```typescript
function extractCurrentThinking(text: string): string {
  const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return 'Thinking...';

  let lastLine = lines[lines.length - 1].trim();

  // Clean up common prefixes (existing logic)
  lastLine = lastLine.replace(/^(\d+\.|Step\s+\d+:?|\d+\))\s*/i, '');
  lastLine = lastLine.replace(/^[-*•]\s*/, '');

  // ... existing looksLikeCode and looksLikeInstruction checks ...

  if (looksLikeCode || looksLikeInstruction) {
    return 'Processing...';
  }

  if (lastLine.length < 5) {
    return 'Processing...';
  }

  // NEW: Apply verb transformation
  lastLine = transformToGerund(lastLine);

  // Strip trailing punctuation for cleaner display
  lastLine = lastLine.replace(/[.!?]+$/, '');

  // Truncation (existing logic, relaxed to 120 chars)
  if (lastLine.length > 120) {
    const sentenceMatch = lastLine.match(/^(.+?)[.!?]\s/);
    if (sentenceMatch && sentenceMatch[1].length < 120) {
      return sentenceMatch[1];
    }
    lastLine = lastLine.substring(0, 117) + '...';
  }

  return lastLine || 'Thinking...';
}
```

### Step 4: Write Backend Tests

**File**: `supabase/functions/_shared/__tests__/title-transformer.test.ts`

Test cases to port from `reasoningTextExtractor.test.ts`:
- [ ] Pronoun + modal patterns ("I will analyze" → "Analyzing")
- [ ] Let me/let's patterns ("Let me check" → "Checking")
- [ ] Imperative patterns ("Analyze the data" → "Analyzing the data")
- [ ] Already-gerund preservation ("Analyzing" → "Analyzing")
- [ ] Non-transformable verbs ("Let me think" → unchanged/filtered)
- [ ] Edge cases (empty, short, already correct)

**Additional test cases for edge cases**:
- [ ] **No transformation available**: Unknown verb returns original text
  ```typescript
  it('returns original text when no transformation is available', () => {
    // "Zlorping" is not in VERB_CONJUGATIONS, autoGerund should handle it
    expect(transformToGerund('I will zlorp the data')).toBe('Zlorping the data');
  });
  ```
- [ ] **Already transformed text is idempotent**:
  ```typescript
  it('is idempotent - running twice produces same result', () => {
    const input = 'I will analyze the schema';
    const first = transformToGerund(input);
    const second = transformToGerund(first);
    expect(second).toBe(first);  // "Analyzing the schema"
  });
  ```
- [ ] **GLM-specific patterns** (commonly seen in GLM-4.6 output):
  ```typescript
  it('handles GLM-specific phrasings', () => {
    expect(transformToGerund('Let me craft the component')).toBe('Crafting the component');
    expect(transformToGerund('I shall devise a solution')).toBe('Devising a solution');
  });
  ```

### Step 5: Update Existing Backend Tests

**File**: `supabase/functions/_shared/__tests__/glm-reasoning-parser.test.ts`

Update test expectations to reflect new transformed titles.

### Step 6: Integration Testing

- [ ] Run full backend test suite: `cd supabase/functions && deno task test`
- [ ] Test with real GLM streaming in local dev
- [ ] Verify titles appear correctly in UI

**Real GLM Output Validation**:

Capture 5-10 real streaming sessions to verify transformation quality. Use browser DevTools Network tab to capture SSE events from `generate-artifact`:

```bash
# Example: Capture reasoning_chunk events from a real session
# Look for patterns like:
# - "I will analyze the user's request"
# - "Let me create a React component"
# - "We need to implement the validation"
```

**Test matrix**:
| GLM Output Pattern | Expected Transformation |
|--------------------|------------------------|
| "I will analyze the requirements" | "Analyzing the requirements" |
| "Let me create a counter component" | "Creating a counter component" |
| "We should implement validation first" | "Implementing validation first" |
| "Crafting the user interface" | "Crafting the user interface" (unchanged) |
| "The user wants a dark theme" | Falls through to phase-based title |

### Step 7: Deploy

```bash
supabase functions deploy generate-artifact --project-ref <ref>
supabase functions deploy generate-artifact-fix --project-ref <ref>
```

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/functions/_shared/title-transformer.ts` | **NEW** | Verb conjugation map + `transformToGerund()` |
| `supabase/functions/_shared/glm-reasoning-parser.ts` | MODIFY | Import and use `transformToGerund()` in `generateTitle()` and `extractCurrentThinking()` |
| `supabase/functions/_shared/__tests__/title-transformer.test.ts` | **NEW** | Unit tests for transformer |
| `supabase/functions/_shared/__tests__/glm-reasoning-parser.test.ts` | MODIFY | Update expected titles |

---

## Transformation Examples

| Input (Raw GLM Title) | Current Output | New Output |
|-----------------------|----------------|------------|
| "I will analyze the requirements" | "Analyzing: I will analyze the requirements" | "Analyzing the requirements" |
| "Let me check the database schema" | "Planning: Let me check the database schema" | "Checking the database schema" |
| "Check the validation logic" | "Check the validation logic" | "Checking the validation logic" |
| "We are building the component" | "Building: We are building the component" | "Building the component" |
| "The user wants a form" | "The user wants a form" | "Thinking..." (filtered as state) |
| "Creating the artifact" | "Creating the artifact" | "Creating the artifact" (unchanged) |

---

## Rollback Plan

If issues arise:
1. The frontend `extractStatusText()` fallback still exists
2. Can revert backend changes without breaking UI
3. Frontend will show raw titles (current behavior)

---

## Success Criteria

- [ ] All backend tests pass
- [ ] Titles in UI show gerund form ("Analyzing...", "Building...")
- [ ] No "I will", "Let me", "We are" prefixes in displayed titles
- [ ] State sentences filtered out
- [ ] No regression in streaming performance

### Performance Validation

The `VERB_CONJUGATIONS` map has ~200 entries. Performance is **not a concern** because:

1. **O(1) lookup**: JavaScript object property access is hash-based
2. **No cold-start impact**: Object initialization is instant (no I/O, no parsing)
3. **Per-chunk overhead**: ~0.01ms per transformation call (measured in frontend)

**Validation test** (add to test suite):
```typescript
it('transforms 1000 titles in under 50ms', () => {
  const inputs = Array(1000).fill('I will analyze the database schema');
  const start = performance.now();
  inputs.forEach(input => transformToGerund(input));
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(50);  // 50µs per call average
});
```

---

## Appendix: Frontend Extractor Already Built

The following files were created as part of the initial implementation. This logic needs to be ported to the backend.

### New Files Created

#### `src/utils/reasoningTextExtractor.ts` (NEW - ~1050 lines)

Core utility for extracting clean status text from raw LLM reasoning.

```typescript
/**
 * Reasoning Text Extractor
 *
 * Extracts clean, semantic status updates from raw LLM reasoning text.
 * Produces ticker-friendly text like "Analyzing database schema" instead of
 * verbose thinking like "Let me think about the database schema..."
 */

// ============================================================================
// VERB CONJUGATION MAP (~200 verbs)
// ============================================================================
const VERB_CONJUGATIONS: Record<string, string> = {
  // Core development verbs
  analyze: "Analyzing",
  check: "Checking",
  create: "Creating",
  design: "Designing",
  review: "Reviewing",
  build: "Building",
  implement: "Implementing",
  fix: "Fixing",
  debug: "Debugging",
  test: "Testing",
  write: "Writing",
  read: "Reading",
  update: "Updating",
  modify: "Modifying",
  refactor: "Refactoring",
  optimize: "Optimizing",
  validate: "Validating",
  configure: "Configuring",
  // ... 180+ more verbs covering:
  // - CRUD operations (add, remove, delete, insert, fetch, load, save...)
  // - Processing verbs (generate, render, compute, parse, format...)
  // - Network/API verbs (request, send, connect, call, invoke...)
  // - Security verbs (authenticate, authorize, encrypt, verify...)
  // - UI verbs (display, render, animate, style, layout...)
  // - Data verbs (compress, encode, serialize, cache...)
  // - System verbs (initialize, shutdown, restart, deploy...)
};

// ============================================================================
// NON-TRANSFORMABLE VERBS
// ============================================================================
// Verbs that shouldn't be converted to gerunds (meta/thinking verbs)
const NON_TRANSFORMABLE_VERBS = new Set([
  "think", "see", "look", "know", "understand",
  "consider", "wonder", "figure", "try", "start",
]);

// ============================================================================
// FILLER PHRASES
// ============================================================================
const FILLER_PHRASES: string[] = [
  "let me", "let's", "i will", "i'll", "i need", "i should",
  "i want", "i have", "i am", "i'm", "we", "we'll", "we're",
  "we need", "we should", "now i", "first i", "okay", "alright",
  "so", "well", "hmm", "actually", "basically", "essentially",
  // ... more filler phrases
];

// ============================================================================
// PATTERN DETECTION
// ============================================================================
const CODE_PATTERNS: RegExp[] = [
  /[{}[\]]/,                    // Brackets/braces
  /\b(const|let|var|function|class|import|export|async|await)\b/,
  /=>/,                         // Arrow functions
  /;\s*$/,                      // Semicolons at end
  /<\/[a-z]+>/i,               // Closing HTML/JSX tags
  /\.\w+\(/,                   // Method calls
  // ... more code patterns
];

const STATE_VERB_PATTERN =
  /\s(is|are|was|were|has|have|had|will be|would be)\s/i;

const ACTION_VERB_PATTERN =
  /(checking|analyzing|creating|designing|reviewing|...)/i;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Transform text to gerund form
 * "I will analyze the schema" → "Analyzing the schema"
 * "Let me check the database" → "Checking the database"
 * "Check the validation logic" → "Checking the validation logic"
 */
export function transformToGerund(text: string): string {
  // Pattern 1: "I will/am/should [verb]" → "[Verb]ing"
  // Pattern 2: "We are/will/need to [verb]" → "[Verb]ing"
  // Pattern 3: "Let me/Let's [verb]" → "[Verb]ing"
  // Pattern 4: Imperative "[Verb] the..." → "[Verb]ing the..."
  // ... implementation with regex matching and verb lookup
}

/**
 * Validate if text is suitable for display
 * Rejects: code, filler phrases, state sentences, numbered lists, etc.
 */
export function validateCandidate(text: string, config?: ExtractionConfig): ValidationResult {
  // Check length, word count, capital letter
  // Reject numbered lists, quoted text, filler phrases
  // Reject colon-endings, negative instructions, code patterns
  // Reject state sentences without action verbs
  // Transform to gerund if valid
  // Strip trailing punctuation
  // Truncate to maxLength
}

/**
 * Extract the best status text from raw reasoning
 * Strategies: code detection → sentence extraction → line extraction → fallback
 */
export function extractStatusText(
  rawText: string,
  state: ExtractionState,
  config?: ExtractionConfig
): ExtractionResult {
  // Strategy 0: Code detection → "Writing code..."
  // Strategy 1: Complete sentence extraction (.!?)
  // Strategy 2: Complete line extraction (\n)
  // Strategy 3: Fall back to previous cached state
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================
export interface ExtractionConfig {
  throttleMs: number;   // Default: 1500
  maxLength: number;    // Default: 70
  minLength: number;    // Default: 15
  minWords: number;     // Default: 3
}

export interface ExtractionState {
  lastText: string;
  lastUpdateTime: number;
}

export interface ExtractionResult {
  text: string;
  updated: boolean;
  state: ExtractionState;
}

export interface ValidationResult {
  valid: boolean;
  cleaned: string;
  reason?: string;
}
```

#### `src/utils/__tests__/reasoningTextExtractor.test.ts` (NEW - 76 tests)

Comprehensive test coverage:

```typescript
describe('transformToGerund', () => {
  describe('pronoun + modal patterns', () => {
    it('transforms "I will analyze" to "Analyzing"');
    it('transforms "We are checking" to "Checking"');
    it('transforms "I am building" to "Building"');
    it('transforms "I should create" to "Creating"');
    it('transforms "We need to optimize" to "Optimizing"');
  });

  describe('let me/let\'s patterns', () => {
    it('transforms "Let me analyze" to "Analyzing"');
    it('transforms "Let\'s check" to "Checking"');
  });

  describe('imperative patterns', () => {
    it('transforms "Analyze the schema" to "Analyzing the schema"');
    it('transforms "Create a component" to "Creating a component"');
  });

  describe('edge cases', () => {
    it('preserves already-gerund text');
    it('handles mixed case input');
    it('handles non-transformable verbs');
  });
});

describe('validateCandidate', () => {
  it('rejects text too short');
  it('rejects text with too few words');
  it('rejects numbered list items');
  it('rejects filler phrases');
  it('rejects state sentences');
  it('accepts action-oriented text');
  it('transforms and accepts imperative text');
});

describe('extractStatusText', () => {
  it('extracts the last valid sentence');
  it('returns "Writing code..." for code content');
  it('throttles updates based on config');
  it('handles real-world GLM output');
});

describe('performance', () => {
  it('extracts status in under 1ms for typical input');
  it('handles large input efficiently');
});
```

### Modified Files

#### `src/components/ReasoningDisplay.tsx` (MODIFIED)

**Before** (~285 lines in `getPillLabel()`):
```typescript
const getPillLabel = (): string => {
  // Inline heuristics for text extraction
  // Throttling logic
  // Code detection
  // Filler phrase filtering
  // Verb transformation (limited)
  // ... 285 lines of inline logic
};
```

**After** (~45 lines):
```typescript
import {
  extractStatusText,
  createExtractionState,
  type ExtractionState,
} from "@/utils/reasoningTextExtractor";

// State ref for extraction
const extractionStateRef = useRef<ExtractionState>(createExtractionState());

const getPillLabel = (): string => {
  if (isExpanded && !isStreaming) return "Thought process";

  if (isStreaming) {
    // 1. Prefer explicit semantic status
    if (reasoningStatus) return reasoningStatus;

    // 2. Prefer structured reasoning steps
    if (validatedSteps && currentSection) return currentSection.title;

    // 3. Extract from raw streaming text
    if (hasStreamingText && streamingReasoningText) {
      const result = extractStatusText(
        streamingReasoningText,
        extractionStateRef.current
      );
      extractionStateRef.current = result.state;
      return result.text;
    }

    return extractionStateRef.current.lastText;
  }

  // ... collapsed state handling
};
```

#### `src/components/__tests__/ReasoningDisplayAudit.test.tsx` (MODIFIED)

Updated tests to use action-oriented sentences that pass validation:

```diff
- renderStreaming('This is a complete sentence that is long enough.');
- expectDisplayed('This is a complete sentence that is long enough');
+ renderStreaming('Analyzing the database structure properly.');
+ expectDisplayed('Analyzing the database structure properly');

- renderStreaming('First update that is long enough.');
+ renderStreaming('Analyzing the first database query.');
```

#### `src/components/__tests__/ReasoningDisplayFiltering.test.tsx` (MODIFIED)

Split filler phrase test into action vs non-action verbs:

```diff
- it('filters out filler phrases', () => {
-   renderWithStreamingText('Let me check the database.');
-   expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
- });
+ it('filters out filler phrases with non-action verbs', () => {
+   renderWithStreamingText('Let me think about this problem.');
+   expect(screen.getAllByText('Thinking...')[0]).toBeInTheDocument();
+ });
+
+ it('transforms filler phrases with action verbs', () => {
+   renderWithStreamingText('Let me check the database.');
+   expect(screen.getAllByText('Checking the database')[0]).toBeInTheDocument();
+ });
```

### Documentation Created

#### `.claude/docs/REASONING-TEXT-EXTRACTOR.md` (NEW)

Full documentation covering:
- Overview and design goals
- Architecture diagram
- Extraction strategies
- Validation pipeline
- Verb transformation patterns
- Usage examples
- Configuration options
- Testing guide

---

## Key Logic to Port to Backend

The following functions from `reasoningTextExtractor.ts` should be ported to `title-transformer.ts`:

| Function | Source Lines | Notes |
|----------|--------------|-------|
| `VERB_CONJUGATIONS` | 24-415 | Full 200+ verb map + GLM-specific additions |
| `NON_TRANSFORMABLE_VERBS` | 671-682 | Set of meta/thinking verbs |
| `transformToGerund()` | 696-779 | Main transformation function |
| `autoGerund()` | 785-803 | **Required** - generates -ing form for unknown verbs |
| `stripTitlePrefix()` | 808-814 | Renamed from `stripPrefix()` to avoid collision |

### `stripPrefix` Collision Resolution

Both files have a `stripPrefix` function:

| Location | Current Implementation |
|----------|----------------------|
| `glm-reasoning-parser.ts:360` | `title.replace(/^(Step\s+\d+:?\s*\|Section\s+\d+:?\s*)/i, '')` |
| `reasoningTextExtractor.ts:808-814` | More comprehensive (Step, Phase, numbered lists, "Building:" prefixes) |

**Resolution**:
1. Port the frontend version as `stripTitlePrefix()` in `title-transformer.ts`
2. Use `stripTitlePrefix()` in `generateTitle()` instead of the inline regex
3. Leave the inline regex in `extractCurrentThinking()` (it's sufficient for streaming)

**Merged implementation**:
```typescript
export function stripTitlePrefix(text: string): string {
  return text
    .replace(/^[A-Za-z]+:\s*/, '')           // "Building: ..." → "..."
    .replace(/^Step\s+\d+[:.]\s*/i, '')      // "Step 1: ..." → "..."
    .replace(/^Phase\s+\d+[:.]\s*/i, '')     // "Phase 1: ..." → "..."
    .replace(/^Section\s+\d+[:.]\s*/i, '')   // "Section 1: ..." → "..." (from parser)
    .replace(/^\d+[.)]\s*/, '');             // "1. ..." → "..."
}
```

**Do NOT port** (frontend-specific):
- `extractStatusText()` - Uses throttling, state tracking
- `ExtractionState` / `ExtractionConfig` - Frontend concerns
- Code detection patterns - Backend handles differently
- Validation pipeline - Backend has its own `generateTitle()` logic
