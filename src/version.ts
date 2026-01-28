/**
 * Application Version Information
 *
 * This file is automatically updated on commits via pre-commit hook.
 * Used to verify code synchronization between GitHub and production environments.
 */

export const APP_VERSION = {
  // Semantic version - update manually for major releases
  version: '1.1.0',

  // Git commit information - auto-updated by pre-commit hook
  commit: {
    hash: 'e74dff682286c06398550c0326ece6d10fd5d31c',
    short: 'e74dff6',
    branch: 'fix/promise-race-unhandled-rejection',
    message: 'docs: January 2026 documentation update and cleanup (#577)',
  },

  // Build timestamp - auto-updated by pre-commit hook
  build: {
    timestamp: '2026-01-28 16:29:51 UTC',
    date: new Date('2026-01-28T16:29:51.587Z'),
  },

  // Environment detection
  environment: import.meta.env.MODE,

  // Feature flags for this version
  features: {
    imageFixDeployed: true,
    stableArtifactIds: true,
    publicStorageUrls: true,
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
