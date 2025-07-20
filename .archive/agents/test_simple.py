"""
Simple test agent for ADK validation
"""

from google.adk.agents import LlmAgent

# Create a minimal agent to test ADK validation
test_simple_agent = LlmAgent(
    name="test_simple",
    model="gemini-2.5-flash",
    description="Simple test agent with no tools",
    instruction="You are a simple test agent. Just respond to user queries directly."
)

# ADK expects root_agent
root_agent = test_simple_agent