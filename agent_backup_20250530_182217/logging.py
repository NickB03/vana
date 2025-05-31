#!/usr/bin/env python3
"""
Logging System for VANA Agent

This module provides a comprehensive logging system for the VANA agent,
with support for different log levels, formatting, and storage.
"""

import os
import sys
import logging
import logging.handlers
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Default log directory
DEFAULT_LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs")

# Log levels
LOG_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL
}

class VanaLogger:
    """
    Logger for the VANA agent.
    
    This class provides methods for logging messages at different levels,
    with support for console and file output, log rotation, and structured logging.
    """
    
    def __init__(
        self,
        name: str = "vana",
        level: str = "info",
        log_dir: Optional[str] = None,
        console: bool = True,
        file: bool = True,
        max_bytes: int = 10 * 1024 * 1024,  # 10 MB
        backup_count: int = 5,
        structured: bool = False
    ):
        """
        Initialize the logger.
        
        Args:
            name: Logger name
            level: Log level (debug, info, warning, error, critical)
            log_dir: Directory to store log files
            console: Whether to log to console
            file: Whether to log to file
            max_bytes: Maximum size of log files before rotation
            backup_count: Number of backup log files to keep
            structured: Whether to use structured (JSON) logging
        """
        self.name = name
        self.level = LOG_LEVELS.get(level.lower(), logging.INFO)
        self.log_dir = log_dir or DEFAULT_LOG_DIR
        self.console = console
        self.file = file
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.structured = structured
        
        # Create logger
        self.logger = logging.getLogger(name)
        self.logger.setLevel(self.level)
        self.logger.propagate = False
        
        # Clear existing handlers
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)
        
        # Add handlers
        if console:
            self._add_console_handler()
        
        if file:
            self._add_file_handler()
    
    def _add_console_handler(self):
        """Add a console handler to the logger."""
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.level)
        
        if self.structured:
            formatter = logging.Formatter('%(message)s')
        else:
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
    
    def _add_file_handler(self):
        """Add a file handler to the logger."""
        # Create log directory if it doesn't exist
        os.makedirs(self.log_dir, exist_ok=True)
        
        # Create log file path
        log_file = os.path.join(self.log_dir, f"{self.name}.log")
        
        # Create rotating file handler
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=self.max_bytes,
            backupCount=self.backup_count
        )
        file_handler.setLevel(self.level)
        
        if self.structured:
            formatter = logging.Formatter('%(message)s')
        else:
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
    
    def _format_structured(self, level: str, message: str, **kwargs) -> str:
        """
        Format a structured log message.
        
        Args:
            level: Log level
            message: Log message
            **kwargs: Additional log data
            
        Returns:
            Formatted log message
        """
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "name": self.name,
            "message": message
        }
        
        # Add additional data
        if kwargs:
            log_data["data"] = kwargs
        
        return json.dumps(log_data)
    
    def debug(self, message: str, **kwargs):
        """
        Log a debug message.
        
        Args:
            message: Log message
            **kwargs: Additional log data
        """
        if self.structured:
            message = self._format_structured("debug", message, **kwargs)
        elif kwargs:
            message = f"{message} - {json.dumps(kwargs)}"
        
        self.logger.debug(message)
    
    def info(self, message: str, **kwargs):
        """
        Log an info message.
        
        Args:
            message: Log message
            **kwargs: Additional log data
        """
        if self.structured:
            message = self._format_structured("info", message, **kwargs)
        elif kwargs:
            message = f"{message} - {json.dumps(kwargs)}"
        
        self.logger.info(message)
    
    def warning(self, message: str, **kwargs):
        """
        Log a warning message.
        
        Args:
            message: Log message
            **kwargs: Additional log data
        """
        if self.structured:
            message = self._format_structured("warning", message, **kwargs)
        elif kwargs:
            message = f"{message} - {json.dumps(kwargs)}"
        
        self.logger.warning(message)
    
    def error(self, message: str, **kwargs):
        """
        Log an error message.
        
        Args:
            message: Log message
            **kwargs: Additional log data
        """
        if self.structured:
            message = self._format_structured("error", message, **kwargs)
        elif kwargs:
            message = f"{message} - {json.dumps(kwargs)}"
        
        self.logger.error(message)
    
    def critical(self, message: str, **kwargs):
        """
        Log a critical message.
        
        Args:
            message: Log message
            **kwargs: Additional log data
        """
        if self.structured:
            message = self._format_structured("critical", message, **kwargs)
        elif kwargs:
            message = f"{message} - {json.dumps(kwargs)}"
        
        self.logger.critical(message)
    
    def log_tool_call(self, tool_name: str, args: Dict[str, Any], result: Any):
        """
        Log a tool call.
        
        Args:
            tool_name: Name of the tool
            args: Tool arguments
            result: Tool result
        """
        self.info(
            f"Tool call: {tool_name}",
            tool=tool_name,
            args=args,
            result=result
        )
    
    def log_session_start(self, session_id: str, user_id: str):
        """
        Log a session start.
        
        Args:
            session_id: Session ID
            user_id: User ID
        """
        self.info(
            f"Session started: {session_id}",
            session_id=session_id,
            user_id=user_id,
            event="session_start"
        )
    
    def log_session_end(self, session_id: str, user_id: str):
        """
        Log a session end.
        
        Args:
            session_id: Session ID
            user_id: User ID
        """
        self.info(
            f"Session ended: {session_id}",
            session_id=session_id,
            user_id=user_id,
            event="session_end"
        )
    
    def log_message(self, session_id: str, user_id: str, role: str, content: str):
        """
        Log a message.
        
        Args:
            session_id: Session ID
            user_id: User ID
            role: Message role (user or assistant)
            content: Message content
        """
        self.info(
            f"Message ({role}): {content[:50]}{'...' if len(content) > 50 else ''}",
            session_id=session_id,
            user_id=user_id,
            role=role,
            content=content,
            event="message"
        )

# Create a default logger
default_logger = VanaLogger()

# Convenience functions
def get_logger(name: str = "vana", **kwargs) -> VanaLogger:
    """
    Get a logger with the specified name and configuration.
    
    Args:
        name: Logger name
        **kwargs: Logger configuration
        
    Returns:
        Configured logger
    """
    return VanaLogger(name=name, **kwargs)

def set_default_logger(logger: VanaLogger):
    """
    Set the default logger.
    
    Args:
        logger: Logger to set as default
    """
    global default_logger
    default_logger = logger

def debug(message: str, **kwargs):
    """
    Log a debug message with the default logger.
    
    Args:
        message: Log message
        **kwargs: Additional log data
    """
    default_logger.debug(message, **kwargs)

def info(message: str, **kwargs):
    """
    Log an info message with the default logger.
    
    Args:
        message: Log message
        **kwargs: Additional log data
    """
    default_logger.info(message, **kwargs)

def warning(message: str, **kwargs):
    """
    Log a warning message with the default logger.
    
    Args:
        message: Log message
        **kwargs: Additional log data
    """
    default_logger.warning(message, **kwargs)

def error(message: str, **kwargs):
    """
    Log an error message with the default logger.
    
    Args:
        message: Log message
        **kwargs: Additional log data
    """
    default_logger.error(message, **kwargs)

def critical(message: str, **kwargs):
    """
    Log a critical message with the default logger.
    
    Args:
        message: Log message
        **kwargs: Additional log data
    """
    default_logger.critical(message, **kwargs)
