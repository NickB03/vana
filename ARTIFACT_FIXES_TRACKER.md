# Artifact System Fix Tracker

**Generated**: 2026-01-06
**Context**: Investigation of PR 501 and streaming artifact failures
**Total Fixes**: 16 (3 P0, 8 P1, 5 P2)

---

## 📊 Progress Overview

- [ ] **P0 Critical** (3/3) - Blocks streaming artifacts, causes blank screens
- [ ] **P1 High** (8/8) - Prevents edge cases, race conditions, and infinite loops
- [ ] **P2 Medium** (5/5) - Quality improvements, prevents future issues

---

## 🔴 P0 - Critical (Fix Immediately)

### ✅ P0.1: Fix Streaming Artifact ID Generation
**File**: `src/components/ChatInterface.tsx:550`
**Issue**: Streaming artifacts use `streaming-${Date.now()}` but saved artifacts use crypto hash → ID mismatch
**Impact**: Bundling updates never reach canvas → blank screens for artifacts requiring server bundling

**Current Code**:
```typescript
const artifactData: ArtifactData = {
  id: `streaming-${Date.now()}`, // ❌ Changes on save
  type: mapArtifactType(streamingArtifact.type),
  title: streamingArtifact.title || 'Generated Artifact',
  content: cleanCode,
};
```

**Fix**:
```typescript
import { generateStableId } from '@/utils/artifactParser';

// Generate deterministic ID matching what parser will create
const artifactId = await generateStableId(
  cleanCode,
  streamingArtifact.type,
  0 // Index 0 for streaming
);

const artifactData: ArtifactData = {
  id: artifactId, // ✅ Stable across streaming → saved
  type: mapArtifactType(streamingArtifact.type),
  title: streamingArtifact.title || 'Generated Artifact',
  content: cleanCode,
};
```

**Verification**:
1. Generate artifact with npm imports (recharts, lucide-react)
2. Check console: streaming ID should match saved artifact ID
3. Verify bundling status updates appear in canvas
4. No blank screens after bundling completes

---

### ✅ P0.2: Add Reconciliation Check After Message Saves
**File**: `src/components/ChatInterface.tsx:511`
**Issue**: If ID generation timing differs, currentArtifact might still reference streaming ID
**Impact**: Fallback safety net for ID synchronization

**Fix**: Add useEffect to detect and reconcile mismatched artifacts
```typescript
// Add after line 511 (existing artifact sync effect)
useEffect(() => {
  if (!currentArtifact) return;

  // Find artifact with matching content but different ID
  const matchingArtifact = displayedArtifacts.find(a =>
    a.content === currentArtifact.content &&
    a.type === currentArtifact.type &&
    a.title === currentArtifact.title &&
    a.id !== currentArtifact.id
  );

  if (matchingArtifact) {
    console.log('[ChatInterface] Reconciling artifact IDs:', {
      from: currentArtifact.id,
      to: matchingArtifact.id
    });
    setCurrentArtifact(matchingArtifact);

    // Migrate override state to new ID
    setArtifactOverrides(prev => {
      const oldOverride = prev[currentArtifact.id];
      if (!oldOverride) return prev;

      const { [currentArtifact.id]: _, ...rest } = prev;
      return {
        ...rest,
        [matchingArtifact.id]: oldOverride
      };
    });
  }
}, [displayedArtifacts, currentArtifact]);
```

**Verification**:
1. Generate streaming artifact
2. Wait for message to save to DB
3. Check console for reconciliation log
4. Verify bundling updates still work after reconciliation

---

### ✅ P0.3: Fix CI Integration Tests - Add Supabase Start
**File**: `.github/workflows/integration-tests.yml`
**Issue**: Tests fail with "Connection refused" because Supabase never starts in CI
**Impact**: False positive test failures hide real issues

**Fix**: Add Supabase start step before tests
```yaml
# After "Setup Deno" step, add:
- name: Start Supabase
  run: |
    npx supabase start
    echo "Supabase started on http://127.0.0.1:54321"

- name: Wait for Supabase to be ready
  run: |
    timeout 60 bash -c 'until curl -f http://127.0.0.1:54321/functions/v1/health 2>/dev/null; do sleep 2; done' || true

- name: Run Integration Tests
  run: deno task test:integration
  # ... existing env vars
```

**Verification**:
1. Push to GitHub
2. Check Actions workflow run
3. Verify all integration tests pass or fail with real errors
4. No more "Connection refused" errors

---

## 🟡 P1 - High Priority (Fix Soon)

### ✅ P1.1: Reset lastOpenedArtifactRef on Stream Complete
**File**: `src/components/ChatInterface.tsx:566`
**Issue**: Ref never resets → duplicate artifacts won't auto-open
**Impact**: Poor UX when regenerating similar artifacts

**Fix**: Add cleanup effect
```typescript
// Add after the streaming artifact useEffect (line 566)
useEffect(() => {
  // Reset when streaming completes
  if (!streamProgress.streamingArtifact && lastOpenedArtifactRef.current) {
    console.log('[ChatInterface] Resetting lastOpenedArtifactRef (streaming complete)');
    lastOpenedArtifactRef.current = null;
  }
}, [streamProgress.streamingArtifact]);
```

**Verification**:
1. Generate artifact (e.g., "create hello world react app")
2. Canvas should auto-open
3. Generate same artifact again in same session
4. Canvas should auto-open again (not skip)

---

### ✅ P1.2: Add Artifact ID to iframe Message Handler
**File**: `src/components/ArtifactRenderer.tsx:1078`
**Issue**: Message handler doesn't filter by artifact ID → errors leak to wrong artifacts
**Impact**: First artifact's errors can affect second artifact's display

**Fix**: Filter messages by artifact ID
```typescript
// Line 1035-1078: handleIframeMessage
useEffect(() => {
  const handleIframeMessage = (e: MessageEvent) => {
    const validOrigins = ['null', window.location.origin];
    if (!validOrigins.includes(e.origin)) return;

    // ✅ ADD: Filter by artifact ID
    if (e.data?.artifactId && e.data.artifactId !== artifact.id) {
      return; // Ignore messages for other artifacts
    }

    if (e.data?.type === 'artifact-error') {
      // ... existing error handler
    }

    if (e.data?.type === 'artifact-ready') {
      // ... existing ready handler
    }
  };

  window.addEventListener('message', handleIframeMessage);
  return () => window.removeEventListener('message', handleIframeMessage);
}, [artifact.id, onLoadingChange, handleArtifactError]); // ✅ ADD artifact.id to deps
```

**Also update iframe postMessage calls** to include artifact ID:
```typescript
// In BundledArtifactFrame and WebPreview, update postMessage:
window.parent.postMessage({
  type: 'artifact-ready',
  artifactId: '${artifact.id}' // ✅ ADD this
}, '*');

window.parent.postMessage({
  type: 'artifact-error',
  artifactId: '${artifact.id}', // ✅ ADD this
  message: errorMessage
}, '*');
```

**Verification**:
1. Open two artifacts in canvas quickly
2. First artifact errors should not affect second
3. Check console for message filtering logs

---

### ✅ P1.3: Prevent Blob URL Early Revocation
**File**: `src/components/ArtifactRenderer.tsx:587`
**Issue**: Effect deps include callbacks → blob URL revoked when callbacks change
**Impact**: iframe goes blank mid-load

**Fix**: Remove unstable deps
```typescript
// Line 580-587: Cleanup effect
return () => {
  isMounted = false;
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
};
}, [bundleUrl]); // ✅ ONLY bundleUrl, remove callback deps
```

**Verification**:
1. Generate artifact with server bundling
2. Parent component re-renders (e.g., window resize)
3. Artifact should stay loaded, not blank out

---

### ✅ P1.4: Add Null Checks in artifactParser.ts
**File**: `src/utils/artifactParser.ts:165-192`
**Issue**: Async ID generation doesn't check if component unmounted
**Impact**: State updates after unmount → memory leaks, undefined IDs

**Fix**: Add mount tracking
```typescript
// Line 165-192
export async function parseArtifacts(content: string): Promise<ArtifactData[]> {
  const artifacts: ArtifactData[] = [];
  const artifactPromises: Promise<void>[] = [];
  let isMounted = true; // ✅ ADD mount tracking

  // ... existing regex matching ...

  artifactPromises.push(
    generateStableId(processedContent, mappedType, currentIndex).then((id) => {
      if (!isMounted) return; // ✅ ADD check

      // ✅ ADD validation
      if (!id || !processedContent || !title) {
        console.warn('[parseArtifacts] Skipping invalid artifact', { id, title, hasContent: !!processedContent });
        return;
      }

      artifacts.push({
        id,
        type: mappedType,
        title: title,
        content: processedContent,
      });
    })
  );

  await Promise.all(artifactPromises);

  // ✅ ADD: Return cleanup function
  return {
    artifacts,
    cleanup: () => { isMounted = false; }
  };
}
```

**Verification**:
1. Navigate away during artifact parsing
2. No console warnings about state updates after unmount
3. No undefined artifact IDs in state

---

### ✅ P1.5: Deduplicate Bundling Requests
**File**: `src/components/MessageWithArtifacts.tsx:131-348`
**Issue**: Multiple renders trigger duplicate bundling attempts
**Impact**: Infinite bundling loops, wasted API calls

**Fix**: Add request deduplication
```typescript
// Add ref to track in-flight requests
const bundlingRequestsRef = useRef<Set<string>>(new Set());

// Line 145: Before handleBundling
const handleBundling = async (artifact: ArtifactData) => {
  // ✅ ADD: Deduplicate
  if (bundlingRequestsRef.current.has(artifact.id)) {
    console.log('[MessageWithArtifacts] Skipping duplicate bundle request', artifact.id);
    return;
  }

  bundlingRequestsRef.current.add(artifact.id);
  setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'loading' }));

  try {
    // ... existing bundling logic ...
  } finally {
    // ✅ CLEANUP: Remove from tracking
    bundlingRequestsRef.current.delete(artifact.id);
  }
};
```

**Verification**:
1. Generate artifact with npm imports
2. Check network tab: only ONE bundle-artifact request per artifact
3. No duplicate bundling log messages

---

### ✅ P1.6: Add Error UI for BundledArtifactFrame Sucrase Failures
**File**: `src/components/ArtifactRenderer.tsx:493-514`
**Issue**: Sucrase failure returns early → blank screen
**Impact**: Most critical blank screen cause

**Fix**: Return error UI instead of null
```typescript
// Line 493-514: Replace early return with error UI
if (!sucraseSucceeded) {
  console.error('[BundledArtifactFrame] Sucrase transpilation failed');

  toast.error('Bundled artifact transpilation failed', {
    description: 'The artifact code contains syntax that could not be transpiled.',
    duration: Infinity,
    action: onAIFix ? {
      label: 'Ask AI to Fix',
      onClick: () => onAIFix()
    } : undefined,
  });

  onPreviewErrorChange?.('Bundled artifact transpilation failed');
  onLoadingChange?.(false);

  // ✅ RETURN ERROR UI instead of nothing
  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-background">
      <ArtifactErrorRecovery
        error={{
          type: 'transpilation',
          message: 'Bundled artifact transpilation failed',
          severity: 'critical',
          retryable: true,
          canAutoFix: true,
          retryStrategy: 'with-fix'
        }}
        artifactType="react"
        onRetry={onAIFix}
      />
    </div>
  );
}
```

**Verification**:
1. Create artifact with invalid JSX syntax
2. Should see error recovery UI, not blank screen
3. "Ask AI to Fix" button should appear

---

### ✅ P1.7: Add artifact.id to All Effect Dependencies
**File**: Multiple files - audit needed
**Issue**: Effects that use artifact state don't include artifact.id in deps
**Impact**: Stale closures, effects running for wrong artifact

**Fix**: Audit and update all effects
```typescript
// Find all effects that use artifact but don't depend on artifact.id:
// grep -r "useEffect.*artifact\." src/components | grep -v "artifact.id"

// Common pattern to fix:
useEffect(() => {
  // Uses artifact.content, artifact.type, etc
  doSomething(artifact);
}, [/* deps */]); // ❌ Missing artifact.id

// Fix:
}, [artifact.id, /* other deps */]); // ✅ Include artifact.id
```

**Files to audit**:
- `ArtifactRenderer.tsx` - all useEffects
- `ArtifactContainer.tsx` - validation effect
- `MessageWithArtifacts.tsx` - bundling effect

**Verification**:
1. Run ESLint with exhaustive-deps rule
2. No warnings about missing dependencies
3. Effects re-run when switching artifacts

---

### ✅ P1.8: Reset Recovery Counter on bundleUrl Change
**File**: `src/components/ArtifactRenderer.tsx:1130-1134`
**Issue**: Recovery counter only resets on artifact.id change
**Impact**: If AI fix generates artifact with same ID, recovery stuck

**Fix**: Reset on more conditions
```typescript
// Line 1130-1134
useEffect(() => {
  setRecoveryAttempts(0);
  setCurrentError(null);
  setIsRecovering(false);
}, [artifact.id, artifact.bundleUrl]); // ✅ ADD bundleUrl to deps
```

**Also consider resetting on content change**:
```typescript
}, [artifact.id, artifact.bundleUrl, artifact.content]);
```

**Verification**:
1. Trigger artifact error
2. AI generates fix with same ID but different content
3. Recovery counter should reset to 0
4. New fix attempt should be allowed

---

## 🟢 P2 - Medium Priority (Fix When Convenient)

### ✅ P2.1: Revert DesktopHeader Layout Change
**File**: `src/components/DesktopHeader.tsx:31-67`
**Issue**: Changed from absolute to relative positioning → adds 56px space
**Impact**: Visual regression, unrelated to artifact fixes

**Fix**: Revert to absolute positioning
```typescript
// REVERT TO:
<header
  className={cn(
    "hidden md:flex items-center justify-end px-3 py-2",
    "bg-transparent",
    "absolute top-0 right-0 z-20",
    className
  )}
>
  {/* ... content ... */}
</header>
```

**Verification**:
1. Check desktop layout
2. Header should overlay content, not push it down
3. No unexpected white space at top

---

### ✅ P2.2: Fix Heartbeat Event Field Access
**File**: `src/hooks/useChatMessages.tsx:620`
**Issue**: Handler reads `parsed.content` but server sends `parsed.message`
**Impact**: Status might be undefined

**Fix**: Change field access
```typescript
// Line 620
if (parsed.type === 'reasoning_heartbeat') {
  const status = parsed.message as string; // ✅ Change from parsed.content
  console.log(`[StreamProgress] Reasoning heartbeat: "${status}"`);

  lastReasoningStatus = status;
  const progress = updateProgress();
  onDelta('', progress);

  continue;
}
```

**Verification**:
1. Generate artifact that triggers reasoning
2. Check console: heartbeat messages should have valid status
3. No "undefined" in reasoning ticker

---

### ✅ P2.3: Add Pre-Render Validation Checks
**File**: `src/components/ArtifactContainer.tsx` and `ArtifactRenderer.tsx`
**Issue**: Validation runs but doesn't prevent rendering
**Impact**: Invalid artifacts get rendered → runtime errors

**Fix**: Check validation before rendering
```typescript
// In ArtifactRenderer, before rendering logic:
if (validation && !validation.isValid) {
  const criticalErrors = validation.errors.filter(e => e.severity === 'critical');

  if (criticalErrors.length > 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-background">
        <ArtifactErrorRecovery
          error={{
            type: 'validation',
            message: criticalErrors[0].message,
            severity: 'critical',
            retryable: true,
            canAutoFix: true,
            retryStrategy: 'with-fix'
          }}
          artifactType={artifact.type}
          onRetry={onAIFix}
        />
      </div>
    );
  }
}
```

**Verification**:
1. Create artifact with @/components/ui imports
2. Should show validation error, not attempt to render
3. "Ask AI to Fix" should be available

---

### ✅ P2.4: Add Defensive Checks for reactPreviewContent
**File**: `src/components/ArtifactRenderer.tsx:1764`
**Issue**: reactPreviewContent might be undefined in edge cases
**Impact**: Blank iframe

**Fix**: Add validation before render
```typescript
// Line 1746-1774: Before rendering WebPreview
if (!reactPreviewContent || reactPreviewContent.trim().length === 0) {
  console.error('[ArtifactRenderer] reactPreviewContent is empty');
  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-background">
      <ArtifactErrorRecovery
        error={{
          type: 'transpilation',
          message: 'Failed to generate preview content',
          severity: 'critical',
          retryable: true,
          canAutoFix: false,
          retryStrategy: 'reload'
        }}
        artifactType="react"
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}

return (
  <WebPreview key={`${artifact.id}-preview`}>
    <WebPreviewBody srcDoc={reactPreviewContent} ... />
  </WebPreview>
);
```

**Verification**:
1. Test with malformed React code
2. Should see error UI if transpilation produces empty content
3. No blank iframes

---

### ✅ P2.5: Add Artifact ID Tagging to Watchdog
**File**: `src/components/ArtifactRenderer.tsx:878-919`
**Issue**: Watchdog doesn't track which artifact it's watching
**Impact**: Timeout for old artifact can fire after new artifact loads

**Fix**: Tag timeouts with artifact ID
```typescript
// Line 878-919
const watchdogTimerRef = useRef<{ timer: NodeJS.Timeout; artifactId: string } | null>(null);

useEffect(() => {
  if (isLoading) {
    // Clear any existing watchdog for different artifact
    if (watchdogTimerRef.current) {
      if (watchdogTimerRef.current.artifactId !== artifact.id) {
        clearTimeout(watchdogTimerRef.current.timer);
        watchdogTimerRef.current = null;
      } else {
        // Already watching this artifact
        return;
      }
    }

    const watchdogStart = Date.now();
    const timer = setTimeout(() => {
      // Only fire if still watching THIS artifact
      if (watchdogTimerRef.current?.artifactId !== artifact.id) {
        return;
      }

      const elapsed = Date.now() - watchdogStart;
      console.warn(`[ArtifactRenderer] Watchdog timeout for ${artifact.id} after ${elapsed}ms`);

      onPreviewErrorChange('Artifact failed to load within 10 seconds...');
      onLoadingChange(false);

      window.postMessage({
        type: 'artifact-rendered-complete',
        success: false,
        error: 'Loading timeout',
        artifactId: artifact.id // ✅ Include ID
      }, '*');

      toast.error('Artifact loading timeout', ...);
    }, 10000);

    watchdogTimerRef.current = { timer, artifactId: artifact.id };

    return () => {
      if (watchdogTimerRef.current?.artifactId === artifact.id) {
        clearTimeout(watchdogTimerRef.current.timer);
        watchdogTimerRef.current = null;
      }
    };
  }
}, [isLoading, artifact.id, ...deps]);
```

**Verification**:
1. Generate artifact that takes >10s to load
2. Generate second artifact before first finishes
3. Timeout should only affect the slow artifact, not the new one

---

## 📋 Testing Checklist

After completing all fixes, verify end-to-end:

### Streaming Artifact Flow
- [ ] Generate React artifact with npm imports (recharts, lucide-react)
- [ ] Canvas opens immediately when `artifact_complete` event received
- [ ] Artifact ID stays consistent from streaming → saved
- [ ] Bundling status updates appear in canvas
- [ ] Final artifact renders with bundled code

### Error Recovery
- [ ] Create artifact with syntax error
- [ ] Error UI appears (not blank screen)
- [ ] "Ask AI to Fix" button available and works
- [ ] Fixed artifact renders successfully

### Multiple Artifacts
- [ ] Open two artifacts quickly
- [ ] Errors in first don't affect second
- [ ] Each maintains independent bundling status
- [ ] Canvas switching works correctly

### CI Integration
- [ ] Push to GitHub
- [ ] Integration tests pass (no "Connection refused")
- [ ] Real test failures are visible

---

## 🔍 Verification Commands

```bash
# Check for missing effect deps
npm run lint -- --rule 'react-hooks/exhaustive-deps: error'

# Find all useEffect that use artifact
grep -r "useEffect.*artifact\." src/components | grep -v "artifact.id"

# Find all postMessage calls that need artifact ID
grep -r "postMessage.*artifact-" src/components

# Run integration tests locally
supabase start
cd supabase/functions && deno task test:integration

# Run E2E tests
npm run test:e2e:headed
```

---

## 📚 Related Documentation

- [Artifact System Architecture](./.claude/ARTIFACT_SYSTEM.md)
- [Troubleshooting Guide](./.claude/TROUBLESHOOTING.md)
- [Database Schema](./.claude/DATABASE_SCHEMA.md)
- [Agent Investigation Output](/tmp/claude/-Users-nick-Projects-llm-chat-site/tasks/a074dda.output)

---

## ✅ Completion Criteria

**P0 Complete When**:
- [ ] Streaming artifacts have stable IDs matching saved artifacts
- [ ] No blank screens after bundling
- [ ] CI integration tests pass

**P1 Complete When**:
- [ ] No artifact ID leakage between artifacts
- [ ] No infinite bundling loops
- [ ] Error recovery works for all failure types

**P2 Complete When**:
- [ ] All validation errors prevent rendering
- [ ] No visual regressions
- [ ] Watchdog properly scoped to artifacts

**All Fixes Complete When**:
- [ ] End-to-end testing checklist passes
- [ ] No console errors during artifact generation
- [ ] Performance metrics maintained (no regression)
