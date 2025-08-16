# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.

"""Quick memory leak validation tests."""

import asyncio
import gc
import os
import time

import psutil
import pytest

from app.utils.sse_broadcaster_fixed import get_sse_broadcaster


class TestQuickMemoryValidation:
    """Quick memory leak validation tests."""

    def get_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)

    @pytest.mark.asyncio
    async def test_basic_session_cleanup(self):
        """Test basic session creation and cleanup works."""
        broadcaster = get_sse_broadcaster()
        initial_memory = self.get_memory_mb()

        # Create single session
        session_id = "test_session"
        queue = await broadcaster.add_subscriber(session_id)

        # Send a few events
        for i in range(10):
            await broadcaster.broadcast_event(
                session_id,
                {"type": "test", "data": {"event": i}},
            )

        # Remove subscriber
        await broadcaster.remove_subscriber(session_id, queue)

        # Force cleanup
        await broadcaster._perform_cleanup()
        gc.collect()

        # Check memory didn't grow significantly
        final_memory = self.get_memory_mb()
        memory_increase = final_memory - initial_memory

        assert memory_increase < 10.0, f"Memory increase too large: {memory_increase:.2f}MB"

        # Check session has no active subscribers
        stats = broadcaster.get_stats()
        session_stats = stats.get("sessionStats", {}).get(session_id, {})
        assert session_stats.get("subscribers", 0) == 0, "Session should have no active subscribers"

    @pytest.mark.asyncio
    async def test_multiple_sessions_sequential(self):
        """Test multiple sessions created and cleaned up sequentially."""
        broadcaster = get_sse_broadcaster()
        initial_memory = self.get_memory_mb()

        # Create and cleanup sessions sequentially
        for session_idx in range(5):
            session_id = f"session_{session_idx}"
            queue = await broadcaster.add_subscriber(session_id)

            # Send events
            for event_idx in range(20):
                await broadcaster.broadcast_event(
                    session_id,
                    {"type": "test", "data": {"session": session_idx, "event": event_idx}},
                )

            # Cleanup immediately
            await broadcaster.remove_subscriber(session_id, queue)
            await broadcaster._perform_cleanup()

            if session_idx % 2 == 0:
                gc.collect()  # Periodic garbage collection

        final_memory = self.get_memory_mb()
        memory_increase = final_memory - initial_memory

        assert memory_increase < 15.0, f"Memory increase too large: {memory_increase:.2f}MB"

        # Verify no active subscribers remain across all sessions
        stats = broadcaster.get_stats()
        total_subscribers = sum(
            session_stats.get("subscribers", 0)
            for session_stats in stats.get("sessionStats", {}).values()
        )
        assert total_subscribers == 0, f"Found {total_subscribers} active subscribers"

    @pytest.mark.asyncio
    async def test_broadcast_without_subscribers(self):
        """Test broadcasting events with no subscribers doesn't leak memory."""
        broadcaster = get_sse_broadcaster()
        initial_memory = self.get_memory_mb()

        # Broadcast events to non-existent sessions
        for i in range(100):
            await broadcaster.broadcast_event(
                f"nonexistent_session_{i}",
                {"type": "orphan", "data": {"event": i}},
            )

            if i % 20 == 0:
                await asyncio.sleep(0.001)  # Yield control

        # Force cleanup
        await broadcaster._perform_cleanup()
        gc.collect()

        final_memory = self.get_memory_mb()
        memory_increase = final_memory - initial_memory

        assert memory_increase < 20.0, f"Memory increase too large: {memory_increase:.2f}MB"

    @pytest.mark.asyncio
    async def test_concurrent_lightweight(self):
        """Test lightweight concurrent operation."""
        broadcaster = get_sse_broadcaster()
        initial_memory = self.get_memory_mb()

        async def lightweight_worker(worker_id: int):
            """Lightweight worker that creates session, sends events, cleans up."""
            session_id = f"light_session_{worker_id}"
            queue = await broadcaster.add_subscriber(session_id)

            try:
                # Send fewer events
                for i in range(10):
                    await broadcaster.broadcast_event(
                        session_id,
                        {"type": "light", "data": {"worker": worker_id, "event": i}},
                    )
                    await asyncio.sleep(0.001)  # Small delay

                return worker_id
            finally:
                await broadcaster.remove_subscriber(session_id, queue)

        # Run fewer concurrent workers
        start_time = time.time()
        tasks = [lightweight_worker(i) for i in range(10)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()

        # Check for exceptions
        exceptions = [r for r in results if isinstance(r, Exception)]
        assert len(exceptions) == 0, f"Exceptions occurred: {exceptions}"

        # Force cleanup
        await broadcaster._perform_cleanup()
        gc.collect()

        # Check memory and performance
        final_memory = self.get_memory_mb()
        memory_increase = final_memory - initial_memory
        execution_time = end_time - start_time

        assert memory_increase < 25.0, f"Memory increase too large: {memory_increase:.2f}MB"
        assert execution_time < 10.0, f"Execution took too long: {execution_time:.2f}s"

        # Verify no active subscribers remain
        stats = broadcaster.get_stats()
        total_subscribers = sum(
            session_stats.get("subscribers", 0)
            for session_stats in stats.get("sessionStats", {}).values()
        )
        assert total_subscribers == 0, f"Found {total_subscribers} active subscribers"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
