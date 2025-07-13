"""
ADK Compliance Tests for Workflow Managers

Ensures all workflow managers properly use Google ADK state management
patterns without manual state tracking.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest
from google.adk.agents import LlmAgent

from agents.workflows.loop_workflow_manager_v2 import LoopWorkflowManagerV2
from agents.workflows.parallel_workflow_manager_v2 import ParallelWorkflowManagerV2
from agents.workflows.sequential_workflow_manager_v2 import SequentialWorkflowManagerV2


class TestSequentialWorkflowADKCompliance:
    """Test ADK compliance for Sequential Workflow Manager."""

    @pytest.fixture
    def manager(self):
        return SequentialWorkflowManagerV2()

    @pytest.fixture
    def sample_agents(self):
        """Create sample agents for testing."""
        return [
            LlmAgent(
                name="Agent1", model="gemini-2.5-flash", description="First agent", instruction="Do task 1", tools=[]
            ),
            LlmAgent(
                name="Agent2", model="gemini-2.5-flash", description="Second agent", instruction="Do task 2", tools=[]
            ),
        ]

    def test_no_manual_state_arrays(self, manager):
        """Ensure no manual state tracking arrays exist."""
        # Check that manager doesn't have manual state tracking
        assert not hasattr(manager, "task_results")
        assert not hasattr(manager, "state_array")
        assert not hasattr(manager, "results")

        # Only workflow metadata should be tracked
        assert hasattr(manager, "workflows")
        assert isinstance(manager.workflows, dict)

    def test_creates_state_schema(self, manager, sample_agents):
        """Test that proper state schema is created."""
        task_chain = [{"name": "task1", "agent": sample_agents[0]}, {"name": "task2", "agent": sample_agents[1]}]

        state_schema = manager._build_state_schema(task_chain)

        # Verify schema structure
        assert state_schema["type"] == "object"
        assert "properties" in state_schema

        # Check workflow metadata properties
        props = state_schema["properties"]
        assert "workflow_id" in props
        assert "started_at" in props
        assert "current_step" in props

        # Check step result properties
        assert "step_1_result" in props
        assert "step_2_result" in props

        # Verify step result structure
        step_schema = props["step_1_result"]
        assert step_schema["type"] == "object"
        assert "output" in step_schema["properties"]
        assert "metadata" in step_schema["properties"]

    def test_agents_have_state_handlers(self, manager):
        """Test that agents are configured with state extractors/injectors."""
        task_chain = [{"name": "task1", "instructions": "Do something"}]

        agent = manager._create_state_aware_agent(task_chain[0], 0, task_chain)

        # Verify state handlers are attached
        assert hasattr(agent, "state_extractor")
        assert hasattr(agent, "state_injector")
        assert callable(agent.state_extractor)
        assert callable(agent.state_injector)

    def test_state_extractor_format(self, manager):
        """Test state extractor produces correct format."""
        extractor = manager._create_state_extractor(0)

        # Test extraction
        result = extractor("Test output")

        assert "step_1_result" in result
        assert result["step_1_result"]["output"] == "Test output"
        assert "metadata" in result["step_1_result"]
        assert "completed_at" in result["step_1_result"]

    def test_state_injector_filters_context(self, manager):
        """Test state injector provides only relevant context."""
        injector = manager._create_state_injector(1)  # Second step

        # Mock full state
        full_state = {
            "workflow_id": "wf_123",
            "step_1_result": {"output": "Previous result"},
            "step_2_result": {"output": "Should not see this"},
            "step_3_result": {"output": "Should not see this"},
        }

        # Test injection
        injected = injector(full_state)

        assert injected["workflow_id"] == "wf_123"
        assert injected["current_step"] == 2
        assert "step_1_result" in injected  # Previous result
        assert "step_2_result" not in injected  # Current step
        assert "step_3_result" not in injected  # Future step

    @patch("google.adk.agents.SequentialAgent")
    def test_workflow_uses_adk_sequential_agent(self, mock_sequential, manager):
        """Test that workflow creates proper ADK SequentialAgent."""
        task_chain = [{"name": "task1"}]

        workflow = manager.create_sequential_workflow(task_chain, "TestWorkflow")

        # Verify SequentialAgent was created with correct params
        mock_sequential.assert_called_once()
        call_args = mock_sequential.call_args[1]

        assert call_args["name"] == "TestWorkflow"
        assert "sub_agents" in call_args
        assert call_args["state_propagation_mode"] == "sequential"
        assert "initial_state" in call_args


class TestParallelWorkflowADKCompliance:
    """Test ADK compliance for Parallel Workflow Manager."""

    @pytest.fixture
    def manager(self):
        return ParallelWorkflowManagerV2()

    @pytest.fixture
    def sample_agents(self):
        return [
            LlmAgent(
                name=f"Agent{i}", model="gemini-2.5-flash", description=f"Agent {i}", instruction=f"Task {i}", tools=[]
            )
            for i in range(3)
        ]

    def test_no_manual_result_aggregation(self, manager):
        """Ensure no manual result collection arrays."""
        assert not hasattr(manager, "results")
        assert not hasattr(manager, "parallel_results")
        assert not hasattr(manager, "resource_pool")  # Old pattern

    def test_parallel_state_schema(self, manager, sample_agents):
        """Test parallel execution state schema."""
        state_schema = manager._build_parallel_state_schema(sample_agents)

        # Check parallel-specific properties
        props = state_schema["properties"]
        assert "parallel_execution" in props
        assert "parallel_results" in props

        # Verify each agent gets result namespace
        parallel_props = props["parallel_results"]["properties"]
        for agent in sample_agents:
            assert agent.name in parallel_props
            agent_schema = parallel_props[agent.name]
            assert "result" in agent_schema["properties"]
            assert "status" in agent_schema["properties"]

    def test_agents_configured_for_parallel(self, manager, sample_agents):
        """Test agents are properly configured for parallel execution."""
        configured = manager._configure_parallel_agent(sample_agents[0], 0)

        # Check parallel-aware instructions
        assert "parallel workflow" in configured.instruction.lower()
        assert "ADK manages all state coordination" in configured.instruction

        # Verify state handlers
        assert hasattr(configured, "state_extractor")
        assert hasattr(configured, "state_injector")

    @patch("google.adk.agents.ParallelAgent")
    def test_workflow_uses_adk_parallel_agent(self, mock_parallel, manager, sample_agents):
        """Test that workflow creates proper ADK ParallelAgent."""
        workflow = manager.create_parallel_workflow(sample_agents, "TestParallel")

        # Verify ParallelAgent creation
        mock_parallel.assert_called_once()
        call_args = mock_parallel.call_args[1]

        assert call_args["name"] == "TestParallel"
        assert call_args["aggregation_mode"] == "all"
        assert call_args["max_concurrency"] == 3
        assert "timeout_seconds" in call_args
        assert "initial_state" in call_args

    def test_resource_limits_applied(self, manager, sample_agents):
        """Test resource limits are passed to ADK."""
        resource_limits = {"max_concurrent": 2, "timeout": 60}

        with patch("google.adk.agents.ParallelAgent") as mock_parallel:
            workflow = manager.create_parallel_workflow(sample_agents, "Limited", resource_limits=resource_limits)

            call_args = mock_parallel.call_args[1]
            assert call_args["max_concurrency"] == 2
            assert call_args["timeout_seconds"] == 60


class TestLoopWorkflowADKCompliance:
    """Test ADK compliance for Loop Workflow Manager."""

    @pytest.fixture
    def manager(self):
        return LoopWorkflowManagerV2()

    @pytest.fixture
    def sample_agent(self):
        return LlmAgent(
            name="IterativeAgent",
            model="gemini-2.5-flash",
            description="Iterative processor",
            instruction="Process iteratively",
            tools=[],
        )

    def test_no_manual_iteration_tracking(self, manager):
        """Ensure no manual iteration result lists."""
        assert not hasattr(manager, "iteration_results")
        assert not hasattr(manager, "loop_states")

    def test_loop_state_schema(self, manager):
        """Test loop-specific state schema."""
        state_schema = manager._build_loop_state_schema("fixed")

        props = state_schema["properties"]
        assert "loop_id" in props
        assert "loop_type" in props
        assert "current_iteration" in props
        assert "iteration_history" in props

        # Check iteration history structure
        history_schema = props["iteration_history"]
        assert history_schema["type"] == "array"
        item_props = history_schema["items"]["properties"]
        assert "iteration" in item_props
        assert "result" in item_props
        assert "continue_loop" in item_props

    def test_fixed_loop_creates_correct_agents(self, manager, sample_agent):
        """Test fixed loops create exact number of agents."""
        iterations = 5
        agents = manager._create_fixed_loop_agents(sample_agent, iterations)

        assert len(agents) == iterations

        # Check each iteration agent
        for i, agent in enumerate(agents):
            assert f"Iteration_{i+1}" in agent.name
            assert f"iteration {i + 1} of {iterations}" in agent.instruction

    def test_conditional_loop_safety_limit(self, manager, sample_agent):
        """Test conditional loops have safety limits."""

        def always_true(i, s):
            return True

        agents = manager._create_conditional_loop_agents(sample_agent, always_true)

        # Should create reasonable number, not infinite
        assert len(agents) == 20  # Safety limit

    def test_loop_validation(self, manager):
        """Test loop configuration validation."""
        agent = Mock()

        # Fixed loop needs iterations
        with pytest.raises(ValueError, match="positive iterations"):
            manager.create_loop_workflow(agent, "fixed", iterations=0)

        # Safety limit
        with pytest.raises(ValueError, match="cannot exceed 100"):
            manager.create_loop_workflow(agent, "fixed", iterations=101)

        # Conditional needs function
        with pytest.raises(ValueError, match="condition function"):
            manager.create_loop_workflow(agent, "conditional")

    @patch("google.adk.agents.SequentialAgent")
    def test_loop_uses_sequential_pattern(self, mock_sequential, manager, sample_agent):
        """Test loops are implemented using ADK SequentialAgent."""
        workflow = manager.create_loop_workflow(sample_agent, "fixed", iterations=3, workflow_name="TestLoop")

        # Loops use Sequential pattern internally
        mock_sequential.assert_called_once()
        call_args = mock_sequential.call_args[1]

        assert call_args["name"] == "TestLoop"
        assert len(call_args["sub_agents"]) == 3  # 3 iterations
        assert call_args["state_propagation_mode"] == "sequential"


class TestADKComplianceMigration:
    """Test migration helpers work correctly."""

    def test_sequential_migration_wrapper(self):
        """Test v1 compatibility wrapper uses v2."""
        from agents.workflows.sequential_workflow_manager_v2 import SequentialWorkflowManager

        manager = SequentialWorkflowManager()

        # Should be instance of V2
        assert isinstance(manager, SequentialWorkflowManagerV2)

        # Should have V2 methods
        assert hasattr(manager, "_build_state_schema")
        assert hasattr(manager, "_create_state_aware_agent")

    def test_parallel_migration_wrapper(self):
        """Test parallel compatibility wrapper."""
        from agents.workflows.parallel_workflow_manager_v2 import ParallelWorkflowManager

        manager = ParallelWorkflowManager()
        assert isinstance(manager, ParallelWorkflowManagerV2)

    def test_loop_migration_wrapper(self):
        """Test loop compatibility wrapper."""
        from agents.workflows.loop_workflow_manager_v2 import LoopWorkflowManager

        manager = LoopWorkflowManager()
        assert isinstance(manager, LoopWorkflowManagerV2)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
