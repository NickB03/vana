#!/usr/bin/env python3
"""
Comprehensive Shell Script Validator

A high-performance shell script validation engine that detects common shellcheck
violations and provides actionable fix suggestions. Designed to integrate with
pre-commit hooks and CI/CD pipelines.

Features:
- Pattern-based validation for shell script issues
- Auto-fix suggestions with detailed explanations
- Severity classification (critical, warning, info)
- Performance optimized for <200ms per script
- Extensible rule system for custom patterns
- Integration with Git hooks and build processes
"""

import argparse
import json
import logging
import re
import sys
import time
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Any


class Severity(Enum):
    """Issue severity levels"""

    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    """Represents a shell script validation issue"""

    rule_id: str
    severity: Severity
    line_number: int
    column: int
    message: str
    original_code: str
    suggested_fix: str
    fix_explanation: str
    rule_category: str


@dataclass
class ValidationResult:
    """Results of shell script validation"""

    file_path: str
    issues: list[ValidationIssue]
    execution_time_ms: float
    total_lines: int
    lines_checked: int

    @property
    def has_critical_issues(self) -> bool:
        return any(issue.severity == Severity.CRITICAL for issue in self.issues)

    @property
    def has_warnings(self) -> bool:
        return any(issue.severity == Severity.WARNING for issue in self.issues)

    @property
    def issue_count_by_severity(self) -> dict[str, int]:
        counts = {severity.value: 0 for severity in Severity}
        for issue in self.issues:
            counts[issue.severity.value] += 1
        return counts


class ShellValidationRule:
    """Base class for shell validation rules"""

    def __init__(self, rule_id: str, severity: Severity, category: str) -> None:
        self.rule_id = rule_id
        self.severity = severity
        self.category = category

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        """Check a line for violations. Override in subclasses."""
        raise NotImplementedError


class UnquotedVariableRule(ShellValidationRule):
    """Detects unquoted variables that may cause word splitting"""

    def __init__(self) -> None:
        super().__init__("SV001", Severity.WARNING, "quoting")
        # Pattern for unquoted variables in dangerous contexts
        self.patterns = [
            # Variable in [ test context
            re.compile(r'\[\s*([^"\']*\$\w+[^"\']*)\s*\]'),
            # Variable in command substitution
            re.compile(r'\$\([^)]*\s+(\$\w+)(?:\s|[^"\'])*\)'),
            # Variable after operators that expect files/strings
            re.compile(r"(?:==|!=|=~|\-[a-z]+)\s+(\$\w+)(?:\s|$)"),
            # Variables in echo without quotes
            re.compile(r'echo\s+([^"\']*\$\w+[^"\']*)'),
            # Variables in path operations
            re.compile(r'(?:cd|cp|mv|rm|mkdir)\s+([^"\']*\$\w+[^"\']*)'),
        ]

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        # Skip lines that are already properly quoted or in comments
        if line.strip().startswith("#") or '"""' in line or "'''" in line:
            return issues

        for pattern in self.patterns:
            for match in pattern.finditer(line):
                unquoted_var = match.group(1)
                # Skip if already quoted
                if unquoted_var.startswith('"') or unquoted_var.startswith("'"):
                    continue

                # Extract variable name
                var_match = re.search(r"\$(\w+)", unquoted_var)
                if var_match:
                    var_name = var_match.group(1)
                    suggested_fix = line.replace(unquoted_var, f'"{unquoted_var}"')

                    issues.append(
                        ValidationIssue(
                            rule_id=self.rule_id,
                            severity=self.severity,
                            line_number=line_number,
                            column=match.start(),
                            message=f"Unquoted variable ${var_name} may cause word splitting",
                            original_code=line.strip(),
                            suggested_fix=suggested_fix.strip(),
                            fix_explanation=f'Quote the variable to prevent word splitting: "${var_name}"',
                            rule_category=self.category,
                        )
                    )

        return issues


class UnsafeRedirectionRule(ShellValidationRule):
    """Detects unsafe redirection patterns"""

    def __init__(self) -> None:
        super().__init__("SV002", Severity.CRITICAL, "redirection")
        self.patterns = [
            # Multiple redirections that may overwrite
            re.compile(r">\s*[^>\s]+.*>\s*[^>\s]+"),
            # Redirection to devices without proper handling
            re.compile(r">\s*/dev/(sda|sdb|null|zero)(?:\s|$)"),
            # Dangerous eval with redirection
            re.compile(r"eval.*>"),
        ]

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        for pattern in self.patterns:
            for match in pattern.finditer(line):
                issues.append(
                    ValidationIssue(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        line_number=line_number,
                        column=match.start(),
                        message="Unsafe redirection pattern detected",
                        original_code=line.strip(),
                        suggested_fix="Review redirection logic and add proper error handling",
                        fix_explanation="Use separate commands or add error checks for multiple redirections",
                        rule_category=self.category,
                    )
                )

        return issues


class MissingSetOptionsRule(ShellValidationRule):
    """Detects missing essential set options"""

    def __init__(self) -> None:
        super().__init__("SV003", Severity.WARNING, "safety")
        self.required_options = {
            "set -e": "Exit immediately if a command exits with a non-zero status",
            "set -u": "Treat unset variables as an error when substituting",
            "set -o pipefail": "Return exit status of the last command in the pipe that failed",
        }

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        # Only check in the beginning of the script
        if line_number > 20:
            return issues

        # Track which options are found
        found_options = context.setdefault("found_set_options", set())

        for option in self.required_options:
            if option in line:
                found_options.add(option)

        # On line 20, check if we have all required options
        if line_number == 20:
            missing_options = set(self.required_options.keys()) - found_options

            for missing_option in missing_options:
                issues.append(
                    ValidationIssue(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        line_number=1,
                        column=0,
                        message=f"Missing recommended set option: {missing_option}",
                        original_code="#!/bin/bash",
                        suggested_fix=f"#!/bin/bash\n{missing_option}",
                        fix_explanation=self.required_options[missing_option],
                        rule_category=self.category,
                    )
                )

        return issues


class CommandSubstitutionRule(ShellValidationRule):
    """Detects problematic command substitution patterns"""

    def __init__(self) -> None:
        super().__init__("SV004", Severity.INFO, "modernization")
        # Prefer $() over backticks
        self.backtick_pattern = re.compile(r"`([^`]+)`")

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        for match in self.backtick_pattern.finditer(line):
            command = match.group(1)
            suggested_fix = line.replace(f"`{command}`", f"$({command})")

            issues.append(
                ValidationIssue(
                    rule_id=self.rule_id,
                    severity=self.severity,
                    line_number=line_number,
                    column=match.start(),
                    message="Use $() instead of backticks for command substitution",
                    original_code=line.strip(),
                    suggested_fix=suggested_fix.strip(),
                    fix_explanation="$() is more readable and supports nesting better than backticks",
                    rule_category=self.category,
                )
            )

        return issues


class ArrayUsageRule(ShellValidationRule):
    """Detects issues with array usage in bash"""

    def __init__(self) -> None:
        super().__init__("SV005", Severity.WARNING, "arrays")
        self.patterns = [
            # Array indexing without quotes
            re.compile(r"\$\{([^}]*\[[^]]*\][^}]*)\}"),
            # Array expansion without proper quoting
            re.compile(r"\$\{([^}]*\[@\][^}]*)\}"),
        ]

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        # Check for array operations
        if "[" in line and "]" in line and "$" in line:
            for pattern in self.patterns:
                for match in pattern.finditer(line):
                    array_ref = match.group(1)

                    issues.append(
                        ValidationIssue(
                            rule_id=self.rule_id,
                            severity=self.severity,
                            line_number=line_number,
                            column=match.start(),
                            message="Review array usage for proper quoting",
                            original_code=line.strip(),
                            suggested_fix=f'Use "${{{array_ref}}}" for proper array expansion',
                            fix_explanation="Proper quoting prevents word splitting in array elements",
                            rule_category=self.category,
                        )
                    )

        return issues


class VariableNamingRule(ShellValidationRule):
    """Validates variable naming conventions"""

    def __init__(self) -> None:
        super().__init__("SV006", Severity.INFO, "naming")
        # Pattern for variable assignments
        self.var_assignment = re.compile(r"^([a-zA-Z_][a-zA-Z0-9_]*)=")

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        match = self.var_assignment.match(line.strip())
        if match:
            var_name = match.group(1)

            # Check for lowercase variables (should be uppercase for globals)
            if (
                var_name.islower()
                and len(var_name) > 1
                and not line.startswith("local ")
            ):
                issues.append(
                    ValidationIssue(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        line_number=line_number,
                        column=0,
                        message=f"Consider using uppercase for global variable: {var_name}",
                        original_code=line.strip(),
                        suggested_fix=line.replace(var_name, var_name.upper()).strip(),
                        fix_explanation="Use uppercase for global variables and lowercase for local variables",
                        rule_category=self.category,
                    )
                )

        return issues


class UnsafeCurlPipeRule(ShellValidationRule):
    """Detects dangerous curl | sh patterns (CodeRabbit pattern)"""

    def __init__(self) -> None:
        super().__init__("SV007", Severity.CRITICAL, "security")
        # Patterns for dangerous curl piping
        self.patterns = [
            # curl URL | sh/bash
            re.compile(r"curl\s+[^|]*\|\s*(?:sh|bash|zsh)"),
            # wget -O- URL | sh/bash
            re.compile(r"wget\s+(?:-O-|--output-document=-)[^|]*\|\s*(?:sh|bash|zsh)"),
            # curl with -s/-L flags piped to shell
            re.compile(
                r"curl\s+(?:-[sL]+|--silent|--location)[^|]*\|\s*(?:sh|bash|zsh)"
            ),
            # Any HTTP(S) URL piped to shell
            re.compile(r"(?:curl|wget)[^|]*https?://[^|]*\|\s*(?:sh|bash|zsh)"),
        ]

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        # Check if any pattern matches (avoid duplicates)
        found_issue = False
        for pattern in self.patterns:
            if pattern.search(line) and not found_issue:
                found_issue = True
                issues.append(
                    ValidationIssue(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        line_number=line_number,
                        column=0,
                        message="Dangerous pattern: piping curl/wget directly to shell",
                        original_code=line.strip(),
                        suggested_fix="# Download and verify before executing:\n# curl URL > script.sh && chmod +x script.sh && ./script.sh",
                        fix_explanation="Piping remote content directly to shell is dangerous. Download, inspect, and verify the script before execution.",
                        rule_category=self.category,
                    )
                )
                break  # Only report once per line

        return issues


class EnhancedUnquotedVariableRule(ShellValidationRule):
    """Enhanced unquoted variable detection (SC2086 compatibility)"""

    def __init__(self) -> None:
        super().__init__("SV008", Severity.WARNING, "quoting")
        # Comprehensive patterns for SC2086 compatibility
        self.patterns = [
            # Variables in array contexts
            re.compile(r"(?:array|declare)\s+[^=]*=\s*\([^)]*(\$\w+)[^)]*\)"),
            # Variables in command arguments without quotes
            re.compile(r'(?:cp|mv|rm|mkdir|touch|chmod|chown)\s+[^"\']*(\$\w+)'),
            # Variables in test conditions
            re.compile(r'\[\s*([^"\']*\$\w+[^"\']*)\s*(?:==|!=|=~|<|>)'),
            # Variables in for loops
            re.compile(r'for\s+\w+\s+in\s+([^"\']*\$\w+[^"\']*);'),
            # Variables in case statements
            re.compile(r"case\s+(\$\w+)\s+in"),
            # Variables in arithmetic contexts (but unquoted)
            re.compile(r"\$\(\(\s*([^)]*\$\w+[^)]*)\s*\)\)"),
            # Function arguments
            re.compile(r"function\s+\w+\s*\(\s*\)\s*\{[^}]*(\$\w+)"),
        ]

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#") or '"""' in line or "'''" in line:
            return issues

        for pattern in self.patterns:
            for match in pattern.finditer(line):
                unquoted_section = match.group(1)

                # Skip if already quoted
                if unquoted_section.startswith('"') or unquoted_section.startswith("'"):
                    continue

                # Extract variable name for better messaging
                var_match = re.search(r"\$(\w+)", unquoted_section)
                if var_match:
                    var_name = var_match.group(1)
                    suggested_fix = line.replace(
                        unquoted_section, f'"{unquoted_section}"'
                    )

                    issues.append(
                        ValidationIssue(
                            rule_id=self.rule_id,
                            severity=self.severity,
                            line_number=line_number,
                            column=match.start(),
                            message=f"SC2086: Double quote to prevent globbing and word splitting on ${var_name}",
                            original_code=line.strip(),
                            suggested_fix=suggested_fix.strip(),
                            fix_explanation=f'Quote variable expansion to prevent word splitting: "${var_name}"',
                            rule_category=self.category,
                        )
                    )

        return issues


class MultipleRedirectsRule(ShellValidationRule):
    """Detects multiple redirects that should use >> instead (SC2129)"""

    def __init__(self) -> None:
        super().__init__("SV009", Severity.WARNING, "redirection")
        # Pattern for multiple echo/printf statements to the same file
        self.redirect_pattern = re.compile(r"(?:echo|printf)[^>]*>\s*([^\s;]+)")

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        # Track redirections to files
        redirections = context.setdefault("redirections", {})

        match = self.redirect_pattern.search(line)
        if match:
            target_file = match.group(1)

            # Check if we've seen this file before
            if target_file in redirections:
                # This is a subsequent redirect to the same file
                previous_line = redirections[target_file]

                issues.append(
                    ValidationIssue(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        line_number=line_number,
                        column=match.start(),
                        message=f"SC2129: Consider using >> instead of > for subsequent writes to {target_file}",
                        original_code=line.strip(),
                        suggested_fix=line.replace(">", ">>").strip(),
                        fix_explanation=f"Use >> to append instead of overwriting. First write to {target_file} was on line {previous_line}.",
                        rule_category=self.category,
                    )
                )
            else:
                # First time seeing this file
                redirections[target_file] = line_number

        return issues


class CommandSubstitutionAssignmentRule(ShellValidationRule):
    """Detects command substitution in variable assignments (SC2155)"""

    def __init__(self) -> None:
        super().__init__("SV010", Severity.WARNING, "assignment")
        # Pattern for declare/local with command substitution
        self.patterns = [
            # local var=$(command)
            re.compile(r"(local\s+\w+)=\$\(([^)]+)\)"),
            # declare var=$(command)
            re.compile(r"(declare\s+(?:-[a-zA-Z]+\s+)?\w+)=\$\(([^)]+)\)"),
            # readonly var=$(command)
            re.compile(r"(readonly\s+\w+)=\$\(([^)]+)\)"),
        ]

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        for pattern in self.patterns:
            for match in pattern.finditer(line):
                declaration = match.group(1)
                command = match.group(2)

                # Extract variable name
                var_match = re.search(r"(\w+)$", declaration)
                if var_match:
                    var_name = var_match.group(1)

                    # Create suggested fix with separate assignment
                    declaration_only = declaration.replace(var_name, var_name)
                    suggested_fix = f"{declaration_only}\n{var_name}=$({command})"

                    issues.append(
                        ValidationIssue(
                            rule_id=self.rule_id,
                            severity=self.severity,
                            line_number=line_number,
                            column=match.start(),
                            message="SC2155: Declare and assign separately to avoid masking return values",
                            original_code=line.strip(),
                            suggested_fix=suggested_fix,
                            fix_explanation=f"Split declaration and assignment of {var_name} to preserve command exit status",
                            rule_category=self.category,
                        )
                    )

        return issues


class UselessCatRule(ShellValidationRule):
    """Detects useless use of cat (optimization pattern)"""

    def __init__(self) -> None:
        super().__init__("SV011", Severity.INFO, "optimization")
        # Patterns for useless cat usage
        self.patterns = [
            # cat file | grep
            re.compile(r"cat\s+([^\s|]+)\s*\|\s*grep"),
            # cat file | head/tail
            re.compile(r"cat\s+([^\s|]+)\s*\|\s*(?:head|tail)"),
            # cat file | wc
            re.compile(r"cat\s+([^\s|]+)\s*\|\s*wc"),
            # cat file | awk
            re.compile(r"cat\s+([^\s|]+)\s*\|\s*awk"),
            # cat file | sed
            re.compile(r"cat\s+([^\s|]+)\s*\|\s*sed"),
        ]

    def check(
        self, line: str, line_number: int, context: dict[str, Any]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        if line.strip().startswith("#"):
            return issues

        for pattern in self.patterns:
            for match in pattern.finditer(line):
                filename = match.group(1)

                # Find the pipe character position
                pipe_pos = line.find("|")
                if pipe_pos != -1:
                    command_after_pipe_full = line[pipe_pos + 1 :].strip()
                    command_parts = command_after_pipe_full.split()
                    if command_parts:
                        command_after_pipe = command_parts[0]
                        command_args = (
                            " ".join(command_parts[1:])
                            if len(command_parts) > 1
                            else ""
                        )

                        # Create suggested fix by removing cat and pipe
                        if command_args:
                            suggested_fix = (
                                f"{command_after_pipe} {filename} {command_args}"
                            )
                        else:
                            suggested_fix = f"{command_after_pipe} {filename}"

                        issues.append(
                            ValidationIssue(
                                rule_id=self.rule_id,
                                severity=self.severity,
                                line_number=line_number,
                                column=match.start(),
                                message=f"Useless use of cat. {command_after_pipe} can read the file directly",
                                original_code=line.strip(),
                                suggested_fix=suggested_fix.strip(),
                                fix_explanation="Most commands can read files directly without cat. This is more efficient.",
                                rule_category=self.category,
                            )
                        )

        return issues


class AutoFixer:
    """Automatic code fix functionality"""

    def __init__(self) -> None:
        self.safe_transformations = {
            "SV001": self._fix_unquoted_variables,
            "SV004": self._fix_command_substitution,
            "SV008": self._fix_enhanced_unquoted_variables,
            "SV009": self._fix_multiple_redirects,
            "SV011": self._fix_useless_cat,
        }

    def can_auto_fix(self, issue: ValidationIssue) -> bool:
        """Check if an issue can be automatically fixed"""
        return issue.rule_id in self.safe_transformations

    def apply_fix(self, content: str, issue: ValidationIssue) -> str:
        """Apply automatic fix to content"""
        if not self.can_auto_fix(issue):
            return content

        lines = content.splitlines()
        if issue.line_number <= len(lines):
            # Apply the fix function
            fix_func = self.safe_transformations[issue.rule_id]
            lines[issue.line_number - 1] = fix_func(lines[issue.line_number - 1], issue)

        return "\n".join(lines)

    def _fix_unquoted_variables(self, line: str, issue: ValidationIssue) -> str:
        """Fix unquoted variables by adding quotes"""
        # Simple quote addition - only if suggested fix contains quotes
        if '"' in issue.suggested_fix and issue.suggested_fix != line:
            return issue.suggested_fix
        return line

    def _fix_command_substitution(self, line: str, issue: ValidationIssue) -> str:
        """Fix backticks to $() syntax"""
        return issue.suggested_fix if issue.suggested_fix != line else line

    def _fix_enhanced_unquoted_variables(
        self, line: str, issue: ValidationIssue
    ) -> str:
        """Fix enhanced unquoted variables"""
        return issue.suggested_fix if issue.suggested_fix != line else line

    def _fix_multiple_redirects(self, line: str, issue: ValidationIssue) -> str:
        """Fix multiple redirects by changing > to >>"""
        return issue.suggested_fix if issue.suggested_fix != line else line

    def _fix_useless_cat(self, line: str, issue: ValidationIssue) -> str:
        """Fix useless cat usage"""
        return issue.suggested_fix if issue.suggested_fix != line else line

    def apply_all_fixes(
        self, content: str, issues: list[ValidationIssue]
    ) -> tuple[str, int]:
        """Apply all possible automatic fixes"""
        fixed_content = content
        fixes_applied = 0

        # Sort issues by line number in reverse order to avoid line number shifts
        sorted_issues = sorted(
            [issue for issue in issues if self.can_auto_fix(issue)],
            key=lambda x: x.line_number,
            reverse=True,
        )

        for issue in sorted_issues:
            new_content = self.apply_fix(fixed_content, issue)
            if new_content != fixed_content:
                fixed_content = new_content
                fixes_applied += 1

        return fixed_content, fixes_applied


class ShellValidator:
    """Main shell script validator class"""

    def __init__(self, enable_performance_mode: bool = True) -> None:
        self.rules: list[ShellValidationRule] = []
        self.enable_performance_mode = enable_performance_mode
        self.auto_fixer = AutoFixer()
        self._setup_default_rules()

        # Performance tracking
        self.validation_stats = {
            "total_files": 0,
            "total_lines": 0,
            "total_time_ms": 0.0,
            "avg_time_per_file_ms": 0.0,
        }

    def _setup_default_rules(self) -> None:
        """Initialize default validation rules"""
        self.rules = [
            UnquotedVariableRule(),
            UnsafeRedirectionRule(),
            MissingSetOptionsRule(),
            CommandSubstitutionRule(),
            ArrayUsageRule(),
            VariableNamingRule(),
            UnsafeCurlPipeRule(),
            EnhancedUnquotedVariableRule(),
            MultipleRedirectsRule(),
            CommandSubstitutionAssignmentRule(),
            UselessCatRule(),
        ]

    def add_rule(self, rule: ShellValidationRule) -> None:
        """Add a custom validation rule"""
        self.rules.append(rule)

    def remove_rule(self, rule_id: str) -> None:
        """Remove a validation rule by ID"""
        self.rules = [rule for rule in self.rules if rule.rule_id != rule_id]

    def validate_file(self, file_path: str) -> ValidationResult:
        """Validate a single shell script file"""
        start_time = time.time()

        try:
            with open(file_path, encoding="utf-8") as f:
                lines = f.readlines()
        except Exception as e:
            return ValidationResult(
                file_path=file_path,
                issues=[
                    ValidationIssue(
                        rule_id="SV000",
                        severity=Severity.CRITICAL,
                        line_number=0,
                        column=0,
                        message=f"Failed to read file: {e!s}",
                        original_code="",
                        suggested_fix="Check file permissions and encoding",
                        fix_explanation="Ensure the file is readable and uses UTF-8 encoding",
                        rule_category="file_access",
                    )
                ],
                execution_time_ms=0,
                total_lines=0,
                lines_checked=0,
            )

        all_issues = []
        context: dict[str, Any] = {}
        lines_checked = 0

        for line_number, line in enumerate(lines, 1):
            # Skip empty lines and comments for performance
            if self.enable_performance_mode and (
                not line.strip() or line.strip().startswith("#")
            ):
                continue

            lines_checked += 1

            # Apply all rules to this line
            for rule in self.rules:
                try:
                    issues = rule.check(line, line_number, context)
                    all_issues.extend(issues)
                except Exception as e:
                    # Log rule execution errors but continue
                    logging.warning(
                        f"Rule {rule.rule_id} failed on line {line_number}: {e!s}"
                    )

        execution_time = (time.time() - start_time) * 1000

        # Update performance stats
        self.validation_stats["total_files"] += 1
        self.validation_stats["total_lines"] += len(lines)
        self.validation_stats["total_time_ms"] += execution_time
        self.validation_stats["avg_time_per_file_ms"] = (
            self.validation_stats["total_time_ms"]
            / self.validation_stats["total_files"]
        )

        return ValidationResult(
            file_path=file_path,
            issues=all_issues,
            execution_time_ms=execution_time,
            total_lines=len(lines),
            lines_checked=lines_checked,
        )

    def validate_content(
        self, content: str, file_path: str = "stdin"
    ) -> ValidationResult:
        """Validate shell script content directly"""
        start_time = time.time()

        lines = content.splitlines()
        all_issues = []
        context: dict[str, Any] = {}
        lines_checked = 0

        for line_number, line in enumerate(lines, 1):
            if self.enable_performance_mode and (
                not line.strip() or line.strip().startswith("#")
            ):
                continue

            lines_checked += 1

            for rule in self.rules:
                try:
                    issues = rule.check(line, line_number, context)
                    all_issues.extend(issues)
                except Exception as e:
                    logging.warning(
                        f"Rule {rule.rule_id} failed on line {line_number}: {e!s}"
                    )

        execution_time = (time.time() - start_time) * 1000

        return ValidationResult(
            file_path=file_path,
            issues=all_issues,
            execution_time_ms=execution_time,
            total_lines=len(lines),
            lines_checked=lines_checked,
        )

    def validate_directory(
        self, directory_path: str, patterns: list[str] | None = None
    ) -> list[ValidationResult]:
        """Validate all shell scripts in a directory"""
        if patterns is None:
            patterns = ["*.sh", "*.bash"]

        results = []
        directory = Path(directory_path)

        for pattern in patterns:
            for file_path in directory.rglob(pattern):
                if file_path.is_file():
                    result = self.validate_file(str(file_path))
                    results.append(result)

        return results

    def auto_fix_content(
        self, content: str, file_path: str = "stdin"
    ) -> tuple[str, int, ValidationResult]:
        """Apply automatic fixes to content and return fixed content, fixes count, and validation result"""
        # First validate to get issues
        result = self.validate_content(content, file_path)

        # Apply auto-fixes
        fixed_content, fixes_applied = self.auto_fixer.apply_all_fixes(
            content, result.issues
        )

        return fixed_content, fixes_applied, result

    def auto_fix_file(
        self, file_path: str, backup: bool = True
    ) -> tuple[bool, int, ValidationResult]:
        """Auto-fix a file in place with optional backup"""
        try:
            with open(file_path, encoding="utf-8") as f:
                original_content = f.read()
        except Exception as e:
            logging.error(f"Failed to read file {file_path}: {e}")
            return False, 0, ValidationResult(file_path, [], 0, 0, 0)

        # Apply fixes
        fixed_content, fixes_applied, validation_result = self.auto_fix_content(
            original_content, file_path
        )

        if fixes_applied > 0:
            # Create backup if requested
            if backup:
                backup_path = f"{file_path}.shell-validator.backup"
                try:
                    with open(backup_path, "w", encoding="utf-8") as f:
                        f.write(original_content)
                    logging.info(f"Created backup: {backup_path}")
                except Exception as e:
                    logging.warning(f"Failed to create backup: {e}")

            # Write fixed content
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(fixed_content)
                logging.info(f"Applied {fixes_applied} fixes to {file_path}")
                return True, fixes_applied, validation_result
            except Exception as e:
                logging.error(f"Failed to write fixed content to {file_path}: {e}")
                return False, 0, validation_result

        return False, 0, validation_result

    def generate_report(
        self, results: list[ValidationResult], output_format: str = "json"
    ) -> str:
        """Generate a comprehensive validation report"""
        if output_format == "json":
            return self._generate_json_report(results)
        elif output_format == "html":
            return self._generate_html_report(results)
        elif output_format == "text":
            return self._generate_text_report(results)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

    def _generate_json_report(self, results: list[ValidationResult]) -> str:
        """Generate JSON format report"""
        report_data = {
            "metadata": {
                "validator_version": "1.0.0",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_files": len(results),
                "performance_stats": self.validation_stats,
            },
            "summary": {
                "total_issues": sum(len(result.issues) for result in results),
                "critical_issues": sum(
                    1 for result in results if result.has_critical_issues
                ),
                "files_with_warnings": sum(
                    1 for result in results if result.has_warnings
                ),
                "avg_execution_time_ms": sum(
                    result.execution_time_ms for result in results
                )
                / len(results)
                if results
                else 0,
            },
            "results": [
                {
                    "file_path": result.file_path,
                    "execution_time_ms": result.execution_time_ms,
                    "total_lines": result.total_lines,
                    "lines_checked": result.lines_checked,
                    "issue_count_by_severity": result.issue_count_by_severity,
                    "issues": [asdict(issue) for issue in result.issues],
                }
                for result in results
            ],
        }

        return json.dumps(report_data, indent=2, default=str)

    def _generate_html_report(self, results: list[ValidationResult]) -> str:
        """Generate HTML format report"""
        total_issues = sum(len(result.issues) for result in results)
        critical_count = sum(1 for result in results if result.has_critical_issues)

        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shell Script Validation Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }}
        .metric {{ background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }}
        .metric h3 {{ margin: 0 0 10px 0; color: #495057; }}
        .metric .value {{ font-size: 24px; font-weight: bold; }}
        .critical {{ color: #dc3545; }}
        .warning {{ color: #ffc107; }}
        .info {{ color: #17a2b8; }}
        .file-result {{ margin: 20px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 6px; }}
        .issue {{ margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid #007bff; }}
        .issue.critical {{ border-left-color: #dc3545; }}
        .issue.warning {{ border-left-color: #ffc107; }}
        .issue.info {{ border-left-color: #17a2b8; }}
        .code {{ font-family: monospace; background: #e9ecef; padding: 5px; border-radius: 3px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Shell Script Validation Report</h1>
            <p>Generated on {time.strftime("%Y-%m-%d %H:%M:%S")}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Files</h3>
                <div class="value">{len(results)}</div>
            </div>
            <div class="metric">
                <h3>Total Issues</h3>
                <div class="value">{total_issues}</div>
            </div>
            <div class="metric">
                <h3>Critical Issues</h3>
                <div class="value critical">{critical_count}</div>
            </div>
            <div class="metric">
                <h3>Avg Time (ms)</h3>
                <div class="value">{self.validation_stats["avg_time_per_file_ms"]:.1f}</div>
            </div>
        </div>

        <h2>📋 File Results</h2>
"""

        for result in results:
            html += f"""
        <div class="file-result">
            <h3>📄 {result.file_path}</h3>
            <p><strong>Execution Time:</strong> {result.execution_time_ms:.1f}ms |
               <strong>Lines Checked:</strong> {result.lines_checked}/{result.total_lines} |
               <strong>Issues:</strong> {len(result.issues)}</p>
"""

            for issue in result.issues:
                html += f"""
            <div class="issue {issue.severity.value}">
                <h4>🔧 {issue.rule_id}: {issue.message}</h4>
                <p><strong>Line {issue.line_number}:</strong> <span class="code">{issue.original_code}</span></p>
                <p><strong>Suggested Fix:</strong> <span class="code">{issue.suggested_fix}</span></p>
                <p><strong>Explanation:</strong> {issue.fix_explanation}</p>
            </div>
"""

            html += "</div>"

        html += """
    </div>
</body>
</html>
"""
        return html

    def _generate_text_report(self, results: list[ValidationResult]) -> str:
        """Generate plain text format report"""
        report = ["🔍 Shell Script Validation Report", "=" * 40, ""]

        total_issues = sum(len(result.issues) for result in results)
        critical_count = sum(1 for result in results if result.has_critical_issues)

        report.extend(
            [
                "📊 Summary:",
                f"  Total Files: {len(results)}",
                f"  Total Issues: {total_issues}",
                f"  Critical Issues: {critical_count}",
                f"  Average Execution Time: {self.validation_stats['avg_time_per_file_ms']:.1f}ms",
                "",
            ]
        )

        for result in results:
            if not result.issues:
                continue

            report.extend(
                [
                    f"📄 {result.file_path}",
                    f"   Execution Time: {result.execution_time_ms:.1f}ms",
                    f"   Lines Checked: {result.lines_checked}/{result.total_lines}",
                    f"   Issues Found: {len(result.issues)}",
                    "",
                ]
            )

            for issue in result.issues:
                severity_icon = {"critical": "🚨", "warning": "⚠️", "info": "i"}[
                    issue.severity.value
                ]
                report.extend(
                    [
                        f"   {severity_icon} {issue.rule_id}: {issue.message}",
                        f"      Line {issue.line_number}: {issue.original_code}",
                        f"      Fix: {issue.suggested_fix}",
                        f"      Explanation: {issue.fix_explanation}",
                        "",
                    ]
                )

        return "\n".join(report)


def main() -> int:
    """Command-line interface for the shell validator"""
    parser = argparse.ArgumentParser(
        description="Comprehensive Shell Script Validator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s script.sh                    # Validate single file
  %(prog)s --directory src/             # Validate directory
  %(prog)s --stdin < script.sh          # Validate from stdin
  %(prog)s script.sh --format html      # Generate HTML report
  %(prog)s --directory . --git-hook     # Use as git pre-commit hook
        """,
    )

    parser.add_argument("files", nargs="*", help="Shell script files to validate")
    parser.add_argument("--directory", "-d", help="Directory to scan for shell scripts")
    parser.add_argument(
        "--stdin", action="store_true", help="Read script content from stdin"
    )
    parser.add_argument(
        "--format",
        choices=["json", "html", "text"],
        default="text",
        help="Output format (default: text)",
    )
    parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    parser.add_argument(
        "--git-hook",
        action="store_true",
        help="Enable git hook mode (exit with non-zero on critical issues)",
    )
    parser.add_argument(
        "--performance",
        action="store_true",
        default=True,
        help="Enable performance mode (default: enabled)",
    )
    parser.add_argument("--exclude-rules", nargs="+", help="Rule IDs to exclude")
    parser.add_argument("--only-rules", nargs="+", help="Only run specified rule IDs")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    args = parser.parse_args()

    # Setup logging
    log_level = logging.INFO if args.verbose else logging.WARNING
    logging.basicConfig(level=log_level, format="%(levelname)s: %(message)s")

    # Initialize validator
    validator = ShellValidator(enable_performance_mode=args.performance)

    # Filter rules if requested
    if args.exclude_rules:
        for rule_id in args.exclude_rules:
            validator.remove_rule(rule_id)

    if args.only_rules:
        validator.rules = [
            rule for rule in validator.rules if rule.rule_id in args.only_rules
        ]

    # Collect validation results
    results = []

    if args.stdin:
        content = sys.stdin.read()
        result = validator.validate_content(content)
        results.append(result)
    elif args.directory:
        results = validator.validate_directory(args.directory)
    elif args.files:
        for file_path in args.files:
            result = validator.validate_file(file_path)
            results.append(result)
    else:
        parser.error("Must specify files, directory, or --stdin")

    # Generate report
    report = validator.generate_report(results, args.format)

    # Output report
    if args.output:
        with open(args.output, "w") as f:
            f.write(report)
        print(f"Report written to {args.output}")
    else:
        print(report)

    # Git hook mode: exit with error code if critical issues found
    if args.git_hook:
        critical_issues = any(result.has_critical_issues for result in results)
        if critical_issues:
            print("\n❌ Critical shell script issues found. Commit blocked.")
            return 1
        else:
            print("\n✅ Shell script validation passed.")
            return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
