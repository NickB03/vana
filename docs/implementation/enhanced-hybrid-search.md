# Enhanced Hybrid Search Implementation

[Home](../../index.md) > [Implementation](../index.md) > Enhanced Hybrid Search

This document details the implementation of the `EnhancedHybridSearch` tool (`tools/enhanced_hybrid_search.py`). This tool is responsible for orchestrating searches across multiple underlying data sources (Vector Search, Knowledge Graph, Web Search) and combining their results into a unified, ranked list.

## 1. Overview

The `EnhancedHybridSearch` tool aims to provide more comprehensive and relevant search results than any single search method alone. It achieves this by leveraging the distinct strengths of semantic search (Vector Search), structured data retrieval (Knowledge Graph), and real-time information access (Web Search).

**Core Responsibilities:**
*   Initializing and managing clients for each underlying search source.
*   Receiving a user query.
*   Dispatching queries to relevant sources.
*   Aggregating and normalizing results.
*   Ranking and re-ranking the combined results.
*   Returning a unified list of search results.

## 2. Class Structure (`EnhancedHybridSearch`)

```python
# tools/enhanced_hybrid_search.py (Conceptual Structure)
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.web_search_client import WebSearchClient
from config import environment
# Potentially, a module for ranking strategies
# from .ranking_strategies import ReRanker, SourceWeighter

class EnhancedHybridSearch:
    def __init__(self, config_options=None):
        """
        Initializes the EnhancedHybridSearch engine and its underlying clients.
        Configuration for clients is typically loaded from environment variables.

        Args:
            config_options (dict, optional): Additional configuration for hybrid search behavior
                                             (e.g., source weights, ranking strategy).
        """
        self.vs_client = VectorSearchClient()
        self.kg_manager = KnowledgeGraphManager()
        self.web_search_client = WebSearchClient()

        self.config = self._load_hybrid_search_config(config_options)
        # self.reranker = ReRanker(strategy=self.config.get('ranking_strategy'))

        # Logger setup
        # self.logger = get_logger(__name__)

    def _load_hybrid_search_config(self, options):
        """Loads hybrid search specific configurations."""
        # Defaults can be defined here and overridden by options or environment variables
        config = {
            "max_results_per_source": environment.HYBRID_SEARCH_MAX_PER_SOURCE or 5,
            "ranking_strategy": environment.HYBRID_SEARCH_RANKING_STRATEGY or "default_rrf",
            "source_weights": {
                "vector_search": float(environment.HYBRID_WEIGHT_VS or 0.5),
                "knowledge_graph": float(environment.HYBRID_WEIGHT_KG or 0.3),
                "web_search": float(environment.HYBRID_WEIGHT_WEB or 0.2),
            }
        }
        if options:
            config.update(options)
        return config

    def search(self, query_text: str, num_results: int = 10, **kwargs):
        """
        Performs a hybrid search across all configured sources.

        Args:
            query_text (str): The user's search query.
            num_results (int): The total number of desired results.
            **kwargs: Additional parameters to pass to underlying search clients
                      or to control ranking.

        Returns:
            list: A ranked list of unified search result objects.
        """
        # self.logger.info(f"Performing hybrid search for: '{query_text}'")

        # 1. Query Preprocessing (Optional)
        # query_variants = self._preprocess_query(query_text, **kwargs)

        # 2. Parallel Querying (Conceptual - actual implementation might use asyncio or threading)
        vs_results = self._search_vector_store(query_text, **kwargs)
        kg_results = self._search_knowledge_graph(query_text, **kwargs)
        web_results = self._search_web(query_text, **kwargs)

        # self.logger.debug(f"VS results: {len(vs_results)}, KG results: {len(kg_results)}, Web results: {len(web_results)}")

        # 3. Result Aggregation and Normalization
        all_raw_results = {
            "vector_search": vs_results,
            "knowledge_graph": kg_results,
            "web_search": web_results
        }
        normalized_results = self._normalize_results(all_raw_results)

        # 4. Deduplication (Optional)
        # unique_results = self._deduplicate_results(normalized_results)

        # 5. Ranking and Re-ranking
        # ranked_results = self.reranker.rank(unique_results or normalized_results,
        #                                     query_text=query_text,
        #                                     weights=self.config['source_weights'])
        ranked_results = self._simple_rank_and_merge(normalized_results, query_text) # Placeholder for actual ranking

        # 6. Format final output and limit to num_results
        final_results = self._format_output(ranked_results[:num_results])

        # self.logger.info(f"Returning {len(final_results)} hybrid search results.")
        return final_results

    def _search_vector_store(self, query_text: str, **kwargs):
        try:
            query_embedding = self.vs_client.generate_embeddings(texts=[query_text]).predictions[0].get('embedding', [])
            if not query_embedding:
                # self.logger.warning("Could not generate query embedding for Vector Search.")
                return []

            results = self.vs_client.find_neighbors(
                query_embedding=query_embedding,
                num_neighbors=kwargs.get("vs_num_neighbors", self.config['max_results_per_source']),
                # Pass other relevant kwargs like filters
            )
            # Process results into a standard format
            return self._format_vs_results(results)
        except Exception as e:
            # self.logger.error(f"Error in Vector Search: {e}", exc_info=True)
            return []

    def _search_knowledge_graph(self, query_text: str, **kwargs):
        try:
            # KG query might be direct text or structured based on query_text analysis
            results = self.kg_manager.search_nodes(query=query_text) # Example method
            # Process results
            return self._format_kg_results(results)
        except Exception as e:
            # self.logger.error(f"Error in Knowledge Graph Search: {e}", exc_info=True)
            return []

    def _search_web(self, query_text: str, **kwargs):
        try:
            results = self.web_search_client.search(
                query_text=query_text,
                num_results=kwargs.get("web_num_results", self.config['max_results_per_source'])
            )
            # Process results
            return self._format_web_results(results)
        except Exception as e:
            # self.logger.error(f"Error in Web Search: {e}", exc_info=True)
            return []

    def _normalize_results(self, all_raw_results: dict):
        """Converts results from different sources into a common format."""
        normalized = []
        for source, results in all_raw_results.items():
            for res in results:
                # 'res' is already assumed to be in a somewhat standard format by _format_xx_results
                # This step ensures a common top-level structure if needed, e.g., adding source explicitly
                if isinstance(res, dict): # Ensure it's a dict
                    res['source'] = source
                    normalized.append(res)
        return normalized

    def _format_vs_results(self, vs_api_response):
        """Formats raw Vector Search API response into a standard result item list."""
        items = []
        if vs_api_response and vs_api_response.get('nearestNeighbors'):
            for neighbor_list in vs_api_response['nearestNeighbors']:
                for neighbor in neighbor_list.get('neighbors', []):
                    items.append({
                        "id": neighbor.get('datapoint', {}).get('datapointId'),
                        "content": neighbor.get('datapoint', {}).get('text_content_or_metadata', 'N/A'), # Assuming text is stored
                        "score": 1.0 - neighbor.get('distance', 1.0), # Convert distance to similarity
                        "source": "vector_search",
                        "metadata": {"distance": neighbor.get('distance')}
                    })
        return items

    def _format_kg_results(self, kg_api_response):
        """Formats raw Knowledge Graph API response into a standard result item list."""
        items = []
        # This depends heavily on the KG query and MCP server response structure
        # Example: if kg_api_response is a list of entity dicts
        if isinstance(kg_api_response, list):
            for entity in kg_api_response:
                items.append({
                    "id": entity.get('name'),
                    "title": entity.get('name'),
                    "content": ", ".join(entity.get('observations', [])),
                    "source": "knowledge_graph",
                    "metadata": {"entity_type": entity.get('entity_type')}
                })
        return items

    def _format_web_results(self, web_api_response):
        """Formats raw Web Search API response (Google CSE) into a standard result item list."""
        items = []
        if web_api_response and web_api_response.get('items'):
            for item in web_api_response['items']:
                items.append({
                    "id": item.get('link'), # Use link as ID
                    "title": item.get('title'),
                    "snippet": item.get('snippet'),
                    "url": item.get('link'),
                    "source": "web_search",
                    "score": item.get('relevance_score_if_any', 0.5) # Google CSE doesn't provide a direct score
                })
        return items

    def _simple_rank_and_merge(self, normalized_results: list, query_text: str):
        """A placeholder for a more sophisticated ranking and merging strategy."""
        # Example: Sort by a 'score' field if present, or use a default order.
        # This needs to be much more intelligent, e.g., using RRF, source weights.
        # For now, just interleave or sort by a generic score if available.
        # self.logger.debug(f"Ranking {len(normalized_results)} normalized results.")

        # Apply source weights to scores if scores exist and are comparable
        for res in normalized_results:
            if 'score' in res and res['source'] in self.config['source_weights']:
                res['score'] *= self.config['source_weights'][res['source']]
            elif 'score' not in res: # Assign a default score if missing, weighted by source
                 res['score'] = 0.1 * self.config['source_weights'].get(res['source'], 0.1)


        return sorted(normalized_results, key=lambda x: x.get('score', 0.0), reverse=True)

    def _format_output(self, ranked_results: list):
        """Final formatting of results before returning."""
        # Could involve ensuring all results have consistent fields, etc.
        return ranked_results

# Example Usage (conceptual, typically called from an agent or test script)
# if __name__ == "__main__":
#     hybrid_search = EnhancedHybridSearch()
#     results = hybrid_search.search("Tell me about VANA's architecture.")
#     for result in results:
#         print(f"Title: {result.get('title', result.get('id'))}\nSource: {result.get('source')}\nSnippet: {str(result.get('snippet', result.get('content', '')) )[:150]}...\nURL: {result.get('url', 'N/A')}\nScore: {result.get('score')}\n---")

```

## 3. Initialization (`__init__`)

*   Instantiates clients for `VectorSearchClient`, `KnowledgeGraphManager`, and `WebSearchClient`. These clients are configured via environment variables loaded by `config.environment`.
*   Loads hybrid search specific configurations (e.g., `_load_hybrid_search_config`). This might include:
    *   Default number of results to fetch per source.
    *   Default ranking strategy (e.g., "default_rrf", "weighted_sum").
    *   Default weights for each source.
    These can be hardcoded defaults, overridden by environment variables (e.g., `HYBRID_SEARCH_MAX_PER_SOURCE`), or by options passed to the constructor.
*   Initializes a logger.

## 4. Search Orchestration (`search` method)

1.  **Query Preprocessing (Optional):**
    *   The input `query_text` might be analyzed or transformed. For example, identifying keywords for KG search, or generating different phrasings for web search. This step is conceptual and depends on the desired sophistication.
2.  **Parallel Querying:**
    *   Calls the respective search methods of `vs_client`, `kg_manager`, and `web_search_client`.
    *   Ideally, these calls should be made concurrently (e.g., using `asyncio` or `threading`) to reduce overall latency. The provided conceptual code runs them sequentially for simplicity.
    *   Each underlying search method (`_search_vector_store`, `_search_knowledge_graph`, `_search_web`) handles:
        *   Calling its specific client.
        *   Error handling for that source (returning an empty list on failure).
        *   Formatting the raw API response from that source into a standardized internal list of result dictionaries (e.g., via `_format_vs_results`). Each formatted result should at least contain `id`, `content`/`snippet`, `source`, and an optional `score`.
3.  **Result Aggregation and Normalization (`_normalize_results`):**
    *   Collects all formatted results from the different sources.
    *   Ensures all result items have a consistent basic structure, explicitly adding the `source` field to each.
4.  **Deduplication (Optional):**
    *   A step to identify and remove or merge duplicate results that might come from different sources (e.g., the same webpage found via Vector Search and Web Search). This can be complex, involving URL normalization, content similarity checks, etc.
5.  **Ranking and Re-ranking (e.g., `_simple_rank_and_merge` or a more advanced `reranker.rank`):**
    *   This is the core of the hybrid logic. It takes the list of normalized (and possibly deduplicated) results and orders them.
    *   Strategies can range from simple (e.g., interleaving, sorting by a normalized score) to complex (e.g., Reciprocal Rank Fusion (RRF), weighted scoring based on source and query type, machine-learned ranking models).
    *   The conceptual `_simple_rank_and_merge` applies source weights to existing scores or assigns a default weighted score if none exists, then sorts.
6.  **Output Formatting and Limiting (`_format_output`):**
    *   Takes the globally ranked list and truncates it to the requested `num_results`.
    *   May perform any final formatting before returning.

## 5. Result Formatting Helper Methods

*   `_format_vs_results`, `_format_kg_results`, `_format_web_results`: These private methods are responsible for translating the raw API responses from each specific search client into a common, standardized list of dictionaries. This makes aggregation and ranking easier. Each dictionary should represent one search hit and contain common fields like `id`, `title`, `content` or `snippet`, `url` (if applicable), `source` (hardcoded by the formatter), and an initial `score` from that source if available.

## 6. Configuration

*   Relies on `config.environment` for client configurations.
*   Hybrid search specific parameters (weights, strategies) can also be loaded from `config.environment` or passed during initialization.

## 7. Error Handling

*   Each underlying search call (`_search_vector_store`, etc.) is wrapped in a `try...except` block to ensure that failure in one source doesn't stop the entire hybrid search.
*   The main `search` method should also have error handling.
*   Logging is crucial for diagnosing issues within the hybrid search process.

## 8. Future Enhancements

*   **Asynchronous Querying:** Implement true parallel querying of sources using `asyncio` or `threading` to improve latency.
*   **Advanced Query Analysis:** Use NLP to understand query intent and dynamically adjust source querying strategies or weights.
*   **Sophisticated Re-ranking:** Implement more advanced re-ranking algorithms (e.g., learning-to-rank models, RRF, Borda Count).
*   **Feedback Loop:** Incorporate user feedback on search results to fine-tune ranking.
*   **Contextualization:** Pass user context or conversation history to tailor searches.
*   **More Granular Deduplication:** Improve detection and merging of similar results.

This implementation provides a flexible framework for hybrid search, combining the strengths of VANA's diverse information retrieval tools.
