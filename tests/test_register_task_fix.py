"""
Test to verify async task execution bug fix in register_task().

This test validates that tasks registered via register_task() execute
immediately and don't get blocked by the registration process.

Bug: Tasks were being awaited inside the lock, causing deadlock.
Fix: Old tasks are cancelled inside the lock, but awaited outside.
"""

import asyncio

import pytest

from app.utils.sse_broadcaster import BroadcasterConfig, SessionManager


@pytest.mark.asyncio
async def test_task_executes_after_registration() -> None:
    """Test that a registered task executes immediately after registration."""
    config = BroadcasterConfig(
        max_queue_size=100,
        event_ttl=60,
        cleanup_interval=30,
    )
    manager = SessionManager(config)

    # Create a flag to track task execution
    task_executed = asyncio.Event()
    execution_log: list[str] = []

    async def test_task() -> None:
        """Simple task that sets a flag when executed."""
        execution_log.append("task_started")
        await asyncio.sleep(0.1)  # Simulate work
        execution_log.append("task_running")
        task_executed.set()
        execution_log.append("task_completed")

    # Create and register task
    task = asyncio.create_task(test_task())
    await manager.register_task("test-session", task)

    # Wait for task to execute (with timeout)
    try:
        await asyncio.wait_for(task_executed.wait(), timeout=2.0)
    except asyncio.TimeoutError:
        pytest.fail("Task did not execute within 2 seconds - registration blocked execution!")

    # Verify task executed
    assert task_executed.is_set(), "Task should have executed"
    assert "task_started" in execution_log, "Task should have started"
    assert "task_completed" in execution_log, "Task should have completed"


@pytest.mark.asyncio
async def test_task_replacement_doesnt_block_new_task() -> None:
    """Test that replacing a task doesn't block the new task from executing."""
    config = BroadcasterConfig(
        max_queue_size=100,
        event_ttl=60,
        cleanup_interval=30,
    )
    manager = SessionManager(config)

    # Create flags for both tasks
    old_task_cancelled = asyncio.Event()
    new_task_executed = asyncio.Event()
    execution_log: list[str] = []

    async def old_task() -> None:
        """Old task that should be cancelled."""
        execution_log.append("old_task_started")
        try:
            await asyncio.sleep(10)  # Long running task
        except asyncio.CancelledError:
            execution_log.append("old_task_cancelled")
            old_task_cancelled.set()
            raise

    async def new_task() -> None:
        """New task that should execute immediately."""
        execution_log.append("new_task_started")
        await asyncio.sleep(0.1)
        execution_log.append("new_task_running")
        new_task_executed.set()
        execution_log.append("new_task_completed")

    # Register old task
    old = asyncio.create_task(old_task())
    await manager.register_task("test-session", old)
    await asyncio.sleep(0.1)  # Let old task start

    # Register new task (should replace old one)
    new = asyncio.create_task(new_task())
    await manager.register_task("test-session", new)

    # Wait for new task to execute (should not be blocked)
    try:
        await asyncio.wait_for(new_task_executed.wait(), timeout=2.0)
    except asyncio.TimeoutError:
        pytest.fail("New task did not execute within 2 seconds - registration blocked execution!")

    # Verify new task executed
    assert new_task_executed.is_set(), "New task should have executed"
    assert "new_task_started" in execution_log, "New task should have started"
    assert "new_task_completed" in execution_log, "New task should have completed"

    # Old task should have been cancelled
    assert old_task_cancelled.is_set(), "Old task should have been cancelled"
    assert "old_task_cancelled" in execution_log, "Old task should have been cancelled"


@pytest.mark.asyncio
async def test_multiple_rapid_registrations() -> None:
    """Test that rapid task registrations don't cause deadlock."""
    config = BroadcasterConfig(
        max_queue_size=100,
        event_ttl=60,
        cleanup_interval=30,
    )
    manager = SessionManager(config)

    execution_count = 0
    execution_lock = asyncio.Lock()

    async def task_factory(task_id: int) -> None:
        """Create a task that increments a counter."""
        nonlocal execution_count
        await asyncio.sleep(0.01)  # Small delay
        async with execution_lock:
            execution_count += 1

    # Rapidly register 10 tasks
    for i in range(10):
        task = asyncio.create_task(task_factory(i))
        await manager.register_task("test-session", task)

    # Wait for final task to complete
    await asyncio.sleep(0.5)

    # Only the last task should have executed (others cancelled)
    # But the last task should have executed without blocking
    assert execution_count > 0, "At least one task should have executed"


@pytest.mark.asyncio
async def test_task_executes_before_endpoint_returns() -> None:
    """
    Test that simulates the actual bug scenario:
    Task is created and registered, then endpoint returns.
    The task MUST execute even though the endpoint has returned.
    """
    config = BroadcasterConfig(
        max_queue_size=100,
        event_ttl=60,
        cleanup_interval=30,
    )
    manager = SessionManager(config)

    task_executed = asyncio.Event()
    log_messages: list[str] = []

    async def simulated_adk_call() -> None:
        """Simulate the ADK call that was not executing."""
        log_messages.append("Starting agent execution")
        await asyncio.sleep(0.2)  # Simulate ADK processing
        log_messages.append("Agent execution completed")
        task_executed.set()

    async def simulated_endpoint() -> None:
        """Simulate the POST endpoint that returns immediately."""
        # This matches the actual code flow in adk_routes.py line 838-842
        task = asyncio.create_task(simulated_adk_call())
        await manager.register_task("session_939e5c26", task)
        log_messages.append("ADK request task created and registered")
        # Endpoint returns here (like line 856-863 in adk_routes.py)
        return {"success": True, "session_id": "session_939e5c26"}

    # Call the simulated endpoint
    result = await simulated_endpoint()
    assert result["success"] is True

    # The task MUST execute even though the endpoint has returned
    try:
        await asyncio.wait_for(task_executed.wait(), timeout=3.0)
    except asyncio.TimeoutError:
        pytest.fail(
            "Task did not execute after endpoint returned! "
            "This is the original bug - task was blocked by register_task()"
        )

    # Verify execution happened
    assert task_executed.is_set(), "Task should have executed"
    assert "Starting agent execution" in log_messages
    assert "Agent execution completed" in log_messages
    assert "ADK request task created and registered" in log_messages


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
