"""
Tests for Phase 4 State-Driven Workflow Management

This module tests the new state management system including:
- WorkflowState with transitions and persistence
- WorkflowEngine with state-driven execution
- Integration with existing workflow managers
- Error recovery and rollback capabilities
"""

import asyncio
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import redis.asyncio as redis

from agents.workflows.state_driven_integration import (
    EnhancedWorkflowManager,
    WorkflowAdapter
)
from agents.workflows.state_manager import WorkflowState, WorkflowStatus
from agents.workflows.workflow_engine import (
    WorkflowDefinition,
    WorkflowEngine,
    WorkflowStep
)


class TestWorkflowState:
    """Test WorkflowState class functionality"""
    
    @pytest.fixture
    def workflow_state(self):
        """Create a workflow state instance"""
        return WorkflowState(workflow_id="test-workflow-123")
    
    @pytest.fixture
    def redis_mock(self):
        """Create a mock Redis client"""
        mock = MagicMock(spec=redis.Redis)
        mock.setex = AsyncMock()
        mock.get = AsyncMock()
        return mock
    
    @pytest.mark.asyncio
    async def test_state_initialization(self, workflow_state):
        """Test workflow state initialization"""
        assert workflow_state.workflow_id == "test-workflow-123"
        assert workflow_state.current_state == WorkflowStatus.INITIAL
        assert len(workflow_state.state_history) == 0
        assert workflow_state.context["workflow_id"] == "test-workflow-123"
    
    @pytest.mark.asyncio
    async def test_valid_transitions(self, workflow_state):
        """Test valid state transitions"""
        # Initial -> Processing
        assert await workflow_state.can_transition_to(WorkflowStatus.PROCESSING)
        result = await workflow_state.transition_to(WorkflowStatus.PROCESSING)
        assert result is True
        assert workflow_state.current_state == WorkflowStatus.PROCESSING
        
        # Processing -> Complete
        workflow_state.update_context({"processing_complete": True})
        assert await workflow_state.can_transition_to(WorkflowStatus.COMPLETE)
        result = await workflow_state.transition_to(WorkflowStatus.COMPLETE)
        assert result is True
        assert workflow_state.current_state == WorkflowStatus.COMPLETE
    
    @pytest.mark.asyncio
    async def test_invalid_transitions(self, workflow_state):
        """Test invalid state transitions"""
        # Initial -> Complete (invalid)
        assert not await workflow_state.can_transition_to(WorkflowStatus.COMPLETE)
        result = await workflow_state.transition_to(WorkflowStatus.COMPLETE)
        assert result is False
        assert workflow_state.current_state == WorkflowStatus.INITIAL
    
    @pytest.mark.asyncio
    async def test_state_history(self, workflow_state):
        """Test state history tracking"""
        # Make several transitions
        await workflow_state.transition_to(WorkflowStatus.PROCESSING)
        await workflow_state.transition_to(WorkflowStatus.WAITING)
        await workflow_state.transition_to(WorkflowStatus.PROCESSING)
        
        # Check history
        assert len(workflow_state.state_history) == 3
        assert workflow_state.state_history[0].state == WorkflowStatus.INITIAL
        assert workflow_state.state_history[1].state == WorkflowStatus.PROCESSING
        assert workflow_state.state_history[2].state == WorkflowStatus.WAITING
    
    @pytest.mark.asyncio
    async def test_rollback(self, workflow_state):
        """Test state rollback functionality"""
        # Make transitions
        await workflow_state.transition_to(WorkflowStatus.PROCESSING)
        await workflow_state.transition_to(WorkflowStatus.WAITING)
        
        # Rollback one step
        result = await workflow_state.rollback(1)
        assert result is True
        assert workflow_state.current_state == WorkflowStatus.PROCESSING
        
        # Rollback multiple steps
        await workflow_state.transition_to(WorkflowStatus.WAITING)
        await workflow_state.transition_to(WorkflowStatus.PROCESSING)
        result = await workflow_state.rollback(2)
        assert result is True
        assert workflow_state.current_state == WorkflowStatus.PROCESSING
    
    @pytest.mark.asyncio
    async def test_state_persistence(self, workflow_state, redis_mock):
        """Test state persistence to Redis"""
        workflow_state.redis_client = redis_mock
        
        # Make transition
        await workflow_state.transition_to(WorkflowStatus.PROCESSING)
        
        # Verify Redis called
        redis_mock.setex.assert_called_once()
        call_args = redis_mock.setex.call_args
        assert call_args[0][0] == "workflow:state:test-workflow-123"
        assert call_args[0][1] == 86400  # TTL
        
        # Verify data structure
        data = json.loads(call_args[0][2])
        assert data["workflow_id"] == "test-workflow-123"
        assert data["current_state"] == "processing"
        assert len(data["history"]) > 0
    
    @pytest.mark.asyncio
    async def test_load_state(self, workflow_state, redis_mock):
        """Test loading state from Redis"""
        # Prepare mock data
        saved_state = {
            "workflow_id": "test-workflow-123",
            "current_state": "review",
            "context": {"test": "data"},
            "history": [
                {
                    "checkpoint_id": "123",
                    "state": "processing",
                    "context": {},
                    "timestamp": datetime.now().isoformat(),
                    "metadata": {}
                }
            ]
        }
        redis_mock.get.return_value = json.dumps(saved_state)
        workflow_state.redis_client = redis_mock
        
        # Load state
        result = await workflow_state.load_state()
        assert result is True
        assert workflow_state.current_state == WorkflowStatus.REVIEW
        assert workflow_state.context["test"] == "data"
        assert len(workflow_state.state_history) == 1
    
    @pytest.mark.asyncio
    async def test_progress_tracking(self, workflow_state):
        """Test workflow progress tracking"""
        # Initial progress
        progress = await workflow_state.get_progress()
        assert progress["progress_percentage"] == 0
        assert progress["is_complete"] is False
        
        # Processing progress
        await workflow_state.transition_to(WorkflowStatus.PROCESSING)
        progress = await workflow_state.get_progress()
        assert progress["progress_percentage"] == 30
        
        # Complete progress
        workflow_state.update_context({"processing_complete": True})
        await workflow_state.transition_to(WorkflowStatus.COMPLETE)
        progress = await workflow_state.get_progress()
        assert progress["progress_percentage"] == 100
        assert progress["is_complete"] is True


class TestWorkflowEngine:
    """Test WorkflowEngine functionality"""
    
    @pytest.fixture
    def workflow_engine(self):
        """Create a workflow engine instance"""
        return WorkflowEngine()
    
    @pytest.fixture
    def sample_workflow(self):
        """Create a sample workflow definition"""
        steps = [
            WorkflowStep(
                name="validate_input",
                action="validate",
                inputs={"field": "input_data", "validator": "exists"},
                conditions={"success": "process_data", "failure": "error_handler"}
            ),
            WorkflowStep(
                name="process_data",
                action="transform",
                inputs={"source": "input_data", "target": "processed_data", "transform": "upper"},
                conditions={"success": "complete"}
            ),
            WorkflowStep(
                name="error_handler",
                action="log",
                inputs={"message": "Validation failed", "level": "error"}
            ),
            WorkflowStep(
                name="complete",
                action="log",
                inputs={"message": "Workflow completed"}
            )
        ]
        
        return WorkflowDefinition(
            workflow_id="test-workflow",
            name="Test Workflow",
            description="Sample workflow for testing",
            steps=steps,
            initial_step="validate_input"
        )
    
    @pytest.mark.asyncio
    async def test_workflow_registration(self, workflow_engine, sample_workflow):
        """Test workflow registration"""
        workflow_engine.register_workflow(sample_workflow)
        assert "test-workflow" in workflow_engine.definitions
        assert workflow_engine.definitions["test-workflow"] == sample_workflow
    
    @pytest.mark.asyncio
    async def test_workflow_execution(self, workflow_engine, sample_workflow):
        """Test basic workflow execution"""
        workflow_engine.register_workflow(sample_workflow)
        
        # Start workflow with valid data
        execution_id = await workflow_engine.start_workflow(
            "test-workflow",
            initial_context={"input_data": "test"}
        )
        
        assert execution_id.startswith("test-workflow_")
        assert execution_id in workflow_engine.active_workflows
        
        # Wait for completion
        await asyncio.sleep(0.5)
        
        # Check status
        status = await workflow_engine.get_workflow_status(execution_id)
        assert status is not None
    
    @pytest.mark.asyncio
    async def test_parallel_execution(self, workflow_engine):
        """Test parallel step execution"""
        steps = [
            WorkflowStep(
                name="parallel_main",
                action="log",
                inputs={"message": "Main parallel task"},
                parallel_with=["parallel_1", "parallel_2"]
            ),
            WorkflowStep(
                name="parallel_1",
                action="wait",
                inputs={"duration": 0.1}
            ),
            WorkflowStep(
                name="parallel_2",
                action="wait",
                inputs={"duration": 0.1}
            )
        ]
        
        workflow = WorkflowDefinition(
            workflow_id="parallel-test",
            name="Parallel Test",
            steps=steps,
            initial_step="parallel_main"
        )
        
        workflow_engine.register_workflow(workflow)
        
        # Execute workflow
        start_time = asyncio.get_event_loop().time()
        execution_id = await workflow_engine.start_workflow("parallel-test")
        
        # Wait for completion
        await asyncio.sleep(0.3)
        
        # Verify parallel execution (should take ~0.1s, not 0.2s)
        duration = asyncio.get_event_loop().time() - start_time
        assert duration < 0.2  # Parallel execution
    
    @pytest.mark.asyncio
    async def test_workflow_pause_resume(self, workflow_engine, sample_workflow):
        """Test workflow pause and resume"""
        workflow_engine.register_workflow(sample_workflow)
        
        # Start workflow
        execution_id = await workflow_engine.start_workflow(
            "test-workflow",
            initial_context={"input_data": "test"}
        )
        
        # Pause workflow
        await asyncio.sleep(0.1)
        result = await workflow_engine.pause_workflow(execution_id)
        assert result is True
        
        # Check paused state
        state = workflow_engine.active_workflows.get(execution_id)
        if state:
            assert state.current_state == WorkflowStatus.WAITING
        
        # Resume workflow
        result = await workflow_engine.resume_workflow(execution_id)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_custom_action_registration(self, workflow_engine):
        """Test custom action registration"""
        # Define custom action
        async def custom_multiply(context, **kwargs):
            value = context.get(kwargs.get("source", "value"), 1)
            multiplier = kwargs.get("multiplier", 2)
            return {"result": value * multiplier}
        
        # Register action
        workflow_engine.register_action("multiply", custom_multiply)
        assert "multiply" in workflow_engine.actions
        
        # Use in workflow
        steps = [
            WorkflowStep(
                name="multiply_step",
                action="multiply",
                inputs={"source": "input_value", "multiplier": 3}
            )
        ]
        
        workflow = WorkflowDefinition(
            workflow_id="custom-action-test",
            name="Custom Action Test",
            steps=steps,
            initial_step="multiply_step"
        )
        
        workflow_engine.register_workflow(workflow)
        
        # Execute
        execution_id = await workflow_engine.start_workflow(
            "custom-action-test",
            initial_context={"input_value": 5}
        )
        
        await asyncio.sleep(0.2)
        
        # Verify result
        state = workflow_engine.active_workflows.get(execution_id)
        if state:
            assert state.context["step_results"]["multiply_step"]["result"] == 15


class TestWorkflowIntegration:
    """Test integration with existing workflow managers"""
    
    @pytest.fixture
    def enhanced_manager(self):
        """Create enhanced workflow manager"""
        return EnhancedWorkflowManager()
    
    @pytest.mark.asyncio
    async def test_sequential_workflow_migration(self, enhanced_manager):
        """Test migrating sequential workflow to state-driven"""
        # Legacy format
        task_chain = [
            {"name": "task1", "specialist": "data_science", "query": "Analyze data"},
            {"name": "task2", "specialist": "security", "query": "Security scan"},
            {"name": "task3", "specialist": "qa", "query": "Quality check"}
        ]
        
        # Create state-driven workflow
        workflow_id = await enhanced_manager.create_workflow(
            "sequential",
            {"task_chain": task_chain, "name": "TestSequential"},
            use_state_driven=True
        )
        
        assert isinstance(workflow_id, str)
        assert workflow_id in enhanced_manager.workflow_engine.definitions
    
    @pytest.mark.asyncio
    async def test_parallel_workflow_migration(self, enhanced_manager):
        """Test migrating parallel workflow to state-driven"""
        # Legacy format
        parallel_tasks = [
            {"specialist": "architecture", "inputs": {"query": "Review architecture"}},
            {"specialist": "security", "inputs": {"query": "Security audit"}},
            {"specialist": "performance", "inputs": {"query": "Performance test"}}
        ]
        
        # Create state-driven workflow
        workflow_id = await enhanced_manager.create_workflow(
            "parallel",
            {"tasks": parallel_tasks, "aggregation": "MERGE"},
            use_state_driven=True
        )
        
        assert isinstance(workflow_id, str)
        
        # Check workflow definition
        definition = enhanced_manager.workflow_engine.definitions[workflow_id]
        assert definition.steps[0].parallel_with == ["parallel_1", "parallel_2"]
    
    @pytest.mark.asyncio
    async def test_backward_compatibility(self, enhanced_manager):
        """Test backward compatibility with legacy workflows"""
        # Disable state-driven
        enhanced_manager.disable_state_driven()
        
        # Create legacy workflow
        result = await enhanced_manager.create_workflow(
            "sequential",
            {"task_chain": [{"name": "test"}]},
            use_state_driven=False
        )
        
        # Should return workflow object, not string ID
        assert not isinstance(result, str)
    
    @pytest.mark.asyncio
    async def test_feature_flag_control(self, enhanced_manager):
        """Test feature flag controls"""
        # Enable state-driven
        enhanced_manager.enable_state_driven()
        assert enhanced_manager.use_state_driven is True
        
        # Disable state-driven
        enhanced_manager.disable_state_driven()
        assert enhanced_manager.use_state_driven is False
        
        # Enable with auto-migration
        enhanced_manager.enable_state_driven(auto_migrate=True)
        assert enhanced_manager.auto_migrate is True


@pytest.mark.performance
class TestWorkflowPerformance:
    """Performance tests for state management"""
    
    @pytest.mark.asyncio
    async def test_state_transition_performance(self):
        """Test performance of state transitions"""
        workflow_state = WorkflowState("perf-test")
        
        # Measure transition time
        start_time = asyncio.get_event_loop().time()
        
        for _ in range(100):
            await workflow_state.transition_to(WorkflowStatus.PROCESSING)
            await workflow_state.transition_to(WorkflowStatus.WAITING)
            await workflow_state.rollback(1)
        
        duration = asyncio.get_event_loop().time() - start_time
        
        # Should complete 300 operations in under 1 second
        assert duration < 1.0
        
        # Average per operation
        avg_time = duration / 300
        assert avg_time < 0.01  # Less than 10ms per operation
    
    @pytest.mark.asyncio
    async def test_workflow_engine_scalability(self):
        """Test workflow engine with multiple concurrent workflows"""
        engine = WorkflowEngine()
        
        # Create simple workflow
        steps = [
            WorkflowStep(
                name="process",
                action="wait",
                inputs={"duration": 0.01}
            )
        ]
        
        workflow = WorkflowDefinition(
            workflow_id="scale-test",
            name="Scale Test",
            steps=steps,
            initial_step="process"
        )
        
        engine.register_workflow(workflow)
        
        # Start multiple workflows concurrently
        start_time = asyncio.get_event_loop().time()
        
        tasks = []
        for i in range(50):
            task = engine.start_workflow("scale-test", {"index": i})
            tasks.append(task)
        
        execution_ids = await asyncio.gather(*tasks)
        
        # Wait for completion
        await asyncio.sleep(0.5)
        
        duration = asyncio.get_event_loop().time() - start_time
        
        # Should handle 50 workflows efficiently
        assert len(execution_ids) == 50
        assert duration < 2.0  # Should complete in under 2 seconds


# Run validation
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
    print("\n✅ Phase 4 State Management Tests Complete!")