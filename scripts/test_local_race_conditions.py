#!/usr/bin/env python3
"""
Local environment test for race condition fixes.

This script tests the race condition fixes in the local development environment
with actual VANA agent integration.
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

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.local')

from lib._shared_libraries.task_router import TaskRouter
from lib._shared_libraries.tool_standards import PerformanceMonitor
from dashboard.monitoring.adk_memory_logger import ADKMemoryLogger


def test_local_environment_setup():
    """Test that local environment is properly configured."""
    print("🔧 Testing Local Environment Setup...")
    
    required_vars = [
        'VANA_MODEL',
        'GOOGLE_API_KEY',
        'GOOGLE_CLOUD_PROJECT',
        'VANA_RAG_CORPUS_ID'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"   ❌ Missing environment variables: {missing_vars}")
        return False
    
    print(f"   ✓ Environment configured with model: {os.getenv('VANA_MODEL')}")
    print(f"   ✓ Google Cloud Project: {os.getenv('GOOGLE_CLOUD_PROJECT')}")
    print(f"   ✓ RAG Corpus: {os.getenv('VANA_RAG_CORPUS_ID')}")
    return True


def test_vana_agent_import():
    """Test that VANA agent can be imported without hanging."""
    print("🤖 Testing VANA Agent Import...")
    
    try:
        start_time = time.time()
        
        # Import VANA agent
        from agents.vana.team import root_agent
        
        import_time = time.time() - start_time
        print(f"   ✓ VANA agent imported successfully in {import_time:.2f}s")
        
        # Test basic agent info
        if hasattr(root_agent, 'name'):
            print(f"   ✓ Agent name: {root_agent.name}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ VANA agent import failed: {str(e)}")
        return False


def test_concurrent_task_routing():
    """Test concurrent task routing with race condition fixes."""
    print("🧵 Testing Concurrent Task Routing...")
    
    router = TaskRouter()
    results = []
    errors = []
    
    def routing_worker(worker_id: int):
        try:
            for i in range(5):
                task_desc = f"Local test task from worker {worker_id}, iteration {i}"
                correlation_id = router.set_correlation_id(f"local-test-{worker_id}-{i}")
                
                result = router.route_task(task_desc)
                results.append({
                    'worker_id': worker_id,
                    'iteration': i,
                    'task_id': result.task_id,
                    'selected_agent': result.selected_agent,
                    'correlation_id': correlation_id
                })
                
        except Exception as e:
            errors.append(f"Worker {worker_id}: {str(e)}")
    
    # Run concurrent workers
    print("   🚀 Starting 5 concurrent routing workers...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(routing_worker, worker_id)
            for worker_id in range(5)
        ]
        concurrent.futures.wait(futures)
    
    print(f"   📊 Results: {len(results)} successful routes, {len(errors)} errors")
    
    if errors:
        print("   ❌ Errors occurred:")
        for error in errors[:3]:  # Show first 3 errors
            print(f"      {error}")
        return False
    
    # Verify circuit breaker status
    cb_status = router.get_circuit_breaker_status()
    print(f"   🔒 Circuit breakers active: {len(cb_status)}")
    
    print("   ✓ Concurrent task routing test passed")
    return True


def test_performance_monitoring():
    """Test performance monitoring thread safety."""
    print("📈 Testing Performance Monitoring...")
    
    monitor = PerformanceMonitor()
    errors = []
    
    def monitoring_worker(tool_name: str):
        try:
            for i in range(10):
                start_time = monitor.start_execution(tool_name)
                time.sleep(0.001)  # Simulate work
                monitor.end_execution(tool_name, start_time, success=True)
        except Exception as e:
            errors.append(f"Tool {tool_name}: {str(e)}")
    
    # Test concurrent monitoring
    tools = ['local_tool_1', 'local_tool_2', 'local_tool_3']
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(monitoring_worker, tool_name)
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
            print(f"      {tool_name}: {total_executions} executions, avg {metrics.average_execution_time:.3f}s")
    
    print("   ✓ Performance monitoring test passed")
    return True


def test_memory_logging():
    """Test ADK memory logger thread safety."""
    print("📝 Testing Memory Logging...")
    
    logger = ADKMemoryLogger()
    errors = []
    
    def logging_worker(session_id: str):
        try:
            for i in range(5):
                operation_id = f"{session_id}_op_{i}"
                
                # Start operation trace
                logger.start_operation_trace(operation_id, "local_test")
                time.sleep(0.001)
                logger.end_operation_trace(operation_id, success=True)
                
        except Exception as e:
            errors.append(f"Session {session_id}: {str(e)}")
    
    # Test concurrent logging
    sessions = ['local_session_1', 'local_session_2', 'local_session_3']
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(logging_worker, session_id)
            for session_id in sessions
        ]
        concurrent.futures.wait(futures)
    
    if errors:
        print(f"   ❌ Logging errors: {errors}")
        return False
    
    # Verify no active operations remain
    active_ops = len(logger.active_operations)
    print(f"   📊 Active operations remaining: {active_ops}")
    
    if active_ops > 0:
        print("   ⚠️ Some operations didn't complete properly")
        return False
    
    print("   ✓ Memory logging test passed")
    return True


def test_agent_circuit_breaker():
    """Test agent circuit breaker functionality."""
    print("🔒 Testing Agent Circuit Breaker...")
    
    router = TaskRouter()
    
    # Test circuit breaker creation
    test_agent = "local_test_agent"
    breaker = router.get_agent_circuit_breaker(test_agent)
    correlation_id = breaker.set_correlation_id("local-cb-test")
    
    print(f"   🏷️ Circuit breaker created with correlation: {correlation_id}")
    
    # Test failure threshold
    print("   💥 Testing failure threshold...")
    for i in range(5):
        breaker.record_failure()
        print(f"      Failure {i+1}/5 recorded")
    
    if not breaker.can_execute():
        print("   ✓ Circuit breaker opened after failures")
    else:
        print("   ❌ Circuit breaker should be open")
        return False
    
    # Test recovery
    print("   🔄 Testing recovery...")
    breaker.last_failure_time = time.time() - 61  # Simulate timeout
    
    if breaker.can_execute():
        print("   ✓ Circuit breaker transitioned to HALF_OPEN")
    else:
        print("   ❌ Circuit breaker should allow execution after timeout")
        return False
    
    # Test success recovery
    for i in range(3):
        breaker.record_success()
        print(f"      Success {i+1}/3 recorded")
    
    if breaker.can_execute() and breaker.state.value == "closed":
        print("   ✓ Circuit breaker recovered to CLOSED")
    else:
        print("   ❌ Circuit breaker should be closed after successes")
        return False
    
    return True


def main():
    """Run all local environment tests."""
    print("🚀 VANA Local Environment Race Condition Testing")
    print("=" * 60)
    
    tests = [
        ("Local Environment Setup", test_local_environment_setup),
        ("VANA Agent Import", test_vana_agent_import),
        ("Concurrent Task Routing", test_concurrent_task_routing),
        ("Performance Monitoring", test_performance_monitoring),
        ("Memory Logging", test_memory_logging),
        ("Agent Circuit Breaker", test_agent_circuit_breaker),
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
    print(f"📊 Local Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All local environment tests passed!")
        print("✅ Race condition fixes validated in local environment")
        return 0
    else:
        print("⚠️ Some local tests failed - check configuration")
        return 1


if __name__ == "__main__":
    sys.exit(main())
