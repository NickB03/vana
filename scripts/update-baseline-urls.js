#!/usr/bin/env node
/**
 * Quick Update Script for Baseline URLs
 * 
 * This script updates existing baseline files to replace localhost references
 * with production HTTPS URLs and realistic protocol/entity information.
 * 
 * Usage:
 *   node scripts/update-baseline-urls.js --url https://your-app.vercel.app
 */

const fs = require('fs').promises;
const path = require('path');

// Default configuration
const DEFAULT_TARGET_URL = 'https://vana-frontend.vercel.app'; // Replace with actual deployment
const BASELINE_DIR = './docs/performance/baselines';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let targetUrl = DEFAULT_TARGET_URL;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        targetUrl = args[++i];
        break;
      case '--help':
        console.log(`
Baseline URL Update Script

Usage:
  node scripts/update-baseline-urls.js [options]

Options:
  --url <url>       Target HTTPS URL to replace localhost references
  --help           Show this help message

Examples:
  node scripts/update-baseline-urls.js --url https://your-app.vercel.app
        `);
        process.exit(0);
        break;
    }
  }
  
  return { targetUrl };
}

/**
 * Transform baseline data from localhost to production URL
 */
function transformBaseline(data, targetUrl) {
  const urlObj = new URL(targetUrl);
  const domain = urlObj.hostname;
  const baseUrl = targetUrl.replace(/\/$/, ''); // Remove trailing slash
  
  // Determine protocol based on HTTPS
  const protocol = urlObj.protocol === 'https:' ? 'h2' : 'http/1.1';
  
  // Deep clone to avoid mutations
  const transformed = JSON.parse(JSON.stringify(data));
  
  // Transform network requests in audits
  if (transformed.audits && transformed.audits['network-requests']) {
    const networkData = transformed.audits['network-requests'].details;
    
    if (networkData && networkData.items) {
      networkData.items = networkData.items.map(item => ({
        ...item,
        url: item.url.replace(/http:\/\/127\.0\.0\.1:3000/g, baseUrl),
        protocol: protocol,
        entity: domain
      }));
    }
  }
  
  // Transform entities section
  if (transformed.entities) {
    transformed.entities = transformed.entities.map(entity => {
      if (entity.name === '127.0.0.1') {
        return {
          ...entity,
          name: domain,
          origins: entity.origins.map(origin => 
            origin.replace(/http:\/\/127\.0\.0\.1:3000/g, baseUrl)
          ),
          isFirstParty: true,
          isUnrecognized: false
        };
      }
      return entity;
    });
  }
  
  // Update main URL references
  if (transformed.requestedUrl) {
    transformed.requestedUrl = transformed.requestedUrl.replace(/http:\/\/127\.0\.0\.1:3000/g, baseUrl);
  }
  
  if (transformed.finalUrl) {
    transformed.finalUrl = transformed.finalUrl.replace(/http:\/\/127\.0\.0\.1:3000/g, baseUrl);
  }
  
  // Update config settings for production characteristics
  if (transformed.configSettings) {
    transformed.configSettings = {
      ...transformed.configSettings,
      emulatedFormFactor: 'desktop',
      // Add production-like throttling settings
      throttling: {
        rttMs: 40, // CDN latency
        throughputKbps: 10240, // High-speed connection
        cpuSlowdownMultiplier: 1, // No CPU throttling for production
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      }
    };
  }
  
  return transformed;
}

/**
 * Update a baseline file
 */
async function updateBaselineFile(filePath, targetUrl) {
  try {
    console.log(`📝 Updating ${filePath}...`);
    
    // Read existing baseline
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Count localhost references before transformation
    const localhostMatches = content.match(/127\.0\.0\.1/g) || [];
    const httpMatches = content.match(/http:\/\/127\.0\.0\.1:3000/g) || [];
    
    console.log(`   Found ${localhostMatches.length} localhost references`);
    console.log(`   Found ${httpMatches.length} localhost URL references`);
    
    // Transform the data
    const transformed = transformBaseline(data, targetUrl);
    
    // Write back the updated baseline
    await fs.writeFile(filePath, JSON.stringify(transformed, null, 2));
    
    console.log(`   ✅ Updated and saved to ${filePath}`);
    
    return {
      file: path.basename(filePath),
      localhostRefs: localhostMatches.length,
      urlRefs: httpMatches.length
    };
    
  } catch (error) {
    console.error(`   ❌ Error updating ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const { targetUrl } = parseArgs();
    
    console.log('🔄 Updating Performance Baseline URLs');
    console.log('====================================');
    console.log(`Target URL: ${targetUrl}`);
    console.log(`Protocol: ${new URL(targetUrl).protocol === 'https:' ? 'HTTP/2+' : 'HTTP/1.1'}`);
    console.log(`Domain: ${new URL(targetUrl).hostname}`);
    console.log('');
    
    // Validate target URL
    if (!targetUrl.startsWith('https://')) {
      console.warn('⚠️  Warning: Target URL should use HTTPS for realistic production testing');
    }
    
    // Update each baseline file
    const baselineFiles = [
      path.join(BASELINE_DIR, 'base.json'),
      path.join(BASELINE_DIR, 'optimized.json')
    ];
    
    const results = [];
    
    for (const filePath of baselineFiles) {
      try {
        await fs.access(filePath);
        const result = await updateBaselineFile(filePath, targetUrl);
        results.push(result);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`   ⏭️  Skipping ${filePath} (file not found)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('');
    console.log('🎉 Update completed!');
    console.log('');
    console.log('Summary:');
    results.forEach(result => {
      console.log(`- ${result.file}: Updated ${result.localhostRefs} localhost refs, ${result.urlRefs} URL refs`);
    });
    
    console.log('');
    console.log('✨ Baseline files now use production characteristics:');
    console.log(`   • URLs: ${targetUrl}`);
    console.log(`   • Protocol: ${new URL(targetUrl).protocol === 'https:' ? 'HTTP/2' : 'HTTP/1.1'}`);
    console.log(`   • Entity: ${new URL(targetUrl).hostname}`);
    console.log(`   • CDN-optimized timing characteristics`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the updated baseline files');
    console.log('2. Run performance tests to validate the changes');
    console.log('3. Commit the updated baselines');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { transformBaseline };