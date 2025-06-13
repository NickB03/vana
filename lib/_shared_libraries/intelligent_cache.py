"""
Intelligent Caching System for VANA Multi-Agent System
Phase 4B: Performance Optimization - Step 3

Implements intelligent caching for:
- Tool execution results
- Agent decision patterns
- Task similarity detection
- Cache warming strategies
"""

import hashlib
import json
import threading
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class CacheEntry:
    """Represents a cached entry with metadata."""

    key: str
    value: Any
    created_at: float
    last_accessed: float
    access_count: int
    ttl: Optional[float] = None  # Time to live in seconds

    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        if self.ttl is None:
            return False
        return time.time() - self.created_at > self.ttl

    def touch(self):
        """Update last accessed time and increment access count."""
        self.last_accessed = time.time()
        self.access_count += 1


class IntelligentCache:
    """
    Intelligent caching system with advanced features:
    - TTL-based expiration
    - LRU eviction
    - Access pattern analysis
    - Cache warming
    - Thread-safe operations
    """

    def __init__(self, max_size: int = 1000, default_ttl: Optional[float] = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, CacheEntry] = {}
        self._access_patterns: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.RLock()

        # Cache statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache with intelligent access tracking."""
        with self._lock:
            if key not in self._cache:
                self.misses += 1
                return None

            entry = self._cache[key]

            # Check if expired
            if entry.is_expired():
                del self._cache[key]
                self.misses += 1
                return None

            # Update access patterns
            entry.touch()
            self._access_patterns[key].append(time.time())
            self.hits += 1

            return entry.value

    def put(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Put value in cache with intelligent eviction."""
        with self._lock:
            # Use default TTL if not specified
            if ttl is None:
                ttl = self.default_ttl

            # Create cache entry
            entry = CacheEntry(
                key=key, value=value, created_at=time.time(), last_accessed=time.time(), access_count=1, ttl=ttl
            )

            # Check if we need to evict
            if len(self._cache) >= self.max_size and key not in self._cache:
                self._evict_lru()

            self._cache[key] = entry

    def _evict_lru(self) -> None:
        """Evict least recently used entry."""
        if not self._cache:
            return

        # Find LRU entry
        lru_key = min(self._cache.keys(), key=lambda k: self._cache[k].last_accessed)
        del self._cache[lru_key]
        self.evictions += 1

    def clear_expired(self) -> int:
        """Clear all expired entries and return count."""
        with self._lock:
            expired_keys = [key for key, entry in self._cache.items() if entry.is_expired()]

            for key in expired_keys:
                del self._cache[key]

            return len(expired_keys)

    def get_statistics(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0

            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": hit_rate,
                "evictions": self.evictions,
                "most_accessed": self._get_most_accessed_keys(5),
            }

    def _get_most_accessed_keys(self, limit: int) -> List[Tuple[str, int]]:
        """Get most accessed cache keys."""
        return sorted(
            [(key, entry.access_count) for key, entry in self._cache.items()], key=lambda x: x[1], reverse=True
        )[:limit]


class ToolResultCache(IntelligentCache):
    """Specialized cache for tool execution results."""

    def __init__(self):
        # Tool results can be cached longer since they're more stable
        super().__init__(max_size=500, default_ttl=7200)  # 2 hours
        self.tool_patterns = self._initialize_tool_patterns()

    def _initialize_tool_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize caching patterns for different tools."""
        return {
            "search_tools": {"ttl": 1800, "similarity_threshold": 0.8},  # 30 minutes for search results
            "file_tools": {"ttl": 3600, "similarity_threshold": 0.9},  # 1 hour for file operations
            "kg_tools": {"ttl": 7200, "similarity_threshold": 0.85},  # 2 hours for knowledge graph
            "system_tools": {"ttl": 300, "similarity_threshold": 0.95},  # 5 minutes for system status
        }

    def get_tool_cache_key(self, tool_name: str, parameters: Dict[str, Any]) -> str:
        """Generate cache key for tool execution."""
        # Normalize parameters for better cache hits
        normalized_params = self._normalize_parameters(parameters)
        param_str = json.dumps(normalized_params, sort_keys=True)
        return f"{tool_name}:{hashlib.md5(param_str.encode()).hexdigest()}"

    def _normalize_parameters(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize parameters for better cache hits."""
        normalized = {}
        for key, value in parameters.items():
            if isinstance(value, str):
                # Normalize string parameters
                normalized[key] = value.lower().strip()
            else:
                normalized[key] = value
        return normalized

    def should_cache_tool_result(self, tool_name: str, execution_time: float) -> bool:
        """Determine if tool result should be cached."""
        # Cache results that took significant time to compute
        if execution_time > 0.1:  # 100ms threshold
            return True

        # Always cache search and knowledge graph results
        if any(pattern in tool_name.lower() for pattern in ["search", "kg", "knowledge"]):
            return True

        return False


class AgentDecisionCache(IntelligentCache):
    """Specialized cache for agent decision patterns."""

    def __init__(self):
        # Agent decisions can be cached for shorter periods
        super().__init__(max_size=300, default_ttl=1800)  # 30 minutes

    def get_decision_cache_key(self, task_description: str, context: Dict[str, Any]) -> str:
        """Generate cache key for agent decisions."""
        # Create similarity-based key for better cache hits
        task_signature = self._get_task_signature(task_description)
        context_signature = self._get_context_signature(context)
        return f"decision:{task_signature}:{context_signature}"

    def _get_task_signature(self, task_description: str) -> str:
        """Generate task signature for similarity matching."""
        # Extract key words and create signature
        words = task_description.lower().split()
        # Filter out common words
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
        key_words = [w for w in words if w not in stop_words and len(w) > 2]

        # Sort for consistent signatures
        key_words.sort()
        return hashlib.md5(" ".join(key_words[:10]).encode()).hexdigest()[:16]

    def _get_context_signature(self, context: Dict[str, Any]) -> str:
        """Generate context signature."""
        if not context:
            return "empty"

        # Only include relevant context keys
        relevant_keys = ["priority", "deadline", "complexity", "agent_preference"]
        relevant_context = {k: v for k, v in context.items() if k in relevant_keys}

        if not relevant_context:
            return "empty"

        context_str = json.dumps(relevant_context, sort_keys=True)
        return hashlib.md5(context_str.encode()).hexdigest()[:8]


class CacheWarmer:
    """Intelligent cache warming system."""

    def __init__(self, tool_cache: ToolResultCache, decision_cache: AgentDecisionCache):
        self.tool_cache = tool_cache
        self.decision_cache = decision_cache
        self.warming_patterns = self._initialize_warming_patterns()

    def _initialize_warming_patterns(self) -> Dict[str, List[str]]:
        """Initialize common patterns for cache warming."""
        return {
            "common_tasks": [
                "Read configuration file",
                "Search for documentation",
                "Check system status",
                "Analyze performance metrics",
                "Create simple report",
            ],
            "common_searches": [
                "API documentation",
                "best practices",
                "troubleshooting guide",
                "performance optimization",
                "system architecture",
            ],
        }

    def warm_common_patterns(self):
        """Warm cache with common usage patterns."""
        # This would be called during system startup or low-usage periods
        # Implementation would pre-compute common operations


# Global cache instances
tool_result_cache = ToolResultCache()
agent_decision_cache = AgentDecisionCache()
cache_warmer = CacheWarmer(tool_result_cache, agent_decision_cache)


def get_cache_statistics() -> Dict[str, Any]:
    """Get comprehensive cache statistics."""
    return {
        "tool_cache": tool_result_cache.get_statistics(),
        "decision_cache": agent_decision_cache.get_statistics(),
        "total_memory_usage": _estimate_cache_memory_usage(),
    }


def _estimate_cache_memory_usage() -> str:
    """Estimate total cache memory usage."""
    # Simplified estimation
    tool_entries = len(tool_result_cache._cache)
    decision_entries = len(agent_decision_cache._cache)
    estimated_mb = tool_entries * 0.5 + decision_entries * 0.2  # Rough estimate
    return f"{estimated_mb:.1f} MB"


def clear_all_caches():
    """Clear all caches for memory management."""
    tool_result_cache._cache.clear()
    agent_decision_cache._cache.clear()
    tool_result_cache.hits = tool_result_cache.misses = tool_result_cache.evictions = 0
    agent_decision_cache.hits = agent_decision_cache.misses = agent_decision_cache.evictions = 0
