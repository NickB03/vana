"""
Comprehensive test suite for A2A Protocol and Parallel Execution Framework.

This test suite validates:
- A2A protocol basic functionality
- Parallel execution capabilities
- Fault tolerance and circuit breakers
- Performance characteristics
- REST API endpoints
"""

import pytest
import asyncio
import time
import json
from datetime import datetime
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
import uuid

# Import A2A protocol components
from agents.protocols.a2a_protocol import (
    A2AProtocol, A2ARequest, A2AResponse, AgentRegistry, 
    AgentEndpoint, AgentStatus, CircuitBreaker
)
from agents.protocols.parallel_executor import (
    ParallelExecutor, ParallelTask, SpecialistResult, 
    ExecutionStrategy, ResultAggregationMethod, ResultAggregator
)


class TestCircuitBreaker:
    """Test circuit breaker functionality"""
    
    def test_circuit_breaker_closed_state(self):
        """Test circuit breaker in closed state allows calls"""
        cb = CircuitBreaker(failure_threshold=3)
        
        def dummy_func():
            return "success"
        
        result = cb.call(dummy_func)
        assert result == "success"
        assert cb.state == "closed"
    
    def test_circuit_breaker_opens_on_failures(self):
        """Test circuit breaker opens after threshold failures"""
        cb = CircuitBreaker(failure_threshold=2)
        
        def failing_func():
            raise Exception("Test failure")
        
        # First failure
        with pytest.raises(Exception):
            cb.call(failing_func)
        assert cb.state == "closed"
        
        # Second failure - should open circuit
        with pytest.raises(Exception):
            cb.call(failing_func)
        assert cb.state == "open"
        
        # Third call should fail due to open circuit
        with pytest.raises(Exception, match="Circuit breaker is open"):
            cb.call(failing_func)
    
    def test_circuit_breaker_recovery(self):
        """Test circuit breaker recovery after timeout"""
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)
        
        def failing_func():
            raise Exception("Test failure")
        
        # Trigger failure to open circuit
        with pytest.raises(Exception):
            cb.call(failing_func)
        assert cb.state == "open"
        
        # Wait for recovery timeout
        time.sleep(0.2)
        
        # Should allow attempt in half-open state
        def success_func():
            return "recovered"
        
        result = cb.call(success_func)
        assert result == "recovered"
        assert cb.state == "closed"


class TestAgentRegistry:
    """Test agent registry functionality"""
    
    @pytest.mark.asyncio
    async def test_register_agent(self):
        """Test agent registration"""
        registry = AgentRegistry()
        
        await registry.register_agent(
            name="test_agent",
            url="http://localhost:8000",
            capabilities=["test_capability"]
        )
        
        agent = await registry.get_agent("test_agent")
        assert agent is not None
        assert agent.name == "test_agent"
        assert agent.url == "http://localhost:8000"
        assert "test_capability" in agent.capabilities
        assert agent.status == AgentStatus.AVAILABLE
    
    @pytest.mark.asyncio
    async def test_unregister_agent(self):
        """Test agent unregistration"""
        registry = AgentRegistry()
        
        await registry.register_agent("test_agent", "http://localhost:8000", ["test"])
        assert await registry.get_agent("test_agent") is not None
        
        await registry.unregister_agent("test_agent")
        assert await registry.get_agent("test_agent") is None
    
    @pytest.mark.asyncio
    async def test_get_agents_by_capability(self):
        """Test getting agents by capability"""
        registry = AgentRegistry()
        
        await registry.register_agent("agent1", "http://localhost:8001", ["capability1", "capability2"])
        await registry.register_agent("agent2", "http://localhost:8002", ["capability2", "capability3"])
        await registry.register_agent("agent3", "http://localhost:8003", ["capability3"])
        
        # Test capability1
        agents = await registry.get_agents_by_capability("capability1")
        assert len(agents) == 1
        assert agents[0].name == "agent1"
        
        # Test capability2
        agents = await registry.get_agents_by_capability("capability2")
        assert len(agents) == 2
        agent_names = [a.name for a in agents]
        assert "agent1" in agent_names
        assert "agent2" in agent_names
    
    @pytest.mark.asyncio
    async def test_best_agent_selection(self):
        """Test best agent selection based on performance"""
        registry = AgentRegistry()
        
        # Register agents with different performance characteristics
        await registry.register_agent("fast_agent", "http://localhost:8001", ["test"])
        await registry.register_agent("slow_agent", "http://localhost:8002", ["test"])
        
        # Simulate performance metrics
        await registry.record_response_time("fast_agent", 0.1, True)
        await registry.record_response_time("slow_agent", 1.0, True)
        
        best_agent = await registry.get_best_agent("test")
        assert best_agent.name == "fast_agent"


class TestA2AProtocol:
    """Test A2A protocol functionality"""
    
    @pytest.mark.asyncio
    async def test_a2a_protocol_initialization(self):
        """Test A2A protocol initialization"""
        protocol = A2AProtocol("test_agent")
        await protocol.start()
        
        assert protocol.agent_name == "test_agent"
        assert protocol.session is not None
        assert protocol._running is True
        
        await protocol.stop()
        assert protocol._running is False
    
    @pytest.mark.asyncio
    async def test_specialist_registration(self):
        """Test specialist registration"""
        protocol = A2AProtocol("test_agent")
        await protocol.start()
        
        await protocol.register_specialist(
            name="test_specialist",
            endpoint="http://localhost:8000",
            capabilities=["test_capability"]
        )
        
        agent = await protocol.registry.get_agent("test_specialist")
        assert agent is not None
        assert agent.name == "test_specialist"
        
        await protocol.stop()
    
    @pytest.mark.asyncio
    async def test_call_best_specialist(self):
        """Test calling best specialist"""
        protocol = A2AProtocol("test_agent")
        await protocol.start()
        
        # Mock HTTP session
        with patch.object(protocol, '_make_http_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"result": "test_response"}
            
            await protocol.register_specialist(
                "test_specialist", 
                "http://localhost:8000", 
                ["test_capability"]
            )
            
            request = A2ARequest(
                request_id="test_123",
                source_agent="test_agent",
                target_agent="test_specialist",
                task_type="test_task",
                data={"test": "data"}
            )
            
            response = await protocol.call_best_specialist("test_capability", request)
            
            assert response.success is True
            assert response.data == {"result": "test_response"}
            assert response.request_id == "test_123"
        
        await protocol.stop()
    
    @pytest.mark.asyncio
    async def test_parallel_routing(self):
        """Test parallel routing to multiple specialists"""
        protocol = A2AProtocol("test_agent")
        await protocol.start()
        
        # Register multiple specialists
        specialists = ["specialist1", "specialist2", "specialist3"]
        for spec in specialists:
            await protocol.register_specialist(
                spec, 
                f"http://localhost:800{spec[-1]}", 
                ["test_capability"]
            )
        
        # Mock HTTP requests
        with patch.object(protocol, '_make_http_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"result": "parallel_response"}
            
            request = A2ARequest(
                request_id="parallel_test",
                source_agent="test_agent",
                target_agent="parallel",
                task_type="test_task",
                data={"test": "data"}
            )
            
            responses = await protocol.parallel_route(request, specialists)
            
            assert len(responses) == 3
            for response in responses:
                assert response.success is True
                assert response.data == {"result": "parallel_response"}
        
        await protocol.stop()


class TestResultAggregator:
    """Test result aggregation functionality"""
    
    def test_concatenate_results(self):
        """Test concatenate aggregation method"""
        results = [
            SpecialistResult("spec1", True, ["item1", "item2"], execution_time=0.1),
            SpecialistResult("spec2", True, ["item3", "item4"], execution_time=0.2),
        ]
        
        aggregated = ResultAggregator.aggregate(results, ResultAggregationMethod.CONCATENATE)
        
        assert "specialists" in aggregated
        assert "combined_data" in aggregated
        assert len(aggregated["combined_data"]) == 4
        assert "item1" in aggregated["combined_data"]
        assert "item4" in aggregated["combined_data"]
    
    def test_merge_results(self):
        """Test merge aggregation method"""
        results = [
            SpecialistResult("spec1", True, {
                "insights": ["insight1", "insight2"],
                "score": 85
            }),
            SpecialistResult("spec2", True, {
                "insights": ["insight2", "insight3"],
                "score": 90,
                "recommendations": ["rec1"]
            }),
        ]
        
        aggregated = ResultAggregator.aggregate(results, ResultAggregationMethod.MERGE)
        
        assert "insights" in aggregated
        assert len(aggregated["insights"]) == 3  # Deduplicated
        assert aggregated["score"] == 87.5  # Average
        assert "recommendations" in aggregated
    
    def test_prioritize_results(self):
        """Test prioritize aggregation method"""
        results = [
            SpecialistResult("spec1", True, {"data": "result1"}, confidence=0.7),
            SpecialistResult("spec2", True, {"data": "result2"}, confidence=0.9),
            SpecialistResult("spec3", True, {"data": "result3"}, confidence=0.8),
        ]
        
        aggregated = ResultAggregator.aggregate(results, ResultAggregationMethod.PRIORITIZE)
        
        assert aggregated["primary_specialist"] == "spec2"
        assert aggregated["confidence"] == 0.9
        assert len(aggregated["alternative_results"]) == 2
    
    def test_consensus_results(self):
        """Test consensus aggregation method"""
        results = [
            SpecialistResult("spec1", True, ["item1", "item2", "item3"]),
            SpecialistResult("spec2", True, ["item1", "item2", "item4"]),
            SpecialistResult("spec3", True, ["item1", "item5", "item6"]),
        ]
        
        aggregated = ResultAggregator.aggregate(results, ResultAggregationMethod.CONSENSUS)
        
        assert "consensus_items" in aggregated
        assert "item1" in aggregated["consensus_items"]  # Appears in all 3
        assert "disagreements" in aggregated


class TestParallelExecutor:
    """Test parallel execution framework"""
    
    @pytest.mark.asyncio
    async def test_parallel_execution_basic(self):
        """Test basic parallel execution"""
        executor = ParallelExecutor()
        
        task = ParallelTask(
            task_id="test_parallel",
            task_type="test",
            data={"test": "data"},
            specialists=["spec1", "spec2"],
            strategy=ExecutionStrategy.BEST_EFFORT
        )
        
        result = await executor.execute_parallel(task)
        
        assert result.task_id == "test_parallel"
        assert result.success is True
        assert len(result.specialist_results) == 2
        assert result.execution_time > 0
    
    @pytest.mark.asyncio
    async def test_execution_strategies(self):
        """Test different execution strategies"""
        executor = ParallelExecutor()
        
        # Mock one failing specialist
        with patch.object(executor, '_execute_specialist_direct') as mock_execute:
            mock_execute.side_effect = [
                SpecialistResult("spec1", True, {"result": "success"}),
                SpecialistResult("spec2", False, None, error="Failed"),
            ]
            
            # ALL_REQUIRED should fail
            task_all = ParallelTask(
                task_id="test_all",
                task_type="test",
                data={},
                specialists=["spec1", "spec2"],
                strategy=ExecutionStrategy.ALL_REQUIRED
            )
            
            result = await executor.execute_parallel(task_all)
            assert result.success is False
            
            # BEST_EFFORT should succeed
            task_best = ParallelTask(
                task_id="test_best",
                task_type="test",
                data={},
                specialists=["spec1", "spec2"],
                strategy=ExecutionStrategy.BEST_EFFORT
            )
            
            result = await executor.execute_parallel(task_best)
            assert result.success is True
    
    def test_performance_metrics(self):
        """Test performance metrics collection"""
        executor = ParallelExecutor()
        
        # Simulate some executions
        result1 = ParallelExecutionResult(
            task_id="task1",
            success=True,
            data={},
            specialist_results=[
                SpecialistResult("spec1", True, {}, execution_time=0.1),
                SpecialistResult("spec2", True, {}, execution_time=0.2),
            ],
            execution_time=0.25,
            strategy_used=ExecutionStrategy.BEST_EFFORT,
            aggregation_used=ResultAggregationMethod.MERGE,
            specialists_succeeded=2,
            specialists_failed=0
        )
        
        executor._update_metrics(result1)
        metrics = executor.get_performance_metrics()
        
        assert metrics["total_executions"] == 1
        assert metrics["successful_executions"] == 1
        assert metrics["success_rate"] == 1.0
        assert metrics["average_execution_time"] == 0.25
        assert "spec1" in metrics["specialist_performance"]
        assert "spec2" in metrics["specialist_performance"]


class TestA2AIntegration:
    """Integration tests for complete A2A workflow"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self):
        """Test complete end-to-end A2A workflow"""
        # Initialize A2A protocol
        protocol = A2AProtocol("master_agent")
        await protocol.start()
        
        # Initialize parallel executor
        executor = ParallelExecutor(protocol)
        
        # Register specialists
        specialists = ["arch_specialist", "data_specialist"]
        for spec in specialists:
            await protocol.register_specialist(
                spec, 
                f"http://localhost:800{spec[-1]}", 
                ["analysis"]
            )
        
        # Mock HTTP requests for specialists
        with patch.object(protocol, '_make_http_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {
                "analysis": "comprehensive analysis result",
                "confidence": 0.95
            }
            
            # Create and execute parallel task
            task = ParallelTask(
                task_id=str(uuid.uuid4()),
                task_type="comprehensive_analysis",
                data={"code": "def test(): pass"},
                specialists=specialists,
                strategy=ExecutionStrategy.BEST_EFFORT,
                aggregation=ResultAggregationMethod.MERGE
            )
            
            result = await executor.execute_parallel(task)
            
            # Validate results
            assert result.success is True
            assert result.specialists_succeeded == 2
            assert result.specialists_failed == 0
            assert result.execution_time > 0
            assert len(result.specialist_results) == 2
            
            # Check performance metrics
            metrics = executor.get_performance_metrics()
            assert metrics["total_executions"] == 1
            assert metrics["successful_executions"] == 1
        
        await protocol.stop()


class TestPerformanceValidation:
    """Performance validation tests"""
    
    @pytest.mark.asyncio
    async def test_parallel_performance_improvement(self):
        """Test that parallel execution is faster than sequential"""
        # Simulate sequential execution time
        sequential_time = 0
        for i in range(3):
            start = time.time()
            await asyncio.sleep(0.1)  # Simulate 100ms per specialist
            sequential_time += time.time() - start
        
        # Test parallel execution
        executor = ParallelExecutor()
        task = ParallelTask(
            task_id="perf_test",
            task_type="test",
            data={},
            specialists=["spec1", "spec2", "spec3"]
        )
        
        start = time.time()
        result = await executor.execute_parallel(task)
        parallel_time = time.time() - start
        
        # Parallel should be significantly faster
        # Allow some overhead, but should be at least 50% faster
        assert parallel_time < sequential_time * 0.7
        assert result.success is True
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_performance_impact(self):
        """Test circuit breaker doesn't significantly impact performance"""
        cb = CircuitBreaker()
        
        def fast_function():
            return "result"
        
        # Measure without circuit breaker
        start = time.time()
        for _ in range(1000):
            fast_function()
        baseline_time = time.time() - start
        
        # Measure with circuit breaker
        start = time.time()
        for _ in range(1000):
            cb.call(fast_function)
        cb_time = time.time() - start
        
        # Circuit breaker overhead should be minimal (<20%)
        assert cb_time < baseline_time * 1.2


# Fixtures and utilities for tests

@pytest.fixture
async def a2a_protocol():
    """Fixture for A2A protocol instance"""
    protocol = A2AProtocol("test_agent")
    await protocol.start()
    yield protocol
    await protocol.stop()


@pytest.fixture
def parallel_executor():
    """Fixture for parallel executor instance"""
    return ParallelExecutor()


@pytest.fixture
def sample_specialist_results():
    """Fixture for sample specialist results"""
    return [
        SpecialistResult("spec1", True, {"analysis": "result1"}, execution_time=0.1),
        SpecialistResult("spec2", True, {"analysis": "result2"}, execution_time=0.2),
        SpecialistResult("spec3", False, None, error="Failed", execution_time=0.05),
    ]


# Performance benchmarks
def test_benchmark_aggregation_methods():
    """Benchmark different aggregation methods"""
    results = [
        SpecialistResult(f"spec{i}", True, {"data": f"result{i}"}, execution_time=0.1)
        for i in range(10)
    ]
    
    methods = [
        ResultAggregationMethod.CONCATENATE,
        ResultAggregationMethod.MERGE,
        ResultAggregationMethod.PRIORITIZE,
        ResultAggregationMethod.CONSENSUS
    ]
    
    for method in methods:
        start = time.time()
        for _ in range(100):
            ResultAggregator.aggregate(results, method)
        elapsed = time.time() - start
        
        # All methods should complete 100 aggregations in reasonable time
        assert elapsed < 1.0, f"Method {method} took too long: {elapsed}s"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])