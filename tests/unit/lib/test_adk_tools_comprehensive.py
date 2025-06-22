"""
Comprehensive tests for ADK Tools.
Target: 54% → 80%+ coverage
"""

import json
import pytest
import vcr
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from pathlib import Path

# Import the module under test
from lib._tools.adk_tools import (
    adk_web_search,
    adk_search_knowledge,
    adk_vector_search,
    adk_get_agent_status,
    adk_coordinate_task,
    adk_delegate_to_agent,
    adk_transfer_to_agent,
    adk_read_file,
    adk_write_file,
    adk_list_directory,
    adk_file_exists,
    adk_echo,
    adk_get_health_status,
    adk_analyze_task,
    adk_classify_task,
    adk_match_capabilities,
    adk_create_workflow,
    adk_start_workflow,
    adk_pause_workflow,
    adk_resume_workflow,
    adk_cancel_workflow,
    adk_get_workflow_status,
    adk_list_workflows,
    adk_get_workflow_templates
)
from tests.fixtures.vcr_config import get_test_vcr


class TestWebSearchTools:
    """Test suite for web search tools."""

    @patch('lib._tools.adk_tools.requests.get')
    def test_adk_web_search_success(self, mock_get):
        """Test successful web search."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "web": {
                "results": [
                    {
                        "title": "Test Result",
                        "url": "https://example.com",
                        "description": "Test description"
                    }
                ]
            }
        }
        mock_get.return_value = mock_response

        result = adk_web_search.func("test query")
        result_data = json.loads(result)
        
        assert result_data["status"] == "success"
        assert "results" in result_data
        assert len(result_data["results"]) > 0

    @patch('lib._tools.adk_tools.requests.get')
    def test_adk_web_search_error(self, mock_get):
        """Test web search with error."""
        mock_get.side_effect = Exception("Network error")

        result = adk_web_search.func("test query")
        result_data = json.loads(result)
        
        assert result_data["status"] == "error"
        assert "Network error" in result_data["error"]

    def test_adk_web_search_empty_query(self):
        """Test web search with empty query."""
        result = adk_web_search.func("")
        result_data = json.loads(result)
        
        assert result_data["status"] == "error"
        assert "Query cannot be empty" in result_data["error"]


class TestKnowledgeSearchTools:
    """Test suite for knowledge search tools."""

    @patch('lib._tools.adk_tools.VectorSearchService')
    def test_adk_search_knowledge_success(self, mock_service):
        """Test successful knowledge search."""
        mock_instance = Mock()
        mock_instance.search.return_value = {
            "results": [
                {
                    "content": "Test knowledge",
                    "score": 0.95,
                    "metadata": {"source": "test"}
                }
            ]
        }
        mock_service.return_value = mock_instance

        result = adk_search_knowledge.func("test query")
        result_data = json.loads(result)
        
        assert result_data["status"] == "success"
        assert "results" in result_data

    @patch('lib._tools.adk_tools.VectorSearchService')
    def test_adk_vector_search_success(self, mock_service):
        """Test successful vector search."""
        mock_instance = Mock()
        mock_instance.vector_search.return_value = {
            "matches": [
                {
                    "id": "doc1",
                    "score": 0.9,
                    "content": "Vector search result"
                }
            ]
        }
        mock_service.return_value = mock_instance

        result = adk_vector_search.func("test query")
        result_data = json.loads(result)
        
        assert result_data["status"] == "success"
        assert "matches" in result_data


class TestAgentCoordinationTools:
    """Test suite for agent coordination tools."""

    def test_adk_get_agent_status(self):
        """Test getting agent status."""
        result = adk_get_agent_status.func()
        result_data = json.loads(result)
        
        assert "agents" in result_data
        assert isinstance(result_data["agents"], list)

    def test_adk_coordinate_task(self):
        """Test task coordination."""
        result = adk_coordinate_task.func("Test task description")
        result_data = json.loads(result)
        
        assert "task_id" in result_data
        assert "status" in result_data
        assert result_data["description"] == "Test task description"

    def test_adk_delegate_to_agent(self):
        """Test agent delegation."""
        result = adk_delegate_to_agent.func("code_execution", "Write Python code")
        result_data = json.loads(result)
        
        assert result_data["action"] == "delegate"
        assert result_data["target_agent"] == "code_execution"
        assert result_data["task"] == "Write Python code"

    def test_adk_transfer_to_agent(self):
        """Test agent transfer."""
        result = adk_transfer_to_agent.func("data_science", "Analyze data")
        result_data = json.loads(result)
        
        assert result_data["action"] == "transfer"
        assert result_data["target_agent"] == "data_science"
        assert result_data["context"] == "Analyze data"


class TestFileSystemTools:
    """Test suite for file system tools."""

    def test_adk_read_file_success(self, tmp_path):
        """Test successful file reading."""
        test_file = tmp_path / "test.txt"
        test_content = "Hello, World!"
        test_file.write_text(test_content)

        result = adk_read_file.func(str(test_file))
        result_data = json.loads(result)
        
        assert result_data["status"] == "success"
        assert result_data["content"] == test_content

    def test_adk_read_file_not_found(self):
        """Test reading non-existent file."""
        result = adk_read_file.func("/nonexistent/file.txt")
        result_data = json.loads(result)
        
        assert result_data["status"] == "error"
        assert "not found" in result_data["error"].lower()

    def test_adk_write_file_success(self, tmp_path):
        """Test successful file writing."""
        test_file = tmp_path / "output.txt"
        test_content = "Test content"

        result = adk_write_file.func(str(test_file), test_content)
        result_data = json.loads(result)
        
        assert result_data["status"] == "success"
        assert test_file.read_text() == test_content

    def test_adk_list_directory_success(self, tmp_path):
        """Test successful directory listing."""
        # Create test files
        (tmp_path / "file1.txt").write_text("content1")
        (tmp_path / "file2.txt").write_text("content2")
        (tmp_path / "subdir").mkdir()

        result = adk_list_directory.func(str(tmp_path))
        result_data = json.loads(result)
        
        assert result_data["status"] == "success"
        assert len(result_data["files"]) >= 3

    def test_adk_file_exists_true(self, tmp_path):
        """Test file existence check - file exists."""
        test_file = tmp_path / "exists.txt"
        test_file.write_text("content")

        result = adk_file_exists.func(str(test_file))
        result_data = json.loads(result)
        
        assert result_data["exists"] is True

    def test_adk_file_exists_false(self):
        """Test file existence check - file doesn't exist."""
        result = adk_file_exists.func("/nonexistent/file.txt")
        result_data = json.loads(result)
        
        assert result_data["exists"] is False


class TestSystemTools:
    """Test suite for system tools."""

    def test_adk_echo(self):
        """Test echo functionality."""
        test_message = "Hello, Echo!"
        result = adk_echo.func(test_message)
        
        assert result == test_message

    def test_adk_get_health_status(self):
        """Test health status check."""
        result = adk_get_health_status.func()
        result_data = json.loads(result)
        
        assert "status" in result_data
        assert "timestamp" in result_data
        assert "components" in result_data


class TestTaskAnalysisTools:
    """Test suite for task analysis tools."""

    def test_adk_analyze_task(self):
        """Test task analysis."""
        task_description = "Create a Python web application"
        result = adk_analyze_task.func(task_description)
        result_data = json.loads(result)
        
        assert result_data["task"] == task_description
        assert "complexity" in result_data
        assert "estimated_time" in result_data
        assert "required_skills" in result_data

    def test_adk_classify_task(self):
        """Test task classification."""
        task_description = "Debug Python code"
        result = adk_classify_task.func(task_description)
        result_data = json.loads(result)
        
        assert result_data["task"] == task_description
        assert "category" in result_data
        assert "subcategory" in result_data
        assert "confidence" in result_data

    def test_adk_match_capabilities(self):
        """Test capability matching."""
        task_description = "Analyze data with Python"
        result = adk_match_capabilities.func(task_description)
        result_data = json.loads(result)
        
        assert result_data["task"] == task_description
        assert "recommended_agents" in result_data
        assert "capability_scores" in result_data


class TestWorkflowTools:
    """Test suite for workflow management tools."""

    def test_adk_create_workflow(self):
        """Test workflow creation."""
        result = adk_create_workflow.func("Test Workflow", "Test description")
        result_data = json.loads(result)
        
        assert result_data["action"] == "create_workflow"
        assert result_data["workflow_name"] == "Test Workflow"
        assert "workflow_id" in result_data

    @patch('lib._tools.adk_tools.aiohttp')
    def test_adk_start_workflow_success(self, mock_aiohttp):
        """Test successful workflow start."""
        # Mock aiohttp session
        mock_session = AsyncMock()
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"status": "started"})
        mock_session.post.return_value.__aenter__.return_value = mock_response
        mock_aiohttp.ClientSession.return_value.__aenter__.return_value = mock_session

        result = adk_start_workflow.func("test-workflow-123")
        result_data = json.loads(result)
        
        assert result_data["action"] == "start_workflow"
        assert result_data["workflow_id"] == "test-workflow-123"

    def test_adk_start_workflow_missing_aiohttp(self):
        """Test workflow start without aiohttp."""
        with patch('lib._tools.adk_tools.aiohttp', None):
            result = adk_start_workflow.func("test-workflow-123")
            result_data = json.loads(result)
            
            assert "error" in result_data
            assert "aiohttp" in result_data["error"]

    def test_adk_get_workflow_status(self):
        """Test getting workflow status."""
        result = adk_get_workflow_status.func("test-workflow-123")
        result_data = json.loads(result)
        
        assert "workflow_status" in result_data
        assert result_data["workflow_status"]["workflow_id"] == "test-workflow-123"

    def test_adk_list_workflows(self):
        """Test listing workflows."""
        result = adk_list_workflows.func()
        result_data = json.loads(result)
        
        assert "workflows" in result_data
        assert isinstance(result_data["workflows"], list)

    def test_adk_get_workflow_templates(self):
        """Test getting workflow templates."""
        result = adk_get_workflow_templates.func()
        result_data = json.loads(result)
        
        assert "templates" in result_data
        assert isinstance(result_data["templates"], list)


class TestToolsEdgeCases:
    """Test edge cases and error conditions."""

    def test_tools_with_none_inputs(self):
        """Test tools with None inputs."""
        # Test various tools with None inputs
        result = adk_echo.func(None)
        assert result == "None"

        result = adk_read_file.func(None)
        result_data = json.loads(result)
        assert result_data["status"] == "error"

    def test_tools_with_empty_strings(self):
        """Test tools with empty string inputs."""
        result = adk_echo.func("")
        assert result == ""

        result = adk_analyze_task.func("")
        result_data = json.loads(result)
        assert result_data["task"] == ""

    def test_tools_with_special_characters(self):
        """Test tools with special characters."""
        special_text = "Hello, 世界! 🌍 @#$%^&*()"
        result = adk_echo.func(special_text)
        assert result == special_text

    @patch('lib._tools.adk_tools.logger')
    def test_error_logging(self, mock_logger):
        """Test that errors are properly logged."""
        # Force an error in web search
        with patch('lib._tools.adk_tools.requests.get', side_effect=Exception("Test error")):
            adk_web_search.func("test query")
            mock_logger.error.assert_called()


class TestToolsIntegration:
    """Integration tests for tool interactions."""

    def test_file_operations_workflow(self, tmp_path):
        """Test complete file operations workflow."""
        test_file = tmp_path / "workflow_test.txt"
        test_content = "Workflow test content"

        # Check file doesn't exist
        result = adk_file_exists.func(str(test_file))
        result_data = json.loads(result)
        assert result_data["exists"] is False

        # Write file
        result = adk_write_file.func(str(test_file), test_content)
        result_data = json.loads(result)
        assert result_data["status"] == "success"

        # Check file exists
        result = adk_file_exists.func(str(test_file))
        result_data = json.loads(result)
        assert result_data["exists"] is True

        # Read file
        result = adk_read_file.func(str(test_file))
        result_data = json.loads(result)
        assert result_data["status"] == "success"
        assert result_data["content"] == test_content

    def test_task_analysis_workflow(self):
        """Test complete task analysis workflow."""
        task = "Build a machine learning model"

        # Analyze task
        result = adk_analyze_task.func(task)
        analysis = json.loads(result)
        assert analysis["task"] == task

        # Classify task
        result = adk_classify_task.func(task)
        classification = json.loads(result)
        assert classification["task"] == task

        # Match capabilities
        result = adk_match_capabilities.func(task)
        matching = json.loads(result)
        assert matching["task"] == task
