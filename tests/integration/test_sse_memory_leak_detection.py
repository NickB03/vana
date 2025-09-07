"""Advanced Memory Leak Detection for SSE Broadcaster.

This module provides sophisticated memory leak detection and prevention
testing for the SSE broadcaster system, using advanced memory profiling
techniques and leak detection algorithms.
"""

import asyncio
import gc
import os
import sys
import time
import tracemalloc
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set

import pytest

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

from app.utils.sse_broadcaster import (
    BroadcasterConfig,
    EnhancedSSEBroadcaster,
    MemoryOptimizedQueue,
)


@dataclass
class MemorySnapshot:
    """Snapshot of memory usage at a point in time."""
    
    timestamp: float
    process_memory_mb: float
    rss_memory_mb: float
    vms_memory_mb: float
    objects_count: int
    gc_stats: Dict[str, int]
    tracemalloc_stats: Optional[Dict[str, Any]] = None
    broadcaster_stats: Optional[Dict[str, Any]] = None


@dataclass
class MemoryLeakReport:
    """Report on potential memory leaks."""
    
    test_name: str
    duration_seconds: float
    initial_snapshot: MemorySnapshot
    final_snapshot: MemorySnapshot
    memory_growth_mb: float
    memory_growth_percent: float
    leak_detected: bool
    leak_confidence: float  # 0.0 to 1.0
    recommendations: List[str]
    detailed_analysis: Dict[str, Any]


class AdvancedMemoryProfiler:
    """Advanced memory profiler for leak detection."""
    
    def __init__(self):
        self.snapshots: List[MemorySnapshot] = []
        self.process = psutil.Process() if HAS_PSUTIL else None
        self.tracemalloc_enabled = False
        
    def start_tracing(self):
        """Start memory tracing."""
        if not self.tracemalloc_enabled:
            tracemalloc.start(25)  # Keep 25 frames
            self.tracemalloc_enabled = True
    
    def stop_tracing(self):
        """Stop memory tracing."""
        if self.tracemalloc_enabled:
            tracemalloc.stop()
            self.tracemalloc_enabled = False
    
    def take_snapshot(self, broadcaster: Optional[EnhancedSSEBroadcaster] = None) -> MemorySnapshot:
        """Take a comprehensive memory snapshot."""
        # Force garbage collection
        gc.collect()
        
        # Get process memory info
        process_memory_mb = 0.0
        rss_memory_mb = 0.0
        vms_memory_mb = 0.0
        
        if self.process:
            memory_info = self.process.memory_info()
            process_memory_mb = memory_info.rss / (1024 * 1024)
            rss_memory_mb = memory_info.rss / (1024 * 1024)
            vms_memory_mb = memory_info.vms / (1024 * 1024)
        
        # Get object count
        objects_count = len(gc.get_objects())
        
        # Get GC stats
        gc_stats = {
            f"generation_{i}": len(gc.get_objects(i)) 
            for i in range(len(gc.get_stats()))
        }
        gc_stats.update({
            "collected": gc.collect(),
            "threshold": gc.get_threshold(),
        })
        
        # Get tracemalloc stats
        tracemalloc_stats = None
        if self.tracemalloc_enabled:
            snapshot = tracemalloc.take_snapshot()
            top_stats = snapshot.statistics('lineno')
            
            tracemalloc_stats = {
                "total_size_mb": sum(stat.size for stat in top_stats) / (1024 * 1024),
                "top_allocations": [
                    {
                        "filename": stat.traceback.format()[-1] if stat.traceback else "unknown",
                        "size_mb": stat.size / (1024 * 1024),
                        "count": stat.count,
                    }
                    for stat in top_stats[:10]
                ]
            }
        
        # Get broadcaster stats
        broadcaster_stats = None
        if broadcaster:
            broadcaster_stats = broadcaster.get_stats()
        
        snapshot = MemorySnapshot(
            timestamp=time.time(),
            process_memory_mb=process_memory_mb,
            rss_memory_mb=rss_memory_mb,
            vms_memory_mb=vms_memory_mb,
            objects_count=objects_count,
            gc_stats=gc_stats,
            tracemalloc_stats=tracemalloc_stats,
            broadcaster_stats=broadcaster_stats,
        )
        
        self.snapshots.append(snapshot)
        return snapshot
    
    def analyze_leak(
        self, 
        test_name: str,
        initial_snapshot: MemorySnapshot,
        final_snapshot: MemorySnapshot,
        threshold_mb: float = 10.0,
        growth_threshold_percent: float = 20.0
    ) -> MemoryLeakReport:
        """Analyze snapshots for potential memory leaks."""
        
        # Calculate memory growth
        memory_growth_mb = final_snapshot.process_memory_mb - initial_snapshot.process_memory_mb
        memory_growth_percent = (
            (memory_growth_mb / initial_snapshot.process_memory_mb) * 100
            if initial_snapshot.process_memory_mb > 0 
            else 0
        )
        
        # Determine if leak is detected
        leak_detected = (
            memory_growth_mb > threshold_mb or 
            memory_growth_percent > growth_threshold_percent
        )
        
        # Calculate confidence based on multiple factors
        confidence_factors = []
        
        # Factor 1: Absolute memory growth
        if memory_growth_mb > threshold_mb:
            confidence_factors.append(min(memory_growth_mb / threshold_mb, 2.0) * 0.4)
        
        # Factor 2: Percentage growth
        if memory_growth_percent > growth_threshold_percent:
            confidence_factors.append(min(memory_growth_percent / growth_threshold_percent, 2.0) * 0.3)
        
        # Factor 3: Object count growth
        object_growth = final_snapshot.objects_count - initial_snapshot.objects_count
        if object_growth > 1000:  # Significant object growth
            confidence_factors.append(min(object_growth / 10000, 1.0) * 0.3)
        
        leak_confidence = min(sum(confidence_factors), 1.0)
        
        # Generate recommendations
        recommendations = []
        if leak_detected:
            recommendations.append("Memory leak detected - investigate object retention")
            
            if memory_growth_mb > 50:
                recommendations.append("Large memory growth detected - check for unbounded collections")
            
            if object_growth > 5000:
                recommendations.append("Significant object growth - check for circular references")
        
        # Detailed analysis
        detailed_analysis = {
            "memory_growth_mb": memory_growth_mb,
            "memory_growth_percent": memory_growth_percent,
            "object_count_growth": object_growth,
            "duration_seconds": final_snapshot.timestamp - initial_snapshot.timestamp,
        }
        
        if initial_snapshot.broadcaster_stats and final_snapshot.broadcaster_stats:
            initial_stats = initial_snapshot.broadcaster_stats
            final_stats = final_snapshot.broadcaster_stats
            
            detailed_analysis.update({
                "sessions_growth": final_stats["totalSessions"] - initial_stats["totalSessions"],
                "subscribers_growth": final_stats["totalSubscribers"] - initial_stats["totalSubscribers"],
                "events_growth": final_stats["totalEvents"] - initial_stats["totalEvents"],
            })
        
        return MemoryLeakReport(
            test_name=test_name,
            duration_seconds=detailed_analysis["duration_seconds"],
            initial_snapshot=initial_snapshot,
            final_snapshot=final_snapshot,
            memory_growth_mb=memory_growth_mb,
            memory_growth_percent=memory_growth_percent,
            leak_detected=leak_detected,
            leak_confidence=leak_confidence,
            recommendations=recommendations,
            detailed_analysis=detailed_analysis,
        )


class TestSSEMemoryLeakDetection:
    """Advanced memory leak detection test suite."""
    
    @pytest.fixture
    def profiler(self):
        """Create memory profiler."""
        profiler = AdvancedMemoryProfiler()
        profiler.start_tracing()
        yield profiler
        profiler.stop_tracing()
    
    @pytest.fixture
    async def broadcaster(self):
        """Create broadcaster for testing."""
        config = BroadcasterConfig(
            max_queue_size=1000,
            max_history_per_session=500,
            event_ttl=60.0,
            session_ttl=300.0,
            cleanup_interval=5.0,
            enable_metrics=True,
        )
        broadcaster = EnhancedSSEBroadcaster(config)
        yield broadcaster
        await broadcaster.shutdown()
    
    @pytest.mark.asyncio
    async def test_subscriber_lifecycle_leak_detection(self, broadcaster, profiler):
        """Test for memory leaks in subscriber lifecycle."""
        initial_snapshot = profiler.take_snapshot(broadcaster)
        
        # Simulate many subscriber lifecycles
        for cycle in range(50):
            session_id = f"leak_test_session_{cycle}"
            
            # Add multiple subscribers
            subscribers = []
            for i in range(10):
                queue = await broadcaster.add_subscriber(f"{session_id}_{i}")
                subscribers.append((f"{session_id}_{i}", queue))
            
            # Broadcast some events
            for i in range(20):
                event_data = {
                    "type": "leak_test_event",
                    "data": {"cycle": cycle, "event": i, "payload": "x" * 100},
                }
                for session_id_i, _ in subscribers:
                    await broadcaster.broadcast_event(session_id_i, event_data)
            
            # Remove all subscribers
            for session_id_i, queue in subscribers:
                await broadcaster.remove_subscriber(session_id_i, queue)
            
            # Clear sessions
            for session_id_i, _ in subscribers:
                await broadcaster.clear_session(session_id_i)
            
            # Force cleanup
            if cycle % 10 == 0:
                await broadcaster._perform_cleanup()
                gc.collect()
        
        # Final cleanup and snapshot
        await broadcaster._perform_cleanup()
        final_snapshot = profiler.take_snapshot(broadcaster)
        
        # Analyze for leaks
        report = profiler.analyze_leak(
            "subscriber_lifecycle_test",
            initial_snapshot,
            final_snapshot,
            threshold_mb=20.0,
            growth_threshold_percent=25.0
        )
        
        # Print report
        print(f"\n=== Memory Leak Analysis: {report.test_name} ===")
        print(f"Duration: {report.duration_seconds:.1f}s")
        print(f"Memory growth: {report.memory_growth_mb:.2f}MB ({report.memory_growth_percent:.1f}%)")
        print(f"Leak detected: {report.leak_detected} (confidence: {report.leak_confidence:.2f})")
        print(f"Object growth: {report.detailed_analysis.get('object_count_growth', 0)}")
        
        if report.recommendations:
            print("Recommendations:")
            for rec in report.recommendations:
                print(f"  - {rec}")
        
        # Assert no significant leak
        assert not report.leak_detected or report.leak_confidence < 0.7, \
            f"Memory leak detected with confidence {report.leak_confidence:.2f}"
    
    @pytest.mark.asyncio
    async def test_high_volume_event_leak_detection(self, broadcaster, profiler):
        """Test for memory leaks with high-volume event processing."""
        session_id = "high_volume_test_session"
        initial_snapshot = profiler.take_snapshot(broadcaster)
        
        # Add a few long-running subscribers
        subscribers = []
        for i in range(5):
            queue = await broadcaster.add_subscriber(f"{session_id}_{i}")
            subscribers.append((f"{session_id}_{i}", queue))
        
        # Broadcast many events
        for batch in range(100):
            for event_in_batch in range(50):
                event_data = {
                    "type": "high_volume_event",
                    "data": {
                        "batch": batch,
                        "event": event_in_batch,
                        "timestamp": time.time(),
                        "payload": "x" * 200,  # Add some bulk
                    },
                }
                
                # Broadcast to random subscriber
                session_id_target = f"{session_id}_{batch % len(subscribers)}"
                await broadcaster.broadcast_event(session_id_target, event_data)
            
            # Consume some events to prevent queue overflow
            if batch % 10 == 0:
                for session_id_i, queue in subscribers:
                    try:
                        for _ in range(10):
                            await asyncio.wait_for(queue.get(timeout=0.1), timeout=0.2)
                    except asyncio.TimeoutError:
                        pass
                
                # Periodic cleanup
                await broadcaster._perform_cleanup()
        
        # Consume remaining events
        for session_id_i, queue in subscribers:
            try:
                while True:
                    await asyncio.wait_for(queue.get(timeout=0.5), timeout=1.0)
            except asyncio.TimeoutError:
                break
        
        # Cleanup
        for session_id_i, queue in subscribers:
            await broadcaster.remove_subscriber(session_id_i, queue)
        
        final_snapshot = profiler.take_snapshot(broadcaster)
        
        # Analyze
        report = profiler.analyze_leak(
            "high_volume_event_test",
            initial_snapshot,
            final_snapshot,
            threshold_mb=30.0,
            growth_threshold_percent=30.0
        )
        
        # Print report
        print(f"\n=== Memory Leak Analysis: {report.test_name} ===")
        print(f"Duration: {report.duration_seconds:.1f}s")
        print(f"Memory growth: {report.memory_growth_mb:.2f}MB ({report.memory_growth_percent:.1f}%)")
        print(f"Leak detected: {report.leak_detected} (confidence: {report.leak_confidence:.2f})")
        print(f"Events processed: ~5000")
        
        # Assert no significant leak
        assert not report.leak_detected or report.leak_confidence < 0.8, \
            f"Memory leak detected with confidence {report.leak_confidence:.2f}"
    
    @pytest.mark.asyncio
    async def test_queue_overflow_leak_detection(self, broadcaster, profiler):
        """Test for memory leaks during queue overflow conditions."""
        session_id = "overflow_leak_test_session"
        initial_snapshot = profiler.take_snapshot(broadcaster)
        
        # Create subscribers with small queues
        config = BroadcasterConfig(max_queue_size=10)
        overflow_broadcaster = EnhancedSSEBroadcaster(config)
        
        try:
            # Add subscribers but don't consume events (cause overflow)
            subscribers = []
            for i in range(20):
                queue = await overflow_broadcaster.add_subscriber(f"{session_id}_{i}")
                subscribers.append((f"{session_id}_{i}", queue))
            
            # Flood with events to cause overflow
            for i in range(1000):
                event_data = {
                    "type": "overflow_event",
                    "data": {"sequence": i, "payload": "x" * 100},
                }
                
                # Broadcast to all sessions
                for session_id_i, _ in subscribers:
                    await overflow_broadcaster.broadcast_event(session_id_i, event_data)
                
                # Periodic cleanup
                if i % 100 == 0:
                    await overflow_broadcaster._perform_cleanup()
            
            # Final cleanup
            await overflow_broadcaster._perform_cleanup()
            
        finally:
            await overflow_broadcaster.shutdown()
        
        final_snapshot = profiler.take_snapshot(broadcaster)
        
        # Analyze
        report = profiler.analyze_leak(
            "queue_overflow_test",
            initial_snapshot,
            final_snapshot,
            threshold_mb=15.0,
            growth_threshold_percent=20.0
        )
        
        # Print report
        print(f"\n=== Memory Leak Analysis: {report.test_name} ===")
        print(f"Duration: {report.duration_seconds:.1f}s")
        print(f"Memory growth: {report.memory_growth_mb:.2f}MB ({report.memory_growth_percent:.1f}%)")
        print(f"Leak detected: {report.leak_detected} (confidence: {report.leak_confidence:.2f})")
        
        # For overflow conditions, we allow some memory growth
        assert not report.leak_detected or report.leak_confidence < 0.9, \
            f"Significant memory leak detected with confidence {report.leak_confidence:.2f}"
    
    @pytest.mark.asyncio
    async def test_long_running_session_leak_detection(self, broadcaster, profiler):
        """Test for memory leaks in long-running sessions."""
        session_id = "long_running_test_session"
        initial_snapshot = profiler.take_snapshot(broadcaster)
        
        # Create long-running subscribers
        subscribers = []
        for i in range(10):
            queue = await broadcaster.add_subscriber(f"{session_id}_{i}")
            subscribers.append((f"{session_id}_{i}", queue))
        
        # Simulate long-running activity with periodic cleanup
        start_time = time.time()
        event_count = 0
        
        while time.time() - start_time < 30.0:  # Run for 30 seconds
            # Broadcast events
            for i in range(10):
                event_data = {
                    "type": "long_running_event",
                    "data": {
                        "timestamp": time.time(),
                        "count": event_count,
                        "uptime": time.time() - start_time,
                    },
                }
                
                # Broadcast to random session
                session_id_target = f"{session_id}_{event_count % len(subscribers)}"
                await broadcaster.broadcast_event(session_id_target, event_data)
                event_count += 1
            
            # Consume some events
            for session_id_i, queue in subscribers:
                try:
                    for _ in range(5):
                        await asyncio.wait_for(queue.get(timeout=0.01), timeout=0.02)
                except asyncio.TimeoutError:
                    pass
            
            await asyncio.sleep(0.1)
        
        # Cleanup
        for session_id_i, queue in subscribers:
            await broadcaster.remove_subscriber(session_id_i, queue)
        
        final_snapshot = profiler.take_snapshot(broadcaster)
        
        # Analyze
        report = profiler.analyze_leak(
            "long_running_session_test",
            initial_snapshot,
            final_snapshot,
            threshold_mb=25.0,
            growth_threshold_percent=25.0
        )
        
        # Print report
        print(f"\n=== Memory Leak Analysis: {report.test_name} ===")
        print(f"Duration: {report.duration_seconds:.1f}s")
        print(f"Memory growth: {report.memory_growth_mb:.2f}MB ({report.memory_growth_percent:.1f}%)")
        print(f"Leak detected: {report.leak_detected} (confidence: {report.leak_confidence:.2f})")
        print(f"Events processed: {event_count}")
        
        assert not report.leak_detected or report.leak_confidence < 0.7, \
            f"Memory leak detected with confidence {report.leak_confidence:.2f}"
    
    @pytest.mark.asyncio
    async def test_cleanup_effectiveness(self, broadcaster, profiler):
        """Test effectiveness of cleanup mechanisms."""
        initial_snapshot = profiler.take_snapshot(broadcaster)
        
        # Create temporary sessions and data
        temp_sessions = []
        for i in range(100):
            session_id = f"temp_session_{i}"
            temp_sessions.append(session_id)
            
            # Add subscribers
            queue = await broadcaster.add_subscriber(session_id)
            
            # Add events
            for j in range(10):
                event_data = {
                    "type": "temp_event",
                    "data": {"session": i, "event": j},
                }
                await broadcaster.broadcast_event(session_id, event_data)
            
            # Remove subscriber but leave session data
            await broadcaster.remove_subscriber(session_id, queue)
        
        # Snapshot after creating temporary data
        after_creation_snapshot = profiler.take_snapshot(broadcaster)
        
        # Trigger comprehensive cleanup
        await broadcaster._perform_cleanup()
        
        # Clear all temp sessions explicitly
        for session_id in temp_sessions:
            await broadcaster.clear_session(session_id)
        
        # Force garbage collection
        gc.collect()
        
        # Final snapshot
        after_cleanup_snapshot = profiler.take_snapshot(broadcaster)
        
        # Analyze cleanup effectiveness
        creation_growth = after_creation_snapshot.process_memory_mb - initial_snapshot.process_memory_mb
        cleanup_reduction = after_creation_snapshot.process_memory_mb - after_cleanup_snapshot.process_memory_mb
        
        cleanup_effectiveness = (cleanup_reduction / creation_growth) * 100 if creation_growth > 0 else 0
        
        print(f"\n=== Cleanup Effectiveness Analysis ===")
        print(f"Memory growth during creation: {creation_growth:.2f}MB")
        print(f"Memory reduction after cleanup: {cleanup_reduction:.2f}MB")
        print(f"Cleanup effectiveness: {cleanup_effectiveness:.1f}%")
        
        # Cleanup should be at least 70% effective
        assert cleanup_effectiveness >= 70.0, \
            f"Cleanup effectiveness too low: {cleanup_effectiveness:.1f}%"
    
    def test_queue_memory_optimization(self):
        """Test memory optimization of individual queues."""
        initial_objects = len(gc.get_objects())
        
        # Create many queues
        queues = []
        for i in range(1000):
            queue = MemoryOptimizedQueue(maxsize=100)
            queues.append(queue)
        
        after_creation_objects = len(gc.get_objects())
        
        # Close all queues
        for queue in queues:
            queue.close()
        
        # Clear references
        queues.clear()
        gc.collect()
        
        after_cleanup_objects = len(gc.get_objects())
        
        # Calculate object growth
        creation_growth = after_creation_objects - initial_objects
        final_growth = after_cleanup_objects - initial_objects
        
        print(f"\n=== Queue Memory Optimization ===")
        print(f"Objects after queue creation: +{creation_growth}")
        print(f"Objects after cleanup: +{final_growth}")
        print(f"Cleanup ratio: {((creation_growth - final_growth) / creation_growth * 100):.1f}%")
        
        # Should clean up most objects
        assert final_growth < creation_growth * 0.3, \
            "Queue cleanup not effective enough"


if __name__ == "__main__":
    # Run memory leak detection tests
    async def run_memory_tests():
        profiler = AdvancedMemoryProfiler()
        profiler.start_tracing()
        
        try:
            config = BroadcasterConfig(
                max_queue_size=1000,
                max_history_per_session=500,
                cleanup_interval=5.0,
                enable_metrics=True,
            )
            broadcaster = EnhancedSSEBroadcaster(config)
            
            test_suite = TestSSEMemoryLeakDetection()
            
            print("Running advanced memory leak detection tests...")
            
            # Run subscriber lifecycle test
            await test_suite.test_subscriber_lifecycle_leak_detection(broadcaster, profiler)
            
            # Run high volume test
            await test_suite.test_high_volume_event_leak_detection(broadcaster, profiler)
            
            # Run cleanup effectiveness test
            await test_suite.test_cleanup_effectiveness(broadcaster, profiler)
            
            await broadcaster.shutdown()
            
        finally:
            profiler.stop_tracing()
    
    asyncio.run(run_memory_tests())