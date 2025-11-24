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

Why these exist: Artifacts render in sandboxed iframes for security. Local project files and browser APIs are intentionally unavailable.
`;

export const CORE_RESTRICTIONS_REMINDER = `
[CRITICAL REMINDER]

Before finalizing your artifact:
✓ No @/ imports (use npm packages or Tailwind instead)
✓ No localStorage/sessionStorage (use React state)
✓ React accessed via global: const { useState } = React;
`;
