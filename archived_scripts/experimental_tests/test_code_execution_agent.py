"""
Tests for Code Execution Agent

Comprehensive test suite for validating the new Code Execution Agent
with Tool-based architecture and executor integration.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock

from agents.code_execution.specialist import (
    CodeExecutionAgent, 
    ExecuteCodeTool, 
    ValidateCodeSecurityTool,
    GetExecutionHistoryTool,
    GetSupportedLanguagesTool
)
from lib.executors import ExecutionResult, ExecutionStatus


class TestCodeExecutionAgent:
    """Test suite for Code Execution Agent."""
    
    @pytest.fixture
    def agent(self):
        """Create a Code Execution Agent instance for testing."""
        return CodeExecutionAgent()
    
    def test_agent_initialization(self, agent):
        """Test that the agent initializes correctly."""
        assert agent.name == "code_execution"
        assert "secure multi-language code execution" in agent.description
        
        # Check that tools are registered
        tools = agent.tools
        tool_names = [tool.name for tool in tools]
        
        expected_tools = [
            "execute_code",
            "validate_code_security", 
            "get_execution_history",
            "get_supported_languages"
        ]
        
        for tool_name in expected_tools:
            assert tool_name in tool_names
    
    def test_system_prompt(self, agent):
        """Test that the system prompt is properly defined."""
        prompt = agent.get_system_prompt()
        assert "Code Execution Specialist" in prompt
        assert "Python, JavaScript, and Shell" in prompt
        assert "security" in prompt.lower()


class TestExecuteCodeTool:
    """Test suite for Execute Code Tool."""
    
    @pytest.fixture
    def tool(self):
        """Create an Execute Code Tool instance for testing."""
        return ExecuteCodeTool()
    
    def test_tool_initialization(self, tool):
        """Test that the tool initializes correctly."""
        assert tool.name == "execute_code"
        assert "Execute Python, JavaScript, or Shell code securely" in tool.description
        assert "code" in tool.parameters
        assert "language" in tool.parameters
        assert "timeout" in tool.parameters
    
    @pytest.mark.asyncio
    async def test_execute_python_success(self, tool):
        """Test successful Python code execution."""
        # Mock the Python executor
        mock_result = ExecutionResult(
            output="Hello, World!\n",
            error=None,
            exit_code=0,
            execution_time=0.1,
            memory_usage=1024,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="python",
            metadata={}
        )
        
        with patch.object(tool.executors["python"], 'execute', return_value=mock_result):
            result = await tool.execute(
                code="print('Hello, World!')",
                language="python"
            )
        
        assert result["success"] is True
        assert result["language"] == "python"
        assert result["output"] == "Hello, World!\n"
        assert result["execution_time"] == 0.1
    
    @pytest.mark.asyncio
    async def test_execute_javascript_success(self, tool):
        """Test successful JavaScript code execution."""
        mock_result = ExecutionResult(
            output="Hello from JavaScript\n",
            error=None,
            exit_code=0,
            execution_time=0.15,
            memory_usage=2048,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="javascript",
            metadata={}
        )
        
        with patch.object(tool.executors["javascript"], 'execute', return_value=mock_result):
            result = await tool.execute(
                code="console.log('Hello from JavaScript');",
                language="javascript"
            )
        
        assert result["success"] is True
        assert result["language"] == "javascript"
        assert result["output"] == "Hello from JavaScript\n"
    
    @pytest.mark.asyncio
    async def test_execute_shell_success(self, tool):
        """Test successful Shell code execution."""
        mock_result = ExecutionResult(
            output="file1.txt\nfile2.txt\n",
            error=None,
            exit_code=0,
            execution_time=0.05,
            memory_usage=512,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="shell",
            metadata={}
        )
        
        with patch.object(tool.executors["shell"], 'execute', return_value=mock_result):
            result = await tool.execute(
                code="ls *.txt",
                language="shell"
            )
        
        assert result["success"] is True
        assert result["language"] == "shell"
        assert "file1.txt" in result["output"]
    
    @pytest.mark.asyncio
    async def test_execute_with_error(self, tool):
        """Test code execution with error."""
        mock_result = ExecutionResult(
            output="",
            error="NameError: name 'undefined_var' is not defined",
            exit_code=1,
            execution_time=0.05,
            memory_usage=1024,
            success=False,
            status=ExecutionStatus.FAILED,
            language="python",
            metadata={}
        )
        
        with patch.object(tool.executors["python"], 'execute', return_value=mock_result):
            result = await tool.execute(
                code="print(undefined_var)",
                language="python"
            )
        
        assert result["success"] is False
        assert result["error"] == "NameError: name 'undefined_var' is not defined"
        assert result["exit_code"] == 1
    
    @pytest.mark.asyncio
    async def test_execute_timeout(self, tool):
        """Test code execution timeout."""
        mock_result = ExecutionResult(
            output="",
            error="Execution timed out after 30 seconds",
            exit_code=1,
            execution_time=30.0,
            memory_usage=1024,
            success=False,
            status=ExecutionStatus.TIMEOUT,
            language="python",
            metadata={}
        )
        
        with patch.object(tool.executors["python"], 'execute', return_value=mock_result):
            result = await tool.execute(
                code="while True: pass",
                language="python",
                timeout=30
            )
        
        assert result["success"] is False
        assert result["status"] == "timeout"
        assert "timeout" in result["error"]
    
    @pytest.mark.asyncio
    async def test_unsupported_language(self, tool):
        """Test execution with unsupported language."""
        result = await tool.execute(
            code="print('test')",
            language="unsupported"
        )
        
        assert "error" in result
        assert "Unsupported language" in result["error"]
    
    @pytest.mark.asyncio
    async def test_execute_exception_handling(self, tool):
        """Test exception handling in code execution."""
        with patch.object(tool.executors["python"], 'execute', 
                         side_effect=Exception("Executor error")):
            result = await tool.execute(
                code="print('test')",
                language="python"
            )
        
        assert result["success"] is False
        assert "error" in result
        assert "Executor error" in result["error"]


class TestValidateCodeSecurityTool:
    """Test suite for Validate Code Security Tool."""
    
    @pytest.fixture
    def tool(self):
        """Create a Validate Code Security Tool instance for testing."""
        return ValidateCodeSecurityTool()
    
    def test_tool_initialization(self, tool):
        """Test that the tool initializes correctly."""
        assert tool.name == "validate_code_security"
        assert "security risks" in tool.description
        assert "code" in tool.parameters
        assert "language" in tool.parameters
    
    @pytest.mark.asyncio
    async def test_validate_safe_code(self, tool):
        """Test security validation for safe code."""
        with patch.object(tool.executors["python"], 'validate_code', return_value=True):
            result = await tool.execute(
                code="print('Hello, World!')",
                language="python"
            )
        
        assert result["is_safe"] is True
        assert result["risk_level"] == "low"
        assert len(result["violations"]) == 0
    
    @pytest.mark.asyncio
    async def test_validate_unsafe_code(self, tool):
        """Test security validation for unsafe code."""
        from lib.executors.python_executor import SecurityError
        
        with patch.object(tool.executors["python"], 'validate_code', 
                         side_effect=SecurityError("Forbidden import: subprocess")):
            result = await tool.execute(
                code="import subprocess; subprocess.call(['ls'])",
                language="python"
            )
        
        assert result["is_safe"] is False
        assert result["risk_level"] == "high"
        assert len(result["violations"]) > 0
        assert len(result["recommendations"]) > 0
    
    @pytest.mark.asyncio
    async def test_unsupported_language_validation(self, tool):
        """Test validation with unsupported language."""
        result = await tool.execute(
            code="print('test')",
            language="unsupported"
        )
        
        assert "error" in result
        assert "Unsupported language" in result["error"]


class TestGetExecutionHistoryTool:
    """Test suite for Get Execution History Tool."""
    
    @pytest.fixture
    def tool(self):
        """Create a Get Execution History Tool instance for testing."""
        return GetExecutionHistoryTool()
    
    def test_tool_initialization(self, tool):
        """Test that the tool initializes correctly."""
        assert tool.name == "get_execution_history"
        assert "execution history" in tool.description
        assert "limit" in tool.parameters
    
    @pytest.mark.asyncio
    async def test_empty_history(self, tool):
        """Test getting history when no executions have occurred."""
        result = await tool.execute(limit=10)
        
        assert "history" in result
        assert "summary" in result
        assert result["summary"]["total_executions"] == 0
        assert result["summary"]["success_rate"] == 0.0
    
    @pytest.mark.asyncio
    async def test_history_with_data(self, tool):
        """Test getting history with mock data."""
        # Add some mock history
        tool.execution_history = [
            {"success": True, "language": "python", "execution_time": 0.1},
            {"success": False, "language": "javascript", "execution_time": 0.2},
            {"success": True, "language": "shell", "execution_time": 0.05}
        ]
        
        result = await tool.execute(limit=5)
        
        assert "history" in result
        assert "summary" in result
        assert result["summary"]["total_executions"] == 3
        assert result["summary"]["successful_executions"] == 2
        assert result["summary"]["success_rate"] == 66.7


class TestGetSupportedLanguagesTool:
    """Test suite for Get Supported Languages Tool."""
    
    @pytest.fixture
    def tool(self):
        """Create a Get Supported Languages Tool instance for testing."""
        return GetSupportedLanguagesTool()
    
    def test_tool_initialization(self, tool):
        """Test that the tool initializes correctly."""
        assert tool.name == "get_supported_languages"
        assert "supported programming languages" in tool.description
    
    @pytest.mark.asyncio
    async def test_get_languages_info(self, tool):
        """Test getting supported languages information."""
        result = await tool.execute()
        
        assert "supported_languages" in result
        assert "language_details" in result
        assert "sandbox_features" in result
        
        # Check that all expected languages are present
        expected_languages = ["python", "javascript", "shell"]
        for lang in expected_languages:
            assert lang in result["supported_languages"]
            assert lang in result["language_details"]
        
        # Check language details structure
        for lang, details in result["language_details"].items():
            assert "name" in details
            assert "version" in details
            assert "features" in details
            assert "restrictions" in details


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
