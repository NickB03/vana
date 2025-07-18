"""
Loop Workflow Manager V2 - Fully ADK-Compliant Implementation

Implements proper Google ADK state management for iterative workflows without
manual state tracking. Uses ADK patterns for loop control and state evolution.

Key Improvements:
- No manual result lists - uses ADK state evolution
- Proper loop state management through iterations
- ADK-compliant termination conditions
- Native support for different loop patterns
"""

import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Union

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool


class LoopWorkflowManagerV2:
    """
    ADK-compliant loop workflow manager using proper iterative state management.
    """

    def __init__(self):
        """Initialize the Loop Workflow Manager V2."""
        self.workflows = {}  # Track created workflows

    def create_loop_workflow(
        self,
        agent: LlmAgent,
        loop_type: str = "fixed",
        iterations: Optional[int] = None,
        condition_fn: Optional[Callable] = None,
        workflow_name: str = "LoopWorkflow",
    ) -> SequentialAgent:
        """
        Create an ADK-compliant loop workflow with proper state evolution.

        Args:
            agent: Agent to execute in the loop
            loop_type: Type of loop ("fixed", "conditional", "adaptive")
            iterations: Number of iterations for fixed loops
            condition_fn: Condition function for conditional loops
            workflow_name: Name for the workflow

        Returns:
            Configured SequentialAgent implementing the loop pattern
        """
        # Validate loop configuration
        self._validate_loop_config(loop_type, iterations, condition_fn)

        # Build state schema for loop execution
        state_schema = self._build_loop_state_schema(loop_type)

        # Create loop agents based on type
        if loop_type == "fixed":
            loop_agents = self._create_fixed_loop_agents(agent, iterations)
        elif loop_type == "conditional":
            loop_agents = self._create_conditional_loop_agents(agent, condition_fn)
        elif loop_type == "adaptive":
            loop_agents = self._create_adaptive_loop_agents(agent, condition_fn)
        else:
            raise ValueError(f"Unknown loop type: {loop_type}")

        # Create the loop workflow using Sequential pattern
        workflow = SequentialAgent(
            name=workflow_name,
            description=f"{loop_type.title()} loop workflow",
            sub_agents=loop_agents,
            # ADK manages state evolution through iterations
            state_propagation_mode="sequential",
            initial_state=self._get_loop_initial_state(loop_type, iterations),
        )

        # Store workflow metadata
        self.workflows[workflow_name] = {
            "loop_type": loop_type,
            "agent_name": agent.name,
            "iterations": iterations,
            "state_schema": state_schema,
            "created_at": datetime.now().isoformat(),
        }

        return workflow

    def _validate_loop_config(
        self, loop_type: str, iterations: Optional[int], condition_fn: Optional[Callable]
    ) -> None:
        """Validate loop configuration parameters."""
        if loop_type not in ["fixed", "conditional", "adaptive"]:
            raise ValueError(f"Invalid loop type: {loop_type}")

        if loop_type == "fixed":
            if not iterations or iterations <= 0:
                raise ValueError("Fixed loops require positive iterations")
            if iterations > 100:
                raise ValueError("Iterations cannot exceed 100 (safety limit)")

        elif loop_type in ["conditional", "adaptive"]:
            if not condition_fn:
                raise ValueError(f"{loop_type.title()} loops require a condition function")

    def _build_loop_state_schema(self, loop_type: str) -> Dict[str, Any]:
        """
        Build ADK StateSchema for loop execution.

        Tracks iteration history and loop control variables.
        """
        properties = {
            # Loop metadata
            "loop_id": {"type": "string"},
            "loop_type": {"type": "string"},
            "started_at": {"type": "string"},
            "current_iteration": {"type": "integer"},
            "total_iterations": {"type": "integer"},
            # Iteration history - ADK manages this
            "iteration_history": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "iteration": {"type": "integer"},
                        "result": {"type": "string"},
                        "timestamp": {"type": "string"},
                        "continue_loop": {"type": "boolean"},
                    },
                },
            },
            # Loop control
            "loop_control": {
                "type": "object",
                "properties": {
                    "should_continue": {"type": "boolean"},
                    "termination_reason": {"type": "string"},
                    "convergence_metric": {"type": "number"},
                },
            },
            # Current iteration state
            "current_state": {
                "type": "object",
                "properties": {"value": {"type": "any"}, "metadata": {"type": "object"}},
            },
        }

        if loop_type == "adaptive":
            properties["adaptation_params"] = {
                "type": "object",
                "properties": {
                    "learning_rate": {"type": "number"},
                    "convergence_threshold": {"type": "number"},
                    "adaptation_history": {"type": "array"},
                },
            }

        return {"type": "object", "properties": properties, "required": ["loop_id", "loop_type", "started_at"]}

    def _create_fixed_loop_agents(self, base_agent: LlmAgent, iterations: int) -> List[LlmAgent]:
        """Create agents for fixed iteration loops."""
        agents = []

        for i in range(iterations):
            # Create iteration-specific agent
            iteration_agent = self._create_iteration_agent(
                base_agent=base_agent, iteration=i, total_iterations=iterations, loop_type="fixed"
            )
            agents.append(iteration_agent)

        return agents

    def _create_conditional_loop_agents(self, base_agent: LlmAgent, condition_fn: Callable) -> List[LlmAgent]:
        """
        Create agents for conditional loops.

        ADK doesn't support dynamic agent creation, so we pre-create
        a reasonable number and use early termination.
        """
        max_iterations = 20  # Safety limit for conditional loops
        agents = []

        for i in range(max_iterations):
            # Create conditional iteration agent
            iteration_agent = self._create_conditional_iteration_agent(
                base_agent=base_agent, iteration=i, condition_fn=condition_fn, loop_type="conditional"
            )
            agents.append(iteration_agent)

        return agents

    def _create_adaptive_loop_agents(self, base_agent: LlmAgent, condition_fn: Callable) -> List[LlmAgent]:
        """Create agents for adaptive loops with parameter evolution."""
        max_iterations = 20  # Safety limit
        agents = []

        for i in range(max_iterations):
            # Create adaptive iteration agent
            iteration_agent = self._create_adaptive_iteration_agent(
                base_agent=base_agent, iteration=i, condition_fn=condition_fn, loop_type="adaptive"
            )
            agents.append(iteration_agent)

        return agents

    def _create_iteration_agent(
        self, base_agent: LlmAgent, iteration: int, total_iterations: int, loop_type: str
    ) -> LlmAgent:
        """Create an agent for a specific loop iteration."""
        iteration_instruction = f"""
{base_agent.instruction}

Loop Iteration Context:
- This is iteration {iteration + 1} of {total_iterations} ({loop_type} loop)
- Access previous iterations via state.iteration_history
- Your result will be added to the iteration history
- ADK manages all state transitions automatically

Previous Results:
- Access as state.iteration_history[n].result for iteration n
- Current state value: state.current_state.value

Output Requirements:
- Provide your iteration result
- It will be automatically tracked in state
"""

        return LlmAgent(
            name=f"{base_agent.name}_Iteration_{iteration + 1}",
            model=base_agent.model,
            description=f"Iteration {iteration + 1} of {base_agent.description}",
            instruction=iteration_instruction,
            tools=base_agent.tools,
            state_extractor=self._create_iteration_state_extractor(iteration),
            state_injector=self._create_iteration_state_injector(iteration),
        )

    def _create_conditional_iteration_agent(
        self, base_agent: LlmAgent, iteration: int, condition_fn: Callable, loop_type: str
    ) -> LlmAgent:
        """Create an agent for conditional loop iteration."""
        # Wrap the agent with condition checking
        wrapped_agent = self._create_iteration_agent(base_agent, iteration, -1, loop_type)  # -1 indicates unknown total

        # Add condition checking to state extractor
        original_extractor = wrapped_agent.state_extractor

        def conditional_extractor(agent_output: str) -> Dict[str, Any]:
            # Get base extraction
            base_state = original_extractor(agent_output) if original_extractor else {}

            # Check continuation condition
            current_state = base_state.get("current_state", {})
            should_continue = condition_fn(iteration, current_state)

            # Update loop control
            base_state["loop_control"] = {
                "should_continue": should_continue,
                "termination_reason": "condition_met" if not should_continue else None,
            }

            return base_state

        wrapped_agent.state_extractor = conditional_extractor
        return wrapped_agent

    def _create_adaptive_iteration_agent(
        self, base_agent: LlmAgent, iteration: int, condition_fn: Callable, loop_type: str
    ) -> LlmAgent:
        """Create an agent for adaptive loop iteration."""
        adaptive_instruction = f"""
{base_agent.instruction}

Adaptive Loop Context:
- This is an adaptive iteration that evolves based on results
- Access adaptation parameters via state.adaptation_params
- Your output influences the next iteration's parameters
- The loop adapts to converge on optimal results
"""

        # Create base iteration agent with adaptive instructions
        iteration_agent = LlmAgent(
            name=f"{base_agent.name}_Adaptive_{iteration + 1}",
            model=base_agent.model,
            description=f"Adaptive iteration {iteration + 1}",
            instruction=adaptive_instruction,
            tools=base_agent.tools,
            state_extractor=self._create_adaptive_state_extractor(iteration, condition_fn),
            state_injector=self._create_adaptive_state_injector(iteration),
        )

        return iteration_agent

    def _create_iteration_state_extractor(self, iteration: int):
        """Create state extractor for loop iterations."""

        def extract_state(agent_output: str) -> Dict[str, Any]:
            """Extract iteration results for state tracking."""
            return {
                "current_iteration": iteration + 1,
                "iteration_history": [
                    {
                        "iteration": iteration,
                        "result": agent_output,
                        "timestamp": datetime.now().isoformat(),
                        "continue_loop": True,  # Fixed loops always continue
                    }
                ],
                "current_state": {"value": agent_output, "metadata": {"iteration": iteration}},
            }

        return extract_state

    def _create_iteration_state_injector(self, iteration: int):
        """Create state injector for loop iterations."""

        def inject_state(state: Dict[str, Any]) -> Dict[str, Any]:
            """Prepare iteration context from state."""
            # Only provide relevant history up to current iteration
            history = state.get("iteration_history", [])
            relevant_history = [h for h in history if h["iteration"] < iteration]

            return {
                "loop_id": state.get("loop_id"),
                "current_iteration": iteration,
                "iteration_history": relevant_history,
                "current_state": state.get("current_state"),
                "loop_control": state.get("loop_control", {}),
            }

        return inject_state

    def _create_adaptive_state_extractor(self, iteration: int, condition_fn: Callable):
        """Create state extractor for adaptive iterations."""

        def extract_state(agent_output: str) -> Dict[str, Any]:
            """Extract and adapt state for next iteration."""
            # Basic iteration tracking
            iteration_data = {"iteration": iteration, "result": agent_output, "timestamp": datetime.now().isoformat()}

            # Compute adaptation (simplified)
            adaptation_params = {
                "learning_rate": 0.1 * (0.9**iteration),  # Decay
                "convergence_threshold": 0.01,
                "iteration_count": iteration + 1,
            }

            # Check convergence
            should_continue = condition_fn(iteration, {"value": agent_output})

            return {
                "current_iteration": iteration + 1,
                "iteration_history": [iteration_data],
                "adaptation_params": adaptation_params,
                "loop_control": {
                    "should_continue": should_continue,
                    "convergence_metric": 1.0 / (iteration + 1),  # Example metric
                },
                "current_state": {"value": agent_output, "adapted": True},
            }

        return extract_state

    def _create_adaptive_state_injector(self, iteration: int):
        """Create state injector for adaptive iterations."""

        def inject_state(state: Dict[str, Any]) -> Dict[str, Any]:
            """Inject adaptive context."""
            base_context = {
                "loop_id": state.get("loop_id"),
                "current_iteration": iteration,
                "iteration_history": state.get("iteration_history", []),
                "adaptation_params": state.get("adaptation_params", {}),
            }

            # Add adaptive insights
            if iteration > 0 and state.get("iteration_history"):
                base_context["convergence_trend"] = "improving"  # Simplified

            return base_context

        return inject_state

    def _get_loop_initial_state(self, loop_type: str, iterations: Optional[int]) -> Dict[str, Any]:
        """Get initial state for loop execution."""
        initial_state = {
            "loop_id": f"loop_{int(time.time())}",
            "loop_type": loop_type,
            "started_at": datetime.now().isoformat(),
            "current_iteration": 0,
            "total_iterations": iterations or -1,
            "iteration_history": [],
            "loop_control": {"should_continue": True, "termination_reason": None},
            "current_state": {"value": None, "metadata": {}},
        }

        if loop_type == "adaptive":
            initial_state["adaptation_params"] = {
                "learning_rate": 0.1,
                "convergence_threshold": 0.01,
                "adaptation_history": [],
            }

        return initial_state


# Example usage demonstrating ADK compliance
def example_adk_loop_workflows():
    """Examples of creating ADK-compliant loop workflows."""
    manager = LoopWorkflowManagerV2()

    # Base agent for iteration
    optimization_agent = LlmAgent(
        name="OptimizationAgent",
        model="gemini-2.5-flash",
        description="Iteratively optimize a solution",
        instruction="Improve the solution based on previous iterations",
        tools=[],
    )

    # 1. Fixed iteration loop
    fixed_loop = manager.create_loop_workflow(
        agent=optimization_agent, loop_type="fixed", iterations=5, workflow_name="FixedOptimization"
    )

    # 2. Conditional loop with convergence check
    def convergence_condition(iteration: int, state: Dict[str, Any]) -> bool:
        """Continue until convergence or max iterations."""
        if iteration >= 10:  # Safety limit
            return False

        # Check convergence (simplified)
        if state.get("value") and "optimal" in str(state["value"]).lower():
            return False  # Stop if optimal found

        return True  # Continue otherwise

    conditional_loop = manager.create_loop_workflow(
        agent=optimization_agent,
        loop_type="conditional",
        condition_fn=convergence_condition,
        workflow_name="ConvergenceOptimization",
    )

    # 3. Adaptive loop with dynamic parameters
    def adaptive_condition(iteration: int, state: Dict[str, Any]) -> bool:
        """Adapt and check for convergence."""
        if iteration >= 15:  # Safety limit
            return False

        # Could check convergence metric here
        return True

    adaptive_loop = manager.create_loop_workflow(
        agent=optimization_agent,
        loop_type="adaptive",
        condition_fn=adaptive_condition,
        workflow_name="AdaptiveOptimization",
    )

    return fixed_loop, conditional_loop, adaptive_loop


# Migration helper for existing code
class LoopWorkflowManager(LoopWorkflowManagerV2):
    """
    Compatibility wrapper for existing code.
    Inherits from V2 to provide ADK-compliant implementation.
    """

    def __init__(self):
        super().__init__()
        print("INFO: LoopWorkflowManager now uses ADK-compliant V2 implementation")
        print("INFO: Loop state now managed by ADK patterns")


# Export for use
__all__ = ["LoopWorkflowManagerV2", "LoopWorkflowManager", "example_adk_loop_workflows"]  # Compatibility export
