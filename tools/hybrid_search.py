"""
Hybrid Search for VANA Memory System

This module provides a hybrid search approach that combines Vector Search and Knowledge Graph.
It provides a more comprehensive knowledge retrieval system with both semantic search and structured knowledge.
"""

import os
from typing import List, Dict, Any, Optional, Union
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

class HybridSearch:
    """Hybrid search combining Vector Search and Knowledge Graph"""
    
    def __init__(self):
        """Initialize the hybrid search"""
        self.vector_search_client = VectorSearchClient()
        self.kg_manager = KnowledgeGraphManager()
    
    def search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Search for relevant information using both Vector Search and Knowledge Graph"""
        results = {
            "vector_search": [],
            "knowledge_graph": [],
            "combined": [],
            "error": None
        }
        
        try:
            # Try Vector Search first
            if self.vector_search_client.is_available():
                vector_results = self.vector_search_client.search(query, top_k=top_k)
                results["vector_search"] = vector_results
            
            # Try Knowledge Graph
            if self.kg_manager.is_available():
                kg_results = self.kg_manager.query("*", query)
                results["knowledge_graph"] = kg_results.get("entities", [])
            
            # Combine results
            results["combined"] = self._combine_results(
                results["vector_search"],
                results["knowledge_graph"],
                top_k=top_k
            )
            
            return results
        except Exception as e:
            results["error"] = str(e)
            return results
    
    def _combine_results(self, vector_results: List[Dict[str, Any]], kg_results: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """Combine and rank results from Vector Search and Knowledge Graph"""
        combined = []
        
        # Add Vector Search results
        for result in vector_results:
            combined.append({
                "content": result.get("content", ""),
                "score": result.get("score", 0),
                "source": "vector_search",
                "metadata": result.get("metadata", {})
            })
        
        # Add Knowledge Graph results
        for result in kg_results:
            combined.append({
                "content": result.get("observation", ""),
                "score": 0.5,  # Default score for Knowledge Graph results
                "source": "knowledge_graph",
                "metadata": {
                    "name": result.get("name", ""),
                    "type": result.get("type", "")
                }
            })
        
        # Sort by score (descending)
        combined.sort(key=lambda x: x["score"], reverse=True)
        
        # Return top_k results
        return combined[:top_k]
    
    def format_results(self, results: Dict[str, Any]) -> str:
        """Format search results for display"""
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
            
            # Truncate long content
            if len(content) > 200:
                content = content[:197] + "..."
            
            formatted += f"{i}. [{source.upper()}] (Score: {score:.2f})\n{content}\n\n"
        
        return formatted
    
    def search_and_format(self, query: str, top_k: int = 5) -> str:
        """Search and format results in one step"""
        results = self.search(query, top_k=top_k)
        return self.format_results(results)
