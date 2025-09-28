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
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.models import SessionMessagePayload
from app.utils.session_store import session_store
from app.utils.sse_broadcaster import get_sse_broadcaster, agent_network_event_stream

# Import authentication dependencies
try:
    from app.auth.security import current_active_user_dep
    from app.auth.models import User
except ImportError:
    # Fallback for environments without auth
    def current_active_user_dep() -> None:
        return None

    class User:
        def __init__(self):
            self.id = None
            self.email = None

# Import simple auth fallback
from app.simple_auth import get_current_active_user

logger = logging.getLogger(__name__)

# Create ADK router
adk_router = APIRouter(tags=["adk-compliant"])

# Constants for ADK compliance
DEFAULT_APP_NAME = "vana"
DEFAULT_USER_ID = "default"


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
    current_user: Optional[User] = Depends(get_current_active_user)
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
    current_user: Optional[User] = Depends(get_current_active_user)
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
    current_user: Optional[User] = Depends(get_current_active_user)
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
    current_user: Optional[User] = Depends(get_current_active_user)
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
    current_user: Optional[User] = Depends(get_current_active_user)
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


# ============================================================================
# ADK SESSION ACTIONS
# ============================================================================

@adk_router.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def run_session_sse(
    app_name: str,
    user_id: str,
    session_id: str,
    request: dict = Body(...),
    current_user: Optional[User] = Depends(get_current_active_user)
) -> dict:
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

        # Log research session start
        access_info = {
            "message": "ADK research session triggered",
            "app_name": app_name,
            "user_id": user_id,
            "session_id": session_id,
            "user_id_auth": current_user.id if current_user else None,
            "query": research_query[:100] + "..." if len(research_query) > 100 else research_query,
            "timestamp": datetime.now().isoformat(),
        }

        logger.info(f"ADK research session triggered: {access_info}")

        # Start research in background using SSE broadcaster
        try:
            from app.research_agents import get_research_orchestrator
            orchestrator = get_research_orchestrator()
            # Trigger research start (non-blocking)
            asyncio.create_task(
                orchestrator.start_research_with_broadcasting(session_id, research_query)
            )
        except ImportError:
            # Fallback if research agents not available
            logger.warning("Research agents not available, using mock response")
            # Mock research completion for testing
            from app.utils.sse_broadcaster import get_sse_broadcaster
            broadcaster = get_sse_broadcaster()
            asyncio.create_task(
                broadcaster.broadcast_event(session_id, {
                    "type": "research_complete",
                    "data": {"message": "Mock research completed"}
                })
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
    current_user: Optional[User] = Depends(get_current_active_user)
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
    current_user: Optional[User] = Depends(get_current_active_user)
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
# MAIN SSE ENDPOINT (Replaces /api/chat)
# ============================================================================

@adk_router.post("/run_sse")
async def main_chat_sse(
    request_data: dict = Body(...),
    current_user: Optional[User] = Depends(get_current_active_user),
) -> StreamingResponse:
    """
    Main SSE endpoint for chat (ADK-compliant replacement for /api/chat).

    This is the primary chat endpoint that handles messages and returns SSE stream.

    Args:
        request_data: Request containing message and optional session_id
        current_user: Current authenticated user

    Returns:
        StreamingResponse with SSE events for the chat session
    """
    # Extract message and session_id from request
    message = request_data.get("message", "")
    session_id = request_data.get("session_id", str(uuid.uuid4()))

    logger.info(f"Main SSE endpoint called with message: {message[:50]}...")

    # Ensure session exists in store
    session_store.ensure_session(
        session_id,
        user_id=current_user.id if current_user else None,
        title=message[:60] if message else "New Chat",
        status="active"
    )

    # Create SSE response
    async def generate():
        try:
            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'content': 'Initializing chat...'})}\n\n"
            await asyncio.sleep(0.1)

            # Send processing status
            yield f"data: {json.dumps({'type': 'agent', 'content': 'Processing your request...'})}\n\n"
            await asyncio.sleep(0.5)

            # Mock response content
            mock_response = f"I understand you're asking about: '{message}'. This is a mock response to verify the chat flow is working. The actual AI integration is currently being configured."

            # Send the response in chunks to simulate streaming
            words = mock_response.split()
            chunk_size = 5
            for i in range(0, len(words), chunk_size):
                chunk = ' '.join(words[i:i+chunk_size])
                yield f"data: {json.dumps({'type': 'result', 'content': chunk})}\n\n"
                await asyncio.sleep(0.1)

            # Send completion
            yield f"data: {json.dumps({'type': 'complete', 'content': 'Response complete'})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Error in main SSE generation: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ============================================================================
# BACKWARDS COMPATIBILITY ENDPOINTS WITH DEPRECATION WARNINGS
# ============================================================================

@adk_router.post("/api/chat")
async def deprecated_chat_endpoint(
    request_data: dict = Body(...),
    current_user: Optional[User] = Depends(get_current_active_user),
) -> StreamingResponse:
    """
    DEPRECATED: Use /run_sse instead.

    This endpoint is kept for backwards compatibility but should be migrated to /run_sse.
    """
    logger.warning("DEPRECATED: /api/chat endpoint used. Please migrate to /run_sse")
    return await main_chat_sse(request_data, current_user)


@adk_router.post("/api/run_sse/{session_id}")
async def deprecated_run_research_sse(
    session_id: str,
    request: dict = Body(...),
    current_user: Optional[User] = Depends(get_current_active_user),
) -> dict:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions/{session_id}/run instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning(f"DEPRECATED: /api/run_sse/{session_id} endpoint used. Please migrate to ADK format")
    return await run_session_sse(DEFAULT_APP_NAME, DEFAULT_USER_ID, session_id, request, current_user)


@adk_router.get("/api/run_sse/{session_id}")
async def deprecated_get_research_sse(
    session_id: str,
    current_user: Optional[User] = Depends(get_current_active_user)
) -> StreamingResponse:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions/{session_id}/run instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning(f"DEPRECATED: GET /api/run_sse/{session_id} endpoint used. Please migrate to ADK format")
    return await get_session_sse(DEFAULT_APP_NAME, DEFAULT_USER_ID, session_id, current_user)


@adk_router.get("/api/sessions")
async def deprecated_list_chat_sessions(
    current_user: Optional[User] = Depends(get_current_active_user),
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
    current_user: Optional[User] = Depends(get_current_active_user),
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
    current_user: Optional[User] = Depends(get_current_active_user),
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
    current_user: Optional[User] = Depends(get_current_active_user),
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
    current_user: Optional[User] = Depends(get_current_active_user),
) -> dict[str, Any]:
    """
    DEPRECATED: Use /apps/{app_name}/users/{user_id}/sessions/{session_id}/messages instead.

    This endpoint is kept for backwards compatibility.
    """
    logger.warning(f"DEPRECATED: /api/sessions/{session_id}/messages endpoint used. Please migrate to ADK format")
    return await append_session_message(DEFAULT_APP_NAME, DEFAULT_USER_ID, session_id, payload, current_user)