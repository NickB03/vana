"""
Integration Tests for Code Execution Agent

End-to-end integration tests that validate the complete Code Execution Agent
system including agent-tool interactions and executor integrations.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock

from agents.code_execution.specialist import CodeExecutionAgent
from lib.executors import ExecutionResult, ExecutionStatus


class TestCodeExecutionIntegration:
    """Integration tests for the complete Code Execution Agent system."""
    
    @pytest.fixture
    def agent(self):
        """Create a Code Execution Agent instance for testing."""
        return CodeExecutionAgent()
    
    def test_agent_tool_registration(self, agent):
        """Test that all tools are properly registered with the agent."""
        tools = agent.tools
        tool_names = {tool.name for tool in tools}
        
        expected_tools = {
            "execute_code",
            "validate_code_security",
            "get_execution_history",
            "get_supported_languages"
        }
        
        assert expected_tools.issubset(tool_names)
        
        # Verify tool parameters are properly defined
        for tool in tools:
            assert hasattr(tool, 'name')
            assert hasattr(tool, 'description')
            assert hasattr(tool, 'parameters')
            assert hasattr(tool, 'execute')
    
    @pytest.mark.asyncio
    async def test_end_to_end_python_execution(self, agent):
        """Test end-to-end Python code execution through the agent."""
        # Get the execute_code tool
        execute_tool = None
        for tool in agent.tools:
            if tool.name == "execute_code":
                execute_tool = tool
                break
        
        assert execute_tool is not None
        
        # Mock successful execution
        mock_result = ExecutionResult(
            output="Hello from Python!\n42\n",
            error=None,
            exit_code=0,
            execution_time=0.1,
            memory_usage=1024,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="python",
            metadata={}
        )
        
        with patch.object(execute_tool.executors["python"], 'execute', return_value=mock_result):
            result = await execute_tool.execute(
                code="print('Hello from Python!')\nprint(6 * 7)",
                language="python"
            )
        
        assert result["success"] is True
        assert result["language"] == "python"
        assert "Hello from Python!" in result["output"]
        assert "42" in result["output"]
    
    @pytest.mark.asyncio
    async def test_end_to_end_javascript_execution(self, agent):
        """Test end-to-end JavaScript code execution through the agent."""
        execute_tool = None
        for tool in agent.tools:
            if tool.name == "execute_code":
                execute_tool = tool
                break
        
        mock_result = ExecutionResult(
            output="Hello from JavaScript!\n42\n",
            error=None,
            exit_code=0,
            execution_time=0.15,
            memory_usage=2048,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="javascript",
            metadata={}
        )
        
        with patch.object(execute_tool.executors["javascript"], 'execute', return_value=mock_result):
            result = await execute_tool.execute(
                code="console.log('Hello from JavaScript!');\nconsole.log(6 * 7);",
                language="javascript"
            )
        
        assert result["success"] is True
        assert result["language"] == "javascript"
        assert "Hello from JavaScript!" in result["output"]
        assert "42" in result["output"]
    
    @pytest.mark.asyncio
    async def test_end_to_end_shell_execution(self, agent):
        """Test end-to-end Shell code execution through the agent."""
        execute_tool = None
        for tool in agent.tools:
            if tool.name == "execute_code":
                execute_tool = tool
                break
        
        mock_result = ExecutionResult(
            output="Hello from Shell!\n/tmp\n",
            error=None,
            exit_code=0,
            execution_time=0.05,
            memory_usage=512,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="shell",
            metadata={}
        )
        
        with patch.object(execute_tool.executors["shell"], 'execute', return_value=mock_result):
            result = await execute_tool.execute(
                code="echo 'Hello from Shell!'\npwd",
                language="shell"
            )
        
        assert result["success"] is True
        assert result["language"] == "shell"
        assert "Hello from Shell!" in result["output"]
        assert "/tmp" in result["output"]
    
    @pytest.mark.asyncio
    async def test_security_validation_integration(self, agent):
        """Test security validation integration across all languages."""
        validate_tool = None
        for tool in agent.tools:
            if tool.name == "validate_code_security":
                validate_tool = tool
                break
        
        assert validate_tool is not None
        
        # Test Python security validation
        with patch.object(validate_tool.executors["python"], 'validate_code', return_value=True):
            result = await validate_tool.execute(
                code="print('Hello, World!')",
                language="python"
            )
        
        assert result["is_safe"] is True
        assert result["risk_level"] == "low"
        
        # Test JavaScript security validation
        with patch.object(validate_tool.executors["javascript"], 'validate_code', return_value=True):
            result = await validate_tool.execute(
                code="console.log('Hello, World!');",
                language="javascript"
            )
        
        assert result["is_safe"] is True
        assert result["risk_level"] == "low"
        
        # Test Shell security validation
        with patch.object(validate_tool.executors["shell"], 'validate_code', return_value=True):
            result = await validate_tool.execute(
                code="echo 'Hello, World!'",
                language="shell"
            )
        
        assert result["is_safe"] is True
        assert result["risk_level"] == "low"
    
    @pytest.mark.asyncio
    async def test_execution_history_integration(self, agent):
        """Test execution history integration."""
        history_tool = None
        for tool in agent.tools:
            if tool.name == "get_execution_history":
                history_tool = tool
                break
        
        assert history_tool is not None
        
        # Test empty history
        result = await history_tool.execute(limit=10)
        
        assert "history" in result
        assert "summary" in result
        assert result["summary"]["total_executions"] == 0
        
        # Add some mock history and test again
        history_tool.execution_history = [
            {"success": True, "language": "python", "execution_time": 0.1},
            {"success": False, "language": "javascript", "execution_time": 0.2},
            {"success": True, "language": "shell", "execution_time": 0.05}
        ]
        
        result = await history_tool.execute(limit=5)
        
        assert result["summary"]["total_executions"] == 3
        assert result["summary"]["successful_executions"] == 2
        assert result["summary"]["success_rate"] == 66.7
    
    @pytest.mark.asyncio
    async def test_supported_languages_integration(self, agent):
        """Test supported languages integration."""
        languages_tool = None
        for tool in agent.tools:
            if tool.name == "get_supported_languages":
                languages_tool = tool
                break
        
        assert languages_tool is not None
        
        result = await languages_tool.execute()
        
        assert "supported_languages" in result
        assert "language_details" in result
        assert "sandbox_features" in result
        
        # Check all expected languages are present
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
    
    @pytest.mark.asyncio
    async def test_error_handling_integration(self, agent):
        """Test error handling across the entire system."""
        execute_tool = None
        for tool in agent.tools:
            if tool.name == "execute_code":
                execute_tool = tool
                break
        
        # Test execution error
        mock_result = ExecutionResult(
            output="",
            error="SyntaxError: invalid syntax",
            exit_code=1,
            execution_time=0.05,
            memory_usage=1024,
            success=False,
            status=ExecutionStatus.FAILED,
            language="python",
            metadata={}
        )
        
        with patch.object(execute_tool.executors["python"], 'execute', return_value=mock_result):
            result = await execute_tool.execute(
                code="print('unclosed string",
                language="python"
            )
        
        assert result["success"] is False
        assert result["status"] == "failed"
        assert "SyntaxError" in result["error"]
    
    @pytest.mark.asyncio
    async def test_timeout_handling_integration(self, agent):
        """Test timeout handling across the system."""
        execute_tool = None
        for tool in agent.tools:
            if tool.name == "execute_code":
                execute_tool = tool
                break
        
        # Test timeout scenario
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
        
        with patch.object(execute_tool.executors["python"], 'execute', return_value=mock_result):
            result = await execute_tool.execute(
                code="while True: pass",
                language="python",
                timeout=30
            )
        
        assert result["success"] is False
        assert result["status"] == "timeout"
        assert "timed out" in result["error"]
    
    @pytest.mark.asyncio
    async def test_concurrent_execution_integration(self, agent):
        """Test concurrent execution of multiple code snippets."""
        execute_tool = None
        for tool in agent.tools:
            if tool.name == "execute_code":
                execute_tool = tool
                break
        
        # Mock results for different languages
        python_result = ExecutionResult(
            output="Python result\n",
            error=None,
            exit_code=0,
            execution_time=0.1,
            memory_usage=1024,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="python",
            metadata={}
        )
        
        javascript_result = ExecutionResult(
            output="JavaScript result\n",
            error=None,
            exit_code=0,
            execution_time=0.15,
            memory_usage=2048,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="javascript",
            metadata={}
        )
        
        shell_result = ExecutionResult(
            output="Shell result\n",
            error=None,
            exit_code=0,
            execution_time=0.05,
            memory_usage=512,
            success=True,
            status=ExecutionStatus.COMPLETED,
            language="shell",
            metadata={}
        )
        
        # Patch all executors
        with patch.object(execute_tool.executors["python"], 'execute', return_value=python_result), \
             patch.object(execute_tool.executors["javascript"], 'execute', return_value=javascript_result), \
             patch.object(execute_tool.executors["shell"], 'execute', return_value=shell_result):
            
            # Execute concurrently
            tasks = [
                execute_tool.execute("print('Python')", "python"),
                execute_tool.execute("console.log('JavaScript');", "javascript"),
                execute_tool.execute("echo 'Shell'", "shell")
            ]
            
            results = await asyncio.gather(*tasks)
            
            # Verify all executions succeeded
            assert len(results) == 3
            for result in results:
                assert result["success"] is True
            
            # Verify language-specific results
            assert "Python result" in results[0]["output"]
            assert "JavaScript result" in results[1]["output"]
            assert "Shell result" in results[2]["output"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
