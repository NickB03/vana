"""
Standardized File System Tools for VANA Multi-Agent System

This module provides standardized file system tools that follow the
tool standards framework for consistent interfaces, error handling,
and performance monitoring.
"""

import os
import sys
from typing import Any, Dict

# Add the parent directory to the path to import VANA tools
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from lib._shared_libraries.tool_standards import (
    InputValidator,
    StandardToolResponse,
    performance_monitor,
    standardized_tool_wrapper,
    tool_analytics,
)

# Import original file system tools with fallback to avoid circular imports
try:
    from agent.tools.file_system import FileSystemTool
except ImportError:
    # Fallback implementation to avoid circular imports during initialization
    class FileSystemTool:
        def read_file(self, file_path: str):
            return {
                "success": False,
                "error": "FileSystemTool not available during initialization",
            }

        def write_file(self, file_path: str, content: str, append: bool = False):
            return {
                "success": False,
                "error": "FileSystemTool not available during initialization",
            }

        def list_directory(self, directory_path: str):
            return {
                "success": False,
                "error": "FileSystemTool not available during initialization",
            }

        def file_exists(self, file_path: str):
            return {
                "success": False,
                "error": "FileSystemTool not available during initialization",
            }


class StandardizedFileSystemTools:
    """Standardized file system tools with enhanced monitoring and error handling."""

    def __init__(self):
        self.fs_tool = FileSystemTool()

    @standardized_tool_wrapper("read_file")
    def read_file(self, file_path: str) -> StandardToolResponse:
        """📖 Read the contents of a file with enhanced error handling and security checks.

        Args:
            file_path: Path to the file to read

        Returns:
            StandardToolResponse with file contents or error information
        """
        # Validate inputs
        file_path = InputValidator.validate_path(file_path, "file_path")

        # Record usage for analytics
        parameters = {"file_path": file_path}

        # Execute original tool
        result = self.fs_tool.read_file(file_path)

        # Convert to standardized response
        if result["success"]:
            response = StandardToolResponse(
                success=True,
                data=result["content"],
                tool_name="read_file",
                metadata={"file_size": len(result["content"]), "file_path": file_path},
            )
        else:
            response = StandardToolResponse(success=False, error=result["error"], tool_name="read_file")

        # Record analytics
        tool_analytics.record_usage("read_file", parameters, response)
        return response

    @standardized_tool_wrapper("write_file")
    def write_file(self, file_path: str, content: str, append: bool = False) -> StandardToolResponse:
        """✍️ Write content to a file with backup and validation.

        Args:
            file_path: Path to the file to write
            content: Content to write to the file
            append: Whether to append to existing file (default: False)

        Returns:
            StandardToolResponse with success status or error information
        """
        # Validate inputs
        file_path = InputValidator.validate_path(file_path, "file_path")
        content = InputValidator.validate_string(content, "content", required=True, max_length=1000000)

        # Record usage for analytics
        parameters = {
            "file_path": file_path,
            "content_length": len(content),
            "append": append,
        }

        # Execute original tool
        result = self.fs_tool.write_file(file_path, content, append)

        # Convert to standardized response
        if result["success"]:
            response = StandardToolResponse(
                success=True,
                data=f"Successfully {'appended to' if append else 'wrote'} file: {file_path}",
                tool_name="write_file",
                metadata={
                    "file_path": file_path,
                    "content_length": len(content),
                    "append_mode": append,
                },
            )
        else:
            response = StandardToolResponse(success=False, error=result["error"], tool_name="write_file")

        # Record analytics
        tool_analytics.record_usage("write_file", parameters, response)
        return response

    @standardized_tool_wrapper("list_directory")
    def list_directory(self, directory_path: str) -> StandardToolResponse:
        """📁 List contents of a directory with enhanced formatting and metadata.

        Args:
            directory_path: Path to the directory to list

        Returns:
            StandardToolResponse with directory contents or error information
        """
        # Validate inputs
        directory_path = InputValidator.validate_path(directory_path, "directory_path")

        # Record usage for analytics
        parameters = {"directory_path": directory_path}

        # Execute original tool
        result = self.fs_tool.list_directory(directory_path)

        # Convert to standardized response
        if result["success"]:
            contents = result["contents"]
            response = StandardToolResponse(
                success=True,
                data=contents,
                tool_name="list_directory",
                metadata={
                    "directory_path": directory_path,
                    "item_count": len(contents),
                    "file_count": sum(1 for item in contents if item.get("type") == "file"),
                    "directory_count": sum(1 for item in contents if item.get("type") == "directory"),
                },
            )
        else:
            response = StandardToolResponse(success=False, error=result["error"], tool_name="list_directory")

        # Record analytics
        tool_analytics.record_usage("list_directory", parameters, response)
        return response

    @standardized_tool_wrapper("file_exists")
    def file_exists(self, file_path: str) -> StandardToolResponse:
        """🔍 Check if a file or directory exists with detailed status information.

        Args:
            file_path: Path to check for existence

        Returns:
            StandardToolResponse with existence status or error information
        """
        # Validate inputs
        file_path = InputValidator.validate_path(file_path, "file_path")

        # Record usage for analytics
        parameters = {"file_path": file_path}

        # Execute original tool
        result = self.fs_tool.file_exists(file_path)

        # Convert to standardized response
        if result["success"]:
            exists = result["exists"]
            response = StandardToolResponse(
                success=True,
                data={
                    "exists": exists,
                    "path": file_path,
                    "type": result.get("type", "unknown") if exists else None,
                },
                tool_name="file_exists",
                metadata={"file_path": file_path, "exists": exists},
            )
        else:
            response = StandardToolResponse(success=False, error=result["error"], tool_name="file_exists")

        # Record analytics
        tool_analytics.record_usage("file_exists", parameters, response)
        return response


# Create global instance
standardized_fs_tools = StandardizedFileSystemTools()


# Wrapper functions for ADK compatibility
def standardized_read_file(file_path: str) -> str:
    """📖 Read file with standardized interface - returns string for ADK compatibility."""
    result = standardized_fs_tools.read_file(file_path)
    return result.to_string()


def standardized_write_file(file_path: str, content: str, append: bool = False) -> str:
    """✍️ Write file with standardized interface - returns string for ADK compatibility."""
    result = standardized_fs_tools.write_file(file_path, content, append)
    return result.to_string()


def standardized_list_directory(directory_path: str) -> str:
    """📁 List directory with standardized interface - returns string for ADK compatibility."""
    result = standardized_fs_tools.list_directory(directory_path)
    return result.to_string()


def standardized_file_exists(file_path: str) -> str:
    """🔍 Check file existence with standardized interface - returns string for ADK compatibility."""
    result = standardized_fs_tools.file_exists(file_path)
    return result.to_string()


# Performance monitoring functions
def get_file_tools_performance() -> Dict[str, Any]:
    """Get performance metrics for file system tools."""
    return {
        "read_file": performance_monitor.get_metrics("read_file"),
        "write_file": performance_monitor.get_metrics("write_file"),
        "list_directory": performance_monitor.get_metrics("list_directory"),
        "file_exists": performance_monitor.get_metrics("file_exists"),
    }


def get_file_tools_analytics() -> Dict[str, Any]:
    """Get usage analytics for file system tools."""
    return {
        "read_file": tool_analytics.get_usage_analytics("read_file"),
        "write_file": tool_analytics.get_usage_analytics("write_file"),
        "list_directory": tool_analytics.get_usage_analytics("list_directory"),
        "file_exists": tool_analytics.get_usage_analytics("file_exists"),
    }
