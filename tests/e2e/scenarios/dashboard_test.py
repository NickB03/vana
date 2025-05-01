"""
Dashboard Test Scenario for VANA.

This module provides a test scenario for the VANA dashboard.
"""

import os
import sys
import logging
import json
import time
import requests
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from tests.e2e.framework.test_case import TestCase

logger = logging.getLogger(__name__)

class DashboardTest(TestCase):
    """Test case for the VANA dashboard."""
    
    def __init__(self):
        """Initialize the test case."""
        super().__init__(
            name="dashboard_test",
            description="Test the VANA dashboard components"
        )
        self.dashboard_url = os.environ.get("VANA_DASHBOARD_URL", "http://localhost:8501")
        self.session = requests.Session()
    
    def setup(self):
        """Set up the test case."""
        logger.info("Setting up dashboard test")
        
        # Check if the dashboard is running
        try:
            response = self.session.get(f"{self.dashboard_url}/healthz", timeout=5)
            if response.status_code != 200:
                logger.warning(f"Dashboard health check failed with status code {response.status_code}")
                self.skip("Dashboard is not running")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Dashboard is not running: {e}")
            self.skip("Dashboard is not running")
    
    def teardown(self):
        """Tear down the test case."""
        logger.info("Tearing down dashboard test")
        self.session.close()
    
    def _run(self):
        """Run the test case."""
        # Step 1: Test dashboard home page
        self.step("home_page", "Test dashboard home page")
        response = self.execute_step(
            self.session.get,
            self.dashboard_url,
            timeout=10
        )
        self.assert_true(response.status_code == 200, f"Dashboard home page returned status code {response.status_code}")
        
        # Step 2: Test agent status page
        self.step("agent_status", "Test agent status page")
        response = self.execute_step(
            self.session.get,
            f"{self.dashboard_url}/agent_status",
            timeout=10
        )
        self.assert_true(response.status_code == 200, f"Agent status page returned status code {response.status_code}")
        
        # Step 3: Test memory usage page
        self.step("memory_usage", "Test memory usage page")
        response = self.execute_step(
            self.session.get,
            f"{self.dashboard_url}/memory_usage",
            timeout=10
        )
        self.assert_true(response.status_code == 200, f"Memory usage page returned status code {response.status_code}")
        
        # Step 4: Test system health page
        self.step("system_health", "Test system health page")
        response = self.execute_step(
            self.session.get,
            f"{self.dashboard_url}/system_health",
            timeout=10
        )
        self.assert_true(response.status_code == 200, f"System health page returned status code {response.status_code}")
        
        # Step 5: Test task execution page
        self.step("task_execution", "Test task execution page")
        response = self.execute_step(
            self.session.get,
            f"{self.dashboard_url}/task_execution",
            timeout=10
        )
        self.assert_true(response.status_code == 200, f"Task execution page returned status code {response.status_code}")
        
        # Step 6: Test settings page
        self.step("settings", "Test settings page")
        response = self.execute_step(
            self.session.get,
            f"{self.dashboard_url}/settings",
            timeout=10
        )
        self.assert_true(response.status_code == 200, f"Settings page returned status code {response.status_code}")

# Create an instance of the test case
test_case = DashboardTest()

def setup():
    """Set up the test scenario."""
    test_case.setup()

def run():
    """Run the test scenario."""
    return test_case.run()

def teardown():
    """Tear down the test scenario."""
    test_case.teardown()
