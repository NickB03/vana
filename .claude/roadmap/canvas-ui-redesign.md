> **STATUS**: ✅ Implemented
> **Last Updated**: 2025-12-28
> **Implementation Date**: 2025-12-28
> **PR**: #423 (merged)
> **Commit**: d9be0ad

# Canvas UI Redesign Plan

**Goal**: Update the artifact/canvas UI to match Claude's canvas interface design

**Reference**: Screenshot showing Claude's artifact panel with:
- Sharp corners (no rounded borders)
- No URL bar (just filename + controls)
- Icon-based Preview/Code toggle in header
- Compact, minimal header design
- Clean toolbar with Copy dropdown, refresh, close

---

## Current vs Target Comparison

| Element | Current Implementation | Claude's Design |
|---------|----------------------|-----------------|
| Container corners | `rounded-lg` (8px radius) | Sharp corners (0px) |
| Header padding | `px-4 py-3` | More compact `px-3 py-2` |
| Header background | `bg-muted/50` (translucent) | `bg-background` (solid) |
| Shadow | `shadow-sm` | `shadow-md` (more defined) |
| URL bar | `WebPreviewUrl` input field | **Removed** - just filename |
| Preview/Code toggle | `TabsList` with text labels below header | Icon buttons in header (eye/code icons) |
| Toolbar actions | Copy → Export → PopOut → Maximize → Close | View toggles → Copy dropdown → Refresh → Close |

---

## Implementation Phases

### Phase 1: Container Styling (Low Risk)

**Files to modify**:
- `src/components/ai-elements/artifact.tsx`

**Changes**:
1. `Artifact` component: `rounded-lg` → `rounded-none`
2. `Artifact` component: `shadow-sm` → `shadow-md`
3. `ArtifactHeader`: `px-4 py-3` → `px-3 py-2`
4. `ArtifactHeader`: `bg-muted/50` → `bg-background`
5. Add stronger border: `border-border/80`

**Before**:
```tsx
// Artifact
className={cn(
  "flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm",
  className
)}

// ArtifactHeader
className={cn(
  "flex items-center justify-between border-b bg-muted/50 px-4 py-3",
  className
)}
```

**After**:
```tsx
// Artifact
className={cn(
  "flex flex-col overflow-hidden border bg-background shadow-md",
  className
)}

// ArtifactHeader
className={cn(
  "flex items-center justify-between border-b bg-background px-3 py-2",
  className
)}
```

---

### Phase 2: Remove URL Bar (Medium Risk)

**Files to modify**:
- `src/components/ArtifactRenderer.tsx`

**Changes**:
1. Remove `WebPreviewUrl` from all `WebPreviewNavigation` sections
2. Keep refresh and fullscreen buttons in navigation bar

**Affected sections** (lines ~920-934 and ~1396-1411):
```tsx
// Current
<WebPreviewNavigation>
  <WebPreviewNavigationButton tooltip="Refresh preview" onClick={onRefresh}>
    <RefreshCw className="h-4 w-4" />
  </WebPreviewNavigationButton>
  <WebPreviewUrl />  // REMOVE THIS
  <WebPreviewNavigationButton tooltip="Full screen" onClick={onFullScreen}>
    <Maximize2 className="h-4 w-4" />
  </WebPreviewNavigationButton>
</WebPreviewNavigation>

// After
<WebPreviewNavigation>
  <WebPreviewNavigationButton tooltip="Refresh preview" onClick={onRefresh}>
    <RefreshCw className="h-4 w-4" />
  </WebPreviewNavigationButton>
  <WebPreviewNavigationButton tooltip="Full screen" onClick={onFullScreen}>
    <Maximize2 className="h-4 w-4" />
  </WebPreviewNavigationButton>
</WebPreviewNavigation>
```

**Alternative**: Remove entire `WebPreviewNavigation` bar and move controls to header toolbar.

---

### Phase 3: Header-Based View Toggle (Higher Risk)

**Goal**: Replace `TabsList` (below header) with icon buttons in the header (like Claude's eye/code icons)

**Files to modify**:
- `src/components/ArtifactContainer.tsx`
- `src/components/ArtifactToolbar.tsx`

**Strategy**:
1. Move the view toggle logic from Tabs to controlled state in `ArtifactContainer`
2. Add toggle icons (Eye for Preview, Code for Edit) to `ArtifactToolbar`
3. Remove `TabsList` from the UI
4. Keep `TabsContent` for conditionally rendering Preview/Code views

**New icons needed**:
- `Eye` (lucide-react) - Preview mode
- `Code` (lucide-react) - Code/Edit mode

**ArtifactToolbar changes**:
```tsx
// Add view toggle props
interface ArtifactToolbarProps {
  // ... existing props
  activeView: 'preview' | 'code';
  onViewChange: (view: 'preview' | 'code') => void;
}

// Add toggle buttons at start of toolbar
<>
  <ArtifactAction
    icon={Eye}
    label="Preview"
    tooltip="Preview"
    onClick={() => onViewChange('preview')}
    className={activeView === 'preview' ? 'bg-muted' : ''}
  />
  <ArtifactAction
    icon={Code}
    label="Code"
    tooltip="View code"
    onClick={() => onViewChange('code')}
    className={activeView === 'code' ? 'bg-muted' : ''}
  />
  <div className="w-px h-4 bg-border mx-1" /> {/* Separator */}
  {/* ... existing actions */}
</>
```

**ArtifactContainer changes**:
```tsx
// Replace Tabs with controlled view state
const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');

// In header
<ArtifactToolbar
  {...existingProps}
  activeView={activeView}
  onViewChange={(view) => {
    setActiveView(view);
    setIsEditingCode(view === 'code');
  }}
/>

// Replace TabsContent with conditional rendering
<ArtifactContent className="p-0">
  {activeView === 'preview' && (
    <ArtifactErrorBoundary>
      {renderPreview()}
    </ArtifactErrorBoundary>
  )}
  {activeView === 'code' && (
    <ArtifactErrorBoundary>
      {renderCode()}
    </ArtifactErrorBoundary>
  )}
</ArtifactContent>
```

---

### Phase 4: Toolbar Simplification (Optional)

**Current toolbar order**: Copy → Export → PopOut → Maximize → Close

**Claude's toolbar order**: View toggles → Copy (with dropdown) → Refresh → Close

**Suggested simplification**:
1. Keep: View toggles, Copy, Close
2. Move to dropdown: Export, Pop Out, Maximize
3. Add: Refresh button

---

## Testing Checklist

- [x] Artifact container renders with sharp corners
- [x] Header is more compact
- [x] No URL input bar visible
- [x] View toggle icons work (Preview/Code switching)
- [x] All existing functionality preserved (copy, export, etc.)
- [x] Dark mode styling consistent
- [x] Server-bundled artifacts render correctly
- [x] Client-side Babel artifacts render correctly
- [x] Error states display properly

---

## Risk Assessment

| Phase | Risk Level | Reason |
|-------|------------|--------|
| Phase 1 | Low | CSS-only changes, no logic changes |
| Phase 2 | Low-Medium | Removing UI element, may affect layout |
| Phase 3 | Medium | Refactoring state management and component structure |
| Phase 4 | Low | Optional cleanup |

---

## Recommended Approach

1. **Start with Phase 1** - Quick visual wins with minimal risk
2. **Phase 2 next** - Simple removal, improves match to Claude's design
3. **Phase 3 if desired** - Larger refactor, can be done incrementally
4. **Skip Phase 4** unless specifically requested

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/ai-elements/artifact.tsx` | Container styling (Phase 1) |
| `src/components/ArtifactRenderer.tsx` | Remove URL bar (Phase 2) |
| `src/components/ArtifactContainer.tsx` | View toggle refactor (Phase 3) |
| `src/components/ArtifactToolbar.tsx` | Add view toggle icons (Phase 3) |
