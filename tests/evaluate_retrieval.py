#!/usr/bin/env python3
"""
Evaluate Retrieval Quality for VANA

This script evaluates the quality of knowledge retrieval using different methods:
1. Vector Search
2. Knowledge Graph
3. Hybrid Search
4. Web Search

It measures precision, recall, and relevance of retrieved information.
"""

import json
import logging
import math
import os
import sys
import time
from datetime import datetime
from typing import Any

from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the necessary tools
from tools.hybrid_search import HybridSearch
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.web_search import WebSearchClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test queries and expected results
TEST_QUERIES = [
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
    {
        "query": "How does entity extraction work in VANA?",
        "expected_keywords": ["NLP", "spaCy", "entity", "extraction", "patterns"],
        "category": "implementation",
        "difficulty": "hard",
    },
    {
        "query": "What is semantic chunking?",
        "expected_keywords": ["document", "chunk", "semantic", "boundary", "section"],
        "category": "technology",
        "difficulty": "medium",
    },
    {
        "query": "How to set up the VANA environment?",
        "expected_keywords": [
            "virtual environment",
            "dependencies",
            "setup",
            "configuration",
            "launch",
        ],
        "category": "setup",
        "difficulty": "easy",
    },
    {
        "query": "What APIs does VANA use?",
        "expected_keywords": ["Google", "Vertex AI", "ADK", "MCP", "API"],
        "category": "integration",
        "difficulty": "medium",
    },
    {
        "query": "How does VANA handle PDF documents?",
        "expected_keywords": ["PDF", "extract", "text", "process", "metadata"],
        "category": "feature",
        "difficulty": "medium",
    },
]

# Define evaluation metrics
METRICS = {
    "precision": {
        "name": "Precision",
        "description": "Fraction of retrieved information that is relevant",
        "higher_is_better": True,
    },
    "recall": {
        "name": "Recall",
        "description": "Fraction of relevant information that is retrieved",
        "higher_is_better": True,
    },
    "f1": {
        "name": "F1 Score",
        "description": "Harmonic mean of precision and recall",
        "higher_is_better": True,
    },
    "keyword_coverage": {
        "name": "Keyword Coverage",
        "description": "Fraction of expected keywords found in results",
        "higher_is_better": True,
    },
    "latency": {
        "name": "Latency (ms)",
        "description": "Time taken to retrieve results",
        "higher_is_better": False,
    },
}


def calculate_precision(
    results: list[dict[str, Any]], expected_keywords: list[str]
) -> float:
    """
    Calculate precision of retrieval results

    Precision = Number of relevant results / Total number of results

    Args:
        results: List of retrieval results
        expected_keywords: List of expected keywords

    Returns:
        Precision score (0.0 to 1.0)
    """
    if not results:
        return 0.0

    relevant_count = 0

    for result in results:
        content = result.get("content", "")

        # Count as relevant if it contains at least one expected keyword
        is_relevant = any(
            keyword.lower() in content.lower() for keyword in expected_keywords
        )

        if is_relevant:
            relevant_count += 1

    return relevant_count / len(results)


def calculate_keyword_coverage(
    results: list[dict[str, Any]], expected_keywords: list[str]
) -> float:
    """
    Calculate keyword coverage of retrieval results

    Coverage = Number of expected keywords found / Total number of expected keywords

    Args:
        results: List of retrieval results
        expected_keywords: List of expected keywords

    Returns:
        Coverage score (0.0 to 1.0)
    """
    if not results or not expected_keywords:
        return 0.0

    # Combine all content
    all_content = " ".join([result.get("content", "") for result in results]).lower()

    # Count keywords found
    keywords_found = sum(
        1 for keyword in expected_keywords if keyword.lower() in all_content
    )

    return keywords_found / len(expected_keywords)


def calculate_f1_score(precision: float, recall: float) -> float:
    """
    Calculate F1 score from precision and recall

    F1 = 2 * (precision * recall) / (precision + recall)

    Args:
        precision: Precision score
        recall: Recall score

    Returns:
        F1 score (0.0 to 1.0)
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
        List of relevance scores (0.0 to 1.0) for each result
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
        NDCG score (0.0 to 1.0)
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


def measure_latency(func, *args, **kwargs) -> tuple[Any, float]:
    """
    Measure the latency of a function call

    Args:
        func: Function to measure
        *args: Arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function

    Returns:
        Tuple of (function result, latency in milliseconds)
    """
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()

    latency_ms = (end_time - start_time) * 1000
    return result, latency_ms


def evaluate_vector_search():
    """Evaluate Vector Search retrieval quality"""
    logger.info("Evaluating Vector Search...")

    client = VectorSearchClient()

    if not client.is_available():
        logger.error("Vector Search is not available.")
        return False

    results = []

    for test_case in TEST_QUERIES:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]
        category = test_case.get("category", "general")
        difficulty = test_case.get("difficulty", "medium")

        logger.info(f"Query: {query} (Category: {category}, Difficulty: {difficulty})")

        # Get search results with latency measurement
        search_results, latency = measure_latency(client.search, query, top_k=5)

        # Calculate metrics
        precision = calculate_precision(search_results, expected_keywords)
        coverage = calculate_keyword_coverage(search_results, expected_keywords)
        recall = coverage  # In our implementation, coverage is the same as recall
        f1 = calculate_f1_score(precision, recall)
        relevance_scores = calculate_relevance_scores(search_results, expected_keywords)
        ndcg = calculate_ndcg(relevance_scores)

        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Recall: {recall:.2f}")
        logger.info(f"  F1 Score: {f1:.2f}")
        logger.info(f"  NDCG: {ndcg:.2f}")
        logger.info(f"  Latency: {latency:.2f} ms")

        results.append(
            {
                "query": query,
                "category": category,
                "difficulty": difficulty,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "ndcg": ndcg,
                "latency": latency,
                "result_count": len(search_results),
            }
        )

    # Calculate average metrics
    avg_precision = sum(r["precision"] for r in results) / len(results)
    avg_recall = sum(r["recall"] for r in results) / len(results)
    avg_f1 = sum(r["f1"] for r in results) / len(results)
    avg_ndcg = sum(r["ndcg"] for r in results) / len(results)
    avg_latency = sum(r["latency"] for r in results) / len(results)

    logger.info("\nVector Search Average Metrics:")
    logger.info(f"  Precision: {avg_precision:.2f}")
    logger.info(f"  Recall: {avg_recall:.2f}")
    logger.info(f"  F1 Score: {avg_f1:.2f}")
    logger.info(f"  NDCG: {avg_ndcg:.2f}")
    logger.info(f"  Latency: {avg_latency:.2f} ms")

    # Calculate metrics by category
    categories = set(r["category"] for r in results)
    logger.info("\nVector Search Metrics by Category:")
    for category in categories:
        category_results = [r for r in results if r["category"] == category]
        if category_results:
            cat_avg_f1 = sum(r["f1"] for r in category_results) / len(category_results)
            logger.info(f"  {category}: F1 = {cat_avg_f1:.2f}")

    # Calculate metrics by difficulty
    difficulties = set(r["difficulty"] for r in results)
    logger.info("\nVector Search Metrics by Difficulty:")
    for difficulty in difficulties:
        difficulty_results = [r for r in results if r["difficulty"] == difficulty]
        if difficulty_results:
            diff_avg_f1 = sum(r["f1"] for r in difficulty_results) / len(
                difficulty_results
            )
            logger.info(f"  {difficulty}: F1 = {diff_avg_f1:.2f}")

    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"vector_search_evaluation_{timestamp}.json"
    try:
        with open(os.path.join("logs", results_file), "w") as f:
            json.dump(
                {
                    "timestamp": timestamp,
                    "results": results,
                    "averages": {
                        "precision": avg_precision,
                        "recall": avg_recall,
                        "f1": avg_f1,
                        "ndcg": avg_ndcg,
                        "latency": avg_latency,
                    },
                },
                f,
                indent=2,
            )
        logger.info(f"\nResults saved to logs/{results_file}")
    except Exception as e:
        logger.error(f"Error saving results: {str(e)}")

    return True


def evaluate_knowledge_graph():
    """Evaluate Knowledge Graph retrieval quality"""
    logger.info("\nEvaluating Knowledge Graph...")

    kg_manager = KnowledgeGraphManager()

    if not kg_manager.is_available():
        logger.error("Knowledge Graph is not available.")
        return False

    results = []

    for test_case in TEST_QUERIES:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]

        logger.info(f"Query: {query}")

        # Get search results
        kg_results = kg_manager.query("*", query)
        entities = kg_results.get("entities", [])

        # Convert to common format for evaluation
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
        coverage = calculate_keyword_coverage(search_results, expected_keywords)

        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Keyword Coverage: {coverage:.2f}")

        results.append({"query": query, "precision": precision, "coverage": coverage})

    # Calculate average metrics
    if results:
        avg_precision = sum(r["precision"] for r in results) / len(results)
        avg_coverage = sum(r["coverage"] for r in results) / len(results)

        logger.info(f"Knowledge Graph Average Precision: {avg_precision:.2f}")
        logger.info(f"Knowledge Graph Average Keyword Coverage: {avg_coverage:.2f}")

    return True


def evaluate_hybrid_search():
    """Evaluate Hybrid Search retrieval quality"""
    logger.info("\nEvaluating Hybrid Search...")

    hybrid_search = HybridSearch()

    results = []

    for test_case in TEST_QUERIES:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]

        logger.info(f"Query: {query}")

        # Get search results
        search_results = hybrid_search.search(query, top_k=5)
        combined_results = search_results.get("combined", [])

        # Calculate metrics
        precision = calculate_precision(combined_results, expected_keywords)
        coverage = calculate_keyword_coverage(combined_results, expected_keywords)

        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Keyword Coverage: {coverage:.2f}")

        results.append({"query": query, "precision": precision, "coverage": coverage})

    # Calculate average metrics
    avg_precision = sum(r["precision"] for r in results) / len(results)
    avg_coverage = sum(r["coverage"] for r in results) / len(results)

    logger.info(f"Hybrid Search Average Precision: {avg_precision:.2f}")
    logger.info(f"Hybrid Search Average Keyword Coverage: {avg_coverage:.2f}")

    return True


def evaluate_web_search():
    """Evaluate Web Search retrieval quality"""
    logger.info("\nEvaluating Web Search...")

    client = WebSearchClient()

    if not client.is_available():
        logger.error("Web Search is not available.")
        return False

    results = []

    for test_case in TEST_QUERIES:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]

        logger.info(f"Query: {query}")

        # Get search results
        search_results = client.search(query, num_results=5)

        # Convert to common format for evaluation
        formatted_results = []
        for result in search_results:
            formatted_results.append(
                {
                    "content": f"{result.get('title')} {result.get('snippet')}",
                    "metadata": {
                        "url": result.get("url", ""),
                        "source": result.get("source", ""),
                    },
                }
            )

        # Calculate metrics
        precision = calculate_precision(formatted_results, expected_keywords)
        coverage = calculate_keyword_coverage(formatted_results, expected_keywords)

        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Keyword Coverage: {coverage:.2f}")

        results.append({"query": query, "precision": precision, "coverage": coverage})

    # Calculate average metrics
    if results:
        avg_precision = sum(r["precision"] for r in results) / len(results)
        avg_coverage = sum(r["coverage"] for r in results) / len(results)

        logger.info(f"Web Search Average Precision: {avg_precision:.2f}")
        logger.info(f"Web Search Average Keyword Coverage: {avg_coverage:.2f}")

    return True


def main():
    """Main function"""
    logger.info("Evaluating Retrieval Quality for VANA")

    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)

    # Evaluate each retrieval method
    vs_success = evaluate_vector_search()
    kg_success = evaluate_knowledge_graph()
    hs_success = evaluate_hybrid_search()
    ws_success = evaluate_web_search()

    # Overall success
    success = vs_success or kg_success or hs_success or ws_success

    # Save overall results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_file = f"retrieval_evaluation_summary_{timestamp}.json"
    try:
        with open(os.path.join("logs", summary_file), "w") as f:
            json.dump(
                {
                    "timestamp": timestamp,
                    "methods_evaluated": {
                        "vector_search": vs_success,
                        "knowledge_graph": kg_success,
                        "hybrid_search": hs_success,
                        "web_search": ws_success,
                    },
                    "overall_success": success,
                },
                f,
                indent=2,
            )
        logger.info(f"\nSummary saved to logs/{summary_file}")
    except Exception as e:
        logger.error(f"Error saving summary: {str(e)}")

    if success:
        logger.info("\nRetrieval evaluation completed successfully!")
        return 0
    else:
        logger.error("\nRetrieval evaluation failed. No retrieval methods available.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
