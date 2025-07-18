#!/usr/bin/env python3
"""
Staging Performance Benchmarking
Week 2: Comprehensive performance metrics for ADK coordination
"""

import os
import sys
import json
import time
import statistics
import asyncio
from datetime import datetime
from typing import List, Dict

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load staging environment
from dotenv import load_dotenv
load_dotenv('.env.staging')

class PerformanceBenchmark:
    """Performance benchmarking for ADK coordination."""
    
    def __init__(self):
        self.results = {
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "timestamp": datetime.now().isoformat(),
            "benchmarks": {},
            "summary": {}
        }
    
    def calculate_percentiles(self, timings: List[float]) -> Dict[str, float]:
        """Calculate percentile metrics."""
        if not timings:
            return {}
        
        sorted_timings = sorted(timings)
        n = len(sorted_timings)
        
        return {
            "min": sorted_timings[0],
            "p50": sorted_timings[int(n * 0.50)],
            "p90": sorted_timings[int(n * 0.90)],
            "p95": sorted_timings[int(n * 0.95)],
            "p99": sorted_timings[int(n * 0.99)],
            "max": sorted_timings[-1],
            "mean": statistics.mean(timings),
            "std_dev": statistics.stdev(timings) if n > 1 else 0
        }
    
    async def benchmark_single_agent(self, iterations: int = 100) -> Dict:
        """Benchmark single agent coordination."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print(f"\n📊 Benchmarking Single Agent Performance ({iterations} iterations)...")
        
        timings = []
        errors = 0
        
        for i in range(iterations):
            start_time = time.perf_counter()
            
            try:
                result = real_delegate_to_agent(
                    agent_name="architecture_specialist",
                    task=f"Performance benchmark iteration #{i}",
                    context="Single agent benchmark"
                )
                
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                timings.append(elapsed_ms)
                
                # Verify success
                result_data = json.loads(result)
                if result_data.get("status") != "success":
                    errors += 1
                    
            except Exception as e:
                errors += 1
                print(f"  ❌ Error in iteration {i}: {e}")
            
            # Progress indicator
            if (i + 1) % 25 == 0:
                print(f"  Progress: {i + 1}/{iterations}")
        
        metrics = self.calculate_percentiles(timings)
        metrics["iterations"] = iterations
        metrics["errors"] = errors
        metrics["success_rate"] = ((iterations - errors) / iterations * 100)
        
        return metrics
    
    async def benchmark_agent_rotation(self, iterations: int = 100) -> Dict:
        """Benchmark rotating through different agents."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print(f"\n📊 Benchmarking Agent Rotation ({iterations} iterations)...")
        
        agents = [
            "architecture_specialist",
            "data_science_specialist",
            "security_specialist",
            "devops_specialist",
            "qa_specialist"
        ]
        
        timings = []
        errors = 0
        
        for i in range(iterations):
            agent = agents[i % len(agents)]
            start_time = time.perf_counter()
            
            try:
                result = real_delegate_to_agent(
                    agent_name=agent,
                    task=f"Rotation benchmark #{i}",
                    context="Agent rotation benchmark"
                )
                
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                timings.append(elapsed_ms)
                
                result_data = json.loads(result)
                if result_data.get("status") != "success":
                    errors += 1
                    
            except Exception as e:
                errors += 1
            
            if (i + 1) % 25 == 0:
                print(f"  Progress: {i + 1}/{iterations}")
        
        metrics = self.calculate_percentiles(timings)
        metrics["iterations"] = iterations
        metrics["errors"] = errors
        metrics["success_rate"] = ((iterations - errors) / iterations * 100)
        
        return metrics
    
    async def benchmark_concurrent_load(self, concurrent_requests: int = 10, duration_seconds: int = 30) -> Dict:
        """Benchmark concurrent load handling."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print(f"\n📊 Benchmarking Concurrent Load ({concurrent_requests} concurrent, {duration_seconds}s duration)...")
        
        agents = [
            "architecture_specialist",
            "data_science_specialist",
            "security_specialist"
        ]
        
        timings = []
        errors = 0
        total_requests = 0
        start_time = time.time()
        
        async def make_request(request_id: int):
            """Make a single coordination request."""
            agent = agents[request_id % len(agents)]
            req_start = time.perf_counter()
            
            try:
                result = await asyncio.to_thread(
                    real_delegate_to_agent,
                    agent_name=agent,
                    task=f"Concurrent request #{request_id}",
                    context="Load testing"
                )
                
                elapsed_ms = (time.perf_counter() - req_start) * 1000
                timings.append(elapsed_ms)
                
                result_data = json.loads(result)
                if result_data.get("status") != "success":
                    return False
                return True
                
            except Exception:
                return False
        
        # Run concurrent requests for specified duration
        request_id = 0
        
        while (time.time() - start_time) < duration_seconds:
            # Launch batch of concurrent requests
            tasks = []
            for _ in range(concurrent_requests):
                task = make_request(request_id)
                tasks.append(task)
                request_id += 1
            
            # Wait for batch to complete
            results = await asyncio.gather(*tasks)
            
            total_requests += len(results)
            errors += sum(1 for r in results if not r)
            
            # Brief pause between batches
            await asyncio.sleep(0.1)
        
        elapsed_time = time.time() - start_time
        
        metrics = self.calculate_percentiles(timings) if timings else {}
        metrics["duration_seconds"] = elapsed_time
        metrics["total_requests"] = total_requests
        metrics["requests_per_second"] = total_requests / elapsed_time
        metrics["concurrent_requests"] = concurrent_requests
        metrics["errors"] = errors
        metrics["success_rate"] = ((total_requests - errors) / total_requests * 100) if total_requests > 0 else 0
        
        return metrics
    
    async def benchmark_payload_sizes(self) -> Dict:
        """Benchmark different payload sizes."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n📊 Benchmarking Payload Size Impact...")
        
        payload_tests = [
            ("small", "Analyze code", "Brief context"),
            ("medium", "Analyze the entire codebase structure and identify key architectural patterns" * 5, "Medium context with additional details" * 5),
            ("large", "Perform comprehensive analysis" * 50, "Large context" * 100)
        ]
        
        results = {}
        
        for size_name, task, context in payload_tests:
            print(f"  Testing {size_name} payload...")
            timings = []
            
            for i in range(20):
                start_time = time.perf_counter()
                
                try:
                    result = real_delegate_to_agent(
                        agent_name="architecture_specialist",
                        task=task,
                        context=context
                    )
                    
                    elapsed_ms = (time.perf_counter() - start_time) * 1000
                    timings.append(elapsed_ms)
                    
                except Exception:
                    pass
            
            if timings:
                results[size_name] = {
                    "task_length": len(task),
                    "context_length": len(context),
                    "mean_ms": statistics.mean(timings),
                    "p95_ms": sorted(timings)[int(len(timings) * 0.95)]
                }
        
        return results
    
    async def run_all_benchmarks(self):
        """Run all performance benchmarks."""
        print("=" * 60)
        print("🚀 Staging Performance Benchmark Suite")
        print("=" * 60)
        print(f"Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
        print(f"ADK Coordination: {os.getenv('USE_ADK_COORDINATION', 'false')}")
        print(f"Thresholds: <{os.getenv('RESPONSE_TIME_THRESHOLD_MS', '10')}ms response time")
        print("=" * 60)
        
        # Run benchmarks
        self.results["benchmarks"]["single_agent"] = await self.benchmark_single_agent(100)
        self.results["benchmarks"]["agent_rotation"] = await self.benchmark_agent_rotation(100)
        self.results["benchmarks"]["concurrent_load"] = await self.benchmark_concurrent_load(10, 10)
        self.results["benchmarks"]["payload_sizes"] = await self.benchmark_payload_sizes()
        
        # Generate summary
        self.generate_summary()
        
        # Display results
        self.display_results()
        
        # Save results
        report_path = ".development/reports/staging-performance-benchmark.json"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Benchmark results saved to: {report_path}")
        
        # Check against thresholds
        return self.check_thresholds()
    
    def generate_summary(self):
        """Generate performance summary."""
        threshold_ms = float(os.getenv("RESPONSE_TIME_THRESHOLD_MS", "10"))
        
        # Single agent performance
        single = self.results["benchmarks"]["single_agent"]
        
        self.results["summary"] = {
            "response_time": {
                "mean_ms": single.get("mean", 0),
                "p95_ms": single.get("p95", 0),
                "p99_ms": single.get("p99", 0),
                "threshold_ms": threshold_ms,
                "meets_threshold": single.get("p95", 0) < threshold_ms
            },
            "reliability": {
                "single_agent_success": single.get("success_rate", 0),
                "rotation_success": self.results["benchmarks"]["agent_rotation"].get("success_rate", 0),
                "concurrent_success": self.results["benchmarks"]["concurrent_load"].get("success_rate", 0)
            },
            "throughput": {
                "requests_per_second": self.results["benchmarks"]["concurrent_load"].get("requests_per_second", 0)
            }
        }
    
    def display_results(self):
        """Display benchmark results."""
        print("\n" + "=" * 60)
        print("📊 Performance Benchmark Results")
        print("=" * 60)
        
        # Single agent results
        single = self.results["benchmarks"]["single_agent"]
        print("\n🎯 Single Agent Performance:")
        print(f"  Mean: {single.get('mean', 0):.2f} ms")
        print(f"  P50: {single.get('p50', 0):.2f} ms")
        print(f"  P95: {single.get('p95', 0):.2f} ms")
        print(f"  P99: {single.get('p99', 0):.2f} ms")
        print(f"  Success Rate: {single.get('success_rate', 0):.1f}%")
        
        # Rotation results
        rotation = self.results["benchmarks"]["agent_rotation"]
        print("\n🔄 Agent Rotation Performance:")
        print(f"  Mean: {rotation.get('mean', 0):.2f} ms")
        print(f"  P95: {rotation.get('p95', 0):.2f} ms")
        print(f"  Success Rate: {rotation.get('success_rate', 0):.1f}%")
        
        # Concurrent load results
        concurrent = self.results["benchmarks"]["concurrent_load"]
        print("\n⚡ Concurrent Load Performance:")
        print(f"  Throughput: {concurrent.get('requests_per_second', 0):.1f} req/s")
        print(f"  Mean: {concurrent.get('mean', 0):.2f} ms")
        print(f"  P95: {concurrent.get('p95', 0):.2f} ms")
        print(f"  Success Rate: {concurrent.get('success_rate', 0):.1f}%")
        
        # Payload size impact
        payload = self.results["benchmarks"]["payload_sizes"]
        print("\n📦 Payload Size Impact:")
        for size, metrics in payload.items():
            print(f"  {size}: {metrics['mean_ms']:.2f} ms (P95: {metrics['p95_ms']:.2f} ms)")
    
    def check_thresholds(self) -> bool:
        """Check if performance meets thresholds."""
        summary = self.results["summary"]
        
        print("\n" + "=" * 60)
        print("✅ Threshold Validation")
        print("=" * 60)
        
        all_passed = True
        
        # Response time threshold
        if summary["response_time"]["meets_threshold"]:
            print(f"✅ Response Time: P95 {summary['response_time']['p95_ms']:.2f}ms < {summary['response_time']['threshold_ms']}ms threshold")
        else:
            print(f"❌ Response Time: P95 {summary['response_time']['p95_ms']:.2f}ms > {summary['response_time']['threshold_ms']}ms threshold")
            all_passed = False
        
        # Success rate thresholds
        success_threshold = 99.5
        
        for metric_name, success_rate in summary["reliability"].items():
            if success_rate >= success_threshold:
                print(f"✅ {metric_name}: {success_rate:.1f}% >= {success_threshold}% threshold")
            else:
                print(f"❌ {metric_name}: {success_rate:.1f}% < {success_threshold}% threshold")
                all_passed = False
        
        return all_passed

async def main():
    """Main entry point."""
    benchmark = PerformanceBenchmark()
    success = await benchmark.run_all_benchmarks()
    
    if success:
        print("\n✅ All performance benchmarks PASSED!")
        print("🎯 Staging environment meets performance requirements")
        return 0
    else:
        print("\n❌ Some performance benchmarks FAILED!")
        print("🔧 Performance optimization needed before proceeding")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))