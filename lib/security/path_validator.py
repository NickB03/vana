"""
Path Validation Security Module for VANA
Provides secure path handling to prevent directory traversal and unauthorized access
"""

import logging
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Set, Tuple

from lib.logging_config import get_logger

logger = get_logger("vana.security.path_validator")


class PathSecurityError(Exception):
    """Raised when a path fails security validation"""

    pass


class PathValidator:
    """Secure path validation and sanitization"""

    # Dangerous path patterns
    DANGEROUS_PATTERNS = [
        r"\.\./",  # Parent directory traversal
        r"\.\.\\",  # Windows parent directory traversal
        r"^~",  # Home directory expansion
        r"^\$",  # Environment variable expansion
        r"^/",  # Absolute paths (when not allowed)
        r"^[A-Za-z]:",  # Windows absolute paths
        r"\x00",  # Null bytes
        r'[<>:"|?*]',  # Windows invalid characters
    ]

    # Sensitive directories that should never be accessed
    FORBIDDEN_PATHS = {
        "/etc",
        "/proc",
        "/sys",
        "/dev",  # Linux system
        "/boot",
        "/root",
        "/var/log",  # Linux sensitive
        "C:\\Windows",
        "C:\\System32",  # Windows system
        "C:\\Program Files",
        "C:\\ProgramData",  # Windows programs
    }

    # File extensions that might be dangerous
    DANGEROUS_EXTENSIONS = {
        ".exe",
        ".dll",
        ".so",
        ".dylib",  # Executables
        ".sh",
        ".bat",
        ".cmd",
        ".ps1",  # Scripts
        ".app",
        ".dmg",
        ".pkg",  # macOS executables
    }

    def __init__(
        self,
        allowed_base_paths: Optional[List[str]] = None,
        allow_symlinks: bool = False,
        allow_hidden_files: bool = False,
        max_path_length: int = 4096,
        allowed_extensions: Optional[Set[str]] = None,
        forbidden_extensions: Optional[Set[str]] = None,
    ):
        """
        Initialize path validator

        Args:
            allowed_base_paths: List of base directories that are allowed
            allow_symlinks: Whether to allow symbolic links
            allow_hidden_files: Whether to allow hidden files (starting with .)
            max_path_length: Maximum allowed path length
            allowed_extensions: Whitelist of allowed file extensions
            forbidden_extensions: Additional forbidden extensions
        """
        self.allowed_base_paths = [Path(p).resolve() for p in (allowed_base_paths or [])]
        self.allow_symlinks = allow_symlinks
        self.allow_hidden_files = allow_hidden_files
        self.max_path_length = max_path_length
        self.allowed_extensions = allowed_extensions
        self.forbidden_extensions = (forbidden_extensions or set()) | self.DANGEROUS_EXTENSIONS

        # Compile regex patterns for efficiency
        self._compiled_patterns = [re.compile(pattern) for pattern in self.DANGEROUS_PATTERNS]

        # Cache for validated paths
        self._validation_cache = {}

    def validate_path(self, path: str, operation: str = "read") -> Path:
        """
        Validate a path for security

        Args:
            path: Path to validate
            operation: Operation type ("read", "write", "execute")

        Returns:
            Validated Path object

        Raises:
            PathSecurityError: If path validation fails
        """
        # Check cache
        cache_key = (path, operation)
        if cache_key in self._validation_cache:
            return self._validation_cache[cache_key]

        try:
            # Basic validation
            if not path:
                raise PathSecurityError("Empty path provided")

            if len(path) > self.max_path_length:
                raise PathSecurityError(f"Path too long: {len(path)} > {self.max_path_length}")

            # Check for dangerous patterns
            for pattern in self._compiled_patterns:
                if pattern.search(path):
                    raise PathSecurityError(f"Dangerous pattern detected in path: {path}")

            # Convert to Path object and resolve
            path_obj = Path(path)

            # Check if path is absolute when it shouldn't be
            if path_obj.is_absolute() and not self.allowed_base_paths:
                raise PathSecurityError(f"Absolute paths not allowed: {path}")

            # Resolve the path (follows symlinks)
            try:
                resolved_path = path_obj.resolve()
            except (OSError, RuntimeError) as e:
                raise PathSecurityError(f"Cannot resolve path: {e}")

            # Check if path is within allowed base paths
            if self.allowed_base_paths:
                if not any(self._is_subpath(resolved_path, base) for base in self.allowed_base_paths):
                    raise PathSecurityError(f"Path outside allowed directories: {resolved_path}")

            # Check for forbidden paths
            for forbidden in self.FORBIDDEN_PATHS:
                if str(resolved_path).startswith(forbidden):
                    raise PathSecurityError(f"Access to forbidden path: {resolved_path}")

            # Check symlinks
            if not self.allow_symlinks and path_obj.exists() and path_obj.is_symlink():
                raise PathSecurityError(f"Symbolic links not allowed: {path}")

            # Check hidden files
            if not self.allow_hidden_files and any(part.startswith(".") for part in path_obj.parts):
                raise PathSecurityError(f"Hidden files not allowed: {path}")

            # Check file extension
            if path_obj.suffix:
                if self.allowed_extensions and path_obj.suffix not in self.allowed_extensions:
                    raise PathSecurityError(f"File extension not allowed: {path_obj.suffix}")

                if path_obj.suffix.lower() in self.forbidden_extensions:
                    raise PathSecurityError(f"Forbidden file extension: {path_obj.suffix}")

            # Operation-specific checks
            if operation == "write":
                # Check if parent directory exists and is writable
                parent = resolved_path.parent
                if not parent.exists():
                    raise PathSecurityError(f"Parent directory does not exist: {parent}")
                if not os.access(parent, os.W_OK):
                    raise PathSecurityError(f"No write permission for directory: {parent}")

            elif operation == "execute":
                # Never allow execution of files
                raise PathSecurityError("File execution not allowed")

            # Cache the validated path
            self._validation_cache[cache_key] = resolved_path

            logger.debug(f"Path validated successfully: {resolved_path}")
            return resolved_path

        except PathSecurityError:
            raise
        except Exception as e:
            raise PathSecurityError(f"Path validation error: {e}")

    def _is_subpath(self, path: Path, base: Path) -> bool:
        """Check if path is a subpath of base"""
        try:
            path.relative_to(base)
            return True
        except ValueError:
            return False

    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitize a filename for safe use

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove path separators
        filename = filename.replace("/", "").replace("\\", "")

        # Remove null bytes
        filename = filename.replace("\x00", "")

        # Remove leading dots (hidden files)
        filename = filename.lstrip(".")

        # Replace dangerous characters
        dangerous_chars = '<>:"|?*'
        for char in dangerous_chars:
            filename = filename.replace(char, "_")

        # Limit length
        max_filename_length = 255
        if len(filename) > max_filename_length:
            name, ext = os.path.splitext(filename)
            filename = name[: max_filename_length - len(ext)] + ext

        # Ensure filename is not empty
        if not filename:
            filename = "unnamed"

        return filename

    def get_safe_path(self, base_path: str, user_path: str) -> Path:
        """
        Safely join a base path with a user-provided path

        Args:
            base_path: Safe base directory
            user_path: User-provided relative path

        Returns:
            Safe joined path
        """
        # Sanitize user path
        user_path = user_path.replace("..", "").replace("~", "")
        user_path = os.path.normpath(user_path)

        # Join paths
        full_path = os.path.join(base_path, user_path)

        # Validate the result
        return self.validate_path(full_path)

    def is_safe_to_read(self, path: str) -> bool:
        """Check if a path is safe to read"""
        try:
            self.validate_path(path, operation="read")
            return True
        except PathSecurityError:
            return False

    def is_safe_to_write(self, path: str) -> bool:
        """Check if a path is safe to write"""
        try:
            self.validate_path(path, operation="write")
            return True
        except PathSecurityError:
            return False

    def clear_cache(self):
        """Clear the validation cache"""
        self._validation_cache.clear()


# Global validator instances
_default_validator = None
_strict_validator = None


def get_default_validator() -> PathValidator:
    """Get default path validator (reasonable security)"""
    global _default_validator
    if _default_validator is None:
        # Get allowed paths from environment or use defaults
        allowed_paths = (
            os.getenv("VANA_ALLOWED_PATHS", "").split(":")
            if os.getenv("VANA_ALLOWED_PATHS")
            else [
                os.getcwd(),  # Current working directory
                "/tmp",  # Temporary files
                os.path.expanduser("~/vana_workspace"),  # User workspace
            ]
        )

        _default_validator = PathValidator(
            allowed_base_paths=allowed_paths,
            allow_symlinks=False,
            allow_hidden_files=False,
            allowed_extensions={".py", ".txt", ".json", ".yaml", ".yml", ".md", ".csv", ".log"},
        )

    return _default_validator


def get_strict_validator() -> PathValidator:
    """Get strict path validator (maximum security)"""
    global _strict_validator
    if _strict_validator is None:
        _strict_validator = PathValidator(
            allowed_base_paths=[os.getcwd()],  # Only current directory
            allow_symlinks=False,
            allow_hidden_files=False,
            allowed_extensions={".txt", ".json", ".csv"},  # Very limited extensions
            max_path_length=1024,  # Shorter paths only
        )

    return _strict_validator


def validate_file_path(path: str, strict: bool = False) -> Path:
    """
    Convenience function to validate a file path

    Args:
        path: Path to validate
        strict: Use strict validation

    Returns:
        Validated Path object
    """
    validator = get_strict_validator() if strict else get_default_validator()
    return validator.validate_path(path)


def safe_join_path(base: str, *paths: str) -> Path:
    """
    Safely join path components

    Args:
        base: Base path
        *paths: Path components to join

    Returns:
        Safe joined path
    """
    validator = get_default_validator()
    user_path = os.path.join(*paths)
    return validator.get_safe_path(base, user_path)


# Export public API
__all__ = [
    "PathSecurityError",
    "PathValidator",
    "get_default_validator",
    "get_strict_validator",
    "validate_file_path",
    "safe_join_path",
]
