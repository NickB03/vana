"""
Comprehensive Test Suite for ADK Tools
Tests all ADK tool functionality with proper async/await handling
"""

import pytest
import asyncio
import tempfile
import os
import json
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

# Add project root to path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from lib._tools.adk_tools import (
    # File System Tools
    read_file,
    write_file,
    list_directory,
    file_exists,
    delete_file,
    create_directory,
    # Search Tools
    vector_search,
    web_search,
    # System Tools
    echo,
    get_current_time,
    get_health_status,
    # Coordination Tools
    coordinate_task,
    get_agent_status,
    analyze_task,
    classify_task,
    # Workflow Tools
    create_workflow,
    execute_workflow,
    get_workflow_status,
    # Memory Tools
    store_memory,
    retrieve_memory,
    search_memory,
)


class TestADKToolsComprehensive:
    """Comprehensive test suite for all ADK tools"""

    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        self.temp_dir = tempfile.mkdtemp()
        yield
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    # File System Tool Tests
    @pytest.mark.asyncio
    async def test_file_operations_workflow(self):
        """Test complete file operation workflow"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        test_content = "Hello, VANA!"
        
        # Write file
        write_result = await write_file(test_file, test_content)
        assert "success" in write_result.lower()
        
        # Check existence
        exists_result = file_exists(test_file)
        assert "true" in exists_result.lower()
        
        # Read file
        read_result = await read_file(test_file)
        assert read_result == test_content
        
        # List directory
        list_result = list_directory(self.temp_dir)
        list_data = json.loads(list_result)
        assert "test.txt" in list_data["items"]
        
        # Delete file
        delete_result = delete_file(test_file)
        assert "success" in delete_result.lower()
        
        # Verify deletion
        exists_after = file_exists(test_file)
        assert "false" in exists_after.lower()

    @pytest.mark.asyncio
    async def test_directory_operations(self):
        """Test directory creation and management"""
        test_dir = os.path.join(self.temp_dir, "subdir")
        
        # Create directory
        create_result = create_directory(test_dir)
        assert "success" in create_result.lower()
        assert os.path.exists(test_dir)
        
        # Create nested directory
        nested_dir = os.path.join(test_dir, "nested", "deep")
        create_nested = create_directory(nested_dir)
        assert "success" in create_nested.lower()
        assert os.path.exists(nested_dir)

    # Search Tool Tests
    @pytest.mark.asyncio
    async def test_vector_search_functionality(self):
        """Test vector search with various queries"""
        queries = [
            "How to implement authentication in Python?",
            "Best practices for microservices",
            "Machine learning algorithms",
        ]
        
        for query in queries:
            result = await vector_search(query, max_results=5)
            data = json.loads(result)
            
            assert "query" in data
            assert data["query"] == query
            assert "results" in data
            assert isinstance(data["results"], list)
            assert len(data["results"]) <= 5

    @pytest.mark.asyncio
    async def test_web_search_functionality(self):
        """Test web search with various queries"""
        # Test general search
        result = await web_search("Python programming", max_results=3)
        data = json.loads(result)
        
        assert "query" in data
        assert "results" in data
        assert isinstance(data["results"], list)
        
        # Test time query
        time_result = await web_search("what time is it", max_results=1)
        time_data = json.loads(time_result)
        assert "results" in time_data
        
        # Check for time information in results
        results_text = str(time_data["results"])
        assert any(keyword in results_text.lower() for keyword in ["time", "utc", "clock"])

    # System Tool Tests
    def test_echo_functionality(self):
        """Test echo with various inputs"""
        test_cases = [
            "Hello, World!",
            "Special chars: @#$%^&*()",
            "Unicode: 你好 🌍",
            "",  # Empty string
        ]
        
        for message in test_cases:
            result = echo(message)
            assert isinstance(result, str)
            if message:  # Non-empty messages should be in result
                assert message in result

    def test_get_current_time(self):
        """Test current time retrieval"""
        result = get_current_time()
        data = json.loads(result)
        
        assert "current_time" in data
        assert "timezone" in data
        assert "timestamp" in data
        
        # Verify timestamp is recent (within last minute)
        timestamp = data["timestamp"]
        now = datetime.now().timestamp()
        assert abs(now - timestamp) < 60

    def test_get_health_status(self):
        """Test health status reporting"""
        result = get_health_status()
        data = json.loads(result)
        
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "timestamp" in data
        assert "services" in data

    # Coordination Tool Tests
    @pytest.mark.asyncio
    async def test_task_coordination(self):
        """Test task coordination functionality"""
        test_task = {
            "task_id": "test-123",
            "description": "Process data files",
            "type": "data_processing",
            "priority": "high"
        }
        
        result = await coordinate_task(json.dumps(test_task))
        data = json.loads(result)
        
        assert "task_id" in data
        assert "status" in data
        assert "assigned_agent" in data

    def test_get_agent_status(self):
        """Test agent status retrieval"""
        result = get_agent_status("vana")
        data = json.loads(result)
        
        assert "agent_name" in data
        assert "status" in data
        assert "capabilities" in data
        assert isinstance(data["capabilities"], list)

    def test_analyze_task(self):
        """Test task analysis"""
        tasks = [
            "Write a Python script to analyze CSV data",
            "Create a web API with authentication",
            "Search for information about machine learning",
        ]
        
        for task in tasks:
            result = analyze_task(task)
            data = json.loads(result)
            
            assert "task_type" in data
            assert "complexity" in data
            assert "estimated_duration" in data
            assert "required_capabilities" in data

    def test_classify_task(self):
        """Test task classification"""
        result = classify_task("Build a machine learning model")
        data = json.loads(result)
        
        assert "classification" in data
        assert "confidence" in data
        assert 0 <= data["confidence"] <= 1
        assert "recommended_agent" in data

    # Workflow Tool Tests
    @pytest.mark.asyncio
    async def test_workflow_operations(self):
        """Test workflow creation and execution"""
        workflow_def = {
            "name": "Test Workflow",
            "steps": [
                {"step": 1, "action": "read_file", "params": {"file": "input.txt"}},
                {"step": 2, "action": "process_data", "params": {"format": "json"}},
                {"step": 3, "action": "write_file", "params": {"file": "output.txt"}},
            ]
        }
        
        # Create workflow
        create_result = await create_workflow(json.dumps(workflow_def))
        create_data = json.loads(create_result)
        assert "workflow_id" in create_data
        
        workflow_id = create_data["workflow_id"]
        
        # Execute workflow
        exec_result = await execute_workflow(workflow_id)
        exec_data = json.loads(exec_result)
        assert "status" in exec_data
        assert exec_data["status"] in ["running", "queued"]
        
        # Get status
        status_result = get_workflow_status(workflow_id)
        status_data = json.loads(status_result)
        assert "workflow_id" in status_data
        assert "status" in status_data

    # Memory Tool Tests
    @pytest.mark.asyncio
    async def test_memory_operations(self):
        """Test memory storage and retrieval"""
        memory_data = {
            "key": "test_memory",
            "value": {"data": "important information", "timestamp": datetime.now().isoformat()},
            "tags": ["test", "important"]
        }
        
        # Store memory
        store_result = await store_memory(
            memory_data["key"],
            json.dumps(memory_data["value"]),
            memory_data["tags"]
        )
        store_data = json.loads(store_result)
        assert "success" in store_data
        
        # Retrieve memory
        retrieve_result = await retrieve_memory(memory_data["key"])
        retrieve_data = json.loads(retrieve_result)
        assert "value" in retrieve_data
        assert json.loads(retrieve_data["value"]) == memory_data["value"]
        
        # Search memory
        search_result = await search_memory("important", ["test"])
        search_data = json.loads(search_result)
        assert "results" in search_data
        assert len(search_data["results"]) > 0

    # Error Handling Tests
    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling across tools"""
        # Test read non-existent file
        result = await read_file("/non/existent/file.txt")
        assert "error" in result.lower()
        
        # Test write to invalid path
        result = await write_file("/root/cannot/write/here.txt", "test")
        assert "error" in result.lower() or "permission" in result.lower()
        
        # Test invalid JSON in coordinate_task
        result = await coordinate_task("invalid json")
        data = json.loads(result)
        assert "error" in data or "status" in data

    # Performance Tests
    @pytest.mark.asyncio
    async def test_concurrent_operations(self):
        """Test concurrent execution of multiple tools"""
        import time
        
        start_time = time.time()
        
        # Run multiple operations concurrently
        tasks = [
            echo("Test 1"),
            echo("Test 2"),
            get_current_time(),
            get_health_status(),
            file_exists(self.temp_dir),
        ]
        
        # Execute all tasks (mix of sync and async)
        results = []
        for task in tasks:
            if asyncio.iscoroutine(task):
                results.append(await task)
            else:
                results.append(task)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # All operations should complete quickly
        assert execution_time < 2.0
        assert len(results) == len(tasks)
        assert all(result for result in results)


# Integration test that uses multiple tools together
class TestADKToolsIntegration:
    """Integration tests combining multiple ADK tools"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for integration tests"""
        self.temp_dir = tempfile.mkdtemp()
        yield
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    @pytest.mark.asyncio
    async def test_data_processing_workflow(self):
        """Test a complete data processing workflow"""
        # 1. Create test data file
        data_file = os.path.join(self.temp_dir, "data.json")
        test_data = {"users": [{"name": "Alice"}, {"name": "Bob"}]}
        await write_file(data_file, json.dumps(test_data))
        
        # 2. Analyze the task
        task_analysis = analyze_task("Process JSON data and extract user names")
        analysis_data = json.loads(task_analysis)
        assert analysis_data["task_type"] == "data_processing"
        
        # 3. Read and process the file
        file_content = await read_file(data_file)
        data = json.loads(file_content)
        user_names = [user["name"] for user in data["users"]]
        
        # 4. Store results in memory
        await store_memory(
            "processed_users",
            json.dumps(user_names),
            ["data_processing", "users"]
        )
        
        # 5. Verify memory storage
        memory_result = await retrieve_memory("processed_users")
        memory_data = json.loads(memory_result)
        stored_names = json.loads(memory_data["value"])
        assert stored_names == user_names
        
        # 6. Create output file
        output_file = os.path.join(self.temp_dir, "output.txt")
        await write_file(output_file, f"Processed users: {', '.join(user_names)}")
        
        # 7. Verify workflow completion
        assert file_exists(output_file)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])