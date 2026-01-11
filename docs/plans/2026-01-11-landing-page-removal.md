# Landing Page Removal Plan

**Date**: 2026-01-11
**Goal**: Remove landing page from active codebase while preserving files for future use

## Overview

The landing page is already disabled (commented out imports/routes). We need to:
1. Archive the landing page files to `_archived` directories
2. Remove commented-out code from App.tsx
3. Verify the application still loads correctly

## Implementation Tasks

### Task 1: Create _archived Directory Structure

**Steps:**
1. Create `src/pages/_archived/` directory
2. Create `src/components/_archived/` directory

**Verification:**
```bash
ls -la src/pages/_archived/
ls -la src/components/_archived/
```

### Task 2: Move Landing Page Files to Archive

**Steps:**
1. Move `src/pages/Landing.tsx` to `src/pages/_archived/Landing.tsx`
2. Move `src/components/landing/` directory to `src/components/_archived/landing/`

**Verification:**
```bash
ls -la src/pages/_archived/
ls -la src/components/_archived/landing/
# Verify original locations are gone
ls src/pages/Landing.tsx 2>&1  # Should fail
ls -d src/components/landing/ 2>&1  # Should fail
```

### Task 3: Clean Up App.tsx

**Steps:**
1. Remove line 21: `// const Landing = lazy(() => import("./pages/Landing")); // Commented out - will repurpose later`
2. Remove lines 95-96: `{/* Landing route removed - page will be repurposed later */}` and `{/* <Route path="/landing" element={<AnimatedRoute><Landing /></AnimatedRoute>} /> */}`
3. Update RootRoute comment (lines 56-69) to remove "Landing content preserved in git history" reference

**Verification:**
```bash
# Check that commented Landing import is gone
grep -n "Landing" src/App.tsx
# Should only show references in comments about "landing page removed"
```

### Task 4: Verify Application Loads

**Steps:**
1. Start dev server: `npm run dev`
2. Open browser to http://localhost:8080
3. Verify Home page loads without errors
4. Check console for any import errors related to Landing

**Verification:**
- Root route (/) loads successfully
- No console errors
- No missing import errors

## Success Criteria

- [ ] Landing page files moved to `_archived` directories
- [ ] App.tsx has no commented-out Landing code
- [ ] Application starts and loads without errors
- [ ] Root route (/) renders Home component correctly
