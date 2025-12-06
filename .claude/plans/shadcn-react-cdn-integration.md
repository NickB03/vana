# shadcn-react CDN Integration Plan

**Goal**: Replace Radix UI + manual Tailwind styling with pre-built `shadcn-react` components from jsDelivr CDN for more consistent, higher-quality artifacts.

**Status**: Planning  
**Created**: 2025-12-06

---

## Executive Summary

The `shadcn-react` npm package (https://cdn.jsdelivr.net/npm/shadcn-react@0.0.22/) provides pre-built shadcn/ui components that:
- Use the **exact same CSS variable naming** as our app (`--primary`, `--background`, etc.)
- Include **Radix UI primitives** already bundled
- Include **Lucide icons** 
- Are available via CDN (~177KB for core, ~40KB gzipped)

This eliminates the need for the AI to generate 15+ Tailwind classes per component, reducing hallucinations and improving visual consistency.

---

## Architecture Changes

### Current Flow (Radix + Tailwind)
```
AI generates code → Server bundles Radix from esm.sh → Client renders in iframe
                 → AI must generate all styling manually
                 → 2-5 second bundling time
```

### New Flow (shadcn-react CDN)
```
AI generates code → shadcn-react loaded from CDN cache → Client renders in iframe
                 → AI uses pre-styled components (<Button variant="outline">)
                 → Instant load (cached CDN)
```

---

## Implementation Phases

### Phase 1: Infrastructure (CDN + Iframe Setup)

#### 1.1 Update Server Bundle Template
**File**: `supabase/functions/bundle-artifact/index.ts`

Add shadcn-react CSS and JS to the HTML template:

```html
<!-- In <head> section, AFTER Tailwind -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shadcn-react@0.0.22/dist/style.css">

<!-- In <body>, before app scripts -->
<script type="module">
  import * as ShadcnUI from 'https://cdn.jsdelivr.net/npm/shadcn-react@0.0.22/dist/+esm';
  window.ShadcnUI = ShadcnUI;
  
  // Also expose common components directly for convenience
  window.Button = ShadcnUI.Button;
  window.Card = ShadcnUI.Card;
  window.CardHeader = ShadcnUI.CardHeader;
  window.CardTitle = ShadcnUI.CardTitle;
  window.CardContent = ShadcnUI.CardContent;
  // ... etc for frequently used components
</script>
```

#### 1.2 Add Theme Override Injection
**File**: `supabase/functions/bundle-artifact/index.ts`

Inject app's CSS variables to override shadcn-react defaults:

```html
<!-- In <head>, AFTER shadcn-react CSS -->
<style id="theme-override">
  :root {
    ${Object.entries(themeVars).map(([k, v]) => `${k}: ${v};`).join('\n    ')}
  }
</style>
```

#### 1.3 Update CSP Headers
Ensure `cdn.jsdelivr.net` is allowed for both scripts and styles (already in CSP, verify).

---

### Phase 2: System Prompt Updates

#### 2.1 Update System Prompt
**File**: `supabase/functions/_shared/system-prompt.txt`

Replace the current "NEVER use shadcn" rules with shadcn-react instructions:

```diff
- 🚨🚨🚨 CRITICAL RULE - READ THIS FIRST 🚨🚨🚨
- **NEVER EVER import from @/components/ui/** in artifacts. NEVER use shadcn/ui components.
- **ONLY use: Radix UI primitives + Tailwind CSS**

+ 🎨 ARTIFACT UI COMPONENTS 🎨
+
+ **USE shadcn-react components** for consistent, professional UIs:
+
+ ✅ **CORRECT** (pre-styled, accessible):
+ ```jsx
+ const { Button, Card, CardHeader, CardTitle, CardContent,
+         Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
+         Input, Label, Checkbox, Select, Tabs, TabsList, TabsTrigger, TabsContent,
+         Table, TableHeader, TableBody, TableRow, TableHead, TableCell } = ShadcnUI;
+
+ export default function App() {
+   return (
+     <Card>
+       <CardHeader>
+         <CardTitle>My App</CardTitle>
+       </CardHeader>
+       <CardContent>
+         <Button variant="outline" size="sm">Click me</Button>
+       </CardContent>
+     </Card>
+   );
+ }
+ ```
+
+ ❌ **FORBIDDEN** (Will cause artifact to break):
+ - `import { Button } from "@/components/ui/button"` ← NEVER
+ - `import { Card } from "@/components/ui/card"` ← NEVER
+ - Any path starting with `@/` ← NEVER
+
+ **Component Variants**:
+ - Button: `variant="default|destructive|outline|secondary|ghost|link"` `size="default|sm|lg|icon"`
+ - Card: CardHeader, CardTitle, CardDescription, CardContent, CardFooter
+ - Dialog: DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription
+ - Tabs: TabsList, TabsTrigger, TabsContent
+ - Table: TableHeader, TableBody, TableRow, TableHead, TableCell
+ - Input: `<Input placeholder="..." />`
+ - Label: `<Label htmlFor="...">Label text</Label>`
+ - Checkbox: `<Checkbox id="..." />`
+ - Select: SelectTrigger, SelectContent, SelectItem, SelectValue
```

#### 2.2 Add shadcn-react Component Reference
**File**: `supabase/functions/_shared/system-prompt.txt`

Add complete component list to available libraries section:

```markdown
- shadcn-react (via CDN): Pre-styled UI components
  - Layout: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
  - Forms: Button, Input, Textarea, Label, Checkbox, Radio, Select, Switch, Slider
  - Feedback: Alert, AlertDialog, Dialog, Drawer, Sheet, Toast/Toaster
  - Data: Table, Tabs, Accordion, Collapsible
  - Navigation: Breadcrumb, Menubar, Pagination, Sidebar
  - Overlay: Dialog, Popover, Tooltip, HoverCard, ContextMenu, Dropdown
  - Misc: Avatar, Badge, Calendar, Carousel, Progress, Skeleton, Spinner

  Access via: `const { Button, Card, ... } = ShadcnUI;`
```

---

### Phase 3: Client-Side Rendering Updates

#### 3.1 Update Client-Side Babel Renderer
**File**: `src/components/ArtifactRenderer.tsx`

Add shadcn-react to client-side rendering for non-bundled artifacts:

```typescript
// In the Babel artifact HTML template, add:
const shadcnScripts = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shadcn-react@0.0.22/dist/style.css">
<script type="module">
  import * as ShadcnUI from 'https://cdn.jsdelivr.net/npm/shadcn-react@0.0.22/dist/+esm';
  window.ShadcnUI = ShadcnUI;
</script>
`;
```

#### 3.2 Update BundledArtifactFrame Theme Injection
**File**: `src/components/ArtifactRenderer.tsx`

Ensure theme variables are injected AFTER shadcn-react CSS:

```typescript
// After fetching bundle HTML, inject theme CSS after shadcn-react stylesheet
if (htmlContent.includes('shadcn-react')) {
  const themeOverride = generateThemeCSS();
  htmlContent = htmlContent.replace(
    '</head>',
    `<style id="theme-override">${themeOverride}</style></head>`
  );
}
```

---

### Phase 4: Import Detection Updates

#### 4.1 Update NPM Detection
**File**: `src/utils/npmDetection.ts`

Add shadcn-react detection to skip unnecessary server bundling:

```typescript
// shadcn-react is loaded via CDN global, not npm import
const CDN_GLOBALS = [
  'ShadcnUI',
  'lucide-react', // still separate for icon-only usage
  'recharts',
];

// If code only uses ShadcnUI global destructuring, no bundling needed
const usesShadcnGlobal = /const\s*{[^}]+}\s*=\s*ShadcnUI/.test(code);
```

---

### Phase 5: Validation Updates

#### 5.1 Update Artifact Validator
**File**: `supabase/functions/_shared/artifact-validator.ts`

Update validation rules:

```typescript
// OLD: Block all shadcn imports
// NEW: Block @/ imports, allow ShadcnUI global

const BLOCKED_IMPORTS = [
  /@\/components/,     // Local imports still blocked
  /@\/lib\/utils/,     // Local utils still blocked
];

const ALLOWED_PATTERNS = [
  /ShadcnUI\./,                    // Global access
  /const\s*{[^}]+}\s*=\s*ShadcnUI/, // Destructuring from global
];
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bundle-artifact/index.ts` | Add shadcn-react CSS/JS, theme injection |
| `supabase/functions/_shared/system-prompt.txt` | Replace Radix instructions with shadcn-react |
| `src/components/ArtifactRenderer.tsx` | Add shadcn-react to client-side, theme injection |
| `src/utils/npmDetection.ts` | Detect ShadcnUI global usage |
| `supabase/functions/_shared/artifact-validator.ts` | Update validation rules |

---

## Bundle Sizes

| Asset | Size | Gzipped | Purpose |
|-------|------|---------|---------|
| `style.css` | 51 KB | ~8 KB | Component styles |
| `index.js` | 126 KB | ~30 KB | Core components |
| `icons.js` | 808 KB | ~80 KB | Lucide icons (optional, already have lucide-react) |
| `recharts.js` | 576 KB | ~100 KB | Charts (optional, already have recharts) |

**Recommended**: Load only `style.css` + `index.js` = ~38 KB gzipped

---

## Testing Plan

### Unit Tests
1. Verify theme CSS variables override shadcn-react defaults
2. Test ShadcnUI global is available in iframe
3. Test common components render: Button, Card, Dialog, Table, Tabs

### Integration Tests
1. Generate artifact with Button + Card → verify renders with app theme
2. Generate complex artifact with Dialog, Table, Tabs → verify all work
3. Test dark mode theme sync
4. Test theme switching (gemini, forest, etc.)

### Manual Testing
1. Ask AI to "create a todo app with shadcn components"
2. Ask AI to "build a data table with sorting"
3. Ask AI to "create a settings dialog with form inputs"
4. Verify consistent styling across multiple artifacts

---

## Rollback Plan

If issues arise:
1. Revert system prompt to Radix-only instructions
2. Remove shadcn-react CDN from templates
3. Existing artifacts will continue working (Radix + Tailwind fallback)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Artifact styling consistency | ~60% (AI varies) | ~95% (baked in) |
| Bundling time for UI-heavy artifacts | 2-5 seconds | 0 seconds (CDN cached) |
| AI tokens for UI code | ~500 tokens | ~200 tokens |
| "Artifact failed" rate for UI issues | ~15% | <5% |

---

## Open Questions

1. **Icons**: Keep separate `lucide-react` or use shadcn-react's bundled icons?
   - Recommendation: Use shadcn-react icons to reduce bundle count

2. **Charts**: Keep separate `recharts` or use shadcn-react's Chart component?
   - Recommendation: Keep recharts for now, shadcn Chart is wrapper anyway

3. **Version pinning**: Pin to specific version or use `@latest`?
   - Recommendation: Pin to 0.0.22 for stability, update quarterly

4. **Fallback**: What if jsDelivr CDN is down?
   - Recommendation: Add esm.sh as fallback origin

