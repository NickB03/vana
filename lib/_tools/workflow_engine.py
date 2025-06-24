"""
Multi-Agent Workflow Management Engine

This module provides persistent workflow management capabilities for orchestrating
complex tasks across multiple agents with state tracking and resumption.
"""

import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from .task_orchestrator import OrchestrationStrategy, TaskStatus, get_task_orchestrator

logger = logging.getLogger(__name__)


class WorkflowState(Enum):
    """Workflow execution states."""

    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    WAITING = "waiting"


class WorkflowPriority(Enum):
    """Workflow priority levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class WorkflowStep:
    """Individual step in a workflow."""

    step_id: str
    name: str
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
    timeout_seconds: int = 300


@dataclass
class WorkflowDefinition:
    """Complete workflow definition."""

    workflow_id: str
    name: str
    description: str
    template_name: Optional[str] = None
    steps: List[WorkflowStep] = field(default_factory=list)
    strategy: OrchestrationStrategy = OrchestrationStrategy.ADAPTIVE
    priority: WorkflowPriority = WorkflowPriority.MEDIUM
    max_parallel_steps: int = 3
    timeout_seconds: int = 1800  # 30 minutes default
    created_at: float = field(default_factory=time.time)
    created_by: str = "system"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowExecution:
    """Workflow execution state and progress."""

    workflow_id: str
    state: WorkflowState = WorkflowState.CREATED
    current_step: Optional[str] = None
    completed_steps: List[str] = field(default_factory=list)
    failed_steps: List[str] = field(default_factory=list)
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    pause_time: Optional[float] = None
    resume_time: Optional[float] = None
    total_execution_time: float = 0.0
    results: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    progress_percentage: float = 0.0
    last_updated: float = field(default_factory=time.time)


@dataclass
class WorkflowResult:
    """Final workflow execution result."""

    workflow_id: str
    success: bool
    state: WorkflowState
    completed_steps: int
    failed_steps: int
    total_steps: int
    execution_time: float
    results: Dict[str, Any]
    errors: List[str]
    performance_metrics: Dict[str, Any]


class WorkflowEngine:
    """Manages persistent multi-agent workflows with state tracking."""

    def __init__(self, storage_dir: Optional[str] = None):
        """Initialize the workflow engine."""
        self.task_orchestrator = get_task_orchestrator()

        # Set up storage directory
        if storage_dir:
            self.storage_dir = Path(storage_dir)
        else:
            # Default to project root/.workflows
            project_root = Path(__file__).parent.parent.parent
            self.storage_dir = project_root / ".workflows"

        self.storage_dir.mkdir(exist_ok=True)
        self.definitions_dir = self.storage_dir / "definitions"
        self.executions_dir = self.storage_dir / "executions"
        self.definitions_dir.mkdir(exist_ok=True)
        self.executions_dir.mkdir(exist_ok=True)

        # In-memory caches
        self.active_workflows: Dict[str, WorkflowExecution] = {}
        self.workflow_definitions: Dict[str, WorkflowDefinition] = {}

        # Load existing workflows
        self._load_existing_workflows()

        logger.info(f"WorkflowEngine initialized with storage: {self.storage_dir}")

    def _load_existing_workflows(self):
        """Load existing workflow definitions and executions from storage."""
        try:
            # Load workflow definitions
            for def_file in self.definitions_dir.glob("*.json"):
                try:
                    with open(def_file, "r") as f:
                        data = json.load(f)

                    # Convert to WorkflowDefinition
                    workflow_def = self._dict_to_workflow_definition(data)
                    self.workflow_definitions[workflow_def.workflow_id] = workflow_def

                except Exception as e:
                    logger.warning(
                        f"Failed to load workflow definition {def_file}: {e}"
                    )

            # Load active workflow executions
            for exec_file in self.executions_dir.glob("*.json"):
                try:
                    with open(exec_file, "r") as f:
                        data = json.load(f)

                    # Convert to WorkflowExecution
                    workflow_exec = self._dict_to_workflow_execution(data)

                    # Only load if not completed/failed/cancelled
                    if workflow_exec.state in [
                        WorkflowState.RUNNING,
                        WorkflowState.PAUSED,
                        WorkflowState.WAITING,
                    ]:
                        self.active_workflows[workflow_exec.workflow_id] = workflow_exec

                except Exception as e:
                    logger.warning(
                        f"Failed to load workflow execution {exec_file}: {e}"
                    )

            logger.info(
                f"Loaded {len(self.workflow_definitions)} definitions, {len(self.active_workflows)} active workflows"
            )

        except Exception as e:
            logger.error(f"Error loading existing workflows: {e}")

    def _dict_to_workflow_definition(self, data: Dict[str, Any]) -> WorkflowDefinition:
        """Convert dictionary to WorkflowDefinition."""
        # Convert steps
        steps = []
        for step_data in data.get("steps", []):
            step = WorkflowStep(
                step_id=step_data["step_id"],
                name=step_data["name"],
                description=step_data["description"],
                agent_name=step_data["agent_name"],
                dependencies=step_data.get("dependencies", []),
                status=TaskStatus(step_data.get("status", "pending")),
                result=step_data.get("result"),
                error=step_data.get("error"),
                start_time=step_data.get("start_time"),
                end_time=step_data.get("end_time"),
                retry_count=step_data.get("retry_count", 0),
                max_retries=step_data.get("max_retries", 3),
                timeout_seconds=step_data.get("timeout_seconds", 300),
            )
            steps.append(step)

        return WorkflowDefinition(
            workflow_id=data["workflow_id"],
            name=data["name"],
            description=data["description"],
            template_name=data.get("template_name"),
            steps=steps,
            strategy=OrchestrationStrategy(data.get("strategy", "adaptive")),
            priority=WorkflowPriority(data.get("priority", "medium")),
            max_parallel_steps=data.get("max_parallel_steps", 3),
            timeout_seconds=data.get("timeout_seconds", 1800),
            created_at=data.get("created_at", time.time()),
            created_by=data.get("created_by", "system"),
            metadata=data.get("metadata", {}),
        )

    def _dict_to_workflow_execution(self, data: Dict[str, Any]) -> WorkflowExecution:
        """Convert dictionary to WorkflowExecution."""
        return WorkflowExecution(
            workflow_id=data["workflow_id"],
            state=WorkflowState(data.get("state", "created")),
            current_step=data.get("current_step"),
            completed_steps=data.get("completed_steps", []),
            failed_steps=data.get("failed_steps", []),
            start_time=data.get("start_time"),
            end_time=data.get("end_time"),
            pause_time=data.get("pause_time"),
            resume_time=data.get("resume_time"),
            total_execution_time=data.get("total_execution_time", 0.0),
            results=data.get("results", {}),
            errors=data.get("errors", []),
            progress_percentage=data.get("progress_percentage", 0.0),
            last_updated=data.get("last_updated", time.time()),
        )

    def _save_workflow_definition(self, workflow_def: WorkflowDefinition):
        """Save workflow definition to storage."""
        try:
            def_file = self.definitions_dir / f"{workflow_def.workflow_id}.json"
            with open(def_file, "w") as f:
                json.dump(asdict(workflow_def), f, indent=2, default=str)
        except Exception as e:
            logger.error(
                f"Failed to save workflow definition {workflow_def.workflow_id}: {e}"
            )

    def _save_workflow_execution(self, workflow_exec: WorkflowExecution):
        """Save workflow execution to storage."""
        try:
            exec_file = self.executions_dir / f"{workflow_exec.workflow_id}.json"
            with open(exec_file, "w") as f:
                json.dump(asdict(workflow_exec), f, indent=2, default=str)
        except Exception as e:
            logger.error(
                f"Failed to save workflow execution {workflow_exec.workflow_id}: {e}"
            )

    def create_workflow(
        self,
        name: str,
        description: str,
        steps: List[Dict[str, Any]],
        template_name: Optional[str] = None,
        strategy: str = "adaptive",
        priority: str = "medium",
        max_parallel_steps: int = 3,
        timeout_seconds: int = 1800,
        created_by: str = "system",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Create a new workflow definition."""
        try:
            workflow_id = str(uuid.uuid4())

            # Convert step dictionaries to WorkflowStep objects
            workflow_steps = []
            for i, step_data in enumerate(steps):
                step = WorkflowStep(
                    step_id=step_data.get(
                        "step_id", f"step_{i + 1}_{int(time.time())}"
                    ),
                    name=step_data["name"],
                    description=step_data["description"],
                    agent_name=step_data["agent_name"],
                    dependencies=step_data.get("dependencies", []),
                    max_retries=step_data.get("max_retries", 3),
                    timeout_seconds=step_data.get("timeout_seconds", 300),
                )
                workflow_steps.append(step)

            # Create workflow definition
            workflow_def = WorkflowDefinition(
                workflow_id=workflow_id,
                name=name,
                description=description,
                template_name=template_name,
                steps=workflow_steps,
                strategy=OrchestrationStrategy(strategy),
                priority=WorkflowPriority(priority),
                max_parallel_steps=max_parallel_steps,
                timeout_seconds=timeout_seconds,
                created_by=created_by,
                metadata=metadata or {},
            )

            # Store workflow definition
            self.workflow_definitions[workflow_id] = workflow_def
            self._save_workflow_definition(workflow_def)

            logger.info(
                f"Created workflow: {workflow_id} ({name}) with {len(workflow_steps)} steps"
            )
            return workflow_id

        except Exception as e:
            logger.error(f"Failed to create workflow: {e}")
            raise

    async def start_workflow(self, workflow_id: str) -> WorkflowResult:
        """Start workflow execution."""
        try:
            if workflow_id not in self.workflow_definitions:
                raise ValueError(f"Workflow {workflow_id} not found")

            workflow_def = self.workflow_definitions[workflow_id]

            # Create execution state
            workflow_exec = WorkflowExecution(
                workflow_id=workflow_id,
                state=WorkflowState.RUNNING,
                start_time=time.time(),
            )

            self.active_workflows[workflow_id] = workflow_exec
            self._save_workflow_execution(workflow_exec)

            logger.info(f"Starting workflow: {workflow_id} ({workflow_def.name})")

            # Execute workflow using task orchestrator
            result = await self._execute_workflow(workflow_def, workflow_exec)

            # Update final state
            workflow_exec.state = (
                WorkflowState.COMPLETED if result.success else WorkflowState.FAILED
            )
            workflow_exec.end_time = time.time()
            workflow_exec.total_execution_time = workflow_exec.end_time - (
                workflow_exec.start_time or 0.0
            )
            workflow_exec.progress_percentage = 100.0
            workflow_exec.last_updated = time.time()

            self._save_workflow_execution(workflow_exec)

            # Remove from active workflows if completed
            if workflow_exec.state in [
                WorkflowState.COMPLETED,
                WorkflowState.FAILED,
                WorkflowState.CANCELLED,
            ]:
                self.active_workflows.pop(workflow_id, None)

            return result

        except Exception as e:
            logger.error(f"Failed to start workflow {workflow_id}: {e}")
            # Update workflow state to failed
            if workflow_id in self.active_workflows:
                self.active_workflows[workflow_id].state = WorkflowState.FAILED
                self.active_workflows[workflow_id].errors.append(str(e))
                self._save_workflow_execution(self.active_workflows[workflow_id])
            raise

    async def _execute_workflow(
        self, workflow_def: WorkflowDefinition, workflow_exec: WorkflowExecution
    ) -> WorkflowResult:
        """Execute workflow using the task orchestrator."""
        try:
            # Convert workflow steps to orchestration format
            task_description = (
                f"Execute workflow: {workflow_def.name} - {workflow_def.description}"
            )

            # Use task orchestrator for execution
            orchestration_result = await self.task_orchestrator.orchestrate_task(
                task=task_description,
                context=f"Workflow ID: {workflow_def.workflow_id}",
                strategy=workflow_def.strategy,
                max_parallel_tasks=workflow_def.max_parallel_steps,
                timeout_seconds=workflow_def.timeout_seconds,
            )

            # Update workflow execution with results
            workflow_exec.results = orchestration_result.results
            workflow_exec.errors = orchestration_result.errors
            workflow_exec.completed_steps = [
                step.step_id
                for step in workflow_def.steps
                if step.status == TaskStatus.COMPLETED
            ]
            workflow_exec.failed_steps = [
                step.step_id
                for step in workflow_def.steps
                if step.status == TaskStatus.FAILED
            ]

            # Calculate progress
            total_steps = len(workflow_def.steps)
            completed_steps = len(workflow_exec.completed_steps)
            workflow_exec.progress_percentage = (
                (completed_steps / total_steps) * 100.0 if total_steps > 0 else 100.0
            )

            # Create workflow result
            result = WorkflowResult(
                workflow_id=workflow_def.workflow_id,
                success=orchestration_result.success,
                state=WorkflowState.COMPLETED
                if orchestration_result.success
                else WorkflowState.FAILED,
                completed_steps=completed_steps,
                failed_steps=len(workflow_exec.failed_steps),
                total_steps=total_steps,
                execution_time=orchestration_result.total_execution_time,
                results=orchestration_result.results,
                errors=orchestration_result.errors,
                performance_metrics=orchestration_result.performance_metrics,
            )

            return result

        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            return WorkflowResult(
                workflow_id=workflow_def.workflow_id,
                success=False,
                state=WorkflowState.FAILED,
                completed_steps=0,
                failed_steps=len(workflow_def.steps),
                total_steps=len(workflow_def.steps),
                execution_time=0.0,
                results={},
                errors=[str(e)],
                performance_metrics={"error": True},
            )

    def pause_workflow(self, workflow_id: str) -> bool:
        """Pause a running workflow."""
        try:
            if workflow_id not in self.active_workflows:
                return False

            workflow_exec = self.active_workflows[workflow_id]
            if workflow_exec.state != WorkflowState.RUNNING:
                return False

            workflow_exec.state = WorkflowState.PAUSED
            workflow_exec.pause_time = time.time()
            workflow_exec.last_updated = time.time()

            self._save_workflow_execution(workflow_exec)

            logger.info(f"Paused workflow: {workflow_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to pause workflow {workflow_id}: {e}")
            return False

    def resume_workflow(self, workflow_id: str) -> bool:
        """Resume a paused workflow."""
        try:
            if workflow_id not in self.active_workflows:
                return False

            workflow_exec = self.active_workflows[workflow_id]
            if workflow_exec.state != WorkflowState.PAUSED:
                return False

            workflow_exec.state = WorkflowState.RUNNING
            workflow_exec.resume_time = time.time()
            workflow_exec.last_updated = time.time()

            self._save_workflow_execution(workflow_exec)

            logger.info(f"Resumed workflow: {workflow_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to resume workflow {workflow_id}: {e}")
            return False

    def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel a workflow."""
        try:
            if workflow_id not in self.active_workflows:
                return False

            workflow_exec = self.active_workflows[workflow_id]
            workflow_exec.state = WorkflowState.CANCELLED
            workflow_exec.end_time = time.time()
            workflow_exec.total_execution_time = workflow_exec.end_time - (
                workflow_exec.start_time or 0.0
            )
            workflow_exec.last_updated = time.time()

            self._save_workflow_execution(workflow_exec)

            # Remove from active workflows
            self.active_workflows.pop(workflow_id, None)

            logger.info(f"Cancelled workflow: {workflow_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to cancel workflow {workflow_id}: {e}")
            return False

    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow status and progress."""
        try:
            # Check active workflows first
            if workflow_id in self.active_workflows:
                workflow_exec = self.active_workflows[workflow_id]
                workflow_def = self.workflow_definitions.get(workflow_id)

                return {
                    "workflow_id": workflow_id,
                    "name": workflow_def.name if workflow_def else "Unknown",
                    "description": workflow_def.description if workflow_def else "",
                    "state": workflow_exec.state.value,
                    "progress_percentage": workflow_exec.progress_percentage,
                    "current_step": workflow_exec.current_step,
                    "completed_steps": len(workflow_exec.completed_steps),
                    "failed_steps": len(workflow_exec.failed_steps),
                    "total_steps": len(workflow_def.steps) if workflow_def else 0,
                    "start_time": workflow_exec.start_time,
                    "execution_time": (
                        time.time() - (workflow_exec.start_time or 0.0)
                        if workflow_exec.start_time
                        else 0.0
                    ),
                    "errors": workflow_exec.errors,
                    "last_updated": workflow_exec.last_updated,
                }

            # Check completed workflows in storage
            exec_file = self.executions_dir / f"{workflow_id}.json"
            if exec_file.exists():
                with open(exec_file, "r") as f:
                    data = json.load(f)

                workflow_def = self.workflow_definitions.get(workflow_id)

                return {
                    "workflow_id": workflow_id,
                    "name": workflow_def.name if workflow_def else "Unknown",
                    "description": workflow_def.description if workflow_def else "",
                    "state": data.get("state", "unknown"),
                    "progress_percentage": data.get("progress_percentage", 0.0),
                    "completed_steps": len(data.get("completed_steps", [])),
                    "failed_steps": len(data.get("failed_steps", [])),
                    "total_steps": len(workflow_def.steps) if workflow_def else 0,
                    "start_time": data.get("start_time"),
                    "end_time": data.get("end_time"),
                    "execution_time": data.get("total_execution_time", 0.0),
                    "errors": data.get("errors", []),
                    "last_updated": data.get("last_updated"),
                }

            return None

        except Exception as e:
            logger.error(f"Failed to get workflow status {workflow_id}: {e}")
            return None

    def list_workflows(
        self, state_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List all workflows with optional state filtering."""
        try:
            workflows = []

            # Add active workflows
            for workflow_id, workflow_exec in self.active_workflows.items():
                if state_filter and workflow_exec.state.value != state_filter:
                    continue

                status = self.get_workflow_status(workflow_id)
                if status:
                    workflows.append(status)

            # Add completed workflows from storage
            for exec_file in self.executions_dir.glob("*.json"):
                workflow_id = exec_file.stem

                if workflow_id in self.active_workflows:
                    continue  # Already added above

                try:
                    with open(exec_file, "r") as f:
                        data = json.load(f)

                    if state_filter and data.get("state") != state_filter:
                        continue

                    status = self.get_workflow_status(workflow_id)
                    if status:
                        workflows.append(status)

                except Exception as e:
                    logger.warning(f"Failed to load workflow {exec_file}: {e}")

            # Sort by last_updated (most recent first)
            workflows.sort(key=lambda x: x.get("last_updated", 0), reverse=True)

            return workflows

        except Exception as e:
            logger.error(f"Failed to list workflows: {e}")
            return []

    def get_workflow_definition(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Get workflow definition."""
        return self.workflow_definitions.get(workflow_id)

    def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow definition and execution."""
        try:
            # Cancel if running
            if workflow_id in self.active_workflows:
                self.cancel_workflow(workflow_id)

            # Remove from memory
            self.workflow_definitions.pop(workflow_id, None)
            self.active_workflows.pop(workflow_id, None)

            # Remove files
            def_file = self.definitions_dir / f"{workflow_id}.json"
            exec_file = self.executions_dir / f"{workflow_id}.json"

            if def_file.exists():
                def_file.unlink()
            if exec_file.exists():
                exec_file.unlink()

            logger.info(f"Deleted workflow: {workflow_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete workflow {workflow_id}: {e}")
            return False


# Global workflow engine instance
_workflow_engine = None


def get_workflow_engine() -> WorkflowEngine:
    """Get the global workflow engine instance."""
    global _workflow_engine
    if _workflow_engine is None:
        _workflow_engine = WorkflowEngine()
    return _workflow_engine
