"""
CSRF Protection Middleware for Cookie-Based Authentication

This middleware implements double-submit cookie pattern for CSRF protection.
Required for applications using HttpOnly cookies for authentication.

Security Benefits:
- Prevents cross-site request forgery attacks
- Validates CSRF tokens on state-changing requests
- Uses cryptographically secure token generation
- Constant-time token comparison prevents timing attacks

How it works:
1. Server generates random CSRF token and sets it as cookie
2. Client reads cookie value and sends it in request header
3. Server validates header matches cookie (same-origin validation)
4. CSRF attack fails because attacker can't read cookie value

Reference: OWASP CSRF Prevention Cheat Sheet
https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
"""

import secrets
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

# CSRF configuration constants
CSRF_TOKEN_HEADER = "X-CSRF-Token"
CSRF_TOKEN_COOKIE = "csrf_token"
CSRF_TOKEN_LENGTH = 32  # 32 bytes = 256 bits of entropy

# Public endpoints that don't require CSRF validation
# These are either read-only operations or have their own CSRF protection
PUBLIC_ENDPOINTS = {
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/auth/login",
    "/api/auth/register",
    "/auth/google",
    "/auth/google/callback",
    "/auth/forgot-password",
    "/auth/reset-password",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware using double-submit cookie pattern.

    The double-submit cookie pattern works by:
    1. Setting a random value in both a cookie AND requiring it in a custom header
    2. Since attackers cannot read cookies cross-origin (Same-Origin Policy),
       they cannot set the correct header value
    3. Same-origin requests can read the cookie and set the header

    This is cryptographically secure because:
    - Token is generated with secrets.token_hex() (CSPRNG)
    - Token comparison uses secrets.compare_digest() (constant-time)
    - Token has 256 bits of entropy (2^256 possible values)

    Security properties:
    - Prevents CSRF attacks on state-changing operations
    - Protects cookie-based authentication
    - Does not interfere with CORS preflight
    - Compatible with SPA architectures
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and validate CSRF token if required.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware in chain

        Returns:
            Response with CSRF cookie set

        Raises:
            HTTPException: 403 if CSRF validation fails
        """
        # Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
        # These methods should not modify server state per HTTP semantics
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            response = await call_next(request)
            return self._ensure_csrf_cookie(request, response)

        # Skip CSRF validation for public endpoints
        # These endpoints have their own security mechanisms
        if request.url.path in PUBLIC_ENDPOINTS:
            response = await call_next(request)
            return self._ensure_csrf_cookie(request, response)

        # Skip CSRF validation for SSE endpoints
        # SSE uses GET method but may have persistent connections
        if "/sse/" in request.url.path or request.url.path.startswith("/agent_network_sse/"):
            response = await call_next(request)
            return self._ensure_csrf_cookie(request, response)

        # Skip CSRF validation for ADK session endpoints
        # ADK endpoints handle their own authentication and session management
        # Pattern: /apps/{app}/users/{user}/sessions/{session}/run
        if "/apps/" in request.url.path and "/sessions/" in request.url.path:
            response = await call_next(request)
            return self._ensure_csrf_cookie(request, response)

        # Validate CSRF token for state-changing methods (POST, PUT, DELETE, PATCH)
        if not self._validate_csrf_token(request):
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF validation failed. Please refresh the page and try again."},
            )

        # Process request and ensure cookie is set
        response = await call_next(request)
        return self._ensure_csrf_cookie(request, response)

    def _validate_csrf_token(self, request: Request) -> bool:
        """
        Validate CSRF token from header matches cookie.

        Uses constant-time comparison to prevent timing attacks.
        An attacker could potentially determine if tokens match by measuring
        response time, but secrets.compare_digest() prevents this.

        Args:
            request: HTTP request to validate

        Returns:
            True if token is valid, False otherwise
        """
        token_header = request.headers.get(CSRF_TOKEN_HEADER)
        token_cookie = request.cookies.get(CSRF_TOKEN_COOKIE)

        # Both token sources must be present
        if not token_header or not token_cookie:
            return False

        # Validate token format (hex string of expected length)
        expected_length = CSRF_TOKEN_LENGTH * 2  # hex encoding doubles length
        if len(token_header) != expected_length or len(token_cookie) != expected_length:
            return False

        # Constant-time comparison prevents timing attacks
        # This function always takes the same time regardless of where tokens differ
        return secrets.compare_digest(token_header, token_cookie)

    def _ensure_csrf_cookie(self, request: Request, response: Response) -> Response:
        """
        Ensure CSRF cookie is set on the response.

        Sets a new cookie if one doesn't exist or is invalid.
        Cookie is not HttpOnly so JavaScript can read it to set the header.

        Security considerations:
        - Not HttpOnly: JavaScript needs to read value to set header
        - Secure flag: HTTPS only in production (controlled by environment)
        - SameSite=Lax: Allows same-site requests, blocks cross-site
        - 24 hour expiration: Balance between security and usability

        Args:
            request: HTTP request (to check existing cookie)
            response: HTTP response (to set cookie)

        Returns:
            Response with CSRF cookie set
        """
        existing_cookie = request.cookies.get(CSRF_TOKEN_COOKIE)

        # Validate existing cookie format
        expected_length = CSRF_TOKEN_LENGTH * 2  # hex encoding doubles length
        is_valid_cookie = existing_cookie and len(existing_cookie) == expected_length

        # Only generate new token if cookie doesn't exist or is invalid
        if not is_valid_cookie:
            csrf_token = secrets.token_hex(CSRF_TOKEN_LENGTH)
            response.set_cookie(
                key=CSRF_TOKEN_COOKIE,
                value=csrf_token,
                httponly=False,  # Must be readable by JavaScript
                secure=True,  # HTTPS only (browsers ignore this on localhost)
                samesite="lax",  # Allow same-site requests, block cross-site
                max_age=60 * 60 * 24,  # 24 hours
                path="/",  # Available to entire application
            )

        return response


def generate_csrf_token() -> str:
    """
    Generate a cryptographically secure CSRF token.

    Uses secrets module which provides cryptographically strong random numbers
    suitable for managing secrets (tokens, passwords, etc.).

    Returns:
        Hex-encoded random token (64 characters = 32 bytes = 256 bits)
    """
    return secrets.token_hex(CSRF_TOKEN_LENGTH)
