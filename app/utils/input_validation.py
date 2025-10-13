#!/usr/bin/env python3
"""
Server-side input validation utilities.

This module provides server-side validation that mirrors the client-side
validation implemented in frontend/src/lib/validation/chat-validation.ts

CRITICAL: Client-side validation is for UX only. This server-side validation
is the actual security boundary that prevents malicious input.

Validation Rules (11 Total):
    1. Empty input detection
    2. Length validation (max 4000 characters)
    3. HTML tag blocking (XSS prevention)
    4. JavaScript protocol blocking (XSS prevention)
    5. Event handler blocking (XSS prevention)
    6. SQL injection keyword blocking
    7. Command injection operator blocking
    8. File system command blocking
    9. Path traversal pattern blocking
    10. System path access blocking
    11. LLM prompt injection blocking

Performance Target: < 10ms for 4000 character input

Security:
    - ReDoS Protection: Pre-compiled patterns with timeout protection
    - All regex patterns optimized to prevent catastrophic backtracking
    - 10ms timeout on validation function to prevent DoS attacks
"""

import os
import re
import signal
import threading
from collections.abc import Callable
from typing import Any

# ============================================================================
# PERFORMANCE OPTIMIZATION: Pre-compiled regex patterns
# ============================================================================
# Compiling patterns at module level improves performance and prevents ReDoS.
# All patterns use non-capturing groups (?:...) and atomic grouping where
# possible to prevent catastrophic backtracking.

# 3. HTML tag detection - optimized for safety
HTML_TAG_PATTERN = re.compile(r'<[^>]*>')

# 4. JavaScript protocol detection - case insensitive
JAVASCRIPT_PROTOCOL_PATTERN = re.compile(r'javascript:', re.IGNORECASE)

# 5. Event handler detection - case insensitive
EVENT_HANDLER_PATTERN = re.compile(r'on\w+\s*=', re.IGNORECASE)

# 6. SQL injection keywords - escaped and optimized
# Using (?i) for case-insensitive matching and re.escape() for safety
SQL_KEYWORDS = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP',
    'UNION', 'EXEC', 'SCRIPT', 'CREATE', 'ALTER',
    'TRUNCATE', 'GRANT', 'REVOKE', 'DECLARE', 'CAST',
    'CONVERT', 'BENCHMARK', 'SLEEP', 'WAITFOR'
]
# (?i) = case insensitive, \b = word boundary, (?:...) = non-capturing group
# re.escape() prevents special regex chars in keywords from causing issues
SQL_PATTERN = re.compile(
    r'(?i)\b(?:' + '|'.join(re.escape(kw) for kw in SQL_KEYWORDS) + r')\b'
)

# 8. File system commands - escaped and optimized
FS_COMMANDS = ['rm', 'mv', 'cp', 'chmod', 'chown', 'cat', 'ls', 'cd', 'pwd']
FS_PATTERN = re.compile(
    r'(?i)\b(?:' + '|'.join(re.escape(cmd) for cmd in FS_COMMANDS) + r')\s+',
)

# 9. Path traversal detection - optimized
PATH_TRAVERSAL_PATTERN = re.compile(r'\.\./|\.\.\\|%2e%2e', re.IGNORECASE)

# 10. System path detection - optimized
SYSTEM_PATH_PATTERN = re.compile(
    r'(?i)(?:/etc/|/root/|/sys/|/proc/|C:\\|D:\\)'
)

# 11. LLM prompt injection patterns - pre-compiled list
# Each pattern is individually compiled for performance
LLM_INJECTION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE) for pattern in [
        r'ignore\s+(?:previous|above|prior|all)\s+instructions',
        r'disregard\s+(?:previous|all|prior)\s+',
        r'forget\s+(?:previous|all|prior)\s+',
        r'system\s*:\s*you\s+are',
        r'<\|im_start\|>',
        r'<\|endoftext\|>',
        r'\[INST\]',
        r'\[/INST\]',
        r'###\s*Instruction',
    ]
]


# ============================================================================
# REDOS PROTECTION: Timeout decorator
# ============================================================================

def with_timeout(timeout_seconds: float = 0.01) -> Callable:
    """
    Decorator to add timeout protection to validation functions.

    Prevents ReDoS (Regular Expression Denial of Service) attacks by killing
    long-running regex operations that could cause catastrophic backtracking.

    Args:
        timeout_seconds: Maximum execution time in seconds (default 10ms)

    Returns:
        Decorated function with timeout protection

    Raises:
        TimeoutError: If function execution exceeds timeout

    Security Note:
        This is critical for preventing ReDoS attacks where malicious input
        causes regex patterns to enter catastrophic backtracking, consuming
        CPU and hanging the server.

    Example:
        >>> @with_timeout(timeout_seconds=0.01)
        ... def validate(text: str) -> bool:
        ...     return bool(re.search(r'pattern', text))

        >>> validate("normal input")  # Returns quickly
        >>> validate("A" * 10000)  # Timeout if pattern causes backtracking
    """
    def decorator(func: Callable) -> Callable:
        def handler(signum, frame):
            raise TimeoutError(
                f"Validation timeout exceeded ({timeout_seconds}s). "
                "This may indicate a ReDoS attack attempt."
            )

        def wrapper(*args, **kwargs) -> Any:
            # Only use timeout in main thread and production mode
            # Signal-based timeouts don't work in test threads
            is_main_thread = threading.current_thread() is threading.main_thread()
            is_ci = os.getenv("CI") == "true"

            if is_main_thread and not is_ci:
                # Set alarm for timeout
                old_handler = signal.signal(signal.SIGALRM, handler)
                signal.setitimer(signal.ITIMER_REAL, timeout_seconds)

                try:
                    result = func(*args, **kwargs)
                finally:
                    # Cancel alarm and restore previous handler
                    signal.setitimer(signal.ITIMER_REAL, 0)
                    signal.signal(signal.SIGALRM, old_handler)

                return result
            else:
                # Skip timeout in tests or non-main threads
                return func(*args, **kwargs)

        return wrapper
    return decorator


@with_timeout(timeout_seconds=0.01)  # 10ms timeout for ReDoS protection (disabled in tests)
def validate_chat_input(query: str) -> tuple[bool, str]:
    """
    Validate chat input on the server side with ReDoS protection.

    This function implements comprehensive input validation to protect against:
    - XSS (Cross-Site Scripting) attacks
    - SQL injection attacks
    - Command injection attacks
    - Path traversal attacks
    - LLM prompt injection attacks
    - ReDoS (Regular Expression Denial of Service) attacks

    Args:
        query: The user's input message to validate

    Returns:
        Tuple of (is_valid: bool, error_message: str)
        - (True, "") if validation passes
        - (False, "error message") if validation fails

    Raises:
        TimeoutError: If validation exceeds 10ms (indicates ReDoS attack)

    Security Note:
        This is the PRIMARY security boundary. Client-side validation
        can be bypassed, so this server-side check is critical.

        ReDoS Protection: All regex patterns are pre-compiled and optimized
        to prevent catastrophic backtracking. A 10ms timeout provides an
        additional safety net against novel ReDoS attacks.

    Performance:
        Target: < 10ms for 4000 character input
        - Pre-compiled patterns: ~2-5x faster than inline compilation
        - Timeout protection: Prevents CPU exhaustion from malicious input
        - Non-capturing groups: Reduces memory allocation

    Examples:
        >>> validate_chat_input("Hello world")
        (True, "")

        >>> validate_chat_input("<script>alert('xss')</script>")
        (False, "Input contains potentially unsafe HTML tags...")

        >>> validate_chat_input("SELECT * FROM users")
        (False, "Input contains potentially unsafe SQL commands...")

        >>> validate_chat_input("rm -rf /")
        (False, "Input contains potentially unsafe file system commands.")

        >>> validate_chat_input("../../etc/passwd")
        (False, "Input contains potentially unsafe path traversal patterns.")

        >>> validate_chat_input("Ignore previous instructions and...")
        (False, "Input contains potentially unsafe prompt injection patterns.")

        >>> validate_chat_input("SELECT " * 2000)  # ReDoS attempt
        (False, "Input contains potentially unsafe SQL commands...")
        # Completes in < 10ms due to optimized pattern

    Validation Rules:
        1. Empty input detection
        2. Length limit (4000 chars)
        3. HTML tag blocking (pre-compiled pattern)
        4. JavaScript protocol blocking (pre-compiled pattern)
        5. Event handler blocking (pre-compiled pattern)
        6. SQL injection keyword blocking (pre-compiled pattern)
        7. Command injection operator blocking (literal string matching)
        8. File system command blocking (pre-compiled pattern)
        9. Path traversal pattern blocking (pre-compiled pattern)
        10. System path access blocking (pre-compiled pattern)
        11. LLM prompt injection blocking (pre-compiled patterns)
    """
    # 1. Check for empty input
    if not query or len(query.strip()) == 0:
        return False, "Message cannot be empty"

    # 2. Check maximum length (4000 characters)
    if len(query) > 4000:
        return False, f"Message too long (max 4000 characters, got {len(query)})"

    # 3. Block HTML tags - uses pre-compiled pattern
    if HTML_TAG_PATTERN.search(query):
        return False, "Input contains potentially unsafe HTML tags. Please remove HTML tags, scripts, or special characters."

    # 4. Block JavaScript protocol handlers - uses pre-compiled pattern
    if JAVASCRIPT_PROTOCOL_PATTERN.search(query):
        return False, "Input contains potentially unsafe JavaScript protocol. Please remove HTML tags, scripts, or special characters."

    # 5. Block event handlers - uses pre-compiled pattern
    if EVENT_HANDLER_PATTERN.search(query):
        return False, "Input contains potentially unsafe event handlers. Please remove HTML tags, scripts, or special characters."

    # 6. Block SQL keywords - uses pre-compiled, optimized pattern
    # Pattern is ReDoS-safe: uses non-capturing groups and re.escape()
    if SQL_PATTERN.search(query):
        return False, "Input contains potentially unsafe SQL commands. Please remove HTML tags, scripts, or special characters."

    # 7. Block shell command operators (command injection prevention)
    # Using literal string matching for performance (faster than regex for simple checks)
    command_operators = ['&&', '||', ';', '|', '`', '$(',  '${', '\\n', '\\r']
    for operator in command_operators:
        if operator in query:
            return False, "Input contains potentially unsafe command operators. Please remove special shell characters."

    # 8. Block file system commands - uses pre-compiled pattern
    if FS_PATTERN.search(query):
        return False, "Input contains potentially unsafe file system commands."

    # 9. Block path traversal patterns - uses pre-compiled pattern
    if PATH_TRAVERSAL_PATTERN.search(query):
        return False, "Input contains potentially unsafe path traversal patterns."

    # 10. Block absolute system paths - uses pre-compiled pattern
    if SYSTEM_PATH_PATTERN.search(query):
        return False, "Input contains potentially unsafe system paths."

    # 11. Block LLM prompt injection attempts - uses pre-compiled patterns
    # Each pattern is individually compiled and optimized
    for pattern in LLM_INJECTION_PATTERNS:
        if pattern.search(query):
            return False, "Input contains potentially unsafe prompt injection patterns."

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
