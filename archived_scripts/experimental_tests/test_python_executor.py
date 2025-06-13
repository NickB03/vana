"""
Tests for Python Executor

Comprehensive test suite for the Python code executor with AST validation,
security checks, and execution capabilities.
"""

import pytest
import asyncio
from unittest.mock import patch

from lib.executors import PythonExecutor, ExecutionStatus
from lib.executors.python_executor import SecurityError


class TestPythonExecutor:
    """Test suite for Python Executor."""
    
    @pytest.fixture
    def executor(self):
        """Create a Python executor instance for testing."""
        return PythonExecutor()
    
    def test_executor_initialization(self, executor):
        """Test that the executor initializes correctly."""
        assert executor.timeout == 30
        assert hasattr(executor, 'safe_globals')
        assert hasattr(executor, 'forbidden_imports')
        assert hasattr(executor, 'forbidden_functions')
    
    def test_safe_globals_creation(self, executor):
        """Test that safe globals are properly configured."""
        safe_globals = executor.safe_globals
        
        # Check basic types are available
        builtins = safe_globals['__builtins__']
        assert 'int' in builtins
        assert 'str' in builtins
        assert 'list' in builtins
        assert 'print' in builtins
        
        # Check safe modules are available
        assert 'math' in safe_globals
        assert 'json' in safe_globals
        assert 'datetime' in safe_globals
        
        # Check dangerous functions are not available
        assert 'eval' not in builtins
        assert 'exec' not in builtins
        assert 'open' not in builtins
    
    def test_validate_safe_code(self, executor):
        """Test validation of safe Python code."""
        safe_code = """
print("Hello, World!")
x = 5 + 3
result = math.sqrt(16)
data = {"key": "value"}
print(json.dumps(data))
"""
        
        assert executor.validate_code(safe_code) is True
    
    def test_validate_forbidden_import(self, executor):
        """Test validation fails for forbidden imports."""
        unsafe_code = "import os"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden import: os" in str(exc_info.value)
    
    def test_validate_forbidden_function(self, executor):
        """Test validation fails for forbidden functions."""
        unsafe_code = "eval('print(1)')"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden function call: eval" in str(exc_info.value)
    
    def test_validate_syntax_error(self, executor):
        """Test validation fails for syntax errors."""
        invalid_code = "print('unclosed string"
        
        with pytest.raises(SyntaxError):
            executor.validate_code(invalid_code)
    
    @pytest.mark.asyncio
    async def test_execute_simple_code(self, executor):
        """Test execution of simple Python code."""
        code = """
print("Hello, World!")
x = 5 + 3
print(f"Result: {x}")
"""
        
        result = await executor.execute(code)
        
        assert result.success is True
        assert result.status == ExecutionStatus.COMPLETED
        assert "Hello, World!" in result.output
        assert "Result: 8" in result.output
        assert result.execution_time > 0
        assert result.language == "python"
    
    @pytest.mark.asyncio
    async def test_execute_math_operations(self, executor):
        """Test execution with math operations."""
        code = """
import math
result = math.sqrt(16)
print(f"Square root of 16: {result}")
print(f"Pi: {math.pi:.2f}")
"""
        
        result = await executor.execute(code)
        
        assert result.success is True
        assert "Square root of 16: 4.0" in result.output
        assert "Pi: 3.14" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_json_operations(self, executor):
        """Test execution with JSON operations."""
        code = """
import json
data = {"name": "test", "value": 42}
json_str = json.dumps(data)
print(f"JSON: {json_str}")
parsed = json.loads(json_str)
print(f"Parsed value: {parsed['value']}")
"""
        
        result = await executor.execute(code)
        
        assert result.success is True
        assert '"name": "test"' in result.output
        assert "Parsed value: 42" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_with_error(self, executor):
        """Test execution with runtime error."""
        code = """
print("Before error")
x = 1 / 0
print("After error")
"""
        
        result = await executor.execute(code)
        
        assert result.success is False
        assert result.status == ExecutionStatus.FAILED
        assert "Before error" in result.output
        assert "ZeroDivisionError" in result.error
    
    @pytest.mark.asyncio
    async def test_execute_security_violation(self, executor):
        """Test execution fails for security violations."""
        code = "import subprocess"
        
        result = await executor.execute(code)
        
        assert result.success is False
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert "Forbidden import" in result.error
    
    @pytest.mark.asyncio
    async def test_execute_with_timeout(self, executor):
        """Test execution with custom timeout."""
        code = """
import time
time.sleep(0.1)
print("Completed")
"""
        
        result = await executor.execute(code, timeout=1)
        
        # This should complete successfully within timeout
        assert result.success is True
        assert "Completed" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_timeout_exceeded(self, executor):
        """Test execution timeout handling."""
        # Mock a timeout scenario
        with patch.object(executor, '_execute_with_timeout', 
                         side_effect=TimeoutError("Execution timed out after 1 seconds")):
            result = await executor.execute("print('test')", timeout=1)
        
        assert result.success is False
        assert result.status == ExecutionStatus.TIMEOUT
        assert "timed out" in result.error
    
    def test_get_language_info(self, executor):
        """Test getting language information."""
        info = executor.get_language_info()
        
        assert info["name"] == "python"
        assert "version" in info
        assert "features" in info
        assert "available_modules" in info
        assert "restrictions" in info
        
        # Check specific features
        assert "ast_validation" in info["features"]
        assert "safe_execution" in info["features"]
        
        # Check available modules
        assert "math" in info["available_modules"]
        assert "json" in info["available_modules"]
        
        # Check restrictions
        assert "no_imports" in info["restrictions"]
        assert "no_file_access" in info["restrictions"]
    
    @pytest.mark.asyncio
    async def test_execute_collections_operations(self, executor):
        """Test execution with collections operations."""
        code = """
from collections import Counter, defaultdict
data = [1, 2, 2, 3, 3, 3]
counter = Counter(data)
print(f"Counter: {dict(counter)}")

dd = defaultdict(int)
dd['key'] += 1
print(f"DefaultDict: {dict(dd)}")
"""
        
        result = await executor.execute(code)
        
        assert result.success is True
        assert "Counter:" in result.output
        assert "DefaultDict:" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_itertools_operations(self, executor):
        """Test execution with itertools operations."""
        code = """
import itertools
data = [1, 2, 3]
combinations = list(itertools.combinations(data, 2))
print(f"Combinations: {combinations}")

permutations = list(itertools.permutations(data, 2))
print(f"Permutations count: {len(permutations)}")
"""
        
        result = await executor.execute(code)
        
        assert result.success is True
        assert "Combinations:" in result.output
        assert "Permutations count:" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_exception_handling(self, executor):
        """Test execution with proper exception handling."""
        code = """
try:
    x = 1 / 0
except ZeroDivisionError as e:
    print(f"Caught error: {e}")
    print("Handled gracefully")
"""
        
        result = await executor.execute(code)
        
        assert result.success is True
        assert "Caught error:" in result.output
        assert "Handled gracefully" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_list_comprehensions(self, executor):
        """Test execution with list comprehensions."""
        code = """
numbers = [1, 2, 3, 4, 5]
squares = [x**2 for x in numbers if x % 2 == 1]
print(f"Odd squares: {squares}")

nested = [[1, 2], [3, 4], [5, 6]]
flattened = [item for sublist in nested for item in sublist]
print(f"Flattened: {flattened}")
"""
        
        result = await executor.execute(code)
        
        assert result.success is True
        assert "Odd squares: [1, 9, 25]" in result.output
        assert "Flattened: [1, 2, 3, 4, 5, 6]" in result.output


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
