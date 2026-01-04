/**
 * Error Patterns for Artifact Fixing
 *
 * Dynamic pattern library for the artifact fix endpoint.
 * Patterns are injected based on error category for focused corrections.
 */

export interface ErrorPattern {
  triggers: string[];  // Error message keywords
  patterns: string[];  // Fix patterns to apply
}

/**
 * Error categories with fix patterns
 * Used for dynamic injection - only relevant patterns sent to AI
 */
export const ERROR_PATTERNS: Record<string, ErrorPattern> = {
  'readonly-property': {
    triggers: ['readonly property', 'cannot assign', 'read-only'],
    patterns: [
      'Find direct array mutation: arr[i] = value',
      'Replace with immutable copy: const newArr = [...arr]; newArr[i] = value; setArr(newArr)',
      'Find object mutation: obj.prop = value',
      'Replace with spread: setObj({...obj, prop: value})',
      'Check for: push, pop, shift, unshift, splice, sort, reverse',
      'Use immutable alternatives: [...arr, item], arr.filter(), [...arr].sort()'
    ]
  },

  'not-defined': {
    triggers: ['is not defined', 'referenceerror', 'undefined variable'],
    patterns: [
      'Check React hook destructuring: const { useState, useEffect } = React',
      'Verify React global is accessed correctly (not imported)',
      'Check variable scope - ensure declared before use',
      'Verify library globals: Recharts, LucideReact, FramerMotion',
      'Check for typos in variable/function names'
    ]
  },

  'import-error': {
    // More specific triggers to reduce false positives (avoid matching just "import")
    triggers: ['cannot find module', 'module not found', 'failed to resolve import', 'unexpected token import', 'unable to resolve module'],
    patterns: [
      'Remove @/ imports - not available in sandbox',
      'Check if library available via CDN (React, Recharts, Lucide, etc.)',
      'For Radix UI: Verify import syntax: import * as Dialog from "@radix-ui/react-dialog"',
      'Remove React imports: React is global, use const { useState } = React',
      'Replace shadcn imports with Radix UI or Tailwind CSS'
    ]
  },

  // Renamed from 'duplicate-import' to handle BOTH import and variable duplicates
  // Engine-specific error messages:
  // - Safari/JavaScriptCore: "Cannot declare a lexical variable twice: 'X'"
  // - Chrome/V8: "Identifier 'X' has already been declared"
  // - Firefox/SpiderMonkey: "redeclaration of let X" or "redeclaration of const X"
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
  },

  'syntax-error': {
    triggers: ['syntaxerror', 'unexpected token', 'unexpected end of input'],
    patterns: [
      'Check balanced braces: { }',
      'Check balanced parentheses: ( )',
      'Check balanced brackets: [ ]',
      'Verify JSX closing tags match opening tags',
      'Check for missing semicolons or commas',
      'Verify quotes are properly closed: " " or \' \''
    ]
  },

  'type-error': {
    triggers: ['typeerror', 'cannot read property', 'cannot read properties of undefined'],
    patterns: [
      'Add null checks: if (obj) { obj.property }',
      'Use optional chaining: obj?.property',
      'Provide default values: const value = obj?.property ?? defaultValue',
      'Check array/object exists before accessing',
      'Verify async data has loaded before rendering'
    ]
  },

  'reserved-keyword': {
    triggers: ['unexpected token', 'unexpected reserved word', 'strict mode'],
    patterns: [
      'Check for reserved keywords as variable names: eval, arguments, interface, etc.',
      'Replace "eval" with "score" or "value"',
      'Replace "arguments" with "args" or "params"',
      'Avoid: implements, interface, package, private, protected, public, static, yield, await'
    ]
  },

  'storage-api': {
    triggers: ['localstorage', 'sessionstorage', 'storage is not defined'],
    patterns: [
      'Replace localStorage with React state: const [value, setValue] = useState(initialValue)',
      'Remove sessionStorage calls - use useState instead',
      'Store data in component state, not browser storage',
      'Use useEffect to initialize state from initial values'
    ]
  },

  'glm-html-fragment': {
    triggers: [
      'const * as',
      'unexpected end of jsx element',
      '<!doctype html>',  // Case-insensitive: matches both <!DOCTYPE and <!doctype
      '</body></html>'  // Orphan closing tags appended to React components
    ],
    patterns: [
      'Check for invalid import syntax: "const * as X" is not valid JS - use "import * as X from"',
      'Look for trailing HTML document after React component - remove <!DOCTYPE>, <html>, <body> tags',
      'Check for orphan closing tags (</div>, </html>) at end of file - remove them',
      'Ensure all JSX elements have matching opening/closing tags',
      'Verify React component has exactly one root element or use a fragment <></>'
    ]
  }
};

/**
 * Categorizes error message and returns relevant patterns using confidence scoring.
 * Longer trigger matches = more specific = higher confidence.
 */
export function getRelevantPatterns(errorMessage: string): string[] {
  // Guard against null/undefined input (CRITICAL: prevents runtime crash)
  if (!errorMessage || typeof errorMessage !== 'string') {
    console.warn('[error-patterns] getRelevantPatterns called with invalid input:', {
      type: typeof errorMessage,
      value: errorMessage === null ? 'null' : errorMessage === undefined ? 'undefined' : String(errorMessage).slice(0, 50)
    });
    // Return generic patterns as fallback
    return [
      'Check syntax: balanced braces, parentheses, quotes',
      'Verify variable names and scope',
      'Check React hook usage: const { useState } = React',
      'Ensure immutable updates: use spread operators',
      'Remove unsupported APIs: localStorage, @/ imports'
    ];
  }

  const lowerError = errorMessage.toLowerCase();
  const matches: Array<{ category: string; score: number; patterns: string[]; matchedTriggers: string[] }> = [];

  for (const [category, { triggers, patterns }] of Object.entries(ERROR_PATTERNS)) {
    // Calculate match score based on trigger specificity
    let score = 0;
    const matchedTriggers: string[] = [];

    for (const trigger of triggers) {
      if (lowerError.includes(trigger)) {
        // Longer triggers = more specific = higher score
        score += trigger.length;
        matchedTriggers.push(trigger);
      }
    }

    if (score > 0) {
      matches.push({ category, score, patterns, matchedTriggers });
    }
  }

  // Return patterns from highest-scoring category
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    const topMatch = matches[0];
    console.log(`[Error Pattern] Using "${topMatch.category}" patterns (score: ${topMatch.score}, triggers: ${topMatch.matchedTriggers.join(', ')})`);
    return topMatch.patterns;
  }

  // Generic patterns if no specific match
  console.log('[Error Pattern] No specific match, using generic patterns');
  return [
    'Check syntax: balanced braces, parentheses, quotes',
    'Verify variable names and scope',
    'Check React hook usage: const { useState } = React',
    'Ensure immutable updates: use spread operators',
    'Remove unsupported APIs: localStorage, @/ imports'
  ];
}

/**
 * Generates type-specific fix guidance
 */
export function getTypeSpecificGuidance(type: string): string {
  switch (type) {
    case 'react':
      return `
[REACT FIX PATTERNS]

Common Issues:
- "readonly property" → Find mutation, use spread: {...obj}, [...arr]
- "X is not defined" → Check React hook destructuring: const { useState } = React
- "cannot find module" → Remove @/ imports, verify CDN library availability
- Reserved keywords → Replace eval/arguments with score/args

Immutability Rules:
- ❌ arr[i] = x → ✅ const newArr = [...arr]; newArr[i] = x
- ❌ obj.prop = x → ✅ setObj({...obj, prop: x})
- ❌ arr.push(x) → ✅ setArr([...arr, x])
- ❌ arr.sort() → ✅ setArr([...arr].sort())
`;

    case 'html':
      return `
[HTML FIX PATTERNS]

Common Issues:
- Unclosed tags → Match all opening tags with closing tags
- Missing attributes → Add alt to images, labels to inputs
- Inline events → Move to script tag with addEventListener
- Invalid structure → Check DOCTYPE, head, body hierarchy
`;

    case 'svg':
      return `
[SVG FIX PATTERNS]

Common Issues:
- Missing viewBox → Add: viewBox="0 0 width height"
- Missing dimensions → Add: width="800" height="600"
- Invalid syntax → Check balanced tags, valid attributes
`;

    default:
      console.warn(
        `[error-patterns] Unsupported artifact type: "${type}". Supported types: react, html, svg`
      );
      return '';
  }
}
