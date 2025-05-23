# Monitoring Dashboard

This document provides an overview of the monitoring dashboard implemented in the VANA project.

## Table of Contents

1. [Overview](#overview)
2. [Components](#components)
3. [Dashboard](#dashboard)
4. [Health Checks](#health-checks)
5. [Metrics Collection](#metrics-collection)
6. [Alerting](#alerting)
7. [Integration](#integration)
8. [Testing](#testing)

## Overview

The VANA project implements a comprehensive monitoring dashboard that provides real-time visibility into the health, performance, and status of all system components. The dashboard includes:

- **Health Checks**: Monitor the health of system components
- **Metrics Collection**: Collect performance metrics from system components
- **Alerting**: Generate and manage alerts for system issues
- **Historical Data**: Track system performance over time
- **Visualization**: Visualize system health and performance

## Components

The monitoring dashboard consists of the following components:

### Dashboard

The `Dashboard` class is the main entry point for the monitoring dashboard. It provides methods for:

- Registering components for monitoring
- Updating the dashboard
- Getting component health
- Getting component metrics
- Getting component alerts
- Getting historical data

```python
from tools.monitoring.dashboard import Dashboard

# Create dashboard
dashboard = Dashboard()

# Register component
dashboard.register_component("mcp_server", mcp_client)

# Update dashboard
dashboard_data = dashboard.update()

# Get component health
health_data = dashboard.get_component_health("mcp_server")

# Get component metrics
metrics_data = dashboard.get_component_metrics("mcp_server")

# Get historical data
historical_data = dashboard.get_historical_data(component_name="mcp_server", limit=10)
```

### Health Check

The `HealthCheck` class provides health check functionality for system components. It includes:

- Component health checks
- Overall system health status
- Health check scheduling
- Health check history

```python
from tools.monitoring.health_check import HealthCheck, HealthStatus

# Create health check
health_check = HealthCheck()

# Register component health check
health_check.register_component(
    "mcp_server",
    lambda: {"status": HealthStatus.OK, "message": "MCP server is healthy"}
)

# Check health
health_data = health_check.check_health()

# Check component health
component_health = health_check.check_component("mcp_server")
```

### Metrics Collector

The `MetricsCollector` class provides metrics collection functionality for system components. It includes:

- Component metrics collection
- System metrics collection
- Metrics scheduling
- Metrics history

```python
from tools.monitoring.metrics import MetricsCollector

# Create metrics collector
metrics_collector = MetricsCollector()

# Register component metrics collector
metrics_collector.register_component(
    "mcp_server",
    lambda: {"request_count": 100, "error_rate": 0.01, "latency": 100.0}
)

# Collect metrics
metrics_data = metrics_collector.collect_metrics()

# Get component metrics
component_metrics = metrics_collector.get_component_metrics("mcp_server")
```

### Alert Manager

The `AlertManager` class provides alert management functionality for system components. It includes:

- Alert generation
- Alert notification
- Alert tracking
- Alert history

```python
from tools.monitoring.alerts import AlertManager, AlertSeverity

# Create alert manager
alert_manager = AlertManager()

# Create alert
alert = alert_manager.create_alert(
    alert_type="component_error",
    component="mcp_server",
    message="MCP server is not responding",
    severity=AlertSeverity.ERROR,
    details={"error": "Connection timeout"}
)

# Update alert
alert_manager.update_alert(
    alert_id=alert["id"],
    status="resolved",
    message="MCP server is now responding"
)

# Get active alerts
active_alerts = alert_manager.get_active_alerts()

# Get alert history
alert_history = alert_manager.get_alert_history(component="mcp_server", limit=10)
```

## Dashboard

The dashboard provides a centralized view of system health, performance, and status. It includes:

### Dashboard Data

The dashboard data includes:

- **Timestamp**: When the dashboard was last updated
- **Health**: Health status of all system components
- **Metrics**: Performance metrics for all system components
- **Alerts**: Active alerts for all system components

```json
{
  "timestamp": "2023-05-01T12:00:00.000Z",
  "health": {
    "status": "ok",
    "components": {
      "mcp_server": {
        "status": "ok",
        "message": "MCP server is healthy",
        "timestamp": "2023-05-01T12:00:00.000Z",
        "details": {
          "error_rate": 0.01,
          "latency": 100.0,
          "request_count": 100
        }
      }
    }
  },
  "metrics": {
    "system": {
      "timestamp": "2023-05-01T12:00:00.000Z",
      "cpu": {
        "percent": 10.0,
        "count": 8
      },
      "memory": {
        "total_gb": 16.0,
        "used_gb": 8.0,
        "percent": 50.0
      },
      "disk": {
        "total_gb": 500.0,
        "used_gb": 250.0,
        "percent": 50.0
      },
      "process": {
        "cpu_percent": 5.0,
        "memory_mb": 100.0,
        "threads": 10
      }
    },
    "mcp_server": {
      "timestamp": "2023-05-01T12:00:00.000Z",
      "request_count": 100,
      "error_rate": 0.01,
      "latency": 100.0
    }
  },
  "alerts": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "component_warning",
      "component": "mcp_server",
      "message": "MCP server latency is high",
      "severity": "warning",
      "details": {
        "latency": 200.0,
        "threshold": 100.0
      },
      "created_at": "2023-05-01T11:00:00.000Z",
      "updated_at": "2023-05-01T11:00:00.000Z",
      "status": "active"
    }
  ]
}
```

### Historical Data

The dashboard also provides historical data for system components. This data can be used to:

- Track system performance over time
- Identify trends and patterns
- Troubleshoot issues
- Plan capacity

```python
# Get historical data for all components
historical_data = dashboard.get_historical_data(limit=10)

# Get historical data for a specific component
component_data = dashboard.get_historical_data(component_name="mcp_server", limit=10)

# Get historical data for a specific metric
metric_data = dashboard.get_historical_data(
    component_name="mcp_server",
    metric_name="latency",
    limit=10
)

# Get historical data for a specific time range
time_data = dashboard.get_historical_data(
    start_time="2023-05-01T00:00:00.000Z",
    end_time="2023-05-01T23:59:59.999Z",
    limit=100
)
```

## Health Checks

The health check system monitors the health of system components. It includes:

### Health Status

The health status can be one of:

- **OK**: The component is healthy
- **WARNING**: The component has issues but is still functioning
- **ERROR**: The component is not functioning
- **UNKNOWN**: The component's health status is unknown

### Component Health Checks

Each component can register a health check function that returns:

- **Status**: The health status of the component
- **Message**: A message describing the health status
- **Timestamp**: When the health check was performed
- **Details**: Additional details about the health status

```python
def check_mcp_server():
    """Check the health of the MCP server."""
    try:
        # Check if the MCP server is available
        if not mcp_client.is_available:
            return {
                "status": HealthStatus.ERROR,
                "message": "MCP server is not available",
                "timestamp": datetime.now().isoformat(),
                "details": {
                    "last_error": mcp_client.last_error
                }
            }
        
        # Check if the MCP server is responding
        response = mcp_client.ping()
        
        if response.get("success", False):
            return {
                "status": HealthStatus.OK,
                "message": "MCP server is healthy",
                "timestamp": datetime.now().isoformat(),
                "details": {
                    "response_time": response.get("response_time", 0)
                }
            }
        else:
            return {
                "status": HealthStatus.WARNING,
                "message": "MCP server is responding but with errors",
                "timestamp": datetime.now().isoformat(),
                "details": {
                    "error": response.get("error", "Unknown error")
                }
            }
    except Exception as e:
        return {
            "status": HealthStatus.ERROR,
            "message": f"Error checking MCP server health: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "details": {
                "error": str(e)
            }
        }
```

### System Health

The overall system health is determined by the health of all components:

- If any component has an **ERROR** status, the system health is **ERROR**
- If any component has a **WARNING** status and no component has an **ERROR** status, the system health is **WARNING**
- If all components have an **OK** status, the system health is **OK**
- If any component has an **UNKNOWN** status and no component has an **ERROR** or **WARNING** status, the system health is **UNKNOWN**

## Metrics Collection

The metrics collection system collects performance metrics from system components. It includes:

### System Metrics

The system metrics include:

- **CPU**: CPU usage and count
- **Memory**: Memory usage and total
- **Disk**: Disk usage and total
- **Process**: Process CPU usage, memory usage, and thread count

### Component Metrics

Each component can register a metrics collection function that returns:

- **Timestamp**: When the metrics were collected
- **Component-specific metrics**: Metrics specific to the component

```python
def collect_mcp_server_metrics():
    """Collect metrics for the MCP server."""
    try:
        # Get metrics from MCP server
        metrics = mcp_client.get_metrics()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "request_count": metrics.get("request_count", 0),
            "error_rate": metrics.get("error_rate", 0.0),
            "latency": metrics.get("latency", 0.0),
            "active_connections": metrics.get("active_connections", 0)
        }
    except Exception as e:
        return {
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
```

### Performance Measurement

The metrics collection system also includes a decorator for measuring function performance:

```python
from tools.monitoring.metrics import measure_performance

@measure_performance
def search_knowledge(query):
    """Search for knowledge."""
    # Implementation
    return results
```

This decorator measures:

- **Latency**: How long the function takes to execute
- **Memory Delta**: How much memory the function uses
- **Success**: Whether the function succeeds or fails

## Alerting

The alerting system generates and manages alerts for system issues. It includes:

### Alert Severity

The alert severity can be one of:

- **INFO**: Informational alert
- **WARNING**: Warning alert
- **ERROR**: Error alert
- **CRITICAL**: Critical alert

### Alert Types

The alert types include:

- **component_error**: Error in a component
- **component_warning**: Warning in a component
- **component_recovery**: Recovery of a component
- **system_error**: Error in the system
- **system_warning**: Warning in the system
- **system_recovery**: Recovery of the system

### Alert Handlers

Each alert type can register a handler function that is called when an alert of that type is generated:

```python
def handle_component_error(alert):
    """Handle a component error alert."""
    # Send email notification
    send_email(
        to="admin@example.com",
        subject=f"VANA Alert: {alert['message']}",
        body=f"Component: {alert['component']}\nSeverity: {alert['severity']}\nMessage: {alert['message']}\nDetails: {alert['details']}"
    )
    
    # Send Slack notification
    send_slack_message(
        channel="#vana-alerts",
        message=f"VANA Alert: {alert['message']} (Component: {alert['component']}, Severity: {alert['severity']})"
    )

# Register alert handler
alert_manager.register_handler("component_error", handle_component_error)
```

### Alert Lifecycle

The alert lifecycle includes:

- **Creation**: An alert is created when an issue is detected
- **Update**: An alert is updated when the issue changes
- **Resolution**: An alert is resolved when the issue is fixed

```python
# Create alert
alert = alert_manager.create_alert(
    alert_type="component_error",
    component="mcp_server",
    message="MCP server is not responding",
    severity=AlertSeverity.ERROR,
    details={"error": "Connection timeout"}
)

# Update alert
alert_manager.update_alert(
    alert_id=alert["id"],
    status="active",
    message="MCP server is still not responding",
    details={"error": "Connection timeout", "attempts": 3}
)

# Resolve alert
alert_manager.update_alert(
    alert_id=alert["id"],
    status="resolved",
    message="MCP server is now responding"
)
```

## Integration

The monitoring dashboard is integrated with the VANA project in the following ways:

### Memory System Integration

The memory system components are integrated with the monitoring dashboard:

```python
from tools.monitoring.dashboard import Dashboard
from tools.monitoring.health_check import HealthCheck, HealthStatus
from tools.monitoring.metrics import MetricsCollector
from tools.monitoring.alerts import AlertManager, AlertSeverity

# Create dashboard
dashboard = Dashboard()

# Register memory system components
dashboard.register_component("mcp_server", mcp_client)
dashboard.register_component("memory_manager", memory_manager)
dashboard.register_component("vector_search", vector_search_client)
dashboard.register_component("hybrid_search", hybrid_search)
dashboard.register_component("web_search", web_search_client)

# Update dashboard
dashboard_data = dashboard.update()
```

### Agent Integration

The agent components are integrated with the monitoring dashboard:

```python
from tools.monitoring.dashboard import Dashboard
from tools.monitoring.health_check import HealthCheck, HealthStatus
from tools.monitoring.metrics import MetricsCollector
from tools.monitoring.alerts import AlertManager, AlertSeverity

# Create dashboard
dashboard = Dashboard()

# Register agent components
dashboard.register_component("vana", vana_agent)
dashboard.register_component("rhea", rhea_agent)
dashboard.register_component("max", max_agent)
dashboard.register_component("sage", sage_agent)
dashboard.register_component("kai", kai_agent)
dashboard.register_component("juno", juno_agent)

# Update dashboard
dashboard_data = dashboard.update()
```

### Web Interface

The monitoring dashboard can be accessed through a web interface:

```python
from flask import Flask, jsonify
from tools.monitoring.dashboard import Dashboard

app = Flask(__name__)
dashboard = Dashboard()

@app.route('/dashboard')
def get_dashboard():
    """Get the dashboard data."""
    return jsonify(dashboard.update())

@app.route('/dashboard/health')
def get_health():
    """Get the health data."""
    return jsonify(dashboard.update()["health"])

@app.route('/dashboard/metrics')
def get_metrics():
    """Get the metrics data."""
    return jsonify(dashboard.update()["metrics"])

@app.route('/dashboard/alerts')
def get_alerts():
    """Get the alerts data."""
    return jsonify(dashboard.update()["alerts"])

@app.route('/dashboard/history')
def get_history():
    """Get the historical data."""
    return jsonify(dashboard.get_historical_data(limit=100))

if __name__ == '__main__':
    app.run(debug=True)
```

## Testing

The monitoring dashboard can be tested using the provided scripts:

### Test Monitoring Dashboard

The `test_monitoring_dashboard.py` script tests the monitoring dashboard:

```bash
python scripts/test_monitoring_dashboard.py
```

This script tests:

- Dashboard creation and update
- Component health checks
- Component metrics collection
- Alert generation and management
- Historical data collection

### Test Memory System Monitoring

The `test_memory_system_monitoring.py` script tests the memory system monitoring:

```bash
python scripts/test_memory_system_monitoring.py
```

This script tests:

- MCP server health checks
- Memory manager health checks
- Vector search health checks
- Hybrid search health checks
- Web search health checks

### Test Agent Monitoring

The `test_agent_monitoring.py` script tests the agent monitoring:

```bash
python scripts/test_agent_monitoring.py
```

This script tests:

- Vana agent health checks
- Rhea agent health checks
- Max agent health checks
- Sage agent health checks
- Kai agent health checks
- Juno agent health checks
