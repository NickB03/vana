"""
Custom ADK initialization with VerifiedSessionService.

This module provides a custom initialization for ADK that uses our
VerifiedSessionService to prevent session race conditions.

ADK Pattern: Custom service injection via AdkWebServer
Reference: docs/adk/refs/official-adk-python/src/google/adk/cli/fast_api.py
"""

import logging
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI
from google.adk.cli.utils.agent_loader import AgentLoader
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.artifacts.gcs_artifact_service import GcsArtifactService
from google.adk.auth.credential_service.in_memory_credential_service import (
    InMemoryCredentialService,
)
from google.adk.cli.adk_web_server import AdkWebServer
from google.adk.evaluation.local_eval_set_results_manager import LocalEvalSetResultsManager
from google.adk.evaluation.local_eval_sets_manager import LocalEvalSetsManager
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService

from app.services.verified_session_service import VerifiedSessionService

logger = logging.getLogger(__name__)


def get_fast_api_app_with_verified_sessions(
    *,
    agents_dir: str,
    session_service_uri: Optional[str] = None,
    session_db_kwargs: Optional[dict[str, Any]] = None,
    artifact_service_uri: Optional[str] = None,
    allow_origins: Optional[list[str]] = None,
    web: bool = True,
    adk_port: int = 8080,
) -> FastAPI:
    """
    Create ADK FastAPI app with VerifiedSessionService.

    This is a custom version of google.adk.cli.fast_api.get_fast_api_app()
    that uses our VerifiedSessionService to prevent session race conditions.

    Args:
        agents_dir: Directory containing agent definitions
        session_service_uri: Database URI for session storage
        session_db_kwargs: Additional database configuration
        artifact_service_uri: GCS bucket for artifact storage
        allow_origins: CORS origins
        web: Whether to include web UI assets
        adk_port: Port where ADK web server runs (for verification)

    Returns:
        FastAPI app with ADK routes and VerifiedSessionService

    Reference:
        Based on google.adk.cli.fast_api.get_fast_api_app()
        Modified to inject VerifiedSessionService
    """
    # Set up eval managers (copied from ADK)
    eval_sets_manager = LocalEvalSetsManager(agents_dir=agents_dir)
    eval_set_results_manager = LocalEvalSetResultsManager(agents_dir=agents_dir)

    # Build Memory service (copied from ADK)
    memory_service = InMemoryMemoryService()

    # Build Session service - THIS IS OUR CUSTOMIZATION
    if session_service_uri:
        logger.info(
            f"Creating VerifiedSessionService with URI: {session_service_uri}"
        )
        if session_db_kwargs is None:
            session_db_kwargs = {}

        # Use our VerifiedSessionService instead of DatabaseSessionService
        session_service = VerifiedSessionService(
            db_url=session_service_uri,
            adk_port=adk_port,
            verify_timeout=5,  # 5 second verification timeout
            **session_db_kwargs,
        )
        logger.info(
            "VerifiedSessionService initialized - sessions will be verified "
            "before being returned to prevent race conditions"
        )
    else:
        # Fall back to in-memory for development
        from google.adk.sessions.in_memory_session_service import (
            InMemorySessionService,
        )

        session_service = InMemorySessionService()
        logger.warning(
            "Using InMemorySessionService - sessions will not persist across restarts"
        )

    # Build Artifact service (copied from ADK)
    if artifact_service_uri:
        if artifact_service_uri.startswith("gs://"):
            gcs_bucket = artifact_service_uri.split("://")[1]
            artifact_service = GcsArtifactService(bucket_name=gcs_bucket)
        else:
            raise ValueError(f"Unsupported artifact service URI: {artifact_service_uri}")
    else:
        artifact_service = InMemoryArtifactService()

    # Build Credential service (copied from ADK)
    credential_service = InMemoryCredentialService()

    # Initialize Agent Loader (copied from ADK)
    agent_loader = AgentLoader(agents_dir)

    # Create AdkWebServer with our custom session service
    adk_web_server = AdkWebServer(
        agent_loader=agent_loader,
        session_service=session_service,  # Our VerifiedSessionService
        artifact_service=artifact_service,
        memory_service=memory_service,
        credential_service=credential_service,
        eval_sets_manager=eval_sets_manager,
        eval_set_results_manager=eval_set_results_manager,
        agents_dir=agents_dir,
    )

    # Set up web assets if requested (copied from ADK)
    extra_fast_api_args = {}
    if web:
        # ADK web UI assets
        BASE_DIR = Path(__file__).parent.parent.parent / "docs" / "adk" / "refs" / "official-adk-python" / "src" / "google" / "adk" / "cli"
        ANGULAR_DIST_PATH = BASE_DIR / "browser"
        if ANGULAR_DIST_PATH.exists():
            extra_fast_api_args["web_assets_dir"] = str(ANGULAR_DIST_PATH)
            logger.info(f"Serving ADK web UI from: {ANGULAR_DIST_PATH}")
        else:
            logger.warning(
                f"ADK web UI not found at {ANGULAR_DIST_PATH}, "
                "web UI will not be available"
            )

    # Create FastAPI app through AdkWebServer
    app = adk_web_server.get_fast_api_app(
        allow_origins=allow_origins,
        **extra_fast_api_args,
    )

    logger.info(
        "ADK FastAPI app created with VerifiedSessionService - "
        "session race conditions are prevented"
    )

    return app
