"""
QA Analysis Utilities - Extracted common functions for QA specialist

This module contains utility functions extracted from qa_specialist.py
to improve code organization and reduce function complexity.
"""

import ast
from typing import Any, Dict, List, Optional, Tuple


def analyze_function_complexity(node: ast.FunctionDef) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Analyze complexity of a single function.

    Args:
        node: AST FunctionDef node

    Returns:
        Tuple of (complexity_score, high_risk_areas)
    """
    decision_points = sum(1 for n in ast.walk(node) if isinstance(n, (ast.If, ast.While, ast.For)))
    high_risk_areas = []

    if decision_points > 5:
        high_risk_areas.append(
            {
                "function": node.name,
                "risk_type": "high_complexity",
                "score": decision_points,
                "details": f"Cyclomatic complexity: {decision_points}",
            }
        )

    return decision_points, high_risk_areas


def analyze_error_handling_patterns(tree: ast.AST, content: str) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Analyze error handling patterns in code.

    Args:
        tree: AST tree of the code
        content: Raw code content

    Returns:
        Tuple of (risk_score, high_risk_areas)
    """
    bare_excepts = 0
    missing_error_handling = 0
    high_risk_areas = []

    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            if node.type is None:  # bare except
                bare_excepts += 1
                high_risk_areas.append(
                    {
                        "line": node.lineno if hasattr(node, "lineno") else "unknown",
                        "risk_type": "bare_except",
                        "score": 5,
                        "details": "Bare except clause found",
                    }
                )

        # Check for risky operations without try/except
        if isinstance(node, ast.Call):
            if hasattr(node.func, "id") and node.func.id in ["open", "requests.get", "json.loads"]:
                # Simplified check - in real implementation would check AST parent chain
                if "try:" not in content:  # Simplified check
                    missing_error_handling += 1

    return bare_excepts + missing_error_handling, high_risk_areas


def analyze_dependency_complexity(tree: ast.AST) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Analyze dependency complexity and external dependencies.

    Args:
        tree: AST tree of the code

    Returns:
        Tuple of (dependency_count, high_risk_areas)
    """
    external_deps = set()
    high_risk_areas = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                external_deps.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                external_deps.add(node.module)

    dependency_count = len(external_deps)
    if dependency_count > 10:
        high_risk_areas.append(
            {
                "risk_type": "high_dependencies",
                "score": dependency_count,
                "details": f"High number of dependencies: {dependency_count}",
            }
        )

    return dependency_count, high_risk_areas


def analyze_concurrency_patterns(content: str) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Analyze concurrency patterns and risks.

    Args:
        content: Raw code content

    Returns:
        Tuple of (concurrency_score, high_risk_areas)
    """
    concurrency_patterns = ["threading", "multiprocessing", "asyncio", "async def"]
    concurrency_score = 0
    high_risk_areas = []

    for pattern in concurrency_patterns:
        if pattern in content:
            concurrency_score += 5
            high_risk_areas.append(
                {
                    "risk_type": "concurrency",
                    "pattern": pattern,
                    "score": 5,
                    "details": f"Concurrency pattern detected: {pattern}",
                }
            )

    return concurrency_score, high_risk_areas


def generate_risk_recommendations(risk_analysis: Dict[str, Any]) -> List[str]:
    """
    Generate recommendations based on risk analysis.

    Args:
        risk_analysis: Risk analysis results

    Returns:
        List of recommendations
    """
    recommendations = []

    if risk_analysis["risk_score"] > 50:
        recommendations.append("High bug risk detected - increase test coverage")

    if risk_analysis["risk_factors"].get("complexity", 0) > 20:
        recommendations.append("Refactor complex functions to reduce bug risk")

    if risk_analysis["risk_factors"].get("error_handling", 0) > 0:
        recommendations.append("Improve error handling to prevent runtime failures")

    if risk_analysis["risk_factors"].get("concurrency", 0) > 0:
        recommendations.append("Add thread-safety tests for concurrent code")

    if risk_analysis["risk_factors"].get("dependencies", 0) > 15:
        recommendations.append("Consider reducing external dependencies")

    return recommendations


def calculate_test_metrics(test_files: List[str], all_files: List[str]) -> Dict[str, Any]:
    """
    Calculate test coverage metrics.

    Args:
        test_files: List of test file paths
        all_files: List of all file paths

    Returns:
        Dictionary of metrics
    """
    metrics = {"total_files": len(all_files) - len(test_files), "test_files": len(test_files), "coverage_percentage": 0}

    if metrics["total_files"] > 0:
        metrics["coverage_percentage"] = metrics["test_files"] / metrics["total_files"] * 100

    return metrics


def categorize_test_type(test_file: str, content: str) -> str:
    """
    Categorize test type based on file path and content.

    Args:
        test_file: Path to test file
        content: File content

    Returns:
        Test type (unit, integration, e2e)
    """
    if "unit" in test_file or "@pytest.mark.unit" in content:
        return "unit"
    elif "integration" in test_file or "@pytest.mark.integration" in content:
        return "integration"
    elif "e2e" in test_file or "@pytest.mark.e2e" in content:
        return "e2e"
    else:
        return "unit"  # Default


def extract_test_patterns(content: str) -> Dict[str, Any]:
    """
    Extract test patterns from test file content.

    Args:
        content: Test file content

    Returns:
        Dictionary of extracted patterns
    """
    import re

    patterns = {
        "imports": re.findall(r"from\s+([\w.]+)\s+import", content),
        "test_functions": re.findall(r"def\s+test_(\w+)", content),
        "fixtures": re.findall(r"@pytest\.fixture", content),
        "markers": re.findall(r"@pytest\.mark\.(\w+)", content),
    }

    return patterns


def validate_test_assertions(tree: ast.AST) -> Dict[str, Any]:
    """
    Validate test assertions in test file.

    Args:
        tree: AST tree of test file

    Returns:
        Validation results
    """
    assertion_count = 0
    test_count = 0
    tests_without_assertions = []

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
            test_count += 1
            test_assertions = 0

            # Count assertions in this test
            for child in ast.walk(node):
                if isinstance(child, ast.Assert) or (
                    isinstance(child, ast.Call)
                    and hasattr(child.func, "attr")
                    and child.func.attr in ["assertEqual", "assertTrue", "assertFalse", "assert_called"]
                ):
                    test_assertions += 1

            if test_assertions == 0:
                tests_without_assertions.append(node.name)
            assertion_count += test_assertions

    return {
        "total_assertions": assertion_count,
        "total_tests": test_count,
        "average_assertions": assertion_count / test_count if test_count > 0 else 0,
        "tests_without_assertions": tests_without_assertions,
    }


def check_test_isolation(tree: ast.AST, content: str) -> Dict[str, Any]:
    """
    Check test isolation practices.

    Args:
        tree: AST tree of test file
        content: File content

    Returns:
        Isolation check results
    """
    setup_methods = ["setUp", "setup_method", "setup", "setup_class"]
    teardown_methods = ["tearDown", "teardown_method", "teardown", "teardown_class"]

    has_setup = any(node.name in setup_methods for node in ast.walk(tree) if isinstance(node, ast.FunctionDef))

    has_teardown = any(node.name in teardown_methods for node in ast.walk(tree) if isinstance(node, ast.FunctionDef))

    has_fixtures = "@pytest.fixture" in content
    has_class_fixtures = '@pytest.fixture(scope="class")' in content

    return {
        "has_setup": has_setup,
        "has_teardown": has_teardown,
        "has_fixtures": has_fixtures,
        "has_class_fixtures": has_class_fixtures,
        "properly_isolated": has_setup or has_fixtures,
    }


# Export utilities
__all__ = [
    "analyze_function_complexity",
    "analyze_error_handling_patterns",
    "analyze_dependency_complexity",
    "analyze_concurrency_patterns",
    "generate_risk_recommendations",
    "calculate_test_metrics",
    "categorize_test_type",
    "extract_test_patterns",
    "validate_test_assertions",
    "check_test_isolation",
]
