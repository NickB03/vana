"""
Continuous Integration Test Runner for VANA Testing Framework

Automated testing infrastructure for CI/CD pipelines including:
- Unit test execution and reporting
- Performance benchmark execution
- Security validation testing
- Integration test orchestration
- Comprehensive test reporting
- Test result aggregation and analysis
"""

import json
import logging
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    """Test execution result with comprehensive metadata."""

    test_type: str
    success: bool
    exit_code: int
    duration: float
    output: str
    error: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert test result to dictionary."""
        return {
            "test_type": self.test_type,
            "success": self.success,
            "exit_code": self.exit_code,
            "duration": self.duration,
            "output": self.output,
            "error": self.error,
            "metadata": self.metadata,
        }


class CIRunner:
    """Automated testing runner for continuous integration."""

    def __init__(self, project_root: Path, timeout: int = 600):
        self.project_root = Path(project_root)
        self.timeout = timeout
        self.results: Dict[str, TestResult] = {}
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None

        # Validate project structure
        if not self.project_root.exists():
            raise ValueError(f"Project root does not exist: {project_root}")

        # Ensure tests directory exists
        self.tests_dir = self.project_root / "tests"
        if not self.tests_dir.exists():
            raise ValueError(f"Tests directory not found: {self.tests_dir}")

    def start_ci_run(self):
        """Start the CI test run."""
        self.start_time = time.time()
        self.results.clear()
        logger.info(f"Starting CI test run in {self.project_root}")

    def end_ci_run(self):
        """End the CI test run."""
        self.end_time = time.time()
        if self.start_time:
            total_duration = self.end_time - self.start_time
            logger.info(f"CI test run completed in {total_duration:.2f} seconds")

    def _run_command(self, command: List[str], test_type: str, cwd: Optional[Path] = None) -> TestResult:
        """Run a command and capture results."""
        if cwd is None:
            cwd = self.project_root

        logger.info(f"Running {test_type}: {' '.join(command)}")
        start_time = time.time()

        try:
            result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=self.timeout)

            end_time = time.time()
            duration = end_time - start_time

            test_result = TestResult(
                test_type=test_type,
                success=result.returncode == 0,
                exit_code=result.returncode,
                duration=duration,
                output=result.stdout,
                error=result.stderr,
                metadata={"command": " ".join(command), "cwd": str(cwd), "timeout": self.timeout},
            )

            if test_result.success:
                logger.info(f"{test_type} completed successfully in {duration:.2f}s")
            else:
                logger.error(f"{test_type} failed with exit code {result.returncode}")
                if result.stderr:
                    logger.error(f"Error output: {result.stderr[:500]}...")

            return test_result

        except subprocess.TimeoutExpired:
            end_time = time.time()
            duration = end_time - start_time

            test_result = TestResult(
                test_type=test_type,
                success=False,
                exit_code=-1,
                duration=duration,
                output="",
                error=f"Test timed out after {self.timeout} seconds",
                metadata={
                    "command": " ".join(command),
                    "cwd": str(cwd),
                    "timeout": self.timeout,
                    "timeout_occurred": True,
                },
            )

            logger.error(f"{test_type} timed out after {self.timeout} seconds")
            return test_result

        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time

            test_result = TestResult(
                test_type=test_type,
                success=False,
                exit_code=-2,
                duration=duration,
                output="",
                error=f"Unexpected error: {str(e)}",
                metadata={"command": " ".join(command), "cwd": str(cwd), "exception": str(e)},
            )

            logger.error(f"{test_type} failed with exception: {e}")
            return test_result

    def run_unit_tests(self) -> TestResult:
        """Run unit tests and return results."""
        command = ["poetry", "run", "pytest", "tests/", "-v", "--tb=short", "--junit-xml=test-results.xml"]
        result = self._run_command(command, "unit_tests")

        # Parse test results if available
        junit_file = self.project_root / "test-results.xml"
        if junit_file.exists():
            try:
                # Basic parsing of test count from output
                if "passed" in result.output:
                    import re

                    match = re.search(r"(\d+) passed", result.output)
                    if match:
                        result.metadata["tests_passed"] = int(match.group(1))

                if "failed" in result.output:
                    match = re.search(r"(\d+) failed", result.output)
                    if match:
                        result.metadata["tests_failed"] = int(match.group(1))

            except Exception as e:
                logger.warning(f"Failed to parse test results: {e}")

        self.results["unit_tests"] = result
        return result

    def run_performance_tests(self) -> TestResult:
        """Run performance benchmarks."""
        command = ["poetry", "run", "pytest", "tests/performance/", "-m", "performance", "-v"]
        result = self._run_command(command, "performance_tests")

        # Extract performance metrics from output
        if result.success and "benchmark" in result.output.lower():
            result.metadata["performance_tests_run"] = True
            # Could parse specific performance metrics here

        self.results["performance_tests"] = result
        return result

    def run_security_tests(self) -> TestResult:
        """Run security validation tests."""
        command = ["poetry", "run", "pytest", "tests/security/", "-m", "security", "-v"]
        result = self._run_command(command, "security_tests")

        # Extract security scan results
        if result.success:
            result.metadata["security_scan_completed"] = True
            # Could parse security violation counts here

        self.results["security_tests"] = result
        return result

    def run_integration_tests(self) -> TestResult:
        """Run integration tests."""
        command = ["poetry", "run", "pytest", "tests/integration/", "-m", "integration", "-v"]
        result = self._run_command(command, "integration_tests")

        # Extract integration test results
        if result.success:
            result.metadata["integration_tests_completed"] = True

        self.results["integration_tests"] = result
        return result

    def run_linting(self) -> TestResult:
        """Run code linting and style checks."""
        # Try multiple linting tools
        linting_commands = [
            (["poetry", "run", "flake8", ".", "--max-line-length=120"], "flake8"),
            (["poetry", "run", "black", "--check", "."], "black"),
            (["poetry", "run", "isort", "--check-only", "."], "isort"),
        ]

        overall_success = True
        combined_output = ""
        combined_error = ""
        total_duration = 0

        for command, tool_name in linting_commands:
            try:
                result = self._run_command(command, f"linting_{tool_name}")
                total_duration += result.duration
                combined_output += f"\n=== {tool_name} ===\n{result.output}"
                combined_error += f"\n=== {tool_name} ===\n{result.error}"

                if not result.success:
                    overall_success = False

            except Exception as e:
                logger.warning(f"Linting tool {tool_name} not available: {e}")
                combined_error += f"\n=== {tool_name} ===\nTool not available: {e}"

        linting_result = TestResult(
            test_type="linting",
            success=overall_success,
            exit_code=0 if overall_success else 1,
            duration=total_duration,
            output=combined_output,
            error=combined_error,
            metadata={"tools_run": [tool for _, tool in linting_commands]},
        )

        self.results["linting"] = linting_result
        return linting_result

    def run_type_checking(self) -> TestResult:
        """Run type checking with mypy."""
        command = ["poetry", "run", "mypy", ".", "--ignore-missing-imports"]
        result = self._run_command(command, "type_checking")

        self.results["type_checking"] = result
        return result

    def run_all_tests(self) -> Dict[str, TestResult]:
        """Run all test suites and return comprehensive results."""
        self.start_ci_run()

        test_suites = [
            ("linting", self.run_linting),
            ("type_checking", self.run_type_checking),
            ("unit_tests", self.run_unit_tests),
            ("security_tests", self.run_security_tests),
            ("performance_tests", self.run_performance_tests),
            ("integration_tests", self.run_integration_tests),
        ]

        for suite_name, suite_function in test_suites:
            try:
                logger.info(f"Starting {suite_name}...")
                suite_function()
                logger.info(f"Completed {suite_name}")
            except Exception as e:
                logger.error(f"Failed to run {suite_name}: {e}")
                # Create a failure result
                self.results[suite_name] = TestResult(
                    test_type=suite_name,
                    success=False,
                    exit_code=-3,
                    duration=0,
                    output="",
                    error=f"Suite execution failed: {str(e)}",
                    metadata={"exception": str(e)},
                )

        self.end_ci_run()
        return self.results

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report."""
        if not self.results:
            return {"error": "No test results available"}

        total_tests = len(self.results)
        successful_tests = sum(1 for result in self.results.values() if result.success)
        failed_tests = total_tests - successful_tests

        total_duration = sum(result.duration for result in self.results.values())

        report = {
            "timestamp": time.time(),
            "project_root": str(self.project_root),
            "summary": {
                "total_test_suites": total_tests,
                "successful_suites": successful_tests,
                "failed_suites": failed_tests,
                "success_rate": successful_tests / total_tests if total_tests > 0 else 0,
                "total_duration": total_duration,
            },
            "test_results": {name: result.to_dict() for name, result in self.results.items()},
            "overall_success": all(result.success for result in self.results.values()),
        }

        # Add CI run timing if available
        if self.start_time and self.end_time:
            report["ci_run_duration"] = self.end_time - self.start_time

        return report

    def save_report(self, filepath: Union[str, Path]):
        """Save test report to JSON file."""
        report = self.generate_report()

        with open(filepath, "w") as f:
            json.dump(report, f, indent=2)

        logger.info(f"Test report saved to {filepath}")

        # Log summary
        summary = report["summary"]
        logger.info(
            f"Test Summary: {summary['successful_suites']}/{summary['total_test_suites']} suites passed "
            f"({summary['success_rate']:.1%} success rate) in {summary['total_duration']:.2f}s"
        )

    def get_exit_code(self) -> int:
        """Get appropriate exit code for CI systems."""
        if not self.results:
            return 1  # No tests run

        return 0 if all(result.success for result in self.results.values()) else 1


def main():
    """Main entry point for CI runner."""
    import argparse

    parser = argparse.ArgumentParser(description="VANA CI Test Runner")
    parser.add_argument("--project-root", type=Path, default=Path.cwd(), help="Project root directory")
    parser.add_argument("--timeout", type=int, default=600, help="Test timeout in seconds")
    parser.add_argument("--output", type=Path, default="ci-test-results.json", help="Output file for test results")
    parser.add_argument(
        "--suite",
        choices=["unit", "performance", "security", "integration", "linting", "typing", "all"],
        default="all",
        help="Test suite to run",
    )

    args = parser.parse_args()

    try:
        runner = CIRunner(args.project_root, args.timeout)

        if args.suite == "all":
            runner.run_all_tests()
        elif args.suite == "unit":
            runner.run_unit_tests()
        elif args.suite == "performance":
            runner.run_performance_tests()
        elif args.suite == "security":
            runner.run_security_tests()
        elif args.suite == "integration":
            runner.run_integration_tests()
        elif args.suite == "linting":
            runner.run_linting()
        elif args.suite == "typing":
            runner.run_type_checking()

        runner.save_report(args.output)
        exit_code = runner.get_exit_code()

        if exit_code == 0:
            logger.info("All tests passed successfully!")
        else:
            logger.error("Some tests failed. Check the report for details.")

        sys.exit(exit_code)

    except Exception as e:
        logger.error(f"CI runner failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
