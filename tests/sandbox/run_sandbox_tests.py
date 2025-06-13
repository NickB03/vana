#!/usr/bin/env python3
"""
Comprehensive test runner for sandbox components.
"""

import sys
import subprocess
import time
from pathlib import Path


def run_command(command, description):
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        duration = time.time() - start_time
        
        print(f"✅ SUCCESS ({duration:.2f}s)")
        if result.stdout:
            print("STDOUT:")
            print(result.stdout)
        
        return True
        
    except subprocess.CalledProcessError as e:
        duration = time.time() - start_time
        
        print(f"❌ FAILED ({duration:.2f}s)")
        print(f"Exit code: {e.returncode}")
        
        if e.stdout:
            print("STDOUT:")
            print(e.stdout)
        
        if e.stderr:
            print("STDERR:")
            print(e.stderr)
        
        return False


def main():
    """Run comprehensive sandbox tests."""
    print("🚀 Starting Sandbox Infrastructure Test Suite")
    print(f"Python version: {sys.version}")
    
    # Change to project root
    project_root = Path(__file__).parent.parent.parent
    print(f"Project root: {project_root}")
    
    # Test commands to run
    test_commands = [
        # Unit tests for individual components
        (
            ["python", "-m", "pytest", "tests/sandbox/test_security_manager.py", "-v", "--tb=short"],
            "Security Manager Unit Tests"
        ),
        (
            ["python", "-m", "pytest", "tests/sandbox/test_resource_monitor.py", "-v", "--tb=short"],
            "Resource Monitor Unit Tests"
        ),
        (
            ["python", "-m", "pytest", "tests/sandbox/test_execution_engine.py", "-v", "--tb=short"],
            "Execution Engine Unit Tests"
        ),
        
        # Integration tests
        (
            ["python", "-m", "pytest", "tests/sandbox/test_docker_integration.py", "-v", "--tb=short"],
            "Docker Integration Tests (may skip if Docker unavailable)"
        ),
        
        # Performance tests
        (
            ["python", "-m", "pytest", "tests/sandbox/test_performance.py", "-v", "--tb=short", "-s"],
            "Performance Tests"
        ),
        
        # Coverage report
        (
            ["python", "-m", "pytest", "tests/sandbox/", "--cov=lib.sandbox", "--cov-report=term-missing", "--cov-report=html"],
            "Test Coverage Report"
        ),
        
        # All sandbox tests together
        (
            ["python", "-m", "pytest", "tests/sandbox/", "-v", "--tb=short"],
            "All Sandbox Tests"
        )
    ]
    
    # Track results
    results = []
    
    # Run each test command
    for command, description in test_commands:
        success = run_command(command, description)
        results.append((description, success))
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for description, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {description}")
    
    print(f"\nOverall: {passed}/{total} test suites passed")
    
    if passed == total:
        print("🎉 All tests passed! Sandbox infrastructure is ready.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
