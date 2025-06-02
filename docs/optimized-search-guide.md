# Optimized Search and Troubleshooting Guide

This document provides information about the optimized search implementation and troubleshooting guide for VANA.

## Optimized Hybrid Search

The optimized hybrid search implementation enhances VANA's search capabilities with improved algorithms and performance.

### Key Improvements

1. **Query Classification**: Automatically classifies queries to determine optimal source weights
2. **Enhanced Relevance Calculation**: More sophisticated relevance scoring with proximity analysis
3. **Improved Result Diversity**: Better balancing of results from different sources
4. **Query Preprocessing**: Intelligent query preprocessing for better results
5. **Performance Optimization**: Reduced latency and improved efficiency

### Implementation

The optimized hybrid search is implemented in `tools/enhanced_hybrid_search_optimized.py` and provides the following enhancements:

#### Query Classification

```python
def classify_query(self, query: str) -> Dict[str, float]:
    """
    Classify query to determine optimal source weights

    Args:
        query: Search query

    Returns:
        Source weights for the query
    """
    # Keywords for categories
    category_keywords = {
        "general": ["what is", "overview", "introduction", "about", "describe"],
        "technology": ["technology", "algorithm", "implementation", "how does", "work"],
        "feature": ["feature", "capability", "function", "support", "handle"],
        # Additional categories...
    }

    # Normalize query
    normalized_query = query.lower()

    # Score each category
    category_scores = {}
    for category, keywords in category_keywords.items():
        score = sum(1 for keyword in keywords if keyword in normalized_query)
        category_scores[category] = score

    # Get the highest scoring category
    if category_scores:
        max_score = max(category_scores.values())
        if max_score > 0:
            best_categories = [c for c, s in category_scores.items() if s == max_score]
            best_category = best_categories[0]  # Take the first if multiple match
            return self.category_weights.get(best_category, self.default_category_weights)

    # Default weights if no category matches
    return self.default_category_weights
```

#### Enhanced Relevance Calculation

```python
def calculate_relevance_optimized(self, result: Dict[str, Any], query: str) -> float:
    """
    Calculate relevance score with optimized algorithm

    Args:
        result: Search result
        query: Search query

    Returns:
        Relevance score (0-1)
    """
    content = result.get("content", "").lower()
    query_terms = query.lower().split()

    # Calculate term frequency
    term_count = 0
    for term in query_terms:
        if term in content:
            term_count += 1

    # Calculate term frequency score
    if len(query_terms) > 0:
        term_frequency = term_count / len(query_terms)
    else:
        term_frequency = 0

    # Calculate exact phrase match
    exact_match = 1.0 if query.lower() in content else 0.0

    # Calculate proximity score
    proximity_score = self.calculate_proximity_score(content, query_terms)

    # Calculate metadata match
    metadata = result.get("metadata", {})
    metadata_match = 0.0

    if "title" in metadata and any(term in metadata["title"].lower() for term in query_terms):
        metadata_match += 0.3

    # Combine scores with weights
    relevance = (
        0.4 * term_frequency +
        0.3 * exact_match +
        0.2 * proximity_score +
        0.1 * metadata_match
    )

    return min(relevance, 1.0)  # Cap at 1.0
```

### Usage

To use the optimized hybrid search:

```python
from tools.enhanced_hybrid_search_optimized import EnhancedHybridSearchOptimized

# Initialize search
search = EnhancedHybridSearchOptimized()

# Perform search
results = search.search("What is VANA architecture?", top_k=5, include_web=True)

# Format results
formatted = search.format_results(results)
print(formatted)
```

### Running the Optimized Search

We've provided a script to run and compare the optimized search with the original implementations:

```bash
python scripts/run_optimized_search.py --query "What is VANA architecture?" --include-web
```

Options:
- `--query`: Search query (required)
- `--top-k`: Number of results to retrieve (default: 5)
- `--include-web`: Include web search results
- `--output`: Output file for results (JSON)

## Troubleshooting Guide

We've created a comprehensive troubleshooting guide to help resolve common issues with VANA. The guide covers:

1. **Vector Search Issues**:
   - Vector Search not available
   - Poor search results

2. **Knowledge Graph Issues**:
   - Knowledge Graph not available
   - Entity extraction problems

3. **Document Processing Issues**:
   - Document processing failures
   - Poor chunking quality

4. **Web Search Issues**:
   - Web search not available
   - Poor web search results

5. **Hybrid Search Issues**:
   - Unbalanced search results
   - Slow search performance

6. **Environment Setup Issues**:
   - Missing dependencies
   - Environment variable problems

7. **Evaluation Framework Issues**:
   - Evaluation failures

### Accessing the Troubleshooting Guide

The troubleshooting guide is available at `knowledge_docs/advanced/troubleshooting_guide.md`.

## Agent Architecture Documentation

We've also created comprehensive documentation on VANA's agent architecture, which covers:

1. **Core Architecture**:
   - Primary Agent
   - Knowledge Tools
   - Document Processing

2. **Agent Interaction Flow**:
   - Query Reception
   - Query Analysis
   - Tool Selection
   - Parallel Execution
   - Result Integration
   - Response Generation
   - Feedback Collection

3. **Implementation Details**:
   - Agent Definition
   - Tool Implementation
   - Query Routing

4. **Integration with External Services**:
   - Vertex AI
   - Model Context Protocol (MCP)
   - Google Custom Search

### Accessing the Agent Architecture Documentation

The agent architecture documentation is available at `knowledge_docs/advanced/agent_architecture.md`.

## Next Steps

1. **Test the Optimized Search**: Run the optimized search with various queries and compare results
2. **Review the Troubleshooting Guide**: Familiarize yourself with common issues and solutions
3. **Study the Agent Architecture**: Understand VANA's architecture for better development
4. **Contribute Improvements**: Enhance the optimized search with additional features
5. **Expand Documentation**: Add more detailed documentation on specific components
