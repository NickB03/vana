"""
Project Development Workflow - Sequential Specialist Collaboration
Implements Google ADK SequentialAgent pattern for end-to-end project development.
"""

from agents.specialists.ui_specialist import analyze_user_interface
from agents.specialists.qa_specialist import analyze_testing_strategy
from agents.specialists.devops_specialist import analyze_infrastructure
from agents.specialists.architecture_specialist import analyze_system_architecture
from agents.memory.specialist_memory_manager import (
    get_specialist_knowledge_func,
    save_specialist_knowledge_func,
)
from google.adk.tools import FunctionTool
from google.adk.agents import LlmAgent, SequentialAgent
import os
import sys

# Add project root to Python path


# Import memory management

# Import specialist functions


def create_project_development_workflow() -> SequentialAgent:
    """
    Create a sequential workflow for comprehensive project development.

    Workflow: Requirements → Architecture → UI Design → DevOps → QA → Integration
    Each agent saves results to session state for the next agent to use.
    """

    # Phase 1: Requirements Analysis
    requirements_analyst = LlmAgent(
        name="RequirementsAnalyst",
        model="gemini-2.0-flash",
        description="Analyzes project requirements and creates detailed specifications",
        instruction="""You are a Requirements Analyst. Analyze the user's project request and create:
        1. Functional requirements
        2. Non-functional requirements
        3. Technical constraints
        4. Success criteria

        Save your analysis to session state for other specialists to use.""",
        output_key="project_requirements",
    )

    # Phase 2: Architecture Design
    architecture_designer = LlmAgent(
        name="ArchitectureDesigner",
        model="gemini-2.0-flash",
        description="Creates system architecture based on requirements",
        instruction="""You are an Architecture Specialist. Based on the requirements in state['project_requirements']:

        First, retrieve any relevant past knowledge and user preferences from memory.
        Then:
        1. Design system architecture
        2. Select technology stack
        3. Define component interactions
        4. Plan scalability approach

        Use the architecture analysis tool for detailed recommendations.
        Save valuable insights to memory for future use.""",
        tools=[
            FunctionTool(analyze_system_architecture),
            FunctionTool(get_specialist_knowledge_func),
            FunctionTool(save_specialist_knowledge_func),
        ],
        output_key="system_architecture",
    )

    # Phase 3: UI/UX Design
    ui_designer = LlmAgent(
        name="UIDesigner",
        model="gemini-2.0-flash",
        description="Creates UI/UX design based on requirements and architecture",
        instruction="""You are a UI/UX Specialist. Based on:
        - Requirements: state['project_requirements']
        - Architecture: state['system_architecture']

        Create:
        1. User interface design
        2. User experience flow
        3. Accessibility considerations
        4. Frontend technology recommendations

        Use the UI analysis tool for detailed design guidance.""",
        tools=[FunctionTool(analyze_user_interface)],
        output_key="ui_design",
    )

    # Phase 4: DevOps Strategy
    devops_planner = LlmAgent(
        name="DevOpsPlanner",
        model="gemini-2.0-flash",
        description="Creates deployment and infrastructure strategy",
        instruction="""You are a DevOps Specialist. Based on:
        - Requirements: state['project_requirements']
        - Architecture: state['system_architecture']
        - UI Design: state['ui_design']

        Create:
        1. Deployment strategy
        2. CI/CD pipeline design
        3. Infrastructure requirements
        4. Monitoring and scaling plans

        Use the DevOps analysis tool for detailed infrastructure guidance.""",
        tools=[FunctionTool(analyze_infrastructure)],
        output_key="devops_strategy",
    )

    # Phase 5: QA Strategy
    qa_strategist = LlmAgent(
        name="QAStrategist",
        model="gemini-2.0-flash",
        description="Creates comprehensive testing strategy",
        instruction="""You are a QA Specialist. Based on all previous phases:
        - Requirements: state['project_requirements']
        - Architecture: state['system_architecture']
        - UI Design: state['ui_design']
        - DevOps: state['devops_strategy']

        Create:
        1. Testing strategy
        2. Quality assurance plan
        3. Automation framework
        4. Performance testing approach

        Use the QA analysis tool for detailed testing guidance.""",
        tools=[FunctionTool(analyze_testing_strategy)],
        output_key="qa_strategy",
    )

    # Phase 6: Integration Summary
    integration_manager = LlmAgent(
        name="IntegrationManager",
        model="gemini-2.0-flash",
        description="Integrates all specialist recommendations into final project plan",
        instruction="""You are an Integration Manager. Review all specialist outputs:
        - Requirements: state['project_requirements']
        - Architecture: state['system_architecture']
        - UI Design: state['ui_design']
        - DevOps: state['devops_strategy']
        - QA Strategy: state['qa_strategy']

        Create a comprehensive project plan that integrates all recommendations:
        1. Implementation roadmap
        2. Timeline and milestones
        3. Resource requirements
        4. Risk assessment
        5. Success metrics""",
        output_key="integrated_project_plan",
    )

    # Create the sequential workflow
    project_workflow = SequentialAgent(
        name="ProjectDevelopmentWorkflow",
        description="End-to-end project development with specialist collaboration",
        sub_agents=[
            requirements_analyst,
            architecture_designer,
            ui_designer,
            devops_planner,
            qa_strategist,
            integration_manager,
        ],
    )

    return project_workflow


# Export for VANA integration
project_development_workflow = create_project_development_workflow()

__all__ = ["create_project_development_workflow", "project_development_workflow"]
