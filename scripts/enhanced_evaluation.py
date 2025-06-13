#!/usr/bin/env python3
"""
Enhanced Evaluation Framework for VANA

This script provides an enhanced evaluation framework for VANA's knowledge retrieval capabilities,
including more sophisticated metrics and comprehensive analysis.
"""

import argparse
import json
import logging
import math
import os
import sys
import time
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import necessary tools
try:
    from tools.enhanced_hybrid_search import EnhancedHybridSearch
    from tools.vector_search.vector_search_client import VectorSearchClient
except ImportError as e:
    logger.warning(f"Could not import some tools: {e}")


def calculate_precision(results, expected_keywords):
    """
    Calculate precision of search results

    Args:
        results: List of search results
        expected_keywords: List of expected keywords

    Returns:
        Precision score (0-1)
    """
    if not results or not expected_keywords:
        return 0.0

    relevant_count = 0

    for result in results:
        content = result.get("content", "").lower()

        # Check if any expected keyword is in the content
        if any(keyword.lower() in content for keyword in expected_keywords):
            relevant_count += 1

    return relevant_count / len(results)


def calculate_recall(results, expected_keywords):
    """
    Calculate recall of search results

    Args:
        results: List of search results
        expected_keywords: List of expected keywords

    Returns:
        Recall score (0-1)
    """
    if not results or not expected_keywords:
        return 0.0

    found_keywords = set()

    for result in results:
        content = result.get("content", "").lower()

        # Find all expected keywords in the content
        for keyword in expected_keywords:
            if keyword.lower() in content:
                found_keywords.add(keyword.lower())

    return len(found_keywords) / len(expected_keywords)


def calculate_f1_score(precision, recall):
    """
    Calculate F1 score

    Args:
        precision: Precision score
        recall: Recall score

    Returns:
        F1 score (0-1)
    """
    if precision + recall == 0:
        return 0.0

    return 2 * (precision * recall) / (precision + recall)


def calculate_ndcg(relevance_scores):
    """
    Calculate NDCG (Normalized Discounted Cumulative Gain)

    Args:
        relevance_scores: List of relevance scores

    Returns:
        NDCG score (0-1)
    """
    if not relevance_scores:
        return 0.0

    # Calculate DCG
    dcg = relevance_scores[0]
    for i in range(1, len(relevance_scores)):
        dcg += relevance_scores[i] / math.log2(i + 2)

    # Calculate IDCG (ideal DCG)
    ideal_scores = sorted(relevance_scores, reverse=True)
    idcg = ideal_scores[0]
    for i in range(1, len(ideal_scores)):
        idcg += ideal_scores[i] / math.log2(i + 2)

    if idcg == 0:
        return 0.0

    return dcg / idcg


def calculate_relevance_scores(results, expected_keywords):
    """
    Calculate relevance scores for NDCG

    Args:
        results: List of search results
        expected_keywords: List of expected keywords

    Returns:
        List of relevance scores
    """
    relevance_scores = []

    for result in results:
        content = result.get("content", "").lower()

        # Count how many expected keywords are in the content
        keyword_count = sum(1 for keyword in expected_keywords if keyword.lower() in content)

        # Normalize by total keywords
        relevance = keyword_count / len(expected_keywords)

        relevance_scores.append(relevance)

    return relevance_scores


def measure_latency(func, *args, **kwargs):
    """
    Measure latency of a function

    Args:
        func: Function to measure
        *args: Function arguments
        **kwargs: Function keyword arguments

    Returns:
        Tuple of (function result, latency in milliseconds)
    """
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()

    latency = (end_time - start_time) * 1000  # Convert to milliseconds

    return result, latency


def evaluate_vector_search(test_queries, top_k=5):
    """
    Evaluate Vector Search retrieval quality

    Args:
        test_queries: List of test queries
        top_k: Number of results to retrieve

    Returns:
        Evaluation results
    """
    logger.info("Evaluating Vector Search...")

    # Initialize Vector Search client
    client = VectorSearchClient()

    if not client.is_available():
        logger.error("Vector Search is not available.")
        return {"success": False, "reason": "Vector Search not available"}

    results = []

    for test_case in test_queries:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]
        category = test_case.get("category", "general")
        difficulty = test_case.get("difficulty", "medium")

        logger.info(f"Query: {query} (Category: {category}, Difficulty: {difficulty})")

        # Get search results with latency measurement
        search_results, latency = measure_latency(client.search, query, top_k=top_k)

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
    if not results:
        logger.warning("No results to calculate metrics")
        return {"success": False, "reason": "No results"}

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
    category_metrics = {}

    for category in categories:
        category_results = [r for r in results if r["category"] == category]

        category_metrics[category] = {
            "precision": sum(r["precision"] for r in category_results) / len(category_results),
            "recall": sum(r["recall"] for r in category_results) / len(category_results),
            "f1": sum(r["f1"] for r in category_results) / len(category_results),
            "ndcg": sum(r["ndcg"] for r in category_results) / len(category_results),
            "latency": sum(r["latency"] for r in category_results) / len(category_results),
            "count": len(category_results),
        }

    # Calculate metrics by difficulty
    difficulties = set(r["difficulty"] for r in results)
    difficulty_metrics = {}

    for difficulty in difficulties:
        difficulty_results = [r for r in results if r["difficulty"] == difficulty]

        difficulty_metrics[difficulty] = {
            "precision": sum(r["precision"] for r in difficulty_results) / len(difficulty_results),
            "recall": sum(r["recall"] for r in difficulty_results) / len(difficulty_results),
            "f1": sum(r["f1"] for r in difficulty_results) / len(difficulty_results),
            "ndcg": sum(r["ndcg"] for r in difficulty_results) / len(difficulty_results),
            "latency": sum(r["latency"] for r in difficulty_results) / len(difficulty_results),
            "count": len(difficulty_results),
        }

    return {
        "success": True,
        "results": results,
        "average": {
            "precision": avg_precision,
            "recall": avg_recall,
            "f1": avg_f1,
            "ndcg": avg_ndcg,
            "latency": avg_latency,
        },
        "by_category": category_metrics,
        "by_difficulty": difficulty_metrics,
    }


def evaluate_enhanced_hybrid_search(test_queries, top_k=5, include_web=True):
    """
    Evaluate Enhanced Hybrid Search retrieval quality

    Args:
        test_queries: List of test queries
        top_k: Number of results to retrieve
        include_web: Whether to include web search results

    Returns:
        Evaluation results
    """
    logger.info("Evaluating Enhanced Hybrid Search...")

    try:
        # Initialize Enhanced Hybrid Search
        hybrid_search = EnhancedHybridSearch()

        # Check if components are available
        vs_available = hybrid_search.vs_available
        kg_available = hybrid_search.kg_available
        web_available = hybrid_search.web_available and include_web

        if not (vs_available or kg_available or web_available):
            logger.error("Enhanced Hybrid Search is not available.")
            return {"success": False, "reason": "Enhanced Hybrid Search not available"}

        logger.info(
            f"Components available: Vector Search: {vs_available}, Knowledge Graph: {kg_available}, Web Search: {web_available}"
        )

        results = []

        for test_case in test_queries:
            query = test_case["query"]
            expected_keywords = test_case["expected_keywords"]
            category = test_case.get("category", "general")
            difficulty = test_case.get("difficulty", "medium")

            logger.info(f"Query: {query} (Category: {category}, Difficulty: {difficulty})")

            # Get search results with latency measurement
            search_results, latency = measure_latency(hybrid_search.search, query, top_k=top_k, include_web=include_web)

            # Get combined results
            combined_results = search_results.get("combined", [])

            # Calculate metrics
            precision = calculate_precision(combined_results, expected_keywords)
            recall = calculate_recall(combined_results, expected_keywords)
            f1 = calculate_f1_score(precision, recall)
            relevance_scores = calculate_relevance_scores(combined_results, expected_keywords)
            ndcg = calculate_ndcg(relevance_scores)

            logger.info(f"  Precision: {precision:.2f}")
            logger.info(f"  Recall: {recall:.2f}")
            logger.info(f"  F1 Score: {f1:.2f}")
            logger.info(f"  NDCG: {ndcg:.2f}")
            logger.info(f"  Latency: {latency:.2f} ms")

            # Count results by source
            vs_count = len(search_results.get("vector_search", []))
            kg_count = len(search_results.get("knowledge_graph", []))
            web_count = len(search_results.get("web_search", []))

            logger.info(f"  Results: Vector Search: {vs_count}, Knowledge Graph: {kg_count}, Web: {web_count}")

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
                    "result_count": {
                        "total": len(combined_results),
                        "vector_search": vs_count,
                        "knowledge_graph": kg_count,
                        "web_search": web_count,
                    },
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
        avg_latency = sum(r["latency"] for r in results) / len(results)

        logger.info("\nEnhanced Hybrid Search Average Metrics:")
        logger.info(f"  Precision: {avg_precision:.2f}")
        logger.info(f"  Recall: {avg_recall:.2f}")
        logger.info(f"  F1 Score: {avg_f1:.2f}")
        logger.info(f"  NDCG: {avg_ndcg:.2f}")
        logger.info(f"  Latency: {avg_latency:.2f} ms")

        # Calculate metrics by category
        categories = set(r["category"] for r in results)
        category_metrics = {}

        for category in categories:
            category_results = [r for r in results if r["category"] == category]

            category_metrics[category] = {
                "precision": sum(r["precision"] for r in category_results) / len(category_results),
                "recall": sum(r["recall"] for r in category_results) / len(category_results),
                "f1": sum(r["f1"] for r in category_results) / len(category_results),
                "ndcg": sum(r["ndcg"] for r in category_results) / len(category_results),
                "latency": sum(r["latency"] for r in category_results) / len(category_results),
                "count": len(category_results),
            }

        # Calculate metrics by difficulty
        difficulties = set(r["difficulty"] for r in results)
        difficulty_metrics = {}

        for difficulty in difficulties:
            difficulty_results = [r for r in results if r["difficulty"] == difficulty]

            difficulty_metrics[difficulty] = {
                "precision": sum(r["precision"] for r in difficulty_results) / len(difficulty_results),
                "recall": sum(r["recall"] for r in difficulty_results) / len(difficulty_results),
                "f1": sum(r["f1"] for r in difficulty_results) / len(difficulty_results),
                "ndcg": sum(r["ndcg"] for r in difficulty_results) / len(difficulty_results),
                "latency": sum(r["latency"] for r in difficulty_results) / len(difficulty_results),
                "count": len(difficulty_results),
            }

        return {
            "success": True,
            "results": results,
            "average": {
                "precision": avg_precision,
                "recall": avg_recall,
                "f1": avg_f1,
                "ndcg": avg_ndcg,
                "latency": avg_latency,
            },
            "by_category": category_metrics,
            "by_difficulty": difficulty_metrics,
        }

    except Exception as e:
        logger.error(f"Error evaluating Enhanced Hybrid Search: {str(e)}")
        return {"success": False, "reason": str(e)}


def generate_report(evaluation_results, output_file="evaluation_report.md"):
    """
    Generate evaluation report

    Args:
        evaluation_results: Evaluation results
        output_file: Output file path
    """
    with open(output_file, "w") as f:
        f.write("# Search Evaluation Report\n\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        # Write summary for each search method
        for method, results in evaluation_results.items():
            if not results.get("success", False):
                f.write(f"## {method}\n\n")
                f.write(f"Error: {results.get('reason', 'Unknown error')}\n\n")
                continue

            f.write(f"## {method}\n\n")

            # Write average metrics
            f.write("### Average Metrics\n\n")
            f.write("| Metric | Value |\n")
            f.write("|--------|-------|\n")
            for metric, value in results["average"].items():
                f.write(f"| {metric.capitalize()} | {value:.2f} |\n")

            # Write metrics by category
            f.write("\n### Metrics by Category\n\n")
            f.write("| Category | Precision | Recall | F1 | NDCG | Latency (ms) |\n")
            f.write("|----------|-----------|--------|----|----|-------------|\n")
            for category, metrics in results["by_category"].items():
                f.write(
                    f"| {category} | {metrics['precision']:.2f} | {metrics['recall']:.2f} | {metrics['f1']:.2f} | {metrics['ndcg']:.2f} | {metrics['latency']:.2f} |\n"
                )

            # Write metrics by difficulty
            f.write("\n### Metrics by Difficulty\n\n")
            f.write("| Difficulty | Precision | Recall | F1 | NDCG | Latency (ms) |\n")
            f.write("|------------|-----------|--------|----|----|-------------|\n")
            for difficulty, metrics in results["by_difficulty"].items():
                f.write(
                    f"| {difficulty} | {metrics['precision']:.2f} | {metrics['recall']:.2f} | {metrics['f1']:.2f} | {metrics['ndcg']:.2f} | {metrics['latency']:.2f} |\n"
                )

            # Write top 5 and bottom 5 queries
            f.write("\n### Top 5 Queries (by F1 Score)\n\n")
            f.write("| Query | Category | Difficulty | Precision | Recall | F1 | NDCG |\n")
            f.write("|-------|----------|------------|-----------|--------|----|----|-------------|\n")

            top_queries = sorted(results["results"], key=lambda x: x["f1"], reverse=True)[:5]
            for result in top_queries:
                f.write(
                    f"| {result['query']} | {result['category']} | {result['difficulty']} | {result['precision']:.2f} | {result['recall']:.2f} | {result['f1']:.2f} | {result['ndcg']:.2f} |\n"
                )

            f.write("\n### Bottom 5 Queries (by F1 Score)\n\n")
            f.write("| Query | Category | Difficulty | Precision | Recall | F1 | NDCG |\n")
            f.write("|-------|----------|------------|-----------|--------|----|----|-------------|\n")

            bottom_queries = sorted(results["results"], key=lambda x: x["f1"])[:5]
            for result in bottom_queries:
                f.write(
                    f"| {result['query']} | {result['category']} | {result['difficulty']} | {result['precision']:.2f} | {result['recall']:.2f} | {result['f1']:.2f} | {result['ndcg']:.2f} |\n"
                )

        f.write("\n## Conclusion\n\n")
        f.write("This report provides a comprehensive evaluation of VANA's search capabilities. ")
        f.write("The metrics show the performance across different query categories and difficulty levels, ")
        f.write("highlighting areas of strength and opportunities for improvement.\n\n")

        f.write("### Next Steps\n\n")
        f.write("1. Improve performance on low-scoring queries\n")
        f.write("2. Enhance the knowledge base with more comprehensive information\n")
        f.write("3. Optimize search algorithms for better precision and recall\n")
        f.write("4. Reduce latency for complex queries\n")
        f.write("5. Expand test query set for more comprehensive evaluation\n")


def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Enhanced Evaluation Framework for VANA")
    parser.add_argument("--queries", help="JSON file containing test queries")
    parser.add_argument("--output", help="Output file for evaluation report")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to retrieve")
    parser.add_argument("--vector-search", action="store_true", help="Evaluate Vector Search")
    parser.add_argument("--enhanced-hybrid-search", action="store_true", help="Evaluate Enhanced Hybrid Search")
    parser.add_argument("--include-web", action="store_true", help="Include web search in Enhanced Hybrid Search")

    args = parser.parse_args()

    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)

    # Load test queries
    if args.queries:
        try:
            with open(args.queries, "r") as f:
                test_queries = json.load(f)
            logger.info(f"Loaded {len(test_queries)} test queries from {args.queries}")
        except Exception as e:
            logger.error(f"Error loading test queries from {args.queries}: {str(e)}")
            return 1
    else:
        # Use default test queries from tests/test_data/comprehensive_test_queries.json
        default_queries_path = os.path.join("tests", "test_data", "comprehensive_test_queries.json")
        try:
            with open(default_queries_path, "r") as f:
                test_queries = json.load(f)
            logger.info(f"Loaded {len(test_queries)} test queries from {default_queries_path}")
        except Exception as e:
            logger.error(f"Error loading default test queries: {str(e)}")
            return 1

    # Determine which search methods to evaluate
    if not (args.vector_search or args.enhanced_hybrid_search):
        # If none specified, evaluate all
        args.vector_search = True
        args.enhanced_hybrid_search = True

    # Initialize results
    evaluation_results = {}

    # Evaluate Vector Search
    if args.vector_search:
        vs_results = evaluate_vector_search(test_queries, args.top_k)
        evaluation_results["Vector Search"] = vs_results

    # Evaluate Enhanced Hybrid Search
    if args.enhanced_hybrid_search:
        ehs_results = evaluate_enhanced_hybrid_search(test_queries, args.top_k, args.include_web)
        evaluation_results["Enhanced Hybrid Search"] = ehs_results

    # Generate report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = args.output or f"logs/evaluation_report_{timestamp}.md"

    try:
        generate_report(evaluation_results, output_file)
        logger.info(f"Evaluation report saved to {output_file}")
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return 1

    # Check if any evaluation was successful
    success = any(results.get("success", False) for results in evaluation_results.values())

    if success:
        logger.info("Evaluation completed successfully!")
        return 0
    else:
        logger.error("Evaluation failed. No search methods available.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
