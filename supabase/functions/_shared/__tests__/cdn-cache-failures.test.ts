import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { getCachedPackageUrl } from "../cdn-cache.ts";

Deno.test("getCachedPackageUrl - degrades gracefully when Supabase config missing", async () => {
  // Save original env vars
  const originalUrl = Deno.env.get("SUPABASE_URL");
  const originalKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    // Remove Supabase config to simulate missing configuration
    Deno.env.delete("SUPABASE_URL");
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");

    const result = await getCachedPackageUrl("react", "18.3.1", "req-1", false);

    // Should degrade to cache MISS when config is missing
    assertEquals(result.type, 'miss', "Should return miss when Supabase config is missing");
  } finally {
    // Restore original env vars
    if (originalUrl) Deno.env.set("SUPABASE_URL", originalUrl);
    if (originalKey) Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", originalKey);
  }
});

Deno.test({
  name: "getCachedPackageUrl - degrades gracefully with invalid Supabase credentials",
  sanitizeOps: false, // Supabase client may leave intervals running
  sanitizeResources: false,
  fn: async () => {
  // Save original env vars
  const originalUrl = Deno.env.get("SUPABASE_URL");
  const originalKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    // Set invalid credentials
    Deno.env.set("SUPABASE_URL", "https://invalid-project.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "invalid-key-that-will-fail");

    const result = await getCachedPackageUrl("react", "18.3.1", "req-2", false);

    // Database query errors degrade to cache MISS (graceful degradation)
    // This ensures the system continues to work even when the cache is unavailable
    assertEquals(result.type, 'miss', "Should degrade to cache miss when database query fails");
  } finally {
    // Restore original env vars
    if (originalUrl) Deno.env.set("SUPABASE_URL", originalUrl);
    else Deno.env.delete("SUPABASE_URL");
    if (originalKey) Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", originalKey);
    else Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  }
  }
});
