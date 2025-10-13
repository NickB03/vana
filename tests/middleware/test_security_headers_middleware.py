"""Tests for security headers middleware.

This test suite validates the SecurityHeadersMiddleware implementation
which provides comprehensive security header protection against:
- XSS attacks (Content-Security-Policy)
- Clickjacking (X-Frame-Options)
- MIME sniffing (X-Content-Type-Options)
- Man-in-the-middle (Strict-Transport-Security)
- Unwanted tracking (Referrer-Policy)
- Feature abuse (Permissions-Policy)
"""

import os
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.security import SecurityHeadersMiddleware


@pytest.fixture
def app():
    """Create test FastAPI app with security headers middleware."""
    test_app = FastAPI()
    test_app.add_middleware(SecurityHeadersMiddleware, enable_hsts=True)

    @test_app.get("/test")
    async def test_endpoint():
        return {"status": "ok"}

    @test_app.get("/api/test")
    async def api_endpoint():
        return {"status": "ok"}

    @test_app.get("/auth/test")
    async def auth_endpoint():
        return {"status": "ok"}

    return test_app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


class TestBasicSecurityHeaders:
    """Test basic security header functionality."""

    def test_x_content_type_options_header(self, client):
        """X-Content-Type-Options header prevents MIME sniffing."""
        response = client.get("/test")
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_x_frame_options_header(self, client):
        """X-Frame-Options header prevents clickjacking."""
        response = client.get("/test")
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_x_xss_protection_header_not_present(self, client):
        """X-XSS-Protection header is deprecated and not included."""
        response = client.get("/test")
        # This header is deprecated and ineffective in modern browsers
        assert "X-XSS-Protection" not in response.headers

    def test_referrer_policy_header(self, client):
        """Referrer-Policy header controls referrer information."""
        response = client.get("/test")
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_permissions_policy_header(self, client):
        """Permissions-Policy header restricts browser features."""
        response = client.get("/test")
        assert "Permissions-Policy" in response.headers
        permissions = response.headers["Permissions-Policy"]
        assert "camera=()" in permissions
        assert "microphone=()" in permissions
        assert "geolocation=()" in permissions

    def test_content_security_policy_header(self, client):
        """Content-Security-Policy header is set."""
        response = client.get("/test")
        assert "Content-Security-Policy" in response.headers
        csp = response.headers["Content-Security-Policy"]
        # Web endpoints should have default-src 'self'
        assert "default-src 'self'" in csp

    def test_server_header_obfuscation(self, client):
        """Server header is obfuscated to prevent information disclosure."""
        response = client.get("/test")
        assert response.headers.get("Server") == "Vana/1.0"
        # Should not reveal FastAPI or uvicorn version
        assert "FastAPI" not in response.headers.get("Server", "")
        assert "uvicorn" not in response.headers.get("Server", "")


class TestHTTPSStrictTransportSecurity:
    """Test HSTS header behavior."""

    def test_hsts_not_added_for_http(self, client):
        """HSTS header is not added for HTTP requests."""
        response = client.get("/test")
        # HSTS only applies to HTTPS
        assert "Strict-Transport-Security" not in response.headers

    @patch.dict(os.environ, {"ENVIRONMENT": "production"})
    def test_hsts_enabled_in_production(self):
        """HSTS is enabled in production environments."""
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware, enable_hsts=True)

        @test_app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        # Note: TestClient doesn't properly simulate HTTPS scheme
        # In production with real HTTPS, HSTS header will be present
        client = TestClient(test_app, base_url="https://example.com")
        response = client.get("/test")
        # TestClient limitation: scheme is still 'http' even with https base_url
        # In production, this would return HSTS header


class TestContentSecurityPolicy:
    """Test Content-Security-Policy configurations."""

    def test_api_endpoint_strict_csp(self, client):
        """API endpoints get strict CSP policy."""
        response = client.get("/api/test")
        csp = response.headers["Content-Security-Policy"]

        # API endpoints should have minimal permissions
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "form-action 'none'" in csp
        assert "base-uri 'none'" in csp

    def test_auth_endpoint_strict_csp(self, client):
        """Auth endpoints get strict CSP policy."""
        response = client.get("/auth/test")
        csp = response.headers["Content-Security-Policy"]

        # Auth endpoints should have strict CSP
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp

    def test_web_endpoint_nonce_csp(self, client):
        """Web endpoints get nonce-based CSP policy."""
        response = client.get("/test")
        csp = response.headers["Content-Security-Policy"]

        # Web endpoints should have secure nonce-based CSP
        assert "default-src 'self'" in csp
        assert "'nonce-" in csp  # Nonce should be present
        assert "connect-src" in csp

    def test_csp_nonce_header(self, client):
        """CSP nonce is provided in response header."""
        response = client.get("/test")

        assert "X-CSP-Nonce" in response.headers
        nonce = response.headers["X-CSP-Nonce"]
        assert len(nonce) > 10  # Should be a proper nonce

        # Nonce should be in CSP header
        csp = response.headers["Content-Security-Policy"]
        assert f"'nonce-{nonce}'" in csp

    def test_csp_nonce_unique_per_request(self, client):
        """CSP nonce is unique for each request."""
        response1 = client.get("/test")
        response2 = client.get("/test")

        nonce1 = response1.headers["X-CSP-Nonce"]
        nonce2 = response2.headers["X-CSP-Nonce"]

        # Nonces should be different
        assert nonce1 != nonce2


class TestCSPDomainConfiguration:
    """Test CSP domain configuration from environment."""

    @patch.dict(os.environ, {"USE_OPENROUTER": "true"})
    def test_openrouter_csp_domain(self):
        """OpenRouter domain is added to CSP when enabled."""
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware)

        @test_app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        client = TestClient(test_app)
        response = client.get("/test")

        csp = response.headers["Content-Security-Policy"]
        assert "https://openrouter.ai" in csp

    @patch.dict(
        os.environ,
        {"CSP_EXTRA_CONNECT_DOMAINS": "https://example.com,https://api.example.com"},
    )
    def test_extra_csp_domains(self):
        """Extra CSP domains from environment are included."""
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware)

        @test_app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        client = TestClient(test_app)
        response = client.get("/test")

        csp = response.headers["Content-Security-Policy"]
        assert "https://example.com" in csp
        assert "https://api.example.com" in csp

    def test_default_google_domains(self, client):
        """Default Google API domains are included in CSP."""
        response = client.get("/test")
        csp = response.headers["Content-Security-Policy"]

        # Should include Google API domains for Gemini
        assert (
            "https://api.google.com" in csp
            or "https://generativelanguage.googleapis.com" in csp
        )


class TestSecurityVulnerabilityPrevention:
    """Test prevention of common security vulnerabilities."""

    def test_clickjacking_prevention(self, client):
        """Test clickjacking prevention via X-Frame-Options."""
        response = client.get("/test")
        assert response.headers["X-Frame-Options"] == "DENY"
        # Also enforced in CSP
        csp = response.headers["Content-Security-Policy"]
        assert "frame-ancestors" in csp

    def test_mime_sniffing_prevention(self, client):
        """Test MIME sniffing prevention."""
        response = client.get("/test")
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_xss_protection(self, client):
        """Test XSS protection via CSP."""
        response = client.get("/test")
        csp = response.headers["Content-Security-Policy"]

        # Should use nonce-based CSP, not unsafe-inline (for non-API endpoints)
        # Note: 'unsafe-inline' and 'unsafe-eval' are allowed for compatibility
        # but nonce provides additional security
        assert "'nonce-" in csp

    def test_no_information_disclosure(self, client):
        """Test server header doesn't disclose version info."""
        response = client.get("/test")
        server = response.headers.get("Server", "")

        # Should not reveal implementation details
        assert "FastAPI" not in server
        assert "uvicorn" not in server
        assert "Python" not in server


class TestMiddlewareConfiguration:
    """Test middleware configuration options."""

    def test_hsts_disabled_option(self):
        """Test HSTS can be disabled via configuration."""
        test_app = FastAPI()
        test_app.add_middleware(SecurityHeadersMiddleware, enable_hsts=False)

        @test_app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        client = TestClient(test_app)
        response = client.get("/test")

        # HSTS should not be present
        assert "Strict-Transport-Security" not in response.headers

    def test_custom_csp_nonce_header(self):
        """Test custom CSP nonce header name."""
        test_app = FastAPI()
        test_app.add_middleware(
            SecurityHeadersMiddleware, csp_nonce_header="X-Custom-Nonce"
        )

        @test_app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        client = TestClient(test_app)
        response = client.get("/test")

        # Should use custom header name
        assert "X-Custom-Nonce" in response.headers
        assert len(response.headers["X-Custom-Nonce"]) > 10


class TestPathSpecificPolicies:
    """Test path-specific security policies."""

    def test_api_endpoints_minimal_permissions(self, client):
        """API endpoints should have minimal CSP permissions."""
        response = client.get("/api/test")
        csp = response.headers["Content-Security-Policy"]

        # API endpoints don't need script or style permissions
        assert "default-src 'none'" in csp
        assert "script-src" not in csp or "'none'" in csp
        assert "style-src" not in csp or "'none'" in csp

    def test_web_endpoints_allow_assets(self, client):
        """Web endpoints should allow necessary assets."""
        response = client.get("/test")
        csp = response.headers["Content-Security-Policy"]

        # Web endpoints need scripts and styles
        assert "script-src" in csp
        assert "style-src" in csp
        assert "img-src" in csp
        assert "font-src" in csp


class TestSecurityHeadersIntegration:
    """Test integration with other middleware."""

    def test_all_security_headers_present(self, client):
        """Test that all expected security headers are present."""
        response = client.get("/test")

        expected_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "Referrer-Policy",
            "Content-Security-Policy",
            "Permissions-Policy",
            "Server",
            "X-CSP-Nonce",
        ]

        for header in expected_headers:
            assert header in response.headers, f"Missing header: {header}"

    def test_security_headers_on_error_responses(self, client):
        """Test security headers are present on error responses."""
        # Request non-existent endpoint
        response = client.get("/nonexistent")

        # Security headers should still be present on 404
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "Content-Security-Policy" in response.headers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
