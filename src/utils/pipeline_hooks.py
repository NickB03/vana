"""
Pipeline Hooks System

Provides hooks for integrating with Claude Code's generation pipeline.
Supports pre-generation, post-generation, and validation hooks.
"""

import logging
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from typing import Any


class HookPriority(Enum):
    """Hook execution priority levels"""

    CRITICAL = 1000  # Security, validation
    HIGH = 100  # Context sanitization, formatting
    MEDIUM = 50  # Code analysis, optimization
    LOW = 10  # Logging, metrics


@dataclass
class Hook:
    """Represents a pipeline hook"""

    name: str
    function: Callable
    priority: int = HookPriority.MEDIUM.value
    enabled: bool = True
    description: str = ""


class HookRegistry:
    """Registry for managing pipeline hooks"""

    def __init__(self):
        self.hooks: dict[str, list[Hook]] = {
            "pre_generation": [],
            "post_generation": [],
            "pre_validation": [],
            "post_validation": [],
            "error_handler": [],
        }
        self.logger = logging.getLogger(__name__)

    def register_hook(
        self,
        stage: str,
        function: Callable,
        priority: int = HookPriority.MEDIUM.value,
        name: str | None = None,
    ) -> None:
        """Register a hook for a specific stage"""
        hook_name = name or f"{function.__name__}_{len(self.hooks[stage])}"

        hook = Hook(
            name=hook_name,
            function=function,
            priority=priority,
            description=getattr(function, "__doc__", ""),
        )

        if stage not in self.hooks:
            self.hooks[stage] = []

        self.hooks[stage].append(hook)
        # Sort by priority (highest first)
        self.hooks[stage].sort(key=lambda h: h.priority, reverse=True)

        self.logger.info(
            f"Registered hook '{hook_name}' for stage '{stage}' with priority {priority}"
        )

    def execute_hooks(self, stage: str, data: Any, **kwargs) -> Any:
        """Execute all hooks for a given stage"""
        if stage not in self.hooks:
            return data

        result = data
        for hook in self.hooks[stage]:
            if hook.enabled:
                try:
                    result = hook.function(result, **kwargs)
                except Exception as e:
                    self.logger.error(f"Hook '{hook.name}' failed: {e}")
                    # Continue with other hooks unless it's critical
                    if hook.priority >= HookPriority.CRITICAL.value:
                        raise

        return result


# Global hook registry
_hook_registry = HookRegistry()


# Convenience functions
def register_hook(
    stage: str, function: Callable, priority: int = HookPriority.MEDIUM.value
) -> None:
    """Register a hook function"""
    _hook_registry.register_hook(stage, function, priority)


def execute_hooks(stage: str, data: Any, **kwargs) -> Any:
    """Execute hooks for a stage"""
    return _hook_registry.execute_hooks(stage, data, **kwargs)


def get_hook_registry() -> HookRegistry:
    """Get the global hook registry"""
    return _hook_registry
