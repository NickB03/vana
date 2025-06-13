"""
Health Check API for VANA (with Alert Integration)

This module provides health check functionality for the VANA memory system,
and integrates with the AlertManager to generate alerts on WARNING/ERROR.
"""

import datetime
import logging
import time
from typing import Any, Callable, Dict

from dashboard.alerting.alert_manager import AlertManager, AlertSeverity

# Import ADK memory monitor
try:
    from dashboard.monitoring.adk_memory_monitor import adk_memory_monitor

    ADK_MONITOR_AVAILABLE = True
except ImportError:
    ADK_MONITOR_AVAILABLE = False
    logging.warning("ADK memory monitor not available")

logger = logging.getLogger(__name__)


class HealthStatus:
    OK = "ok"
    WARNING = "warning"
    ERROR = "error"
    UNKNOWN = "unknown"


class HealthCheck:
    def __init__(self):
        self.component_checks = {}
        self.last_check_results = {}
        self.last_check_time = 0
        self.check_interval = 60
        self.alert_manager = AlertManager()

        # Register ADK memory monitoring if available
        if ADK_MONITOR_AVAILABLE:
            self.register_component("adk_memory", self._check_adk_memory)

    def register_component(self, component_name: str, check_function: Callable[[], Dict[str, Any]]) -> None:
        self.component_checks[component_name] = check_function
        logger.info(f"Registered health check for component: {component_name}")

    def check_health(self, force: bool = False) -> Dict[str, Any]:
        current_time = time.time()
        if not force and current_time - self.last_check_time < self.check_interval:
            return self.last_check_results

        component_results = {}
        overall_status = HealthStatus.OK

        for component_name, check_function in self.component_checks.items():
            try:
                result = check_function()
                component_results[component_name] = result
                component_status = result.get("status", HealthStatus.UNKNOWN)
                if component_status == HealthStatus.ERROR:
                    overall_status = HealthStatus.ERROR
                    self._alert(component_name, result, AlertSeverity.CRITICAL)
                elif component_status == HealthStatus.WARNING and overall_status != HealthStatus.ERROR:
                    overall_status = HealthStatus.WARNING
                    self._alert(component_name, result, AlertSeverity.WARNING)
            except Exception as e:
                logger.error(f"Error checking health for component {component_name}: {str(e)}")
                component_results[component_name] = {
                    "status": HealthStatus.ERROR,
                    "message": f"Error checking health: {str(e)}",
                    "timestamp": datetime.datetime.now().isoformat(),
                }
                overall_status = HealthStatus.ERROR
                self._alert(component_name, component_results[component_name], AlertSeverity.CRITICAL)

        results = {
            "status": overall_status,
            "timestamp": datetime.datetime.now().isoformat(),
            "components": component_results,
        }
        self.last_check_results = results
        self.last_check_time = current_time
        return results

    def _alert(self, component_name: str, result: Dict[str, Any], severity: str):
        message = f"Health check {severity.upper()} for {component_name}: {result.get('message', '')}"
        self.alert_manager.create_alert(
            message=message, severity=severity, source=f"health_check.{component_name}", details=result
        )

    def check_component(self, component_name: str) -> Dict[str, Any]:
        if component_name not in self.component_checks:
            return {
                "status": HealthStatus.UNKNOWN,
                "message": f"Component {component_name} not registered",
                "timestamp": datetime.datetime.now().isoformat(),
            }
        try:
            check_function = self.component_checks[component_name]
            result = check_function()
            if result.get("status") in [HealthStatus.ERROR, HealthStatus.WARNING]:
                self._alert(
                    component_name,
                    result,
                    AlertSeverity.CRITICAL if result["status"] == HealthStatus.ERROR else AlertSeverity.WARNING,
                )
            return result
        except Exception as e:
            logger.error(f"Error checking health for component {component_name}: {str(e)}")
            error_result = {
                "status": HealthStatus.ERROR,
                "message": f"Error checking health: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }
            self._alert(component_name, error_result, AlertSeverity.CRITICAL)
            return error_result

    def get_health_status(self) -> Dict[str, Any]:
        if not self.last_check_results:
            return self.check_health()
        return self.last_check_results

    def _check_adk_memory(self) -> Dict[str, Any]:
        """Check ADK memory system health."""
        if not ADK_MONITOR_AVAILABLE:
            return {
                "status": HealthStatus.UNKNOWN,
                "message": "ADK memory monitor not available",
                "timestamp": datetime.datetime.now().isoformat(),
            }

        try:
            health_result = adk_memory_monitor.check_health()

            # Map ADK status to health check status
            adk_status = health_result.get("status", "unknown")
            if adk_status == "ok":
                status = HealthStatus.OK
            elif adk_status == "warning":
                status = HealthStatus.WARNING
            elif adk_status == "error":
                status = HealthStatus.ERROR
            else:
                status = HealthStatus.UNKNOWN

            return {
                "status": status,
                "message": health_result.get("message", "ADK memory check completed"),
                "timestamp": health_result.get("timestamp", datetime.datetime.now().isoformat()),
                "details": {
                    "adk_available": health_result.get("adk_available", False),
                    "metrics": health_result.get("metrics", {}),
                    "cost_metrics": health_result.get("cost_metrics", {}),
                    "issues": health_result.get("issues", []),
                },
            }

        except Exception as e:
            logger.error(f"Error checking ADK memory health: {e}")
            return {
                "status": HealthStatus.ERROR,
                "message": f"ADK memory health check failed: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }
