"""
Tests for ExecutionEngine - Multi-language orchestration and execution coordination.
"""

import pytest
import tempfile
import os
from unittest.mock import Mock, patch

from lib.sandbox.core.execution_engine import (
    ExecutionEngine, ExecutionResult, ExecutionStatus, ExecutionContext,
    Language, Environment, ExecutionRecord
)
from lib.sandbox.core.security_manager import SecurityManager, RiskLevel
from lib.sandbox.core.resource_monitor import ResourceMonitor


class TestExecutionEngine:
    """Test cases for ExecutionEngine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.security_manager = SecurityManager()
        self.resource_monitor = ResourceMonitor()
        self.execution_engine = ExecutionEngine(self.security_manager, self.resource_monitor)
    
    def teardown_method(self):
        """Clean up after tests."""
        # Clean up any active environments
        for env_id in list(self.execution_engine.active_environments.keys()):
            self.execution_engine.cleanup_environment(env_id)
        
        # Stop resource monitoring
        self.resource_monitor.stop_all_monitoring()
    
    def test_init_with_components(self):
        """Test ExecutionEngine initialization with provided components."""
        ee = ExecutionEngine(self.security_manager, self.resource_monitor)
        
        assert ee.security_manager is self.security_manager
        assert ee.resource_monitor is self.resource_monitor
        assert ee.execution_history == []
        assert ee.active_environments == {}
        assert ee._execution_count == 0
    
    def test_init_with_default_components(self):
        """Test ExecutionEngine initialization with default components."""
        ee = ExecutionEngine()
        
        assert isinstance(ee.security_manager, SecurityManager)
        assert isinstance(ee.resource_monitor, ResourceMonitor)
    
    def test_execute_code_python_safe(self):
        """Test executing safe Python code."""
        safe_code = """
x = 5
y = 10
result = x + y
print(f"Result: {result}")
"""
        
        result = self.execution_engine.execute_code(safe_code, "python")
        
        assert isinstance(result, ExecutionResult)
        assert result.status == ExecutionStatus.SUCCESS
        assert result.session_id is not None
        assert result.execution_time >= 0
        assert result.security_result is not None
        assert result.security_result.is_safe is True
    
    def test_execute_code_python_unsafe(self):
        """Test executing unsafe Python code."""
        unsafe_code = """
import os
os.system("rm -rf /")
"""
        
        result = self.execution_engine.execute_code(unsafe_code, "python")
        
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert result.security_result is not None
        assert result.security_result.is_safe is False
        assert "Security violation" in result.error
    
    def test_execute_code_javascript_safe(self):
        """Test executing safe JavaScript code."""
        safe_code = """
const x = 5;
const y = 10;
const result = x + y;
console.log(`Result: ${result}`);
"""
        
        result = self.execution_engine.execute_code(safe_code, "javascript")
        
        assert result.status == ExecutionStatus.SUCCESS
        assert result.session_id is not None
        assert result.security_result.is_safe is True
    
    def test_execute_code_javascript_unsafe(self):
        """Test executing unsafe JavaScript code."""
        unsafe_code = """
const fs = require('fs');
fs.unlinkSync('/important/file');
"""
        
        result = self.execution_engine.execute_code(unsafe_code, "javascript")
        
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert result.security_result.is_safe is False
    
    def test_execute_code_shell_safe(self):
        """Test executing safe shell commands."""
        safe_code = "echo 'Hello World'"
        
        result = self.execution_engine.execute_code(safe_code, "shell")
        
        assert result.status == ExecutionStatus.SUCCESS
        assert result.session_id is not None
    
    def test_execute_code_shell_unsafe(self):
        """Test executing unsafe shell commands."""
        unsafe_code = "rm -rf /"
        
        result = self.execution_engine.execute_code(unsafe_code, "shell")
        
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert result.security_result.is_safe is False
    
    def test_execute_code_unsupported_language(self):
        """Test executing code in unsupported language."""
        code = "some code"
        
        result = self.execution_engine.execute_code(code, "unsupported")
        
        assert result.status == ExecutionStatus.ERROR
        assert "Unsupported language" in result.error
    
    def test_execute_code_with_context(self):
        """Test executing code with custom execution context."""
        context = ExecutionContext(
            language=Language.PYTHON,
            timeout=60,
            memory_limit_mb=1024,
            cpu_limit=2
        )
        
        safe_code = "print('Hello with context')"
        
        result = self.execution_engine.execute_code(safe_code, "python", context)
        
        assert result.status == ExecutionStatus.SUCCESS
        assert result.session_id is not None
    
    def test_mock_python_execution(self):
        """Test mock Python execution functionality."""
        # Test print statement extraction
        code_with_print = 'print("Hello World")'
        output, error, exit_code = self.execution_engine._mock_python_execution(code_with_print)
        
        assert "Hello World" in output
        assert error == ""
        assert exit_code == 0
        
        # Test code without print
        code_without_print = "x = 5 + 3"
        output, error, exit_code = self.execution_engine._mock_python_execution(code_without_print)
        
        assert "executed successfully" in output
        assert error == ""
        assert exit_code == 0
    
    def test_mock_javascript_execution(self):
        """Test mock JavaScript execution functionality."""
        # Test console.log extraction
        code_with_log = 'console.log("Hello JavaScript")'
        output, error, exit_code = self.execution_engine._mock_javascript_execution(code_with_log)
        
        assert "Hello JavaScript" in output
        assert error == ""
        assert exit_code == 0
        
        # Test code without console.log
        code_without_log = "const x = 5 + 3;"
        output, error, exit_code = self.execution_engine._mock_javascript_execution(code_without_log)
        
        assert "executed successfully" in output
        assert error == ""
        assert exit_code == 0
    
    def test_mock_shell_execution(self):
        """Test mock shell execution functionality."""
        # Test echo command
        output, error, exit_code = self.execution_engine._mock_shell_execution("echo hello")
        assert output == "hello"
        assert error == ""
        assert exit_code == 0
        
        # Test pwd command
        output, error, exit_code = self.execution_engine._mock_shell_execution("pwd")
        assert output == "/workspace"
        assert error == ""
        assert exit_code == 0
        
        # Test ls command
        output, error, exit_code = self.execution_engine._mock_shell_execution("ls")
        assert "file1.txt" in output
        assert error == ""
        assert exit_code == 0
        
        # Test unknown command
        output, error, exit_code = self.execution_engine._mock_shell_execution("unknown_command")
        assert "Mock shell output" in output
        assert error == ""
        assert exit_code == 0
    
    def test_prepare_environment(self):
        """Test environment preparation."""
        environment = self.execution_engine.prepare_environment("python")
        
        assert isinstance(environment, Environment)
        assert environment.language == Language.PYTHON
        assert environment.env_id is not None
        assert environment.working_directory is not None
        assert os.path.exists(environment.working_directory)
        assert environment.is_active is True
        assert environment.env_id in self.execution_engine.active_environments
    
    def test_cleanup_environment(self):
        """Test environment cleanup."""
        environment = self.execution_engine.prepare_environment("python")
        env_id = environment.env_id
        working_dir = environment.working_directory
        
        assert os.path.exists(working_dir)
        assert env_id in self.execution_engine.active_environments
        
        success = self.execution_engine.cleanup_environment(env_id)
        
        assert success is True
        assert not os.path.exists(working_dir)
        assert env_id not in self.execution_engine.active_environments
        assert environment.is_active is False
    
    def test_cleanup_environment_invalid(self):
        """Test cleanup of non-existent environment."""
        success = self.execution_engine.cleanup_environment("invalid_env_id")
        assert success is False
    
    def test_get_execution_history_empty(self):
        """Test getting execution history when empty."""
        history = self.execution_engine.get_execution_history()
        assert history == []
    
    def test_get_execution_history_with_data(self):
        """Test getting execution history with data."""
        # Execute some code to create history
        self.execution_engine.execute_code("print('test1')", "python")
        self.execution_engine.execute_code("print('test2')", "python")
        
        history = self.execution_engine.get_execution_history()
        
        assert len(history) == 2
        assert all(isinstance(record, ExecutionRecord) for record in history)
        assert history[0].language == Language.PYTHON
        assert history[1].language == Language.PYTHON
    
    def test_get_execution_history_with_limit(self):
        """Test getting execution history with limit."""
        # Execute multiple pieces of code
        for i in range(5):
            self.execution_engine.execute_code(f"print('test{i}')", "python")
        
        history = self.execution_engine.get_execution_history(limit=3)
        
        assert len(history) == 3
        # Should return the most recent 3
        assert all(isinstance(record, ExecutionRecord) for record in history)
    
    def test_get_statistics_empty(self):
        """Test getting statistics when no executions."""
        stats = self.execution_engine.get_statistics()
        
        assert stats["total_executions"] == 0
        assert stats["success_rate"] == 0.0
        assert stats["average_execution_time"] == 0.0
        assert stats["languages_used"] == []
        assert stats["active_environments"] == 0
    
    def test_get_statistics_with_data(self):
        """Test getting statistics with execution data."""
        # Execute some successful code
        self.execution_engine.execute_code("print('success1')", "python")
        self.execution_engine.execute_code("console.log('success2')", "javascript")
        
        # Execute some unsafe code (should fail)
        self.execution_engine.execute_code("import os; os.system('rm -rf /')", "python")
        
        stats = self.execution_engine.get_statistics()
        
        assert stats["total_executions"] >= 2  # At least 2 successful executions
        assert 0 <= stats["success_rate"] <= 100
        assert stats["average_execution_time"] >= 0
        assert "python" in stats["languages_used"]
        assert "javascript" in stats["languages_used"]
        assert stats["active_environments"] >= 0
        assert stats["history_size"] >= 2
    
    def test_validate_security_unknown_language(self):
        """Test security validation for unknown language."""
        result = self.execution_engine._validate_security("some code", "unknown")
        
        assert result.is_safe is False
        assert result.risk_level == RiskLevel.MEDIUM
        assert "Unknown language" in result.analysis_summary
    
    def test_execution_creates_record(self):
        """Test that execution creates proper records."""
        initial_count = len(self.execution_engine.execution_history)
        
        self.execution_engine.execute_code("print('test')", "python")
        
        assert len(self.execution_engine.execution_history) == initial_count + 1
        
        record = self.execution_engine.execution_history[-1]
        assert isinstance(record, ExecutionRecord)
        assert record.language == Language.PYTHON
        assert record.session_id is not None
        assert record.timestamp > 0
        assert record.code_hash is not None
        assert isinstance(record.result, ExecutionResult)
        assert isinstance(record.context, ExecutionContext)
