# Pending & Deferred Items

**Date:** 2025-11-06
**Branch:** feature/ai-elements-integration
**Status:** Active feature branch (not merged to main)

---

## Executive Summary

This document tracks all pending, deferred, and incomplete features identified during the ai-elements integration and comprehensive code reviews. Items are organized by priority (P0-P3) and category.

**Excluded:** Artifact tabs visibility issue (separate task)

---

## 🚨 P0 - Critical Security Issues

### 1. postMessage Origin Validation
**Location:** `src/components/Artifact.tsx` (lines 319, 327, 337, 350)
**Issue:** Using wildcard `'*'` origin in postMessage calls
**Security Risk:** HIGH - Allows any origin to receive sensitive iframe messages
**Fix Required:**
```typescript
// Replace all instances of:
window.parent.postMessage({ type: 'artifact-error', message: error }, '*');

// With:
window.parent.postMessage({ type: 'artifact-error', message: error }, window.location.origin);
```
**Effort:** 30 minutes
**Status:** ❌ Not Fixed
**Blocker:** Must fix before production deployment

---

### 2. Missing Sandpack Dependency Validation
**Location:** `src/utils/npmDetection.ts`
**Issue:** `isSafePackage()` function exists (lines 38-57) but is never called
**Security Risk:** HIGH - Malicious npm packages could be loaded without validation
**Fix Required:**
```typescript
// In extractNpmDependencies(), add validation:
const dependencies: Record<string, string> = {};
for (const pkg of packageNames) {
  if (!isSafePackage(pkg)) {
    console.warn(`Blocked unsafe package: ${pkg}`);
    continue; // Skip unsafe packages
  }
  dependencies[pkg] = 'latest';
}
```
**Effort:** 1 hour
**Status:** ❌ Not Implemented
**Blocker:** Should fix before production (allows arbitrary package installation)

---

## 🔴 P1 - High Priority Features

### 3. Fix Guest Mode Message Sending
**Location:** Guest mode implementation in ChatInterface.tsx
**Issue:** Non-authenticated users currently unable to send messages
**User Impact:** CRITICAL - Breaks guest experience (10 free messages feature)
**Status:** 🔴 Bug - Blocking guest users
**Investigation Required:**
- Check session validation in `handleSend()` function
- Verify guest mode detection logic
- Check if `ensureValidSession()` is blocking guest messages
- Review edge function authentication requirements

**Fix Required:**
```typescript
// In ChatInterface.tsx handleSend():
const handleSend = async (message?: string) => {
  const messageToSend = message || input.trim();
  if (!messageToSend) return;

  // Allow guests OR authenticated users
  if (!isGuest) {
    const session = await ensureValidSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  }

  // Continue with message sending...
};
```

**Testing:**
- Verify guest can send messages without auth
- Verify 10 message limit enforcement
- Verify auth prompt after limit reached
- Test edge function accepts guest requests

**Effort:** 2-3 hours (investigation + fix + testing)
**Priority:** CRITICAL - Core feature broken
**Status:** ❌ Bug Fix Required

---

### 4. Version Control UI Integration
**Location:** Hook exists at `src/hooks/useArtifactVersions.ts` (371 lines)
**Components:** `ArtifactVersionSelector.tsx`, `ArtifactDiffViewer.tsx`
**Issue:** Backend and hooks are fully functional but never imported/used in Artifact.tsx
**Status:** 🔴 Code exists but not integrated
**User Impact:** Users cannot access version history despite feature being built
**Fix Required:**
1. Import `useArtifactVersions` hook in ArtifactContainer.tsx
2. Add version selector button to artifact header actions
3. Add version diff viewer modal/drawer
4. Wire up save/load/restore functionality

**Effort:** 4-6 hours
**Tests:** 19/22 passing (3 pre-existing async issues)
**Status:** ❌ Not Integrated

---

### 5. Artifact Suggestion Click-to-Build
**Location:** Home.tsx artifact suggestion cards
**Feature:** When user clicks suggestion card, immediately start building without showing prompt
**Current Behavior:** Clicking populates chat input, user must manually send
**Desired Behavior:**
1. User clicks suggestion card → Artifact starts building immediately
2. Show "Starting your project..." toast/indicator
3. Canvas auto-opens with streaming build
4. Prompt is NOT shown to user (hidden/internal)

**Implementation:**
```typescript
// In Home.tsx or ChatInterface.tsx
const handleSuggestionClick = async (suggestion: string) => {
  // Show immediate feedback
  toast.loading("Starting your project...", { id: "artifact-build" });

  // Trigger build without populating input
  await handleSend(suggestion); // Internal send

  // Open canvas automatically
  onCanvasToggle?.(true);

  // Dismiss loading toast when streaming starts
  toast.dismiss("artifact-build");
};
```

**UI Updates:**
- Add loading state to suggestion cards during build
- Auto-scroll to show build progress
- Don't show prompt in chat history (or show abbreviated version)

**Effort:** 2-3 hours
**User Impact:** HIGH - Removes friction, feels more magical
**Status:** ❌ Enhancement Required

---

### 6. Export Menu UI Integration
**Location:** `src/utils/exportArtifact.ts`, `src/components/ExportMenu.tsx`
**Issue:** Export utility and menu component are built but no UI trigger exists
**Status:** 🔴 Code exists but not integrated
**User Impact:** Users cannot export artifacts despite full functionality being ready
**Fix Required:**
1. Import `ExportMenu` component in ArtifactContainer.tsx
2. Add export button to artifact header actions
3. Wire up to existing export utility

**Supported Formats:**
- Code: Source files with proper extensions
- HTML: Standalone HTML with CDN includes
- React: JSX with imports
- SVG: Vector graphics
- Mermaid: .mmd source and rendered SVG
- Markdown: .md files
- Images: Download from URL

**Effort:** 2-3 hours
**Status:** ❌ Not Integrated

---

### 7. Multi-Artifact Context Integration
**Location:** `src/contexts/MultiArtifactContext.tsx`
**Issue:** Context provider defined but never wraps the application
**Status:** 🔴 Code exists but not used
**User Impact:** Multi-artifact features are unavailable
**Fix Required:**
1. Wrap App.tsx with `<MultiArtifactProvider>`
2. Update ChatInterface to use multi-artifact context
3. Enable LRU eviction and sessionStorage persistence

**Features Available:**
- LRU eviction (max 5 artifacts)
- sessionStorage persistence
- Active artifact tracking
- Add/remove/toggle operations

**Effort:** 3-4 hours
**Status:** ❌ Not Integrated

---

## 🟡 P2 - Medium Priority Enhancements

### 6. WebPreview Console Viewer
**Location:** `src/components/ai-elements/web-preview.tsx` (installed, not used)
**Feature:** Display console logs from iframe artifacts
**Value:** HIGH - Useful for debugging React artifacts
**Implementation:**
```tsx
// Capture console logs via postMessage
<WebPreview defaultUrl="preview">
  <WebPreviewBody>
    <iframe srcDoc={htmlContent} />
  </WebPreviewBody>
  <WebPreviewConsole logs={consoleLogs} />
</WebPreview>
```
**Effort:** 2-3 hours
**Status:** ❌ Deferred
**Reason:** Nice-to-have enhancement

---

### 7. User-Facing Artifact Warnings
**Location:** `src/components/VirtualizedMessageList.tsx` or `ChatInterface.tsx`
**Feature:** Toast notifications when artifacts have validation warnings
**Value:** MEDIUM - Improves user awareness of potential issues
**Implementation:**
```tsx
if (parsedContent.warnings.length > 0) {
  toast.warning("Artifact may have issues", {
    description: warnings[0].messages[0],
    action: {
      label: "Ask AI to Fix",
      onClick: () => onEdit?.("Fix invalid imports in previous artifact")
    }
  });
}
```
**Effort:** 2 hours
**Status:** ❌ Deferred
**Current:** Warnings logged to console only

---

### 8. ArtifactAction Tooltips Enhancement
**Location:** `src/components/ai-elements/artifact.tsx`
**Feature:** Built into ArtifactAction component, not fully utilized
**Value:** HIGH - Better UX for action buttons
**Implementation:**
```tsx
// Replace title attributes with tooltip prop
<ArtifactAction
  icon={Copy}
  tooltip="Copy to clipboard"
  onClick={handleCopy}
/>
```
**Effort:** 1 hour
**Status:** 🟡 Partial (title attributes exist, tooltips are nicer)

---

### 9. Comprehensive Test Coverage
**Missing Tests:**
- `ArtifactContainer.tsx` - ✅ 21/21 tests exist
- `MultiArtifactContext.tsx` - ❌ No tests
- `ExportMenu.tsx` - ❌ No tests
- `ArtifactVersionSelector.tsx` - ❌ No tests (docs claim 16/16 passing)
- `useArtifactVersions.ts` - ❌ Hook tests missing

**Integration Tests Needed:**
- Multi-artifact workflow
- Version control integration
- Export functionality end-to-end
- Rate limiting behavior

**Effort:** 8-12 hours
**Status:** ❌ Incomplete
**Current Coverage:** Core rendering tests only

---

### 14. AI Error Fixing System
**Feature:** Automatic error detection and AI-suggested fixes for artifact errors
**Value:** VERY HIGH - Core feature for AI development assistant
**Current State:** No implementation, but infrastructure exists
**Integration Points:**
- Existing validation system in `artifactValidator.ts`
- Error categorization in `Artifact.tsx` (lines 236-240)
- Console error capture already working (postMessage from iframes)

**Implementation Plan:**
```typescript
// 1. Enhanced error detection
interface ArtifactError {
  message: string;
  category: 'syntax' | 'runtime' | 'import' | 'unknown';
  code: string; // The artifact code that failed
  suggestion?: string; // Auto-generated fix suggestion
}

// 2. AI fix generation
async function generateErrorFix(error: ArtifactError, artifactCode: string): Promise<string> {
  // Call edge function with error context
  const response = await supabase.functions.invoke('generate-artifact-fix', {
    body: {
      error: error.message,
      category: error.category,
      code: artifactCode,
      type: artifact.type
    }
  });
  return response.data.fixedCode;
}

// 3. UI Integration
// Add to error display in Artifact.tsx:
{previewError && (
  <Alert variant="destructive">
    <AlertDescription>
      <p>{previewError}</p>
      <div className="flex gap-2 mt-2">
        <Button onClick={() => handleAIFix()}>
          🤖 Ask AI to Fix
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

**Implementation Steps:**
1. Create edge function: `supabase/functions/generate-artifact-fix/index.ts` (2 hours)
2. Add AI fix handler to ArtifactContainer.tsx (1 hour)
3. Update error UI with "Ask AI to Fix" button (1 hour)
4. Add loading states and error handling (1 hour)
5. Test with common error scenarios (2 hours)

**Effort:** 6-8 hours
**Status:** ❌ Not Implemented
**Priority:** HIGH - This is a key differentiator for an AI coding assistant

---

## 🔵 P3 - Low Priority / Future Enhancements

### 15. Auto-Fix Artifact Import Transformation
**Feature:** Automatically transform invalid `@/` imports to valid alternatives
**Value:** LOW - Validation prevents invalid code, auto-fix is convenience
**Implementation:**
```typescript
function autoFixImports(code: string): string {
  return code
    .replace(/import \{ Button \} from "@\/components\/ui\/button"/g,
             '// Button: Use <button className="px-4 py-2 bg-blue-600..."/>')
    .replace(/import \{ Card \} from "@\/components\/ui\/card"/g,
             '// Card: Use <div className="bg-white rounded-lg shadow p-6..."/>')
  // etc.
}
```
**Effort:** 3-4 hours
**Status:** ❌ Deferred

---

### 16. Intent Detector Enhancement
**Feature:** Proactively suggest Radix UI when user requests UI components
**Value:** LOW - AI already handles this via system prompt
**Implementation:**
```typescript
export function detectUIComponentRequest(prompt: string): {
  wantsUI: boolean;
  suggestedLibrary: 'radix-ui' | 'tailwind';
  componentType: string[];
} {
  // Analyze user intent and suggest appropriate library
}
```
**Effort:** 2-3 hours
**Status:** ❌ Deferred

---

### 17. WebPreview Navigation Bar
**Location:** `src/components/ai-elements/web-preview.tsx` (installed, not used)
**Feature:** Browser-like navigation controls (back/forward/refresh)
**Value:** MEDIUM - Useful for multi-page HTML artifacts
**Implementation:**
```tsx
<WebPreview defaultUrl="preview">
  <WebPreviewNavigation>
    <WebPreviewNavigationButton icon={RefreshCw} tooltip="Reload" />
  </WebPreviewNavigation>
  <WebPreviewBody>
    <iframe srcDoc={htmlContent} />
  </WebPreviewBody>
</WebPreview>
```
**Effort:** 1-2 hours
**Status:** ❌ Deferred
**Reason:** Most artifacts don't need navigation

---

### 18. WebPreview URL Bar
**Location:** `src/components/ai-elements/web-preview.tsx` (installed, not used)
**Feature:** URL input showing current preview URL
**Value:** LOW - Artifacts don't navigate to external URLs
**Effort:** 1 hour
**Status:** ❌ Deferred
**Reason:** Not needed for current artifact types

---

### 19. ArtifactDescription Component
**Location:** `src/components/ai-elements/artifact.tsx` (installed, not used)
**Feature:** Metadata/description text below artifact title
**Value:** LOW - Not in current design
**Effort:** 30 minutes
**Status:** ❌ Deferred

---

## 🗂️ Code Quality Improvements (Separate from Features)

### 20. State Management Refactor (useReducer)
**Location:** `src/components/Artifact.tsx` / `ArtifactContainer.tsx`
**Issue:** 9 independent `useState` calls create complex state management
**Recommendation:** Consolidate with useReducer pattern
**Implementation:**
```typescript
interface ArtifactState {
  ui: { isMaximized: boolean; isLoading: boolean; isEditingCode: boolean; themeRefreshKey: number };
  error: { message: string | null; category: ErrorCategory };
  validation: ValidationResult | null;
  content: { edited: string; cdns: string };
}

const [state, dispatch] = useReducer(artifactReducer, initialState);
```
**Effort:** 4-6 hours
**Status:** ❌ Deferred
**Reason:** Orthogonal to ai-elements integration, should be separate PR

---

### 21. Renderer Extraction Pattern
**Location:** `src/components/Artifact.tsx` / `ArtifactContainer.tsx`
**Issue:** 398-line `renderPreview()` function with 8 type branches
**Recommendation:** Extract type-specific renderers
**Implementation:**
```typescript
const renderers: Record<ArtifactType, ComponentType> = {
  code: CodeRenderer,
  html: HtmlRenderer,
  react: ReactRenderer,
  mermaid: MermaidRenderer,
  markdown: MarkdownRenderer,
  svg: SvgRenderer,
  image: ImageRenderer,
};

return renderers[artifact.type]({ artifact, ...props });
```
**Effort:** 6-8 hours
**Status:** ❌ Deferred
**Reason:** Major refactoring, separate from ai-elements integration

---

## ❌ Permanently Removed from Scope

These features were planned but have been **permanently removed** to focus on core quality:

### 22. Team Sharing Features
**Originally Planned:** Week 3-4 handoff
**Status:** ❌ Removed from scope
**Reason:** Complexity + multi-user security concerns
**Includes:**
- Team-only sharing
- Share links for authenticated users
- Database table: `team_shared_artifacts`
- Permission management

---

### 23. Public Gallery Page
**Originally Planned:** Artifact portfolio plan v2
**Status:** ❌ Removed from scope
**Reason:** Requires content moderation system
**Includes:**
- Public gallery page
- Public/private toggle
- Featured artifacts

---

### 24. Remix/Fork Functionality
**Originally Planned:** Collaboration features
**Status:** ❌ Removed from scope
**Reason:** Multi-user complexity not justified
**Includes:**
- Fork/remix existing artifacts
- Attribution tracking
- Derivative work management

---

## 📊 Summary Statistics

| Priority | Category | Total Items | Completed | Pending |
|----------|----------|-------------|-----------|---------|
| **P0** | Critical Security | 2 | 0 | 2 |
| **P1** | High Priority Features | 5 | 0 | 5 |
| **P2** | Medium Priority | 9 | 0 | 9 |
| **P3** | Low Priority | 5 | 0 | 5 |
| **Quality** | Code Improvements | 2 | 0 | 2 |
| **Removed** | Out of Scope | 3 | N/A | N/A |
| **TOTAL** | Active Items | **23** | **0** | **23** |

---

## 🎯 Recommended Next Steps

### Immediate (Before Merging to Main)
1. ✅ Fix postMessage origin validation (P0 #1) - 30 min
2. ✅ Add Sandpack dependency validation (P0 #2) - 1 hour
3. ✅ **FIX GUEST MODE** - Non-auth users can't send messages (P1 #3) - 2-3 hours
4. ✅ Integration tests for ArtifactContainer - 2 hours

**Total:** ~5.5-6.5 hours to make branch production-ready

### Short Term (Next Sprint) - Core Features
5. Integrate Version Control UI (P1 #4) - 4-6 hours
6. **Artifact Suggestion Click-to-Build** (P1 #5) - 2-3 hours
7. Integrate Export Menu (P1 #6) - 2-3 hours
8. Integrate Multi-Artifact Context (P1 #7) - 3-4 hours

**Total:** ~11-16 hours for P1 core features

### Short Term (Next Sprint) - UX Improvements
9. **Auto-close sidebar when canvas opens** (P2 #8) - 2-3 hours
10. **Expand chat/canvas to fill space** (P2 #12) - 3-4 hours
11. Settings icon relocation (P2 #11) - 1-2 hours

**Total:** ~6-9 hours for P2 UX improvements

### Medium Term (Future Sprints) - Content & Features
12. **Landing page real-world examples** (P2 #9) - 6-8 hours
13. **Chat page artifact suggestions with real examples** (P2 #10) - 4-6 hours
14. Implement AI Error Fixing (P2 #14) - 6-8 hours
15. WebPreview console viewer - 2-3 hours
16. User-facing warnings - 2 hours
17. Comprehensive test coverage - 8-12 hours

**Total:** ~28-39 hours for P2 medium-term features

### Long Term (If Desired)
- P3 enhancements as needed
- Code quality improvements (separate PRs)

---

## 📝 Notes

- **Branch Status:** `feature/ai-elements-integration` is complete and working but not merged to main
- **Build Status:** ✅ Production build succeeds (369 precache entries, 13.8 MB)
- **Test Status:** ✅ 21/21 ArtifactContainer tests passing
- **Documentation:** Multiple planning docs are outdated and don't reflect current implementation

`★ Insight ─────────────────────────────────────`
The ai-elements integration itself is **complete and working**. The pending items are mostly **separate features** that were built earlier but never integrated into the UI, plus some security fixes and optional enhancements.
`─────────────────────────────────────────────────`

---

---

## 🎨 Content Assets Needed

For P2 items #9 and #10 (Landing page + Chat page examples), you'll need:

### Asset Creation Checklist
- [ ] Record 5-7 artifact generations (screen recordings)
- [ ] Convert to optimized GIFs (LICEcap, 10-15s loops)
- [ ] Take high-res screenshots (2x retina)
- [ ] Create hero demo video (30-60s)
- [ ] Optimize all images (WebP + PNG fallback)
- [ ] Test lazy loading and performance

### Recommended Artifacts to Showcase
1. React dashboard with charts (Recharts)
2. Todo list with drag-and-drop
3. Mermaid architecture diagram
4. HTML landing page
5. Data visualization (D3.js)
6. Interactive form with validation
7. Image generation example

**Tools Needed:**
- Screen recorder: OBS Studio or QuickTime
- GIF creator: LICEcap or ScreenToGif
- Image optimizer: ImageOptim or TinyPNG
- Video editor: iMovie or DaVinci Resolve (optional)

---

**Last Updated:** 2025-11-06
**Document Status:** Active tracking document
**Next Review:** Before merging feature branch to main
