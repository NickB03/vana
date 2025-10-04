#!/usr/bin/env python3
"""
Server-side input validation utilities.

This module provides server-side validation that mirrors the client-side
validation implemented in frontend/src/lib/validation/chat-validation.ts

CRITICAL: Client-side validation is for UX only. This server-side validation
is the actual security boundary that prevents malicious input.
"""

import re
from typing import Tuple


def validate_chat_input(query: str) -> Tuple[bool, str]:
    """
    Validate chat input on the server side.

    This function mirrors the client-side validation patterns to ensure
    defense-in-depth security. All validation patterns are duplicated
    from the frontend Zod schema.

    Args:
        query: The user's input message to validate

    Returns:
        Tuple of (is_valid: bool, error_message: str)
        - (True, "") if validation passes
        - (False, "error message") if validation fails

    Security Note:
        This is the PRIMARY security boundary. Client-side validation
        can be bypassed, so this server-side check is critical.

    Examples:
        >>> validate_chat_input("Hello world")
        (True, "")

        >>> validate_chat_input("<script>alert('xss')</script>")
        (False, "Input contains potentially unsafe HTML tags")

        >>> validate_chat_input("SELECT * FROM users")
        (False, "Input contains potentially unsafe SQL commands")
    """
    # 1. Check for empty input
    if not query or len(query.strip()) == 0:
        return False, "Message cannot be empty"

    # 2. Check maximum length (4000 characters)
    if len(query) > 4000:
        return False, f"Message too long (max 4000 characters, got {len(query)})"

    # 3. Block HTML tags - ANY tags are suspicious
    # Pattern: <anything> including self-closing tags
    if re.search(r'<[^>]*>', query):
        return False, "Input contains potentially unsafe HTML tags. Please remove HTML tags, scripts, or special characters."

    # 4. Block JavaScript protocol handlers
    # Pattern: javascript: (case-insensitive)
    if re.search(r'javascript:', query, re.IGNORECASE):
        return False, "Input contains potentially unsafe JavaScript protocol. Please remove HTML tags, scripts, or special characters."

    # 5. Block event handlers (onclick, onerror, onload, etc.)
    # Pattern: on[word]= with optional spaces
    if re.search(r'on\w+\s*=', query, re.IGNORECASE):
        return False, "Input contains potentially unsafe event handlers. Please remove HTML tags, scripts, or special characters."

    # 6. Block SQL keywords (basic SQL injection prevention)
    # Pattern: Common SQL keywords as whole words
    sql_keywords = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP',
        'UNION', 'EXEC', 'SCRIPT', 'CREATE', 'ALTER',
        'TRUNCATE', 'GRANT', 'REVOKE'
    ]
    sql_pattern = r'\b(' + '|'.join(sql_keywords) + r')\b'
    if re.search(sql_pattern, query, re.IGNORECASE):
        return False, "Input contains potentially unsafe SQL commands. Please remove HTML tags, scripts, or special characters."

    # All validations passed
    return True, ""


def sanitize_output(text: str) -> str:
    """
    Sanitize text for safe output display.

    This provides an additional layer of defense by ensuring
    that even if malicious input gets stored, it's sanitized
    on output.

    Args:
        text: Text to sanitize

    Returns:
        Sanitized text safe for display

    Note:
        React already escapes text by default when rendering,
        but this provides additional protection for API responses
        and non-React contexts.
    """
    # Replace HTML special characters
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&#x27;')
    text = text.replace('/', '&#x2F;')

    return text


def get_validation_error_response(error_message: str) -> dict:
    """
    Create a standardized validation error response.

    Args:
        error_message: The validation error message

    Returns:
        Dictionary with error details for JSON response
    """
    return {
        "success": False,
        "error": {
            "type": "ValidationError",
            "message": error_message,
            "code": "INVALID_INPUT"
        }
    }
