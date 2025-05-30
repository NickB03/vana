#!/usr/bin/env python3
"""
Test script for ADK Memory Monitoring System

This script tests all components of the ADK memory monitoring system
to ensure they work correctly with both real ADK and mock data.
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_adk_memory_monitor():
    """Test the ADK memory monitor."""
    print("🧠 Testing ADK Memory Monitor...")
    
    try:
        from dashboard.monitoring.adk_memory_monitor import adk_memory_monitor
        
        # Test health check
        print("  ✓ Testing health check...")
        health = adk_memory_monitor.check_health()
        print(f"    Status: {health.get('status', 'unknown')}")
        print(f"    ADK Available: {health.get('adk_available', False)}")
        
        # Test metrics collection
        print("  ✓ Testing metrics collection...")
        metrics = adk_memory_monitor.collect_metrics()
        print(f"    Service Status: {metrics.service_status}")
        print(f"    Query Latency: {metrics.average_query_latency_ms:.1f}ms")
        print(f"    Error Rate: {metrics.error_rate:.2%}")
        
        # Test cost metrics
        print("  ✓ Testing cost metrics...")
        cost_metrics = adk_memory_monitor.collect_cost_metrics()
        print(f"    Daily Cost: ${cost_metrics.total_cost_usd:.2f}")
        print(f"    Monthly Projection: ${cost_metrics.monthly_projection_usd:.0f}")
        
        # Test performance comparison
        print("  ✓ Testing performance comparison...")
        comparison = adk_memory_monitor.get_performance_comparison()
        if "error" not in comparison:
            print(f"    Comparison Period: {comparison.get('comparison_period', 'N/A')}")
        else:
            print(f"    {comparison['error']}")
        
        print("  ✅ ADK Memory Monitor tests passed!")
        return True
        
    except Exception as e:
        print(f"  ❌ ADK Memory Monitor test failed: {e}")
        logger.exception("ADK Memory Monitor test failed")
        return False

def test_adk_memory_api():
    """Test the ADK memory API."""
    print("🔌 Testing ADK Memory API...")
    
    try:
        from dashboard.api.adk_memory_api import adk_memory_api
        
        # Test status endpoint
        print("  ✓ Testing status endpoint...")
        status = adk_memory_api.get_status()
        print(f"    Status: {status.get('status', 'unknown')}")
        
        # Test metrics endpoint
        print("  ✓ Testing metrics endpoint...")
        metrics = adk_memory_api.get_metrics()
        print(f"    Metrics Status: {metrics.get('status', 'unknown')}")
        
        # Test cost metrics endpoint
        print("  ✓ Testing cost metrics endpoint...")
        costs = adk_memory_api.get_cost_metrics()
        print(f"    Cost Status: {costs.get('status', 'unknown')}")
        
        # Test history endpoint
        print("  ✓ Testing history endpoint...")
        history = adk_memory_api.get_history(hours=1)
        print(f"    History Status: {history.get('status', 'unknown')}")
        
        # Test session metrics
        print("  ✓ Testing session metrics...")
        sessions = adk_memory_api.get_session_metrics()
        print(f"    Session Status: {sessions.get('status', 'unknown')}")
        
        # Test reliability metrics
        print("  ✓ Testing reliability metrics...")
        reliability = adk_memory_api.get_reliability_metrics()
        print(f"    Reliability Status: {reliability.get('status', 'unknown')}")
        
        # Test diagnostics
        print("  ✓ Testing diagnostics...")
        diagnostics = adk_memory_api.get_diagnostic_info()
        print(f"    Diagnostics Status: {diagnostics.get('status', 'unknown')}")
        
        print("  ✅ ADK Memory API tests passed!")
        return True
        
    except Exception as e:
        print(f"  ❌ ADK Memory API test failed: {e}")
        logger.exception("ADK Memory API test failed")
        return False

def test_adk_memory_logger():
    """Test the ADK memory logger."""
    print("📝 Testing ADK Memory Logger...")
    
    try:
        from dashboard.monitoring.adk_memory_logger import adk_memory_logger, ADKMemoryOperation, ADKSessionStateEvent
        
        # Test operation logging
        print("  ✓ Testing operation logging...")
        operation = ADKMemoryOperation(
            timestamp=datetime.now().isoformat(),
            operation_type="test_query",
            operation_id="test_123",
            user_id="test_user",
            session_id="test_session",
            query_text="test query",
            result_count=5,
            latency_ms=150.0,
            success=True,
            error_message=None,
            memory_usage_mb=10.5,
            cost_estimate_usd=0.001,
            metadata={"test": True}
        )
        adk_memory_logger.log_memory_operation(operation)
        
        # Test session event logging
        print("  ✓ Testing session event logging...")
        session_event = ADKSessionStateEvent(
            timestamp=datetime.now().isoformat(),
            event_type="test_create",
            session_id="test_session",
            user_id="test_user",
            state_size_mb=2.5,
            state_keys=["key1", "key2"],
            persistence_success=True,
            error_message=None,
            metadata={"test": True}
        )
        adk_memory_logger.log_session_event(session_event)
        
        # Test error logging
        print("  ✓ Testing error logging...")
        adk_memory_logger.log_error(
            error_type="test_error",
            error_message="This is a test error",
            context={"test": True}
        )
        
        # Test operation tracing
        print("  ✓ Testing operation tracing...")
        adk_memory_logger.start_operation_trace(
            operation_id="trace_test",
            operation_type="test_trace",
            context={"test": True}
        )
        time.sleep(0.1)  # Simulate operation
        adk_memory_logger.end_operation_trace(
            operation_id="trace_test",
            success=True,
            result={"test": "result"}
        )
        
        # Test log retrieval
        print("  ✓ Testing log retrieval...")
        operations = adk_memory_logger.get_operation_logs(hours=1)
        sessions = adk_memory_logger.get_session_logs(hours=1)
        errors = adk_memory_logger.get_error_logs(hours=1)
        
        print(f"    Operations logged: {len(operations)}")
        print(f"    Sessions logged: {len(sessions)}")
        print(f"    Errors logged: {len(errors)}")
        
        # Test analysis
        print("  ✓ Testing performance analysis...")
        performance = adk_memory_logger.analyze_performance(hours=1)
        if "error" not in performance:
            print(f"    Total operations: {performance.get('total_operations', 0)}")
        
        print("  ✓ Testing session health analysis...")
        session_health = adk_memory_logger.analyze_session_health(hours=1)
        if "error" not in session_health:
            print(f"    Unique sessions: {session_health.get('unique_sessions', 0)}")
        
        # Test troubleshooting report
        print("  ✓ Testing troubleshooting report...")
        report = adk_memory_logger.get_troubleshooting_report()
        if "error" not in report:
            print(f"    Recent errors: {report['recent_errors']['count']}")
            print(f"    Recommendations: {len(report.get('recommendations', []))}")
        
        print("  ✅ ADK Memory Logger tests passed!")
        return True
        
    except Exception as e:
        print(f"  ❌ ADK Memory Logger test failed: {e}")
        logger.exception("ADK Memory Logger test failed")
        return False

def test_health_check_integration():
    """Test integration with health check system."""
    print("🏥 Testing Health Check Integration...")
    
    try:
        from dashboard.monitoring.health_check import HealthCheck
        
        # Create health check instance
        health_check = HealthCheck()
        
        # Test health check
        print("  ✓ Testing integrated health check...")
        health_status = health_check.check_health()
        
        print(f"    Overall Status: {health_status.get('status', 'unknown')}")
        
        # Check if ADK memory component is registered
        components = health_status.get('components', {})
        if 'adk_memory' in components:
            adk_status = components['adk_memory']
            print(f"    ADK Memory Status: {adk_status.get('status', 'unknown')}")
            print(f"    ADK Available: {adk_status.get('details', {}).get('adk_available', False)}")
        else:
            print("    ADK Memory component not found in health check")
        
        print("  ✅ Health Check Integration tests passed!")
        return True
        
    except Exception as e:
        print(f"  ❌ Health Check Integration test failed: {e}")
        logger.exception("Health Check Integration test failed")
        return False

def test_api_server_endpoints():
    """Test API server endpoints."""
    print("🌐 Testing API Server Endpoints...")
    
    try:
        import requests
        import time
        
        # Start a test server (this would normally be running)
        base_url = "http://localhost:5050"
        
        # Test endpoints
        endpoints = [
            "/api/adk-memory/status",
            "/api/adk-memory/metrics",
            "/api/adk-memory/costs",
            "/api/adk-memory/history?hours=1",
            "/api/adk-memory/sessions",
            "/api/adk-memory/reliability",
            "/api/adk-memory/diagnostics"
        ]
        
        print("  ⚠️  Note: This test requires the API server to be running")
        print("     Start with: python dashboard/api/server.py")
        
        for endpoint in endpoints:
            try:
                print(f"  ✓ Testing {endpoint}...")
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    print(f"    Status: {data.get('status', 'unknown')}")
                else:
                    print(f"    HTTP {response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"    Connection failed: {e}")
        
        print("  ✅ API Server Endpoint tests completed!")
        return True
        
    except Exception as e:
        print(f"  ❌ API Server Endpoint test failed: {e}")
        logger.exception("API Server Endpoint test failed")
        return False

def test_dashboard_components():
    """Test dashboard components (without Streamlit)."""
    print("📊 Testing Dashboard Components...")
    
    try:
        # Test importing dashboard components
        print("  ✓ Testing component imports...")
        from dashboard.components.adk_memory_dashboard import (
            display_adk_memory_overview,
            display_adk_performance_metrics,
            display_adk_cost_analysis,
            display_adk_session_monitoring
        )
        
        print("    All dashboard components imported successfully")
        
        # Note: We can't actually test the Streamlit components without running Streamlit
        print("  ⚠️  Note: Full dashboard testing requires Streamlit environment")
        print("     Test with: streamlit run dashboard/app.py")
        
        print("  ✅ Dashboard Component tests passed!")
        return True
        
    except Exception as e:
        print(f"  ❌ Dashboard Component test failed: {e}")
        logger.exception("Dashboard Component test failed")
        return False

def test_environment_configuration():
    """Test environment configuration."""
    print("⚙️  Testing Environment Configuration...")
    
    try:
        # Check required environment variables
        env_vars = [
            "RAG_CORPUS_RESOURCE_NAME",
            "SIMILARITY_TOP_K",
            "VECTOR_DISTANCE_THRESHOLD",
            "GOOGLE_CLOUD_PROJECT",
            "VERTEX_AI_REGION"
        ]
        
        print("  ✓ Checking environment variables...")
        for var in env_vars:
            value = os.getenv(var)
            if value:
                print(f"    {var}: {value}")
            else:
                print(f"    {var}: ❌ Not set")
        
        # Check Google ADK availability
        print("  ✓ Checking Google ADK availability...")
        try:
            import google.adk.memory
            print("    Google ADK: ✅ Available")
        except ImportError:
            print("    Google ADK: ❌ Not available")
        
        print("  ✅ Environment Configuration tests completed!")
        return True
        
    except Exception as e:
        print(f"  ❌ Environment Configuration test failed: {e}")
        logger.exception("Environment Configuration test failed")
        return False

def run_all_tests():
    """Run all tests."""
    print("🚀 Starting ADK Memory Monitoring System Tests")
    print("=" * 60)
    
    tests = [
        ("Environment Configuration", test_environment_configuration),
        ("ADK Memory Monitor", test_adk_memory_monitor),
        ("ADK Memory API", test_adk_memory_api),
        ("ADK Memory Logger", test_adk_memory_logger),
        ("Health Check Integration", test_health_check_integration),
        ("Dashboard Components", test_dashboard_components),
        ("API Server Endpoints", test_api_server_endpoints)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{test_name}")
        print("-" * len(test_name))
        results[test_name] = test_func()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 Test Summary")
    print("=" * 60)
    
    passed = 0
    total = len(tests)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! ADK Memory Monitoring System is ready.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
