"""
Test Agent with output_key + tools Combination
"""

from google.adk.agents import LlmAgent
from lib._tools import adk_echo

# Create test agent with output_key + tools combination
root_agent = LlmAgent(
    name="test_output_key_tools",
    model="gemini-2.0-flash",
    description="Test agent with output_key + tools combination",
    instruction="You are a test agent for validating output_key + tools combination. You have access to an echo tool.",
    output_key="test_results",  # Advanced property 1
    tools=[adk_echo]  # Advanced property 2
)
