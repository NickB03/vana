#!/usr/bin/env python3
"""
Test Web Search Functionality for VANA

This script tests the web search functionality using the WebSearchClient.

Usage:
    python scripts/test_web_search.py "Your search query"
"""

import os
import sys
import argparse
import logging
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Test Web Search Functionality for VANA")
    parser.add_argument("query", type=str, help="Search query")
    parser.add_argument("--num-results", type=int, default=5, help="Number of results to retrieve")
    parser.add_argument("--use-mock", action="store_true", help="Use mock implementation for testing")
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Initialize web search client
    if args.use_mock:
        try:
            from tests.mocks.web_search_mock import MockWebSearchClient
            web_search = MockWebSearchClient()
            logger.info("Using mock implementation")
        except ImportError:
            logger.error("Error importing MockWebSearchClient. Make sure tools/web_search_mock.py exists.")
            return 1
    else:
        try:
            from tools.web_search import WebSearchClient
            web_search = WebSearchClient()
            logger.info("Using real implementation")
        except ImportError:
            logger.error("Error importing WebSearchClient. Make sure tools/web_search.py exists.")
            return 1
    
    # Check if web search is available
    if hasattr(web_search, 'is_available') and callable(web_search.is_available) and not web_search.is_available() and not args.use_mock:
        logger.error("Web search is not available. Please check your API credentials.")
        logger.error("Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.")
        logger.error("Use --use-mock to test with mock implementation.")
        return 1
    
    # Perform search
    logger.info(f"Searching for: {args.query}")
    
    try:
        results = web_search.search(args.query, num_results=args.num_results)
    except Exception as e:
        logger.error(f"Error performing search: {e}")
        return 1
    
    # Display results
    if not results:
        logger.warning("No results found.")
        return 1
    
    logger.info(f"Found {len(results)} results:")
    for i, result in enumerate(results, 1):
        logger.info(f"{i}. {result.get('title', 'No title')}")
        logger.info(f"   URL: {result.get('url', result.get('link', 'No URL'))}")
        logger.info(f"   Snippet: {result.get('snippet', 'No snippet')}")
        logger.info("")
    
    # Format results if the method exists
    if hasattr(web_search, 'format_results') and callable(web_search.format_results):
        formatted = web_search.format_results(results)
        logger.info("Formatted results:")
        logger.info(formatted)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
