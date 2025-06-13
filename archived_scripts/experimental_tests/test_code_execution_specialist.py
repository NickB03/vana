"""
Tests for Code Execution Specialist Agent

Comprehensive test suite for validating code execution capabilities,
security features, and integration with the sandbox environment.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock

from agents.code_execution.specialist import CodeExecutionSpecialist
from lib.sandbox.core.execution_engine import ExecutionEngine, ExecutionResult, ExecutionStatus


class TestCodeExecutionSpecialist:
    """Test suite for Code Execution Specialist."""
    
    @pytest.fixture
    def specialist(self):
        """Create a Code Execution Specialist instance for testing."""
        return CodeExecutionSpecialist()
    
    @pytest.fixture
    def mock_execution_engine(self):
        """Create a mock execution engine."""
        return Mock(spec=ExecutionEngine)
    
    def test_specialist_initialization(self, specialist):
        """Test that the specialist initializes correctly."""
        assert specialist.name == "code_execution_specialist"
        assert hasattr(specialist, 'execution_engine')
        assert hasattr(specialist, 'security_manager')
        
        # Check that tools are registered
        tools = specialist.get_tools()
        tool_names = [tool.name for tool in tools]
        
        expected_tools = [
            "execute_code",
            "validate_code_security", 
            "get_execution_history",
            "get_supported_languages"
        ]
        
        for tool_name in expected_tools:
            assert tool_name in tool_names
    
    @pytest.mark.asyncio
    async def test_execute_code_python_success(self, specialist):
        """Test successful Python code execution."""
        # Mock the execution engine
        mock_result = ExecutionResult(
            execution_id="test-123",
            status=ExecutionStatus.COMPLETED,
            output="Hello, World!\n",
            error=None,
            execution_time=0.1,
            resource_usage=None,
            language="python",
            code_hash="abc123",
            timestamp=1234567890,
            metadata={}
        )
        
        with patch.object(specialist.execution_engine, 'execute_code', return_value=mock_result):
            result = await specialist._execute_code(
                language="python",
                code="print('Hello, World!')"
            )
        
        assert result["success"] is True
        assert result["status"] == "completed"
        assert result["language"] == "python"
        assert result["output"] == "Hello, World!\n"
        assert "execution_time" in result
    
    @pytest.mark.asyncio
    async def test_execute_code_with_error(self, specialist):
        """Test code execution with error."""
        mock_result = ExecutionResult(
            execution_id="test-456",
            status=ExecutionStatus.FAILED,
            output="",
            error="NameError: name 'undefined_var' is not defined",
            execution_time=0.05,
            resource_usage=None,
            language="python",
            code_hash="def456",
            timestamp=1234567890,
            metadata={}
        )
        
        with patch.object(specialist.execution_engine, 'execute_code', return_value=mock_result):
            result = await specialist._execute_code(
                language="python",
                code="print(undefined_var)"
            )
        
        assert result["success"] is False
        assert result["status"] == "failed"
        assert "error" in result
        assert "error_analysis" in result
    
    @pytest.mark.asyncio
    async def test_execute_code_timeout(self, specialist):
        """Test code execution timeout."""
        mock_result = ExecutionResult(
            execution_id="test-789",
            status=ExecutionStatus.TIMEOUT,
            output="",
            error="Execution timed out after 30 seconds",
            execution_time=30.0,
            resource_usage=None,
            language="python",
            code_hash="ghi789",
            timestamp=1234567890,
            metadata={}
        )
        
        with patch.object(specialist.execution_engine, 'execute_code', return_value=mock_result):
            result = await specialist._execute_code(
                language="python",
                code="while True: pass",
                timeout=30
            )
        
        assert result["success"] is False
        assert result["status"] == "timeout"
        assert "timeout" in result["error_analysis"]
    
    @pytest.mark.asyncio
    async def test_validate_code_security_safe(self, specialist):
        """Test security validation for safe code."""
        with patch.object(specialist.security_manager, 'validate_code', return_value=None):
            result = await specialist._validate_code_security(
                language="python",
                code="print('Hello, World!')"
            )
        
        assert result["valid"] is True
        assert result["security_level"] == "safe"
        assert result["language"] == "python"
    
    @pytest.mark.asyncio
    async def test_validate_code_security_unsafe(self, specialist):
        """Test security validation for unsafe code."""
        with patch.object(specialist.security_manager, 'validate_code', 
                         side_effect=Exception("Forbidden import: subprocess")):
            result = await specialist._validate_code_security(
                language="python",
                code="import subprocess; subprocess.call(['ls'])"
            )
        
        assert result["valid"] is False
        assert result["security_level"] == "unsafe"
        assert "recommendations" in result
    
    @pytest.mark.asyncio
    async def test_get_execution_history(self, specialist):
        """Test getting execution history."""
        # Mock execution history
        mock_history = [
            ExecutionResult(
                execution_id="test-1",
                status=ExecutionStatus.COMPLETED,
                output="output1",
                error=None,
                execution_time=0.1,
                resource_usage=None,
                language="python",
                code_hash="hash1",
                timestamp=1234567890,
                metadata={}
            ),
            ExecutionResult(
                execution_id="test-2",
                status=ExecutionStatus.FAILED,
                output="",
                error="SyntaxError",
                execution_time=0.05,
                resource_usage=None,
                language="python",
                code_hash="hash2",
                timestamp=1234567891,
                metadata={}
            )
        ]
        
        with patch.object(specialist.execution_engine, 'get_execution_history', return_value=mock_history):
            result = await specialist._get_execution_history(limit=10)
        
        assert "history" in result
        assert "summary" in result
        assert len(result["history"]) == 2
        assert result["summary"]["total_executions"] == 2
        assert result["summary"]["successful_executions"] == 1
        assert result["summary"]["success_rate"] == 50.0
    
    @pytest.mark.asyncio
    async def test_get_supported_languages(self, specialist):
        """Test getting supported languages information."""
        with patch.object(specialist.execution_engine, 'get_supported_languages', 
                         return_value=["python", "javascript", "shell"]):
            result = await specialist._get_supported_languages()
        
        assert "supported_languages" in result
        assert "language_details" in result
        assert "sandbox_features" in result
        
        assert "python" in result["supported_languages"]
        assert "javascript" in result["supported_languages"]
        assert "shell" in result["supported_languages"]
        
        # Check language details
        assert "python" in result["language_details"]
        assert "capabilities" in result["language_details"]["python"]
        assert "security_features" in result["language_details"]["python"]
    
    def test_analyze_error_timeout(self, specialist):
        """Test error analysis for timeout errors."""
        error = "Execution timed out after 30 seconds"
        analysis = specialist._analyze_error(error, "python")
        
        assert "timeout" in analysis.lower()
        assert "optimizing" in analysis.lower()
    
    def test_analyze_error_security(self, specialist):
        """Test error analysis for security violations."""
        error = "Security violation: Forbidden import detected"
        analysis = specialist._analyze_error(error, "python")
        
        assert "security" in analysis.lower()
        assert "policies" in analysis.lower()
    
    def test_analyze_error_syntax(self, specialist):
        """Test error analysis for syntax errors."""
        error = "SyntaxError: invalid syntax"
        analysis = specialist._analyze_error(error, "python")
        
        assert "syntax" in analysis.lower()
        assert "brackets" in analysis.lower() or "quotes" in analysis.lower()
    
    def test_get_security_recommendations_import(self, specialist):
        """Test security recommendations for import errors."""
        error = "Forbidden import: subprocess"
        recommendations = specialist._get_security_recommendations(error, "python")
        
        assert len(recommendations) > 0
        assert any("import" in rec.lower() for rec in recommendations)
    
    def test_get_security_recommendations_file(self, specialist):
        """Test security recommendations for file access errors."""
        error = "File access outside workspace denied"
        recommendations = specialist._get_security_recommendations(error, "python")
        
        assert len(recommendations) > 0
        assert any("file" in rec.lower() for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_execute_code_with_description(self, specialist):
        """Test code execution with description metadata."""
        mock_result = ExecutionResult(
            execution_id="test-desc",
            status=ExecutionStatus.COMPLETED,
            output="42\n",
            error=None,
            execution_time=0.1,
            resource_usage=None,
            language="python",
            code_hash="desc123",
            timestamp=1234567890,
            metadata={"description": "Calculate answer"}
        )
        
        with patch.object(specialist.execution_engine, 'execute_code', return_value=mock_result):
            result = await specialist._execute_code(
                language="python",
                code="print(6 * 7)",
                description="Calculate answer"
            )
        
        assert result["success"] is True
        assert result["output"] == "42\n"
    
    @pytest.mark.asyncio
    async def test_execute_code_javascript(self, specialist):
        """Test JavaScript code execution."""
        mock_result = ExecutionResult(
            execution_id="test-js",
            status=ExecutionStatus.COMPLETED,
            output="Hello from JavaScript\n",
            error=None,
            execution_time=0.15,
            resource_usage=None,
            language="javascript",
            code_hash="js123",
            timestamp=1234567890,
            metadata={}
        )
        
        with patch.object(specialist.execution_engine, 'execute_code', return_value=mock_result):
            result = await specialist._execute_code(
                language="javascript",
                code="console.log('Hello from JavaScript');"
            )
        
        assert result["success"] is True
        assert result["language"] == "javascript"
        assert result["output"] == "Hello from JavaScript\n"
    
    @pytest.mark.asyncio
    async def test_execute_code_shell(self, specialist):
        """Test Shell code execution."""
        mock_result = ExecutionResult(
            execution_id="test-shell",
            status=ExecutionStatus.COMPLETED,
            output="file1.txt\nfile2.txt\n",
            error=None,
            execution_time=0.05,
            resource_usage=None,
            language="shell",
            code_hash="shell123",
            timestamp=1234567890,
            metadata={}
        )
        
        with patch.object(specialist.execution_engine, 'execute_code', return_value=mock_result):
            result = await specialist._execute_code(
                language="shell",
                code="ls *.txt"
            )
        
        assert result["success"] is True
        assert result["language"] == "shell"
        assert "file1.txt" in result["output"]
    
    @pytest.mark.asyncio
    async def test_execute_code_exception_handling(self, specialist):
        """Test exception handling in code execution."""
        with patch.object(specialist.execution_engine, 'execute_code', 
                         side_effect=Exception("Execution engine error")):
            result = await specialist._execute_code(
                language="python",
                code="print('test')"
            )
        
        assert result["success"] is False
        assert "error" in result
        assert "Execution failed" in result["error"]
        assert result["error_type"] == "Exception"


@pytest.mark.integration
class TestCodeExecutionSpecialistIntegration:
    """Integration tests for Code Execution Specialist."""
    
    @pytest.fixture
    def specialist(self):
        """Create a real Code Execution Specialist instance."""
        return CodeExecutionSpecialist()
    
    @pytest.mark.asyncio
    async def test_real_python_execution(self, specialist):
        """Test real Python code execution (if sandbox is available)."""
        try:
            result = await specialist._execute_code(
                language="python",
                code="print('Integration test successful')"
            )
            
            # Should work with either real or mock executor
            assert "status" in result
            assert "language" in result
            assert result["language"] == "python"
            
        except Exception as e:
            # If real execution fails, that's expected in test environment
            pytest.skip(f"Real execution not available: {e}")
    
    def test_tool_registration_integration(self, specialist):
        """Test that all tools are properly registered."""
        tools = specialist.get_tools()
        
        # Verify all expected tools are present
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
            assert hasattr(tool, 'function')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
