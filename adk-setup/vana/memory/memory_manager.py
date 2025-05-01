"""
Memory Manager for VANA.

This module provides memory management functionality for VANA.
"""

import os
import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class MemoryManager:
    """Memory Manager for VANA."""
    
    def __init__(self):
        """Initialize Memory Manager."""
        self.memory_cache = {}
        self.memory_cache_size = int(os.environ.get("MEMORY_CACHE_SIZE", "1000"))
        self.memory_cache_ttl = int(os.environ.get("MEMORY_CACHE_TTL", "3600"))
        self.entity_half_life_days = int(os.environ.get("ENTITY_HALF_LIFE_DAYS", "30"))
        self.vector_search_weight = float(os.environ.get("VECTOR_SEARCH_WEIGHT", "0.7"))
        self.knowledge_graph_weight = float(os.environ.get("KNOWLEDGE_GRAPH_WEIGHT", "0.3"))
        
        # Initialize Vector Search client
        try:
            from vana.vector_search import VectorSearchClient
            self.vector_search_client = VectorSearchClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Vector Search client: {e}")
            self.vector_search_client = None
        
        # Initialize Knowledge Graph client
        try:
            from vana.knowledge_graph import KnowledgeGraphClient
            self.kg_client = KnowledgeGraphClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Knowledge Graph client: {e}")
            self.kg_client = None
    
    def save_buffer(self, buffer: List[Dict[str, str]], tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Save buffer to memory.
        
        Args:
            buffer: List of messages to save
            tags: Optional list of tags to apply
            
        Returns:
            Dict with result information
        """
        try:
            # Format buffer for storage
            formatted_buffer = self._format_buffer(buffer)
            
            # Add tags if provided
            if tags:
                formatted_buffer["tags"] = tags
            
            # Add timestamp
            formatted_buffer["timestamp"] = datetime.utcnow().isoformat()
            
            # Store in Vector Search if available
            vector_search_result = None
            if self.vector_search_client:
                try:
                    vector_search_result = self.vector_search_client.store_memory(formatted_buffer)
                except Exception as e:
                    logger.error(f"Failed to store memory in Vector Search: {e}")
            
            # Store in Knowledge Graph if available
            kg_result = None
            if self.kg_client:
                try:
                    # Extract entities from buffer
                    entities = self._extract_entities(buffer)
                    
                    # Store entities in Knowledge Graph
                    kg_result = self.kg_client.store_entities(entities)
                except Exception as e:
                    logger.error(f"Failed to store memory in Knowledge Graph: {e}")
            
            # Update cache
            cache_key = f"memory_{datetime.utcnow().isoformat()}"
            self.memory_cache[cache_key] = formatted_buffer
            
            # Prune cache if needed
            self._prune_cache()
            
            return {
                "success": True,
                "vector_search_result": vector_search_result,
                "knowledge_graph_result": kg_result,
                "cache_key": cache_key
            }
        except Exception as e:
            error_msg = f"Failed to save buffer: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    def sync_memory(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Sync memory for user and session.
        
        Args:
            user_id: User ID to sync memory for
            session_id: Session ID to sync memory for
            
        Returns:
            Dict with result information
        """
        try:
            # Get changes since last sync
            last_sync = self._get_last_sync(user_id, session_id)
            
            # Sync with Vector Search if available
            vector_search_result = None
            if self.vector_search_client:
                try:
                    vector_search_result = self.vector_search_client.sync_memory(user_id, session_id, last_sync)
                except Exception as e:
                    logger.error(f"Failed to sync memory with Vector Search: {e}")
            
            # Sync with Knowledge Graph if available
            kg_result = None
            if self.kg_client:
                try:
                    kg_result = self.kg_client.sync_memory(user_id, session_id, last_sync)
                except Exception as e:
                    logger.error(f"Failed to sync memory with Knowledge Graph: {e}")
            
            # Update last sync time
            self._update_last_sync(user_id, session_id)
            
            return {
                "success": True,
                "vector_search_result": vector_search_result,
                "knowledge_graph_result": kg_result,
                "last_sync": datetime.utcnow().isoformat()
            }
        except Exception as e:
            error_msg = f"Failed to sync memory: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    def search_memory(self, query: str, user_id: Optional[str] = None, top_k: int = 5) -> Dict[str, Any]:
        """Search memory for query.
        
        Args:
            query: Query to search for
            user_id: Optional user ID to filter by
            top_k: Number of results to return
            
        Returns:
            Dict with result information
        """
        try:
            # Search Vector Search if available
            vector_search_results = []
            if self.vector_search_client:
                try:
                    vector_search_results = self.vector_search_client.search_memory(query, user_id, top_k)
                except Exception as e:
                    logger.error(f"Failed to search memory in Vector Search: {e}")
            
            # Search Knowledge Graph if available
            kg_results = []
            if self.kg_client:
                try:
                    kg_results = self.kg_client.search_memory(query, user_id, top_k)
                except Exception as e:
                    logger.error(f"Failed to search memory in Knowledge Graph: {e}")
            
            # Combine results
            combined_results = self._combine_results(vector_search_results, kg_results, query)
            
            return {
                "success": True,
                "results": combined_results[:top_k],
                "vector_search_count": len(vector_search_results),
                "knowledge_graph_count": len(kg_results)
            }
        except Exception as e:
            error_msg = f"Failed to search memory: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "results": []
            }
    
    def _format_buffer(self, buffer: List[Dict[str, str]]) -> Dict[str, Any]:
        """Format buffer for storage.
        
        Args:
            buffer: List of messages to format
            
        Returns:
            Formatted buffer
        """
        # Extract text content
        text_content = "\n".join([f"{msg['role']}: {msg['content']}" for msg in buffer])
        
        # Create formatted buffer
        formatted_buffer = {
            "content": text_content,
            "messages": buffer,
            "source": "chat_history",
            "created_at": datetime.utcnow().isoformat()
        }
        
        return formatted_buffer
    
    def _extract_entities(self, buffer: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Extract entities from buffer.
        
        Args:
            buffer: List of messages to extract entities from
            
        Returns:
            List of extracted entities
        """
        # Simple entity extraction for now
        # In a real implementation, this would use NLP to extract entities
        entities = []
        
        for msg in buffer:
            if msg["role"] == "user":
                # Extract potential entities from user messages
                # This is a very simple implementation
                words = msg["content"].split()
                for word in words:
                    if word[0].isupper() and len(word) > 3:
                        entities.append({
                            "name": word,
                            "type": "unknown",
                            "source": "chat_history",
                            "observation": msg["content"]
                        })
        
        return entities
    
    def _get_last_sync(self, user_id: str, session_id: str) -> str:
        """Get last sync time for user and session.
        
        Args:
            user_id: User ID to get last sync for
            session_id: Session ID to get last sync for
            
        Returns:
            Last sync time as ISO format string
        """
        # In a real implementation, this would be stored in a database
        # For now, just return a timestamp from 1 hour ago
        last_sync = datetime.utcnow().timestamp() - 3600
        return datetime.fromtimestamp(last_sync).isoformat()
    
    def _update_last_sync(self, user_id: str, session_id: str) -> None:
        """Update last sync time for user and session.
        
        Args:
            user_id: User ID to update last sync for
            session_id: Session ID to update last sync for
        """
        # In a real implementation, this would update a database
        # For now, just log the update
        logger.info(f"Updated last sync for user {user_id}, session {session_id}")
    
    def _combine_results(self, vector_search_results: List[Dict[str, Any]], 
                         kg_results: List[Dict[str, Any]], 
                         query: str) -> List[Dict[str, Any]]:
        """Combine results from Vector Search and Knowledge Graph.
        
        Args:
            vector_search_results: Results from Vector Search
            kg_results: Results from Knowledge Graph
            query: Original query
            
        Returns:
            Combined results
        """
        # Assign weights to results
        weighted_results = []
        
        # Add Vector Search results with weight
        for i, result in enumerate(vector_search_results):
            weighted_results.append({
                "content": result.get("content", ""),
                "source": result.get("source", "vector_search"),
                "score": result.get("score", 0) * self.vector_search_weight * (1.0 - (i * 0.05)),
                "type": "vector_search"
            })
        
        # Add Knowledge Graph results with weight
        for i, result in enumerate(kg_results):
            weighted_results.append({
                "content": result.get("observation", ""),
                "source": result.get("source", "knowledge_graph"),
                "score": result.get("score", 0) * self.knowledge_graph_weight * (1.0 - (i * 0.05)),
                "type": "knowledge_graph",
                "entity": result.get("name", ""),
                "entity_type": result.get("type", "")
            })
        
        # Sort by score
        weighted_results.sort(key=lambda x: x["score"], reverse=True)
        
        return weighted_results
    
    def _prune_cache(self) -> None:
        """Prune memory cache if it exceeds the maximum size."""
        if len(self.memory_cache) > self.memory_cache_size:
            # Sort by timestamp (oldest first)
            sorted_keys = sorted(self.memory_cache.keys(), 
                                key=lambda k: self.memory_cache[k].get("timestamp", ""))
            
            # Remove oldest entries until we're under the limit
            keys_to_remove = sorted_keys[:len(self.memory_cache) - self.memory_cache_size]
            for key in keys_to_remove:
                del self.memory_cache[key]
            
            logger.info(f"Pruned {len(keys_to_remove)} entries from memory cache")
