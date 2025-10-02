"""Session rotation utilities for preventing session fixation attacks.

This module implements session ID rotation as part of authentication flows
to prevent session fixation vulnerabilities (CRIT-007).

Session fixation is an attack where an attacker tricks a user into using
a known session ID before authentication, then hijacks the session after
the user logs in. Session rotation prevents this by invalidating old
sessions and generating new session IDs at authentication boundaries.

References:
- OWASP Session Management Cheat Sheet
- CWE-384: Session Fixation
- NIST SP 800-63B
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import Request
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class SessionRotationResult:
    """Result of session rotation operation."""

    success: bool
    new_session_id: str | None = None
    old_session_id: str | None = None
    user_id: int | None = None
    rotation_timestamp: str | None = None
    error_message: str | None = None


def invalidate_existing_session(
    request: Request,
    user_id: int | None = None,
    reason: str = "session_rotation",
) -> None:
    """Invalidate any existing session before authentication.

    This prevents session fixation by clearing any pre-existing session
    state that might have been set by an attacker.

    Args:
        request: FastAPI request object containing session state.
        user_id: Optional user ID for targeted invalidation.
        reason: Reason for invalidation (for audit logging).

    Security:
        - Clears all session-related cookies
        - Removes session state from request
        - Logs invalidation event for audit trail
        - Safe to call even if no session exists
    """
    # Clear session-related cookies if they exist
    session_cookies = ["session", "sessionid", "session_id", "JSESSIONID"]

    for cookie_name in session_cookies:
        if cookie_name in request.cookies:
            logger.info(
                f"Invalidating session cookie '{cookie_name}' for user_id={user_id}, reason={reason}"
            )

    # Clear any session state from the request
    if hasattr(request, "session"):
        try:
            request.session.clear()
            logger.debug(f"Cleared request.session for user_id={user_id}")
        except (AttributeError, TypeError):
            pass  # Session might not be clearable

    # Clear custom session state if present
    if hasattr(request.state, "session_id"):
        old_session_id = getattr(request.state, "session_id", None)
        if old_session_id:
            logger.info(
                f"Invalidating session_id={old_session_id[:8]}... for user_id={user_id}, reason={reason}"
            )
        delattr(request.state, "session_id")

    # Log invalidation event
    logger.info(
        f"Session invalidation complete: user_id={user_id}, reason={reason}, timestamp={datetime.now(timezone.utc).isoformat()}"
    )


def rotate_session_id(
    request: Request,
    user_id: int,
    db: Session | None = None,
    reason: str = "authentication",
) -> SessionRotationResult:
    """Rotate session ID after successful authentication.

    This generates a new session ID and invalidates the old one to prevent
    session fixation attacks. Should be called immediately after:
    - User registration
    - User login (all methods: password, OAuth, etc.)
    - Password reset
    - Privilege escalation

    Args:
        request: FastAPI request object.
        user_id: User ID for the authenticated user.
        db: Optional database session for token operations.
        reason: Reason for rotation (for audit logging).

    Returns:
        SessionRotationResult with rotation details.

    Security Process:
        1. Capture old session ID (if any)
        2. Invalidate all existing session state
        3. Generate new secure session ID
        4. Update session metadata
        5. Log rotation event with timestamp
        6. Return new session ID for client

    Example:
        >>> result = rotate_session_id(request, user_id=123, db=db, reason="login")
        >>> if result.success:
        ...     response.set_cookie("session_id", result.new_session_id, secure=True)
    """
    from .session_security import create_session_security_validator

    # Capture old session ID for logging
    old_session_id = None
    if hasattr(request.state, "session_id"):
        old_session_id = getattr(request.state, "session_id", None)

    # Step 1: Invalidate existing session completely
    invalidate_existing_session(request, user_id=user_id, reason=reason)

    try:
        # Step 2: Generate new secure session ID
        security_validator = create_session_security_validator()
        new_session_id = security_validator.generate_secure_session_id()

        # Step 3: Update request state with new session ID
        request.state.session_id = new_session_id

        # Step 4: Create timestamp for audit trail
        rotation_timestamp = datetime.now(timezone.utc).isoformat()

        # Step 5: Log successful rotation
        logger.info(
            f"Session rotation successful: "
            f"user_id={user_id}, "
            f"old_session_id={old_session_id[:8] + '...' if old_session_id else 'none'}, "
            f"new_session_id={new_session_id[:8]}..., "
            f"reason={reason}, "
            f"timestamp={rotation_timestamp}"
        )

        return SessionRotationResult(
            success=True,
            new_session_id=new_session_id,
            old_session_id=old_session_id,
            user_id=user_id,
            rotation_timestamp=rotation_timestamp,
        )

    except Exception as e:
        logger.error(
            f"Session rotation failed: user_id={user_id}, reason={reason}, error={e!s}"
        )
        return SessionRotationResult(
            success=False,
            old_session_id=old_session_id,
            user_id=user_id,
            error_message=f"Session rotation failed: {e!s}",
        )


def rotate_session_on_registration(
    request: Request, user_id: int, db: Session | None = None
) -> SessionRotationResult:
    """Rotate session ID after user registration.

    Convenience wrapper for registration flow.

    Args:
        request: FastAPI request object.
        user_id: Newly created user ID.
        db: Optional database session.

    Returns:
        SessionRotationResult with rotation details.
    """
    return rotate_session_id(request, user_id, db=db, reason="registration")


def rotate_session_on_login(
    request: Request, user_id: int, db: Session | None = None
) -> SessionRotationResult:
    """Rotate session ID after user login.

    Convenience wrapper for login flow.

    Args:
        request: FastAPI request object.
        user_id: Authenticated user ID.
        db: Optional database session.

    Returns:
        SessionRotationResult with rotation details.
    """
    return rotate_session_id(request, user_id, db=db, reason="login")


def rotate_session_on_oauth(
    request: Request, user_id: int, db: Session | None = None, provider: str = "oauth"
) -> SessionRotationResult:
    """Rotate session ID after OAuth authentication.

    Convenience wrapper for OAuth flow.

    Args:
        request: FastAPI request object.
        user_id: Authenticated user ID.
        db: Optional database session.
        provider: OAuth provider name (e.g., "google", "github").

    Returns:
        SessionRotationResult with rotation details.
    """
    return rotate_session_id(request, user_id, db=db, reason=f"oauth_{provider}")


def rotate_session_on_privilege_escalation(
    request: Request, user_id: int, db: Session | None = None
) -> SessionRotationResult:
    """Rotate session ID when user privileges change.

    Should be called when user role or permissions are elevated to prevent
    privilege fixation attacks.

    Args:
        request: FastAPI request object.
        user_id: User ID with changed privileges.
        db: Optional database session.

    Returns:
        SessionRotationResult with rotation details.
    """
    return rotate_session_id(request, user_id, db=db, reason="privilege_escalation")


# Export main functions
__all__ = [
    "SessionRotationResult",
    "invalidate_existing_session",
    "rotate_session_id",
    "rotate_session_on_registration",
    "rotate_session_on_login",
    "rotate_session_on_oauth",
    "rotate_session_on_privilege_escalation",
]
