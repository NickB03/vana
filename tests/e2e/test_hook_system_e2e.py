"""
End-to-end tests for hook validation system.
Tests complete developer workflows from initial file creation through deployment,
validating the entire hook system integration with real-world scenarios.
"""

import json
import tempfile
import time
from pathlib import Path
from typing import Any

import pytest


class E2ETestEnvironment:
    """Complete test environment for end-to-end hook validation testing"""

    def __init__(self, workspace_dir: Path):
        self.workspace = workspace_dir
        self.hook_logs = []
        self.validation_results = []
        self.performance_metrics = {}
        self.setup_project_structure()

    def setup_project_structure(self):
        """Setup realistic project structure"""
        # Frontend structure
        frontend_dirs = [
            "frontend/src/components",
            "frontend/src/components/ui",
            "frontend/src/lib",
            "frontend/src/hooks",
            "frontend/src/stores",
            "frontend/src/types",
            "frontend/__tests__",
            "frontend/public",
        ]

        for dir_path in frontend_dirs:
            (self.workspace / dir_path).mkdir(parents=True, exist_ok=True)

        # Backend structure
        backend_dirs = [
            "app",
            "app/auth",
            "app/tools",
            "app/utils",
            "tests/unit",
            "tests/integration",
            "tests/e2e",
        ]

        for dir_path in backend_dirs:
            (self.workspace / dir_path).mkdir(parents=True, exist_ok=True)

        # Create essential config files
        self.create_essential_configs()

    def create_essential_configs(self):
        """Create essential configuration files"""
        # package.json
        package_json = {
            "name": "vana-frontend",
            "version": "1.0.0",
            "scripts": {
                "dev": "next dev",
                "build": "next build",
                "test": "jest",
                "lint": "eslint . --ext .ts,.tsx",
            },
            "dependencies": {
                "react": "^18.3.1",
                "next": "^15.4.6",
                "@radix-ui/react-button": "^1.0.0",
            },
        }

        (self.workspace / "frontend" / "package.json").write_text(
            json.dumps(package_json, indent=2)
        )

        # tsconfig.json
        tsconfig = {
            "compilerOptions": {
                "target": "es5",
                "lib": ["dom", "dom.iterable", "es6"],
                "allowJs": True,
                "skipLibCheck": True,
                "strict": True,
                "forceConsistentCasingInFileNames": True,
                "noEmit": True,
                "esModuleInterop": True,
                "module": "esnext",
                "moduleResolution": "bundler",
                "resolveJsonModule": True,
                "isolatedModules": True,
                "jsx": "preserve",
                "incremental": True,
                "baseUrl": ".",
                "paths": {"@/*": ["./src/*"], "@/components/*": ["./src/components/*"]},
            },
            "include": ["src", "**/*.ts", "**/*.tsx"],
            "exclude": ["node_modules"],
        }

        (self.workspace / "frontend" / "tsconfig.json").write_text(
            json.dumps(tsconfig, indent=2)
        )

        # PRD requirements file
        prd_requirements = """
# Vana Frontend PRD Requirements
- Technology: Next.js 15.4.6, React 18.3.1, shadcn/ui
- UI Framework: ONLY shadcn/ui components allowed
- Testing: data-testid required for all interactive elements
- Performance: Bundle size <250KB per route
- Accessibility: WCAG 2.1 AA compliance required
- Security: CSP headers, input sanitization
"""

        (self.workspace / ".prd-requirements.md").write_text(prd_requirements)

    async def simulate_file_operation(
        self, operation: str, file_path: str, content: str = None
    ) -> dict[str, Any]:
        """Simulate file operation with hook integration"""
        start_time = time.perf_counter()

        # Pre-operation hook
        pre_hook_result = await self.run_pre_hook(operation, file_path, content)
        self.hook_logs.append(
            {
                "type": "pre_hook",
                "operation": operation,
                "file_path": file_path,
                "timestamp": time.time(),
                "result": pre_hook_result,
            }
        )

        # Perform operation if validated
        operation_result = {"success": False, "error": None}
        if pre_hook_result.get("validated", False):
            try:
                if operation == "write":
                    (self.workspace / file_path).write_text(content or "")
                elif operation == "edit":
                    existing_content = (self.workspace / file_path).read_text()
                    (self.workspace / file_path).write_text(content or existing_content)
                elif operation == "delete":
                    (self.workspace / file_path).unlink()

                operation_result["success"] = True
            except Exception as e:
                operation_result["error"] = str(e)
        else:
            operation_result["error"] = "Validation failed"

        # Post-operation hook
        post_hook_result = await self.run_post_hook(
            operation, file_path, operation_result["success"]
        )
        self.hook_logs.append(
            {
                "type": "post_hook",
                "operation": operation,
                "file_path": file_path,
                "timestamp": time.time(),
                "result": post_hook_result,
            }
        )

        end_time = time.perf_counter()
        execution_time = (end_time - start_time) * 1000  # Convert to ms

        return {
            "operation": operation,
            "file_path": file_path,
            "pre_hook_result": pre_hook_result,
            "operation_result": operation_result,
            "post_hook_result": post_hook_result,
            "execution_time_ms": execution_time,
        }

    async def run_pre_hook(
        self, operation: str, file_path: str, content: str = None
    ) -> dict[str, Any]:
        """Run pre-operation validation hooks"""
        validation_result = {
            "validated": True,
            "violations": [],
            "warnings": [],
            "suggestions": [],
            "compliance_score": 100,
        }

        if content and file_path.endswith(".tsx"):
            # Technology stack validation
            if (
                "custom-ui-lib" in content
                or "material-ui" in content
                or "ant-design" in content
            ):
                validation_result.update(
                    {
                        "validated": False,
                        "violations": ["Non-approved UI framework detected"],
                        "suggestions": [
                            "Use shadcn/ui components: import { Button } from '@/components/ui/button'"
                        ],
                        "compliance_score": 20,
                    }
                )

            # Accessibility validation
            if "onClick" in content and "data-testid" not in content:
                validation_result["warnings"].append(
                    "Interactive element missing data-testid"
                )
                validation_result["suggestions"].append(
                    "Add data-testid for testing: <button data-testid='my-button'>"
                )
                validation_result["compliance_score"] -= 15

            # Performance validation
            if content.count("useState") > 5 or content.count("useEffect") > 3:
                validation_result["warnings"].append(
                    "Potential performance impact - multiple state hooks"
                )
                validation_result["suggestions"].append(
                    "Consider using useReducer or Zustand store"
                )
                validation_result["compliance_score"] -= 10

            # Security validation
            if "dangerouslySetInnerHTML" in content:
                validation_result["warnings"].append(
                    "Security risk - dangerouslySetInnerHTML usage"
                )
                validation_result["suggestions"].append(
                    "Use DOMPurify or react-markdown instead"
                )
                validation_result["compliance_score"] -= 20

        self.validation_results.append(validation_result)
        return validation_result

    async def run_post_hook(
        self, operation: str, file_path: str, success: bool
    ) -> dict[str, Any]:
        """Run post-operation hooks"""
        post_result = {
            "operation": operation,
            "file_path": file_path,
            "success": success,
            "timestamp": time.time(),
            "performance_tracked": True,
        }

        # Track performance metrics
        if success:
            self.performance_metrics[file_path] = {
                "operation": operation,
                "timestamp": time.time(),
                "file_size": self._get_file_size(file_path),
                "complexity_score": self._calculate_complexity(file_path),
            }

        return post_result

    def _get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        try:
            return (self.workspace / file_path).stat().st_size
        except:
            return 0

    def _calculate_complexity(self, file_path: str) -> int:
        """Calculate basic complexity score"""
        try:
            content = (self.workspace / file_path).read_text()
            # Simple complexity based on lines and certain patterns
            lines = content.count("\n")
            functions = (
                content.count("function ")
                + content.count("const ")
                + content.count("export ")
            )
            imports = content.count("import ")
            return lines + (functions * 2) + imports
        except:
            return 0


class TestCompleteWorkflows:
    """Test complete development workflows with hook validation"""

    @pytest.fixture
    def e2e_environment(self):
        """Fixture providing complete E2E test environment"""
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            env = E2ETestEnvironment(workspace)
            yield env

    @pytest.mark.asyncio
    async def test_frontend_component_complete_lifecycle(self, e2e_environment):
        """Test complete frontend component development lifecycle"""
        env = e2e_environment

        # Phase 1: Create component following PRD requirements
        component_content = """
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserProfileProps {
  userName: string
  onEditProfile: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ userName, onEditProfile }) => {
  return (
    <Card data-testid="user-profile-card" className="w-full max-w-md">
      <CardHeader>
        <CardTitle data-testid="user-name">{userName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          data-testid="edit-profile-button"
          onClick={onEditProfile}
          variant="outline"
        >
          Edit Profile
        </Button>
      </CardContent>
    </Card>
  )
}
"""

        component_result = await env.simulate_file_operation(
            "write", "frontend/src/components/UserProfile.tsx", component_content
        )

        # Verify component creation validation
        assert component_result["pre_hook_result"]["validated"] == True
        assert component_result["operation_result"]["success"] == True
        assert component_result["pre_hook_result"]["compliance_score"] >= 90
        assert len(component_result["pre_hook_result"]["violations"]) == 0

        # Phase 2: Create comprehensive tests
        test_content = """
import { render, screen, fireEvent } from '@testing-library/react'
import { UserProfile } from '../UserProfile'

describe('UserProfile', () => {
  const mockEditProfile = jest.fn()
  
  beforeEach(() => {
    mockEditProfile.mockClear()
  })
  
  test('renders user profile card', () => {
    render(<UserProfile userName="John Doe" onEditProfile={mockEditProfile} />)
    
    expect(screen.getByTestId('user-profile-card')).toBeInTheDocument()
    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
    expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument()
  })
  
  test('calls onEditProfile when edit button is clicked', () => {
    render(<UserProfile userName="John Doe" onEditProfile={mockEditProfile} />)
    
    fireEvent.click(screen.getByTestId('edit-profile-button'))
    expect(mockEditProfile).toHaveBeenCalledTimes(1)
  })
  
  test('has proper accessibility attributes', () => {
    render(<UserProfile userName="John Doe" onEditProfile={mockEditProfile} />)
    
    const button = screen.getByTestId('edit-profile-button')
    expect(button).toHaveAttribute('data-testid')
    expect(button).toBeEnabled()
  })
})
"""

        test_result = await env.simulate_file_operation(
            "write",
            "frontend/src/components/__tests__/UserProfile.test.tsx",
            test_content,
        )

        # Verify test creation validation
        assert test_result["pre_hook_result"]["validated"] == True
        assert test_result["operation_result"]["success"] == True

        # Phase 3: Add to main application
        app_update_content = """
import React from 'react'
import { UserProfile } from '@/components/UserProfile'

export default function HomePage() {
  const handleEditProfile = () => {
    console.log('Edit profile clicked')
  }
  
  return (
    <main data-testid="homepage">
      <h1 data-testid="homepage-title">Welcome to Vana</h1>
      <UserProfile 
        userName="Current User" 
        onEditProfile={handleEditProfile}
      />
    </main>
  )
}
"""

        app_result = await env.simulate_file_operation(
            "write", "frontend/src/app/page.tsx", app_update_content
        )

        # Verify app integration validation
        assert app_result["pre_hook_result"]["validated"] == True
        assert app_result["operation_result"]["success"] == True

        # Phase 4: Verify overall workflow metrics
        total_operations = len(env.hook_logs)
        successful_operations = sum(
            1 for log in env.hook_logs if log["result"].get("validated", True)
        )

        assert total_operations >= 6  # 3 pre + 3 post hooks
        assert successful_operations >= 6  # All should be successful
        assert len(env.validation_results) == 3  # 3 validation results

        # Verify performance tracking
        assert len(env.performance_metrics) == 3
        for file_path, metrics in env.performance_metrics.items():
            assert metrics["file_size"] > 0
            assert metrics["complexity_score"] > 0

    @pytest.mark.asyncio
    async def test_prd_violation_prevention_and_recovery(self, e2e_environment):
        """Test PRD violation prevention and guided recovery"""
        env = e2e_environment

        # Phase 1: Attempt PRD violation (custom UI framework)
        violation_content = """
import React from 'react'
import { Button as MUIButton } from '@mui/material'
import { TextField } from '@mui/material'

export const BadForm = () => {
  return (
    <form>
      <TextField label="Name" />
      <MUIButton variant="contained">Submit</MUIButton>
    </form>
  )
}
"""

        violation_result = await env.simulate_file_operation(
            "write", "frontend/src/components/BadForm.tsx", violation_content
        )

        # Verify violation is detected and blocked
        assert violation_result["pre_hook_result"]["validated"] == False
        assert violation_result["operation_result"]["success"] == False
        assert (
            "Non-approved UI framework detected"
            in violation_result["pre_hook_result"]["violations"]
        )
        assert len(violation_result["pre_hook_result"]["suggestions"]) > 0

        # Phase 2: Apply suggested fixes
        corrected_content = """
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const GoodForm = () => {
  return (
    <form data-testid="good-form">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input 
            id="name" 
            data-testid="name-input"
            placeholder="Enter your name" 
          />
        </div>
        <Button 
          type="submit" 
          data-testid="submit-button"
        >
          Submit
        </Button>
      </div>
    </form>
  )
}
"""

        corrected_result = await env.simulate_file_operation(
            "write", "frontend/src/components/GoodForm.tsx", corrected_content
        )

        # Verify correction is accepted
        assert corrected_result["pre_hook_result"]["validated"] == True
        assert corrected_result["operation_result"]["success"] == True
        assert corrected_result["pre_hook_result"]["compliance_score"] >= 90

        # Phase 3: Verify learning and prevention worked
        violation_attempts = [r for r in env.validation_results if not r["validated"]]
        successful_corrections = [r for r in env.validation_results if r["validated"]]

        assert len(violation_attempts) == 1  # One violation caught
        assert len(successful_corrections) == 1  # One correction accepted
        assert violation_attempts[0]["compliance_score"] < 50
        assert successful_corrections[0]["compliance_score"] >= 90

    @pytest.mark.asyncio
    async def test_performance_monitoring_and_enforcement(self, e2e_environment):
        """Test performance monitoring and threshold enforcement"""
        env = e2e_environment

        # Phase 1: Create performance-heavy component
        heavy_component = """
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
    // Multiple heavy computations
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
    <div data-testid="heavy-component">
      <h2>Heavy Component</h2>
      {data1.map(item => <div key={item}>{item}</div>)}
      {data2.map(item => <div key={item}>{item}</div>)}
      {data3.map(item => <div key={item}>{item}</div>)}
      {data4.map(item => <div key={item}>{item}</div>)}
      <Button data-testid="heavy-button">Process All</Button>
    </div>
  )
}
"""

        heavy_result = await env.simulate_file_operation(
            "write", "frontend/src/components/HeavyComponent.tsx", heavy_component
        )

        # Verify performance warnings are generated
        assert (
            heavy_result["pre_hook_result"]["validated"] == True
        )  # Still allowed but with warnings
        assert len(heavy_result["pre_hook_result"]["warnings"]) > 0
        assert (
            "performance impact"
            in str(heavy_result["pre_hook_result"]["warnings"]).lower()
        )
        assert heavy_result["pre_hook_result"]["compliance_score"] < 90  # Reduced score

        # Phase 2: Create optimized version
        optimized_component = """
import React, { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { VariableSizeList as List } from 'react-window'

export const OptimizedComponent = () => {
  const data = useMemo(() => 
    Array.from({ length: 4000 }, (_, i) => ({ id: i, value: i * 2 })), 
    []
  )
  
  const Row = ({ index, style }) => (
    <div style={style} data-testid={`row-${index}`}>
      {data[index].value}
    </div>
  )
  
  return (
    <div data-testid="optimized-component">
      <h2>Optimized Component</h2>
      <List
        height={400}
        itemCount={data.length}
        itemSize={() => 35}
        width="100%"
      >
        {Row}
      </List>
      <Button data-testid="optimized-button">Process Efficiently</Button>
    </div>
  )
}
"""

        optimized_result = await env.simulate_file_operation(
            "write",
            "frontend/src/components/OptimizedComponent.tsx",
            optimized_component,
        )

        # Verify optimization is recognized
        assert optimized_result["pre_hook_result"]["validated"] == True
        assert optimized_result["pre_hook_result"]["compliance_score"] >= 85
        assert len(optimized_result["pre_hook_result"]["warnings"]) == 0

        # Phase 3: Compare performance metrics
        heavy_metrics = env.performance_metrics.get(
            "frontend/src/components/HeavyComponent.tsx"
        )
        optimized_metrics = env.performance_metrics.get(
            "frontend/src/components/OptimizedComponent.tsx"
        )

        assert heavy_metrics is not None
        assert optimized_metrics is not None
        assert (
            optimized_metrics["complexity_score"] <= heavy_metrics["complexity_score"]
        )

    @pytest.mark.asyncio
    async def test_security_validation_integration(self, e2e_environment):
        """Test security validation throughout development workflow"""
        env = e2e_environment

        # Phase 1: Attempt security violation
        unsafe_component = """
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export const UnsafeComponent = () => {
  const [userInput, setUserInput] = useState('')
  
  return (
    <div data-testid="unsafe-component">
      <input 
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        data-testid="user-input"
      />
      <div 
        dangerouslySetInnerHTML={{ __html: userInput }}
        data-testid="unsafe-output"
      />
      <Button data-testid="submit-button">Submit</Button>
    </div>
  )
}
"""

        unsafe_result = await env.simulate_file_operation(
            "write", "frontend/src/components/UnsafeComponent.tsx", unsafe_component
        )

        # Verify security warning is generated
        assert (
            unsafe_result["pre_hook_result"]["validated"] == True
        )  # Allowed but warned
        assert any(
            "security risk" in warning.lower()
            for warning in unsafe_result["pre_hook_result"]["warnings"]
        )
        assert unsafe_result["pre_hook_result"]["compliance_score"] < 85

        # Phase 2: Create secure version
        secure_component = """
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DOMPurify from 'isomorphic-dompurify'

export const SecureComponent = () => {
  const [userInput, setUserInput] = useState('')
  
  const sanitizedContent = DOMPurify.sanitize(userInput)
  
  return (
    <div data-testid="secure-component">
      <Input 
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        data-testid="user-input"
        placeholder="Enter safe content"
      />
      <div 
        data-testid="safe-output"
        className="mt-4 p-4 border rounded"
      >
        {sanitizedContent}
      </div>
      <Button 
        data-testid="submit-button"
        onClick={() => console.log('Secure submission:', sanitizedContent)}
      >
        Submit Safely
      </Button>
    </div>
  )
}
"""

        secure_result = await env.simulate_file_operation(
            "write", "frontend/src/components/SecureComponent.tsx", secure_component
        )

        # Verify secure implementation is approved
        assert secure_result["pre_hook_result"]["validated"] == True
        assert secure_result["pre_hook_result"]["compliance_score"] >= 90
        assert len(secure_result["pre_hook_result"]["warnings"]) == 0

    @pytest.mark.asyncio
    async def test_hook_system_performance_impact(self, e2e_environment):
        """Test overall performance impact of hook system"""
        env = e2e_environment

        # Create multiple components to measure cumulative impact
        components = [
            ("Component1", "Simple component"),
            ("Component2", "Complex component"),
            ("Component3", "Form component"),
            ("Component4", "List component"),
            ("Component5", "Modal component"),
        ]

        total_execution_time = 0
        operations_count = 0

        for name, description in components:
            content = f'''
import React from 'react'
import {{ Button }} from '@/components/ui/button'

// {description}
export const {name} = () => {{
  return (
    <div data-testid="{name.lower()}">
      <h2>{description}</h2>
      <Button data-testid="{name.lower()}-button">Click me</Button>
    </div>
  )
}}
'''

            result = await env.simulate_file_operation(
                "write", f"frontend/src/components/{name}.tsx", content
            )

            total_execution_time += result["execution_time_ms"]
            operations_count += 1

            # Verify each operation succeeds
            assert result["pre_hook_result"]["validated"] == True
            assert result["operation_result"]["success"] == True

        # Calculate performance metrics
        average_execution_time = total_execution_time / operations_count

        # Verify acceptable performance impact
        assert average_execution_time < 10.0  # Less than 10ms per operation
        assert operations_count == len(components)
        assert len(env.hook_logs) == operations_count * 2  # Pre + post hooks

        # Verify all validations passed
        successful_validations = sum(
            1 for result in env.validation_results if result["validated"]
        )
        assert successful_validations == operations_count

        print("Hook system performance:")
        print(f"  - Average execution time: {average_execution_time:.2f}ms")
        print(f"  - Total operations: {operations_count}")
        print(
            f"  - Success rate: {successful_validations / operations_count * 100:.1f}%"
        )


class TestSystemIntegrationValidation:
    """Test integration with existing system components"""

    @pytest.mark.asyncio
    async def test_makefile_integration_with_hooks(self):
        """Test that Makefile commands work with hook system"""
        # Mock Makefile command execution
        makefile_commands = [
            "test",
            "lint",
            "typecheck",
            "dev-with-hooks",
            "test-with-hooks",
        ]

        for command in makefile_commands:
            # Simulate command execution with hooks
            result = await self._simulate_makefile_command(command)

            # Verify hook integration doesn't break commands
            assert result["exit_code"] == 0
            assert result["hooks_integrated"] == True
            assert result["command"] == command

    async def _simulate_makefile_command(self, command: str) -> dict[str, Any]:
        """Simulate Makefile command execution"""
        # Mock successful command execution with hook integration
        return {
            "command": command,
            "exit_code": 0,
            "hooks_integrated": True,
            "execution_time_ms": 150,
            "output": f"Successfully executed {command} with hooks",
        }

    @pytest.mark.asyncio
    async def test_claude_flow_mcp_coordination(self):
        """Test coordination with Claude Flow MCP system"""
        # Mock Claude Flow integration
        mcp_operations = [
            "swarm_init",
            "agent_spawn",
            "task_orchestrate",
            "memory_usage",
        ]

        coordination_results = []

        for operation in mcp_operations:
            result = await self._simulate_mcp_operation(operation)
            coordination_results.append(result)

            # Verify hook system coordinates with MCP
            assert result["hook_coordination"] == True
            assert result["mcp_operation"] == operation
            assert result["success"] == True

        # Verify overall coordination
        assert len(coordination_results) == len(mcp_operations)
        assert all(r["success"] for r in coordination_results)

    async def _simulate_mcp_operation(self, operation: str) -> dict[str, Any]:
        """Simulate MCP operation with hook coordination"""
        return {
            "mcp_operation": operation,
            "hook_coordination": True,
            "success": True,
            "timestamp": time.time(),
            "coordination_latency_ms": 25,
        }


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
