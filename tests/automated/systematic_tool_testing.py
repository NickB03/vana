#!/usr/bin/env python3
"""
Systematic Tool Testing Script for VANA Agent System
Tests all 16 tools to ensure they're working as intended.
"""

import time
from typing import Any, Dict, List

import requests

from lib.logging_config import get_logger

logger = get_logger("vana.systematic_tool_testing")


class VanaToolTester:
    def __init__(self, base_url: str = "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app"):
        self.base_url = base_url
        self.chat_endpoint = f"{base_url}/run"
        self.health_endpoint = f"{base_url}/health"
        self.info_endpoint = f"{base_url}/info"
        self.app_name = "vana"
        self.user_id = "test_user"
        self.session_id = "test_session"
        self.create_session_endpoint = f"{base_url}/apps/{self.app_name}/users/{self.user_id}/sessions"
        self.results = {}
        self.session_created = False

    def create_session(self) -> bool:
        """Create a session for testing."""
        try:
            payload = {"sessionId": self.session_id}
            response = requests.post(
                self.create_session_endpoint, json=payload, timeout=10, headers={"Content-Type": "application/json"}
            )

            if response.status_code in [200, 201]:
                self.session_created = True
                logger.debug(f"✅ Session created: {self.session_id}")
                return True
            else:
                logger.error(f"❌ Session creation failed: HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Session creation failed: {e}")
            return False

    def test_health(self) -> bool:
        """Test if the service is healthy."""
        try:
            response = requests.get(self.health_endpoint, timeout=10)
            return response.status_code == 200 and response.json().get("status") == "healthy"
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False

    def send_message(self, message: str) -> Dict[str, Any]:
        """Send a message to the VANA agent and get response."""
        try:
            payload = {
                "appName": self.app_name,
                "userId": self.user_id,
                "sessionId": self.session_id,
                "newMessage": {"parts": [{"text": message}], "role": "user"},
                "streaming": False,
            }
            response = requests.post(
                self.chat_endpoint, json=payload, timeout=30, headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                return {"success": True, "response": response.json(), "status_code": response.status_code}
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}",
                    "status_code": response.status_code,
                }
        except Exception as e:
            return {"success": False, "error": str(e), "status_code": None}

    def test_tool(self, tool_name: str, test_message: str, expected_keywords: List[str] = None) -> Dict[str, Any]:
        """Test a specific tool with a message and check for expected keywords."""
        logger.debug(f"\n🧪 Testing {tool_name}...")
        logger.debug(f"📝 Message: {test_message}")

        result = self.send_message(test_message)

        if result["success"]:
            response_text = str(result["response"])

            # Check for expected keywords if provided
            keywords_found = []
            keywords_missing = []

            if expected_keywords:
                for keyword in expected_keywords:
                    if keyword.lower() in response_text.lower():
                        keywords_found.append(keyword)
                    else:
                        keywords_missing.append(keyword)

            # Determine if test passed
            test_passed = (
                result["success"]
                and "not found" not in response_text.lower()
                and "error" not in response_text.lower()
                and (not expected_keywords or len(keywords_missing) == 0)
            )

            test_result = {
                "tool": tool_name,
                "message": test_message,
                "success": result["success"],
                "test_passed": test_passed,
                "response": result["response"],
                "keywords_found": keywords_found,
                "keywords_missing": keywords_missing,
                "response_length": len(response_text),
            }

            status = "✅ PASS" if test_passed else "❌ FAIL"
            logger.info(f"📊 Result: {status}")
            if keywords_found:
                logger.debug(f"🔍 Keywords found: {keywords_found}")
            if keywords_missing:
                logger.debug(f"⚠️ Keywords missing: {keywords_missing}")

        else:
            test_result = {
                "tool": tool_name,
                "message": test_message,
                "success": False,
                "test_passed": False,
                "error": result["error"],
                "status_code": result.get("status_code"),
            }
            logger.error("%s", f"📊 Result: ❌ FAIL - {result['error']}")

        self.results[tool_name] = test_result
        time.sleep(1)  # Brief pause between tests
        return test_result

    def run_systematic_tests(self):
        """Run systematic tests on all 16 tools."""
        logger.info("🚀 Starting Systematic Tool Testing for VANA Agent System")
        logger.debug("%s", "=" * 60)

        # Check health first
        if not self.test_health():
            logger.error("❌ Service health check failed. Aborting tests.")
            return

        logger.debug("✅ Service health check passed.")

        # Create session
        if not self.create_session():
            logger.error("❌ Session creation failed. Aborting tests.")
            return

        logger.info("✅ Session created. Starting tool tests...")

        # Category 1: System Tools
        logger.debug("\n📁 CATEGORY 1: SYSTEM TOOLS (4 tools)")
        self.test_tool("echo", "echo systematic testing tool 1", ["systematic", "testing"])
        self.test_tool("health_status", "get health status", ["health", "status"])
        self.test_tool("coordinate_task", "coordinate task for testing", ["coordinate", "task"])
        self.test_tool("ask_for_approval", "ask for approval to proceed", ["approval", "proceed"])

        # Category 2: File System Tools
        logger.debug("\n📁 CATEGORY 2: FILE SYSTEM TOOLS (4 tools)")
        self.test_tool("read_file", "read file README.md", ["read", "file"])
        self.test_tool("write_file", "write file test.txt with content hello", ["write", "file"])
        self.test_tool("list_directory", "list directory contents", ["list", "directory"])
        self.test_tool("file_exists", "check if file README.md exists", ["file", "exists"])

        # Category 3: Search Tools
        logger.debug("\n📁 CATEGORY 3: SEARCH TOOLS (3 tools)")
        self.test_tool("vector_search", "vector search for documentation", ["vector", "search"])
        self.test_tool("web_search", "web search for python tutorials", ["web", "search"])
        self.test_tool("search_knowledge", "search knowledge about AI", ["knowledge", "search"])

        # Category 4: Reporting Tools
        logger.debug("\n📁 CATEGORY 4: REPORTING TOOLS (1 tool)")
        self.test_tool("generate_report", "generate report on system status", ["report", "generate"])

        # Category 5: Agent Tools
        logger.debug("\n📁 CATEGORY 5: AGENT TOOLS (4 tools)")
        self.test_tool("architecture_tool", "architecture tool design microservices", ["architecture", "microservices"])
        self.test_tool("ui_tool", "ui tool design dashboard", ["ui", "dashboard"])
        self.test_tool("devops_tool", "devops tool deployment strategy", ["devops", "deployment"])
        self.test_tool("qa_tool", "qa tool testing strategy", ["qa", "testing"])

    def print_summary(self):
        """Print a summary of all test results."""
        logger.debug("%s", "\n" + "=" * 60)
        logger.debug("📊 SYSTEMATIC TESTING SUMMARY")
        logger.debug("%s", "=" * 60)

        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results.values() if result.get("test_passed", False))
        failed_tests = total_tests - passed_tests

        logger.debug(f"📈 Total Tests: {total_tests}")
        logger.debug(f"✅ Passed: {passed_tests}")
        logger.error(f"❌ Failed: {failed_tests}")
        logger.info(f"📊 Success Rate: {(passed_tests/total_tests)*100:.1f}%")

        if failed_tests > 0:
            logger.error(f"\n❌ FAILED TOOLS:")
            for tool, result in self.results.items():
                if not result.get("test_passed", False):
                    error = result.get("error", "Test criteria not met")
                    logger.error(f"  - {tool}: {error}")

        logger.debug(f"\n✅ WORKING TOOLS:")
        for tool, result in self.results.items():
            if result.get("test_passed", False):
                logger.debug(f"  - {tool}: Working correctly")


if __name__ == "__main__":
    tester = VanaToolTester()
    tester.run_systematic_tests()
    tester.print_summary()
