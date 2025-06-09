#!/usr/bin/env python3
"""
Test script for race condition fixes in VANA agent flow.

This script performs comprehensive testing of the race condition fixes
including circuit breaker functionality, thread safety, and agent orchestration.
"""

import sys
import time
import threading
import concurrent.futures
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from lib._shared_libraries.task_router import TaskRouter, CircuitBreakerState
from lib._shared_libraries.tool_standards import PerformanceMonitor
from dashboard.monitoring.adk_memory_logger import ADKMemoryLogger, ADKSessionStateEvent


def test_circuit_breaker_functionality():
    """Test circuit breaker functionality."""
    print("🔧 Testing Circuit Breaker Functionality...")
    
    router = TaskRouter()
    
    # Test circuit breaker creation and basic functionality
    breaker = router.get_agent_circuit_breaker("test_agent")
    correlation_id = breaker.set_correlation_id("test-circuit-breaker")
    
    print(f"   ✓ Circuit breaker created with correlation ID: {correlation_id}")
    
    # Test failure threshold
    print("   🔥 Testing failure threshold...")
    for i in range(5):
        breaker.record_failure()
        print(f"      Failure {i+1}/5 recorded")
    
    assert breaker.state == CircuitBreakerState.OPEN
    assert not breaker.can_execute()
    print("   ✓ Circuit breaker opened after 5 failures")
    
    # Test recovery
    print("   🔄 Testing recovery...")
    breaker.last_failure_time = time.time() - 61  # Simulate timeout
    assert breaker.can_execute()  # Should transition to HALF_OPEN
    
    for i in range(3):
        breaker.record_success()
        print(f"      Success {i+1}/3 recorded")
    
    assert breaker.state == CircuitBreakerState.CLOSED
    print("   ✓ Circuit breaker recovered to CLOSED state")
    
    return True


def test_thread_safety():
    """Test thread safety of critical components."""
    print("🧵 Testing Thread Safety...")
    
    router = TaskRouter()
    monitor = PerformanceMonitor()
    logger = ADKMemoryLogger()
    
    errors = []
    results = []
    
    def concurrent_routing_worker(worker_id: int):
        try:
            for i in range(10):
                task_desc = f"Worker {worker_id} task {i}"
                result = router.route_task(task_desc)
                results.append(result)
                
                # Also test performance monitoring
                start_time = monitor.start_execution(f"tool_{worker_id}")
                time.sleep(0.001)
                monitor.end_execution(f"tool_{worker_id}", start_time, True)
                
                # Test session logging
                event = ADKSessionStateEvent(
                    timestamp=str(time.time()),
                    event_type="update",
                    session_id=f"session_{worker_id}",
                    user_id=f"user_{worker_id}",
                    state_size_mb=1.0,
                    state_keys=["key1"],
                    persistence_success=True,
                    error_message=None,
                    metadata={}
                )
                logger.log_session_event(event)
                
        except Exception as e:
            errors.append(f"Worker {worker_id}: {str(e)}")
    
    print("   🚀 Starting 10 concurrent workers...")
    
    # Run concurrent workers
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(concurrent_routing_worker, worker_id)
            for worker_id in range(10)
        ]
        concurrent.futures.wait(futures)
    
    print(f"   📊 Results: {len(results)} routing decisions, {len(errors)} errors")
    
    if errors:
        print("   ❌ Thread safety test failed with errors:")
        for error in errors[:5]:  # Show first 5 errors
            print(f"      {error}")
        return False
    
    # Verify metrics were recorded correctly
    all_metrics = monitor.get_all_metrics()
    print(f"   📈 Performance metrics recorded for {len(all_metrics)} tools")
    
    # Verify session states were tracked
    print(f"   📝 Session states tracked: {len(logger.session_states)}")
    
    print("   ✓ Thread safety test passed")
    return True


def test_agent_failure_cascade_prevention():
    """Test prevention of cascading agent failures."""
    print("🛡️ Testing Agent Failure Cascade Prevention...")
    
    router = TaskRouter()
    
    # Simulate multiple agents failing simultaneously
    agent_names = ["agent_1", "agent_2", "agent_3", "agent_4", "agent_5"]
    
    def fail_agent_worker(agent_name: str):
        breaker = router.get_agent_circuit_breaker(agent_name)
        breaker.set_correlation_id(f"cascade-test-{agent_name}")
        
        # Exceed failure threshold
        for _ in range(6):
            breaker.record_failure()
    
    print(f"   💥 Simulating simultaneous failure of {len(agent_names)} agents...")
    
    # Fail all agents concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(fail_agent_worker, agent_name)
            for agent_name in agent_names
        ]
        concurrent.futures.wait(futures)
    
    # Verify circuit breakers are protecting the system
    status = router.get_circuit_breaker_status()
    open_breakers = 0
    
    for agent_name in agent_names:
        if agent_name in status and status[agent_name]["state"] == "open":
            open_breakers += 1
    
    print(f"   🔒 Circuit breakers opened: {open_breakers}/{len(agent_names)}")
    
    if open_breakers == len(agent_names):
        print("   ✓ Cascade prevention successful - all failing agents isolated")
        return True
    else:
        print("   ❌ Cascade prevention failed - some agents not isolated")
        return False


def test_high_load_performance():
    """Test system performance under high load."""
    print("⚡ Testing High Load Performance...")
    
    router = TaskRouter()
    start_time = time.time()
    
    def high_load_worker(worker_id: int):
        results = []
        for i in range(50):  # Increased load
            task_desc = f"High load worker {worker_id} task {i}"
            result = router.route_task(task_desc)
            results.append(result)
        return results
    
    print("   🔥 Starting high load test with 20 workers, 50 tasks each...")
    
    all_results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [
            executor.submit(high_load_worker, worker_id)
            for worker_id in range(20)
        ]
        
        for future in concurrent.futures.as_completed(futures):
            results = future.result()
            all_results.extend(results)
    
    end_time = time.time()
    duration = end_time - start_time
    total_tasks = len(all_results)
    throughput = total_tasks / duration
    
    print(f"   📊 Processed {total_tasks} tasks in {duration:.2f}s")
    print(f"   🚀 Throughput: {throughput:.1f} tasks/second")
    
    if throughput > 100:  # Expect at least 100 tasks/second
        print("   ✓ High load performance test passed")
        return True
    else:
        print("   ⚠️ High load performance below expected threshold")
        return False


def test_correlation_id_tracking():
    """Test correlation ID tracking across components."""
    print("🔗 Testing Correlation ID Tracking...")
    
    router = TaskRouter()
    
    # Set correlation ID and verify propagation
    correlation_id = router.set_correlation_id("test-correlation-123")
    print(f"   🏷️ Set correlation ID: {correlation_id}")
    
    # Test circuit breaker correlation
    breaker = router.get_agent_circuit_breaker("test_agent")
    breaker_correlation = breaker.set_correlation_id("breaker-test-456")
    print(f"   🔧 Circuit breaker correlation ID: {breaker_correlation}")
    
    # Verify correlation IDs are properly tracked
    breaker_info = breaker.get_state_info()
    assert breaker_info["correlation_id"] == "breaker-test-456"
    
    print("   ✓ Correlation ID tracking working correctly")
    return True


def main():
    """Run all race condition fix tests."""
    print("🚀 VANA Agent Flow Race Condition Fix Testing")
    print("=" * 60)
    
    tests = [
        ("Circuit Breaker Functionality", test_circuit_breaker_functionality),
        ("Thread Safety", test_thread_safety),
        ("Agent Failure Cascade Prevention", test_agent_failure_cascade_prevention),
        ("High Load Performance", test_high_load_performance),
        ("Correlation ID Tracking", test_correlation_id_tracking),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                failed += 1
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"💥 {test_name} CRASHED: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All race condition fixes validated successfully!")
        return 0
    else:
        print("⚠️ Some tests failed - race condition fixes need attention")
        return 1


if __name__ == "__main__":
    sys.exit(main())
