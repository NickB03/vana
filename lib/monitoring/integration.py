"""
VANA Monitoring Integration Utilities

This module provides integration helpers for connecting the monitoring
framework with existing VANA components.
"""

import os
import time
import yaml
from typing import Dict, Any, Optional
from .performance_monitor import PerformanceMonitor
from .apm import APM


class MonitoringIntegration:
    """Integration utilities for VANA monitoring."""

    def __init__(self, config_path: str = None):
        self.config_path = config_path or "config/monitoring/monitoring.yaml"
        self.config = self._load_config()
        self.monitor = PerformanceMonitor(
            retention_minutes=self.config.get("performance_monitoring", {}).get("retention_minutes", 60)
        )
        self.apm = APM(self.monitor)
        self._setup_thresholds()

    def _load_config(self) -> Dict[str, Any]:
        """Load monitoring configuration."""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    return yaml.safe_load(f)
        except Exception as e:
            print(f"Warning: Could not load monitoring config: {e}")

        # Default configuration
        return {
            "performance_monitoring": {"retention_minutes": 60},
            "thresholds": {
                "response_time": {"warning": 2.0, "critical": 5.0},
                "memory_usage": {"warning": 80.0, "critical": 90.0},
                "cpu_usage": {"warning": 70.0, "critical": 85.0}
            }
        }

    def _setup_thresholds(self):
        """Setup performance thresholds from configuration."""
        thresholds = self.config.get("thresholds", {})

        for metric_name, threshold_config in thresholds.items():
            if "warning" in threshold_config and "critical" in threshold_config:
                # Set threshold for the base metric name and common patterns
                self.monitor.set_threshold(
                    metric_name,
                    threshold_config["warning"],
                    threshold_config["critical"]
                )

                # Also set for common patterns like agent and tool metrics
                if metric_name == "response_time":
                    # Set thresholds for agent response times
                    self.monitor.set_threshold(
                        "response_time.agent.*",
                        threshold_config["warning"],
                        threshold_config["critical"]
                    )
                    # Set thresholds for tool response times
                    self.monitor.set_threshold(
                        "response_time.tool.*",
                        threshold_config["warning"],
                        threshold_config["critical"]
                    )

    def get_monitor(self) -> PerformanceMonitor:
        """Get the performance monitor instance."""
        return self.monitor

    def get_apm(self) -> APM:
        """Get the APM instance."""
        return self.apm

    def record_agent_response(self, agent_name: str, duration: float, success: bool = True):
        """Record agent response time."""
        self.monitor.record_response_time(
            f"agent.{agent_name}",
            duration,
            success=success,
            agent=agent_name
        )

    def record_tool_execution(self, tool_name: str, duration: float, success: bool = True):
        """Record tool execution time."""
        self.monitor.record_response_time(
            f"tool.{tool_name}",
            duration,
            success=success,
            tool=tool_name
        )

    def record_system_metrics(self):
        """Record system-level metrics."""
        self.monitor.record_memory_usage("vana_system")
        self.monitor.record_cpu_usage("vana_system")

    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status."""
        recent_alerts = [
            alert for alert in self.monitor.alerts
            if alert["timestamp"] > (time.time() - 300)  # Last 5 minutes
        ]

        return {
            "status": "critical" if any(a["level"] == "critical" for a in recent_alerts) else "healthy",
            "recent_alerts": len(recent_alerts),
            "metrics_collected": len(self.monitor.metrics),
            "uptime_seconds": time.time() - getattr(self, '_start_time', time.time())
        }

# Global monitoring instance
_monitoring_integration = None


def get_monitoring() -> MonitoringIntegration:
    """Get global monitoring integration instance."""
    global _monitoring_integration
    if _monitoring_integration is None:
        _monitoring_integration = MonitoringIntegration()
    return _monitoring_integration
