"""
Secure File Operation Tools for VANA
Integrates path validation and input sanitization for secure file operations
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from lib.logging_config import get_logger
from lib.security.input_sanitizer import SanitizationError, get_default_sanitizer
from lib.security.path_validator import PathSecurityError, get_default_validator
from lib.security.rate_limiter import check_rate_limit, rate_limit

logger = get_logger("vana.secure_file_tools")


@rate_limit(requests_per_minute=100, requests_per_hour=1000)
def secure_read_file(file_path: str, user_id: str = "system") -> str:
    """
    Securely read a file with path validation and rate limiting

    Args:
        file_path: Path to file to read
        user_id: User identifier for rate limiting

    Returns:
        File contents or error message
    """
    try:
        # Validate path
        validator = get_default_validator()
        safe_path = validator.validate_path(file_path)

        logger.info(f"Reading file: {safe_path} (user: {user_id})")

        # Read file
        with open(safe_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Basic content validation (no sanitization for reads)
        if len(content) > 10_000_000:  # 10MB limit
            return "Error: File too large (>10MB)"

        return content

    except PathSecurityError as e:
        logger.warning(f"Path security violation: {e} (user: {user_id})")
        return f"Security Error: {str(e)}"
    except FileNotFoundError:
        return f"Error: File not found: {file_path}"
    except Exception as e:
        logger.error(f"File read error: {e}")
        return f"Error reading file: {str(e)}"


@rate_limit(requests_per_minute=50, requests_per_hour=500)
def secure_write_file(file_path: str, content: str, user_id: str = "system") -> str:
    """
    Securely write to a file with validation and sanitization

    Args:
        file_path: Path to file to write
        content: Content to write
        user_id: User identifier for rate limiting

    Returns:
        Success message or error
    """
    try:
        # Validate path
        validator = get_default_validator()
        safe_path = validator.validate_path(file_path, operation="write")

        # Sanitize content if it looks like code
        if file_path.endswith((".py", ".js", ".sh", ".bat")):
            sanitizer = get_default_sanitizer()
            # Light sanitization - check for obvious malicious patterns
            if any(pattern in content.lower() for pattern in ["rm -rf", "format c:", "del /f /s /q"]):
                logger.warning(f"Suspicious content in code file: {file_path} (user: {user_id})")
                return "Error: Suspicious content detected"

        logger.info(f"Writing file: {safe_path} (user: {user_id})")

        # Create parent directory if needed
        safe_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(content)

        return f"Successfully wrote {len(content)} bytes to {safe_path}"

    except PathSecurityError as e:
        logger.warning(f"Path security violation: {e} (user: {user_id})")
        return f"Security Error: {str(e)}"
    except Exception as e:
        logger.error(f"File write error: {e}")
        return f"Error writing file: {str(e)}"


@rate_limit(requests_per_minute=100, requests_per_hour=1000)
def secure_list_directory(directory: str, user_id: str = "system") -> List[Dict[str, Any]]:
    """
    Securely list directory contents

    Args:
        directory: Directory path to list
        user_id: User identifier for rate limiting

    Returns:
        List of file/directory information
    """
    try:
        # Validate path
        validator = get_default_validator()
        safe_path = validator.validate_path(directory)

        if not safe_path.is_dir():
            return [{"error": f"Not a directory: {directory}"}]

        logger.info(f"Listing directory: {safe_path} (user: {user_id})")

        items = []
        for item in safe_path.iterdir():
            try:
                # Skip hidden files unless allowed
                if item.name.startswith(".") and not validator.allow_hidden_files:
                    continue

                stat = item.stat()
                items.append(
                    {
                        "name": item.name,
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size,
                        "modified": stat.st_mtime,
                        "permissions": oct(stat.st_mode)[-3:],
                    }
                )
            except Exception as e:
                logger.debug(f"Skipping {item}: {e}")
                continue

        return sorted(items, key=lambda x: (x["type"] != "directory", x["name"]))

    except PathSecurityError as e:
        logger.warning(f"Path security violation: {e} (user: {user_id})")
        return [{"error": f"Security Error: {str(e)}"}]
    except Exception as e:
        logger.error(f"Directory list error: {e}")
        return [{"error": f"Error listing directory: {str(e)}"}]


def secure_delete_file(file_path: str, user_id: str = "system") -> str:
    """
    Securely delete a file with extra confirmation

    Args:
        file_path: Path to file to delete
        user_id: User identifier for rate limiting

    Returns:
        Success message or error
    """
    try:
        # Check rate limit for destructive operations
        check_rate_limit(user_id, "delete_operation")

        # Validate path
        validator = get_default_validator()
        safe_path = validator.validate_path(file_path, operation="write")

        if not safe_path.exists():
            return f"Error: File not found: {file_path}"

        if not safe_path.is_file():
            return f"Error: Not a file: {file_path}"

        # Extra safety check - don't delete critical files
        critical_patterns = ["requirements.txt", "package.json", "Gemfile", ".env", "config"]
        if any(pattern in safe_path.name.lower() for pattern in critical_patterns):
            logger.warning(f"Attempt to delete critical file: {safe_path} (user: {user_id})")
            return "Error: Cannot delete critical configuration files"

        logger.info(f"Deleting file: {safe_path} (user: {user_id})")

        # Delete file
        safe_path.unlink()

        return f"Successfully deleted: {safe_path}"

    except PathSecurityError as e:
        logger.warning(f"Path security violation: {e} (user: {user_id})")
        return f"Security Error: {str(e)}"
    except Exception as e:
        logger.error(f"File delete error: {e}")
        return f"Error deleting file: {str(e)}"


def secure_move_file(source: str, destination: str, user_id: str = "system") -> str:
    """
    Securely move/rename a file

    Args:
        source: Source file path
        destination: Destination file path
        user_id: User identifier for rate limiting

    Returns:
        Success message or error
    """
    try:
        # Check rate limit
        check_rate_limit(user_id, "file_operation")

        # Validate both paths
        validator = get_default_validator()
        safe_source = validator.validate_path(source)
        safe_dest = validator.validate_path(destination, operation="write")

        if not safe_source.exists():
            return f"Error: Source file not found: {source}"

        if safe_dest.exists():
            return f"Error: Destination already exists: {destination}"

        logger.info(f"Moving file: {safe_source} -> {safe_dest} (user: {user_id})")

        # Move file
        safe_source.rename(safe_dest)

        return f"Successfully moved: {safe_source} -> {safe_dest}"

    except PathSecurityError as e:
        logger.warning(f"Path security violation: {e} (user: {user_id})")
        return f"Security Error: {str(e)}"
    except Exception as e:
        logger.error(f"File move error: {e}")
        return f"Error moving file: {str(e)}"


def secure_create_directory(directory: str, user_id: str = "system") -> str:
    """
    Securely create a directory

    Args:
        directory: Directory path to create
        user_id: User identifier for rate limiting

    Returns:
        Success message or error
    """
    try:
        # Check rate limit
        check_rate_limit(user_id, "file_operation")

        # Validate path
        validator = get_default_validator()
        safe_path = validator.validate_path(directory, operation="write")

        if safe_path.exists():
            return f"Error: Path already exists: {directory}"

        logger.info(f"Creating directory: {safe_path} (user: {user_id})")

        # Create directory with parents
        safe_path.mkdir(parents=True, exist_ok=True)

        return f"Successfully created directory: {safe_path}"

    except PathSecurityError as e:
        logger.warning(f"Path security violation: {e} (user: {user_id})")
        return f"Security Error: {str(e)}"
    except Exception as e:
        logger.error(f"Directory creation error: {e}")
        return f"Error creating directory: {str(e)}"


def secure_get_file_info(file_path: str, user_id: str = "system") -> Dict[str, Any]:
    """
    Get secure file information

    Args:
        file_path: Path to file
        user_id: User identifier for rate limiting

    Returns:
        File information dictionary
    """
    try:
        # Validate path
        validator = get_default_validator()
        safe_path = validator.validate_path(file_path)

        if not safe_path.exists():
            return {"error": f"File not found: {file_path}"}

        stat = safe_path.stat()

        return {
            "path": str(safe_path),
            "name": safe_path.name,
            "type": "directory" if safe_path.is_dir() else "file",
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "created": stat.st_ctime,
            "permissions": oct(stat.st_mode)[-3:],
            "owner": stat.st_uid,
            "group": stat.st_gid,
            "is_symlink": safe_path.is_symlink(),
            "is_hidden": safe_path.name.startswith("."),
        }

    except PathSecurityError as e:
        logger.warning(f"Path security violation: {e} (user: {user_id})")
        return {"error": f"Security Error: {str(e)}"}
    except Exception as e:
        logger.error(f"File info error: {e}")
        return {"error": f"Error getting file info: {str(e)}"}


# Export secure tools
__all__ = [
    "secure_read_file",
    "secure_write_file",
    "secure_list_directory",
    "secure_delete_file",
    "secure_move_file",
    "secure_create_directory",
    "secure_get_file_info",
]
