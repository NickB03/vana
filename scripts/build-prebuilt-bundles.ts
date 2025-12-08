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
  // Whether package is pure (no React dependencies) - safe for ?bundle optimization
  pure?: boolean;
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
//
// NOTE: This list includes ALL packages we want to prebuilt, including those with React dependencies.
// For React-dependent packages, we DON'T use ?bundle (which breaks hooks), but we still fetch
// the standard esm.sh URL to measure real fetchTime for accurate performance estimates.
//
// Packages are categorized:
// - PURE: No React dependencies - can use ?bundle optimization
// - REACT: Uses React hooks - must use standard esm.sh URL (no ?bundle)
//
const PREBUILT_PACKAGES: PrebuiltPackage[] = [
  // ===== PURE UTILITY LIBRARIES (no React dependencies - safe for ?bundle) =====
  { name: "date-fns", version: "4.1.0", compatibleVersions: ["^4.0.0"], pure: true },
  { name: "clsx", version: "2.1.1", compatibleVersions: ["^2.0.0", "^1.0.0"], pure: true },
  { name: "class-variance-authority", version: "0.7.1", compatibleVersions: ["^0.7.0", "^0.6.0"], pure: true },
  { name: "tailwind-merge", version: "2.6.0", compatibleVersions: ["^2.0.0"], pure: true },
  { name: "uuid", version: "11.0.3", compatibleVersions: ["^11.0.0", "^10.0.0", "^9.0.0"], pure: true },

  // ===== RADIX UI COMPONENTS (use React hooks - no ?bundle) =====
  // Updated 2025-12-06 to latest versions
  { name: "@radix-ui/react-dialog", version: "1.1.15", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-dropdown-menu", version: "2.1.16", compatibleVersions: ["^2.0.0"], pure: false },
  { name: "@radix-ui/react-select", version: "2.2.6", compatibleVersions: ["^2.0.0"], pure: false },
  { name: "@radix-ui/react-tabs", version: "1.1.13", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-tooltip", version: "1.2.8", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-popover", version: "1.1.15", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-accordion", version: "1.2.12", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-checkbox", version: "1.3.3", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-radio-group", version: "1.3.8", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-switch", version: "1.2.6", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-slider", version: "1.3.6", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-scroll-area", version: "1.2.10", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-avatar", version: "1.1.11", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-progress", version: "1.1.8", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "@radix-ui/react-separator", version: "1.1.8", compatibleVersions: ["^1.0.0"], pure: false },

  // ===== OTHER REACT LIBRARIES (use React hooks - no ?bundle) =====
  // Note: recharts kept at 2.15.0 (v3 has breaking changes requiring migration)
  { name: "recharts", version: "2.15.0", compatibleVersions: ["^2.0.0"], pure: false },
  { name: "lucide-react", version: "0.556.0", compatibleVersions: ["^0.400.0", "^0.500.0"], pure: false },
  { name: "@tanstack/react-query", version: "5.90.12", compatibleVersions: ["^5.0.0"], pure: false },

  // ===== STATE & FORMS (Phase 1) =====
  // Note: zustand uses React hooks but works with pure:true because external=react,react-dom
  // externalizes React to window globals. Monitor for issues; change to pure:false if needed.
  { name: "zustand", version: "5.0.2", compatibleVersions: ["^5.0.0"], pure: true },
  { name: "immer", version: "10.1.1", compatibleVersions: ["^10.0.0"], pure: true },
  { name: "react-hook-form", version: "7.54.2", compatibleVersions: ["^7.0.0"], pure: false },
  { name: "zod", version: "3.24.1", compatibleVersions: ["^3.0.0"], pure: true },
  { name: "@hookform/resolvers", version: "3.10.0", compatibleVersions: ["^3.0.0"], pure: false },
  { name: "papaparse", version: "5.4.1", compatibleVersions: ["^5.0.0"], pure: true },

  // ===== UI ESSENTIALS (Phase 1) =====
  { name: "sonner", version: "1.7.1", compatibleVersions: ["^1.0.0"], pure: false },
  { name: "embla-carousel-react", version: "8.5.1", compatibleVersions: ["^8.0.0"], pure: false },
  { name: "react-loading-skeleton", version: "3.5.0", compatibleVersions: ["^3.0.0"], pure: false },
  { name: "@formkit/auto-animate", version: "0.8.2", compatibleVersions: ["^0.8.0"], pure: false },

  // ===== ANIMATION (Phase 1) =====
  { name: "react-spring", version: "9.7.5", compatibleVersions: ["^9.0.0"], pure: false },

  // ===== DATA (Phase 1) =====
  { name: "@tanstack/react-table", version: "8.20.6", compatibleVersions: ["^8.0.0"], pure: false },
  { name: "nanoid", version: "5.0.9", compatibleVersions: ["^5.0.0", "^4.0.0"], pure: true },

  // ===== PHASE 2: DATA VISUALIZATION =====
  // Flowcharts & Diagrams
  { name: "@xyflow/react", version: "12.3.6", compatibleVersions: ["^12.0.0"], pure: false },
  { name: "react-grid-layout", version: "1.5.0", compatibleVersions: ["^1.0.0"], pure: false },

  // Charts (Nivo - modular)
  { name: "@nivo/core", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },
  { name: "@nivo/bar", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },
  { name: "@nivo/line", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },
  { name: "@nivo/pie", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },

  // Chart.js
  { name: "chart.js", version: "4.4.7", compatibleVersions: ["^4.0.0"], pure: true },
  { name: "react-chartjs-2", version: "5.2.0", compatibleVersions: ["^5.0.0"], pure: false },

  // ===== PHASE 3: GAMES & INTERACTIVE =====
  // 2D Canvas
  { name: "konva", version: "9.3.18", compatibleVersions: ["^9.0.0"], pure: true },
  { name: "react-konva", version: "18.2.10", compatibleVersions: ["^18.0.0"], pure: false },

  // Physics
  { name: "matter-js", version: "0.20.0", compatibleVersions: ["^0.20.0", "^0.19.0"], pure: true },

  // Gestures
  { name: "@use-gesture/react", version: "10.3.1", compatibleVersions: ["^10.0.0"], pure: false },

  // Animation
  { name: "gsap", version: "3.12.5", compatibleVersions: ["^3.0.0"], pure: true },

  // Audio
  { name: "howler", version: "2.2.4", compatibleVersions: ["^2.0.0"], pure: true },

  // Drag & Drop
  { name: "@dnd-kit/core", version: "6.3.1", compatibleVersions: ["^6.0.0"], pure: false },
  { name: "@dnd-kit/sortable", version: "9.0.0", compatibleVersions: ["^9.0.0"], pure: false },
  { name: "@dnd-kit/utilities", version: "3.2.2", compatibleVersions: ["^3.0.0"], pure: false },

  // ===== PHASE 4: 3D & WEBGL =====
  // Core 3D Engine (pure - no React dependencies)
  { name: "three", version: "0.170.0", compatibleVersions: ["^0.170.0", "^0.160.0"], pure: true },

  // React Integration (requires React context - no ?bundle)
  { name: "@react-three/fiber", version: "8.17.10", compatibleVersions: ["^8.0.0"], pure: false },
  { name: "@react-three/drei", version: "9.117.3", compatibleVersions: ["^9.0.0"], pure: false },

  // Animation & Physics (React-specific)
  { name: "@react-spring/three", version: "9.7.5", compatibleVersions: ["^9.0.0"], pure: false },
  { name: "@react-three/rapier", version: "1.5.0", compatibleVersions: ["^1.0.0"], pure: false },

  // Helpers & Utilities (TypeScript types - pure, three-stdlib - pure)
  { name: "three-stdlib", version: "2.35.12", compatibleVersions: ["^2.0.0"], pure: true },
  { name: "@types/three", version: "0.170.0", compatibleVersions: ["^0.170.0", "^0.160.0"], pure: true },

  // Post-processing (React-specific)
  { name: "@react-three/postprocessing", version: "2.16.3", compatibleVersions: ["^2.0.0"], pure: false },
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
 * Fetch with retry and exponential backoff for rate limiting
 */
async function fetchWithRetry(
  url: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": "Vana-Prebuild-Script/1.0" },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
      const delay = retryAfter * 1000 * (attempt + 1);
      console.log(`    Rate limited, retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    return response;
  }

  throw new Error(`Failed after ${maxRetries} retries (rate limited)`);
}

/**
 * Fetch a package and measure timing
 *
 * For pure packages: Uses ?bundle URL for single-file optimization
 * For React packages: Uses standard esm.sh URL (no ?bundle to preserve hooks)
 *
 * @param name - Package name
 * @param version - Package version
 * @param pure - If true, use ?bundle URL; if false, use standard URL
 */
async function fetchPackageBundle(
  name: string,
  version: string,
  pure = true
): Promise<{ size: number; fetchTime: number } | null> {
  const url = pure ? buildBundleUrl(name, version) : buildEsmUrl(name, version);
  const urlType = pure ? "bundle" : "standard";
  console.log(`  Fetching ${name}@${version} (${urlType})...`);

  const startTime = Date.now();

  try {
    const response = await fetchWithRetry(url);

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
 *
 * Fetches all packages in parallel (with concurrency limit) to speed up the build.
 * Pure packages get ?bundle URLs, React packages get standard URLs.
 */
async function buildPrebuiltBundles(): Promise<void> {
  console.log("Building prebuilt bundle manifest...\n");
  console.log(`Processing ${PREBUILT_PACKAGES.length} packages:\n`);

  const CONCURRENCY_LIMIT = 10; // Increased for 70+ package builds (esm.sh CDN handles this well)

  const entries: PrebuiltPackageEntry[] = [];
  let totalSize = 0;
  let successCount = 0;
  let failCount = 0;

  // Process packages in batches to limit concurrency
  for (let i = 0; i < PREBUILT_PACKAGES.length; i += CONCURRENCY_LIMIT) {
    const batch = PREBUILT_PACKAGES.slice(i, i + CONCURRENCY_LIMIT);
    console.log(`\n--- Batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(PREBUILT_PACKAGES.length / CONCURRENCY_LIMIT)} ---`);

    const batchResults = await Promise.all(
      batch.map(async (pkg) => {
        const isPure = pkg.pure !== false; // Default to true if not specified
        const result = await fetchPackageBundle(pkg.name, pkg.version, isPure);

        if (result) {
          return {
            success: true as const,
            entry: {
              name: pkg.name,
              version: pkg.version,
              compatibleVersions: pkg.compatibleVersions || [],
              esmUrl: buildEsmUrl(pkg.name, pkg.version),
              // Only use bundleUrl for pure packages; React packages use esmUrl for both
              bundleUrl: isPure ? buildBundleUrl(pkg.name, pkg.version) : buildEsmUrl(pkg.name, pkg.version),
              size: result.size,
              fetchTime: result.fetchTime,
            },
          };
        }
        return { success: false as const, name: pkg.name };
      })
    );

    for (const result of batchResults) {
      if (result.success) {
        entries.push(result.entry);
        totalSize += result.entry.size;
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  console.log("\n----------------------------------------");
  console.log(`Processed: ${successCount} success, ${failCount} failed`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

  // Generate manifest
  const manifest: PrebuiltManifest = {
    version: "2.2.0",
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
