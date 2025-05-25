#!/usr/bin/env python3
"""
Test Mock Vector Search Implementation

This script tests the mock Vector Search implementation.
"""

import os
import sys
import logging
import argparse
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
    parser = argparse.ArgumentParser(description="Test Mock Vector Search Implementation")
    parser.add_argument("query", type=str, nargs="?", default="VANA project", help="Search query")
    parser.add_argument("--top-k", type=int, default=3, help="Number of results to retrieve")
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Import the mock Vector Search client
    from tools.vector_search.vector_search_mock import MockVectorSearchClient
    
    # Create the mock client
    client = MockVectorSearchClient()
    
    # Test the mock client
    logger.info(f"Testing mock Vector Search client with query: {args.query}")
    results = client.search(args.query, top_k=args.top_k)
    
    # Display results
    logger.info(f"Found {len(results)} results:")
    for i, result in enumerate(results, 1):
        logger.info(f"{i}. {result.get('content')}")
        logger.info(f"   Score: {result.get('score')}")
        logger.info(f"   Source: {result.get('metadata', {}).get('source', 'Unknown')}")
        logger.info(f"   Type: {result.get('metadata', {}).get('type', 'Unknown')}")
        logger.info("")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
