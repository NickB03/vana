"""
Test Case Base Class for VANA End-to-End Tests.

This module provides a base class for test cases in the VANA end-to-end testing framework.
"""

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


class TestCase:
    """Base class for test cases in the VANA end-to-end testing framework."""

    def __init__(self, name, description=None):
        """
        Initialize the test case.

        Args:
            name (str): Name of the test case.
            description (str): Description of the test case.
        """
        self.name = name
        self.description = description or f"Test case: {name}"
        self.steps = []
        self.current_step = None
        self.result = {
            "name": name,
            "description": self.description,
            "success": False,
            "steps": [],
            "error": None,
        }

    def setup(self):
        """
        Set up the test case.

        This method should be overridden by subclasses to perform any setup needed for the test case.
        """
        pass

    def teardown(self):
        """
        Tear down the test case.

        This method should be overridden by subclasses to perform any cleanup needed after the test case.
        """
        pass

    def step(self, name, description=None):
        """
        Define a test step.

        Args:
            name (str): Name of the step.
            description (str): Description of the step.

        Returns:
            TestCase: The test case instance for method chaining.
        """
        self.current_step = {
            "name": name,
            "description": description or name,
            "status": "pending",
            "start_time": None,
            "end_time": None,
            "duration": None,
            "error": None,
        }
        self.steps.append(self.current_step)
        return self

    def execute_step(self, func, *args, **kwargs):
        """
        Execute a test step.

        Args:
            func (callable): Function to execute for the step.
            *args: Arguments to pass to the function.
            **kwargs: Keyword arguments to pass to the function.

        Returns:
            TestCase: The test case instance for method chaining.
        """
        if not self.current_step:
            raise ValueError("No current step defined. Call step() first.")

        self.current_step["status"] = "running"
        self.current_step["start_time"] = datetime.now().isoformat()

        try:
            logger.info(f"Executing step: {self.current_step['name']}")
            result = func(*args, **kwargs)
            self.current_step["status"] = "passed"
            return result
        except Exception as e:
            logger.error(f"Error executing step {self.current_step['name']}: {e}")
            logger.error(traceback.format_exc())
            self.current_step["status"] = "failed"
            self.current_step["error"] = str(e)
            raise
        finally:
            self.current_step["end_time"] = datetime.now().isoformat()
            start_time = datetime.fromisoformat(self.current_step["start_time"])
            end_time = datetime.fromisoformat(self.current_step["end_time"])
            self.current_step["duration"] = (end_time - start_time).total_seconds()
            logger.info(
                f"Step {self.current_step['name']} {self.current_step['status']} in {self.current_step['duration']:.2f} seconds"
            )

    def assert_true(self, condition, message=None):
        """
        Assert that a condition is true.

        Args:
            condition (bool): Condition to check.
            message (str): Message to include in the assertion error.

        Raises:
            AssertionError: If the condition is false.
        """
        if not condition:
            error_message = message or "Assertion failed"
            logger.error(error_message)
            raise AssertionError(error_message)

    def assert_false(self, condition, message=None):
        """
        Assert that a condition is false.

        Args:
            condition (bool): Condition to check.
            message (str): Message to include in the assertion error.

        Raises:
            AssertionError: If the condition is true.
        """
        if condition:
            error_message = message or "Assertion failed"
            logger.error(error_message)
            raise AssertionError(error_message)

    def assert_equal(self, expected, actual, message=None):
        """
        Assert that two values are equal.

        Args:
            expected: Expected value.
            actual: Actual value.
            message (str): Message to include in the assertion error.

        Raises:
            AssertionError: If the values are not equal.
        """
        if expected != actual:
            error_message = message or f"Expected {expected}, got {actual}"
            logger.error(error_message)
            raise AssertionError(error_message)

    def assert_not_equal(self, expected, actual, message=None):
        """
        Assert that two values are not equal.

        Args:
            expected: Expected value.
            actual: Actual value.
            message (str): Message to include in the assertion error.

        Raises:
            AssertionError: If the values are equal.
        """
        if expected == actual:
            error_message = (
                message or f"Expected {expected} to be different from {actual}"
            )
            logger.error(error_message)
            raise AssertionError(error_message)

    def assert_in(self, item, container, message=None):
        """
        Assert that an item is in a container.

        Args:
            item: Item to check.
            container: Container to check.
            message (str): Message to include in the assertion error.

        Raises:
            AssertionError: If the item is not in the container.
        """
        if item not in container:
            error_message = message or f"Expected {item} to be in {container}"
            logger.error(error_message)
            raise AssertionError(error_message)

    def assert_not_in(self, item, container, message=None):
        """
        Assert that an item is not in a container.

        Args:
            item: Item to check.
            container: Container to check.
            message (str): Message to include in the assertion error.

        Raises:
            AssertionError: If the item is in the container.
        """
        if item in container:
            error_message = message or f"Expected {item} not to be in {container}"
            logger.error(error_message)
            raise AssertionError(error_message)

    def run(self):
        """
        Run the test case.

        This method should be overridden by subclasses to implement the test case logic.

        Returns:
            dict: Test result.
        """
        try:
            self.setup()
            self._run()
            self.result["success"] = True
        except Exception as e:
            logger.error(f"Error running test case {self.name}: {e}")
            logger.error(traceback.format_exc())
            self.result["success"] = False
            self.result["error"] = str(e)
        finally:
            try:
                self.teardown()
            except Exception as e:
                logger.error(f"Error in teardown for test case {self.name}: {e}")
                logger.error(traceback.format_exc())
                if not self.result["error"]:
                    self.result["error"] = f"Error in teardown: {str(e)}"

            self.result["steps"] = self.steps

        return self.result

    def _run(self):
        """
        Internal method to run the test case.

        This method should be overridden by subclasses to implement the test case logic.
        """
        raise NotImplementedError("Subclasses must implement _run()")
