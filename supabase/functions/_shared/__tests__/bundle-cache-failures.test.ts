import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { lookupBundleCache, generateContentHash } from "../bundle-cache.ts";

// Mock Supabase client that simulates failures
function createMockSupabaseWithFailure(failureType: 'select' | 'signedUrl' | 'timeout') {
  return {
    from: (table: string) => ({
      select: (fields: string) => ({
        eq: (field: string, value: any) => ({
          single: async () => {
            if (failureType === 'select') {
              return { data: null, error: new Error("Database connection timeout") };
            }
            if (failureType === 'timeout') {
              await new Promise(r => setTimeout(r, 100));
              return { data: null, error: new Error("Query timeout") };
            }
            // Return mock entry
            return {
              data: {
                content_hash: "test",
                storage_path: "bundles/test.html",
                bundle_url: "https://expired-url.com",
                bundle_size: 1000,
                hit_count: 5,
                expires_at: new Date(Date.now() + 3600000).toISOString()
              },
              error: null
            };
          }
        })
      })
    }),
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expirySeconds: number) => {
          if (failureType === 'signedUrl') {
            return { data: null, error: new Error("Storage service unavailable") };
          }
          return { data: { signedUrl: "https://new-url.com" }, error: null };
        }
      })
    }
  } as any;
}

Deno.test("lookupBundleCache - degrades gracefully on database select failure", async () => {
  const mockSupabase = createMockSupabaseWithFailure('select');
  const hash = "a".repeat(64);

  const result = await lookupBundleCache(mockSupabase, hash, "req-1");

  // Should return cache MISS (graceful degradation)
  assertEquals(result.hit, false, "Should degrade to cache miss on DB failure");
  assertEquals(result.entry, undefined);
  assertEquals(result.freshUrl, undefined);
});

Deno.test("lookupBundleCache - degrades gracefully on signed URL generation failure", async () => {
  const mockSupabase = createMockSupabaseWithFailure('signedUrl');
  const hash = "b".repeat(64);

  const result = await lookupBundleCache(mockSupabase, hash, "req-2");

  // Should return cache MISS when URL can't be regenerated
  assertEquals(result.hit, false, "Should degrade to cache miss when URL regeneration fails");
  // Should log error (check console output manually)
});

Deno.test("lookupBundleCache - handles database timeout", async () => {
  const mockSupabase = createMockSupabaseWithFailure('timeout');
  const hash = "c".repeat(64);

  const result = await lookupBundleCache(mockSupabase, hash, "req-3");

  assertEquals(result.hit, false, "Should return cache miss on timeout");
});
