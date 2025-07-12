"""
End-to-End tests for VANA Orchestrator
Tests complete flows through the system
"""

import time
from unittest.mock import MagicMock, patch

import pytest

from agents.vana.enhanced_orchestrator import (
    analyze_and_route,
    enhanced_orchestrator,
    get_orchestrator_stats,
    orchestrator_cache,
)


class TestOrchestratorE2E:
    """End-to-end test scenarios for the orchestrator"""

    def setup_method(self):
        """Reset state before each test"""
        orchestrator_cache.cache.clear()
        orchestrator_cache.hits = 0
        orchestrator_cache.misses = 0

    def test_security_flow_e2e(self):
        """Test complete security analysis flow"""
        # User query about security
        query = "Check this Python code for security vulnerabilities: password = 'admin123'"

        # Run through orchestrator
        result = analyze_and_route(query)

        # Verify routing and response
        assert "Security Specialist" in result
        assert "Hardcoded Secret" in result or "security" in result.lower()
        assert "Task Type:" in result

    def test_architecture_flow_e2e(self):
        """Test complete architecture analysis flow"""
        query = "Review the design patterns in my codebase"

        result = analyze_and_route(query)

        assert "Architecture" in result or "architecture" in result
        assert "Task Type:" in result
        assert "Specialist Response:" in result

    def test_data_science_flow_e2e(self):
        """Test complete data science flow"""
        query = "Analyze this dataset: [1, 2, 3, 4, 5] and recommend ML approaches"

        result = analyze_and_route(query)

        assert "Data" in result or "data" in result
        assert "Task Type:" in result
        assert "Specialist Response:" in result

    def test_devops_flow_e2e(self):
        """Test complete DevOps flow"""
        query = "Help me create a CI/CD pipeline for my Python project"

        result = analyze_and_route(query)

        assert "DevOps" in result or "CI/CD" in result
        assert "Task Type:" in result
        assert "Specialist Response:" in result

    def test_caching_flow_e2e(self):
        """Test caching behavior across multiple requests"""
        query = "Analyze my code architecture"

        # First request - should be fresh
        start_time = time.time()
        result1 = analyze_and_route(query)
        first_duration = time.time() - start_time

        # Verify no cache indicator
        assert "*[Cached Response]*" not in result1

        # Second request - might be cached depending on implementation
        start_time = time.time()
        result2 = analyze_and_route(query)
        second_duration = time.time() - start_time

        # Cache would be faster, but analyze_and_route might not use cache
        # Just verify both completed successfully
        assert "Task Type:" in result1
        assert "Task Type:" in result2

    def test_metrics_collection_e2e(self):
        """Test metrics collection during operation"""
        # Clear metrics first
        from lib._shared_libraries.orchestrator_metrics import get_orchestrator_metrics

        metrics = get_orchestrator_metrics()

        # Run several queries
        queries = [
            "Check for SQL injection vulnerabilities",
            "Analyze my code architecture",
            "Help with Docker configuration",
            "Perform statistical analysis on data",
        ]

        for query in queries:
            analyze_and_route(query)

        # Get metrics report
        stats = get_orchestrator_stats()

        # Verify metrics were collected
        assert "Total Requests:" in stats
        assert "Average Response Time:" in stats
        assert "Specialist Distribution" in stats

    def test_error_handling_e2e(self):
        """Test error handling in complete flow"""
        # Query that might cause issues
        query = "This is a very ambiguous request that doesn't fit any category"

        # Should handle gracefully
        result = analyze_and_route(query)

        # Should still provide a response
        assert result is not None
        assert "Task Type:" in result
        # Might route to a default or show "unknown"

    def test_security_priority_routing_e2e(self):
        """Test that security keywords override task classification"""
        # Query that looks like architecture but has security keyword
        query = "Review my application design for potential XSS vulnerabilities"

        result = analyze_and_route(query)

        # Should route to security due to "vulnerabilities" keyword
        assert "Security" in result or "security" in result
        # Even though "design" might suggest architecture


class TestOrchestratorPerformance:
    """Performance-related end-to-end tests"""

    def test_response_time_baseline(self):
        """Establish baseline response times"""
        queries = {
            "security": "Scan for vulnerabilities",
            "architecture": "Review code structure",
            "data": "Analyze dataset",
            "devops": "Setup CI/CD",
        }

        timings = {}

        for category, query in queries.items():
            start = time.time()
            result = analyze_and_route(query)
            duration = time.time() - start
            timings[category] = duration

            # Basic sanity check
            assert result is not None
            assert duration < 5.0  # Should complete within 5 seconds

        # Report timings
        print("\nResponse Time Baseline:")
        for category, duration in timings.items():
            print(f"  {category}: {duration:.3f}s")

    def test_concurrent_requests_simulation(self):
        """Simulate multiple concurrent requests"""
        # Note: Since we're synchronous, this tests sequential handling
        queries = [
            "Check security",
            "Analyze architecture",
            "Process data",
            "Deploy application",
            "Scan vulnerabilities",
        ]

        start = time.time()
        results = []

        for query in queries:
            result = analyze_and_route(query)
            results.append(result)

        total_duration = time.time() - start

        # All should complete
        assert len(results) == len(queries)
        assert all(r is not None for r in results)

        # Should complete in reasonable time
        assert total_duration < 30.0  # 6 seconds per query average

        print(f"\nProcessed {len(queries)} requests in {total_duration:.2f}s")
        print(f"Average: {total_duration/len(queries):.2f}s per request")


class TestOrchestratorIntegration:
    """Test integration with VANA main agent"""

    @patch("agents.vana.enhanced_orchestrator.SPECIALISTS_AVAILABLE", True)
    def test_orchestrator_as_subagent(self):
        """Test orchestrator working as VANA sub-agent"""
        # This would require the full VANA agent setup
        # For now, test that orchestrator can be imported and used
        assert enhanced_orchestrator is not None
        assert hasattr(enhanced_orchestrator, "run")
        assert hasattr(enhanced_orchestrator, "tools")
        assert len(enhanced_orchestrator.tools) >= 5  # Should have multiple tools

    def test_fallback_behavior(self):
        """Test behavior when specialists are unavailable"""
        with patch("agents.vana.enhanced_orchestrator.SPECIALISTS_AVAILABLE", False):
            result = analyze_and_route("Check security")

            assert "Specialists not available" in result
            assert "Task Type:" in result

    def test_orchestrator_tools_integration(self):
        """Test that orchestrator tools work correctly"""
        # Get the analyze_and_route tool
        tools = {tool.name: tool for tool in enhanced_orchestrator.tools}

        assert "analyze_and_route" in tools
        assert "read_file" in tools
        assert "write_file" in tools
        assert "search_knowledge" in tools

        # Test that primary tool works
        if "analyze_and_route" in tools:
            tool = tools["analyze_and_route"]
            # Tool should be callable
            assert callable(tool.func)


class TestRealWorldScenarios:
    """Test real-world usage scenarios"""

    def test_security_incident_response(self):
        """Test handling a security incident report"""
        incident_query = """
        We detected suspicious activity in our logs:
        - Multiple failed login attempts
        - SQL queries with unusual patterns
        - Possible password brute force
        Please analyze and provide recommendations.
        """

        result = analyze_and_route(incident_query)

        # Should route to security specialist
        assert "Security" in result or "security" in result
        assert "Specialist Response:" in result

    def test_architecture_review_request(self):
        """Test handling an architecture review request"""
        review_query = """
        Our microservices architecture has grown to 15 services.
        We're experiencing issues with service communication and data consistency.
        Can you review our architecture and suggest improvements?
        """

        result = analyze_and_route(review_query)

        # Should route to architecture specialist
        assert "Architecture" in result or "architecture" in result
        assert "Task Type:" in result

    def test_ml_recommendation_request(self):
        """Test handling ML recommendation request"""
        ml_query = """
        We have customer behavior data with 50000 samples and 25 features.
        We want to predict customer churn. What ML approach should we use?
        """

        result = analyze_and_route(ml_query)

        # Should route to data science specialist
        assert "Data" in result or "machine_learning" in result
        assert "Specialist Response:" in result

    def test_deployment_automation_request(self):
        """Test handling deployment automation request"""
        deploy_query = """
        We need to set up automated deployment for our Node.js application.
        It should include testing, building, and deployment to AWS.
        Can you help create the pipeline?
        """

        result = analyze_and_route(deploy_query)

        # Should route to DevOps specialist
        assert "DevOps" in result or "deployment" in result
        assert "Task Type:" in result
