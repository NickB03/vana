import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { generateContentHash, storeBundleCache } from "../bundle-cache.ts";

/**
 * Bundle Cache Unit Tests
 *
 * Tests for the hash generation function (no Supabase required).
 * Integration tests for lookup/store require `supabase start`.
 */

// ============================================================================
// Hash Function Tests (pure functions, no Supabase required)
// ============================================================================

Deno.test("generateContentHash - produces consistent 64-char SHA-256 hash", async () => {
  const code = "function App() { return <div>Hello</div>; }";
  const deps = { react: "18.2.0" };

  const hash1 = await generateContentHash(code, deps);
  const hash2 = await generateContentHash(code, deps);

  assertEquals(hash1, hash2, "Hash should be consistent");
  assertEquals(hash1.length, 64, "SHA-256 hex should be 64 characters");
});

Deno.test("generateContentHash - different code produces different hash", async () => {
  const deps = { react: "18.2.0" };
  const hash1 = await generateContentHash("function A() {}", deps);
  const hash2 = await generateContentHash("function B() {}", deps);

  assert(hash1 !== hash2, "Different code should produce different hash");
});

Deno.test("generateContentHash - different deps produces different hash", async () => {
  const code = "function App() {}";
  const hash1 = await generateContentHash(code, { react: "18.2.0" });
  const hash2 = await generateContentHash(code, { react: "18.3.0" });

  assert(hash1 !== hash2, "Different deps should produce different hash");
});

Deno.test("generateContentHash - sorted deps produce same hash regardless of order", async () => {
  const code = "function App() {}";
  const hash1 = await generateContentHash(code, { react: "18.2.0", lodash: "4.17.21" });
  const hash2 = await generateContentHash(code, { lodash: "4.17.21", react: "18.2.0" });

  assertEquals(hash1, hash2, "Sorted deps should produce same hash");
});

Deno.test("generateContentHash - empty deps produce valid hash", async () => {
  const code = "function App() { return <div>Hello</div>; }";
  const hash = await generateContentHash(code, {});

  assertEquals(hash.length, 64, "Empty deps should still produce valid hash");
});

Deno.test("generateContentHash - handles special characters in code", async () => {
  const code = `function App() {
    const emoji = "🎉";
    const quote = '"hello"';
    return <div>{emoji}</div>;
  }`;
  const deps = { react: "18.2.0" };

  const hash = await generateContentHash(code, deps);

  assertEquals(hash.length, 64, "Special characters should produce valid hash");
  // Verify it's all hex characters
  assert(/^[a-f0-9]+$/.test(hash), "Hash should be hex string");
});

Deno.test("generateContentHash - handles scoped packages", async () => {
  const code = "function App() {}";
  const deps1 = { "@radix-ui/react-dialog": "1.0.0", react: "18.2.0" };
  const deps2 = { react: "18.2.0", "@radix-ui/react-dialog": "1.0.0" };

  const hash1 = await generateContentHash(code, deps1);
  const hash2 = await generateContentHash(code, deps2);

  assertEquals(hash1, hash2, "Scoped packages should sort correctly");
});

Deno.test("generateContentHash - whitespace in code affects hash", async () => {
  const deps = { react: "18.2.0" };
  const hash1 = await generateContentHash("function App() {}", deps);
  const hash2 = await generateContentHash("function App() { }", deps);

  assert(hash1 !== hash2, "Whitespace differences should produce different hash");
});

// ============================================================================
// bundleReact and title parameter tests (prevent cache collisions)
// ============================================================================

Deno.test("generateContentHash - different bundleReact produces different hash", async () => {
  const code = "function App() {}";
  const deps = { react: "18.2.0" };
  const title = "Test";

  const hashUmd = await generateContentHash(code, deps, false, title);
  const hashEsm = await generateContentHash(code, deps, true, title);

  assert(hashUmd !== hashEsm, "bundleReact=true vs false should produce different hash");
});

Deno.test("generateContentHash - different title produces different hash", async () => {
  const code = "function App() {}";
  const deps = { react: "18.2.0" };

  const hash1 = await generateContentHash(code, deps, false, "Title A");
  const hash2 = await generateContentHash(code, deps, false, "Title B");

  assert(hash1 !== hash2, "Different titles should produce different hash");
});

Deno.test("generateContentHash - same params with bundleReact/title produce consistent hash", async () => {
  const code = "function App() {}";
  const deps = { react: "18.2.0" };

  const hash1 = await generateContentHash(code, deps, true, "My App");
  const hash2 = await generateContentHash(code, deps, true, "My App");

  assertEquals(hash1, hash2, "Same params should produce consistent hash");
});

Deno.test("generateContentHash - defaults work correctly (backward compat)", async () => {
  const code = "function App() {}";
  const deps = { react: "18.2.0" };

  // These should be equivalent - defaults are bundleReact=false, title=""
  const hashNoParams = await generateContentHash(code, deps);
  const hashExplicit = await generateContentHash(code, deps, false, "");

  assertEquals(hashNoParams, hashExplicit, "Default params should match explicit false/empty");
});

// ============================================================================
// Bundle Schema Version Tests (cache invalidation on bundler changes)
// ============================================================================

Deno.test("generateContentHash - includes schema version in hash", async () => {
  const code = "function App() {}";
  const deps = { react: "18.2.0" };

  // Generate hash and verify it changes if we were to change the version
  const hash = await generateContentHash(code, deps);

  // Since hash includes version, we can verify by checking it's deterministic
  const hash2 = await generateContentHash(code, deps);
  assertEquals(hash, hash2, "Hash with version should be consistent");

  // If version were incremented, hashes would differ (can't test directly
  // without modifying BUNDLE_SCHEMA_VERSION constant, but this documents
  // the expected behavior)
  assertEquals(hash.length, 64, "Hash should be valid SHA-256");
});

// ============================================================================
// Race Condition Tests (requires `supabase start`)
// ============================================================================

Deno.test("storeBundleCache - concurrent writes preserve hit_count", async () => {
  const testSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const code = "export default function App() { return 42; }";
  const deps = { "react": "18.3.1", "react-dom": "18.3.1" };
  const contentHash = await generateContentHash(code, deps);

  // Clean up any existing cache entry
  await testSupabase
    .from("bundle_cache")
    .delete()
    .eq("content_hash", contentHash);

  // Create initial cache entry with hit_count = 5
  const path1 = `bundles/${crypto.randomUUID()}.html`;
  const url1 = `https://example.com/${path1}`;
  await storeBundleCache(testSupabase, contentHash, path1, url1, 1000, 2, "req-1");

  // Manually set hit_count to 5
  await testSupabase
    .from("bundle_cache")
    .update({ hit_count: 5 })
    .eq("content_hash", contentHash);

  // Simulate race condition: 3 concurrent writes
  const path2 = `bundles/${crypto.randomUUID()}.html`;
  const path3 = `bundles/${crypto.randomUUID()}.html`;
  const url2 = `https://example.com/${path2}`;
  const url3 = `https://example.com/${path3}`;

  await Promise.all([
    storeBundleCache(testSupabase, contentHash, path2, url2, 2000, 2, "req-2"),
    storeBundleCache(testSupabase, contentHash, path3, url3, 3000, 2, "req-3"),
  ]);

  // Verify hit_count is preserved (not reset to 0)
  const { data, error } = await testSupabase
    .from("bundle_cache")
    .select("hit_count, storage_path, bundle_size")
    .eq("content_hash", contentHash)
    .single();

  assertEquals(error, null);
  assert(data !== null, "Data should not be null");
  assertEquals(data.hit_count, 5, "hit_count should be preserved during concurrent writes");
  // Latest write should win for storage_path and bundle_size
  assert([path2, path3].includes(data.storage_path));

  // Clean up
  await testSupabase
    .from("bundle_cache")
    .delete()
    .eq("content_hash", contentHash);
});

Deno.test("storeBundleCache - handles unique constraint violations gracefully", async () => {
  // Test that 23505 errors (unique constraint) are handled correctly
  // and don't cause crashes or data corruption

  const testSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const code = "export default () => <div>Test</div>";
  const deps = { "react": "18.3.1" };
  const contentHash = await generateContentHash(code, deps);

  // Clean up any existing cache entry
  await testSupabase
    .from("bundle_cache")
    .delete()
    .eq("content_hash", contentHash);

  const path = `bundles/${crypto.randomUUID()}.html`;
  const url = `https://example.com/${path}`;

  // First write should succeed
  await storeBundleCache(testSupabase, contentHash, path, url, 500, 2, "req-1");

  // Second write with same contentHash should handle conflict gracefully
  const path2 = `bundles/${crypto.randomUUID()}.html`;
  const url2 = `https://example.com/${path2}`;

  // Should not throw, should update existing entry
  await storeBundleCache(testSupabase, contentHash, path2, url2, 600, 2, "req-2");

  // Verify only one entry exists with updated values
  const { data, error } = await testSupabase
    .from("bundle_cache")
    .select("*")
    .eq("content_hash", contentHash);

  assertEquals(error, null);
  assert(data !== null, "Data should not be null");
  assertEquals(data.length, 1, "Should have exactly one entry");
  assertEquals(data[0].storage_path, path2, "Should have updated to latest path");
  assertEquals(data[0].bundle_size, 600, "Should have updated to latest size");

  // Clean up
  await testSupabase
    .from("bundle_cache")
    .delete()
    .eq("content_hash", contentHash);
});

// ============================================================================
// Edge Case Tests
// ============================================================================

Deno.test("generateContentHash - handles maximum size code", async () => {
  // Test with 500KB code (MAX_CODE_SIZE limit)
  const maxCode = "x".repeat(500 * 1024);
  const deps = { "react": "18.3.1" };

  const startTime = performance.now();
  const hash = await generateContentHash(maxCode, deps);
  const duration = performance.now() - startTime;

  // Should complete in reasonable time
  assert(duration < 1000, `Hash generation took ${duration}ms, expected < 1000ms`);
  assertEquals(hash.length, 64, "Should produce valid SHA-256 hash");
  assert(/^[a-f0-9]{64}$/.test(hash), "Should be hex string");
});

Deno.test("generateContentHash - handles empty code", async () => {
  const hash = await generateContentHash("", {});

  assertEquals(hash.length, 64);
  assert(/^[a-f0-9]{64}$/.test(hash));
});

Deno.test("generateContentHash - handles whitespace-only code", async () => {
  const hash1 = await generateContentHash("   \n\t  ", {});
  const hash2 = await generateContentHash("", {});

  // Whitespace-only should produce different hash than empty
  assert(hash1 !== hash2, "Whitespace-only should differ from empty");
});

Deno.test("generateContentHash - handles Unicode normalization", async () => {
  // NFC (composed) vs NFD (decomposed) Unicode
  const code1 = "function café() {}"; // NFC
  const code2 = "function café() {}"; // NFD (if different)

  const hash1 = await generateContentHash(code1, {});
  const hash2 = await generateContentHash(code2, {});

  // Document current behavior (may be same or different)
  // This test captures the behavior for future reference
  console.log(`Unicode NFC hash: ${hash1}`);
  console.log(`Unicode NFD hash: ${hash2}`);
});

Deno.test("generateContentHash - handles special characters in dependencies", async () => {
  const deps = {
    "@types/react": "18.3.1",
    "lodash.debounce": "4.0.8",
    "package-with-numbers123": "1.0.0"
  };

  const hash = await generateContentHash("code", deps);
  assertEquals(hash.length, 64);
});

Deno.test("generateContentHash - handles very long dependency lists", async () => {
  // Test with 100 dependencies
  const deps: Record<string, string> = {};
  for (let i = 0; i < 100; i++) {
    deps[`package-${i}`] = `1.0.${i}`;
  }

  const hash = await generateContentHash("code", deps);
  assertEquals(hash.length, 64);
});
