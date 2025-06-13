"""
Package Management Tool

Manages packages and dependencies in the sandbox environment.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


async def manage_packages_tool(
    action: str, language: str, packages: Optional[List[str]] = None, package_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Manage packages and dependencies in the sandbox environment.

    Args:
        action: Action to perform (list, info, check, install_info)
        language: Programming language (python, javascript, shell)
        packages: List of packages for batch operations
        package_name: Single package name for specific operations

    Returns:
        Package management result with information and status
    """
    try:
        if action == "list":
            return await _list_available_packages(language)
        elif action == "info":
            if not package_name:
                return {"error": "package_name required for info action"}
            return await _get_package_info(language, package_name)
        elif action == "check":
            if packages:
                return await _check_packages_batch(language, packages)
            elif package_name:
                return await _check_package_availability(language, package_name)
            else:
                return {"error": "packages or package_name required for check action"}
        elif action == "install_info":
            return await _get_installation_info(language)
        else:
            return {"error": f"Unknown action: {action}"}

    except Exception as e:
        logger.error(f"Package management failed: {str(e)}")
        return {"error": f"Package management failed: {str(e)}", "action": action, "language": language}


async def _list_available_packages(language: str) -> Dict[str, Any]:
    """List packages available in the sandbox environment."""

    package_info = {
        "python": {
            "standard_library": [
                "os",
                "sys",
                "json",
                "re",
                "math",
                "random",
                "datetime",
                "time",
                "collections",
                "itertools",
                "functools",
                "operator",
                "pathlib",
                "urllib",
                "http",
                "email",
                "csv",
                "sqlite3",
                "logging",
                "unittest",
            ],
            "data_science": ["numpy", "pandas", "matplotlib", "seaborn", "scipy", "scikit-learn"],
            "web_development": ["requests", "flask", "fastapi", "aiohttp"],
            "utilities": ["pyyaml", "python-dotenv", "click", "tqdm", "pillow"],
            "restricted": ["subprocess", "socket", "multiprocessing", "threading"],
        },
        "javascript": {
            "core_modules": [
                "fs",
                "path",
                "os",
                "util",
                "events",
                "stream",
                "buffer",
                "crypto",
                "url",
                "querystring",
                "assert",
            ],
            "utilities": ["lodash", "moment", "axios", "uuid", "chalk", "commander"],
            "development": ["jest", "mocha", "chai", "sinon", "eslint", "prettier"],
            "restricted": ["child_process", "cluster", "net", "http", "https"],
        },
        "shell": {
            "basic_commands": [
                "ls",
                "cd",
                "pwd",
                "mkdir",
                "rmdir",
                "rm",
                "cp",
                "mv",
                "cat",
                "head",
                "tail",
                "grep",
                "sed",
                "awk",
                "sort",
                "uniq",
            ],
            "text_processing": ["cut", "tr", "wc", "diff", "comm", "join", "paste"],
            "file_operations": ["find", "locate", "which", "file", "stat", "touch", "chmod"],
            "restricted": [
                "sudo",
                "su",
                "passwd",
                "mount",
                "umount",
                "systemctl",
                "service",
                "crontab",
                "at",
                "nohup",
                "screen",
                "tmux",
            ],
        },
    }

    if language not in package_info:
        return {"error": f"Unsupported language: {language}", "supported_languages": list(package_info.keys())}

    lang_packages = package_info[language]

    return {
        "language": language,
        "available_packages": lang_packages,
        "total_available": sum(len(category) for category in lang_packages.values() if category != "restricted"),
        "restricted_packages": lang_packages.get("restricted", []),
        "package_categories": list(lang_packages.keys()),
    }


async def _get_package_info(language: str, package_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific package."""

    # Package information database
    package_details = {
        "python": {
            "numpy": {
                "description": "Fundamental package for scientific computing with Python",
                "version": "1.24+",
                "category": "data_science",
                "capabilities": ["arrays", "linear algebra", "random numbers", "FFT"],
                "common_imports": ["import numpy as np"],
                "example_usage": "np.array([1, 2, 3])",
            },
            "pandas": {
                "description": "Data manipulation and analysis library",
                "version": "2.0+",
                "category": "data_science",
                "capabilities": ["dataframes", "data analysis", "CSV/JSON handling"],
                "common_imports": ["import pandas as pd"],
                "example_usage": "pd.DataFrame({'A': [1, 2, 3]})",
            },
            "requests": {
                "description": "HTTP library for Python",
                "version": "2.28+",
                "category": "web_development",
                "capabilities": ["HTTP requests", "REST API calls", "web scraping"],
                "common_imports": ["import requests"],
                "example_usage": "requests.get('https://api.example.com')",
                "security_note": "Network access may be restricted in sandbox",
            },
            "json": {
                "description": "JSON encoder and decoder",
                "version": "built-in",
                "category": "standard_library",
                "capabilities": ["JSON parsing", "JSON serialization"],
                "common_imports": ["import json"],
                "example_usage": 'json.loads(\'{"key": "value"}\')',
            },
        },
        "javascript": {
            "lodash": {
                "description": "Utility library for JavaScript",
                "version": "4.17+",
                "category": "utilities",
                "capabilities": ["array manipulation", "object utilities", "functional programming"],
                "common_imports": ["const _ = require('lodash')"],
                "example_usage": "_.chunk([1, 2, 3, 4], 2)",
            },
            "moment": {
                "description": "Date manipulation library",
                "version": "2.29+",
                "category": "utilities",
                "capabilities": ["date parsing", "formatting", "timezone handling"],
                "common_imports": ["const moment = require('moment')"],
                "example_usage": "moment().format('YYYY-MM-DD')",
            },
            "fs": {
                "description": "File system operations",
                "version": "built-in",
                "category": "core_modules",
                "capabilities": ["file reading", "file writing", "directory operations"],
                "common_imports": ["const fs = require('fs')"],
                "example_usage": "fs.readFileSync('file.txt', 'utf8')",
                "security_note": "File access limited to workspace directory",
            },
        },
        "shell": {
            "grep": {
                "description": "Search text patterns in files",
                "version": "GNU grep",
                "category": "text_processing",
                "capabilities": ["pattern matching", "regular expressions", "file searching"],
                "example_usage": "grep 'pattern' file.txt",
                "common_options": ["-i (ignore case)", "-r (recursive)", "-n (line numbers)"],
            },
            "awk": {
                "description": "Text processing and pattern scanning",
                "version": "GNU awk",
                "category": "text_processing",
                "capabilities": ["field processing", "calculations", "report generation"],
                "example_usage": "awk '{print $1}' file.txt",
                "common_patterns": ["field extraction", "sum calculations", "conditional processing"],
            },
            "sed": {
                "description": "Stream editor for filtering and transforming text",
                "version": "GNU sed",
                "category": "text_processing",
                "capabilities": ["text substitution", "line deletion", "text insertion"],
                "example_usage": "sed 's/old/new/g' file.txt",
                "common_operations": ["substitution", "deletion", "insertion"],
            },
        },
    }

    if language not in package_details:
        return {"error": f"No package information available for language: {language}", "package_name": package_name}

    lang_packages = package_details[language]

    if package_name not in lang_packages:
        # Check if it's a restricted package
        restricted_info = await _check_restricted_package(language, package_name)
        if restricted_info:
            return restricted_info

        return {
            "error": f"Package '{package_name}' not found",
            "package_name": package_name,
            "language": language,
            "suggestion": "Use 'list' action to see available packages",
        }

    package_info = lang_packages[package_name]
    package_info["package_name"] = package_name
    package_info["language"] = language
    package_info["available"] = True

    return package_info


async def _check_package_availability(language: str, package_name: str) -> Dict[str, Any]:
    """Check if a specific package is available."""

    # Get available packages
    available_packages = await _list_available_packages(language)

    if "error" in available_packages:
        return available_packages

    # Check in all categories
    is_available = False
    category = None
    is_restricted = False

    for cat, packages in available_packages["available_packages"].items():
        if package_name in packages:
            is_available = True
            category = cat
            if cat == "restricted":
                is_restricted = True
            break

    result = {
        "package_name": package_name,
        "language": language,
        "available": is_available,
        "restricted": is_restricted,
    }

    if is_available:
        result["category"] = category
        if is_restricted:
            result["message"] = f"Package '{package_name}' is restricted in sandbox environment"
            result["alternatives"] = await _get_package_alternatives(language, package_name)
        else:
            result["message"] = f"Package '{package_name}' is available"
    else:
        result["message"] = f"Package '{package_name}' is not available"
        result["suggestions"] = await _get_package_suggestions(language, package_name)

    return result


async def _check_packages_batch(language: str, packages: List[str]) -> Dict[str, Any]:
    """Check availability of multiple packages."""

    results = []

    for package in packages:
        result = await _check_package_availability(language, package)
        results.append(result)

    # Summary statistics
    total_packages = len(packages)
    available_packages = sum(1 for r in results if r.get("available", False))
    restricted_packages = sum(1 for r in results if r.get("restricted", False))

    return {
        "language": language,
        "total_checked": total_packages,
        "available": available_packages,
        "restricted": restricted_packages,
        "unavailable": total_packages - available_packages,
        "results": results,
        "summary": {
            "availability_rate": round(available_packages / total_packages * 100, 1) if total_packages > 0 else 0,
            "restriction_rate": round(restricted_packages / total_packages * 100, 1) if total_packages > 0 else 0,
        },
    }


async def _get_installation_info(language: str) -> Dict[str, Any]:
    """Get information about package installation in sandbox."""

    installation_info = {
        "python": {
            "package_manager": "pip",
            "sandbox_policy": "Pre-installed packages only",
            "installation_allowed": False,
            "reason": "Security restrictions prevent dynamic package installation",
            "alternatives": [
                "Use pre-installed packages from the available list",
                "Request specific packages for sandbox environment",
                "Use standard library modules when possible",
            ],
            "pre_installation_process": "Packages are installed during container build time",
        },
        "javascript": {
            "package_manager": "npm",
            "sandbox_policy": "Pre-installed packages only",
            "installation_allowed": False,
            "reason": "Security restrictions prevent dynamic package installation",
            "alternatives": [
                "Use pre-installed packages from the available list",
                "Use built-in Node.js modules",
                "Request specific packages for sandbox environment",
            ],
            "pre_installation_process": "Packages are installed during container build time",
        },
        "shell": {
            "package_manager": "apt/yum (system level)",
            "sandbox_policy": "Pre-installed commands only",
            "installation_allowed": False,
            "reason": "Security restrictions prevent system package installation",
            "alternatives": [
                "Use available shell commands and utilities",
                "Combine existing commands for complex operations",
                "Use built-in shell features and functions",
            ],
            "pre_installation_process": "Commands are installed during container build time",
        },
    }

    if language not in installation_info:
        return {"error": f"Installation information not available for language: {language}"}

    info = installation_info[language]
    info["language"] = language

    return info


async def _check_restricted_package(language: str, package_name: str) -> Optional[Dict[str, Any]]:
    """Check if package is restricted and provide information."""

    restricted_info = {
        "python": {
            "subprocess": {
                "reason": "Security risk - can execute system commands",
                "alternatives": ["Use sandbox execution tools", "Use built-in functions"],
                "security_impact": "High - could compromise sandbox security",
            },
            "socket": {
                "reason": "Network access restricted in sandbox",
                "alternatives": ["Use requests library for HTTP", "Use provided web tools"],
                "security_impact": "Medium - could bypass network restrictions",
            },
        },
        "javascript": {
            "child_process": {
                "reason": "Security risk - can execute system commands",
                "alternatives": ["Use sandbox execution tools", "Use built-in functions"],
                "security_impact": "High - could compromise sandbox security",
            }
        },
        "shell": {
            "sudo": {
                "reason": "Privilege escalation not allowed",
                "alternatives": ["Use available commands without sudo"],
                "security_impact": "Critical - could compromise entire system",
            }
        },
    }

    lang_restricted = restricted_info.get(language, {})

    if package_name in lang_restricted:
        info = lang_restricted[package_name]
        return {
            "package_name": package_name,
            "language": language,
            "available": False,
            "restricted": True,
            "restriction_reason": info["reason"],
            "alternatives": info["alternatives"],
            "security_impact": info["security_impact"],
        }

    return None


async def _get_package_alternatives(language: str, package_name: str) -> List[str]:
    """Get alternative packages for restricted ones."""

    alternatives = {
        "python": {
            "subprocess": ["os.system (limited)", "built-in functions"],
            "socket": ["requests", "urllib", "http.client"],
            "multiprocessing": ["threading (limited)", "asyncio"],
        },
        "javascript": {
            "child_process": ["built-in functions", "sandbox tools"],
            "cluster": ["worker_threads (if available)"],
            "net": ["http module for web requests"],
        },
        "shell": {
            "sudo": ["available commands without privileges"],
            "systemctl": ["manual service management"],
            "mount": ["work within existing filesystem"],
        },
    }

    return alternatives.get(language, {}).get(package_name, ["Check available packages for alternatives"])


async def _get_package_suggestions(language: str, package_name: str) -> List[str]:
    """Get suggestions for unavailable packages."""

    suggestions = [
        f"Check spelling of '{package_name}'",
        "Use 'list' action to see all available packages",
        "Consider using standard library alternatives",
        "Check if the package is available under a different name",
    ]

    # Language-specific suggestions
    if language == "python":
        suggestions.extend(
            [
                "Try using built-in modules like json, os, sys",
                "Consider numpy/pandas for data operations",
                "Use requests for HTTP operations",
            ]
        )
    elif language == "javascript":
        suggestions.extend(
            [
                "Try using built-in Node.js modules",
                "Consider lodash for utility functions",
                "Use fs module for file operations",
            ]
        )
    elif language == "shell":
        suggestions.extend(
            [
                "Try combining basic commands",
                "Use grep, sed, awk for text processing",
                "Check if command is available with 'which command'",
            ]
        )

    return suggestions
