"""
Tests for Long Running Function Tools

This module tests the Google ADK Long Running Function Tools implementation,
including task management, status tracking, and ADK integration.
"""

import pytest
import asyncio
import time
from unittest.mock import patch, MagicMock

from lib._tools.long_running_tools import (
    LongRunningFunctionTool,
    LongRunningTaskManager,
    LongRunningTaskStatus,
    LongRunningTaskResult,
    create_long_running_tool,
    task_manager,
    ask_for_approval,
    process_large_dataset,
    generate_report,
)

from lib._tools.adk_long_running_tools import (
    _ask_for_approval,
    _process_large_dataset,
    _generate_report,
    _check_task_status,
)

class TestLongRunningTaskManager:
    """Test the task manager functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.manager = LongRunningTaskManager()
    
    def test_create_task(self):
        """Test task creation."""
        task_id = self.manager.create_task()
        assert task_id is not None
        assert len(task_id) > 0
        assert task_id in self.manager.tasks
        
        task = self.manager.get_task(task_id)
        assert task is not None
        assert task.status == LongRunningTaskStatus.PENDING
        assert task.progress == 0.0
    
    def test_create_task_with_id(self):
        """Test task creation with specific ID."""
        custom_id = "test-task-123"
        task_id = self.manager.create_task(custom_id)
        assert task_id == custom_id
        assert custom_id in self.manager.tasks
    
    def test_update_task(self):
        """Test task status updates."""
        task_id = self.manager.create_task()
        
        # Update to in progress
        success = self.manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS, 
            progress=0.5
        )
        assert success is True
        
        task = self.manager.get_task(task_id)
        assert task.status == LongRunningTaskStatus.IN_PROGRESS
        assert task.progress == 0.5
        
        # Update to completed with result
        result_data = {"message": "Task completed successfully"}
        success = self.manager.update_task(
            task_id, LongRunningTaskStatus.COMPLETED,
            result=result_data, progress=1.0
        )
        assert success is True
        
        task = self.manager.get_task(task_id)
        assert task.status == LongRunningTaskStatus.COMPLETED
        assert task.result == result_data
        assert task.progress == 1.0
    
    def test_update_nonexistent_task(self):
        """Test updating a task that doesn't exist."""
        success = self.manager.update_task(
            "nonexistent", LongRunningTaskStatus.COMPLETED
        )
        assert success is False
    
    def test_task_callback(self):
        """Test task update callbacks."""
        task_id = self.manager.create_task()
        callback_called = False
        callback_task = None
        
        def test_callback(task):
            nonlocal callback_called, callback_task
            callback_called = True
            callback_task = task
        
        self.manager.register_callback(task_id, test_callback)
        self.manager.update_task(task_id, LongRunningTaskStatus.COMPLETED)
        
        assert callback_called is True
        assert callback_task is not None
        assert callback_task.status == LongRunningTaskStatus.COMPLETED

class TestLongRunningFunctionTool:
    """Test the long-running function tool wrapper."""
    
    def setup_method(self):
        """Set up test environment."""
        self.manager = LongRunningTaskManager()
    
    @pytest.mark.asyncio
    async def test_async_function_execution(self):
        """Test execution of async functions."""
        async def test_async_func(task_id: str, message: str) -> str:
            await asyncio.sleep(0.1)  # Simulate work
            return f"Processed: {message}"
        
        tool = LongRunningFunctionTool(test_async_func, name="test_tool")
        result = await tool.run_async({"message": "test message"})
        
        assert "task_id" in result
        assert result["status"] == LongRunningTaskStatus.COMPLETED.value
        assert "Processed: test message" in str(result["result"])
        assert "execution_time" in result
    
    @pytest.mark.asyncio
    async def test_sync_function_execution(self):
        """Test execution of sync functions."""
        def test_sync_func(task_id: str, number: int) -> int:
            time.sleep(0.1)  # Simulate work
            return number * 2
        
        tool = LongRunningFunctionTool(test_sync_func, name="sync_tool")
        result = await tool.run_async({"number": 5})
        
        assert "task_id" in result
        assert result["status"] == LongRunningTaskStatus.COMPLETED.value
        assert result["result"] == 10
    
    @pytest.mark.asyncio
    async def test_function_timeout(self):
        """Test function timeout handling."""
        async def slow_func(task_id: str) -> str:
            await asyncio.sleep(2)  # Longer than timeout
            return "Should not reach here"
        
        tool = LongRunningFunctionTool(slow_func, name="slow_tool", timeout=0.5)
        result = await tool.run_async({})
        
        assert result["status"] == LongRunningTaskStatus.FAILED.value
        assert "timed out" in result["error"].lower()
    
    @pytest.mark.asyncio
    async def test_function_error_handling(self):
        """Test error handling in functions."""
        async def error_func(task_id: str) -> str:
            raise ValueError("Test error")
        
        tool = LongRunningFunctionTool(error_func, name="error_tool")
        result = await tool.run_async({})
        
        assert result["status"] == LongRunningTaskStatus.FAILED.value
        assert "Test error" in result["error"]
    
    def test_get_task_status(self):
        """Test task status retrieval."""
        def simple_func(task_id: str) -> str:
            return "done"
        
        tool = LongRunningFunctionTool(simple_func, name="simple_tool")
        
        # Test nonexistent task
        status = tool.get_task_status("nonexistent")
        assert status["status"] == "not_found"
        
        # Create a task manually for testing
        task_id = task_manager.create_task()
        task_manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS,
            progress=0.7, result={"partial": "data"}
        )
        
        status = tool.get_task_status(task_id)
        assert status["task_id"] == task_id
        assert status["status"] == LongRunningTaskStatus.IN_PROGRESS.value
        assert status["progress"] == 0.7
        assert status["result"]["partial"] == "data"

class TestADKIntegration:
    """Test ADK integration functions."""
    
    def test_ask_for_approval_small_amount(self):
        """Test approval request for small amounts (auto-approved)."""
        result = _ask_for_approval("Test purchase", 500, "Manager")
        
        assert "✅ Approval request created successfully" in result
        assert "approved" in result.lower()
        assert "Task ID" in result
        assert "check_task_status" in result
    
    def test_ask_for_approval_large_amount(self):
        """Test approval request for large amounts (pending)."""
        result = _ask_for_approval("Major purchase", 5000, "CEO")
        
        assert "✅ Approval request created successfully" in result
        assert "pending" in result.lower()
        assert "Task ID" in result
        assert "check_task_status" in result
    
    def test_process_large_dataset(self):
        """Test dataset processing initiation."""
        result = _process_large_dataset("customer_data", "analyze")
        
        assert "🚀 Dataset processing started" in result
        assert "customer_data" in result
        assert "analyze" in result
        assert "Task ID" in result
        assert "check_task_status" in result
    
    def test_generate_report(self):
        """Test report generation initiation."""
        result = _generate_report("financial", "sales,revenue,costs")
        
        assert "📊 Report generation started" in result
        assert "financial" in result
        assert "sales" in result and "revenue" in result
        assert "Task ID" in result
        assert "check_task_status" in result
    
    def test_check_task_status_nonexistent(self):
        """Test checking status of nonexistent task."""
        result = _check_task_status("nonexistent-task")
        
        assert "❌ Task nonexistent-task not found" in result
    
    def test_check_task_status_existing(self):
        """Test checking status of existing task."""
        # Create a task first
        task_id = task_manager.create_task()
        task_manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS,
            progress=0.6,
            metadata={"current_stage": "Processing data"}
        )
        
        result = _check_task_status(task_id)
        
        assert "🔄 **Task Status**: In Progress" in result
        assert task_id in result
        assert "60%" in result
        assert "Processing data" in result

class TestExampleFunctions:
    """Test the example long-running functions."""
    
    @pytest.mark.asyncio
    async def test_ask_for_approval_function(self):
        """Test the approval function."""
        task_id = "test-approval"
        result = await ask_for_approval(task_id, "Test request", 750.0)
        
        assert "status" in result
        assert "ticket_id" in result
        assert result["ticket_id"] == f"approval-{task_id[:8]}"
    
    @pytest.mark.asyncio
    async def test_process_large_dataset_function(self):
        """Test the dataset processing function."""
        task_id = "test-dataset"
        result = await process_large_dataset(task_id, "test_data", "transform")
        
        assert result["dataset"] == "test_data"
        assert result["operation"] == "transform"
        assert "stages" in result
        assert len(result["stages"]) == 5  # 5 processing stages
    
    def test_generate_report_function(self):
        """Test the report generation function."""
        task_id = "test-report"
        result = generate_report(task_id, "quarterly", ["sales", "marketing"])
        
        assert result["report_type"] == "quarterly"
        assert result["data_sources"] == ["sales", "marketing"]
        assert result["status"] == "completed"
        assert "file_path" in result

def test_factory_function():
    """Test the factory function for creating tools."""
    def test_func(task_id: str) -> str:
        return "test result"
    
    tool = create_long_running_tool(test_func, name="factory_test")
    
    assert isinstance(tool, LongRunningFunctionTool)
    assert tool.name == "factory_test"
    assert tool.func == test_func
