"""
Enhanced Performance Benchmarking Suite for VANA Testing Framework

This module provides comprehensive performance measurement and benchmarking capabilities
for the VANA system, including agent performance, tool execution, and system metrics.

Features:
- Performance metric collection and analysis
- Memory usage monitoring
- Throughput measurement
- Response time benchmarking
- Statistical analysis and reporting
"""

import asyncio
import json
import logging
import statistics
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

import psutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance measurement result with comprehensive metadata."""

    name: str
    value: float
    unit: str
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert metric to dictionary for serialization."""
        return {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


class PerformanceBenchmark:
    """Base class for performance benchmarks with comprehensive metrics collection."""

    def __init__(self, name: str):
        self.name = name
        self.metrics: List[PerformanceMetric] = []
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None

    def start_benchmark(self):
        """Start the benchmark timer."""
        self.start_time = time.time()
        logger.info(f"Starting benchmark: {self.name}")

    def end_benchmark(self):
        """End the benchmark timer."""
        self.end_time = time.time()
        if self.start_time:
            duration = self.end_time - self.start_time
            logger.info(f"Benchmark completed: {self.name} ({duration:.3f}s)")

    def add_metric(self, metric: PerformanceMetric):
        """Add a performance metric to the benchmark."""
        self.metrics.append(metric)

    def measure_response_time(self, func: Callable, *args, **kwargs) -> PerformanceMetric:
        """Measure function execution time with detailed metadata."""
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss

        try:
            result = func(*args, **kwargs)
            success = True
            error = None
        except Exception as e:
            result = None
            success = False
            error = str(e)

        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss

        execution_time = end_time - start_time
        memory_delta = end_memory - start_memory

        metric = PerformanceMetric(
            name=f"{self.name}_response_time",
            value=execution_time,
            unit="seconds",
            timestamp=start_time,
            metadata={
                "function": func.__name__,
                "success": success,
                "error": error,
                "memory_delta_mb": memory_delta / 1024 / 1024,
                "result_size": len(str(result)) if result else 0,
            },
        )

        self.add_metric(metric)
        return metric

    def measure_memory_usage(self, func: Callable, *args, **kwargs) -> PerformanceMetric:
        """Measure memory usage during function execution."""
        process = psutil.Process()
        start_memory = process.memory_info().rss
        start_time = time.time()

        try:
            result = func(*args, **kwargs)
            success = True
        except Exception as e:
            result = None
            success = False

        end_memory = process.memory_info().rss
        peak_memory = max(start_memory, end_memory)
        memory_delta = end_memory - start_memory

        metric = PerformanceMetric(
            name=f"{self.name}_memory_usage",
            value=memory_delta / 1024 / 1024,  # Convert to MB
            unit="MB",
            timestamp=start_time,
            metadata={
                "function": func.__name__,
                "success": success,
                "start_memory_mb": start_memory / 1024 / 1024,
                "end_memory_mb": end_memory / 1024 / 1024,
                "peak_memory_mb": peak_memory / 1024 / 1024,
                "result_size": len(str(result)) if result else 0,
            },
        )

        self.add_metric(metric)
        return metric

    def measure_throughput(self, func: Callable, iterations: int = 100, *args, **kwargs) -> PerformanceMetric:
        """Measure function throughput (operations per second)."""
        start_time = time.time()
        successful_operations = 0
        errors = []

        for i in range(iterations):
            try:
                func(*args, **kwargs)
                successful_operations += 1
            except Exception as e:
                errors.append(str(e))

        end_time = time.time()
        total_time = end_time - start_time
        throughput = successful_operations / total_time if total_time > 0 else 0

        metric = PerformanceMetric(
            name=f"{self.name}_throughput",
            value=throughput,
            unit="ops/sec",
            timestamp=start_time,
            metadata={
                "function": func.__name__,
                "iterations": iterations,
                "successful_operations": successful_operations,
                "error_count": len(errors),
                "success_rate": successful_operations / iterations if iterations > 0 else 0,
                "total_time": total_time,
                "errors": errors[:5],  # Store first 5 errors for analysis
            },
        )

        self.add_metric(metric)
        return metric

    def get_statistics(self) -> Dict[str, Any]:
        """Calculate comprehensive statistics for all metrics."""
        if not self.metrics:
            return {"error": "No metrics available"}

        stats = {}

        # Group metrics by name
        metric_groups = {}
        for metric in self.metrics:
            if metric.name not in metric_groups:
                metric_groups[metric.name] = []
            metric_groups[metric.name].append(metric.value)

        # Calculate statistics for each metric group
        for metric_name, values in metric_groups.items():
            if values:
                stats[metric_name] = {
                    "count": len(values),
                    "min": min(values),
                    "max": max(values),
                    "mean": statistics.mean(values),
                    "median": statistics.median(values),
                    "std_dev": statistics.stdev(values) if len(values) > 1 else 0,
                    "p95": statistics.quantiles(values, n=20)[18] if len(values) >= 20 else max(values),
                    "p99": statistics.quantiles(values, n=100)[98] if len(values) >= 100 else max(values),
                }

        return stats

    def save_results(self, filepath: Union[str, Path]):
        """Save benchmark results to JSON file."""
        results = {
            "benchmark_name": self.name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.end_time - self.start_time if self.start_time and self.end_time else None,
            "metrics": [metric.to_dict() for metric in self.metrics],
            "statistics": self.get_statistics(),
        }

        with open(filepath, "w") as f:
            json.dump(results, f, indent=2)

        logger.info(f"Benchmark results saved to {filepath}")

    def __str__(self) -> str:
        """String representation of benchmark results."""
        stats = self.get_statistics()
        if "error" in stats:
            return f"Benchmark: {self.name} - {stats['error']}"

        output = [f"Benchmark: {self.name}"]
        for metric_name, metric_stats in stats.items():
            output.append(f"  {metric_name}:")
            output.append(f"    Count: {metric_stats['count']}")
            output.append(f"    Mean: {metric_stats['mean']:.3f}")
            output.append(f"    Min/Max: {metric_stats['min']:.3f}/{metric_stats['max']:.3f}")
            output.append(f"    P95/P99: {metric_stats['p95']:.3f}/{metric_stats['p99']:.3f}")

        return "\n".join(output)


class AsyncPerformanceBenchmark(PerformanceBenchmark):
    """Async version of performance benchmark for async operations."""

    async def measure_async_response_time(self, func: Callable, *args, **kwargs) -> PerformanceMetric:
        """Measure async function execution time."""
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss

        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            success = True
            error = None
        except Exception as e:
            result = None
            success = False
            error = str(e)

        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss

        execution_time = end_time - start_time
        memory_delta = end_memory - start_memory

        metric = PerformanceMetric(
            name=f"{self.name}_async_response_time",
            value=execution_time,
            unit="seconds",
            timestamp=start_time,
            metadata={
                "function": func.__name__,
                "success": success,
                "error": error,
                "memory_delta_mb": memory_delta / 1024 / 1024,
                "result_size": len(str(result)) if result else 0,
                "is_async": True,
            },
        )

        self.add_metric(metric)
        return metric

    async def measure_concurrent_operations(
        self, func: Callable, concurrency: int = 10, *args, **kwargs
    ) -> PerformanceMetric:
        """Measure performance under concurrent load."""
        start_time = time.time()

        # Create concurrent tasks
        if asyncio.iscoroutinefunction(func):
            tasks = [func(*args, **kwargs) for _ in range(concurrency)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        else:
            # For non-async functions, run in executor
            loop = asyncio.get_event_loop()
            tasks = [loop.run_in_executor(None, func, *args, **kwargs) for _ in range(concurrency)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        end_time = time.time()
        total_time = end_time - start_time

        # Analyze results
        successful_operations = sum(1 for r in results if not isinstance(r, Exception))
        errors = [str(r) for r in results if isinstance(r, Exception)]

        metric = PerformanceMetric(
            name=f"{self.name}_concurrent_operations",
            value=successful_operations / total_time if total_time > 0 else 0,
            unit="ops/sec",
            timestamp=start_time,
            metadata={
                "function": func.__name__,
                "concurrency": concurrency,
                "successful_operations": successful_operations,
                "error_count": len(errors),
                "success_rate": successful_operations / concurrency if concurrency > 0 else 0,
                "total_time": total_time,
                "errors": errors[:5],  # Store first 5 errors
            },
        )

        self.add_metric(metric)
        return metric
