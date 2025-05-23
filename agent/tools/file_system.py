"""
File System Tool for VANA Agent

This module provides file system operations for the VANA agent, including:
- Reading files
- Writing files
- Listing directory contents
- Checking if files exist

These operations are implemented with appropriate security checks and error handling.
"""

import os
import logging
from typing import Dict, Any, Optional, List, Union
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define allowed file extensions for security
ALLOWED_EXTENSIONS = {
    '.txt', '.md', '.json', '.csv', '.py', '.js', '.html', '.css',
    '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.log'
}

# Define restricted directories for security
RESTRICTED_DIRS = {
    '/etc', '/var', '/usr', '/bin', '/sbin', '/boot', '/dev', '/proc', '/sys',
    '/root', '/home', '/tmp', '/opt', '/lib', '/lib64', '/run', '/srv'
}

class FileSystemTool:
    """
    File system tool for the VANA agent.

    This tool provides secure file operations with appropriate validation
    and error handling. It includes methods for reading, writing, and
    listing files.
    """

    def __init__(self, base_dir: Optional[str] = None):
        """
        Initialize the file system tool.

        Args:
            base_dir: Optional base directory to restrict operations to
        """
        self.base_dir = base_dir
        logger.info(f"Initialized FileSystemTool with base_dir: {base_dir}")

    def _validate_path(self, path: str) -> bool:
        """
        Validate a file path for security.

        Args:
            path: File path to validate

        Returns:
            True if the path is valid, False otherwise
        """
        # Check if path is absolute and convert to absolute if not
        abs_path = os.path.abspath(path)

        # Check if path is within base_dir if specified
        if self.base_dir and not abs_path.startswith(os.path.abspath(self.base_dir)):
            logger.warning(f"Path {path} is outside base directory {self.base_dir}")
            return False

        # Check if path is in restricted directories
        for restricted_dir in RESTRICTED_DIRS:
            if abs_path.startswith(restricted_dir):
                logger.warning(f"Path {path} is in restricted directory {restricted_dir}")
                return False

        # Check file extension for write operations
        _, ext = os.path.splitext(abs_path)
        if ext and ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"File extension {ext} is not allowed")
            return False

        return True

    def read_file(self, path: str) -> Dict[str, Any]:
        """
        Read a file and return its contents.

        Args:
            path: Path to the file

        Returns:
            Dictionary with 'success', 'content', and optional 'error' keys
        """
        # Validate path
        if not self._validate_path(path):
            return {
                "success": False,
                "error": "Invalid or restricted file path"
            }

        try:
            # Check if file exists
            if not os.path.exists(path):
                return {
                    "success": False,
                    "error": f"File not found: {path}"
                }

            # Check if path is a file
            if not os.path.isfile(path):
                return {
                    "success": False,
                    "error": f"Not a file: {path}"
                }

            # Read file
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            logger.info(f"Successfully read file: {path}")
            return {
                "success": True,
                "content": content
            }
        except Exception as e:
            logger.error(f"Error reading file {path}: {str(e)}")
            return {
                "success": False,
                "error": f"Error reading file: {str(e)}"
            }

    def write_file(self, path: str, content: str, append: bool = False) -> Dict[str, Any]:
        """
        Write content to a file.

        Args:
            path: Path to the file
            content: Content to write
            append: Whether to append to the file (default: False)

        Returns:
            Dictionary with 'success' and optional 'error' keys
        """
        # Validate path
        if not self._validate_path(path):
            return {
                "success": False,
                "error": "Invalid or restricted file path"
            }

        try:
            # Create directory if it doesn't exist
            directory = os.path.dirname(path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory)

            # Write or append to file
            mode = 'a' if append else 'w'
            with open(path, mode, encoding='utf-8') as f:
                f.write(content)

            logger.info(f"Successfully {'appended to' if append else 'wrote'} file: {path}")
            return {
                "success": True
            }
        except Exception as e:
            logger.error(f"Error writing to file {path}: {str(e)}")
            return {
                "success": False,
                "error": f"Error writing to file: {str(e)}"
            }

    def list_directory(self, path: str) -> Dict[str, Any]:
        """
        List contents of a directory.

        Args:
            path: Path to the directory

        Returns:
            Dictionary with 'success', 'contents', and optional 'error' keys
        """
        # Validate path
        if not self._validate_path(path):
            return {
                "success": False,
                "error": "Invalid or restricted directory path"
            }

        try:
            # Check if directory exists
            if not os.path.exists(path):
                return {
                    "success": False,
                    "error": f"Directory not found: {path}"
                }

            # Check if path is a directory
            if not os.path.isdir(path):
                return {
                    "success": False,
                    "error": f"Not a directory: {path}"
                }

            # List directory contents
            contents = os.listdir(path)
            
            # Get file types
            file_info = []
            for item in contents:
                item_path = os.path.join(path, item)
                item_type = "directory" if os.path.isdir(item_path) else "file"
                file_info.append({
                    "name": item,
                    "type": item_type
                })

            logger.info(f"Successfully listed directory: {path}")
            return {
                "success": True,
                "contents": file_info
            }
        except Exception as e:
            logger.error(f"Error listing directory {path}: {str(e)}")
            return {
                "success": False,
                "error": f"Error listing directory: {str(e)}"
            }

    def file_exists(self, path: str) -> Dict[str, Any]:
        """
        Check if a file exists.

        Args:
            path: Path to the file

        Returns:
            Dictionary with 'success', 'exists', and optional 'error' keys
        """
        # Validate path
        if not self._validate_path(path):
            return {
                "success": False,
                "error": "Invalid or restricted file path"
            }

        try:
            exists = os.path.exists(path)
            is_file = os.path.isfile(path) if exists else False
            
            logger.info(f"Checked if file exists: {path} - {'Yes' if exists and is_file else 'No'}")
            return {
                "success": True,
                "exists": exists and is_file
            }
        except Exception as e:
            logger.error(f"Error checking if file exists {path}: {str(e)}")
            return {
                "success": False,
                "error": f"Error checking if file exists: {str(e)}"
            }

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the tool.

        Returns:
            Tool metadata
        """
        return {
            "name": "file_system",
            "description": "Tool for file system operations",
            "operations": [
                {
                    "name": "read_file",
                    "description": "Read a file and return its contents",
                    "parameters": [
                        {
                            "name": "path",
                            "type": "string",
                            "description": "Path to the file",
                            "required": True
                        }
                    ]
                },
                {
                    "name": "write_file",
                    "description": "Write content to a file",
                    "parameters": [
                        {
                            "name": "path",
                            "type": "string",
                            "description": "Path to the file",
                            "required": True
                        },
                        {
                            "name": "content",
                            "type": "string",
                            "description": "Content to write",
                            "required": True
                        },
                        {
                            "name": "append",
                            "type": "boolean",
                            "description": "Whether to append to the file",
                            "required": False,
                            "default": False
                        }
                    ]
                },
                {
                    "name": "list_directory",
                    "description": "List contents of a directory",
                    "parameters": [
                        {
                            "name": "path",
                            "type": "string",
                            "description": "Path to the directory",
                            "required": True
                        }
                    ]
                },
                {
                    "name": "file_exists",
                    "description": "Check if a file exists",
                    "parameters": [
                        {
                            "name": "path",
                            "type": "string",
                            "description": "Path to the file",
                            "required": True
                        }
                    ]
                }
            ]
        }


# Function wrappers for the tool
def read_file(path: str) -> Union[str, Dict[str, Any]]:
    """
    Read a file and return its contents.

    Args:
        path: Path to the file

    Returns:
        File contents if successful, error dictionary otherwise
    """
    tool = FileSystemTool()
    result = tool.read_file(path)
    
    if result["success"]:
        return result["content"]
    return result

def write_file(path: str, content: str, append: bool = False) -> Dict[str, Any]:
    """
    Write content to a file.

    Args:
        path: Path to the file
        content: Content to write
        append: Whether to append to the file (default: False)

    Returns:
        Dictionary with 'success' and optional 'error' keys
    """
    tool = FileSystemTool()
    return tool.write_file(path, content, append)

def list_directory(path: str) -> Union[List[Dict[str, str]], Dict[str, Any]]:
    """
    List contents of a directory.

    Args:
        path: Path to the directory

    Returns:
        List of file info dictionaries if successful, error dictionary otherwise
    """
    tool = FileSystemTool()
    result = tool.list_directory(path)
    
    if result["success"]:
        return result["contents"]
    return result

def file_exists(path: str) -> Union[bool, Dict[str, Any]]:
    """
    Check if a file exists.

    Args:
        path: Path to the file

    Returns:
        Boolean if successful, error dictionary otherwise
    """
    tool = FileSystemTool()
    result = tool.file_exists(path)
    
    if result["success"]:
        return result["exists"]
    return result
