"""
Hierarchical Task Manager - Complex Task Decomposition
Implements Google ADK hierarchical agent patterns for complex task orchestration.
"""

import os
import sys
from enum import Enum
from typing import Any, Dict

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from agents.specialists.architecture_specialist import analyze_system_architecture
from agents.specialists.devops_specialist import analyze_infrastructure
from agents.specialists.qa_specialist import analyze_testing_strategy
from agents.specialists.ui_specialist import analyze_user_interface
from lib._tools import adk_transfer_to_agent

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


# Import specialist functions

# Import workflows


class TaskComplexity(Enum):
    """Task complexity levels for orchestration decisions."""

    SIMPLE = "simple"  # Single specialist can handle
    MODERATE = "moderate"  # Multiple specialists needed
    COMPLEX = "complex"  # Full workflow required
    ENTERPRISE = "enterprise"  # Hierarchical decomposition needed


class TaskType(Enum):
    """Task types for specialist routing."""

    ANALYSIS = "analysis"
    DESIGN = "design"
    IMPLEMENTATION = "implementation"
    OPTIMIZATION = "optimization"
    TROUBLESHOOTING = "troubleshooting"


def analyze_task_complexity(task_description: str) -> Dict[str, Any]:
    """Analyze task complexity and determine orchestration strategy."""

    # Complexity indicators
    complexity_indicators = {
        "simple": ["question", "explain", "what is", "how to", "example"],
        "moderate": ["design", "plan", "strategy", "approach", "recommend"],
        "complex": ["project", "system", "application", "platform", "solution"],
        "enterprise": [
            "enterprise",
            "large-scale",
            "multi-team",
            "organization",
            "migration",
        ],
    }

    # Count indicators
    scores = {}
    for level, indicators in complexity_indicators.items():
        score = sum(1 for indicator in indicators if indicator.lower() in task_description.lower())
        scores[level] = score

    # Determine complexity
    max_score = max(scores.values())
    if max_score == 0:
        complexity = TaskComplexity.SIMPLE
    else:
        complexity_level = max(scores, key=scores.get)
        complexity = TaskComplexity(complexity_level)

    # Determine task type
    task_type_indicators = {
        "analysis": ["analyze", "evaluate", "assess", "review", "examine"],
        "design": ["design", "create", "build", "develop", "architect"],
        "implementation": ["implement", "deploy", "execute", "build", "develop"],
        "optimization": ["optimize", "improve", "enhance", "refactor", "scale"],
        "troubleshooting": ["fix", "debug", "solve", "troubleshoot", "resolve"],
    }

    task_scores = {}
    for task_type, indicators in task_type_indicators.items():
        score = sum(1 for indicator in indicators if indicator.lower() in task_description.lower())
        task_scores[task_type] = score

    task_type = TaskType.ANALYSIS  # Default
    if max(task_scores.values()) > 0:
        task_type_str = max(task_scores, key=task_scores.get)
        task_type = TaskType(task_type_str)

    return {
        "complexity": complexity,
        "task_type": task_type,
        "complexity_scores": scores,
        "task_type_scores": task_scores,
        "recommended_approach": _get_recommended_approach(complexity, task_type),
    }


def _get_recommended_approach(complexity: TaskComplexity, task_type: TaskType) -> str:
    """Get recommended orchestration approach based on complexity and type."""

    if complexity == TaskComplexity.SIMPLE:
        return "single_specialist"
    elif complexity == TaskComplexity.MODERATE:
        if task_type in [TaskType.ANALYSIS, TaskType.TROUBLESHOOTING]:
            return "parallel_analysis"
        else:
            return "sequential_workflow"
    elif complexity == TaskComplexity.COMPLEX:
        return "full_project_workflow"
    else:  # ENTERPRISE
        return "hierarchical_decomposition"


def create_hierarchical_task_manager() -> LlmAgent:
    """Create the main hierarchical task manager agent."""

    task_orchestrator = LlmAgent(
        name="HierarchicalTaskManager",
        model="gemini-2.5-flash",
        description="Master orchestrator for complex task management and intelligent routing",
        instruction="""You are the Master Orchestrator for VANA's agentic AI system. Your role is to:

1. **Analyze Task Complexity**: Use analyze_task_complexity to determine:
   - SIMPLE: Single specialist can handle (route directly)
   - MODERATE: Multiple specialists needed (use parallel/sequential workflow)
   - COMPLEX: Full project workflow required
   - ENTERPRISE: Hierarchical decomposition needed

2. **Route to Specialists**: Based on task type and requirements:
   - architecture_specialist: System design, scalability, patterns
   - devops_specialist: Infrastructure, deployment, monitoring
   - qa_specialist: Testing, quality assurance, validation
   - ui_specialist: User interface, UX design, frontend
   - data_science_specialist: ML, data analysis, statistics

3. **Coordinate Workflows**: For complex tasks:
   - Sequential: Step-by-step execution
   - Parallel: Concurrent specialist analysis
   - Iterative: Refinement loops
   - Hierarchical: Break into sub-projects

4. **Monitor & Integrate**: Track progress and combine results

ROUTING PROTOCOL:
- ALWAYS analyze task complexity first
- For SIMPLE tasks: Use route_to_specialist directly
- For MODERATE+ tasks: Use coordinate_workflow
- Provide clear status updates to the user

Available specialists: architecture, devops, qa, ui, data_science""",
        tools=[
            FunctionTool(analyze_task_complexity),
            FunctionTool(route_to_specialist),
            FunctionTool(coordinate_workflow),
            FunctionTool(decompose_enterprise_task),
            adk_transfer_to_agent,  # For delegating to specialists
        ],
        output_key="orchestration_result",
    )

    return task_orchestrator


def route_to_specialist(task_description: str, specialist_type: str) -> str:
    """Route simple tasks to appropriate specialist."""

    specialist_functions = {
        "architecture": analyze_system_architecture,
        "ui": analyze_user_interface,
        "devops": analyze_infrastructure,
        "qa": analyze_testing_strategy,
    }

    if specialist_type not in specialist_functions:
        return f"Unknown specialist type: {specialist_type}"

    try:
        # This would call the specialist function with the task
        result = f"Routed task to {specialist_type} specialist: {task_description[:100]}..."
        return result
    except Exception as e:
        return f"Error routing to specialist: {str(e)}"


def coordinate_workflow(workflow_type: str, task_description: str) -> str:
    """Coordinate execution of complex workflows."""

    workflow_map = {
        "parallel_analysis": "Parallel specialist analysis workflow",
        "sequential_workflow": "Sequential project development workflow",
        "iterative_refinement": "Iterative refinement workflow",
        "full_project": "Complete project development workflow",
    }

    if workflow_type not in workflow_map:
        return f"Unknown workflow type: {workflow_type}"

    try:
        # This would initiate the appropriate workflow
        result = f"Coordinating {workflow_map[workflow_type]} for: {task_description[:100]}..."
        return result
    except Exception as e:
        return f"Error coordinating workflow: {str(e)}"


def decompose_enterprise_task(task_description: str) -> str:
    """Decompose enterprise-scale tasks into manageable sub-projects."""

    # Enterprise task decomposition patterns
    decomposition_patterns = {
        "migration": [
            "Assessment and planning phase",
            "Architecture design phase",
            "Implementation phase",
            "Testing and validation phase",
            "Deployment and rollout phase",
            "Monitoring and optimization phase",
        ],
        "platform": [
            "Requirements analysis phase",
            "Platform architecture phase",
            "Core services development phase",
            "Integration and APIs phase",
            "Security and compliance phase",
            "Deployment and scaling phase",
        ],
        "transformation": [
            "Current state analysis phase",
            "Future state design phase",
            "Gap analysis and planning phase",
            "Implementation roadmap phase",
            "Change management phase",
            "Success measurement phase",
        ],
    }

    # Determine decomposition pattern
    pattern = "platform"  # Default
    for key in decomposition_patterns.keys():
        if key in task_description.lower():
            pattern = key
            break

    phases = decomposition_patterns[pattern]

    result = f"Enterprise task decomposed into {len(phases)} phases:\n"
    for i, phase in enumerate(phases, 1):
        result += f"{i}. {phase}\n"

    result += "\nEach phase will be managed as a separate complex project with full specialist coordination."

    return result


# Create the hierarchical task manager
hierarchical_task_manager = create_hierarchical_task_manager()

__all__ = [
    "TaskComplexity",
    "TaskType",
    "analyze_task_complexity",
    "create_hierarchical_task_manager",
    "hierarchical_task_manager",
    "route_to_specialist",
    "coordinate_workflow",
    "decompose_enterprise_task",
]
