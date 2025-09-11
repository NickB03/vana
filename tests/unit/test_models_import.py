"""
Test that models.py can be imported without side effects.

This test ensures that importing the models module doesn't trigger
environment loading or produce unwanted output.
"""

import sys
import io
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

import pytest

def test_models_import_no_side_effects():
    """Test that importing models.py doesn't cause side effects."""
    
    # Remove the models module if it's already imported
    if 'app.models' in sys.modules:
        del sys.modules['app.models']
    
    # Capture stdout and stderr to detect any print statements
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # Import the models module
        import app.models
        
    # Check that no output was produced
    stdout_output = stdout_capture.getvalue()
    stderr_output = stderr_capture.getvalue()
    
    assert stdout_output == "", f"Unexpected stdout output during import: {stdout_output}"
    assert stderr_output == "", f"Unexpected stderr output during import: {stderr_output}"
    
    # Verify that basic model classes are available
    assert hasattr(app.models, 'ResearchRequest')
    assert hasattr(app.models, 'ResearchResponse')
    assert hasattr(app.models, 'HealthResponse')


def test_environment_loader_functionality():
    """Test that the environment loader works correctly."""
    from app.utils.environment import load_environment, is_environment_loaded, reset_environment_loader
    
    # Reset to ensure clean state
    reset_environment_loader()
    assert not is_environment_loaded()
    
    # Load environment
    result = load_environment(silent=True)
    
    # Verify result structure
    assert 'status' in result
    assert 'source' in result
    assert 'message' in result
    assert result['status'] in ['loaded', 'no_file']
    
    # Verify loaded state
    assert is_environment_loaded()
    
    # Test that subsequent calls return cached result
    result2 = load_environment(silent=True)
    assert result2['status'] == 'already_loaded'


def test_model_instantiation():
    """Test that models can be instantiated correctly."""
    from app.models import ResearchRequest, ResearchResponse
    from datetime import datetime
    
    # Test ResearchRequest
    req = ResearchRequest(query="Test query")
    assert req.query == "Test query"
    assert req.session_id is None
    assert req.user_id is None
    
    # Test ResearchResponse
    resp = ResearchResponse(
        session_id="test-session",
        status="completed",
        message="Test completed"
    )
    assert resp.session_id == "test-session"
    assert resp.status == "completed"
    assert isinstance(resp.timestamp, datetime)