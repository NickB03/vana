/**
 * Prebuilt Bundle Lookup System
 *
 * Provides fast lookup for pre-bundled npm packages. When a package matches
 * a prebuilt entry, the bundle-artifact function can use the pre-bundled URL
 * instead of generating import map entries that require browser-side fetching.
 *
 * Benefits:
 * - 5-10x faster artifact loading for common packages
 * - Reduced CDN round-trips (single bundle vs dependency tree)
 * - Consistent, tested bundle versions
 */

// Import the generated manifest (created by scripts/build-prebuilt-bundles.ts)
// @ts-expect-error - JSON import with assert syntax not fully supported by TypeScript
import manifest from "./prebuilt-bundles.json" with { type: "json" };

export interface PrebuiltPackageEntry {
  name: string;
  version: string;
  compatibleVersions: string[];
  esmUrl: string;
  bundleUrl: string;
  size: number;
  fetchTime: number;
}

export interface PrebuiltManifest {
  version: string;
  generated: string;
  packages: PrebuiltPackageEntry[];
}

// Type the imported manifest
const prebuiltManifest = manifest as PrebuiltManifest;

/**
 * Check if a requested version matches a compatible version pattern
 *
 * Supports:
 * - Exact match: "2.5.0" matches "2.5.0"
 * - Caret range: "^2.0.0" matches "2.5.0" (same major)
 * - Tilde range: "~2.5.0" matches "2.5.1" (same major.minor)
 * - Latest/tags: "latest" always matches
 */
function isVersionCompatible(
  requestedVersion: string,
  prebuiltVersion: string,
  compatibleVersions: string[]
): boolean {
  // Normalize the requested version
  const requested = requestedVersion.trim().toLowerCase();

  // Security: Reject abnormally long version strings to prevent ReDoS
  if (requested.length > 50 || prebuiltVersion.length > 50) {
    return false;
  }

  // Handle "latest" or empty
  if (requested === "latest" || requested === "") {
    return true;
  }

  // Exact match with prebuilt version
  if (requested === prebuiltVersion) {
    return true;
  }

  // Check against compatible version patterns
  for (const pattern of compatibleVersions) {
    if (matchesVersionPattern(requested, pattern, prebuiltVersion)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a requested version matches a semver pattern
 *
 * Semver rules:
 * - Caret (^): Allows changes that don't modify the left-most non-zero digit
 *   ^2.5.0 means >=2.5.0 <3.0.0
 * - Tilde (~): Allows patch-level changes
 *   ~2.5.0 means >=2.5.0 <2.6.0
 * - Exact: Must match exactly
 * - Pre-release: Only matches if explicitly requested (2.5.0-beta won't match ^2.5.0)
 */
function matchesVersionPattern(
  requested: string,
  pattern: string,
  prebuiltVersion: string
): boolean {
  // If requested exactly matches the pattern, it's compatible
  if (requested === pattern) {
    return true;
  }

  // Extract version numbers
  const requestedParts = parseVersion(requested);
  const prebuiltParts = parseVersion(prebuiltVersion);

  if (!requestedParts || !prebuiltParts) {
    return false;
  }

  // Pre-release check: Don't match stable requests with pre-release prebuilts
  // ^2.5.0 should NOT match 2.6.0-beta.1
  if (prebuiltParts.prerelease && !requestedParts.prerelease) {
    return false;
  }

  // Handle caret (^) in requested version - most common case
  // ^2.5.0 means: same major, prebuilt version >= requested version
  if (requested.startsWith("^")) {
    // Must be same major version
    if (requestedParts.major !== prebuiltParts.major) {
      return false;
    }
    // Prebuilt must be >= requested version
    return compareVersions(prebuiltParts, requestedParts) >= 0;
  }

  // Handle tilde (~) in requested version
  // ~2.5.0 means: same major.minor, prebuilt version >= requested version
  if (requested.startsWith("~")) {
    // Must be same major.minor
    if (
      requestedParts.major !== prebuiltParts.major ||
      requestedParts.minor !== prebuiltParts.minor
    ) {
      return false;
    }
    // Prebuilt must be >= requested version
    return compareVersions(prebuiltParts, requestedParts) >= 0;
  }

  // Handle caret (^) in pattern - prebuilt declares compatible range
  if (pattern.startsWith("^")) {
    const patternParts = parseVersion(pattern);
    if (!patternParts) return false;

    // Requested must be within the caret range
    if (requestedParts.major !== patternParts.major) {
      return false;
    }
    // Requested must be >= pattern base version
    return compareVersions(requestedParts, patternParts) >= 0;
  }

  // Handle tilde (~) in pattern
  if (pattern.startsWith("~")) {
    const patternParts = parseVersion(pattern);
    if (!patternParts) return false;

    // Requested must be within the tilde range
    if (
      requestedParts.major !== patternParts.major ||
      requestedParts.minor !== patternParts.minor
    ) {
      return false;
    }
    return compareVersions(requestedParts, patternParts) >= 0;
  }

  // Exact version in pattern - requested must match exactly
  // No "close enough" matching - exact means exact
  const patternParts = parseVersion(pattern);
  if (!patternParts) return false;

  return (
    requestedParts.major === patternParts.major &&
    requestedParts.minor === patternParts.minor &&
    requestedParts.patch === patternParts.patch &&
    requestedParts.prerelease === patternParts.prerelease
  );
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

/**
 * Parse a version string into components
 * Handles pre-release versions like "2.5.0-beta.1" or "2.5.0-rc.2"
 */
function parseVersion(version: string): ParsedVersion | null {
  // Remove prefix characters (^, ~, >=, etc.)
  const cleaned = version.replace(/^[\^~>=<]+/, "");

  // Match version with optional pre-release: 2.5.0 or 2.5.0-beta.1
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?/);

  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

/**
 * Compare two versions numerically
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;

  // Pre-release versions have lower precedence than stable
  // 2.5.0-beta < 2.5.0
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;

  return 0;
}

/**
 * Look up a prebuilt bundle for a package
 *
 * @param packageName - The npm package name (e.g., "recharts", "@radix-ui/react-dialog")
 * @param requestedVersion - The version requested (e.g., "^2.0.0", "2.5.0", "latest")
 * @returns The prebuilt entry if found, null otherwise
 */
export function getPrebuiltBundle(
  packageName: string,
  requestedVersion: string
): PrebuiltPackageEntry | null {
  // Find matching package by name
  const entry = prebuiltManifest.packages.find((pkg) => pkg.name === packageName);

  if (!entry) {
    return null;
  }

  // Check version compatibility
  if (isVersionCompatible(requestedVersion, entry.version, entry.compatibleVersions)) {
    return entry;
  }

  return null;
}

/**
 * Look up prebuilt bundles for multiple packages
 *
 * @param dependencies - Object mapping package names to versions
 * @returns Object with prebuilt entries and remaining dependencies
 */
export function getPrebuiltBundles(
  dependencies: Record<string, string>
): {
  prebuilt: PrebuiltPackageEntry[];
  remaining: Record<string, string>;
  stats: { prebuiltCount: number; remainingCount: number; estimatedSavingsMs: number };
} {
  const prebuilt: PrebuiltPackageEntry[] = [];
  const remaining: Record<string, string> = {};
  let estimatedSavingsMs = 0;

  for (const [name, version] of Object.entries(dependencies)) {
    // Skip React - always use window globals
    if (name === "react" || name === "react-dom") {
      continue;
    }

    const entry = getPrebuiltBundle(name, version);

    if (entry) {
      prebuilt.push(entry);
      // Estimate savings: typical CDN fetch + parse time
      estimatedSavingsMs += Math.max(1000, entry.fetchTime * 2);
    } else {
      remaining[name] = version;
    }
  }

  return {
    prebuilt,
    remaining,
    stats: {
      prebuiltCount: prebuilt.length,
      remainingCount: Object.keys(remaining).length,
      estimatedSavingsMs,
    },
  };
}

/**
 * Get manifest metadata
 */
export function getManifestInfo(): {
  version: string;
  generated: string;
  packageCount: number;
} {
  return {
    version: prebuiltManifest.version,
    generated: prebuiltManifest.generated,
    packageCount: prebuiltManifest.packages.length,
  };
}

/**
 * List all available prebuilt packages (for debugging)
 */
export function listPrebuiltPackages(): string[] {
  return prebuiltManifest.packages.map(
    (pkg) => `${pkg.name}@${pkg.version}`
  );
}
