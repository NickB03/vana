# Extending the Monitoring System

[Home](../index.md) > [Development](index.md) > Extending the Monitoring System

This document provides guidance on extending the Vector Search Health Monitoring System, including adding new metrics, checks, and integrations.

## Overview

The Vector Search Health Monitoring System is designed to be extensible, allowing you to add new metrics, checks, and integrations to meet your specific needs. This guide will walk you through the process of extending the system.

## Architecture Overview

Before extending the system, it's important to understand its architecture:

1. **Vector Search Health Checker** (`tools/vector_search/health_checker.py`)
   - Core health checking functionality
   - Performs checks and collects metrics
   - Generates recommendations

2. **Circuit Breaker** (`tools/monitoring/circuit_breaker.py`)
   - Prevents cascading failures
   - Manages failure thresholds and recovery

3. **Scheduled Monitoring** (`scripts/scheduled_vector_search_monitor.py`)
   - Runs health checks on a schedule
   - Stores historical data
   - Generates alerts

4. **Dashboard Integration** (`dashboard/monitoring/vector_search_monitor.py`)
   - Provides data for the dashboard
   - Formats metrics for visualization

## Adding New Health Checks

### Step 1: Understand the Health Checker Structure

The `VectorSearchHealthChecker` class in `tools/vector_search/health_checker.py` is responsible for performing health checks. It has the following structure:

```python
class VectorSearchHealthChecker:
    def __init__(self, vector_search_client=None, history_size=10):
        # Initialize the health checker

    def check_health(self) -> Dict[str, Any]:
        # Perform health check

    def _check_environment(self) -> Dict[str, Any]:
        # Check environment variables

    def _check_authentication(self, client) -> Dict[str, Any]:
        # Check authentication status

    def _check_embedding(self, client) -> Dict[str, Any]:
        # Check embedding generation

    def _check_search(self, client) -> Dict[str, Any]:
        # Check search functionality
```

### Step 2: Create a New Check Method

To add a new health check, create a new method in the `VectorSearchHealthChecker` class:

```python
def _check_custom_feature(self, client) -> Dict[str, Any]:
    """
    Check custom feature functionality

    Args:
        client: Vector Search client instance

    Returns:
        Dictionary with check results
    """
    try:
        # Perform the check
        start_time = time.time()
        result = client.custom_feature()
        duration = time.time() - start_time

        # Analyze the result
        if result:
            return {
                "status": "ok",
                "details": {
                    "response_time": duration,
                    "custom_metric": result.get("metric")
                }
            }
        else:
            return {
                "status": "warn",
                "details": {
                    "response_time": duration,
                    "message": "Custom feature returned empty result"
                }
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
```

### Step 3: Add the Check to the Main Health Check Method

Update the `check_health` method to include your new check:

```python
def check_health(self) -> Dict[str, Any]:
    # ... existing code ...

    # Implement specific checks
    result["checks"] = {
        "environment": self._check_environment(),
        "authentication": self._check_authentication(client),
        "embedding": self._check_embedding(client),
        "search": self._check_search(client),
        "custom_feature": self._check_custom_feature(client)  # Add your new check
    }

    # ... existing code ...
```

### Step 4: Add Recommendations for the New Check

Update the `get_recommendations` method to include recommendations for your new check:

```python
def get_recommendations(self, health_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    # ... existing code ...

    # Check custom feature
    custom_check = checks.get("custom_feature", {})
    if custom_check.get("status") != "ok":
        recommendations.append({
            "priority": "medium",
            "category": "functionality",
            "title": "Custom feature not working",
            "action": "Check the custom feature configuration and permissions."
        })

    # ... existing code ...
```

## Adding New Metrics

### Step 1: Collect the Metric

Collect the new metric in your check method:

```python
def _check_custom_feature(self, client) -> Dict[str, Any]:
    # ... existing code ...

    # Collect custom metric
    custom_metric = result.get("metric", 0)

    return {
        "status": "ok",
        "details": {
            "response_time": duration,
            "custom_metric": custom_metric
        }
    }
```

### Step 2: Add the Metric to the Health Check Result

Update the `check_health` method to include your new metric:

```python
def check_health(self) -> Dict[str, Any]:
    # ... existing code ...

    # Calculate metrics
    duration = time.time() - start_time
    custom_metric = result["checks"].get("custom_feature", {}).get("details", {}).get("custom_metric", 0)

    result["metrics"] = {
        "response_time": duration,
        "success_rate": self._calculate_success_rate(result["checks"]),
        "custom_metric": custom_metric  # Add your new metric
    }

    # ... existing code ...
```

### Step 3: Add Trend Analysis for the New Metric

Update the `_calculate_trends` method in the dashboard integration:

```python
def _calculate_trends(self) -> Dict[str, Any]:
    # ... existing code ...

    # Extract metrics over time
    custom_metrics = [check.get("metrics", {}).get("custom_metric", 0) for check in self.history_cache]

    # Calculate trends
    trends["custom_metric"] = {
        "current": custom_metrics[0] if custom_metrics else 0,
        "previous": custom_metrics[1] if len(custom_metrics) > 1 else 0,
        "trend": "improving" if custom_metrics[0] > custom_metrics[1] else "degrading" if custom_metrics[0] < custom_metrics[1] else "stable" if len(custom_metrics) > 1 else "unknown"
    }

    # ... existing code ...
```

## Implementing the Circuit Breaker Pattern

The Circuit Breaker pattern is implemented in `tools/monitoring/circuit_breaker.py`. You can use it to protect any function from cascading failures:

### Basic Usage

```python
from tools.monitoring.circuit_breaker import CircuitBreaker

@CircuitBreaker(failure_threshold=3, recovery_timeout=60)
def my_function():
    # Function implementation
```

### Advanced Usage

```python
from tools.monitoring.circuit_breaker import CircuitBreaker

# Create circuit breaker
cb = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=60,
    fallback_function=lambda *args, **kwargs: "Fallback result",
    name="my-circuit-breaker"
)

# Use circuit breaker
def my_function():
    # Function implementation

try:
    result = cb.call(my_function)
except Exception as e:
    # Handle exception
```

### Custom Fallback Function

```python
def fallback_function(*args, **kwargs):
    # Implement fallback logic
    return "Fallback result"

cb = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=60,
    fallback_function=fallback_function,
    name="my-circuit-breaker"
)
```

## Adding Dashboard Visualizations

### Step 1: Add the Metric to the Dashboard Data

Update the `get_dashboard_metrics` method in `dashboard/monitoring/vector_search_monitor.py`:

```python
def get_dashboard_metrics(self) -> Dict[str, Any]:
    # ... existing code ...

    # Extract metrics from last check
    metrics = {
        "status": self.last_check_result.get("status", "unknown"),
        "last_check_time": self.last_check_time.isoformat() if self.last_check_time else None,
        "response_time": self.last_check_result.get("metrics", {}).get("response_time", 0),
        "success_rate": self.last_check_result.get("metrics", {}).get("success_rate", 0),
        "custom_metric": self.last_check_result.get("metrics", {}).get("custom_metric", 0),  # Add your new metric
        "checks": self.last_check_result.get("checks", {}),
        "issues_count": len(self.last_check_result.get("issues", [])),
        "history_count": len(self.history_cache)
    }

    # ... existing code ...
```

### Step 2: Add the Metric to the Historical Data

Update the `get_historical_data` method:

```python
def get_historical_data(self, days: int = 7) -> Dict[str, Any]:
    # ... existing code ...

    # Extract metrics over time
    timestamps = []
    response_times = []
    success_rates = []
    custom_metrics = []  # Add your new metric

    for entry in filtered_history:
        try:
            timestamp = datetime.fromisoformat(entry.get("timestamp", ""))
            timestamps.append(timestamp.isoformat())

            metrics = entry.get("metrics", {})
            response_times.append(metrics.get("response_time", 0))
            success_rates.append(metrics.get("success_rate", 0))
            custom_metrics.append(metrics.get("custom_metric", 0))  # Add your new metric
        except (ValueError, TypeError):
            # Skip entries with invalid timestamps
            continue

    # Create historical data
    historical_data = {
        "days": days,
        "total_checks": len(filtered_history),
        "status_counts": status_counts,
        "timestamps": timestamps,
        "response_times": response_times,
        "success_rates": success_rates,
        "custom_metrics": custom_metrics,  # Add your new metric
        "health_percentage": (status_counts.get("ok", 0) / len(filtered_history)) * 100 if filtered_history else 0
    }

    # ... existing code ...
```

### Step 3: Add the Visualization to the Dashboard Template

Update the `vector_search_health.html` template to include your new visualization:

```html
<!-- Custom Metric Chart -->
<div class="col-md-6">
    <div class="card metric-card">
        <div class="card-body">
            <h5 class="card-title">Custom Metric</h5>
            <div class="chart-container">
                <canvas id="custom-metric-chart"></canvas>
            </div>
        </div>
    </div>
</div>
```

### Step 4: Add the JavaScript for the Visualization

Add the JavaScript code to initialize the chart:

```javascript
// Custom Metric Chart
new Chart(document.getElementById('custom-metric-chart'), {
    type: 'line',
    data: {
        labels: {{ timestamps|safe }},
        datasets: [{
            label: 'Custom Metric',
            data: {{ custom_metrics|safe }},
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});
```

## Adding External Integrations

### Step 1: Create an Integration Module

Create a new module for your integration:

```python
# tools/integrations/my_integration.py

import logging
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MyIntegration:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    def send_alert(self, alert_data: Dict[str, Any]) -> bool:
        """
        Send an alert to the external system

        Args:
            alert_data: Alert data

        Returns:
            True if successful, False otherwise
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/alerts",
                json=alert_data,
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            logger.info(f"Alert sent to external system: {response.json()}")
            return True
        except Exception as e:
            logger.error(f"Failed to send alert to external system: {e}")
            return False
```

### Step 2: Update the Alert Mechanism

Update the `trigger_alert` function in `scripts/scheduled_vector_search_monitor.py`:

```python
def trigger_alert(result, checker, alert_method="log", integrations=None):
    # ... existing code ...

    # Send alert to external integrations
    if integrations:
        for integration in integrations:
            try:
                integration.send_alert({
                    "status": status,
                    "timestamp": timestamp,
                    "message": alert_message,
                    "details": result
                })
            except Exception as e:
                logger.error(f"Error sending alert to integration: {e}")
```

### Step 3: Initialize the Integration

Update the `main` function to initialize your integration:

```python
def main():
    # ... existing code ...

    # Initialize integrations
    integrations = []
    if os.environ.get("MY_INTEGRATION_API_KEY") and os.environ.get("MY_INTEGRATION_BASE_URL"):
        from tools.integrations.my_integration import MyIntegration
        integrations.append(MyIntegration(
            api_key=os.environ.get("MY_INTEGRATION_API_KEY"),
            base_url=os.environ.get("MY_INTEGRATION_BASE_URL")
        ))

    # ... existing code ...

    # Run health check
    result = run_health_check(
        store_history=not args.no_store,
        history_dir=args.history_dir,
        alert_level=args.alert_level,
        alert_method=args.alert_method,
        degraded_mode=args.degraded_mode,
        integrations=integrations  # Pass integrations
    )

    # ... existing code ...
```

## Testing Your Extensions

### Unit Testing

Create unit tests for your extensions:

```python
# tests/test_custom_check.py

import unittest
from unittest.mock import MagicMock, patch
from tools.vector_search.health_checker import VectorSearchHealthChecker

class TestCustomCheck(unittest.TestCase):
    def test_check_custom_feature(self):
        # Create mock client
        mock_client = MagicMock()
        mock_client.custom_feature.return_value = {"metric": 42}

        # Create health checker
        checker = VectorSearchHealthChecker(vector_search_client=mock_client)

        # Call the check method
        result = checker._check_custom_feature(mock_client)

        # Verify the result
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["details"]["custom_metric"], 42)

    def test_check_custom_feature_error(self):
        # Create mock client
        mock_client = MagicMock()
        mock_client.custom_feature.side_effect = Exception("Test error")

        # Create health checker
        checker = VectorSearchHealthChecker(vector_search_client=mock_client)

        # Call the check method
        result = checker._check_custom_feature(mock_client)

        # Verify the result
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"], "Test error")
```

### Integration Testing

Create integration tests for your extensions:

```python
# tests/test_integration.py

import unittest
import os
import time
from tools.vector_search.health_checker import VectorSearchHealthChecker
from tools.integrations.my_integration import MyIntegration

class TestIntegration(unittest.TestCase):
    def setUp(self):
        # Set up test environment
        os.environ["MY_INTEGRATION_API_KEY"] = "test-api-key"
        os.environ["MY_INTEGRATION_BASE_URL"] = "http://localhost:8080"

        # Create health checker
        self.checker = VectorSearchHealthChecker()

        # Create integration
        self.integration = MyIntegration(
            api_key=os.environ["MY_INTEGRATION_API_KEY"],
            base_url=os.environ["MY_INTEGRATION_BASE_URL"]
        )

    def test_integration(self):
        # Run health check
        result = self.checker.check_health()

        # Send alert to integration
        with unittest.mock.patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {"id": "test-alert-id"}

            success = self.integration.send_alert({
                "status": result["status"],
                "timestamp": time.time(),
                "message": "Test alert",
                "details": result
            })

            self.assertTrue(success)
            mock_post.assert_called_once()
```

## Best Practices

### Code Organization

- Keep related functionality in the same module
- Use clear and descriptive names for classes and methods
- Follow the existing code style and patterns

### Error Handling

- Use try-except blocks to handle exceptions
- Provide meaningful error messages
- Log errors with appropriate log levels
- Use the circuit breaker pattern for external dependencies

### Performance

- Optimize expensive operations
- Use caching where appropriate
- Minimize network requests
- Use asynchronous operations for I/O-bound tasks

### Security

- Validate user input
- Use secure communication channels
- Store sensitive information securely
- Implement proper access controls

### Documentation

- Document your extensions thoroughly
- Include examples and use cases
- Explain configuration options
- Update existing documentation
