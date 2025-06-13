#!/usr/bin/env python3
"""
RAG Health Monitoring Script

This script monitors the health of the RAG system by:
1. Checking Vector Search connectivity
2. Verifying embedding generation
3. Running test queries and validating results
4. Logging metrics for monitoring

Run this script regularly to ensure the RAG system is working properly.
"""

import datetime
import json
import logging
import os
import sys
import time
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("rag_health.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Add scripts directory to path
sys.path.append("scripts")
from test_vector_search_direct import generate_embedding, get_vector_search_endpoint, search_knowledge

# Known-good test queries with expected patterns in results
TEST_QUERIES = [
    {"query": "What is Vector Search?", "expected_patterns": ["index", "embedding", "search"]},
    {"query": "How are agents organized in VANA?", "expected_patterns": ["agent", "hierarchy", "team"]},
    {"query": "What tools are available?", "expected_patterns": ["tool", "search", "knowledge"]},
]


def check_embedding_generation():
    """Check if embedding generation is working."""
    logger.info("Checking embedding generation...")
    start_time = time.time()

    try:
        embedding = generate_embedding("Test query for embedding generation")
        duration = time.time() - start_time

        if embedding and len(embedding) > 0:
            logger.info(f"✅ Embedding generation is working (dimensions: {len(embedding)}, time: {duration:.2f}s)")
            return True
        else:
            logger.error("❌ Embedding generation returned empty result")
            return False
    except Exception as e:
        logger.error(f"❌ Embedding generation failed: {str(e)}")
        return False


def check_vector_search_connectivity():
    """Check if Vector Search endpoint is accessible."""
    logger.info("Checking Vector Search connectivity...")

    try:
        endpoint, deployed_index_id = get_vector_search_endpoint()

        if endpoint and deployed_index_id:
            logger.info(f"✅ Vector Search endpoint is accessible (deployed_index_id: {deployed_index_id})")
            return True
        else:
            logger.error("❌ Vector Search endpoint not found")
            return False
    except Exception as e:
        logger.error(f"❌ Vector Search connectivity failed: {str(e)}")
        return False


def run_test_queries():
    """Run test queries and check results."""
    logger.info("Running test queries...")

    results = []
    for test in TEST_QUERIES:
        query = test["query"]
        expected_patterns = test["expected_patterns"]

        logger.info(f"Testing query: '{query}'")
        start_time = time.time()

        try:
            search_result = search_knowledge(query)
            duration = time.time() - start_time

            # Check if result contains expected patterns
            pattern_matches = [pattern for pattern in expected_patterns if pattern.lower() in search_result.lower()]

            success = len(pattern_matches) / len(expected_patterns) if expected_patterns else 0

            results.append(
                {
                    "query": query,
                    "success": success >= 0.5,  # At least 50% of patterns should match
                    "pattern_match_ratio": success,
                    "duration": duration,
                    "contains_results": "No results found" not in search_result,
                }
            )

            if success >= 0.5:
                logger.info(f"✅ Query test passed: '{query}' (match ratio: {success:.2f}, time: {duration:.2f}s)")
            else:
                logger.warning(
                    f"⚠️ Query test partially failed: '{query}' (match ratio: {success:.2f}, time: {duration:.2f}s)"
                )
        except Exception as e:
            logger.error(f"❌ Query test failed: '{query}' - {str(e)}")
            results.append({"query": query, "success": False, "error": str(e)})

    # Calculate overall success rate
    success_count = sum(1 for r in results if r.get("success", False))
    success_rate = success_count / len(results) if results else 0

    logger.info(f"Query tests: {success_count}/{len(results)} successful ({success_rate:.1f}%)")

    return results, success_rate >= 0.7  # At least 70% of queries should succeed


def save_metrics(metrics):
    """Save metrics to a JSON file."""
    metrics_dir = Path("metrics")
    metrics_dir.mkdir(exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    metrics_file = metrics_dir / f"rag_health_{timestamp}.json"

    with open(metrics_file, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"Metrics saved to {metrics_file}")


def main():
    """Main function."""
    logger.info("Starting RAG health check")

    metrics = {
        "timestamp": datetime.datetime.now().isoformat(),
        "embedding_generation": {"success": False},
        "vector_search_connectivity": {"success": False},
        "test_queries": {"success": False, "results": []},
    }

    # Check embedding generation
    embedding_success = check_embedding_generation()
    metrics["embedding_generation"]["success"] = embedding_success

    # Check Vector Search connectivity
    connectivity_success = check_vector_search_connectivity()
    metrics["vector_search_connectivity"]["success"] = connectivity_success

    # Run test queries if previous checks passed
    if embedding_success and connectivity_success:
        query_results, query_success = run_test_queries()
        metrics["test_queries"]["success"] = query_success
        metrics["test_queries"]["results"] = query_results

    # Save metrics
    save_metrics(metrics)

    # Overall health status
    overall_success = all(
        [
            metrics["embedding_generation"]["success"],
            metrics["vector_search_connectivity"]["success"],
            metrics["test_queries"]["success"],
        ]
    )

    if overall_success:
        logger.info("✅ RAG system is healthy")
        return 0
    else:
        logger.error("❌ RAG system has issues")
        return 1


if __name__ == "__main__":
    sys.exit(main())
