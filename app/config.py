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
from typing import Union

import google.auth
from google.adk.models.lite_llm import LiteLlm

from app.models import CRITIC_MODEL, WORKER_MODEL, ModelType

# To use AI Studio credentials:
# 1. Create a .env file in the /app directory with:
#    GOOGLE_GENAI_USE_VERTEXAI=FALSE
#    GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_API_KEY_HERE
# 2. This will override the default Vertex AI configuration
# Get the project ID from Google Cloud authentication
try:
    _, project_id = google.auth.default()
    if not project_id:
        # Fallback to environment variable or your specific project
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "analystai-454200")
        print(f"Using project ID from environment/config: {project_id}")
    else:
        print(f"Using authenticated project ID: {project_id}")
except Exception as e:
    print(f"Authentication error: {e}")
    # Use your specific project ID as fallback
    project_id = "analystai-454200"
    print(f"Using fallback project ID: {project_id}")

os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project_id)
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")


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
    session_storage_bucket: str = field(default_factory=lambda: f"{os.environ.get('GOOGLE_CLOUD_PROJECT', 'analystai-454200')}-vana-session-storage")
    session_backup_interval_hours: int = field(default=6)


config = ResearchConfiguration()
