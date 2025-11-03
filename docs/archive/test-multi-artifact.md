# Multi-Artifact Context Test Plan

## Manual Testing Steps

### 1. Basic Context Availability
- [x] Build succeeds without TypeScript errors
- [x] Dev server starts successfully
- [ ] Navigate to / (requires authentication)
- [ ] Open DevTools Console - verify no errors

### 2. Artifact Management
- [ ] Create a new chat session
- [ ] Request an artifact (e.g., "Create a simple React button component")
- [ ] Verify artifact appears in chat
- [ ] Click "Open" on artifact card
- [ ] Verify artifact canvas opens

### 3. Multi-Artifact Features
- [ ] Open first artifact
- [ ] Request second artifact (e.g., "Create a calculator component")
- [ ] Open second artifact
- [ ] Verify both artifacts are in context (check sessionStorage)
- [ ] Switch between artifacts (if tabs implemented)
- [ ] Close one artifact
- [ ] Verify other artifact remains active

### 4. SessionStorage Persistence
- [ ] Open an artifact
- [ ] Refresh page
- [ ] Verify artifact is restored from sessionStorage
- [ ] Check sessionStorage key: "multi-artifact-state"

### 5. LRU Eviction (if 5+ artifacts)
- [ ] Open 5 artifacts
- [ ] Open a 6th artifact
- [ ] Verify oldest artifact is evicted
- [ ] Verify active artifact is not evicted if possible

### 6. Backward Compatibility
- [ ] Single artifact mode still works
- [ ] Existing artifact features (edit, version control) work
- [ ] No console errors or warnings

## Browser DevTools Checks

### Console Checks
```javascript
// Check if context is available
window.sessionStorage.getItem('multi-artifact-state')

// Should show artifact state with structure:
// {
//   "artifacts": {
//     "artifact-id": {
//       "artifact": {...},
//       "messageId": "...",
//       "addedAt": timestamp
//     }
//   },
//   "activeArtifactId": "artifact-id"
// }
```

### React DevTools
- Look for MultiArtifactProvider in component tree
- Verify context value is accessible to ChatInterface

## Expected Behavior

1. **Context Provider**: Wraps entire app in App.tsx
2. **State Management**: Artifacts stored in Map with metadata
3. **Persistence**: State saved to sessionStorage on changes
4. **LRU Eviction**: Oldest artifact removed when limit (5) reached
5. **Backward Compatibility**: Local state still maintained for single artifact
