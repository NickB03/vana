/**
 * CDN Fallback Chain for Artifact Bundling
 *
 * Provides a resilient multi-CDN strategy for ESM package loading.
 * When the primary CDN (esm.sh) fails, automatically tries alternative providers.
 *
 * Features:
 * - Multi-provider fallback chain (esm.sh → esm.run → jsdelivr)
 * - Health verification with timeout (3s per check)
 * - Detailed logging for debugging CDN availability
 * - React externalization support (where applicable)
 *
 * @example
 * const result = await getWorkingCdnUrl('lodash', '4.17.21', requestId);
 * if (result) {
 *   console.log(`Using ${result.provider}: ${result.url}`);
 * }
 */

export interface CdnProvider {
  name: string;
  baseUrl: string;
  buildUrl: (pkg: string, version: string) => string;
  buildBundleUrl: (pkg: string, version: string) => string;
}

/**
 * CDN provider configurations in priority order.
 * esm.sh is primary due to superior React externalization support.
 */
export const CDN_PROVIDERS: readonly CdnProvider[] = [
  {
    name: 'esm.sh',
    baseUrl: 'https://esm.sh',
    buildUrl: (pkg: string, version: string) =>
      `https://esm.sh/${pkg}@${version}?external=react,react-dom`,
    buildBundleUrl: (pkg: string, version: string) =>
      `https://esm.sh/${pkg}@${version}?bundle&external=react,react-dom`,
  },
  {
    name: 'esm.run',
    baseUrl: 'https://esm.run',
    buildUrl: (pkg: string, version: string) =>
      `https://esm.run/${pkg}@${version}`,
    buildBundleUrl: (pkg: string, version: string) =>
      `https://esm.run/${pkg}@${version}`,
  },
  {
    name: 'jsdelivr',
    baseUrl: 'https://cdn.jsdelivr.net',
    buildUrl: (pkg: string, version: string) =>
      `https://cdn.jsdelivr.net/npm/${pkg}@${version}/+esm`,
    buildBundleUrl: (pkg: string, version: string) =>
      `https://cdn.jsdelivr.net/npm/${pkg}@${version}/+esm`,
  },
] as const;

/**
 * Verify a CDN URL is accessible with timeout protection.
 *
 * Uses HEAD request to minimize bandwidth and check availability.
 * AbortController ensures requests don't hang indefinitely.
 *
 * @param url - CDN URL to verify
 * @param timeoutMs - Maximum wait time in milliseconds (default: 3000ms)
 * @returns true if URL is accessible (2xx status), false otherwise
 */
export async function verifyCdnUrl(url: string, timeoutMs = 3000): Promise<boolean> {
  let timeoutId: number | undefined;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    // Clear timeout before any other operations to prevent race condition
    const savedTimeoutId = timeoutId;
    timeoutId = undefined;
    clearTimeout(savedTimeoutId);
    return response.ok; // 2xx status
  } catch (error) {
    // Timeout, network error, or non-2xx status
    // Ensure timeout is cleared even on error
    if (timeoutId !== undefined) {
      const savedTimeoutId = timeoutId;
      timeoutId = undefined;
      clearTimeout(savedTimeoutId);
    }
    return false;
  }
}

/**
 * Get working CDN URL with automatic fallback.
 *
 * Tries each CDN provider in sequence until one responds successfully.
 * Logs all attempts for debugging CDN availability issues.
 *
 * @param pkg - Package name (e.g., 'lodash', '@radix-ui/react-dialog')
 * @param version - Package version (e.g., '4.17.21', '^1.0.0')
 * @param requestId - Request ID for logging correlation
 * @param useBundleUrl - If true, use bundleUrl (prebuilt packages), otherwise use standard URL
 * @returns Object with working URL and provider name, or null if all providers fail
 *
 * @example
 * const result = await getWorkingCdnUrl('lodash', '4.17.21', 'req-123');
 * if (result) {
 *   importMap[pkg] = result.url; // Use working URL
 * }
 */
export async function getWorkingCdnUrl(
  pkg: string,
  version: string,
  requestId: string,
  useBundleUrl = false
): Promise<{ url: string; provider: string } | null> {
  for (const cdn of CDN_PROVIDERS) {
    const url = useBundleUrl ? cdn.buildBundleUrl(pkg, version) : cdn.buildUrl(pkg, version);
    console.log(`[${requestId}] Trying ${cdn.name} for ${pkg}@${version}...`);

    if (await verifyCdnUrl(url)) {
      console.log(`[${requestId}] ✓ ${cdn.name} works for ${pkg}`);
      return { url, provider: cdn.name };
    }

    console.log(`[${requestId}] ✗ ${cdn.name} failed for ${pkg}`);
  }

  console.error(`[${requestId}] All CDN providers failed for ${pkg}@${version}`);
  return null;
}

/**
 * Batch verify multiple packages across CDN providers.
 *
 * Useful for preemptively checking CDN health before bundling.
 * Returns a map of package names to working CDN providers.
 *
 * @param packages - Record of package names to versions
 * @param requestId - Request ID for logging correlation
 * @returns Map of package names to { url, provider } or null if no working CDN
 *
 * @example
 * const results = await batchVerifyCdnUrls({ lodash: '4.17.21', axios: '1.4.0' }, 'req-123');
 * results.forEach((result, pkg) => {
 *   if (result) console.log(`${pkg} available on ${result.provider}`);
 * });
 */
export async function batchVerifyCdnUrls(
  packages: Record<string, string>,
  requestId: string
): Promise<Map<string, { url: string; provider: string } | null>> {
  const results = new Map<string, { url: string; provider: string } | null>();

  // Check all packages in parallel (don't block on each one)
  await Promise.all(
    Object.entries(packages).map(async ([pkg, version]) => {
      const result = await getWorkingCdnUrl(pkg, version, requestId);
      results.set(pkg, result);
    })
  );

  return results;
}

/**
 * Get health status of all CDN providers.
 *
 * Useful for monitoring and diagnostics.
 * Checks a common package (react) to verify each CDN is operational.
 *
 * @param requestId - Request ID for logging correlation
 * @returns Array of { provider, healthy } objects
 *
 * @example
 * const health = await getCdnHealthStatus('req-123');
 * health.forEach(({ provider, healthy }) => {
 *   console.log(`${provider}: ${healthy ? 'UP' : 'DOWN'}`);
 * });
 */
export async function getCdnHealthStatus(
  requestId: string
): Promise<Array<{ provider: string; healthy: boolean }>> {
  const testPackage = 'react';
  const testVersion = '18.2.0';

  const results = await Promise.all(
    CDN_PROVIDERS.map(async (cdn) => {
      const url = cdn.buildUrl(testPackage, testVersion);
      const healthy = await verifyCdnUrl(url, 5000); // 5s timeout for health checks
      console.log(`[${requestId}] CDN health check - ${cdn.name}: ${healthy ? 'UP' : 'DOWN'}`);
      return { provider: cdn.name, healthy };
    })
  );

  return results;
}
