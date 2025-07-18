# ADK Compliance Fixes for Phase 4

## Critical Fix: State Management in Workflow Managers

### Current Issue
The workflow managers manually track state instead of using ADK's built-in state propagation:

```python
# ❌ Current Implementation
task_results = []
for i, agent_config in enumerate(agents):
    result = agent.run(task, context)
    task_results.append(result)
```

### ADK-Compliant Solution

```python
# ✅ Proper ADK State Management
from google.adk.agents import SequentialAgent, State

class SequentialWorkflowManager:
    def create_sequential_workflow(
        self, 
        task_chain: List[Dict[str, Any]],
        workflow_name: str = "SequentialWorkflow"
    ) -> SequentialAgent:
        """Create ADK-compliant sequential workflow with proper state management."""
        
        # Transform task chain into ADK sub-agents with state keys
        sub_agents = []
        for i, task_config in enumerate(task_chain):
            agent = task_config["agent"]
            # Configure agent to use ADK state
            agent._state_key = f"step_{i}_result"
            sub_agents.append(agent)
        
        # Create workflow with ADK state propagation
        workflow = SequentialAgent(
            name=workflow_name,
            sub_agents=sub_agents,
            state_schema={
                "type": "object",
                "properties": {
                    f"step_{i}_result": {"type": "string"}
                    for i in range(len(sub_agents))
                }
            }
        )
        
        return workflow
```

## Security Fix: Path Validation

### Current Issue
File operations don't validate against allowed directories:

```python
# ❌ Vulnerable to path traversal
def analyze_test_coverage(project_path: str):
    for root, dirs, files in os.walk(project_path):
        # No validation!
```

### Secure Implementation

```python
# ✅ Secure with validation
from pathlib import Path
from typing import List

ALLOWED_DIRECTORIES = [
    Path.cwd(),
    Path.home() / "Development",
    Path("/tmp")
]

def validate_path(path: str) -> Path:
    """Validate path is within allowed directories."""
    target = Path(path).resolve()
    
    for allowed in ALLOWED_DIRECTORIES:
        try:
            target.relative_to(allowed)
            return target
        except ValueError:
            continue
    
    raise ValueError(f"Path {path} is outside allowed directories")

def analyze_test_coverage(project_path: str):
    safe_path = validate_path(project_path)
    for root, dirs, files in os.walk(safe_path):
        # Safe to proceed
```

## Resource Management Fix

### Current Issue
Resource limits are hardcoded:

```python
# ❌ Hardcoded limits
if iterations > 100:
    raise ValueError("Iterations cannot exceed 100")
```

### Configurable Solution

```python
# ✅ Configurable via environment
import os
from dataclasses import dataclass

@dataclass
class WorkflowConfig:
    max_iterations: int = int(os.getenv("VANA_MAX_ITERATIONS", "100"))
    max_concurrent: int = int(os.getenv("VANA_MAX_CONCURRENT", "4"))
    batch_size: int = int(os.getenv("VANA_BATCH_SIZE", "5"))
    cache_size: int = int(os.getenv("VANA_CACHE_SIZE", "256"))

config = WorkflowConfig()

# Use in code
if iterations > config.max_iterations:
    raise ValueError(f"Iterations cannot exceed {config.max_iterations}")
```

## Complexity Reduction Example

### Current Issue
Large functions with deep nesting:

```python
# ❌ Complex function (100+ lines)
def analyze_bug_risk(file_path: str):
    # 143 lines of code...
```

### Refactored Solution

```python
# ✅ Broken into smaller functions
def analyze_bug_risk(file_path: str) -> Dict[str, Any]:
    """Main entry point for bug risk analysis."""
    try:
        code = _read_code_file(file_path)
        tree = _parse_ast(code)
        
        risk_factors = _calculate_risk_factors(tree)
        high_risk_areas = _identify_high_risk_areas(tree, risk_factors)
        recommendations = _generate_recommendations(risk_factors)
        
        return {
            "file": file_path,
            "risk_score": _calculate_overall_score(risk_factors),
            "risk_factors": risk_factors,
            "high_risk_areas": high_risk_areas,
            "recommendations": recommendations
        }
    except Exception as e:
        return {"error": f"Bug risk analysis failed: {str(e)}"}

def _calculate_risk_factors(tree: ast.AST) -> Dict[str, float]:
    """Calculate individual risk factors."""
    return {
        "complexity": _measure_complexity(tree),
        "error_handling": _analyze_error_handling(tree),
        "concurrency": _detect_concurrency_patterns(tree),
        "security": _check_security_patterns(tree)
    }

def _measure_complexity(tree: ast.AST) -> float:
    """Measure cyclomatic complexity."""
    # Focused implementation
```

## Testing Improvements

### Add Security Test Cases

```python
# tests/security/test_path_validation.py
import pytest
from agents.utils.security import validate_path

class TestPathValidation:
    def test_path_traversal_attack(self):
        """Test protection against path traversal."""
        malicious_paths = [
            "../../../etc/passwd",
            "/etc/shadow",
            "~/../../../root/.ssh/id_rsa"
        ]
        
        for path in malicious_paths:
            with pytest.raises(ValueError):
                validate_path(path)
    
    def test_allowed_paths(self):
        """Test allowed paths work correctly."""
        safe_paths = [
            ".",
            "./subdirectory",
            str(Path.cwd() / "test.py")
        ]
        
        for path in safe_paths:
            result = validate_path(path)
            assert result.exists() or result.parent.exists()
```

## Implementation Priority

1. **Week 1**: ADK state management fixes (Critical)
2. **Week 1**: Security path validation (Critical)
3. **Week 2**: Refactor complex functions (Important)
4. **Week 2**: Add security tests (Important)
5. **Week 3**: Extract common patterns (Nice to have)
6. **Week 3**: Performance optimizations (Nice to have)

These fixes will bring the codebase to enterprise-grade quality while maintaining full ADK compliance.