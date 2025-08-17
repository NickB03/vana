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
Utility components for hook system.

This package provides context sanitization and pipeline hooks for
integrating with Claude Code's generation pipeline.
"""

from .context_sanitizer import (
    ContextSanitizer,
    PatternRegistry,
    PlaceholderGenerator,
    PlaceholderStyle,
    SanitizationConfig,
    SanitizationError,
    SensitivePattern,
    create_custom_sanitizer,
    sanitize_context,
)
from .pipeline_hooks import (
    HookRegistry,
    Hook,
    HookPriority,
    register_hook,
    execute_hooks,
    get_hook_registry,
)

__all__ = [
    "ContextSanitizer",
    "PatternRegistry",
    "PlaceholderGenerator", 
    "PlaceholderStyle",
    "SanitizationConfig",
    "SanitizationError",
    "SensitivePattern",
    "create_custom_sanitizer",
    "sanitize_context",
    "HookRegistry",
    "Hook",
    "HookPriority",
    "register_hook",
    "execute_hooks",
    "get_hook_registry",
]