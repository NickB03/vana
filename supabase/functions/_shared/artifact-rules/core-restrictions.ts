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

1. **IMPORT STRATEGY** (MANDATORY)

   Choose the right import strategy based on component needs:

   **⚡ Tier 1: Pre-loaded Libraries (DEFAULT - instant rendering)**
   Use for 90%+ of artifacts. These are globally available via CDN:
   \`\`\`jsx
   // React hooks - destructure from global React
   const { useState, useEffect, useCallback, useMemo, useRef } = React;

   // Icons - use lucide-react (pre-loaded)
   import { Check, X, ArrowRight } from 'lucide-react';

   // Charts - use Recharts (pre-loaded)
   import { LineChart, BarChart, PieChart, Cell } from 'recharts';

   // Animations - use Framer Motion (pre-loaded)
   import { motion, AnimatePresence } from 'framer-motion';
   \`\`\`

   **🐢 Tier 2: npm Packages (ONLY when needed - 2-5s delay)**
   Use ONLY for complex accessible primitives not achievable with Tailwind:
   \`\`\`jsx
   // Dialog, Dropdown, Select, Popover - use Radix UI
   import * as Dialog from '@radix-ui/react-dialog';
   import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
   \`\`\`

   ⚠️ npm imports trigger server bundling (2-5s delay, rate limits apply)
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

6. **NO DUPLICATE IMPORTS ACROSS STATEMENTS** (MANDATORY)

   ALWAYS import each identifier ONLY ONCE from each package:

   ✅ CORRECT:
   \`\`\`jsx
   import { Mail, User, Settings } from 'lucide-react';
   import { AreaChart, LineChart } from 'recharts';
   \`\`\`

   ❌ INCORRECT (runtime error):
   \`\`\`jsx
   import { Mail } from 'lucide-react';
   import { User, Mail } from 'lucide-react';  // ❌ Mail imported twice

   import { AreaChart } from 'recharts';
   import { AreaChart, LineChart } from 'recharts';  // ❌ AreaChart imported twice
   \`\`\`

   If you need multiple items from a package, import them together in ONE statement.
   If you realize you need another import later, ADD it to the existing import line
   instead of creating a new import statement.

7. **COMPLETE COMPONENTS** (MANDATORY)

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

8. **STATEMENT TERMINATION** (MANDATORY)

   ALWAYS end every statement with a semicolon. This is CRITICAL for the Sucrase transpiler:
   \`\`\`jsx
   // ✅ CORRECT - semicolons after every statement
   const { useState, useEffect, useRef } = React;

   const gameLoop = () => {
     // game logic
   };  // ← SEMICOLON REQUIRED after function expression

   const handleClick = (e) => {
     console.log('clicked');
   };  // ← SEMICOLON REQUIRED

   useEffect(() => {
     const interval = setInterval(update, 16);
     return () => clearInterval(interval);
   }, []);  // ← SEMICOLON after useEffect
   \`\`\`

   ❌ INCORRECT (transpilation error):
   \`\`\`jsx
   const gameLoop = () => {
     // game logic
   }  // ❌ MISSING SEMICOLON - causes "Unexpected token, expected ';'" error
   gameLoop()
   \`\`\`

   Copy the correct pattern. The Sucrase transpiler requires explicit semicolons after:
   - Variable declarations: \`const x = 1;\`
   - Function expressions: \`const fn = () => { };\`
   - Arrow functions assigned to variables: \`const handler = (e) => { };\`
   - Hook calls: \`useEffect(() => { }, []);\`

WHY: Artifacts run in sandboxed iframes for security. Local imports and browser storage APIs are intentionally blocked. The Sucrase transpiler has strict syntax requirements and does not perform automatic semicolon insertion.
`;

export const CORE_RESTRICTIONS_REMINDER = `
[ARTIFACT CHECKLIST]

Verify your artifact has ALL of these:

✓ Started with: const { useState, useEffect } = React;
✓ Wrapped in: <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
✓ Ended with: export default function App() { ... }
✓ Used pre-loaded CDN libraries (lucide-react, recharts, framer-motion) OR npm packages (@radix-ui/*)
✓ Used React state (const [value, setValue] = useState(...))
✓ Each import name appears only once
✓ No code after the component export
✓ Every statement ends with a semicolon (especially: const fn = () => { };)
`;
