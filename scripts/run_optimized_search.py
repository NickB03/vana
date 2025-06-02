#!/usr/bin/env python3
"""
Run Optimized Search Script for VANA

This script runs the optimized hybrid search implementation with optional web integration.
It can be used to test and compare the different search implementations.

Usage:
    python scripts/run_optimized_search.py --query "What is VANA architecture?" --include-web
    python scripts/run_optimized_search.py --query "How does hybrid search work?" --no-web
    python scripts/run_optimized_search.py --query "What are the latest ADK features?" --include-web --count 10
"""

import argparse
import json
import os
import sys
import time
from typing import Any

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Import search implementations
try:
    from tools.enhanced_hybrid_search_optimized import EnhancedHybridSearchOptimized
    from tools.web_search_client import get_web_search_client
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print("Make sure you run this script from the project root or scripts directory.")
    sys.exit(1)


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Run VANA optimized search with optional web integration"
    )
    parser.add_argument("--query", "-q", type=str, required=True, help="Search query")
    parser.add_argument(
        "--include-web", action="store_true", help="Include web search results"
    )
    parser.add_argument(
        "--no-web", action="store_true", help="Exclude web search results"
    )
    parser.add_argument(
        "--count", "-c", type=int, default=5, help="Number of results to return"
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock web search client instead of real API",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Print verbose output"
    )
    parser.add_argument(
        "--compare", action="store_true", help="Compare with basic hybrid search"
    )
    return parser.parse_args()


def format_results(
    results: list[dict[str, Any]], include_metadata: bool = False
) -> str:
    """Format search results for display."""
    formatted = ""
    for i, result in enumerate(results):
        formatted += f"{i+1}. {result['title']}\n"
        formatted += f"   Source: {result['source']}\n"
        if "link" in result:
            formatted += f"   URL: {result['link']}\n"
        if "snippet" in result:
            formatted += f"   Snippet: {result['snippet']}\n"
        if include_metadata and "metadata" in result:
            formatted += f"   Metadata: {json.dumps(result['metadata'], indent=2)}\n"
        formatted += "\n"
    return formatted


def run_optimized_search(
    query: str,
    include_web: bool = False,
    result_count: int = 5,
    use_mock: bool = False,
    verbose: bool = False,
):
    """Run optimized hybrid search with optional web integration."""
    print(f"Running optimized search for query: '{query}'")
    print(f"Include web results: {include_web}")
    print(f"Number of results: {result_count}")
    print(f"Using mock web client: {use_mock}")
    print("-" * 50)

    # Get web search client if needed
    web_client = None
    if include_web:
        web_client = get_web_search_client(use_mock=use_mock)
        print(f"Using {'mock' if use_mock else 'real'} web search client")

    # Create optimized hybrid search instance
    search = EnhancedHybridSearchOptimized(web_search_client=web_client)

    # Measure search time
    start_time = time.time()
    results = search.search(query, top_k=result_count, include_web=include_web)
    end_time = time.time()

    # Print results
    print(
        f"\nFound {len(results['combined'])} results in {end_time - start_time:.2f} seconds:\n"
    )
    print(format_results(results["combined"], include_metadata=verbose))

    # Print source distribution if verbose
    if verbose:
        sources = {}
        for result in results["combined"]:
            source = result["source"]
            sources[source] = sources.get(source, 0) + 1
        print("Source distribution:")
        for source, count in sources.items():
            print(
                f"  {source}: {count} results ({count/len(results['combined'])*100:.1f}%)"
            )


def main():
    """Main function."""
    args = parse_arguments()

    # Resolve include_web flag
    include_web = args.include_web or not args.no_web

    # Run optimized search
    run_optimized_search(
        query=args.query,
        include_web=include_web,
        result_count=args.count,
        use_mock=args.mock,
        verbose=args.verbose,
    )

    # Implement comparison with basic hybrid search if needed
    if args.compare:
        print("\nComparison with basic hybrid search not yet implemented.")
        print("This will be added in a future update.")


if __name__ == "__main__":
    main()
