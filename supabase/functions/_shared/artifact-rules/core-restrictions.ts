/**
 * Core Artifact Restrictions
 *
 * Critical constraints that apply to ALL artifact types.
 * These restrictions prevent artifact failures due to sandbox limitations.
 *
 * Usage: Import and include at TOP and BOTTOM of generation prompts
 * for maximum compliance (primacy + recency effect).
 */

export const CORE_RESTRICTIONS = `
[CRITICAL - ARTIFACT WILL FAIL]

These restrictions are NON-NEGOTIABLE due to sandbox environment limitations:

1. **NO LOCAL IMPORTS** - Artifacts run in isolated iframes with no access to project files
   ❌ FORBIDDEN: import { Button } from "@/components/ui/button"
   ❌ FORBIDDEN: import { Card } from "@/components/ui/card"
   ❌ FORBIDDEN: import { cn } from "@/lib/utils"
   ❌ FORBIDDEN: import anything from "@/..."

   ✅ ALLOWED: import * as Dialog from '@radix-ui/react-dialog'
   ✅ ALLOWED: import { Check } from 'lucide-react'
   ✅ ALLOWED: Third-party npm packages (triggers server bundling)

2. **NO BROWSER STORAGE** - localStorage/sessionStorage APIs not supported
   ❌ FORBIDDEN: localStorage.setItem('key', value)
   ❌ FORBIDDEN: sessionStorage.getItem('key')

   ✅ CORRECT: const [value, setValue] = useState(initialValue)

3. **REACT AS GLOBAL** - React loaded as UMD global, not ES6 module
   ❌ FORBIDDEN: import React from 'react'
   ❌ FORBIDDEN: import { useState } from 'react'

   ✅ CORRECT: const { useState, useEffect, useCallback, useMemo } = React;

4. **SUCRASE-COMPATIBLE SYNTAX ONLY** - No legacy decorators or unsupported TypeScript
   ❌ FORBIDDEN: @decorator class Foo {}  (legacy decorators)
   ❌ FORBIDDEN: namespace MyNamespace {} (TypeScript namespaces)
   ❌ FORBIDDEN: const * as X from 'pkg'  (invalid import syntax)

   ✅ CORRECT: Standard TypeScript/JSX syntax
   ✅ CORRECT: Modern decorators (if needed, use reflect-metadata)
   ✅ CORRECT: All React patterns (hooks, components, props)

5. **NO DUPLICATE IMPORTS** - Each named import must appear only once per import statement
   ❌ FORBIDDEN: import { Mail, User, Mail } from 'lucide-react'  (duplicate 'Mail')
   ❌ FORBIDDEN: import { useState, useEffect, useState } from 'react'  (duplicate 'useState')

   ✅ CORRECT: import { Mail, User } from 'lucide-react'
   ✅ CORRECT: import { useState, useEffect } from 'react'

6. **CLEAN JSX/HTML OUTPUT** - No trailing document fragments or orphan elements
   ❌ FORBIDDEN: Orphan closing tags: </div></body></html> at end of file
   ❌ FORBIDDEN: Appending <!DOCTYPE html><html>... after a React component
   ❌ FORBIDDEN: const * as Name from 'package' (invalid import syntax)

   ✅ CORRECT: Complete, self-contained component with matched tags
   ✅ CORRECT: import * as Name from 'package' (valid namespace import)

   Why: The transpiler will fail on malformed output. Return ONLY the requested artifact.

Why these exist: Artifacts render in sandboxed iframes for security. Local project files and browser APIs are intentionally unavailable. Sucrase transpiler has no fallback for unsupported syntax.
`;

export const CORE_RESTRICTIONS_REMINDER = `
[CRITICAL REMINDER]

Before finalizing your artifact:
✓ No @/ imports (use npm packages or Tailwind instead)
✓ No localStorage/sessionStorage (use React state)
✓ React accessed via global: const { useState } = React;
✓ Sucrase-compatible syntax (no legacy decorators or namespaces)
✓ No duplicate named imports (each name appears only once per import)
✓ No trailing HTML fragments after React components
`;
