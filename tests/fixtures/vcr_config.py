"""
VCR.py configuration for VANA test suite.
Handles HTTP mocking for external API calls with domain allow-list.
"""

import os
import vcr
from vcr.request import Request
from typing import Dict, Any, List


# Domain allow-list for external HTTP calls
ALLOWED_DOMAINS = [
    "api.brave.com",
    "search.brave.com",
    "aiplatform.googleapis.com",
    "vertex-ai.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "speech.googleapis.com",
    "bigquery.googleapis.com",
    "logging.googleapis.com",
    "trace.googleapis.com",
    "oauth2.googleapis.com",
    "www.googleapis.com",
    "api.ragie.ai",
    "api.openai.com",
    "api.anthropic.com",
]


def domain_filter(request: Request) -> bool:
    """
    Filter function to determine if a request should be recorded.
    Only allows requests to domains in the allow-list.
    """
    if not hasattr(request, 'uri'):
        return False
    
    # Extract domain from URI
    try:
        from urllib.parse import urlparse
        parsed = urlparse(request.uri)
        domain = parsed.netloc.lower()
        
        # Remove port if present
        if ':' in domain:
            domain = domain.split(':')[0]
            
        # Check if domain is in allow-list
        return any(allowed in domain for allowed in ALLOWED_DOMAINS)
    except Exception:
        return False


def sanitize_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize response data to remove sensitive information.
    """
    if not isinstance(response, dict):
        return response
    
    # Remove sensitive headers
    if 'headers' in response:
        sensitive_headers = ['authorization', 'x-api-key', 'cookie', 'set-cookie']
        for header in sensitive_headers:
            response['headers'].pop(header, None)
    
    # Sanitize body if it contains sensitive data
    if 'body' in response and isinstance(response['body'], dict):
        # Remove API keys from response body
        sensitive_keys = ['api_key', 'access_token', 'refresh_token', 'secret']
        for key in sensitive_keys:
            if key in response['body']:
                response['body'][key] = '[REDACTED]'
    
    return response


def create_vcr_instance(cassette_name: str, **kwargs) -> vcr.VCR:
    """
    Create a VCR instance with standard configuration.
    
    Args:
        cassette_name: Name of the cassette file
        **kwargs: Additional VCR configuration options
    
    Returns:
        Configured VCR instance
    """
    cassette_dir = os.path.join(os.path.dirname(__file__), 'cassettes')
    os.makedirs(cassette_dir, exist_ok=True)
    
    default_config = {
        'cassette_library_dir': cassette_dir,
        'record_mode': 'once',
        'match_on': ['method', 'scheme', 'host', 'port', 'path', 'query'],
        'filter_headers': ['authorization', 'x-api-key'],
        'filter_query_parameters': ['key', 'api_key', 'access_token'],
        'before_record_response': sanitize_response,
        'decode_compressed_response': True,
    }
    
    # Merge with provided kwargs
    config = {**default_config, **kwargs}
    
    return vcr.VCR(**config)


def get_test_vcr(cassette_name: str, record_mode: str = 'once') -> vcr.VCR:
    """
    Get a VCR instance configured for testing.
    
    Args:
        cassette_name: Name of the cassette file
        record_mode: VCR record mode ('once', 'new_episodes', 'none', 'all')
    
    Returns:
        Configured VCR instance for testing
    """
    return create_vcr_instance(
        cassette_name=cassette_name,
        record_mode=record_mode,
        filter_post_data_parameters=['api_key', 'access_token', 'client_secret'],
    )


# Pytest fixture for VCR
def pytest_vcr_config():
    """
    Configuration for pytest-vcr plugin.
    """
    return {
        'filter_headers': ['authorization', 'x-api-key'],
        'filter_query_parameters': ['key', 'api_key'],
        'filter_post_data_parameters': ['api_key', 'access_token'],
        'decode_compressed_response': True,
        'record_mode': 'once',
        'cassette_library_dir': os.path.join(os.path.dirname(__file__), 'cassettes'),
        'before_record_response': sanitize_response,
    }


# Mock responses for common API endpoints
MOCK_RESPONSES = {
    'brave_search': {
        'web': {
            'results': [
                {
                    'title': 'Test Result',
                    'url': 'https://example.com',
                    'description': 'Test description',
                    'extra_snippets': ['Additional info'],
                    'age': '2024-06-21T15:45:00Z',
                }
            ]
        }
    },
    'google_vertex': {
        'predictions': [
            {
                'embeddings': {
                    'values': [0.1] * 768  # Mock embedding vector
                }
            }
        ]
    },
    'vector_search': {
        'results': [
            {
                'id': 'test-doc-1',
                'score': 0.95,
                'content': 'Test document content',
                'metadata': {'source': 'test'}
            }
        ]
    }
}


def get_mock_response(service: str, endpoint: str = 'default') -> Dict[str, Any]:
    """
    Get a mock response for a specific service and endpoint.
    
    Args:
        service: Service name (e.g., 'brave_search', 'google_vertex')
        endpoint: Specific endpoint (default: 'default')
    
    Returns:
        Mock response data
    """
    return MOCK_RESPONSES.get(service, {}).get(endpoint, {})
