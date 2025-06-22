# Security Fixes Required - VANA Project

**Priority**: IMMEDIATE ACTION REQUIRED  
**Timeline**: Critical fixes within 48 hours  
**Validation**: Security testing before deployment  

---

## 🚨 CRITICAL FIXES (Immediate - 48 hours)

### 1. Fix Unsafe Archive Extraction (CWE-22)
**File**: `lib/_tools/mcp_filesystem_tools.py`  
**Lines**: 156-158, 234-236  
**Risk**: Path traversal, arbitrary file overwrite  

#### Current Vulnerable Code:
```python
def extract_archive(archive_path, destination):
    """Extract archive without path validation - VULNERABLE"""
    if archive_path.endswith('.tar.gz') or archive_path.endswith('.tar'):
        with tarfile.open(archive_path, 'r') as tar:
            tar.extractall(destination)  # ⚠️ VULNERABLE
    elif archive_path.endswith('.zip'):
        with zipfile.ZipFile(archive_path, 'r') as zip_file:
            zip_file.extractall(destination)  # ⚠️ VULNERABLE
```

#### Required Fix:
```python
import os
import tarfile
import zipfile
from pathlib import Path

def safe_extract_archive(archive_path, destination):
    """Safely extract archive with path validation"""
    destination = os.path.abspath(destination)
    
    if archive_path.endswith('.tar.gz') or archive_path.endswith('.tar'):
        with tarfile.open(archive_path, 'r') as tar:
            for member in tar.getmembers():
                # Validate member path
                if os.path.isabs(member.name):
                    raise ValueError(f"Absolute path not allowed: {member.name}")
                if ".." in member.name:
                    raise ValueError(f"Path traversal attempt: {member.name}")
                
                # Ensure extracted path stays within destination
                full_path = os.path.join(destination, member.name)
                if not full_path.startswith(destination):
                    raise ValueError(f"Path outside destination: {member.name}")
            
            tar.extractall(destination)
    
    elif archive_path.endswith('.zip'):
        with zipfile.ZipFile(archive_path, 'r') as zip_file:
            for member in zip_file.namelist():
                # Validate member path
                if os.path.isabs(member):
                    raise ValueError(f"Absolute path not allowed: {member}")
                if ".." in member:
                    raise ValueError(f"Path traversal attempt: {member}")
                
                # Ensure extracted path stays within destination
                full_path = os.path.join(destination, member)
                if not full_path.startswith(destination):
                    raise ValueError(f"Path outside destination: {member}")
            
            zip_file.extractall(destination)

# Required test cases
def test_safe_extract_archive():
    """Test archive extraction security"""
    # Test path traversal prevention
    with pytest.raises(ValueError, match="Path traversal"):
        safe_extract_archive("malicious.tar", "/tmp/test")
    
    # Test absolute path prevention
    with pytest.raises(ValueError, match="Absolute path"):
        safe_extract_archive("absolute.tar", "/tmp/test")
```

### 2. Replace eval() Usage (CWE-78)
**Files**: 
- `lib/_tools/adk_third_party_tools.py:177`
- `lib/_tools/langchain_adapter.py:415`  
**Risk**: Arbitrary code execution  

#### Current Vulnerable Code:
```python
def execute_dynamic_code(expression, context=None):
    """Execute dynamic expression - VULNERABLE"""
    if context:
        result = eval(expression, context)  # ⚠️ VULNERABLE
    else:
        result = eval(expression)  # ⚠️ VULNERABLE
    return result
```

#### Required Fix:
```python
import ast
import operator
from typing import Any, Dict, Optional

# Safe operators for mathematical expressions
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

def safe_eval_expression(expression: str, allowed_names: Optional[Dict[str, Any]] = None) -> Any:
    """Safely evaluate mathematical expressions"""
    try:
        # Parse the expression
        node = ast.parse(expression, mode='eval')
        
        # Validate the AST
        _validate_ast_node(node.body, allowed_names or {})
        
        # Use ast.literal_eval for simple literals
        try:
            return ast.literal_eval(expression)
        except (ValueError, SyntaxError):
            # For complex expressions, use controlled evaluation
            return _eval_ast_node(node.body, allowed_names or {})
            
    except (ValueError, SyntaxError, TypeError) as e:
        raise ValueError(f"Invalid or unsafe expression: {e}")

def _validate_ast_node(node: ast.AST, allowed_names: Dict[str, Any]) -> None:
    """Validate AST node for safety"""
    if isinstance(node, ast.Name):
        if node.id not in allowed_names:
            raise ValueError(f"Name '{node.id}' not allowed")
    elif isinstance(node, ast.BinOp):
        if type(node.op) not in SAFE_OPERATORS:
            raise ValueError(f"Operator {type(node.op).__name__} not allowed")
        _validate_ast_node(node.left, allowed_names)
        _validate_ast_node(node.right, allowed_names)
    elif isinstance(node, ast.UnaryOp):
        if type(node.op) not in SAFE_OPERATORS:
            raise ValueError(f"Operator {type(node.op).__name__} not allowed")
        _validate_ast_node(node.operand, allowed_names)
    elif isinstance(node, (ast.Constant, ast.Num, ast.Str)):
        pass  # Literals are safe
    else:
        raise ValueError(f"AST node type {type(node).__name__} not allowed")

def _eval_ast_node(node: ast.AST, allowed_names: Dict[str, Any]) -> Any:
    """Evaluate validated AST node"""
    if isinstance(node, ast.Name):
        return allowed_names[node.id]
    elif isinstance(node, ast.BinOp):
        left = _eval_ast_node(node.left, allowed_names)
        right = _eval_ast_node(node.right, allowed_names)
        return SAFE_OPERATORS[type(node.op)](left, right)
    elif isinstance(node, ast.UnaryOp):
        operand = _eval_ast_node(node.operand, allowed_names)
        return SAFE_OPERATORS[type(node.op)](operand)
    elif isinstance(node, ast.Constant):
        return node.value
    elif isinstance(node, ast.Num):  # Python < 3.8 compatibility
        return node.n
    elif isinstance(node, ast.Str):  # Python < 3.8 compatibility
        return node.s
    else:
        raise ValueError(f"Unexpected AST node: {type(node).__name__}")

# Required test cases
def test_safe_eval_expression():
    """Test safe expression evaluation"""
    # Test safe expressions
    assert safe_eval_expression("2 + 3") == 5
    assert safe_eval_expression("10 * 5") == 50
    
    # Test with allowed names
    context = {"x": 10, "y": 5}
    assert safe_eval_expression("x + y", context) == 15
    
    # Test dangerous expressions are blocked
    with pytest.raises(ValueError):
        safe_eval_expression("__import__('os').system('ls')")
    
    with pytest.raises(ValueError):
        safe_eval_expression("exec('print(1)')")
```

---

## 🟠 HIGH PRIORITY FIXES (Week 1)

### 3. Add Request Timeouts (CWE-400)
**Files**: Multiple files in `tools/` directory  
**Risk**: Denial of service, resource exhaustion  

#### Required Fix Pattern:
```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class SecureHTTPClient:
    """HTTP client with security best practices"""
    
    def __init__(self, timeout=30, max_retries=3):
        self.timeout = timeout
        self.session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def get(self, url, **kwargs):
        """Secure GET request with timeout"""
        kwargs.setdefault('timeout', self.timeout)
        return self.session.get(url, **kwargs)
    
    def post(self, url, **kwargs):
        """Secure POST request with timeout"""
        kwargs.setdefault('timeout', self.timeout)
        return self.session.post(url, **kwargs)

# Usage in existing code
def search_web(query):
    """Example of secure HTTP usage"""
    client = SecureHTTPClient(timeout=10)
    try:
        response = client.get(f"https://api.example.com/search?q={query}")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        raise TimeoutError("Search request timed out")
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Search request failed: {e}")
```

### 4. Fix File Permissions (CWE-732)
**File**: `lib/sandbox/executors/shell_executor.py`  
**Risk**: Unauthorized file access  

#### Current Vulnerable Code:
```python
def create_script_file(script_content):
    script_path = "/tmp/script.sh"
    with open(script_path, 'w') as f:
        f.write(script_content)
    os.chmod(script_path, 0o755)  # ⚠️ Too permissive
    return script_path
```

#### Required Fix:
```python
import tempfile
import os
import stat

def create_secure_script_file(script_content):
    """Create script file with secure permissions"""
    # Use secure temporary file
    fd, script_path = tempfile.mkstemp(suffix='.sh', prefix='vana_script_')
    
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(script_content)
        
        # Set restrictive permissions (owner read/execute only)
        os.chmod(script_path, stat.S_IRUSR | stat.S_IXUSR)  # 0o500
        
        return script_path
    except Exception:
        # Clean up on error
        try:
            os.unlink(script_path)
        except OSError:
            pass
        raise

def cleanup_script_file(script_path):
    """Securely clean up script file"""
    try:
        os.unlink(script_path)
    except OSError:
        pass  # File may already be deleted
```

### 5. Secure Subprocess Usage (CWE-78)
**Files**: Multiple files using subprocess  
**Risk**: Command injection  

#### Required Fix Pattern:
```python
import subprocess
import shlex
from typing import List, Optional

def secure_subprocess_run(
    command: List[str], 
    input_data: Optional[str] = None,
    timeout: int = 30,
    cwd: Optional[str] = None
) -> subprocess.CompletedProcess:
    """Securely execute subprocess with validation"""
    
    # Validate command
    if not command or not isinstance(command, list):
        raise ValueError("Command must be a non-empty list")
    
    # Validate executable
    executable = command[0]
    if not _is_allowed_executable(executable):
        raise ValueError(f"Executable '{executable}' not allowed")
    
    # Validate arguments
    for arg in command[1:]:
        if not _is_safe_argument(arg):
            raise ValueError(f"Unsafe argument: {arg}")
    
    try:
        result = subprocess.run(
            command,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
            shell=False,  # Never use shell=True
            check=False
        )
        return result
    except subprocess.TimeoutExpired:
        raise TimeoutError(f"Command timed out after {timeout} seconds")

def _is_allowed_executable(executable: str) -> bool:
    """Check if executable is allowed"""
    allowed_executables = {
        'python', 'python3', 'node', 'npm', 'pip', 'git'
    }
    return executable in allowed_executables

def _is_safe_argument(arg: str) -> bool:
    """Validate command argument for safety"""
    # Block dangerous characters
    dangerous_chars = ['&', '|', ';', '`', '$', '(', ')', '<', '>']
    return not any(char in arg for char in dangerous_chars)
```

---

## 🟡 MEDIUM PRIORITY FIXES (Weeks 2-3)

### 6. Secure Temporary Directory Usage
**Files**: `lib/_tools/adk_mcp_tools.py`, `lib/logging_config.py`  

```python
import tempfile
import atexit
import shutil

class SecureTempManager:
    """Secure temporary directory management"""
    
    def __init__(self):
        self.temp_dirs = []
        atexit.register(self.cleanup_all)
    
    def create_temp_dir(self, prefix='vana_'):
        """Create secure temporary directory"""
        temp_dir = tempfile.mkdtemp(prefix=prefix)
        self.temp_dirs.append(temp_dir)
        return temp_dir
    
    def cleanup_temp_dir(self, temp_dir):
        """Clean up specific temporary directory"""
        try:
            shutil.rmtree(temp_dir)
            if temp_dir in self.temp_dirs:
                self.temp_dirs.remove(temp_dir)
        except OSError:
            pass
    
    def cleanup_all(self):
        """Clean up all temporary directories"""
        for temp_dir in self.temp_dirs[:]:
            self.cleanup_temp_dir(temp_dir)

# Global instance
temp_manager = SecureTempManager()
```

### 7. Improve Exception Handling
**Pattern for all files with try/except/pass**  

```python
import logging

logger = logging.getLogger(__name__)

def secure_operation_with_logging():
    """Example of proper exception handling"""
    try:
        risky_operation()
    except SpecificException as e:
        logger.error(f"Specific error occurred: {e}")
        # Handle specific error appropriately
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        # Log and re-raise or handle appropriately
        raise
```

---

## 🔧 Implementation Checklist

### Critical Fixes (48 hours)
- [ ] Fix unsafe archive extraction in `mcp_filesystem_tools.py`
- [ ] Replace eval() usage in `adk_third_party_tools.py`
- [ ] Replace eval() usage in `langchain_adapter.py`
- [ ] Add comprehensive test cases for security fixes
- [ ] Validate fixes with security testing

### High Priority (Week 1)
- [ ] Add timeouts to all HTTP requests
- [ ] Fix file permissions in shell executor
- [ ] Secure subprocess usage across codebase
- [ ] Implement secure temporary directory management
- [ ] Update exception handling patterns

### Testing Requirements
- [ ] Unit tests for all security fixes
- [ ] Integration tests for secure workflows
- [ ] Penetration testing for critical components
- [ ] Automated security scanning in CI/CD

### Documentation Updates
- [ ] Security coding guidelines
- [ ] Secure development practices
- [ ] Incident response procedures
- [ ] Security testing documentation

---

## 🚨 Validation & Testing

### Security Test Cases
```python
# Test archive extraction security
def test_archive_security():
    # Test path traversal prevention
    malicious_tar = create_malicious_archive("../../../etc/passwd")
    with pytest.raises(ValueError, match="Path traversal"):
        safe_extract_archive(malicious_tar, "/tmp/test")

# Test eval replacement security
def test_eval_security():
    # Test dangerous code is blocked
    with pytest.raises(ValueError):
        safe_eval_expression("__import__('os').system('rm -rf /')")

# Test subprocess security
def test_subprocess_security():
    # Test command injection prevention
    with pytest.raises(ValueError):
        secure_subprocess_run(["sh", "-c", "rm -rf /"])
```

### Automated Security Scanning
```yaml
# CI/CD Security Pipeline
security_checks:
  - name: Static Analysis
    run: bandit -r . -f json -o bandit_report.json
  
  - name: Dependency Check
    run: safety check --json --output safety_report.json
  
  - name: License Check
    run: pip-audit --format=json --output audit_report.json
  
  - name: Secret Scanning
    run: truffleHog --json .
```

---

*These fixes address all identified security vulnerabilities and establish secure coding practices for the VANA project.*
