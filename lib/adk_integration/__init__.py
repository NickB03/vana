"""
ADK Integration Module for VANA

This module provides Google ADK-compliant event streaming and agent communication
infrastructure for seamless, silent agent coordination.
"""

from .event_stream import ADKEventStreamHandler
from .silent_handoff import SilentHandoffManager
from .main_integration import VANAEventProcessor, create_adk_processor

__all__ = [
    'ADKEventStreamHandler',
    'SilentHandoffManager', 
    'VANAEventProcessor',
    'create_adk_processor'
]