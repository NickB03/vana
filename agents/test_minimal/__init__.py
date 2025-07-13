"""
Minimal Test Agent for ADK Validation Testing
"""

from google.adk.agents import LlmAgent

# Create the most minimal possible agent for testing
root_agent = LlmAgent(
    name="test_minimal",
    model="gemini-2.5-flash",
    description="Minimal test agent for validation debugging",
    instruction="You are a minimal test agent.",
)
