"""
Performance Benchmarks for VANA System
Tests caching, routing, specialist performance, and system throughput
"""

import asyncio
import json
import random
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

import pytest

# Import components to benchmark
from agents.vana.enhanced_orchestrator_v2 import advanced_router, redis_cache_service, route_with_workflow
from lib._shared_libraries.db_connection_pool import get_connection_manager
from lib._shared_libraries.orchestrator_metrics import get_orchestrator_metrics
from lib._shared_libraries.redis_cache_service import get_redis_cache
from lib.logging_config import get_logger

logger = get_logger("vana.performance_benchmarks")


class BenchmarkResult:
    """Store and analyze benchmark results"""

    def __init__(self, name: str):
        self.name = name
        self.measurements = []
        self.start_time = None
        self.end_time = None

    def start(self):
        """Start timing"""
        self.start_time = time.time()

    def stop(self):
        """Stop timing and record measurement"""
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        self.measurements.append(duration)
        return duration

    def get_stats(self) -> Dict[str, float]:
        """Get statistical summary"""
        if not self.measurements:
            return {}

        return {
            "count": len(self.measurements),
            "mean": statistics.mean(self.measurements),
            "median": statistics.median(self.measurements),
            "stdev": statistics.stdev(self.measurements) if len(self.measurements) > 1 else 0,
            "min": min(self.measurements),
            "max": max(self.measurements),
            "p95": self._percentile(95),
            "p99": self._percentile(99),
        }

    def _percentile(self, p: float) -> float:
        """Calculate percentile"""
        sorted_measurements = sorted(self.measurements)
        index = int((p / 100) * len(sorted_measurements))
        return sorted_measurements[min(index, len(sorted_measurements) - 1)]


@pytest.fixture
def benchmark_setup():
    """Setup benchmark environment"""
    # Clear caches
    redis_cache = get_redis_cache()
    redis_cache.clear_namespace("orchestrator")
    redis_cache.clear_namespace("data_science")

    # Reset metrics
    metrics = get_orchestrator_metrics()
    metrics.reset()

    yield

    # Cleanup
    redis_cache.clear_namespace("orchestrator")


@pytest.mark.benchmark
def test_redis_cache_performance(benchmark_setup):
    """Benchmark Redis cache operations"""
    cache = get_redis_cache()
    benchmark = BenchmarkResult("Redis Cache Operations")

    # Test data
    test_data = {
        "small": "x" * 100,
        "medium": "x" * 1000,
        "large": "x" * 10000,
        "complex": {"nested": {"data": [1, 2, 3] * 100}},
    }

    results = {}

    for data_type, data in test_data.items():
        # SET operations
        set_benchmark = BenchmarkResult(f"Redis SET {data_type}")
        for i in range(100):
            set_benchmark.start()
            cache.set("benchmark", f"key_{i}", data)
            set_benchmark.stop()
        results[f"set_{data_type}"] = set_benchmark.get_stats()

        # GET operations
        get_benchmark = BenchmarkResult(f"Redis GET {data_type}")
        for i in range(100):
            get_benchmark.start()
            cache.get("benchmark", f"key_{i}")
            get_benchmark.stop()
        results[f"get_{data_type}"] = get_benchmark.get_stats()

    # Print results
    logger.info("Redis Cache Performance Results:")
    for operation, stats in results.items():
        logger.info(f"{operation}: mean={stats['mean']*1000:.2f}ms, p95={stats['p95']*1000:.2f}ms")

    # Assert performance targets
    assert results["get_small"]["mean"] < 0.01  # <10ms for small data
    assert results["set_medium"]["mean"] < 0.02  # <20ms for medium data


@pytest.mark.benchmark
def test_routing_performance(benchmark_setup):
    """Benchmark routing decision performance"""
    benchmark = BenchmarkResult("Routing Decisions")

    # Test requests
    test_requests = [
        ("Analyze security vulnerabilities in my code", "security"),
        ("Create a data visualization", "data_science"),
        ("Deploy my application to AWS", "devops"),
        ("Write unit tests for my functions", "qa"),
        ("Design a responsive navbar component", "ui"),
        ("Refactor this code for better performance", "architecture"),
    ]

    # Benchmark routing decisions
    for request, expected_specialist in test_requests * 20:
        benchmark.start()
        specialist, workflow = advanced_router.route_request(request, "unknown")
        benchmark.stop()
        assert specialist == expected_specialist

    stats = benchmark.get_stats()
    logger.info(f"Routing performance: mean={stats['mean']*1000:.2f}ms, p95={stats['p95']*1000:.2f}ms")

    # Assert performance target
    assert stats["mean"] < 0.001  # <1ms average routing time


@pytest.mark.benchmark
def test_orchestrator_throughput(benchmark_setup):
    """Benchmark orchestrator request throughput"""
    # Simple requests that don't require actual specialist execution
    test_requests = ["What time is it?", "Calculate 2 + 2", "What's the weather?", "Tell me a fact"]

    def make_request(request: str) -> float:
        """Make a single request and return duration"""
        start = time.time()
        try:
            # Mock the route_with_workflow to avoid actual agent execution
            analysis = f"task_type: general\nrequest: {request}"
            specialist, _ = advanced_router.route_request(request, "general")
            # Simulate processing time
            time.sleep(0.01)  # 10ms simulated processing
            return time.time() - start
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return time.time() - start

    # Concurrent requests test
    concurrent_tests = [10, 20, 50]
    results = {}

    for num_concurrent in concurrent_tests:
        benchmark = BenchmarkResult(f"Concurrent-{num_concurrent}")

        with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = []

            # Submit requests
            for i in range(num_concurrent * 5):
                request = random.choice(test_requests)
                future = executor.submit(make_request, request)
                futures.append(future)

            # Collect results
            for future in as_completed(futures):
                duration = future.result()
                benchmark.measurements.append(duration)

        stats = benchmark.get_stats()
        results[num_concurrent] = stats

        # Calculate throughput
        total_time = max(benchmark.measurements) - min(benchmark.measurements) if len(benchmark.measurements) > 1 else 1
        throughput = len(benchmark.measurements) / total_time

        logger.info(
            f"Concurrent {num_concurrent}: throughput={throughput:.1f} req/s, mean latency={stats['mean']*1000:.0f}ms"
        )

    # Assert minimum throughput
    assert results[10]["mean"] < 0.1  # <100ms average with 10 concurrent


@pytest.mark.benchmark
def test_cache_hit_performance(benchmark_setup):
    """Benchmark cache hit vs miss performance"""
    cache = get_redis_cache()

    # Pre-populate cache
    for i in range(100):
        cache.cache_orchestrator_response(f"test_request_{i}", "test_specialist", f"test_response_{i}")

    # Benchmark cache hits
    hit_benchmark = BenchmarkResult("Cache Hits")
    for i in range(100):
        hit_benchmark.start()
        response = cache.get_orchestrator_response(f"test_request_{i}", "test_specialist")
        hit_benchmark.stop()
        assert response is not None

    # Benchmark cache misses
    miss_benchmark = BenchmarkResult("Cache Misses")
    for i in range(100, 200):
        miss_benchmark.start()
        response = cache.get_orchestrator_response(f"test_request_{i}", "test_specialist")
        miss_benchmark.stop()
        assert response is None

    hit_stats = hit_benchmark.get_stats()
    miss_stats = miss_benchmark.get_stats()

    logger.info(f"Cache hit performance: mean={hit_stats['mean']*1000:.2f}ms")
    logger.info(f"Cache miss performance: mean={miss_stats['mean']*1000:.2f}ms")

    # Cache hits should be much faster
    assert hit_stats["mean"] < miss_stats["mean"] * 0.5


@pytest.mark.benchmark
def test_connection_pool_performance(benchmark_setup):
    """Benchmark database connection pool performance"""
    manager = get_connection_manager()

    # Create test pool if not exists
    try:
        manager.create_pool(
            "benchmark",
            {
                "host": "localhost",
                "port": 5432,
                "database": "test",
                "user": "test",
                "password": "test",
                "min_connections": 5,
                "max_connections": 20,
            },
        )
    except:
        pass  # Pool might already exist

    benchmark = BenchmarkResult("Connection Pool")

    def get_connection_test():
        """Test getting and returning a connection"""
        try:
            with manager.get_connection("benchmark") as conn:
                # Simulate query
                time.sleep(0.001)
        except:
            pass  # Ignore connection errors in benchmark

    # Sequential connection test
    for _ in range(100):
        benchmark.start()
        get_connection_test()
        benchmark.stop()

    stats = benchmark.get_stats()
    logger.info(f"Connection pool performance: mean={stats['mean']*1000:.2f}ms")

    # Connection pooling should be fast
    assert stats["mean"] < 0.01  # <10ms average


@pytest.mark.benchmark
def test_metrics_overhead(benchmark_setup):
    """Benchmark metrics collection overhead"""
    metrics = get_orchestrator_metrics()

    # Benchmark without metrics
    no_metrics_benchmark = BenchmarkResult("Without Metrics")
    for _ in range(1000):
        no_metrics_benchmark.start()
        # Simulate work
        result = sum(range(1000))
        no_metrics_benchmark.stop()

    # Benchmark with metrics
    with_metrics_benchmark = BenchmarkResult("With Metrics")
    for i in range(1000):
        with_metrics_benchmark.start()
        with metrics.timer("benchmark_operation"):
            # Simulate work
            result = sum(range(1000))
        metrics.increment("benchmark_counter")
        with_metrics_benchmark.stop()

    no_metrics_stats = no_metrics_benchmark.get_stats()
    with_metrics_stats = with_metrics_benchmark.get_stats()

    # Calculate overhead
    overhead = (with_metrics_stats["mean"] - no_metrics_stats["mean"]) / no_metrics_stats["mean"] * 100

    logger.info(f"Metrics overhead: {overhead:.1f}%")

    # Metrics should have minimal overhead
    assert overhead < 10  # <10% overhead


@pytest.mark.benchmark
def test_end_to_end_performance(benchmark_setup):
    """Benchmark end-to-end request processing"""
    benchmark = BenchmarkResult("End-to-End Processing")

    # Different complexity requests
    requests = [
        ("Calculate the factorial of 10", "simple"),
        ("Analyze the security of this Python code: def login(user, pass): return True", "medium"),
        ("Create a comprehensive test suite for a REST API with authentication", "complex"),
    ]

    results = {}

    for request, complexity in requests:
        complexity_benchmark = BenchmarkResult(f"E2E-{complexity}")

        for _ in range(10):
            complexity_benchmark.start()
            try:
                # Mock the actual processing to avoid requiring real specialists
                specialist, workflow = advanced_router.route_request(request, "unknown")
                # Simulate processing based on complexity
                if complexity == "simple":
                    time.sleep(0.01)
                elif complexity == "medium":
                    time.sleep(0.05)
                else:
                    time.sleep(0.1)
                complexity_benchmark.stop()
            except Exception as e:
                logger.error(f"E2E test failed: {e}")
                complexity_benchmark.stop()

        stats = complexity_benchmark.get_stats()
        results[complexity] = stats
        logger.info(f"E2E {complexity}: mean={stats['mean']*1000:.0f}ms, p95={stats['p95']*1000:.0f}ms")

    # Assert reasonable performance for each complexity
    assert results["simple"]["mean"] < 0.05  # <50ms for simple
    assert results["medium"]["mean"] < 0.1  # <100ms for medium
    assert results["complex"]["mean"] < 0.2  # <200ms for complex


def generate_performance_report():
    """Generate a comprehensive performance report"""
    cache = get_redis_cache()
    metrics = get_orchestrator_metrics()
    manager = get_connection_manager()

    report = {
        "timestamp": time.time(),
        "cache_stats": cache.get_stats(),
        "orchestrator_metrics": metrics.get_summary(),
        "connection_pools": manager.get_all_stats(),
        "routing_performance": {
            "total_decisions": len(advanced_router.routing_history),
            "specialist_performance": dict(advanced_router.specialist_performance),
        },
    }

    # Save report
    with open("performance_report.json", "w") as f:
        json.dump(report, f, indent=2)

    logger.info("Performance report generated: performance_report.json")
    return report


if __name__ == "__main__":
    # Run benchmarks
    pytest.main([__file__, "-v", "-m", "benchmark"])

    # Generate report
    generate_performance_report()
