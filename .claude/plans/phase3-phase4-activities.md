# Phase 3 & Phase 4: Detailed Activity List

**Created**: 2025-12-01
**Based on**: artifact-generation-improvements.md
**Total Estimated Time**: 6 hours (3h Phase 3 + 3h Phase 4)
**Prerequisites**: Phase 1 and Phase 2 must be completed

---

## Table of Contents

- [Phase 3: UX Enhancements (P2)](#phase-3-ux-enhancements-p2)
  - [Task 3.1: Extend Storage URL Expiry](#task-31-extend-storage-url-expiry)
  - [Task 3.2: Add Bundle Progress Events](#task-32-add-bundle-progress-events)
  - [Task 3.3: Optimize ReasoningDisplay Animations](#task-33-optimize-reasoningdisplay-animations)
- [Phase 4: Future Optimizations (P3)](#phase-4-future-optimizations-p3)
  - [Task 4.1: Pre-bundle Common Dependencies](#task-41-pre-bundle-common-dependencies)
  - [Task 4.2: Implement Token-Based Rate Limiting](#task-42-implement-token-based-rate-limiting)
  - [Task 4.3: Add Artifact Response Caching](#task-43-add-artifact-response-caching)
- [Implementation Order & Dependencies](#implementation-order--dependencies)
- [Risk Assessment](#risk-assessment)
- [Rollback Strategy](#rollback-strategy)
- [Success Metrics](#success-metrics)

---

# Phase 3: UX Enhancements (P2)

**Priority**: Medium
**Estimated Time**: 3 hours
**Impact**: Improves user experience and perceived performance
**Dependencies**: Phase 1 (Critical Fixes) and Phase 2 (Reliability Improvements) completed

---

## Task 3.1: Extend Storage URL Expiry

**Priority**: 1 (do first in Phase 3)
**Estimated Time**: 1 hour
**Impact**: High - prevents broken artifacts for returning users
**Risk Level**: Low
**Rollback Difficulty**: Easy

### Problem Statement

Signed URLs for bundled artifacts expire after 1 hour, causing artifacts to break when users return to conversations or share links. This creates a poor user experience where previously working artifacts suddenly show "Failed to load" errors.

**User Impact**:
- Returning users see broken artifacts in their chat history
- Shared conversation links show broken artifacts
- Increased support burden from confused users

### Implementation Steps

#### Step 1: Update Server-Side Expiry Duration (15 min)

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts`

**Current Code** (line ~642):
```typescript
const expiresIn = 3600; // 1 hour in seconds
```

**Change to**:
```typescript
// Extend to 24 hours for better UX - URLs remain valid for returning users
// Storage costs minimal since we use lifecycle policies for cleanup
const expiresIn = 86400; // 24 hours in seconds
```

**Location in file**: Find the section where we generate signed URLs from Supabase Storage.

#### Step 2: Add Expiry Timestamp to Response (15 min)

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts`

**Add to response object** (around line ~650):
```typescript
return new Response(
  JSON.stringify({
    bundleUrl: signedUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(), // Add expiry timestamp
    bundleSize,
    dependencies: Object.keys(dependencies)
  }),
  { headers: corsHeaders }
);
```

#### Step 3: Create Client-Side Expiry Detection Utility (20 min)

**Create file**: `/Users/nick/Projects/llm-chat-site/src/utils/bundleUrlManager.ts`

```typescript
/**
 * Utilities for managing bundled artifact URLs and expiry detection
 */

export interface BundleUrlInfo {
  url: string;
  expiresAt: string;
  isExpired: boolean;
}

/**
 * Check if a signed URL has expired
 */
export function isUrlExpired(expiresAt: string): boolean {
  if (!expiresAt) return true;

  const expiryDate = new Date(expiresAt);
  const now = new Date();

  // Add 5-minute buffer to avoid edge cases
  const bufferMs = 5 * 60 * 1000;
  return now.getTime() > (expiryDate.getTime() - bufferMs);
}

/**
 * Check if URL needs refresh (within 1 hour of expiry)
 */
export function shouldRefreshUrl(expiresAt: string): boolean {
  if (!expiresAt) return true;

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;

  return (expiryDate.getTime() - now.getTime()) < oneHourMs;
}

/**
 * Format remaining time until expiry
 */
export function formatTimeUntilExpiry(expiresAt: string): string {
  if (!expiresAt) return 'Unknown';

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs < 0) return 'Expired';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
```

#### Step 4: Add Auto-Refresh Logic to ArtifactContainer (20 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ArtifactContainer.tsx`

**Add import**:
```typescript
import { isUrlExpired, shouldRefreshUrl } from '@/utils/bundleUrlManager';
```

**Add state and effect**:
```typescript
const [isRefreshingBundle, setIsRefreshingBundle] = useState(false);

// Check for expired URLs and auto-refresh
useEffect(() => {
  if (!artifact.bundleUrl || !artifact.expiresAt) return;

  if (isUrlExpired(artifact.expiresAt)) {
    console.log('Bundle URL expired, triggering re-bundle...');
    handleRebundle();
  } else if (shouldRefreshUrl(artifact.expiresAt)) {
    console.log('Bundle URL expiring soon, pre-emptively refreshing...');
    // Optional: pre-emptively refresh URLs close to expiry
  }
}, [artifact.bundleUrl, artifact.expiresAt]);

const handleRebundle = async () => {
  setIsRefreshingBundle(true);
  try {
    // Call bundle-artifact endpoint again with existing code
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bundle-artifact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        code: artifact.code,
        type: artifact.type,
        dependencies: artifact.dependencies
      })
    });

    if (!response.ok) throw new Error('Re-bundle failed');

    const data = await response.json();

    // Update artifact with new URL
    updateArtifact({
      ...artifact,
      bundleUrl: data.bundleUrl,
      expiresAt: data.expiresAt
    });
  } catch (error) {
    console.error('Failed to re-bundle artifact:', error);
    // Show error state to user
  } finally {
    setIsRefreshingBundle(false);
  }
};
```

**Add loading state to render**:
```typescript
{isRefreshingBundle && (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Refreshing artifact...</p>
    </div>
  </div>
)}
```

### Files to Create

- `/Users/nick/Projects/llm-chat-site/src/utils/bundleUrlManager.ts`

### Files to Modify

- `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts`
- `/Users/nick/Projects/llm-chat-site/src/components/ArtifactContainer.tsx`

### Testing Checklist

- [ ] **Server-side changes**:
  - [ ] Generate artifact, inspect response for `expiresAt` field
  - [ ] Verify `expiresAt` is 24 hours from now (not 1 hour)
  - [ ] Check Supabase Storage for signed URL validity period

- [ ] **Client-side expiry detection**:
  - [ ] Mock expired `expiresAt` timestamp, verify detection works
  - [ ] Test `isUrlExpired()` with various timestamps
  - [ ] Test `shouldRefreshUrl()` near expiry boundary

- [ ] **Auto-refresh flow**:
  - [ ] Generate artifact, manually set `expiresAt` to past date
  - [ ] Verify re-bundle triggered automatically
  - [ ] Check loading state appears during refresh
  - [ ] Confirm new URL works after refresh

- [ ] **Storage cost verification**:
  - [ ] Check Supabase Storage usage after 24h
  - [ ] Verify lifecycle policies clean up old bundles
  - [ ] Monitor egress costs if changed

### Acceptance Criteria

- [ ] Signed URLs valid for 24 hours instead of 1 hour
- [ ] `expiresAt` timestamp included in bundle response
- [ ] Client detects expired URLs on artifact load
- [ ] Automatic re-bundling triggered for expired URLs
- [ ] User sees loading state during re-bundle
- [ ] No errors in console during expiry detection
- [ ] Returning users (after >1h but <24h) see working artifacts
- [ ] Storage costs remain acceptable (monitor for 1 week)

### Rollback Considerations

**Rollback difficulty**: Easy
**Rollback steps**:
1. Revert `expiresIn` to 3600 seconds in bundle-artifact/index.ts
2. Remove `expiresAt` field from response (optional, doesn't break anything)
3. Client-side code gracefully handles missing `expiresAt` (treats as expired)

**Data concerns**: None - only affects new bundles, old URLs already expired

---

## Task 3.2: Add Bundle Progress Events

**Priority**: 2 (do second in Phase 3)
**Estimated Time**: 1.5 hours
**Impact**: Medium - reduces perceived wait time
**Risk Level**: Medium
**Rollback Difficulty**: Easy

### Problem Statement

During the 5-15 second bundling process for artifacts with npm dependencies, users see no feedback. The UI appears frozen, causing users to think the request failed or the app hung.

**User Impact**:
- Confusion during long bundling waits
- Increased bounce rate (users refresh/close tab)
- Support requests about "stuck" artifacts
- Poor perceived performance

### Implementation Steps

#### Step 1: Add SSE Progress Events to Bundle Function (30 min)

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts`

**Add streaming setup** at the start of the handler:

```typescript
// At top of file
const encoder = new TextEncoder();

// Inside handler, before bundling logic
const isStreamingRequest = req.headers.get('accept')?.includes('text/event-stream');

if (isStreamingRequest) {
  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const writer = {
        write: (chunk: string) => controller.enqueue(encoder.encode(chunk))
      };

      try {
        // Send start event
        writer.write(`data: ${JSON.stringify({
          type: 'bundle_start',
          dependencies: Object.keys(dependencies),
          totalDeps: Object.keys(dependencies).length
        })}\n\n`);

        let completedDeps = 0;

        // Track progress during dependency fetching
        for (const [pkg, version] of Object.entries(dependencies)) {
          writer.write(`data: ${JSON.stringify({
            type: 'bundle_progress',
            package: pkg,
            version,
            status: 'fetching',
            progress: completedDeps / Object.keys(dependencies).length
          })}\n\n`);

          // ... existing fetch logic here ...

          completedDeps++;

          writer.write(`data: ${JSON.stringify({
            type: 'bundle_progress',
            package: pkg,
            status: 'completed',
            progress: completedDeps / Object.keys(dependencies).length
          })}\n\n`);
        }

        // ... bundling logic ...

        writer.write(`data: ${JSON.stringify({
          type: 'bundle_assembling',
          status: 'Assembling final bundle...'
        })}\n\n`);

        // ... final HTML generation ...

        writer.write(`data: ${JSON.stringify({
          type: 'bundle_uploading',
          status: 'Uploading to storage...'
        })}\n\n`);

        // ... storage upload ...

        writer.write(`data: ${JSON.stringify({
          type: 'bundle_complete',
          bundleUrl: signedUrl,
          expiresAt: expiresAt,
          bundleSize
        })}\n\n`);

        controller.close();
      } catch (error) {
        writer.write(`data: ${JSON.stringify({
          type: 'bundle_error',
          error: error.message
        })}\n\n`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

// Fallback to non-streaming response for backward compatibility
```

#### Step 2: Add Client-Side SSE Handler (30 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx`

**Add state for bundling progress**:
```typescript
const [bundlingProgress, setBundlingProgress] = useState<{
  currentPackage?: string;
  progress: number;
  status: string;
} | null>(null);
```

**Add SSE handler for bundle requests**:
```typescript
const handleBundleRequest = async (code: string, dependencies: Record<string, string>) => {
  setBundlingProgress({ progress: 0, status: 'Starting bundle...' });

  const eventSource = new EventSource(
    `${SUPABASE_URL}/functions/v1/bundle-artifact`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      method: 'POST',
      body: JSON.stringify({ code, dependencies, type: 'react' })
    }
  );

  eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'bundle_start':
        setBundlingProgress({
          progress: 0,
          status: `Bundling ${data.totalDeps} dependencies...`
        });
        break;

      case 'bundle_progress':
        setBundlingProgress({
          currentPackage: data.package,
          progress: data.progress,
          status: data.status === 'fetching'
            ? `Fetching ${data.package}@${data.version}...`
            : `Completed ${data.package}`
        });
        break;

      case 'bundle_assembling':
        setBundlingProgress({
          progress: 0.9,
          status: 'Assembling bundle...'
        });
        break;

      case 'bundle_uploading':
        setBundlingProgress({
          progress: 0.95,
          status: 'Uploading...'
        });
        break;

      case 'bundle_complete':
        setBundlingProgress({
          progress: 1,
          status: 'Complete!'
        });
        // Update artifact with bundle URL
        updateArtifact({ bundleUrl: data.bundleUrl, expiresAt: data.expiresAt });
        eventSource.close();
        setTimeout(() => setBundlingProgress(null), 1000);
        break;

      case 'bundle_error':
        setBundlingProgress(null);
        console.error('Bundle error:', data.error);
        eventSource.close();
        break;
    }
  });

  eventSource.addEventListener('error', () => {
    setBundlingProgress(null);
    eventSource.close();
  });
};
```

#### Step 3: Display Progress in UI (30 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ArtifactContainer.tsx`

**Add progress display**:
```typescript
import { Progress } from '@/components/ui/progress';

// In render
{bundlingProgress && (
  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 z-10">
    <div className="w-64 space-y-4">
      <div className="flex items-center space-x-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium">Bundling dependencies</span>
      </div>

      <Progress value={bundlingProgress.progress * 100} className="h-2" />

      <div className="text-xs text-muted-foreground space-y-1">
        <p>{bundlingProgress.status}</p>
        {bundlingProgress.currentPackage && (
          <p className="font-mono text-xs opacity-60">
            {bundlingProgress.currentPackage}
          </p>
        )}
      </div>
    </div>
  </div>
)}
```

**Alternative**: Show progress in ReasoningDisplay component:

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

```typescript
// Add bundling progress to display alongside reasoning
{bundlingProgress && (
  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
    <Loader2 className="h-3 w-3 animate-spin" />
    <span>{bundlingProgress.status}</span>
    {bundlingProgress.progress > 0 && (
      <span className="opacity-60">
        ({Math.round(bundlingProgress.progress * 100)}%)
      </span>
    )}
  </div>
)}
```

### Files to Modify

- `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts`
- `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx`
- `/Users/nick/Projects/llm-chat-site/src/components/ArtifactContainer.tsx` OR
- `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

### Testing Checklist

- [ ] **Server-side events**:
  - [ ] Generate artifact with 3+ dependencies
  - [ ] Monitor Network tab for SSE events
  - [ ] Verify `bundle_start`, `bundle_progress`, `bundle_complete` events sent
  - [ ] Check event timing and order

- [ ] **Client-side handling**:
  - [ ] Progress bar updates during bundling
  - [ ] Current package name displays
  - [ ] Progress reaches 100% before completion
  - [ ] No UI flash or jank

- [ ] **Error cases**:
  - [ ] Trigger bundle error, verify `bundle_error` event
  - [ ] Check EventSource cleanup on error
  - [ ] Test network interruption during bundling

- [ ] **Backward compatibility**:
  - [ ] Non-SSE requests still work (fallback response)
  - [ ] Old clients without SSE support still function

### Acceptance Criteria

- [ ] SSE events stream from bundle-artifact function
- [ ] Progress bar shows during bundling (0-100%)
- [ ] Current package name displayed
- [ ] Progress reaches 100% when bundle completes
- [ ] No premature completion (waits for upload)
- [ ] Graceful error handling with user feedback
- [ ] Backward compatible with non-SSE clients
- [ ] No performance degradation during streaming

### Rollback Considerations

**Rollback difficulty**: Easy
**Rollback steps**:
1. Remove SSE streaming code from bundle-artifact (keep fallback)
2. Remove EventSource handlers from client
3. Fall back to showing generic "Bundling..." message

**Data concerns**: None - purely presentation layer

---

## Task 3.3: Optimize ReasoningDisplay Animations

**Priority**: 3 (do third in Phase 3)
**Estimated Time**: 30 minutes
**Impact**: Low - improves performance on lower-end devices
**Risk Level**: Low
**Rollback Difficulty**: Very Easy

### Problem Statement

The ReasoningDisplay component uses Framer Motion's `AnimatePresence` with layout properties (y) that trigger layout recalculations on every frame. On lower-end devices or throttled CPUs, this causes:
- Janky animations (<60fps)
- High CPU usage during reasoning streaming
- Layout thrashing visible in Performance profiler

**User Impact**:
- Choppy animations on mobile/older devices
- Increased battery drain
- Poor perceived performance

### Implementation Steps

#### Step 1: Replace Layout Properties with Transform (15 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

**Find current animation code** (look for Framer Motion variants):

**Current code**:
```typescript
const stepVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
};
```

**Change to**:
```typescript
const stepVariants = {
  initial: {
    opacity: 0,
    transform: 'translateY(8px)' // Use transform instead of y
  },
  animate: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    transform: 'translateY(-8px)',
    transition: {
      duration: 0.15,
      ease: 'easeIn'
    }
  }
};
```

**Why this helps**: `transform` is GPU-accelerated and doesn't trigger layout recalculations, unlike `y` which modifies the layout property.

#### Step 2: Add `will-change` for GPU Acceleration (5 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

**Add to motion component**:
```typescript
<motion.div
  variants={stepVariants}
  initial="initial"
  animate="animate"
  exit="exit"
  style={{ willChange: 'transform, opacity' }} // Hint to browser for GPU layer
  className="..."
>
  {/* content */}
</motion.div>
```

#### Step 3: Optimize AnimatePresence Mode (5 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

**Current code**:
```typescript
<AnimatePresence>
  {steps.map(step => (...))}
</AnimatePresence>
```

**Change to**:
```typescript
<AnimatePresence mode="popLayout">
  {steps.map(step => (...))}
</AnimatePresence>
```

**Why**: `popLayout` mode optimizes layout shifts when items enter/exit.

#### Step 4: Add Performance Monitoring (5 min)

**Optional**: Add performance measurement to detect regressions:

```typescript
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.duration > 16.67) { // >60fps threshold
          console.warn('Slow frame detected in ReasoningDisplay:', entry.duration);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }
}, []);
```

### Files to Modify

- `/Users/nick/Projects/llm-chat-site/src/components/ReasoningDisplay.tsx`

### Testing Checklist

- [ ] **Performance profiling**:
  - [ ] Open Chrome DevTools Performance tab
  - [ ] Record during reasoning streaming
  - [ ] Check for layout recalculations (should be 0 or minimal)
  - [ ] Verify animations run at 60fps

- [ ] **Visual regression**:
  - [ ] Animations still look smooth and natural
  - [ ] No visual difference from previous implementation
  - [ ] Entrance/exit animations timing correct

- [ ] **Device testing**:
  - [ ] Test on lower-end device or 4x CPU throttling
  - [ ] Verify no jank or stuttering
  - [ ] Check battery usage improvement (if measurable)

- [ ] **Browser compatibility**:
  - [ ] Test in Chrome, Firefox, Safari
  - [ ] Verify GPU acceleration working (check DevTools Layers)

### Acceptance Criteria

- [ ] No layout recalculations during step transitions
- [ ] Animations run at 60fps on throttled CPU (4x slowdown)
- [ ] GPU layers created for animated elements
- [ ] Visual appearance unchanged
- [ ] No console warnings about slow frames
- [ ] Reduced CPU usage during streaming (measure before/after)

### Rollback Considerations

**Rollback difficulty**: Very Easy
**Rollback steps**:
1. Revert animation variants to use `y` instead of `transform`
2. Remove `will-change` style
3. Remove `mode="popLayout"` from AnimatePresence

**Data concerns**: None - purely visual change

---

# Phase 4: Future Optimizations (P3)

**Priority**: Low (nice-to-have)
**Estimated Time**: 3 hours
**Impact**: High performance gains, lower operational costs
**Dependencies**: Phase 3 completed (optional - can run independently)

---

## Task 4.1: Pre-bundle Common Dependencies

**Priority**: 1 (highest value in Phase 4)
**Estimated Time**: 2 hours
**Impact**: Very High - 10s → <1s for 80% of bundles
**Risk Level**: Medium
**Rollback Difficulty**: Easy

### Problem Statement

Popular npm packages (Recharts, Radix UI, Framer Motion) take 5-15 seconds to bundle every time they're requested. These packages appear in 80%+ of artifacts, meaning we're repeatedly doing the same expensive bundling work.

**Current State**:
- Recharts bundle: ~10 seconds
- Radix UI Dialog: ~5 seconds
- Framer Motion: ~8 seconds

**User Impact**:
- Long waits for common components
- Wasted server resources
- Higher API costs from repeated bundling
- Poor user experience for frequently-used packages

### Implementation Steps

#### Step 1: Identify Top Dependencies from Usage Data (15 min)

**Query database** to find most common dependencies:

```sql
-- Run in Supabase SQL editor
SELECT
  dep_key,
  COUNT(*) as usage_count,
  AVG(bundle_time_ms) as avg_bundle_time
FROM (
  SELECT
    jsonb_object_keys(dependencies) as dep_key,
    created_at
  FROM chat_messages
  WHERE content LIKE '%<artifact%'
    AND created_at > NOW() - INTERVAL '30 days'
) deps
GROUP BY dep_key
ORDER BY usage_count DESC
LIMIT 20;
```

**Expected top packages** (based on common usage):
1. `recharts` (data visualization)
2. `@radix-ui/react-dialog`
3. `@radix-ui/react-select`
4. `@radix-ui/react-tabs`
5. `framer-motion`
6. `lucide-react`
7. `date-fns`
8. `@radix-ui/react-dropdown-menu`

#### Step 2: Create Pre-bundle Build Script (45 min)

**Create file**: `/Users/nick/Projects/llm-chat-site/scripts/build-prebuilt-bundles.ts`

```typescript
/**
 * Build script for pre-bundling common npm dependencies
 * Run with: deno run --allow-net --allow-write scripts/build-prebuilt-bundles.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PREBUILT_PACKAGES = [
  { pkg: 'recharts', version: '2.5.0' },
  { pkg: '@radix-ui/react-dialog', version: '1.0.5' },
  { pkg: '@radix-ui/react-select', version: '2.0.0' },
  { pkg: '@radix-ui/react-tabs', version: '1.0.4' },
  { pkg: 'framer-motion', version: '11.0.0' },
  { pkg: 'lucide-react', version: '0.263.1' },
  { pkg: 'date-fns', version: '2.30.0' }
];

async function fetchAndBundlePackage(pkg: string, version: string) {
  console.log(`Bundling ${pkg}@${version}...`);

  const startTime = Date.now();

  // Fetch from esm.sh with external React
  const esmUrl = `https://esm.sh/${pkg}@${version}?external=react,react-dom&bundle`;
  const response = await fetch(esmUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${pkg}: ${response.statusText}`);
  }

  const bundleCode = await response.text();
  const bundleSize = new Blob([bundleCode]).size;

  console.log(`  Bundled in ${Date.now() - startTime}ms (${(bundleSize / 1024).toFixed(2)}KB)`);

  return {
    pkg,
    version,
    code: bundleCode,
    size: bundleSize,
    bundleTime: Date.now() - startTime
  };
}

async function uploadToStorage(
  supabase: any,
  pkg: string,
  version: string,
  code: string
) {
  const fileName = `prebuilt/${pkg.replace('/', '-')}-${version}.bundle.js`;

  const { data, error } = await supabase.storage
    .from('artifact-bundles')
    .upload(fileName, code, {
      contentType: 'application/javascript',
      cacheControl: '31536000', // 1 year - immutable
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = await supabase.storage
    .from('artifact-bundles')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function main() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const results = [];

  for (const { pkg, version } of PREBUILT_PACKAGES) {
    try {
      const bundle = await fetchAndBundlePackage(pkg, version);
      const url = await uploadToStorage(supabase, pkg, version, bundle.code);

      results.push({
        key: `${pkg}@${version}`,
        url,
        size: bundle.size,
        bundleTime: bundle.bundleTime,
        includes: [pkg] // Add transitive deps if needed
      });

      console.log(`✓ ${pkg}@${version} uploaded to ${url}`);
    } catch (error) {
      console.error(`✗ Failed to bundle ${pkg}@${version}:`, error);
    }
  }

  // Write manifest file
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    bundles: results
  };

  await Deno.writeTextFile(
    './supabase/functions/_shared/prebuilt-bundles.json',
    JSON.stringify(manifest, null, 2)
  );

  console.log('\n✓ Manifest written to _shared/prebuilt-bundles.json');
  console.log(`Total bundles: ${results.length}`);
  console.log(`Total size: ${(results.reduce((sum, r) => sum + r.size, 0) / 1024 / 1024).toFixed(2)}MB`);
}

main().catch(console.error);
```

#### Step 3: Create Prebuilt Bundle Lookup System (30 min)

**Create file**: `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/prebuilt-bundles.ts`

```typescript
/**
 * Prebuilt bundle lookup and fallback system
 */

import prebuiltManifest from './prebuilt-bundles.json' assert { type: 'json' };

export interface PrebuiltBundle {
  key: string;
  url: string;
  size: number;
  includes: string[];
}

/**
 * Check if dependencies can be satisfied by a prebuilt bundle
 */
export function getPrebuiltBundle(
  dependencies: Record<string, string>
): PrebuiltBundle | null {
  const depKeys = Object.entries(dependencies)
    .map(([pkg, version]) => `${pkg}@${version}`);

  // Look for exact match
  for (const bundle of prebuiltManifest.bundles) {
    if (depKeys.length === 1 && bundle.key === depKeys[0]) {
      return bundle;
    }
  }

  // Look for subset match (all requested deps covered by one bundle)
  for (const bundle of prebuiltManifest.bundles) {
    const allIncluded = depKeys.every(depKey =>
      bundle.includes.some(included => depKey.startsWith(included + '@'))
    );

    if (allIncluded) {
      return bundle;
    }
  }

  return null;
}

/**
 * Split dependencies into prebuilt vs need-bundling
 */
export function splitDependencies(dependencies: Record<string, string>): {
  prebuilt: PrebuiltBundle[];
  needsBundling: Record<string, string>;
} {
  const prebuilt: PrebuiltBundle[] = [];
  const needsBundling: Record<string, string> = {};

  for (const [pkg, version] of Object.entries(dependencies)) {
    const bundle = getPrebuiltBundle({ [pkg]: version });

    if (bundle) {
      prebuilt.push(bundle);
    } else {
      needsBundling[pkg] = version;
    }
  }

  return { prebuilt, needsBundling };
}

/**
 * Log prebuilt bundle usage for analytics
 */
export function logPrebuiltUsage(bundleKey: string, savedTime: number) {
  console.log(`[Prebuilt] Used ${bundleKey}, saved ~${savedTime}ms`);
  // Optional: send to analytics
}
```

#### Step 4: Integrate into bundle-artifact Function (30 min)

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts`

**Add import**:
```typescript
import {
  getPrebuiltBundle,
  splitDependencies,
  logPrebuiltUsage
} from '../_shared/prebuilt-bundles.ts';
```

**Modify bundling logic** (around where dependencies are processed):

```typescript
// Check for prebuilt bundle first
const prebuilt = getPrebuiltBundle(dependencies);

if (prebuilt) {
  // Use prebuilt bundle - instant response!
  logPrebuiltUsage(prebuilt.key, 10000); // Estimate ~10s saved

  return new Response(
    JSON.stringify({
      bundleUrl: prebuilt.url,
      prebuilt: true,
      bundleSize: prebuilt.size,
      dependencies: Object.keys(dependencies)
    }),
    {
      headers: {
        ...corsHeaders,
        'X-Bundle-Type': 'prebuilt'
      }
    }
  );
}

// Fallback to dynamic bundling for non-prebuilt deps
console.log('No prebuilt bundle found, bundling dynamically...');

// ... existing bundling logic ...
```

**For mixed scenarios** (some prebuilt, some not):

```typescript
const { prebuilt, needsBundling } = splitDependencies(dependencies);

let scriptTags = '';

// Add prebuilt bundles as script tags
for (const bundle of prebuilt) {
  scriptTags += `<script type="module" src="${bundle.url}"></script>\n`;
  logPrebuiltUsage(bundle.key, 5000);
}

// Bundle remaining dependencies dynamically
if (Object.keys(needsBundling).length > 0) {
  // ... existing bundling logic for needsBundling ...
  scriptTags += `<script type="module">${dynamicBundle}</script>\n`;
}
```

### Files to Create

- `/Users/nick/Projects/llm-chat-site/scripts/build-prebuilt-bundles.ts`
- `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/prebuilt-bundles.ts`
- `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/prebuilt-bundles.json` (generated)

### Files to Modify

- `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts`

### Testing Checklist

- [ ] **Build script**:
  - [ ] Run build script successfully
  - [ ] Verify all packages bundle without errors
  - [ ] Check manifest.json generated correctly
  - [ ] Inspect bundle sizes (should be reasonable)

- [ ] **Storage upload**:
  - [ ] Verify bundles uploaded to Supabase Storage
  - [ ] Check public URLs are accessible
  - [ ] Test cache headers (should be 1 year)

- [ ] **Bundle lookup**:
  - [ ] Request artifact with `recharts` → gets prebuilt
  - [ ] Request artifact with uncommon package → falls back to dynamic
  - [ ] Mixed request (recharts + custom package) → hybrid approach

- [ ] **Performance**:
  - [ ] Measure time for prebuilt bundle: should be <500ms
  - [ ] Measure time for dynamic bundle: should be ~5-15s
  - [ ] Verify 10x+ speedup for common packages

- [ ] **Fallback behavior**:
  - [ ] Delete prebuilt bundle from storage → falls back to dynamic
  - [ ] Invalid manifest → falls back to dynamic
  - [ ] No errors or crashes

### Acceptance Criteria

- [ ] Top 5-7 packages pre-bundled and uploaded
- [ ] Prebuilt bundles load in <1 second
- [ ] Dynamic bundling still works for non-prebuilt packages
- [ ] Hybrid approach works (mix of prebuilt + dynamic)
- [ ] Manifest file tracks all prebuilt bundles
- [ ] Analytics log prebuilt usage for monitoring
- [ ] 80%+ of bundle requests use prebuilt (monitor for 1 week)
- [ ] No increase in error rate

### Rollback Considerations

**Rollback difficulty**: Easy
**Rollback steps**:
1. Remove prebuilt lookup from bundle-artifact/index.ts
2. Function automatically falls back to dynamic bundling
3. Delete prebuilt bundles from storage (optional, no harm)

**Data concerns**: None - purely optimization, no schema changes

**Monitoring**: Track prebuilt hit rate to verify value:
```typescript
// Add to analytics
const prebuiltHitRate = prebuiltRequests / totalRequests;
// Target: >80%
```

---

## Task 4.2: Implement Token-Based Rate Limiting

**Priority**: 2 (important for fairness)
**Estimated Time**: 1 hour
**Impact**: Medium - fairer resource allocation
**Risk Level**: Medium
**Rollback Difficulty**: Medium

### Problem Statement

Current rate limiting treats all artifact requests equally - a simple "Hello World" React component counts the same as a complex dashboard with Recharts, Radix UI, and thousands of tokens. This creates unfair resource allocation:

**Issues**:
- Power users can abuse limits with complex requests
- Simple requests get throttled equally with expensive ones
- No incentive for users to request simpler artifacts
- Resource costs not aligned with limits

### Implementation Steps

#### Step 1: Create Token Usage Tracking Table (15 min)

**Create file**: `/Users/nick/Projects/llm-chat-site/supabase/migrations/20251201000000_token_based_rate_limits.sql`

```sql
-- Token-based rate limiting for artifact generation
CREATE TABLE IF NOT EXISTS artifact_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_identifier TEXT,
  tokens_used INTEGER NOT NULL CHECK (tokens_used > 0),
  artifact_type TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for fast lookup by user/guest and time window
  CONSTRAINT check_user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_identifier IS NULL) OR
    (user_id IS NULL AND guest_identifier IS NOT NULL)
  )
);

-- Indexes for efficient queries
CREATE INDEX idx_artifact_token_usage_user_window
  ON artifact_token_usage(user_id, window_start)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_artifact_token_usage_guest_window
  ON artifact_token_usage(guest_identifier, window_start)
  WHERE guest_identifier IS NOT NULL;

-- RLS policies
ALTER TABLE artifact_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token usage"
  ON artifact_token_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check and enforce token rate limits
CREATE OR REPLACE FUNCTION check_token_rate_limit(
  p_user_id UUID,
  p_guest_identifier TEXT,
  p_tokens_requested INTEGER,
  p_max_tokens INTEGER DEFAULT 100000,
  p_window_hours INTEGER DEFAULT 24
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_tokens_used INTEGER;
  v_remaining INTEGER;
  v_allowed BOOLEAN;
BEGIN
  v_window_start := NOW() - (p_window_hours || ' hours')::INTERVAL;

  -- Sum tokens used in current window
  SELECT COALESCE(SUM(tokens_used), 0)
  INTO v_tokens_used
  FROM artifact_token_usage
  WHERE window_start >= v_window_start
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_guest_identifier IS NOT NULL AND guest_identifier = p_guest_identifier)
    );

  v_remaining := p_max_tokens - v_tokens_used;
  v_allowed := v_remaining >= p_tokens_requested;

  RETURN json_build_object(
    'allowed', v_allowed,
    'tokens_used', v_tokens_used,
    'tokens_remaining', GREATEST(0, v_remaining),
    'tokens_requested', p_tokens_requested,
    'limit', p_max_tokens,
    'window_hours', p_window_hours
  );
END;
$$;

-- Function to record token usage
CREATE OR REPLACE FUNCTION record_token_usage(
  p_user_id UUID,
  p_guest_identifier TEXT,
  p_tokens_used INTEGER,
  p_artifact_type TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO artifact_token_usage (
    user_id,
    guest_identifier,
    tokens_used,
    artifact_type,
    window_start
  ) VALUES (
    p_user_id,
    p_guest_identifier,
    p_tokens_used,
    p_artifact_type,
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Cleanup old records (>7 days)
CREATE OR REPLACE FUNCTION cleanup_old_token_usage()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM artifact_token_usage
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
```

**Run migration**:
```bash
supabase db reset  # In local dev
# Or push to prod:
supabase db push
```

#### Step 2: Add Token Estimation Logic (20 min)

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/token-estimator.ts`

```typescript
/**
 * Estimate token usage for artifact generation requests
 * Used for pre-flight rate limit checks
 */

export interface TokenEstimate {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Estimate tokens based on prompt and context
 */
export function estimateArtifactTokens(
  prompt: string,
  context: string = '',
  dependencies: Record<string, string> = {}
): TokenEstimate {
  // Rough character-to-token ratio (GPT models average ~4 chars per token)
  const CHARS_PER_TOKEN = 4;

  // Base prompt tokens
  const promptChars = prompt.length + context.length;
  const promptTokens = Math.ceil(promptChars / CHARS_PER_TOKEN);

  // Estimate completion tokens based on complexity
  let completionTokens = 2000; // Base for simple artifacts
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';

  // Adjust for dependencies (more deps = more complex code)
  const depCount = Object.keys(dependencies).length;
  if (depCount > 3) {
    completionTokens = 6000;
    complexity = 'complex';
  } else if (depCount > 0) {
    completionTokens = 4000;
    complexity = 'moderate';
  }

  // Adjust for prompt complexity indicators
  const complexityKeywords = [
    'dashboard', 'chart', 'graph', 'animation', 'form',
    'table', 'calendar', 'interactive', 'dynamic'
  ];

  const keywordMatches = complexityKeywords.filter(kw =>
    prompt.toLowerCase().includes(kw)
  ).length;

  if (keywordMatches > 2) {
    completionTokens = Math.max(completionTokens, 5000);
    complexity = 'complex';
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    complexity
  };
}

/**
 * Get rate limit config based on user tier
 */
export function getRateLimitConfig(isAuthenticated: boolean): {
  maxTokens: number;
  windowHours: number;
} {
  if (isAuthenticated) {
    return {
      maxTokens: 500000, // 500k tokens per day for authenticated
      windowHours: 24
    };
  }

  return {
    maxTokens: 100000, // 100k tokens per 24h for guests
    windowHours: 24
  };
}
```

#### Step 3: Integrate into generate-artifact Function (25 min)

**File**: `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-artifact/index.ts`

**Add imports**:
```typescript
import { estimateArtifactTokens, getRateLimitConfig } from '../_shared/token-estimator.ts';
import { supabaseAdmin } from '../_shared/supabase-client.ts';
```

**Add pre-flight check** before AI generation:

```typescript
// Early in handler, after extracting prompt/dependencies
const tokenEstimate = estimateArtifactTokens(
  prompt,
  contextMessages.join('\n'),
  dependencies
);

console.log('Token estimate:', tokenEstimate);

// Get user identifier
const userId = session?.user?.id || null;
const guestId = userId ? null : (req.headers.get('x-guest-id') || 'unknown');

// Check rate limit
const { maxTokens, windowHours } = getRateLimitConfig(!!userId);

const { data: rateLimitCheck } = await supabaseAdmin.rpc('check_token_rate_limit', {
  p_user_id: userId,
  p_guest_identifier: guestId,
  p_tokens_requested: tokenEstimate.totalTokens,
  p_max_tokens: maxTokens,
  p_window_hours: windowHours
});

if (!rateLimitCheck.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `You've used ${rateLimitCheck.tokens_used} of ${rateLimitCheck.limit} tokens in the last ${windowHours} hours. Try again later or simplify your request.`,
      tokensRemaining: rateLimitCheck.tokens_remaining,
      estimatedTokens: tokenEstimate.totalTokens
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'X-RateLimit-Limit': maxTokens.toString(),
        'X-RateLimit-Remaining': rateLimitCheck.tokens_remaining.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowHours * 60 * 60 * 1000).toISOString()
      }
    }
  );
}

// ... proceed with generation ...

// After successful generation, record actual usage
await supabaseAdmin.rpc('record_token_usage', {
  p_user_id: userId,
  p_guest_identifier: guestId,
  p_tokens_used: actualTokensUsed || tokenEstimate.totalTokens, // Use actual if available
  p_artifact_type: artifactType
});
```

### Files to Create

- `/Users/nick/Projects/llm-chat-site/supabase/migrations/20251201000000_token_based_rate_limits.sql`
- `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/token-estimator.ts`

### Files to Modify

- `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-artifact/index.ts`

### Testing Checklist

- [ ] **Database functions**:
  - [ ] Test `check_token_rate_limit()` with various inputs
  - [ ] Test `record_token_usage()` inserts correctly
  - [ ] Verify cleanup function removes old records

- [ ] **Token estimation**:
  - [ ] Simple prompt → ~2k tokens estimated
  - [ ] Complex prompt with dependencies → ~6k+ tokens
  - [ ] Estimation accuracy within 20% of actual

- [ ] **Rate limiting**:
  - [ ] Exceed limit → 429 error with helpful message
  - [ ] Under limit → request succeeds
  - [ ] Headers show remaining quota
  - [ ] Different limits for auth vs guest

- [ ] **Edge cases**:
  - [ ] Exactly at limit boundary
  - [ ] Multiple concurrent requests
  - [ ] Window rollover (24h transition)

### Acceptance Criteria

- [ ] Token usage tracked per user/guest
- [ ] Rate limiting based on estimated tokens
- [ ] Complex artifacts cost more quota than simple ones
- [ ] 429 responses include helpful error messages
- [ ] Rate limit headers present in responses
- [ ] Different limits for authenticated vs guest users
- [ ] Cleanup function removes records >7 days old
- [ ] No performance degradation (<50ms overhead)

### Rollback Considerations

**Rollback difficulty**: Medium
**Rollback steps**:
1. Remove token estimation from generate-artifact
2. Fall back to request-count based limiting
3. Migration creates new table, safe to leave in place or drop

**Data concerns**: New table, no impact on existing data

**Monitoring**: Track false positives (legitimate users blocked)

---

## Task 4.3: Add Artifact Response Caching

**Priority**: 3 (lowest priority, nice-to-have)
**Estimated Time**: 45 minutes
**Impact**: Medium - reduces redundant API calls
**Risk Level**: Low
**Rollback Difficulty**: Very Easy

### Problem Statement

When users make identical artifact requests (same prompt, same context), the system regenerates the artifact from scratch every time. This wastes:
- API costs (GLM-4.6 calls)
- User wait time (5-15 seconds)
- Server resources (bundling, storage)

**Common scenarios**:
- User clicks "Regenerate" accidentally
- User reloads page during generation
- Multiple users request same common artifact (e.g., "todo list")

### Implementation Steps

#### Step 1: Create Caching Utility (20 min)

**Create file**: `/Users/nick/Projects/llm-chat-site/src/utils/artifactCache.ts`

```typescript
/**
 * Client-side artifact response caching
 * Reduces redundant API calls for identical requests
 */

const CACHE_PREFIX = 'artifact_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50; // Max cached artifacts

export interface CachedArtifact {
  code: string;
  type: string;
  title: string;
  dependencies?: Record<string, string>;
  bundleUrl?: string;
  timestamp: number;
  promptHash: string;
}

/**
 * Generate hash from prompt and context for cache key
 */
export async function hashPrompt(prompt: string, context: string = ''): Promise<string> {
  const text = prompt + '|' + context;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Use Web Crypto API for consistent hashing
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex.substring(0, 16); // First 16 chars sufficient
}

/**
 * Get cached artifact by prompt hash
 */
export function getCachedArtifact(promptHash: string): CachedArtifact | null {
  try {
    const cacheKey = `${CACHE_PREFIX}${promptHash}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const artifact: CachedArtifact = JSON.parse(cached);

    // Check if expired
    if (Date.now() - artifact.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log('✓ Cache hit for artifact:', promptHash);
    return artifact;
  } catch (error) {
    console.error('Failed to read artifact cache:', error);
    return null;
  }
}

/**
 * Cache artifact response
 */
export function cacheArtifact(promptHash: string, artifact: Omit<CachedArtifact, 'timestamp' | 'promptHash'>): void {
  try {
    // Check cache size, evict oldest if needed
    const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));

    if (cacheKeys.length >= MAX_CACHE_SIZE) {
      // Find oldest cached item
      let oldestKey = cacheKeys[0];
      let oldestTime = Infinity;

      for (const key of cacheKeys) {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (item.timestamp < oldestTime) {
          oldestTime = item.timestamp;
          oldestKey = key;
        }
      }

      localStorage.removeItem(oldestKey);
      console.log('Evicted oldest cache entry:', oldestKey);
    }

    const cacheKey = `${CACHE_PREFIX}${promptHash}`;
    const cachedData: CachedArtifact = {
      ...artifact,
      timestamp: Date.now(),
      promptHash
    };

    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    console.log('✓ Cached artifact:', promptHash);
  } catch (error) {
    console.error('Failed to cache artifact:', error);
    // Non-fatal, just log and continue
  }
}

/**
 * Clear all cached artifacts
 */
export function clearArtifactCache(): void {
  const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  for (const key of cacheKeys) {
    localStorage.removeItem(key);
  }
  console.log(`Cleared ${cacheKeys.length} cached artifacts`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  count: number;
  totalSize: number;
  oldestTimestamp: number;
} {
  const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));

  let totalSize = 0;
  let oldestTimestamp = Date.now();

  for (const key of cacheKeys) {
    const item = localStorage.getItem(key) || '';
    totalSize += item.length;

    const artifact: CachedArtifact = JSON.parse(item);
    if (artifact.timestamp < oldestTimestamp) {
      oldestTimestamp = artifact.timestamp;
    }
  }

  return {
    count: cacheKeys.length,
    totalSize,
    oldestTimestamp
  };
}
```

#### Step 2: Integrate Cache into Chat Hook (15 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx`

**Add imports**:
```typescript
import { hashPrompt, getCachedArtifact, cacheArtifact } from '@/utils/artifactCache';
```

**Modify artifact generation logic**:

```typescript
const handleGenerateArtifact = async (prompt: string, force: boolean = false) => {
  // Build context from recent messages
  const context = messages.slice(-5).map(m => m.content).join('\n');

  // Generate cache key
  const promptHash = await hashPrompt(prompt, context);

  // Check cache unless force regeneration
  if (!force) {
    const cached = getCachedArtifact(promptHash);

    if (cached) {
      // Use cached artifact
      console.log('Using cached artifact, skipping API call');

      // Add to messages as if freshly generated
      addMessage({
        role: 'assistant',
        content: `<artifact type="${cached.type}" title="${cached.title}">\n${cached.code}\n</artifact>`,
        artifactData: {
          code: cached.code,
          type: cached.type,
          title: cached.title,
          dependencies: cached.dependencies,
          bundleUrl: cached.bundleUrl
        }
      });

      return;
    }
  }

  // Cache miss or forced regeneration - call API
  console.log('Cache miss, generating new artifact...');

  // ... existing API call logic ...

  // After successful generation, cache the result
  if (artifactData) {
    cacheArtifact(promptHash, {
      code: artifactData.code,
      type: artifactData.type,
      title: artifactData.title,
      dependencies: artifactData.dependencies,
      bundleUrl: artifactData.bundleUrl
    });
  }
};
```

#### Step 3: Add Cache Control UI (10 min)

**File**: `/Users/nick/Projects/llm-chat-site/src/components/ChatInterface.tsx`

**Add to settings menu or debug panel**:

```typescript
import { clearArtifactCache, getCacheStats } from '@/utils/artifactCache';

// In settings dropdown
const [cacheStats, setCacheStats] = useState(getCacheStats());

<DropdownMenuItem onClick={() => {
  clearArtifactCache();
  setCacheStats(getCacheStats());
  toast({ title: 'Cache cleared' });
}}>
  Clear Artifact Cache ({cacheStats.count} items)
</DropdownMenuItem>

<DropdownMenuItem disabled>
  Cache size: {(cacheStats.totalSize / 1024).toFixed(1)}KB
</DropdownMenuItem>
```

**Add force regeneration button** to artifact container:

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleGenerateArtifact(prompt, true)} // force=true
>
  <RefreshCw className="h-3 w-3 mr-1" />
  Force Regenerate
</Button>
```

### Files to Create

- `/Users/nick/Projects/llm-chat-site/src/utils/artifactCache.ts`

### Files to Modify

- `/Users/nick/Projects/llm-chat-site/src/hooks/useChatMessages.tsx`
- `/Users/nick/Projects/llm-chat-site/src/components/ChatInterface.tsx`

### Testing Checklist

- [ ] **Caching logic**:
  - [ ] Generate artifact twice with same prompt → second uses cache
  - [ ] Different prompts → different cache keys
  - [ ] Cache hit logs to console
  - [ ] Cache miss triggers API call

- [ ] **Expiry**:
  - [ ] Mock 24h+ old timestamp → cache miss
  - [ ] Fresh cache (<24h) → cache hit

- [ ] **Eviction**:
  - [ ] Fill cache to 50+ items → oldest evicted
  - [ ] Verify FIFO eviction order

- [ ] **Force regeneration**:
  - [ ] Force button bypasses cache
  - [ ] Result updates cache with new data

- [ ] **Storage**:
  - [ ] Check localStorage for cached items
  - [ ] Verify JSON format correct
  - [ ] Cache survives page reload

### Acceptance Criteria

- [ ] Identical requests served from cache (<100ms)
- [ ] Cache respects 24h TTL
- [ ] Force regeneration option available
- [ ] Cache statistics visible in settings
- [ ] Clear cache option works
- [ ] Max 50 cached artifacts (LRU eviction)
- [ ] No errors when localStorage full
- [ ] Cache hit rate >30% in normal usage

### Rollback Considerations

**Rollback difficulty**: Very Easy
**Rollback steps**:
1. Remove cache check from useChatMessages
2. Remove cache utility import
3. Users can clear cache manually if desired

**Data concerns**: None - localStorage only, no server changes

**Monitoring**: Track cache hit rate to verify value:
```typescript
// Add analytics event
const cacheHitRate = cacheHits / totalRequests;
// Target: >30% hit rate
```

---

# Implementation Order & Dependencies

## Recommended Sequence

### Phase 3 (Must complete in order)

1. **Task 3.1** → **Task 3.2** → **Task 3.3**
   - 3.1 has no dependencies
   - 3.2 uses SSE infrastructure (can run parallel with 3.1 if needed)
   - 3.3 is independent, can run anytime

### Phase 4 (Can parallelize)

1. **Task 4.1** (highest value, independent)
2. **Task 4.2** (independent, but benefits from 4.1 analytics)
3. **Task 4.3** (lowest priority, independent)

## Dependency Graph

```
Phase 1 (Critical Fixes) → Phase 2 (Reliability)
                              ↓
                         Phase 3 (UX)
                              ↓
                         Phase 4 (Optimization)

Within Phase 3:
3.1 ──────────→ (none)
3.2 ──────────→ (optional: 2.1 for SSE patterns)
3.3 ──────────→ (none)

Within Phase 4:
4.1 ──────────→ (none)
4.2 ──────────→ (optional: 4.1 for usage data)
4.3 ──────────→ (none)
```

## Parallel Execution Options

**Maximum parallelization**:
- Phase 3: Run 3.1 + 3.3 in parallel (different files)
- Phase 4: Run all three tasks in parallel (independent)

**Conservative approach**:
- Complete Phase 3 sequentially (1.5h + 1h + 0.5h = 3h)
- Complete Phase 4 sequentially (2h + 1h + 0.75h = 3.75h)

---

# Risk Assessment

## Phase 3 Risks

### Task 3.1: Storage URL Expiry

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Increased storage costs | Medium | Low | Monitor costs for 1 week, revert if >10% increase |
| URL refresh failures | Low | Medium | Graceful fallback to re-bundle |
| Edge case: timezone bugs | Low | Low | Use UTC timestamps consistently |

**Overall Risk**: **Low**

### Task 3.2: Bundle Progress Events

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SSE connection drops | Medium | Low | Client handles gracefully, retries |
| Memory leak from EventSource | Low | Medium | Proper cleanup in useEffect |
| Backward compatibility break | Low | High | Keep non-SSE fallback |

**Overall Risk**: **Medium** (but easy rollback)

### Task 3.3: Animation Optimization

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Visual regression | Low | Low | Side-by-side comparison testing |
| Browser compatibility | Low | Low | Test in Chrome, Firefox, Safari |

**Overall Risk**: **Very Low**

## Phase 4 Risks

### Task 4.1: Pre-bundle Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bundle version conflicts | Medium | High | Strict version pinning in manifest |
| Storage egress costs | Medium | Medium | Monitor costs, use CDN if needed |
| Stale bundles (security) | Medium | High | Monthly rebuild process |
| Build script failures | Low | Low | Manual fallback to dynamic bundling |

**Overall Risk**: **Medium** (requires monitoring)

### Task 4.2: Token-Based Rate Limiting

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Estimation inaccurate | High | Medium | Conservative estimates, monitor actuals |
| False positives (blocking legitimate users) | Medium | High | Generous limits, easy override for support |
| Database performance | Low | Low | Proper indexes, tested queries |

**Overall Risk**: **Medium** (requires tuning)

### Task 4.3: Artifact Caching

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| localStorage quota exceeded | Medium | Low | LRU eviction, try/catch |
| Cache staleness | Low | Low | 24h TTL, force regenerate option |
| Hash collisions | Very Low | Low | SHA-256 is collision-resistant |

**Overall Risk**: **Low**

---

# Rollback Strategy

## General Rollback Process

1. **Identify issue**: Monitor error rates, user reports
2. **Assess impact**: Is it breaking or just degraded UX?
3. **Execute rollback**: Git revert + redeploy (or feature flag)
4. **Verify**: Test in staging, deploy to prod
5. **Post-mortem**: Document what went wrong

## Task-Specific Rollback Plans

### Phase 3

| Task | Rollback Time | Data Loss | Steps |
|------|--------------|-----------|-------|
| 3.1 | 5 min | None | Revert expiresIn to 3600 |
| 3.2 | 10 min | None | Remove SSE code, keep fallback |
| 3.3 | 2 min | None | Revert animation variants |

### Phase 4

| Task | Rollback Time | Data Loss | Steps |
|------|--------------|-----------|-------|
| 4.1 | 15 min | None | Remove prebuilt lookup, keep manifest for future |
| 4.2 | 20 min | Token usage history lost | Drop table, revert rate limiter |
| 4.3 | 2 min | Cached artifacts lost | Users clear localStorage |

## Feature Flags (Recommended)

For Phase 4 tasks, consider adding feature flags:

```typescript
// .env or Supabase secrets
ENABLE_PREBUILT_BUNDLES=true
ENABLE_TOKEN_RATE_LIMITING=false
ENABLE_ARTIFACT_CACHING=true
```

This allows instant rollback without code deployment.

---

# Success Metrics

## Phase 3 Metrics

### Task 3.1: Storage URL Expiry

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Expired artifact errors | ~20% of returning users | <2% | Error logs, user reports |
| Storage costs (monthly) | Baseline | <+10% | Supabase dashboard |
| Average URL lifetime | 1 hour | 24 hours | Database query |

**Query**:
```sql
SELECT AVG(EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600) as avg_hours
FROM artifact_bundles
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Task 3.2: Bundle Progress Events

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Perceived wait time | Feels like 10s | Feels like 5s | User survey |
| Bounce rate during bundling | Unknown | <5% | Analytics |
| SSE success rate | N/A | >95% | Server logs |

### Task 3.3: Animation Optimization

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Frame rate | Unknown | 60fps | Chrome DevTools |
| Layout recalculations | High | <10 per animation | Performance profiler |
| CPU usage | Baseline | -20% | DevTools Performance |

## Phase 4 Metrics

### Task 4.1: Pre-bundle Dependencies

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Average bundle time | ~10s | <2s | Server timing logs |
| Prebuilt hit rate | 0% | >80% | Analytics |
| Bundle errors | Baseline | No increase | Error logs |
| Storage costs | Baseline | Monitor | Supabase dashboard |

**Success threshold**: If prebuilt hit rate >80% and bundle time <2s for common deps, this is a huge win.

### Task 4.2: Token-Based Rate Limiting

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| False positive rate | N/A | <1% | Support tickets |
| Rate limit violations | Baseline | Track by complexity | Database query |
| User fairness | N/A | Complex users use more quota | Token usage distribution |

### Task 4.3: Artifact Caching

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Cache hit rate | 0% | >30% | Client analytics |
| API cost savings | $0 | >$50/month | API usage logs |
| User regenerate rate | Unknown | <10% | Click tracking |

---

## Phase Completion Checklist

### Phase 3 Complete When:

- [ ] All 3 tasks tested and deployed
- [ ] No increase in error rates (monitor 48h)
- [ ] Storage costs within budget
- [ ] User feedback positive or neutral
- [ ] Documentation updated

### Phase 4 Complete When:

- [ ] All 3 tasks tested and deployed
- [ ] Metrics show expected improvements
- [ ] No false positives in rate limiting
- [ ] Prebuilt bundles cover top packages
- [ ] Cache hit rate >20% (initial threshold)
- [ ] Cost savings measurable

---

**Document Version**: 1.0
**Last Updated**: 2025-12-01
**Ready for Implementation**: Yes
