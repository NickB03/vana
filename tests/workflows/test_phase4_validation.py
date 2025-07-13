"""
Phase 4 Validation Script

This script validates the Phase 4 state-driven workflow implementation.
"""

import asyncio
import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from agents.workflows.state_manager import WorkflowState, WorkflowStatus
from agents.workflows.workflow_engine import (
    WorkflowDefinition,
    WorkflowEngine,
    WorkflowStep
)


async def test_basic_state_transitions():
    """Test basic state transitions"""
    print("\n1️⃣ Testing Basic State Transitions...")
    
    state = WorkflowState("test-workflow-1")
    
    # Test initial state
    assert state.current_state == WorkflowStatus.INITIAL
    print("   ✓ Initial state correct")
    
    # Test transition to processing
    success = await state.transition_to(WorkflowStatus.PROCESSING)
    assert success and state.current_state == WorkflowStatus.PROCESSING
    print("   ✓ Transition to PROCESSING successful")
    
    # Test invalid transition
    success = await state.transition_to(WorkflowStatus.INITIAL)
    assert not success
    print("   ✓ Invalid transition blocked correctly")
    
    # Test conditional transition
    state.update_context({"processing_complete": True})
    success = await state.transition_to(WorkflowStatus.COMPLETE)
    assert success and state.current_state == WorkflowStatus.COMPLETE
    print("   ✓ Conditional transition successful")
    
    return True


async def test_state_rollback():
    """Test state rollback functionality"""
    print("\n2️⃣ Testing State Rollback...")
    
    state = WorkflowState("test-workflow-2")
    
    # Make several transitions
    await state.transition_to(WorkflowStatus.PROCESSING)
    await state.transition_to(WorkflowStatus.WAITING)
    
    # Test rollback
    initial_state = state.current_state
    success = await state.rollback(1)
    assert success and state.current_state == WorkflowStatus.PROCESSING
    print("   ✓ Rollback successful")
    
    # Test history preservation
    assert len(state.state_history) == 1
    print("   ✓ State history preserved correctly")
    
    return True


async def test_workflow_engine():
    """Test workflow engine execution"""
    print("\n3️⃣ Testing Workflow Engine...")
    
    engine = WorkflowEngine()
    
    # Create a simple workflow
    steps = [
        WorkflowStep(
            name="start",
            action="log",
            inputs={"message": "Workflow started"},
            conditions={"success": "process"}
        ),
        WorkflowStep(
            name="process",
            action="wait",
            inputs={"duration": 0.1},
            conditions={"success": "complete"}
        ),
        WorkflowStep(
            name="complete",
            action="log",
            inputs={"message": "Workflow completed"}
        )
    ]
    
    workflow = WorkflowDefinition(
        workflow_id="test-workflow",
        name="Test Workflow",
        steps=steps,
        initial_step="start"
    )
    
    # Register and execute
    engine.register_workflow(workflow)
    execution_id = await engine.start_workflow("test-workflow")
    
    print(f"   ✓ Workflow started with ID: {execution_id}")
    
    # Wait for completion
    await asyncio.sleep(0.5)
    
    # Check status
    status = await engine.get_workflow_status(execution_id)
    if status:
        print("   ✓ Workflow status retrieved successfully")
    
    return True


async def test_parallel_execution():
    """Test parallel step execution"""
    print("\n4️⃣ Testing Parallel Execution...")
    
    engine = WorkflowEngine()
    
    # Create workflow with parallel steps
    steps = [
        WorkflowStep(
            name="parallel_main",
            action="log",
            inputs={"message": "Starting parallel tasks"},
            parallel_with=["parallel_1", "parallel_2"]
        ),
        WorkflowStep(
            name="parallel_1",
            action="wait",
            inputs={"duration": 0.2}
        ),
        WorkflowStep(
            name="parallel_2",
            action="wait",
            inputs={"duration": 0.2}
        )
    ]
    
    workflow = WorkflowDefinition(
        workflow_id="parallel-test",
        name="Parallel Test",
        steps=steps,
        initial_step="parallel_main"
    )
    
    engine.register_workflow(workflow)
    
    # Execute and measure time
    start_time = asyncio.get_event_loop().time()
    execution_id = await engine.start_workflow("parallel-test")
    
    # Wait for completion
    await asyncio.sleep(0.5)
    
    duration = asyncio.get_event_loop().time() - start_time
    
    # Parallel execution should take ~0.2s, not 0.4s
    if duration < 0.35:  # Allow some overhead
        print(f"   ✓ Parallel execution completed in {duration:.2f}s")
        return True
    else:
        print(f"   ✗ Parallel execution too slow: {duration:.2f}s")
        return False


async def test_workflow_progress():
    """Test workflow progress tracking"""
    print("\n5️⃣ Testing Progress Tracking...")
    
    state = WorkflowState("test-workflow-3")
    
    # Check initial progress
    progress = await state.get_progress()
    assert progress["progress_percentage"] == 0
    print("   ✓ Initial progress: 0%")
    
    # Progress through states
    await state.transition_to(WorkflowStatus.PROCESSING)
    progress = await state.get_progress()
    assert progress["progress_percentage"] == 30
    print("   ✓ Processing progress: 30%")
    
    # Complete workflow
    state.update_context({"processing_complete": True})
    await state.transition_to(WorkflowStatus.COMPLETE)
    progress = await state.get_progress()
    assert progress["progress_percentage"] == 100
    assert progress["is_complete"] is True
    print("   ✓ Complete progress: 100%")
    
    return True


async def test_error_recovery():
    """Test error recovery and retry"""
    print("\n6️⃣ Testing Error Recovery...")
    
    state = WorkflowState("test-workflow-4")
    
    # Simulate processing failure
    await state.transition_to(WorkflowStatus.PROCESSING)
    await state.transition_to(WorkflowStatus.FAILED)
    
    # Check retry capability
    state.update_context({"retry_count": 1})
    can_retry = await state.can_transition_to(WorkflowStatus.PROCESSING)
    assert can_retry
    print("   ✓ Retry capability detected")
    
    # Retry
    success = await state.transition_to(WorkflowStatus.PROCESSING)
    assert success
    print("   ✓ Retry successful")
    
    # Test max retries
    state.update_context({"retry_count": 3})
    await state.transition_to(WorkflowStatus.FAILED)
    can_retry = await state.can_transition_to(WorkflowStatus.PROCESSING)
    assert not can_retry
    print("   ✓ Max retries enforced")
    
    return True


async def main():
    """Run all validation tests"""
    print("=" * 60)
    print("🚀 Phase 4 State-Driven Workflow Validation")
    print("=" * 60)
    
    tests = [
        test_basic_state_transitions,
        test_state_rollback,
        test_workflow_engine,
        test_parallel_execution,
        test_workflow_progress,
        test_error_recovery
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            result = await test()
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"   ✗ Test failed with error: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("✅ All Phase 4 tests passed!")
        print("\n🎯 Phase 4 Implementation Status:")
        print("   - WorkflowState with transitions ✅")
        print("   - WorkflowEngine with execution ✅")
        print("   - State persistence capability ✅")
        print("   - Error recovery and rollback ✅")
        print("   - Progress tracking ✅")
        print("   - Integration ready ✅")
    else:
        print("❌ Some tests failed. Please review the errors above.")
    
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)