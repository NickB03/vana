#!/usr/bin/env python3
"""
Test Mock Web Search Tool for VANA

This script tests the mock web search functionality.
"""

import logging
import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the MockWebSearchClient
from tools.web_search_mock import MockWebSearchClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_mock_web_search():
    """Test the mock web search functionality"""
    # Initialize the mock web search client
    client = MockWebSearchClient()

    # Test predefined queries
    predefined_queries = [
        "What is VANA?",
        "How does Vector Search work?",
        "Tell me about Knowledge Graph",
        "Explain Hybrid Search",
        "Document processing techniques",
        "Google's Agent Development Kit",
    ]

    for query in predefined_queries:
        logger.info(f"Testing mock search with query: {query}")

        results = client.search(query, num_results=2)

        if not results:
            logger.error(f"No results found for query: {query}")
            continue

        # Print results
        logger.info(f"Found {len(results)} results:")
        for i, result in enumerate(results, 1):
            logger.info(f"{i}. {result.get('title')}")
            logger.info(f"   URL: {result.get('url')}")
            logger.info(f"   Snippet: {result.get('snippet')}")
            logger.info("")

    # Test non-predefined query
    random_query = "Something completely unrelated"
    logger.info(f"Testing mock search with random query: {random_query}")

    results = client.search(random_query)

    if not results:
        logger.error("No results found for random query")
    else:
        logger.info(f"Found {len(results)} results for random query:")
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
    logger.info("Testing Mock Web Search Tool for VANA")

    success = test_mock_web_search()

    if success:
        logger.info("Mock web search test completed successfully!")
        return 0
    else:
        logger.error("Mock web search test failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
