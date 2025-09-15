"""Environment configuration management system."""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

import yaml
from pydantic import Field, validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Environment(Enum):
    """Environment types.
    
    Defines the different deployment environments supported by the application.
    Each environment may have different configuration requirements and validation rules.
    
    Attributes:
        DEVELOPMENT: Local development environment with relaxed settings.
        TESTING: Automated testing environment with test-specific configurations.
        STAGING: Pre-production environment that mirrors production.
        PRODUCTION: Live production environment with strict security and performance requirements.
    """

    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


class ConfigScope(Enum):
    """Configuration scope levels.
    
    Defines the hierarchical scope levels for configuration values, allowing
    for inheritance and override behavior.
    
    Attributes:
        GLOBAL: Global configuration values that apply across all environments.
        ENVIRONMENT: Environment-specific configuration values.
        SERVICE: Service-specific configuration values.
        USER: User-specific configuration values with highest priority.
    """

    GLOBAL = "global"
    ENVIRONMENT = "environment"
    SERVICE = "service"
    USER = "user"


@dataclass
class ConfigValue:
    """Configuration value with metadata.
    
    Represents a single configuration value with associated metadata including
    scope, environment, validation rules, and source information.
    
    Attributes:
        key: Configuration key identifier.
        value: The actual configuration value.
        scope: Scope level of the configuration.
        environment: Target environment for the configuration.
        description: Human-readable description of the configuration.
        sensitive: Whether the value contains sensitive information.
        required: Whether the configuration is required.
        default: Default value if not specified.
        validation_pattern: Regex pattern for value validation.
        source: Source of the configuration value.
        last_modified: Timestamp of last modification.
    """

    key: str
    value: Any
    scope: ConfigScope
    environment: Environment
    description: str = ""
    sensitive: bool = False
    required: bool = False
    default: Any = None
    validation_pattern: str | None = None
    source: str = "manual"  # manual, env_var, file, secret_manager
    last_modified: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def validate_value(self) -> bool:
        """Validate the configuration value against requirements.
        
        Checks if the configuration value meets basic validation requirements
        including required field validation and pattern matching.
        
        Returns:
            True if the value is valid, False otherwise.
        """
        if self.required and self.value is None:
            return False

        if self.validation_pattern and self.value:
            import re

            try:
                return bool(re.match(self.validation_pattern, str(self.value)))
            except re.error:
                logger.warning(
                    f"Invalid regex pattern for {self.key}: {self.validation_pattern}"
                )
                return True

        return True


class EnvironmentConfig(BaseSettings):
    """Base environment configuration with validation.
    
    Pydantic-based configuration class that provides type validation,
    environment variable loading, and configuration management for
    different deployment environments.
    
    This class serves as the foundation for all environment-specific
    configuration settings with built-in validation and sensible defaults.
    """

    # Core settings
    environment: Environment = Field(default=Environment.DEVELOPMENT)
    debug: bool = Field(default=False)
    testing: bool = Field(default=False)

    # Application settings
    app_name: str = Field(default="vana")
    app_version: str = Field(default="1.0.0")
    app_host: str = Field(default="localhost")
    app_port: int = Field(default=8000)

    # Database settings
    database_url: str | None = Field(default=None)
    database_pool_size: int = Field(default=20)
    database_max_overflow: int = Field(default=30)

    # Cache settings
    redis_url: str | None = Field(default=None)
    cache_ttl: int = Field(default=3600)
    cache_max_size: int = Field(default=10000)

    # Security settings
    secret_key: str = Field(default_factory=lambda: os.urandom(32).hex())
    jwt_algorithm: str = Field(default="HS256")
    jwt_expire_minutes: int = Field(default=30)

    # Monitoring settings
    enable_metrics: bool = Field(default=True)
    metrics_port: int = Field(default=9090)
    log_level: str = Field(default="INFO")

    # External services
    google_cloud_project: str | None = Field(default=None)
    openai_api_key: str | None = Field(default=None)
    brave_api_key: str | None = Field(default=None)

    # Performance settings
    max_workers: int = Field(default=4)
    request_timeout: int = Field(default=30)
    max_request_size: int = Field(default=16 * 1024 * 1024)  # 16MB

    # Feature flags
    enable_authentication: bool = Field(default=True)
    enable_rate_limiting: bool = Field(default=True)
    enable_cors: bool = Field(default=True)
    enable_compression: bool = Field(default=True)

    class Config:
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Pydantic v2 compatibility - ignore extra fields

    @validator("environment", pre=True)
    def validate_environment(cls, v):
        """Validate and normalize environment value.
        
        Args:
            v: Raw environment value from configuration source.
            
        Returns:
            Validated Environment enum value.
        """
        """Validate environment value."""
        if isinstance(v, str):
            try:
                return Environment(v.lower())
            except ValueError:
                return Environment.DEVELOPMENT
        return v

    @validator("log_level")
    def validate_log_level(cls, v):
        """Validate log level against standard logging levels.
        
        Args:
            v: Log level string to validate.
            
        Returns:
            Uppercase log level string if valid, 'INFO' as fallback.
        """
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        return v.upper() if v.upper() in valid_levels else "INFO"

    @validator("app_port", "metrics_port")
    def validate_port(cls, v):
        """Validate port numbers are within valid range.
        
        Args:
            v: Port number to validate.
            
        Returns:
            Valid port number.
            
        Raises:
            ValueError: If port is outside valid range (1-65535).
        """
        """Validate port numbers."""
        if not (1 <= v <= 65535):
            raise ValueError("Port must be between 1 and 65535")
        return v

    def is_production(self) -> bool:
        """Check if running in production environment.
        
        Returns:
            True if environment is production, False otherwise.
        """
        return self.environment == Environment.PRODUCTION

    def is_development(self) -> bool:
        """Check if running in development environment.
        
        Returns:
            True if environment is development, False otherwise.
        """
        return self.environment == Environment.DEVELOPMENT

    def is_testing(self) -> bool:
        """Check if running in testing environment.
        
        Returns:
            True if environment is testing or testing flag is set, False otherwise.
        """
        return self.environment == Environment.TESTING or self.testing


class EnvironmentManager:
    """Advanced environment configuration manager.
    
    Provides comprehensive environment-specific configuration management
    with support for multiple environments, configuration inheritance,
    validation, and file-based persistence.
    
    Attributes:
        config_dir: Directory path for configuration files.
        environments_file: Path to environments configuration file.
        configurations: Dictionary of environment-specific configurations.
        config_values: Dictionary of all configuration values with metadata.
        current_environment: Currently active environment.
    """

    def __init__(
        self, config_dir: str = "config", environments_file: str = "environments.yaml"
    ):
        """Initialize the environment manager.
        
        Args:
            config_dir: Directory for storing configuration files.
            environments_file: Filename for environments configuration.
        """
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)

        self.environments_file = self.config_dir / environments_file
        self.configurations: dict[Environment, EnvironmentConfig] = {}
        self.config_values: dict[str, ConfigValue] = {}
        self.current_environment = Environment.DEVELOPMENT

        # Load configurations
        self._load_environment_configs()
        self._detect_current_environment()

    def get_config(self, environment: Environment | None = None) -> EnvironmentConfig:
        """Get configuration for specified environment.
        
        Args:
            environment: Target environment, uses current if None.
            
        Returns:
            EnvironmentConfig instance for the specified environment.
        """
        env = environment or self.current_environment

        if env not in self.configurations:
            # Create default configuration
            self.configurations[env] = EnvironmentConfig(environment=env)

        return self.configurations[env]

    def set_config_value(
        self,
        key: str,
        value: Any,
        scope: ConfigScope = ConfigScope.ENVIRONMENT,
        environment: Environment | None = None,
        **kwargs,
    ) -> None:
        """Set a configuration value with metadata.
        
        Args:
            key: Configuration key identifier.
            value: Configuration value to set.
            scope: Scope level for the configuration.
            environment: Target environment, uses current if None.
            **kwargs: Additional metadata for the ConfigValue.
            
        Raises:
            ValueError: If the configuration value fails validation.
        """
        env = environment or self.current_environment

        config_value = ConfigValue(
            key=key, value=value, scope=scope, environment=env, **kwargs
        )

        # Validate the value
        if not config_value.validate_value():
            raise ValueError(f"Invalid value for {key}: {value}")

        self.config_values[f"{env.value}.{key}"] = config_value

        # Update environment config if it's an environment-scoped value
        if scope == ConfigScope.ENVIRONMENT and env in self.configurations:
            config = self.configurations[env]
            if hasattr(config, key):
                setattr(config, key, value)

    def get_config_value(
        self, key: str, environment: Environment | None = None, default: Any = None
    ) -> Any:
        """Get a configuration value with scope inheritance.
        
        Searches for configuration values in order of specificity:
        1. Environment-specific values
        2. Global values
        3. Environment config object attributes
        4. Default value
        
        Args:
            key: Configuration key to retrieve.
            environment: Target environment, uses current if None.
            default: Default value if key not found.
            
        Returns:
            Configuration value or default if not found.
        """
        env = environment or self.current_environment

        # Try environment-specific value first
        env_key = f"{env.value}.{key}"
        if env_key in self.config_values:
            return self.config_values[env_key].value

        # Try global value
        global_key = f"{ConfigScope.GLOBAL.value}.{key}"
        if global_key in self.config_values:
            return self.config_values[global_key].value

        # Try from environment config
        config = self.get_config(env)
        if hasattr(config, key):
            return getattr(config, key)

        return default

    def load_from_file(
        self, file_path: str, environment: Environment, format: str = "auto"
    ) -> None:
        """Load configuration from file.
        
        Args:
            file_path: Path to configuration file.
            environment: Target environment for loaded values.
            format: File format ('auto', 'yaml', 'yml', 'json').
        """
        file_path = Path(file_path)

        if not file_path.exists():
            logger.error(f"Configuration file not found: {file_path}")
            return

        # Detect format if auto
        if format == "auto":
            format = file_path.suffix.lower().lstrip(".")

        try:
            with open(file_path) as f:
                if format in ["yaml", "yml"]:
                    data = yaml.safe_load(f)
                elif format == "json":
                    data = json.load(f)
                else:
                    logger.error(f"Unsupported format: {format}")
                    return

            # Load values
            for key, value in data.items():
                self.set_config_value(
                    key=key,
                    value=value,
                    environment=environment,
                    source=f"file:{file_path}",
                )

            logger.info(f"Loaded configuration from {file_path}")

        except Exception as e:
            logger.error(f"Failed to load configuration from {file_path}: {e}")

    def save_to_file(
        self,
        file_path: str,
        environment: Environment,
        format: str = "yaml",
        include_sensitive: bool = False,
    ) -> None:
        """Save configuration to file.
        
        Args:
            file_path: Output file path.
            environment: Environment configuration to save.
            format: Output format ('yaml', 'yml', 'json').
            include_sensitive: Whether to include sensitive values.
        """
        config = self.get_config(environment)

        # Get all config values for this environment
        env_values = {
            cv.key: cv.value
            for cv in self.config_values.values()
            if cv.environment == environment and (include_sensitive or not cv.sensitive)
        }

        # Merge with config object
        config_dict = config.dict()
        config_dict.update(env_values)

        try:
            with open(file_path, "w") as f:
                if format in ["yaml", "yml"]:
                    yaml.dump(config_dict, f, default_flow_style=False)
                elif format == "json":
                    json.dump(config_dict, f, indent=2, default=str)

            logger.info(f"Saved configuration to {file_path}")

        except Exception as e:
            logger.error(f"Failed to save configuration to {file_path}: {e}")

    def load_from_environment_variables(self, prefix: str = "VANA_") -> None:
        """Load configuration from environment variables.
        
        Args:
            prefix: Environment variable prefix to filter by.
        """
        for key, value in os.environ.items():
            if key.startswith(prefix):
                config_key = key[len(prefix) :].lower()

                # Try to parse value as JSON for complex types
                parsed_value = value
                try:
                    parsed_value = json.loads(value)
                except (json.JSONDecodeError, ValueError):
                    # Keep as string if not valid JSON
                    pass

                self.set_config_value(
                    key=config_key,
                    value=parsed_value,
                    scope=ConfigScope.ENVIRONMENT,
                    source=f"env_var:{key}",
                )

    def validate_configuration(
        self, environment: Environment | None = None
    ) -> list[str]:
        """Validate configuration and return issues.
        
        Args:
            environment: Environment to validate, uses current if None.
            
        Returns:
            List of validation issue descriptions.
        """
        env = environment or self.current_environment
        issues = []

        config = self.get_config(env)

        # Validate required values
        required_fields = []
        if config.is_production():
            required_fields.extend(["secret_key", "database_url"])

        for field_name in required_fields:
            value = getattr(config, field_name, None)
            if not value:
                issues.append(f"Required field missing: {field_name}")

        # Validate config values
        for config_value in self.config_values.values():
            if config_value.environment == env and not config_value.validate_value():
                issues.append(f"Invalid value for {config_value.key}")

        # Environment-specific validations
        if config.is_production():
            if config.debug:
                issues.append("Debug mode should be disabled in production")
            if "default" in config.secret_key or len(config.secret_key) < 32:
                issues.append("Weak secret key in production")

        return issues

    def create_environment_template(
        self, environment: Environment, template_file: str
    ) -> None:
        """Create environment configuration template."""
        config = self.get_config(environment)
        template_data = {}

        # Add all config fields with descriptions
        # Use compatibility accessor for Pydantic v1/v2
        fields = getattr(config, "model_fields", getattr(config, "__fields__", {}))
        for field_name, field_info in fields.items():
            # Handle both Pydantic v1 and v2 field info structures
            if hasattr(field_info, "field_info"):
                # Pydantic v1
                description = field_info.field_info.description
                required = field_info.required
                field_type = str(field_info.type_)
            else:
                # Pydantic v2
                description = getattr(field_info, "description", None)
                required = getattr(field_info, "is_required", lambda: False)()
                field_type = str(getattr(field_info, "annotation", "Any"))

            template_data[field_name] = {
                "value": getattr(config, field_name),
                "description": description or f"Configuration for {field_name}",
                "required": required,
                "type": field_type,
            }

        with open(template_file, "w") as f:
            yaml.dump(template_data, f, default_flow_style=False)

        logger.info(f"Created environment template: {template_file}")

    def compare_environments(
        self, env1: Environment, env2: Environment
    ) -> dict[str, Any]:
        """Compare configurations between two environments."""
        config1 = self.get_config(env1)
        config2 = self.get_config(env2)

        differences = {}
        # Use compatibility accessor for Pydantic v1/v2
        fields1 = getattr(config1, "model_fields", getattr(config1, "__fields__", {}))
        fields2 = getattr(config2, "model_fields", getattr(config2, "__fields__", {}))
        all_fields = set(fields1.keys()) | set(fields2.keys())

        for field_name in all_fields:
            val1 = getattr(config1, field_name, None)
            val2 = getattr(config2, field_name, None)

            if val1 != val2:
                differences[field_name] = {env1.value: val1, env2.value: val2}

        return differences

    def export_summary(self) -> dict[str, Any]:
        """Export configuration summary."""
        return {
            "current_environment": self.current_environment.value,
            "environments": {
                env.value: {
                    "config_values": len(
                        [
                            cv
                            for cv in self.config_values.values()
                            if cv.environment == env
                        ]
                    ),
                    "is_valid": len(self.validate_configuration(env)) == 0,
                }
                for env in Environment
            },
            "total_config_values": len(self.config_values),
            "sensitive_values": len(
                [cv for cv in self.config_values.values() if cv.sensitive]
            ),
        }

    def _load_environment_configs(self) -> None:
        """Load environment configurations from file."""
        if not self.environments_file.exists():
            return

        try:
            with open(self.environments_file) as f:
                data = yaml.safe_load(f) or {}

            for env_name, env_data in data.items():
                try:
                    environment = Environment(env_name)
                    config = EnvironmentConfig(**env_data)
                    self.configurations[environment] = config
                except (ValueError, TypeError) as e:
                    logger.error(f"Failed to load environment {env_name}: {e}")

        except Exception as e:
            logger.error(f"Failed to load environments file: {e}")

    def _detect_current_environment(self) -> None:
        """Detect current environment with NODE_ENV priority and backwards compatibility."""
        # Priority order: NODE_ENV → ENVIRONMENT → ENV → default
        env_name = (
            os.environ.get("NODE_ENV")
            or os.environ.get("ENVIRONMENT")
            or os.environ.get("ENV")
            or "development"
        )

        # Log migration status for monitoring
        self._log_migration_status()

        try:
            self.current_environment = Environment(env_name.lower())
        except ValueError:
            logger.warning(f"Unknown environment {env_name}, defaulting to development")
            self.current_environment = Environment.DEVELOPMENT

    def _log_migration_status(self) -> None:
        """Log environment variable migration status for monitoring."""
        node_env = os.environ.get("NODE_ENV")
        environment = os.environ.get("ENVIRONMENT")
        env = os.environ.get("ENV")

        # Log migration progress
        if node_env and not (environment or env):
            logger.info(f"✅ Environment migration complete: Using NODE_ENV={node_env}")
        elif node_env and (environment or env):
            if (environment and node_env.lower() == environment.lower()) or (
                env and node_env.lower() == env.lower()
            ):
                logger.info(
                    f"⚠️ Environment migration in progress: NODE_ENV={node_env} (legacy vars present)"
                )
            else:
                legacy_val = environment or env
                legacy_name = "ENVIRONMENT" if environment else "ENV"
                logger.warning(
                    f"🚨 Environment variable conflict: NODE_ENV={node_env} vs {legacy_name}={legacy_val}"
                )
        elif environment and not node_env:
            logger.warning(
                f"🔄 Using legacy ENVIRONMENT={environment}. Please migrate to NODE_ENV={environment}"
            )
        elif env and not node_env:
            logger.warning(
                f"🔄 Using legacy ENV={env}. Please migrate to NODE_ENV={env}"
            )

    def _save_environment_configs(self) -> None:
        """Save environment configurations to file."""
        data = {}
        for env, config in self.configurations.items():
            data[env.value] = config.dict()

        try:
            with open(self.environments_file, "w") as f:
                yaml.dump(data, f, default_flow_style=False)
        except Exception as e:
            logger.error(f"Failed to save environments file: {e}")


# Global instance
_environment_manager: EnvironmentManager | None = None


def get_environment_manager() -> EnvironmentManager:
    """Get the global environment manager singleton.
    
    Returns:
        The global EnvironmentManager instance, creating it if needed.
    """
    global _environment_manager
    if _environment_manager is None:
        _environment_manager = EnvironmentManager()
    return _environment_manager


def reset_environment_manager() -> None:
    """Reset the global environment manager.
    
    Clears the global singleton instance, useful for testing scenarios
    where a fresh environment manager is needed.
    """
    global _environment_manager
    _environment_manager = None


def get_current_config() -> EnvironmentConfig:
    """Get configuration for current environment.
    
    Convenience function that returns the configuration for the
    currently active environment.
    
    Returns:
        EnvironmentConfig for the current environment.
    """
    return get_environment_manager().get_config()
