"""
Test script for Hybrid Search

This script tests the hybrid search approach that combines Vector Search and Knowledge Graph.
"""

import os
import sys
import time
from dotenv import load_dotenv
from tools.hybrid_search import HybridSearch
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Load environment variables
load_dotenv()

def test_hybrid_search():
    """Test hybrid search"""
    print("Testing Hybrid Search...")
    
    # Initialize clients
    vector_search_client = VectorSearchClient()
    kg_manager = KnowledgeGraphManager()
    hybrid_search = HybridSearch()
    
    # Check availability
    vector_search_available = vector_search_client.is_available()
    kg_available = kg_manager.is_available()
    
    print(f"Vector Search available: {vector_search_available}")
    print(f"Knowledge Graph available: {kg_available}")
    
    if not vector_search_available and not kg_available:
        print("Error: Neither Vector Search nor Knowledge Graph is available")
        return False
    
    # Prepare test data
    print("\nPreparing test data...")
    
    # Add test data to Vector Search if available
    if vector_search_available:
        test_content = "VANA uses Vertex AI Vector Search for memory management and semantic search."
        test_metadata = {
            "source": "test_hybrid_search.py",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "tags": "test,hybrid_search,vector_search"
        }
        
        vector_search_client.upload_embedding(test_content, test_metadata)
        print("Added test data to Vector Search")
    
    # Add test data to Knowledge Graph if available
    if kg_available:
        test_entity_name = "VANA"
        test_entity_type = "project"
        test_observation = "VANA is a multi-agent system using Google's ADK and Knowledge Graph for structured knowledge representation."
        
        kg_manager.store(test_entity_name, test_entity_type, test_observation)
        print("Added test data to Knowledge Graph")
    
    # Wait for data to be indexed
    print("Waiting for data to be indexed...")
    time.sleep(5)
    
    # Test hybrid search
    print("\nTesting hybrid search...")
    test_query = "VANA memory system"
    
    results = hybrid_search.search(test_query, top_k=5)
    
    # Check for errors
    if results.get("error"):
        print(f"Error in hybrid search: {results['error']}")
        return False
    
    # Check Vector Search results
    vector_results = results.get("vector_search", [])
    print(f"\nVector Search results: {len(vector_results)}")
    
    for i, result in enumerate(vector_results[:3], 1):
        content = result.get("content", "")
        score = result.get("score", 0)
        
        # Truncate long content
        if len(content) > 100:
            content = content[:97] + "..."
        
        print(f"{i}. (Score: {score:.4f}) {content}")
    
    # Check Knowledge Graph results
    kg_results = results.get("knowledge_graph", [])
    print(f"\nKnowledge Graph results: {len(kg_results)}")
    
    for i, result in enumerate(kg_results[:3], 1):
        name = result.get("name", "")
        entity_type = result.get("type", "")
        observation = result.get("observation", "")
        
        # Truncate long observation
        if len(observation) > 100:
            observation = observation[:97] + "..."
        
        print(f"{i}. {name} ({entity_type})")
        print(f"   {observation}")
    
    # Check combined results
    combined_results = results.get("combined", [])
    print(f"\nCombined results: {len(combined_results)}")
    
    for i, result in enumerate(combined_results[:5], 1):
        content = result.get("content", "")
        score = result.get("score", 0)
        source = result.get("source", "")
        
        # Truncate long content
        if len(content) > 100:
            content = content[:97] + "..."
        
        print(f"{i}. [{source.upper()}] (Score: {score:.4f}) {content}")
    
    # Test formatted results
    print("\nTesting formatted results...")
    formatted = hybrid_search.format_results(results)
    print(formatted)
    
    # Test search_and_format
    print("\nTesting search_and_format...")
    formatted_direct = hybrid_search.search_and_format(test_query, top_k=5)
    print(formatted_direct)
    
    print("\nAll Hybrid Search tests completed successfully!")
    return True

if __name__ == "__main__":
    success = test_hybrid_search()
    sys.exit(0 if success else 1)
