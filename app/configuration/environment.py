"""Environment configuration management system."""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import yaml
from pydantic import BaseModel, Field, validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Environment(Enum):
    """Environment types."""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


class ConfigScope(Enum):
    """Configuration scope levels."""
    GLOBAL = "global"
    ENVIRONMENT = "environment"
    SERVICE = "service"
    USER = "user"


@dataclass
class ConfigValue:
    """Configuration value with metadata."""
    key: str
    value: Any
    scope: ConfigScope
    environment: Environment
    description: str = ""
    sensitive: bool = False
    required: bool = False
    default: Any = None
    validation_pattern: Optional[str] = None
    source: str = "manual"  # manual, env_var, file, secret_manager
    last_modified: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def validate_value(self) -> bool:
        """Validate the configuration value."""
        if self.required and self.value is None:
            return False
            
        if self.validation_pattern and self.value:
            import re
            try:
                return bool(re.match(self.validation_pattern, str(self.value)))
            except re.error:
                logger.warning(f"Invalid regex pattern for {self.key}: {self.validation_pattern}")
                return True
                
        return True


class EnvironmentConfig(BaseSettings):
    """Base environment configuration with validation."""
    
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
    database_url: Optional[str] = Field(default=None)
    database_pool_size: int = Field(default=20)
    database_max_overflow: int = Field(default=30)
    
    # Cache settings
    redis_url: Optional[str] = Field(default=None)
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
    google_cloud_project: Optional[str] = Field(default=None)
    openai_api_key: Optional[str] = Field(default=None)
    brave_api_key: Optional[str] = Field(default=None)
    
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
        
    @validator('environment', pre=True)
    def validate_environment(cls, v):
        """Validate environment value."""
        if isinstance(v, str):
            try:
                return Environment(v.lower())
            except ValueError:
                return Environment.DEVELOPMENT
        return v
        
    @validator('log_level')
    def validate_log_level(cls, v):
        """Validate log level."""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        return v.upper() if v.upper() in valid_levels else 'INFO'
        
    @validator('app_port', 'metrics_port')
    def validate_port(cls, v):
        """Validate port numbers."""
        if not (1 <= v <= 65535):
            raise ValueError('Port must be between 1 and 65535')
        return v
        
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == Environment.PRODUCTION
        
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment == Environment.DEVELOPMENT
        
    def is_testing(self) -> bool:
        """Check if running in testing."""
        return self.environment == Environment.TESTING or self.testing


class EnvironmentManager:
    """Advanced environment configuration manager."""
    
    def __init__(self, config_dir: str = "config", environments_file: str = "environments.yaml"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        self.environments_file = self.config_dir / environments_file
        self.configurations: Dict[Environment, EnvironmentConfig] = {}
        self.config_values: Dict[str, ConfigValue] = {}
        self.current_environment = Environment.DEVELOPMENT
        
        # Load configurations
        self._load_environment_configs()
        self._detect_current_environment()
        
    def get_config(self, environment: Optional[Environment] = None) -> EnvironmentConfig:
        """Get configuration for specified environment."""
        env = environment or self.current_environment
        
        if env not in self.configurations:
            # Create default configuration
            self.configurations[env] = EnvironmentConfig(environment=env)
            
        return self.configurations[env]
        
    def set_config_value(self, key: str, value: Any, scope: ConfigScope = ConfigScope.ENVIRONMENT,
                        environment: Optional[Environment] = None, **kwargs) -> None:
        """Set a configuration value."""
        env = environment or self.current_environment
        
        config_value = ConfigValue(
            key=key,
            value=value,
            scope=scope,
            environment=env,
            **kwargs
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
                
    def get_config_value(self, key: str, environment: Optional[Environment] = None,
                        default: Any = None) -> Any:
        """Get a configuration value."""
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
        
    def load_from_file(self, file_path: str, environment: Environment,
                      format: str = "auto") -> None:
        """Load configuration from file."""
        file_path = Path(file_path)
        
        if not file_path.exists():
            logger.error(f"Configuration file not found: {file_path}")
            return
            
        # Detect format if auto
        if format == "auto":
            format = file_path.suffix.lower().lstrip('.')
            
        try:
            with open(file_path, 'r') as f:
                if format in ['yaml', 'yml']:
                    data = yaml.safe_load(f)
                elif format == 'json':
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
                    source=f"file:{file_path}"
                )
                
            logger.info(f"Loaded configuration from {file_path}")
            
        except Exception as e:
            logger.error(f"Failed to load configuration from {file_path}: {e}")
            
    def save_to_file(self, file_path: str, environment: Environment,
                    format: str = "yaml", include_sensitive: bool = False) -> None:
        """Save configuration to file."""
        config = self.get_config(environment)
        
        # Get all config values for this environment
        env_values = {
            cv.key: cv.value for cv in self.config_values.values()
            if cv.environment == environment and (include_sensitive or not cv.sensitive)
        }
        
        # Merge with config object
        config_dict = config.dict()
        config_dict.update(env_values)
        
        try:
            with open(file_path, 'w') as f:
                if format in ['yaml', 'yml']:
                    yaml.dump(config_dict, f, default_flow_style=False)
                elif format == 'json':
                    json.dump(config_dict, f, indent=2, default=str)
                    
            logger.info(f"Saved configuration to {file_path}")
            
        except Exception as e:
            logger.error(f"Failed to save configuration to {file_path}: {e}")
            
    def load_from_environment_variables(self, prefix: str = "VANA_") -> None:
        """Load configuration from environment variables."""
        for key, value in os.environ.items():
            if key.startswith(prefix):
                config_key = key[len(prefix):].lower()
                
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
                    source=f"env_var:{key}"
                )
                
    def validate_configuration(self, environment: Optional[Environment] = None) -> List[str]:
        """Validate configuration and return issues."""
        env = environment or self.current_environment
        issues = []
        
        config = self.get_config(env)
        
        # Validate required values
        required_fields = []
        if config.is_production():
            required_fields.extend([
                'secret_key', 'database_url'
            ])
            
        for field in required_fields:
            value = getattr(config, field, None)
            if not value:
                issues.append(f"Required field missing: {field}")
                
        # Validate config values
        for config_value in self.config_values.values():
            if config_value.environment == env and not config_value.validate_value():
                issues.append(f"Invalid value for {config_value.key}")
                
        # Environment-specific validations
        if config.is_production():
            if config.debug:
                issues.append("Debug mode should be disabled in production")
            if 'default' in config.secret_key or len(config.secret_key) < 32:
                issues.append("Weak secret key in production")
                
        return issues
        
    def create_environment_template(self, environment: Environment,
                                  template_file: str) -> None:
        """Create environment configuration template."""
        config = self.get_config(environment)
        template_data = {}
        
        # Add all config fields with descriptions
        for field_name, field in config.__fields__.items():
            template_data[field_name] = {
                'value': getattr(config, field_name),
                'description': field.field_info.description or f"Configuration for {field_name}",
                'required': field.required,
                'type': str(field.type_)
            }
            
        with open(template_file, 'w') as f:
            yaml.dump(template_data, f, default_flow_style=False)
            
        logger.info(f"Created environment template: {template_file}")
        
    def compare_environments(self, env1: Environment, env2: Environment) -> Dict[str, Any]:
        """Compare configurations between two environments."""
        config1 = self.get_config(env1)
        config2 = self.get_config(env2)
        
        differences = {}
        all_fields = set(config1.__fields__.keys()) | set(config2.__fields__.keys())
        
        for field in all_fields:
            val1 = getattr(config1, field, None)
            val2 = getattr(config2, field, None)
            
            if val1 != val2:
                differences[field] = {
                    env1.value: val1,
                    env2.value: val2
                }
                
        return differences
        
    def export_summary(self) -> Dict[str, Any]:
        """Export configuration summary."""
        return {
            "current_environment": self.current_environment.value,
            "environments": {
                env.value: {
                    "config_values": len([
                        cv for cv in self.config_values.values()
                        if cv.environment == env
                    ]),
                    "is_valid": len(self.validate_configuration(env)) == 0
                }
                for env in Environment
            },
            "total_config_values": len(self.config_values),
            "sensitive_values": len([
                cv for cv in self.config_values.values() if cv.sensitive
            ])
        }
        
    def _load_environment_configs(self) -> None:
        """Load environment configurations from file."""
        if not self.environments_file.exists():
            return
            
        try:
            with open(self.environments_file, 'r') as f:
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
        """Detect current environment from environment variables."""
        env_name = os.environ.get('ENVIRONMENT', os.environ.get('ENV', 'development'))
        
        try:
            self.current_environment = Environment(env_name.lower())
        except ValueError:
            logger.warning(f"Unknown environment {env_name}, defaulting to development")
            self.current_environment = Environment.DEVELOPMENT
            
    def _save_environment_configs(self) -> None:
        """Save environment configurations to file."""
        data = {}
        for env, config in self.configurations.items():
            data[env.value] = config.dict()
            
        try:
            with open(self.environments_file, 'w') as f:
                yaml.dump(data, f, default_flow_style=False)
        except Exception as e:
            logger.error(f"Failed to save environments file: {e}")


# Global instance
_environment_manager: Optional[EnvironmentManager] = None


def get_environment_manager() -> EnvironmentManager:
    """Get the global environment manager."""
    global _environment_manager
    if _environment_manager is None:
        _environment_manager = EnvironmentManager()
    return _environment_manager


def get_current_config() -> EnvironmentConfig:
    """Get configuration for current environment."""
    return get_environment_manager().get_config()