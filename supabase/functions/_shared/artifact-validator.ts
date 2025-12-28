/**
 * Artifact Code Validator
 *
 * Post-generation validation to catch common issues that might break artifacts
 * in the browser. This acts as a safety net for AI-generated code.
 */

import { transform } from "npm:sucrase@3.35.0";

// ============================================================================
// VALIDATION ERROR CODES
// ============================================================================
// These codes provide structured identification of validation issues,
// enabling type-safe filtering in artifact-executor.ts instead of fragile
// string matching on error messages.
//
// Naming convention: CATEGORY_SPECIFIC_ISSUE
// Categories: RESERVED_KEYWORD, IMPORT, STORAGE, SYNTAX, IMMUTABILITY
//
// IMPORTANT: When adding new error codes:
// 1. Add the code constant here
// 2. Update the validation function to include the code in the issue
// 3. If non-blocking, add to NON_BLOCKING_ERROR_CODES in artifact-executor.ts
// ============================================================================

/**
 * Error codes for validation issues.
 * Used for structured filtering instead of fragile string matching.
 */
export const VALIDATION_ERROR_CODES = {
  // Reserved keyword violations (blocking - these break strict mode)
  RESERVED_KEYWORD_EVAL: 'RESERVED_KEYWORD_EVAL',
  RESERVED_KEYWORD_ARGUMENTS: 'RESERVED_KEYWORD_ARGUMENTS',
  RESERVED_KEYWORD_OTHER: 'RESERVED_KEYWORD_OTHER',

  // Import violations (blocking - these prevent bundling/rendering)
  IMPORT_LOCAL_PATH: 'IMPORT_LOCAL_PATH',
  IMPORT_REACT_UNNECESSARY: 'IMPORT_REACT_UNNECESSARY',
  IMPORT_CONST_STAR_SYNTAX: 'IMPORT_CONST_STAR_SYNTAX',
  IMPORT_UNQUOTED_PACKAGE: 'IMPORT_UNQUOTED_PACKAGE',

  // Storage violations (blocking - not supported in sandbox)
  STORAGE_LOCAL_STORAGE: 'STORAGE_LOCAL_STORAGE',
  STORAGE_SESSION_STORAGE: 'STORAGE_SESSION_STORAGE',

  // Immutability violations (NON-BLOCKING - only cause React strict mode warnings)
  // These are explicitly marked non-blocking in artifact-executor.ts
  IMMUTABILITY_ARRAY_ASSIGNMENT: 'IMMUTABILITY_ARRAY_ASSIGNMENT',
  IMMUTABILITY_ARRAY_PUSH: 'IMMUTABILITY_ARRAY_PUSH',
  IMMUTABILITY_ARRAY_SPLICE: 'IMMUTABILITY_ARRAY_SPLICE',
  IMMUTABILITY_ARRAY_SORT: 'IMMUTABILITY_ARRAY_SORT',
  IMMUTABILITY_ARRAY_REVERSE: 'IMMUTABILITY_ARRAY_REVERSE',
  IMMUTABILITY_ARRAY_POP: 'IMMUTABILITY_ARRAY_POP',
  IMMUTABILITY_ARRAY_SHIFT: 'IMMUTABILITY_ARRAY_SHIFT',
  IMMUTABILITY_ARRAY_UNSHIFT: 'IMMUTABILITY_ARRAY_UNSHIFT',
} as const;

export type ValidationErrorCode = typeof VALIDATION_ERROR_CODES[keyof typeof VALIDATION_ERROR_CODES];

/**
 * Validation issue with optional structured error code.
 * The `code` field enables type-safe filtering in artifact-executor.ts.
 *
 * BACKWARD COMPATIBILITY: Older validation paths may not include `code`.
 * The filtering logic in artifact-executor.ts treats issues without codes
 * as critical (fail-closed behavior) to ensure safety.
 */
export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  line?: number;
  suggestion?: string;
  /**
   * Structured error code for type-safe filtering.
   * If undefined, the issue is treated as critical (fail-closed).
   * @see VALIDATION_ERROR_CODES for available codes
   */
  code?: ValidationErrorCode;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  canAutoFix: boolean;
  overridden?: boolean;        // Tracks when validation was overridden despite warnings (Issue #2)
  overrideReason?: string;     // Explains why validation was overridden (e.g., 'only-immutability-warnings')
}

/**
 * Strict mode reserved keywords that cannot be used as variable names
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
 */
const STRICT_MODE_RESERVED = [
  'eval',
  'arguments',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield'
];

/**
 * Future reserved words (for completeness)
 */
const FUTURE_RESERVED = [
  'enum',
  'await'
];

/**
 * Patterns that commonly indicate issues in React artifacts.
 * Each pattern includes an error code for structured filtering.
 */
const PROBLEMATIC_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning';
  code: ValidationErrorCode;
}> = [
  {
    pattern: /import\s+.*\s+from\s+['"]@\/components/gi,
    message: 'Local @/ imports are not available in artifacts. Use Radix UI primitives instead.',
    severity: 'error',
    code: VALIDATION_ERROR_CODES.IMPORT_LOCAL_PATH
  },
  {
    pattern: /localStorage\.(getItem|setItem|removeItem)/gi,
    message: 'localStorage is not supported in artifacts. Use React state instead.',
    severity: 'error',
    code: VALIDATION_ERROR_CODES.STORAGE_LOCAL_STORAGE
  },
  {
    pattern: /sessionStorage\.(getItem|setItem|removeItem)/gi,
    message: 'sessionStorage is not supported in artifacts. Use React state instead.',
    severity: 'error',
    code: VALIDATION_ERROR_CODES.STORAGE_SESSION_STORAGE
  },
  {
    pattern: /import\s+React\s+from\s+['"]react['"]/gi,
    message: 'React imports not needed. Use: const { useState, useEffect } = React;',
    severity: 'warning',
    code: VALIDATION_ERROR_CODES.IMPORT_REACT_UNNECESSARY
  },
  {
    // GLM generates invalid "const * as X from 'pkg'" syntax - must be caught and fixed
    // Uses \s* at start to handle indentation, optional semicolon and trailing whitespace
    pattern: /^\s*const\s*\*\s*as\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm,
    message: 'Invalid import syntax: "const * as" should be "import * as"',
    severity: 'error',
    code: VALIDATION_ERROR_CODES.IMPORT_CONST_STAR_SYNTAX
  },
  {
    // GLM generates unquoted package names like "from React;" instead of "from 'react';"
    pattern: /from\s+React\s*;/g,
    message: 'Unquoted package name in import statement',
    severity: 'error',
    code: VALIDATION_ERROR_CODES.IMPORT_UNQUOTED_PACKAGE
  },
  {
    // Also catch unquoted ReactDOM
    pattern: /from\s+ReactDOM\s*;/g,
    message: 'Unquoted package name in import statement',
    severity: 'error',
    code: VALIDATION_ERROR_CODES.IMPORT_UNQUOTED_PACKAGE
  }
];

/**
 * Detects usage of strict mode reserved keywords as variable names.
 * Returns issues with structured error codes for type-safe filtering.
 */
function detectReservedKeywords(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = code.split('\n');

  const allReserved = [...STRICT_MODE_RESERVED, ...FUTURE_RESERVED];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for variable declarations
    for (const keyword of allReserved) {
      // Patterns to match: const eval = ..., let eval = ..., var eval = ..., function eval(...), eval =>
      const patterns = [
        new RegExp(`\\b(const|let|var)\\s+${keyword}\\s*=`, 'g'),
        new RegExp(`\\bfunction\\s+${keyword}\\s*\\(`, 'g'),
        new RegExp(`\\b${keyword}\\s*=>`, 'g'),
        new RegExp(`\\(.*\\b${keyword}\\b.*\\)\\s*=>`, 'g') // Arrow function parameters
      ];

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          // Determine the appropriate error code based on the keyword
          let errorCode: ValidationErrorCode;
          if (keyword === 'eval') {
            errorCode = VALIDATION_ERROR_CODES.RESERVED_KEYWORD_EVAL;
          } else if (keyword === 'arguments') {
            errorCode = VALIDATION_ERROR_CODES.RESERVED_KEYWORD_ARGUMENTS;
          } else {
            errorCode = VALIDATION_ERROR_CODES.RESERVED_KEYWORD_OTHER;
          }

          issues.push({
            severity: 'error',
            message: `Reserved keyword '${keyword}' used as variable name in strict mode`,
            line: lineNumber,
            suggestion: keyword === 'eval'
              ? `Use 'score', 'value', or 'evaluation' instead of '${keyword}'`
              : `Rename '${keyword}' to a different variable name`,
            code: errorCode
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Detects known problematic patterns in artifact code.
 * Returns issues with structured error codes for type-safe filtering.
 */
function detectProblematicPatterns(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const { pattern, message, severity, code: errorCode } of PROBLEMATIC_PATTERNS) {
    const matches = code.match(pattern);
    if (matches) {
      issues.push({
        severity,
        message: `${message} (found ${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
        suggestion: 'Review artifact restrictions in system prompt',
        code: errorCode
      });
    }
  }

  return issues;
}

/**
 * Strip TypeScript syntax and transpile JSX using Sucrase
 *
 * IMPORTANT: This function applies two transforms:
 * 1. 'typescript' transform: Strips type annotations only if TypeScript syntax is detected
 * 2. 'jsx' transform: Transpiles JSX to React.createElement() calls (ALWAYS applied -
 *    technically required for Sucrase to parse JSX, but outputs transpiled JSX even
 *    for pure JS input)
 *
 * Returns {stripped: true} only if TypeScript syntax was actually removed.
 * The code may be modified (JSX transpiled) even when stripped=false.
 */
function stripTypeScriptWithSucrase(code: string): { code: string; stripped: boolean; error?: string } {
  try {
    // NOTE: We include 'jsx' transform for two reasons:
    // 1. Sucrase requires it to PARSE JSX syntax (technical limitation)
    // 2. Server-side validation doesn't need to preserve JSX - transpiling to
    //    React.createElement() is acceptable since we only validate the logic,
    //    not the exact syntax representation
    // Client-side rendering will separately transpile JSX with proper pragmas.
    const result = transform(code, {
      transforms: ['typescript', 'jsx'],   // Strip types + transpile JSX (required for parsing)
      disableESTransforms: true,           // Don't transpile ES features (keep modern syntax)
      jsxPragma: 'React.createElement',    // Standard React createElement call
      jsxFragmentPragma: 'React.Fragment', // Standard React Fragment
    });

    // Check if Sucrase actually modified the code (stripped TypeScript syntax)
    // If output is identical to input, no TypeScript syntax was present
    const actuallyStripped = result.code !== code;

    return { code: result.code, stripped: actuallyStripped };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error with full context
    console.error('[artifact-validator] Sucrase TS strip failed - artifact may have syntax errors:', {
      error: errorMessage,
      codePreview: code.substring(0, 200),
      codeLength: code.length,
    });

    // Return error info for upstream handling
    return {
      code,
      stripped: false,
      error: errorMessage,
    };
  }
}

/**
 * Removes duplicate named imports from import statements.
 * Handles both simple and aliased imports.
 *
 * Example: `import { Mail, User, Mail }` → `import { Mail, User }`
 * Example: `import { X as A, Y, X as B }` → `import { X as A, Y }`
 *
 * @param code - The source code to fix
 * @returns Fixed code and whether any duplicates were removed
 */
function removeDuplicateImports(code: string): { code: string; duplicatesRemoved: boolean; count: number } {
  let duplicatesRemoved = false;
  let totalCount = 0;

  // Match import statements with named imports: import { ... } from '...'
  // Captures: full match, the imports between braces, the rest of the statement
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*(['"][^'"]+['"])/g;

  const fixed = code.replace(importRegex, (match, imports: string, source: string) => {
    // Split imports by comma and clean up whitespace
    const importList = imports.split(',').map((i: string) => i.trim()).filter(Boolean);

    const seen = new Set<string>();
    const unique: string[] = [];
    let localDuplicates = 0;

    for (const imp of importList) {
      // Handle aliased imports like "Original as Alias"
      // The key for deduplication is the original name (before 'as')
      const originalName = imp.split(/\s+as\s+/)[0].trim();

      if (originalName && !seen.has(originalName)) {
        seen.add(originalName);
        unique.push(imp);
      } else if (originalName) {
        localDuplicates++;
      }
    }

    if (localDuplicates > 0) {
      duplicatesRemoved = true;
      totalCount += localDuplicates;
      // Reconstruct the import statement with unique imports
      return `import { ${unique.join(', ')} } from ${source}`;
    }

    return match; // No duplicates, return original
  });

  return { code: fixed, duplicatesRemoved, count: totalCount };
}

/**
 * Attempts to auto-fix common issues in artifact code
 */
export function autoFixArtifactCode(code: string): { fixed: string; changes: string[] } {
  let fixed = code;
  const changes: string[] = [];

  // PHASE 1: Strip TypeScript syntax FIRST (before other fixes)
  // This is important because Sucrase works best on complete, unmodified code
  // Strategy: Try Sucrase first (AST-based, more reliable), fall back to regex
  const sucraseResult = stripTypeScriptWithSucrase(code);

  if (sucraseResult.error) {
    console.warn('[artifact-validator] Using regex TypeScript stripping due to Sucrase error:', sucraseResult.error);
    changes.push(`TypeScript stripping fell back to regex due to: ${sucraseResult.error}`);
  }

  if (sucraseResult.stripped) {
    // Sucrase succeeded - use its output and continue with other fixes
    fixed = sucraseResult.code;
    changes.push('Stripped TypeScript syntax using Sucrase (AST-based)');
  } else if (/:\s*[A-Za-z]|<[A-Z][^<>]*>|interface\s+\w+|type\s+\w+\s*=|\s+as\s+[A-Za-z]/.test(code)) {
    // Sucrase failed but code has TypeScript syntax - fall back to regex patterns
    // Detects: type annotations (: Type or : string), generics (<Type>), interfaces, type aliases, type assertions (as Type)
    let regexStripped = false;

    // Strip generic type parameters from function calls: useState<Type>() → useState()
    // Handles: useState<Task[]>, useRef<HTMLDivElement>, etc.
    if (/<[A-Z][^>]*>(?=\s*\()/.test(fixed)) {
      fixed = fixed.replace(/<[A-Z][A-Za-z\[\]|&\s,<>]*>(?=\s*\()/g, '');
      regexStripped = true;
    }

    // Strip type annotations from variable declarations: const x: Type = → const x =
    // Handles: const [state, setState]: [Type, Function] = useState()
    if (/:\s*[A-Z][A-Za-z\[\]|&<>,\s'"]*(?=\s*[=;,)\]])/.test(fixed)) {
      fixed = fixed.replace(/:\s*[A-Z][A-Za-z\[\]|&<>,\s'"]*(?=\s*[=;,)\]])/g, '');
      regexStripped = true;
    }

    // Strip type annotations from function parameters: (x: Type) → (x)
    // Handles: (e: React.MouseEvent) → (e), (item: Task, index: number) → (item, index)
    if (/\(\s*\w+\s*:\s*[A-Za-z][A-Za-z0-9\[\]|&<>,.\s]*/.test(fixed)) {
      fixed = fixed.replace(/(\w+)\s*:\s*[A-Za-z][A-Za-z0-9\[\]|&<>,.\s]*(?=[,)])/g, '$1');
      regexStripped = true;
    }

    // Strip type assertions: value as Type → value
    // IMPORTANT: Use negative lookbehind to avoid matching namespace imports
    // (?<!\*) prevents matching "* as Dialog" (namespace import)
    // The negative lookahead (?!\s*from) prevents matching "as X from" (import patterns)
    // Matches:
    //   - Simple types: as string, as SomeType
    //   - Generic types: as Array<User>, as Map<string, number>
    //   - Tuple types: as [string, number]
    if (/(?<!\*)\s+as\s+(?:[A-Za-z_][\w]*(?:<[^>]+>)?(?:\[[^\]]*\])?|(?:\[[^\]]+\]))(?!\s*from)/.test(fixed)) {
      fixed = fixed.replace(/(?<!\*)\s+as\s+(?:[A-Za-z_][\w]*(?:<[^>]+>)?(?:\[[^\]]*\])?|(?:\[[^\]]+\]))(?!\s*from)/g, '');
      regexStripped = true;
    }

    // Strip interface declarations: interface X {...} → (remove entirely)
    if (/^interface\s+\w+\s*\{[\s\S]*?\n\}/gm.test(fixed)) {
      fixed = fixed.replace(/^interface\s+\w+\s*\{[\s\S]*?\n\}/gm, '');
      regexStripped = true;
    }

    // Strip type alias declarations: type X = ... → (remove entirely)
    if (/^type\s+\w+\s*=\s*[^;]+;/gm.test(fixed)) {
      fixed = fixed.replace(/^type\s+\w+\s*=\s*[^;]+;/gm, '');
      regexStripped = true;
    }

    if (regexStripped) {
      changes.push('Stripped TypeScript syntax using regex fallback');
    }
  }

  // PHASE 2: Fix GLM-specific syntax bugs (after TypeScript stripping)

  // Fix: Remove duplicate named imports (GLM bug: "import { Mail, User, Mail }")
  // This must happen before transpilation as duplicates cause SyntaxError
  const duplicateResult = removeDuplicateImports(fixed);
  if (duplicateResult.duplicatesRemoved) {
    fixed = duplicateResult.code;
    changes.push(`Removed ${duplicateResult.count} duplicate import(s)`);
    console.log(`[artifact-validator] Fixed ${duplicateResult.count} duplicate import(s)`);
  }

  // Fix: Replace 'eval' with 'score' in variable declarations
  const evalPattern = /\b(const|let|var)\s+eval\s*=/g;
  if (evalPattern.test(fixed)) {
    fixed = fixed.replace(evalPattern, '$1 score =');
    changes.push("Replaced variable name 'eval' with 'score'");
  }

  // Fix: Replace 'arguments' with 'args' in variable declarations
  const argsPattern = /\b(const|let|var)\s+arguments\s*=/g;
  if (argsPattern.test(fixed)) {
    fixed = fixed.replace(argsPattern, '$1 args =');
    changes.push("Replaced variable name 'arguments' with 'args'");
  }

  // Fix: Remove unnecessary React imports
  const reactImportPattern = /import\s+React\s+from\s+['"]react['"];?\s*\n/gi;
  if (reactImportPattern.test(fixed)) {
    fixed = fixed.replace(reactImportPattern, '');
    changes.push("Removed unnecessary React import (React is global)");
  }

  // Fix: Transform malformed GLM syntax "const * as X from 'pkg'" to "import * as X from 'pkg'"
  // This catches the issue at source instead of downstream in bundle-artifact or ArtifactRenderer
  // Pattern aligned with detection pattern in PROBLEMATIC_PATTERNS for consistency
  const malformedImportPattern = /^(\s*)const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/gm;
  if (malformedImportPattern.test(fixed)) {
    // Reset regex after test() which advances lastIndex
    malformedImportPattern.lastIndex = 0;
    fixed = fixed.replace(malformedImportPattern, '$1import * as $2 from $3;');
    changes.push("Transformed malformed 'const * as' syntax to proper import statement");
  }

  // Fix: Unquoted package names in imports (GLM bug: "from React;" → "from 'react';")
  if (/from\s+React\s*;/.test(fixed)) {
    fixed = fixed.replace(/from\s+React\s*;/g, "from 'react';");
    changes.push("Added quotes to unquoted React package name");
  }
  if (/from\s+ReactDOM\s*;/.test(fixed)) {
    fixed = fixed.replace(/from\s+ReactDOM\s*;/g, "from 'react-dom';");
    changes.push("Added quotes to unquoted ReactDOM package name");
  }

  // Fix: Auto-fix immutability violations (direct array assignments)
  const mutationCheck = validateImmutability(fixed);
  if (mutationCheck.hasMutations && mutationCheck.autoFixAvailable) {
    // Check if auto-fix was skipped due to complexity
    if (mutationCheck.skipped) {
      console.warn(`[artifact-validator] Auto-fix skipped: ${mutationCheck.skipReason}`);
      changes.push(`Auto-fix skipped (${mutationCheck.skipReason}) - immutability issues require manual fix via generate-artifact-fix`);
    } else if (mutationCheck.fixedCode) {
      fixed = mutationCheck.fixedCode;
      // Report actual fixes made, not total violations detected
      const fixedCount = mutationCheck.fixCount || 0;
      if (fixedCount > 0) {
        changes.push(`Fixed ${fixedCount} immutability violation(s)`);
      }
    }
  }

  return { fixed, changes };
}

/**
 * Immutability validation result interface
 */
export interface MutationValidation {
  hasMutations: boolean;
  patterns: string[];
  autoFixAvailable: boolean;
  fixedCode?: string;
  fixCount?: number;  // Number of fixes actually applied
  skipped?: boolean;  // True if auto-fix was skipped due to complexity
  skipReason?: 'multiple-mutations' | 'too-complex';  // Reason for skip
}

/**
 * Detects array/object mutation patterns that violate React strict mode immutability.
 * Returns issues with structured error codes for type-safe filtering.
 *
 * NOTE: Immutability violations are NON-BLOCKING - they only cause React strict mode
 * warnings but don't crash artifacts. Complex algorithms (e.g., minimax) may have
 * unavoidable mutations that work correctly in production.
 */
function detectMutationPatterns(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = code.split('\n');

  // Mutation patterns to detect - each with an error code for structured filtering
  const mutationPatterns: Array<{
    pattern: RegExp;
    message: string;
    suggestion: string;
    code: ValidationErrorCode;
  }> = [
    {
      // Direct array assignment: array[i] = value
      // Allow whitespace: array[i], array[ i ], array  [i], array  [ i ]  =  value
      pattern: /(\w+)\s*\[\s*(\w+|\d+)\s*\]\s*=(?!=)/g,
      message: 'Direct array assignment detected (causes "readonly property" error in React strict mode)',
      suggestion: 'Use immutable pattern: const newArray = [...array]; newArray[i] = value',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_ASSIGNMENT
    },
    {
      // Array.push()
      pattern: /\.\s*push\s*\(/g,
      message: 'Array.push() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = [...array, newItem]',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_PUSH
    },
    {
      // Array.splice()
      pattern: /\.\s*splice\s*\(/g,
      message: 'Array.splice() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = array.filter/slice',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_SPLICE
    },
    {
      // Array.sort() without copy
      pattern: /(?<!\[\.\.\.)\w+\.\s*sort\s*\(/g,
      message: 'Array.sort() mutates the original array',
      suggestion: 'Use immutable pattern: const sortedArray = [...array].sort()',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_SORT
    },
    {
      // Array.reverse() without copy
      pattern: /(?<!\[\.\.\.)\w+\.\s*reverse\s*\(/g,
      message: 'Array.reverse() mutates the original array',
      suggestion: 'Use immutable pattern: const reversedArray = [...array].reverse()',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_REVERSE
    },
    {
      // Array.pop()
      pattern: /\.\s*pop\s*\(/g,
      message: 'Array.pop() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = array.slice(0, -1)',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_POP
    },
    {
      // Array.shift()
      pattern: /\.\s*shift\s*\(/g,
      message: 'Array.shift() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = array.slice(1)',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_SHIFT
    },
    {
      // Array.unshift()
      pattern: /\.\s*unshift\s*\(/g,
      message: 'Array.unshift() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = [newItem, ...array]',
      code: VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_UNSHIFT
    }
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip comments and string literals
    const cleanedLine = line
      .replace(/\/\/.*$/g, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/'([^'\\]|\\.)*'/g, '') // Remove single-quoted strings
      .replace(/"([^"\\]|\\.)*"/g, '') // Remove double-quoted strings
      .replace(/`([^`\\]|\\.)*`/g, ''); // Remove template literals

    for (const { pattern, message, suggestion, code: errorCode } of mutationPatterns) {
      // Reset pattern lastIndex
      pattern.lastIndex = 0;

      if (pattern.test(cleanedLine)) {
        // Special case: Allow mutations on variables that are clearly copies
        // e.g., newBoard[i] = 'X' or newTasks.splice() is fine if created from [...original]
        // This is a heuristic based on naming convention (new*, copy*, updated*, cloned*)
        const copyVarPattern = /\b(new|copy|updated|cloned)[A-Z]\w*/;
        const copyVarMatch = cleanedLine.match(copyVarPattern);

        if (copyVarMatch) {
          const copyVarName = copyVarMatch[0];
          // Check if this line is mutating the copy variable
          // Patterns: copyVar[i] = ..., copyVar.splice(...), copyVar.push(...), etc.
          const isMutatingCopy = new RegExp(`\\b${copyVarName}\\s*[\\.\\[]`).test(cleanedLine);
          if (isMutatingCopy) {
            // Skip - this is an intentional immutable pattern (mutating a copy)
            continue;
          }
        }

        issues.push({
          severity: 'error',
          message,
          line: lineNumber,
          suggestion,
          code: errorCode
        });
      }
    }
  }

  return issues;
}

/**
 * Validates code for immutability violations and provides auto-fix suggestions
 */
export function validateImmutability(code: string): MutationValidation {
  const issues = detectMutationPatterns(code);
  const hasMutations = issues.length > 0;
  const patterns = issues.map(issue => issue.message);

  // Check if auto-fix is possible
  // We can auto-fix: direct array assignments and .sort() mutations
  const canAutoFix = issues.some(issue =>
    issue.message.includes('Direct array assignment') ||
    issue.message.includes('Array.sort()')
  );

  let fixedCode: string | undefined;
  let fixCount: number | undefined;
  let skipped: boolean | undefined;
  let skipReason: 'multiple-mutations' | 'too-complex' | undefined;

  if (canAutoFix) {
    const result = autoFixMutations(code);
    fixedCode = result.fixedCode;
    fixCount = result.fixCount;
    skipped = result.skipped;
    skipReason = result.skipReason;
  }

  return {
    hasMutations,
    patterns,
    autoFixAvailable: canAutoFix,
    fixedCode,
    fixCount,
    skipped,
    skipReason
  };
}

/**
 * Result from auto-fix mutation attempt
 */
interface AutoFixResult {
  fixedCode: string;
  fixCount: number;
  skipped?: boolean;
  skipReason?: 'multiple-mutations' | 'too-complex';
}

/**
 * Attempts to auto-fix common mutation patterns
 * Returns the fixed code and count of fixes made
 *
 * STRATEGY: For complex code with multiple mutations of the same array
 * (like minimax algorithms), we DISABLE auto-fixing entirely because
 * creating `const newArray` declarations can cause "Identifier already declared"
 * errors when the same array is mutated in different branches of the code.
 *
 * Instead, we rely on:
 * 1. The AI prompt instructing the model to write immutable code
 * 2. Post-generation error fixing with generate-artifact-fix endpoint
 *
 * When fixes are skipped, returns `skipped: true` and `skipReason` so callers
 * can distinguish "no fixes needed" from "fixes skipped due to complexity".
 */
function autoFixMutations(code: string): AutoFixResult {
  // Count how many times each array is directly mutated
  const mutationCounts = new Map<string, number>();
  const directAssignPattern = /(\w+)\[([^\]]+)\]\s*=\s*([^=].*?)(?:;|$)/g;

  let match;
  while ((match = directAssignPattern.exec(code)) !== null) {
    const arrayName = match[1];
    // Skip if it looks like a comparison or already a copy
    if (code.substring(match.index, match.index + match[0].length + 2).includes('==')) {
      continue;
    }
    if (arrayName.startsWith('new') || arrayName.startsWith('copy')) {
      continue;
    }
    mutationCounts.set(arrayName, (mutationCounts.get(arrayName) || 0) + 1);
  }

  // If any array is mutated more than once, skip auto-fixing entirely
  // This prevents duplicate declaration errors in complex code
  const hasMultipleMutations = Array.from(mutationCounts.values()).some(count => count > 1);

  if (hasMultipleMutations) {
    // Don't auto-fix - return original code with skip indicator
    // The artifact-fix endpoint will handle this with proper understanding of context
    console.warn('[artifact-validator] Skipping auto-fix - multiple mutations detected for same array');
    return {
      fixedCode: code,
      fixCount: 0,
      skipped: true,
      skipReason: 'multiple-mutations'
    };
  }

  let fixCount = 0;
  let workingCode = code;

  // Fix .sort() mutations: array.sort(...) → [...array].sort(...)
  // This is a safe inline transformation that doesn't create new variable declarations
  // Pattern: word.sort( where word is not preceded by [...
  const sortPattern = /(?<!\[\.\.\.)\b(\w+)\.sort\(/g;
  workingCode = workingCode.replace(sortPattern, (match, arrayName) => {
    // Skip if array name starts with 'new' or 'copy' (already a copy)
    if (arrayName.startsWith('new') || arrayName.startsWith('copy') ||
        arrayName.startsWith('updated') || arrayName.startsWith('cloned') ||
        arrayName.startsWith('sorted')) {
      return match;
    }
    fixCount++;
    return `[...${arrayName}].sort(`;
  });

  // For simple cases (single mutation per array), apply additional fixes
  const lines = workingCode.split('\n');
  const fixedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.length === 0) {
      fixedLines.push(line);
      continue;
    }

    // Detect direct array assignment: board[i] = value
    const singleAssignPattern = /(\w+)\[([^\]]+)\]\s*=\s*([^=].*?)(?:;|$)/;
    const lineMatch = line.match(singleAssignPattern);

    if (lineMatch && !line.includes('==') && !line.includes('===') && !line.includes('!==')) {
      const [fullMatch, arrayName, index, value] = lineMatch;
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const newArrayName = `new${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}`;

      // Check if this array name starts with "new" - it's already a copy
      if (arrayName.startsWith('new') || arrayName.startsWith('copy')) {
        fixedLines.push(line);
        continue;
      }

      fixCount++;
      fixedLines.push(`${indent}// Create immutable copy to avoid "readonly property" error`);
      fixedLines.push(`${indent}const ${newArrayName} = [...${arrayName}];`);
      fixedLines.push(`${indent}${newArrayName}[${index}] = ${value};`);
    } else {
      fixedLines.push(line);
    }
  }

  return { fixedCode: fixedLines.join('\n'), fixCount };
}

/**
 * Common array/string/promise methods that are typically chained.
 * Used to identify orphaned method chains caused by GLM generation bugs.
 */
const CHAINABLE_METHODS = [
  // Array methods
  'filter', 'map', 'reduce', 'forEach', 'find', 'findIndex',
  'some', 'every', 'includes', 'indexOf', 'slice', 'concat',
  'join', 'sort', 'reverse', 'flat', 'flatMap',
  // String methods
  'toString', 'toLowerCase', 'toUpperCase', 'trim', 'trimStart', 'trimEnd',
  'split', 'replace', 'replaceAll', 'match', 'search', 'substring', 'substr',
  'charAt', 'charCodeAt', 'padStart', 'padEnd', 'repeat', 'normalize',
  // Promise methods
  'then', 'catch', 'finally',
  // Object methods
  'keys', 'values', 'entries'
];

/**
 * Fixes orphaned method chains caused by GLM generation bugs.
 *
 * GLM sometimes generates broken code where a statement ends prematurely
 * and the method chain continuation is orphaned on the next line:
 *
 * BROKEN:
 *   newTotals[cat] = transactions;
 *     .filter(t => t.category === cat)
 *
 * FIXED:
 *   newTotals[cat] = transactions
 *     .filter(t => t.category === cat)
 *
 * @param code - The source code to fix
 * @param requestId - Optional request ID for logging
 * @returns Fixed code and list of changes made
 */
export function fixOrphanedMethodChains(
  code: string,
  requestId?: string
): { fixed: string; changes: string[] } {
  const changes: string[] = [];
  const methodPattern = CHAINABLE_METHODS.join('|');

  // Match: line ending with "= identifier;" where next line starts with indented .method(
  // This is specific enough to avoid false positives while catching the GLM bug
  const fixed = code.replace(
    new RegExp(
      `^(\\s*)(.+?=\\s*)(\\w+)\\s*;\\s*$\\n(\\s+)\\.(${methodPattern})\\s*\\(`,
      'gm'
    ),
    (match, indent1, assignment, identifier, indent2, method) => {
      // Only fix if the continuation line is more indented (indicates intended continuation)
      if (indent2.length > indent1.length) {
        const change = `Fixed orphaned method chain: ${identifier}.${method}(...)`;
        changes.push(change);
        if (requestId) {
          console.log(`[${requestId}] ${change}`);
        }
        // Remove semicolon and preserve the continuation
        return `${indent1}${assignment}${identifier}\n${indent2}.${method}(`;
      }
      return match; // Same or less indentation - likely separate statement
    }
  );

  return { fixed, changes };
}

/**
 * Pre-validation and fixing result interface
 */
export interface PreValidationResult {
  fixed: string;
  issues: Array<{ type: string; original: string; fixed: string }>;
  isValid: boolean;
}

/**
 * Pre-validate and fix common GLM syntax issues before client receives code.
 * This catches issues that would cause bundling/rendering failures.
 *
 * This is the SINGLE SOURCE OF TRUTH for GLM syntax fixes - consolidates fixes
 * that were previously scattered across bundle-artifact and ArtifactRenderer.
 *
 * @param code - The artifact code to validate and fix
 * @param requestId - Optional request ID for logging
 * @returns Fixed code, list of issues found, and validation status
 */
export function preValidateAndFixGlmSyntax(
  code: string,
  requestId?: string
): PreValidationResult {
  const issues: Array<{ type: string; original: string; fixed: string }> = [];
  let fixed = code;

  // 1. Fix "const * as X from 'pkg'" -> "import * as X from 'pkg'"
  // GLM generates this invalid hybrid syntax that Babel/bundlers can't parse
  const constStarPattern = /^(\s*)const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/gm;
  fixed = fixed.replace(constStarPattern, (match, indent, name, pkg) => {
    const replacement = `${indent}import * as ${name} from ${pkg};`;
    issues.push({
      type: 'const-star-import',
      original: match.trim(),
      fixed: replacement.trim()
    });
    return replacement;
  });

  // 2. Fix unquoted package names: "from React;" -> "from 'react';"
  // GLM sometimes generates imports without quotes around the package name
  const unquotedPatterns = [
    { pattern: /from\s+React\s*;/g, replacement: "from 'react';", pkg: 'React' },
    { pattern: /from\s+ReactDOM\s*;/g, replacement: "from 'react-dom';", pkg: 'ReactDOM' },
  ];

  for (const { pattern, replacement, pkg } of unquotedPatterns) {
    if (pattern.test(fixed)) {
      const matches = fixed.match(pattern);
      if (matches) {
        issues.push({
          type: 'unquoted-import',
          original: `from ${pkg};`,
          fixed: replacement
        });
        fixed = fixed.replace(pattern, replacement);
      }
    }
  }

  // 3. Strip duplicate React hook destructuring (hooks are UMD globals)
  // Pattern: const { useState, useEffect, ... } = React;
  const hookDestructuring = /^(\s*)const\s*\{[^}]*(?:useState|useEffect|useReducer|useRef|useMemo|useCallback|useContext|useLayoutEffect)[^}]*\}\s*=\s*React;?\s*$/gm;
  fixed = fixed.replace(hookDestructuring, (match) => {
    issues.push({
      type: 'duplicate-hook-destructure',
      original: match.trim(),
      fixed: '// (removed duplicate - hooks are UMD globals)'
    });
    return '';
  });

  // 4. Strip duplicate Framer Motion destructuring (already imported via esm.sh)
  // Pattern: const { motion, AnimatePresence } = Motion;
  const motionDestructuring = /^(\s*)const\s*\{\s*motion\s*,?\s*AnimatePresence\s*,?\s*\}\s*=\s*(?:Motion|FramerMotion|window\.Motion);?\s*$/gm;
  fixed = fixed.replace(motionDestructuring, (match) => {
    issues.push({
      type: 'duplicate-motion-destructure',
      original: match.trim(),
      fixed: '// (removed duplicate - Motion is esm.sh import)'
    });
    return '';
  });

  // 5. Fix orphaned method chains (existing function)
  // GLM bug: statement ends prematurely, method chain continues on next line
  const chainResult = fixOrphanedMethodChains(fixed, requestId);
  if (chainResult.changes.length > 0) {
    fixed = chainResult.fixed;
    for (const change of chainResult.changes) {
      issues.push({
        type: 'orphaned-chain',
        original: change,
        fixed: change.replace('Fixed orphaned method chain: ', 'Reconnected: ')
      });
    }
  }

  // 6. Validate basic structure
  // React artifacts should have at least an export and a function/component
  const hasExport = /export\s+default/.test(fixed) || /export\s+\{[^}]*default/.test(fixed);
  const hasFunction = /function\s+\w+|const\s+\w+\s*=/.test(fixed);
  const isValid = hasExport && hasFunction;

  if (issues.length > 0 && requestId) {
    console.log(`[${requestId}] Pre-validation fixed ${issues.length} GLM syntax issue(s):`,
      issues.map(i => i.type).join(', ')
    );
  }

  if (!isValid && requestId) {
    console.warn(`[${requestId}] Pre-validation warning: artifact may have structural issues (missing export or function)`);
  }

  return { fixed, issues, isValid };
}

/**
 * Main validation function - checks artifact code for common issues
 */
export function validateArtifactCode(code: string, artifactType: string = 'react'): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Skip validation for non-code artifacts
  if (['markdown', 'mermaid', 'svg'].includes(artifactType)) {
    return { valid: true, issues: [], canAutoFix: false };
  }

  // Check for reserved keywords
  issues.push(...detectReservedKeywords(code));

  // Check for problematic patterns
  issues.push(...detectProblematicPatterns(code));

  // Check for immutability violations (NEW)
  issues.push(...detectMutationPatterns(code));

  // Determine if code has critical errors
  const hasErrors = issues.some(issue => issue.severity === 'error');

  // Check if issues can be auto-fixed
  const canAutoFix = issues.some(issue =>
    issue.message.includes("'eval'") ||
    issue.message.includes("'arguments'") ||
    issue.message.includes("React imports") ||
    issue.message.includes("Direct array assignment") ||
    issue.message.includes("mutates the original array") ||
    issue.message.includes("const * as") ||
    issue.message.includes("Unquoted package name")
  );

  return {
    valid: !hasErrors,
    issues,
    canAutoFix
  };
}
