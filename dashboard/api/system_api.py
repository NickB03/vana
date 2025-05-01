"""
System API for VANA Dashboard

This module provides functions to retrieve system health and performance data from the VANA system.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
import random
# Try to import psutil, but don't fail if it's not available
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil not available. Using mock data for system metrics.")

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger(__name__)

def get_service_status():
    """
    Get the status of all services in the system.

    Returns:
        list: List of service status dictionaries.
    """
    try:
        # Try to fetch from actual service monitoring
        # For now, return mock data as fallback
        return generate_mock_service_status()
    except Exception as e:
        logging.error(f"Error fetching service status: {e}")
        return generate_mock_service_status()

def generate_mock_service_status():
    """
    Generate mock service status data.

    Returns:
        list: Mock service status data.
    """
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

def get_system_health():
    """
    Returns actual system health data or falls back to mock data.

    Returns:
        dict: System health data.
    """
    if PSUTIL_AVAILABLE:
        try:
            # Try to get actual system health data
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            return {
                "cpu": {
                    "usage_percent": cpu_percent,
                    "core_count": psutil.cpu_count(),
                    "status": "normal" if cpu_percent < 80 else "high"
                },
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "used_gb": round(memory.used / (1024**3), 2),
                    "usage_percent": memory.percent,
                    "status": "normal" if memory.percent < 80 else "high"
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "used_gb": round(disk.used / (1024**3), 2),
                    "usage_percent": disk.percent,
                    "status": "normal" if disk.percent < 80 else "high"
                },
                "services": get_service_status()
            }
        except Exception as e:
            logging.error(f"Error fetching system health data: {e}")
            return generate_mock_system_health()
    else:
        return generate_mock_system_health()

def generate_mock_system_health():
    """
    Generate realistic mock system health data.

    Returns:
        dict: Mock system health data.
    """
    return {
        "cpu": {
            "usage_percent": random.uniform(20, 70),
            "core_count": 8,
            "status": "normal"
        },
        "memory": {
            "total_gb": 16.0,
            "used_gb": random.uniform(4, 12),
            "usage_percent": random.uniform(25, 75),
            "status": "normal"
        },
        "disk": {
            "total_gb": 512.0,
            "used_gb": random.uniform(100, 400),
            "usage_percent": random.uniform(20, 80),
            "status": "normal"
        },
        "services": get_service_status()
    }

def get_system_performance(time_range="day"):
    """
    Get system performance metrics over time.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: System performance metrics over time.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_system_performance(time_range)
    except Exception as e:
        logging.error(f"Error fetching system performance: {e}")
        return generate_mock_system_performance(time_range)

def generate_mock_system_performance(time_range="day"):
    """
    Generate mock system performance data over time.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: Mock system performance data.
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

def get_error_logs(time_range="day", limit=100):
    """
    Get error logs from the system.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").
        limit (int): Maximum number of logs to return.

    Returns:
        list: List of error log dictionaries.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_error_logs(time_range, limit)
    except Exception as e:
        logging.error(f"Error fetching error logs: {e}")
        return generate_mock_error_logs(time_range, limit)

def generate_mock_error_logs(time_range="day", limit=100):
    """
    Generate mock error log data.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").
        limit (int): Maximum number of logs to return.

    Returns:
        list: Mock error log data.
    """
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
