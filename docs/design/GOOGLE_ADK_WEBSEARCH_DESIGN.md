# Google ADK Compliant Web Search Design

## Overview
Design specification for replacing Brave API-based web search with Google ADK compliant native search functionality.

## Current State Analysis

### Existing Implementation
- **Primary**: Uses Brave Search API (requires `BRAVE_API_KEY`)
- **Fallback**: DuckDuckGo Instant Answer API (no key required)
- **Location**: `/lib/_tools/adk_tools.py` - `web_search()` function
- **Dependencies**: External API keys, aiohttp for async requests

### Issues with Current Approach
1. Requires external API key (Brave)
2. Fallback to DuckDuckGo has limited results
3. Not utilizing Google's native capabilities
4. Inconsistent with ADK patterns

## Proposed Design

### Architecture Overview
```
┌─────────────────────┐
│   VANA Agent        │
│  (uses web_search)  │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  ADK Web Search     │
│   Function Tool     │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Google Search API   │
│ (using GOOGLE_API_KEY)
└─────────────────────┘
```

### Implementation Strategy

#### Option 1: Google Custom Search API (Recommended)
- **Pros**: 
  - Direct Google search results
  - Uses existing `GOOGLE_API_KEY`
  - Rich structured data
  - 100 free queries/day
- **Cons**: 
  - Requires Custom Search Engine setup
  - Query limits on free tier

#### Option 2: Google Gemini Web Grounding
- **Pros**: 
  - Built into Gemini models
  - No separate API needed
  - Real-time information
- **Cons**: 
  - Less control over search results
  - Requires model upgrade

#### Option 3: Google Search via Generative AI
- **Pros**: 
  - Integrated with google-genai
  - Context-aware results
- **Cons**: 
  - May not be available in ADK
  - Token consumption

## Detailed Design (Option 1 - Recommended)

### 1. New Web Search Implementation
```python
# lib/_tools/google_search.py
import os
import json
import logging
from typing import List, Dict, Any
from google.adk.tools import FunctionTool
import httpx

logger = logging.getLogger(__name__)

def google_web_search(query: str, max_results: int = 5) -> str:
    """
    🔍 Search the web using Google Custom Search API.
    
    Args:
        query: Search query string
        max_results: Maximum number of results (1-10)
    
    Returns:
        JSON string with search results
    """
    try:
        # Get API credentials
        api_key = os.getenv("GOOGLE_API_KEY")
        cx = os.getenv("GOOGLE_CSE_ID", "017576662512468239146:omuauf_lfve")  # Default public CSE
        
        if not api_key:
            return json.dumps({
                "error": "GOOGLE_API_KEY not configured",
                "fallback": "Please set GOOGLE_API_KEY in environment"
            })
        
        # Build request
        base_url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": cx,
            "q": query,
            "num": min(max_results, 10)  # API limit
        }
        
        # Make request
        with httpx.Client(timeout=10.0) as client:
            response = client.get(base_url, params=params)
            response.raise_for_status()
            
        data = response.json()
        
        # Extract results
        results = []
        for item in data.get("items", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "source": "google_search"
            })
        
        # Add metadata
        search_info = data.get("searchInformation", {})
        
        return json.dumps({
            "query": query,
            "results": results,
            "total_results": search_info.get("totalResults", "0"),
            "search_time": search_info.get("searchTime", 0),
            "mode": "google_custom_search"
        }, indent=2)
        
    except Exception as e:
        logger.error(f"Google search error: {e}")
        # Fallback to DuckDuckGo
        from lib._tools.web_search_sync import web_search as ddg_search
        return ddg_search(query, max_results)

# Create ADK tool
adk_google_web_search = FunctionTool(func=google_web_search)
```

### 2. Update ADK Tools Integration
```python
# In lib/_tools/adk_tools.py

# Replace the existing web_search function
async def web_search(query: str, max_results: int = 5) -> str:
    """🌐 Search the web using Google Search (ADK compliant)."""
    try:
        # Use the new Google search implementation
        from lib._tools.google_search import google_web_search
        
        # Run synchronous function in thread pool for async compatibility
        result = await asyncio.to_thread(google_web_search, query, max_results)
        return result
        
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return json.dumps({"error": str(e)})
```

### 3. Configuration Updates
```yaml
# .env.example additions
# Google Search Configuration
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CSE_ID=your_custom_search_engine_id  # Optional, uses default if not set
```

### 4. Enhanced Features

#### Time-Aware Queries
```python
def _enhance_time_queries(query: str) -> str:
    """Enhance time-related queries with current context."""
    if "current time" in query.lower() or "what time" in query.lower():
        # Add timezone context
        location = _extract_location(query)
        if location:
            return f"current time in {location} timezone"
    return query
```

#### Local Search Support
```python
def _enhance_local_queries(query: str) -> str:
    """Enhance local queries (restaurants, venues, etc.)."""
    if any(term in query.lower() for term in ["near me", "nearby", "local"]):
        # Could integrate with user's location if available
        return f"{query} location-based results"
    return query
```

## Migration Plan

### Phase 1: Implementation
1. Create `google_search.py` with new implementation
2. Add unit tests for Google search
3. Update environment configuration

### Phase 2: Integration
1. Update `adk_tools.py` to use new search
2. Remove Brave API dependencies
3. Update VANA agent instructions

### Phase 3: Testing
1. Test with various query types:
   - Time queries: "What time is it in Dallas?"
   - Weather: "Weather in New York"
   - Local: "Live music venues in Dallas"
   - News: "Latest technology news"
2. Verify fallback behavior
3. Performance testing

### Phase 4: Deployment
1. Update documentation
2. Update `.env.example`
3. Deploy to production

## Benefits

1. **No External Dependencies**: Uses Google ecosystem
2. **Consistent API**: Same authentication as other Google services
3. **Better Results**: Direct Google search quality
4. **Cost Effective**: 100 free queries/day
5. **ADK Compliant**: Follows ADK patterns and best practices

## Testing Strategy

### Unit Tests
```python
def test_google_search_basic():
    """Test basic search functionality."""
    result = google_web_search("Python programming", 5)
    data = json.loads(result)
    assert "results" in data
    assert len(data["results"]) <= 5

def test_google_search_no_api_key():
    """Test behavior without API key."""
    # Temporarily remove API key
    old_key = os.environ.get("GOOGLE_API_KEY")
    os.environ.pop("GOOGLE_API_KEY", None)
    
    result = google_web_search("test", 1)
    data = json.loads(result)
    assert "error" in data or "fallback" in data
    
    # Restore key
    if old_key:
        os.environ["GOOGLE_API_KEY"] = old_key
```

### Integration Tests
```python
async def test_vana_web_search():
    """Test VANA agent using web search."""
    # Test the agent with search queries
    response = await vana_agent.process("What time is it in Dallas?")
    assert "time" in response.lower()
    assert "dallas" in response.lower()
```

## Documentation Updates

### CLAUDE.md Updates
```markdown
### Web Search Configuration
VANA now uses Google Custom Search API for web queries:
- Set `GOOGLE_API_KEY` in `.env`
- Optionally set `GOOGLE_CSE_ID` for custom search engine
- 100 free searches per day
- Automatic fallback to DuckDuckGo if quota exceeded
```

### User Guide
```markdown
## Web Search Features
VANA can search the web for:
- Current time in any location
- Weather information
- Local venues and businesses  
- Latest news and events
- General web queries

Simply ask naturally:
- "What time is it in Tokyo?"
- "Find live music venues in Dallas tonight"
- "Current weather in San Francisco"
```

## Security Considerations

1. **API Key Protection**: 
   - Never log API keys
   - Use environment variables only
   - Implement rate limiting

2. **Query Sanitization**:
   - Sanitize user queries before API calls
   - Prevent injection attacks
   - Validate query length

3. **Result Filtering**:
   - Filter inappropriate content
   - Verify URL safety
   - Sanitize HTML in snippets

## Performance Optimization

1. **Caching**: 
   - Cache recent searches (5-minute TTL)
   - Use query normalization for cache keys

2. **Async Processing**:
   - Maintain async compatibility
   - Use connection pooling

3. **Fallback Strategy**:
   - Graceful degradation to DuckDuckGo
   - Clear error messages
   - Maintain functionality

## Monitoring & Metrics

1. **Track Usage**:
   - Daily query count
   - API quota consumption
   - Error rates

2. **Performance Metrics**:
   - Response times
   - Cache hit rates
   - Fallback frequency

3. **Quality Metrics**:
   - User satisfaction
   - Result relevance
   - Query success rate