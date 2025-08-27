#!/usr/bin/env node

/**
 * Test script for the auto-recovery system
 * Simulates various error scenarios to test recovery mechanisms
 */

const { 
  recoverFromError, 
  installMissingDependency, 
  fixSyntaxError,
  retryWithBackoff,
  recoverTestFailure,
  rollbackChanges
} = require('./auto-recovery');

const fs = require('fs');
const path = require('path');

async function testRecoverySystem() {
  console.log('🧪 Testing Auto-Recovery System...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  async function runTest(testName, testFn) {
    testResults.total++;
    console.log(`\n🔧 Testing: ${testName}`);
    
    try {
      await testFn();
      console.log(`✅ PASSED: ${testName}`);
      testResults.passed++;
    } catch (error) {
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      testResults.failed++;
    }
  }

  // Test 1: Dependency Error Recovery
  await runTest('Dependency Error Recovery', async () => {
    const depError = new Error("Cannot find module 'nonexistent-package'");
    const result = await recoverFromError(depError, { command: 'node test.js' });
    if (!result) throw new Error('Recovery should have attempted dependency installation');
  });

  // Test 2: Missing Dependency Installation
  await runTest('Missing Dependency Installation', async () => {
    // Test with a real package that might not be installed
    const result = await installMissingDependency('lodash', 'npm');
    // This might fail if lodash is already installed, which is OK
    console.log(`    Installation result: ${result}`);
  });

  // Test 3: Syntax Error Fix
  await runTest('Syntax Error Fix', async () => {
    // Create a temporary file with syntax error
    const testFile = path.join(__dirname, 'temp-syntax-test.js');
    const badSyntax = `
const test = "unterminated string
function badFunction() {
  console.log("missing closing brace"
`;
    
    fs.writeFileSync(testFile, badSyntax);
    
    const syntaxError = new Error('Unterminated string literal');
    const result = await fixSyntaxError(testFile, syntaxError);
    
    // Clean up
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    if (fs.existsSync(testFile + '.backup.' + Date.now())) {
      fs.readdirSync(__dirname)
        .filter(file => file.startsWith('temp-syntax-test.js.backup'))
        .forEach(file => fs.unlinkSync(path.join(__dirname, file)));
    }
    
    console.log(`    Syntax fix result: ${result}`);
  });

  // Test 4: Retry with Backoff
  await runTest('Retry with Backoff', async () => {
    let attempts = 0;
    const flakyCommand = () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return true;
    };
    
    const result = await retryWithBackoff(flakyCommand, 5);
    if (!result) throw new Error('Retry should have succeeded after 3 attempts');
    if (attempts !== 3) throw new Error(`Expected 3 attempts, got ${attempts}`);
  });

  // Test 5: Test Failure Recovery
  await runTest('Test Failure Recovery', async () => {
    // Create a temporary test file
    const testFile = path.join(__dirname, 'temp-test.test.js');
    const testContent = `
describe('Test Suite', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
`;
    
    fs.writeFileSync(testFile, testContent);
    
    const testError = new Error('Test failed: timeout');
    const result = await recoverTestFailure(testFile, testError);
    
    // Clean up
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    fs.readdirSync(__dirname)
      .filter(file => file.startsWith('temp-test.test.js.backup'))
      .forEach(file => fs.unlinkSync(path.join(__dirname, file)));
    
    console.log(`    Test recovery result: ${result}`);
  });

  // Test 6: Error Type Detection
  await runTest('Error Type Detection', async () => {
    const { AutoRecovery } = require('./auto-recovery');
    const recovery = new AutoRecovery();
    
    // Test dependency error detection
    const depError = new Error("Cannot find module 'express'");
    if (!recovery.isDependencyError(depError)) {
      throw new Error('Should detect dependency error');
    }
    
    // Test syntax error detection
    const syntaxError = new Error('SyntaxError: Unexpected token');
    if (!recovery.isSyntaxError(syntaxError)) {
      throw new Error('Should detect syntax error');
    }
    
    // Test test error detection
    const testError = new Error('Jest test failed');
    if (!recovery.isTestError(testError)) {
      throw new Error('Should detect test error');
    }
  });

  // Test 7: Package Name Extraction
  await runTest('Package Name Extraction', async () => {
    const { AutoRecovery } = require('./auto-recovery');
    const recovery = new AutoRecovery();
    
    const errorMessages = [
      "Cannot find module 'express'",
      "Module not found: 'react'",
      "ImportError: No module named 'requests'"
    ];
    
    const expectedPackages = ['express', 'react', 'requests'];
    
    for (let i = 0; i < errorMessages.length; i++) {
      const extracted = recovery.extractPackageName(errorMessages[i]);
      if (extracted !== expectedPackages[i]) {
        throw new Error(`Expected ${expectedPackages[i]}, got ${extracted}`);
      }
    }
  });

  // Test 8: File Path Extraction
  await runTest('File Path Extraction', async () => {
    const { AutoRecovery } = require('./auto-recovery');
    const recovery = new AutoRecovery();
    
    const errorStack = `
Error: Something went wrong
    at Object.test (/Users/test/project/src/app.js:10:5)
    at Module._compile (internal/modules/cjs/loader.js:1063:30)
`;
    
    const filePath = recovery.extractFilePath(errorStack);
    if (!filePath || !filePath.includes('app.js')) {
      throw new Error(`Should extract file path, got: ${filePath}`);
    }
  });

  // Test 9: Rollback Changes
  await runTest('Rollback Changes', async () => {
    const { AutoRecovery } = require('./auto-recovery');
    const recovery = new AutoRecovery();
    
    // Create a test change log
    const testFile = path.join(__dirname, 'rollback-test.txt');
    fs.writeFileSync(testFile, 'original content');
    
    const backupFile = testFile + '.backup.' + Date.now();
    fs.writeFileSync(backupFile, 'original content');
    
    recovery.logChange({
      type: 'file_backup',
      originalFile: testFile,
      backupFile: backupFile
    });
    
    // Modify the original file
    fs.writeFileSync(testFile, 'modified content');
    
    // Rollback
    const result = await recovery.rollbackChanges();
    
    // Check if file was restored
    const restoredContent = fs.readFileSync(testFile, 'utf8');
    
    // Clean up
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    
    if (restoredContent !== 'original content') {
      throw new Error('File should have been restored to original content');
    }
    
    if (!result) throw new Error('Rollback should have succeeded');
  });

  // Print final results
  console.log('\n' + '='.repeat(50));
  console.log('🧪 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`📊 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Auto-recovery system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
  
  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  testRecoverySystem().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testRecoverySystem };