"""Comprehensive input validation utilities for secure endpoint handling.

This module provides a collection of validation functions designed to prevent
common security vulnerabilities including injection attacks, XSS, and data
validation bypasses. All functions are designed with security-first principles
and provide clear error messages for debugging while maintaining strong
input sanitization.

Key Security Features:
    - Session ID validation with format restrictions
    - XSS prevention through input sanitization
    - SQL injection prevention via input validation
    - Limit parameter validation for pagination security
    - JSON payload structure validation
    - Comprehensive error reporting with HTTP status codes

Usage:
    >>> from app.utils.validation import validate_session_id, sanitize_user_input
    >>> 
    >>> # Validate session ID for security
    >>> safe_session = validate_session_id(user_session_id)
    >>> 
    >>> # Sanitize user input to prevent XSS
    >>> clean_input = sanitize_user_input(user_message, max_length=500)

All validation functions raise HTTPException with appropriate status codes
when validation fails, making them suitable for direct use in FastAPI endpoints.
"""

import re
from typing import Any

from fastapi import HTTPException


def validate_session_id(session_id: str) -> str:
    """Validate and sanitize session ID to prevent injection attacks.

    Ensures session ID conforms to safe format restrictions to prevent
    path traversal, SQL injection, and other injection attack vectors.
    Only allows alphanumeric characters, hyphens, and underscores with
    reasonable length limits.

    Args:
        session_id: The session ID string to validate

    Returns:
        The validated session ID (unchanged if valid)

    Raises:
        HTTPException: With status 400 if session ID is invalid, including:
            - Empty or None session ID
            - Session ID exceeding 128 characters
            - Session ID containing unsafe characters

    Security Considerations:
        - Prevents path traversal attacks (../, ..\\)
        - Blocks special characters that could be used in injection
        - Enforces reasonable length limits to prevent buffer overflow
        - Uses whitelist approach (only safe characters allowed)

    Example:
        >>> # Valid session IDs
        >>> validate_session_id("user_123")  # Returns "user_123"
        >>> validate_session_id("session-abc-def")  # Returns "session-abc-def"
        >>> 
        >>> # Invalid session IDs (raise HTTPException)
        >>> validate_session_id("../etc/passwd")  # Raises 400 error
        >>> validate_session_id("'; DROP TABLE users; --")  # Raises 400 error
    """
    # Session ID should only contain alphanumeric characters, hyphens, and underscores
    # Maximum length of 128 characters
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    if len(session_id) > 128:
        raise HTTPException(status_code=400, detail="Session ID too long")

    # Only allow safe characters to prevent injection
    if not re.match(r"^[a-zA-Z0-9_\-]+$", session_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid session ID format. Only alphanumeric characters, hyphens, and underscores allowed",
        )

    return session_id


def sanitize_user_input(input_str: str, max_length: int = 1000) -> str:
    """Sanitize user input to prevent XSS and injection attacks.

    Performs comprehensive sanitization of user-provided input to prevent
    Cross-Site Scripting (XSS) attacks and other injection vulnerabilities.
    Removes HTML tags and escapes special characters that could be interpreted
    as code by browsers or other systems.

    Args:
        input_str: The user input string to sanitize
        max_length: Maximum allowed length for the input (default: 1000)

    Returns:
        Sanitized string with HTML tags removed and special characters escaped

    Security Measures Applied:
        - Length truncation to prevent buffer overflow
        - HTML/XML tag removal to prevent XSS
        - Special character escaping (&, <, >, ", ', /)
        - Safe handling of empty/None input

    Example:
        >>> # Basic sanitization
        >>> sanitize_user_input("Hello World")  # Returns "Hello World"
        >>> 
        >>> # XSS prevention
        >>> malicious = "<script>alert('xss')</script>Hello"
        >>> sanitize_user_input(malicious)  # Returns "Hello"
        >>> 
        >>> # Special character escaping
        >>> sanitize_user_input('Say "Hello"')  # Returns "Say &quot;Hello&quot;"
        >>> 
        >>> # Length limiting
        >>> long_text = "A" * 2000
        >>> result = sanitize_user_input(long_text, max_length=100)
        >>> len(result) <= 100  # True

    Note:
        This function is designed for general text sanitization. For specific
        use cases like HTML content that should preserve some formatting,
        consider using specialized sanitization libraries.
    """
    if not input_str:
        return ""

    # Truncate to max length
    input_str = input_str[:max_length]

    # Remove any HTML/script tags
    input_str = re.sub(r"<[^>]+>", "", input_str)

    # Escape special characters
    replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;",
    }

    for char, replacement in replacements.items():
        input_str = input_str.replace(char, replacement)

    return input_str


def validate_limit_parameter(limit: int, max_limit: int = 100) -> int:
    """Validate pagination limit parameter to prevent resource exhaustion.

    Ensures pagination limit values are within safe bounds to prevent
    denial-of-service attacks through excessive resource consumption.
    Validates both minimum and maximum bounds with clear error messaging.

    Args:
        limit: The requested pagination limit from user input
        max_limit: Maximum allowed limit value (default: 100)

    Returns:
        The validated limit value (unchanged if valid)

    Raises:
        HTTPException: With status 400 if limit is invalid:
            - Limit less than 1 (minimum requirement)
            - Limit exceeds max_limit (resource protection)

    Security Considerations:
        - Prevents resource exhaustion attacks via large limit values
        - Ensures minimum viable pagination (limit >= 1)
        - Provides clear error messages for debugging
        - Configurable maximum limits for different use cases

    Example:
        >>> # Valid limits
        >>> validate_limit_parameter(10)  # Returns 10
        >>> validate_limit_parameter(50, max_limit=200)  # Returns 50
        >>> 
        >>> # Invalid limits (raise HTTPException)
        >>> validate_limit_parameter(0)  # Raises 400: "Limit must be at least 1"
        >>> validate_limit_parameter(500)  # Raises 400: "Limit cannot exceed 100"
        >>> 
        >>> # Custom max limit
        >>> validate_limit_parameter(150, max_limit=200)  # Returns 150
        >>> validate_limit_parameter(250, max_limit=200)  # Raises 400 error

    Typical Usage in FastAPI:
        >>> @app.get("/items")
        >>> async def get_items(limit: int = 10):
        ...     validated_limit = validate_limit_parameter(limit, max_limit=50)
        ...     return get_paginated_items(limit=validated_limit)
    """
    if limit < 1:
        raise HTTPException(status_code=400, detail="Limit must be at least 1")

    if limit > max_limit:
        raise HTTPException(status_code=400, detail=f"Limit cannot exceed {max_limit}")

    return limit


def validate_json_payload(
    payload: dict[str, Any], required_fields: list[str] | None = None
) -> dict[str, Any]:
    """Validate JSON payload structure and required fields.

    Performs comprehensive validation of JSON payloads to ensure they
    conform to expected structure and contain all required fields.
    Provides clear error messages for missing fields and invalid formats.

    Args:
        payload: The JSON payload dictionary to validate
        required_fields: Optional list of field names that must be present

    Returns:
        The validated payload dictionary (unchanged if valid)

    Raises:
        HTTPException: With status 400 if payload is invalid:
            - Non-dictionary payload structure
            - Missing required fields

    Security Considerations:
        - Prevents processing of malformed JSON structures
        - Ensures required data is present before processing
        - Provides clear error messages without exposing internal details
        - Type safety through dictionary structure validation

    Example:
        >>> # Valid payload
        >>> payload = {"name": "John", "email": "john@example.com"}
        >>> required = ["name", "email"]
        >>> result = validate_json_payload(payload, required)  # Returns payload
        >>> 
        >>> # Invalid structure (raises HTTPException)
        >>> validate_json_payload("not a dict")  # 400: "Invalid JSON payload"
        >>> 
        >>> # Missing required fields (raises HTTPException)
        >>> incomplete = {"name": "John"}
        >>> validate_json_payload(incomplete, ["name", "email"])
        >>> # Raises 400: "Missing required fields: email"

    Typical Usage in FastAPI:
        >>> @app.post("/users")
        >>> async def create_user(payload: dict):
        ...     validated = validate_json_payload(
        ...         payload, 
        ...         required_fields=["name", "email", "password"]
        ...     )
        ...     return create_user_account(validated)
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if required_fields:
        missing_fields = [field for field in required_fields if field not in payload]
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}",
            )

    return payload
