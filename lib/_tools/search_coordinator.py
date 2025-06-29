"""
Search Coordinator for VANA - Unified Search with Memory-First Priority

This module implements a search coordinator that enforces the memory → vector → web 
search priority hierarchy through code rather than relying on agent instruction following.

Key Features:
- Memory-first search enforcement
- Vector search integration  
- Intelligent result combination
- Fallback mechanisms with graceful degradation
- Performance monitoring and caching
- Query classification for optimal routing

Architecture:
1. Query Analysis - Classify query type and search requirements
2. Memory Search - Check ADK memory service first
3. Vector Search - Semantic similarity if memory insufficient  
4. Web Search - External information as final fallback
5. Result Fusion - Combine and rank results from multiple sources

Usage:
    ```python
    from lib._tools.search_coordinator import SearchCoordinator
    
    coordinator = SearchCoordinator()
    results = await coordinator.coordinated_search("What is VANA?")
    ```
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from google.adk.tools import FunctionTool

# Import existing search components
from lib._shared_libraries.adk_memory_service import get_adk_memory_service
from lib._shared_libraries.vector_search_service import get_vector_search_service
from lib._tools.adk_tools import web_search

# Configure logging
logger = logging.getLogger(__name__)


class QueryClassifier:
    """Classify queries to determine optimal search strategy."""
    
    @staticmethod
    def classify_query(query: str) -> Dict[str, Any]:
        """
        Classify query type and determine search strategy.
        
        Args:
            query: The search query to classify
            
        Returns:
            Classification with search strategy recommendations
        """
        query_lower = query.lower()
        
        classification = {
            "type": "general",
            "priority": ["memory", "vector", "web"],
            "requires_current": False,
            "is_vana_specific": False,
            "is_user_context": False,
            "confidence": 0.7
        }
        
        # VANA-specific queries - prioritize memory/knowledge (check first)
        vana_patterns = [
            r"\bvana\b", r"\bagent\b", r"\btool\b", r"\bcapabilit", r"\bfeature",
            r"orchestrat", r"specialist", r"what.*vana", r"how.*agent.*work"
        ]
        if any(re.search(pattern, query_lower) for pattern in vana_patterns):
            classification.update({
                "type": "vana_specific",
                "is_vana_specific": True,
                "priority": ["memory", "vector"],  # Skip web for VANA queries
                "confidence": 0.9
            })
            return classification  # Return early to avoid technical override
            
        # User preference/context queries - prioritize memory (check second)
        user_patterns = [
            r"\bprefer", r"\busual", r"\btypical", r"last time", r"\bremember",
            r"my.*setting", r"my.*choice", r"how.*i.*like", r"what.*i.*prefer"
        ]
        if any(re.search(pattern, query_lower) for pattern in user_patterns):
            classification.update({
                "type": "user_context", 
                "is_user_context": True,
                "priority": ["memory"],  # Only memory for user context
                "confidence": 0.95
            })
            return classification  # Return early to avoid technical override
            
        # Current information queries - require web search (check third)
        current_patterns = [
            r"\bcurrent", r"\bnow\b", r"\btoday", r"\blatest", r"\brecent",
            r"\bweather", r"\bnews\b", r"\bprice", r"\bstock", r"\btime\b",
            r"what.*time", r"what.*weather"
        ]
        if any(re.search(pattern, query_lower) for pattern in current_patterns):
            classification.update({
                "type": "current_info",
                "requires_current": True,
                "priority": ["memory", "web"],  # Skip vector for current info
                "confidence": 0.85
            })
            return classification  # Return early to avoid technical override
            
        # Technical/factual queries - benefit from vector search (check last)
        technical_patterns = [
            r"how.*to", r"what.*is", r"\bexplain", r"implement", r"\bcode",
            r"algorithm", r"function", r"method", r"pattern"
        ]
        if any(re.search(pattern, query_lower) for pattern in technical_patterns):
            classification.update({
                "type": "technical",
                "priority": ["memory", "vector", "web"],
                "confidence": 0.8
            })
            
        return classification


class SearchCoordinator:
    """
    Coordinated search system with memory-first priority enforcement.
    
    Implements the search hierarchy: Memory → Vector → Web with intelligent
    result combination and fallback mechanisms.
    """
    
    def __init__(self):
        """Initialize the search coordinator with all search services."""
        self.memory_service = None
        self.vector_service = None
        self.classifier = QueryClassifier()
        self._initialize_services()
        
    def _initialize_services(self):
        """Initialize memory and vector search services."""
        try:
            # Initialize memory service
            self.memory_service = get_adk_memory_service()
            if self.memory_service and self.memory_service.is_available():
                logger.info("Memory service initialized successfully")
            else:
                logger.warning("Memory service not available")
                self.memory_service = None
                
        except Exception as e:
            logger.warning(f"Failed to initialize memory service: {e}")
            self.memory_service = None
            
        try:
            # Initialize vector search service  
            self.vector_service = get_vector_search_service()
            if self.vector_service and self.vector_service.is_available():
                logger.info("Vector search service initialized successfully")
            else:
                logger.warning("Vector search service not available")
                self.vector_service = None
                
        except Exception as e:
            logger.warning(f"Failed to initialize vector search service: {e}")
            self.vector_service = None
    
    async def coordinated_search(
        self, 
        query: str, 
        max_results: int = 5,
        force_web: bool = False
    ) -> str:
        """
        Perform coordinated search with memory-first priority.
        
        Args:
            query: Search query
            max_results: Maximum results to return
            force_web: Skip memory/vector and go directly to web
            
        Returns:
            JSON formatted search results with source attribution
        """
        start_time = datetime.now()
        
        try:
            # Classify query to determine search strategy
            classification = self.classifier.classify_query(query)
            logger.info(f"Query classified as: {classification['type']} (confidence: {classification['confidence']})")
            
            # Force web search for current information requests
            if force_web or classification.get("requires_current", False):
                logger.info("Performing direct web search for current information")
                web_results = await web_search(query, max_results)
                return self._format_coordinated_results(
                    query, [], [], [web_results], classification, start_time
                )
            
            # Execute search strategy based on classification
            memory_results = []
            vector_results = []
            web_results = []
            
            search_priority = classification.get("priority", ["memory", "vector", "web"])
            
            # Execute searches in priority order
            for search_type in search_priority:
                if search_type == "memory" and self.memory_service:
                    memory_results = await self._search_memory(query, max_results)
                    if self._has_sufficient_results(memory_results, classification):
                        logger.info("Sufficient results found in memory, skipping other searches")
                        break
                        
                elif search_type == "vector" and self.vector_service:
                    vector_results = await self._search_vector(query, max_results)
                    if self._has_sufficient_results(memory_results + vector_results, classification):
                        logger.info("Sufficient results found in memory+vector, skipping web search")
                        break
                        
                elif search_type == "web":
                    web_result = await web_search(query, max_results)
                    web_results = [web_result]
                    break  # Web search is final fallback
            
            # Format and return coordinated results
            return self._format_coordinated_results(
                query, memory_results, vector_results, web_results, classification, start_time
            )
            
        except Exception as e:
            logger.error(f"Error in coordinated search: {e}")
            # Fallback to direct web search
            try:
                fallback_result = await web_search(query, max_results)
                return json.dumps({
                    "query": query,
                    "search_strategy": "fallback_web",
                    "error": f"Coordination failed: {e}",
                    "results": [{"source": "web_fallback", "data": fallback_result}],
                    "timestamp": datetime.now().isoformat()
                }, indent=2)
            except Exception as fallback_error:
                return json.dumps({
                    "query": query,
                    "error": f"All search methods failed: {e}, {fallback_error}",
                    "timestamp": datetime.now().isoformat()
                }, indent=2)
    
    async def _search_memory(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search memory service for relevant information."""
        try:
            if not self.memory_service:
                return []
                
            # Use ADK memory service search
            memory_data = await self.memory_service.search_memory(query, top_k=max_results)
            
            if memory_data:
                logger.info(f"Memory search found {len(memory_data)} results")
                return [{
                    "source": "memory",
                    "relevance": result.get("score", 0.8),
                    "data": result
                } for result in memory_data[:max_results]]
            else:
                logger.info("No results found in memory")
                return []
                
        except Exception as e:
            logger.warning(f"Memory search failed: {e}")
            return []
    
    async def _search_vector(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search vector database for semantic similarity."""
        try:
            if not self.vector_service:
                return []
                
            # Use simplified vector search service
            vector_data = await self.vector_service.semantic_search_simple(query, top_k=max_results)
            
            if vector_data:
                logger.info(f"Vector search found {len(vector_data)} results")
                return [{
                    "source": "vector",
                    "relevance": result.get("similarity_score", 0.7),
                    "data": result
                } for result in vector_data[:max_results]]
            else:
                logger.info("No results found in vector search")
                return []
                
        except Exception as e:
            logger.warning(f"Vector search failed: {e}")
            return []
    
    def _has_sufficient_results(self, results: List[Dict], classification: Dict) -> bool:
        """Determine if current results are sufficient to skip additional searches."""
        if not results:
            return False
            
        # For VANA-specific queries, memory results are usually sufficient
        if classification.get("is_vana_specific", False) and len(results) >= 2:
            return True
            
        # For user context queries, any memory results are sufficient
        if classification.get("is_user_context", False) and len(results) >= 1:
            return True
            
        # For general queries, need multiple high-quality results
        high_quality_results = [r for r in results if r.get("relevance", 0) > 0.7]
        return len(high_quality_results) >= 3
    
    def _format_coordinated_results(
        self,
        query: str,
        memory_results: List[Dict],
        vector_results: List[Dict], 
        web_results: List[str],
        classification: Dict,
        start_time: datetime
    ) -> str:
        """Format coordinated search results with source attribution."""
        
        search_duration = (datetime.now() - start_time).total_seconds()
        
        # Combine and rank results
        all_results = []
        
        # Add memory results (highest priority)
        for result in memory_results:
            all_results.append({
                "source": "memory",
                "priority": 1,
                "relevance": result.get("relevance", 0.9),
                "data": result.get("data", {}),
                "type": "stored_knowledge"
            })
            
        # Add vector results (medium priority)
        for result in vector_results:
            all_results.append({
                "source": "vector", 
                "priority": 2,
                "relevance": result.get("relevance", 0.7),
                "data": result.get("data", {}),
                "type": "semantic_similarity"
            })
            
        # Add web results (lowest priority but current)
        for web_result in web_results:
            all_results.append({
                "source": "web",
                "priority": 3,
                "relevance": 0.8,  # Assume web results are relevant
                "data": web_result,
                "type": "current_information"
            })
        
        # Sort by priority then relevance
        all_results.sort(key=lambda x: (x["priority"], -x["relevance"]))
        
        # Format final response
        response = {
            "query": query,
            "search_strategy": {
                "classification": classification,
                "sources_used": list(set([r["source"] for r in all_results])),
                "total_results": len(all_results),
                "search_duration_seconds": round(search_duration, 3)
            },
            "results": all_results,
            "metadata": {
                "memory_available": self.memory_service is not None,
                "vector_available": self.vector_service is not None,
                "search_hierarchy": "memory → vector → web",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        logger.info(f"Coordinated search completed: {len(all_results)} total results from {len(set([r['source'] for r in all_results]))} sources")
        
        return json.dumps(response, indent=2)


# Create ADK tool for VANA agent integration
def create_coordinated_search_tool() -> FunctionTool:
    """Create ADK FunctionTool for coordinated search."""
    
    coordinator = SearchCoordinator()
    
    async def coordinated_search_wrapper(query: str, max_results: int = 5) -> str:
        """Wrapper function for ADK tool integration."""
        return await coordinator.coordinated_search(query, max_results)
    
    # Create synchronous wrapper for backward compatibility
    def sync_coordinated_search(query: str, max_results: int = 5) -> str:
        """Synchronous wrapper for coordinated search."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, we need to use run_coroutine_threadsafe
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run, 
                        coordinator.coordinated_search(query, max_results)
                    )
                    return future.result()
            else:
                return loop.run_until_complete(
                    coordinator.coordinated_search(query, max_results)
                )
        except RuntimeError:
            return asyncio.run(coordinator.coordinated_search(query, max_results))
    
    tool = FunctionTool(func=sync_coordinated_search)
    tool.name = "coordinated_search"
    tool.description = "🔍 Intelligent search with memory-first priority: checks memory → vector → web in order. Use for any information queries to ensure comprehensive results from all available sources."
    tool.parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query - can be about VANA system, user preferences, technical topics, or current information"
            },
            "max_results": {
                "type": "integer", 
                "description": "Maximum number of results to return (default: 5)",
                "default": 5
            }
        },
        "required": ["query"]
    }
    return tool


# Export the main components
__all__ = ["SearchCoordinator", "QueryClassifier", "create_coordinated_search_tool"]