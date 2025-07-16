"""
Caching utilities for VANA tools.

Provides LRU caching with TTL support for expensive operations
like search results, document generation, and analysis.
"""

from typing import Any, Dict, Optional, Tuple, Callable
from functools import wraps
import time
import hashlib
import json
from collections import OrderedDict
import threading


class LRUCache:
    """Thread-safe LRU cache with TTL support."""
    
    def __init__(self, max_size: int = 100, default_ttl: int = 300):
        """
        Initialize LRU cache.
        
        Args:
            max_size: Maximum number of items in cache
            default_ttl: Default time-to-live in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache = OrderedDict()
        self.lock = threading.RLock()
        self.hits = 0
        self.misses = 0
    
    def _make_key(self, *args, **kwargs) -> str:
        """Generate cache key from function arguments."""
        # Convert args and kwargs to a stable string representation
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.sha256(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self.lock:
            if key not in self.cache:
                self.misses += 1
                return None
                
            # Check if expired
            value, expiry_time = self.cache[key]
            if time.time() > expiry_time:
                del self.cache[key]
                self.misses += 1
                return None
            
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            self.hits += 1
            return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        with self.lock:
            ttl = ttl or self.default_ttl
            expiry_time = time.time() + ttl
            
            # Remove oldest items if at capacity
            while len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
            
            self.cache[key] = (value, expiry_time)
    
    def clear(self) -> None:
        """Clear all cached items."""
        with self.lock:
            self.cache.clear()
            self.hits = 0
            self.misses = 0
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self.lock:
            total_requests = self.hits + self.misses
            hit_rate = self.hits / total_requests if total_requests > 0 else 0
            
            return {
                'size': len(self.cache),
                'max_size': self.max_size,
                'hits': self.hits,
                'misses': self.misses,
                'hit_rate': round(hit_rate, 3),
                'total_requests': total_requests
            }


# Global caches for different operation types
_search_cache = LRUCache(max_size=50, default_ttl=600)  # 10 minutes
_document_cache = LRUCache(max_size=20, default_ttl=1800)  # 30 minutes
_analysis_cache = LRUCache(max_size=30, default_ttl=900)  # 15 minutes


def cache_search_result(ttl: int = 600):
    """
    Decorator to cache search results.
    
    Args:
        ttl: Time-to-live in seconds
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Don't cache if explicitly disabled
            if kwargs.get('no_cache', False):
                kwargs.pop('no_cache', None)
                return func(*args, **kwargs)
            
            # Generate cache key
            cache_key = _search_cache._make_key(*args, **kwargs)
            
            # Check cache
            cached_result = _search_cache.get(cache_key)
            if cached_result is not None:
                # Add cache metadata
                if isinstance(cached_result, dict):
                    cached_result['_from_cache'] = True
                    cached_result['_cache_time'] = time.time()
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache successful results only
            if isinstance(result, dict) and result.get('status') == 'success':
                _search_cache.set(cache_key, result, ttl)
            
            return result
        
        # Add cache control methods
        wrapper.clear_cache = _search_cache.clear
        wrapper.cache_stats = _search_cache.stats
        
        return wrapper
    return decorator


def cache_document_result(ttl: int = 1800):
    """
    Decorator to cache document generation results.
    
    Args:
        ttl: Time-to-live in seconds
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Don't cache if explicitly disabled
            if kwargs.get('no_cache', False):
                kwargs.pop('no_cache', None)
                return func(*args, **kwargs)
            
            # Generate cache key
            cache_key = _document_cache._make_key(*args, **kwargs)
            
            # Check cache
            cached_result = _document_cache.get(cache_key)
            if cached_result is not None:
                # Regenerate unique IDs for cached documents
                if isinstance(cached_result, dict) and 'metadata' in cached_result:
                    import uuid
                    cached_result['metadata']['id'] = str(uuid.uuid4())
                    cached_result['metadata']['created_at'] = time.time()
                    cached_result['_from_cache'] = True
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache successful results only
            if isinstance(result, dict) and result.get('status') == 'success':
                _document_cache.set(cache_key, result, ttl)
            
            return result
        
        # Add cache control methods
        wrapper.clear_cache = _document_cache.clear
        wrapper.cache_stats = _document_cache.stats
        
        return wrapper
    return decorator


def cache_analysis_result(ttl: int = 900):
    """
    Decorator to cache analysis results.
    
    Args:
        ttl: Time-to-live in seconds
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Don't cache if explicitly disabled
            if kwargs.get('no_cache', False):
                kwargs.pop('no_cache', None)
                return func(*args, **kwargs)
            
            # Generate cache key
            cache_key = _analysis_cache._make_key(*args, **kwargs)
            
            # Check cache
            cached_result = _analysis_cache.get(cache_key)
            if cached_result is not None:
                if isinstance(cached_result, dict):
                    cached_result['_from_cache'] = True
                    cached_result['_cache_time'] = time.time()
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache successful results only
            if isinstance(result, dict) and result.get('status') == 'success':
                _analysis_cache.set(cache_key, result, ttl)
            
            return result
        
        # Add cache control methods
        wrapper.clear_cache = _analysis_cache.clear
        wrapper.cache_stats = _analysis_cache.stats
        
        return wrapper
    return decorator


def get_cache_stats() -> Dict[str, Dict[str, Any]]:
    """Get statistics for all caches."""
    return {
        'search_cache': _search_cache.stats(),
        'document_cache': _document_cache.stats(),
        'analysis_cache': _analysis_cache.stats()
    }


def clear_all_caches() -> None:
    """Clear all caches."""
    _search_cache.clear()
    _document_cache.clear()
    _analysis_cache.clear()