# Enhanced Hybrid Search in VANA

## Overview

VANA's Enhanced Hybrid Search combines multiple search methods to provide comprehensive and relevant results. It integrates Vector Search, Knowledge Graph, and Web Search to deliver the most accurate and up-to-date information.

## Components

The Enhanced Hybrid Search consists of the following components:

1. **Vector Search**: Semantic search using embeddings
2. **Knowledge Graph**: Structured knowledge with entities and relationships
3. **Web Search**: Real-time information from the web
4. **Result Merger**: Combines and ranks results from multiple sources
5. **Feedback System**: Collects and analyzes user feedback to improve search quality

## Architecture

```
User Query → Query Analysis → Parallel Search Execution → Result Merging → Ranking → Response Generation
```

### Query Analysis

Before executing the search, VANA analyzes the query to determine:

- Query intent (informational, navigational, transactional)
- Query domain (technical, general, domain-specific)
- Query complexity (simple, complex, multi-part)
- Required knowledge sources (Vector Search, Knowledge Graph, Web)

### Parallel Search Execution

VANA executes searches in parallel to minimize latency:

```python
async def execute_parallel_search(query, top_k=5):
    """
    Execute searches in parallel
    
    Args:
        query: Search query
        top_k: Number of results to retrieve
        
    Returns:
        Combined search results
    """
    # Create tasks for parallel execution
    vector_search_task = asyncio.create_task(
        vector_search_client.search_async(query, top_k=top_k)
    )
    
    knowledge_graph_task = asyncio.create_task(
        knowledge_graph_manager.query_async("*", query)
    )
    
    web_search_task = asyncio.create_task(
        web_search_client.search_async(query, num_results=top_k)
    )
    
    # Wait for all tasks to complete
    vector_results = await vector_search_task
    knowledge_graph_results = await knowledge_graph_task
    web_results = await web_search_task
    
    return {
        "vector_search": vector_results,
        "knowledge_graph": knowledge_graph_results,
        "web_search": web_results
    }
```

## Result Merging and Ranking

VANA uses sophisticated algorithms to merge and rank results from different sources:

### Merging Strategies

1. **Source-Based Merging**: Combines results based on source reliability
2. **Relevance-Based Merging**: Combines results based on relevance scores
3. **Diversity-Based Merging**: Ensures diversity in the combined results
4. **Freshness-Based Merging**: Prioritizes recent information

### Ranking Algorithms

1. **Relevance Scoring**: Ranks results based on relevance to the query
2. **Source Weighting**: Assigns weights to different sources
3. **Diversity Promotion**: Ensures diverse results
4. **Freshness Boost**: Boosts recent information
5. **Feedback Integration**: Incorporates user feedback

```python
def rank_results(combined_results, query):
    """
    Rank combined results
    
    Args:
        combined_results: Combined results from multiple sources
        query: Original search query
        
    Returns:
        Ranked results
    """
    # Calculate relevance scores
    for result in combined_results:
        result["relevance_score"] = calculate_relevance(result, query)
        
        # Apply source weighting
        result["weighted_score"] = result["relevance_score"] * source_weights[result["source"]]
        
        # Apply freshness boost
        if "timestamp" in result:
            result["freshness_boost"] = calculate_freshness_boost(result["timestamp"])
            result["final_score"] = result["weighted_score"] * result["freshness_boost"]
        else:
            result["final_score"] = result["weighted_score"]
    
    # Sort by final score
    ranked_results = sorted(combined_results, key=lambda x: x["final_score"], reverse=True)
    
    # Apply diversity promotion
    diverse_results = promote_diversity(ranked_results)
    
    return diverse_results
```

## Web Search Integration

VANA integrates with Google Custom Search API to provide up-to-date information from the web:

### Web Search Client

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

## Feedback System

VANA includes a feedback system to continuously improve search quality:

### Feedback Collection

```python
def store_search_feedback(query, results, feedback, user_id="anonymous"):
    """
    Store feedback for search results
    
    Args:
        query: Search query
        results: Search results
        feedback: User feedback (helpful, not helpful, etc.)
        user_id: User identifier
        
    Returns:
        Feedback storage result
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    feedback_id = f"search_{timestamp}_{user_id}"
    
    feedback_data = {
        "id": feedback_id,
        "timestamp": timestamp,
        "user_id": user_id,
        "query": query,
        "results": results,
        "feedback": feedback
    }
    
    # Store feedback
    feedback_path = os.path.join(
        "feedback", "search", f"{feedback_id}.json"
    )
    
    os.makedirs(os.path.dirname(feedback_path), exist_ok=True)
    
    with open(feedback_path, "w") as f:
        json.dump(feedback_data, f, indent=2)
    
    return {"success": True, "feedback_id": feedback_id}
```

### Feedback Analysis

```python
def analyze_feedback(feedback_type="search", days=30):
    """
    Analyze feedback
    
    Args:
        feedback_type: Type of feedback to analyze
        days: Number of days to include in analysis
        
    Returns:
        Feedback analysis
    """
    feedback_dir = os.path.join("feedback", feedback_type)
    
    if not os.path.exists(feedback_dir):
        return {"error": f"Feedback directory not found: {feedback_dir}"}
    
    # Get feedback files
    feedback_files = glob.glob(os.path.join(feedback_dir, "*.json"))
    
    # Filter by date
    cutoff_date = datetime.now() - timedelta(days=days)
    
    feedback_data = []
    for file_path in feedback_files:
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
            
            # Parse timestamp
            timestamp = datetime.strptime(data["timestamp"], "%Y%m%d_%H%M%S")
            
            if timestamp >= cutoff_date:
                feedback_data.append(data)
        
        except Exception as e:
            logger.error(f"Error loading feedback file {file_path}: {str(e)}")
    
    # Analyze feedback
    total = len(feedback_data)
    positive = sum(1 for data in feedback_data if data["feedback"] == "helpful")
    negative = sum(1 for data in feedback_data if data["feedback"] == "not_helpful")
    
    # Calculate metrics
    if total > 0:
        positive_rate = positive / total
        negative_rate = negative / total
    else:
        positive_rate = 0
        negative_rate = 0
    
    return {
        "total_feedback": total,
        "positive_feedback": positive,
        "negative_feedback": negative,
        "positive_rate": positive_rate,
        "negative_rate": negative_rate,
        "feedback_data": feedback_data
    }
```

## Performance Metrics

VANA tracks various performance metrics for Enhanced Hybrid Search:

1. **Precision**: Fraction of retrieved information that is relevant
2. **Recall**: Fraction of relevant information that is retrieved
3. **F1 Score**: Harmonic mean of precision and recall
4. **NDCG**: Normalized Discounted Cumulative Gain for ranking quality
5. **Latency**: Time to retrieve and rank results
6. **User Satisfaction**: Based on user feedback

## Use Cases

Enhanced Hybrid Search is particularly useful for:

1. **Complex Queries**: Queries that require information from multiple sources
2. **Time-Sensitive Queries**: Queries that require up-to-date information
3. **Exploratory Queries**: Queries where the user is exploring a topic
4. **Multi-faceted Queries**: Queries with multiple aspects or dimensions

## Future Enhancements

Planned enhancements for Enhanced Hybrid Search:

1. **Personalization**: Tailoring results to user preferences and history
2. **Context-Awareness**: Considering conversation context in search
3. **Multi-Modal Search**: Searching across text, images, and other modalities
4. **Advanced NLP**: More sophisticated query understanding
5. **Federated Search**: Integrating additional search sources
