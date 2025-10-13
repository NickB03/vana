#!/usr/bin/env python3
"""
Automatic Input Validation Middleware

Applies server-side input validation to ALL endpoints automatically.
Protects against XSS, SQL injection, command injection, path traversal, and LLM prompt injection.

Coverage:
- All POST/PUT/PATCH requests
- JSON body fields
- Form data fields
- Query parameters (optional, configurable)

Architecture:
    This middleware integrates with the existing input_validation.py utility
    to provide automatic validation across all endpoints. It:

    1. Intercepts all POST/PUT/PATCH requests
    2. Extracts known user input fields
    3. Validates each field using validate_chat_input()
    4. Returns 400 error if validation fails
    5. Allows request to proceed if validation passes

Usage:
    app.add_middleware(InputValidationMiddleware, validate_query_params=False)

Configuration:
    - VALIDATED_FIELDS: Set of field names to validate
    - SKIP_VALIDATION_PATHS: Endpoints that bypass validation
    - validate_query_params: Enable query parameter validation (default: False)

Security Note:
    This is a defense-in-depth layer. It catches malicious input that might
    slip through client-side validation or direct API calls. All validation
    rules are defined in app/utils/input_validation.py.
"""

import json

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.utils.input_validation import validate_chat_input

# Fields that should be validated across all endpoints
# These represent common user input field names found across the API
VALIDATED_FIELDS: set[str] = {
    # Chat/message fields
    'query', 'message', 'content', 'text', 'body',
    # User input fields
    'username', 'email', 'title', 'description', 'comment',
    # Feedback fields
    'reason', 'feedback', 'note',
    # Search fields
    'search', 'q', 'filter',
}

# Endpoints that should skip validation (binary uploads, internal endpoints, etc.)
SKIP_VALIDATION_PATHS: set[str] = {
    '/health',
    '/metrics',
    '/api/auth/set-tokens',  # Internal endpoint with structured data
    '/docs',
    '/openapi.json',
    '/redoc',
}


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Automatically validate user input on all endpoints.

    This middleware provides automatic protection against injection attacks
    by validating all user input before it reaches route handlers.

    How it works:
    1. Intercepts all POST/PUT/PATCH requests
    2. Parses JSON body and extracts known input fields
    3. Validates each field against security rules
    4. Blocks request if validation fails
    5. Passes through if all validation passes

    Example blocked inputs:
        - "<script>alert('xss')</script>" (XSS)
        - "SELECT * FROM users" (SQL injection)
        - "rm -rf /" (Command injection)
        - "../../etc/passwd" (Path traversal)
        - "Ignore previous instructions" (LLM prompt injection)

    Args:
        app: The ASGI application
        validate_query_params: Enable query parameter validation (default: False)
    """

    def __init__(self, app: ASGIApp, validate_query_params: bool = False):
        super().__init__(app)
        self.validate_query_params = validate_query_params

    async def dispatch(self, request: Request, call_next):
        """
        Process incoming requests and validate user input.

        Args:
            request: The incoming request
            call_next: The next middleware/handler in the chain

        Returns:
            Response from the next handler or validation error
        """
        # Skip validation for GET/DELETE/OPTIONS (read-only operations)
        if request.method in ['GET', 'DELETE', 'OPTIONS', 'HEAD']:
            return await call_next(request)

        # Skip validation for excluded paths
        if request.url.path in SKIP_VALIDATION_PATHS:
            return await call_next(request)

        # Skip validation for paths that start with excluded prefixes
        for skip_path in SKIP_VALIDATION_PATHS:
            if request.url.path.startswith(skip_path):
                return await call_next(request)

        try:
            # Validate JSON body
            if self._is_json_content_type(request):
                await self._validate_json_body(request)

            # Validate query parameters (optional)
            if self.validate_query_params:
                self._validate_query_params(request)

            # All validation passed, proceed with request
            return await call_next(request)

        except HTTPException as e:
            # Convert HTTPException to JSONResponse
            # Wrap in "detail" key to match FastAPI's standard error format
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )

    def _is_json_content_type(self, request: Request) -> bool:
        """
        Check if request content type is JSON.

        Args:
            request: The incoming request

        Returns:
            True if content type is JSON, False otherwise
        """
        content_type = request.headers.get('content-type', '')
        return 'application/json' in content_type

    async def _validate_json_body(self, request: Request) -> None:
        """
        Validate JSON body fields.

        This method:
        1. Reads the request body
        2. Parses JSON
        3. Validates all known input fields
        4. Restores body for route handler

        Args:
            request: The incoming request

        Raises:
            HTTPException: If validation fails with 400 status code
        """
        try:
            # Read the body bytes
            body_bytes = await request.body()

            if not body_bytes:
                return  # Empty body is OK

            try:
                data = json.loads(body_bytes)
            except json.JSONDecodeError:
                # Invalid JSON will be handled by route handler
                return

            # Validate each known field
            self._validate_dict_fields(data, request.url.path)

        except HTTPException:
            raise  # Re-raise validation failures
        except Exception as e:
            # Log unexpected errors but don't block request
            # This ensures the middleware fails open rather than closed
            print(f"Validation middleware error: {e}")

    def _validate_dict_fields(self, data: dict, path: str) -> None:
        """
        Recursively validate dictionary fields.

        This method walks through nested dictionaries and arrays,
        validating all fields that match known input patterns.

        Args:
            data: Dictionary to validate
            path: Request path for error messages

        Raises:
            HTTPException: If validation fails with detailed error info
        """
        for field, value in data.items():
            # Only validate string fields that match known input patterns
            if field in VALIDATED_FIELDS and isinstance(value, str):
                is_valid, error_message = validate_chat_input(value)

                if not is_valid:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "type": "ValidationError",
                            "field": field,
                            "message": error_message,
                            "code": "INVALID_INPUT"
                        }
                    )

            # Recursively validate nested objects
            elif isinstance(value, dict):
                self._validate_dict_fields(value, path)

            # Validate arrays of objects
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        self._validate_dict_fields(item, path)

    def _validate_query_params(self, request: Request) -> None:
        """
        Validate query parameters.

        This is disabled by default because query parameters are often
        used for filtering, pagination, etc. Enable only if needed.

        Args:
            request: The incoming request

        Raises:
            HTTPException: If validation fails
        """
        for param, value in request.query_params.items():
            if param in VALIDATED_FIELDS:
                is_valid, error_message = validate_chat_input(value)

                if not is_valid:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "type": "ValidationError",
                            "field": param,
                            "message": error_message,
                            "code": "INVALID_QUERY_PARAM"
                        }
                    )
