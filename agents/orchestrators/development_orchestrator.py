from google.adk.agents import SequentialAgent, LlmAgent
from google.adk.tools import FunctionTool
import os

from lib._tools.tool_wrappers import safe_tool

from lib._tools.orchestrated_specialist_tools import (
    code_generation_tool,
    testing_tool,
)
from lib._tools.fixed_specialist_tools import (
    documentation_tool,
    security_tool,
)


MODEL_NAME = os.getenv("VANA_MODEL_NAME", "gemini-2.0-flash")


def create_development_orchestrator() -> SequentialAgent:
    """Create orchestrator for software development tasks."""

    coder = LlmAgent(
        name="CodeGenerator",
        model=MODEL_NAME,
        instruction="Generate production ready code using code_generation_tool.",
        tools=[FunctionTool(safe_tool(code_generation_tool))],
        output_key="draft",
    )

    tester = LlmAgent(
        name="TestingSpecialist",
        model=MODEL_NAME,
        instruction="Design and run tests using testing_tool.",
        tools=[FunctionTool(safe_tool(testing_tool))],
        output_key="critique",
    )

    docs_writer = LlmAgent(
        name="DocumentationWriter",
        model=MODEL_NAME,
        instruction="Write docs using documentation_tool.",
        tools=[FunctionTool(safe_tool(documentation_tool))],
        output_key="documentation",
    )

    security_auditor = LlmAgent(
        name="SecurityAuditor",
        model=MODEL_NAME,
        instruction="Review security concerns using security_tool.",
        tools=[FunctionTool(safe_tool(security_tool))],
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
