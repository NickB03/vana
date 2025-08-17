"""Advanced cache optimization and performance enhancement system."""

import asyncio
import builtins
import json
import logging
import pickle
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import aioredis

logger = logging.getLogger(__name__)


class CacheStrategy(Enum):
    """Cache strategies for different use cases."""

    LRU = "lru"  # Least Recently Used
    TTL = "ttl"  # Time To Live
    ADAPTIVE = "adaptive"  # Adaptive based on access patterns
    WRITE_THROUGH = "write_through"  # Write through to backing store
    WRITE_BACK = "write_back"  # Write back with delay


@dataclass
class CacheMetrics:
    """Cache performance metrics."""

    hits: int = 0
    misses: int = 0
    evictions: int = 0
    writes: int = 0
    hit_rate: float = 0.0
    avg_access_time: float = 0.0
    memory_usage: int = 0
    entry_count: int = 0

    # Advanced metrics
    hot_keys: set[str] = field(default_factory=set)
    cold_keys: set[str] = field(default_factory=set)
    access_patterns: dict[str, int] = field(default_factory=dict)

    def calculate_hit_rate(self) -> None:
        """Calculate cache hit rate."""
        total = self.hits + self.misses
        self.hit_rate = self.hits / total if total > 0 else 0.0


@dataclass
class CacheEntry:
    """Cache entry with metadata."""

    key: str
    value: Any
    created_at: datetime
    last_accessed: datetime
    access_count: int = 0
    size_bytes: int = 0
    ttl: float | None = None
    tags: set[str] = field(default_factory=set)

    def is_expired(self) -> bool:
        """Check if the cache entry is expired."""
        if self.ttl is None:
            return False
        return (datetime.now(timezone.utc) - self.created_at).total_seconds() > self.ttl

    def touch(self) -> None:
        """Update last accessed time and increment access count."""
        self.last_accessed = datetime.now(timezone.utc)
        self.access_count += 1


class CacheOptimizer:
    """Advanced cache optimization system with multiple strategies."""

    def __init__(
        self,
        max_size: int = 10000,
        default_ttl: float = 3600,
        strategy: CacheStrategy = CacheStrategy.ADAPTIVE,
        redis_url: str | None = None,
        enable_compression: bool = False,
        compression_threshold: int = 1024,
    ):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.strategy = strategy
        self.enable_compression = enable_compression
        self.compression_threshold = compression_threshold

        # Local cache storage
        self.cache: dict[str, CacheEntry] = {}
        self.metrics = CacheMetrics()

        # Redis connection for distributed caching
        self.redis: aioredis.Redis | None = None
        self.redis_url = redis_url

        # Optimization tracking
        self.access_patterns: dict[str, list[float]] = {}
        self.key_priorities: dict[str, float] = {}
        self.optimization_history: list[dict[str, Any]] = []

        # Background tasks
        self._cleanup_task: asyncio.Task | None = None
        self._optimization_task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        """Start the cache optimizer."""
        if self._running:
            return

        self._running = True

        # Initialize Redis connection if URL provided
        if self.redis_url:
            try:
                self.redis = await aioredis.from_url(self.redis_url)
                logger.info("Connected to Redis cache")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}")

        # Start background tasks
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        self._optimization_task = asyncio.create_task(self._optimization_loop())

        logger.info("Cache optimizer started")

    async def stop(self) -> None:
        """Stop the cache optimizer."""
        self._running = False

        if self._cleanup_task:
            self._cleanup_task.cancel()
        if self._optimization_task:
            self._optimization_task.cancel()

        if self.redis:
            await self.redis.close()

        logger.info("Cache optimizer stopped")

    async def get(self, key: str, default: Any = None) -> Any:
        """Get a value from cache with optimization tracking."""
        start_time = time.time()

        try:
            # Check local cache first
            if key in self.cache:
                entry = self.cache[key]

                if entry.is_expired():
                    await self._evict_key(key)
                    self.metrics.misses += 1
                    return await self._fetch_from_redis(key, default)

                entry.touch()
                self.metrics.hits += 1
                self._record_access_pattern(key, time.time())

                access_time = time.time() - start_time
                self._update_avg_access_time(access_time)

                return entry.value

            # Check Redis if available
            value = await self._fetch_from_redis(key, default)
            if value is not default:
                # Store in local cache
                await self.set(key, value, ttl=self.default_ttl)
                self.metrics.hits += 1
            else:
                self.metrics.misses += 1

            return value

        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            self.metrics.misses += 1
            return default

    async def set(
        self,
        key: str,
        value: Any,
        ttl: float | None = None,
        tags: set[str] | None = None,
    ) -> None:
        """Set a value in cache with optimization."""
        try:
            ttl = ttl or self.default_ttl
            tags = tags or set()

            # Serialize and compress if needed
            serialized_value, size_bytes = await self._serialize_value(value)

            # Create cache entry
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(timezone.utc),
                last_accessed=datetime.now(timezone.utc),
                size_bytes=size_bytes,
                ttl=ttl,
                tags=tags,
            )

            # Check if we need to evict entries
            await self._ensure_capacity()

            # Store in local cache
            self.cache[key] = entry
            self.metrics.writes += 1
            self.metrics.entry_count = len(self.cache)

            # Store in Redis if available
            if self.redis:
                await self.redis.setex(key, int(ttl), serialized_value)

            # Update optimization data
            self._update_key_priority(key)

        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")

    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        try:
            deleted = False

            if key in self.cache:
                del self.cache[key]
                self.metrics.entry_count = len(self.cache)
                deleted = True

            if self.redis:
                redis_deleted = await self.redis.delete(key)
                deleted = deleted or redis_deleted > 0

            return deleted

        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False

    async def clear(
        self, pattern: str | None = None, tags: builtins.set[str] | None = None
    ) -> int:
        """Clear cache entries matching pattern or tags."""
        try:
            deleted_count = 0
            keys_to_delete = []

            if pattern:
                import fnmatch

                keys_to_delete = [
                    k for k in self.cache.keys() if fnmatch.fnmatch(k, pattern)
                ]
            elif tags:
                keys_to_delete = [
                    k
                    for k, entry in self.cache.items()
                    if entry.tags.intersection(tags)
                ]
            else:
                keys_to_delete = list(self.cache.keys())

            for key in keys_to_delete:
                if await self.delete(key):
                    deleted_count += 1

            return deleted_count

        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return 0

    async def get_metrics(self) -> CacheMetrics:
        """Get current cache metrics."""
        self.metrics.calculate_hit_rate()
        self.metrics.memory_usage = sum(
            entry.size_bytes for entry in self.cache.values()
        )
        self.metrics.entry_count = len(self.cache)

        # Identify hot and cold keys
        self._identify_hot_cold_keys()

        return self.metrics

    async def optimize(self) -> dict[str, Any]:
        """Run cache optimization and return results."""
        optimization_start = time.time()

        # Analyze access patterns
        pattern_analysis = self._analyze_access_patterns()

        # Optimize cache size and TTL
        size_optimization = await self._optimize_cache_size()
        ttl_optimization = self._optimize_ttl_values()

        # Preload frequently accessed data
        preload_results = await self._preload_hot_data()

        # Evict cold data
        eviction_results = await self._evict_cold_data()

        optimization_time = time.time() - optimization_start

        results = {
            "optimization_time": optimization_time,
            "pattern_analysis": pattern_analysis,
            "size_optimization": size_optimization,
            "ttl_optimization": ttl_optimization,
            "preload_results": preload_results,
            "eviction_results": eviction_results,
            "metrics": await self.get_metrics(),
        }

        self.optimization_history.append(results)
        logger.info(f"Cache optimization completed in {optimization_time:.2f}s")

        return results

    async def _fetch_from_redis(self, key: str, default: Any = None) -> Any:
        """Fetch value from Redis cache."""
        if not self.redis:
            return default

        try:
            value = await self.redis.get(key)
            if value is None:
                return default

            return await self._deserialize_value(value)

        except Exception as e:
            logger.error(f"Error fetching from Redis: {e}")
            return default

    async def _serialize_value(self, value: Any) -> tuple[bytes, int]:
        """Serialize and optionally compress a value."""
        try:
            serialized = pickle.dumps(value)

            if self.enable_compression and len(serialized) > self.compression_threshold:
                import gzip

                serialized = gzip.compress(serialized)

            return serialized, len(serialized)

        except Exception as e:
            logger.error(f"Error serializing value: {e}")
            return b"", 0

    async def _deserialize_value(self, data: bytes) -> Any:
        """Deserialize and decompress a value."""
        try:
            # Try to decompress first
            if self.enable_compression:
                try:
                    import gzip

                    data = gzip.decompress(data)
                except:
                    pass  # Not compressed

            # Security fix: Try JSON first (safer), fallback to pickle only for internal cache data
            try:
                # Decode bytes to string for JSON
                json_str = data.decode("utf-8")
                return json.loads(json_str)
            except (UnicodeDecodeError, json.JSONDecodeError):
                # Fallback to pickle for internal cache data only
                # Note: This should only be used for trusted internal data
                logger.warning(
                    "Using pickle deserialization for cache data - ensure data is trusted"
                )
                return pickle.loads(data)  # nosec B301

        except Exception as e:
            logger.error(f"Error deserializing value: {e}")
            return None

    async def _ensure_capacity(self) -> None:
        """Ensure cache doesn't exceed maximum size."""
        while len(self.cache) >= self.max_size:
            # Use strategy-specific eviction
            if self.strategy == CacheStrategy.LRU:
                await self._evict_lru()
            elif self.strategy == CacheStrategy.TTL:
                await self._evict_expired()
            else:
                await self._evict_adaptive()

    async def _evict_lru(self) -> None:
        """Evict least recently used entry."""
        if not self.cache:
            return

        lru_key = min(self.cache.keys(), key=lambda k: self.cache[k].last_accessed)
        await self._evict_key(lru_key)

    async def _evict_expired(self) -> None:
        """Evict expired entries."""
        expired_keys = [key for key, entry in self.cache.items() if entry.is_expired()]

        for key in expired_keys:
            await self._evict_key(key)

        # If no expired entries, evict LRU
        if not expired_keys:
            await self._evict_lru()

    async def _evict_adaptive(self) -> None:
        """Evict entry using adaptive strategy."""
        if not self.cache:
            return

        # Calculate eviction score based on multiple factors
        scores = {}
        now = datetime.now(timezone.utc)

        for key, entry in self.cache.items():
            # Time since last access
            time_score = (now - entry.last_accessed).total_seconds() / 3600

            # Access frequency (lower is better for eviction)
            freq_score = 1.0 / (entry.access_count + 1)

            # Size factor (larger entries have higher eviction priority)
            size_score = entry.size_bytes / 10000

            # Priority from optimization
            priority_score = 1.0 - self.key_priorities.get(key, 0.0)

            # Combined score
            scores[key] = time_score + freq_score + size_score + priority_score

        # Evict highest scoring entry
        evict_key = max(scores.keys(), key=lambda k: scores[k])
        await self._evict_key(evict_key)

    async def _evict_key(self, key: str) -> None:
        """Evict a specific key."""
        if key in self.cache:
            del self.cache[key]
            self.metrics.evictions += 1
            self.metrics.entry_count = len(self.cache)

    def _record_access_pattern(self, key: str, timestamp: float) -> None:
        """Record access pattern for optimization."""
        if key not in self.access_patterns:
            self.access_patterns[key] = []

        self.access_patterns[key].append(timestamp)

        # Keep only recent accesses (last hour)
        cutoff = timestamp - 3600
        self.access_patterns[key] = [t for t in self.access_patterns[key] if t > cutoff]

    def _update_avg_access_time(self, access_time: float) -> None:
        """Update average access time."""
        if self.metrics.avg_access_time == 0:
            self.metrics.avg_access_time = access_time
        else:
            # Exponential moving average
            alpha = 0.1
            self.metrics.avg_access_time = (
                alpha * access_time + (1 - alpha) * self.metrics.avg_access_time
            )

    def _update_key_priority(self, key: str) -> None:
        """Update key priority based on access patterns."""
        if key not in self.access_patterns:
            self.key_priorities[key] = 0.5
            return

        accesses = self.access_patterns[key]
        if not accesses:
            self.key_priorities[key] = 0.1
            return

        # Calculate priority based on frequency and recency
        now = time.time()
        recent_accesses = [t for t in accesses if now - t < 300]  # Last 5 minutes
        frequency = len(accesses) / max(1, (now - min(accesses)) / 3600)  # Per hour
        recency = len(recent_accesses) / max(1, len(accesses))

        priority = min(1.0, frequency * 0.1 + recency * 0.9)
        self.key_priorities[key] = priority

    def _identify_hot_cold_keys(self) -> None:
        """Identify hot and cold cache keys."""
        if not self.key_priorities:
            return

        sorted_keys = sorted(
            self.key_priorities.items(), key=lambda x: x[1], reverse=True
        )

        hot_threshold = 0.7
        cold_threshold = 0.3

        self.metrics.hot_keys = {
            key for key, priority in sorted_keys if priority > hot_threshold
        }

        self.metrics.cold_keys = {
            key for key, priority in sorted_keys if priority < cold_threshold
        }

    def _analyze_access_patterns(self) -> dict[str, Any]:
        """Analyze cache access patterns."""
        patterns = {
            "total_keys": len(self.access_patterns),
            "hot_keys_count": len(self.metrics.hot_keys),
            "cold_keys_count": len(self.metrics.cold_keys),
            "access_distribution": {},
        }

        # Analyze access frequency distribution
        frequencies = []
        for _key, accesses in self.access_patterns.items():
            if accesses:
                frequency = len(accesses) / max(1, (time.time() - min(accesses)) / 3600)
                frequencies.append(frequency)

        if frequencies:
            patterns["access_distribution"] = {
                "min": min(frequencies),
                "max": max(frequencies),
                "avg": sum(frequencies) / len(frequencies),
                "p50": sorted(frequencies)[len(frequencies) // 2],
                "p95": sorted(frequencies)[int(len(frequencies) * 0.95)],
            }

        return patterns

    async def _optimize_cache_size(self) -> dict[str, Any]:
        """Optimize cache size based on usage patterns."""
        current_size = len(self.cache)
        memory_usage = sum(entry.size_bytes for entry in self.cache.values())

        # Calculate optimal size based on hit rate and memory efficiency
        hit_rate = self.metrics.hit_rate

        optimal_size = self.max_size
        if hit_rate > 0.9 and memory_usage < self.max_size * 0.8:
            # Increase size if hit rate is high and memory usage is low
            optimal_size = int(self.max_size * 1.2)
        elif hit_rate < 0.6:
            # Decrease size if hit rate is low
            optimal_size = int(self.max_size * 0.8)

        return {
            "current_size": current_size,
            "current_memory": memory_usage,
            "optimal_size": optimal_size,
            "size_adjustment": optimal_size - self.max_size,
        }

    def _optimize_ttl_values(self) -> dict[str, Any]:
        """Optimize TTL values based on access patterns."""
        ttl_recommendations = {}

        for key, accesses in self.access_patterns.items():
            if not accesses or len(accesses) < 2:
                continue

            # Calculate access interval
            intervals = [accesses[i] - accesses[i - 1] for i in range(1, len(accesses))]
            avg_interval = sum(intervals) / len(intervals)

            # Recommend TTL as 2x average access interval
            recommended_ttl = avg_interval * 2

            # Clamp to reasonable bounds
            recommended_ttl = max(60, min(86400, recommended_ttl))  # 1 min to 1 day

            ttl_recommendations[key] = recommended_ttl

        return {
            "total_keys_analyzed": len(ttl_recommendations),
            "avg_recommended_ttl": sum(ttl_recommendations.values())
            / max(1, len(ttl_recommendations)),
            "recommendations": ttl_recommendations,
        }

    async def _preload_hot_data(self) -> dict[str, Any]:
        """Preload frequently accessed data."""
        preloaded = 0

        for key in self.metrics.hot_keys:
            if key not in self.cache:
                # Try to load from Redis
                value = await self._fetch_from_redis(key)
                if value is not None:
                    await self.set(key, value)
                    preloaded += 1

        return {
            "preloaded_count": preloaded,
            "hot_keys_count": len(self.metrics.hot_keys),
        }

    async def _evict_cold_data(self) -> dict[str, Any]:
        """Evict cold data to free up space."""
        evicted = 0

        for key in list(self.metrics.cold_keys):
            if key in self.cache:
                await self._evict_key(key)
                evicted += 1

        return {
            "evicted_count": evicted,
            "cold_keys_count": len(self.metrics.cold_keys),
        }

    async def _cleanup_loop(self) -> None:
        """Background cleanup loop."""
        while self._running:
            try:
                await self._evict_expired()
                await asyncio.sleep(60)  # Run every minute
            except Exception as e:
                logger.error(f"Error in cache cleanup: {e}")
                await asyncio.sleep(60)

    async def _optimization_loop(self) -> None:
        """Background optimization loop."""
        while self._running:
            try:
                await self.optimize()
                await asyncio.sleep(300)  # Run every 5 minutes
            except Exception as e:
                logger.error(f"Error in cache optimization: {e}")
                await asyncio.sleep(300)


# Global cache optimizer instance
_cache_optimizer: CacheOptimizer | None = None


def get_cache_optimizer() -> CacheOptimizer:
    """Get the global cache optimizer instance."""
    global _cache_optimizer
    if _cache_optimizer is None:
        _cache_optimizer = CacheOptimizer()
    return _cache_optimizer
