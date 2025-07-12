"""
Test VANA integration with lightweight code execution
"""

import asyncio
import json
import uuid
from google.ai.adk.model import Content, Part
from google.ai.adk.runner import Runner
from agents.vana.team import root_agent as vana_agent
from lib._shared_libraries.adk_memory_service import VanaMemoryService


def run_vana_query(user_input: str) -> str:
    """Helper function to run a query through VANA agent using Google ADK."""
    try:
        # Create session service
        session_service = VanaMemoryService()
        
        # Create runner
        runner = Runner(agent=vana_agent, app_name="vana", session_service=session_service)
        
        # Create session
        session_id = f"test_session_{uuid.uuid4()}"
        user_id = "test_user"
        
        # Run synchronously (session service handles async internally)
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def run_async():
            await session_service.create_session(app_name="vana", user_id=user_id, session_id=session_id)
            return session_id
        
        session_id = loop.run_until_complete(run_async())
        
        # Create content from user input
        user_message = Content(parts=[Part(text=user_input)], role="user")
        
        # Run the agent and collect response
        output_text = ""
        for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
            if event.is_final_response():
                if hasattr(event, "content") and event.content:
                    if hasattr(event.content, "parts") and event.content.parts:
                        output_text = event.content.parts[0].text
                    elif hasattr(event.content, "text"):
                        output_text = event.content.text
                    else:
                        output_text = str(event.content)
        
        loop.close()
        return output_text or "No response generated"
        
    except Exception as e:
        return f"Error: {str(e)}"


class TestVANACodeExecution:
    """Test VANA's ability to use lightweight code execution tools."""
    
    def test_vana_math_calculation(self):
        """Test VANA can handle mathematical calculations."""
        response = run_vana_query("What is 25 * 4 + 10?")
        assert response is not None
        # Check that it contains the answer (110) or calculation process
        assert "110" in response or "100" in response
        
    def test_vana_python_execution(self):
        """Test VANA can execute simple Python code."""
        response = run_vana_query("Execute this Python code: print(sum([1, 2, 3, 4, 5]))")
        assert response is not None
        # Check for successful execution or explanation
        assert "15" in response or "sum" in response.lower()
        
    def test_vana_code_rejection(self):
        """Test VANA properly rejects dangerous code."""
        response = run_vana_query("Execute Python code: import os; os.system('ls')")
        assert response is not None
        response_lower = response.lower()
        # Should mention security, disabled, or limitations
        assert any(word in response_lower for word in [
            "security", "dangerous", "blocked", "pattern", "not allowed"
        ])
        
    def test_vana_complex_code_explanation(self):
        """Test VANA explains limitations for complex code."""
        response = run_vana_query("Execute Python code that uses pandas to analyze a dataset")
        assert response is not None
        response_lower = response.lower()
        # Should explain limitations or delegate to data science specialist
        assert any(word in response_lower for word in [
            "pandas", "data", "specialist", "library", "analysis"
        ])


def run_async_test():
    """Test async execution with VANA."""
    # Use the helper function for consistency
    response = run_vana_query("Calculate the factorial of 5")
    # Factorial of 5 is 120
    assert "120" in response or "factorial" in response.lower()


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
    
    # Also run async test
    print("\nRunning async test...")
    run_async_test()
    print("Async test passed!")