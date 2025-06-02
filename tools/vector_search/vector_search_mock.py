"""
Mock Vector Search Client for VANA Memory System

This module provides a mock implementation of the Vector Search client
for testing purposes when the real Vector Search is not available.
"""

import logging
import re
from typing import Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockVectorSearchClient:
    """Mock client for Vector Search"""

    def __init__(self):
        """Initialize the mock Vector Search client"""
        logger.info("Initializing Mock Vector Search Client")
        self.mock_data = self._load_mock_data()

    def _load_mock_data(self) -> dict[str, list[dict[str, Any]]]:
        """Load mock data for predefined queries"""
        mock_data = {
            "vana": [
                {
                    "content": "VANA (Versatile Agent Network Architecture) is a multi-agent system built using Google's Agent Development Kit (ADK). It features a hierarchical agent structure with specialized AI agents led by a coordinator agent, providing a powerful framework for complex AI tasks.",
                    "score": 0.95,
                    "metadata": {"source": "README.md", "type": "project_overview"},
                },
                {
                    "content": "VANA's architecture consists of multiple specialized agents that work together to solve complex tasks. The system uses Vector Search, Knowledge Graph, and Web Search to access and process information. This multi-source approach ensures comprehensive and accurate responses.",
                    "score": 0.92,
                    "metadata": {
                        "source": "docs/vana-architecture-guide.md",
                        "type": "architecture",
                    },
                },
                {
                    "content": "Key features of VANA include multi-agent collaboration, knowledge retrieval from multiple sources, and adaptive learning from user feedback. The system can process documents, extract entities, and generate responses based on a combination of structured and unstructured data.",
                    "score": 0.90,
                    "metadata": {
                        "source": "docs/project-status.md",
                        "type": "features",
                    },
                },
            ],
            "vector search": [
                {
                    "content": "VANA uses Vertex AI Vector Search for memory management and semantic search capabilities. The system embeds documents using text-embedding-004 and stores them in a Vector Search index with 768 dimensions. This allows for efficient retrieval of semantically similar content.",
                    "score": 0.94,
                    "metadata": {
                        "source": "docs/vector-search-implementation.md",
                        "type": "implementation",
                    },
                },
                {
                    "content": "The Vector Search implementation uses semantic chunking to optimize retrieval quality. Documents are split into chunks of 2048-4096 tokens with 256-512 token overlap. The system uses the text-embedding-004 model for superior quality and larger context window.",
                    "score": 0.92,
                    "metadata": {
                        "source": "docs/document-processing-strategy.md",
                        "type": "implementation",
                    },
                },
                {
                    "content": "Vector Search integration in VANA uses ADK package version 0.5.0 with google-cloud-aiplatform pinned to version 1.38.0. The system implements batch updates since StreamUpdate isn't supported, and uses endpoint resource name 'projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504' with deployed index ID 'vanasharedindex'.",
                    "score": 0.90,
                    "metadata": {
                        "source": "docs/vertex-ai-transition.md",
                        "type": "configuration",
                    },
                },
            ],
            "knowledge graph": [
                {
                    "content": "The Knowledge Graph integration in VANA uses a community-hosted MCP server to store and retrieve structured information. Entities and relationships are extracted from documents and stored in the graph, allowing for precise querying of structured data and relationships.",
                    "score": 0.93,
                    "metadata": {
                        "source": "docs/knowledge-graph-integration.md",
                        "type": "implementation",
                    },
                },
                {
                    "content": "MCP (Model Context Protocol) provides a standardized way for agents to access and manipulate knowledge. VANA uses MCP to interact with the Knowledge Graph, enabling structured queries and relationship traversal. The community-hosted server at mcp.community.augment.co is used rather than self-hosting.",
                    "score": 0.91,
                    "metadata": {
                        "source": "docs/n8n-mcp-server-setup.md",
                        "type": "configuration",
                    },
                },
                {
                    "content": "The Knowledge Graph in VANA captures explicit relationships between concepts, allowing for more precise and structured information retrieval. Unlike Vector Search which focuses on semantic similarity, the Knowledge Graph enables traversal of relationships and inference of new connections between entities.",
                    "score": 0.89,
                    "metadata": {
                        "source": "docs/enhanced-knowledge-graph.md",
                        "type": "features",
                    },
                },
            ],
            "web search": [
                {
                    "content": "VANA integrates with Google Custom Search API to retrieve information from the web. This allows the system to access up-to-date information not available in its knowledge base, ensuring responses include the latest developments and external context.",
                    "score": 0.92,
                    "metadata": {
                        "source": "docs/web-search-integration.md",
                        "type": "implementation",
                    },
                },
                {
                    "content": "Web Search in VANA is implemented as part of the Enhanced Hybrid Search system, which combines results from Vector Search, Knowledge Graph, and Web Search. The system uses a sophisticated ranking algorithm to prioritize results based on relevance, source quality, and recency.",
                    "score": 0.90,
                    "metadata": {
                        "source": "docs/enhanced-hybrid-search.md",
                        "type": "implementation",
                    },
                },
            ],
            "hybrid search": [
                {
                    "content": "VANA's Enhanced Hybrid Search combines results from Vector Search, Knowledge Graph, and Web Search to provide comprehensive answers. The system processes queries in parallel across all sources, then merges and ranks results based on relevance, source quality, and recency.",
                    "score": 0.94,
                    "metadata": {
                        "source": "docs/enhanced-hybrid-search.md",
                        "type": "implementation",
                    },
                },
                {
                    "content": "The hybrid search approach in VANA leverages the strengths of each search method: Vector Search for semantic similarity, Knowledge Graph for structured relationships, and Web Search for up-to-date information. This ensures responses are both comprehensive and accurate.",
                    "score": 0.92,
                    "metadata": {
                        "source": "docs/search-optimization.md",
                        "type": "features",
                    },
                },
            ],
            "project vana": [
                {
                    "content": "Project VANA (Versatile Agent Network Architecture) is a sophisticated multi-agent system built using Google's Agent Development Kit (ADK). It features a hierarchical agent structure with specialized agents that collaborate to solve complex tasks, sharing knowledge through Vector Search, Knowledge Graph, and Web Search integration.",
                    "score": 0.96,
                    "metadata": {"source": "README.md", "type": "project_overview"},
                },
                {
                    "content": "The goals of Project VANA include creating a scalable multi-agent system, implementing efficient knowledge retrieval mechanisms, enabling natural language interaction with complex data, and providing a framework for continuous learning and improvement through user feedback.",
                    "score": 0.93,
                    "metadata": {"source": "docs/project-status.md", "type": "goals"},
                },
            ],
            "default": [
                {
                    "content": "VANA is a versatile agent network architecture designed to solve complex tasks through multi-agent collaboration and knowledge integration. The system combines Vector Search, Knowledge Graph, and Web Search to provide comprehensive and accurate responses.",
                    "score": 0.85,
                    "metadata": {"source": "README.md", "type": "project_overview"},
                },
                {
                    "content": "VANA agents can search knowledge bases, process documents, extract entities, and generate responses based on multiple sources of information. The system features a hierarchical structure with specialized agents for different tasks, all coordinated by the main Vana agent.",
                    "score": 0.82,
                    "metadata": {
                        "source": "docs/vana-architecture-guide.md",
                        "type": "architecture",
                    },
                },
            ],
        }
        return mock_data

    def is_available(self) -> bool:
        """Check if Vector Search is available"""
        return True

    def generate_embedding(self, _text: str) -> list[float]:
        """Generate a mock embedding for text"""
        # Return a mock embedding of 768 dimensions
        logger.info(f"Mock: Generating embedding for '{_text[:30]}...'")
        return [0.1] * 768

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """
        Search for relevant information using mock data

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            List of search results
        """
        logger.info(f"Mock Vector Search for: {query}")

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

        # If no good match, return default results
        if best_match_score == 0:
            logger.info(f"No predefined results for query: {query}")
            return self.mock_data["default"][:top_k]

        # Return predefined results for the best matching query
        logger.info(f"Found predefined results for query similar to: {best_match}")
        return self.mock_data[best_match][:top_k]

    def upload_embedding(self, content: str, metadata: dict[str, Any] = None) -> bool:
        """
        Upload content with embedding to Vector Search (mock)

        Args:
            content: The content to upload
            metadata: Metadata for the content

        Returns:
            True if successful, False otherwise
        """
        logger.info(
            f"Mock upload embedding for content: {content[:50]}... with metadata: {metadata}"
        )
        return True

    def batch_upload_embeddings(self, items: list[dict[str, Any]]) -> bool:
        """
        Upload multiple items with embeddings to Vector Search (mock)

        Args:
            items: List of items to upload

        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Mock batch upload embeddings for {len(items)} items")
        return True

    def search_vector_store(
        self, query_embedding: list[float], top_k: int = 5
    ) -> list[dict[str, Any]]:
        """
        Search the vector store with a query embedding (mock)

        Args:
            query_embedding: The embedding to search with
            top_k: Maximum number of results to return

        Returns:
            List of search results
        """
        logger.info(
            f"Mock vector store search with embedding of length {len(query_embedding)}"
        )

        # Return default results since we can't match embeddings in the mock
        results = self.mock_data["default"][:top_k]

        # Add IDs to results if not present
        for i, result in enumerate(results):
            if "id" not in result:
                result["id"] = f"mock-{i}"

        return results

    def search_knowledge(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """
        Search for knowledge using the vector store (mock)

        Args:
            query: The query text
            top_k: Maximum number of results to return

        Returns:
            List of knowledge results
        """
        logger.info(f"Mock knowledge search for: {query}")

        # Get mock search results
        search_results = self.search(query, top_k)

        # Format as knowledge results
        knowledge_results = []
        for i, result in enumerate(search_results):
            # Extract content and metadata
            content = result.get("content", "")
            metadata = result.get("metadata", {})
            source = metadata.get("source", "unknown")

            # Create formatted result
            knowledge_result = {
                "id": result.get("id", f"mock-knowledge-{i}"),
                "score": float(result.get("score", 0.8)),
                "content": content,
                "source": source,
                "metadata": metadata,
                "vector_source": True,  # Indicate this came from vector search
            }
            knowledge_results.append(knowledge_result)

        return knowledge_results

    def get_health_status(self) -> dict[str, Any]:
        """
        Get the health status of the Vector Search client (mock)

        Returns:
            Health status information
        """
        return {
            "status": "mock",
            "message": "Using mock implementation",
            "details": {
                "initialized": True,
                "using_mock": True,
                "mock_data_categories": list(self.mock_data.keys()),
                "mock_data_size": sum(len(items) for items in self.mock_data.values()),
            },
        }
