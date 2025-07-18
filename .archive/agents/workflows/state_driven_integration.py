"""
State-Driven Workflow Integration for VANA Phase 4

This module bridges the new state-driven workflow system with existing
workflow managers, providing backward compatibility while enabling
enhanced state management capabilities.

Key Features:
- Adapter pattern for existing workflow managers
- State tracking overlay for legacy workflows
- Seamless migration path
- Enhanced monitoring and recovery
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Union

from agents.workflows.loop_workflow_manager_v2 import LoopWorkflowManagerV2
from agents.workflows.parallel_workflow_manager_v2 import ParallelWorkflowManagerV2
from agents.workflows.sequential_workflow_manager_v2 import SequentialWorkflowManagerV2
from agents.workflows.state_manager import WorkflowState, WorkflowStatus
from agents.workflows.workflow_engine import (
    WorkflowDefinition,
    WorkflowEngine,
    WorkflowStep
)

logger = logging.getLogger(__name__)


class WorkflowAdapter:
    """
    Adapter to integrate existing workflow managers with state-driven system.
    
    This adapter wraps existing workflow managers and adds state tracking,
    persistence, and enhanced monitoring capabilities.
    """
    
    def __init__(self, workflow_engine: WorkflowEngine):
        self.workflow_engine = workflow_engine
        self.sequential_manager = SequentialWorkflowManagerV2()
        self.parallel_manager = ParallelWorkflowManagerV2()
        self.loop_manager = LoopWorkflowManagerV2()
    
    async def create_state_driven_sequential(
        self,
        task_chain: List[Dict[str, Any]],
        workflow_name: str = "StateDrivenSequential"
    ) -> str:
        """
        Create a state-driven sequential workflow from task chain.
        
        Args:
            task_chain: Legacy task chain format
            workflow_name: Name for the workflow
            
        Returns:
            Workflow execution ID
        """
        # Convert task chain to workflow definition
        steps = []
        for i, task in enumerate(task_chain):
            step = WorkflowStep(
                name=task.get("name", f"step_{i}"),
                specialist=task.get("specialist"),
                inputs={
                    "query": task.get("query", ""),
                    "context": task.get("context", {}),
                    **task.get("params", {})
                },
                conditions={
                    "success": f"step_{i+1}" if i < len(task_chain) - 1 else None,
                    "failure": "error_handler"
                }
            )
            steps.append(step)
        
        # Add error handler step
        steps.append(WorkflowStep(
            name="error_handler",
            action="log",
            inputs={"message": "Workflow failed", "level": "error"}
        ))
        
        # Create workflow definition
        definition = WorkflowDefinition(
            name=workflow_name,
            description=f"State-driven adaptation of sequential workflow",
            steps=steps,
            initial_step=steps[0].name if steps else "error_handler"
        )
        
        # Register and start workflow
        self.workflow_engine.register_workflow(definition)
        return await self.workflow_engine.start_workflow(definition.workflow_id)
    
    async def create_state_driven_parallel(
        self,
        parallel_tasks: List[Dict[str, Any]],
        workflow_name: str = "StateDrivenParallel",
        aggregation_method: str = "MERGE"
    ) -> str:
        """
        Create a state-driven parallel workflow.
        
        Args:
            parallel_tasks: List of tasks to run in parallel
            workflow_name: Name for the workflow
            aggregation_method: How to aggregate results
            
        Returns:
            Workflow execution ID
        """
        if not parallel_tasks:
            raise ValueError("Parallel tasks cannot be empty")
        
        # Create primary step with parallel execution
        primary_step = WorkflowStep(
            name="parallel_execution",
            specialist=parallel_tasks[0].get("specialist"),
            inputs=parallel_tasks[0].get("inputs", {}),
            parallel_with=[f"parallel_{i}" for i in range(1, len(parallel_tasks))]
        )
        
        steps = [primary_step]
        
        # Add parallel steps
        for i, task in enumerate(parallel_tasks[1:], 1):
            step = WorkflowStep(
                name=f"parallel_{i}",
                specialist=task.get("specialist"),
                inputs=task.get("inputs", {})
            )
            steps.append(step)
        
        # Add aggregation step
        steps.append(WorkflowStep(
            name="aggregate_results",
            action="aggregate",
            inputs={
                "sources": [s.name for s in steps[:-1]],
                "method": aggregation_method.lower()
            },
            conditions={"success": None}
        ))
        
        # Create workflow definition
        definition = WorkflowDefinition(
            name=workflow_name,
            description=f"State-driven parallel workflow with {aggregation_method} aggregation",
            steps=steps,
            initial_step="parallel_execution"
        )
        
        # Register and start workflow
        self.workflow_engine.register_workflow(definition)
        return await self.workflow_engine.start_workflow(definition.workflow_id)
    
    async def create_state_driven_loop(
        self,
        loop_config: Dict[str, Any],
        workflow_name: str = "StateDrivenLoop"
    ) -> str:
        """
        Create a state-driven loop workflow.
        
        Args:
            loop_config: Loop configuration with condition and tasks
            workflow_name: Name for the workflow
            
        Returns:
            Workflow execution ID
        """
        # Extract loop components
        condition = loop_config.get("condition", {})
        loop_tasks = loop_config.get("tasks", [])
        max_iterations = loop_config.get("max_iterations", 10)
        
        steps = []
        
        # Initialize loop counter
        steps.append(WorkflowStep(
            name="init_loop",
            action="transform",
            inputs={
                "source": "iteration_count",
                "target": "iteration_count",
                "transform": "copy"
            },
            conditions={"success": "check_condition"}
        ))
        
        # Condition check step
        steps.append(WorkflowStep(
            name="check_condition",
            action="validate",
            inputs={
                "field": "iteration_count",
                "validator": "not_empty"
            },
            conditions={
                "success": "loop_body" if loop_tasks else "complete_loop",
                "failure": "complete_loop"
            }
        ))
        
        # Loop body steps
        for i, task in enumerate(loop_tasks):
            step = WorkflowStep(
                name=f"loop_task_{i}",
                specialist=task.get("specialist"),
                inputs=task.get("inputs", {}),
                conditions={
                    "success": f"loop_task_{i+1}" if i < len(loop_tasks) - 1 else "increment_counter"
                }
            )
            steps.append(step)
        
        # Increment counter
        steps.append(WorkflowStep(
            name="increment_counter",
            action="transform",
            inputs={
                "source": "iteration_count",
                "target": "iteration_count",
                "transform": "increment"
            },
            conditions={"success": "check_condition"}
        ))
        
        # Complete loop
        steps.append(WorkflowStep(
            name="complete_loop",
            action="log",
            inputs={"message": "Loop completed"},
            conditions={"success": None}
        ))
        
        # Create workflow definition
        definition = WorkflowDefinition(
            name=workflow_name,
            description=f"State-driven loop workflow with max {max_iterations} iterations",
            steps=steps,
            initial_step="init_loop",
            context_requirements=["iteration_count"]
        )
        
        # Register and start workflow
        self.workflow_engine.register_workflow(definition)
        return await self.workflow_engine.start_workflow(
            definition.workflow_id,
            initial_context={"iteration_count": 0, "max_iterations": max_iterations}
        )
    
    async def migrate_existing_workflow(
        self,
        workflow_type: str,
        workflow_config: Dict[str, Any]
    ) -> str:
        """
        Migrate an existing workflow to state-driven system.
        
        Args:
            workflow_type: Type of workflow (sequential, parallel, loop)
            workflow_config: Original workflow configuration
            
        Returns:
            New workflow execution ID
        """
        if workflow_type == "sequential":
            return await self.create_state_driven_sequential(
                workflow_config.get("task_chain", []),
                workflow_config.get("name", "MigratedSequential")
            )
        elif workflow_type == "parallel":
            return await self.create_state_driven_parallel(
                workflow_config.get("tasks", []),
                workflow_config.get("name", "MigratedParallel"),
                workflow_config.get("aggregation", "MERGE")
            )
        elif workflow_type == "loop":
            return await self.create_state_driven_loop(
                workflow_config,
                workflow_config.get("name", "MigratedLoop")
            )
        else:
            raise ValueError(f"Unknown workflow type: {workflow_type}")


class EnhancedWorkflowManager:
    """
    Enhanced workflow manager that provides both legacy and state-driven interfaces.
    
    This manager allows gradual migration from legacy to state-driven workflows
    while maintaining backward compatibility.
    """
    
    def __init__(self, redis_client=None):
        self.workflow_engine = WorkflowEngine(redis_client=redis_client)
        self.adapter = WorkflowAdapter(self.workflow_engine)
        
        # Legacy managers for backward compatibility
        self.sequential = SequentialWorkflowManagerV2()
        self.parallel = ParallelWorkflowManagerV2()
        self.loop = LoopWorkflowManagerV2()
        
        # Feature flags
        self.use_state_driven = True
        self.auto_migrate = False
    
    async def create_workflow(
        self,
        workflow_type: str,
        config: Dict[str, Any],
        use_state_driven: Optional[bool] = None
    ) -> Union[str, Any]:
        """
        Create a workflow with optional state-driven enhancement.
        
        Args:
            workflow_type: Type of workflow
            config: Workflow configuration
            use_state_driven: Override for state-driven feature flag
            
        Returns:
            Workflow ID (state-driven) or workflow object (legacy)
        """
        use_state = use_state_driven if use_state_driven is not None else self.use_state_driven
        
        if use_state:
            # Use state-driven system
            return await self.adapter.migrate_existing_workflow(workflow_type, config)
        else:
            # Use legacy system
            if workflow_type == "sequential":
                return self.sequential.create_sequential_workflow(
                    config.get("task_chain", []),
                    config.get("name", "Sequential")
                )
            elif workflow_type == "parallel":
                return self.parallel.create_parallel_workflow(
                    config.get("tasks", []),
                    config.get("aggregation", "MERGE")
                )
            elif workflow_type == "loop":
                return self.loop.create_loop_workflow(
                    config.get("condition", {}),
                    config.get("tasks", []),
                    config.get("max_iterations", 10)
                )
            else:
                raise ValueError(f"Unknown workflow type: {workflow_type}")
    
    async def execute_workflow(
        self,
        workflow_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a workflow by ID (state-driven) or object (legacy).
        
        Args:
            workflow_id: Workflow ID or object
            context: Execution context
            
        Returns:
            Execution results
        """
        if isinstance(workflow_id, str) and workflow_id in self.workflow_engine.definitions:
            # State-driven workflow
            execution_id = await self.workflow_engine.start_workflow(workflow_id, context)
            
            # Wait for completion (with timeout)
            timeout = 300  # 5 minutes
            start_time = asyncio.get_event_loop().time()
            
            while True:
                status = await self.workflow_engine.get_workflow_status(execution_id)
                if status and status.get("is_complete"):
                    return status
                if status and status.get("is_failed"):
                    raise Exception(f"Workflow failed: {status}")
                
                if asyncio.get_event_loop().time() - start_time > timeout:
                    raise TimeoutError("Workflow execution timeout")
                
                await asyncio.sleep(1)
        else:
            # Legacy workflow execution
            # This would use the original execution method
            raise NotImplementedError("Legacy workflow execution not implemented in adapter")
    
    async def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a state-driven workflow"""
        return await self.workflow_engine.get_workflow_status(workflow_id)
    
    async def pause_workflow(self, workflow_id: str) -> bool:
        """Pause a state-driven workflow"""
        return await self.workflow_engine.pause_workflow(workflow_id)
    
    async def resume_workflow(self, workflow_id: str) -> bool:
        """Resume a state-driven workflow"""
        return await self.workflow_engine.resume_workflow(workflow_id)
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel a state-driven workflow"""
        return await self.workflow_engine.cancel_workflow(workflow_id)
    
    def enable_state_driven(self, auto_migrate: bool = False):
        """Enable state-driven workflows"""
        self.use_state_driven = True
        self.auto_migrate = auto_migrate
    
    def disable_state_driven(self):
        """Disable state-driven workflows (use legacy)"""
        self.use_state_driven = False
        self.auto_migrate = False