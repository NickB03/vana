# Sandpack Integration - Handoff Prompt for Next Agent

**Copy the text below this line and paste it as your first message to the next AI agent:**

---

I need you to complete the Sandpack integration deployment for the llm-chat-site project. The previous agent completed Steps 1-3 (installation and setup) but is now blocked at Step 4 (testing). Here's the complete context:

## Project Context
- **Project:** AI chat application with artifact rendering (React, HTML, SVG, Mermaid, etc.)
- **Repository:** https://github.com/NickB03/llm-chat-site
- **Current Branch:** vercel-test
- **Working Directory:** /Users/nick/Projects/llm-chat-site
- **Dev Server:** Running on http://localhost:8081/

## Problem Being Solved
React artifacts with npm package imports (e.g., `import { LineChart } from 'recharts'`) currently fail with "require is not defined" because the iframe-based renderer doesn't support ES modules. We're integrating Sandpack (CodeSandbox's in-browser bundler) to handle these artifacts.

## Current Status: 30% Complete (Blocked at Step 4 of 8)

### ✅ What's Already Done (Steps 1-3):
1. Kibo UI Sandbox installed via `npx kibo-ui add sandbox`
2. `@codesandbox/sandpack-react@2.20.0` added to package.json
3. Dev server running without errors
4. `src/utils/npmDetection.ts` exists and is fully functional
5. `src/components/kibo-ui/sandbox/index.tsx` exists (252 lines, all exports available)

### ❌ What's Missing (Blocking Step 4):
1. **CRITICAL BUG:** `src/components/Artifact.tsx` line 136 uses `extractNpmDependencies()` but it's NOT imported (will cause ReferenceError)
2. **MISSING FILE:** `src/components/SandpackArtifactRenderer.tsx` does not exist
3. **MISSING LOGIC:** `src/components/Artifact.tsx` has no Sandpack integration logic (no imports, no conditional rendering, no needsSandpack detection)

## Your Tasks (Complete in Order)

### Task 1: Fix Critical Bug in Artifact.tsx (5 minutes)
**File:** `src/components/Artifact.tsx`

**Add this import around line 13 (after other imports):**
```typescript
import { detectNpmImports, extractNpmDependencies } from '@/utils/npmDetection';
```

**Verification:** Line 136 currently has `const dependencies = extractNpmDependencies(artifact.content);` - this will now work without crashing.

---

### Task 2: Create SandpackArtifactRenderer.tsx (30 minutes)
**File:** `src/components/SandpackArtifactRenderer.tsx` (NEW FILE)

**Requirements:**
- Import components from `@/components/kibo-ui/sandbox` (SandboxProvider, SandboxLayout, SandboxPreview, SandboxCodeEditor, SandboxConsole)
- Import `extractNpmDependencies` from `@/utils/npmDetection`
- Import `ArtifactSkeleton` from `@/components/ui/artifact-skeleton`
- Import `Alert`, `AlertDescription` from `@/components/ui/alert`
- Import `AlertCircle` from `lucide-react`

**Props Interface:**
```typescript
interface SandpackArtifactRendererProps {
  code: string;
  title: string;
  showEditor?: boolean;
  onError?: (error: string) => void;
  onReady?: () => void;
}
```

**Implementation Requirements:**
1. Extract dependencies from code using `extractNpmDependencies(code)`
2. Create files object with `/App.js` (user's code) and `/index.js` (React entry point)
3. Use `SandboxProvider` with:
   - `template="react"`
   - `customSetup.dependencies` including React 18.3.0, react-dom 18.3.0, and extracted deps
   - `options.externalResources` including Tailwind CDN: `['https://cdn.tailwindcss.com']`
   - `options.autorun=true`, `recompileMode='delayed'`, `recompileDelay=300`
4. Show loading skeleton while initializing (use `ArtifactSkeleton` component)
5. Show error alert if errors occur
6. Conditionally render `SandboxCodeEditor` (if showEditor=true) or `SandboxPreview` (if showEditor=false)

**Reference:** See `.claude/sandpack-implementation-summary.md` for detailed implementation pattern

---

### Task 3: Integrate Sandpack into Artifact.tsx (30 minutes)
**File:** `src/components/Artifact.tsx`

**Changes Required:**

**3.1: Add imports (around line 1-16):**
```typescript
import { lazy, Suspense } from "react";
import { detectNpmImports, extractNpmDependencies } from '@/utils/npmDetection';

const SandpackArtifactRenderer = lazy(() => 
  import('./SandpackArtifactRenderer').then(module => ({ 
    default: module.SandpackArtifactRenderer 
  }))
);
```

**3.2: Add needsSandpack detection (around line 55-65, after other useState/useRef hooks):**
```typescript
const needsSandpack = useMemo(() => {
  if (artifact.type !== 'react') return false;
  const sandpackEnabled = import.meta.env.VITE_ENABLE_SANDPACK !== 'false';
  if (!sandpackEnabled) return false;
  return detectNpmImports(artifact.content);
}, [artifact.content, artifact.type]);
```

**3.3: Update renderPreview() function (find the function around line 225-252):**
Add this BEFORE the existing React artifact rendering logic:
```typescript
if (artifact.type === "react" && needsSandpack) {
  return (
    <div className="w-full h-full relative">
      <Suspense fallback={<ArtifactSkeleton type="react" />}>
        <SandpackArtifactRenderer
          code={artifact.content}
          title={artifact.title}
          showEditor={false}
          onError={(error) => {
            setPreviewError(error);
            setIsLoading(false);
          }}
          onReady={() => setIsLoading(false)}
        />
      </Suspense>
    </div>
  );
}
```

**3.4: Update renderCode() function (find the function around line 685-717):**
Add this BEFORE the existing code rendering logic:
```typescript
if (artifact.type === "react" && needsSandpack) {
  return (
    <Suspense fallback={<ArtifactSkeleton type="react" />}>
      <SandpackArtifactRenderer
        code={editedContent}
        title={artifact.title}
        showEditor={true}
        onError={(error) => setPreviewError(error)}
      />
    </Suspense>
  );
}
```

**3.5: Update handlePopOut() function (find it around line 90-132):**
Add this at the BEGINNING of the function:
```typescript
const handlePopOut = () => {
  // Route Sandpack artifacts to CodeSandbox
  if (artifact.type === "react" && needsSandpack) {
    handleOpenInCodeSandbox();
    return;
  }
  
  // ... existing pop-out logic for simple artifacts
};
```

---

### Task 4: Verify Environment Variable (2 minutes)
Check if `.env` or `.env.local` has `VITE_ENABLE_SANDPACK`. If not present, Sandpack will be enabled by default (which is correct).

**Optional:** To explicitly enable, add to `.env.local`:
```bash
VITE_ENABLE_SANDPACK=true
```

---

### Task 5: Test Core Functionality (Step 4 of deployment - 30 minutes)

**5.1: Start dev server (if not running):**
```bash
npm run dev
```

**5.2: Test simple React artifact (should use iframe):**
Create this artifact in the chat:
```jsx
export default function SimpleButton() {
  return <button>Click me</button>;
}
```
**Expected:** Renders in iframe (no Sandpack)

**5.3: Test React artifact with npm imports (should use Sandpack):**
Create this artifact in the chat:
```jsx
import { LineChart, Line, XAxis, YAxis } from 'recharts';

export default function Chart() {
  const data = [
    { name: 'A', value: 10 },
    { name: 'B', value: 20 },
  ];
  
  return (
    <LineChart width={400} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
    </LineChart>
  );
}
```
**Expected:** Renders in Sandpack (you should see Sandpack's preview pane)

**5.4: Test loading states:**
- Verify loading skeleton appears briefly when Sandpack initializes

**5.5: Test error handling:**
Create artifact with syntax error:
```jsx
import { Button } from 'nonexistent-package';
export default function Test() {
  return <Button>Test</Button>
}
```
**Expected:** Error alert displays

**5.6: Test pop-out functionality:**
- Click pop-out on simple artifact → Should open in new window
- Click pop-out on Sandpack artifact → Should open in CodeSandbox

---

## Success Criteria
After completing Tasks 1-5, you should be able to confirm:
- ✅ No console errors when loading the app
- ✅ Simple React artifacts render in iframe
- ✅ React artifacts with npm imports render in Sandpack
- ✅ Loading states work correctly
- ✅ Error handling displays errors properly
- ✅ Pop-out routes correctly (simple → window, Sandpack → CodeSandbox)

---

## Key Documentation Files (Read These First)
1. `.claude/SANDPACK_PROJECT_STATUS.md` - Current status and what's missing
2. `.claude/SANDPACK_ACTUAL_STATUS.md` - Detailed codebase analysis
3. `.claude/sandpack-implementation-summary.md` - Implementation patterns

---

## Remaining Steps After Task 5
- Step 6: Run build verification (`npm run build`)
- Step 7: Browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Step 8: Report results

---

**Start with Task 1 (fix the critical bug), then proceed through Tasks 2-5 in order. Stop and report if any step fails.**


