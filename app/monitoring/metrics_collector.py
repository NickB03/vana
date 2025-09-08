"""Comprehensive metrics collection and performance monitoring system."""

import asyncio
import logging
import time
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone

# Optional import for system metrics with graceful fallback
try:
    import psutil

    PSUTIL_AVAILABLE = True
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"psutil not available: {e}. System metrics will be limited.")
    psutil = None
    PSUTIL_AVAILABLE = False

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
            "memory_usage": 0.85,  # 85%
            "cpu_usage": 0.80,  # 80%
        }

        # Background task management
        self._collection_task: asyncio.Task | None = None
        self._is_collecting = False

    async def start_collection(self) -> None:
        """Start background metrics collection."""
        if self._is_collecting:
            return

        self._is_collecting = True
        self._collection_task = asyncio.create_task(self._collection_loop())
        logger.info("Metrics collection started")

    async def stop_collection(self) -> None:
        """Stop background metrics collection."""
        self._is_collecting = False
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
        logger.info("Metrics collection stopped")

    async def _collection_loop(self) -> None:
        """Main metrics collection loop."""
        while self._is_collecting:
            try:
                await self._collect_system_metrics()
                await self._calculate_percentiles()
                await self._check_alerts()
                await self._cleanup_old_metrics()

                # Store snapshot
                self.metrics_history.append(self.current_metrics)

                # Trigger callbacks
                for callback in self.metric_callbacks:
                    try:
                        callback(self.current_metrics)
                    except Exception as e:
                        logger.error(f"Metrics callback error: {e}")

                await asyncio.sleep(self.collection_interval)

            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(self.collection_interval)

    async def _collect_system_metrics(self) -> None:
        """Collect system-level metrics."""
        if not PSUTIL_AVAILABLE:
            logger.debug("psutil not available, skipping system metrics collection")
            return

        try:
            # CPU and memory metrics (normalize CPU from 0-100 to 0-1)
            self.current_metrics.cpu_usage = psutil.cpu_percent(interval=0.1) / 100.0
            memory = psutil.virtual_memory()
            self.current_metrics.memory_usage = memory.percent / 100.0
            self.current_metrics.memory_available = memory.available / (1024**3)  # GB

            # Disk usage
            disk = psutil.disk_usage("/")
            self.current_metrics.disk_usage = disk.percent / 100.0

            # Network I/O
            network = psutil.net_io_counters()
            if hasattr(self, "_last_network_stats"):
                time_delta = time.time() - self._last_network_time
                if time_delta > 0:
                    bytes_recv_delta = (
                        network.bytes_recv - self._last_network_stats.bytes_recv
                    )
                    bytes_sent_delta = (
                        network.bytes_sent - self._last_network_stats.bytes_sent
                    )
                    self.current_metrics.network_in = (
                        bytes_recv_delta / time_delta / 1024
                    )  # KB/s
                    self.current_metrics.network_out = (
                        bytes_sent_delta / time_delta / 1024
                    )  # KB/s

            self._last_network_stats = network
            self._last_network_time = time.time()

        except Exception as e:
            logger.error(f"System metrics collection error: {e}")
            # Continue without system metrics rather than failing

    async def _calculate_percentiles(self) -> None:
        """Calculate response time percentiles."""
        if len(self.response_times) < 2:
            return

        sorted_times = sorted(self.response_times)
        total = len(sorted_times)

        # P95 and P99 percentiles (fix off-by-one errors)
        p95_index = min(int(0.95 * total), total - 1)
        p99_index = min(int(0.99 * total), total - 1)

        self.current_metrics.p95_response_time = sorted_times[p95_index]
        self.current_metrics.p99_response_time = sorted_times[p99_index]

    async def _check_alerts(self) -> None:
        """Check metrics against alert thresholds."""
        metrics = self.current_metrics

        # Check response time
        if metrics.p95_response_time > self.alert_thresholds["response_time_p95"]:
            logger.warning(f"High P95 response time: {metrics.p95_response_time:.2f}ms")

        # Check error rate
        if metrics.error_rate > self.alert_thresholds["error_rate"]:
            logger.warning(f"High error rate: {metrics.error_rate:.2%}")

        # Check system metrics (only if psutil available)
        if PSUTIL_AVAILABLE:
            if metrics.memory_usage > self.alert_thresholds["memory_usage"]:
                logger.warning(f"High memory usage: {metrics.memory_usage:.2%}")

            if metrics.cpu_usage > self.alert_thresholds["cpu_usage"]:
                logger.warning(f"High CPU usage: {metrics.cpu_usage:.2%}")

    async def _cleanup_old_metrics(self) -> None:
        """Clean up old metrics data."""
        current_time = time.time()

        # Clean up old response times (keep last hour)
        cutoff_time = current_time - 3600
        while self.response_times and self.response_times[0] < cutoff_time:
            self.response_times.popleft()

    def record_request_start(self, request_id: str) -> None:
        """Record the start of a request."""
        self.active_requests[request_id] = time.time()
        self.current_metrics.concurrent_requests = len(self.active_requests)

    def record_request_end(
        self, request_id: str, success: bool = True, endpoint: str | None = None
    ) -> None:
        """Record the completion of a request."""
        if request_id not in self.active_requests:
            return

        # Calculate response time
        start_time = self.active_requests.pop(request_id)
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        # Update metrics
        self.current_metrics.request_count += 1
        self.current_metrics.total_response_time += response_time
        self.current_metrics.concurrent_requests = len(self.active_requests)

        # Track response time
        self.response_times.append(response_time)

        # Update min/max
        self.current_metrics.min_response_time = min(
            self.current_metrics.min_response_time, response_time
        )
        self.current_metrics.max_response_time = max(
            self.current_metrics.max_response_time, response_time
        )

        # Track success/error
        if success:
            self.current_metrics.successful_requests += 1
        else:
            self.current_metrics.failed_requests += 1
            self.current_metrics.error_count += 1

        # Endpoint-specific metrics
        if endpoint:
            endpoint_metrics = self.endpoint_metrics[endpoint]
            endpoint_metrics.request_count += 1
            endpoint_metrics.total_response_time += response_time
            if success:
                endpoint_metrics.successful_requests += 1
            else:
                endpoint_metrics.failed_requests += 1

        # Recalculate derived metrics
        self.current_metrics.calculate_derived_metrics()

    def record_cache_hit(self) -> None:
        """Record a cache hit."""
        self.current_metrics.cache_hits += 1

    def record_cache_miss(self) -> None:
        """Record a cache miss."""
        self.current_metrics.cache_misses += 1

    def add_alert_threshold(self, metric: str, threshold: float) -> None:
        """Add a custom alert threshold."""
        self.alert_thresholds[metric] = threshold

    def add_callback(self, callback: Callable[[PerformanceMetrics], None]) -> None:
        """Add a callback for metrics updates."""
        self.metric_callbacks.append(callback)

    def get_current_metrics(self) -> PerformanceMetrics:
        """Get current metrics snapshot."""
        return self.current_metrics

    def get_metrics_history(self, limit: int | None = None) -> list[PerformanceMetrics]:
        """Get historical metrics."""
        if limit is None:
            return list(self.metrics_history)
        return list(self.metrics_history)[-limit:]

    def get_endpoint_metrics(self, endpoint: str) -> PerformanceMetrics | None:
        """Get metrics for a specific endpoint."""
        return self.endpoint_metrics.get(endpoint)

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start_collection()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop_collection()


# Global metrics collector instance
_global_collector: MetricsCollector | None = None


def get_metrics_collector() -> MetricsCollector:
    """Get or create the global metrics collector."""
    global _global_collector
    if _global_collector is None:
        _global_collector = MetricsCollector()
    return _global_collector


async def start_metrics_collection() -> None:
    """Start global metrics collection."""
    collector = get_metrics_collector()
    await collector.start_collection()


async def stop_metrics_collection() -> None:
    """Stop global metrics collection."""
    global _global_collector
    if _global_collector:
        await _global_collector.stop_collection()
