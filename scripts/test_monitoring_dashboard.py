#!/usr/bin/env python3
"""
Test Monitoring Dashboard

This script tests the monitoring dashboard for the VANA project.
"""

import json
import logging
import os
import random
import sys
import time
from datetime import datetime

# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import monitoring components
from tools.monitoring.alerts import AlertManager, AlertSeverity
from tools.monitoring.dashboard import Dashboard
from tools.monitoring.health_check import HealthStatus


class TestComponent:
    """Test component for monitoring."""

    def __init__(self, name: str):
        """
        Initialize a test component.

        Args:
            name: Component name
        """
        self.name = name
        self.health_status = HealthStatus.OK
        self.error_rate = 0.0
        self.latency = 100.0  # ms
        self.request_count = 0
        self.last_request_time = time.time()

    def check_health(self):
        """
        Check the health of the component.

        Returns:
            Health check results
        """
        # Simulate random health status
        if random.random() < 0.1:
            self.health_status = random.choice(
                [HealthStatus.OK, HealthStatus.WARNING, HealthStatus.ERROR]
            )

        return {
            "status": self.health_status,
            "message": f"Component {self.name} is {self.health_status}",
            "timestamp": datetime.now().isoformat(),
            "details": {
                "error_rate": self.error_rate,
                "latency": self.latency,
                "request_count": self.request_count,
            },
        }

    def collect_metrics(self):
        """
        Collect metrics for the component.

        Returns:
            Metrics data
        """
        # Simulate random metrics
        self.error_rate = random.random() * 0.1  # 0-10%
        self.latency = 50.0 + random.random() * 100.0  # 50-150ms
        self.request_count += random.randint(1, 10)

        return {
            "timestamp": datetime.now().isoformat(),
            "error_rate": self.error_rate,
            "latency": self.latency,
            "request_count": self.request_count,
            "requests_per_second": self.request_count
            / (time.time() - self.last_request_time),
        }

    def simulate_error(self):
        """Simulate an error in the component."""
        self.health_status = HealthStatus.ERROR
        self.error_rate = 0.5 + random.random() * 0.5  # 50-100%
        self.latency = 500.0 + random.random() * 500.0  # 500-1000ms

        return {
            "type": "component_error",
            "component": self.name,
            "message": f"Error in component {self.name}",
            "severity": AlertSeverity.ERROR,
            "details": {
                "error_rate": self.error_rate,
                "latency": self.latency,
                "request_count": self.request_count,
            },
        }

    def simulate_warning(self):
        """Simulate a warning in the component."""
        self.health_status = HealthStatus.WARNING
        self.error_rate = 0.1 + random.random() * 0.4  # 10-50%
        self.latency = 200.0 + random.random() * 300.0  # 200-500ms

        return {
            "type": "component_warning",
            "component": self.name,
            "message": f"Warning in component {self.name}",
            "severity": AlertSeverity.WARNING,
            "details": {
                "error_rate": self.error_rate,
                "latency": self.latency,
                "request_count": self.request_count,
            },
        }

    def simulate_recovery(self):
        """Simulate recovery of the component."""
        self.health_status = HealthStatus.OK
        self.error_rate = random.random() * 0.1  # 0-10%
        self.latency = 50.0 + random.random() * 100.0  # 50-150ms

        return {
            "type": "component_recovery",
            "component": self.name,
            "message": f"Component {self.name} recovered",
            "severity": AlertSeverity.INFO,
            "details": {
                "error_rate": self.error_rate,
                "latency": self.latency,
                "request_count": self.request_count,
            },
        }


def test_dashboard():
    """Test the monitoring dashboard."""
    logger.info("Testing monitoring dashboard...")

    # Create dashboard
    dashboard = Dashboard()

    # Create test components
    components = [
        TestComponent("mcp_server"),
        TestComponent("memory_manager"),
        TestComponent("vector_search"),
        TestComponent("hybrid_search"),
        TestComponent("web_search"),
    ]

    # Register components
    for component in components:
        dashboard.register_component(component.name, component)

    # Update dashboard
    logger.info("Updating dashboard...")
    dashboard_data = dashboard.update(force=True)

    # Print dashboard data
    logger.info(f"Dashboard data: {json.dumps(dashboard_data, indent=2)}")

    # Test component health
    logger.info("Testing component health...")
    for component in components:
        health_data = dashboard.get_component_health(component.name)
        logger.info(
            f"Health data for {component.name}: {json.dumps(health_data, indent=2)}"
        )

    # Test component metrics
    logger.info("Testing component metrics...")
    for component in components:
        metrics_data = dashboard.get_component_metrics(component.name)
        logger.info(
            f"Metrics data for {component.name}: {json.dumps(metrics_data, indent=2)}"
        )

    # Test alerts
    logger.info("Testing alerts...")
    alert_manager = AlertManager()

    # Create alerts
    for component in components:
        if random.random() < 0.3:
            # Simulate error
            alert_data = component.simulate_error()
            alert = alert_manager.create_alert(
                alert_type=alert_data["type"],
                component=alert_data["component"],
                message=alert_data["message"],
                severity=alert_data["severity"],
                details=alert_data["details"],
            )
            logger.info(f"Created error alert: {json.dumps(alert, indent=2)}")
        elif random.random() < 0.5:
            # Simulate warning
            alert_data = component.simulate_warning()
            alert = alert_manager.create_alert(
                alert_type=alert_data["type"],
                component=alert_data["component"],
                message=alert_data["message"],
                severity=alert_data["severity"],
                details=alert_data["details"],
            )
            logger.info(f"Created warning alert: {json.dumps(alert, indent=2)}")

    # Get active alerts
    active_alerts = alert_manager.get_active_alerts()
    logger.info(f"Active alerts: {json.dumps(active_alerts, indent=2)}")

    # Resolve some alerts
    for alert in active_alerts[: len(active_alerts) // 2]:
        alert_manager.update_alert(
            alert_id=alert["id"],
            status="resolved",
            message=f"Alert resolved: {alert['message']}",
        )

    # Get active alerts again
    active_alerts = alert_manager.get_active_alerts()
    logger.info(
        f"Active alerts after resolution: {json.dumps(active_alerts, indent=2)}"
    )

    # Test historical data
    logger.info("Testing historical data...")

    # Create some historical data
    for i in range(5):
        # Update dashboard
        dashboard.update(force=True)

        # Wait a bit
        time.sleep(1)

    # Get historical data
    historical_data = dashboard.get_historical_data(limit=10)
    logger.info(f"Historical data: {json.dumps(historical_data, indent=2)}")

    # Test component historical data
    for component in components:
        component_data = dashboard.get_historical_data(
            component_name=component.name, limit=5
        )
        logger.info(
            f"Historical data for {component.name}: {json.dumps(component_data, indent=2)}"
        )

    logger.info("Monitoring dashboard test complete!")


if __name__ == "__main__":
    test_dashboard()
