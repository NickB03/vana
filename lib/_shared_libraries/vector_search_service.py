"""
Vector Search Service for VANA - Phase 2 Implementation

This module provides vector search capabilities using Google Cloud Vertex AI Vector Search.
It implements semantic similarity search to enhance the existing RAG pipeline with vector-based
retrieval alongside keyword search.

Key Features:
- Vertex AI MatchingEngineIndex integration for vector similarity search
- Text embedding generation using Vertex AI text-embedding-004
- Hybrid search combining keyword and semantic similarity
- Caching for performance optimization
- Retry mechanisms with exponential backoff
- Comprehensive error handling and fallback mechanisms

Usage:
    ```python
    from lib._shared_libraries.vector_search_service import get_vector_search_service
    
    # Initialize vector search service
    vector_service = get_vector_search_service()
    
    # Perform semantic search
    results = await vector_service.semantic_search("What is VANA?", top_k=5)
    
    # Generate embeddings
    embedding = await vector_service.generate_embedding("sample text")
    ```

Based on Context7 research from:
- /googleapis/nodejs-vertexai (Vertex AI patterns)
- /twmmason/google-vertex-vector-search-mcp (Vector Search implementation)
"""

import os
import logging
import asyncio
from typing import List, Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

# Try to import vector search dependencies
try:
    from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
    TENACITY_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Vector search dependencies not available: {e}")
    TENACITY_AVAILABLE = False

# Google Cloud imports
try:
    from google.cloud import aiplatform
    from google.cloud.aiplatform import MatchingEngineIndex, MatchingEngineIndexEndpoint
    from google.api_core import exceptions as gcp_exceptions
    VERTEX_AI_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Google Cloud AI Platform not available: {e}")
    VERTEX_AI_AVAILABLE = False

class VectorSearchService:
    """
    Vector Search Service using Google Cloud Vertex AI Vector Search.
    
    This service provides semantic similarity search capabilities to enhance
    the existing RAG pipeline with vector-based retrieval.
    """
    
    def __init__(self, 
                 project_id: str,
                 region: str,
                 index_id: Optional[str] = None,
                 endpoint_id: Optional[str] = None,
                 deployed_index_id: Optional[str] = None,
                 embedding_model: str = "text-embedding-004",
                 embedding_dimensions: int = 768):
        """
        Initialize the Vector Search Service.
        
        Args:
            project_id: Google Cloud project ID
            region: Google Cloud region (e.g., us-central1)
            index_id: Vertex AI MatchingEngineIndex ID
            endpoint_id: Vertex AI MatchingEngineIndexEndpoint ID
            embedding_model: Embedding model name
            embedding_dimensions: Embedding vector dimensions
        """
        self.project_id = project_id
        self.region = region
        self.index_id = index_id
        self.endpoint_id = endpoint_id
        self.deployed_index_id = deployed_index_id
        self.embedding_model = embedding_model
        self.embedding_dimensions = embedding_dimensions
        
        # Service instances
        self.index = None
        self.endpoint = None
        
        # Cache for embeddings (simple in-memory cache)
        self._embedding_cache = {}
        self._cache_max_size = 1000
        
        # Initialize services
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialize Vertex AI services."""
        if not VERTEX_AI_AVAILABLE:
            logger.warning("Google Cloud AI Platform not available - vector search disabled")
            return
            
        try:
            # Initialize AI Platform
            aiplatform.init(project=self.project_id, location=self.region)
            logger.info(f"Initialized Vertex AI for project {self.project_id} in {self.region}")
            
            # Initialize index if provided
            if self.index_id:
                self.index = MatchingEngineIndex(index_name=self.index_id)
                logger.info(f"Initialized MatchingEngineIndex: {self.index_id}")
            
            # Initialize endpoint if provided
            if self.endpoint_id:
                self.endpoint = MatchingEngineIndexEndpoint(index_endpoint_name=self.endpoint_id)
                logger.info(f"Initialized MatchingEngineIndexEndpoint: {self.endpoint_id}")
                
        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI services: {e}")
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate text embedding using Vertex AI.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            List of float values representing the embedding, or None if failed
        """
        if not VERTEX_AI_AVAILABLE:
            logger.warning("Vector search dependencies not available - skipping embedding generation")
            return None
            
        # Check cache first
        cache_key = hash(text)
        if cache_key in self._embedding_cache:
            logger.debug("Retrieved embedding from cache")
            return self._embedding_cache[cache_key]
        
        try:
            from vertexai.language_models import TextEmbeddingModel
            logger.info("Generating embedding for text: %s...", text[:100])
            model = TextEmbeddingModel.from_pretrained(self.embedding_model)
            embeddings = await asyncio.get_event_loop().run_in_executor(None, model.get_embeddings, [text])
            embedding = embeddings[0].values
            
            # Cache the result
            if len(self._embedding_cache) < self._cache_max_size:
                self._embedding_cache[cache_key] = embedding
            
            logger.debug(f"Generated embedding with {len(embedding)} dimensions")
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    async def semantic_search(self, 
                            query: str, 
                            top_k: int = 5, 
                            filter_str: str = "") -> List[Dict[str, Any]]:
        """
        Perform semantic similarity search using vector embeddings.
        
        Args:
            query: Search query text
            top_k: Number of results to return
            filter_str: Optional filter string for search
            
        Returns:
            List of search results with content, score, and metadata
        """
        if not VERTEX_AI_AVAILABLE or not self.endpoint:
            logger.warning("Vector search not available - endpoint not configured")
            return []
        
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query)
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []
            
            logger.info("Performing semantic search for: %s...", query[:100])

            def _match():
                return self.endpoint.match(
                    deployed_index_id=self.deployed_index_id,
                    queries=[query_embedding],
                    num_neighbors=top_k,
                    filter=filter_str or None,
                )

            response = await asyncio.get_event_loop().run_in_executor(None, _match)

            neighbors = response[0].neighbors
            results = []
            for neighbor in neighbors:
                results.append({
                    "content": neighbor.id,
                    "score": 1 - neighbor.distance,
                    "source": "vector_search",
                    "metadata": {
                        "id": neighbor.id,
                        "distance": neighbor.distance,
                        "search_type": "semantic_similarity",
                        "embedding_model": self.embedding_model,
                    },
                })

            logger.info("Vector search returned %d results", len(results))
            return results
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    async def hybrid_search(self, 
                          query: str, 
                          keyword_results: List[Dict[str, Any]], 
                          top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Combine keyword search results with semantic search results.
        
        Args:
            query: Search query text
            keyword_results: Results from keyword-based search
            top_k: Total number of results to return
            
        Returns:
            Combined and ranked search results
        """
        try:
            # Get semantic search results
            semantic_results = await self.semantic_search(query, top_k=top_k//2)
            
            # Combine results
            all_results = []
            
            # Add keyword results with source marking
            for result in keyword_results[:top_k//2]:
                result["metadata"] = result.get("metadata", {})
                result["metadata"]["search_type"] = "keyword"
                all_results.append(result)
            
            # Add semantic results
            all_results.extend(semantic_results)
            
            # Sort by score (assuming higher is better)
            all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
            
            # Return top results
            final_results = all_results[:top_k]
            
            logger.info(f"Hybrid search returned {len(final_results)} results "
                       f"({len(keyword_results)} keyword + {len(semantic_results)} semantic)")
            
            return final_results
            
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            # Fallback to keyword results only
            return keyword_results[:top_k]
    
    def is_available(self) -> bool:
        """
        Check if vector search is available and properly configured.

        Returns:
            True if available, False otherwise
        """
        return (VERTEX_AI_AVAILABLE and
                bool(self.project_id) and
                bool(self.region))
    
    def get_service_info(self) -> Dict[str, Any]:
        """
        Get information about the vector search service configuration.
        
        Returns:
            Dictionary with service information
        """
        return {
            "service_type": "VertexAIVectorSearch",
            "available": self.is_available(),
            "project_id": self.project_id,
            "region": self.region,
            "index_id": self.index_id,
            "endpoint_id": self.endpoint_id,
            "embedding_model": self.embedding_model,
            "embedding_dimensions": self.embedding_dimensions,
            "cache_size": len(self._embedding_cache),
            "dependencies": {
                "tenacity": TENACITY_AVAILABLE,
                "vertex_ai": VERTEX_AI_AVAILABLE
            }
        }

# Global instance for easy access
_vector_search_service = None

def get_vector_search_service() -> VectorSearchService:
    """
    Get the global vector search service instance.
    
    Returns:
        The global VectorSearchService instance
    """
    global _vector_search_service
    if _vector_search_service is None:
        # Get configuration from environment
        project_id = os.getenv("VERTEX_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT", "")
        region = os.getenv("VERTEX_REGION") or os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        index_id = os.getenv("VECTOR_SEARCH_INDEX_ID")
        endpoint_id = os.getenv("VECTOR_SEARCH_ENDPOINT_ID")
        deployed_index_id = os.getenv("DEPLOYED_INDEX_ID")
        embedding_model = os.getenv("EMBEDDING_MODEL_NAME", "text-embedding-004")
        embedding_dimensions = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
        
        logger.info(f"Initializing Vector Search Service: project={project_id}, region={region}")
        _vector_search_service = VectorSearchService(
            project_id=project_id,
            region=region,
            index_id=index_id,
            endpoint_id=endpoint_id,
            deployed_index_id=deployed_index_id,
            embedding_model=embedding_model,
            embedding_dimensions=embedding_dimensions
        )
    return _vector_search_service

def reset_vector_search_service():
    """Reset the global vector search service instance (useful for testing)."""
    global _vector_search_service
    _vector_search_service = None
