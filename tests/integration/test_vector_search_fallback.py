"""
Integration tests for Vector Search Client Fallback Mechanisms.

This module contains tests to verify that the Vector Search client fallback mechanisms
work correctly, including automatic fallback to mock implementation and graceful degradation.
"""

import logging
import os
import sys
from unittest.mock import patch

import pytest

# Add the project root to the Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the fixtures

# Import the actual implementations
from tools.vector_search.vector_search_client import (
    SimpleMockVectorSearchClient,
    VectorSearchClient,
)


class TestVectorSearchFallback:
    """Test suite for Vector Search client fallback mechanisms."""

    def test_auto_fallback_configuration(self):
        """Test that auto_fallback configuration works correctly."""
        # Create client with auto_fallback enabled
        client_with_fallback = VectorSearchClient(
            use_mock=False,
            auto_fallback=True,
            project_id="invalid-project",  # Invalid project to force fallback
            endpoint_id="invalid-endpoint",  # Invalid endpoint to force fallback
        )

        # Create client with auto_fallback disabled
        client_without_fallback = VectorSearchClient(
            use_mock=False,
            auto_fallback=False,
            project_id="invalid-project",  # Invalid project to force error
            endpoint_id="invalid-endpoint",  # Invalid endpoint to force error
        )

        # Client with fallback should be initialized and using mock
        assert client_with_fallback.initialized is True
        assert client_with_fallback.using_mock is True

        # Client without fallback should not be initialized
        assert client_without_fallback.initialized is False
        assert client_without_fallback.using_mock is False

    def test_fallback_on_missing_project_id(self):
        """Test fallback when project ID is missing."""
        # Create client with auto_fallback enabled but missing project_id
        with patch.dict("os.environ", {}, clear=True):  # Clear environment variables
            client = VectorSearchClient(auto_fallback=True)

            # Client should fall back to mock
            assert client.initialized is True
            assert client.using_mock is True

            # Search should still work using mock implementation
            results = client.search("test query")
            assert len(results) > 0

    def test_fallback_on_authentication_error(self):
        """Test fallback when authentication fails."""
        # Create client with auto_fallback enabled but invalid credentials
        with patch.dict(
            "os.environ",
            {
                "GOOGLE_CLOUD_PROJECT": "test-project",
                "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/nonexistent/credentials.json",
            },
        ):
            client = VectorSearchClient(auto_fallback=True)

            # Client should initialize but fall back to mock for operations
            assert client.initialized is True

            # Generate embedding should fall back to mock
            embedding = client.generate_embedding("test text")
            assert len(embedding) > 0  # Mock should return something

    def test_fallback_on_embedding_generation_error(self):
        """Test fallback when embedding generation fails."""
        # Create a client that will fail embedding generation
        client = VectorSearchClient(use_mock=False, auto_fallback=True)

        # Mock the _initialize method to return True but leave client in a state where embedding will fail
        with patch.object(client, "_initialize", return_value=True):
            with patch.object(
                client,
                "generate_embedding",
                side_effect=Exception("Simulated embedding error"),
            ):
                # Search should fall back to mock when embedding generation fails
                results = client.search("test query")
                assert len(results) > 0  # Mock should return results

    def test_fallback_on_search_error(self):
        """Test fallback when search operation fails."""
        # Create a client
        client = VectorSearchClient(use_mock=False, auto_fallback=True)

        # Mock methods to simulate search failure but successful embedding
        with patch.object(client, "_initialize", return_value=True):
            with patch.object(client, "generate_embedding", return_value=[0.1] * 768):
                with patch.object(
                    client,
                    "search_vector_store",
                    side_effect=Exception("Simulated search error"),
                ):
                    # Search should fall back to mock
                    results = client.search("test query")
                    assert len(results) > 0  # Mock should return results

    def test_explicit_mock_mode(self):
        """Test explicitly setting use_mock=True."""
        # Create client in mock mode
        client = VectorSearchClient(use_mock=True)

        # Client should be initialized and using mock
        assert client.initialized is True
        assert client.using_mock is True

        # Operations should use mock implementation
        assert client.is_available() is True
        assert len(client.generate_embedding("test")) > 0
        assert len(client.search("test query")) > 0

    def test_fallback_with_invalid_input(self):
        """Test fallback with invalid input."""
        # Create client with auto_fallback
        client = VectorSearchClient(auto_fallback=True)

        # Test with invalid input for embedding generation
        embedding = client.generate_embedding(None)  # None is invalid
        assert len(embedding) > 0  # Should fall back to mock

        embedding = client.generate_embedding("")  # Empty string is invalid
        assert len(embedding) > 0  # Should fall back to mock

    def test_warning_logging_on_fallback(self, caplog):
        """Test that appropriate warnings are logged when falling back."""
        caplog.set_level(logging.WARNING)

        # Create client that will need to fall back
        client = VectorSearchClient(
            use_mock=False, auto_fallback=True, project_id="invalid-project"
        )

        # Perform an operation that should trigger fallback
        client.search("test query")

        # Check that appropriate warnings were logged
        assert any(
            "Falling back to mock implementation" in record.message
            for record in caplog.records
        )

    def test_mock_client_behavior(self):
        """Test the behavior of the mock client implementation."""
        # Create a SimpleMockVectorSearchClient directly
        mock_client = SimpleMockVectorSearchClient()

        # Test basic operations
        assert mock_client.is_available() is True

        embedding = mock_client.generate_embedding("test text")
        assert len(embedding) == 768

        results = mock_client.search("test query")
        assert len(results) > 0
        assert all(isinstance(result, dict) for result in results)
        assert all(
            "id" in result and "score" in result and "content" in result
            for result in results
        )

    def test_graceful_degradation(self):
        """Test graceful degradation when some operations fail but others succeed."""
        # Create a client
        client = VectorSearchClient(use_mock=False, auto_fallback=True)

        # Mock methods to simulate partial failures
        with patch.object(client, "_initialize", return_value=True):
            with patch.object(client, "using_mock", False):
                with patch.object(
                    client, "generate_embedding", return_value=[0.1] * 768
                ):
                    with patch.object(
                        client,
                        "search_vector_store",
                        side_effect=Exception("Simulated search error"),
                    ):
                        # First search should fall back to mock
                        results1 = client.search("test query 1")
                        assert len(results1) > 0

                        # Second search should also fall back to mock
                        results2 = client.search("test query 2")
                        assert len(results2) > 0

                        # Client should still be usable for embedding generation
                        embedding = client.generate_embedding("test text")
                        assert len(embedding) == 768

    def test_health_status_with_fallback(self):
        """Test that health status correctly reflects fallback state."""
        # Create client in mock mode
        mock_client = VectorSearchClient(use_mock=True)

        # Get health status
        health_status = mock_client.get_health_status()

        # Verify status reflects mock mode
        assert health_status["status"] == "mock"
        assert health_status["details"]["using_mock"] is True

        # Create client with auto_fallback
        fallback_client = VectorSearchClient(
            use_mock=False, auto_fallback=True, project_id="invalid-project"
        )

        # Get health status
        fallback_health_status = fallback_client.get_health_status()

        # Verify status reflects fallback
        assert fallback_health_status["status"] == "mock"
        assert fallback_health_status["details"]["using_mock"] is True


if __name__ == "__main__":
    # Run the tests if this file is executed directly
    pytest.main(["-xvs", __file__])
