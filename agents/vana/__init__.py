"""Vana research agent package for Google ADK.

This package contains a standalone multi-agent research system that can be
loaded and run by ADK without dependencies on the FastAPI backend.
"""

from .agent import root_agent

__all__ = ["root_agent"]
