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
Comprehensive Error Handling and Logging System

This module provides standardized error handling, consistent logging,
and secure error responses across the entire application.
"""

import asyncio
import logging
import os
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class ErrorSeverity(str, Enum):
    """Standardized error severity levels"""
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(str, Enum):
    """Error categories for better classification"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    NETWORK = "network"
    DATABASE = "database"
    EXTERNAL_API = "external_api"
    SSE_CONNECTION = "sse_connection"
    INTERNAL = "internal"
    RATE_LIMIT = "rate_limit"
    CONFIGURATION = "configuration"


class ErrorResponse(BaseModel):
    """Standardized error response format"""
    error: bool = Field(default=True, description="Always true for error responses")
    error_code: str = Field(description="Unique error code for categorization")
    message: str = Field(description="Human-readable error message")
    details: Optional[str] = Field(default=None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = Field(default=None, description="Request tracking ID")
    suggestion: Optional[str] = Field(default=None, description="Helpful suggestion for user")
    retry_after: Optional[int] = Field(default=None, description="Seconds to wait before retry")


class SecurityError(Exception):
    """Custom exception for security-related errors"""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.HIGH):
        self.message = message
        self.severity = severity
        super().__init__(message)


class SSEError(Exception):
    """Custom exception for SSE-related errors"""
    def __init__(self, message: str, session_id: Optional[str] = None, 
                 reconnectable: bool = True):
        self.message = message
        self.session_id = session_id
        self.reconnectable = reconnectable
        super().__init__(message)


class ErrorHandler:
    """Centralized error handling with security awareness"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or logging.getLogger(__name__)
        self.is_production = os.getenv("NODE_ENV") == "production"
        self.enable_debug = os.getenv("DEBUG_ERRORS", "false").lower() == "true"
        
    def sanitize_error_message(self, error: Exception, user_message: Optional[str] = None) -> str:
        """Sanitize error messages to prevent information leakage"""
        if self.is_production:
            # In production, never expose internal error details
            if user_message:
                return user_message
            
            if isinstance(error, (ValueError, TypeError)):
                return "Invalid input provided"
            elif isinstance(error, ConnectionError):
                return "Service temporarily unavailable"
            elif isinstance(error, TimeoutError):
                return "Request timed out"
            else:
                return "An internal error occurred"
        else:
            # In development, provide more detailed messages
            return user_message or str(error)
    
    def log_error(self, 
                  error: Exception,
                  context: Dict[str, Any],
                  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                  category: ErrorCategory = ErrorCategory.INTERNAL) -> str:
        """Log error with structured context and return tracking ID"""
        
        error_id = str(uuid.uuid4())
        
        # Build comprehensive error context
        error_context = {
            "error_id": error_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "severity": severity.value,
            "category": category.value,
            "timestamp": datetime.utcnow().isoformat(),
            **context
        }
        
        # Add stack trace for non-production environments
        if not self.is_production or self.enable_debug:
            error_context["stack_trace"] = traceback.format_exc()
        
        # Add process info if available
        try:
            import psutil
            process = psutil.Process()
            error_context["process_info"] = {
                "memory_percent": process.memory_percent(),
                "cpu_percent": process.cpu_percent(),
                "pid": process.pid
            }
        except ImportError:
            pass
        
        # Use structured logging if available
        if hasattr(self.logger, 'log_struct'):
            self.logger.log_struct(error_context, severity=severity.value.upper())
        else:
            log_level = {
                ErrorSeverity.LOW: logging.INFO,
                ErrorSeverity.MEDIUM: logging.WARNING, 
                ErrorSeverity.HIGH: logging.ERROR,
                ErrorSeverity.CRITICAL: logging.CRITICAL
            }[severity]
            
            self.logger.log(log_level, f"Error {error_id}: {error_context}")
        
        return error_id
    
    def create_error_response(self,
                            error: Exception,
                            status_code: int,
                            error_code: str,
                            user_message: Optional[str] = None,
                            suggestion: Optional[str] = None,
                            context: Optional[Dict[str, Any]] = None,
                            severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                            category: ErrorCategory = ErrorCategory.INTERNAL) -> JSONResponse:
        """Create standardized error response"""
        
        # Log the error and get tracking ID
        error_id = self.log_error(
            error=error,
            context=context or {},
            severity=severity,
            category=category
        )
        
        # Create sanitized error response
        response = ErrorResponse(
            error_code=error_code,
            message=self.sanitize_error_message(error, user_message),
            details=str(error) if not self.is_production else None,
            request_id=error_id,
            suggestion=suggestion
        )
        
        return JSONResponse(
            content=response.model_dump(),
            status_code=status_code
        )


# Global error handler instance
error_handler = ErrorHandler()


class SSEErrorBoundary:
    """Error boundary for SSE connections with automatic recovery"""
    
    def __init__(self, session_id: str, logger: Optional[logging.Logger] = None):
        self.session_id = session_id
        self.logger = logger or logging.getLogger(__name__)
        self.error_count = 0
        self.last_error_time: Optional[datetime] = None
        self.max_errors = 5
        self.error_window = 300  # 5 minutes
        
    @asynccontextmanager
    async def handle_stream_errors(self):
        """Context manager for SSE stream error handling"""
        try:
            yield
        except asyncio.CancelledError:
            self.logger.info(f"SSE stream cancelled for session {self.session_id}")
            raise
        except ConnectionError as e:
            self._handle_connection_error(e)
            raise SSEError(f"Connection lost: {e}", self.session_id, reconnectable=True)
        except Exception as e:
            self._handle_unexpected_error(e)
            raise SSEError(f"Stream error: {e}", self.session_id, reconnectable=False)
    
    def _handle_connection_error(self, error: Exception):
        """Handle connection-specific errors"""
        error_handler.log_error(
            error=error,
            context={
                "session_id": self.session_id,
                "error_type": "sse_connection",
                "recoverable": True
            },
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.SSE_CONNECTION
        )
    
    def _handle_unexpected_error(self, error: Exception):
        """Handle unexpected errors with circuit breaker logic"""
        now = datetime.utcnow()
        
        # Reset error count if outside window
        if (self.last_error_time and 
            (now - self.last_error_time).total_seconds() > self.error_window):
            self.error_count = 0
            
        self.error_count += 1
        self.last_error_time = now
        
        severity = ErrorSeverity.CRITICAL if self.error_count >= self.max_errors else ErrorSeverity.HIGH
        
        error_handler.log_error(
            error=error,
            context={
                "session_id": self.session_id,
                "error_count": self.error_count,
                "circuit_breaker_active": self.error_count >= self.max_errors
            },
            severity=severity,
            category=ErrorCategory.SSE_CONNECTION
        )


def create_validation_error_response(field_errors: List[Dict[str, Any]]) -> JSONResponse:
    """Create standardized validation error response"""
    return error_handler.create_error_response(
        error=ValueError("Validation failed"),
        status_code=422,
        error_code="VALIDATION_ERROR",
        user_message="Invalid input data provided",
        context={"field_errors": field_errors},
        severity=ErrorSeverity.LOW,
        category=ErrorCategory.VALIDATION
    )


def create_auth_error_response(message: str = "Authentication required") -> JSONResponse:
    """Create standardized authentication error response"""
    return error_handler.create_error_response(
        error=SecurityError(message),
        status_code=401,
        error_code="AUTH_ERROR",
        user_message=message,
        suggestion="Please check your authentication credentials",
        severity=ErrorSeverity.MEDIUM,
        category=ErrorCategory.AUTHENTICATION
    )


def create_permission_error_response(resource: str = "resource") -> JSONResponse:
    """Create standardized authorization error response"""
    return error_handler.create_error_response(
        error=SecurityError(f"Access denied to {resource}"),
        status_code=403,
        error_code="PERMISSION_ERROR", 
        user_message=f"You don't have permission to access this {resource}",
        severity=ErrorSeverity.MEDIUM,
        category=ErrorCategory.AUTHORIZATION
    )


def create_rate_limit_error_response(retry_after: int = 60) -> JSONResponse:
    """Create standardized rate limit error response"""
    response = error_handler.create_error_response(
        error=Exception("Rate limit exceeded"),
        status_code=429,
        error_code="RATE_LIMIT_ERROR",
        user_message="Too many requests. Please try again later.",
        suggestion=f"Wait {retry_after} seconds before trying again",
        severity=ErrorSeverity.LOW,
        category=ErrorCategory.RATE_LIMIT
    )
    
    # Add rate limit specific field
    response_data = response.body.decode()
    import json
    data = json.loads(response_data)
    data["retry_after"] = retry_after
    
    return JSONResponse(content=data, status_code=429)


async def handle_sse_stream_error(error: Exception, session_id: str) -> str:
    """Handle SSE stream errors and return appropriate SSE event"""
    if isinstance(error, SSEError):
        error_data = {
            "type": "error",
            "message": error.message,
            "session_id": session_id,
            "reconnectable": error.reconnectable,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        error_data = {
            "type": "error", 
            "message": "Stream connection error",
            "session_id": session_id,
            "reconnectable": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    import json
    return f"data: {json.dumps(error_data)}\n\n"


class LoggingEnhancer:
    """Enhanced logging with context and correlation"""
    
    def __init__(self, logger: logging.Logger, service_name: str = "vana"):
        self.logger = logger
        self.service_name = service_name
        
    def log_with_context(self,
                        level: int,
                        message: str,
                        context: Dict[str, Any],
                        correlation_id: Optional[str] = None):
        """Log message with additional context"""
        
        enhanced_context = {
            "service": self.service_name,
            "timestamp": datetime.utcnow().isoformat(),
            "correlation_id": correlation_id or str(uuid.uuid4()),
            **context
        }
        
        if hasattr(self.logger, 'log_struct'):
            self.logger.log_struct({
                "message": message,
                **enhanced_context
            }, severity=logging.getLevelName(level))
        else:
            self.logger.log(level, f"{message} | Context: {enhanced_context}")
    
    def log_request_start(self, request: Request, correlation_id: str):
        """Log incoming request"""
        context = {
            "method": request.method,
            "url": str(request.url),
            "user_agent": request.headers.get("user-agent"),
            "ip": request.client.host if request.client else "unknown"
        }
        
        self.log_with_context(
            logging.INFO,
            "Request started",
            context,
            correlation_id
        )
    
    def log_request_end(self, response: Response, correlation_id: str, duration_ms: float):
        """Log request completion"""
        context = {
            "status_code": response.status_code,
            "duration_ms": duration_ms
        }
        
        level = logging.ERROR if response.status_code >= 500 else logging.INFO
        self.log_with_context(
            level,
            "Request completed",
            context,
            correlation_id
        )


# Enhanced logger instance
enhanced_logger = LoggingEnhancer(logging.getLogger(__name__))