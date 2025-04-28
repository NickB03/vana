# Web Search Integration

This document outlines the integration of web search capabilities into the VANA system using Google Custom Search API.

## Overview

Web search integration allows VANA to access up-to-date information from the web, complementing the knowledge stored in Vector Search and Knowledge Graph. This is particularly useful for:

1. Answering questions about recent events
2. Providing information not available in the knowledge base
3. Verifying or supplementing existing knowledge
4. Accessing a wider range of information sources

## Implementation

The web search integration consists of the following components:

1. **Web Search Client**: Interfaces with the Google Custom Search API
2. **Enhanced Hybrid Search**: Combines web search results with Vector Search and Knowledge Graph
3. **Mock Implementation**: Provides a testing environment without API credentials

### Web Search Client

The `WebSearchClient` class in `tools/web_search.py` provides the interface to the Google Custom Search API:

```python
class WebSearchClient:
    """Client for performing web searches using Google Custom Search API"""
    
    def __init__(self):
        """Initialize the web search client"""
        self.api_key = os.environ.get("GOOGLE_SEARCH_API_KEY")
        self.engine_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
        self.base_url = "https://www.googleapis.com/customsearch/v1"
    
    def is_available(self) -> bool:
        """Check if web search is available"""
        return bool(self.api_key and self.engine_id)
    
    def search(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Perform a web search
        
        Args:
            query: Search query
            num_results: Number of results to return (max 10)
            
        Returns:
            List of search results with title, snippet, and URL
        """
        if not self.is_available():
            return []
        
        # Ensure num_results is within limits
        if num_results > 10:
            num_results = 10
        
        # Prepare request parameters
        params = {
            "key": self.api_key,
            "cx": self.engine_id,
            "q": query,
            "num": num_results
        }
        
        try:
            # Send request to Google Custom Search API
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            
            # Extract and format results
            results = []
            if "items" in data:
                for item in data["items"]:
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                        "source": self._extract_domain(item.get("link", "")),
                        "date": item.get("pagemap", {}).get("metatags", [{}])[0].get("article:published_time", "")
                    })
            
            return results
        
        except Exception as e:
            print(f"Error in web search: {str(e)}")
            return []
    
    def format_results(self, results: List[Dict[str, Any]]) -> str:
        """
        Format search results for display
        
        Args:
            results: List of search results
            
        Returns:
            Formatted string with search results
        """
        if not results:
            return "No web search results found."
        
        formatted = "Web Search Results:\n\n"
        
        for i, result in enumerate(results, 1):
            title = result.get("title", "")
            url = result.get("url", "")
            snippet = result.get("snippet", "")
            source = result.get("source", "")
            date = result.get("date", "")
            
            formatted += f"{i}. {title}\n"
            if snippet:
                formatted += f"{snippet}\n"
            formatted += f"Source: {source}"
            if date:
                formatted += f" ({date[:10]})"
            formatted += f"\n{url}\n\n"
        
        return formatted
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            return urlparse(url).netloc
        except:
            return ""
```

### Mock Implementation

For testing purposes, a mock implementation is provided in `tools/web_search_mock.py`:

```python
class MockWebSearchClient(WebSearchClient):
    """Mock client for performing web searches"""
    
    def __init__(self):
        """Initialize the mock web search client"""
        super().__init__()
        self.mock_data = self._load_mock_data()
    
    def _load_mock_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load mock data for predefined queries"""
        mock_data = {
            "vana": [
                {
                    "title": "VANA: Versatile Agent Network Architecture",
                    "url": "https://example.com/vana",
                    "snippet": "VANA is a Versatile Agent Network Architecture that leverages Google's Agent Development Kit (ADK) to provide powerful knowledge retrieval capabilities.",
                    "source": "example.com",
                    "date": "2023-05-15"
                }
            ],
            # Additional mock data...
        }
        return mock_data
    
    def is_available(self) -> bool:
        """Check if web search is available"""
        return True
    
    def search(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Perform a mock web search
        
        Args:
            query: Search query
            num_results: Number of results to return (max 10)
            
        Returns:
            List of search results with title, snippet, and URL
        """
        # Find the best matching predefined query
        best_match = None
        best_match_score = 0
        
        for predefined_query in self.mock_data.keys():
            # Calculate simple match score
            query_words = set(re.findall(r'\w+', query.lower()))
            predefined_words = set(re.findall(r'\w+', predefined_query.lower()))
            common_words = query_words.intersection(predefined_words)
            score = len(common_words)
            
            if score > best_match_score:
                best_match = predefined_query
                best_match_score = score
        
        # Return predefined results or generic results
        if best_match_score > 0:
            return self.mock_data[best_match][:num_results]
        else:
            return [
                {
                    "title": "Generic Result for " + query,
                    "url": "https://example.com/search?q=" + query.replace(" ", "+"),
                    "snippet": "This is a generic result for the query: " + query,
                    "source": "example.com",
                    "date": "2023-10-01"
                }
            ]
```

### Enhanced Hybrid Search

The `EnhancedHybridSearch` class in `tools/enhanced_hybrid_search.py` combines web search results with Vector Search and Knowledge Graph:

```python
class EnhancedHybridSearch(HybridSearch):
    """Enhanced hybrid search combining Vector Search, Knowledge Graph, and Web Search"""

    def __init__(self, vector_search_client=None, kg_manager=None, web_search_client=None):
        """Initialize the enhanced hybrid search"""
        super().__init__(vector_search_client, kg_manager)
        self.web_search_client = web_search_client or WebSearchClient()

    def search(self, query: str, top_k: int = 5, include_web: bool = True) -> Dict[str, Any]:
        """Search for relevant information using Vector Search, Knowledge Graph, and Web Search"""
        results = {
            "vector_search": [],
            "knowledge_graph": [],
            "web_search": [],
            "combined": [],
            "error": None
        }

        # Get Vector Search and Knowledge Graph results
        basic_results = super().search(query, top_k=top_k)
        results["vector_search"] = basic_results["vector_search"]
        results["knowledge_graph"] = basic_results["knowledge_graph"]

        # Get Web Search results if requested
        if include_web and self.web_search_client.is_available():
            web_results = self.web_search_client.search(query, num_results=top_k)
            results["web_search"] = web_results

        # Combine results
        results["combined"] = self._combine_results(
            results["vector_search"],
            results["knowledge_graph"],
            results["web_search"],
            top_k=top_k
        )

        return results

    def _combine_results(self, vector_results, kg_results, web_results, top_k=5):
        """Combine and rank results from Vector Search, Knowledge Graph, and Web Search"""
        combined = []

        # Add Vector Search results
        for result in vector_results:
            combined.append({
                "content": result.get("content", ""),
                "score": result.get("score", 0),
                "source": "vector_search",
                "metadata": result.get("metadata", {})
            })

        # Add Knowledge Graph results
        for result in kg_results:
            combined.append({
                "content": result.get("observation", ""),
                "score": 0.5,  # Default score for Knowledge Graph results
                "source": "knowledge_graph",
                "metadata": {
                    "name": result.get("name", ""),
                    "type": result.get("type", "")
                }
            })

        # Add Web Search results
        for result in web_results:
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            url = result.get("url", "")
            source = result.get("source", "")
            date = result.get("date", "")

            content = f"{title}\n{snippet}\nSource: {source}"
            if date:
                content += f" ({date[:10]})"
            content += f"\n{url}"

            combined.append({
                "content": content,
                "score": 0.4,  # Default score for Web Search results
                "source": "web_search",
                "metadata": {
                    "title": title,
                    "url": url,
                    "source": source,
                    "date": date
                }
            })

        # Sort by score (descending)
        combined.sort(key=lambda x: x["score"], reverse=True)

        # Return top_k results
        return combined[:top_k]
```

## Configuration

To use the web search integration, you need to set up a Google Custom Search Engine and obtain API credentials:

1. **Create a Google Custom Search Engine**:
   - Go to the [Google Programmable Search Engine Control Panel](https://programmablesearch.google.com/control-panel/create)
   - Create a new search engine
   - Configure it to search the entire web
   - Note the Search Engine ID (cx)

2. **Get a Google API Key**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Custom Search API
   - Create an API key
   - Note the API key

3. **Set Environment Variables**:
   - Add the following to your `.env` file:
   ```
   GOOGLE_SEARCH_API_KEY=your_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```

## Usage

### Command Line

The web search can be used from the command line:

```bash
python -m tools.web_search "What is VANA?"
```

### VANA Agent

The web search is integrated into the VANA agent and can be accessed through the following commands:

- `!web_search [query]` - Search the web for recent information
- `!enhanced_search [query]` - Combined search of Vector Search, Knowledge Graph, and Web Search

### Programmatic Usage

```python
from tools.web_search import WebSearchClient
from tools.enhanced_hybrid_search import EnhancedHybridSearch

# Web search only
web_search = WebSearchClient()
results = web_search.search("What is VANA?", num_results=5)
formatted = web_search.format_results(results)
print(formatted)

# Enhanced hybrid search
hybrid_search = EnhancedHybridSearch()
results = hybrid_search.search("What is VANA?", top_k=5, include_web=True)
formatted = hybrid_search.format_results(results)
print(formatted)
```

## Testing

The web search integration includes comprehensive tests:

- `tests/test_web_search_mock.py` - Tests the mock web search client
- `tests/test_enhanced_hybrid_search.py` - Tests the enhanced hybrid search
- `tests/test_enhanced_hybrid_search_comprehensive.py` - Comprehensive tests for enhanced hybrid search

To run the tests:

```bash
python tests/test_web_search_mock.py
python tests/test_enhanced_hybrid_search.py
python tests/test_enhanced_hybrid_search_comprehensive.py
```

## Limitations

1. **API Quota**: The Google Custom Search API has a quota of 100 queries per day for free accounts
2. **Result Limit**: The API returns a maximum of 10 results per query
3. **Freshness**: Web search results may not be completely up-to-date
4. **Relevance**: Web search results may not always be relevant to the query

## Next Steps

1. **Google Custom Search API**: Configure with proper credentials
2. **Result Ranking**: Enhance the ranking algorithm for better result ordering
3. **Query Understanding**: Improve query analysis for better routing
4. **Personalization**: Implement personalized search based on user context
5. **Multi-hop Reasoning**: Enable following multiple relationship paths for complex queries
