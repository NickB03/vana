# Error Handling Audit Report: PR #509 - Bundle Artifact Improvements

**Auditor**: Error Handling Specialist
**Date**: 2026-01-11
**PR**: feature/bundle-artifact-improvements
**Scope**: SSE streaming, caching, async operations, database failures

---

## Executive Summary

This PR introduces SSE streaming, multi-layer caching (bundle cache + CDN cache), and async fire-and-forget metrics recording. The audit identified **23 error handling issues** ranging from CRITICAL silent failures to missing error context. While some patterns follow best practices, several critical areas allow errors to be swallowed without user notification.

**Critical Findings**: 6
**High Severity**: 9
**Medium Severity**: 8

---

## CRITICAL ISSUES

### 1. SSE Stream Reader Never Released on Parse Error (CRITICAL)

**Location**: `src/utils/artifactBundler.ts:312-325`

**Issue**: JSON parse errors inside the SSE event loop can throw exceptions that bypass the `finally` block's reader cleanup. The `continue` statement after logging means execution stays in the loop, but if a parse error throws (which it does), the exception escapes the try-catch.

```typescript
for (const event of events) {
  if (!event.trim()) continue;

  // ...

  if (eventMatch && dataMatch) {
    try {
      const eventType = eventMatch[1];
      const data = JSON.parse(dataMatch[1]);  // ❌ Can throw, bypassing finally

      if (eventType === 'progress') {
        onProgress(data as BundleProgress);
      } else if (eventType === 'complete') {
        result = data as BundleComplete;
      } else if (eventType === 'error') {
        result = data as StreamBundleError;
      }
    } catch (e) {
      console.error('[SSE] Failed to parse event data:', e);  // ❌ Logs but continues loop
    }
  }
}
```

**Hidden Errors**:
- Malformed JSON from server (corrupted network data)
- Unicode encoding errors in event payload
- Out-of-memory errors from extremely large event payloads
- Any unexpected exception from `onProgress()` callback

**User Impact**:
- Browser keeps the connection open indefinitely (memory leak)
- UI shows infinite loading spinner
- User must manually refresh page
- No error message explaining what went wrong

**Recommendation**:
```typescript
for (const event of events) {
  if (!event.trim()) continue;

  if (eventMatch && dataMatch) {
    try {
      const eventType = eventMatch[1];
      const data = JSON.parse(dataMatch[1]);

      // Validate event type before processing
      if (!['progress', 'complete', 'error'].includes(eventType)) {
        console.warn(`[SSE] Unknown event type: ${eventType}, ignoring`);
        continue;
      }

      if (eventType === 'progress') {
        onProgress(data as BundleProgress);
      } else if (eventType === 'complete') {
        result = data as BundleComplete;
      } else if (eventType === 'error') {
        result = data as StreamBundleError;
        break; // Exit loop on error event
      }
    } catch (e) {
      // ERROR: Parse failure means server sent corrupted data
      // This should terminate the stream, not continue silently
      console.error('[SSE] Failed to parse event data:', e);

      // Set error result and break - don't keep trying to parse bad data
      result = {
        success: false,
        error: 'Server sent malformed data',
        details: e instanceof Error ? e.message : String(e)
      };
      break; // Exit loop to trigger cleanup
    }
  }
}
```

---

### 2. Bundle Cache Write Failures Silently Ignored (CRITICAL)

**Location**: `supabase/functions/_shared/bundle-cache.ts:213-217`

**Issue**: Cache write failures are logged but don't surface to the user or affect the bundling operation. This creates a degraded experience where users don't know their bundles aren't being cached.

```typescript
if (error) {
  console.error(`[${requestId}] Bundle cache write failed:`, error.message);
} else {
  console.log(`[${requestId}] Bundle cached successfully`);
}
// ❌ Function returns void - caller has no idea cache failed
```

**Hidden Errors**:
- Database connection failures (Supabase down)
- Unique constraint violations not caught by code logic
- Permission errors (service role key expired/invalid)
- Disk quota exceeded errors
- Network timeouts to database

**User Impact**:
- Subsequent identical bundles take 2-5s instead of instant cache hits
- No indication to user that caching is failing
- Analytics data (hit_count) becomes unreliable
- Cost implications (more bundling operations = more compute)

**Recommendation**:
```typescript
export async function storeBundleCache(
  supabase: SupabaseClient,
  contentHash: string,
  storagePath: string,
  bundleUrl: string,
  bundleSize: number,
  dependencyCount: number,
  requestId: string
): Promise<{ success: boolean; error?: string }> {  // ✅ Return status
  // ... existing logic ...

  if (error) {
    const errorMsg = `Bundle cache write failed: ${error.message}`;
    console.error(`[${requestId}] ${errorMsg}`);

    // ✅ Return error to caller so they can decide whether to:
    // 1. Log to Sentry for alerting
    // 2. Show warning to user (non-blocking)
    // 3. Retry the cache write
    return { success: false, error: errorMsg };
  } else {
    console.log(`[${requestId}] Bundle cached successfully`);
    return { success: true };
  }
}
```

Then in caller (`bundle-artifact/index.ts:726-734`):
```typescript
// ✅ Check cache write result and log to Sentry if it fails
const cacheResult = await storeBundleCache(
  supabase,
  contentHash,
  storagePath,
  uploadResult.url,
  htmlSize,
  Object.keys(dependencies).length,
  requestId
).catch((err) => {
  console.error(`[${requestId}] Cache store failed:`, err);
  return { success: false, error: String(err) };
});

if (!cacheResult.success) {
  // ✅ Log to Sentry for alerting - caching failures need investigation
  logError({
    error: new Error(`Bundle cache write failed: ${cacheResult.error}`),
    context: { requestId, contentHash: contentHash.slice(0, 16) },
    errorId: 'bundle_cache_write_failure'
  });
}
```

---

### 3. CDN Cache Database Failures Return Null Without Logging (CRITICAL)

**Location**: `supabase/functions/_shared/cdn-cache.ts:61-64`

**Issue**: Catch block returns `null` for ALL errors, making CDN cache failures indistinguishable from cache misses. This masks database outages and configuration errors.

```typescript
} catch (error) {
  console.error(`[${requestId}] CDN cache lookup failed:`, error);  // ❌ Generic error log
  return null;  // ❌ Same return as "not cached" - no way to tell difference
}
```

**Hidden Errors**:
- Supabase connection failures (service down)
- Invalid credentials (SUPABASE_SERVICE_ROLE_KEY missing/expired)
- Table doesn't exist (migration not run)
- Query syntax errors
- Network timeouts

**User Impact**:
- Every bundle request hits CDN health checks (adds 3s per package)
- User experiences 3-10s delays instead of 50ms cache hits
- Database issues go unnoticed until someone investigates slow bundling
- No alerting when CDN cache system is completely broken

**Recommendation**:
```typescript
export async function getCachedPackageUrl(
  pkg: string,
  version: string,
  requestId: string,
  isBundle = false
): Promise<{ url: string; provider: string } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    // ✅ This is expected in some environments, log at warn level
    console.warn(`[${requestId}] CDN cache: Missing Supabase config, cache disabled`);
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const cutoffTime = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("cdn_package_cache")
      .select("cdn_url, cdn_provider")
      .eq("package_name", pkg)
      .eq("version", version)
      .eq("is_bundle", isBundle)
      .gte("cached_at", cutoffTime)
      .single();

    if (error) {
      // ✅ Distinguish between "not found" and "database error"
      if (error.code === 'PGRST116') {
        // Not found - this is expected, no logging needed
        return null;
      }

      // ✅ CRITICAL: Log database errors with full context
      console.error(
        `[${requestId}] CDN cache lookup failed for ${pkg}@${version}:`,
        `code=${error.code}, message=${error.message}`
      );

      // ✅ TODO: Add Sentry logging here for production alerting
      // logError({
      //   error: new Error(`CDN cache database error: ${error.message}`),
      //   context: { pkg, version, errorCode: error.code, requestId },
      //   errorId: 'cdn_cache_database_error'
      // });

      return null;
    }

    if (!data) {
      return null;
    }

    const urlType = isBundle ? "bundle" : "standard";
    console.log(`[${requestId}] CDN cache HIT: ${pkg}@${version} (${urlType}) from ${data.cdn_provider}`);
    return { url: data.cdn_url, provider: data.cdn_provider };

  } catch (error) {
    // ✅ Catch should only happen for unexpected errors (network, JSON parse, etc.)
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[${requestId}] CDN cache unexpected error for ${pkg}@${version}:`,
      errorMsg
    );

    // ✅ TODO: Add Sentry logging for unexpected errors
    // logError({
    //   error: error instanceof Error ? error : new Error(String(error)),
    //   context: { pkg, version, requestId },
    //   errorId: 'cdn_cache_unexpected_error'
    // });

    return null;
  }
}
```

---

### 4. Fire-and-Forget Metrics Recording Hides All Failures (CRITICAL)

**Location**: `supabase/functions/_shared/bundle-metrics.ts:25-60`

**Issue**: The entire function is fire-and-forget with errors only logged to console. Metrics failures are completely invisible to monitoring systems.

```typescript
export async function recordBundleMetrics(
  metrics: BundleMetric,
  requestId: string
): Promise<void> {  // ❌ Returns void - caller has no idea if it worked
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return;  // ❌ Silent failure - no way to know metrics aren't being recorded
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('artifact_bundle_metrics')
      .insert({
        artifact_id: metrics.artifactId,
        session_id: metrics.sessionId,
        bundle_time_ms: metrics.bundleTimeMs,
        cache_hit: metrics.cacheHit,
        cdn_provider: metrics.cdnProvider,
        bundle_size: metrics.bundleSize,
        fallback_used: metrics.fallbackUsed,
        dependency_count: metrics.dependencyCount
      });

    if (error) {
      console.error(`[${requestId}] Metrics recording failed:`, error.message);
      // ❌ No alerting, no retry, no indication to caller
    } else {
      console.log(`[${requestId}] Metrics recorded: ${metrics.bundleTimeMs}ms, cache=${metrics.cacheHit}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Metrics error:`, error);
    // ❌ Completely swallows all errors
  }
}
```

**Hidden Errors**:
- Table doesn't exist (migration failed)
- Column type mismatches (schema drift)
- Foreign key constraint violations (artifact_id doesn't exist)
- Disk quota exceeded
- Database connection pool exhausted
- Invalid UUID format in artifact_id/session_id

**User Impact**:
- Analytics dashboards show incomplete/missing data
- No visibility into bundle performance trends
- Can't detect cache hit rate degradation
- Business decisions made on bad data
- No alerting when metrics system is completely broken

**Recommendation**:
```typescript
export async function recordBundleMetrics(
  metrics: BundleMetric,
  requestId: string
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    // ✅ Log at ERROR level - this is a configuration problem that needs fixing
    console.error(
      `[${requestId}] CRITICAL: Cannot record metrics - Supabase config missing. ` +
      `Metrics will be lost for artifact ${metrics.artifactId}`
    );

    // ✅ TODO: Add Sentry logging for configuration errors
    // logError({
    //   error: new Error('Bundle metrics disabled: missing Supabase configuration'),
    //   context: { requestId, artifactId: metrics.artifactId },
    //   errorId: 'bundle_metrics_config_error'
    // });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('artifact_bundle_metrics')
      .insert({
        artifact_id: metrics.artifactId,
        session_id: metrics.sessionId,
        bundle_time_ms: metrics.bundleTimeMs,
        cache_hit: metrics.cacheHit,
        cdn_provider: metrics.cdnProvider,
        bundle_size: metrics.bundleSize,
        fallback_used: metrics.fallbackUsed,
        dependency_count: metrics.dependencyCount
      });

    if (error) {
      // ✅ Include full error context for debugging
      console.error(
        `[${requestId}] Metrics recording failed:`,
        `code=${error.code}, message=${error.message}, ` +
        `artifact=${metrics.artifactId}, session=${metrics.sessionId}`
      );

      // ✅ TODO: Add Sentry logging with error severity
      // logError({
      //   error: new Error(`Failed to record bundle metrics: ${error.message}`),
      //   context: {
      //     requestId,
      //     errorCode: error.code,
      //     artifactId: metrics.artifactId,
      //     sessionId: metrics.sessionId,
      //     bundleTimeMs: metrics.bundleTimeMs
      //   },
      //   errorId: 'bundle_metrics_insert_error'
      // });
    } else {
      console.log(`[${requestId}] Metrics recorded: ${metrics.bundleTimeMs}ms, cache=${metrics.cacheHit}`);
    }
  } catch (error) {
    // ✅ Log unexpected errors with full context
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[${requestId}] Metrics unexpected error:`,
      errorMsg,
      `artifact=${metrics.artifactId}`
    );

    // ✅ TODO: Add Sentry logging for unexpected errors
    // logError({
    //   error: error instanceof Error ? error : new Error(String(error)),
    //   context: { requestId, artifactId: metrics.artifactId, metrics },
    //   errorId: 'bundle_metrics_unexpected_error'
    // });
  }
}
```

Also update callers to handle the fire-and-forget pattern explicitly:
```typescript
// In bundle-artifact/index.ts:661-669 and 747-756

// ✅ Explicit fire-and-forget with error handling
recordBundleMetrics({
  artifactId,
  sessionId,
  bundleTimeMs: Date.now() - startTime,
  cacheHit: true,
  bundleSize: cached.entry.bundle_size,
  fallbackUsed: false,
  dependencyCount: Object.keys(dependencies).length
}, requestId).catch((err) => {
  // ✅ This catch is important - without it, unhandled promise rejections
  // could crash the Edge Function runtime
  console.error(`[${requestId}] Async metrics recording threw:`, err);
});
```

---

### 5. Bundle Cache Lookup Signed URL Failure Returns Cache Miss (CRITICAL)

**Location**: `supabase/functions/_shared/bundle-cache.ts:129-132`

**Issue**: If generating a fresh signed URL fails, the function returns `{ hit: false }`, which causes a full rebundle instead of surfacing the actual problem (storage bucket misconfiguration).

```typescript
if (signError || !signedData?.signedUrl) {
  console.error(`[${requestId}] Failed to regenerate signed URL:`, signError?.message);
  return { hit: false };  // ❌ Treats storage error as cache miss
}
```

**Hidden Errors**:
- Storage bucket doesn't exist
- Storage bucket permissions misconfigured
- Service role key lacks storage access
- Network timeout to storage service
- Invalid storage path format

**User Impact**:
- User waits 2-5s for bundling when cached bundle exists
- Storage issues remain hidden until someone investigates performance
- Wastes compute resources rebundling identical artifacts
- Cache hit rate metrics become inaccurate

**Recommendation**:
```typescript
// Regenerate signed URL (signed URLs expire independently)
const expiresIn = 2419200; // 4 weeks in seconds
const { data: signedData, error: signError } = await supabase.storage
  .from("artifact-bundles")
  .createSignedUrl(entry.storage_path, expiresIn);

if (signError || !signedData?.signedUrl) {
  // ✅ CRITICAL: This is NOT a cache miss - it's a storage error
  console.error(
    `[${requestId}] CRITICAL: Failed to regenerate signed URL for cached bundle:`,
    `path=${entry.storage_path}, error=${signError?.message || 'no signed URL returned'}`
  );

  // ✅ TODO: Log to Sentry - storage errors need immediate attention
  // logError({
  //   error: signError || new Error('createSignedUrl returned no URL'),
  //   context: {
  //     requestId,
  //     storagePath: entry.storage_path,
  //     contentHash: contentHash.slice(0, 16)
  //   },
  //   errorId: 'bundle_cache_signed_url_failure'
  // });

  // ✅ Return error state so caller can decide: retry, use fallback, or surface error
  // For now, treat as cache miss to maintain service availability
  return { hit: false, error: signError?.message || 'Failed to generate signed URL' };
}
```

---

### 6. SSE Stream Send Errors Partially Swallowed (CRITICAL)

**Location**: `supabase/functions/_shared/sse-stream.ts:79-88` and `bundle-artifact/index.ts:620-634`

**Issue**: The `send()` function catches `TypeError` with specific message matching, which could miss other critical errors during stream write operations.

```typescript
const send = (event: string, data: unknown) => {
  if (streamClosed || !controller) {
    console.warn(`SSE stream closed, ignoring event: ${event}`);
    return;
  }
  try {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(payload));
  } catch (error) {
    if (error instanceof TypeError && String(error).includes("cannot close or enqueue")) {
      streamClosed = true;  // ✅ Good - handles expected closure
    } else {
      throw error;  // ❌ Re-throws but caller doesn't handle it
    }
  }
};
```

**Hidden Errors**:
- JSON.stringify errors (circular references, BigInt values, undefined in object)
- TextEncoder errors (invalid Unicode sequences)
- Controller.enqueue errors other than "cannot close or enqueue"
- Out of memory errors when encoding large payloads

**User Impact**:
- Stream terminates abruptly with no error event sent to client
- Client waits indefinitely for completion event
- No indication of what went wrong
- User must refresh page manually

**Recommendation**:
```typescript
const send = (event: string, data: unknown) => {
  if (streamClosed || !controller) {
    console.warn(`[${requestId}] SSE stream closed, ignoring event: ${event}`);
    return;
  }

  try {
    // ✅ Validate data can be serialized before enqueuing
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(payload));
  } catch (error) {
    // ✅ Handle stream closure gracefully
    if (error instanceof TypeError && String(error).includes("cannot close or enqueue")) {
      streamClosed = true;
      console.debug(`[${requestId}] SSE stream already closed`);
      return;
    }

    // ✅ CRITICAL: Other errors should close stream with error event
    console.error(`[${requestId}] SSE send failed for event ${event}:`, error);
    streamClosed = true;

    // ✅ Try to send error event before giving up
    try {
      const errorEvent = `event: error\ndata: ${JSON.stringify({
        success: false,
        error: 'Stream encoding error',
        details: error instanceof Error ? error.message : String(error)
      })}\n\n`;
      controller.enqueue(encoder.encode(errorEvent));
    } catch {
      // If we can't send error event, just close
    }

    // ✅ Close the stream to prevent client waiting forever
    try {
      controller.close();
    } catch {
      // Already closed
    }
  }
};
```

---

## HIGH SEVERITY ISSUES

### 7. Cache Stats Update Failures Silently Ignored (HIGH)

**Location**: `supabase/functions/_shared/bundle-cache.ts:134-149`

**Issue**: Fire-and-forget cache stats update with error callback that only logs. Hit count analytics become unreliable.

```typescript
void supabase
  .from("bundle_cache")
  .update({
    last_accessed_at: new Date().toISOString(),
    hit_count: entry.hit_count + 1,
    bundle_url: signedData.signedUrl,
  })
  .eq("content_hash", contentHash)
  .then(
    () => {}, // Success: do nothing
    (err: Error) => {
      // Error: log for debugging
      console.error(`[${requestId}] Failed to update cache stats:`, err.message || err);
    }
  );
```

**Hidden Errors**: Database write failures, concurrent update conflicts, constraint violations

**User Impact**: Cache hit metrics become inaccurate, analytics dashboards show wrong data

**Recommendation**: Add error ID for Sentry tracking, log with request context for debugging:
```typescript
void supabase
  .from("bundle_cache")
  .update({
    last_accessed_at: new Date().toISOString(),
    hit_count: entry.hit_count + 1,
    bundle_url: signedData.signedUrl,
  })
  .eq("content_hash", contentHash)
  .then(
    () => {},
    (err: Error) => {
      console.error(
        `[${requestId}] Failed to update cache stats:`,
        `hash=${contentHash.slice(0, 16)}, error=${err.message || err}`
      );

      // ✅ TODO: Add Sentry logging for monitoring
      // logError({
      //   error: err,
      //   context: { requestId, contentHash: contentHash.slice(0, 16) },
      //   errorId: 'bundle_cache_stats_update_failure'
      // });
    }
  );
```

---

### 8. CDN Fallback Chain Silent Failures (HIGH)

**Location**: `supabase/functions/_shared/cdn-fallback.ts:164`

**Issue**: Fire-and-forget cache write with empty catch block means CDN cache write failures are completely invisible.

```typescript
cachePackageUrl(pkg, version, best.url, best.cdn.name, requestId, useBundleUrl).catch(() => {});
```

**Hidden Errors**: All database write failures from `cachePackageUrl`

**User Impact**: CDN cache never populated, subsequent bundles always hit slow CDN health checks

**Recommendation**:
```typescript
cachePackageUrl(pkg, version, best.url, best.cdn.name, requestId, useBundleUrl).catch((err) => {
  console.error(
    `[${requestId}] Failed to cache CDN URL:`,
    `pkg=${pkg}@${version}, cdn=${best.cdn.name}, error=${err.message || err}`
  );

  // ✅ TODO: Add Sentry logging
  // logError({
  //   error: err,
  //   context: { pkg, version, cdn: best.cdn.name, requestId },
  //   errorId: 'cdn_cache_write_failure'
  // });
});
```

---

### 9. Client-Side Response Validation Missing Size Checks (HIGH)

**Location**: `src/utils/artifactBundler.ts:169-191`

**Issue**: Validates response schema but doesn't validate reasonable bounds on values.

```typescript
if (!data.bundleUrl || typeof data.bundleUrl !== 'string') {
  return {
    success: false,
    error: "Invalid server response",
    details: "Server returned malformed bundle data (missing bundleUrl)"
  };
}

if (!data.bundleSize || typeof data.bundleSize !== 'number') {
  return {
    success: false,
    error: "Invalid server response",
    details: "Server returned malformed bundle data (invalid bundleSize)"
  };
}
// ❌ What if bundleSize is negative? Or 10GB? Or NaN?
```

**Hidden Errors**: Corrupted server responses with invalid but type-correct values

**User Impact**: UI displays nonsensical bundle sizes, potential UI crashes on extreme values

**Recommendation**:
```typescript
// ✅ Validate bundleSize is positive and reasonable (max 10MB per server limit)
if (!data.bundleSize || typeof data.bundleSize !== 'number' ||
    data.bundleSize <= 0 || data.bundleSize > 10 * 1024 * 1024 ||
    !Number.isFinite(data.bundleSize)) {
  return {
    success: false,
    error: "Invalid server response",
    details: `Server returned invalid bundleSize: ${data.bundleSize}`
  };
}

// ✅ Validate bundleUrl looks like a URL
if (!data.bundleUrl || typeof data.bundleUrl !== 'string' ||
    !data.bundleUrl.startsWith('http')) {
  return {
    success: false,
    error: "Invalid server response",
    details: "Server returned malformed bundle URL"
  };
}

// ✅ Validate dependencies array is reasonable size
if (!Array.isArray(data.dependencies) || data.dependencies.length > 100) {
  return {
    success: false,
    error: "Invalid server response",
    details: `Server returned invalid dependencies array (length: ${data.dependencies?.length})`
  };
}
```

---

### 10. SSE Stream Parser Buffer Overflow Potential (HIGH)

**Location**: `src/utils/artifactBundler.ts:293-304`

**Issue**: The buffer accumulates data indefinitely if events never complete with `\n\n`. A malicious or buggy server could send infinite data without terminators.

```typescript
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });  // ❌ Unbounded growth

  const events = buffer.split('\n\n');
  buffer = events.pop() || '';  // Keep incomplete event in buffer
  // ❌ If server never sends \n\n, buffer grows forever
```

**Hidden Errors**: Server sending corrupted SSE stream without proper event terminators, network layer injecting garbage data

**User Impact**: Browser tab memory usage grows unbounded, eventual browser crash or out-of-memory error

**Recommendation**:
```typescript
let buffer = '';
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB max for incomplete event

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  // ✅ Protect against buffer overflow from malformed stream
  if (buffer.length > MAX_BUFFER_SIZE) {
    console.error('[SSE] Buffer overflow - server sending malformed stream');
    result = {
      success: false,
      error: 'Server error',
      details: 'Stream data exceeded maximum size (possible server issue)'
    };
    break;
  }

  const events = buffer.split('\n\n');
  buffer = events.pop() || '';

  // ... rest of parsing logic
}
```

---

### 11. Missing Error Context in Generic Catch Blocks (HIGH)

**Location**: `src/utils/artifactBundler.ts:195-202`

**Issue**: Generic catch block doesn't include request context (artifactId, sessionId) in error message, making debugging impossible.

```typescript
} catch (error) {
  console.error("[artifactBundler] Unexpected error:", error);  // ❌ No context
  return {
    success: false,
    error: "Bundling failed",
    details: error instanceof Error ? error.message : String(error)
  };
}
```

**User Impact**: When errors occur, developers can't correlate error logs with specific user sessions or artifacts

**Recommendation**:
```typescript
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);

  // ✅ Include full context for debugging
  console.error(
    "[artifactBundler] Unexpected error:",
    `artifact=${artifactId}, session=${sessionId},`,
    `error=${errorMsg}`,
    error instanceof Error ? error.stack : ''
  );

  return {
    success: false,
    error: "Bundling failed",
    details: errorMsg,
    // ✅ Include request identifiers in error response for support tickets
    requestId: artifactId
  };
}
```

---

### 12. Fetch Errors Don't Distinguish Network vs Server Errors (HIGH)

**Location**: `src/utils/artifactBundler.ts:103-110`

**Issue**: All fetch failures are treated identically, even though network errors (user's connection) and server errors (our backend) require different user messages.

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bundle-artifact`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  }
);
// ❌ No try-catch - fetch throws on network errors
// ❌ Uncaught network errors crash the caller
```

**Hidden Errors**: Network timeouts, DNS failures, offline mode, browser blocking fetch, CORS errors

**User Impact**: User sees generic error instead of helpful "check your internet connection" message

**Recommendation**:
```typescript
let response: Response;
try {
  response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bundle-artifact`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    }
  );
} catch (fetchError) {
  // ✅ Network-level errors (offline, DNS, timeout, CORS)
  const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
  console.error("[artifactBundler] Network error:", errorMsg);

  // ✅ Provide helpful message based on error type
  if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
    return {
      success: false,
      error: "Network error",
      details: "Unable to connect to bundling service. Please check your internet connection and try again.",
      retryable: true
    };
  }

  return {
    success: false,
    error: "Request failed",
    details: errorMsg,
    retryable: true
  };
}
```

---

### 13. Server-Side Bundle Cache Upsert Race Condition Not Logged (HIGH)

**Location**: `supabase/functions/_shared/bundle-cache.ts:197-210`

**Issue**: When unique constraint violation occurs (race condition), the code updates the existing entry but doesn't log which scenario happened.

```typescript
if (insertError?.code === "23505") {
  // UNIQUE violation - entry exists, update storage/URL/expiry but preserve hit_count
  const { error: updateError } = await supabase
    .from("bundle_cache")
    .update({
      storage_path: storagePath,
      bundle_url: bundleUrl,
      bundle_size: bundleSize,
      dependency_count: dependencyCount,
      expires_at: expiresAt,
    })
    .eq("content_hash", contentHash);
  error = updateError;
  // ❌ No logging to indicate we hit race condition
}
```

**User Impact**: Can't debug why cache entries are being updated instead of inserted, can't measure race condition frequency

**Recommendation**:
```typescript
if (insertError?.code === "23505") {
  // UNIQUE violation - entry exists (race condition or existing cache)
  console.log(
    `[${requestId}] Bundle cache: Entry already exists (race condition), updating:`,
    `hash=${shortHash}...`
  );

  const { error: updateError } = await supabase
    .from("bundle_cache")
    .update({
      storage_path: storagePath,
      bundle_url: bundleUrl,
      bundle_size: bundleSize,
      dependency_count: dependencyCount,
      expires_at: expiresAt,
    })
    .eq("content_hash", contentHash);
  error = updateError;

  // ✅ Log update result
  if (updateError) {
    console.error(
      `[${requestId}] Bundle cache: Update after race condition failed:`,
      `hash=${shortHash}..., error=${updateError.message}`
    );
  } else {
    console.log(`[${requestId}] Bundle cache: Updated after race condition`);
  }
}
```

---

### 14. CDN Package Cache Write Missing Configuration Logging (HIGH)

**Location**: `supabase/functions/_shared/cdn-cache.ts:88-94`

**Issue**: Returns silently when Supabase config is missing, making it impossible to tell if CDN caching is disabled.

```typescript
if (!supabaseUrl || !supabaseKey) {
  console.warn(`[${requestId}] CDN cache: Missing Supabase config, skipping cache`);
  return;  // ❌ No way to detect this is happening frequently
}
```

**User Impact**: CDN caching silently disabled in environments without proper config, performance degradation goes unnoticed

**Recommendation**:
```typescript
if (!supabaseUrl || !supabaseKey) {
  // ✅ Log first occurrence with more detail
  console.error(
    `[${requestId}] CDN cache: DISABLED - missing Supabase configuration.`,
    `Package ${pkg}@${version} will not be cached.`,
    `Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable caching.`
  );

  // ✅ TODO: Add Sentry logging on first occurrence (use rate limiting)
  // logError({
  //   error: new Error('CDN cache disabled: missing Supabase configuration'),
  //   context: { pkg, version, requestId },
  //   errorId: 'cdn_cache_config_missing',
  //   level: 'warning'
  // });

  return;
}
```

---

### 15. SSE Stream Error Event Missing Request Context (HIGH)

**Location**: `bundle-artifact/index.ts:772-781`

**Issue**: Error event sent to client lacks context about which operation failed.

```typescript
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`[${requestId}] SSE: Bundle error:`, errorMsg);
  const errorEvent: BundleError = {
    success: false,
    error: errorMsg,  // ❌ Raw error message may not be user-friendly
    requestId,
    // ❌ Missing details about which stage failed
  };
  sendEvent("error", errorEvent);
  closeStream();
}
```

**User Impact**: User sees generic error message, no indication of whether it was CDN failure, validation failure, storage failure, etc.

**Recommendation**:
```typescript
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`[${requestId}] SSE: Bundle error:`, errorMsg);

  // ✅ Provide user-friendly error message based on error type
  let userMessage = "Bundling failed";
  let details = errorMsg;

  if (errorMsg.includes('fetch') || errorMsg.includes('CDN')) {
    userMessage = "Failed to fetch package dependencies";
    details = "Package CDN is temporarily unavailable. Please try again in a moment.";
  } else if (errorMsg.includes('storage') || errorMsg.includes('upload')) {
    userMessage = "Failed to save bundle";
    details = "Storage service temporarily unavailable. Please try again.";
  } else if (errorMsg.includes('validation') || errorMsg.includes('invalid')) {
    userMessage = "Invalid artifact code";
    // Keep original details for validation errors
  }

  const errorEvent: BundleError = {
    success: false,
    error: userMessage,
    details: details,
    requestId,
  };
  sendEvent("error", errorEvent);
  closeStream();
}
```

---

## MEDIUM SEVERITY ISSUES

### 16. Empty Catch Block in SSE Stream Close (MEDIUM)

**Location**: `supabase/functions/_shared/sse-stream.ts:95-97` and `bundle-artifact/index.ts:637-643`

**Issue**: Empty catch blocks make debugging stream closure issues impossible.

```typescript
try {
  controller.close();
} catch {
  // Already closed  ❌ No logging
}
```

**Hidden Errors**: Unexpected errors during controller cleanup beyond "already closed"

**Recommendation**:
```typescript
try {
  controller.close();
} catch (error) {
  // ✅ Log unexpected closure errors
  if (error instanceof TypeError && String(error).includes('already closed')) {
    console.debug(`[${requestId}] SSE stream already closed`);
  } else {
    console.warn(`[${requestId}] Unexpected error closing SSE stream:`, error);
  }
}
```

---

### 17. Client Reader Cancel Doesn't Log Errors (MEDIUM)

**Location**: `src/utils/artifactBundler.ts:335-341`

**Issue**: Silent catch when canceling reader might hide real errors.

```typescript
} finally {
  try {
    reader.cancel();
  } catch (cancelError) {
    console.debug('[SSE] Reader already closed');  // ❌ Assumes all errors are "already closed"
  }
}
```

**Recommendation**:
```typescript
} finally {
  try {
    reader.cancel();
  } catch (cancelError) {
    // ✅ Distinguish between expected and unexpected errors
    const errorMsg = cancelError instanceof Error ? cancelError.message : String(cancelError);
    if (errorMsg.includes('already') || errorMsg.includes('closed')) {
      console.debug('[SSE] Reader already closed');
    } else {
      console.warn('[SSE] Unexpected error canceling reader:', errorMsg);
    }
  }
}
```

---

### 18. SSE Malformed Event Warning Without Context (MEDIUM)

**Location**: `src/utils/artifactBundler.ts:326-328`

**Issue**: Warning logs malformed event but doesn't include which part is malformed.

```typescript
} else if (event.trim()) {
  console.warn('[SSE] Malformed event, skipping:', event);  // ❌ Logs entire event (could be huge)
}
```

**Recommendation**:
```typescript
} else if (event.trim()) {
  // ✅ Log truncated event for debugging without flooding console
  const preview = event.length > 100 ? event.substring(0, 100) + '...' : event;
  console.warn(
    '[SSE] Malformed event (missing event or data field), skipping:',
    preview
  );
}
```

---

### 19. Batch CDN Cache Missing Package Count Validation (MEDIUM)

**Location**: `supabase/functions/_shared/cdn-cache.ts:144-146`

**Issue**: Returns silently if packages array is empty, should validate reasonable batch size.

```typescript
if (!supabaseUrl || !supabaseKey || packages.length === 0) {
  return;  // ❌ Silent return for empty packages
}
```

**Recommendation**:
```typescript
if (!supabaseUrl || !supabaseKey) {
  console.warn(`[${requestId}] Batch CDN cache: Missing Supabase config, caching disabled`);
  return;
}

if (packages.length === 0) {
  console.debug(`[${requestId}] Batch CDN cache: No packages to cache`);
  return;
}

// ✅ Validate reasonable batch size
if (packages.length > 1000) {
  console.warn(
    `[${requestId}] Batch CDN cache: Very large batch (${packages.length} packages),`,
    `this may cause performance issues`
  );
}
```

---

### 20. Missing Validation for BundleResponse expiresAt Format (MEDIUM)

**Location**: `src/utils/artifactBundler.ts:185-191`

**Issue**: Doesn't validate that expiresAt is a valid ISO timestamp.

```typescript
expect(data.expiresAt).toBeDefined();  // ❌ Only checks existence, not format
```

**Recommendation**:
```typescript
// ✅ Validate expiresAt is valid ISO timestamp
if (!data.expiresAt || typeof data.expiresAt !== 'string') {
  return {
    success: false,
    error: "Invalid server response",
    details: "Server returned malformed expiresAt"
  };
}

try {
  const expiryDate = new Date(data.expiresAt);
  if (isNaN(expiryDate.getTime())) {
    return {
      success: false,
      error: "Invalid server response",
      details: "Server returned invalid expiresAt timestamp"
    };
  }
} catch {
  return {
    success: false,
    error: "Invalid server response",
    details: "Server returned malformed expiresAt"
  };
}
```

---

### 21. Bundle Cache Expiry Check Missing Clock Skew Tolerance (MEDIUM)

**Location**: `supabase/functions/_shared/bundle-cache.ts:116-119`

**Issue**: Strict date comparison may reject valid cache entries if server/database clocks are slightly skewed.

```typescript
if (new Date(entry.expires_at) < new Date()) {
  console.log(`[${requestId}] Bundle cache EXPIRED`);
  return { hit: false };
}
```

**Recommendation**:
```typescript
// ✅ Add small tolerance for clock skew (30 seconds)
const CLOCK_SKEW_TOLERANCE_MS = 30 * 1000;
const now = new Date();
const expiryDate = new Date(entry.expires_at);

if (expiryDate.getTime() < now.getTime() - CLOCK_SKEW_TOLERANCE_MS) {
  console.log(
    `[${requestId}] Bundle cache EXPIRED:`,
    `expired=${expiryDate.toISOString()}, now=${now.toISOString()}`
  );
  return { hit: false };
}
```

---

### 22. SSE Stream Progress Event Missing Validation (MEDIUM)

**Location**: `src/utils/artifactBundler.ts:316-318`

**Issue**: Doesn't validate progress event data structure before calling callback.

```typescript
if (eventType === 'progress') {
  onProgress(data as BundleProgress);  // ❌ No validation that data matches BundleProgress
}
```

**Recommendation**:
```typescript
if (eventType === 'progress') {
  // ✅ Validate progress event structure
  if (
    data &&
    typeof data === 'object' &&
    'stage' in data &&
    'message' in data &&
    'progress' in data &&
    typeof data.progress === 'number'
  ) {
    onProgress(data as BundleProgress);
  } else {
    console.warn('[SSE] Received malformed progress event:', data);
  }
}
```

---

### 23. Missing Error ID in Console Logs (MEDIUM)

**Location**: Multiple files throughout the PR

**Issue**: Console error logs don't include error IDs for Sentry correlation.

**Recommendation**: Add TODO comments for Sentry integration with error IDs from `constants/errorIds.ts`:

```typescript
// Example from bundle-cache.ts:214
if (error) {
  console.error(`[${requestId}] Bundle cache write failed:`, error.message);

  // ✅ TODO: Add Sentry logging with error ID
  // logError({
  //   error: new Error(`Bundle cache write failed: ${error.message}`),
  //   context: { requestId, contentHash: contentHash.slice(0, 16) },
  //   errorId: 'bundle_cache_write_failure'  // Add to constants/errorIds.ts
  // });
}
```

---

## Summary of Recommendations

### Immediate Actions (Critical Issues)

1. **Fix SSE reader cleanup** - Add explicit error result on parse failure and break loop
2. **Return cache write status** - Change `storeBundleCache` to return success/failure
3. **Add Sentry logging to CDN cache** - Distinguish database errors from cache misses
4. **Add Sentry logging to metrics** - Alert on configuration and database errors
5. **Fix signed URL error handling** - Don't treat storage errors as cache misses
6. **Improve SSE send error handling** - Send error event before closing stream

### Short-term Improvements (High Severity)

7. Add error IDs to all fire-and-forget operations
8. Add response validation bounds checking
9. Add SSE buffer overflow protection
10. Add request context to all error logs
11. Wrap fetch in try-catch for network errors
12. Log bundle cache race conditions
13. Improve CDN cache configuration logging
14. Add stage context to SSE error events

### Code Quality (Medium Severity)

15. Replace empty catch blocks with conditional logging
16. Add error type checks to reader.cancel()
17. Truncate malformed SSE events in logs
18. Validate batch CDN cache sizes
19. Validate timestamp formats in responses
20. Add clock skew tolerance to expiry checks
21. Validate SSE event structures before callbacks
22. Add TODO comments for Sentry integration

---

## Testing Recommendations

1. **Add integration tests** for error scenarios:
   - Database connection failures
   - Storage bucket errors
   - CDN timeout/unavailability
   - Malformed SSE streams
   - Network failures

2. **Add unit tests** for error handling:
   - Buffer overflow protection
   - Response validation bounds
   - Error message formatting
   - Clock skew tolerance

3. **Add monitoring** for:
   - Cache hit rates dropping (indicates cache write failures)
   - Metrics table growth stopping (indicates metrics write failures)
   - CDN cache age increasing (indicates cache write failures)

---

## Conclusion

This PR introduces powerful caching and streaming features but has significant gaps in error handling that could lead to silent failures and difficult-to-debug issues. The most critical problems are:

1. **Fire-and-forget operations** that swallow all errors
2. **Database failures** treated as cache misses instead of errors
3. **SSE stream errors** that leave clients waiting indefinitely
4. **Missing Sentry integration** for production error tracking

Addressing the 6 critical issues would prevent the most serious user-facing problems. The high and medium severity issues should be addressed before merging to production to ensure proper observability and debugging capabilities.
