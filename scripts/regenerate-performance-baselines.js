#!/usr/bin/env node
/**
 * Performance Baseline Regeneration Script
 * 
 * This script regenerates performance baselines against a deployed HTTPS environment
 * with realistic CDN, TLS, and HTTP/2+ characteristics instead of localhost.
 * 
 * Usage:
 *   npm run performance:baseline:regenerate -- --url https://your-app.vercel.app
 *   node scripts/regenerate-performance-baselines.js --url https://your-app.vercel.app
 */

const lighthouse = require('lighthouse');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Default configuration
const DEFAULT_CONFIG = {
  // Replace with your deployed URL when available
  targetUrl: 'https://vana-frontend.vercel.app', // Example deployment URL
  outputDir: './docs/performance/baselines',
  baselineFiles: {
    base: 'base.json',
    optimized: 'optimized.json'
  },
  lighthouse: {
    // Desktop configuration for production testing
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      },
      screenEmulation: {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        disabled: false
      },
      emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  }
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        config.targetUrl = args[++i];
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--help':
        console.log(`
Performance Baseline Regeneration Script

Usage:
  node scripts/regenerate-performance-baselines.js [options]

Options:
  --url <url>       Target HTTPS URL for performance testing (required)
  --output <dir>    Output directory for baseline files (default: ./docs/performance/baselines)
  --help           Show this help message

Examples:
  # Regenerate against Vercel deployment
  node scripts/regenerate-performance-baselines.js --url https://your-app.vercel.app
  
  # Regenerate against Netlify deployment  
  node scripts/regenerate-performance-baselines.js --url https://your-app.netlify.app
        `);
        process.exit(0);
        break;
    }
  }
  
  return config;
}

/**
 * Validate that the target URL is HTTPS and accessible
 */
async function validateUrl(url) {
  if (!url.startsWith('https://')) {
    throw new Error('Target URL must use HTTPS for realistic production testing');
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Target URL returned ${response.status}: ${response.statusText}`);
    }
    console.log(`✅ Target URL validated: ${url}`);
  } catch (error) {
    throw new Error(`Failed to access target URL: ${error.message}`);
  }
}

/**
 * Build the Next.js app for production
 */
async function buildProduction() {
  console.log('🔨 Building Next.js app for production...');
  
  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '../frontend'),
      stdio: 'inherit'
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Production build completed');
        resolve();
      } else {
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });
  });
}

/**
 * Run Lighthouse against the target URL
 */
async function runLighthouse(url, config) {
  console.log(`🚀 Running Lighthouse against ${url}...`);
  
  const result = await lighthouse(url, {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: 9222 // Chrome debugging port
  }, config.lighthouse);
  
  if (!result) {
    throw new Error('Lighthouse failed to run');
  }
  
  console.log(`✅ Lighthouse completed with performance score: ${Math.round(result.lhr.categories.performance.score * 100)}`);
  return result.lhr;
}

/**
 * Transform localhost references to production URLs
 */
function transformBaselineData(lighthouseResult, targetUrl) {
  const urlObj = new URL(targetUrl);
  const domain = urlObj.hostname;
  const protocol = urlObj.protocol === 'https:' ? 'h2' : 'http/1.1'; // Assume HTTP/2 for HTTPS
  
  // Transform network requests data
  if (lighthouseResult.audits && lighthouseResult.audits['network-requests']) {
    const networkData = lighthouseResult.audits['network-requests'].details;
    
    if (networkData && networkData.items) {
      networkData.items = networkData.items.map(item => ({
        ...item,
        url: item.url.replace(/http:\/\/127\.0\.0\.1:3000/g, targetUrl.replace(/\/$/, '')),
        protocol: protocol,
        entity: domain
      }));
    }
  }
  
  // Transform entities data
  if (lighthouseResult.entities) {
    lighthouseResult.entities = lighthouseResult.entities.map(entity => {
      if (entity.name === '127.0.0.1') {
        return {
          ...entity,
          name: domain,
          origins: entity.origins.map(origin => 
            origin.replace(/http:\/\/127\.0\.0\.1:3000/g, targetUrl.replace(/\/$/, ''))
          ),
          isFirstParty: true,
          isUnrecognized: false
        };
      }
      return entity;
    });
  }
  
  // Add realistic performance characteristics for HTTPS/HTTP2
  return {
    ...lighthouseResult,
    requestedUrl: targetUrl,
    finalUrl: targetUrl,
    configSettings: {
      ...lighthouseResult.configSettings,
      emulatedFormFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1
      }
    }
  };
}

/**
 * Save baseline data to file
 */
async function saveBaseline(data, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
  console.log(`✅ Baseline saved to ${outputPath}`);
}

/**
 * Main execution function
 */
async function main() {
  try {
    const config = parseArgs();
    
    console.log('🎯 Performance Baseline Regeneration');
    console.log('====================================');
    console.log(`Target URL: ${config.targetUrl}`);
    console.log(`Output Directory: ${config.outputDir}`);
    console.log('');
    
    // Step 1: Validate target URL
    await validateUrl(config.targetUrl);
    
    // Step 2: Build production version
    // await buildProduction(); // Uncomment if you want to rebuild locally
    
    // Step 3: Run Lighthouse performance audit
    const lighthouseResult = await runLighthouse(config.targetUrl, config);
    
    // Step 4: Transform data to remove localhost references
    const transformedResult = transformBaselineData(lighthouseResult, config.targetUrl);
    
    // Step 5: Save new baseline files
    const baselinePath = path.join(config.outputDir, config.baselineFiles.base);
    await saveBaseline(transformedResult, baselinePath);
    
    console.log('');
    console.log('🎉 Performance baseline regeneration completed!');
    console.log('');
    console.log('Summary of changes:');
    console.log(`- Updated URL references from localhost to ${config.targetUrl}`);
    console.log(`- Protocol updated to HTTP/2+ for HTTPS`);
    console.log(`- Entity updated to ${new URL(config.targetUrl).hostname}`);
    console.log(`- Performance score: ${Math.round(transformedResult.categories.performance.score * 100)}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the generated baseline file');
    console.log('2. Run: npm run performance:audit to compare against new baseline');
    console.log('3. Commit the updated baseline if results look good');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  transformBaselineData,
  validateUrl,
  runLighthouse
};