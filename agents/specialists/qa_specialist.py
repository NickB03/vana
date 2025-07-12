"""
QA Specialist Agent - Testing and Quality Assurance

This specialist focuses on testing strategies, test automation, quality metrics,
and validation approaches.

Tools:
1. Test Coverage Analyzer - Analyzes test coverage metrics
2. Test Generator - Generates test cases from code
3. Performance Tester - Runs performance benchmarks
4. Regression Detector - Identifies potential regressions
5. Test Validator - Validates test quality and completeness
6. Bug Risk Analyzer - Analyzes code for bug-prone patterns
"""

import ast
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool


def analyze_test_coverage(
    project_path: str, test_pattern: str = "test_*.py", include_integration: bool = True
) -> Dict[str, Any]:
    """
    Analyzes test coverage for a project.

    Args:
        project_path: Path to the project root
        test_pattern: Pattern for test files
        include_integration: Whether to include integration tests

    Returns:
        Dictionary containing coverage analysis
    """
    from .qa_analysis_utils import calculate_test_metrics, categorize_test_type, extract_test_patterns

    coverage_data = {
        "total_files": 0,
        "tested_files": 0,
        "total_functions": 0,
        "tested_functions": 0,
        "coverage_percentage": 0,
        "untested_areas": [],
        "test_distribution": {"unit_tests": 0, "integration_tests": 0, "e2e_tests": 0},
    }

    try:
        # Find all Python files
        all_files = []
        test_files = []

        for root, dirs, files in os.walk(project_path):
            # Skip common non-code directories
            dirs[:] = [d for d in dirs if d not in [".git", "__pycache__", ".venv", "venv"]]

            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    all_files.append(filepath)

                    if re.match(test_pattern, file) or "test" in filepath:
                        test_files.append(filepath)

        # Calculate basic metrics
        metrics = calculate_test_metrics(test_files, all_files)
        coverage_data.update(metrics)

        # Analyze test files
        tested_modules = set()
        tested_functions = set()

        for test_file in test_files:
            try:
                with open(test_file, "r") as f:
                    content = f.read()

                # Categorize test type
                test_type = categorize_test_type(test_file, content)
                coverage_data["test_distribution"][f"{test_type}_tests"] += 1

                # Extract patterns
                patterns = extract_test_patterns(content)
                tested_modules.update(patterns["imports"])
                tested_functions.update(patterns["test_functions"])

            except Exception:
                continue

        coverage_data["tested_files"] = len(tested_modules)
        coverage_data["tested_functions"] = len(tested_functions)

        # Find untested areas
        for file in all_files:
            if file not in test_files and not any(module in file for module in tested_modules):
                coverage_data["untested_areas"].append(os.path.relpath(file, project_path))

        return coverage_data

    except Exception as e:
        return {"error": f"Coverage analysis failed: {str(e)}", "coverage_data": coverage_data}


def generate_test_cases(code_path: str, test_type: str = "unit", include_edge_cases: bool = True) -> Dict[str, Any]:
    """
    Generates test cases for given code.

    Args:
        code_path: Path to the code file
        test_type: Type of tests to generate (unit, integration, e2e)
        include_edge_cases: Whether to include edge case tests

    Returns:
        Dictionary containing generated test cases
    """
    test_cases = {"file": code_path, "test_type": test_type, "generated_tests": [], "edge_cases": [], "test_count": 0}

    try:
        with open(code_path, "r") as f:
            content = f.read()

        tree = ast.parse(content)

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                test_case = _generate_function_test_case(node, include_edge_cases)
                test_cases["generated_tests"].append(test_case)
                test_cases["test_count"] += len(test_case["test_scenarios"])

            elif isinstance(node, ast.ClassDef):
                test_case = _generate_class_test_case(node, include_edge_cases)
                test_cases["generated_tests"].append(test_case)
                test_cases["test_count"] += len(test_case["test_scenarios"])

        return test_cases

    except Exception as e:
        return {"error": f"Test generation failed: {str(e)}", "test_cases": test_cases}


def _generate_function_test_case(node: ast.FunctionDef, include_edge_cases: bool) -> Dict[str, Any]:
    """Generate test case for a function."""
    test_case = {"function_name": node.name, "test_name": f"test_{node.name}", "test_scenarios": []}

    # Analyze function parameters
    params = [arg.arg for arg in node.args.args]

    # Generate basic test scenarios
    if not params:
        test_case["test_scenarios"].append(
            {"scenario": "no_params", "description": f"Test {node.name} with no parameters"}
        )
    else:
        test_case["test_scenarios"].append(
            {"scenario": "valid_params", "description": f"Test {node.name} with valid {', '.join(params)}"}
        )

        if include_edge_cases:
            test_case["test_scenarios"].extend(
                [
                    {"scenario": "none_params", "description": f"Test {node.name} with None values"},
                    {"scenario": "empty_params", "description": f"Test {node.name} with empty values"},
                ]
            )

    # Check for return statements
    if any(isinstance(n, ast.Return) for n in ast.walk(node)):
        test_case["test_scenarios"].append(
            {"scenario": "return_value", "description": f"Verify {node.name} return value"}
        )

    # Check for exception handling
    if any(isinstance(n, ast.Try) for n in ast.walk(node)):
        test_case["test_scenarios"].append(
            {"scenario": "exception_handling", "description": f"Test {node.name} exception handling"}
        )

    return test_case


def _generate_class_test_case(node: ast.ClassDef, include_edge_cases: bool) -> Dict[str, Any]:
    """Generate test case for a class."""
    test_case = {
        "class_name": node.name,
        "test_name": f"Test{node.name}",
        "test_scenarios": [
            {"scenario": "initialization", "description": f"Test {node.name} initialization"},
            {"scenario": "methods", "description": f"Test {node.name} methods"},
        ],
    }

    if include_edge_cases:
        test_case["test_scenarios"].append(
            {"scenario": "inheritance", "description": f"Test {node.name} inheritance behavior"}
        )

    return test_case


def run_performance_tests(
    test_suite: str, metrics: List[str] = ["execution_time", "memory_usage", "cpu_usage"], iterations: int = 3
) -> Dict[str, Any]:
    """
    Runs performance tests and benchmarks.

    Args:
        test_suite: Path to test suite or module
        metrics: List of metrics to measure
        iterations: Number of test iterations

    Returns:
        Dictionary containing performance metrics
    """
    import statistics
    import time

    import psutil

    performance_data = {
        "test_suite": test_suite,
        "iterations": iterations,
        "metrics": {},
        "bottlenecks": [],
        "recommendations": [],
    }

    try:
        # Initialize metrics
        for metric in metrics:
            performance_data["metrics"][metric] = {"measurements": [], "average": 0, "min": 0, "max": 0, "std_dev": 0}

        # Simulate performance measurements
        # In a real implementation, this would run actual tests
        for i in range(iterations):
            # Execution time simulation
            if "execution_time" in metrics:
                exec_time = 0.5 + (i * 0.1)  # Simulated time
                performance_data["metrics"]["execution_time"]["measurements"].append(exec_time)

            # Memory usage simulation
            if "memory_usage" in metrics:
                memory = 100 + (i * 10)  # MB
                performance_data["metrics"]["memory_usage"]["measurements"].append(memory)

            # CPU usage simulation
            if "cpu_usage" in metrics:
                cpu = 25 + (i * 5)  # Percentage
                performance_data["metrics"]["cpu_usage"]["measurements"].append(cpu)

        # Calculate statistics
        for metric, data in performance_data["metrics"].items():
            if data["measurements"]:
                data["average"] = statistics.mean(data["measurements"])
                data["min"] = min(data["measurements"])
                data["max"] = max(data["measurements"])
                if len(data["measurements"]) > 1:
                    data["std_dev"] = statistics.stdev(data["measurements"])

        # Identify bottlenecks
        if performance_data["metrics"].get("execution_time", {}).get("average", 0) > 1.0:
            performance_data["bottlenecks"].append(
                {"type": "slow_execution", "severity": "high", "details": "Average execution time exceeds 1 second"}
            )

        if performance_data["metrics"].get("memory_usage", {}).get("max", 0) > 500:
            performance_data["bottlenecks"].append(
                {"type": "high_memory", "severity": "medium", "details": "Peak memory usage exceeds 500MB"}
            )

        # Generate recommendations
        if performance_data["bottlenecks"]:
            performance_data["recommendations"].append("Consider optimizing algorithms for better performance")
            performance_data["recommendations"].append("Profile code to identify specific bottlenecks")
            performance_data["recommendations"].append("Implement caching for frequently accessed data")

        return performance_data

    except Exception as e:
        return {"error": f"Performance testing failed: {str(e)}", "performance_data": performance_data}


def detect_regressions(
    current_results: Dict[str, Any], baseline_results: Optional[Dict[str, Any]] = None, threshold: float = 0.1
) -> Dict[str, Any]:
    """
    Detects potential regressions by comparing test results.

    Args:
        current_results: Current test results
        baseline_results: Baseline results to compare against
        threshold: Regression threshold (10% by default)

    Returns:
        Dictionary containing regression analysis
    """
    regression_report = {
        "regressions_found": False,
        "regression_count": 0,
        "regressions": [],
        "improvements": [],
        "summary": {},
    }

    try:
        # If no baseline, return current state
        if not baseline_results:
            regression_report["summary"] = {
                "status": "no_baseline",
                "message": "No baseline results available for comparison",
            }
            return regression_report

        # Compare test results
        if "test_results" in current_results and "test_results" in baseline_results:
            current_tests = current_results.get("test_results", {})
            baseline_tests = baseline_results.get("test_results", {})

            # Check for failed tests that were passing
            for test_name, current_status in current_tests.items():
                baseline_status = baseline_tests.get(test_name)

                if baseline_status == "passed" and current_status == "failed":
                    regression_report["regressions"].append(
                        {
                            "test": test_name,
                            "type": "test_failure",
                            "baseline": "passed",
                            "current": "failed",
                            "severity": "high",
                        }
                    )
                    regression_report["regression_count"] += 1

        # Compare performance metrics
        if "performance" in current_results and "performance" in baseline_results:
            current_perf = current_results.get("performance", {})
            baseline_perf = baseline_results.get("performance", {})

            for metric, current_value in current_perf.items():
                baseline_value = baseline_perf.get(metric)

                if baseline_value and isinstance(current_value, (int, float)):
                    # Calculate percentage change
                    change = (current_value - baseline_value) / baseline_value

                    if change > threshold:
                        regression_report["regressions"].append(
                            {
                                "metric": metric,
                                "type": "performance_regression",
                                "baseline": baseline_value,
                                "current": current_value,
                                "change_percentage": change * 100,
                                "severity": "medium" if change < 0.25 else "high",
                            }
                        )
                        regression_report["regression_count"] += 1
                    elif change < -threshold:
                        regression_report["improvements"].append(
                            {
                                "metric": metric,
                                "baseline": baseline_value,
                                "current": current_value,
                                "improvement_percentage": abs(change) * 100,
                            }
                        )

        regression_report["regressions_found"] = regression_report["regression_count"] > 0

        # Generate summary
        if regression_report["regressions_found"]:
            regression_report["summary"] = {
                "status": "regressions_detected",
                "message": f"Found {regression_report['regression_count']} regressions",
                "action_required": True,
            }
        else:
            regression_report["summary"] = {
                "status": "no_regressions",
                "message": "No regressions detected",
                "improvements_count": len(regression_report["improvements"]),
            }

        return regression_report

    except Exception as e:
        return {"error": f"Regression detection failed: {str(e)}", "regression_report": regression_report}


def validate_test_quality(
    test_file: str, quality_checks: List[str] = ["assertions", "coverage", "isolation", "naming"]
) -> Dict[str, Any]:
    """
    Validates the quality of test implementations.

    Args:
        test_file: Path to test file
        quality_checks: List of quality aspects to check

    Returns:
        Dictionary containing quality validation results
    """
    from .qa_analysis_utils import check_test_isolation, validate_test_assertions

    quality_report = {
        "test_file": test_file,
        "quality_score": 0,
        "checks_passed": {},
        "issues": [],
        "recommendations": [],
    }

    try:
        with open(test_file, "r") as f:
            content = f.read()

        tree = ast.parse(content)

        # Check assertions
        if "assertions" in quality_checks:
            assertion_results = validate_test_assertions(tree)
            avg_assertions = assertion_results["average_assertions"]
            quality_report["checks_passed"]["assertions"] = avg_assertions >= 1

            if avg_assertions < 1:
                quality_report["issues"].append(
                    {
                        "type": "insufficient_assertions",
                        "details": f"Average {avg_assertions:.1f} assertions per test",
                        "severity": "medium",
                    }
                )

            if assertion_results["tests_without_assertions"]:
                quality_report["issues"].append(
                    {
                        "type": "missing_assertions",
                        "details": f"Tests without assertions: {', '.join(assertion_results['tests_without_assertions'])}",
                        "severity": "high",
                    }
                )

        # Check test isolation
        if "isolation" in quality_checks:
            isolation_results = check_test_isolation(tree, content)
            quality_report["checks_passed"]["isolation"] = isolation_results["properly_isolated"]

            if not isolation_results["properly_isolated"]:
                quality_report["issues"].append(
                    {"type": "poor_isolation", "details": "No setup/teardown or fixtures found", "severity": "low"}
                )

        # Check naming conventions
        if "naming" in quality_checks:
            poor_names = []

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
                    # Check if name is descriptive
                    if len(node.name) < 10 or node.name == "test_":
                        poor_names.append(node.name)

            quality_report["checks_passed"]["naming"] = len(poor_names) == 0

            if poor_names:
                quality_report["issues"].append(
                    {
                        "type": "poor_naming",
                        "details": f"Non-descriptive test names: {', '.join(poor_names)}",
                        "severity": "low",
                    }
                )

        # Calculate quality score
        checks_total = len(quality_checks)
        checks_passed = sum(1 for passed in quality_report["checks_passed"].values() if passed)
        quality_report["quality_score"] = (checks_passed / checks_total * 100) if checks_total > 0 else 0

        # Generate recommendations
        if quality_report["quality_score"] < 80:
            quality_report["recommendations"].append("Improve test quality by addressing identified issues")

        if any(issue["severity"] == "high" for issue in quality_report["issues"]):
            quality_report["recommendations"].append("Priority: Fix high-severity issues first")

        return quality_report

    except Exception as e:
        return {"error": f"Test quality validation failed: {str(e)}", "quality_report": quality_report}


def analyze_bug_risk(
    code_path: str, risk_patterns: List[str] = ["complexity", "dependencies", "error_handling", "concurrency"]
) -> Dict[str, Any]:
    """
    Analyzes code for bug-prone patterns and risk areas.

    Args:
        code_path: Path to code file
        risk_patterns: List of risk patterns to check

    Returns:
        Dictionary containing bug risk analysis
    """
    from .qa_analysis_utils import (
        analyze_concurrency_patterns,
        analyze_dependency_complexity,
        analyze_error_handling_patterns,
        analyze_function_complexity,
        generate_risk_recommendations,
    )

    risk_analysis = {
        "file": code_path,
        "risk_score": 0,
        "high_risk_areas": [],
        "risk_factors": {},
        "recommendations": [],
    }

    try:
        with open(code_path, "r") as f:
            content = f.read()

        tree = ast.parse(content)

        # Analyze complexity
        if "complexity" in risk_patterns:
            complexity_score = 0
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    score, areas = analyze_function_complexity(node)
                    complexity_score += score
                    risk_analysis["high_risk_areas"].extend(areas)
            risk_analysis["risk_factors"]["complexity"] = complexity_score

        # Analyze error handling
        if "error_handling" in risk_patterns:
            score, areas = analyze_error_handling_patterns(tree, content)
            risk_analysis["risk_factors"]["error_handling"] = score
            risk_analysis["high_risk_areas"].extend(areas)

        # Analyze dependencies
        if "dependencies" in risk_patterns:
            count, areas = analyze_dependency_complexity(tree)
            risk_analysis["risk_factors"]["dependencies"] = count
            risk_analysis["high_risk_areas"].extend(areas)

        # Analyze concurrency
        if "concurrency" in risk_patterns:
            score, areas = analyze_concurrency_patterns(content)
            risk_analysis["risk_factors"]["concurrency"] = score
            risk_analysis["high_risk_areas"].extend(areas)

        # Calculate overall risk score
        total_risk = sum(risk_analysis["risk_factors"].values())
        risk_analysis["risk_score"] = min(total_risk, 100)

        # Generate recommendations
        risk_analysis["recommendations"] = generate_risk_recommendations(risk_analysis)

        return risk_analysis

    except Exception as e:
        return {"error": f"Bug risk analysis failed: {str(e)}", "risk_analysis": risk_analysis}


# Create the QA Specialist agent
qa_specialist = LlmAgent(
    name="QASpecialist",
    model="gemini-2.0-flash",
    description="Testing and quality assurance expert",
    instruction="""You are a QA specialist focused on testing strategies and quality assurance.

Your responsibilities:
1. Analyze test coverage and identify gaps
2. Generate comprehensive test cases
3. Run performance tests and identify bottlenecks
4. Detect regressions between versions
5. Validate test quality and best practices
6. Analyze code for bug-prone patterns

Use your tools to provide thorough quality analysis and actionable recommendations.""",
    tools=[
        FunctionTool(analyze_test_coverage),
        FunctionTool(generate_test_cases),
        FunctionTool(run_performance_tests),
        FunctionTool(detect_regressions),
        FunctionTool(validate_test_quality),
        FunctionTool(analyze_bug_risk),
    ],
)


# Standalone function for backwards compatibility
def analyze_testing_strategy(query: str) -> str:
    """Legacy function for testing strategy analysis."""
    return f"QA Analysis for: {query}"


# Export all components
__all__ = [
    "qa_specialist",
    "analyze_test_coverage",
    "generate_test_cases",
    "run_performance_tests",
    "detect_regressions",
    "validate_test_quality",
    "analyze_bug_risk",
    "analyze_testing_strategy",
]
