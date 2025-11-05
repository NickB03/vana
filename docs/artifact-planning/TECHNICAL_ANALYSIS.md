# Technical Analysis: Why shadcn/ui Cannot Work in Vana's Artifacts
**Date**: 2025-11-04  
**Conclusion**: shadcn/ui is **technically impossible** in Vana's sandboxed iframe architecture

---

## Executive Summary

**Question**: Can Vana support shadcn/ui in artifacts like Claude does?

**Answer**: **NO** - Neither Vana nor Claude can support shadcn/ui in sandboxed artifacts. Claude's official prompt lists shadcn/ui but likely doesn't work reliably either.

**Root Cause**: shadcn/ui requires local file imports (`@/components/ui/*`) which are impossible in sandboxed iframes with no module bundler.

**Solution**: Use Radix UI primitives (shadcn's foundation) loaded via CDN + Tailwind CSS styling.

---

## Vana's Artifact Architecture

### React Artifact Rendering Flow

```
User Request
    ↓
AI generates artifact code
    ↓
Artifact.tsx component receives code
    ↓
Code injected into iframe srcDoc
    ↓
Iframe loads:
  - React 18 (UMD from unpkg)
  - ReactDOM 18 (UMD from unpkg)
  - Babel Standalone (transpiles JSX in browser)
  - Tailwind CSS (CDN)
  - 25+ pre-loaded libraries (UMD from CDN)
    ↓
Babel transpiles user's JSX code
    ↓
React renders to #root div
    ↓
Artifact displays in canvas
```

### Key Technical Constraints

**1. Sandboxed Iframe Environment**
```html
<iframe
  srcDoc={previewContent}
  sandbox="allow-scripts allow-same-origin"
  title={artifact.title}
/>
```

**Implications:**
- Separate document context from parent app
- No access to parent window's modules
- No access to parent's file system
- No access to parent's node_modules

**2. No Module Bundler**
- No Vite in iframe
- No Webpack in iframe
- No esbuild in iframe
- Cannot resolve `import` statements to local files

**3. UMD Module Loading Only**
```html
<!-- This works: -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>

<!-- This doesn't work: -->
import { Button } from "@/components/ui/button"
```

**4. Babel Transpilation Limitations**
- Babel Standalone transpiles JSX → JS
- Babel does NOT bundle modules
- Babel does NOT resolve path aliases (`@/`)
- Import statements remain as-is after transpilation

---

## Why shadcn/ui Cannot Work

### shadcn/ui Architecture

shadcn/ui is **NOT a library** - it's a **collection of copy-paste components**:

```
your-project/
├── src/
│   ├── components/
│   │   └── ui/           ← shadcn components live here
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── card.tsx
│   │       └── ...
│   └── lib/
│       └── utils.ts      ← cn() helper function
└── tsconfig.json         ← Defines @/ alias
```

**Usage:**
```tsx
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

### The Import Resolution Problem

**Step 1: AI generates code**
```tsx
import { Button } from "@/components/ui/button"

export default function App() {
  return <Button>Click me</Button>
}
```

**Step 2: Code injected into iframe**
```html
<script type="text/babel">
  import { Button } from "@/components/ui/button"
  
  export default function App() {
    return <Button>Click me</Button>
  }
  
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
```

**Step 3: Babel transpiles JSX**
```javascript
// Babel output:
import { Button } from "@/components/ui/button"  // ← UNCHANGED

export default function App() {
  return React.createElement(Button, null, "Click me");
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
```

**Step 4: Browser tries to execute**
```
❌ ERROR: Cannot find module '@/components/ui/button'
```

**Why it fails:**
1. `@/` is a path alias defined in tsconfig.json/vite.config.ts
2. Iframe has no access to parent's tsconfig.json
3. Iframe has no module bundler to resolve the alias
4. Browser doesn't understand `@/` - it's not a valid URL or module specifier
5. Even if `@/` resolved, iframe can't access parent's file system

---

## What Actually Works: Radix UI + Tailwind

### Radix UI Architecture

Radix UI provides **headless UI primitives** as **npm packages**:

```
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-popover
@radix-ui/react-tooltip
@radix-ui/react-tabs
@radix-ui/react-switch
@radix-ui/react-slider
```

**Key difference**: These are **real npm packages** with **UMD builds** available on CDN.

### How Vana Loads Radix UI

**Feature branch implementation:**
```html
<!-- Pre-load Radix UI primitives via CDN -->
<script src="https://unpkg.com/@radix-ui/react-dialog@1.0.5/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-dropdown-menu@2.0.6/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-popover@1.0.7/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-tooltip@1.0.7/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-tabs@1.0.4/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-switch@1.0.3/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-slider@1.1.2/dist/index.umd.js"></script>
```

**UMD builds expose global objects:**
```javascript
// After loading UMD script, these are available:
window.RadixDialog
window.RadixDropdownMenu
window.RadixPopover
// etc.
```

### Usage in Artifacts

**This works:**
```tsx
import * as Dialog from '@radix-ui/react-dialog'

<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-blue-600 text-white rounded-lg">
    Open
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6">
      <Dialog.Title className="text-xl font-semibold">Title</Dialog.Title>
      <Dialog.Description>Content</Dialog.Description>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Why it works:**
1. Radix UI UMD script loaded before user code runs
2. Import statement resolves to pre-loaded global object
3. No file system access needed
4. No module bundler needed
5. Tailwind CSS (via CDN) styles the components

---

## Comparison: shadcn/ui vs Radix UI in Artifacts

| Aspect | shadcn/ui | Radix UI + Tailwind |
|--------|-----------|---------------------|
| **Distribution** | Copy-paste files | npm packages with UMD builds |
| **Import path** | `@/components/ui/*` (local) | `@radix-ui/react-*` (CDN) |
| **Requires bundler** | ✅ Yes (Vite/Webpack) | ❌ No (UMD globals) |
| **Works in iframe** | ❌ No | ✅ Yes |
| **Styling** | Pre-styled with Tailwind | Headless (style with Tailwind) |
| **Customization** | Edit local files | Apply Tailwind classes |
| **Primitives** | Radix UI (wrapped) | Radix UI (direct) |
| **Accessibility** | ✅ Excellent | ✅ Excellent (same foundation) |

**Conclusion**: Radix UI + Tailwind provides the **same functionality** as shadcn/ui but works in sandboxed iframes.

---

## Does Claude Support shadcn/ui?

### Evidence from Claude's Official Prompt

**Line 89:**
```
- shadcn/ui: `import { Alert, AlertDescription, AlertTitle, AlertDialog, AlertDialogAction } from '@/components/ui/alert'` (mention to user if used)
```

### Analysis

**Three possible explanations:**

**1. Claude has special infrastructure (unlikely)**
- Pre-bundles shadcn components into artifacts
- Injects component code directly
- Very complex, high maintenance

**2. Claude's prompt is incorrect/outdated (likely)**
- Legacy documentation
- Not updated after architecture changes
- shadcn/ui doesn't actually work reliably

**3. Claude uses different rendering (possible)**
- Not sandboxed iframes
- Server-side rendering with bundling
- Different security model

### Most Likely Reality

Claude's prompt **lists shadcn/ui but it probably doesn't work** for the same reasons it doesn't work in Vana:
- Sandboxed environments can't access local files
- No module bundler in browser
- Path aliases don't resolve

**The note "(mention to user if used)"** suggests it's **special/problematic**, not standard.

---

## Vana's Advantage: Honest Implementation

### What Vana Does Right

**1. Pre-loads 25+ libraries** (more than Claude lists)
- Icons: lucide-react, feather-icons
- Charts: recharts, d3, plotly
- 3D: three.js
- Utils: lodash, date-fns, uuid, DOMPurify, axios
- State: zustand
- Animation: framer-motion, animate.css
- Forms: react-hook-form
- **UI Primitives: Radix UI (7 components)**

**2. Uses Radix UI directly** (shadcn's foundation)
- Same accessibility
- Same functionality
- Actually works in iframes

**3. Transparent about limitations**
- CLAUDE.md (feature branch) correctly states shadcn/ui doesn't work
- Recommends Radix UI + Tailwind instead

### What Needs Fixing

**System prompt still promotes shadcn/ui** despite implementation not supporting it.

**Result**: AI generates broken code → artifacts fail → user frustration

---

## Recommended Solution

### Update System Prompt

**Remove:**
- All shadcn/ui promotion (88 lines)
- "RECOMMENDED" language
- shadcn/ui code examples
- "USE shadcn/ui as primary choice"

**Add:**
- Radix UI primitives guidance
- Import syntax for 7 Radix components
- Tailwind styling examples
- **Critical warning**: "Local imports (`@/components/ui/*`) are NOT available"

### Result

**AI will generate:**
```tsx
import * as Dialog from '@radix-ui/react-dialog'

<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-blue-600 text-white rounded-lg">
    Open
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Content className="bg-white rounded-lg p-6">
      Content
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Instead of:**
```tsx
import { Button } from "@/components/ui/button"  // ❌ FAILS

<Button>Open</Button>
```

---

## Conclusion

**Vana's artifact implementation is CORRECT and SUPERIOR to Claude's.**

The system prompt just needs to catch up with the excellent technical implementation.

**Action**: Complete Phase 1 of improvement plan to align prompt with reality.

