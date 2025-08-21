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
Context Sanitizer for validating file operations and content.

This validator ensures that file operations are safe and don't expose
sensitive information or violate security policies.
"""

import hashlib
import logging
import re
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..config.hook_config import ContextSanitizerConfig

logger = logging.getLogger(__name__)


class ContextSanitizer:
    """
    Validates file operations for security and content safety.

    Features:
    - File path validation
    - Content sanitization
    - Sensitive data detection
    - File size and type validation
    - Path traversal prevention
    """

    essential = True  # This validator is essential for security
    performance_heavy = False

    def __init__(self, config: ContextSanitizerConfig):
        """Initialize the context sanitizer."""
        self.config = config

        # Compile regex patterns for performance
        self.sensitive_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in config.sensitive_patterns
        ]

        # Additional security patterns
        self.security_patterns = {
            "api_keys": re.compile(
                r'(?:api[_-]?key|apikey)\s*[:=]\s*["\']?([a-zA-Z0-9_-]{20,})',
                re.IGNORECASE,
            ),
            "tokens": re.compile(
                r'(?:token|jwt|bearer)\s*[:=]\s*["\']?([a-zA-Z0-9._-]{20,})',
                re.IGNORECASE,
            ),
            "passwords": re.compile(
                r'password\s*[:=]\s*["\']([^"\']{8,})', re.IGNORECASE
            ),
            "private_keys": re.compile(
                r"-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----", re.IGNORECASE
            ),
            "connection_strings": re.compile(
                r'(?:mongodb|mysql|postgres|redis)://[^\s<>"\']+', re.IGNORECASE
            ),
            "aws_keys": re.compile(r"AKIA[0-9A-Z]{16}", re.IGNORECASE),
            "github_tokens": re.compile(r"ghp_[a-zA-Z0-9]{36}", re.IGNORECASE),
            "slack_tokens": re.compile(r"xox[baprs]-[0-9a-zA-Z-]{10,}", re.IGNORECASE),
        }

        logger.info(
            "Context sanitizer initialized with %d sensitive patterns",
            len(self.sensitive_patterns),
        )

    def validate(self, tool_call) -> dict[str, Any]:
        """Validate a tool call synchronously."""
        start_time = time.time()

        try:
            result = self._perform_validation(tool_call)
            result["execution_time"] = time.time() - start_time
            return result

        except Exception as e:
            logger.error("Context sanitizer error: %s", str(e))
            return {
                "status": "error",
                "passed": False,
                "error": str(e),
                "execution_time": time.time() - start_time,
            }

    async def validate_async(self, tool_call) -> dict[str, Any]:
        """Validate a tool call asynchronously."""
        # For now, just run sync validation since file operations are typically fast
        return self.validate(tool_call)

    def _perform_validation(self, tool_call) -> dict[str, Any]:
        """Perform the actual validation logic."""
        issues = []
        warnings = []
        recommendations = []
        security_score = 1.0

        # Extract parameters based on tool type
        if tool_call.tool_type.value in ["write", "edit"]:
            file_path = tool_call.parameters.get("file_path", "")
            content = tool_call.parameters.get("content", "")

            # Validate file path
            path_issues = self._validate_file_path(file_path)
            issues.extend(path_issues)

            # Validate content
            content_issues, content_warnings, content_score = self._validate_content(
                content
            )
            issues.extend(content_issues)
            warnings.extend(content_warnings)
            security_score = min(security_score, content_score)

            # Check file size (estimate from content)
            if len(content.encode("utf-8")) > self.config.max_file_size:
                issues.append(
                    f"Content size exceeds limit: {len(content)} bytes > {self.config.max_file_size}"
                )

        elif tool_call.tool_type.value == "multi_edit":
            file_path = tool_call.parameters.get("file_path", "")
            edits = tool_call.parameters.get("edits", [])

            # Validate file path
            path_issues = self._validate_file_path(file_path)
            issues.extend(path_issues)

            # Validate each edit
            for i, edit in enumerate(edits):
                new_string = edit.get("new_string", "")
                content_issues, content_warnings, content_score = (
                    self._validate_content(new_string)
                )

                # Prefix with edit index for clarity
                issues.extend([f"Edit {i}: {issue}" for issue in content_issues])
                warnings.extend(
                    [f"Edit {i}: {warning}" for warning in content_warnings]
                )
                security_score = min(security_score, content_score)

        elif tool_call.tool_type.value == "read":
            file_path = tool_call.parameters.get("file_path", "")

            # Validate file path for read operations
            path_issues = self._validate_file_path(file_path, operation="read")
            issues.extend(path_issues)

        # Generate recommendations
        if warnings:
            recommendations.append("Review flagged content for sensitive information")

        if security_score < 0.8:
            recommendations.append("Consider additional security review")

        # Determine final result
        passed = len(issues) == 0
        status = "passed" if passed else "failed"

        return {
            "status": status,
            "passed": passed,
            "security_score": security_score,
            "issues": issues,
            "warnings": warnings,
            "recommendations": recommendations,
            "weight": 1.0,
            "message": f"Context validation: {status}",
        }

    def _validate_file_path(
        self, file_path: str, operation: str = "write"
    ) -> list[str]:
        """Validate file path for security issues."""
        issues = []

        if not file_path:
            issues.append("Empty file path")
            return issues

        try:
            path = Path(file_path)

            # Check for path traversal
            if ".." in path.parts:
                issues.append("Path traversal detected: '..' in path")

            # Check if path is absolute vs relative
            if not path.is_absolute():
                # For relative paths, ensure they don't escape current directory
                resolved_path = Path.cwd() / path
                try:
                    resolved_path.resolve().relative_to(Path.cwd().resolve())
                except ValueError:
                    issues.append("Relative path escapes current directory")

            # Check blocked paths
            path_str = str(path).lower()
            for blocked_path in self.config.blocked_paths:
                if blocked_path.lower() in path_str:
                    issues.append(f"Blocked path pattern: {blocked_path}")

            # Check file extension
            if operation == "write" and path.suffix:
                if path.suffix.lower() not in self.config.allowed_extensions:
                    issues.append(f"File extension not allowed: {path.suffix}")

            # Check for suspicious file names
            suspicious_names = [
                "passwd",
                "shadow",
                "hosts",
                "sudoers",
                "authorized_keys",
                "id_rsa",
                "id_dsa",
                "id_ecdsa",
                "id_ed25519",
            ]

            if path.name.lower() in suspicious_names:
                issues.append(f"Suspicious file name: {path.name}")

            # Check for hidden/system files
            if path.name.startswith(".") and operation == "write":
                if path.name not in [".gitignore", ".gitattributes", ".editorconfig"]:
                    issues.append(f"Writing to hidden file: {path.name}")

        except Exception as e:
            issues.append(f"Path validation error: {e!s}")

        return issues

    def _validate_content(self, content: str) -> tuple[list[str], list[str], float]:
        """Validate content for sensitive information and security issues."""
        issues = []
        warnings = []
        security_score = 1.0

        if not content:
            return issues, warnings, security_score

        # Check for sensitive patterns from config
        for pattern in self.sensitive_patterns:
            matches = pattern.findall(content)
            if matches:
                warnings.append(f"Sensitive pattern detected: {pattern.pattern}")
                security_score = min(security_score, 0.7)

        # Check for specific security patterns
        for pattern_name, pattern in self.security_patterns.items():
            matches = pattern.findall(content)
            if matches:
                if pattern_name in ["private_keys", "aws_keys", "github_tokens"]:
                    issues.append(f"Critical security issue: {pattern_name} detected")
                    security_score = min(security_score, 0.3)
                else:
                    warnings.append(
                        f"Potential security issue: {pattern_name} detected"
                    )
                    security_score = min(security_score, 0.6)

        # Check for hardcoded secrets (basic patterns)
        secret_indicators = [
            "SECRET_KEY",
            "PRIVATE_KEY",
            "API_SECRET",
            "DB_PASSWORD",
            "JWT_SECRET",
            "ENCRYPTION_KEY",
            "OAUTH_SECRET",
        ]

        for indicator in secret_indicators:
            if indicator in content.upper():
                warnings.append(f"Potential hardcoded secret: {indicator}")
                security_score = min(security_score, 0.8)

        # Check for SQL patterns that might indicate injection
        sql_patterns = [
            r"(?:union|select|insert|update|delete|drop|create|alter)\s+.*(?:from|into|table)",
            r"(?:exec|execute)\s*\(",
            r"(?:sp_|xp_)\w+",
        ]

        for pattern in sql_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append("Potential SQL command detected")
                security_score = min(security_score, 0.8)
                break

        # Check for script injection patterns
        script_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on(?:click|load|error|mouseover)\s*=",
            r"eval\s*\(",
            r"Function\s*\(",
        ]

        for pattern in script_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append("Potential script injection pattern detected")
                security_score = min(security_score, 0.7)
                break

        # Check for command injection patterns
        command_patterns = [
            r"(?:system|exec|shell_exec|passthru|popen)\s*\(",
            r"(?:subprocess|os\.system|os\.popen)",
            r"`[^`]*`",  # Backticks in shell commands
            r"\$\([^)]*\)",  # Command substitution
        ]

        for pattern in command_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append("Potential command injection pattern detected")
                security_score = min(security_score, 0.7)
                break

        # Check content length and encoding
        try:
            encoded_size = len(content.encode("utf-8"))
            if encoded_size > self.config.max_file_size:
                issues.append(f"Content too large: {encoded_size} bytes")
        except UnicodeEncodeError:
            issues.append("Content contains invalid Unicode characters")
            security_score = min(security_score, 0.9)

        # Check for binary content masquerading as text
        null_bytes = content.count("\x00")
        if null_bytes > 0:
            issues.append(f"Binary content detected: {null_bytes} null bytes")
            security_score = min(security_score, 0.5)

        return issues, warnings, security_score

    def get_content_hash(self, content: str) -> str:
        """Generate hash of content for tracking."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    def bypass_conditions(self, tool_call) -> list[Callable]:
        """Return list of conditions that would bypass this validator."""
        return [
            lambda tc: tc.metadata.get("bypass_context_sanitizer", False),
            lambda tc: tc.metadata.get("trusted_source", False),
            lambda tc: tc.tool_type.value == "read"
            and tc.metadata.get("read_only", True),
        ]
