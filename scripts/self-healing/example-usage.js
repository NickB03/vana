#!/usr/bin/env node

/**
 * Example usage of the Auto-Recovery System
 * Demonstrates various recovery scenarios and how to integrate the system
 */

const {
  recoverFromError,
  installMissingDependency,
  fixSyntaxError,
  retryWithBackoff,
  recoverTestFailure,
  rollbackChanges,
  AutoRecovery
} = require('./auto-recovery');

async function demonstrateRecoverySystem() {
  console.log('🚀 Auto-Recovery System Demonstration\n');

  // Example 1: Handling Missing Dependencies
  console.log('📦 Example 1: Missing Dependency Recovery');
  try {
    // Simulate a missing dependency error
    const missingDepError = new Error("Cannot find module 'express'");
    console.log('   Simulating error:', missingDepError.message);
    
    const recovered = await recoverFromError(missingDepError, {
      command: 'node server.js',
      workingDirectory: process.cwd()
    });
    
    console.log(`   Recovery result: ${recovered ? '✅ Success' : '❌ Failed'}`);
  } catch (error) {
    console.log(`   Recovery error: ${error.message}`);
  }
  console.log();

  // Example 2: Syntax Error Recovery
  console.log('🔧 Example 2: Syntax Error Recovery');
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Create a temporary file with syntax errors
    const tempFile = path.join(__dirname, 'temp-syntax-demo.js');
    const badCode = `
// This file has intentional syntax errors for demonstration
const message = "Hello World  // Missing closing quote
function greet() {
  console.log(message)  // Missing semicolon
  if (true) {
    console.log("Missing closing brace")
`;
    
    fs.writeFileSync(tempFile, badCode);
    console.log('   Created file with syntax errors:', tempFile);
    
    const syntaxError = new Error('SyntaxError: Unexpected token');
    const fixed = await fixSyntaxError(tempFile, syntaxError);
    
    console.log(`   Syntax fix result: ${fixed ? '✅ Fixed' : '❌ Could not fix'}`);
    
    // Show the fixed content if successful
    if (fixed && fs.existsSync(tempFile)) {
      console.log('   Fixed content preview:');
      const fixedContent = fs.readFileSync(tempFile, 'utf8');
      console.log('   ' + fixedContent.split('\n').slice(0, 5).join('\n   '));
    }
    
    // Cleanup
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    
  } catch (error) {
    console.log(`   Syntax fix error: ${error.message}`);
  }
  console.log();

  // Example 3: Command Retry with Backoff
  console.log('🔄 Example 3: Retry with Exponential Backoff');
  try {
    let attemptCount = 0;
    
    // Simulate a flaky command that fails 2 times then succeeds
    const flakyCommand = async () => {
      attemptCount++;
      console.log(`   Attempt ${attemptCount}`);
      
      if (attemptCount <= 2) {
        throw new Error(`Simulated failure on attempt ${attemptCount}`);
      }
      
      console.log('   ✅ Command succeeded!');
      return true;
    };
    
    const success = await retryWithBackoff(flakyCommand, 5);
    console.log(`   Final result: ${success ? '✅ Success' : '❌ Failed'} after ${attemptCount} attempts`);
    
  } catch (error) {
    console.log(`   Retry error: ${error.message}`);
  }
  console.log();

  // Example 4: Test Recovery
  console.log('🧪 Example 4: Test Failure Recovery');
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Create a temporary test file
    const tempTest = path.join(__dirname, 'temp-demo.test.js');
    const testContent = `
describe('Demo Test Suite', () => {
  it('should handle async operations', async () => {
    // This test might have timing issues
    const result = await new Promise(resolve => {
      setTimeout(() => resolve('success'), 100);
    });
    expect(result).toBe('success');
  });
  
  it('should mock dependencies', () => {
    // This test might need proper mocks
    const fs = require('fs');
    expect(fs.readFileSync).toBeDefined();
  });
});
`;
    
    fs.writeFileSync(tempTest, testContent);
    console.log('   Created test file:', tempTest);
    
    const testError = new Error('Test failed: ReferenceError: expect is not defined');
    const recovered = await recoverTestFailure(tempTest, testError);
    
    console.log(`   Test recovery result: ${recovered ? '✅ Recovered' : '❌ Could not recover'}`);
    
    // Cleanup
    if (fs.existsSync(tempTest)) fs.unlinkSync(tempTest);
    
  } catch (error) {
    console.log(`   Test recovery error: ${error.message}`);
  }
  console.log();

  // Example 5: Custom Recovery Configuration
  console.log('⚙️ Example 5: Custom Recovery Configuration');
  try {
    const customRecovery = new AutoRecovery();
    
    // Configure custom settings
    customRecovery.maxRetries = 10;
    customRecovery.backoffMultiplier = 1.5;
    customRecovery.initialDelay = 500;
    
    console.log('   Custom configuration:');
    console.log(`   - Max retries: ${customRecovery.maxRetries}`);
    console.log(`   - Backoff multiplier: ${customRecovery.backoffMultiplier}`);
    console.log(`   - Initial delay: ${customRecovery.initialDelay}ms`);
    
    // Test the custom configuration with a simulated error
    const testError = new Error('Test error for custom recovery');
    
    // This will demonstrate the configuration without actually installing anything
    const result = await customRecovery.recoverFromError(testError, {
      command: 'echo "test command"',
      skipActualRecovery: true
    });
    
    console.log(`   Custom recovery completed: ${result}`);
    
  } catch (error) {
    console.log(`   Custom recovery error: ${error.message}`);
  }
  console.log();

  // Example 6: Rollback Demonstration
  console.log('🔄 Example 6: Rollback System');
  try {
    const fs = require('fs');
    const path = require('path');
    
    const recovery = new AutoRecovery();
    
    // Create some test files and changes
    const testFile1 = path.join(__dirname, 'rollback-test-1.txt');
    const testFile2 = path.join(__dirname, 'rollback-test-2.txt');
    
    fs.writeFileSync(testFile1, 'Original content 1');
    fs.writeFileSync(testFile2, 'Original content 2');
    
    // Simulate making backups during recovery
    const backup1 = testFile1 + '.backup.' + Date.now();
    const backup2 = testFile2 + '.backup.' + (Date.now() + 1);
    
    fs.copyFileSync(testFile1, backup1);
    fs.copyFileSync(testFile2, backup2);
    
    // Log the changes
    recovery.logChange({
      type: 'file_backup',
      originalFile: testFile1,
      backupFile: backup1,
      timestamp: new Date().toISOString()
    });
    
    recovery.logChange({
      type: 'file_backup',
      originalFile: testFile2,
      backupFile: backup2,
      timestamp: new Date().toISOString()
    });
    
    // Modify the original files
    fs.writeFileSync(testFile1, 'Modified content 1');
    fs.writeFileSync(testFile2, 'Modified content 2');
    
    console.log('   Created files and backups');
    console.log(`   Change log has ${recovery.changeLog.length} entries`);
    
    // Perform rollback
    const rollbackSuccess = await recovery.rollbackChanges();
    
    // Verify rollback
    const content1 = fs.readFileSync(testFile1, 'utf8');
    const content2 = fs.readFileSync(testFile2, 'utf8');
    
    console.log(`   Rollback result: ${rollbackSuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`   File 1 content: "${content1}"`);
    console.log(`   File 2 content: "${content2}"`);
    
    // Cleanup
    [testFile1, testFile2].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    
  } catch (error) {
    console.log(`   Rollback error: ${error.message}`);
  }
  console.log();

  console.log('🎉 Auto-Recovery System demonstration completed!');
  console.log('\n📚 Integration Tips:');
  console.log('1. Use recoverFromError() as your main error handler');
  console.log('2. Configure retry settings based on your environment');
  console.log('3. Always test recovery strategies before production');
  console.log('4. Monitor recovery success rates and adjust patterns');
  console.log('5. Keep rollback capabilities for critical operations');
}

// Integration example with error boundaries
class ErrorBoundary {
  static async handleError(error, context = {}) {
    console.log(`🚨 Error boundary triggered: ${error.message}`);
    
    try {
      const recovered = await recoverFromError(error, context);
      
      if (recovered) {
        console.log('✅ Error recovered automatically');
        return { recovered: true, error: null };
      } else {
        console.log('❌ Automatic recovery failed');
        return { recovered: false, error };
      }
    } catch (recoveryError) {
      console.log(`❌ Recovery system error: ${recoveryError.message}`);
      return { recovered: false, error: recoveryError };
    }
  }
}

// Example usage with process error handlers
process.on('uncaughtException', async (error) => {
  console.log('🚨 Uncaught Exception detected');
  const result = await ErrorBoundary.handleError(error, {
    type: 'uncaughtException',
    command: process.argv.join(' ')
  });
  
  if (!result.recovered) {
    console.log('❌ Could not recover from uncaught exception');
    process.exit(1);
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  console.log('🚨 Unhandled Promise Rejection detected');
  const error = reason instanceof Error ? reason : new Error(String(reason));
  
  const result = await ErrorBoundary.handleError(error, {
    type: 'unhandledRejection',
    promise: promise
  });
  
  if (!result.recovered) {
    console.log('❌ Could not recover from unhandled rejection');
    process.exit(1);
  }
});

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateRecoverySystem().catch(error => {
    console.error('❌ Demonstration failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  demonstrateRecoverySystem,
  ErrorBoundary
};