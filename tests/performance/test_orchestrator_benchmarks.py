"""
Performance Benchmarks for VANA Orchestrator
Measures response times, throughput, and resource usage
"""

import json
import statistics
import time
from pathlib import Path
from typing import Dict, List

import pytest

from agents.vana.enhanced_orchestrator import (
    analyze_and_route,
    cached_route_to_specialist,
    get_orchestrator_stats,
    orchestrator_cache,
    route_to_specialist,
)


class BenchmarkResults:
    """Collect and analyze benchmark results"""

    def __init__(self, name: str):
        self.name = name
        self.timings: List[float] = []
        self.errors: int = 0
        self.start_time = time.time()

    def add_timing(self, duration: float):
        """Add a timing measurement"""
        self.timings.append(duration)

    def add_error(self):
        """Record an error"""
        self.errors += 1

    def get_stats(self) -> Dict[str, float]:
        """Calculate statistics"""
        if not self.timings:
            return {"error": "No timings recorded"}

        return {
            "name": self.name,
            "total_runs": len(self.timings),
            "errors": self.errors,
            "mean": statistics.mean(self.timings),
            "median": statistics.median(self.timings),
            "min": min(self.timings),
            "max": max(self.timings),
            "stdev": statistics.stdev(self.timings) if len(self.timings) > 1 else 0,
            "percentile_95": sorted(self.timings)[int(len(self.timings) * 0.95)] if self.timings else 0,
            "total_time": time.time() - self.start_time,
        }

    def print_report(self):
        """Print formatted report"""
        stats = self.get_stats()
        print(f"\n=== Benchmark: {self.name} ===")
        print(f"Total runs: {stats.get('total_runs', 0)}")
        print(f"Errors: {stats.get('errors', 0)}")
        print(f"Mean: {stats.get('mean', 0):.3f}s")
        print(f"Median: {stats.get('median', 0):.3f}s")
        print(f"Min: {stats.get('min', 0):.3f}s")
        print(f"Max: {stats.get('max', 0):.3f}s")
        print(f"StdDev: {stats.get('stdev', 0):.3f}s")
        print(f"95th percentile: {stats.get('percentile_95', 0):.3f}s")
        print(f"Total time: {stats.get('total_time', 0):.2f}s")


class TestOrchestratorBenchmarks:
    """Performance benchmarks for the orchestrator"""

    def setup_method(self):
        """Reset state before benchmarks"""
        orchestrator_cache.cache.clear()
        orchestrator_cache.hits = 0
        orchestrator_cache.misses = 0

    @pytest.mark.benchmark
    def test_routing_performance(self):
        """Benchmark basic routing performance"""
        benchmark = BenchmarkResults("Basic Routing")

        test_cases = [
            ("Check for SQL injection", "security_scan"),
            ("Review architecture patterns", "architecture_review"),
            ("Analyze this dataset", "data_analysis"),
            ("Setup Docker deployment", "deployment"),
        ]

        # Run each test case 10 times
        for _ in range(10):
            for query, task_type in test_cases:
                start = time.time()
                try:
                    result = route_to_specialist(query, task_type)
                    duration = time.time() - start
                    benchmark.add_timing(duration)
                except Exception:
                    benchmark.add_error()

        benchmark.print_report()

        # Assert performance requirements
        stats = benchmark.get_stats()
        assert stats["mean"] < 1.0  # Average under 1 second
        assert stats["percentile_95"] < 2.0  # 95% under 2 seconds

    @pytest.mark.benchmark
    def test_analysis_routing_performance(self):
        """Benchmark full analysis and routing"""
        benchmark = BenchmarkResults("Analysis + Routing")

        queries = [
            "Find security vulnerabilities in my Python code",
            "What's the best architecture for microservices?",
            "Analyze customer churn data and predict trends",
            "Create a CI/CD pipeline with GitHub Actions",
        ]

        # Run each query 5 times
        for _ in range(5):
            for query in queries:
                start = time.time()
                try:
                    result = analyze_and_route(query)
                    duration = time.time() - start
                    benchmark.add_timing(duration)
                except Exception:
                    benchmark.add_error()

        benchmark.print_report()

        # Performance assertions
        stats = benchmark.get_stats()
        assert stats["mean"] < 2.0  # Average under 2 seconds
        assert stats["errors"] == 0  # No errors expected

    @pytest.mark.benchmark
    def test_cache_performance(self):
        """Benchmark cache hit vs miss performance"""
        cold_benchmark = BenchmarkResults("Cache Miss (Cold)")
        warm_benchmark = BenchmarkResults("Cache Hit (Warm)")

        queries = [
            ("Security scan needed", "security_scan"),
            ("Architecture review", "architecture_review"),
            ("Data analysis task", "data_analysis"),
        ]

        # Cold cache runs
        for query, task_type in queries:
            start = time.time()
            try:
                result = cached_route_to_specialist(query, task_type)
                duration = time.time() - start
                cold_benchmark.add_timing(duration)
            except Exception:
                cold_benchmark.add_error()

        # Warm cache runs (same queries)
        for query, task_type in queries:
            start = time.time()
            try:
                result = cached_route_to_specialist(query, task_type)
                duration = time.time() - start
                warm_benchmark.add_timing(duration)
            except Exception:
                warm_benchmark.add_error()

        cold_benchmark.print_report()
        warm_benchmark.print_report()

        # Cache should be significantly faster
        cold_stats = cold_benchmark.get_stats()
        warm_stats = warm_benchmark.get_stats()

        # Warm cache should be at least 50% faster
        assert warm_stats["mean"] < cold_stats["mean"] * 0.5

    @pytest.mark.benchmark
    def test_specialist_response_times(self):
        """Benchmark individual specialist response times"""
        specialists = {
            "security": ("Check for vulnerabilities", "security_scan"),
            "architecture": ("Review code structure", "architecture_review"),
            "data_science": ("Analyze dataset", "data_analysis"),
            "devops": ("Setup deployment", "deployment"),
        }

        results = {}

        for name, (query, task_type) in specialists.items():
            benchmark = BenchmarkResults(f"{name.title()} Specialist")

            # Run 20 times for each specialist
            for _ in range(20):
                start = time.time()
                try:
                    result = route_to_specialist(query, task_type)
                    duration = time.time() - start
                    benchmark.add_timing(duration)
                except Exception:
                    benchmark.add_error()

            benchmark.print_report()
            results[name] = benchmark.get_stats()

        # All specialists should respond quickly
        for name, stats in results.items():
            assert stats["mean"] < 1.5  # Average under 1.5 seconds
            assert stats["max"] < 3.0  # Max under 3 seconds

    @pytest.mark.benchmark
    def test_throughput(self):
        """Measure requests per second throughput"""
        benchmark = BenchmarkResults("Throughput Test")

        queries = ["Security check", "Architecture review", "Data analysis", "DevOps setup"]

        # Run for 10 seconds
        start_time = time.time()
        request_count = 0

        while time.time() - start_time < 10:
            query = queries[request_count % len(queries)]

            request_start = time.time()
            try:
                result = analyze_and_route(query)
                duration = time.time() - request_start
                benchmark.add_timing(duration)
                request_count += 1
            except Exception:
                benchmark.add_error()

        elapsed = time.time() - start_time
        throughput = request_count / elapsed

        print(f"\n=== Throughput Results ===")
        print(f"Total requests: {request_count}")
        print(f"Total time: {elapsed:.2f}s")
        print(f"Throughput: {throughput:.2f} requests/second")

        benchmark.print_report()

        # Should handle at least 1 request per second
        assert throughput >= 1.0

    @pytest.mark.benchmark
    def test_security_priority_overhead(self):
        """Measure overhead of security priority routing"""
        normal_benchmark = BenchmarkResults("Normal Routing")
        priority_benchmark = BenchmarkResults("Security Priority Routing")

        # Normal routing (no security keywords)
        normal_queries = ["Review my code structure", "Analyze this data pattern", "Help with deployment setup"]

        for query in normal_queries * 10:
            start = time.time()
            try:
                result = analyze_and_route(query)
                duration = time.time() - start
                normal_benchmark.add_timing(duration)
            except Exception:
                normal_benchmark.add_error()

        # Security priority routing
        security_queries = [
            "Check for XSS vulnerabilities",
            "Scan for SQL injection risks",
            "Review authentication security",
        ]

        for query in security_queries * 10:
            start = time.time()
            try:
                result = analyze_and_route(query)
                duration = time.time() - start
                priority_benchmark.add_timing(duration)
            except Exception:
                priority_benchmark.add_error()

        normal_benchmark.print_report()
        priority_benchmark.print_report()

        # Priority routing should not add significant overhead
        normal_stats = normal_benchmark.get_stats()
        priority_stats = priority_benchmark.get_stats()

        # Should be within 20% of normal routing time
        assert priority_stats["mean"] < normal_stats["mean"] * 1.2

    @pytest.mark.benchmark
    def test_metrics_collection_overhead(self):
        """Measure overhead of metrics collection"""
        # First, get baseline without looking at metrics
        baseline = BenchmarkResults("Baseline (No Metrics)")

        for _ in range(50):
            start = time.time()
            try:
                result = route_to_specialist("Test query", "data_analysis")
                duration = time.time() - start
                baseline.add_timing(duration)
            except Exception:
                baseline.add_error()

        # Now with metrics collection
        metrics_benchmark = BenchmarkResults("With Metrics Collection")

        for i in range(50):
            start = time.time()
            try:
                result = route_to_specialist(f"Test query {i}", "data_analysis")
                duration = time.time() - start
                metrics_benchmark.add_timing(duration)

                # Also get metrics every 10 requests
                if i % 10 == 0:
                    stats = get_orchestrator_stats()
            except Exception:
                metrics_benchmark.add_error()

        baseline.print_report()
        metrics_benchmark.print_report()

        # Metrics should add minimal overhead (< 10%)
        baseline_stats = baseline.get_stats()
        metrics_stats = metrics_benchmark.get_stats()

        assert metrics_stats["mean"] < baseline_stats["mean"] * 1.1


def generate_benchmark_report(output_file: str = "benchmark_results.json"):
    """Run all benchmarks and generate a report"""
    print("Running VANA Orchestrator Performance Benchmarks...")
    print("=" * 60)

    # Run the benchmark suite
    test_instance = TestOrchestratorBenchmarks()
    test_instance.setup_method()

    results = {}

    # Run each benchmark
    benchmarks = [
        ("routing", test_instance.test_routing_performance),
        ("analysis", test_instance.test_analysis_routing_performance),
        ("cache", test_instance.test_cache_performance),
        ("specialists", test_instance.test_specialist_response_times),
        ("throughput", test_instance.test_throughput),
        ("security_priority", test_instance.test_security_priority_overhead),
        ("metrics_overhead", test_instance.test_metrics_collection_overhead),
    ]

    for name, benchmark_func in benchmarks:
        print(f"\nRunning {name} benchmark...")
        try:
            benchmark_func()
            results[name] = "PASSED"
        except AssertionError as e:
            results[name] = f"FAILED: {str(e)}"
        except Exception as e:
            results[name] = f"ERROR: {str(e)}"

    # Save results
    output_path = Path(output_file)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n\nBenchmark results saved to: {output_path}")
    print("\nSummary:")
    for name, status in results.items():
        print(f"  {name}: {status}")


if __name__ == "__main__":
    generate_benchmark_report()
