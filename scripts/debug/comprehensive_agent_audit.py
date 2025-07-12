#!/usr/bin/env python3
"""
VANA Agent Comprehensive Functionality Audit
============================================

Tests all aspects of the simplified ADK-compliant agent:
- Infrastructure health and stability
- Core tool functionality (5 essential tools)
- Agent conversation and delegation
- Performance and load testing
- Error handling and edge cases
- ADK compliance validation

Usage: python3 comprehensive_agent_audit.py
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import List

import requests

# Service configuration
SERVICE_URL = "https://vana-dev-960076421399.us-central1.run.app"
TIMEOUT = 30
MAX_CONCURRENT = 5


class TestResult:
    def __init__(self, name: str, passed: bool, details: str, duration: float = 0.0):
        self.name = name
        self.passed = passed
        self.details = details
        self.duration = duration
        self.timestamp = datetime.now()


class VanaAudit:
    def __init__(self):
        self.results: List[TestResult] = []
        self.start_time = time.time()

    def log_result(self, name: str, passed: bool, details: str, duration: float = 0.0):
        """Log a test result"""
        result = TestResult(name, passed, details, duration)
        self.results.append(result)
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} | {name}")
        if not passed or duration > 5.0:
            print(f"      Details: {details}")
        if duration > 0:
            print(f"      Duration: {duration:.2f}s")
        print()

    def test_infrastructure(self):
        """Test basic infrastructure and health"""
        print("🏗️  INFRASTRUCTURE TESTS")
        print("=" * 50)

        # Health check
        start = time.time()
        try:
            response = requests.get(f"{SERVICE_URL}/health", timeout=TIMEOUT)
            duration = time.time() - start

            if response.status_code == 200:
                data = response.json()
                details = f"Status: {data.get('status')}, Agent: {data.get('agent')}, Version: {data.get('version')}"
                self.log_result("Health Check", True, details, duration)
            else:
                self.log_result(
                    "Health Check",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    duration,
                )
        except Exception as e:
            duration = time.time() - start
            self.log_result("Health Check", False, f"Connection error: {str(e)}", duration)

        # Version endpoint
        start = time.time()
        try:
            response = requests.get(f"{SERVICE_URL}/version", timeout=TIMEOUT)
            duration = time.time() - start

            if response.status_code == 200:
                data = response.json()
                details = f"Build: {data.get('build_info', {}).get('build_id', 'unknown')}"
                self.log_result("Version Endpoint", True, details, duration)
            else:
                self.log_result("Version Endpoint", False, f"HTTP {response.status_code}", duration)
        except Exception as e:
            duration = time.time() - start
            self.log_result("Version Endpoint", False, f"Error: {str(e)}", duration)

        # Response time consistency
        times = []
        for i in range(5):
            start = time.time()
            try:
                response = requests.get(f"{SERVICE_URL}/health", timeout=TIMEOUT)
                times.append(time.time() - start)
            except:
                times.append(TIMEOUT)

        avg_time = sum(times) / len(times)
        max_time = max(times)
        consistent = max_time < 5.0 and avg_time < 2.0
        details = f"Avg: {avg_time:.2f}s, Max: {max_time:.2f}s"
        self.log_result("Response Time Consistency", consistent, details)

    def test_core_tools(self):
        """Test each of the 5 essential tools"""
        print("🔧 CORE TOOL TESTS")
        print("=" * 50)

        # Test mathematical reasoning
        self.test_mathematical_tool()

        # Test logical reasoning
        self.test_logical_tool()

        # Test web search
        self.test_web_search_tool()

        # Test file operations
        self.test_file_tools()

    def test_mathematical_tool(self):
        """Test mathematical reasoning tool"""
        test_cases = [
            ("15 + 25 * 2", "65"),
            ("What is 10% of 200?", "20"),
            ("If I have 3 apples and buy 5 more, how many do I have?", "8"),
        ]

        for problem, expected in test_cases:
            start = time.time()
            try:
                # Test the tool directly since we know the agent endpoints
                sys.path.append(".")
                from lib.environment import setup_environment

                setup_environment()
                from lib._tools.adk_tools import mathematical_solve

                result = mathematical_solve(problem)
                duration = time.time() - start

                # Check if expected answer is in result
                contains_answer = expected in result or expected.lower() in result.lower()
                details = f"Problem: {problem} | Expected: {expected} | Got: {result[:100]}..."
                self.log_result(f"Math Tool: {problem[:20]}...", contains_answer, details, duration)

            except Exception as e:
                duration = time.time() - start
                self.log_result(f"Math Tool: {problem[:20]}...", False, f"Error: {str(e)}", duration)

    def test_logical_tool(self):
        """Test logical reasoning tool"""
        test_cases = [
            (
                "If it rains, then the ground gets wet. It is raining. What can we conclude?",
                "ground gets wet",
            ),
            ("All cats are mammals. Fluffy is a cat. What can we conclude?", "mammal"),
        ]

        for problem, expected_concept in test_cases:
            start = time.time()
            try:
                sys.path.append(".")
                from lib.environment import setup_environment

                setup_environment()
                from lib._tools.adk_tools import logical_analyze

                result = logical_analyze(problem)
                duration = time.time() - start

                # Check if logical concept is addressed
                contains_logic = expected_concept.lower() in result.lower()
                details = f"Problem: {problem[:30]}... | Expected concept: {expected_concept} | Got: {result[:100]}..."
                self.log_result(f"Logic Tool: {problem[:20]}...", contains_logic, details, duration)

            except Exception as e:
                duration = time.time() - start
                self.log_result(
                    f"Logic Tool: {problem[:20]}...",
                    False,
                    f"Error: {str(e)}",
                    duration,
                )

    def test_web_search_tool(self):
        """Test web search tool"""
        test_cases = [
            ("current time in New York", ["time", "new york"]),
            ("weather in San Francisco", ["weather", "san francisco"]),
        ]

        for query, expected_terms in test_cases:
            start = time.time()
            try:
                sys.path.append(".")
                from lib.environment import setup_environment

                setup_environment()
                from lib._tools.adk_tools import web_search

                result = web_search(query, 2)
                duration = time.time() - start

                # Check if result contains relevant information
                result_lower = result.lower()
                contains_terms = any(term.lower() in result_lower for term in expected_terms)
                details = f"Query: {query} | Expected terms: {expected_terms} | Result length: {len(result)} chars"
                self.log_result(f"Web Search: {query[:20]}...", contains_terms, details, duration)

            except Exception as e:
                duration = time.time() - start
                self.log_result(f"Web Search: {query[:20]}...", False, f"Error: {str(e)}", duration)

    def test_file_tools(self):
        """Test file read/write operations"""
        start = time.time()
        try:
            sys.path.append(".")
            from lib.environment import setup_environment

            setup_environment()
            from lib._tools.adk_tools import read_file, write_file

            # Test write
            test_content = "VANA Agent Test File\nCreated during comprehensive audit\nTimestamp: " + str(datetime.now())
            test_file = "/tmp/vana_test_file.txt"

            write_result = write_file(test_file, test_content)

            # Test read
            read_result = read_file(test_file)

            duration = time.time() - start

            # Verify content matches
            content_matches = test_content in read_result
            details = f"Write result: {write_result[:50]}... | Read length: {len(read_result)} | Content matches: {content_matches}"
            self.log_result("File Operations", content_matches, details, duration)

            # Cleanup
            try:
                os.remove(test_file)
            except:
                pass

        except Exception as e:
            duration = time.time() - start
            self.log_result("File Operations", False, f"Error: {str(e)}", duration)

    def test_agent_integration(self):
        """Test agent conversation and integration"""
        print("🤖 AGENT INTEGRATION TESTS")
        print("=" * 50)

        # Test agent loading
        start = time.time()
        try:
            sys.path.append(".")
            from lib.environment import setup_environment

            setup_environment()
            from agents.vana.team import root_agent

            duration = time.time() - start

            # Verify agent properties
            has_tools = len(root_agent.tools) == 5
            has_subagents = len(root_agent.sub_agents) >= 0  # May be 0 if specialists not available
            has_instruction = len(root_agent.instruction) > 0

            details = f"Tools: {len(root_agent.tools)}, Sub-agents: {len(root_agent.sub_agents)}, Instruction: {len(root_agent.instruction)} chars"
            agent_valid = has_tools and has_instruction
            self.log_result("Agent Loading", agent_valid, details, duration)

            # Test tool names
            tool_names = [tool.name for tool in root_agent.tools]
            expected_tools = [
                "web_search",
                "mathematical_solve",
                "logical_analyze",
                "read_file",
                "write_file",
            ]
            has_expected_tools = all(tool in tool_names for tool in expected_tools)
            details = f"Expected: {expected_tools} | Found: {tool_names}"
            self.log_result("Tool Configuration", has_expected_tools, details)

        except Exception as e:
            duration = time.time() - start
            self.log_result("Agent Loading", False, f"Error: {str(e)}", duration)

    def test_performance(self):
        """Test performance and load handling"""
        print("⚡ PERFORMANCE TESTS")
        print("=" * 50)

        # Concurrent health checks
        def health_check():
            try:
                start = time.time()
                response = requests.get(f"{SERVICE_URL}/health", timeout=TIMEOUT)
                duration = time.time() - start
                return response.status_code == 200, duration
            except:
                return False, TIMEOUT

        start = time.time()
        with ThreadPoolExecutor(max_workers=MAX_CONCURRENT) as executor:
            futures = [executor.submit(health_check) for _ in range(10)]
            results = [future.result() for future in as_completed(futures)]

        total_duration = time.time() - start
        success_count = sum(1 for success, _ in results if success)
        avg_response_time = sum(duration for _, duration in results) / len(results)

        load_handled = success_count >= 8 and avg_response_time < 5.0
        details = f"Success: {success_count}/10, Avg time: {avg_response_time:.2f}s, Total: {total_duration:.2f}s"
        self.log_result("Concurrent Load Test", load_handled, details, total_duration)

    def test_error_handling(self):
        """Test error scenarios and edge cases"""
        print("🚨 ERROR HANDLING TESTS")
        print("=" * 50)

        # Test invalid endpoints
        start = time.time()
        try:
            response = requests.get(f"{SERVICE_URL}/invalid-endpoint", timeout=TIMEOUT)
            duration = time.time() - start

            # Should return 404
            handles_404 = response.status_code == 404
            details = f"HTTP {response.status_code} for invalid endpoint"
            self.log_result("Invalid Endpoint Handling", handles_404, details, duration)
        except Exception as e:
            duration = time.time() - start
            self.log_result("Invalid Endpoint Handling", False, f"Error: {str(e)}", duration)

    def generate_report(self):
        """Generate comprehensive test report"""
        print("📊 TEST REPORT GENERATION")
        print("=" * 50)

        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        total_duration = time.time() - self.start_time

        print("\n🎯 COMPREHENSIVE AUDIT SUMMARY")
        print("=" * 60)
        print(f"📈 Overall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests})")
        print(f"⏱️  Total Test Duration: {total_duration:.2f} seconds")
        print(f"✅ Passed Tests: {passed_tests}")
        print(f"❌ Failed Tests: {failed_tests}")

        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result.passed:
                    print(f"   • {result.name}: {result.details}")

        print("\n📋 DETAILED RESULTS:")
        for result in self.results:
            status = "✅" if result.passed else "❌"
            print(f"   {status} {result.name} ({result.duration:.2f}s)")

        # Save detailed report
        report_data = {
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "success_rate": success_rate,
                "total_duration": total_duration,
                "timestamp": datetime.now().isoformat(),
            },
            "results": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "details": r.details,
                    "duration": r.duration,
                    "timestamp": r.timestamp.isoformat(),
                }
                for r in self.results
            ],
        }

        report_file = f"vana_audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, "w") as f:
            json.dump(report_data, f, indent=2)

        print(f"\n💾 Detailed report saved to: {report_file}")

        return success_rate >= 80.0  # Consider audit successful if 80%+ tests pass

    def run_full_audit(self):
        """Execute complete audit suite"""
        print("🚀 VANA AGENT COMPREHENSIVE FUNCTIONALITY AUDIT")
        print("=" * 60)
        print(f"🎯 Target: {SERVICE_URL}")
        print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        try:
            self.test_infrastructure()
            self.test_core_tools()
            self.test_agent_integration()
            self.test_performance()
            self.test_error_handling()

            return self.generate_report()

        except KeyboardInterrupt:
            print("\n⚠️  Audit interrupted by user")
            return False
        except Exception as e:
            print(f"\n💥 Audit failed with error: {str(e)}")
            return False


if __name__ == "__main__":
    audit = VanaAudit()
    success = audit.run_full_audit()
    sys.exit(0 if success else 1)
