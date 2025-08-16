#!/usr/bin/env node

/**
 * HTTP Status Code Validator
 * 
 * Validates proper HTTP status code usage and API response patterns:
 * - Appropriate status codes for different operations
 * - Consistent error response formats
 * - Missing status code handling
 * - RESTful convention compliance
 */

const fs = require('fs');
const path = require('path');

class HttpStatusValidator {
    constructor() {
        this.statusCodes = {
            success: {
                200: 'OK - Standard success response',
                201: 'Created - Resource created successfully',
                202: 'Accepted - Request accepted for processing',
                204: 'No Content - Success with no response body'
            },
            clientError: {
                400: 'Bad Request - Invalid request syntax',
                401: 'Unauthorized - Authentication required',
                403: 'Forbidden - Access denied',
                404: 'Not Found - Resource not found',
                409: 'Conflict - Resource conflict',
                422: 'Unprocessable Entity - Validation errors'
            },
            serverError: {
                500: 'Internal Server Error - Server error',
                502: 'Bad Gateway - Invalid response from upstream',
                503: 'Service Unavailable - Service temporarily unavailable'
            }
        };
        
        this.patterns = {
            // API endpoint patterns
            routeHandlers: [
                /app\.(get|post|put|patch|delete)\s*\(/g,
                /router\.(get|post|put|patch|delete)\s*\(/g,
                /@(Get|Post|Put|Patch|Delete)\(/g,
                /async\s+def\s+\w+.*\(/g // FastAPI patterns
            ],
            
            // Status code usage
            statusCodeUsage: /\.status\s*\(\s*(\d{3})\s*\)|status_code\s*=\s*(\d{3})|HTTPStatus\.\w+|status=(\d{3})/g,
            returnStatements: /return\s+.*Response|return.*json|return.*status/g,
            
            // Error handling patterns
            errorHandling: [
                /try\s*\{[\s\S]*?\}\s*catch/g,
                /except\s+\w+/g,
                /if.*error|if.*fail/gi,
                /\.catch\(/g
            ],
            
            // Response format patterns
            jsonResponse: /\.json\s*\(|JSONResponse|jsonify/g,
            errorResponse: /error.*response|ErrorResponse|error.*format/gi
        };
        
        this.violations = [];
        this.suggestions = [];
    }

    validate(filePath, content) {
        this.violations = [];
        this.suggestions = [];
        
        if (!this.isApiFile(filePath, content)) {
            return { valid: true, violations: [], suggestions: [] };
        }
        
        this.checkRouteHandlers(content, filePath);
        this.checkStatusCodeUsage(content, filePath);
        this.checkErrorHandling(content, filePath);
        this.checkResponseFormat(content, filePath);
        
        return {
            valid: this.violations.length === 0,
            violations: this.violations,
            suggestions: this.suggestions,
            score: this.calculateComplianceScore()
        };
    }
    
    isApiFile(filePath, content) {
        const isApiRoute = filePath.includes('/api/') || filePath.includes('/routes/') || filePath.includes('router');
        const hasApiPatterns = this.patterns.routeHandlers.some(pattern => pattern.test(content));
        const hasStatusCodes = this.patterns.statusCodeUsage.test(content);
        
        return isApiRoute || hasApiPatterns || hasStatusCodes;
    }
    
    checkRouteHandlers(content, filePath) {
        const routes = [];
        
        this.patterns.routeHandlers.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            routes.push(...matches);
        });
        
        routes.forEach(route => {
            const method = route[1] ? route[1].toLowerCase() : 'unknown';
            this.checkMethodStatusCodes(content, filePath, method, route.index);
        });
    }
    
    checkMethodStatusCodes(content, filePath, method, routeIndex) {
        // Extract the function body for this route
        const routeStart = routeIndex;
        const functionBody = this.extractFunctionBody(content, routeStart);
        
        if (!functionBody) return;
        
        const statusCodes = [...functionBody.matchAll(this.patterns.statusCodeUsage)];
        const hasReturnStatements = this.patterns.returnStatements.test(functionBody);
        
        // Check for appropriate status codes based on HTTP method
        if (method === 'post' && hasReturnStatements) {
            const hasCreatedStatus = statusCodes.some(match => 
                match[1] === '201' || match[2] === '201' || match[3] === '201'
            );
            
            if (!hasCreatedStatus) {
                this.violations.push({
                    type: 'inappropriate-status-code',
                    severity: 'medium',
                    message: 'POST endpoints should return 201 (Created) for successful resource creation',
                    file: filePath,
                    line: this.getLineNumber(content, routeIndex),
                    suggestion: 'Use status code 201 for successful POST operations that create resources'
                });
            }
        }
        
        if (method === 'delete' && hasReturnStatements) {
            const hasNoContentStatus = statusCodes.some(match => 
                match[1] === '204' || match[2] === '204' || match[3] === '204'
            );
            
            if (!hasNoContentStatus && !statusCodes.length) {
                this.suggestions.push({
                    type: 'status-code-suggestion',
                    severity: 'low',
                    message: 'DELETE endpoints typically return 204 (No Content) for successful deletion',
                    file: filePath,
                    line: this.getLineNumber(content, routeIndex),
                    suggestion: 'Consider using status code 204 for successful DELETE operations'
                });
            }
        }
        
        // Check for missing error status codes
        const hasErrorHandling = this.patterns.errorHandling.some(pattern => pattern.test(functionBody));
        const hasErrorStatusCodes = statusCodes.some(match => {
            const code = match[1] || match[2] || match[3];
            return code && parseInt(code) >= 400;
        });
        
        if (hasErrorHandling && !hasErrorStatusCodes) {
            this.violations.push({
                type: 'missing-error-status',
                severity: 'medium',
                message: 'Error handling present but no error status codes found',
                file: filePath,
                line: this.getLineNumber(content, routeIndex),
                suggestion: 'Add appropriate 4xx/5xx status codes for error cases'
            });
        }
    }
    
    checkStatusCodeUsage(content, filePath) {
        const statusCodes = [...content.matchAll(this.patterns.statusCodeUsage)];
        
        statusCodes.forEach(match => {
            const code = match[1] || match[2] || match[3];
            if (code) {
                this.validateStatusCode(parseInt(code), filePath, match.index);
            }
        });
    }
    
    validateStatusCode(code, filePath, index) {
        // Check for non-standard or inappropriate status codes
        const isStandardCode = this.isStandardStatusCode(code);
        
        if (!isStandardCode) {
            this.violations.push({
                type: 'non-standard-status-code',
                severity: 'high',
                message: `Non-standard HTTP status code: ${code}`,
                file: filePath,
                line: this.getLineNumber(content, index),
                suggestion: 'Use standard HTTP status codes (200, 201, 400, 404, 500, etc.)'
            });
        }
        
        // Check for overuse of 200 OK
        if (code === 200) {
            // This would need more context analysis to be truly useful
            // For now, just track usage
        }
    }
    
    checkErrorHandling(content, filePath) {
        const hasErrorHandling = this.patterns.errorHandling.some(pattern => pattern.test(content));
        const hasErrorResponse = this.patterns.errorResponse.test(content);
        
        if (hasErrorHandling && !hasErrorResponse) {
            this.suggestions.push({
                type: 'error-response-format',
                severity: 'low',
                message: 'Consider implementing consistent error response format',
                file: filePath,
                suggestion: 'Use a standard error response format with message, code, and details'
            });
        }
    }
    
    checkResponseFormat(content, filePath) {
        const hasJsonResponse = this.patterns.jsonResponse.test(content);
        const hasMultipleRoutes = (content.match(/\.(get|post|put|patch|delete)\s*\(/g) || []).length > 1;
        
        if (hasMultipleRoutes && !hasJsonResponse) {
            this.suggestions.push({
                type: 'response-format-consistency',
                severity: 'low',
                message: 'Consider using consistent JSON response format across all endpoints',
                file: filePath,
                suggestion: 'Implement a standard response wrapper for all API endpoints'
            });
        }
    }
    
    isStandardStatusCode(code) {
        const allCodes = [
            ...Object.keys(this.statusCodes.success),
            ...Object.keys(this.statusCodes.clientError),
            ...Object.keys(this.statusCodes.serverError)
        ].map(c => parseInt(c));
        
        return allCodes.includes(code) || 
               (code >= 100 && code < 200) || // 1xx Informational
               (code >= 300 && code < 400);   // 3xx Redirection
    }
    
    extractFunctionBody(content, startIndex) {
        // Simple extraction - look for the next function block
        let braceCount = 0;
        let inFunction = false;
        let functionStart = -1;
        
        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            
            if (char === '{') {
                if (!inFunction) {
                    inFunction = true;
                    functionStart = i;
                }
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && inFunction) {
                    return content.substring(functionStart, i + 1);
                }
            }
        }
        
        return null;
    }
    
    calculateComplianceScore() {
        const violationPenalty = this.violations.length * 20;
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
            validator: 'HTTP Status Code Validator',
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
        
        if (this.violations.some(v => v.type === 'inappropriate-status-code')) {
            recommendations.push('Use appropriate HTTP status codes for different operations');
        }
        
        if (this.violations.some(v => v.type === 'missing-error-status')) {
            recommendations.push('Implement proper error status codes for all error cases');
        }
        
        if (this.suggestions.some(s => s.type === 'error-response-format')) {
            recommendations.push('Standardize error response format across all endpoints');
        }
        
        return recommendations;
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const filePath = args[0];
    
    if (!filePath) {
        console.error('Usage: node http-status-validator.js <file-path>');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const validator = new HttpStatusValidator();
    const result = validator.validate(filePath, content);
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.valid) {
        process.exit(1);
    }
}

module.exports = HttpStatusValidator;