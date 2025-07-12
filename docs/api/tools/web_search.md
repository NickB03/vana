# Web Search Tool Documentation

## Overview

VANA's web search functionality provides intelligent web searching capabilities using Google Custom Search API as the primary provider with automatic fallback to DuckDuckGo. This ensures reliable search functionality regardless of API availability.

## Implementation

### Primary Search: Google Custom Search (`google_search_v2.py`)

**Location**: `lib/_tools/google_search_v2.py`

**Features**:
- Native Google Custom Search API integration
- Query enhancement based on search type
- In-memory caching with 5-minute TTL
- Automatic fallback to DuckDuckGo
- Support for time, weather, and local queries

### Function Signature

```python
def google_web_search(query: str, max_results: int = 5) -> str:
    """
    🔍 Search the web using Google Custom Search API.
    
    Args:
        query: Search query string
        max_results: Maximum number of results (1-10, default 5)
    
    Returns:
        JSON string with search results including title, URL, and snippet
    """
```

### Response Format

```json
{
    "query": "original query",
    "enhanced_query": "enhanced version (if applicable)",
    "results": [
        {
            "title": "Result Title",
            "url": "https://example.com",
            "snippet": "Brief description...",
            "source": "google_search",
            "rating": "4.5",              // For venues/businesses
            "review_count": "1200",       // For venues/businesses
            "address": "123 Main St",     // For local results
            "event_name": "Event Name",   // For events
            "event_date": "2025-01-15"    // For events
        }
    ],
    "total_results": "50000",
    "search_time": "0.5",
    "mode": "google_custom_search",
    "cached": false,
    "extracted_time": "2:30 PM CST"   // For time queries
}
```

## Configuration

### Environment Variables

```bash
# Required for Gemini models and web search
GOOGLE_API_KEY=your_google_api_key

# Optional - uses default if not set
GOOGLE_CSE_ID=your_custom_search_engine_id
```

### Setup Steps

1. **Get Google API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Generate an API key
   - Add to `.env.local`

2. **Enable Custom Search API** (Optional):
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/customsearch.googleapis.com)
   - Enable the Custom Search API
   - This uses the same `GOOGLE_API_KEY`

3. **Create Custom Search Engine** (Optional):
   - Visit [CSE Control Panel](https://cse.google.com/)
   - Create a new search engine
   - Copy the Search Engine ID
   - Add as `GOOGLE_CSE_ID` in `.env.local`

## Query Enhancement

The search tool automatically enhances queries for better results:

### Time Queries
```python
# Input: "What time is it in Dallas?"
# Enhanced: "current time in dallas"

# Input: "current time"
# Enhanced: "current time UTC"
```

### Weather Queries
```python
# Input: "weather in New York"
# Enhanced: "weather forecast new york today"

# Input: "weather"
# Enhanced: "weather forecast today"
```

### Local Business Queries
```python
# Input: "live music venues in Dallas"
# Enhanced: "live music venues concerts tonight dallas"

# Input: "restaurants near me"
# Enhanced: Query passed as-is with local intent
```

## Caching

- **TTL**: 5 minutes per query
- **Storage**: In-memory dictionary
- **Size Limit**: 100 entries (LRU eviction)
- **Key**: Case-insensitive query string

## Fallback Behavior

The system falls back to DuckDuckGo when:

1. **No API Key**: `GOOGLE_API_KEY` not configured
2. **API Errors**: 403, 429, or other HTTP errors
3. **Network Issues**: Connection failures
4. **Quota Exceeded**: API rate limits hit

### Fallback Example

```python
# When Google fails, automatic fallback:
try:
    # Try Google Custom Search
    result = perform_google_search(query)
except:
    # Fallback to DuckDuckGo
    from lib._tools.web_search_sync import web_search as ddg_search
    result = ddg_search(query, max_results)
```

## Integration with VANA

### ADK Tool Registration

```python
# Created as ADK tool
adk_google_web_search = FunctionTool(func=google_web_search)
adk_google_web_search.name = "google_web_search"
adk_google_web_search.description = "Search the web using Google Search"
```

### Agent Usage

```python
# In adk_tools.py
async def web_search(query: str, max_results: int = 5) -> str:
    """🌐 Search the web using Google Search (ADK compliant)."""
    from lib._tools.google_search_v2 import google_web_search
    result = await asyncio.to_thread(google_web_search, query, max_results)
    return result
```

## Migration from Brave API

### Previous Implementation (Deprecated)
- Required `BRAVE_API_KEY`
- Limited to Brave Search results
- No query enhancement
- No caching

### New Implementation (Current)
- Uses `GOOGLE_API_KEY` (same as Gemini)
- Google Custom Search with metadata
- Intelligent query enhancement
- Built-in caching
- Automatic DuckDuckGo fallback

### Migration Steps

1. **Remove Brave API Key**:
   ```bash
   # Remove from .env files
   # BRAVE_API_KEY=xxx  # No longer needed
   ```

2. **Update Imports**:
   ```python
   # Old
   from lib._tools.brave_search import brave_web_search
   
   # New
   from lib._tools.google_search_v2 import google_web_search
   ```

3. **No Code Changes Required**: The web_search tool in agents automatically uses the new implementation.

## Examples

### Basic Search
```python
result = google_web_search("Python async programming", max_results=5)
```

### Time Query
```python
result = google_web_search("What time is it in Tokyo?")
# Automatically enhanced to: "current time in tokyo"
# Returns extracted_time field
```

### Local Business Search
```python
result = google_web_search("live music venues in Austin", max_results=8)
# Enhanced with "concerts tonight"
# Returns venue metadata (ratings, addresses)
```

### Cached Request
```python
# First request - hits API
result1 = google_web_search("latest AI news")

# Second request within 5 minutes - returns cached
result2 = google_web_search("latest AI news")
# result2["cached"] == True
```

## Error Handling

All errors are logged and handled gracefully:

```python
# API Key Missing
WARNING: GOOGLE_API_KEY not configured, falling back to DuckDuckGo

# API Quota Exceeded
ERROR: Google API quota exceeded, falling back to DuckDuckGo

# Network Error
ERROR: Google search error: <error>, falling back to DuckDuckGo
```

## Performance

- **Cache Hit**: <1ms response time
- **Google API**: ~500ms average
- **DuckDuckGo Fallback**: ~800ms average
- **Max Results**: 10 (Google API limit)
- **Cache Size**: 100 entries max

## Testing

```bash
# Run unit tests
poetry run pytest tests/unit/test_google_search.py -v

# Run integration tests
poetry run pytest tests/integration/test_web_search_integration.py -v

# Test with VANA agent
python -c "from agents.vana.team import agent; 
print(agent.run('What time is it in Dallas?', stream=False))"
```

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**:
   - Enable Custom Search API in Google Cloud Console
   - Verify API key has correct permissions

2. **No Results**:
   - Check if fallback to DuckDuckGo is working
   - Verify query enhancement logic

3. **Cache Not Working**:
   - Check if queries are exact matches (case-insensitive)
   - Verify TTL hasn't expired (5 minutes)

### Debug Mode

```python
import logging
logging.getLogger("lib._tools.google_search_v2").setLevel(logging.DEBUG)
```