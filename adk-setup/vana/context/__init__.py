"""
Context Module for VANA

This module provides context management for the VANA project,
including context creation, serialization, and persistence.
"""

from .context_manager import ContextManager, Context

__all__ = [
    'ContextManager',
    'Context'
]
