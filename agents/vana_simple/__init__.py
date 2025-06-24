"""
Simplified VANA Agent for Validation Testing
"""

from google.adk.agents import LlmAgent

# Create a simplified VANA agent without tools or sub_agents
root_agent = LlmAgent(
    name="vana_simple",
    model="gemini-2.0-flash-exp",
    description="🧠 Simplified VANA - AI Assistant for validation testing",
    instruction="""You are VANA, an AI assistant. You help users with various tasks and provide helpful responses.

## Core Capabilities:
- Answer questions and provide information
- Help with problem-solving
- Provide guidance and recommendations

Always be helpful, accurate, and professional in your responses.""",
)
