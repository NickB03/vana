"""
Memory API for VANA Dashboard

This module provides functions to retrieve memory usage data from the VANA system.
"""

import os
import sys
import logging
import json
from datetime import datetime, timedelta
import random

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger(__name__)

def get_memory_usage():
    """
    Returns actual memory usage data or falls back to mock data.

    Returns:
        dict: Memory usage data.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_memory_data()
    except Exception as e:
        logging.error(f"Error fetching memory data: {e}")
        return generate_mock_memory_data()

def generate_mock_memory_data():
    """
    Generate realistic mock memory usage data.

    Returns:
        dict: Mock memory usage data.
    """
    return {
        "vector_search": {
            "total_entries": 1250,
            "size_mb": 45.8,
            "query_count_24h": 324,
            "average_latency_ms": 85.2
        },
        "knowledge_graph": {
            "entity_count": 3450,
            "relationship_count": 8920,
            "size_mb": 32.4,
            "query_count_24h": 156
        },
        "cache": {
            "entries": 512,
            "hit_rate": 0.78,
            "size_mb": 12.6
        }
    }

def get_memory_operations():
    """
    Get memory operation counts.

    Returns:
        dict: Memory operation counts.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_memory_operations()
    except Exception as e:
        logging.error(f"Error fetching memory operations: {e}")
        return generate_mock_memory_operations()

def generate_mock_memory_operations():
    """
    Generate realistic mock memory operation data.

    Returns:
        dict: Mock memory operation data.
    """
    return {
        "operations": {
            "read": 1245,
            "write": 328,
            "update": 156,
            "delete": 42
        },
        "components": {
            "vector_search": 845,
            "knowledge_graph": 624,
            "cache": 302
        },
        "status": {
            "success": 1689,
            "failure": 82
        }
    }

def get_memory_usage_over_time(time_range="day"):
    """
    Get memory usage data over time.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: Memory usage data over time.
    """
    now = datetime.now()
    data_points = {
        "hour": 60,
        "day": 24,
        "week": 7,
        "month": 30
    }.get(time_range, 24)

    time_delta = {
        "hour": timedelta(minutes=1),
        "day": timedelta(hours=1),
        "week": timedelta(days=1),
        "month": timedelta(days=1)
    }.get(time_range, timedelta(hours=1))

    timestamps = [(now - time_delta * i).isoformat() for i in range(data_points)]
    timestamps.reverse()

    # Generate mock data with some randomness but a general trend
    vector_search_usage = [random.randint(30, 60) for _ in range(data_points)]
    knowledge_graph_usage = [random.randint(20, 40) for _ in range(data_points)]
    cache_usage = [random.randint(5, 15) for _ in range(data_points)]

    return {
        "timestamps": timestamps,
        "vector_search_usage": vector_search_usage,
        "knowledge_graph_usage": knowledge_graph_usage,
        "cache_usage": cache_usage
    }

def get_cache_metrics():
    """
    Get cache hit/miss metrics.

    Returns:
        dict: Cache metrics.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_cache_metrics()
    except Exception as e:
        logging.error(f"Error fetching cache metrics: {e}")
        return generate_mock_cache_metrics()

def generate_mock_cache_metrics():
    """
    Generate mock cache metrics.

    Returns:
        dict: Mock cache metrics.
    """
    return {
        "hit_count": random.randint(500, 1000),
        "miss_count": random.randint(100, 500),
        "hit_rate": random.uniform(0.6, 0.9),
        "size": random.randint(100, 1000),
        "max_size": 1000
    }
