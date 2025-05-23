#!/usr/bin/env python3
"""
Test Enhanced Hybrid Search Optimized for VANA

This script tests the optimized enhanced hybrid search functionality that combines
Vector Search, Knowledge Graph, and Web Search with improved algorithms.
"""

import os
import sys
import logging
import unittest
from typing import Dict, Any, List

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the EnhancedHybridSearchOptimized
from tools.enhanced_hybrid_search_optimized import EnhancedHybridSearchOptimized
from tools.web_search_mock import MockWebSearchClient
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestEnhancedHybridSearchOptimized(unittest.TestCase):
    """Test case for EnhancedHybridSearchOptimized"""
    
    def setUp(self):
        """Set up test environment"""
        # Initialize mock web search client
        self.web_search_client = MockWebSearchClient()
        
        # Initialize vector search client and knowledge graph manager
        self.vector_search_client = VectorSearchClient()
        self.kg_manager = KnowledgeGraphManager()
        
        # Initialize enhanced hybrid search optimized
        self.hybrid_search = EnhancedHybridSearchOptimized(
            vector_search_client=self.vector_search_client,
            kg_manager=self.kg_manager,
            web_search_client=self.web_search_client
        )
        
        # Log initialization status
        logger.info(f"Vector Search available: {self.vector_search_client.is_available()}")
        logger.info(f"Knowledge Graph available: {self.kg_manager.is_available()}")
        logger.info(f"Web Search available: {hasattr(self.web_search_client, 'available') and self.web_search_client.available}")

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

    def test_query_classification(self):
        """Test query classification"""
        logger.info("Testing query classification...")
        
        # Test queries and expected categories
        test_cases = [
            {"query": "What is VANA?", "expected_category": "general"},
            {"query": "How does Vector Search work?", "expected_category": "technology"},
            {"query": "What features does VANA have?", "expected_category": "feature"},
            {"query": "Explain VANA architecture", "expected_category": "architecture"},
            {"query": "How to set up VANA?", "expected_category": "setup"},
            {"query": "How to integrate VANA with other systems?", "expected_category": "integration"},
            {"query": "How to evaluate VANA performance?", "expected_category": "evaluation"},
            {"query": "How to use VANA?", "expected_category": "usage"},
            {"query": "How to secure VANA?", "expected_category": "security"},
            {"query": "How to optimize VANA performance?", "expected_category": "performance"}
        ]
        
        for test_case in test_cases:
            query = test_case["query"]
            expected_category = test_case["expected_category"]
            
            # Get source weights for the query
            source_weights = self.hybrid_search.classify_query(query)
            
            # Find the category with these weights
            category = None
            for cat, weights in self.hybrid_search.category_weights.items():
                if weights == source_weights:
                    category = cat
                    break
            
            logger.info(f"Query: '{query}' - Classified as: {category}")
            
            # Verify classification
            self.assertIsNotNone(category, f"Query '{query}' not classified")
            self.assertEqual(category, expected_category, f"Query '{query}' classified as {category}, expected {expected_category}")
        
        logger.info("Query classification test passed")

    def test_query_preprocessing(self):
        """Test query preprocessing"""
        logger.info("Testing query preprocessing...")
        
        # Test queries and expected preprocessing
        test_cases = [
            {"query": "What is VANA?", "expected_keywords": ["what", "vana", "definition"]},
            {"query": "How to set up VANA?", "expected_keywords": ["how", "set", "up", "vana", "guide"]},
            {"query": "How does Vector Search work?", "expected_keywords": ["how", "does", "vector", "search", "work", "explanation"]}
        ]
        
        for test_case in test_cases:
            query = test_case["query"]
            expected_keywords = test_case["expected_keywords"]
            
            # Preprocess query
            preprocessed = self.hybrid_search.preprocess_query(query)
            
            logger.info(f"Query: '{query}' - Preprocessed: '{preprocessed}'")
            
            # Verify preprocessing
            for keyword in expected_keywords:
                self.assertIn(keyword, preprocessed.split(), f"Keyword '{keyword}' not in preprocessed query '{preprocessed}'")
        
        logger.info("Query preprocessing test passed")

    def test_relevance_calculation(self):
        """Test relevance calculation"""
        logger.info("Testing relevance calculation...")
        
        # Test content and queries
        test_cases = [
            {
                "content": "VANA is a Versatile Agent Network Architecture for building intelligent agents.",
                "query": "What is VANA?",
                "expected_min_score": 0.7
            },
            {
                "content": "Vector Search uses embeddings to find semantically similar content.",
                "query": "How does Vector Search work?",
                "expected_min_score": 0.6
            },
            {
                "content": "Unrelated content about something else entirely.",
                "query": "What is VANA?",
                "expected_max_score": 0.3
            }
        ]
        
        for test_case in test_cases:
            content = test_case["content"]
            query = test_case["query"]
            
            # Create a mock result
            result = {
                "content": content,
                "metadata": {
                    "title": "Test Document",
                    "source": "test"
                }
            }
            
            # Calculate relevance
            relevance = self.hybrid_search.calculate_relevance_optimized(result, query)
            
            logger.info(f"Query: '{query}' - Content: '{content[:30]}...' - Relevance: {relevance:.2f}")
            
            # Verify relevance
            if "expected_min_score" in test_case:
                self.assertGreaterEqual(relevance, test_case["expected_min_score"], 
                                       f"Relevance {relevance} below expected minimum {test_case['expected_min_score']}")
            
            if "expected_max_score" in test_case:
                self.assertLessEqual(relevance, test_case["expected_max_score"], 
                                    f"Relevance {relevance} above expected maximum {test_case['expected_max_score']}")
        
        logger.info("Relevance calculation test passed")

    def test_diversity_enforcement(self):
        """Test diversity enforcement"""
        logger.info("Testing diversity enforcement...")
        
        # Create test results with same source
        results = [
            {"source": "vector_search", "score": 0.9, "content": "Result 1", "final_score": 0.9},
            {"source": "vector_search", "score": 0.8, "content": "Result 2", "final_score": 0.8},
            {"source": "vector_search", "score": 0.7, "content": "Result 3", "final_score": 0.7},
            {"source": "knowledge_graph", "score": 0.6, "content": "Result 4", "final_score": 0.6},
            {"source": "knowledge_graph", "score": 0.5, "content": "Result 5", "final_score": 0.5},
            {"source": "web_search", "score": 0.4, "content": "Result 6", "final_score": 0.4}
        ]
        
        # Apply diversity enforcement
        diverse_results = self.hybrid_search.ensure_diversity(results)
        
        # Count sources in diverse results
        source_counts = {}
        for result in diverse_results:
            source = result["source"]
            source_counts[source] = source_counts.get(source, 0) + 1
        
        logger.info(f"Source distribution in diverse results: {source_counts}")
        
        # Verify diversity
        self.assertGreaterEqual(len(source_counts), 2, "Not enough diversity in results")
        
        # Check for three consecutive results from same source
        for i in range(len(diverse_results) - 2):
            sources = [diverse_results[i]["source"], diverse_results[i+1]["source"], diverse_results[i+2]["source"]]
            self.assertFalse(sources[0] == sources[1] == sources[2], 
                            f"Three consecutive results from same source: {sources}")
        
        logger.info("Diversity enforcement test passed")

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
            self.assertIn("combined", results)
            
            # Format results
            formatted = self.hybrid_search.format_results(results)
            
            # Verify formatting
            self.assertIsNotNone(formatted)
        
        logger.info("Different query types test passed")

def run_tests():
    """Run all tests"""
    logger.info("Running Enhanced Hybrid Search Optimized Tests...")
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestEnhancedHybridSearchOptimized)
    
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
