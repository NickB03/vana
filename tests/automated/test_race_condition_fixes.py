"""
Test suite for race condition fixes in VANA agent flow.

This test suite validates the thread safety and circuit breaker implementations
to ensure agent flow race conditions are resolved.
"""

import pytest
import threading
import time
import concurrent.futures
from unittest.mock import Mock, patch
from typing import List, Dict, Any

# Import the fixed modules
from lib._shared_libraries.task_router import TaskRouter, CircuitBreakerState, AgentCircuitBreaker
from lib._shared_libraries.tool_standards import PerformanceMonitor
from dashboard.monitoring.adk_memory_logger import ADKMemoryLogger, ADKSessionStateEvent


class TestCircuitBreaker:
    """Test circuit breaker functionality."""
    
    def test_circuit_breaker_states(self):
        """Test circuit breaker state transitions."""
        breaker = AgentCircuitBreaker()
        
        # Initial state should be CLOSED
        assert breaker.state == CircuitBreakerState.CLOSED
        assert breaker.can_execute() == True
        
        # Record failures to trigger OPEN state
        for _ in range(5):  # Default failure threshold
            breaker.record_failure()
        
        assert breaker.state == CircuitBreakerState.OPEN
        assert breaker.can_execute() == False
    
    def test_circuit_breaker_recovery(self):
        """Test circuit breaker recovery to HALF_OPEN and CLOSED."""
        breaker = AgentCircuitBreaker()
        
        # Trigger OPEN state
        for _ in range(5):
            breaker.record_failure()
        
        # Simulate timeout passage
        breaker.last_failure_time = time.time() - 61  # Past timeout
        
        # Should transition to HALF_OPEN
        assert breaker.can_execute() == True
        assert breaker.state == CircuitBreakerState.HALF_OPEN
        
        # Record successes to recover to CLOSED
        for _ in range(3):  # Default success threshold
            breaker.record_success()
        
        assert breaker.state == CircuitBreakerState.CLOSED
    
    def test_circuit_breaker_correlation_id(self):
        """Test correlation ID tracking."""
        breaker = AgentCircuitBreaker()
        
        correlation_id = breaker.set_correlation_id("test-123")
        assert correlation_id == "test-123"
        assert breaker.correlation_id == "test-123"
        
        # Auto-generated correlation ID
        auto_id = breaker.set_correlation_id()
        assert auto_id.startswith("cb_")
        assert len(auto_id) == 11  # "cb_" + 8 hex chars


class TestTaskRouterThreadSafety:
    """Test task router thread safety."""
    
    def test_concurrent_routing_cache_access(self):
        """Test concurrent access to routing cache."""
        router = TaskRouter()
        results = []
        errors = []
        
        def route_task_worker(task_id: int):
            try:
                result = router.route_task(f"Test task {task_id}")
                results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads accessing cache concurrently
        threads = []
        for i in range(10):
            thread = threading.Thread(target=route_task_worker, args=(i,))
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify no errors and all results received
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) == 10
    
    def test_circuit_breaker_integration(self):
        """Test circuit breaker integration in task routing."""
        router = TaskRouter()
        
        # Get circuit breaker for test agent
        breaker = router.get_agent_circuit_breaker("test_agent")
        assert breaker is not None
        
        # Trigger circuit breaker
        for _ in range(5):
            breaker.record_failure()
        
        # Verify circuit breaker status
        status = router.get_circuit_breaker_status()
        assert "test_agent" in status
        assert status["test_agent"]["state"] == "open"
        
        # Reset circuit breaker
        reset_success = router.reset_circuit_breaker("test_agent")
        assert reset_success == True
        
        # Verify reset
        updated_status = router.get_circuit_breaker_status()
        assert updated_status["test_agent"]["state"] == "closed"
    
    def test_correlation_id_tracking(self):
        """Test correlation ID tracking in routing."""
        router = TaskRouter()
        
        correlation_id = router.set_correlation_id("test-correlation-123")
        assert correlation_id == "test-correlation-123"
        
        # Auto-generated correlation ID
        auto_id = router.set_correlation_id()
        assert auto_id.startswith("route_")


class TestPerformanceMonitorThreadSafety:
    """Test performance monitor thread safety."""
    
    def test_concurrent_metric_updates(self):
        """Test concurrent metric updates."""
        monitor = PerformanceMonitor()
        errors = []
        
        def update_metrics_worker(tool_name: str, iterations: int):
            try:
                for i in range(iterations):
                    start_time = monitor.start_execution(tool_name)
                    time.sleep(0.001)  # Simulate work
                    monitor.end_execution(tool_name, start_time, success=True)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads updating metrics concurrently
        threads = []
        for i in range(5):
            thread = threading.Thread(
                target=update_metrics_worker, 
                args=(f"tool_{i}", 10)
            )
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify no errors
        assert len(errors) == 0, f"Errors occurred: {errors}"
        
        # Verify metrics were recorded
        all_metrics = monitor.get_all_metrics()
        assert len(all_metrics) == 5
        
        for i in range(5):
            tool_name = f"tool_{i}"
            assert tool_name in all_metrics
            assert all_metrics[tool_name].execution_count == 10


class TestADKMemoryLoggerThreadSafety:
    """Test ADK memory logger thread safety."""
    
    def test_concurrent_session_logging(self):
        """Test concurrent session event logging."""
        logger = ADKMemoryLogger()
        errors = []
        
        def log_session_worker(session_id: str, iterations: int):
            try:
                for i in range(iterations):
                    event = ADKSessionStateEvent(
                        timestamp=time.time(),
                        event_type="update",
                        session_id=session_id,
                        user_id="test_user",
                        state_size_mb=1.0,
                        state_keys=["key1", "key2"],
                        persistence_success=True,
                        error_message=None,
                        metadata={}
                    )
                    logger.log_session_event(event)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads logging concurrently
        threads = []
        for i in range(5):
            thread = threading.Thread(
                target=log_session_worker, 
                args=(f"session_{i}", 10)
            )
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify no errors
        assert len(errors) == 0, f"Errors occurred: {errors}"
        
        # Verify session states were tracked
        assert len(logger.session_states) == 5
    
    def test_concurrent_operation_tracing(self):
        """Test concurrent operation tracing."""
        logger = ADKMemoryLogger()
        errors = []
        
        def trace_operation_worker(operation_id: str):
            try:
                logger.start_operation_trace(operation_id, "test_operation")
                time.sleep(0.01)  # Simulate work
                logger.end_operation_trace(operation_id, success=True)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads tracing operations concurrently
        threads = []
        for i in range(10):
            thread = threading.Thread(
                target=trace_operation_worker, 
                args=(f"op_{i}",)
            )
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify no errors
        assert len(errors) == 0, f"Errors occurred: {errors}"
        
        # Verify no active operations remain (all completed)
        assert len(logger.active_operations) == 0


class TestRaceConditionScenarios:
    """Test specific race condition scenarios."""
    
    def test_agent_failure_cascade_prevention(self):
        """Test prevention of cascading agent failures."""
        router = TaskRouter()
        
        # Simulate multiple agents failing simultaneously
        agent_names = ["agent_1", "agent_2", "agent_3"]
        
        def fail_agent_worker(agent_name: str):
            breaker = router.get_agent_circuit_breaker(agent_name)
            for _ in range(6):  # Exceed failure threshold
                breaker.record_failure()
        
        # Fail all agents concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(fail_agent_worker, agent_name) 
                for agent_name in agent_names
            ]
            concurrent.futures.wait(futures)
        
        # Verify all circuit breakers are open
        status = router.get_circuit_breaker_status()
        for agent_name in agent_names:
            assert status[agent_name]["state"] == "open"
            assert status[agent_name]["can_execute"] == False
    
    def test_high_concurrency_routing(self):
        """Test routing under high concurrency load."""
        router = TaskRouter()
        results = []
        errors = []
        
        def high_load_worker(worker_id: int):
            try:
                for i in range(20):
                    task_desc = f"Worker {worker_id} task {i}"
                    result = router.route_task(task_desc)
                    results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Create high concurrency load
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(high_load_worker, worker_id) 
                for worker_id in range(10)
            ]
            concurrent.futures.wait(futures)
        
        # Verify no errors and all tasks processed
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) == 200  # 10 workers * 20 tasks each


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
