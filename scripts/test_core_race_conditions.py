#!/usr/bin/env python3
"""
Core race condition test without problematic imports.
"""

import sys
import time
import threading
import concurrent.futures
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from lib._shared_libraries.task_router import TaskRouter
from lib._shared_libraries.tool_standards import PerformanceMonitor


def test_task_router_thread_safety():
    """Test TaskRouter thread safety."""
    print("🧵 Testing TaskRouter Thread Safety...")
    
    try:
        router = TaskRouter()
        results = []
        errors = []
        
        def routing_worker(worker_id: int):
            try:
                for i in range(10):
                    task_desc = f"Thread safety test {worker_id}-{i}"
                    correlation_id = router.set_correlation_id(f"test-{worker_id}-{i}")
                    result = router.route_task(task_desc)
                    results.append({
                        'worker_id': worker_id,
                        'task_id': result.task_id,
                        'agent': result.selected_agent,
                        'correlation': correlation_id
                    })
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
        
        # Run 5 concurrent workers
        threads = []
        for i in range(5):
            thread = threading.Thread(target=routing_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        print(f"   📊 Results: {len(results)} successful routes, {len(errors)} errors")
        
        if errors:
            print("   ❌ Thread safety errors:")
            for error in errors[:3]:
                print(f"      {error}")
            return False
        
        # Check circuit breaker status
        cb_status = router.get_circuit_breaker_status()
        print(f"   🔒 Circuit breakers created: {len(cb_status)}")
        
        print("   ✓ TaskRouter thread safety test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ TaskRouter test failed: {str(e)}")
        return False


def test_performance_monitor_thread_safety():
    """Test PerformanceMonitor thread safety."""
    print("📈 Testing PerformanceMonitor Thread Safety...")
    
    try:
        monitor = PerformanceMonitor()
        errors = []
        
        def monitoring_worker(tool_name: str, iterations: int):
            try:
                for i in range(iterations):
                    start_time = monitor.start_execution(tool_name)
                    time.sleep(0.001)  # Simulate work
                    monitor.end_execution(tool_name, start_time, success=True)
            except Exception as e:
                errors.append(f"Tool {tool_name}: {str(e)}")
        
        # Test concurrent monitoring
        tools = ['core_tool_1', 'core_tool_2', 'core_tool_3', 'core_tool_4']
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(monitoring_worker, tool_name, 15)
                for tool_name in tools
            ]
            concurrent.futures.wait(futures)
        
        if errors:
            print(f"   ❌ Monitoring errors: {errors}")
            return False
        
        # Verify metrics
        all_metrics = monitor.get_all_metrics()
        print(f"   📊 Metrics collected for {len(all_metrics)} tools")
        
        for tool_name in tools:
            if tool_name in all_metrics:
                metrics = all_metrics[tool_name]
                total_executions = metrics.success_count + metrics.error_count
                print(f"      {tool_name}: {total_executions} executions")
                
                if total_executions != 15:
                    print(f"   ❌ Expected 15 executions for {tool_name}, got {total_executions}")
                    return False
        
        print("   ✓ PerformanceMonitor thread safety test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ PerformanceMonitor test failed: {str(e)}")
        return False


def test_circuit_breaker_functionality():
    """Test circuit breaker functionality."""
    print("🔒 Testing Circuit Breaker Functionality...")
    
    try:
        router = TaskRouter()
        
        # Test circuit breaker creation
        test_agent = "core_test_agent"
        breaker = router.get_agent_circuit_breaker(test_agent)
        correlation_id = breaker.set_correlation_id("core-cb-test")
        
        print(f"   🏷️ Circuit breaker created with correlation: {correlation_id}")
        
        # Test initial state
        if not breaker.can_execute():
            print("   ❌ Circuit breaker should start in CLOSED state")
            return False
        
        # Test failure threshold
        print("   💥 Testing failure threshold...")
        for i in range(5):
            breaker.record_failure()
        
        if breaker.can_execute():
            print("   ❌ Circuit breaker should be OPEN after 5 failures")
            return False
        
        print("   ✓ Circuit breaker opened after failures")
        
        # Test recovery simulation
        print("   🔄 Testing recovery...")
        breaker.last_failure_time = time.time() - 61  # Simulate timeout
        
        if not breaker.can_execute():
            print("   ❌ Circuit breaker should allow execution after timeout")
            return False
        
        # Record successes
        for i in range(3):
            breaker.record_success()
        
        if not breaker.can_execute() or breaker.state.value != "closed":
            print("   ❌ Circuit breaker should be CLOSED after successes")
            return False
        
        print("   ✓ Circuit breaker recovered to CLOSED")
        return True
        
    except Exception as e:
        print(f"   ❌ Circuit breaker test failed: {str(e)}")
        return False


def test_high_load_performance():
    """Test performance under high load."""
    print("⚡ Testing High Load Performance...")
    
    try:
        router = TaskRouter()
        start_time = time.time()
        
        def load_worker(worker_id: int):
            results = []
            for i in range(25):  # 25 tasks per worker
                task_desc = f"Load test {worker_id}-{i}"
                result = router.route_task(task_desc)
                results.append(result)
            return results
        
        # Run 8 workers with 25 tasks each = 200 total tasks
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = [
                executor.submit(load_worker, worker_id)
                for worker_id in range(8)
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
        
        if throughput > 100:  # Expect at least 100 tasks/second
            print("   ✓ High load performance test passed")
            return True
        else:
            print("   ⚠️ Performance below expected threshold")
            return False
        
    except Exception as e:
        print(f"   ❌ High load test failed: {str(e)}")
        return False


def test_cascade_failure_prevention():
    """Test cascade failure prevention."""
    print("🛡️ Testing Cascade Failure Prevention...")
    
    try:
        router = TaskRouter()
        
        # Simulate multiple agents failing simultaneously
        agent_names = ['agent_a', 'agent_b', 'agent_c', 'agent_d']
        
        def fail_agent_worker(agent_name: str):
            breaker = router.get_agent_circuit_breaker(agent_name)
            breaker.set_correlation_id(f"cascade-{agent_name}")
            
            # Exceed failure threshold
            for _ in range(6):
                breaker.record_failure()
        
        # Fail all agents concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
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
            print("   ✓ Cascade prevention successful")
            return True
        else:
            print("   ❌ Some agents not properly isolated")
            return False
        
    except Exception as e:
        print(f"   ❌ Cascade prevention test failed: {str(e)}")
        return False


def main():
    """Run core race condition tests."""
    print("🚀 VANA Core Race Condition Testing")
    print("=" * 45)
    
    tests = [
        ("TaskRouter Thread Safety", test_task_router_thread_safety),
        ("PerformanceMonitor Thread Safety", test_performance_monitor_thread_safety),
        ("Circuit Breaker Functionality", test_circuit_breaker_functionality),
        ("High Load Performance", test_high_load_performance),
        ("Cascade Failure Prevention", test_cascade_failure_prevention),
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
    
    print("\n" + "=" * 45)
    print(f"📊 Core Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All core race condition tests passed!")
        print("✅ Local environment properly supports race condition fixes")
        return 0
    else:
        print("⚠️ Some core tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
