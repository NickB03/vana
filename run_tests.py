#!/usr/bin/env python
"""
Script to run all tests and verify coverage.
"""

import os
import sys
import unittest
import coverage

def run_tests_with_coverage():
    """Run all tests with coverage."""
    # Start coverage
    cov = coverage.Coverage(
        source=[
            "adk-setup/vana/context",
            "adk-setup/vana/adk_integration",
            "adk-setup/vana/orchestration"
        ],
        omit=["*/__init__.py", "*/tests/*"]
    )
    cov.start()

    # Discover and run tests
    loader = unittest.TestLoader()
    tests = loader.discover("tests")
    test_runner = unittest.TextTestRunner(verbosity=2)
    result = test_runner.run(tests)

    # Stop coverage
    cov.stop()
    cov.save()

    # Print coverage report
    print("\nCoverage Report:")
    cov.report()

    # Generate HTML report
    cov.html_report(directory="coverage_html")
    print(f"\nHTML coverage report generated in: {os.path.abspath('coverage_html')}")

    # Return test result
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_tests_with_coverage()
    sys.exit(0 if success else 1)
