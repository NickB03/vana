#!/usr/bin/env python3
"""
Test Enhanced Hybrid Search for VANA

This script tests the enhanced hybrid search functionality that combines
Vector Search, Knowledge Graph, and Web Search.
"""

import os
import sys
import logging
from typing import Dict, Any

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the EnhancedHybridSearch
from tools.enhanced_hybrid_search import EnhancedHybridSearch
from tools.web_search_mock import MockWebSearchClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_enhanced_hybrid_search():
    """Test the enhanced hybrid search functionality"""
    # Initialize the enhanced hybrid search with mock web search
    web_search_client = MockWebSearchClient()
    hybrid_search = EnhancedHybridSearch(web_search_client=web_search_client)
    
    # Test queries
    test_queries = [
        "What is VANA?",
        "How does Vector Search work?",
        "Tell me about Knowledge Graph",
        "Explain Hybrid Search",
        "Document processing techniques",
        "Google's Agent Development Kit"
    ]
    
    for query in test_queries:
        logger.info(f"Testing enhanced hybrid search with query: {query}")
        
        # Test with all sources
        results = hybrid_search.search(query, top_k=3)
        
        if results.get("error"):
            logger.error(f"Error in enhanced hybrid search: {results['error']}")
            continue
        
        # Print results
        logger.info(f"Vector Search: {len(results['vector_search'])} results")
        logger.info(f"Knowledge Graph: {len(results['knowledge_graph'])} results")
        logger.info(f"Web Search: {len(results['web_search'])} results")
        logger.info(f"Combined: {len(results['combined'])} results")
        
        # Format results
        formatted = hybrid_search.format_results(results)
        logger.info(f"Formatted results:\n{formatted}")
        
        # Test with web search only
        web_results = hybrid_search.web_search(query)
        logger.info(f"Web Search only: {len(web_results.get('web_search', []))} results")
        
        # Test without web search
        no_web_results = hybrid_search.search(query, include_web=False)
        logger.info(f"Without Web Search: {len(no_web_results.get('combined', []))} combined results")
    
    return True

def main():
    """Main function"""
    logger.info("Testing Enhanced Hybrid Search for VANA")
    
    success = test_enhanced_hybrid_search()
    
    if success:
        logger.info("Enhanced hybrid search test completed successfully!")
        return 0
    else:
        logger.error("Enhanced hybrid search test failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
