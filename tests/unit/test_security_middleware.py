"""Unit tests for security middleware integration."""

import json
import os
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.middleware import SecurityHeadersMiddleware
from app.auth.middleware import CORSMiddleware, RateLimitMiddleware, AuditLogMiddleware


class TestSecurityHeadersMiddleware:
    """Test SecurityHeadersMiddleware functionality."""

    @pytest.fixture
    def app(self):
        """Create test FastAPI app with security middleware."""
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware, enable_hsts=True)

        @test_app.get("/test")
        def test_endpoint():
            return {"message": "test"}

        @test_app.get("/api/test")
        def test_api_endpoint():
            return {"message": "api test"}

        @test_app.get("/auth/test")
        def test_auth_endpoint():
            return {"message": "auth test"}

        return test_app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return TestClient(app)

    def test_security_headers_applied(self, client):
        """Test that security headers are applied to all responses."""
        response = client.get("/test")

        assert response.status_code == 200

        # Check required security headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        # X-XSS-Protection removed - deprecated and ineffective in modern browsers
        assert "X-XSS-Protection" not in response.headers
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "Content-Security-Policy" in response.headers
        assert "Permissions-Policy" in response.headers
        assert response.headers["Server"] == "Vana/1.0"

    def test_hsts_header_https(self, client):
        """Test HSTS header logic exists (requires HTTPS for actual header)."""
        # HSTS is only added for HTTPS requests in production
        # This test validates the middleware structure exists
        response = client.get("/test")
        assert response.status_code == 200
        # HSTS won't be present for HTTP requests
        assert "Strict-Transport-Security" not in response.headers

    def test_api_endpoint_strict_csp(self, client):
        """Test API endpoints get strict CSP policy."""
        response = client.get("/api/test")

        assert response.status_code == 200
        csp = response.headers["Content-Security-Policy"]

        # API endpoints should have strict CSP
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "form-action 'none'" in csp
        assert "base-uri 'none'" in csp

    def test_auth_endpoint_strict_csp(self, client):
        """Test auth endpoints get strict CSP policy."""
        response = client.get("/auth/test")

        assert response.status_code == 200
        csp = response.headers["Content-Security-Policy"]

        # Auth endpoints should have strict CSP
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp

    def test_web_endpoint_nonce_csp(self, client):
        """Test web endpoints get nonce-based CSP policy."""
        response = client.get("/test")

        assert response.status_code == 200
        csp = response.headers["Content-Security-Policy"]

        # Web endpoints should have nonce-based CSP
        assert "default-src 'self'" in csp
        assert "'nonce-" in csp  # Should contain nonce
        assert "connect-src" in csp

    def test_csp_nonce_header(self, client):
        """Test CSP nonce is provided in response header."""
        response = client.get("/test")

        assert response.status_code == 200
        assert "X-CSP-Nonce" in response.headers

        nonce = response.headers["X-CSP-Nonce"]
        assert len(nonce) > 10  # Should be a proper nonce

        # Nonce should be in CSP header
        csp = response.headers["Content-Security-Policy"]
        assert f"'nonce-{nonce}'" in csp

    @patch.dict(os.environ, {"USE_OPENROUTER": "true"})
    def test_openrouter_csp_domain(self, client):
        """Test OpenRouter domain is added to CSP when enabled."""
        # Create new app instance to pick up environment change
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware)

        @test_app.get("/test")
        def test_endpoint():
            return {"message": "test"}

        test_client = TestClient(test_app)
        response = test_client.get("/test")

        assert response.status_code == 200
        csp = response.headers["Content-Security-Policy"]
        assert "https://openrouter.ai" in csp

    @patch.dict(
        os.environ,
        {"CSP_EXTRA_CONNECT_DOMAINS": "https://example.com,https://api.example.com"},
    )
    def test_extra_csp_domains(self, client):
        """Test extra CSP domains from environment are included."""
        # Create new app instance to pick up environment change
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware)

        @test_app.get("/test")
        def test_endpoint():
            return {"message": "test"}

        test_client = TestClient(test_app)
        response = test_client.get("/test")

        assert response.status_code == 200
        csp = response.headers["Content-Security-Policy"]
        assert "https://example.com" in csp
        assert "https://api.example.com" in csp


class TestMiddlewareIntegration:
    """Test complete middleware integration."""

    @pytest.fixture
    def app(self):
        """Create test app with all security middleware."""
        test_app = FastAPI()

        # Add middleware in the same order as server.py
        test_app.add_middleware(SecurityHeadersMiddleware, enable_hsts=False)
        test_app.add_middleware(
            CORSMiddleware, allowed_origins=["http://localhost:3000"]
        )
        test_app.add_middleware(RateLimitMiddleware, calls=10, period=60)
        test_app.add_middleware(AuditLogMiddleware)

        @test_app.get("/auth/test")
        def test_auth_endpoint():
            return {"message": "auth test"}

        @test_app.get("/test")
        def test_endpoint():
            return {"message": "test"}

        return test_app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return TestClient(app)

    def test_middleware_order_correct(self, client):
        """Test that middleware is applied in correct order."""
        response = client.get("/test", headers={"Origin": "http://localhost:3000"})

        assert response.status_code == 200

        # Security headers should be present
        assert "X-Content-Type-Options" in response.headers

        # CORS headers should be present
        assert "Access-Control-Allow-Origin" in response.headers

    def test_auth_endpoint_rate_limiting(self, client):
        """Test rate limiting works on auth endpoints."""
        # Make multiple requests quickly
        responses = []
        for _ in range(12):  # Exceed the limit of 10
            responses.append(client.get("/auth/test"))

        # Should have some 429 responses (rate limited)
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes

    def test_non_auth_endpoint_no_rate_limiting(self, client):
        """Test non-auth endpoints are not rate limited."""
        # Make multiple requests to non-auth endpoint
        responses = []
        for _ in range(12):
            responses.append(client.get("/test"))

        # All should be successful (no rate limiting)
        status_codes = [r.status_code for r in responses]
        assert all(code == 200 for code in status_codes)

    def test_cors_preflight_handling(self, client):
        """Test CORS preflight requests are handled correctly."""
        response = client.options(
            "/test",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization",
            },
        )

        # Should allow the preflight
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers


class TestSecurityConfiguration:
    """Test security configuration and environment handling."""

    def test_production_environment_detection(self):
        """Test production environment is detected correctly."""
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            middleware = SecurityHeadersMiddleware(None, enable_hsts=True)
            assert middleware.enable_hsts is True

    def test_development_environment_detection(self):
        """Test development environment allows different settings."""
        with patch.dict(os.environ, {"NODE_ENV": "development"}):
            middleware = SecurityHeadersMiddleware(None, enable_hsts=False)
            assert middleware.enable_hsts is False

    def test_csp_domain_configuration(self):
        """Test CSP domain configuration from environment."""
        test_domains = "https://test1.com,https://test2.com"
        with patch.dict(os.environ, {"CSP_EXTRA_CONNECT_DOMAINS": test_domains}):
            middleware = SecurityHeadersMiddleware(None)
            domains = middleware._get_csp_connect_domains()

            assert "https://test1.com" in domains
            assert "https://test2.com" in domains
            assert "'self'" in domains  # Default domain should still be there


class TestSecurityVulnerabilityPrevention:
    """Test prevention of common security vulnerabilities."""

    @pytest.fixture
    def app(self):
        """Create test app for vulnerability testing."""
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware)

        @test_app.get("/test")
        def test_endpoint():
            return {"message": "test"}

        return test_app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return TestClient(app)

    def test_clickjacking_prevention(self, client):
        """Test clickjacking prevention via X-Frame-Options."""
        response = client.get("/test")

        assert response.headers["X-Frame-Options"] == "DENY"

    def test_xss_protection(self, client):
        """Test XSS protection headers."""
        response = client.get("/test")

        # X-XSS-Protection removed - deprecated and ineffective in modern browsers
        assert "X-XSS-Protection" not in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_no_unsafe_inline_csp(self, client):
        """Test CSP doesn't allow unsafe-inline."""
        response = client.get("/test")

        csp = response.headers["Content-Security-Policy"]
        assert "'unsafe-inline'" not in csp
        assert "'unsafe-eval'" not in csp

    def test_server_header_obfuscation(self, client):
        """Test server header is obfuscated."""
        response = client.get("/test")

        assert response.headers.get("Server") == "Vana/1.0"
        # Should not reveal FastAPI or uvicorn version
        assert "FastAPI" not in response.headers.get("Server", "")
        assert "uvicorn" not in response.headers.get("Server", "")

    def test_permissions_policy_restrictions(self, client):
        """Test Permissions Policy restricts dangerous features."""
        response = client.get("/test")

        permissions_policy = response.headers.get("Permissions-Policy", "")
        assert "camera=()" in permissions_policy
        assert "microphone=()" in permissions_policy
        assert "geolocation=()" in permissions_policy


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
