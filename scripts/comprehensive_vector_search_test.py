#!/usr/bin/env python3
"""
Comprehensive Vector Search Test

This script tests Vector Search functionality with multiple queries
covering different aspects of the project.
"""

import json
import logging
import sys
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Import the direct test script
sys.path.append("scripts")
from test_vector_search_direct import search_knowledge


def run_test_query(query, description):
    """Run a test query and log the results."""
    logger.info(f"Testing query: '{query}' ({description})")

    # Search the knowledge base
    results = search_knowledge(query)

    # Check if results were found
    if "No results found" in results:
        logger.warning(f"❌ No results found for query: '{query}'")
        return False

    # Log successful results
    logger.info(f"✅ Results found for query: '{query}'")
    logger.debug(results)

    # Extract and return the first result's metadata
    return True


def main():
    """Run comprehensive Vector Search tests."""
    # Define test queries covering different aspects
    test_queries = [
        # Architecture queries
        {"query": "What is the architecture of VANA?", "description": "Basic architecture query"},
        {"query": "How are agents organized in VANA?", "description": "Agent hierarchy query"},
        {"query": "How does Vector Search integration work?", "description": "Vector Search architecture query"},
        # Technical queries
        {"query": "How to generate embeddings?", "description": "Technical embedding query"},
        {"query": "How to update the Vector Search index?", "description": "Index update query"},
        {"query": "What GitHub Actions workflows exist?", "description": "GitHub Actions query"},
        # Agent queries
        {"query": "What tools are available to agents?", "description": "Agent tools query"},
        {"query": "How do agents use the knowledge base?", "description": "Knowledge usage query"},
        # Documentation queries
        {"query": "Troubleshooting Vector Search", "description": "Troubleshooting query"},
        {"query": "Project status and next steps", "description": "Project status query"},
    ]

    # Run all test queries
    results = {}
    for test in test_queries:
        success = run_test_query(test["query"], test["description"])
        results[test["query"]] = success

    # Summarize results
    success_count = sum(1 for success in results.values() if success)
    total_count = len(results)
    success_rate = success_count / total_count * 100

    logger.info(f"\nSummary: {success_count}/{total_count} queries successful ({success_rate:.1f}%)")

    if success_rate < 50:
        logger.error("❌ Vector Search testing failed: Too many queries returned no results")
        return 1
    elif success_rate < 80:
        logger.warning("⚠️ Vector Search testing partial success: Some queries failed")
        return 0
    else:
        logger.info("✅ Vector Search testing successful")
        return 0


if __name__ == "__main__":
    sys.exit(main())
