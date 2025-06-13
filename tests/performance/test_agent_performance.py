"""
Agent Performance Tests for VANA Testing Framework

Comprehensive performance testing for VANA agents including:
- Response time benchmarking
- Memory usage monitoring
- Concurrent operation testing
- Tool execution performance
- Multi-agent workflow performance
"""

import pytest
import asyncio
import time
import sys
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from tests.performance.performance_suite import PerformanceBenchmark, AsyncPerformanceBenchmark

class AgentPerformanceBenchmark(PerformanceBenchmark):
    """Performance benchmarks specifically for VANA agents."""
    
    def __init__(self):
        super().__init__("agent_performance")

class TestAgentPerformance:
    """Performance tests for VANA agents."""
    
    @pytest.fixture
    def performance_benchmark(self):
        """Create performance benchmark instance."""
        return AgentPerformanceBenchmark()
    
    @pytest.fixture
    def mock_agent(self):
        """Mock VANA agent for testing."""
        agent = Mock()
        agent.name = "test_agent"
        agent.process_message = Mock(return_value="test response")
        agent.execute_tool = Mock(return_value={"result": "tool executed"})
        agent.delegate_task = Mock(return_value="task delegated")
        return agent
    
    @pytest.fixture
    def async_mock_agent(self):
        """Mock async VANA agent for testing."""
        agent = Mock()
        agent.name = "async_test_agent"
        agent.process_message = AsyncMock(return_value="async test response")
        agent.execute_tool = AsyncMock(return_value={"result": "async tool executed"})
        agent.delegate_task = AsyncMock(return_value="async task delegated")
        return agent
    
    @pytest.mark.performance
    def test_agent_response_time(self, performance_benchmark, mock_agent):
        """Test agent response time under normal load."""
        # Configure mock agent with realistic delay
        def mock_agent_call():
            time.sleep(0.1)  # Simulate processing time
            return mock_agent.process_message("test message")
        
        # Measure response time
        metric = performance_benchmark.measure_response_time(mock_agent_call)
        
        # Assertions
        assert metric.value > 0.09  # Should be at least 0.1s due to sleep
        assert metric.value < 5.0   # Should be under 5s limit
        assert metric.unit == "seconds"
        assert metric.metadata["success"] is True
        assert "test_agent" in str(metric.metadata.get("result_size", 0)) or metric.metadata.get("result_size", 0) > 0
        
        # Verify benchmark collected the metric
        assert len(performance_benchmark.metrics) == 1
        assert performance_benchmark.metrics[0].name == "agent_performance_response_time"
    
    @pytest.mark.performance
    def test_agent_memory_usage(self, performance_benchmark, mock_agent):
        """Test agent memory usage during operation."""
        # Configure mock agent with memory-intensive operation
        def memory_intensive_operation():
            # Simulate memory usage
            data = ["test"] * 1000  # Small memory allocation
            return mock_agent.process_message("memory test")
        
        # Measure memory usage
        metric = performance_benchmark.measure_memory_usage(memory_intensive_operation)
        
        # Assertions
        assert metric.unit == "MB"
        assert metric.metadata["success"] is True
        assert "start_memory_mb" in metric.metadata
        assert "end_memory_mb" in metric.metadata
        assert "peak_memory_mb" in metric.metadata
        
        # Memory delta can be positive or negative
        assert isinstance(metric.value, float)
    
    @pytest.mark.performance
    def test_agent_throughput(self, performance_benchmark, mock_agent):
        """Test agent throughput (operations per second)."""
        # Configure mock agent for throughput testing
        def quick_operation():
            return mock_agent.process_message("quick test")
        
        # Measure throughput with fewer iterations for faster testing
        metric = performance_benchmark.measure_throughput(quick_operation, iterations=50)
        
        # Assertions
        assert metric.value > 0  # Should have some throughput
        assert metric.unit == "ops/sec"
        assert metric.metadata["iterations"] == 50
        assert metric.metadata["successful_operations"] <= 50
        assert metric.metadata["success_rate"] <= 1.0
        assert metric.metadata["error_count"] >= 0
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_concurrent_agent_calls(self):
        """Test agent performance under concurrent load."""
        async_benchmark = AsyncPerformanceBenchmark("concurrent_agent_test")
        
        # Mock async agent call
        async def mock_async_agent_call():
            await asyncio.sleep(0.1)  # Simulate async processing
            return {"response": "async_test", "agent": "concurrent_test"}
        
        # Test concurrent operations
        metric = await async_benchmark.measure_concurrent_operations(
            mock_async_agent_call, 
            concurrency=10
        )
        
        # Assertions
        assert metric.value > 0  # Should have some throughput
        assert metric.unit == "ops/sec"
        assert metric.metadata["concurrency"] == 10
        assert metric.metadata["successful_operations"] <= 10
        assert metric.metadata["success_rate"] <= 1.0
        
        # Should complete all operations successfully
        assert metric.metadata["error_count"] == 0
        assert metric.metadata["success_rate"] == 1.0
    
    @pytest.mark.performance
    def test_tool_execution_performance(self, performance_benchmark, mock_agent):
        """Test tool execution performance."""
        # Configure mock tool execution
        def tool_execution():
            time.sleep(0.05)  # Simulate tool execution time
            return mock_agent.execute_tool("echo", {"message": "performance test"})
        
        # Measure tool execution time
        metric = performance_benchmark.measure_response_time(tool_execution)
        
        # Assertions
        assert metric.value > 0.04  # Should be at least 0.05s due to sleep
        assert metric.value < 2.0   # Tool execution should be fast
        assert metric.metadata["success"] is True
        assert metric.metadata["function"] == "tool_execution"
    
    @pytest.mark.performance
    def test_agent_delegation_performance(self, performance_benchmark, mock_agent):
        """Test agent delegation performance."""
        # Configure mock delegation
        def delegation_operation():
            time.sleep(0.02)  # Simulate delegation overhead
            return mock_agent.delegate_task("specialist_agent", "complex_task")
        
        # Measure delegation time
        metric = performance_benchmark.measure_response_time(delegation_operation)
        
        # Assertions
        assert metric.value > 0.01  # Should have some delegation time
        assert metric.value < 1.0   # Delegation should be fast
        assert metric.metadata["success"] is True
    
    @pytest.mark.performance
    def test_performance_regression_detection(self, performance_benchmark, mock_agent):
        """Test performance regression detection capabilities."""
        # Baseline performance measurement
        def baseline_operation():
            time.sleep(0.1)  # Consistent baseline
            return mock_agent.process_message("baseline test")
        
        # Measure baseline performance multiple times
        baseline_metrics = []
        for _ in range(5):
            metric = performance_benchmark.measure_response_time(baseline_operation)
            baseline_metrics.append(metric.value)
        
        # Calculate baseline statistics
        baseline_mean = sum(baseline_metrics) / len(baseline_metrics)
        
        # Simulate performance regression
        def regressed_operation():
            time.sleep(0.2)  # Slower performance
            return mock_agent.process_message("regressed test")
        
        # Measure regressed performance
        regressed_metric = performance_benchmark.measure_response_time(regressed_operation)
        
        # Detect regression (should be significantly slower)
        regression_threshold = baseline_mean * 1.5  # 50% slower threshold
        assert regressed_metric.value > regression_threshold, f"Performance regression detected: {regressed_metric.value:.3f}s vs baseline {baseline_mean:.3f}s"
    
    @pytest.mark.performance
    def test_benchmark_statistics_calculation(self, performance_benchmark, mock_agent):
        """Test benchmark statistics calculation."""
        # Generate multiple metrics
        def test_operation():
            # Variable delay to create statistical distribution
            import random
            time.sleep(random.uniform(0.05, 0.15))
            return mock_agent.process_message("stats test")
        
        # Collect multiple measurements
        for _ in range(10):
            performance_benchmark.measure_response_time(test_operation)
        
        # Calculate statistics
        stats = performance_benchmark.get_statistics()
        
        # Verify statistics structure
        assert isinstance(stats, dict)
        assert "agent_performance_response_time" in stats
        
        response_time_stats = stats["agent_performance_response_time"]
        assert "count" in response_time_stats
        assert "mean" in response_time_stats
        assert "min" in response_time_stats
        assert "max" in response_time_stats
        assert "median" in response_time_stats
        assert "std_dev" in response_time_stats
        assert "p95" in response_time_stats
        assert "p99" in response_time_stats
        
        # Verify statistical values make sense
        assert response_time_stats["count"] == 10
        assert response_time_stats["min"] <= response_time_stats["mean"] <= response_time_stats["max"]
        assert response_time_stats["std_dev"] >= 0
    
    @pytest.mark.performance
    def test_benchmark_results_persistence(self, performance_benchmark, mock_agent, tmp_path):
        """Test saving benchmark results to file."""
        # Generate some metrics
        def test_operation():
            time.sleep(0.05)
            return mock_agent.process_message("persistence test")
        
        performance_benchmark.start_benchmark()
        performance_benchmark.measure_response_time(test_operation)
        performance_benchmark.measure_memory_usage(test_operation)
        performance_benchmark.end_benchmark()
        
        # Save results
        results_file = tmp_path / "benchmark_results.json"
        performance_benchmark.save_results(results_file)
        
        # Verify file was created and contains expected data
        assert results_file.exists()
        
        import json
        with open(results_file) as f:
            results = json.load(f)
        
        assert "benchmark_name" in results
        assert "metrics" in results
        assert "statistics" in results
        assert results["benchmark_name"] == "agent_performance"
        assert len(results["metrics"]) == 2  # response_time + memory_usage

# Test configuration for async tests
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "performance"])
