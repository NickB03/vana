"""
Input Sanitization Security Module for VANA
Provides comprehensive input validation and sanitization to prevent injection attacks
"""

import ast
import html
import json
import re
import unicodedata
from functools import lru_cache
from typing import Any, Dict, List, Optional, Pattern, Set, Union
from urllib.parse import quote, unquote

from lib.logging_config import get_logger

logger = get_logger("vana.security.input_sanitizer")


class SanitizationError(Exception):
    """Raised when input fails sanitization"""

    pass


class InputSanitizer:
    """Comprehensive input sanitization for security"""

    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE)\b)",
        r"(--|#|/\*|\*/)",  # SQL comments
        r"(\bOR\b\s*\d+\s*=\s*\d+)",  # OR 1=1
        r"(\bAND\b\s*\d+\s*=\s*\d+)",  # AND 1=1
        r"(;|\||&&)",  # Command separators
        r"(xp_|sp_)",  # SQL Server stored procedures
    ]

    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        r"([;&|`$])",  # Shell metacharacters
        r"(\$\(.*\))",  # Command substitution
        r"(`.*`)",  # Backtick execution
        r"(>{1,2}|<)",  # Redirection
        r"(\|\|)",  # OR operator
        r"(&&)",  # AND operator
    ]

    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"(\.\.\/|\.\.\\)",  # Directory traversal
        r"(~\/|~\\)",  # Home directory
        r"(%2e%2e|%252e%252e)",  # Encoded traversal
        r"(\.\.%c0%af|\.\.%c1%9c)",  # Unicode encoding
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r"(<script[^>]*>.*?</script>)",  # Script tags
        r"(<iframe[^>]*>.*?</iframe>)",  # Iframe tags
        r"(javascript:|vbscript:|data:text/html)",  # Script protocols
        r"(on\w+\s*=)",  # Event handlers
        r"(<img[^>]*onerror[^>]*>)",  # Image error handlers
    ]

    def __init__(
        self,
        max_length: int = 10000,
        allow_html: bool = False,
        allow_unicode: bool = True,
        custom_patterns: Optional[List[str]] = None,
    ):
        """
        Initialize input sanitizer

        Args:
            max_length: Maximum allowed input length
            allow_html: Whether to allow HTML content
            allow_unicode: Whether to allow Unicode characters
            custom_patterns: Additional patterns to block
        """
        self.max_length = max_length
        self.allow_html = allow_html
        self.allow_unicode = allow_unicode

        # Compile all patterns
        self._sql_patterns = self._compile_patterns(self.SQL_INJECTION_PATTERNS)
        self._cmd_patterns = self._compile_patterns(self.COMMAND_INJECTION_PATTERNS)
        self._path_patterns = self._compile_patterns(self.PATH_TRAVERSAL_PATTERNS)
        self._xss_patterns = self._compile_patterns(self.XSS_PATTERNS)

        if custom_patterns:
            self._custom_patterns = self._compile_patterns(custom_patterns)
        else:
            self._custom_patterns = []

    def _compile_patterns(self, patterns: List[str]) -> List[Pattern]:
        """Compile regex patterns with case-insensitive flag"""
        return [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in patterns]

    def sanitize_string(self, input_str: str, context: str = "general", strict: bool = False) -> str:
        """
        Sanitize a string input

        Args:
            input_str: Input string to sanitize
            context: Context of use ("sql", "shell", "path", "html", "general")
            strict: Use strict sanitization

        Returns:
            Sanitized string

        Raises:
            SanitizationError: If input is dangerous
        """
        if not isinstance(input_str, str):
            raise SanitizationError(f"Expected string, got {type(input_str)}")

        # Length check
        if len(input_str) > self.max_length:
            raise SanitizationError(f"Input too long: {len(input_str)} > {self.max_length}")

        # Normalize Unicode
        if self.allow_unicode:
            input_str = unicodedata.normalize("NFKC", input_str)
        else:
            # Remove non-ASCII characters
            input_str = input_str.encode("ascii", "ignore").decode("ascii")

        # Context-specific sanitization
        if context == "sql" or strict:
            input_str = self._sanitize_sql(input_str)

        if context == "shell" or strict:
            input_str = self._sanitize_shell(input_str)

        if context == "path" or strict:
            input_str = self._sanitize_path(input_str)

        if context == "html" or (not self.allow_html and context == "general"):
            input_str = self._sanitize_html(input_str)

        # Check against all patterns in strict mode
        if strict:
            all_patterns = (
                self._sql_patterns
                + self._cmd_patterns
                + self._path_patterns
                + self._xss_patterns
                + self._custom_patterns
            )

            for pattern in all_patterns:
                if pattern.search(input_str):
                    raise SanitizationError(f"Dangerous pattern detected: {pattern.pattern}")

        return input_str

    def _sanitize_sql(self, input_str: str) -> str:
        """Sanitize for SQL context"""
        # Check for SQL injection patterns
        for pattern in self._sql_patterns:
            if pattern.search(input_str):
                logger.warning(f"SQL injection attempt detected: {input_str[:50]}...")
                raise SanitizationError("SQL injection pattern detected")

        # Escape single quotes
        input_str = input_str.replace("'", "''")

        return input_str

    def _sanitize_shell(self, input_str: str) -> str:
        """Sanitize for shell command context"""
        # Check for command injection patterns
        for pattern in self._cmd_patterns:
            if pattern.search(input_str):
                logger.warning(f"Command injection attempt detected: {input_str[:50]}...")
                raise SanitizationError("Command injection pattern detected")

        # Remove shell metacharacters
        dangerous_chars = ";|&`$<>(){}[]!#"
        for char in dangerous_chars:
            input_str = input_str.replace(char, "")

        return input_str

    def _sanitize_path(self, input_str: str) -> str:
        """Sanitize for file path context"""
        # Check for path traversal patterns
        for pattern in self._path_patterns:
            if pattern.search(input_str):
                logger.warning(f"Path traversal attempt detected: {input_str[:50]}...")
                raise SanitizationError("Path traversal pattern detected")

        # Remove dangerous path characters
        input_str = input_str.replace("..", "")
        input_str = input_str.replace("~", "")

        return input_str

    def _sanitize_html(self, input_str: str) -> str:
        """Sanitize HTML content"""
        if not self.allow_html:
            # Escape all HTML
            return html.escape(input_str)

        # Check for XSS patterns
        for pattern in self._xss_patterns:
            if pattern.search(input_str):
                logger.warning(f"XSS attempt detected: {input_str[:50]}...")
                raise SanitizationError("XSS pattern detected")

        # Basic HTML sanitization (in production, use a proper HTML sanitizer)
        # Remove script tags
        input_str = re.sub(r"<script[^>]*>.*?</script>", "", input_str, flags=re.IGNORECASE | re.DOTALL)
        # Remove event handlers
        input_str = re.sub(r'\bon\w+\s*=\s*["\']?[^"\'>\s]*', "", input_str, flags=re.IGNORECASE)

        return input_str

    def sanitize_json(self, json_str: str) -> Dict[str, Any]:
        """
        Sanitize JSON input

        Args:
            json_str: JSON string to sanitize

        Returns:
            Parsed and sanitized JSON object
        """
        try:
            # Parse JSON
            data = json.loads(json_str)

            # Recursively sanitize all string values
            return self._sanitize_json_recursive(data)

        except json.JSONDecodeError as e:
            raise SanitizationError(f"Invalid JSON: {e}")

    def _sanitize_json_recursive(self, obj: Any) -> Any:
        """Recursively sanitize JSON object"""
        if isinstance(obj, str):
            return self.sanitize_string(obj, context="general")
        elif isinstance(obj, dict):
            return {k: self._sanitize_json_recursive(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._sanitize_json_recursive(item) for item in obj]
        else:
            return obj

    def sanitize_code(self, code: str, language: str = "python") -> str:
        """
        Sanitize code input

        Args:
            code: Code string to sanitize
            language: Programming language

        Returns:
            Sanitized code
        """
        # Length check
        if len(code) > self.max_length:
            raise SanitizationError(f"Code too long: {len(code)} > {self.max_length}")

        if language == "python":
            # Check for dangerous Python patterns
            dangerous_patterns = [
                r"\b(exec|eval|compile|__import__)\s*\(",
                r"\b(subprocess|os\.system|os\.popen)\s*\(",
                r'\bopen\s*\([^,)]*,\s*["\']w',  # Writing files
                r"\b(pickle|marshal|shelve)\.",  # Serialization
            ]

            for pattern in dangerous_patterns:
                if re.search(pattern, code, re.IGNORECASE):
                    raise SanitizationError(f"Dangerous Python pattern detected: {pattern}")

            # Try to parse as valid Python
            try:
                ast.parse(code)
            except SyntaxError as e:
                raise SanitizationError(f"Invalid Python syntax: {e}")

        return code

    def sanitize_url(self, url: str) -> str:
        """
        Sanitize URL input

        Args:
            url: URL to sanitize

        Returns:
            Sanitized URL
        """
        # Check for dangerous protocols
        dangerous_protocols = ["javascript:", "vbscript:", "data:", "file:"]
        for protocol in dangerous_protocols:
            if url.lower().startswith(protocol):
                raise SanitizationError(f"Dangerous protocol: {protocol}")

        # URL encode special characters
        return quote(url, safe=":/?#[]@!$&'()*+,;=")

    def validate_email(self, email: str) -> str:
        """
        Validate and sanitize email address

        Args:
            email: Email address to validate

        Returns:
            Validated email
        """
        # Basic email regex
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

        if not re.match(email_pattern, email):
            raise SanitizationError(f"Invalid email format: {email}")

        return email.lower()

    def validate_integer(
        self, value: Union[str, int], min_val: Optional[int] = None, max_val: Optional[int] = None
    ) -> int:
        """
        Validate integer input

        Args:
            value: Value to validate
            min_val: Minimum allowed value
            max_val: Maximum allowed value

        Returns:
            Validated integer
        """
        try:
            int_val = int(value)

            if min_val is not None and int_val < min_val:
                raise SanitizationError(f"Value too small: {int_val} < {min_val}")

            if max_val is not None and int_val > max_val:
                raise SanitizationError(f"Value too large: {int_val} > {max_val}")

            return int_val

        except ValueError:
            raise SanitizationError(f"Invalid integer: {value}")


# Global sanitizer instances
_default_sanitizer = None
_strict_sanitizer = None


def get_default_sanitizer() -> InputSanitizer:
    """Get default input sanitizer"""
    global _default_sanitizer
    if _default_sanitizer is None:
        _default_sanitizer = InputSanitizer(max_length=10000, allow_html=False, allow_unicode=True)
    return _default_sanitizer


def get_strict_sanitizer() -> InputSanitizer:
    """Get strict input sanitizer"""
    global _strict_sanitizer
    if _strict_sanitizer is None:
        _strict_sanitizer = InputSanitizer(max_length=1000, allow_html=False, allow_unicode=False)
    return _strict_sanitizer


def sanitize_input(input_str: str, context: str = "general", strict: bool = False) -> str:
    """
    Convenience function to sanitize input

    Args:
        input_str: Input to sanitize
        context: Context of use
        strict: Use strict sanitization

    Returns:
        Sanitized input
    """
    sanitizer = get_strict_sanitizer() if strict else get_default_sanitizer()
    return sanitizer.sanitize_string(input_str, context, strict)


# Export public API
__all__ = ["SanitizationError", "InputSanitizer", "get_default_sanitizer", "get_strict_sanitizer", "sanitize_input"]
