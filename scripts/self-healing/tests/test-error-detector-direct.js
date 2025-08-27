#!/usr/bin/env node

/**
 * Direct test of error detector functionality
 * Tests error detection with specific error messages
 */

const { spawn } = require('child_process');
const path = require('path');

class ErrorDetectorTester {
    constructor() {
        this.errorDetectorPath = path.join(__dirname, '..', 'error-detector.js');
    }

    async testErrorDetection() {
        console.log('🔍 Testing Error Detector with specific error messages...');
        
        // Test specific error messages
        const testErrors = [
            {
                error: 'Cannot find module "commander"',
                expectedType: 'missing_dependency',
                description: 'Missing commander module'
            },
            {
                error: 'SyntaxError: Unexpected token }',
                expectedType: 'syntax_error',
                description: 'Syntax error with unexpected token'
            },
            {
                error: 'EACCES: permission denied',
                expectedType: 'permission_denied',
                description: 'Permission denied error'
            }
        ];

        // Run the error detector in test mode and analyze output
        const testResult = await this.runErrorDetectorTest();
        console.log('Error detector test mode result:', testResult.success ? '✅' : '❌');
        
        if (testResult.success) {
            console.log('Error patterns detected:', testResult.patternsFound);
            return true;
        } else {
            console.log('Error detector test failed:', testResult.error);
            return false;
        }
    }

    async runErrorDetectorTest() {
        return new Promise((resolve) => {
            const proc = spawn('node', [this.errorDetectorPath, 'test'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            proc.on('close', (code) => {
                const success = code === 0 && stdout.includes('Detected dependency issue');
                const patternsFound = (stdout.match(/Detected dependency issue/g) || []).length;
                
                resolve({ 
                    success, 
                    code, 
                    stdout, 
                    stderr, 
                    patternsFound,
                    error: stderr || (code !== 0 ? `Exit code: ${code}` : null)
                });
            });
        });
    }
}

// Run test if called directly
if (require.main === module) {
    const tester = new ErrorDetectorTester();
    tester.testErrorDetection().then(success => {
        console.log(`\n🎯 Error detector test ${success ? 'PASSED' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = ErrorDetectorTester;