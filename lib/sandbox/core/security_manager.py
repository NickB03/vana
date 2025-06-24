"""
Security Manager for VANA Sandbox Environment

Implements comprehensive security validation and policy enforcement for code execution.
Prevents malicious code execution while allowing legitimate operations.
"""

import ast
import logging
import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

logger = logging.getLogger(__name__)


class SecurityViolationError(Exception):
    """Raised when code violates security policies."""


class RiskLevel(Enum):
    """Risk levels for security assessment."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityViolationType(Enum):
    """Types of security violations."""

    FORBIDDEN_IMPORT = "forbidden_import"
    FORBIDDEN_FUNCTION = "forbidden_function"
    FORBIDDEN_PATTERN = "forbidden_pattern"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    SYNTAX_ERROR = "syntax_error"


@dataclass
class SecurityViolation:
    """Represents a security violation found in code."""

    violation_type: SecurityViolationType
    description: str
    severity: RiskLevel
    line_number: Optional[int] = None
    recommendation: Optional[str] = None


@dataclass
class SecurityResult:
    """Result of security validation."""

    is_safe: bool
    risk_level: RiskLevel
    violations: List[SecurityViolation]
    recommendations: List[str]


class SecurityManager:
    """Manages security policies and validation for sandbox execution."""

    def __init__(self, config_path: Optional[str] = None):
        """Initialize security manager with policies."""
        self.config_path = config_path or self._get_default_config_path()
        self.policies = self._load_security_policies()

    def _get_default_config_path(self) -> str:
        """Get default security policies configuration path."""
        return str(Path(__file__).parent.parent / "config" / "security_policies.yaml")

    def _load_security_policies(self) -> Dict[str, Any]:
        """Load security policies from configuration file."""
        try:
            with open(self.config_path, "r") as f:
                policies = yaml.safe_load(f)
            logger.info(f"Loaded security policies from {self.config_path}")
            return policies
        except FileNotFoundError:
            logger.warning(f"Security policies file not found: {self.config_path}")
            return self._get_default_policies()
        except Exception as e:
            logger.error(f"Error loading security policies: {e}")
            return self._get_default_policies()

    def _get_default_policies(self) -> Dict[str, Any]:
        """Get default security policies if config file is not available."""
        return {
            "python": {
                "forbidden_imports": [
                    "os",
                    "sys",
                    "subprocess",
                    "socket",
                    "urllib",
                    "requests",
                    "shutil",
                    "glob",
                    "tempfile",
                    "pickle",
                    "marshal",
                    "ctypes",
                ],
                "forbidden_functions": [
                    "exec",
                    "eval",
                    "compile",
                    "open",
                    "__import__",
                    "getattr",
                    "setattr",
                    "delattr",
                    "hasattr",
                    "vars",
                    "dir",
                    "globals",
                    "locals",
                ],
                "forbidden_patterns": [
                    r"__.*__",  # Dunder methods
                    r"import\s+os",  # OS imports
                    r"from\s+os",  # OS from imports
                ],
            },
            "javascript": {
                "forbidden_functions": [
                    "eval",
                    "Function",
                    "setTimeout",
                    "setInterval",
                    "require",
                    "import",
                ],
                "forbidden_patterns": [
                    r"require\s*\(",  # Node.js require
                    r"import\s+.*\s+from",  # ES6 imports
                    r"fetch\s*\(",  # Network requests
                    r"XMLHttpRequest",  # AJAX requests
                ],
            },
            "shell": {
                "forbidden_commands": [
                    "rm",
                    "rmdir",
                    "mv",
                    "cp",
                    "chmod",
                    "chown",
                    "sudo",
                    "su",
                    "wget",
                    "curl",
                    "nc",
                    "netcat",
                    "ssh",
                    "scp",
                    "rsync",
                ],
                "forbidden_patterns": [
                    r">\s*/",  # Redirect to system paths
                    r"\|\s*sh",  # Pipe to shell
                    r"&&",  # Command chaining
                    r"\|\|",  # Command chaining
                    r"`.*`",  # Command substitution
                    r"\$\(",  # Command substitution
                ],
            },
            "resource_limits": {
                "max_execution_time": 30,
                "max_memory_mb": 512,
                "max_cpu_cores": 1,
                "max_file_size_mb": 10,
                "allowed_file_extensions": [
                    ".txt",
                    ".json",
                    ".csv",
                    ".py",
                    ".js",
                    ".sh",
                ],
            },
        }

    def validate_code(self, code: str, language: str) -> bool:
        """
        Validate code against security policies.

        Args:
            code: Code to validate
            language: Programming language (python, javascript, shell)

        Returns:
            True if code passes validation

        Raises:
            SecurityViolationError: If code violates security policies
        """
        if not code or not code.strip():
            raise SecurityViolationError("Empty code is not allowed")

        language = language.lower()
        if language not in self.policies:
            raise SecurityViolationError(f"Unsupported language: {language}")

        policy = self.policies[language]

        # Check forbidden patterns
        if "forbidden_patterns" in policy:
            for pattern in policy["forbidden_patterns"]:
                if re.search(pattern, code, re.IGNORECASE):
                    raise SecurityViolationError(
                        f"Code contains forbidden pattern: {pattern}"
                    )

        # Language-specific validation
        if language == "python":
            self._validate_python_code(code, policy)
        elif language == "javascript":
            self._validate_javascript_code(code, policy)
        elif language == "shell":
            self._validate_shell_code(code, policy)

        return True

    def _validate_python_code(self, code: str, policy: Dict[str, Any]) -> None:
        """Validate Python code using AST parsing."""
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            raise SecurityViolationError(f"Python syntax error: {e}")

        # Check for forbidden imports and functions
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in policy.get("forbidden_imports", []):
                        raise SecurityViolationError(f"Forbidden import: {alias.name}")

            elif isinstance(node, ast.ImportFrom):
                if node.module in policy.get("forbidden_imports", []):
                    raise SecurityViolationError(f"Forbidden import: {node.module}")

            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in policy.get("forbidden_functions", []):
                        raise SecurityViolationError(
                            f"Forbidden function: {node.func.id}"
                        )

    def _validate_javascript_code(self, code: str, policy: Dict[str, Any]) -> None:
        """Validate JavaScript code."""
        forbidden_functions = policy.get("forbidden_functions", [])
        for func in forbidden_functions:
            if func in code:
                raise SecurityViolationError(f"Forbidden JavaScript function: {func}")

    def _validate_shell_code(self, code: str, policy: Dict[str, Any]) -> None:
        """Validate shell code."""
        forbidden_commands = policy.get("forbidden_commands", [])
        for cmd in forbidden_commands:
            if re.search(rf"\b{cmd}\b", code):
                raise SecurityViolationError(f"Forbidden shell command: {cmd}")

    def apply_restrictions(self, container_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply security restrictions to container configuration.

        Args:
            container_config: Base container configuration

        Returns:
            Updated configuration with security restrictions
        """
        resource_limits = self.policies.get("resource_limits", {})

        # Apply resource limits
        container_config.update(
            {
                "mem_limit": f"{resource_limits.get('max_memory_mb', 512)}m",
                "cpus": str(resource_limits.get("max_cpu_cores", 1)),
                "network_mode": "none",  # Disable network access
                "read_only": True,  # Read-only filesystem
                "tmpfs": {"/tmp": "size=100m,noexec"},  # Temporary filesystem
                "security_opt": [
                    "no-new-privileges:true"
                ],  # Prevent privilege escalation
                "cap_drop": ["ALL"],  # Drop all capabilities
                "user": "sandbox:sandbox",  # Run as non-root user
            }
        )

        return container_config

    def get_resource_limits(self) -> Dict[str, Any]:
        """Get resource limits from security policies."""
        return self.policies.get("resource_limits", {})

    # Comprehensive Security Methods
    def validate_python_code(self, code: str) -> SecurityResult:
        """
        Validate Python code and return comprehensive results.

        Args:
            code: Python source code to validate

        Returns:
            SecurityResult with validation details
        """
        return self._validate_code_comprehensive(code, "python")

    def validate_javascript_code(self, code: str) -> SecurityResult:
        """
        Validate JavaScript code and return comprehensive results.

        Args:
            code: JavaScript source code to validate

        Returns:
            SecurityResult with validation details
        """
        return self._validate_code_comprehensive(code, "javascript")

    def validate_shell_code(self, code: str) -> SecurityResult:
        """
        Validate shell code and return comprehensive results.

        Args:
            code: Shell commands to validate

        Returns:
            SecurityResult with validation details
        """
        return self._validate_code_comprehensive(code, "shell")

    def check_imports(self, code: str, language: str) -> List[str]:
        """
        Check for forbidden imports and modules.

        Args:
            code: Source code to check
            language: Programming language

        Returns:
            List of forbidden imports found
        """
        forbidden_imports = []
        lang_policies = self.policies.get(language, {})

        if language == "javascript":
            # For JavaScript, check require() calls against forbidden list
            forbidden_list = lang_policies.get("forbidden_imports", [])
            require_pattern = r"require\s*\(\s*['\"]([^'\"]+)['\"]"
            matches = re.findall(require_pattern, code)
            for module in matches:
                if module in forbidden_list:
                    forbidden_imports.append(module)
        else:
            # For other languages, check forbidden_imports list
            forbidden_list = lang_policies.get("forbidden_imports", [])
            for forbidden in forbidden_list:
                if re.search(rf"\b{re.escape(forbidden)}\b", code):
                    forbidden_imports.append(forbidden)

        return forbidden_imports

    def analyze_security_risk(self, code: str, language: str) -> RiskLevel:
        """
        Analyze overall security risk level.

        Args:
            code: Source code to analyze
            language: Programming language

        Returns:
            Overall risk level
        """
        result = self._validate_code_comprehensive(code, language)
        return result.risk_level

    def _validate_code_comprehensive(self, code: str, language: str) -> SecurityResult:
        """
        Comprehensive code validation with detailed results.

        Args:
            code: Source code to validate
            language: Programming language

        Returns:
            SecurityResult with detailed validation information
        """
        violations = []
        recommendations = []

        if not code or not code.strip():
            violations.append(
                SecurityViolation(
                    violation_type=SecurityViolationType.SYNTAX_ERROR,
                    description="Empty code is not allowed",
                    severity=RiskLevel.HIGH,
                )
            )
            return SecurityResult(
                is_safe=False,
                risk_level=RiskLevel.HIGH,
                violations=violations,
                recommendations=["Provide valid code to execute"],
            )

        language = language.lower()
        if language not in self.policies:
            violations.append(
                SecurityViolation(
                    violation_type=SecurityViolationType.SYNTAX_ERROR,
                    description=f"Unsupported language: {language}",
                    severity=RiskLevel.HIGH,
                )
            )
            return SecurityResult(
                is_safe=False,
                risk_level=RiskLevel.HIGH,
                violations=violations,
                recommendations=[
                    f"Use supported languages: {list(self.policies.keys())}"
                ],
            )

        policy = self.policies[language]

        # Check forbidden patterns
        if "forbidden_patterns" in policy:
            for pattern in policy["forbidden_patterns"]:
                if re.search(pattern, code, re.IGNORECASE):
                    violations.append(
                        SecurityViolation(
                            violation_type=SecurityViolationType.FORBIDDEN_PATTERN,
                            description=f"Code contains forbidden pattern: {pattern}",
                            severity=RiskLevel.HIGH,
                            recommendation="Remove or replace the forbidden pattern",
                        )
                    )

        # Language-specific comprehensive validation
        if language == "python":
            lang_violations = self._validate_python_comprehensive(code, policy)
            violations.extend(lang_violations)
        elif language == "javascript":
            lang_violations = self._validate_javascript_comprehensive(code, policy)
            violations.extend(lang_violations)
        elif language == "shell":
            lang_violations = self._validate_shell_comprehensive(code, policy)
            violations.extend(lang_violations)

        # Calculate overall risk level
        risk_level = self._calculate_risk_level(violations)
        is_safe = risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM]

        # Generate recommendations
        if violations:
            recommendations.extend(
                [v.recommendation for v in violations if v.recommendation]
            )
            if not recommendations:
                recommendations.append(
                    "Review and fix security violations before execution"
                )

        return SecurityResult(
            is_safe=is_safe,
            risk_level=risk_level,
            violations=violations,
            recommendations=recommendations,
        )

    def _validate_python_comprehensive(
        self, code: str, policy: Dict[str, Any]
    ) -> List[SecurityViolation]:
        """Comprehensive Python code validation."""
        violations = []

        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            violations.append(
                SecurityViolation(
                    violation_type=SecurityViolationType.SYNTAX_ERROR,
                    description=f"Python syntax error: {e}",
                    severity=RiskLevel.HIGH,
                    line_number=getattr(e, "lineno", None),
                    recommendation="Fix syntax errors before execution",
                )
            )
            return violations

        # Check for forbidden imports and functions
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in policy.get("forbidden_imports", []):
                        violations.append(
                            SecurityViolation(
                                violation_type=SecurityViolationType.FORBIDDEN_IMPORT,
                                description=f"Forbidden import: {alias.name}",
                                severity=RiskLevel.HIGH,
                                line_number=getattr(node, "lineno", None),
                                recommendation=f"Remove import of {alias.name} or use an alternative",
                            )
                        )

            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module in policy.get("forbidden_imports", []):
                    violations.append(
                        SecurityViolation(
                            violation_type=SecurityViolationType.FORBIDDEN_IMPORT,
                            description=f"Forbidden import: {node.module}",
                            severity=RiskLevel.HIGH,
                            line_number=getattr(node, "lineno", None),
                            recommendation=f"Remove import from {node.module} or use an alternative",
                        )
                    )

            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in policy.get("forbidden_functions", []):
                        violations.append(
                            SecurityViolation(
                                violation_type=SecurityViolationType.FORBIDDEN_FUNCTION,
                                description=f"Forbidden function: {node.func.id}",
                                severity=RiskLevel.HIGH,
                                line_number=getattr(node, "lineno", None),
                                recommendation=f"Replace {node.func.id} with a safer alternative",
                            )
                        )

        return violations

    def _validate_javascript_comprehensive(
        self, code: str, policy: Dict[str, Any]
    ) -> List[SecurityViolation]:
        """Comprehensive JavaScript code validation."""
        violations = []

        forbidden_functions = policy.get("forbidden_functions", [])
        for func in forbidden_functions:
            if func in code:
                violations.append(
                    SecurityViolation(
                        violation_type=SecurityViolationType.FORBIDDEN_FUNCTION,
                        description=f"Forbidden JavaScript function: {func}",
                        severity=RiskLevel.HIGH,
                        recommendation=f"Replace {func} with a safer alternative",
                    )
                )

        # Check for suspicious patterns
        suspicious_patterns = [
            (r"document\.cookie", "Cookie access detected"),
            (r"localStorage\.", "Local storage access detected"),
            (r"sessionStorage\.", "Session storage access detected"),
            (r"fetch\s*\(", "Network request detected"),
            (r"XMLHttpRequest", "AJAX request detected"),
        ]

        for pattern, description in suspicious_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                violations.append(
                    SecurityViolation(
                        violation_type=SecurityViolationType.SUSPICIOUS_PATTERN,
                        description=description,
                        severity=RiskLevel.MEDIUM,
                        recommendation="Review if this operation is necessary and safe",
                    )
                )

        return violations

    def _validate_shell_comprehensive(
        self, code: str, policy: Dict[str, Any]
    ) -> List[SecurityViolation]:
        """Comprehensive shell code validation."""
        violations = []

        forbidden_commands = policy.get("forbidden_commands", [])
        for cmd in forbidden_commands:
            if re.search(rf"\b{cmd}\b", code):
                violations.append(
                    SecurityViolation(
                        violation_type=SecurityViolationType.FORBIDDEN_FUNCTION,
                        description=f"Forbidden shell command: {cmd}",
                        severity=RiskLevel.CRITICAL
                        if cmd in ["rm", "sudo", "su"]
                        else RiskLevel.HIGH,
                        recommendation=f"Remove {cmd} command or use a safer alternative",
                    )
                )

        return violations

    def _calculate_risk_level(self, violations: List[SecurityViolation]) -> RiskLevel:
        """Calculate overall risk level based on violations."""
        if not violations:
            return RiskLevel.LOW

        # Count violations by severity
        critical_count = sum(1 for v in violations if v.severity == RiskLevel.CRITICAL)
        high_count = sum(1 for v in violations if v.severity == RiskLevel.HIGH)
        medium_count = sum(1 for v in violations if v.severity == RiskLevel.MEDIUM)

        # Determine overall risk level
        if critical_count > 0:
            return RiskLevel.CRITICAL
        elif high_count > 3:  # Multiple high-risk violations
            return RiskLevel.CRITICAL
        elif high_count > 0:
            return RiskLevel.HIGH
        elif medium_count > 5:  # Many medium-risk violations
            return RiskLevel.HIGH
        elif medium_count > 0:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
