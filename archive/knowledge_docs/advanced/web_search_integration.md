# Web Search Integration in VANA

## Overview

VANA integrates web search capabilities to provide up-to-date information from the internet. This integration complements the existing knowledge base with real-time information, ensuring that responses are both comprehensive and current.

## Google Custom Search Integration

VANA uses Google's Custom Search API to retrieve information from the web:

### Configuration

To configure web search integration, you need:

1. **Google API Key**: For authentication with Google's API
2. **Custom Search Engine ID**: Identifies your custom search engine

These credentials should be stored in environment variables:

```
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

### Web Search Client

The `WebSearchClient` class handles web search requests:

```python
class WebSearchClient:
    """Client for web search using Google Custom Search API"""
    
    def __init__(self, api_key=None, search_engine_id=None):
        """
        Initialize the web search client
        
        Args:
            api_key: Google API key
            search_engine_id: Google Custom Search Engine ID
        """
        self.api_key = api_key or os.environ.get("GOOGLE_SEARCH_API_KEY")
        self.search_engine_id = search_engine_id or os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
        
        if not self.api_key or not self.search_engine_id:
            logger.warning("Google Search API key or Search Engine ID not provided")
            self.available = False
        else:
            self.available = True
    
    def search(self, query, num_results=5):
        """
        Search the web
        
        Args:
            query: Search query
            num_results: Number of results to retrieve
            
        Returns:
            Search results
        """
        if not self.available:
            return {"error": "Web search not available"}
        
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                "key": self.api_key,
                "cx": self.search_engine_id,
                "q": query,
                "num": min(num_results, 10)  # API limit is 10
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            items = data.get("items", [])
            
            results = []
            for item in items:
                results.append({
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                    "url": item.get("link", ""),
                    "source": "web"
                })
            
            return results
        
        except Exception as e:
            logger.error(f"Error in web search: {str(e)}")
            return {"error": str(e)}
```

## Mock Web Search for Testing

For testing purposes, VANA includes a mock web search client:

```python
class MockWebSearchClient:
    """Mock client for web search (for testing)"""
    
    def __init__(self):
        """Initialize the mock web search client"""
        self.available = True
        
        # Predefined results for common queries
        self.predefined_results = {
            "vana": [
                {
                    "title": "VANA: Versatile Agent Network Architecture",
                    "snippet": "VANA is an intelligent agent system that leverages Google's Agent Development Kit (ADK) to provide powerful knowledge retrieval capabilities.",
                    "url": "https://example.com/vana",
                    "source": "web"
                }
            ],
            "vector search": [
                {
                    "title": "Vector Search in AI Applications",
                    "snippet": "Vector Search enables semantic search capabilities by finding similar vectors in high-dimensional space.",
                    "url": "https://example.com/vector-search",
                    "source": "web"
                }
            ],
            "knowledge graph": [
                {
                    "title": "Knowledge Graph: Structured Knowledge Representation",
                    "snippet": "Knowledge Graphs represent information as entities and relationships, enabling structured knowledge representation and complex queries.",
                    "url": "https://example.com/knowledge-graph",
                    "source": "web"
                }
            ]
        }
    
    def search(self, query, num_results=5):
        """
        Search the web (mock)
        
        Args:
            query: Search query
            num_results: Number of results to retrieve
            
        Returns:
            Mock search results
        """
        # Normalize query
        normalized_query = query.lower()
        
        # Check for predefined results
        for key, results in self.predefined_results.items():
            if key in normalized_query:
                return results[:num_results]
        
        # Generate generic results
        return [
            {
                "title": f"Result for {query}",
                "snippet": f"This is a mock result for the query: {query}",
                "url": f"https://example.com/search?q={query.replace(' ', '+')}",
                "source": "web"
            }
        ]
```

## Integration with Enhanced Hybrid Search

Web search is integrated with VANA's Enhanced Hybrid Search:

```python
class EnhancedHybridSearch:
    """Enhanced Hybrid Search with Web Integration"""
    
    def __init__(self, 
                 vector_search_client=None, 
                 kg_manager=None,
                 web_search_client=None):
        """
        Initialize Enhanced Hybrid Search
        
        Args:
            vector_search_client: Vector Search client
            kg_manager: Knowledge Graph manager
            web_search_client: Web Search client
        """
        self.vector_search_client = vector_search_client or VectorSearchClient()
        self.kg_manager = kg_manager or KnowledgeGraphManager()
        self.web_search_client = web_search_client or WebSearchClient()
        
        # Check availability
        self.vs_available = self.vector_search_client.is_available()
        self.kg_available = self.kg_manager.is_available()
        self.web_available = self.web_search_client.available
    
    def search(self, query, top_k=5, include_web=True):
        """
        Perform enhanced hybrid search
        
        Args:
            query: Search query
            top_k: Number of results to retrieve
            include_web: Whether to include web search results
            
        Returns:
            Combined search results
        """
        results = {}
        
        # Vector Search
        if self.vs_available:
            try:
                vs_results = self.vector_search_client.search(query, top_k=top_k)
                results["vector_search"] = vs_results
            except Exception as e:
                logger.error(f"Error in Vector Search: {str(e)}")
                results["vector_search"] = []
        else:
            results["vector_search"] = []
        
        # Knowledge Graph
        if self.kg_available:
            try:
                kg_results = self.kg_manager.query("*", query)
                entities = kg_results.get("entities", [])
                
                # Convert to common format
                kg_formatted = []
                for entity in entities:
                    kg_formatted.append({
                        "content": entity.get("observation", ""),
                        "metadata": {
                            "name": entity.get("name", ""),
                            "type": entity.get("type", ""),
                            "source": "knowledge_graph"
                        }
                    })
                
                results["knowledge_graph"] = kg_formatted
            except Exception as e:
                logger.error(f"Error in Knowledge Graph: {str(e)}")
                results["knowledge_graph"] = []
        else:
            results["knowledge_graph"] = []
        
        # Web Search
        if include_web and self.web_available:
            try:
                web_results = self.web_search_client.search(query, num_results=top_k)
                
                # Convert to common format
                web_formatted = []
                for result in web_results:
                    web_formatted.append({
                        "content": f"{result.get('title')} {result.get('snippet')}",
                        "metadata": {
                            "url": result.get("url", ""),
                            "title": result.get("title", ""),
                            "source": "web"
                        }
                    })
                
                results["web_search"] = web_formatted
            except Exception as e:
                logger.error(f"Error in Web Search: {str(e)}")
                results["web_search"] = []
        else:
            results["web_search"] = []
        
        # Combine results
        combined = self.combine_results(results, query)
        results["combined"] = combined
        
        return results
```

## Result Merging and Ranking

Web search results are merged with other results using a sophisticated ranking algorithm:

```python
def combine_results(self, results, query):
    """
    Combine results from different sources
    
    Args:
        results: Results from different sources
        query: Original search query
        
    Returns:
        Combined and ranked results
    """
    # Collect all results
    all_results = []
    
    # Add Vector Search results
    for result in results.get("vector_search", []):
        result["source"] = "vector_search"
        result["score"] = result.get("score", 0.5)
        all_results.append(result)
    
    # Add Knowledge Graph results
    for result in results.get("knowledge_graph", []):
        result["source"] = "knowledge_graph"
        result["score"] = 0.8  # Knowledge Graph results are typically high quality
        all_results.append(result)
    
    # Add Web Search results
    for result in results.get("web_search", []):
        result["source"] = "web_search"
        result["score"] = 0.7  # Web results are typically good but may be less relevant
        all_results.append(result)
    
    # Calculate relevance to query
    for result in all_results:
        relevance = calculate_relevance(result, query)
        result["relevance"] = relevance
        
        # Combine score and relevance
        result["final_score"] = result["score"] * relevance
    
    # Sort by final score
    ranked_results = sorted(all_results, key=lambda x: x.get("final_score", 0), reverse=True)
    
    # Ensure diversity
    diverse_results = ensure_diversity(ranked_results)
    
    return diverse_results
```

## Source Attribution

When using web search results, VANA provides proper attribution:

```python
def format_results(self, results):
    """
    Format search results for display
    
    Args:
        results: Search results
        
    Returns:
        Formatted results
    """
    formatted = []
    
    # Format combined results
    for result in results.get("combined", [])[:5]:
        source = result.get("source", "unknown")
        content = result.get("content", "")
        
        if source == "web_search":
            url = result.get("metadata", {}).get("url", "")
            title = result.get("metadata", {}).get("title", "")
            
            formatted.append(f"[{title}]({url})\n{content}\nSource: Web")
        
        elif source == "knowledge_graph":
            name = result.get("metadata", {}).get("name", "")
            entity_type = result.get("metadata", {}).get("type", "")
            
            formatted.append(f"**{name}** ({entity_type})\n{content}\nSource: Knowledge Graph")
        
        else:  # vector_search
            doc_id = result.get("metadata", {}).get("doc_id", "")
            
            formatted.append(f"{content}\nSource: Vector Search (Doc ID: {doc_id})")
    
    return "\n\n".join(formatted)
```

## Future Enhancements

Planned enhancements for web search integration:

1. **Advanced Query Understanding**: Better understanding of complex queries
2. **Multi-Source Integration**: Integrating multiple web search providers
3. **Content Extraction**: Extracting full content from web pages
4. **Domain-Specific Search**: Specialized search for specific domains
5. **Real-time Information**: Integration with news and real-time sources
