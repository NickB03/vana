#!/usr/bin/env python3
"""
Test Web Search Tool for VANA

This script tests the web search functionality using Google Custom Search API.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the WebSearchClient
from tools.web_search import WebSearchClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_web_search():
    """Test the web search functionality"""
    # Initialize the web search client
    client = WebSearchClient()
    
    # Check if web search is available
    if not client.is_available():
        logger.error("Web search is not available. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.")
        return False
    
    # Test search
    query = "What is Google's Agent Development Kit (ADK)?"
    logger.info(f"Testing web search with query: {query}")
    
    results = client.search(query, num_results=3)
    
    if not results:
        logger.error("No search results found.")
        return False
    
    # Print results
    logger.info(f"Found {len(results)} results:")
    for i, result in enumerate(results, 1):
        logger.info(f"{i}. {result.get('title')}")
        logger.info(f"   URL: {result.get('url')}")
        logger.info(f"   Snippet: {result.get('snippet')}")
        logger.info("")
    
    # Test formatting
    formatted = client.format_results(results)
    logger.info("Formatted results:")
    logger.info(formatted)
    
    return True

def main():
    """Main function"""
    logger.info("Testing Web Search Tool for VANA")
    
    success = test_web_search()
    
    if success:
        logger.info("Web search test completed successfully!")
        return 0
    else:
        logger.error("Web search test failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
