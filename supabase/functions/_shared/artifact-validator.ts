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

  // Fix: Auto-fix immutability violations (direct array assignments)
  const mutationCheck = validateImmutability(fixed);
  if (mutationCheck.hasMutations && mutationCheck.autoFixAvailable && mutationCheck.fixedCode) {
    fixed = mutationCheck.fixedCode;
    changes.push(`Fixed ${mutationCheck.patterns.length} immutability violation(s)`);
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

  if (canAutoFix) {
    fixedCode = autoFixMutations(code);
  }

  return {
    hasMutations,
    patterns,
    autoFixAvailable: canAutoFix,
    fixedCode
  };
}

/**
 * Attempts to auto-fix common mutation patterns
 */
function autoFixMutations(code: string): string {
  let fixed = code;
  const lines = fixed.split('\n');
  const fixedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.length === 0) {
      fixedLines.push(line);
      continue;
    }

    // Detect and fix direct array assignment: board[i] = value
    // Pattern: array[index] = value (not ==, not ===)
    const directAssignPattern = /^(\s*)(\w+)\[(\w+|\d+)\]\s*=\s*(.+);?\s*$/;
    const match = line.match(directAssignPattern);

    if (match) {
      const [, indent, arrayName, index, value] = match;

      // Check if this is inside a loop or function (look back a few lines)
      const contextLines = lines.slice(Math.max(0, i - 5), i);
      const inLoop = contextLines.some(l => /\b(for|while)\b/.test(l));

      // Look ahead to see if the array is being reassigned to itself
      // If so, we need to create a new copy first
      const lookAhead = lines.slice(i + 1, Math.min(lines.length, i + 3));
      const needsReturn = lookAhead.some(l => /return\s+\w+/.test(l) || /return\s*;/.test(l));

      // Generate fix based on context
      if (inLoop || needsReturn) {
        // If we haven't created a copy yet in this scope, add it before the line
        const copyExists = contextLines.some(l =>
          l.includes(`const new${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}`) ||
          l.includes(`const ${arrayName} = [`)
        );

        if (!copyExists) {
          // Add copy creation before the assignment
          fixedLines.push(`${indent}// Create immutable copy to avoid "readonly property" error`);
          fixedLines.push(`${indent}const new${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)} = [...${arrayName}];`);
          fixedLines.push(`${indent}new${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}[${index}] = ${value};`);
        } else {
          // Copy already exists, just use the new array name
          fixedLines.push(line.replace(arrayName, `new${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}`));
        }
      } else {
        // Simple case: create copy inline
        fixedLines.push(`${indent}// Create immutable copy to avoid "readonly property" error`);
        fixedLines.push(`${indent}const new${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)} = [...${arrayName}];`);
        fixedLines.push(`${indent}new${arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}[${index}] = ${value};`);
      }
    } else {
      fixedLines.push(line);
    }
  }

  return fixedLines.join('\n');
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
    issue.message.includes("mutates the original array")
  );

  return {
    valid: !hasErrors,
    issues,
    canAutoFix
  };
}
