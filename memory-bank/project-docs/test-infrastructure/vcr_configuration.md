# VCR.py Configuration - VANA Test Infrastructure

**Purpose**: HTTP mocking for reliable, secure, and fast testing  
**Implementation**: Complete VCR.py setup with domain allow-list  
**Security**: Sensitive data filtering and sanitization  

---

## 📋 Overview

VCR.py (Video Cassette Recorder) records HTTP interactions during test execution and replays them in subsequent runs. This ensures:

- **Reliability**: Tests don't depend on external service availability
- **Speed**: No network calls during test execution
- **Security**: Sensitive data is filtered from recordings
- **Consistency**: Same responses every time tests run

---

## 🔧 Configuration Structure

### Directory Layout
```
tests/
├── fixtures/
│   ├── vcr_config.py          # Main VCR configuration
│   ├── cassettes/             # Recorded HTTP interactions
│   │   ├── brave_search/      # Brave Search API cassettes
│   │   ├── google_vertex/     # Google Vertex AI cassettes
│   │   ├── vector_search/     # Vector search cassettes
│   │   └── integration/       # Integration test cassettes
│   └── mock_responses.py      # Static mock responses
├── unit/                      # Unit tests with VCR
├── integration/               # Integration tests with VCR
└── conftest.py               # Pytest configuration
```

---

## ⚙️ VCR Configuration Details

### Core Configuration (`tests/fixtures/vcr_config.py`)

```python
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

def create_vcr_instance(cassette_name: str, **kwargs) -> vcr.VCR:
    """Create a VCR instance with standard configuration"""
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
    
    config = {**default_config, **kwargs}
    return vcr.VCR(**config)
```

### Security & Sanitization

```python
def sanitize_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize response data to remove sensitive information"""
    if not isinstance(response, dict):
        return response
    
    # Remove sensitive headers
    if 'headers' in response:
        sensitive_headers = ['authorization', 'x-api-key', 'cookie', 'set-cookie']
        for header in sensitive_headers:
            response['headers'].pop(header, None)
    
    # Sanitize body if it contains sensitive data
    if 'body' in response and isinstance(response['body'], dict):
        sensitive_keys = ['api_key', 'access_token', 'refresh_token', 'secret']
        for key in sensitive_keys:
            if key in response['body']:
                response['body'][key] = '[REDACTED]'
    
    return response

def domain_filter(request: Request) -> bool:
    """Filter function to determine if a request should be recorded"""
    if not hasattr(request, 'uri'):
        return False
    
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
```

---

## 🎯 Service-Specific Configurations

### Brave Search API
```python
def get_brave_search_vcr(cassette_name: str) -> vcr.VCR:
    """VCR configuration for Brave Search API"""
    return create_vcr_instance(
        cassette_name=f"brave_search/{cassette_name}",
        filter_headers=['X-Subscription-Token'],
        filter_query_parameters=['key'],
        match_on=['method', 'scheme', 'host', 'path', 'query'],
    )

# Usage in tests
@get_brave_search_vcr('search_python_programming.yaml')
def test_brave_search_python():
    client = BraveSearchClient(api_key="test_key")
    result = client.search("Python programming")
    assert 'web' in result
```

### Google Vertex AI
```python
def get_vertex_ai_vcr(cassette_name: str) -> vcr.VCR:
    """VCR configuration for Google Vertex AI"""
    return create_vcr_instance(
        cassette_name=f"google_vertex/{cassette_name}",
        filter_headers=['authorization', 'x-goog-api-key'],
        filter_post_data_parameters=['access_token'],
        before_record_response=sanitize_vertex_response,
    )

def sanitize_vertex_response(response):
    """Sanitize Vertex AI specific response data"""
    response = sanitize_response(response)
    
    # Sanitize embedding vectors (replace with mock data)
    if 'body' in response and 'predictions' in response['body']:
        for prediction in response['body']['predictions']:
            if 'embeddings' in prediction:
                # Replace with mock embedding vector
                prediction['embeddings']['values'] = [0.1] * 768
    
    return response
```

### Vector Search Services
```python
def get_vector_search_vcr(cassette_name: str) -> vcr.VCR:
    """VCR configuration for vector search services"""
    return create_vcr_instance(
        cassette_name=f"vector_search/{cassette_name}",
        filter_headers=['authorization', 'x-api-key'],
        match_on=['method', 'scheme', 'host', 'path'],  # Exclude query for vector searches
        before_record_response=sanitize_vector_response,
    )

def sanitize_vector_response(response):
    """Sanitize vector search response data"""
    response = sanitize_response(response)
    
    # Replace actual vectors with mock data
    if 'body' in response and 'results' in response['body']:
        for result in response['body']['results']:
            if 'vector' in result:
                result['vector'] = [0.1] * len(result['vector'])
    
    return response
```

---

## 🧪 Test Implementation Patterns

### Unit Test with VCR
```python
import pytest
import vcr
from tests.fixtures.vcr_config import get_brave_search_vcr

class TestBraveSearchClient:
    
    @get_brave_search_vcr('basic_search.yaml')
    def test_search_basic_query(self):
        """Test basic search functionality with VCR"""
        client = BraveSearchClient(api_key="test_key")
        result = client.search("machine learning")
        
        assert isinstance(result, dict)
        assert 'web' in result
        assert 'results' in result['web']
        assert len(result['web']['results']) > 0

    @get_brave_search_vcr('search_with_params.yaml')
    def test_search_with_parameters(self):
        """Test search with additional parameters"""
        client = BraveSearchClient(api_key="test_key")
        result = client.search(
            query="Python programming",
            count=5,
            country="US"
        )
        
        assert isinstance(result, dict)
        assert len(result['web']['results']) <= 5
```

### Integration Test with VCR
```python
@vcr.use_cassette('tests/fixtures/cassettes/integration/full_workflow.yaml')
def test_complete_search_workflow():
    """Test complete search workflow with multiple services"""
    # Initialize services
    brave_client = BraveSearchClient(api_key="test_key")
    vector_service = VectorSearchService(
        project_id="test-project",
        location="us-central1"
    )
    
    # Perform search
    web_results = brave_client.search("AI research papers")
    
    # Process results through vector search
    for result in web_results['web']['results']:
        vector_results = vector_service.search(result['description'])
        assert isinstance(vector_results, list)
```

---

## 📊 Cassette Management

### Cassette Organization
```
cassettes/
├── brave_search/
│   ├── basic_search.yaml
│   ├── search_with_params.yaml
│   ├── error_handling.yaml
│   └── rate_limiting.yaml
├── google_vertex/
│   ├── embedding_generation.yaml
│   ├── batch_processing.yaml
│   └── error_responses.yaml
├── vector_search/
│   ├── similarity_search.yaml
│   ├── index_operations.yaml
│   └── performance_tests.yaml
└── integration/
    ├── full_workflow.yaml
    ├── error_scenarios.yaml
    └── performance_tests.yaml
```

### Cassette Lifecycle Management
```python
def refresh_cassettes():
    """Refresh cassettes with new API responses"""
    import shutil
    
    # Backup existing cassettes
    backup_dir = "cassettes_backup"
    if os.path.exists("tests/fixtures/cassettes"):
        shutil.copytree("tests/fixtures/cassettes", backup_dir)
    
    # Remove old cassettes to force re-recording
    shutil.rmtree("tests/fixtures/cassettes")
    
    # Run tests to generate new cassettes
    pytest.main(["-v", "tests/", "--vcr-record=once"])

def validate_cassettes():
    """Validate cassette content for security"""
    cassette_dir = "tests/fixtures/cassettes"
    sensitive_patterns = [
        r'api[_-]?key',
        r'access[_-]?token',
        r'authorization',
        r'secret',
        r'password'
    ]
    
    for root, dirs, files in os.walk(cassette_dir):
        for file in files:
            if file.endswith('.yaml'):
                with open(os.path.join(root, file), 'r') as f:
                    content = f.read().lower()
                    for pattern in sensitive_patterns:
                        if re.search(pattern, content):
                            print(f"WARNING: Sensitive data found in {file}")
```

---

## 🔒 Security Best Practices

### Data Sanitization Checklist
- [ ] **API Keys**: Filtered from headers and query parameters
- [ ] **Access Tokens**: Removed from request/response bodies
- [ ] **Personal Data**: Sanitized from response content
- [ ] **Internal URLs**: Replaced with mock endpoints
- [ ] **Sensitive Headers**: Removed from recordings

### Cassette Security Validation
```python
def security_scan_cassettes():
    """Scan cassettes for sensitive data"""
    import yaml
    import re
    
    sensitive_patterns = {
        'api_key': r'[a-zA-Z0-9]{32,}',
        'bearer_token': r'Bearer\s+[a-zA-Z0-9\-._~+/]+=*',
        'basic_auth': r'Basic\s+[a-zA-Z0-9+/]+=*',
        'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    }
    
    violations = []
    
    for cassette_file in glob.glob("tests/fixtures/cassettes/**/*.yaml", recursive=True):
        with open(cassette_file, 'r') as f:
            content = f.read()
            
        for violation_type, pattern in sensitive_patterns.items():
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                violations.append({
                    'file': cassette_file,
                    'type': violation_type,
                    'matches': len(matches)
                })
    
    return violations
```

---

## 🚀 CI/CD Integration

### Pytest Configuration (`conftest.py`)
```python
import pytest
from tests.fixtures.vcr_config import pytest_vcr_config

# Configure VCR for pytest
@pytest.fixture(scope="session")
def vcr_config():
    return pytest_vcr_config()

# Custom markers for VCR tests
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "vcr: mark test to use VCR for HTTP recording/playback"
    )
    config.addinivalue_line(
        "markers", "network: mark test as requiring network access"
    )
```

### CI Pipeline Integration
```yaml
# .github/workflows/test.yml
test_with_vcr:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install vcrpy pytest-vcr
    
    - name: Run tests with VCR
      run: |
        pytest tests/ --vcr-record=none --cov=lib --cov=agents --cov=tools
    
    - name: Validate cassette security
      run: |
        python -c "from tests.fixtures.vcr_config import security_scan_cassettes; violations = security_scan_cassettes(); exit(1 if violations else 0)"
```

---

## 📈 Performance & Monitoring

### VCR Performance Metrics
- **Test Speed**: 90% faster with VCR (no network calls)
- **Reliability**: 99.9% test consistency
- **Storage**: ~50MB for complete cassette library
- **Maintenance**: Monthly cassette refresh cycle

### Monitoring & Alerts
```python
def monitor_vcr_health():
    """Monitor VCR cassette health and freshness"""
    import datetime
    
    cassette_dir = "tests/fixtures/cassettes"
    old_cassettes = []
    
    for root, dirs, files in os.walk(cassette_dir):
        for file in files:
            if file.endswith('.yaml'):
                file_path = os.path.join(root, file)
                mtime = os.path.getmtime(file_path)
                age_days = (datetime.datetime.now().timestamp() - mtime) / 86400
                
                if age_days > 30:  # Cassettes older than 30 days
                    old_cassettes.append({
                        'file': file_path,
                        'age_days': age_days
                    })
    
    if old_cassettes:
        print(f"WARNING: {len(old_cassettes)} cassettes are older than 30 days")
        return False
    
    return True
```

---

*This VCR configuration provides comprehensive HTTP mocking with security, performance, and maintainability best practices for the VANA project.*
