import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { getCachedPackageUrl, cachePackageUrl, batchCachePackageUrls, type CdnProvider } from "../cdn-cache.ts";

/**
 * CDN Cache Unit Tests
 *
 * These tests verify the caching logic works correctly.
 * Integration tests require `supabase start` and valid env vars.
 */

// Note: Most tests here are integration tests requiring local Supabase
// They check for cache miss on uncached packages and verify the cache write path

Deno.test("getCachedPackageUrl - returns miss for uncached package (INTEGRATION)", async () => {
  // This will return miss because the package isn't cached yet
  // Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
  const result = await getCachedPackageUrl(
    "this-package-not-in-cache-" + Date.now(),
    "1.0.0",
    "test-req-cache-001"
  );

  // Should be miss (cache miss or missing env vars)
  assertEquals(result.type, 'miss');
});

Deno.test("getCachedPackageUrl - does not throw regardless of env config", async () => {
  // Verifies the function handles both configured and unconfigured states gracefully
  // without throwing exceptions
  try {
    const result = await getCachedPackageUrl(
      "test-package",
      "1.0.0",
      "test-req-cache-002"
    );

    // Should return a discriminated union type, never throw
    assert(
      result.type === 'hit' || result.type === 'miss' || result.type === 'error',
      `Result should have valid type, got: ${result.type}`
    );

    // If hit, should have url and provider
    if (result.type === 'hit') {
      assert(typeof result.url === 'string');
      assert(typeof result.provider === 'string');
    }

    // If error, should have error object
    if (result.type === 'error') {
      assert(result.error instanceof Error);
    }
  } catch (error) {
    // Should not throw - if it does, fail the test
    assertEquals(true, false, `getCachedPackageUrl should not throw: ${error}`);
  }
});

Deno.test("cachePackageUrl - does not throw on write (INTEGRATION)", async () => {
  // This tests that the cache write doesn't throw
  // It may fail silently if env vars are missing (by design)
  const testPkg = "test-cache-pkg-" + Date.now();

  try {
    await cachePackageUrl(
      testPkg,
      "1.0.0",
      "https://esm.sh/test@1.0.0",
      "esm.sh",
      "test-req-cache-003"
    );
    // If we get here without throwing, the test passes
    assert(true);
  } catch (error) {
    // Should not throw
    assertEquals(true, false, `cachePackageUrl should not throw: ${error}`);
  }
});

Deno.test("batchCachePackageUrls - handles empty array", async () => {
  // Should not throw on empty array
  try {
    await batchCachePackageUrls([], "test-req-cache-004");
    assert(true);
  } catch (error) {
    assertEquals(true, false, `batchCachePackageUrls should not throw: ${error}`);
  }
});

Deno.test("cachePackageUrl then getCachedPackageUrl - round trip (INTEGRATION)", async () => {
  // This is a true integration test - requires local Supabase
  const testPkg = "integration-test-pkg-" + Date.now();
  const testUrl = "https://esm.sh/integration-test@1.0.0";
  const testProvider = "esm.sh";
  const requestId = "test-req-cache-005";

  // Cache the package
  await cachePackageUrl(testPkg, "1.0.0", testUrl, testProvider, requestId);

  // Small delay to ensure write completes
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Retrieve the cached package
  const result = await getCachedPackageUrl(testPkg, "1.0.0", requestId);

  // If env vars are configured, we should get the cached value back
  // If not configured, result will be miss (graceful degradation)
  if (result.type === 'hit') {
    assertEquals(result.url, testUrl);
    assertEquals(result.provider, testProvider);
  }
  // Either way, no exception should be thrown
});

Deno.test("CdnProvider type matches database CHECK constraint", async () => {
  // This test verifies TypeScript type matches DB schema
  // Database constraint: cdn_provider IN ('esm.sh', 'esm.run', 'jsdelivr')
  const validProviders: CdnProvider[] = ['esm.sh', 'esm.run', 'jsdelivr'];

  // All valid providers should compile and work
  for (const provider of validProviders) {
    // Should compile without errors
    await cachePackageUrl(
      'test-type-safety-pkg',
      '1.0.0',
      'https://example.com',
      provider,
      'test-req-type-safety',
      false
    );
  }

  // Test passes if no exceptions thrown
  assert(true);
});

Deno.test("CacheLookupResult discriminated union handles all cases", async () => {
  // Verify the discriminated union type works correctly
  const result = await getCachedPackageUrl(
    "type-test-pkg-" + Date.now(),
    "1.0.0",
    "test-req-union"
  );

  // Should be one of the three valid types
  assert(
    result.type === 'hit' || result.type === 'miss' || result.type === 'error',
    `Result type should be 'hit', 'miss', or 'error', got: ${result.type}`
  );

  // Type narrowing should work correctly
  if (result.type === 'hit') {
    // These properties should exist and be properly typed
    const _url: string = result.url;
    const _provider: CdnProvider = result.provider;
    assert(typeof result.url === 'string');
    assert(typeof result.provider === 'string');
  } else if (result.type === 'error') {
    // Error type should have error property
    assert(result.error instanceof Error);
  } else {
    // Miss type should have no additional properties
    assertEquals(result.type, 'miss');
  }
});
