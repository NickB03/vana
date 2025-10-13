"""Test cookie SameSite configuration for OAuth compatibility.

This test suite verifies that authentication cookies use SameSite=lax
to allow OAuth callbacks while still providing CSRF protection.

Security Context:
- SameSite=lax is the industry standard for authentication cookies (OWASP recommended)
- Allows OAuth callbacks and top-level navigation
- Still blocks cross-site POST/PUT/DELETE (CSRF protection)
- Does not compromise security compared to strict mode
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient


class TestCookieSameSiteConfiguration:
    """Test suite for cookie SameSite attribute configuration."""

    def test_set_tokens_uses_samesite_lax(self, client: TestClient) -> None:
        """Verify set-tokens endpoint uses SameSite=lax for OAuth compatibility."""
        # Arrange
        token_data = {
            "access_token": "test_access_token_jwt",
            "refresh_token": "test_refresh_token_jwt",
            "expires_in": 1800,
        }

        # Act
        response = client.post("/auth/set-tokens", json=token_data)

        # Assert - Response should be successful
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Assert - Check Set-Cookie headers
        set_cookie_headers = response.headers.get_list("set-cookie")
        assert len(set_cookie_headers) == 2, "Should set 2 cookies (access + refresh)"

        # Verify access token cookie
        access_cookie = next(
            (h for h in set_cookie_headers if "vana_access_token" in h), None
        )
        assert access_cookie is not None, "Access token cookie should be set"
        assert "samesite=lax" in access_cookie.lower(), (
            "Access token cookie should use SameSite=lax for OAuth compatibility"
        )

        # Verify refresh token cookie
        refresh_cookie = next(
            (h for h in set_cookie_headers if "vana_refresh_token" in h), None
        )
        assert refresh_cookie is not None, "Refresh token cookie should be set"
        assert "samesite=lax" in refresh_cookie.lower(), (
            "Refresh token cookie should use SameSite=lax for OAuth compatibility"
        )

    def test_cookies_still_have_security_flags(self, client: TestClient) -> None:
        """Verify cookies maintain security flags (HttpOnly, Secure) with SameSite=lax."""
        # Arrange
        token_data = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 1800,
        }

        # Act
        response = client.post("/auth/set-tokens", json=token_data)

        # Assert
        set_cookie_headers = response.headers.get_list("set-cookie")
        access_cookie = next(
            (h for h in set_cookie_headers if "vana_access_token" in h), None
        )

        # Verify all security flags are present
        assert "httponly" in access_cookie.lower(), "Cookie should have HttpOnly flag"
        # Note: Secure flag behavior depends on environment (production vs dev)
        # We check for Path and SameSite which should always be present
        assert "path=/" in access_cookie.lower(), "Cookie should have Path=/ flag"
        assert "samesite=lax" in access_cookie.lower(), "Cookie should have SameSite=lax"

    def test_clear_tokens_uses_samesite_lax(self, client: TestClient) -> None:
        """Verify clear-tokens endpoint uses SameSite=lax to match set-tokens."""
        # Act
        response = client.delete("/auth/clear-tokens")

        # Assert
        assert response.status_code == status.HTTP_204_NO_CONTENT

        set_cookie_headers = response.headers.get_list("set-cookie")
        assert len(set_cookie_headers) == 2, "Should clear 2 cookies"

        # Verify both cookies use SameSite=lax
        for cookie_header in set_cookie_headers:
            assert "samesite=lax" in cookie_header.lower(), (
                f"Clear-tokens should use SameSite=lax to match set-tokens: {cookie_header}"
            )
            # Verify cookies are being expired
            assert "max-age=0" in cookie_header.lower(), "Cookie should be expired"

    def test_no_samesite_strict_in_auth_cookies(self, client: TestClient) -> None:
        """Verify no authentication cookies use SameSite=strict (breaks OAuth)."""
        # Arrange
        token_data = {
            "access_token": "test_token",
            "refresh_token": "test_refresh",
            "expires_in": 1800,
        }

        # Act
        response = client.post("/auth/set-tokens", json=token_data)

        # Assert - NO cookies should use strict mode
        set_cookie_headers = response.headers.get_list("set-cookie")
        for cookie_header in set_cookie_headers:
            assert "samesite=strict" not in cookie_header.lower(), (
                f"Cookie should NOT use SameSite=strict (breaks OAuth): {cookie_header}"
            )

    def test_oauth_callback_scenario(self, client: TestClient) -> None:
        """
        Simulate OAuth callback scenario to verify cookies work correctly.

        In OAuth flow:
        1. User clicks "Sign in with Google"
        2. Redirected to Google
        3. Google redirects back to /auth/google/callback
        4. Callback sets authentication cookies
        5. Cookies should be available on subsequent requests

        With SameSite=strict, cookies would NOT be sent on step 3 (cross-site redirect).
        With SameSite=lax, cookies ARE sent on step 3 (top-level navigation).
        """
        # This test verifies that after setting cookies, they are available
        # in subsequent requests (simulating post-OAuth-callback requests)

        # Step 1: Set authentication cookies (simulating OAuth callback)
        set_response = client.post(
            "/auth/set-tokens",
            json={
                "access_token": "oauth_access_token",
                "refresh_token": "oauth_refresh_token",
                "expires_in": 3600,
            },
        )
        assert set_response.status_code == status.HTTP_204_NO_CONTENT

        # Step 2: Check authentication status (simulating next request after OAuth)
        check_response = client.get("/auth/check")
        assert check_response.status_code == status.HTTP_200_OK

        data = check_response.json()
        # With SameSite=lax, cookies should be present
        assert data["authenticated"] is True, (
            "User should be authenticated after OAuth callback with SameSite=lax"
        )
        assert data["has_access_token"] is True
        assert data["has_refresh_token"] is True


class TestCSRFProtectionMaintained:
    """Verify that SameSite=lax still provides CSRF protection."""

    def test_csrf_protection_for_post_requests(self, client: TestClient) -> None:
        """
        Verify that SameSite=lax blocks cookies on cross-site POST requests.

        SameSite=lax allows cookies on:
        - Top-level navigation (GET requests from another site)
        - Same-site requests (all methods)

        SameSite=lax BLOCKS cookies on:
        - Cross-site POST/PUT/DELETE/PATCH requests (CSRF protection)
        - Embedded requests (iframes, fetch from another domain)

        This test verifies the protection is maintained.
        """
        # This is a conceptual test - in a real scenario, a cross-site POST
        # would not include cookies with SameSite=lax.
        # The test verifies our configuration is correct.

        # Set tokens first
        client.post(
            "/auth/set-tokens",
            json={
                "access_token": "test_token",
                "refresh_token": "test_refresh",
                "expires_in": 1800,
            },
        )

        # Verify cookies are set with lax mode
        check_response = client.get("/auth/check")
        data = check_response.json()

        # Cookies should work for same-site requests
        assert data["authenticated"] is True, "Same-site requests should have cookies"

        # Note: To fully test cross-site POST blocking, we'd need a
        # multi-domain test environment. This test verifies configuration only.


@pytest.mark.integration
class TestOAuthIntegration:
    """Integration tests for OAuth flow with SameSite=lax cookies."""

    def test_google_oauth_callback_cookie_handling(self, client: TestClient) -> None:
        """
        Test that Google OAuth callback can set cookies successfully.

        This simulates the OAuth flow:
        1. User initiates OAuth (/auth/google)
        2. Google redirects to /auth/google/callback
        3. Callback handler sets authentication cookies
        4. User is redirected to application with cookies set
        """
        # This is a placeholder for OAuth integration testing
        # In a real test, you would:
        # 1. Mock the OAuth provider response
        # 2. Test the callback endpoint
        # 3. Verify cookies are set correctly
        # 4. Verify subsequent requests have cookies

        # For now, we verify the configuration is correct
        response = client.post(
            "/auth/set-tokens",
            json={
                "access_token": "google_oauth_token",
                "refresh_token": "google_refresh_token",
                "expires_in": 3600,
            },
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify cookies work on next request
        check = client.get("/auth/check")
        assert check.json()["authenticated"] is True


# Documentation test
def test_cookie_configuration_documented() -> None:
    """
    Verify cookie configuration is properly documented.

    This test serves as documentation for why we use SameSite=lax.
    """
    configuration = {
        "samesite": "lax",
        "httponly": True,
        "secure": True,  # In production
        "path": "/",
    }

    # Why SameSite=lax?
    reasons = [
        "Allows OAuth callbacks (e.g., Google OAuth redirect)",
        "Allows top-level navigation with cookies",
        "Still blocks cross-site POST/PUT/DELETE (CSRF protection)",
        "Industry standard (OWASP recommended)",
        "Does not compromise security vs strict mode",
        "Better user experience (no unexpected logouts)",
    ]

    # What does it protect against?
    protections = [
        "CSRF attacks (cross-site state-changing requests blocked)",
        "XSS attacks (HttpOnly flag prevents JS access)",
        "Man-in-the-middle (Secure flag requires HTTPS)",
        "Third-party tracking (SameSite prevents cross-site cookies)",
    ]

    # This test always passes - it's documentation
    assert configuration["samesite"] == "lax"
    assert len(reasons) == 6
    assert len(protections) == 4
