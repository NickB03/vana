"""
Test configuration and fixtures for VANA ADK evaluation tests.

This file sets up the test environment with proper Python path configuration,
API key mocking, and test fixtures for ADK evaluation.
"""

import os
import sys
import pytest
from pathlib import Path

# Add project root to Python path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set up test environment variables
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up test environment with mocked API key and proper configuration."""
    # Mock API key for testing
    os.environ["GOOGLE_API_KEY"] = "mock-api-key-for-testing"
    
    # Ensure .env.local doesn't interfere with tests
    if "test-key-for-evaluation" in os.environ.get("GOOGLE_API_KEY", ""):
        os.environ["GOOGLE_API_KEY"] = "mock-api-key-for-testing"
    
    # Set test environment flag
    os.environ["TESTING"] = "true"
    os.environ["ENV"] = "test"
    
    yield
    
    # Cleanup
    if "TESTING" in os.environ:
        del os.environ["TESTING"]
    if "ENV" in os.environ and os.environ["ENV"] == "test":
        del os.environ["ENV"]

@pytest.fixture
def mock_google_api():
    """Fixture to mock Google API responses for testing."""
    import unittest.mock
    
    # Mock the Google Generative AI client
    with unittest.mock.patch('google.generativeai.GenerativeModel') as mock_model:
        # Create a mock response
        mock_response = unittest.mock.MagicMock()
        mock_response.text = "Mocked response from Google API"
        mock_response.parts = [unittest.mock.MagicMock(text="Mocked response from Google API")]
        
        # Configure the mock
        mock_instance = mock_model.return_value
        mock_instance.generate_content.return_value = mock_response
        
        yield mock_instance

@pytest.fixture
def test_agent():
    """Fixture to provide a test agent for evaluation."""
    try:
        from agents.vana.agent import root_agent
        return root_agent
    except ImportError as e:
        pytest.skip(f"Cannot import agent: {e}")

# Test markers
pytest_plugins = []

def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "adk: marks tests that require ADK evaluation"
    )
    config.addinivalue_line(
        "markers", "requires_api: marks tests that require real API keys"
    )

@pytest.fixture
def adk_available():
    """Check if ADK evaluation is available."""
    try:
        from google.adk.evaluation.agent_evaluator import AgentEvaluator
        return True
    except ImportError:
        return False

@pytest.fixture
def skip_if_no_adk(adk_available):
    """Skip test if ADK is not available."""
    if not adk_available:
        pytest.skip("ADK evaluation not available")