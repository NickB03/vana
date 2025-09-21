#!/usr/bin/env python3
"""
Comprehensive Security Test Runner

This script runs all security tests and generates a comprehensive security validation report.
It coordinates all security test suites and provides a unified security assessment.
"""

import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


class SecurityTestRunner:
    """Comprehensive security test runner and reporter."""

    def __init__(self):
        self.project_root = Path("/Users/nick/Development/vana")
        self.test_results = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "test_execution": {},
            "security_assessment": {},
            "recommendations": [],
        }

    def run_test_suite(self, test_file: str, suite_name: str) -> tuple[bool, dict]:
        """Run a specific test suite and return results."""
        print(f"\n🔍 Running {suite_name}...")
        print("=" * 60)

        test_path = self.project_root / test_file
        if not test_path.exists():
            print(f"❌ Test file not found: {test_file}")
            return False, {"error": "Test file not found"}

        start_time = time.time()

        try:
            # Run pytest with JSON output
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pytest",
                    str(test_path),
                    "-v",
                    "--tb=short",
                    "--json-report",
                    "--json-report-file=/tmp/pytest_report.json",
                ],
                capture_output=True,
                text=True,
                cwd=self.project_root,
            )

            end_time = time.time()
            duration = end_time - start_time

            # Try to read JSON report
            json_report = {}
            try:
                with open("/tmp/pytest_report.json") as f:
                    json_report = json.load(f)
            except:
                pass

            test_result = {
                "suite_name": suite_name,
                "duration": duration,
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "json_report": json_report,
                "success": result.returncode == 0,
            }

            if result.returncode == 0:
                print(f"✅ {suite_name} completed successfully")
            else:
                print(f"❌ {suite_name} failed with return code {result.returncode}")
                if result.stderr:
                    print(f"Error output: {result.stderr[:500]}")

            return result.returncode == 0, test_result

        except Exception as e:
            print(f"❌ Error running {suite_name}: {e}")
            return False, {"error": str(e)}

    def run_all_security_tests(self) -> dict:
        """Run all security test suites."""
        print("🛡️  COMPREHENSIVE SECURITY VALIDATION")
        print("=" * 60)

        test_suites = [
            ("tests/test_pr190_security_validation.py", "PR190 Security Validation"),
            (
                "tests/security/comprehensive-security-validation.test.py",
                "Comprehensive Security Tests",
            ),
            (
                "tests/security/advanced-penetration-tests.py",
                "Advanced Penetration Tests",
            ),
            (
                "tests/security/security-regression-tests.py",
                "Security Regression Tests",
            ),
        ]

        results = {}
        overall_success = True

        for test_file, suite_name in test_suites:
            success, result = self.run_test_suite(test_file, suite_name)
            results[suite_name] = result

            if not success:
                overall_success = False

        self.test_results["test_execution"] = results
        self.test_results["overall_success"] = overall_success

        return results

    def analyze_security_posture(self) -> dict:
        """Analyze overall security posture based on test results."""
        print("\n📊 SECURITY POSTURE ANALYSIS")
        print("=" * 60)

        analysis = {
            "security_score": 0,
            "critical_vulnerabilities": 0,
            "medium_vulnerabilities": 0,
            "low_vulnerabilities": 0,
            "security_measures_validated": [],
            "areas_of_concern": [],
            "compliance_status": "unknown",
        }

        # Count successful test suites
        successful_suites = 0
        total_suites = 0

        for suite_name, result in self.test_results["test_execution"].items():
            total_suites += 1
            if result.get("success", False):
                successful_suites += 1
                analysis["security_measures_validated"].append(suite_name)
            else:
                analysis["areas_of_concern"].append(suite_name)

        # Calculate security score
        if total_suites > 0:
            analysis["security_score"] = round(
                (successful_suites / total_suites) * 100, 1
            )

        # Determine compliance status
        if analysis["security_score"] >= 95:
            analysis["compliance_status"] = "excellent"
        elif analysis["security_score"] >= 85:
            analysis["compliance_status"] = "good"
        elif analysis["security_score"] >= 70:
            analysis["compliance_status"] = "adequate"
        else:
            analysis["compliance_status"] = "needs_improvement"

        # Generate recommendations based on results
        recommendations = []

        if analysis["security_score"] < 100:
            recommendations.append("Address failing security test suites")

        if analysis.get("areas_of_concern"):
            recommendations.append(
                "Review and fix security issues in: "
                + ", ".join(analysis["areas_of_concern"])
            )

        recommendations.extend(
            [
                "Implement automated security testing in CI/CD pipeline",
                "Set up security monitoring and alerting",
                "Regular security dependency updates",
                "Periodic penetration testing by external security experts",
            ]
        )

        analysis["recommendations"] = recommendations
        self.test_results["security_assessment"] = analysis

        return analysis

    def generate_security_report(self) -> str:
        """Generate comprehensive security report."""
        report_path = (
            self.project_root / "tests/security/comprehensive_security_report.json"
        )
        report_path.parent.mkdir(exist_ok=True)

        # Add metadata
        self.test_results["metadata"] = {
            "project": "Vana",
            "report_version": "1.0",
            "test_categories": [
                "Authentication Security",
                "Authorization Controls",
                "Input Validation",
                "Session Management",
                "Data Protection",
                "Network Security",
                "Configuration Security",
                "Regression Prevention",
            ],
            "security_standards": [
                "OWASP Top 10",
                "JWT Security Best Practices",
                "API Security Guidelines",
                "Session Management Standards",
            ],
        }

        # Save comprehensive report
        with open(report_path, "w") as f:
            json.dump(self.test_results, f, indent=2)

        print(f"\n📄 Comprehensive security report saved: {report_path}")
        return str(report_path)

    def print_security_summary(self):
        """Print security assessment summary."""
        assessment = self.test_results.get("security_assessment", {})

        print("\n🎯 SECURITY ASSESSMENT SUMMARY")
        print("=" * 60)
        print(f"Security Score: {assessment.get('security_score', 0)}%")
        print(
            f"Compliance Status: {assessment.get('compliance_status', 'unknown').upper()}"
        )
        print(
            f"Successful Test Suites: {len(assessment.get('security_measures_validated', []))}"
        )
        print(f"Areas of Concern: {len(assessment.get('areas_of_concern', []))}")

        if assessment.get("security_measures_validated"):
            print("\n✅ Security Measures Validated:")
            for measure in assessment["security_measures_validated"]:
                print(f"   - {measure}")

        if assessment.get("areas_of_concern"):
            print("\n⚠️  Areas of Concern:")
            for concern in assessment["areas_of_concern"]:
                print(f"   - {concern}")

        if assessment.get("recommendations"):
            print("\n📋 Recommendations:")
            for i, recommendation in enumerate(assessment["recommendations"][:5], 1):
                print(f"   {i}. {recommendation}")

    def store_results_in_memory(self):
        """Store test results in memory for future reference."""
        memory_key = f"security/test-validation-{int(datetime.now().timestamp())}"

        memory_data = {
            "timestamp": self.test_results["timestamp"],
            "security_score": self.test_results["security_assessment"].get(
                "security_score", 0
            ),
            "compliance_status": self.test_results["security_assessment"].get(
                "compliance_status", "unknown"
            ),
            "test_suites_run": list(self.test_results["test_execution"].keys()),
            "successful_suites": len(
                self.test_results["security_assessment"].get(
                    "security_measures_validated", []
                )
            ),
            "areas_of_concern": self.test_results["security_assessment"].get(
                "areas_of_concern", []
            ),
            "recommendations": self.test_results["security_assessment"].get(
                "recommendations", []
            )[:3],
        }

        print(f"\n💾 Storing security test results in memory: {memory_key}")
        print(f"   Memory data: {json.dumps(memory_data, indent=2)}")

        # In a real implementation, this would store to the actual memory system
        # For now, save to a local file for reference
        memory_file = self.project_root / "tests/security/memory_results.json"
        try:
            if memory_file.exists():
                with open(memory_file) as f:
                    existing_data = json.load(f)
            else:
                existing_data = {}

            existing_data[memory_key] = memory_data

            with open(memory_file, "w") as f:
                json.dump(existing_data, f, indent=2)

            print(f"   Stored in: {memory_file}")
        except Exception as e:
            print(f"   Error storing to memory file: {e}")

    def run_complete_security_validation(self) -> bool:
        """Run complete security validation pipeline."""
        print("🚀 Starting Comprehensive Security Validation")
        print("=" * 80)

        # Run all security tests
        test_results = self.run_all_security_tests()

        # Analyze security posture
        security_analysis = self.analyze_security_posture()

        # Generate comprehensive report
        report_path = self.generate_security_report()

        # Store results in memory
        self.store_results_in_memory()

        # Print summary
        self.print_security_summary()

        # Final status
        overall_success = self.test_results.get("overall_success", False)

        print("\n" + "=" * 80)
        if overall_success:
            print("🎉 SECURITY VALIDATION COMPLETED SUCCESSFULLY")
            print("   All security test suites passed")
        else:
            print("⚠️  SECURITY VALIDATION COMPLETED WITH ISSUES")
            print("   Some security test suites failed - review required")

        print(f"📊 Final Security Score: {security_analysis.get('security_score', 0)}%")
        print(f"📄 Detailed Report: {report_path}")
        print("=" * 80)

        return overall_success


def main():
    """Main entry point for comprehensive security testing."""
    runner = SecurityTestRunner()

    try:
        success = runner.run_complete_security_validation()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Security testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during security testing: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
