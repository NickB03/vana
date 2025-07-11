"""
Integration tests for Enhanced VANA Orchestrator
Tests Phase 3 specialist routing and coordination
"""

import pytest
from unittest.mock import Mock, patch
from agents.vana.enhanced_orchestrator import (
    enhanced_orchestrator,
    route_to_specialist,
    analyze_and_route,
    orchestrator_cache,
    cached_route_to_specialist
)


class TestEnhancedOrchestrator:
    """Test suite for enhanced orchestrator functionality"""
    
    def test_security_elevated_routing(self):
        """Test that security queries get priority routing"""
        # Test various security-related queries
        security_queries = [
            "Check for SQL injection vulnerabilities",
            "Is this password storage secure?",
            "Scan for XSS attacks in this code",
            "Review authentication implementation",
            "Find security vulnerabilities"
        ]
        
        for query in security_queries:
            with patch('agents.vana.enhanced_orchestrator.security_specialist') as mock_specialist:
                mock_specialist.run.return_value = "Security analysis complete"
                
                result = route_to_specialist(query, "general_task")
                
                # Should route to security specialist despite task_type
                mock_specialist.run.assert_called_once()
                assert "Security analysis complete" in result
    
    def test_standard_routing(self):
        """Test standard routing based on task type"""
        routing_tests = [
            ("architecture_review", "Review my code architecture"),
            ("data_analysis", "Analyze this dataset"),
            ("deployment", "Help with Docker setup"),
            ("ci_cd", "Create GitHub Actions workflow")
        ]
        
        for task_type, request in routing_tests:
            result = route_to_specialist(request, task_type)
            # Should not error out
            assert result is not None
            assert "not available" not in result or not SPECIALISTS_AVAILABLE
    
    def test_analyze_and_route_integration(self):
        """Test the full analyze and route pipeline"""
        with patch('agents.vana.enhanced_orchestrator.adk_analyze_task') as mock_analyze:
            mock_analyze.return_value = """Task Analysis:
            Task Type: security_scan
            Complexity: High
            Domain: Security"""
            
            result = analyze_and_route("Scan my code for vulnerabilities")
            
            # Should extract task type and route appropriately
            assert "Task Type: security_scan" in result
            assert "Security Specialist" in result
    
    def test_cache_functionality(self):
        """Test the simple caching mechanism"""
        # Clear cache first
        orchestrator_cache.cache.clear()
        orchestrator_cache.hits = 0
        orchestrator_cache.misses = 0
        
        # First call - cache miss
        request = "Test security scan"
        task_type = "security_scan"
        
        with patch('agents.vana.enhanced_orchestrator.route_to_specialist') as mock_route:
            mock_route.return_value = "Security scan results"
            
            result1 = cached_route_to_specialist(request, task_type)
            assert orchestrator_cache.misses == 1
            assert orchestrator_cache.hits == 0
            
            # Second call - cache hit
            result2 = cached_route_to_specialist(request, task_type)
            assert orchestrator_cache.hits == 1
            assert "*[Cached Response]*" in result2
    
    def test_cache_stats(self):
        """Test cache statistics tracking"""
        orchestrator_cache.cache.clear()
        orchestrator_cache.hits = 5
        orchestrator_cache.misses = 5
        
        stats = orchestrator_cache.get_stats()
        assert stats["hits"] == 5
        assert stats["misses"] == 5
        assert stats["hit_rate"] == 50.0
    
    def test_orchestrator_tools(self):
        """Test that orchestrator has correct tools configured"""
        tool_names = [tool.name for tool in enhanced_orchestrator.tools]
        
        # Should have core routing and file tools
        assert "analyze_and_route" in tool_names
        assert "read_file" in tool_names
        assert "write_file" in tool_names
        assert "list_directory" in tool_names
        assert "search_knowledge" in tool_names
    
    def test_fallback_behavior(self):
        """Test behavior when specialists are not available"""
        with patch('agents.vana.enhanced_orchestrator.SPECIALISTS_AVAILABLE', False):
            result = route_to_specialist("Test request", "any_type")
            assert "Specialists not available" in result
    
    def test_unknown_task_type(self):
        """Test routing with unknown task type"""
        result = route_to_specialist("Random request", "unknown_task_type")
        assert "No specialist available" in result or "Specialists not available" in result


class TestSpecialistIntegration:
    """Test integration between orchestrator and individual specialists"""
    
    @pytest.mark.skipif(not SPECIALISTS_AVAILABLE, reason="Specialists not available")
    def test_architecture_specialist_integration(self):
        """Test architecture specialist routing"""
        result = route_to_specialist(
            "Review the design patterns in my code",
            "architecture_review"
        )
        # Should get a response (not checking specific content)
        assert result is not None
        assert len(result) > 0
    
    @pytest.mark.skipif(not SPECIALISTS_AVAILABLE, reason="Specialists not available") 
    def test_data_science_specialist_integration(self):
        """Test data science specialist routing"""
        result = route_to_specialist(
            "Analyze this data for patterns",
            "data_analysis"
        )
        assert result is not None
        assert len(result) > 0
    
    @pytest.mark.skipif(not SPECIALISTS_AVAILABLE, reason="Specialists not available")
    def test_security_specialist_integration(self):
        """Test security specialist routing"""
        result = route_to_specialist(
            "Check for security vulnerabilities",
            "security_scan"
        )
        assert result is not None
        assert len(result) > 0
    
    @pytest.mark.skipif(not SPECIALISTS_AVAILABLE, reason="Specialists not available")
    def test_devops_specialist_integration(self):
        """Test DevOps specialist routing"""
        result = route_to_specialist(
            "Help me set up CI/CD",
            "ci_cd"
        )
        assert result is not None
        assert len(result) > 0


# Import guard for test discovery
try:
    from agents.vana.enhanced_orchestrator import SPECIALISTS_AVAILABLE
except ImportError:
    SPECIALISTS_AVAILABLE = False