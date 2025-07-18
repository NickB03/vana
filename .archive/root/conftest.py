"""
Root conftest.py for VANA project pytest configuration.

This file contains global pytest configuration and plugins that apply
to the entire test suite. It must be at the project root to properly
configure pytest plugins.
"""

# Pytest plugins configuration - MUST be at root level
pytest_plugins = ["pytest_asyncio"]
