# AGENT 1: Sandbox Infrastructure Development

**Priority**: HIGH | **Timeline**: 3-5 days | **Branch**: `feature/sandbox-infrastructure-agent1`

## 🎯 YOUR MISSION

Implement the core sandbox infrastructure for secure code execution, including Docker containers, security policies, and resource monitoring systems. This is critical infrastructure that enables safe code execution for the VANA system.

## 📋 SETUP INSTRUCTIONS

```bash
git clone https://github.com/NickB03/vana.git
cd vana
git checkout main
git pull origin main
git checkout -b feature/sandbox-infrastructure-agent1
poetry install
```

## 🎯 YOUR ASSIGNED DIRECTORIES

**YOU HAVE EXCLUSIVE OWNERSHIP OF:**
- `lib/sandbox/` (create entire directory structure)
- `lib/sandbox/core/` (execution engine, security manager, resource monitor)
- `lib/sandbox/containers/` (Docker configurations)
- `lib/sandbox/config/` (security policies, resource limits)
- `tests/sandbox/` (comprehensive test suite)

**DO NOT MODIFY ANY OTHER DIRECTORIES**

## 🔧 IMPLEMENTATION REQUIREMENTS

### 1. Security Manager (`lib/sandbox/core/security_manager.py`)
```python
class SecurityManager:
    """Multi-language code security validation and policy enforcement."""
    
    def __init__(self, config_path: str):
        """Load security policies from YAML configuration."""
        
    def validate_python_code(self, code: str) -> SecurityResult:
        """Validate Python code using AST parsing."""
        
    def validate_javascript_code(self, code: str) -> SecurityResult:
        """Validate JavaScript code using pattern matching."""
        
    def validate_shell_code(self, code: str) -> SecurityResult:
        """Validate shell commands against forbidden patterns."""
        
    def check_imports(self, code: str, language: str) -> List[str]:
        """Check for forbidden imports and modules."""
        
    def analyze_security_risk(self, code: str, language: str) -> RiskLevel:
        """Analyze overall security risk level."""
```

**Key Features:**
- AST parsing for Python code validation
- Pattern matching for JavaScript/Shell validation
- Forbidden imports, functions, and patterns detection
- YAML-based security policy configuration
- Risk level assessment and recommendations

### 2. Resource Monitor (`lib/sandbox/core/resource_monitor.py`)
```python
class ResourceMonitor:
    """Real-time resource monitoring and limit enforcement."""
    
    def __init__(self, limits_config: dict):
        """Initialize with resource limits configuration."""
        
    def start_monitoring(self, process_id: int) -> MonitoringSession:
        """Start monitoring a process for resource usage."""
        
    def get_current_usage(self, session_id: str) -> ResourceUsage:
        """Get current CPU, memory, disk usage."""
        
    def check_limits(self, session_id: str) -> LimitStatus:
        """Check if process is within resource limits."""
        
    def terminate_if_exceeded(self, session_id: str) -> bool:
        """Terminate process if limits exceeded."""
        
    def get_performance_metrics(self, session_id: str) -> PerformanceMetrics:
        """Get detailed performance metrics."""
```

**Key Features:**
- Real-time CPU, memory, disk, and process monitoring
- Configurable limits and alerts
- Performance metrics collection and reporting
- Integration with Docker container limits
- Automatic termination on limit violations

### 3. Execution Engine (`lib/sandbox/core/execution_engine.py`)
```python
class ExecutionEngine:
    """Multi-language orchestration and execution coordination."""
    
    def __init__(self, security_manager: SecurityManager, resource_monitor: ResourceMonitor):
        """Initialize with security and monitoring components."""
        
    def execute_code(self, code: str, language: str, context: ExecutionContext) -> ExecutionResult:
        """Execute code with security validation and resource monitoring."""
        
    def prepare_environment(self, language: str) -> Environment:
        """Prepare isolated execution environment."""
        
    def cleanup_environment(self, env_id: str) -> bool:
        """Clean up execution environment and resources."""
        
    def get_execution_history(self, limit: int = 100) -> List[ExecutionRecord]:
        """Get execution history with metrics."""
```

**Key Features:**
- Multi-language orchestration layer
- Security validation integration
- Resource enforcement and monitoring
- Result capture and error handling
- Execution history and audit trail

### 4. Docker Configurations (`lib/sandbox/containers/`)

**Create these Docker files:**

**`Dockerfile.python`:**
```dockerfile
FROM python:3.13-slim
RUN useradd -m -u 1000 sandbox
WORKDIR /workspace
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
USER sandbox
CMD ["python"]
```

**`Dockerfile.javascript`:**
```dockerfile
FROM node:20-slim
RUN useradd -m -u 1000 sandbox
WORKDIR /workspace
COPY package.json .
RUN npm install --production
USER sandbox
CMD ["node"]
```

**`Dockerfile.shell`:**
```dockerfile
FROM ubuntu:22.04
RUN useradd -m -u 1000 sandbox
RUN apt-get update && apt-get install -y bash coreutils && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
USER sandbox
CMD ["bash"]
```

**`requirements.txt`:**
```
pandas==2.1.4
numpy==1.24.3
matplotlib==3.7.2
scikit-learn==1.3.0
```

**`package.json`:**
```json
{
  "name": "sandbox-js",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

### 5. Configuration Files (`lib/sandbox/config/`)

**`security_policies.yaml`:**
```yaml
python:
  forbidden_imports:
    - os
    - subprocess
    - sys
    - socket
  forbidden_functions:
    - eval
    - exec
    - compile
  forbidden_patterns:
    - "__import__"
    - "globals()"
    - "locals()"

javascript:
  forbidden_patterns:
    - "require('fs')"
    - "require('child_process')"
    - "process.exit"
    - "eval("

shell:
  forbidden_commands:
    - rm
    - sudo
    - chmod
    - chown
  forbidden_patterns:
    - ">/dev/"
    - "curl"
    - "wget"
```

**`resource_limits.yaml`:**
```yaml
default_limits:
  memory_mb: 512
  cpu_cores: 1
  execution_time_seconds: 30
  max_processes: 5
  disk_mb: 100

language_specific:
  python:
    memory_mb: 512
    execution_time_seconds: 30
  javascript:
    memory_mb: 256
    execution_time_seconds: 15
  shell:
    memory_mb: 128
    execution_time_seconds: 10
```

## 🧪 TESTING REQUIREMENTS

Create comprehensive tests in `tests/sandbox/`:

### Test Files to Create:
- `test_security_manager.py` - Security validation tests
- `test_resource_monitor.py` - Resource monitoring tests
- `test_execution_engine.py` - Execution orchestration tests
- `test_docker_integration.py` - Docker container tests
- `test_security_policies.py` - Security policy tests
- `test_performance.py` - Performance benchmarking

### Test Coverage Requirements:
- Unit tests for all core components (>90% coverage)
- Security validation tests with malicious code samples
- Resource limit enforcement tests
- Docker container integration tests
- Performance benchmarking tests
- Error handling and edge case tests

## ✅ SUCCESS CRITERIA

Your implementation is successful when:

1. **Docker containers start within 5 seconds**
2. **Security policies prevent unauthorized file system access**
3. **Resource limits (512MB RAM, 1 CPU core) enforced**
4. **Basic Python code execution working with mock implementation**
5. **Comprehensive test coverage (>90%)**
6. **All tests pass locally**
7. **Code follows existing project patterns**
8. **Documentation is complete and accurate**

## 🚀 GETTING STARTED

1. **Create the directory structure:**
```bash
mkdir -p lib/sandbox/core
mkdir -p lib/sandbox/containers
mkdir -p lib/sandbox/config
mkdir -p tests/sandbox
```

2. **Start with the Security Manager** - This is the foundation
3. **Implement Resource Monitor** - Critical for safety
4. **Build Execution Engine** - Orchestrates everything
5. **Create Docker configurations** - Enable containerization
6. **Write comprehensive tests** - Ensure reliability
7. **Document your implementation** - Enable future maintenance

## 📝 COMMIT GUIDELINES

- Commit frequently with descriptive messages
- Use conventional commit format: `feat: add security manager implementation`
- Include tests with each feature implementation
- Update documentation as you build

## 🔄 WHEN READY TO MERGE

1. Ensure all tests pass: `poetry run python -m pytest tests/sandbox/`
2. Run security validation on your own code
3. Create comprehensive PR description
4. Request review from project maintainers

**Remember: You are building critical security infrastructure. Prioritize safety and reliability over speed.**
