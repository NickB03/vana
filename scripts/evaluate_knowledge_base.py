#!/usr/bin/env python3
"""
Evaluate Knowledge Base Script

This script evaluates the quality of the Knowledge Base by running a set of test queries
and measuring the relevance of the results. It can evaluate Vector Search, Knowledge Graph,
and Hybrid Search.
"""

import argparse
import datetime
import json
import logging
import math
import os
import sys
from typing import Any

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import tools
from tools.hybrid_search import HybridSearch
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("evaluate_knowledge_base.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Test queries and expected results
DEFAULT_TEST_QUERIES = [
    {
        "query": "What is VANA?",
        "expected_keywords": [
            "Versatile Agent Network Architecture",
            "intelligent",
            "agent",
            "system",
            "ADK",
        ],
        "category": "general",
        "difficulty": "easy",
    },
    {
        "query": "How does Vector Search work?",
        "expected_keywords": [
            "embedding",
            "semantic",
            "similarity",
            "Vertex AI",
            "index",
        ],
        "category": "technology",
        "difficulty": "medium",
    },
    {
        "query": "What is the Knowledge Graph in VANA?",
        "expected_keywords": [
            "structured",
            "entity",
            "relationship",
            "MCP",
            "knowledge",
        ],
        "category": "technology",
        "difficulty": "medium",
    },
    {
        "query": "How to implement hybrid search?",
        "expected_keywords": [
            "combine",
            "Vector Search",
            "Knowledge Graph",
            "results",
            "ranking",
        ],
        "category": "implementation",
        "difficulty": "hard",
    },
    {
        "query": "What are the main components of VANA?",
        "expected_keywords": [
            "Vector Search",
            "Knowledge Graph",
            "ADK",
            "agents",
            "tools",
        ],
        "category": "architecture",
        "difficulty": "medium",
    },
]


def calculate_precision(
    results: list[dict[str, Any]], expected_keywords: list[str]
) -> float:
    """
    Calculate precision of retrieval results

    Args:
        results: List of retrieval results
        expected_keywords: List of expected keywords

    Returns:
        Precision score (0-1)
    """
    if not results:
        return 0.0

    relevant_count = 0

    for result in results:
        content = result.get("content", "")

        # Check if any expected keyword is in the content
        if any(keyword.lower() in content.lower() for keyword in expected_keywords):
            relevant_count += 1

    return relevant_count / len(results)


def calculate_recall(
    results: list[dict[str, Any]], expected_keywords: list[str]
) -> float:
    """
    Calculate recall of retrieval results

    Args:
        results: List of retrieval results
        expected_keywords: List of expected keywords

    Returns:
        Recall score (0-1)
    """
    if not results or not expected_keywords:
        return 0.0

    # Combine all result content
    all_content = " ".join([result.get("content", "") for result in results]).lower()

    # Count how many expected keywords are found
    found_keywords = sum(
        1 for keyword in expected_keywords if keyword.lower() in all_content
    )

    return found_keywords / len(expected_keywords)


def calculate_f1_score(precision: float, recall: float) -> float:
    """
    Calculate F1 score from precision and recall

    Args:
        precision: Precision score
        recall: Recall score

    Returns:
        F1 score (0-1)
    """
    if precision + recall == 0:
        return 0.0

    return 2 * (precision * recall) / (precision + recall)


def calculate_relevance_scores(
    results: list[dict[str, Any]], expected_keywords: list[str]
) -> list[float]:
    """
    Calculate relevance score for each result

    Args:
        results: List of retrieval results
        expected_keywords: List of expected keywords

    Returns:
        List of relevance scores (0-1) for each result
    """
    if not results or not expected_keywords:
        return [0.0] * len(results)

    relevance_scores = []

    for result in results:
        content = result.get("content", "").lower()

        # Count how many expected keywords are found in this result
        found_keywords = sum(
            1 for keyword in expected_keywords if keyword.lower() in content
        )

        # Calculate relevance score
        relevance = found_keywords / len(expected_keywords)
        relevance_scores.append(relevance)

    return relevance_scores


def calculate_ndcg(relevance_scores: list[float], k: int = None) -> float:
    """
    Calculate Normalized Discounted Cumulative Gain (NDCG)

    Args:
        relevance_scores: List of relevance scores
        k: Number of results to consider (default: all)

    Returns:
        NDCG score (0-1)
    """
    if not relevance_scores:
        return 0.0

    if k is None:
        k = len(relevance_scores)

    # Calculate DCG
    dcg = 0.0
    for i, score in enumerate(relevance_scores[:k]):
        dcg += score / (math.log2(i + 2))  # i+2 because i is 0-indexed

    # Calculate ideal DCG
    ideal_relevance = sorted(relevance_scores, reverse=True)
    idcg = 0.0
    for i, score in enumerate(ideal_relevance[:k]):
        idcg += score / (math.log2(i + 2))

    # Calculate NDCG
    if idcg == 0:
        return 0.0

    return dcg / idcg


def evaluate_vector_search(
    test_queries: list[dict[str, Any]], top_k: int = 5
) -> dict[str, Any]:
    """
    Evaluate Vector Search retrieval quality

    Args:
        test_queries: List of test queries with expected keywords
        top_k: Number of results to retrieve

    Returns:
        Evaluation results
    """
    logger.info("Evaluating Vector Search...")

    # Initialize Vector Search client
    vs_client = VectorSearchClient()

    if not vs_client.is_available():
        logger.error("Vector Search is not available.")
        return {"success": False, "reason": "Vector Search not available"}

    results = []

    for test_case in test_queries:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]
        category = test_case.get("category", "general")
        difficulty = test_case.get("difficulty", "medium")

        logger.info(f"Query: {query} (Category: {category}, Difficulty: {difficulty})")

        # Get search results
        search_results = vs_client.search(query, top_k=top_k)

        # Calculate metrics
        precision = calculate_precision(search_results, expected_keywords)
        recall = calculate_recall(search_results, expected_keywords)
        f1 = calculate_f1_score(precision, recall)
        relevance_scores = calculate_relevance_scores(search_results, expected_keywords)
        ndcg = calculate_ndcg(relevance_scores)

        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Recall: {recall:.2f}")
        logger.info(f"  F1 Score: {f1:.2f}")
        logger.info(f"  NDCG: {ndcg:.2f}")

        results.append(
            {
                "query": query,
                "category": category,
                "difficulty": difficulty,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "ndcg": ndcg,
                "result_count": len(search_results),
            }
        )

    # Calculate average metrics
    avg_precision = sum(r["precision"] for r in results) / len(results)
    avg_recall = sum(r["recall"] for r in results) / len(results)
    avg_f1 = sum(r["f1"] for r in results) / len(results)
    avg_ndcg = sum(r["ndcg"] for r in results) / len(results)

    logger.info("\nVector Search Average Metrics:")
    logger.info(f"  Precision: {avg_precision:.2f}")
    logger.info(f"  Recall: {avg_recall:.2f}")
    logger.info(f"  F1 Score: {avg_f1:.2f}")
    logger.info(f"  NDCG: {avg_ndcg:.2f}")

    # Calculate metrics by category
    categories = set(r["category"] for r in results)
    category_metrics = {}

    for category in categories:
        category_results = [r for r in results if r["category"] == category]
        if category_results:
            cat_avg_f1 = sum(r["f1"] for r in category_results) / len(category_results)
            category_metrics[category] = cat_avg_f1
            logger.info(f"  {category}: F1 = {cat_avg_f1:.2f}")

    # Calculate metrics by difficulty
    difficulties = set(r["difficulty"] for r in results)
    difficulty_metrics = {}

    for difficulty in difficulties:
        difficulty_results = [r for r in results if r["difficulty"] == difficulty]
        if difficulty_results:
            diff_avg_f1 = sum(r["f1"] for r in difficulty_results) / len(
                difficulty_results
            )
            difficulty_metrics[difficulty] = diff_avg_f1
            logger.info(f"  {difficulty}: F1 = {diff_avg_f1:.2f}")

    return {
        "success": True,
        "results": results,
        "averages": {
            "precision": avg_precision,
            "recall": avg_recall,
            "f1": avg_f1,
            "ndcg": avg_ndcg,
        },
        "category_metrics": category_metrics,
        "difficulty_metrics": difficulty_metrics,
    }


def evaluate_knowledge_graph(test_queries: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluate Knowledge Graph retrieval quality

    Args:
        test_queries: List of test queries with expected keywords

    Returns:
        Evaluation results
    """
    logger.info("Evaluating Knowledge Graph...")

    # Initialize Knowledge Graph manager
    kg_manager = KnowledgeGraphManager()

    if not kg_manager.is_available():
        logger.error("Knowledge Graph is not available.")
        return {"success": False, "reason": "Knowledge Graph not available"}

    results = []

    for test_case in test_queries:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]
        category = test_case.get("category", "general")
        difficulty = test_case.get("difficulty", "medium")

        logger.info(f"Query: {query} (Category: {category}, Difficulty: {difficulty})")

        # Get search results
        kg_results = kg_manager.query("*", query)
        entities = kg_results.get("entities", [])

        # Convert entities to a format similar to Vector Search results
        search_results = []
        for entity in entities:
            search_results.append(
                {
                    "content": entity.get("observation", ""),
                    "metadata": {
                        "name": entity.get("name", ""),
                        "type": entity.get("type", ""),
                    },
                }
            )

        # Calculate metrics
        precision = calculate_precision(search_results, expected_keywords)
        recall = calculate_recall(search_results, expected_keywords)
        f1 = calculate_f1_score(precision, recall)
        relevance_scores = calculate_relevance_scores(search_results, expected_keywords)
        ndcg = calculate_ndcg(relevance_scores)

        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Recall: {recall:.2f}")
        logger.info(f"  F1 Score: {f1:.2f}")
        logger.info(f"  NDCG: {ndcg:.2f}")

        results.append(
            {
                "query": query,
                "category": category,
                "difficulty": difficulty,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "ndcg": ndcg,
                "result_count": len(search_results),
            }
        )

    # Calculate average metrics
    if not results:
        logger.warning("No results to calculate metrics")
        return {"success": False, "reason": "No results"}

    avg_precision = sum(r["precision"] for r in results) / len(results)
    avg_recall = sum(r["recall"] for r in results) / len(results)
    avg_f1 = sum(r["f1"] for r in results) / len(results)
    avg_ndcg = sum(r["ndcg"] for r in results) / len(results)

    logger.info("\nKnowledge Graph Average Metrics:")
    logger.info(f"  Precision: {avg_precision:.2f}")
    logger.info(f"  Recall: {avg_recall:.2f}")
    logger.info(f"  F1 Score: {avg_f1:.2f}")
    logger.info(f"  NDCG: {avg_ndcg:.2f}")

    # Calculate metrics by category
    categories = set(r["category"] for r in results)
    category_metrics = {}

    for category in categories:
        category_results = [r for r in results if r["category"] == category]
        if category_results:
            cat_avg_f1 = sum(r["f1"] for r in category_results) / len(category_results)
            category_metrics[category] = cat_avg_f1
            logger.info(f"  {category}: F1 = {cat_avg_f1:.2f}")

    # Calculate metrics by difficulty
    difficulties = set(r["difficulty"] for r in results)
    difficulty_metrics = {}

    for difficulty in difficulties:
        difficulty_results = [r for r in results if r["difficulty"] == difficulty]
        if difficulty_results:
            diff_avg_f1 = sum(r["f1"] for r in difficulty_results) / len(
                difficulty_results
            )
            difficulty_metrics[difficulty] = diff_avg_f1
            logger.info(f"  {difficulty}: F1 = {diff_avg_f1:.2f}")

    return {
        "success": True,
        "results": results,
        "averages": {
            "precision": avg_precision,
            "recall": avg_recall,
            "f1": avg_f1,
            "ndcg": avg_ndcg,
        },
        "category_metrics": category_metrics,
        "difficulty_metrics": difficulty_metrics,
    }


def evaluate_hybrid_search(
    test_queries: list[dict[str, Any]], top_k: int = 5
) -> dict[str, Any]:
    """
    Evaluate Hybrid Search retrieval quality

    Args:
        test_queries: List of test queries with expected keywords
        top_k: Number of results to retrieve

    Returns:
        Evaluation results
    """
    logger.info("Evaluating Hybrid Search...")

    # Initialize Hybrid Search
    hybrid_search = HybridSearch()

    # Check if Vector Search or Knowledge Graph is available
    vs_available = hybrid_search.vector_search_client.is_available()
    kg_available = hybrid_search.kg_manager.is_available()

    if not vs_available and not kg_available:
        logger.error("Hybrid Search is not available.")
        return {"success": False, "reason": "Hybrid Search not available"}

    results = []

    for test_case in test_queries:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]
        category = test_case.get("category", "general")
        difficulty = test_case.get("difficulty", "medium")

        logger.info(f"Query: {query} (Category: {category}, Difficulty: {difficulty})")

        # Get search results
        search_results = hybrid_search.search(query, top_k=top_k)

        # Calculate metrics
        precision = calculate_precision(search_results, expected_keywords)
        recall = calculate_recall(search_results, expected_keywords)
        f1 = calculate_f1_score(precision, recall)
        relevance_scores = calculate_relevance_scores(search_results, expected_keywords)
        ndcg = calculate_ndcg(relevance_scores)

        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Recall: {recall:.2f}")
        logger.info(f"  F1 Score: {f1:.2f}")
        logger.info(f"  NDCG: {ndcg:.2f}")

        results.append(
            {
                "query": query,
                "category": category,
                "difficulty": difficulty,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "ndcg": ndcg,
                "result_count": len(search_results),
            }
        )

    # Calculate average metrics
    if not results:
        logger.warning("No results to calculate metrics")
        return {"success": False, "reason": "No results"}

    avg_precision = sum(r["precision"] for r in results) / len(results)
    avg_recall = sum(r["recall"] for r in results) / len(results)
    avg_f1 = sum(r["f1"] for r in results) / len(results)
    avg_ndcg = sum(r["ndcg"] for r in results) / len(results)

    logger.info("\nHybrid Search Average Metrics:")
    logger.info(f"  Precision: {avg_precision:.2f}")
    logger.info(f"  Recall: {avg_recall:.2f}")
    logger.info(f"  F1 Score: {avg_f1:.2f}")
    logger.info(f"  NDCG: {avg_ndcg:.2f}")

    # Calculate metrics by category
    categories = set(r["category"] for r in results)
    category_metrics = {}

    for category in categories:
        category_results = [r for r in results if r["category"] == category]
        if category_results:
            cat_avg_f1 = sum(r["f1"] for r in category_results) / len(category_results)
            category_metrics[category] = cat_avg_f1
            logger.info(f"  {category}: F1 = {cat_avg_f1:.2f}")

    # Calculate metrics by difficulty
    difficulties = set(r["difficulty"] for r in results)
    difficulty_metrics = {}

    for difficulty in difficulties:
        difficulty_results = [r for r in results if r["difficulty"] == difficulty]
        if difficulty_results:
            diff_avg_f1 = sum(r["f1"] for r in difficulty_results) / len(
                difficulty_results
            )
            difficulty_metrics[difficulty] = diff_avg_f1
            logger.info(f"  {difficulty}: F1 = {diff_avg_f1:.2f}")

    return {
        "success": True,
        "results": results,
        "averages": {
            "precision": avg_precision,
            "recall": avg_recall,
            "f1": avg_f1,
            "ndcg": avg_ndcg,
        },
        "category_metrics": category_metrics,
        "difficulty_metrics": difficulty_metrics,
    }


def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Evaluate Knowledge Base")
    parser.add_argument("--queries", help="JSON file containing test queries")
    parser.add_argument("--output", help="Output file for evaluation results")
    parser.add_argument(
        "--top-k", type=int, default=5, help="Number of results to retrieve"
    )
    parser.add_argument(
        "--vector-search", action="store_true", help="Evaluate Vector Search"
    )
    parser.add_argument(
        "--knowledge-graph", action="store_true", help="Evaluate Knowledge Graph"
    )
    parser.add_argument(
        "--hybrid-search", action="store_true", help="Evaluate Hybrid Search"
    )

    args = parser.parse_args()

    # Load test queries
    if args.queries:
        try:
            with open(args.queries) as f:
                test_queries = json.load(f)
            logger.info(f"Loaded {len(test_queries)} test queries from {args.queries}")
        except Exception as e:
            logger.error(f"Error loading test queries from {args.queries}: {str(e)}")
            test_queries = DEFAULT_TEST_QUERIES
    else:
        test_queries = DEFAULT_TEST_QUERIES

    # Determine which search methods to evaluate
    if not (args.vector_search or args.knowledge_graph or args.hybrid_search):
        # If none specified, evaluate all
        args.vector_search = True
        args.knowledge_graph = True
        args.hybrid_search = True

    # Initialize results
    evaluation_results = {
        "timestamp": datetime.datetime.now().isoformat(),
        "vector_search": None,
        "knowledge_graph": None,
        "hybrid_search": None,
    }

    # Evaluate Vector Search
    if args.vector_search:
        vs_results = evaluate_vector_search(test_queries, args.top_k)
        evaluation_results["vector_search"] = vs_results

    # Evaluate Knowledge Graph
    if args.knowledge_graph:
        kg_results = evaluate_knowledge_graph(test_queries)
        evaluation_results["knowledge_graph"] = kg_results

    # Evaluate Hybrid Search
    if args.hybrid_search:
        hs_results = evaluate_hybrid_search(test_queries, args.top_k)
        evaluation_results["hybrid_search"] = hs_results

    # Save results to output file if specified
    if args.output:
        try:
            with open(args.output, "w") as f:
                json.dump(evaluation_results, f, indent=2)
            logger.info(f"Saved evaluation results to {args.output}")
        except Exception as e:
            logger.error(f"Error saving evaluation results to {args.output}: {str(e)}")

    # Return success status
    return 0


if __name__ == "__main__":
    sys.exit(main())
