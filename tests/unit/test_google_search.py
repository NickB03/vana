"""
Unit tests for Google Custom Search implementation
"""

import json
import os
import pytest
from unittest.mock import patch, MagicMock

from lib._tools.google_search_v2 import google_web_search, _extract_location, _get_from_cache, _save_to_cache


class TestGoogleSearch:
    """Test suite for Google search functionality."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear cache before each test."""
        from lib._tools import google_search
        google_search._search_cache.clear()
    
    def test_extract_location(self):
        """Test location extraction from queries."""
        assert _extract_location("What time is it in Dallas?") == "dallas"
        assert _extract_location("weather in New York") == "new york"
        assert _extract_location("live music near Austin") == "austin"
        assert _extract_location("current time") == ""
    
    def test_cache_operations(self):
        """Test search result caching."""
        test_query = "test query"
        test_result = '{"results": ["test"]}'
        
        # Test cache miss
        assert _get_from_cache(test_query) is None
        
        # Test cache save and hit
        _save_to_cache(test_query, test_result)
        assert _get_from_cache(test_query) == test_result
        
        # Test case insensitive cache
        assert _get_from_cache("TEST QUERY") == test_result
    
    @patch.dict(os.environ, {"GOOGLE_API_KEY": "test_key"})
    @patch("urllib.request.urlopen")
    def test_successful_search(self, mock_urlopen):
        """Test successful Google search."""
        # Mock response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "items": [
                {
                    "title": "Test Result 1",
                    "link": "https://example.com/1",
                    "snippet": "This is a test result"
                },
                {
                    "title": "Test Result 2",
                    "link": "https://example.com/2",
                    "snippet": "Another test result"
                }
            ],
            "searchInformation": {
                "formattedTotalResults": "2",
                "formattedSearchTime": "0.5"
            }
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Perform search
        result = google_web_search("test query", max_results=2)
        data = json.loads(result)
        
        # Verify results
        assert data["query"] == "test query"
        assert len(data["results"]) == 2
        assert data["results"][0]["title"] == "Test Result 1"
        assert data["total_results"] == "2"
        assert data["mode"] == "google_custom_search"
        assert data["cached"] == False
    
    @patch.dict(os.environ, {}, clear=True)
    @patch("lib._tools.web_search_sync.web_search")
    def test_fallback_without_api_key(self, mock_ddg_search):
        """Test fallback to DuckDuckGo when API key missing."""
        mock_ddg_search.return_value = '{"source": "duckduckgo"}'
        
        result = google_web_search("test query", max_results=5)
        
        # Verify fallback was called
        mock_ddg_search.assert_called_once_with("test query", 5)
        assert result == '{"source": "duckduckgo"}'
    
    @patch.dict(os.environ, {"GOOGLE_API_KEY": "test_key"})
    @patch("urllib.request.urlopen")
    def test_time_query_enhancement(self, mock_urlopen):
        """Test time query enhancement."""
        # Mock response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "items": [{
                "title": "Current Time in Dallas",
                "link": "https://time.com",
                "snippet": "The current time in Dallas is 2:30 PM CST"
            }],
            "searchInformation": {"formattedTotalResults": "1"}
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Clear cache to ensure fresh search
        from lib._tools import google_search_v2
        google_search_v2._search_cache.clear()
        
        result = google_web_search("What time is it in Dallas?", max_results=3)
        data = json.loads(result)
        
        # Verify time extraction
        assert "extracted_time" in data
        assert "2:30 PM" in data["extracted_time"]
    
    @patch.dict(os.environ, {"GOOGLE_API_KEY": "test_key"})
    @patch("urllib.request.urlopen")
    def test_local_query_enhancement(self, mock_urlopen):
        """Test local business query enhancement."""
        # Mock response with venue data
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "items": [{
                "title": "Deep Ellum Live",
                "link": "https://deepellumlive.com",
                "snippet": "Premier live music venue in Dallas",
                "pagemap": {
                    "aggregaterating": [{
                        "ratingvalue": "4.5",
                        "ratingcount": "1200"
                    }],
                    "postaladdress": [{
                        "streetaddress": "2806 Elm St"
                    }]
                }
            }],
            "searchInformation": {"formattedTotalResults": "50"}
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = google_web_search("live music venues in Dallas", max_results=8)
        data = json.loads(result)
        
        # Verify enhanced venue data
        assert len(data["results"]) == 1
        assert data["results"][0]["rating"] == "4.5"
        assert data["results"][0]["review_count"] == "1200"
        assert data["results"][0]["address"] == "2806 Elm St"
    
    @patch.dict(os.environ, {"GOOGLE_API_KEY": "test_key"})
    @patch("urllib.request.urlopen")
    @patch("lib._tools.web_search_sync.web_search")
    def test_api_quota_exceeded(self, mock_ddg_search, mock_urlopen):
        """Test fallback when API quota exceeded."""
        # Mock 429 error
        from urllib.error import HTTPError
        mock_urlopen.side_effect = HTTPError(None, 429, "Quota Exceeded", {}, None)
        mock_ddg_search.return_value = '{"source": "duckduckgo_fallback"}'
        
        result = google_web_search("test query", max_results=5)
        
        # Verify fallback was used
        mock_ddg_search.assert_called_once()
        assert result == '{"source": "duckduckgo_fallback"}'
    
    def test_cached_result(self):
        """Test that cached results are returned."""
        test_query = "cached test"
        cached_data = json.dumps({
            "query": test_query,
            "results": [{"cached": True}],
            "cached": True
        })
        
        # Save to cache
        _save_to_cache(test_query, cached_data)
        
        # Mock urlopen to ensure it's not called
        with patch("urllib.request.urlopen") as mock_urlopen:
            result = google_web_search(test_query, max_results=5)
            
            # Verify cache was used
            assert result == cached_data
            mock_urlopen.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])