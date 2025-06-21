"""
Performance Benchmarker for AI Agent Testing Framework

Benchmarks agent performance including response times, throughput,
resource usage, and scalability under various load conditions.
"""

import asyncio
import json
import statistics
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psutil

from .agent_client import AgentTestClient
from .test_data_manager import QueryType, TestDataManager


@dataclass
class PerformanceMetrics:
    """Performance metrics for agent operations"""

    # Response time metrics
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p50_response_time: float
    p95_response_time: float
    p99_response_time: float

    # Throughput metrics
    requests_per_second: float
    successful_requests: int
    failed_requests: int
    success_rate: float

    # Resource usage metrics
    avg_cpu_usage: float
    max_cpu_usage: float
    avg_memory_usage: float
    max_memory_usage: float

    # Additional metrics
    total_requests: int
    test_duration: float
    concurrent_users: int

    # Error analysis
    error_types: Dict[str, int]
    timeout_count: int


@dataclass
class LoadTestResult:
    """Result of load testing"""

    test_name: str
    test_config: Dict[str, Any]
    metrics: PerformanceMetrics
    timeline_data: List[Dict[str, Any]]
    resource_timeline: List[Dict[str, Any]]
    passed: bool
    issues: List[str]
    recommendations: List[str]


class PerformanceBenchmarker:
    """Benchmarks agent performance and resource usage"""

    def __init__(
        self,
        agent_client: AgentTestClient,
        test_data_manager: Optional[TestDataManager] = None,
        baseline_file: Optional[str] = None,
    ):
        """Initialize performance benchmarker"""
        self.agent_client = agent_client
        self.test_data_manager = test_data_manager or TestDataManager()

        # Set up baseline storage
        if baseline_file is None:
            baseline_file = (
                Path(__file__).parent.parent
                / "test_data"
                / "performance_baselines.json"
            )

        self.baseline_file = Path(baseline_file)
        self.baseline_file.parent.mkdir(parents=True, exist_ok=True)

        # Load existing baselines
        self.baselines = self._load_baselines()

        # Performance thresholds
        self.thresholds = {
            "max_response_time": 5.0,  # seconds
            "min_success_rate": 0.95,
            "max_cpu_usage": 80.0,  # percent
            "max_memory_usage": 1024,  # MB
            "min_requests_per_second": 1.0,
        }

    async def benchmark_response_times(
        self, query_types: Optional[List[QueryType]] = None, iterations: int = 10
    ) -> LoadTestResult:
        """Benchmark agent response times across different query types"""
        test_config = {
            "test_type": "response_time_benchmark",
            "query_types": [qt.value for qt in query_types] if query_types else "all",
            "iterations": iterations,
        }

        if query_types is None:
            query_types = list(QueryType)

        all_response_times = []
        successful_requests = 0
        failed_requests = 0
        error_types = {}
        timeline_data = []

        start_time = time.time()

        # Monitor resources during test
        resource_monitor = ResourceMonitor()
        resource_monitor.start()

        try:
            for iteration in range(iterations):
                for query_type in query_types:
                    try:
                        scenarios = self.test_data_manager.load_scenarios_by_type(
                            query_type
                        )
                    except FileNotFoundError:
                        continue

                    for scenario in scenarios:
                        request_start = time.time()

                        try:
                            response = await self.agent_client.query(scenario.query)
                            request_time = time.time() - request_start

                            if response.status == "success":
                                all_response_times.append(request_time)
                                successful_requests += 1
                            else:
                                failed_requests += 1
                                error_type = response.error or "unknown_error"
                                error_types[error_type] = (
                                    error_types.get(error_type, 0) + 1
                                )

                            # Record timeline data
                            timeline_data.append(
                                {
                                    "timestamp": time.time(),
                                    "iteration": iteration,
                                    "query_type": query_type.value,
                                    "scenario_id": scenario.query_id,
                                    "response_time": request_time,
                                    "status": response.status,
                                    "success": response.status == "success",
                                }
                            )

                        except Exception as e:
                            failed_requests += 1
                            error_type = type(e).__name__
                            error_types[error_type] = error_types.get(error_type, 0) + 1

                            timeline_data.append(
                                {
                                    "timestamp": time.time(),
                                    "iteration": iteration,
                                    "query_type": query_type.value,
                                    "scenario_id": scenario.query_id,
                                    "response_time": 0,
                                    "status": "error",
                                    "error": str(e),
                                    "success": False,
                                }
                            )

        finally:
            resource_timeline = resource_monitor.stop()

        test_duration = time.time() - start_time
        total_requests = successful_requests + failed_requests

        # Calculate metrics
        metrics = self._calculate_performance_metrics(
            response_times=all_response_times,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            test_duration=test_duration,
            error_types=error_types,
            resource_timeline=resource_timeline,
            concurrent_users=1,
        )

        # Evaluate performance
        issues, recommendations, passed = self._evaluate_performance(
            metrics, "response_time"
        )

        return LoadTestResult(
            test_name="response_time_benchmark",
            test_config=test_config,
            metrics=metrics,
            timeline_data=timeline_data,
            resource_timeline=resource_timeline,
            passed=passed,
            issues=issues,
            recommendations=recommendations,
        )

    async def benchmark_concurrent_load(
        self,
        query: str,
        concurrent_users: int = 5,
        duration: int = 60,
        ramp_up_time: int = 10,
    ) -> LoadTestResult:
        """Benchmark performance under concurrent load"""
        test_config = {
            "test_type": "concurrent_load",
            "concurrent_users": concurrent_users,
            "duration": duration,
            "ramp_up_time": ramp_up_time,
            "query": query,
        }

        # Monitor resources during test
        resource_monitor = ResourceMonitor()
        resource_monitor.start()

        all_response_times = []
        successful_requests = 0
        failed_requests = 0
        error_types = {}
        timeline_data = []

        start_time = time.time()
        end_time = start_time + duration

        try:
            # Create user simulation tasks
            tasks = []
            for user_id in range(concurrent_users):
                # Stagger user start times for ramp-up
                start_delay = (user_id / concurrent_users) * ramp_up_time
                task = asyncio.create_task(
                    self._simulate_user_load(
                        user_id=user_id,
                        query=query,
                        start_delay=start_delay,
                        end_time=end_time,
                        timeline_data=timeline_data,
                    )
                )
                tasks.append(task)

            # Wait for all user simulations to complete
            user_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Aggregate results
            for result in user_results:
                if isinstance(result, Exception):
                    failed_requests += 1
                    error_type = type(result).__name__
                    error_types[error_type] = error_types.get(error_type, 0) + 1
                elif isinstance(result, dict):
                    all_response_times.extend(result.get("response_times", []))
                    successful_requests += result.get("successful_requests", 0)
                    failed_requests += result.get("failed_requests", 0)

                    for error_type, count in result.get("error_types", {}).items():
                        error_types[error_type] = error_types.get(error_type, 0) + count

        finally:
            resource_timeline = resource_monitor.stop()

        test_duration = time.time() - start_time

        # Calculate metrics
        metrics = self._calculate_performance_metrics(
            response_times=all_response_times,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            test_duration=test_duration,
            error_types=error_types,
            resource_timeline=resource_timeline,
            concurrent_users=concurrent_users,
        )

        # Evaluate performance
        issues, recommendations, passed = self._evaluate_performance(
            metrics, "load_test"
        )

        return LoadTestResult(
            test_name="concurrent_load_test",
            test_config=test_config,
            metrics=metrics,
            timeline_data=timeline_data,
            resource_timeline=resource_timeline,
            passed=passed,
            issues=issues,
            recommendations=recommendations,
        )

    async def benchmark_scalability(
        self,
        query: str,
        user_counts: List[int] = [1, 2, 5, 10, 20],
        duration_per_test: int = 30,
    ) -> Dict[int, LoadTestResult]:
        """Benchmark scalability across different user counts"""
        results = {}

        for user_count in user_counts:
            print(f"Testing with {user_count} concurrent users...")

            result = await self.benchmark_concurrent_load(
                query=query,
                concurrent_users=user_count,
                duration=duration_per_test,
                ramp_up_time=min(10, duration_per_test // 3),
            )

            results[user_count] = result

            # Brief pause between tests
            await asyncio.sleep(5)

        return results

    def compare_with_baseline(
        self, metrics: PerformanceMetrics, test_name: str
    ) -> Dict[str, Any]:
        """Compare current metrics with baseline"""
        if test_name not in self.baselines:
            return {
                "baseline_exists": False,
                "message": "No baseline found for comparison",
            }

        baseline = self.baselines[test_name]
        comparison = {
            "baseline_exists": True,
            "improvements": {},
            "regressions": {},
            "overall_change": "stable",
        }

        # Compare key metrics
        key_metrics = [
            "avg_response_time",
            "p95_response_time",
            "success_rate",
            "requests_per_second",
            "avg_cpu_usage",
            "avg_memory_usage",
        ]

        for metric in key_metrics:
            current_value = getattr(metrics, metric)
            baseline_value = baseline.get(metric, 0)

            if baseline_value > 0:
                change_percent = (
                    (current_value - baseline_value) / baseline_value
                ) * 100

                # Determine if this is an improvement or regression
                improvement_metrics = ["success_rate", "requests_per_second"]
                regression_threshold = 5.0  # 5% change threshold

                if abs(change_percent) > regression_threshold:
                    if metric in improvement_metrics:
                        if change_percent > 0:
                            comparison["improvements"][metric] = change_percent
                        else:
                            comparison["regressions"][metric] = change_percent
                    else:  # Lower is better for response time, CPU, memory
                        if change_percent < 0:
                            comparison["improvements"][metric] = abs(change_percent)
                        else:
                            comparison["regressions"][metric] = change_percent

        # Determine overall change
        if comparison["regressions"]:
            comparison["overall_change"] = "regression"
        elif comparison["improvements"]:
            comparison["overall_change"] = "improvement"

        return comparison

    def save_baseline(self, metrics: PerformanceMetrics, test_name: str) -> None:
        """Save current metrics as baseline"""
        self.baselines[test_name] = asdict(metrics)

        with open(self.baseline_file, "w") as f:
            json.dump(self.baselines, f, indent=2)

    async def _simulate_user_load(
        self,
        user_id: int,
        query: str,
        start_delay: float,
        end_time: float,
        timeline_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Simulate load from a single user"""
        await asyncio.sleep(start_delay)

        response_times = []
        successful_requests = 0
        failed_requests = 0
        error_types = {}

        while time.time() < end_time:
            request_start = time.time()

            try:
                response = await self.agent_client.query(query)
                request_time = time.time() - request_start

                if response.status == "success":
                    response_times.append(request_time)
                    successful_requests += 1
                else:
                    failed_requests += 1
                    error_type = response.error or "unknown_error"
                    error_types[error_type] = error_types.get(error_type, 0) + 1

                # Record timeline data (thread-safe append)
                timeline_data.append(
                    {
                        "timestamp": time.time(),
                        "user_id": user_id,
                        "response_time": request_time,
                        "status": response.status,
                        "success": response.status == "success",
                    }
                )

            except Exception as e:
                failed_requests += 1
                error_type = type(e).__name__
                error_types[error_type] = error_types.get(error_type, 0) + 1

            # Small delay between requests to avoid overwhelming
            await asyncio.sleep(0.1)

        return {
            "user_id": user_id,
            "response_times": response_times,
            "successful_requests": successful_requests,
            "failed_requests": failed_requests,
            "error_types": error_types,
        }

    def _calculate_performance_metrics(
        self,
        response_times: List[float],
        successful_requests: int,
        failed_requests: int,
        test_duration: float,
        error_types: Dict[str, int],
        resource_timeline: List[Dict[str, Any]],
        concurrent_users: int,
    ) -> PerformanceMetrics:
        """Calculate comprehensive performance metrics"""

        total_requests = successful_requests + failed_requests

        # Response time metrics
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)

            # Calculate percentiles
            sorted_times = sorted(response_times)
            p50_response_time = statistics.median(sorted_times)
            p95_response_time = (
                sorted_times[int(len(sorted_times) * 0.95)] if sorted_times else 0
            )
            p99_response_time = (
                sorted_times[int(len(sorted_times) * 0.99)] if sorted_times else 0
            )
        else:
            avg_response_time = min_response_time = max_response_time = 0
            p50_response_time = p95_response_time = p99_response_time = 0

        # Throughput metrics
        requests_per_second = total_requests / test_duration if test_duration > 0 else 0
        success_rate = successful_requests / total_requests if total_requests > 0 else 0

        # Resource usage metrics
        if resource_timeline:
            cpu_values = [
                r["cpu_percent"] for r in resource_timeline if "cpu_percent" in r
            ]
            memory_values = [
                r["memory_mb"] for r in resource_timeline if "memory_mb" in r
            ]

            avg_cpu_usage = statistics.mean(cpu_values) if cpu_values else 0
            max_cpu_usage = max(cpu_values) if cpu_values else 0
            avg_memory_usage = statistics.mean(memory_values) if memory_values else 0
            max_memory_usage = max(memory_values) if memory_values else 0
        else:
            avg_cpu_usage = max_cpu_usage = avg_memory_usage = max_memory_usage = 0

        # Count timeouts
        timeout_count = error_types.get("TimeoutError", 0) + error_types.get(
            "asyncio.TimeoutError", 0
        )

        return PerformanceMetrics(
            avg_response_time=avg_response_time,
            min_response_time=min_response_time,
            max_response_time=max_response_time,
            p50_response_time=p50_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            requests_per_second=requests_per_second,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            success_rate=success_rate,
            avg_cpu_usage=avg_cpu_usage,
            max_cpu_usage=max_cpu_usage,
            avg_memory_usage=avg_memory_usage,
            max_memory_usage=max_memory_usage,
            total_requests=total_requests,
            test_duration=test_duration,
            concurrent_users=concurrent_users,
            error_types=error_types,
            timeout_count=timeout_count,
        )

    def _evaluate_performance(
        self, metrics: PerformanceMetrics, test_type: str
    ) -> Tuple[List[str], List[str], bool]:
        """Evaluate performance against thresholds"""
        issues = []
        recommendations = []

        # Check response time thresholds
        if metrics.avg_response_time > self.thresholds["max_response_time"]:
            issues.append(
                f"Average response time too high: {metrics.avg_response_time:.2f}s"
            )
            recommendations.append("Optimize agent processing or increase resources")

        if metrics.p95_response_time > self.thresholds["max_response_time"] * 2:
            issues.append(
                f"95th percentile response time too high: {metrics.p95_response_time:.2f}s"
            )
            recommendations.append("Investigate performance outliers")

        # Check success rate
        if metrics.success_rate < self.thresholds["min_success_rate"]:
            issues.append(f"Success rate too low: {metrics.success_rate:.2%}")
            recommendations.append("Investigate and fix error causes")

        # Check resource usage
        if metrics.max_cpu_usage > self.thresholds["max_cpu_usage"]:
            issues.append(f"CPU usage too high: {metrics.max_cpu_usage:.1f}%")
            recommendations.append("Optimize CPU-intensive operations")

        if metrics.max_memory_usage > self.thresholds["max_memory_usage"]:
            issues.append(f"Memory usage too high: {metrics.max_memory_usage:.1f}MB")
            recommendations.append("Investigate memory leaks or optimize memory usage")

        # Check throughput
        if metrics.requests_per_second < self.thresholds["min_requests_per_second"]:
            issues.append(
                f"Throughput too low: {metrics.requests_per_second:.2f} req/s"
            )
            recommendations.append("Optimize agent performance or scaling")

        passed = len(issues) == 0

        return issues, recommendations, passed

    def _load_baselines(self) -> Dict[str, Any]:
        """Load performance baselines from file"""
        if self.baseline_file.exists():
            try:
                with open(self.baseline_file, "r") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}


class ResourceMonitor:
    """Monitor system resource usage during tests"""

    def __init__(self, interval: float = 1.0):
        """Initialize resource monitor"""
        self.interval = interval
        self.monitoring = False
        self.data = []
        self.monitor_task = None

    def start(self) -> None:
        """Start monitoring resources"""
        self.monitoring = True
        self.data = []
        self.monitor_task = asyncio.create_task(self._monitor_loop())

    def stop(self) -> List[Dict[str, Any]]:
        """Stop monitoring and return collected data"""
        self.monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
        return self.data.copy()

    async def _monitor_loop(self) -> None:
        """Monitor resource usage in a loop"""
        try:
            while self.monitoring:
                # Get current resource usage
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                memory_mb = memory.used / (1024 * 1024)

                self.data.append(
                    {
                        "timestamp": time.time(),
                        "cpu_percent": cpu_percent,
                        "memory_mb": memory_mb,
                        "memory_percent": memory.percent,
                    }
                )

                await asyncio.sleep(self.interval)
        except asyncio.CancelledError:
            pass
