"""
Benchmark Runner for VANA Performance Testing

Comprehensive benchmarking framework for establishing performance baselines,
detecting regressions, and monitoring system performance over time.

Features:
- Automated benchmark execution
- Performance baseline establishment
- Regression detection and alerting
- Historical performance tracking
- Statistical analysis and reporting
"""

import time
import json
import statistics
from pathlib import Path
from typing import Dict, List, Any, Callable, Optional, Union
from dataclasses import dataclass, field
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BenchmarkMetric:
    """Individual benchmark metric with statistical data."""
    name: str
    value: float
    unit: str
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metric to dictionary."""
        return {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp,
            "metadata": self.metadata
        }

@dataclass
class BenchmarkResult:
    """Complete benchmark result with multiple metrics."""
    benchmark_name: str
    metrics: List[BenchmarkMetric]
    duration: float
    timestamp: float
    success: bool
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def get_metric(self, name: str) -> Optional[BenchmarkMetric]:
        """Get specific metric by name."""
        for metric in self.metrics:
            if metric.name == name:
                return metric
        return None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Calculate statistics for all metrics."""
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
                    "std_dev": statistics.stdev(values) if len(values) > 1 else 0
                }
        
        return stats
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "benchmark_name": self.benchmark_name,
            "metrics": [metric.to_dict() for metric in self.metrics],
            "duration": self.duration,
            "timestamp": self.timestamp,
            "success": self.success,
            "error": self.error,
            "metadata": self.metadata,
            "statistics": self.get_statistics()
        }

class BenchmarkSuite:
    """Collection of related benchmarks."""
    
    def __init__(self, name: str):
        self.name = name
        self.benchmarks: Dict[str, Callable] = {}
        self.setup_function: Optional[Callable] = None
        self.teardown_function: Optional[Callable] = None
    
    def add_benchmark(self, name: str, func: Callable):
        """Add a benchmark function to the suite."""
        self.benchmarks[name] = func
        logger.info(f"Added benchmark '{name}' to suite '{self.name}'")
    
    def set_setup(self, func: Callable):
        """Set setup function for the suite."""
        self.setup_function = func
    
    def set_teardown(self, func: Callable):
        """Set teardown function for the suite."""
        self.teardown_function = func
    
    def run_benchmark(self, benchmark_name: str, iterations: int = 10) -> BenchmarkResult:
        """Run a specific benchmark in the suite."""
        if benchmark_name not in self.benchmarks:
            raise ValueError(f"Benchmark '{benchmark_name}' not found in suite '{self.name}'")
        
        benchmark_func = self.benchmarks[benchmark_name]
        
        # Setup
        if self.setup_function:
            try:
                self.setup_function()
            except Exception as e:
                logger.error(f"Setup failed for benchmark '{benchmark_name}': {e}")
                return BenchmarkResult(
                    benchmark_name=benchmark_name,
                    metrics=[],
                    duration=0,
                    timestamp=time.time(),
                    success=False,
                    error=f"Setup failed: {str(e)}"
                )
        
        start_time = time.time()
        metrics = []
        success = True
        error = None
        
        try:
            # Run benchmark iterations
            for i in range(iterations):
                iteration_start = time.time()
                
                try:
                    result = benchmark_func()
                    iteration_end = time.time()
                    iteration_time = iteration_end - iteration_start
                    
                    # Create metric for this iteration
                    metric = BenchmarkMetric(
                        name=f"{benchmark_name}_execution_time",
                        value=iteration_time,
                        unit="seconds",
                        timestamp=iteration_start,
                        metadata={
                            "iteration": i + 1,
                            "result": str(result)[:100] if result else None
                        }
                    )
                    metrics.append(metric)
                    
                except Exception as e:
                    logger.warning(f"Iteration {i+1} failed for benchmark '{benchmark_name}': {e}")
                    # Continue with other iterations
        
        except Exception as e:
            success = False
            error = str(e)
            logger.error(f"Benchmark '{benchmark_name}' failed: {e}")
        
        finally:
            # Teardown
            if self.teardown_function:
                try:
                    self.teardown_function()
                except Exception as e:
                    logger.warning(f"Teardown failed for benchmark '{benchmark_name}': {e}")
        
        end_time = time.time()
        total_duration = end_time - start_time
        
        return BenchmarkResult(
            benchmark_name=benchmark_name,
            metrics=metrics,
            duration=total_duration,
            timestamp=start_time,
            success=success,
            error=error,
            metadata={
                "suite_name": self.name,
                "iterations": iterations,
                "successful_iterations": len(metrics)
            }
        )
    
    def run_all_benchmarks(self, iterations: int = 10) -> Dict[str, BenchmarkResult]:
        """Run all benchmarks in the suite."""
        results = {}
        
        logger.info(f"Running all benchmarks in suite '{self.name}' with {iterations} iterations")
        
        for benchmark_name in self.benchmarks:
            logger.info(f"Running benchmark: {benchmark_name}")
            result = self.run_benchmark(benchmark_name, iterations)
            results[benchmark_name] = result
            
            if result.success:
                logger.info(f"Benchmark '{benchmark_name}' completed successfully")
            else:
                logger.error(f"Benchmark '{benchmark_name}' failed: {result.error}")
        
        return results

class BenchmarkRunner:
    """Main benchmark runner for managing and executing benchmark suites."""
    
    def __init__(self, results_dir: Optional[Path] = None):
        self.suites: Dict[str, BenchmarkSuite] = {}
        self.results_dir = results_dir or Path("benchmark_results")
        self.results_dir.mkdir(exist_ok=True)
        self.results_history: List[Dict[str, Any]] = []
    
    def add_suite(self, suite: BenchmarkSuite):
        """Add a benchmark suite to the runner."""
        self.suites[suite.name] = suite
        logger.info(f"Added benchmark suite: {suite.name}")
    
    def create_suite(self, name: str) -> BenchmarkSuite:
        """Create and add a new benchmark suite."""
        suite = BenchmarkSuite(name)
        self.add_suite(suite)
        return suite
    
    def run_suite(self, suite_name: str, iterations: int = 10) -> Dict[str, BenchmarkResult]:
        """Run a specific benchmark suite."""
        if suite_name not in self.suites:
            raise ValueError(f"Benchmark suite '{suite_name}' not found")
        
        suite = self.suites[suite_name]
        results = suite.run_all_benchmarks(iterations)
        
        # Save results
        self._save_suite_results(suite_name, results)
        
        return results
    
    def run_all_suites(self, iterations: int = 10) -> Dict[str, Dict[str, BenchmarkResult]]:
        """Run all benchmark suites."""
        all_results = {}
        
        logger.info(f"Running all benchmark suites with {iterations} iterations")
        
        for suite_name in self.suites:
            logger.info(f"Running suite: {suite_name}")
            suite_results = self.run_suite(suite_name, iterations)
            all_results[suite_name] = suite_results
        
        # Save comprehensive results
        self._save_comprehensive_results(all_results)
        
        return all_results
    
    def _save_suite_results(self, suite_name: str, results: Dict[str, BenchmarkResult]):
        """Save results for a specific suite."""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{suite_name}_results_{timestamp}.json"
        filepath = self.results_dir / filename
        
        results_data = {
            "suite_name": suite_name,
            "timestamp": time.time(),
            "results": {name: result.to_dict() for name, result in results.items()}
        }
        
        with open(filepath, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        logger.info(f"Suite results saved to {filepath}")
    
    def _save_comprehensive_results(self, all_results: Dict[str, Dict[str, BenchmarkResult]]):
        """Save comprehensive results for all suites."""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"comprehensive_benchmark_results_{timestamp}.json"
        filepath = self.results_dir / filename
        
        comprehensive_data = {
            "timestamp": time.time(),
            "total_suites": len(all_results),
            "suites": {}
        }
        
        for suite_name, suite_results in all_results.items():
            comprehensive_data["suites"][suite_name] = {
                "total_benchmarks": len(suite_results),
                "successful_benchmarks": sum(1 for r in suite_results.values() if r.success),
                "results": {name: result.to_dict() for name, result in suite_results.items()}
            }
        
        with open(filepath, 'w') as f:
            json.dump(comprehensive_data, f, indent=2)
        
        # Add to history
        self.results_history.append(comprehensive_data)
        
        logger.info(f"Comprehensive results saved to {filepath}")
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary across all recent runs."""
        if not self.results_history:
            return {"error": "No benchmark results available"}
        
        latest_results = self.results_history[-1]
        
        summary = {
            "timestamp": latest_results["timestamp"],
            "total_suites": latest_results["total_suites"],
            "suite_summaries": {}
        }
        
        for suite_name, suite_data in latest_results["suites"].items():
            suite_summary = {
                "total_benchmarks": suite_data["total_benchmarks"],
                "successful_benchmarks": suite_data["successful_benchmarks"],
                "success_rate": suite_data["successful_benchmarks"] / suite_data["total_benchmarks"] if suite_data["total_benchmarks"] > 0 else 0,
                "benchmark_summaries": {}
            }
            
            for benchmark_name, benchmark_data in suite_data["results"].items():
                if benchmark_data["success"] and benchmark_data["statistics"]:
                    # Get execution time statistics
                    exec_time_key = f"{benchmark_name}_execution_time"
                    if exec_time_key in benchmark_data["statistics"]:
                        stats = benchmark_data["statistics"][exec_time_key]
                        suite_summary["benchmark_summaries"][benchmark_name] = {
                            "mean_time": stats["mean"],
                            "min_time": stats["min"],
                            "max_time": stats["max"],
                            "std_dev": stats["std_dev"],
                            "iterations": stats["count"]
                        }
            
            summary["suite_summaries"][suite_name] = suite_summary
        
        return summary
    
    def load_historical_results(self):
        """Load historical benchmark results from files."""
        if not self.results_dir.exists():
            return
        
        # Load comprehensive results files
        for filepath in self.results_dir.glob("comprehensive_benchmark_results_*.json"):
            try:
                with open(filepath) as f:
                    data = json.load(f)
                    self.results_history.append(data)
            except Exception as e:
                logger.warning(f"Failed to load historical results from {filepath}: {e}")
        
        # Sort by timestamp
        self.results_history.sort(key=lambda x: x.get("timestamp", 0))
        
        logger.info(f"Loaded {len(self.results_history)} historical benchmark results")
