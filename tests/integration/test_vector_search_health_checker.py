"""
Integration tests for Vector Search Health Checker.

This module contains tests to verify that the Vector Search Health Checker works correctly
in various scenarios, including success cases, failure cases, and recovery scenarios.
"""

import os
import sys
import pytest
import logging
import time
from unittest.mock import patch, MagicMock

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the fixtures
from tests.fixtures.vector_search_fixtures import (
    mock_vector_search_client,
    patched_vector_search_client,
    vector_search_health_checker
)

# Import the actual implementations
from tools.vector_search.health_checker import VectorSearchHealthChecker
from tools.vector_search.vector_search_client import VectorSearchClient


class TestVectorSearchHealthChecker:
    """Test suite for Vector Search Health Checker."""

    def test_successful_health_check(self, vector_search_health_checker, mock_vector_search_client):
        """Test that health check succeeds when all components are healthy."""
        # Configure the mock client for success
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = True
        mock_vector_search_client.search_success = True

        # Run a health check
        result = vector_search_health_checker.check_health()

        # Verify the result
        assert result['status'] == 'ok'
        assert result['checks']['environment']['status'] == 'ok'
        assert result['checks']['authentication']['status'] == 'ok'
        assert result['checks']['embedding']['status'] == 'ok'
        assert result['checks']['search']['status'] == 'ok'
        assert 'metrics' in result
        assert result['metrics']['success_rate'] == 100.0

        # Verify call history
        assert mock_vector_search_client.call_history['is_available'] > 0
        assert mock_vector_search_client.call_history['generate_embedding'] > 0
        assert mock_vector_search_client.call_history['search'] > 0

    def test_authentication_failure(self, vector_search_health_checker, mock_vector_search_client):
        """Test health check when authentication fails."""
        # Configure the mock client for authentication failure
        mock_vector_search_client.is_available_flag = False
        mock_vector_search_client.embedding_success = True
        mock_vector_search_client.search_success = True

        # Run a health check
        result = vector_search_health_checker.check_health()

        # Verify the result
        assert result['status'] in ['error', 'critical']
        assert result['checks']['authentication']['status'] == 'error'
        assert 'issues' in result
        assert any(issue['severity'] in ['error', 'critical'] for issue in result['issues'])

    def test_embedding_failure(self, vector_search_health_checker, mock_vector_search_client):
        """Test health check when embedding generation fails."""
        # Configure the mock client for embedding failure
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = False
        mock_vector_search_client.search_success = True

        # Run a health check
        result = vector_search_health_checker.check_health()

        # Verify the result
        assert result['status'] in ['error', 'warn']
        assert result['checks']['embedding']['status'] == 'error'
        assert 'issues' in result
        assert any(issue['severity'] in ['error', 'warn'] for issue in result['issues'])

    def test_search_failure(self, vector_search_health_checker, mock_vector_search_client):
        """Test health check when search fails."""
        # Configure the mock client for search failure
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = True
        mock_vector_search_client.search_success = False

        # Run a health check
        result = vector_search_health_checker.check_health()

        # Verify the result
        assert result['status'] in ['error', 'warn']
        assert result['checks']['search']['status'] in ['error', 'warn']
        assert 'issues' in result

    def test_complete_failure(self, vector_search_health_checker, mock_vector_search_client):
        """Test health check when all components fail."""
        # Configure the mock client for complete failure
        mock_vector_search_client.is_available_flag = False
        mock_vector_search_client.embedding_success = False
        mock_vector_search_client.search_success = False

        # Run a health check
        result = vector_search_health_checker.check_health()

        # Verify the result
        assert result['status'] == 'critical'
        assert result['checks']['authentication']['status'] == 'error'
        assert 'issues' in result
        assert any(issue['severity'] == 'critical' for issue in result['issues'])

    def test_recommendation_generation(self, vector_search_health_checker, mock_vector_search_client):
        """Test that recommendations are generated correctly."""
        # Configure the mock client for various issues
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = False
        mock_vector_search_client.search_success = False

        # Run a health check
        result = vector_search_health_checker.check_health()

        # Generate recommendations
        recommendations = vector_search_health_checker.get_recommendations(result)

        # Verify recommendations
        assert len(recommendations) > 0
        assert any(rec['category'] == 'functionality' for rec in recommendations)
        assert any(rec['priority'] in ['high', 'medium'] for rec in recommendations)

        # Check specific recommendation for embedding failure
        embedding_recs = [rec for rec in recommendations if 'embedding' in rec['title'].lower()]
        assert len(embedding_recs) > 0

    def test_history_tracking(self, vector_search_health_checker, mock_vector_search_client):
        """Test that health check history is tracked correctly."""
        # Configure the mock client
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = True
        mock_vector_search_client.search_success = True

        # Run multiple health checks with different results
        vector_search_health_checker.check_health()  # First check (success)
        
        mock_vector_search_client.embedding_success = False
        vector_search_health_checker.check_health()  # Second check (partial failure)
        
        mock_vector_search_client.is_available_flag = False
        vector_search_health_checker.check_health()  # Third check (more severe failure)

        # Generate a report
        report = vector_search_health_checker.generate_report()

        # Verify history tracking
        assert 'history_summary' in report
        assert report['history_summary']['check_count'] == 3
        assert sum(report['history_summary']['status_counts'].values()) == 3

    def test_report_generation(self, vector_search_health_checker, mock_vector_search_client):
        """Test that health reports are generated correctly."""
        # Configure the mock client
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = True
        mock_vector_search_client.search_success = True

        # Run a health check
        vector_search_health_checker.check_health()

        # Generate a report
        report = vector_search_health_checker.generate_report()

        # Verify report structure
        assert 'current_status' in report
        assert 'last_check_time' in report
        assert 'checks' in report
        assert 'metrics' in report
        assert 'recommendations' in report
        assert 'history_summary' in report

    def test_trend_calculation(self, vector_search_health_checker, mock_vector_search_client):
        """Test that trends are calculated correctly from history."""
        # Configure the mock client for initial success
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = True
        mock_vector_search_client.search_success = True

        # Run first health check (success)
        vector_search_health_checker.check_health()
        
        # Introduce a delay to ensure different timestamps
        time.sleep(0.1)
        
        # Configure for degraded performance
        mock_vector_search_client.embedding_success = False
        
        # Run second health check (degraded)
        vector_search_health_checker.check_health()

        # Generate a report
        report = vector_search_health_checker.generate_report()

        # Verify trends
        assert 'trends' in report
        assert 'success_rate' in report['trends']
        assert report['trends']['success_rate']['trend'] in ['degrading', 'improving', 'stable']
        assert report['trends']['success_rate']['current'] < report['trends']['success_rate']['previous']

    @patch('os.environ', {})
    def test_environment_check_failure(self, vector_search_health_checker):
        """Test health check when environment variables are missing."""
        # Run a health check with empty environment
        result = vector_search_health_checker.check_health()

        # Verify the environment check failed
        assert result['checks']['environment']['status'] == 'error'
        assert len(result['checks']['environment']['details']['missing_vars']) > 0

    def test_save_report_to_file(self, vector_search_health_checker, mock_vector_search_client, tmp_path):
        """Test saving health report to file."""
        # Configure the mock client
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.embedding_success = True
        mock_vector_search_client.search_success = True

        # Run a health check
        vector_search_health_checker.check_health()

        # Save report to a temporary file
        report_file = tmp_path / "health_report.json"
        result = vector_search_health_checker.save_report_to_file(str(report_file))

        # Verify the file was created
        assert result is True
        assert report_file.exists()
        assert report_file.stat().st_size > 0


if __name__ == "__main__":
    # Run the tests if this file is executed directly
    pytest.main(["-xvs", __file__])
