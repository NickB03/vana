"""Basic environment test to verify setup is working."""
import pytest
import sys
import os

def test_python_version():
    """Test that Python version is correct."""
    assert sys.version_info >= (3, 13)

def test_imports():
    """Test that basic imports work."""
    import json
    import datetime
    import pathlib
    assert True

def test_project_structure():
    """Test that basic project files exist."""
    assert os.path.exists("pyproject.toml")
    assert os.path.exists("main.py")

@pytest.mark.asyncio
async def test_async_support():
    """Test that async support is working."""
    import asyncio
    await asyncio.sleep(0.001)
    assert True
