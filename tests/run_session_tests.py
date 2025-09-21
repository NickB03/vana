#!/usr/bin/env python3
"""
Test runner for session management unit tests.

This script provides various test execution modes:
- Run all session tests
- Run specific test categories
- Generate coverage reports
- Performance testing mode
- CI/CD integration mode
"""

import argparse
import subprocess
import sys
from pathlib import Path


def run_command(cmd, capture_output=False):
    """Run a command and handle errors."""
    print(f"Running: {' '.join(cmd)}")

    if capture_output:
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    else:
        return subprocess.run(cmd).returncode


def run_session_tests(args):
    """Run session management tests based on arguments."""

    # Base pytest command
    pytest_cmd = ["python", "-m", "pytest"]

    # Test directory
    test_dir = Path(__file__).parent / "unit"

    if args.specific_file:
        # Run specific test file
        test_path = test_dir / args.specific_file
        if not test_path.exists():
            print(f"Error: Test file {test_path} not found")
            return 1
        pytest_cmd.append(str(test_path))
    else:
        # Run all session tests
        session_test_files = [
            "test_session_store.py",
            "test_session_api_endpoints.py",
            "test_session_backup.py",
            "test_session_integration.py",
        ]

        for test_file in session_test_files:
            test_path = test_dir / test_file
            if test_path.exists():
                pytest_cmd.append(str(test_path))

    # Add markers based on test category
    if args.category:
        pytest_cmd.extend(["-m", args.category])

    # Verbosity
    if args.verbose:
        pytest_cmd.append("-v")
    elif args.quiet:
        pytest_cmd.append("-q")
    else:
        pytest_cmd.append("-v")  # Default to verbose

    # Coverage options
    if args.coverage:
        pytest_cmd.extend(
            [
                "--cov=app.utils.session_store",
                "--cov=app.utils.session_backup",
                "--cov-report=html:tests/coverage_html",
                "--cov-report=term-missing",
                "--cov-fail-under=85",
            ]
        )

    # Performance testing
    if args.performance:
        pytest_cmd.extend(["-m", "performance or thread_safety"])
        pytest_cmd.append("--durations=10")

    # Parallel execution
    if args.parallel and args.parallel > 1:
        pytest_cmd.extend(["-n", str(args.parallel)])

    # Output options
    if args.junit_xml:
        pytest_cmd.extend(["--junit-xml", args.junit_xml])

    # Additional pytest options
    if args.pytest_args:
        pytest_cmd.extend(args.pytest_args.split())

    return run_command(pytest_cmd)


def check_dependencies():
    """Check that required dependencies are installed."""
    required_packages = [
        "pytest",
        "pytest-asyncio",
        "pytest-cov",
        "fastapi",
        "httpx",  # for TestClient
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing.append(package)

    if missing:
        print("Missing required packages:")
        for package in missing:
            print(f"  - {package}")
        print("\nInstall with: pip install " + " ".join(missing))
        return False

    return True


def generate_test_report():
    """Generate comprehensive test report."""
    print("Generating comprehensive test report...")

    # Run tests with coverage and XML output
    test_dir = Path(__file__).parent / "unit"

    cmd = [
        "python",
        "-m",
        "pytest",
        str(test_dir / "test_session_store.py"),
        str(test_dir / "test_session_api_endpoints.py"),
        str(test_dir / "test_session_backup.py"),
        str(test_dir / "test_session_integration.py"),
        "--cov=app.utils.session_store",
        "--cov=app.utils.session_backup",
        "--cov-report=html:tests/session_coverage_html",
        "--cov-report=xml:tests/session_coverage.xml",
        "--cov-report=term-missing",
        "--junit-xml=tests/session_test_results.xml",
        "-v",
        "--tb=short",
    ]

    return_code = run_command(cmd)

    if return_code == 0:
        print("\n✅ Test report generated successfully!")
        print("📊 Coverage report: tests/session_coverage_html/index.html")
        print("📄 JUnit XML: tests/session_test_results.xml")
    else:
        print("\n❌ Test execution failed!")

    return return_code


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(
        description="Run session management unit tests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Run all session tests
  %(prog)s --category unit                    # Run only unit tests
  %(prog)s --category thread_safety           # Run thread safety tests
  %(prog)s --specific-file test_session_store.py  # Run specific test file
  %(prog)s --coverage                         # Run with coverage report
  %(prog)s --performance                      # Run performance tests
  %(prog)s --parallel 4                       # Run tests in parallel
  %(prog)s --report                           # Generate comprehensive report
        """,
    )

    parser.add_argument(
        "--category",
        "-c",
        choices=[
            "unit",
            "api",
            "backup",
            "integration",
            "thread_safety",
            "performance",
        ],
        help="Run tests by category",
    )

    parser.add_argument(
        "--specific-file",
        "-f",
        help="Run specific test file (e.g., test_session_store.py)",
    )

    parser.add_argument(
        "--coverage", action="store_true", help="Generate coverage report"
    )

    parser.add_argument(
        "--performance",
        "-p",
        action="store_true",
        help="Run performance and thread safety tests",
    )

    parser.add_argument(
        "--parallel",
        "-n",
        type=int,
        help="Run tests in parallel (requires pytest-xdist)",
    )

    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    parser.add_argument("--quiet", "-q", action="store_true", help="Quiet output")

    parser.add_argument("--junit-xml", help="Generate JUnit XML report")

    parser.add_argument("--pytest-args", help="Additional pytest arguments (as string)")

    parser.add_argument(
        "--report", action="store_true", help="Generate comprehensive test report"
    )

    parser.add_argument(
        "--check-deps", action="store_true", help="Check required dependencies"
    )

    args = parser.parse_args()

    # Check dependencies if requested
    if args.check_deps:
        if check_dependencies():
            print("✅ All dependencies are installed")
            return 0
        else:
            return 1

    # Check dependencies before running tests
    if not check_dependencies():
        return 1

    # Generate comprehensive report
    if args.report:
        return generate_test_report()

    # Run tests
    print("🧪 Running session management unit tests...")
    print("=" * 60)

    return_code = run_session_tests(args)

    if return_code == 0:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed!")

    return return_code


if __name__ == "__main__":
    sys.exit(main())
