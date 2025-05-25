"""
VANA Task Router - Intelligent Task Routing with PLAN/ACT Integration

Combines mode management and confidence scoring for intelligent task delegation.
Implements smart routing with fallback chains and performance tracking.
"""

from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
import time
import json

from .mode_manager import ModeManager, AgentMode, TaskPlan, ExecutionResult
from .confidence_scorer import ConfidenceScorer, CapabilityScore, TaskAnalysis


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
        
    def route_task(
        self, 
        task_description: str, 
        context: Dict[str, Any] = None,
        force_planning: bool = False
    ) -> RoutingDecision:
        """
        Route a task to the most appropriate agent(s) with intelligent planning.
        
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
        
        # Step 2: Get agent confidence scores
        best_agent, best_score = self.confidence_scorer.get_best_agent_for_task(task_description)
        collaboration_recommendations = self.confidence_scorer.get_collaboration_recommendations(task_description)
        
        # Step 3: Determine if planning is required
        requires_planning = (
            force_planning or
            task_analysis.complexity_score > self.planning_complexity_threshold or
            best_score.final_confidence < self.min_confidence_threshold or
            task_analysis.collaboration_needed
        )
        
        # Step 4: Create execution plan if needed
        execution_plan = None
        if requires_planning:
            execution_plan = self.mode_manager.create_execution_plan(task_description, context)
        
        # Step 5: Build fallback chain
        fallback_agents = self._build_fallback_chain(collaboration_recommendations, best_agent)
        
        # Step 6: Extract collaboration agents
        collaboration_agents = [agent for agent, _ in collaboration_recommendations if agent != best_agent]
        
        # Step 7: Generate routing reasoning
        reasoning = self._generate_routing_reasoning(
            task_analysis, best_score, requires_planning, collaboration_agents
        )
        
        # Step 8: Create routing decision
        task_id = f"route_{int(time.time() * 1000)}"
        
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
            created_at=time.time()
        )
        
        # Step 9: Store routing decision
        self.routing_history.append(routing_decision)
        self.active_routes[task_id] = routing_decision
        
        return routing_decision
    
    def _build_fallback_chain(
        self, 
        collaboration_recommendations: List[Tuple[str, CapabilityScore]], 
        primary_agent: str
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
    
    def _generate_routing_reasoning(
        self,
        task_analysis: TaskAnalysis,
        best_score: CapabilityScore,
        requires_planning: bool,
        collaboration_agents: List[str]
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
        Execute a routing decision with proper mode management.
        
        Args:
            routing_decision: The routing decision to execute
            
        Returns:
            ExecutionResult with execution details
        """
        start_time = time.time()
        errors = []
        outputs = []
        
        try:
            if routing_decision.requires_planning and routing_decision.execution_plan:
                # Execute with planning
                result = self._execute_with_planning(routing_decision)
            else:
                # Direct execution
                result = self._execute_direct(routing_decision)
            
            # Record successful execution
            execution_time = time.time() - start_time
            
            # Update performance history
            self.confidence_scorer.record_performance(
                routing_decision.selected_agent, 
                result.get("performance_score", 0.8)
            )
            
            return ExecutionResult(
                task_id=routing_decision.task_id,
                success=True,
                completed_steps=result.get("completed_steps", 1),
                total_steps=result.get("total_steps", 1),
                execution_time=execution_time,
                errors=errors,
                outputs=[result],
                confidence_score=routing_decision.confidence_score
            )
            
        except Exception as e:
            # Handle execution failure
            errors.append(str(e))
            execution_time = time.time() - start_time
            
            # Try fallback if available
            if routing_decision.fallback_agents:
                fallback_result = self._try_fallback_execution(routing_decision, str(e))
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
                confidence_score=routing_decision.confidence_score
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
                    raise ValueError(f"Step {i+1} validation failed: {step['description']}")
                    
            except Exception as e:
                raise ValueError(f"Step {i+1} execution failed: {str(e)}")
        
        return {
            "completed_steps": completed_steps,
            "total_steps": len(plan.steps),
            "step_outputs": step_outputs,
            "performance_score": 0.9,
            "execution_mode": "planned"
        }
    
    def _execute_direct(self, routing_decision: RoutingDecision) -> Dict[str, Any]:
        """Execute task directly without planning."""
        # Simulate direct execution
        result = {
            "task_description": routing_decision.task_description,
            "selected_agent": routing_decision.selected_agent,
            "execution_mode": "direct",
            "performance_score": 0.8
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
            "output": f"Executed {step['action']} successfully"
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
                    created_at=time.time()
                )
                
                # Try fallback execution
                fallback_result = self._execute_direct(fallback_routing)
                
                return ExecutionResult(
                    task_id=routing_decision.task_id,
                    success=True,
                    completed_steps=1,
                    total_steps=1,
                    execution_time=0.0,  # Will be updated by caller
                    errors=[f"Primary agent failed: {error}", "Recovered with fallback"],
                    outputs=[fallback_result],
                    confidence_score=0.6
                )
                
            except Exception as fallback_error:
                continue  # Try next fallback
        
        return None  # All fallbacks failed
    
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
            "active_routes": len(self.active_routes)
        }
    
    def get_agent_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for all agents."""
        return {
            "confidence_scorer_status": self.confidence_scorer.get_confidence_summary(),
            "mode_manager_status": self.mode_manager.get_mode_status(),
            "routing_statistics": self.get_routing_statistics()
        }
