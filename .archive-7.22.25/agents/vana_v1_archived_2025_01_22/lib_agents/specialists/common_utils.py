"""
Common Utilities for Specialist Agents

This module contains shared utility functions used across multiple specialist agents
to reduce code duplication and improve maintainability.
"""

import ast
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import yaml


# File I/O Utilities
def safe_read_file(file_path: str, encoding: str = "utf-8") -> Tuple[Optional[str], Optional[str]]:
    """
    Safely read a file and return its content.

    Args:
        file_path: Path to the file
        encoding: File encoding (default: utf-8)

    Returns:
        Tuple of (content, error_message)
    """
    try:
        with open(file_path, "r", encoding=encoding) as f:
            return f.read(), None
    except FileNotFoundError:
        return None, f"File not found: {file_path}"
    except PermissionError:
        return None, f"Permission denied: {file_path}"
    except UnicodeDecodeError:
        return None, f"Unable to decode file: {file_path}"
    except Exception as e:
        return None, f"Error reading file: {str(e)}"


def find_python_files(directory: str, exclude_dirs: Optional[List[str]] = None) -> List[str]:
    """
    Find all Python files in a directory, excluding certain directories.

    Args:
        directory: Root directory to search
        exclude_dirs: Directories to exclude (default: common exclusions)

    Returns:
        List of Python file paths
    """
    if exclude_dirs is None:
        exclude_dirs = [".git", "__pycache__", ".venv", "venv", "node_modules", ".tox"]

    python_files = []

    try:
        for root, dirs, files in os.walk(directory):
            # Remove excluded directories from search
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                if file.endswith(".py"):
                    python_files.append(os.path.join(root, file))
    except Exception as e:
        # Return what we found so far
        pass

    return python_files


# AST Utilities
def safe_parse_ast(content: str, filename: str = "<unknown>") -> Tuple[Optional[ast.AST], Optional[str]]:
    """
    Safely parse Python code into an AST.

    Args:
        content: Python source code
        filename: Filename for error reporting

    Returns:
        Tuple of (ast_tree, error_message)
    """
    try:
        return ast.parse(content, filename), None
    except SyntaxError as e:
        return None, f"Syntax error in {filename}: {e.msg} at line {e.lineno}"
    except Exception as e:
        return None, f"Error parsing {filename}: {str(e)}"


def extract_functions(tree: ast.AST) -> List[ast.FunctionDef]:
    """
    Extract all function definitions from an AST.

    Args:
        tree: AST tree

    Returns:
        List of FunctionDef nodes
    """
    return [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]


def extract_classes(tree: ast.AST) -> List[ast.ClassDef]:
    """
    Extract all class definitions from an AST.

    Args:
        tree: AST tree

    Returns:
        List of ClassDef nodes
    """
    return [node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]


def extract_imports(tree: ast.AST) -> Dict[str, List[str]]:
    """
    Extract all imports from an AST.

    Args:
        tree: AST tree

    Returns:
        Dictionary with 'imports' and 'from_imports' lists
    """
    imports = []
    from_imports = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                from_imports.append(node.module)

    return {"imports": imports, "from_imports": from_imports}


# Error Handling Utilities
def format_error_response(operation: str, error: Exception, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Format a standardized error response.

    Args:
        operation: Name of the operation that failed
        error: The exception that occurred
        context: Optional context information

    Returns:
        Formatted error dictionary
    """
    response = {
        "error": f"{operation} failed: {str(error)}",
        "error_type": type(error).__name__,
        "operation": operation,
    }

    if context:
        response["context"] = context

    return response


# Configuration File Utilities
def parse_config_file(file_path: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Parse a configuration file (JSON, YAML, or Python dict).

    Args:
        file_path: Path to configuration file

    Returns:
        Tuple of (config_dict, error_message)
    """
    content, error = safe_read_file(file_path)
    if error:
        return None, error

    # Try JSON first
    try:
        return json.loads(content), None
    except json.JSONDecodeError:
        pass

    # Try YAML
    try:
        return yaml.safe_load(content), None
    except yaml.YAMLError:
        pass

    # Try Python dict evaluation (careful with security)
    try:
        # Only evaluate if it looks like a dict
        if content.strip().startswith("{") and content.strip().endswith("}"):
            # Use ast.literal_eval for safety
            return ast.literal_eval(content), None
    except (ValueError, SyntaxError):
        pass

    return None, "Unable to parse configuration file as JSON, YAML, or Python dict"


# Code Metrics Utilities
def calculate_complexity(node: ast.FunctionDef) -> int:
    """
    Calculate cyclomatic complexity of a function.

    Args:
        node: AST FunctionDef node

    Returns:
        Complexity score
    """
    complexity = 1  # Base complexity

    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.While, ast.For)):
            complexity += 1
        elif isinstance(child, ast.ExceptHandler):
            complexity += 1
        elif isinstance(child, (ast.And, ast.Or)):
            complexity += 1

    return complexity


def count_lines_of_code(content: str, exclude_blank: bool = True, exclude_comments: bool = True) -> int:
    """
    Count lines of code in a file.

    Args:
        content: File content
        exclude_blank: Whether to exclude blank lines
        exclude_comments: Whether to exclude comment lines

    Returns:
        Line count
    """
    lines = content.split("\n")
    count = 0

    for line in lines:
        stripped = line.strip()

        if exclude_blank and not stripped:
            continue

        if exclude_comments and stripped.startswith("#"):
            continue

        count += 1

    return count


# Pattern Detection Utilities
def find_pattern_in_code(content: str, pattern: str, multiline: bool = False) -> List[Dict[str, Any]]:
    """
    Find a regex pattern in code content.

    Args:
        content: Code content to search
        pattern: Regular expression pattern
        multiline: Whether to enable multiline matching

    Returns:
        List of matches with line numbers
    """
    matches = []

    if multiline:
        flags = re.MULTILINE | re.DOTALL
        for match in re.finditer(pattern, content, flags):
            start_line = content[: match.start()].count("\n") + 1
            matches.append(
                {"match": match.group(), "start_line": start_line, "start_pos": match.start(), "end_pos": match.end()}
            )
    else:
        lines = content.split("\n")
        for i, line in enumerate(lines, 1):
            for match in re.finditer(pattern, line):
                matches.append({"match": match.group(), "line": i, "start_pos": match.start(), "end_pos": match.end()})

    return matches


# Validation Utilities
def validate_python_syntax(content: str) -> Tuple[bool, Optional[str]]:
    """
    Validate Python syntax without executing.

    Args:
        content: Python code to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        compile(content, "<string>", "exec")
        return True, None
    except SyntaxError as e:
        return False, f"Syntax error at line {e.lineno}: {e.msg}"
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def is_valid_identifier(name: str) -> bool:
    """
    Check if a string is a valid Python identifier.

    Args:
        name: String to check

    Returns:
        True if valid identifier
    """
    return name.isidentifier() and not keyword.iskeyword(name)


# Export all utilities
__all__ = [
    # File I/O
    "safe_read_file",
    "find_python_files",
    # AST
    "safe_parse_ast",
    "extract_functions",
    "extract_classes",
    "extract_imports",
    # Error Handling
    "format_error_response",
    # Config
    "parse_config_file",
    # Metrics
    "calculate_complexity",
    "count_lines_of_code",
    # Patterns
    "find_pattern_in_code",
    # Validation
    "validate_python_syntax",
    "is_valid_identifier",
]


# Import keyword for identifier validation
import keyword
