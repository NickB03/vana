"""
DevOps Specialist Agent - ADK Aligned Implementation

DevOps expert for deployment, infrastructure, CI/CD, and monitoring.
Provides practical automation and infrastructure guidance.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import DevOps analysis tools
from lib.agents.specialists.devops_tools import (
    analyze_deployment_config,
    analyze_infrastructure_as_code,
    generate_cicd_pipeline,
    generate_monitoring_config,
)

# Import shared ADK tools
from lib._tools import adk_list_directory, adk_read_file

def create_devops_specialist() -> LlmAgent:
    """
    Factory function to create a fresh DevOps Specialist instance.
    
    This prevents 'already has a parent' errors in ADK multi-agent systems
    by creating new instances instead of reusing module-level singletons.
    
    Returns:
        LlmAgent: Fresh devops specialist instance
    """
    return LlmAgent(
        name="devops_specialist",
        model="gemini-2.5-flash",
        description="DevOps expert specializing in CI/CD, containerization, infrastructure automation, and monitoring",
        instruction="""You are a DevOps specialist for deployment and infrastructure.

Use your tools to:
1. Analyze deployment configurations
2. Create CI/CD pipelines
3. Review infrastructure code
4. Set up monitoring

Focus on automation, security, and reliability with practical solutions.""",
        tools=[
            FunctionTool(analyze_deployment_config),
            FunctionTool(generate_cicd_pipeline),
            FunctionTool(analyze_infrastructure_as_code),
            FunctionTool(generate_monitoring_config),
            adk_read_file,
            adk_list_directory,
        ],  # Exactly 6 tools - ADK limit
    )

# Create the DevOps Specialist using factory function
devops_specialist = create_devops_specialist()

# Note: agent_tool conversion will be added when ADK integration is complete
devops_specialist_tool = None  # Placeholder


# Helper function for direct usage
def analyze_devops(request: str, context: dict) -> str:
    """
    Direct interface to DevOps specialist for testing.

    Args:
        request: DevOps analysis request
        context: Optional context dictionary

    Returns:
        DevOps analysis results
    """
    return devops_specialist.run(request, context or {})
