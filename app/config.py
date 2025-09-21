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

import os
from dataclasses import dataclass, field

# ``google.auth`` is an optional dependency.  The test environment used for the
# kata doesn't provide it which previously caused a ``ModuleNotFoundError`` at
# import time.  We import it lazily and fall back to ``None`` so that the rest of
# the module can operate with sensible defaults.
try:  # pragma: no cover - thin wrapper
    import google.auth  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    google = None

from app.models import CRITIC_MODEL, WORKER_MODEL, ModelType

# To use AI Studio credentials:
# 1. Create a .env file in the /app directory with:
#    GOOGLE_GENAI_USE_VERTEXAI=FALSE
#    GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_API_KEY_HERE
# 2. This will override the default Vertex AI configuration
# Global project ID - will be set by initialize_google_config()
_project_id: str | None = None


def initialize_google_config(silent: bool = False) -> str:
    """
    Initialize Google Cloud configuration.

    This function should be called explicitly during application startup
    to avoid import-time side effects.

    Args:
        silent: If True, suppress logging output

    Returns:
        The resolved project ID
    """
    global _project_id

    if _project_id is not None:
        return _project_id

    # Handle CI environment where credentials might not be available
    if os.environ.get("CI") == "true":
        # In CI environment, skip authentication and use environment variable
        _project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "analystai-454200")
        if not silent:
            print(f"CI Environment: Using project ID from environment: {_project_id}")
    else:
        if google is None:
            # Without the Google libraries we cannot perform ADC.  Fall back to
            # environment variables or a hard coded project id.
            _project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "analystai-454200")
            if not silent:
                print(
                    "google.auth not available, using project ID from environment: "
                    f"{_project_id}"
                )
        else:
            try:
                _, _project_id = google.auth.default()
                if not _project_id:
                    # Fallback to environment variable or your specific project
                    _project_id = os.environ.get(
                        "GOOGLE_CLOUD_PROJECT", "analystai-454200"
                    )
                    if not silent:
                        print(
                            f"Using project ID from environment/config: {_project_id}"
                        )
                else:
                    if not silent:
                        print(f"Using authenticated project ID: {_project_id}")
            except Exception as e:
                if not silent:
                    print(f"Authentication error: {e}")
                # Use your specific project ID as fallback
                _project_id = "analystai-454200"
                if not silent:
                    print(f"Using fallback project ID: {_project_id}")

    # Set environment defaults
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", _project_id)
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

    return _project_id


def get_project_id() -> str:
    """
    Get the current project ID.

    Returns:
        The project ID if initialized, otherwise initializes and returns it
    """
    if _project_id is None:
        return initialize_google_config(silent=True)
    return _project_id


@dataclass
class ResearchConfiguration:
    """Configuration for research-related models and parameters.

    Attributes:
        critic_model (Union[str, LiteLlm]): Model for evaluation tasks.
        worker_model (Union[str, LiteLlm]): Model for working/generation tasks.
        max_search_iterations (int): Maximum search iterations allowed.
        session_storage_enabled (bool): Whether persistent session storage is enabled.
        session_storage_bucket (str): GCS bucket name for session storage.
    """

    critic_model: ModelType = field(default_factory=lambda: CRITIC_MODEL)
    worker_model: ModelType = field(default_factory=lambda: WORKER_MODEL)
    max_search_iterations: int = 5
    session_storage_enabled: bool = field(default=True)
    session_storage_bucket: str = field(
        default_factory=lambda: f"{get_project_id()}-vana-session-storage"
    )
    session_backup_interval_hours: int = field(default=6)


config = ResearchConfiguration()


def get_config() -> ResearchConfiguration:
    """Get the global configuration object."""
    return config
