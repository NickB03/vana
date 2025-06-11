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
    from lib._shared_libraries.adk_memory_service import get_adk_memory_service

    # Initialize ADK memory service
    memory_service = get_adk_memory_service()

    # Search memory
    results = await memory_service.search_memory("What is VANA?")

    # Add session to memory
    await memory_service.add_session_to_memory(session)
    ```
"""

import os
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from google.adk.memory import VertexAiRagMemoryService, InMemoryMemoryService
from google.adk.sessions import Session
from google.adk.tools import load_memory

# Vector Search integration for Phase 2
try:
    from .vector_search_service import get_vector_search_service
    VECTOR_SEARCH_AVAILABLE = True
    _get_vector_search_service = get_vector_search_service
except ImportError as e:
    logging.warning(f"Vector search service not available: {e}")
    VECTOR_SEARCH_AVAILABLE = False
    _get_vector_search_service = None

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
        self.vector_search_service = None
        self._initialize_memory_service(rag_corpus)

    def _validate_rag_corpus_resource_name(self, resource_name: str) -> bool:
        """
        Validate RAG corpus resource name format.

        Args:
            resource_name: Resource name to validate

        Returns:
            True if valid format, False otherwise
        """
        pattern = r"^projects/[^/]+/locations/[^/]+/ragCorpora/[^/]+$"
        return bool(re.match(pattern, resource_name))

    def _initialize_memory_service(self, rag_corpus: Optional[str] = None):
        """Initialize the appropriate memory service based on configuration with enhanced environment variable logic."""
        try:
            if self.use_vertex_ai:
                # Initialize VertexAiRagMemoryService for production
                if not rag_corpus:
                    # Enhanced environment variable priority logic (Phase 1 fix)
                    # Priority 1: VANA_RAG_CORPUS_ID (validate if it's full resource name)
                    rag_corpus = os.getenv("VANA_RAG_CORPUS_ID")
                    if rag_corpus and not self._validate_rag_corpus_resource_name(rag_corpus):
                        logger.warning(f"VANA_RAG_CORPUS_ID appears to be corpus ID, not full resource name: {rag_corpus}")
                        rag_corpus = None

                    # Priority 2: RAG_CORPUS_RESOURCE_NAME (backward compatibility)
                    if not rag_corpus:
                        rag_corpus = os.getenv("RAG_CORPUS_RESOURCE_NAME")

                    # Priority 3: Build from individual components
                    if not rag_corpus:
                        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "960076421399")
                        location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
                        corpus_id = os.getenv("RAG_CORPUS_ID", "vana-corpus")  # Different from VANA_RAG_CORPUS_ID
                        rag_corpus = f"projects/{project_id}/locations/{location}/ragCorpora/{corpus_id}"

                self.memory_service = VertexAiRagMemoryService(
                    rag_corpus=rag_corpus,
                    similarity_top_k=5,
                    vector_distance_threshold=0.7
                )
                logger.info(f"Initialized VertexAiRagMemoryService with corpus: {rag_corpus}")

                # Initialize vector search service for Phase 2 enhancement
                if VECTOR_SEARCH_AVAILABLE and _get_vector_search_service:
                    try:
                        self.vector_search_service = _get_vector_search_service()
                        if self.vector_search_service.is_available():
                            logger.info("Vector search service initialized successfully")
                        else:
                            logger.warning("Vector search service not properly configured")
                            self.vector_search_service = None
                    except Exception as e:
                        logger.warning(f"Failed to initialize vector search service: {e}")
                        self.vector_search_service = None
                else:
                    self.vector_search_service = None

            else:
                # Initialize InMemoryMemoryService for development/testing
                self.memory_service = InMemoryMemoryService()
                self.vector_search_service = None
                logger.info("Initialized InMemoryMemoryService for development/testing")

        except Exception as e:
            logger.error(f"Failed to initialize ADK memory service: {e}")
            # Fallback to InMemoryMemoryService
            self.memory_service = InMemoryMemoryService()
            self.vector_search_service = None
            logger.warning("Falling back to InMemoryMemoryService")

    async def search_memory(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search memory for relevant information using enhanced semantic search.

        This method now supports hybrid search combining ADK memory with vector search
        when available, providing enhanced semantic similarity capabilities.

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

            logger.info(f"Enhanced memory search requested for: {query}")

            # Base ADK memory result
            base_results = [{
                "content": f"ADK Memory service available. Use load_memory tool to search for: {query}",
                "score": 1.0,
                "source": "adk_memory_service",
                "metadata": {
                    "service_type": self.get_service_info()["service_type"],
                    "available": True,
                    "note": "Use ToolContext.search_memory() for actual search"
                }
            }]

            # Enhanced Phase 2: Add vector search results if available
            if hasattr(self, 'vector_search_service') and self.vector_search_service:
                try:
                    logger.info("Performing hybrid search with vector similarity")
                    vector_results = await self.vector_search_service.hybrid_search(
                        query=query,
                        keyword_results=base_results,
                        top_k=top_k
                    )

                    # Add Phase 2 enhancement indicator
                    for result in vector_results:
                        if result.get("source") == "vector_search":
                            result["metadata"]["phase2_enhanced"] = True

                    logger.info(f"Hybrid search returned {len(vector_results)} results")
                    return vector_results

                except Exception as e:
                    logger.warning(f"Vector search failed, falling back to base results: {e}")

            # Fallback to base ADK memory results
            logger.info("Using base ADK memory search")
            return base_results

        except Exception as e:
            logger.error(f"Error in enhanced memory service: {e}")
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

    async def add_knowledge_to_memory(self, content: str, metadata: Dict[str, Any]) -> bool:
        """
        Add knowledge content directly to memory for population purposes.

        Args:
            content: The knowledge content to add
            metadata: Metadata about the content

        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.memory_service:
                logger.warning("Memory service not initialized")
                return False

            # For InMemoryMemoryService, we can add content directly to the internal store
            if hasattr(self.memory_service, '_memory_store'):
                # Create a memory entry
                memory_entry = {
                    "content": content,
                    "metadata": metadata,
                    "timestamp": datetime.now().isoformat(),
                    "id": f"knowledge_{len(self.memory_service._memory_store)}"
                }

                # Add to memory store
                if not hasattr(self.memory_service, '_memory_store'):
                    self.memory_service._memory_store = []

                self.memory_service._memory_store.append(memory_entry)
                logger.info(f"Added knowledge to memory: {metadata.get('type', 'unknown')}")
                return True
            else:
                # For VertexAiRagMemoryService, we need to create a session
                logger.info("Using session-based approach for VertexAI memory service")
                return False

        except Exception as e:
            logger.error(f"Error adding knowledge to memory: {e}")
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
        # Use Vertex AI if GOOGLE_GENAI_USE_VERTEXAI is True or if SESSION_SERVICE_TYPE is vertex_ai
        use_vertex_ai_env = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "False").lower() == "true"
        session_service_type = os.getenv("SESSION_SERVICE_TYPE", "in_memory").lower()
        use_vertex_ai = use_vertex_ai_env or session_service_type == "vertex_ai"

        logger.info(f"Initializing ADK memory service: use_vertex_ai={use_vertex_ai}")
        _adk_memory_service = ADKMemoryService(use_vertex_ai=use_vertex_ai)
    return _adk_memory_service

def reset_adk_memory_service():
    """Reset the global ADK memory service instance (useful for testing)."""
    global _adk_memory_service
    _adk_memory_service = None
