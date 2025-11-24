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
    triggers: ['cannot find module', 'import', 'module not found', 'unexpected token import'],
    patterns: [
      'Remove @/ imports - not available in sandbox',
      'Check if library available via CDN (React, Recharts, Lucide, etc.)',
      'For Radix UI: Verify import syntax: import * as Dialog from "@radix-ui/react-dialog"',
      'Remove React imports: React is global, use const { useState } = React',
      'Replace shadcn imports with Radix UI or Tailwind CSS'
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
  }
};

/**
 * Categorizes error message and returns relevant patterns
 */
export function getRelevantPatterns(errorMessage: string): string[] {
  const lowerError = errorMessage.toLowerCase();

  for (const [_category, { triggers, patterns }] of Object.entries(ERROR_PATTERNS)) {
    if (triggers.some(trigger => lowerError.includes(trigger))) {
      return patterns;
    }
  }

  // Generic patterns if no specific match
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
      return '';
  }
}
