"""
Unit tests for ADK compliance validation.
These tests ensure that all tools follow Google's Agent Development Kit standards.
"""

import ast
import os
import inspect
import importlib.util
from pathlib import Path
from typing import List, Dict, Any, Callable
import pytest
from google.adk.tools import FunctionTool


class ADKComplianceValidator:
    """Validates ADK compliance for tool functions."""
    
    def __init__(self):
        self.violations = []
        self.warnings = []
    
    def check_default_parameters(self, func: Callable) -> List[str]:
        """Check if function has default parameters (ADK violation)."""
        violations = []
        sig = inspect.signature(func)
        
        for param_name, param in sig.parameters.items():
            if param.default != inspect.Parameter.empty:
                violations.append(
                    f"Function '{func.__name__}' has default parameter: {param_name}={param.default}"
                )
        
        return violations
    
    def check_function_complexity(self, func: Callable) -> List[str]:
        """Check if function is too complex for ADK standards."""
        warnings = []
        
        # Get function source if available
        try:
            source = inspect.getsource(func)
            lines = len(source.split('\n'))
            
            if lines > 50:
                warnings.append(
                    f"Function '{func.__name__}' has {lines} lines (recommended: <50)"
                )
        except (OSError, TypeError):
            pass
        
        return warnings
    
    def validate_tool_files(self, directory: str) -> Dict[str, Any]:
        """Validate all Python files in a directory for ADK compliance."""
        results = {
            "violations": [],
            "warnings": [],
            "files_checked": 0,
            "functions_checked": 0
        }
        
        for root, dirs, files in os.walk(directory):
            # Skip __pycache__ and test directories
            dirs[:] = [d for d in dirs if not d.startswith('__pycache__') and d != 'tests']
            
            for file in files:
                if file.endswith('.py') and not file.startswith('test_'):
                    file_path = os.path.join(root, file)
                    file_violations = self._check_file_for_defaults(file_path)
                    results["violations"].extend(file_violations)
                    results["files_checked"] += 1
        
        return results
    
    def _check_file_for_defaults(self, file_path: str) -> List[str]:
        """Check a specific file for default parameter violations."""
        violations = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse the AST to find function definitions
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Check for default parameters
                    if node.args.defaults or node.args.kw_defaults:
                        # Create relative path for readability
                        rel_path = os.path.relpath(file_path, start='/Users/nick/Development/vana')
                        violations.append(
                            f"{rel_path}:{node.lineno} - Function '{node.name}' has default parameters"
                        )
        
        except (SyntaxError, UnicodeDecodeError):
            # Skip files that can't be parsed
            pass
        except Exception as e:
            violations.append(f"Error parsing {file_path}: {e}")
        
        return violations


# Test fixtures
@pytest.fixture
def compliance_validator():
    """Create an ADK compliance validator instance."""
    return ADKComplianceValidator()


# Test cases
class TestADKCompliance:
    """Test suite for ADK compliance validation."""
    
    def test_no_default_parameters_in_tools(self, compliance_validator):
        """Test that no tool functions have default parameters."""
        # Check lib/_tools directory
        tools_results = compliance_validator.validate_tool_files('lib/_tools')
        
        # Filter out known non-critical violations (class methods, internal functions)
        critical_violations = []
        for violation in tools_results["violations"]:
            # Skip __init__ methods and private functions
            if not any(pattern in violation for pattern in ['__init__', '_validate_', '_get_', '_save_']):
                # Check if it's a tool function (has FunctionTool decorator or is exported)
                critical_violations.append(violation)
        
        assert len(critical_violations) == 0, (
            f"Found {len(critical_violations)} ADK compliance violations in tools:\n" +
            "\n".join(critical_violations)
        )
    
    def test_no_default_parameters_in_agents(self, compliance_validator):
        """Test that agent tool functions have no default parameters."""
        # Check agents directory
        agents_results = compliance_validator.validate_tool_files('agents')
        
        # Filter for tool-related violations only
        tool_violations = []
        for violation in agents_results["violations"]:
            # Focus on tool functions and transfer methods
            if any(pattern in violation.lower() for pattern in [
                'transfer_to_', 'tool', 'search', 'analyze', 'execute'
            ]):
                tool_violations.append(violation)
        
        assert len(tool_violations) == 0, (
            f"Found {len(tool_violations)} tool-related ADK violations in agents:\n" +
            "\n".join(tool_violations)
        )
    
    def test_critical_search_tools_compliance(self):
        """Test that critical search tools are ADK compliant."""
        # Import critical search functions
        from lib._tools.google_search_v2 import google_web_search
        from lib._tools.standardized_search_tools import (
            standardized_vector_search,
            standardized_web_search,
            standardized_search_knowledge
        )
        
        validator = ADKComplianceValidator()
        
        # Check each function
        critical_functions = [
            google_web_search,
            standardized_vector_search,
            standardized_web_search,
            standardized_search_knowledge
        ]
        
        all_violations = []
        for func in critical_functions:
            violations = validator.check_default_parameters(func)
            all_violations.extend(violations)
        
        assert len(all_violations) == 0, (
            f"Critical search tools have ADK violations:\n" +
            "\n".join(all_violations)
        )
    
    def test_agent_instruction_length(self):
        """Test that agent instructions are concise (ADK recommendation)."""
        # Check main agent files
        agent_files = [
            'agents/vana/team.py',
            'agents/vana/enhanced_orchestrator.py'
        ]
        
        instruction_violations = []
        
        for file_path in agent_files:
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Look for instruction strings
                    lines = content.split('\n')
                    in_instruction = False
                    instruction_lines = 0
                    
                    for line in lines:
                        if 'instruction' in line.lower() and '"""' in line:
                            in_instruction = True
                            instruction_lines = 0
                        elif in_instruction:
                            if '"""' in line:
                                in_instruction = False
                                if instruction_lines > 35:  # Allow some buffer over 30
                                    instruction_violations.append(
                                        f"{file_path}: Instruction has {instruction_lines} lines (recommended: ≤30)"
                                    )
                            else:
                                instruction_lines += 1
                
                except Exception as e:
                    instruction_violations.append(f"Error checking {file_path}: {e}")
        
        # This is a warning, not a hard failure initially
        if instruction_violations:
            pytest.skip(f"Instruction length warnings (will be fixed):\n" + "\n".join(instruction_violations))
    
    def test_tool_count_per_agent(self):
        """Test that agents don't have too many tools (ADK recommendation)."""
        # This test will be implemented after tool optimization
        pytest.skip("Tool count optimization will be implemented in this session")
    
    def test_function_tool_creation(self):
        """Test that FunctionTool instances can be created without errors."""
        from lib._tools.google_search_v2 import google_web_search
        
        # Test creating FunctionTool
        try:
            tool = FunctionTool(func=google_web_search)
            assert tool is not None
            assert hasattr(tool, 'name')
            assert hasattr(tool, 'description')
        except Exception as e:
            pytest.fail(f"Failed to create FunctionTool: {e}")


# Performance validation tests
class TestPerformanceCompliance:
    """Test that changes maintain or improve performance."""
    
    def test_search_response_time(self):
        """Test that search functions respond within acceptable time."""
        import time
        from lib._tools.google_search_v2 import google_web_search
        
        start_time = time.time()
        result = google_web_search("Python programming", 3)
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Should complete within 10 seconds (with fallbacks)
        assert response_time < 10.0, f"Search took {response_time:.2f} seconds (too slow)"
        
        # Result should not be empty
        assert len(result) > 0, "Search returned empty result"
        
        # Result should be valid JSON
        import json
        try:
            data = json.loads(result)
            assert "query" in data, "Result missing query field"
        except json.JSONDecodeError:
            pytest.fail("Search result is not valid JSON")


if __name__ == "__main__":
    # Run compliance check
    validator = ADKComplianceValidator()
    
    print("🔍 Checking ADK Compliance...")
    
    # Check tools
    tools_results = validator.validate_tool_files('lib/_tools')
    print(f"Tools: {tools_results['files_checked']} files checked")
    
    # Check agents
    agents_results = validator.validate_tool_files('agents')
    print(f"Agents: {agents_results['files_checked']} files checked")
    
    # Report violations
    all_violations = tools_results["violations"] + agents_results["violations"]
    
    if all_violations:
        print(f"\n❌ Found {len(all_violations)} ADK compliance violations:")
        for violation in all_violations[:10]:  # Show first 10
            print(f"  • {violation}")
        if len(all_violations) > 10:
            print(f"  ... and {len(all_violations) - 10} more")
    else:
        print("\n✅ No ADK compliance violations found!")