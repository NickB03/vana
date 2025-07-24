"""
Loop Workflow Manager - ADK-Compliant Iterative Task Execution

Implements Google ADK patterns for iterative workflows with configurable loop conditions,
iteration limits, and adaptive behavior.

Key Features:
- Condition-based loops (while-style)
- Fixed iteration loops (for-style)
- Adaptive loops with dynamic conditions
- Break conditions and early termination
- Loop state accumulation
- Infinite loop prevention
"""

import json
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Union

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool


class LoopStateManager:
    """Manages state across loop iterations."""

    def __init__(self):
        """Initialize loop state manager."""
        self.iterations = {}
        self.accumulated_results = {}
        self.break_conditions_met = {}

    def init_loop(self, loop_id: str) -> None:
        """Initialize state for a new loop."""
        self.iterations[loop_id] = 0
        self.accumulated_results[loop_id] = []
        self.break_conditions_met[loop_id] = False

    def increment_iteration(self, loop_id: str) -> int:
        """Increment and return iteration count."""
        self.iterations[loop_id] += 1
        return self.iterations[loop_id]

    def add_result(self, loop_id: str, result: Any) -> None:
        """Add iteration result to accumulated results."""
        self.accumulated_results[loop_id].append(
            {"iteration": self.iterations[loop_id], "result": result, "timestamp": time.time()}
        )

    def set_break_condition(self, loop_id: str) -> None:
        """Mark that break condition has been met."""
        self.break_conditions_met[loop_id] = True

    def should_break(self, loop_id: str) -> bool:
        """Check if loop should break."""
        return self.break_conditions_met.get(loop_id, False)

    def get_loop_summary(self, loop_id: str) -> Dict[str, Any]:
        """Get summary of loop execution."""
        return {
            "total_iterations": self.iterations.get(loop_id, 0),
            "accumulated_results": self.accumulated_results.get(loop_id, []),
            "break_condition_met": self.break_conditions_met.get(loop_id, False),
        }


class LoopConditionEvaluator:
    """Evaluates loop continuation conditions."""

    @staticmethod
    def evaluate_numeric_condition(current: int, target: int, operator: str) -> bool:
        """Evaluate numeric loop conditions."""
        operators = {
            "<": lambda x, y: x < y,
            "<=": lambda x, y: x <= y,
            ">": lambda x, y: x > y,
            ">=": lambda x, y: x >= y,
            "==": lambda x, y: x == y,
            "!=": lambda x, y: x != y,
        }
        return operators.get(operator, lambda x, y: False)(current, target)

    @staticmethod
    def evaluate_state_condition(state: Dict[str, Any], condition_fn: Callable) -> bool:
        """Evaluate custom state-based conditions."""
        try:
            return condition_fn(state)
        except Exception:
            return False

    @staticmethod
    def evaluate_convergence(results: List[Any], threshold: float = 0.01) -> bool:
        """Check if results have converged."""
        if len(results) < 2:
            return False

        # Simple convergence check for numeric results
        try:
            last_two = results[-2:]
            if all(isinstance(r, (int, float)) for r in last_two):
                return abs(last_two[1] - last_two[0]) < threshold
        except:
            pass

        return False


class LoopWorkflowManager:
    """
    Manages iterative task execution with loop control.
    ADK Pattern: Sequential execution with conditional repetition.
    """

    def __init__(self):
        """Initialize the Loop Workflow Manager."""
        self.state_manager = LoopStateManager()
        self.condition_evaluator = LoopConditionEvaluator()
        self.active_loops = {}

    def create_fixed_loop_workflow(
        self, loop_task: Dict[str, Any], iterations: int, workflow_name: str = "FixedLoopWorkflow"
    ) -> SequentialAgent:
        """
        Create a fixed iteration loop (for-style).

        Args:
            loop_task: Task definition to repeat
            iterations: Number of iterations
            workflow_name: Name for the workflow

        Returns:
            Configured SequentialAgent with loop iterations
        """
        if iterations < 1:
            raise ValueError("Iterations must be at least 1")

        if iterations > 100:
            raise ValueError("Iterations cannot exceed 100 (safety limit)")

        # Validate task
        self._validate_loop_task(loop_task)

        # Create agents for each iteration
        sub_agents = []

        for i in range(iterations):
            agent = LlmAgent(
                name=f"Loop_{i+1}_{loop_task['name']}",
                model="gemini-2.5-flash",
                description=f"Iteration {i+1} of {iterations}: {loop_task.get('description', '')}",
                instruction=self._create_iteration_instruction(
                    loop_task["instruction"], i + 1, iterations, loop_task.get("accumulate_results", False)
                ),
                tools=[FunctionTool(tool) for tool in loop_task.get("tools", [])][:6],
                output_key=f"iteration_{i+1}_result",
            )
            sub_agents.append(agent)

        # Create workflow
        workflow = SequentialAgent(
            name=workflow_name, description=f"Fixed loop workflow with {iterations} iterations", sub_agents=sub_agents
        )

        # Initialize state tracking
        self.state_manager.init_loop(workflow_name)

        return workflow

    def create_conditional_loop_workflow(
        self,
        loop_task: Dict[str, Any],
        condition: Dict[str, Any],
        max_iterations: int = 10,
        workflow_name: str = "ConditionalLoopWorkflow",
    ) -> SequentialAgent:
        """
        Create a conditional loop (while-style).

        Args:
            loop_task: Task definition to repeat
            condition: Loop condition configuration
            max_iterations: Maximum iterations (safety limit)
            workflow_name: Name for the workflow

        Returns:
            Configured SequentialAgent with conditional logic

        Condition types:
        - numeric: {'type': 'numeric', 'target': 10, 'operator': '<'}
        - convergence: {'type': 'convergence', 'threshold': 0.01}
        - custom: {'type': 'custom', 'evaluator': callable}
        """
        if max_iterations > 100:
            raise ValueError("Max iterations cannot exceed 100 (safety limit)")

        # Validate inputs
        self._validate_loop_task(loop_task)
        self._validate_condition(condition)

        # Create condition evaluator agent
        condition_agent = self._create_condition_evaluator(condition, workflow_name)

        # Create loop body agents
        sub_agents = [condition_agent]

        # For ADK compatibility, we pre-create a reasonable number of iterations
        # The condition evaluator will signal when to stop
        for i in range(min(max_iterations, 10)):  # Start with 10, can extend
            agent = LlmAgent(
                name=f"ConditionalLoop_{i+1}_{loop_task['name']}",
                model="gemini-2.5-flash",
                description=f"Conditional iteration {i+1}: {loop_task.get('description', '')}",
                instruction=self._create_conditional_instruction(loop_task["instruction"], i + 1, condition),
                tools=[FunctionTool(tool) for tool in loop_task.get("tools", [])][:6],
                output_key=f"conditional_iteration_{i+1}_result",
            )
            sub_agents.append(agent)

        # Create workflow
        workflow = SequentialAgent(
            name=workflow_name,
            description=f"Conditional loop workflow with {condition['type']} condition",
            sub_agents=sub_agents,
        )

        # Initialize state tracking
        self.state_manager.init_loop(workflow_name)
        self.active_loops[workflow_name] = {"condition": condition, "max_iterations": max_iterations, "task": loop_task}

        return workflow

    def create_adaptive_loop_workflow(
        self,
        loop_task: Dict[str, Any],
        adaptation_strategy: Dict[str, Any],
        workflow_name: str = "AdaptiveLoopWorkflow",
    ) -> SequentialAgent:
        """
        Create an adaptive loop that modifies behavior based on results.

        Args:
            loop_task: Base task definition
            adaptation_strategy: How to adapt between iterations
            workflow_name: Name for the workflow

        Returns:
            Configured SequentialAgent with adaptive behavior

        Adaptation strategies:
        - parameter_tuning: Adjust task parameters based on results
        - progressive_refinement: Each iteration refines previous results
        - exploration: Try different approaches until success
        """
        # Validate inputs
        self._validate_loop_task(loop_task)
        self._validate_adaptation_strategy(adaptation_strategy)

        # Create adaptive controller
        controller = self._create_adaptive_controller(adaptation_strategy, workflow_name)

        # Create adaptive loop agents
        sub_agents = [controller]
        max_adaptations = adaptation_strategy.get("max_adaptations", 5)

        for i in range(max_adaptations):
            agent = LlmAgent(
                name=f"Adaptive_{i+1}_{loop_task['name']}",
                model="gemini-2.5-flash",
                description=f"Adaptive iteration {i+1}: {loop_task.get('description', '')}",
                instruction=self._create_adaptive_instruction(loop_task["instruction"], i + 1, adaptation_strategy),
                tools=[FunctionTool(tool) for tool in loop_task.get("tools", [])][:6],
                output_key=f"adaptive_{i+1}_result",
            )
            sub_agents.append(agent)

        # Create workflow
        workflow = SequentialAgent(
            name=workflow_name,
            description=f"Adaptive loop with {adaptation_strategy['type']} strategy",
            sub_agents=sub_agents,
        )

        # Initialize tracking
        self.state_manager.init_loop(workflow_name)

        return workflow

    def _validate_loop_task(self, task: Dict[str, Any]) -> None:
        """Validate loop task definition."""
        if "name" not in task:
            raise ValueError("Loop task must have a 'name' field")

        if "instruction" not in task:
            raise ValueError("Loop task must have an 'instruction' field")

        if len(task.get("tools", [])) > 6:
            raise ValueError(f"Task has {len(task['tools'])} tools, max is 6")

    def _validate_condition(self, condition: Dict[str, Any]) -> None:
        """Validate loop condition."""
        if "type" not in condition:
            raise ValueError("Condition must have a 'type' field")

        valid_types = ["numeric", "convergence", "custom", "state_based"]
        if condition["type"] not in valid_types:
            raise ValueError(f"Invalid condition type: {condition['type']}")

    def _validate_adaptation_strategy(self, strategy: Dict[str, Any]) -> None:
        """Validate adaptation strategy."""
        if "type" not in strategy:
            raise ValueError("Adaptation strategy must have a 'type' field")

        valid_types = ["parameter_tuning", "progressive_refinement", "exploration"]
        if strategy["type"] not in valid_types:
            raise ValueError(f"Invalid adaptation type: {strategy['type']}")

    def _create_iteration_instruction(self, base_instruction: str, iteration: int, total: int, accumulate: bool) -> str:
        """Create instruction for fixed iteration."""
        instruction = f"""Iteration {iteration} of {total}:

{base_instruction}

Context:
- This is iteration {iteration} out of {total} total iterations
- Previous iterations: {iteration - 1}
- Remaining iterations: {total - iteration}
"""

        if accumulate and iteration > 1:
            instruction += f"""
- Previous results are available in state['iteration_{iteration-1}_result']
- Build upon or refine the previous iteration's work
"""

        return instruction

    def _create_conditional_instruction(self, base_instruction: str, iteration: int, condition: Dict[str, Any]) -> str:
        """Create instruction for conditional iteration."""
        return f"""Conditional Loop - Iteration {iteration}:

{base_instruction}

Loop Condition: {condition['type']}
- Continue until condition is met
- Provide clear indication if condition is satisfied
- Include metrics relevant to the condition in your output

If this iteration achieves the loop condition, clearly state: "LOOP_CONDITION_MET"
"""

    def _create_adaptive_instruction(self, base_instruction: str, iteration: int, strategy: Dict[str, Any]) -> str:
        """Create instruction for adaptive iteration."""
        return f"""Adaptive Loop - Iteration {iteration}:

{base_instruction}

Adaptation Strategy: {strategy['type']}
- Learn from previous iterations
- Adjust approach based on results
- Optimize for {strategy.get('optimization_target', 'best outcome')}

Previous results available in state for analysis and improvement.
"""

    def _create_condition_evaluator(self, condition: Dict[str, Any], workflow_name: str) -> LlmAgent:
        """Create an agent that evaluates loop conditions."""
        return LlmAgent(
            name="LoopConditionEvaluator",
            model="gemini-2.5-flash",
            description="Evaluates whether loop should continue",
            instruction=f"""Evaluate the loop condition for workflow: {workflow_name}

Condition Type: {condition['type']}
Condition Details: {json.dumps(condition, indent=2)}

Analyze the current state and determine if the loop should continue.
Output "CONTINUE_LOOP" or "BREAK_LOOP" based on the condition evaluation.

For numeric conditions: Check if the target value has been reached.
For convergence: Check if results have stabilized.
For custom conditions: Apply the specified evaluation logic.
""",
            output_key="loop_condition_evaluation",
        )

    def _create_adaptive_controller(self, strategy: Dict[str, Any], workflow_name: str) -> LlmAgent:
        """Create an agent that controls adaptive behavior."""
        return LlmAgent(
            name="AdaptiveLoopController",
            model="gemini-2.5-flash",
            description="Controls adaptive loop behavior",
            instruction=f"""Control adaptive loop execution for: {workflow_name}

Adaptation Strategy: {strategy['type']}
Strategy Details: {json.dumps(strategy, indent=2)}

Based on previous iteration results:
1. Analyze what worked and what didn't
2. Suggest parameter adjustments or approach changes
3. Define success criteria for the next iteration
4. Determine if adaptation should continue or terminate

Output adaptation instructions for the next iteration.
""",
            output_key="adaptation_instructions",
        )

    def get_loop_status(self, workflow_name: str) -> Dict[str, Any]:
        """Get current status of a loop workflow."""
        summary = self.state_manager.get_loop_summary(workflow_name)

        if workflow_name in self.active_loops:
            summary["loop_config"] = self.active_loops[workflow_name]

        return summary

    def should_terminate_loop(self, workflow_name: str, current_state: Dict[str, Any]) -> bool:
        """Determine if a loop should terminate."""
        # Check break condition
        if self.state_manager.should_break(workflow_name):
            return True

        # Check iteration limit
        current_iteration = self.state_manager.iterations.get(workflow_name, 0)
        if workflow_name in self.active_loops:
            max_iterations = self.active_loops[workflow_name].get("max_iterations", 100)
            if current_iteration >= max_iterations:
                return True

        # Check custom conditions
        if workflow_name in self.active_loops:
            condition = self.active_loops[workflow_name].get("condition", {})
            if condition.get("type") == "custom" and "evaluator" in condition:
                return not condition["evaluator"](current_state)

        return False


# Example usage functions


def example_fixed_loop():
    """Example of creating a fixed iteration loop."""
    manager = LoopWorkflowManager()

    # Define a task to repeat 5 times
    data_collection_task = {
        "name": "collect_metrics",
        "description": "Collect performance metrics",
        "instruction": "Gather system performance metrics and analyze trends",
        "tools": [],
        "accumulate_results": True,
    }

    workflow = manager.create_fixed_loop_workflow(
        loop_task=data_collection_task, iterations=5, workflow_name="MetricsCollectionLoop"
    )

    return workflow, manager


def example_conditional_loop():
    """Example of creating a conditional loop."""
    manager = LoopWorkflowManager()

    # Define optimization task
    optimization_task = {
        "name": "optimize_performance",
        "description": "Iteratively optimize performance",
        "instruction": "Analyze current performance and suggest improvements",
        "tools": [],
    }

    # Define convergence condition
    condition = {"type": "convergence", "threshold": 0.01, "metric": "performance_score"}

    workflow = manager.create_conditional_loop_workflow(
        loop_task=optimization_task, condition=condition, max_iterations=20, workflow_name="PerformanceOptimizationLoop"
    )

    return workflow, manager


def example_adaptive_loop():
    """Example of creating an adaptive loop."""
    manager = LoopWorkflowManager()

    # Define base task
    model_training_task = {
        "name": "train_model",
        "description": "Train and refine model",
        "instruction": "Train model with current parameters and evaluate performance",
        "tools": [],
    }

    # Define adaptation strategy
    adaptation_strategy = {
        "type": "parameter_tuning",
        "parameters": ["learning_rate", "batch_size", "epochs"],
        "optimization_target": "validation_accuracy",
        "max_adaptations": 10,
    }

    workflow = manager.create_adaptive_loop_workflow(
        loop_task=model_training_task,
        adaptation_strategy=adaptation_strategy,
        workflow_name="ModelTrainingAdaptiveLoop",
    )

    return workflow, manager


# Export for use
__all__ = [
    "LoopWorkflowManager",
    "LoopStateManager",
    "LoopConditionEvaluator",
    "example_fixed_loop",
    "example_conditional_loop",
    "example_adaptive_loop",
]
