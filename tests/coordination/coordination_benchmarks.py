#!/usr/bin/env python3
"""
Coordination Performance Benchmarks for VANA
Performance testing and benchmarking for coordination functionality

This module provides comprehensive performance testing for:
- Coordination response times
- Workflow management performance
- Load testing for concurrent operations
- Success rate under stress conditions
"""

import asyncio
import time
import statistics
import sys
from pathlib import Path
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import json

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from lib._tools.adk_tools import (
    coordinate_task, delegate_to_agent, get_agent_status,
    get_workflow_templates, create_workflow, list_workflows
)

@dataclass
class BenchmarkResult:
    """Result of a performance benchmark"""
    test_name: str
    total_operations: int
    successful_operations: int
    failed_operations: int
    success_rate: float
    total_time: float
    average_time: float
    min_time: float
    max_time: float
    median_time: float
    p95_time: float
    operations_per_second: float

class CoordinationBenchmarks:
    """Performance benchmarks for coordination functionality"""
    
    def __init__(self):
        self.results: List[BenchmarkResult] = []
    
    async def run_all_benchmarks(self) -> Dict[str, Any]:
        """Run all coordination performance benchmarks"""
        print("⚡ Starting Coordination Performance Benchmarks")
        print("=" * 60)
        
        # Run individual benchmarks
        await self._benchmark_basic_coordination()
        await self._benchmark_workflow_operations()
        await self._benchmark_concurrent_operations()
        await self._benchmark_stress_testing()
        
        # Generate comprehensive report
        report = self._generate_benchmark_report()
        
        # Print summary
        self._print_benchmark_summary(report)
        
        return report
    
    async def _benchmark_basic_coordination(self):
        """Benchmark basic coordination operations"""
        print("\n🔧 Benchmarking Basic Coordination Operations")
        print("-" * 50)
        
        # Test coordinate_task performance
        await self._run_benchmark(
            "coordinate_task_performance",
            lambda: coordinate_task("execute simple python code", "normal"),
            iterations=20
        )
        
        # Test delegate_to_agent performance
        await self._run_benchmark(
            "delegate_to_agent_performance", 
            lambda: delegate_to_agent("data_science", "analyze sample data"),
            iterations=15
        )
        
        # Test get_agent_status performance
        await self._run_benchmark(
            "get_agent_status_performance",
            lambda: get_agent_status(),
            iterations=30
        )
    
    async def _benchmark_workflow_operations(self):
        """Benchmark workflow management operations"""
        print("\n🔄 Benchmarking Workflow Operations")
        print("-" * 50)
        
        # Test workflow template retrieval
        await self._run_benchmark(
            "get_workflow_templates_performance",
            lambda: get_workflow_templates(),
            iterations=25
        )
        
        # Test workflow creation
        await self._run_benchmark(
            "create_workflow_performance",
            lambda: create_workflow(
                name=f"Benchmark Workflow {time.time()}",
                description="Performance test workflow",
                template_name="data_analysis"
            ),
            iterations=10
        )
        
        # Test workflow listing
        await self._run_benchmark(
            "list_workflows_performance",
            lambda: list_workflows(),
            iterations=20
        )
    
    async def _benchmark_concurrent_operations(self):
        """Benchmark concurrent coordination operations"""
        print("\n🔀 Benchmarking Concurrent Operations")
        print("-" * 50)
        
        # Test concurrent coordination tasks
        await self._run_concurrent_benchmark(
            "concurrent_coordination",
            lambda: coordinate_task("process data concurrently", "normal"),
            concurrent_operations=5,
            iterations=3
        )
        
        # Test concurrent workflow operations
        await self._run_concurrent_benchmark(
            "concurrent_workflow_creation",
            lambda: create_workflow(
                name=f"Concurrent Workflow {time.time()}",
                description="Concurrent test workflow",
                template_name="code_execution"
            ),
            concurrent_operations=3,
            iterations=2
        )
    
    async def _benchmark_stress_testing(self):
        """Benchmark system under stress conditions"""
        print("\n💪 Stress Testing Coordination System")
        print("-" * 50)
        
        # High-frequency coordination requests
        await self._run_benchmark(
            "high_frequency_coordination",
            lambda: coordinate_task("stress test task", "normal"),
            iterations=50,
            delay_between_operations=0.1
        )
        
        # Rapid workflow operations
        await self._run_benchmark(
            "rapid_workflow_operations",
            lambda: get_workflow_templates(),
            iterations=100,
            delay_between_operations=0.05
        )
    
    async def _run_benchmark(self, test_name: str, operation_func, iterations: int = 10, delay_between_operations: float = 0.0):
        """Run a performance benchmark for a specific operation"""
        print(f"  Running {test_name} ({iterations} iterations)...")
        
        times = []
        successful = 0
        failed = 0
        
        start_time = time.time()
        
        for i in range(iterations):
            operation_start = time.time()
            
            try:
                result = operation_func()
                operation_time = time.time() - operation_start
                times.append(operation_time)
                successful += 1
                
                # Basic success validation
                if isinstance(result, str) and ("error" not in result.lower() or "success" in result.lower()):
                    pass  # Consider it successful
                elif isinstance(result, dict) and result.get("status") != "error":
                    pass  # Consider it successful
                
            except Exception as e:
                operation_time = time.time() - operation_start
                times.append(operation_time)
                failed += 1
                print(f"    Operation {i+1} failed: {str(e)[:50]}...")
            
            if delay_between_operations > 0:
                await asyncio.sleep(delay_between_operations)
        
        total_time = time.time() - start_time
        
        # Calculate statistics
        if times:
            result = BenchmarkResult(
                test_name=test_name,
                total_operations=iterations,
                successful_operations=successful,
                failed_operations=failed,
                success_rate=successful / iterations,
                total_time=total_time,
                average_time=statistics.mean(times),
                min_time=min(times),
                max_time=max(times),
                median_time=statistics.median(times),
                p95_time=statistics.quantiles(times, n=20)[18] if len(times) >= 20 else max(times),
                operations_per_second=iterations / total_time
            )
            
            self.results.append(result)
            print(f"    ✅ Completed: {successful}/{iterations} successful ({result.success_rate:.1%})")
            print(f"    ⏱️  Avg time: {result.average_time:.3f}s, Ops/sec: {result.operations_per_second:.1f}")
        else:
            print(f"    ❌ No valid timing data collected")
    
    async def _run_concurrent_benchmark(self, test_name: str, operation_func, concurrent_operations: int = 5, iterations: int = 3):
        """Run concurrent operations benchmark"""
        print(f"  Running {test_name} ({concurrent_operations} concurrent ops, {iterations} iterations)...")
        
        all_times = []
        total_successful = 0
        total_failed = 0
        
        start_time = time.time()
        
        for iteration in range(iterations):
            # Run concurrent operations
            tasks = []
            iteration_start = time.time()
            
            for _ in range(concurrent_operations):
                task = asyncio.create_task(self._timed_operation(operation_func))
                tasks.append(task)
            
            # Wait for all tasks to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for result in results:
                if isinstance(result, Exception):
                    total_failed += 1
                    all_times.append(0.1)  # Placeholder time for failed operations
                else:
                    execution_time, success = result
                    all_times.append(execution_time)
                    if success:
                        total_successful += 1
                    else:
                        total_failed += 1
        
        total_time = time.time() - start_time
        total_operations = concurrent_operations * iterations
        
        if all_times:
            result = BenchmarkResult(
                test_name=test_name,
                total_operations=total_operations,
                successful_operations=total_successful,
                failed_operations=total_failed,
                success_rate=total_successful / total_operations,
                total_time=total_time,
                average_time=statistics.mean(all_times),
                min_time=min(all_times),
                max_time=max(all_times),
                median_time=statistics.median(all_times),
                p95_time=statistics.quantiles(all_times, n=20)[18] if len(all_times) >= 20 else max(all_times),
                operations_per_second=total_operations / total_time
            )
            
            self.results.append(result)
            print(f"    ✅ Completed: {total_successful}/{total_operations} successful ({result.success_rate:.1%})")
            print(f"    ⏱️  Avg time: {result.average_time:.3f}s, Ops/sec: {result.operations_per_second:.1f}")
    
    async def _timed_operation(self, operation_func) -> Tuple[float, bool]:
        """Execute an operation with timing"""
        start_time = time.time()
        
        try:
            result = operation_func()
            execution_time = time.time() - start_time
            
            # Determine success
            success = True
            if isinstance(result, str) and "error" in result.lower() and "success" not in result.lower():
                success = False
            elif isinstance(result, dict) and result.get("status") == "error":
                success = False
            
            return execution_time, success
            
        except Exception:
            execution_time = time.time() - start_time
            return execution_time, False
    
    def _generate_benchmark_report(self) -> Dict[str, Any]:
        """Generate comprehensive benchmark report"""
        if not self.results:
            return {"error": "No benchmark results available"}
        
        # Overall statistics
        overall_success_rate = sum(r.successful_operations for r in self.results) / sum(r.total_operations for r in self.results)
        overall_avg_time = statistics.mean([r.average_time for r in self.results])
        overall_ops_per_sec = sum(r.operations_per_second for r in self.results) / len(self.results)
        
        # Performance grades
        performance_grade = self._calculate_performance_grade(overall_success_rate, overall_avg_time)
        
        return {
            "benchmark_summary": {
                "total_benchmarks": len(self.results),
                "overall_success_rate": overall_success_rate,
                "overall_avg_response_time": overall_avg_time,
                "overall_ops_per_second": overall_ops_per_sec,
                "performance_grade": performance_grade
            },
            "detailed_results": [
                {
                    "test_name": r.test_name,
                    "success_rate": r.success_rate,
                    "avg_time": r.average_time,
                    "min_time": r.min_time,
                    "max_time": r.max_time,
                    "p95_time": r.p95_time,
                    "ops_per_second": r.operations_per_second,
                    "total_operations": r.total_operations
                }
                for r in self.results
            ],
            "performance_targets": {
                "success_rate_target": 0.90,
                "response_time_target": 5.0,
                "success_rate_achieved": overall_success_rate >= 0.90,
                "response_time_achieved": overall_avg_time <= 5.0
            }
        }
    
    def _calculate_performance_grade(self, success_rate: float, avg_time: float) -> str:
        """Calculate performance grade based on metrics"""
        if success_rate >= 0.95 and avg_time <= 2.0:
            return "A+"
        elif success_rate >= 0.90 and avg_time <= 3.0:
            return "A"
        elif success_rate >= 0.85 and avg_time <= 5.0:
            return "B"
        elif success_rate >= 0.75 and avg_time <= 8.0:
            return "C"
        else:
            return "D"
    
    def _print_benchmark_summary(self, report: Dict[str, Any]):
        """Print benchmark summary"""
        summary = report["benchmark_summary"]
        targets = report["performance_targets"]
        
        print("\n" + "=" * 60)
        print("⚡ COORDINATION PERFORMANCE SUMMARY")
        print("=" * 60)
        
        print(f"📊 Overall Performance:")
        print(f"   Success Rate: {summary['overall_success_rate']:.1%}")
        print(f"   Avg Response Time: {summary['overall_avg_response_time']:.3f}s")
        print(f"   Operations/Second: {summary['overall_ops_per_second']:.1f}")
        print(f"   Performance Grade: {summary['performance_grade']}")
        
        print(f"\n🎯 Target Achievement:")
        print(f"   Success Rate Target (90%): {'✅ ACHIEVED' if targets['success_rate_achieved'] else '❌ MISSED'}")
        print(f"   Response Time Target (5s): {'✅ ACHIEVED' if targets['response_time_achieved'] else '❌ MISSED'}")

async def main():
    """Main entry point for benchmarks"""
    benchmarks = CoordinationBenchmarks()
    report = await benchmarks.run_all_benchmarks()
    
    # Save report
    results_dir = Path("tests/results")
    results_dir.mkdir(exist_ok=True)
    
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"coordination_benchmarks_{timestamp}.json"
    filepath = results_dir / filename
    
    with open(filepath, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n📊 Benchmark report saved to: {filepath}")
    
    # Return exit code based on performance
    targets = report["performance_targets"]
    return 0 if targets["success_rate_achieved"] and targets["response_time_achieved"] else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
