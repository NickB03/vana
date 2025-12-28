# Artifact Import Restrictions

## Overview

Artifacts are rendered in isolated iframe sandboxes and **cannot** use local imports from the Vana codebase. This is a fundamental security and isolation constraint.

## Why Local Imports Don't Work

### Sandbox Isolation

Artifacts run in isolated `<iframe>` elements with these characteristics:

1. **Different Origin**: The iframe uses a `blob:` or `data:` URL, creating a separate security origin
2. **No Access to Parent**: Cannot access parent window's modules or bundled code
3. **No Build Process**: Not part of the Vite build, so path aliases don't resolve
4. **Static HTML**: Artifacts are self-contained HTML documents with inline scripts

### Path Resolution Failure

```tsx
// ❌ FORBIDDEN - These NEVER work in artifacts
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import SomeUtil from "../utils/helper"

// Why they fail:
// - @/ alias doesn't exist in iframe context
// - Relative paths don't resolve (different origin)
// - Modules aren't bundled into artifact HTML
// - No access to parent window's modules
```

## What You CAN Use

### 1. NPM Packages (Server-Bundled)

When artifacts import npm packages, they're automatically bundled via the `bundle-artifact/` Edge Function:

```tsx
// ✅ CORRECT - NPM packages work
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
```

**How It Works**:
1. AI generates artifact with npm imports
2. Backend detects imports, triggers server bundling
3. Packages loaded from esm.sh CDN with `?external=react,react-dom`
4. Import maps redirect bare specifiers to global `window.React`
5. Artifact renders with all dependencies resolved

**Bundle Timeout**: 60 seconds for large dependency trees

### 2. Tailwind CSS

Tailwind works because the CSS is injected via CDN link in the artifact HTML:

```tsx
// ✅ CORRECT - Tailwind classes work
export default function App() {
  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600">Hello</h1>
    </div>
  );
}
```

**Included in Template**:
```html
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
```

### 3. Global React/ReactDOM

React and ReactDOM are provided as globals via CDN and import map shims:

```tsx
// ✅ CORRECT - These globals are pre-loaded
const App = () => <div>Hello</div>;
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

**Provided Globals**:
- `window.React` — React library
- `window.ReactDOM` — ReactDOM library
- Import map redirects `react`, `react-dom`, `react/jsx-runtime` to these globals

## Server Bundling System

### When Bundling Triggers

Bundling automatically occurs when artifacts contain:
- `import` statements with package names (e.g., `import { motion } from 'framer-motion'`)
- npm packages (not local paths)

### Bundle Process

1. **Detection**: `artifact-validator.ts` scans for imports
2. **Trigger**: Backend calls `bundle-artifact/` Edge Function
3. **CDN Fetch**: esm.sh fetches packages with `?external=react,react-dom`
4. **Import Map**: Generates shims for bare specifiers (`react`, `react-dom`)
5. **Response**: Returns bundled artifact URL

### React Instance Unification

**Problem**: Multiple React instances cause errors ("Invalid hook call", "useRef null")

**Solution**: Server-side React externalization + import map shims

**Server** (`bundle-artifact/`):
```typescript
// Generate esm.sh URLs with React externalization
const url = `https://esm.sh/@radix-ui/react-dialog@1.0.5?external=react,react-dom`;
```

**Import Map** (in bundled artifact HTML):
```html
<script type="importmap">
{
  "imports": {
    "react": "data:text/javascript,export default window.React;export const ...",
    "react-dom": "data:text/javascript,export default window.ReactDOM;...",
    "react/jsx-runtime": "data:text/javascript,export const jsx=window.React.createElement;..."
  }
}
</script>
```

**Effect**: All npm packages use the same React instance from `window.React`

### CSP Configuration

Bundled artifacts require `data:` URLs in CSP for import map shims:

```typescript
const csp = [
  "script-src 'unsafe-inline' 'unsafe-eval' https: data:",  // data: for import maps
  "style-src 'unsafe-inline' https:",
  "img-src data: https: blob:",
].join("; ");
```

## Migration Guide: shadcn/ui to Radix UI

Since artifacts can't use `@/components/ui/*`, use the underlying Radix UI primitives directly:

### Button Component

```tsx
// ❌ WRONG - Local import
import { Button } from "@/components/ui/button"

// ✅ CORRECT - Radix UI + Tailwind
import * as React from 'react';

const Button = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
    ghost: 'hover:bg-gray-100 bg-transparent',
  };

  return (
    <button
      ref={ref}
      className={`px-4 py-2 rounded-md font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
});
```

### Dialog Component

```tsx
// ❌ WRONG - Local import
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"

// ✅ CORRECT - Radix UI Dialog
import * as Dialog from '@radix-ui/react-dialog';

export default function App() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Open Dialog
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-xl">
          <Dialog.Title className="text-xl font-bold mb-4">
            Dialog Title
          </Dialog.Title>
          <Dialog.Description className="text-gray-600 mb-4">
            Dialog description goes here.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button className="px-4 py-2 bg-gray-200 rounded">Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Select Component

```tsx
// ❌ WRONG - Local import
import { Select } from "@/components/ui/select"

// ✅ CORRECT - Radix UI Select
import * as Select from '@radix-ui/react-select';

export default function App() {
  return (
    <Select.Root>
      <Select.Trigger className="px-4 py-2 border rounded-md bg-white">
        <Select.Value placeholder="Select an option" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="bg-white border rounded-md shadow-lg">
          <Select.Viewport>
            <Select.Item value="option1" className="px-4 py-2 hover:bg-gray-100">
              <Select.ItemText>Option 1</Select.ItemText>
            </Select.Item>
            <Select.Item value="option2" className="px-4 py-2 hover:bg-gray-100">
              <Select.ItemText>Option 2</Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
```

## Prebuilt Bundle System

For faster loading, common packages are pre-bundled and served from optimized URLs:

**Supported Packages** (70+ total):
- **State Management**: zustand, jotai, react-hook-form
- **UI**: @radix-ui/*, framer-motion, lucide-react
- **Forms**: zod, yup
- **Data Viz**: recharts, @nivo/*, chart.js
- **3D**: three, @react-three/fiber, @react-three/drei
- **Games**: konva, matter-js, gsap

**Usage** (automatic):
```tsx
import { useForm } from 'react-hook-form';  // Pre-bundled, loads instantly
import { motion } from 'framer-motion';     // Pre-bundled, loads instantly
```

**Location**: `supabase/functions/_shared/prebuilt-bundles.ts`

## Common Errors & Solutions

### Error: "Cannot find module '@/components/ui/button'"

**Cause**: Artifact trying to import local components

**Solution**: Use Radix UI or inline the component:
```tsx
// Instead of:
import { Button } from "@/components/ui/button"

// Do:
const Button = ({ children, ...props }) => (
  <button className="px-4 py-2 bg-blue-600 text-white rounded" {...props}>
    {children}
  </button>
);
```

### Error: "Invalid hook call warning"

**Cause**: Multiple React instances (dual React problem)

**Solution**: Verify server bundling uses `?external=react,react-dom`:
```typescript
// In bundle-artifact/index.ts
const url = `https://esm.sh/${pkg}@${version}?external=react,react-dom`;
```

### Error: "useRef is null"

**Cause**: React version mismatch or dual instances

**Solution**: Check import map shims redirect correctly:
```html
<!-- Should be in bundled artifact HTML -->
<script type="importmap">
{
  "imports": {
    "react": "data:text/javascript,export default window.React;..."
  }
}
</script>
```

## Validation & Enforcement

### Pre-Generation Validation

**Location**: `supabase/functions/_shared/artifact-validator.ts`

Scans artifact code for forbidden patterns:
```typescript
// Detects forbidden imports
const forbiddenPatterns = [
  /import\s+.*from\s+['"]@\//, // @/ imports
  /import\s+.*from\s+['"]\.\.\//,  // Relative imports
];
```

**Error Code**: `IMPORT_LOCAL_PATH`

### Auto-Fix Transformations

The validator can auto-fix some issues:
```typescript
// Before: import { Button } from "@/components/ui/button"
// After: // ⚠️ Local imports not supported in artifacts. Use Radix UI or inline components.
```

### Runtime Validation

**Location**: `src/utils/artifactValidator.ts` (frontend)

Blocks artifacts with critical errors before rendering:
```typescript
const result = validateArtifactCode(code, 'react');
if (result.issues.some(e => e.code === VALIDATION_ERROR_CODES.IMPORT_LOCAL_PATH)) {
  // Show error, prevent rendering
}
```

## Best Practices

1. **Use npm packages**: Always prefer npm packages over local components
2. **Inline simple components**: For simple UI, inline the component in the artifact
3. **Radix UI for complex UI**: Use Radix UI primitives for complex components
4. **Tailwind for styling**: Use Tailwind classes instead of CSS modules
5. **Test in isolation**: Verify artifacts work without parent context
6. **Check import maps**: Ensure React externalization is correct

## References

- **Radix UI Documentation**: https://www.radix-ui.com/primitives/docs/overview/introduction
- **esm.sh Documentation**: https://esm.sh
- **Artifact Validator**: `supabase/functions/_shared/artifact-validator.ts`
- **Bundle System**: `supabase/functions/bundle-artifact/index.ts`
- **Prebuilt Bundles**: `supabase/functions/_shared/prebuilt-bundles.ts`
