#!/usr/bin/env python3
"""
Comprehensive test runner for sandbox components.
"""

import subprocess
import sys
import time
from pathlib import Path

from lib.logging_config import get_logger

logger = get_logger("vana.run_sandbox_tests")


def run_command(command, description):
    """Run a command and return success status."""
    logger.debug("%s", f"\n{'='*60}")
    logger.debug(f"Running: {description}")
    logger.debug("%s", f"Command: {' '.join(command)}")
    logger.debug("%s", f"{'='*60}")

    start_time = time.time()

    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        duration = time.time() - start_time

        logger.info(f"✅ SUCCESS ({duration:.2f}s)")
        if result.stdout:
            logger.debug("STDOUT:")
            logger.info("%s", result.stdout)

        return True

    except subprocess.CalledProcessError as e:
        duration = time.time() - start_time

        logger.error(f"❌ FAILED ({duration:.2f}s)")
        logger.debug(f"Exit code: {e.returncode}")

        if e.stdout:
            logger.debug("STDOUT:")
            logger.debug("%s", e.stdout)

        if e.stderr:
            logger.debug("STDERR:")
            logger.debug("%s", e.stderr)

        return False


def main():
    """Run comprehensive sandbox tests."""
    logger.info("🚀 Starting Sandbox Infrastructure Test Suite")
    logger.debug(f"Python version: {sys.version}")

    # Change to project root
    project_root = Path(__file__).parent.parent.parent
    logger.debug(f"Project root: {project_root}")

    # Test commands to run
    test_commands = [
        # Unit tests for individual components
        (
            ["python", "-m", "pytest", "tests/sandbox/test_security_manager.py", "-v", "--tb=short"],
            "Security Manager Unit Tests",
        ),
        (
            ["python", "-m", "pytest", "tests/sandbox/test_resource_monitor.py", "-v", "--tb=short"],
            "Resource Monitor Unit Tests",
        ),
        (
            ["python", "-m", "pytest", "tests/sandbox/test_execution_engine.py", "-v", "--tb=short"],
            "Execution Engine Unit Tests",
        ),
        # Integration tests
        (
            ["python", "-m", "pytest", "tests/sandbox/test_docker_integration.py", "-v", "--tb=short"],
            "Docker Integration Tests (may skip if Docker unavailable)",
        ),
        # Performance tests
        (
            ["python", "-m", "pytest", "tests/sandbox/test_performance.py", "-v", "--tb=short", "-s"],
            "Performance Tests",
        ),
        # Coverage report
        (
            [
                "python",
                "-m",
                "pytest",
                "tests/sandbox/",
                "--cov=lib.sandbox",
                "--cov-report=term-missing",
                "--cov-report=html",
            ],
            "Test Coverage Report",
        ),
        # All sandbox tests together
        (["python", "-m", "pytest", "tests/sandbox/", "-v", "--tb=short"], "All Sandbox Tests"),
    ]

    # Track results
    results = []

    # Run each test command
    for command, description in test_commands:
        success = run_command(command, description)
        results.append((description, success))

    # Summary
    logger.debug("%s", f"\n{'='*60}")
    logger.debug("TEST SUMMARY")
    logger.debug("%s", f"{'='*60}")

    passed = sum(1 for _, success in results if success)
    total = len(results)

    for description, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        logger.debug(f"{status} {description}")

    logger.debug(f"\nOverall: {passed}/{total} test suites passed")

    if passed == total:
        logger.debug("🎉 All tests passed! Sandbox infrastructure is ready.")
        return 0
    else:
        logger.error("⚠️  Some tests failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
