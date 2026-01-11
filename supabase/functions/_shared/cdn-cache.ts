/**
 * CDN Package Cache
 *
 * Caches verified CDN URLs in Supabase with 24-hour TTL.
 * Reduces CDN health checks from ~3s to ~50ms.
 *
 * @example
 * const cached = await getCachedPackageUrl('lodash', '4.17.21', 'req-123');
 * if (cached.type === 'hit') {
 *   console.log(`Cache hit: ${cached.url} from ${cached.provider}`);
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const TTL_HOURS = 24;

/**
 * CDN provider type matching database CHECK constraint.
 * Must stay in sync with: cdn_provider IN ('esm.sh', 'esm.run', 'jsdelivr')
 */
export type CdnProvider = 'esm.sh' | 'esm.run' | 'jsdelivr';

/**
 * Result type for CDN cache lookups - discriminated union for explicit error handling.
 */
export type CacheLookupResult =
  | { type: 'hit'; url: string; provider: CdnProvider }
  | { type: 'miss' }
  | { type: 'error'; error: Error };

/**
 * Get a cached CDN URL for a package if available and fresh.
 *
 * @param pkg - Package name (e.g., 'lodash')
 * @param version - Package version (e.g., '4.17.21')
 * @param requestId - Request ID for logging
 * @param isBundle - Whether this is a bundle URL (with ?bundle flag)
 * @returns Cache lookup result with explicit type discrimination
 */
export async function getCachedPackageUrl(
  pkg: string,
  version: string,
  requestId: string,
  isBundle = false
): Promise<CacheLookupResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.warn(`[${requestId}] CDN cache: Missing Supabase config`);
    return { type: 'miss' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const cutoffTime = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("cdn_package_cache")
      .select("cdn_url, cdn_provider")
      .eq("package_name", pkg)
      .eq("version", version)
      .eq("is_bundle", isBundle)
      .gte("cached_at", cutoffTime)
      .single();

    if (error || !data) {
      return { type: 'miss' };
    }

    // Runtime validation to ensure database constraint matches TypeScript type
    if (data.cdn_provider) {
      const provider = data.cdn_provider as CdnProvider;
      if (!['esm.sh', 'esm.run', 'jsdelivr'].includes(provider)) {
        console.error(`[${requestId}] Invalid CDN provider in database: ${provider}`);
        return { type: 'miss' };
      }
      const urlType = isBundle ? "bundle" : "standard";
      console.log(`[${requestId}] CDN cache HIT: ${pkg}@${version} (${urlType}) from ${provider}`);
      return { type: 'hit', url: data.cdn_url, provider };
    }

    return { type: 'miss' };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[${requestId}] CDN cache lookup failed: ${err.message}`);
    return { type: 'error', error: err };
  }
}

/**
 * Cache a verified CDN URL for a package.
 *
 * Uses upsert to handle race conditions when multiple requests
 * try to cache the same package simultaneously.
 *
 * @param pkg - Package name
 * @param version - Package version
 * @param cdnUrl - Verified CDN URL
 * @param provider - CDN provider name (must match database constraint)
 * @param requestId - Request ID for logging
 * @param isBundle - Whether this is a bundle URL (with ?bundle flag)
 */
export async function cachePackageUrl(
  pkg: string,
  version: string,
  cdnUrl: string,
  provider: CdnProvider,
  requestId: string,
  isBundle = false
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.warn(`[${requestId}] CDN cache: Missing Supabase config, skipping cache`);
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("cdn_package_cache").upsert(
      {
        package_name: pkg,
        version: version,
        is_bundle: isBundle,
        cdn_url: cdnUrl,
        cdn_provider: provider,
        cached_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: "package_name,version,is_bundle" }
    );

    if (error) {
      console.error(`[${requestId}] CDN cache write failed:`, error.message);
    } else {
      const urlType = isBundle ? "bundle" : "standard";
      console.log(`[${requestId}] CDN cache: Stored ${pkg}@${version} (${urlType}) from ${provider}`);
    }
  } catch (error) {
    console.error(`[${requestId}] CDN cache write error:`, error);
  }
}

/**
 * Batch cache multiple package URLs.
 *
 * More efficient than individual cachePackageUrl calls for multiple packages.
 *
 * @param packages - Array of package cache entries
 * @param requestId - Request ID for logging
 */
export async function batchCachePackageUrls(
  packages: Array<{
    pkg: string;
    version: string;
    cdnUrl: string;
    provider: CdnProvider;
    isBundle?: boolean;
  }>,
  requestId: string
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey || packages.length === 0) {
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    const records = packages.map((p) => ({
      package_name: p.pkg,
      version: p.version,
      is_bundle: p.isBundle ?? false,
      cdn_url: p.cdnUrl,
      cdn_provider: p.provider,
      cached_at: now,
      last_verified_at: now,
    }));

    const { error } = await supabase
      .from("cdn_package_cache")
      .upsert(records, { onConflict: "package_name,version,is_bundle" });

    if (error) {
      console.error(`[${requestId}] Batch CDN cache write failed:`, error.message);
    } else {
      console.log(`[${requestId}] CDN cache: Batch stored ${packages.length} packages`);
    }
  } catch (error) {
    console.error(`[${requestId}] Batch CDN cache error:`, error);
  }
}
