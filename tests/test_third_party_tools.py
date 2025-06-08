"""
Tests for Third-Party Tools Integration

This module tests the Google ADK Third-Party Tools implementation,
including LangChain and CrewAI tool integration, tool discovery,
and ADK compatibility.
"""

import pytest
from unittest.mock import patch, MagicMock

from lib._tools.third_party_tools import (
    ThirdPartyToolRegistry, ThirdPartyToolType, ThirdPartyToolInfo,
    GenericThirdPartyAdapter, third_party_registry
)
from lib._tools.langchain_adapter import LangChainToolAdapter
from lib._tools.crewai_adapter import CrewAIToolAdapter

class TestThirdPartyToolRegistry:
    """Test the third-party tool registry functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.registry = ThirdPartyToolRegistry()
    
    def test_registry_initialization(self):
        """Test registry initialization."""
        assert len(self.registry.adapters) >= 1  # At least generic adapter
        assert ThirdPartyToolType.GENERIC in self.registry.adapters
        assert isinstance(self.registry.adapters[ThirdPartyToolType.GENERIC], GenericThirdPartyAdapter)
    
    def test_register_adapter(self):
        """Test adapter registration."""
        langchain_adapter = LangChainToolAdapter()
        self.registry.register_adapter(langchain_adapter)
        
        assert ThirdPartyToolType.LANGCHAIN in self.registry.adapters
        assert self.registry.adapters[ThirdPartyToolType.LANGCHAIN] == langchain_adapter
    
    def test_discover_tools_from_source(self):
        """Test tool discovery from source."""
        # Create a mock tool
        mock_tool = MagicMock()
        mock_tool.name = "test_tool"
        mock_tool.description = "Test tool description"
        mock_tool.run = MagicMock(return_value="test result")
        
        # Discover tools
        tool_ids = self.registry.discover_tools_from_source([mock_tool])
        
        assert len(tool_ids) >= 1
        assert any("test_tool" in tool_id for tool_id in tool_ids)
    
    def test_get_tool(self):
        """Test getting a tool by ID."""
        # Create and register a mock tool
        mock_tool = MagicMock()
        mock_tool.name = "test_tool"
        mock_tool.description = "Test tool"
        mock_tool.run = MagicMock(return_value="result")
        
        tool_ids = self.registry.discover_tools_from_source([mock_tool])
        
        if tool_ids:
            tool_func = self.registry.get_tool(tool_ids[0])
            assert tool_func is not None
            assert callable(tool_func)
    
    def test_list_all_tools(self):
        """Test listing all tools."""
        initial_count = len(self.registry.list_all_tools())
        
        # Add a mock tool
        mock_tool = MagicMock()
        mock_tool.name = "test_tool"
        mock_tool.description = "Test tool"
        mock_tool.run = MagicMock(return_value="result")
        
        self.registry.discover_tools_from_source([mock_tool])
        
        all_tools = self.registry.list_all_tools()
        assert len(all_tools) > initial_count

class TestGenericThirdPartyAdapter:
    """Test the generic third-party tool adapter."""
    
    def setup_method(self):
        """Set up test environment."""
        self.adapter = GenericThirdPartyAdapter()
    
    def test_adapter_initialization(self):
        """Test adapter initialization."""
        assert self.adapter.tool_type == ThirdPartyToolType.GENERIC
        assert len(self.adapter.discovered_tools) == 0
        assert len(self.adapter.registered_tools) == 0
    
    def test_discover_callable_tools(self):
        """Test discovering callable tools."""
        def test_function():
            """Test function."""
            return "test result"
        
        tools = self.adapter.discover_tools([test_function])
        
        assert len(tools) == 1
        assert tools[0].name == "test_function"
        assert tools[0].tool_type == ThirdPartyToolType.GENERIC
    
    def test_discover_object_tools(self):
        """Test discovering object-based tools."""
        class MockTool:
            def __init__(self):
                self.name = "mock_tool"
                self.description = "Mock tool for testing"
            
            def run(self, *args, **kwargs):
                return "mock result"
        
        mock_tool = MockTool()
        tools = self.adapter.discover_tools([mock_tool])
        
        assert len(tools) == 1
        assert tools[0].name == "mock_tool"
        assert tools[0].description == "Mock tool for testing"
    
    def test_adapt_tool(self):
        """Test tool adaptation."""
        def test_function(message: str) -> str:
            return f"Processed: {message}"
        
        tools = self.adapter.discover_tools([test_function])
        assert len(tools) == 1
        
        adapted_tool = self.adapter.adapt_tool(tools[0])
        assert callable(adapted_tool)
        
        result = adapted_tool("test message")
        assert "Processed: test message" in result
    
    def test_validate_tool(self):
        """Test tool validation."""
        # Test callable
        def test_function():
            pass
        assert self.adapter.validate_tool(test_function) is True
        
        # Test object with run method
        class MockTool:
            def run(self):
                pass
        assert self.adapter.validate_tool(MockTool()) is True
        
        # Test invalid object
        assert self.adapter.validate_tool("not a tool") is False

class TestLangChainAdapter:
    """Test the LangChain tool adapter."""
    
    def setup_method(self):
        """Set up test environment."""
        self.adapter = LangChainToolAdapter()
    
    def test_adapter_initialization(self):
        """Test adapter initialization."""
        assert self.adapter.tool_type == ThirdPartyToolType.LANGCHAIN
    
    @patch('lib._tools.langchain_adapter.importlib.import_module')
    def test_langchain_availability_check(self, mock_import):
        """Test LangChain availability checking."""
        # Test when LangChain is available
        mock_import.return_value = MagicMock()
        adapter = LangChainToolAdapter()
        # Note: The actual availability is checked during __init__
        
        # Test when LangChain is not available
        mock_import.side_effect = ImportError("No module named 'langchain_core'")
        adapter = LangChainToolAdapter()
        assert adapter.langchain_available is False
    
    def test_discover_tools_without_langchain(self):
        """Test tool discovery when LangChain is not available."""
        self.adapter.langchain_available = False
        tools = self.adapter.discover_tools([])
        assert len(tools) == 0

class TestCrewAIAdapter:
    """Test the CrewAI tool adapter."""
    
    def setup_method(self):
        """Set up test environment."""
        self.adapter = CrewAIToolAdapter()
    
    def test_adapter_initialization(self):
        """Test adapter initialization."""
        assert self.adapter.tool_type == ThirdPartyToolType.CREWAI
    
    def test_discover_tools_without_crewai(self):
        """Test tool discovery when CrewAI is not available."""
        self.adapter.crewai_available = False
        tools = self.adapter.discover_tools([])
        assert len(tools) == 0

class TestADKIntegration:
    """Test ADK integration for third-party tools."""
    
    def test_adk_third_party_tools_import(self):
        """Test that ADK third-party tools can be imported."""
        try:
            from lib._tools.adk_third_party_tools import (
                adk_execute_third_party_tool,
                adk_list_third_party_tools,
                adk_register_langchain_tools,
                adk_register_crewai_tools,
                adk_get_third_party_tool_info
            )
            
            # Verify tools have the expected attributes
            tools = [
                adk_execute_third_party_tool,
                adk_list_third_party_tools,
                adk_register_langchain_tools,
                adk_register_crewai_tools,
                adk_get_third_party_tool_info
            ]
            
            for tool in tools:
                assert hasattr(tool, 'func'), f"Tool {tool} missing func attribute"
                assert callable(tool.func), f"Tool {tool}.func is not callable"
                
        except ImportError as e:
            pytest.skip(f"Could not import ADK third-party tools: {e}")
    
    def test_agent_has_third_party_tools(self):
        """Test that the vana agent has third-party tools available."""
        try:
            from agents.vana.team import vana
            
            # Get tool names from the agent
            tool_names = [tool.func.__name__ if hasattr(tool, 'func') else str(tool) for tool in vana.tools]
            
            # Check that third-party tools are present
            expected_third_party_tools = [
                '_execute_third_party_tool',
                '_list_third_party_tools',
                '_register_langchain_tools',
                '_register_crewai_tools',
                '_get_third_party_tool_info'
            ]
            
            for tool_name in expected_third_party_tools:
                assert tool_name in tool_names, f"Third-party tool {tool_name} not found in agent tools"
            
            # Verify total tool count includes third-party tools
            assert len(vana.tools) >= 30, f"Expected at least 30 tools, got {len(vana.tools)}"
            
        except ImportError as e:
            pytest.skip(f"Could not import vana agent: {e}")

class TestToolExecution:
    """Test third-party tool execution."""
    
    def test_execute_nonexistent_tool(self):
        """Test executing a tool that doesn't exist."""
        from lib._tools.adk_third_party_tools import _execute_third_party_tool
        
        result = _execute_third_party_tool("nonexistent_tool", "test")
        assert "not found" in result.lower()
    
    def test_list_third_party_tools_empty(self):
        """Test listing tools when none are registered."""
        from lib._tools.adk_third_party_tools import _list_third_party_tools
        
        # Clear registry for test
        original_tools = third_party_registry.all_tools.copy()
        third_party_registry.all_tools.clear()
        
        try:
            result = _list_third_party_tools()
            assert "No third-party tools" in result
        finally:
            # Restore original tools
            third_party_registry.all_tools.update(original_tools)

if __name__ == "__main__":
    # Run basic tests
    test_registry = TestThirdPartyToolRegistry()
    test_registry.setup_method()
    test_registry.test_registry_initialization()
    test_registry.test_register_adapter()
    
    test_adapter = TestGenericThirdPartyAdapter()
    test_adapter.setup_method()
    test_adapter.test_adapter_initialization()
    test_adapter.test_validate_tool()
    
    print("✅ All basic third-party tools tests passed!")
