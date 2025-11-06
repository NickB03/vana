# Sandpack Integration - Project Status Document

**Last Updated:** 2025-01-06  
**Project:** llm-chat-site (AI Chat Application)  
**Repository:** https://github.com/NickB03/llm-chat-site  
**Current Branch:** vercel-test  
**Dev Server:** http://localhost:8081/ (running)

---

## 📊 Implementation Status: 30% Complete

**Current Deployment Step:** Blocked at Step 4 of 8

---

## ✅ Completed Work (Steps 1-3)

### Step 1: Install Kibo UI Sandbox ✅
- **Command:** `npx kibo-ui add sandbox`
- **Result:** Successfully installed `@codesandbox/sandpack-react@2.20.0`
- **Files Created:** `src/components/kibo-ui/sandbox/index.tsx` (252 lines)
- **Warning:** npm deprecation warning for `source-map@0.8.0-beta.0` (harmless, safe to ignore)

### Step 2: Verify Installation ✅
- **Confirmed:** `src/components/kibo-ui/sandbox/` directory exists
- **Confirmed:** `@codesandbox/sandpack-react` in package.json dependencies
- **Confirmed:** No installation errors

### Step 3: Start Development Server ✅
- **Command:** `npm run dev`
- **Result:** Dev server running on http://localhost:8081/ (port 8080 was in use)
- **Status:** No startup errors

---

## ❌ Missing Implementation (Blocking Progress)

### Critical Missing File #1: SandpackArtifactRenderer.tsx
**Path:** `src/components/SandpackArtifactRenderer.tsx`  
**Status:** DOES NOT EXIST (never created or was deleted)

**Purpose:** Wrapper component to integrate Kibo UI Sandbox with Artifact.tsx

**Required Features:**
- Accept props: `code`, `title`, `showEditor`, `onError`, `onReady`
- Extract dependencies from code using `extractNpmDependencies()`
- Render component hierarchy: `SandboxProvider` → `SandboxLayout` → `SandboxPreview`/`SandboxCodeEditor`
- Theme synchronization with app theme (light/dark)
- Loading skeleton during initialization
- Error handling with fallback

**Impact:** Without this file, Sandpack cannot render React artifacts with npm dependencies

---

### Critical Missing Logic #2: Artifact.tsx Integration
**Path:** `src/components/Artifact.tsx`  
**Status:** PARTIALLY MODIFIED (only CodeSandbox pop-out implemented)

**What IS Implemented:**
- ✅ `handleOpenInCodeSandbox()` function (lines 134-206)

**What IS NOT Implemented:**
1. ❌ Missing import: `import { detectNpmImports, extractNpmDependencies } from '@/utils/npmDetection';`
2. ❌ Missing import: `import { lazy, Suspense } from "react";`
3. ❌ Missing lazy import: `const SandpackArtifactRenderer = lazy(() => import('./SandpackArtifactRenderer'));`
4. ❌ Missing `needsSandpack` useMemo hook (should be around line 55-65)
5. ❌ Missing conditional Sandpack rendering in `renderPreview()` function
6. ❌ Missing conditional Sandpack editor in `renderCode()` function
7. ❌ Missing logic in `handlePopOut()` to call `handleOpenInCodeSandbox()` for Sandpack artifacts

---

## 🚨 Critical Bugs

### Bug #1: Missing Import (Runtime Error)
**File:** `src/components/Artifact.tsx`  
**Line:** 136  
**Code:** `const dependencies = extractNpmDependencies(artifact.content);`

**Problem:** `extractNpmDependencies` is used but NOT imported

**Error Type:** `ReferenceError: extractNpmDependencies is not defined`

**Fix Required:**
```typescript
// Add to imports at top of file (around line 13)
import { detectNpmImports, extractNpmDependencies } from '@/utils/npmDetection';
```

**Impact:** If `handleOpenInCodeSandbox()` is called, the app will crash

---

## 📁 File Status Matrix

| File Path | Expected Status | Actual Status | Notes |
|-----------|----------------|---------------|-------|
| `src/utils/npmDetection.ts` | ✅ Created | ✅ EXISTS | Fully implemented, ready to use |
| `src/components/kibo-ui/sandbox/index.tsx` | ✅ Installed | ✅ EXISTS | 252 lines, all exports available |
| `src/components/SandpackArtifactRenderer.tsx` | ✅ Created | ❌ MISSING | **BLOCKER** - Must be created |
| `src/components/Artifact.tsx` | ✅ Modified | ⚠️ PARTIAL | Missing imports and integration logic |
| `package.json` | ✅ Updated | ✅ UPDATED | Sandpack dependency added |
| `.env` or `.env.local` | ⚠️ Should have flag | ❓ UNKNOWN | Need `VITE_ENABLE_SANDPACK=true` |

---

## 🔧 Available Utilities (Ready to Use)

### From `src/utils/npmDetection.ts`:
- `detectNpmImports(code: string): boolean` - Returns true if npm imports found (excluding React/ReactDOM)
- `extractNpmDependencies(code: string): Record<string, string>` - Returns package → version map
- `getPackageVersion(pkg: string): string` - Maps package names to versions
- `isSafePackage(pkg: string): boolean` - Validates package safety

### From `src/components/kibo-ui/sandbox/index.tsx`:
- `SandboxProvider` - Wrapper for SandpackProvider
- `SandboxLayout` - Layout component
- `SandboxCodeEditor` - Code editor with syntax highlighting
- `SandboxPreview` - Preview pane for rendered output
- `SandboxConsole` - Console output viewer
- `SandboxFileExplorer` - File tree navigator
- `SandboxTabs*` - Tab components for multi-panel layouts

---

## 🎯 Current Behavior vs Expected Behavior

### Current Behavior (Broken):
1. ALL React artifacts render in iframe (original behavior)
2. React artifacts with npm imports FAIL with "require is not defined"
3. Pop-out button opens new window (original behavior)
4. `handleOpenInCodeSandbox()` exists but is NEVER called
5. If called, would crash due to missing import

### Expected Behavior (After Fix):
1. Simple React artifacts (no npm imports) → Render in iframe
2. React artifacts with npm imports → Render in Sandpack
3. Pop-out for simple artifacts → New window
4. Pop-out for Sandpack artifacts → Open in CodeSandbox
5. Loading states display correctly
6. Errors handled gracefully

---

## 📋 Remaining Deployment Steps (4-8)

### Step 4: Test Core Functionality ⏸️ BLOCKED
**Blockers:**
- Missing `SandpackArtifactRenderer.tsx`
- Missing integration logic in `Artifact.tsx`
- Missing import causing runtime error

**Required Tests:**
- Simple React artifact (no npm imports) uses iframe renderer
- React artifact with npm imports (e.g., `import { LineChart } from 'recharts'`) uses Sandpack renderer
- Loading states display correctly
- Error handling works for syntax errors
- Theme switching (light/dark) updates Sandpack theme

### Step 5: Test Pop-out Functionality ⏸️ BLOCKED
### Step 6: Run Build Verification ⏸️ BLOCKED
### Step 7: Browser Compatibility Testing ⏸️ BLOCKED
### Step 8: Report Results ⏸️ BLOCKED

---

## 📚 Key Documentation Files

1. **`.claude/SANDPACK_ACTUAL_STATUS.md`** - Comprehensive codebase analysis (what exists vs expected)
2. **`.claude/sandpack-implementation-summary.md`** - Original implementation plan
3. **`.claude/sandpack-popout-implementation.md`** - Pop-out solution details (CodeSandbox integration)
4. **`.claude/sandpack-offline-support.md`** - Offline caching explanation
5. **`.claude/codesandbox-cost-analysis.md`** - Cost breakdown ($0/month for CodeSandbox)
6. **`.claude/sandpack-integration-plan.md`** - Detailed integration plan
7. **`.claude/sandpack-quick-start.md`** - Quick reference guide

---

## 🎯 Next Immediate Steps

To unblock Step 4 and proceed with deployment:

1. **Fix Critical Bug** (5 minutes)
   - Add missing import to `src/components/Artifact.tsx` line ~13

2. **Create SandpackArtifactRenderer.tsx** (30 minutes)
   - Implement wrapper component with all required features

3. **Complete Artifact.tsx Integration** (30 minutes)
   - Add lazy import for SandpackArtifactRenderer
   - Add `needsSandpack` detection logic
   - Update `renderPreview()` for conditional rendering
   - Update `renderCode()` for editor mode
   - Update `handlePopOut()` to route Sandpack artifacts to CodeSandbox

4. **Verify Environment Variable** (2 minutes)
   - Check if `VITE_ENABLE_SANDPACK` is set (default should be true)

5. **Test Core Functionality** (Step 4)
   - Create test artifacts in chat interface
   - Verify routing logic works correctly

---

## 🔑 Environment Configuration

**Required Environment Variable:**
```bash
VITE_ENABLE_SANDPACK=true  # Default if not set
```

**To disable Sandpack (rollback):**
```bash
VITE_ENABLE_SANDPACK=false
```

---

## 📞 Project Context

**Goal:** Enable React artifacts with npm package imports to render correctly in the AI chat application

**Problem:** Current iframe-based renderer fails with "require is not defined" for modern ES6 imports

**Solution:** Use Sandpack (CodeSandbox's in-browser bundler) for React artifacts with npm dependencies

**Approach:** Hybrid rendering - iframe for simple artifacts, Sandpack for complex artifacts with npm imports

**Cost:** $0/month (CodeSandbox free tier, no API key required)


