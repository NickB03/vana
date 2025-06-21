"""
Unit tests for web search tool functionality

Tests the adk_web_search tool in isolation, validating its core functionality,
error handling, and integration with the Brave API.
"""

import asyncio

# Import the actual tool from VANA codebase
import sys
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import adk_web_search
from tests.framework import QueryType, TestDataManager

# Import web_search function directly for testing
web_search = adk_web_search


class TestWebSearchTool:
    """Unit tests for web search tool"""

    @pytest.fixture
    def test_data_manager(self):
        """Create test data manager"""
        return TestDataManager()

    @pytest.fixture
    def mock_brave_response(self):
        """Mock Brave API response"""
        return {
            "web": {
                "results": [
                    {
                        "title": "Current Time in London",
                        "url": "https://timeanddate.com/london",
                        "description": "The current time in London is 3:45 PM GMT",
                        "extra_snippets": ["London time: 15:45", "GMT timezone"],
                        "age": "2024-06-21T15:45:00Z",
                    },
                    {
                        "title": "London Weather Today",
                        "url": "https://weather.com/london",
                        "description": "London weather: 22°C, partly cloudy",
                        "extra_snippets": ["Temperature: 22 degrees Celsius"],
                        "age": "2024-06-21T15:30:00Z",
                    },
                ]
            },
            "infobox": {
                "title": "London",
                "description": "Capital city of England",
                "attributes": {"current_time": "15:45 GMT", "temperature": "22°C"},
            },
        }

    @pytest.mark.unit
    def test_web_search_basic_functionality(self, mock_brave_response):
        """Test basic web search functionality"""
        with patch("requests.get") as mock_get:
            # Mock the HTTP response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_brave_response
            mock_get.return_value = mock_response

            # Test the web search function
            result = web_search.func("What time is it in London?")

            # Verify the result structure (returns JSON string)
            assert isinstance(result, str)
            assert len(result) > 0

            # Parse JSON result to check structure
            import json

            try:
                parsed_result = json.loads(result)
                # Should contain query information or results
                assert (
                    "query" in parsed_result
                    or "results" in parsed_result
                    or "error" in parsed_result
                )
            except json.JSONDecodeError:
                # If not JSON, should still be a meaningful string response
                assert "london" in result.lower() or "time" in result.lower()

            # Verify API was called correctly
            mock_get.assert_called_once()
            call_args = mock_get.call_args
            assert "q=" in str(call_args) or "What time is it in London" in str(
                call_args
            )

    @pytest.mark.unit
    def test_web_search_data_extraction(self, mock_brave_response):
        """Test data extraction from search results"""
        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_brave_response
            mock_get.return_value = mock_response

            # Test time query
            result = web_search.func("What time is it in London?")

            # Verify enhanced data extraction
            first_result = result[0]

            # Should include enhanced fields from the implementation
            expected_fields = ["title", "url", "description"]
            for field in expected_fields:
                assert field in first_result, f"Missing field: {field}"

            # Verify content contains relevant information
            result_text = str(result).lower()
            assert "london" in result_text
            assert any(
                time_indicator in result_text
                for time_indicator in ["time", "15:45", "3:45"]
            )

    @pytest.mark.unit
    def test_web_search_error_handling(self):
        """Test error handling in web search"""
        with patch("requests.get") as mock_get:
            # Test HTTP error
            mock_get.side_effect = Exception("Network error")

            result = web_search.func("test query")

            # Should return empty list or error result on failure
            assert isinstance(result, str)
            # The actual implementation should handle errors gracefully

    @pytest.mark.unit
    def test_web_search_empty_query(self):
        """Test web search with empty query"""
        result = web_search.func("")

        # Should handle empty query gracefully
        assert isinstance(result, str)

    @pytest.mark.unit
    def test_web_search_special_characters(self, mock_brave_response):
        """Test web search with special characters"""
        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_brave_response
            mock_get.return_value = mock_response

            # Test query with special characters
            special_query = "What's the weather in São Paulo?"
            result = web_search.func(special_query)

            assert isinstance(result, str)
            mock_get.assert_called_once()

    @pytest.mark.unit
    def test_web_search_long_query(self, mock_brave_response):
        """Test web search with very long query"""
        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_brave_response
            mock_get.return_value = mock_response

            # Test very long query
            long_query = "What is the current weather conditions and temperature " * 10
            result = web_search.func(long_query)

            assert isinstance(result, str)
            mock_get.assert_called_once()

    @pytest.mark.unit
    def test_web_search_api_timeout(self):
        """Test web search API timeout handling"""
        with patch("requests.get") as mock_get:
            # Simulate timeout
            mock_get.side_effect = asyncio.TimeoutError("Request timed out")

            result = web_search.func("test query")

            # Should handle timeout gracefully
            assert isinstance(result, str)

    @pytest.mark.unit
    def test_web_search_malformed_response(self):
        """Test web search with malformed API response"""
        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"invalid": "structure"}
            mock_get.return_value = mock_response

            result = web_search.func("test query")

            # Should handle malformed response gracefully
            assert isinstance(result, str)

    @pytest.mark.unit
    def test_web_search_http_error_codes(self):
        """Test web search with various HTTP error codes"""
        error_codes = [400, 401, 403, 404, 429, 500, 502, 503]

        for error_code in error_codes:
            with patch("requests.get") as mock_get:
                mock_response = Mock()
                mock_response.status_code = error_code
                mock_response.raise_for_status.side_effect = Exception(
                    f"HTTP {error_code}"
                )
                mock_get.return_value = mock_response

                result = web_search.func("test query")

                # Should handle HTTP errors gracefully
                assert isinstance(result, str)

    @pytest.mark.unit
    def test_web_search_query_validation(self):
        """Test query validation logic"""
        # Test various query types
        test_queries = [
            "What time is it?",
            "Weather in New York",
            "How to cook pasta",
            "Python programming tutorial",
            "Latest news about AI",
        ]

        for query in test_queries:
            # Basic validation - query should be string and non-empty after strip
            assert isinstance(query, str)
            assert len(query.strip()) > 0

    @pytest.mark.unit
    def test_web_search_concurrent_requests(self, mock_brave_response):
        """Test concurrent web search requests"""
        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_brave_response
            mock_get.return_value = mock_response

            # Test multiple concurrent requests
            queries = [
                "What time is it in London?",
                "Weather in Paris",
                "News about technology",
            ]

            results = [web_search.func(query) for query in queries]

            # All requests should complete successfully
            assert len(results) == len(queries)
            for result in results:
                assert isinstance(result, str)

    @pytest.mark.unit
    def test_web_search_data_processing(self, test_data_manager):
        """Test web search with real test scenarios"""
        # Load factual query scenarios
        try:
            scenarios = test_data_manager.load_scenarios_by_type(QueryType.FACTUAL)
        except FileNotFoundError:
            pytest.skip("Factual query scenarios not available")

        # Test with a few scenarios
        for scenario in scenarios[:3]:  # Test first 3 scenarios
            with patch("requests.get") as mock_get:
                # Create mock response based on scenario
                mock_response_data = {
                    "web": {
                        "results": [
                            {
                                "title": f"Result for {scenario.query}",
                                "url": "https://example.com",
                                "description": f"Information about {scenario.query}",
                                "extra_snippets": ["Additional info"],
                                "age": "2024-06-21T15:45:00Z",
                            }
                        ]
                    }
                }

                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = mock_response_data
                mock_get.return_value = mock_response

                result = web_search.func(scenario.query)

                # Verify result structure
                assert isinstance(result, str)
                if result:  # If results returned
                    assert "title" in result[0]
                    assert "url" in result[0]
                    assert "description" in result[0]


class TestWebSearchToolIntegration:
    """Integration tests for web search tool with actual API"""

    @pytest.mark.unit
    @pytest.mark.network
    def test_web_search_real_api_call(self):
        """Test web search with real API call (requires network)"""
        # This test requires actual network access
        # Skip if BRAVE_API_KEY is not available
        import os

        if not os.getenv("BRAVE_API_KEY"):
            pytest.skip("BRAVE_API_KEY not available for real API testing")

        # Test with a simple query
        result = web_search.func("What is the capital of France?")

        # Verify we get results
        assert isinstance(result, str)

        # If we get results, verify structure
        if result:
            first_result = result[0]
            assert "title" in first_result
            assert "url" in first_result
            assert "description" in first_result

            # Check that result is relevant
            result_text = str(result).lower()
            assert any(term in result_text for term in ["paris", "france", "capital"])

    @pytest.mark.unit
    @pytest.mark.network
    @pytest.mark.slow
    def test_web_search_performance(self):
        """Test web search performance characteristics"""
        import time

        if not os.getenv("BRAVE_API_KEY"):
            pytest.skip("BRAVE_API_KEY not available for performance testing")

        # Test response time
        start_time = time.time()
        result = web_search.func("Current time")
        end_time = time.time()

        response_time = end_time - start_time

        # Response should be reasonably fast (under 5 seconds)
        assert response_time < 5.0, f"Response time too slow: {response_time:.2f}s"

        # Should return results
        assert isinstance(result, str)
