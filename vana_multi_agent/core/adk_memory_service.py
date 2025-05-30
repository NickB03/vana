"""
ADK Memory Service Integration for VANA

This module provides integration with Google ADK's native memory systems,
specifically VertexAiRagMemoryService for semantic search and knowledge storage.
It replaces the custom knowledge graph implementation with ADK's managed services.

Key Features:
- VertexAiRagMemoryService integration for semantic search
- Session state management with ADK patterns
- Backward compatibility with existing APIs
- Automatic session-to-memory conversion
- Built-in load_memory tool integration

Usage:
    ```python
    from vana_multi_agent.core.adk_memory_service import ADKMemoryService

    # Initialize ADK memory service
    memory_service = ADKMemoryService()

    # Search memory
    results = await memory_service.search_memory("What is VANA?")

    # Add session to memory
    await memory_service.add_session_to_memory(session)
    ```
"""

import os
import logging
from typing import List, Dict, Any, Optional
from google.adk.memory import VertexAiRagMemoryService, InMemoryMemoryService
from google.adk.sessions import Session
from google.adk.tools import load_memory

# Configure logging
logger = logging.getLogger(__name__)

class ADKMemoryService:
    """
    ADK Memory Service wrapper providing integration with Google ADK's native memory systems.

    This service provides a unified interface for memory operations using Google ADK's
    VertexAiRagMemoryService for production and InMemoryMemoryService for development/testing.
    """

    def __init__(self, use_vertex_ai: bool = True, rag_corpus: Optional[str] = None):
        """
        Initialize the ADK Memory Service.

        Args:
            use_vertex_ai: Whether to use VertexAiRagMemoryService (True) or InMemoryMemoryService (False)
            rag_corpus: RAG Corpus resource name for VertexAiRagMemoryService
        """
        self.use_vertex_ai = use_vertex_ai
        self.memory_service = None
        self._initialize_memory_service(rag_corpus)

    def _initialize_memory_service(self, rag_corpus: Optional[str] = None):
        """Initialize the appropriate memory service based on configuration."""
        try:
            if self.use_vertex_ai:
                # Initialize VertexAiRagMemoryService for production
                if not rag_corpus:
                    # Use environment variable or default
                    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
                    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
                    corpus_id = os.getenv("VANA_RAG_CORPUS_ID", "vana-corpus")
                    rag_corpus = f"projects/{project_id}/locations/{location}/ragCorpora/{corpus_id}"

                self.memory_service = VertexAiRagMemoryService(
                    rag_corpus=rag_corpus,
                    similarity_top_k=5,
                    vector_distance_threshold=0.7
                )
                logger.info(f"Initialized VertexAiRagMemoryService with corpus: {rag_corpus}")

            else:
                # Initialize InMemoryMemoryService for development/testing
                self.memory_service = InMemoryMemoryService()
                logger.info("Initialized InMemoryMemoryService for development/testing")

        except Exception as e:
            logger.error(f"Failed to initialize ADK memory service: {e}")
            # Fallback to InMemoryMemoryService
            self.memory_service = InMemoryMemoryService()
            logger.warning("Falling back to InMemoryMemoryService")

    async def search_memory(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search memory for relevant information using semantic search.

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            List of search results with content, score, and metadata
        """
        try:
            if not self.memory_service:
                logger.warning("Memory service not initialized")
                return []

            # Use the memory service's search functionality
            # Note: The exact API may vary based on ADK version
            # Try different parameter formats for compatibility
            try:
                results = await self.memory_service.search_memory(query, top_k=top_k)
            except TypeError:
                # Try without top_k parameter
                results = await self.memory_service.search_memory(query)
                # Limit results manually if needed
                if isinstance(results, list) and len(results) > top_k:
                    results = results[:top_k]

            # Format results for consistency
            formatted_results = []
            for result in results:
                formatted_result = {
                    "content": result.get("content", ""),
                    "score": result.get("score", 0.0),
                    "source": "adk_memory",
                    "metadata": result.get("metadata", {})
                }
                formatted_results.append(formatted_result)

            logger.info(f"ADK memory search returned {len(formatted_results)} results for query: {query}")
            return formatted_results

        except Exception as e:
            logger.error(f"Error searching ADK memory: {e}")
            return []

    async def add_session_to_memory(self, session: Session) -> bool:
        """
        Add a session's content to memory for future retrieval.

        Args:
            session: The session to add to memory

        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.memory_service:
                logger.warning("Memory service not initialized")
                return False

            # Add session to memory using ADK's built-in functionality
            await self.memory_service.add_session_to_memory(session)
            logger.info(f"Added session {session.id} to ADK memory")
            return True

        except Exception as e:
            logger.error(f"Error adding session to ADK memory: {e}")
            return False

    def get_load_memory_tool(self):
        """
        Get the ADK load_memory tool for agent integration.

        Returns:
            The load_memory tool instance
        """
        return load_memory

    def is_available(self) -> bool:
        """
        Check if the memory service is available and operational.

        Returns:
            True if available, False otherwise
        """
        return self.memory_service is not None

    def get_service_info(self) -> Dict[str, Any]:
        """
        Get information about the current memory service configuration.

        Returns:
            Dictionary with service information
        """
        return {
            "service_type": "VertexAiRagMemoryService" if self.use_vertex_ai else "InMemoryMemoryService",
            "available": self.is_available(),
            "supports_persistence": self.use_vertex_ai,
            "supports_semantic_search": True
        }

# Global instance for easy access
_adk_memory_service = None

def get_adk_memory_service() -> ADKMemoryService:
    """
    Get the global ADK memory service instance.

    Returns:
        The global ADKMemoryService instance
    """
    global _adk_memory_service
    if _adk_memory_service is None:
        # Determine if we should use Vertex AI based on environment
        use_vertex_ai = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "1") == "1"
        _adk_memory_service = ADKMemoryService(use_vertex_ai=use_vertex_ai)
    return _adk_memory_service

def reset_adk_memory_service():
    """Reset the global ADK memory service instance (useful for testing)."""
    global _adk_memory_service
    _adk_memory_service = None
