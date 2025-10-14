#!/usr/bin/env python3
"""
Google ADK-compliant routes for vana application.

This module provides ADK-compliant endpoint naming and structure following the pattern:
/apps/{app_name}/users/{user_id}/sessions/{session_id}/{action}

The ADK expects very specific path structures for proper integration.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.models import SessionMessagePayload
from app.utils.input_validation import (
    get_validation_error_response,
    validate_chat_input,
)
from app.utils.rate_limiter import gemini_rate_limiter
from app.utils.session_store import session_store
from app.utils.sse_broadcaster import agent_network_event_stream, get_sse_broadcaster

# Import authentication dependencies
try:
    from app.auth.database import get_auth_db
    from app.auth.models import User
    from app.auth.security import current_active_user_dep, get_current_user_optional

    # Create a dependency for optional authentication
    def get_current_active_user_optional():
        """Optional authentication dependency using app.auth.security."""
        from fastapi import Depends
        from fastapi.security import HTTPBearer
        from sqlalchemy.orm import Session

        optional_security = HTTPBearer(auto_error=False)

        async def dependency(
            credentials=Depends(optional_security),
            db: Session = Depends(get_auth_db)
        ):
            return get_current_user_optional(credentials, db)

        return dependency

except ImportError:
    # Fallback for environments without auth
    def current_active_user_dep() -> None:
        return None

    def get_current_active_user_optional():
        """Fallback for optional authentication."""
        def dependency():
            return None
        return dependency

    class User:
        def __init__(self):
            self.id = None
            self.email = None

logger = logging.getLogger(__name__)

# Create ADK router
adk_router = APIRouter(tags=["adk-compliant"])

# Constants for ADK compliance
DEFAULT_APP_NAME = "vana"
DEFAULT_USER_ID = "default"


def sanitize_log_content(content: str, max_length: int = 50) -> str:
    """
    Sanitize content for secure logging.

    SECURITY FIX: Remove potentially sensitive or malicious content from logs
    to prevent:
    - Log injection attacks
    - PII exposure (GDPR/CCPA compliance)
    - Credential leakage
    - Attack pattern disclosure

    Args:
        content: Raw content to sanitize
        max_length: Maximum length of sanitized output

    Returns:
        Sanitized content safe for logging
    """
    import re

    # Remove control characters that could break log parsing
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', content)

    # Remove common injection characters
    sanitized = re.sub(r'[<>\'";\\]', '', sanitized)

    # Truncate to max length
    if len(sanitized) > max_length:
        return sanitized[:max_length] + '...'

    return sanitized


class SessionUpdatePayload(BaseModel):
    """Payload for updating session metadata in ADK format."""
    title: str | None = None
    status: str | None = None


class AppInfo(BaseModel):
    """Application information for ADK compliance."""
    name: str
    description: str
    version: str
    status: str


# ============================================================================
# ADK CORE ENDPOINTS
# ============================================================================

@adk_router.get("/list-apps")
async def list_apps(
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    List available applications for ADK compliance.

    This endpoint is required by the ADK to discover available apps.

    Returns:
        List of available applications
    """
    apps = [
        AppInfo(
            name="vana",
            description="AI Research Agent Platform",
            version="1.0.0",
            status="active"
        )
    ]

    return {
        "apps": [app.model_dump() for app in apps],
        "count": len(apps),
        "timestamp": datetime.now().isoformat(),
        "authenticated": current_user is not None
    }


@adk_router.get("/apps/{app_name}/users/{user_id}/sessions")
async def list_user_sessions(
    app_name: str,
    user_id: str,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    List sessions for a specific app and user (ADK-compliant).

    Args:
        app_name: Application name (e.g., "vana")
        user_id: User identifier
        current_user: Current authenticated user

    Returns:
        List of sessions for the user in the specified app
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    # Get sessions (filter by user_id if needed)
    sessions = session_store.list_sessions()

    # Filter sessions by user_id if not default
    if user_id != DEFAULT_USER_ID and current_user:
        sessions = [
            session for session in sessions
            if session.get("user_id") == user_id or session.get("user_id") == current_user.id
        ]

    return {
        "app_name": app_name,
        "user_id": user_id,
        "sessions": sessions,
        "count": len(sessions),
        "timestamp": datetime.now().isoformat(),
        "authenticated": current_user is not None
    }


@adk_router.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def get_user_session(
    app_name: str,
    user_id: str,
    session_id: str,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Get a specific session for a user in an app (ADK-compliant).

    Args:
        app_name: Application name
        user_id: User identifier
        session_id: Session identifier
        current_user: Current authenticated user

    Returns:
        Session data with messages
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    # Get session
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add ADK context
    session["app_name"] = app_name
    session["user_id"] = user_id
    session["authenticated"] = current_user is not None

    return session


@adk_router.put("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def update_user_session(
    app_name: str,
    user_id: str,
    session_id: str,
    payload: SessionUpdatePayload,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Update session metadata for a user in an app (ADK-compliant).

    Args:
        app_name: Application name
        user_id: User identifier
        session_id: Session identifier
        payload: Update payload
        current_user: Current authenticated user

    Returns:
        Updated session data
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    # Update session
    updates = {
        key: value for key, value in payload.model_dump().items() if value is not None
    }
    record = session_store.update_session(session_id, **updates)

    response = record.to_dict(include_messages=False)
    response["app_name"] = app_name
    response["user_id"] = user_id
    response["authenticated"] = current_user is not None

    return response


@adk_router.delete("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def delete_user_session(
    app_name: str,
    user_id: str,
    session_id: str,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Delete a session for a user in an app (ADK-compliant).

    Args:
        app_name: Application name
        user_id: User identifier
        session_id: Session identifier
        current_user: Current authenticated user

    Returns:
        Deletion confirmation
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    try:
        # Check if session exists
        session = session_store.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # CRIT-006: Cancel any background tasks before deleting session
        broadcaster = get_sse_broadcaster()
        await broadcaster.clear_session(session_id)

        # Delete the session
        session_store.delete_session(session_id)

        return {
            "success": True,
            "message": f"Session {session_id} deleted successfully",
            "app_name": app_name,
            "user_id": user_id,
            "authenticated": current_user is not None
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "app_name": app_name,
            "user_id": user_id,
            "authenticated": current_user is not None
        }


@adk_router.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}/task-status")
async def get_session_task_status(
    app_name: str,
    user_id: str,
    session_id: str,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Get background task status for a session (CRIT-006 debugging endpoint).

    Args:
        app_name: Application name
        user_id: User identifier
        session_id: Session identifier
        current_user: Current authenticated user

    Returns:
        Task status information
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    broadcaster = get_sse_broadcaster()
    task_status = await broadcaster._session_manager.get_task_status(session_id)

    return {
        "app_name": app_name,
        "user_id": user_id,
        "authenticated": current_user is not None,
        **task_status
    }


@adk_router.get("/task-status")
async def get_all_task_status(
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Get status of all background tasks (CRIT-006 debugging endpoint).

    Args:
        current_user: Current authenticated user

    Returns:
        Status of all background tasks
    """
    broadcaster = get_sse_broadcaster()
    task_status = await broadcaster._session_manager.get_task_status()

    return {
        "authenticated": current_user is not None,
        "timestamp": datetime.now().isoformat(),
        **task_status
    }


# ============================================================================
# ADK SESSION ACTIONS
# ============================================================================

@adk_router.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def run_session_sse(
    app_name: str,
    user_id: str,
    session_id: str,
    request: dict[str, Any] = Body(...),
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Start session research and return success response (ADK-compliant).

    This is the main ADK endpoint equivalent to /api/run_sse/{session_id}

    Args:
        app_name: Application name
        user_id: User identifier
        session_id: Session identifier
        request: Research request containing the query/topic
        current_user: Optional authenticated user

    Returns:
        Success response indicating research has started
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    try:
        research_query = request.get("query") or request.get("message", "")
        if not research_query:
            raise HTTPException(status_code=400, detail="Research query is required")

        # Server-side input validation (CRITICAL SECURITY FIX)
        is_valid, error_message = validate_chat_input(research_query)
        if not is_valid:
            logger.warning(
                f"Input validation failed for session {session_id}: {error_message}. "
                f"Query preview: {research_query[:100]}"
            )
            raise HTTPException(
                status_code=400,
                detail=get_validation_error_response(error_message)
            )

        # Ensure session exists in store
        session_store.ensure_session(
            session_id,
            user_id=current_user.id if current_user else user_id,
            title=research_query[:60],
            status="starting"
        )

        # Add initial user message
        session_store.add_message(
            session_id,
            {
                "id": f"msg_{uuid.uuid4()}_user",
                "role": "user",
                "content": research_query,
                "timestamp": datetime.now().isoformat(),
            },
        )

        # Log research session start (SECURITY FIX: Sanitize query content)
        access_info = {
            "message": "ADK research session triggered",
            "app_name": app_name,
            "user_id": user_id,
            "session_id": session_id,
            "user_id_auth": current_user.id if current_user else None,
            "query_length": len(research_query),  # Log length, not content
            "query_preview": sanitize_log_content(research_query, 50),  # Sanitized preview
            "timestamp": datetime.now().isoformat(),
        }

        logger.info(f"ADK research session triggered: {access_info}")

        # Proxy request to ADK service running on port 8080
        research_started = False

        # Try to call ADK service
        try:
            import httpx

            from app.utils.sse_broadcaster import get_sse_broadcaster

            broadcaster = get_sse_broadcaster()
            logger.info(f"Forwarding request to ADK service for session {session_id}")

            # Create async task to call ADK's built-in endpoint
            async def call_adk_and_stream():
                """Call ADK's built-in /run_sse endpoint with proper error handling."""
                try:
                    logger.info(f"Starting agent execution for session {session_id}")

                    # Send initial agent status to ADK SSE stream
                    await broadcaster.broadcast_event(session_id, {
                        "type": "agent_status",
                        "data": {
                            "agents": [{
                                "agent_id": "team_leader",
                                "agent_type": "coordinator",
                                "name": "Team Leader",
                                "status": "active",
                                "progress": 0.1,
                                "current_task": "Processing request"
                            }],
                            "timestamp": datetime.now().isoformat()
                        }
                    })

                    # Create session in ADK first with specific session_id
                    async with httpx.AsyncClient() as client:
                        try:
                            session_resp = await client.post(
                                f"http://127.0.0.1:8080/apps/{app_name}/users/{user_id}/sessions/{session_id}",
                                json={},
                                timeout=10.0
                            )
                            if session_resp.status_code == 400 and "already exists" in session_resp.text:
                                logger.info(f"Session {session_id} already exists, proceeding")
                            elif session_resp.status_code not in [200, 201]:
                                error_msg = f"Session creation failed: {session_resp.status_code} - {session_resp.text[:200]}"
                                logger.error(error_msg)
                                raise Exception(error_msg)
                            else:
                                logger.info(f"Session {session_id} created successfully")

                        except httpx.TimeoutException:
                            error_msg = f"Timeout creating session {session_id} in ADK"
                            logger.error(error_msg)
                            raise Exception(error_msg)
                        except Exception as e:
                            if "already exists" not in str(e):
                                logger.error(f"Failed to create session {session_id}: {e}")
                                raise

                        # Call ADK's /run_sse endpoint
                        # Format must match ADK Event structure with role field
                        adk_request = {
                            "appName": app_name,
                            "userId": user_id,
                            "sessionId": session_id,
                            "newMessage": {
                                "parts": [{"text": research_query}],
                                "role": "user"
                            },
                            "streaming": True
                        }

                        accumulated_content = []

                        # SSE streams need special timeout config:
                        # - No read timeout (allow gaps between chunks while LLM processes)
                        # - Overall timeout of 300s (5 min) to match asyncio.wait_for
                        logger.info(f"Calling ADK /run_sse for session {session_id}")
                        logger.debug(f"ADK request payload: {adk_request}")

                        # Use rate limiter to prevent overwhelming the Gemini API
                        rate_limit_hit = False
                        logger.info(f"Attempting to acquire rate limiter for session {session_id}")
                        async with gemini_rate_limiter:
                            logger.info(f"Rate limiter acquired for session {session_id}")

                            async with client.stream(
                                "POST",
                                "http://127.0.0.1:8080/run_sse",
                                json=adk_request,
                                timeout=httpx.Timeout(300.0, read=None)
                            ) as response:
                                logger.info(f"ADK responded with status {response.status_code} for session {session_id}")

                                response.raise_for_status()
                                logger.debug(f"Starting SSE stream iteration for session {session_id}")

                                line_count = 0
                                async for line in response.aiter_lines():
                                    line_count += 1
                                    if line.strip() and line.startswith("data: "):
                                        data_str = line[6:].strip()
                                        if data_str and data_str != "[DONE]":
                                            try:
                                                data = json.loads(data_str)

                                                # DEBUG: Log event (debug level)
                                                logger.debug(
                                                    f"[ADK] {session_id}: {json.dumps(data)[:500]}"
                                                )

                                                # ═══════════════════════════════════════════════════════════════════
                                                # CRITICAL: ADK Event Content Extraction
                                                # ═══════════════════════════════════════════════════════════════════
                                                # MUST extract from BOTH text AND functionResponse parts!
                                                #
                                                # ⚠️  COMMON BUG: Only extracting from text breaks research plans
                                                #    Research plans come from plan_generator via functionResponse
                                                #
                                                # Event structure:
                                                #   content.parts[] = [
                                                #     {text: "..."} ← Model streaming output
                                                #     {functionResponse: {response: {result: "..."}}} ← Agent tool outputs (CRITICAL!)
                                                #     {functionCall: {...}} ← Tool invocation request
                                                #   ]
                                                #
                                                # See: docs/adk/ADK-Event-Extraction-Guide.md
                                                # ═══════════════════════════════════════════════════════════════════
                                                content_obj = data.get("content")
                                                if content_obj and isinstance(content_obj, dict):
                                                    parts = content_obj.get("parts", [])
                                                    for part in parts:
                                                        if isinstance(part, dict):
                                                            # PART 1: Extract regular text streaming
                                                            # Used for: Model responses, status updates, explanations
                                                            text = part.get("text")
                                                            if text:
                                                                accumulated_content.append(text)

                                                            # PART 2: Extract functionResponse (CRITICAL!)
                                                            # Used for: Research plans, agent tool outputs, analysis results
                                                            # DO NOT REMOVE THIS SECTION - It extracts plan_generator output!
                                                            function_response = part.get("functionResponse")
                                                            if function_response and isinstance(function_response, dict):
                                                                response_data = function_response.get("response", {})
                                                                result_text = response_data.get("result")
                                                                if result_text:
                                                                    accumulated_content.append(result_text)
                                                                    logger.info(f"Extracted functionResponse content: {len(result_text)} chars")

                                                    # Broadcast update if we have content
                                                    if accumulated_content:
                                                        logger.info(f"Broadcasting research_update for session {session_id}, content length: {len(''.join(accumulated_content))}")
                                                        await broadcaster.broadcast_event(session_id, {
                                                            "type": "research_update",
                                                            "data": {
                                                                "content": "".join(accumulated_content),
                                                                "timestamp": datetime.now().isoformat()
                                                            }
                                                        })
                                                else:
                                                    # Log non-content events
                                                    event_type = data.get("invocationId") or data.get("id") or "unknown"
                                                    logger.debug(
                                                        f"ADK event (no content): {event_type}, "
                                                        f"keys={list(data.keys())[:10]}"
                                                    )
                                            except json.JSONDecodeError as e:
                                                logger.warning(f"Could not parse SSE data: {data_str[:100]} - {e}")
                                                # Check for rate limit errors in JSON parsing exceptions
                                                if "429" in data_str or "Too Many Requests" in data_str or "rate limit" in data_str.lower():
                                                    user_friendly_msg = "⚠️ API rate limit reached. The AI service is temporarily unavailable. Please try again in a few minutes or contact support if this persists."
                                                    await broadcaster.broadcast_event(session_id, {
                                                        "type": "error",
                                                        "data": {
                                                            "message": user_friendly_msg,
                                                            "error_code": "RATE_LIMIT_EXCEEDED",
                                                            "timestamp": datetime.now().isoformat()
                                                        }
                                                    })
                                                    session_store.update_session(session_id, status="error")
                                                    rate_limit_hit = True
                                                    break
                                            except Exception as e:
                                                logger.warning(f"Error processing SSE event: {e}")

                                logger.info(f"ADK stream completed for session {session_id}: {line_count} events processed")

                        # Only send completion events if rate limit was NOT hit
                        if not rate_limit_hit:
                            # Send final response with complete content
                            # CRITICAL FIX: Include final_content in research_complete payload
                            # The frontend now extracts the complete answer from this event
                            # to ensure full content is displayed (not just streaming chunks)
                            final_content = "".join(accumulated_content) if accumulated_content else "Research completed."

                            session_store.update_session(
                                session_id,
                                status="completed",
                                final_report=final_content,
                            )

                            await broadcaster.broadcast_event(session_id, {
                                "type": "research_complete",
                                "data": {
                                    "content": final_content,  # CRITICAL: Include complete content
                                    "status": "completed",
                                    "timestamp": datetime.now().isoformat()
                                }
                            })

                            logger.info(f"Agent execution completed for session {session_id}")
                        else:
                            logger.warning(f"Agent execution terminated due to rate limit for session {session_id}")

                except asyncio.CancelledError:
                    # CRIT-006: Handle task cancellation gracefully
                    logger.info(f"Agent execution cancelled for session {session_id}")
                    session_store.update_session(session_id, status="cancelled")
                    raise
                except Exception as e:
                    # CRIT-006: Proper error logging for task failures
                    logger.exception(f"Error in agent execution for session {session_id}: {e}")

                    assistant_message = {
                        "id": f"msg_{uuid.uuid4()}_assistant",
                        "role": "assistant",
                        "content": f"An error occurred during research: {e!s}",
                        "timestamp": datetime.now().isoformat(),
                    }
                    session_store.add_message(session_id, assistant_message)

                    await broadcaster.broadcast_event(session_id, {
                        "type": "error",
                        "data": {
                            "error": str(e),
                            "timestamp": datetime.now().isoformat()
                        }
                    })
                    session_store.update_session(session_id, status="error")

            # CRIT-006: Start ADK call in background with task tracking and timeout
            async def call_with_timeout():
                """Wrapper to enforce timeout on ADK call."""
                try:
                    # Default timeout of 300 seconds (5 minutes) for research tasks
                    await asyncio.wait_for(call_adk_and_stream(), timeout=300.0)
                except asyncio.TimeoutError:
                    logger.error(f"Task timeout for session {session_id} after 300 seconds")
                    session_store.update_session(session_id, status="timeout")
                    await broadcaster.broadcast_event(session_id, {
                        "type": "error",
                        "data": {
                            "error": "Task timed out after 5 minutes",
                            "timestamp": datetime.now().isoformat()
                        }
                    })

            # CRIT-006: Create and register task (cancellation handled automatically by register_task)
            task = asyncio.create_task(call_with_timeout())
            await broadcaster._session_manager.register_task(session_id, task)

            research_started = True
            logger.info(f"ADK request task created and registered for session {session_id}")

        except Exception as e:
            logger.error(f"Failed to initiate ADK call: {e!s}", exc_info=True)
            research_started = False

        # If research didn't start, log the error and raise an exception
        if not research_started:
            logger.error(f"Failed to start ADK research for session {session_id}")
            raise HTTPException(
                status_code=500,
                detail="Failed to start ADK research session.",
            )

        return {
            "success": True,
            "app_name": app_name,
            "user_id": user_id,
            "session_id": session_id,
            "message": "Research session started successfully",
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting ADK research session {session_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to start research session: {e!s}"
        )


@adk_router.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def get_session_sse(
    app_name: str,
    user_id: str,
    session_id: str,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> StreamingResponse:
    """
    GET endpoint for EventSource SSE connection (ADK-compliant).

    This endpoint provides SSE streaming for research progress events.

    Args:
        app_name: Application name
        user_id: User identifier
        session_id: Session identifier
        current_user: Optional authenticated user

    Returns:
        StreamingResponse with SSE events for the research session
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    # Log SSE connection
    logger.info(
        f"ADK SSE connection established: app={app_name}, user={user_id}, session={session_id}"
    )

    return StreamingResponse(
        agent_network_event_stream(session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@adk_router.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}/messages")
async def append_session_message(
    app_name: str,
    user_id: str,
    session_id: str,
    payload: SessionMessagePayload,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Persist a single message into the session store (ADK-compliant).

    Args:
        app_name: Application name
        user_id: User identifier
        session_id: Session identifier
        payload: Message payload
        current_user: Current authenticated user

    Returns:
        Stored message data
    """
    # Validate app name
    if app_name != DEFAULT_APP_NAME:
        raise HTTPException(status_code=404, detail=f"App '{app_name}' not found")

    stored = session_store.add_message(
        session_id,
        {
            "id": payload.id,
            "role": payload.role,
            "content": payload.content,
            "timestamp": payload.timestamp.isoformat(),
            "metadata": payload.metadata,
        },
    )

    session_store.update_session(
        session_id,
        status="running",
        user_id=current_user.id if current_user else user_id,
        title=payload.content[:60] if payload.role == "user" else None,
    )

    response = stored.to_dict()
    response["app_name"] = app_name
    response["user_id"] = user_id
    response["sessionId"] = session_id
    response["authenticated"] = current_user is not None

    return response


# ============================================================================
# BACKWARDS COMPATIBILITY ENDPOINTS WITH DEPRECATION WARNINGS
# ============================================================================


@adk_router.get("/api/sessions")
async def deprecated_list_chat_sessions(
    current_user: User | None = Depends(get_current_active_user_optional()),
) -> dict[str, Any]:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning("DEPRECATED: /api/sessions endpoint used. Please migrate to ADK format")
    return await list_user_sessions(DEFAULT_APP_NAME, DEFAULT_USER_ID, current_user)


@adk_router.get("/api/sessions/{session_id}")
async def deprecated_get_chat_session(
    session_id: str,
    current_user: User | None = Depends(get_current_active_user_optional()),
) -> dict[str, Any]:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions/{session_id} instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning(f"DEPRECATED: /api/sessions/{session_id} endpoint used. Please migrate to ADK format")
    return await get_user_session(DEFAULT_APP_NAME, DEFAULT_USER_ID, session_id, current_user)


@adk_router.put("/api/sessions/{session_id}")
async def deprecated_update_chat_session(
    session_id: str,
    payload: SessionUpdatePayload,
    current_user: User | None = Depends(get_current_active_user_optional()),
) -> dict[str, Any]:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions/{session_id} instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning(f"DEPRECATED: PUT /api/sessions/{session_id} endpoint used. Please migrate to ADK format")
    return await update_user_session(DEFAULT_APP_NAME, DEFAULT_USER_ID, session_id, payload, current_user)


@adk_router.delete("/api/sessions/{session_id}")
async def deprecated_delete_chat_session(
    session_id: str,
    current_user: User | None = Depends(get_current_active_user_optional()),
) -> dict[str, Any]:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions/{session_id} instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning(f"DEPRECATED: DELETE /api/sessions/{session_id} endpoint used. Please migrate to ADK format")
    return await delete_user_session(DEFAULT_APP_NAME, DEFAULT_USER_ID, session_id, current_user)


@adk_router.post("/api/sessions/{session_id}/messages")
async def deprecated_append_chat_message(
    session_id: str,
    payload: SessionMessagePayload,
    current_user: User | None = Depends(get_current_active_user_optional()),
) -> dict[str, Any]:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions/{session_id}/messages instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning(f"DEPRECATED: /api/sessions/{session_id}/messages endpoint used. Please migrate to ADK format")
    return await append_session_message(DEFAULT_APP_NAME, DEFAULT_USER_ID, session_id, payload, current_user)
