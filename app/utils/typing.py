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
import uuid
from typing import (
    Literal,
)

# Optional Google GenAI and ADK dependencies are imported lazily so that this
# module can be used in environments where those packages aren't installed.
try:  # pragma: no cover
    from google.adk.events.event import Event  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    from typing import Any as Event  # type: ignore

try:  # pragma: no cover
    from google.genai.types import Content  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    from typing import Any as Content  # type: ignore
from pydantic import (
    BaseModel,
    Field,
)


class Request(BaseModel):
    """Represents the input for a chat request with optional configuration."""

    message: Content
    events: list[Event]
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    model_config = {"extra": "allow", "arbitrary_types_allowed": True}


class Feedback(BaseModel):
    """Represents feedback for a conversation."""

    score: int | float
    text: str | None = ""
    invocation_id: str
    log_type: Literal["feedback"] = "feedback"
    service_name: Literal["vana"] = "vana"
    user_id: str = ""
