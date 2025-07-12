"""
VANA Task Router - Intelligent Task Routing with PLAN/ACT Integration

Combines mode management and confidence scoring for intelligent task delegation.
Implements smart routing with fallback chains and performance tracking.

Thread-safe implementation with race condition protection.
"""

import hashlib
import logging
import time
import uuid
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from threading import RLock
from typing import Any, Dict, List, Optional, Tuple

from .confidence_scorer import CapabilityScore, ConfidenceScorer, TaskAnalysis
from .mode_manager import ExecutionResult, ModeManager, TaskPlan

# Configure logging
logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states for agent failure protection."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""

    failure_threshold: int = 5
    timeout_seconds: int = 60
    success_threshold: int = 3  # For half-open state


class AgentCircuitBreaker:
    """
    Circuit breaker pattern implementation for agent failure protection.

    Prevents cascading failures by temporarily disabling failing agents
    and providing controlled recovery testing.
    """

    def __init__(self, config: Optional[CircuitBreakerConfig] = None):
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.correlation_id = None
        self._lock = RLock()

    def set_correlation_id(self, correlation_id: Optional[str] = None) -> str:
        """Set correlation ID for request tracing."""
        with self._lock:
            self.correlation_id = correlation_id or f"cb_{uuid.uuid4().hex[:8]}"
            return self.correlation_id

    def can_execute(self) -> bool:
        """Check if execution is allowed based on circuit breaker state."""
        with self._lock:
            if self.state == CircuitBreakerState.CLOSED:
                return True
            elif self.state == CircuitBreakerState.OPEN:
                # Check if timeout has passed
                if self.last_failure_time and time.time() - self.last_failure_time > self.config.timeout_seconds:
                    self.state = CircuitBreakerState.HALF_OPEN
                    self.success_count = 0
                    logger.info(f"Circuit breaker transitioning to HALF_OPEN (correlation: {self.correlation_id})")
                    return True
                return False
            elif self.state == CircuitBreakerState.HALF_OPEN:
                return True
            return False

    def record_success(self):
        """Record successful execution."""
        with self._lock:
            if self.state == CircuitBreakerState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.config.success_threshold:
                    self.state = CircuitBreakerState.CLOSED
                    self.failure_count = 0
                    logger.info(f"Circuit breaker recovered to CLOSED (correlation: {self.correlation_id})")
            elif self.state == CircuitBreakerState.CLOSED:
                self.failure_count = max(0, self.failure_count - 1)  # Gradual recovery

    def record_failure(self):
        """Record failed execution."""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.state == CircuitBreakerState.CLOSED:
                if self.failure_count >= self.config.failure_threshold:
                    self.state = CircuitBreakerState.OPEN
                    logger.warning(f"Circuit breaker OPENED due to failures (correlation: {self.correlation_id})")
            elif self.state == CircuitBreakerState.HALF_OPEN:
                self.state = CircuitBreakerState.OPEN
                logger.warning(f"Circuit breaker returned to OPEN from HALF_OPEN (correlation: {self.correlation_id})")

    def get_state_info(self) -> Dict[str, Any]:
        """Get current circuit breaker state information."""
        with self._lock:
            return {
                "state": self.state.value,
                "failure_count": self.failure_count,
                "success_count": self.success_count,
                "last_failure_time": self.last_failure_time,
                "correlation_id": self.correlation_id,
                "can_execute": self.can_execute(),
            }


@dataclass
class RoutingDecision:
    """Represents a complete routing decision with rationale."""

    task_id: str
    task_description: str
    selected_agent: str
    confidence_score: float
    requires_planning: bool
    collaboration_agents: List[str]
    execution_plan: Optional[TaskPlan]
    reasoning: str
    fallback_agents: List[str]
    estimated_duration: str
    created_at: float


class TaskRouter:
    """
    Intelligent task router that combines PLAN/ACT mode management
    with confidence-based agent selection.

    Features:
    - Smart task analysis and complexity assessment
    - Confidence-based agent selection with fallback chains
    - PLAN/ACT mode integration for complex tasks
    - Performance tracking and learning
    - Multi-agent collaboration coordination
    - Thread-safe operations with race condition protection
    - Circuit breaker pattern for failure resilience
    """

    def __init__(self):
        self.mode_manager = ModeManager()
        self.confidence_scorer = ConfidenceScorer()
        self.routing_history: List[RoutingDecision] = []
        self.active_routes: Dict[str, RoutingDecision] = {}

        # Routing thresholds
        self.min_confidence_threshold = 0.4
        self.planning_complexity_threshold = 0.6
        self.collaboration_threshold = 0.7

        # Performance optimization: Caching for routing decisions
        self._routing_cache: Dict[str, RoutingDecision] = {}
        self._agent_selection_cache: Dict[str, Tuple[str, CapabilityScore]] = {}

        # Thread safety locks
        self._routing_cache_lock = RLock()
        self._history_lock = RLock()
        self._active_routes_lock = RLock()

        # Circuit breakers for agent failure protection
        self._agent_circuit_breakers: Dict[str, AgentCircuitBreaker] = {}
        self._circuit_breaker_lock = RLock()

        # Request correlation tracking
        self._correlation_id = None

    def set_correlation_id(self, correlation_id: Optional[str] = None) -> str:
        """Set correlation ID for request tracing."""
        self._correlation_id = correlation_id or f"route_{uuid.uuid4().hex[:8]}"
        return self._correlation_id

    def get_agent_circuit_breaker(self, agent_name: str) -> AgentCircuitBreaker:
        """Get or create circuit breaker for an agent."""
        with self._circuit_breaker_lock:
            if agent_name not in self._agent_circuit_breakers:
                self._agent_circuit_breakers[agent_name] = AgentCircuitBreaker()
                self._agent_circuit_breakers[agent_name].set_correlation_id(self._correlation_id)
            return self._agent_circuit_breakers[agent_name]

    def route_task(
        self,
        task_description: str,
        context: Optional[Dict[str, Any]] = None,
        force_planning: bool = False,
    ) -> RoutingDecision:
        """
        Route a task to the most appropriate agent(s) with intelligent planning and caching.

        Thread-safe implementation with circuit breaker protection.
        Uses caching to improve performance for similar tasks.
        """
        # Set correlation ID for this request
        correlation_id = self.set_correlation_id()

        # Create cache key for this routing decision
        cache_key = self._get_routing_cache_key(task_description, context, force_planning)

        # Thread-safe cache check
        with self._routing_cache_lock:
            if cache_key in self._routing_cache:
                cached_decision = self._routing_cache[cache_key]
                # Create a new decision with updated timestamp but same routing logic
                logger.debug(f"Cache hit for routing decision (correlation: {correlation_id})")
                return self._create_cached_routing_decision(cached_decision, task_description)

        # Perform actual routing
        try:
            result = self._route_task_uncached(task_description, context, force_planning)

            # Thread-safe cache update
            with self._routing_cache_lock:
                # Cache the result (limit cache size)
                if len(self._routing_cache) > 200:
                    # Remove oldest entries (simple FIFO)
                    oldest_keys = list(self._routing_cache.keys())[:50]
                    for key in oldest_keys:
                        del self._routing_cache[key]
                    logger.debug(f"Cache cleanup performed (correlation: {correlation_id})")

                self._routing_cache[cache_key] = result

            logger.info(f"Task routed to {result.selected_agent} (correlation: {correlation_id})")
            return result

        except Exception as e:
            logger.error(f"Routing failed (correlation: {correlation_id}): {str(e)}")
            raise

    def _route_task_uncached(
        self,
        task_description: str,
        context: Optional[Dict[str, Any]] = None,
        force_planning: bool = False,
    ) -> RoutingDecision:
        """
        Route a task to the most appropriate agent(s) with intelligent planning.

        Thread-safe implementation with circuit breaker protection.

        Args:
            task_description: Description of the task to route
            context: Additional context for routing decisions
            force_planning: Force planning phase regardless of complexity

        Returns:
            RoutingDecision with complete routing information
        """
        context = context or {}

        # Step 1: Analyze task complexity and requirements
        task_analysis = self.confidence_scorer.analyze_task(task_description)

        # Step 2: Get agent confidence scores with circuit breaker check
        best_agent, best_score = self.confidence_scorer.get_best_agent_for_task(task_description)

        # Check circuit breaker for selected agent
        circuit_breaker = self.get_agent_circuit_breaker(best_agent)
        if not circuit_breaker.can_execute():
            logger.warning(f"Agent {best_agent} circuit breaker is OPEN, finding alternative")
            # Find alternative agent
            collaboration_recommendations = self.confidence_scorer.get_collaboration_recommendations(task_description)
            alternative_found = False

            for alt_agent, alt_score in collaboration_recommendations:
                if alt_agent != best_agent:
                    alt_circuit_breaker = self.get_agent_circuit_breaker(alt_agent)
                    if alt_circuit_breaker.can_execute():
                        best_agent = alt_agent
                        best_score = alt_score
                        alternative_found = True
                        logger.info(f"Using alternative agent {best_agent} (correlation: {self._correlation_id})")
                        break

            if not alternative_found:
                logger.error(
                    f"No available agents found, all circuit breakers open (correlation: {self._correlation_id})"
                )
                # Use VANA as final fallback regardless of circuit breaker
                best_agent = "vana"
                # Create a basic score for VANA
                from .confidence_scorer import AgentSpecialty, CapabilityScore

                best_score = CapabilityScore(
                    agent_name="vana",
                    specialty=AgentSpecialty.ORCHESTRATION,
                    base_confidence=0.5,
                    task_match_score=0.5,
                    experience_bonus=0.0,
                    final_confidence=0.5,
                    reasoning="Emergency fallback due to circuit breaker protection",
                )

        collaboration_recommendations = self.confidence_scorer.get_collaboration_recommendations(task_description)

        # Step 3: Determine if planning is required
        requires_planning = (
            force_planning
            or task_analysis.complexity_score > self.planning_complexity_threshold
            or best_score.final_confidence < self.min_confidence_threshold
            or task_analysis.collaboration_needed
        )

        # Step 4: Create execution plan if needed
        execution_plan = None
        if requires_planning:
            execution_plan = self.mode_manager.create_execution_plan(task_description, context)

        # Step 5: Build fallback chain (filter by circuit breaker status)
        fallback_agents = self._build_fallback_chain_with_circuit_breaker(collaboration_recommendations, best_agent)

        # Step 6: Extract collaboration agents
        collaboration_agents = [agent for agent, _ in collaboration_recommendations if agent != best_agent]

        # Step 7: Generate routing reasoning
        reasoning = self._generate_routing_reasoning(task_analysis, best_score, requires_planning, collaboration_agents)

        # Step 8: Create routing decision with correlation ID
        task_id = f"route_{int(time.time() * 1000)}_{self._correlation_id}"

        routing_decision = RoutingDecision(
            task_id=task_id,
            task_description=task_description,
            selected_agent=best_agent,
            confidence_score=best_score.final_confidence,
            requires_planning=requires_planning,
            collaboration_agents=collaboration_agents,
            execution_plan=execution_plan,
            reasoning=reasoning,
            fallback_agents=fallback_agents,
            estimated_duration=task_analysis.estimated_duration,
            created_at=time.time(),
        )

        # Step 9: Thread-safe storage of routing decision
        with self._history_lock:
            self.routing_history.append(routing_decision)

        with self._active_routes_lock:
            self.active_routes[task_id] = routing_decision

        return routing_decision

    def _build_fallback_chain(
        self,
        collaboration_recommendations: List[Tuple[str, CapabilityScore]],
        primary_agent: str,
    ) -> List[str]:
        """Build fallback chain for error recovery."""
        fallback_chain = []

        # Add collaboration agents as fallbacks (excluding primary)
        for agent, score in collaboration_recommendations:
            if agent != primary_agent and score.final_confidence > 0.3:
                fallback_chain.append(agent)

        # Always include VANA orchestrator as final fallback if not already included
        if "vana" not in fallback_chain and primary_agent != "vana":
            fallback_chain.append("vana")

        return fallback_chain[:3]  # Limit to 3 fallback options

    def _build_fallback_chain_with_circuit_breaker(
        self,
        collaboration_recommendations: List[Tuple[str, CapabilityScore]],
        primary_agent: str,
    ) -> List[str]:
        """Build fallback chain for error recovery with circuit breaker protection."""
        fallback_chain = []

        # Add collaboration agents as fallbacks (excluding primary and checking circuit breakers)
        for agent, score in collaboration_recommendations:
            if agent != primary_agent and score.final_confidence > 0.3:
                circuit_breaker = self.get_agent_circuit_breaker(agent)
                if circuit_breaker.can_execute():
                    fallback_chain.append(agent)
                else:
                    logger.debug(
                        f"Skipping {agent} for fallback - circuit breaker is OPEN (correlation: {self._correlation_id})"
                    )

        # Always include VANA orchestrator as final fallback if not already included
        # (VANA is allowed even if circuit breaker is open as emergency fallback)
        if "vana" not in fallback_chain and primary_agent != "vana":
            fallback_chain.append("vana")

        return fallback_chain[:3]  # Limit to 3 fallback options

    def _generate_routing_reasoning(
        self,
        task_analysis: TaskAnalysis,
        best_score: CapabilityScore,
        requires_planning: bool,
        collaboration_agents: List[str],
    ) -> str:
        """Generate human-readable reasoning for routing decision."""
        reasoning_parts = []

        # Primary agent selection reasoning
        reasoning_parts.append(f"Selected {best_score.agent_name} (confidence: {best_score.final_confidence:.2f})")
        reasoning_parts.append(best_score.reasoning)

        # Planning reasoning
        if requires_planning:
            reasoning_parts.append("Planning phase required due to task complexity")
        else:
            reasoning_parts.append("Direct execution recommended")

        # Collaboration reasoning
        if collaboration_agents:
            collab_list = ", ".join(collaboration_agents)
            reasoning_parts.append(f"Collaboration recommended with: {collab_list}")

        # Complexity assessment
        if task_analysis.complexity_score > 0.7:
            reasoning_parts.append("High complexity task requiring careful coordination")
        elif task_analysis.complexity_score < 0.3:
            reasoning_parts.append("Low complexity task suitable for direct execution")

        return "; ".join(reasoning_parts)

    def execute_routing_decision(self, routing_decision: RoutingDecision) -> ExecutionResult:
        """
        Execute a routing decision with proper mode management and circuit breaker protection.

        Args:
            routing_decision: The routing decision to execute

        Returns:
            ExecutionResult with execution details
        """
        start_time = time.time()
        errors = []
        outputs = []

        # Get circuit breaker for the selected agent
        circuit_breaker = self.get_agent_circuit_breaker(routing_decision.selected_agent)

        try:
            # Check circuit breaker before execution
            if not circuit_breaker.can_execute():
                raise Exception(f"Agent {routing_decision.selected_agent} circuit breaker is OPEN")

            if routing_decision.requires_planning and routing_decision.execution_plan:
                # Execute with planning
                result = self._execute_with_planning(routing_decision)
            else:
                # Direct execution
                result = self._execute_direct(routing_decision)

            # Record successful execution
            execution_time = time.time() - start_time

            # Record success in circuit breaker
            circuit_breaker.record_success()

            # Update performance history
            self.confidence_scorer.record_performance(
                routing_decision.selected_agent, result.get("performance_score", 0.8)
            )

            logger.info(
                f"Task execution successful for {routing_decision.selected_agent} (correlation: {self._correlation_id})"
            )

            return ExecutionResult(
                task_id=routing_decision.task_id,
                success=True,
                completed_steps=result.get("completed_steps", 1),
                total_steps=result.get("total_steps", 1),
                execution_time=execution_time,
                errors=errors,
                outputs=[result],
                confidence_score=routing_decision.confidence_score,
            )

        except Exception as e:
            # Handle execution failure
            errors.append(str(e))
            execution_time = time.time() - start_time

            # Record failure in circuit breaker
            circuit_breaker.record_failure()

            logger.warning(
                f"Task execution failed for {routing_decision.selected_agent}: {str(e)} (correlation: {self._correlation_id})"
            )

            # Try fallback if available
            if routing_decision.fallback_agents:
                fallback_result = self._try_fallback_execution_with_circuit_breaker(routing_decision, str(e))
                if fallback_result:
                    return fallback_result

            # Record failed execution
            self.confidence_scorer.record_performance(routing_decision.selected_agent, 0.2)

            return ExecutionResult(
                task_id=routing_decision.task_id,
                success=False,
                completed_steps=0,
                total_steps=1,
                execution_time=execution_time,
                errors=errors,
                outputs=outputs,
                confidence_score=routing_decision.confidence_score,
            )

    def _execute_with_planning(self, routing_decision: RoutingDecision) -> Dict[str, Any]:
        """Execute task with planning phase."""
        plan = routing_decision.execution_plan

        if not plan:
            raise ValueError("Planning required but no execution plan available")

        # Transition to ACT mode
        if not self.mode_manager.transition_to_act_mode(plan):
            raise ValueError("Cannot transition to ACT mode - plan insufficient")

        # Execute plan steps
        completed_steps = 0
        step_outputs = []

        for i, step in enumerate(plan.steps):
            try:
                # Simulate step execution (in real implementation, this would call actual tools)
                step_result = self._execute_plan_step(step, routing_decision.selected_agent)
                step_outputs.append(step_result)
                completed_steps += 1

                # Validate step completion
                if not self._validate_step_completion(step, step_result):
                    raise ValueError(f"Step {i + 1} validation failed: {step['description']}")

            except Exception as e:
                raise ValueError(f"Step {i + 1} execution failed: {str(e)}")

        return {
            "completed_steps": completed_steps,
            "total_steps": len(plan.steps),
            "step_outputs": step_outputs,
            "performance_score": 0.9,
            "execution_mode": "planned",
        }

    def _execute_direct(self, routing_decision: RoutingDecision) -> Dict[str, Any]:
        """Execute task directly without planning."""
        # Simulate direct execution
        result = {
            "task_description": routing_decision.task_description,
            "selected_agent": routing_decision.selected_agent,
            "execution_mode": "direct",
            "performance_score": 0.8,
        }

        return result

    def _execute_plan_step(self, step: Dict[str, Any], agent_name: str) -> Dict[str, Any]:
        """Execute a single plan step."""
        # This is a simulation - in real implementation, this would:
        # 1. Call the appropriate tools
        # 2. Delegate to the specified agent
        # 3. Validate the results

        return {
            "step_action": step["action"],
            "step_description": step["description"],
            "tools_used": step.get("tools", []),
            "agent": agent_name,
            "status": "completed",
            "output": f"Executed {step['action']} successfully",
        }

    def _validate_step_completion(self, step: Dict[str, Any], step_result: Dict[str, Any]) -> bool:
        """Validate that a step completed successfully."""
        # Simple validation - in real implementation, this would check:
        # 1. Expected outputs are present
        # 2. Validation criteria are met
        # 3. No critical errors occurred

        return step_result.get("status") == "completed"

    def _try_fallback_execution(self, routing_decision: RoutingDecision, error: str) -> Optional[ExecutionResult]:
        """Try fallback agents if primary execution fails."""
        for fallback_agent in routing_decision.fallback_agents:
            try:
                # Create new routing decision for fallback
                fallback_routing = RoutingDecision(
                    task_id=f"{routing_decision.task_id}_fallback",
                    task_description=routing_decision.task_description,
                    selected_agent=fallback_agent,
                    confidence_score=0.6,  # Lower confidence for fallback
                    requires_planning=False,  # Simplified execution for fallback
                    collaboration_agents=[],
                    execution_plan=None,
                    reasoning=f"Fallback execution after primary failure: {error}",
                    fallback_agents=[],
                    estimated_duration="Extended due to fallback",
                    created_at=time.time(),
                )

                # Try fallback execution
                fallback_result = self._execute_direct(fallback_routing)

                return ExecutionResult(
                    task_id=routing_decision.task_id,
                    success=True,
                    completed_steps=1,
                    total_steps=1,
                    execution_time=0.0,  # Will be updated by caller
                    errors=[
                        f"Primary agent failed: {error}",
                        "Recovered with fallback",
                    ],
                    outputs=[fallback_result],
                    confidence_score=0.6,
                )

            except Exception:
                continue  # Try next fallback

        return None  # All fallbacks failed

    def _try_fallback_execution_with_circuit_breaker(
        self, routing_decision: RoutingDecision, error: str
    ) -> Optional[ExecutionResult]:
        """Try fallback agents if primary execution fails, with circuit breaker protection."""
        for fallback_agent in routing_decision.fallback_agents:
            try:
                # Check circuit breaker for fallback agent
                fallback_circuit_breaker = self.get_agent_circuit_breaker(fallback_agent)
                if not fallback_circuit_breaker.can_execute() and fallback_agent != "vana":
                    logger.debug(
                        f"Skipping fallback {fallback_agent} - circuit breaker is OPEN (correlation: {self._correlation_id})"
                    )
                    continue

                # Create new routing decision for fallback
                fallback_routing = RoutingDecision(
                    task_id=f"{routing_decision.task_id}_fallback_{fallback_agent}",
                    task_description=routing_decision.task_description,
                    selected_agent=fallback_agent,
                    confidence_score=0.6,  # Lower confidence for fallback
                    requires_planning=False,  # Simplified execution for fallback
                    collaboration_agents=[],
                    execution_plan=None,
                    reasoning=f"Fallback execution after primary failure: {error}",
                    fallback_agents=[],
                    estimated_duration="Extended due to fallback",
                    created_at=time.time(),
                )

                # Try fallback execution
                fallback_result = self._execute_direct(fallback_routing)

                # Record success in fallback circuit breaker
                fallback_circuit_breaker.record_success()

                logger.info(
                    f"Fallback execution successful with {fallback_agent} (correlation: {self._correlation_id})"
                )

                return ExecutionResult(
                    task_id=routing_decision.task_id,
                    success=True,
                    completed_steps=1,
                    total_steps=1,
                    execution_time=0.0,  # Will be updated by caller
                    errors=[
                        f"Primary agent failed: {error}",
                        f"Recovered with fallback: {fallback_agent}",
                    ],
                    outputs=[fallback_result],
                    confidence_score=0.6,
                )

            except Exception as fallback_error:
                # Record failure in fallback circuit breaker
                fallback_circuit_breaker = self.get_agent_circuit_breaker(fallback_agent)
                fallback_circuit_breaker.record_failure()
                logger.warning(
                    f"Fallback {fallback_agent} also failed: {str(fallback_error)} (correlation: {self._correlation_id})"
                )
                continue  # Try next fallback

        return None  # All fallbacks failed

    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """Get status of all circuit breakers."""
        with self._circuit_breaker_lock:
            return {
                agent_name: breaker.get_state_info() for agent_name, breaker in self._agent_circuit_breakers.items()
            }

    def reset_circuit_breaker(self, agent_name: str) -> bool:
        """Reset circuit breaker for a specific agent."""
        with self._circuit_breaker_lock:
            if agent_name in self._agent_circuit_breakers:
                breaker = self._agent_circuit_breakers[agent_name]
                breaker.state = CircuitBreakerState.CLOSED
                breaker.failure_count = 0
                breaker.success_count = 0
                logger.info(f"Circuit breaker reset for {agent_name} (correlation: {self._correlation_id})")
                return True
            return False

    def get_routing_statistics(self) -> Dict[str, Any]:
        """Get routing performance statistics."""
        if not self.routing_history:
            return {"message": "No routing history available"}

        total_routes = len(self.routing_history)
        planned_routes = sum(1 for r in self.routing_history if r.requires_planning)

        # Agent usage statistics
        agent_usage = {}
        for route in self.routing_history:
            agent = route.selected_agent
            agent_usage[agent] = agent_usage.get(agent, 0) + 1

        # Average confidence scores
        avg_confidence = sum(r.confidence_score for r in self.routing_history) / total_routes

        return {
            "total_routes": total_routes,
            "planned_routes": planned_routes,
            "direct_routes": total_routes - planned_routes,
            "planning_rate": planned_routes / total_routes,
            "average_confidence": avg_confidence,
            "agent_usage": agent_usage,
            "active_routes": len(self.active_routes),
        }

    def get_agent_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for all agents."""
        return {
            "confidence_scorer_status": self.confidence_scorer.get_confidence_summary(),
            "mode_manager_status": self.mode_manager.get_mode_status(),
            "routing_statistics": self.get_routing_statistics(),
        }

    # ========== PERFORMANCE OPTIMIZATION METHODS ==========

    def _get_routing_cache_key(
        self,
        task_description: str,
        context: Optional[Dict[str, Any]],
        force_planning: bool,
    ) -> str:
        """Generate cache key for routing decisions."""
        # Normalize task description for better cache hits
        normalized_task = task_description.lower().strip()
        normalized_task = hashlib.sha256(normalized_task.encode()).hexdigest()[:16]

        # Include relevant context in cache key
        context_key = ""
        if context:
            # Only include context keys that affect routing
            relevant_context = {k: v for k, v in context.items() if k in ["priority", "deadline", "complexity"]}
            if relevant_context:
                context_key = hashlib.sha256(str(sorted(relevant_context.items())).encode()).hexdigest()[:8]

        return f"{normalized_task}_{context_key}_{force_planning}"

    def _create_cached_routing_decision(
        self, cached_decision: RoutingDecision, task_description: str
    ) -> RoutingDecision:
        """Create a new routing decision based on cached result with updated timestamp."""
        task_id = f"route_{int(time.time() * 1000)}"

        return RoutingDecision(
            task_id=task_id,
            task_description=task_description,
            selected_agent=cached_decision.selected_agent,
            confidence_score=cached_decision.confidence_score,
            requires_planning=cached_decision.requires_planning,
            collaboration_agents=cached_decision.collaboration_agents,
            execution_plan=cached_decision.execution_plan,
            reasoning=f"Cached: {cached_decision.reasoning}",
            fallback_agents=cached_decision.fallback_agents,
            estimated_duration=cached_decision.estimated_duration,
            created_at=time.time(),
        )

    @lru_cache(maxsize=500)
    def _get_cached_agent_selection(self, task_description: str) -> Tuple[str, CapabilityScore]:
        """Cached agent selection for performance optimization."""
        return self.confidence_scorer.get_best_agent_for_task(task_description)

    def _get_task_similarity_hash(self, task_description: str) -> str:
        """Generate similarity hash for task caching."""
        # Extract key words for similarity matching
        words = task_description.lower().split()
        # Filter out common words that don't affect routing
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
        }
        key_words = [w for w in words if w not in stop_words and len(w) > 2]

        # Sort words for consistent hashing
        key_words.sort()
        return hashlib.sha256(" ".join(key_words).encode()).hexdigest()

    def clear_caches(self):
        """Clear all caches for memory management."""
        self._routing_cache.clear()
        self._agent_selection_cache.clear()
        # Clear LRU cache
        self._get_cached_agent_selection.cache_clear()

    def get_cache_statistics(self) -> Dict[str, Any]:
        """Get cache performance statistics."""
        return {
            "routing_cache_size": len(self._routing_cache),
            "agent_selection_cache_size": len(self._agent_selection_cache),
            "lru_cache_info": self._get_cached_agent_selection.cache_info()._asdict(),
        }
