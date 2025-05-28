"""
VANA Multi-Agent System - Root Agent Definition

This module defines the root agent for the VANA multi-agent system.
Following Google ADK production patterns for agent definition.
"""

import os
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Get model configuration from environment
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Define basic tools for the root agent
def echo_tool(message: str) -> str:
    """Echo a message back to the user."""
    return f"Echo: {message}"

def get_system_info() -> str:
    """Get system information."""
    return {
        "name": "VANA Multi-Agent System",
        "version": "1.0.0",
        "environment": os.getenv("VANA_ENV", "production"),
        "model": MODEL,
        "status": "operational"
    }

# Create ADK FunctionTool instances
echo_function_tool = FunctionTool(func=echo_tool)
system_info_tool = FunctionTool(func=get_system_info)

# Define the root agent
root_agent = LlmAgent(
    name="vana",
    model=MODEL,
    description="VANA Multi-Agent System - AI Assistant with Advanced Capabilities",
    instruction="""You are VANA, an advanced AI assistant with multi-agent capabilities.

## Core Capabilities:
- Research and information gathering
- Analysis and problem-solving
- Task planning and execution
- Multi-domain expertise coordination

## Your Role:
You serve as the primary orchestrator for a sophisticated multi-agent system. You can:
1. Handle direct user queries and tasks
2. Coordinate with specialist agents when needed
3. Provide comprehensive assistance across multiple domains
4. Maintain context and continuity across conversations

## Interaction Style:
- Be helpful, accurate, and thorough
- Ask clarifying questions when needed
- Provide structured responses for complex topics
- Acknowledge limitations and suggest alternatives when appropriate

## System Integration:
- You have access to various tools and capabilities
- You can leverage the multi-agent system for complex tasks
- You maintain session state and context across interactions

Always strive to provide the most helpful and accurate assistance possible.""",
    tools=[
        echo_function_tool,
        system_info_tool
    ]
)
