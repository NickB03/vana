"""
ADK integration package.

This package contains custom integrations with Google's Agent Development Kit (ADK).
"""

from app.integration.adk_init import get_fast_api_app_with_verified_sessions

__all__ = ["get_fast_api_app_with_verified_sessions"]
