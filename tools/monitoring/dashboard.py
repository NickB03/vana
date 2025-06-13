"""
Dashboard Module for VANA

This module provides a monitoring dashboard for the VANA project,
including metrics collection, visualization, and alerting.
"""

import datetime
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from .alerts import AlertManager
from .health_check import HealthCheck, HealthStatus
from .metrics import MetricsCollector

# Set up logging
logger = logging.getLogger(__name__)


class Dashboard:
    """Dashboard for monitoring VANA components."""

    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize a dashboard.

        Args:
            data_dir: Directory for dashboard data (optional, defaults to data/dashboard)
        """
        # Create data directory if it doesn't exist
        self.data_dir = data_dir or os.path.join(os.environ.get("VANA_DATA_DIR", "data"), "dashboard")
        os.makedirs(self.data_dir, exist_ok=True)

        # Initialize components
        self.health_check = HealthCheck()
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()

        # Initialize dashboard state
        self.last_update_time = 0
        self.update_interval = 60  # 1 minute

    def register_component(self, component_name: str, component: Any) -> None:
        """
        Register a component for monitoring.

        Args:
            component_name: Name of the component
            component: Component instance
        """
        # Register health check
        if hasattr(component, "check_health"):
            self.health_check.register_component(component_name, component.check_health)

        # Register metrics collection
        if hasattr(component, "collect_metrics"):
            self.metrics_collector.register_component(component_name, component.collect_metrics)

        logger.info(f"Registered component for monitoring: {component_name}")

    def update(self, force: bool = False) -> Dict[str, Any]:
        """
        Update the dashboard.

        Args:
            force: Force an update even if the interval hasn't passed

        Returns:
            Dashboard data
        """
        current_time = time.time()

        # Check if we need to update
        if not force and current_time - self.last_update_time < self.update_interval:
            return self._load_latest_data()

        # Update components
        health_data = self.health_check.check_health(force=force)
        metrics_data = self.metrics_collector.collect_metrics()
        alerts_data = self.alert_manager.get_active_alerts()

        # Create dashboard data
        dashboard_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "health": health_data,
            "metrics": metrics_data,
            "alerts": alerts_data,
        }

        # Save dashboard data
        self._save_data(dashboard_data)

        # Update last update time
        self.last_update_time = current_time

        return dashboard_data

    def get_component_health(self, component_name: str) -> Dict[str, Any]:
        """
        Get the health of a specific component.

        Args:
            component_name: Name of the component

        Returns:
            Component health data
        """
        return self.health_check.check_component(component_name)

    def get_component_metrics(self, component_name: str) -> Dict[str, Any]:
        """
        Get the metrics of a specific component.

        Args:
            component_name: Name of the component

        Returns:
            Component metrics data
        """
        return self.metrics_collector.get_component_metrics(component_name)

    def get_component_alerts(self, component_name: str) -> List[Dict[str, Any]]:
        """
        Get the alerts for a specific component.

        Args:
            component_name: Name of the component

        Returns:
            Component alerts
        """
        return self.alert_manager.get_component_alerts(component_name)

    def get_historical_data(
        self,
        component_name: Optional[str] = None,
        metric_name: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get historical dashboard data.

        Args:
            component_name: Filter by component name (optional)
            metric_name: Filter by metric name (optional)
            start_time: Filter by start time (ISO format, optional)
            end_time: Filter by end time (ISO format, optional)
            limit: Maximum number of data points to return

        Returns:
            Historical dashboard data
        """
        # Get all data files
        data_files = sorted(Path(self.data_dir).glob("dashboard_*.json"))

        # Convert times to datetime objects
        start_datetime = None
        end_datetime = None

        if start_time:
            start_datetime = datetime.datetime.fromisoformat(start_time)

        if end_time:
            end_datetime = datetime.datetime.fromisoformat(end_time)

        # Load and filter data
        historical_data = []

        for data_file in reversed(data_files):
            try:
                with open(data_file, "r") as f:
                    data = json.load(f)

                # Filter by time
                data_datetime = datetime.datetime.fromisoformat(data["timestamp"])

                if start_datetime and data_datetime < start_datetime:
                    continue

                if end_datetime and data_datetime > end_datetime:
                    continue

                # Filter by component
                if component_name:
                    filtered_data = {"timestamp": data["timestamp"], "health": {}, "metrics": {}, "alerts": []}

                    # Filter health data
                    if component_name in data.get("health", {}).get("components", {}):
                        filtered_data["health"] = {
                            "status": data["health"].get("status", HealthStatus.UNKNOWN),
                            "components": {component_name: data["health"]["components"][component_name]},
                        }

                    # Filter metrics data
                    if component_name in data.get("metrics", {}):
                        if metric_name:
                            if metric_name in data["metrics"][component_name]:
                                filtered_data["metrics"] = {
                                    component_name: {metric_name: data["metrics"][component_name][metric_name]}
                                }
                        else:
                            filtered_data["metrics"] = {component_name: data["metrics"][component_name]}

                    # Filter alerts data
                    filtered_data["alerts"] = [
                        alert for alert in data.get("alerts", []) if alert.get("component") == component_name
                    ]

                    historical_data.append(filtered_data)
                else:
                    historical_data.append(data)

                # Check limit
                if len(historical_data) >= limit:
                    break
            except Exception as e:
                logger.error(f"Error loading dashboard data from {data_file}: {str(e)}")

        return historical_data

    def _save_data(self, data: Dict[str, Any]) -> None:
        """
        Save dashboard data to a file.

        Args:
            data: Dashboard data
        """
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        data_file = os.path.join(self.data_dir, f"dashboard_{timestamp}.json")

        try:
            with open(data_file, "w") as f:
                json.dump(data, f, indent=2)

            logger.debug(f"Dashboard data saved to {data_file}")
        except Exception as e:
            logger.error(f"Error saving dashboard data: {str(e)}")

    def _load_latest_data(self) -> Dict[str, Any]:
        """
        Load the latest dashboard data.

        Returns:
            Latest dashboard data
        """
        # Get all data files
        data_files = sorted(Path(self.data_dir).glob("dashboard_*.json"))

        if not data_files:
            return {
                "timestamp": datetime.datetime.now().isoformat(),
                "health": {"status": HealthStatus.UNKNOWN, "components": {}},
                "metrics": {},
                "alerts": [],
            }

        # Load the latest data file
        latest_file = data_files[-1]

        try:
            with open(latest_file, "r") as f:
                data = json.load(f)

            return data
        except Exception as e:
            logger.error(f"Error loading dashboard data from {latest_file}: {str(e)}")
            return {
                "timestamp": datetime.datetime.now().isoformat(),
                "health": {"status": HealthStatus.UNKNOWN, "components": {}},
                "metrics": {},
                "alerts": [],
            }
