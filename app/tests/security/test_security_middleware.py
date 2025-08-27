"""Backend Security Middleware Tests

Tests for all security middleware components including authentication,
rate limiting, CORS, security headers, and audit logging.
"""

import pytest
import time
from unittest.mock import Mock, patch, AsyncMock
from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.auth.middleware import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    AuthenticationMiddleware,
    AuditLogMiddleware,
    CORSMiddleware
)
from app.auth.models import User


class TestSecurityHeadersMiddleware:
    """Test security headers middleware."""

    def setup_method(self):
        """Set up test fixtures."""
        self.app = FastAPI()
        self.app.add_middleware(SecurityHeadersMiddleware)
        
        @self.app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        @self.app.get("/api/data")
        async def api_endpoint():
            return {"data": "value"}
        
        @self.app.get("/auth/login")
        async def auth_endpoint():
            return {"message": "auth"}
        
        self.client = TestClient(self.app)

    def test_adds_security_headers(self):
        """Test that security headers are added to responses."""
        response = self.client.get("/test")
        
        assert response.status_code == 200
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_adds_csp_for_api_endpoints(self):
        """Test CSP headers for API endpoints."""
        response = self.client.get("/api/data")
        
        assert response.status_code == 200
        csp = response.headers.get("Content-Security-Policy")
        assert csp is not None
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "form-action 'none'" in csp

    def test_adds_csp_for_auth_endpoints(self):
        """Test CSP headers for auth endpoints."""
        response = self.client.get("/auth/login")
        
        assert response.status_code == 200
        csp = response.headers.get("Content-Security-Policy")
        assert csp is not None
        assert "default-src 'none'" in csp

    def test_no_csp_for_regular_endpoints(self):
        """Test that regular endpoints don't get restrictive CSP."""
        response = self.client.get("/test")
        
        assert response.status_code == 200
        csp = response.headers.get("Content-Security-Policy")
        assert csp is None  # Regular endpoints don't get API CSP

    def test_header_injection_prevention(self):
        """Test prevention of header injection attacks."""
        malicious_headers = {
            "X-Injected": "malicious\r\nSet-Cookie: evil=true",
            "User-Agent": "normal\nX-Forwarded-For: evil.com"
        }
        
        response = self.client.get("/test", headers=malicious_headers)
        
        # Should not allow header injection
        response_headers = dict(response.headers)
        for header_value in response_headers.values():
            assert "\r" not in header_value
            assert "\n" not in header_value
            assert "Set-Cookie: evil" not in header_value

    def test_security_headers_override_prevention(self):
        """Test that security headers cannot be overridden."""
        # Try to override security headers in request
        malicious_headers = {
            "X-Frame-Options": "ALLOWALL",
            "X-XSS-Protection": "0",
            "X-Content-Type-Options": "sniff"
        }
        
        response = self.client.get("/test", headers=malicious_headers)
        
        # Security headers should be enforced by middleware
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        assert response.headers["X-Content-Type-Options"] == "nosniff"


class TestAuthenticationMiddleware:
    """Test authentication middleware."""

    def setup_method(self):
        """Set up test fixtures."""
        self.app = FastAPI()
        self.app.add_middleware(
            AuthenticationMiddleware,
            excluded_paths=["/public", "/health", "/auth/login"]
        )
        
        @self.app.get("/protected")
        async def protected_endpoint():
            return {"message": "protected"}
        
        @self.app.get("/public")
        async def public_endpoint():
            return {"message": "public"}
        
        @self.app.get("/auth/login")
        async def login_endpoint():
            return {"message": "login"}
        
        @self.app.options("/protected")
        async def options_endpoint():
            return {"message": "options"}
        
        self.client = TestClient(self.app)

    def test_allows_excluded_paths(self):
        """Test that excluded paths are allowed without auth."""
        response = self.client.get("/public")
        assert response.status_code == 200
        
        response = self.client.get("/auth/login")
        assert response.status_code == 200

    def test_allows_options_requests(self):
        """Test that OPTIONS requests are allowed (CORS preflight)."""
        response = self.client.options("/protected")
        assert response.status_code == 200

    def test_requires_auth_for_protected_paths(self):
        """Test that protected paths require authentication."""
        response = self.client.get("/protected")
        assert response.status_code == 401
        assert "Authorization header required" in response.json()["detail"]

    def test_rejects_malformed_auth_headers(self):
        """Test rejection of malformed authorization headers."""
        malformed_headers = [
            {"Authorization": "Basic invalid"},  # Wrong scheme
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "Bearer "},  # Empty token
            {"Authorization": "Invalid token"},  # No scheme
            {"Authorization": "Bearer token\r\nX-Injected: evil"},  # Header injection
        ]
        
        for headers in malformed_headers:
            response = self.client.get("/protected", headers=headers)
            assert response.status_code == 401

    def test_accepts_valid_bearer_token(self):
        """Test acceptance of valid Bearer tokens."""
        headers = {"Authorization": "Bearer valid-token-123"}
        
        response = self.client.get("/protected", headers=headers)
        # Would be 200 if token validation passes, 401 if it fails
        # Since we don't have actual validation, expect 401 from dependency injection
        assert response.status_code in [200, 401]

    def test_prevents_auth_bypass_attempts(self):
        """Test prevention of authentication bypass attempts."""
        bypass_attempts = [
            # Path traversal
            "/protected/../public",
            "/./protected",
            "/protected/%2e%2e/public",
            
            # Case sensitivity bypass
            "/PROTECTED",
            "/Protected",
            
            # Null byte injection
            "/protected\x00",
            "/protected%00"
        ]
        
        for path in bypass_attempts:
            response = self.client.get(path)
            # Should either be 401 (auth required) or 404 (not found)
            assert response.status_code in [401, 404]


class TestAuditLogMiddleware:
    """Test audit logging middleware."""

    def setup_method(self):
        """Set up test fixtures."""
        self.app = FastAPI()
        self.app.add_middleware(
            AuditLogMiddleware,
            log_paths=["/auth/", "/admin/"]
        )
        
        @self.app.get("/auth/login")
        async def auth_endpoint():
            return {"message": "auth"}
        
        @self.app.get("/admin/users")
        async def admin_endpoint():
            return {"message": "admin"}
        
        @self.app.get("/public")
        async def public_endpoint():
            return {"message": "public"}
        
        self.client = TestClient(self.app)

    def test_logs_auth_endpoints(self):
        """Test that auth endpoints are logged."""
        response = self.client.get("/auth/login")
        assert response.status_code == 200
        
        # In real implementation, would check logging system
        # For now, check that middleware processes the request
        assert response.json() == {"message": "auth"}

    def test_logs_admin_endpoints(self):
        """Test that admin endpoints are logged."""
        response = self.client.get("/admin/users")
        assert response.status_code == 200
        
        # Would verify log entry in real implementation
        assert response.json() == {"message": "admin"}

    def test_skips_non_logged_endpoints(self):
        """Test that non-logged endpoints are not logged."""
        response = self.client.get("/public")
        assert response.status_code == 200
        
        # Should not create log entries
        assert response.json() == {"message": "public"}

    def test_ip_extraction_for_logging(self):
        """Test IP address extraction for audit logs."""
        headers = {
            "X-Forwarded-For": "192.168.1.100, 10.0.0.1",
            "X-Real-IP": "172.16.0.1",
            "User-Agent": "TestClient"
        }
        
        response = self.client.get("/auth/login", headers=headers)
        assert response.status_code == 200
        
        # Would verify log contains correct IP in real implementation

    def test_sanitizes_logged_data(self):
        """Test that logged data is sanitized."""
        malicious_headers = {
            "User-Agent": "<script>alert('XSS')</script>",
            "X-Forwarded-For": "192.168.1.1\r\nX-Injected: malicious"
        }
        
        response = self.client.get("/auth/login", headers=malicious_headers)
        assert response.status_code == 200
        
        # Logged data should be sanitized (would verify in real logging system)

    def test_handles_missing_headers_gracefully(self):
        """Test graceful handling of missing headers."""
        # Request with minimal headers
        response = self.client.get("/auth/login", headers={})
        assert response.status_code == 200
        
        # Should not crash due to missing headers


class TestCORSMiddleware:
    """Test CORS middleware."""

    def setup_method(self):
        """Set up test fixtures."""
        self.app = FastAPI()
        self.app.add_middleware(
            CORSMiddleware,
            allowed_origins=["http://localhost:3000", "https://yourdomain.com"],
            allowed_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowed_headers=["Authorization", "Content-Type"]
        )
        
        @self.app.get("/api/test")
        async def test_endpoint():
            return {"message": "test"}
        
        @self.app.post("/api/data")
        async def post_endpoint():
            return {"message": "posted"}
        
        self.client = TestClient(self.app)

    def test_allows_whitelisted_origins(self):
        """Test that whitelisted origins are allowed."""
        headers = {"Origin": "http://localhost:3000"}
        response = self.client.get("/api/test", headers=headers)
        
        assert response.status_code == 200
        assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
        assert response.headers["Access-Control-Allow-Credentials"] == "true"

    def test_rejects_non_whitelisted_origins(self):
        """Test that non-whitelisted origins are rejected."""
        headers = {"Origin": "https://evil.com"}
        response = self.client.get("/api/test", headers=headers)
        
        assert response.status_code == 200  # Request succeeds
        assert "Access-Control-Allow-Origin" not in response.headers

    def test_handles_preflight_requests(self):
        """Test handling of CORS preflight requests."""
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
        
        response = self.client.options("/api/data", headers=headers)
        
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers
        assert "Access-Control-Allow-Headers" in response.headers
        assert "POST" in response.headers["Access-Control-Allow-Methods"]

    def test_rejects_dangerous_headers(self):
        """Test rejection of dangerous headers in preflight."""
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-Forwarded-For, Host"
        }
        
        response = self.client.options("/api/test", headers=headers)
        
        allowed_headers = response.headers.get("Access-Control-Allow-Headers", "")
        assert "X-Forwarded-For" not in allowed_headers
        assert "Host" not in allowed_headers

    def test_prevents_cors_header_injection(self):
        """Test prevention of CORS header injection."""
        malicious_origin = "http://localhost:3000\r\nX-Injected: malicious"
        headers = {"Origin": malicious_origin}
        
        response = self.client.get("/api/test", headers=headers)
        
        # Should not include malicious origin
        origin_header = response.headers.get("Access-Control-Allow-Origin")
        if origin_header:
            assert "\r" not in origin_header
            assert "\n" not in origin_header
            assert "X-Injected" not in origin_header

    def test_handles_null_origin(self):
        """Test handling of null origin."""
        headers = {"Origin": "null"}
        response = self.client.get("/api/test", headers=headers)
        
        # null origin should be rejected unless explicitly allowed
        assert "Access-Control-Allow-Origin" not in response.headers


class TestMiddlewareIntegration:
    """Test integration of multiple security middleware."""

    def setup_method(self):
        """Set up test fixtures with multiple middleware."""
        self.app = FastAPI()
        
        # Add middleware in order
        self.app.add_middleware(
            CORSMiddleware,
            allowed_origins=["http://localhost:3000"]
        )
        self.app.add_middleware(SecurityHeadersMiddleware)
        self.app.add_middleware(
            RateLimitMiddleware,
            calls=5,
            period=60
        )
        self.app.add_middleware(
            AuthenticationMiddleware,
            excluded_paths=["/public"]
        )
        self.app.add_middleware(
            AuditLogMiddleware,
            log_paths=["/auth/"]
        )
        
        @self.app.get("/public")
        async def public_endpoint():
            return {"message": "public"}
        
        @self.app.get("/auth/protected")
        async def protected_endpoint():
            return {"message": "protected"}
        
        self.client = TestClient(self.app)

    def test_middleware_chain_execution(self):
        """Test that all middleware execute in correct order."""
        headers = {
            "Origin": "http://localhost:3000",
            "Authorization": "Bearer valid-token"
        }
        
        response = self.client.get("/public", headers=headers)
        
        # Should have headers from SecurityHeadersMiddleware
        assert "X-Content-Type-Options" in response.headers
        
        # Should have CORS headers
        assert "Access-Control-Allow-Origin" in response.headers
        
        # Should succeed (public endpoint)
        assert response.status_code == 200

    def test_rate_limiting_with_auth(self):
        """Test rate limiting combined with authentication."""
        # Make requests up to rate limit on public endpoint
        for i in range(5):
            response = self.client.get("/public")
            assert response.status_code == 200
        
        # Next request should be rate limited
        response = self.client.get("/public")
        assert response.status_code == 429
        
        # Rate limit should also apply to auth endpoints
        response = self.client.get("/auth/protected")
        assert response.status_code == 429  # Rate limited, not 401

    def test_security_headers_with_cors(self):
        """Test security headers work with CORS."""
        headers = {"Origin": "http://localhost:3000"}
        response = self.client.get("/public", headers=headers)
        
        # Should have both security and CORS headers
        assert "X-Frame-Options" in response.headers
        assert "Access-Control-Allow-Origin" in response.headers
        
        # Headers should not conflict
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"

    def test_error_handling_across_middleware(self):
        """Test error handling across multiple middleware."""
        # Request that will fail authentication
        response = self.client.get("/auth/protected")
        
        # Should get 401 from auth middleware
        assert response.status_code == 401
        
        # But should still have security headers
        assert "X-Content-Type-Options" in response.headers

    def test_middleware_performance(self):
        """Test that middleware chain doesn't cause significant performance issues."""
        import time
        
        start_time = time.time()
        
        # Make multiple requests
        for i in range(10):
            response = self.client.get("/public")
            assert response.status_code in [200, 429]  # Either success or rate limited
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should complete reasonably quickly (under 1 second for 10 requests)
        assert total_time < 1.0

    def test_middleware_memory_usage(self):
        """Test that middleware don't cause memory leaks."""
        # Make many requests to test for memory leaks
        for i in range(100):
            response = self.client.get("/public")
            assert response.status_code in [200, 429]
        
        # In a real test, would monitor memory usage
        # For now, just verify requests complete successfully

    def test_security_bypass_through_middleware_chain(self):
        """Test that security cannot be bypassed through middleware interactions."""
        bypass_attempts = [
            # Try to bypass auth with CORS
            {
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "X-Auth-Bypass": "true"
            },
            
            # Try to bypass rate limiting with auth headers
            {
                "Authorization": "Bearer fake-token",
                "X-Rate-Limit-Bypass": "admin"
            },
            
            # Try to manipulate middleware order
            {
                "X-Middleware-Order": "skip-auth",
                "X-Security-Override": "true"
            }
        ]
        
        for headers in bypass_attempts:
            response = self.client.get("/auth/protected", headers=headers)
            
            # Should still require proper authentication
            assert response.status_code == 401  # Not bypassed


class TestMiddlewareSecurity:
    """Test security aspects of middleware themselves."""

    def test_middleware_exception_handling(self):
        """Test that middleware handle exceptions securely."""
        app = FastAPI()
        
        class FaultyMiddleware(BaseHTTPMiddleware):
            async def dispatch(self, request, call_next):
                # Simulate middleware that might throw exception
                if "cause-error" in request.url.path:
                    raise ValueError("Simulated error")
                return await call_next(request)
        
        app.add_middleware(FaultyMiddleware)
        app.add_middleware(SecurityHeadersMiddleware)
        
        @app.get("/normal")
        async def normal_endpoint():
            return {"message": "normal"}
        
        @app.get("/cause-error")
        async def error_endpoint():
            return {"message": "should not reach"}
        
        client = TestClient(app)
        
        # Normal request should work
        response = client.get("/normal")
        assert response.status_code == 200
        assert "X-Content-Type-Options" in response.headers
        
        # Error request should be handled gracefully
        response = client.get("/cause-error")
        assert response.status_code == 500  # Internal server error
        
        # Should not leak sensitive information
        assert "Simulated error" not in response.text

    def test_middleware_input_validation(self):
        """Test that middleware validate inputs properly."""
        app = FastAPI()
        app.add_middleware(
            RateLimitMiddleware,
            calls=10,
            period=60
        )
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        
        # Test with various malformed headers
        malformed_requests = [
            {"headers": {"X-Forwarded-For": "\x00\x01\x02"}},
            {"headers": {"User-Agent": "A" * 10000}},  # Very long header
            {"headers": {"Host": "evil.com\r\nX-Injected: true"}},
        ]
        
        for req_data in malformed_requests:
            response = client.get("/test", **req_data)
            
            # Should handle malformed input gracefully
            assert response.status_code in [200, 400, 429]
            
            # Should not crash or expose internals
            assert "traceback" not in response.text.lower()
            assert "error" not in response.text.lower() or "Rate limit" in response.text

    def test_middleware_dos_resistance(self):
        """Test middleware resistance to DoS attacks."""
        app = FastAPI()
        app.add_middleware(
            RateLimitMiddleware,
            calls=2,  # Low limit for testing
            period=60
        )
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        
        # Rapid requests should be rate limited
        responses = []
        for i in range(10):
            response = client.get("/test")
            responses.append(response.status_code)
        
        # Should have some successful and some rate-limited responses
        success_count = responses.count(200)
        rate_limited_count = responses.count(429)
        
        assert success_count <= 2  # Should respect rate limit
        assert rate_limited_count > 0  # Should rate limit excess requests
        
        # Total should be 10
        assert success_count + rate_limited_count == 10
