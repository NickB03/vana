"""
Comprehensive tests for Brave Search Client.
Target: 0% → 80%+ coverage
"""

import json
import pytest
import vcr
from unittest.mock import Mock, patch, MagicMock
from requests.exceptions import RequestException, HTTPError, Timeout

from tools.brave_search_client import BraveSearchClient
from tests.fixtures.vcr_config import get_test_vcr, MOCK_RESPONSES


class TestBraveSearchClient:
    """Test suite for BraveSearchClient class."""

    @pytest.fixture
    def client(self):
        """Create a BraveSearchClient instance for testing."""
        return BraveSearchClient(api_key="test_api_key")

    @pytest.fixture
    def mock_response_data(self):
        """Mock response data for Brave Search API."""
        return MOCK_RESPONSES['brave_search']

    def test_init_with_api_key(self):
        """Test client initialization with API key."""
        client = BraveSearchClient(api_key="test_key")
        assert client.api_key == "test_key"
        assert client.base_url == "https://api.search.brave.com/res/v1/web/search"
        assert client.timeout == 30

    def test_init_with_custom_params(self):
        """Test client initialization with custom parameters."""
        client = BraveSearchClient(
            api_key="test_key",
            base_url="https://custom.api.com",
            timeout=60
        )
        assert client.api_key == "test_key"
        assert client.base_url == "https://custom.api.com"
        assert client.timeout == 60

    def test_init_without_api_key(self):
        """Test client initialization without API key raises error."""
        with pytest.raises(ValueError, match="API key is required"):
            BraveSearchClient(api_key="")

    @patch('tools.brave_search_client.requests.get')
    def test_search_success(self, mock_get, client, mock_response_data):
        """Test successful search request."""
        # Setup mock response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        # Execute search
        result = client.search("test query")

        # Verify request
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[1]['params']['q'] == "test query"
        assert 'X-Subscription-Token' in call_args[1]['headers']

        # Verify result
        assert result == mock_response_data

    @patch('tools.brave_search_client.requests.get')
    def test_search_with_parameters(self, mock_get, client, mock_response_data):
        """Test search with additional parameters."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        # Execute search with parameters
        result = client.search(
            query="test query",
            count=20,
            offset=10,
            country="US",
            search_lang="en",
            ui_lang="en",
            safesearch="moderate"
        )

        # Verify parameters
        call_args = mock_get.call_args
        params = call_args[1]['params']
        assert params['q'] == "test query"
        assert params['count'] == 20
        assert params['offset'] == 10
        assert params['country'] == "US"
        assert params['search_lang'] == "en"
        assert params['ui_lang'] == "en"
        assert params['safesearch'] == "moderate"

    @patch('tools.brave_search_client.requests.get')
    def test_search_http_error(self, mock_get, client):
        """Test search with HTTP error."""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.raise_for_status.side_effect = HTTPError("Bad Request")
        mock_get.return_value = mock_response

        with pytest.raises(HTTPError):
            client.search("test query")

    @patch('tools.brave_search_client.requests.get')
    def test_search_timeout(self, mock_get, client):
        """Test search with timeout."""
        mock_get.side_effect = Timeout("Request timed out")

        with pytest.raises(Timeout):
            client.search("test query")

    @patch('tools.brave_search_client.requests.get')
    def test_search_connection_error(self, mock_get, client):
        """Test search with connection error."""
        mock_get.side_effect = RequestException("Connection failed")

        with pytest.raises(RequestException):
            client.search("test query")

    @patch('tools.brave_search_client.requests.get')
    def test_search_invalid_json(self, mock_get, client):
        """Test search with invalid JSON response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        with pytest.raises(json.JSONDecodeError):
            client.search("test query")

    def test_search_empty_query(self, client):
        """Test search with empty query."""
        with pytest.raises(ValueError, match="Query cannot be empty"):
            client.search("")

    def test_search_none_query(self, client):
        """Test search with None query."""
        with pytest.raises(ValueError, match="Query cannot be empty"):
            client.search(None)

    @patch('tools.brave_search_client.requests.get')
    def test_search_with_custom_headers(self, mock_get, client, mock_response_data):
        """Test search with custom headers."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        # Execute search
        client.search("test query")

        # Verify headers
        call_args = mock_get.call_args
        headers = call_args[1]['headers']
        assert headers['X-Subscription-Token'] == "test_api_key"
        assert headers['Accept'] == "application/json"

    @patch('tools.brave_search_client.requests.get')
    def test_search_rate_limit(self, mock_get, client):
        """Test search with rate limit error."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.raise_for_status.side_effect = HTTPError("Rate limit exceeded")
        mock_get.return_value = mock_response

        with pytest.raises(HTTPError):
            client.search("test query")

    @patch('tools.brave_search_client.requests.get')
    def test_search_unauthorized(self, mock_get, client):
        """Test search with unauthorized error."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = HTTPError("Unauthorized")
        mock_get.return_value = mock_response

        with pytest.raises(HTTPError):
            client.search("test query")

    def test_repr(self, client):
        """Test string representation of client."""
        repr_str = repr(client)
        assert "BraveSearchClient" in repr_str
        assert "test_api_key" not in repr_str  # API key should be hidden

    def test_str(self, client):
        """Test string conversion of client."""
        str_repr = str(client)
        assert "BraveSearchClient" in str_repr


class TestBraveSearchClientIntegration:
    """Integration tests with VCR for real API behavior."""

    @pytest.fixture
    def vcr_client(self):
        """Create client for VCR tests."""
        return BraveSearchClient(api_key="test_vcr_key")

    @vcr.use_cassette('tests/fixtures/cassettes/brave_search_basic.yaml')
    def test_search_integration_basic(self, vcr_client):
        """Test basic search integration with VCR."""
        # This will record/replay actual API calls
        result = vcr_client.search("Python programming")
        
        # Verify response structure
        assert isinstance(result, dict)
        if 'web' in result:
            assert 'results' in result['web']
            assert isinstance(result['web']['results'], list)

    @vcr.use_cassette('tests/fixtures/cassettes/brave_search_parameters.yaml')
    def test_search_integration_with_params(self, vcr_client):
        """Test search with parameters using VCR."""
        result = vcr_client.search(
            query="machine learning",
            count=5,
            country="US"
        )
        
        assert isinstance(result, dict)


@pytest.mark.network
class TestBraveSearchClientNetwork:
    """Network tests that require actual API access."""

    @pytest.mark.skipif(
        True,  # Skip network tests by default
        reason="Network tests disabled"
    )
    def test_real_api_call(self):
        """Test with real API call (requires valid API key)."""
        import os
        api_key = os.getenv("BRAVE_API_KEY")
        if not api_key:
            pytest.skip("BRAVE_API_KEY not available")
        
        client = BraveSearchClient(api_key=api_key)
        result = client.search("test query", count=1)
        
        assert isinstance(result, dict)
        assert 'web' in result or 'error' in result
