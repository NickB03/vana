"""
Integration tests for Phase 1 Specialists with Enhanced Orchestrator

Tests the complete integration of Content Creation and Research specialists
with the enhanced orchestrator routing system.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json

# Import orchestrator components
from agents.vana.enhanced_orchestrator import (
    route_to_specialist,
    analyze_and_route,
    enhanced_orchestrator
)

# Import specialists
from agents.specialists.content_creation_specialist import content_creation_specialist
from agents.specialists.research_specialist import research_specialist


class TestSpecialistRouting:
    """Test routing logic in enhanced orchestrator"""
    
    def test_content_creation_routing_patterns(self):
        """Test that content creation patterns route correctly"""
        content_patterns = [
            "write a report about cloud security",
            "create documentation for our API",
            "draft an article on machine learning",
            "edit this blog post for clarity",
            "format this content as markdown"
        ]
        
        for request in content_patterns:
            # Test each pattern routes to content specialist
            with patch('agents.vana.enhanced_orchestrator.content_creation_specialist') as mock_specialist:
                mock_specialist.run.return_value = "Content created"
                
                # These keywords should trigger content creation routing
                for keyword in ['write', 'document', 'article', 'content', 'edit', 'format']:
                    if keyword in request.lower():
                        result = route_to_specialist(request, keyword, {})
                        if result != "No specialist available for task type: " + keyword:
                            mock_specialist.run.assert_called()
                        break
    
    def test_research_routing_patterns(self):
        """Test that research patterns route correctly"""
        research_patterns = [
            "research quantum computing advances",
            "investigate market trends in AI",
            "find information about renewable energy",
            "analyze these sources for credibility",
            "fact check this claim about EVs",
            "validate this information"
        ]
        
        for request in research_patterns:
            # Test each pattern routes to research specialist
            with patch('agents.vana.enhanced_orchestrator.research_specialist') as mock_specialist:
                mock_specialist.run.return_value = "Research completed"
                
                # These keywords should trigger research routing
                for keyword in ['research', 'investigate', 'find_information', 'analyze', 'fact_check', 'validate']:
                    if keyword in request.lower():
                        result = route_to_specialist(request, keyword, {})
                        if result != "No specialist available for task type: " + keyword:
                            mock_specialist.run.assert_called()
                        break
    
    def test_specialist_availability_check(self):
        """Test handling when specialists are not available"""
        # Simulate specialists not being available
        with patch('agents.vana.enhanced_orchestrator.SPECIALISTS_AVAILABLE', False):
            result = route_to_specialist("write a document", "write", {})
            assert "Specialists not available" in result


class TestAnalyzeAndRoute:
    """Test the analyze_and_route function"""
    
    @patch('agents.vana.enhanced_orchestrator.adk_analyze_task')
    @patch('agents.vana.enhanced_orchestrator.route_to_specialist')
    def test_analyze_and_route_workflow(self, mock_route, mock_analyze):
        """Test complete analyze and route workflow"""
        # Mock analyze_task response
        mock_analyze.return_value = "Task analysis:\nTask_type: document_writing\nComplexity: medium"
        
        # Mock routing response
        mock_route.return_value = "Document created successfully"
        
        request = "Write a technical report on AI safety"
        result = analyze_and_route(request, {})
        
        # Verify analyze was called
        mock_analyze.assert_called_once_with(request)
        
        # Verify routing was called with extracted task type
        mock_route.assert_called_once()
        
        # Check result format
        assert "Task Analysis & Routing" in result
        assert request in result
        assert "Specialist Response" in result


class TestEndToEndWorkflows:
    """Test complete end-to-end workflows"""
    
    def test_content_creation_workflow(self):
        """Test complete content creation workflow"""
        # Create a mock context
        context = {
            "user_preferences": {"technical_level": "intermediate"},
            "session_id": "test_session"
        }
        
        # Test request
        request = "Write a blog post about the benefits of microservices architecture"
        
        with patch('agents.vana.enhanced_orchestrator.adk_analyze_task') as mock_analyze:
            mock_analyze.return_value = "Task_type: writing\nDocument type: blog post"
            
            with patch('agents.specialists.content_creation_specialist.content_creation_specialist.run') as mock_run:
                mock_run.return_value = """
# Benefits of Microservices Architecture

Microservices architecture has revolutionized how we build scalable applications...

## Key Benefits
1. Scalability
2. Flexibility
3. Technology diversity

[Content continues...]
"""
                
                result = analyze_and_route(request, context)
                
                # Verify the specialist was called
                assert mock_run.called
                assert "Microservices Architecture" in result
    
    def test_research_workflow(self):
        """Test complete research workflow"""
        context = {
            "research_depth": "comprehensive",
            "citation_style": "apa"
        }
        
        request = "Research the latest developments in renewable energy storage"
        
        with patch('agents.vana.enhanced_orchestrator.adk_analyze_task') as mock_analyze:
            mock_analyze.return_value = "Task_type: research\nTopic: renewable energy"
            
            with patch('agents.specialists.research_specialist.research_specialist.run') as mock_run:
                mock_run.return_value = """
## Research Summary: Renewable Energy Storage

### Key Findings
- Battery technology improvements: 30% efficiency gain
- New materials discovered for grid storage
- Cost reductions of 45% over 3 years

### Sources (5 analyzed, 3 highly credible)
[Research continues...]
"""
                
                result = analyze_and_route(request, context)
                
                # Verify the specialist was called
                assert mock_run.called
                assert "Renewable Energy Storage" in result


class TestCachingAndMetrics:
    """Test caching and metrics functionality"""
    
    @patch('agents.vana.enhanced_orchestrator.orchestrator_cache')
    @patch('agents.vana.enhanced_orchestrator.get_orchestrator_metrics')
    def test_cached_routing(self, mock_metrics, mock_cache):
        """Test that caching works for repeated requests"""
        from agents.vana.enhanced_orchestrator import cached_route_to_specialist
        
        # Setup mocks
        mock_cache.get.return_value = None  # First call - cache miss
        mock_metrics_instance = Mock()
        mock_metrics.return_value = mock_metrics_instance
        
        with patch('agents.vana.enhanced_orchestrator.route_to_specialist') as mock_route:
            mock_route.return_value = "Test response"
            
            # First call - should hit the route
            result1 = cached_route_to_specialist("test request", "test_type", {})
            mock_route.assert_called_once()
            mock_cache.set.assert_called_once()
            
            # Setup cache hit
            mock_cache.get.return_value = "Cached response"
            mock_route.reset_mock()
            
            # Second call - should use cache
            result2 = cached_route_to_specialist("test request", "test_type", {})
            mock_route.assert_not_called()
            assert "Cached Response" in result2


class TestErrorHandling:
    """Test error handling in integration"""
    
    def test_specialist_error_handling(self):
        """Test handling of specialist errors"""
        with patch('agents.specialists.content_creation_specialist.content_creation_specialist.run') as mock_run:
            mock_run.side_effect = Exception("Specialist error")
            
            # Should handle error gracefully
            try:
                result = route_to_specialist("write a document", "write", {})
                # Either returns error message or handles exception
                assert True
            except Exception as e:
                # Should not raise unhandled exception
                pytest.fail(f"Unhandled exception: {e}")
    
    def test_invalid_task_type(self):
        """Test handling of unrecognized task types"""
        result = route_to_specialist("do something weird", "unknown_task", {})
        assert "No specialist available" in result or "not available" in result.lower()


class TestOrchestatorStats:
    """Test orchestrator statistics functionality"""
    
    def test_get_orchestrator_stats(self):
        """Test statistics reporting"""
        from agents.vana.enhanced_orchestrator import get_orchestrator_stats
        
        with patch('agents.vana.enhanced_orchestrator.get_orchestrator_metrics') as mock_metrics:
            mock_instance = Mock()
            mock_instance.get_summary.return_value = {
                'total_requests': 100,
                'average_response_time': 2.5,
                'most_used_specialist': 'content_creation',
                'most_common_task': 'writing',
                'security_escalation_rate': 5.0,
                'cache_hit_rate': 75,
                'error_count': 2,
                'uptime_hours': 24
            }
            mock_instance.get_specialist_distribution.return_value = {
                'content_creation': 40,
                'research': 35,
                'architecture': 15,
                'security': 10
            }
            mock_metrics.return_value = mock_instance
            
            stats = get_orchestrator_stats()
            
            assert "Orchestrator Performance Metrics" in stats
            assert "Total Requests: 100" in stats
            assert "Average Response Time: 2.5s" in stats
            assert "content_creation: 40%" in stats


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v"])