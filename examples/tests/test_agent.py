"""
VANA Agent Testing Patterns
Demonstrates how to test ADK agents effectively
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any, List
import json

# Import patterns for testing
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from google.adk.sessions import InMemorySessionService


# Pattern 1: Basic Agent Testing
class TestBasicAgent:
    """Test patterns for basic agent functionality."""
    
    @pytest.fixture
    def basic_agent(self):
        """Fixture for creating a basic test agent."""
        return LlmAgent(
            name="test_agent",
            model="gemini-2.5-flash",
            description="Test agent",
            instruction="You are a test agent. Always respond politely."
        )
    
    def test_agent_creation(self, basic_agent):
        """Test agent is created with correct properties."""
        assert basic_agent.name == "test_agent"
        assert basic_agent.model == "gemini-2.5-flash"
        assert basic_agent.description == "Test agent"
        assert "politely" in basic_agent.instruction
    
    def test_agent_has_required_attributes(self, basic_agent):
        """Test agent has all required ADK attributes."""
        required_attrs = ['name', 'model', 'description', 'instruction']
        for attr in required_attrs:
            assert hasattr(basic_agent, attr)


# Pattern 2: Testing Agents with Tools
class TestAgentWithTools:
    """Test patterns for agents with tools."""
    
    @pytest.fixture
    def mock_tool(self):
        """Create a mock tool for testing."""
        def tool_func(input_text: str) -> str:
            return f"Processed: {input_text}"
        return tool_func
    
    @pytest.fixture
    def agent_with_tools(self, mock_tool):
        """Create agent with tools."""
        return LlmAgent(
            name="tool_agent",
            model="gemini-2.5-flash",
            description="Agent with tools",
            instruction="Use tools when appropriate.",
            tools=[FunctionTool(mock_tool)]
        )
    
    def test_agent_has_tools(self, agent_with_tools):
        """Test agent is configured with tools."""
        assert len(agent_with_tools.tools) > 0
        assert isinstance(agent_with_tools.tools[0], FunctionTool)
    
    @patch('google.adk.agents.LlmAgent.run')
    def test_agent_uses_tools(self, mock_run, agent_with_tools):
        """Test agent tool usage."""
        # Mock the agent run to simulate tool usage
        mock_run.return_value = "Used tool: Processed: test input"
        
        result = agent_with_tools.run("Process this: test input")
        
        mock_run.assert_called_once()
        assert "Processed" in result


# Pattern 3: Testing Multi-Agent Systems
class TestMultiAgentSystem:
    """Test patterns for multi-agent orchestration."""
    
    @pytest.fixture
    def specialist_agents(self):
        """Create mock specialist agents."""
        security_agent = LlmAgent(
            name="security_specialist",
            model="gemini-2.5-flash",
            description="Security specialist",
            instruction="Focus on security issues."
        )
        
        architecture_agent = LlmAgent(
            name="architecture_specialist",
            model="gemini-2.5-flash",
            description="Architecture specialist",
            instruction="Focus on design patterns."
        )
        
        return [security_agent, architecture_agent]
    
    @pytest.fixture
    def orchestrator(self, specialist_agents):
        """Create orchestrator with specialists."""
        return LlmAgent(
            name="orchestrator",
            model="gemini-2.5-flash",
            description="Central orchestrator",
            instruction="Route requests to appropriate specialists.",
            sub_agents=specialist_agents
        )
    
    def test_orchestrator_has_specialists(self, orchestrator):
        """Test orchestrator is configured with sub-agents."""
        assert len(orchestrator.sub_agents) == 2
        agent_names = [agent.name for agent in orchestrator.sub_agents]
        assert "security_specialist" in agent_names
        assert "architecture_specialist" in agent_names
    
    @patch('google.adk.agents.LlmAgent.run')
    def test_orchestrator_routing(self, mock_run, orchestrator):
        """Test orchestrator routes to correct specialist."""
        # Simulate routing decision
        mock_run.return_value = "Routed to security_specialist: Found 2 vulnerabilities"
        
        result = orchestrator.run("Check this code for security issues")
        
        assert "security_specialist" in result
        assert "vulnerabilities" in result


# Pattern 4: Testing Stateful Agents
class TestStatefulAgent:
    """Test patterns for agents with session state."""
    
    @pytest.fixture
    def session_service(self):
        """Create mock session service."""
        return InMemorySessionService()
    
    @pytest.fixture
    def stateful_agent(self):
        """Create agent that uses state."""
        return LlmAgent(
            name="stateful_agent",
            model="gemini-2.5-flash",
            description="Agent with state",
            instruction="Use session state to remember user preferences."
        )
    
    def test_session_initialization(self, session_service):
        """Test session creation and state initialization."""
        user_id = "test_user"
        session_id = "test_session"
        initial_state = {
            "preferences": {"language": "en"},
            "history": []
        }
        
        session_service.create_session(
            app_name="test_app",
            user_id=user_id,
            session_id=session_id,
            state=initial_state
        )
        
        # Verify session was created
        session = session_service.get_session(user_id, session_id)
        assert session is not None
        assert session.state["preferences"]["language"] == "en"
        assert len(session.state["history"]) == 0
    
    def test_state_updates(self, session_service):
        """Test updating session state."""
        user_id = "test_user"
        session_id = "test_session"
        
        # Create session
        session_service.create_session(
            app_name="test_app",
            user_id=user_id,
            session_id=session_id,
            state={"counter": 0}
        )
        
        # Update state
        session = session_service.get_session(user_id, session_id)
        session.state["counter"] += 1
        
        # Verify update
        updated_session = session_service.get_session(user_id, session_id)
        assert updated_session.state["counter"] == 1


# Pattern 5: Testing Error Handling
class TestErrorHandling:
    """Test patterns for agent error handling."""
    
    @pytest.fixture
    def error_prone_tool(self):
        """Create a tool that can raise errors."""
        def tool_func(input_text: str) -> str:
            if "error" in input_text:
                raise ValueError("Simulated error")
            return f"Success: {input_text}"
        return tool_func
    
    @pytest.fixture
    def robust_agent(self, error_prone_tool):
        """Create agent with error handling."""
        return LlmAgent(
            name="robust_agent",
            model="gemini-2.5-flash",
            description="Agent with error handling",
            instruction="Handle errors gracefully. Never show internal errors to users.",
            tools=[FunctionTool(error_prone_tool)]
        )
    
    def test_tool_error_handling(self, error_prone_tool):
        """Test tool error handling directly."""
        # Test success case
        result = error_prone_tool("valid input")
        assert "Success" in result
        
        # Test error case
        with pytest.raises(ValueError) as exc_info:
            error_prone_tool("trigger error")
        assert "Simulated error" in str(exc_info.value)
    
    @patch('google.adk.agents.LlmAgent.run')
    def test_agent_handles_tool_errors(self, mock_run, robust_agent):
        """Test agent handles tool errors gracefully."""
        # Simulate agent handling tool error
        mock_run.return_value = "I encountered an issue processing your request. Let me try a different approach..."
        
        result = robust_agent.run("Process this error")
        
        assert "internal error" not in result.lower()
        assert "different approach" in result


# Pattern 6: Testing Async Behavior (Mock Pattern)
class TestAsyncPatterns:
    """Test patterns for async agent behavior."""
    
    @pytest.fixture
    def async_agent(self):
        """Create agent that might have async operations."""
        return LlmAgent(
            name="async_agent",
            model="gemini-2.5-flash",
            description="Agent with async patterns",
            instruction="Process requests that might take time."
        )
    
    @pytest.mark.asyncio
    async def test_async_operation_mock(self, async_agent):
        """Test async operations using mocks."""
        # Mock async behavior
        async_mock = AsyncMock(return_value="Async result completed")
        
        with patch.object(async_agent, 'run', async_mock):
            result = await async_agent.run("Long running task")
            
            assert result == "Async result completed"
            async_mock.assert_called_once_with("Long running task")


# Pattern 7: Integration Testing
class TestIntegration:
    """Integration test patterns for complete workflows."""
    
    @pytest.fixture
    def complete_system(self):
        """Create a complete VANA-like system for testing."""
        # Create specialists
        specialists = [
            LlmAgent(
                name=f"{role}_specialist",
                model="gemini-2.5-flash",
                description=f"{role} specialist",
                instruction=f"Handle {role} tasks."
            )
            for role in ["security", "architecture", "data"]
        ]
        
        # Create orchestrator
        orchestrator = LlmAgent(
            name="orchestrator",
            model="gemini-2.5-flash",
            description="Orchestrator",
            instruction="Route to specialists.",
            sub_agents=specialists
        )
        
        # Create root agent
        root = LlmAgent(
            name="vana",
            model="gemini-2.5-flash",
            description="Root agent",
            instruction="Transfer to orchestrator.",
            sub_agents=[orchestrator]
        )
        
        return root
    
    def test_complete_system_structure(self, complete_system):
        """Test the complete system is properly structured."""
        # Check root
        assert complete_system.name == "vana"
        assert len(complete_system.sub_agents) == 1
        
        # Check orchestrator
        orchestrator = complete_system.sub_agents[0]
        assert orchestrator.name == "orchestrator"
        assert len(orchestrator.sub_agents) == 3
        
        # Check specialists
        specialist_names = [agent.name for agent in orchestrator.sub_agents]
        assert "security_specialist" in specialist_names
        assert "architecture_specialist" in specialist_names
        assert "data_specialist" in specialist_names


# Pytest Configuration Patterns
@pytest.fixture(scope="session")
def test_config():
    """Session-wide test configuration."""
    return {
        "test_model": "gemini-2.5-flash",
        "test_timeout": 30,
        "mock_responses": True
    }


@pytest.fixture
def mock_api_key(monkeypatch):
    """Mock API key for testing."""
    monkeypatch.setenv("GOOGLE_API_KEY", "test-api-key")


# Parameterized Testing Pattern
@pytest.mark.parametrize("input_text,expected_keyword", [
    ("Check security vulnerabilities", "security"),
    ("Review architecture design", "architecture"),
    ("Analyze data patterns", "data"),
])
def test_request_classification(input_text, expected_keyword):
    """Test request classification with multiple inputs."""
    # Simple classification logic for testing
    assert expected_keyword in input_text.lower()


# Custom Assertions Pattern
def assert_agent_response_quality(response: str, min_length: int = 10):
    """Custom assertion for agent response quality."""
    assert isinstance(response, str), "Response must be a string"
    assert len(response) >= min_length, f"Response too short: {len(response)} < {min_length}"
    assert not response.startswith("Error:"), "Response should not be an error"
    assert response.strip() != "", "Response should not be empty"


if __name__ == "__main__":
    # Run specific test pattern examples
    print("VANA Agent Testing Patterns")
    print("Run with: pytest examples/tests/test_agent.py -v")