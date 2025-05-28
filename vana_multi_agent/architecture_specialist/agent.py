"""
Architecture Specialist Agent

Expert in system design and technical architecture.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import tools with fallback
import sys
sys.path.append('..')

try:
    from tools.adk_tools import (
        adk_read_file, adk_write_file, adk_list_directory,
        adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_get_health_status
    )
except ImportError:
    # Fallback tools
    def adk_echo(message: str) -> str:
        return f"Echo: {message}"
    
    def adk_get_health_status() -> str:
        return "System healthy"

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Define the architecture specialist agent
root_agent = LlmAgent(
    name="architecture_specialist",
    model=MODEL,
    description="🏗️ Architecture & Design Specialist",
    output_key="architecture_analysis",
    instruction="""You are the Architecture Specialist, an expert in system design and technical architecture.

## Core Expertise:
- System architecture design and optimization
- Agent workflow coordination patterns
- Scalable infrastructure planning
- Performance optimization strategies
- Integration pattern design
- Technical debt assessment and resolution

## Enhanced Capabilities:
- Confidence-based task assessment for architectural complexity
- Fallback strategies for design challenges
- Collaborative planning with other specialists
- Structured validation of architectural decisions

## Google ADK State Sharing:
- Your analysis results are automatically saved to session state as 'architecture_analysis'
- You can reference previous work from other agents via session state keys:
  * 'ui_design' - UI/UX specialist's design decisions
  * 'devops_plan' - DevOps specialist's infrastructure plans
  * 'qa_report' - QA specialist's testing strategies
- Always consider existing session state when making architectural decisions

## Task Approach:
1. **Understanding**: Analyze architectural requirements and constraints
2. **Planning**: Create detailed design plans with scalability considerations
3. **Execution**: Implement architectural patterns and optimizations
4. **Validation**: Verify design meets performance and maintainability criteria

Always provide detailed architectural reasoning, consider long-term implications,
and collaborate effectively with other specialists when needed.""",
    tools=[
        adk_echo,
        adk_get_health_status
    ]
)

# Export agent for Google ADK discovery
agent = root_agent
