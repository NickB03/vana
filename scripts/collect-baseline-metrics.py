#!/usr/bin/env python3
"""
Collect baseline performance metrics with legacy coordination mode
This establishes a comparison baseline before ADK rollout
"""

import os
import sys
import json
import time
import statistics
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force legacy mode for baseline collection
os.environ["USE_ADK_COORDINATION"] = "false"
os.environ["USE_OFFICIAL_AGENT_TOOL"] = "false"

def measure_coordination_performance(iterations=50):
    """Measure performance of coordination operations."""
    from lib._tools.real_coordination_tools import real_delegate_to_agent
    
    agents = [
        "architecture_specialist",
        "data_science_specialist", 
        "security_specialist",
        "devops_specialist",
        "qa_specialist"
    ]
    
    timings = []
    errors = 0
    
    print(f"📊 Measuring coordination performance ({iterations} iterations)...")
    
    for i in range(iterations):
        agent = agents[i % len(agents)]
        start_time = time.perf_counter()
        
        try:
            result = real_delegate_to_agent(
                agent_name=agent,
                task=f"Baseline performance test #{i}",
                context="Collecting baseline metrics"
            )
            
            elapsed = (time.perf_counter() - start_time) * 1000  # Convert to ms
            timings.append(elapsed)
            
            # Verify result
            result_data = json.loads(result)
            if result_data.get('status') != 'success':
                errors += 1
                
        except Exception as e:
            errors += 1
            print(f"  ❌ Error in iteration {i}: {e}")
        
        # Progress indicator
        if (i + 1) % 10 == 0:
            print(f"  Progress: {i + 1}/{iterations} completed")
    
    return timings, errors

def calculate_metrics(timings):
    """Calculate performance metrics from timing data."""
    if not timings:
        return {}
    
    sorted_timings = sorted(timings)
    
    return {
        "count": len(timings),
        "mean": statistics.mean(timings),
        "median": statistics.median(timings),
        "min": min(timings),
        "max": max(timings),
        "p50": sorted_timings[int(len(sorted_timings) * 0.50)],
        "p90": sorted_timings[int(len(sorted_timings) * 0.90)],
        "p95": sorted_timings[int(len(sorted_timings) * 0.95)],
        "p99": sorted_timings[int(len(sorted_timings) * 0.99)],
        "std_dev": statistics.stdev(timings) if len(timings) > 1 else 0
    }

def collect_system_info():
    """Collect system information for context."""
    import platform
    
    return {
        "platform": platform.system(),
        "platform_version": platform.version(),
        "python_version": platform.python_version(),
        "processor": platform.processor(),
        "timestamp": datetime.now().isoformat()
    }

def main():
    """Main baseline collection entry point."""
    print("=" * 60)
    print("🎯 ADK Coordination Baseline Metrics Collection")
    print("=" * 60)
    print(f"Mode: LEGACY (USE_ADK_COORDINATION=false)")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Collect performance metrics
    timings, errors = measure_coordination_performance(iterations=50)
    
    if not timings:
        print("\n❌ Failed to collect timing data")
        return 1
    
    # Calculate metrics
    metrics = calculate_metrics(timings)
    
    # Display results
    print("\n📊 Baseline Performance Metrics (Legacy Mode):")
    print(f"  Samples: {metrics['count']}")
    print(f"  Mean: {metrics['mean']:.2f} ms")
    print(f"  Median: {metrics['median']:.2f} ms")
    print(f"  Min: {metrics['min']:.2f} ms")
    print(f"  Max: {metrics['max']:.2f} ms")
    print(f"  P50: {metrics['p50']:.2f} ms")
    print(f"  P90: {metrics['p90']:.2f} ms")
    print(f"  P95: {metrics['p95']:.2f} ms")
    print(f"  P99: {metrics['p99']:.2f} ms")
    print(f"  Std Dev: {metrics['std_dev']:.2f} ms")
    print(f"  Errors: {errors}")
    print(f"  Success Rate: {((50 - errors) / 50 * 100):.1f}%")
    
    # Prepare baseline report
    baseline_report = {
        "type": "baseline_metrics",
        "mode": "legacy",
        "system_info": collect_system_info(),
        "performance_metrics": metrics,
        "error_count": errors,
        "success_rate": (50 - errors) / 50 * 100,
        "raw_timings": timings,
        "feature_flags": {
            "USE_ADK_COORDINATION": "false",
            "USE_OFFICIAL_AGENT_TOOL": "false"
        }
    }
    
    # Save baseline report
    report_path = ".development/reports/baseline-metrics-legacy.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, 'w') as f:
        json.dump(baseline_report, f, indent=2)
    
    print(f"\n📄 Baseline report saved to: {report_path}")
    
    # Check against future targets
    print("\n🎯 Comparison with ADK Targets:")
    if metrics['p95'] < 10:
        print(f"  ✅ P95 ({metrics['p95']:.2f} ms) already meets <10ms target")
    else:
        print(f"  ⚠️  P95 ({metrics['p95']:.2f} ms) above 10ms target")
    
    if errors == 0:
        print(f"  ✅ Zero errors - meets reliability target")
    else:
        print(f"  ⚠️  {errors} errors detected - needs investigation")
    
    print("\n✅ Baseline metrics collection complete!")
    print("📋 Next: Run the same test with USE_ADK_COORDINATION=true for comparison")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())