"""
Shared ADK service instances for agent execution.
Initialized once and reused across routes.
"""
from google.adk.sessions import DatabaseSessionService
from google.adk.memory import InMemoryMemoryService
from google.adk.artifacts import InMemoryArtifactService
from google.adk.auth.credential_service.in_memory_credential_service import InMemoryCredentialService
import os
import tempfile

# Reuse same session DB as server.py (lines 219-220)
temp_dir = tempfile.gettempdir()
session_db = os.path.join(temp_dir, "vana_sessions.db")
session_uri = f"sqlite:///{session_db}"

# Initialize ADK services (singleton pattern)
# These are the same services ADK's get_fast_api_app() creates
session_service = DatabaseSessionService(db_url=session_uri)
memory_service = InMemoryMemoryService()
artifact_service = InMemoryArtifactService()
credential_service = InMemoryCredentialService()

__all__ = [
    "session_service",
    "memory_service",
    "artifact_service",
    "credential_service"
]