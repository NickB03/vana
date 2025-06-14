#!/usr/bin/env python3
"""
Evaluate Search Quality for VANA

This script evaluates the quality of search results from different search implementations
with various query types. It compares the results from:
1. Vector Search
2. Knowledge Graph
3. Enhanced Hybrid Search
4. Enhanced Hybrid Search Optimized

Usage:
    python scripts/evaluate_search_quality.py --output report.md
    python scripts/evaluate_search_quality.py --queries queries.json --output report.md
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Import search implementations
try:
    from tests.mocks.web_search_mock import MockWebSearchClient
    from tools.enhanced_hybrid_search import EnhancedHybridSearch
    from tools.enhanced_hybrid_search_optimized import EnhancedHybridSearchOptimized
    from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
    from tools.vector_search.vector_search_client import VectorSearchClient
except ImportError as e:
    logger.error(f"Error importing required modules: {e}")
    logger.info("Make sure you run this script from the project root or scripts directory.")
    sys.exit(1)

# Default test queries
DEFAULT_TEST_QUERIES = [
    {
        "query": "What is VANA?",
        "category": "factual",
        "difficulty": "easy",
        "expected_keywords": ["VANA", "agent", "architecture", "system"],
    },
    {
        "query": "How does Vector Search work?",
        "category": "procedural",
        "difficulty": "medium",
        "expected_keywords": ["vector", "search", "embedding", "similarity"],
    },
    {
        "query": "Explain the architecture of VANA",
        "category": "conceptual",
        "difficulty": "hard",
        "expected_keywords": ["architecture", "components", "design", "structure"],
    },
    {
        "query": "What are the latest features in VANA?",
        "category": "time-sensitive",
        "difficulty": "medium",
        "expected_keywords": ["features", "latest", "new", "recent"],
    },
    {
        "query": "How to set up VANA environment?",
        "category": "procedural",
        "difficulty": "medium",
        "expected_keywords": ["setup", "environment", "configuration", "install"],
    },
    {
        "query": "What is the difference between Vector Search and Knowledge Graph?",
        "category": "comparative",
        "difficulty": "hard",
        "expected_keywords": ["vector", "search", "knowledge", "graph", "difference", "comparison"],
    },
    {
        "query": "How to integrate VANA with external systems?",
        "category": "procedural",
        "difficulty": "hard",
        "expected_keywords": ["integrate", "external", "systems", "API"],
    },
    {
        "query": "What are the best practices for using VANA?",
        "category": "best-practices",
        "difficulty": "medium",
        "expected_keywords": ["best", "practices", "recommended", "guidelines"],
    },
    {
        "query": "How to troubleshoot VANA issues?",
        "category": "troubleshooting",
        "difficulty": "hard",
        "expected_keywords": ["troubleshoot", "issues", "problems", "debug"],
    },
    {
        "query": "What is the performance of VANA compared to other systems?",
        "category": "comparative",
        "difficulty": "hard",
        "expected_keywords": ["performance", "comparison", "benchmark", "metrics"],
    },
]


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Evaluate search quality for VANA")
    parser.add_argument("--queries", type=str, help="Path to JSON file with test queries")
    parser.add_argument("--output", type=str, default="search_quality_report.md", help="Output file for the report")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to retrieve")
    parser.add_argument("--include-web", action="store_true", help="Include web search results")
    parser.add_argument("--mock-web", action="store_true", help="Use mock web search client")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print verbose output")
    return parser.parse_args()


def load_test_queries(file_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load test queries from a JSON file or use defaults."""
    if file_path and os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                queries = json.load(f)
            logger.info(f"Loaded {len(queries)} test queries from {file_path}")
            return queries
        except Exception as e:
            logger.error(f"Error loading test queries from {file_path}: {e}")

    logger.info(f"Using {len(DEFAULT_TEST_QUERIES)} default test queries")
    return DEFAULT_TEST_QUERIES


def calculate_keyword_coverage(result: Dict[str, Any], expected_keywords: List[str]) -> float:
    """Calculate keyword coverage for a result."""
    if not expected_keywords:
        return 0.0

    content = result.get("content", "").lower()

    # Count matching keywords
    matches = sum(1 for keyword in expected_keywords if keyword.lower() in content)

    # Calculate coverage
    coverage = matches / len(expected_keywords)

    return coverage


def calculate_result_quality(results: List[Dict[str, Any]], expected_keywords: List[str]) -> Dict[str, float]:
    """Calculate quality metrics for search results."""
    if not results:
        return {"keyword_coverage": 0.0, "average_score": 0.0, "top_result_coverage": 0.0, "overall_quality": 0.0}

    # Calculate keyword coverage for all results
    coverages = [calculate_keyword_coverage(result, expected_keywords) for result in results]
    avg_coverage = sum(coverages) / len(coverages) if coverages else 0.0

    # Calculate average score
    scores = [result.get("score", 0.0) for result in results]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    # Calculate top result coverage
    top_result_coverage = coverages[0] if coverages else 0.0

    # Calculate overall quality (weighted combination)
    overall_quality = 0.5 * avg_coverage + 0.3 * avg_score + 0.2 * top_result_coverage

    return {
        "keyword_coverage": avg_coverage,
        "average_score": avg_score,
        "top_result_coverage": top_result_coverage,
        "overall_quality": overall_quality,
    }


def evaluate_search_implementations(
    test_queries: List[Dict[str, Any]],
    top_k: int = 5,
    include_web: bool = False,
    mock_web: bool = True,
    verbose: bool = False,
) -> Dict[str, Any]:
    """Evaluate different search implementations with test queries."""
    # Initialize search implementations
    vector_search = VectorSearchClient()
    kg_manager = KnowledgeGraphManager()

    # Initialize web search client
    web_search_client = MockWebSearchClient() if mock_web else None

    # Initialize hybrid search implementations
    enhanced_hybrid_search = EnhancedHybridSearch(
        vector_search_client=vector_search, kg_manager=kg_manager, web_search_client=web_search_client
    )

    enhanced_hybrid_search_optimized = EnhancedHybridSearchOptimized(
        vector_search_client=vector_search, kg_manager=kg_manager, web_search_client=web_search_client
    )

    # Check availability
    vs_available = vector_search.is_available()
    kg_available = kg_manager.is_available()
    web_available = web_search_client is not None

    logger.info(f"Vector Search available: {vs_available}")
    logger.info(f"Knowledge Graph available: {kg_available}")
    logger.info(f"Web Search available: {web_available}")

    # Initialize results
    results = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "queries": len(test_queries),
        "top_k": top_k,
        "include_web": include_web,
        "mock_web": mock_web,
        "availability": {"vector_search": vs_available, "knowledge_graph": kg_available, "web_search": web_available},
        "query_results": [],
        "summary": {
            "vector_search": {"average_quality": 0.0, "average_time": 0.0, "by_category": {}, "by_difficulty": {}},
            "knowledge_graph": {"average_quality": 0.0, "average_time": 0.0, "by_category": {}, "by_difficulty": {}},
            "enhanced_hybrid_search": {
                "average_quality": 0.0,
                "average_time": 0.0,
                "by_category": {},
                "by_difficulty": {},
            },
            "enhanced_hybrid_search_optimized": {
                "average_quality": 0.0,
                "average_time": 0.0,
                "by_category": {},
                "by_difficulty": {},
            },
        },
    }

    # Process each test query
    for query_data in test_queries:
        query = query_data["query"]
        category = query_data.get("category", "unknown")
        difficulty = query_data.get("difficulty", "medium")
        expected_keywords = query_data.get("expected_keywords", [])

        logger.info(f"Processing query: {query}")

        query_result = {
            "query": query,
            "category": category,
            "difficulty": difficulty,
            "expected_keywords": expected_keywords,
            "implementations": {},
        }

        # Test Vector Search
        if vs_available:
            start_time = time.time()
            vs_results = vector_search.search(query, top_k=top_k)
            end_time = time.time()

            quality = calculate_result_quality(vs_results, expected_keywords)

            query_result["implementations"]["vector_search"] = {
                "time": end_time - start_time,
                "result_count": len(vs_results),
                "quality": quality,
            }

            if verbose:
                logger.info(f"Vector Search: {len(vs_results)} results, quality: {quality['overall_quality']:.2f}")

        # Test Knowledge Graph
        if kg_available:
            start_time = time.time()
            kg_results = kg_manager.query("*", query)
            end_time = time.time()

            entities = kg_results.get("entities", [])
            formatted_entities = []

            for entity in entities:
                formatted_entities.append(
                    {
                        "content": entity.get("observation", ""),
                        "score": 0.8,  # Default score for KG results
                        "metadata": {
                            "name": entity.get("name", ""),
                            "type": entity.get("type", ""),
                            "source": "knowledge_graph",
                        },
                    }
                )

            quality = calculate_result_quality(formatted_entities, expected_keywords)

            query_result["implementations"]["knowledge_graph"] = {
                "time": end_time - start_time,
                "result_count": len(formatted_entities),
                "quality": quality,
            }

            if verbose:
                logger.info(
                    f"Knowledge Graph: {len(formatted_entities)} results, quality: {quality['overall_quality']:.2f}"
                )

        # Test Enhanced Hybrid Search
        start_time = time.time()
        ehs_results = enhanced_hybrid_search.search(query, top_k=top_k, include_web=include_web)
        end_time = time.time()

        combined_results = ehs_results.get("combined", [])
        quality = calculate_result_quality(combined_results, expected_keywords)

        query_result["implementations"]["enhanced_hybrid_search"] = {
            "time": end_time - start_time,
            "result_count": len(combined_results),
            "quality": quality,
            "source_distribution": {
                "vector_search": len(ehs_results.get("vector_search", [])),
                "knowledge_graph": len(ehs_results.get("knowledge_graph", [])),
                "web_search": len(ehs_results.get("web_search", [])),
            },
        }

        if verbose:
            logger.info(
                f"Enhanced Hybrid Search: {len(combined_results)} results, quality: {quality['overall_quality']:.2f}"
            )

        # Test Enhanced Hybrid Search Optimized
        start_time = time.time()
        ehso_results = enhanced_hybrid_search_optimized.search(query, top_k=top_k, include_web=include_web)
        end_time = time.time()

        combined_results = ehso_results.get("combined", [])
        quality = calculate_result_quality(combined_results, expected_keywords)

        # Count sources in combined results
        source_counts = {}
        for result in combined_results:
            source = result.get("source", "unknown")
            source_counts[source] = source_counts.get(source, 0) + 1

        query_result["implementations"]["enhanced_hybrid_search_optimized"] = {
            "time": end_time - start_time,
            "result_count": len(combined_results),
            "quality": quality,
            "source_distribution": source_counts,
        }

        if verbose:
            logger.info(
                f"Enhanced Hybrid Search Optimized: {len(combined_results)} results, quality: {quality['overall_quality']:.2f}"
            )

        # Add query result to results
        results["query_results"].append(query_result)

    # Calculate summary statistics
    for implementation in [
        "vector_search",
        "knowledge_graph",
        "enhanced_hybrid_search",
        "enhanced_hybrid_search_optimized",
    ]:
        # Initialize category and difficulty dictionaries
        results["summary"][implementation]["by_category"] = {}
        results["summary"][implementation]["by_difficulty"] = {}

        # Collect quality and time data
        quality_sum = 0.0
        time_sum = 0.0
        count = 0

        category_data = {}
        difficulty_data = {}

        for query_result in results["query_results"]:
            if implementation in query_result["implementations"]:
                impl_data = query_result["implementations"][implementation]
                quality = impl_data["quality"]["overall_quality"]
                time_taken = impl_data["time"]

                quality_sum += quality
                time_sum += time_taken
                count += 1

                # Collect category data
                category = query_result["category"]
                if category not in category_data:
                    category_data[category] = {"quality_sum": 0.0, "count": 0}

                category_data[category]["quality_sum"] += quality
                category_data[category]["count"] += 1

                # Collect difficulty data
                difficulty = query_result["difficulty"]
                if difficulty not in difficulty_data:
                    difficulty_data[difficulty] = {"quality_sum": 0.0, "count": 0}

                difficulty_data[difficulty]["quality_sum"] += quality
                difficulty_data[difficulty]["count"] += 1

        # Calculate averages
        if count > 0:
            results["summary"][implementation]["average_quality"] = quality_sum / count
            results["summary"][implementation]["average_time"] = time_sum / count

        # Calculate category averages
        for category, data in category_data.items():
            if data["count"] > 0:
                results["summary"][implementation]["by_category"][category] = data["quality_sum"] / data["count"]

        # Calculate difficulty averages
        for difficulty, data in difficulty_data.items():
            if data["count"] > 0:
                results["summary"][implementation]["by_difficulty"][difficulty] = data["quality_sum"] / data["count"]

    return results


def generate_report(evaluation_results: Dict[str, Any], output_file: str):
    """Generate a Markdown report from evaluation results."""
    with open(output_file, "w") as f:
        # Write header
        f.write("# VANA Search Quality Evaluation Report\n\n")
        f.write(f"Generated on: {evaluation_results['timestamp']}\n\n")

        # Write summary
        f.write("## Summary\n\n")
        f.write("| Implementation | Average Quality | Average Time (s) |\n")
        f.write("|----------------|-----------------|------------------|\n")

        for implementation, data in evaluation_results["summary"].items():
            f.write(
                f"| {implementation.replace('_', ' ').title()} | {data['average_quality']:.2f} | {data['average_time']:.3f} |\n"
            )

        f.write("\n")

        # Write category breakdown
        f.write("## Quality by Category\n\n")
        f.write("| Category | Vector Search | Knowledge Graph | Enhanced Hybrid | Enhanced Hybrid Optimized |\n")
        f.write("|----------|---------------|-----------------|-----------------|---------------------------|\n")

        # Collect all categories
        categories = set()
        for implementation, data in evaluation_results["summary"].items():
            categories.update(data["by_category"].keys())

        for category in sorted(categories):
            f.write(f"| {category.title()} | ")

            for implementation in [
                "vector_search",
                "knowledge_graph",
                "enhanced_hybrid_search",
                "enhanced_hybrid_search_optimized",
            ]:
                quality = evaluation_results["summary"][implementation]["by_category"].get(category, 0.0)
                f.write(f"{quality:.2f} | ")

            f.write("\n")

        f.write("\n")

        # Write difficulty breakdown
        f.write("## Quality by Difficulty\n\n")
        f.write("| Difficulty | Vector Search | Knowledge Graph | Enhanced Hybrid | Enhanced Hybrid Optimized |\n")
        f.write("|------------|---------------|-----------------|-----------------|---------------------------|\n")

        # Collect all difficulties
        difficulties = set()
        for implementation, data in evaluation_results["summary"].items():
            difficulties.update(data["by_difficulty"].keys())

        for difficulty in ["easy", "medium", "hard"]:
            if difficulty in difficulties:
                f.write(f"| {difficulty.title()} | ")

                for implementation in [
                    "vector_search",
                    "knowledge_graph",
                    "enhanced_hybrid_search",
                    "enhanced_hybrid_search_optimized",
                ]:
                    quality = evaluation_results["summary"][implementation]["by_difficulty"].get(difficulty, 0.0)
                    f.write(f"{quality:.2f} | ")

                f.write("\n")

        f.write("\n")

        # Write detailed results
        f.write("## Detailed Results\n\n")

        for i, query_result in enumerate(evaluation_results["query_results"], 1):
            query = query_result["query"]
            category = query_result["category"]
            difficulty = query_result["difficulty"]

            f.write(f"### {i}. {query}\n\n")
            f.write(f"- Category: {category}\n")
            f.write(f"- Difficulty: {difficulty}\n")
            f.write(f"- Expected Keywords: {', '.join(query_result['expected_keywords'])}\n\n")

            f.write("| Implementation | Results | Time (s) | Keyword Coverage | Overall Quality |\n")
            f.write("|----------------|---------|----------|------------------|----------------|\n")

            for implementation, data in query_result["implementations"].items():
                result_count = data["result_count"]
                time_taken = data["time"]
                keyword_coverage = data["quality"]["keyword_coverage"]
                overall_quality = data["quality"]["overall_quality"]

                f.write(
                    f"| {implementation.replace('_', ' ').title()} | {result_count} | {time_taken:.3f} | {keyword_coverage:.2f} | {overall_quality:.2f} |\n"
                )

            f.write("\n")

    logger.info(f"Report generated: {output_file}")


def main():
    """Main function."""
    args = parse_arguments()

    # Load test queries
    test_queries = load_test_queries(args.queries)

    # Evaluate search implementations
    logger.info("Evaluating search implementations...")
    evaluation_results = evaluate_search_implementations(
        test_queries=test_queries,
        top_k=args.top_k,
        include_web=args.include_web,
        mock_web=args.mock_web,
        verbose=args.verbose,
    )

    # Generate report
    logger.info(f"Generating report: {args.output}")
    generate_report(evaluation_results, args.output)

    logger.info("Evaluation complete.")


if __name__ == "__main__":
    main()
