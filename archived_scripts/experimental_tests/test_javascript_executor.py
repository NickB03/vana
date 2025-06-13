"""
Tests for JavaScript Executor

Comprehensive test suite for the JavaScript code executor with security validation,
Node.js integration, and safe execution capabilities.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock

from lib.executors import JavaScriptExecutor, ExecutionStatus
from lib.executors.javascript_executor import SecurityError


class TestJavaScriptExecutor:
    """Test suite for JavaScript Executor."""
    
    @pytest.fixture
    def executor(self):
        """Create a JavaScript executor instance for testing."""
        return JavaScriptExecutor()
    
    def test_executor_initialization(self, executor):
        """Test that the executor initializes correctly."""
        assert executor.timeout == 30
        assert hasattr(executor, 'forbidden_patterns')
        assert hasattr(executor, 'safe_modules')
    
    def test_safe_modules_configuration(self, executor):
        """Test that safe modules are properly configured."""
        safe_modules = executor.safe_modules
        
        # Check that common safe modules are included
        assert 'lodash' in safe_modules
        assert 'moment' in safe_modules
        assert 'uuid' in safe_modules
        assert 'mathjs' in safe_modules
    
    def test_validate_safe_code(self, executor):
        """Test validation of safe JavaScript code."""
        safe_code = """
console.log("Hello, World!");
const x = 5 + 3;
const result = Math.sqrt(16);
console.log(`Result: ${result}`);
"""
        
        assert executor.validate_code(safe_code) is True
    
    def test_validate_forbidden_require_fs(self, executor):
        """Test validation fails for forbidden fs require."""
        unsafe_code = 'const fs = require("fs");'
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_validate_forbidden_require_child_process(self, executor):
        """Test validation fails for forbidden child_process require."""
        unsafe_code = "const cp = require('child_process');"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_validate_forbidden_eval(self, executor):
        """Test validation fails for eval usage."""
        unsafe_code = 'eval("console.log(1)");'
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_validate_forbidden_function_constructor(self, executor):
        """Test validation fails for Function constructor."""
        unsafe_code = 'new Function("return 1")();'
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_validate_forbidden_process_exit(self, executor):
        """Test validation fails for process.exit."""
        unsafe_code = "process.exit(0);"
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden pattern detected" in str(exc_info.value)
    
    def test_validate_safe_require(self, executor):
        """Test validation passes for safe module requires."""
        safe_code = 'const _ = require("lodash");'
        
        assert executor.validate_code(safe_code) is True
    
    def test_validate_forbidden_module_require(self, executor):
        """Test validation fails for forbidden module requires."""
        unsafe_code = 'const http = require("http");'
        
        with pytest.raises(SecurityError) as exc_info:
            executor.validate_code(unsafe_code)
        
        assert "Forbidden module: http" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_execute_simple_code(self, executor):
        """Test execution of simple JavaScript code."""
        code = """
console.log("Hello, World!");
const x = 5 + 3;
console.log(`Result: ${x}`);
"""
        
        # Mock the subprocess execution
        mock_result = {
            "output": "Hello, World!\nResult: 8\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert result.status == ExecutionStatus.COMPLETED
        assert "Hello, World!" in result.output
        assert "Result: 8" in result.output
        assert result.language == "javascript"
    
    @pytest.mark.asyncio
    async def test_execute_math_operations(self, executor):
        """Test execution with math operations."""
        code = """
const result = Math.sqrt(16);
console.log(`Square root of 16: ${result}`);
console.log(`Pi: ${Math.PI.toFixed(2)}`);
"""
        
        mock_result = {
            "output": "Square root of 16: 4\nPi: 3.14\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "Square root of 16: 4" in result.output
        assert "Pi: 3.14" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_json_operations(self, executor):
        """Test execution with JSON operations."""
        code = """
const data = {name: "test", value: 42};
const jsonStr = JSON.stringify(data);
console.log(`JSON: ${jsonStr}`);
const parsed = JSON.parse(jsonStr);
console.log(`Parsed value: ${parsed.value}`);
"""
        
        mock_result = {
            "output": 'JSON: {"name":"test","value":42}\nParsed value: 42\n',
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert '"name":"test"' in result.output
        assert "Parsed value: 42" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_with_error(self, executor):
        """Test execution with runtime error."""
        code = """
console.log("Before error");
throw new Error("Test error");
console.log("After error");
"""
        
        mock_result = {
            "output": "Before error\n",
            "stderr": "Error: Test error\n",
            "exit_code": 1
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is False
        assert result.status == ExecutionStatus.FAILED
        assert "Before error" in result.output
        assert "Error: Test error" in result.error
        assert result.exit_code == 1
    
    @pytest.mark.asyncio
    async def test_execute_security_violation(self, executor):
        """Test execution fails for security violations."""
        code = 'const fs = require("fs");'
        
        result = await executor.execute(code)
        
        assert result.success is False
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert "Forbidden pattern detected" in result.error
    
    @pytest.mark.asyncio
    async def test_execute_with_timeout(self, executor):
        """Test execution timeout handling."""
        with patch.object(executor, '_execute_with_timeout', 
                         side_effect=TimeoutError("Execution timed out after 1 seconds")):
            result = await executor.execute("console.log('test');", timeout=1)
        
        assert result.success is False
        assert result.status == ExecutionStatus.TIMEOUT
        assert "timed out" in result.error
    
    def test_get_language_info(self, executor):
        """Test getting language information."""
        info = executor.get_language_info()
        
        assert info["name"] == "javascript"
        assert "Node.js" in info["version"]
        assert "features" in info
        assert "available_modules" in info
        assert "restrictions" in info
        
        # Check specific features
        assert "vm_isolation" in info["features"]
        assert "safe_require" in info["features"]
        
        # Check available modules
        assert "lodash" in info["available_modules"]
        assert "moment" in info["available_modules"]
        
        # Check restrictions
        assert "no_file_access" in info["restrictions"]
        assert "no_network" in info["restrictions"]
    
    def test_create_execution_wrapper(self, executor):
        """Test creation of execution wrapper."""
        user_code = 'console.log("Hello");'
        wrapper = executor._create_execution_wrapper(user_code)
        
        # Check that wrapper contains safety measures
        assert "global.process = undefined" in wrapper
        assert "global.eval = undefined" in wrapper
        assert "global.Function = undefined" in wrapper
        assert user_code in wrapper
    
    @pytest.mark.asyncio
    async def test_execute_array_operations(self, executor):
        """Test execution with array operations."""
        code = """
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
console.log(`Doubled: ${JSON.stringify(doubled)}`);

const sum = numbers.reduce((a, b) => a + b, 0);
console.log(`Sum: ${sum}`);
"""
        
        mock_result = {
            "output": "Doubled: [2,4,6,8,10]\nSum: 15\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "Doubled: [2,4,6,8,10]" in result.output
        assert "Sum: 15" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_object_operations(self, executor):
        """Test execution with object operations."""
        code = """
const obj = {a: 1, b: 2, c: 3};
const keys = Object.keys(obj);
console.log(`Keys: ${JSON.stringify(keys)}`);

const values = Object.values(obj);
console.log(`Values: ${JSON.stringify(values)}`);
"""
        
        mock_result = {
            "output": 'Keys: ["a","b","c"]\nValues: [1,2,3]\n',
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert 'Keys: ["a","b","c"]' in result.output
        assert "Values: [1,2,3]" in result.output
    
    @pytest.mark.asyncio
    async def test_execute_string_operations(self, executor):
        """Test execution with string operations."""
        code = """
const text = "Hello World";
console.log(`Uppercase: ${text.toUpperCase()}`);
console.log(`Length: ${text.length}`);
console.log(`Split: ${JSON.stringify(text.split(' '))}`);
"""
        
        mock_result = {
            "output": 'Uppercase: HELLO WORLD\nLength: 11\nSplit: ["Hello","World"]\n',
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "Uppercase: HELLO WORLD" in result.output
        assert "Length: 11" in result.output
        assert 'Split: ["Hello","World"]' in result.output
    
    @pytest.mark.asyncio
    async def test_execute_exception_handling(self, executor):
        """Test execution with proper exception handling."""
        code = """
try {
    throw new Error("Test error");
} catch (e) {
    console.log(`Caught error: ${e.message}`);
    console.log("Handled gracefully");
}
"""
        
        mock_result = {
            "output": "Caught error: Test error\nHandled gracefully\n",
            "stderr": "",
            "exit_code": 0
        }
        
        with patch.object(executor, '_execute_javascript_code', return_value=mock_result):
            result = await executor.execute(code)
        
        assert result.success is True
        assert "Caught error: Test error" in result.output
        assert "Handled gracefully" in result.output


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
