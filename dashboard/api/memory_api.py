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

# Try to import VANA memory modules
try:
    from adk-setup.vana.memory.memory_manager import MemoryManager
    VANA_MODULES_AVAILABLE = True
except ImportError:
    VANA_MODULES_AVAILABLE = False
    logging.warning("VANA memory modules not available. Using mock data.")

logger = logging.getLogger(__name__)

class MemoryAPI:
    """API for retrieving memory usage data."""
    
    def __init__(self, use_mock=False):
        """
        Initialize the Memory API.
        
        Args:
            use_mock (bool): Whether to use mock data instead of real data.
        """
        self.use_mock = use_mock or not VANA_MODULES_AVAILABLE
        
        if not self.use_mock:
            try:
                self.memory_manager = MemoryManager()
                logger.info("Successfully initialized MemoryManager")
            except Exception as e:
                logger.error(f"Failed to initialize MemoryManager: {e}")
                self.use_mock = True
    
    def get_memory_usage(self, time_range="day"):
        """
        Get memory usage data for the specified time range.
        
        Args:
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            
        Returns:
            dict: Memory usage data.
        """
        if self.use_mock:
            return self._get_mock_memory_usage(time_range)
        
        try:
            # TODO: Implement real data retrieval from MemoryManager
            # For now, return mock data
            return self._get_mock_memory_usage(time_range)
        except Exception as e:
            logger.error(f"Error retrieving memory usage data: {e}")
            return self._get_mock_memory_usage(time_range)
    
    def get_memory_operations(self, time_range="day"):
        """
        Get memory operation counts for the specified time range.
        
        Args:
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            
        Returns:
            dict: Memory operation counts.
        """
        if self.use_mock:
            return self._get_mock_memory_operations(time_range)
        
        try:
            # TODO: Implement real data retrieval from MemoryManager
            # For now, return mock data
            return self._get_mock_memory_operations(time_range)
        except Exception as e:
            logger.error(f"Error retrieving memory operation data: {e}")
            return self._get_mock_memory_operations(time_range)
    
    def get_cache_metrics(self):
        """
        Get cache hit/miss metrics.
        
        Returns:
            dict: Cache metrics.
        """
        if self.use_mock:
            return self._get_mock_cache_metrics()
        
        try:
            # TODO: Implement real data retrieval from MemoryManager
            # For now, return mock data
            return self._get_mock_cache_metrics()
        except Exception as e:
            logger.error(f"Error retrieving cache metrics: {e}")
            return self._get_mock_cache_metrics()
    
    def _get_mock_memory_usage(self, time_range="day"):
        """Generate mock memory usage data."""
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
        vector_search_usage = [random.randint(50, 100) for _ in range(data_points)]
        knowledge_graph_usage = [random.randint(30, 80) for _ in range(data_points)]
        local_cache_usage = [random.randint(10, 50) for _ in range(data_points)]
        
        return {
            "timestamps": timestamps,
            "vector_search_usage": vector_search_usage,
            "knowledge_graph_usage": knowledge_graph_usage,
            "local_cache_usage": local_cache_usage
        }
    
    def _get_mock_memory_operations(self, time_range="day"):
        """Generate mock memory operation counts."""
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
        
        # Generate mock data with some randomness
        read_operations = [random.randint(10, 50) for _ in range(data_points)]
        write_operations = [random.randint(5, 30) for _ in range(data_points)]
        delete_operations = [random.randint(0, 10) for _ in range(data_points)]
        
        return {
            "timestamps": timestamps,
            "read_operations": read_operations,
            "write_operations": write_operations,
            "delete_operations": delete_operations
        }
    
    def _get_mock_cache_metrics(self):
        """Generate mock cache metrics."""
        return {
            "hit_count": random.randint(500, 1000),
            "miss_count": random.randint(100, 500),
            "hit_rate": random.uniform(0.6, 0.9),
            "size": random.randint(100, 1000),
            "max_size": 1000
        }

# Create a singleton instance
memory_api = MemoryAPI()
