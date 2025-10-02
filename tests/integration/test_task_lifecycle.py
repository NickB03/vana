"""
Integration tests for CRIT-006: Background Task Lifecycle Management.

Tests verify:
1. Task tracking in session context
2. Task cancellation on timeout
3. Error handling with proper logging
4. Task cleanup on session end
5. No orphaned tasks after load
6. Memory stability over time
"""

import asyncio
import logging
from datetime import datetime

import pytest

from app.utils.sse_broadcaster import EnhancedSSEBroadcaster, BroadcasterConfig

logger = logging.getLogger(__name__)


@pytest.fixture
def broadcaster():
    """Create a broadcaster instance for testing."""
    config = BroadcasterConfig(
        max_queue_size=100,
        max_history_per_session=50,
        event_ttl=60.0,
        session_ttl=300.0,
        cleanup_interval=5.0,
    )
    return EnhancedSSEBroadcaster(config)


@pytest.mark.asyncio
async def test_task_registration_and_tracking(broadcaster):
    """Test that tasks are properly registered and tracked."""
    session_id = "test-session-1"

    # Create a simple background task
    async def dummy_task():
        await asyncio.sleep(0.1)
        return "completed"

    task = asyncio.create_task(dummy_task())

    # Register the task
    await broadcaster._session_manager.register_task(session_id, task)

    # Verify task is registered
    status = await broadcaster._session_manager.get_task_status(session_id)
    assert status["has_task"] is True
    assert status["session_id"] == session_id

    # Wait for task to complete
    await task

    # Check final status
    status = await broadcaster._session_manager.get_task_status(session_id)
    assert status["status"] == "done"


@pytest.mark.asyncio
async def test_task_cancellation_on_timeout(broadcaster):
    """Test that tasks are cancelled properly on timeout."""
    session_id = "test-session-2"

    # Create a long-running task
    async def long_task():
        try:
            await asyncio.sleep(10)  # Will be cancelled
            return "should not complete"
        except asyncio.CancelledError:
            logger.info("Task cancelled as expected")
            raise

    task = asyncio.create_task(long_task())
    await broadcaster._session_manager.register_task(session_id, task)

    # Cancel the task
    await broadcaster._session_manager.cancel_session_tasks(session_id)

    # Verify task was cancelled
    assert task.cancelled() or task.done()

    # Verify task is no longer tracked
    status = await broadcaster._session_manager.get_task_status(session_id)
    assert status["has_task"] is False


@pytest.mark.asyncio
async def test_task_error_handling(broadcaster):
    """Test that task errors are properly caught and logged."""
    session_id = "test-session-3"

    error_logged = False

    # Create a task that raises an error
    async def failing_task():
        nonlocal error_logged
        try:
            raise ValueError("Intentional test error")
        except ValueError:
            error_logged = True
            raise

    task = asyncio.create_task(failing_task())
    await broadcaster._session_manager.register_task(session_id, task)

    # Wait for task to fail
    with pytest.raises(ValueError):
        await task

    # Verify error was processed
    assert error_logged is True

    # Verify task is marked as done
    status = await broadcaster._session_manager.get_task_status(session_id)
    assert status["status"] == "done"


@pytest.mark.asyncio
async def test_task_cleanup_on_session_end(broadcaster):
    """Test that tasks are cleaned up when session ends."""
    session_id = "test-session-4"

    # Create multiple tasks
    tasks_created = []
    for i in range(3):
        async def dummy_task():
            await asyncio.sleep(5)  # Long enough to be cancelled

        task = asyncio.create_task(dummy_task())
        await broadcaster._session_manager.register_task(session_id, task)
        tasks_created.append(task)

    # Verify task is registered
    status = await broadcaster._session_manager.get_task_status(session_id)
    assert status["has_task"] is True

    # Clear the session (should cancel tasks)
    await broadcaster.clear_session(session_id)

    # Verify all tasks were cancelled
    for task in tasks_created:
        assert task.cancelled() or task.done()

    # Verify task tracking is cleaned up
    status = await broadcaster._session_manager.get_task_status(session_id)
    assert status["has_task"] is False


@pytest.mark.asyncio
async def test_multiple_sessions_no_orphaned_tasks(broadcaster):
    """Test that no tasks are orphaned when managing multiple sessions."""
    session_count = 10
    tasks_per_session = 2

    # Create tasks for multiple sessions
    all_sessions = []
    for i in range(session_count):
        session_id = f"test-session-{i}"
        all_sessions.append(session_id)

        for j in range(tasks_per_session):
            async def dummy_task():
                await asyncio.sleep(0.01)

            task = asyncio.create_task(dummy_task())
            await broadcaster._session_manager.register_task(session_id, task)

    # Get overall status
    overall_status = await broadcaster._session_manager.get_task_status()
    assert overall_status["total_tasks"] == session_count  # One task per session (last one registered)

    # Clean up all sessions
    for session_id in all_sessions:
        await broadcaster.clear_session(session_id)

    # Verify no orphaned tasks
    final_status = await broadcaster._session_manager.get_task_status()
    assert final_status["total_tasks"] == 0
    assert final_status["running_tasks"] == 0


@pytest.mark.asyncio
async def test_task_replacement_on_new_registration(broadcaster):
    """Test that new task replaces old task for same session."""
    session_id = "test-session-5"

    # Create first task
    async def first_task():
        await asyncio.sleep(5)

    task1 = asyncio.create_task(first_task())
    await broadcaster._session_manager.register_task(session_id, task1)

    # Create second task (should cancel first)
    async def second_task():
        await asyncio.sleep(0.1)

    task2 = asyncio.create_task(second_task())
    await broadcaster._session_manager.register_task(session_id, task2)

    # First task should be cancelled
    await asyncio.sleep(0.2)  # Give time for cancellation
    assert task1.cancelled() or task1.done()

    # Wait for second task to complete
    await task2

    # Verify second task is the one tracked
    status = await broadcaster._session_manager.get_task_status(session_id)
    assert status["status"] == "done"


@pytest.mark.asyncio
async def test_task_status_endpoint_all_sessions(broadcaster):
    """Test the task status endpoint for all sessions."""
    # Create tasks for multiple sessions
    session_ids = ["session-a", "session-b", "session-c"]

    for session_id in session_ids:
        async def dummy_task():
            await asyncio.sleep(0.5)

        task = asyncio.create_task(dummy_task())
        await broadcaster._session_manager.register_task(session_id, task)

    # Get status for all sessions
    status = await broadcaster._session_manager.get_task_status()

    assert status["total_tasks"] == len(session_ids)
    assert status["running_tasks"] == len(session_ids)
    assert set(status["sessions"]) == set(session_ids)

    # Clean up
    for session_id in session_ids:
        await broadcaster._session_manager.cancel_session_tasks(session_id)


@pytest.mark.asyncio
@pytest.mark.slow
async def test_memory_stability_with_task_churn(broadcaster):
    """Test that memory remains stable with high task creation/cancellation rate."""
    import gc
    import psutil
    import os

    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB

    # Create and cancel many tasks
    for iteration in range(100):
        session_id = f"churn-session-{iteration % 10}"  # Reuse 10 sessions

        async def dummy_task():
            await asyncio.sleep(0.01)

        task = asyncio.create_task(dummy_task())
        await broadcaster._session_manager.register_task(session_id, task)

        if iteration % 10 == 0:
            # Cancel some tasks
            await broadcaster._session_manager.cancel_session_tasks(session_id)

    # Force garbage collection
    gc.collect()
    await asyncio.sleep(0.1)

    final_memory = process.memory_info().rss / 1024 / 1024  # MB
    memory_increase = final_memory - initial_memory

    # Memory increase should be reasonable (less than 50MB for this test)
    assert memory_increase < 50, f"Memory increased by {memory_increase}MB"

    # Clean up remaining tasks
    status = await broadcaster._session_manager.get_task_status()
    for session_id in status["sessions"]:
        await broadcaster._session_manager.cancel_session_tasks(session_id)


@pytest.mark.asyncio
async def test_expired_session_cleanup_cancels_tasks(broadcaster):
    """Test that expired session cleanup also cancels tasks."""
    session_id = "expiring-session"

    # Create session and task
    await broadcaster._session_manager.create_session(session_id)

    async def long_task():
        await asyncio.sleep(10)

    task = asyncio.create_task(long_task())
    await broadcaster._session_manager.register_task(session_id, task)

    # Manually expire the session (set old timestamp)
    async with broadcaster._session_manager._lock:
        broadcaster._session_manager._sessions[session_id] = 0.0  # Very old timestamp

    # Run cleanup
    expired = await broadcaster._session_manager.cleanup_expired_sessions()

    # Verify session was expired and task was cancelled
    assert session_id in expired
    assert task.cancelled() or task.done()


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
