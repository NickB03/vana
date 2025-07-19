"""
VANA Centralized Logging Configuration

This module provides centralized logging configuration for the VANA project.
It builds on the existing structured logger and provides environment-specific
configuration with proper handlers, formatters, and log levels.
"""

import logging
import logging.config
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Import existing structured logger
from lib.logging.structured_logger import StructuredLogger


class VanaLoggingConfig:
    """
    Centralized logging configuration for VANA.

    Provides environment-specific logging setup with proper handlers,
    formatters, and log levels for development and production environments.
    """

    def __init__(self):
        """Initialize the logging configuration."""
        self.environment = self._detect_environment()
        self.log_dir = self._get_log_directory()
        self.log_level = self._get_log_level()
        self.config = self._create_logging_config()

    def _detect_environment(self) -> str:
        """
        Detect the current environment.

        Returns:
            Environment type: 'production', 'development', or 'testing'
        """
        # Check for Cloud Run environment
        if os.environ.get("K_SERVICE"):
            return "production"

        # Check for testing environment
        if "pytest" in sys.modules or os.environ.get("TESTING"):
            return "testing"

        # Default to development
        return "development"

    def _get_log_directory(self) -> Optional[str]:
        """
        Get the log directory based on environment.

        Returns:
            Log directory path or None for console-only logging
        """
        if self.environment == "production":
            # Cloud Run: Use /tmp for writable filesystem
            return "/tmp/logs"
        elif self.environment == "development":
            # Development: Use project logs directory
            project_root = Path(__file__).parent.parent
            return str(project_root / "logs")
        else:
            # Testing: No file logging
            return None

    def _get_log_level(self) -> str:
        """
        Get the log level based on environment.

        Returns:
            Log level string
        """
        # Check environment variable first
        env_level = os.environ.get("VANA_LOG_LEVEL")
        if env_level:
            return env_level.upper()

        # Environment-specific defaults
        if self.environment == "production":
            return "INFO"
        elif self.environment == "development":
            return "DEBUG"
        else:  # testing
            return "WARNING"

    def _create_logging_config(self) -> Dict[str, Any]:
        """
        Create the logging configuration dictionary.

        Returns:
            Logging configuration dictionary
        """
        config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
                "detailed": {
                    "format": "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
                "json": {
                    "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                    "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": self.log_level,
                    "formatter": "standard",
                    "stream": "ext://sys.stdout",
                }
            },
            "loggers": {
                "vana": {
                    "level": self.log_level,
                    "handlers": ["console"],
                    "propagate": False,
                },
                "agents": {
                    "level": self.log_level,
                    "handlers": ["console"],
                    "propagate": False,
                },
                "lib": {
                    "level": self.log_level,
                    "handlers": ["console"],
                    "propagate": False,
                },
                "tools": {
                    "level": self.log_level,
                    "handlers": ["console"],
                    "propagate": False,
                },
            },
            "root": {"level": self.log_level, "handlers": ["console"]},
        }

        # Add file handlers if log directory is available
        if self.log_dir:
            self._add_file_handlers(config)

        return config

    def _add_file_handlers(self, config: Dict[str, Any]) -> None:
        """
        Add file handlers to the logging configuration.

        Args:
            config: Logging configuration dictionary to modify
        """
        # Ensure log directory exists
        os.makedirs(self.log_dir, exist_ok=True)

        # Add file handlers
        config["handlers"].update(
            {
                "file_all": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "DEBUG",
                    "formatter": "detailed",
                    "filename": os.path.join(self.log_dir, "vana.log"),
                    "maxBytes": 10485760,  # 10MB
                    "backupCount": 5,
                },
                "file_errors": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "ERROR",
                    "formatter": "detailed",
                    "filename": os.path.join(self.log_dir, "vana_errors.log"),
                    "maxBytes": 10485760,  # 10MB
                    "backupCount": 5,
                },
                "file_json": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "INFO",
                    "formatter": "json",
                    "filename": os.path.join(self.log_dir, "vana.json.log"),
                    "maxBytes": 10485760,  # 10MB
                    "backupCount": 5,
                },
            }
        )

        # Update loggers to use file handlers
        for logger_name in ["vana", "agents", "lib", "tools"]:
            config["loggers"][logger_name]["handlers"].extend(["file_all", "file_errors", "file_json"])

        # Update root logger
        config["root"]["handlers"].extend(["file_all", "file_errors", "file_json"])

    def configure_logging(self) -> None:
        """Configure logging using the generated configuration."""
        try:
            logging.config.dictConfig(self.config)

            # Set environment variable for structured logger
            if self.log_dir:
                os.environ["VANA_LOG_DIR"] = self.log_dir

            # Log configuration success
            logger = logging.getLogger("vana.logging_config")
            logger.info(f"Logging configured for {self.environment} environment")
            logger.info(f"Log level: {self.log_level}")
            if self.log_dir:
                logger.info(f"Log directory: {self.log_dir}")
            else:
                logger.info("Console-only logging enabled")

        except Exception as e:
            # Fallback to basic configuration
            logging.basicConfig(
                level=getattr(logging, self.log_level),
                format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            )
            logger = logging.getLogger("vana.logging_config")
            logger.error(f"Failed to configure advanced logging: {e}")
            logger.info("Using basic logging configuration")

    def get_logger(self, name: str) -> logging.Logger:
        """
        Get a logger with the specified name.

        Args:
            name: Logger name

        Returns:
            Configured logger instance
        """
        return logging.getLogger(name)

    def get_structured_logger(self, component: str) -> StructuredLogger:
        """
        Get a structured logger for the specified component.

        Args:
            component: Component name

        Returns:
            Structured logger instance
        """
        return StructuredLogger(component, getattr(logging, self.log_level))


# Global logging configuration instance
_logging_config = None


def setup_logging() -> VanaLoggingConfig:
    """
    Set up logging configuration for VANA.

    Returns:
        Logging configuration instance
    """
    global _logging_config

    if _logging_config is None:
        _logging_config = VanaLoggingConfig()
        _logging_config.configure_logging()

    return _logging_config


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the specified name.

    Args:
        name: Logger name

    Returns:
        Configured logger instance
    """
    if _logging_config is None:
        setup_logging()

    return _logging_config.get_logger(name)


def get_structured_logger(component: str) -> StructuredLogger:
    """
    Get a structured logger for the specified component.

    Args:
        component: Component name

    Returns:
        Structured logger instance
    """
    if _logging_config is None:
        setup_logging()

    return _logging_config.get_structured_logger(component)
