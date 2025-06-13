#!/usr/bin/env python3
"""
Test script for Hybrid Search

This script tests the hybrid search approach that combines Vector Search and Knowledge Graph.
It includes specific test cases for:
1. Vector Search with no Knowledge Graph results
2. Knowledge Graph with no Vector Search results
3. Combined results with scoring
4. Fallback mechanisms when one system fails

Usage:
    python scripts/test_hybrid_search.py

The script will run a series of tests and report the results.
"""

import os
import sys
import time
import unittest
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv
from tools.hybrid_search import HybridSearch
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Load environment variables
load_dotenv()

class TestHybridSearch(unittest.TestCase):
    """Test cases for Hybrid Search"""
    
    def setUp(self):
        """Set up test environment"""
        self.vector_search_client = VectorSearchClient()
        self.kg_manager = KnowledgeGraphManager()
        self.hybrid_search = HybridSearch()
        
        # Check availability
        self.vector_search_available = self.vector_search_client.is_available()
        self.kg_available = self.kg_manager.is_available()
        
        print(f"Vector Search available: {self.vector_search_available}")
        print(f"Knowledge Graph available: {self.kg_available}")
        
        # Prepare test data if services are available
        if self.vector_search_available or self.kg_available:
            self._prepare_test_data()
    
    def _prepare_test_data(self):
        """Prepare test data for Vector Search and Knowledge Graph"""
        print("\nPreparing test data...")
        
        # Add test data to Vector Search if available
        if self.vector_search_available:
            # Vector Search only data
            vs_only_content = "VANA uses Vertex AI Vector Search for memory management and semantic search capabilities."
            vs_only_metadata = {
                "source": "vector_search_docs.md",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "tags": "vector_search,memory,semantic"
            }
            self.vector_search_client.upload_embedding(vs_only_content, vs_only_metadata)
            
            # Common data
            common_content = "VANA is a multi-agent system built using Google's Agent Development Kit (ADK)."
            common_metadata = {
                "source": "vana_overview.md",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "tags": "vana,adk,multi-agent"
            }
            self.vector_search_client.upload_embedding(common_content, common_metadata)
            
            print("Added test data to Vector Search")
        
        # Add test data to Knowledge Graph if available
        if self.kg_available:
            # Knowledge Graph only data
            self.kg_manager.store(
                "Knowledge Graph",
                "technology",
                "Knowledge Graph provides structured knowledge representation with entities and relationships."
            )
            
            # Common data
            self.kg_manager.store(
                "VANA",
                "project",
                "VANA is a multi-agent system built using Google's Agent Development Kit (ADK)."
            )
            
            # Add relationships
            self.kg_manager.store_relationship("VANA", "uses", "Knowledge Graph")
            self.kg_manager.store_relationship("VANA", "uses", "Vector Search")
            
            print("Added test data to Knowledge Graph")
        
        # Wait for data to be indexed
        print("Waiting for data to be indexed...")
        time.sleep(5)
    
    def test_vector_search_only(self):
        """Test Vector Search with no Knowledge Graph results"""
        print("\n=== Testing Vector Search Only ===")
        
        if not self.vector_search_available:
            print("Vector Search is not available, skipping test")
            return
        
        # Mock Knowledge Graph to return empty results
        with patch.object(self.hybrid_search, 'kg_manager') as mock_kg:
            mock_kg.is_available.return_value = False
            
            # Run search
            query = "Vertex AI Vector Search capabilities"
            results = self.hybrid_search.search(query, top_k=5)
            
            # Verify results
            self.assertIsNone(results.get("error"), "Search returned an error")
            self.assertTrue(len(results.get("vector_search", [])) > 0, "No Vector Search results found")
            self.assertEqual(len(results.get("knowledge_graph", [])), 0, "Knowledge Graph results found when it should be empty")
            self.assertTrue(len(results.get("combined", [])) > 0, "No combined results found")
            
            # Verify all combined results are from Vector Search
            for result in results.get("combined", []):
                self.assertEqual(result.get("source"), "vector_search", "Combined result not from Vector Search")
            
            print("Vector Search Only Test: PASSED")
            
            # Display results
            self._print_results(results)
    
    def test_knowledge_graph_only(self):
        """Test Knowledge Graph with no Vector Search results"""
        print("\n=== Testing Knowledge Graph Only ===")
        
        if not self.kg_available:
            print("Knowledge Graph is not available, skipping test")
            return
        
        # Mock Vector Search to return empty results
        with patch.object(self.hybrid_search, 'vector_search_client') as mock_vs:
            mock_vs.is_available.return_value = False
            
            # Run search
            query = "Knowledge Graph structured representation"
            results = self.hybrid_search.search(query, top_k=5)
            
            # Verify results
            self.assertIsNone(results.get("error"), "Search returned an error")
            self.assertEqual(len(results.get("vector_search", [])), 0, "Vector Search results found when it should be empty")
            self.assertTrue(len(results.get("knowledge_graph", [])) > 0, "No Knowledge Graph results found")
            self.assertTrue(len(results.get("combined", [])) > 0, "No combined results found")
            
            # Verify all combined results are from Knowledge Graph
            for result in results.get("combined", []):
                self.assertEqual(result.get("source"), "knowledge_graph", "Combined result not from Knowledge Graph")
            
            print("Knowledge Graph Only Test: PASSED")
            
            # Display results
            self._print_results(results)
    
    def test_combined_results(self):
        """Test combined results with scoring"""
        print("\n=== Testing Combined Results ===")
        
        if not self.vector_search_available or not self.kg_available:
            print("Either Vector Search or Knowledge Graph is not available, skipping test")
            return
        
        # Run search
        query = "VANA multi-agent system"
        results = self.hybrid_search.search(query, top_k=5)
        
        # Verify results
        self.assertIsNone(results.get("error"), "Search returned an error")
        self.assertTrue(len(results.get("vector_search", [])) > 0, "No Vector Search results found")
        self.assertTrue(len(results.get("knowledge_graph", [])) > 0, "No Knowledge Graph results found")
        self.assertTrue(len(results.get("combined", [])) > 0, "No combined results found")
        
        # Verify combined results contain both sources
        sources = set(result.get("source") for result in results.get("combined", []))
        self.assertTrue("vector_search" in sources, "No Vector Search results in combined results")
        self.assertTrue("knowledge_graph" in sources, "No Knowledge Graph results in combined results")
        
        # Verify results are sorted by score
        scores = [result.get("score", 0) for result in results.get("combined", [])]
        self.assertEqual(scores, sorted(scores, reverse=True), "Combined results not sorted by score")
        
        print("Combined Results Test: PASSED")
        
        # Display results
        self._print_results(results)
    
    def test_vector_search_fallback(self):
        """Test fallback to Vector Search when Knowledge Graph fails"""
        print("\n=== Testing Vector Search Fallback ===")
        
        if not self.vector_search_available:
            print("Vector Search is not available, skipping test")
            return
        
        # Mock Knowledge Graph to raise an exception
        with patch.object(self.hybrid_search.kg_manager, 'query') as mock_query:
            mock_query.side_effect = Exception("Simulated Knowledge Graph failure")
            
            # Run search
            query = "VANA system"
            results = self.hybrid_search.search(query, top_k=5)
            
            # Verify results
            self.assertIsNone(results.get("error"), "Search returned an error")
            self.assertTrue(len(results.get("vector_search", [])) > 0, "No Vector Search results found")
            self.assertEqual(len(results.get("knowledge_graph", [])), 0, "Knowledge Graph results found when it should have failed")
            self.assertTrue(len(results.get("combined", [])) > 0, "No combined results found")
            
            print("Vector Search Fallback Test: PASSED")
            
            # Display results
            self._print_results(results)
    
    def test_knowledge_graph_fallback(self):
        """Test fallback to Knowledge Graph when Vector Search fails"""
        print("\n=== Testing Knowledge Graph Fallback ===")
        
        if not self.kg_available:
            print("Knowledge Graph is not available, skipping test")
            return
        
        # Mock Vector Search to raise an exception
        with patch.object(self.hybrid_search.vector_search_client, 'search') as mock_search:
            mock_search.side_effect = Exception("Simulated Vector Search failure")
            
            # Run search
            query = "VANA system"
            results = self.hybrid_search.search(query, top_k=5)
            
            # Verify results
            self.assertIsNone(results.get("error"), "Search returned an error")
            self.assertEqual(len(results.get("vector_search", [])), 0, "Vector Search results found when it should have failed")
            self.assertTrue(len(results.get("knowledge_graph", [])) > 0, "No Knowledge Graph results found")
            self.assertTrue(len(results.get("combined", [])) > 0, "No combined results found")
            
            print("Knowledge Graph Fallback Test: PASSED")
            
            # Display results
            self._print_results(results)
    
    def test_complete_failure(self):
        """Test handling of complete failure when both systems fail"""
        print("\n=== Testing Complete Failure Handling ===")
        
        # Mock both systems to fail
        with patch.object(self.hybrid_search.vector_search_client, 'search') as mock_vs_search:
            with patch.object(self.hybrid_search.kg_manager, 'query') as mock_kg_query:
                mock_vs_search.side_effect = Exception("Simulated Vector Search failure")
                mock_kg_query.side_effect = Exception("Simulated Knowledge Graph failure")
                
                # Run search
                query = "VANA system"
                results = self.hybrid_search.search(query, top_k=5)
                
                # Verify results
                self.assertIsNone(results.get("error"), "Search returned an error")
                self.assertEqual(len(results.get("vector_search", [])), 0, "Vector Search results found when it should have failed")
                self.assertEqual(len(results.get("knowledge_graph", [])), 0, "Knowledge Graph results found when it should have failed")
                self.assertEqual(len(results.get("combined", [])), 0, "Combined results found when both systems failed")
                
                print("Complete Failure Handling Test: PASSED")
    
    def _print_results(self, results):
        """Print search results in a readable format"""
        # Print Vector Search results
        vector_results = results.get("vector_search", [])
        print(f"\nVector Search results: {len(vector_results)}")
        
        for i, result in enumerate(vector_results[:2], 1):
            content = result.get("content", "")
            score = result.get("score", 0)
            
            # Truncate long content
            if len(content) > 100:
                content = content[:97] + "..."
            
            print(f"{i}. (Score: {score:.4f}) {content}")
        
        # Print Knowledge Graph results
        kg_results = results.get("knowledge_graph", [])
        print(f"\nKnowledge Graph results: {len(kg_results)}")
        
        for i, result in enumerate(kg_results[:2], 1):
            name = result.get("name", "")
            entity_type = result.get("type", "")
            observation = result.get("observation", "")
            
            # Truncate long observation
            if len(observation) > 100:
                observation = observation[:97] + "..."
            
            print(f"{i}. {name} ({entity_type})")
            print(f"   {observation}")
        
        # Print combined results
        combined_results = results.get("combined", [])
        print(f"\nCombined results: {len(combined_results)}")
        
        for i, result in enumerate(combined_results[:3], 1):
            content = result.get("content", "")
            score = result.get("score", 0)
            source = result.get("source", "")
            
            # Truncate long content
            if len(content) > 100:
                content = content[:97] + "..."
            
            print(f"{i}. [{source.upper()}] (Score: {score:.4f}) {content}")

def run_tests():
    """Run all hybrid search tests"""
    print("=== Running Hybrid Search Tests ===\n")
    
    # Create test suite
    suite = unittest.TestSuite()
    suite.addTest(TestHybridSearch("test_vector_search_only"))
    suite.addTest(TestHybridSearch("test_knowledge_graph_only"))
    suite.addTest(TestHybridSearch("test_combined_results"))
    suite.addTest(TestHybridSearch("test_vector_search_fallback"))
    suite.addTest(TestHybridSearch("test_knowledge_graph_fallback"))
    suite.addTest(TestHybridSearch("test_complete_failure"))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return success status
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
