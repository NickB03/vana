"""
Pytest Configuration for VANA Tests
Shared fixtures and configuration for all tests
"""

import pytest
import os
import sys
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import Mock, patch
import tempfile
import shutil

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Import ADK components for testing
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool


# Global Test Configuration
@pytest.fixture(scope="session")
def test_environment():
    """Set up test environment variables."""
    original_env = os.environ.copy()
    
    # Set test environment variables
    test_env = {
        "GOOGLE_API_KEY": "test-api-key",
        "ENVIRONMENT": "test",
        "LOG_LEVEL": "DEBUG",
        "TEST_MODE": "true"
    }
    
    os.environ.update(test_env)
    
    yield test_env
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


# Session Management Fixtures
@pytest.fixture
def session_service():
    """Provide a fresh session service for each test."""
    return InMemorySessionService()


@pytest.fixture
def test_session(session_service):
    """Create a test session with default state."""
    user_id = "test_user"
    session_id = "test_session_001"
    
    initial_state = {
        "user_preferences": {
            "language": "en",
            "verbosity": "normal"
        },
        "conversation_history": [],
        "task_context": {}
    }
    
    session_service.create_session(
        app_name="vana_test",
        user_id=user_id,
        session_id=session_id,
        state=initial_state
    )
    
    return {
        "user_id": user_id,
        "session_id": session_id,
        "service": session_service,
        "initial_state": initial_state
    }


# Agent Creation Fixtures
@pytest.fixture
def mock_agent_factory():
    """Factory for creating mock agents with common patterns."""
    def create_agent(
        name: str = "test_agent",
        model: str = "gemini-2.5-flash",
        description: str = "Test agent",
        instruction: str = "You are a test agent.",
        tools: List[Any] = None,
        sub_agents: List[Any] = None
    ) -> LlmAgent:
        return LlmAgent(
            name=name,
            model=model,
            description=description,
            instruction=instruction,
            tools=tools or [],
            sub_agents=sub_agents or []
        )
    
    return create_agent


@pytest.fixture
def mock_specialists(mock_agent_factory):
    """Create a set of mock specialist agents."""
    specialists = {
        "security": mock_agent_factory(
            name="security_specialist",
            description="Security analysis specialist",
            instruction="Focus on security vulnerabilities and best practices."
        ),
        "architecture": mock_agent_factory(
            name="architecture_specialist",
            description="Software architecture specialist",
            instruction="Focus on design patterns and code structure."
        ),
        "data": mock_agent_factory(
            name="data_science_specialist",
            description="Data analysis specialist",
            instruction="Focus on data analysis and insights."
        )
    }
    return specialists


# Tool Fixtures
@pytest.fixture
def mock_tools():
    """Collection of mock tools for testing."""
    def text_analyzer(text: str) -> str:
        return f"Analyzed {len(text)} characters"
    
    def code_scanner(code: str) -> str:
        issues = []
        if "eval(" in code:
            issues.append("eval usage")
        if "password" in code:
            issues.append("password exposure")
        return f"Found {len(issues)} issues: {issues}"
    
    def data_processor(data: str) -> str:
        return f"Processed data with {len(data.split())} words"
    
    return {
        "text_analyzer": FunctionTool(text_analyzer),
        "code_scanner": FunctionTool(code_scanner),
        "data_processor": FunctionTool(data_processor)
    }


# File System Fixtures
@pytest.fixture
def temp_workspace():
    """Create a temporary workspace for file operations."""
    temp_dir = tempfile.mkdtemp(prefix="vana_test_")
    
    # Create some test files
    test_files = {
        "README.md": "# Test Project\nThis is a test project.",
        "main.py": "def main():\n    print('Hello, VANA!')",
        "config.json": '{"name": "test", "version": "1.0.0"}',
        "data.csv": "id,value\n1,100\n2,200\n3,300"
    }
    
    for filename, content in test_files.items():
        file_path = Path(temp_dir) / filename
        file_path.write_text(content)
    
    yield temp_dir
    
    # Cleanup
    shutil.rmtree(temp_dir)


# Mock Response Fixtures
@pytest.fixture
def mock_agent_responses():
    """Predefined agent responses for consistent testing."""
    return {
        "security_scan": {
            "success": "Security scan complete. No vulnerabilities found.",
            "warning": "Security scan found 2 medium-severity issues.",
            "error": "Security scan failed: Invalid input format."
        },
        "architecture_review": {
            "success": "Architecture follows best practices. Well-structured code.",
            "warning": "Architecture has minor issues: Consider refactoring large modules.",
            "error": "Architecture review failed: Unable to parse codebase."
        },
        "data_analysis": {
            "success": "Data analysis complete. Key insights: positive trend observed.",
            "warning": "Data analysis: Missing 15% of expected data points.",
            "error": "Data analysis failed: Invalid data format."
        }
    }


# Assertion Helpers
@pytest.fixture
def assertion_helpers():
    """Custom assertion helpers for VANA tests."""
    class AssertionHelpers:
        @staticmethod
        def assert_valid_agent(agent: LlmAgent):
            """Assert agent has all required properties."""
            assert hasattr(agent, 'name')
            assert hasattr(agent, 'model')
            assert hasattr(agent, 'description')
            assert hasattr(agent, 'instruction')
            assert agent.name is not None
            assert agent.model is not None
        
        @staticmethod
        def assert_valid_response(response: str, min_length: int = 10):
            """Assert response meets quality standards."""
            assert isinstance(response, str)
            assert len(response) >= min_length
            assert response.strip() != ""
            assert not response.startswith("Error:") or "gracefully" in response
        
        @staticmethod
        def assert_contains_keywords(text: str, keywords: List[str], all_required: bool = False):
            """Assert text contains keywords."""
            if all_required:
                for keyword in keywords:
                    assert keyword.lower() in text.lower(), f"Missing keyword: {keyword}"
            else:
                assert any(keyword.lower() in text.lower() for keyword in keywords), \
                    f"No keywords found. Expected one of: {keywords}"
    
    return AssertionHelpers()


# Performance Testing Fixtures
@pytest.fixture
def performance_timer():
    """Timer for performance testing."""
    import time
    
    class PerformanceTimer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
        
        def assert_performance(self, max_seconds: float):
            elapsed = self.elapsed()
            assert elapsed is not None, "Timer not properly used"
            assert elapsed <= max_seconds, f"Performance requirement failed: {elapsed:.2f}s > {max_seconds}s"
    
    return PerformanceTimer()


# Cleanup Fixtures
@pytest.fixture(autouse=True)
def cleanup_after_test():
    """Automatic cleanup after each test."""
    yield
    # Cleanup code here if needed
    # For example, clear any global state, close connections, etc.


# Pytest Plugins and Markers
def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "requires_api_key: marks tests that require real API keys"
    )


# Skip Conditions
requires_api_key = pytest.mark.skipif(
    os.getenv("GOOGLE_API_KEY") == "test-api-key",
    reason="Requires real API key"
)

slow_test = pytest.mark.slow
integration_test = pytest.mark.integration
unit_test = pytest.mark.unit