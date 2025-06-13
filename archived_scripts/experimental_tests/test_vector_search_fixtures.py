"""
Integration tests for Vector Search fixtures.

This module contains tests to verify that the Vector Search fixtures work correctly.
"""

import os
import sys
import pytest
import logging

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the fixtures
from tests.fixtures.vector_search_fixtures import (
    MockVectorSearchClientFixture,
    mock_vector_search_client,
    patched_vector_search_client,
    vector_search_health_checker
)

# Import the actual implementations
from tools.vector_search.health_checker import VectorSearchHealthChecker


def test_mock_vector_search_client_fixture():
    """Test that the MockVectorSearchClientFixture works correctly"""
    # Create a mock client directly
    mock_client = MockVectorSearchClientFixture(
        is_available=True,
        embedding_success=True,
        search_success=True
    )

    # Verify basic functionality
    assert mock_client.is_available() is True
    assert len(mock_client.generate_embedding("test")) == 768
    assert len(mock_client.search("test query")) == 3

    # Verify call history tracking
    assert mock_client.call_history['is_available'] == 1
    assert mock_client.call_history['generate_embedding'] == 1
    assert mock_client.call_history['search'] == 1

    # Test with different configuration
    mock_client = MockVectorSearchClientFixture(
        is_available=False,
        embedding_success=False,
        search_success=False
    )

    # Verify behavior with failures
    assert mock_client.is_available() is False
    assert len(mock_client.generate_embedding("test")) == 0
    assert len(mock_client.search("test query")) == 0


def test_mock_vector_search_client_pytest_fixture(mock_vector_search_client):
    """Test that the mock_vector_search_client pytest fixture works correctly"""
    # Verify basic functionality
    assert mock_vector_search_client.is_available() is True
    assert len(mock_vector_search_client.generate_embedding("test")) == 768
    assert len(mock_vector_search_client.search("test query")) == 3

    # Configure the mock client
    mock_vector_search_client.search_success = False

    # Verify the configuration change takes effect
    assert len(mock_vector_search_client.search("test query")) == 0


def test_patched_vector_search_client_fixture(patched_vector_search_client):
    """Test that the patched_vector_search_client fixture works correctly"""
    # Since we're not using the pytest fixture framework here, we'll just test the mock directly
    # Configure the mock client
    patched_vector_search_client.search_success = True

    # Verify functionality
    assert len(patched_vector_search_client.search("test query")) == 3

    # Change configuration
    patched_vector_search_client.search_success = False

    # Verify the change takes effect
    assert len(patched_vector_search_client.search("test query")) == 0


def test_vector_search_health_checker_fixture(vector_search_health_checker, mock_vector_search_client):
    """Test that the vector_search_health_checker fixture works correctly"""
    # Configure the mock client
    mock_vector_search_client.is_available_flag = True
    mock_vector_search_client.embedding_success = True
    mock_vector_search_client.search_success = True

    # Run a health check
    result = vector_search_health_checker.check_health()

    # Verify the result
    assert result['status'] in ['ok', 'warn', 'error', 'critical', 'unknown']
    assert 'checks' in result
    assert 'metrics' in result

    # Configure the mock client for failure
    mock_vector_search_client.is_available_flag = False
    mock_vector_search_client.embedding_success = False

    # Run another health check
    result = vector_search_health_checker.check_health()

    # Verify the result reflects the failures
    assert result['status'] in ['error', 'critical']

    # Generate a report
    report = vector_search_health_checker.generate_report()

    # Verify the report
    assert 'current_status' in report
    assert 'recommendations' in report
    assert 'history_summary' in report


if __name__ == "__main__":
    # Run the tests if this file is executed directly
    pytest.main(["-xvs", __file__])