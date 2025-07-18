"""
Test Suite for Core ADK Functions
Tests only the functions that actually exist in adk_tools.py
"""

import asyncio
import json
import os
import shutil

# Add project root to path
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).parent.parent))

from lib._tools.adk_tools import (  # Async File System Tools; Sync File System Tools; Async Search Tools; Sync Search Tools; System Tools; Coordination Tools
    coordinate_task,
    echo,
    file_exists,
    get_health_status,
    list_directory,
    read_file,
    search_knowledge,
    sync_read_file,
    sync_vector_search,
    sync_web_search,
    sync_write_file,
    vector_search,
    web_search,
    write_file,
)


class TestADKCoreFunctions:
    """Test suite for core ADK functions"""

    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        self.temp_dir = tempfile.mkdtemp()
        yield
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    # Async File System Tests
    @pytest.mark.asyncio
    async def test_async_file_operations(self):
        """Test async file read/write operations"""
        test_file = os.path.join(self.temp_dir, "async_test.txt")
        test_content = "Async file content"

        # Write file
        write_result = await write_file(test_file, test_content)
        assert "success" in write_result.lower()
        assert os.path.exists(test_file)

        # Read file
        read_result = await read_file(test_file)
        assert read_result == test_content

    # Sync File System Tests
    def test_sync_file_operations(self):
        """Test sync file operations"""
        test_file = os.path.join(self.temp_dir, "sync_test.txt")
        test_content = "Sync file content"

        # Write file synchronously
        write_result = sync_write_file(test_file, test_content)
        assert "success" in write_result.lower()

        # Check existence
        exists_result = file_exists(test_file)
        assert "true" in exists_result.lower()

        # Read file synchronously
        read_result = sync_read_file(test_file)
        assert read_result == test_content

        # List directory
        list_result = list_directory(self.temp_dir)
        list_data = json.loads(list_result)
        assert "sync_test.txt" in list_data["items"]

    # Async Search Tests
    @pytest.mark.asyncio
    async def test_async_search_operations(self):
        """Test async search functions"""
        # Vector search
        vector_result = await vector_search("Python programming", max_results=3)
        vector_data = json.loads(vector_result)
        assert "query" in vector_data
        assert "results" in vector_data

        # Web search
        web_result = await web_search("current weather", max_results=2)
        web_data = json.loads(web_result)
        assert "query" in web_data
        assert "results" in web_data

    # Sync Search Tests
    def test_sync_search_operations(self):
        """Test sync search functions"""
        # Sync web search
        web_result = sync_web_search("Python tutorials", max_results=3)
        web_data = json.loads(web_result)
        assert "query" in web_data
        assert web_data["query"] == "Python tutorials"

        # Sync vector search
        vector_result = sync_vector_search("machine learning", max_results=3)
        vector_data = json.loads(vector_result)
        assert "query" in vector_data
        assert vector_data["query"] == "machine learning"

        # Knowledge search
        knowledge_result = search_knowledge("VANA architecture")
        knowledge_data = json.loads(knowledge_result)
        assert "query" in knowledge_data

    # System Tool Tests
    def test_system_tools(self):
        """Test system utility functions"""
        # Echo
        echo_result = echo("Hello, VANA!")
        assert "Hello, VANA!" in echo_result

        # Health status
        health_result = get_health_status()
        health_data = json.loads(health_result)
        assert "status" in health_data
        assert health_data["status"] in ["healthy", "degraded", "unhealthy"]

    # Coordination Tool Tests
    def test_coordination_tools(self):
        """Test task coordination"""
        task_desc = "Analyze data and generate report"
        coord_result = coordinate_task(task_desc, "data_science")
        coord_data = json.loads(coord_result)

        assert "action" in coord_data
        assert coord_data["action"] == "coordinate_task"
        assert "task" in coord_data
        assert coord_data["task"] == task_desc
        assert "assigned_agent" in coord_data
        assert coord_data["assigned_agent"] == "data_science"
        assert "status" in coord_data
        assert coord_data["status"] == "adk_delegation_ready"
        assert "available_specialists" in coord_data
        assert isinstance(coord_data["available_specialists"], list)

    # Error Handling Tests
    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling in various functions"""
        # Read non-existent file
        read_error = await read_file("/non/existent/file.txt")
        assert "error" in read_error.lower()

        # Write to invalid location
        write_error = await write_file("/root/no_permission.txt", "test")
        assert "error" in write_error.lower() or "permission" in write_error.lower()

        # File exists on non-existent file
        exists_error = file_exists("/non/existent.txt")
        assert "false" in exists_error.lower() or "not" in exists_error.lower()

    # Integration Test
    @pytest.mark.asyncio
    async def test_file_workflow_integration(self):
        """Test a complete file processing workflow"""
        # 1. Create a data file
        data_file = os.path.join(self.temp_dir, "data.json")
        test_data = {"items": ["apple", "banana", "cherry"]}

        # 2. Write data asynchronously
        await write_file(data_file, json.dumps(test_data, indent=2))

        # 3. Verify file exists
        assert "true" in file_exists(data_file).lower()

        # 4. Read data synchronously
        content = sync_read_file(data_file)
        parsed_data = json.loads(content)
        assert parsed_data == test_data

        # 5. List directory to confirm
        dir_listing = json.loads(list_directory(self.temp_dir))
        assert "data.json" in dir_listing["items"]

        # 6. Echo summary
        summary = echo(f"Processed {len(test_data['items'])} items")
        assert "3 items" in summary


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
