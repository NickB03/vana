"""
Tests for the Team Coordination System.

This module tests the team coordination system components, including:
- Task Planner
- Parallel Executor
- Result Validator
- Fallback Manager
"""

import unittest
from unittest.mock import MagicMock, patch
import time

import sys
import os

# Add the project directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import the orchestration components
sys.path.append('/Users/nick/Development/vana')
from adk-setup.vana.orchestration.task_planner import TaskPlanner
from adk-setup.vana.orchestration.parallel_executor import ParallelExecutor
from adk-setup.vana.orchestration.result_validator import ResultValidator
from adk-setup.vana.orchestration.fallback_manager import FallbackManager

class TestTaskPlanner(unittest.TestCase):
    """Tests for the TaskPlanner class."""

    def setUp(self):
        """Set up test fixtures."""
        self.task_router = MagicMock()
        self.task_router.route_task = MagicMock(return_value=("rhea", 0.8))
        self.planner = TaskPlanner(task_router=self.task_router)

    def test_decompose_simple_task(self):
        """Test decomposing a simple task."""
        task = "Simple task"
        subtasks = self.planner.decompose_task(task)

        # Check that a simple task is not decomposed
        self.assertEqual(len(subtasks), 1)
        self.assertEqual(subtasks[0]["description"], task)
        self.assertEqual(subtasks[0]["type"], "simple")

    def test_decompose_design_task(self):
        """Test decomposing a design task."""
        task = "Design a system for user authentication"
        subtasks = self.planner.decompose_task(task)

        # Check that the task is decomposed into multiple subtasks
        self.assertGreater(len(subtasks), 1)

        # Check that the subtasks have the expected structure
        for subtask in subtasks:
            self.assertIn("id", subtask)
            self.assertIn("description", subtask)
            self.assertIn("type", subtask)
            self.assertIn("dependencies", subtask)

    def test_identify_dependencies(self):
        """Test identifying dependencies between subtasks."""
        subtasks = [
            {"id": "task1", "dependencies": []},
            {"id": "task2", "dependencies": ["task1"]},
            {"id": "task3", "dependencies": ["task2"]}
        ]

        dependencies = self.planner.identify_dependencies(subtasks)

        # Check that dependencies are correctly identified
        self.assertEqual(dependencies["task1"], [])
        self.assertEqual(dependencies["task2"], ["task1"])
        self.assertEqual(dependencies["task3"], ["task2"])

    def test_create_execution_plan(self):
        """Test creating an execution plan."""
        subtasks = [
            {"id": "task3", "dependencies": ["task2"]},
            {"id": "task1", "dependencies": []},
            {"id": "task2", "dependencies": ["task1"]}
        ]

        execution_plan = self.planner.create_execution_plan(subtasks)

        # Check that the execution plan respects dependencies
        self.assertEqual(execution_plan[0]["id"], "task1")
        self.assertEqual(execution_plan[1]["id"], "task2")
        self.assertEqual(execution_plan[2]["id"], "task3")

    def test_assign_subtasks(self):
        """Test assigning subtasks to specialists."""
        subtasks = [
            {"id": "task1", "description": "Design architecture", "type": "design"},
            {"id": "task2", "description": "Write documentation", "type": "documentation"},
            {"id": "task3", "description": "Test system", "type": "testing"}
        ]

        assignments = self.planner.assign_subtasks(subtasks)

        # Check that subtasks are assigned to appropriate specialists
        self.assertIn("rhea", assignments)  # Using mock task router

        # Check with task router disabled
        self.planner.task_router = None
        assignments = self.planner.assign_subtasks(subtasks)

        # Check that subtasks are assigned based on type
        self.assertIn("rhea", assignments)  # design task
        self.assertIn("juno", assignments)  # documentation task
        self.assertIn("kai", assignments)  # testing task

class TestParallelExecutor(unittest.TestCase):
    """Tests for the ParallelExecutor class."""

    def setUp(self):
        """Set up test fixtures."""
        self.executor = ParallelExecutor(max_workers=2, timeout=1)

        # Create mock specialist functions
        self.specialist1 = MagicMock(return_value="Specialist 1 result")
        self.specialist2 = MagicMock(return_value="Specialist 2 result")
        self.specialist_map = {
            "specialist1": self.specialist1,
            "specialist2": self.specialist2
        }

    def tearDown(self):
        """Tear down test fixtures."""
        self.executor.shutdown()

    def test_execute_task(self):
        """Test executing a single task."""
        task = {
            "id": "task1",
            "description": "Test task",
            "context": {"key": "value"}
        }

        result = self.executor.execute_task(task, self.specialist1)

        # Check that the task was executed successfully
        self.assertTrue(result["success"])
        self.assertEqual(result["result"], "Specialist 1 result")
        self.assertEqual(result["task_id"], "task1")

        # Check that the specialist function was called with the correct arguments
        self.specialist1.assert_called_once_with("Test task", context={"key": "value"})

    def test_execute_task_error(self):
        """Test executing a task that raises an error."""
        task = {
            "id": "task1",
            "description": "Test task"
        }

        # Make the specialist function raise an error
        self.specialist1.side_effect = ValueError("Test error")

        result = self.executor.execute_task(task, self.specialist1)

        # Check that the error is handled correctly
        self.assertFalse(result["success"])
        self.assertEqual(result["task_id"], "task1")
        self.assertIn("Test error", result["error"])

    def test_execute_tasks(self):
        """Test executing multiple tasks in parallel."""
        tasks = [
            {"id": "task1", "description": "Test task 1"},
            {"id": "task2", "description": "Test task 2"}
        ]

        results = self.executor.execute_tasks(tasks, self.specialist1)

        # Check that all tasks were executed
        self.assertEqual(len(results), 2)

        # Check that the specialist function was called for each task
        self.assertEqual(self.specialist1.call_count, 2)

    def test_execute_plan(self):
        """Test executing a plan with dependencies."""
        execution_plan = [
            {"id": "task1", "description": "Test task 1", "type": "design"},
            {"id": "task2", "description": "Test task 2", "type": "documentation", "dependencies": ["task1"]},
            {"id": "task3", "description": "Test task 3", "type": "testing", "dependencies": ["task2"]}
        ]

        specialist_map = {
            "rhea": self.specialist1,
            "juno": self.specialist2,
            "kai": self.specialist1,
            "vana": self.specialist2
        }

        result = self.executor.execute_plan(execution_plan, specialist_map)

        # Check that the plan was executed successfully
        self.assertEqual(result["success_count"], 3)
        self.assertEqual(result["error_count"], 0)

    def test_execute_assignments(self):
        """Test executing assignments for multiple specialists."""
        assignments = {
            "specialist1": [
                {"id": "task1", "description": "Test task 1"}
            ],
            "specialist2": [
                {"id": "task2", "description": "Test task 2"}
            ]
        }

        result = self.executor.execute_assignments(assignments, self.specialist_map)

        # Check that assignments were executed successfully
        self.assertEqual(result["success_count"], 2)
        self.assertEqual(result["error_count"], 0)

        # Check that each specialist function was called once
        self.specialist1.assert_called_once()
        self.specialist2.assert_called_once()

    def test_cancel_task(self):
        """Test cancelling a running task."""
        # Create a long-running task
        def long_running_task(*args, **kwargs):
            time.sleep(10)
            return "Long-running task result"

        self.specialist1.side_effect = long_running_task

        # Submit the task
        task = {"id": "long_task", "description": "Long-running task"}
        future = self.executor.executor.submit(self.executor.execute_task, task, self.specialist1)
        self.executor.running_tasks["long_task"] = future

        # Cancel the task
        cancelled = self.executor.cancel_task("long_task")

        # Check that the task was cancelled
        self.assertTrue(cancelled)
        self.assertNotIn("long_task", self.executor.running_tasks)

class TestResultValidator(unittest.TestCase):
    """Tests for the ResultValidator class."""

    def setUp(self):
        """Set up test fixtures."""
        validation_rules = {
            "design": {
                "required_fields": ["result"],
                "format": "json",
                "min_confidence": 0.6
            },
            "documentation": {
                "required_fields": ["result"],
                "format": "text",
                "min_length": 100
            }
        }
        self.validator = ResultValidator(validation_rules=validation_rules)

    def test_validate_result_success(self):
        """Test validating a successful result."""
        result = {
            "task_id": "task1",
            "result": '{"key": "value"}',
            "success": True,
            "confidence": 0.8
        }

        validated = self.validator.validate_result(result, task_type="design")

        # Check that the result is validated successfully
        self.assertTrue(validated["success"])
        self.assertTrue(validated["validated"])
        self.assertGreaterEqual(validated["confidence"], 0.6)

    def test_validate_result_missing_field(self):
        """Test validating a result with missing required fields."""
        result = {
            "task_id": "task1",
            "success": True,
            "confidence": 0.8
        }

        validated = self.validator.validate_result(result, task_type="design")

        # Check that validation fails due to missing field
        self.assertFalse(validated["success"])
        self.assertIn("validation_error", validated)
        self.assertIn("Missing required fields", validated["validation_error"])

    def test_validate_result_invalid_format(self):
        """Test validating a result with invalid format."""
        result = {
            "task_id": "task1",
            "result": "Not JSON",
            "success": True,
            "confidence": 0.8
        }

        validated = self.validator.validate_result(result, task_type="design")

        # Check that validation fails due to invalid format
        self.assertFalse(validated["success"])
        self.assertIn("validation_error", validated)
        self.assertIn("Invalid format", validated["validation_error"])

    def test_validate_results_list(self):
        """Test validating a list of results."""
        results = [
            {
                "task_id": "task1",
                "result": '{"key": "value"}',
                "success": True,
                "confidence": 0.8
            },
            {
                "task_id": "task2",
                "result": "Text result",
                "success": True,
                "confidence": 0.7
            }
        ]

        task_types = {
            "task1": "design",
            "task2": "documentation"
        }

        validated = self.validator.validate_results(results, task_types)

        # Check that all results are validated
        self.assertEqual(len(validated), 2)

    def test_combine_results_weighted(self):
        """Test combining results using weighted averaging."""
        results = [
            {
                "task_id": "task1",
                "result": "Result 1",
                "success": True,
                "confidence": 0.8
            },
            {
                "task_id": "task2",
                "result": "Result 2",
                "success": True,
                "confidence": 0.6
            }
        ]

        combined = self.validator.combine_results(results, combination_method="weighted")

        # Check that results are combined correctly
        self.assertTrue(combined["success"])
        self.assertTrue(combined["combined"])
        self.assertEqual(combined["combination_method"], "weighted")
        self.assertEqual(combined["source_count"], 2)

    def test_has_failures(self):
        """Test checking for failed results."""
        results = [
            {
                "task_id": "task1",
                "result": "Result 1",
                "success": True
            },
            {
                "task_id": "task2",
                "result": "Result 2",
                "success": False
            }
        ]

        has_failures = self.validator.has_failures(results)

        # Check that failures are detected
        self.assertTrue(has_failures)

        # Check with no failures
        results = [
            {
                "task_id": "task1",
                "result": "Result 1",
                "success": True
            },
            {
                "task_id": "task2",
                "result": "Result 2",
                "success": True
            }
        ]

        has_failures = self.validator.has_failures(results)

        # Check that no failures are detected
        self.assertFalse(has_failures)

class TestFallbackManager(unittest.TestCase):
    """Tests for the FallbackManager class."""

    def setUp(self):
        """Set up test fixtures."""
        self.fallback_manager = FallbackManager(max_retries=2, base_delay=0.1)

        # Create mock specialist functions
        self.specialist = MagicMock()
        self.specialist.side_effect = [
            ValueError("First error"),  # First call fails
            "Retry success"             # Second call succeeds
        ]

    def test_handle_failure_retry_success(self):
        """Test handling a failure with successful retry."""
        result = {
            "task_id": "task1",
            "error": "Test error",
            "success": False,
            "task_description": "Test task",
            "context": {}
        }

        new_result = self.fallback_manager.handle_failure(result, self.specialist)

        # Check that retry was successful
        self.assertTrue(new_result["success"])
        self.assertEqual(new_result["result"], "Retry success")
        self.assertEqual(new_result["retry_count"], 1)

    def test_handle_failure_max_retries(self):
        """Test handling a failure with maximum retries reached."""
        # Set up specialist to always fail
        self.specialist.side_effect = ValueError("Persistent error")

        result = {
            "task_id": "task1",
            "error": "Test error",
            "success": False,
            "task_description": "Test task",
            "context": {}
        }

        # First retry
        new_result = self.fallback_manager.handle_failure(result, self.specialist)

        # Second retry
        new_result = self.fallback_manager.handle_failure(new_result, self.specialist)

        # Third attempt (should use fallback)
        final_result = self.fallback_manager.handle_failure(new_result, self.specialist)

        # Check that fallback was applied after max retries
        self.assertIn("fallback_applied", final_result)
        self.assertTrue(final_result["fallback_applied"])

    def test_handle_failure_no_retry(self):
        """Test handling a failure without retry."""
        result = {
            "task_id": "task1",
            "error": "Test error",
            "success": False
        }

        new_result = self.fallback_manager.handle_failure(result, self.specialist, retry=False)

        # Check that fallback was applied immediately
        self.assertIn("fallback_applied", new_result)
        self.assertTrue(new_result["fallback_applied"])

    def test_create_fallback_plan(self):
        """Test creating a fallback plan."""
        task = "Original task"
        error = "Original error"

        fallback_plan = self.fallback_manager.create_fallback_plan(task, error)

        # Check that fallback plan is created correctly
        self.assertEqual(len(fallback_plan), 2)
        self.assertTrue(all(subtask.get("is_fallback") for subtask in fallback_plan))

    def test_register_fallback_specialist(self):
        """Test registering a fallback specialist."""
        self.fallback_manager.register_fallback_specialist("primary", "fallback")

        # Check that fallback specialist is registered
        self.assertEqual(self.fallback_manager.get_fallback_specialist("primary"), "fallback")

    def test_reset_retry_count(self):
        """Test resetting retry count."""
        # Set retry count
        self.fallback_manager.retry_counts["task1"] = 2

        # Reset retry count
        self.fallback_manager.reset_retry_count("task1")

        # Check that retry count is reset
        self.assertNotIn("task1", self.fallback_manager.retry_counts)

if __name__ == "__main__":
    unittest.main()
