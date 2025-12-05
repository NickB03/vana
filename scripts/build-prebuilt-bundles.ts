#!/usr/bin/env -S deno run --allow-net --allow-write --allow-read --allow-env

/**
 * Pre-bundle Common Dependencies Script
 *
 * This script generates a manifest of commonly used npm packages with esm.sh
 * ?bundle URLs. Using ?bundle tells esm.sh to serve a single-file bundle
 * (instead of a module with imports), which eliminates dependency tree fetching.
 *
 * Usage:
 *   deno run --allow-net --allow-write --allow-read --allow-env scripts/build-prebuilt-bundles.ts
 *
 * Or with task runner:
 *   deno task prebuild
 *
 * How it works:
 * 1. Generates esm.sh URLs with ?bundle&external=react,react-dom
 * 2. Verifies each URL is accessible (the response is a small stub module)
 * 3. Creates a manifest JSON file for the Edge Function to use
 *
 * IMPORTANT: The "size" in the manifest is the stub size (~100-200 bytes), not the
 * actual bundle size. esm.sh returns a stub like:
 *   export * from "/recharts@2.15.0/.../recharts.bundle.mjs";
 *
 * The browser follows this re-export to fetch the real bundle (~100KB-500KB),
 * which esm.sh serves from its CDN edge cache. The benefit is:
 * - First request: esm.sh bundles at edge (~1-2s, one-time)
 * - Subsequent requests: Cached bundle served instantly from nearest CDN node
 */

interface PrebuiltPackage {
  name: string;
  version: string;
  // Alternative versions that can use this prebuilt (semver compatible)
  compatibleVersions?: string[];
}

interface PrebuiltManifest {
  version: string;
  generated: string;
  packages: PrebuiltPackageEntry[];
}

interface PrebuiltPackageEntry {
  name: string;
  version: string;
  compatibleVersions: string[];
  esmUrl: string;
  bundleUrl: string;
  size: number;
  fetchTime: number;
}

// Top packages based on common artifact usage patterns
// IMPORTANT: Only include packages that do NOT import from "react" internally!
// Packages that import React hooks break with ?bundle because esm.sh's nested
// bundle files resolve "react" relative to esm.sh, not our import map shims.
//
// EXCLUDED (use React internally - breaks with ?bundle):
// - recharts (uses React hooks)
// - @radix-ui/* (use React hooks like useInsertionEffect)
// - framer-motion (uses useInsertionEffect)
// - lucide-react (React component library)
// - react-hook-form (React hooks library)
// - @dnd-kit/* (React hooks library)
//
// These packages work fine with our existing import map + ?external=react,react-dom approach.
// The ?bundle optimization only works for packages with NO React dependencies.
const PREBUILT_PACKAGES: PrebuiltPackage[] = [
  // Pure utility libraries (no React dependencies - safe for ?bundle)
  { name: "date-fns", version: "4.1.0", compatibleVersions: ["^4.0.0"] },
  { name: "clsx", version: "2.1.1", compatibleVersions: ["^2.0.0", "^1.0.0"] },
  { name: "class-variance-authority", version: "0.7.1", compatibleVersions: ["^0.7.0", "^0.6.0"] },
];

/**
 * Build the esm.sh URL for a package with bundling and React externalized
 */
function buildBundleUrl(name: string, version: string): string {
  // Use ?bundle to get a self-contained ESM bundle (no additional fetches needed)
  // Use ?external=react,react-dom so the bundle uses window.React globals
  return `https://esm.sh/${name}@${version}?bundle&external=react,react-dom`;
}

/**
 * Build the standard esm.sh URL (for import map reference)
 */
function buildEsmUrl(name: string, version: string): string {
  return `https://esm.sh/${name}@${version}?external=react,react-dom`;
}

/**
 * Fetch a package bundle and measure timing
 */
async function fetchPackageBundle(
  name: string,
  version: string
): Promise<{ size: number; fetchTime: number } | null> {
  const bundleUrl = buildBundleUrl(name, version);
  console.log(`  Fetching ${name}@${version}...`);

  const startTime = Date.now();

  try {
    const response = await fetch(bundleUrl, {
      headers: {
        "User-Agent": "Vana-Prebuild-Script/1.0",
      },
    });

    if (!response.ok) {
      console.error(`    Failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const content = await response.text();
    const fetchTime = Date.now() - startTime;
    const size = new TextEncoder().encode(content).length;

    console.log(`    OK: ${(size / 1024).toFixed(1)}KB in ${fetchTime}ms`);

    return { size, fetchTime };
  } catch (error) {
    console.error(`    Error: ${error}`);
    return null;
  }
}

/**
 * Main build function
 */
async function buildPrebuiltBundles(): Promise<void> {
  console.log("Building prebuilt bundle manifest...\n");
  console.log(`Processing ${PREBUILT_PACKAGES.length} packages:\n`);

  const entries: PrebuiltPackageEntry[] = [];
  let totalSize = 0;
  let successCount = 0;
  let failCount = 0;

  for (const pkg of PREBUILT_PACKAGES) {
    const result = await fetchPackageBundle(pkg.name, pkg.version);

    if (result) {
      entries.push({
        name: pkg.name,
        version: pkg.version,
        compatibleVersions: pkg.compatibleVersions || [],
        esmUrl: buildEsmUrl(pkg.name, pkg.version),
        bundleUrl: buildBundleUrl(pkg.name, pkg.version),
        size: result.size,
        fetchTime: result.fetchTime,
      });
      totalSize += result.size;
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n----------------------------------------");
  console.log(`Processed: ${successCount} success, ${failCount} failed`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

  // Generate manifest
  const manifest: PrebuiltManifest = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    packages: entries,
  };

  // Write manifest to _shared directory
  const manifestPath = new URL(
    "../supabase/functions/_shared/prebuilt-bundles.json",
    import.meta.url
  );

  await Deno.writeTextFile(
    manifestPath,
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\nManifest written to: supabase/functions/_shared/prebuilt-bundles.json`);
  console.log("\nPrebuilt bundles ready!");
}

// Run the build
await buildPrebuiltBundles();
