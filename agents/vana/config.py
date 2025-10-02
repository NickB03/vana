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

"""Configuration for Vana ADK agents.

This is a standalone configuration module that doesn't depend on FastAPI
or other backend components. It's designed to work when ADK runs independently.
"""

import os
from dataclasses import dataclass, field

# Model configuration - using Gemini models
CRITIC_MODEL = "gemini-2.5-flash"  # Gemini 2.5 Flash for evaluation tasks
WORKER_MODEL = "gemini-2.5-flash"  # Gemini 2.5 Flash for generation tasks


@dataclass
class ResearchConfiguration:
    """Configuration for research-related models and parameters.

    Attributes:
        critic_model: Model name for evaluation tasks
        worker_model: Model name for working/generation tasks
        max_search_iterations: Maximum search iterations allowed
    """

    critic_model: str = CRITIC_MODEL
    worker_model: str = WORKER_MODEL
    max_search_iterations: int = field(
        default_factory=lambda: int(os.getenv("MAX_SEARCH_ITERATIONS", "5"))
    )


# Global configuration instance
config = ResearchConfiguration()


def get_config() -> ResearchConfiguration:
    """Get the global configuration object."""
    return config
