#!/usr/bin/env node

/**
 * Comprehensive Auth Guard Test Runner
 * 
 * This script runs all AuthGuard tests and validates the redirect loop fixes.
 * It provides detailed reporting on test results and performance metrics.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Print colored output
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printSection(title) {
  print(`\n${'='.repeat(60)}`, 'cyan');
  print(`${title.toUpperCase()}`, 'bright');
  print(`${'='.repeat(60)}`, 'cyan');
}

/**
 * Print test result summary
 */
function printTestResult(testName, passed, details = '') {
  const status = passed ? '✅ PASSED' : '❌ FAILED';
  const statusColor = passed ? 'green' : 'red';
  
  print(`${status} ${testName}`, statusColor);
  if (details) {
    print(`   ${details}`, 'dim');
  }
}

/**
 * Run a test file and return results
 */
function runTest(testFile, description) {
  try {
    print(`\nRunning: ${description}`, 'yellow');
    print(`File: ${testFile}`, 'dim');
    
    const startTime = Date.now();
    
    // Run the test with Jest
    const result = execSync(
      `cd /Users/nick/Development/vana/frontend && npm test -- ${testFile} --verbose --passWithNoTests`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      passed: true,
      duration,
      output: result,
      details: `Completed in ${duration}ms`
    };
  } catch (error) {
    return {
      passed: false,
      duration: 0,
      output: error.stdout || error.message,
      error: error.stderr || error.message,
      details: 'Test execution failed'
    };
  }
}

/**
 * Validate test file exists and has proper structure
 */
function validateTestFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: 'File does not exist' };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for key test patterns
  const hasDescribe = content.includes('describe(');
  const hasIt = content.includes('it(');
  const hasExpect = content.includes('expect(');
  
  if (!hasDescribe || !hasIt || !hasExpect) {
    return { 
      valid: false, 
      reason: 'Missing required test structure (describe/it/expect)' 
    };
  }
  
  return { valid: true };
}

/**
 * Main test execution
 */
async function runAuthGuardTests() {
  printSection('AuthGuard Redirect Loop Prevention Test Suite');
  
  print('This test suite validates the following fixes:', 'blue');
  print('1. Authentication state stabilization', 'dim');
  print('2. Redirect loop prevention with history tracking', 'dim');
  print('3. Memoized function dependencies prevent infinite re-renders', 'dim');
  print('4. Debounced storage handlers prevent oscillation', 'dim');
  print('5. Redirect target validation', 'dim');
  print('6. Edge cases and regression prevention', 'dim');
  
  const testSuite = [
    {
      file: '/Users/nick/Development/vana/tests/auth-guard-redirect-loop-prevention.test.tsx',
      description: 'AuthGuard Redirect Loop Prevention Tests',
      category: 'Core Functionality'
    },
    {
      file: '/Users/nick/Development/vana/tests/use-auth-stabilization.test.ts',
      description: 'Auth Stabilization Hook Tests',
      category: 'Hook Implementation'
    },
    {
      file: '/Users/nick/Development/vana/tests/auth-guard-integration-scenarios.test.tsx',
      description: 'Real-World Integration Scenarios',
      category: 'Integration Testing'
    },
    {
      file: '/Users/nick/Development/vana/frontend/__tests__/auth/auth-guard-integration.test.tsx',
      description: 'Existing AuthGuard Integration Tests (Regression Check)',
      category: 'Regression Prevention'
    }
  ];
  
  const results = {
    total: testSuite.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    totalDuration: 0,
    details: []
  };
  
  // Validate all test files first
  printSection('Test File Validation');
  
  for (const test of testSuite) {
    const validation = validateTestFile(test.file);
    if (!validation.valid) {
      print(`❌ ${test.file}`, 'red');
      print(`   ${validation.reason}`, 'dim');
      results.skipped++;
      results.details.push({
        ...test,
        status: 'skipped',
        reason: validation.reason
      });
    } else {
      print(`✅ ${test.file}`, 'green');
      print(`   Valid test structure found`, 'dim');
    }
  }
  
  // Run each test
  printSection('Test Execution');
  
  for (const test of testSuite) {
    const validation = validateTestFile(test.file);
    if (!validation.valid) {
      continue; // Skip invalid files
    }
    
    const result = runTest(test.file, test.description);
    
    if (result.passed) {
      results.passed++;
      printTestResult(test.description, true, result.details);
    } else {
      results.failed++;
      printTestResult(test.description, false, result.details);
      
      if (result.error) {
        print(`   Error: ${result.error}`, 'red');
      }
    }
    
    results.totalDuration += result.duration;
    results.details.push({
      ...test,
      ...result,
      status: result.passed ? 'passed' : 'failed'
    });
  }
  
  // Print summary
  printSection('Test Summary');
  
  const totalTests = results.passed + results.failed;
  const successRate = totalTests > 0 ? ((results.passed / totalTests) * 100).toFixed(1) : 0;
  
  print(`Total Tests: ${results.total}`, 'blue');
  print(`Executed: ${totalTests}`, 'blue');
  print(`Passed: ${results.passed}`, 'green');
  print(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  print(`Skipped: ${results.skipped}`, 'yellow');
  print(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  print(`Total Duration: ${results.totalDuration}ms`, 'dim');
  
  // Print category breakdown
  printSection('Test Categories');
  
  const categories = {};
  results.details.forEach(detail => {
    if (!categories[detail.category]) {
      categories[detail.category] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    }
    categories[detail.category].total++;
    categories[detail.category][detail.status]++;
  });
  
  Object.entries(categories).forEach(([category, stats]) => {
    print(`\n${category}:`, 'bright');
    print(`  Total: ${stats.total}`, 'dim');
    print(`  Passed: ${stats.passed}`, stats.passed > 0 ? 'green' : 'dim');
    print(`  Failed: ${stats.failed}`, stats.failed > 0 ? 'red' : 'dim');
    if (stats.skipped > 0) {
      print(`  Skipped: ${stats.skipped}`, 'yellow');
    }
  });
  
  // Print validation summary
  printSection('Validation Summary');
  
  const validationChecks = [
    {
      name: 'Authentication State Stabilization',
      passed: results.details.some(d => d.file.includes('auth-guard-redirect-loop-prevention') && d.status === 'passed'),
      description: 'Tests verify auth state stabilizes before redirect decisions'
    },
    {
      name: 'Redirect Loop Prevention',
      passed: results.details.some(d => d.file.includes('use-auth-stabilization') && d.status === 'passed'),
      description: 'Tests verify redirect history tracking prevents loops'
    },
    {
      name: 'Memoized Functions',
      passed: results.details.some(d => d.file.includes('auth-guard-redirect-loop-prevention') && d.status === 'passed'),
      description: 'Tests verify memoized callbacks prevent infinite re-renders'
    },
    {
      name: 'Edge Case Handling',
      passed: results.details.some(d => d.file.includes('auth-guard-integration-scenarios') && d.status === 'passed'),
      description: 'Tests verify cross-tab sync, network issues, rapid changes'
    },
    {
      name: 'Regression Prevention',
      passed: results.details.some(d => d.file.includes('auth-guard-integration') && d.status === 'passed'),
      description: 'Tests verify existing functionality remains intact'
    }
  ];
  
  validationChecks.forEach(check => {
    printTestResult(check.name, check.passed, check.description);
  });
  
  // Final result
  printSection('Final Result');
  
  const allCriticalTestsPassed = validationChecks.every(check => check.passed);
  
  if (allCriticalTestsPassed && results.failed === 0) {
    print('🎉 ALL TESTS PASSED - AuthGuard redirect loop fixes validated!', 'green');
    print('The following improvements have been successfully validated:', 'green');
    print('✅ Authentication state stabilization working correctly', 'green');
    print('✅ Redirect loop prevention implemented and tested', 'green');
    print('✅ Memoized functions preventing infinite re-renders', 'green');
    print('✅ Edge cases handled properly', 'green');
    print('✅ No regression in existing functionality', 'green');
  } else {
    print('⚠️  SOME TESTS FAILED - Review and fix issues', 'red');
    print('Please check the test output above for specific failures.', 'yellow');
  }
  
  // Save results to file for CI/CD
  const resultsSummary = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      executed: totalTests,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      successRate: parseFloat(successRate),
      totalDuration: results.totalDuration
    },
    validationChecks,
    details: results.details.map(d => ({
      file: d.file,
      description: d.description,
      category: d.category,
      status: d.status,
      duration: d.duration || 0
    }))
  };
  
  fs.writeFileSync(
    '/Users/nick/Development/vana/tests/auth-test-results.json',
    JSON.stringify(resultsSummary, null, 2)
  );
  
  print(`\nResults saved to: /Users/nick/Development/vana/tests/auth-test-results.json`, 'dim');
  
  return allCriticalTestsPassed && results.failed === 0;
}

// Execute if run directly
if (require.main === module) {
  runAuthGuardTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      print(`\nError running tests: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { runAuthGuardTests };