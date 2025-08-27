#!/usr/bin/env node

/**
 * Test file with intentional syntax errors
 * Tests the error detector's ability to identify syntax issues
 * and potentially auto-fix them.
 */

const fs = require('fs');
const path = require('path');

// Intentional syntax errors for testing:
// Missing semicolon
let message = 'Testing syntax error detection'

// Missing closing bracket (this will be fixed during test)
function testFunction() {
    console.log('Function with potential syntax issues');
    
    // Missing quotes around string
    let problematicVar = undefined string here;
    
    // Unclosed parenthesis
    console.log('This line has an issue';
    
    return 'test complete';
// Missing closing brace

// Another function with issues
function anotherTest( {
    const obj = {
        prop1: 'value1',
        prop2: 'value2'
        // Missing comma above
        prop3: 'value3'
    };
    
    return obj;
}

// Main execution
try {
    console.log('Starting syntax error test...');
    
    // This should fail due to syntax errors above
    testFunction();
    anotherTest();
    
    // If we get here, syntax was somehow valid or fixed
    const resultPath = path.join(__dirname, '..', 'test-results', 'syntax-error-success.json');
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(resultPath, JSON.stringify({
        test: 'syntax-error',
        status: 'success',
        timestamp: new Date().toISOString(),
        message: 'Syntax errors were resolved or file executed successfully'
    }, null, 2));
    
} catch (error) {
    console.error('❌ Syntax Error Detected:');
    console.error(error.message);
    
    // Log the syntax error for analysis
    const resultPath = path.join(__dirname, '..', 'test-results', 'syntax-error-failure.json');
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(resultPath, JSON.stringify({
        test: 'syntax-error',
        status: 'failure',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        errorType: error.name
    }, null, 2));
}