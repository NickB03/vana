# Reasoning Text Extractor

> **Last Updated**: 2025-12-01
> **Location**: `src/utils/reasoningTextExtractor.ts`
> **Tests**: `src/utils/__tests__/reasoningTextExtractor.test.ts` (76 tests)

This document describes the client-side reasoning text extraction utility used to transform raw LLM reasoning output into clean, action-oriented status updates for the UI ticker.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Goals](#2-design-goals)
3. [Architecture](#3-architecture)
4. [Extraction Strategies](#4-extraction-strategies)
5. [Validation Pipeline](#5-validation-pipeline)
6. [Verb Transformation](#6-verb-transformation)
7. [Usage](#7-usage)
8. [Configuration](#8-configuration)
9. [Testing](#9-testing)

---

## 1. Overview

The reasoning text extractor transforms verbose LLM thinking output into concise, semantic status updates suitable for display in a UI ticker/pill component.

**Before (raw LLM output)**:
```
Let me think about this carefully. I need to analyze the database schema
to understand the relationships between tables. The user wants...
```

**After (extracted status)**:
```
Analyzing the database schema
```

The utility is used by `ReasoningDisplay.tsx` to power the Claude-style reasoning ticker that shows live status updates during streaming.

---

## 2. Design Goals

| Goal | Description |
|------|-------------|
| **Zero LLM calls** | Pure client-side heuristics, no additional API costs |
| **Sub-millisecond** | Extraction completes in <1ms for typical input |
| **Stable output** | Throttled updates prevent UI flickering (1.5s minimum) |
| **Action-oriented** | Uses gerunds ("Analyzing...", "Building...") for active voice |
| **Clean display** | Strips periods, prefixes, and filler phrases |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     extractStatusText()                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Throttle Check     → Skip if <1.5s since last update        │
│  2. Code Detection     → Return "Writing code..." if code found │
│  3. Sentence Extraction → Find complete sentences (.!?)         │
│  4. Line Extraction    → Fallback to newline-separated lines    │
│  5. State Preservation → Return cached text if nothing valid    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      validateCandidate()                         │
├─────────────────────────────────────────────────────────────────┤
│  • Length check (≥15 chars, ≥3 words)                           │
│  • Capital letter requirement                                    │
│  • Numbered list rejection                                       │
│  • Quoted text rejection                                         │
│  • Filler phrase filtering                                       │
│  • Colon-ending rejection                                        │
│  • Negative instruction filtering                                │
│  • Code pattern rejection                                        │
│  • State sentence filtering                                      │
│  • Short bullet rejection                                        │
│  • Verb transformation to gerund                                 │
│  • Period stripping                                              │
│  • Truncation (70 chars max)                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Extraction Strategies

The extractor tries multiple strategies in order of preference:

### Strategy 0: Code Detection
If recent text looks like code (imports, brackets, semicolons), return `"Writing code..."`.

```typescript
// Triggers code detection
"const a = 1;\n"           → "Writing code..."
"import React from 'react'" → "Writing code..."
"{ key: 'value' }"         → "Writing code..."
```

### Strategy 1: Complete Sentences
Find sentences ending in `.`, `!`, or `?`. Try from most recent to oldest.

```typescript
"First step. Analyzing the database now."
// Extracts: "Analyzing the database now"
```

### Strategy 2: Complete Lines
Fall back to newline-separated lines (second-to-last to avoid partial lines).

```typescript
"Checking configuration\nValidating schema\n"
// Extracts: "Validating schema" (if it passes validation)
```

### Strategy 3: State Preservation
If no valid text found, return the previous cached status.

---

## 5. Validation Pipeline

Each candidate text passes through a validation pipeline that rejects unsuitable content:

| Check | Reason | Example Rejected |
|-------|--------|------------------|
| `too_short` | <15 chars | "OK" |
| `too_few_words` | <3 words | "Checking now" |
| `no_capital` | No uppercase letter | "analyzing data" |
| `numbered_list` | Starts with `1.`, `2)`, etc. | "1. First step" |
| `quoted` | Starts with quote | `"Hello world"` |
| `starts_with_filler` | Filler phrase prefix | "Let me think..." |
| `ends_with_colon` | Header-like text | "Requirements:" |
| `negative_instruction` | "Don't", "No", etc. | "Don't use deprecated APIs" |
| `looks_like_code` | Code patterns | "const x = 1;" |
| `state_sentence` | Describes rather than acts | "The code is valid" |
| `short_bullet` | Bullet <40 chars | "- Check this" |

---

## 6. Verb Transformation

The utility transforms various verb patterns into gerunds for action-oriented display:

### Pronoun + Modal Patterns

```typescript
"I will analyze the schema"   → "Analyzing the schema"
"We are checking the data"    → "Checking the data"
"I am building the component" → "Building the component"
"I should create a test"      → "Creating a test"
"We need to optimize this"    → "Optimizing this"
```

### Let Me / Let's Patterns

```typescript
"Let me check the database"   → "Checking the database"
"Let's review the code"       → "Reviewing the code"
```

### Imperative Patterns

```typescript
"Analyze the input data"      → "Analyzing the input data"
"Create a new component"      → "Creating a new component"
"Review this code"            → "Reviewing this code"
```

### Non-Transformable Verbs

Some verbs are intentionally NOT transformed because they're meta/thinking verbs:

```typescript
// These stay as filler (return "Thinking...")
"Let me think about this"     → "Thinking..."  (not "Thinking about this")
"I need to see the logs"      → "Thinking..."  (not "Seeing the logs")
"Let me understand this"      → "Thinking..."  (not "Understanding this")
```

**Non-transformable verbs**: `think`, `see`, `look`, `know`, `understand`, `consider`, `wonder`, `figure`

### Verb Conjugation Map

The utility includes ~200 verb conjugations covering:
- Core development verbs (analyze, check, create, design, review, build...)
- CRUD operations (add, remove, delete, insert, fetch, load...)
- Processing verbs (generate, render, compute, parse, format...)
- Network/API verbs (request, send, connect, call, invoke...)
- Security verbs (authenticate, authorize, encrypt, verify...)
- UI verbs (display, render, animate, style, layout...)

---

## 7. Usage

### Basic Usage

```typescript
import {
  extractStatusText,
  createExtractionState,
  type ExtractionState
} from "@/utils/reasoningTextExtractor";

// Create state ref (persists across renders)
const extractionStateRef = useRef<ExtractionState>(createExtractionState());

// Extract status from streaming text
function getDisplayText(streamingText: string): string {
  const result = extractStatusText(
    streamingText,
    extractionStateRef.current
  );

  // Update state for next call
  extractionStateRef.current = result.state;

  return result.text;  // e.g., "Analyzing the schema"
}
```

### With Custom Configuration

```typescript
import { extractStatusText, createExtractionState, DEFAULT_CONFIG } from "@/utils/reasoningTextExtractor";

const customConfig = {
  ...DEFAULT_CONFIG,
  throttleMs: 2000,     // 2 second throttle (default: 1500)
  maxLength: 50,        // Shorter max length (default: 70)
  minLength: 20,        // Higher minimum (default: 15)
  minWords: 4,          // More words required (default: 3)
};

const result = extractStatusText(rawText, state, customConfig);
```

### Reset State (New Streaming Session)

```typescript
// When starting a new streaming session
extractionStateRef.current = createExtractionState();
```

---

## 8. Configuration

### ExtractionConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `throttleMs` | number | 1500 | Minimum ms between UI updates |
| `maxLength` | number | 70 | Maximum output length (chars) |
| `minLength` | number | 15 | Minimum valid text length |
| `minWords` | number | 3 | Minimum word count |

### ExtractionState

| Field | Type | Description |
|-------|------|-------------|
| `lastText` | string | Last displayed status text |
| `lastUpdateTime` | number | Timestamp of last update |

### ExtractionResult

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Extracted status text to display |
| `updated` | boolean | Whether text changed from previous |
| `state` | ExtractionState | Updated state for next call |

---

## 9. Testing

The utility has comprehensive test coverage:

```bash
# Run extractor tests
npm run test -- src/utils/__tests__/reasoningTextExtractor.test.ts

# Run with verbose output
npm run test -- src/utils/__tests__/reasoningTextExtractor.test.ts --reporter=verbose
```

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| `transformToGerund` | 16 | Verb transformation patterns |
| `looksLikeCode` | 7 | Code pattern detection |
| `startsWithFiller` | 2 | Filler phrase detection |
| `isNegativeInstruction` | 3 | Negative instruction filtering |
| `isStateSentence` | 4 | State sentence detection |
| `looksLikeData` | 3 | JSON/data pattern detection |
| `stripPrefix` | 5 | Prefix removal |
| `truncate` | 3 | Length truncation |
| `validateCandidate` | 14 | Full validation pipeline |
| `extractStatusText` | 12 | End-to-end extraction |
| `utility exports` | 3 | API exports |
| `performance` | 2 | Speed benchmarks |

### Performance Benchmarks

- Typical input (<500 chars): <1ms
- Large input (5000+ chars): <5ms

---

## Quick Reference

### Exported Functions

```typescript
// Main extraction function
extractStatusText(rawText: string, state: ExtractionState, config?: ExtractionConfig): ExtractionResult

// Create initial state
createExtractionState(): ExtractionState

// Validate a candidate string
validateCandidate(text: string, config?: ExtractionConfig): ValidationResult

// Transform text to gerund form
transformToGerund(text: string): string

// Detection helpers
looksLikeCode(text: string): boolean
startsWithFiller(text: string): boolean
isNegativeInstruction(text: string): boolean
isStateSentence(text: string): boolean
looksLikeData(text: string): boolean
stripPrefix(text: string): string
truncate(text: string, maxLength: number): string
```

### Exported Constants

```typescript
// Verb conjugation map (200+ entries)
VERB_CONJUGATIONS: Record<string, string>

// Filler phrases to filter
FILLER_PHRASES: string[]

// Default configuration
DEFAULT_CONFIG: ExtractionConfig
```
