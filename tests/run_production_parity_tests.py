#!/usr/bin/env python3
"""
Production Parity Test Runner

This script ensures ALL tests run in the correct environment that matches production.
It replaces the broken testing framework that was testing the wrong environment.

Usage:
    poetry run python tests/run_production_parity_tests.py
    poetry run python tests/run_production_parity_tests.py --full
    poetry run python tests/run_production_parity_tests.py --smoke-only
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


def run_command_in_poetry(command: list, description: str) -> tuple:
    """Run a command in Poetry environment and capture results"""
    print(f"🔧 {description}...")

    # Ensure we're using Poetry
    poetry_command = ["poetry", "run"] + command

    start_time = time.time()
    result = subprocess.run(poetry_command, capture_output=True, text=True, cwd=Path(__file__).parent.parent)
    end_time = time.time()

    return result, end_time - start_time


def run_smoke_tests():
    """Run critical smoke tests that mirror production"""
    print("💨 Running Production Smoke Tests...")

    smoke_tests = [
        {
            "name": "Agent Loading Test",
            "command": [
                "python",
                "-c",
                """
from agents.vana.team import root_agent
print(f'✅ Agent loaded with {len(root_agent.tools)} tools')
assert len(root_agent.tools) >= 8, f'Expected 8+ tools, got {len(root_agent.tools)}'
print('✅ Agent smoke test passed')
""",
            ],
            "critical": True,
        },
        {
            "name": "Tool Functionality Test",
            "command": [
                "python",
                "-c",
                """
from agents.vana.team import root_agent
web_tool = next((t for t in root_agent.tools if t.name == 'web_search'), None)
assert web_tool is not None, 'web_search tool not found'
result = web_tool.func('test query', 1)
assert len(str(result)) > 10, 'Tool returned empty result'
print('✅ Tool functionality test passed')
""",
            ],
            "critical": True,
        },
        {
            "name": "Memory Integration Test",
            "command": [
                "python",
                "-c",
                """
from agents.vana.team import root_agent
memory_tool = next((t for t in root_agent.tools if t.name == 'load_memory'), None)
assert memory_tool is not None, 'load_memory tool not found'
print('✅ Memory integration test passed')
""",
            ],
            "critical": False,
        },
        {
            "name": "FastAPI App Test",
            "command": [
                "python",
                "-c",
                """
from main import app
assert app is not None, 'FastAPI app not created'
print('✅ FastAPI app test passed')
""",
            ],
            "critical": True,
        },
    ]

    results = []
    failed_critical = False

    for test in smoke_tests:
        print(f"\n🧪 Running: {test['name']}")
        result, duration = run_command_in_poetry(test["command"], f"Executing {test['name']}")

        test_result = {
            "name": test["name"],
            "success": result.returncode == 0,
            "duration": duration,
            "critical": test["critical"],
            "output": result.stdout,
            "error": result.stderr,
        }

        if result.returncode == 0:
            print(f"✅ {test['name']}: PASSED ({duration:.2f}s)")
        else:
            print(f"❌ {test['name']}: FAILED ({duration:.2f}s)")
            if test["critical"]:
                failed_critical = True
            print(f"   Error: {result.stderr.strip()}")

        results.append(test_result)

    return results, not failed_critical


def run_production_endpoint_tests():
    """Test actual production endpoints"""
    print("\n🌐 Testing Production Endpoints...")

    endpoint_tests = [
        {
            "name": "Production Health Check",
            "command": [
                "python",
                "-c",
                """
import requests
response = requests.get('https://vana-dev-960076421399.us-central1.run.app/health', timeout=10)
assert response.status_code == 200, f'Health check failed: {response.status_code}'
data = response.json()
assert data.get('status') == 'healthy', f'Health status not healthy: {data}'
print(f'✅ Production health: {data}')
""",
            ],
        },
        {
            "name": "Production Agent Info",
            "command": [
                "python",
                "-c",
                """
import requests
response = requests.get('https://vana-dev-960076421399.us-central1.run.app/info', timeout=10)
assert response.status_code == 200, f'Info endpoint failed: {response.status_code}'
data = response.json()
assert 'name' in data, 'Agent info missing name field'
print(f'✅ Production agent info: {data.get("name", "unknown")}')
""",
            ],
        },
    ]

    results = []

    for test in endpoint_tests:
        print(f"\n🌐 Running: {test['name']}")
        result, duration = run_command_in_poetry(test["command"], f"Testing {test['name']}")

        test_result = {
            "name": test["name"],
            "success": result.returncode == 0,
            "duration": duration,
            "output": result.stdout,
            "error": result.stderr,
        }

        if result.returncode == 0:
            print(f"✅ {test['name']}: PASSED ({duration:.2f}s)")
        else:
            print(f"❌ {test['name']}: FAILED ({duration:.2f}s)")
            print(f"   Error: {result.stderr.strip()}")

        results.append(test_result)

    return results


def run_comprehensive_tests():
    """Run comprehensive test suite in Poetry environment"""
    print("\n🧪 Running Comprehensive Test Suite...")

    test_commands = [
        {"name": "Unit Tests", "command": ["pytest", "tests/unit/", "-v", "--tb=short"], "timeout": 300},
        {"name": "Agent Tests", "command": ["pytest", "tests/agent/", "-v", "--tb=short"], "timeout": 180},
        {"name": "Integration Tests", "command": ["pytest", "tests/integration/", "-v", "--tb=short"], "timeout": 600},
    ]

    results = []

    for test in test_commands:
        print(f"\n🔬 Running: {test['name']}")
        result, duration = run_command_in_poetry(test["command"], f"Executing {test['name']}")

        test_result = {
            "name": test["name"],
            "success": result.returncode == 0,
            "duration": duration,
            "output": result.stdout,
            "error": result.stderr,
            "command": " ".join(test["command"]),
        }

        if result.returncode == 0:
            print(f"✅ {test['name']}: PASSED ({duration:.2f}s)")
        else:
            print(f"❌ {test['name']}: FAILED ({duration:.2f}s)")
            # Don't print full error output for pytest - it's too verbose
            print(f"   Command: {' '.join(test['command'])}")

        results.append(test_result)

    return results


def main():
    parser = argparse.ArgumentParser(description="Production Parity Test Runner")
    parser.add_argument("--smoke-only", action="store_true", help="Run only smoke tests")
    parser.add_argument("--full", action="store_true", help="Run full test suite")
    parser.add_argument("--no-endpoints", action="store_true", help="Skip production endpoint tests")

    args = parser.parse_args()

    print("🚀 PRODUCTION PARITY TEST RUNNER")
    print("=" * 50)

    # Always run production parity validation first
    print("\n📍 Phase 1: Production Parity Validation")
    parity_result, parity_duration = run_command_in_poetry(
        ["python", "tests/framework/production_parity_validator.py"], "Validating production parity"
    )

    if parity_result.returncode != 0:
        print("❌ CRITICAL: Production parity validation FAILED")
        print("   Tests would not reflect production reality!")
        print(f"   Error: {parity_result.stderr}")
        return 1

    print("✅ Production parity validation PASSED")

    # Run smoke tests
    print("\n📍 Phase 2: Smoke Tests")
    smoke_results, smoke_passed = run_smoke_tests()

    if not smoke_passed:
        print("❌ CRITICAL: Smoke tests FAILED")
        print("   Core functionality is broken!")
        return 1

    print("✅ All critical smoke tests PASSED")

    # Run production endpoint tests (unless skipped)
    endpoint_results = []
    if not args.no_endpoints:
        print("\n📍 Phase 3: Production Endpoint Tests")
        endpoint_results = run_production_endpoint_tests()

    # Run comprehensive tests (if requested)
    comprehensive_results = []
    if args.full and not args.smoke_only:
        print("\n📍 Phase 4: Comprehensive Test Suite")
        comprehensive_results = run_comprehensive_tests()

    # Generate final report
    print("\n📊 FINAL TEST REPORT")
    print("=" * 50)

    total_tests = len(smoke_results) + len(endpoint_results) + len(comprehensive_results)
    passed_tests = sum(1 for r in smoke_results + endpoint_results + comprehensive_results if r["success"])

    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")

    critical_failed = any(r for r in smoke_results if r["critical"] and not r["success"])

    if critical_failed:
        print("\n❌ CRITICAL TESTS FAILED - System not ready for production")
        return 1
    elif passed_tests == total_tests:
        print("\n✅ ALL TESTS PASSED - System ready for production")
        return 0
    else:
        print("\n⚠️  SOME NON-CRITICAL TESTS FAILED - Review needed")
        return 0


if __name__ == "__main__":
    sys.exit(main())
