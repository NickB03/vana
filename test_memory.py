#!/usr/bin/env python3
"""
Test script for Ragie memory integration with Project Vana

This script tests the basic functionality of querying the Ragie knowledge base
with various test queries and displaying the results.

Requires:
    - .env file with RAGIE_API_KEY set
    - Memory files already uploaded to Ragie project
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the project root to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from tools.memory.ragie_client import query_memory, format_memory_results

def test_memory():
    """Test retrieval from Ragie memory with various queries"""
    
    # Check if API key is available
    if not os.environ.get('RAGIE_API_KEY'):
        print("Error: RAGIE_API_KEY environment variable not set")
        print("Create a .env file with your Ragie API key")
        return
    
    test_queries = [
        "What is Project Vana?",
        "How does the agent architecture work?",
        "What is the status of Phase 1?",
        "How do we use Ragie for memory?",
        "What is the role of Ben in the project?"
    ]
    
    for query in test_queries:
        print(f"\n\nTesting query: {query}")
        print("-" * 60)
        
        try:
            results = query_memory(query)
            formatted = format_memory_results(results)
            print(formatted)
        except Exception as e:
            print(f"Error processing query: {e}")

def main():
    print("Vana Memory Test - Ragie Integration")
    print("====================================\n")
    test_memory()

if __name__ == "__main__":
    main()
