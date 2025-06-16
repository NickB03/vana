"""
Test Agent with Only Sub-Agents Property
"""

from google.adk.agents import LlmAgent

# Import a simple working agent to use as sub-agent
try:
    from agents.test_minimal import root_agent as minimal_agent
    
    # Create test agent with only sub_agents property
    root_agent = LlmAgent(
        name="test_sub_agents",
        model="gemini-2.0-flash",
        description="Test agent with only sub_agents property",
        instruction="You are a test agent for validating sub_agents property.",
        sub_agents=[minimal_agent]  # Only sub_agents property added
    )
except ImportError:
    # Fallback if minimal agent not available
    root_agent = LlmAgent(
        name="test_sub_agents",
        model="gemini-2.0-flash",
        description="Test agent with only sub_agents property (no sub-agents due to import error)",
        instruction="You are a test agent for validating sub_agents property."
    )
