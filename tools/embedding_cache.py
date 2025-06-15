#!/usr/bin/env python3
"""
Embedding Cache

This module provides both in-memory and persistent caching for embeddings to improve
performance and reduce API calls to embedding services.
"""

import functools
import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Simple in-memory cache
_embedding_cache = {}


def cache_embedding(func):
    """Decorator to cache embeddings in memory."""

    @functools.wraps(func)
    def wrapper(text, *args, **kwargs):
        # Use the text as the cache key
        if text in _embedding_cache:
            logger.debug(f"Cache hit for embedding: {text[:30]}...")
            return _embedding_cache[text]

        # Calculate the embedding
        result = func(text, *args, **kwargs)

        # Store in cache
        _embedding_cache[text] = result
        logger.debug(f"Cache miss for embedding: {text[:30]}...")

        return result

    return wrapper


def clear_cache():
    """Clear the in-memory embedding cache."""
    global _embedding_cache
    cache_size = len(_embedding_cache)
    _embedding_cache = {}
    logger.info(f"Cleared embedding cache ({cache_size} entries)")


class EmbeddingCache:
    """
    Persistent cache for text embeddings to reduce API calls.

    This cache stores embeddings locally to avoid repeated API calls for the same text,
    significantly reducing costs and latency during development and testing.
    """

    def __init__(self, cache_dir: Optional[str] = None, ttl_days: int = 30):
        """
        Initialize the embedding cache.

        Args:
            cache_dir: Directory to store cache files (default: ./data/embedding_cache)
            ttl_days: Time-to-live in days for cache entries (default: 30)
        """
        # Set cache directory
        if cache_dir is None:
            base_dir = os.environ.get("VANA_DATA_DIR", ".")
            self.cache_dir = os.path.join(base_dir, "embedding_cache")
        else:
            self.cache_dir = cache_dir

        # Create cache directory if it doesn't exist
        os.makedirs(self.cache_dir, exist_ok=True)

        self.ttl_seconds = ttl_days * 24 * 60 * 60
        self.hit_count = 0
        self.miss_count = 0

        logger.info(f"Initialized persistent embedding cache at {self.cache_dir}")

    def get(self, text: str, model: str = "text-embedding-004") -> Optional[List[float]]:
        """
        Get embedding for text from cache.

        Args:
            text: Text to get embedding for
            model: Embedding model name

        Returns:
            Embedding vector or None if not in cache
        """
        cache_key = self._generate_cache_key(text, model)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")

        if os.path.exists(cache_file):
            try:
                # Check if cache entry is expired
                if time.time() - os.path.getmtime(cache_file) > self.ttl_seconds:
                    logger.debug(f"Cache entry expired: {cache_key}")
                    os.remove(cache_file)
                    self.miss_count += 1
                    return None

                # Load embedding from cache
                with open(cache_file, "r") as f:
                    cache_data = json.load(f)

                self.hit_count += 1
                logger.debug(f"Cache hit: {cache_key}")
                return cache_data.get("embedding")
            except Exception as e:
                logger.error(f"Error reading cache file: {e}")
                self.miss_count += 1
                return None
        else:
            self.miss_count += 1
            return None

    def set(self, text: str, embedding: List[float], model: str = "text-embedding-004") -> None:
        """
        Store embedding in cache.

        Args:
            text: Text the embedding is for
            embedding: Embedding vector
            model: Embedding model name
        """
        cache_key = self._generate_cache_key(text, model)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")

        try:
            # Store embedding in cache
            cache_data = {"text": text, "model": model, "embedding": embedding, "timestamp": time.time()}

            with open(cache_file, "w") as f:
                json.dump(cache_data, f)

            logger.debug(f"Cached embedding: {cache_key}")
        except Exception as e:
            logger.error(f"Error writing cache file: {e}")

    def clear(self, older_than_days: Optional[int] = None) -> int:
        """
        Clear cache entries.

        Args:
            older_than_days: Only clear entries older than this many days (default: clear all)

        Returns:
            Number of entries cleared
        """
        cleared_count = 0

        try:
            for cache_file in Path(self.cache_dir).glob("*.json"):
                if older_than_days is not None:
                    # Only clear entries older than specified days
                    if time.time() - os.path.getmtime(cache_file) < older_than_days * 24 * 60 * 60:
                        continue

                os.remove(cache_file)
                cleared_count += 1

            logger.info(f"Cleared {cleared_count} cache entries")
            return cleared_count
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return cleared_count

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dict containing cache statistics
        """
        # Count cache files
        try:
            cache_files = list(Path(self.cache_dir).glob("*.json"))
            cache_size = len(cache_files)

            # Calculate cache size in bytes
            total_size_bytes = sum(os.path.getsize(f) for f in cache_files)

            # Calculate hit ratio
            total_requests = self.hit_count + self.miss_count
            hit_ratio = self.hit_count / total_requests if total_requests > 0 else 0

            return {
                "entries": cache_size,
                "size_bytes": total_size_bytes,
                "hit_count": self.hit_count,
                "miss_count": self.miss_count,
                "hit_ratio": hit_ratio,
                "ttl_days": self.ttl_seconds / (24 * 60 * 60),
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e), "hit_count": self.hit_count, "miss_count": self.miss_count}

    def _generate_cache_key(self, text: str, model: str) -> str:
        """
        Generate cache key for text and model.

        Args:
            text: Text to generate key for
            model: Embedding model name

        Returns:
            Cache key string
        """
        # Create a hash of the text and model to use as cache key
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        return f"{model}_{text_hash}"

    def cache_decorator(self, model: str = "text-embedding-004") -> Callable:
        """
        Create a decorator for caching embeddings.

        Args:
            model: Embedding model name

        Returns:
            Decorator function
        """

        def decorator(func):
            @functools.wraps(func)
            def wrapper(text, *args, **kwargs):
                # Check if model is overridden in kwargs
                actual_model = kwargs.get("model", model)

                # Try to get from cache
                cached_embedding = self.get(text, actual_model)
                if cached_embedding is not None:
                    return cached_embedding

                # Calculate the embedding
                result = func(text, *args, **kwargs)

                # Store in cache
                self.set(text, result, actual_model)

                return result

            return wrapper

        return decorator
