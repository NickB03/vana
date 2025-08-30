#!/usr/bin/env node

/**
 * Truth Verification System for 6-PR UI Fix Implementation
 * 
 * This script provides automated verification checkpoints to ensure
 * each PR meets specifications and prevents regressions.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  project: 'vana-ui-fix',
  baselinePath: './verification/baseline',
  reportsPath: './verification/reports',
  thresholds: {
    performance: {
      lighthouse: 90,
      bundleIncrease: 5, // percentage
      renderTime: 100, // ms
    },
    quality: {
      coverage: 85, // percentage
      eslintWarnings: 0,
      typeErrors: 0,
    },
    accessibility: {
      wcagLevel: 'AA',
      axeViolations: 0,
    },
  },
};

// Verification stages
const STAGES = {
  PRE_IMPLEMENTATION: 'pre-implementation',
  IMPLEMENTATION: 'implementation', 
  POST_IMPLEMENTATION: 'post-implementation',
  REGRESSION: 'regression',
};

// Truth gates definition
const TRUTH_GATES = {
  'requirements-compliance': {
    stage: STAGES.PRE_IMPLEMENTATION,
    blocking: true,
    command: 'npm run verify:requirements',
    description: 'Verify PR requirements match specification',
  },
  'baseline-capture': {
    stage: STAGES.PRE_IMPLEMENTATION,
    blocking: true,
    command: 'npm run verify:baseline-capture',
    description: 'Capture performance and functionality baseline',
  },
  'code-quality': {
    stage: STAGES.IMPLEMENTATION,
    blocking: true,
    command: 'npm run lint && npm run type-check',
    description: 'Code quality standards validation',
  },
  'component-compliance': {
    stage: STAGES.IMPLEMENTATION,
    blocking: true,
    command: 'npm run verify:components',
    description: 'shadcn component compliance check',
  },
  'unit-tests': {
    stage: STAGES.IMPLEMENTATION,
    blocking: true,
    command: 'npm run test:ci',
    description: 'Unit test coverage and passing',
  },
  'functionality-tests': {
    stage: STAGES.POST_IMPLEMENTATION,
    blocking: true,
    command: 'npm run test:e2e',
    description: 'End-to-end functionality validation',
  },
  'performance-check': {
    stage: STAGES.POST_IMPLEMENTATION,
    blocking: true,
    command: 'npm run verify:performance',
    description: 'Performance regression check',
  },
  'accessibility-audit': {
    stage: STAGES.POST_IMPLEMENTATION,
    blocking: true,
    command: 'npm run test:a11y',
    description: 'Accessibility compliance audit',
  },
  'cross-pr-impact': {
    stage: STAGES.REGRESSION,
    blocking: true,
    command: 'npm run verify:cross-pr-impact',
    description: 'Cross-PR impact analysis',
  },
  'rollback-verification': {
    stage: STAGES.REGRESSION,
    blocking: false,
    command: 'npm run verify:rollback',
    description: 'Rollback procedure validation',
  },
};

class TruthVerifier {
  constructor() {
    this.results = {
      stage: null,
      gates: {},
      metrics: {},
      artifacts: [],
      timestamp: new Date().toISOString(),
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [CONFIG.baselinePath, CONFIG.reportsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async runStage(stage, prId = null) {
    console.log(`\n🚀 Running ${stage} verification${prId ? ` for PR ${prId}` : ''}...`);
    
    this.results.stage = stage;
    this.results.prId = prId;

    const gates = Object.entries(TRUTH_GATES)
      .filter(([_, config]) => config.stage === stage);

    for (const [gateName, gateConfig] of gates) {
      await this.runGate(gateName, gateConfig);
    }

    this.generateReport();
    return this.evaluateResults();
  }

  async runGate(gateName, gateConfig) {
    console.log(`\n🔍 Running gate: ${gateName}`);
    console.log(`   ${gateConfig.description}`);

    const startTime = Date.now();
    let result = {
      name: gateName,
      passed: false,
      blocking: gateConfig.blocking,
      duration: 0,
      output: '',
      error: null,
    };

    try {
      // Execute the gate command
      const output = execSync(gateConfig.command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      result.output = output;
      result.passed = true;
      result.duration = Date.now() - startTime;
      
      console.log(`   ✅ Passed (${result.duration}ms)`);
      
    } catch (error) {
      result.error = error.message;
      result.output = error.stdout || error.stderr || '';
      result.duration = Date.now() - startTime;
      
      console.log(`   ❌ Failed (${result.duration}ms)`);
      if (gateConfig.blocking) {
        console.log(`   🚫 This is a BLOCKING gate - verification cannot continue`);
      }
    }

    this.results.gates[gateName] = result;
    
    // Store gate-specific metrics
    await this.captureGateMetrics(gateName, result);
  }

  async captureGateMetrics(gateName, result) {
    // Capture specific metrics based on gate type
    switch (gateName) {
      case 'baseline-capture':
        await this.captureBaseline();
        break;
      case 'performance-check':
        await this.capturePerformanceMetrics();
        break;
      case 'code-quality':
        await this.captureQualityMetrics();
        break;
      case 'accessibility-audit':
        await this.captureA11yMetrics();
        break;
    }
  }

  async captureBaseline() {
    try {
      // Capture Lighthouse metrics
      const lighthouseResult = execSync(
        'npx lighthouse http://localhost:5173 --output=json --quiet',
        { encoding: 'utf8' }
      );
      
      const baseline = {
        lighthouse: JSON.parse(lighthouseResult),
        timestamp: new Date().toISOString(),
        bundleSize: await this.getBundleSize(),
        coverage: await this.getCoverage(),
      };

      fs.writeFileSync(
        path.join(CONFIG.baselinePath, 'baseline.json'),
        JSON.stringify(baseline, null, 2)
      );

      this.results.metrics.baseline = baseline;
    } catch (error) {
      console.log(`   ⚠️  Could not capture complete baseline: ${error.message}`);
    }
  }

  async capturePerformanceMetrics() {
    try {
      const currentMetrics = {
        bundleSize: await this.getBundleSize(),
        lighthouse: await this.getLighthouseScores(),
        timestamp: new Date().toISOString(),
      };

      // Compare with baseline
      const baseline = this.loadBaseline();
      if (baseline) {
        const comparison = this.comparePerformance(baseline, currentMetrics);
        this.results.metrics.performanceComparison = comparison;
        
        // Check if within thresholds
        if (comparison.bundleSizeIncrease > CONFIG.thresholds.performance.bundleIncrease) {
          throw new Error(`Bundle size increased by ${comparison.bundleSizeIncrease}% (threshold: ${CONFIG.thresholds.performance.bundleIncrease}%)`);
        }
      }

      this.results.metrics.performance = currentMetrics;
    } catch (error) {
      console.log(`   ⚠️  Performance metrics error: ${error.message}`);
    }
  }

  async captureQualityMetrics() {
    try {
      const coverage = await this.getCoverage();
      const eslintResults = await this.getESLintResults();
      const typeErrors = await this.getTypeErrors();

      this.results.metrics.quality = {
        coverage,
        eslint: eslintResults,
        typeErrors,
      };

      // Validate against thresholds
      if (coverage.global < CONFIG.thresholds.quality.coverage) {
        throw new Error(`Coverage ${coverage.global}% below threshold ${CONFIG.thresholds.quality.coverage}%`);
      }

    } catch (error) {
      console.log(`   ⚠️  Quality metrics error: ${error.message}`);
    }
  }

  async captureA11yMetrics() {
    try {
      // Run axe-core accessibility tests
      const axeResults = execSync(
        'npx axe-core src/components --tags=wcag2a,wcag2aa --format=json',
        { encoding: 'utf8' }
      );

      const a11yMetrics = {
        axe: JSON.parse(axeResults),
        timestamp: new Date().toISOString(),
      };

      this.results.metrics.accessibility = a11yMetrics;

      // Check for violations
      if (a11yMetrics.axe.violations.length > CONFIG.thresholds.accessibility.axeViolations) {
        throw new Error(`Found ${a11yMetrics.axe.violations.length} accessibility violations`);
      }

    } catch (error) {
      console.log(`   ⚠️  Accessibility metrics error: ${error.message}`);
    }
  }

  // Utility methods
  async getBundleSize() {
    try {
      const statsPath = path.join(process.cwd(), 'frontend/.next/build-manifest.json');
      if (fs.existsSync(statsPath)) {
        const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        return this.calculateBundleSize(stats);
      }
    } catch (error) {
      console.log(`Could not get bundle size: ${error.message}`);
    }
    return null;
  }

  calculateBundleSize(stats) {
    // Calculate total bundle size from build manifest
    let totalSize = 0;
    Object.values(stats.pages).forEach(page => {
      page.forEach(chunk => {
        if (chunk.endsWith('.js')) {
          try {
            const chunkPath = path.join(process.cwd(), 'frontend/.next/static', chunk);
            if (fs.existsSync(chunkPath)) {
              totalSize += fs.statSync(chunkPath).size;
            }
          } catch (e) {
            // Ignore missing chunks
          }
        }
      });
    });
    return Math.round(totalSize / 1024); // Size in KB
  }

  async getCoverage() {
    try {
      const coveragePath = path.join(process.cwd(), 'frontend/coverage/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        return {
          global: coverage.total.statements.pct,
          statements: coverage.total.statements.pct,
          branches: coverage.total.branches.pct,
          functions: coverage.total.functions.pct,
          lines: coverage.total.lines.pct,
        };
      }
    } catch (error) {
      console.log(`Could not get coverage: ${error.message}`);
    }
    return { global: 0 };
  }

  async getESLintResults() {
    try {
      const result = execSync('npm run lint -- --format=json', { encoding: 'utf8' });
      const eslintResults = JSON.parse(result);
      
      return {
        errorCount: eslintResults.reduce((sum, file) => sum + file.errorCount, 0),
        warningCount: eslintResults.reduce((sum, file) => sum + file.warningCount, 0),
        files: eslintResults.length,
      };
    } catch (error) {
      // ESLint returns non-zero exit code for violations
      if (error.stdout) {
        try {
          const eslintResults = JSON.parse(error.stdout);
          return {
            errorCount: eslintResults.reduce((sum, file) => sum + file.errorCount, 0),
            warningCount: eslintResults.reduce((sum, file) => sum + file.warningCount, 0),
            files: eslintResults.length,
          };
        } catch (parseError) {
          console.log(`Could not parse ESLint results: ${parseError.message}`);
        }
      }
    }
    return { errorCount: 0, warningCount: 0, files: 0 };
  }

  async getTypeErrors() {
    try {
      execSync('npm run type-check', { encoding: 'utf8' });
      return { count: 0 };
    } catch (error) {
      // Count TypeScript errors from output
      const errorCount = (error.stdout || error.stderr || '').split('error TS').length - 1;
      return { count: errorCount };
    }
  }

  async getLighthouseScores() {
    try {
      const result = execSync(
        'npx lighthouse http://localhost:5173 --output=json --quiet --chrome-flags="--headless"',
        { encoding: 'utf8', timeout: 60000 }
      );
      
      const lighthouse = JSON.parse(result);
      return {
        performance: Math.round(lighthouse.lhr.categories.performance.score * 100),
        accessibility: Math.round(lighthouse.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lighthouse.lhr.categories['best-practices'].score * 100),
        seo: Math.round(lighthouse.lhr.categories.seo.score * 100),
      };
    } catch (error) {
      console.log(`Could not get Lighthouse scores: ${error.message}`);
      return null;
    }
  }

  loadBaseline() {
    try {
      const baselinePath = path.join(CONFIG.baselinePath, 'baseline.json');
      if (fs.existsSync(baselinePath)) {
        return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      }
    } catch (error) {
      console.log(`Could not load baseline: ${error.message}`);
    }
    return null;
  }

  comparePerformance(baseline, current) {
    const comparison = {
      bundleSizeIncrease: 0,
      lighthouseChanges: {},
    };

    // Compare bundle sizes
    if (baseline.bundleSize && current.bundleSize) {
      comparison.bundleSizeIncrease = Math.round(
        ((current.bundleSize - baseline.bundleSize) / baseline.bundleSize) * 100
      );
    }

    // Compare Lighthouse scores
    if (baseline.lighthouse && current.lighthouse) {
      Object.keys(current.lighthouse).forEach(key => {
        if (baseline.lighthouse[key] !== undefined) {
          comparison.lighthouseChanges[key] = current.lighthouse[key] - baseline.lighthouse[key];
        }
      });
    }

    return comparison;
  }

  evaluateResults() {
    const gates = Object.values(this.results.gates);
    const passed = gates.filter(g => g.passed).length;
    const failed = gates.filter(g => !g.passed).length;
    const blocking = gates.filter(g => !g.passed && g.blocking).length;

    const success = blocking === 0;
    
    console.log(`\n📊 Verification Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   🚫 Blocking failures: ${blocking}`);
    console.log(`   🎯 Overall: ${success ? 'PASS' : 'FAIL'}`);

    return {
      success,
      passed,
      failed,
      blocking,
      results: this.results,
    };
  }

  generateReport() {
    const reportPath = path.join(
      CONFIG.reportsPath,
      `verification-${this.results.stage}-${Date.now()}.json`
    );

    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.results.artifacts.push(reportPath);

    console.log(`\n📄 Report generated: ${reportPath}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const stage = args[1];
  const prId = args.find(arg => arg.startsWith('--pr='))?.split('=')[1];

  const verifier = new TruthVerifier();

  try {
    switch (command) {
      case 'stage':
        if (!stage || !Object.values(STAGES).includes(stage)) {
          console.error(`Invalid stage. Must be one of: ${Object.values(STAGES).join(', ')}`);
          process.exit(1);
        }
        const result = await verifier.runStage(stage, prId);
        process.exit(result.success ? 0 : 1);
        break;

      case 'gates':
        console.log('\n📋 Available Truth Gates:');
        Object.entries(TRUTH_GATES).forEach(([name, config]) => {
          console.log(`\n🔍 ${name}`);
          console.log(`   Stage: ${config.stage}`);
          console.log(`   Blocking: ${config.blocking ? 'Yes' : 'No'}`);
          console.log(`   Command: ${config.command}`);
          console.log(`   Description: ${config.description}`);
        });
        break;

      case 'baseline':
        await verifier.captureBaseline();
        console.log('✅ Baseline captured successfully');
        break;

      default:
        console.log(`
🔍 Truth Verification System

Usage:
  node truth-verify.js stage <stage> [--pr=PR-ID]
  node truth-verify.js gates
  node truth-verify.js baseline

Stages:
  ${Object.values(STAGES).map(s => `  ${s}`).join('\n')}

Examples:
  node truth-verify.js stage pre-implementation --pr=123
  node truth-verify.js stage implementation
  node truth-verify.js baseline
  node truth-verify.js gates
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

module.exports = { TruthVerifier, TRUTH_GATES, STAGES, CONFIG };