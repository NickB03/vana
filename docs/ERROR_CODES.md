# Artifact Validation Error Codes

> **Last Updated**: 2025-12-28
> **Status**: Complete reference for structured error code system
> **Migration**: Replaced fragile string matching in commit b1f86ad

---

## Table of Contents

- [Overview](#overview)
- [Error Code Schema](#error-code-schema)
- [Complete Error Code Reference](#complete-error-code-reference)
  - [Reserved Keyword Errors](#reserved-keyword-errors-reserved_keyword_)
  - [Import Errors](#import-errors-import_)
  - [Storage API Errors](#storage-api-errors-storage_)
  - [Immutability Violations](#immutability-violations-immutability_)
- [Error Severity Levels](#error-severity-levels)
- [Blocking vs Non-Blocking Errors](#blocking-vs-non-blocking-errors)
- [How to Add New Error Codes](#how-to-add-new-error-codes)
- [Migration from String Matching](#migration-from-string-matching)
- [Error Handling Best Practices](#error-handling-best-practices)
- [Related Documentation](#related-documentation)
- [Frontend Error Recovery System](#frontend-error-recovery-system)

---

## Overview

The artifact validation system uses **structured error codes** instead of string matching for type-safe error handling. This provides:

- ✅ **Type Safety**: Compile-time validation prevents typos
- ✅ **Consistency**: Centralized error code definitions
- ✅ **Internationalization**: Easy to translate by error code
- ✅ **Analytics**: Track error frequency by structured code
- ✅ **Fail-Closed Security**: Unknown errors treated as critical by default

**Key Benefits**:

1. **No False Positives**: Error codes prevent substring matching issues (e.g., "Direct array assignment to React ref" won't match "Direct array assignment" pattern)
2. **Type-Safe Filtering**: TypeScript enforces valid error codes at compile time
3. **Clear Intent**: Error code names explicitly describe the issue category

---

## Error Code Schema

Error codes follow a consistent naming convention:

```
CATEGORY_SPECIFIC_ISSUE
```

**Format Rules**:
- All uppercase with underscores
- Category prefix identifies the error domain
- Specific issue describes the exact problem
- Must be defined in `VALIDATION_ERROR_CODES` constant

**Examples**:
```typescript
RESERVED_KEYWORD_EVAL         // Category: RESERVED_KEYWORD, Issue: EVAL
IMPORT_LOCAL_PATH             // Category: IMPORT, Issue: LOCAL_PATH
IMMUTABILITY_ARRAY_ASSIGNMENT // Category: IMMUTABILITY, Issue: ARRAY_ASSIGNMENT
```

**Categories**:
- `RESERVED_KEYWORD`: Strict mode keyword violations
- `IMPORT`: Import statement issues
- `STORAGE`: Browser storage API usage
- `IMMUTABILITY`: Array/object mutation patterns

---

## Complete Error Code Reference

### Reserved Keyword Errors (`RESERVED_KEYWORD_*`)

Detects usage of JavaScript strict mode reserved keywords as variable names. These errors **always block** artifact rendering because they cause runtime failures in strict mode.

| Code | Severity | Description | Example | Fix |
|------|----------|-------------|---------|-----|
| `RESERVED_KEYWORD_EVAL` | **Error (Blocking)** | Using `eval` as a variable name | `const eval = calculateScore();` | Replace with `score`, `value`, or `evaluation` |
| `RESERVED_KEYWORD_ARGUMENTS` | **Error (Blocking)** | Using `arguments` as a variable name | `const arguments = getArgs();` | Replace with `args` or `params` |
| `RESERVED_KEYWORD_OTHER` | **Error (Blocking)** | Using other reserved keywords (implements, interface, package, private, protected, public, static, yield, await) | `const interface = createAPI();` | Rename to a non-reserved identifier |

**Auto-fix**: Yes (automatically renames `eval` → `score`, `arguments` → `args`)

**Why Blocking**: Reserved keywords in strict mode throw `SyntaxError` or `TypeError` at runtime, completely preventing artifact execution.

**Validation Location**: `detectReservedKeywords()` in `artifact-validator.ts` (lines 177-224)

---

### Import Errors (`IMPORT_*`)

Detects invalid or unsupported import patterns in artifact code. These errors **always block** rendering because they prevent bundling or cause module resolution failures.

| Code | Severity | Description | Example | Fix |
|------|----------|-------------|---------|-----|
| `IMPORT_LOCAL_PATH` | **Error (Blocking)** | Local `@/` path imports not available in sandbox | `import { Button } from "@/components/ui/button"` | Use npm package: `import * as Dialog from '@radix-ui/react-dialog'` |
| `IMPORT_REACT_UNNECESSARY` | **Warning** | React import not needed (React is global) | `import React from 'react'` | Use destructuring: `const { useState } = React;` |
| `IMPORT_CONST_STAR_SYNTAX` | **Error (Blocking)** | Invalid `const * as` syntax (GLM bug) | `const * as Dialog from '@radix-ui/react-dialog';` | Fix to: `import * as Dialog from '@radix-ui/react-dialog';` |
| `IMPORT_UNQUOTED_PACKAGE` | **Error (Blocking)** | Unquoted package name in import | `import { useState } from React;` | Add quotes: `from 'react';` |

**Auto-fix**: Yes (transforms `const * as` → `import * as`, adds quotes to package names, removes unnecessary React imports)

**Why Blocking**: Import errors prevent the transpiler/bundler from parsing the code or resolving dependencies, causing complete rendering failures.

**Validation Location**: `detectProblematicPatterns()` in `artifact-validator.ts` (lines 230-246)

**Pre-validation Fix**: `preValidateAndFixGlmSyntax()` catches these before client-side validation (lines 825-921)

---

### Storage API Errors (`STORAGE_*`)

Detects usage of browser storage APIs that are not supported in the artifact sandbox environment.

| Code | Severity | Description | Example | Fix |
|------|----------|-------------|---------|-----|
| `STORAGE_LOCAL_STORAGE` | **Error (Blocking)** | `localStorage` not supported in sandbox | `localStorage.setItem('key', value)` | Use React state: `const [value, setValue] = useState()` |
| `STORAGE_SESSION_STORAGE` | **Error (Blocking)** | `sessionStorage` not supported in sandbox | `sessionStorage.getItem('key')` | Use React state: `const [value, setValue] = useState()` |

**Auto-fix**: No (requires architectural changes - manual refactoring via `generate-artifact-fix`)

**Why Blocking**: Storage APIs are not available in the sandboxed iframe environment. Calling them throws `ReferenceError: localStorage is not defined`.

**Validation Location**: `detectProblematicPatterns()` in `artifact-validator.ts` (lines 132-142)

---

### Immutability Violations (`IMMUTABILITY_*`)

Detects array/object mutation patterns that violate React strict mode immutability principles. These errors are **non-blocking** because they only cause warnings, not crashes.

| Code | Severity | Description | Example | Fix |
|------|----------|-------------|---------|-----|
| `IMMUTABILITY_ARRAY_ASSIGNMENT` | **Error (Non-Blocking)** | Direct array element assignment | `board[i] = 'X';` | Use spread: `const newBoard = [...board]; newBoard[i] = 'X'; setBoard(newBoard);` |
| `IMMUTABILITY_ARRAY_PUSH` | **Error (Non-Blocking)** | Array.push() mutates original | `tasks.push(newTask);` | Use spread: `setTasks([...tasks, newTask]);` |
| `IMMUTABILITY_ARRAY_SPLICE` | **Error (Non-Blocking)** | Array.splice() mutates original | `items.splice(2, 1);` | Use filter: `setItems(items.filter((_, i) => i !== 2));` |
| `IMMUTABILITY_ARRAY_SORT` | **Error (Non-Blocking)** | Array.sort() mutates original | `numbers.sort();` | Use spread: `setNumbers([...numbers].sort());` |
| `IMMUTABILITY_ARRAY_REVERSE` | **Error (Non-Blocking)** | Array.reverse() mutates original | `items.reverse();` | Use spread: `setItems([...items].reverse());` |
| `IMMUTABILITY_ARRAY_POP` | **Error (Non-Blocking)** | Array.pop() mutates original | `stack.pop();` | Use slice: `setStack(stack.slice(0, -1));` |
| `IMMUTABILITY_ARRAY_SHIFT` | **Error (Non-Blocking)** | Array.shift() mutates original | `queue.shift();` | Use slice: `setQueue(queue.slice(1));` |
| `IMMUTABILITY_ARRAY_UNSHIFT` | **Error (Non-Blocking)** | Array.unshift() mutates original | `items.unshift(newItem);` | Use spread: `setItems([newItem, ...items]);` |

**Auto-fix**: Partial
- ✅ Direct array assignment (`board[i] = value`) - creates immutable copy
- ✅ Array.sort() - wraps in spread operator (`[...array].sort()`)
- ❌ Complex patterns (multiple mutations of same array) - skipped to prevent "Identifier already declared" errors
- ❌ Other methods (push, splice, etc.) - require manual refactoring

**Why Non-Blocking**:
- Immutability violations only cause React strict mode **warnings**, not crashes
- Complex algorithms (e.g., minimax, game AI) may have unavoidable mutations that work correctly in production
- Artifacts render and function properly despite the warnings

**Validation Location**: `detectMutationPatterns()` in `artifact-validator.ts` (lines 460-576)

**Auto-fix Logic**: `autoFixMutations()` in `artifact-validator.ts` (lines 643-734)

**Skip Conditions**:
- Multiple mutations of the same array (prevents duplicate `const newArray` declarations)
- Variables starting with `new`, `copy`, `updated`, `cloned` (already immutable copies)

---

## Error Severity Levels

| Severity | Behavior | Usage |
|----------|----------|-------|
| **Error** | Indicates a serious issue | Both blocking and non-blocking errors |
| **Warning** | Suggests improvement but doesn't prevent rendering | Best practices, optimization hints |

**Important**: "Error" severity doesn't always mean blocking! See [Blocking vs Non-Blocking Errors](#blocking-vs-non-blocking-errors).

---

## Blocking vs Non-Blocking Errors

The validation system distinguishes between two classes of errors:

### Blocking Errors (Critical)

**Definition**: Errors that prevent artifact from rendering or cause runtime crashes.

**Behavior**: Artifact generation fails, user receives error message.

**Examples**:
- Reserved keyword violations → `SyntaxError`
- Invalid imports → Module resolution failure
- Storage API calls → `ReferenceError`

**Implementation**:
```typescript
// In artifact-executor.ts (lines 84-94)
const NON_BLOCKING_ERROR_CODES: ReadonlySet<ValidationErrorCode> = new Set([
  // Only immutability codes listed here
]);

function filterCriticalIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => {
    // FAIL-CLOSED: No code = treat as critical
    if (!issue.code) return true;

    // Only exclude explicitly non-blocking codes
    return !NON_BLOCKING_ERROR_CODES.has(issue.code);
  });
}
```

### Non-Blocking Errors (Warnings)

**Definition**: Errors that cause React strict mode warnings but don't crash artifacts.

**Behavior**: Artifact renders successfully, warnings logged to console.

**Examples**:
- All `IMMUTABILITY_*` errors
- Direct array assignments in complex algorithms (minimax, sorting)

**Rationale**: Complex game logic may require mutations for performance/clarity. These work correctly in production mode.

**Validation Override**: When only non-blocking errors remain, validation is overridden:

```typescript
// In artifact-executor.ts (lines 677-704)
const criticalIssues = filterCriticalIssues(revalidation.issues);

if (criticalIssues.length === 0) {
  // Only immutability warnings remain - mark as valid
  validation = {
    ...revalidation,
    valid: true,
    overridden: true,
    overrideReason: 'only-immutability-warnings',
  };
}
```

---

## How to Add New Error Codes

Follow these steps when adding a new validation error:

### 1. Define the Error Code

Add to `VALIDATION_ERROR_CODES` in `artifact-validator.ts`:

```typescript
export const VALIDATION_ERROR_CODES = {
  // Existing codes...

  // New category
  NEW_CATEGORY_SPECIFIC_ISSUE: 'NEW_CATEGORY_SPECIFIC_ISSUE',
} as const;
```

### 2. Add Detection Logic

Create or update detection function to include the `code` field:

```typescript
function detectNewIssue(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (/* condition */) {
    issues.push({
      severity: 'error',
      message: 'Human-readable error message',
      line: lineNumber, // Optional
      suggestion: 'How to fix this issue',
      code: VALIDATION_ERROR_CODES.NEW_CATEGORY_SPECIFIC_ISSUE // ← REQUIRED
    });
  }

  return issues;
}
```

### 3. Add Auto-Fix (Optional)

If the issue can be automatically fixed, add logic to `autoFixArtifactCode()`:

```typescript
export function autoFixArtifactCode(code: string): { fixed: string; changes: string[] } {
  let fixed = code;
  const changes: string[] = [];

  // Detection pattern
  if (/pattern/.test(fixed)) {
    fixed = fixed.replace(/pattern/g, 'replacement');
    changes.push('Description of fix applied');
  }

  return { fixed, changes };
}
```

### 4. Mark as Non-Blocking (If Applicable)

If the error shouldn't prevent rendering, add to `NON_BLOCKING_ERROR_CODES` in `artifact-executor.ts`:

```typescript
const NON_BLOCKING_ERROR_CODES: ReadonlySet<ValidationErrorCode> = new Set([
  // Existing codes...
  VALIDATION_ERROR_CODES.NEW_CATEGORY_SPECIFIC_ISSUE, // Only if truly non-blocking
]);
```

**⚠️ WARNING**: Only add codes here if:
- Issue doesn't crash artifacts
- Artifact functions correctly despite the warning
- Used for complex algorithms where mutations are unavoidable

### 5. Update Documentation

Add the new error code to this document under the appropriate category section.

### 6. Add Tests

Add test cases to validate detection and auto-fix:

```typescript
// In artifact-validator.test.ts
describe('New Error Detection', () => {
  it('should detect new error pattern', () => {
    const code = '/* problematic code */';
    const result = validateArtifactCode(code, 'react');

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe(VALIDATION_ERROR_CODES.NEW_CATEGORY_SPECIFIC_ISSUE);
  });
});
```

---

## Migration from String Matching

### Before (Fragile String Matching)

**Problem**: Substring matching caused false positives and was not type-safe.

```typescript
// ❌ OLD APPROACH - Fragile and error-prone
const criticalIssues = revalidation.issues.filter((issue) => {
  // String matching can accidentally match unrelated errors
  // Example: "Direct array assignment to React ref" matches "Direct array assignment"
  return !issue.message.includes('Direct array assignment') &&
         !issue.message.includes('mutates the original array');
});
```

**Issues**:
1. **False Positives**: "Direct array assignment to React ref" incorrectly matched "Direct array assignment" pattern
2. **No Type Safety**: Typos in strings silently fail
3. **Hard to Maintain**: Finding all string references is difficult
4. **No Compile-Time Validation**: Can't enforce valid error messages

### After (Structured Error Codes)

**Solution**: Type-safe error codes with explicit filtering.

```typescript
// ✅ NEW APPROACH - Type-safe and precise
const NON_BLOCKING_ERROR_CODES: ReadonlySet<ValidationErrorCode> = new Set([
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_ASSIGNMENT,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_PUSH,
  // ... other non-blocking codes
]);

function filterCriticalIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => {
    // FAIL-CLOSED: No code = treat as critical
    if (!issue.code) return true;

    // Only exclude explicitly non-blocking codes
    return !NON_BLOCKING_ERROR_CODES.has(issue.code);
  });
}
```

**Benefits**:
1. **No False Positives**: Exact code matching prevents substring issues
2. **Type Safety**: TypeScript enforces valid error codes at compile time
3. **Easy Maintenance**: All codes defined in one place (`VALIDATION_ERROR_CODES`)
4. **Fail-Closed Security**: Unknown errors (no code) treated as critical by default

---

## Error Handling Best Practices

### 1. Always Include Error Codes

When creating `ValidationIssue` objects, **always** include the `code` field:

```typescript
// ✅ CORRECT
issues.push({
  severity: 'error',
  message: 'Reserved keyword "eval" used as variable name',
  suggestion: 'Use "score" or "value" instead',
  code: VALIDATION_ERROR_CODES.RESERVED_KEYWORD_EVAL // ← Always include
});

// ❌ WRONG (will be treated as critical/blocking due to fail-closed behavior)
issues.push({
  severity: 'error',
  message: 'Reserved keyword "eval" used as variable name',
  // Missing code field
});
```

### 2. Fail-Closed Security

Issues without error codes are **automatically treated as blocking**:

```typescript
if (!issue.code) {
  // FAIL-CLOSED: Treat as critical
  return true;
}
```

This ensures new error types don't accidentally bypass validation.

### 3. Use Type-Safe Filtering

Always use the `filterCriticalIssues()` helper instead of string matching:

```typescript
// ✅ CORRECT
const criticalIssues = filterCriticalIssues(validation.issues);

// ❌ WRONG
const criticalIssues = validation.issues.filter(i =>
  !i.message.includes('mutation') // Fragile!
);
```

### 4. Document Non-Blocking Rationale

When adding codes to `NON_BLOCKING_ERROR_CODES`, add a comment explaining why:

```typescript
const NON_BLOCKING_ERROR_CODES: ReadonlySet<ValidationErrorCode> = new Set([
  // Immutability violations - only cause strict mode warnings, don't crash artifacts
  // Complex algorithms (e.g., minimax) may have unavoidable mutations
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_ASSIGNMENT,
]);
```

### 5. Test Both Detection and Auto-Fix

Ensure tests cover:
- Error detection
- Error code assignment
- Auto-fix logic (if applicable)
- Non-blocking behavior (if applicable)

```typescript
describe('Error Code System', () => {
  it('should assign correct error code', () => {
    const code = 'const eval = 5;';
    const result = validateArtifactCode(code, 'react');

    expect(result.issues[0].code).toBe(VALIDATION_ERROR_CODES.RESERVED_KEYWORD_EVAL);
  });

  it('should auto-fix and preserve code', () => {
    const code = 'const eval = 5;';
    const { fixed, changes } = autoFixArtifactCode(code);

    expect(fixed).toContain('const score = 5;');
    expect(changes).toContain('Replaced variable name \'eval\' with \'score\'');

    // Re-validate to ensure code is assigned
    const result = validateArtifactCode(fixed, 'react');
    expect(result.valid).toBe(true);
  });
});
```

---

## Frontend Error Recovery System

The frontend error recovery system (`src/utils/artifactErrorRecovery.ts`) classifies runtime errors to provide user-friendly messages and determine recovery strategies. Unlike the backend validation system which prevents errors, this system handles errors that occur during artifact rendering.

### Error Categories

The frontend uses a rule-based classification system where patterns are matched against error messages. Rules are evaluated in order (first match wins), so more specific patterns must come before generic ones.

### Duplicate Declaration Errors

**Category**: `duplicate-declaration` (renamed from `duplicate-import` in 2025-12-28)

**Why Renamed**: The original name was misleading because the same error pattern matches BOTH:
- Duplicate imports: `import { X, X } from '...'`
- Variable redeclarations: `const x = 1; const x = 2;`

Using `duplicate-declaration` provides honest UX messaging that doesn't incorrectly claim the issue is an "import" when it might be a variable.

**Engine-Specific Error Messages**:

Different JavaScript engines produce different error messages for the same issue. The system detects all variants:

| Engine | Browser | Error Message Format | Example |
|--------|---------|---------------------|---------|
| JavaScriptCore | Safari | `"Cannot declare a lexical variable twice: 'X'"` | `Cannot declare a lexical variable twice: 'count'` |
| V8 | Chrome, Edge, Node.js | `"Identifier 'X' has already been declared"` | `Identifier 'count' has already been declared` |
| SpiderMonkey | Firefox | `"redeclaration of let X"` or `"redeclaration of const X"` | `redeclaration of let count` |
| TypeScript | All | `"Duplicate identifier"` | `Duplicate identifier 'count'` |

**Detection Triggers**:

```typescript
// From src/utils/artifactErrorRecovery.ts
patterns: [
  'cannot declare a lexical variable twice',  // Safari/JSC
  'has already been declared',                // Chrome/V8
  'redeclaration of let',                     // Firefox let
  'redeclaration of const',                   // Firefox const
  'duplicate identifier',                     // TypeScript
]
```

**Backend Patterns** (from `supabase/functions/_shared/artifact-rules/error-patterns.ts`):

```typescript
'duplicate-declaration': {
  triggers: [
    'cannot declare a lexical variable twice',   // Safari - most specific (42 chars = highest score)
    'identifier.*has already been declared',     // Chrome - includes variable name context
    'redeclaration of let',                      // Firefox let
    'redeclaration of const',                    // Firefox const
    'duplicate identifier',                      // TypeScript
  ],
  patterns: [
    'Find the duplicate identifier mentioned in the error message',
    'For duplicate imports: import { X, X } from "..." → import { X } from "..."',
    'For separate imports: Combine into single import or remove one',
    'For variable duplicates: Remove the second declaration or rename it',
    'Check if a variable shadows an import name - rename the variable',
    'For function duplicates: Remove or rename one of the function declarations'
  ]
}
```

**Recovery Strategy**: `with-fix` - AI can automatically fix this error

**User Message**: `"Duplicate declaration detected. AI can fix this."`

### Other Frontend Error Categories

| Category | Patterns | Recovery Strategy |
|----------|----------|-------------------|
| `syntax` | `syntaxerror`, `unexpected token` | `with-fix` |
| `import` | `failed to resolve`, `module not found`, `cannot find module` | `different-renderer` |
| `react` | `invalid hook call`, `hooks can only be called` | `with-fix` |
| `timeout` | `timeout`, `bundle timeout` | `different-renderer` |
| `bundling` | `bundling failed`, `bundle error` | `different-renderer` |
| `runtime` | `typeerror`, `referenceerror`, `is not defined` | `with-fix` |

**Implementation Note**: The `duplicate-declaration` rule is placed BEFORE the generic `syntax` rule in `ERROR_RULES` array because duplicate declaration errors may contain "syntaxerror" in some messages. First-match-wins semantics ensures specific patterns take precedence.

---

## Related Documentation

- **Artifact Validation**: `.claude/artifact-import-restrictions.md` - Complete guide to artifact restrictions
- **CLAUDE.md**: `CLAUDE.md` (lines 382+) - 5-Layer Artifact Validation overview
- **API Reference**: `docs/API_REFERENCE.md` - Edge Function API documentation
- **Troubleshooting**: `docs/TROUBLESHOOTING.md` - Common artifact errors and solutions

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-28 | Added Frontend Error Recovery System section; documented `duplicate-declaration` category rename and engine-specific error messages | Claude Code |
| 2025-12-27 | Initial documentation of structured error code system | Claude Code |
| 2025-12-27 | Replaced fragile string matching with error codes (commit b1f86ad) | Claude Code |
