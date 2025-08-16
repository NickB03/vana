#!/usr/bin/env python3
"""
Comprehensive Hook Performance Benchmarker
Implements detailed performance analysis and benchmarking for git hooks.
"""

import json
import statistics
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import psutil


@dataclass
class HookExecutionMetrics:
    """Metrics for a single hook execution"""
    hook_type: str
    execution_time_ms: float
    memory_usage_mb: float
    cpu_usage_percent: float
    success: bool
    return_code: int
    output_length: int
    timestamp: float
    process_id: int | None = None
    error_message: str | None = None


@dataclass
class HookPerformanceBenchmark:
    """Complete performance benchmark for a hook type"""
    hook_type: str
    total_executions: int
    successful_executions: int
    failed_executions: int
    success_rate: float
    avg_execution_time_ms: float
    median_execution_time_ms: float
    p95_execution_time_ms: float
    p99_execution_time_ms: float
    max_execution_time_ms: float
    min_execution_time_ms: float
    std_dev_execution_time_ms: float
    avg_memory_usage_mb: float
    max_memory_usage_mb: float
    avg_cpu_usage_percent: float
    max_cpu_usage_percent: float
    throughput_ops_per_second: float
    memory_leak_detected: bool
    performance_score: float


class HookPerformanceBenchmarker:
    """Comprehensive performance benchmarker for git hooks"""

    def __init__(self, project_root: Path = None):
        self.project_root = project_root or Path.cwd()
        self.hook_manager_path = self.project_root / "tests" / "hooks" / "integration" / "git-hook-manager.js"
        self.performance_thresholds = {
            "pre-commit": {"max_time_ms": 2000, "min_success_rate": 0.95},
            "post-commit": {"max_time_ms": 1000, "min_success_rate": 0.98},
            "pre-push": {"max_time_ms": 3000, "min_success_rate": 0.90},
            "post-merge": {"max_time_ms": 1500, "min_success_rate": 0.95},
            "pre-rebase": {"max_time_ms": 2000, "min_success_rate": 0.90}
        }
        self.baseline_memory = self._get_current_memory_usage()

    def _get_current_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024
        except:
            return 0.0

    def _get_current_cpu_usage(self) -> float:
        """Get current CPU usage percentage"""
        try:
            return psutil.cpu_percent(interval=0.1)
        except:
            return 0.0

    def execute_single_hook(self, hook_type: str, timeout: int = 30) -> HookExecutionMetrics:
        """Execute a single hook and collect metrics"""
        start_time = time.time()
        start_memory = self._get_current_memory_usage()

        try:
            # Monitor CPU usage during execution
            cpu_start = self._get_current_cpu_usage()

            # Execute hook
            cmd = ["node", str(self.hook_manager_path), "execute-hook", hook_type]
            process = subprocess.Popen(
                cmd,
                cwd=self.project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Monitor process
            try:
                stdout, stderr = process.communicate(timeout=timeout)
                return_code = process.returncode
                success = return_code == 0
                error_message = stderr if stderr and not success else None

            except subprocess.TimeoutExpired:
                process.kill()
                stdout, stderr = process.communicate()
                return_code = -1
                success = False
                error_message = f"Hook execution timeout ({timeout}s)"

            execution_time = (time.time() - start_time) * 1000
            end_memory = self._get_current_memory_usage()
            cpu_end = self._get_current_cpu_usage()

            memory_usage = max(0, end_memory - start_memory)
            cpu_usage = max(0, cpu_end - cpu_start)
            output_length = len(stdout) + len(stderr)

            return HookExecutionMetrics(
                hook_type=hook_type,
                execution_time_ms=execution_time,
                memory_usage_mb=memory_usage,
                cpu_usage_percent=cpu_usage,
                success=success,
                return_code=return_code,
                output_length=output_length,
                timestamp=time.time(),
                process_id=process.pid,
                error_message=error_message
            )

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            return HookExecutionMetrics(
                hook_type=hook_type,
                execution_time_ms=execution_time,
                memory_usage_mb=0,
                cpu_usage_percent=0,
                success=False,
                return_code=-1,
                output_length=0,
                timestamp=time.time(),
                error_message=str(e)
            )

    def benchmark_hook_performance(
        self,
        hook_type: str,
        iterations: int = 20,
        warm_up_iterations: int = 3
    ) -> HookPerformanceBenchmark:
        """Benchmark a specific hook type"""

        print(f"Benchmarking {hook_type} hook (warm-up: {warm_up_iterations}, iterations: {iterations})")

        # Warm-up executions
        print(f"  Running {warm_up_iterations} warm-up executions...")
        for i in range(warm_up_iterations):
            self.execute_single_hook(hook_type)

        # Actual benchmark executions
        print(f"  Running {iterations} benchmark executions...")
        metrics: list[HookExecutionMetrics] = []

        baseline_memory = self._get_current_memory_usage()

        for i in range(iterations):
            if i % 5 == 0:
                print(f"    Progress: {i}/{iterations}")

            metric = self.execute_single_hook(hook_type)
            metrics.append(metric)

            # Small delay to avoid overwhelming system
            time.sleep(0.1)

        # Analyze results
        successful_metrics = [m for m in metrics if m.success]
        failed_metrics = [m for m in metrics if not m.success]

        if not successful_metrics:
            print(f"  WARNING: No successful executions for {hook_type}")
            # Return minimal benchmark data
            return HookPerformanceBenchmark(
                hook_type=hook_type,
                total_executions=len(metrics),
                successful_executions=0,
                failed_executions=len(failed_metrics),
                success_rate=0.0,
                avg_execution_time_ms=0,
                median_execution_time_ms=0,
                p95_execution_time_ms=0,
                p99_execution_time_ms=0,
                max_execution_time_ms=0,
                min_execution_time_ms=0,
                std_dev_execution_time_ms=0,
                avg_memory_usage_mb=0,
                max_memory_usage_mb=0,
                avg_cpu_usage_percent=0,
                max_cpu_usage_percent=0,
                throughput_ops_per_second=0,
                memory_leak_detected=False,
                performance_score=0.0
            )

        # Calculate statistics
        execution_times = [m.execution_time_ms for m in successful_metrics]
        memory_usages = [m.memory_usage_mb for m in successful_metrics]
        cpu_usages = [m.cpu_usage_percent for m in successful_metrics]

        # Execution time statistics
        avg_time = statistics.mean(execution_times)
        median_time = statistics.median(execution_times)
        std_dev_time = statistics.stdev(execution_times) if len(execution_times) > 1 else 0
        min_time = min(execution_times)
        max_time = max(execution_times)

        # Percentiles
        sorted_times = sorted(execution_times)
        p95_time = sorted_times[int(len(sorted_times) * 0.95)] if sorted_times else 0
        p99_time = sorted_times[int(len(sorted_times) * 0.99)] if sorted_times else 0

        # Memory statistics
        avg_memory = statistics.mean(memory_usages) if memory_usages else 0
        max_memory = max(memory_usages) if memory_usages else 0

        # CPU statistics
        avg_cpu = statistics.mean(cpu_usages) if cpu_usages else 0
        max_cpu = max(cpu_usages) if cpu_usages else 0

        # Throughput calculation
        total_time_seconds = sum(execution_times) / 1000
        throughput = len(successful_metrics) / total_time_seconds if total_time_seconds > 0 else 0

        # Memory leak detection
        final_memory = self._get_current_memory_usage()
        memory_growth = final_memory - baseline_memory
        memory_leak_detected = memory_growth > 50  # More than 50MB growth

        # Performance score calculation
        threshold = self.performance_thresholds.get(hook_type, {"max_time_ms": 2000, "min_success_rate": 0.95})
        time_score = max(0, 100 - (avg_time / threshold["max_time_ms"] * 100))
        success_score = (len(successful_metrics) / len(metrics)) * 100
        memory_score = max(0, 100 - (avg_memory / 10) * 10)  # Penalize high memory usage
        performance_score = (time_score + success_score + memory_score) / 3

        return HookPerformanceBenchmark(
            hook_type=hook_type,
            total_executions=len(metrics),
            successful_executions=len(successful_metrics),
            failed_executions=len(failed_metrics),
            success_rate=len(successful_metrics) / len(metrics),
            avg_execution_time_ms=avg_time,
            median_execution_time_ms=median_time,
            p95_execution_time_ms=p95_time,
            p99_execution_time_ms=p99_time,
            max_execution_time_ms=max_time,
            min_execution_time_ms=min_time,
            std_dev_execution_time_ms=std_dev_time,
            avg_memory_usage_mb=avg_memory,
            max_memory_usage_mb=max_memory,
            avg_cpu_usage_percent=avg_cpu,
            max_cpu_usage_percent=max_cpu,
            throughput_ops_per_second=throughput,
            memory_leak_detected=memory_leak_detected,
            performance_score=performance_score
        )

    def benchmark_concurrent_execution(
        self,
        hook_type: str,
        concurrent_workers: int = 5,
        executions_per_worker: int = 10
    ) -> dict[str, Any]:
        """Benchmark concurrent hook execution"""

        print(f"Benchmarking concurrent execution: {concurrent_workers} workers, {executions_per_worker} executions each")

        def worker_function(worker_id: int) -> list[HookExecutionMetrics]:
            worker_metrics = []
            for i in range(executions_per_worker):
                metric = self.execute_single_hook(hook_type)
                metric.process_id = worker_id  # Use worker_id as identifier
                worker_metrics.append(metric)
            return worker_metrics

        start_time = time.time()
        all_metrics = []

        with ThreadPoolExecutor(max_workers=concurrent_workers) as executor:
            futures = [
                executor.submit(worker_function, worker_id)
                for worker_id in range(concurrent_workers)
            ]

            for future in as_completed(futures):
                try:
                    worker_metrics = future.result(timeout=60)
                    all_metrics.extend(worker_metrics)
                except Exception as e:
                    print(f"Worker failed: {e}")

        total_time = time.time() - start_time

        # Analyze concurrent execution results
        successful_metrics = [m for m in all_metrics if m.success]
        failed_metrics = [m for m in all_metrics if not m.success]

        if successful_metrics:
            execution_times = [m.execution_time_ms for m in successful_metrics]
            avg_time = statistics.mean(execution_times)
            max_time = max(execution_times)
            throughput = len(successful_metrics) / total_time
        else:
            avg_time = max_time = throughput = 0

        return {
            "hook_type": hook_type,
            "concurrent_workers": concurrent_workers,
            "executions_per_worker": executions_per_worker,
            "total_executions": len(all_metrics),
            "successful_executions": len(successful_metrics),
            "failed_executions": len(failed_metrics),
            "success_rate": len(successful_metrics) / len(all_metrics) if all_metrics else 0,
            "total_duration_seconds": total_time,
            "avg_execution_time_ms": avg_time,
            "max_execution_time_ms": max_time,
            "concurrent_throughput_ops_per_second": throughput,
            "performance_degradation_factor": avg_time / 500 if avg_time > 0 else 1  # Compared to baseline 500ms
        }

    def run_comprehensive_benchmark(self) -> dict[str, Any]:
        """Run comprehensive performance benchmark for all hook types"""

        print("🔗 Hook Performance Benchmarker - Comprehensive Analysis")
        print("=" * 60)

        results = {
            "benchmark_timestamp": time.time(),
            "project_root": str(self.project_root),
            "baseline_memory_mb": self.baseline_memory,
            "hook_benchmarks": {},
            "concurrent_benchmarks": {},
            "system_info": {
                "cpu_count": psutil.cpu_count(),
                "memory_total_mb": psutil.virtual_memory().total / 1024 / 1024,
                "python_version": sys.version
            },
            "overall_analysis": {}
        }

        # Benchmark individual hook types
        for hook_type in self.performance_thresholds.keys():
            print(f"\n📊 Benchmarking {hook_type} hook...")
            benchmark = self.benchmark_hook_performance(hook_type)
            results["hook_benchmarks"][hook_type] = asdict(benchmark)

            # Report results
            print(f"  ✅ Success Rate: {benchmark.success_rate:.1%}")
            print(f"  ⏱️  Avg Time: {benchmark.avg_execution_time_ms:.1f}ms")
            print(f"  📈 P95 Time: {benchmark.p95_execution_time_ms:.1f}ms")
            print(f"  🧠 Avg Memory: {benchmark.avg_memory_usage_mb:.1f}MB")
            print(f"  📊 Performance Score: {benchmark.performance_score:.1f}/100")

            # Check thresholds
            threshold = self.performance_thresholds[hook_type]
            if benchmark.avg_execution_time_ms > threshold["max_time_ms"]:
                print(f"  ⚠️  WARNING: Exceeds time threshold ({threshold['max_time_ms']}ms)")
            if benchmark.success_rate < threshold["min_success_rate"]:
                print(f"  ⚠️  WARNING: Below success rate threshold ({threshold['min_success_rate']:.1%})")

        # Benchmark concurrent execution
        print("\n🚀 Benchmarking concurrent execution...")
        for hook_type in ["pre-commit", "post-edit"]:  # Most critical hooks
            concurrent_result = self.benchmark_concurrent_execution(hook_type)
            results["concurrent_benchmarks"][hook_type] = concurrent_result

            print(f"  {hook_type}: {concurrent_result['concurrent_throughput_ops_per_second']:.1f} ops/sec")
            print(f"    Success Rate: {concurrent_result['success_rate']:.1%}")
            print(f"    Degradation: {concurrent_result['performance_degradation_factor']:.1f}x")

        # Overall analysis
        all_benchmarks = list(results["hook_benchmarks"].values())
        if all_benchmarks:
            overall_success_rate = statistics.mean([b["success_rate"] for b in all_benchmarks])
            overall_performance_score = statistics.mean([b["performance_score"] for b in all_benchmarks])

            results["overall_analysis"] = {
                "overall_success_rate": overall_success_rate,
                "overall_performance_score": overall_performance_score,
                "hooks_meeting_thresholds": sum(
                    1 for hook, benchmark in results["hook_benchmarks"].items()
                    if (benchmark["avg_execution_time_ms"] <= self.performance_thresholds[hook]["max_time_ms"] and
                        benchmark["success_rate"] >= self.performance_thresholds[hook]["min_success_rate"])
                ),
                "total_hooks_tested": len(all_benchmarks),
                "recommendation": self._generate_recommendation(results)
            }

        return results

    def _generate_recommendation(self, results: dict[str, Any]) -> str:
        """Generate performance improvement recommendations"""
        recommendations = []

        for hook_type, benchmark in results["hook_benchmarks"].items():
            threshold = self.performance_thresholds[hook_type]

            if benchmark["avg_execution_time_ms"] > threshold["max_time_ms"]:
                recommendations.append(f"Optimize {hook_type} hook execution time")

            if benchmark["success_rate"] < threshold["min_success_rate"]:
                recommendations.append(f"Improve {hook_type} hook reliability")

            if benchmark["memory_leak_detected"]:
                recommendations.append(f"Investigate memory leaks in {hook_type} hook")

        if not recommendations:
            return "All hooks meet performance thresholds. System ready for production."
        else:
            return "; ".join(recommendations)

    def save_benchmark_report(self, results: dict[str, Any], output_path: Path = None):
        """Save detailed benchmark report"""
        if output_path is None:
            output_path = self.project_root / ".claude_workspace" / "reports" / "hook-performance-benchmark.json"

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\n📄 Benchmark report saved: {output_path}")

        # Also create human-readable summary
        summary_path = output_path.parent / "hook-performance-summary.txt"
        self._create_summary_report(results, summary_path)
        print(f"📋 Summary report saved: {summary_path}")

    def _create_summary_report(self, results: dict[str, Any], output_path: Path):
        """Create human-readable summary report"""
        with open(output_path, 'w') as f:
            f.write("Hook Performance Benchmark Summary\n")
            f.write("=" * 40 + "\n\n")

            f.write(f"Benchmark Date: {time.ctime(results['benchmark_timestamp'])}\n")
            f.write(f"Project Root: {results['project_root']}\n\n")

            f.write("Individual Hook Performance:\n")
            f.write("-" * 30 + "\n")

            for hook_type, benchmark in results["hook_benchmarks"].items():
                f.write(f"\n{hook_type.upper()} Hook:\n")
                f.write(f"  Success Rate: {benchmark['success_rate']:.1%}\n")
                f.write(f"  Avg Execution: {benchmark['avg_execution_time_ms']:.1f}ms\n")
                f.write(f"  P95 Execution: {benchmark['p95_execution_time_ms']:.1f}ms\n")
                f.write(f"  Memory Usage: {benchmark['avg_memory_usage_mb']:.1f}MB\n")
                f.write(f"  Performance Score: {benchmark['performance_score']:.1f}/100\n")

                threshold = self.performance_thresholds[hook_type]
                if benchmark['avg_execution_time_ms'] > threshold['max_time_ms']:
                    f.write(f"  ⚠️  EXCEEDS TIME THRESHOLD ({threshold['max_time_ms']}ms)\n")
                if benchmark['success_rate'] < threshold['min_success_rate']:
                    f.write(f"  ⚠️  BELOW SUCCESS THRESHOLD ({threshold['min_success_rate']:.1%})\n")

            if "overall_analysis" in results:
                f.write("\nOverall Analysis:\n")
                f.write("-" * 20 + "\n")
                analysis = results["overall_analysis"]
                f.write(f"Overall Success Rate: {analysis['overall_success_rate']:.1%}\n")
                f.write(f"Overall Performance Score: {analysis['overall_performance_score']:.1f}/100\n")
                f.write(f"Hooks Meeting Thresholds: {analysis['hooks_meeting_thresholds']}/{analysis['total_hooks_tested']}\n")
                f.write(f"Recommendation: {analysis['recommendation']}\n")


def main():
    """Main execution function"""
    import argparse

    parser = argparse.ArgumentParser(description="Hook Performance Benchmarker")
    parser.add_argument("--hook", type=str, help="Benchmark specific hook type")
    parser.add_argument("--iterations", type=int, default=20, help="Number of iterations per benchmark")
    parser.add_argument("--concurrent", action="store_true", help="Include concurrent execution tests")
    parser.add_argument("--output", type=str, help="Output file path for results")

    args = parser.parse_args()

    benchmarker = HookPerformanceBenchmarker()

    if args.hook:
        # Single hook benchmark
        print(f"Benchmarking {args.hook} hook...")
        benchmark = benchmarker.benchmark_hook_performance(args.hook, args.iterations)
        results = {
            "benchmark_timestamp": time.time(),
            "project_root": str(benchmarker.project_root),
            "hook_benchmarks": {args.hook: asdict(benchmark)}
        }
    else:
        # Comprehensive benchmark
        results = benchmarker.run_comprehensive_benchmark()

    # Save results
    output_path = Path(args.output) if args.output else None
    benchmarker.save_benchmark_report(results, output_path)

    print("\n✅ Benchmark complete!")


if __name__ == "__main__":
    main()
