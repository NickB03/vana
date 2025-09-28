#!/usr/bin/env python3
"""
Direct agent module for ADK web interface.
This file provides a clean import of the root_agent without the app package structure.
"""

import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set required environment variables if not already set
os.environ.setdefault("SESSION_INTEGRITY_KEY", "dev_key_at_least_32_characters_long_for_session_security_validation")
os.environ.setdefault("AUTH_REQUIRE_SSE_AUTH", "false")
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "FALSE")

# Import the root agent from the app module
from app.agent import root_agent

__all__ = ["root_agent"]