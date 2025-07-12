"""
Unit tests for Loop Workflow Manager

Tests fixed loops, conditional loops, adaptive loops, and loop control mechanisms.
"""

import json
import time
from unittest.mock import MagicMock, Mock, patch

import pytest

from agents.workflows.loop_workflow_manager import LoopConditionEvaluator, LoopStateManager, LoopWorkflowManager


class TestLoopStateManager:
    """Test suite for Loop State Manager."""

    @pytest.fixture
    def state_manager(self):
        """Create a state manager instance."""
        return LoopStateManager()

    def test_init_loop(self, state_manager):
        """Test loop initialization."""
        loop_id = "test_loop"
        state_manager.init_loop(loop_id)

        assert loop_id in state_manager.iterations
        assert state_manager.iterations[loop_id] == 0
        assert loop_id in state_manager.accumulated_results
        assert state_manager.accumulated_results[loop_id] == []
        assert not state_manager.break_conditions_met.get(loop_id, False)

    def test_increment_iteration(self, state_manager):
        """Test iteration incrementing."""
        loop_id = "test_loop"
        state_manager.init_loop(loop_id)

        # First increment
        count = state_manager.increment_iteration(loop_id)
        assert count == 1

        # Second increment
        count = state_manager.increment_iteration(loop_id)
        assert count == 2

    def test_add_result(self, state_manager):
        """Test adding iteration results."""
        loop_id = "test_loop"
        state_manager.init_loop(loop_id)
        state_manager.increment_iteration(loop_id)

        # Add result
        state_manager.add_result(loop_id, "result_1")

        results = state_manager.accumulated_results[loop_id]
        assert len(results) == 1
        assert results[0]["iteration"] == 1
        assert results[0]["result"] == "result_1"
        assert "timestamp" in results[0]

    def test_break_condition(self, state_manager):
        """Test break condition management."""
        loop_id = "test_loop"
        state_manager.init_loop(loop_id)

        # Initially should not break
        assert not state_manager.should_break(loop_id)

        # Set break condition
        state_manager.set_break_condition(loop_id)
        assert state_manager.should_break(loop_id)

    def test_loop_summary(self, state_manager):
        """Test loop summary generation."""
        loop_id = "test_loop"
        state_manager.init_loop(loop_id)

        # Add some iterations and results
        for i in range(3):
            state_manager.increment_iteration(loop_id)
            state_manager.add_result(loop_id, f"result_{i+1}")

        summary = state_manager.get_loop_summary(loop_id)

        assert summary["total_iterations"] == 3
        assert len(summary["accumulated_results"]) == 3
        assert not summary["break_condition_met"]


class TestLoopConditionEvaluator:
    """Test suite for Loop Condition Evaluator."""

    def test_numeric_conditions(self):
        """Test numeric condition evaluation."""
        evaluator = LoopConditionEvaluator()

        assert evaluator.evaluate_numeric_condition(5, 10, "<") is True
        assert evaluator.evaluate_numeric_condition(10, 10, "<=") is True
        assert evaluator.evaluate_numeric_condition(15, 10, ">") is True
        assert evaluator.evaluate_numeric_condition(10, 10, ">=") is True
        assert evaluator.evaluate_numeric_condition(10, 10, "==") is True
        assert evaluator.evaluate_numeric_condition(5, 10, "!=") is True

        # False cases
        assert evaluator.evaluate_numeric_condition(15, 10, "<") is False
        assert evaluator.evaluate_numeric_condition(5, 10, ">") is False
        assert evaluator.evaluate_numeric_condition(5, 10, "==") is False

    def test_state_condition(self):
        """Test state-based condition evaluation."""
        evaluator = LoopConditionEvaluator()

        # Valid condition function
        def check_threshold(state):
            return state.get("value", 0) > 100

        assert evaluator.evaluate_state_condition({"value": 150}, check_threshold) is True
        assert evaluator.evaluate_state_condition({"value": 50}, check_threshold) is False

        # Invalid condition function
        def bad_condition(state):
            raise ValueError("Error in condition")

        assert evaluator.evaluate_state_condition({}, bad_condition) is False

    def test_convergence_evaluation(self):
        """Test convergence evaluation."""
        evaluator = LoopConditionEvaluator()

        # Not enough data
        assert evaluator.evaluate_convergence([1.0]) is False

        # Converged data
        assert evaluator.evaluate_convergence([1.0, 1.005], threshold=0.01) is True

        # Not converged
        assert evaluator.evaluate_convergence([1.0, 2.0], threshold=0.01) is False

        # Non-numeric data
        assert evaluator.evaluate_convergence(["a", "b"]) is False


class TestLoopWorkflowManager:
    """Test suite for Loop Workflow Manager."""

    @pytest.fixture
    def manager(self):
        """Create a workflow manager instance."""
        return LoopWorkflowManager()

    @pytest.fixture
    def sample_loop_task(self):
        """Create a sample loop task."""
        return {
            "name": "process_item",
            "description": "Process data item",
            "instruction": "Process the current item and prepare for next",
            "tools": [],
            "accumulate_results": True,
        }

    def test_create_fixed_loop_success(self, manager, sample_loop_task):
        """Test successful fixed loop creation."""
        workflow = manager.create_fixed_loop_workflow(
            loop_task=sample_loop_task, iterations=5, workflow_name="TestFixedLoop"
        )

        assert workflow is not None
        assert workflow.name == "TestFixedLoop"
        assert len(workflow.sub_agents) == 5

        # Verify agent naming
        for i, agent in enumerate(workflow.sub_agents):
            assert agent.name == f"Loop_{i+1}_process_item"
            assert agent.output_key == f"iteration_{i+1}_result"

    def test_fixed_loop_validation(self, manager, sample_loop_task):
        """Test fixed loop validation."""
        # Invalid iterations
        with pytest.raises(ValueError, match="Iterations must be at least 1"):
            manager.create_fixed_loop_workflow(sample_loop_task, 0)

        with pytest.raises(ValueError, match="Iterations cannot exceed 100"):
            manager.create_fixed_loop_workflow(sample_loop_task, 101)

    def test_conditional_loop_creation(self, manager, sample_loop_task):
        """Test conditional loop creation."""
        condition = {"type": "numeric", "target": 100, "operator": ">"}

        workflow = manager.create_conditional_loop_workflow(
            loop_task=sample_loop_task, condition=condition, max_iterations=20, workflow_name="TestConditionalLoop"
        )

        assert workflow is not None
        assert workflow.name == "TestConditionalLoop"
        # Should have condition evaluator + initial iterations
        assert len(workflow.sub_agents) >= 2

        # First agent should be condition evaluator
        assert workflow.sub_agents[0].name == "LoopConditionEvaluator"

    def test_conditional_loop_validation(self, manager, sample_loop_task):
        """Test conditional loop validation."""
        # Missing condition type
        with pytest.raises(ValueError, match="Condition must have a 'type' field"):
            manager.create_conditional_loop_workflow(sample_loop_task, condition={})

        # Invalid condition type
        with pytest.raises(ValueError, match="Invalid condition type"):
            manager.create_conditional_loop_workflow(sample_loop_task, condition={"type": "invalid_type"})

        # Max iterations limit
        with pytest.raises(ValueError, match="Max iterations cannot exceed 100"):
            manager.create_conditional_loop_workflow(
                sample_loop_task, condition={"type": "numeric"}, max_iterations=101
            )

    def test_adaptive_loop_creation(self, manager, sample_loop_task):
        """Test adaptive loop creation."""
        strategy = {
            "type": "parameter_tuning",
            "parameters": ["learning_rate", "batch_size"],
            "optimization_target": "accuracy",
            "max_adaptations": 5,
        }

        workflow = manager.create_adaptive_loop_workflow(
            loop_task=sample_loop_task, adaptation_strategy=strategy, workflow_name="TestAdaptiveLoop"
        )

        assert workflow is not None
        assert workflow.name == "TestAdaptiveLoop"
        # Should have controller + adaptation iterations
        assert len(workflow.sub_agents) == 6  # controller + 5 adaptations

        # First agent should be adaptive controller
        assert workflow.sub_agents[0].name == "AdaptiveLoopController"

    def test_adaptive_loop_validation(self, manager, sample_loop_task):
        """Test adaptive loop validation."""
        # Missing strategy type
        with pytest.raises(ValueError, match="Adaptation strategy must have a 'type' field"):
            manager.create_adaptive_loop_workflow(sample_loop_task, adaptation_strategy={})

        # Invalid strategy type
        with pytest.raises(ValueError, match="Invalid adaptation type"):
            manager.create_adaptive_loop_workflow(sample_loop_task, adaptation_strategy={"type": "invalid_strategy"})

    def test_task_validation(self, manager):
        """Test loop task validation."""
        # Missing name
        with pytest.raises(ValueError, match="Loop task must have a 'name' field"):
            manager._validate_loop_task({"instruction": "test"})

        # Missing instruction
        with pytest.raises(ValueError, match="Loop task must have an 'instruction' field"):
            manager._validate_loop_task({"name": "test"})

        # Too many tools
        too_many_tools = [Mock() for _ in range(7)]
        with pytest.raises(ValueError, match="has 7 tools, max is 6"):
            manager._validate_loop_task({"name": "test", "instruction": "test", "tools": too_many_tools})

    def test_loop_status_tracking(self, manager, sample_loop_task):
        """Test loop status tracking."""
        workflow_name = "StatusTestLoop"

        # Create a fixed loop
        workflow = manager.create_fixed_loop_workflow(sample_loop_task, iterations=3, workflow_name=workflow_name)

        # Check initial status
        status = manager.get_loop_status(workflow_name)
        assert status["total_iterations"] == 0
        assert status["accumulated_results"] == []
        assert not status["break_condition_met"]

    def test_loop_termination_logic(self, manager, sample_loop_task):
        """Test loop termination conditions."""
        workflow_name = "TerminationTestLoop"

        # Create conditional loop
        workflow = manager.create_conditional_loop_workflow(
            sample_loop_task,
            condition={"type": "numeric", "target": 10, "operator": ">"},
            max_iterations=5,
            workflow_name=workflow_name,
        )

        # Test break condition
        manager.state_manager.init_loop(workflow_name)
        assert not manager.should_terminate_loop(workflow_name, {})

        manager.state_manager.set_break_condition(workflow_name)
        assert manager.should_terminate_loop(workflow_name, {})

        # Test iteration limit
        manager.state_manager.init_loop(workflow_name)  # Reset
        for _ in range(5):
            manager.state_manager.increment_iteration(workflow_name)
        assert manager.should_terminate_loop(workflow_name, {})

    def test_instruction_generation(self, manager):
        """Test instruction generation for different loop types."""
        base_instruction = "Process data"

        # Fixed iteration instruction
        fixed_instruction = manager._create_iteration_instruction(base_instruction, 2, 5, True)
        assert "Iteration 2 of 5" in fixed_instruction
        assert "Previous iterations: 1" in fixed_instruction
        assert "Previous results are available" in fixed_instruction

        # Conditional instruction
        condition = {"type": "convergence", "threshold": 0.01}
        conditional_instruction = manager._create_conditional_instruction(base_instruction, 3, condition)
        assert "Conditional Loop - Iteration 3" in conditional_instruction
        assert "Loop Condition: convergence" in conditional_instruction
        assert "LOOP_CONDITION_MET" in conditional_instruction

        # Adaptive instruction
        strategy = {"type": "parameter_tuning", "optimization_target": "accuracy"}
        adaptive_instruction = manager._create_adaptive_instruction(base_instruction, 4, strategy)
        assert "Adaptive Loop - Iteration 4" in adaptive_instruction
        assert "Adaptation Strategy: parameter_tuning" in adaptive_instruction
        assert "Optimize for accuracy" in adaptive_instruction


class TestIntegration:
    """Integration tests for Loop Workflow Manager."""

    def test_fixed_loop_workflow_execution(self):
        """Test complete fixed loop workflow."""
        manager = LoopWorkflowManager()

        # Create data processing loop
        task = {
            "name": "process_batch",
            "description": "Process data batch",
            "instruction": "Process current batch and accumulate statistics",
            "accumulate_results": True,
        }

        workflow = manager.create_fixed_loop_workflow(loop_task=task, iterations=3, workflow_name="BatchProcessingLoop")

        # Verify structure
        assert len(workflow.sub_agents) == 3
        assert all(agent.name.startswith("Loop_") for agent in workflow.sub_agents)

        # Simulate execution
        for i in range(3):
            manager.state_manager.increment_iteration("BatchProcessingLoop")
            manager.state_manager.add_result("BatchProcessingLoop", f"batch_{i+1}_processed")

        status = manager.get_loop_status("BatchProcessingLoop")
        assert status["total_iterations"] == 3
        assert len(status["accumulated_results"]) == 3

    def test_conditional_loop_convergence(self):
        """Test conditional loop with convergence condition."""
        manager = LoopWorkflowManager()

        # Create optimization loop
        task = {
            "name": "optimize",
            "description": "Optimization iteration",
            "instruction": "Optimize parameters and report improvement",
        }

        condition = {"type": "convergence", "threshold": 0.001, "metric": "loss"}

        workflow = manager.create_conditional_loop_workflow(
            loop_task=task, condition=condition, max_iterations=10, workflow_name="OptimizationLoop"
        )

        # Verify structure includes condition evaluator
        assert workflow.sub_agents[0].name == "LoopConditionEvaluator"

        # Simulate convergence
        results = [1.0, 0.5, 0.25, 0.125, 0.0625, 0.0625]  # Last two values are the same

        for i, result in enumerate(results):
            manager.state_manager.increment_iteration("OptimizationLoop")
            manager.state_manager.add_result("OptimizationLoop", result)

            # Check convergence
            accumulated = [r["result"] for r in manager.state_manager.accumulated_results["OptimizationLoop"]]
            if len(accumulated) >= 2:
                converged = manager.condition_evaluator.evaluate_convergence(
                    accumulated[-2:], threshold=0.01  # Use larger threshold
                )
                if converged:
                    manager.state_manager.set_break_condition("OptimizationLoop")
                    break

        assert manager.should_terminate_loop("OptimizationLoop", {})

    def test_adaptive_loop_parameter_tuning(self):
        """Test adaptive loop with parameter tuning."""
        manager = LoopWorkflowManager()

        # Create model training loop
        task = {
            "name": "train_iteration",
            "description": "Training iteration with parameters",
            "instruction": "Train model with current parameters",
        }

        strategy = {
            "type": "parameter_tuning",
            "parameters": ["lr", "batch_size"],
            "optimization_target": "val_accuracy",
            "max_adaptations": 4,
        }

        workflow = manager.create_adaptive_loop_workflow(
            loop_task=task, adaptation_strategy=strategy, workflow_name="ModelTuningLoop"
        )

        # Verify structure
        assert workflow.sub_agents[0].name == "AdaptiveLoopController"
        assert len(workflow.sub_agents) == 5  # controller + 4 adaptations

        # Simulate adaptive execution
        accuracies = [0.7, 0.75, 0.82, 0.85]

        for i, acc in enumerate(accuracies):
            manager.state_manager.increment_iteration("ModelTuningLoop")
            manager.state_manager.add_result(
                "ModelTuningLoop",
                {"accuracy": acc, "parameters": {"lr": 0.01 * (0.5**i), "batch_size": 32 * (2**i)}},
            )

        summary = manager.get_loop_status("ModelTuningLoop")
        assert summary["total_iterations"] == 4

        # Verify improvement trend
        results = summary["accumulated_results"]
        accuracies_recorded = [r["result"]["accuracy"] for r in results]
        assert accuracies_recorded == [0.7, 0.75, 0.82, 0.85]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
