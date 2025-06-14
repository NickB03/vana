"""
Pytest configuration for MCP tests.
"""

import pytest
import asyncio
import logging
from unittest.mock import Mock

# Configure logging for tests
logging.basicConfig(level=logging.DEBUG)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_requests():
    """Mock requests module for HTTP testing."""
    mock = Mock()
    mock.get = Mock()
    mock.post = Mock()
    mock.put = Mock()
    mock.delete = Mock()
    mock.head = Mock()
    return mock


@pytest.fixture
def sample_server_config():
    """Sample server configuration for testing."""
    from lib.mcp.core.mcp_client import ServerConfig
    
    return ServerConfig(
        name="test_server",
        command=["python", "-m", "test_server"],
        args=["--test"],
        env={"TEST_VAR": "test_value"},
        timeout=30,
        retry_attempts=3,
        retry_delay=1
    )


@pytest.fixture
def sample_tool_info():
    """Sample tool information for testing."""
    from lib.mcp.core.mcp_client import ToolInfo
    
    return ToolInfo(
        name="test_tool",
        description="A test tool for testing",
        input_schema={
            "type": "object",
            "properties": {
                "param": {"type": "string", "description": "Test parameter"}
            },
            "required": ["param"]
        }
    )


@pytest.fixture
def sample_server_info():
    """Sample server information for testing."""
    from lib.mcp.core.mcp_registry import ServerInfo, ServerStatus
    
    return ServerInfo(
        name="test_server",
        description="A test server for testing",
        capabilities=["test_capability"],
        tools=["test_tool"],
        status=ServerStatus.RUNNING,
        tags={"test", "mock"}
    )


# Pytest markers for different test categories

def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "network: mark test as requiring network access"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically."""
    for item in items:
        # Add unit marker to all tests by default
        if not any(marker.name in ["integration", "slow", "network"] for marker in item.iter_markers()):
            item.add_marker(pytest.mark.unit)
        
        # Add slow marker to integration tests
        if "integration" in item.nodeid:
            item.add_marker(pytest.mark.slow)
        
        # Add network marker to tests that use responses
        if hasattr(item, "fixturenames") and "responses" in item.fixturenames:
            item.add_marker(pytest.mark.network)
