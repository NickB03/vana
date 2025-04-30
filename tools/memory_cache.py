import time
from typing import Dict, Any, Optional, List

class MemoryCache:
    """Caching layer for memory operations."""
    
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        self.cache = {}
        self.access_times = {}
        self.max_size = max_size
        self.ttl = ttl  # Time-to-live in seconds
    
    def get(self, key: str) -> Optional[Any]:
        """Get an item from the cache."""
        if key not in self.cache:
            return None
            
        # Check if item has expired
        if time.time() - self.access_times[key] > self.ttl:
            self._remove(key)
            return None
            
        # Update access time
        self.access_times[key] = time.time()
        return self.cache[key]
    
    def set(self, key: str, value: Any) -> None:
        """Add or update an item in the cache."""
        # Check if cache is at max capacity
        if len(self.cache) >= self.max_size and key not in self.cache:
            self._evict_oldest()
            
        self.cache[key] = value
        self.access_times[key] = time.time()
    
    def _evict_oldest(self) -> None:
        """Remove the oldest item from the cache."""
        if not self.access_times:
            return
            
        oldest_key = min(self.access_times, key=self.access_times.get)
        self._remove(oldest_key)
    
    def _remove(self, key: str) -> None:
        """Remove an item from the cache."""
        if key in self.cache:
            del self.cache[key]
        if key in self.access_times:
            del self.access_times[key]
