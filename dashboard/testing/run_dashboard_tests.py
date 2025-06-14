"""
VANA Dashboard Test Runner

Runs test scenarios using data generators, measures performance, and outputs structured reports.
"""

import json
import os
import time

from dashboard.testing.data_generator import generate_scenario

REPORTS_DIR = os.environ.get("VANA_TEST_REPORTS_DIR", "dashboard/testing/reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

def run_test_scenario(scenario: str):
    logger.debug(f"Running test scenario: {scenario}")
    start_time = time.time()
    data = generate_scenario(scenario)
    duration = time.time() - start_time

    # Simulate test logic (placeholder for real dashboard API/component tests)
    result = {
        "scenario": scenario,
        "start_time": start_time,
        "duration_sec": duration,
        "data_summary": {
            "num_agents": len(data["agents"]),
            "num_memory_components": len(data["memory"]),
            "system_status": data["system"]["services"],
            "num_tasks": len(data["tasks"])
        },
        "status": "success"
    }
    return result

def save_report(result: dict):
    timestamp = int(time.time())
    filename = f"{result['scenario']}_test_{timestamp}.json"
    path = os.path.join(REPORTS_DIR, filename)
    with open(path, "w") as f:
        json.dump(result, f, indent=2)
    logger.debug(f"Saved test report: {path}")

import requests

from dashboard.alerting.alert_manager import AlertManager
from lib.logging_config import get_logger

logger = get_logger("vana.run_dashboard_tests")


def test_api_endpoints():
    """
    Test dashboard API endpoints and log failures as alerts.
    """
    alert_manager = AlertManager()
    base_url = "http://localhost:5050"

    endpoints = ["/api/alerts", "/api/health"]
    for ep in endpoints:
        try:
            resp = requests.get(base_url + ep, timeout=3)
            if resp.status_code != 200:
                alert_manager.log_external_alert(
                    message=f"API endpoint {ep} returned status {resp.status_code}",
                    severity="warning",
                    source="test_api_endpoints",
                    details={"endpoint": ep, "status_code": resp.status_code}
                )
        except Exception as e:
            alert_manager.log_external_alert(
                message=f"API endpoint {ep} failed: {e}",
                severity="critical",
                source="test_api_endpoints",
                details={"endpoint": ep, "error": str(e)}
            )


def main():
    scenarios = ["default", "high_load", "degraded_services", "error_spike"]
    for scenario in scenarios:
        result = run_test_scenario(scenario)
        save_report(result)

if __name__ == "__main__":
    main()
