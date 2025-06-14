#!/usr/bin/env python3
"""
VANA System Performance Benchmarking Framework
Comprehensive performance testing and baseline establishment

Measures response times, throughput, resource utilization, and scalability
Provides baseline metrics for ongoing performance monitoring
"""

import asyncio
import json
import statistics
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from playwright.async_api import async_playwright

from lib.logging_config import get_logger

logger = get_logger("vana.performance_benchmarks")


@dataclass
class PerformanceMetric:
    """Data class for performance measurements"""

    test_name: str
    metric_type: str  # response_time, throughput, resource_usage
    value: float
    unit: str
    timestamp: datetime
    additional_data: Optional[Dict[str, Any]] = None


@dataclass
class BenchmarkResult:
    """Data class for benchmark test results"""

    test_name: str
    description: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    p99_response_time: float
    throughput_rps: float
    error_rate: float
    metrics: List[PerformanceMetric]


class VANAPerformanceBenchmarks:
    """Comprehensive performance benchmarking framework for VANA system"""

    def __init__(self):
        self.base_url = "https://vana-dev-960076421399.us-central1.run.app"
        self.results_dir = "tests/results"

        # Performance test scenarios
        self.test_scenarios = {
            "simple_query": {
                "description": "Simple agent query performance",
                "query": "What is the current time?",
                "expected_response_time": 3.0,
                "concurrent_users": [1, 5, 10],
            },
            "complex_query": {
                "description": "Complex multi-agent workflow performance",
                "query": "Design a comprehensive system architecture for a social media platform",
                "expected_response_time": 8.0,
                "concurrent_users": [1, 3, 5],
            },
            "memory_query": {
                "description": "Memory system search performance",
                "query": "Search for information about VANA system capabilities",
                "expected_response_time": 2.0,
                "concurrent_users": [1, 5, 10],
            },
            "tool_execution": {
                "description": "Tool execution performance",
                "query": "Check the system health status",
                "expected_response_time": 2.0,
                "concurrent_users": [1, 10, 20],
            },
        }

    async def run_comprehensive_benchmarks(self) -> Dict[str, Any]:
        """Execute comprehensive performance benchmarks"""
        logger.info("⚡ Starting Comprehensive Performance Benchmarks")
        logger.debug("%s", "=" * 60)

        benchmark_results = {
            "benchmark_timestamp": datetime.now().isoformat(),
            "system_info": await self.get_system_info(),
            "baseline_metrics": {},
            "load_test_results": {},
            "performance_analysis": {},
            "recommendations": [],
        }

        # Phase 1: Baseline Performance Testing
        logger.debug("\n📊 Phase 1: Baseline Performance Testing")
        baseline_results = await self.run_baseline_tests()
        benchmark_results["baseline_metrics"] = baseline_results

        # Phase 2: Load Testing
        logger.debug("\n🔥 Phase 2: Load Testing")
        load_test_results = await self.run_load_tests()
        benchmark_results["load_test_results"] = load_test_results

        # Phase 3: Performance Analysis
        logger.debug("\n📈 Phase 3: Performance Analysis")
        analysis = self.analyze_performance_results(baseline_results, load_test_results)
        benchmark_results["performance_analysis"] = analysis

        # Phase 4: Generate Recommendations
        recommendations = self.generate_performance_recommendations(analysis)
        benchmark_results["recommendations"] = recommendations

        # Save results
        self.save_benchmark_results(benchmark_results)

        # Print summary
        self.print_benchmark_summary(benchmark_results)

        return benchmark_results

    async def get_system_info(self) -> Dict[str, Any]:
        """Get system information for benchmark context"""
        try:
            health_response = requests.get(f"{self.base_url}/health", timeout=10)
            info_response = requests.get(f"{self.base_url}/info", timeout=10)

            return {
                "service_url": self.base_url,
                "health_status": health_response.json() if health_response.status_code == 200 else None,
                "service_info": info_response.json() if info_response.status_code == 200 else None,
                "benchmark_time": datetime.now().isoformat(),
            }
        except Exception as e:
            return {"error": str(e)}

    async def run_baseline_tests(self) -> Dict[str, BenchmarkResult]:
        """Run baseline performance tests with single user"""
        baseline_results = {}

        for test_name, scenario in self.test_scenarios.items():
            logger.debug(f"  🧪 Testing: {test_name}")

            # Run single-user baseline test
            result = await self.run_single_user_test(test_name, scenario, iterations=10)
            baseline_results[test_name] = result

            print(
                f"    ✅ Avg: {result.average_response_time:.2f}s, "
                f"P95: {result.p95_response_time:.2f}s, "
                f"Success: {result.successful_requests}/{result.total_requests}"
            )

        return baseline_results

    async def run_load_tests(self) -> Dict[str, Dict[str, BenchmarkResult]]:
        """Run load tests with multiple concurrent users"""
        load_test_results = {}

        for test_name, scenario in self.test_scenarios.items():
            logger.debug(f"  🔥 Load testing: {test_name}")
            load_test_results[test_name] = {}

            for concurrent_users in scenario["concurrent_users"]:
                logger.debug(f"    👥 {concurrent_users} concurrent users")

                result = await self.run_concurrent_user_test(
                    test_name, scenario, concurrent_users, iterations_per_user=5
                )

                load_test_results[test_name][f"{concurrent_users}_users"] = result

                print(
                    f"      ✅ Avg: {result.average_response_time:.2f}s, "
                    f"Throughput: {result.throughput_rps:.1f} RPS, "
                    f"Error Rate: {result.error_rate:.1%}"
                )

        return load_test_results

    async def run_single_user_test(self, test_name: str, scenario: Dict, iterations: int) -> BenchmarkResult:
        """Run single-user performance test"""
        query = scenario["query"]
        response_times = []
        successful_requests = 0
        failed_requests = 0
        metrics = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                # Navigate and setup
                await page.goto(self.base_url, timeout=30000)
                await page.wait_for_load_state("networkidle")
                await page.click("mat-select")
                await page.click("mat-option:has-text('vana')")

                # Run iterations
                for i in range(iterations):
                    try:
                        start_time = time.time()

                        # Clear and submit query
                        await page.fill("textarea", "")
                        await page.fill("textarea", query)
                        await page.keyboard.press("Enter")

                        # Wait for response
                        await page.wait_for_selector(".response, .message, .output", timeout=30000)
                        response_time = time.time() - start_time

                        response_times.append(response_time)
                        successful_requests += 1

                        # Create metric
                        metric = PerformanceMetric(
                            test_name=test_name,
                            metric_type="response_time",
                            value=response_time,
                            unit="seconds",
                            timestamp=datetime.now(),
                        )
                        metrics.append(metric)

                        # Wait between requests
                        await asyncio.sleep(1)

                    except Exception as e:
                        failed_requests += 1
                        logger.error(f"      ❌ Request {i+1} failed: {e}")

            except Exception as e:
                logger.error(f"    ❌ Test setup failed: {e}")

            await browser.close()

        # Calculate statistics
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = (
                statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max_response_time
            )
            p99_response_time = (
                statistics.quantiles(response_times, n=100)[98] if len(response_times) >= 100 else max_response_time
            )
        else:
            avg_response_time = min_response_time = max_response_time = p95_response_time = p99_response_time = 0.0

        total_requests = successful_requests + failed_requests
        error_rate = failed_requests / total_requests if total_requests > 0 else 0.0

        # Calculate throughput (requests per second)
        total_time = sum(response_times) if response_times else 1.0
        throughput_rps = successful_requests / total_time if total_time > 0 else 0.0

        return BenchmarkResult(
            test_name=test_name,
            description=scenario["description"],
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            average_response_time=round(avg_response_time, 3),
            min_response_time=round(min_response_time, 3),
            max_response_time=round(max_response_time, 3),
            p95_response_time=round(p95_response_time, 3),
            p99_response_time=round(p99_response_time, 3),
            throughput_rps=round(throughput_rps, 2),
            error_rate=round(error_rate, 3),
            metrics=metrics,
        )

    async def run_concurrent_user_test(
        self, test_name: str, scenario: Dict, concurrent_users: int, iterations_per_user: int
    ) -> BenchmarkResult:
        """Run concurrent user load test"""
        logger.info(f"      🚀 Starting {concurrent_users} concurrent users...")

        # Create tasks for concurrent execution
        tasks = []
        for user_id in range(concurrent_users):
            task = self.simulate_user_load(test_name, scenario, user_id, iterations_per_user)
            tasks.append(task)

        # Execute all tasks concurrently
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_test_time = time.time() - start_time

        # Aggregate results
        all_response_times = []
        total_successful = 0
        total_failed = 0
        all_metrics = []

        for result in results:
            if isinstance(result, Exception):
                total_failed += iterations_per_user
                continue

            response_times, successful, failed, metrics = result
            all_response_times.extend(response_times)
            total_successful += successful
            total_failed += failed
            all_metrics.extend(metrics)

        # Calculate aggregate statistics
        if all_response_times:
            avg_response_time = statistics.mean(all_response_times)
            min_response_time = min(all_response_times)
            max_response_time = max(all_response_times)
            p95_response_time = (
                statistics.quantiles(all_response_times, n=20)[18]
                if len(all_response_times) >= 20
                else max_response_time
            )
            p99_response_time = (
                statistics.quantiles(all_response_times, n=100)[98]
                if len(all_response_times) >= 100
                else max_response_time
            )
        else:
            avg_response_time = min_response_time = max_response_time = p95_response_time = p99_response_time = 0.0

        total_requests = total_successful + total_failed
        error_rate = total_failed / total_requests if total_requests > 0 else 0.0
        throughput_rps = total_successful / total_test_time if total_test_time > 0 else 0.0

        return BenchmarkResult(
            test_name=f"{test_name}_{concurrent_users}_users",
            description=f"{scenario['description']} - {concurrent_users} concurrent users",
            total_requests=total_requests,
            successful_requests=total_successful,
            failed_requests=total_failed,
            average_response_time=round(avg_response_time, 3),
            min_response_time=round(min_response_time, 3),
            max_response_time=round(max_response_time, 3),
            p95_response_time=round(p95_response_time, 3),
            p99_response_time=round(p99_response_time, 3),
            throughput_rps=round(throughput_rps, 2),
            error_rate=round(error_rate, 3),
            metrics=all_metrics,
        )

    async def simulate_user_load(self, test_name: str, scenario: Dict, user_id: int, iterations: int):
        """Simulate individual user load for concurrent testing"""
        query = scenario["query"]
        response_times = []
        successful_requests = 0
        failed_requests = 0
        metrics = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                # Navigate and setup
                await page.goto(self.base_url, timeout=30000)
                await page.wait_for_load_state("networkidle")
                await page.click("mat-select")
                await page.click("mat-option:has-text('vana')")

                # Run iterations for this user
                for i in range(iterations):
                    try:
                        start_time = time.time()

                        # Clear and submit query
                        await page.fill("textarea", "")
                        await page.fill("textarea", query)
                        await page.keyboard.press("Enter")

                        # Wait for response
                        await page.wait_for_selector(".response, .message, .output", timeout=30000)
                        response_time = time.time() - start_time

                        response_times.append(response_time)
                        successful_requests += 1

                        # Create metric
                        metric = PerformanceMetric(
                            test_name=f"{test_name}_user_{user_id}",
                            metric_type="response_time",
                            value=response_time,
                            unit="seconds",
                            timestamp=datetime.now(),
                            additional_data={"user_id": user_id, "iteration": i},
                        )
                        metrics.append(metric)

                        # Small delay between requests
                        await asyncio.sleep(0.5)

                    except Exception:
                        failed_requests += 1

            except Exception:
                failed_requests += iterations

            await browser.close()

        return response_times, successful_requests, failed_requests, metrics

    def analyze_performance_results(self, baseline_results: Dict, load_test_results: Dict) -> Dict[str, Any]:
        """Analyze performance results and identify trends"""
        analysis = {
            "baseline_analysis": {},
            "load_test_analysis": {},
            "performance_trends": {},
            "bottlenecks": [],
            "scalability_assessment": {},
        }

        # Analyze baseline performance
        for test_name, result in baseline_results.items():
            analysis["baseline_analysis"][test_name] = {
                "meets_target": result.average_response_time
                <= self.test_scenarios[test_name]["expected_response_time"],
                "performance_rating": self.rate_performance(
                    result.average_response_time, self.test_scenarios[test_name]["expected_response_time"]
                ),
                "reliability_score": 1.0 - result.error_rate,
                "consistency_score": self.calculate_consistency_score(result),
            }

        # Analyze load test performance
        for test_name, user_results in load_test_results.items():
            analysis["load_test_analysis"][test_name] = {}

            for user_count, result in user_results.items():
                analysis["load_test_analysis"][test_name][user_count] = {
                    "performance_degradation": self.calculate_performance_degradation(
                        baseline_results[test_name], result
                    ),
                    "scalability_score": self.calculate_scalability_score(result),
                    "error_rate_increase": result.error_rate - baseline_results[test_name].error_rate,
                }

        # Identify bottlenecks
        analysis["bottlenecks"] = self.identify_bottlenecks(baseline_results, load_test_results)

        # Assess scalability
        analysis["scalability_assessment"] = self.assess_scalability(load_test_results)

        return analysis

    def rate_performance(self, actual_time: float, target_time: float) -> str:
        """Rate performance based on target comparison"""
        ratio = actual_time / target_time
        if ratio <= 0.5:
            return "Excellent"
        elif ratio <= 0.8:
            return "Good"
        elif ratio <= 1.0:
            return "Acceptable"
        elif ratio <= 1.5:
            return "Poor"
        else:
            return "Unacceptable"

    def calculate_consistency_score(self, result: BenchmarkResult) -> float:
        """Calculate consistency score based on response time variance"""
        if result.average_response_time == 0:
            return 0.0

        # Lower variance = higher consistency
        variance_ratio = (result.max_response_time - result.min_response_time) / result.average_response_time
        consistency_score = max(0.0, 1.0 - variance_ratio)
        return round(consistency_score, 3)

    def calculate_performance_degradation(self, baseline: BenchmarkResult, load_test: BenchmarkResult) -> float:
        """Calculate performance degradation under load"""
        if baseline.average_response_time == 0:
            return 0.0

        degradation = (
            load_test.average_response_time - baseline.average_response_time
        ) / baseline.average_response_time
        return round(degradation, 3)

    def calculate_scalability_score(self, result: BenchmarkResult) -> float:
        """Calculate scalability score based on throughput and error rate"""
        # Higher throughput and lower error rate = better scalability
        throughput_score = min(1.0, result.throughput_rps / 10.0)  # Normalize to 10 RPS max
        reliability_score = 1.0 - result.error_rate
        scalability_score = (throughput_score + reliability_score) / 2
        return round(scalability_score, 3)

    def identify_bottlenecks(self, baseline_results: Dict, load_test_results: Dict) -> List[str]:
        """Identify performance bottlenecks"""
        bottlenecks = []

        for test_name, user_results in load_test_results.items():
            baseline = baseline_results[test_name]

            # Check for significant performance degradation
            for user_count, result in user_results.items():
                degradation = self.calculate_performance_degradation(baseline, result)

                if degradation > 1.0:  # 100% degradation
                    bottlenecks.append(
                        f"{test_name}: Severe performance degradation ({degradation:.1%}) with {user_count}"
                    )
                elif degradation > 0.5:  # 50% degradation
                    bottlenecks.append(
                        f"{test_name}: Significant performance degradation ({degradation:.1%}) with {user_count}"
                    )

                if result.error_rate > 0.1:  # 10% error rate
                    bottlenecks.append(f"{test_name}: High error rate ({result.error_rate:.1%}) with {user_count}")

        return bottlenecks

    def assess_scalability(self, load_test_results: Dict) -> Dict[str, Any]:
        """Assess overall system scalability"""
        scalability_scores = []
        max_concurrent_users = {}

        for test_name, user_results in load_test_results.items():
            test_scores = []
            max_users = 0

            for user_count, result in user_results.items():
                score = self.calculate_scalability_score(result)
                test_scores.append(score)

                # Track maximum users with acceptable performance
                if result.error_rate < 0.05 and score > 0.7:  # 5% error rate, 70% scalability score
                    users = int(user_count.split("_")[0])
                    max_users = max(max_users, users)

            scalability_scores.extend(test_scores)
            max_concurrent_users[test_name] = max_users

        overall_scalability = statistics.mean(scalability_scores) if scalability_scores else 0.0

        return {
            "overall_scalability_score": round(overall_scalability, 3),
            "max_concurrent_users_by_test": max_concurrent_users,
            "scalability_rating": self.rate_scalability(overall_scalability),
        }

    def rate_scalability(self, score: float) -> str:
        """Rate scalability based on score"""
        if score >= 0.9:
            return "Excellent"
        elif score >= 0.7:
            return "Good"
        elif score >= 0.5:
            return "Acceptable"
        elif score >= 0.3:
            return "Poor"
        else:
            return "Unacceptable"

    def generate_performance_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate performance improvement recommendations"""
        recommendations = []

        # Baseline performance recommendations
        baseline_analysis = analysis.get("baseline_analysis", {})
        for test_name, metrics in baseline_analysis.items():
            if not metrics["meets_target"]:
                recommendations.append(
                    f"⚡ {test_name}: Baseline performance ({metrics['performance_rating']}) - "
                    f"Optimize response time to meet target"
                )

            if metrics["reliability_score"] < 0.95:
                recommendations.append(
                    f"🔧 {test_name}: Reliability score ({metrics['reliability_score']:.1%}) - "
                    f"Investigate and fix error sources"
                )

            if metrics["consistency_score"] < 0.8:
                recommendations.append(
                    f"📊 {test_name}: Consistency score ({metrics['consistency_score']:.1%}) - "
                    f"Reduce response time variance"
                )

        # Load test recommendations
        bottlenecks = analysis.get("bottlenecks", [])
        for bottleneck in bottlenecks:
            recommendations.append(f"🚨 Bottleneck identified: {bottleneck}")

        # Scalability recommendations
        scalability = analysis.get("scalability_assessment", {})
        if scalability.get("scalability_rating") in ["Poor", "Unacceptable"]:
            recommendations.append(
                f"📈 Scalability ({scalability.get('scalability_rating')}) - "
                f"Implement horizontal scaling and load balancing"
            )

        # General recommendations
        if not recommendations:
            recommendations.append("✅ Performance meets all targets - System performing excellently!")
        else:
            recommendations.extend(
                [
                    "💡 Consider implementing caching strategies",
                    "💡 Monitor resource utilization during peak loads",
                    "💡 Implement auto-scaling based on performance metrics",
                ]
            )

        return recommendations

    def save_benchmark_results(self, results: Dict[str, Any]):
        """Save benchmark results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"performance_benchmark_results_{timestamp}.json"
        filepath = f"{self.results_dir}/{filename}"

        # Convert dataclasses to dict for JSON serialization
        serializable_results = self.make_serializable(results)

        with open(filepath, "w") as f:
            json.dump(serializable_results, f, indent=2, default=str)

        logger.info(f"💾 Benchmark results saved: {filepath}")

    def make_serializable(self, obj):
        """Convert dataclasses and other objects to JSON-serializable format"""
        if isinstance(obj, dict):
            return {k: self.make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.make_serializable(item) for item in obj]
        elif hasattr(obj, "__dict__"):
            return self.make_serializable(obj.__dict__)
        else:
            return obj

    def print_benchmark_summary(self, results: Dict[str, Any]):
        """Print comprehensive benchmark summary"""
        logger.debug("%s", "\n" + "=" * 80)
        logger.debug("⚡ COMPREHENSIVE PERFORMANCE BENCHMARK SUMMARY")
        logger.debug("%s", "=" * 80)

        # System info
        system_info = results.get("system_info", {})
        logger.debug(f"\n🖥️  SYSTEM INFORMATION:")
        logger.debug("%s", f"   Service URL: {system_info.get('service_url', 'N/A')}")
        logger.debug("%s", f"   Health Status: {system_info.get('health_status', {}).get('status', 'N/A')}")

        # Baseline metrics
        baseline_metrics = results.get("baseline_metrics", {})
        logger.debug(f"\n📊 BASELINE PERFORMANCE:")
        for test_name, result in baseline_metrics.items():
            logger.debug(f"   {test_name}:")
            logger.info(f"      Average Response Time: {result.average_response_time:.2f}s")
            logger.info(f"      P95 Response Time: {result.p95_response_time:.2f}s")
            logger.error(
                f"      Success Rate: {result.successful_requests}/{result.total_requests} ({(1-result.error_rate):.1%})"
            )
            logger.info(f"      Throughput: {result.throughput_rps:.1f} RPS")

        # Load test results
        load_test_results = results.get("load_test_results", {})
        logger.info(f"\n🔥 LOAD TEST RESULTS:")
        for test_name, user_results in load_test_results.items():
            logger.debug(f"   {test_name}:")
            for user_count, result in user_results.items():
                print(
                    f"      {user_count}: {result.average_response_time:.2f}s avg, "
                    f"{result.throughput_rps:.1f} RPS, {result.error_rate:.1%} errors"
                )

        # Performance analysis
        analysis = results.get("performance_analysis", {})
        scalability = analysis.get("scalability_assessment", {})
        logger.debug(f"\n📈 SCALABILITY ASSESSMENT:")
        logger.debug("%s", f"   Overall Score: {scalability.get('overall_scalability_score', 0):.1%}")
        logger.debug("%s", f"   Rating: {scalability.get('scalability_rating', 'N/A')}")

        max_users = scalability.get("max_concurrent_users_by_test", {})
        for test_name, max_user_count in max_users.items():
            logger.debug(f"   {test_name}: Max {max_user_count} concurrent users")

        # Recommendations
        recommendations = results.get("recommendations", [])
        logger.debug(f"\n💡 PERFORMANCE RECOMMENDATIONS:")
        for rec in recommendations:
            logger.debug(f"   {rec}")

        logger.debug("%s", "=" * 80)


if __name__ == "__main__":

    async def main():
        benchmarks = VANAPerformanceBenchmarks()
        await benchmarks.run_comprehensive_benchmarks()

    asyncio.run(main())
