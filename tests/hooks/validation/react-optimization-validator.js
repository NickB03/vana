#!/usr/bin/env node

/**
 * React Optimization Validator
 * 
 * Detects common React performance issues and missing optimizations:
 * - Missing React.memo() for pure components
 * - Missing useCallback/useMemo for expensive operations
 * - Error boundary requirements for complex components
 * - Hook dependency array issues
 */

const fs = require('fs');
const path = require('path');

class ReactOptimizationValidator {
    constructor() {
        this.patterns = {
            // Components that should be memoized
            pureFunctionalComponent: /^const\s+(\w+)\s*=\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{/gm,
            memoUsage: /React\.memo\(|memo\(/g,
            
            // Expensive operations that need optimization
            expensiveOperations: [
                /\.filter\(/g,
                /\.map\(/g,
                /\.reduce\(/g,
                /\.sort\(/g,
                /JSON\.parse\(/g,
                /JSON\.stringify\(/g
            ],
            
            // Hook optimization patterns
            useCallbackUsage: /useCallback\(/g,
            useMemoUsage: /useMemo\(/g,
            
            // Error boundary patterns
            complexComponent: /useState.*useState|useEffect.*useEffect/g,
            errorBoundary: /componentDidCatch|ErrorBoundary|error.*boundary/gi,
            
            // Dependency array issues
            missingDependencies: /useEffect\s*\(\s*[^,]+,\s*\[\s*\]\s*\)/g,
            exhaustiveDeps: /eslint-disable.*exhaustive-deps/g
        };
        
        this.violations = [];
        this.suggestions = [];
    }

    validate(filePath, content) {
        this.violations = [];
        this.suggestions = [];
        
        if (!this.isReactFile(filePath, content)) {
            return { valid: true, violations: [], suggestions: [] };
        }
        
        this.checkMemoization(content, filePath);
        this.checkExpensiveOperations(content, filePath);
        this.checkErrorBoundaries(content, filePath);
        this.checkHookDependencies(content, filePath);
        
        return {
            valid: this.violations.length === 0,
            violations: this.violations,
            suggestions: this.suggestions,
            score: this.calculateOptimizationScore()
        };
    }
    
    isReactFile(filePath, content) {
        return (
            (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) &&
            (content.includes('import React') || content.includes('from \'react\'') || content.includes('from "react"'))
        );
    }
    
    checkMemoization(content, filePath) {
        const components = [...content.matchAll(this.patterns.pureFunctionalComponent)];
        const memoUsages = [...content.matchAll(this.patterns.memoUsage)];
        
        if (components.length > 0 && memoUsages.length === 0) {
            // Check if component receives props and renders consistently
            const hasProps = content.includes('props') || /\(\s*\{[^}]+\}\s*\)/.test(content);
            const isSimple = content.split('\n').length < 20;
            
            if (hasProps && !isSimple) {
                this.violations.push({
                    type: 'missing-memoization',
                    severity: 'medium',
                    message: 'Consider wrapping functional component in React.memo() for better performance',
                    file: filePath,
                    line: this.getLineNumber(content, components[0].index),
                    suggestion: 'export default React.memo(YourComponent);'
                });
            }
        }
    }
    
    checkExpensiveOperations(content, filePath) {
        const expensiveOps = [];
        
        this.patterns.expensiveOperations.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            expensiveOps.push(...matches);
        });
        
        if (expensiveOps.length > 2) {
            const usesMemo = this.patterns.useMemoUsage.test(content);
            const usesCallback = this.patterns.useCallbackUsage.test(content);
            
            if (!usesMemo || !usesCallback) {
                this.violations.push({
                    type: 'missing-optimization',
                    severity: 'medium',
                    message: 'Multiple expensive operations detected without optimization hooks',
                    file: filePath,
                    suggestion: 'Consider using useMemo() for expensive calculations and useCallback() for event handlers'
                });
            }
        }
    }
    
    checkErrorBoundaries(content, filePath) {
        const isComplexComponent = this.patterns.complexComponent.test(content);
        const hasErrorBoundary = this.patterns.errorBoundary.test(content);
        
        if (isComplexComponent && !hasErrorBoundary) {
            // Check if it's a page-level component or has multiple hooks
            const hookCount = (content.match(/use\w+\(/g) || []).length;
            const isPageComponent = /Page|Screen|Layout/.test(content);
            
            if (hookCount > 3 || isPageComponent) {
                this.suggestions.push({
                    type: 'error-boundary-recommended',
                    severity: 'low',
                    message: 'Complex component should be wrapped in an Error Boundary',
                    file: filePath,
                    suggestion: 'Wrap component with <ErrorBoundary> or implement error handling'
                });
            }
        }
    }
    
    checkHookDependencies(content, filePath) {
        const emptyDeps = [...content.matchAll(this.patterns.missingDependencies)];
        const disabledLinting = this.patterns.exhaustiveDeps.test(content);
        
        if (emptyDeps.length > 0 && !disabledLinting) {
            emptyDeps.forEach(match => {
                this.violations.push({
                    type: 'suspicious-dependencies',
                    severity: 'medium',
                    message: 'useEffect with empty dependencies may be missing dependencies',
                    file: filePath,
                    line: this.getLineNumber(content, match.index),
                    suggestion: 'Review useEffect dependencies or add eslint-disable comment if intentional'
                });
            });
        }
    }
    
    calculateOptimizationScore() {
        const violationPenalty = this.violations.length * 15;
        const suggestionPenalty = this.suggestions.length * 5;
        return Math.max(0, 100 - violationPenalty - suggestionPenalty);
    }
    
    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }
    
    generateReport() {
        const timestamp = new Date().toISOString();
        
        return {
            timestamp,
            validator: 'React Optimization Validator',
            summary: {
                totalViolations: this.violations.length,
                totalSuggestions: this.suggestions.length,
                optimizationScore: this.calculateOptimizationScore()
            },
            violations: this.violations,
            suggestions: this.suggestions,
            recommendations: this.getRecommendations()
        };
    }
    
    getRecommendations() {
        const recommendations = [];
        
        if (this.violations.some(v => v.type === 'missing-memoization')) {
            recommendations.push('Consider implementing React.memo() for components that receive props');
        }
        
        if (this.violations.some(v => v.type === 'missing-optimization')) {
            recommendations.push('Use useMemo() and useCallback() to optimize expensive operations');
        }
        
        if (this.suggestions.some(s => s.type === 'error-boundary-recommended')) {
            recommendations.push('Implement Error Boundaries for better error handling');
        }
        
        return recommendations;
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const filePath = args[0];
    
    if (!filePath) {
        console.error('Usage: node react-optimization-validator.js <file-path>');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const validator = new ReactOptimizationValidator();
    const result = validator.validate(filePath, content);
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.valid) {
        process.exit(1);
    }
}

module.exports = ReactOptimizationValidator;