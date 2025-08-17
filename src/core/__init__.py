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
Core hook system components.

This package provides the essential components for the hook safety system,
including the main safety system, configuration management, alerting, and CLI.
"""

from .hook_safety_system import HookSafetySystem
from .hook_safety_config import (
    HookSafetyConfig,
    ValidationLevel,
    create_development_config,
    create_production_config,
)
from .hook_alerting_system import HookAlertingSystem
from .safety_system_cli import SafetySystemCLI

__all__ = [
    "HookSafetySystem",
    "HookSafetyConfig", 
    "ValidationLevel",
    "create_development_config",
    "create_production_config",
    "HookAlertingSystem",
    "SafetySystemCLI",
]