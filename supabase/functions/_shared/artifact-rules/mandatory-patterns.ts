/**
 * Mandatory React Boilerplate and Package Versions
 *
 * This module provides prescriptive patterns for artifact generation.
 * Following Z.ai's philosophy: "ALWAYS do X" instead of "DON'T do Y"
 *
 * @module artifact-rules/mandatory-patterns
 */

/**
 * Mandatory React Boilerplate
 *
 * This MUST be included in every React artifact generation prompt.
 * The AI should follow this exact structure to ensure reliability.
 *
 * Philosophy:
 * - Prescriptive over restrictive
 * - Show exact patterns to copy
 * - Include complete working examples
 * - Highlight common violations
 *
 * @constant
 * @type {string}
 */
export const MANDATORY_REACT_BOILERPLATE = `
## NON-NEGOTIABLE REACT STRUCTURE

Every React artifact MUST use this EXACT boilerplate. No exceptions.

### Step 1: React Globals (MANDATORY)
\`\`\`jsx
const { useState, useEffect, useCallback, useMemo, useRef } = React;
\`\`\`

### Step 2: Export Default App (MANDATORY)
\`\`\`jsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Your component content */}
    </div>
  );
}
\`\`\`

### Complete Minimal Example:
\`\`\`jsx
const { useState } = React;

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Counter: {count}
        </h1>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Increment
        </button>
      </div>
    </div>
  );
}
\`\`\`

### VIOLATIONS THAT WILL CAUSE FAILURE:
- ❌ \`import React from 'react'\` → Use React global
- ❌ \`import { useState } from 'react'\` → Use \`const { useState } = React\`
- ❌ \`export default function Calculator()\` → MUST be named \`App\`
- ❌ Missing wrapper div → ALWAYS wrap in \`min-h-screen\` container
`;

/**
 * Approved Package Versions and Import Patterns
 *
 * Version-locked packages with exact import patterns.
 * These are the ONLY external packages allowed in artifacts.
 *
 * Philosophy:
 * - Show exact import syntax
 * - Explain when to use each package
 * - Enforce namespace imports for Radix UI (prevents tree-shaking issues)
 * - Clarify which packages are auto-injected globals
 *
 * @constant
 * @type {string}
 */
export const PACKAGE_VERSIONS = `
## APPROVED PACKAGES (Version-Locked)

Use ONLY these packages with these EXACT import patterns:

| Package | Import Pattern | Use For |
|---------|----------------|---------|
| lucide-react | \`import { Icon } from "lucide-react"\` | Icons |
| recharts | \`import { LineChart, BarChart, ... } from "recharts"\` | Charts |
| @radix-ui/react-dialog | \`import * as Dialog from "@radix-ui/react-dialog"\` | Modals |
| @radix-ui/react-tabs | \`import * as Tabs from "@radix-ui/react-tabs"\` | Tab navigation |
| @radix-ui/react-select | \`import * as Select from "@radix-ui/react-select"\` | Dropdowns |
| @radix-ui/react-switch | \`import * as Switch from "@radix-ui/react-switch"\` | Toggles |
| @radix-ui/react-tooltip | \`import * as Tooltip from "@radix-ui/react-tooltip"\` | Tooltips |
| date-fns | \`import { format, parseISO } from "date-fns"\` | Date formatting |

### IMPORT RULES:
1. ALWAYS use namespace imports (\`import * as X\`) for Radix UI
2. NEVER import React or ReactDOM - they are globals
3. framer-motion is auto-injected - do NOT import it
`;

/**
 * Combined mandatory patterns for artifact generation
 *
 * This combines all mandatory patterns into a single string
 * that can be injected into system prompts.
 *
 * @constant
 * @type {string}
 */
export const COMBINED_MANDATORY_PATTERNS = `
${MANDATORY_REACT_BOILERPLATE}

${PACKAGE_VERSIONS}
`;

/**
 * Type definition for validation results
 *
 * Used to validate artifact code against mandatory patterns.
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the code follows mandatory patterns
 * @property {string[]} violations - List of pattern violations found
 * @property {string[]} warnings - Non-critical warnings
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly violations: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Validates React artifact code against mandatory patterns
 *
 * Checks for:
 * - React global destructuring (not imports)
 * - Export default function App() structure
 * - Proper wrapper div with min-h-screen
 * - Approved package imports only
 *
 * @param {string} code - The React artifact code to validate
 * @returns {ValidationResult} Validation results with violations/warnings
 *
 * @example
 * ```typescript
 * const result = validateReactBoilerplate(artifactCode);
 * if (!result.valid) {
 *   console.error('Violations:', result.violations);
 * }
 * ```
 */
export function validateReactBoilerplate(code: string): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check for React imports (should use globals instead)
  if (code.includes('import React') || code.includes('import { useState }')) {
    violations.push(
      'Found React imports - use `const { useState } = React` instead'
    );
  }

  // Check for React global destructuring
  if (!code.includes('const {') || !code.includes('} = React')) {
    violations.push(
      'Missing React global destructuring - add `const { useState, ... } = React`'
    );
  }

  // Check for export default function App()
  if (!code.includes('export default function App()')) {
    violations.push(
      'Missing `export default function App()` - component must be named App'
    );
  }

  // Check for min-h-screen wrapper
  if (!code.includes('min-h-screen')) {
    warnings.push(
      'Missing min-h-screen wrapper - consider adding full-height container'
    );
  }

  // Check for dark mode classes
  if (code.includes('bg-') && !code.includes('dark:')) {
    warnings.push(
      'Background colors found without dark mode variants - add dark: classes'
    );
  }

  // Check for framer-motion imports (should be auto-injected)
  if (code.includes('import') && code.includes('framer-motion')) {
    violations.push(
      'Found framer-motion import - it is auto-injected as a global'
    );
  }

  // Check for non-namespace Radix UI imports
  const radixImportMatch = code.match(
    /import\s+{[^}]+}\s+from\s+["']@radix-ui\//
  );
  if (radixImportMatch) {
    violations.push(
      'Found named import from Radix UI - use namespace import: `import * as Dialog from "@radix-ui/react-dialog"`'
    );
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Gets a prescriptive error message for a specific violation
 *
 * Provides actionable guidance on how to fix common violations.
 *
 * @param {string} violation - The violation type
 * @returns {string} Detailed fix instructions
 *
 * @example
 * ```typescript
 * const fix = getViolationFix('react-import');
 * console.log(fix); // "Replace `import React from 'react'` with..."
 * ```
 */
export function getViolationFix(violation: string): string {
  const fixes: Record<string, string> = {
    'react-import': `
Replace:
  import React from 'react';
  import { useState } from 'react';

With:
  const { useState, useEffect, useCallback } = React;
`,
    'wrong-export-name': `
Replace:
  export default function MyComponent() { ... }

With:
  export default function App() { ... }
`,
    'missing-wrapper': `
Add a full-height wrapper:
  export default function App() {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        {/* Your content */}
      </div>
    );
  }
`,
    'framer-motion-import': `
Remove:
  import { motion } from 'framer-motion';

Use directly:
  <motion.div>...</motion.div>
`,
    'radix-named-import': `
Replace:
  import { Dialog } from '@radix-ui/react-dialog';

With:
  import * as Dialog from '@radix-ui/react-dialog';
`,
  };

  return fixes[violation] || 'No specific fix available for this violation';
}
