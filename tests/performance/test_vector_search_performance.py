"""
Performance Benchmark Tests for Vector Search

This module provides performance benchmarks for Vector Search operations, including:
- Health check latency
- Embedding generation performance
- Search operation performance
- Statistical analysis of performance metrics
"""

import logging
import os
import statistics
import sys
import time
from collections.abc import Callable
from typing import Any, Optional

import numpy as np
import pytest

# Add the project root to the Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the fixtures

# Import the actual implementations


class BenchmarkResult:
    """Class to store and analyze benchmark results"""

    def __init__(self, name: str, unit: str = "ms"):
        """
        Initialize a benchmark result container

        Args:
            name: Name of the benchmark
            unit: Unit of measurement (default: milliseconds)
        """
        self.name = name
        self.unit = unit
        self.measurements = []
        self.metadata = {}

    def add_measurement(self, value: float):
        """Add a measurement to the results"""
        self.measurements.append(value)

    def add_metadata(self, key: str, value: Any):
        """Add metadata to the results"""
        self.metadata[key] = value

    def get_statistics(self) -> dict[str, float]:
        """Calculate statistics for the measurements"""
        if not self.measurements:
            return {
                "count": 0,
                "min": 0,
                "max": 0,
                "mean": 0,
                "median": 0,
                "std_dev": 0,
                "p95": 0,
                "p99": 0,
            }

        measurements = sorted(self.measurements)
        count = len(measurements)

        return {
            "count": count,
            "min": min(measurements),
            "max": max(measurements),
            "mean": statistics.mean(measurements),
            "median": statistics.median(measurements),
            "std_dev": statistics.stdev(measurements) if count > 1 else 0,
            "p95": np.percentile(measurements, 95) if count >= 20 else measurements[-1],
            "p99": np.percentile(measurements, 99)
            if count >= 100
            else measurements[-1],
        }

    def __str__(self) -> str:
        """String representation of the benchmark results"""
        stats = self.get_statistics()
        return (
            f"Benchmark: {self.name}\n"
            f"  Count: {stats['count']}\n"
            f"  Min: {stats['min']:.2f} {self.unit}\n"
            f"  Max: {stats['max']:.2f} {self.unit}\n"
            f"  Mean: {stats['mean']:.2f} {self.unit}\n"
            f"  Median: {stats['median']:.2f} {self.unit}\n"
            f"  Std Dev: {stats['std_dev']:.2f} {self.unit}\n"
            f"  P95: {stats['p95']:.2f} {self.unit}\n"
            f"  P99: {stats['p99']:.2f} {self.unit}\n"
            f"  Metadata: {self.metadata}"
        )


def benchmark_function(func: Callable, *args, **kwargs) -> tuple[Any, float]:
    """
    Benchmark a function's execution time

    Args:
        func: Function to benchmark
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function

    Returns:
        Tuple of (function result, execution time in milliseconds)
    """
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()
    execution_time_ms = (end_time - start_time) * 1000
    return result, execution_time_ms


def run_benchmark(
    func: Callable,
    iterations: int = 10,
    warmup_iterations: int = 2,
    name: Optional[str] = None,
    *args,
    **kwargs,
) -> BenchmarkResult:
    """
    Run a benchmark on a function

    Args:
        func: Function to benchmark
        iterations: Number of iterations to run
        warmup_iterations: Number of warmup iterations (not included in results)
        name: Name of the benchmark (defaults to function name)
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function

    Returns:
        BenchmarkResult with statistics
    """
    benchmark_name = name or func.__name__
    result = BenchmarkResult(benchmark_name)

    # Run warmup iterations
    logger.info(f"Running {warmup_iterations} warmup iterations for {benchmark_name}")
    for _ in range(warmup_iterations):
        func(*args, **kwargs)

    # Run benchmark iterations
    logger.info(f"Running {iterations} benchmark iterations for {benchmark_name}")
    for i in range(iterations):
        _, execution_time = benchmark_function(func, *args, **kwargs)
        result.add_measurement(execution_time)
        if (i + 1) % 10 == 0:
            logger.info(f"Completed {i + 1}/{iterations} iterations")

    logger.info(f"Benchmark complete: {benchmark_name}")
    logger.info(str(result))
    return result


class TestVectorSearchPerformance:
    """Performance tests for Vector Search"""

    def test_health_check_latency(self, vector_search_health_checker):
        """Test the latency of health checks"""
        # Configure for consistent results
        result = run_benchmark(
            vector_search_health_checker.check_health,
            iterations=20,
            warmup_iterations=2,
            name="Health Check Latency",
        )

        # Basic assertions to ensure the benchmark ran
        assert result.get_statistics()["count"] == 20
        assert result.get_statistics()["mean"] > 0

    def test_embedding_generation_performance(self, mock_vector_search_client):
        """Test the performance of embedding generation"""
        # Configure for consistent results
        mock_vector_search_client.embedding_success = True

        # Test with different text lengths
        text_lengths = [10, 100, 1000]

        for length in text_lengths:
            test_text = "test " * length
            result = run_benchmark(
                mock_vector_search_client.generate_embedding,
                iterations=20,
                warmup_iterations=2,
                name=f"Embedding Generation (Length: {length})",
                text=test_text,
            )

            result.add_metadata("text_length", length)

            # Basic assertions to ensure the benchmark ran
            assert result.get_statistics()["count"] == 20
            assert result.get_statistics()["mean"] > 0

    def test_search_performance(self, mock_vector_search_client):
        """Test the performance of search operations"""
        # Configure for consistent results
        mock_vector_search_client.search_success = True

        # Test with different result sizes
        result_sizes = [5, 10, 20]

        for size in result_sizes:
            # Create mock results
            mock_vector_search_client.search_results = [
                {
                    "id": f"mock-id-{i}",
                    "score": 0.9 - (i * 0.01),
                    "content": f"Mock content for test query (result {i+1})",
                    "metadata": {"source": f"mock-source-{i}"},
                }
                for i in range(size)
            ]

            result = run_benchmark(
                mock_vector_search_client.search,
                iterations=20,
                warmup_iterations=2,
                name=f"Search Performance (Results: {size})",
                query="test query",
                top_k=size,
            )

            result.add_metadata("result_size", size)

            # Basic assertions to ensure the benchmark ran
            assert result.get_statistics()["count"] == 20
            assert result.get_statistics()["mean"] > 0

    @pytest.mark.skipif(
        not os.environ.get("RUN_REAL_PERFORMANCE_TESTS"),
        reason="Skipping real performance tests. Set RUN_REAL_PERFORMANCE_TESTS=1 to run.",
    )
    def test_real_client_performance(self, real_vector_search_client):
        """Test the performance of a real Vector Search client (optional)"""
        # Skip if the client is not available
        if not real_vector_search_client.is_available():
            pytest.skip("Real Vector Search client is not available")

        # Test embedding generation
        result = run_benchmark(
            real_vector_search_client.generate_embedding,
            iterations=5,
            warmup_iterations=1,
            name="Real Embedding Generation",
            text="This is a test query for real performance testing",
        )

        # Basic assertions to ensure the benchmark ran
        assert result.get_statistics()["count"] == 5
        assert result.get_statistics()["mean"] > 0

        # Test search
        result = run_benchmark(
            real_vector_search_client.search,
            iterations=5,
            warmup_iterations=1,
            name="Real Search Performance",
            query="test query",
            top_k=5,
        )

        # Basic assertions to ensure the benchmark ran
        assert result.get_statistics()["count"] == 5
        assert result.get_statistics()["mean"] > 0


if __name__ == "__main__":
    # Run the tests if this file is executed directly
    pytest.main(["-xvs", __file__])
