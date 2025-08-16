# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Comprehensive memory and concurrency stress tests for CI/CD pipeline validation."""

import asyncio
import gc
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import Mock

import psutil
import pytest
from fastapi import Request
from fastapi.responses import JSONResponse

from app.auth.middleware import RateLimitMiddleware
from app.utils.sse_broadcaster_fixed import get_sse_broadcaster


class TestMemoryConcurrencyStress:
    """Comprehensive stress tests for memory and concurrency under CI/CD loads."""

    def get_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)

    def setup_method(self):
        """Setup before each test method."""
        # Force garbage collection before each test
        gc.collect()

    @pytest.mark.asyncio
    async def test_sse_broadcaster_concurrent_sessions(self):
        """Test SSE broadcaster under concurrent session pressure."""
        broadcaster = get_sse_broadcaster()
        initial_memory = self.get_memory_mb()

        # Create many concurrent sessions
        num_sessions = 50
        events_per_session = 100

        async def session_worker(session_idx: int):
            """Worker that simulates a session with events."""
            session_id = f"stress_session_{session_idx}"

            # Add subscriber
            queue = await broadcaster.add_subscriber(session_id)

            try:
                # Send events
                for event_idx in range(events_per_session):
                    await broadcaster.broadcast_event(
                        session_id,
                        {
                            "type": "stress_test",
                            "data": {
                                "session_idx": session_idx,
                                "event_idx": event_idx,
                                "payload": "x" * 100,  # 100 byte payload
                            },
                        },
                    )

                    # Yield occasionally
                    if event_idx % 20 == 0:
                        await asyncio.sleep(0.001)

                # Consume some events
                events_consumed = 0
                try:
                    for _ in range(5):  # Consume first 5 events
                        event = await asyncio.wait_for(queue.get(), timeout=0.1)
                        events_consumed += 1
                except asyncio.TimeoutError:
                    pass  # Expected when queue is empty

                return events_consumed

            finally:
                await broadcaster.remove_subscriber(session_id, queue)

        # Run sessions concurrently
        start_time = time.time()
        tasks = [session_worker(i) for i in range(num_sessions)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()

        # Verify no exceptions occurred
        exceptions = [r for r in results if isinstance(r, Exception)]
        assert len(exceptions) == 0, f"Exceptions occurred: {exceptions[:3]}"

        # Force cleanup
        await broadcaster._perform_cleanup()
        await asyncio.sleep(0.5)  # Allow cleanup to complete

        # Check memory usage
        final_memory = self.get_memory_mb()
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (less than 100MB for this test)
        assert memory_increase < 100.0, f"Memory increase too large: {memory_increase:.2f}MB"

        # Check performance
        total_events = num_sessions * events_per_session
        throughput = total_events / (end_time - start_time)
        assert throughput > 1000, f"Throughput too low: {throughput:.1f} events/sec"

        # Verify broadcaster state is clean
        stats = broadcaster.get_stats()
        total_subscribers = sum(
            session_stats.get("subscribers", 0)
            for session_stats in stats.get("sessionStats", {}).values()
        )
        assert total_subscribers == 0, f"Found {total_subscribers} active subscribers after test"

    def test_rate_limit_middleware_concurrent_requests(self):
        """Test rate limiting middleware under concurrent request pressure."""
        # Create middleware with low limits for testing
        app = Mock()
        middleware = RateLimitMiddleware(app, calls=10, period=60)

        # Mock call_next function
        async def mock_call_next(request):
            await asyncio.sleep(0.01)  # Simulate processing time
            return JSONResponse(content={"status": "ok"})

        def create_mock_request(client_ip: str) -> Request:
            """Create a mock request with specified client IP."""
            mock_request = Mock(spec=Request)
            mock_request.url.path = "/auth/login"
            mock_request.client.host = client_ip
            mock_request.headers = {"X-Forwarded-For": client_ip}
            return mock_request

        async def client_worker(client_id: int, requests_per_client: int):
            """Simulate a client making multiple requests."""
            client_ip = f"192.168.1.{client_id}"
            successful_requests = 0
            rate_limited_requests = 0

            for _ in range(requests_per_client):
                request = create_mock_request(client_ip)
                response = await middleware.dispatch(request, mock_call_next)

                if response.status_code == 200:
                    successful_requests += 1
                elif response.status_code == 429:
                    rate_limited_requests += 1

                await asyncio.sleep(0.001)  # Small delay between requests

            return {
                "client_id": client_id,
                "successful": successful_requests,
                "rate_limited": rate_limited_requests,
            }

        async def run_concurrent_test():
            """Run concurrent clients against rate limiter."""
            num_clients = 20
            requests_per_client = 15  # Some clients will hit the limit (10)

            tasks = [client_worker(i, requests_per_client) for i in range(num_clients)]
            results = await asyncio.gather(*tasks)

            total_successful = sum(r["successful"] for r in results)
            total_rate_limited = sum(r["rate_limited"] for r in results)

            # Each client should have exactly 10 successful requests (the limit)
            # and 5 rate-limited requests
            assert total_successful == num_clients * 10, f"Expected {num_clients * 10} successful, got {total_successful}"
            assert total_rate_limited == num_clients * 5, f"Expected {num_clients * 5} rate-limited, got {total_rate_limited}"

            return results

        # Run the test
        results = asyncio.run(run_concurrent_test())

        # Verify rate limiting worked correctly for each client
        for result in results:
            assert result["successful"] == 10, f"Client {result['client_id']} had {result['successful']} successful requests"
            assert result["rate_limited"] == 5, f"Client {result['client_id']} had {result['rate_limited']} rate-limited requests"

    def test_thread_safety_under_load(self):
        """Test thread safety of core components under heavy concurrent load."""
        # Test the SSE broadcaster singleton under thread pressure
        def worker_thread(thread_id: int, results: list):
            """Worker thread that gets broadcaster instance multiple times."""
            try:
                broadcasters = []
                for _ in range(100):
                    broadcaster = get_sse_broadcaster()
                    broadcasters.append(broadcaster)
                    time.sleep(0.001)  # Small delay

                # All instances should be the same (singleton)
                all_same = all(b is broadcasters[0] for b in broadcasters)
                results.append({"thread_id": thread_id, "all_same": all_same, "success": True})

            except Exception as e:
                results.append({"thread_id": thread_id, "error": str(e), "success": False})

        # Run multiple threads concurrently
        num_threads = 10
        results = []

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(worker_thread, i, results) for i in range(num_threads)]

            # Wait for all threads to complete
            for future in as_completed(futures):
                future.result()  # This will raise any exceptions

        # Verify results
        assert len(results) == num_threads, f"Expected {num_threads} results, got {len(results)}"

        successful_threads = [r for r in results if r.get("success", False)]
        assert len(successful_threads) == num_threads, f"Some threads failed: {[r for r in results if not r.get('success')]}"

        # All threads should have gotten the same singleton instance
        for result in successful_threads:
            assert result["all_same"], f"Thread {result['thread_id']} got different instances"

    @pytest.mark.asyncio
    async def test_memory_cleanup_under_sustained_load(self):
        """Test memory cleanup effectiveness under sustained load."""
        broadcaster = get_sse_broadcaster()
        initial_memory = self.get_memory_mb()

        # Run sustained load for multiple cycles
        num_cycles = 5
        sessions_per_cycle = 20
        events_per_session = 50

        for cycle in range(num_cycles):
            cycle_start_memory = self.get_memory_mb()

            # Create sessions and generate events
            async def cycle_worker():
                tasks = []
                for i in range(sessions_per_cycle):
                    session_id = f"cycle_{cycle}_session_{i}"

                    async def session_task(sid):
                        queue = await broadcaster.add_subscriber(sid)
                        try:
                            for j in range(events_per_session):
                                await broadcaster.broadcast_event(
                                    sid,
                                    {
                                        "type": "sustained_load",
                                        "data": {"cycle": cycle, "event": j, "data": "x" * 50},
                                    },
                                )
                                if j % 10 == 0:
                                    await asyncio.sleep(0.001)
                        finally:
                            await broadcaster.remove_subscriber(sid, queue)

                    tasks.append(session_task(session_id))

                await asyncio.gather(*tasks)

            await cycle_worker()

            # Force cleanup after each cycle
            await broadcaster._perform_cleanup()
            gc.collect()
            await asyncio.sleep(0.1)

            cycle_end_memory = self.get_memory_mb()
            cycle_memory_increase = cycle_end_memory - cycle_start_memory

            # Each cycle should not significantly increase memory
            assert cycle_memory_increase < 20.0, f"Cycle {cycle} memory increase too large: {cycle_memory_increase:.2f}MB"

        final_memory = self.get_memory_mb()
        total_memory_increase = final_memory - initial_memory

        # Total memory increase should be bounded
        assert total_memory_increase < 50.0, f"Total memory increase too large: {total_memory_increase:.2f}MB"

        # Verify cleanup effectiveness
        stats = broadcaster.get_stats()
        total_subscribers = sum(
            session_stats.get("subscribers", 0)
            for session_stats in stats.get("sessionStats", {}).values()
        )
        assert total_subscribers == 0, f"Found {total_subscribers} active subscribers after cycles"
        # Events may remain due to TTL (10 minutes), but should be reasonable
        # Allow for some accumulation from previous tests, but verify we're not growing unboundedly
        # Use the start-of-test event count as baseline
        events_added = num_cycles * sessions_per_cycle * events_per_session  # 5000 events added by this test
        assert stats["totalEvents"] >= events_added, "Events were prematurely cleaned up"
        # Allow for up to 2x the events added (accounting for accumulation from other tests)
        assert stats["totalEvents"] <= events_added * 2, f"Too many events accumulated: {stats['totalEvents']} (added {events_added})"

    @pytest.mark.asyncio
    async def test_cicd_pipeline_simulation(self):
        """Simulate CI/CD pipeline stress conditions."""
        broadcaster = get_sse_broadcaster()
        initial_memory = self.get_memory_mb()

        # Simulate multiple pipelines running concurrently
        num_pipelines = 5
        stages_per_pipeline = 4
        events_per_stage = 25

        async def pipeline_worker(pipeline_id: int):
            """Simulate a CI/CD pipeline with multiple stages."""
            pipeline_session = f"pipeline_{pipeline_id}"
            queue = await broadcaster.add_subscriber(pipeline_session)

            try:
                pipeline_events = []

                for stage in range(stages_per_pipeline):
                    stage_name = ["build", "test", "deploy", "verify"][stage]

                    # Generate events for this stage
                    for event_idx in range(events_per_stage):
                        event_data = {
                            "type": "pipeline_event",
                            "data": {
                                "pipeline_id": pipeline_id,
                                "stage": stage_name,
                                "event_idx": event_idx,
                                "status": "running" if event_idx < events_per_stage - 1 else "completed",
                                "logs": f"Stage {stage_name} log entry {event_idx}" + "x" * 100,
                            },
                        }

                        await broadcaster.broadcast_event(pipeline_session, event_data)
                        pipeline_events.append(event_data)

                        # Simulate varying processing times
                        if event_idx % 5 == 0:
                            await asyncio.sleep(0.002)

                # Simulate consuming pipeline events (monitoring)
                consumed_events = 0
                try:
                    while consumed_events < len(pipeline_events) // 2:  # Consume half the events
                        event = await asyncio.wait_for(queue.get(), timeout=0.05)
                        consumed_events += 1
                except asyncio.TimeoutError:
                    pass  # Expected when queue is empty or slow

                return {
                    "pipeline_id": pipeline_id,
                    "events_generated": len(pipeline_events),
                    "events_consumed": consumed_events,
                }

            finally:
                await broadcaster.remove_subscriber(pipeline_session, queue)

        # Run pipelines concurrently
        start_time = time.time()
        pipeline_tasks = [pipeline_worker(i) for i in range(num_pipelines)]
        results = await asyncio.gather(*pipeline_tasks, return_exceptions=True)
        end_time = time.time()

        # Verify no exceptions
        exceptions = [r for r in results if isinstance(r, Exception)]
        assert len(exceptions) == 0, f"Pipeline exceptions: {exceptions}"

        # Force cleanup
        await broadcaster._perform_cleanup()
        await asyncio.sleep(0.5)

        # Check performance metrics
        total_events = sum(r["events_generated"] for r in results if isinstance(r, dict))
        execution_time = end_time - start_time
        throughput = total_events / execution_time

        assert throughput > 500, f"CI/CD simulation throughput too low: {throughput:.1f} events/sec"

        # Check memory usage
        final_memory = self.get_memory_mb()
        memory_increase = final_memory - initial_memory
        assert memory_increase < 75.0, f"CI/CD simulation memory increase too large: {memory_increase:.2f}MB"

        # Verify cleanup
        stats = broadcaster.get_stats()
        total_subscribers = sum(
            session_stats.get("subscribers", 0)
            for session_stats in stats.get("sessionStats", {}).values()
        )
        assert total_subscribers == 0, f"Found {total_subscribers} active pipeline subscribers"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
