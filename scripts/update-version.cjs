#!/usr/bin/env node

/**
 * Auto-update version.ts with current git information
 * Run this script before commits to keep version info in sync
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Get git information
function getGitInfo() {
  try {
    const hash = execSync('git rev-parse HEAD').toString().trim();
    const short = execSync('git rev-parse --short HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const message = execSync('git log -1 --pretty=%s').toString().trim();

    return { hash, short, branch, message };
  } catch (error) {
    console.error('Error getting git info:', error.message);
    return {
      hash: 'unknown',
      short: 'unknown',
      branch: 'unknown',
      message: 'Unable to read git info'
    };
  }
}

// Get current timestamp
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').split('.')[0] + ' UTC';
}

// Read current version.ts to preserve version number
function getCurrentVersion() {
  const versionPath = path.join(__dirname, '../src/version.ts');
  try {
    const content = fs.readFileSync(versionPath, 'utf8');
    const match = content.match(/version:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '1.1.0';
  } catch (error) {
    return '1.1.0';
  }
}

// Generate updated version.ts content
function generateVersionFile() {
  const gitInfo = getGitInfo();
  const timestamp = getTimestamp();
  const currentVersion = getCurrentVersion();
  const isoTimestamp = new Date().toISOString();

  return `/**
 * Application Version Information
 *
 * This file is automatically updated on commits via pre-commit hook.
 * Used to verify code synchronization between GitHub and Lovable environments.
 */

export const APP_VERSION = {
  // Semantic version - update manually for major releases
  version: '${currentVersion}',

  // Git commit information - auto-updated by pre-commit hook
  commit: {
    hash: '${gitInfo.hash}',
    short: '${gitInfo.short}',
    branch: '${gitInfo.branch}',
    message: '${gitInfo.message.replace(/'/g, "\\'")}',
  },

  // Build timestamp - auto-updated by pre-commit hook
  build: {
    timestamp: '${timestamp}',
    date: new Date('${isoTimestamp}'),
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
  console.log(\`%cVersion: %c\${APP_VERSION.version}\`, styles.label, styles.value);
  console.log(\`%cCommit: %c\${APP_VERSION.commit.short} (\${APP_VERSION.commit.branch})\`, styles.label, styles.value);
  console.log(\`%cMessage: %c\${APP_VERSION.commit.message}\`, styles.label, styles.value);
  console.log(\`%cBuild: %c\${APP_VERSION.build.timestamp}\`, styles.label, styles.value);
  console.log(\`%cEnvironment: %c\${APP_VERSION.environment}\`, styles.label, styles.value);

  // Feature status
  console.log('%c\\n✨ Active Features:', styles.label);
  Object.entries(APP_VERSION.features).forEach(([key, enabled]) => {
    const icon = enabled ? '✅' : '❌';
    const style = enabled ? styles.success : styles.warning;
    console.log(\`  \${icon} %c\${key}\`, style);
  });

  console.log('\\n');
}

/**
 * Returns version info as a formatted string
 */
export function getVersionString(): string {
  return \`v\${APP_VERSION.version} (\${APP_VERSION.commit.short})\`;
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
`;
}

// Main execution
function main() {
  const versionPath = path.join(__dirname, '../src/version.ts');
  const newContent = generateVersionFile();

  try {
    fs.writeFileSync(versionPath, newContent, 'utf8');
    console.log('✅ Updated version.ts successfully');
    console.log(`   Commit: ${getGitInfo().short}`);
    console.log(`   Branch: ${getGitInfo().branch}`);
  } catch (error) {
    console.error('❌ Error updating version.ts:', error.message);
    process.exit(1);
  }
}

main();
