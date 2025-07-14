"""
Test Agent with Only Single Tool Property
"""

from google.adk.agents import LlmAgent

from lib._tools import adk_echo

# Create test agent with only one simple tool
root_agent = LlmAgent(
    name="test_single_tool",
    model="gemini-2.5-flash",
    description="Test agent with only single tool property",
    instruction="You are a test agent for validating tools property. You have access to an echo tool.",
    tools=[adk_echo],  # Only one simple tool added
)
