"""
Enhanced Hybrid Search with Optimized Algorithms

This module provides an optimized implementation of Enhanced Hybrid Search
that improves result quality based on evaluation findings.
"""

import logging
import re
import time
from typing import Any, Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import necessary components
try:
    from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
    from tools.vector_search.vector_search_client import VectorSearchClient
    from tools.web_search import WebSearchClient
except ImportError as e:
    logger.warning(f"Could not import some components: {str(e)}")


class EnhancedHybridSearchOptimized:
    """Enhanced Hybrid Search with optimized algorithms"""

    def __init__(
        self, vector_search_client=None, kg_manager=None, web_search_client=None
    ):
        """
        Initialize Enhanced Hybrid Search with optimized algorithms

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
        self.web_available = (
            hasattr(self.web_search_client, "available")
            and self.web_search_client.available
        )

        # Source weights - optimized based on evaluation
        self.source_weights = {
            "vector_search": 0.7,  # Increased from 0.5 for better relevance
            "knowledge_graph": 0.9,  # Increased from 0.8 for structured knowledge
            "web_search": 0.6,  # Decreased from 0.7 to prioritize internal knowledge
        }

        # Category weights for query classification
        self.category_weights = {
            "general": {
                "vector_search": 0.7,
                "knowledge_graph": 0.8,
                "web_search": 0.5,
            },
            "technology": {
                "vector_search": 0.8,
                "knowledge_graph": 0.9,
                "web_search": 0.4,
            },
            "feature": {
                "vector_search": 0.9,
                "knowledge_graph": 0.7,
                "web_search": 0.5,
            },
            "architecture": {
                "vector_search": 0.8,
                "knowledge_graph": 0.7,
                "web_search": 0.4,
            },
            "setup": {"vector_search": 0.9, "knowledge_graph": 0.6, "web_search": 0.5},
            "integration": {
                "vector_search": 0.7,
                "knowledge_graph": 0.8,
                "web_search": 0.6,
            },
            "evaluation": {
                "vector_search": 0.8,
                "knowledge_graph": 0.7,
                "web_search": 0.4,
            },
            "usage": {"vector_search": 0.9, "knowledge_graph": 0.7, "web_search": 0.5},
            "security": {
                "vector_search": 0.7,
                "knowledge_graph": 0.8,
                "web_search": 0.6,
            },
            "performance": {
                "vector_search": 0.8,
                "knowledge_graph": 0.7,
                "web_search": 0.5,
            },
        }

        # Default category weights
        self.default_category_weights = {
            "vector_search": 0.7,
            "knowledge_graph": 0.8,
            "web_search": 0.5,
        }

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
            "technology": [
                "technology",
                "algorithm",
                "implementation",
                "how does",
                "work",
            ],
            "feature": ["feature", "capability", "function", "support", "handle"],
            "architecture": [
                "architecture",
                "design",
                "structure",
                "component",
                "system",
            ],
            "setup": ["setup", "install", "configure", "environment", "start"],
            "integration": ["integrate", "connect", "api", "interface", "external"],
            "evaluation": ["evaluate", "metric", "measure", "quality", "performance"],
            "usage": ["use", "how to", "example", "tutorial", "guide"],
            "security": ["security", "secure", "protect", "privacy", "access"],
            "performance": ["performance", "speed", "latency", "optimize", "efficient"],
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
                best_categories = [
                    c for c, s in category_scores.items() if s == max_score
                ]
                best_category = best_categories[0]  # Take the first if multiple match
                return self.category_weights.get(
                    best_category, self.default_category_weights
                )

        # Default weights if no category matches
        return self.default_category_weights

    def search(
        self, query: str, top_k: int = 5, include_web: bool = True
    ) -> Dict[str, Any]:
        """
        Perform enhanced hybrid search with optimized algorithms

        Args:
            query: Search query
            top_k: Number of results to retrieve
            include_web: Whether to include web search results

        Returns:
            Combined search results
        """
        results = {}

        # Classify query to get optimal weights
        source_weights = self.classify_query(query)

        # Preprocess query
        preprocessed_query = self.preprocess_query(query)

        # Vector Search
        if self.vs_available:
            try:
                vs_results = self.vector_search_client.search(
                    preprocessed_query, top_k=top_k
                )
                results["vector_search"] = vs_results
            except Exception as e:
                logger.error(f"Error in Vector Search: {str(e)}")
                results["vector_search"] = []
        else:
            results["vector_search"] = []

        # Knowledge Graph
        if self.kg_available:
            try:
                kg_results = self.kg_manager.query("*", preprocessed_query)
                entities = kg_results.get("entities", [])

                # Convert to common format
                kg_formatted = []
                for entity in entities:
                    kg_formatted.append(
                        {
                            "content": entity.get("observation", ""),
                            "metadata": {
                                "name": entity.get("name", ""),
                                "type": entity.get("type", ""),
                                "source": "knowledge_graph",
                            },
                        }
                    )

                results["knowledge_graph"] = kg_formatted
            except Exception as e:
                logger.error(f"Error in Knowledge Graph: {str(e)}")
                results["knowledge_graph"] = []
        else:
            results["knowledge_graph"] = []

        # Web Search
        if include_web and self.web_available:
            try:
                web_results = self.web_search_client.search(
                    preprocessed_query, num_results=top_k
                )

                # Convert to common format
                web_formatted = []
                for result in web_results:
                    web_formatted.append(
                        {
                            "content": f"{result.get('title', '')} {result.get('snippet', '')}",
                            "metadata": {
                                "url": result.get("url", ""),
                                "title": result.get("title", ""),
                                "source": "web_search",
                            },
                        }
                    )

                results["web_search"] = web_formatted
            except Exception as e:
                logger.error(f"Error in Web Search: {str(e)}")
                results["web_search"] = []
        else:
            results["web_search"] = []

        # Combine results with optimized algorithm
        combined = self.combine_results_optimized(results, query, source_weights)
        results["combined"] = combined

        return results

    def preprocess_query(self, query: str) -> str:
        """
        Preprocess query for better search results

        Args:
            query: Original query

        Returns:
            Preprocessed query
        """
        # Convert to lowercase
        query = query.lower()

        # Remove question marks
        query = query.replace("?", "")

        # Remove filler words
        filler_words = [
            "the",
            "a",
            "an",
            "is",
            "are",
            "in",
            "on",
            "at",
            "to",
            "for",
            "with",
        ]
        query_words = query.split()
        filtered_words = [word for word in query_words if word not in filler_words]

        # Add key terms based on query type
        if query.startswith("what is") or query.startswith("what are"):
            filtered_words.append("definition")
        elif query.startswith("how to"):
            filtered_words.append("guide")
        elif query.startswith("how does"):
            filtered_words.append("explanation")

        # Join words
        preprocessed_query = " ".join(filtered_words)

        return preprocessed_query

    def combine_results_optimized(
        self,
        results: Dict[str, List[Dict[str, Any]]],
        query: str,
        source_weights: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """
        Combine results from different sources with optimized algorithm

        Args:
            results: Results from different sources
            query: Original search query
            source_weights: Weights for different sources

        Returns:
            Combined and ranked results
        """
        # Collect all results
        all_results = []

        # Add Vector Search results
        for result in results.get("vector_search", []):
            result["source"] = "vector_search"
            result["score"] = result.get("score", 0.5) * source_weights["vector_search"]
            all_results.append(result)

        # Add Knowledge Graph results
        for result in results.get("knowledge_graph", []):
            result["source"] = "knowledge_graph"
            result["score"] = (
                0.8 * source_weights["knowledge_graph"]
            )  # Base score for KG results
            all_results.append(result)

        # Add Web Search results
        for result in results.get("web_search", []):
            result["source"] = "web_search"
            result["score"] = (
                0.7 * source_weights["web_search"]
            )  # Base score for web results
            all_results.append(result)

        # Calculate relevance to query
        for result in all_results:
            relevance = self.calculate_relevance_optimized(result, query)
            result["relevance"] = relevance

            # Apply recency boost for web results
            if result["source"] == "web_search" and "timestamp" in result.get(
                "metadata", {}
            ):
                recency_boost = self.calculate_recency_boost(
                    result["metadata"]["timestamp"]
                )
                result["recency_boost"] = recency_boost
                result["final_score"] = result["score"] * relevance * recency_boost
            else:
                result["final_score"] = result["score"] * relevance

        # Sort by final score
        ranked_results = sorted(
            all_results, key=lambda x: x.get("final_score", 0), reverse=True
        )

        # Ensure diversity
        diverse_results = self.ensure_diversity(ranked_results)

        return diverse_results

    def calculate_relevance_optimized(
        self, result: Dict[str, Any], query: str
    ) -> float:
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

        if "title" in metadata and any(
            term in metadata["title"].lower() for term in query_terms
        ):
            metadata_match += 0.3

        if "name" in metadata and any(
            term in metadata["name"].lower() for term in query_terms
        ):
            metadata_match += 0.3

        if "type" in metadata and any(
            term in metadata["type"].lower() for term in query_terms
        ):
            metadata_match += 0.2

        # Combine scores with weights
        relevance = (
            0.4 * term_frequency
            + 0.3 * exact_match
            + 0.2 * proximity_score
            + 0.1 * metadata_match
        )

        return min(relevance, 1.0)  # Cap at 1.0

    def calculate_proximity_score(self, content: str, query_terms: List[str]) -> float:
        """
        Calculate proximity score based on how close query terms appear in content

        Args:
            content: Content to search in
            query_terms: Query terms to search for

        Returns:
            Proximity score (0-1)
        """
        if not query_terms or not content:
            return 0.0

        # Find positions of all query terms
        positions = {}
        for term in query_terms:
            term_positions = [
                m.start() for m in re.finditer(r"\b" + re.escape(term) + r"\b", content)
            ]
            if term_positions:
                positions[term] = term_positions

        # If not all terms are found, return partial score
        if len(positions) < len(query_terms):
            return len(positions) / len(query_terms) * 0.5

        # Calculate minimum distance between terms
        min_distance = float("inf")
        for i, term1 in enumerate(query_terms):
            if term1 not in positions:
                continue

            for j, term2 in enumerate(query_terms):
                if i == j or term2 not in positions:
                    continue

                for pos1 in positions[term1]:
                    for pos2 in positions[term2]:
                        distance = abs(pos1 - pos2)
                        min_distance = min(min_distance, distance)

        if min_distance == float("inf"):
            return 0.0

        # Convert distance to score (closer is better)
        proximity_score = 1.0 / (1.0 + min_distance / 100.0)

        return proximity_score

    def calculate_recency_boost(self, timestamp: str) -> float:
        """
        Calculate recency boost for web results

        Args:
            timestamp: Result timestamp

        Returns:
            Recency boost factor (1.0 or higher)
        """
        try:
            # Parse timestamp
            result_time = time.strptime(timestamp, "%Y-%m-%dT%H:%M:%S")
            result_seconds = time.mktime(result_time)

            # Get current time
            current_seconds = time.time()

            # Calculate age in days
            age_days = (current_seconds - result_seconds) / (60 * 60 * 24)

            # Calculate recency boost (newer is better)
            if age_days < 30:  # Less than a month old
                return 1.5
            elif age_days < 90:  # Less than 3 months old
                return 1.3
            elif age_days < 365:  # Less than a year old
                return 1.1
            else:
                return 1.0
        except:
            return 1.0  # Default if timestamp can't be parsed

    def ensure_diversity(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Ensure diversity in results by limiting consecutive results from same source

        Args:
            results: Ranked results

        Returns:
            Diverse results
        """
        if not results:
            return []

        diverse_results = []
        source_counts = {"vector_search": 0, "knowledge_graph": 0, "web_search": 0}

        # First pass: take top result from each source
        for source in ["knowledge_graph", "vector_search", "web_search"]:
            for result in results:
                if result["source"] == source and source_counts[source] == 0:
                    diverse_results.append(result)
                    source_counts[source] += 1
                    break

        # Second pass: take remaining results with diversity constraints
        for result in results:
            if result in diverse_results:
                continue

            source = result["source"]

            # Limit consecutive results from same source
            if len(diverse_results) >= 2:
                last_source = diverse_results[-1]["source"]
                second_last_source = diverse_results[-2]["source"]

                if source == last_source and source == second_last_source:
                    continue  # Skip to avoid three consecutive results from same source

            # Add result
            diverse_results.append(result)
            source_counts[source] += 1

        return diverse_results

    def format_results(self, results: Dict[str, Any]) -> str:
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

                formatted.append(
                    f"**{name}** ({entity_type})\n{content}\nSource: Knowledge Graph"
                )

            else:  # vector_search
                doc_id = result.get("metadata", {}).get("doc_id", "")

                formatted.append(f"{content}\nSource: Vector Search (Doc ID: {doc_id})")

        return "\n\n".join(formatted)
