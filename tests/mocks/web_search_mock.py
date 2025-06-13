#!/usr/bin/env python3
"""
Mock Web Search Tool for VANA

This module provides a mock implementation of the Google Custom Search API
for testing purposes. It returns predefined results for specific queries.
"""

import logging
import re
from typing import Any, Dict, List

from tools.web_search import WebSearchClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockWebSearchClient(WebSearchClient):
    """Mock client for performing web searches"""

    def __init__(self):
        """Initialize the mock web search client"""
        super().__init__()
        self.mock_data = self._load_mock_data()
        logger.info("Initialized Mock Web Search Client")

    def _load_mock_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load mock data for predefined queries"""
        mock_data = {
            "vana": [
                {
                    "title": "VANA: Versatile Agent Network Architecture",
                    "url": "https://example.com/vana",
                    "snippet": "VANA is a Versatile Agent Network Architecture that leverages Google's Agent Development Kit (ADK) to provide powerful knowledge retrieval capabilities.",
                    "source": "example.com",
                    "date": "2023-05-15",
                },
                {
                    "title": "Building Intelligent Agents with VANA",
                    "url": "https://example.com/vana-agents",
                    "snippet": "Learn how to build intelligent agents using VANA, a framework that combines Vector Search and Knowledge Graph for comprehensive knowledge retrieval.",
                    "source": "example.com",
                    "date": "2023-06-20",
                },
            ],
            "vector search": [
                {
                    "title": "Vector Search: Semantic Search for Modern Applications",
                    "url": "https://example.com/vector-search",
                    "snippet": "Vector Search uses embeddings to find semantically similar content, enabling more intelligent search capabilities than traditional keyword-based approaches.",
                    "source": "example.com",
                    "date": "2023-04-10",
                },
                {
                    "title": "Implementing Vector Search with Vertex AI",
                    "url": "https://example.com/vertex-ai-vector-search",
                    "snippet": "A guide to implementing Vector Search using Google Cloud's Vertex AI, with examples of embedding generation and similarity search.",
                    "source": "example.com",
                    "date": "2023-07-05",
                },
            ],
            "knowledge graph": [
                {
                    "title": "Knowledge Graph: Structured Knowledge Representation",
                    "url": "https://example.com/knowledge-graph",
                    "snippet": "Knowledge Graphs provide a structured way to represent entities and relationships, enabling more precise and contextual information retrieval.",
                    "source": "example.com",
                    "date": "2023-03-22",
                },
                {
                    "title": "Building a Knowledge Graph for Intelligent Agents",
                    "url": "https://example.com/agent-knowledge-graph",
                    "snippet": "Learn how to build and use a Knowledge Graph to enhance the capabilities of intelligent agents with structured knowledge representation.",
                    "source": "example.com",
                    "date": "2023-08-15",
                },
            ],
            "hybrid search": [
                {
                    "title": "Hybrid Search: Combining Vector Search and Knowledge Graph",
                    "url": "https://example.com/hybrid-search",
                    "snippet": "Hybrid Search combines the strengths of Vector Search and Knowledge Graph to provide comprehensive and accurate search results for complex queries.",
                    "source": "example.com",
                    "date": "2023-09-01",
                },
                {
                    "title": "Implementing Hybrid Search for Intelligent Applications",
                    "url": "https://example.com/hybrid-search-implementation",
                    "snippet": "A guide to implementing Hybrid Search that combines semantic similarity with structured knowledge for improved search relevance.",
                    "source": "example.com",
                    "date": "2023-09-20",
                },
            ],
            "document processing": [
                {
                    "title": "Advanced Document Processing Techniques",
                    "url": "https://example.com/document-processing",
                    "snippet": "Learn about advanced document processing techniques including semantic chunking, metadata extraction, and entity recognition.",
                    "source": "example.com",
                    "date": "2023-07-12",
                },
                {
                    "title": "Document Processing Pipeline for Knowledge Systems",
                    "url": "https://example.com/document-pipeline",
                    "snippet": "A comprehensive guide to building a document processing pipeline for knowledge systems, from text extraction to knowledge integration.",
                    "source": "example.com",
                    "date": "2023-08-30",
                },
            ],
            "agent development kit": [
                {
                    "title": "Google's Agent Development Kit (ADK)",
                    "url": "https://example.com/google-adk",
                    "snippet": "An overview of Google's Agent Development Kit (ADK), a framework for building intelligent agents with advanced capabilities.",
                    "source": "example.com",
                    "date": "2023-06-05",
                },
                {
                    "title": "Building Agents with ADK: A Practical Guide",
                    "url": "https://example.com/adk-guide",
                    "snippet": "A practical guide to building intelligent agents using Google's Agent Development Kit (ADK), with examples and best practices.",
                    "source": "example.com",
                    "date": "2023-07-25",
                },
            ],
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
        logger.info(f"Mock search for: {query}")

        # Ensure num_results is within limits
        if num_results > 10:
            num_results = 10
            logger.warning("Requested result count exceeded maximum (10), limiting to 10 results")

        # Find the best matching predefined query
        best_match = None
        best_match_score = 0

        for predefined_query in self.mock_data.keys():
            # Calculate simple match score (number of words in common)
            query_words = set(re.findall(r"\w+", query.lower()))
            predefined_words = set(re.findall(r"\w+", predefined_query.lower()))
            common_words = query_words.intersection(predefined_words)
            score = len(common_words)

            if score > best_match_score:
                best_match = predefined_query
                best_match_score = score

        # If no good match, return generic results
        if best_match_score == 0:
            logger.info(f"No predefined results for query: {query}")
            return [
                {
                    "title": "Generic Result for " + query,
                    "url": "https://example.com/search?q=" + query.replace(" ", "+"),
                    "snippet": "This is a generic result for the query: " + query,
                    "source": "example.com",
                    "date": "2023-10-01",
                }
            ]

        # Return predefined results for the best matching query
        logger.info(f"Found predefined results for query similar to: {best_match}")
        results = self.mock_data[best_match][:num_results]

        return results
