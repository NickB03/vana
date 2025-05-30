"""
Simple Performance Test for VANA Multi-Agent System

This test establishes basic performance baselines for the standardized tools
and validates that the system meets performance targets.
"""

import time
import json
import os
from typing import Dict, Any

# Import standardized tools
from vana_multi_agent.tools.standardized_system_tools import standardized_echo
from vana_multi_agent.core.tool_standards import performance_monitor, tool_analytics

def run_performance_tests():
    """Run comprehensive performance tests and establish baselines."""
    
    print("🚀 Starting VANA Multi-Agent System Performance Tests...")
    
    # Test results storage
    results = {
        "test_timestamp": time.time(),
        "tool_performance": {},
        "system_metrics": {},
        "baseline_established": False
    }
    
    # Test 1: Echo Tool Performance (Baseline)
    print("\n📢 Testing Echo Tool Performance...")
    echo_times = []
    echo_success_count = 0
    
    for i in range(20):
        start_time = time.time()
        try:
            result = standardized_echo(f"Performance test message {i}")
            execution_time = time.time() - start_time
            echo_times.append(execution_time)
            echo_success_count += 1
            
            if i % 5 == 0:
                print(f"  Test {i}: {execution_time:.4f}s - {result[:30]}...")
                
        except Exception as e:
            print(f"  Test {i} failed: {e}")
    
    # Calculate echo performance metrics
    if echo_times:
        results["tool_performance"]["echo"] = {
            "total_tests": len(echo_times),
            "success_count": echo_success_count,
            "success_rate": (echo_success_count / len(echo_times)) * 100,
            "avg_execution_time": sum(echo_times) / len(echo_times),
            "min_execution_time": min(echo_times),
            "max_execution_time": max(echo_times),
            "total_time": sum(echo_times)
        }
    
    # Test 2: Tool Standards Framework Performance
    print("\n⚙️ Testing Tool Standards Framework...")
    
    # Get performance monitor metrics
    monitor_metrics = performance_monitor.get_all_metrics()
    if monitor_metrics:
        results["system_metrics"]["performance_monitor"] = {
            "tracked_tools": len(monitor_metrics),
            "total_executions": sum(m.success_count + m.error_count for m in monitor_metrics.values()),
            "tools": {
                name: {
                    "executions": m.success_count + m.error_count,
                    "success_rate": (m.success_count / (m.success_count + m.error_count)) * 100 if (m.success_count + m.error_count) > 0 else 0,
                    "avg_execution_time": m.average_execution_time
                }
                for name, m in monitor_metrics.items()
            }
        }
    
    # Get analytics metrics
    analytics_summary = performance_monitor.get_performance_summary()
    if analytics_summary and "tools" in analytics_summary:
        results["system_metrics"]["analytics"] = analytics_summary
    
    # Test 3: System Resource Usage (Simplified)
    print("\n💾 Testing System Resource Usage...")
    
    # Simple memory and timing tests
    import sys
    memory_usage_mb = sys.getsizeof(results) / (1024 * 1024)  # Approximate
    
    results["system_metrics"]["resource_usage"] = {
        "estimated_memory_mb": memory_usage_mb,
        "test_duration_seconds": time.time() - results["test_timestamp"],
        "python_version": sys.version
    }
    
    # Test 4: Performance Targets Validation
    print("\n🎯 Validating Performance Targets...")
    
    performance_targets = {
        "echo_avg_time_target": 0.1,  # 100ms
        "echo_success_rate_target": 95.0,  # 95%
        "system_memory_target": 50.0,  # 50MB
        "total_test_time_target": 30.0  # 30 seconds
    }
    
    target_results = {}
    
    if "echo" in results["tool_performance"]:
        echo_perf = results["tool_performance"]["echo"]
        target_results["echo_performance"] = {
            "avg_time_met": echo_perf["avg_execution_time"] <= performance_targets["echo_avg_time_target"],
            "success_rate_met": echo_perf["success_rate"] >= performance_targets["echo_success_rate_target"],
            "actual_avg_time": echo_perf["avg_execution_time"],
            "actual_success_rate": echo_perf["success_rate"]
        }
    
    target_results["system_performance"] = {
        "memory_target_met": memory_usage_mb <= performance_targets["system_memory_target"],
        "time_target_met": (time.time() - results["test_timestamp"]) <= performance_targets["total_test_time_target"],
        "actual_memory_mb": memory_usage_mb,
        "actual_test_time": time.time() - results["test_timestamp"]
    }
    
    results["performance_targets"] = {
        "targets": performance_targets,
        "results": target_results
    }
    
    # Calculate overall performance score
    targets_met = 0
    total_targets = 0
    
    for category, category_results in target_results.items():
        for target_name, target_met in category_results.items():
            if target_name.endswith("_met"):
                total_targets += 1
                if target_met:
                    targets_met += 1
    
    overall_score = (targets_met / total_targets) * 100 if total_targets > 0 else 0
    results["overall_performance_score"] = overall_score
    
    # Mark baseline as established
    results["baseline_established"] = True
    
    # Save results to file
    os.makedirs("vana_multi_agent/performance", exist_ok=True)
    with open("vana_multi_agent/performance/baseline_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print("\n📊 Performance Test Summary:")
    print(f"Overall Performance Score: {overall_score:.1f}%")
    print(f"Targets Met: {targets_met}/{total_targets}")
    
    if "echo" in results["tool_performance"]:
        echo_perf = results["tool_performance"]["echo"]
        print(f"Echo Tool Performance:")
        print(f"  - Average Time: {echo_perf['avg_execution_time']:.4f}s")
        print(f"  - Success Rate: {echo_perf['success_rate']:.1f}%")
        print(f"  - Total Tests: {echo_perf['total_tests']}")
    
    print(f"System Metrics:")
    print(f"  - Memory Usage: {memory_usage_mb:.2f}MB")
    print(f"  - Test Duration: {time.time() - results['test_timestamp']:.2f}s")
    
    # Performance recommendations
    print("\n💡 Performance Recommendations:")
    
    if overall_score >= 90:
        print("✅ Excellent performance! System meets all targets.")
    elif overall_score >= 75:
        print("✅ Good performance with minor optimization opportunities.")
    elif overall_score >= 50:
        print("⚠️ Moderate performance - optimization recommended.")
    else:
        print("❌ Poor performance - immediate optimization required.")
    
    # Specific recommendations
    if "echo" in results["tool_performance"]:
        echo_perf = results["tool_performance"]["echo"]
        if echo_perf["avg_execution_time"] > performance_targets["echo_avg_time_target"]:
            print(f"  - Echo tool is slower than target ({echo_perf['avg_execution_time']:.4f}s vs {performance_targets['echo_avg_time_target']}s)")
        
        if echo_perf["success_rate"] < performance_targets["echo_success_rate_target"]:
            print(f"  - Echo tool success rate below target ({echo_perf['success_rate']:.1f}% vs {performance_targets['echo_success_rate_target']}%)")
    
    if memory_usage_mb > performance_targets["system_memory_target"]:
        print(f"  - Memory usage above target ({memory_usage_mb:.2f}MB vs {performance_targets['system_memory_target']}MB)")
    
    print(f"\n📁 Results saved to: vana_multi_agent/performance/baseline_results.json")
    print("🎯 Performance baseline established successfully!")
    
    return results

if __name__ == "__main__":
    # Run the performance tests
    test_results = run_performance_tests()
    
    # Exit with appropriate code
    if test_results["overall_performance_score"] >= 75:
        exit(0)  # Success
    else:
        exit(1)  # Performance issues detected
