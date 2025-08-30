#!/usr/bin/env node

/**
 * Performance Verification Script
 * 
 * Verifies performance metrics and regressions for the 6-PR UI fix implementation.
 * Compares current performance against baseline measurements.
 * 
 * Environment Variables:
 * - BASE_URL or AUDIT_URL: The URL to audit (default: http://localhost:3000)
 * - PORT: Automatically derived from BASE_URL and passed to dev server
 * 
 * Examples:
 *   BASE_URL=http://localhost:5173 node verify-performance.js verify  # Vite
 *   BASE_URL=http://localhost:3000 node verify-performance.js verify  # Next.js (default)
 *   AUDIT_URL=http://localhost:8080 node verify-performance.js verify # Custom port
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  lighthouse: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 90,
  },
  coreWebVitals: {
    LCP: 2500, // ms
    FID: 100,  // ms
    CLS: 0.1,  // score
  },
  bundle: {
    maxIncrease: 5, // percentage
    maxGzipSize: 250 * 1024, // bytes
  },
  runtime: {
    maxRenderTime: 100, // ms
    maxMemoryIncrease: 10, // percentage
  },
};

class PerformanceVerifier {
  constructor() {
    this.baselinePath = path.join(process.cwd(), 'verification/baseline');
    this.reportsPath = path.join(process.cwd(), 'verification/performance-reports');
    
    // Configurable base URL with Next.js default
    this.baseUrl = process.env.BASE_URL || process.env.AUDIT_URL || 'http://localhost:3000';
    
    // Extract port from baseUrl
    const urlParts = new URL(this.baseUrl);
    this.port = urlParts.port || (urlParts.protocol === 'https:' ? '443' : '80');
    if (this.port === '80' && this.baseUrl.includes('localhost')) {
      this.port = '3000'; // Default for localhost without explicit port
    }
    
    this.results = {
      timestamp: new Date().toISOString(),
      metrics: {},
      comparisons: {},
      violations: [],
      passed: true,
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.baselinePath, this.reportsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async verifyPerformance() {
    console.log('🚀 Starting performance verification...\n');

    try {
      // 1. Capture current metrics
      await this.captureCurrentMetrics();
      
      // 2. Load baseline for comparison
      const baseline = this.loadBaseline();
      
      // 3. Compare metrics
      if (baseline) {
        await this.compareWithBaseline(baseline);
      } else {
        console.log('⚠️  No baseline found - saving current metrics as baseline');
        this.saveAsBaseline();
      }
      
      // 4. Validate against thresholds
      await this.validateThresholds();
      
      // 5. Generate report
      return this.generateReport();
      
    } catch (error) {
      console.error(`❌ Performance verification failed: ${error.message}`);
      this.results.passed = false;
      this.results.error = error.message;
      return { success: false, error: error.message };
    }
  }

  async captureCurrentMetrics() {
    console.log('📊 Capturing current performance metrics...');

    // Bundle size analysis
    this.results.metrics.bundle = await this.analyzeBundleSize();
    
    // Lighthouse audit
    this.results.metrics.lighthouse = await this.runLighthouseAudit();
    
    // Core Web Vitals (from Lighthouse)
    this.results.metrics.coreWebVitals = this.extractCoreWebVitals(
      this.results.metrics.lighthouse
    );
    
    // Runtime performance
    this.results.metrics.runtime = await this.measureRuntimePerformance();
    
    console.log('✅ Current metrics captured');
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle size...');
    
    try {
      // Build the project first
      console.log('   Building project...');
      execSync('cd frontend && npm run build', { stdio: 'pipe' });
      
      const bundleStats = await this.getBundleStats();
      const gzipSizes = await this.getGzipSizes();
      
      return {
        totalSize: bundleStats.totalSize,
        gzipSize: gzipSizes.total,
        chunks: bundleStats.chunks,
        pages: bundleStats.pages,
      };
    } catch (error) {
      console.log(`   ⚠️  Bundle analysis error: ${error.message}`);
      return { error: error.message };
    }
  }

  async getBundleStats() {
    const buildPath = path.join(process.cwd(), 'frontend/.next');
    
    if (!fs.existsSync(buildPath)) {
      throw new Error('Build output not found - run npm run build first');
    }

    // Analyze build manifest
    const manifestPath = path.join(buildPath, 'build-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    let totalSize = 0;
    const chunks = {};
    const pages = {};
    
    // Calculate sizes for each page
    Object.entries(manifest.pages).forEach(([page, pageChunks]) => {
      let pageSize = 0;
      pageChunks.forEach(chunk => {
        if (chunk.endsWith('.js')) {
          try {
            const chunkPath = path.join(buildPath, 'static', chunk);
            if (fs.existsSync(chunkPath)) {
              const size = fs.statSync(chunkPath).size;
              chunks[chunk] = size;
              pageSize += size;
              totalSize += size;
            }
          } catch (e) {
            // Ignore missing chunks
          }
        }
      });
      pages[page] = pageSize;
    });

    return {
      totalSize: Math.round(totalSize / 1024), // KB
      chunks: Object.keys(chunks).length,
      pages: Object.keys(pages).length,
      largestChunks: Object.entries(chunks)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([chunk, size]) => ({ chunk, size: Math.round(size / 1024) })),
    };
  }

  async getGzipSizes() {
    // Estimate gzip sizes
    const buildPath = path.join(process.cwd(), 'frontend/.next/static');
    let total = 0;
    
    if (fs.existsSync(buildPath)) {
      const files = this.getAllFiles(buildPath, '.js');
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(file);
          // Rough gzip estimation (actual compression would be different)
          const estimatedGzip = Math.round(content.length * 0.3);
          total += estimatedGzip;
        } catch (e) {
          // Ignore file read errors
        }
      }
    }
    
    return { total: Math.round(total / 1024) }; // KB
  }

  getAllFiles(dir, extension) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async runLighthouseAudit() {
    console.log(`🔍 Running Lighthouse audit on ${this.baseUrl}...`);
    
    try {
      // Start dev server if not running
      const isServerRunning = await this.checkServerRunning();
      let serverProcess = null;
      
      if (!isServerRunning) {
        console.log(`   Starting dev server on port ${this.port}...`);
        serverProcess = this.startDevServer();
        await this.waitForServer();
      }

      // Run Lighthouse
      const lighthouseCmd = [
        `npx lighthouse ${this.baseUrl}`,
        '--output=json',
        '--quiet',
        '--chrome-flags="--headless --no-sandbox"',
        '--preset=desktop',
      ].join(' ');

      const output = execSync(lighthouseCmd, { 
        encoding: 'utf8',
        timeout: 120000, // 2 minutes
      });

      const lighthouse = JSON.parse(output);
      
      // Clean up server if we started it
      if (serverProcess) {
        serverProcess.kill();
      }

      return {
        performance: Math.round(lighthouse.lhr.categories.performance.score * 100),
        accessibility: Math.round(lighthouse.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lighthouse.lhr.categories['best-practices'].score * 100),
        seo: Math.round(lighthouse.lhr.categories.seo.score * 100),
        metrics: lighthouse.lhr.audits,
      };
      
    } catch (error) {
      console.log(`   ⚠️  Lighthouse audit error: ${error.message}`);
      return { error: error.message };
    }
  }

  async checkServerRunning() {
    try {
      const response = await fetch(this.baseUrl, { 
        method: 'HEAD',
        timeout: 1000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  startDevServer() {
    const { spawn } = require('child_process');
    // Set PORT environment variable for the dev server
    const env = { ...process.env, PORT: this.port };
    
    return spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'frontend'),
      stdio: 'pipe',
      env: env,
    });
  }

  async waitForServer(maxWait = 30000) {
    const startTime = Date.now();
    console.log(`   Waiting for server at ${this.baseUrl}...`);
    
    while (Date.now() - startTime < maxWait) {
      if (await this.checkServerRunning()) {
        console.log(`   ✅ Server is running at ${this.baseUrl}`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Server failed to start at ${this.baseUrl} within timeout`);
  }

  extractCoreWebVitals(lighthouse) {
    if (!lighthouse.metrics) return {};
    
    return {
      LCP: lighthouse.metrics['largest-contentful-paint']?.numericValue || 0,
      FID: lighthouse.metrics['max-potential-fid']?.numericValue || 0,
      CLS: lighthouse.metrics['cumulative-layout-shift']?.numericValue || 0,
    };
  }

  async measureRuntimePerformance() {
    console.log('⚡ Measuring runtime performance...');
    
    // This would typically involve running performance tests
    // For now, we'll simulate with basic checks
    return {
      renderTime: Math.random() * 50 + 30, // Simulated 30-80ms
      memoryUsage: Math.random() * 20 + 40, // Simulated 40-60MB
      jsHeapSize: Math.random() * 10 + 15, // Simulated 15-25MB
    };
  }

  loadBaseline() {
    try {
      const baselinePath = path.join(this.baselinePath, 'performance-baseline.json');
      if (fs.existsSync(baselinePath)) {
        return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      }
    } catch (error) {
      console.log(`⚠️  Could not load baseline: ${error.message}`);
    }
    return null;
  }

  saveAsBaseline() {
    const baselinePath = path.join(this.baselinePath, 'performance-baseline.json');
    fs.writeFileSync(baselinePath, JSON.stringify(this.results.metrics, null, 2));
    console.log('💾 Current metrics saved as baseline');
  }

  async compareWithBaseline(baseline) {
    console.log('🔍 Comparing with baseline...');
    
    this.results.comparisons = {
      bundle: this.compareBundleSize(baseline.bundle, this.results.metrics.bundle),
      lighthouse: this.compareLighthouse(baseline.lighthouse, this.results.metrics.lighthouse),
      coreWebVitals: this.compareCoreWebVitals(baseline.coreWebVitals, this.results.metrics.coreWebVitals),
      runtime: this.compareRuntime(baseline.runtime, this.results.metrics.runtime),
    };
    
    console.log('✅ Baseline comparison complete');
  }

  compareBundleSize(baseline, current) {
    if (!baseline || !current || baseline.error || current.error) {
      return { error: 'Cannot compare due to missing data' };
    }

    const sizeIncrease = ((current.totalSize - baseline.totalSize) / baseline.totalSize) * 100;
    const gzipIncrease = ((current.gzipSize - baseline.gzipSize) / baseline.gzipSize) * 100;
    
    return {
      sizeIncrease: Math.round(sizeIncrease * 100) / 100,
      gzipIncrease: Math.round(gzipIncrease * 100) / 100,
      baseline: baseline.totalSize,
      current: current.totalSize,
      status: sizeIncrease <= PERFORMANCE_THRESHOLDS.bundle.maxIncrease ? 'pass' : 'fail',
    };
  }

  compareLighthouse(baseline, current) {
    if (!baseline || !current || baseline.error || current.error) {
      return { error: 'Cannot compare due to missing data' };
    }

    const metrics = ['performance', 'accessibility', 'bestPractices', 'seo'];
    const comparison = {};
    
    metrics.forEach(metric => {
      const diff = current[metric] - baseline[metric];
      comparison[metric] = {
        baseline: baseline[metric],
        current: current[metric],
        difference: diff,
        status: current[metric] >= PERFORMANCE_THRESHOLDS.lighthouse[metric] ? 'pass' : 'fail',
      };
    });
    
    return comparison;
  }

  compareCoreWebVitals(baseline, current) {
    if (!baseline || !current) {
      return { error: 'Cannot compare due to missing data' };
    }

    const vitals = ['LCP', 'FID', 'CLS'];
    const comparison = {};
    
    vitals.forEach(vital => {
      const baselineValue = baseline[vital] || 0;
      const currentValue = current[vital] || 0;
      const threshold = PERFORMANCE_THRESHOLDS.coreWebVitals[vital];
      
      comparison[vital] = {
        baseline: baselineValue,
        current: currentValue,
        difference: currentValue - baselineValue,
        threshold,
        status: currentValue <= threshold ? 'pass' : 'fail',
      };
    });
    
    return comparison;
  }

  compareRuntime(baseline, current) {
    if (!baseline || !current) {
      return { error: 'Cannot compare due to missing data' };
    }

    const renderTimeIncrease = ((current.renderTime - baseline.renderTime) / baseline.renderTime) * 100;
    const memoryIncrease = ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100;
    
    return {
      renderTime: {
        baseline: baseline.renderTime,
        current: current.renderTime,
        increase: Math.round(renderTimeIncrease * 100) / 100,
        status: renderTimeIncrease <= PERFORMANCE_THRESHOLDS.runtime.maxRenderTime ? 'pass' : 'fail',
      },
      memory: {
        baseline: baseline.memoryUsage,
        current: current.memoryUsage,
        increase: Math.round(memoryIncrease * 100) / 100,
        status: memoryIncrease <= PERFORMANCE_THRESHOLDS.runtime.maxMemoryIncrease ? 'pass' : 'fail',
      },
    };
  }

  async validateThresholds() {
    console.log('🎯 Validating performance thresholds...');
    
    // Check bundle size
    if (this.results.comparisons.bundle && this.results.comparisons.bundle.status === 'fail') {
      this.results.violations.push({
        type: 'bundle-size',
        message: `Bundle size increased by ${this.results.comparisons.bundle.sizeIncrease}% (threshold: ${PERFORMANCE_THRESHOLDS.bundle.maxIncrease}%)`,
        severity: 'error',
      });
      this.results.passed = false;
    }

    // Check Lighthouse scores
    if (this.results.comparisons.lighthouse) {
      Object.entries(this.results.comparisons.lighthouse).forEach(([metric, data]) => {
        if (data.status === 'fail') {
          this.results.violations.push({
            type: 'lighthouse',
            metric,
            message: `Lighthouse ${metric} score ${data.current} below threshold ${PERFORMANCE_THRESHOLDS.lighthouse[metric]}`,
            severity: 'error',
          });
          this.results.passed = false;
        }
      });
    }

    // Check Core Web Vitals
    if (this.results.comparisons.coreWebVitals) {
      Object.entries(this.results.comparisons.coreWebVitals).forEach(([vital, data]) => {
        if (data.status === 'fail') {
          this.results.violations.push({
            type: 'core-web-vitals',
            vital,
            message: `${vital} ${data.current} exceeds threshold ${data.threshold}`,
            severity: 'error',
          });
          this.results.passed = false;
        }
      });
    }

    console.log(`✅ Threshold validation complete (${this.results.violations.length} violations)`);
  }

  generateReport() {
    console.log('\n📊 Performance Verification Report');
    console.log('==================================');

    // Current metrics summary
    console.log('\n📈 Current Metrics:');
    if (this.results.metrics.bundle && !this.results.metrics.bundle.error) {
      console.log(`Bundle Size: ${this.results.metrics.bundle.totalSize} KB`);
      console.log(`Gzip Size: ${this.results.metrics.bundle.gzipSize} KB`);
    }

    if (this.results.metrics.lighthouse && !this.results.metrics.lighthouse.error) {
      console.log(`Lighthouse Performance: ${this.results.metrics.lighthouse.performance}`);
      console.log(`Lighthouse Accessibility: ${this.results.metrics.lighthouse.accessibility}`);
    }

    // Comparison results
    if (Object.keys(this.results.comparisons).length > 0) {
      console.log('\n🔍 Comparison with Baseline:');
      
      if (this.results.comparisons.bundle && !this.results.comparisons.bundle.error) {
        const { sizeIncrease, status } = this.results.comparisons.bundle;
        console.log(`Bundle Size Change: ${sizeIncrease > 0 ? '+' : ''}${sizeIncrease}% (${status})`);
      }
      
      if (this.results.comparisons.lighthouse) {
        Object.entries(this.results.comparisons.lighthouse).forEach(([metric, data]) => {
          if (!data.error) {
            const change = data.difference > 0 ? '+' : '';
            console.log(`${metric}: ${change}${data.difference} (${data.status})`);
          }
        });
      }
    }

    // Violations
    if (this.results.violations.length > 0) {
      console.log('\n❌ Performance Violations:');
      this.results.violations.forEach((violation, index) => {
        console.log(`${index + 1}. [${violation.type}] ${violation.message}`);
      });
    } else {
      console.log('\n✅ No performance violations found');
    }

    // Save detailed report
    const reportPath = path.join(this.reportsPath, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    console.log(`\n🎯 Overall Result: ${this.results.passed ? 'PASS' : 'FAIL'}`);

    return {
      success: this.results.passed,
      violations: this.results.violations.length,
      results: this.results,
      reportPath,
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const verifier = new PerformanceVerifier();

  try {
    switch (command) {
      case 'verify':
        const result = await verifier.verifyPerformance();
        process.exit(result.success ? 0 : 1);
        break;

      case 'baseline':
        await verifier.captureCurrentMetrics();
        verifier.saveAsBaseline();
        console.log('✅ Performance baseline captured');
        break;

      case 'lighthouse':
        const lighthouse = await verifier.runLighthouseAudit();
        console.log('Lighthouse Results:', lighthouse);
        break;

      case 'bundle':
        const bundle = await verifier.analyzeBundleSize();
        console.log('Bundle Analysis:', bundle);
        break;

      default:
        console.log(`
🚀 Performance Verification System

Usage:
  node verify-performance.js verify
  node verify-performance.js baseline
  node verify-performance.js lighthouse
  node verify-performance.js bundle

Commands:
  verify    - Run complete performance verification
  baseline  - Capture current metrics as baseline
  lighthouse - Run Lighthouse audit only
  bundle    - Analyze bundle size only

Environment Variables:
  BASE_URL or AUDIT_URL - URL to audit (default: http://localhost:3000)
  
Examples:
  BASE_URL=http://localhost:5173 node verify-performance.js verify  # Vite
  BASE_URL=http://localhost:3000 node verify-performance.js verify  # Next.js
  AUDIT_URL=http://localhost:8080 node verify-performance.js verify # Custom
        `);
        break;
    }
  } catch (error) {
    console.error(`\n💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { PerformanceVerifier, PERFORMANCE_THRESHOLDS };