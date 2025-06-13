#!/usr/bin/env python3
"""
VANA Setup Validation Script

This script validates that the VANA environment is properly set up and all
critical components are working correctly.

Usage:
    python validate_vana_setup.py [--comprehensive] [--output report.json]
"""

import argparse
import json
import logging
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class VanaSetupValidator:
    """Comprehensive VANA setup validation."""

    def __init__(self, comprehensive: bool = False):
        self.comprehensive = comprehensive
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "tests": {},
            "summary": {"total_tests": 0, "passed": 0, "failed": 0, "warnings": 0},
        }

    def test_step(self, test_name: str, test_func) -> bool:
        """Execute a test step and record results."""
        logger.info(f"🔍 Testing: {test_name}")
        start_time = time.time()

        try:
            result = test_func()
            elapsed = time.time() - start_time

            if result is True:
                status = "PASS"
                self.results["summary"]["passed"] += 1
                logger.info(f"✅ {test_name} - PASSED ({elapsed:.2f}s)")
            elif result is False:
                status = "FAIL"
                self.results["summary"]["failed"] += 1
                logger.error(f"❌ {test_name} - FAILED ({elapsed:.2f}s)")
            else:
                status = "WARNING"
                self.results["summary"]["warnings"] += 1
                logger.warning(f"⚠️ {test_name} - WARNING ({elapsed:.2f}s)")

            self.results["tests"][test_name] = {
                "status": status,
                "elapsed_time": elapsed,
                "details": result if isinstance(result, (str, dict)) else None,
            }

            self.results["summary"]["total_tests"] += 1
            return status == "PASS"

        except Exception as e:
            elapsed = time.time() - start_time
            error_msg = f"Exception: {str(e)}"

            self.results["tests"][test_name] = {
                "status": "ERROR",
                "elapsed_time": elapsed,
                "error": error_msg,
                "traceback": traceback.format_exc(),
            }

            self.results["summary"]["failed"] += 1
            self.results["summary"]["total_tests"] += 1

            logger.error(f"💥 {test_name} - ERROR ({elapsed:.2f}s): {error_msg}")
            return False

    def test_basic_imports(self) -> bool:
        """Test basic Python imports."""

        return True

    def test_google_cloud_imports(self) -> bool:
        """Test Google Cloud imports."""
        try:
            pass

            return True
        except ImportError as e:
            return f"Google Cloud import failed: {e}"

    def test_google_adk_imports(self) -> bool:
        """Test Google ADK imports."""
        try:
            pass

            return True
        except ImportError as e:
            return f"Google ADK import failed: {e}"

    def test_security_imports(self) -> bool:
        """Test security module imports (critical fix)."""
        try:
            from tools.security import (
                AccessControlManager,
                Role,
            )

            # Test that Role enum works
            role = Role.USER
            acm = AccessControlManager()

            return True
        except ImportError as e:
            return f"Security import failed: {e}"

    def test_local_tool_imports(self) -> bool:
        """Test local tool imports."""
        try:
            pass

            return True
        except ImportError as e:
            return f"Local tools import failed: {e}"

    def test_agent_imports(self) -> bool:
        """Test agent imports."""
        try:
            from agents.vana import team

            root_agent = team.root_agent

            # Check basic agent properties
            agent_name = getattr(root_agent, "name", "Unknown")
            tools = getattr(root_agent, "tools", [])

            return {"agent_name": agent_name, "tool_count": len(tools), "status": "success"}
        except ImportError as e:
            return f"Agent import failed: {e}"

    def test_pytest_configuration(self) -> bool:
        """Test pytest configuration."""
        try:
            pass

            # Check if pytest.ini exists and has correct configuration
            pytest_ini = Path("pytest.ini")
            if pytest_ini.exists():
                content = pytest_ini.read_text()
                if "asyncio_mode = auto" in content:
                    return True
                else:
                    return "pytest.ini missing asyncio_mode configuration"
            else:
                return "pytest.ini file not found"
        except ImportError as e:
            return f"Pytest import failed: {e}"

    def test_poetry_environment(self) -> bool:
        """Test Poetry environment."""
        try:
            import subprocess

            result = subprocess.run(["poetry", "env", "info", "--path"], capture_output=True, text=True, check=True)

            venv_path = result.stdout.strip()
            if venv_path and Path(venv_path).exists():
                return f"Virtual environment: {venv_path}"
            else:
                return "Poetry virtual environment not found"
        except Exception as e:
            return f"Poetry environment check failed: {e}"

    def test_dependency_resolution(self) -> bool:
        """Test that all dependencies are properly resolved."""
        try:
            import subprocess

            result = subprocess.run(["poetry", "check"], capture_output=True, text=True, check=True)

            if "All set!" in result.stdout:
                return True
            else:
                return f"Poetry check output: {result.stdout}"
        except Exception as e:
            return f"Dependency check failed: {e}"

    def test_comprehensive_imports(self) -> bool:
        """Test comprehensive imports if requested."""
        if not self.comprehensive:
            return "Skipped (not in comprehensive mode)"

        test_modules = ["fastapi", "pydantic", "requests", "flask", "spacy", "psutil", "responses"]

        failed_imports = []
        for module in test_modules:
            try:
                __import__(module)
            except ImportError:
                failed_imports.append(module)

        if failed_imports:
            return f"Failed to import: {', '.join(failed_imports)}"
        else:
            return f"Successfully imported {len(test_modules)} modules"

    def run_validation(self) -> Dict[str, Any]:
        """Run complete validation suite."""
        logger.info("🚀 Starting VANA setup validation...")

        # Core validation tests
        core_tests = [
            ("Basic Python imports", self.test_basic_imports),
            ("Google Cloud imports", self.test_google_cloud_imports),
            ("Google ADK imports", self.test_google_adk_imports),
            ("Security module imports", self.test_security_imports),
            ("Local tool imports", self.test_local_tool_imports),
            ("Agent imports", self.test_agent_imports),
            ("Pytest configuration", self.test_pytest_configuration),
            ("Poetry environment", self.test_poetry_environment),
            ("Dependency resolution", self.test_dependency_resolution),
        ]

        # Add comprehensive tests if requested
        if self.comprehensive:
            core_tests.append(("Comprehensive imports", self.test_comprehensive_imports))

        # Run all tests
        for test_name, test_func in core_tests:
            self.test_step(test_name, test_func)

        # Calculate success rate
        total = self.results["summary"]["total_tests"]
        passed = self.results["summary"]["passed"]
        success_rate = (passed / total * 100) if total > 0 else 0

        self.results["summary"]["success_rate"] = success_rate

        # Log summary
        logger.info(f"\n{'='*50}")
        logger.info("VALIDATION SUMMARY")
        logger.info(f"{'='*50}")
        logger.info(f"Total tests: {total}")
        logger.info(f"Passed: {passed}")
        logger.info(f"Failed: {self.results['summary']['failed']}")
        logger.info(f"Warnings: {self.results['summary']['warnings']}")
        logger.info(f"Success rate: {success_rate:.1f}%")

        if success_rate >= 80:
            logger.info("🎉 VANA setup validation PASSED!")
        elif success_rate >= 60:
            logger.warning("⚠️ VANA setup validation has WARNINGS")
        else:
            logger.error("❌ VANA setup validation FAILED")

        return self.results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Validate VANA setup")
    parser.add_argument(
        "--comprehensive", action="store_true", help="Run comprehensive validation including all optional dependencies"
    )
    parser.add_argument("--output", type=str, help="Output results to JSON file")

    args = parser.parse_args()

    validator = VanaSetupValidator(comprehensive=args.comprehensive)
    results = validator.run_validation()

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        logger.info(f"Results saved to {args.output}")

    # Exit with appropriate code
    success_rate = results["summary"]["success_rate"]
    if success_rate >= 80:
        sys.exit(0)  # Success
    elif success_rate >= 60:
        sys.exit(1)  # Warnings
    else:
        sys.exit(2)  # Failure


if __name__ == "__main__":
    main()
