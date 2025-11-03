import { APP_VERSION } from '@/version';

/**
 * Cache Busting Utilities
 * 
 * Provides functions for:
 * - Detecting version mismatches between client and server
 * - Invalidating browser caches
 * - Verifying deployment success
 * - Managing cache headers
 */

export interface VersionInfo {
  version: string;
  commit: string;
  buildTime: number;
  buildHash?: string;
}

/**
 * Get current version info from the app
 */
export function getCurrentVersionInfo(): VersionInfo {
  return {
    version: APP_VERSION.version,
    commit: APP_VERSION.commit.short,
    buildTime: APP_VERSION.build.date.getTime(),
    buildHash: (window as any).__BUILD_HASH__ || 'unknown',
  };
}

/**
 * Store version info in sessionStorage for comparison
 * Call this on app initialization
 */
export function storeVersionInfo(): void {
  const versionInfo = getCurrentVersionInfo();
  sessionStorage.setItem('app-version-info', JSON.stringify(versionInfo));
  console.log('📦 Version info stored:', versionInfo);
}

/**
 * Check if a new version is available by comparing with stored version
 * Returns true if versions differ
 */
export function isNewVersionAvailable(): boolean {
  try {
    const stored = sessionStorage.getItem('app-version-info');
    if (!stored) return false;

    const storedVersion = JSON.parse(stored) as VersionInfo;
    const currentVersion = getCurrentVersionInfo();

    const versionChanged = storedVersion.version !== currentVersion.version;
    const commitChanged = storedVersion.commit !== currentVersion.commit;
    const buildHashChanged = storedVersion.buildHash !== currentVersion.buildHash;

    if (versionChanged || commitChanged || buildHashChanged) {
      console.log('🆕 New version detected');
      console.log('   Previous:', storedVersion);
      console.log('   Current:', currentVersion);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking version:', error);
    return false;
  }
}

/**
 * Clear all application caches
 * Useful for forcing a complete cache refresh
 */
export async function clearAllCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ All caches cleared');
    }
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

/**
 * Clear specific cache by name
 */
export async function clearCache(cacheName: string): Promise<void> {
  try {
    if ('caches' in window) {
      await caches.delete(cacheName);
      console.log(`✅ Cache cleared: ${cacheName}`);
    }
  } catch (error) {
    console.error(`Error clearing cache ${cacheName}:`, error);
  }
}

/**
 * Get list of all cached resources
 */
export async function getCachedResources(): Promise<string[]> {
  try {
    if (!('caches' in window)) return [];

    const cacheNames = await caches.keys();
    const resources: string[] = [];

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      resources.push(...keys.map(req => req.url));
    }

    return resources;
  } catch (error) {
    console.error('Error getting cached resources:', error);
    return [];
  }
}

/**
 * Force refresh of a specific resource
 */
export async function refreshResource(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    
    if (response.ok && 'caches' in window) {
      const cache = await caches.open('app-cache');
      await cache.put(url, response.clone());
    }

    return response;
  } catch (error) {
    console.error(`Error refreshing resource ${url}:`, error);
    return null;
  }
}

/**
 * Verify deployment by checking if new assets are available
 * Returns true if new assets are detected
 */
export async function verifyDeployment(): Promise<boolean> {
  try {
    // Fetch index.html with no-cache to get latest version
    const response = await fetch('/index.html', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      console.error('Deployment verification failed: index.html not found');
      return false;
    }

    const html = await response.text();
    
    // Check if new build hash is present in HTML
    const buildHashMatch = html.match(/data-build-hash="([^"]+)"/);
    const currentHash = (window as any).__BUILD_HASH__;

    if (buildHashMatch && buildHashMatch[1] !== currentHash) {
      console.log('✅ New deployment detected');
      console.log(`   Previous hash: ${currentHash}`);
      console.log(`   New hash: ${buildHashMatch[1]}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Deployment verification error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCaches: number;
  totalResources: number;
  cacheDetails: Array<{ name: string; size: number; count: number }>;
}> {
  try {
    if (!('caches' in window)) {
      return { totalCaches: 0, totalResources: 0, cacheDetails: [] };
    }

    const cacheNames = await caches.keys();
    const cacheDetails = [];
    let totalResources = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      totalResources += keys.length;
      cacheDetails.push({
        name: cacheName,
        size: keys.length,
        count: keys.length,
      });
    }

    return {
      totalCaches: cacheNames.length,
      totalResources,
      cacheDetails,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalCaches: 0, totalResources: 0, cacheDetails: [] };
  }
}

/**
 * Log cache busting information to console
 */
export async function logCacheBustingInfo(): Promise<void> {
  const versionInfo = getCurrentVersionInfo();
  const stats = await getCacheStats();

  console.group('🔄 Cache Busting Information');
  console.log('Version:', versionInfo.version);
  console.log('Commit:', versionInfo.commit);
  console.log('Build Hash:', versionInfo.buildHash);
  console.log('Build Time:', new Date(versionInfo.buildTime).toISOString());
  console.log('Cache Stats:', stats);
  console.groupEnd();
}

