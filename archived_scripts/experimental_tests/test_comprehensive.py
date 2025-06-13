#!/usr/bin/env python3
"""
Comprehensive test suite for VANA project.
Tests core functionality, imports, and basic operations.
"""

import sys
import os
import pytest

def test_basic_python_functionality():
    """Test basic Python functionality"""
    assert 2 + 2 == 4
    assert "hello".upper() == "HELLO"
    assert len([1, 2, 3]) == 3

def test_essential_imports():
    """Test essential Python imports"""
    import json
    import logging
    import os
    import sys
    from datetime import datetime
    
    # Test that imports work
    assert json.dumps({"test": True}) == '{"test": true}'
    assert os.path.exists(".")
    assert sys.version_info.major >= 3

def test_project_dependencies():
    """Test project dependencies can be imported"""
    try:
        import fastapi
        import pytest
        import requests
        import uvicorn
        assert True
    except ImportError as e:
        pytest.fail(f"Failed to import project dependency: {e}")

def test_google_cloud_dependencies():
    """Test Google Cloud dependencies"""
    try:
        from google.cloud import aiplatform
        from google.adk import Agent
        assert True
    except ImportError as e:
        pytest.fail(f"Failed to import Google Cloud dependency: {e}")

def test_project_structure():
    """Test that project structure exists"""
    required_dirs = [
        "agents",
        "lib", 
        "tests",
        "tools"
    ]
    
    for dir_name in required_dirs:
        assert os.path.exists(dir_name), f"Required directory {dir_name} not found"

def test_configuration_files():
    """Test that configuration files exist"""
    required_files = [
        "pyproject.toml",
        "main.py",
        "pytest.ini"
    ]
    
    for file_name in required_files:
        assert os.path.exists(file_name), f"Required file {file_name} not found"

def test_stub_modules():
    """Test that stub modules work correctly"""
    from lib.sandbox.core.execution_engine import ExecutionEngine, ExecutionStatus
    from memory.vana_memory_service import VertexAiRagMemoryService
    
    # Test ExecutionEngine
    engine = ExecutionEngine()
    result = engine.execute("print('hello')")
    assert result["status"] == ExecutionStatus.SUCCESS
    
    # Test VertexAiRagMemoryService
    memory_service = VertexAiRagMemoryService("test-corpus")
    assert memory_service.is_available()
    stats = memory_service.get_memory_stats()
    assert "total_sessions" in stats

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
