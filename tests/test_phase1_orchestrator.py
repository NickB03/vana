"""
Test suite for Phase 1: Orchestrator Pattern Validation

Tests basic orchestrator functionality, tool delegation, and ADK compliance.
"""

import pytest
import tempfile
import os
from pathlib import Path


class TestPhase1Orchestrator:
    """Test orchestrator basic functionality for Phase 1."""

    def test_orchestrator_import(self):
        """Test that orchestrator can be imported without errors."""
        from agents.vana.agent import root_agent
        
        assert root_agent is not None
        assert root_agent.name == "vana_orchestrator"
        assert root_agent.model == "gemini-2.5-flash"
    
    def test_orchestrator_has_tools(self):
        """Test that orchestrator has required tools loaded."""
        from agents.vana.agent import root_agent
        
        # Check that tools are available
        assert hasattr(root_agent, 'tools')
        assert len(root_agent.tools) > 0
        
        # Check specific tools are present (ADK auto-wraps functions)
        tool_names = []
        for tool in root_agent.tools:
            if hasattr(tool, 'name'):
                tool_names.append(tool.name)
            elif hasattr(tool, '__name__'):
                tool_names.append(tool.__name__)
            else:
                tool_names.append(str(tool))
        
        expected_tools = ['analyze_and_route', 'read_file', 'write_file']
        
        # Check that we have some form of these tools
        for expected_tool in expected_tools:
            found = any(expected_tool in tool_name for tool_name in tool_names)
            assert found, f"Missing tool related to: {expected_tool}. Available: {tool_names}"
    
    def test_orchestrator_tools_directly(self):
        """Test orchestrator tools can be called directly."""
        from agents.vana.agent import root_agent
        from lib._tools import adk_read_file, adk_write_file
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            test_content = "Test content for orchestrator validation"
            f.write(test_content)
            temp_path = f.name
        
        try:
            # Test that the tools work directly (ADK style)
            read_result = adk_read_file.func(temp_path)
            
            # The result should contain our test content
            assert test_content in read_result, f"Expected content not found in: {read_result}"
            
            # Test write functionality
            new_content = "New test content"
            write_result = adk_write_file.func(temp_path, new_content)
            assert "successfully" in write_result.lower() or "written" in write_result.lower()
            
            # Verify the write worked
            verify_result = adk_read_file.func(temp_path)
            assert new_content in verify_result
            
        finally:
            # Clean up
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_orchestrator_tools_handle_errors(self):
        """Test orchestrator tools handle errors gracefully."""
        from lib._tools import adk_read_file
        
        # Try to read a non-existent file
        result = adk_read_file.func("/tmp/definitely_does_not_exist_12345.txt")
        
        # Should handle error without crashing
        assert result is not None
        assert len(result) > 0
        # Should contain some indication of error or inability to find file
        assert any(word in result.lower() for word in ['error', 'not found', 'does not exist', 'cannot', 'unable'])
    
    def test_orchestrator_analysis_tool(self):
        """Test orchestrator analysis tool works."""
        from lib._tools import adk_analyze_task
        
        # Test task analysis tool directly
        result = adk_analyze_task.func("analyze security vulnerabilities", "test context")
        
        # Should get a response
        assert result is not None
        assert len(result) > 10  # Should be more than trivial response
        
        # Should contain task-related keywords
        assert any(word in result.lower() for word in ['task', 'analysis', 'security'])
    
    def test_orchestrator_has_sub_agents(self):
        """Test orchestrator has sub-agents configured."""
        from agents.vana.agent import root_agent
        
        # Check that sub-agents are configured
        assert hasattr(root_agent, 'sub_agents')
        assert len(root_agent.sub_agents) > 0
        
        # Check that test specialist is available
        sub_agent_names = [agent.name for agent in root_agent.sub_agents]
        assert 'test_specialist' in sub_agent_names
    
    def test_sub_agent_can_be_accessed(self):
        """Test that sub-agents can be accessed and used directly."""
        from agents.test_specialist import test_specialist
        
        # Test that the test specialist exists and has correct attributes
        assert test_specialist is not None
        assert test_specialist.name == "test_specialist"
        assert test_specialist.model == "gemini-2.5-flash"
        assert "test specialist" in test_specialist.description.lower()
    
    def test_routing_functions_exist(self):
        """Test that routing functions are available."""
        # Note: Pure delegation pattern doesn't expose routing functions
        # ADK handles routing internally via sub_agents
        pytest.skip("Routing functions not exposed in pure delegation pattern")
        return
    
    def test_route_to_specialist_basic(self):
        """Test basic routing functionality."""
        # Note: Pure delegation pattern doesn't expose routing functions
        pytest.skip("Routing functions not exposed in pure delegation pattern")
    
    def test_routing_handles_no_specialists(self):
        """Test that routing handles the case when specialists aren't available."""
        # Note: Pure delegation pattern doesn't expose routing functions
        pytest.skip("Routing functions not exposed in pure delegation pattern")
    
    def test_cache_operations(self):
        """Test orchestrator cache basic operations."""
        # Note: Pure delegation pattern doesn't expose internal cache directly
        # Using the shared orchestrator cache instead
        from lib._shared_libraries.orchestrator_cache import orchestrator_cache
        
        # Test cache set and get
        test_key = "test_key_phase1"
        test_value = "test_value_phase1"
        
        orchestrator_cache.set(test_key, test_value)
        cached_value = orchestrator_cache.get(test_key)
        
        assert cached_value == test_value
        
        # Test cache miss
        missing_value = orchestrator_cache.get("nonexistent_key")
        assert missing_value is None
    
    def test_cache_stats(self):
        """Test orchestrator cache statistics."""
        # Note: Pure delegation pattern doesn't expose internal cache directly
        # Using the shared orchestrator cache instead
        from lib._shared_libraries.orchestrator_cache import orchestrator_cache
        
        # Test stats functionality
        stats = orchestrator_cache.get_stats()
        assert "hits" in stats
        assert "misses" in stats
        assert "size" in stats
        assert "hit_rate" in stats
        
        # Stats should be numbers
        assert isinstance(stats["hits"], int)
        assert isinstance(stats["misses"], int)
        assert isinstance(stats["size"], int)
        assert isinstance(stats["hit_rate"], (int, float))
    
    def test_metrics_stats_function(self):
        """Test orchestrator stats function works."""
        # Note: Pure delegation pattern doesn't expose stats function directly
        # Need to mock or skip this test
        pytest.skip("get_orchestrator_stats not exposed in pure delegation pattern")


# Integration tests (marked separately)
class TestPhase1Integration:
    """Integration tests for orchestrator functionality."""
    
    @pytest.mark.integration
    def test_orchestrator_routing_logic(self):
        """Test orchestrator routing decisions."""
        # Note: Pure delegation pattern doesn't expose routing functions
        pytest.skip("Routing functions not exposed in pure delegation pattern")
    
    @pytest.mark.integration  
    def test_cache_functionality(self):
        """Test orchestrator caching works."""
        # Note: Pure delegation pattern doesn't expose internal cache directly
        # Using the shared orchestrator cache instead
        from lib._shared_libraries.orchestrator_cache import orchestrator_cache
        
        # Test cache operations
        test_key = "test_key_phase1"
        test_value = "test_value_phase1"
        
        # Set and get
        orchestrator_cache.set(test_key, test_value)
        cached_value = orchestrator_cache.get(test_key)
        
        assert cached_value == test_value
        
        # Test cache stats
        stats = orchestrator_cache.get_stats()
        assert "hits" in stats
        assert "misses" in stats
        assert stats["hits"] >= 1  # Should have at least one hit from our get


if __name__ == "__main__":
    pytest.main([__file__, "-v"])