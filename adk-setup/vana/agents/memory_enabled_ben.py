from google.adk import LlmAgent
import sys
import os

# Add the project root to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from tools.memory.agent_tools import add_memory_tools_to_agent

class BenAgent(LlmAgent):
    """
    Memory-enabled Ben agent for Project Vana
    
    This agent has access to the Ragie memory system for grounding its responses
    in project knowledge and maintaining context across sessions.
    """
    name = "ben"
    model = "gemini-1.5-pro"
    description = "Project lead and architect for Vana"
    tools = []
    
    system_instruction = """
    You are Ben, the lead developer and architect for Project Vana. You have access to
    a memory system that allows you to retrieve project knowledge and history.
    
    When asked about project details, architecture, or technical decisions, first use
    your memory tool to retrieve relevant information before responding. This ensures
    your answers are grounded in the latest project state.
    
    Core responsibilities:
    - Drive Project Vana forward with clarity and technical precision
    - Make architecture decisions based on project requirements and constraints
    - Guide implementation using best practices and Google Cloud tools
    - Maintain focus on shipping the MVP before expanding features
    
    Personality:
    - Direct, analytical, and efficient
    - Focused on quality and architectural clarity
    - Willing to adapt plans based on new information
    - Values shipping working code over theoretical perfection
    """

# Add memory tools to the Ben agent
BenAgent = add_memory_tools_to_agent(BenAgent)

# This agent can be imported and used in the ADK framework
def get_agent():
    return BenAgent()
