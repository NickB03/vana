"""Comprehensive SSE Load Testing and Stress Testing.

This module provides extensive load testing for the SSE broadcaster system,
testing hundreds of concurrent connections, rapid event broadcasting,
memory leak detection, and production-level stress scenarios.
"""

import asyncio
import gc
import logging
import random
import time
from dataclasses import dataclass
from typing import Any

import pytest

from app.utils.sse_broadcaster import (
    BroadcasterConfig,
    EnhancedSSEBroadcaster,
)

# Test configuration
TEST_CONFIG = BroadcasterConfig(
    max_queue_size=2000,
    max_history_per_session=1000,
    event_ttl=300.0,
    session_ttl=1800.0,
    cleanup_interval=10.0,
    enable_metrics=True,
    max_subscriber_idle_time=300.0,
    memory_warning_threshold_mb=50.0,
    memory_critical_threshold_mb=100.0,
)

logger = logging.getLogger(__name__)


@dataclass
class LoadTestMetrics:
    """Metrics for load testing."""

    total_connections: int = 0
    successful_connections: int = 0
    failed_connections: int = 0
    events_sent: int = 0
    events_received: int = 0
    avg_response_time_ms: float = 0.0
    max_response_time_ms: float = 0.0
    min_response_time_ms: float = float("inf")
    memory_usage_mb: float = 0.0
    test_duration_seconds: float = 0.0
    throughput_events_per_second: float = 0.0


class SSELoadTester:
    """SSE Load Testing utility class."""

    def __init__(self, broadcaster: EnhancedSSEBroadcaster):
        self.broadcaster = broadcaster
        self.metrics = LoadTestMetrics()
        self.active_sessions: set[str] = set()
        self.event_queues: dict[str, list[str]] = {}

    async def simulate_sse_client(
        self, session_id: str, duration_seconds: float = 30.0
    ) -> dict[str, Any]:
        """Simulate an SSE client connection."""
        start_time = time.time()
        events_received = 0
        response_times = []

        try:
            async with self.broadcaster.subscribe(session_id) as queue:
                end_time = start_time + duration_seconds

                while time.time() < end_time:
                    try:
                        event_start = time.time()
                        event = await asyncio.wait_for(
                            queue.get(timeout=1.0), timeout=2.0
                        )
                        event_end = time.time()

                        response_time_ms = (event_end - event_start) * 1000
                        response_times.append(response_time_ms)
                        events_received += 1

                        # Store events for validation
                        if session_id not in self.event_queues:
                            self.event_queues[session_id] = []

                        if isinstance(event, str):
                            self.event_queues[session_id].append(event)

                    except asyncio.TimeoutError:
                        # Expected for keepalive behavior
                        continue
                    except asyncio.CancelledError:
                        break
                    except Exception as e:
                        logger.warning(f"Client {session_id} error: {e}")
                        break

            return {
                "session_id": session_id,
                "events_received": events_received,
                "duration": time.time() - start_time,
                "response_times": response_times,
                "success": True,
            }

        except Exception as e:
            logger.error(f"Client {session_id} failed: {e}")
            return {
                "session_id": session_id,
                "events_received": 0,
                "duration": time.time() - start_time,
                "response_times": [],
                "success": False,
            }

    async def broadcast_events_rapidly(
        self, session_id: str, event_count: int, events_per_second: int = 100
    ) -> None:
        """Broadcast events rapidly to test throughput."""
        interval = 1.0 / events_per_second

        for i in range(event_count):
            event_data = {
                "type": "load_test_event",
                "data": {
                    "event_id": i,
                    "session_id": session_id,
                    "timestamp": time.time(),
                    "payload": f"Event {i} data for load testing",
                    "sequence": i,
                },
            }

            await self.broadcaster.broadcast_event(session_id, event_data)
            self.metrics.events_sent += 1

            if interval > 0:
                await asyncio.sleep(interval)

    async def stress_test_concurrent_connections(
        self, num_connections: int = 100, duration_seconds: float = 30.0
    ) -> LoadTestMetrics:
        """Stress test with multiple concurrent connections."""
        logger.info(
            f"Starting stress test: {num_connections} connections for {duration_seconds}s"
        )

        start_time = time.time()
        self.metrics = LoadTestMetrics()
        self.metrics.total_connections = num_connections

        # Create session IDs
        session_ids = [f"load_test_session_{i}" for i in range(num_connections)]
        self.active_sessions.update(session_ids)

        # Start concurrent clients
        client_tasks = []
        for session_id in session_ids:
            task = asyncio.create_task(
                self.simulate_sse_client(session_id, duration_seconds)
            )
            client_tasks.append(task)

        # Start event broadcasting for random sessions
        broadcast_tasks = []
        for i in range(num_connections // 10):  # 10% of sessions get events
            session_id = random.choice(session_ids)
            task = asyncio.create_task(
                self.broadcast_events_rapidly(session_id, 100, 50)
            )
            broadcast_tasks.append(task)

        # Wait for all tasks to complete
        all_tasks = client_tasks + broadcast_tasks
        results = await asyncio.gather(*all_tasks, return_exceptions=True)

        # Process client results
        client_results = results[: len(client_tasks)]
        successful_clients = [
            r for r in client_results if isinstance(r, dict) and r.get("success", False)
        ]
        failed_clients = [
            r
            for r in client_results
            if not (isinstance(r, dict) and r.get("success", False))
        ]

        self.metrics.successful_connections = len(successful_clients)
        self.metrics.failed_connections = len(failed_clients)

        # Calculate response time metrics
        all_response_times = []
        total_events_received = 0

        for result in successful_clients:
            if isinstance(result, dict):
                total_events_received += result.get("events_received", 0)
                response_times = result.get("response_times", [])
                all_response_times.extend(response_times)

        if all_response_times:
            self.metrics.avg_response_time_ms = sum(all_response_times) / len(
                all_response_times
            )
            self.metrics.max_response_time_ms = max(all_response_times)
            self.metrics.min_response_time_ms = min(all_response_times)

        self.metrics.events_received = total_events_received
        self.metrics.test_duration_seconds = time.time() - start_time

        if self.metrics.test_duration_seconds > 0:
            self.metrics.throughput_events_per_second = (
                self.metrics.events_sent / self.metrics.test_duration_seconds
            )

        # Get memory usage
        stats = self.broadcaster.get_stats()
        self.metrics.memory_usage_mb = stats.get("memoryUsageMB", 0.0)

        logger.info(
            f"Stress test completed: {self.metrics.successful_connections}/{self.metrics.total_connections} successful"
        )
        return self.metrics

    async def memory_leak_test(
        self, cycles: int = 10, connections_per_cycle: int = 20
    ) -> dict[str, Any]:
        """Test for memory leaks over multiple cycles."""
        logger.info(
            f"Starting memory leak test: {cycles} cycles, {connections_per_cycle} connections each"
        )

        memory_snapshots = []

        for cycle in range(cycles):
            # Force garbage collection before measurement
            gc.collect()

            # Get initial memory
            initial_stats = self.broadcaster.get_stats()
            initial_memory = initial_stats.get("memoryUsageMB", 0.0)

            # Run a load test cycle
            metrics = await self.stress_test_concurrent_connections(
                connections_per_cycle, 10.0
            )

            # Clean up explicitly
            for session_id in list(self.active_sessions):
                await self.broadcaster.clear_session(session_id)
            self.active_sessions.clear()

            # Force cleanup
            await self.broadcaster._perform_cleanup()
            gc.collect()

            # Get final memory
            final_stats = self.broadcaster.get_stats()
            final_memory = final_stats.get("memoryUsageMB", 0.0)

            memory_snapshots.append(
                {
                    "cycle": cycle,
                    "initial_memory_mb": initial_memory,
                    "final_memory_mb": final_memory,
                    "memory_delta_mb": final_memory - initial_memory,
                    "connections": connections_per_cycle,
                    "events_sent": metrics.events_sent,
                    "events_received": metrics.events_received,
                }
            )

            logger.info(
                f"Cycle {cycle}: Memory delta: {final_memory - initial_memory:.2f}MB"
            )

            # Small delay between cycles
            await asyncio.sleep(1.0)

        # Analyze memory trends
        memory_deltas = [s["memory_delta_mb"] for s in memory_snapshots]
        avg_memory_delta = sum(memory_deltas) / len(memory_deltas)
        max_memory_delta = max(memory_deltas)

        return {
            "cycles": cycles,
            "snapshots": memory_snapshots,
            "avg_memory_delta_mb": avg_memory_delta,
            "max_memory_delta_mb": max_memory_delta,
            "memory_leak_detected": max_memory_delta > 10.0,  # 10MB threshold
            "total_connections_tested": cycles * connections_per_cycle,
        }


class TestSSELoadTesting:
    """Comprehensive SSE Load Testing Test Suite."""

    @pytest.fixture
    async def broadcaster(self):
        """Create broadcaster with test configuration."""
        broadcaster = EnhancedSSEBroadcaster(config=TEST_CONFIG)
        yield broadcaster
        await broadcaster.shutdown()

    @pytest.fixture
    def load_tester(self, broadcaster):
        """Create load tester instance."""
        return SSELoadTester(broadcaster)

    @pytest.mark.asyncio
    async def test_moderate_load_50_connections(self, load_tester):
        """Test moderate load with 50 concurrent connections."""
        metrics = await load_tester.stress_test_concurrent_connections(
            num_connections=50, duration_seconds=20.0
        )

        # Assertions
        assert metrics.total_connections == 50
        assert metrics.successful_connections >= 45  # Allow 10% failure rate
        assert metrics.events_sent > 0
        assert metrics.avg_response_time_ms < 500  # Under 500ms average
        assert metrics.max_response_time_ms < 2000  # Under 2s max

        print("Moderate load test results:")
        print(
            f"  Successful connections: {metrics.successful_connections}/{metrics.total_connections}"
        )
        print(f"  Events sent: {metrics.events_sent}")
        print(f"  Events received: {metrics.events_received}")
        print(f"  Avg response time: {metrics.avg_response_time_ms:.2f}ms")
        print(f"  Memory usage: {metrics.memory_usage_mb:.2f}MB")

    @pytest.mark.asyncio
    async def test_high_load_100_connections(self, load_tester):
        """Test high load with 100+ concurrent connections."""
        metrics = await load_tester.stress_test_concurrent_connections(
            num_connections=100, duration_seconds=30.0
        )

        # More lenient assertions for high load
        assert metrics.total_connections == 100
        assert metrics.successful_connections >= 80  # Allow 20% failure rate
        assert metrics.events_sent > 0
        assert metrics.avg_response_time_ms < 1000  # Under 1s average
        assert metrics.memory_usage_mb < 200  # Under memory threshold

        print("High load test results:")
        print(
            f"  Successful connections: {metrics.successful_connections}/{metrics.total_connections}"
        )
        print(f"  Events sent: {metrics.events_sent}")
        print(f"  Events received: {metrics.events_received}")
        print(f"  Avg response time: {metrics.avg_response_time_ms:.2f}ms")
        print(f"  Throughput: {metrics.throughput_events_per_second:.2f} events/s")
        print(f"  Memory usage: {metrics.memory_usage_mb:.2f}MB")

    @pytest.mark.asyncio
    async def test_rapid_event_broadcasting(self, load_tester):
        """Test rapid event broadcasting - hundreds of events quickly."""
        session_id = "rapid_test_session"

        start_time = time.time()

        # Start a client
        client_task = asyncio.create_task(
            load_tester.simulate_sse_client(session_id, 15.0)
        )

        # Wait a moment for client to connect
        await asyncio.sleep(1.0)

        # Broadcast 500 events rapidly
        await load_tester.broadcast_events_rapidly(session_id, 500, 200)

        # Wait for client to finish
        client_result = await client_task

        duration = time.time() - start_time

        assert client_result["success"]
        assert client_result["events_received"] >= 450  # Allow some loss
        assert load_tester.metrics.events_sent == 500
        assert duration < 20.0  # Should complete quickly

        print("Rapid broadcasting test results:")
        print(f"  Events sent: {load_tester.metrics.events_sent}")
        print(f"  Events received: {client_result['events_received']}")
        print(f"  Duration: {duration:.2f}s")
        print(
            f"  Throughput: {load_tester.metrics.events_sent / duration:.2f} events/s"
        )

    @pytest.mark.asyncio
    async def test_memory_leak_detection(self, load_tester):
        """Test for memory leaks over multiple connection cycles."""
        result = await load_tester.memory_leak_test(cycles=5, connections_per_cycle=30)

        assert not result["memory_leak_detected"], (
            f"Memory leak detected! Max delta: {result['max_memory_delta_mb']:.2f}MB"
        )
        assert result["avg_memory_delta_mb"] < 5.0  # Average delta should be small

        print("Memory leak test results:")
        print(f"  Cycles: {result['cycles']}")
        print(f"  Total connections tested: {result['total_connections_tested']}")
        print(f"  Average memory delta: {result['avg_memory_delta_mb']:.2f}MB")
        print(f"  Max memory delta: {result['max_memory_delta_mb']:.2f}MB")
        print(f"  Memory leak detected: {result['memory_leak_detected']}")

    @pytest.mark.asyncio
    async def test_client_disconnect_cleanup(self, load_tester):
        """Test proper cleanup when clients disconnect."""
        session_id = "disconnect_test_session"

        # Start multiple clients
        client_tasks = []
        for i in range(10):
            task = asyncio.create_task(
                load_tester.simulate_sse_client(f"{session_id}_{i}", 5.0)
            )
            client_tasks.append(task)

        # Wait a moment for connections
        await asyncio.sleep(2.0)

        # Get initial stats
        initial_stats = load_tester.broadcaster.get_stats()
        initial_subscribers = initial_stats["totalSubscribers"]

        assert initial_subscribers >= 8  # Most should have connected

        # Cancel some clients abruptly
        for i in range(0, 5):
            client_tasks[i].cancel()

        # Wait for remaining clients to finish naturally
        remaining_results = await asyncio.gather(
            *client_tasks[5:], return_exceptions=True
        )

        # Allow cleanup to run
        await asyncio.sleep(2.0)
        await load_tester.broadcaster._perform_cleanup()

        # Check final stats
        final_stats = load_tester.broadcaster.get_stats()
        final_subscribers = final_stats["totalSubscribers"]

        assert final_subscribers == 0  # All should be cleaned up

        print("Disconnect cleanup test results:")
        print(f"  Initial subscribers: {initial_subscribers}")
        print(f"  Final subscribers: {final_subscribers}")
        print(f"  Successful cleanups: {initial_subscribers - final_subscribers}")

    @pytest.mark.asyncio
    async def test_session_isolation(self, load_tester):
        """Test that sessions are properly isolated."""
        sessions = ["session_a", "session_b", "session_c"]

        # Start clients for each session
        client_tasks = []
        for session_id in sessions:
            for i in range(3):
                task = asyncio.create_task(
                    load_tester.simulate_sse_client(f"{session_id}_{i}", 10.0)
                )
                client_tasks.append(task)

        await asyncio.sleep(1.0)

        # Send different events to each session
        for i, session_id in enumerate(sessions):
            await load_tester.broadcast_events_rapidly(session_id, 50, 100)

        # Wait for all clients to finish
        results = await asyncio.gather(*client_tasks, return_exceptions=True)

        # Verify session isolation
        session_a_events = sum(
            1 for r in results[:3] if isinstance(r, dict) and r["events_received"] > 0
        )
        session_b_events = sum(
            1 for r in results[3:6] if isinstance(r, dict) and r["events_received"] > 0
        )
        session_c_events = sum(
            1 for r in results[6:9] if isinstance(r, dict) and r["events_received"] > 0
        )

        assert session_a_events >= 2  # Most clients should receive events
        assert session_b_events >= 2
        assert session_c_events >= 2

        print("Session isolation test results:")
        print(f"  Session A clients with events: {session_a_events}/3")
        print(f"  Session B clients with events: {session_b_events}/3")
        print(f"  Session C clients with events: {session_c_events}/3")

    @pytest.mark.asyncio
    async def test_production_simulation(self, load_tester):
        """Simulate production-like workload."""
        # Multiple sessions with varying connection patterns
        sessions = [f"prod_session_{i}" for i in range(10)]

        # Start background event generation
        async def background_events():
            while True:
                session_id = random.choice(sessions)
                event_data = {
                    "type": random.choice(
                        ["agent_start", "agent_complete", "agent_update"]
                    ),
                    "data": {
                        "agent_id": f"agent_{random.randint(1, 20)}",
                        "message": f"Production event {time.time()}",
                        "timestamp": time.time(),
                    },
                }
                await load_tester.broadcaster.broadcast_event(session_id, event_data)
                await asyncio.sleep(random.uniform(0.1, 2.0))

        event_task = asyncio.create_task(background_events())

        # Simulate clients connecting and disconnecting over time
        client_tasks = []

        for cycle in range(3):
            # Staggered client connections
            batch_tasks = []
            for session_id in sessions:
                # 1-3 clients per session
                for _ in range(random.randint(1, 3)):
                    duration = random.uniform(15.0, 25.0)
                    task = asyncio.create_task(
                        load_tester.simulate_sse_client(session_id, duration)
                    )
                    batch_tasks.append(task)

            client_tasks.extend(batch_tasks)

            # Wait between connection batches
            await asyncio.sleep(10.0)

        # Let it run for a while
        await asyncio.sleep(30.0)

        # Stop background events
        event_task.cancel()

        # Wait for all clients
        results = await asyncio.gather(*client_tasks, return_exceptions=True)

        # Analyze results
        successful = [
            r for r in results if isinstance(r, dict) and r.get("success", False)
        ]
        total_events_received = sum(r.get("events_received", 0) for r in successful)

        # Get final stats
        final_stats = load_tester.broadcaster.get_stats()

        assert len(successful) >= len(client_tasks) * 0.8  # 80% success rate
        assert total_events_received > 100  # Should have received many events
        assert final_stats["memoryUsageMB"] < 150  # Memory under control

        print("Production simulation test results:")
        print(f"  Total clients: {len(client_tasks)}")
        print(f"  Successful clients: {len(successful)}")
        print(f"  Total events received: {total_events_received}")
        print(f"  Final memory usage: {final_stats['memoryUsageMB']:.2f}MB")
        print(f"  Active sessions: {final_stats['totalSessions']}")


if __name__ == "__main__":
    # Run specific load tests
    async def run_load_tests():
        broadcaster = EnhancedSSEBroadcaster(config=TEST_CONFIG)
        load_tester = SSELoadTester(broadcaster)

        try:
            print("Running SSE Load Tests...")

            # Run moderate load test
            print("\n=== Moderate Load Test (50 connections) ===")
            await load_tester.stress_test_concurrent_connections(50, 20.0)

            # Run high load test
            print("\n=== High Load Test (100 connections) ===")
            await load_tester.stress_test_concurrent_connections(100, 30.0)

            # Run memory leak test
            print("\n=== Memory Leak Test ===")
            await load_tester.memory_leak_test(5, 20)

            print("\nAll load tests completed!")

        finally:
            await broadcaster.shutdown()

    asyncio.run(run_load_tests())
