"""
Redis Cache Service for VANA Orchestrator
Provides high-performance caching with TTL and connection pooling
"""

import hashlib
import json
import os
import pickle
from contextlib import contextmanager
from datetime import timedelta
from typing import Any, Dict, List, Optional, Union

import redis

from lib.logging_config import get_logger

logger = get_logger("vana.redis_cache_service")


class RedisCacheService:
    """Redis caching service with connection pooling and automatic fallback"""

    def __init__(
        self,
        host: str = None,
        port: int = None,
        db: int = 0,
        password: str = None,
        decode_responses: bool = False,
        connection_pool_kwargs: Dict[str, Any] = None,
        default_ttl: int = 3600,  # 1 hour default
    ):
        """
        Initialize Redis cache service with connection pooling

        Args:
            host: Redis host (defaults to env var REDIS_HOST or localhost)
            port: Redis port (defaults to env var REDIS_PORT or 6379)
            db: Redis database number
            password: Redis password (defaults to env var REDIS_PASSWORD)
            decode_responses: Whether to decode responses to strings
            connection_pool_kwargs: Additional kwargs for connection pool
            default_ttl: Default TTL in seconds
        """
        self.host = host or os.getenv("REDIS_HOST", "localhost")
        self.port = port or int(os.getenv("REDIS_PORT", "6379"))
        self.db = db
        self.password = password or os.getenv("REDIS_PASSWORD")
        self.decode_responses = decode_responses
        self.default_ttl = default_ttl

        # Connection pool configuration
        pool_kwargs = {
            "host": self.host,
            "port": self.port,
            "db": self.db,
            "password": self.password,
            "decode_responses": self.decode_responses,
            "max_connections": 50,
            "socket_connect_timeout": 5,
            "socket_timeout": 5,
            "retry_on_timeout": True,
            "health_check_interval": 30,
        }

        if connection_pool_kwargs:
            pool_kwargs.update(connection_pool_kwargs)

        # Initialize connection pool
        try:
            self.pool = redis.ConnectionPool(**pool_kwargs)
            self._redis_client = redis.Redis(connection_pool=self.pool)
            # Test connection
            self._redis_client.ping()
            self._available = True
            logger.info(f"✅ Redis cache service connected to {self.host}:{self.port}")
        except Exception as e:
            logger.warning(f"❌ Redis not available, using in-memory fallback: {e}")
            self._redis_client = None
            self._available = False
            self._fallback_cache = {}
            self._fallback_ttl = {}

    @property
    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self._available

    @contextmanager
    def get_client(self):
        """Get a Redis client from the pool"""
        if self._available:
            client = redis.Redis(connection_pool=self.pool)
            try:
                yield client
            finally:
                # Connection automatically returned to pool
                pass
        else:
            yield None

    def _generate_key(self, namespace: str, key: str) -> str:
        """Generate a namespaced cache key"""
        return f"vana:{namespace}:{key}"

    def _hash_key(self, data: Union[str, Dict, List]) -> str:
        """Generate a hash key from data"""
        if isinstance(data, str):
            return hashlib.md5(data.encode()).hexdigest()
        else:
            # Convert to JSON for consistent hashing
            json_str = json.dumps(data, sort_keys=True)
            return hashlib.md5(json_str.encode()).hexdigest()

    def get(self, namespace: str, key: str) -> Optional[Any]:
        """
        Get value from cache

        Args:
            namespace: Cache namespace (e.g., "orchestrator", "specialist")
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        cache_key = self._generate_key(namespace, key)

        if self._available:
            try:
                with self.get_client() as client:
                    value = client.get(cache_key)
                    if value:
                        # Try to deserialize if it's a pickled object
                        try:
                            return pickle.loads(value)
                        except:
                            # Return as string if not pickled
                            return value.decode() if isinstance(value, bytes) else value
            except Exception as e:
                logger.error(f"Redis get error: {e}")
                self._check_connection()
        else:
            # Fallback to in-memory cache
            if cache_key in self._fallback_cache:
                import time

                if time.time() < self._fallback_ttl.get(cache_key, 0):
                    return self._fallback_cache[cache_key]
                else:
                    # Expired
                    del self._fallback_cache[cache_key]
                    del self._fallback_ttl[cache_key]

        return None

    def set(self, namespace: str, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache

        Args:
            namespace: Cache namespace
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (uses default if not specified)

        Returns:
            True if successful
        """
        cache_key = self._generate_key(namespace, key)
        ttl = ttl or self.default_ttl

        if self._available:
            try:
                with self.get_client() as client:
                    # Serialize complex objects
                    if not isinstance(value, (str, bytes, int, float)):
                        value = pickle.dumps(value)

                    client.setex(cache_key, ttl, value)
                    return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
                self._check_connection()

        # Fallback to in-memory cache
        import time

        self._fallback_cache[cache_key] = value
        self._fallback_ttl[cache_key] = time.time() + ttl
        return True

    def delete(self, namespace: str, key: str) -> bool:
        """Delete value from cache"""
        cache_key = self._generate_key(namespace, key)

        if self._available:
            try:
                with self.get_client() as client:
                    client.delete(cache_key)
                    return True
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
                self._check_connection()
        else:
            # Fallback
            if cache_key in self._fallback_cache:
                del self._fallback_cache[cache_key]
                del self._fallback_ttl[cache_key]

        return True

    def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in a namespace"""
        pattern = self._generate_key(namespace, "*")
        count = 0

        if self._available:
            try:
                with self.get_client() as client:
                    keys = client.keys(pattern)
                    if keys:
                        count = client.delete(*keys)
            except Exception as e:
                logger.error(f"Redis clear namespace error: {e}")
                self._check_connection()
        else:
            # Fallback
            keys_to_delete = [k for k in self._fallback_cache.keys() if k.startswith(f"vana:{namespace}:")]
            for key in keys_to_delete:
                del self._fallback_cache[key]
                del self._fallback_ttl[key]
            count = len(keys_to_delete)

        logger.info(f"Cleared {count} keys from namespace '{namespace}'")
        return count

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = {"available": self._available, "host": self.host, "port": self.port}

        if self._available:
            try:
                with self.get_client() as client:
                    info = client.info()
                    stats.update(
                        {
                            "used_memory": info.get("used_memory_human", "N/A"),
                            "connected_clients": info.get("connected_clients", 0),
                            "total_commands_processed": info.get("total_commands_processed", 0),
                            "keyspace_hits": info.get("keyspace_hits", 0),
                            "keyspace_misses": info.get("keyspace_misses", 0),
                            "hit_rate": self._calculate_hit_rate(
                                info.get("keyspace_hits", 0), info.get("keyspace_misses", 0)
                            ),
                        }
                    )
            except Exception as e:
                logger.error(f"Redis stats error: {e}")
        else:
            stats.update(
                {"fallback_mode": True, "cached_items": len(self._fallback_cache), "memory_usage": "In-memory fallback"}
            )

        return stats

    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate"""
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0

    def _check_connection(self):
        """Check and try to restore Redis connection"""
        if not self._available:
            return

        try:
            self._redis_client.ping()
        except:
            logger.warning("Redis connection lost, switching to fallback mode")
            self._available = False
            self._fallback_cache = {}
            self._fallback_ttl = {}

    def cache_orchestrator_response(
        self, request: str, specialist: str, response: str, ttl: Optional[int] = None
    ) -> bool:
        """
        Cache an orchestrator response

        Args:
            request: Original request
            specialist: Specialist that handled it
            response: The response
            ttl: Optional TTL override

        Returns:
            True if cached successfully
        """
        # Create cache key from request hash
        key = self._hash_key(f"{request}:{specialist}")

        value = {
            "request": request,
            "specialist": specialist,
            "response": response,
            "cached_at": __import__("time").time(),
        }

        return self.set("orchestrator", key, value, ttl)

    def get_orchestrator_response(self, request: str, specialist: str) -> Optional[Dict[str, Any]]:
        """
        Get cached orchestrator response

        Args:
            request: Original request
            specialist: Specialist that should handle it

        Returns:
            Cached response dict or None
        """
        key = self._hash_key(f"{request}:{specialist}")
        return self.get("orchestrator", key)

    def close(self):
        """Close Redis connection pool"""
        if self.pool:
            self.pool.disconnect()
            logger.info("Redis connection pool closed")


# Global instance
_redis_cache = None


def get_redis_cache() -> RedisCacheService:
    """Get or create global Redis cache instance"""
    global _redis_cache
    if _redis_cache is None:
        _redis_cache = RedisCacheService()
    return _redis_cache


# Decorator for caching function results
def redis_cache(namespace: str = "function", ttl: int = 3600, key_prefix: str = ""):
    """
    Decorator for caching function results in Redis

    Args:
        namespace: Cache namespace
        ttl: Time to live in seconds
        key_prefix: Optional prefix for cache keys

    Example:
        @redis_cache(namespace="specialist", ttl=1800)
        def expensive_operation(param1, param2):
            # ... expensive computation ...
            return result
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            cache = get_redis_cache()

            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))

            cache_key = cache._hash_key(":".join(key_parts))

            # Try to get from cache
            result = cache.get(namespace, cache_key)
            if result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return result

            # Execute function
            result = func(*args, **kwargs)

            # Cache result
            cache.set(namespace, cache_key, result, ttl)

            return result

        return wrapper

    return decorator


# Export public API
__all__ = ["RedisCacheService", "get_redis_cache", "redis_cache"]
