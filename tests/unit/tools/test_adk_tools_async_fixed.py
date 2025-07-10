"""
Fixed async tests for adk_tools.py - Core ADK Functions

Tests the critical async functions in adk_tools.py with proper async/await handling.
"""

import json
import pytest
import tempfile
import os
import asyncio
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

# Import the critical ADK tools
import sys
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import (
    # File System Tools (Critical)
    read_file,
    write_file,
    list_directory,
    file_exists,
    # Search Tools (Critical)
    vector_search,
    web_search,
    # System Tools (Critical)
    echo,
    get_health_status,
)


class TestCriticalADKToolsAsync:
    """Fixed async tests for ADK tools with proper async/await handling"""

    def setup_method(self):
        """Setup for each test method"""
        self.temp_dir = tempfile.mkdtemp()
        self.test_file = os.path.join(self.temp_dir, "test_file.txt")
        self.test_content = "Test content for validation"

    def teardown_method(self):
        """Cleanup after each test method"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_write_file_async(self):
        """Test async write_file with proper await"""
        # Call async function with await
        result = await write_file(self.test_file, self.test_content)
        
        # Validate result
        assert isinstance(result, str), "write_file must return string"
        assert "success" in result.lower() or "written" in result.lower(), (
            f"write_file must indicate success. Got: {result}"
        )
        
        # Verify file was created
        assert os.path.exists(self.test_file), "File must be created"
        
        # Verify content
        with open(self.test_file, "r") as f:
            actual_content = f.read()
        assert actual_content == self.test_content, "File content must match input"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_read_file_async(self):
        """Test async read_file with proper await"""
        # Setup: Create test file
        with open(self.test_file, "w") as f:
            f.write(self.test_content)
        
        # Call async function with await
        result = await read_file(self.test_file)
        
        # Validate result
        assert isinstance(result, str), "read_file must return string"
        assert result == self.test_content, (
            f"read_file must return exact content. Expected: {self.test_content}, Got: {result}"
        )

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_file_exists_sync(self):
        """Test file_exists (sync function)"""
        # Test with non-existent file
        result_missing = file_exists("/nonexistent/file.txt")
        assert isinstance(result_missing, str), "file_exists must return string"
        assert "false" in result_missing.lower() or "not" in result_missing.lower(), (
            "file_exists must indicate file does not exist"
        )
        
        # Create a file and test
        with open(self.test_file, "w") as f:
            f.write("test")
        
        result_exists = file_exists(self.test_file)
        assert "true" in result_exists.lower() or "exists" in result_exists.lower(), (
            "file_exists must indicate file exists"
        )

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_list_directory_sync(self):
        """Test list_directory (sync function)"""
        # Create some test files
        for i in range(3):
            with open(os.path.join(self.temp_dir, f"file{i}.txt"), "w") as f:
                f.write(f"content{i}")
        
        result = list_directory(self.temp_dir)
        assert isinstance(result, str), "list_directory must return string"
        
        # Parse JSON result
        data = json.loads(result)
        assert "items" in data, "Result must contain items"
        assert len(data["items"]) == 3, "Should list all 3 files"
        assert all(f"file{i}.txt" in data["items"] for i in range(3))

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_vector_search_async(self):
        """Test async vector_search with proper await"""
        query = "test query"
        
        # Call async function with await
        result = await vector_search(query)
        
        # Validate result
        assert isinstance(result, str), "vector_search must return string"
        data = json.loads(result)
        assert "query" in data, "Result must contain query"
        assert data["query"] == query, "Query must match input"
        assert "results" in data, "Result must contain results"
        assert isinstance(data["results"], list), "Results must be a list"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_web_search_async(self):
        """Test async web_search with proper await"""
        query = "Python programming"
        
        # Call async function with await
        result = await web_search(query, max_results=3)
        
        # Validate result
        assert isinstance(result, str), "web_search must return string"
        data = json.loads(result)
        assert "query" in data, "Result must contain query"
        assert data["query"] == query, "Query must match input"
        assert "results" in data, "Result must contain results"
        assert isinstance(data["results"], list), "Results must be a list"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_echo_sync(self):
        """Test echo (sync function)"""
        message = "Hello, World!"
        result = echo(message)
        
        assert isinstance(result, str), "echo must return string"
        assert message in result, f"echo must contain input message. Got: {result}"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_get_health_status_sync(self):
        """Test get_health_status (sync function)"""
        result = get_health_status()
        
        assert isinstance(result, str), "get_health_status must return string"
        data = json.loads(result)
        assert "status" in data, "Result must contain status"
        assert data["status"] in ["healthy", "degraded", "unhealthy"], (
            "Status must be valid health state"
        )


# Create a simple test runner for debugging
if __name__ == "__main__":
    import sys
    pytest.main([__file__, "-v", "-s"] + sys.argv[1:])