#!/usr/bin/env python3
"""
Staging Load Testing
Week 2: Stress test ADK coordination under load
"""

import os
import sys
import json
import time
import asyncio
import statistics
from datetime import datetime
from typing import List, Dict, Tuple

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load staging environment
from dotenv import load_dotenv
load_dotenv('.env.staging')

class LoadTest:
    """Load testing for ADK coordination."""
    
    def __init__(self):
        self.results = {
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "timestamp": datetime.now().isoformat(),
            "load_tests": {},
            "summary": {}
        }
        self.agents = [
            "architecture_specialist",
            "data_science_specialist",
            "security_specialist",
            "devops_specialist",
            "qa_specialist"
        ]
    
    async def sustained_load_test(self, rps: int = 50, duration: int = 60) -> Dict:
        """Test sustained load at target requests per second."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print(f"\n🔥 Sustained Load Test: {rps} req/s for {duration}s...")
        
        results = {
            "target_rps": rps,
            "duration": duration,
            "requests": 0,
            "successes": 0,
            "errors": 0,
            "response_times": [],
            "error_types": {}
        }
        
        interval = 1.0 / rps  # Time between requests
        start_time = time.time()
        request_id = 0
        
        async def send_request(req_id: int):
            """Send a single request."""
            agent = self.agents[req_id % len(self.agents)]
            req_start = time.perf_counter()
            
            try:
                result = await asyncio.to_thread(
                    real_delegate_to_agent,
                    agent_name=agent,
                    task=f"Load test request #{req_id}",
                    context="Sustained load testing"
                )
                
                elapsed_ms = (time.perf_counter() - req_start) * 1000
                results["response_times"].append(elapsed_ms)
                
                result_data = json.loads(result)
                if result_data.get("status") == "success":
                    results["successes"] += 1
                else:
                    results["errors"] += 1
                    error_type = result_data.get("error", "Unknown")
                    results["error_types"][error_type] = results["error_types"].get(error_type, 0) + 1
                    
            except Exception as e:
                results["errors"] += 1
                error_type = str(type(e).__name__)
                results["error_types"][error_type] = results["error_types"].get(error_type, 0) + 1
            
            results["requests"] += 1
        
        # Generate requests at target rate
        tasks = []
        while (time.time() - start_time) < duration:
            task = asyncio.create_task(send_request(request_id))
            tasks.append(task)
            request_id += 1
            
            # Wait for next request interval
            await asyncio.sleep(interval)
            
            # Progress update
            if request_id % (rps * 10) == 0:
                elapsed = time.time() - start_time
                print(f"  Progress: {elapsed:.0f}s / {duration}s")
        
        # Wait for all requests to complete
        print("  Waiting for remaining requests to complete...")
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calculate metrics
        actual_duration = time.time() - start_time
        results["actual_duration"] = actual_duration
        results["actual_rps"] = results["requests"] / actual_duration
        results["success_rate"] = (results["successes"] / results["requests"] * 100) if results["requests"] > 0 else 0
        
        if results["response_times"]:
            results["response_metrics"] = self.calculate_percentiles(results["response_times"])
        
        return results
    
    async def spike_test(self, baseline_rps: int = 10, spike_rps: int = 100, spike_duration: int = 10) -> Dict:
        """Test system response to traffic spikes."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print(f"\n⚡ Spike Test: {baseline_rps} → {spike_rps} req/s...")
        
        results = {
            "baseline_rps": baseline_rps,
            "spike_rps": spike_rps,
            "spike_duration": spike_duration,
            "phases": {}
        }
        
        # Phase 1: Baseline (20s)
        print(f"  Phase 1: Baseline ({baseline_rps} req/s for 20s)")
        baseline_results = await self.sustained_load_test(baseline_rps, 20)
        results["phases"]["baseline"] = baseline_results
        
        # Phase 2: Spike (spike_duration)
        print(f"  Phase 2: Spike ({spike_rps} req/s for {spike_duration}s)")
        spike_results = await self.sustained_load_test(spike_rps, spike_duration)
        results["phases"]["spike"] = spike_results
        
        # Phase 3: Recovery (20s)
        print(f"  Phase 3: Recovery ({baseline_rps} req/s for 20s)")
        recovery_results = await self.sustained_load_test(baseline_rps, 20)
        results["phases"]["recovery"] = recovery_results
        
        # Analyze spike impact
        if baseline_results["response_times"] and spike_results["response_times"]:
            baseline_p95 = sorted(baseline_results["response_times"])[int(len(baseline_results["response_times"]) * 0.95)]
            spike_p95 = sorted(spike_results["response_times"])[int(len(spike_results["response_times"]) * 0.95)]
            results["spike_impact"] = {
                "latency_increase": ((spike_p95 - baseline_p95) / baseline_p95 * 100),
                "error_rate_increase": spike_results.get("errors", 0) - baseline_results.get("errors", 0)
            }
        
        return results
    
    async def stress_test(self, start_rps: int = 10, increment: int = 10, max_rps: int = 200) -> Dict:
        """Gradually increase load to find breaking point."""
        print(f"\n💪 Stress Test: {start_rps} → {max_rps} req/s...")
        
        results = {
            "start_rps": start_rps,
            "max_rps": max_rps,
            "increment": increment,
            "breaking_point": None,
            "steps": []
        }
        
        current_rps = start_rps
        
        while current_rps <= max_rps:
            print(f"  Testing at {current_rps} req/s...")
            
            # Run 30s test at current rate
            step_result = await self.sustained_load_test(current_rps, 30)
            
            step_summary = {
                "rps": current_rps,
                "success_rate": step_result["success_rate"],
                "p95_ms": step_result.get("response_metrics", {}).get("p95", 0),
                "errors": step_result["errors"]
            }
            results["steps"].append(step_summary)
            
            # Check for breaking point (success rate < 95% or P95 > 50ms)
            if step_result["success_rate"] < 95.0 or step_summary["p95_ms"] > 50:
                results["breaking_point"] = {
                    "rps": current_rps,
                    "reason": "success_rate" if step_result["success_rate"] < 95.0 else "latency",
                    "success_rate": step_result["success_rate"],
                    "p95_ms": step_summary["p95_ms"]
                }
                print(f"  ❌ Breaking point found at {current_rps} req/s")
                break
            
            current_rps += increment
        
        if not results["breaking_point"]:
            print(f"  ✅ System handled up to {max_rps} req/s without breaking")
        
        return results
    
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
            "mean": statistics.mean(timings)
        }
    
    async def run_all_tests(self):
        """Run all load tests."""
        print("=" * 60)
        print("🚀 Staging Load Test Suite")
        print("=" * 60)
        print(f"Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
        print(f"ADK Coordination: {os.getenv('USE_ADK_COORDINATION', 'false')}")
        print("=" * 60)
        
        # Run load tests
        self.results["load_tests"]["sustained_50rps"] = await self.sustained_load_test(50, 60)
        self.results["load_tests"]["spike_test"] = await self.spike_test(10, 100, 10)
        self.results["load_tests"]["stress_test"] = await self.stress_test(10, 20, 100)
        
        # Generate summary
        self.generate_summary()
        
        # Display results
        self.display_results()
        
        # Save results
        report_path = ".development/reports/staging-load-test-results.json"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Load test results saved to: {report_path}")
        
        # Check if tests passed
        return self.check_results()
    
    def generate_summary(self):
        """Generate load test summary."""
        sustained = self.results["load_tests"]["sustained_50rps"]
        spike = self.results["load_tests"]["spike_test"]
        stress = self.results["load_tests"]["stress_test"]
        
        self.results["summary"] = {
            "sustained_load": {
                "target_rps": sustained["target_rps"],
                "actual_rps": sustained["actual_rps"],
                "success_rate": sustained["success_rate"],
                "p95_latency": sustained.get("response_metrics", {}).get("p95", 0)
            },
            "spike_resilience": {
                "spike_handled": spike["phases"]["spike"]["success_rate"] > 95,
                "latency_impact": spike.get("spike_impact", {}).get("latency_increase", 0),
                "recovery": spike["phases"]["recovery"]["success_rate"] > 99
            },
            "max_capacity": {
                "breaking_point_rps": stress.get("breaking_point", {}).get("rps", "Not found"),
                "max_tested_rps": stress["max_rps"]
            }
        }
    
    def display_results(self):
        """Display load test results."""
        print("\n" + "=" * 60)
        print("📊 Load Test Results")
        print("=" * 60)
        
        # Sustained load results
        sustained = self.results["load_tests"]["sustained_50rps"]
        print(f"\n🔥 Sustained Load (50 req/s for 60s):")
        print(f"  Actual Rate: {sustained['actual_rps']:.1f} req/s")
        print(f"  Success Rate: {sustained['success_rate']:.1f}%")
        print(f"  P95 Latency: {sustained.get('response_metrics', {}).get('p95', 0):.2f} ms")
        print(f"  Total Requests: {sustained['requests']}")
        print(f"  Errors: {sustained['errors']}")
        
        # Spike test results
        spike = self.results["load_tests"]["spike_test"]
        print(f"\n⚡ Spike Test Results:")
        print(f"  Baseline P95: {spike['phases']['baseline'].get('response_metrics', {}).get('p95', 0):.2f} ms")
        print(f"  Spike P95: {spike['phases']['spike'].get('response_metrics', {}).get('p95', 0):.2f} ms")
        print(f"  Recovery P95: {spike['phases']['recovery'].get('response_metrics', {}).get('p95', 0):.2f} ms")
        print(f"  Latency Impact: +{spike.get('spike_impact', {}).get('latency_increase', 0):.1f}%")
        
        # Stress test results
        stress = self.results["load_tests"]["stress_test"]
        print(f"\n💪 Stress Test Results:")
        if stress.get("breaking_point"):
            bp = stress["breaking_point"]
            print(f"  Breaking Point: {bp['rps']} req/s")
            print(f"  Reason: {bp['reason']}")
            print(f"  Success Rate: {bp['success_rate']:.1f}%")
            print(f"  P95 Latency: {bp['p95_ms']:.2f} ms")
        else:
            print(f"  No breaking point found up to {stress['max_rps']} req/s")
    
    def check_results(self) -> bool:
        """Check if load tests passed requirements."""
        print("\n" + "=" * 60)
        print("✅ Load Test Validation")
        print("=" * 60)
        
        all_passed = True
        
        # Check sustained load
        sustained = self.results["load_tests"]["sustained_50rps"]
        if sustained["success_rate"] >= 99.5:
            print("✅ Sustained Load: Success rate >= 99.5%")
        else:
            print(f"❌ Sustained Load: Success rate {sustained['success_rate']:.1f}% < 99.5%")
            all_passed = False
        
        if sustained.get("response_metrics", {}).get("p95", 0) < 10:
            print("✅ Sustained Load: P95 latency < 10ms")
        else:
            print(f"❌ Sustained Load: P95 latency {sustained.get('response_metrics', {}).get('p95', 0):.2f}ms >= 10ms")
            all_passed = False
        
        # Check spike handling
        spike = self.results["load_tests"]["spike_test"]
        if spike["phases"]["spike"]["success_rate"] > 95:
            print("✅ Spike Test: Maintained >95% success during spike")
        else:
            print(f"❌ Spike Test: Success rate dropped to {spike['phases']['spike']['success_rate']:.1f}%")
            all_passed = False
        
        # Check stress test
        stress = self.results["load_tests"]["stress_test"]
        if not stress.get("breaking_point") or stress["breaking_point"]["rps"] >= 100:
            print("✅ Stress Test: Handled at least 100 req/s")
        else:
            print(f"❌ Stress Test: Breaking point at {stress['breaking_point']['rps']} req/s")
            all_passed = False
        
        return all_passed

async def main():
    """Main entry point."""
    load_test = LoadTest()
    success = await load_test.run_all_tests()
    
    if success:
        print("\n✅ All load tests PASSED!")
        print("🎯 ADK coordination ready for production load")
        return 0
    else:
        print("\n❌ Some load tests FAILED!")
        print("🔧 Performance optimization needed")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))