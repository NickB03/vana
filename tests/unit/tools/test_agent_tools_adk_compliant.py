"""
Tests for ADK-compliant agent_tools implementation
"""

import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

# Add the project root to the path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from google.adk.tools import FunctionTool
from google.adk.tools.agent_tool import AgentTool
from lib._tools.agent_tools import (
    create_specialist_agent_tool,
    create_specialist_tools,
)


class TestAgentToolsADKCompliant:
    """Test the new ADK-compliant agent tools implementation"""
    
    def setup_method(self):
        """Setup for each test method"""
        # Create mock specialist agents
        self.mock_security_agent = Mock()
        self.mock_security_agent.name = "security_specialist"
        self.mock_security_agent.description = "Security analysis specialist"
        
        self.mock_architecture_agent = Mock()
        self.mock_architecture_agent.name = "architecture_specialist"
        self.mock_architecture_agent.description = "Architecture design specialist"
        
    def test_create_specialist_agent_tool(self):
        """Test creating a single specialist agent tool"""
        # Create an agent tool
        tool = create_specialist_agent_tool(self.mock_security_agent)
        
        # Verify it's an ADK AgentTool
        assert isinstance(tool, AgentTool)
        assert tool.name == "security_specialist"
        
    def test_create_specialist_agent_tool_with_overrides(self):
        """Test creating agent tool with name and description overrides"""
        tool = create_specialist_agent_tool(
            self.mock_security_agent,
            name="custom_security",
            description="Custom security tool"
        )
        
        assert isinstance(tool, AgentTool)
        assert tool.name == "custom_security"
        assert hasattr(tool, "_description")
        assert tool._description == "Custom security tool"
        
    def test_create_specialist_tools_legacy_mode(self):
        """Test creating tools in legacy mode (default)"""
        # Ensure we're in legacy mode
        os.environ["USE_OFFICIAL_AGENT_TOOL"] = "false"
        
        agents = [self.mock_security_agent, self.mock_architecture_agent]
        tools = create_specialist_tools(agents)
        
        # In legacy mode, we get FunctionTools
        assert len(tools) == 6  # We create 6 legacy tools
        for tool in tools:
            assert isinstance(tool, FunctionTool)
            
    def test_create_specialist_tools_adk_mode(self):
        """Test creating tools in ADK mode"""
        # Enable ADK mode
        os.environ["USE_OFFICIAL_AGENT_TOOL"] = "true"
        
        agents = [self.mock_security_agent, self.mock_architecture_agent]
        tools = create_specialist_tools(agents)
        
        # In ADK mode, we get AgentTools
        assert len(tools) == 2
        for tool in tools:
            assert isinstance(tool, AgentTool)
            
        # Clean up
        os.environ["USE_OFFICIAL_AGENT_TOOL"] = "false"
        
    def test_agent_tool_methods(self):
        """Test that ADK AgentTool has expected methods"""
        tool = create_specialist_agent_tool(self.mock_security_agent)
        
        # Check ADK AgentTool methods
        assert hasattr(tool, "run_async")
        assert hasattr(tool, "process_llm_request")
        assert hasattr(tool, "is_long_running")
        assert hasattr(tool, "populate_name")
        
    def test_backward_compatibility_warnings(self):
        """Test that legacy functions emit deprecation warnings"""
        from lib._tools.agent_tools import (
            get_adk_architecture_tool,
            get_adk_ui_tool,
            initialize_agent_tools
        )
        
        # Test deprecation warnings
        with patch('lib._tools.agent_tools.logger.warning') as mock_warn:
            get_adk_architecture_tool()
            mock_warn.assert_called_with(
                "get_adk_architecture_tool is deprecated. Use create_specialist_tools instead."
            )
            
        with patch('lib._tools.agent_tools.logger.warning') as mock_warn:
            get_adk_ui_tool()
            mock_warn.assert_called_with(
                "get_adk_ui_tool is deprecated. Use create_specialist_tools instead."
            )
            
        with patch('lib._tools.agent_tools.logger.warning') as mock_warn:
            initialize_agent_tools()
            mock_warn.assert_called_with(
                "initialize_agent_tools is deprecated. Tools are created on demand now."
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])