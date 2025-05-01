"""
System API for VANA Dashboard

This module provides functions to retrieve system health and performance data from the VANA system.
"""

import os
import sys
import logging
import json
from datetime import datetime, timedelta
import random
import psutil

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger(__name__)

class SystemAPI:
    """API for retrieving system health and performance data."""
    
    def __init__(self, use_mock=False):
        """
        Initialize the System API.
        
        Args:
            use_mock (bool): Whether to use mock data instead of real data.
        """
        self.use_mock = use_mock
    
    def get_system_health(self):
        """
        Get current system health metrics.
        
        Returns:
            dict: System health metrics.
        """
        if self.use_mock:
            return self._get_mock_system_health()
        
        try:
            # Get real system metrics using psutil
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "cpu_usage": cpu_percent,
                "memory_usage": memory.percent,
                "memory_available": memory.available,
                "memory_total": memory.total,
                "disk_usage": disk.percent,
                "disk_available": disk.free,
                "disk_total": disk.total,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error retrieving system health: {e}")
            return self._get_mock_system_health()
    
    def get_system_performance(self, time_range="day"):
        """
        Get system performance metrics over time.
        
        Args:
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            
        Returns:
            dict: System performance metrics over time.
        """
        if self.use_mock:
            return self._get_mock_system_performance(time_range)
        
        try:
            # TODO: Implement real data retrieval from system monitoring
            # For now, return mock data
            return self._get_mock_system_performance(time_range)
        except Exception as e:
            logger.error(f"Error retrieving system performance: {e}")
            return self._get_mock_system_performance(time_range)
    
    def get_service_status(self):
        """
        Get the status of all services in the system.
        
        Returns:
            list: List of service status dictionaries.
        """
        if self.use_mock:
            return self._get_mock_service_status()
        
        try:
            # TODO: Implement real data retrieval from service monitoring
            # For now, return mock data
            return self._get_mock_service_status()
        except Exception as e:
            logger.error(f"Error retrieving service status: {e}")
            return self._get_mock_service_status()
    
    def get_error_logs(self, time_range="day", limit=100):
        """
        Get error logs from the system.
        
        Args:
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            limit (int): Maximum number of logs to return.
            
        Returns:
            list: List of error log dictionaries.
        """
        if self.use_mock:
            return self._get_mock_error_logs(time_range, limit)
        
        try:
            # TODO: Implement real data retrieval from log files
            # For now, return mock data
            return self._get_mock_error_logs(time_range, limit)
        except Exception as e:
            logger.error(f"Error retrieving error logs: {e}")
            return self._get_mock_error_logs(time_range, limit)
    
    def _get_mock_system_health(self):
        """Generate mock system health data."""
        return {
            "cpu_usage": random.uniform(10, 90),
            "memory_usage": random.uniform(20, 80),
            "memory_available": random.randint(1000000000, 8000000000),
            "memory_total": 8000000000,
            "disk_usage": random.uniform(10, 70),
            "disk_available": random.randint(10000000000, 100000000000),
            "disk_total": 100000000000,
            "timestamp": datetime.now().isoformat()
        }
    
    def _get_mock_system_performance(self, time_range="day"):
        """Generate mock system performance data over time."""
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
        cpu_usage = [random.uniform(10, 90) for _ in range(data_points)]
        memory_usage = [random.uniform(20, 80) for _ in range(data_points)]
        disk_usage = [random.uniform(10, 70) for _ in range(data_points)]
        network_in = [random.randint(1000, 10000) for _ in range(data_points)]
        network_out = [random.randint(1000, 10000) for _ in range(data_points)]
        
        return {
            "timestamps": timestamps,
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "disk_usage": disk_usage,
            "network_in": network_in,
            "network_out": network_out
        }
    
    def _get_mock_service_status(self):
        """Generate mock service status data."""
        services = [
            {"id": "vana-api", "name": "VANA API", "status": "running"},
            {"id": "vector-search", "name": "Vector Search", "status": "running"},
            {"id": "knowledge-graph", "name": "Knowledge Graph", "status": "running"},
            {"id": "mcp-server", "name": "MCP Server", "status": "running"},
            {"id": "n8n", "name": "n8n Workflow", "status": "running"},
            {"id": "web-search", "name": "Web Search", "status": "running"}
        ]
        
        # Add some random metrics
        for service in services:
            service["uptime"] = random.randint(1, 24)
            service["response_time"] = random.uniform(0.1, 1.0)
            service["error_rate"] = random.uniform(0, 0.05)
            service["last_checked"] = datetime.now().isoformat()
            
            # Randomly set some services to warning or error status
            if random.random() < 0.1:
                service["status"] = "warning"
            elif random.random() < 0.05:
                service["status"] = "error"
        
        return services
    
    def _get_mock_error_logs(self, time_range="day", limit=100):
        """Generate mock error log data."""
        now = datetime.now()
        
        # Define error types
        error_types = [
            "ConnectionError", "TimeoutError", "ValueError", "KeyError", 
            "ImportError", "RuntimeError", "PermissionError"
        ]
        
        # Define components
        components = [
            "vana-api", "vector-search", "knowledge-graph", "mcp-server", 
            "n8n", "web-search", "memory-manager", "task-planner"
        ]
        
        # Generate random error logs
        logs = []
        for _ in range(min(limit, random.randint(5, 30))):
            timestamp = now - timedelta(minutes=random.randint(0, 60 * 24))
            error_type = random.choice(error_types)
            component = random.choice(components)
            
            log = {
                "timestamp": timestamp.isoformat(),
                "level": "ERROR",
                "component": component,
                "message": f"{error_type}: Error in {component} component",
                "details": f"Error details for {error_type} in {component}"
            }
            logs.append(log)
        
        # Sort by timestamp (newest first)
        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return logs

# Create a singleton instance
system_api = SystemAPI()
