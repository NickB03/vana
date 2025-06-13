"""
System API for VANA Dashboard

This module provides functions to retrieve system health and performance data from the VANA system.
"""

import datetime
import logging
import os
import platform
import random
import sys

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
        {"id": "web-search", "name": "Web Search", "status": "running"},
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
    Retrieve system health data.
    Returns real data if possible, falls back to mock data for development.
    """
    try:
        # Try to get real system metrics
        return get_real_system_health()
    except Exception as e:
        logging.error(f"Error getting real system health: {e}")
        # Fall back to mock data
        return generate_mock_system_health()


def get_real_system_health():
    """Get real system health metrics using psutil."""
    if not PSUTIL_AVAILABLE:
        raise ImportError("psutil not available")

    # Get CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()

    # Get memory usage
    memory = psutil.virtual_memory()

    # Get disk usage
    disk = psutil.disk_usage("/")

    # Get network stats (as counters, not rates)
    net = psutil.net_io_counters()

    # Get system information
    system_info = {
        "os": platform.system(),
        "version": platform.version(),
        "architecture": platform.architecture()[0],
        "processor": platform.processor(),
        "hostname": platform.node(),
        "uptime": datetime.datetime.now() - datetime.datetime.fromtimestamp(psutil.boot_time()),
    }

    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "cpu": {
            "usage_percent": cpu_percent,
            "count": cpu_count,
            "load_avg": psutil.getloadavg() if hasattr(psutil, "getloadavg") else [0, 0, 0],
        },
        "memory": {
            "total_mb": memory.total / (1024 * 1024),
            "available_mb": memory.available / (1024 * 1024),
            "used_mb": memory.used / (1024 * 1024),
            "percent": memory.percent,
        },
        "disk": {
            "total_gb": disk.total / (1024**3),
            "free_gb": disk.free / (1024**3),
            "used_gb": disk.used / (1024**3),
            "percent": disk.percent,
        },
        "network": {
            "bytes_sent": net.bytes_sent,
            "bytes_recv": net.bytes_recv,
            "packets_sent": net.packets_sent,
            "packets_recv": net.packets_recv,
            "err_in": net.errin,
            "err_out": net.errout,
            "drop_in": net.dropin,
            "drop_out": net.dropout,
        },
        "system_info": system_info,
    }


def generate_mock_system_health():
    """Generate realistic mock system health data."""
    # Create timestamp
    timestamp = datetime.datetime.now()

    # CPU metrics
    cpu_count = 8
    cpu_percent = random.uniform(20, 80)

    # Memory metrics
    memory_total = 16 * 1024  # 16 GB in MB
    memory_percent = random.uniform(40, 85)
    memory_used = memory_total * (memory_percent / 100)
    memory_available = memory_total - memory_used

    # Disk metrics
    disk_total = 512  # 512 GB
    disk_percent = random.uniform(30, 70)
    disk_used = disk_total * (disk_percent / 100)
    disk_free = disk_total - disk_used

    # Network metrics
    bytes_sent = random.randint(1000000, 5000000)
    bytes_recv = random.randint(5000000, 20000000)
    packets_sent = random.randint(10000, 50000)
    packets_recv = random.randint(50000, 200000)

    # System info
    system_info = {
        "os": "Linux",
        "version": "Ubuntu 22.04 LTS",
        "architecture": "64-bit",
        "processor": "Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz",
        "hostname": "vana-server",
        "uptime": datetime.timedelta(
            days=random.randint(1, 30), hours=random.randint(0, 23), minutes=random.randint(0, 59)
        ),
    }

    return {
        "timestamp": timestamp.isoformat(),
        "cpu": {
            "usage_percent": cpu_percent,
            "count": cpu_count,
            "load_avg": [round(random.uniform(0, 4), 2) for _ in range(3)],
        },
        "memory": {
            "total_mb": memory_total,
            "available_mb": memory_available,
            "used_mb": memory_used,
            "percent": memory_percent,
        },
        "disk": {"total_gb": disk_total, "free_gb": disk_free, "used_gb": disk_used, "percent": disk_percent},
        "network": {
            "bytes_sent": bytes_sent,
            "bytes_recv": bytes_recv,
            "packets_sent": packets_sent,
            "packets_recv": packets_recv,
            "err_in": random.randint(0, 10),
            "err_out": random.randint(0, 5),
            "drop_in": random.randint(0, 20),
            "drop_out": random.randint(0, 10),
        },
        "system_info": system_info,
    }


def get_system_health_history(hours=24):
    """
    Get historical system health data.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_system_health_history(hours)
    except Exception as e:
        logging.error(f"Error fetching system health history: {e}")
        return generate_mock_system_health_history(hours)


def generate_mock_system_health_history(hours=24):
    """Generate realistic mock historical system health data."""
    current_time = datetime.datetime.now()
    history = []

    # Starting values
    cpu_base = 40
    memory_base = 60
    disk_base = 50
    network_send_base = 2000000  # 2 MB
    network_recv_base = 8000000  # 8 MB

    # Generate data points for each hour
    for hour in range(hours, 0, -1):
        timestamp = current_time - datetime.timedelta(hours=hour)

        # Add time-of-day pattern - higher usage during business hours
        hour_of_day = timestamp.hour
        time_factor = 1.0
        if 9 <= hour_of_day <= 17:  # 9 AM to 5 PM
            time_factor = 1.3
        elif 18 <= hour_of_day <= 21:  # 6 PM to 9 PM
            time_factor = 1.1
        elif 0 <= hour_of_day <= 5:  # Midnight to 5 AM
            time_factor = 0.7

        # Add some random variation
        cpu_percent = min(95, max(5, cpu_base * time_factor + random.uniform(-15, 15)))
        memory_percent = min(95, max(30, memory_base * time_factor + random.uniform(-10, 10)))
        disk_percent = min(90, max(40, disk_base + random.uniform(-2, 2)))  # Disk usage changes slowly

        # Network traffic with time pattern
        network_send = network_send_base * time_factor * random.uniform(0.8, 1.2)
        network_recv = network_recv_base * time_factor * random.uniform(0.8, 1.2)

        # Create data point
        data_point = {
            "timestamp": timestamp.isoformat(),
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "disk_percent": disk_percent,
            "network_send_bytes": network_send,
            "network_recv_bytes": network_recv,
        }

        history.append(data_point)

    return history


def get_system_alerts(limit=10):
    """
    Get recent system alerts.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_system_alerts(limit)
    except Exception as e:
        logging.error(f"Error fetching system alerts: {e}")
        return generate_mock_system_alerts(limit)


def generate_mock_system_alerts(limit=10):
    """Generate realistic mock system alerts."""
    current_time = datetime.datetime.now()

    # Alert templates
    alert_templates = [
        {"type": "cpu", "level": "warning", "message": "CPU usage above {threshold}% for {duration} minutes"},
        {"type": "cpu", "level": "critical", "message": "CPU usage critically high at {value}%"},
        {"type": "memory", "level": "warning", "message": "Memory usage above {threshold}% for {duration} minutes"},
        {"type": "memory", "level": "critical", "message": "Memory usage critically high at {value}%"},
        {"type": "disk", "level": "warning", "message": "Disk usage above {threshold}%"},
        {"type": "disk", "level": "critical", "message": "Disk space critically low ({free_gb} GB free)"},
        {"type": "network", "level": "warning", "message": "Network packet loss detected ({loss_rate}%)"},
        {"type": "system", "level": "info", "message": "System updated to version {version}"},
        {"type": "system", "level": "warning", "message": "System restart required for updates"},
        {"type": "application", "level": "error", "message": "Application crashed: {error_message}"},
    ]

    # Generate alerts
    alerts = []
    for i in range(limit):
        minutes_ago = random.randint(5, 60 * 24)  # Within last 24 hours
        timestamp = current_time - datetime.timedelta(minutes=minutes_ago)

        # Select alert template
        template = random.choice(alert_templates)
        alert_type = template["type"]
        level = template["level"]
        message_template = template["message"]

        # Fill in template values
        message_params = {}
        if "threshold" in message_template:
            message_params["threshold"] = random.randint(80, 95)
        if "duration" in message_template:
            message_params["duration"] = random.randint(5, 30)
        if "value" in message_template:
            message_params["value"] = random.randint(90, 99)
        if "free_gb" in message_template:
            message_params["free_gb"] = random.randint(1, 10)
        if "loss_rate" in message_template:
            message_params["loss_rate"] = random.uniform(1, 5)
        if "version" in message_template:
            message_params["version"] = f"1.{random.randint(0, 9)}.{random.randint(0, 99)}"
        if "error_message" in message_template:
            error_messages = [
                "OutOfMemoryError",
                "NullPointerException",
                "DatabaseConnectionError",
                "Segmentation fault",
                "Timeout waiting for response",
            ]
            message_params["error_message"] = random.choice(error_messages)

        message = message_template.format(**message_params)

        # Create alert object
        alert = {
            "id": f"alert-{i+1}",
            "timestamp": timestamp.isoformat(),
            "type": alert_type,
            "level": level,
            "message": message,
            "acknowledged": random.random() > 0.3,  # 70% are acknowledged
        }

        alerts.append(alert)

    # Sort by timestamp (most recent first)
    alerts.sort(key=lambda a: a["timestamp"], reverse=True)

    return alerts


# Create a simple API object for compatibility
class SystemAPI:
    """System API class for dashboard integration."""

    def get_health(self):
        return get_system_health()

    def get_health_history(self, hours=24):
        return get_system_health_history(hours)

    def get_alerts(self, limit=10):
        return get_system_alerts(limit)


# Create the API instance
system_api = SystemAPI()
