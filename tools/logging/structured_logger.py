"""
Structured Logger for VANA

This module provides a structured logging system for the VANA project.
It implements standardized logging with severity, component, operation, and context.
"""

import os
import sys
import json
import uuid
import logging
import datetime
import traceback
from typing import Dict, Any, Optional, Union, List

# Configure default logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

class StructuredLogger:
    """
    Structured Logger for VANA.
    
    This class provides structured logging with standardized format,
    correlation IDs, and context tracking.
    """
    
    def __init__(self, component: str, log_level: int = logging.INFO):
        """
        Initialize the structured logger.
        
        Args:
            component: Component name for the logger
            log_level: Logging level (default: INFO)
        """
        self.component = component
        self.logger = logging.getLogger(component)
        self.logger.setLevel(log_level)
        
        # Add JSON handler if not already present
        self._add_json_handler()
        
        # Correlation ID for tracking operations across components
        self.correlation_id = None
        
        # Context for additional information
        self.context = {}
    
    def _add_json_handler(self):
        """Add a JSON handler to the logger if not already present."""
        # Check if a JSON handler is already present
        for handler in self.logger.handlers:
            if isinstance(handler, JsonLogHandler):
                return
        
        # Get log directory from environment
        log_dir = os.environ.get("VANA_LOG_DIR")
        
        # Add JSON handler if log directory is specified
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, f"{self.component}.json.log")
            handler = JsonLogHandler(log_file)
            handler.setLevel(logging.INFO)
            self.logger.addHandler(handler)
    
    def set_correlation_id(self, correlation_id: Optional[str] = None) -> str:
        """
        Set the correlation ID for tracking operations.
        
        Args:
            correlation_id: Correlation ID (optional, generates a new one if not provided)
            
        Returns:
            The correlation ID
        """
        self.correlation_id = correlation_id or str(uuid.uuid4())
        return self.correlation_id
    
    def add_context(self, key: str, value: Any) -> None:
        """
        Add context information to the logger.
        
        Args:
            key: Context key
            value: Context value
        """
        self.context[key] = value
    
    def clear_context(self) -> None:
        """Clear the context information."""
        self.context.clear()
    
    def _format_log_data(self, level: int, message: str, operation: Optional[str] = None,
                       extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Format log data in a standardized structure.
        
        Args:
            level: Log level
            message: Log message
            operation: Operation being performed (optional)
            extra: Additional data to include (optional)
            
        Returns:
            Structured log data
        """
        # Create timestamp
        timestamp = datetime.datetime.now().isoformat()
        
        # Create log data
        log_data = {
            "timestamp": timestamp,
            "level": logging.getLevelName(level),
            "component": self.component,
            "message": message,
            "correlation_id": self.correlation_id or "none"
        }
        
        # Add operation if provided
        if operation:
            log_data["operation"] = operation
        
        # Add context
        if self.context:
            log_data["context"] = self.context.copy()
        
        # Add extra data
        if extra:
            log_data["data"] = extra
        
        return log_data
    
    def debug(self, message: str, operation: Optional[str] = None,
            extra: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a debug message.
        
        Args:
            message: Log message
            operation: Operation being performed (optional)
            extra: Additional data to include (optional)
        """
        log_data = self._format_log_data(logging.DEBUG, message, operation, extra)
        self.logger.debug(message, extra={"structured": log_data})
    
    def info(self, message: str, operation: Optional[str] = None,
           extra: Optional[Dict[str, Any]] = None) -> None:
        """
        Log an info message.
        
        Args:
            message: Log message
            operation: Operation being performed (optional)
            extra: Additional data to include (optional)
        """
        log_data = self._format_log_data(logging.INFO, message, operation, extra)
        self.logger.info(message, extra={"structured": log_data})
    
    def warning(self, message: str, operation: Optional[str] = None,
              extra: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a warning message.
        
        Args:
            message: Log message
            operation: Operation being performed (optional)
            extra: Additional data to include (optional)
        """
        log_data = self._format_log_data(logging.WARNING, message, operation, extra)
        self.logger.warning(message, extra={"structured": log_data})
    
    def error(self, message: str, operation: Optional[str] = None,
            extra: Optional[Dict[str, Any]] = None,
            exc_info: bool = False) -> None:
        """
        Log an error message.
        
        Args:
            message: Log message
            operation: Operation being performed (optional)
            extra: Additional data to include (optional)
            exc_info: Whether to include exception information (default: False)
        """
        log_data = self._format_log_data(logging.ERROR, message, operation, extra)
        
        # Add exception information if requested
        if exc_info:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            if exc_type is not None:
                log_data["exception"] = {
                    "type": exc_type.__name__,
                    "message": str(exc_value),
                    "traceback": traceback.format_exception(exc_type, exc_value, exc_traceback)
                }
        
        self.logger.error(message, extra={"structured": log_data}, exc_info=exc_info)
    
    def critical(self, message: str, operation: Optional[str] = None,
               extra: Optional[Dict[str, Any]] = None,
               exc_info: bool = False) -> None:
        """
        Log a critical message.
        
        Args:
            message: Log message
            operation: Operation being performed (optional)
            extra: Additional data to include (optional)
            exc_info: Whether to include exception information (default: False)
        """
        log_data = self._format_log_data(logging.CRITICAL, message, operation, extra)
        
        # Add exception information if requested
        if exc_info:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            if exc_type is not None:
                log_data["exception"] = {
                    "type": exc_type.__name__,
                    "message": str(exc_value),
                    "traceback": traceback.format_exception(exc_type, exc_value, exc_traceback)
                }
        
        self.logger.critical(message, extra={"structured": log_data}, exc_info=exc_info)
    
    def log_memory_operation(self, operation: str, status: str,
                          details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a memory operation.
        
        Args:
            operation: Memory operation being performed
            status: Status of the operation (success, failure, etc.)
            details: Additional details about the operation (optional)
        """
        extra = {
            "status": status
        }
        
        if details:
            extra.update(details)
        
        if status == "success":
            self.info(f"Memory operation {operation} completed successfully", operation, extra)
        elif status == "failure":
            self.error(f"Memory operation {operation} failed", operation, extra)
        else:
            self.info(f"Memory operation {operation} status: {status}", operation, extra)


class JsonLogHandler(logging.FileHandler):
    """
    JSON Log Handler for structured logging.
    
    This handler formats log records as JSON and writes them to a file.
    """
    
    def __init__(self, filename: str, mode: str = 'a', encoding: Optional[str] = None,
               delay: bool = False):
        """
        Initialize the JSON log handler.
        
        Args:
            filename: Log file name
            mode: File mode (default: 'a' for append)
            encoding: File encoding (optional)
            delay: Whether to delay opening the file (default: False)
        """
        super().__init__(filename, mode, encoding, delay)
    
    def emit(self, record: logging.LogRecord) -> None:
        """
        Emit a log record.
        
        Args:
            record: Log record to emit
        """
        try:
            # Get structured log data if available
            if hasattr(record, "structured"):
                log_data = record.structured
            else:
                # Create structured data from record
                log_data = {
                    "timestamp": datetime.datetime.now().isoformat(),
                    "level": record.levelname,
                    "component": record.name,
                    "message": record.getMessage(),
                    "correlation_id": "none"
                }
                
                # Add exception information if available
                if record.exc_info:
                    exc_type, exc_value, exc_traceback = record.exc_info
                    log_data["exception"] = {
                        "type": exc_type.__name__,
                        "message": str(exc_value),
                        "traceback": traceback.format_exception(exc_type, exc_value, exc_traceback)
                    }
            
            # Convert to JSON
            json_str = json.dumps(log_data)
            
            # Write to file
            self.stream.write(json_str + "\n")
            self.flush()
        except Exception:
            self.handleError(record)
