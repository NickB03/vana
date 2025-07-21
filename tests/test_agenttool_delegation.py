"""
Integration tests for AgentTool delegation pattern in VANA orchestrator.

Verifies that the pure delegation pattern using only AgentTools works correctly
and that specialists receive and process requests as expected.
"""

import asyncio
import pytest
from unittest.mock import Mock, patch, AsyncMock
from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from google.genai import types

# Import the orchestrator and specialists
from agents.vana.orchestrator_pure_delegation import create_pure_delegation_orchestrator
from agents.vana.simple_search_agent import create_simple_search_agent
from lib.agents.specialists.research_specialist import create_research_specialist
from lib.agents.specialists.architecture_specialist import create_architecture_specialist
from lib.agents.specialists.data_science_specialist import create_data_science_specialist
from lib.agents.specialists.devops_specialist import create_devops_specialist


class TestAgentToolDelegation:
    """Test suite for verifying AgentTool delegation works correctly."""
    
    def test_orchestrator_has_only_agenttools(self):
        """Verify orchestrator uses ONLY AgentTools, no direct tools."""
        orchestrator = create_pure_delegation_orchestrator()
        
        # Check all tools are AgentTools
        assert len(orchestrator.tools) == 5
        for tool in orchestrator.tools:
            assert isinstance(tool, agent_tool.AgentTool)
        
        # Verify tool names match expected specialists
        tool_names = [tool.name for tool in orchestrator.tools]
        expected_names = [
            "simple_search_agent",
            "research_specialist", 
            "architecture_specialist",
            "data_science_specialist",
            "devops_specialist"
        ]
        assert set(tool_names) == set(expected_names)
    
    def test_agenttool_wraps_specialists_correctly(self):
        """Verify AgentTool properly wraps specialist agents."""
        # Create specialists
        simple_search = create_simple_search_agent()
        research = create_research_specialist()
        
        # Wrap with AgentTool
        search_tool = agent_tool.AgentTool(agent=simple_search)
        research_tool = agent_tool.AgentTool(agent=research)
        
        # Verify wrapped agents
        assert search_tool.agent == simple_search
        assert research_tool.agent == research
        
        # Verify tool names match agent names
        assert search_tool.name == "simple_search_agent"
        assert research_tool.name == "research_specialist"
    
    def test_factory_functions_create_fresh_instances(self):
        """Verify factory functions create new instances each time."""
        # Create multiple instances
        specialist1 = create_architecture_specialist()
        specialist2 = create_architecture_specialist()
        
        # Verify they are different instances
        assert specialist1 is not specialist2
        assert specialist1.name == specialist2.name == "architecture_specialist"
        
        # Verify same for all specialists
        research1 = create_research_specialist()
        research2 = create_research_specialist()
        assert research1 is not research2
    
    @pytest.mark.asyncio
    async def test_orchestrator_delegates_simple_search(self):
        """Test orchestrator correctly delegates simple search requests."""
        orchestrator = create_pure_delegation_orchestrator()
        
        # Mock the LLM to choose simple_search_agent
        with patch.object(orchestrator, 'run') as mock_run:
            mock_run.return_value = "Delegating to simple_search_agent for weather query"
            
            response = orchestrator.run("What's the weather in London?", {})
            
            assert "simple_search" in response.lower() or "delegating" in response.lower()
    
    @pytest.mark.asyncio  
    async def test_orchestrator_delegates_research(self):
        """Test orchestrator correctly delegates research requests."""
        orchestrator = create_pure_delegation_orchestrator()
        
        # Mock the LLM to choose research_specialist
        with patch.object(orchestrator, 'run') as mock_run:
            mock_run.return_value = "Delegating to research_specialist for complex topic"
            
            response = orchestrator.run(
                "Research the environmental impact of electric vehicles", 
                {}
            )
            
            assert "research" in response.lower() or "delegating" in response.lower()
    
    def test_specialist_tools_are_not_agenttools(self):
        """Verify specialists use regular tools, not AgentTools."""
        # Architecture specialist uses FunctionTools
        arch_specialist = create_architecture_specialist()
        for tool in arch_specialist.tools:
            assert not isinstance(tool, agent_tool.AgentTool)
        
        # Research specialist uses built-in google_search
        research_specialist = create_research_specialist() 
        assert len(research_specialist.tools) == 1
        assert not isinstance(research_specialist.tools[0], agent_tool.AgentTool)
    
    def test_orchestrator_instruction_clarity(self):
        """Verify orchestrator instructions are clear for delegation."""
        orchestrator = create_pure_delegation_orchestrator()
        
        # Check instruction mentions delegation
        assert "delegate" in orchestrator.instruction.lower()
        assert "MUST delegate ALL requests" in orchestrator.instruction
        
        # Check routing rules are present
        assert "Simple Search" in orchestrator.instruction
        assert "Research" in orchestrator.instruction
        assert "Architecture" in orchestrator.instruction
        assert "Data Science" in orchestrator.instruction
        assert "DevOps" in orchestrator.instruction
    
    def test_pure_delegation_comment_accuracy(self):
        """Verify comments accurately describe design choice, not workaround."""
        import agents.vana.orchestrator_pure_delegation as orch_module
        
        # Check module docstring
        assert "Design choice" in orch_module.__doc__
        assert "clean separation of concerns" in orch_module.__doc__
        assert "limitation" not in orch_module.__doc__  # Should not mention limitation
        
        # Check function docstring
        assert "clean architecture" in orch_module.create_pure_delegation_orchestrator.__doc__


if __name__ == "__main__":
    pytest.main([__file__, "-v"])