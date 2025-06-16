"""
Routing Engine for Intelligent Task Routing

This module provides the core routing engine that combines task analysis,
capability matching, and performance tracking to make optimal routing decisions.
"""

import logging
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from .agent_communication import get_communication_service
from .capability_matcher import MatchingResult, get_capability_matcher
from .message_router import RoutingStrategy, get_message_router
from .performance_tracker import get_performance_tracker
from .task_analyzer import TaskAnalysis, get_task_analyzer
from .task_classifier import TaskClassification, get_task_classifier

logger = logging.getLogger(__name__)


class RoutingDecision(Enum):
    """Types of routing decisions."""

    DIRECT_ROUTE = "direct_route"
    DECOMPOSE_SEQUENTIAL = "decompose_sequential"
    DECOMPOSE_PARALLEL = "decompose_parallel"
    ORCHESTRATED = "orchestrated"
    FALLBACK = "fallback"


@dataclass
class RoutingPlan:
    """Complete routing plan for a task."""

    decision: RoutingDecision
    primary_agent: str
    secondary_agents: List[str]
    execution_order: List[str]
    estimated_duration: float
    confidence: float
    reasoning: str
    fallback_plan: Optional["RoutingPlan"] = None


@dataclass
class RoutingResult:
    """Result of task routing execution."""

    success: bool
    primary_result: Optional[Dict[str, Any]]
    secondary_results: List[Dict[str, Any]]
    execution_time: float
    agents_used: List[str]
    errors: List[str]
    performance_metrics: Dict[str, Any]


class RoutingEngine:
    """Intelligent routing engine for task execution."""

    def __init__(self):
        """Initialize the routing engine."""
        self.task_analyzer = get_task_analyzer()
        self.task_classifier = get_task_classifier()
        self.capability_matcher = get_capability_matcher()
        self.message_router = get_message_router()
        self.communication_service = get_communication_service()
        self.performance_tracker = get_performance_tracker()

        self.routing_history: List[Dict[str, Any]] = []
        self.active_routes: Dict[str, Dict[str, Any]] = {}

    async def route_task(
        self, task: str, context: str = "", preferred_strategy: Optional[RoutingStrategy] = None
    ) -> RoutingResult:
        """Route a task using intelligent analysis and execution.

        Args:
            task: Task description
            context: Additional context
            preferred_strategy: Preferred routing strategy

        Returns:
            RoutingResult with execution results
        """
        start_time = time.time()
        route_id = f"route_{int(start_time)}"

        logger.info(f"🚀 Starting intelligent task routing: {task[:100]}...")

        try:
            # Phase 1: Analyze and classify the task
            analysis = self.task_analyzer.analyze_task(task, context)
            classification = self.task_classifier.classify_task(task, context)

            # Phase 2: Create routing plan
            routing_plan = await self._create_routing_plan(analysis, classification, task, context, preferred_strategy)

            # Phase 3: Execute routing plan
            routing_result = await self._execute_routing_plan(routing_plan, task, context, route_id)

            # Phase 4: Track performance and update metrics
            execution_time = time.time() - start_time
            await self._update_performance_metrics(routing_plan, routing_result, execution_time)

            # Record routing history
            self._record_routing_history(route_id, task, routing_plan, routing_result, execution_time)

            logger.info(f"✅ Task routing completed in {execution_time:.2f}s: {routing_result.success}")
            return routing_result

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Task routing failed: {e}")

            return RoutingResult(
                success=False,
                primary_result=None,
                secondary_results=[],
                execution_time=execution_time,
                agents_used=[],
                errors=[str(e)],
                performance_metrics={"error": True, "execution_time": execution_time},
            )

    async def _create_routing_plan(
        self,
        analysis: TaskAnalysis,
        classification: TaskClassification,
        task: str,
        context: str,
        preferred_strategy: Optional[RoutingStrategy],
    ) -> RoutingPlan:
        """Create an optimal routing plan based on analysis."""
        logger.info(f"📋 Creating routing plan for {classification.routing_strategy} strategy")

        # Get capability matching results
        matching_result = self.capability_matcher.match_capabilities(task, context, analysis.required_capabilities)

        if not matching_result.best_match:
            # No suitable agents found - create fallback plan
            return self._create_fallback_plan(analysis, task)

        # Determine routing decision based on classification
        if classification.decomposition_suggested and classification.parallel_execution:
            decision = RoutingDecision.DECOMPOSE_PARALLEL
        elif classification.decomposition_suggested:
            decision = RoutingDecision.DECOMPOSE_SEQUENTIAL
        elif classification.estimated_agents_needed > 1:
            decision = RoutingDecision.ORCHESTRATED
        else:
            decision = RoutingDecision.DIRECT_ROUTE

        # Select agents based on decision
        primary_agent = matching_result.best_match.agent_name
        secondary_agents = []
        execution_order = [primary_agent]

        if decision in [
            RoutingDecision.DECOMPOSE_PARALLEL,
            RoutingDecision.DECOMPOSE_SEQUENTIAL,
            RoutingDecision.ORCHESTRATED,
        ]:
            # Add secondary agents from alternatives
            for alt_match in matching_result.alternative_matches[: classification.estimated_agents_needed - 1]:
                if alt_match.overall_score > 0.5:
                    secondary_agents.append(alt_match.agent_name)

            if decision == RoutingDecision.DECOMPOSE_SEQUENTIAL:
                execution_order = [primary_agent] + secondary_agents
            elif decision == RoutingDecision.ORCHESTRATED:
                # Orchestration uses VANA as primary coordinator
                if primary_agent != "vana":
                    execution_order = ["vana", primary_agent] + secondary_agents

        # Calculate confidence based on matching quality and plan complexity
        base_confidence = matching_result.best_match.overall_score
        complexity_penalty = 0.1 * (len(secondary_agents))
        confidence = max(0.1, base_confidence - complexity_penalty)

        # Generate reasoning
        reasoning = self._generate_routing_reasoning(decision, primary_agent, secondary_agents, matching_result)

        # Create fallback plan
        fallback_plan = None
        if confidence < 0.7:
            fallback_plan = self._create_fallback_plan(analysis, task)

        return RoutingPlan(
            decision=decision,
            primary_agent=primary_agent,
            secondary_agents=secondary_agents,
            execution_order=execution_order,
            estimated_duration=analysis.estimated_duration,
            confidence=confidence,
            reasoning=reasoning,
            fallback_plan=fallback_plan,
        )

    async def _execute_routing_plan(self, plan: RoutingPlan, task: str, context: str, route_id: str) -> RoutingResult:
        """Execute the routing plan."""
        logger.info(f"⚡ Executing {plan.decision.value} plan with {len(plan.execution_order)} agents")

        self.active_routes[route_id] = {"plan": plan, "task": task, "start_time": time.time(), "status": "executing"}

        try:
            if plan.decision == RoutingDecision.DIRECT_ROUTE:
                return await self._execute_direct_route(plan, task, context)
            elif plan.decision == RoutingDecision.DECOMPOSE_SEQUENTIAL:
                return await self._execute_sequential_decomposition(plan, task, context)
            elif plan.decision == RoutingDecision.DECOMPOSE_PARALLEL:
                return await self._execute_parallel_decomposition(plan, task, context)
            elif plan.decision == RoutingDecision.ORCHESTRATED:
                return await self._execute_orchestrated_plan(plan, task, context)
            else:
                return await self._execute_fallback_plan(plan, task, context)

        finally:
            if route_id in self.active_routes:
                self.active_routes[route_id]["status"] = "completed"

    async def _execute_direct_route(self, plan: RoutingPlan, task: str, context: str) -> RoutingResult:
        """Execute direct routing to a single agent."""
        start_time = time.time()

        try:
            result = await self.communication_service.send_task_to_agent(plan.primary_agent, task, context)
            execution_time = time.time() - start_time

            return RoutingResult(
                success=result.get("status") == "success",
                primary_result=result,
                secondary_results=[],
                execution_time=execution_time,
                agents_used=[plan.primary_agent],
                errors=[result.get("error")] if result.get("error") else [],
                performance_metrics={"routing_strategy": "direct", "agent_count": 1, "execution_time": execution_time},
            )

        except Exception as e:
            execution_time = time.time() - start_time
            return RoutingResult(
                success=False,
                primary_result=None,
                secondary_results=[],
                execution_time=execution_time,
                agents_used=[],
                errors=[str(e)],
                performance_metrics={"error": True, "execution_time": execution_time},
            )

    async def _execute_sequential_decomposition(self, plan: RoutingPlan, task: str, context: str) -> RoutingResult:
        """Execute sequential task decomposition."""
        start_time = time.time()
        results = []
        errors = []
        agents_used = []

        # Decompose task into subtasks
        subtasks = self._decompose_task(task, len(plan.execution_order))

        # Execute subtasks sequentially
        accumulated_context = context
        for i, agent_name in enumerate(plan.execution_order):
            try:
                subtask = subtasks[i] if i < len(subtasks) else task
                result = await self.communication_service.send_task_to_agent(agent_name, subtask, accumulated_context)

                results.append(result)
                agents_used.append(agent_name)

                # Update context with previous results
                if result.get("status") == "success" and result.get("result"):
                    accumulated_context += f"\nPrevious result from {agent_name}: {result['result']}"

            except Exception as e:
                errors.append(f"Error with {agent_name}: {str(e)}")

        execution_time = time.time() - start_time
        success = len(results) > 0 and any(r.get("status") == "success" for r in results)

        return RoutingResult(
            success=success,
            primary_result=results[0] if results else None,
            secondary_results=results[1:] if len(results) > 1 else [],
            execution_time=execution_time,
            agents_used=agents_used,
            errors=errors,
            performance_metrics={
                "routing_strategy": "sequential_decomposition",
                "agent_count": len(agents_used),
                "subtask_count": len(subtasks),
                "execution_time": execution_time,
            },
        )

    async def _execute_parallel_decomposition(self, plan: RoutingPlan, task: str, context: str) -> RoutingResult:
        """Execute parallel task decomposition."""
        start_time = time.time()

        # Decompose task into subtasks
        subtasks = self._decompose_task(task, len(plan.execution_order))

        # Execute subtasks in parallel
        tasks = []
        for i, agent_name in enumerate(plan.execution_order):
            subtask = subtasks[i] if i < len(subtasks) else task
            task_coroutine = self.communication_service.send_task_to_agent(agent_name, subtask, context)
            tasks.append((agent_name, task_coroutine))

        # Wait for all results
        results = []
        errors = []
        agents_used = []

        for agent_name, task_coroutine in tasks:
            try:
                result = await task_coroutine
                results.append(result)
                agents_used.append(agent_name)
            except Exception as e:
                errors.append(f"Error with {agent_name}: {str(e)}")

        execution_time = time.time() - start_time
        success = len(results) > 0 and any(r.get("status") == "success" for r in results)

        return RoutingResult(
            success=success,
            primary_result=results[0] if results else None,
            secondary_results=results[1:] if len(results) > 1 else [],
            execution_time=execution_time,
            agents_used=agents_used,
            errors=errors,
            performance_metrics={
                "routing_strategy": "parallel_decomposition",
                "agent_count": len(agents_used),
                "subtask_count": len(subtasks),
                "execution_time": execution_time,
            },
        )

    async def _execute_orchestrated_plan(self, plan: RoutingPlan, task: str, context: str) -> RoutingResult:
        """Execute orchestrated plan using VANA as coordinator."""
        start_time = time.time()

        # Create orchestration context
        orchestration_context = f"""
        Task: {task}
        Context: {context}
        Available agents: {', '.join(plan.execution_order[1:])}
        Routing plan: Use {plan.primary_agent} as primary agent with {', '.join(plan.secondary_agents)} as support
        """

        try:
            # Send to orchestration agent (VANA)
            result = await self.communication_service.send_task_to_agent("vana", task, orchestration_context)
            execution_time = time.time() - start_time

            return RoutingResult(
                success=result.get("status") == "success",
                primary_result=result,
                secondary_results=[],
                execution_time=execution_time,
                agents_used=["vana"],
                errors=[result.get("error")] if result.get("error") else [],
                performance_metrics={
                    "routing_strategy": "orchestrated",
                    "agent_count": 1,
                    "planned_agents": len(plan.execution_order),
                    "execution_time": execution_time,
                },
            )

        except Exception as e:
            execution_time = time.time() - start_time
            return RoutingResult(
                success=False,
                primary_result=None,
                secondary_results=[],
                execution_time=execution_time,
                agents_used=[],
                errors=[str(e)],
                performance_metrics={"error": True, "execution_time": execution_time},
            )

    async def _execute_fallback_plan(self, plan: RoutingPlan, task: str, context: str) -> RoutingResult:
        """Execute fallback plan when primary plan fails."""
        logger.warning(f"⚠️ Executing fallback plan for task")

        if plan.fallback_plan:
            return await self._execute_routing_plan(plan.fallback_plan, task, context, f"fallback_{int(time.time())}")
        else:
            # Default fallback to VANA orchestration
            return await self.communication_service.send_task_to_agent("vana", task, context)

    def _decompose_task(self, task: str, num_subtasks: int) -> List[str]:
        """Decompose a task into subtasks."""
        # Simple decomposition based on task structure
        if "and" in task.lower():
            parts = task.split(" and ")
            return parts[:num_subtasks]
        elif "then" in task.lower():
            parts = task.split(" then ")
            return parts[:num_subtasks]
        else:
            # Create logical subtasks
            subtasks = []
            if num_subtasks >= 2:
                subtasks.append(f"Analyze and understand: {task}")
                subtasks.append(f"Execute and complete: {task}")
            if num_subtasks >= 3:
                subtasks.append(f"Validate and summarize results for: {task}")

            return subtasks[:num_subtasks] if subtasks else [task]

    def _create_fallback_plan(self, analysis: TaskAnalysis, task: str) -> RoutingPlan:
        """Create a fallback routing plan."""
        return RoutingPlan(
            decision=RoutingDecision.FALLBACK,
            primary_agent="vana",
            secondary_agents=[],
            execution_order=["vana"],
            estimated_duration=analysis.estimated_duration * 1.5,
            confidence=0.5,
            reasoning="Fallback to orchestration agent due to no suitable direct matches",
        )

    def _generate_routing_reasoning(
        self,
        decision: RoutingDecision,
        primary_agent: str,
        secondary_agents: List[str],
        matching_result: MatchingResult,
    ) -> str:
        """Generate reasoning for routing decision."""
        reasoning_parts = []

        reasoning_parts.append(f"Selected {decision.value} strategy")
        reasoning_parts.append(
            f"Primary agent: {primary_agent} (score: {matching_result.best_match.overall_score:.2f})"
        )

        if secondary_agents:
            reasoning_parts.append(f"Secondary agents: {', '.join(secondary_agents)}")

        if matching_result.coverage_analysis["total_coverage"] < 1.0:
            coverage = matching_result.coverage_analysis["total_coverage"]
            reasoning_parts.append(f"Capability coverage: {coverage:.1%}")

        return ". ".join(reasoning_parts)

    async def _update_performance_metrics(self, plan: RoutingPlan, result: RoutingResult, execution_time: float):
        """Update performance metrics based on routing results."""
        await self.performance_tracker.record_routing_performance(
            plan.primary_agent, plan.decision.value, result.success, execution_time, len(result.agents_used)
        )

    def _record_routing_history(
        self, route_id: str, task: str, plan: RoutingPlan, result: RoutingResult, execution_time: float
    ):
        """Record routing history for analysis."""
        history_entry = {
            "route_id": route_id,
            "timestamp": datetime.now().isoformat(),
            "task": task[:200],  # Truncate for storage
            "decision": plan.decision.value,
            "primary_agent": plan.primary_agent,
            "agents_used": result.agents_used,
            "success": result.success,
            "execution_time": execution_time,
            "confidence": plan.confidence,
            "errors": len(result.errors),
        }

        self.routing_history.append(history_entry)

        # Keep only last 1000 entries
        if len(self.routing_history) > 1000:
            self.routing_history = self.routing_history[-1000:]

    def get_routing_stats(self) -> Dict[str, Any]:
        """Get routing statistics."""
        if not self.routing_history:
            return {"message": "No routing history available"}

        total_routes = len(self.routing_history)
        successful_routes = sum(1 for entry in self.routing_history if entry["success"])

        return {
            "total_routes": total_routes,
            "success_rate": successful_routes / total_routes,
            "average_execution_time": sum(entry["execution_time"] for entry in self.routing_history) / total_routes,
            "decision_distribution": self._get_decision_distribution(),
            "agent_usage": self._get_agent_usage_stats(),
            "recent_performance": (
                self.routing_history[-10:] if len(self.routing_history) >= 10 else self.routing_history
            ),
        }

    def _get_decision_distribution(self) -> Dict[str, int]:
        """Get distribution of routing decisions."""
        distribution = {}
        for entry in self.routing_history:
            decision = entry["decision"]
            distribution[decision] = distribution.get(decision, 0) + 1
        return distribution

    def _get_agent_usage_stats(self) -> Dict[str, int]:
        """Get agent usage statistics."""
        usage = {}
        for entry in self.routing_history:
            for agent in entry["agents_used"]:
                usage[agent] = usage.get(agent, 0) + 1
        return usage


# Global routing engine instance
_routing_engine = None


def get_routing_engine() -> RoutingEngine:
    """Get the global routing engine instance."""
    global _routing_engine
    if _routing_engine is None:
        _routing_engine = RoutingEngine()
    return _routing_engine
