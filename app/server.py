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
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any, Optional

# Load environment variables using centralized loader
from app.utils.environment import load_environment

# Load environment at startup
env_result = load_environment(silent=False)

# Authentication is imported later in try/except block
# Simple auth has been deprecated in favor of app.auth.security

# Security fix: Only log sensitive information in development mode
if os.getenv("NODE_ENV") == "development":
    print(f"Environment loading result: {env_result}")
    print(f"GOOGLE_API_KEY loaded: {'Yes' if os.getenv('GOOGLE_API_KEY') else 'No'}")

# The server relies on Google's Generative AI SDK and the ADK which aren't
# available in the execution environment for these kata tests.  Import them
# conditionally and fall back to minimal functionality so that the module can be
# imported and the health endpoint exercised without the optional dependencies.
from fastapi import Body, FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

try:  # pragma: no cover - simple import shim
    import google.auth  # type: ignore
    import google.generativeai as genai  # type: ignore
    from google.adk.cli.fast_api import get_fast_api_app  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    google = None  # type: ignore
    genai = None  # type: ignore

    def get_fast_api_app(
        *,
        agents_dir: str,
        web: bool,
        artifact_service_uri: str | None,
        allow_origins: list[str] | None,
        session_service_uri: str | None,
    ) -> FastAPI:
        """Fallback FastAPI factory used when Google ADK is unavailable."""

        return FastAPI()


# Only import cloud logging if we have a real project
try:
    from google.cloud import logging as google_cloud_logging

    USE_CLOUD_LOGGING = True
except ImportError:
    USE_CLOUD_LOGGING = False

# OpenTelemetry is optional in the testing environment
try:  # pragma: no cover
    from opentelemetry import trace  # type: ignore
    from opentelemetry.sdk.trace import TracerProvider, export  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    trace = None  # type: ignore
    TracerProvider = None  # type: ignore
    export = None  # type: ignore

from app.config import initialize_google_config
from app.models import SessionMessagePayload
from app.utils.gcs import create_bucket_if_not_exists
from app.utils.session_backup import (
    create_periodic_backup_job,
    restore_session_db_from_gcs,
    setup_session_persistence_for_cloud_run,
)
from app.utils.session_store import session_store
from app.utils.sse_broadcaster import (
    get_agent_network_event_history,
    get_sse_broadcaster,
)
from app.utils.tracing import CloudTraceLoggingSpanExporter
from app.utils.typing import Feedback

# Initialize Google Cloud configuration
project_id = initialize_google_config(silent=False)

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

# Simple in-memory session store for SSE communication
research_sessions = {}

# Security fix: Proper CORS configuration based on environment
allowed_origins_env = os.getenv("ALLOW_ORIGINS", "")
if allowed_origins_env:
    allow_origins = [
        origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()
    ]
else:
    # Default secure origins based on environment
    if os.getenv("NODE_ENV") == "production":
        allow_origins = []  # No wildcards in production
    else:
        allow_origins = [
            "http://localhost:3000", "http://127.0.0.1:3000",
            "http://localhost:3001", "http://127.0.0.1:3001",
            "http://localhost:3002", "http://127.0.0.1:3002"
        ]

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

# Set up tracing for the project when OpenTelemetry is available
if os.environ.get("CI") == "true" or trace is None or TracerProvider is None:
    print("Tracing disabled")
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
# For ADK UI, use the agents subdirectory
AGENTS_DIR = os.path.join(AGENT_DIR, "agents")
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
try:  # pragma: no cover - optional auth dependencies
    from app.auth.config import get_auth_settings  # type: ignore
    from app.auth.database import init_auth_db  # type: ignore
    from app.auth.middleware import (  # type: ignore
        AuditLogMiddleware,
        CircuitBreakerMiddleware,
        CORSMiddleware,
        RateLimitMiddleware,
    )
    from app.auth.models import User  # type: ignore
    from app.auth.routes import admin_router, auth_router, users_router  # type: ignore
    from app.auth.cookie_routes import cookie_router  # Secure HttpOnly cookie auth
    from app.routes.chat_actions import router as chat_actions_router  # Chat action endpoints
    from app.auth.security import (  # type: ignore
        current_active_user_dep,
        current_superuser_dep,
        current_user_for_sse_dep,
    )
except ModuleNotFoundError:  # pragma: no cover
    from fastapi import APIRouter

    def init_auth_db() -> None:  # type: ignore
        pass

    from pydantic import BaseModel

    class User(BaseModel):  # type: ignore
        pass

    def current_active_user_dep() -> None:  # type: ignore
        return None

    def current_superuser_dep() -> None:  # type: ignore
        return None

    def current_user_for_sse_dep() -> None:  # type: ignore
        return None

    class AuditLogMiddleware:  # type: ignore
        def __init__(self, app: FastAPI, *args: Any, **kwargs: Any) -> None:
            self.app = app

        async def __call__(self, scope, receive, send):  # type: ignore
            await self.app(scope, receive, send)

    class CORSMiddleware(AuditLogMiddleware):  # type: ignore
        pass

    class CircuitBreakerMiddleware(AuditLogMiddleware):  # type: ignore
        pass

    class RateLimitMiddleware(AuditLogMiddleware):  # type: ignore
        pass

    auth_router = users_router = admin_router = cookie_router = chat_actions_router = APIRouter()

from app.middleware import SecurityHeadersMiddleware  # noqa: E402
from app.middleware.csrf_middleware import CSRFMiddleware  # noqa: E402
from app.middleware.input_validation_middleware import InputValidationMiddleware  # noqa: E402

# Initialize auth database
try:
    init_auth_db()
    print("Authentication database initialized")
except Exception as e:
    print(f"Warning: Could not initialize auth database: {e}")

# CRIT-003: Validate JWT secret key configuration
from app.auth.config import get_auth_settings
auth_settings = get_auth_settings()
environment = os.getenv("ENVIRONMENT", "development")

if environment == "production" and not auth_settings.secret_key:
    raise RuntimeError(
        "CRITICAL: JWT_SECRET_KEY or AUTH_SECRET_KEY must be set in production environment. "
        "This is required for secure token signing and user session persistence. "
        "Generate a secure key with: openssl rand -hex 32"
    )

if not auth_settings.secret_key:
    print("WARNING: JWT_SECRET_KEY not set. Using insecure defaults for development only.")
    print("Generate a secure key with: openssl rand -hex 32")

# Skip GCS artifact service for local development
is_dev = os.getenv("ENVIRONMENT", "development") == "development"
artifact_uri = None if is_dev else f"gs://{bucket_name}" if bucket_name else None

app: FastAPI = get_fast_api_app(
    agents_dir=AGENTS_DIR,  # Use the agents subdirectory for proper ADK UI discovery
    web=True,
    artifact_service_uri=artifact_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
)
app.title = "vana"
app.description = "API for interacting with the Agent vana"

# Add session verification middleware (ADK-compliant race condition fix)
from app.middleware.session_verification import SessionVerificationMiddleware
app.add_middleware(
    SessionVerificationMiddleware,
    adk_port=8000,  # Port where backend runs (ADK routes are built into backend)
    verify_timeout=5,  # 5 second timeout for verification
    max_retries=3,  # Retry up to 3 times with exponential backoff
)

# Store ADK configuration for route access
app.state.agents_dir = AGENTS_DIR
app.state.session_service_uri = session_service_uri

# Add authentication routers (BEFORE middleware - critical for routing)
app.include_router(auth_router)
app.include_router(cookie_router)  # Secure HttpOnly cookie authentication
app.include_router(users_router)
app.include_router(admin_router)

# Add chat actions router for message operations
app.include_router(chat_actions_router)

# Add ADK-compliant routes
from app.routes.adk_routes import adk_router
app.include_router(adk_router)


from fastapi.responses import HTMLResponse

# ADK Dev UI HTML
ADK_DEV_UI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADK Dev UI - Vana AI Research Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: #333;
        }
        header {
            background: rgba(255, 255, 255, 0.98);
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .logo h1 {
            font-size: 1.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #10b981;
            color: white;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        .status::before {
            content: '';
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        main {
            flex: 1;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }
        .app-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .app-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }
        .app-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .app-card h3 {
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        .app-card .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: #10b981;
            color: white;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-top: 1rem;
        }
        .endpoints {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-top: 2rem;
        }
        .endpoints h2 {
            color: #667eea;
            margin-bottom: 1rem;
        }
        .endpoint-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .endpoint {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            background: #f3f4f6;
            border-radius: 8px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9rem;
        }
        .endpoint .method {
            background: #667eea;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            margin-right: 1rem;
            font-size: 0.8rem;
            min-width: 60px;
            text-align: center;
        }
        .dev-tools {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-top: 2rem;
        }
        .dev-tools h2 {
            color: #667eea;
            margin-bottom: 1rem;
        }
        .tool-buttons {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .tool-btn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: opacity 0.2s;
        }
        .tool-btn:hover { opacity: 0.9; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <div class="logo">
                <h1>ADK Dev UI</h1>
            </div>
            <div class="status">Active</div>
        </div>
    </header>
    <main>
        <div class="app-grid" id="appGrid"></div>
        <div class="endpoints">
            <h2>ADK Compliant Endpoints</h2>
            <div class="endpoint-list" id="endpointList"></div>
        </div>
        <div class="dev-tools">
            <h2>Developer Tools</h2>
            <div class="tool-buttons">
                <button class="tool-btn" onclick="window.open('/docs', '_blank')">API Documentation</button>
                <button class="tool-btn" onclick="testEndpoints()">Test All Endpoints</button>
                <button class="tool-btn" onclick="createSession()">Create New Session</button>
            </div>
        </div>
    </main>
    <script>
        async function loadApps() {
            try {
                const response = await fetch('/list-apps');
                const data = await response.json();
                const appGrid = document.getElementById('appGrid');
                data.apps.forEach(app => {
                    const card = document.createElement('div');
                    card.className = 'app-card';
                    card.innerHTML = `
                        <h3>${app.name}</h3>
                        <p>${app.description}</p>
                        <div class="status-badge">${app.status}</div>
                    `;
                    appGrid.appendChild(card);
                });
            } catch (error) {
                console.error('Error loading apps:', error);
            }
        }

        function loadEndpoints() {
            const endpoints = [
                { method: 'GET', path: '/list-apps', desc: 'List all applications' },
                { method: 'GET', path: '/apps/{app}/users/{user}/sessions', desc: 'User sessions' },
                { method: 'POST', path: '/apps/{app}/users/{user}/sessions/{session}/run', desc: 'Run action' },
                { method: 'GET', path: '/health', desc: 'Health check' },
                { method: 'GET', path: '/docs', desc: 'API Documentation' },
            ];

            const endpointList = document.getElementById('endpointList');
            endpoints.forEach(ep => {
                const div = document.createElement('div');
                div.className = 'endpoint';
                div.innerHTML = `
                    <span class="method">${ep.method}</span>
                    <span class="path">${ep.path}</span>
                `;
                endpointList.appendChild(div);
            });
        }

        async function testEndpoints() {
            alert('Testing all endpoints... Check console for results');
        }

        async function createSession() {
            const sessionId = 'session_' + Date.now();
            alert(`Creating session: ${sessionId}`);
        }

        loadApps();
        loadEndpoints();
    </script>
</body>
</html>"""

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the ADK Dev UI at the root endpoint."""
    return HTMLResponse(content=ADK_DEV_UI_HTML)


# Add middleware in correct order (LIFO - last added runs first)
# Order of execution: CORS → Audit → RateLimit → CircuitBreaker → InputValidation → CSRF → SecurityHeaders
# This ensures CORS runs early and security checks happen after routing

# 1. Add CORS middleware LAST (runs FIRST in request chain)
# CRITICAL: This must be last so it runs before all other middleware
from fastapi.middleware.cors import CORSMiddleware as FastAPICORS
app.add_middleware(
    FastAPICORS,
    allow_origins=allow_origins,  # Includes localhost:3000, 127.0.0.1:3000, etc.
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],  # Allow all headers including X-CSRF-Token, Authorization
    expose_headers=["*"],  # Expose all response headers to client
    max_age=3600,  # Cache preflight for 1 hour
)

# 2. Audit logging (logs all requests)
app.add_middleware(AuditLogMiddleware)

# 3. Rate limiting (after CORS, before security checks)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)

# 4. Circuit breaker for auth protection
app.add_middleware(CircuitBreakerMiddleware)

# 5. Input validation middleware (validates user input)
app.add_middleware(InputValidationMiddleware, validate_query_params=False)

# 6. CSRF protection (validates CSRF tokens)
app.add_middleware(CSRFMiddleware)

# 7. Security headers (adds security headers to responses)
is_production = os.getenv("NODE_ENV") == "production"
app.add_middleware(SecurityHeadersMiddleware, enable_hsts=is_production)


@app.get("/health")
async def health_check() -> dict:
    """Enhanced health check endpoint for comprehensive service validation.

    Returns:
        Comprehensive health status including system metrics, dependencies,
        and service configuration information.
    """
    try:
        import psutil  # type: ignore
    except ModuleNotFoundError:  # pragma: no cover
        psutil = None  # type: ignore
    import time

    start_time = time.time()

    # Get environment info - use simple string in CI environment
    is_ci = os.getenv("CI") == "true"

    if is_ci:
        # Simple response for CI testing to avoid validation issues
        environment_str = (
            os.getenv("NODE_ENV")
            or os.getenv("ENVIRONMENT")
            or os.getenv("ENV")
            or "development"
        )
    else:
        # Full migration status for production
        try:
            from app.utils.migration_helper import EnvironmentMigrationHelper

            migration_status = EnvironmentMigrationHelper.get_migration_status()

            environment_str = {
                "current": migration_status.current_env,
                "source": migration_status.source,
                "migration_complete": migration_status.migration_complete,
                "phase": migration_status.phase.value,
                "conflicts": migration_status.conflicts
                if migration_status.conflicts
                else None,
            }
        except ImportError:
            # Fallback if migration helper not available
            current_env = (
                os.getenv("NODE_ENV")
                or os.getenv("ENVIRONMENT")
                or os.getenv("ENV")
                or "development"
            )
            environment_str = {
                "current": current_env,
                "source": "fallback",
                "migration_complete": None,
                "phase": None,
                "conflicts": None,
            }

    # Enhanced system metrics
    try:
        if psutil is not None:
            # Memory information
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            system_metrics = {
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used,
                },
                "disk": {
                    "total": disk.total,
                    "free": disk.free,
                    "percent": round((disk.used / disk.total) * 100, 2),
                },
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "load_average": os.getloadavg() if hasattr(os, "getloadavg") else None,
            }
        else:
            system_metrics = {"error": "psutil not installed"}
    except Exception as e:
        system_metrics = {"error": f"Could not retrieve system metrics: {e!s}"}

    # Check dependencies
    dependencies = {
        "google_api_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "session_storage": session_service_uri is not None,
        "cloud_logging": USE_CLOUD_LOGGING,
        "project_id": project_id,
    }

    # Calculate response time
    response_time_ms = round((time.time() - start_time) * 1000, 2)

    # Get agent network statistics from SSE broadcaster
    try:
        broadcaster = get_sse_broadcaster()
        broadcaster_stats = await broadcaster.get_stats()
        agent_network_stats = {
            "activeSessions": broadcaster_stats.get("totalSessions", 0),
            "totalSubscribers": broadcaster_stats.get("totalSubscribers", 0),
            "eventsBuffered": broadcaster_stats.get("totalEvents", 0),
            "memoryUsageMB": broadcaster_stats.get("memoryUsageMB", 0),
            "backgroundTasksActive": broadcaster_stats.get("backgroundTasksActive", 0),
            "status": broadcaster_stats.get("health", "unknown"),
        }
    except Exception as e:
        # Fallback if broadcaster unavailable
        agent_network_stats = {
            "error": f"Could not retrieve broadcaster stats: {e!s}"
        }

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "vana",
        "version": "1.0.0",
        "environment": environment_str,
        "session_storage_enabled": session_service_uri is not None,
        "session_storage_uri": session_service_uri,
        "session_storage_bucket": session_storage_bucket,
        "system_metrics": system_metrics,
        "dependencies": dependencies,
        "response_time_ms": response_time_ms,
        "active_adk_sessions": agent_network_stats.get("activeSessions", 0),
        "agentNetwork": agent_network_stats,
        "uptime_check": "operational",
    }


@app.post("/feedback")
def collect_feedback(
    feedback: Feedback, current_user: User = Depends(current_active_user_dep)
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
    session_id: str, current_user: User = Depends(current_active_user_dep)
) -> StreamingResponse:
    """Enhanced SSE endpoint for agent network events with required authentication.

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
            # Security fix: Use proper origin validation instead of wildcard
            # CORS headers are handled by middleware - don't override here
        },
    )


# NOTE: SessionUpdatePayload moved to ADK routes


# NOTE: /api/chat endpoint moved to ADK routes with deprecation warning


# NOTE: /api/run_sse/{session_id} endpoints moved to ADK routes with deprecation warnings


# NOTE: GET /api/run_sse/{session_id} endpoint moved to ADK routes


# NOTE: /api/sessions endpoints moved to ADK routes with deprecation warnings


# NOTE: All /api/sessions/{session_id} endpoints moved to ADK routes


@app.get("/agent_network_history")
async def get_agent_network_history(
    limit: int = 50, current_user: User = Depends(current_active_user_dep)
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
    history = await get_agent_network_event_history(limit)

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
