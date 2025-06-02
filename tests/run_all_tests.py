#!/usr/bin/env python
"""
Script to run all tests for the VANA project.

This script discovers and runs all tests in the tests directory.
It can be run with or without coverage reporting.

Usage:
    python tests/run_all_tests.py [--coverage]
"""

import argparse
import os
import sys
import unittest


def run_tests(with_coverage=False):
    """
    Run all tests in the tests directory.

    Args:
        with_coverage: Whether to run tests with coverage reporting

    Returns:
        True if all tests pass, False otherwise
    """
    if with_coverage:
        try:
            import coverage
        except ImportError:
            print("Coverage package not installed. Run 'pip install coverage' first.")
            return False

        # Start coverage
        cov = coverage.Coverage(
            source=["adk-setup/vana/context", "adk-setup/vana/adk_integration"],
            omit=["*/__init__.py", "*/tests/*"],
        )
        cov.start()

    # Discover and run tests
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(os.path.abspath(__file__))
    suite = loader.discover(start_dir)

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if with_coverage:
        # Stop coverage
        cov.stop()
        cov.save()

        # Print coverage report
        print("\nCoverage Report:")
        cov.report()

        # Generate HTML report
        html_dir = os.path.join(os.path.dirname(start_dir), "coverage_html")
        cov.html_report(directory=html_dir)
        print(f"\nHTML coverage report generated in: {os.path.abspath(html_dir)}")

    return result.wasSuccessful()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run VANA tests")
    parser.add_argument(
        "--coverage", action="store_true", help="Run tests with coverage reporting"
    )
    args = parser.parse_args()

    success = run_tests(with_coverage=args.coverage)
    sys.exit(0 if success else 1)
