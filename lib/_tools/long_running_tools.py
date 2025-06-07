"""
Long Running Function Tools for VANA Multi-Agent System

This module implements Google ADK Long Running Function Tools pattern,
enabling asynchronous operations, approval workflows, and long-running tasks
with status tracking and event handling.

Based on Google ADK documentation:
- LongRunningFunctionTool for async operations
- Status tracking and updates
- Event handling for long-running responses
- Integration with existing tool framework
"""

import asyncio
import time
import uuid
import logging
from typing import Dict, Any, Optional, Callable, AsyncGenerator, Union
from dataclasses import dataclass, field
from enum import Enum
import json

try:
    from lib._shared_libraries.tool_standards import (
        StandardToolResponse,
        ToolErrorType,
        ErrorHandler,
        performance_monitor,
        InputValidator,
    )
except ImportError:
    # Fallback for development
    class StandardToolResponse:
        @staticmethod
        def success(data):
            return {"status": "success", "data": data}

    class ToolErrorType:
        VALIDATION_ERROR = "validation_error"

    class ErrorHandler:
        @staticmethod
        def handle_error(error_type, message):
            return {"error": message}

    class performance_monitor:
        @staticmethod
        def start_execution(name):
            return time.time()

        @staticmethod
        def end_execution(name, start_time, success=True):
            return time.time() - start_time

    class InputValidator:
        @staticmethod
        def validate_string(value, name, required=True, max_length=None):
            return value

# Configure logging
logger = logging.getLogger(__name__)

class LongRunningTaskStatus(Enum):
    """Status types for long-running tasks."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_APPROVAL = "waiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class LongRunningTaskResult:
    """Result container for long-running tasks."""
    task_id: str
    status: LongRunningTaskStatus
    result: Any = None
    error: Optional[str] = None
    progress: float = 0.0  # 0.0 to 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def update_status(self, status: LongRunningTaskStatus,
                     result: Any = None, error: str = None,
                     progress: float = None, metadata: Dict[str, Any] = None):
        """Update task status and metadata."""
        self.status = status
        self.updated_at = time.time()

        if result is not None:
            self.result = result
        if error is not None:
            self.error = error
        if progress is not None:
            self.progress = progress
        if metadata is not None:
            self.metadata.update(metadata)

class LongRunningTaskManager:
    """Manager for tracking long-running tasks."""

    def __init__(self):
        self.tasks: Dict[str, LongRunningTaskResult] = {}
        self.task_callbacks: Dict[str, Callable] = {}

    def create_task(self, task_id: str = None) -> str:
        """Create a new long-running task."""
        if task_id is None:
            task_id = str(uuid.uuid4())

        self.tasks[task_id] = LongRunningTaskResult(
            task_id=task_id,
            status=LongRunningTaskStatus.PENDING
        )

        logger.info(f"Created long-running task: {task_id}")
        return task_id

    def update_task(self, task_id: str, status: LongRunningTaskStatus,
                   result: Any = None, error: str = None,
                   progress: float = None, metadata: Dict[str, Any] = None) -> bool:
        """Update task status."""
        if task_id not in self.tasks:
            logger.error(f"Task not found: {task_id}")
            return False

        self.tasks[task_id].update_status(status, result, error, progress, metadata)
        logger.info(f"Updated task {task_id}: {status.value}")

        # Execute callback if registered
        if task_id in self.task_callbacks:
            try:
                self.task_callbacks[task_id](self.tasks[task_id])
            except Exception as e:
                logger.error(f"Error in task callback for {task_id}: {e}")

        return True

    def get_task(self, task_id: str) -> Optional[LongRunningTaskResult]:
        """Get task by ID."""
        return self.tasks.get(task_id)

    def register_callback(self, task_id: str, callback: Callable):
        """Register callback for task updates."""
        self.task_callbacks[task_id] = callback

    def cleanup_completed_tasks(self, max_age_hours: int = 24):
        """Clean up old completed tasks."""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600

        to_remove = []
        for task_id, task in self.tasks.items():
            if (task.status in [LongRunningTaskStatus.COMPLETED,
                               LongRunningTaskStatus.FAILED,
                               LongRunningTaskStatus.CANCELLED] and
                current_time - task.updated_at > max_age_seconds):
                to_remove.append(task_id)

        for task_id in to_remove:
            del self.tasks[task_id]
            if task_id in self.task_callbacks:
                del self.task_callbacks[task_id]

        if to_remove:
            logger.info(f"Cleaned up {len(to_remove)} old tasks")

# Global task manager
task_manager = LongRunningTaskManager()

class LongRunningFunctionTool:
    """
    Google ADK Long Running Function Tool implementation.

    Wraps functions that perform long-running operations with status tracking,
    progress updates, and event handling capabilities.
    """

    def __init__(self, func: Callable, name: str = None,
                 description: str = None, timeout: float = 300.0):
        """
        Initialize Long Running Function Tool.

        Args:
            func: The function to wrap (should be async or return a task ID)
            name: Tool name (defaults to function name)
            description: Tool description
            timeout: Maximum execution time in seconds
        """
        self.func = func
        self.name = name or func.__name__
        self.description = description or func.__doc__ or f"Long running tool: {self.name}"
        self.timeout = timeout

        logger.info(f"Created LongRunningFunctionTool: {self.name}")

    async def run_async(self, args: Dict[str, Any],
                       tool_context: Any = None) -> Dict[str, Any]:
        """
        Execute the long-running function asynchronously.

        Args:
            args: Function arguments
            tool_context: Tool execution context

        Returns:
            Dictionary with task information
        """
        start_time = performance_monitor.start_execution(self.name)
        task_id = task_manager.create_task()

        try:
            logger.info(f"Starting long-running task {task_id} for {self.name}")

            # Update task to in-progress
            task_manager.update_task(task_id, LongRunningTaskStatus.IN_PROGRESS)

            # Execute the function
            if asyncio.iscoroutinefunction(self.func):
                # Async function
                result = await asyncio.wait_for(
                    self.func(task_id=task_id, **args),
                    timeout=self.timeout
                )
            else:
                # Sync function - run in executor
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None, lambda: self.func(task_id=task_id, **args)
                )

            # Update task as completed
            task_manager.update_task(
                task_id, LongRunningTaskStatus.COMPLETED, result=result
            )

            execution_time = performance_monitor.end_execution(
                self.name, start_time, success=True
            )

            return {
                "task_id": task_id,
                "status": LongRunningTaskStatus.COMPLETED.value,
                "result": result,
                "execution_time": execution_time
            }

        except asyncio.TimeoutError:
            task_manager.update_task(
                task_id, LongRunningTaskStatus.FAILED,
                error="Task timed out"
            )
            execution_time = performance_monitor.end_execution(
                self.name, start_time, success=False
            )

            return {
                "task_id": task_id,
                "status": LongRunningTaskStatus.FAILED.value,
                "error": "Task timed out",
                "execution_time": execution_time
            }

        except Exception as e:
            task_manager.update_task(
                task_id, LongRunningTaskStatus.FAILED,
                error=str(e)
            )
            execution_time = performance_monitor.end_execution(
                self.name, start_time, success=False
            )

            logger.error(f"Long-running task {task_id} failed: {e}")

            return {
                "task_id": task_id,
                "status": LongRunningTaskStatus.FAILED.value,
                "error": str(e),
                "execution_time": execution_time
            }

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get status of a long-running task."""
        task = task_manager.get_task(task_id)
        if not task:
            return {
                "error": f"Task {task_id} not found",
                "status": "not_found"
            }

        return {
            "task_id": task.task_id,
            "status": task.status.value,
            "result": task.result,
            "error": task.error,
            "progress": task.progress,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "metadata": task.metadata
        }

# Factory function for creating long-running tools
def create_long_running_tool(func: Callable, **kwargs) -> LongRunningFunctionTool:
    """
    Factory function to create a LongRunningFunctionTool.

    Args:
        func: The function to wrap
        **kwargs: Additional parameters for LongRunningFunctionTool

    Returns:
        LongRunningFunctionTool instance
    """
    return LongRunningFunctionTool(func=func, **kwargs)

# Example Long-Running Tool Implementations

async def ask_for_approval(task_id: str, purpose: str, amount: float,
                          approver: str = "System Administrator") -> Dict[str, Any]:
    """
    Example long-running tool for approval workflows.

    This simulates creating a ticket and waiting for approval.
    In a real implementation, this would integrate with approval systems.

    Args:
        task_id: Task identifier for tracking
        purpose: Purpose of the approval request
        amount: Amount requiring approval
        approver: Person who needs to approve

    Returns:
        Approval result with ticket information
    """
    logger.info(f"Creating approval request for {purpose}: ${amount}")

    # Ensure task exists in manager
    if task_id not in task_manager.tasks:
        task_manager.create_task(task_id)

    # Simulate ticket creation
    ticket_id = f"approval-{task_id[:8]}"

    # Update task with ticket information
    task_manager.update_task(
        task_id, LongRunningTaskStatus.WAITING_APPROVAL,
        progress=0.5,
        metadata={
            "ticket_id": ticket_id,
            "approver": approver,
            "purpose": purpose,
            "amount": amount
        }
    )

    # Simulate approval process (in real implementation, this would be external)
    await asyncio.sleep(2)  # Simulate processing time

    # For demo purposes, auto-approve small amounts
    if amount < 1000:
        status = LongRunningTaskStatus.APPROVED
        result = {
            "status": "approved",
            "ticket_id": ticket_id,
            "approver": approver,
            "approved_amount": amount,
            "approval_time": time.time()
        }
    else:
        # Larger amounts need manual approval (would be handled externally)
        status = LongRunningTaskStatus.WAITING_APPROVAL
        result = {
            "status": "pending",
            "ticket_id": ticket_id,
            "approver": approver,
            "message": f"Approval required from {approver} for ${amount}"
        }

    task_manager.update_task(task_id, status, result=result, progress=1.0)
    return result

async def process_large_dataset(task_id: str, dataset_name: str,
                               operation: str = "analyze") -> Dict[str, Any]:
    """
    Example long-running tool for data processing.

    Simulates processing a large dataset with progress updates.

    Args:
        task_id: Task identifier for tracking
        dataset_name: Name of dataset to process
        operation: Type of operation to perform

    Returns:
        Processing results
    """
    logger.info(f"Starting {operation} on dataset: {dataset_name}")

    # Ensure task exists in manager
    if task_id not in task_manager.tasks:
        task_manager.create_task(task_id)

    # Simulate processing stages
    stages = [
        ("Loading dataset", 0.2),
        ("Preprocessing data", 0.4),
        ("Running analysis", 0.7),
        ("Generating results", 0.9),
        ("Finalizing output", 1.0)
    ]

    results = {"dataset": dataset_name, "operation": operation, "stages": []}

    for stage_name, progress in stages:
        logger.info(f"Task {task_id}: {stage_name}")

        # Update progress
        task_manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS,
            progress=progress,
            metadata={"current_stage": stage_name}
        )

        # Simulate processing time
        await asyncio.sleep(1)

        results["stages"].append({
            "stage": stage_name,
            "completed_at": time.time(),
            "progress": progress
        })

    # Final results
    final_result = {
        **results,
        "status": "completed",
        "total_records": 10000,  # Simulated
        "processing_time": time.time() - task_manager.get_task(task_id).created_at,
        "summary": f"Successfully completed {operation} on {dataset_name}"
    }

    return final_result

def generate_report(task_id: str, report_type: str,
                   data_sources: list = None) -> Dict[str, Any]:
    """
    Example synchronous long-running tool for report generation.

    Args:
        task_id: Task identifier for tracking
        report_type: Type of report to generate
        data_sources: List of data sources to include

    Returns:
        Report generation results
    """
    if data_sources is None:
        data_sources = ["default_source"]

    logger.info(f"Generating {report_type} report from {len(data_sources)} sources")

    # Ensure task exists in manager
    if task_id not in task_manager.tasks:
        task_manager.create_task(task_id)

    # Simulate report generation stages
    import time as sync_time

    # Stage 1: Data collection
    task_manager.update_task(
        task_id, LongRunningTaskStatus.IN_PROGRESS,
        progress=0.3,
        metadata={"stage": "Collecting data"}
    )
    sync_time.sleep(1)

    # Stage 2: Analysis
    task_manager.update_task(
        task_id, LongRunningTaskStatus.IN_PROGRESS,
        progress=0.6,
        metadata={"stage": "Analyzing data"}
    )
    sync_time.sleep(2)

    # Stage 3: Report formatting
    task_manager.update_task(
        task_id, LongRunningTaskStatus.IN_PROGRESS,
        progress=0.9,
        metadata={"stage": "Formatting report"}
    )
    sync_time.sleep(1)

    # Complete
    result = {
        "report_type": report_type,
        "data_sources": data_sources,
        "generated_at": sync_time.time(),
        "pages": 25,  # Simulated
        "file_path": f"/reports/{report_type}_{task_id[:8]}.pdf",
        "status": "completed"
    }

    return result
