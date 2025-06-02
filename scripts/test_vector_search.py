#!/usr/bin/env python3
"""
Test Vector Search Implementation

This script tests the Vector Search implementation with fallback to mock.
"""

import argparse
import logging
import os
import sys

from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Test Vector Search Implementation")
    parser.add_argument(
        "query", type=str, nargs="?", default="VANA project", help="Search query"
    )
    parser.add_argument(
        "--top-k", type=int, default=3, help="Number of results to retrieve"
    )
    parser.add_argument(
        "--force-mock", action="store_true", help="Force using mock implementation"
    )
    args = parser.parse_args()

    # Load environment variables
    load_dotenv()

    # Import the Vector Search client
    from tools.vector_search.vector_search_client import VectorSearchClient

    # Create the client
    client = VectorSearchClient()

    # Check if Vector Search is available
    if client.is_available() and not args.force_mock:
        logger.info("Using real Vector Search implementation")
    else:
        if args.force_mock:
            logger.info("Forcing mock implementation")
        else:
            logger.info("Real Vector Search not available, using mock implementation")

    # Test the client
    logger.info(f"Testing Vector Search with query: {args.query}")
    results = client.search(args.query, top_k=args.top_k)

    # Display results
    logger.info(f"Found {len(results)} results:")
    for i, result in enumerate(results, 1):
        logger.info(f"{i}. {result.get('content')}")
        logger.info(f"   Score: {result.get('score')}")
        logger.info(f"   Metadata: {result.get('metadata', {})}")
        logger.info("")

    return 0


if __name__ == "__main__":
    sys.exit(main())
