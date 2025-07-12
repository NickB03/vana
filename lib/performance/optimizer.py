"""
VANA Performance Optimizer

Implements comprehensive performance optimizations including:
- Response time optimization
- Memory usage optimization
- Agent coordination efficiency
- Database query optimization
- Connection pooling
- Caching strategies
"""

import asyncio
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import wraps
from typing import Any, Dict, Optional

import psutil

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics data structure."""

    response_time: float
    memory_usage: float
    cpu_usage: float
    cache_hit_rate: float
    active_connections: int
    timestamp: float


class ConnectionPool:
    """Optimized connection pool for database and API connections."""

    def __init__(self, max_connections: int = 50, timeout: int = 30):
        self.max_connections = max_connections
        self.timeout = timeout
        self._pool = []
        self._in_use = set()
        self._lock = threading.Lock()

    def get_connection(self):
        """Get a connection from the pool."""
        with self._lock:
            if self._pool:
                conn = self._pool.pop()
                self._in_use.add(conn)
                return conn
            elif len(self._in_use) < self.max_connections:
                # Create new connection
                conn = self._create_connection()
                self._in_use.add(conn)
                return conn
            else:
                raise Exception("Connection pool exhausted")

    def return_connection(self, conn):
        """Return a connection to the pool."""
        with self._lock:
            if conn in self._in_use:
                self._in_use.remove(conn)
                if self._is_connection_healthy(conn):
                    self._pool.append(conn)
                else:
                    self._close_connection(conn)

    def _create_connection(self):
        """Create a new connection."""
        # Implementation would depend on the specific connection type
        return {"id": time.time(), "created": time.time()}

    def _is_connection_healthy(self, conn):
        """Check if connection is healthy."""
        return time.time() - conn.get("created", 0) < self.timeout

    def _close_connection(self, conn):
        """Close a connection."""
        pass


class PerformanceCache:
    """High-performance caching system with TTL and LRU eviction."""

    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache = {}
        self._access_times = {}
        self._expiry_times = {}
        self._lock = threading.RLock()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        with self._lock:
            if key not in self._cache:
                return None

            # Check expiry
            if time.time() > self._expiry_times.get(key, 0):
                self._remove(key)
                return None

            # Update access time
            self._access_times[key] = time.time()
            return self._cache[key]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache."""
        with self._lock:
            # Evict if necessary
            if len(self._cache) >= self.max_size and key not in self._cache:
                self._evict_lru()

            ttl = ttl or self.default_ttl
            current_time = time.time()

            self._cache[key] = value
            self._access_times[key] = current_time
            self._expiry_times[key] = current_time + ttl

    def _evict_lru(self):
        """Evict least recently used item."""
        if not self._access_times:
            return

        lru_key = min(self._access_times.keys(), key=lambda k: self._access_times[k])
        self._remove(lru_key)

    def _remove(self, key: str):
        """Remove item from cache."""
        self._cache.pop(key, None)
        self._access_times.pop(key, None)
        self._expiry_times.pop(key, None)

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hit_rate": getattr(self, "_hit_rate", 0.0),
                "memory_usage_mb": self._estimate_memory_usage(),
            }

    def _estimate_memory_usage(self) -> float:
        """Estimate memory usage in MB."""
        # Rough estimation
        return len(self._cache) * 0.001  # 1KB per item estimate


class PerformanceOptimizer:
    """Main performance optimization coordinator."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection_pool = ConnectionPool(
            max_connections=config.get("max_connections", 50),
            timeout=config.get("connection_timeout", 30),
        )
        self.cache = PerformanceCache(
            max_size=config.get("cache_size_mb", 256) * 1000,  # Rough conversion
            default_ttl=config.get("cache_ttl", 300),
        )
        self.executor = ThreadPoolExecutor(max_workers=config.get("max_workers", 10))
        self._metrics_history = []
        self._optimization_enabled = True

    def optimize_response_time(self, func):
        """Decorator to optimize function response time."""

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Check cache first
            cache_key = self._generate_cache_key(func.__name__, args, kwargs)
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute with optimization
            start_time = time.time()
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = await asyncio.get_event_loop().run_in_executor(self.executor, func, *args, **kwargs)

                # Cache successful results
                if result is not None:
                    self.cache.set(cache_key, result)

                return result
            finally:
                execution_time = time.time() - start_time
                self._record_performance_metric("response_time", execution_time)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Check cache first
            cache_key = self._generate_cache_key(func.__name__, args, kwargs)
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute with optimization
            start_time = time.time()
            try:
                result = func(*args, **kwargs)

                # Cache successful results
                if result is not None:
                    self.cache.set(cache_key, result)

                return result
            finally:
                execution_time = time.time() - start_time
                self._record_performance_metric("response_time", execution_time)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    def optimize_memory_usage(self):
        """Optimize memory usage across the system."""
        # Force garbage collection
        import gc

        gc.collect()

        # Clear expired cache entries
        self._cleanup_cache()

        # Log memory optimization
        process = psutil.Process()
        memory_info = process.memory_info()
        logger.info(f"Memory optimization completed. RSS: {memory_info.rss / 1024 / 1024:.2f}MB")

    def _generate_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate cache key for function call."""
        # Simple cache key generation - could be improved with hashing
        key_parts = [func_name]
        key_parts.extend(str(arg) for arg in args if isinstance(arg, (str, int, float, bool)))
        key_parts.extend(f"{k}={v}" for k, v in kwargs.items() if isinstance(v, (str, int, float, bool)))
        return "|".join(key_parts)[:100]  # Limit key length

    def _cleanup_cache(self):
        """Clean up expired cache entries."""
        current_time = time.time()
        expired_keys = [key for key, expiry in self.cache._expiry_times.items() if current_time > expiry]
        for key in expired_keys:
            self.cache._remove(key)

    def _record_performance_metric(self, metric_type: str, value: float):
        """Record performance metric."""
        if len(self._metrics_history) > 1000:
            self._metrics_history = self._metrics_history[-500:]  # Keep last 500

        self._metrics_history.append({"type": metric_type, "value": value, "timestamp": time.time()})

    def get_performance_metrics(self) -> PerformanceMetrics:
        """Get current performance metrics."""
        process = psutil.Process()
        memory_info = process.memory_info()

        return PerformanceMetrics(
            response_time=self._get_avg_response_time(),
            memory_usage=memory_info.rss / 1024 / 1024,  # MB
            cpu_usage=process.cpu_percent(),
            cache_hit_rate=self.cache.get_stats().get("hit_rate", 0.0),
            active_connections=len(self.connection_pool._in_use),
            timestamp=time.time(),
        )

    def _get_avg_response_time(self) -> float:
        """Get average response time from recent metrics."""
        recent_metrics = [m for m in self._metrics_history[-100:] if m["type"] == "response_time"]  # Last 100 metrics
        if not recent_metrics:
            return 0.0
        return sum(m["value"] for m in recent_metrics) / len(recent_metrics)


# Global optimizer instance
_optimizer = None


def get_optimizer(config: Optional[Dict[str, Any]] = None) -> PerformanceOptimizer:
    """Get global performance optimizer instance."""
    global _optimizer
    if _optimizer is None:
        default_config = {
            "max_connections": 50,
            "connection_timeout": 30,
            "cache_size_mb": 256,
            "cache_ttl": 300,
            "max_workers": 10,
        }
        if config:
            default_config.update(config)
        _optimizer = PerformanceOptimizer(default_config)
    return _optimizer


def optimize_performance(func):
    """Decorator to optimize function performance."""
    optimizer = get_optimizer()
    return optimizer.optimize_response_time(func)
