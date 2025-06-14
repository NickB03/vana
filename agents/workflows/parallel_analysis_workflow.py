"""
Parallel Analysis Workflow - Concurrent Specialist Analysis
Implements Google ADK ParallelAgent pattern for comprehensive concurrent analysis.
"""

from agents.specialists.ui_specialist import analyze_user_interface
from agents.specialists.qa_specialist import analyze_testing_strategy
from agents.specialists.devops_specialist import analyze_infrastructure
from agents.specialists.architecture_specialist import analyze_system_architecture
from google.adk.tools import FunctionTool
from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
import os
import sys

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


# Import specialist functions


def create_parallel_analysis_workflow() -> SequentialAgent:
    """
    Create a workflow that performs parallel specialist analysis followed by integration.

    Pattern: Input Analysis → Parallel Specialist Analysis → Integration & Synthesis
    """

    # Phase 1: Input Preparation
    input_analyzer = LlmAgent(
        name="InputAnalyzer",
        model="gemini-2.0-flash",
        description="Analyzes user input and prepares context for all specialists",
        instruction="""Analyze the user's request and prepare comprehensive context for specialist analysis:
        1. Extract key requirements and constraints
        2. Identify technical scope and complexity
        3. Determine analysis priorities
        4. Prepare context for each specialist domain

        Save the prepared context for parallel specialist analysis.""",
        output_key="analysis_context",
    )

    # Phase 2: Parallel Specialist Analysis

    # Architecture Analysis Agent
    architecture_analyzer = LlmAgent(
        name="ParallelArchitectureAnalyzer",
        model="gemini-2.0-flash",
        description="Performs architecture analysis in parallel",
        instruction="""Based on the context in state['analysis_context'], perform comprehensive architecture analysis:
        1. System design recommendations
        2. Technology stack evaluation
        3. Scalability considerations
        4. Integration patterns

        Use the architecture tool for detailed analysis.""",
        tools=[FunctionTool(analyze_system_architecture)],
        output_key="parallel_architecture_analysis",
    )

    # UI/UX Analysis Agent
    ui_analyzer = LlmAgent(
        name="ParallelUIAnalyzer",
        model="gemini-2.0-flash",
        description="Performs UI/UX analysis in parallel",
        instruction="""Based on the context in state['analysis_context'], perform comprehensive UI/UX analysis:
        1. User interface design recommendations
        2. User experience optimization
        3. Accessibility considerations
        4. Frontend technology evaluation

        Use the UI tool for detailed analysis.""",
        tools=[FunctionTool(analyze_user_interface)],
        output_key="parallel_ui_analysis",
    )

    # DevOps Analysis Agent
    devops_analyzer = LlmAgent(
        name="ParallelDevOpsAnalyzer",
        model="gemini-2.0-flash",
        description="Performs DevOps analysis in parallel",
        instruction="""Based on the context in state['analysis_context'], perform comprehensive DevOps analysis:
        1. Infrastructure requirements
        2. Deployment strategies
        3. CI/CD pipeline recommendations
        4. Monitoring and scaling approaches

        Use the DevOps tool for detailed analysis.""",
        tools=[FunctionTool(analyze_infrastructure)],
        output_key="parallel_devops_analysis",
    )

    # QA Analysis Agent
    qa_analyzer = LlmAgent(
        name="ParallelQAAnalyzer",
        model="gemini-2.0-flash",
        description="Performs QA analysis in parallel",
        instruction="""Based on the context in state['analysis_context'], perform comprehensive QA analysis:
        1. Testing strategy recommendations
        2. Quality assurance frameworks
        3. Automation approaches
        4. Performance testing plans

        Use the QA tool for detailed analysis.""",
        tools=[FunctionTool(analyze_testing_strategy)],
        output_key="parallel_qa_analysis",
    )

    # Create parallel analysis group
    parallel_specialists = ParallelAgent(
        name="ParallelSpecialistAnalysis",
        description="Concurrent analysis by all specialist domains",
        sub_agents=[architecture_analyzer, ui_analyzer, devops_analyzer, qa_analyzer],
    )

    # Phase 3: Integration and Synthesis
    synthesis_manager = LlmAgent(
        name="SynthesisManager",
        model="gemini-2.0-flash",
        description="Integrates parallel specialist analyses into comprehensive recommendations",
        instruction="""Synthesize all parallel specialist analyses into comprehensive recommendations:

        Input Context: state['analysis_context']
        Specialist Analyses:
        - Architecture: state['parallel_architecture_analysis']
        - UI/UX: state['parallel_ui_analysis']
        - DevOps: state['parallel_devops_analysis']
        - QA: state['parallel_qa_analysis']

        Create integrated recommendations:
        1. Cross-domain synergies and conflicts
        2. Prioritized implementation approach
        3. Resource and timeline estimates
        4. Risk assessment and mitigation
        5. Success metrics and validation criteria

        Provide a cohesive, actionable plan that leverages all specialist insights.""",
        output_key="synthesized_recommendations",
    )

    # Create the complete workflow
    parallel_workflow = SequentialAgent(
        name="ParallelAnalysisWorkflow",
        description="Parallel specialist analysis with synthesis",
        sub_agents=[input_analyzer, parallel_specialists, synthesis_manager],
    )

    return parallel_workflow


# Export for VANA integration
parallel_analysis_workflow = create_parallel_analysis_workflow()

__all__ = ["create_parallel_analysis_workflow", "parallel_analysis_workflow"]
