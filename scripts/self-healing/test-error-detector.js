#!/usr/bin/env node

/**
 * Test Suite for Error Detection and Monitoring System
 * 
 * This test demonstrates all the capabilities of the error detection system
 * including pattern matching, classification, and recovery suggestions.
 */

const {
  monitorCommand,
  detectMissingDependency,
  analyzeSyntaxError,
  classifyError,
  storeErrorPattern,
  SEVERITY_LEVELS,
  ERROR_CATEGORIES,
  getErrorStats,
  getLearnedPatterns
} = require('./error-detector.js');

/**
 * Test cases for different error types
 */
const TEST_CASES = {
  dependencyErrors: [
    {
      name: 'Missing NPM Module',
      command: 'node server.js',
      output: `Error: Cannot find module 'express'
Require stack:
- /Users/nick/project/server.js
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:880:15)`,
      exitCode: 1
    },
    {
      name: 'Command Not Found',
      command: 'webpack --mode production',
      output: 'webpack: command not found',
      exitCode: 127
    },
    {
      name: 'Python Module Missing',
      command: 'python app.py',
      output: 'ModuleNotFoundError: No module named "flask"',
      exitCode: 1
    }
  ],

  syntaxErrors: [
    {
      name: 'JavaScript Syntax Error',
      command: 'node app.js',
      output: `SyntaxError: Unexpected token '}' in /Users/nick/project/app.js at line 42:15
    return data;
               ^`,
      exitCode: 1
    },
    {
      name: 'TypeScript Compilation Error',
      command: 'tsc',
      output: `error TS2304: Cannot find name 'React' at src/component.tsx:1:8
src/component.tsx(1,8): error TS2304: Cannot find name 'React'.`,
      exitCode: 1
    },
    {
      name: 'JSON Parse Error',
      command: 'node config-parser.js',
      output: 'Unexpected token } in JSON at position 154 in /config/settings.json',
      exitCode: 1
    }
  ],

  runtimeErrors: [
    {
      name: 'Network Connection Error',
      command: 'npm install',
      output: `npm ERR! network request to https://registry.npmjs.org/express failed
npm ERR! network This is a problem related to network connectivity.
npm ERR! network ECONNREFUSED 127.0.0.1:8080`,
      exitCode: 1
    },
    {
      name: 'Permission Denied',
      command: 'npm install -g webpack',
      output: `npm ERR! Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/webpack'
npm ERR! The operation was rejected by your operating system.`,
      exitCode: 1
    }
  ],

  testFailures: [
    {
      name: 'Jest Test Failures',
      command: 'npm test',
      output: `FAIL src/components/Button.test.tsx
  ✓ should render correctly (24 ms)
  ✗ should handle click events (15 ms)
  ✗ should validate props (8 ms)

Test Suites: 1 failed, 2 passed, 3 total
Tests:       2 failed, 15 passed, 17 total`,
      exitCode: 1
    }
  ],

  buildErrors: [
    {
      name: 'Webpack Build Failure',
      command: 'npm run build',
      output: `webpack compilation failed with 3 errors:

ERROR in ./src/index.js 15:0-25
Module not found: Error: Can't resolve './components/Button' in '/src'

ERROR in ./src/styles/main.css
ModuleBuildError: Module build failed (from ./node_modules/css-loader/dist/cjs.js)`,
      exitCode: 1
    }
  ]
};

/**
 * Run comprehensive error detection tests
 */
async function runTests() {
  console.log('🧪 Running Error Detection System Tests\n');
  
  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  // Test all error categories
  for (const [category, testCases] of Object.entries(TEST_CASES)) {
    console.log(`\n📋 Testing ${category.toUpperCase()}:`);
    console.log('='.repeat(50));

    for (const testCase of testCases) {
      totalTests++;
      console.log(`\n🔍 Test: ${testCase.name}`);
      
      try {
        // Monitor the command
        const result = await monitorCommand(testCase.command, testCase.output, testCase.exitCode);
        
        // Display results
        console.log(`  ❌ Error detected: ${result.hasError ? 'YES' : 'NO'}`);
        console.log(`  📊 Severity: ${result.severity}`);
        console.log(`  📂 Category: ${result.category || 'N/A'}`);
        console.log(`  🔢 Errors found: ${result.errors.length}`);
        
        if (result.errors.length > 0) {
          console.log(`  🎯 Error types: ${result.errors.map(e => e.type).join(', ')}`);
        }
        
        if (result.suggestions.length > 0) {
          console.log(`  💡 Suggestions (${result.suggestions.length}):`);
          result.suggestions.slice(0, 3).forEach((suggestion, i) => {
            console.log(`     ${i + 1}. ${suggestion.command} (${suggestion.category})`);
          });
        }
        
        results.push({
          test: testCase.name,
          category,
          passed: result.hasError,
          result
        });
        
        if (result.hasError) {
          passedTests++;
          console.log(`  ✅ PASSED`);
        } else {
          console.log(`  ❌ FAILED - Should have detected error`);
        }
        
      } catch (error) {
        console.log(`  💥 ERROR: ${error.message}`);
        results.push({
          test: testCase.name,
          category,
          passed: false,
          error: error.message
        });
      }
    }
  }

  // Test individual functions
  console.log('\n\n🔧 Testing Individual Functions:');
  console.log('='.repeat(50));

  // Test detectMissingDependency
  console.log('\n📦 Testing Missing Dependency Detection:');
  const depTests = [
    'Cannot find module "express"',
    'command not found: webpack',
    'ModuleNotFoundError: No module named "requests"'
  ];

  for (const depTest of depTests) {
    const depResult = detectMissingDependency(depTest);
    console.log(`  Input: ${depTest}`);
    console.log(`  Result: ${depResult ? `Found ${depResult.name} (${depResult.type})` : 'Not detected'}`);
    
    if (depResult && depResult.suggestions) {
      console.log(`  Suggestions: ${depResult.suggestions.slice(0, 2).join(', ')}`);
    }
  }

  // Test syntax error analysis
  console.log('\n🔍 Testing Syntax Error Analysis:');
  const syntaxError = new Error('SyntaxError: Unexpected token } at line 42:15');
  const syntaxAnalysis = await analyzeSyntaxError(syntaxError, '/Users/nick/project/app.js');
  
  console.log(`  File: ${syntaxAnalysis.file}`);
  console.log(`  Type: ${syntaxAnalysis.subtype || syntaxAnalysis.type}`);
  console.log(`  Line: ${syntaxAnalysis.lineNumber || 'Unknown'}`);
  console.log(`  Column: ${syntaxAnalysis.columnNumber || 'Unknown'}`);
  console.log(`  Suggestions: ${syntaxAnalysis.suggestions.length}`);

  // Test error classification
  console.log('\n📊 Testing Error Classification:');
  const classificationTests = [
    { type: 'MISSING_MODULE', message: 'Cannot find module express' },
    { type: 'JAVASCRIPT_SYNTAX', message: 'SyntaxError at line 10' },
    { type: 'PERMISSION_DENIED', message: 'EACCES permission denied' }
  ];

  for (const classTest of classificationTests) {
    const classification = classifyError(classTest);
    console.log(`  Error: ${classTest.type}`);
    console.log(`  Classification: ${classification.category} | ${classification.severity} | Priority: ${classification.priority}`);
    console.log(`  Fixable: ${classification.fixable} | Automated: ${classification.automated}`);
  }

  // Display final statistics
  console.log('\n\n📈 Test Summary:');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  // Show error statistics from the detector
  console.log('\n📊 Error Detection Statistics:');
  const stats = getErrorStats();
  console.log(JSON.stringify(stats, null, 2));

  // Show learned patterns
  console.log('\n🧠 Learned Patterns:');
  const patterns = getLearnedPatterns();
  if (patterns.length > 0) {
    patterns.slice(0, 5).forEach(pattern => {
      console.log(`  ${pattern.key}: ${pattern.occurrences} occurrences`);
      if (pattern.successfulRecoveries > 0) {
        console.log(`    ✅ Successful recoveries: ${pattern.successfulRecoveries}`);
      }
    });
  } else {
    console.log('  No patterns learned yet');
  }

  console.log('\n🎉 Error Detection System Test Complete!\n');
}

/**
 * Test memory integration
 */
async function testMemoryIntegration() {
  console.log('💾 Testing Memory Integration:');
  
  const testError = {
    command: 'test-command',
    errors: [{ type: 'TEST_ERROR', message: 'Test error message' }],
    category: ERROR_CATEGORIES.TEST,
    severity: SEVERITY_LEVELS.MEDIUM
  };

  const testRecovery = {
    strategy: 'test-strategy',
    success: true,
    timeToResolve: 5000
  };

  try {
    await storeErrorPattern(testError, testRecovery);
    console.log('  ✅ Successfully stored error pattern in memory');
  } catch (error) {
    console.log(`  ❌ Failed to store pattern: ${error.message}`);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => testMemoryIntegration())
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testMemoryIntegration };