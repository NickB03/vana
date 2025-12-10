#!/usr/bin/env node

/**
 * Context Retention Test Runner
 * Executes all context retention tests with comprehensive reporting
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  unitTests: [
    'supabase/functions/_shared/context-selector.test.ts',
    'supabase/functions/_shared/context-ranker.test.ts',
    'supabase/functions/_shared/entity-resolution.test.ts'
  ],
  integrationTests: [
    'tests/integration/context-retention.spec.ts'
  ],
  regressionTests: [
    'tests/regression/context-bugs.spec.ts'
  ],
  performanceTests: [
    'tests/performance/context-management.spec.ts'
  ],
  testDataFiles: [
    'tests/test-data/context-test-conversations.json'
  ]
};

// Test categories
const TEST_CATEGORIES = {
  UNIT: 'Unit Tests',
  INTEGRATION: 'Integration Tests',
  REGRESSION: 'Regression Tests',
  PERFORMANCE: 'Performance Tests'
};

class ContextTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      categories: {},
      failures: [],
      startTime: null,
      endTime: null
    };
    this.startTime = null;
    this.endTime = null;
  }

  async run() {
    console.log('🧪 Starting Context Retention Test Suite\n');
    console.log('==========================================\n');

    this.startTime = Date.now();

    // Validate test data files exist
    this.validateTestData();

    // Run test categories
    await this.runTestsByCategory();

    // Generate summary
    this.endTime = Date.now();
    this.results.duration = this.endTime - this.startTime;

    this.generateReport();
    this.printSummary();
  }

  validateTestData() {
    console.log('📋 Validating test data files...');

    const missingFiles = TEST_CONFIG.testDataFiles.filter(file => {
      const exists = fs.existsSync(file);
      if (!exists) {
        console.error(`❌ Missing test data file: ${file}`);
      }
      return !exists;
    });

    if (missingFiles.length > 0) {
      console.error(`❌ Missing ${missingFiles.length} test data file(s). Cannot run tests.`);
      process.exit(1);
    }

    console.log('✅ All test data files validated\n');
  }

  async runTestsByCategory() {
    const categories = [
      { name: TEST_CATEGORIES.UNIT, tests: TEST_CONFIG.unitTests, type: 'deno' },
      { name: TEST_CATEGORIES.INTEGRATION, tests: TEST_CONFIG.integrationTests, type: 'deno' },
      { name: TEST_CATEGORIES.REGRESSION, tests: TEST_CONFIG.regressionTests, type: 'deno' },
      { name: TEST_CATEGORIES.PERFORMANCE, tests: TEST_CONFIG.performanceTests, type: 'deno' }
    ];

    for (const category of categories) {
      console.log(`🔍 Running ${category.name}...`);
      console.log('-'.repeat(50));

      const categoryResult = await this.runTestCategory(category);

      this.results.categories[category.name] = categoryResult;
      this.results.passed += categoryResult.passed;
      this.results.failed += categoryResult.failed;
      this.results.skipped += categoryResult.skipped;
      this.results.failures.push(...categoryResult.failures);

      console.log(`\n✅ ${category.name} completed\n`);
    }
  }

  async runTestCategory(category) {
    const categoryResult = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: [],
      startTime: Date.now()
    };

    for (const testFile of category.tests) {
      const testResult = await this.runSingleTest(testFile, category.type);

      categoryResult.passed += testResult.passed;
      categoryResult.failed += testResult.failed;
      categoryResult.skipped += testResult.skipped;
      categoryResult.failures.push(...testResult.failures);

      // Print test result
      const status = testResult.failed > 0 ? '❌' : testResult.passed > 0 ? '✅' : '⏭️';
      console.log(`  ${status} ${testFile} (${testResult.passed} passed, ${testResult.failed} failed)`);
    }

    categoryResult.duration = Date.now() - categoryResult.startTime;
    return categoryResult;
  }

  async runSingleTest(testFile, type) {
    const result = {
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: []
    };

    try {
      const denoArgs = [
        'test',
        '--allow-all',
        '--parallel',
        '--trace-event',
        testFile
      ];

      const command = `deno ${denoArgs.join(' ')}`;

      console.log(`    Executing: ${command}`);

      const output = execSync(command, {
        encoding: 'utf8',
        timeout: 60000 // 60 second timeout
      });

      // Parse Deno test output
      const testSummary = this.parseDenoTestOutput(output);

      result.passed = testSummary.passed;
      result.failed = testSummary.failed;
      result.skipped = testSummary.skipped;
      result.failures = testSummary.failures;

    } catch (error) {
      console.error(`    Error running test: ${error.message}`);
      result.failed = 1;
      result.failures.push({
        test: testFile,
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  parseDenoTestOutput(output) {
    const result = {
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: []
    };

    const lines = output.split('\n');
    let currentTest = null;

    for (const line of lines) {
      // Parse test results
      if (line.includes('test result:')) {
        if (line.includes('ok')) {
          result.passed++;
        } else if (line.includes('failed')) {
          result.failed++;
        } else if (line.includes('ignored')) {
          result.skipped++;
        }
      }

      // Parse failure details
      if (line.includes(' --- FAIL:')) {
        const testMatch = line.match(/--- FAIL: (.+)/);
        if (testMatch) {
          currentTest = testMatch[1];
          result.failures.push({
            test: currentTest,
            error: 'Test failed'
          });
        }
      }

      // Parse error messages
      if (line.includes('error:') && currentTest) {
        result.failures[result.failures.length - 1].error = line;
      }

      // Reset current test on success
      if (line.includes(' --- ok:')) {
        const testMatch = line.match(/--- ok: (.+)/);
        if (testMatch && testMatch[1] === currentTest) {
          currentTest = null;
        }
      }
    }

    return result;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.results.duration,
      summary: {
        totalTests: this.results.passed + this.results.failed + this.results.skipped,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        passRate: this.results.totalTests > 0 ?
          (this.results.passed / this.results.totalTests * 100).toFixed(2) : 0
      },
      categories: this.results.categories,
      failures: this.results.failures.map(f => ({
        test: f.test,
        error: f.error,
        category: this.getTestCategory(f.test)
      }))
    };

    // Write report to file
    const reportPath = 'context-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Test report saved to: ${reportPath}`);
  }

  getTestCategory(testFile) {
    if (TEST_CONFIG.unitTests.includes(testFile)) return TEST_CATEGORIES.UNIT;
    if (TEST_CONFIG.integrationTests.includes(testFile)) return TEST_CATEGORIES.INTEGRATION;
    if (TEST_CONFIG.regressionTests.includes(testFile)) return TEST_CATEGORIES.REGRESSION;
    if (TEST_CONFIG.performanceTests.includes(testFile)) return TEST_CATEGORIES.PERFORMANCE;
    return 'Unknown';
  }

  printSummary() {
    console.log('==========================================');
    console.log('🎯 Context Retention Test Summary');
    console.log('==========================================');
    console.log(`⏱️  Duration: ${this.formatDuration(this.results.duration)}`);
    console.log(`📊 Total Tests: ${this.results.passed + this.results.failed + this.results.skipped}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`📈 Pass Rate: ${this.results.totalTests > 0 ?
      (this.results.passed / this.results.totalTests * 100).toFixed(1) : 0}%`);
    console.log();

    // Category breakdown
    console.log('📋 Category Breakdown:');
    for (const [category, results] of Object.entries(this.results.categories)) {
      const categoryTotal = results.passed + results.failed + results.skipped;
      const categoryPassRate = categoryTotal > 0 ?
        (results.passed / categoryTotal * 100).toFixed(1) : 0;
      console.log(`  ${category}: ${results.passed} passed, ${results.failed} failed, ${categoryPassRate}%`);
    }

    // Failure summary
    if (this.results.failures.length > 0) {
      console.log();
      console.log('❌ Test Failures:');
      for (const failure of this.results.failures) {
        console.log(`  • ${failure.category} - ${failure.test}`);
        console.log(`    ${failure.error}`);
      }
    }

    console.log();
    console.log('==========================================');

    // Exit code
    if (this.results.failed > 0) {
      console.log('❌ Some tests failed. Please review the failures above.');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed! Context retention functionality is working correctly.');
      process.exit(0);
    }
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }
}

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ContextTestRunner();
  runner.run().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { ContextTestRunner };