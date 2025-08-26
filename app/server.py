# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import asyncio
import json
import os
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

import google.auth
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from google.adk.cli.fast_api import get_fast_api_app

# Only import cloud logging if we have a real project
try:
    from google.cloud import logging as google_cloud_logging

    USE_CLOUD_LOGGING = True
except ImportError:
    USE_CLOUD_LOGGING = False
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, export

from app.utils.gcs import create_bucket_if_not_exists
from app.utils.session_backup import (
    create_periodic_backup_job,
    restore_session_db_from_gcs,
    setup_session_persistence_for_cloud_run,
)
from app.utils.sse_broadcaster import (
    get_agent_network_event_history,
    get_sse_broadcaster,
)
from app.utils.tracing import CloudTraceLoggingSpanExporter
from app.utils.typing import Feedback

# Get the project ID from Google Cloud authentication
# Handle CI environment where credentials might not be available
if os.environ.get("CI") == "true":
    # In CI environment, skip authentication and use environment variable
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "analystai-454200")
    print(f"CI Environment: Using project ID from environment: {project_id}")
else:
    try:
        _, project_id = google.auth.default()
        if not project_id:
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "analystai-454200")
            print(f"Using project ID from environment/config: {project_id}")
        else:
            print(f"Using authenticated project ID: {project_id}")
    except Exception as e:
        print(f"Authentication setup: {e}")
        project_id = "analystai-454200"
        print(f"Using project ID: {project_id}")
# Set up logging based on environment
if USE_CLOUD_LOGGING:
    try:
        logging_client = google_cloud_logging.Client(project=project_id)
        logger = logging_client.logger(__name__)
        print(f"Cloud logging initialized for project: {project_id}")
    except Exception as e:
        print(f"Could not initialize cloud logging: {e}")
        # Fall back to standard logging
        import logging

        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
else:
    # Use standard Python logging if cloud logging not available
    import logging

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)

# Create bucket name for the project
# Skip bucket creation in CI environment
if os.environ.get("CI") == "true":
    print("CI Environment: Skipping bucket creation")
    bucket_name = None
else:
    bucket_name = f"{project_id}-vana-logs-data"
    if bucket_name:
        try:
            create_bucket_if_not_exists(
                bucket_name=bucket_name, project=project_id, location="us-central1"
            )
        except Exception as e:
            if hasattr(logger, "log_struct"):
                logger.log_struct(
                    {
                        "message": "Could not create bucket, continuing without it",
                        "error": str(e),
                    },
                    severity="WARNING",
                )
            else:
                logger.warning(f"Could not create bucket, continuing without it: {e}")

# Set up tracing for the project
# Skip tracing in CI environment to avoid authentication issues
if os.environ.get("CI") == "true":
    print("CI Environment: Skipping tracing initialization")
else:
    try:
        provider = TracerProvider()
        processor = export.BatchSpanProcessor(CloudTraceLoggingSpanExporter())
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        print(f"Tracing initialized for project: {project_id}")
    except Exception as e:
        print(f"Could not initialize tracing: {e}")
        # Continue without tracing

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Persistent session storage configuration
# For Cloud Run deployment, we'll use a persistent volume or environment-based configuration
session_storage_bucket = f"{project_id}-vana-session-storage"

# Determine session storage approach based on environment
cloud_run_session_db_path = os.getenv("CLOUD_RUN_SESSION_DB_PATH")
if cloud_run_session_db_path:
    # Production: Use Cloud Run persistent volume with backup/restore
    session_service_uri = setup_session_persistence_for_cloud_run(
        project_id=project_id, session_db_path=cloud_run_session_db_path
    )
    if hasattr(logger, "log_struct"):
        logger.log_struct(
            {
                "message": "Using Cloud Run persistent session storage with backup/restore",
                "uri": session_service_uri,
            },
            severity="INFO",
        )
    else:
        logger.info(
            f"Using Cloud Run persistent session storage with backup/restore: {session_service_uri}"
        )
elif custom_session_db_uri := os.getenv("SESSION_DB_URI"):
    # Custom database URI (e.g., Cloud SQL)
    session_service_uri = custom_session_db_uri
    if hasattr(logger, "log_struct"):
        logger.log_struct(
            {"message": "Using custom session database", "uri": session_service_uri},
            severity="INFO",
        )
    else:
        logger.info(f"Using custom session database: {session_service_uri}")
else:
    # Development: Use local SQLite with backup to GCS
    # Security fix: Use more secure temp directory
    import os
    import tempfile

    temp_dir = tempfile.gettempdir()
    local_session_db = os.path.join(temp_dir, "vana_sessions.db")
    session_service_uri = f"sqlite:///{local_session_db}"

    # Ensure GCS bucket exists and try to restore from backup
    try:
        create_bucket_if_not_exists(
            bucket_name=session_storage_bucket,
            project=project_id,
            location="us-central1",
        )

        # Try to restore from latest backup if database doesn't exist
        if not os.path.exists(local_session_db):
            restore_session_db_from_gcs(
                local_db_path=local_session_db,
                bucket_name=session_storage_bucket,
                project_id=project_id,
            )

        # Start periodic backup (every 6 hours)
        create_periodic_backup_job(
            local_db_path=local_session_db,
            bucket_name=session_storage_bucket,
            project_id=project_id,
            interval_hours=6,
        )

        if hasattr(logger, "log_struct"):
            logger.log_struct(
                {
                    "message": "Session storage configured with local SQLite, GCS backup, and periodic backups",
                    "local_db": local_session_db,
                    "backup_bucket": session_storage_bucket,
                    "uri": session_service_uri,
                },
                severity="INFO",
            )
        else:
            logger.info(
                f"Session storage configured with local SQLite: {local_session_db}"
            )
    except Exception as e:
        if hasattr(logger, "log_struct"):
            logger.log_struct(
                {
                    "message": "Failed to configure session backup, using local-only sessions",
                    "local_db": local_session_db,
                    "error": str(e),
                },
                severity="WARNING",
            )
        else:
            logger.warning(
                f"Failed to configure session backup, using local-only sessions: {e}"
            )

# Initialize authentication database
from app.auth.config import get_auth_settings  # noqa: E402
from app.auth.database import init_auth_db  # noqa: E402
from app.auth.middleware import (  # noqa: E402
    AuditLogMiddleware,
    CORSMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.auth.models import User  # noqa: E402
from app.auth.routes import admin_router, auth_router, users_router  # noqa: E402
from app.auth.security import (  # noqa: E402
    current_active_user_dep,
    current_user_for_sse_dep,
)

# Initialize auth database
try:
    init_auth_db()
    print("Authentication database initialized")
except Exception as e:
    print(f"Warning: Could not initialize auth database: {e}")

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=f"gs://{bucket_name}" if bucket_name else None,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
)
app.title = "vana"
app.description = "API for interacting with the Agent vana"

# Add authentication routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)


# Add security middleware
app.add_middleware(CORSMiddleware, allowed_origins=allow_origins)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)
app.add_middleware(AuditLogMiddleware)


@app.get("/health")
async def health_check() -> dict[str, str | bool | None]:
    """Health check endpoint for service validation.

    Returns:
        Health status with timestamp and service information
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "vana",
        "version": "1.0.0",
        "session_storage_enabled": session_service_uri is not None,
        "session_storage_uri": session_service_uri,
        "session_storage_bucket": session_storage_bucket,
    }


@app.post("/feedback")
def collect_feedback(
    feedback: Feedback, current_user: User = current_active_user_dep
) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log
        current_user: Current authenticated user

    Returns:
        Success message
    """
    feedback_data = feedback.model_dump()
    feedback_data["user_id"] = current_user.id
    feedback_data["user_email"] = current_user.email

    if hasattr(logger, "log_struct"):
        logger.log_struct(feedback_data, severity="INFO")
    else:
        logger.info(f"Feedback received from user {current_user.id}: {feedback_data}")
    return {"status": "success"}


@app.get("/agent_network_sse/{session_id}")
async def agent_network_sse(
    session_id: str, current_user: User | None = current_user_for_sse_dep
) -> StreamingResponse:
    """Enhanced SSE endpoint for agent network events with optional authentication.

    This endpoint streams real-time agent network events including:
    - Agent start/completion events
    - Network topology changes
    - Performance metrics updates
    - Relationship and data flow tracking
    - Heartbeat/keepalive messages

    Authentication behavior depends on REQUIRE_SSE_AUTH environment variable:
    - True (production): Requires valid JWT token
    - False (demo): Optional authentication, logs access regardless

    Args:
        session_id: The session ID to stream events for
        current_user: Optional authenticated user (required in production mode)

    Returns:
        StreamingResponse with text/event-stream media type
    """

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events for the session."""
        broadcaster = get_sse_broadcaster()
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Log SSE access for audit trail
            auth_settings = get_auth_settings()
            user_info = {
                "user_id": current_user.id if current_user else None,
                "user_email": current_user.email if current_user else None,
                "authenticated": current_user is not None,
                "auth_required": auth_settings.require_sse_auth,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat(),
                "access_type": "sse_connection",
            }

            if hasattr(logger, "log_struct"):
                logger.log_struct(
                    {"message": "SSE connection established", **user_info},
                    severity="INFO",
                )
            else:
                logger.info(f"SSE connection established: {user_info}")

            # Send initial connection event with user context
            connection_data = {
                "type": "connection",
                "status": "connected",
                "sessionId": session_id,
                "timestamp": datetime.now().isoformat(),
                "authenticated": current_user is not None,
                "userId": current_user.id if current_user else None,
            }
            yield f"data: {json.dumps(connection_data)}\n\n"

            while True:
                try:
                    # Wait for events with timeout to send heartbeat
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                    if isinstance(event, str):
                        yield event
                    else:
                        yield (
                            event.to_sse_format()
                            if hasattr(event, "to_sse_format")
                            else str(event)
                        )

                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"

        except asyncio.CancelledError:
            logger.info(
                f"SSE connection cancelled for session {session_id}, user: {current_user.id if current_user else 'anonymous'}"
            )
        except Exception as e:
            error_info = {
                "message": "SSE stream error",
                "session_id": session_id,
                "user_id": current_user.id if current_user else None,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

            if hasattr(logger, "log_struct"):
                logger.log_struct(error_info, severity="ERROR")
            else:
                logger.error(f"Error in SSE stream: {error_info}")

            yield f"data: {json.dumps({'type': 'error', 'message': str(e), 'timestamp': datetime.now().isoformat()})}\n\n"
        finally:
            await broadcaster.remove_subscriber(session_id, queue)

            # Log disconnection
            disconnect_info = {
                "message": "SSE connection closed",
                "session_id": session_id,
                "user_id": current_user.id if current_user else None,
                "timestamp": datetime.now().isoformat(),
            }

            if hasattr(logger, "log_struct"):
                logger.log_struct(disconnect_info, severity="INFO")
            else:
                logger.info(f"SSE connection closed: {disconnect_info}")

            yield f"data: {json.dumps({'type': 'connection', 'status': 'disconnected', 'sessionId': session_id, 'timestamp': datetime.now().isoformat()})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@app.get("/agent_network_history")
async def get_agent_network_history(
    limit: int = 50, current_user: User | None = current_user_for_sse_dep
) -> dict[str, str | bool | int | list[dict[str, Any]] | None]:
    """Get recent agent network event history with optional authentication.

    Authentication behavior depends on REQUIRE_SSE_AUTH environment variable:
    - True (production): Requires valid JWT token
    - False (demo): Optional authentication, logs access regardless

    Args:
        limit: Maximum number of events to return (default: 50)
        current_user: Optional authenticated user (required in production mode)

    Returns:
        JSON array of recent agent network events
    """

    # Log history access for audit trail
    auth_settings = get_auth_settings()
    access_info = {
        "message": "Agent network history accessed",
        "user_id": current_user.id if current_user else None,
        "user_email": current_user.email if current_user else None,
        "authenticated": current_user is not None,
        "auth_required": auth_settings.require_sse_auth,
        "limit": limit,
        "timestamp": datetime.now().isoformat(),
        "access_type": "history_request",
    }

    if hasattr(logger, "log_struct"):
        logger.log_struct(access_info, severity="INFO")
    else:
        logger.info(f"Agent network history accessed: {access_info}")
    history = get_agent_network_event_history(limit)

    # Add user context to response if available
    return {
        "events": history,
        "authenticated": current_user is not None,
        "user_id": current_user.id if current_user else None,
        "timestamp": datetime.now().isoformat(),
    }


# Main execution
if __name__ == "__main__":
    # Security fix: Use more secure host binding for development
    # In production, this should be configured through environment variables
    import os

    import uvicorn

    host = os.getenv("VANA_HOST", "127.0.0.1")  # Default to localhost for security
    port = int(os.getenv("VANA_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
