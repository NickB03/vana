/**
 * Core Artifact Patterns
 *
 * Prescriptive patterns that apply to ALL artifact types.
 * These patterns ensure artifacts work reliably in sandbox environments.
 *
 * Usage: Import and include at TOP and BOTTOM of generation prompts
 * for maximum compliance (primacy + recency effect).
 */

export const CORE_RESTRICTIONS = `
[ARTIFACT SUCCESS PATTERNS]

Follow these patterns EXACTLY to ensure your artifact works:

1. **USE NPM PACKAGES** (MANDATORY)

   ALWAYS use direct npm package imports for UI components and utilities:
   \`\`\`jsx
   import * as Dialog from '@radix-ui/react-dialog';
   import { Check, X, ArrowRight } from 'lucide-react';
   import { clsx } from 'clsx';
   \`\`\`

   Copy these patterns exactly. The sandbox has no access to local project files.

   ⚠️ These will FAIL: \`import { Button } from "@/components/ui/button"\`, \`import { cn } from "@/lib/utils"\`

2. **USE REACT STATE** (MANDATORY)

   ALWAYS manage data with React hooks:
   \`\`\`jsx
   const [value, setValue] = useState(initialValue);
   const [items, setItems] = useState([]);
   \`\`\`

   Copy this pattern for ALL data that needs to persist during the session.

   ⚠️ These will FAIL: \`localStorage.setItem(...)\`, \`sessionStorage.getItem(...)\`

3. **REACT GLOBALS** (MANDATORY)

   ALWAYS start your artifact with this exact line:
   \`\`\`jsx
   const { useState, useEffect, useCallback, useMemo, useRef } = React;
   \`\`\`

   React and ReactDOM are pre-loaded as globals. Copy the line above exactly.

   ⚠️ These will FAIL: \`import React from 'react'\`, \`import { useState } from 'react'\`

4. **STANDARD SYNTAX ONLY** (MANDATORY)

   ALWAYS use modern JavaScript/TypeScript syntax:
   \`\`\`jsx
   // Standard class (no decorators)
   class MyClass {
     constructor() { }
   }

   // Standard function components
   function MyComponent() { return <div>...</div>; }

   // Valid namespace imports
   import * as Icons from 'lucide-react';
   \`\`\`

   Copy these patterns. The Sucrase transpiler only supports standard syntax.

   ⚠️ These will FAIL: \`@decorator class Foo {}\`, \`namespace MyNamespace {}\`, \`const * as X from 'pkg'\`

5. **UNIQUE IMPORTS** (MANDATORY)

   ALWAYS ensure each import name appears only once:
   \`\`\`jsx
   import { Mail, User, Settings } from 'lucide-react';  // ✓ Each name once
   import { useState, useEffect, useMemo } from 'react'; // ✓ Each name once
   \`\`\`

   Copy this pattern exactly. Remove any duplicate names.

   ⚠️ These will FAIL: \`import { Mail, User, Mail } from 'lucide-react'\`, \`import { useState, useState } from 'react'\`

6. **COMPLETE COMPONENTS** (MANDATORY)

   ALWAYS export exactly one complete component:
   \`\`\`jsx
   export default function App() {
     return (
       <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
         {/* Your component content */}
       </div>
     );
   }
   \`\`\`

   Copy this structure exactly. Return ONLY the component code, nothing after it.

   ⚠️ These will FAIL: Orphan tags like \`</div></body></html>\` after component, multiple HTML documents in one file

WHY: Artifacts run in sandboxed iframes for security. Local imports and browser storage APIs are intentionally blocked. The Sucrase transpiler has strict syntax requirements.
`;

export const CORE_RESTRICTIONS_REMINDER = `
[ARTIFACT CHECKLIST]

Verify your artifact has ALL of these:

✓ Started with: const { useState, useEffect } = React;
✓ Wrapped in: <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
✓ Ended with: export default function App() { ... }
✓ Used npm packages (lucide-react, @radix-ui/*, clsx)
✓ Used React state (const [value, setValue] = useState(...))
✓ Each import name appears only once
✓ No code after the component export
`;
