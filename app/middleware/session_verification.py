"""
Session Verification Middleware (ADK-compliant).

This middleware adds verification logic to session creation without replacing
ADK's built-in session service. It intercepts responses from session creation
endpoints and verifies the session is ready in ADK before returning.

ADK Pattern: Non-invasive middleware approach
"""

import asyncio
import json
import logging
from typing import Callable

import httpx
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class SessionVerificationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that verifies sessions are ready after creation.

    This prevents race conditions where:
    1. Frontend creates session → ADK returns immediately
    2. Frontend calls /run_sse immediately
    3. Session not yet fully initialized → errorCode: "STOP"

    Solution: After session creation, verify with retry that session
    is accessible in ADK before returning response to frontend.
    """

    def __init__(
        self,
        app: ASGIApp,
        adk_port: int = 8080,
        verify_timeout: int = 5,
        max_retries: int = 3,
    ):
        """
        Initialize session verification middleware.

        Args:
            app: ASGI application
            adk_port: Port where ADK web server runs
            verify_timeout: Timeout for verification requests
            max_retries: Maximum verification retry attempts
        """
        super().__init__(app)
        self.adk_port = adk_port
        self.verify_timeout = verify_timeout
        self.max_retries = max_retries

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and verify sessions after creation.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware in chain

        Returns:
            Response with verified session
        """
        # Log all session-related requests for debugging
        if "/sessions" in request.url.path:
            logger.info(
                f"SessionVerificationMiddleware intercepted: {request.method} {request.url.path}"
            )

        # Process the request normally
        response = await call_next(request)

        # Only intercept successful session creation POSTs
        if (
            request.method == "POST"
            and "/sessions" in request.url.path
            and not request.url.path.endswith("/messages")  # Exclude message endpoints
            and response.status_code in [200, 201]
        ):
            # Check if this is a session creation response
            if self._is_session_creation_response(request.url.path):
                try:
                    # Read the response body
                    body = b""
                    async for chunk in response.body_iterator:
                        body += chunk

                    # Parse session data
                    session_data = json.loads(body.decode("utf-8"))

                    # Extract session details for verification
                    if "id" in session_data:
                        session_id = session_data["id"]
                        app_name = self._extract_app_name(request.url.path)
                        user_id = self._extract_user_id(request.url.path)

                        # Verify session is ready in ADK
                        await self._verify_session_ready(
                            app_name=app_name,
                            user_id=user_id,
                            session_id=session_id,
                        )

                        logger.info(
                            f"Session {session_id} created and verified ready"
                        )

                    # Return the original response with the body we read
                    return Response(
                        content=body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type,
                    )

                except Exception as e:
                    logger.error(f"Session verification failed: {e}", exc_info=True)
                    # Return original response even if verification fails
                    # (better to have unverified session than fail completely)
                    pass

        return response

    def _is_session_creation_response(self, path: str) -> bool:
        """Check if path matches session creation endpoint."""
        # Matches: /apps/{app}/users/{user}/sessions
        # Does not match: /apps/{app}/users/{user}/sessions/{id}/...
        parts = path.strip("/").split("/")
        return (
            len(parts) == 5
            and parts[0] == "apps"
            and parts[2] == "users"
            and parts[4] == "sessions"
        )

    def _extract_app_name(self, path: str) -> str:
        """Extract app name from path."""
        parts = path.strip("/").split("/")
        return parts[1] if len(parts) > 1 else "vana"

    def _extract_user_id(self, path: str) -> str:
        """Extract user ID from path."""
        parts = path.strip("/").split("/")
        return parts[3] if len(parts) > 3 else "default"

    async def _verify_session_ready(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
    ) -> None:
        """
        Verify session exists and is ready in ADK.

        Uses exponential backoff retry pattern.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session ID to verify

        Raises:
            RuntimeError: If session not ready after max retries
        """
        retry_delay = 0.5  # Start with 500ms

        async with httpx.AsyncClient(timeout=self.verify_timeout) as client:
            for attempt in range(self.max_retries):
                try:
                    # Check if session exists in ADK
                    verify_resp = await client.get(
                        f"http://127.0.0.1:{self.adk_port}/apps/{app_name}/users/{user_id}/sessions/{session_id}"
                    )

                    if verify_resp.status_code == 200:
                        logger.debug(
                            f"Session {session_id} verified ready "
                            f"(attempt {attempt + 1}/{self.max_retries})"
                        )
                        return

                    elif verify_resp.status_code == 404:
                        logger.warning(
                            f"Session {session_id} not yet ready "
                            f"(attempt {attempt + 1}/{self.max_retries})"
                        )
                    else:
                        logger.warning(
                            f"Unexpected status {verify_resp.status_code} "
                            f"verifying session {session_id}"
                        )

                    # Wait before retry (exponential backoff)
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2

                except httpx.TimeoutException:
                    logger.warning(
                        f"Timeout verifying session {session_id} "
                        f"(attempt {attempt + 1}/{self.max_retries})"
                    )
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2

                except Exception as e:
                    logger.error(
                        f"Error verifying session {session_id}: {e}",
                        exc_info=True,
                    )
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2

        # Log warning but don't fail - session might still work
        logger.warning(
            f"Session {session_id} could not be verified after {self.max_retries} attempts. "
            f"Continuing anyway - session may still work."
        )
