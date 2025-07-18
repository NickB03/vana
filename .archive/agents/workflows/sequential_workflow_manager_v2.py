"""
Sequential Workflow Manager V2 - Fully ADK-Compliant Implementation

Implements proper Google ADK state management patterns without manual state tracking.
Uses ADK's native state propagation and schema validation.

Key Improvements:
- No manual state arrays - uses ADK StateSchema
- Proper state propagation between agents
- ADK-compliant error handling
- Native checkpoint support via state persistence
"""

import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool


class SequentialWorkflowManagerV2:
    """
    ADK-compliant sequential workflow manager using proper state management.
    """

    def __init__(self):
        """Initialize the Sequential Workflow Manager V2."""
        self.workflows = {}  # Track created workflows

    def create_sequential_workflow(
        self, task_chain: List[Dict[str, Any]], workflow_name: str = "SequentialWorkflow"
    ) -> SequentialAgent:
        """
        Create an ADK-compliant sequential workflow with proper state management.

        Args:
            task_chain: List of task definitions
            workflow_name: Name for the workflow

        Returns:
            Configured SequentialAgent with state schema
        """
        if not task_chain:
            raise ValueError("Task chain cannot be empty")

        # Build state schema based on task chain
        state_schema = self._build_state_schema(task_chain)

        # Create sub-agents with proper state configuration
        sub_agents = []
        for i, task in enumerate(task_chain):
            agent = self._create_state_aware_agent(task, i, task_chain)
            sub_agents.append(agent)

        # Create the sequential workflow with ADK state management
        workflow = SequentialAgent(
            name=workflow_name,
            description=f"Sequential workflow with {len(task_chain)} steps",
            sub_agents=sub_agents,
            # Let ADK handle state propagation
            state_propagation_mode="sequential",  # ADK manages state flow
            initial_state=self._get_initial_state(task_chain),
        )

        # Store workflow metadata
        self.workflows[workflow_name] = {
            "task_chain": task_chain,
            "state_schema": state_schema,
            "created_at": datetime.now().isoformat(),
        }

        return workflow

    def _build_state_schema(self, task_chain: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Build ADK StateSchema for the workflow.

        This defines the structure of data flowing between agents.
        """
        properties = {
            # Workflow metadata
            "workflow_id": {"type": "string"},
            "started_at": {"type": "string"},
            "current_step": {"type": "integer"},
            # Step results - ADK will populate these automatically
            **{
                f"step_{i+1}_result": {
                    "type": "object",
                    "properties": {
                        "output": {"type": "string"},
                        "metadata": {"type": "object"},
                        "completed_at": {"type": "string"},
                    },
                }
                for i in range(len(task_chain))
            },
        }

        return {"type": "object", "properties": properties, "required": ["workflow_id", "started_at"]}

    def _create_state_aware_agent(self, task: Dict[str, Any], index: int, task_chain: List[Dict[str, Any]]) -> LlmAgent:
        """
        Create an agent that properly uses ADK state.

        Each agent can access previous step results through the state object.
        """
        # Build state-aware instructions
        instructions = self._build_state_aware_instructions(task, index, task_chain)

        # Create agent with state awareness
        agent = LlmAgent(
            name=f"Step_{index+1}_{task['name']}",
            model="gemini-2.5-flash",
            description=task.get("description", f"Step {index+1}: {task['name']}"),
            instruction=instructions,
            tools=[FunctionTool(tool) for tool in task.get("tools", [])],
            # ADK will handle state injection and extraction
            state_extractor=self._create_state_extractor(index),
            state_injector=self._create_state_injector(index),
        )

        return agent

    def _build_state_aware_instructions(
        self, task: Dict[str, Any], index: int, task_chain: List[Dict[str, Any]]
    ) -> str:
        """Build instructions that leverage ADK state."""
        base_instructions = task.get("instructions", "")

        # Build dependency information
        dependencies = []
        if index > 0:
            for i in range(index):
                prev_task = task_chain[i]
                dependencies.append(f"- Step {i+1} ({prev_task['name']}): Access via state.step_{i+1}_result")

        dependencies_text = "\n".join(dependencies) if dependencies else "- No previous steps"

        instructions = f"""
You are executing step {index + 1} in a sequential workflow.

Task: {task['name']}
{base_instructions}

ADK State Management:
- You have access to a 'state' object containing results from previous steps
- Your output will be automatically stored in state.step_{index + 1}_result
- ADK handles all state propagation - do NOT manually track state

Available Previous Results:
{dependencies_text}

Output Requirements:
- Provide structured output that downstream steps can use
- Include any metadata that might be useful for subsequent steps
- Your output will be automatically wrapped in the state object

{task.get('additional_context', '')}
"""

        return instructions.strip()

    def _create_state_extractor(self, index: int):
        """
        Create a function that extracts this step's output for state storage.
        ADK will use this to update the state after agent execution.
        """

        def extract_state(agent_output: str) -> Dict[str, Any]:
            """Extract structured data from agent output for state storage."""
            return {
                f"step_{index + 1}_result": {
                    "output": agent_output,
                    "metadata": {"step_index": index, "timestamp": datetime.now().isoformat()},
                    "completed_at": datetime.now().isoformat(),
                }
            }

        return extract_state

    def _create_state_injector(self, index: int):
        """
        Create a function that injects relevant state into the agent.
        ADK will use this to provide state context before agent execution.
        """

        def inject_state(state: Dict[str, Any]) -> Dict[str, Any]:
            """Prepare state context for agent consumption."""
            # Only provide relevant previous results
            relevant_state = {"workflow_id": state.get("workflow_id"), "current_step": index + 1}

            # Include all previous step results
            for i in range(index):
                key = f"step_{i+1}_result"
                if key in state:
                    relevant_state[key] = state[key]

            return relevant_state

        return inject_state

    def _get_initial_state(self, task_chain: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get initial state for workflow execution."""
        return {
            "workflow_id": f"wf_{int(time.time())}",
            "started_at": datetime.now().isoformat(),
            "current_step": 0,
            "total_steps": len(task_chain),
        }

    def create_resumable_workflow(
        self, task_chain: List[Dict[str, Any]], workflow_name: str, checkpoint_state: Optional[Dict[str, Any]] = None
    ) -> SequentialAgent:
        """
        Create a workflow that can resume from a checkpoint.

        ADK handles state persistence, we just need to provide the initial state.
        """
        workflow = self.create_sequential_workflow(task_chain, workflow_name)

        if checkpoint_state:
            # ADK will use this state to resume from the appropriate step
            workflow._initial_state = checkpoint_state

        return workflow

    def get_workflow_state_schema(self, workflow_name: str) -> Dict[str, Any]:
        """Get the state schema for a workflow."""
        if workflow_name not in self.workflows:
            raise ValueError(f"Workflow {workflow_name} not found")

        return self.workflows[workflow_name]["state_schema"]


# Example usage demonstrating ADK compliance
def example_adk_compliant_workflow():
    """Example of creating an ADK-compliant sequential workflow."""
    manager = SequentialWorkflowManagerV2()

    # Define a multi-step analysis workflow
    task_chain = [
        {
            "name": "data_ingestion",
            "description": "Ingest and validate input data",
            "instructions": "Load and validate the provided data, ensuring it meets quality standards",
            "tools": [],  # Tools would be actual function references
        },
        {
            "name": "data_analysis",
            "description": "Analyze ingested data",
            "instructions": "Analyze the data from step_1_result, identify patterns and insights",
            "tools": [],
        },
        {
            "name": "report_generation",
            "description": "Generate comprehensive report",
            "instructions": "Using analysis from step_2_result, create a detailed report with recommendations",
            "tools": [],
        },
    ]

    # Create workflow - ADK handles all state management
    workflow = manager.create_resumable_workflow(task_chain=task_chain, workflow_name="DataAnalysisWorkflow")

    # Example of resuming from checkpoint
    checkpoint_state = {
        "workflow_id": "wf_12345",
        "started_at": "2025-07-11T10:00:00",
        "current_step": 1,
        "step_1_result": {
            "output": "Data ingested successfully",
            "metadata": {"records": 1000},
            "completed_at": "2025-07-11T10:05:00",
        },
    }

    resumed_workflow = manager.create_resumable_workflow(
        task_chain=task_chain, workflow_name="DataAnalysisWorkflow_Resumed", checkpoint_state=checkpoint_state
    )

    return workflow, resumed_workflow, manager


# Migration helper for existing code
class SequentialWorkflowManager(SequentialWorkflowManagerV2):
    """
    Compatibility wrapper for existing code.
    Inherits from V2 to provide ADK-compliant implementation.
    """

    def __init__(self):
        super().__init__()
        # Log migration
        print("INFO: SequentialWorkflowManager now uses ADK-compliant V2 implementation")


# Export for use
__all__ = [
    "SequentialWorkflowManagerV2",
    "SequentialWorkflowManager",  # Compatibility export
    "example_adk_compliant_workflow",
]
