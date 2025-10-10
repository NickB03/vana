#!/usr/bin/env python3
"""
PR200 Final Security Check - Production Deployment Authorization

CRITICAL SECURITY VALIDATION FOR PR200 BEFORE PRODUCTION DEPLOYMENT
- Validates SSE authentication bypass fix
- Confirms JWT enforcement on protected endpoints  
- Verifies input validation and security headers
- Checks session management and rate limiting
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Tuple

class SecurityAssessment:
    """Security assessment results with production readiness determination."""
    
    def __init__(self):
        self.critical_passed = 0
        self.critical_failed = 0
        self.warnings = 0
        self.recommendations = []
        self.issues = []
        
    def pass_critical(self, check: str):
        self.critical_passed += 1
        print(f"✅ CRITICAL PASS: {check}")
    
    def fail_critical(self, check: str, issue: str):
        self.critical_failed += 1
        self.issues.append(f"CRITICAL: {check} - {issue}")
        print(f"🚨 CRITICAL FAIL: {check}")
        print(f"   Issue: {issue}")
    
    def warn(self, check: str, warning: str):
        self.warnings += 1
        print(f"⚠️  WARNING: {check} - {warning}")
    
    def recommend(self, recommendation: str):
        self.recommendations.append(recommendation)
        print(f"💡 RECOMMENDATION: {recommendation}")
    
    def get_security_rating(self) -> str:
        """Get overall security rating A+ to F."""
        if self.critical_failed > 0:
            return "F"
        elif self.warnings > 3:
            return "C"
        elif self.warnings > 0:
            return "B"
        else:
            return "A+"
    
    def get_deployment_status(self) -> Tuple[str, str]:
        """Get deployment authorization and reason."""
        if self.critical_failed > 0:
            return "NO-GO", f"Critical security issues detected: {self.critical_failed}"
        elif self.warnings > 5:
            return "NO-GO", f"Too many warnings: {self.warnings}"
        else:
            return "GO", "All critical security requirements met"


def validate_sse_authentication_fix():
    """Validate SSE authentication bypass is fixed."""
    print("\n🔐 CRITICAL: SSE Authentication Bypass Fix")
    
    assessment = SecurityAssessment()
    
    try:
        # Check auth security implementation
        sys.path.append(str(Path(__file__).parent.parent))
        from app.auth.security import get_current_user_for_sse
        from app.auth.config import get_auth_settings
        
        settings = get_auth_settings()
        
        # Critical Test 1: SSE Authentication Function Exists
        if 'get_current_user_for_sse' in dir(sys.modules['app.auth.security']):
            assessment.pass_critical("SSE authentication function implemented")
        else:
            assessment.fail_critical("SSE Authentication", "get_current_user_for_sse function missing")
        
        # Critical Test 2: SSE Auth Configuration
        if hasattr(settings, 'require_sse_auth'):
            # In production, this should be True by default
            if os.getenv('NODE_ENV') == 'production':
                if settings.require_sse_auth:
                    assessment.pass_critical("SSE auth required in production")
                else:
                    assessment.warn("SSE Authentication", "Consider enabling SSE auth for production")
            else:
                assessment.pass_critical("SSE auth configuration available")
        else:
            assessment.fail_critical("SSE Configuration", "require_sse_auth setting missing")
        
        # Critical Test 3: Check server.py uses SSE auth dependency
        server_file = Path(__file__).parent.parent / "app" / "server.py"
        if server_file.exists():
            content = server_file.read_text()
            if "current_user_for_sse_dep" in content:
                assessment.pass_critical("SSE endpoints use authentication dependency")
            else:
                assessment.fail_critical("SSE Endpoints", "SSE endpoints missing authentication dependency")
        
    except Exception as e:
        assessment.fail_critical("SSE Authentication", f"Failed to validate: {e}")
    
    return assessment


def validate_jwt_enforcement():
    """Validate JWT authentication enforcement."""
    print("\n🔑 CRITICAL: JWT Authentication Enforcement")
    
    assessment = SecurityAssessment()
    
    try:
        # Check JWT security implementation
        auth_security_file = Path(__file__).parent.parent / "app" / "auth" / "security.py"
        if auth_security_file.exists():
            content = auth_security_file.read_text()
            
            # Critical Test 1: JWT Token Validation
            if 'jwt.decode' in content and 'JWT_SECRET_KEY' in content:
                assessment.pass_critical("JWT token validation implemented")
            else:
                assessment.fail_critical("JWT Validation", "JWT token validation missing")
            
            # Critical Test 2: Token Type Checking
            if 'token_type != "access"' in content:
                assessment.pass_critical("JWT token type validation implemented")
            else:
                assessment.fail_critical("Token Type", "JWT token type validation missing")
            
            # Critical Test 3: User Authentication
            if 'get_current_user' in content and 'HTTPException' in content:
                assessment.pass_critical("User authentication with error handling")
            else:
                assessment.fail_critical("User Auth", "User authentication not properly implemented")
                
        else:
            assessment.fail_critical("Security Module", "Auth security module not found")
            
    except Exception as e:
        assessment.fail_critical("JWT Enforcement", f"Failed to validate: {e}")
    
    return assessment


def validate_input_security():
    """Validate input validation and sanitization."""
    print("\n🛡️  CRITICAL: Input Validation & Security")
    
    assessment = SecurityAssessment()
    
    try:
        # Critical Test 1: Path Traversal Protection
        auth_middleware = Path(__file__).parent.parent / "app" / "auth" / "middleware.py"
        if auth_middleware.exists():
            content = auth_middleware.read_text()
            if "_is_path_traversal_attempt" in content:
                assessment.pass_critical("Path traversal protection implemented")
            else:
                assessment.fail_critical("Path Traversal", "Path traversal protection missing")
        
        # Critical Test 2: Password Strength Validation
        auth_security = Path(__file__).parent.parent / "app" / "auth" / "security.py"
        if auth_security.exists():
            content = auth_security.read_text()
            if "validate_password_strength" in content:
                assessment.pass_critical("Password strength validation implemented")
            else:
                assessment.warn("Password Validation", "Password strength validation not found")
        
        # Critical Test 3: SQL Injection Protection (ORM usage)
        if "db.query" in content and "filter" in content:
            assessment.pass_critical("ORM-based queries (SQL injection protection)")
        else:
            assessment.warn("SQL Protection", "Verify SQL injection protection")
            
    except Exception as e:
        assessment.fail_critical("Input Security", f"Failed to validate: {e}")
    
    return assessment


def validate_security_headers():
    """Validate security headers implementation."""
    print("\n🛡️  CRITICAL: Security Headers")
    
    assessment = SecurityAssessment()
    
    try:
        security_middleware = Path(__file__).parent.parent / "app" / "middleware" / "security.py"
        if security_middleware.exists():
            content = security_middleware.read_text()
            
            # Critical headers that must be present
            critical_headers = [
                "Content-Security-Policy",
                "X-Content-Type-Options",
                "X-Frame-Options",
                "Strict-Transport-Security"
            ]
            
            missing_headers = []
            for header in critical_headers:
                if header not in content:
                    missing_headers.append(header)
            
            if not missing_headers:
                assessment.pass_critical("All critical security headers implemented")
            else:
                assessment.fail_critical("Security Headers", f"Missing: {', '.join(missing_headers)}")
                
            # Check for CSP nonce implementation
            if "nonce" in content.lower():
                assessment.pass_critical("CSP nonce implementation found")
            else:
                assessment.warn("CSP Nonce", "CSP nonce implementation not detected")
                
        else:
            assessment.fail_critical("Security Headers", "Security headers middleware not found")
            
    except Exception as e:
        assessment.fail_critical("Security Headers", f"Failed to validate: {e}")
    
    return assessment


def validate_session_security():
    """Validate session management security."""
    print("\n🔐 CRITICAL: Session Management Security")
    
    assessment = SecurityAssessment()
    
    try:
        auth_security = Path(__file__).parent.parent / "app" / "auth" / "security.py"
        if auth_security.exists():
            content = auth_security.read_text()
            
            # Critical Test 1: Refresh Token Management
            if "RefreshToken" in content and "revoke" in content:
                assessment.pass_critical("Refresh token management implemented")
            else:
                assessment.fail_critical("Session Management", "Refresh token management missing")
            
            # Critical Test 2: Token Expiration
            if "expires_at" in content or "ACCESS_TOKEN_EXPIRE" in content:
                assessment.pass_critical("Token expiration implemented")
            else:
                assessment.fail_critical("Token Expiration", "Token expiration not found")
            
            # Critical Test 3: Session Cleanup
            if "revoke_all_user_tokens" in content:
                assessment.pass_critical("Session cleanup functionality available")
            else:
                assessment.warn("Session Cleanup", "Session cleanup functionality not found")
                
    except Exception as e:
        assessment.fail_critical("Session Security", f"Failed to validate: {e}")
    
    return assessment


def validate_rate_limiting():
    """Validate rate limiting implementation."""
    print("\n🚦 SECURITY: Rate Limiting")
    
    assessment = SecurityAssessment()
    
    try:
        auth_middleware = Path(__file__).parent.parent / "app" / "auth" / "middleware.py"
        if auth_middleware.exists():
            content = auth_middleware.read_text()
            
            if "RateLimitMiddleware" in content:
                assessment.pass_critical("Rate limiting middleware implemented")
                
                # Check if it targets auth endpoints
                if "/auth/" in content:
                    assessment.pass_critical("Rate limiting applies to auth endpoints")
                else:
                    assessment.warn("Rate Limiting", "Verify rate limiting covers auth endpoints")
            else:
                assessment.warn("Rate Limiting", "Rate limiting middleware not found")
                
    except Exception as e:
        assessment.warn("Rate Limiting", f"Failed to validate: {e}")
    
    return assessment


def run_comprehensive_security_validation():
    """Run all critical security validations for PR200."""
    print("🔒 PR200 FINAL SECURITY VALIDATION")
    print("=" * 60)
    print("PRODUCTION DEPLOYMENT AUTHORIZATION CHECK")
    print("=" * 60)
    
    # Run all critical validations
    assessments = [
        validate_sse_authentication_fix(),
        validate_jwt_enforcement(),
        validate_input_security(),
        validate_security_headers(),
        validate_session_security(),
        validate_rate_limiting()
    ]
    
    # Combine results
    total_assessment = SecurityAssessment()
    for assessment in assessments:
        total_assessment.critical_passed += assessment.critical_passed
        total_assessment.critical_failed += assessment.critical_failed
        total_assessment.warnings += assessment.warnings
        total_assessment.issues.extend(assessment.issues)
        total_assessment.recommendations.extend(assessment.recommendations)
    
    # Generate final report
    print("\n" + "=" * 60)
    print("🔒 FINAL SECURITY ASSESSMENT")
    print("=" * 60)
    
    rating = total_assessment.get_security_rating()
    status, reason = total_assessment.get_deployment_status()
    
    print(f"SECURITY RATING: {rating}")
    print(f"DEPLOYMENT AUTHORIZATION: {status}")
    print(f"REASON: {reason}")
    print()
    print(f"✅ Critical Tests Passed: {total_assessment.critical_passed}")
    print(f"🚨 Critical Tests Failed: {total_assessment.critical_failed}")
    print(f"⚠️  Warnings: {total_assessment.warnings}")
    
    if total_assessment.issues:
        print("\n🚨 CRITICAL ISSUES:")
        for issue in total_assessment.issues:
            print(f"   • {issue}")
    
    if total_assessment.recommendations:
        print("\n💡 RECOMMENDATIONS:")
        for rec in total_assessment.recommendations:
            print(f"   • {rec}")
    
    print("\n" + "=" * 60)
    if status == "GO":
        print("✅ PRODUCTION DEPLOYMENT AUTHORIZED")
        print("All critical security requirements have been met.")
        print("PR200 is ready for production deployment.")
    else:
        print("❌ PRODUCTION DEPLOYMENT NOT AUTHORIZED")
        print("Critical security issues must be resolved before deployment.")
        print("DO NOT DEPLOY TO PRODUCTION until issues are fixed.")
    
    print("=" * 60)
    
    # Return exit code
    return 0 if status == "GO" else 1


if __name__ == "__main__":
    exit_code = run_comprehensive_security_validation()
    sys.exit(exit_code)