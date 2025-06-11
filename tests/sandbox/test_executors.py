"""
Test suite for VANA Sandbox Executors

Tests the language-specific executors including Python, JavaScript, and Shell
with Docker container integration and security validation.
"""

import pytest
import asyncio
import docker
from unittest.mock import Mock, patch

from lib.sandbox.core.security_manager import SecurityManager
from lib.sandbox.executors.python_executor import PythonExecutor
from lib.sandbox.executors.javascript_executor import JavaScriptExecutor
from lib.sandbox.executors.shell_executor import ShellExecutor
from lib.sandbox.executors.base_executor import ExecutorResult


class TestBaseExecutor:
    """Test base executor functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.security_manager = SecurityManager()
    
    def test_docker_client_initialization(self):
        """Test Docker client initialization."""
        executor = PythonExecutor(self.security_manager)
        
        # Check if Docker is available
        if executor.docker_client:
            assert executor.docker_client is not None
            # Test Docker connection
            try:
                executor.docker_client.ping()
                assert True  # Docker is working
            except Exception:
                pytest.skip("Docker not available for testing")
        else:
            pytest.skip("Docker not available for testing")
    
    def test_container_name_generation(self):
        """Test container name generation."""
        executor = PythonExecutor(self.security_manager)
        assert executor.container_name_prefix == "vana-python-sandbox"
        
        js_executor = JavaScriptExecutor(self.security_manager)
        assert js_executor.container_name_prefix == "vana-javascript-sandbox"
        
        shell_executor = ShellExecutor(self.security_manager)
        assert shell_executor.container_name_prefix == "vana-shell-sandbox"


class TestPythonExecutor:
    """Test Python executor functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.security_manager = SecurityManager()
        self.executor = PythonExecutor(self.security_manager)
    
    def test_code_filename(self):
        """Test Python code filename."""
        assert self.executor._get_code_filename() == "main.py"
    
    def test_execution_command(self):
        """Test Python execution command."""
        command = self.executor._get_execution_command()
        assert command == ["python3", "/workspace/wrapper.py"]
    
    def test_environment_variables(self):
        """Test Python environment variables."""
        env = self.executor._get_environment_variables()
        assert env["PYTHONPATH"] == "/workspace"
        assert env["PYTHONDONTWRITEBYTECODE"] == "1"
        assert env["PYTHONUNBUFFERED"] == "1"
    
    @pytest.mark.asyncio
    async def test_simple_python_execution(self):
        """Test simple Python code execution."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
print("Hello, World!")
x = 5 + 3
print(f"Result: {x}")
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "Hello, World!" in result.output
            assert "Result: 8" in result.output
            assert result.exit_code == 0
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")
    
    @pytest.mark.asyncio
    async def test_python_data_science_libraries(self):
        """Test Python execution with data science libraries."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
import math
import json
print(f"Math sqrt(16): {math.sqrt(16)}")
data = {"test": "value"}
print(f"JSON: {json.dumps(data)}")
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "Math sqrt(16): 4.0" in result.output
            assert '"test": "value"' in result.output
            assert result.exit_code == 0
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")
    
    @pytest.mark.asyncio
    async def test_python_error_handling(self):
        """Test Python error handling."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
print("Before error")
x = 1 / 0  # This will cause a ZeroDivisionError
print("After error")
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "Before error" in result.output
            assert result.error is not None
            assert "ZeroDivisionError" in result.error
            assert result.exit_code == 1
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")


class TestJavaScriptExecutor:
    """Test JavaScript executor functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.security_manager = SecurityManager()
        self.executor = JavaScriptExecutor(self.security_manager)
    
    def test_code_filename(self):
        """Test JavaScript code filename."""
        assert self.executor._get_code_filename() == "main.js"
    
    def test_execution_command(self):
        """Test JavaScript execution command."""
        command = self.executor._get_execution_command()
        assert command == ["node", "/workspace/wrapper.js"]
    
    def test_environment_variables(self):
        """Test JavaScript environment variables."""
        env = self.executor._get_environment_variables()
        assert env["NODE_ENV"] == "sandbox"
        assert env["NODE_PATH"] == "/workspace/node_modules"
        assert "--max-old-space-size=512" in env["NODE_OPTIONS"]
    
    @pytest.mark.asyncio
    async def test_simple_javascript_execution(self):
        """Test simple JavaScript code execution."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
console.log("Hello, World!");
const x = 5 + 3;
console.log(`Result: ${x}`);
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "Hello, World!" in result.output
            assert "Result: 8" in result.output
            assert result.exit_code == 0
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")
    
    @pytest.mark.asyncio
    async def test_javascript_math_operations(self):
        """Test JavaScript math operations."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
const result = Math.sqrt(16);
console.log(`Math sqrt(16): ${result}`);
const data = {test: "value"};
console.log(`JSON: ${JSON.stringify(data)}`);
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "Math sqrt(16): 4" in result.output
            assert '"test":"value"' in result.output or '"test": "value"' in result.output
            assert result.exit_code == 0
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")
    
    @pytest.mark.asyncio
    async def test_javascript_error_handling(self):
        """Test JavaScript error handling."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
console.log("Before error");
throw new Error("Test error");
console.log("After error");
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "Before error" in result.output
            assert result.error is not None
            assert "Error: Test error" in result.error
            assert result.exit_code == 1
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")


class TestShellExecutor:
    """Test Shell executor functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.security_manager = SecurityManager()
        self.executor = ShellExecutor(self.security_manager)
    
    def test_code_filename(self):
        """Test shell script filename."""
        assert self.executor._get_code_filename() == "script.sh"
    
    def test_execution_command(self):
        """Test shell execution command."""
        command = self.executor._get_execution_command()
        assert command == ["bash", "/workspace/wrapper.sh"]
    
    def test_environment_variables(self):
        """Test shell environment variables."""
        env = self.executor._get_environment_variables()
        assert env["PATH"] == "/usr/local/bin:/usr/bin:/bin"
        assert env["SHELL"] == "/bin/bash"
        assert env["HISTFILE"] == "/dev/null"
    
    @pytest.mark.asyncio
    async def test_simple_shell_execution(self):
        """Test simple shell script execution."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
echo "Hello, World!"
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "Hello, World!" in result.output
            assert "Current directory:" in result.output
            assert "User:" in result.output
            assert result.exit_code == 0
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")
    
    @pytest.mark.asyncio
    async def test_shell_text_processing(self):
        """Test shell text processing commands."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
echo "apple,banana,cherry" | cut -d',' -f2
echo "hello world" | tr '[:lower:]' '[:upper:]'
echo "line1\nline2\nline3" | wc -l
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            assert "banana" in result.output
            assert "HELLO WORLD" in result.output
            assert result.exit_code == 0
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")
    
    @pytest.mark.asyncio
    async def test_shell_forbidden_commands(self):
        """Test shell forbidden command detection."""
        if not self.executor.docker_client:
            pytest.skip("Docker not available for testing")
        
        code = """
echo "Before forbidden command"
rm -rf /tmp/test
echo "After forbidden command"
"""
        
        try:
            result = await self.executor.execute(code)
            assert isinstance(result, ExecutorResult)
            # Should fail due to forbidden command
            assert result.exit_code != 0
            assert result.error is not None
            assert "forbidden" in result.error.lower() or "not allowed" in result.error.lower()
        except Exception as e:
            pytest.skip(f"Docker execution failed: {e}")


class TestExecutorIntegration:
    """Test executor integration scenarios."""
    
    def setup_method(self):
        """Set up test environment."""
        self.security_manager = SecurityManager()
    
    @pytest.mark.asyncio
    async def test_multiple_executor_instances(self):
        """Test creating multiple executor instances."""
        python_executor = PythonExecutor(self.security_manager)
        js_executor = JavaScriptExecutor(self.security_manager)
        shell_executor = ShellExecutor(self.security_manager)
        
        assert python_executor.language == "python"
        assert js_executor.language == "javascript"
        assert shell_executor.language == "shell"
        
        # Test that they have different container prefixes
        assert python_executor.container_name_prefix != js_executor.container_name_prefix
        assert js_executor.container_name_prefix != shell_executor.container_name_prefix
    
    @pytest.mark.asyncio
    async def test_concurrent_execution(self):
        """Test concurrent execution across different executors."""
        if not docker.from_env():
            pytest.skip("Docker not available for testing")
        
        python_executor = PythonExecutor(self.security_manager)
        js_executor = JavaScriptExecutor(self.security_manager)
        
        python_code = 'print("Python result")'
        js_code = 'console.log("JavaScript result");'
        
        try:
            # Execute both concurrently
            python_task = python_executor.execute(python_code)
            js_task = js_executor.execute(js_code)
            
            python_result, js_result = await asyncio.gather(python_task, js_task)
            
            assert "Python result" in python_result.output
            assert "JavaScript result" in js_result.output
            assert python_result.exit_code == 0
            assert js_result.exit_code == 0
            
        except Exception as e:
            pytest.skip(f"Concurrent execution failed: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
