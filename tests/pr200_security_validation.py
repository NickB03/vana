#!/usr/bin/env python3
"""
PR200 Security Validation - Final Production Readiness Check

Comprehensive security audit for PR200 before deployment.
Validates critical security fixes and production readiness.
"""

import json
import os
import sys
from typing import Any, Dict, List
import subprocess
import requests
from pathlib import Path

class SecurityValidationResult:
    """Container for security validation results."""
    
    def __init__(self):
        self.tests_passed = 0
        self.tests_failed = 0
        self.critical_issues = []
        self.warnings = []
        self.recommendations = []
        
    def add_pass(self, test_name: str, details: str = ""):
        """Add a passing test result."""
        self.tests_passed += 1
        print(f"✅ PASS: {test_name}")
        if details:
            print(f"   {details}")
    
    def add_fail(self, test_name: str, issue: str, critical: bool = True):
        """Add a failing test result."""
        self.tests_failed += 1
        if critical:
            self.critical_issues.append(f"{test_name}: {issue}")
            print(f"❌ FAIL (CRITICAL): {test_name}")
        else:
            self.warnings.append(f"{test_name}: {issue}")
            print(f"⚠️  FAIL (WARNING): {test_name}")
        print(f"   {issue}")
    
    def add_recommendation(self, recommendation: str):
        """Add a security recommendation."""
        self.recommendations.append(recommendation)
        print(f"💡 RECOMMENDATION: {recommendation}")
    
    def get_security_rating(self) -> str:
        """Calculate overall security rating."""
        if self.critical_issues:
            return "F"  # Failing grade for critical issues
        elif self.tests_failed > 0:
            return "C"  # Needs improvement
        elif self.warnings:
            return "B"  # Good with minor issues
        else:
            return "A+"  # Excellent security posture
    
    def get_deployment_authorization(self) -> str:
        """Get deployment authorization status."""
        if self.critical_issues:
            return "NO-GO"
        elif self.tests_failed > 2:
            return "NO-GO"
        else:
            return "GO"


class PR200SecurityValidator:
    """Comprehensive security validator for PR200."""
    
    def __init__(self):
        self.result = SecurityValidationResult()
        self.base_path = Path(__file__).parent.parent
        self.app_path = self.base_path / "app"
    
    def validate_authentication_configuration(self):
        """Validate authentication configuration security."""
        print("\n🔐 VALIDATING AUTHENTICATION CONFIGURATION")
        
        try:
            # Check auth settings
            sys.path.append(str(self.base_path))
            from app.auth.config import get_auth_settings
            
            settings = get_auth_settings()
            
            # Test 1: SSE Authentication Configuration
            if hasattr(settings, 'require_sse_auth'):
                if os.getenv('NODE_ENV') == 'production' and not settings.require_sse_auth:
                    self.result.add_fail(
                        "SSE Authentication",
                        "SSE authentication should be required in production",
                        critical=True
                    )
                else:
                    self.result.add_pass(
                        "SSE Authentication", 
                        f"require_sse_auth = {settings.require_sse_auth}"
                    )
            
            # Test 2: JWT Secret Key
            if settings.secret_key and len(settings.secret_key) >= 32:
                self.result.add_pass("JWT Secret Key", "Secure key configured")
            else:
                self.result.add_fail(
                    "JWT Secret Key",
                    "JWT secret key must be at least 32 characters",
                    critical=True
                )
            
            # Test 3: Token Expiration
            if settings.access_token_expire_minutes <= 60:
                self.result.add_pass(
                    "Token Expiration", 
                    f"Access tokens expire in {settings.access_token_expire_minutes} minutes"
                )
            else:
                self.result.add_fail(
                    "Token Expiration",
                    "Access tokens should expire within 60 minutes",
                    critical=False
                )
                
        except Exception as e:
            self.result.add_fail(
                "Authentication Configuration",
                f"Failed to load auth configuration: {e}",
                critical=True
            )
    
    def validate_security_middleware(self):
        """Validate security middleware implementation."""
        print("\n🛡️  VALIDATING SECURITY MIDDLEWARE")
        
        # Test 1: Security Headers Middleware
        security_middleware_file = self.app_path / "middleware" / "security.py"
        if security_middleware_file.exists():
            content = security_middleware_file.read_text()
            
            # Check for essential security headers
            required_headers = [
                "Content-Security-Policy",
                "X-Content-Type-Options",
                "X-Frame-Options",
                "Strict-Transport-Security"
            ]
            
            missing_headers = []
            for header in required_headers:
                if header not in content:
                    missing_headers.append(header)
            
            if missing_headers:
                self.result.add_fail(
                    "Security Headers",
                    f"Missing security headers: {', '.join(missing_headers)}",
                    critical=True
                )
            else:
                self.result.add_pass("Security Headers", "All critical headers implemented")
        else:
            self.result.add_fail(
                "Security Headers Middleware",
                "Security headers middleware file not found",
                critical=True
            )
        
        # Test 2: Rate Limiting
        auth_middleware_file = self.app_path / "auth" / "middleware.py"
        if auth_middleware_file.exists():
            content = auth_middleware_file.read_text()
            if "RateLimitMiddleware" in content:
                self.result.add_pass("Rate Limiting", "Rate limiting middleware implemented")
            else:
                self.result.add_fail(
                    "Rate Limiting",
                    "Rate limiting middleware not found",
                    critical=False
                )
    
    def validate_input_sanitization(self):
        """Validate input sanitization and validation."""
        print("\n🧹 VALIDATING INPUT SANITIZATION")
        
        # Test 1: Path Traversal Protection
        auth_middleware_file = self.app_path / "auth" / "middleware.py"
        if auth_middleware_file.exists():
            content = auth_middleware_file.read_text()
            if "_is_path_traversal_attempt" in content:
                self.result.add_pass("Path Traversal Protection", "Implementation found")
            else:
                self.result.add_fail(
                    "Path Traversal Protection",
                    "Path traversal protection not implemented",
                    critical=True
                )
        
        # Test 2: Password Validation
        auth_security_file = self.app_path / "auth" / "security.py"
        if auth_security_file.exists():
            content = auth_security_file.read_text()
            if "validate_password_strength" in content:
                self.result.add_pass("Password Validation", "Strong password validation implemented")
            else:
                self.result.add_fail(
                    "Password Validation",
                    "Password strength validation not found",
                    critical=False
                )
    
    def validate_authentication_endpoints(self):
        """Validate authentication endpoint security."""
        print("\n🔑 VALIDATING AUTHENTICATION ENDPOINTS")
        
        # Test 1: JWT Implementation
        auth_security_file = self.app_path / "auth" / "security.py"
        if auth_security_file.exists():
            content = auth_security_file.read_text()
            
            jwt_functions = [
                "create_access_token",
                "verify_password",
                "get_current_user",
                "authenticate_user"
            ]
            
            missing_functions = []
            for func in jwt_functions:
                if func not in content:
                    missing_functions.append(func)
            
            if missing_functions:
                self.result.add_fail(
                    "JWT Implementation",
                    f"Missing JWT functions: {', '.join(missing_functions)}",
                    critical=True
                )
            else:
                self.result.add_pass("JWT Implementation", "All required JWT functions present")
        
        # Test 2: Token Type Validation
        if auth_security_file.exists():
            content = auth_security_file.read_text()
            if 'token_type != "access"' in content:
                self.result.add_pass("Token Type Validation", "Token type checking implemented")
            else:
                self.result.add_fail(
                    "Token Type Validation",
                    "Token type validation not found",
                    critical=True
                )
    
    def validate_sse_security(self):
        """Validate Server-Sent Events security."""
        print("\n📡 VALIDATING SSE SECURITY")
        
        server_file = self.app_path / "server.py"
        if server_file.exists():
            content = server_file.read_text()
            
            # Test 1: SSE Authentication Dependency
            if "current_user_for_sse_dep" in content:
                self.result.add_pass("SSE Authentication", "SSE endpoints use authentication dependency")
            else:
                self.result.add_fail(
                    "SSE Authentication",
                    "SSE endpoints missing authentication dependency",
                    critical=True
                )
            
            # Test 2: SSE CORS Headers
            if "Cache-Control" in content and "no-cache" in content:
                self.result.add_pass("SSE Headers", "Proper SSE headers configured")
            else:
                self.result.add_fail(
                    "SSE Headers",
                    "SSE security headers not properly configured",
                    critical=False
                )
    
    def validate_environment_configuration(self):
        """Validate environment-specific security configuration."""
        print("\n🌍 VALIDATING ENVIRONMENT CONFIGURATION")
        
        # Test 1: Production Environment Detection
        node_env = os.getenv('NODE_ENV')
        environment = os.getenv('ENVIRONMENT')
        
        if node_env == 'production' or environment == 'production':
            self.result.add_pass("Environment Detection", "Production environment detected")
            
            # Production-specific checks
            if os.getenv('AUTH_REQUIRE_SSE_AUTH', '').lower() == 'false':
                self.result.add_fail(
                    "Production SSE Auth",
                    "SSE authentication should be required in production",
                    critical=True
                )
        else:
            self.result.add_pass("Environment Detection", f"Development environment: {node_env or environment or 'unknown'}")
        
        # Test 2: Secret Management
        sensitive_vars = ['JWT_SECRET_KEY', 'AUTH_SECRET_KEY', 'GOOGLE_API_KEY']
        exposed_secrets = []
        
        for var in sensitive_vars:
            if os.getenv(var) and len(os.getenv(var)) < 16:
                exposed_secrets.append(var)
        
        if exposed_secrets:
            self.result.add_fail(
                "Secret Management",
                f"Weak secrets detected: {', '.join(exposed_secrets)}",
                critical=True
            )
        else:
            self.result.add_pass("Secret Management", "Secrets appear properly configured")
    
    def validate_file_permissions(self):
        """Validate critical file permissions."""
        print("\n📁 VALIDATING FILE PERMISSIONS")
        
        critical_files = [
            self.base_path / ".env",
            self.base_path / ".env.local",
            self.app_path / "auth" / "config.py",
            self.app_path / "auth" / "security.py"
        ]
        
        for file_path in critical_files:
            if file_path.exists():
                stat = file_path.stat()
                # Check if file is readable by others (dangerous for config files)
                if stat.st_mode & 0o044:  # world/group readable
                    self.result.add_fail(
                        "File Permissions",
                        f"{file_path.name} is readable by others",
                        critical=False
                    )
                else:
                    self.result.add_pass(
                        "File Permissions",
                        f"{file_path.name} has secure permissions"
                    )
    
    def check_known_vulnerabilities(self):
        """Check for known vulnerability patterns."""
        print("\n🔍 CHECKING FOR KNOWN VULNERABILITIES")
        
        # Test 1: Debug Endpoints in Production
        server_file = self.app_path / "server.py"
        if server_file.exists():
            content = server_file.read_text()
            
            debug_patterns = [
                "/debug",
                "/phoenix",
                "debug=True",
                "DEBUG = True"
            ]
            
            found_debug = []
            for pattern in debug_patterns:
                if pattern in content:
                    found_debug.append(pattern)
            
            if found_debug and os.getenv('NODE_ENV') == 'production':
                self.result.add_fail(
                    "Debug Endpoints",
                    f"Debug patterns found in production: {', '.join(found_debug)}",
                    critical=True
                )
            elif found_debug:
                self.result.add_recommendation(
                    "Consider removing debug endpoints before production deployment"
                )
                self.result.add_pass("Debug Endpoints", "Debug patterns found but not in production")
            else:
                self.result.add_pass("Debug Endpoints", "No debug endpoints found")
        
        # Test 2: Hardcoded Secrets
        source_files = list(self.app_path.rglob("*.py"))
        hardcoded_patterns = [
            "password=",
            "secret=",
            "key=",
            "token="
        ]
        
        vulnerable_files = []
        for file_path in source_files:
            try:
                content = file_path.read_text()
                for pattern in hardcoded_patterns:
                    if pattern in content.lower() and "=" in content:
                        # Basic check for hardcoded values
                        lines = content.split('\n')
                        for line in lines:
                            if pattern in line.lower() and '"' in line and len(line.strip()) > 20:
                                vulnerable_files.append(file_path.name)
                                break
            except Exception:
                continue
        
        if vulnerable_files:
            self.result.add_fail(
                "Hardcoded Secrets",
                f"Potential hardcoded secrets in: {', '.join(set(vulnerable_files))}",
                critical=False
            )
        else:
            self.result.add_pass("Hardcoded Secrets", "No obvious hardcoded secrets found")
    
    def run_full_validation(self) -> SecurityValidationResult:
        """Run complete security validation."""
        print("🔒 PR200 SECURITY VALIDATION - FINAL PRODUCTION READINESS CHECK")
        print("=" * 70)
        
        # Run all validation checks
        self.validate_authentication_configuration()
        self.validate_security_middleware()
        self.validate_input_sanitization()
        self.validate_authentication_endpoints()
        self.validate_sse_security()
        self.validate_environment_configuration()
        self.validate_file_permissions()
        self.check_known_vulnerabilities()
        
        return self.result
    
    def generate_security_report(self) -> str:
        """Generate comprehensive security report."""
        rating = self.result.get_security_rating()
        authorization = self.result.get_deployment_authorization()
        
        report = f"""
🔒 PR200 SECURITY VALIDATION REPORT
{'=' * 50}

OVERALL SECURITY RATING: {rating}
DEPLOYMENT AUTHORIZATION: {authorization}

SUMMARY:
✅ Tests Passed: {self.result.tests_passed}
❌ Tests Failed: {self.result.tests_failed}
🚨 Critical Issues: {len(self.result.critical_issues)}
⚠️  Warnings: {len(self.result.warnings)}
💡 Recommendations: {len(self.result.recommendations)}

"""
        
        if self.result.critical_issues:
            report += "🚨 CRITICAL ISSUES (MUST FIX BEFORE DEPLOYMENT):\n"
            for issue in self.result.critical_issues:
                report += f"   • {issue}\n"
            report += "\n"
        
        if self.result.warnings:
            report += "⚠️  WARNINGS:\n"
            for warning in self.result.warnings:
                report += f"   • {warning}\n"
            report += "\n"
        
        if self.result.recommendations:
            report += "💡 RECOMMENDATIONS:\n"
            for rec in self.result.recommendations:
                report += f"   • {rec}\n"
            report += "\n"
        
        # Security posture assessment
        if rating in ['A+', 'A']:
            report += "✅ SECURITY POSTURE: EXCELLENT - Ready for production deployment\n"
        elif rating == 'B':
            report += "⚠️  SECURITY POSTURE: GOOD - Minor issues should be addressed\n"
        elif rating == 'C':
            report += "⚠️  SECURITY POSTURE: NEEDS IMPROVEMENT - Address issues before deployment\n"
        else:
            report += "❌ SECURITY POSTURE: FAILING - Critical issues must be resolved\n"
        
        report += f"\nFINAL AUTHORIZATION: {authorization}\n"
        
        if authorization == "GO":
            report += "✅ Production deployment is AUTHORIZED\n"
        else:
            report += "❌ Production deployment is NOT AUTHORIZED - resolve critical issues first\n"
        
        return report


def main():
    """Main execution function."""
    validator = PR200SecurityValidator()
    result = validator.run_full_validation()
    
    print("\n" + "=" * 70)
    print(validator.generate_security_report())
    
    # Exit with appropriate code
    if result.get_deployment_authorization() == "NO-GO":
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()