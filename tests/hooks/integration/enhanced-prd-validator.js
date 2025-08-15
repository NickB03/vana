#!/usr/bin/env node

/**
 * Enhanced PRD Validator - Master Coordinator
 * 
 * Integrates all 5 enhanced validation patterns into the existing hook system:
 * - React optimization validation
 * - HTTP status code validation  
 * - Test coverage requirements
 * - Production configuration validation
 * - Advanced security patterns
 * 
 * Provides unified validation with intelligent scoring and recommendations.
 */

const ReactOptimizationValidator = require('../validation/react-optimization-validator');
const HttpStatusValidator = require('../validation/http-status-validator');
const TestCoverageValidator = require('../validation/test-coverage-validator');
const ProductionConfigValidator = require('../validation/production-config-validator');
const AdvancedSecurityValidator = require('../validation/advanced-security-validator');

class EnhancedPRDValidator {
    constructor() {
        this.validators = {
            reactOptimization: new ReactOptimizationValidator(),
            httpStatus: new HttpStatusValidator(),
            testCoverage: new TestCoverageValidator(),
            productionConfig: new ProductionConfigValidator(),
            advancedSecurity: new AdvancedSecurityValidator()
        };
        
        this.weights = {
            reactOptimization: 0.15,
            httpStatus: 0.15,
            testCoverage: 0.25,
            productionConfig: 0.20,
            advancedSecurity: 0.25
        };
        
        this.results = {};
        this.overallScore = 0;
        this.violations = [];
        this.suggestions = [];
    }

    async validateFile(filePath, content) {
        this.results = {};
        this.violations = [];
        this.suggestions = [];
        
        // Run all validators
        for (const [name, validator] of Object.entries(this.validators)) {
            try {
                const result = validator.validate(filePath, content);
                this.results[name] = result;
                
                // Collect violations and suggestions
                if (result.violations) {
                    this.violations.push(...result.violations.map(v => ({
                        ...v,
                        validator: name
                    })));
                }
                
                if (result.suggestions) {
                    this.suggestions.push(...result.suggestions.map(s => ({
                        ...s,
                        validator: name
                    })));
                }
            } catch (error) {
                console.error(`Error in ${name} validator:`, error);
                this.results[name] = {
                    valid: false,
                    error: error.message,
                    score: 0
                };
            }
        }
        
        // Calculate overall score
        this.overallScore = this.calculateOverallScore();
        
        return {
            valid: this.isOverallValid(),
            overallScore: this.overallScore,
            results: this.results,
            violations: this.violations,
            suggestions: this.suggestions,
            summary: this.generateSummary(),
            recommendations: this.generateRecommendations()
        };
    }
    
    calculateOverallScore() {
        let weightedScore = 0;
        let totalWeight = 0;
        
        for (const [name, result] of Object.entries(this.results)) {
            if (result.score !== undefined || result.optimizationScore !== undefined || 
                result.complianceScore !== undefined || result.securityScore !== undefined ||
                result.readinessScore !== undefined) {
                
                const score = result.score || result.optimizationScore || 
                             result.complianceScore || result.securityScore ||
                             result.readinessScore || 0;
                             
                weightedScore += score * this.weights[name];
                totalWeight += this.weights[name];
            }
        }
        
        return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    }
    
    isOverallValid() {
        // Check for critical violations
        const criticalViolations = this.violations.filter(v => v.severity === 'critical');
        if (criticalViolations.length > 0) {
            return false;
        }
        
        // Check minimum score threshold
        if (this.overallScore < 75) {
            return false;
        }
        
        // Check individual validator requirements
        const securityResult = this.results.advancedSecurity;
        if (securityResult && securityResult.securityScore < 80) {
            return false;
        }
        
        return true;
    }
    
    generateSummary() {
        const violationsBySeverity = {
            critical: this.violations.filter(v => v.severity === 'critical').length,
            high: this.violations.filter(v => v.severity === 'high').length,
            medium: this.violations.filter(v => v.severity === 'medium').length,
            low: this.violations.filter(v => v.severity === 'low').length
        };
        
        const validatorScores = {};
        for (const [name, result] of Object.entries(this.results)) {
            validatorScores[name] = {
                score: result.score || result.optimizationScore || 
                       result.complianceScore || result.securityScore ||
                       result.readinessScore || 0,
                valid: result.valid,
                violationCount: result.violations ? result.violations.length : 0
            };
        }
        
        return {
            overallScore: this.overallScore,
            isValid: this.isOverallValid(),
            violationsBySeverity,
            validatorScores,
            totalViolations: this.violations.length,
            totalSuggestions: this.suggestions.length,
            riskLevel: this.getRiskLevel()
        };
    }
    
    getRiskLevel() {
        const critical = this.violations.filter(v => v.severity === 'critical').length;
        const high = this.violations.filter(v => v.severity === 'high').length;
        
        if (critical > 0) return 'CRITICAL';
        if (high > 3) return 'HIGH';
        if (high > 0 || this.overallScore < 60) return 'MEDIUM';
        return 'LOW';
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        // Critical security issues first
        const securityViolations = this.violations.filter(v => 
            v.validator === 'advancedSecurity' && v.severity === 'critical'
        );
        
        if (securityViolations.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'Security',
                message: 'Address critical security vulnerabilities immediately',
                count: securityViolations.length,
                action: 'Review and fix all XSS, SQL injection, and authentication issues'
            });
        }
        
        // Test coverage issues
        const testingViolations = this.violations.filter(v => 
            v.validator === 'testCoverage' && v.type === 'missing-test-file'
        );
        
        if (testingViolations.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Testing',
                message: 'Add missing test files for components with critical logic',
                count: testingViolations.length,
                action: 'Create test files for all components with useState, useEffect, or async operations'
            });
        }
        
        // Production readiness
        const prodViolations = this.violations.filter(v => 
            v.validator === 'productionConfig'
        );
        
        if (prodViolations.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Production',
                message: 'Fix production configuration issues',
                count: prodViolations.length,
                action: 'Address environment variables, error handling, and deployment settings'
            });
        }
        
        // React optimization suggestions
        const reactSuggestions = this.suggestions.filter(s => 
            s.validator === 'reactOptimization'
        );
        
        if (reactSuggestions.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Performance',
                message: 'Optimize React components for better performance',
                count: reactSuggestions.length,
                action: 'Add React.memo, useCallback, and useMemo where appropriate'
            });
        }
        
        // HTTP API improvements
        const apiViolations = this.violations.filter(v => 
            v.validator === 'httpStatus'
        );
        
        if (apiViolations.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'API Design',
                message: 'Improve API response patterns and status codes',
                count: apiViolations.length,
                action: 'Use appropriate HTTP status codes and consistent error responses'
            });
        }
        
        return recommendations;
    }
    
    generateDetailedReport(filePath) {
        const timestamp = new Date().toISOString();
        
        return {
            timestamp,
            filePath,
            validator: 'Enhanced PRD Validator v2.0',
            summary: this.generateSummary(),
            validatorResults: this.results,
            violations: this.violations,
            suggestions: this.suggestions,
            recommendations: this.generateRecommendations(),
            scoreBreakdown: this.getScoreBreakdown(),
            nextSteps: this.getNextSteps()
        };
    }
    
    getScoreBreakdown() {
        const breakdown = {};
        
        for (const [name, result] of Object.entries(this.results)) {
            const score = result.score || result.optimizationScore || 
                         result.complianceScore || result.securityScore ||
                         result.readinessScore || 0;
                         
            breakdown[name] = {
                score,
                weight: this.weights[name],
                contribution: Math.round(score * this.weights[name])
            };
        }
        
        return breakdown;
    }
    
    getNextSteps() {
        const steps = [];
        
        if (this.violations.filter(v => v.severity === 'critical').length > 0) {
            steps.push('1. IMMEDIATE: Fix all critical security vulnerabilities');
        }
        
        if (this.overallScore < 80) {
            steps.push('2. Address high-priority violations to improve overall score');
        }
        
        if (this.violations.filter(v => v.validator === 'testCoverage').length > 0) {
            steps.push('3. Add missing test coverage for components with critical logic');
        }
        
        if (this.suggestions.length > 5) {
            steps.push('4. Review and implement performance and quality suggestions');
        }
        
        steps.push('5. Re-run validation to verify improvements');
        
        return steps;
    }
}

// CLI Usage
if (require.main === module) {
    const fs = require('fs');
    const args = process.argv.slice(2);
    const filePath = args[0];
    
    if (!filePath) {
        console.error('Usage: node enhanced-prd-validator.js <file-path>');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const validator = new EnhancedPRDValidator();
    
    validator.validateFile(filePath, content).then(result => {
        console.log(JSON.stringify(result, null, 2));
        
        if (!result.valid) {
            process.exit(1);
        }
    }).catch(error => {
        console.error('Validation error:', error);
        process.exit(1);
    });
}

module.exports = EnhancedPRDValidator;