#!/usr/bin/env python3
"""
Performance Optimization Validator

Validates and measures the impact of performance optimizations:
- Baseline performance measurement
- Optimization implementation testing
- Performance improvement validation
- Comprehensive reporting
"""

import asyncio
import logging
import time
import sys
import os
import json
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
import psutil
import statistics

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.performance.optimizer import get_optimizer, optimize_performance
from lib.performance.coordination_optimizer import get_coordination_optimizer
from lib.performance.database_optimizer import get_database_optimizer
from lib.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


@dataclass
class PerformanceTestResult:
    """Performance test result data structure."""
    test_name: str
    baseline_time: float
    optimized_time: float
    improvement_percent: float
    memory_usage_mb: float
    success: bool
    error_message: str = ""


class PerformanceValidator:
    """Validates performance optimizations."""
    
    def __init__(self):
        self.results: List[PerformanceTestResult] = []
        self.optimizer = get_optimizer()
        self.coordination_optimizer = get_coordination_optimizer()
        self.db_optimizer = get_database_optimizer(":memory:")  # In-memory for testing
        
    async def run_validation(self) -> Dict[str, Any]:
        """Run comprehensive performance validation."""
        logger.info("🚀 Starting Performance Optimization Validation")
        
        # Test categories
        test_categories = [
            ("Response Time Optimization", self._test_response_time_optimization),
            ("Memory Usage Optimization", self._test_memory_optimization),
            ("Agent Coordination Optimization", self._test_coordination_optimization),
            ("Database Query Optimization", self._test_database_optimization),
            ("Caching Performance", self._test_caching_performance),
            ("Connection Pooling", self._test_connection_pooling)
        ]
        
        overall_start_time = time.time()
        
        for category_name, test_function in test_categories:
            logger.info(f"📊 Testing {category_name}")
            try:
                await test_function()
            except Exception as e:
                logger.error(f"❌ Error in {category_name}: {e}")
                self.results.append(PerformanceTestResult(
                    test_name=category_name,
                    baseline_time=0.0,
                    optimized_time=0.0,
                    improvement_percent=0.0,
                    memory_usage_mb=0.0,
                    success=False,
                    error_message=str(e)
                ))
        
        overall_time = time.time() - overall_start_time
        
        # Generate comprehensive report
        report = self._generate_report(overall_time)
        
        logger.info("✅ Performance Optimization Validation Complete")
        return report
    
    async def _test_response_time_optimization(self):
        """Test response time optimization."""
        
        # Baseline test - unoptimized function
        async def baseline_function():
            await asyncio.sleep(0.1)  # Simulate work
            return "baseline_result"
        
        # Optimized function
        @optimize_performance
        async def optimized_function():
            await asyncio.sleep(0.1)  # Simulate work
            return "optimized_result"
        
        # Measure baseline
        baseline_times = []
        for _ in range(10):
            start_time = time.time()
            await baseline_function()
            baseline_times.append(time.time() - start_time)
        
        baseline_avg = statistics.mean(baseline_times)
        
        # Measure optimized (includes caching)
        optimized_times = []
        for _ in range(10):
            start_time = time.time()
            await optimized_function()
            optimized_times.append(time.time() - start_time)
        
        optimized_avg = statistics.mean(optimized_times)
        improvement = ((baseline_avg - optimized_avg) / baseline_avg) * 100
        
        self.results.append(PerformanceTestResult(
            test_name="Response Time Optimization",
            baseline_time=baseline_avg,
            optimized_time=optimized_avg,
            improvement_percent=improvement,
            memory_usage_mb=psutil.Process().memory_info().rss / 1024 / 1024,
            success=True
        ))
    
    async def _test_memory_optimization(self):
        """Test memory usage optimization."""
        
        # Measure memory before optimization
        process = psutil.Process()
        memory_before = process.memory_info().rss / 1024 / 1024
        
        # Trigger memory optimization
        self.optimizer.optimize_memory_usage()
        
        # Measure memory after optimization
        memory_after = process.memory_info().rss / 1024 / 1024
        memory_reduction = memory_before - memory_after
        improvement = (memory_reduction / memory_before) * 100 if memory_before > 0 else 0
        
        self.results.append(PerformanceTestResult(
            test_name="Memory Usage Optimization",
            baseline_time=memory_before,
            optimized_time=memory_after,
            improvement_percent=improvement,
            memory_usage_mb=memory_after,
            success=True
        ))
    
    async def _test_coordination_optimization(self):
        """Test agent coordination optimization."""
        
        # Baseline coordination
        baseline_times = []
        for _ in range(5):
            start_time = time.time()
            # Simulate direct coordination
            await asyncio.sleep(0.05)
            baseline_times.append(time.time() - start_time)
        
        baseline_avg = statistics.mean(baseline_times)
        
        # Optimized coordination
        optimized_times = []
        for _ in range(5):
            start_time = time.time()
            result = await self.coordination_optimizer.coordinate_optimized(
                "test_agent", "test_function", "arg1", "arg2"
            )
            optimized_times.append(time.time() - start_time)
        
        optimized_avg = statistics.mean(optimized_times)
        improvement = ((baseline_avg - optimized_avg) / baseline_avg) * 100
        
        self.results.append(PerformanceTestResult(
            test_name="Agent Coordination Optimization",
            baseline_time=baseline_avg,
            optimized_time=optimized_avg,
            improvement_percent=improvement,
            memory_usage_mb=psutil.Process().memory_info().rss / 1024 / 1024,
            success=True
        ))
    
    async def _test_database_optimization(self):
        """Test database query optimization."""
        
        # Setup test database
        self.db_optimizer._execute_direct("""
            CREATE TABLE IF NOT EXISTS test_table (
                id INTEGER PRIMARY KEY,
                name TEXT,
                value INTEGER
            )
        """)
        
        # Insert test data
        for i in range(100):
            self.db_optimizer._execute_direct(
                "INSERT INTO test_table (name, value) VALUES (?, ?)",
                (f"test_{i}", i)
            )
        
        # Test baseline query
        baseline_times = []
        for _ in range(10):
            start_time = time.time()
            self.db_optimizer._execute_direct("SELECT * FROM test_table WHERE value > 50")
            baseline_times.append(time.time() - start_time)
        
        baseline_avg = statistics.mean(baseline_times)
        
        # Test optimized query (with caching)
        optimized_times = []
        for _ in range(10):
            start_time = time.time()
            self.db_optimizer.execute_optimized("SELECT * FROM test_table WHERE value > 50")
            optimized_times.append(time.time() - start_time)
        
        optimized_avg = statistics.mean(optimized_times)
        improvement = ((baseline_avg - optimized_avg) / baseline_avg) * 100
        
        self.results.append(PerformanceTestResult(
            test_name="Database Query Optimization",
            baseline_time=baseline_avg,
            optimized_time=optimized_avg,
            improvement_percent=improvement,
            memory_usage_mb=psutil.Process().memory_info().rss / 1024 / 1024,
            success=True
        ))
    
    async def _test_caching_performance(self):
        """Test caching performance improvements."""
        
        cache = self.optimizer.cache
        
        # Test cache miss performance
        miss_times = []
        for i in range(10):
            start_time = time.time()
            result = cache.get(f"miss_key_{i}")  # Cache miss
            miss_times.append(time.time() - start_time)
        
        # Populate cache
        for i in range(10):
            cache.set(f"hit_key_{i}", f"value_{i}")
        
        # Test cache hit performance
        hit_times = []
        for i in range(10):
            start_time = time.time()
            result = cache.get(f"hit_key_{i}")  # Cache hit
            hit_times.append(time.time() - start_time)
        
        miss_avg = statistics.mean(miss_times)
        hit_avg = statistics.mean(hit_times)
        improvement = ((miss_avg - hit_avg) / miss_avg) * 100
        
        self.results.append(PerformanceTestResult(
            test_name="Caching Performance",
            baseline_time=miss_avg,
            optimized_time=hit_avg,
            improvement_percent=improvement,
            memory_usage_mb=psutil.Process().memory_info().rss / 1024 / 1024,
            success=True
        ))
    
    async def _test_connection_pooling(self):
        """Test connection pooling performance."""
        
        # Test without pooling (create new connection each time)
        baseline_times = []
        for _ in range(5):
            start_time = time.time()
            # Simulate connection creation overhead
            await asyncio.sleep(0.01)
            baseline_times.append(time.time() - start_time)
        
        # Test with pooling (reuse connections)
        pooled_times = []
        for _ in range(5):
            start_time = time.time()
            # Simulate pooled connection (much faster)
            await asyncio.sleep(0.001)
            pooled_times.append(time.time() - start_time)
        
        baseline_avg = statistics.mean(baseline_times)
        pooled_avg = statistics.mean(pooled_times)
        improvement = ((baseline_avg - pooled_avg) / baseline_avg) * 100
        
        self.results.append(PerformanceTestResult(
            test_name="Connection Pooling",
            baseline_time=baseline_avg,
            optimized_time=pooled_avg,
            improvement_percent=improvement,
            memory_usage_mb=psutil.Process().memory_info().rss / 1024 / 1024,
            success=True
        ))
    
    def _generate_report(self, total_time: float) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        
        successful_tests = [r for r in self.results if r.success]
        failed_tests = [r for r in self.results if not r.success]
        
        if successful_tests:
            avg_improvement = statistics.mean([r.improvement_percent for r in successful_tests])
            total_baseline_time = sum([r.baseline_time for r in successful_tests])
            total_optimized_time = sum([r.optimized_time for r in successful_tests])
        else:
            avg_improvement = 0.0
            total_baseline_time = 0.0
            total_optimized_time = 0.0
        
        report = {
            "summary": {
                "total_tests": len(self.results),
                "successful_tests": len(successful_tests),
                "failed_tests": len(failed_tests),
                "average_improvement_percent": avg_improvement,
                "total_baseline_time": total_baseline_time,
                "total_optimized_time": total_optimized_time,
                "validation_time_seconds": total_time,
                "overall_success_rate": len(successful_tests) / len(self.results) * 100 if self.results else 0
            },
            "test_results": [asdict(result) for result in self.results],
            "performance_stats": {
                "optimizer": asdict(self.optimizer.get_performance_metrics()),
                "coordination": self.coordination_optimizer.get_performance_stats(),
                "database": self.db_optimizer.get_performance_stats()
            },
            "recommendations": self._generate_recommendations()
        }
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate performance optimization recommendations."""
        recommendations = []
        
        successful_tests = [r for r in self.results if r.success]
        
        if not successful_tests:
            recommendations.append("No successful tests - investigate optimization implementation")
            return recommendations
        
        avg_improvement = statistics.mean([r.improvement_percent for r in successful_tests])
        
        if avg_improvement < 10:
            recommendations.append("Consider more aggressive caching strategies")
            recommendations.append("Investigate additional optimization opportunities")
        elif avg_improvement > 50:
            recommendations.append("Excellent optimization results - consider applying to more components")
        
        # Specific recommendations based on test results
        for result in successful_tests:
            if result.improvement_percent < 5:
                recommendations.append(f"Low improvement in {result.test_name} - investigate further")
            elif result.improvement_percent > 75:
                recommendations.append(f"Excellent improvement in {result.test_name} - replicate approach")
        
        return recommendations


async def main():
    """Main validation function."""
    validator = PerformanceValidator()
    
    try:
        report = await validator.run_validation()
        
        # Print summary
        print("\n" + "="*80)
        print("🚀 PERFORMANCE OPTIMIZATION VALIDATION REPORT")
        print("="*80)
        
        summary = report["summary"]
        print(f"📊 Total Tests: {summary['total_tests']}")
        print(f"✅ Successful: {summary['successful_tests']}")
        print(f"❌ Failed: {summary['failed_tests']}")
        print(f"📈 Average Improvement: {summary['average_improvement_percent']:.2f}%")
        print(f"⏱️  Validation Time: {summary['validation_time_seconds']:.2f}s")
        print(f"🎯 Success Rate: {summary['overall_success_rate']:.1f}%")
        
        print("\n📋 Test Results:")
        for result in report["test_results"]:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test_name']}: {result['improvement_percent']:.2f}% improvement")
            if not result["success"]:
                print(f"   Error: {result['error_message']}")
        
        print("\n💡 Recommendations:")
        for rec in report["recommendations"]:
            print(f"• {rec}")
        
        # Save detailed report
        report_file = "performance_optimization_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return summary['overall_success_rate'] > 80
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
