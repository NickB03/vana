"""
Verified Session Service Wrapper for ADK.

This wrapper extends ADK's DatabaseSessionService with session verification
logic to prevent race conditions when sessions are created and immediately used.

ADK Pattern: Service composition and extension
Reference: docs/adk/refs/official-adk-python/src/google/adk/sessions/
"""

import asyncio
import logging
from typing import Any, Optional

import httpx
from google.adk.sessions.database_session_service import DatabaseSessionService
from google.adk.sessions.types import Session

logger = logging.getLogger(__name__)


class VerifiedSessionService(DatabaseSessionService):
    """
    Session service that verifies sessions are ready in ADK before returning.

    This prevents race conditions where:
    1. Frontend creates session
    2. Frontend immediately calls /run_sse
    3. ADK hasn't finished initializing session → errorCode: "STOP"

    The wrapper adds verification with exponential backoff retry to ensure
    sessions are fully initialized before being used.
    """

    def __init__(
        self,
        db_url: str,
        adk_port: int = 8080,
        verify_timeout: int = 5,
        **kwargs: Any,
    ):
        """
        Initialize verified session service.

        Args:
            db_url: Database URL for session persistence
            adk_port: Port where ADK web server is running (default: 8080)
            verify_timeout: Maximum seconds to wait for session verification
            **kwargs: Additional arguments passed to DatabaseSessionService
        """
        super().__init__(db_url, **kwargs)
        self.adk_port = adk_port
        self.verify_timeout = verify_timeout

    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: Optional[dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Session:
        """
        Create session and verify it's ready in ADK.

        This extends the base create_session with verification logic to ensure
        the session is fully initialized before returning.

        Args:
            app_name: Application name
            user_id: User identifier
            state: Initial session state
            session_id: Optional session ID (generated if not provided)

        Returns:
            Verified Session object

        Raises:
            HTTPException: If session creation or verification fails
        """
        # Call parent's create_session
        session = await super().create_session(
            app_name=app_name,
            user_id=user_id,
            state=state,
            session_id=session_id,
        )

        # Verify session is ready in ADK with exponential backoff
        await self._verify_session_ready(
            app_name=app_name,
            user_id=user_id,
            session_id=session.id,
        )

        logger.info(
            f"Session {session.id} created and verified ready for app={app_name}, user={user_id}"
        )
        return session

    async def _verify_session_ready(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
    ) -> None:
        """
        Verify session exists and is ready in ADK.

        Uses exponential backoff retry pattern to handle timing issues where
        session creation in database completes before ADK's internal initialization.

        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session ID to verify

        Raises:
            RuntimeError: If session not ready after max retries
        """
        max_retries = 3
        retry_delay = 0.5  # Start with 500ms
        session_ready = False

        async with httpx.AsyncClient(timeout=self.verify_timeout) as client:
            for attempt in range(max_retries):
                try:
                    # Check if session exists in ADK
                    verify_resp = await client.get(
                        f"http://127.0.0.1:{self.adk_port}/apps/{app_name}/users/{user_id}/sessions/{session_id}"
                    )

                    if verify_resp.status_code == 200:
                        session_ready = True
                        logger.debug(
                            f"Session {session_id} verified ready in ADK "
                            f"(attempt {attempt + 1}/{max_retries})"
                        )
                        return

                    elif verify_resp.status_code == 404:
                        logger.warning(
                            f"Session {session_id} not yet ready in ADK "
                            f"(attempt {attempt + 1}/{max_retries})"
                        )
                    else:
                        logger.warning(
                            f"Unexpected status {verify_resp.status_code} "
                            f"verifying session {session_id}"
                        )

                    # Wait before retry (exponential backoff)
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Double delay each retry

                except httpx.TimeoutException:
                    logger.warning(
                        f"Timeout verifying session {session_id} "
                        f"(attempt {attempt + 1}/{max_retries})"
                    )
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2

                except Exception as e:
                    logger.error(
                        f"Error verifying session {session_id}: {e}",
                        exc_info=True,
                    )
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2

        # If we get here, session is not ready after all retries
        if not session_ready:
            error_msg = (
                f"Session {session_id} not ready in ADK after {max_retries} attempts. "
                f"This may indicate ADK is slow to start or overloaded."
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
