"""
Task Orchestrator for Multi-Agent Coordination

This module provides task orchestration capabilities to coordinate
complex tasks across multiple agents with dependency management.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from .agent_communication import get_communication_service
from .load_balancer import get_load_balancer
from .result_aggregator import get_result_aggregator
from .routing_engine import get_routing_engine

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task execution status."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    WAITING_DEPENDENCY = "waiting_dependency"


class OrchestrationStrategy(Enum):
    """Orchestration strategies."""

    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    PIPELINE = "pipeline"
    CONDITIONAL = "conditional"
    ADAPTIVE = "adaptive"


@dataclass
class SubTask:
    """Individual subtask in an orchestration."""

    task_id: str
    description: str
    agent_name: str
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class OrchestrationPlan:
    """Complete orchestration plan for a complex task."""

    orchestration_id: str
    original_task: str
    strategy: OrchestrationStrategy
    subtasks: List[SubTask]
    dependency_graph: Dict[str, List[str]]
    estimated_duration: float
    max_parallel_tasks: int
    timeout_seconds: int


@dataclass
class OrchestrationResult:
    """Result of task orchestration."""

    orchestration_id: str
    success: bool
    completed_subtasks: int
    failed_subtasks: int
    total_execution_time: float
    results: Dict[str, Any]
    aggregated_result: Optional[Dict[str, Any]]
    errors: List[str]
    performance_metrics: Dict[str, Any]


class TaskOrchestrator:
    """Orchestrates complex tasks across multiple agents."""

    def __init__(self):
        """Initialize the task orchestrator."""
        self.routing_engine = get_routing_engine()
        self.communication_service = get_communication_service()
        self.load_balancer = get_load_balancer()
        self.result_aggregator = get_result_aggregator()

        self.active_orchestrations: Dict[str, OrchestrationPlan] = {}
        self.orchestration_history: List[Dict[str, Any]] = []

    async def orchestrate_task(
        self,
        task: str,
        context: str = "",
        strategy: OrchestrationStrategy = OrchestrationStrategy.ADAPTIVE,
        max_parallel_tasks: int = 3,
        timeout_seconds: int = 300,
    ) -> OrchestrationResult:
        """Orchestrate a complex task across multiple agents.

        Args:
            task: Task description
            context: Additional context
            strategy: Orchestration strategy
            max_parallel_tasks: Maximum parallel task execution
            timeout_seconds: Overall timeout for orchestration

        Returns:
            OrchestrationResult with execution results
        """
        orchestration_id = str(uuid.uuid4())
        start_time = time.time()

        logger.info(f"🎼 Starting task orchestration: {orchestration_id}")
        logger.info(f"📋 Task: {task[:100]}...")

        try:
            # Phase 1: Create orchestration plan
            plan = await self._create_orchestration_plan(
                orchestration_id,
                task,
                context,
                strategy,
                max_parallel_tasks,
                timeout_seconds,
            )

            # Phase 2: Execute orchestration plan
            result = await self._execute_orchestration_plan(plan)

            # Phase 3: Aggregate results
            if result.success and len(result.results) > 1:
                aggregated_result = await self._aggregate_orchestration_results(plan, result)
                result.aggregated_result = aggregated_result

            # Phase 4: Record orchestration history
            execution_time = time.time() - start_time
            self._record_orchestration_history(orchestration_id, task, plan, result, execution_time)

            logger.info(f"✅ Orchestration completed: {orchestration_id} in {execution_time:.2f}s")
            return result

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Orchestration failed: {orchestration_id} - {e}")

            return OrchestrationResult(
                orchestration_id=orchestration_id,
                success=False,
                completed_subtasks=0,
                failed_subtasks=0,
                total_execution_time=execution_time,
                results={},
                aggregated_result=None,
                errors=[str(e)],
                performance_metrics={"error": True, "execution_time": execution_time},
            )
        finally:
            # Clean up active orchestration
            if orchestration_id in self.active_orchestrations:
                del self.active_orchestrations[orchestration_id]

    async def _create_orchestration_plan(
        self,
        orchestration_id: str,
        task: str,
        context: str,
        strategy: OrchestrationStrategy,
        max_parallel_tasks: int,
        timeout_seconds: int,
    ) -> OrchestrationPlan:
        """Create an orchestration plan for the task."""
        logger.info(f"📋 Creating orchestration plan with {strategy.value} strategy")

        # Decompose task into subtasks
        subtasks = await self._decompose_complex_task(task, context)

        # Assign agents to subtasks
        for subtask in subtasks:
            agent_name = await self._assign_agent_to_subtask(subtask, context)
            subtask.agent_name = agent_name

        # Build dependency graph
        dependency_graph = self._build_dependency_graph(subtasks, strategy)

        # Update subtask dependencies
        for subtask in subtasks:
            subtask.dependencies = dependency_graph.get(subtask.task_id, [])

        # Estimate duration
        estimated_duration = self._estimate_orchestration_duration(subtasks, strategy)

        plan = OrchestrationPlan(
            orchestration_id=orchestration_id,
            original_task=task,
            strategy=strategy,
            subtasks=subtasks,
            dependency_graph=dependency_graph,
            estimated_duration=estimated_duration,
            max_parallel_tasks=max_parallel_tasks,
            timeout_seconds=timeout_seconds,
        )

        self.active_orchestrations[orchestration_id] = plan
        return plan

    async def _decompose_complex_task(self, task: str, context: str) -> List[SubTask]:
        """Decompose a complex task into manageable subtasks."""
        subtasks = []

        # Analyze task for decomposition opportunities
        task_lower = task.lower()

        # Pattern-based decomposition
        if "analyze" in task_lower and "data" in task_lower:
            # Data analysis workflow
            subtasks.extend(
                [
                    SubTask(
                        task_id=f"subtask_1_{int(time.time())}",
                        description=f"Load and validate data for: {task}",
                        agent_name="",  # Will be assigned later
                    ),
                    SubTask(
                        task_id=f"subtask_2_{int(time.time())}",
                        description=f"Perform statistical analysis: {task}",
                        agent_name="",
                    ),
                    SubTask(
                        task_id=f"subtask_3_{int(time.time())}",
                        description=f"Generate visualizations and summary: {task}",
                        agent_name="",
                    ),
                ]
            )

        elif "code" in task_lower and ("execute" in task_lower or "run" in task_lower):
            # Code execution workflow
            subtasks.extend(
                [
                    SubTask(
                        task_id=f"subtask_1_{int(time.time())}",
                        description=f"Validate and prepare code: {task}",
                        agent_name="",
                    ),
                    SubTask(
                        task_id=f"subtask_2_{int(time.time())}",
                        description=f"Execute code safely: {task}",
                        agent_name="",
                    ),
                    SubTask(
                        task_id=f"subtask_3_{int(time.time())}",
                        description=f"Analyze results and provide summary: {task}",
                        agent_name="",
                    ),
                ]
            )

        elif "search" in task_lower or "find" in task_lower:
            # Information retrieval workflow
            subtasks.extend(
                [
                    SubTask(
                        task_id=f"subtask_1_{int(time.time())}",
                        description=f"Search for information: {task}",
                        agent_name="",
                    ),
                    SubTask(
                        task_id=f"subtask_2_{int(time.time())}",
                        description=f"Analyze and synthesize findings: {task}",
                        agent_name="",
                    ),
                ]
            )

        else:
            # Generic decomposition
            subtasks.extend(
                [
                    SubTask(
                        task_id=f"subtask_1_{int(time.time())}",
                        description=f"Analyze requirements: {task}",
                        agent_name="",
                    ),
                    SubTask(
                        task_id=f"subtask_2_{int(time.time())}",
                        description=f"Execute main task: {task}",
                        agent_name="",
                    ),
                    SubTask(
                        task_id=f"subtask_3_{int(time.time())}",
                        description=f"Validate and summarize: {task}",
                        agent_name="",
                    ),
                ]
            )

        logger.info(f"📝 Decomposed task into {len(subtasks)} subtasks")
        return subtasks

    async def _assign_agent_to_subtask(self, subtask: SubTask, context: str) -> str:
        """Assign the best agent to a subtask."""
        # Use routing engine to find best agent
        routing_result = await self.routing_engine.route_task(subtask.description, context)

        if routing_result.success and routing_result.agents_used:
            return routing_result.agents_used[0]
        else:
            # Fallback assignment based on subtask type
            description_lower = subtask.description.lower()

            if "data" in description_lower or "analyze" in description_lower:
                return "data_science"
            elif "code" in description_lower or "execute" in description_lower:
                return "code_execution"
            elif "search" in description_lower or "find" in description_lower:
                return "memory"
            else:
                return "vana"  # Default to orchestration agent

    def _build_dependency_graph(self, subtasks: List[SubTask], strategy: OrchestrationStrategy) -> Dict[str, List[str]]:
        """Build dependency graph based on strategy."""
        dependency_graph = {}

        if strategy == OrchestrationStrategy.SEQUENTIAL:
            # Each task depends on the previous one
            for i, subtask in enumerate(subtasks):
                if i > 0:
                    dependency_graph[subtask.task_id] = [subtasks[i - 1].task_id]
                else:
                    dependency_graph[subtask.task_id] = []

        elif strategy == OrchestrationStrategy.PARALLEL:
            # No dependencies - all tasks can run in parallel
            for subtask in subtasks:
                dependency_graph[subtask.task_id] = []

        elif strategy == OrchestrationStrategy.PIPELINE:
            # Pipeline with some parallel stages
            for i, subtask in enumerate(subtasks):
                if i == 0:
                    dependency_graph[subtask.task_id] = []
                elif i == len(subtasks) - 1:
                    # Last task depends on all previous
                    dependency_graph[subtask.task_id] = [st.task_id for st in subtasks[:-1]]
                else:
                    # Middle tasks depend on first task
                    dependency_graph[subtask.task_id] = [subtasks[0].task_id]

        elif strategy == OrchestrationStrategy.ADAPTIVE:
            # Intelligent dependency analysis
            dependency_graph = self._analyze_intelligent_dependencies(subtasks)

        else:
            # Default to sequential
            for i, subtask in enumerate(subtasks):
                if i > 0:
                    dependency_graph[subtask.task_id] = [subtasks[i - 1].task_id]
                else:
                    dependency_graph[subtask.task_id] = []

        return dependency_graph

    def _analyze_intelligent_dependencies(self, subtasks: List[SubTask]) -> Dict[str, List[str]]:
        """Analyze intelligent dependencies between subtasks."""
        dependency_graph = {}

        for i, subtask in enumerate(subtasks):
            dependencies = []
            description_lower = subtask.description.lower()

            # Look for dependencies based on content
            for j, other_subtask in enumerate(subtasks):
                if i == j:
                    continue

                other_description_lower = other_subtask.description.lower()

                # If this task analyzes results, it depends on execution tasks
                if "analyze" in description_lower and "execute" in other_description_lower:
                    dependencies.append(other_subtask.task_id)

                # If this task summarizes, it depends on analysis tasks
                if "summary" in description_lower and "analyze" in other_description_lower:
                    dependencies.append(other_subtask.task_id)

                # If this task validates, it depends on main execution
                if "validate" in description_lower and "execute" in other_description_lower:
                    dependencies.append(other_subtask.task_id)

            dependency_graph[subtask.task_id] = dependencies

        return dependency_graph

    def _estimate_orchestration_duration(self, subtasks: List[SubTask], strategy: OrchestrationStrategy) -> float:
        """Estimate total orchestration duration."""
        if strategy == OrchestrationStrategy.PARALLEL:
            # Duration is the longest subtask
            return 60.0  # Default estimate
        elif strategy == OrchestrationStrategy.SEQUENTIAL:
            # Duration is sum of all subtasks
            return len(subtasks) * 30.0  # Default estimate
        else:
            # Pipeline or adaptive - somewhere in between
            return len(subtasks) * 20.0  # Default estimate

    async def _execute_orchestration_plan(self, plan: OrchestrationPlan) -> OrchestrationResult:
        """Execute the orchestration plan."""
        logger.info(f"⚡ Executing orchestration plan with {len(plan.subtasks)} subtasks")

        start_time = time.time()
        completed_subtasks = 0
        failed_subtasks = 0
        results = {}
        errors = []

        # Track subtask execution
        running_tasks = {}
        completed_task_ids = set()

        try:
            while completed_subtasks + failed_subtasks < len(plan.subtasks):
                # Check for timeout
                if time.time() - start_time > plan.timeout_seconds:
                    errors.append("Orchestration timeout exceeded")
                    break

                # Find ready subtasks (dependencies satisfied)
                ready_subtasks = self._find_ready_subtasks(plan, completed_task_ids)

                # Start new tasks (up to parallel limit)
                while len(running_tasks) < plan.max_parallel_tasks and ready_subtasks and len(ready_subtasks) > 0:
                    subtask = ready_subtasks.pop(0)
                    if subtask.task_id not in running_tasks:
                        task_coroutine = self._execute_subtask(subtask)
                        running_tasks[subtask.task_id] = {
                            "subtask": subtask,
                            "coroutine": task_coroutine,
                            "start_time": time.time(),
                        }
                        subtask.status = TaskStatus.RUNNING
                        subtask.start_time = time.time()

                # Check for completed tasks
                if running_tasks:
                    # Wait for at least one task to complete
                    done_tasks = []
                    for task_id, task_info in list(running_tasks.items()):
                        try:
                            # Check if task is done (non-blocking)
                            if task_info["coroutine"].done():
                                result = await task_info["coroutine"]
                                done_tasks.append((task_id, task_info["subtask"], result))
                        except Exception as e:
                            done_tasks.append((task_id, task_info["subtask"], {"error": str(e)}))

                    # Process completed tasks
                    for task_id, subtask, result in done_tasks:
                        subtask.end_time = time.time()

                        if result.get("error"):
                            subtask.status = TaskStatus.FAILED
                            subtask.error = result["error"]
                            failed_subtasks += 1
                            errors.append(f"Subtask {task_id} failed: {result['error']}")
                        else:
                            subtask.status = TaskStatus.COMPLETED
                            subtask.result = result
                            completed_subtasks += 1
                            results[task_id] = result

                        completed_task_ids.add(task_id)
                        del running_tasks[task_id]

                # Small delay to prevent busy waiting
                if not done_tasks:
                    await asyncio.sleep(0.1)

        except Exception as e:
            errors.append(f"Orchestration execution error: {str(e)}")

        total_execution_time = time.time() - start_time
        success = completed_subtasks > 0 and failed_subtasks == 0

        return OrchestrationResult(
            orchestration_id=plan.orchestration_id,
            success=success,
            completed_subtasks=completed_subtasks,
            failed_subtasks=failed_subtasks,
            total_execution_time=total_execution_time,
            results=results,
            aggregated_result=None,  # Will be set later
            errors=errors,
            performance_metrics={
                "strategy": plan.strategy.value,
                "subtask_count": len(plan.subtasks),
                "parallel_efficiency": completed_subtasks / max(total_execution_time, 1),
                "success_rate": completed_subtasks / len(plan.subtasks),
            },
        )

    def _find_ready_subtasks(self, plan: OrchestrationPlan, completed_task_ids: set) -> List[SubTask]:
        """Find subtasks that are ready to execute (dependencies satisfied)."""
        ready_subtasks = []

        for subtask in plan.subtasks:
            if subtask.status == TaskStatus.PENDING:
                # Check if all dependencies are completed
                dependencies_satisfied = all(dep_id in completed_task_ids for dep_id in subtask.dependencies)

                if dependencies_satisfied:
                    ready_subtasks.append(subtask)

        return ready_subtasks

    async def _execute_subtask(self, subtask: SubTask) -> Dict[str, Any]:
        """Execute a single subtask."""
        try:
            logger.debug(f"🔄 Executing subtask: {subtask.task_id} on {subtask.agent_name}")

            # Register task start with load balancer
            await self.load_balancer.register_task_start(
                subtask.agent_name,
                subtask.task_id,
                {"description": subtask.description},
            )

            # Execute the subtask
            result = await self.communication_service.send_task_to_agent(subtask.agent_name, subtask.description, "")

            # Register task completion
            success = result.get("status") == "success"
            await self.load_balancer.register_task_completion(subtask.agent_name, subtask.task_id, success)

            return result

        except Exception as e:
            logger.error(f"❌ Subtask execution failed: {subtask.task_id} - {e}")

            # Register task completion as failed
            await self.load_balancer.register_task_completion(subtask.agent_name, subtask.task_id, False)

            return {"error": str(e)}

    async def _aggregate_orchestration_results(
        self, plan: OrchestrationPlan, result: OrchestrationResult
    ) -> Dict[str, Any]:
        """Aggregate results from multiple subtasks."""
        return await self.result_aggregator.aggregate_results(
            list(result.results.values()), plan.original_task, plan.strategy.value
        )

    def _record_orchestration_history(
        self,
        orchestration_id: str,
        task: str,
        plan: OrchestrationPlan,
        result: OrchestrationResult,
        execution_time: float,
    ):
        """Record orchestration history for analysis."""
        history_entry = {
            "orchestration_id": orchestration_id,
            "timestamp": datetime.now().isoformat(),
            "original_task": task[:200],
            "strategy": plan.strategy.value,
            "subtask_count": len(plan.subtasks),
            "completed_subtasks": result.completed_subtasks,
            "failed_subtasks": result.failed_subtasks,
            "success": result.success,
            "execution_time": execution_time,
            "agents_used": list(set(st.agent_name for st in plan.subtasks)),
        }

        self.orchestration_history.append(history_entry)

        # Keep only last 500 entries
        if len(self.orchestration_history) > 500:
            self.orchestration_history = self.orchestration_history[-500:]

    def get_orchestration_stats(self) -> Dict[str, Any]:
        """Get orchestration statistics."""
        if not self.orchestration_history:
            return {"message": "No orchestration history available"}

        total_orchestrations = len(self.orchestration_history)
        successful_orchestrations = sum(1 for entry in self.orchestration_history if entry["success"])

        return {
            "total_orchestrations": total_orchestrations,
            "success_rate": successful_orchestrations / total_orchestrations,
            "average_execution_time": sum(entry["execution_time"] for entry in self.orchestration_history)
            / total_orchestrations,
            "average_subtask_count": sum(entry["subtask_count"] for entry in self.orchestration_history)
            / total_orchestrations,
            "strategy_distribution": self._get_strategy_distribution(),
            "active_orchestrations": len(self.active_orchestrations),
        }

    def _get_strategy_distribution(self) -> Dict[str, int]:
        """Get distribution of orchestration strategies."""
        distribution = {}
        for entry in self.orchestration_history:
            strategy = entry["strategy"]
            distribution[strategy] = distribution.get(strategy, 0) + 1
        return distribution


# Global task orchestrator instance
_task_orchestrator = None


def get_task_orchestrator() -> TaskOrchestrator:
    """Get the global task orchestrator instance."""
    global _task_orchestrator
    if _task_orchestrator is None:
        _task_orchestrator = TaskOrchestrator()
    return _task_orchestrator
