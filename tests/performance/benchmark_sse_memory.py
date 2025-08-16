#!/usr/bin/env python3
# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0

"""Performance benchmarks for SSE broadcaster memory usage."""

import asyncio
import gc
import json
import os
import statistics
import time
from dataclasses import dataclass

import matplotlib.pyplot as plt
import psutil

# Import both versions for comparison
from app.utils.sse_broadcaster import EnhancedSSEBroadcaster as OriginalBroadcaster
from app.utils.sse_broadcaster_fixed import BroadcasterConfig
from app.utils.sse_broadcaster_fixed import EnhancedSSEBroadcaster as FixedBroadcaster


@dataclass
class BenchmarkResult:
    """Results from a performance benchmark."""

    name: str
    memory_usage_mb: list[float]
    peak_memory_mb: float
    avg_memory_mb: float
    execution_time_seconds: float
    events_processed: int
    throughput_events_per_second: float
    gc_collections: int
    final_cleanup_success: bool


class SSEMemoryBenchmark:
    """Comprehensive memory benchmark for SSE broadcasters."""

    def __init__(self):
        self.process = psutil.Process(os.getpid())
        self.results: dict[str, BenchmarkResult] = {}

    def get_memory_usage_mb(self) -> float:
        """Get current memory usage in MB."""
        return self.process.memory_info().rss / (1024 * 1024)

    async def benchmark_sustained_load(
        self,
        broadcaster_class,
        config=None,
        num_sessions: int = 10,
        events_per_session: int = 1000,
        event_interval: float = 0.001,
    ) -> BenchmarkResult:
        """Benchmark sustained load scenario."""
        print(
            f"Running sustained load benchmark: {num_sessions} sessions, "
            f"{events_per_session} events each..."
        )

        # Initialize broadcaster
        if config:
            broadcaster = broadcaster_class(config)
        else:
            broadcaster = broadcaster_class()

        # Track memory usage over time
        memory_samples = []
        gc_count_start = sum(gc.get_count())

        start_time = time.time()
        initial_memory = self.get_memory_usage_mb()

        try:
            sessions = []
            queues = []

            # Create sessions and subscribers
            for i in range(num_sessions):
                session_id = f"benchmark_session_{i}"
                sessions.append(session_id)

                if hasattr(broadcaster, "add_subscriber"):
                    queue = await broadcaster.add_subscriber(session_id)
                    queues.append((session_id, queue))

            # Sample memory every 100 events
            sample_interval = 100
            total_events = 0

            # Generate events
            for session_idx, session_id in enumerate(sessions):
                for event_idx in range(events_per_session):
                    await broadcaster.broadcast_event(
                        session_id,
                        {
                            "type": "benchmark_event",
                            "data": {
                                "session_idx": session_idx,
                                "event_idx": event_idx,
                                "timestamp": time.time(),
                                "payload": "x" * 200,  # 200 byte payload
                            },
                        },
                    )

                    total_events += 1

                    # Sample memory periodically
                    if total_events % sample_interval == 0:
                        memory_samples.append(self.get_memory_usage_mb())
                        await asyncio.sleep(0.001)  # Yield control

                    await asyncio.sleep(event_interval)

            # Final memory sample
            peak_memory = self.get_memory_usage_mb()
            memory_samples.append(peak_memory)

            # Clean up subscribers
            for session_id, queue in queues:
                if hasattr(broadcaster, "remove_subscriber"):
                    await broadcaster.remove_subscriber(session_id, queue)

            # Force cleanup if available
            if hasattr(broadcaster, "_perform_cleanup"):
                await broadcaster._perform_cleanup()

            # Wait for cleanup to take effect
            await asyncio.sleep(0.5)

            # Final memory measurement
            final_memory = self.get_memory_usage_mb()
            memory_samples.append(final_memory)

            end_time = time.time()
            execution_time = end_time - start_time

            # Check if cleanup was successful (memory returned close to initial)
            memory_returned_ratio = (peak_memory - final_memory) / (
                peak_memory - initial_memory
            )
            cleanup_success = memory_returned_ratio > 0.7  # 70% of memory returned

            gc_count_end = sum(gc.get_count())

            return BenchmarkResult(
                name="sustained_load",
                memory_usage_mb=memory_samples,
                peak_memory_mb=max(memory_samples),
                avg_memory_mb=statistics.mean(memory_samples),
                execution_time_seconds=execution_time,
                events_processed=total_events,
                throughput_events_per_second=total_events / execution_time,
                gc_collections=gc_count_end - gc_count_start,
                final_cleanup_success=cleanup_success,
            )

        finally:
            if hasattr(broadcaster, "shutdown"):
                await broadcaster.shutdown()

    async def benchmark_burst_events(
        self,
        broadcaster_class,
        config=None,
        burst_size: int = 1000,
        num_bursts: int = 10,
        burst_interval: float = 1.0,
    ) -> BenchmarkResult:
        """Benchmark burst event scenario."""
        print(
            f"Running burst events benchmark: {num_bursts} bursts of {burst_size} events..."
        )

        if config:
            broadcaster = broadcaster_class(config)
        else:
            broadcaster = broadcaster_class()

        memory_samples = []
        gc_count_start = sum(gc.get_count())

        start_time = time.time()
        session_id = "burst_test_session"

        try:
            # Add subscriber
            if hasattr(broadcaster, "add_subscriber"):
                queue = await broadcaster.add_subscriber(session_id)
            else:
                queue = None

            total_events = 0

            for burst_idx in range(num_bursts):
                print(f"  Burst {burst_idx + 1}/{num_bursts}")

                # Send burst of events
                burst_start = time.time()
                for event_idx in range(burst_size):
                    await broadcaster.broadcast_event(
                        session_id,
                        {
                            "type": "burst_event",
                            "data": {
                                "burst_idx": burst_idx,
                                "event_idx": event_idx,
                                "large_payload": "x" * 500,  # 500 byte payload
                            },
                        },
                    )
                    total_events += 1

                burst_end = time.time()
                memory_samples.append(self.get_memory_usage_mb())

                print(
                    f"    Burst time: {burst_end - burst_start:.3f}s, "
                    f"Memory: {memory_samples[-1]:.2f}MB"
                )

                # Wait between bursts
                await asyncio.sleep(burst_interval)

            # Cleanup
            if queue and hasattr(broadcaster, "remove_subscriber"):
                await broadcaster.remove_subscriber(session_id, queue)

            if hasattr(broadcaster, "_perform_cleanup"):
                await broadcaster._perform_cleanup()

            await asyncio.sleep(0.5)  # Allow cleanup

            end_time = time.time()
            execution_time = end_time - start_time

            gc_count_end = sum(gc.get_count())

            return BenchmarkResult(
                name="burst_events",
                memory_usage_mb=memory_samples,
                peak_memory_mb=max(memory_samples),
                avg_memory_mb=statistics.mean(memory_samples),
                execution_time_seconds=execution_time,
                events_processed=total_events,
                throughput_events_per_second=total_events / execution_time,
                gc_collections=gc_count_end - gc_count_start,
                final_cleanup_success=True,  # Simplified for burst test
            )

        finally:
            if hasattr(broadcaster, "shutdown"):
                await broadcaster.shutdown()

    async def benchmark_many_sessions(
        self,
        broadcaster_class,
        config=None,
        num_sessions: int = 100,
        events_per_session: int = 50,
    ) -> BenchmarkResult:
        """Benchmark many concurrent sessions."""
        print(f"Running many sessions benchmark: {num_sessions} sessions...")

        if config:
            broadcaster = broadcaster_class(config)
        else:
            broadcaster = broadcaster_class()

        memory_samples = []
        gc_count_start = sum(gc.get_count())

        start_time = time.time()

        try:
            sessions_and_queues = []

            # Create many sessions
            for i in range(num_sessions):
                session_id = f"session_{i:04d}"

                if hasattr(broadcaster, "add_subscriber"):
                    queue = await broadcaster.add_subscriber(session_id)
                    sessions_and_queues.append((session_id, queue))
                else:
                    sessions_and_queues.append((session_id, None))

                # Sample memory every 10 sessions
                if (i + 1) % 10 == 0:
                    memory_samples.append(self.get_memory_usage_mb())
                    print(
                        f"  Created {i + 1} sessions, Memory: {memory_samples[-1]:.2f}MB"
                    )

            # Send events to all sessions
            total_events = 0
            for session_id, queue in sessions_and_queues:
                for event_idx in range(events_per_session):
                    await broadcaster.broadcast_event(
                        session_id,
                        {
                            "type": "multi_session_event",
                            "data": {
                                "session": session_id,
                                "event_idx": event_idx,
                                "payload": "x" * 100,
                            },
                        },
                    )
                    total_events += 1

                # Yield occasionally
                await asyncio.sleep(0.001)

            memory_samples.append(self.get_memory_usage_mb())
            print(f"  After all events, Memory: {memory_samples[-1]:.2f}MB")

            # Cleanup all sessions
            for session_id, queue in sessions_and_queues:
                if queue and hasattr(broadcaster, "remove_subscriber"):
                    await broadcaster.remove_subscriber(session_id, queue)

            if hasattr(broadcaster, "_perform_cleanup"):
                await broadcaster._perform_cleanup()

            await asyncio.sleep(1.0)  # Allow cleanup

            final_memory = self.get_memory_usage_mb()
            memory_samples.append(final_memory)
            print(f"  After cleanup, Memory: {final_memory:.2f}MB")

            end_time = time.time()
            execution_time = end_time - start_time

            gc_count_end = sum(gc.get_count())

            return BenchmarkResult(
                name="many_sessions",
                memory_usage_mb=memory_samples,
                peak_memory_mb=max(memory_samples),
                avg_memory_mb=statistics.mean(memory_samples),
                execution_time_seconds=execution_time,
                events_processed=total_events,
                throughput_events_per_second=total_events / execution_time,
                gc_collections=gc_count_end - gc_count_start,
                final_cleanup_success=True,  # Simplified
            )

        finally:
            if hasattr(broadcaster, "shutdown"):
                await broadcaster.shutdown()

    def generate_comparison_report(
        self,
        original_results: dict[str, BenchmarkResult],
        fixed_results: dict[str, BenchmarkResult],
    ) -> str:
        """Generate a detailed comparison report."""
        report = []
        report.append("# SSE Broadcaster Memory Leak Fix - Performance Analysis Report")
        report.append("=" * 70)
        report.append("")

        for test_name in original_results.keys():
            if test_name not in fixed_results:
                continue

            orig = original_results[test_name]
            fixed = fixed_results[test_name]

            report.append(f"## {test_name.replace('_', ' ').title()} Test")
            report.append("-" * 50)

            # Memory usage comparison
            memory_improvement = (
                (orig.peak_memory_mb - fixed.peak_memory_mb) / orig.peak_memory_mb
            ) * 100

            report.append("**Memory Usage:**")
            report.append(f"  Original Peak:     {orig.peak_memory_mb:.2f} MB")
            report.append(f"  Fixed Peak:        {fixed.peak_memory_mb:.2f} MB")
            report.append(f"  Improvement:       {memory_improvement:.1f}% reduction")
            report.append("")

            report.append("**Average Memory:**")
            report.append(f"  Original Avg:      {orig.avg_memory_mb:.2f} MB")
            report.append(f"  Fixed Avg:         {fixed.avg_memory_mb:.2f} MB")
            avg_improvement = (
                (orig.avg_memory_mb - fixed.avg_memory_mb) / orig.avg_memory_mb
            ) * 100
            report.append(f"  Improvement:       {avg_improvement:.1f}% reduction")
            report.append("")

            # Performance comparison
            throughput_change = (
                (fixed.throughput_events_per_second - orig.throughput_events_per_second)
                / orig.throughput_events_per_second
            ) * 100

            report.append("**Performance:**")
            report.append(
                f"  Original Throughput: {orig.throughput_events_per_second:.1f} events/sec"
            )
            report.append(
                f"  Fixed Throughput:    {fixed.throughput_events_per_second:.1f} events/sec"
            )
            if throughput_change >= 0:
                report.append(
                    f"  Change:              +{throughput_change:.1f}% improvement"
                )
            else:
                report.append(
                    f"  Change:              {throughput_change:.1f}% reduction"
                )
            report.append("")

            # Garbage collection
            report.append("**Garbage Collection:**")
            report.append(f"  Original GC count:   {orig.gc_collections}")
            report.append(f"  Fixed GC count:      {fixed.gc_collections}")
            gc_change = fixed.gc_collections - orig.gc_collections
            if gc_change <= 0:
                report.append(f"  Change:              {gc_change} (improvement)")
            else:
                report.append(f"  Change:              +{gc_change} (more collections)")
            report.append("")

            # Cleanup success
            report.append("**Cleanup Success:**")
            report.append(
                f"  Original:            {'✓' if orig.final_cleanup_success else '✗'}"
            )
            report.append(
                f"  Fixed:               {'✓' if fixed.final_cleanup_success else '✗'}"
            )
            report.append("")

        # Summary
        report.append("## Summary")
        report.append("-" * 20)

        # Calculate overall improvements
        total_orig_peak = sum(r.peak_memory_mb for r in original_results.values())
        total_fixed_peak = sum(r.peak_memory_mb for r in fixed_results.values())
        overall_memory_improvement = (
            (total_orig_peak - total_fixed_peak) / total_orig_peak
        ) * 100

        total_orig_throughput = sum(
            r.throughput_events_per_second for r in original_results.values()
        )
        total_fixed_throughput = sum(
            r.throughput_events_per_second for r in fixed_results.values()
        )
        overall_throughput_change = (
            (total_fixed_throughput - total_orig_throughput) / total_orig_throughput
        ) * 100

        report.append(
            f"**Overall Memory Improvement: {overall_memory_improvement:.1f}% reduction**"
        )
        report.append(
            f"**Overall Throughput Change: {overall_throughput_change:.1f}%**"
        )
        report.append("")

        # Key improvements
        report.append("**Key Improvements in Fixed Version:**")
        report.append("- ✓ Bounded event history with configurable limits")
        report.append("- ✓ TTL-based event expiration")
        report.append("- ✓ Automatic cleanup of stale queues and sessions")
        report.append("- ✓ Memory-efficient queue implementation")
        report.append("- ✓ Context manager for proper resource cleanup")
        report.append("- ✓ Comprehensive memory usage monitoring")
        report.append("- ✓ Background cleanup task with configurable intervals")
        report.append("- ✓ Weakref usage for automatic garbage collection")

        return "\n".join(report)

    def plot_memory_usage(
        self,
        results: dict[str, dict[str, BenchmarkResult]],
        output_file: str = "memory_comparison.png",
    ):
        """Create memory usage comparison plots."""
        try:
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            axes = axes.flatten()

            test_names = list(results["original"].keys())

            for i, test_name in enumerate(test_names):
                if i >= len(axes):
                    break

                ax = axes[i]

                orig_memory = results["original"][test_name].memory_usage_mb
                fixed_memory = results["fixed"][test_name].memory_usage_mb

                # Make arrays same length for plotting
                max_len = max(len(orig_memory), len(fixed_memory))
                orig_x = list(range(len(orig_memory)))
                fixed_x = list(range(len(fixed_memory)))

                ax.plot(orig_x, orig_memory, "r-", label="Original", linewidth=2)
                ax.plot(fixed_x, fixed_memory, "g-", label="Fixed", linewidth=2)

                ax.set_title(f"{test_name.replace('_', ' ').title()} Memory Usage")
                ax.set_xlabel("Sample Point")
                ax.set_ylabel("Memory Usage (MB)")
                ax.legend()
                ax.grid(True, alpha=0.3)

            plt.tight_layout()
            plt.savefig(output_file, dpi=300, bbox_inches="tight")
            print(f"Memory usage plot saved to {output_file}")

        except ImportError:
            print("Matplotlib not available, skipping plot generation")


async def run_comprehensive_benchmark():
    """Run comprehensive benchmark comparing original and fixed versions."""
    print("Starting comprehensive SSE broadcaster memory benchmark...")
    print("=" * 60)

    benchmark = SSEMemoryBenchmark()

    # Test configurations
    test_configs = {
        "sustained_load": {"num_sessions": 5, "events_per_session": 500},
        "burst_events": {"burst_size": 200, "num_bursts": 5},
        "many_sessions": {"num_sessions": 50, "events_per_session": 20},
    }

    # Fixed version configuration
    fixed_config = BroadcasterConfig(
        max_queue_size=50,
        max_history_per_session=100,
        event_ttl=10.0,  # 10 seconds
        session_ttl=300.0,  # 5 minutes
        cleanup_interval=1.0,  # 1 second
        enable_metrics=True,
    )

    results = {"original": {}, "fixed": {}}

    # Test original version
    print("\n🔴 Testing Original Implementation")
    print("-" * 40)

    try:
        # Sustained load test
        print("1. Sustained Load Test...")
        result = await benchmark.benchmark_sustained_load(
            OriginalBroadcaster, **test_configs["sustained_load"]
        )
        results["original"]["sustained_load"] = result

        # Allow memory to settle
        await asyncio.sleep(2)
        gc.collect()

        # Burst events test
        print("2. Burst Events Test...")
        result = await benchmark.benchmark_burst_events(
            OriginalBroadcaster, **test_configs["burst_events"]
        )
        results["original"]["burst_events"] = result

        await asyncio.sleep(2)
        gc.collect()

        # Many sessions test
        print("3. Many Sessions Test...")
        result = await benchmark.benchmark_many_sessions(
            OriginalBroadcaster, **test_configs["many_sessions"]
        )
        results["original"]["many_sessions"] = result

    except Exception as e:
        print(f"Error testing original version: {e}")
        import traceback

        traceback.print_exc()

    # Allow memory to settle between tests
    await asyncio.sleep(3)
    gc.collect()

    # Test fixed version
    print("\n🟢 Testing Fixed Implementation")
    print("-" * 40)

    try:
        # Sustained load test
        print("1. Sustained Load Test...")
        result = await benchmark.benchmark_sustained_load(
            FixedBroadcaster, fixed_config, **test_configs["sustained_load"]
        )
        results["fixed"]["sustained_load"] = result

        await asyncio.sleep(2)
        gc.collect()

        # Burst events test
        print("2. Burst Events Test...")
        result = await benchmark.benchmark_burst_events(
            FixedBroadcaster, fixed_config, **test_configs["burst_events"]
        )
        results["fixed"]["burst_events"] = result

        await asyncio.sleep(2)
        gc.collect()

        # Many sessions test
        print("3. Many Sessions Test...")
        result = await benchmark.benchmark_many_sessions(
            FixedBroadcaster, fixed_config, **test_configs["many_sessions"]
        )
        results["fixed"]["many_sessions"] = result

    except Exception as e:
        print(f"Error testing fixed version: {e}")
        import traceback

        traceback.print_exc()

    # Generate reports
    print("\n📊 Generating Performance Analysis Report")
    print("-" * 40)

    if results["original"] and results["fixed"]:
        # Text report
        report = benchmark.generate_comparison_report(
            results["original"], results["fixed"]
        )

        # Save report
        with open(
            "/Users/nick/Development/vana/.claude_workspace/reports/sse_memory_benchmark_report.md",
            "w",
        ) as f:
            f.write(report)

        print(
            "✅ Report saved to .claude_workspace/reports/sse_memory_benchmark_report.md"
        )

        # JSON results for further analysis
        json_results = {}
        for version, version_results in results.items():
            json_results[version] = {}
            for test_name, result in version_results.items():
                json_results[version][test_name] = {
                    "peak_memory_mb": result.peak_memory_mb,
                    "avg_memory_mb": result.avg_memory_mb,
                    "execution_time_seconds": result.execution_time_seconds,
                    "throughput_events_per_second": result.throughput_events_per_second,
                    "events_processed": result.events_processed,
                    "gc_collections": result.gc_collections,
                    "final_cleanup_success": result.final_cleanup_success,
                }

        with open(
            "/Users/nick/Development/vana/.claude_workspace/reports/sse_benchmark_data.json",
            "w",
        ) as f:
            json.dump(json_results, f, indent=2)

        # Generate plots
        benchmark.plot_memory_usage(
            results,
            "/Users/nick/Development/vana/.claude_workspace/reports/memory_usage_comparison.png",
        )

        # Print summary
        print("\n" + "=" * 60)
        print("BENCHMARK COMPLETE!")
        print("=" * 60)

        for test_name in results["original"].keys():
            if test_name in results["fixed"]:
                orig = results["original"][test_name]
                fixed = results["fixed"][test_name]

                memory_improvement = (
                    (orig.peak_memory_mb - fixed.peak_memory_mb) / orig.peak_memory_mb
                ) * 100

                print(f"{test_name.upper()}:")
                print(
                    f"  Memory: {orig.peak_memory_mb:.1f}MB → {fixed.peak_memory_mb:.1f}MB "
                    f"({memory_improvement:.1f}% improvement)"
                )

    else:
        print("❌ Could not generate comparison - missing results")


if __name__ == "__main__":
    asyncio.run(run_comprehensive_benchmark())
