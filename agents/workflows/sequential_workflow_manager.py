"""
Sequential Workflow Manager - ADK-Compliant Linear Task Execution

Implements Google ADK SequentialAgent pattern for managing linear task execution
with dependency chains, state propagation, and checkpoint capabilities.

Key Features:
- State propagation between sequential steps via output_key
- Error handling with graceful degradation
- Checkpoint and resume functionality
- Progress tracking and reporting
- ADK-compliant synchronous execution
"""

import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool


class SequentialWorkflowManager:
    """
    Manages linear task execution with dependency chains.
    ADK Pattern: SequentialAgent with state propagation.
    """

    def __init__(self):
        """Initialize the Sequential Workflow Manager."""
        self.checkpoints = {}  # Store workflow checkpoints
        self.progress_tracker = WorkflowProgressTracker()

    def create_sequential_workflow(
        self, task_chain: List[Dict[str, Any]], workflow_name: str = "SequentialWorkflow"
    ) -> SequentialAgent:
        """
        Create a sequential workflow from task specifications.

        Args:
            task_chain: List of task definitions with dependencies
            workflow_name: Name for the workflow

        Returns:
            Configured SequentialAgent
        """
        if not task_chain:
            raise ValueError("Task chain cannot be empty")

        sub_agents = []

        for i, task in enumerate(task_chain):
            # Validate task definition
            self._validate_task_definition(task, i)

            # Create agent for this step
            agent = LlmAgent(
                name=f"Step_{i+1}_{task['name']}",
                model="gemini-2.0-flash",
                description=task.get("description", f"Step {i+1}: {task['name']}"),
                instruction=self._build_step_instructions(task, i),
                tools=[FunctionTool(tool) for tool in task.get("tools", [])],
                output_key=f"step_{i+1}_result",  # State propagation key
            )

            # Wrap with error handling
            wrapped_agent = self._wrap_with_error_handling(agent, task, i)
            sub_agents.append(wrapped_agent)

        # Create the sequential workflow
        workflow = SequentialAgent(
            name=workflow_name, description=f"Sequential workflow with {len(task_chain)} steps", sub_agents=sub_agents
        )

        # Initialize progress tracking
        self.progress_tracker.init_workflow(workflow_name, len(task_chain))

        return workflow

    def _validate_task_definition(self, task: Dict[str, Any], index: int) -> None:
        """Validate a task definition has required fields."""
        required_fields = ["name"]
        for field in required_fields:
            if field not in task:
                raise ValueError(f"Task at index {index} missing required field: {field}")

        # Validate tools count (ADK limit)
        if len(task.get("tools", [])) > 6:
            raise ValueError(f"Task '{task['name']}' has {len(task['tools'])} tools, max is 6")

    def _build_step_instructions(self, task: Dict[str, Any], index: int) -> str:
        """Build comprehensive instructions for a workflow step."""
        base_instructions = task.get("instructions", "")

        # Add state awareness
        state_instructions = f"""
You are executing step {index + 1} in a sequential workflow.

Task: {task['name']}
{base_instructions}

Context from previous steps:
- Access previous results via state['step_X_result']
- Your output will be saved to state['step_{index + 1}_result']
- Ensure your output is compatible with downstream steps

{task.get('additional_context', '')}
"""

        return state_instructions.strip()

    def _wrap_with_error_handling(self, agent: LlmAgent, task: Dict[str, Any], index: int) -> LlmAgent:
        """Wrap an agent with error handling capabilities."""
        # In ADK, error handling is built into the agent execution
        # We store error handling config in the task metadata
        # The orchestrator will handle these during execution

        # For now, return the agent as-is since ADK handles errors internally
        # Error behavior would be implemented at the orchestrator level
        return agent

    def create_checkpoint(self, workflow_name: str, step_index: int, state: Dict[str, Any]) -> str:
        """
        Create a checkpoint for workflow recovery.

        Args:
            workflow_name: Name of the workflow
            step_index: Current step index
            state: Current workflow state

        Returns:
            Checkpoint ID
        """
        checkpoint_id = f"{workflow_name}_{int(time.time())}"

        checkpoint_data = {
            "workflow_name": workflow_name,
            "step_index": step_index,
            "state": state,
            "timestamp": datetime.now().isoformat(),
            "checkpoint_id": checkpoint_id,
        }

        self.checkpoints[checkpoint_id] = checkpoint_data

        # Also save to file for persistence (optional)
        self._save_checkpoint_to_file(checkpoint_id, checkpoint_data)

        return checkpoint_id

    def resume_from_checkpoint(self, checkpoint_id: str) -> Dict[str, Any]:
        """
        Resume workflow from a checkpoint.

        Args:
            checkpoint_id: ID of the checkpoint to resume from

        Returns:
            Checkpoint data including state and position
        """
        if checkpoint_id not in self.checkpoints:
            # Try loading from file
            checkpoint_data = self._load_checkpoint_from_file(checkpoint_id)
            if not checkpoint_data:
                raise ValueError(f"Checkpoint {checkpoint_id} not found")
            self.checkpoints[checkpoint_id] = checkpoint_data

        return self.checkpoints[checkpoint_id]

    def _save_checkpoint_to_file(self, checkpoint_id: str, data: Dict[str, Any]) -> None:
        """Save checkpoint to file for persistence."""
        import os

        checkpoint_dir = ".workflow_checkpoints"
        os.makedirs(checkpoint_dir, exist_ok=True)

        filepath = os.path.join(checkpoint_dir, f"{checkpoint_id}.json")
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

    def _load_checkpoint_from_file(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """Load checkpoint from file."""
        import os

        filepath = os.path.join(".workflow_checkpoints", f"{checkpoint_id}.json")

        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None

    def get_progress(self, workflow_name: str) -> Dict[str, Any]:
        """Get current progress of a workflow."""
        return self.progress_tracker.get_progress(workflow_name)


class WorkflowProgressTracker:
    """Tracks progress of workflow execution."""

    def __init__(self):
        self.workflows = {}

    def init_workflow(self, workflow_name: str, total_steps: int) -> None:
        """Initialize tracking for a workflow."""
        self.workflows[workflow_name] = {
            "total_steps": total_steps,
            "completed_steps": 0,
            "current_step": None,
            "start_time": time.time(),
            "step_times": [],
            "status": "initialized",
        }

    def update_progress(self, workflow_name: str, step_index: int, status: str = "in_progress") -> None:
        """Update workflow progress."""
        if workflow_name not in self.workflows:
            return

        workflow = self.workflows[workflow_name]
        workflow["current_step"] = step_index
        workflow["status"] = status

        if status == "completed":
            workflow["completed_steps"] = step_index + 1
            workflow["step_times"].append(time.time())

    def get_progress(self, workflow_name: str) -> Dict[str, Any]:
        """Get current progress information."""
        if workflow_name not in self.workflows:
            return {"status": "not_found"}

        workflow = self.workflows[workflow_name]
        elapsed_time = time.time() - workflow["start_time"]

        progress_pct = (workflow["completed_steps"] / workflow["total_steps"]) * 100

        return {
            "workflow_name": workflow_name,
            "progress_percentage": progress_pct,
            "completed_steps": workflow["completed_steps"],
            "total_steps": workflow["total_steps"],
            "current_step": workflow["current_step"],
            "elapsed_time": elapsed_time,
            "status": workflow["status"],
            "estimated_completion": self._estimate_completion(workflow, elapsed_time),
        }

    def _estimate_completion(self, workflow: Dict[str, Any], elapsed: float) -> float:
        """Estimate time to completion based on current progress."""
        if workflow["completed_steps"] == 0:
            return -1  # Cannot estimate

        avg_time_per_step = elapsed / workflow["completed_steps"]
        remaining_steps = workflow["total_steps"] - workflow["completed_steps"]

        return avg_time_per_step * remaining_steps


# Example usage functions for testing


def example_sequential_workflow():
    """Example of creating a sequential workflow."""
    manager = SequentialWorkflowManager()

    # Define a multi-step analysis workflow
    task_chain = [
        {
            "name": "requirements_analysis",
            "description": "Analyze project requirements",
            "instructions": "Extract and validate all functional and non-functional requirements",
            "tools": [],  # Using LLM capabilities
            "error_behavior": "halt_on_error",
        },
        {
            "name": "architecture_design",
            "description": "Design system architecture based on requirements",
            "instructions": "Create architecture design using requirements from step_1_result",
            "tools": [],
            "timeout": 90,
        },
        {
            "name": "implementation_plan",
            "description": "Create detailed implementation plan",
            "instructions": "Using architecture from step_2_result, create implementation tasks",
            "tools": [],
            "retry_count": 3,
        },
    ]

    workflow = manager.create_sequential_workflow(task_chain=task_chain, workflow_name="ProjectPlanningWorkflow")

    return workflow, manager


# Export for use
__all__ = ["SequentialWorkflowManager", "WorkflowProgressTracker", "example_sequential_workflow"]
