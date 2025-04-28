#!/usr/bin/env python3
"""
Comprehensive Test for Enhanced Hybrid Search

This script performs comprehensive testing of the Enhanced Hybrid Search functionality,
including various query types, result merging, and ranking.
"""

import os
import sys
import logging
import unittest
from typing import Dict, Any, List

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the EnhancedHybridSearch and MockWebSearchClient
from tools.enhanced_hybrid_search import EnhancedHybridSearch
from tools.web_search_mock import MockWebSearchClient
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("enhanced_hybrid_search_test.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TestEnhancedHybridSearch(unittest.TestCase):
    """Comprehensive test for Enhanced Hybrid Search"""

    def setUp(self):
        """Set up test environment"""
        # Initialize mock web search client
        self.web_search_client = MockWebSearchClient()
        
        # Initialize vector search client and knowledge graph manager
        self.vector_search_client = VectorSearchClient()
        self.kg_manager = KnowledgeGraphManager()
        
        # Initialize enhanced hybrid search
        self.hybrid_search = EnhancedHybridSearch(
            vector_search_client=self.vector_search_client,
            kg_manager=self.kg_manager,
            web_search_client=self.web_search_client
        )
        
        # Log initialization status
        logger.info(f"Vector Search available: {self.vector_search_client.is_available()}")
        logger.info(f"Knowledge Graph available: {self.kg_manager.is_available()}")
        logger.info(f"Web Search available: {self.web_search_client.is_available()}")

    def test_search_with_all_sources(self):
        """Test search with all sources"""
        logger.info("Testing search with all sources...")
        
        # Perform search
        results = self.hybrid_search.search("VANA", top_k=3, include_web=True)
        
        # Verify results
        self.assertIsNotNone(results)
        self.assertIn("vector_search", results)
        self.assertIn("knowledge_graph", results)
        self.assertIn("web_search", results)
        self.assertIn("combined", results)
        
        # Check if web search results are included
        self.assertGreater(len(results["web_search"]), 0)
        
        # Format results
        formatted = self.hybrid_search.format_results(results)
        
        # Verify formatting
        self.assertIsNotNone(formatted)
        
        logger.info("Search with all sources test passed")

    def test_search_without_web(self):
        """Test search without web search"""
        logger.info("Testing search without web search...")
        
        # Perform search
        results = self.hybrid_search.search("VANA", top_k=3, include_web=False)
        
        # Verify results
        self.assertIsNotNone(results)
        self.assertIn("vector_search", results)
        self.assertIn("knowledge_graph", results)
        self.assertIn("web_search", results)
        self.assertIn("combined", results)
        
        # Check if web search results are not included
        self.assertEqual(len(results["web_search"]), 0)
        
        # Format results
        formatted = self.hybrid_search.format_results(results)
        
        # Verify formatting
        self.assertIsNotNone(formatted)
        
        logger.info("Search without web search test passed")

    def test_web_search_only(self):
        """Test web search only"""
        logger.info("Testing web search only...")
        
        # Perform web search
        results = self.hybrid_search.web_search("VANA", num_results=3)
        
        # Verify results
        self.assertIsNotNone(results)
        self.assertIn("web_search", results)
        
        # Check if web search results are included
        self.assertGreater(len(results["web_search"]), 0)
        
        logger.info("Web search only test passed")

    def test_result_merging(self):
        """Test result merging"""
        logger.info("Testing result merging...")
        
        # Create test results
        vector_results = [
            {
                "content": "VANA is a Versatile Agent Network Architecture.",
                "score": 0.9,
                "metadata": {"source": "vector_search_doc"}
            }
        ]
        
        kg_results = [
            {
                "name": "VANA",
                "type": "project",
                "observation": "VANA is a multi-agent system."
            }
        ]
        
        web_results = [
            {
                "title": "VANA: Versatile Agent Network Architecture",
                "url": "https://example.com/vana",
                "snippet": "VANA is a framework for building intelligent agents.",
                "source": "example.com",
                "date": "2023-05-15"
            }
        ]
        
        # Merge results
        combined = self.hybrid_search._combine_results(
            vector_results=vector_results,
            kg_results=kg_results,
            web_results=web_results,
            top_k=3
        )
        
        # Verify merging
        self.assertIsNotNone(combined)
        self.assertEqual(len(combined), 3)
        
        # Check if all sources are represented
        sources = [result["source"] for result in combined]
        self.assertIn("vector_search", sources)
        self.assertIn("knowledge_graph", sources)
        self.assertIn("web_search", sources)
        
        logger.info("Result merging test passed")

    def test_error_handling(self):
        """Test error handling"""
        logger.info("Testing error handling...")
        
        # Test with empty query
        results = self.hybrid_search.search("", top_k=3, include_web=True)
        
        # Verify error handling
        self.assertIsNotNone(results)
        self.assertIn("error", results)
        self.assertEqual(results["error"], "Empty query provided")
        
        # Format results with error
        formatted = self.hybrid_search.format_results(results)
        
        # Verify error formatting
        self.assertIsNotNone(formatted)
        self.assertIn("Error searching", formatted)
        
        logger.info("Error handling test passed")

    def test_different_query_types(self):
        """Test different query types"""
        logger.info("Testing different query types...")
        
        # Test queries
        queries = [
            "What is VANA?",
            "How does Vector Search work?",
            "Tell me about Knowledge Graph",
            "Explain Hybrid Search",
            "Document processing techniques"
        ]
        
        for query in queries:
            logger.info(f"Testing query: {query}")
            
            # Perform search
            results = self.hybrid_search.search(query, top_k=3, include_web=True)
            
            # Verify results
            self.assertIsNotNone(results)
            self.assertIn("web_search", results)
            self.assertGreater(len(results["web_search"]), 0)
            
            # Format results
            formatted = self.hybrid_search.format_results(results)
            
            # Verify formatting
            self.assertIsNotNone(formatted)
        
        logger.info("Different query types test passed")

def run_tests():
    """Run all tests"""
    logger.info("Running Enhanced Hybrid Search Comprehensive Tests...")
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestEnhancedHybridSearch)
    
    # Run tests
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    
    # Log results
    logger.info(f"Tests run: {result.testsRun}")
    logger.info(f"Errors: {len(result.errors)}")
    logger.info(f"Failures: {len(result.failures)}")
    
    # Return success status
    return len(result.errors) == 0 and len(result.failures) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
