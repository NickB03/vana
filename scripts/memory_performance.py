#!/usr/bin/env python3
"""
Memory Performance Measurement Tool

This script measures the performance of the memory system, including
latency, throughput, and resource usage for different operations.
"""

import argparse
import json
import logging
import os
import random
import string
import sys
import time
from datetime import datetime
from typing import Any, Optional

import matplotlib.pyplot as plt
import psutil

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import components
try:
    from config.environment import EnvironmentConfig
    from tools.mcp_memory_client import MCPMemoryClient
    from tools.memory_cache import MemoryCache
    from tools.memory_manager import MemoryManager
except ImportError as e:
    logger.error(f"Error importing required components: {e}")
    logger.error(
        "Make sure you're running this script from the project root directory."
    )
    sys.exit(1)


def generate_random_text(length: int = 100) -> str:
    """
    Generate random text for testing.

    Args:
        length: Length of text to generate

    Returns:
        Random text
    """
    words = []
    word_length = 5
    for _ in range(length // (word_length + 1)):
        word = "".join(random.choices(string.ascii_lowercase, k=random.randint(3, 8)))
        words.append(word)
    return " ".join(words)


def measure_operation(func, *args, **kwargs) -> dict[str, Any]:
    """
    Measure performance of an operation.

    Args:
        func: Function to measure
        *args: Arguments for function
        **kwargs: Keyword arguments for function

    Returns:
        Dict with performance metrics
    """
    # Get initial resource usage
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB

    # Measure time
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()

    # Get final resource usage
    final_memory = process.memory_info().rss / 1024 / 1024  # MB

    # Calculate metrics
    latency = (end_time - start_time) * 1000  # ms
    memory_delta = final_memory - initial_memory  # MB

    return {
        "latency_ms": latency,
        "memory_delta_mb": memory_delta,
        "success": result is not None
        and not (isinstance(result, dict) and "error" in result),
    }


def benchmark_store_entity(
    memory_manager: MemoryManager, count: int = 10
) -> dict[str, Any]:
    """
    Benchmark entity storage.

    Args:
        memory_manager: Memory manager instance
        count: Number of entities to store

    Returns:
        Dict with benchmark results
    """
    logger.info(f"Benchmarking entity storage ({count} entities)...")

    results = []

    for i in range(count):
        entity_name = f"Benchmark Entity {i}_{int(time.time())}"
        entity_type = "Benchmark"
        observations = [f"This is a benchmark entity {i}", generate_random_text(200)]

        # Measure store operation
        metrics = measure_operation(
            memory_manager.store_entity, entity_name, entity_type, observations
        )

        results.append(metrics)

        # Small delay to avoid overwhelming the server
        time.sleep(0.1)

    # Calculate aggregate metrics
    success_count = sum(1 for r in results if r["success"])
    latencies = [r["latency_ms"] for r in results if r["success"]]
    memory_deltas = [r["memory_delta_mb"] for r in results if r["success"]]

    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
    else:
        avg_latency = min_latency = max_latency = p95_latency = 0

    return {
        "operation": "store_entity",
        "count": count,
        "success_count": success_count,
        "success_rate": success_count / count if count > 0 else 0,
        "avg_latency_ms": avg_latency,
        "min_latency_ms": min_latency,
        "max_latency_ms": max_latency,
        "p95_latency_ms": p95_latency,
        "avg_memory_delta_mb": sum(memory_deltas) / len(memory_deltas)
        if memory_deltas
        else 0,
        "raw_results": results,
    }


def benchmark_retrieve_entity(
    memory_manager: MemoryManager, entities: list[str]
) -> dict[str, Any]:
    """
    Benchmark entity retrieval.

    Args:
        memory_manager: Memory manager instance
        entities: List of entity names to retrieve

    Returns:
        Dict with benchmark results
    """
    logger.info(f"Benchmarking entity retrieval ({len(entities)} entities)...")

    results = []

    for entity_name in entities:
        # Measure retrieve operation
        metrics = measure_operation(memory_manager.retrieve_entity, entity_name)

        results.append(metrics)

        # Small delay to avoid overwhelming the server
        time.sleep(0.1)

    # Calculate aggregate metrics
    count = len(entities)
    success_count = sum(1 for r in results if r["success"])
    latencies = [r["latency_ms"] for r in results if r["success"]]
    memory_deltas = [r["memory_delta_mb"] for r in results if r["success"]]

    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        p95_latency = (
            sorted(latencies)[int(len(latencies) * 0.95)]
            if len(latencies) > 1
            else max_latency
        )
    else:
        avg_latency = min_latency = max_latency = p95_latency = 0

    return {
        "operation": "retrieve_entity",
        "count": count,
        "success_count": success_count,
        "success_rate": success_count / count if count > 0 else 0,
        "avg_latency_ms": avg_latency,
        "min_latency_ms": min_latency,
        "max_latency_ms": max_latency,
        "p95_latency_ms": p95_latency,
        "avg_memory_delta_mb": sum(memory_deltas) / len(memory_deltas)
        if memory_deltas
        else 0,
        "raw_results": results,
    }


def benchmark_search_entities(
    memory_manager: MemoryManager, queries: list[str]
) -> dict[str, Any]:
    """
    Benchmark entity search.

    Args:
        memory_manager: Memory manager instance
        queries: List of search queries

    Returns:
        Dict with benchmark results
    """
    logger.info(f"Benchmarking entity search ({len(queries)} queries)...")

    results = []

    for query in queries:
        # Measure search operation
        metrics = measure_operation(memory_manager.search_entities, query)

        results.append(metrics)

        # Small delay to avoid overwhelming the server
        time.sleep(0.1)

    # Calculate aggregate metrics
    count = len(queries)
    success_count = sum(1 for r in results if r["success"])
    latencies = [r["latency_ms"] for r in results if r["success"]]
    memory_deltas = [r["memory_delta_mb"] for r in results if r["success"]]

    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        p95_latency = (
            sorted(latencies)[int(len(latencies) * 0.95)]
            if len(latencies) > 1
            else max_latency
        )
    else:
        avg_latency = min_latency = max_latency = p95_latency = 0

    return {
        "operation": "search_entities",
        "count": count,
        "success_count": success_count,
        "success_rate": success_count / count if count > 0 else 0,
        "avg_latency_ms": avg_latency,
        "min_latency_ms": min_latency,
        "max_latency_ms": max_latency,
        "p95_latency_ms": p95_latency,
        "avg_memory_delta_mb": sum(memory_deltas) / len(memory_deltas)
        if memory_deltas
        else 0,
        "raw_results": results,
    }


def benchmark_sync(memory_manager: MemoryManager, count: int = 5) -> dict[str, Any]:
    """
    Benchmark synchronization.

    Args:
        memory_manager: Memory manager instance
        count: Number of sync operations to perform

    Returns:
        Dict with benchmark results
    """
    logger.info(f"Benchmarking synchronization ({count} operations)...")

    results = []

    for _ in range(count):
        # Measure sync operation
        metrics = measure_operation(memory_manager.sync)

        results.append(metrics)

        # Small delay to avoid overwhelming the server
        time.sleep(1)

    # Calculate aggregate metrics
    success_count = sum(1 for r in results if r["success"])
    latencies = [r["latency_ms"] for r in results if r["success"]]
    memory_deltas = [r["memory_delta_mb"] for r in results if r["success"]]

    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        p95_latency = (
            sorted(latencies)[int(len(latencies) * 0.95)]
            if len(latencies) > 1
            else max_latency
        )
    else:
        avg_latency = min_latency = max_latency = p95_latency = 0

    return {
        "operation": "sync",
        "count": count,
        "success_count": success_count,
        "success_rate": success_count / count if count > 0 else 0,
        "avg_latency_ms": avg_latency,
        "min_latency_ms": min_latency,
        "max_latency_ms": max_latency,
        "p95_latency_ms": p95_latency,
        "avg_memory_delta_mb": sum(memory_deltas) / len(memory_deltas)
        if memory_deltas
        else 0,
        "raw_results": results,
    }


def benchmark_memory_cache(cache_size: int = 1000, ttl: int = 3600) -> dict[str, Any]:
    """
    Benchmark memory cache.

    Args:
        cache_size: Maximum cache size
        ttl: Cache TTL in seconds

    Returns:
        Dict with benchmark results
    """
    logger.info(f"Benchmarking memory cache (size={cache_size}, ttl={ttl})...")

    # Initialize cache
    memory_cache = MemoryCache(max_size=cache_size, ttl=ttl)

    # Generate test data
    test_data = []
    for i in range(cache_size * 2):
        key = f"test_key_{i}"
        value = {
            "name": f"Test Entity {i}",
            "type": "Test",
            "observations": [generate_random_text(100)],
        }
        test_data.append((key, value))

    # Benchmark set operation
    set_results = []
    for key, value in test_data[:cache_size]:
        metrics = measure_operation(memory_cache.set, key, value)
        set_results.append(metrics)

    # Benchmark get operation (cache hits)
    get_hit_results = []
    for key, _ in test_data[:cache_size]:
        metrics = measure_operation(memory_cache.get, key)
        get_hit_results.append(metrics)

    # Benchmark get operation (cache misses)
    get_miss_results = []
    for key, _ in test_data[cache_size : cache_size * 2]:
        metrics = measure_operation(memory_cache.get, key)
        get_miss_results.append(metrics)

    # Calculate aggregate metrics
    set_latencies = [r["latency_ms"] for r in set_results if r["success"]]
    get_hit_latencies = [r["latency_ms"] for r in get_hit_results if r["success"]]
    get_miss_latencies = [r["latency_ms"] for r in get_miss_results if r["success"]]

    return {
        "operation": "memory_cache",
        "cache_size": cache_size,
        "ttl": ttl,
        "set_avg_latency_ms": sum(set_latencies) / len(set_latencies)
        if set_latencies
        else 0,
        "get_hit_avg_latency_ms": sum(get_hit_latencies) / len(get_hit_latencies)
        if get_hit_latencies
        else 0,
        "get_miss_avg_latency_ms": sum(get_miss_latencies) / len(get_miss_latencies)
        if get_miss_latencies
        else 0,
        "cache_stats": memory_cache.get_stats(),
    }


def run_benchmarks(args) -> dict[str, Any]:
    """
    Run all benchmarks.

    Args:
        args: Command line arguments

    Returns:
        Dict with benchmark results
    """
    logger.info("Initializing memory components...")

    # Initialize components
    mcp_client = MCPMemoryClient()
    memory_manager = MemoryManager(mcp_client)

    # Initialize memory manager
    init_result = memory_manager.initialize()

    if not init_result:
        logger.error("Failed to initialize memory manager")
        return {"error": "Failed to initialize memory manager"}

    # Run benchmarks
    results = {
        "timestamp": datetime.now().isoformat(),
        "environment": os.environ.get("VANA_ENV", "development"),
        "mcp_available": memory_manager.mcp_available,
    }

    # Store entity benchmark
    store_results = benchmark_store_entity(memory_manager, args.entity_count)
    results["store_entity"] = store_results

    # Get entity names for retrieval benchmark
    entity_names = []
    for i in range(min(args.entity_count, 10)):
        entity_name = f"Benchmark Entity {i}_{int(time.time())}"
        entity_names.append(entity_name)

    # Retrieve entity benchmark
    retrieve_results = benchmark_retrieve_entity(memory_manager, entity_names)
    results["retrieve_entity"] = retrieve_results

    # Generate search queries
    search_queries = ["Benchmark", "Entity", "Test", "Random"]

    # Search entities benchmark
    search_results = benchmark_search_entities(memory_manager, search_queries)
    results["search_entities"] = search_results

    # Sync benchmark
    sync_results = benchmark_sync(memory_manager, args.sync_count)
    results["sync"] = sync_results

    # Memory cache benchmark
    cache_results = benchmark_memory_cache(args.cache_size, args.cache_ttl)
    results["memory_cache"] = cache_results

    return results


def generate_report(results: dict[str, Any], output_file: Optional[str] = None) -> None:
    """
    Generate performance report.

    Args:
        results: Benchmark results
        output_file: Output file path for report
    """
    logger.info("Generating performance report...")

    # Create report
    report = []

    report.append("# Memory System Performance Report")
    report.append(f"Generated: {results['timestamp']}")
    report.append(f"Environment: {results['environment']}")
    report.append(f"MCP Available: {results['mcp_available']}")
    report.append("")

    # Store entity results
    store_results = results["store_entity"]
    report.append("## Entity Storage Performance")
    report.append(f"- Count: {store_results['count']}")
    report.append(f"- Success Rate: {store_results['success_rate']:.2%}")
    report.append(f"- Average Latency: {store_results['avg_latency_ms']:.2f} ms")
    report.append(f"- Min Latency: {store_results['min_latency_ms']:.2f} ms")
    report.append(f"- Max Latency: {store_results['max_latency_ms']:.2f} ms")
    report.append(f"- P95 Latency: {store_results['p95_latency_ms']:.2f} ms")
    report.append("")

    # Retrieve entity results
    retrieve_results = results["retrieve_entity"]
    report.append("## Entity Retrieval Performance")
    report.append(f"- Count: {retrieve_results['count']}")
    report.append(f"- Success Rate: {retrieve_results['success_rate']:.2%}")
    report.append(f"- Average Latency: {retrieve_results['avg_latency_ms']:.2f} ms")
    report.append(f"- Min Latency: {retrieve_results['min_latency_ms']:.2f} ms")
    report.append(f"- Max Latency: {retrieve_results['max_latency_ms']:.2f} ms")
    report.append(f"- P95 Latency: {retrieve_results['p95_latency_ms']:.2f} ms")
    report.append("")

    # Search entities results
    search_results = results["search_entities"]
    report.append("## Entity Search Performance")
    report.append(f"- Count: {search_results['count']}")
    report.append(f"- Success Rate: {search_results['success_rate']:.2%}")
    report.append(f"- Average Latency: {search_results['avg_latency_ms']:.2f} ms")
    report.append(f"- Min Latency: {search_results['min_latency_ms']:.2f} ms")
    report.append(f"- Max Latency: {search_results['max_latency_ms']:.2f} ms")
    report.append(f"- P95 Latency: {search_results['p95_latency_ms']:.2f} ms")
    report.append("")

    # Sync results
    sync_results = results["sync"]
    report.append("## Synchronization Performance")
    report.append(f"- Count: {sync_results['count']}")
    report.append(f"- Success Rate: {sync_results['success_rate']:.2%}")
    report.append(f"- Average Latency: {sync_results['avg_latency_ms']:.2f} ms")
    report.append(f"- Min Latency: {sync_results['min_latency_ms']:.2f} ms")
    report.append(f"- Max Latency: {sync_results['max_latency_ms']:.2f} ms")
    report.append(f"- P95 Latency: {sync_results['p95_latency_ms']:.2f} ms")
    report.append("")

    # Memory cache results
    cache_results = results["memory_cache"]
    report.append("## Memory Cache Performance")
    report.append(f"- Cache Size: {cache_results['cache_size']}")
    report.append(f"- TTL: {cache_results['ttl']} seconds")
    report.append(
        f"- Set Operation Latency: {cache_results['set_avg_latency_ms']:.2f} ms"
    )
    report.append(
        f"- Get Operation Latency (Hit): {cache_results['get_hit_avg_latency_ms']:.2f} ms"
    )
    report.append(
        f"- Get Operation Latency (Miss): {cache_results['get_miss_avg_latency_ms']:.2f} ms"
    )
    report.append("")

    # Cache stats
    cache_stats = cache_results["cache_stats"]
    report.append("### Cache Statistics")
    report.append(f"- Size: {cache_stats.get('size', 0)}")
    report.append(f"- Hit Count: {cache_stats.get('hit_count', 0)}")
    report.append(f"- Miss Count: {cache_stats.get('miss_count', 0)}")
    report.append(f"- Hit Ratio: {cache_stats.get('hit_ratio', 0):.2%}")
    report.append("")

    # Write report to file if specified
    if output_file:
        with open(output_file, "w") as f:
            f.write("\n".join(report))
        logger.info(f"Report written to {output_file}")
    else:
        print("\n".join(report))


def generate_charts(results: dict[str, Any], output_dir: str) -> None:
    """
    Generate performance charts.

    Args:
        results: Benchmark results
        output_dir: Output directory for charts
    """
    logger.info("Generating performance charts...")

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Latency comparison chart
    plt.figure(figsize=(10, 6))
    operations = ["store_entity", "retrieve_entity", "search_entities", "sync"]
    avg_latencies = [results[op]["avg_latency_ms"] for op in operations]
    p95_latencies = [results[op]["p95_latency_ms"] for op in operations]

    x = range(len(operations))
    width = 0.35

    plt.bar(x, avg_latencies, width, label="Average Latency")
    plt.bar([i + width for i in x], p95_latencies, width, label="P95 Latency")

    plt.xlabel("Operation")
    plt.ylabel("Latency (ms)")
    plt.title("Memory System Operation Latency")
    plt.xticks(
        [i + width / 2 for i in x], [op.replace("_", " ").title() for op in operations]
    )
    plt.legend()

    plt.savefig(os.path.join(output_dir, "latency_comparison.png"))

    # Success rate chart
    plt.figure(figsize=(10, 6))
    success_rates = [results[op]["success_rate"] * 100 for op in operations]

    plt.bar(x, success_rates)

    plt.xlabel("Operation")
    plt.ylabel("Success Rate (%)")
    plt.title("Memory System Operation Success Rate")
    plt.xticks(x, [op.replace("_", " ").title() for op in operations])

    plt.savefig(os.path.join(output_dir, "success_rate.png"))

    # Cache performance chart
    plt.figure(figsize=(10, 6))
    cache_results = results["memory_cache"]
    cache_latencies = [
        cache_results["set_avg_latency_ms"],
        cache_results["get_hit_avg_latency_ms"],
        cache_results["get_miss_avg_latency_ms"],
    ]
    cache_operations = ["Set", "Get (Hit)", "Get (Miss)"]

    plt.bar(range(len(cache_operations)), cache_latencies)

    plt.xlabel("Operation")
    plt.ylabel("Latency (ms)")
    plt.title("Memory Cache Performance")
    plt.xticks(range(len(cache_operations)), cache_operations)

    plt.savefig(os.path.join(output_dir, "cache_performance.png"))

    logger.info(f"Charts saved to {output_dir}")


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Memory Performance Measurement Tool")

    parser.add_argument(
        "--entity-count",
        type=int,
        default=10,
        help="Number of entities to create for store benchmark",
    )
    parser.add_argument(
        "--sync-count", type=int, default=5, help="Number of sync operations to perform"
    )
    parser.add_argument(
        "--cache-size", type=int, default=1000, help="Cache size for cache benchmark"
    )
    parser.add_argument(
        "--cache-ttl", type=int, default=3600, help="Cache TTL for cache benchmark"
    )
    parser.add_argument("--output", "-o", help="Output file for report")
    parser.add_argument("--charts", help="Output directory for charts")
    parser.add_argument("--json", help="Output file for JSON results")

    return parser.parse_args()


def main():
    """Main function."""
    args = parse_args()

    logger.info("=== Memory Performance Measurement Tool ===\n")

    # Run benchmarks
    results = run_benchmarks(args)

    if "error" in results:
        logger.error(f"Error running benchmarks: {results['error']}")
        return 1

    # Generate report
    generate_report(results, args.output)

    # Generate charts if requested
    if args.charts:
        try:
            generate_charts(results, args.charts)
        except Exception as e:
            logger.error(f"Error generating charts: {e}")

    # Save JSON results if requested
    if args.json:
        try:
            with open(args.json, "w") as f:
                json.dump(results, f, indent=2)
            logger.info(f"JSON results saved to {args.json}")
        except Exception as e:
            logger.error(f"Error saving JSON results: {e}")

    logger.info("\n=== Performance Measurement Complete ===")

    return 0


if __name__ == "__main__":
    sys.exit(main())
