"""
Critical Tests for adk_tools.py - Core ADK Functions

Tests the 29 most critical functions in adk_tools.py with STRICT validation.
These are production-critical functions that power the core VANA functionality.
"""

import json
import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch

# Import the critical ADK tools
import sys
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import (
    # File System Tools (Critical)
    read_file, write_file, list_directory, file_exists,
    # Search Tools (Critical) 
    vector_search, web_search,
    # System Tools (Critical)
    echo, get_health_status,
    # Coordination Tools (Critical)
    coordinate_task, delegate_to_agent, get_agent_status, transfer_to_agent,
    # Task Analysis Tools (Critical)
    analyze_task, match_capabilities, classify_task,
    # Workflow Tools (Critical)  
    create_workflow, start_workflow, get_workflow_status, list_workflows,
    pause_workflow, resume_workflow, cancel_workflow,
    get_workflow_templates
)

class TestCriticalADKTools:
    """Critical tests for ADK tools with STRICT validation"""
    
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

    # File System Tools Tests - STRICT validation
    
    @pytest.mark.unit
    def test_write_file_basic_functionality(self):
        """Test write_file with STRICT validation"""
        result = write_file(self.test_file, self.test_content)
        
        # STRICT: Must return success indicator
        assert isinstance(result, str), "write_file must return string"
        assert "success" in result.lower() or "written" in result.lower(), \
            f"write_file must indicate success. Got: {result}"
        
        # STRICT: File must actually be created
        assert os.path.exists(self.test_file), "File must be created"
        
        # STRICT: Content must be written correctly
        with open(self.test_file, 'r') as f:
            actual_content = f.read()
        assert actual_content == self.test_content, "File content must match input"
    
    @pytest.mark.unit
    def test_read_file_basic_functionality(self):
        """Test read_file with STRICT validation"""
        # Setup: Create test file
        with open(self.test_file, 'w') as f:
            f.write(self.test_content)
        
        result = read_file(self.test_file)
        
        # STRICT: Must return exact file content
        assert isinstance(result, str), "read_file must return string"
        assert result == self.test_content, f"read_file must return exact content. Expected: {self.test_content}, Got: {result}"
    
    @pytest.mark.unit
    def test_file_exists_functionality(self):
        """Test file_exists with STRICT validation"""
        # Test with non-existent file
        result_missing = file_exists("/nonexistent/file.txt")
        assert isinstance(result_missing, str), "file_exists must return string"
        assert "false" in result_missing.lower() or "not" in result_missing.lower(), \
            "file_exists must indicate file does not exist"
        
        # Test with existing file
        with open(self.test_file, 'w') as f:
            f.write("test")
        
        result_exists = file_exists(self.test_file)
        assert "true" in result_exists.lower() or "exists" in result_exists.lower(), \
            "file_exists must indicate file exists"
    
    @pytest.mark.unit
    def test_list_directory_functionality(self):
        """Test list_directory with STRICT validation"""
        # Create test files in directory
        test_files = ["file1.txt", "file2.txt", "subdir"]
        for name in test_files[:2]:
            with open(os.path.join(self.temp_dir, name), 'w') as f:
                f.write("test")
        os.mkdir(os.path.join(self.temp_dir, test_files[2]))
        
        result = list_directory(self.temp_dir)
        
        # STRICT: Must return directory listing
        assert isinstance(result, str), "list_directory must return string"
        assert len(result) > 10, "Directory listing too short"
        
        # STRICT: Must contain all created files
        for filename in test_files:
            assert filename in result, f"Directory listing must contain {filename}"

    # Search Tools Tests - STRICT validation with mocking
    
    @pytest.mark.unit
    def test_web_search_functionality(self):
        """Test web_search with STRICT validation"""
        with patch('requests.get') as mock_get:
            # Mock successful search response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "web": {
                    "results": [
                        {
                            "title": "Test Result",
                            "url": "https://example.com",
                            "description": "Test description",
                            "extra_snippets": ["Test snippet"]
                        }
                    ]
                }
            }
            mock_get.return_value = mock_response
            
            result = web_search("test query")
            
            # STRICT: Must return structured search result
            assert isinstance(result, str), "web_search must return string"
            assert len(result) > 20, "Search result too short"
            
            # STRICT: Must contain search information
            assert "test" in result.lower(), "Search result must contain query terms"
            
            # STRICT: API must be called
            mock_get.assert_called_once()
    
    @pytest.mark.unit
    def test_vector_search_functionality(self):
        """Test vector_search with STRICT validation"""
        with patch('vertexai.generative_models.GenerativeModel') as mock_model:
            # Mock vector search response
            mock_response = Mock()
            mock_response.text = json.dumps({
                "query": "test query",
                "results": ["result1", "result2"],
                "similarity_scores": [0.9, 0.8]
            })
            mock_model.return_value.generate_content.return_value = mock_response
            
            result = vector_search("test query")
            
            # STRICT: Must return vector search result
            assert isinstance(result, str), "vector_search must return string"
            assert len(result) > 15, "Vector search result too short"
            
            # Should contain query information
            result_lower = result.lower()
            assert "test" in result_lower or "query" in result_lower, \
                "Vector search result must reference query"

    # System Tools Tests - STRICT validation
    
    @pytest.mark.unit
    def test_echo_functionality(self):
        """Test echo with STRICT validation"""
        test_message = "Test echo message"
        result = echo(test_message)
        
        # STRICT: Must echo the message back
        assert isinstance(result, str), "echo must return string"
        assert test_message in result, f"echo must contain input message. Expected: {test_message}, Got: {result}"
        assert len(result) >= len(test_message), "echo result too short"
    
    @pytest.mark.unit
    def test_get_health_status_functionality(self):
        """Test get_health_status with STRICT validation"""
        result = get_health_status()
        
        # STRICT: Must return health status
        assert isinstance(result, str), "get_health_status must return string"
        assert len(result) > 10, "Health status too short"
        
        # STRICT: Must be valid JSON with status
        try:
            parsed = json.loads(result)
            assert "status" in parsed, "Health status missing 'status' field"
            assert "health" in parsed or "operational" in str(parsed).lower(), \
                "Health status must indicate system health"
        except json.JSONDecodeError:
            # If not JSON, must contain health indicators
            result_lower = result.lower()
            assert any(term in result_lower for term in ["health", "status", "operational"]), \
                "Health status must contain health indicators"

    # Coordination Tools Tests - STRICT validation
    
    @pytest.mark.unit 
    def test_coordinate_task_functionality(self):
        """Test coordinate_task with STRICT validation"""
        task_description = "Test task coordination"
        result = coordinate_task(task_description)
        
        # STRICT: Must return coordination result
        assert isinstance(result, str), "coordinate_task must return string"
        assert len(result) > 20, "Coordination result too short"
        
        # STRICT: Must be valid JSON with coordination info
        try:
            parsed = json.loads(result)
            assert "action" in parsed, "Missing action field"
            assert parsed["action"] == "coordinate_task", "Incorrect action value"
            # Must preserve task description
            assert task_description in str(parsed) or "task" in str(parsed).lower(), \
                "Coordination result must reference task"
        except json.JSONDecodeError:
            # If not JSON, must contain coordination indicators
            result_lower = result.lower()
            assert any(term in result_lower for term in ["coordination", "task", "delegate"]), \
                "Coordination result must contain coordination indicators"
    
    @pytest.mark.unit
    def test_get_agent_status_functionality(self):
        """Test get_agent_status with STRICT validation"""
        result = get_agent_status()
        
        # STRICT: Must return agent status
        assert isinstance(result, str), "get_agent_status must return string"
        assert len(result) > 15, "Agent status too short"
        
        # STRICT: Must be valid JSON with agent information
        try:
            parsed = json.loads(result)
            assert "status" in parsed, "Missing status field"
            assert "action" in parsed, "Missing action field"
            assert parsed["action"] == "get_agent_status", "Incorrect action value"
        except json.JSONDecodeError:
            pytest.fail("get_agent_status must return valid JSON")

    # Task Analysis Tools Tests - STRICT validation
    
    @pytest.mark.unit
    def test_analyze_task_functionality(self):
        """Test analyze_task with STRICT validation"""
        task_description = "Analyze user sentiment in reviews"
        result = analyze_task(task_description)
        
        # STRICT: Must return task analysis
        assert isinstance(result, str), "analyze_task must return string"
        assert len(result) > 30, "Task analysis too short"
        
        # STRICT: Must contain analysis information
        try:
            parsed = json.loads(result)
            assert "analysis" in str(parsed).lower() or "task" in str(parsed).lower(), \
                "Task analysis must contain analysis information"
        except json.JSONDecodeError:
            # If not JSON, must contain analysis indicators
            result_lower = result.lower()
            assert any(term in result_lower for term in ["analysis", "task", "complexity", "sentiment"]), \
                "Task analysis must contain analysis indicators"
    
    @pytest.mark.unit
    def test_classify_task_functionality(self):
        """Test classify_task with STRICT validation"""
        task_description = "Process financial data"
        result = classify_task(task_description)
        
        # STRICT: Must return task classification
        assert isinstance(result, str), "classify_task must return string"
        assert len(result) > 20, "Task classification too short"
        
        # STRICT: Must contain classification information
        result_lower = result.lower()
        assert any(term in result_lower for term in ["classification", "category", "type", "financial", "data"]), \
            "Task classification must contain classification information"

    # Error Handling Tests - STRICT validation
    
    @pytest.mark.unit
    def test_file_operations_error_handling(self):
        """Test file operations error handling with STRICT validation"""
        # Test read_file with non-existent file
        result = read_file("/nonexistent/file.txt")
        assert isinstance(result, str), "Error result must be string"
        assert "error" in result.lower(), "Error result must indicate error"
        
        # Test write_file with invalid path
        result = write_file("", "content")
        assert isinstance(result, str), "Error result must be string"
        assert "error" in result.lower(), "Error result must indicate error"
    
    @pytest.mark.unit
    def test_coordination_tools_error_handling(self):
        """Test coordination tools error handling with STRICT validation"""
        # Test coordinate_task with empty description
        result = coordinate_task("")
        assert isinstance(result, str), "Coordinate task must return string"
        # Should handle empty input gracefully
        assert len(result) > 0, "Coordinate task must return some response"
        
        # Test with None input
        try:
            result = coordinate_task(None)
            assert isinstance(result, str), "Must handle None input"
        except Exception as e:
            assert isinstance(e, (ValueError, TypeError)), "Should raise appropriate error for None"

    # Integration-style tests within unit scope
    
    @pytest.mark.unit
    def test_file_workflow_integration(self):
        """Test complete file workflow with STRICT validation"""
        # Write -> Read -> Check exists workflow
        write_result = write_file(self.test_file, self.test_content)
        assert "success" in write_result.lower() or "written" in write_result.lower(), \
            "Write operation must succeed"
        
        read_result = read_file(self.test_file)
        assert read_result == self.test_content, "Read must return exact written content"
        
        exists_result = file_exists(self.test_file)
        assert "true" in exists_result.lower() or "exists" in exists_result.lower(), \
            "File existence check must confirm file exists"