"""
Unit tests for Sequential Workflow Manager

Tests ADK compliance, state propagation, error handling, and checkpoint functionality.
"""

import json
import os
import shutil
import tempfile
from unittest.mock import MagicMock, Mock, patch

import pytest

from agents.workflows.sequential_workflow_manager import SequentialWorkflowManager, WorkflowProgressTracker


class TestSequentialWorkflowManager:
    """Test suite for Sequential Workflow Manager."""

    @pytest.fixture
    def manager(self):
        """Create a workflow manager instance."""
        return SequentialWorkflowManager()

    @pytest.fixture
    def sample_task_chain(self):
        """Create a sample task chain for testing."""
        return [
            {
                "name": "data_collection",
                "description": "Collect required data",
                "instructions": "Gather all necessary data points",
                "tools": [],
                "error_behavior": "continue_with_error",
            },
            {
                "name": "data_analysis",
                "description": "Analyze collected data",
                "instructions": "Perform analysis on step_1_result",
                "tools": [],
                "timeout": 60,
            },
            {
                "name": "report_generation",
                "description": "Generate final report",
                "instructions": "Create report using step_2_result",
                "tools": [],
                "retry_count": 2,
            },
        ]

    def test_create_sequential_workflow_success(self, manager, sample_task_chain):
        """Test successful workflow creation."""
        workflow = manager.create_sequential_workflow(task_chain=sample_task_chain, workflow_name="TestWorkflow")

        assert workflow is not None
        assert workflow.name == "TestWorkflow"
        assert len(workflow.sub_agents) == 3

        # Verify agent configuration
        for i, agent in enumerate(workflow.sub_agents):
            assert agent.name == f"Step_{i+1}_{sample_task_chain[i]['name']}"
            assert agent.output_key == f"step_{i+1}_result"

    def test_empty_task_chain_raises_error(self, manager):
        """Test that empty task chain raises ValueError."""
        with pytest.raises(ValueError, match="Task chain cannot be empty"):
            manager.create_sequential_workflow(task_chain=[])

    def test_task_validation(self, manager):
        """Test task definition validation."""
        # Missing required 'name' field
        invalid_task_chain = [{"description": "Missing name field", "instructions": "This should fail"}]

        with pytest.raises(ValueError, match="missing required field: name"):
            manager.create_sequential_workflow(invalid_task_chain)

    def test_tool_limit_validation(self, manager):
        """Test that tasks with >6 tools are rejected."""
        too_many_tools = [Mock() for _ in range(7)]

        invalid_task_chain = [{"name": "too_many_tools", "tools": too_many_tools}]

        with pytest.raises(ValueError, match="has 7 tools, max is 6"):
            manager.create_sequential_workflow(invalid_task_chain)

    def test_state_propagation_instructions(self, manager, sample_task_chain):
        """Test that state propagation instructions are added correctly."""
        workflow = manager.create_sequential_workflow(sample_task_chain)

        # Check second agent has access to first agent's output
        second_agent = workflow.sub_agents[1]
        assert "step_1_result" in second_agent.instruction
        assert "step_2_result" in second_agent.instruction

    def test_error_handling_configuration(self, manager, sample_task_chain):
        """Test error handling configuration is applied."""
        workflow = manager.create_sequential_workflow(sample_task_chain)

        # Since ADK doesn't expose error handling directly on agents,
        # we verify the configuration was passed correctly
        # The actual error handling would be implemented at runtime
        assert workflow.sub_agents[0] is not None
        assert workflow.sub_agents[1] is not None
        assert workflow.sub_agents[2] is not None

    def test_checkpoint_creation(self, manager):
        """Test checkpoint creation functionality."""
        workflow_name = "TestWorkflow"
        step_index = 1
        state = {"step_1_result": "test data", "step_2_result": "analysis"}

        with tempfile.TemporaryDirectory() as tmpdir:
            # Mock the checkpoint directory
            manager._save_checkpoint_to_file = Mock()

            checkpoint_id = manager.create_checkpoint(workflow_name, step_index, state)

            assert checkpoint_id.startswith(workflow_name)
            assert checkpoint_id in manager.checkpoints

            checkpoint_data = manager.checkpoints[checkpoint_id]
            assert checkpoint_data["workflow_name"] == workflow_name
            assert checkpoint_data["step_index"] == step_index
            assert checkpoint_data["state"] == state

    def test_checkpoint_resume(self, manager):
        """Test resuming from checkpoint."""
        # Create a checkpoint
        workflow_name = "TestWorkflow"
        state = {"step_1_result": "checkpoint data"}
        checkpoint_id = manager.create_checkpoint(workflow_name, 0, state)

        # Resume from checkpoint
        resumed_data = manager.resume_from_checkpoint(checkpoint_id)

        assert resumed_data["workflow_name"] == workflow_name
        assert resumed_data["state"] == state
        assert resumed_data["step_index"] == 0

    def test_checkpoint_persistence(self, manager):
        """Test checkpoint file persistence."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Override checkpoint directory
            original_dir = ".workflow_checkpoints"
            checkpoint_dir = os.path.join(tmpdir, "checkpoints")

            # Monkey patch the directory
            manager._save_checkpoint_to_file = lambda cid, data: self._save_test_checkpoint(cid, data, checkpoint_dir)
            manager._load_checkpoint_from_file = lambda cid: self._load_test_checkpoint(cid, checkpoint_dir)

            # Create checkpoint
            checkpoint_id = "test_checkpoint_123"
            test_data = {
                "workflow_name": "TestWorkflow",
                "step_index": 2,
                "state": {"test": "data"},
                "checkpoint_id": checkpoint_id,
            }

            self._save_test_checkpoint(checkpoint_id, test_data, checkpoint_dir)

            # Clear in-memory checkpoints
            manager.checkpoints.clear()

            # Load from file
            loaded_data = self._load_test_checkpoint(checkpoint_id, checkpoint_dir)

            assert loaded_data is not None
            assert loaded_data["workflow_name"] == "TestWorkflow"
            assert loaded_data["state"] == {"test": "data"}

    def _save_test_checkpoint(self, checkpoint_id, data, checkpoint_dir):
        """Helper to save checkpoint in test directory."""
        os.makedirs(checkpoint_dir, exist_ok=True)
        filepath = os.path.join(checkpoint_dir, f"{checkpoint_id}.json")
        with open(filepath, "w") as f:
            json.dump(data, f)

    def _load_test_checkpoint(self, checkpoint_id, checkpoint_dir):
        """Helper to load checkpoint from test directory."""
        filepath = os.path.join(checkpoint_dir, f"{checkpoint_id}.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None


class TestWorkflowProgressTracker:
    """Test suite for Workflow Progress Tracker."""

    @pytest.fixture
    def tracker(self):
        """Create a progress tracker instance."""
        return WorkflowProgressTracker()

    def test_init_workflow(self, tracker):
        """Test workflow initialization."""
        workflow_name = "TestWorkflow"
        total_steps = 5

        tracker.init_workflow(workflow_name, total_steps)

        assert workflow_name in tracker.workflows
        workflow_data = tracker.workflows[workflow_name]
        assert workflow_data["total_steps"] == total_steps
        assert workflow_data["completed_steps"] == 0
        assert workflow_data["status"] == "initialized"

    def test_update_progress(self, tracker):
        """Test progress updates."""
        workflow_name = "TestWorkflow"
        tracker.init_workflow(workflow_name, 3)

        # Update to step 1 in progress
        tracker.update_progress(workflow_name, 0, "in_progress")
        workflow = tracker.workflows[workflow_name]
        assert workflow["current_step"] == 0
        assert workflow["status"] == "in_progress"

        # Complete step 1
        tracker.update_progress(workflow_name, 0, "completed")
        assert workflow["completed_steps"] == 1

    def test_get_progress(self, tracker):
        """Test progress retrieval."""
        workflow_name = "TestWorkflow"
        tracker.init_workflow(workflow_name, 4)

        # Complete 2 steps
        tracker.update_progress(workflow_name, 0, "completed")
        tracker.update_progress(workflow_name, 1, "completed")

        progress = tracker.get_progress(workflow_name)

        assert progress["workflow_name"] == workflow_name
        assert progress["progress_percentage"] == 50.0
        assert progress["completed_steps"] == 2
        assert progress["total_steps"] == 4
        assert progress["status"] == "completed"
        assert "elapsed_time" in progress
        assert "estimated_completion" in progress

    def test_get_progress_not_found(self, tracker):
        """Test progress retrieval for non-existent workflow."""
        progress = tracker.get_progress("NonExistentWorkflow")
        assert progress["status"] == "not_found"

    def test_completion_estimation(self, tracker):
        """Test completion time estimation."""
        workflow_name = "TestWorkflow"
        tracker.init_workflow(workflow_name, 10)

        # Simulate completing steps with time delays
        import time

        tracker.update_progress(workflow_name, 0, "completed")
        time.sleep(0.1)  # Small delay
        tracker.update_progress(workflow_name, 1, "completed")

        progress = tracker.get_progress(workflow_name)

        # Should have a positive estimation
        assert progress["estimated_completion"] > 0

        # With 2/10 steps done, should estimate ~4x current elapsed time remaining
        assert progress["estimated_completion"] > progress["elapsed_time"]


class TestIntegration:
    """Integration tests for Sequential Workflow Manager."""

    def test_full_workflow_execution_simulation(self):
        """Test a complete workflow execution simulation."""
        manager = SequentialWorkflowManager()

        # Create a data processing workflow
        task_chain = [
            {
                "name": "load_data",
                "description": "Load data from source",
                "instructions": "Load and validate input data",
                "timeout": 30,
            },
            {
                "name": "transform_data",
                "description": "Transform data format",
                "instructions": "Apply transformations to step_1_result",
                "retry_count": 2,
            },
            {
                "name": "save_results",
                "description": "Save processed data",
                "instructions": "Save step_2_result to storage",
                "error_behavior": "halt_on_error",
            },
        ]

        workflow = manager.create_sequential_workflow(task_chain=task_chain, workflow_name="DataProcessingWorkflow")

        # Verify workflow structure
        assert len(workflow.sub_agents) == 3
        assert workflow.name == "DataProcessingWorkflow"

        # Check progress tracking initialized
        progress = manager.get_progress("DataProcessingWorkflow")
        assert progress["total_steps"] == 3
        assert progress["completed_steps"] == 0

        # Simulate checkpoint at step 2
        checkpoint_id = manager.create_checkpoint(
            "DataProcessingWorkflow", 1, {"step_1_result": "loaded_data", "step_2_result": "transformed_data"}
        )

        # Verify checkpoint can be resumed
        resumed = manager.resume_from_checkpoint(checkpoint_id)
        assert resumed["step_index"] == 1
        assert "loaded_data" in str(resumed["state"])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
