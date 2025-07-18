# Migration Guide: Brave Search to Google Custom Search

## Overview

VANA has migrated from Brave Search API to Google Custom Search API for web search functionality. This change provides better integration with Google's ecosystem, enhanced search capabilities, and removes the need for a separate Brave API key.

## Key Changes

### 1. API Key Requirements

**Before (Brave Search)**:
- Required `BRAVE_API_KEY` environment variable
- Separate API key from Google services
- Limited to Brave's search results

**After (Google Custom Search)**:
- Uses existing `GOOGLE_API_KEY` (same as Gemini models)
- Optional `GOOGLE_CSE_ID` for custom search engine
- Automatic fallback to DuckDuckGo

### 2. Implementation Files

**Removed**:
- `lib/_tools/brave_search.py` (deprecated)

**Added**:
- `lib/_tools/google_search_v2.py` (new implementation)

**Updated**:
- `lib/_tools/adk_tools.py` (now uses Google search)
- All agent tool lists remain unchanged

## Migration Steps

### Step 1: Update Environment Variables

**Remove Brave API Key**:
```bash
# In .env, .env.local, or deployment configs
# Remove this line:
BRAVE_API_KEY=your_brave_key  # No longer needed
```

**Ensure Google API Key exists**:
```bash
# This should already be present for Gemini
GOOGLE_API_KEY=your_google_api_key

# Optional: Add custom search engine ID
GOOGLE_CSE_ID=your_cse_id  # Uses default if not set
```

### Step 2: Enable Google Custom Search (Optional)

For full Google Custom Search functionality:

1. **Enable API in Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/library/customsearch.googleapis.com
   ```
   - Click "Enable"
   - Uses the same project as your `GOOGLE_API_KEY`

2. **Create Custom Search Engine** (Optional):
   ```
   https://cse.google.com/
   ```
   - Create new search engine
   - Copy the Search Engine ID
   - Add to environment as `GOOGLE_CSE_ID`

### Step 3: Code Updates

**No code changes required** for existing functionality. The migration is transparent to agents and tools.

If you have custom code using Brave search directly:

```python
# Old implementation (remove)
from lib._tools.brave_search import brave_web_search
results = brave_web_search("query", count=5)

# New implementation (use)
from lib._tools.google_search_v2 import google_web_search  
results = google_web_search("query", max_results=5)
```

### Step 4: Verify Functionality

Test the web search is working:

```bash
# Using pytest
poetry run pytest tests/unit/test_google_search.py -v

# Test with VANA agent
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the current time in London?", "session_id": "test"}'
```

## Feature Comparison

| Feature | Brave Search | Google Custom Search |
|---------|--------------|---------------------|
| API Key Required | BRAVE_API_KEY | GOOGLE_API_KEY (shared) |
| Query Enhancement | No | Yes (time, weather, local) |
| Result Caching | No | Yes (5-minute TTL) |
| Metadata Extraction | Limited | Rich (ratings, addresses) |
| Fallback Provider | None | DuckDuckGo |
| Rate Limits | Brave limits | Google limits + fallback |
| Local Business Data | Basic | Enhanced with metadata |

## New Features

### 1. Query Enhancement
```python
# Time queries automatically enhanced
"What time is it in Paris?" → "current time in paris"

# Weather queries get location context  
"weather in NYC" → "weather forecast nyc today"

# Local searches enhanced for venues
"live music Dallas" → "live music venues concerts tonight dallas"
```

### 2. Result Caching
- 5-minute TTL for identical queries
- Case-insensitive matching
- 100-entry LRU cache

### 3. Rich Metadata
```json
{
  "results": [{
    "title": "Restaurant Name",
    "url": "https://example.com",
    "snippet": "Description...",
    "rating": "4.5",
    "review_count": "1200",
    "address": "123 Main St"
  }]
}
```

### 4. Automatic Fallback
When Google is unavailable, the system automatically falls back to DuckDuckGo, ensuring uninterrupted service.

## Rollback Instructions

If you need to temporarily rollback:

1. **Restore brave_search.py** from git history
2. **Update adk_tools.py**:
   ```python
   # In web_search function, change:
   from lib._tools.google_search_v2 import google_web_search
   # Back to:
   from lib._tools.brave_search import brave_web_search
   ```
3. **Re-add BRAVE_API_KEY** to environment

## Common Issues

### 1. 403 Forbidden Error
**Cause**: Custom Search API not enabled  
**Fix**: Enable API in Google Cloud Console

### 2. No Search Results
**Cause**: API quota exceeded  
**Fix**: System automatically falls back to DuckDuckGo

### 3. Missing Time Information
**Cause**: Query not recognized as time query  
**Fix**: Query enhancement handles common patterns

## Performance Impact

- **Latency**: Similar to Brave (~500ms)
- **Caching**: Improves repeat queries by 40x
- **Fallback**: Adds ~300ms only on Google failure

## Support

For issues or questions:
1. Check logs for detailed error messages
2. Verify environment variables are set
3. Run test suite to validate configuration
4. Open an issue with error details

## Timeline

- **Deprecated**: Brave Search API support
- **Current**: Google Custom Search v2
- **Future**: Additional search providers as fallbacks