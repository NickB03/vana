"""
Google ADK Compliance Validator for AI Agent Testing Framework

Validates Google ADK compliance patterns including async usage,
tool integration, memory service implementation, and agent patterns.
"""

import ast
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class ComplianceResult:
    """Result of ADK compliance validation"""

    component: str
    compliant: bool
    issues: List[str]
    recommendations: List[str]
    score: float  # 0.0 to 1.0
    details: Dict[str, Any]


class ADKComplianceValidator:
    """Validates Google ADK compliance patterns"""

    def __init__(self, project_root: Optional[str] = None):
        """Initialize with project root path"""
        if project_root is None:
            project_root = Path(__file__).parent.parent.parent

        self.project_root = Path(project_root)
        self.agents_path = self.project_root / "agents"
        self.lib_path = self.project_root / "lib"

        # Load ADK compliance patterns
        self.adk_patterns = self._load_adk_patterns()
        self.required_imports = self._load_required_imports()

    def validate_all_agents(self) -> Dict[str, ComplianceResult]:
        """Validate ADK compliance for all agents"""
        results = {}

        if not self.agents_path.exists():
            return {
                "error": ComplianceResult(
                    component="agents_directory",
                    compliant=False,
                    issues=["Agents directory not found"],
                    recommendations=["Create agents directory structure"],
                    score=0.0,
                    details={},
                )
            }

        # Find all agent directories
        agent_dirs = [d for d in self.agents_path.iterdir() if d.is_dir() and not d.name.startswith(".")]

        for agent_dir in agent_dirs:
            agent_name = agent_dir.name

            # Skip test agents for compliance validation
            if agent_name.startswith("test_"):
                continue

            try:
                result = self.validate_agent(agent_name)
                results[agent_name] = result
            except Exception as e:
                results[agent_name] = ComplianceResult(
                    component=f"agent_{agent_name}",
                    compliant=False,
                    issues=[f"Validation error: {str(e)}"],
                    recommendations=["Fix agent structure and retry validation"],
                    score=0.0,
                    details={"error": str(e)},
                )

        return results

    def validate_agent(self, agent_name: str) -> ComplianceResult:
        """Validate ADK compliance for a specific agent"""
        agent_path = self.agents_path / agent_name

        if not agent_path.exists():
            return ComplianceResult(
                component=f"agent_{agent_name}",
                compliant=False,
                issues=[f"Agent directory not found: {agent_path}"],
                recommendations=[f"Create agent directory for {agent_name}"],
                score=0.0,
                details={},
            )

        issues = []
        recommendations = []
        details = {}
        compliance_scores = []

        # Validate agent structure
        structure_result = self._validate_agent_structure(agent_path)
        issues.extend(structure_result["issues"])
        recommendations.extend(structure_result["recommendations"])
        details["structure"] = structure_result["details"]
        compliance_scores.append(structure_result["score"])

        # Validate async patterns
        async_result = self._validate_async_patterns(agent_path)
        issues.extend(async_result["issues"])
        recommendations.extend(async_result["recommendations"])
        details["async_patterns"] = async_result["details"]
        compliance_scores.append(async_result["score"])

        # Validate tool integration
        tool_result = self._validate_tool_integration(agent_path)
        issues.extend(tool_result["issues"])
        recommendations.extend(tool_result["recommendations"])
        details["tool_integration"] = tool_result["details"]
        compliance_scores.append(tool_result["score"])

        # Validate imports and dependencies
        import_result = self._validate_imports(agent_path)
        issues.extend(import_result["issues"])
        recommendations.extend(import_result["recommendations"])
        details["imports"] = import_result["details"]
        compliance_scores.append(import_result["score"])

        # Calculate overall compliance score
        overall_score = sum(compliance_scores) / len(compliance_scores) if compliance_scores else 0.0
        compliant = overall_score >= 0.8 and len(issues) == 0

        return ComplianceResult(
            component=f"agent_{agent_name}",
            compliant=compliant,
            issues=issues,
            recommendations=recommendations,
            score=overall_score,
            details=details,
        )

    def validate_memory_service(self, agent_name: str) -> ComplianceResult:
        """Validate memory service implementation compliance"""
        agent_path = self.agents_path / agent_name
        issues = []
        recommendations = []
        details = {}

        # Look for memory service implementation
        memory_files = list(agent_path.glob("**/memory*.py"))

        if not memory_files:
            # Check if agent uses shared memory service
            shared_memory = self.lib_path / "memory"
            if shared_memory.exists():
                details["uses_shared_memory"] = True
                return ComplianceResult(
                    component=f"memory_service_{agent_name}",
                    compliant=True,
                    issues=[],
                    recommendations=[],
                    score=1.0,
                    details=details,
                )
            else:
                issues.append("No memory service implementation found")
                recommendations.append("Implement BaseMemoryService or use shared memory service")
                return ComplianceResult(
                    component=f"memory_service_{agent_name}",
                    compliant=False,
                    issues=issues,
                    recommendations=recommendations,
                    score=0.0,
                    details=details,
                )

        # Validate memory service implementation
        for memory_file in memory_files:
            file_result = self._validate_memory_service_file(memory_file)
            issues.extend(file_result["issues"])
            recommendations.extend(file_result["recommendations"])
            details[memory_file.name] = file_result["details"]

        score = 1.0 - (len(issues) * 0.2)  # Deduct 0.2 per issue
        score = max(0.0, score)

        return ComplianceResult(
            component=f"memory_service_{agent_name}",
            compliant=len(issues) == 0,
            issues=issues,
            recommendations=recommendations,
            score=score,
            details=details,
        )

    def _validate_agent_structure(self, agent_path: Path) -> Dict[str, Any]:
        """Validate agent directory structure"""
        issues = []
        recommendations = []
        details = {}

        # Check for required files
        required_files = ["__init__.py"]
        optional_files = ["team.py", "agent.py", "specialist.py"]

        existing_files = [f.name for f in agent_path.iterdir() if f.is_file()]
        details["existing_files"] = existing_files

        # Check required files
        for req_file in required_files:
            if req_file not in existing_files:
                issues.append(f"Missing required file: {req_file}")
                recommendations.append(f"Create {req_file} in agent directory")

        # Check for at least one main agent file
        main_files = [f for f in optional_files if f in existing_files]
        if not main_files:
            issues.append("No main agent file found (team.py, agent.py, or specialist.py)")
            recommendations.append("Create main agent implementation file")

        details["main_files"] = main_files

        # Check __init__.py exports
        init_file = agent_path / "__init__.py"
        if init_file.exists():
            init_result = self._validate_init_file(init_file)
            issues.extend(init_result["issues"])
            recommendations.extend(init_result["recommendations"])
            details["init_validation"] = init_result["details"]

        score = 1.0 - (len(issues) * 0.25)
        score = max(0.0, score)

        return {
            "issues": issues,
            "recommendations": recommendations,
            "details": details,
            "score": score,
        }

    def _validate_async_patterns(self, agent_path: Path) -> Dict[str, Any]:
        """Validate async/await patterns in agent code"""
        issues = []
        recommendations = []
        details = {}

        python_files = list(agent_path.glob("**/*.py"))
        async_functions_found = 0
        blocking_calls_found = []

        for py_file in python_files:
            try:
                with open(py_file, "r", encoding="utf-8") as f:
                    content = f.read()

                # Parse AST to analyze async patterns
                tree = ast.parse(content)

                # Find async functions
                async_funcs = [node for node in ast.walk(tree) if isinstance(node, ast.AsyncFunctionDef)]
                async_functions_found += len(async_funcs)

                # Check for blocking calls in async functions
                for func in async_funcs:
                    blocking_calls = self._find_blocking_calls_in_function(func, content)
                    if blocking_calls:
                        blocking_calls_found.extend([f"{py_file.name}:{func.name}:{call}" for call in blocking_calls])

                # Check for proper async/await usage
                await_calls = [node for node in ast.walk(tree) if isinstance(node, ast.Await)]

                details[py_file.name] = {
                    "async_functions": len(async_funcs),
                    "await_calls": len(await_calls),
                    "blocking_calls": len(blocking_calls) if "blocking_calls" in locals() else 0,
                }

            except Exception as e:
                issues.append(f"Error parsing {py_file.name}: {str(e)}")

        details["total_async_functions"] = async_functions_found
        details["blocking_calls_found"] = blocking_calls_found

        # Validate async patterns
        if async_functions_found == 0:
            issues.append("No async functions found - ADK agents should use async patterns")
            recommendations.append("Implement async functions for agent operations")

        if blocking_calls_found:
            issues.append(f"Found {len(blocking_calls_found)} blocking calls in async functions")
            recommendations.append("Replace blocking calls with async equivalents")
            details["blocking_calls_details"] = blocking_calls_found

        score = 1.0
        if async_functions_found == 0:
            score -= 0.5
        if blocking_calls_found:
            score -= min(0.4, len(blocking_calls_found) * 0.1)

        score = max(0.0, score)

        return {
            "issues": issues,
            "recommendations": recommendations,
            "details": details,
            "score": score,
        }

    def _validate_tool_integration(self, agent_path: Path) -> Dict[str, Any]:
        """Validate tool integration patterns"""
        issues = []
        recommendations = []
        details = {}

        python_files = list(agent_path.glob("**/*.py"))
        tools_found = []
        function_tools_found = []

        for py_file in python_files:
            try:
                with open(py_file, "r", encoding="utf-8") as f:
                    content = f.read()

                # Look for tool definitions and registrations
                tool_patterns = [
                    r"FunctionTool\(",
                    r"@tool",
                    r"tools\s*=\s*\[",
                    r"register_tool",
                    r"def\s+\w+.*tool.*\(",
                ]

                for pattern in tool_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        tools_found.extend(matches)

                # Check for proper FunctionTool usage
                if "FunctionTool" in content:
                    function_tools_found.append(py_file.name)

                # Check for tool function signatures
                tree = ast.parse(content)
                functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]

                tool_functions = []
                for func in functions:
                    # Check if function looks like a tool (has proper signature)
                    if self._is_tool_function(func):
                        tool_functions.append(func.name)

                details[py_file.name] = {
                    "tools_found": len([m for m in tools_found if m in content]),
                    "function_tools": "FunctionTool" in content,
                    "tool_functions": tool_functions,
                }

            except Exception as e:
                issues.append(f"Error analyzing tools in {py_file.name}: {str(e)}")

        details["total_tools_found"] = len(tools_found)
        details["files_with_function_tools"] = function_tools_found

        # Validate tool integration
        if not tools_found:
            issues.append("No tool definitions found")
            recommendations.append("Implement tools using FunctionTool pattern")

        if not function_tools_found:
            issues.append("No FunctionTool usage found")
            recommendations.append("Use FunctionTool for proper ADK tool integration")

        score = 1.0
        if not tools_found:
            score -= 0.4
        if not function_tools_found:
            score -= 0.3

        score = max(0.0, score)

        return {
            "issues": issues,
            "recommendations": recommendations,
            "details": details,
            "score": score,
        }

    def _validate_imports(self, agent_path: Path) -> Dict[str, Any]:
        """Validate imports and dependencies"""
        issues = []
        recommendations = []
        details = {}

        python_files = list(agent_path.glob("**/*.py"))
        imports_found = {}
        missing_imports = []

        for py_file in python_files:
            try:
                with open(py_file, "r", encoding="utf-8") as f:
                    content = f.read()

                # Parse imports
                tree = ast.parse(content)

                file_imports = []
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            file_imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        module = node.module or ""
                        for alias in node.names:
                            file_imports.append(f"{module}.{alias.name}")

                imports_found[py_file.name] = file_imports

                # Check for required ADK imports
                required_for_file = []
                if "async def" in content:
                    required_for_file.extend(["asyncio"])
                if "FunctionTool" in content:
                    required_for_file.extend(["google.adk"])

                for req_import in required_for_file:
                    if not any(req_import in imp for imp in file_imports):
                        missing_imports.append(f"{py_file.name}: {req_import}")

            except Exception as e:
                issues.append(f"Error analyzing imports in {py_file.name}: {str(e)}")

        details["imports_by_file"] = imports_found
        details["missing_imports"] = missing_imports

        if missing_imports:
            issues.extend([f"Missing import: {imp}" for imp in missing_imports])
            recommendations.append("Add required imports for ADK compliance")

        score = 1.0 - (len(missing_imports) * 0.1)
        score = max(0.0, score)

        return {
            "issues": issues,
            "recommendations": recommendations,
            "details": details,
            "score": score,
        }

    def _load_adk_patterns(self) -> Dict[str, Any]:
        """Load ADK compliance patterns"""
        return {
            "async_patterns": [
                "async def",
                "await ",
                "asyncio.",
            ],
            "tool_patterns": [
                "FunctionTool",
                "@tool",
                "tools=",
            ],
            "memory_patterns": [
                "BaseMemoryService",
                "memory_service",
                "MemoryService",
            ],
            "agent_patterns": [
                "BaseAgent",
                "Agent",
                "agent_name",
            ],
        }

    def _load_required_imports(self) -> Dict[str, List[str]]:
        """Load required imports for different patterns"""
        return {
            "async_functions": ["asyncio"],
            "function_tools": ["google.adk"],
            "memory_service": ["google.adk"],
            "base_agent": ["google.adk"],
        }

    def _validate_init_file(self, init_file: Path) -> Dict[str, Any]:
        """Validate __init__.py file structure"""
        issues = []
        recommendations = []
        details = {}

        try:
            with open(init_file, "r", encoding="utf-8") as f:
                content = f.read()

            # Check for proper exports
            if "__all__" not in content and "from" not in content:
                issues.append("__init__.py should export agent components")
                recommendations.append("Add __all__ or import statements to __init__.py")

            # Check for agent registration
            if "agent" not in content.lower():
                issues.append("No agent reference found in __init__.py")
                recommendations.append("Ensure agent is properly exported")

            details["has_all"] = "__all__" in content
            details["has_imports"] = "from" in content or "import" in content
            details["content_length"] = len(content)

        except Exception as e:
            issues.append(f"Error reading __init__.py: {str(e)}")

        return {
            "issues": issues,
            "recommendations": recommendations,
            "details": details,
        }

    def _validate_memory_service_file(self, memory_file: Path) -> Dict[str, Any]:
        """Validate memory service implementation file"""
        issues = []
        recommendations = []
        details = {}

        try:
            with open(memory_file, "r", encoding="utf-8") as f:
                content = f.read()

            # Check for required methods
            required_methods = ["store", "retrieve", "search", "delete"]
            found_methods = []

            for method in required_methods:
                if f"def {method}" in content or f"async def {method}" in content:
                    found_methods.append(method)
                else:
                    issues.append(f"Missing required method: {method}")

            details["found_methods"] = found_methods
            details["missing_methods"] = [m for m in required_methods if m not in found_methods]

            # Check for async compliance
            if "async def" not in content:
                issues.append("Memory service should use async methods")
                recommendations.append("Convert methods to async for ADK compliance")

            # Check for BaseMemoryService inheritance
            if "BaseMemoryService" not in content:
                issues.append("Should inherit from BaseMemoryService")
                recommendations.append("Inherit from google.adk.BaseMemoryService")

        except Exception as e:
            issues.append(f"Error validating memory service: {str(e)}")

        return {
            "issues": issues,
            "recommendations": recommendations,
            "details": details,
        }

    def _find_blocking_calls_in_function(self, func_node: ast.AsyncFunctionDef, content: str) -> List[str]:
        """Find blocking calls in async function"""
        blocking_patterns = [
            r"requests\.",
            r"urllib\.",
            r"time\.sleep\(",
            r"input\(",
            r"print\(",  # Can be blocking in some contexts
        ]

        # Get function content
        func_start = func_node.lineno
        func_end = func_node.end_lineno if hasattr(func_node, "end_lineno") else func_start + 10

        lines = content.split("\n")
        func_content = "\n".join(lines[func_start - 1 : func_end])

        blocking_calls = []
        for pattern in blocking_patterns:
            matches = re.findall(pattern, func_content)
            blocking_calls.extend(matches)

        return blocking_calls

    def _is_tool_function(self, func_node: ast.FunctionDef) -> bool:
        """Check if function appears to be a tool function"""
        # Simple heuristic - could be enhanced
        func_name = func_node.name

        # Check for tool-like naming
        tool_indicators = [
            "tool",
            "search",
            "get",
            "create",
            "update",
            "delete",
            "process",
        ]

        return any(indicator in func_name.lower() for indicator in tool_indicators)
