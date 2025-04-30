"""
Orchestration Module for VANA

This module provides orchestration functionality for the VANA project,
including task routing, result synthesis, and agent coordination.
"""

from .result_synthesizer import ResultSynthesizer
from .task_router import TaskRouter

__all__ = [
    'ResultSynthesizer',
    'TaskRouter'
]
