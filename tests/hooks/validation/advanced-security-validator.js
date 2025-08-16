#!/usr/bin/env node

/**
 * Advanced Security Pattern Validator
 * 
 * Detects advanced security vulnerabilities and patterns:
 * - XSS prevention and input sanitization
 * - SQL injection prevention
 * - Token exposure and secret leakage
 * - Insecure authentication patterns
 * - CSRF and clickjacking protection
 * - Content Security Policy violations
 */

const fs = require('fs');
const path = require('path');

class AdvancedSecurityValidator {
    constructor() {
        this.patterns = {
            // XSS vulnerabilities
            xssVulnerabilities: [
                /innerHTML\s*=\s*(?!["']\s*["'])/g,
                /outerHTML\s*=\s*(?!["']\s*["'])/g,
                /document\.write\s*\(/g,
                /\.html\s*\(\s*[^)]*\+/g,
                /dangerouslySetInnerHTML/g,
                /v-html\s*=\s*[^"']/g // Vue.js
            ],
            
            // SQL injection patterns
            sqlInjection: [
                /SELECT\s.*\+.*WHERE/gi,
                /INSERT\s.*\+.*VALUES/gi,
                /UPDATE\s.*\+.*SET/gi,
                /DELETE\s.*\+.*WHERE/gi,
                /query\s*\(\s*["'`][^"'`]*\+/gi,
                /execute\s*\(\s*["'`][^"'`]*\+/gi
            ],
            
            // Token and secret exposure
            tokenExposure: [
                /localStorage\.setItem\s*\(\s*["'](token|jwt|auth|secret)/gi,
                /sessionStorage\.setItem\s*\(\s*["'](token|jwt|auth|secret)/gi,
                /console\.log\s*\(.*(?:token|jwt|password|secret|key)/gi,
                /(?:token|jwt|password|secret|key)\s*:\s*[^,}]+/gi,
                /Authorization.*Bearer.*\+/gi
            ],
            
            // Insecure authentication
            insecureAuth: [
                /password\s*===?\s*["'][^"']*["']/gi,
                /btoa\s*\(\s*password/gi,
                /MD5\s*\(.*password/gi,
                /SHA1\s*\(.*password/gi,
                /\.hash\s*\(\s*password\s*\)/gi,
                /auth.*bypass|bypass.*auth/gi
            ],
            
            // CSRF vulnerabilities
            csrfVulnerabilities: [
                /fetch\s*\(\s*url.*method:\s*["'](?:POST|PUT|DELETE|PATCH)["'](?![^}]*csrf)/gi,
                /axios\.(?:post|put|delete|patch)\s*\([^)]*(?![^)]*csrf)/gi,
                /\$\.(?:post|ajax)\s*\([^)]*(?![^)]*csrf)/gi,
                /<form[^>]*method\s*=\s*["'](?:post|put|delete|patch)["'][^>]*(?!.*csrf)/gi
            ],
            
            // Clickjacking protection
            clickjackingVulns: [
                /X-Frame-Options.*DENY|X-Frame-Options.*SAMEORIGIN/gi,
                /Content-Security-Policy.*frame-ancestors/gi
            ],
            
            // Input validation issues
            inputValidation: [
                /req\.body\.\w+(?!\.|\.trim\(\)|\.toLowerCase\(\)|\.sanitize)/g,
                /req\.query\.\w+(?!\.|\.trim\(\)|\.toLowerCase\(\)|\.sanitize)/g,
                /req\.params\.\w+(?!\.|\.trim\(\)|\.toLowerCase\(\)|\.sanitize)/g,
                /JSON\.parse\s*\(\s*[^)]*\)(?!\s*\.)/g,
                /eval\s*\(/g,
                /Function\s*\(/g,
                /setTimeout\s*\(\s*["'][^"']*\+/g
            ],
            
            // Insecure dependencies
            insecureDependencies: [
                /require\s*\(\s*["'][^"']*\+/g,
                /import\s*\(\s*["'][^"']*\+/g,
                /__dirname.*\+.*req\./g,
                /path\.join\s*\(\s*__dirname.*req\./g
            ],
            
            // File upload vulnerabilities
            fileUploadVulns: [
                /multer\(\)(?![^}]*fileFilter)/g,
                /\.mimetype(?![^}]*validation)/g,
                /\.originalname(?![^}]*sanitize)/g,
                /fs\.writeFile.*req\.body/g
            ],
            
            // Prototype pollution
            prototypePollution: [
                /\[.*\]\s*=\s*.*req\./g,
                /merge\s*\(\s*\{\s*\}\s*,\s*req\./g,
                /Object\.assign\s*\(\s*\{\s*\}\s*,\s*req\./g,
                /__proto__/g,
                /constructor\.prototype/g
            ]
        };
        
        this.securePatterns = {
            xssProtection: [
                /DOMPurify\.sanitize/g,
                /xss\s*\(/g,
                /escape\s*\(/g,
                /validator\.escape/g
            ],
            
            sqlProtection: [
                /prepared.*statement/gi,
                /\?\s*,\s*\[.*\]/g, // parameterized queries
                /\$\d+/g, // PostgreSQL parameters
                /sequelize/gi,
                /typeorm/gi
            ],
            
            authProtection: [
                /bcrypt/gi,
                /scrypt/gi,
                /argon2/gi,
                /passport/gi,
                /jwt\.verify/gi
            ],
            
            csrfProtection: [
                /csrf.*token/gi,
                /csurf\(/gi,
                /express-csrf/gi
            ]
        };
        
        this.violations = [];
        this.suggestions = [];
        this.securityScore = 100;
    }

    validate(filePath, content) {
        this.violations = [];
        this.suggestions = [];
        this.securityScore = 100;
        
        if (!this.isSecurityRelevantFile(filePath, content)) {
            return { valid: true, violations: [], suggestions: [] };
        }
        
        this.checkXSSVulnerabilities(content, filePath);
        this.checkSQLInjection(content, filePath);
        this.checkTokenExposure(content, filePath);
        this.checkInsecureAuth(content, filePath);
        this.checkCSRFProtection(content, filePath);
        this.checkInputValidation(content, filePath);
        this.checkFileUploadSecurity(content, filePath);
        this.checkPrototypePollution(content, filePath);
        this.checkInsecureDependencies(content, filePath);
        
        return {
            valid: this.violations.length === 0,
            violations: this.violations,
            suggestions: this.suggestions,
            securityScore: this.calculateSecurityScore()
        };
    }
    
    isSecurityRelevantFile(filePath, content) {
        const isJavaScript = /\.(js|jsx|ts|tsx)$/.test(filePath);
        const isPython = /\.py$/.test(filePath);
        const isApiRoute = filePath.includes('/api/') || filePath.includes('/routes/');
        const hasSecurityPatterns = /auth|login|api|server|backend|database|upload|form/.test(content);
        
        return (isJavaScript || isPython) && (isApiRoute || hasSecurityPatterns);
    }
    
    checkXSSVulnerabilities(content, filePath) {
        const xssVulns = [];
        
        this.patterns.xssVulnerabilities.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            xssVulns.push(...matches);
        });
        
        // Check if XSS protection is in place
        const hasXSSProtection = this.securePatterns.xssProtection.some(pattern => pattern.test(content));
        
        if (xssVulns.length > 0 && !hasXSSProtection) {
            this.violations.push({
                type: 'xss-vulnerability',
                severity: 'critical',
                message: 'Potential XSS vulnerability detected without proper sanitization',
                file: filePath,
                count: xssVulns.length,
                suggestion: 'Use DOMPurify.sanitize() or similar XSS protection for user input'
            });
        } else if (xssVulns.length > 0) {
            this.suggestions.push({
                type: 'xss-review-needed',
                severity: 'medium',
                message: 'XSS protection detected but review dangerous HTML operations',
                file: filePath,
                suggestion: 'Verify all user input is properly sanitized'
            });
        }
    }
    
    checkSQLInjection(content, filePath) {
        const sqlVulns = [];
        
        this.patterns.sqlInjection.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            sqlVulns.push(...matches);
        });
        
        const hasSQLProtection = this.securePatterns.sqlProtection.some(pattern => pattern.test(content));
        
        if (sqlVulns.length > 0 && !hasSQLProtection) {
            this.violations.push({
                type: 'sql-injection',
                severity: 'critical',
                message: 'Potential SQL injection vulnerability detected',
                file: filePath,
                count: sqlVulns.length,
                suggestion: 'Use parameterized queries or ORM with proper escaping'
            });
        }
    }
    
    checkTokenExposure(content, filePath) {
        const tokenExposures = [];
        
        this.patterns.tokenExposure.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            tokenExposures.push(...matches);
        });
        
        if (tokenExposures.length > 0) {
            // Determine severity based on exposure type
            const hasConsoleLog = tokenExposures.some(match => match[0].includes('console.log'));
            const hasLocalStorage = tokenExposures.some(match => match[0].includes('localStorage'));
            
            const severity = hasConsoleLog ? 'critical' : hasLocalStorage ? 'high' : 'medium';
            
            this.violations.push({
                type: 'token-exposure',
                severity,
                message: 'Potential token or secret exposure detected',
                file: filePath,
                count: tokenExposures.length,
                suggestion: 'Store tokens securely and avoid logging sensitive information'
            });
        }
    }
    
    checkInsecureAuth(content, filePath) {
        const authVulns = [];
        
        this.patterns.insecureAuth.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            authVulns.push(...matches);
        });
        
        const hasSecureAuth = this.securePatterns.authProtection.some(pattern => pattern.test(content));
        
        if (authVulns.length > 0) {
            this.violations.push({
                type: 'insecure-authentication',
                severity: 'critical',
                message: 'Insecure authentication pattern detected',
                file: filePath,
                count: authVulns.length,
                suggestion: 'Use bcrypt, scrypt, or argon2 for password hashing'
            });
        } else if (content.includes('password') && !hasSecureAuth) {
            this.suggestions.push({
                type: 'auth-review-needed',
                severity: 'medium',
                message: 'Password handling detected - verify secure authentication',
                file: filePath,
                suggestion: 'Ensure proper password hashing and authentication'
            });
        }
    }
    
    checkCSRFProtection(content, filePath) {
        const csrfVulns = [];
        
        this.patterns.csrfVulnerabilities.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            csrfVulns.push(...matches);
        });
        
        const hasCSRFProtection = this.securePatterns.csrfProtection.some(pattern => pattern.test(content));
        
        if (csrfVulns.length > 0 && !hasCSRFProtection) {
            this.violations.push({
                type: 'csrf-vulnerability',
                severity: 'high',
                message: 'State-changing requests without CSRF protection',
                file: filePath,
                count: csrfVulns.length,
                suggestion: 'Implement CSRF tokens for state-changing operations'
            });
        }
    }
    
    checkInputValidation(content, filePath) {
        const inputVulns = [];
        
        this.patterns.inputValidation.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            inputVulns.push(...matches);
        });
        
        if (inputVulns.length > 0) {
            const hasEval = inputVulns.some(match => match[0].includes('eval'));
            const severity = hasEval ? 'critical' : 'high';
            
            this.violations.push({
                type: 'input-validation',
                severity,
                message: 'Unsafe input handling detected',
                file: filePath,
                count: inputVulns.length,
                suggestion: 'Validate and sanitize all user input before processing'
            });
        }
    }
    
    checkFileUploadSecurity(content, filePath) {
        const uploadVulns = [];
        
        this.patterns.fileUploadVulns.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            uploadVulns.push(...matches);
        });
        
        if (uploadVulns.length > 0) {
            this.violations.push({
                type: 'file-upload-vulnerability',
                severity: 'high',
                message: 'Insecure file upload handling detected',
                file: filePath,
                count: uploadVulns.length,
                suggestion: 'Validate file types, sanitize filenames, and scan for malware'
            });
        }
    }
    
    checkPrototypePollution(content, filePath) {
        const pollutionVulns = [];
        
        this.patterns.prototypePollution.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            pollutionVulns.push(...matches);
        });
        
        if (pollutionVulns.length > 0) {
            this.violations.push({
                type: 'prototype-pollution',
                severity: 'high',
                message: 'Potential prototype pollution vulnerability',
                file: filePath,
                count: pollutionVulns.length,
                suggestion: 'Validate object keys and avoid unsafe object merging'
            });
        }
    }
    
    checkInsecureDependencies(content, filePath) {
        const depVulns = [];
        
        this.patterns.insecureDependencies.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            depVulns.push(...matches);
        });
        
        if (depVulns.length > 0) {
            this.violations.push({
                type: 'insecure-dependencies',
                severity: 'high',
                message: 'Dynamic dependency loading with user input',
                file: filePath,
                count: depVulns.length,
                suggestion: 'Avoid dynamic imports/requires with user-controlled input'
            });
        }
    }
    
    calculateSecurityScore() {
        let score = 100;
        
        this.violations.forEach(violation => {
            switch (violation.severity) {
                case 'critical':
                    score -= 25;
                    break;
                case 'high':
                    score -= 15;
                    break;
                case 'medium':
                    score -= 8;
                    break;
                case 'low':
                    score -= 3;
                    break;
            }
        });
        
        this.suggestions.forEach(suggestion => {
            score -= 2;
        });
        
        return Math.max(0, score);
    }
    
    generateReport() {
        const timestamp = new Date().toISOString();
        
        const criticalViolations = this.violations.filter(v => v.severity === 'critical');
        const highViolations = this.violations.filter(v => v.severity === 'high');
        
        return {
            timestamp,
            validator: 'Advanced Security Pattern Validator',
            summary: {
                totalViolations: this.violations.length,
                criticalViolations: criticalViolations.length,
                highViolations: highViolations.length,
                totalSuggestions: this.suggestions.length,
                securityScore: this.calculateSecurityScore(),
                riskLevel: this.getRiskLevel()
            },
            violations: this.violations,
            suggestions: this.suggestions,
            recommendations: this.getRecommendations()
        };
    }
    
    getRiskLevel() {
        const criticalCount = this.violations.filter(v => v.severity === 'critical').length;
        const highCount = this.violations.filter(v => v.severity === 'high').length;
        
        if (criticalCount > 0) return 'CRITICAL';
        if (highCount > 2) return 'HIGH';
        if (highCount > 0) return 'MEDIUM';
        return 'LOW';
    }
    
    getRecommendations() {
        const recommendations = [];
        
        if (this.violations.some(v => v.type === 'xss-vulnerability')) {
            recommendations.push('CRITICAL: Implement XSS protection with input sanitization');
        }
        
        if (this.violations.some(v => v.type === 'sql-injection')) {
            recommendations.push('CRITICAL: Use parameterized queries to prevent SQL injection');
        }
        
        if (this.violations.some(v => v.type === 'token-exposure')) {
            recommendations.push('HIGH: Secure token storage and eliminate secret logging');
        }
        
        if (this.violations.some(v => v.type === 'insecure-authentication')) {
            recommendations.push('CRITICAL: Implement secure password hashing');
        }
        
        if (this.violations.some(v => v.type === 'csrf-vulnerability')) {
            recommendations.push('HIGH: Add CSRF protection for state-changing operations');
        }
        
        if (this.violations.some(v => v.type === 'input-validation')) {
            recommendations.push('HIGH: Validate and sanitize all user input');
        }
        
        return recommendations;
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const filePath = args[0];
    
    if (!filePath) {
        console.error('Usage: node advanced-security-validator.js <file-path>');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const validator = new AdvancedSecurityValidator();
    const result = validator.validate(filePath, content);
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.valid) {
        process.exit(1);
    }
}

module.exports = AdvancedSecurityValidator;