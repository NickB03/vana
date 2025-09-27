#!/usr/bin/env node
/**
 * @fileoverview Test Runner for Chat Actions Integration Tests
 * Orchestrates the execution of all chat actions test suites and generates
 * a comprehensive test report.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds per test suite
  verbose: true,
  coverage: true,
  bail: false // Continue running tests even if some fail
};

// Test suites to run
const TEST_SUITES = [
  {
    name: 'Functional Tests',
    file: 'chat_actions_functional.test.js',
    description: 'Tests core chat action functionality (edit, delete, regenerate, feedback)'
  },
  {
    name: 'Integration Tests',
    file: 'chat_actions_integration.test.js',
    description: 'Tests frontend-backend integration, CORS, and authentication'
  },
  {
    name: 'SSE Real-time Tests',
    file: 'sse_realtime_updates.test.js',
    description: 'Tests Server-Sent Events and real-time updates'
  },
  {
    name: 'Gemini Model Tests',
    file: 'gemini_model_integration.test.js',
    description: 'Tests integration with Google Gemini AI model'
  }
];

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

/**
 * Print colored console output
 */
function colorLog(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print test suite header
 */
function printHeader(title) {
  const border = '='.repeat(title.length + 4);
  colorLog(border, 'cyan');
  colorLog(`  ${title}  `, 'cyan');
  colorLog(border, 'cyan');
}

/**
 * Print test results summary
 */
function printSummary(results) {
  console.log('\n');
  printHeader('TEST EXECUTION SUMMARY');

  console.log('');
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    colorLog(`${status} ${result.name}`, color);

    if (!result.success) {
      colorLog(`   Error: ${result.error}`, 'red');
    }

    if (result.stats) {
      colorLog(`   Tests: ${result.stats.total} total, ${result.stats.passed} passed, ${result.stats.failed} failed`, 'white');
      colorLog(`   Duration: ${result.duration}ms`, 'white');
    }
    console.log('');
  });

  // Overall summary
  const totalSuites = results.length;
  const passedSuites = results.filter(r => r.success).length;
  const failedSuites = totalSuites - passedSuites;

  console.log('');
  colorLog('OVERALL RESULTS:', 'magenta');
  colorLog(`Total Test Suites: ${totalSuites}`, 'white');
  colorLog(`Passed: ${passedSuites}`, passedSuites === totalSuites ? 'green' : 'white');

  if (failedSuites > 0) {
    colorLog(`Failed: ${failedSuites}`, 'red');
  }

  const successRate = Math.round((passedSuites / totalSuites) * 100);
  const rateColor = successRate === 100 ? 'green' : successRate >= 75 ? 'yellow' : 'red';
  colorLog(`Success Rate: ${successRate}%`, rateColor);
}

/**
 * Run a single test suite
 */
async function runTestSuite(suite) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    colorLog(`\n🧪 Running: ${suite.name}`, 'blue');
    colorLog(`📄 File: ${suite.file}`, 'white');
    colorLog(`📝 Description: ${suite.description}`, 'white');
    console.log('');

    const testPath = path.join(__dirname, suite.file);

    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      const error = `Test file not found: ${suite.file}`;
      colorLog(`❌ ${error}`, 'red');
      resolve({
        name: suite.name,
        file: suite.file,
        success: false,
        error: error,
        duration: Date.now() - startTime
      });
      return;
    }

    // Run Jest for the specific test file
    const jestArgs = [
      testPath,
      '--json',
      '--verbose',
      `--testTimeout=${TEST_CONFIG.timeout}`
    ];

    if (TEST_CONFIG.coverage) {
      jestArgs.push('--coverage');
    }

    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    });

    let stdout = '';
    let stderr = '';

    jest.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    jest.stderr.on('data', (data) => {
      stderr += data.toString();
      if (TEST_CONFIG.verbose) {
        process.stderr.write(data);
      }
    });

    jest.on('close', (code) => {
      const duration = Date.now() - startTime;

      let stats = null;
      let success = code === 0;

      // Try to parse Jest JSON output
      try {
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];

          if (lastLine.startsWith('{')) {
            const result = JSON.parse(lastLine);
            if (result.testResults && result.testResults.length > 0) {
              const testResult = result.testResults[0];
              stats = {
                total: testResult.numPassingTests + testResult.numFailingTests,
                passed: testResult.numPassingTests,
                failed: testResult.numFailingTests,
                skipped: testResult.numPendingTests || 0
              };
            }
          }
        }
      } catch (e) {
        // If JSON parsing fails, we'll just use the exit code
      }

      const result = {
        name: suite.name,
        file: suite.file,
        success: success,
        duration: duration,
        stats: stats
      };

      if (!success) {
        result.error = stderr || `Test suite exited with code ${code}`;
      }

      // Log result
      const status = success ? '✅ PASSED' : '❌ FAILED';
      const color = success ? 'green' : 'red';
      colorLog(`${status} ${suite.name} (${duration}ms)`, color);

      if (stats) {
        colorLog(`   ${stats.passed}/${stats.total} tests passed`, success ? 'green' : 'white');
      }

      resolve(result);
    });

    jest.on('error', (error) => {
      resolve({
        name: suite.name,
        file: suite.file,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    });
  });
}

/**
 * Generate detailed test report
 */
function generateTestReport(results) {
  const reportPath = path.join(__dirname, 'chat_actions_test_report.json');

  const report = {
    timestamp: new Date().toISOString(),
    testSuites: results,
    summary: {
      totalSuites: results.length,
      passedSuites: results.filter(r => r.success).length,
      failedSuites: results.filter(r => !r.success).length,
      successRate: Math.round((results.filter(r => r.success).length / results.length) * 100),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      testConfig: TEST_CONFIG
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  colorLog(`\n📊 Detailed test report saved to: ${reportPath}`, 'cyan');

  return report;
}

/**
 * Check prerequisites before running tests
 */
function checkPrerequisites() {
  colorLog('🔍 Checking prerequisites...', 'yellow');

  const issues = [];

  // Check if Jest is available
  try {
    execSync('npx jest --version', { stdio: 'pipe' });
    colorLog('✅ Jest is available', 'green');
  } catch (error) {
    issues.push('Jest is not installed or not available');
  }

  // Check if test files exist
  TEST_SUITES.forEach(suite => {
    const testPath = path.join(__dirname, suite.file);
    if (!fs.existsSync(testPath)) {
      issues.push(`Test file missing: ${suite.file}`);
    } else {
      colorLog(`✅ Found test file: ${suite.file}`, 'green');
    }
  });

  // Check if frontend is running (optional)
  // This is just a warning, not a blocker
  try {
    require('http').get('http://localhost:3000', (res) => {
      colorLog('✅ Frontend appears to be running on port 3000', 'green');
    }).on('error', () => {
      colorLog('⚠️  Frontend may not be running on port 3000 (this is optional for unit tests)', 'yellow');
    });
  } catch (error) {
    // Ignore
  }

  // Check if backend is running (optional)
  try {
    require('http').get('http://localhost:8000/health', (res) => {
      colorLog('✅ Backend appears to be running on port 8000', 'green');
    }).on('error', () => {
      colorLog('⚠️  Backend may not be running on port 8000 (this is optional for unit tests)', 'yellow');
    });
  } catch (error) {
    // Ignore
  }

  if (issues.length > 0) {
    colorLog('\n❌ Prerequisites check failed:', 'red');
    issues.forEach(issue => {
      colorLog(`   - ${issue}`, 'red');
    });
    return false;
  }

  colorLog('✅ All prerequisites met', 'green');
  return true;
}

/**
 * Main execution function
 */
async function main() {
  printHeader('CHAT ACTIONS INTEGRATION TEST SUITE');

  console.log('');
  colorLog('This test suite validates the chat actions integration functionality:', 'white');
  colorLog('• Message editing, deletion, and regeneration', 'white');
  colorLog('• Upvote/downvote feedback system', 'white');
  colorLog('• Real-time SSE updates', 'white');
  colorLog('• Backend API integration', 'white');
  colorLog('• Gemini AI model integration', 'white');
  console.log('');

  // Check prerequisites
  if (!checkPrerequisites()) {
    colorLog('Exiting due to missing prerequisites.', 'red');
    process.exit(1);
  }

  const results = [];

  // Run each test suite
  for (const suite of TEST_SUITES) {
    const result = await runTestSuite(suite);
    results.push(result);

    // If bail is enabled and test failed, stop execution
    if (TEST_CONFIG.bail && !result.success) {
      colorLog(`\n🛑 Stopping execution due to test failure (bail mode enabled)`, 'red');
      break;
    }
  }

  // Print summary
  printSummary(results);

  // Generate detailed report
  const report = generateTestReport(results);

  // Exit with appropriate code
  const allPassed = results.every(r => r.success);
  const exitCode = allPassed ? 0 : 1;

  console.log('');
  if (allPassed) {
    colorLog('🎉 All tests passed! Chat actions integration is working correctly.', 'green');
  } else {
    colorLog('⚠️  Some tests failed. Please review the results and fix issues before deployment.', 'red');
  }

  process.exit(exitCode);
}

// Handle process signals
process.on('SIGINT', () => {
  colorLog('\n\n🛑 Test execution interrupted by user', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  colorLog('\n\n🛑 Test execution terminated', 'yellow');
  process.exit(143);
});

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    colorLog(`\n❌ Unexpected error: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = {
  runTestSuite,
  TEST_SUITES,
  TEST_CONFIG
};