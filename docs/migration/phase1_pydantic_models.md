# Phase 1: Pydantic Models Implementation

## Overview
This phase creates all Pydantic models required for ADK-native VANA. These models ensure type safety, validation, and structured communication between agents.

**Branch**: `adk-models`  
**Duration**: 4 hours  
**Dependencies**: None  
**Assigned Agent**: Agent 1

## Prerequisites
- Python 3.13+ environment
- Access to VANA codebase
- Understanding of ADK patterns from ADK_SOURCE_OF_TRUTH.md

## Deliverables Checklist
- [ ] Create `lib/models/` directory structure
- [ ] Implement base models in `lib/models/base.py`
- [ ] Implement specialist models in `lib/models/specialists/`
- [ ] Create unified exports in `lib/models/__init__.py`
- [ ] Write comprehensive tests in `tests/models/`
- [ ] Create validation script
- [ ] Document all models

## Implementation

### Step 1: Create Directory Structure
```bash
mkdir -p lib/models/specialists
mkdir -p tests/models
touch lib/models/__init__.py
touch lib/models/base.py
touch lib/models/specialists/__init__.py
```

### Step 2: Base Models (`lib/models/base.py`)

```python
"""
Base Pydantic models for VANA ADK migration.
Following ADK patterns for structured outputs.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
from enum import Enum


class Severity(str, Enum):
    """Severity levels for issues and findings."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ToolResult(BaseModel):
    """
    Standard result format for all tools.
    ADK tools must return dictionaries - this model validates that structure.
    """
    tool_name: str = Field(..., description="Name of the tool that was executed")
    success: bool = Field(..., description="Whether the tool executed successfully")
    result: Any = Field(..., description="The actual result data from the tool")
    error: Optional[str] = Field(None, description="Error message if success is False")
    execution_time_ms: float = Field(..., ge=0, description="Execution time in milliseconds")
    timestamp: datetime = Field(default_factory=datetime.now, description="When the tool was executed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional tool-specific metadata")
    
    @field_validator('execution_time_ms')
    def validate_execution_time(cls, v):
        if v < 0:
            raise ValueError("Execution time cannot be negative")
        return v
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RoutingDecision(BaseModel):
    """
    Output schema for the router agent.
    Determines how to handle user requests.
    """
    routing_type: Literal["specialist", "parallel", "sequential", "loop"] = Field(
        ..., 
        description="Type of routing: single specialist or workflow type"
    )
    target_specialist: Optional[str] = Field(
        None,
        description="Name of the specialist to route to (if routing_type is 'specialist')"
    )
    specialists_needed: List[str] = Field(
        default_factory=list,
        description="List of specialists needed for workflow routing"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence level in the routing decision"
    )
    reasoning: str = Field(
        ...,
        min_length=10,
        description="Explanation of why this routing was chosen"
    )
    is_security_critical: bool = Field(
        default=False,
        description="Whether this request has security implications"
    )
    requires_refinement: bool = Field(
        default=False,
        description="Whether this needs iterative refinement (loop workflow)"
    )
    max_iterations: Optional[int] = Field(
        None,
        ge=1,
        le=10,
        description="Maximum iterations for loop workflows"
    )
    priority: Severity = Field(
        default=Severity.MEDIUM,
        description="Priority level for the request"
    )
    
    @field_validator('target_specialist')
    def validate_specialist_name(cls, v, values):
        if values.get('routing_type') == 'specialist' and not v:
            raise ValueError("target_specialist required when routing_type is 'specialist'")
        
        valid_specialists = [
            "security", "architecture", "data_science", 
            "devops", "qa", "ui_ux", "content_creation", "research"
        ]
        
        if v and v not in valid_specialists:
            raise ValueError(f"Invalid specialist: {v}. Must be one of {valid_specialists}")
        
        return v
    
    @field_validator('specialists_needed')
    def validate_specialists_list(cls, v, values):
        routing_type = values.get('routing_type')
        if routing_type in ['parallel', 'sequential'] and len(v) < 2:
            raise ValueError(f"{routing_type} routing requires at least 2 specialists")
        return v


class SpecialistResponse(BaseModel):
    """
    Standard response format for all specialist agents.
    Ensures consistent output structure across all specialists.
    """
    specialist_name: str = Field(..., description="Name of the specialist that processed the request")
    task_id: str = Field(..., description="Unique identifier for this task")
    success: bool = Field(..., description="Whether the task completed successfully")
    
    # Core results
    summary: str = Field(
        ..., 
        min_length=20,
        max_length=500,
        description="Brief summary of the analysis/work performed"
    )
    detailed_findings: Dict[str, Any] = Field(
        ...,
        description="Detailed findings organized by category"
    )
    
    # Metrics
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence in the results (0-1)"
    )
    tools_used: List[ToolResult] = Field(
        default_factory=list,
        description="Tools that were used during processing"
    )
    total_execution_time_ms: float = Field(
        ...,
        ge=0,
        description="Total time for all operations"
    )
    
    # Follow-up actions
    recommendations: List[str] = Field(
        default_factory=list,
        description="Recommended next steps or actions"
    )
    requires_human_review: bool = Field(
        default=False,
        description="Whether human review is recommended"
    )
    follow_up_specialists: List[str] = Field(
        default_factory=list,
        description="Other specialists that should be consulted"
    )
    
    # Additional context
    context_used: Dict[str, Any] = Field(
        default_factory=dict,
        description="Context information used in analysis"
    )
    assumptions_made: List[str] = Field(
        default_factory=list,
        description="Any assumptions made during analysis"
    )
    limitations: List[str] = Field(
        default_factory=list,
        description="Known limitations of the analysis"
    )
    
    @field_validator('tools_used')
    def validate_tool_limit(cls, v):
        if len(v) > 6:
            raise ValueError(f"Specialist used {len(v)} tools, but ADK limit is 6")
        return v
    
    def get_total_tool_time(self) -> float:
        """Calculate total time spent in tools."""
        return sum(tool.execution_time_ms for tool in self.tools_used)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TaskState(BaseModel):
    """
    Represents the state of a task through the system.
    Used for tracking and debugging.
    """
    task_id: str = Field(..., description="Unique task identifier")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Routing information
    routing_decision: Optional[RoutingDecision] = None
    
    # Specialist results
    specialist_results: Dict[str, SpecialistResponse] = Field(
        default_factory=dict,
        description="Results from each specialist keyed by specialist name"
    )
    
    # Workflow state
    current_phase: str = Field(default="routing", description="Current phase of processing")
    workflow_type: Optional[str] = None
    iteration_count: int = Field(default=0, description="For loop workflows")
    
    # Final output
    final_response: Optional[str] = None
    total_execution_time_ms: float = Field(default=0.0)
    
    def add_specialist_result(self, specialist_name: str, result: SpecialistResponse):
        """Add a specialist result and update timestamps."""
        self.specialist_results[specialist_name] = result
        self.updated_at = datetime.now()
        self.total_execution_time_ms += result.total_execution_time_ms
```

### Step 3: Security Specialist Model (`lib/models/specialists/security.py`)

```python
"""
Security specialist Pydantic models.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from ..base import Severity


class Vulnerability(BaseModel):
    """Represents a security vulnerability."""
    id: str = Field(..., description="Unique identifier for the vulnerability")
    type: str = Field(..., description="Type of vulnerability (e.g., SQL Injection, XSS)")
    severity: Severity = Field(..., description="Severity level")
    description: str = Field(..., description="Detailed description of the vulnerability")
    affected_files: List[str] = Field(default_factory=list, description="Files containing the vulnerability")
    line_numbers: Dict[str, List[int]] = Field(
        default_factory=dict,
        description="Line numbers per file where vulnerability exists"
    )
    cwe_id: Optional[str] = Field(None, description="Common Weakness Enumeration ID")
    owasp_category: Optional[str] = Field(None, description="OWASP Top 10 category")


class SecurityScanResult(BaseModel):
    """
    Output schema for security specialist.
    Based on ADK structured output pattern.
    """
    scan_type: str = Field(..., description="Type of security scan performed")
    vulnerabilities_found: int = Field(..., ge=0, description="Total number of vulnerabilities")
    critical_issues: List[str] = Field(
        default_factory=list,
        description="List of critical security issues requiring immediate attention"
    )
    
    # Detailed findings
    vulnerabilities: List[Vulnerability] = Field(
        default_factory=list,
        description="Detailed vulnerability information"
    )
    
    # Risk assessment
    overall_risk_score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Overall security risk score (0-10)"
    )
    risk_factors: Dict[str, float] = Field(
        default_factory=dict,
        description="Individual risk factor scores"
    )
    
    # Remediation
    remediation_steps: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Prioritized list of remediation steps"
    )
    estimated_remediation_effort: str = Field(
        ...,
        description="Estimated effort to fix all issues (e.g., '2-3 days')"
    )
    
    # Compliance
    compliance_status: Dict[str, bool] = Field(
        default_factory=dict,
        description="Compliance with various security standards"
    )
    
    # Additional analysis
    attack_surface: Dict[str, Any] = Field(
        default_factory=dict,
        description="Analysis of the application's attack surface"
    )
    security_best_practices: Dict[str, bool] = Field(
        default_factory=dict,
        description="Adherence to security best practices"
    )
    
    def get_vulnerabilities_by_severity(self, severity: Severity) -> List[Vulnerability]:
        """Get all vulnerabilities of a specific severity."""
        return [v for v in self.vulnerabilities if v.severity == severity]
    
    def get_critical_count(self) -> int:
        """Get count of critical vulnerabilities."""
        return len(self.get_vulnerabilities_by_severity(Severity.CRITICAL))
```

### Step 4: Architecture Specialist Model (`lib/models/specialists/architecture.py`)

```python
"""
Architecture specialist Pydantic models.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Set
from ..base import Severity


class Component(BaseModel):
    """Represents an architectural component."""
    name: str = Field(..., description="Component name")
    type: str = Field(..., description="Component type (e.g., service, module, library)")
    path: str = Field(..., description="File system path to component")
    dependencies: List[str] = Field(default_factory=list, description="Direct dependencies")
    dependents: List[str] = Field(default_factory=list, description="Components that depend on this")
    complexity_score: float = Field(..., ge=0, le=100, description="Complexity metric")
    test_coverage: Optional[float] = Field(None, ge=0, le=100, description="Test coverage percentage")


class DesignPattern(BaseModel):
    """Represents a detected design pattern."""
    pattern_name: str = Field(..., description="Name of the design pattern")
    pattern_type: str = Field(..., description="Category (e.g., creational, structural, behavioral)")
    locations: List[str] = Field(..., description="Where the pattern is implemented")
    quality_score: float = Field(..., ge=0, le=10, description="Implementation quality")
    notes: Optional[str] = Field(None, description="Additional notes about the implementation")


class ArchitectureAnalysis(BaseModel):
    """
    Output schema for architecture specialist.
    Provides comprehensive architectural analysis.
    """
    # Structure analysis
    component_count: int = Field(..., ge=0, description="Total number of components")
    components: List[Component] = Field(default_factory=list, description="Detailed component information")
    dependency_graph: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Complete dependency graph"
    )
    circular_dependencies: List[List[str]] = Field(
        default_factory=list,
        description="Detected circular dependencies"
    )
    
    # Design patterns
    design_patterns: List[DesignPattern] = Field(
        default_factory=list,
        description="Detected design patterns"
    )
    anti_patterns: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Detected anti-patterns and code smells"
    )
    
    # Quality metrics
    overall_quality_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Overall architecture quality score"
    )
    maintainability_index: float = Field(
        ...,
        ge=0,
        le=100,
        description="Maintainability index"
    )
    coupling_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Coupling metric (lower is better)"
    )
    cohesion_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Cohesion metric (higher is better)"
    )
    
    # Architecture style
    architecture_style: str = Field(
        ...,
        description="Identified architecture style (e.g., layered, microservices, monolithic)"
    )
    style_adherence: float = Field(
        ...,
        ge=0,
        le=100,
        description="How well the code adheres to the stated style"
    )
    
    # Improvement suggestions
    improvement_suggestions: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Prioritized improvement suggestions"
    )
    refactoring_candidates: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Components that would benefit from refactoring"
    )
    
    # Technical debt
    technical_debt_score: float = Field(
        ...,
        ge=0,
        le=10,
        description="Estimated technical debt level"
    )
    debt_hotspots: List[str] = Field(
        default_factory=list,
        description="Areas with highest technical debt"
    )
    
    def get_most_complex_components(self, limit: int = 5) -> List[Component]:
        """Get the most complex components."""
        return sorted(self.components, key=lambda c: c.complexity_score, reverse=True)[:limit]
    
    def get_components_by_type(self, component_type: str) -> List[Component]:
        """Get all components of a specific type."""
        return [c for c in self.components if c.type == component_type]
```

### Step 5: Create Additional Specialist Models

Create similar models for each specialist in `lib/models/specialists/`:
- `data_science.py` - DataAnalysisResult
- `devops.py` - DevOpsAnalysis
- `qa.py` - QATestResult
- `ui_ux.py` - UIUXAnalysis
- `content_creation.py` - ContentResult
- `research.py` - ResearchResult

### Step 6: Unified Exports (`lib/models/__init__.py`)

```python
"""
Unified exports for all VANA Pydantic models.
Import all models from this module.
"""

# Base models
from .base import (
    Severity,
    ToolResult,
    RoutingDecision,
    SpecialistResponse,
    TaskState
)

# Specialist models
from .specialists.security import (
    Vulnerability,
    SecurityScanResult
)

from .specialists.architecture import (
    Component,
    DesignPattern,
    ArchitectureAnalysis
)

# Add imports for other specialists as they're created
# from .specialists.data_science import DataAnalysisResult
# from .specialists.devops import DevOpsAnalysis
# from .specialists.qa import QATestResult
# from .specialists.ui_ux import UIUXAnalysis
# from .specialists.content_creation import ContentResult
# from .specialists.research import ResearchResult

__all__ = [
    # Base
    'Severity',
    'ToolResult',
    'RoutingDecision',
    'SpecialistResponse',
    'TaskState',
    # Security
    'Vulnerability',
    'SecurityScanResult',
    # Architecture
    'Component',
    'DesignPattern',
    'ArchitectureAnalysis',
    # Add others as created
]
```

### Step 7: Create Tests (`tests/models/test_base_models.py`)

```python
"""
Tests for base Pydantic models.
Ensures all validation rules work correctly.
"""

import pytest
from datetime import datetime
from lib.models.base import (
    Severity, ToolResult, RoutingDecision, 
    SpecialistResponse, TaskState
)


class TestToolResult:
    """Test ToolResult model validation."""
    
    def test_valid_tool_result(self):
        """Test creating a valid tool result."""
        result = ToolResult(
            tool_name="test_tool",
            success=True,
            result={"data": "test"},
            execution_time_ms=100.5
        )
        assert result.tool_name == "test_tool"
        assert result.success is True
        assert result.execution_time_ms == 100.5
        assert isinstance(result.timestamp, datetime)
    
    def test_negative_execution_time_fails(self):
        """Test that negative execution time raises error."""
        with pytest.raises(ValueError, match="Execution time cannot be negative"):
            ToolResult(
                tool_name="test_tool",
                success=True,
                result={},
                execution_time_ms=-1
            )
    
    def test_tool_result_with_error(self):
        """Test tool result with error."""
        result = ToolResult(
            tool_name="failing_tool",
            success=False,
            result=None,
            error="Tool failed due to timeout",
            execution_time_ms=5000
        )
        assert result.success is False
        assert result.error == "Tool failed due to timeout"
    
    def test_json_serialization(self):
        """Test that datetime serializes correctly."""
        result = ToolResult(
            tool_name="test",
            success=True,
            result={},
            execution_time_ms=10
        )
        json_data = result.model_dump_json()
        assert result.timestamp.isoformat() in json_data


class TestRoutingDecision:
    """Test RoutingDecision model validation."""
    
    def test_valid_specialist_routing(self):
        """Test routing to a single specialist."""
        routing = RoutingDecision(
            routing_type="specialist",
            target_specialist="security",
            confidence=0.95,
            reasoning="User query contains security-related keywords",
            is_security_critical=True
        )
        assert routing.routing_type == "specialist"
        assert routing.target_specialist == "security"
        assert routing.is_security_critical is True
    
    def test_specialist_routing_requires_target(self):
        """Test that specialist routing requires target_specialist."""
        with pytest.raises(ValueError, match="target_specialist required"):
            RoutingDecision(
                routing_type="specialist",
                confidence=0.9,
                reasoning="This should fail without target"
            )
    
    def test_invalid_specialist_name(self):
        """Test that invalid specialist names are rejected."""
        with pytest.raises(ValueError, match="Invalid specialist"):
            RoutingDecision(
                routing_type="specialist",
                target_specialist="invalid_specialist",
                confidence=0.9,
                reasoning="Testing invalid specialist"
            )
    
    def test_parallel_routing_requires_multiple_specialists(self):
        """Test that parallel routing needs at least 2 specialists."""
        with pytest.raises(ValueError, match="parallel routing requires at least 2"):
            RoutingDecision(
                routing_type="parallel",
                specialists_needed=["security"],  # Only one!
                confidence=0.85,
                reasoning="Testing parallel with one specialist"
            )
    
    def test_valid_parallel_routing(self):
        """Test valid parallel routing."""
        routing = RoutingDecision(
            routing_type="parallel",
            specialists_needed=["security", "architecture"],
            confidence=0.9,
            reasoning="Query requires both security and architecture analysis"
        )
        assert len(routing.specialists_needed) == 2
        assert "security" in routing.specialists_needed
    
    def test_confidence_bounds(self):
        """Test confidence must be between 0 and 1."""
        with pytest.raises(ValueError):
            RoutingDecision(
                routing_type="specialist",
                target_specialist="qa",
                confidence=1.5,  # Too high!
                reasoning="Testing confidence bounds"
            )


class TestSpecialistResponse:
    """Test SpecialistResponse model validation."""
    
    def test_valid_specialist_response(self):
        """Test creating a valid specialist response."""
        tool_result = ToolResult(
            tool_name="scan_tool",
            success=True,
            result={"vulnerabilities": 0},
            execution_time_ms=500
        )
        
        response = SpecialistResponse(
            specialist_name="security",
            task_id="task-123",
            success=True,
            summary="Security scan completed successfully with no vulnerabilities found",
            detailed_findings={"scan_results": {"vulnerabilities": 0}},
            confidence_score=0.98,
            tools_used=[tool_result],
            total_execution_time_ms=550,
            recommendations=["Continue regular security scans"],
            requires_human_review=False
        )
        
        assert response.specialist_name == "security"
        assert response.confidence_score == 0.98
        assert len(response.tools_used) == 1
        assert response.get_total_tool_time() == 500
    
    def test_tool_limit_enforcement(self):
        """Test that specialists can't use more than 6 tools."""
        tools = [
            ToolResult(
                tool_name=f"tool_{i}",
                success=True,
                result={},
                execution_time_ms=10
            )
            for i in range(7)  # 7 tools - too many!
        ]
        
        with pytest.raises(ValueError, match="ADK limit is 6"):
            SpecialistResponse(
                specialist_name="test",
                task_id="task-123",
                success=True,
                summary="This should fail due to too many tools",
                detailed_findings={},
                confidence_score=0.5,
                tools_used=tools,
                total_execution_time_ms=100
            )
    
    def test_summary_length_validation(self):
        """Test summary length constraints."""
        # Too short
        with pytest.raises(ValueError):
            SpecialistResponse(
                specialist_name="test",
                task_id="task-123",
                success=True,
                summary="Too short",  # Less than 20 chars
                detailed_findings={},
                confidence_score=0.5,
                total_execution_time_ms=100
            )
        
        # Too long
        with pytest.raises(ValueError):
            SpecialistResponse(
                specialist_name="test",
                task_id="task-123",
                success=True,
                summary="x" * 501,  # More than 500 chars
                detailed_findings={},
                confidence_score=0.5,
                total_execution_time_ms=100
            )


class TestTaskState:
    """Test TaskState model for tracking."""
    
    def test_task_state_creation(self):
        """Test creating a task state."""
        state = TaskState(task_id="test-123")
        assert state.task_id == "test-123"
        assert state.current_phase == "routing"
        assert state.iteration_count == 0
        assert len(state.specialist_results) == 0
    
    def test_add_specialist_result(self):
        """Test adding specialist results."""
        state = TaskState(task_id="test-123")
        
        response = SpecialistResponse(
            specialist_name="security",
            task_id="test-123",
            success=True,
            summary="Security analysis completed successfully",
            detailed_findings={"vulnerabilities": 0},
            confidence_score=0.95,
            total_execution_time_ms=1000
        )
        
        state.add_specialist_result("security", response)
        
        assert "security" in state.specialist_results
        assert state.total_execution_time_ms == 1000
        assert state.updated_at > state.created_at
```

### Step 8: Validation Script (`scripts/validate_phase1_models.py`)

```python
#!/usr/bin/env python3
"""
Validation script for Phase 1: Pydantic Models.
Ensures all models are properly implemented and follow ADK patterns.
"""

import sys
from pathlib import Path
import importlib
import inspect
from typing import List
from pydantic import BaseModel


def validate_models() -> List[str]:
    """Validate all Pydantic models are properly implemented."""
    errors = []
    
    # Check directory structure
    models_dir = Path("lib/models")
    if not models_dir.exists():
        errors.append("lib/models directory not found")
        return errors
    
    # Check required files
    required_files = [
        "lib/models/__init__.py",
        "lib/models/base.py",
        "lib/models/specialists/__init__.py",
        "lib/models/specialists/security.py",
        "lib/models/specialists/architecture.py",
    ]
    
    for file_path in required_files:
        if not Path(file_path).exists():
            errors.append(f"Required file missing: {file_path}")
    
    # Import and validate base models
    try:
        from lib.models import (
            ToolResult, RoutingDecision, 
            SpecialistResponse, TaskState
        )
        
        # Check all are Pydantic models
        for model in [ToolResult, RoutingDecision, SpecialistResponse, TaskState]:
            if not issubclass(model, BaseModel):
                errors.append(f"{model.__name__} is not a Pydantic BaseModel")
        
        # Test instantiation
        try:
            tool = ToolResult(
                tool_name="test",
                success=True,
                result={},
                execution_time_ms=10
            )
        except Exception as e:
            errors.append(f"Failed to create ToolResult: {e}")
            
    except ImportError as e:
        errors.append(f"Failed to import base models: {e}")
    
    # Check specialist models
    specialist_models = {
        "security": ["SecurityScanResult", "Vulnerability"],
        "architecture": ["ArchitectureAnalysis", "Component", "DesignPattern"],
    }
    
    for specialist, expected_models in specialist_models.items():
        try:
            module = importlib.import_module(f"lib.models.specialists.{specialist}")
            for model_name in expected_models:
                if not hasattr(module, model_name):
                    errors.append(f"Missing model: {model_name} in {specialist}")
                else:
                    model_class = getattr(module, model_name)
                    if not issubclass(model_class, BaseModel):
                        errors.append(f"{model_name} is not a Pydantic BaseModel")
        except ImportError as e:
            errors.append(f"Failed to import {specialist} models: {e}")
    
    # Validate __all__ exports
    try:
        from lib.models import __all__
        required_exports = [
            'ToolResult', 'RoutingDecision', 'SpecialistResponse',
            'SecurityScanResult', 'ArchitectureAnalysis'
        ]
        for export in required_exports:
            if export not in __all__:
                errors.append(f"Missing from __all__: {export}")
    except ImportError:
        errors.append("__all__ not defined in lib.models")
    
    return errors


def main():
    """Run validation and report results."""
    print("🔍 Validating Phase 1: Pydantic Models...")
    
    errors = validate_models()
    
    if errors:
        print("\n❌ Validation Failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("\n✅ All Pydantic models validated successfully!")
        print("\nPhase 1 Deliverables Complete:")
        print("  ✓ Base models implemented")
        print("  ✓ Specialist models created")
        print("  ✓ Proper exports configured")
        print("  ✓ All models are Pydantic BaseModels")
        print("  ✓ Validation rules enforced")


if __name__ == "__main__":
    main()
```

## Testing Instructions

1. Run unit tests:
```bash
pytest tests/models/ -v --cov=lib/models
```

2. Run validation script:
```bash
python scripts/validate_phase1_models.py
```

3. Test model serialization:
```python
from lib.models import RoutingDecision
routing = RoutingDecision(
    routing_type="specialist",
    target_specialist="security",
    confidence=0.95,
    reasoning="Security-related query detected"
)
print(routing.model_dump_json(indent=2))
```

## Integration Points

These models will be used by:
- **Phase 2**: Tools will return data matching ToolResult
- **Phase 3-10**: Specialists will use their respective output schemas
- **Phase 11**: Orchestrator will use RoutingDecision for dynamic routing
- **Phase 12**: API will serialize these models for responses

## Acceptance Criteria Checklist

- [ ] All models inherit from Pydantic BaseModel
- [ ] Field validation works correctly (test with invalid data)
- [ ] JSON serialization/deserialization works
- [ ] All specialist models have output schemas
- [ ] ToolResult enforces dictionary return type
- [ ] RoutingDecision validates specialist names
- [ ] SpecialistResponse enforces 6-tool limit
- [ ] Test coverage is >95%
- [ ] Validation script passes
- [ ] Models follow ADK patterns from source of truth

## Git Commit

Once all acceptance criteria are met:
```bash
git add -A
git commit -m "feat(models): implement ADK-compliant Pydantic models for VANA

- Add base models (ToolResult, RoutingDecision, SpecialistResponse)
- Add specialist models (Security, Architecture)
- Implement comprehensive validation rules
- Add full test coverage
- Create validation script
- Follow ADK structured output patterns"

git push origin adk-models
```

## Next Steps

After this phase is complete and merged:
1. Phase 2 can use these models for tool consolidation
2. Phases 3-10 can implement specialists with proper output schemas
3. Phase 11 can use RoutingDecision for orchestration