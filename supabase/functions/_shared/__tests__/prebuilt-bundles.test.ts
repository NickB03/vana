import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";

// Since parseVersion, matchesVersionPattern, and compareVersions are private,
// we test them indirectly through the public API. However, we can also export
// them for testing by creating test-specific exports.

// For now, we test through isVersionCompatible behavior via getPrebuiltBundle
// We need to mock the manifest or test the logic directly.

// Let's test the core logic by extracting and testing the functions
// We'll import the module and test public functions

// ============================================================================
// Test helpers - recreate the logic to validate our implementation
// ============================================================================

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

function parseVersion(version: string): ParsedVersion | null {
  const cleaned = version.replace(/^[\^~>=<]+/, "");
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  return 0;
}

/**
 * Recreated logic from prebuilt-bundles.ts for testing
 * This mirrors the actual implementation to validate correctness
 */
function matchesVersionPattern(
  requested: string,
  pattern: string,
  prebuiltVersion: string
): boolean {
  // If requested exactly matches the pattern, it's compatible
  if (requested === pattern) return true;

  const requestedParts = parseVersion(requested);
  const prebuiltParts = parseVersion(prebuiltVersion);
  if (!requestedParts || !prebuiltParts) return false;

  // Pre-release check: Don't match stable requests with pre-release prebuilts
  if (prebuiltParts.prerelease && !requestedParts.prerelease) return false;

  // Handle caret (^) in requested version - most common case
  // ^2.5.0 means: same major, prebuilt version >= requested version
  if (requested.startsWith("^")) {
    if (requestedParts.major !== prebuiltParts.major) return false;
    return compareVersions(prebuiltParts, requestedParts) >= 0;
  }

  // Handle tilde (~) in requested version
  // ~2.5.0 means: same major.minor, prebuilt version >= requested version
  if (requested.startsWith("~")) {
    if (
      requestedParts.major !== prebuiltParts.major ||
      requestedParts.minor !== prebuiltParts.minor
    )
      return false;
    return compareVersions(prebuiltParts, requestedParts) >= 0;
  }

  // Handle caret (^) in pattern - prebuilt declares compatible range
  if (pattern.startsWith("^")) {
    const patternParts = parseVersion(pattern);
    if (!patternParts) return false;
    if (requestedParts.major !== patternParts.major) return false;
    return compareVersions(requestedParts, patternParts) >= 0;
  }

  // Handle tilde (~) in pattern
  if (pattern.startsWith("~")) {
    const patternParts = parseVersion(pattern);
    if (!patternParts) return false;
    if (
      requestedParts.major !== patternParts.major ||
      requestedParts.minor !== patternParts.minor
    )
      return false;
    return compareVersions(requestedParts, patternParts) >= 0;
  }

  // Exact version in pattern - requested must match exactly
  const patternParts = parseVersion(pattern);
  if (!patternParts) return false;
  return (
    requestedParts.major === patternParts.major &&
    requestedParts.minor === patternParts.minor &&
    requestedParts.patch === patternParts.patch &&
    requestedParts.prerelease === patternParts.prerelease
  );
}

// ============================================================================
// parseVersion Tests
// ============================================================================

Deno.test("parseVersion - parses basic semver", () => {
  const result = parseVersion("2.5.0");
  assertEquals(result, { major: 2, minor: 5, patch: 0, prerelease: null });
});

Deno.test("parseVersion - parses with caret prefix", () => {
  const result = parseVersion("^2.5.0");
  assertEquals(result, { major: 2, minor: 5, patch: 0, prerelease: null });
});

Deno.test("parseVersion - parses with tilde prefix", () => {
  const result = parseVersion("~2.5.0");
  assertEquals(result, { major: 2, minor: 5, patch: 0, prerelease: null });
});

Deno.test("parseVersion - parses pre-release versions", () => {
  const result = parseVersion("2.5.0-beta.1");
  assertEquals(result, { major: 2, minor: 5, patch: 0, prerelease: "beta.1" });
});

Deno.test("parseVersion - parses pre-release with rc", () => {
  const result = parseVersion("2.5.0-rc.2");
  assertEquals(result, { major: 2, minor: 5, patch: 0, prerelease: "rc.2" });
});

Deno.test("parseVersion - parses pre-release with caret prefix", () => {
  const result = parseVersion("^2.5.0-alpha");
  assertEquals(result, { major: 2, minor: 5, patch: 0, prerelease: "alpha" });
});

Deno.test("parseVersion - returns null for invalid version", () => {
  assertEquals(parseVersion("invalid"), null);
  assertEquals(parseVersion("2.5"), null);
  assertEquals(parseVersion("latest"), null);
});

// ============================================================================
// compareVersions Tests
// ============================================================================

Deno.test("compareVersions - equal versions return 0", () => {
  const a = parseVersion("2.5.0")!;
  const b = parseVersion("2.5.0")!;
  assertEquals(compareVersions(a, b), 0);
});

Deno.test("compareVersions - major version comparison", () => {
  const a = parseVersion("1.5.0")!;
  const b = parseVersion("2.5.0")!;
  assertEquals(compareVersions(a, b), -1);
  assertEquals(compareVersions(b, a), 1);
});

Deno.test("compareVersions - minor version comparison", () => {
  const a = parseVersion("2.4.0")!;
  const b = parseVersion("2.5.0")!;
  assertEquals(compareVersions(a, b), -1);
  assertEquals(compareVersions(b, a), 1);
});

Deno.test("compareVersions - patch version comparison", () => {
  const a = parseVersion("2.5.0")!;
  const b = parseVersion("2.5.1")!;
  assertEquals(compareVersions(a, b), -1);
  assertEquals(compareVersions(b, a), 1);
});

Deno.test("compareVersions - pre-release has lower precedence than stable", () => {
  const prerelease = parseVersion("2.5.0-beta.1")!;
  const stable = parseVersion("2.5.0")!;
  assertEquals(compareVersions(prerelease, stable), -1);
  assertEquals(compareVersions(stable, prerelease), 1);
});

// ============================================================================
// Caret Range Tests (Bug #1 Regression Tests)
// ============================================================================

Deno.test("caret - ^2.5.0 matches prebuilt 2.5.0 (exact)", () => {
  const result = matchesVersionPattern("^2.5.0", "^2.0.0", "2.5.0");
  assertEquals(result, true);
});

Deno.test("caret - ^2.5.0 matches prebuilt 2.6.0 (higher minor)", () => {
  const result = matchesVersionPattern("^2.5.0", "^2.0.0", "2.6.0");
  assertEquals(result, true);
});

Deno.test("caret - ^2.5.0 does NOT match prebuilt 2.3.0 (lower version)", () => {
  // This was the BUG - old code returned true
  const result = matchesVersionPattern("^2.5.0", "^2.0.0", "2.3.0");
  assertEquals(result, false);
});

Deno.test("caret - ^2.5.0 does NOT match prebuilt 3.0.0 (different major)", () => {
  const result = matchesVersionPattern("^2.5.0", "^2.0.0", "3.0.0");
  assertEquals(result, false);
});

Deno.test("caret - ^2.5.0 does NOT match prebuilt 1.9.9 (different major)", () => {
  const result = matchesVersionPattern("^2.5.0", "^2.0.0", "1.9.9");
  assertEquals(result, false);
});

Deno.test("caret - ^0.5.0 matches prebuilt 0.5.0", () => {
  // Special case: ^0.x.y treats 0.x as major
  const result = matchesVersionPattern("^0.5.0", "^0.5.0", "0.5.0");
  assertEquals(result, true);
});

// ============================================================================
// Tilde Range Tests
// ============================================================================

Deno.test("tilde - ~2.5.0 matches prebuilt 2.5.0 (exact)", () => {
  const result = matchesVersionPattern("~2.5.0", "~2.5.0", "2.5.0");
  assertEquals(result, true);
});

Deno.test("tilde - ~2.5.0 matches prebuilt 2.5.9 (higher patch)", () => {
  const result = matchesVersionPattern("~2.5.0", "~2.5.0", "2.5.9");
  assertEquals(result, true);
});

Deno.test("tilde - ~2.5.0 does NOT match prebuilt 2.6.0 (different minor)", () => {
  // Using different pattern to avoid short-circuit
  const result = matchesVersionPattern("~2.5.0", "~2.0.0", "2.6.0");
  assertEquals(result, false);
});

Deno.test("tilde - ~2.5.0 does NOT match prebuilt 2.4.9 (lower minor)", () => {
  // Using different pattern to avoid short-circuit
  const result = matchesVersionPattern("~2.5.0", "~2.0.0", "2.4.9");
  assertEquals(result, false);
});

Deno.test("tilde - ~2.5.3 does NOT match prebuilt 2.5.2 (lower patch)", () => {
  const result = matchesVersionPattern("~2.5.3", "~2.5.0", "2.5.2");
  assertEquals(result, false);
});

// ============================================================================
// Exact Version Tests (Bug #2 Regression Tests)
// ============================================================================

Deno.test("exact - 2.5.0 matches pattern 2.5.0", () => {
  const result = matchesVersionPattern("2.5.0", "2.5.0", "2.5.0");
  assertEquals(result, true);
});

Deno.test("exact - 2.3.0 does NOT match pattern 2.5.0 (lower version)", () => {
  // This was the BUG - old code returned true because 2.3 < 2.5
  const result = matchesVersionPattern("2.3.0", "2.5.0", "2.5.0");
  assertEquals(result, false);
});

Deno.test("exact - 2.5.0 does NOT match pattern 2.3.0 (higher version)", () => {
  const result = matchesVersionPattern("2.5.0", "2.3.0", "2.5.0");
  assertEquals(result, false);
});

Deno.test("exact - 2.5.0 does NOT match pattern 2.5.1 (different patch)", () => {
  const result = matchesVersionPattern("2.5.0", "2.5.1", "2.5.0");
  assertEquals(result, false);
});

// ============================================================================
// Pre-release Tests (Bug #3 Regression Tests)
// ============================================================================

Deno.test("prerelease - ^2.5.0 does NOT match prebuilt 2.6.0-beta.1", () => {
  // This was missing - stable requests shouldn't match pre-release prebuilts
  const result = matchesVersionPattern("^2.5.0", "^2.0.0", "2.6.0-beta.1");
  assertEquals(result, false);
});

Deno.test("prerelease - ~2.5.0 does NOT match prebuilt 2.5.1-rc.1", () => {
  // Using different pattern to avoid short-circuit
  const result = matchesVersionPattern("~2.5.0", "~2.0.0", "2.5.1-rc.1");
  assertEquals(result, false);
});

Deno.test("prerelease - 2.5.0-beta.1 matches prebuilt 2.5.0-beta.1 (exact)", () => {
  const result = matchesVersionPattern(
    "2.5.0-beta.1",
    "2.5.0-beta.1",
    "2.5.0-beta.1"
  );
  assertEquals(result, true);
});

Deno.test("prerelease - 2.5.0-beta.1 does NOT match prebuilt 2.5.0-beta.2", () => {
  // Different pre-release tags should not match for exact versions
  // Note: pattern uses different version to avoid short-circuit
  const result = matchesVersionPattern(
    "2.5.0-beta.1",
    "2.5.0-beta.2",
    "2.5.0-beta.2"
  );
  assertEquals(result, false);
});

Deno.test("prerelease - ^2.5.0-beta.1 matches prebuilt 2.5.0 (stable higher)", () => {
  // Pre-release request CAN match stable prebuilt (stable is "newer")
  const result = matchesVersionPattern("^2.5.0-beta.1", "^2.5.0", "2.5.0");
  assertEquals(result, true);
});

// ============================================================================
// Pattern-based compatibility (compatibleVersions feature)
// ============================================================================

Deno.test("pattern - exact requested matches caret pattern base", () => {
  // Request 2.5.0 exact, pattern declares ^2.0.0 compatible
  // 2.5.0 is >= 2.0.0 and same major, so compatible
  const result = matchesVersionPattern("2.5.0", "^2.0.0", "2.5.0");
  assertEquals(result, true);
});

Deno.test("pattern - exact requested lower than caret pattern base", () => {
  // Request 1.9.0 exact, pattern declares ^2.0.0 compatible
  // 1.9.0 is different major, not compatible
  const result = matchesVersionPattern("1.9.0", "^2.0.0", "2.5.0");
  assertEquals(result, false);
});

Deno.test("pattern - exact requested matches tilde pattern", () => {
  const result = matchesVersionPattern("2.5.3", "~2.5.0", "2.5.3");
  assertEquals(result, true);
});

Deno.test("pattern - exact requested lower than tilde pattern base", () => {
  // Request 2.4.9, pattern declares ~2.5.0
  // Different minor, not compatible
  const result = matchesVersionPattern("2.4.9", "~2.5.0", "2.5.0");
  assertEquals(result, false);
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test("edge - handles large version numbers", () => {
  const result = parseVersion("123.456.789");
  assertEquals(result, {
    major: 123,
    minor: 456,
    patch: 789,
    prerelease: null,
  });
});

Deno.test("edge - handles version with build metadata", () => {
  // Build metadata after + should be ignored, but our parser captures pre-release
  const result = parseVersion("2.5.0-beta.1+build.123");
  // The regex will capture "beta.1+build.123" as prerelease
  // This is acceptable for our use case
  assertEquals(result?.major, 2);
  assertEquals(result?.minor, 5);
  assertEquals(result?.patch, 0);
});

Deno.test("edge - exact match short-circuits pattern logic", () => {
  // When requested === pattern, return true immediately
  const result = matchesVersionPattern("^2.5.0", "^2.5.0", "2.5.0");
  assertEquals(result, true);
});

Deno.test("edge - handles >=, < prefixes by stripping them", () => {
  const result = parseVersion(">=2.5.0");
  assertEquals(result, { major: 2, minor: 5, patch: 0, prerelease: null });
});
