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
Configuration management for the hook orchestration system.
"""

import json
import logging
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    """Validation levels for the hook system."""

    NONE = "none"  # No validation
    BASIC = "basic"  # Essential validations only
    STANDARD = "standard"  # Most validations (default)
    STRICT = "strict"  # All validations including performance-heavy ones


@dataclass
class ValidatorConfig:
    """Configuration for individual validators."""

    enabled: bool = True
    timeout: float = 5.0
    retry_count: int = 1
    bypass_patterns: list[str] = field(default_factory=list)
    custom_rules: dict[str, Any] = field(default_factory=dict)


@dataclass
class ContextSanitizerConfig(ValidatorConfig):
    """Configuration for context sanitizer."""

    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: list[str] = field(
        default_factory=lambda: [
            ".py",
            ".js",
            ".ts",
            ".tsx",
            ".jsx",
            ".json",
            ".yaml",
            ".yml",
            ".md",
            ".txt",
            ".html",
            ".css",
            ".scss",
            ".sql",
        ]
    )
    blocked_paths: list[str] = field(
        default_factory=lambda: [
            "/.env",
            "/.env.local",
            "/secrets/",
            "/private/",
            "/.ssh/",
        ]
    )
    sensitive_patterns: list[str] = field(
        default_factory=lambda: [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']',
            r'token\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
        ]
    )


@dataclass
class ShellValidatorConfig(ValidatorConfig):
    """Configuration for shell validator."""

    dangerous_commands: list[str] = field(
        default_factory=lambda: [
            "rm -rf",
            "sudo rm",
            "dd if=",
            "mkfs",
            "fdisk",
            "parted",
            "shutdown",
            "reboot",
            "halt",
            "poweroff",
            "init 0",
            "init 6",
            "chmod -R 777",
            "chown -R root",
            "passwd",
            "su -",
            "sudo su",
        ]
    )
    allowed_commands: list[str] = field(
        default_factory=lambda: [
            "ls",
            "cd",
            "pwd",
            "echo",
            "cat",
            "grep",
            "find",
            "head",
            "tail",
            "git",
            "npm",
            "pip",
            "python",
            "node",
            "make",
            "docker",
            "kubectl",
        ]
    )
    max_command_length: int = 1000
    allow_pipes: bool = True
    allow_redirects: bool = True
    sandbox_mode: bool = False


@dataclass
class SecurityScannerConfig(ValidatorConfig):
    """Configuration for security scanner."""

    scan_depth: str = "standard"  # basic, standard, deep
    check_xss: bool = True
    check_sql_injection: bool = True
    check_command_injection: bool = True
    check_path_traversal: bool = True
    check_secrets: bool = True
    vulnerability_threshold: float = 0.7  # Minimum security score to pass
    custom_patterns: dict[str, list[str]] = field(default_factory=dict)


@dataclass
class PerformanceConfig:
    """Configuration for performance monitoring."""

    enabled: bool = True
    max_validation_time: float = 10.0  # seconds
    track_memory_usage: bool = True
    track_cpu_usage: bool = True
    alert_threshold: float = 5.0  # seconds
    metrics_retention: int = 7  # days


@dataclass
class FeedbackConfig:
    """Configuration for real-time feedback."""

    enabled: bool = True
    websocket_port: int = 8765
    broadcast_updates: bool = True
    update_frequency: float = 1.0  # seconds
    buffer_size: int = 1000


@dataclass
class HookConfig:
    """Main configuration for the hook orchestration system."""

    enabled: bool = True
    validation_level: ValidationLevel = ValidationLevel.STANDARD
    proceed_on_warnings: bool = True
    graceful_degradation: bool = True
    max_concurrent_validations: int = 10

    # Developer-friendly options
    skip_ts_check: bool = False  # Environment variable: SKIP_TS_CHECK
    force_complete: bool = False  # Environment variable: FORCE_COMPLETE
    soft_fail_mode: bool = True  # Convert errors to warnings when enabled
    respect_tsconfig_excludes: bool = True  # Respect tsconfig.json exclude patterns
    hook_ignore_file: str = ".hookignore"  # File with patterns to ignore

    # Validator configurations
    context_sanitizer: ContextSanitizerConfig = field(
        default_factory=ContextSanitizerConfig
    )
    shell_validator: ShellValidatorConfig = field(default_factory=ShellValidatorConfig)
    security_scanner: SecurityScannerConfig = field(
        default_factory=SecurityScannerConfig
    )

    # System configurations
    performance: PerformanceConfig = field(default_factory=PerformanceConfig)
    feedback: FeedbackConfig = field(default_factory=FeedbackConfig)

    # Advanced settings
    disabled_validators: dict[str, list[str]] = field(default_factory=dict)
    bypass_conditions: dict[str, list[str]] = field(default_factory=dict)
    custom_validators: list[str] = field(default_factory=list)

    # Logging
    log_level: str = "INFO"
    log_file: str | None = None
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    @classmethod
    def load_from_env(cls) -> dict[str, Any]:
        """Load configuration overrides from environment variables."""
        import os

        env_overrides = {}

        # Map environment variables to config fields
        env_mappings = {
            "SKIP_TS_CHECK": (
                "skip_ts_check",
                lambda x: x.lower() in ("true", "1", "yes", "on"),
            ),
            "FORCE_COMPLETE": (
                "force_complete",
                lambda x: x.lower() in ("true", "1", "yes", "on"),
            ),
            "SOFT_FAIL_MODE": (
                "soft_fail_mode",
                lambda x: x.lower() in ("true", "1", "yes", "on"),
            ),
            "RESPECT_TSCONFIG_EXCLUDES": (
                "respect_tsconfig_excludes",
                lambda x: x.lower() in ("true", "1", "yes", "on"),
            ),
            "HOOK_IGNORE_FILE": ("hook_ignore_file", str),
            "HOOK_VALIDATION_LEVEL": (
                "validation_level",
                lambda x: ValidationLevel(x.lower()),
            ),
            "PROCEED_ON_WARNINGS": (
                "proceed_on_warnings",
                lambda x: x.lower() in ("true", "1", "yes", "on"),
            ),
        }

        for env_var, (field, converter) in env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                try:
                    env_overrides[field] = converter(env_value)
                    logger.debug(
                        f"Loaded from env {env_var}: {field} = {env_overrides[field]}"
                    )
                except (ValueError, TypeError) as e:
                    logger.warning(
                        f"Invalid environment variable {env_var}={env_value}: {e}"
                    )

        return env_overrides

    @classmethod
    def load(cls, config_path: str | None = None) -> "HookConfig":
        """Load configuration from file or create default."""
        if config_path is None:
            config_file = Path.cwd() / "hook-config.json"
        else:
            config_file = Path(config_path)

        if config_file.exists():
            try:
                with open(config_file) as f:
                    config_data = json.load(f)

                # Convert validation_level string to enum
                if "validation_level" in config_data:
                    config_data["validation_level"] = ValidationLevel(
                        config_data["validation_level"]
                    )

                # Create nested configs
                nested_configs = {
                    "context_sanitizer": ContextSanitizerConfig,
                    "shell_validator": ShellValidatorConfig,
                    "security_scanner": SecurityScannerConfig,
                    "performance": PerformanceConfig,
                    "feedback": FeedbackConfig,
                }

                for key, config_class in nested_configs.items():
                    if key in config_data:
                        config_data[key] = config_class(**config_data[key])

                # Apply environment variable overrides
                env_overrides = cls.load_from_env()
                config_data.update(env_overrides)

                config = cls(**config_data)
                logger.info("Loaded hook configuration from: %s", config_path)
                if env_overrides:
                    logger.info(
                        "Applied environment overrides: %s", list(env_overrides.keys())
                    )
                return config

            except Exception as e:
                logger.warning(
                    "Failed to load config from %s: %s. Using defaults.",
                    config_path,
                    str(e),
                )
                return cls()
        else:
            logger.info("Config file not found at %s. Using defaults.", config_path)
            # Still apply environment overrides even with default config
            env_overrides = cls.load_from_env()
            config = cls(**env_overrides)
            if env_overrides:
                logger.info(
                    "Applied environment overrides to default config: %s",
                    list(env_overrides.keys()),
                )
            return config

    def save(self, config_path: str | None = None) -> None:
        """Save configuration to file."""
        if config_path is None:
            config_file = Path.cwd() / "hook-config.json"
        else:
            config_file = Path(config_path)

        # Create directory if it doesn't exist
        config_file.parent.mkdir(parents=True, exist_ok=True)

        # Convert to dict and handle enum serialization
        config_dict = asdict(self)
        config_dict["validation_level"] = self.validation_level.value

        try:
            with open(config_file, "w") as f:
                json.dump(config_dict, f, indent=2, default=str)

            logger.info("Saved hook configuration to: %s", config_file)

        except Exception as e:
            logger.error("Failed to save config to %s: %s", config_path, str(e))
            raise

    def update(self, updates: dict[str, Any]):
        """Update configuration with new values."""
        for key, value in updates.items():
            if hasattr(self, key):
                if key == "validation_level" and isinstance(value, str):
                    value = ValidationLevel(value)
                setattr(self, key, value)
                logger.debug("Updated config: %s = %s", key, value)
            else:
                logger.warning("Unknown config key: %s", key)

    def to_dict(self) -> dict[str, Any]:
        """Convert configuration to dictionary."""
        config_dict = asdict(self)
        config_dict["validation_level"] = self.validation_level.value
        return config_dict

    def load_hook_ignore_patterns(self) -> list[str]:
        """Load patterns from .hookignore file."""
        ignore_file = Path(self.hook_ignore_file)
        if ignore_file.exists():
            try:
                with open(ignore_file) as f:
                    patterns = []
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            patterns.append(line)
                    logger.debug(
                        f"Loaded {len(patterns)} ignore patterns from {ignore_file}"
                    )
                    return patterns
            except Exception as e:
                logger.warning(
                    f"Failed to load ignore patterns from {ignore_file}: {e}"
                )
        return []

    def load_tsconfig_excludes(self, tsconfig_path: str = "tsconfig.json") -> list[str]:
        """Load exclude patterns from tsconfig.json."""
        if not self.respect_tsconfig_excludes:
            return []

        tsconfig_file = Path(tsconfig_path)
        if tsconfig_file.exists():
            try:
                import json

                with open(tsconfig_file) as f:
                    tsconfig = json.load(f)
                    excludes = tsconfig.get("exclude", [])
                    logger.debug(
                        f"Loaded {len(excludes)} exclude patterns from {tsconfig_file}"
                    )
                    return excludes
            except Exception as e:
                logger.warning(
                    f"Failed to load tsconfig excludes from {tsconfig_file}: {e}"
                )
        return []

    def should_skip_validation(self, file_path: str) -> bool:
        """Check if a file should be skipped based on ignore patterns."""
        import fnmatch

        # Check .hookignore patterns
        for pattern in self.load_hook_ignore_patterns():
            if fnmatch.fnmatch(file_path, pattern):
                logger.debug(
                    f"Skipping {file_path} due to .hookignore pattern: {pattern}"
                )
                return True

        # Check tsconfig.json excludes
        for pattern in self.load_tsconfig_excludes():
            if fnmatch.fnmatch(file_path, pattern):
                logger.debug(f"Skipping {file_path} due to tsconfig exclude: {pattern}")
                return True

        # Check for TypeScript files when skip_ts_check is enabled
        if self.skip_ts_check and file_path.endswith((".ts", ".tsx")):
            logger.debug(f"Skipping TypeScript file {file_path} due to SKIP_TS_CHECK")
            return True

        return False

    def validate(self) -> list[str]:
        """Validate configuration and return list of issues."""
        issues = []

        # Validate performance settings
        if self.performance.max_validation_time <= 0:
            issues.append("max_validation_time must be positive")

        if self.max_concurrent_validations <= 0:
            issues.append("max_concurrent_validations must be positive")

        # Validate feedback settings
        if self.feedback.websocket_port <= 0 or self.feedback.websocket_port > 65535:
            issues.append("websocket_port must be between 1 and 65535")

        if self.feedback.update_frequency <= 0:
            issues.append("update_frequency must be positive")

        # Validate security scanner settings
        if not 0 <= self.security_scanner.vulnerability_threshold <= 1:
            issues.append("vulnerability_threshold must be between 0 and 1")

        # Validate shell validator settings
        if self.shell_validator.max_command_length <= 0:
            issues.append("max_command_length must be positive")

        # Validate context sanitizer settings
        if self.context_sanitizer.max_file_size <= 0:
            issues.append("max_file_size must be positive")

        return issues

    @property
    def is_valid(self) -> bool:
        """Check if configuration is valid."""
        return len(self.validate()) == 0


def create_default_config() -> HookConfig:
    """Create a default hook configuration."""
    return HookConfig()


def create_production_config() -> HookConfig:
    """Create a production-ready hook configuration."""
    config = HookConfig(
        validation_level=ValidationLevel.STRICT,
        proceed_on_warnings=False,
        graceful_degradation=True,
        max_concurrent_validations=20,
    )

    # Enhanced security settings
    config.security_scanner.vulnerability_threshold = 0.8
    config.security_scanner.scan_depth = "deep"

    # Performance optimizations
    config.performance.max_validation_time = 15.0
    config.performance.alert_threshold = 3.0

    # Enhanced shell validation
    config.shell_validator.sandbox_mode = True
    config.shell_validator.max_command_length = 500

    return config


def create_development_config() -> HookConfig:
    """Create a development-friendly hook configuration."""
    config = HookConfig(
        validation_level=ValidationLevel.BASIC,
        proceed_on_warnings=True,
        graceful_degradation=True,
        max_concurrent_validations=5,
    )

    # Relaxed settings for development
    config.security_scanner.vulnerability_threshold = 0.5
    config.security_scanner.scan_depth = "basic"

    # Faster validation for development
    config.performance.max_validation_time = 5.0
    config.context_sanitizer.timeout = 2.0
    config.shell_validator.timeout = 2.0
    config.security_scanner.timeout = 3.0

    return config
