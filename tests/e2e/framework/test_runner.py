"""
End-to-End Test Runner for VANA.

This module provides a framework for running end-to-end tests for the VANA system.
"""

import argparse
import importlib
import json
import logging
import os
import sys
import traceback
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)

logger = logging.getLogger(__name__)


class TestRunner:
    """Framework for running end-to-end tests for VANA."""

    def __init__(self, config_path=None):
        """
        Initialize the test runner.

        Args:
            config_path (str): Path to the test configuration file.
        """
        self.config_path = config_path or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "../config/test_config.json"
        )
        self.config = self._load_config()
        self.results = {
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "total": 0,
            "start_time": None,
            "end_time": None,
            "duration": None,
            "tests": [],
        }

        # Configure logging
        self._configure_logging()

    def _load_config(self):
        """
        Load the test configuration from file.

        Returns:
            dict: Test configuration.
        """
        try:
            with open(self.config_path) as f:
                config = json.load(f)
            logger.info(f"Loaded test configuration from {self.config_path}")
            return config
        except Exception as e:
            logger.error(
                f"Error loading test configuration from {self.config_path}: {e}"
            )
            return {
                "test_scenarios_path": "../scenarios",
                "test_data_path": "../data",
                "timeout": 300,
                "retry_count": 3,
                "retry_delay": 5,
                "parallel": False,
                "scenarios": [],
            }

    def _configure_logging(self):
        """Configure logging for the test runner."""
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../logs")
        os.makedirs(log_dir, exist_ok=True)

        log_file = os.path.join(
            log_dir, f"test_run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        )

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[logging.StreamHandler(), logging.FileHandler(log_file)],
        )

    def discover_scenarios(self):
        """
        Discover test scenarios to run.

        Returns:
            list: List of test scenario modules.
        """
        scenarios = []

        # If specific scenarios are specified in the config, use those
        if self.config.get("scenarios"):
            for scenario_name in self.config["scenarios"]:
                try:
                    module_path = f"tests.e2e.scenarios.{scenario_name}"
                    module = importlib.import_module(module_path)
                    scenarios.append(module)
                    logger.info(f"Discovered scenario: {scenario_name}")
                except ImportError as e:
                    logger.error(f"Error importing scenario {scenario_name}: {e}")

        # Otherwise, discover all scenarios in the scenarios directory
        else:
            scenarios_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scenarios"
            )

            for file in os.listdir(scenarios_dir):
                if file.endswith(".py") and not file.startswith("__"):
                    scenario_name = file[:-3]
                    try:
                        module_path = f"tests.e2e.scenarios.{scenario_name}"
                        module = importlib.import_module(module_path)
                        scenarios.append(module)
                        logger.info(f"Discovered scenario: {scenario_name}")
                    except ImportError as e:
                        logger.error(f"Error importing scenario {scenario_name}: {e}")

        return scenarios

    def run_scenario(self, scenario):
        """
        Run a single test scenario.

        Args:
            scenario (module): Test scenario module.

        Returns:
            dict: Test result.
        """
        scenario_name = scenario.__name__.split(".")[-1]
        logger.info(f"Running scenario: {scenario_name}")

        result = {
            "name": scenario_name,
            "status": "failed",
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "duration": None,
            "error": None,
            "steps": [],
        }

        try:
            # Check if the scenario has a setup function
            if hasattr(scenario, "setup"):
                logger.info(f"Setting up scenario: {scenario_name}")
                scenario.setup()

            # Run the scenario
            logger.info(f"Executing scenario: {scenario_name}")
            scenario_result = scenario.run()

            # Update the result
            result["status"] = (
                "passed" if scenario_result.get("success", False) else "failed"
            )
            result["steps"] = scenario_result.get("steps", [])

            if not scenario_result.get("success", False):
                result["error"] = scenario_result.get("error", "Unknown error")

            # Check if the scenario has a teardown function
            if hasattr(scenario, "teardown"):
                logger.info(f"Tearing down scenario: {scenario_name}")
                scenario.teardown()

        except Exception as e:
            logger.error(f"Error running scenario {scenario_name}: {e}")
            logger.error(traceback.format_exc())
            result["status"] = "failed"
            result["error"] = str(e)

        # Update the result with timing information
        result["end_time"] = datetime.now().isoformat()
        start_time = datetime.fromisoformat(result["start_time"])
        end_time = datetime.fromisoformat(result["end_time"])
        result["duration"] = (end_time - start_time).total_seconds()

        logger.info(
            f"Scenario {scenario_name} {result['status']} in {result['duration']:.2f} seconds"
        )

        return result

    def run_tests(self):
        """
        Run all test scenarios.

        Returns:
            dict: Test results.
        """
        logger.info("Starting test run")

        self.results["start_time"] = datetime.now().isoformat()

        # Discover scenarios
        scenarios = self.discover_scenarios()
        self.results["total"] = len(scenarios)

        # Run scenarios
        for scenario in scenarios:
            result = self.run_scenario(scenario)
            self.results["tests"].append(result)

            if result["status"] == "passed":
                self.results["passed"] += 1
            elif result["status"] == "failed":
                self.results["failed"] += 1
            elif result["status"] == "skipped":
                self.results["skipped"] += 1

        # Update the results with timing information
        self.results["end_time"] = datetime.now().isoformat()
        start_time = datetime.fromisoformat(self.results["start_time"])
        end_time = datetime.fromisoformat(self.results["end_time"])
        self.results["duration"] = (end_time - start_time).total_seconds()

        logger.info(f"Test run completed in {self.results['duration']:.2f} seconds")
        logger.info(
            f"Passed: {self.results['passed']}, Failed: {self.results['failed']}, Skipped: {self.results['skipped']}, Total: {self.results['total']}"
        )

        return self.results

    def save_results(self, output_path=None):
        """
        Save the test results to a file.

        Args:
            output_path (str): Path to save the results to.

        Returns:
            str: Path to the results file.
        """
        if not output_path:
            results_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results"
            )
            os.makedirs(results_dir, exist_ok=True)
            output_path = os.path.join(
                results_dir,
                f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            )

        try:
            with open(output_path, "w") as f:
                json.dump(self.results, f, indent=4)
            logger.info(f"Saved test results to {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error saving test results to {output_path}: {e}")
            return None


def main():
    """Main function to run the test runner."""
    parser = argparse.ArgumentParser(description="VANA End-to-End Test Runner")
    parser.add_argument("--config", help="Path to test configuration file")
    parser.add_argument("--output", help="Path to save test results")
    args = parser.parse_args()

    runner = TestRunner(config_path=args.config)
    runner.run_tests()
    runner.save_results(output_path=args.output)


if __name__ == "__main__":
    main()
