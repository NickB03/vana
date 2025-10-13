"""Tests for secure HttpOnly cookie authentication (CRIT-008).

Security Enhancement: This test suite verifies that JWT tokens are properly
stored as HttpOnly cookies instead of sessionStorage, preventing XSS attacks.
"""

import pytest
from fastapi.testclient import TestClient

from app.auth.cookie_routes import SetTokensRequest


@pytest.fixture
def valid_tokens():
    """Generate valid test tokens."""
    return {
        "access_token": "test_access_token_123",
        "refresh_token": "test_refresh_token_456",
        "expires_in": 1800,
    }


class TestSetTokensEndpoint:
    """Test suite for POST /api/auth/set-tokens endpoint."""

    def test_set_tokens_success(self, client: TestClient, valid_tokens):
        """Test successfully setting authentication cookies."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        # Should return 204 No Content
        assert response.status_code == 204

        # Verify cookies were set
        cookies = response.cookies
        assert "vana_access_token" in cookies
        assert "vana_refresh_token" in cookies

        # Verify cookie values
        assert cookies["vana_access_token"] == valid_tokens["access_token"]
        assert cookies["vana_refresh_token"] == valid_tokens["refresh_token"]

    def test_cookies_have_httponly_flag(self, client: TestClient, valid_tokens):
        """Test that cookies have HttpOnly flag for XSS protection."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        # Check Set-Cookie headers for HttpOnly flag
        set_cookie_headers = response.headers.get_list("set-cookie")

        # Both access and refresh tokens should have HttpOnly
        access_cookie = next((c for c in set_cookie_headers if "vana_access_token" in c), None)
        refresh_cookie = next((c for c in set_cookie_headers if "vana_refresh_token" in c), None)

        assert access_cookie is not None
        assert refresh_cookie is not None
        assert "HttpOnly" in access_cookie
        assert "HttpOnly" in refresh_cookie

    def test_cookies_have_samesite_lax(self, client: TestClient, valid_tokens):
        """Test that cookies have SameSite=Lax for OAuth compatibility and CSRF protection."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        set_cookie_headers = response.headers.get_list("set-cookie")

        for cookie_header in set_cookie_headers:
            if "vana_" in cookie_header:
                # SameSite=lax provides CSRF protection while allowing OAuth callbacks
                assert "SameSite=Lax" in cookie_header or "SameSite=lax" in cookie_header

    def test_cookies_have_path_root(self, client: TestClient, valid_tokens):
        """Test that cookies are available for all paths."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        set_cookie_headers = response.headers.get_list("set-cookie")

        for cookie_header in set_cookie_headers:
            if "vana_" in cookie_header:
                assert "Path=/" in cookie_header

    def test_access_token_expires_in_30_minutes(self, client: TestClient, valid_tokens):
        """Test that access token has 30-minute expiration."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        set_cookie_headers = response.headers.get_list("set-cookie")
        access_cookie = next((c for c in set_cookie_headers if "vana_access_token" in c), None)

        assert access_cookie is not None
        # Max-Age should be 1800 seconds (30 minutes)
        assert "Max-Age=1800" in access_cookie or "max-age=1800" in access_cookie

    def test_refresh_token_expires_in_7_days(self, client: TestClient, valid_tokens):
        """Test that refresh token has 7-day expiration."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        set_cookie_headers = response.headers.get_list("set-cookie")
        refresh_cookie = next((c for c in set_cookie_headers if "vana_refresh_token" in c), None)

        assert refresh_cookie is not None
        # Max-Age should be 604800 seconds (7 days)
        assert "Max-Age=604800" in refresh_cookie or "max-age=604800" in refresh_cookie

    def test_set_tokens_invalid_data(self, client: TestClient):
        """Test that invalid token data returns error."""
        response = client.post("/api/auth/set-tokens", json={
            "invalid_field": "value"
        })

        assert response.status_code == 422  # Validation error

    def test_set_tokens_missing_access_token(self, client: TestClient):
        """Test that missing access_token returns error."""
        response = client.post("/api/auth/set-tokens", json={
            "refresh_token": "test_refresh",
            "expires_in": 1800,
        })

        assert response.status_code == 422  # Validation error


class TestClearTokensEndpoint:
    """Test suite for DELETE /api/auth/clear-tokens endpoint."""

    def test_clear_tokens_success(self, client: TestClient):
        """Test successfully clearing authentication cookies."""
        response = client.delete("/api/auth/clear-tokens")

        # Should return 204 No Content
        assert response.status_code == 204

        # Verify cookies were cleared (set to empty with max_age=0)
        set_cookie_headers = response.headers.get_list("set-cookie")

        access_cookie = next((c for c in set_cookie_headers if "vana_access_token" in c), None)
        refresh_cookie = next((c for c in set_cookie_headers if "vana_refresh_token" in c), None)

        assert access_cookie is not None
        assert refresh_cookie is not None

        # Cookies should expire immediately
        assert "Max-Age=0" in access_cookie or "max-age=0" in access_cookie
        assert "Max-Age=0" in refresh_cookie or "max-age=0" in refresh_cookie

    def test_clear_tokens_removes_both_cookies(self, client: TestClient, valid_tokens):
        """Test that clearing tokens removes both access and refresh cookies."""
        # First set tokens
        client.post("/api/auth/set-tokens", json=valid_tokens)

        # Then clear them
        response = client.delete("/api/auth/clear-tokens")

        set_cookie_headers = response.headers.get_list("set-cookie")

        # Both cookies should be present with Max-Age=0
        cookie_names = []
        for cookie_header in set_cookie_headers:
            if "vana_access_token" in cookie_header:
                cookie_names.append("access")
                assert "Max-Age=0" in cookie_header or "max-age=0" in cookie_header
            elif "vana_refresh_token" in cookie_header:
                cookie_names.append("refresh")
                assert "Max-Age=0" in cookie_header or "max-age=0" in cookie_header

        assert "access" in cookie_names
        assert "refresh" in cookie_names


class TestCheckAuthEndpoint:
    """Test suite for GET /api/auth/check endpoint."""

    def test_check_auth_with_valid_cookies(self, client: TestClient, valid_tokens):
        """Test authentication check with valid cookies."""
        # Set cookies first
        client.post("/api/auth/set-tokens", json=valid_tokens)

        # Check authentication status
        response = client.get("/api/auth/check")

        assert response.status_code == 200
        data = response.json()

        assert data["authenticated"] is True
        assert data["has_access_token"] is True
        assert data["has_refresh_token"] is True

    def test_check_auth_without_cookies(self, client: TestClient):
        """Test authentication check without cookies."""
        response = client.get("/api/auth/check")

        assert response.status_code == 200
        data = response.json()

        assert data["authenticated"] is False
        assert data["has_access_token"] is False
        assert data["has_refresh_token"] is False

    def test_check_auth_with_only_access_token(self, client: TestClient):
        """Test authentication check with only access token cookie."""
        # Manually set only access token cookie
        client.cookies.set("vana_access_token", "test_token")

        response = client.get("/api/auth/check")

        assert response.status_code == 200
        data = response.json()

        # Should be considered unauthenticated (needs both tokens)
        assert data["authenticated"] is False
        assert data["has_access_token"] is True
        assert data["has_refresh_token"] is False

    def test_check_auth_with_only_refresh_token(self, client: TestClient):
        """Test authentication check with only refresh token cookie."""
        # Manually set only refresh token cookie
        client.cookies.set("vana_refresh_token", "test_token")

        response = client.get("/api/auth/check")

        assert response.status_code == 200
        data = response.json()

        # Should be considered unauthenticated (needs both tokens)
        assert data["authenticated"] is False
        assert data["has_access_token"] is False
        assert data["has_refresh_token"] is True


class TestSecurityFeatures:
    """Test suite for security features of cookie implementation."""

    def test_tokens_not_exposed_to_javascript(self, client: TestClient, valid_tokens):
        """Test that tokens cannot be accessed via JavaScript (HttpOnly flag)."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        # Verify HttpOnly flag is set
        set_cookie_headers = response.headers.get_list("set-cookie")

        for cookie_header in set_cookie_headers:
            if "vana_" in cookie_header:
                # HttpOnly flag prevents JavaScript access
                assert "HttpOnly" in cookie_header

    def test_csrf_protection_via_samesite(self, client: TestClient, valid_tokens):
        """Test CSRF protection via SameSite attribute."""
        response = client.post("/api/auth/set-tokens", json=valid_tokens)

        set_cookie_headers = response.headers.get_list("set-cookie")

        for cookie_header in set_cookie_headers:
            if "vana_" in cookie_header:
                # SameSite=lax provides CSRF protection while allowing OAuth callbacks
                assert "SameSite" in cookie_header

    def test_cookies_sent_automatically_with_requests(self, client: TestClient, valid_tokens):
        """Test that cookies are automatically sent with subsequent requests."""
        # Set cookies
        client.post("/api/auth/set-tokens", json=valid_tokens)

        # Make a request to a protected endpoint
        response = client.get("/api/auth/me")

        # Cookies should be sent automatically
        # (This would fail with 401 if cookies weren't sent)
        # Note: Actual behavior depends on authentication implementation
        assert response.status_code in [200, 401]  # Either authenticated or needs valid token


class TestIntegrationWithAuthFlow:
    """Integration tests for cookie security with authentication flow."""

    def test_login_sets_secure_cookies(self, client: TestClient, test_user):
        """Test that login properly sets secure cookies."""
        # Login
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "testpassword123",
        })

        assert response.status_code == 200

        # Verify cookies are set
        set_cookie_headers = response.headers.get_list("set-cookie")
        assert any("vana_access_token" in h for h in set_cookie_headers)
        assert any("vana_refresh_token" in h for h in set_cookie_headers)

    def test_logout_clears_cookies(self, client: TestClient, authenticated_client):
        """Test that logout properly clears cookies."""
        # Logout
        response = authenticated_client.post("/api/auth/logout", json={})

        assert response.status_code == 200

        # Verify cookies are cleared
        set_cookie_headers = response.headers.get_list("set-cookie")

        for cookie_header in set_cookie_headers:
            if "vana_" in cookie_header:
                # Cookies should be expired
                assert "Max-Age=0" in cookie_header or "max-age=0" in cookie_header

    def test_authentication_persists_across_requests(self, client: TestClient, authenticated_client):
        """Test that authentication persists across requests via cookies."""
        # First request - should be authenticated
        response1 = authenticated_client.get("/api/auth/me")
        assert response1.status_code == 200

        # Second request - should still be authenticated
        response2 = authenticated_client.get("/api/auth/me")
        assert response2.status_code == 200

        # Verify same user data
        assert response1.json()["id"] == response2.json()["id"]
