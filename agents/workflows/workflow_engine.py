"""
Workflow Engine for VANA Phase 4

This module implements the workflow execution engine that uses the state manager
for orchestrating complex multi-step workflows with conditional branching,
error recovery, and progress tracking.

Key Features:
- State-driven workflow execution
- Support for sequential, parallel, and loop workflows
- Conditional branching based on results
- Error recovery with automatic retry
- Integration with existing workflow managers
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Union
from uuid import uuid4

import redis.asyncio as redis
from pydantic import BaseModel, Field

from agents.protocols.a2a_protocol import A2AProtocol, A2ARequest
from agents.protocols.parallel_executor import ParallelExecutor, ParallelTask
from agents.workflows.state_manager import WorkflowState, WorkflowStatus
from lib.context.specialist_context import SpecialistContext

logger = logging.getLogger(__name__)


class WorkflowStep(BaseModel):
    """Defines a single step in a workflow"""
    step_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    specialist: Optional[str] = None  # Specialist to execute
    action: Optional[str] = None  # Direct action/function
    inputs: Dict[str, Any] = Field(default_factory=dict)
    conditions: Dict[str, str] = Field(default_factory=dict)  # Next step based on result
    retry_count: int = 3
    timeout: int = 300  # 5 minutes default
    parallel_with: List[str] = Field(default_factory=list)  # Steps to run in parallel


class WorkflowDefinition(BaseModel):
    """Complete workflow definition"""
    workflow_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: str = ""
    steps: List[WorkflowStep]
    initial_step: str
    context_requirements: List[str] = Field(default_factory=list)
    timeout: int = 3600  # 1 hour default
    retry_policy: Dict[str, Any] = Field(default_factory=dict)


class WorkflowExecutionResult(BaseModel):
    """Result of workflow execution"""
    workflow_id: str
    status: WorkflowStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    steps_completed: List[str] = Field(default_factory=list)
    results: Dict[str, Any] = Field(default_factory=dict)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    final_output: Optional[Any] = None


class WorkflowEngine:
    """
    Executes workflows using state management for complex orchestration.
    
    This engine integrates with the WorkflowState manager to provide
    reliable, resumable workflow execution with full observability.
    """
    
    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        a2a_protocol: Optional[A2AProtocol] = None,
        parallel_executor: Optional[ParallelExecutor] = None
    ):
        self.redis_client = redis_client
        self.a2a_protocol = a2a_protocol or A2AProtocol(agent_name="workflow_engine")
        self.parallel_executor = parallel_executor or ParallelExecutor()
        
        # Registry for custom actions
        self.actions: Dict[str, Callable] = {}
        self._register_default_actions()
        
        # Active workflows
        self.active_workflows: Dict[str, WorkflowState] = {}
        
        # Workflow definitions
        self.definitions: Dict[str, WorkflowDefinition] = {}
    
    def _register_default_actions(self):
        """Register default workflow actions"""
        self.actions.update({
            "log": self._action_log,
            "wait": self._action_wait,
            "validate": self._action_validate,
            "transform": self._action_transform,
            "aggregate": self._action_aggregate
        })
    
    async def _action_log(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Log action for debugging"""
        message = kwargs.get("message", "Workflow step executed")
        level = kwargs.get("level", "info")
        getattr(logger, level)(f"Workflow: {message}", extra={"context": context})
        return {"logged": True, "message": message}
    
    async def _action_wait(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Wait action for delays"""
        duration = kwargs.get("duration", 1)
        await asyncio.sleep(duration)
        return {"waited": duration}
    
    async def _action_validate(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Validate data in context"""
        field = kwargs.get("field")
        validator = kwargs.get("validator", "exists")
        
        if validator == "exists":
            valid = field in context
        elif validator == "not_empty":
            valid = bool(context.get(field))
        else:
            valid = False
        
        return {"valid": valid, "field": field, "validator": validator}
    
    async def _action_transform(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Transform data in context"""
        source = kwargs.get("source")
        target = kwargs.get("target")
        transform = kwargs.get("transform", "copy")
        
        if transform == "copy":
            value = context.get(source)
        elif transform == "upper":
            value = str(context.get(source, "")).upper()
        elif transform == "lower":
            value = str(context.get(source, "")).lower()
        else:
            value = None
        
        return {"transformed": True, "target": target, "value": value}
    
    async def _action_aggregate(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Aggregate results from parallel steps"""
        sources = kwargs.get("sources", [])
        method = kwargs.get("method", "merge")
        
        results = []
        for source in sources:
            if source in context.get("step_results", {}):
                results.append(context["step_results"][source])
        
        if method == "merge":
            aggregated = {}
            for result in results:
                if isinstance(result, dict):
                    aggregated.update(result)
        elif method == "list":
            aggregated = results
        else:
            aggregated = results
        
        return {"aggregated": aggregated, "count": len(results)}
    
    def register_action(self, name: str, action: Callable):
        """Register a custom action"""
        self.actions[name] = action
    
    def register_workflow(self, definition: WorkflowDefinition):
        """Register a workflow definition"""
        self.definitions[definition.workflow_id] = definition
    
    async def start_workflow(
        self,
        workflow_id: str,
        initial_context: Optional[Dict[str, Any]] = None,
        specialist_context: Optional[SpecialistContext] = None
    ) -> str:
        """
        Start a new workflow execution.
        
        Returns the execution ID.
        """
        if workflow_id not in self.definitions:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        definition = self.definitions[workflow_id]
        execution_id = f"{workflow_id}_{uuid4()}"
        
        # Create workflow state
        state = WorkflowState(
            workflow_id=execution_id,
            redis_client=self.redis_client
        )
        
        # Initialize context
        context = {
            "workflow_id": workflow_id,
            "execution_id": execution_id,
            "definition": definition.dict(),
            "initial_context": initial_context or {},
            "specialist_context": specialist_context.dict() if specialist_context else {},
            "step_results": {},
            "current_step": definition.initial_step
        }
        
        state.update_context(context)
        
        # Store active workflow
        self.active_workflows[execution_id] = state
        
        # Start execution
        asyncio.create_task(self._execute_workflow(execution_id))
        
        logger.info(f"Started workflow execution: {execution_id}")
        return execution_id
    
    async def _execute_workflow(self, execution_id: str):
        """Execute a workflow"""
        state = self.active_workflows.get(execution_id)
        if not state:
            logger.error(f"Workflow {execution_id} not found")
            return
        
        try:
            # Transition to processing
            await state.transition_to(WorkflowStatus.PROCESSING)
            
            # Get workflow definition
            definition = WorkflowDefinition(**state.context["definition"])
            
            # Execute steps
            while state.current_state == WorkflowStatus.PROCESSING:
                current_step_id = state.context.get("current_step")
                if not current_step_id:
                    # No more steps, complete workflow
                    state.update_context({"processing_complete": True})
                    await state.transition_to(WorkflowStatus.COMPLETE)
                    break
                
                # Find current step
                current_step = None
                for step in definition.steps:
                    if step.step_id == current_step_id or step.name == current_step_id:
                        current_step = step
                        break
                
                if not current_step:
                    raise ValueError(f"Step {current_step_id} not found")
                
                # Check for parallel execution
                if current_step.parallel_with:
                    result = await self._execute_parallel_steps(
                        state, current_step, definition
                    )
                else:
                    result = await self._execute_single_step(state, current_step)
                
                # Store result
                state.context["step_results"][current_step.name] = result
                
                # Determine next step based on conditions
                next_step = self._determine_next_step(current_step, result)
                state.update_context({"current_step": next_step})
                
                # Check if we need review
                if state.context.get("requires_review", False):
                    await state.transition_to(WorkflowStatus.REVIEW)
                    break
            
            # Handle review state
            if state.current_state == WorkflowStatus.REVIEW:
                await self._handle_review(state)
            
            # Final result
            if state.current_state == WorkflowStatus.COMPLETE:
                result = WorkflowExecutionResult(
                    workflow_id=execution_id,
                    status=state.current_state,
                    start_time=datetime.fromisoformat(state.context["created_at"]),
                    end_time=datetime.now(),
                    steps_completed=list(state.context["step_results"].keys()),
                    results=state.context["step_results"],
                    final_output=state.context.get("final_output")
                )
                
                # Store result
                await self._store_result(execution_id, result)
        
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            state.update_context({
                "error": str(e),
                "error_step": state.context.get("current_step")
            })
            await state.transition_to(WorkflowStatus.FAILED)
        
        finally:
            # Cleanup
            if execution_id in self.active_workflows:
                del self.active_workflows[execution_id]
    
    async def _execute_single_step(
        self,
        state: WorkflowState,
        step: WorkflowStep
    ) -> Dict[str, Any]:
        """Execute a single workflow step"""
        logger.info(f"Executing step: {step.name}")
        
        try:
            if step.specialist:
                # Execute via specialist
                request = A2ARequest(
                    query=step.inputs.get("query", ""),
                    context=state.context,
                    metadata=step.inputs
                )
                
                response = await self.a2a_protocol.call_specialist(
                    step.specialist,
                    request
                )
                
                return response.dict()
            
            elif step.action:
                # Execute custom action
                action_fn = self.actions.get(step.action)
                if not action_fn:
                    raise ValueError(f"Action {step.action} not found")
                
                return await action_fn(state.context, **step.inputs)
            
            else:
                # No-op step
                return {"skipped": True, "reason": "No specialist or action defined"}
        
        except Exception as e:
            logger.error(f"Step {step.name} failed: {e}")
            
            # Retry logic
            retry_count = state.context.get(f"retry_{step.name}", 0)
            if retry_count < step.retry_count:
                state.update_context({f"retry_{step.name}": retry_count + 1})
                await asyncio.sleep(2 ** retry_count)  # Exponential backoff
                return await self._execute_single_step(state, step)
            
            raise
    
    async def _execute_parallel_steps(
        self,
        state: WorkflowState,
        primary_step: WorkflowStep,
        definition: WorkflowDefinition
    ) -> Dict[str, Any]:
        """Execute steps in parallel"""
        parallel_steps = [primary_step]
        
        # Find all parallel steps
        for step_name in primary_step.parallel_with:
            for step in definition.steps:
                if step.name == step_name:
                    parallel_steps.append(step)
                    break
        
        # Create parallel tasks
        tasks = []
        for step in parallel_steps:
            if step.specialist:
                task = ParallelTask(
                    task_id=step.step_id,
                    specialist=step.specialist,
                    query=step.inputs.get("query", ""),
                    context=state.context,
                    priority=step.inputs.get("priority", 0)
                )
                tasks.append(task)
        
        # Execute in parallel
        # For now, execute tasks individually and aggregate
        # TODO: Update to use ParallelTask properly
        results = {}
        for task in tasks:
            if task.specialist:
                try:
                    response = await self.a2a_protocol.call_specialist(
                        task.specialist,
                        A2ARequest(
                            query=task.query,
                            context=task.context,
                            metadata={}
                        )
                    )
                    results[task.task_id] = response.dict()
                except Exception as e:
                    logger.error(f"Task {task.task_id} failed: {e}")
                    results[task.task_id] = {"error": str(e)}
        
        result = {"parallel_results": results}
        
        return result
    
    def _determine_next_step(
        self,
        current_step: WorkflowStep,
        result: Dict[str, Any]
    ) -> Optional[str]:
        """Determine next step based on conditions"""
        if not current_step.conditions:
            # No conditions, workflow might be complete
            return None
        
        # Check each condition
        for condition, next_step in current_step.conditions.items():
            if condition == "default":
                continue
            
            # Simple condition evaluation
            if condition == "success" and not result.get("error"):
                return next_step
            elif condition == "failure" and result.get("error"):
                return next_step
            elif condition.startswith("result.") and self._evaluate_condition(condition, result):
                return next_step
        
        # Default condition
        return current_step.conditions.get("default")
    
    def _evaluate_condition(self, condition: str, result: Dict[str, Any]) -> bool:
        """Evaluate a simple condition"""
        try:
            # Simple path-based evaluation
            parts = condition.split(".")
            value = result
            for part in parts[1:]:  # Skip "result"
                value = value.get(part)
                if value is None:
                    return False
            return bool(value)
        except:
            return False
    
    async def _handle_review(self, state: WorkflowState):
        """Handle review state"""
        # Wait for external review
        await state.transition_to(WorkflowStatus.WAITING)
        
        # In real implementation, this would wait for external input
        # For now, auto-approve after delay
        await asyncio.sleep(5)
        
        state.update_context({"review_status": "approved"})
        await state.transition_to(WorkflowStatus.PROCESSING)
    
    async def _store_result(self, execution_id: str, result: WorkflowExecutionResult):
        """Store workflow execution result"""
        if self.redis_client:
            key = f"workflow:result:{execution_id}"
            await self.redis_client.setex(
                key,
                86400,  # 24 hours
                result.json()
            )
    
    async def get_workflow_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get current workflow status"""
        state = self.active_workflows.get(execution_id)
        if state:
            return await state.get_progress()
        
        # Check if completed
        if self.redis_client:
            key = f"workflow:result:{execution_id}"
            result = await self.redis_client.get(key)
            if result:
                return json.loads(result)
        
        return None
    
    async def pause_workflow(self, execution_id: str) -> bool:
        """Pause a running workflow"""
        state = self.active_workflows.get(execution_id)
        if state and state.current_state == WorkflowStatus.PROCESSING:
            return await state.transition_to(WorkflowStatus.WAITING)
        return False
    
    async def resume_workflow(self, execution_id: str) -> bool:
        """Resume a paused workflow"""
        state = self.active_workflows.get(execution_id)
        if state and state.current_state == WorkflowStatus.WAITING:
            return await state.transition_to(WorkflowStatus.PROCESSING)
        return False
    
    async def cancel_workflow(self, execution_id: str) -> bool:
        """Cancel a running workflow"""
        state = self.active_workflows.get(execution_id)
        if state and state.current_state in [WorkflowStatus.PROCESSING, WorkflowStatus.WAITING]:
            return await state.transition_to(WorkflowStatus.CANCELLED)
        return False