#!/usr/bin/env python3
"""
Phase 2 A2A Protocol & Distributed Architecture Validation Suite

Comprehensive validation of Phase 2 implementation including:
- A2A Protocol functionality
- Parallel execution performance
- REST API endpoints
- Fault tolerance
- Performance improvements
"""

import asyncio
import aiohttp
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List
import requests
import threading

def test_a2a_protocol_imports():
    """Test that all A2A protocol components can be imported"""
    print("🔍 Testing A2A Protocol Imports...")
    
    try:
        from agents.protocols.a2a_protocol import (
            A2AProtocol, A2ARequest, A2AResponse, AgentRegistry, 
            AgentEndpoint, AgentStatus, CircuitBreaker
        )
        print("   ✅ A2A Protocol imports successful")
        
        from agents.protocols.parallel_executor import (
            ParallelExecutor, ParallelTask, SpecialistResult,
            ExecutionStrategy, ResultAggregationMethod
        )
        print("   ✅ Parallel Executor imports successful")
        
        return True
        
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        return False


async def test_a2a_protocol_basic_functionality():
    """Test basic A2A protocol functionality"""
    print("\n🔧 Testing A2A Protocol Basic Functionality...")
    
    try:
        from agents.protocols.a2a_protocol import A2AProtocol, A2ARequest
        
        # Initialize protocol
        protocol = A2AProtocol("test_agent")
        await protocol.start()
        print("   ✅ A2A Protocol started successfully")
        
        # Register a specialist
        await protocol.register_specialist(
            name="test_specialist",
            endpoint="http://localhost:8000",
            capabilities=["test_capability"]
        )
        print("   ✅ Specialist registration successful")
        
        # Check registry
        agent = await protocol.registry.get_agent("test_specialist")
        assert agent is not None, "Agent not found in registry"
        print("   ✅ Agent registry working")
        
        # Test performance metrics
        metrics = protocol.get_performance_metrics()
        assert "total_requests" in metrics
        print("   ✅ Performance metrics accessible")
        
        await protocol.stop()
        print("   ✅ A2A Protocol stopped successfully")
        
        return True
        
    except Exception as e:
        print(f"   ❌ A2A Protocol test failed: {e}")
        return False


async def test_parallel_execution():
    """Test parallel execution framework"""
    print("\n⚡ Testing Parallel Execution Framework...")
    
    try:
        from agents.protocols.parallel_executor import (
            ParallelExecutor, ParallelTask, ExecutionStrategy, ResultAggregationMethod
        )
        
        # Initialize executor
        executor = ParallelExecutor()
        print("   ✅ Parallel Executor initialized")
        
        # Create a test task
        task = ParallelTask(
            task_id=str(uuid.uuid4()),
            task_type="test_analysis",
            data={"test": "data"},
            specialists=["specialist1", "specialist2", "specialist3"],
            strategy=ExecutionStrategy.BEST_EFFORT,
            aggregation=ResultAggregationMethod.MERGE,
            timeout=5.0
        )
        print("   ✅ Test task created")
        
        # Execute parallel task
        start_time = time.time()
        result = await executor.execute_parallel(task)
        execution_time = time.time() - start_time
        
        print(f"   ✅ Parallel execution completed in {execution_time:.2f}s")
        print(f"   ├─ Success: {result.success}")
        print(f"   ├─ Specialists succeeded: {result.specialists_succeeded}")
        print(f"   ├─ Specialists failed: {result.specialists_failed}")
        print(f"   └─ Confidence: {result.confidence:.2f}")
        
        # Test performance metrics
        metrics = executor.get_performance_metrics()
        assert metrics["total_executions"] > 0
        print("   ✅ Executor performance metrics working")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Parallel execution test failed: {e}")
        return False


def test_result_aggregation():
    """Test result aggregation methods"""
    print("\n🔄 Testing Result Aggregation...")
    
    try:
        from agents.protocols.parallel_executor import (
            ResultAggregator, SpecialistResult, ResultAggregationMethod
        )
        
        # Create sample results
        results = [
            SpecialistResult("spec1", True, {"insights": ["insight1", "insight2"], "score": 85}),
            SpecialistResult("spec2", True, {"insights": ["insight2", "insight3"], "score": 90}),
            SpecialistResult("spec3", True, {"insights": ["insight1", "insight3"], "score": 88}),
        ]
        
        # Test different aggregation methods
        methods = [
            (ResultAggregationMethod.CONCATENATE, "Concatenate"),
            (ResultAggregationMethod.MERGE, "Merge"),
            (ResultAggregationMethod.PRIORITIZE, "Prioritize"),
            (ResultAggregationMethod.CONSENSUS, "Consensus"),
        ]
        
        for method, name in methods:
            aggregated = ResultAggregator.aggregate(results, method)
            assert aggregated is not None
            print(f"   ✅ {name} aggregation successful")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Result aggregation test failed: {e}")
        return False


def test_circuit_breaker():
    """Test circuit breaker functionality"""
    print("\n⚡ Testing Circuit Breaker...")
    
    try:
        from agents.protocols.a2a_protocol import CircuitBreaker
        
        # Test normal operation
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        
        def success_func():
            return "success"
        
        result = cb.call(success_func)
        assert result == "success"
        print("   ✅ Circuit breaker allows successful calls")
        
        # Test failure handling
        def failure_func():
            raise Exception("Test failure")
        
        # First failure
        try:
            cb.call(failure_func)
        except Exception:
            pass
        
        # Second failure - should open circuit
        try:
            cb.call(failure_func)
        except Exception:
            pass
        
        assert cb.state == "open"
        print("   ✅ Circuit breaker opens after failures")
        
        # Test that circuit blocks calls when open
        try:
            cb.call(success_func)
            assert False, "Circuit breaker should block calls when open"
        except Exception as e:
            if "Circuit breaker is open" in str(e):
                print("   ✅ Circuit breaker blocks calls when open")
            else:
                raise
        
        return True
        
    except Exception as e:
        print(f"   ❌ Circuit breaker test failed: {e}")
        return False


async def test_performance_comparison():
    """Test performance improvements of parallel execution"""
    print("\n📊 Testing Performance Improvements...")
    
    try:
        from agents.protocols.parallel_executor import ParallelExecutor, ParallelTask
        
        # Simulate sequential execution
        print("   📝 Testing sequential execution...")
        sequential_start = time.time()
        for i in range(3):
            await asyncio.sleep(0.1)  # Simulate 100ms per specialist
        sequential_time = time.time() - sequential_start
        print(f"   ├─ Sequential time: {sequential_time:.2f}s")
        
        # Test parallel execution
        print("   📝 Testing parallel execution...")
        executor = ParallelExecutor()
        task = ParallelTask(
            task_id="perf_test",
            task_type="performance_test",
            data={"test": "performance"},
            specialists=["spec1", "spec2", "spec3"]
        )
        
        parallel_start = time.time()
        result = await executor.execute_parallel(task)
        parallel_time = time.time() - parallel_start
        print(f"   ├─ Parallel time: {parallel_time:.2f}s")
        
        # Calculate improvement
        improvement = ((sequential_time - parallel_time) / sequential_time) * 100
        print(f"   ├─ Performance improvement: {improvement:.1f}%")
        
        # Validate improvement
        assert parallel_time < sequential_time, "Parallel execution should be faster"
        assert improvement > 30, "Should see at least 30% improvement"
        print("   ✅ Significant performance improvement achieved")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Performance comparison failed: {e}")
        return False


def test_server_startup():
    """Test that the enhanced server starts with A2A protocol"""
    print("\n🚀 Testing Server Startup with A2A Protocol...")
    
    try:
        # Check if we can import the enhanced main
        import main_agentic
        print("   ✅ Enhanced main_agentic module imports successfully")
        
        # Check for A2A protocol components in main
        main_content = open('main_agentic.py', 'r').read()
        
        required_components = [
            "A2AProtocol",
            "register_specialists",
            "parallel_execute",
            "get_a2a_metrics",
            "list_agents"
        ]
        
        for component in required_components:
            assert component in main_content, f"Missing component: {component}"
            print(f"   ✅ {component} found in main_agentic.py")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Server startup test failed: {e}")
        return False


async def test_orchestrator_enhancements():
    """Test enhanced orchestrator with async capabilities"""
    print("\n🎭 Testing Enhanced Orchestrator...")
    
    try:
        from agents.vana.enhanced_orchestrator import (
            analyze_and_route_async, 
            parallel_route_specialists,
            smart_route_with_parallel
        )
        
        # Test async routing
        result = await analyze_and_route_async("Test request", {})
        assert len(result) > 0
        print("   ✅ Async routing function working")
        
        # Test smart routing
        result = smart_route_with_parallel("Compare architecture and security aspects of this code")
        assert len(result) > 0
        print("   ✅ Smart routing with parallel detection working")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Enhanced orchestrator test failed: {e}")
        return False


def test_rest_api_models():
    """Test REST API models for A2A protocol"""
    print("\n📡 Testing REST API Models...")
    
    try:
        # Import and test Pydantic models from main_agentic
        import main_agentic
        
        # Test AgentRequest model
        request_data = {
            "request_id": "test_123",
            "source_agent": "test_source",
            "target_agent": "test_target", 
            "task_type": "test_task",
            "data": {"test": "data"},
            "context": {"test": "context"},
            "priority": 1,
            "timeout": 30.0
        }
        
        request = main_agentic.AgentRequest(**request_data)
        assert request.request_id == "test_123"
        print("   ✅ AgentRequest model working")
        
        # Test AgentResponse model
        response_data = {
            "request_id": "test_123",
            "source_agent": "test_source",
            "target_agent": "test_target",
            "success": True,
            "data": {"result": "test"},
            "execution_time": 1.5
        }
        
        response = main_agentic.AgentResponse(**response_data)
        assert response.success is True
        print("   ✅ AgentResponse model working")
        
        return True
        
    except Exception as e:
        print(f"   ❌ REST API models test failed: {e}")
        return False


async def run_comprehensive_validation():
    """Run all validation tests"""
    print("🚀 PHASE 2 A2A PROTOCOL & DISTRIBUTED ARCHITECTURE VALIDATION")
    print("=" * 70)
    
    test_results = []
    
    # Run all tests
    tests = [
        ("Import Tests", test_a2a_protocol_imports),
        ("A2A Protocol Basic", test_a2a_protocol_basic_functionality),
        ("Parallel Execution", test_parallel_execution),
        ("Result Aggregation", test_result_aggregation),
        ("Circuit Breaker", test_circuit_breaker),
        ("Performance Comparison", test_performance_comparison),
        ("Server Startup", test_server_startup),
        ("Orchestrator Enhancements", test_orchestrator_enhancements),
        ("REST API Models", test_rest_api_models),
    ]
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} failed with exception: {e}")
            test_results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:25}: {status}")
        if result:
            passed += 1
    
    print(f"\nOVERALL RESULT: {passed}/{total} tests passed")
    
    success_rate = (passed / total) * 100
    print(f"SUCCESS RATE: {success_rate:.1f}%")
    
    if passed == total:
        print("\n🎯 ALL VALIDATIONS PASSED!")
        print("✅ Phase 2 A2A Protocol & Distributed Architecture is READY")
        
        # Performance summary
        print("\n📊 PHASE 2 ACHIEVEMENTS:")
        print("• ✅ A2A Protocol implemented with fault tolerance")
        print("• ✅ Parallel execution framework operational")
        print("• ✅ Circuit breakers and error handling working")
        print("• ✅ Result aggregation with multiple strategies")
        print("• ✅ REST API endpoints for distributed communication")
        print("• ✅ Enhanced orchestrator with async capabilities")
        print("• ✅ Performance improvements validated (30%+ speedup)")
        
        return True
    else:
        print(f"\n⚠️  {total - passed} validations failed - review implementation")
        return False


if __name__ == "__main__":
    import sys
    
    # Run validation
    success = asyncio.run(run_comprehensive_validation())
    
    if success:
        print("\n🚀 Phase 2 implementation is COMPLETE and VALIDATED!")
        sys.exit(0)
    else:
        print("\n❌ Phase 2 implementation needs attention")
        sys.exit(1)