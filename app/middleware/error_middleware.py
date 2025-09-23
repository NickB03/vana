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
Global Error Handling Middleware

This middleware provides comprehensive error handling across all endpoints,
with consistent error responses, security-aware logging, and request tracking.
"""

import asyncio
import time
import uuid
from typing import Callable

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.utils.error_handling import (
    ErrorCategory,
    ErrorSeverity,
    SecurityError,
    SSEError,
    create_auth_error_response,
    create_permission_error_response,
    create_rate_limit_error_response,
    create_validation_error_response,
    enhanced_logger,
    error_handler,
)


class GlobalErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Global error handling middleware for consistent error responses.
    
    Features:
    - Catches all unhandled exceptions
    - Provides consistent error response format
    - Implements security-aware error sanitization
    - Tracks request correlation IDs
    - Logs errors with proper context
    - Handles different error types appropriately
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.error_handler = error_handler
        self.logger = enhanced_logger
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with comprehensive error handling"""
        
        # Generate correlation ID for request tracking
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        # Log request start
        start_time = time.time()
        self.logger.log_request_start(request, correlation_id)
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Log successful completion
            duration_ms = (time.time() - start_time) * 1000
            self.logger.log_request_end(response, correlation_id, duration_ms)
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            
            return response
            
        except HTTPException as e:
            # Handle FastAPI HTTP exceptions
            return await self._handle_http_exception(e, request, correlation_id)
            
        except SecurityError as e:
            # Handle security-related errors
            return await self._handle_security_error(e, request, correlation_id)
            
        except SSEError as e:
            # Handle SSE-specific errors
            return await self._handle_sse_error(e, request, correlation_id)
            
        except asyncio.CancelledError:
            # Handle cancelled operations (client disconnect, etc.)
            return await self._handle_cancelled_error(request, correlation_id)
            
        except ConnectionError as e:
            # Handle connection errors
            return await self._handle_connection_error(e, request, correlation_id)
            
        except TimeoutError as e:
            # Handle timeout errors
            return await self._handle_timeout_error(e, request, correlation_id)
            
        except ValueError as e:
            # Handle validation errors
            return await self._handle_validation_error(e, request, correlation_id)
            
        except PermissionError as e:
            # Handle permission errors
            return await self._handle_permission_error(e, request, correlation_id)
            
        except Exception as e:
            # Handle any other unexpected errors
            return await self._handle_unexpected_error(e, request, correlation_id)
    
    async def _handle_http_exception(self, 
                                   error: HTTPException, 
                                   request: Request, 
                                   correlation_id: str) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        
        context = self._build_request_context(request, correlation_id)
        
        # Map HTTP status codes to error categories
        category_map = {
            400: ErrorCategory.VALIDATION,
            401: ErrorCategory.AUTHENTICATION,
            403: ErrorCategory.AUTHORIZATION,
            404: ErrorCategory.VALIDATION,
            405: ErrorCategory.VALIDATION,
            409: ErrorCategory.VALIDATION,
            422: ErrorCategory.VALIDATION,
            429: ErrorCategory.RATE_LIMIT,
            500: ErrorCategory.INTERNAL,
            502: ErrorCategory.NETWORK,
            503: ErrorCategory.NETWORK,
            504: ErrorCategory.NETWORK,
        }
        
        category = category_map.get(error.status_code, ErrorCategory.INTERNAL)
        severity = ErrorSeverity.HIGH if error.status_code >= 500 else ErrorSeverity.MEDIUM
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=error.status_code,
            error_code=f"HTTP_{error.status_code}",
            user_message=error.detail,
            context=context,
            severity=severity,
            category=category
        )
    
    async def _handle_security_error(self, 
                                   error: SecurityError, 
                                   request: Request, 
                                   correlation_id: str) -> JSONResponse:
        """Handle security-related errors"""
        
        context = self._build_request_context(request, correlation_id)
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=403,
            error_code="SECURITY_ERROR",
            user_message="Access denied for security reasons",
            suggestion="Please check your permissions and try again",
            context=context,
            severity=error.severity,
            category=ErrorCategory.AUTHORIZATION
        )
    
    async def _handle_sse_error(self, 
                              error: SSEError, 
                              request: Request, 
                              correlation_id: str) -> JSONResponse:
        """Handle SSE-specific errors"""
        
        context = self._build_request_context(request, correlation_id)
        context["session_id"] = error.session_id
        context["reconnectable"] = error.reconnectable
        
        suggestion = "Try reconnecting to the stream" if error.reconnectable else "Please refresh the page"
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=502,
            error_code="SSE_ERROR",
            user_message="Connection error occurred",
            suggestion=suggestion,
            context=context,
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.SSE_CONNECTION
        )
    
    async def _handle_cancelled_error(self, 
                                    request: Request, 
                                    correlation_id: str) -> JSONResponse:
        """Handle cancelled operations"""
        
        context = self._build_request_context(request, correlation_id)
        
        return self.error_handler.create_error_response(
            error=asyncio.CancelledError("Operation was cancelled"),
            status_code=499,  # Client Closed Request
            error_code="OPERATION_CANCELLED",
            user_message="Request was cancelled",
            context=context,
            severity=ErrorSeverity.LOW,
            category=ErrorCategory.NETWORK
        )
    
    async def _handle_connection_error(self, 
                                     error: ConnectionError, 
                                     request: Request, 
                                     correlation_id: str) -> JSONResponse:
        """Handle connection errors"""
        
        context = self._build_request_context(request, correlation_id)
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=502,
            error_code="CONNECTION_ERROR",
            user_message="Service temporarily unavailable",
            suggestion="Please try again in a few moments",
            context=context,
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.NETWORK
        )
    
    async def _handle_timeout_error(self, 
                                  error: TimeoutError, 
                                  request: Request, 
                                  correlation_id: str) -> JSONResponse:
        """Handle timeout errors"""
        
        context = self._build_request_context(request, correlation_id)
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=504,
            error_code="TIMEOUT_ERROR",
            user_message="Request timed out",
            suggestion="Please try again with a simpler request",
            context=context,
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.NETWORK
        )
    
    async def _handle_validation_error(self, 
                                     error: ValueError, 
                                     request: Request, 
                                     correlation_id: str) -> JSONResponse:
        """Handle validation errors"""
        
        context = self._build_request_context(request, correlation_id)
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=400,
            error_code="VALIDATION_ERROR",
            user_message="Invalid input provided",
            suggestion="Please check your input and try again",
            context=context,
            severity=ErrorSeverity.LOW,
            category=ErrorCategory.VALIDATION
        )
    
    async def _handle_permission_error(self, 
                                     error: PermissionError, 
                                     request: Request, 
                                     correlation_id: str) -> JSONResponse:
        """Handle permission errors"""
        
        context = self._build_request_context(request, correlation_id)
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=403,
            error_code="PERMISSION_ERROR",
            user_message="Permission denied",
            suggestion="Please check your access permissions",
            context=context,
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.AUTHORIZATION
        )
    
    async def _handle_unexpected_error(self, 
                                     error: Exception, 
                                     request: Request, 
                                     correlation_id: str) -> JSONResponse:
        """Handle unexpected errors"""
        
        context = self._build_request_context(request, correlation_id)
        
        return self.error_handler.create_error_response(
            error=error,
            status_code=500,
            error_code="INTERNAL_ERROR",
            user_message="An unexpected error occurred",
            suggestion="Please try again later or contact support",
            context=context,
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.INTERNAL
        )
    
    def _build_request_context(self, request: Request, correlation_id: str) -> dict:
        """Build request context for error logging"""
        
        return {
            "correlation_id": correlation_id,
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "user_agent": request.headers.get("user-agent"),
            "ip_address": request.client.host if request.client else "unknown",
            "content_type": request.headers.get("content-type"),
            "content_length": request.headers.get("content-length"),
        }


# Custom exception handlers for specific error types
async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle Pydantic validation errors"""
    
    if hasattr(exc, 'errors'):
        field_errors = []
        for error in exc.errors():
            field_errors.append({
                "field": ".".join(str(loc) for loc in error['loc']),
                "message": error['msg'],
                "type": error['type']
            })
        return create_validation_error_response(field_errors)
    
    return create_validation_error_response([{
        "field": "unknown",
        "message": str(exc),
        "type": "validation_error"
    }])


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTPException with standardized format"""
    
    # Special handling for common HTTP errors
    if exc.status_code == 401:
        return create_auth_error_response(exc.detail)
    elif exc.status_code == 403:
        return create_permission_error_response()
    elif exc.status_code == 429:
        retry_after = getattr(exc, 'retry_after', 60)
        return create_rate_limit_error_response(retry_after)
    
    # Generic HTTP error handling
    context = {
        "status_code": exc.status_code,
        "detail": exc.detail,
        "headers": exc.headers
    }
    
    return error_handler.create_error_response(
        error=exc,
        status_code=exc.status_code,
        error_code=f"HTTP_{exc.status_code}",
        user_message=exc.detail,
        context=context
    )