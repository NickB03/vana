# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Shell Command Validator for validating bash operations.

This validator ensures that shell commands are safe and don't pose
security risks or system damage.
"""

import logging
import re
import shlex
import time
from typing import Any

from ..config.hook_config import ShellValidatorConfig

logger = logging.getLogger(__name__)


class ShellValidator:
    """
    Validates shell commands for security and safety.

    Features:
    - Dangerous command detection
    - Command whitelisting
    - Argument validation
    - Path traversal prevention
    - Resource usage limits
    """

    essential = True  # Essential for system security
    performance_heavy = False

    def __init__(self, config: ShellValidatorConfig):
        """Initialize the shell validator."""
        self.config = config

        # Pre-compile patterns for performance
        self.dangerous_patterns = [
            re.compile(re.escape(cmd), re.IGNORECASE)
            for cmd in config.dangerous_commands
        ]

        # Additional security patterns
        self.security_patterns = {
            "privilege_escalation": re.compile(r"\b(?:sudo|su|doas)\b", re.IGNORECASE),
            "file_destruction": re.compile(
                r"\brm\s+(?:-[rf]*\s*)*(?:/|\*|\.)", re.IGNORECASE
            ),
            "system_modification": re.compile(
                r"\b(?:chmod|chown|chgrp)\s+(?:-R\s+)?(?:777|666|755)", re.IGNORECASE
            ),
            "network_access": re.compile(
                r"\b(?:curl|wget|nc|netcat|telnet|ssh|scp|rsync)\b", re.IGNORECASE
            ),
            "process_control": re.compile(
                r"\b(?:kill|killall|pkill|nohup|disown)\b", re.IGNORECASE
            ),
            "system_info": re.compile(
                r"\b(?:ps|top|htop|netstat|lsof|who|w|last)\b", re.IGNORECASE
            ),
            "compression": re.compile(
                r"\b(?:tar|zip|unzip|gzip|gunzip|7z)\b", re.IGNORECASE
            ),
            "text_processing": re.compile(
                r"\b(?:sed|awk|perl|python|ruby|node)\b", re.IGNORECASE
            ),
        }

        # Command injection patterns
        self.injection_patterns = [
            re.compile(r"[;&|`$()]"),  # Command separators and substitution
            re.compile(r">\s*(?:/dev/null|/dev/zero|/proc/)"),  # Suspicious redirects
            re.compile(r"<\s*(?:/dev/|/proc/)"),  # Suspicious input redirects
            re.compile(r"\${[^}]*}"),  # Variable substitution
            re.compile(r"\$\([^)]*\)"),  # Command substitution
            re.compile(r"`[^`]*`"),  # Backtick command substitution
        ]

        logger.info(
            "Shell validator initialized with %d dangerous commands",
            len(self.dangerous_patterns),
        )

    def validate(self, tool_call) -> dict[str, Any]:
        """Validate a tool call synchronously."""
        start_time = time.time()

        try:
            result = self._perform_validation(tool_call)
            result["execution_time"] = time.time() - start_time
            return result

        except Exception as e:
            logger.error("Shell validator error: %s", str(e))
            return {
                "status": "error",
                "passed": False,
                "error": str(e),
                "execution_time": time.time() - start_time,
            }

    async def validate_async(self, tool_call) -> dict[str, Any]:
        """Validate a tool call asynchronously."""
        return self.validate(tool_call)

    def _perform_validation(self, tool_call) -> dict[str, Any]:
        """Perform the actual validation logic."""
        if tool_call.tool_type.value != "bash":
            return {
                "status": "skipped",
                "passed": True,
                "message": "Not a bash command",
            }

        command = tool_call.parameters.get("command", "")
        if not command:
            return {"status": "failed", "passed": False, "message": "Empty command"}

        issues = []
        warnings = []
        recommendations = []
        security_score = 1.0
        risk_level = "low"

        # Basic command validation
        basic_issues = self._validate_basic_command(command)
        issues.extend(basic_issues)

        # Parse and validate command structure
        try:
            parsed_commands = self._parse_command(command)
            for cmd_parts in parsed_commands:
                cmd_issues, cmd_warnings, cmd_score, cmd_risk = (
                    self._validate_parsed_command(cmd_parts)
                )
                issues.extend(cmd_issues)
                warnings.extend(cmd_warnings)
                security_score = min(security_score, cmd_score)

                if cmd_risk == "critical":
                    risk_level = "critical"
                elif cmd_risk == "high" and risk_level != "critical":
                    risk_level = "high"
                elif cmd_risk == "medium" and risk_level not in ["critical", "high"]:
                    risk_level = "medium"

        except Exception as e:
            issues.append(f"Command parsing error: {e!s}")
            security_score = 0.5

        # Check for injection patterns
        injection_issues = self._check_injection_patterns(command)
        issues.extend(injection_issues)
        if injection_issues:
            security_score = min(security_score, 0.3)
            risk_level = "critical"

        # Generate recommendations
        recommendations = self._generate_recommendations(command, warnings, risk_level)

        # Determine final result
        passed = len(issues) == 0
        status = "passed" if passed else "failed"

        return {
            "status": status,
            "passed": passed,
            "security_score": security_score,
            "risk_level": risk_level,
            "issues": issues,
            "warnings": warnings,
            "recommendations": recommendations,
            "weight": 1.5,  # Shell commands are high priority
            "message": f"Shell validation: {status} (risk: {risk_level})",
        }

    def _validate_basic_command(self, command: str) -> list[str]:
        """Validate basic command properties."""
        issues = []

        # Check command length
        if len(command) > self.config.max_command_length:
            issues.append(
                f"Command too long: {len(command)} > {self.config.max_command_length}"
            )

        # Check for dangerous commands
        for pattern in self.dangerous_patterns:
            if pattern.search(command):
                issues.append(f"Dangerous command detected: {pattern.pattern}")

        # Check for null bytes
        if "\x00" in command:
            issues.append("Null byte in command")

        # Check for non-printable characters
        non_printable = [c for c in command if ord(c) < 32 and c not in "\t\n\r"]
        if non_printable:
            issues.append(f"Non-printable characters detected: {non_printable!r}")

        return issues

    def _parse_command(self, command: str) -> list[list[str]]:
        """Parse command into components."""
        # Handle multiple commands separated by ; & || &&
        commands = []

        # Split on command separators
        for separator in [";", "&&", "||", "&"]:
            if separator in command:
                parts = command.split(separator)
                for part in parts:
                    part = part.strip()
                    if part:
                        try:
                            parsed = shlex.split(part)
                            if parsed:
                                commands.append(parsed)
                        except ValueError:
                            # If shlex fails, treat as single argument
                            commands.append([part])
                return commands

        # Single command
        try:
            parsed = shlex.split(command)
            if parsed:
                commands.append(parsed)
        except ValueError:
            commands.append([command])

        return commands

    def _validate_parsed_command(
        self, cmd_parts: list[str]
    ) -> tuple[list[str], list[str], float, str]:
        """Validate a parsed command."""
        if not cmd_parts:
            return [], [], 1.0, "low"

        issues = []
        warnings = []
        security_score = 1.0
        risk_level = "low"

        command_name = cmd_parts[0]

        # Check if command is allowed
        if self.config.allowed_commands:
            if command_name not in self.config.allowed_commands:
                # Check if it's a built-in or common safe command
                safe_commands = {
                    "echo",
                    "printf",
                    "cat",
                    "head",
                    "tail",
                    "grep",
                    "awk",
                    "sed",
                    "sort",
                    "uniq",
                    "wc",
                    "tr",
                    "cut",
                    "paste",
                    "join",
                    "comm",
                    "ls",
                    "find",
                    "xargs",
                    "basename",
                    "dirname",
                    "pwd",
                    "which",
                    "type",
                    "command",
                    "test",
                    "true",
                    "false",
                    "yes",
                    "no",
                }

                if command_name not in safe_commands:
                    issues.append(f"Command not in allowed list: {command_name}")
                    security_score = 0.4
                    risk_level = "high"

        # Analyze command by category
        category_analysis = self._analyze_command_category(command_name, cmd_parts)
        if category_analysis:
            category_issues, category_warnings, category_score, category_risk = (
                category_analysis
            )
            issues.extend(category_issues)
            warnings.extend(category_warnings)
            security_score = min(security_score, category_score)

            if category_risk == "critical":
                risk_level = "critical"
            elif category_risk == "high" and risk_level != "critical":
                risk_level = "high"
            elif category_risk == "medium" and risk_level not in ["critical", "high"]:
                risk_level = "medium"

        # Check arguments for suspicious patterns
        for arg in cmd_parts[1:]:
            arg_issues = self._validate_argument(arg)
            issues.extend(arg_issues)
            if arg_issues:
                security_score = min(security_score, 0.7)

        return issues, warnings, security_score, risk_level

    def _analyze_command_category(self, command: str, args: list[str]) -> tuple | None:
        """Analyze command by category and return validation results."""

        # File operations
        if command in ["rm", "rmdir"]:
            return self._analyze_file_removal(command, args)
        elif command in ["chmod", "chown", "chgrp"]:
            return self._analyze_permission_change(command, args)
        elif command in ["cp", "mv", "ln"]:
            return self._analyze_file_operations(command, args)

        # Network operations
        elif command in ["curl", "wget", "nc", "netcat"]:
            return self._analyze_network_operations(command, args)

        # System operations
        elif command in ["ps", "kill", "killall", "pkill"]:
            return self._analyze_process_operations(command, args)

        # Package management
        elif command in ["pip", "npm", "yarn", "apt", "yum", "brew"]:
            return self._analyze_package_operations(command, args)

        # Development tools
        elif command in ["git", "make", "docker", "kubectl"]:
            return self._analyze_development_tools(command, args)

        return None

    def _analyze_file_removal(self, command: str, args: list[str]) -> tuple:
        """Analyze file removal commands."""
        issues = []
        warnings = []
        security_score = 1.0
        risk_level = "medium"

        if command == "rm":
            # Check for dangerous flags
            if "-rf" in " ".join(args) or ("-r" in args and "-f" in args):
                if any(
                    dangerous in " ".join(args) for dangerous in ["/", "/*", "*", "~"]
                ):
                    issues.append("Dangerous recursive force removal detected")
                    security_score = 0.1
                    risk_level = "critical"
                else:
                    warnings.append("Recursive force removal - use with caution")
                    security_score = 0.6
                    risk_level = "high"
            elif "-r" in args:
                warnings.append("Recursive removal - verify targets")
                security_score = 0.8

        return issues, warnings, security_score, risk_level

    def _analyze_permission_change(self, command: str, args: list[str]) -> tuple:
        """Analyze permission change commands."""
        issues = []
        warnings = []
        security_score = 1.0
        risk_level = "low"

        if command == "chmod":
            # Check for dangerous permissions
            dangerous_perms = ["777", "666", "755", "644"]
            for arg in args:
                if arg in dangerous_perms:
                    if arg in ["777", "666"]:
                        issues.append(f"Dangerous permission: {arg}")
                        security_score = 0.3
                        risk_level = "critical"
                    else:
                        warnings.append(f"Broad permission: {arg}")
                        security_score = 0.7
                        risk_level = "medium"

        return issues, warnings, security_score, risk_level

    def _analyze_file_operations(self, command: str, args: list[str]) -> tuple:
        """Analyze file operation commands."""
        warnings = []
        security_score = 1.0
        risk_level = "low"

        # Check for dangerous targets
        for arg in args:
            if arg.startswith("/"):
                warnings.append(f"Absolute path operation: {arg}")
                security_score = 0.8
                risk_level = "medium"

        return [], warnings, security_score, risk_level

    def _analyze_network_operations(self, command: str, args: list[str]) -> tuple:
        """Analyze network operation commands."""
        warnings = []
        security_score = 0.7  # Network operations are inherently riskier
        risk_level = "medium"

        warnings.append(f"Network operation: {command}")

        # Check for suspicious URLs or addresses
        for arg in args:
            if any(
                suspicious in arg.lower()
                for suspicious in ["localhost", "127.0.0.1", "0.0.0.0"]
            ):
                warnings.append("Local network access detected")
            elif re.match(r"https?://", arg):
                warnings.append(f"External URL access: {arg}")

        return [], warnings, security_score, risk_level

    def _analyze_process_operations(self, command: str, args: list[str]) -> tuple:
        """Analyze process operation commands."""
        warnings = []
        security_score = 0.8
        risk_level = "medium"

        if command in ["kill", "killall", "pkill"]:
            warnings.append("Process termination command")

            # Check for dangerous signals
            if "-9" in args or "-KILL" in args:
                warnings.append("Force kill signal detected")
                security_score = 0.6
                risk_level = "high"

        return [], warnings, security_score, risk_level

    def _analyze_package_operations(self, command: str, args: list[str]) -> tuple:
        """Analyze package management commands."""
        warnings = []
        security_score = 0.9
        risk_level = "low"

        if "install" in args:
            warnings.append("Package installation detected")
            security_score = 0.7
            risk_level = "medium"

        if any(flag in args for flag in ["-g", "--global", "--system"]):
            warnings.append("Global/system package operation")
            security_score = 0.6
            risk_level = "high"

        return [], warnings, security_score, risk_level

    def _analyze_development_tools(self, command: str, args: list[str]) -> tuple:
        """Analyze development tool commands."""
        warnings = []
        security_score = 0.9
        risk_level = "low"

        if command == "git":
            if "clone" in args:
                warnings.append("Git clone operation")
            elif "push" in args:
                warnings.append("Git push operation")
                security_score = 0.8

        elif command == "docker":
            if "run" in args:
                warnings.append("Docker container execution")
                security_score = 0.7
                risk_level = "medium"
            elif "build" in args:
                warnings.append("Docker build operation")

        return [], warnings, security_score, risk_level

    def _validate_argument(self, arg: str) -> list[str]:
        """Validate individual command argument."""
        issues = []

        # Check for path traversal
        if ".." in arg:
            issues.append(f"Path traversal in argument: {arg}")

        # Check for dangerous paths
        dangerous_paths = ["/etc/", "/var/", "/usr/", "/sys/", "/proc/", "/dev/"]
        for dangerous_path in dangerous_paths:
            if arg.startswith(dangerous_path):
                issues.append(f"Access to system directory: {arg}")

        # Check for glob patterns that might be dangerous
        if "*" in arg and arg.count("*") > 2:
            issues.append(f"Potentially dangerous glob pattern: {arg}")

        return issues

    def _check_injection_patterns(self, command: str) -> list[str]:
        """Check for command injection patterns."""
        issues = []

        for pattern in self.injection_patterns:
            if pattern.search(command):
                issues.append(f"Potential command injection pattern: {pattern.pattern}")

        return issues

    def _generate_recommendations(
        self, command: str, warnings: list[str], risk_level: str
    ) -> list[str]:
        """Generate recommendations based on validation results."""
        recommendations = []

        if risk_level in ["high", "critical"]:
            recommendations.append(
                "Consider running this command in a sandbox environment"
            )
            recommendations.append("Review command for potential security implications")

        if warnings:
            recommendations.append("Review warnings and ensure command necessity")

        if "&&" in command or "||" in command:
            recommendations.append(
                "Consider breaking complex command chains into separate operations"
            )

        if any(op in command for op in [">", ">>", "<", "|"]):
            recommendations.append("Review file operations and pipe usage")

        return recommendations

    def bypass_conditions(self, tool_call) -> list:
        """Return list of conditions that would bypass this validator."""
        return [
            lambda tc: tc.metadata.get("bypass_shell_validator", False),
            lambda tc: tc.metadata.get("trusted_command", False),
            lambda tc: self.config.sandbox_mode and tc.metadata.get("sandboxed", False),
        ]
