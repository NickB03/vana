"""
Integration tests for lightweight code execution
"""

import pytest
import json
from lib._tools.adk_tools import simple_execute_code, mathematical_solve


class TestLightweightCodeExecution:
    """Test lightweight code execution capabilities."""
    
    def test_mathematical_solve(self):
        """Test mathematical expression solving."""
        # Simple arithmetic
        result = mathematical_solve("What is 25 + 17?")
        data = json.loads(result)
        assert data["answer"] == 42 or data["answer"] == "42"  # Handle both string and number
        assert data["confidence"] > 0.8
        
        # Complex expression
        result = mathematical_solve("Calculate (10 * 5) + (3 * 7) - 1")
        data = json.loads(result)
        assert data["answer"] == 70 or data["answer"] == "70"  # Handle both string and number
    
    def test_simple_python_execution(self):
        """Test basic Python code execution."""
        # Simple calculation
        code = """
result = sum([1, 2, 3, 4, 5])
print(f"Sum: {result}")
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is True
        assert "Sum: 15" in data["output"]
        
        # Data structure manipulation
        code = """
data = {"a": 1, "b": 2, "c": 3}
squared = {k: v**2 for k, v in data.items()}
print(squared)
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is True
        assert "'a': 1" in data["output"]
        assert "'b': 4" in data["output"]
        assert "'c': 9" in data["output"]
    
    def test_security_blocking(self):
        """Test that dangerous operations are blocked."""
        # Test OS import blocking
        code = "import os\nprint(os.listdir('/'))"
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is False
        assert "dangerous pattern" in data["error"]
        
        # Test file operation blocking
        code = "with open('/etc/passwd', 'r') as f:\n    print(f.read())"
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is False
        assert "dangerous pattern" in data["error"]
        
        # Test subprocess blocking
        code = "import subprocess\nsubprocess.run(['ls', '-la'])"
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is False
    
    def test_timeout_protection(self):
        """Test timeout protection for long-running code."""
        code = """
import time
while True:
    time.sleep(1)
    print("Still running...")
"""
        # This should fail due to 'import time' first
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is False
        
        # Even without imports, infinite loops are caught by timeout
        code = """
while True:
    x = 1 + 1
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        # Should timeout after 10 seconds
        assert data["success"] is False or "timeout" in data.get("error", "").lower()
    
    def test_safe_operations(self):
        """Test various safe operations that should work."""
        # List comprehension
        code = """
squares = [x**2 for x in range(10)]
print(f"Squares: {squares}")
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is True
        assert "[0, 1, 4, 9, 16, 25, 36, 49, 64, 81]" in data["output"]
        
        # String manipulation
        code = """
text = "hello world"
print(f"Upper: {text.upper()}")
print(f"Title: {text.title()}")
print(f"Reversed: {text[::-1]}")
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is True
        assert "HELLO WORLD" in data["output"]
        assert "Hello World" in data["output"]
        assert "dlrow olleh" in data["output"]
        
        # Basic algorithm
        code = """
def fibonacci(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is True
        assert "F(9) = 34" in data["output"]
    
    def test_error_handling(self):
        """Test error handling and reporting."""
        # Syntax error
        code = """
print("Missing closing quote
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is False
        assert data["exit_code"] != 0
        
        # Runtime error
        code = """
x = 10
y = 0
result = x / y
print(result)
"""
        result = simple_execute_code(code, "python")
        data = json.loads(result)
        assert data["success"] is False
        assert "ZeroDivisionError" in data["error"]
    
    def test_non_python_rejection(self):
        """Test that non-Python languages are rejected."""
        # JavaScript
        result = simple_execute_code("console.log('Hello');", "javascript")
        data = json.loads(result)
        assert data["success"] is False
        assert "Only Python execution supported" in data["error"]
        
        # Shell
        result = simple_execute_code("echo 'Hello'", "shell")
        data = json.loads(result)
        assert data["success"] is False
        assert "Only Python execution supported" in data["error"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])