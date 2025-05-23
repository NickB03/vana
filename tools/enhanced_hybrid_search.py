"""
Enhanced Hybrid Search for VANA Memory System

This module provides an enhanced hybrid search approach that combines Vector Search,
Knowledge Graph, and Web Search. It provides a comprehensive knowledge retrieval system
with semantic search, structured knowledge, and up-to-date web information.

The enhanced hybrid search approach offers several advantages:
1. Semantic search through Vector Search for finding similar content
2. Structured knowledge through Knowledge Graph for entities and relationships
3. Up-to-date information through Web Search
4. Combined results for more comprehensive answers
5. Graceful degradation when one system is unavailable

Usage:
    ```python
    from tools.enhanced_hybrid_search import EnhancedHybridSearch

    # Initialize enhanced hybrid search
    hybrid_search = EnhancedHybridSearch()

    # Perform search
    results = hybrid_search.search("What is VANA?")

    # Format results
    formatted = hybrid_search.format_results(results)
    print(formatted)

    # Or search and format in one step
    result_text = hybrid_search.search_and_format("What is VANA?")
    print(result_text)
    ```
"""

import logging
from typing import List, Dict, Any
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.web_search import WebSearchClient
from tools.hybrid_search import HybridSearch

# Configure logging
logger = logging.getLogger(__name__)

class EnhancedHybridSearch(HybridSearch):
    """Enhanced hybrid search combining Vector Search, Knowledge Graph, and Web Search"""

    def __init__(self, vector_search_client=None, kg_manager=None, web_search_client=None):
        """Initialize the enhanced hybrid search

        Args:
            vector_search_client: Optional VectorSearchClient instance
            kg_manager: Optional KnowledgeGraphManager instance
            web_search_client: Optional WebSearchClient instance
        """
        super().__init__(vector_search_client, kg_manager)
        self.web_search_client = web_search_client or WebSearchClient()

        # Log initialization status
        vs_available = self.vector_search_client.is_available()
        kg_available = self.kg_manager.is_available()
        web_available = self.web_search_client.is_available()
        logger.info(f"EnhancedHybridSearch initialized - Vector Search available: {vs_available}, "
                   f"Knowledge Graph available: {kg_available}, Web Search available: {web_available}")

    def search(self, query: str, top_k: int = 5, include_web: bool = True) -> Dict[str, Any]:
        """Search for relevant information using Vector Search, Knowledge Graph, and Web Search

        Args:
            query: The search query
            top_k: Maximum number of results to return
            include_web: Whether to include web search results

        Returns:
            Dictionary containing vector_search results, knowledge_graph results,
            web_search results, combined results, and any error messages
        """
        results = {
            "vector_search": [],
            "knowledge_graph": [],
            "web_search": [],
            "combined": [],
            "error": None
        }

        if not query or not query.strip():
            results["error"] = "Empty query provided"
            logger.warning("Empty query provided to enhanced hybrid search")
            return results

        logger.info(f"Performing enhanced hybrid search for query: {query}")

        # Track service availability
        vs_available = False
        kg_available = False
        web_available = False

        try:
            # Try Vector Search first - will use mock if real one is not available
            try:
                # Always call search - it will use mock if real one is not available
                vector_results = self.vector_search_client.search(query, top_k=top_k)
                if vector_results:
                    vs_available = True
                    results["vector_search"] = vector_results
                    logger.info(f"Vector Search returned {len(vector_results)} results")
                else:
                    logger.warning("Vector Search returned no results")
            except Exception as vs_error:
                logger.error(f"Error in Vector Search: {str(vs_error)}")

            # Try Knowledge Graph
            try:
                if self.kg_manager.is_available():
                    kg_available = True
                    kg_results = self.kg_manager.query("*", query)
                    results["knowledge_graph"] = kg_results.get("entities", [])
                    logger.info(f"Knowledge Graph returned {len(results['knowledge_graph'])} results")
                else:
                    logger.warning("Knowledge Graph is not available")
            except Exception as kg_error:
                logger.error(f"Error in Knowledge Graph: {str(kg_error)}")

            # Try Web Search if requested
            if include_web:
                try:
                    if self.web_search_client.is_available():
                        web_available = True
                        web_results = self.web_search_client.search(query, num_results=top_k)
                        results["web_search"] = web_results
                        logger.info(f"Web Search returned {len(web_results)} results")
                    else:
                        logger.warning("Web Search is not available")
                except Exception as web_error:
                    logger.error(f"Error in Web Search: {str(web_error)}")

            # Check if we have any results
            if (len(results["vector_search"]) == 0 and
                len(results["knowledge_graph"]) == 0 and
                len(results["web_search"]) == 0):
                logger.info("No results found in any search service")

            # Combine results
            results["combined"] = self._combine_results(
                results["vector_search"],
                results["knowledge_graph"],
                results["web_search"],
                top_k=top_k
            )

            logger.info(f"Combined {len(results['combined'])} results from all sources")
            return results
        except Exception as e:
            error_msg = f"Error in enhanced hybrid search: {str(e)}"
            results["error"] = error_msg
            logger.error(error_msg)
            return results

    def _combine_results(self, vector_results: List[Dict[str, Any]],
                        kg_results: List[Dict[str, Any]],
                        web_results: List[Dict[str, Any]],
                        top_k: int = 5) -> List[Dict[str, Any]]:
        """Combine and rank results from Vector Search, Knowledge Graph, and Web Search

        Args:
            vector_results: Results from Vector Search
            kg_results: Results from Knowledge Graph
            web_results: Results from Web Search
            top_k: Maximum number of results to return

        Returns:
            Combined and ranked list of results
        """
        combined = []

        # Add Vector Search results
        for result in vector_results:
            combined.append({
                "content": result.get("content", ""),
                "score": result.get("score", 0),
                "source": "vector_search",
                "metadata": result.get("metadata", {})
            })

        # Add Knowledge Graph results with dynamic scoring
        for result in kg_results:
            # Extract observation and entity information
            observation = result.get("observation", "")
            entity_name = result.get("name", "")
            entity_type = result.get("type", "")

            # Calculate score based on content length and entity type
            # This is a simple heuristic that can be improved
            base_score = 0.5  # Default score for Knowledge Graph results

            # Adjust score based on content length (longer content might be more informative)
            length_factor = min(len(observation) / 500, 1.0) * 0.2

            # Adjust score based on entity type (can prioritize certain types)
            type_factor = 0.1 if entity_type in ["project", "technology", "concept"] else 0

            # Calculate final score
            final_score = base_score + length_factor + type_factor

            combined.append({
                "content": observation,
                "score": final_score,
                "source": "knowledge_graph",
                "metadata": {
                    "name": entity_name,
                    "type": entity_type
                }
            })

        # Add Web Search results with dynamic scoring
        for result in web_results:
            # Extract information
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            url = result.get("url", "")
            source = result.get("source", "")
            date = result.get("date", "")

            # Combine title and snippet for content
            content = f"{title}\n{snippet}\nSource: {source}"
            if date:
                content += f" ({date[:10]})"
            content += f"\n{url}"

            # Calculate score based on position and date
            # Web results are typically fresher but less specific to the system
            base_score = 0.4  # Default score for Web Search results

            # Adjust score based on date (newer content might be more relevant)
            date_factor = 0.1 if date else 0

            # Calculate final score
            final_score = base_score + date_factor

            combined.append({
                "content": content,
                "score": final_score,
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

    def format_results(self, results: Dict[str, Any]) -> str:
        """Format search results for display

        Args:
            results: Results from search method

        Returns:
            Formatted string with search results
        """
        if results.get("error"):
            return f"Error searching: {results['error']}"

        combined = results.get("combined", [])

        if not combined:
            return "No relevant information found."

        formatted = "Relevant information:\n\n"

        for i, result in enumerate(combined, 1):
            content = result.get("content", "")
            score = result.get("score", 0)
            source = result.get("source", "")
            metadata = result.get("metadata", {})

            # Format based on source
            if source == "vector_search":
                source_info = metadata.get("source", "Unknown source")
                formatted += f"{i}. [VECTOR SEARCH] (Score: {score:.2f})\n"
                formatted += f"Source: {source_info}\n"
                formatted += f"{content}\n\n"
            elif source == "knowledge_graph":
                entity_name = metadata.get("name", "Unknown entity")
                entity_type = metadata.get("type", "Unknown type")
                formatted += f"{i}. [KNOWLEDGE GRAPH] (Score: {score:.2f})\n"
                formatted += f"Entity: {entity_name} (Type: {entity_type})\n"
                formatted += f"{content}\n\n"
            elif source == "web_search":
                title = metadata.get("title", "Unknown title")
                url = metadata.get("url", "")
                source_info = metadata.get("source", "Unknown source")
                date = metadata.get("date", "")

                formatted += f"{i}. [WEB SEARCH] (Score: {score:.2f})\n"
                formatted += f"{content}\n\n"
            else:
                formatted += f"{i}. [{source.upper()}] (Score: {score:.2f})\n{content}\n\n"

        return formatted

    def web_search(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Perform Web Search only

        Args:
            query: The search query
            num_results: Maximum number of results to return

        Returns:
            Dictionary containing web_search results and any error messages
        """
        logger.info(f"Performing web_search for query: {query}")
        results = {
            "web_search": [],
            "error": None
        }

        try:
            if self.web_search_client.is_available():
                results["web_search"] = self.web_search_client.search(query, num_results=num_results)
                logger.info(f"Web Search returned {len(results['web_search'])} results")
            else:
                results["error"] = "Web Search is not available"
                logger.warning("Web Search is not available")
        except Exception as e:
            error_msg = f"Error in Web Search: {str(e)}"
            results["error"] = error_msg
            logger.error(error_msg)

        return results

# Module-level functions for easier use
def search_and_format(query: str, top_k: int = 5, include_web: bool = True) -> str:
    """Search and format results in one step

    Args:
        query: The search query
        top_k: Maximum number of results to return
        include_web: Whether to include web search results

    Returns:
        Formatted string with search results
    """
    hybrid_search = EnhancedHybridSearch()
    results = hybrid_search.search(query, top_k=top_k, include_web=include_web)
    formatted = hybrid_search.format_results(results)
    return formatted
