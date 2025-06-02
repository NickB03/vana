#!/usr/bin/env python3
"""
Test Enhanced Hybrid Search for VANA

This script tests the enhanced hybrid search functionality with web search.

Usage:
    python scripts/test_enhanced_hybrid_search.py "Your search query"
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
    parser = argparse.ArgumentParser(description="Test Enhanced Hybrid Search for VANA")
    parser.add_argument("query", type=str, help="Search query")
    parser.add_argument(
        "--top-k", type=int, default=5, help="Number of results to retrieve"
    )
    parser.add_argument(
        "--include-web",
        action="store_true",
        default=True,
        help="Include web search results",
    )
    parser.add_argument(
        "--use-mock", action="store_true", help="Use mock implementations for testing"
    )
    args = parser.parse_args()

    # Load environment variables
    load_dotenv()

    # Initialize enhanced hybrid search
    try:
        from tools.enhanced_hybrid_search import EnhancedHybridSearch

        # Initialize with mock or real implementations
        if args.use_mock:
            from tools.knowledge_graph.knowledge_graph_mock import (
                MockKnowledgeGraphManager,
            )
            from tools.vector_search.vector_search_mock import MockVectorSearchClient
            from tools.web_search_mock import MockWebSearchClient

            vector_search_client = MockVectorSearchClient()
            kg_manager = MockKnowledgeGraphManager()
            web_search_client = MockWebSearchClient()

            logger.info("Using mock implementations")
        else:
            from tools.knowledge_graph.knowledge_graph_manager import (
                KnowledgeGraphManager,
            )
            from tools.vector_search.vector_search_client import VectorSearchClient
            from tools.web_search import WebSearchClient

            vector_search_client = VectorSearchClient()
            kg_manager = KnowledgeGraphManager()
            web_search_client = WebSearchClient()

            logger.info("Using real implementations")

        # Initialize enhanced hybrid search
        hybrid_search = EnhancedHybridSearch(
            vector_search_client=vector_search_client,
            kg_manager=kg_manager,
            web_search_client=web_search_client,
        )
    except ImportError as e:
        logger.error(f"Error importing required modules: {e}")
        return 1

    # Perform search
    logger.info(f"Performing enhanced hybrid search for: {args.query}")
    results = hybrid_search.search(
        args.query, top_k=args.top_k, include_web=args.include_web
    )

    # Check for errors
    if results.get("error"):
        logger.error(f"Error in enhanced hybrid search: {results['error']}")
        return 1

    # Display results
    logger.info(f"Vector Search: {len(results.get('vector_search', []))} results")
    logger.info(f"Knowledge Graph: {len(results.get('knowledge_graph', []))} results")
    logger.info(f"Web Search: {len(results.get('web_search', []))} results")
    logger.info(f"Combined: {len(results.get('combined', []))} results")

    # Format results
    formatted = hybrid_search.format_results(results)
    logger.info("Formatted results:")
    logger.info(formatted)

    return 0


if __name__ == "__main__":
    sys.exit(main())
