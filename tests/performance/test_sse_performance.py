"""SSE Performance Benchmarking and Stress Testing.

This module provides comprehensive performance benchmarking for the SSE
broadcaster system, including throughput testing, latency analysis,
and scalability assessment.
"""

import asyncio
import statistics
import time
from dataclasses import dataclass
from typing import Any

import pytest

from app.utils.sse_broadcaster import (
    BroadcasterConfig,
    EnhancedSSEBroadcaster,
)


@dataclass
class PerformanceMetrics:
    """Performance metrics for benchmarking."""

    test_name: str
    duration_seconds: float
    total_events_sent: int
    total_events_received: int
    total_connections: int
    successful_connections: int

    # Throughput metrics
    events_per_second: float
    connections_per_second: float

    # Latency metrics
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float

    # Resource metrics
    peak_memory_mb: float
    avg_cpu_percent: float

    # Success rates
    event_delivery_rate: float
    connection_success_rate: float


class SSEPerformanceBenchmark:
    """SSE Performance benchmarking utility."""

    def __init__(self, broadcaster: EnhancedSSEBroadcaster):
        self.broadcaster = broadcaster
        self.latency_measurements: list[float] = []
        self.memory_samples: list[float] = []

    async def benchmark_throughput(
        self,
        concurrent_connections: int = 100,
        events_per_connection: int = 100,
        duration_seconds: float = 60.0
    ) -> PerformanceMetrics:
        """Benchmark event throughput under load."""
        print(f"Starting throughput benchmark: {concurrent_connections} connections, "
              f"{events_per_connection} events each")

        start_time = time.time()
        self.latency_measurements.clear()
        self.memory_samples.clear()

        # Statistics
        events_sent = 0
        events_received = 0
        successful_connections = 0

        async def client_worker(client_id: int) -> dict[str, Any]:
            """Worker that simulates a client connection."""
            session_id = f"benchmark_session_{client_id}"
            client_events_received = 0
            client_latencies = []

            try:
                async with self.broadcaster.subscribe(session_id) as queue:
                    # Client is now connected
                    client_start = time.time()

                    # Start receiving events
                    receive_task = asyncio.create_task(
                        self._receive_events(queue, client_latencies)
                    )

                    # Wait for test duration or until receive task completes
                    try:
                        await asyncio.wait_for(receive_task, timeout=duration_seconds)
                    except asyncio.TimeoutError:
                        receive_task.cancel()

                    client_duration = time.time() - client_start
                    client_events_received = len(client_latencies)

                    return {
                        "client_id": client_id,
                        "success": True,
                        "events_received": client_events_received,
                        "duration": client_duration,
                        "latencies": client_latencies,
                    }

            except Exception as e:
                print(f"Client {client_id} error: {e}")
                return {
                    "client_id": client_id,
                    "success": False,
                    "events_received": 0,
                    "duration": 0,
                    "latencies": [],
                }

        async def event_broadcaster() -> int:
            """Broadcast events to all sessions."""
            events_broadcast = 0

            for event_num in range(events_per_connection):
                broadcast_tasks = []

                for client_id in range(concurrent_connections):
                    session_id = f"benchmark_session_{client_id}"
                    event_data = {
                        "type": "benchmark_event",
                        "data": {
                            "event_id": event_num,
                            "client_id": client_id,
                            "timestamp": time.time(),
                            "payload": f"Event {event_num} for client {client_id}",
                        },
                    }

                    task = asyncio.create_task(
                        self.broadcaster.broadcast_event(session_id, event_data)
                    )
                    broadcast_tasks.append(task)

                # Wait for all broadcasts to complete
                await asyncio.gather(*broadcast_tasks)
                events_broadcast += concurrent_connections

                # Small delay to avoid overwhelming
                await asyncio.sleep(0.01)

            return events_broadcast

        # Start all client workers
        client_tasks = [
            asyncio.create_task(client_worker(i))
            for i in range(concurrent_connections)
        ]

        # Start event broadcasting
        broadcast_task = asyncio.create_task(event_broadcaster())

        # Memory monitoring task
        monitor_task = asyncio.create_task(
            self._monitor_memory_usage(duration_seconds)
        )

        # Wait for all tasks to complete
        client_results = await asyncio.gather(*client_tasks)
        events_sent = await broadcast_task
        await monitor_task

        # Calculate metrics
        total_duration = time.time() - start_time

        # Aggregate client results
        successful_clients = [r for r in client_results if r["success"]]
        successful_connections = len(successful_clients)

        total_events_received = sum(r["events_received"] for r in successful_clients)
        all_latencies = []
        for result in successful_clients:
            all_latencies.extend(result["latencies"])

        # Calculate performance metrics
        events_per_second = events_sent / total_duration if total_duration > 0 else 0
        connections_per_second = successful_connections / total_duration if total_duration > 0 else 0

        # Latency statistics
        if all_latencies:
            avg_latency = statistics.mean(all_latencies)
            p50_latency = statistics.median(all_latencies)
            p95_latency = self._percentile(all_latencies, 0.95)
            p99_latency = self._percentile(all_latencies, 0.99)
            max_latency = max(all_latencies)
        else:
            avg_latency = p50_latency = p95_latency = p99_latency = max_latency = 0.0

        # Resource metrics
        peak_memory = max(self.memory_samples) if self.memory_samples else 0.0

        # Success rates
        event_delivery_rate = (total_events_received / events_sent * 100) if events_sent > 0 else 0
        connection_success_rate = (successful_connections / concurrent_connections * 100)

        return PerformanceMetrics(
            test_name="throughput_benchmark",
            duration_seconds=total_duration,
            total_events_sent=events_sent,
            total_events_received=total_events_received,
            total_connections=concurrent_connections,
            successful_connections=successful_connections,
            events_per_second=events_per_second,
            connections_per_second=connections_per_second,
            avg_latency_ms=avg_latency,
            p50_latency_ms=p50_latency,
            p95_latency_ms=p95_latency,
            p99_latency_ms=p99_latency,
            max_latency_ms=max_latency,
            peak_memory_mb=peak_memory,
            avg_cpu_percent=0.0,  # Could implement CPU monitoring
            event_delivery_rate=event_delivery_rate,
            connection_success_rate=connection_success_rate,
        )

    async def benchmark_connection_scalability(
        self,
        connection_counts: list[int] = [10, 50, 100, 200, 500]
    ) -> list[PerformanceMetrics]:
        """Benchmark scalability with increasing connection counts."""
        results = []

        for connection_count in connection_counts:
            print(f"Testing scalability with {connection_count} connections...")

            # Run shorter test for scalability
            metrics = await self.benchmark_throughput(
                concurrent_connections=connection_count,
                events_per_connection=50,
                duration_seconds=30.0
            )

            metrics.test_name = f"scalability_{connection_count}_connections"
            results.append(metrics)

            # Cleanup between tests
            await asyncio.sleep(2.0)
            await self.broadcaster._perform_cleanup()

        return results

    async def benchmark_latency_distribution(
        self,
        event_count: int = 1000,
        connection_count: int = 10
    ) -> PerformanceMetrics:
        """Benchmark latency distribution for detailed analysis."""
        print(f"Starting latency benchmark: {connection_count} connections, {event_count} events")

        start_time = time.time()
        self.latency_measurements.clear()

        # Create connections
        sessions = []
        queues = []

        for i in range(connection_count):
            session_id = f"latency_test_session_{i}"
            queue = await self.broadcaster.add_subscriber(session_id)
            sessions.append(session_id)
            queues.append(queue)

        # Give connections time to establish
        await asyncio.sleep(1.0)

        event_latencies = []
        events_sent = 0
        events_received = 0

        try:
            # Send events and measure latency
            for event_num in range(event_count):
                session_id = sessions[event_num % len(sessions)]

                # Record send time
                send_time = time.perf_counter()

                event_data = {
                    "type": "latency_test_event",
                    "data": {
                        "event_id": event_num,
                        "send_time": send_time,
                        "payload": "Latency test data",
                    },
                }

                # Send event
                await self.broadcaster.broadcast_event(session_id, event_data)
                events_sent += 1

                # Immediately try to receive (for latency measurement)
                queue_index = event_num % len(queues)
                try:
                    received_event = await asyncio.wait_for(
                        queues[queue_index].get(timeout=1.0), timeout=2.0
                    )
                    receive_time = time.perf_counter()

                    # Calculate latency
                    latency_ms = (receive_time - send_time) * 1000
                    event_latencies.append(latency_ms)
                    events_received += 1

                except asyncio.TimeoutError:
                    # Event not received in time
                    pass

                # Small delay between events
                await asyncio.sleep(0.01)

        finally:
            # Cleanup
            for i, queue in enumerate(queues):
                await self.broadcaster.remove_subscriber(sessions[i], queue)

        total_duration = time.time() - start_time

        # Calculate metrics
        if event_latencies:
            avg_latency = statistics.mean(event_latencies)
            p50_latency = statistics.median(event_latencies)
            p95_latency = self._percentile(event_latencies, 0.95)
            p99_latency = self._percentile(event_latencies, 0.99)
            max_latency = max(event_latencies)
        else:
            avg_latency = p50_latency = p95_latency = p99_latency = max_latency = 0.0

        return PerformanceMetrics(
            test_name="latency_distribution",
            duration_seconds=total_duration,
            total_events_sent=events_sent,
            total_events_received=events_received,
            total_connections=connection_count,
            successful_connections=connection_count,
            events_per_second=events_sent / total_duration if total_duration > 0 else 0,
            connections_per_second=0,
            avg_latency_ms=avg_latency,
            p50_latency_ms=p50_latency,
            p95_latency_ms=p95_latency,
            p99_latency_ms=p99_latency,
            max_latency_ms=max_latency,
            peak_memory_mb=0.0,
            avg_cpu_percent=0.0,
            event_delivery_rate=(events_received / events_sent * 100) if events_sent > 0 else 0,
            connection_success_rate=100.0,
        )

    async def _receive_events(self, queue, latencies: list[float]) -> None:
        """Helper to receive events and measure latencies."""
        try:
            while True:
                start_time = time.perf_counter()
                event = await queue.get(timeout=30.0)
                end_time = time.perf_counter()

                # Calculate latency (queue processing time)
                latency_ms = (end_time - start_time) * 1000
                latencies.append(latency_ms)

        except asyncio.TimeoutError:
            # Normal timeout for keepalive
            pass
        except asyncio.CancelledError:
            # Task was cancelled
            pass

    async def _monitor_memory_usage(self, duration: float) -> None:
        """Monitor memory usage during test."""
        start_time = time.time()

        while time.time() - start_time < duration:
            try:
                stats = self.broadcaster.get_stats()
                memory_mb = stats.get("memoryUsageMB", 0.0)
                self.memory_samples.append(memory_mb)
                await asyncio.sleep(1.0)
            except Exception:
                break

    def _percentile(self, data: list[float], percentile: float) -> float:
        """Calculate percentile of a list."""
        if not data:
            return 0.0

        sorted_data = sorted(data)
        index = int(percentile * len(sorted_data))
        index = min(index, len(sorted_data) - 1)
        return sorted_data[index]

    def print_metrics(self, metrics: PerformanceMetrics) -> None:
        """Pretty print performance metrics."""
        print(f"\n=== Performance Metrics: {metrics.test_name} ===")
        print(f"Duration: {metrics.duration_seconds:.2f}s")
        print("")
        print("Throughput:")
        print(f"  Events/sec: {metrics.events_per_second:.1f}")
        print(f"  Connections: {metrics.successful_connections}/{metrics.total_connections}")
        print(f"  Connection success rate: {metrics.connection_success_rate:.1f}%")
        print("")
        print("Event Delivery:")
        print(f"  Events sent: {metrics.total_events_sent}")
        print(f"  Events received: {metrics.total_events_received}")
        print(f"  Delivery rate: {metrics.event_delivery_rate:.1f}%")
        print("")
        print("Latency (ms):")
        print(f"  Average: {metrics.avg_latency_ms:.2f}")
        print(f"  P50: {metrics.p50_latency_ms:.2f}")
        print(f"  P95: {metrics.p95_latency_ms:.2f}")
        print(f"  P99: {metrics.p99_latency_ms:.2f}")
        print(f"  Max: {metrics.max_latency_ms:.2f}")
        print("")
        print("Resources:")
        print(f"  Peak memory: {metrics.peak_memory_mb:.2f}MB")


class TestSSEPerformance:
    """SSE Performance Test Suite."""

    @pytest.fixture
    async def broadcaster(self):
        """Create high-performance broadcaster configuration."""
        config = BroadcasterConfig(
            max_queue_size=2000,
            max_history_per_session=100,
            event_ttl=300.0,
            session_ttl=1800.0,
            cleanup_interval=30.0,
            enable_metrics=True,
            max_subscriber_idle_time=600.0,
        )
        broadcaster = EnhancedSSEBroadcaster(config)
        yield broadcaster
        await broadcaster.shutdown()

    @pytest.fixture
    def benchmark(self, broadcaster):
        """Create benchmark instance."""
        return SSEPerformanceBenchmark(broadcaster)

    @pytest.mark.asyncio
    async def test_moderate_throughput_benchmark(self, benchmark):
        """Test moderate throughput performance."""
        metrics = await benchmark.benchmark_throughput(
            concurrent_connections=50,
            events_per_connection=100,
            duration_seconds=30.0
        )

        benchmark.print_metrics(metrics)

        # Performance assertions
        assert metrics.connection_success_rate >= 95.0
        assert metrics.event_delivery_rate >= 90.0
        assert metrics.events_per_second >= 100.0
        assert metrics.avg_latency_ms <= 100.0
        assert metrics.p95_latency_ms <= 500.0
        assert metrics.peak_memory_mb <= 100.0

    @pytest.mark.asyncio
    async def test_high_throughput_benchmark(self, benchmark):
        """Test high throughput performance."""
        metrics = await benchmark.benchmark_throughput(
            concurrent_connections=100,
            events_per_connection=200,
            duration_seconds=45.0
        )

        benchmark.print_metrics(metrics)

        # More lenient assertions for high load
        assert metrics.connection_success_rate >= 85.0
        assert metrics.event_delivery_rate >= 80.0
        assert metrics.events_per_second >= 200.0
        assert metrics.avg_latency_ms <= 200.0
        assert metrics.p95_latency_ms <= 1000.0
        assert metrics.peak_memory_mb <= 200.0

    @pytest.mark.asyncio
    async def test_connection_scalability(self, benchmark):
        """Test connection scalability."""
        connection_counts = [10, 25, 50, 100]
        results = await benchmark.benchmark_connection_scalability(connection_counts)

        print("\n=== Connection Scalability Results ===")
        for metrics in results:
            print(f"Connections: {metrics.total_connections:3d} | "
                  f"Events/s: {metrics.events_per_second:6.1f} | "
                  f"Success: {metrics.connection_success_rate:5.1f}% | "
                  f"Latency P95: {metrics.p95_latency_ms:6.1f}ms | "
                  f"Memory: {metrics.peak_memory_mb:5.1f}MB")

        # Check that performance doesn't degrade too much with scale
        baseline = results[0]  # 10 connections
        high_load = results[-1]  # 100 connections

        # Events per second should not degrade by more than 50%
        throughput_ratio = high_load.events_per_second / baseline.events_per_second
        assert throughput_ratio >= 0.5, f"Throughput degraded too much: {throughput_ratio:.2f}"

        # Latency should not increase by more than 5x
        latency_ratio = high_load.p95_latency_ms / baseline.p95_latency_ms
        assert latency_ratio <= 5.0, f"Latency increased too much: {latency_ratio:.2f}x"

    @pytest.mark.asyncio
    async def test_latency_distribution(self, benchmark):
        """Test latency distribution analysis."""
        metrics = await benchmark.benchmark_latency_distribution(
            event_count=500,
            connection_count=20
        )

        benchmark.print_metrics(metrics)

        # Latency assertions
        assert metrics.avg_latency_ms <= 50.0
        assert metrics.p50_latency_ms <= 30.0
        assert metrics.p95_latency_ms <= 150.0
        assert metrics.p99_latency_ms <= 300.0
        assert metrics.event_delivery_rate >= 95.0

    @pytest.mark.asyncio
    async def test_sustained_load_performance(self, benchmark):
        """Test performance under sustained load."""
        # Longer duration test to check for performance degradation
        metrics = await benchmark.benchmark_throughput(
            concurrent_connections=75,
            events_per_connection=300,
            duration_seconds=90.0
        )

        benchmark.print_metrics(metrics)

        # Sustained load assertions
        assert metrics.connection_success_rate >= 85.0
        assert metrics.event_delivery_rate >= 85.0
        assert metrics.events_per_second >= 150.0
        assert metrics.avg_latency_ms <= 150.0
        assert metrics.peak_memory_mb <= 150.0

    @pytest.mark.asyncio
    async def test_burst_load_performance(self, benchmark):
        """Test performance under burst load conditions."""
        # Simulate burst by sending many events quickly
        session_id = "burst_test_session"

        # Create connections
        connections = []
        for i in range(20):
            queue = await benchmark.broadcaster.add_subscriber(f"{session_id}_{i}")
            connections.append((f"{session_id}_{i}", queue))

        start_time = time.time()

        try:
            # Send burst of events
            burst_size = 1000
            batch_size = 50

            for batch in range(0, burst_size, batch_size):
                tasks = []

                for i in range(batch, min(batch + batch_size, burst_size)):
                    session_target = f"{session_id}_{i % len(connections)}"
                    event_data = {
                        "type": "burst_event",
                        "data": {"sequence": i, "timestamp": time.time()},
                    }

                    task = asyncio.create_task(
                        benchmark.broadcaster.broadcast_event(session_target, event_data)
                    )
                    tasks.append(task)

                # Wait for batch to complete
                await asyncio.gather(*tasks)

                # Small delay between batches
                await asyncio.sleep(0.1)

            # Allow events to be received
            await asyncio.sleep(5.0)

            total_duration = time.time() - start_time
            burst_throughput = burst_size / total_duration

            print("\n=== Burst Load Performance ===")
            print(f"Burst size: {burst_size} events")
            print(f"Duration: {total_duration:.2f}s")
            print(f"Throughput: {burst_throughput:.1f} events/s")

            # Should handle burst without crashing
            assert burst_throughput >= 100.0

            # System should remain stable
            stats = benchmark.broadcaster.get_stats()
            assert stats["totalSessions"] >= len(connections)

        finally:
            # Cleanup
            for session_id_i, queue in connections:
                await benchmark.broadcaster.remove_subscriber(session_id_i, queue)


if __name__ == "__main__":
    # Run performance benchmarks
    async def run_benchmarks():
        config = BroadcasterConfig(
            max_queue_size=2000,
            max_history_per_session=100,
            cleanup_interval=30.0,
            enable_metrics=True,
        )
        broadcaster = EnhancedSSEBroadcaster(config)
        benchmark = SSEPerformanceBenchmark(broadcaster)

        try:
            print("Running SSE Performance Benchmarks...")

            # Run throughput benchmark
            print("\n=== Throughput Benchmark ===")
            throughput_metrics = await benchmark.benchmark_throughput(
                concurrent_connections=100,
                events_per_connection=100,
                duration_seconds=45.0
            )
            benchmark.print_metrics(throughput_metrics)

            # Run scalability test
            print("\n=== Scalability Test ===")
            scalability_results = await benchmark.benchmark_connection_scalability()

            # Run latency test
            print("\n=== Latency Distribution Test ===")
            latency_metrics = await benchmark.benchmark_latency_distribution(
                event_count=500,
                connection_count=20
            )
            benchmark.print_metrics(latency_metrics)

            print("\nAll benchmarks completed!")

        finally:
            await broadcaster.shutdown()

    asyncio.run(run_benchmarks())
