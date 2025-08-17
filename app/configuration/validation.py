"""Configuration validation system with comprehensive rule engine."""

import json
import logging
import re
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Validation issue severity levels."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ValidationType(Enum):
    """Types of validation rules."""

    REQUIRED = "required"
    TYPE_CHECK = "type_check"
    RANGE = "range"
    PATTERN = "pattern"
    CUSTOM = "custom"
    DEPENDENCY = "dependency"
    SECURITY = "security"
    PERFORMANCE = "performance"


@dataclass
class ValidationResult:
    """Result of a validation check."""

    rule_name: str
    field_name: str
    severity: ValidationSeverity
    message: str
    current_value: Any = None
    expected_value: Any = None
    suggestion: str | None = None
    category: str = "general"
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "rule_name": self.rule_name,
            "field_name": self.field_name,
            "severity": self.severity.value,
            "message": self.message,
            "current_value": self.current_value,
            "expected_value": self.expected_value,
            "suggestion": self.suggestion,
            "category": self.category,
            "timestamp": self.timestamp.isoformat(),
        }


class ValidationRule(ABC):
    """Abstract base class for validation rules."""

    def __init__(
        self,
        name: str,
        severity: ValidationSeverity = ValidationSeverity.ERROR,
        category: str = "general",
        description: str = "",
    ):
        self.name = name
        self.severity = severity
        self.category = category
        self.description = description

    @abstractmethod
    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        """Validate a field value and return result if validation fails."""
        pass


class RequiredFieldRule(ValidationRule):
    """Rule to check if required fields are present and not empty."""

    def __init__(self, name: str = "required_field", **kwargs):
        super().__init__(name, **kwargs)

    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        if value is None or (isinstance(value, str) and not value.strip()):
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=self.severity,
                message=f"Required field '{field_name}' is missing or empty",
                current_value=value,
                suggestion=f"Provide a valid value for {field_name}",
                category=self.category,
            )
        return None


class TypeCheckRule(ValidationRule):
    """Rule to check if field value matches expected type."""

    def __init__(
        self, expected_type: type | list[type], name: str = "type_check", **kwargs
    ):
        super().__init__(name, **kwargs)
        self.expected_type = (
            expected_type if isinstance(expected_type, list) else [expected_type]
        )

    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        if value is not None and not any(
            isinstance(value, t) for t in self.expected_type
        ):
            type_names = [t.__name__ for t in self.expected_type]
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=self.severity,
                message=f"Field '{field_name}' should be of type {'/'.join(type_names)}, got {type(value).__name__}",
                current_value=value,
                expected_value=f"Type: {'/'.join(type_names)}",
                suggestion=f"Convert {field_name} to appropriate type",
                category=self.category,
            )
        return None


class RangeRule(ValidationRule):
    """Rule to check if numeric value is within specified range."""

    def __init__(
        self,
        min_value: int | float | None = None,
        max_value: int | float | None = None,
        name: str = "range_check",
        **kwargs,
    ):
        super().__init__(name, **kwargs)
        self.min_value = min_value
        self.max_value = max_value

    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        if value is None or not isinstance(value, (int, float)):
            return None

        if self.min_value is not None and value < self.min_value:
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=self.severity,
                message=f"Field '{field_name}' value {value} is below minimum {self.min_value}",
                current_value=value,
                expected_value=f">= {self.min_value}",
                suggestion=f"Set {field_name} to at least {self.min_value}",
                category=self.category,
            )

        if self.max_value is not None and value > self.max_value:
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=self.severity,
                message=f"Field '{field_name}' value {value} exceeds maximum {self.max_value}",
                current_value=value,
                expected_value=f"<= {self.max_value}",
                suggestion=f"Set {field_name} to at most {self.max_value}",
                category=self.category,
            )

        return None


class PatternRule(ValidationRule):
    """Rule to check if string value matches a regex pattern."""

    def __init__(self, pattern: str, name: str = "pattern_check", **kwargs):
        super().__init__(name, **kwargs)
        self.pattern = pattern
        try:
            self.compiled_pattern = re.compile(pattern)
        except re.error as e:
            logger.error(f"Invalid regex pattern {pattern}: {e}")
            self.compiled_pattern = None

    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        if value is None or not isinstance(value, str) or not self.compiled_pattern:
            return None

        if not self.compiled_pattern.match(value):
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=self.severity,
                message=f"Field '{field_name}' does not match required pattern",
                current_value=value,
                expected_value=f"Pattern: {self.pattern}",
                suggestion=f"Ensure {field_name} follows the required format",
                category=self.category,
            )

        return None


class CustomRule(ValidationRule):
    """Rule with custom validation function."""

    def __init__(
        self,
        validator: Callable[[str, Any, dict[str, Any]], ValidationResult | None],
        name: str = "custom_rule",
        **kwargs,
    ):
        super().__init__(name, **kwargs)
        self.validator = validator

    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        try:
            return self.validator(field_name, value, context)
        except Exception as e:
            logger.error(f"Error in custom validation rule {self.name}: {e}")
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=ValidationSeverity.ERROR,
                message=f"Validation error in custom rule: {e}",
                current_value=value,
                category=self.category,
            )


class DependencyRule(ValidationRule):
    """Rule to check dependencies between fields."""

    def __init__(
        self, dependencies: dict[str, Any], name: str = "dependency_check", **kwargs
    ):
        super().__init__(name, **kwargs)
        self.dependencies = dependencies

    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        for dep_field, required_value in self.dependencies.items():
            if dep_field not in context:
                continue

            dep_value = context[dep_field]

            # Check if dependency is satisfied
            if isinstance(required_value, (list, tuple)):
                satisfied = dep_value in required_value
            else:
                satisfied = dep_value == required_value

            if not satisfied:
                return ValidationResult(
                    rule_name=self.name,
                    field_name=field_name,
                    severity=self.severity,
                    message=f"Field '{field_name}' requires '{dep_field}' to be {required_value}",
                    current_value=value,
                    expected_value=f"{dep_field}: {required_value}",
                    suggestion=f"Set {dep_field} to {required_value} or adjust {field_name}",
                    category=self.category,
                )

        return None


class SecurityRule(ValidationRule):
    """Rule for security-related validations."""

    def __init__(
        self, check_type: str = "general", name: str = "security_check", **kwargs
    ):
        super().__init__(name, category="security", **kwargs)
        self.check_type = check_type

    def validate(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> ValidationResult | None:
        if value is None:
            return None

        if self.check_type == "password_strength":
            return self._check_password_strength(field_name, value)
        elif self.check_type == "secret_key":
            return self._check_secret_key(field_name, value)
        elif self.check_type == "url_security":
            return self._check_url_security(field_name, value)
        elif self.check_type == "file_path":
            return self._check_file_path_security(field_name, value)

        return None

    def _check_password_strength(
        self, field_name: str, value: str
    ) -> ValidationResult | None:
        """Check password strength."""
        if not isinstance(value, str):
            return None

        issues = []
        if len(value) < 8:
            issues.append("at least 8 characters")
        if not re.search(r"[A-Z]", value):
            issues.append("uppercase letter")
        if not re.search(r"[a-z]", value):
            issues.append("lowercase letter")
        if not re.search(r"\d", value):
            issues.append("number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            issues.append("special character")

        if issues:
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=self.severity,
                message=f"Weak password: missing {', '.join(issues)}",
                suggestion="Use a strong password with mixed case, numbers, and special characters",
                category=self.category,
            )

        return None

    def _check_secret_key(self, field_name: str, value: str) -> ValidationResult | None:
        """Check secret key security."""
        if not isinstance(value, str):
            return None

        if len(value) < 32:
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=ValidationSeverity.CRITICAL,
                message=f"Secret key too short: {len(value)} characters (minimum 32)",
                suggestion="Generate a longer, more secure secret key",
                category=self.category,
            )

        # Check for common weak patterns
        weak_patterns = ["default", "secret", "password", "123456", "abcdef"]
        if any(pattern in value.lower() for pattern in weak_patterns):
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=ValidationSeverity.CRITICAL,
                message="Secret key contains weak/common patterns",
                suggestion="Generate a cryptographically secure random key",
                category=self.category,
            )

        return None

    def _check_url_security(
        self, field_name: str, value: str
    ) -> ValidationResult | None:
        """Check URL security."""
        if not isinstance(value, str):
            return None

        # Check for HTTP in production URLs
        if value.startswith("http://") and "production" in str(field_name).lower():
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=ValidationSeverity.WARNING,
                message="Using HTTP instead of HTTPS in production",
                suggestion="Use HTTPS URLs for security",
                category=self.category,
            )

        return None

    def _check_file_path_security(
        self, field_name: str, value: str
    ) -> ValidationResult | None:
        """Check file path security."""
        if not isinstance(value, str):
            return None

        # Check for path traversal attempts
        dangerous_patterns = ["../", "..\\", "/etc/", "/root/", "C:\\Windows\\"]
        if any(pattern in value for pattern in dangerous_patterns):
            return ValidationResult(
                rule_name=self.name,
                field_name=field_name,
                severity=ValidationSeverity.CRITICAL,
                message="Potentially dangerous file path detected",
                suggestion="Use relative paths within application directory",
                category=self.category,
            )

        return None


class ConfigValidator:
    """Main configuration validator with rule management."""

    def __init__(self):
        self.rules: dict[str, list[ValidationRule]] = {}
        self.global_rules: list[ValidationRule] = []

        # Add default security rules
        self._add_default_rules()

    def add_rule(self, field_name: str, rule: ValidationRule) -> None:
        """Add a validation rule for a specific field."""
        if field_name not in self.rules:
            self.rules[field_name] = []
        self.rules[field_name].append(rule)

    def add_global_rule(self, rule: ValidationRule) -> None:
        """Add a global validation rule that applies to all fields."""
        self.global_rules.append(rule)

    def remove_rule(self, field_name: str, rule_name: str) -> bool:
        """Remove a validation rule."""
        if field_name in self.rules:
            self.rules[field_name] = [
                rule for rule in self.rules[field_name] if rule.name != rule_name
            ]
            return True
        return False

    def validate_config(self, config: dict[str, Any]) -> list[ValidationResult]:
        """Validate entire configuration and return all issues."""
        results = []

        # Validate each field with its specific rules
        for field_name, rules in self.rules.items():
            value = config.get(field_name)

            for rule in rules:
                result = rule.validate(field_name, value, config)
                if result:
                    results.append(result)

        # Apply global rules to all fields
        for field_name, value in config.items():
            for rule in self.global_rules:
                result = rule.validate(field_name, value, config)
                if result:
                    results.append(result)

        return results

    def validate_field(
        self, field_name: str, value: Any, context: dict[str, Any]
    ) -> list[ValidationResult]:
        """Validate a single field."""
        results = []

        # Apply field-specific rules
        if field_name in self.rules:
            for rule in self.rules[field_name]:
                result = rule.validate(field_name, value, context)
                if result:
                    results.append(result)

        # Apply global rules
        for rule in self.global_rules:
            result = rule.validate(field_name, value, context)
            if result:
                results.append(result)

        return results

    def get_validation_summary(self, results: list[ValidationResult]) -> dict[str, Any]:
        """Get summary of validation results."""
        summary = {
            "total_issues": len(results),
            "by_severity": {},
            "by_category": {},
            "by_field": {},
            "critical_issues": [],
            "recommendations": [],
        }

        for result in results:
            # Count by severity
            severity = result.severity.value
            summary["by_severity"][severity] = (
                summary["by_severity"].get(severity, 0) + 1
            )

            # Count by category
            category = result.category
            summary["by_category"][category] = (
                summary["by_category"].get(category, 0) + 1
            )

            # Count by field
            field = result.field_name
            summary["by_field"][field] = summary["by_field"].get(field, 0) + 1

            # Collect critical issues
            if result.severity == ValidationSeverity.CRITICAL:
                summary["critical_issues"].append(result.to_dict())

            # Collect recommendations
            if result.suggestion:
                summary["recommendations"].append(
                    {"field": result.field_name, "suggestion": result.suggestion}
                )

        return summary

    def create_rule_preset(self, preset_name: str) -> None:
        """Create a preset of validation rules."""
        if preset_name == "production":
            self._add_production_rules()
        elif preset_name == "development":
            self._add_development_rules()
        elif preset_name == "security":
            self._add_security_rules()
        elif preset_name == "performance":
            self._add_performance_rules()

    def export_results(
        self, results: list[ValidationResult], format: str = "json"
    ) -> str:
        """Export validation results in specified format."""
        data = [result.to_dict() for result in results]

        if format == "json":
            return json.dumps(data, indent=2)
        elif format == "yaml":
            import yaml

            return yaml.dump(data, default_flow_style=False)
        elif format == "csv":
            import csv
            import io

            output = io.StringIO()
            if data:
                writer = csv.DictWriter(output, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            return output.getvalue()
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _add_default_rules(self) -> None:
        """Add default validation rules."""
        # Required fields
        self.add_rule("app_name", RequiredFieldRule())
        self.add_rule("secret_key", RequiredFieldRule())

        # Type checks
        self.add_rule("app_port", TypeCheckRule(int))
        self.add_rule("debug", TypeCheckRule(bool))
        self.add_rule("database_pool_size", TypeCheckRule(int))

        # Range checks
        self.add_rule("app_port", RangeRule(min_value=1, max_value=65535))
        self.add_rule("database_pool_size", RangeRule(min_value=1, max_value=100))

        # Security checks
        self.add_rule("secret_key", SecurityRule(check_type="secret_key"))

    def _add_production_rules(self) -> None:
        """Add production-specific validation rules."""
        # Debug should be false in production
        self.add_rule(
            "debug",
            CustomRule(
                lambda field, value, ctx: ValidationResult(
                    rule_name="production_debug",
                    field_name=field,
                    severity=ValidationSeverity.CRITICAL,
                    message="Debug mode should be disabled in production",
                    suggestion="Set debug=False for production deployment",
                    category="production",
                )
                if value is True and ctx.get("environment") == "production"
                else None
            ),
        )

        # HTTPS requirement
        self.add_rule("database_url", SecurityRule(check_type="url_security"))

    def _add_development_rules(self) -> None:
        """Add development-specific validation rules."""
        # More lenient rules for development
        pass

    def _add_security_rules(self) -> None:
        """Add comprehensive security validation rules."""
        # Strong password requirements
        self.add_rule("admin_password", SecurityRule(check_type="password_strength"))

        # File path security
        self.add_rule("log_file_path", SecurityRule(check_type="file_path"))

    def _add_performance_rules(self) -> None:
        """Add performance-related validation rules."""
        # Connection pool sizing
        self.add_rule(
            "database_pool_size",
            CustomRule(
                lambda field, value, ctx: ValidationResult(
                    rule_name="performance_pool_size",
                    field_name=field,
                    severity=ValidationSeverity.WARNING,
                    message="Database pool size may be too small for high load",
                    suggestion="Consider increasing pool size for production workloads",
                    category="performance",
                )
                if isinstance(value, int)
                and value < 10
                and ctx.get("environment") == "production"
                else None
            ),
        )


# Global validator instance
_config_validator: ConfigValidator | None = None


def get_config_validator() -> ConfigValidator:
    """Get the global configuration validator."""
    global _config_validator
    if _config_validator is None:
        _config_validator = ConfigValidator()
    return _config_validator
