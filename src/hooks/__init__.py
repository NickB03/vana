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
Hook Orchestration System for Claude Code Integration

This package provides a comprehensive hook system that integrates with Claude Code's
tool execution pipeline, offering validation, security scanning, and performance monitoring.
"""

from .config.hook_config import HookConfig, ValidationLevel
from .orchestrator import (
    HookOrchestrator,
    ToolCall,
    ToolType,
    ValidationReport,
    ValidationResult,
    get_orchestrator,
    intercept_bash,
    intercept_multi_edit,
    intercept_write,
    reset_orchestrator,
)

__version__ = "1.0.0"
__all__ = [
    "HookConfig",
    "HookOrchestrator",
    "ToolCall",
    "ToolType",
    "ValidationLevel",
    "ValidationReport",
    "ValidationResult",
    "get_orchestrator",
    "intercept_bash",
    "intercept_multi_edit",
    "intercept_write",
    "reset_orchestrator"
]
