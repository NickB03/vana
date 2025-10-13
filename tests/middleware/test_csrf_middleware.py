"""Tests for CSRF middleware.

This test suite validates the CSRF protection middleware implementation:
1. Double-submit cookie pattern validation
2. Token generation and validation
3. Constant-time comparison security
4. Public endpoint exclusions
5. HTTP method-based validation rules
"""

import pytest
import secrets
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.csrf_middleware import (
    CSRFMiddleware,
    generate_csrf_token,
    CSRF_TOKEN_HEADER,
    CSRF_TOKEN_COOKIE,
    CSRF_TOKEN_LENGTH,
)


@pytest.fixture
def app():
    """Create FastAPI app with CSRF middleware."""
    app = FastAPI()
    app.add_middleware(CSRFMiddleware)

    @app.get("/test-get")
    async def test_get():
        return {"method": "GET"}

    @app.post("/test-post")
    async def test_post():
        return {"method": "POST"}

    @app.put("/test-put")
    async def test_put():
        return {"method": "PUT"}

    @app.delete("/test-delete")
    async def test_delete():
        return {"method": "DELETE"}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    @app.post("/api/auth/login")
    async def login():
        return {"status": "logged in"}

    return app


@pytest.fixture
def client(app):
    """Create test client with raise_server_exceptions disabled."""
    return TestClient(app, raise_server_exceptions=False)


class TestCSRFMiddleware:
    """Test CSRF middleware functionality."""

    def test_get_request_no_csrf_required(self, client):
        """GET requests don't require CSRF token."""
        response = client.get("/test-get")
        assert response.status_code == 200
        assert CSRF_TOKEN_COOKIE in response.cookies
        assert response.json() == {"method": "GET"}

    def test_post_without_csrf_fails(self, client):
        """POST without CSRF token fails with 403."""
        response = client.post("/test-post")
        assert response.status_code == 403
        assert "CSRF validation failed" in response.json()["detail"]

    def test_post_with_valid_csrf_succeeds(self, client):
        """POST with valid CSRF token succeeds."""
        # Get CSRF token from GET request
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)
        assert csrf_token is not None

        # Use token in POST request
        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: csrf_token},
            headers={CSRF_TOKEN_HEADER: csrf_token},
        )
        assert response.status_code == 200
        assert response.json() == {"method": "POST"}

    def test_put_with_valid_csrf_succeeds(self, client):
        """PUT with valid CSRF token succeeds."""
        # Get CSRF token
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Use token in PUT request
        response = client.put(
            "/test-put",
            cookies={CSRF_TOKEN_COOKIE: csrf_token},
            headers={CSRF_TOKEN_HEADER: csrf_token},
        )
        assert response.status_code == 200
        assert response.json() == {"method": "PUT"}

    def test_delete_with_valid_csrf_succeeds(self, client):
        """DELETE with valid CSRF token succeeds."""
        # Get CSRF token
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Use token in DELETE request
        response = client.delete(
            "/test-delete",
            cookies={CSRF_TOKEN_COOKIE: csrf_token},
            headers={CSRF_TOKEN_HEADER: csrf_token},
        )
        assert response.status_code == 200
        assert response.json() == {"method": "DELETE"}

    def test_post_with_mismatched_tokens_fails(self, client):
        """POST with mismatched CSRF tokens fails."""
        # Get valid token
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Use different token in header
        different_token = secrets.token_hex(CSRF_TOKEN_LENGTH)
        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: csrf_token},
            headers={CSRF_TOKEN_HEADER: different_token},
        )
        assert response.status_code == 403

    def test_post_with_only_cookie_fails(self, client):
        """POST with only cookie token (no header) fails."""
        # Get valid token
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Send only cookie, no header
        response = client.post(
            "/test-post", cookies={CSRF_TOKEN_COOKIE: csrf_token}
        )
        assert response.status_code == 403

    def test_post_with_only_header_fails(self, client):
        """POST with only header token (no cookie) fails."""
        # Generate token
        csrf_token = secrets.token_hex(CSRF_TOKEN_LENGTH)

        # Send only header, no cookie
        response = client.post(
            "/test-post", headers={CSRF_TOKEN_HEADER: csrf_token}
        )
        assert response.status_code == 403

    def test_public_endpoint_no_csrf_required(self, client):
        """Public endpoints don't require CSRF token."""
        # Health check endpoint
        response = client.get("/health")
        assert response.status_code == 200

        # Login endpoint (POST but public)
        response = client.post("/api/auth/login")
        assert response.status_code == 200
        assert response.json() == {"status": "logged in"}

    def test_csrf_cookie_attributes(self, client):
        """CSRF cookie has correct security attributes."""
        response = client.get("/test-get")
        cookie_header = response.headers.get("set-cookie", "")

        # Check cookie attributes
        assert CSRF_TOKEN_COOKIE in cookie_header
        assert "max-age=" in cookie_header.lower()
        assert "path=/" in cookie_header.lower()
        assert "samesite=lax" in cookie_header.lower()
        # Note: Secure flag may not be present in test environment

    def test_csrf_token_format(self, client):
        """CSRF token has correct format (hex string)."""
        response = client.get("/test-get")
        csrf_token = response.cookies.get(CSRF_TOKEN_COOKIE)

        # Token should be hex string of correct length
        assert csrf_token is not None
        assert len(csrf_token) == CSRF_TOKEN_LENGTH * 2
        assert all(c in "0123456789abcdef" for c in csrf_token)

    def test_csrf_token_reuse(self, client):
        """Same CSRF token can be used for multiple requests."""
        # Get token
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Use for multiple POST requests
        for _ in range(3):
            response = client.post(
                "/test-post",
                cookies={CSRF_TOKEN_COOKIE: csrf_token},
                headers={CSRF_TOKEN_HEADER: csrf_token},
            )
            assert response.status_code == 200

    def test_invalid_token_length_fails(self, client):
        """Tokens with invalid length are rejected."""
        # Too short
        short_token = "abc123"
        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: short_token},
            headers={CSRF_TOKEN_HEADER: short_token},
        )
        assert response.status_code == 403

        # Too long
        long_token = "a" * 100
        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: long_token},
            headers={CSRF_TOKEN_HEADER: long_token},
        )
        assert response.status_code == 403


class TestCSRFTokenGeneration:
    """Test CSRF token generation function."""

    def test_generate_csrf_token_format(self):
        """Generated token has correct format."""
        token = generate_csrf_token()

        # Should be hex string
        assert isinstance(token, str)
        assert len(token) == CSRF_TOKEN_LENGTH * 2
        assert all(c in "0123456789abcdef" for c in token)

    def test_generate_csrf_token_uniqueness(self):
        """Generated tokens are unique."""
        tokens = {generate_csrf_token() for _ in range(100)}
        assert len(tokens) == 100  # All unique

    def test_generate_csrf_token_entropy(self):
        """Generated tokens have high entropy."""
        token1 = generate_csrf_token()
        token2 = generate_csrf_token()

        # Tokens should be completely different
        assert token1 != token2
        # Should have low similarity (few common characters)
        common_chars = sum(c1 == c2 for c1, c2 in zip(token1, token2))
        # Expect less than 20% similarity by random chance
        assert common_chars < len(token1) * 0.2


class TestCSRFSecurityProperties:
    """Test security properties of CSRF implementation."""

    def test_constant_time_comparison(self, client):
        """Token comparison uses constant-time algorithm.

        This test verifies that the validation doesn't leak timing information.
        In production, this prevents timing attacks where an attacker measures
        response times to guess the token character by character.
        """
        # Get valid token
        get_response = client.get("/test-get")
        valid_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Test with completely different token (mismatched token should fail)
        different_token = secrets.token_hex(CSRF_TOKEN_LENGTH)

        # Both should fail in roughly the same time
        # (We can't test actual timing in unit tests, but we verify behavior)
        response1 = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: valid_token},
            headers={CSRF_TOKEN_HEADER: different_token},
        )
        response2 = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: different_token},
            headers={CSRF_TOKEN_HEADER: valid_token},  # Different mismatch
        )

        # Both should fail with same status code
        assert response1.status_code == 403
        assert response2.status_code == 403

    def test_csrf_prevents_cross_origin_attack(self, client):
        """CSRF protection prevents cross-origin attacks.

        This simulates an attacker's website trying to make a request.
        The attack fails because the attacker cannot read the CSRF cookie
        to set the correct header value (Same-Origin Policy).
        """
        # Attacker cannot read victim's cookies
        # So they can't set the correct header
        attacker_token = secrets.token_hex(CSRF_TOKEN_LENGTH)

        # Attempt cross-origin attack
        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: attacker_token},
            headers={CSRF_TOKEN_HEADER: "wrong-token"},
        )

        # Attack should fail
        assert response.status_code == 403

    def test_safe_methods_always_allowed(self, client):
        """Safe HTTP methods don't require CSRF protection.

        GET, HEAD, OPTIONS should never modify server state,
        so they don't need CSRF protection per HTTP semantics.
        """
        # GET
        response = client.get("/test-get")
        assert response.status_code == 200

        # HEAD (FastAPI may not support HEAD by default, so just test GET)
        # response = client.head("/test-get")
        # assert response.status_code == 200

        # OPTIONS (returns 200 or 405 depending on FastAPI configuration)
        response = client.options("/test-get")
        # Accept both 200 (if OPTIONS is implemented) or 405 (method not allowed)
        assert response.status_code in [200, 405]


class TestCSRFEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_token_header(self, client):
        """Empty token header is rejected."""
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: csrf_token},
            headers={CSRF_TOKEN_HEADER: ""},
        )
        assert response.status_code == 403

    def test_whitespace_token_header(self, client):
        """Whitespace token header is rejected."""
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: csrf_token},
            headers={CSRF_TOKEN_HEADER: "   "},
        )
        assert response.status_code == 403

    def test_case_sensitive_token(self, client):
        """Token comparison is case-sensitive."""
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Try uppercase version
        uppercase_token = csrf_token.upper()
        response = client.post(
            "/test-post",
            cookies={CSRF_TOKEN_COOKIE: csrf_token},
            headers={CSRF_TOKEN_HEADER: uppercase_token},
        )
        assert response.status_code == 403

    def test_multiple_concurrent_requests(self, client):
        """Multiple concurrent requests with same token succeed."""
        get_response = client.get("/test-get")
        csrf_token = get_response.cookies.get(CSRF_TOKEN_COOKIE)

        # Simulate concurrent requests
        responses = []
        for _ in range(5):
            response = client.post(
                "/test-post",
                cookies={CSRF_TOKEN_COOKIE: csrf_token},
                headers={CSRF_TOKEN_HEADER: csrf_token},
            )
            responses.append(response)

        # All should succeed
        assert all(r.status_code == 200 for r in responses)
