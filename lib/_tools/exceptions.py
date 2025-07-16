"""
Custom exceptions for VANA tools.

This module provides specific exception types for better error handling
and debugging across all tool implementations.
"""


class ToolError(Exception):
    """Base exception for all tool-related errors."""
    pass


class ValidationError(ToolError):
    """Raised when input validation fails."""
    pass


class ContentCreationError(ToolError):
    """Raised when content creation operations fail."""
    pass


class ResearchError(ToolError):
    """Raised when research operations fail."""
    pass


class FormattingError(ToolError):
    """Raised when formatting operations fail."""
    pass


class TimeoutError(ToolError):
    """Raised when operations exceed time limits."""
    pass


class RateLimitError(ToolError):
    """Raised when API rate limits are exceeded."""
    pass


class AuthenticationError(ToolError):
    """Raised when authentication fails."""
    pass