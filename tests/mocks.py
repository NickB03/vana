"""
Mock implementations for Google API and ADK components for testing.

This module provides realistic mocks that simulate Google API behavior
without requiring real API keys or making actual API calls.
"""

import unittest.mock
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class MockGenerateContentResponse:
    """Mock response from Google Generative AI."""
    text: str
    
    @property
    def parts(self):
        """Mock parts property for compatibility."""
        part = unittest.mock.MagicMock()
        part.text = self.text
        return [part]


class MockGoogleGenerativeAI:
    """Mock Google Generative AI client that provides realistic responses."""
    
    def __init__(self, model_name: str = "gemini-1.5-flash", api_key: str = None):
        self.model_name = model_name
        self.api_key = api_key
        self._call_count = 0
    
    def generate_content(self, prompt: str, **kwargs) -> MockGenerateContentResponse:
        """Generate a mock response based on the prompt."""
        self._call_count += 1
        
        # Provide realistic responses based on prompt content
        if "test" in prompt.lower():
            response_text = "This is a test response from the mocked Google AI. The system is working correctly."
        elif "hello" in prompt.lower():
            response_text = "Hello! I'm the VANA enhanced orchestrator. How can I help you today?"
        elif "weather" in prompt.lower():
            response_text = "I can help you with weather information. However, I don't have access to real-time weather data in this test environment."
        elif "error" in prompt.lower():
            raise Exception("Simulated API error for testing error handling")
        else:
            response_text = f"I understand your request. This is response #{self._call_count} from the mocked system."
        
        return MockGenerateContentResponse(text=response_text)
    
    @property
    def call_count(self) -> int:
        """Number of API calls made."""
        return self._call_count


class MockADKAgent:
    """Mock ADK agent for testing without real ADK dependencies."""
    
    def __init__(self, name: str, model: str, instruction: str, **kwargs):
        self.name = name
        self.model = model
        self.instruction = instruction
        self.description = kwargs.get('description', f"Mock description for {name}")
        self.tools = kwargs.get('tools', [])
        self.sub_agents = kwargs.get('sub_agents', [])
        self._mock_ai = MockGoogleGenerativeAI()
    
    def run(self, request: str, context: Dict = None) -> str:
        """Match real ADK agent interface."""
        return self._mock_ai.generate_content(request).text
    
    async def process_message(self, message: str) -> str:
        """Deprecated - use run() instead."""
        return self.run(message, {})
    
    def get_info(self) -> Dict[str, Any]:
        """Get agent information."""
        return {
            "name": self.name,
            "model": self.model,
            "instruction": self.instruction[:100] + "..." if len(self.instruction) > 100 else self.instruction,
            "tools_count": len(self.tools),
            "sub_agents_count": len(self.sub_agents)
        }


def create_mock_agent_patches():
    """Create patches for Google AI and ADK components."""
    patches = []
    
    # Mock Google Generative AI
    google_ai_patch = unittest.mock.patch('google.generativeai.GenerativeModel')
    mock_model = google_ai_patch.start()
    mock_instance = MockGoogleGenerativeAI()
    mock_model.return_value = mock_instance
    patches.append(google_ai_patch)
    
    # Mock ADK components if they exist
    try:
        adk_agent_patch = unittest.mock.patch('google.adk.agents.LlmAgent')
        mock_adk_agent = adk_agent_patch.start()
        mock_adk_agent.side_effect = MockADKAgent
        patches.append(adk_agent_patch)
    except ImportError:
        pass  # ADK not available
    
    return patches, mock_instance


def cleanup_mock_patches(patches: List[unittest.mock._patch]):
    """Clean up mock patches."""
    for patch in patches:
        try:
            patch.stop()
        except RuntimeError:
            pass  # Patch was already stopped


# Context manager for easy mocking
class MockedGoogleAPI:
    """Context manager for mocking Google API calls."""
    
    def __init__(self):
        self.patches = []
        self.mock_ai = None
    
    def __enter__(self):
        self.patches, self.mock_ai = create_mock_agent_patches()
        return self.mock_ai
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        cleanup_mock_patches(self.patches)


# Test utilities
def create_test_response_data(agent_name: str, user_message: str) -> Dict[str, Any]:
    """Create test response data for ADK evaluation."""
    return {
        "agent_name": agent_name,
        "user_message": user_message,
        "response": f"Test response from {agent_name} for message: {user_message}",
        "tool_calls": [],
        "success": True,
        "mock": True
    }


def validate_mock_response(response: Any) -> bool:
    """Validate that a response came from our mocks."""
    if hasattr(response, 'text'):
        return "mocked" in response.text.lower() or "test" in response.text.lower()
    return False