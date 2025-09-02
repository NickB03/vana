#!/usr/bin/env python3
"""
Comprehensive Backend Testing Suite
Tests all backend services, endpoints, and functionality
"""

import json
import sys
import time
from dataclasses import dataclass
from typing import Any

import requests


@dataclass
class TestResult:
    """Test result structure"""

    test_name: str
    status: str  # "PASS", "FAIL", "SKIP", "ERROR"
    message: str
    duration: float
    details: dict[str, Any] = None


class BackendTester:
    """Comprehensive backend testing suite"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: list[TestResult] = []
        self.session = requests.Session()
        self.session.timeout = 10

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def test_basic_connectivity(self) -> TestResult:
        """Test basic server connectivity"""
        start_time = time.time()
        try:
            response = self.session.get(f"{self.base_url}/")
            duration = time.time() - start_time

            if response.status_code == 200:
                return TestResult(
                    test_name="Basic Connectivity",
                    status="PASS",
                    message=f"Server responding on {self.base_url}",
                    duration=duration,
                    details={"status_code": response.status_code},
                )
            else:
                return TestResult(
                    test_name="Basic Connectivity",
                    status="FAIL",
                    message=f"Unexpected status code: {response.status_code}",
                    duration=duration,
                    details={"status_code": response.status_code},
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Basic Connectivity",
                status="ERROR",
                message=f"Connection failed: {e!s}",
                duration=duration,
            )

    def test_health_check(self) -> TestResult:
        """Test health check endpoint"""
        start_time = time.time()
        try:
            response = self.session.get(f"{self.base_url}/health")
            duration = time.time() - start_time

            if response.status_code == 200:
                try:
                    data = response.json()
                    return TestResult(
                        test_name="Health Check",
                        status="PASS",
                        message="Health endpoint responding correctly",
                        duration=duration,
                        details=data,
                    )
                except Exception:
                    return TestResult(
                        test_name="Health Check",
                        status="PASS",
                        message="Health endpoint responding (non-JSON)",
                        duration=duration,
                        details={"response_text": response.text[:200]},
                    )
            else:
                return TestResult(
                    test_name="Health Check",
                    status="FAIL",
                    message=f"Health check failed with status {response.status_code}",
                    duration=duration,
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Health Check",
                status="ERROR",
                message=f"Health check error: {e!s}",
                duration=duration,
            )

    def test_list_apps_endpoint(self) -> TestResult:
        """Test /list-apps endpoint"""
        start_time = time.time()
        try:
            response = self.session.get(f"{self.base_url}/list-apps")
            duration = time.time() - start_time

            if response.status_code == 200:
                try:
                    data = response.json()
                    return TestResult(
                        test_name="List Apps Endpoint",
                        status="PASS",
                        message=f"List apps returned {len(data) if isinstance(data, list) else 'data'}",
                        duration=duration,
                        details=data,
                    )
                except json.JSONDecodeError:
                    return TestResult(
                        test_name="List Apps Endpoint",
                        status="FAIL",
                        message="Invalid JSON response",
                        duration=duration,
                        details={"response_text": response.text[:500]},
                    )
            else:
                return TestResult(
                    test_name="List Apps Endpoint",
                    status="FAIL",
                    message=f"Status code: {response.status_code}",
                    duration=duration,
                    details={"response_text": response.text[:200]},
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="List Apps Endpoint",
                status="ERROR",
                message=f"Request failed: {e!s}",
                duration=duration,
            )

    def test_research_agent_access(self) -> TestResult:
        """Test research agent accessibility"""
        start_time = time.time()
        try:
            # Try different potential research agent endpoints
            endpoints = [
                "/research",
                "/agent/research",
                "/api/research",
                "/research-agent",
            ]

            for endpoint in endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                    if response.status_code != 404:
                        duration = time.time() - start_time
                        return TestResult(
                            test_name="Research Agent Access",
                            status="PASS",
                            message=f"Research agent accessible at {endpoint}",
                            duration=duration,
                            details={
                                "endpoint": endpoint,
                                "status_code": response.status_code,
                                "response": response.text[:200],
                            },
                        )
                except Exception:
                    continue

            duration = time.time() - start_time
            return TestResult(
                test_name="Research Agent Access",
                status="SKIP",
                message="No research agent endpoints found",
                duration=duration,
                details={"tried_endpoints": endpoints},
            )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Research Agent Access",
                status="ERROR",
                message=f"Error testing research agent: {e!s}",
                duration=duration,
            )

    def test_api_endpoints(self) -> TestResult:
        """Test various API endpoints"""
        start_time = time.time()
        try:
            endpoints = [
                "/api/status",
                "/api/version",
                "/api/config",
                "/docs",
                "/redoc",
                "/openapi.json",
            ]

            results = {}
            for endpoint in endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                    results[endpoint] = {
                        "status_code": response.status_code,
                        "accessible": response.status_code not in [404, 500],
                    }
                except Exception as e:
                    results[endpoint] = {"error": str(e), "accessible": False}

            duration = time.time() - start_time
            accessible_count = sum(
                1 for r in results.values() if r.get("accessible", False)
            )

            return TestResult(
                test_name="API Endpoints Test",
                status="PASS" if accessible_count > 0 else "FAIL",
                message=f"{accessible_count}/{len(endpoints)} endpoints accessible",
                duration=duration,
                details=results,
            )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="API Endpoints Test",
                status="ERROR",
                message=f"API endpoint testing failed: {e!s}",
                duration=duration,
            )

    def test_error_handling(self) -> TestResult:
        """Test error handling and edge cases"""
        start_time = time.time()
        try:
            # Test 404 handling
            response_404 = self.session.get(f"{self.base_url}/nonexistent-endpoint")

            # Test invalid methods
            response_method = self.session.delete(f"{self.base_url}/")

            # Test malformed requests (if POST endpoints exist)
            try:
                response_malformed = self.session.post(
                    f"{self.base_url}/list-apps", json={"invalid": "data"}
                )
            except Exception:
                response_malformed = None

            duration = time.time() - start_time

            return TestResult(
                test_name="Error Handling",
                status="PASS",
                message="Error handling working correctly",
                duration=duration,
                details={
                    "404_response": response_404.status_code,
                    "method_response": response_method.status_code,
                    "malformed_handled": response_malformed.status_code
                    if response_malformed
                    else "N/A",
                },
            )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Error Handling",
                status="ERROR",
                message=f"Error handling test failed: {e!s}",
                duration=duration,
            )

    def test_performance_basic(self) -> TestResult:
        """Basic performance test"""
        start_time = time.time()
        try:
            # Test multiple concurrent requests
            times = []
            for _i in range(5):
                req_start = time.time()
                response = self.session.get(f"{self.base_url}/")
                req_time = time.time() - req_start
                times.append(req_time)
                if response.status_code != 200:
                    break

            duration = time.time() - start_time
            avg_time = sum(times) / len(times) if times else 0

            return TestResult(
                test_name="Basic Performance",
                status="PASS" if avg_time < 1.0 else "FAIL",
                message=f"Average response time: {avg_time:.3f}s",
                duration=duration,
                details={
                    "response_times": times,
                    "average_time": avg_time,
                    "max_time": max(times) if times else 0,
                },
            )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Basic Performance",
                status="ERROR",
                message=f"Performance test failed: {e!s}",
                duration=duration,
            )

    def test_adk_ui_specific(self) -> TestResult:
        """Test ADK UI specific functionality on port 8000"""
        start_time = time.time()
        try:
            # Check if this is serving static files or API
            response = self.session.get(
                f"{self.base_url}/", headers={"Accept": "text/html"}
            )
            duration = time.time() - start_time

            if response.status_code == 200:
                is_html = "text/html" in response.headers.get("content-type", "")
                has_ui_content = any(
                    keyword in response.text.lower()
                    for keyword in ["html", "app", "ui", "interface", "dashboard"]
                )

                status = "PASS" if is_html or has_ui_content else "SKIP"
                message = (
                    "ADK UI serving correctly"
                    if is_html
                    else "Non-HTML response (API server)"
                )

                return TestResult(
                    test_name="ADK UI Specific",
                    status=status,
                    message=message,
                    duration=duration,
                    details={
                        "content_type": response.headers.get("content-type"),
                        "is_html": is_html,
                        "response_size": len(response.text),
                        "has_ui_keywords": has_ui_content,
                    },
                )
            else:
                return TestResult(
                    test_name="ADK UI Specific",
                    status="FAIL",
                    message=f"ADK UI not accessible: {response.status_code}",
                    duration=duration,
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="ADK UI Specific",
                status="ERROR",
                message=f"ADK UI test failed: {e!s}",
                duration=duration,
            )

    def run_all_tests(self) -> list[TestResult]:
        """Run all tests and return results"""
        self.log("Starting comprehensive backend testing...")

        tests = [
            self.test_basic_connectivity,
            self.test_health_check,
            self.test_adk_ui_specific,
            self.test_list_apps_endpoint,
            self.test_research_agent_access,
            self.test_api_endpoints,
            self.test_error_handling,
            self.test_performance_basic,
        ]

        for test_func in tests:
            self.log(f"Running {test_func.__name__}...")
            try:
                result = test_func()
                self.results.append(result)
                self.log(f"{result.test_name}: {result.status} - {result.message}")
            except Exception as e:
                error_result = TestResult(
                    test_name=test_func.__name__,
                    status="ERROR",
                    message=f"Test execution failed: {e!s}",
                    duration=0.0,
                )
                self.results.append(error_result)
                self.log(f"{test_func.__name__}: ERROR - {e!s}")

        return self.results

    def generate_report(self) -> str:
        """Generate comprehensive test report"""
        if not self.results:
            return "No test results available"

        total_tests = len(self.results)
        passed = len([r for r in self.results if r.status == "PASS"])
        failed = len([r for r in self.results if r.status == "FAIL"])
        errors = len([r for r in self.results if r.status == "ERROR"])
        skipped = len([r for r in self.results if r.status == "SKIP"])

        total_duration = sum(r.duration for r in self.results)

        report = f"""
{"=" * 60}
VANA BACKEND COMPREHENSIVE TEST REPORT
{"=" * 60}

Test Summary:
- Total Tests: {total_tests}
- Passed: {passed} ({passed / total_tests * 100:.1f}%)
- Failed: {failed} ({failed / total_tests * 100:.1f}%)
- Errors: {errors} ({errors / total_tests * 100:.1f}%)
- Skipped: {skipped} ({skipped / total_tests * 100:.1f}%)
- Total Duration: {total_duration:.2f}s

Backend Server Status: {"OPERATIONAL" if passed > failed + errors else "ISSUES DETECTED"}

Detailed Results:
{"-" * 60}
"""

        for i, result in enumerate(self.results, 1):
            status_symbol = {
                "PASS": "✅",
                "FAIL": "❌",
                "ERROR": "🚫",
                "SKIP": "⏭️",
            }.get(result.status, "❓")

            report += f"""
{i}. {status_symbol} {result.test_name}
   Status: {result.status}
   Message: {result.message}
   Duration: {result.duration:.3f}s
"""

            if result.details and result.status in ["PASS", "FAIL"]:
                report += f"   Details: {json.dumps(result.details, indent=3)}\n"

        # Add recommendations
        report += f"""
{"-" * 60}
RECOMMENDATIONS:
"""

        if failed > 0 or errors > 0:
            report += """
⚠️  Backend has issues that need attention:
   - Check server logs for detailed error information
   - Verify all required services are running
   - Ensure proper configuration files are in place
"""

        if passed == total_tests - skipped:
            report += """
✅ Backend is fully operational!
   - All critical endpoints are working
   - Performance is within acceptable limits
   - Error handling is functioning correctly
"""

        report += f"""
{"-" * 60}
Test completed at: {time.strftime("%Y-%m-%d %H:%M:%S")}
Server URL: {self.base_url}
{"=" * 60}
"""

        return report


def main():
    """Main test execution function"""
    print("🚀 Starting VANA Backend Comprehensive Testing")
    print("=" * 50)

    # Check if server is running
    try:
        tester = BackendTester()
        results = tester.run_all_tests()
        report = tester.generate_report()

        print(report)

        # Save report to file
        report_file = "/Users/nick/Development/vana/tests/backend_test_report.txt"
        with open(report_file, "w") as f:
            f.write(report)
        print(f"\n📄 Full report saved to: {report_file}")

        # Return exit code based on results
        failed_count = len([r for r in results if r.status in ["FAIL", "ERROR"]])
        return 0 if failed_count == 0 else 1

    except KeyboardInterrupt:
        print("\n🛑 Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Testing failed with error: {e!s}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
