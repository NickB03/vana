"""
ADK Long Running Function Tools Integration

This module provides Google ADK-compatible wrappers for long-running function tools,
integrating with the existing VANA tool framework and ADK FunctionTool system.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional

# ADK imports with fallback
try:
    from google.adk.tools import FunctionTool
except ImportError:
    # Fallback for development/testing
    class FunctionTool:
        def __init__(self, func):
            self.func = func
            self.name = func.__name__

from .long_running_tools import (
    LongRunningFunctionTool, create_long_running_tool, task_manager,
    ask_for_approval, process_large_dataset, generate_report,
    LongRunningTaskStatus
)
try:
    from lib._shared_libraries.tool_standards import (
        StandardToolResponse, InputValidator, performance_monitor
    )
except ImportError:
    # Fallback for development
    class StandardToolResponse:
        @staticmethod
        def success(data):
            return {"status": "success", "data": data}

    class InputValidator:
        @staticmethod
        def validate_string(value, name, required=True, max_length=None):
            return value

    def performance_monitor(func):
        return func

# Configure logging
logger = logging.getLogger(__name__)

# Standardized Long-Running Tool Wrappers

def _ask_for_approval(purpose: str, amount: float, approver: str = "System Administrator") -> str:
    """
    🎫 Request approval for an action requiring authorization.

    This is a long-running tool that creates an approval ticket and tracks its status.
    Use this when actions require management approval or authorization.

    Args:
        purpose: Description of what needs approval
        amount: Dollar amount requiring approval (if applicable)
        approver: Person or role who should approve the request

    Returns:
        JSON string with task information and approval status
    """
    try:
        # Validate inputs
        purpose = InputValidator.validate_string(purpose, "purpose", required=True, max_length=500)
        amount = InputValidator.validate_integer(amount, "amount", required=True, min_value=0, max_value=1000000)
        approver = InputValidator.validate_string(approver, "approver", required=False, max_length=100)

        # Create long-running tool and execute
        approval_tool = create_long_running_tool(ask_for_approval, name="approval_request")

        # Since we can't use async in ADK function tools directly, we'll simulate
        # the long-running behavior by creating a task and returning task info
        import uuid
        task_id = task_manager.create_task()

        # For demo purposes, immediately process small amounts
        if amount < 1000:
            result = {
                "task_id": task_id,
                "status": "approved",
                "ticket_id": f"approval-{task_id[:8]}",
                "approver": approver,
                "approved_amount": amount,
                "message": f"Auto-approved: {purpose} for ${amount}"
            }
            task_manager.update_task(task_id, LongRunningTaskStatus.APPROVED, result=result)
        else:
            result = {
                "task_id": task_id,
                "status": "pending",
                "ticket_id": f"approval-{task_id[:8]}",
                "approver": approver,
                "message": f"Approval required from {approver} for {purpose}: ${amount}"
            }
            task_manager.update_task(task_id, LongRunningTaskStatus.WAITING_APPROVAL, result=result)

        return f"""✅ Approval request created successfully:

**Task ID**: {task_id}
**Status**: {result['status']}
**Ticket ID**: {result['ticket_id']}
**Purpose**: {purpose}
**Amount**: ${amount}
**Approver**: {approver}

{result['message']}

Use `check_task_status("{task_id}")` to monitor progress."""

    except Exception as e:
        logger.error(f"Error in approval request: {e}")
        return f"❌ Error creating approval request: {str(e)}"

def _process_large_dataset(dataset_name: str, operation: str = "analyze") -> str:
    """
    📊 Process a large dataset with progress tracking.

    This long-running tool processes datasets with real-time progress updates.
    Suitable for data analysis, transformation, and reporting tasks.

    Args:
        dataset_name: Name of the dataset to process
        operation: Type of operation (analyze, transform, export, etc.)

    Returns:
        JSON string with task information and processing status
    """
    try:
        # Validate inputs
        dataset_name = InputValidator.validate_string(dataset_name, "dataset_name", required=True, max_length=200)
        operation = InputValidator.validate_string(operation, "operation", required=False, max_length=50)

        # Create task
        task_id = task_manager.create_task()

        # Simulate starting the processing
        result = {
            "task_id": task_id,
            "status": "in_progress",
            "dataset": dataset_name,
            "operation": operation,
            "progress": 0.1,
            "current_stage": "Initializing processing",
            "estimated_completion": "5-10 minutes"
        }

        task_manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS,
            result=result, progress=0.1,
            metadata={"current_stage": "Initializing processing"}
        )

        return f"""🚀 Dataset processing started:

**Task ID**: {task_id}
**Dataset**: {dataset_name}
**Operation**: {operation}
**Status**: Processing started
**Progress**: 10%
**Current Stage**: Initializing processing

Estimated completion: 5-10 minutes

Use `check_task_status("{task_id}")` to monitor progress."""

    except Exception as e:
        logger.error(f"Error starting dataset processing: {e}")
        return f"❌ Error starting dataset processing: {str(e)}"

def _generate_report(report_type: str, data_sources: str = "default") -> str:
    """
    📄 Generate a comprehensive report from specified data sources.

    This long-running tool creates detailed reports with multiple data sources.
    Supports various report types and formats.

    Args:
        report_type: Type of report (financial, operational, performance, etc.)
        data_sources: Comma-separated list of data sources to include

    Returns:
        JSON string with task information and report generation status
    """
    try:
        # Validate inputs
        report_type = InputValidator.validate_string(report_type, "report_type", required=True, max_length=100)
        data_sources_str = InputValidator.validate_string(data_sources, "data_sources", required=False, max_length=500)

        # Parse data sources
        data_sources_list = [s.strip() for s in data_sources_str.split(",") if s.strip()]
        if not data_sources_list:
            data_sources_list = ["default_source"]

        # Create task
        task_id = task_manager.create_task()

        # Simulate starting report generation
        result = {
            "task_id": task_id,
            "status": "in_progress",
            "report_type": report_type,
            "data_sources": data_sources_list,
            "progress": 0.2,
            "current_stage": "Collecting data",
            "estimated_pages": 25,
            "estimated_completion": "3-5 minutes"
        }

        task_manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS,
            result=result, progress=0.2,
            metadata={"current_stage": "Collecting data"}
        )

        return f"""📊 Report generation started:

**Task ID**: {task_id}
**Report Type**: {report_type}
**Data Sources**: {', '.join(data_sources_list)}
**Status**: Generating report
**Progress**: 20%
**Current Stage**: Collecting data
**Estimated Pages**: 25

Estimated completion: 3-5 minutes

Use `check_task_status("{task_id}")` to monitor progress."""

    except Exception as e:
        logger.error(f"Error starting report generation: {e}")
        return f"❌ Error starting report generation: {str(e)}"

def _check_task_status(task_id: str) -> str:
    """
    🔍 Check the status of a long-running task.

    Use this to monitor the progress of approval requests, data processing,
    report generation, or any other long-running operations.

    Args:
        task_id: The task ID returned when starting a long-running operation

    Returns:
        Current status and progress information for the task
    """
    try:
        task_id = InputValidator.validate_string(task_id, "task_id", required=True, max_length=100)

        task = task_manager.get_task(task_id)
        if not task:
            return f"❌ Task {task_id} not found. Please check the task ID."

        # Format status based on task type
        status_emoji = {
            LongRunningTaskStatus.PENDING: "⏳",
            LongRunningTaskStatus.IN_PROGRESS: "🔄",
            LongRunningTaskStatus.WAITING_APPROVAL: "⏰",
            LongRunningTaskStatus.APPROVED: "✅",
            LongRunningTaskStatus.REJECTED: "❌",
            LongRunningTaskStatus.COMPLETED: "✅",
            LongRunningTaskStatus.FAILED: "❌",
            LongRunningTaskStatus.CANCELLED: "🚫"
        }

        emoji = status_emoji.get(task.status, "❓")
        progress_bar = "█" * int(task.progress * 10) + "░" * (10 - int(task.progress * 10))

        status_info = f"""{emoji} **Task Status**: {task.status.value.replace('_', ' ').title()}

**Task ID**: {task_id}
**Progress**: {progress_bar} {int(task.progress * 100)}%
**Created**: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(task.created_at))}
**Updated**: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(task.updated_at))}"""

        if task.metadata:
            if "current_stage" in task.metadata:
                status_info += f"\n**Current Stage**: {task.metadata['current_stage']}"
            if "ticket_id" in task.metadata:
                status_info += f"\n**Ticket ID**: {task.metadata['ticket_id']}"

        if task.result:
            if isinstance(task.result, dict):
                if "message" in task.result:
                    status_info += f"\n**Message**: {task.result['message']}"
                if "file_path" in task.result:
                    status_info += f"\n**Output File**: {task.result['file_path']}"

        if task.error:
            status_info += f"\n**Error**: {task.error}"

        return status_info

    except Exception as e:
        logger.error(f"Error checking task status: {e}")
        return f"❌ Error checking task status: {str(e)}"

# Create ADK FunctionTool instances with proper naming (using underscore prefix to match LLM expectations)
adk_ask_for_approval = FunctionTool(func=_ask_for_approval)
adk_ask_for_approval.name = "_ask_for_approval"
adk_process_large_dataset = FunctionTool(func=_process_large_dataset)
adk_process_large_dataset.name = "_process_large_dataset"
adk_generate_report = FunctionTool(func=_generate_report)
adk_generate_report.name = "_generate_report"
adk_check_task_status = FunctionTool(func=_check_task_status)
adk_check_task_status.name = "_check_task_status"

# Export all long-running tools
__all__ = [
    'adk_ask_for_approval',
    'adk_process_large_dataset',
    'adk_generate_report',
    'adk_check_task_status',
    'task_manager'
]
