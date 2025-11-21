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

  // Determine if code has critical errors
  const hasErrors = issues.some(issue => issue.severity === 'error');

  // Check if issues can be auto-fixed
  const canAutoFix = issues.some(issue =>
    issue.message.includes("'eval'") ||
    issue.message.includes("'arguments'") ||
    issue.message.includes("React imports")
  );

  return {
    valid: !hasErrors,
    issues,
    canAutoFix
  };
}
