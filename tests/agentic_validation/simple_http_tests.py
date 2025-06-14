#!/usr/bin/env python3
"""
SIMPLE HTTP TESTING FOR AGENTIC SYSTEMS
Direct HTTP requests to validate agent behavior

This is the most practical approach for testing agentic systems:
1. Direct HTTP requests to the service
2. Response content analysis
3. Pattern validation for task ID exposure
4. Orchestrator ownership validation

Much more effective than Puppeteer for agentic AI testing.
"""

import json
import re
import time
from typing import Any, Dict, Optional

import requests

from lib.logging_config import get_logger

logger = get_logger("vana.simple_http_tests")


class SimpleAgenticTester:
    """
    Simple, effective tester for agentic systems using direct HTTP requests
    """

    def __init__(self, service_url: str = "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app"):
        self.service_url = service_url
        self.session = requests.Session()
        self.test_results = []

    def make_request(self, message: str, timeout: int = 30) -> Optional[str]:
        """
        Make a simple HTTP request to the agentic service
        """
        try:
            # Try different possible endpoints
            endpoints = ["/api/chat", "/chat", "/api/message", "/message", "/api/v1/chat", ""]  # Root endpoint

            for endpoint in endpoints:
                url = f"{self.service_url}{endpoint}"

                # Try POST request
                try:
                    response = self.session.post(
                        url,
                        json={"message": message, "query": message, "text": message},
                        headers={"Content-Type": "application/json"},
                        timeout=timeout,
                    )

                    if response.status_code == 200:
                        return response.text
                    elif response.status_code == 404:
                        continue  # Try next endpoint
                    else:
                        logger.debug(f"HTTP {response.status_code} from {url}")

                except requests.exceptions.RequestException:
                    continue  # Try next endpoint

                # Try GET request with query parameter
                try:
                    response = self.session.get(
                        url, params={"q": message, "query": message, "message": message}, timeout=timeout
                    )

                    if response.status_code == 200:
                        return response.text

                except requests.exceptions.RequestException:
                    continue  # Try next endpoint

            logger.error(f"❌ All endpoints failed for service: {self.service_url}")
            return None

        except Exception as e:
            logger.error(f"❌ Request error: {e}")
            return None

    def test_task_id_invisibility(self) -> Dict[str, Any]:
        """
        CRITICAL TEST: Ensure no task IDs are exposed to users
        """
        logger.debug("🧪 Testing Task ID Invisibility...")

        test_queries = [
            "Plan a trip to Paris from July 12th to July 16th",
            "Search for hotels in New York",
            "Find flights from London to Tokyo",
            "Generate code for a web application",
            "Test my software project",
        ]

        task_id_violations = []

        # Patterns that indicate task ID exposure (the core problem)
        violation_patterns = [
            r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}",  # UUID pattern
            r'check_task_status\(["\']([^"\']+)["\']\)',  # check_task_status calls
            r"Task ID[:\s]+([a-f0-9-]+)",  # "Task ID: ..." patterns
            r"monitor progress.*([a-f0-9-]{20,})",  # Monitor progress with IDs
            r"use.*check_task_status.*to.*monitor",  # Instructions to use check_task_status
            r"track.*progress.*with.*id",  # Track progress instructions
        ]

        for query in test_queries:
            logger.debug(f"  Testing query: {query[:50]}...")
            response = self.make_request(query)

            if response:
                # Check for task ID exposure patterns
                for pattern in violation_patterns:
                    matches = re.findall(pattern, response, re.IGNORECASE)
                    if matches:
                        task_id_violations.append(
                            {
                                "query": query,
                                "pattern": pattern,
                                "matches": matches,
                                "response_excerpt": response[:300] + "..." if len(response) > 300 else response,
                            }
                        )
                        logger.debug(f"    ❌ Found violation: {pattern}")
                        break
                else:
                    logger.debug("    ✅ No task IDs found")
            else:
                logger.debug("    ⚠️  No response received")

        result = {
            "test_name": "task_id_invisibility",
            "status": "FAIL" if task_id_violations else "PASS",
            "violations": task_id_violations,
            "details": (
                f"Found {len(task_id_violations)} task ID violations"
                if task_id_violations
                else "No task IDs exposed to users"
            ),
        }

        self.test_results.append(result)
        return result

    def test_orchestrator_ownership(self) -> Dict[str, Any]:
        """
        CRITICAL TEST: Verify orchestrator takes ownership of responses
        """
        logger.debug("🧪 Testing Orchestrator Ownership...")

        test_cases = [
            {
                "query": "What's the weather in San Francisco?",
                "forbidden_patterns": [
                    r"weather agent said",
                    r"the weather agent reports",
                    r"according to the weather agent",
                ],
                "required_patterns": [r"(I found|I can tell you|I checked|the weather is|it's|currently)"],
            },
            {
                "query": "Plan a trip to Tokyo",
                "forbidden_patterns": [
                    r"travel agent said",
                    r"the travel agent suggests",
                    r"according to the travel agent",
                ],
                "required_patterns": [r"(I'll|I will|I can|I've|I have|plan|suggest|recommend)"],
            },
            {
                "query": "Search for hotels in Miami",
                "forbidden_patterns": [r"hotel agent", r"hotel specialist said", r"the hotel search agent"],
                "required_patterns": [r"(I found|I searched|I can show you|hotels|accommodations)"],
            },
        ]

        ownership_violations = []

        for test_case in test_cases:
            query = test_case["query"]
            logger.debug(f"  Testing query: {query[:50]}...")
            response = self.make_request(query)

            if response:
                response_lower = response.lower()

                # Check for forbidden relay patterns
                for pattern in test_case["forbidden_patterns"]:
                    if re.search(pattern, response_lower, re.IGNORECASE):
                        ownership_violations.append(
                            {
                                "query": query,
                                "violation_type": "relay_pattern",
                                "pattern": pattern,
                                "response_excerpt": response[:300] + "..." if len(response) > 300 else response,
                            }
                        )
                        logger.debug(f"    ❌ Found relay pattern: {pattern}")
                        break

                # Check for required ownership patterns
                ownership_found = False
                for pattern in test_case["required_patterns"]:
                    if re.search(pattern, response_lower, re.IGNORECASE):
                        ownership_found = True
                        break

                if ownership_found:
                    logger.debug("    ✅ Ownership language found")
                else:
                    ownership_violations.append(
                        {
                            "query": query,
                            "violation_type": "no_ownership",
                            "details": "No ownership language found in response",
                            "response_excerpt": response[:300] + "..." if len(response) > 300 else response,
                        }
                    )
                    logger.debug("    ❌ No ownership language found")
            else:
                logger.debug("    ⚠️  No response received")

        result = {
            "test_name": "orchestrator_ownership",
            "status": "FAIL" if ownership_violations else "PASS",
            "violations": ownership_violations,
            "details": (
                f"Found {len(ownership_violations)} ownership violations"
                if ownership_violations
                else "Orchestrator demonstrates proper ownership"
            ),
        }

        self.test_results.append(result)
        return result

    def test_service_availability(self) -> Dict[str, Any]:
        """
        Basic test to ensure the service is available and responding
        """
        logger.debug("🧪 Testing Service Availability...")

        try:
            response = self.make_request("Hello, are you working?")

            if response and len(response) > 10:  # Got a meaningful response
                logger.debug("  ✅ Service is responding")
                result = {
                    "test_name": "service_availability",
                    "status": "PASS",
                    "details": f"Service responded with {len(response)} characters",
                }
            else:
                logger.debug("  ❌ Service not responding properly")
                result = {
                    "test_name": "service_availability",
                    "status": "FAIL",
                    "details": "No meaningful response from service",
                }

        except Exception as e:
            logger.error(f"  ❌ Service availability test failed: {e}")
            result = {"test_name": "service_availability", "status": "FAIL", "details": str(e)}

        self.test_results.append(result)
        return result

    def run_comprehensive_tests(self) -> Dict[str, Any]:
        """
        Run all HTTP-based tests for agentic system validation
        """
        logger.debug("🔬 COMPREHENSIVE HTTP TESTING FOR AGENTIC SYSTEMS")
        logger.debug("%s", "=" * 60)
        logger.debug(f"Service: {self.service_url}")
        logger.debug("%s", f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.debug("")

        # Run all tests
        tests = [self.test_service_availability, self.test_task_id_invisibility, self.test_orchestrator_ownership]

        for test_func in tests:
            logger.debug("%s", f"\n{test_func.__name__.replace('_', ' ').title()}")
            logger.debug("%s", "-" * 40)
            result = test_func()
            logger.info("%s", f"Result: {result['status']}")

        # Generate comprehensive report
        return self.generate_test_report()

    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])

        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        report = {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{success_rate:.1f}%",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "service_url": self.service_url,
            },
            "critical_issues": [],
            "test_results": self.test_results,
        }

        # Collect critical issues
        for result in self.test_results:
            if result["status"] == "FAIL":
                if "violations" in result:
                    for violation in result["violations"]:
                        report["critical_issues"].append(f"{result['test_name']}: {violation}")
                else:
                    report["critical_issues"].append(f"{result['test_name']}: {result['details']}")

        return report


def main():
    """
    Run simple HTTP testing for agentic systems
    """
    tester = SimpleAgenticTester()
    report = tester.run_comprehensive_tests()

    logger.debug("%s", "\n" + "=" * 80)
    logger.debug("🔬 COMPREHENSIVE HTTP TESTING REPORT")
    logger.debug("%s", "=" * 80)
    logger.debug("%s", json.dumps(report, indent=2))

    # Save report
    with open("simple_http_test_results.json", "w") as f:
        json.dump(report, f, indent=2)

    logger.info("\n📊 Detailed results saved to: simple_http_test_results.json")

    # Exit with appropriate code
    if report["summary"]["failed"] > 0:
        logger.error("%s", f"\n❌ {report['summary']['failed']} tests FAILED")
        return 1
    else:
        logger.debug("%s", f"\n✅ All {report['summary']['passed']} tests PASSED")
        return 0


if __name__ == "__main__":
    exit(main())
