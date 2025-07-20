"""
Test Specialist for Phase 1 Validation

Simple test specialist to validate sub-agent delegation patterns.
"""

from google.adk.agents import LlmAgent


# Create a simple test specialist
test_specialist = LlmAgent(
    name="test_specialist",
    model="gemini-2.5-flash",
    description="Simple test specialist for Phase 1 validation",
    instruction="""You are a test specialist for VANA Phase 1 validation.

Your role is to:
1. Respond to any request with a clear confirmation that you received it
2. Always include "TEST SPECIALIST RESPONSE:" at the beginning
3. Echo back the main request details
4. Confirm you're working properly

Example response:
TEST SPECIALIST RESPONSE: I received your request about [topic]. I'm the test specialist and I'm functioning correctly.
""",
    tools=[],  # No tools needed for basic testing
    sub_agents=[]  # No sub-agents needed
)