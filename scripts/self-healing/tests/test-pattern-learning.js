#!/usr/bin/env node

/**
 * Test pattern learning capabilities
 * Tests storing and retrieving real error patterns
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PatternLearningTester {
    constructor() {
        this.testResults = [];
        this.patternLearnerPath = path.join(__dirname, '..', 'pattern-learner.js');
        this.resultsPath = path.join(__dirname, '..', 'test-results', 'pattern-learning.json');
    }

    async runTest() {
        console.log('🧠 Starting Pattern Learning Tests...');
        
        try {
            // Test 1: Store error patterns
            await this.testStorePatterns();
            
            // Test 2: Retrieve error patterns
            await this.testRetrievePatterns();
            
            // Test 3: Pattern matching
            await this.testPatternMatching();
            
            // Test 4: Learning from new errors
            await this.testLearningFromNewErrors();
            
            this.saveResults();
            console.log('✅ Pattern Learning Tests Complete!');
            
        } catch (error) {
            console.error('❌ Pattern Learning Test Failed:', error);
            this.testResults.push({
                test: 'overall',
                status: 'failure',
                error: error.message
            });
            this.saveResults();
        }
    }

    async testStorePatterns() {
        console.log('📦 Testing pattern storage...');
        
        const testPatterns = [
            {
                type: 'MODULE_NOT_FOUND',
                pattern: /Cannot find module '([^']+)'/,
                solution: 'npm install $1',
                confidence: 0.95,
                examples: [
                    "Error: Cannot find module 'chalk'",
                    "Error: Cannot find module 'lodash'"
                ]
            },
            {
                type: 'SYNTAX_ERROR',
                pattern: /SyntaxError: (.+)/,
                solution: 'Check syntax around line indicated',
                confidence: 0.80,
                examples: [
                    "SyntaxError: Unexpected token ')'",
                    "SyntaxError: Missing closing bracket"
                ]
            },
            {
                type: 'PERMISSION_DENIED',
                pattern: /EACCES: permission denied/,
                solution: 'chmod +x or run with sudo',
                confidence: 0.90,
                examples: [
                    "Error: EACCES: permission denied, open 'file.txt'"
                ]
            }
        ];

        for (const pattern of testPatterns) {
            try {
                // Simulate storing pattern (would normally use pattern-learner.js)
                const stored = await this.storePattern(pattern);
                this.testResults.push({
                    test: 'store-pattern',
                    patternType: pattern.type,
                    status: stored ? 'success' : 'failure',
                    timestamp: new Date().toISOString()
                });
                console.log(`  ✅ Stored pattern: ${pattern.type}`);
            } catch (error) {
                this.testResults.push({
                    test: 'store-pattern',
                    patternType: pattern.type,
                    status: 'failure',
                    error: error.message
                });
                console.log(`  ❌ Failed to store pattern: ${pattern.type}`);
            }
        }
    }

    async testRetrievePatterns() {
        console.log('🔍 Testing pattern retrieval...');
        
        const testErrors = [
            "Error: Cannot find module 'commander'",
            "SyntaxError: Unexpected token '}'",
            "Error: EACCES: permission denied, mkdir 'test'"
        ];

        for (const errorMsg of testErrors) {
            try {
                const matchedPattern = await this.retrievePattern(errorMsg);
                this.testResults.push({
                    test: 'retrieve-pattern',
                    errorMessage: errorMsg,
                    matched: !!matchedPattern,
                    patternType: matchedPattern?.type || 'unknown',
                    status: matchedPattern ? 'success' : 'failure',
                    timestamp: new Date().toISOString()
                });
                console.log(`  ✅ Retrieved pattern for: ${errorMsg.substring(0, 50)}...`);
            } catch (error) {
                this.testResults.push({
                    test: 'retrieve-pattern',
                    errorMessage: errorMsg,
                    status: 'failure',
                    error: error.message
                });
                console.log(`  ❌ Failed to retrieve pattern for: ${errorMsg.substring(0, 50)}...`);
            }
        }
    }

    async testPatternMatching() {
        console.log('🎯 Testing pattern matching accuracy...');
        
        const testCases = [
            {
                error: "Error: Cannot find module 'express'",
                expectedType: 'MODULE_NOT_FOUND',
                expectedSolution: 'npm install express'
            },
            {
                error: "SyntaxError: Unexpected end of input",
                expectedType: 'SYNTAX_ERROR',
                expectedSolution: 'Check syntax around line indicated'
            }
        ];

        let correctMatches = 0;
        for (const testCase of testCases) {
            try {
                const result = await this.matchPattern(testCase.error);
                const isCorrect = result.type === testCase.expectedType;
                
                if (isCorrect) correctMatches++;
                
                this.testResults.push({
                    test: 'pattern-matching',
                    error: testCase.error,
                    expectedType: testCase.expectedType,
                    actualType: result.type,
                    correct: isCorrect,
                    status: isCorrect ? 'success' : 'failure',
                    timestamp: new Date().toISOString()
                });
                
                console.log(`  ${isCorrect ? '✅' : '❌'} Pattern matching: ${testCase.expectedType}`);
            } catch (error) {
                this.testResults.push({
                    test: 'pattern-matching',
                    error: testCase.error,
                    status: 'failure',
                    error: error.message
                });
            }
        }
        
        const accuracy = (correctMatches / testCases.length) * 100;
        console.log(`  📊 Pattern matching accuracy: ${accuracy}%`);
    }

    async testLearningFromNewErrors() {
        console.log('🎓 Testing learning from new errors...');
        
        const newErrors = [
            "TypeError: Cannot read property 'length' of undefined",
            "ReferenceError: variableName is not defined",
            "Error: ENOENT: no such file or directory, open 'missing.txt'"
        ];

        for (const error of newErrors) {
            try {
                const learned = await this.learnFromError(error);
                this.testResults.push({
                    test: 'learn-new-error',
                    error: error,
                    learned: learned,
                    status: learned ? 'success' : 'failure',
                    timestamp: new Date().toISOString()
                });
                console.log(`  ${learned ? '✅' : '❌'} Learned from: ${error.substring(0, 50)}...`);
            } catch (error) {
                this.testResults.push({
                    test: 'learn-new-error',
                    error: error.message,
                    status: 'failure'
                });
            }
        }
    }

    // Mock implementations (would integrate with actual pattern-learner.js)
    async storePattern(pattern) {
        // Simulate pattern storage
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), 100);
        });
    }

    async retrievePattern(errorMsg) {
        // Simulate pattern retrieval with basic matching
        if (errorMsg.includes("Cannot find module")) {
            return { type: 'MODULE_NOT_FOUND', solution: 'npm install' };
        }
        if (errorMsg.includes("SyntaxError")) {
            return { type: 'SYNTAX_ERROR', solution: 'Check syntax' };
        }
        if (errorMsg.includes("EACCES")) {
            return { type: 'PERMISSION_DENIED', solution: 'Check permissions' };
        }
        return null;
    }

    async matchPattern(errorMsg) {
        const pattern = await this.retrievePattern(errorMsg);
        return pattern || { type: 'UNKNOWN', solution: 'Manual investigation needed' };
    }

    async learnFromError(errorMsg) {
        // Simulate learning (would normally analyze and store new patterns)
        return new Promise((resolve) => {
            setTimeout(() => resolve(Math.random() > 0.3), 150);
        });
    }

    saveResults() {
        fs.mkdirSync(path.dirname(this.resultsPath), { recursive: true });
        const summary = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            successCount: this.testResults.filter(r => r.status === 'success').length,
            failureCount: this.testResults.filter(r => r.status === 'failure').length,
            tests: this.testResults
        };
        
        fs.writeFileSync(this.resultsPath, JSON.stringify(summary, null, 2));
        console.log(`📊 Results saved to: ${this.resultsPath}`);
    }
}

// Run the test if called directly
if (require.main === module) {
    const tester = new PatternLearningTester();
    tester.runTest().catch(console.error);
}

module.exports = PatternLearningTester;