#!/usr/bin/env node

/**
 * Test file that requires a missing npm package (chalk)
 * This tests the error detector's ability to identify missing dependencies
 * and the auto-recovery's ability to install them.
 */

const fs = require('fs');
const path = require('path');

// This will cause a MODULE_NOT_FOUND error if commander is not installed
try {
  const { Command } = require('commander');
  
  console.log('✅ Success: commander package is available!');
  
  const program = new Command();
  program
    .name('test-commander')
    .description('Testing commander functionality')
    .version('1.0.0');
    
  program
    .option('-d, --debug', 'output extra debugging')
    .option('-s, --small', 'small pizza size')
    .option('-p, --pizza-type <type>', 'flavour of pizza');
  
  // Test commander's functionality without actually parsing process.argv
  console.log('Testing commander functionality:');
  console.log('  - Command creation: ✅');
  console.log('  - Options setup: ✅');
  console.log('  - Version setting: ✅');
  
  // Create a success indicator file
  const resultPath = path.join(__dirname, '..', 'test-results', 'missing-dep-success.json');
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify({
    test: 'missing-dependency',
    status: 'success',
    timestamp: new Date().toISOString(),
    package: 'commander',
    message: 'commander package successfully loaded and functional'
  }, null, 2));
  
  process.exit(0);
  
} catch (error) {
  console.error('❌ Error: Missing dependency detected');
  console.error('Package: commander');
  console.error('Error:', error.message);
  
  // Create a failure indicator file for analysis
  const resultPath = path.join(__dirname, '..', 'test-results', 'missing-dep-failure.json');
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify({
    test: 'missing-dependency',
    status: 'failure', 
    timestamp: new Date().toISOString(),
    package: 'commander',
    error: error.message,
    code: error.code
  }, null, 2));
  
  process.exit(1);
}