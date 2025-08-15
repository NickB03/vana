#!/usr/bin/env node

/**
 * Production Configuration Validator
 * 
 * Validates production readiness and configuration:
 * - Environment variable usage
 * - Security configuration
 * - Performance settings
 * - Deployment readiness
 */

const fs = require('fs');
const path = require('path');

class ProductionConfigValidator {
    constructor() {
        this.patterns = {
            // Environment patterns
            envUsage: [
                /process\.env\.\w+/g,
                /os\.environ\.\w+/g,
                /Environment\.\w+/g,
                /env\.\w+/g
            ],
            
            // Security patterns
            securityConfig: [
                /cors/gi,
                /helmet/gi,
                /csrf/gi,
                /rate.*limit/gi,
                /auth/gi,
                /jwt/gi,
                /oauth/gi
            ],
            
            // Hardcoded values that should be configurable
            hardcodedValues: [
                /localhost|127\.0\.0\.1/g,
                /http:\/\/(?!localhost)/g,
                /:3000|:8000|:5000/g,
                /password.*=.*["']\w+["']/gi,
                /secret.*=.*["']\w+["']/gi,
                /api.*key.*=.*["']\w+["']/gi
            ],
            
            // Performance patterns
            performanceConfig: [
                /cache/gi,
                /compress/gi,
                /gzip/gi,
                /minify/gi,
                /optimize/gi
            ],
            
            // Logging patterns
            loggingConfig: [
                /console\.log|console\.error/g,
                /logger\./gi,
                /log.*level/gi,
                /debug/gi
            ],
            
            // Database patterns
            databaseConfig: [
                /connection.*string/gi,
                /database.*url/gi,
                /pool.*size/gi,
                /timeout/gi
            ]
        };
        
        this.configFiles = [
            '.env',
            '.env.local',
            '.env.production',
            'config.json',
            'package.json',
            'docker-compose.yml',
            'Dockerfile',
            'next.config.js',
            'vite.config.js',
            'webpack.config.js'
        ];
        
        this.violations = [];
        this.suggestions = [];
        this.projectRoot = process.cwd();
    }

    validate(filePath, content) {
        this.violations = [];
        this.suggestions = [];
        
        const isConfigFile = this.isConfigFile(filePath);
        const isApplicationFile = this.isApplicationFile(filePath, content);
        
        if (isConfigFile) {
            return this.validateConfigFile(filePath, content);
        } else if (isApplicationFile) {
            return this.validateApplicationCode(filePath, content);
        }
        
        return { valid: true, violations: [], suggestions: [] };
    }
    
    isConfigFile(filePath) {
        const filename = path.basename(filePath);
        return this.configFiles.some(configFile => 
            filename === configFile || filename.includes(configFile)
        );
    }
    
    isApplicationFile(filePath, content) {
        return (filePath.endsWith('.js') || filePath.endsWith('.ts') || 
                filePath.endsWith('.jsx') || filePath.endsWith('.tsx') ||
                filePath.endsWith('.py')) &&
               (content.includes('app') || content.includes('server') || 
                content.includes('config') || content.includes('main'));
    }
    
    validateConfigFile(filePath, content) {
        const filename = path.basename(filePath);
        
        if (filename.includes('.env')) {
            this.validateEnvFile(filePath, content);
        } else if (filename === 'package.json') {
            this.validatePackageJson(filePath, content);
        } else if (filename.includes('config')) {
            this.validateGeneralConfig(filePath, content);
        }
        
        return {
            valid: this.violations.length === 0,
            violations: this.violations,
            suggestions: this.suggestions,
            configType: this.getConfigType(filename)
        };
    }
    
    validateEnvFile(filePath, content) {
        // Check for required production environment variables
        const requiredVars = [
            'NODE_ENV',
            'PORT',
            'DATABASE_URL',
            'JWT_SECRET',
            'API_KEY'
        ];
        
        const hasProduction = content.includes('NODE_ENV=production');
        if (!hasProduction && filePath.includes('production')) {
            this.violations.push({
                type: 'missing-production-env',
                severity: 'high',
                message: 'Production environment file missing NODE_ENV=production',
                file: filePath,
                suggestion: 'Add NODE_ENV=production to production environment file'
            });
        }
        
        // Check for exposed secrets
        const secretPatterns = [
            /password.*=.*["'][\w\-@#$%^&*()]+["']/gi,
            /secret.*=.*["'][\w\-@#$%^&*()]+["']/gi,
            /key.*=.*["'][\w\-@#$%^&*()]+["']/gi
        ];
        
        secretPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                this.violations.push({
                    type: 'exposed-secret',
                    severity: 'critical',
                    message: 'Potential secret exposed in environment file',
                    file: filePath,
                    suggestion: 'Use secure secret management instead of plain text'
                });
            }
        });
        
        // Check for localhost URLs in production config
        if (filePath.includes('production') && /localhost|127\.0\.0\.1/.test(content)) {
            this.violations.push({
                type: 'localhost-in-production',
                severity: 'high',
                message: 'Localhost URLs found in production configuration',
                file: filePath,
                suggestion: 'Use production URLs instead of localhost'
            });
        }
    }
    
    validatePackageJson(filePath, content) {
        try {
            const packageJson = JSON.parse(content);
            
            // Check for production build script
            if (!packageJson.scripts || !packageJson.scripts.build) {
                this.suggestions.push({
                    type: 'missing-build-script',
                    severity: 'medium',
                    message: 'Missing build script for production deployment',
                    file: filePath,
                    suggestion: 'Add build script: "build": "next build" or similar'
                });
            }
            
            // Check for start script
            if (!packageJson.scripts || !packageJson.scripts.start) {
                this.suggestions.push({
                    type: 'missing-start-script',
                    severity: 'medium',
                    message: 'Missing start script for production',
                    file: filePath,
                    suggestion: 'Add start script: "start": "next start" or similar'
                });
            }
            
            // Check for security-related dependencies
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            const securityPackages = ['helmet', 'cors', 'express-rate-limit', 'bcrypt'];
            const hasSecurityPackages = securityPackages.some(pkg => deps[pkg]);
            
            if (!hasSecurityPackages) {
                this.suggestions.push({
                    type: 'missing-security-packages',
                    severity: 'low',
                    message: 'Consider adding security-related packages',
                    file: filePath,
                    suggestion: 'Add packages like helmet, cors, or express-rate-limit for security'
                });
            }
            
        } catch (error) {
            this.violations.push({
                type: 'invalid-package-json',
                severity: 'high',
                message: 'Invalid JSON in package.json',
                file: filePath,
                suggestion: 'Fix JSON syntax errors'
            });
        }
    }
    
    validateGeneralConfig(filePath, content) {
        // Check for hardcoded values
        this.patterns.hardcodedValues.forEach(pattern => {
            if (pattern.test(content)) {
                this.violations.push({
                    type: 'hardcoded-values',
                    severity: 'medium',
                    message: 'Hardcoded values found that should be configurable',
                    file: filePath,
                    suggestion: 'Move hardcoded values to environment variables'
                });
            }
        });
        
        // Check for development-only settings
        if (content.includes('development') && !content.includes('production')) {
            this.suggestions.push({
                type: 'development-only-config',
                severity: 'low',
                message: 'Configuration appears to be development-only',
                file: filePath,
                suggestion: 'Ensure production configuration is available'
            });
        }
    }
    
    validateApplicationCode(filePath, content) {
        // Check for console.log in production code
        const consoleLogs = [...content.matchAll(/console\.log\(/g)];
        if (consoleLogs.length > 0) {
            this.suggestions.push({
                type: 'console-logs-in-production',
                severity: 'low',
                message: 'Console.log statements found - consider using proper logging',
                file: filePath,
                suggestion: 'Replace console.log with proper logging framework'
            });
        }
        
        // Check for environment variable usage
        const envUsage = this.patterns.envUsage.some(pattern => pattern.test(content));
        const hasHardcodedValues = this.patterns.hardcodedValues.some(pattern => pattern.test(content));
        
        if (hasHardcodedValues && !envUsage) {
            this.violations.push({
                type: 'missing-env-config',
                severity: 'medium',
                message: 'Hardcoded values found without environment variable usage',
                file: filePath,
                suggestion: 'Use environment variables for configuration values'
            });
        }
        
        // Check for error handling
        const hasErrorHandling = /try\s*\{[\s\S]*?\}\s*catch|except\s+\w+/.test(content);
        const hasCriticalOperations = /database|network|api|fetch|axios/.test(content);
        
        if (hasCriticalOperations && !hasErrorHandling) {
            this.violations.push({
                type: 'missing-error-handling',
                severity: 'high',
                message: 'Critical operations without proper error handling',
                file: filePath,
                suggestion: 'Add try-catch blocks for error handling'
            });
        }
        
        return {
            valid: this.violations.length === 0,
            violations: this.violations,
            suggestions: this.suggestions,
            hasErrorHandling,
            usesEnvironmentVars: envUsage
        };
    }
    
    getConfigType(filename) {
        if (filename.includes('.env')) return 'environment';
        if (filename === 'package.json') return 'package';
        if (filename.includes('docker')) return 'docker';
        if (filename.includes('config')) return 'application';
        return 'unknown';
    }
    
    calculateReadinessScore() {
        const criticalViolations = this.violations.filter(v => v.severity === 'critical').length;
        const highViolations = this.violations.filter(v => v.severity === 'high').length;
        const mediumViolations = this.violations.filter(v => v.severity === 'medium').length;
        const suggestions = this.suggestions.length;
        
        const penalty = (criticalViolations * 30) + (highViolations * 20) + (mediumViolations * 10) + (suggestions * 2);
        return Math.max(0, 100 - penalty);
    }
    
    generateReport() {
        const timestamp = new Date().toISOString();
        
        return {
            timestamp,
            validator: 'Production Configuration Validator',
            summary: {
                totalViolations: this.violations.length,
                totalSuggestions: this.suggestions.length,
                readinessScore: this.calculateReadinessScore(),
                criticalIssues: this.violations.filter(v => v.severity === 'critical').length
            },
            violations: this.violations,
            suggestions: this.suggestions,
            recommendations: this.getRecommendations()
        };
    }
    
    getRecommendations() {
        const recommendations = [];
        
        if (this.violations.some(v => v.type === 'exposed-secret')) {
            recommendations.push('CRITICAL: Implement secure secret management');
        }
        
        if (this.violations.some(v => v.type === 'missing-error-handling')) {
            recommendations.push('Add comprehensive error handling for production stability');
        }
        
        if (this.violations.some(v => v.type === 'hardcoded-values')) {
            recommendations.push('Move all configuration to environment variables');
        }
        
        if (this.suggestions.some(s => s.type === 'missing-security-packages')) {
            recommendations.push('Consider adding security middleware and packages');
        }
        
        return recommendations;
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const filePath = args[0];
    
    if (!filePath) {
        console.error('Usage: node production-config-validator.js <file-path>');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const validator = new ProductionConfigValidator();
    const result = validator.validate(filePath, content);
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.valid) {
        process.exit(1);
    }
}

module.exports = ProductionConfigValidator;