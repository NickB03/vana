import json
import time
import logging
import uuid
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class LogEntry:
    """Structured log entry."""
    timestamp: float
    level: str
    message: str
    correlation_id: str
    component: str
    metadata: Dict[str, Any] = None
    
    def to_json(self) -> str:
        """Convert log entry to JSON string."""
        return json.dumps(asdict(self), default=str)

class StructuredLogger:
    """Centralized structured logging with correlation IDs."""
    
    def __init__(self, component: str, correlation_id: str = None):
        self.component = component
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.logger = logging.getLogger(component)
    
    def _log(self, level: str, message: str, **metadata):
        """Internal logging method."""
        entry = LogEntry(
            timestamp=time.time(),
            level=level,
            message=message,
            correlation_id=self.correlation_id,
            component=self.component,
            metadata=metadata
        )
        
        # Log as JSON for structured logging
        self.logger.log(
            getattr(logging, level.upper()),
            entry.to_json()
        )
    
    def debug(self, message: str, **metadata):
        """Log debug message."""
        self._log("debug", message, **metadata)
    
    def info(self, message: str, **metadata):
        """Log info message."""
        self._log("info", message, **metadata)
    
    def warning(self, message: str, **metadata):
        """Log warning message."""
        self._log("warning", message, **metadata)
    
    def error(self, message: str, **metadata):
        """Log error message."""
        self._log("error", message, **metadata)
    
    def critical(self, message: str, **metadata):
        """Log critical message."""
        self._log("critical", message, **metadata)
    
    def with_correlation_id(self, correlation_id: str) -> 'StructuredLogger':
        """Create new logger with different correlation ID."""
        return StructuredLogger(self.component, correlation_id)
