"""
Pytest configuration for hook validation system integration tests.
Provides fixtures, test utilities, and configuration for comprehensive testing.
"""

import pytest
import asyncio
import tempfile
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from unittest.mock import Mock, patch, AsyncMock


# Test configuration
pytest_plugins = [
    "pytest_asyncio",
]


def pytest_configure(config):
    """Configure pytest for hook validation testing"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as performance test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "hook_validation: mark test as hook validation test"
    )


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_claude_code_tools():
    """Mock Claude Code tools for testing hook integration"""
    tools = Mock()
    
    # Mock Read tool
    tools.read = AsyncMock()
    tools.read.return_value = {"content": "mock file content", "success": True}
    
    # Mock Write tool
    tools.write = AsyncMock()
    tools.write.return_value = {"success": True, "file_path": "test.txt"}
    
    # Mock Edit tool
    tools.edit = AsyncMock()
    tools.edit.return_value = {"success": True, "changes_applied": 1}
    
    # Mock Bash tool
    tools.bash = AsyncMock()
    tools.bash.return_value = {"exit_code": 0, "output": "command executed"}
    
    # Mock Glob tool
    tools.glob = AsyncMock()
    tools.glob.return_value = {"files": ["file1.txt", "file2.txt"]}
    
    # Mock Grep tool
    tools.grep = AsyncMock()
    tools.grep.return_value = {"matches": 5, "files": ["file1.txt"]}
    
    return tools


@pytest.fixture
def mock_claude_flow_hooks():
    """Mock Claude Flow hook system for testing"""
    hooks = Mock()
    
    # Mock hook methods
    hooks.pre_task = AsyncMock()
    hooks.post_task = AsyncMock()
    hooks.pre_edit = AsyncMock()
    hooks.post_edit = AsyncMock()
    hooks.session_end = AsyncMock()
    
    # Mock hook responses
    hooks.pre_task.return_value = {"task_id": "test-123", "agents_spawned": 2}
    hooks.post_task.return_value = {"performance_metrics": {"execution_time": 150}}
    hooks.pre_edit.return_value = {"validation_passed": True}
    hooks.post_edit.return_value = {"memory_updated": True}
    hooks.session_end.return_value = {"session_exported": True}
    
    return hooks


@pytest.fixture
def prd_validation_rules():
    """PRD validation rules for testing"""
    return {
        "technology_stack": {
            "approved_ui_frameworks": ["shadcn/ui", "@radix-ui"],
            "forbidden_ui_frameworks": ["material-ui", "@mui", "ant-design", "custom-ui-lib"],
            "required_react_version": "^18.3.1",
            "required_next_version": "^15.4.6"
        },
        "accessibility": {
            "required_attributes": ["data-testid"],
            "wcag_compliance": "AA",
            "contrast_ratio": 4.5
        },
        "performance": {
            "max_bundle_size_kb": 250,
            "max_fcp_ms": 1500,
            "max_lcp_ms": 2500,
            "max_useState_hooks": 5,
            "max_useEffect_hooks": 3
        },
        "security": {
            "forbidden_patterns": ["dangerouslySetInnerHTML", "eval(", "document.write"],
            "required_sanitization": ["DOMPurify"],
            "csp_compliance": True
        },
        "testing": {
            "min_coverage_percent": 80,
            "required_test_patterns": ["describe", "test", "expect"],
            "accessibility_testing": True
        }
    }


@pytest.fixture
def test_workspace():
    """Create temporary workspace for testing"""
    with tempfile.TemporaryDirectory() as temp_dir:
        workspace = Path(temp_dir)
        
        # Create project structure
        project_dirs = [
            "frontend/src/components",
            "frontend/src/components/ui", 
            "frontend/src/lib",
            "frontend/src/hooks",
            "frontend/src/stores",
            "frontend/__tests__",
            "app",
            "tests/unit",
            "tests/integration",
            "tests/e2e",
            ".claude_workspace/reports"
        ]
        
        for dir_path in project_dirs:
            (workspace / dir_path).mkdir(parents=True, exist_ok=True)
        
        # Create essential files
        (workspace / "frontend" / "package.json").write_text(json.dumps({
            "name": "vana-frontend",
            "version": "1.0.0",
            "dependencies": {
                "react": "^18.3.1",
                "next": "^15.4.6"
            }
        }))
        
        (workspace / "frontend" / "tsconfig.json").write_text(json.dumps({
            "compilerOptions": {
                "strict": True,
                "jsx": "preserve"
            }
        }))
        
        yield workspace


class MockHookValidationSystem:
    """Mock hook validation system for comprehensive testing"""
    
    def __init__(self, prd_rules: Dict[str, Any]):
        self.prd_rules = prd_rules
        self.validation_logs = []
        self.performance_metrics = {}
        self.blocked_operations = []
        self.suggestions_given = []
    
    async def validate_file_operation(self, operation: str, file_path: str, content: str = None) -> Dict[str, Any]:
        """Mock file operation validation"""
        validation_result = {
            "validated": True,
            "violations": [],
            "warnings": [],
            "suggestions": [],
            "compliance_score": 100,
            "operation": operation,
            "file_path": file_path,
            "timestamp": time.time()
        }
        
        if content and file_path.endswith('.tsx'):
            # Technology stack validation
            forbidden_ui = self.prd_rules["technology_stack"]["forbidden_ui_frameworks"]
            for forbidden in forbidden_ui:
                if forbidden in content:
                    validation_result.update({
                        "validated": False,
                        "violations": [f"Forbidden UI framework detected: {forbidden}"],
                        "suggestions": ["Use shadcn/ui components instead"],
                        "compliance_score": 20
                    })
                    self.blocked_operations.append({
                        "operation": operation,
                        "file_path": file_path,
                        "reason": f"Forbidden UI framework: {forbidden}"
                    })
                    break
            
            # Accessibility validation
            if "onClick" in content and "data-testid" not in content:
                validation_result["warnings"].append("Interactive element missing data-testid")
                validation_result["suggestions"].append("Add data-testid for testing")
                validation_result["compliance_score"] -= 15
                self.suggestions_given.append("Add data-testid attributes")
            
            # Performance validation
            usestate_count = content.count("useState")
            useeffect_count = content.count("useEffect")
            
            if usestate_count > self.prd_rules["performance"]["max_useState_hooks"]:
                validation_result["warnings"].append("Too many useState hooks detected")
                validation_result["suggestions"].append("Consider using useReducer or Zustand")
                validation_result["compliance_score"] -= 10
                self.suggestions_given.append("Optimize state management")
            
            if useeffect_count > self.prd_rules["performance"]["max_useEffect_hooks"]:
                validation_result["warnings"].append("Too many useEffect hooks detected")
                validation_result["suggestions"].append("Combine related effects")
                validation_result["compliance_score"] -= 10
                self.suggestions_given.append("Optimize effects")
            
            # Security validation
            forbidden_patterns = self.prd_rules["security"]["forbidden_patterns"]
            for pattern in forbidden_patterns:
                if pattern in content:
                    validation_result["warnings"].append(f"Security risk detected: {pattern}")
                    validation_result["suggestions"].append("Use safe alternatives")
                    validation_result["compliance_score"] -= 20
                    self.suggestions_given.append("Fix security issues")
        
        self.validation_logs.append(validation_result)
        return validation_result
    
    async def track_performance(self, operation: str, file_path: str, execution_time_ms: float):
        """Mock performance tracking"""
        self.performance_metrics[file_path] = {
            "operation": operation,
            "execution_time_ms": execution_time_ms,
            "timestamp": time.time()
        }
    
    def get_validation_summary(self) -> Dict[str, Any]:
        """Get summary of all validations performed"""
        total_validations = len(self.validation_logs)
        passed_validations = sum(1 for v in self.validation_logs if v["validated"])
        
        return {
            "total_validations": total_validations,
            "passed_validations": passed_validations,
            "failed_validations": total_validations - passed_validations,
            "success_rate": (passed_validations / total_validations * 100) if total_validations > 0 else 0,
            "blocked_operations": len(self.blocked_operations),
            "suggestions_given": len(set(self.suggestions_given)),
            "average_compliance_score": sum(v["compliance_score"] for v in self.validation_logs) / total_validations if total_validations > 0 else 0
        }


@pytest.fixture
def mock_hook_validation_system(prd_validation_rules):
    """Fixture providing mock hook validation system"""
    return MockHookValidationSystem(prd_validation_rules)


class TestFileGenerator:
    """Generate test files for validation testing"""
    
    @staticmethod
    def create_valid_component() -> str:
        """Create valid React component following PRD"""
        return '''
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TestComponentProps {
  title: string
  onAction: () => void
}

export const TestComponent: React.FC<TestComponentProps> = ({ title, onAction }) => {
  return (
    <Card data-testid="test-component" className="w-full max-w-md">
      <CardHeader>
        <CardTitle data-testid="component-title">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          data-testid="action-button"
          onClick={onAction}
          variant="default"
        >
          Take Action
        </Button>
      </CardContent>
    </Card>
  )
}
'''
    
    @staticmethod
    def create_invalid_component_ui_framework() -> str:
        """Create component using forbidden UI framework"""
        return '''
import React from 'react'
import { Button } from '@mui/material'
import { TextField } from '@mui/material'

export const InvalidComponent = () => {
  return (
    <div>
      <TextField label="Name" />
      <Button variant="contained">Submit</Button>
    </div>
  )
}
'''
    
    @staticmethod
    def create_performance_heavy_component() -> str:
        """Create component with performance issues"""
        return '''
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export const HeavyComponent = () => {
  const [data1, setData1] = useState([])
  const [data2, setData2] = useState([])
  const [data3, setData3] = useState([])
  const [data4, setData4] = useState([])
  const [data5, setData5] = useState([])
  const [data6, setData6] = useState([])
  
  useEffect(() => {
    setData1(Array.from({ length: 1000 }, (_, i) => i))
  }, [])
  
  useEffect(() => {
    setData2(Array.from({ length: 1000 }, (_, i) => i * 2))
  }, [])
  
  useEffect(() => {
    setData3(Array.from({ length: 1000 }, (_, i) => i * 3))
  }, [])
  
  useEffect(() => {
    setData4(Array.from({ length: 1000 }, (_, i) => i * 4))
  }, [])
  
  return (
    <div>
      <h2>Heavy Component</h2>
      {data1.map(item => <div key={item}>{item}</div>)}
      {data2.map(item => <div key={item}>{item}</div>)}
      {data3.map(item => <div key={item}>{item}</div>)}
      {data4.map(item => <div key={item}>{item}</div>)}
      <Button>Process All</Button>
    </div>
  )
}
'''
    
    @staticmethod
    def create_security_risk_component() -> str:
        """Create component with security risks"""
        return '''
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export const UnsafeComponent = () => {
  const [userInput, setUserInput] = useState('')
  
  return (
    <div>
      <input 
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />
      <div 
        dangerouslySetInnerHTML={{ __html: userInput }}
      />
      <Button>Submit</Button>
    </div>
  )
}
'''
    
    @staticmethod
    def create_accessibility_missing_component() -> str:
        """Create component missing accessibility attributes"""
        return '''
import React from 'react'
import { Button } from '@/components/ui/button'

export const AccessibilityMissingComponent = () => {
  const handleClick = () => {
    console.log('clicked')
  }
  
  return (
    <div>
      <h2>Test Component</h2>
      <Button onClick={handleClick}>
        Click Me
      </Button>
    </div>
  )
}
'''
    
    @staticmethod
    def create_comprehensive_test() -> str:
        """Create comprehensive test file"""
        return '''
import { render, screen, fireEvent } from '@testing-library/react'
import { TestComponent } from '../TestComponent'

describe('TestComponent', () => {
  const mockAction = jest.fn()
  
  beforeEach(() => {
    mockAction.mockClear()
  })
  
  test('renders component with title', () => {
    render(<TestComponent title="Test Title" onAction={mockAction} />)
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument()
    expect(screen.getByTestId('component-title')).toHaveTextContent('Test Title')
  })
  
  test('calls onAction when button is clicked', () => {
    render(<TestComponent title="Test Title" onAction={mockAction} />)
    
    fireEvent.click(screen.getByTestId('action-button'))
    expect(mockAction).toHaveBeenCalledTimes(1)
  })
  
  test('has proper accessibility attributes', () => {
    render(<TestComponent title="Test Title" onAction={mockAction} />)
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument()
    expect(screen.getByTestId('component-title')).toBeInTheDocument()
    expect(screen.getByTestId('action-button')).toBeInTheDocument()
  })
})
'''


@pytest.fixture
def test_file_generator():
    """Fixture providing test file generator"""
    return TestFileGenerator


# Performance testing utilities
@pytest.fixture
def performance_tracker():
    """Performance tracking utilities"""
    class PerformanceTracker:
        def __init__(self):
            self.measurements = []
        
        def measure_execution_time(self, func, *args, **kwargs):
            start_time = time.perf_counter()
            result = func(*args, **kwargs)
            end_time = time.perf_counter()
            
            execution_time = (end_time - start_time) * 1000  # Convert to ms
            self.measurements.append({
                "function": func.__name__,
                "execution_time_ms": execution_time,
                "timestamp": time.time()
            })
            
            return result, execution_time
        
        async def measure_async_execution_time(self, coro):
            start_time = time.perf_counter()
            result = await coro
            end_time = time.perf_counter()
            
            execution_time = (end_time - start_time) * 1000  # Convert to ms
            self.measurements.append({
                "function": "async_operation",
                "execution_time_ms": execution_time,
                "timestamp": time.time()
            })
            
            return result, execution_time
        
        def get_average_execution_time(self):
            if not self.measurements:
                return 0
            return sum(m["execution_time_ms"] for m in self.measurements) / len(self.measurements)
        
        def get_total_execution_time(self):
            return sum(m["execution_time_ms"] for m in self.measurements)
    
    return PerformanceTracker()


# Test data fixtures
@pytest.fixture
def sample_test_data():
    """Sample test data for various test scenarios"""
    return {
        "valid_files": [
            ("components/Button.tsx", TestFileGenerator.create_valid_component()),
            ("components/__tests__/Button.test.tsx", TestFileGenerator.create_comprehensive_test())
        ],
        "invalid_files": [
            ("components/InvalidUI.tsx", TestFileGenerator.create_invalid_component_ui_framework()),
            ("components/Heavy.tsx", TestFileGenerator.create_performance_heavy_component()),
            ("components/Unsafe.tsx", TestFileGenerator.create_security_risk_component()),
            ("components/NoA11y.tsx", TestFileGenerator.create_accessibility_missing_component())
        ],
        "test_scenarios": [
            {
                "name": "valid_component_creation",
                "files": [("components/Valid.tsx", TestFileGenerator.create_valid_component())],
                "expected_validation": True,
                "expected_violations": 0
            },
            {
                "name": "ui_framework_violation",
                "files": [("components/Invalid.tsx", TestFileGenerator.create_invalid_component_ui_framework())],
                "expected_validation": False,
                "expected_violations": 1
            },
            {
                "name": "performance_warning",
                "files": [("components/Heavy.tsx", TestFileGenerator.create_performance_heavy_component())],
                "expected_validation": True,
                "expected_warnings": 2
            }
        ]
    }


# Async test utilities
@pytest.fixture
def async_test_utilities():
    """Utilities for async testing"""
    class AsyncTestUtilities:
        @staticmethod
        async def wait_for_condition(condition_func, timeout=5.0, interval=0.1):
            """Wait for a condition to become true"""
            start_time = time.time()
            while time.time() - start_time < timeout:
                if condition_func():
                    return True
                await asyncio.sleep(interval)
            return False
        
        @staticmethod
        async def simulate_async_file_operation(operation, file_path, content=None, delay_ms=50):
            """Simulate async file operation with realistic delay"""
            await asyncio.sleep(delay_ms / 1000)  # Convert ms to seconds
            
            return {
                "operation": operation,
                "file_path": file_path,
                "content_length": len(content) if content else 0,
                "success": True,
                "timestamp": time.time()
            }
    
    return AsyncTestUtilities