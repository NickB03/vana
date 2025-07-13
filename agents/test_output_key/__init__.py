"""
Test Agent with Only output_key Property
"""

from google.adk.agents import LlmAgent

# Create test agent with only output_key added to minimal config
root_agent = LlmAgent(
    name="test_output_key",
    model="gemini-2.5-flash",
    description="Test agent with only output_key property",
    instruction="You are a test agent for validating output_key property.",
    output_key="test_results",  # Only advanced property added
)
