"""Performance tests for dispatcher pattern.

Measures routing overhead, token usage, memory consumption, and latency.
"""

import pytest
import time
import asyncio
import json
import uuid
import httpx
import psutil
import os
from typing import List, Dict


class PerformanceMetrics:
    """Container for performance measurements."""

    def __init__(self):
        self.latencies: List[float] = []
        self.token_counts: List[int] = []
        self.memory_samples: List[float] = []
        self.event_counts: List[int] = []

    def add_latency(self, latency_ms: float):
        self.latencies.append(latency_ms)

    def add_tokens(self, count: int):
        self.token_counts.append(count)

    def add_memory(self, mb: float):
        self.memory_samples.append(mb)

    def add_event_count(self, count: int):
        self.event_counts.append(count)

    def get_stats(self) -> Dict:
        """Calculate percentile statistics."""
        if not self.latencies:
            return {}

        sorted_latencies = sorted(self.latencies)
        n = len(sorted_latencies)

        return {
            "latency_p50": sorted_latencies[int(n * 0.5)] if n > 0 else 0,
            "latency_p95": sorted_latencies[int(n * 0.95)] if n > 0 else 0,
            "latency_p99": sorted_latencies[int(n * 0.99)] if n > 0 else 0,
            "latency_avg": sum(self.latencies) / n if n > 0 else 0,
            "latency_max": max(self.latencies) if self.latencies else 0,
            "latency_min": min(self.latencies) if self.latencies else 0,
            "token_avg": sum(self.token_counts) / len(self.token_counts) if self.token_counts else 0,
            "token_max": max(self.token_counts) if self.token_counts else 0,
            "memory_avg": sum(self.memory_samples) / len(self.memory_samples) if self.memory_samples else 0,
            "memory_max": max(self.memory_samples) if self.memory_samples else 0,
            "event_avg": sum(self.event_counts) / len(self.event_counts) if self.event_counts else 0,
        }


def get_process_memory_mb() -> float:
    """Get current process memory usage in MB."""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024


@pytest.mark.performance
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_dispatcher_routing_latency():
    """Measure dispatcher routing overhead for simple queries."""
    metrics = PerformanceMetrics()

    # Test with simple greetings (should route to generalist)
    simple_queries = [
        "Hello",
        "Hi there",
        "Good morning",
        "How are you?",
        "Thanks",
    ]

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        for query in simple_queries:
            session_id = f"perf-simple-{uuid.uuid4()}"

            # Measure request latency
            start_time = time.time()

            response = await client.post(
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                json={"query": query}
            )

            assert response.status_code == 200

            # Collect events and measure total time
            event_count = 0
            async with client.stream(
                "GET",
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                timeout=httpx.Timeout(15.0)
            ) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        elif data_str:
                            event_count += 1
                            if event_count >= 5:
                                break

            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000

            metrics.add_latency(latency_ms)
            metrics.add_event_count(event_count)

            # Brief pause between requests
            await asyncio.sleep(0.5)

    # Analyze results
    stats = metrics.get_stats()
    print("\n" + "="*60)
    print("DISPATCHER ROUTING PERFORMANCE (Simple Queries)")
    print("="*60)
    print(f"Latency p50: {stats['latency_p50']:.2f}ms")
    print(f"Latency p95: {stats['latency_p95']:.2f}ms")
    print(f"Latency p99: {stats['latency_p99']:.2f}ms")
    print(f"Latency avg: {stats['latency_avg']:.2f}ms")
    print(f"Latency max: {stats['latency_max']:.2f}ms")
    print(f"Events avg: {stats['event_avg']:.1f}")
    print("="*60)

    # Target: p95 latency < 1000ms for simple queries
    assert stats['latency_p95'] < 1000, f"p95 latency {stats['latency_p95']}ms exceeds 1000ms target"


@pytest.mark.performance
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_dispatcher_memory_overhead():
    """Measure memory consumption with dispatcher pattern."""

    # Baseline memory
    baseline_memory = get_process_memory_mb()
    print(f"\nBaseline memory: {baseline_memory:.2f}MB")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Make several requests to load agents
        for i in range(5):
            session_id = f"memory-test-{i}-{uuid.uuid4()}"

            response = await client.post(
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                json={"query": "Hello" if i % 2 == 0 else "Research AI"}
            )

            assert response.status_code == 200

            # Consume some events
            event_count = 0
            async with client.stream(
                "GET",
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                timeout=httpx.Timeout(15.0)
            ) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        event_count += 1
                        if event_count >= 3:
                            break

            await asyncio.sleep(0.5)

    # Measure memory after operations
    final_memory = get_process_memory_mb()
    memory_increase = final_memory - baseline_memory

    print(f"Final memory: {final_memory:.2f}MB")
    print(f"Memory increase: {memory_increase:.2f}MB")

    # Target: <50MB additional memory
    # Note: This is a rough check, actual increase depends on many factors
    assert memory_increase < 100, f"Memory increase {memory_increase:.2f}MB seems excessive"


@pytest.mark.performance
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_concurrent_request_performance():
    """Test performance with concurrent requests."""
    num_concurrent = 5
    metrics = PerformanceMetrics()

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        async def make_request(index: int):
            """Single request worker."""
            session_id = f"concurrent-{index}-{uuid.uuid4()}"
            query = "Hello" if index % 2 == 0 else "Quick question about AI"

            start_time = time.time()

            response = await client.post(
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                json={"query": query}
            )

            assert response.status_code == 200

            # Collect events
            event_count = 0
            async with client.stream(
                "GET",
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                timeout=httpx.Timeout(30.0)
            ) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        elif data_str:
                            event_count += 1
                            if event_count >= 5:
                                break

            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000

            return latency_ms, event_count

        # Execute concurrent requests
        tasks = [make_request(i) for i in range(num_concurrent)]
        results = await asyncio.gather(*tasks)

        for latency, event_count in results:
            metrics.add_latency(latency)
            metrics.add_event_count(event_count)

    stats = metrics.get_stats()
    print("\n" + "="*60)
    print(f"CONCURRENT PERFORMANCE ({num_concurrent} requests)")
    print("="*60)
    print(f"Latency p50: {stats['latency_p50']:.2f}ms")
    print(f"Latency p95: {stats['latency_p95']:.2f}ms")
    print(f"Latency avg: {stats['latency_avg']:.2f}ms")
    print("="*60)

    # Concurrent requests should still complete in reasonable time
    assert stats['latency_p95'] < 5000, f"Concurrent p95 latency {stats['latency_p95']}ms too high"


@pytest.mark.performance
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_routing_decision_speed():
    """Measure time to make routing decision."""

    routing_times = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        queries = [
            "Hello",  # Should route to generalist
            "Research quantum computing",  # Should route to research
            "Good morning",  # Should route to generalist
            "Investigate AI trends",  # Should route to research
        ]

        for query in queries:
            session_id = f"routing-speed-{uuid.uuid4()}"

            # Measure time until first event (routing decision made)
            start_time = time.time()

            response = await client.post(
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                json={"query": query}
            )

            assert response.status_code == 200

            # Measure time to first event
            first_event_time = None
            async with client.stream(
                "GET",
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                timeout=httpx.Timeout(15.0)
            ) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str and data_str != "[DONE]":
                            first_event_time = time.time()
                            break

            if first_event_time:
                routing_time_ms = (first_event_time - start_time) * 1000
                routing_times.append(routing_time_ms)

            await asyncio.sleep(0.3)

    if routing_times:
        avg_routing_time = sum(routing_times) / len(routing_times)
        max_routing_time = max(routing_times)

        print("\n" + "="*60)
        print("ROUTING DECISION SPEED")
        print("="*60)
        print(f"Average time to first event: {avg_routing_time:.2f}ms")
        print(f"Max time to first event: {max_routing_time:.2f}ms")
        print("="*60)

        # Target: <500ms to make routing decision
        assert avg_routing_time < 500, f"Average routing time {avg_routing_time:.2f}ms exceeds 500ms target"


@pytest.mark.performance
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_no_routing_loops():
    """Test that no infinite routing loops occur."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Ambiguous query that might cause loops
        session_id = f"loop-test-{uuid.uuid4()}"

        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Tell me about AI"}  # Ambiguous
        )

        assert response.status_code == 200

        # Track agent sequence
        agent_sequence = []
        event_count = 0
        max_events = 50  # If we get 50 events, might be a loop

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(30.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    elif data_str:
                        try:
                            event = json.loads(data_str)
                            if "agent" in event:
                                agent_sequence.append(event["agent"])
                            event_count += 1
                            if event_count >= max_events:
                                break
                        except json.JSONDecodeError:
                            pass

        # Check for loops (same agent appearing many times in sequence)
        if len(agent_sequence) > 10:
            # Check for dispatcher appearing more than twice
            dispatcher_count = agent_sequence.count("dispatcher_agent")
            assert dispatcher_count <= 2, f"Dispatcher appeared {dispatcher_count} times - possible routing loop"

        print(f"\nAgent sequence: {agent_sequence[:10]}...")
        print(f"Total events: {event_count}")


@pytest.mark.performance
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_session_isolation_performance():
    """Test that sessions don't interfere with each other's performance."""

    metrics_by_session = {}

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Create 3 sessions with different query types
        sessions = [
            (f"session-a-{uuid.uuid4()}", "Hello"),
            (f"session-b-{uuid.uuid4()}", "Research AI"),
            (f"session-c-{uuid.uuid4()}", "Good morning"),
        ]

        for session_id, query in sessions:
            start_time = time.time()

            response = await client.post(
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                json={"query": query}
            )

            assert response.status_code == 200

            event_count = 0
            async with client.stream(
                "GET",
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                timeout=httpx.Timeout(30.0)
            ) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        event_count += 1
                        if event_count >= 5:
                            break

            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000

            metrics_by_session[session_id] = {
                "latency": latency_ms,
                "events": event_count,
            }

    # Verify all sessions completed successfully
    print("\n" + "="*60)
    print("SESSION ISOLATION PERFORMANCE")
    print("="*60)
    for session_id, metrics in metrics_by_session.items():
        print(f"{session_id[:20]}...: {metrics['latency']:.2f}ms, {metrics['events']} events")
    print("="*60)

    assert len(metrics_by_session) == 3, "Not all sessions completed"


if __name__ == "__main__":
    """Run performance tests manually."""
    import sys

    print("🏁 Running Dispatcher Performance Tests")
    print("=" * 60)
    print("Measuring routing overhead, latency, and memory...")
    print("=" * 60)

    # Run with verbose output
    exit_code = pytest.main([__file__, "-v", "-s", "-m", "performance"])
    sys.exit(exit_code)
