import logging
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

# Set up logging
logger = logging.getLogger(__name__)


class MemoryCache:
    """
    Caching layer for memory operations with TTL and LRU eviction.

    This cache implements both time-based expiration (TTL) and least-recently-used (LRU)
    eviction when the cache reaches its maximum size.
    """

    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        """
        Initialize the memory cache.

        Args:
            max_size: Maximum number of items in the cache
            ttl: Time-to-live in seconds for cache items
        """
        self.cache = {}  # Main cache storage
        self.access_times = {}  # Last access time for each key
        self.creation_times = {}  # Creation time for each key
        self.type_index = defaultdict(set)  # Index of keys by entity type
        self.name_index = {}  # Index of keys by entity name
        self.max_size = max_size
        self.ttl = ttl
        self.hit_count = 0
        self.miss_count = 0
        self.eviction_count = 0

        logger.info("Initialized memory cache with max_size=%d, ttl=%d", max_size, ttl)

    def get(self, key: str) -> Optional[Any]:
        """
        Get an item from the cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or expired
        """
        if key not in self.cache:
            self.miss_count += 1
            return None

        # Check if item has expired
        current_time = time.time()
        if current_time - self.creation_times[key] > self.ttl:
            logger.debug("Cache item expired: %s", key)
            self._remove(key)
            self.miss_count += 1
            return None

        # Update access time
        self.access_times[key] = current_time
        self.hit_count += 1
        return self.cache[key]

    def get_by_name(self, name: str) -> Optional[Any]:
        """
        Get an item from the cache by entity name.

        Args:
            name: Entity name

        Returns:
            Cached value or None if not found or expired
        """
        if name not in self.name_index:
            self.miss_count += 1
            return None

        key = self.name_index[name]
        return self.get(key)

    def get_by_type(self, entity_type: str, limit: int = 10) -> List[Any]:
        """
        Get items from the cache by entity type.

        Args:
            entity_type: Entity type
            limit: Maximum number of items to return

        Returns:
            List of cached values of the specified type
        """
        if entity_type not in self.type_index:
            return []

        results = []
        for key in self.type_index[entity_type]:
            value = self.get(key)
            if value is not None:
                results.append(value)
                if len(results) >= limit:
                    break

        return results

    def search(self, query: str, entity_type: Optional[str] = None, limit: int = 10) -> List[Any]:
        """
        Search for items in the cache.

        Args:
            query: Search query
            entity_type: Optional entity type to filter by
            limit: Maximum number of results to return

        Returns:
            List of matching cached values
        """
        results = []
        keys_to_search = self.type_index.get(entity_type, self.cache.keys()) if entity_type else self.cache.keys()

        for key in keys_to_search:
            if key in self.cache:
                value = self.get(key)
                if value is not None:
                    # Simple text matching (would be more sophisticated in production)
                    entity_name = value.get("name", "")
                    observations = value.get("observations", [])

                    if query.lower() in entity_name.lower() or any(
                        query.lower() in obs.lower() for obs in observations
                    ):
                        results.append(value)
                        if len(results) >= limit:
                            break

        return results

    def set(self, key: str, value: Any) -> None:
        """
        Add or update an item in the cache.

        Args:
            key: Cache key
            value: Value to cache
        """
        current_time = time.time()
        is_new = key not in self.cache

        # Check if cache is at max capacity
        if is_new and len(self.cache) >= self.max_size:
            self._evict_oldest()

        # Store the value
        self.cache[key] = value
        self.access_times[key] = current_time

        # Set creation time only for new items
        if is_new:
            self.creation_times[key] = current_time

        # Update indexes
        if isinstance(value, dict):
            entity_type = value.get("type")
            entity_name = value.get("name")

            if entity_type:
                self.type_index[entity_type].add(key)

            if entity_name:
                self.name_index[entity_name] = key

        logger.debug("Cache item set: %s", key)

    def remove(self, key: str) -> bool:
        """
        Remove an item from the cache.

        Args:
            key: Cache key

        Returns:
            True if item was removed, False if not found
        """
        if key not in self.cache:
            return False

        self._remove(key)
        return True

    def clear(self) -> None:
        """Clear the entire cache."""
        self.cache.clear()
        self.access_times.clear()
        self.creation_times.clear()
        self.type_index.clear()
        self.name_index.clear()
        logger.info("Cache cleared")

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dict containing cache statistics
        """
        total_requests = self.hit_count + self.miss_count
        hit_ratio = self.hit_count / total_requests if total_requests > 0 else 0

        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "ttl": self.ttl,
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_ratio": hit_ratio,
            "eviction_count": self.eviction_count,
            "type_counts": {t: len(keys) for t, keys in self.type_index.items()},
        }

    def _evict_oldest(self) -> None:
        """Remove the least recently used item from the cache."""
        if not self.access_times:
            return

        oldest_key = min(self.access_times, key=self.access_times.get)
        logger.debug("Evicting oldest cache item: %s", oldest_key)
        self._remove(oldest_key)
        self.eviction_count += 1

    def _remove(self, key: str) -> None:
        """
        Remove an item from the cache and update indexes.

        Args:
            key: Cache key
        """
        if key in self.cache:
            value = self.cache[key]

            # Remove from indexes
            if isinstance(value, dict):
                entity_type = value.get("type")
                entity_name = value.get("name")

                if entity_type and entity_type in self.type_index:
                    self.type_index[entity_type].discard(key)
                    if not self.type_index[entity_type]:
                        del self.type_index[entity_type]

                if entity_name and entity_name in self.name_index:
                    del self.name_index[entity_name]

            # Remove from main cache
            del self.cache[key]

        if key in self.access_times:
            del self.access_times[key]

        if key in self.creation_times:
            del self.creation_times[key]
