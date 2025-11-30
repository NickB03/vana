/**
 * Artifact Code Validator
 *
 * Post-generation validation to catch common issues that might break artifacts
 * in the browser. This acts as a safety net for AI-generated code.
 */

interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  line?: number;
  suggestion?: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  canAutoFix: boolean;
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
 * Patterns that commonly indicate issues in React artifacts
 */
const PROBLEMATIC_PATTERNS = [
  {
    pattern: /import\s+.*\s+from\s+['"]@\/components/gi,
    message: 'Local @/ imports are not available in artifacts. Use Radix UI primitives instead.',
    severity: 'error' as const
  },
  {
    pattern: /localStorage\.(getItem|setItem|removeItem)/gi,
    message: 'localStorage is not supported in artifacts. Use React state instead.',
    severity: 'error' as const
  },
  {
    pattern: /sessionStorage\.(getItem|setItem|removeItem)/gi,
    message: 'sessionStorage is not supported in artifacts. Use React state instead.',
    severity: 'error' as const
  },
  {
    pattern: /import\s+React\s+from\s+['"]react['"]/gi,
    message: 'React imports not needed. Use: const { useState, useEffect } = React;',
    severity: 'warning' as const
  },
  {
    // GLM generates invalid "const * as X from 'pkg'" syntax - must be caught and fixed
    // Uses \s* at start to handle indentation, optional semicolon and trailing whitespace
    pattern: /^\s*const\s*\*\s*as\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm,
    message: 'Invalid import syntax: "const * as" should be "import * as"',
    severity: 'error' as const
  },
  {
    // GLM generates unquoted package names like "from React;" instead of "from 'react';"
    pattern: /from\s+React\s*;/g,
    message: 'Unquoted package name in import statement',
    severity: 'error' as const
  },
  {
    // Also catch unquoted ReactDOM
    pattern: /from\s+ReactDOM\s*;/g,
    message: 'Unquoted package name in import statement',
    severity: 'error' as const
  }
];

/**
 * Detects usage of strict mode reserved keywords as variable names
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
          issues.push({
            severity: 'error',
            message: `Reserved keyword '${keyword}' used as variable name in strict mode`,
            line: lineNumber,
            suggestion: keyword === 'eval'
              ? `Use 'score', 'value', or 'evaluation' instead of '${keyword}'`
              : `Rename '${keyword}' to a different variable name`
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Detects known problematic patterns in artifact code
 */
function detectProblematicPatterns(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const { pattern, message, severity } of PROBLEMATIC_PATTERNS) {
    const matches = code.match(pattern);
    if (matches) {
      issues.push({
        severity,
        message: `${message} (found ${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
        suggestion: 'Review artifact restrictions in system prompt'
      });
    }
  }

  return issues;
}

/**
 * Attempts to auto-fix common issues in artifact code
 */
export function autoFixArtifactCode(code: string): { fixed: string; changes: string[] } {
  let fixed = code;
  const changes: string[] = [];

  // Fix: Replace 'eval' with 'score' in variable declarations
  const evalPattern = /\b(const|let|var)\s+eval\s*=/g;
  if (evalPattern.test(code)) {
    fixed = fixed.replace(evalPattern, '$1 score =');
    changes.push("Replaced variable name 'eval' with 'score'");
  }

  // Fix: Replace 'arguments' with 'args' in variable declarations
  const argsPattern = /\b(const|let|var)\s+arguments\s*=/g;
  if (argsPattern.test(code)) {
    fixed = fixed.replace(argsPattern, '$1 args =');
    changes.push("Replaced variable name 'arguments' with 'args'");
  }

  // Fix: Remove unnecessary React imports
  const reactImportPattern = /import\s+React\s+from\s+['"]react['"];?\s*\n/gi;
  if (reactImportPattern.test(code)) {
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
  if (mutationCheck.hasMutations && mutationCheck.autoFixAvailable && mutationCheck.fixedCode) {
    fixed = mutationCheck.fixedCode;
    // Report actual fixes made, not total violations detected
    const fixedCount = mutationCheck.fixCount || 0;
    if (fixedCount > 0) {
      changes.push(`Fixed ${fixedCount} immutability violation(s)`);
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
}

/**
 * Detects array/object mutation patterns that violate React strict mode immutability
 */
function detectMutationPatterns(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = code.split('\n');

  // Mutation patterns to detect
  const mutationPatterns = [
    {
      // Direct array assignment: array[i] = value
      pattern: /(\w+)\[(\w+|\d+)\]\s*=(?!=)/g,
      message: 'Direct array assignment detected (causes "readonly property" error in React strict mode)',
      suggestion: 'Use immutable pattern: const newArray = [...array]; newArray[i] = value'
    },
    {
      // Array.push()
      pattern: /\.\s*push\s*\(/g,
      message: 'Array.push() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = [...array, newItem]'
    },
    {
      // Array.splice()
      pattern: /\.\s*splice\s*\(/g,
      message: 'Array.splice() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = array.filter/slice'
    },
    {
      // Array.sort() without copy
      pattern: /(?<!\[\.\.\.)\w+\.\s*sort\s*\(/g,
      message: 'Array.sort() mutates the original array',
      suggestion: 'Use immutable pattern: const sortedArray = [...array].sort()'
    },
    {
      // Array.reverse() without copy
      pattern: /(?<!\[\.\.\.)\w+\.\s*reverse\s*\(/g,
      message: 'Array.reverse() mutates the original array',
      suggestion: 'Use immutable pattern: const reversedArray = [...array].reverse()'
    },
    {
      // Array.pop()
      pattern: /\.\s*pop\s*\(/g,
      message: 'Array.pop() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = array.slice(0, -1)'
    },
    {
      // Array.shift()
      pattern: /\.\s*shift\s*\(/g,
      message: 'Array.shift() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = array.slice(1)'
    },
    {
      // Array.unshift()
      pattern: /\.\s*unshift\s*\(/g,
      message: 'Array.unshift() mutates the original array',
      suggestion: 'Use immutable pattern: const newArray = [newItem, ...array]'
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

    for (const { pattern, message, suggestion } of mutationPatterns) {
      // Reset pattern lastIndex
      pattern.lastIndex = 0;

      if (pattern.test(cleanedLine)) {
        // Special case: Allow mutations on variables that are clearly copies
        // e.g., newBoard[i] = 'X' is fine if newBoard was created from [...board]
        // This is a heuristic based on naming convention (new*, copy*, updated*)
        const isCopyMutation = /\b(new|copy|updated|cloned)\w*\[/.test(cleanedLine);
        if (isCopyMutation && message.includes('Direct array assignment')) {
          // Skip - this is likely an intentional immutable pattern
          continue;
        }

        issues.push({
          severity: 'error',
          message,
          line: lineNumber,
          suggestion
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
  // Currently, we can auto-fix direct array assignments
  const canAutoFix = issues.some(issue =>
    issue.message.includes('Direct array assignment')
  );

  let fixedCode: string | undefined;
  let fixCount: number | undefined;

  if (canAutoFix) {
    const result = autoFixMutations(code);
    fixedCode = result.fixedCode;
    fixCount = result.fixCount;
  }

  return {
    hasMutations,
    patterns,
    autoFixAvailable: canAutoFix,
    fixedCode,
    fixCount
  };
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
 */
function autoFixMutations(code: string): { fixedCode: string; fixCount: number } {
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
    // Don't auto-fix - return original code
    // The artifact-fix endpoint will handle this with proper understanding of context
    return { fixedCode: code, fixCount: 0 };
  }

  // For simple cases (single mutation per array), apply the fix
  const lines = code.split('\n');
  const fixedLines: string[] = [];
  let fixCount = 0;

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
