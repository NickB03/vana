# EnhancedHybridSearch Usage Guide

[Home](../../index.md) > [Guides](../index.md) > EnhancedHybridSearch Usage

This guide explains how to use the `EnhancedHybridSearch` tool (`tools/enhanced_hybrid_search.py`) in VANA. This tool provides a unified search interface that combines results from multiple underlying sources: Vector Search, Knowledge Graph, and Web Search.

## 1. Prerequisites

*   **VANA Installation:** Complete VANA project setup as per the [Installation Guide](installation-guide.md).
*   **Configuration:** Ensure your `.env` file is correctly configured for all underlying search clients:
    *   `VectorSearchClient` settings (GCP, Vertex AI endpoint/index).
    *   `KnowledgeGraphManager` settings (MCP endpoint, namespace, API key).
    *   `WebSearchClient` settings (Google Custom Search API key and engine ID).
*   **Active Services:** The respective backend services (Vertex AI, MCP Server, Google Custom Search API) must be accessible.
*   **Virtual Environment:** Activate your Python virtual environment.

## 2. Importing and Initializing EnhancedHybridSearch

The `EnhancedHybridSearch` tool typically initializes its underlying clients (`VectorSearchClient`, `KnowledgeGraphManager`, `WebSearchClient`) internally.

```python
from tools.enhanced_hybrid_search import EnhancedHybridSearch
from config import environment  # To ensure .env is loaded

# Initialize the EnhancedHybridSearch
# It will internally initialize its constituent search clients.
try:
    hybrid_search_engine = EnhancedHybridSearch()
    print("EnhancedHybridSearch initialized successfully.")
except Exception as e:
    print(f"Error initializing EnhancedHybridSearch: {e}")
    hybrid_search_engine = None
```

## 3. Performing a Hybrid Search

The primary method is usually `search` or `perform_search`.

```python
if hybrid_search_engine:
    query = "What are the key architectural patterns in Project VANA?"

    try:
        # The search method might take parameters to control aspects like:
        # - Number of results from each source
        # - Weights for different sources in ranking
        # - Timeout settings

        # Example: A simple search call
        # results = hybrid_search_engine.search(query_text=query, num_results=10)

        # For this conceptual example, let's assume a basic search method:
        results = hybrid_search_engine.search(query) # Or query_text=query

        print(f"\nHybrid Search Results for: '{query}':")
        if results:
            for i, result in enumerate(results):
                print(f"\n  Result {i+1}:")
                print(f"    Title/ID: {result.get('id') or result.get('title', 'N/A')}")
                print(f"    Snippet/Content: {str(result.get('snippet') or result.get('content', 'N/A'))[:200]}...")
                print(f"    Source: {result.get('source', 'N/A')}") # e.g., 'vector_search', 'knowledge_graph', 'web_search'
                print(f"    Score: {result.get('score', 'N/A')}") # Combined relevance score
                # Other fields like URL, metadata might be present
                if result.get('url'):
                    print(f"    URL: {result.get('url')}")
        else:
            print("  No results found or an error occurred.")

    except Exception as e:
        print(f"Error during hybrid search for '{query}': {e}")
```

**Expected Output Structure (`results`):**
The `search` method should return a list of result objects/dictionaries. Each result should ideally have a common structure, including:
*   `id` or `title`: A unique identifier or title for the result.
*   `snippet` or `content`: A text snippet or summary of the result.
*   `source`: Indicates which underlying search system provided this result (e.g., "vector_search", "knowledge_graph", "web_search"). This is important for understanding the origin.
*   `score`: The relevance score assigned by the hybrid search mechanism.
*   `url` (if applicable): A URL to the source document or web page.
*   `metadata` (optional): Additional metadata from the source.

## 4. Understanding the Hybrid Search Process

When `search()` is called:
1.  **Query Dispatch:** `EnhancedHybridSearch` sends the query (possibly adapted) to `VectorSearchClient`, `KnowledgeGraphManager`, and `WebSearchClient`.
2.  **Parallel Execution:** These clients query their respective backends.
3.  **Result Aggregation:** `EnhancedHybridSearch` collects all results.
4.  **Normalization & Deduplication:** Results are transformed into a common format. Duplicates might be identified and merged or removed.
5.  **Ranking/Re-ranking:** A crucial step where results from different sources are scored and ranked cohesively. This might involve:
    *   Weighting scores from different sources.
    *   Using algorithms like Reciprocal Rank Fusion (RRF).
    *   Considering query type or intent.
6.  **Final Output:** A single, ranked list of the most relevant results is returned.

## 5. Configuration Options (Conceptual)

The behavior of `EnhancedHybridSearch` might be configurable via `config/environment.py` or parameters to its `__init__` or `search` methods. Potential configurations:

*   **Source Weights:** Assigning different importance levels to results from Vector Search vs. KG vs. Web Search.
*   **Number of Results per Source:** How many top results to fetch from each underlying client.
*   **Ranking Strategy:** Selecting or parameterizing the re-ranking algorithm.
*   **Timeouts:** Setting timeouts for queries to individual sources to prevent the hybrid search from hanging.
*   **Feature Flags:** Enabling/disabling specific sources (e.g., temporarily disable web search).

Example (conceptual configuration during initialization):
```python
# config_options = {
#     "weights": {"vector_search": 0.5, "knowledge_graph": 0.3, "web_search": 0.2},
#     "max_results_per_source": 5
# }
# hybrid_search_engine_configured = EnhancedHybridSearch(options=config_options)
```
Refer to the `EnhancedHybridSearch` source code for actual configuration mechanisms.

## 6. Error Handling

*   `EnhancedHybridSearch` should gracefully handle failures from one or more underlying clients (e.g., if the Web Search API is temporarily down, it should still return results from Vector Search and KG).
*   Errors during initialization (e.g., if a client fails to initialize due to bad configuration) should be caught.
*   Wrap calls to `hybrid_search_engine.search()` in `try...except` blocks.

## 7. Use Cases

*   **Primary Search Interface for VANA Agent:** The VANA agent will use `EnhancedHybridSearch` to answer user queries or find information needed for tasks.
*   **Comprehensive Information Retrieval:** When a query might benefit from both semantic matching (Vector Search), factual data (KG), and up-to-date information (Web Search).

## 8. Best Practices

*   **Query Formulation:** Clear, specific queries generally yield better results.
*   **Understanding Sources:** Be aware of what kind of information each underlying source excels at to better interpret the hybrid results.
*   **Iterative Improvement:** The ranking and result-blending strategy is key. This part of `EnhancedHybridSearch` may require ongoing tuning and experimentation for optimal performance based on VANA's specific domain and use cases.
*   **Logging:** Check logs from `EnhancedHybridSearch` and its underlying clients for detailed information about the search process, individual source queries, and any errors.

The `EnhancedHybridSearch` tool is a powerful component that significantly boosts VANA's information retrieval capabilities. For precise details on its configuration, search parameters, and result structure, always consult the source code at `tools/enhanced_hybrid_search.py`.
