"""Secure HTTP-only cookie authentication routes.

Security Enhancement: CRIT-008
This module implements secure JWT token storage using HTTP-only cookies
instead of sessionStorage to prevent XSS attacks.

Security Benefits:
- XSS Protection: HttpOnly cookies cannot be accessed by JavaScript
- CSRF Protection: SameSite=lax prevents CSRF while allowing OAuth callbacks
- Secure Transport: Cookies only sent over HTTPS in production
- Reduced Attack Surface: No client-side token storage vulnerabilities

References:
- OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- MDN HttpOnly: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pydantic import BaseModel, Field

# Initialize logger
logger = logging.getLogger(__name__)

# Create router
cookie_router = APIRouter(prefix="/auth", tags=["Cookie Authentication"])


class SetTokensRequest(BaseModel):
    """Request model for setting authentication tokens in HttpOnly cookies.

    Attributes:
        access_token: JWT access token for API authentication
        refresh_token: JWT refresh token for session renewal
        expires_in: Token expiration time in seconds (default: 1800 = 30 minutes)
    """
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    expires_in: int = Field(
        default=1800,
        ge=60,
        le=86400,
        description="Token expiration time in seconds"
    )


class AuthStatusResponse(BaseModel):
    """Response model for authentication status check.

    Attributes:
        authenticated: Whether user has valid authentication cookies
        has_access_token: Whether access token cookie is present
        has_refresh_token: Whether refresh token cookie is present
    """
    authenticated: bool = Field(..., description="User authentication status")
    has_access_token: bool = Field(..., description="Access token cookie present")
    has_refresh_token: bool = Field(..., description="Refresh token cookie present")


@cookie_router.post("/set-tokens", status_code=status.HTTP_204_NO_CONTENT)
async def set_authentication_tokens(
    request: SetTokensRequest,
    response: Response,
) -> None:
    """Set JWT tokens as secure HttpOnly cookies.

    This endpoint receives JWT tokens from the client and sets them as
    secure HttpOnly cookies, preventing JavaScript access and XSS attacks.

    Args:
        request: Token data including access and refresh tokens
        response: FastAPI response object for setting cookies

    Returns:
        204 No Content (success indicated by status code)

    Security Features:
        - HttpOnly: JavaScript cannot access cookie values
        - Secure: Cookies only sent over HTTPS in production
        - SameSite=Lax: Prevents CSRF while allowing OAuth callbacks
        - Path=/: Cookie available for all routes
        - Max-Age: Automatic expiration handling

    Cookie Configuration:
        - vana_access_token: Short-lived (30 min default)
        - vana_refresh_token: Long-lived (7 days)

    Example:
        >>> response = await client.post("/api/auth/set-tokens", json={
        ...     "access_token": "eyJhbGc...",
        ...     "refresh_token": "abc123...",
        ...     "expires_in": 1800
        ... })
        >>> # Cookies are now set and will be sent with subsequent requests
    """
    try:
        # Determine if we're in production (use HTTPS-only cookies)
        # In production, this should be determined by environment variable
        is_production = False  # TODO: Set based on environment config

        # Common cookie options for security
        # SameSite=lax provides CSRF protection while allowing:
        # - OAuth callbacks (e.g., Google OAuth redirect)
        # - Top-level navigation with cookies
        # - Legitimate cross-site GET requests
        #
        # Still blocks:
        # - Cross-site POST/PUT/DELETE (CSRF protection)
        # - Embedded iframes accessing cookies
        # - Third-party tracking
        #
        # Industry standard for authentication cookies (OWASP recommended).
        cookie_options = {
            "httponly": True,  # Prevent JavaScript access (XSS protection)
            "secure": is_production,  # HTTPS only in production
            "samesite": "lax",  # OAuth-friendly CSRF protection
            "path": "/",  # Cookie available for all routes
        }

        # Set access token cookie (short-lived)
        response.set_cookie(
            key="vana_access_token",
            value=request.access_token,
            max_age=request.expires_in,  # Typically 30 minutes (1800 seconds)
            **cookie_options,
        )

        # Set refresh token cookie (long-lived)
        response.set_cookie(
            key="vana_refresh_token",
            value=request.refresh_token,
            max_age=7 * 24 * 60 * 60,  # 7 days in seconds
            **cookie_options,
        )

        logger.info("Successfully set authentication cookies (HttpOnly, SameSite=lax)")

    except Exception as e:
        logger.error(f"Failed to set authentication cookies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set authentication cookies"
        ) from e


@cookie_router.delete("/clear-tokens", status_code=status.HTTP_204_NO_CONTENT)
async def clear_authentication_tokens(
    response: Response,
) -> None:
    """Clear authentication cookies (logout).

    This endpoint removes authentication cookies by setting them with
    expired timestamps. This is the secure way to handle logout.

    Args:
        response: FastAPI response object for clearing cookies

    Returns:
        204 No Content (success indicated by status code)

    Security:
        - Immediately expires cookies by setting max_age=0
        - Uses same cookie options as set operation for consistency
        - Prevents cookie remnants from persisting

    Example:
        >>> await client.delete("/api/auth/clear-tokens")
        >>> # User is now logged out, cookies are cleared
    """
    try:
        cookie_options = {
            "httponly": True,
            "secure": False,  # TODO: Set based on environment
            "samesite": "lax",  # Match set-tokens configuration
            "path": "/",
            "max_age": 0,  # Expire immediately
        }

        response.set_cookie(key="vana_access_token", value="", **cookie_options)
        response.set_cookie(key="vana_refresh_token", value="", **cookie_options)

        logger.info("Successfully cleared authentication cookies")

    except Exception as e:
        logger.error(f"Failed to clear authentication cookies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear authentication cookies"
        ) from e


@cookie_router.get("/check", response_model=AuthStatusResponse)
async def check_authentication_status(
    vana_access_token: Annotated[str | None, Cookie()] = None,
    vana_refresh_token: Annotated[str | None, Cookie()] = None,
) -> AuthStatusResponse:
    """Check authentication status based on cookie presence.

    This endpoint allows the frontend to verify authentication without
    exposing tokens to JavaScript. It only checks cookie presence, not validity.

    Args:
        vana_access_token: Access token from HttpOnly cookie (injected by FastAPI)
        vana_refresh_token: Refresh token from HttpOnly cookie (injected by FastAPI)

    Returns:
        AuthStatusResponse indicating authentication status

    Security:
        - Does NOT return token values (security)
        - Only indicates presence, not validity
        - Frontend can use this for UI state management
        - Actual token validation happens in protected endpoints

    Note:
        This endpoint only checks if cookies exist. Token validation
        is performed by authentication dependencies on protected routes.

    Example:
        >>> status = await client.get("/api/auth/check")
        >>> if status.authenticated:
        ...     show_authenticated_ui()
        ... else:
        ...     show_login_ui()
    """
    has_access = vana_access_token is not None and vana_access_token != ""
    has_refresh = vana_refresh_token is not None and vana_refresh_token != ""

    return AuthStatusResponse(
        authenticated=has_access and has_refresh,
        has_access_token=has_access,
        has_refresh_token=has_refresh,
    )
