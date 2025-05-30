"""
Performance Profiler for VANA Multi-Agent System

This module provides comprehensive performance profiling and baseline
measurement capabilities for all system components including tools,
routing, and agent coordination.
"""

import time
import threading
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from collections import defaultdict
import json
import os

# Try to import psutil, fall back to mock if not available
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

    # Mock psutil functionality
    class MockProcess:
        def memory_info(self):
            return type('MemoryInfo', (), {'rss': 50 * 1024 * 1024})()  # 50MB
        def cpu_percent(self):
            return 10.0

    class MockVirtualMemory:
        def __init__(self):
            self.used = 1024 * 1024 * 1024  # 1GB

    class MockPsutil:
        @staticmethod
        def Process():
            return MockProcess()

        @staticmethod
        def virtual_memory():
            return MockVirtualMemory()

        @staticmethod
        def cpu_percent(interval=1):
            time.sleep(0.1)  # Small delay to simulate measurement
            return 15.0

    psutil = MockPsutil()

@dataclass
class PerformanceMetrics:
    """Comprehensive performance metrics for system components."""
    component_name: str
    execution_time: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    success_count: int = 0
    error_count: int = 0
    total_executions: int = 0
    average_execution_time: float = 0.0
    min_execution_time: float = float('inf')
    max_execution_time: float = 0.0
    last_execution_timestamp: float = 0.0

    def update_metrics(self, execution_time: float, memory_usage: float,
                      cpu_usage: float, success: bool):
        """Update metrics with new execution data."""
        self.execution_time = execution_time
        self.memory_usage_mb = memory_usage
        self.cpu_usage_percent = cpu_usage
        self.last_execution_timestamp = time.time()

        if success:
            self.success_count += 1
        else:
            self.error_count += 1

        self.total_executions += 1

        # Update timing statistics
        if execution_time < self.min_execution_time:
            self.min_execution_time = execution_time
        if execution_time > self.max_execution_time:
            self.max_execution_time = execution_time

        # Update average execution time
        self.average_execution_time = (
            (self.average_execution_time * (self.total_executions - 1) + execution_time)
            / self.total_executions
        )

    def get_success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total_executions == 0:
            return 0.0
        return (self.success_count / self.total_executions) * 100

@dataclass
class SystemResourceSnapshot:
    """Snapshot of system resource usage."""
    timestamp: float
    memory_usage_mb: float
    cpu_usage_percent: float
    active_threads: int
    disk_io_read_mb: float = 0.0
    disk_io_write_mb: float = 0.0

class PerformanceProfiler:
    """Comprehensive performance profiler for the VANA system."""

    def __init__(self):
        self.metrics: Dict[str, PerformanceMetrics] = {}
        self.baseline_metrics: Dict[str, PerformanceMetrics] = {}
        self.resource_snapshots: List[SystemResourceSnapshot] = []
        self.profiling_active = False
        self.baseline_established = False

        # Performance targets
        self.performance_targets = {
            "tool_execution_time": 1.0,  # seconds
            "routing_time": 0.5,  # seconds
            "memory_usage_mb": 100.0,  # MB
            "cpu_usage_percent": 50.0,  # percent
            "success_rate": 95.0  # percent
        }

    def start_profiling(self):
        """Start system-wide performance profiling."""
        self.profiling_active = True
        self._start_resource_monitoring()

    def stop_profiling(self):
        """Stop performance profiling."""
        self.profiling_active = False

    def _start_resource_monitoring(self):
        """Start background resource monitoring."""
        def monitor_resources():
            while self.profiling_active:
                try:
                    # Get system resource usage
                    memory_info = psutil.virtual_memory()
                    cpu_percent = psutil.cpu_percent(interval=1)

                    snapshot = SystemResourceSnapshot(
                        timestamp=time.time(),
                        memory_usage_mb=memory_info.used / (1024 * 1024),
                        cpu_usage_percent=cpu_percent,
                        active_threads=threading.active_count()
                    )

                    self.resource_snapshots.append(snapshot)

                    # Keep only last 1000 snapshots
                    if len(self.resource_snapshots) > 1000:
                        self.resource_snapshots = self.resource_snapshots[-1000:]

                except Exception as e:
                    print(f"Resource monitoring error: {e}")

                time.sleep(1)  # Monitor every second

        monitor_thread = threading.Thread(target=monitor_resources, daemon=True)
        monitor_thread.start()

    def profile_execution(self, component_name: str, func: Callable, *args, **kwargs):
        """Profile the execution of a function."""
        # Get initial resource usage
        process = psutil.Process()
        initial_memory = process.memory_info().rss / (1024 * 1024)  # MB

        start_time = time.time()
        success = True
        result = None

        try:
            result = func(*args, **kwargs)
        except Exception as e:
            success = False
            raise e
        finally:
            # Calculate execution metrics
            execution_time = time.time() - start_time
            final_memory = process.memory_info().rss / (1024 * 1024)  # MB
            memory_usage = final_memory - initial_memory
            cpu_usage = process.cpu_percent()

            # Update metrics
            if component_name not in self.metrics:
                self.metrics[component_name] = PerformanceMetrics(component_name)

            self.metrics[component_name].update_metrics(
                execution_time, memory_usage, cpu_usage, success
            )

        return result

    def establish_baseline(self):
        """Establish performance baseline from current metrics."""
        self.baseline_metrics = {
            name: PerformanceMetrics(
                component_name=metrics.component_name,
                execution_time=metrics.execution_time,
                memory_usage_mb=metrics.memory_usage_mb,
                cpu_usage_percent=metrics.cpu_usage_percent,
                success_count=metrics.success_count,
                error_count=metrics.error_count,
                total_executions=metrics.total_executions,
                average_execution_time=metrics.average_execution_time,
                min_execution_time=metrics.min_execution_time,
                max_execution_time=metrics.max_execution_time
            )
            for name, metrics in self.metrics.items()
        }
        self.baseline_established = True

    def get_performance_comparison(self) -> Dict[str, Any]:
        """Compare current performance against baseline."""
        if not self.baseline_established:
            return {"error": "No baseline established"}

        comparisons = {}

        for component_name, current_metrics in self.metrics.items():
            if component_name in self.baseline_metrics:
                baseline = self.baseline_metrics[component_name]

                # Calculate percentage improvements/degradations
                time_improvement = (
                    (baseline.average_execution_time - current_metrics.average_execution_time)
                    / baseline.average_execution_time * 100
                ) if baseline.average_execution_time > 0 else 0

                memory_improvement = (
                    (baseline.memory_usage_mb - current_metrics.memory_usage_mb)
                    / baseline.memory_usage_mb * 100
                ) if baseline.memory_usage_mb > 0 else 0

                comparisons[component_name] = {
                    "execution_time_improvement_percent": time_improvement,
                    "memory_improvement_percent": memory_improvement,
                    "success_rate_current": current_metrics.get_success_rate(),
                    "success_rate_baseline": baseline.get_success_rate(),
                    "executions_since_baseline": current_metrics.total_executions - baseline.total_executions
                }

        return comparisons

    def get_bottlenecks(self, top_n: int = 5) -> List[Dict[str, Any]]:
        """Identify top performance bottlenecks."""
        bottlenecks = []

        for component_name, metrics in self.metrics.items():
            bottleneck_score = 0
            issues = []

            # Check against performance targets
            if metrics.average_execution_time > self.performance_targets["tool_execution_time"]:
                bottleneck_score += 3
                issues.append("Slow execution time")

            if metrics.memory_usage_mb > self.performance_targets["memory_usage_mb"]:
                bottleneck_score += 2
                issues.append("High memory usage")

            if metrics.cpu_usage_percent > self.performance_targets["cpu_usage_percent"]:
                bottleneck_score += 2
                issues.append("High CPU usage")

            if metrics.get_success_rate() < self.performance_targets["success_rate"]:
                bottleneck_score += 4
                issues.append("Low success rate")

            if bottleneck_score > 0:
                bottlenecks.append({
                    "component": component_name,
                    "bottleneck_score": bottleneck_score,
                    "issues": issues,
                    "avg_execution_time": metrics.average_execution_time,
                    "success_rate": metrics.get_success_rate(),
                    "total_executions": metrics.total_executions
                })

        # Sort by bottleneck score (highest first)
        bottlenecks.sort(key=lambda x: x["bottleneck_score"], reverse=True)
        return bottlenecks[:top_n]

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        if not self.metrics:
            return {"error": "No performance data available"}

        total_executions = sum(m.total_executions for m in self.metrics.values())
        total_errors = sum(m.error_count for m in self.metrics.values())
        avg_execution_time = sum(m.average_execution_time for m in self.metrics.values()) / len(self.metrics)

        return {
            "total_components": len(self.metrics),
            "total_executions": total_executions,
            "overall_success_rate": ((total_executions - total_errors) / total_executions * 100) if total_executions > 0 else 0,
            "average_execution_time": avg_execution_time,
            "bottlenecks": self.get_bottlenecks(3),
            "performance_targets_met": self._check_performance_targets(),
            "baseline_comparison": self.get_performance_comparison() if self.baseline_established else None
        }

    def _check_performance_targets(self) -> Dict[str, bool]:
        """Check if performance targets are being met."""
        targets_met = {}

        for component_name, metrics in self.metrics.items():
            targets_met[component_name] = {
                "execution_time": metrics.average_execution_time <= self.performance_targets["tool_execution_time"],
                "memory_usage": metrics.memory_usage_mb <= self.performance_targets["memory_usage_mb"],
                "cpu_usage": metrics.cpu_usage_percent <= self.performance_targets["cpu_usage_percent"],
                "success_rate": metrics.get_success_rate() >= self.performance_targets["success_rate"]
            }

        return targets_met

    def export_metrics(self, filepath: str):
        """Export performance metrics to JSON file."""
        export_data = {
            "metrics": {name: {
                "component_name": m.component_name,
                "execution_time": m.execution_time,
                "memory_usage_mb": m.memory_usage_mb,
                "cpu_usage_percent": m.cpu_usage_percent,
                "success_count": m.success_count,
                "error_count": m.error_count,
                "total_executions": m.total_executions,
                "average_execution_time": m.average_execution_time,
                "min_execution_time": m.min_execution_time,
                "max_execution_time": m.max_execution_time,
                "success_rate": m.get_success_rate()
            } for name, m in self.metrics.items()},
            "baseline_established": self.baseline_established,
            "performance_targets": self.performance_targets,
            "export_timestamp": time.time()
        }

        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2)

# Global profiler instance
performance_profiler = PerformanceProfiler()
