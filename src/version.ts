/**
 * Application Version Information
 *
 * This file is automatically updated on commits via pre-commit hook.
 * Used to verify code synchronization between GitHub and production environments.
 *
 * Build hash is injected at build time by Vite to enable cache busting.
 */

export const APP_VERSION = {
  // Semantic version - update manually for major releases
  version: '1.1.0',

  // Git commit information - auto-updated by pre-commit hook
  commit: {
    hash: '61299f80f879d7c5f58d30d175c465ff65f10e32',
    short: '61299f8',
    branch: 'main',
    message: 'feat: Implement simplified artifact generation (Phase 3) (#541)',
  },

  // Build timestamp - auto-updated by pre-commit hook
  build: {
    timestamp: '2026-01-19 18:07:24 UTC',
    date: new Date('2026-01-19T18:07:24.192Z'),
    // Build hash injected at build time - unique per build for cache busting
    hash: typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev-' + Date.now(),
  },

  // Environment detection
  environment: import.meta.env.MODE,

  // Feature flags for this version
  features: {
    imageFixDeployed: true,
    stableArtifactIds: true,
    publicStorageUrls: false,
  },
};

/**
 * Logs version information to console
 * Call this on app initialization
 */
export function logVersionInfo() {
  const styles = {
    title: 'color: #8B7BF7; font-weight: bold; font-size: 16px;',
    label: 'color: #666; font-weight: bold;',
    value: 'color: #333;',
    success: 'color: #22c55e; font-weight: bold;',
    warning: 'color: #f59e0b; font-weight: bold;',
  };

  console.log('%c🚀 AI Assistant App', styles.title);
  console.log(`%cVersion: %c${APP_VERSION.version}`, styles.label, styles.value);
  console.log(`%cCommit: %c${APP_VERSION.commit.short} (${APP_VERSION.commit.branch})`, styles.label, styles.value);
  console.log(`%cMessage: %c${APP_VERSION.commit.message}`, styles.label, styles.value);
  console.log(`%cBuild: %c${APP_VERSION.build.timestamp}`, styles.label, styles.value);
  console.log(`%cEnvironment: %c${APP_VERSION.environment}`, styles.label, styles.value);

  // Feature status
  console.log('%c\n✨ Active Features:', styles.label);
  Object.entries(APP_VERSION.features).forEach(([key, enabled]) => {
    const icon = enabled ? '✅' : '❌';
    const style = enabled ? styles.success : styles.warning;
    console.log(`  ${icon} %c${key}`, style);
  });

  console.log('\n');
}

/**
 * Returns version info as a formatted string
 */
export function getVersionString(): string {
  return `v${APP_VERSION.version} (${APP_VERSION.commit.short})`;
}

/**
 * Checks if code is up to date by comparing commit hashes
 * Returns true if running latest commit from main
 */
export function isLatestVersion(): boolean {
  // This would need to fetch from GitHub API in production
  // For now, just return true if on main branch
  return APP_VERSION.commit.branch === 'main';
}

/**
 * Get the build hash for cache busting verification
 */
export function getBuildHash(): string {
  return APP_VERSION.build.hash;
}

/**
 * Check if a different build hash is available (new deployment)
 * Compares stored build hash with current one
 */
export function hasNewBuildAvailable(): boolean {
  try {
    const stored = sessionStorage.getItem('app-build-hash');
    const current = getBuildHash();

    if (!stored) {
      sessionStorage.setItem('app-build-hash', current);
      return false;
    }

    return stored !== current;
  } catch (error) {
    console.error('Error checking build hash:', error);
    return false;
  }
}

/**
 * Update stored build hash to current version
 */
export function updateStoredBuildHash(): void {
  try {
    sessionStorage.setItem('app-build-hash', getBuildHash());
  } catch (error) {
    console.error('Error updating build hash:', error);
  }
}
