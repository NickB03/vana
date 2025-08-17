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

"""
Real-time feedback system.

This package provides WebSocket-based real-time feedback for hook validation
results with SSE integration and event buffering.
"""

from .realtime_feedback import (
    RealtimeFeedback,
    FeedbackEvent,
    get_feedback_system,
    reset_feedback_system,
)

__all__ = [
    "RealtimeFeedback",
    "FeedbackEvent", 
    "get_feedback_system",
    "reset_feedback_system",
]