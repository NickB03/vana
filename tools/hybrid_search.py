"""
Hybrid Search for VANA Memory System

This module provides a hybrid search approach that combines Vector Search and Knowledge Graph.
It provides a more comprehensive knowledge retrieval system with both semantic search and structured knowledge.

The hybrid search approach offers several advantages:
1. Semantic search through Vector Search for finding similar content
2. Structured knowledge through Knowledge Graph for entities and relationships
3. Combined results for more comprehensive answers
4. Graceful degradation when one system is unavailable

Usage:
    ```python
    from tools.hybrid_search import HybridSearch

    # Initialize hybrid search
    hybrid_search = HybridSearch()

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

# Configure logging
logger = logging.getLogger(__name__)

class HybridSearch:
    """Hybrid search combining Vector Search and Knowledge Graph"""

    def __init__(self, vector_search_client=None, kg_manager=None):
        """Initialize the hybrid search

        Args:
            vector_search_client: Optional VectorSearchClient instance
            kg_manager: Optional KnowledgeGraphManager instance
        """
        self.vector_search_client = vector_search_client or VectorSearchClient()
        self.kg_manager = kg_manager or KnowledgeGraphManager()

        # Log initialization status
        vs_available = self.vector_search_client.is_available()
        kg_available = self.kg_manager.is_available()
        logger.info(f"HybridSearch initialized - Vector Search available: {vs_available}, Knowledge Graph available: {kg_available}")

    def search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Search for relevant information using both Vector Search and Knowledge Graph

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            Dictionary containing vector_search results, knowledge_graph results,
            combined results, and any error messages
        """
        results = {
            "vector_search": [],
            "knowledge_graph": [],
            "combined": [],
            "error": None
        }

        if not query or not query.strip():
            results["error"] = "Empty query provided"
            logger.warning("Empty query provided to hybrid search")
            return results

        logger.info(f"Performing hybrid search for query: {query}")

        # Track service availability
        vs_available = False
        kg_available = False

        try:
            # Try Vector Search first
            try:
                if self.vector_search_client.is_available():
                    vs_available = True
                    vector_results = self.vector_search_client.search(query, top_k=top_k)
                    results["vector_search"] = vector_results
                    logger.info(f"Vector Search returned {len(vector_results)} results")
                else:
                    logger.warning("Vector Search is not available")
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

            # Check if we have any results
            if not vs_available and not kg_available:
                results["error"] = "Both Vector Search and Knowledge Graph are unavailable"
                logger.error("Both Vector Search and Knowledge Graph are unavailable")
                return results

            if len(results["vector_search"]) == 0 and len(results["knowledge_graph"]) == 0:
                logger.info("No results found in either Vector Search or Knowledge Graph")

            # Combine results
            results["combined"] = self._combine_results(
                results["vector_search"],
                results["knowledge_graph"],
                top_k=top_k
            )

            logger.info(f"Combined {len(results['combined'])} results from both sources")
            return results
        except Exception as e:
            error_msg = f"Error in hybrid search: {str(e)}"
            results["error"] = error_msg
            logger.error(error_msg)
            return results

    def _combine_results(self, vector_results: List[Dict[str, Any]], kg_results: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """Combine and rank results from Vector Search and Knowledge Graph

        Args:
            vector_results: Results from Vector Search
            kg_results: Results from Knowledge Graph
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

            # Truncate long content
            if len(content) > 200:
                content = content[:197] + "..."

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
            else:
                formatted += f"{i}. [{source.upper()}] (Score: {score:.2f})\n{content}\n\n"

        return formatted

    def search_and_format(self, query: str, top_k: int = 5) -> str:
        """Search and format results in one step

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            Formatted string with search results
        """
        logger.info(f"Performing search_and_format for query: {query}")
        results = self.search(query, top_k=top_k)
        formatted = self.format_results(results)
        return formatted

    def vector_search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Perform Vector Search only

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            Dictionary containing vector_search results and any error messages
        """
        logger.info(f"Performing vector_search for query: {query}")
        results = {
            "vector_search": [],
            "error": None
        }

        try:
            if self.vector_search_client.is_available():
                results["vector_search"] = self.vector_search_client.search(query, top_k=top_k)
                logger.info(f"Vector Search returned {len(results['vector_search'])} results")
            else:
                results["error"] = "Vector Search is not available"
                logger.warning("Vector Search is not available")
        except Exception as e:
            error_msg = f"Error in Vector Search: {str(e)}"
            results["error"] = error_msg
            logger.error(error_msg)

        return results

    def knowledge_graph_search(self, query: str) -> Dict[str, Any]:
        """Perform Knowledge Graph search only

        Args:
            query: The search query

        Returns:
            Dictionary containing knowledge_graph results and any error messages
        """
        logger.info(f"Performing knowledge_graph_search for query: {query}")
        results = {
            "knowledge_graph": [],
            "error": None
        }

        try:
            if self.kg_manager.is_available():
                kg_results = self.kg_manager.query("*", query)
                results["knowledge_graph"] = kg_results.get("entities", [])
                logger.info(f"Knowledge Graph returned {len(results['knowledge_graph'])} results")
            else:
                results["error"] = "Knowledge Graph is not available"
                logger.warning("Knowledge Graph is not available")
        except Exception as e:
            error_msg = f"Error in Knowledge Graph: {str(e)}"
            results["error"] = error_msg
            logger.error(error_msg)

        return results
