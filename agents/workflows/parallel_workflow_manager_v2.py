"""
Parallel Workflow Manager V2 - Fully ADK-Compliant Implementation

Implements proper Google ADK state management for parallel execution without
manual state tracking arrays. Uses ADK's native parallel agent capabilities.

Key Improvements:
- No manual result arrays - uses ADK state aggregation
- Proper parallel state management 
- Resource management through ADK patterns
- Native error isolation per parallel branch
"""

import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from google.adk.agents import LlmAgent, ParallelAgent
from google.adk.tools import FunctionTool


class ParallelWorkflowManagerV2:
    """
    ADK-compliant parallel workflow manager using proper state aggregation.
    """

    def __init__(self):
        """Initialize the Parallel Workflow Manager V2."""
        self.workflows = {}  # Track created workflows

    def create_parallel_workflow(
        self,
        agents: List[LlmAgent],
        workflow_name: str = "ParallelWorkflow",
        aggregation_strategy: str = "all",
        resource_limits: Optional[Dict[str, int]] = None,
    ) -> ParallelAgent:
        """
        Create an ADK-compliant parallel workflow with proper state management.

        Args:
            agents: List of agents to execute in parallel
            workflow_name: Name for the workflow
            aggregation_strategy: How to aggregate results ("all", "first", "best")
            resource_limits: Optional resource constraints

        Returns:
            Configured ParallelAgent with state management
        """
        if not agents:
            raise ValueError("Agents list cannot be empty")

        # Apply resource limits if specified
        if resource_limits:
            max_concurrent = resource_limits.get("max_concurrent", len(agents))
            agents = agents[:max_concurrent]

        # Build state schema for parallel execution
        state_schema = self._build_parallel_state_schema(agents)

        # Configure agents for parallel state management
        configured_agents = []
        for i, agent in enumerate(agents):
            configured_agent = self._configure_parallel_agent(agent, i)
            configured_agents.append(configured_agent)

        # Create the parallel workflow with ADK state management
        workflow = ParallelAgent(
            name=workflow_name,
            description=f"Parallel workflow with {len(agents)} concurrent agents",
            sub_agents=configured_agents,
            # ADK handles parallel state aggregation
            aggregation_mode=aggregation_strategy,
            # Let ADK manage concurrency
            max_concurrency=resource_limits.get("max_concurrent", len(agents)) if resource_limits else len(agents),
            # Timeout for parallel execution
            timeout_seconds=resource_limits.get("timeout", 300) if resource_limits else 300,
            # Initial state for all parallel branches
            initial_state=self._get_parallel_initial_state(agents),
        )

        # Store workflow metadata
        self.workflows[workflow_name] = {
            "agents": [agent.name for agent in agents],
            "state_schema": state_schema,
            "aggregation_strategy": aggregation_strategy,
            "created_at": datetime.now().isoformat(),
        }

        return workflow

    def _build_parallel_state_schema(self, agents: List[LlmAgent]) -> Dict[str, Any]:
        """
        Build ADK StateSchema for parallel execution.

        Each parallel branch gets its own namespace in the state.
        """
        properties = {
            # Workflow metadata
            "workflow_id": {"type": "string"},
            "started_at": {"type": "string"},
            "parallel_execution": {"type": "boolean", "default": True},
            # Results from each parallel agent
            "parallel_results": {
                "type": "object",
                "properties": {
                    agent.name: {
                        "type": "object",
                        "properties": {
                            "result": {"type": "string"},
                            "status": {"type": "string", "enum": ["pending", "running", "completed", "failed"]},
                            "started_at": {"type": "string"},
                            "completed_at": {"type": "string"},
                            "error": {"type": "string"},
                        },
                    }
                    for agent in agents
                },
            },
            # Aggregated result (populated after all complete)
            "aggregated_result": {
                "type": "object",
                "properties": {
                    "strategy": {"type": "string"},
                    "result": {"type": "any"},
                    "metadata": {"type": "object"},
                },
            },
        }

        return {
            "type": "object",
            "properties": properties,
            "required": ["workflow_id", "started_at", "parallel_execution"],
        }

    def _configure_parallel_agent(self, agent: LlmAgent, index: int) -> LlmAgent:
        """
        Configure an agent for parallel execution with proper state handling.
        """
        # Enhance agent instructions for parallel awareness
        original_instruction = agent.instruction
        parallel_instruction = f"""
{original_instruction}

Parallel Execution Context:
- You are executing as part of a parallel workflow
- Your results will be aggregated with other parallel agents
- ADK manages all state coordination
- Focus on your specific task without coordination concerns
- Your output will be stored in state.parallel_results.{agent.name}
"""

        # Create a wrapped agent with parallel state management
        parallel_agent = LlmAgent(
            name=agent.name,
            model=agent.model,
            description=f"Parallel branch: {agent.description}",
            instruction=parallel_instruction,
            tools=agent.tools,
            # State handling for parallel execution
            state_extractor=self._create_parallel_state_extractor(agent.name),
            state_injector=self._create_parallel_state_injector(agent.name),
        )

        return parallel_agent

    def _create_parallel_state_extractor(self, agent_name: str):
        """Create state extractor for parallel agent results."""

        def extract_state(agent_output: str) -> Dict[str, Any]:
            """Extract agent output for parallel state storage."""
            return {
                "parallel_results": {
                    agent_name: {
                        "result": agent_output,
                        "status": "completed",
                        "completed_at": datetime.now().isoformat(),
                    }
                }
            }

        return extract_state

    def _create_parallel_state_injector(self, agent_name: str):
        """Create state injector for parallel agent context."""

        def inject_state(state: Dict[str, Any]) -> Dict[str, Any]:
            """Prepare state context for parallel agent."""
            return {
                "workflow_id": state.get("workflow_id"),
                "agent_name": agent_name,
                "parallel_execution": True,
                # Only this agent's previous results if any
                "my_previous_results": state.get("parallel_results", {}).get(agent_name),
            }

        return inject_state

    def _get_parallel_initial_state(self, agents: List[LlmAgent]) -> Dict[str, Any]:
        """Get initial state for parallel workflow execution."""
        return {
            "workflow_id": f"pwf_{int(time.time())}",
            "started_at": datetime.now().isoformat(),
            "parallel_execution": True,
            "parallel_results": {
                agent.name: {
                    "status": "pending",
                    "started_at": None,
                    "completed_at": None,
                    "result": None,
                    "error": None,
                }
                for agent in agents
            },
        }

    def create_parallel_workflow_with_aggregator(
        self,
        agents: List[LlmAgent],
        aggregator_fn: Callable[[Dict[str, Any]], Any],
        workflow_name: str = "ParallelWorkflowCustom",
    ) -> ParallelAgent:
        """
        Create a parallel workflow with custom result aggregation.

        The aggregator function receives all parallel results and produces final output.
        """
        # Create base parallel workflow
        workflow = self.create_parallel_workflow(agents, workflow_name, "custom")

        # ADK will use this custom aggregator for results
        workflow._custom_aggregator = aggregator_fn

        return workflow

    def create_map_reduce_workflow(
        self, map_agents: List[LlmAgent], reduce_agent: LlmAgent, workflow_name: str = "MapReduceWorkflow"
    ) -> Dict[str, Any]:
        """
        Create a map-reduce pattern workflow using ADK components.

        Returns a workflow configuration that combines parallel and sequential patterns.
        """
        # Create parallel "map" phase
        map_workflow = self.create_parallel_workflow(
            agents=map_agents, workflow_name=f"{workflow_name}_Map", aggregation_strategy="all"
        )

        # Configure reduce agent to process aggregated results
        reduce_agent_configured = LlmAgent(
            name=reduce_agent.name,
            model=reduce_agent.model,
            description=f"Reduce phase: {reduce_agent.description}",
            instruction=f"""
{reduce_agent.instruction}

Map-Reduce Context:
- You are the reduce phase of a map-reduce workflow
- You will receive aggregated results from {len(map_agents)} parallel map operations
- Process these results to produce the final output
- Access map results via state.aggregated_result
""",
            tools=reduce_agent.tools,
        )

        return {
            "map_phase": map_workflow,
            "reduce_phase": reduce_agent_configured,
            "workflow_type": "map_reduce",
            "workflow_name": workflow_name,
        }


# Example usage demonstrating ADK compliance
def example_adk_parallel_workflow():
    """Example of creating ADK-compliant parallel workflows."""
    manager = ParallelWorkflowManagerV2()

    # Create parallel analysis agents
    agents = [
        LlmAgent(
            name="SecurityAnalyzer",
            model="gemini-2.5-flash",
            description="Analyze security aspects",
            instruction="Analyze the security implications and vulnerabilities",
            tools=[],
        ),
        LlmAgent(
            name="PerformanceAnalyzer",
            model="gemini-2.5-flash",
            description="Analyze performance aspects",
            instruction="Analyze performance characteristics and bottlenecks",
            tools=[],
        ),
        LlmAgent(
            name="UsabilityAnalyzer",
            model="gemini-2.5-flash",
            description="Analyze usability aspects",
            instruction="Analyze user experience and usability issues",
            tools=[],
        ),
    ]

    # Create parallel workflow with resource limits
    workflow = manager.create_parallel_workflow(
        agents=agents,
        workflow_name="MultiAspectAnalysis",
        aggregation_strategy="all",
        resource_limits={"max_concurrent": 3, "timeout": 120},
    )

    # Example with custom aggregator
    def quality_score_aggregator(results: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate parallel results into a quality score."""
        scores = {"security": 0, "performance": 0, "usability": 0}

        # Extract scores from each analyzer (simplified)
        parallel_results = results.get("parallel_results", {})

        # Aggregate into final score
        total_score = sum(scores.values()) / len(scores)

        return {
            "overall_quality_score": total_score,
            "category_scores": scores,
            "timestamp": datetime.now().isoformat(),
        }

    custom_workflow = manager.create_parallel_workflow_with_aggregator(
        agents=agents, aggregator_fn=quality_score_aggregator, workflow_name="QualityAssessment"
    )

    return workflow, custom_workflow, manager


# Migration helper for existing code
class ParallelWorkflowManager(ParallelWorkflowManagerV2):
    """
    Compatibility wrapper for existing code.
    Inherits from V2 to provide ADK-compliant implementation.
    """

    def __init__(self):
        super().__init__()
        # Remove old resource pool
        print("INFO: ParallelWorkflowManager now uses ADK-compliant V2 implementation")
        print("INFO: Resource management now handled by ADK ParallelAgent")


# Export for use
__all__ = [
    "ParallelWorkflowManagerV2",
    "ParallelWorkflowManager",  # Compatibility export
    "example_adk_parallel_workflow",
]
