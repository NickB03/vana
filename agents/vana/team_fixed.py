"""
VANA Root Agent - Fixed ADK Implementation
Simplified version focusing on proper delegation
"""
import logging
from typing import List, Optional

from google.adk.agents import LlmAgent

# Import the enhanced orchestrator
from .enhanced_orchestrator import enhanced_orchestrator

# Set up logging
logger = logging.getLogger("vana.agents.vana.team")

# Create the root VANA agent with proper ADK delegation
root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash",
    description="Main conversational interface for VANA multi-agent system",
    instruction="""You are VANA, the friendly conversational interface for a powerful multi-agent AI system.

Your role is simple:
1. Greet users warmly and understand their requests
2. For ALL substantive requests, delegate to the enhanced_orchestrator using transfer_to_agent
3. The orchestrator will handle routing to appropriate specialists

IMPORTANT: You should delegate almost everything except basic greetings. Examples:
- "Hello" → Respond with a greeting
- "Help me write code" → transfer_to_agent("enhanced_orchestrator")
- "Analyze this data" → transfer_to_agent("enhanced_orchestrator")
- "What's the weather?" → transfer_to_agent("enhanced_orchestrator")

Always be helpful and let the user know their request is being handled by our team of specialists.""",
    tools=[],  # No tools needed - ADK provides transfer_to_agent automatically
    sub_agents=[enhanced_orchestrator]  # Key: Enhanced orchestrator as sub_agent
)

# Log successful initialization
logger.info(f"✅ Root VANA agent initialized with sub_agents: {[a.name for a in root_agent.sub_agents]}")

# Verify parent-child relationship
if enhanced_orchestrator.parent_agent:
    logger.info(f"✅ Enhanced orchestrator parent set to: {enhanced_orchestrator.parent_agent.name}")
else:
    logger.warning("⚠️ Enhanced orchestrator parent not set - ADK will set this during runner initialization")