import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Dict, List, Optional

import psutil


@dataclass
class PerformanceMetric:
    """Performance metric data structure."""

    timestamp: float
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str] = None
    metadata: Dict[str, any] = None


class PerformanceMonitor:
    """Real-time performance monitoring and metrics collection."""

    def __init__(self, retention_minutes: int = 60):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.retention_seconds = retention_minutes * 60
        self.alerts: List[Dict] = []
        self.thresholds: Dict[str, Dict] = {}

    def record_metric(
        self, name: str, value: float, unit: str = "", tags: Dict[str, str] = None, metadata: Dict = None
    ):
        """Record a performance metric."""
        metric = PerformanceMetric(
            timestamp=time.time(), metric_name=name, value=value, unit=unit, tags=tags or {}, metadata=metadata or {}
        )

        self.metrics[name].append(metric)
        self._check_thresholds(metric)

    def record_response_time(self, operation: str, duration: float, success: bool = True, **kwargs):
        """Record response time for an operation."""
        self.record_metric(f"response_time.{operation}", duration, "seconds", tags={"success": str(success), **kwargs})

    def record_memory_usage(self, component: str = "system"):
        """Record current memory usage."""
        process = psutil.Process()
        memory_info = process.memory_info()

        self.record_metric(f"memory.{component}.rss", memory_info.rss / 1024 / 1024, "MB")

        self.record_metric(f"memory.{component}.vms", memory_info.vms / 1024 / 1024, "MB")

    def record_cpu_usage(self, component: str = "system"):
        """Record current CPU usage."""
        cpu_percent = psutil.cpu_percent(interval=1)
        self.record_metric(f"cpu.{component}.usage", cpu_percent, "percent")

    def set_threshold(self, metric_name: str, warning: float, critical: float, comparison: str = "greater"):
        """Set alert thresholds for a metric."""
        self.thresholds[metric_name] = {"warning": warning, "critical": critical, "comparison": comparison}

    def _check_thresholds(self, metric: PerformanceMetric):
        """Check if metric exceeds thresholds and generate alerts."""
        threshold = self.thresholds.get(metric.metric_name)

        # If no exact match, check for pattern matches
        if not threshold:
            for threshold_pattern, threshold_config in self.thresholds.items():
                if "*" in threshold_pattern:
                    # Simple pattern matching for wildcards
                    pattern_prefix = threshold_pattern.replace("*", "")
                    if metric.metric_name.startswith(pattern_prefix):
                        threshold = threshold_config
                        break

        if not threshold:
            return

        comparison = threshold["comparison"]
        value = metric.value

        alert_level = None
        if comparison == "greater":
            if value >= threshold["critical"]:
                alert_level = "critical"
            elif value >= threshold["warning"]:
                alert_level = "warning"
        elif comparison == "less":
            if value <= threshold["critical"]:
                alert_level = "critical"
            elif value <= threshold["warning"]:
                alert_level = "warning"

        if alert_level:
            self.alerts.append(
                {
                    "timestamp": metric.timestamp,
                    "level": alert_level,
                    "metric": metric.metric_name,
                    "value": value,
                    "threshold": threshold[alert_level],
                    "message": f"{metric.metric_name} {comparison} {threshold[alert_level]} ({value})",
                }
            )

    def get_metrics(self, metric_name: str, since: Optional[float] = None) -> List[PerformanceMetric]:
        """Get metrics for a specific metric name."""
        metrics = list(self.metrics.get(metric_name, []))

        if since:
            metrics = [m for m in metrics if m.timestamp >= since]

        return metrics

    def get_summary(self, metric_name: str, since: Optional[float] = None) -> Dict:
        """Get statistical summary of a metric."""
        metrics = self.get_metrics(metric_name, since)

        if not metrics:
            return {"count": 0}

        values = [m.value for m in metrics]
        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "latest": values[-1] if values else None,
        }
