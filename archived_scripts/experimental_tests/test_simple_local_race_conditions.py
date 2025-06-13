#!/usr/bin/env python3
"""
Simple local test for race condition fixes without external dependencies.
"""

import sys
import os
import time
import threading
import concurrent.futures
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from lib._shared_libraries.task_router import TaskRouter
from lib._shared_libraries.tool_standards import PerformanceMonitor
from dashboard.monitoring.adk_memory_logger import ADKMemoryLogger


def test_basic_imports():
    """Test that all race condition fix modules can be imported."""
    print("📦 Testing Basic Imports...")
    
    try:
        # Test TaskRouter import and basic functionality
        router = TaskRouter()
        correlation_id = router.set_correlation_id("test-import")
        print(f"   ✓ TaskRouter imported, correlation ID: {correlation_id}")
        
        # Test PerformanceMonitor
        monitor = PerformanceMonitor()
        start_time = monitor.start_execution("test_tool")
        monitor.end_execution("test_tool", start_time, True)
        print("   ✓ PerformanceMonitor imported and functional")
        
        # Test ADKMemoryLogger
        logger = ADKMemoryLogger()
        logger.start_operation_trace("test_op", "test_type")
        logger.end_operation_trace("test_op", True)
        print("   ✓ ADKMemoryLogger imported and functional")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Import test failed: {str(e)}")
        return False


def test_circuit_breaker_basic():
    """Test basic circuit breaker functionality."""
    print("🔒 Testing Circuit Breaker Basics...")
    
    try:
        router = TaskRouter()
        breaker = router.get_agent_circuit_breaker("test_agent")
        
        # Test initial state
        if breaker.can_execute():
            print("   ✓ Circuit breaker starts in CLOSED state")
        else:
            print("   ❌ Circuit breaker should start CLOSED")
            return False
        
        # Test failure recording
        for i in range(5):
            breaker.record_failure()
        
        if not breaker.can_execute():
            print("   ✓ Circuit breaker opens after failures")
        else:
            print("   ❌ Circuit breaker should be OPEN")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Circuit breaker test failed: {str(e)}")
        return False


def test_thread_safety_basic():
    """Test basic thread safety."""
    print("🧵 Testing Basic Thread Safety...")
    
    try:
        router = TaskRouter()
        monitor = PerformanceMonitor()
        logger = ADKMemoryLogger()
        
        errors = []
        
        def worker(worker_id: int):
            try:
                # Test router
                result = router.route_task(f"Test task {worker_id}")
                
                # Test monitor
                start_time = monitor.start_execution(f"tool_{worker_id}")
                time.sleep(0.001)
                monitor.end_execution(f"tool_{worker_id}", start_time, True)
                
                # Test logger
                logger.start_operation_trace(f"op_{worker_id}", "test")
                logger.end_operation_trace(f"op_{worker_id}", True)
                
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
        
        # Run 5 concurrent workers
        threads = []
        for i in range(5):
            thread = threading.Thread(target=worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        if errors:
            print(f"   ❌ Thread safety errors: {errors}")
            return False
        
        print("   ✓ Basic thread safety test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ Thread safety test failed: {str(e)}")
        return False


def test_performance_under_load():
    """Test performance under concurrent load."""
    print("⚡ Testing Performance Under Load...")
    
    try:
        router = TaskRouter()
        start_time = time.time()
        
        def load_worker(worker_id: int):
            results = []
            for i in range(20):
                result = router.route_task(f"Load test {worker_id}-{i}")
                results.append(result)
            return results
        
        # Run 10 workers with 20 tasks each
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(load_worker, worker_id)
                for worker_id in range(10)
            ]
            
            all_results = []
            for future in concurrent.futures.as_completed(futures):
                results = future.result()
                all_results.extend(results)
        
        end_time = time.time()
        duration = end_time - start_time
        total_tasks = len(all_results)
        throughput = total_tasks / duration
        
        print(f"   📊 Processed {total_tasks} tasks in {duration:.2f}s")
        print(f"   🚀 Throughput: {throughput:.1f} tasks/second")
        
        if throughput > 50:  # Expect at least 50 tasks/second
            print("   ✓ Performance test passed")
            return True
        else:
            print("   ⚠️ Performance below expected threshold")
            return False
        
    except Exception as e:
        print(f"   ❌ Performance test failed: {str(e)}")
        return False


def test_correlation_tracking():
    """Test correlation ID tracking."""
    print("🔗 Testing Correlation Tracking...")
    
    try:
        router = TaskRouter()
        
        # Test correlation ID setting
        correlation_id = router.set_correlation_id("test-correlation-123")
        if correlation_id == "test-correlation-123":
            print("   ✓ Correlation ID set correctly")
        else:
            print("   ❌ Correlation ID not set correctly")
            return False
        
        # Test auto-generation
        auto_id = router.set_correlation_id()
        if auto_id.startswith("route_") and len(auto_id) > 6:
            print(f"   ✓ Auto-generated correlation ID: {auto_id}")
        else:
            print("   ❌ Auto-generated correlation ID invalid")
            return False
        
        # Test circuit breaker correlation
        breaker = router.get_agent_circuit_breaker("test_agent")
        breaker_id = breaker.set_correlation_id("breaker-test")
        if breaker_id == "breaker-test":
            print("   ✓ Circuit breaker correlation ID working")
        else:
            print("   ❌ Circuit breaker correlation ID failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Correlation tracking test failed: {str(e)}")
        return False


def main():
    """Run simple local tests."""
    print("🚀 VANA Simple Local Race Condition Testing")
    print("=" * 50)
    
    tests = [
        ("Basic Imports", test_basic_imports),
        ("Circuit Breaker Basics", test_circuit_breaker_basic),
        ("Basic Thread Safety", test_thread_safety_basic),
        ("Performance Under Load", test_performance_under_load),
        ("Correlation Tracking", test_correlation_tracking),
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
    
    print("\n" + "=" * 50)
    print(f"📊 Simple Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All simple local tests passed!")
        print("✅ Race condition fixes working in local environment")
        return 0
    else:
        print("⚠️ Some tests failed - check implementation")
        return 1


if __name__ == "__main__":
    sys.exit(main())
