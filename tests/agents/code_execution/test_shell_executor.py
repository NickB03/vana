"""
Tests for Shell Executor

Comprehensive test suite for the Shell code executor with command validation,
security checks, and safe execution capabilities.
"""

import pytest
import asyncio
from unittest.mock import patch

from lib.executors import ShellExecutor, ExecutionStatus
from lib.executors.shell_executor import SecurityError


class TestShellExecutor:
    """Test suite for Shell Executor."""
    
    @pytest.fixture
    def executor(self):
        """Create a Shell executor instance for testing."""
        return ShellExecutor()
    
    def test_executor_initialization(self, executor):
        """Test that the executor initializes correctly."""
        assert executor.timeout == 30
        assert hasattr(executor, 'forbidden_commands')
        assert hasattr(executor, 'forbidden_patterns')
        assert hasattr(executor, 'safe_commands')
    
    def test_forbidden_commands_configuration(self, executor):
        """Test that forbidden commands are properly configured."""
        forbidden = executor.forbidden_commands
        
        # Check that dangerous commands are forbidden
        assert 'rm' in forbidden
        assert 'sudo' in forbidden
        assert 'chmod' in forbidden
        assert 'kill' in forbidden
        assert 'wget' in forbidden
        assert 'curl' in forbidden
    
    def test_safe_commands_configuration(self, executor):
        """Test that safe commands are properly configured."""
        safe = executor.safe_commands
        
        # Check that safe commands are included
        assert 'echo' in safe
        assert 'cat' in safe
        assert 'grep' in safe
        assert 'ls' in safe
        assert 'pwd' in safe
        assert 'date' in safe
    
    def test_validate_safe_code(self, executor):
        """Test validation of safe shell code."""
        safe_code = """
echo "Hello, World!"
ls -la
pwd
date
"""
        
        assert executor.validate_code(safe_code) is True
    
    def test_validate_forbidden_command_rm(self, executor):
        """Test validation fails for rm command."""
        unsafe_code = "rm -rf /tmp/test"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden command: rm" in str(exc_info.value)
    
    def test_validate_forbidden_command_sudo(self, executor):
        """Test validation fails for sudo command."""
        unsafe_code = "sudo apt-get update"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden command: sudo" in str(exc_info.value)
    
    def test_validate_forbidden_pattern_redirect(self, executor):
        """Test validation fails for dangerous redirects."""
        unsafe_code = "echo 'test' > /dev/sda"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_validate_forbidden_pattern_background(self, executor):
        """Test validation fails for background processes."""
        unsafe_code = "sleep 100 &"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_validate_forbidden_pattern_command_substitution(self, executor):
        """Test validation fails for command substitution."""
        unsafe_code = "echo $(rm -rf /)"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_extract_commands_simple(self, executor):
        """Test command extraction from simple shell code."""
        code = "echo hello; ls -la; pwd"
        commands = executor._extract_commands(code)
        
        assert 'echo' in commands
        assert 'ls' in commands
        assert 'pwd' in commands
    
    def test_extract_commands_with_path(self, executor):
        """Test command extraction removes paths."""
        code = "/bin/echo hello"
        commands = executor._extract_commands(code)
        
        assert 'echo' in commands
        assert '/bin/echo' not in commands
    
    def test_extract_commands_multiline(self, executor):
        """Test command extraction from multiline code."""
        code = """
echo "line 1"
ls -la
pwd
"""
        commands = executor._extract_commands(code)
        
        assert 'echo' in commands
        assert 'ls' in commands
        assert 'pwd' in commands
    
    def test_is_shell_builtin(self, executor):
        """Test shell builtin detection."""
        assert executor._is_shell_builtin('if') is True
        assert executor._is_shell_builtin('for') is True
        assert executor._is_shell_builtin('while') is True
        assert executor._is_shell_builtin('cd') is True
        assert executor._is_shell_builtin('echo') is False  # Not a builtin, but safe command
    
    @pytest.mark.asyncio
    async def test_execute_simple_code(self, executor):
        """Test execution of simple shell code."""
        code = """
echo "Hello, World!"
echo "Current user: $(whoami)"
"""
        
        # Mock the subprocess execution
        mock_result = {
            "output": "Hello, World!\nCurrent user: sandbox\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert result.status == ExecutionStatus.COMPLETED
        assert "Hello, World!" in result.output
        assert "Current user: sandbox" in result.output
        assert result.language == "shell"
    
    @pytest.mark.asyncio
    async def test_execute_text_processing(self, executor):
        """Test execution with text processing commands."""
        code = """
echo "apple,banana,cherry" | cut -d',' -f2
echo "hello world" | tr '[:lower:]' '[:upper:]'
"""
        
        mock_result = {
            "output": "banana\nHELLO WORLD\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "banana" in result.output
        assert "HELLO WORLD" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_file_operations(self, executor):
        """Test execution with safe file operations."""
        code = """
ls -la
pwd
whoami
"""
        
        mock_result = {
            "output": "total 0\ndrwxr-xr-x 2 sandbox sandbox 4096 Jan 1 00:00 .\n/tmp\nsandbox\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "total 0" in result.output
        assert "/tmp" in result.output
        assert "sandbox" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_with_error(self, executor):
        """Test execution with command error."""
        code = """
echo "Before error"
ls /nonexistent/directory
echo "After error"
"""
        
        mock_result = {
            "output": "Before error\nAfter error\n",
            "stderr": "ls: cannot access '/nonexistent/directory': No such file or directory\n",
            "exit_code": 2
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is False
        assert result.status == ExecutionStatus.FAILED
        assert "Before error" in result.output
        assert "No such file or directory" in result.error
        assert result.exit_code == 2
    
    @pytest.mark.asyncio
    async def test_execute_security_violation(self, executor):
        """Test execution fails for security violations."""
        code = "rm -rf /tmp/test"
        
        result = await executor.execute(code)
        
        assert result.success is False
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert "Forbidden command: rm" in result.error
    
    @pytest.mark.asyncio
    async def test_execute_with_timeout(self, executor):
        """Test execution timeout handling."""
        with patch.object(executor, '_execute_with_timeout', 
                         side_effect=TimeoutError("Execution timed out after 1 seconds")):
            result = await executor.execute("echo 'test'", timeout=1)
        
        assert result.success is False
        assert result.status == ExecutionStatus.TIMEOUT
        assert "timed out" in result.error
    
    def test_get_language_info(self, executor):
        """Test getting language information."""
        info = executor.get_language_info()
        
        assert info["name"] == "shell"
        assert "Bash" in info["version"]
        assert "features" in info
        assert "available_commands" in info
        assert "restrictions" in info
        
        # Check specific features
        assert "command_validation" in info["features"]
        assert "safe_utilities" in info["features"]
        
        # Check available commands
        assert "echo" in info["available_commands"]
        assert "grep" in info["available_commands"]
        
        # Check restrictions
        assert "no_file_modification" in info["restrictions"]
        assert "no_network" in info["restrictions"]
    
    @pytest.mark.asyncio
    async def test_execute_math_operations(self, executor):
        """Test execution with math operations."""
        code = """
echo "5 + 3" | bc
expr 10 \\* 2
"""
        
        mock_result = {
            "output": "8\n20\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "8" in result.output
        assert "20" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_string_operations(self, executor):
        """Test execution with string operations."""
        code = """
echo "Hello World" | wc -w
echo "test string" | grep "string"
"""
        
        mock_result = {
            "output": "2\ntest string\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "2" in result.output
        assert "test string" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_conditional_statements(self, executor):
        """Test execution with conditional statements."""
        code = """
if [ "hello" = "hello" ]; then
    echo "Condition is true"
else
    echo "Condition is false"
fi
"""
        
        mock_result = {
            "output": "Condition is true\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "Condition is true" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_loops(self, executor):
        """Test execution with loop statements."""
        code = """
for i in 1 2 3; do
    echo "Number: $i"
done
"""
        
        mock_result = {
            "output": "Number: 1\nNumber: 2\nNumber: 3\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "Number: 1" in result.output
        assert "Number: 2" in result.output
        assert "Number: 3" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_variables(self, executor):
        """Test execution with variable assignments."""
        code = """
NAME="World"
echo "Hello, $NAME!"
COUNT=5
echo "Count is: $COUNT"
"""
        
        mock_result = {
            "output": "Hello, World!\nCount is: 5\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_shell_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "Hello, World!" in result.output
        assert "Count is: 5" in result.output


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
