#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * Verifies that cache-busting is working correctly after deployment.
 * Checks:
 * - index.html has no-cache headers
 * - Assets have unique hashes
 * - Service worker is updated
 * - Build hash is present in HTML
 * 
 * Usage: node scripts/verify-deployment.cjs [url]
 * Example: node scripts/verify-deployment.cjs https://your-app.com
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DIST_DIR = path.join(__dirname, '../dist');
const DEFAULT_URL = 'http://localhost:8080';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + colors.cyan + '━'.repeat(60) + colors.reset);
  log(title, 'cyan');
  console.log(colors.cyan + '━'.repeat(60) + colors.reset + '\n');
}

/**
 * Verify local build artifacts
 */
function verifyLocalBuild() {
  logSection('📦 Verifying Local Build Artifacts');

  if (!fs.existsSync(DIST_DIR)) {
    log('❌ dist/ directory not found. Run "npm run build" first.', 'red');
    return false;
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    log('❌ dist/index.html not found', 'red');
    return false;
  }

  const indexContent = fs.readFileSync(indexPath, 'utf8');

  // Check for cache control headers in HTML
  if (indexContent.includes('no-cache') && indexContent.includes('no-store')) {
    log('✅ Cache-Control headers present in index.html', 'green');
  } else {
    log('⚠️  Cache-Control headers may be missing', 'yellow');
  }

  // Check for build hash
  const buildHashMatch = indexContent.match(/data-build-hash="([^"]+)"/);
  if (buildHashMatch) {
    log(`✅ Build hash found: ${buildHashMatch[1]}`, 'green');
  } else {
    log('⚠️  Build hash not found in index.html', 'yellow');
  }

  // Check for hashed assets
  const assetsDir = path.join(DIST_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const hashedFiles = files.filter(f => f.match(/\-[a-f0-9]{8}\.(js|css)$/));
    
    if (hashedFiles.length > 0) {
      log(`✅ Found ${hashedFiles.length} hashed asset files`, 'green');
      hashedFiles.slice(0, 3).forEach(f => {
        log(`   - ${f}`, 'blue');
      });
      if (hashedFiles.length > 3) {
        log(`   ... and ${hashedFiles.length - 3} more`, 'blue');
      }
    } else {
      log('⚠️  No hashed asset files found', 'yellow');
    }
  }

  // Check for service worker
  const swPath = path.join(DIST_DIR, 'sw.js');
  if (fs.existsSync(swPath)) {
    log('✅ Service worker (sw.js) found', 'green');
  } else {
    log('⚠️  Service worker not found', 'yellow');
  }

  return true;
}

/**
 * Fetch URL and return response
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Verify remote deployment
 */
async function verifyRemoteDeployment(url) {
  logSection('🌐 Verifying Remote Deployment');

  try {
    log(`Checking ${url}...`, 'blue');
    const response = await fetchUrl(url);

    // Check status
    if (response.status === 200) {
      log(`✅ Server responding with 200 OK`, 'green');
    } else {
      log(`❌ Server returned ${response.status}`, 'red');
      return false;
    }

    // Check cache headers
    const cacheControl = response.headers['cache-control'] || '';
    if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
      log(`✅ Cache-Control header: ${cacheControl}`, 'green');
    } else {
      log(`⚠️  Cache-Control header: ${cacheControl || 'not set'}`, 'yellow');
    }

    // Check for build hash
    const buildHashMatch = response.data.match(/data-build-hash="([^"]+)"/);
    if (buildHashMatch) {
      log(`✅ Build hash in HTML: ${buildHashMatch[1]}`, 'green');
    } else {
      log('⚠️  Build hash not found in remote HTML', 'yellow');
    }

    // Check for service worker
    if (response.data.includes('registerSW') || response.data.includes('service-worker')) {
      log('✅ Service worker registration found', 'green');
    } else {
      log('⚠️  Service worker registration not found', 'yellow');
    }

    return true;
  } catch (error) {
    log(`❌ Failed to verify remote deployment: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Verify asset hashing
 */
function verifyAssetHashing() {
  logSection('🔐 Verifying Asset Hashing');

  const assetsDir = path.join(DIST_DIR, 'assets');
  if (!fs.existsSync(assetsDir)) {
    log('⚠️  assets/ directory not found', 'yellow');
    return;
  }

  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));

  log(`JavaScript files: ${jsFiles.length}`, 'blue');
  const jsWithHashes = jsFiles.filter(f => f.match(/\-[a-zA-Z0-9]{8}\.js$/)).length;
  log(`  ✅ ${jsWithHashes} files with hashes`, 'green');
  if (jsWithHashes < jsFiles.length) {
    log(`  ⚠️  ${jsFiles.length - jsWithHashes} files without hashes`, 'yellow');
  }

  log(`\nCSS files: ${cssFiles.length}`, 'blue');
  const cssWithHashes = cssFiles.filter(f => f.match(/\-[a-zA-Z0-9]{8}\.css$/)).length;
  log(`  ✅ ${cssWithHashes} files with hashes`, 'green');
  if (cssWithHashes < cssFiles.length) {
    log(`  ⚠️  ${cssFiles.length - cssWithHashes} files without hashes`, 'yellow');
  }
}

/**
 * Print recommendations
 */
function printRecommendations() {
  logSection('📋 Cache-Busting Recommendations');

  log('For optimal cache-busting in production:', 'cyan');
  log('', 'reset');
  log('1. Server Configuration:', 'blue');
  log('   - Set Cache-Control: no-cache, no-store for index.html', 'reset');
  log('   - Set Cache-Control: public, max-age=31536000 for /assets/*', 'reset');
  log('   - Set Cache-Control: public, max-age=3600 for /sw.js', 'reset');
  log('', 'reset');
  log('2. Nginx Example:', 'blue');
  log('   location = /index.html {', 'reset');
  log('     add_header Cache-Control "no-cache, no-store, must-revalidate";', 'reset');
  log('   }', 'reset');
  log('   location /assets/ {', 'reset');
  log('     add_header Cache-Control "public, max-age=31536000, immutable";', 'reset');
  log('   }', 'reset');
  log('', 'reset');
  log('3. Cloudflare/CDN:', 'blue');
  log('   - Set page rules for cache control', 'reset');
  log('   - Purge cache on deployment', 'reset');
  log('', 'reset');
  log('4. Monitoring:', 'blue');
  log('   - Check browser DevTools Network tab for cache headers', 'reset');
  log('   - Verify service worker updates in Application tab', 'reset');
}

/**
 * Main execution
 */
async function main() {
  const url = process.argv[2] || DEFAULT_URL;

  log('\n🚀 Cache-Busting Deployment Verification', 'cyan');
  log(`Build: ${new Date().toISOString()}`, 'blue');

  // Verify local build
  const localOk = verifyLocalBuild();
  if (!localOk) {
    process.exit(1);
  }

  // Verify asset hashing
  verifyAssetHashing();

  // Verify remote deployment if URL provided
  if (url !== DEFAULT_URL || process.argv[2]) {
    const remoteOk = await verifyRemoteDeployment(url);
    if (!remoteOk && process.argv[2]) {
      process.exit(1);
    }
  }

  // Print recommendations
  printRecommendations();

  log('\n✅ Verification complete!', 'green');
  log('', 'reset');
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

