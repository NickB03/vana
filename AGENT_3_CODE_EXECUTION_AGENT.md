# AGENT 3: Code Execution Specialist Agent Development

**Priority**: MEDIUM | **Timeline**: 3-4 days | **Branch**: `feature/code-execution-agent-agent3`

## 🎯 YOUR MISSION

Develop the Code Execution Specialist agent with multi-language support, security validation, and comprehensive tool integration. This agent enables safe execution of Python, JavaScript, and Shell code within the VANA system.

## 📋 SETUP INSTRUCTIONS

```bash
git clone https://github.com/NickB03/vana.git
cd vana
git checkout main
git pull origin main
git checkout -b feature/code-execution-agent-agent3
poetry install
```

## 🎯 YOUR ASSIGNED DIRECTORIES

**YOU HAVE EXCLUSIVE OWNERSHIP OF:**
- `agents/code_execution/` (create entire agent structure)
- `agents/code_execution/tools/` (specialized execution tools)
- `lib/executors/` (language-specific executors)
- `tests/agents/code_execution/` (agent-specific tests)

**DO NOT MODIFY ANY OTHER DIRECTORIES**

## 🔧 IMPLEMENTATION REQUIREMENTS

### 1. Code Execution Agent (`agents/code_execution/agent.py`)
```python
from google.adk import Agent
from .tools.execute_code import ExecuteCodeTool
from .tools.validate_code_security import ValidateCodeSecurityTool
from .tools.get_execution_history import GetExecutionHistoryTool
from .tools.get_supported_languages import GetSupportedLanguagesTool

class CodeExecutionAgent(Agent):
    """Google ADK compliant Code Execution Specialist agent."""
    
    def __init__(self):
        super().__init__(
            name="code_execution",
            description="Specialist agent for secure multi-language code execution",
            tools=[
                ExecuteCodeTool(),
                ValidateCodeSecurityTool(),
                GetExecutionHistoryTool(),
                GetSupportedLanguagesTool()
            ]
        )
    
    def get_system_prompt(self) -> str:
        """Return agent system prompt for code execution tasks."""
        return """You are a Code Execution Specialist agent. You can:
        1. Execute Python, JavaScript, and Shell code securely
        2. Validate code for security risks before execution
        3. Provide execution history and performance metrics
        4. Explain supported languages and their capabilities
        
        Always prioritize security and provide detailed explanations."""

# Export for ADK discovery
root_agent = CodeExecutionAgent()
```

### 2. Execute Code Tool (`agents/code_execution/tools/execute_code.py`)
```python
from google.adk import Tool
from lib.executors.python_executor import PythonExecutor
from lib.executors.javascript_executor import JavaScriptExecutor
from lib.executors.shell_executor import ShellExecutor

class ExecuteCodeTool(Tool):
    """Tool for executing code in multiple languages with security validation."""
    
    def __init__(self):
        super().__init__(
            name="execute_code",
            description="Execute Python, JavaScript, or Shell code securely",
            parameters={
                "code": {"type": "string", "description": "Code to execute"},
                "language": {"type": "string", "enum": ["python", "javascript", "shell"]},
                "timeout": {"type": "integer", "default": 30, "description": "Execution timeout in seconds"}
            }
        )
        
        self.executors = {
            "python": PythonExecutor(),
            "javascript": JavaScriptExecutor(),
            "shell": ShellExecutor()
        }
    
    def execute(self, code: str, language: str, timeout: int = 30) -> dict:
        """Execute code with security validation and resource monitoring."""
        try:
            executor = self.executors.get(language)
            if not executor:
                return {"error": f"Unsupported language: {language}"}
            
            result = executor.execute(code, timeout=timeout)
            
            return {
                "success": True,
                "language": language,
                "output": result.output,
                "error": result.error,
                "execution_time": result.execution_time,
                "memory_usage": result.memory_usage,
                "exit_code": result.exit_code
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
```

### 3. Validate Code Security Tool (`agents/code_execution/tools/validate_code_security.py`)
```python
from google.adk import Tool

class ValidateCodeSecurityTool(Tool):
    """Tool for analyzing code security and providing recommendations."""
    
    def __init__(self):
        super().__init__(
            name="validate_code_security",
            description="Analyze code for security risks and provide recommendations",
            parameters={
                "code": {"type": "string", "description": "Code to analyze"},
                "language": {"type": "string", "enum": ["python", "javascript", "shell"]}
            }
        )
    
    def execute(self, code: str, language: str) -> dict:
        """Analyze code security and return detailed assessment."""
        # Import sandbox security manager if available, otherwise use basic validation
        try:
            from lib.sandbox.core.security_manager import SecurityManager
            security_manager = SecurityManager("lib/sandbox/config/security_policies.yaml")
            result = security_manager.validate_code(code, language)
            
            return {
                "is_safe": result.is_safe,
                "risk_level": result.risk_level,
                "violations": result.violations,
                "recommendations": result.recommendations,
                "forbidden_patterns": result.forbidden_patterns
            }
            
        except ImportError:
            # Fallback to basic validation if sandbox not available
            return self._basic_security_check(code, language)
    
    def _basic_security_check(self, code: str, language: str) -> dict:
        """Basic security validation without sandbox integration."""
        dangerous_patterns = {
            "python": ["eval(", "exec(", "__import__", "os.", "subprocess"],
            "javascript": ["eval(", "Function(", "require('fs')", "process.exit"],
            "shell": ["rm ", "sudo ", "chmod ", ">/dev/"]
        }
        
        patterns = dangerous_patterns.get(language, [])
        violations = [pattern for pattern in patterns if pattern in code]
        
        return {
            "is_safe": len(violations) == 0,
            "risk_level": "high" if violations else "low",
            "violations": violations,
            "recommendations": ["Remove dangerous patterns"] if violations else [],
            "forbidden_patterns": violations
        }
```

### 4. Language Executors (`lib/executors/`)

**Base Executor (`lib/executors/base_executor.py`):**
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class ExecutionResult:
    """Result of code execution."""
    output: str
    error: Optional[str]
    exit_code: int
    execution_time: float
    memory_usage: int
    success: bool

class BaseExecutor(ABC):
    """Base class for language-specific code executors."""
    
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
    
    @abstractmethod
    def execute(self, code: str, timeout: Optional[int] = None) -> ExecutionResult:
        """Execute code and return results."""
        pass
    
    @abstractmethod
    def validate_code(self, code: str) -> bool:
        """Validate code before execution."""
        pass
    
    def get_language_info(self) -> dict:
        """Get information about the supported language."""
        return {
            "name": self.__class__.__name__.replace("Executor", "").lower(),
            "version": "unknown",
            "features": []
        }
```

**Python Executor (`lib/executors/python_executor.py`):**
```python
import ast
import sys
import time
import psutil
from .base_executor import BaseExecutor, ExecutionResult

class PythonExecutor(BaseExecutor):
    """Python code executor with AST validation and security checks."""
    
    def __init__(self, timeout: int = 30):
        super().__init__(timeout)
        self.safe_globals = {
            '__builtins__': {
                'print': print,
                'len': len,
                'range': range,
                'str': str,
                'int': int,
                'float': float,
                'list': list,
                'dict': dict,
                'tuple': tuple,
                'set': set,
                'abs': abs,
                'max': max,
                'min': min,
                'sum': sum,
                'sorted': sorted,
                'enumerate': enumerate,
                'zip': zip
            }
        }
    
    def validate_code(self, code: str) -> bool:
        """Validate Python code using AST parsing."""
        try:
            tree = ast.parse(code)
            
            # Check for forbidden nodes
            forbidden_nodes = (ast.Import, ast.ImportFrom, ast.Call)
            for node in ast.walk(tree):
                if isinstance(node, forbidden_nodes):
                    if isinstance(node, ast.Call) and hasattr(node.func, 'id'):
                        if node.func.id in ['eval', 'exec', 'compile']:
                            return False
                    elif isinstance(node, (ast.Import, ast.ImportFrom)):
                        return False
            
            return True
        except SyntaxError:
            return False
    
    def execute(self, code: str, timeout: Optional[int] = None) -> ExecutionResult:
        """Execute Python code with security restrictions."""
        if not self.validate_code(code):
            return ExecutionResult(
                output="", error="Code validation failed", exit_code=1,
                execution_time=0, memory_usage=0, success=False
            )
        
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss
        
        try:
            # Capture stdout
            from io import StringIO
            import contextlib
            
            output_buffer = StringIO()
            with contextlib.redirect_stdout(output_buffer):
                exec(code, self.safe_globals, {})
            
            output = output_buffer.getvalue()
            execution_time = time.time() - start_time
            memory_usage = psutil.Process().memory_info().rss - start_memory
            
            return ExecutionResult(
                output=output, error=None, exit_code=0,
                execution_time=execution_time, memory_usage=memory_usage, success=True
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            return ExecutionResult(
                output="", error=str(e), exit_code=1,
                execution_time=execution_time, memory_usage=0, success=False
            )
    
    def get_language_info(self) -> dict:
        """Get Python language information."""
        return {
            "name": "python",
            "version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "features": ["data_science", "safe_execution", "ast_validation"],
            "available_modules": ["builtins", "math", "random", "datetime"],
            "restrictions": ["no_imports", "no_file_access", "no_network"]
        }
```

## 🧪 TESTING REQUIREMENTS

Create comprehensive tests in `tests/agents/code_execution/`:

### Test Files to Create:
- `test_code_execution_agent.py` - Agent functionality tests
- `test_execute_code_tool.py` - Code execution tool tests
- `test_validate_security_tool.py` - Security validation tests
- `test_python_executor.py` - Python executor tests
- `test_javascript_executor.py` - JavaScript executor tests
- `test_shell_executor.py` - Shell executor tests
- `test_integration.py` - End-to-end integration tests

### Test Coverage Requirements:
- Unit tests for all tools and executors (>90% coverage)
- Security validation tests with malicious code samples
- Performance tests with various code complexity
- Error handling and edge case tests
- Mock fallback tests for development environments

## ✅ SUCCESS CRITERIA

Your implementation is successful when:

1. **Agent appears in Google ADK agent system**
2. **Successfully executes Python, JavaScript, and Shell code**
3. **Returns formatted results with execution metrics**
4. **Integrates seamlessly with existing VANA framework**
5. **Security restrictions prevent malicious code execution**
6. **Comprehensive error analysis and debugging suggestions**
7. **All tests pass locally**
8. **Mock fallback works when sandbox unavailable**

## 🚀 GETTING STARTED

1. **Create the directory structure:**
```bash
mkdir -p agents/code_execution/tools
mkdir -p lib/executors
mkdir -p tests/agents/code_execution
```

2. **Start with Base Executor** - Foundation for all languages
3. **Implement Python Executor** - Most critical language
4. **Build Agent Structure** - Google ADK compliance
5. **Create Execution Tools** - Core functionality
6. **Add Security Validation** - Safety first
7. **Write comprehensive tests** - Ensure reliability
8. **Test integration** - Verify ADK compliance

## 📝 COMMIT GUIDELINES

- Commit frequently: `feat: add Python executor with AST validation`
- Include tests with each executor implementation
- Test both success and failure scenarios
- Document security restrictions clearly

## 🔄 WHEN READY TO MERGE

1. All tests pass locally
2. Agent is discoverable in ADK system
3. Security validation prevents dangerous code
4. Performance metrics are captured
5. Error handling is comprehensive

**Remember: You are building a code execution system. Security and reliability are paramount.**
