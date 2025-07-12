"""
Performance Monitor for AI Agent Testing

This module provides comprehensive performance monitoring and metrics
collection for AI agent testing scenarios.
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import psutil


class MetricType(Enum):
    """Types of performance metrics"""

    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    MEMORY_USAGE = "memory_usage"
    CPU_USAGE = "cpu_usage"
    CONCURRENT_REQUESTS = "concurrent_requests"
    TOOL_USAGE_TIME = "tool_usage_time"
    AGENT_COORDINATION_TIME = "agent_coordination_time"


@dataclass
class PerformanceMetric:
    """Represents a single performance metric measurement"""

    metric_type: MetricType
    value: float
    timestamp: float
    context: Dict[str, Any] = field(default_factory=dict)
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class PerformanceThreshold:
    """Defines performance thresholds for monitoring"""

    metric_type: MetricType
    warning_threshold: float
    critical_threshold: float
    comparison: str = "greater_than"  # greater_than, less_than, equal_to


@dataclass
class PerformanceReport:
    """Comprehensive performance report"""

    test_name: str
    start_time: float
    end_time: float
    duration: float
    metrics: Dict[MetricType, List[PerformanceMetric]]
    summary_stats: Dict[MetricType, Dict[str, float]]
    threshold_violations: List[Dict[str, Any]]
    recommendations: List[str]


class PerformanceMonitor:
    """
    Comprehensive performance monitor for AI agent testing.

    Provides:
    - Real-time performance metrics collection
    - Threshold monitoring and alerting
    - Performance trend analysis
    - Resource usage tracking
    - Test performance reporting
    """

    def __init__(self, buffer_size: int = 1000):
        self.logger = logging.getLogger("performance_monitor")
        self.buffer_size = buffer_size

        # Metrics storage
        self.metrics: Dict[MetricType, deque] = defaultdict(lambda: deque(maxlen=buffer_size))
        self.thresholds: Dict[MetricType, PerformanceThreshold] = {}
        self.active_tests: Dict[str, Dict[str, Any]] = {}

        # Monitoring state
        self.is_monitoring = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.start_time: Optional[float] = None

        # Performance counters
        self.request_count = 0
        self.error_count = 0
        self.concurrent_requests = 0

        # System monitoring
        self.process = psutil.Process()

        # Set default thresholds
        self._set_default_thresholds()

    def _set_default_thresholds(self):
        """Set default performance thresholds"""
        default_thresholds = [
            PerformanceThreshold(MetricType.RESPONSE_TIME, 2.0, 5.0, "greater_than"),
            PerformanceThreshold(MetricType.ERROR_RATE, 0.05, 0.10, "greater_than"),
            PerformanceThreshold(MetricType.MEMORY_USAGE, 500.0, 1000.0, "greater_than"),  # MB
            PerformanceThreshold(MetricType.CPU_USAGE, 70.0, 90.0, "greater_than"),  # Percentage
            PerformanceThreshold(MetricType.THROUGHPUT, 10.0, 5.0, "less_than"),  # requests/sec
        ]

        for threshold in default_thresholds:
            self.thresholds[threshold.metric_type] = threshold

    def set_threshold(self, threshold: PerformanceThreshold):
        """Set a performance threshold"""
        self.thresholds[threshold.metric_type] = threshold
        self.logger.info(
            f"Set threshold for {threshold.metric_type.value}: "
            f"warning={threshold.warning_threshold}, "
            f"critical={threshold.critical_threshold}"
        )

    def record_metric(
        self,
        metric_type: MetricType,
        value: float,
        context: Optional[Dict[str, Any]] = None,
        tags: Optional[Dict[str, str]] = None,
    ):
        """Record a performance metric"""
        metric = PerformanceMetric(
            metric_type=metric_type,
            value=value,
            timestamp=time.time(),
            context=context or {},
            tags=tags or {},
        )

        self.metrics[metric_type].append(metric)

        # Check thresholds
        self._check_threshold(metric)

        self.logger.debug(f"Recorded metric: {metric_type.value}={value}")

    def _check_threshold(self, metric: PerformanceMetric):
        """Check if metric violates thresholds"""
        threshold = self.thresholds.get(metric.metric_type)
        if not threshold:
            return

        violation_level = None

        if threshold.comparison == "greater_than":
            if metric.value > threshold.critical_threshold:
                violation_level = "critical"
            elif metric.value > threshold.warning_threshold:
                violation_level = "warning"
        elif threshold.comparison == "less_than":
            if metric.value < threshold.critical_threshold:
                violation_level = "critical"
            elif metric.value < threshold.warning_threshold:
                violation_level = "warning"

        if violation_level:
            self.logger.warning(
                f"Threshold violation ({violation_level}): " f"{metric.metric_type.value}={metric.value}"
            )

    async def start_monitoring(self, interval: float = 1.0):
        """Start continuous performance monitoring"""
        if self.is_monitoring:
            return

        self.is_monitoring = True
        self.start_time = time.time()
        self.monitoring_task = asyncio.create_task(self._monitoring_loop(interval))
        self.logger.info("Started performance monitoring")

    async def stop_monitoring(self):
        """Stop performance monitoring"""
        if not self.is_monitoring:
            return

        self.is_monitoring = False

        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass

        self.logger.info("Stopped performance monitoring")

    async def _monitoring_loop(self, interval: float):
        """Continuous monitoring loop"""
        while self.is_monitoring:
            try:
                # Collect system metrics
                await self._collect_system_metrics()

                # Calculate derived metrics
                self._calculate_derived_metrics()

                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")

    async def _collect_system_metrics(self):
        """Collect system performance metrics"""
        try:
            # Memory usage
            memory_info = self.process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            self.record_metric(MetricType.MEMORY_USAGE, memory_mb)

            # CPU usage
            cpu_percent = self.process.cpu_percent()
            self.record_metric(MetricType.CPU_USAGE, cpu_percent)

        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")

    def _calculate_derived_metrics(self):
        """Calculate derived performance metrics"""
        current_time = time.time()

        # Calculate throughput (requests per second)
        if self.start_time:
            duration = current_time - self.start_time
            if duration > 0:
                throughput = self.request_count / duration
                self.record_metric(MetricType.THROUGHPUT, throughput)

        # Calculate error rate
        if self.request_count > 0:
            error_rate = self.error_count / self.request_count
            self.record_metric(MetricType.ERROR_RATE, error_rate)

        # Record concurrent requests
        self.record_metric(MetricType.CONCURRENT_REQUESTS, self.concurrent_requests)

    def start_request(self, request_id: str, context: Optional[Dict[str, Any]] = None):
        """Mark the start of a request for timing"""
        self.request_count += 1
        self.concurrent_requests += 1

        self.active_tests[request_id] = {
            "start_time": time.time(),
            "context": context or {},
        }

    def end_request(
        self,
        request_id: str,
        success: bool = True,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Mark the end of a request and record timing"""
        if request_id not in self.active_tests:
            self.logger.warning(f"Request not found: {request_id}")
            return

        test_data = self.active_tests.pop(request_id)
        end_time = time.time()
        response_time = end_time - test_data["start_time"]

        # Record response time
        self.record_metric(
            MetricType.RESPONSE_TIME,
            response_time,
            context={**test_data["context"], **(context or {})},
        )

        # Update counters
        self.concurrent_requests = max(0, self.concurrent_requests - 1)
        if not success:
            self.error_count += 1

    def record_tool_usage(self, tool_name: str, duration: float):
        """Record tool usage timing"""
        self.record_metric(
            MetricType.TOOL_USAGE_TIME,
            duration,
            context={"tool_name": tool_name},
            tags={"tool": tool_name},
        )

    def record_agent_coordination(self, from_agent: str, to_agent: str, duration: float):
        """Record agent coordination timing"""
        self.record_metric(
            MetricType.AGENT_COORDINATION_TIME,
            duration,
            context={"from_agent": from_agent, "to_agent": to_agent},
            tags={"coordination": f"{from_agent}->{to_agent}"},
        )

    def get_metric_summary(self, metric_type: MetricType) -> Dict[str, float]:
        """Get summary statistics for a metric type"""
        metrics = list(self.metrics[metric_type])
        if not metrics:
            return {}

        values = [m.value for m in metrics]

        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "mean": sum(values) / len(values),
            "median": sorted(values)[len(values) // 2],
            "p95": sorted(values)[int(len(values) * 0.95)] if len(values) > 1 else values[0],
            "p99": sorted(values)[int(len(values) * 0.99)] if len(values) > 1 else values[0],
        }

    def get_recent_metrics(self, metric_type: MetricType, count: int = 10) -> List[PerformanceMetric]:
        """Get recent metrics of a specific type"""
        metrics = list(self.metrics[metric_type])
        return metrics[-count:] if metrics else []

    def generate_performance_report(self, test_name: str) -> PerformanceReport:
        """Generate comprehensive performance report"""
        end_time = time.time()
        start_time = self.start_time or end_time
        duration = end_time - start_time

        # Collect all metrics
        all_metrics = {}
        summary_stats = {}
        for metric_type in MetricType:
            metrics_list = list(self.metrics[metric_type])
            all_metrics[metric_type] = metrics_list
            summary_stats[metric_type] = self.get_metric_summary(metric_type)

        # Check for threshold violations
        threshold_violations = []
        for metric_type, threshold in self.thresholds.items():
            recent_metrics = self.get_recent_metrics(metric_type, 5)
            for metric in recent_metrics:
                if self._is_threshold_violated(metric, threshold):
                    threshold_violations.append(
                        {
                            "metric_type": metric_type.value,
                            "value": metric.value,
                            "threshold": threshold.warning_threshold,
                            "timestamp": metric.timestamp,
                        }
                    )

        # Generate recommendations
        recommendations = self._generate_recommendations(summary_stats, threshold_violations)

        return PerformanceReport(
            test_name=test_name,
            start_time=start_time,
            end_time=end_time,
            duration=duration,
            metrics=all_metrics,
            summary_stats=summary_stats,
            threshold_violations=threshold_violations,
            recommendations=recommendations,
        )

    def _is_threshold_violated(self, metric: PerformanceMetric, threshold: PerformanceThreshold) -> bool:
        """Check if a metric violates threshold"""
        if threshold.comparison == "greater_than":
            return metric.value > threshold.warning_threshold
        elif threshold.comparison == "less_than":
            return metric.value < threshold.warning_threshold
        return False

    def _generate_recommendations(
        self,
        summary_stats: Dict[MetricType, Dict[str, float]],
        violations: List[Dict[str, Any]],
    ) -> List[str]:
        """Generate performance improvement recommendations"""
        recommendations = []

        # Response time recommendations
        response_stats = summary_stats.get(MetricType.RESPONSE_TIME, {})
        if response_stats.get("mean", 0) > 2.0:
            recommendations.append("Consider optimizing response times - average exceeds 2 seconds")

        # Memory usage recommendations
        memory_stats = summary_stats.get(MetricType.MEMORY_USAGE, {})
        if memory_stats.get("max", 0) > 500:
            recommendations.append("High memory usage detected - consider memory optimization")

        # Error rate recommendations
        error_stats = summary_stats.get(MetricType.ERROR_RATE, {})
        if error_stats.get("mean", 0) > 0.05:
            recommendations.append("Error rate exceeds 5% - investigate error causes")

        # Throughput recommendations
        throughput_stats = summary_stats.get(MetricType.THROUGHPUT, {})
        if throughput_stats.get("mean", 0) < 10:
            recommendations.append("Low throughput detected - consider performance tuning")

        return recommendations

    def reset_metrics(self):
        """Reset all collected metrics"""
        self.metrics.clear()
        self.request_count = 0
        self.error_count = 0
        self.concurrent_requests = 0
        self.start_time = None
        self.active_tests.clear()
        self.logger.info("Reset all performance metrics")

    def get_monitor_stats(self) -> Dict[str, Any]:
        """Get statistics about the performance monitor"""
        return {
            "is_monitoring": self.is_monitoring,
            "total_requests": self.request_count,
            "error_count": self.error_count,
            "concurrent_requests": self.concurrent_requests,
            "active_tests": len(self.active_tests),
            "metric_types": len(self.metrics),
            "total_metrics": sum(len(metrics) for metrics in self.metrics.values()),
            "thresholds_configured": len(self.thresholds),
        }
