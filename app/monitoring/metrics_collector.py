"""Comprehensive metrics collection and performance monitoring system."""

import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

import psutil

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Comprehensive performance metrics container."""

    # Timing metrics
    request_count: int = 0
    total_response_time: float = 0.0
    avg_response_time: float = 0.0
    min_response_time: float = float("inf")
    max_response_time: float = 0.0
    p95_response_time: float = 0.0
    p99_response_time: float = 0.0

    # Throughput metrics
    requests_per_second: float = 0.0
    requests_per_minute: float = 0.0
    concurrent_requests: int = 0

    # Error metrics
    error_count: int = 0
    error_rate: float = 0.0
    timeout_count: int = 0

    # Resource metrics
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    memory_available: float = 0.0
    disk_usage: float = 0.0
    network_in: float = 0.0
    network_out: float = 0.0

    # Cache metrics
    cache_hits: int = 0
    cache_misses: int = 0
    cache_hit_rate: float = 0.0
    cache_size: int = 0

    # Agent-specific metrics
    active_agents: int = 0
    agent_response_times: dict[str, float] = field(default_factory=dict)
    agent_success_rates: dict[str, float] = field(default_factory=dict)

    # Business metrics
    successful_requests: int = 0
    failed_requests: int = 0
    user_sessions: int = 0

    # Time series data
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def calculate_derived_metrics(self) -> None:
        """Calculate derived metrics from base measurements."""
        if self.request_count > 0:
            self.avg_response_time = self.total_response_time / self.request_count
            self.error_rate = self.error_count / self.request_count

        total_cache_requests = self.cache_hits + self.cache_misses
        if total_cache_requests > 0:
            self.cache_hit_rate = self.cache_hits / total_cache_requests


class MetricsCollector:
    """Advanced metrics collection and aggregation system."""

    def __init__(self, collection_interval: float = 1.0, retention_period: int = 3600):
        self.collection_interval = collection_interval
        self.retention_period = retention_period

        # Time series storage
        self.metrics_history: deque = deque(maxlen=retention_period)
        self.response_times: deque = deque(maxlen=10000)

        # Real-time tracking
        self.current_metrics = PerformanceMetrics()
        self.active_requests: dict[str, float] = {}
        self.endpoint_metrics: dict[str, PerformanceMetrics] = defaultdict(
            PerformanceMetrics
        )

        # Callbacks and hooks
        self.metric_callbacks: list[Callable[[PerformanceMetrics], None]] = []
        self.alert_thresholds: dict[str, float] = {
            "response_time_p95": 1000.0,  # ms
            "error_rate": 0.05,  # 5%
            "cpu_usage": 80.0,  # %
            "memory_usage": 85.0,  # %
            "cache_hit_rate": 0.8,  # 80%
        }

        # Background collection
        self._collection_task: asyncio.Task | None = None
        self._running = False

    async def start_collection(self) -> None:
        """Start background metrics collection."""
        if self._running:
            return

        self._running = True
        self._collection_task = asyncio.create_task(self._collection_loop())
        logger.info("Metrics collection started")

    async def stop_collection(self) -> None:
        """Stop background metrics collection."""
        self._running = False
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
        logger.info("Metrics collection stopped")

    async def _collection_loop(self) -> None:
        """Background collection loop."""
        while self._running:
            try:
                await self.collect_system_metrics()
                await asyncio.sleep(self.collection_interval)
            except Exception as e:
                logger.error(f"Error in metrics collection: {e}")
                await asyncio.sleep(self.collection_interval)

    async def collect_system_metrics(self) -> None:
        """Collect system-level performance metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=None)

            # Memory metrics
            memory = psutil.virtual_memory()

            # Disk metrics
            disk = psutil.disk_usage("/")

            # Network metrics
            network = psutil.net_io_counters()

            # Update current metrics
            self.current_metrics.cpu_usage = cpu_percent
            self.current_metrics.memory_usage = memory.percent
            self.current_metrics.memory_available = memory.available
            self.current_metrics.disk_usage = disk.percent
            self.current_metrics.network_in = network.bytes_recv
            self.current_metrics.network_out = network.bytes_sent

            # Calculate derived metrics
            self.current_metrics.calculate_derived_metrics()

            # Store in history
            self.metrics_history.append(
                PerformanceMetrics(**self.current_metrics.__dict__)
            )

            # Check thresholds
            await self._check_alert_thresholds()

            # Notify callbacks
            for callback in self.metric_callbacks:
                try:
                    callback(self.current_metrics)
                except Exception as e:
                    logger.error(f"Error in metrics callback: {e}")

        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")

    def record_request_start(self, request_id: str, endpoint: str = "unknown") -> None:
        """Record the start of a request."""
        self.active_requests[request_id] = time.time()
        self.current_metrics.concurrent_requests = len(self.active_requests)

    def record_request_end(
        self,
        request_id: str,
        endpoint: str = "unknown",
        success: bool = True,
        error: str | None = None,
    ) -> None:
        """Record the end of a request."""
        if request_id not in self.active_requests:
            return

        start_time = self.active_requests.pop(request_id)
        response_time = (time.time() - start_time) * 1000  # Convert to ms

        # Update global metrics
        self.current_metrics.request_count += 1
        self.current_metrics.total_response_time += response_time
        self.current_metrics.min_response_time = min(
            self.current_metrics.min_response_time, response_time
        )
        self.current_metrics.max_response_time = max(
            self.current_metrics.max_response_time, response_time
        )
        self.current_metrics.concurrent_requests = len(self.active_requests)

        if success:
            self.current_metrics.successful_requests += 1
        else:
            self.current_metrics.failed_requests += 1
            self.current_metrics.error_count += 1

        # Update endpoint-specific metrics
        endpoint_metric = self.endpoint_metrics[endpoint]
        endpoint_metric.request_count += 1
        endpoint_metric.total_response_time += response_time

        # Store response time for percentile calculations
        self.response_times.append(response_time)

        # Update percentiles
        self._update_percentiles()

    def record_cache_hit(self, cache_type: str = "default") -> None:
        """Record a cache hit."""
        self.current_metrics.cache_hits += 1

    def record_cache_miss(self, cache_type: str = "default") -> None:
        """Record a cache miss."""
        self.current_metrics.cache_misses += 1

    def record_agent_metrics(
        self, agent_name: str, response_time: float, success: bool = True
    ) -> None:
        """Record agent-specific performance metrics."""
        if agent_name not in self.current_metrics.agent_response_times:
            self.current_metrics.agent_response_times[agent_name] = response_time
            self.current_metrics.agent_success_rates[agent_name] = (
                1.0 if success else 0.0
            )
        else:
            # Rolling average
            current_time = self.current_metrics.agent_response_times[agent_name]
            self.current_metrics.agent_response_times[agent_name] = (
                current_time + response_time
            ) / 2

            current_rate = self.current_metrics.agent_success_rates[agent_name]
            new_rate = 1.0 if success else 0.0
            self.current_metrics.agent_success_rates[agent_name] = (
                current_rate + new_rate
            ) / 2

    def _update_percentiles(self) -> None:
        """Update response time percentiles."""
        if not self.response_times:
            return

        sorted_times = sorted(self.response_times)
        length = len(sorted_times)

        if length > 0:
            p95_index = int(0.95 * length)
            p99_index = int(0.99 * length)

            self.current_metrics.p95_response_time = sorted_times[
                min(p95_index, length - 1)
            ]
            self.current_metrics.p99_response_time = sorted_times[
                min(p99_index, length - 1)
            ]

    async def _check_alert_thresholds(self) -> None:
        """Check if any metrics exceed alert thresholds."""
        from .alerting import Alert, AlertLevel, AlertManager

        # This would normally be injected, but for simplicity we'll create inline
        alert_manager = AlertManager()

        # Check response time
        if (
            self.current_metrics.p95_response_time
            > self.alert_thresholds["response_time_p95"]
        ):
            alert = Alert(
                level=AlertLevel.WARNING,
                message=f"High P95 response time: {self.current_metrics.p95_response_time:.2f}ms",
                metric_name="response_time_p95",
                metric_value=self.current_metrics.p95_response_time,
                threshold=self.alert_thresholds["response_time_p95"],
            )
            await alert_manager.send_alert(alert)

        # Check error rate
        if self.current_metrics.error_rate > self.alert_thresholds["error_rate"]:
            alert = Alert(
                level=AlertLevel.CRITICAL,
                message=f"High error rate: {self.current_metrics.error_rate:.2%}",
                metric_name="error_rate",
                metric_value=self.current_metrics.error_rate,
                threshold=self.alert_thresholds["error_rate"],
            )
            await alert_manager.send_alert(alert)

        # Check CPU usage
        if self.current_metrics.cpu_usage > self.alert_thresholds["cpu_usage"]:
            alert = Alert(
                level=AlertLevel.WARNING,
                message=f"High CPU usage: {self.current_metrics.cpu_usage:.1f}%",
                metric_name="cpu_usage",
                metric_value=self.current_metrics.cpu_usage,
                threshold=self.alert_thresholds["cpu_usage"],
            )
            await alert_manager.send_alert(alert)

    def get_current_metrics(self) -> PerformanceMetrics:
        """Get current metrics snapshot."""
        self.current_metrics.calculate_derived_metrics()
        return PerformanceMetrics(**self.current_metrics.__dict__)

    def get_metrics_history(
        self, duration_seconds: int = 300
    ) -> list[PerformanceMetrics]:
        """Get metrics history for the specified duration."""
        cutoff_time = datetime.now(timezone.utc).timestamp() - duration_seconds

        return [
            metric
            for metric in self.metrics_history
            if metric.timestamp.timestamp() >= cutoff_time
        ]

    def get_endpoint_metrics(self, endpoint: str) -> PerformanceMetrics | None:
        """Get metrics for a specific endpoint."""
        return self.endpoint_metrics.get(endpoint)

    def register_callback(self, callback: Callable[[PerformanceMetrics], None]) -> None:
        """Register a callback to be called on each metrics update."""
        self.metric_callbacks.append(callback)

    def set_alert_threshold(self, metric_name: str, threshold: float) -> None:
        """Set an alert threshold for a specific metric."""
        self.alert_thresholds[metric_name] = threshold

    def reset_metrics(self) -> None:
        """Reset all metrics to initial state."""
        self.current_metrics = PerformanceMetrics()
        self.active_requests.clear()
        self.endpoint_metrics.clear()
        self.response_times.clear()
        logger.info("Metrics reset")

    def export_metrics(self, format: str = "prometheus") -> str:
        """Export metrics in the specified format."""
        if format == "prometheus":
            return self._export_prometheus()
        elif format == "json":
            # Dataclass serialization
            return json.dumps(asdict(self.current_metrics), default=str)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _export_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        metrics = self.current_metrics
        lines = [
            "# HELP vana_requests_total Total number of requests",
            "# TYPE vana_requests_total counter",
            f"vana_requests_total {metrics.request_count}",
            "",
            "# HELP vana_response_time_seconds Response time in seconds",
            "# TYPE vana_response_time_seconds histogram",
            f"vana_response_time_seconds_sum {metrics.total_response_time / 1000}",
            f"vana_response_time_seconds_count {metrics.request_count}",
            "",
            "# HELP vana_cpu_usage_percent CPU usage percentage",
            "# TYPE vana_cpu_usage_percent gauge",
            f"vana_cpu_usage_percent {metrics.cpu_usage}",
            "",
            "# HELP vana_memory_usage_percent Memory usage percentage",
            "# TYPE vana_memory_usage_percent gauge",
            f"vana_memory_usage_percent {metrics.memory_usage}",
            "",
            "# HELP vana_cache_hit_rate Cache hit rate",
            "# TYPE vana_cache_hit_rate gauge",
            f"vana_cache_hit_rate {metrics.cache_hit_rate}",
        ]

        return "\n".join(lines)


# Global metrics collector instance
_metrics_collector: MetricsCollector | None = None


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector


def initialize_metrics_collection() -> MetricsCollector:
    """Initialize and start metrics collection."""
    collector = get_metrics_collector()
    asyncio.create_task(collector.start_collection())  # noqa: RUF006
    return collector
