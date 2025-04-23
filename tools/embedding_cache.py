#!/usr/bin/env python3
"""
Embedding Cache

This module provides a simple in-memory cache for embeddings to improve performance.
"""

import logging
import functools

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Simple in-memory cache
_embedding_cache = {}

def cache_embedding(func):
    """Decorator to cache embeddings."""
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
    """Clear the embedding cache."""
    global _embedding_cache
    cache_size = len(_embedding_cache)
    _embedding_cache = {}
    logger.info(f"Cleared embedding cache ({cache_size} entries)")
