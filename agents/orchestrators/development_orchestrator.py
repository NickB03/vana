from google.adk.agents import SequentialAgent, LlmAgent
from google.adk.tools import FunctionTool

from lib._tools.orchestrated_specialist_tools import (
    code_generation_tool,
    testing_tool,
)
from lib._tools.fixed_specialist_tools import (
    documentation_tool,
    security_tool,
)


def create_development_orchestrator() -> SequentialAgent:
    """Create orchestrator for software development tasks."""

    coder = LlmAgent(
        name="CodeGenerator",
        model="gemini-2.0-flash",
        instruction="Generate production ready code using code_generation_tool.",
        tools=[FunctionTool(code_generation_tool)],
        output_key="draft",
    )

    tester = LlmAgent(
        name="TestingSpecialist",
        model="gemini-2.0-flash",
        instruction="Design and run tests using testing_tool.",
        tools=[FunctionTool(testing_tool)],
        output_key="critique",
    )

    docs_writer = LlmAgent(
        name="DocumentationWriter",
        model="gemini-2.0-flash",
        instruction="Write docs using documentation_tool.",
        tools=[FunctionTool(documentation_tool)],
        output_key="documentation",
    )

    security_auditor = LlmAgent(
        name="SecurityAuditor",
        model="gemini-2.0-flash",
        instruction="Review security concerns using security_tool.",
        tools=[FunctionTool(security_tool)],
        output_key="security_report",
    )

    return SequentialAgent(
        name="DevelopmentOrchestrator",
        description="Coordinates code generation, testing and docs",
        sub_agents=[
            coder,
            tester,
            docs_writer,
            security_auditor,
        ],
    )


development_orchestrator = create_development_orchestrator()

__all__ = ["create_development_orchestrator", "development_orchestrator"]
