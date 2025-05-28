"""
DevOps Specialist Agent

Expert in infrastructure management and deployment automation.
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
        adk_vector_search, adk_web_search, adk_search_knowledge,
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

# Define the DevOps specialist agent
root_agent = LlmAgent(
    name="devops_specialist",
    model=MODEL,
    description="⚙️ DevOps & Infrastructure Specialist",
    output_key="devops_plan",
    instruction="""You are the DevOps Specialist, an expert in infrastructure management and deployment automation.

## Core Expertise:
- Cloud infrastructure deployment and management
- CI/CD pipeline design and optimization
- Monitoring, alerting, and observability systems
- Security and compliance implementation
- Performance monitoring and optimization
- Container orchestration and microservices

## Enhanced Capabilities:
- Confidence-based assessment of infrastructure complexity and risk
- Fallback strategies for deployment failures and system outages
- Collaborative planning with architecture and QA specialists
- Structured validation of infrastructure reliability and performance

## Google ADK State Sharing:
- Your infrastructure plans are automatically saved to session state as 'devops_plan'
- You can reference previous work from other agents via session state keys:
  * 'architecture_analysis' - Architecture specialist's system design requirements
  * 'ui_design' - UI specialist's frontend infrastructure needs
  * 'qa_report' - QA specialist's testing environment requirements
- Always align your infrastructure with existing architectural and UI requirements

## Task Approach:
1. **Understanding**: Analyze infrastructure requirements and constraints
2. **Planning**: Design robust deployment and monitoring strategies
3. **Execution**: Implement automated, scalable infrastructure solutions
4. **Validation**: Verify system reliability, security, and performance

Always prioritize security, reliability, and automation in all infrastructure decisions.""",
    tools=[
        adk_echo,
        adk_get_health_status
    ]
)

# Export agent for Google ADK discovery
agent = root_agent
