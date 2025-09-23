"""Configuration settings for the authentication circuit breaker system."""

import os
from typing import Optional, Set


class CircuitBreakerConfig:
    """Configuration class for circuit breaker settings.
    
    Provides a centralized way to configure circuit breaker thresholds,
    timeouts, and other security parameters. Settings can be overridden
    via environment variables for deployment flexibility.
    """
    
    def __init__(self):
        """Initialize circuit breaker configuration with environment overrides."""
        # Failure thresholds (number of consecutive failed attempts)
        self.warning_threshold = int(os.getenv("CB_WARNING_THRESHOLD", "5"))
        self.temporary_block_threshold = int(os.getenv("CB_TEMP_BLOCK_THRESHOLD", "10"))
        self.extended_block_threshold = int(os.getenv("CB_EXTENDED_BLOCK_THRESHOLD", "20"))
        self.long_term_block_threshold = int(os.getenv("CB_LONG_TERM_BLOCK_THRESHOLD", "50"))
        
        # Block durations (in seconds)
        self.temporary_block_duration = int(os.getenv("CB_TEMP_BLOCK_DURATION", "900"))  # 15 minutes
        self.extended_block_duration = int(os.getenv("CB_EXTENDED_BLOCK_DURATION", "3600"))  # 1 hour
        self.long_term_block_duration = int(os.getenv("CB_LONG_TERM_BLOCK_DURATION", "86400"))  # 24 hours
        
        # Cleanup and maintenance settings
        self.cleanup_interval = int(os.getenv("CB_CLEANUP_INTERVAL", "3600"))  # 1 hour
        self.max_tracking_age = int(os.getenv("CB_MAX_TRACKING_AGE", "604800"))  # 7 days
        
        # Trusted IPs (comma-separated list in environment)
        trusted_ips_env = os.getenv("CB_TRUSTED_IPS", "")
        self.trusted_ips = self._parse_trusted_ips(trusted_ips_env)
        
        # Circuit breaker feature toggle
        self.enabled = os.getenv("CB_ENABLED", "true").lower() in ("true", "1", "yes", "on")
        
        # Logging configuration
        self.log_blocked_requests = os.getenv("CB_LOG_BLOCKED", "true").lower() in ("true", "1", "yes", "on")
        self.log_successful_auth = os.getenv("CB_LOG_SUCCESS", "false").lower() in ("true", "1", "yes", "on")
    
    def _parse_trusted_ips(self, trusted_ips_env: str) -> Set[str]:
        """Parse trusted IPs from environment variable.
        
        Args:
            trusted_ips_env: Comma-separated string of trusted IP addresses
            
        Returns:
            Set of trusted IP addresses
        """
        trusted_ips = set()
        
        # Add default trusted IPs
        default_trusted = {
            "127.0.0.1", "::1", "localhost",
            # Common private network gateways
            "10.0.0.1", "192.168.1.1", "172.16.0.1"
        }
        trusted_ips.update(default_trusted)
        
        # Add IPs from environment variable
        if trusted_ips_env:
            env_ips = [ip.strip() for ip in trusted_ips_env.split(",") if ip.strip()]
            trusted_ips.update(env_ips)
        
        return trusted_ips
    
    def get_environment_summary(self) -> dict:
        """Get a summary of current configuration for monitoring/debugging.
        
        Returns:
            Dictionary containing current configuration values
        """
        return {
            "enabled": self.enabled,
            "warning_threshold": self.warning_threshold,
            "temporary_block_threshold": self.temporary_block_threshold,
            "extended_block_threshold": self.extended_block_threshold,
            "long_term_block_threshold": self.long_term_block_threshold,
            "temporary_block_duration_minutes": self.temporary_block_duration // 60,
            "extended_block_duration_hours": self.extended_block_duration // 3600,
            "long_term_block_duration_hours": self.long_term_block_duration // 3600,
            "cleanup_interval_hours": self.cleanup_interval // 3600,
            "max_tracking_age_days": self.max_tracking_age // 86400,
            "trusted_ips_count": len(self.trusted_ips),
            "log_blocked_requests": self.log_blocked_requests,
            "log_successful_auth": self.log_successful_auth,
        }
    
    @classmethod
    def for_production(cls) -> "CircuitBreakerConfig":
        """Create a production-optimized circuit breaker configuration.
        
        Returns:
            CircuitBreakerConfig with stricter settings for production
        """
        config = cls()
        # More aggressive thresholds for production
        config.warning_threshold = 3
        config.temporary_block_threshold = 5
        config.extended_block_threshold = 10
        config.long_term_block_threshold = 25
        
        # Longer block durations for production
        config.temporary_block_duration = 1800  # 30 minutes
        config.extended_block_duration = 7200   # 2 hours
        config.long_term_block_duration = 172800  # 48 hours
        
        return config
    
    @classmethod
    def for_development(cls) -> "CircuitBreakerConfig":
        """Create a development-friendly circuit breaker configuration.
        
        Returns:
            CircuitBreakerConfig with relaxed settings for development
        """
        config = cls()
        # More lenient thresholds for development
        config.warning_threshold = 10
        config.temporary_block_threshold = 20
        config.extended_block_threshold = 40
        config.long_term_block_threshold = 100
        
        # Shorter block durations for development
        config.temporary_block_duration = 300   # 5 minutes
        config.extended_block_duration = 900    # 15 minutes
        config.long_term_block_duration = 3600  # 1 hour
        
        # Enable more verbose logging in development
        config.log_successful_auth = True
        
        return config
    
    @classmethod
    def for_testing(cls) -> "CircuitBreakerConfig":
        """Create a circuit breaker configuration optimized for testing.
        
        Returns:
            CircuitBreakerConfig with settings suitable for automated tests
        """
        config = cls()
        # Very short durations for testing
        config.temporary_block_duration = 5     # 5 seconds
        config.extended_block_duration = 10     # 10 seconds
        config.long_term_block_duration = 15    # 15 seconds
        
        # Frequent cleanup for testing
        config.cleanup_interval = 10           # 10 seconds
        config.max_tracking_age = 60           # 1 minute
        
        # Disable logging in tests to reduce noise
        config.log_blocked_requests = False
        config.log_successful_auth = False
        
        return config


def get_circuit_breaker_config() -> CircuitBreakerConfig:
    """Get circuit breaker configuration based on environment.
    
    Returns:
        CircuitBreakerConfig instance appropriate for current environment
    """
    env = os.getenv("NODE_ENV", "development").lower()
    
    if env == "production":
        return CircuitBreakerConfig.for_production()
    elif env == "test" or os.getenv("TESTING", "").lower() in ("true", "1", "yes"):
        return CircuitBreakerConfig.for_testing()
    else:
        return CircuitBreakerConfig.for_development()


# Environment variable documentation
ENVIRONMENT_VARIABLES = {
    "CB_ENABLED": {
        "description": "Enable/disable circuit breaker functionality",
        "type": "boolean",
        "default": "true",
        "example": "CB_ENABLED=false"
    },
    "CB_WARNING_THRESHOLD": {
        "description": "Failed attempts before warning state",
        "type": "integer", 
        "default": "5",
        "example": "CB_WARNING_THRESHOLD=3"
    },
    "CB_TEMP_BLOCK_THRESHOLD": {
        "description": "Failed attempts before temporary block",
        "type": "integer",
        "default": "10", 
        "example": "CB_TEMP_BLOCK_THRESHOLD=5"
    },
    "CB_EXTENDED_BLOCK_THRESHOLD": {
        "description": "Failed attempts before extended block",
        "type": "integer",
        "default": "20",
        "example": "CB_EXTENDED_BLOCK_THRESHOLD=10"
    },
    "CB_LONG_TERM_BLOCK_THRESHOLD": {
        "description": "Failed attempts before long-term block",
        "type": "integer",
        "default": "50",
        "example": "CB_LONG_TERM_BLOCK_THRESHOLD=25"
    },
    "CB_TEMP_BLOCK_DURATION": {
        "description": "Temporary block duration in seconds",
        "type": "integer",
        "default": "900",
        "example": "CB_TEMP_BLOCK_DURATION=1800"
    },
    "CB_EXTENDED_BLOCK_DURATION": {
        "description": "Extended block duration in seconds", 
        "type": "integer",
        "default": "3600",
        "example": "CB_EXTENDED_BLOCK_DURATION=7200"
    },
    "CB_LONG_TERM_BLOCK_DURATION": {
        "description": "Long-term block duration in seconds",
        "type": "integer", 
        "default": "86400",
        "example": "CB_LONG_TERM_BLOCK_DURATION=172800"
    },
    "CB_CLEANUP_INTERVAL": {
        "description": "Cleanup interval in seconds",
        "type": "integer",
        "default": "3600",
        "example": "CB_CLEANUP_INTERVAL=1800"
    },
    "CB_MAX_TRACKING_AGE": {
        "description": "Maximum age of tracking data in seconds",
        "type": "integer",
        "default": "604800",
        "example": "CB_MAX_TRACKING_AGE=1209600"
    },
    "CB_TRUSTED_IPS": {
        "description": "Comma-separated list of trusted IP addresses",
        "type": "string",
        "default": "",
        "example": "CB_TRUSTED_IPS=10.0.0.2,192.168.1.100"
    },
    "CB_LOG_BLOCKED": {
        "description": "Log blocked requests for monitoring",
        "type": "boolean",
        "default": "true",
        "example": "CB_LOG_BLOCKED=false"
    },
    "CB_LOG_SUCCESS": {
        "description": "Log successful authentications",
        "type": "boolean", 
        "default": "false",
        "example": "CB_LOG_SUCCESS=true"
    }
}