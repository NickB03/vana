# Web Search Configuration

This document outlines the configuration process for the Web Search integration in Project Vana.

## Google Custom Search API Setup

### Prerequisites
- Google Cloud account
- Access to Google Cloud Console
- Project Vana repository

### Setup Process

1. **Enable Custom Search API**
   - In Google Cloud Console, navigate to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"

2. **Create API Credentials**
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" and select "API Key"
   - Copy the generated API key

3. **Create Programmable Search Engine**
   - Go to [Programmable Search Engine Control Panel](https://programmablesearchengine.google.com/cse/all)
   - Click "Add" to create a new search engine
   - Configure search settings (sites to search, name, etc.)
   - After creation, go to "Setup" > "Basics" to find your "Search engine ID"

4. **Update Environment Variables**
   - Add to `.env` file:
   ```
   GOOGLE_SEARCH_API_KEY=your_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
   ```

## API Key Restrictions

> **TODO:** We need to come back and apply API key restrictions when production details are finalized.

The following restrictions should be applied to the API key before deploying to production:

1. **Application Restrictions**
   - Choose appropriate restrictions based on deployment environment:
     - HTTP referrers (websites)
     - IP addresses
     - Application platforms

2. **API Restrictions**
   - Restrict the key to only work with "Custom Search API"

3. **Quota Restrictions**
   - Set appropriate daily limits to prevent excessive usage

## Implementation Details

The web search is implemented in the `WebSearchClient` class located in `tools/web_search_client.py`. This class handles:

1. Authentication with the Google Custom Search API
2. Query formatting and sending
3. Result parsing and normalization
4. Error handling

For testing purposes, a `MockWebSearchClient` class is also available, which returns predefined results for known queries.

### Current Implementation

The current implementation uses hardcoded API credentials to avoid environment variable issues:

```python
def __init__(self):
    """Initialize the web search client with API credentials."""
    # Use the provided API key directly
    self.api_key = "AIzaSyAZtFNVDHlb6r6bR6VIPVtLcl29rOS_yRk"
    self.search_engine_id = "04ca3153331b749b0"
```

This approach ensures that the web search functionality works correctly regardless of environment variable configuration. In a future update, we'll implement a more secure approach for handling API credentials.

### Verification

A verification script is available to test the web search functionality:

```bash
python scripts/verify_web_search.py
```

This script checks if the API credentials are valid and performs a test search to ensure everything is working correctly.

## Usage Example

```python
from tools.web_search_client import get_web_search_client

# Get real client
client = get_web_search_client()

# Search with real client
results = client.search("VANA architecture", num_results=5)

# Get mock client for testing
mock_client = get_web_search_client(use_mock=True)

# Search with mock client
mock_results = mock_client.search("VANA architecture", num_results=5)
```
