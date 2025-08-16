#!/usr/bin/env node

/**
 * Test Coverage Validator
 * 
 * Validates test coverage requirements and testing best practices:
 * - Minimum test coverage thresholds
 * - Missing test files for new components
 * - Test quality and completeness
 * - Testing framework compliance
 */

const fs = require('fs');
const path = require('path');

class TestCoverageValidator {
    constructor() {
        this.coverageThresholds = {
            statements: 80,
            branches: 70,
            functions: 80,
            lines: 80
        };
        
        this.patterns = {
            // Component/module patterns
            componentFiles: /\.(tsx?|jsx?)$/,
            testFiles: /\.(test|spec)\.(tsx?|jsx?|js)$/,
            
            // Test framework patterns
            testFrameworks: [
                /describe\s*\(/g,
                /test\s*\(/g,
                /it\s*\(/g,
                /@Test/g,
                /def\s+test_/g // Python pytest
            ],
            
            // Component patterns that need testing
            componentExports: [
                /export\s+(default\s+)?(?:function|const|class)\s+(\w+)/g,
                /export\s*\{\s*(\w+)(?:\s+as\s+default)?\s*\}/g
            ],
            
            // Critical patterns that require tests
            criticalPatterns: [
                /useState\s*\(/g,
                /useEffect\s*\(/g,
                /async\s+function|async\s+\w+\s*=>/g,
                /try\s*\{[\s\S]*?\}\s*catch/g,
                /\.map\s*\(|\.filter\s*\(|\.reduce\s*\(/g
            ],
            
            // Test quality indicators
            testQualityPatterns: [
                /expect\s*\(/g,
                /assert\s*\(/g,
                /toHaveBeenCalled|toHaveBeenCalledWith/g,
                /render\s*\(/g,
                /fireEvent\./g,
                /screen\./g
            ]
        };
        
        this.violations = [];
        this.suggestions = [];
        this.projectRoot = process.cwd();
    }

    validate(filePath, content) {
        this.violations = [];
        this.suggestions = [];
        
        const isComponentFile = this.isComponentFile(filePath, content);
        const isTestFile = this.isTestFile(filePath);
        
        if (isTestFile) {
            return this.validateTestFile(filePath, content);
        } else if (isComponentFile) {
            return this.validateComponentCoverage(filePath, content);
        }
        
        return { valid: true, violations: [], suggestions: [] };
    }
    
    isComponentFile(filePath, content) {
        return this.patterns.componentFiles.test(filePath) && 
               !this.patterns.testFiles.test(filePath) &&
               this.hasExportedComponents(content);
    }
    
    isTestFile(filePath) {
        return this.patterns.testFiles.test(filePath);
    }
    
    hasExportedComponents(content) {
        return this.patterns.componentExports.some(pattern => pattern.test(content));
    }
    
    validateComponentCoverage(filePath, content) {
        const testFile = this.findCorrespondingTestFile(filePath);
        const hasCriticalLogic = this.hasCriticalLogic(content);
        
        if (!testFile && hasCriticalLogic) {
            this.violations.push({
                type: 'missing-test-file',
                severity: 'high',
                message: 'Component with critical logic missing corresponding test file',
                file: filePath,
                suggestion: `Create test file: ${this.getExpectedTestPath(filePath)}`
            });
        } else if (!testFile) {
            this.suggestions.push({
                type: 'test-file-recommended',
                severity: 'low',
                message: 'Consider adding tests for new component',
                file: filePath,
                suggestion: `Create test file: ${this.getExpectedTestPath(filePath)}`
            });
        }
        
        if (testFile) {
            const testContent = this.readTestFile(testFile);
            if (testContent) {
                this.validateTestQuality(testFile, testContent, content);
            }
        }
        
        return {
            valid: this.violations.length === 0,
            violations: this.violations,
            suggestions: this.suggestions,
            coverage: this.estimateCoverage(filePath, content)
        };
    }
    
    validateTestFile(filePath, content) {
        const hasTestFramework = this.hasTestFramework(content);
        const hasAssertions = this.hasAssertions(content);
        const testCount = this.countTests(content);
        
        if (!hasTestFramework) {
            this.violations.push({
                type: 'invalid-test-file',
                severity: 'high',
                message: 'Test file does not use recognized testing framework',
                file: filePath,
                suggestion: 'Use Jest, Vitest, or another supported testing framework'
            });
        }
        
        if (hasTestFramework && !hasAssertions) {
            this.violations.push({
                type: 'no-assertions',
                severity: 'high',
                message: 'Test file contains tests but no assertions',
                file: filePath,
                suggestion: 'Add expect() or assert() statements to validate behavior'
            });
        }
        
        if (testCount === 0 && hasTestFramework) {
            this.violations.push({
                type: 'empty-test-suite',
                severity: 'medium',
                message: 'Test file has testing framework setup but no actual tests',
                file: filePath,
                suggestion: 'Add test cases using describe() and test() or it() blocks'
            });
        }
        
        return {
            valid: this.violations.length === 0,
            violations: this.violations,
            suggestions: this.suggestions,
            testCount,
            hasAssertions
        };
    }
    
    hasCriticalLogic(content) {
        return this.patterns.criticalPatterns.some(pattern => pattern.test(content));
    }
    
    hasTestFramework(content) {
        return this.patterns.testFrameworks.some(pattern => pattern.test(content));
    }
    
    hasAssertions(content) {
        return this.patterns.testQualityPatterns.some(pattern => pattern.test(content));
    }
    
    countTests(content) {
        let count = 0;
        this.patterns.testFrameworks.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                count += matches.length;
            }
        });
        return count;
    }
    
    findCorrespondingTestFile(componentPath) {
        const possibleTestPaths = this.getTestFilePaths(componentPath);
        
        for (const testPath of possibleTestPaths) {
            if (fs.existsSync(testPath)) {
                return testPath;
            }
        }
        
        return null;
    }
    
    getTestFilePaths(componentPath) {
        const dir = path.dirname(componentPath);
        const basename = path.basename(componentPath, path.extname(componentPath));
        const ext = path.extname(componentPath);
        
        return [
            path.join(dir, `${basename}.test${ext}`),
            path.join(dir, `${basename}.spec${ext}`),
            path.join(dir, '__tests__', `${basename}.test${ext}`),
            path.join(dir, '__tests__', `${basename}.spec${ext}`),
            path.join(this.projectRoot, 'tests', 'unit', `${basename}.test${ext}`),
            path.join(this.projectRoot, 'tests', `${basename}.test${ext}`)
        ];
    }
    
    getExpectedTestPath(componentPath) {
        const dir = path.dirname(componentPath);
        const basename = path.basename(componentPath, path.extname(componentPath));
        const ext = path.extname(componentPath);
        
        return path.join(dir, `${basename}.test${ext}`);
    }
    
    readTestFile(testPath) {
        try {
            return fs.readFileSync(testPath, 'utf8');
        } catch (error) {
            return null;
        }
    }
    
    validateTestQuality(testPath, testContent, componentContent) {
        const testCount = this.countTests(testContent);
        const assertionCount = this.countAssertions(testContent);
        const criticalLogicCount = this.countCriticalLogic(componentContent);
        
        // Check if test coverage seems adequate
        if (criticalLogicCount > testCount * 2) {
            this.suggestions.push({
                type: 'insufficient-test-coverage',
                severity: 'medium',
                message: 'Component has significant logic but relatively few tests',
                file: testPath,
                suggestion: 'Consider adding more test cases to cover all logic branches'
            });
        }
        
        // Check assertion quality
        if (testCount > 0 && assertionCount < testCount) {
            this.violations.push({
                type: 'weak-assertions',
                severity: 'medium',
                message: 'Some tests may be missing assertions',
                file: testPath,
                suggestion: 'Ensure each test has appropriate expect() statements'
            });
        }
    }
    
    countAssertions(content) {
        let count = 0;
        this.patterns.testQualityPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                count += matches.length;
            }
        });
        return count;
    }
    
    countCriticalLogic(content) {
        let count = 0;
        this.patterns.criticalPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                count += matches.length;
            }
        });
        return count;
    }
    
    estimateCoverage(filePath, content) {
        const testFile = this.findCorrespondingTestFile(filePath);
        
        if (!testFile) {
            return {
                estimated: 0,
                hasTests: false,
                recommendation: 'Add test file for coverage'
            };
        }
        
        const testContent = this.readTestFile(testFile);
        if (!testContent) {
            return {
                estimated: 0,
                hasTests: false,
                recommendation: 'Test file unreadable'
            };
        }
        
        const testCount = this.countTests(testContent);
        const criticalLogicCount = this.countCriticalLogic(content);
        const assertionCount = this.countAssertions(testContent);
        
        // Simple heuristic for coverage estimation
        const logicCoverage = criticalLogicCount > 0 ? Math.min(100, (testCount / criticalLogicCount) * 60) : 100;
        const assertionQuality = testCount > 0 ? Math.min(100, (assertionCount / testCount) * 100) : 0;
        
        const estimated = Math.round((logicCoverage + assertionQuality) / 2);
        
        return {
            estimated,
            hasTests: true,
            testCount,
            criticalLogicCount,
            assertionCount,
            recommendation: estimated < 80 ? 'Increase test coverage' : 'Good coverage'
        };
    }
    
    calculateComplianceScore() {
        const violationPenalty = this.violations.length * 15;
        const suggestionPenalty = this.suggestions.length * 5;
        return Math.max(0, 100 - violationPenalty - suggestionPenalty);
    }
    
    generateReport() {
        const timestamp = new Date().toISOString();
        
        return {
            timestamp,
            validator: 'Test Coverage Validator',
            summary: {
                totalViolations: this.violations.length,
                totalSuggestions: this.suggestions.length,
                complianceScore: this.calculateComplianceScore()
            },
            violations: this.violations,
            suggestions: this.suggestions,
            recommendations: this.getRecommendations()
        };
    }
    
    getRecommendations() {
        const recommendations = [];
        
        if (this.violations.some(v => v.type === 'missing-test-file')) {
            recommendations.push('Create test files for components with critical logic');
        }
        
        if (this.violations.some(v => v.type === 'no-assertions')) {
            recommendations.push('Add proper assertions to all test cases');
        }
        
        if (this.suggestions.some(s => s.type === 'insufficient-test-coverage')) {
            recommendations.push('Increase test coverage for complex components');
        }
        
        return recommendations;
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const filePath = args[0];
    
    if (!filePath) {
        console.error('Usage: node test-coverage-validator.js <file-path>');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const validator = new TestCoverageValidator();
    const result = validator.validate(filePath, content);
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.valid) {
        process.exit(1);
    }
}

module.exports = TestCoverageValidator;