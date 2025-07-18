"""
VANA Root Agent - Simplified ADK-Compliant Implementation

This is a minimal implementation that follows ADK best practices:
1. No custom transfer_to_agent tool (ADK provides it automatically)
2. Clean sub_agents hierarchy
3. Simple, clear instructions
"""

import os
import logging
from dotenv import load_dotenv
from google.adk.agents import LlmAgent

# Load environment variables
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dotenv_path = os.path.join(project_root, ".env.local")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)

# Set up logging
logger = logging.getLogger("vana.simple")

# Create a simple math specialist for testing
math_specialist = LlmAgent(
    name="math_specialist",
    model="gemini-2.0-flash",
    description="Handles mathematical calculations and problems",
    instruction="You are a math expert. Solve mathematical problems step by step.",
    tools=[],  # No tools needed for basic math
    sub_agents=[]
)

# Create a simple writing specialist for testing
writing_specialist = LlmAgent(
    name="writing_specialist", 
    model="gemini-2.0-flash",
    description="Handles writing tasks, reports, and content creation",
    instruction="You are a writing expert. Help create well-structured content.",
    tools=[],
    sub_agents=[]
)

# Create the simplified orchestrator
simple_orchestrator = LlmAgent(
    name="simple_orchestrator",
    model="gemini-2.0-flash",
    description="Routes requests to appropriate specialists",
    instruction="""You are the orchestrator. Route requests to the right specialist:
- Math questions → transfer to math_specialist
- Writing tasks → transfer to writing_specialist
- For other requests, provide a helpful response yourself.""",
    tools=[],  # ADK provides transfer_to_agent automatically
    sub_agents=[math_specialist, writing_specialist]
)

# Create the root VANA agent
root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash",
    description="Main conversational interface for VANA",
    instruction="""You are VANA, a friendly AI assistant.

For simple greetings like "Hello" or "Hi", respond warmly.

For ALL other requests (questions, tasks, help requests), immediately transfer to simple_orchestrator.

Do not try to answer questions yourself. Just transfer to simple_orchestrator.""",
    tools=[],  # ADK provides transfer_to_agent automatically
    sub_agents=[simple_orchestrator]  # Single sub-agent to avoid conflicts
)

# Log the setup
logger.info(f"✅ Created simple VANA with orchestrator and {len(simple_orchestrator.sub_agents)} specialists")