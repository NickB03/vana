# Citation Parser Implementation - Phase 2 Complete

**Date**: 2025-12-17
**Issue**: #334 - Inline Citations Feature
**Phase**: 2 of 4

## Summary

Successfully implemented the citation parser utility that extracts and groups citation markers like `[1][2][3]` from markdown text. This module provides the core parsing logic for the inline citations feature.

## Files Created

### `/Users/nick/Projects/llm-chat-site/src/utils/citationParser.ts`
- **Size**: 301 lines
- **Exports**: 5 public functions + 2 types
- **Dependencies**: `@/types/citation` (CitationSource type)

### `/Users/nick/Projects/llm-chat-site/src/utils/__tests__/citationParser.test.ts`
- **Size**: 375 lines
- **Test Coverage**: 48 tests, all passing
- **Test Categories**:
  - Basic functionality (3 tests)
  - Edge cases - position in text (3 tests)
  - Edge cases - whitespace handling (3 tests)
  - Edge cases - invalid input (8 tests)
  - Edge cases - large numbers (2 tests)
  - Edge cases - special characters (2 tests)
  - Group consecutive citations (4 tests)
  - Parse citation markers in text (11 tests)
  - Validation helpers (4 tests)
  - Unique citation numbers (4 tests)
  - Integration tests (4 tests)

## API Overview

### Main Functions

#### `extractCitations(content: string): CitationMarker[]`
Extracts all citation markers and groups consecutive ones.

```typescript
extractCitations("AI has progressed [1][2][3] significantly")
// Returns: [{
//   position: 18,
//   citationNumbers: [1, 2, 3],
//   startIndex: 18,
//   endIndex: 27,
//   rawText: "[1][2][3]"
// }]
```

#### `groupConsecutiveCitations(matches, content): CitationMarker[]`
Groups individual citation matches that appear consecutively (whitespace-only between them).

#### `parseCitationMarkersInText(text, sources): (string | CitationGroup)[]`
Splits text into segments: text parts and citation groups with source metadata.

```typescript
parseCitationMarkersInText("Text [1][2] more text", sources)
// Returns: ["Text ", { position: 5, citationNumbers: [1, 2], sources: [...], primaryDomain: "example.com" }, " more text"]
```

#### `isValidCitation(citationNumber, sources): boolean`
Validates if a citation number has associated sources.

#### `getUniqueCitationNumbers(content): number[]`
Extracts unique citation numbers for prefetching sources.

```typescript
getUniqueCitationNumbers("Text [1][2][1][3]") // Returns: [1, 2, 3]
```

## Type Definitions

### `CitationMarker`
Internal type for tracking citation positions during parsing.

```typescript
interface CitationMarker {
  position: number;        // Character offset where citation group starts
  citationNumbers: number[]; // Array of citation numbers in the group
  startIndex: number;      // Start position (same as position)
  endIndex: number;        // End position (after last citation)
  rawText: string;         // Original text like "[1][2][3]"
}
```

### `CitationGroup`
Parsed citation group with source metadata for rendering.

```typescript
interface CitationGroup {
  position: number;
  citationNumbers: number[];
  sources: CitationSource[];  // Array of source metadata
  primaryDomain: string;       // Domain from first source (e.g., "example.com")
}
```

## Key Features

### 1. Regex-Based Extraction
- Pattern: `/\[(\d+)\]/g`
- Matches: `[1]`, `[123]`, `[999]`
- Ignores: `[abc]`, `[-1]`, `[]`, `[1.2]`
- Validates citation numbers are positive integers

### 2. Consecutive Grouping
Citations are grouped if separated only by whitespace:
- `[1][2][3]` → Single group
- `[1] [2] [3]` → Single group
- `[1] text [2]` → Two groups
- Handles tabs, newlines, multiple spaces

### 3. Character Offset Tracking
Precise position information for:
- Text splitting in markdown renderers
- Future features (tooltips, highlights)
- Accurate text reconstruction

### 4. Source Metadata Integration
- Enriches citation markers with source data
- Extracts primary domain from URLs
- Handles missing sources gracefully (empty arrays)
- Supports multiple sources per citation

### 5. Validation & Utilities
- `isValidCitation()` - Check if citation has sources
- `getUniqueCitationNumbers()` - Extract all citation numbers for prefetching
- Robust error handling for invalid URLs

## Edge Cases Handled

1. **Position in Text**
   - Citations at start: `[1] Text`
   - Citations at end: `Text [1]`
   - Citations only: `[1][2][3]`

2. **Whitespace Variations**
   - No space: `[1][2][3]`
   - Single space: `[1] [2] [3]`
   - Multiple spaces: `[1]  [2]  [3]`
   - Tabs/newlines: `[1]\t[2]\n[3]`

3. **Invalid Markers**
   - Non-numeric: `[abc]` (ignored)
   - Negative: `[-1]` (ignored)
   - Empty: `[]` (ignored)
   - Decimal: `[1.2]` (ignored)

4. **Special Contexts**
   - Markdown links: `[text](url)` (not confused with citations)
   - Code blocks: `const arr = [1, 2, 3]` (not extracted)
   - Array access: `array[0]` (not confused)

5. **Large Numbers**
   - Handles `[999]`, `[123456]`, etc.
   - No artificial limits on citation numbers

## Test Results

```bash
✓ src/utils/__tests__/citationParser.test.ts (48 tests) 5ms

Test Files  1 passed (1)
     Tests  48 passed (48)
  Start at  20:21:23
  Duration  379ms
```

All tests passing with comprehensive coverage of:
- Happy paths
- Edge cases
- Error conditions
- Integration scenarios
- Real-world markdown examples

## Integration with Phase 1

The citation parser imports types from Phase 1:

```typescript
import type { CitationSource } from '@/types/citation';
```

This ensures type consistency across the citation system:
- `/src/types/citation.ts` - Type definitions (Phase 1)
- `/src/utils/citationParser.ts` - Parsing logic (Phase 2)
- `/src/components/ui/inline-citation.tsx` - UI component (Phase 3, pending)

## Next Steps (Phase 3)

The parser is ready for integration with:

1. **Inline Citation Component** (`/src/components/ui/inline-citation.tsx`)
   - Consume `CitationGroup` type
   - Render citation badges using parsed data
   - Display tooltips with source metadata

2. **Markdown Renderer Integration**
   - Use `parseCitationMarkersInText()` to split text
   - Render text segments and citation components
   - Maintain markdown formatting around citations

3. **Citation Store/Context**
   - Store citation sources in React context or TanStack Query
   - Pass to `parseCitationMarkersInText()` for enrichment
   - Enable prefetching with `getUniqueCitationNumbers()`

## Performance Characteristics

- **Time Complexity**: O(n) where n = text length
  - Single pass with regex
  - Linear grouping pass
- **Space Complexity**: O(c) where c = number of citations
  - Stores only citation positions, not duplicate text
- **Regex Performance**: Efficient for typical chat messages (<10KB)
- **No Dependencies**: Pure TypeScript, no external libraries

## Security Considerations

1. **Input Validation**: Accepts any string, returns empty array for invalid input
2. **Number Parsing**: Uses `parseInt()` with radix 10, validates > 0
3. **URL Parsing**: Try/catch around `new URL()`, graceful fallback
4. **No Code Execution**: Pure parsing, no eval or dynamic code
5. **No XSS Risk**: Returns structured data, not HTML strings

## Documentation

- Full JSDoc comments on all public functions
- Type annotations throughout
- Usage examples in JSDoc
- Internal functions marked with `@internal`
- Edge cases documented in code comments

## Maintainability

- **Single Responsibility**: Each function does one thing well
- **Testable**: Small, pure functions with clear inputs/outputs
- **Readable**: Descriptive names, clear logic flow
- **Extensible**: Easy to add new validation or parsing rules
- **Type Safe**: Full TypeScript coverage, exported types

## Quality Metrics

- **Test Count**: 48 tests
- **Pass Rate**: 100%
- **TypeScript Errors**: 0
- **Build Status**: ✓ Built successfully
- **Code Style**: Follows project conventions
- **Documentation**: Complete JSDoc coverage

---

**Status**: ✅ Phase 2 Complete
**Ready for Phase 3**: Yes
**Breaking Changes**: None
**Dependencies**: `@/types/citation` (Phase 1)
