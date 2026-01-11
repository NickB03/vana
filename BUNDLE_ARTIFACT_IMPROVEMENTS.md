# Bundle Artifact Improvements (Alternative to E2B)

## Goal
Enhance existing `bundle-artifact` Edge Function instead of migrating to E2B.

## Implementation Status

### ✅ Completed Features

| Feature | Status | Files | KPI Impact |
|---------|--------|-------|------------|
| Database Tables | ✅ Complete | `20260110000000_bundle_caching_tables.sql` | Foundation for caching |
| CDN URL Caching | ✅ Complete | `cdn-cache.ts` | 24hr TTL reduces CDN checks ~3s → ~50ms |
| Bundle Hash Caching | ✅ Complete | `bundle-cache.ts` | 4-week TTL, SHA-256 content hash |
| SSE Streaming Backend | ✅ Complete | `bundle-artifact/index.ts` | Real-time progress (validate→fetch→bundle→upload) |
| SSE Frontend Integration | ✅ Complete | `artifactBundler.ts`, `BundleProgressIndicator.tsx` | Progress UI during 2-5s bundling |
| Metrics Recording | ✅ Complete | `bundle-metrics.ts` | Tracks cache hit rate, bundle time, CDN provider |
| Integration Tests | ✅ Complete | `useBundleArtifact.integration.test.ts` | 5 tests covering cache, SSE, metrics |

### 🔧 Code Quality Improvements

| Improvement | Status | Impact |
|-------------|--------|--------|
| Refactored duplication | ✅ Fixed | Reduced `bundle-artifact/index.ts` by 280 lines (18%) |
| Added schema versioning | ✅ Fixed | Cache invalidation when bundler logic changes |
| Added metrics retention | ✅ Fixed | 90-day cleanup prevents unbounded growth |
| Added FK constraints | ✅ Fixed | Data integrity for session_id → chat_sessions |
| Fixed memory leaks | ✅ Fixed | Stream reader cleanup in finally block |
| Improved SSE parsing | ✅ Fixed | Robust line-by-line parsing vs fragile regex |

### 📊 Target KPIs

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Bundle Time (P95) | < 1.5s | ~2-5s (baseline) | 🟡 Measurement in progress |
| Cache Hit Rate | > 30% | 0% (new feature) | 🟡 Need production data |
| Success Rate | > 98% | ~90% (baseline) | 🟡 CDN fallback improved |

**Note**: KPI tracking requires production deployment and 30-day measurement period.

## Implementation Details

### Content-Addressed Caching

**Hash Algorithm**: SHA-256 via Web Crypto API
**Hash Inputs**: `v{SCHEMA_VERSION}|{code}|{sorted_dependencies}|{reactMode}|{title}`

**Cache Behavior**:
- Identical code + dependencies → same hash → instant cache hit
- Different dependency versions → different hash → fresh bundle
- Schema version bump → invalidates all cached bundles

### SSE Streaming Architecture

**Progress Stages**:
1. **validate** (10%) - Input validation
2. **cache-check** (20%) - Hash lookup in bundle_cache
3. **fetch** (40%) - CDN package resolution
4. **bundle** (70%) - Code transformation + HTML generation
5. **upload** (90%) - Storage upload
6. **complete** (100%) - Success with bundle URL

**Early Exit**: Cache hit at stage 2 skips stages 3-5, returns immediately.

### Metrics & Analytics

**Fire-and-Forget Pattern**: Metrics recording never blocks the main bundling path.

**Tracked Metrics**:
- `bundle_time_ms` - End-to-end bundling duration
- `cache_hit` - Boolean flag for cache utilization
- `cdn_provider` - Which CDN was used (esm.sh, esm.run, jsdelivr)
- `bundle_size` - Final HTML size in bytes
- `dependency_count` - Number of npm packages bundled
- `fallback_used` - Whether CDN fallback was needed

**Retention**: 90-day automatic cleanup via `cleanup_expired_caches()` function.

## Current Strengths (Keep These)
- ✅ Deno native bundler (fast, no WASM overhead)
- ✅ Multi-CDN fallback (esm.sh → esm.run → jsdelivr)
- ✅ React shims for UMD compatibility
- ✅ Rate limiting and auth
- ✅ Supabase Storage integration

## Proposed Enhancements

### 1. Dependency CDN Caching (High Impact, Low Effort)
**Problem**: Re-fetches packages from esm.sh every request
**Solution**: Cache CDN URLs in Supabase table with 24-hour TTL

```sql
-- New table: cdn_package_cache
CREATE TABLE cdn_package_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  cdn_url TEXT NOT NULL,
  cdn_provider TEXT NOT NULL, -- 'esm.sh' | 'esm.run' | 'jsdelivr'
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_name, version)
);

-- Index for fast lookups
CREATE INDEX idx_cdn_package_lookup ON cdn_package_cache(package_name, version);

-- Auto-cleanup old entries (> 7 days)
CREATE INDEX idx_cdn_cache_cleanup ON cdn_package_cache(cached_at);
```

**Implementation**:
```typescript
// supabase/functions/_shared/cdn-cache.ts
export async function getCachedPackageUrl(
  pkg: string,
  version: string
): Promise<string | null> {
  const { data } = await supabase
    .from('cdn_package_cache')
    .select('cdn_url')
    .eq('package_name', pkg)
    .eq('version', version)
    .gte('cached_at', new Date(Date.now() - 24 * 60 * 60 * 1000))
    .single();

  return data?.cdn_url || null;
}

export async function cachePackageUrl(
  pkg: string,
  version: string,
  cdnUrl: string,
  provider: string
): Promise<void> {
  await supabase.from('cdn_package_cache').upsert({
    package_name: pkg,
    version: version,
    cdn_url: cdnUrl,
    cdn_provider: provider,
    last_verified_at: new Date().toISOString()
  });
}
```

**Impact**:
- Reduces CDN health checks from 3s to ~50ms
- Decreases bundling time from 2-5s to 1-2s

---

### 2. Streaming Progress Updates (Medium Impact, Medium Effort)
**Problem**: User sees loading spinner for 2-5s with no feedback
**Solution**: Stream SSE events during bundling

```typescript
// bundle-artifact/index.ts
async function bundleWithProgress(
  code: string,
  dependencies: Record<string, string>
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // Stage 1: Validating dependencies
        controller.enqueue(encoder.encode('event: progress\n'));
        controller.enqueue(encoder.encode('data: {"stage":"validate","message":"Validating dependencies...","progress":20}\n\n'));

        // Stage 2: Fetching from CDN
        controller.enqueue(encoder.encode('event: progress\n'));
        controller.enqueue(encoder.encode('data: {"stage":"fetch","message":"Fetching packages from CDN...","progress":40}\n\n'));

        // Stage 3: Bundling code
        controller.enqueue(encoder.encode('event: progress\n'));
        controller.enqueue(encoder.encode('data: {"stage":"bundle","message":"Bundling with Deno...","progress":60}\n\n'));

        const result = await actualBundleLogic(code, dependencies);

        // Stage 4: Uploading to storage
        controller.enqueue(encoder.encode('event: progress\n'));
        controller.enqueue(encoder.encode('data: {"stage":"upload","message":"Uploading to storage...","progress":80}\n\n'));

        // Complete
        controller.enqueue(encoder.encode('event: complete\n'));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode('event: error\n'));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({error: error.message})}\n\n`));
        controller.close();
      }
    }
  });
}
```

**Frontend Integration**:
```typescript
// src/hooks/useChatMessages.tsx
const bundleArtifactWithProgress = async (
  code: string,
  dependencies: Record<string, string>,
  onProgress: (progress: BundleProgress) => void
) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/bundle-artifact`, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({ code, dependencies })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        onProgress(data);
      }
    }
  }
};
```

**Impact**: Better UX, perceived performance improvement

---

### 3. Smart Fallback to Sandpack (High Impact, Low Effort)
**Problem**: If bundling fails, artifact is broken
**Solution**: Auto-fallback to Sandpack (already installed!)

```typescript
// src/components/ArtifactRenderer.tsx
export const ArtifactRenderer = ({ code, dependencies, type }) => {
  const [bundleResult, setBundleResult] = useState<BundleResult | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);

  useEffect(() => {
    // Try server bundling first
    bundleArtifact(code, dependencies)
      .then(setBundleResult)
      .catch(error => {
        console.warn('[ArtifactRenderer] Server bundling failed, falling back to Sandpack', error);
        setBundleError(error.message);
      });
  }, [code, dependencies]);

  // Fallback to Sandpack if bundling fails
  if (bundleError) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-yellow-600 dark:text-yellow-400 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          Server bundling failed. Running in sandbox mode...
        </div>
        <Sandpack
          template="react"
          files={{
            '/App.tsx': code,
            '/package.json': JSON.stringify({ dependencies })
          }}
          options={{
            showNavigator: false,
            showLineNumbers: true,
            editorHeight: '500px'
          }}
        />
      </div>
    );
  }

  // Normal bundled artifact
  if (bundleResult) {
    return <iframe src={bundleResult.bundleUrl} />;
  }

  return <LoadingSpinner />;
};
```

**Impact**:
- Near 100% artifact success rate (Sandpack as safety net)
- No code changes to bundling logic

---

### 4. Prebuilt Bundle Cache (Medium Impact, High Effort)
**Problem**: Rebuild identical artifacts multiple times
**Solution**: Hash-based bundle caching

```sql
-- New table: prebuilt_bundles
CREATE TABLE prebuilt_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL,
  dependencies_hash TEXT NOT NULL,
  bundle_url TEXT NOT NULL,
  bundle_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code_hash, dependencies_hash)
);

CREATE INDEX idx_bundle_lookup ON prebuilt_bundles(code_hash, dependencies_hash);
```

**Implementation** (already partially exists in `getPrebuiltBundles`):
```typescript
// Enhance existing function at bundle-artifact/index.ts:8
import { createHash } from 'node:crypto';

function hashCode(code: string, dependencies: Record<string, string>): string {
  const hash = createHash('sha256');
  hash.update(code);
  hash.update(JSON.stringify(dependencies));
  return hash.digest('hex');
}

async function getCachedBundle(
  code: string,
  dependencies: Record<string, string>
): Promise<string | null> {
  const codeHash = hashCode(code, dependencies);

  const { data } = await supabase
    .from('prebuilt_bundles')
    .select('bundle_url')
    .eq('code_hash', codeHash.slice(0, 16))
    .eq('dependencies_hash', codeHash.slice(16))
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7-day TTL
    .single();

  if (data) {
    // Update hit stats
    await supabase
      .from('prebuilt_bundles')
      .update({
        hit_count: supabase.raw('hit_count + 1'),
        last_accessed_at: new Date().toISOString()
      })
      .eq('code_hash', codeHash.slice(0, 16));
  }

  return data?.bundle_url || null;
}
```

**Impact**:
- Instant loading for repeated artifacts (demos, examples)
- Saves CDN bandwidth

---

## Implementation Priority

### Phase 1 (Week 1): Quick Wins ✅
- [x] Enhancement #3: Sandpack fallback (4 hours)
- [x] Enhancement #1: CDN caching (8 hours)

### Phase 2 (Week 2): User Experience ✅
- [x] Enhancement #2: Streaming progress (16 hours)
- [x] Enhancement #4: Bundle caching (16 hours)

### Phase 3 (Optional): Advanced Features
- [ ] Pre-warm CDN cache for popular packages (recharts, lucide-react)
- [ ] Add "Ask AI to Fix" for bundling errors
- [ ] Implement parallel CDN fetching (race all 3 CDNs simultaneously)

---

## Phase 2 Implementation Details

### Files Created/Modified

**Database Migration:**
- `supabase/migrations/20260110000000_bundle_caching_tables.sql`
  - `cdn_package_cache` - CDN URL cache with 24-hour TTL, includes `is_bundle` flag
  - `bundle_cache` - Content-addressed bundle cache with 4-week TTL
  - `artifact_bundle_metrics` - Analytics for monitoring improvements
  - `cleanup_expired_caches()` - Scheduled cleanup function

**Backend Utilities:**
- `supabase/functions/_shared/cdn-cache.ts` - CDN URL caching with bundle/standard distinction
- `supabase/functions/_shared/bundle-cache.ts` - SHA-256 content hashing and bundle caching
- `supabase/functions/_shared/bundle-metrics.ts` - Fire-and-forget metrics recording
- `supabase/functions/_shared/sse-stream.ts` - SSE streaming utilities

**Bundle Artifact Updates:**
- `supabase/functions/bundle-artifact/index.ts`
  - Added `streaming?: boolean` to request interface
  - New `bundleWithProgress()` function for SSE streaming
  - Bundle cache lookup before processing
  - Metrics recording after successful bundles

**Frontend:**
- `src/types/bundleProgress.ts` - Shared types for SSE events
- `src/utils/artifactBundler.ts` - Added `bundleArtifactWithProgress()` function
- `src/components/BundleProgressIndicator.tsx` - Progress UI component

### SSE Event Format

```
event: progress
data: {"stage":"validate","message":"Validating...","progress":10}

event: progress
data: {"stage":"cache-check","message":"Checking cache...","progress":20}

event: progress
data: {"stage":"fetch","message":"Resolving packages...","progress":40}

event: progress
data: {"stage":"bundle","message":"Bundling code...","progress":70}

event: progress
data: {"stage":"upload","message":"Uploading bundle...","progress":90}

event: complete
data: {"success":true,"bundleUrl":"...","bundleTime":1234,"cacheHit":false,...}
```

### Cache Key Design

**CDN Cache:** `(package_name, version, is_bundle)` → CDN URL
- Separate entries for bundle vs standard URLs (fixes esm.sh ?bundle flag issue)
- 24-hour TTL

**Bundle Cache:** `content_hash` → Storage path + signed URL
- SHA-256 of `code + sorted(dependencies)`
- 4-week TTL
- Regenerates signed URLs on cache hit

---

## Cost Comparison

### Current System (After Enhancements)
- Deno Edge Functions: Free tier (500K invocations/month)
- Supabase Storage: $0.021/GB stored (bundles ~100KB avg)
- CDN bandwidth: Free (public CDNs)
- **Total**: ~$5-10/month for 10K artifacts

### E2B Alternative
- E2B sandboxes: $0.05/hour × 3s avg = $0.000042 per artifact
- Gemini 3 Flash: $0.003 per artifact
- **Total**: ~$30-50/month for 10K artifacts

**Savings**: 3-5x cheaper to optimize existing system

---

## Success Metrics

Track these to validate improvements:

```sql
-- Add to analytics
CREATE TABLE artifact_bundle_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id),
  bundle_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  cdn_provider TEXT,
  bundle_size INTEGER,
  fallback_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Target KPIs**:
- Bundle time: < 1.5s (P95) — down from current 2-5s
- Cache hit rate: > 30% within first month
- Fallback rate: < 5% (Sandpack safety net)
- Success rate: > 98% (up from current ~90%)

---

## Testing Strategy

### Unit Tests
- **CDN Cache**: 13 tests in `cdn-cache.test.ts` (24hr TTL, upsert behavior)
- **Bundle Cache**: 13 tests in `bundle-cache.test.ts` (SHA-256 hashing, schema versioning)

### Integration Tests
- **Location**: `src/hooks/__tests__/useBundleArtifact.integration.test.ts`
- **Coverage**: 5 comprehensive tests
  1. CDN cache behavior (24hr TTL validation)
  2. Bundle cache hits (content hash matching)
  3. SSE streaming (progress events validation)
  4. Metrics recording (fire-and-forget verification)
  5. Cache performance (speed comparison)

**Command**: `npm run test:integration` (requires `supabase start`)

### Manual Testing Checklist

- [ ] Bundle artifact with npm dependencies (react, recharts, etc.)
- [ ] Verify progress indicator shows during bundling
- [ ] Bundle identical artifact again → verify cache hit (instant load)
- [ ] Check `artifact_bundle_metrics` table for recorded metrics
- [ ] Verify CDN cache in `cdn_package_cache` table
- [ ] Test bundle rendering in browser (open bundled artifact)

---

## Known Limitations

### Current Constraints

1. **Browser Compatibility**: SSE streaming requires modern browsers (Chrome 13+, Firefox 6+, Safari 5+)
2. **Rate Limiting**: Guest users limited to 20 bundles per 5 hours
3. **Cache Storage**: No LRU eviction policy (relies on TTL expiration only)
4. **Metrics Sampling**: All requests recorded (no sampling for high volume)

### Future Enhancements

1. **Heartbeat Mechanism**: Add SSE keepalive to prevent timeout during long CDN lookups
2. **Client Disconnection**: Abort bundling when client disconnects mid-stream
3. **LRU Eviction**: Implement Least Recently Used eviction for bundle cache
4. **Metrics Sampling**: Add configurable sampling rate for high-volume scenarios
