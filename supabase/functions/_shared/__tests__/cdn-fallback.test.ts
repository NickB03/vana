import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  CDN_PROVIDERS,
  verifyCdnUrl,
  getWorkingCdnUrl,
  batchVerifyCdnUrls,
  getCdnHealthStatus,
} from "../cdn-fallback.ts";

Deno.test("CDN_PROVIDERS - should have correct structure", () => {
  assertEquals(CDN_PROVIDERS.length, 3);

  // Verify esm.sh is first (primary)
  assertEquals(CDN_PROVIDERS[0].name, "esm.sh");
  assertEquals(CDN_PROVIDERS[0].baseUrl, "https://esm.sh");

  // Verify esm.run is second
  assertEquals(CDN_PROVIDERS[1].name, "esm.run");
  assertEquals(CDN_PROVIDERS[1].baseUrl, "https://esm.run");

  // Verify jsdelivr is third
  assertEquals(CDN_PROVIDERS[2].name, "jsdelivr");
  assertEquals(CDN_PROVIDERS[2].baseUrl, "https://cdn.jsdelivr.net");
});

Deno.test("CDN_PROVIDERS - buildUrl should include React externalization for esm.sh", () => {
  const esmsh = CDN_PROVIDERS[0];
  const url = esmsh.buildUrl("lodash", "4.17.21");

  assertEquals(url, "https://esm.sh/lodash@4.17.21?external=react,react-dom");
});

Deno.test("CDN_PROVIDERS - buildBundleUrl should include bundle flag for esm.sh", () => {
  const esmsh = CDN_PROVIDERS[0];
  const url = esmsh.buildBundleUrl("lodash", "4.17.21");

  assertEquals(url, "https://esm.sh/lodash@4.17.21?bundle&external=react,react-dom");
});

Deno.test("CDN_PROVIDERS - esm.run buildUrl should not include React externalization", () => {
  const esmrun = CDN_PROVIDERS[1];
  const url = esmrun.buildUrl("lodash", "4.17.21");

  assertEquals(url, "https://esm.run/lodash@4.17.21");
});

Deno.test("CDN_PROVIDERS - jsdelivr buildUrl should use +esm suffix", () => {
  const jsdelivr = CDN_PROVIDERS[2];
  const url = jsdelivr.buildUrl("lodash", "4.17.21");

  assertEquals(url, "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm");
});

Deno.test("verifyCdnUrl - should return false for invalid URL", async () => {
  const result = await verifyCdnUrl("https://invalid-cdn-url-that-does-not-exist.com/test", 1000);
  assertEquals(result, false);
});

Deno.test("verifyCdnUrl - should return true for valid esm.sh URL (INTEGRATION)", async () => {
  // This is an integration test - requires network access
  const result = await verifyCdnUrl("https://esm.sh/react@18.2.0", 5000);
  assertEquals(result, true);
});

Deno.test("verifyCdnUrl - should timeout for slow URLs", async () => {
  // Use a URL that will definitely timeout (very short timeout)
  const result = await verifyCdnUrl("https://esm.sh/react@18.2.0", 1); // 1ms timeout
  assertEquals(result, false);
});

Deno.test("getWorkingCdnUrl - should return esm.sh for standard package (INTEGRATION)", async () => {
  const requestId = "test-req-001";
  const result = await getWorkingCdnUrl("react", "18.2.0", requestId);

  assertExists(result);
  assertEquals(result.provider, "esm.sh");
  assertEquals(result.url, "https://esm.sh/react@18.2.0?external=react,react-dom");
});

Deno.test("getWorkingCdnUrl - should return null for invalid package", async () => {
  const requestId = "test-req-002";
  const result = await getWorkingCdnUrl(
    "this-package-definitely-does-not-exist-12345",
    "1.0.0",
    requestId
  );

  assertEquals(result, null);
});

Deno.test("getWorkingCdnUrl - should use bundle URL when useBundleUrl is true", async () => {
  const requestId = "test-req-003";
  const result = await getWorkingCdnUrl("react", "18.2.0", requestId, true);

  assertExists(result);
  assertEquals(result.url, "https://esm.sh/react@18.2.0?bundle&external=react,react-dom");
});

Deno.test("batchVerifyCdnUrls - should verify multiple packages (INTEGRATION)", async () => {
  const requestId = "test-req-004";
  const packages = {
    react: "18.2.0",
    lodash: "4.17.21",
  };

  const results = await batchVerifyCdnUrls(packages, requestId);

  assertEquals(results.size, 2);
  assertExists(results.get("react"));
  assertExists(results.get("lodash"));
  assertEquals(results.get("react")?.provider, "esm.sh");
  assertEquals(results.get("lodash")?.provider, "esm.sh");
});

Deno.test("batchVerifyCdnUrls - should handle mix of valid and invalid packages", async () => {
  const requestId = "test-req-005";
  const packages = {
    react: "18.2.0",
    "invalid-package-xyz-12345": "1.0.0",
  };

  const results = await batchVerifyCdnUrls(packages, requestId);

  assertEquals(results.size, 2);
  assertExists(results.get("react"));
  assertEquals(results.get("react")?.provider, "esm.sh");
  assertEquals(results.get("invalid-package-xyz-12345"), null);
});

Deno.test("getCdnHealthStatus - should check all CDN providers (INTEGRATION)", async () => {
  const requestId = "test-req-006";
  const health = await getCdnHealthStatus(requestId);

  assertEquals(health.length, 3);

  // Find each provider in results
  const esmsh = health.find((h) => h.provider === "esm.sh");
  const esmrun = health.find((h) => h.provider === "esm.run");
  const jsdelivr = health.find((h) => h.provider === "jsdelivr");

  assertExists(esmsh);
  assertExists(esmrun);
  assertExists(jsdelivr);

  // At least one should be healthy (unless network is down)
  const anyHealthy = health.some((h) => h.healthy);
  assertEquals(anyHealthy, true);
});

Deno.test("CDN_PROVIDERS - scoped packages should work correctly", () => {
  const esmsh = CDN_PROVIDERS[0];
  const url = esmsh.buildUrl("@radix-ui/react-dialog", "1.0.0");

  assertEquals(url, "https://esm.sh/@radix-ui/react-dialog@1.0.0?external=react,react-dom");
});

Deno.test("CDN_PROVIDERS - version prefixes should be preserved", () => {
  const esmsh = CDN_PROVIDERS[0];

  assertEquals(
    esmsh.buildUrl("lodash", "^4.17.21"),
    "https://esm.sh/lodash@^4.17.21?external=react,react-dom"
  );

  assertEquals(
    esmsh.buildUrl("lodash", "~4.17.21"),
    "https://esm.sh/lodash@~4.17.21?external=react,react-dom"
  );

  assertEquals(
    esmsh.buildUrl("lodash", ">=4.17.21"),
    "https://esm.sh/lodash@>=4.17.21?external=react,react-dom"
  );
});
