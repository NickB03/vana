/**
 * Bundle Cache System
 *
 * Hash-based caching for bundled artifacts using single content_hash.
 * Uses Web Crypto API (crypto.subtle.digest) for SHA-256 hashing.
 *
 * Cache hit returns immediately with a fresh signed URL, avoiding
 * the 2-5s bundling process entirely.
 *
 * @example
 * const hash = await generateContentHash(code, dependencies, bundleReact, title);
 * const cached = await lookupBundleCache(supabase, hash, requestId);
 * if (cached.hit) {
 *   return cached.freshUrl; // Instant response
 * }
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

/**
 * Bundle schema version for cache invalidation.
 *
 * Increment this version when ANY of these change:
 * - HTML template structure (bundle-artifact/index.ts lines 402-489)
 *   Example: Adding new <meta> tags, changing <div id="root"> structure
 * - CSP headers (bundle-artifact/index.ts line 407-412)
 *   Example: Adding new CSP directives or changing nonce generation
 * - React shims (REACT_SHIM, JSX_RUNTIME_SHIM, REACT_DOM_SHIM constants)
 *   Example: Updating React version or changing how window.React is exposed
 * - Import map format or resolution logic
 *   Example: Changing how dependencies are mapped or adding new externalization
 * - UMD script URLs (unpkg.com versions, esm.sh externalization parameters)
 *   Example: Upgrading React from 18.3.1 to 19.0.0
 *
 * When to increment:
 * - After ANY change above, increment from 1 → 2
 * - All existing cached bundles will be invalidated
 * - New bundles will use schema version 2
 * - Old bundles with version 1 will be regenerated on next request
 *
 * Current version: 1 (set on 2026-01-10)
 */
const BUNDLE_SCHEMA_VERSION = 1;

export interface BundleCacheEntry {
  content_hash: string;
  storage_path: string;
  bundle_url: string;
  bundle_size: number;
  hit_count: number;
  expires_at: string;
}

/**
 * Generate SHA-256 hash using Web Crypto API.
 *
 * Creates a deterministic hash from code, sorted dependencies, and
 * render-affecting options (bundleReact, title). All parameters that
 * change the generated HTML must be included to prevent cache collisions.
 *
 * Hash includes schema version to invalidate caches when bundler logic changes.
 * Increment BUNDLE_SCHEMA_VERSION when modifying HTML template, CSP headers,
 * React shims, or import map format.
 *
 * @param code - The artifact source code
 * @param dependencies - Map of package names to versions
 * @param bundleReact - Whether to use ESM React (affects HTML output)
 * @param title - Artifact title (embedded in HTML <title>)
 * @returns 64-character hex string (SHA-256)
 */
export async function generateContentHash(
  code: string,
  dependencies: Record<string, string>,
  bundleReact: boolean = false,
  title: string = ""
): Promise<string> {
  // Sort dependencies for deterministic hashing
  const sortedDeps = Object.entries(dependencies)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pkg, version]) => `${pkg}@${version}`)
    .join(",");

  // Include all render-affecting options in hash to prevent cache collisions
  // BUNDLE_SCHEMA_VERSION: invalidates cache when bundler logic changes
  // bundleReact: changes UMD vs ESM script loading
  // title: embedded in HTML <title> tag
  const reactMode = bundleReact ? "esm" : "umd";
  const content = `v${BUNDLE_SCHEMA_VERSION}|${code}|${sortedDeps}|${reactMode}|${title}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Use Web Crypto API (works in Deno and browsers)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Look up cached bundle by content hash.
 *
 * If found and not expired, regenerates a fresh signed URL
 * (since signed URLs expire independently of cache entries).
 *
 * @param supabase - Supabase client with service role
 * @param contentHash - SHA-256 hash of code + dependencies
 * @param requestId - Request ID for logging
 * @returns Cache hit status with optional fresh URL
 */
export async function lookupBundleCache(
  supabase: SupabaseClient,
  contentHash: string,
  requestId: string
): Promise<{ hit: boolean; entry?: BundleCacheEntry; freshUrl?: string }> {
  const shortHash = contentHash.slice(0, 16);
  console.log(`[${requestId}] Bundle cache lookup: ${shortHash}...`);

  const { data: entry, error } = await supabase
    .from("bundle_cache")
    .select("*")
    .eq("content_hash", contentHash)
    .single();

  if (error || !entry) {
    console.log(`[${requestId}] Bundle cache MISS`);
    return { hit: false };
  }

  // Check expiry
  if (new Date(entry.expires_at) < new Date()) {
    console.log(`[${requestId}] Bundle cache EXPIRED`);
    return { hit: false };
  }

  console.log(`[${requestId}] Bundle cache HIT! hits: ${entry.hit_count}`);

  // Regenerate signed URL (signed URLs expire independently)
  const expiresIn = 2419200; // 4 weeks in seconds
  const { data: signedData, error: signError } = await supabase.storage
    .from("artifact-bundles")
    .createSignedUrl(entry.storage_path, expiresIn);

  if (signError || !signedData?.signedUrl) {
    console.error(`[${requestId}] Failed to regenerate signed URL:`, signError?.message);
    return { hit: false };
  }

  // Update stats (fire-and-forget, don't block response)
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

  return { hit: true, entry, freshUrl: signedData.signedUrl };
}

/**
 * Store bundle in cache.
 *
 * Uses upsert to handle race conditions when identical artifacts
 * are bundled simultaneously.
 *
 * @param supabase - Supabase client with service role
 * @param contentHash - SHA-256 hash of code + dependencies
 * @param storagePath - Path in artifact-bundles bucket
 * @param bundleUrl - Signed URL for the bundle
 * @param bundleSize - Size in bytes
 * @param dependencyCount - Number of npm dependencies
 * @param requestId - Request ID for logging
 */
export async function storeBundleCache(
  supabase: SupabaseClient,
  contentHash: string,
  storagePath: string,
  bundleUrl: string,
  bundleSize: number,
  dependencyCount: number,
  requestId: string
): Promise<void> {
  // 4 weeks TTL
  const expiresAt = new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const shortHash = contentHash.slice(0, 16);

  console.log(`[${requestId}] Caching bundle: ${shortHash}... (${bundleSize} bytes)`);

  // Use error-based upsert to preserve hit_count on race conditions.
  // Insert first; if unique constraint fails (23505), update non-analytics fields only.
  // This preserves hit_count while refreshing storage_path/bundle_url/expires_at.
  const { error: insertError } = await supabase.from("bundle_cache").insert({
    content_hash: contentHash,
    storage_path: storagePath,
    bundle_url: bundleUrl,
    bundle_size: bundleSize,
    dependency_count: dependencyCount,
    expires_at: expiresAt,
    hit_count: 0,
  });

  // If insert failed due to unique constraint, update non-analytics fields only
  let error = insertError;
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
        // hit_count intentionally NOT updated - preserves analytics
      })
      .eq("content_hash", contentHash);
    error = updateError;
  }

  if (error) {
    console.error(`[${requestId}] Bundle cache write failed:`, error.message);
  } else {
    console.log(`[${requestId}] Bundle cached successfully`);
  }
}

/**
 * Invalidate a cached bundle (e.g., for debugging or forced refresh).
 *
 * @param supabase - Supabase client with service role
 * @param contentHash - SHA-256 hash to invalidate
 * @param requestId - Request ID for logging
 */
export async function invalidateBundleCache(
  supabase: SupabaseClient,
  contentHash: string,
  requestId: string
): Promise<void> {
  const { error } = await supabase
    .from("bundle_cache")
    .delete()
    .eq("content_hash", contentHash);

  if (error) {
    console.error(`[${requestId}] Bundle cache invalidation failed:`, error.message);
  } else {
    console.log(`[${requestId}] Bundle cache invalidated: ${contentHash.slice(0, 16)}...`);
  }
}
