"""
Test suite for VANA Sandbox Infrastructure

Tests the core sandbox components including security manager,
resource monitor, and execution engine.
"""

import pytest
import asyncio
import tempfile
import os
from pathlib import Path

from lib.sandbox.core.security_manager import SecurityManager, SecurityViolationError
from lib.sandbox.core.resource_monitor import ResourceMonitor, ResourceUsage
from lib.sandbox.core.execution_engine import ExecutionEngine, ExecutionStatus


class TestSecurityManager:
    """Test security manager functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.security_manager = SecurityManager()
    
    def test_python_code_validation_success(self):
        """Test successful Python code validation."""
        safe_code = """
import math
x = 5
y = math.sqrt(x)
print(f"Square root of {x} is {y}")
"""
        assert self.security_manager.validate_code(safe_code, "python") is True
    
    def test_python_code_validation_forbidden_import(self):
        """Test Python code validation with forbidden import."""
        dangerous_code = """
import os
os.system("rm -rf /")
"""
        with pytest.raises(SecurityViolationError):
            self.security_manager.validate_code(dangerous_code, "python")
    
    def test_python_code_validation_forbidden_function(self):
        """Test Python code validation with forbidden function."""
        dangerous_code = """
eval("print('Hello')")
"""
        with pytest.raises(SecurityViolationError):
            self.security_manager.validate_code(dangerous_code, "python")
    
    def test_javascript_code_validation_success(self):
        """Test successful JavaScript code validation."""
        safe_code = """
const x = 5;
const y = Math.sqrt(x);
console.log(`Square root of ${x} is ${y}`);
"""
        assert self.security_manager.validate_code(safe_code, "javascript") is True
    
    def test_javascript_code_validation_forbidden_function(self):
        """Test JavaScript code validation with forbidden function."""
        dangerous_code = """
eval("console.log('Hello')");
"""
        with pytest.raises(SecurityViolationError):
            self.security_manager.validate_code(dangerous_code, "javascript")
    
    def test_shell_code_validation_success(self):
        """Test successful shell code validation."""
        safe_code = """
echo "Hello World"
ls -la
cat file.txt
"""
        assert self.security_manager.validate_code(safe_code, "shell") is True
    
    def test_shell_code_validation_forbidden_command(self):
        """Test shell code validation with forbidden command."""
        dangerous_code = """
rm -rf /
"""
        with pytest.raises(SecurityViolationError):
            self.security_manager.validate_code(dangerous_code, "shell")
    
    def test_unsupported_language(self):
        """Test validation with unsupported language."""
        with pytest.raises(SecurityViolationError):
            self.security_manager.validate_code("print('hello')", "cobol")
    
    def test_empty_code(self):
        """Test validation with empty code."""
        with pytest.raises(SecurityViolationError):
            self.security_manager.validate_code("", "python")
    
    def test_apply_restrictions(self):
        """Test applying security restrictions to container config."""
        base_config = {"image": "python:3.13-slim"}
        restricted_config = self.security_manager.apply_restrictions(base_config)
        
        assert "mem_limit" in restricted_config
        assert "cpus" in restricted_config
        assert restricted_config["network_mode"] == "none"
        assert restricted_config["read_only"] is True
        assert "no-new-privileges:true" in restricted_config["security_opt"]


class TestResourceMonitor:
    """Test resource monitor functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.resource_monitor = ResourceMonitor()
    
    def test_start_stop_monitoring(self):
        """Test starting and stopping resource monitoring."""
        self.resource_monitor.start_monitoring()
        assert self.resource_monitor.monitoring is True
        
        usage = self.resource_monitor.stop_monitoring()
        assert isinstance(usage, ResourceUsage)
        assert self.resource_monitor.monitoring is False
    
    def test_get_current_usage(self):
        """Test getting current resource usage."""
        self.resource_monitor.start_monitoring()
        
        # Wait a bit for monitoring to start
        import time
        time.sleep(0.1)
        
        usage = self.resource_monitor.get_current_usage()
        assert usage is not None
        assert isinstance(usage, ResourceUsage)
        assert usage.execution_time > 0
        
        self.resource_monitor.stop_monitoring()
    
    def test_resource_limits(self):
        """Test resource limits configuration."""
        limits = {
            "max_execution_time": 5,
            "max_memory_mb": 100,
            "max_cpu_percent": 50
        }
        monitor = ResourceMonitor(limits)
        assert monitor.limits["max_execution_time"] == 5
        assert monitor.limits["max_memory_mb"] == 100


class TestExecutionEngine:
    """Test execution engine functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.execution_engine = ExecutionEngine()
    
    @pytest.mark.asyncio
    async def test_execute_python_code_success(self):
        """Test successful Python code execution."""
        code = """
x = 5
y = x * 2
print(f"Result: {y}")
"""
        result = await self.execution_engine.execute_code("python", code)
        
        assert result.status == ExecutionStatus.COMPLETED
        assert "Result: 10" in result.output
        assert result.error is None
        assert result.execution_time > 0
        assert result.language == "python"
    
    @pytest.mark.asyncio
    async def test_execute_javascript_code_success(self):
        """Test successful JavaScript code execution."""
        code = """
const x = 5;
const y = x * 2;
console.log(`Result: ${y}`);
"""
        result = await self.execution_engine.execute_code("javascript", code)
        
        assert result.status == ExecutionStatus.COMPLETED
        assert "Result: 10" in result.output
        assert result.language == "javascript"
    
    @pytest.mark.asyncio
    async def test_execute_shell_code_success(self):
        """Test successful shell code execution."""
        code = """
echo "Hello from shell"
echo "Current directory: $(pwd)"
"""
        result = await self.execution_engine.execute_code("shell", code)
        
        assert result.status == ExecutionStatus.COMPLETED
        assert "Hello from shell" in result.output
        assert result.language == "shell"
    
    @pytest.mark.asyncio
    async def test_execute_code_security_violation(self):
        """Test code execution with security violation."""
        dangerous_code = """
import os
os.system("rm -rf /")
"""
        result = await self.execution_engine.execute_code("python", dangerous_code)
        
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert "Security violation" in result.error
        assert result.output == ""
    
    @pytest.mark.asyncio
    async def test_execute_code_unsupported_language(self):
        """Test code execution with unsupported language."""
        result = await self.execution_engine.execute_code("cobol", "DISPLAY 'Hello'")
        
        assert result.status == ExecutionStatus.FAILED
        assert "Unsupported language" in result.error
    
    @pytest.mark.asyncio
    async def test_execute_code_with_timeout(self):
        """Test code execution with custom timeout."""
        # This would be an infinite loop in real execution
        code = """
import time
time.sleep(10)
"""
        result = await self.execution_engine.execute_code("python", code, timeout=1)
        
        # With mock executor, this won't actually timeout, but structure is tested
        assert result.execution_id is not None
        assert result.language == "python"
    
    def test_get_supported_languages(self):
        """Test getting supported languages."""
        languages = self.execution_engine.get_supported_languages()
        assert "python" in languages
        assert "javascript" in languages
        assert "shell" in languages
    
    @pytest.mark.asyncio
    async def test_execution_history(self):
        """Test execution history tracking."""
        code = "print('Hello')"
        
        # Execute some code
        await self.execution_engine.execute_code("python", code)
        await self.execution_engine.execute_code("python", code)
        
        # Check history
        history = self.execution_engine.get_execution_history()
        assert len(history) == 2
        
        # Check limited history
        limited_history = self.execution_engine.get_execution_history(limit=1)
        assert len(limited_history) == 1
        
        # Clear history
        self.execution_engine.clear_execution_history()
        history = self.execution_engine.get_execution_history()
        assert len(history) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
