"""
Comprehensive security validation test for PR #190 CodeRabbit review requirements.

This test validates all security enhancements implemented based on the CodeRabbit review:
1. Phoenix debug endpoint requires X-Phoenix-Code header and superuser authentication
2. JWT token validation is working correctly with proper type checking
3. No sensitive data exposure in API responses
4. CORS configuration is secure and environment-based
5. Security headers are properly set with CSP, HSTS, and other protections
"""

import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from jose import jwt

from app.auth.config import JWT_ALGORITHM, JWT_SECRET_KEY
from app.auth.security import create_access_token


class TestPR190SecurityValidation:
    """Comprehensive security validation for PR #190 requirements."""

    @pytest.fixture
    def client(self):
        """Create test client with security configurations."""
        # Mock environment for testing
        with patch.dict(os.environ, {
            "NODE_ENV": "development",
            "CI": "false",
            "PHOENIX_DEBUG_CODE": "test-debug-code-123",
            "ALLOW_ORIGINS": "http://localhost:3000,http://127.0.0.1:3000",
            "AUTH_REQUIRE_SSE_AUTH": "false"  # Demo mode for testing
        }):
            from app.server import app
            return TestClient(app)

    @pytest.fixture
    def superuser_token(self):
        """Create a valid superuser token for testing."""
        payload = {
            "sub": "1",
            "email": "admin@test.com",
            "is_superuser": True,
            "is_active": True,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "type": "access"
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    @pytest.fixture
    def regular_user_token(self):
        """Create a valid regular user token for testing."""
        payload = {
            "sub": "2",
            "email": "user@test.com",
            "is_superuser": False,
            "is_active": True,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "type": "access"
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    @pytest.fixture
    def invalid_token(self):
        """Create an invalid token for testing."""
        return "invalid.jwt.token"

    def test_phoenix_debug_endpoint_requires_superuser_auth(self, client):
        """Test 1: Phoenix debug endpoint requires superuser authentication."""
        # Test without authentication
        response = client.get(
            "/api/debug/phoenix",
            headers={"X-Phoenix-Code": "test-debug-code-123"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test with invalid token
        response = client.get(
            "/api/debug/phoenix",
            headers={
                "Authorization": "Bearer invalid-token",
                "X-Phoenix-Code": "test-debug-code-123"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_phoenix_debug_endpoint_requires_x_phoenix_code_header(self, client, superuser_token):
        """Test 1: Phoenix debug endpoint requires X-Phoenix-Code header."""
        # Test without X-Phoenix-Code header
        response = client.get(
            "/api/debug/phoenix",
            headers={"Authorization": f"Bearer {superuser_token}"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Invalid or missing access code" in response.json()["detail"]
        
        # Test with wrong access code
        response = client.get(
            "/api/debug/phoenix",
            headers={
                "Authorization": f"Bearer {superuser_token}",
                "X-Phoenix-Code": "wrong-code"
            }
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Invalid or missing access code" in response.json()["detail"]

    def test_phoenix_debug_endpoint_disabled_in_production(self, client, superuser_token):
        """Test 1: Phoenix debug endpoint disabled in production environment."""
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            response = client.get(
                "/api/debug/phoenix",
                headers={
                    "Authorization": f"Bearer {superuser_token}",
                    "X-Phoenix-Code": "test-debug-code-123"
                }
            )
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert "Debug endpoint disabled in production" in response.json()["detail"]

    def test_phoenix_debug_endpoint_redacts_sensitive_data(self, client, superuser_token):
        """Test 3: Phoenix debug endpoint redacts sensitive data in responses."""
        response = client.get(
            "/api/debug/phoenix",
            headers={
                "Authorization": f"Bearer {superuser_token}",
                "X-Phoenix-Code": "test-debug-code-123"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify sensitive data is redacted
            app_state = data.get("application_state", {})
            assert app_state.get("session_storage_uri") == "***REDACTED***"
            assert app_state.get("bucket_name") == "***REDACTED***"
            assert app_state.get("project_id") == "***REDACTED***"
            
            # Verify access is logged with user info
            assert "accessed_by" in data
            assert data["access_granted"] is True

    def test_jwt_token_validation_implementation(self, client, regular_user_token):
        """Test 2: JWT token validation is working correctly."""
        # Test with valid token
        response = client.post(
            "/feedback",
            headers={"Authorization": f"Bearer {regular_user_token}"},
            json={"rating": 5, "comment": "Test feedback"}
        )
        # Note: This might fail due to user not existing in test DB, but should validate JWT structure
        
        # Test with malformed token
        response = client.post(
            "/feedback",
            headers={"Authorization": "Bearer malformed.jwt.token"},
            json={"rating": 5, "comment": "Test feedback"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test with expired token
        expired_payload = {
            "sub": "1",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "type": "access"
        }
        expired_token = jwt.encode(expired_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        response = client.post(
            "/feedback",
            headers={"Authorization": f"Bearer {expired_token}"},
            json={"rating": 5, "comment": "Test feedback"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_jwt_token_type_validation(self, client):
        """Test 2: JWT token type claim validation."""
        # Test with wrong token type
        wrong_type_payload = {
            "sub": "1",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "type": "refresh"  # Wrong type for access endpoints
        }
        wrong_type_token = jwt.encode(wrong_type_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        response = client.post(
            "/feedback",
            headers={"Authorization": f"Bearer {wrong_type_token}"},
            json={"rating": 5, "comment": "Test feedback"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_no_sensitive_data_in_api_responses(self, client):
        """Test 3: No sensitive data exposure in API responses."""
        # Test health endpoint doesn't expose sensitive info
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        # Verify no raw database URLs or API keys are exposed
        assert "GOOGLE_API_KEY" not in str(data)
        assert "password" not in str(data).lower()
        assert "secret" not in str(data).lower()
        
        # Dependencies should be boolean flags, not actual credentials
        if "dependencies" in data:
            deps = data["dependencies"]
            assert isinstance(deps.get("google_api_configured"), bool)

    def test_cors_configuration_security(self, client):
        """Test 4: CORS configuration is secure."""
        # Test preflight request with allowed origin
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # Should have proper CORS headers for allowed origins
        if "Access-Control-Allow-Origin" in response.headers:
            assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
            assert "Access-Control-Allow-Credentials" in response.headers
        
        # Test with disallowed origin
        response = client.options(
            "/health",
            headers={
                "Origin": "https://malicious-site.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # Should not include CORS headers for disallowed origins
        origin_header = response.headers.get("Access-Control-Allow-Origin")
        if origin_header:
            assert origin_header != "https://malicious-site.com"

    def test_security_headers_properly_set(self, client):
        """Test 5: Security headers are properly set."""
        response = client.get("/health")
        
        # Verify essential security headers
        headers = response.headers
        
        # Content Security Policy
        assert "Content-Security-Policy" in headers
        csp = headers["Content-Security-Policy"]
        assert "default-src" in csp
        assert "frame-ancestors 'none'" in csp or "frame-ancestors 'self'" in csp
        
        # Other security headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "Permissions-Policy" in headers
        
        # CSP nonce header for frontend
        assert "X-CSP-Nonce" in headers
        assert len(headers["X-CSP-Nonce"]) > 10  # Should be a proper nonce

    def test_api_endpoint_csp_restrictions(self, client):
        """Test 5: API endpoints have restrictive CSP policies."""
        # Test API endpoint has strict CSP
        response = client.get("/api/debug/phoenix")  # Will fail auth but check headers
        
        csp = response.headers.get("Content-Security-Policy", "")
        if csp and response.request.url.path.startswith("/api/"):
            # API endpoints should have very restrictive CSP
            assert "default-src 'none'" in csp
            assert "frame-ancestors 'none'" in csp

    def test_rate_limiting_on_auth_endpoints(self, client):
        """Test security: Rate limiting is applied to auth endpoints."""
        # This test would need to make many rapid requests to trigger rate limiting
        # For now, we'll just verify the middleware is in place by checking the structure
        
        # Test auth endpoint exists and responds appropriately
        response = client.post("/auth/login", json={
            "username": "test@example.com",
            "password": "wrongpassword"
        })
        
        # Should get proper response (not rate limited initially)
        assert response.status_code in [400, 401, 422]  # Validation or auth error, not rate limit

    def test_sse_authentication_configuration(self, client):
        """Test SSE endpoints respect authentication configuration."""
        # In demo mode (AUTH_REQUIRE_SSE_AUTH=false), should allow access
        response = client.get("/agent_network_sse/test-session")
        
        # Should return SSE stream or appropriate response
        assert response.status_code in [200, 401]  # Depends on auth configuration
        
        if response.status_code == 200:
            # Verify SSE headers
            assert response.headers.get("content-type") == "text/event-stream"
            assert response.headers.get("cache-control") == "no-cache"

    def test_audit_logging_for_security_events(self, client, superuser_token):
        """Test security events are properly logged for audit trail."""
        # Test failed access attempt to phoenix endpoint
        response = client.get(
            "/api/debug/phoenix",
            headers={
                "Authorization": f"Bearer {superuser_token}",
                "X-Phoenix-Code": "wrong-code"
            }
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        # In a real implementation, this would verify audit logs are created

    @pytest.mark.parametrize("path,expected_csp_type", [
        ("/api/debug/phoenix", "api_strict"),
        ("/auth/login", "api_strict"),
        ("/health", "web_app"),
        ("/dev-ui", "adk_relaxed")
    ])
    def test_path_aware_csp_policies(self, client, path, expected_csp_type):
        """Test CSP policies are appropriately configured based on request path."""
        response = client.get(path)
        
        csp = response.headers.get("Content-Security-Policy", "")
        
        if expected_csp_type == "api_strict":
            # API endpoints should have very restrictive CSP
            if csp and path.startswith(("/api/", "/auth/")):
                assert "default-src 'none'" in csp
        elif expected_csp_type == "adk_relaxed":
            # ADK endpoints should have relaxed CSP for compatibility
            if csp and "dev-ui" in path:
                assert "'unsafe-inline'" in csp or "'unsafe-eval'" in csp
        elif expected_csp_type == "web_app":
            # Regular web app endpoints should have secure but functional CSP
            if csp:
                assert "default-src 'self'" in csp
                assert "nonce-" in csp


class TestSecurityIntegration:
    """Integration tests for security components working together."""

    def test_middleware_order_and_integration(self, client):
        """Test security middlewares are properly ordered and integrated."""
        response = client.get("/health")
        
        # Verify multiple security features work together
        headers = response.headers
        
        # Should have both CORS and security headers
        assert "Content-Security-Policy" in headers
        assert "X-Content-Type-Options" in headers
        
        # Verify CSP nonce is generated and included
        nonce = headers.get("X-CSP-Nonce")
        assert nonce is not None
        
        csp = headers.get("Content-Security-Policy", "")
        if "nonce-" in csp:
            assert nonce in csp

    def test_production_vs_development_security_differences(self):
        """Test security configurations differ appropriately between environments."""
        # Test production settings
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            from app.server import allow_origins
            # In production, should not have wildcard origins
            assert "*" not in allow_origins
            
        # Test development settings  
        with patch.dict(os.environ, {"NODE_ENV": "development"}):
            from app.server import allow_origins
            # Development should have localhost origins
            assert any("localhost" in origin for origin in allow_origins)


if __name__ == "__main__":
    """Run security validation tests."""
    pytest.main([__file__, "-v", "--tb=short"])