"""
Vector Search Test Fixtures

This module provides test fixtures for Vector Search components:
- MockVectorSearchClient: A configurable mock client for testing
- RealVectorSearchClient: A real client configured for test environments
- VectorSearchHealthCheckerFixture: A health checker fixture for testing
"""

import logging
import os
from typing import Any, Dict, List, Optional
from unittest.mock import patch

import pytest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from tools.vector_search.health_checker import VectorSearchHealthChecker

# Import the actual implementations
from tools.vector_search.vector_search_client import VectorSearchClient


class MockVectorSearchClientFixture:
    """
    Configurable mock Vector Search client for testing.

    This fixture provides a mock implementation of the VectorSearchClient
    that can be configured to simulate various success and error conditions.
    """

    def __init__(
        self,
        is_available: bool = True,
        embedding_success: bool = True,
        search_success: bool = True,
        search_results: Optional[List[Dict[str, Any]]] = None,
        embedding_dimension: int = 768,
        simulate_latency: bool = False,
    ):
        """
        Initialize the mock Vector Search client fixture.

        Args:
            is_available: Whether the client should report as available
            embedding_success: Whether embedding generation should succeed
            search_success: Whether search operations should succeed
            search_results: Optional predefined search results to return
            embedding_dimension: Dimension of mock embeddings
            simulate_latency: Whether to simulate latency in operations
        """
        self.is_available_flag = is_available
        self.embedding_success = embedding_success
        self.search_success = search_success
        self.search_results = search_results or []
        self.embedding_dimension = embedding_dimension
        self.simulate_latency = simulate_latency
        self.call_history = {
            "is_available": 0,
            "generate_embedding": 0,
            "search": 0,
            "search_vector_store": 0,
            "get_health_status": 0,
        }

        # Default mock search results if none provided
        if not self.search_results:
            self.search_results = [
                {
                    "id": f"mock-id-{i}",
                    "score": 0.9 - (i * 0.1),
                    "content": f"Mock content for test query (result {i+1})",
                    "metadata": {"source": f"mock-source-{i}"},
                }
                for i in range(3)
            ]

    def is_available(self) -> bool:
        """Mock implementation of is_available"""
        self.call_history["is_available"] += 1
        return self.is_available_flag

    def generate_embedding(self, text: str) -> List[float]:
        """Mock implementation of generate_embedding"""
        self.call_history["generate_embedding"] += 1

        if not self.embedding_success:
            return []

        # Return a mock embedding with the configured dimension
        return [0.1] * self.embedding_dimension

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Mock implementation of search"""
        self.call_history["search"] += 1

        if not self.search_success:
            return []

        # Return the configured number of results
        return self.search_results[:top_k]

    def search_vector_store(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Mock implementation of search_vector_store"""
        self.call_history["search_vector_store"] += 1

        if not self.search_success:
            return []

        # Return the configured number of results
        return self.search_results[:top_k]

    def get_health_status(self) -> Dict[str, Any]:
        """Mock implementation of get_health_status"""
        self.call_history["get_health_status"] += 1

        return {
            "status": "ok" if self.is_available_flag else "error",
            "message": (
                "Mock Vector Search client is healthy"
                if self.is_available_flag
                else "Mock Vector Search client is unhealthy"
            ),
            "details": {
                "initialized": True,
                "using_mock": True,
                "embedding_success": self.embedding_success,
                "search_success": self.search_success,
            },
        }

    def reset_call_history(self):
        """Reset the call history"""
        for key in self.call_history:
            self.call_history[key] = 0


@pytest.fixture
def mock_vector_search_client(request):
    """
    Pytest fixture for a mock Vector Search client.

    Usage:
        def test_something(mock_vector_search_client):
            # Configure the mock client
            mock_vector_search_client.is_available_flag = True
            mock_vector_search_client.search_success = False

            # Use the mock client in your test
            result = some_function_that_uses_vector_search(mock_vector_search_client)

            # Assert on the result
            assert result is None

    Args:
        request: The pytest request object, which can contain fixture parameters

    Returns:
        A configured MockVectorSearchClientFixture instance
    """
    # Get parameters from the fixture request, if any
    params = getattr(request, "param", {})

    # Create and return the mock client with the specified parameters
    return MockVectorSearchClientFixture(**params)


@pytest.fixture
def patched_vector_search_client(mock_vector_search_client):
    """
    Pytest fixture that patches the VectorSearchClient with a mock.

    This fixture patches the VectorSearchClient class to return the mock client,
    allowing tests to use the actual implementation code with a mock client.

    Usage:
        def test_something(patched_vector_search_client):
            # The mock client is already configured and patched
            # Any code that creates a VectorSearchClient will get the mock

            # Configure the mock for this test
            patched_vector_search_client.search_success = False

            # Call code that uses VectorSearchClient
            result = some_function_that_creates_vector_search_client()

            # Assert on the result
            assert result is None

    Args:
        mock_vector_search_client: The mock client fixture

    Returns:
        The configured mock client
    """
    # Create a patcher for the VectorSearchClient class
    with patch("tools.vector_search.vector_search_client.VectorSearchClient") as mock_class:
        # Configure the mock class to return our mock client instance
        mock_class.return_value = mock_vector_search_client
        yield mock_vector_search_client


@pytest.fixture
def real_vector_search_client(request):
    """
    Pytest fixture for a real Vector Search client configured for testing.

    This fixture creates a real VectorSearchClient instance with test-appropriate
    configuration. It can be configured to use a mock implementation if the real
    service is not available.

    Usage:
        def test_with_real_client(real_vector_search_client):
            # Use the real client in your test
            results = real_vector_search_client.search("test query")

            # Assert on the results
            assert len(results) > 0

    Args:
        request: The pytest request object, which can contain fixture parameters

    Returns:
        A configured VectorSearchClient instance
    """
    # Get parameters from the fixture request, if any
    params = getattr(request, "param", {})

    # Default parameters for testing
    test_params = {
        "use_mock": params.get("use_mock", False),
        "auto_fallback": params.get("auto_fallback", True),
        "project_id": params.get("project_id", os.environ.get("TEST_GOOGLE_CLOUD_PROJECT")),
        "location": params.get("location", os.environ.get("TEST_GOOGLE_CLOUD_LOCATION", "us-central1")),
        "endpoint_id": params.get("endpoint_id", os.environ.get("TEST_VECTOR_SEARCH_ENDPOINT_ID")),
        "deployed_index_id": params.get("deployed_index_id", os.environ.get("TEST_DEPLOYED_INDEX_ID")),
        "credentials_path": params.get("credentials_path", os.environ.get("TEST_GOOGLE_APPLICATION_CREDENTIALS")),
    }

    # Create and return the real client with test configuration
    client = VectorSearchClient(**test_params)

    # If the client should be available but isn't, log a warning
    if not test_params["use_mock"] and not client.is_available():
        logger.warning("Real Vector Search client is not available. Tests may fall back to mock implementation.")

    return client


@pytest.fixture
def vector_search_health_checker(request, mock_vector_search_client):
    """
    Pytest fixture for a Vector Search Health Checker.

    This fixture creates a VectorSearchHealthChecker instance with a configurable
    mock or real Vector Search client.

    Usage:
        def test_health_checker(vector_search_health_checker):
            # Run a health check
            result = vector_search_health_checker.check_health()

            # Assert on the result
            assert result['status'] == 'ok'

    Args:
        request: The pytest request object, which can contain fixture parameters
        mock_vector_search_client: The mock client fixture

    Returns:
        A configured VectorSearchHealthChecker instance
    """
    # Get parameters from the fixture request, if any
    params = getattr(request, "param", {})

    # Determine whether to use a mock or real client
    use_real_client = params.get("use_real_client", False)

    if use_real_client:
        # Create a real client with test configuration
        client_params = params.get("client_params", {})
        client = VectorSearchClient(
            use_mock=client_params.get("use_mock", False),
            auto_fallback=client_params.get("auto_fallback", True),
            project_id=client_params.get("project_id", os.environ.get("TEST_GOOGLE_CLOUD_PROJECT")),
            location=client_params.get("location", os.environ.get("TEST_GOOGLE_CLOUD_LOCATION", "us-central1")),
            endpoint_id=client_params.get("endpoint_id", os.environ.get("TEST_VECTOR_SEARCH_ENDPOINT_ID")),
            deployed_index_id=client_params.get("deployed_index_id", os.environ.get("TEST_DEPLOYED_INDEX_ID")),
            credentials_path=client_params.get(
                "credentials_path", os.environ.get("TEST_GOOGLE_APPLICATION_CREDENTIALS")
            ),
        )
    else:
        # Use the provided mock client
        client = mock_vector_search_client

    # Create and return the health checker with the selected client
    history_size = params.get("history_size", 10)
    return VectorSearchHealthChecker(vector_search_client=client, history_size=history_size)


# Example basic test to verify the fixtures work
def test_fixtures_example():
    """Example test to demonstrate how to use the fixtures"""
    # Create a mock client directly (without using pytest fixture)
    mock_client = MockVectorSearchClientFixture(is_available=True, embedding_success=True, search_success=True)

    # Verify the mock client works as expected
    assert mock_client.is_available() is True
    assert len(mock_client.generate_embedding("test")) == 768
    assert len(mock_client.search("test query")) == 3

    # Create a health checker with the mock client
    health_checker = VectorSearchHealthChecker(vector_search_client=mock_client)

    # Verify the health checker works with the mock client
    health_result = health_checker.check_health()
    assert health_result["status"] in ["ok", "warn", "error", "critical", "unknown"]

    # Verify call history tracking
    assert mock_client.call_history["is_available"] > 0
    assert mock_client.call_history["generate_embedding"] > 0
    assert mock_client.call_history["search"] > 0


if __name__ == "__main__":
    # Run the example test if this file is executed directly
    test_fixtures_example()
    logger.info("Fixtures test completed successfully!")
