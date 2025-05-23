"""
Document Processor for VANA.

This module provides document processing functionality for VANA.
"""

import os
import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Document Processor for VANA."""
    
    def __init__(self):
        """Initialize Document Processor."""
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
    
    def process(self, document_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process document.
        
        Args:
            document_path: Path to document to process
            options: Optional processing options
            
        Returns:
            Dict with result information
        """
        try:
            # Check if document exists
            if not os.path.exists(document_path):
                return {
                    "success": False,
                    "error": f"Document not found: {document_path}"
                }
            
            # Parse options
            options = options or {}
            chunk_size = options.get("chunk_size", 1000)
            chunk_overlap = options.get("chunk_overlap", 200)
            extract_entities = options.get("extract_entities", True)
            
            # Read document
            with open(document_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Get document metadata
            metadata = self._get_document_metadata(document_path)
            
            # Chunk document
            chunks = self._chunk_document(content, chunk_size, chunk_overlap)
            
            # Extract entities if requested
            entities = []
            if extract_entities:
                entities = self._extract_entities(content)
            
            # Store chunks in Vector Search if available
            vector_search_results = []
            if self.vector_search_client:
                try:
                    for i, chunk in enumerate(chunks):
                        chunk_metadata = metadata.copy()
                        chunk_metadata["chunk_index"] = i
                        chunk_metadata["chunk_count"] = len(chunks)
                        
                        result = self.vector_search_client.store_document_chunk(chunk, chunk_metadata)
                        vector_search_results.append(result)
                except Exception as e:
                    logger.error(f"Failed to store document chunks in Vector Search: {e}")
            
            # Store entities in Knowledge Graph if available
            kg_result = None
            if self.kg_client and entities:
                try:
                    kg_result = self.kg_client.store_entities(entities)
                except Exception as e:
                    logger.error(f"Failed to store entities in Knowledge Graph: {e}")
            
            return {
                "success": True,
                "document_path": document_path,
                "metadata": metadata,
                "chunk_count": len(chunks),
                "entity_count": len(entities),
                "vector_search_results": vector_search_results,
                "knowledge_graph_result": kg_result
            }
        except Exception as e:
            error_msg = f"Failed to process document: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    def _get_document_metadata(self, document_path: str) -> Dict[str, Any]:
        """Get document metadata.
        
        Args:
            document_path: Path to document
            
        Returns:
            Document metadata
        """
        # Get file stats
        stats = os.stat(document_path)
        
        # Get file extension
        _, ext = os.path.splitext(document_path)
        
        # Create metadata
        metadata = {
            "filename": os.path.basename(document_path),
            "path": document_path,
            "size_bytes": stats.st_size,
            "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(stats.st_mtime).isoformat(),
            "file_type": ext.lstrip(".").lower(),
            "source": "document_processor",
            "processed_at": datetime.utcnow().isoformat()
        }
        
        return metadata
    
    def _chunk_document(self, content: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        """Chunk document content.
        
        Args:
            content: Document content
            chunk_size: Maximum chunk size in characters
            chunk_overlap: Overlap between chunks in characters
            
        Returns:
            List of document chunks
        """
        # Simple chunking by character count
        # In a real implementation, this would use semantic chunking
        chunks = []
        
        # If content is shorter than chunk size, return as single chunk
        if len(content) <= chunk_size:
            return [content]
        
        # Split content into chunks
        start = 0
        while start < len(content):
            # Get chunk end position
            end = start + chunk_size
            
            # If we're at the end of the content, just use the rest
            if end >= len(content):
                chunks.append(content[start:])
                break
            
            # Try to find a natural break point (newline or period)
            break_point = content.rfind("\n", start, end)
            if break_point == -1:
                break_point = content.rfind(". ", start, end)
            
            # If no natural break point, just use the chunk size
            if break_point == -1 or break_point <= start:
                break_point = end
            else:
                # Include the period or newline
                break_point += 1
            
            # Add chunk
            chunks.append(content[start:break_point])
            
            # Move start position, accounting for overlap
            start = break_point - chunk_overlap
            
            # Ensure start is not negative
            start = max(0, start)
        
        return chunks
    
    def _extract_entities(self, content: str) -> List[Dict[str, Any]]:
        """Extract entities from document content.
        
        Args:
            content: Document content
            
        Returns:
            List of extracted entities
        """
        # Simple entity extraction
        # In a real implementation, this would use NLP to extract entities
        entities = []
        
        # Extract potential entities (capitalized words)
        words = re.findall(r'\b[A-Z][a-zA-Z]{2,}\b', content)
        
        # Deduplicate
        unique_words = set(words)
        
        for word in unique_words:
            # Find a context for the entity (sentence containing the word)
            pattern = r'[^.!?]*\b' + re.escape(word) + r'\b[^.!?]*[.!?]'
            contexts = re.findall(pattern, content)
            
            # Use the first context if available
            observation = contexts[0].strip() if contexts else f"Entity found: {word}"
            
            entities.append({
                "name": word,
                "type": "unknown",
                "source": "document_processor",
                "observation": observation
            })
        
        return entities
