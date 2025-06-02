#!/usr/bin/env python3
"""
Enhanced ADK Agent Testing Script

This script provides automated testing capabilities for the enhanced VANA ADK agent.
It can be used to verify tool functionality and agent behavior.
"""

import logging
import os
import sys
import time
from typing import Any

# Add project root to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ADKAgentTester:
    """
    Automated testing class for the enhanced VANA ADK agent.
    """

    def __init__(self):
        """Initialize the tester."""
        self.test_results = []
        self.start_time = None

    def run_all_tests(self) -> dict[str, Any]:
        """
        Run all automated tests.

        Returns:
            Dictionary with test results
        """
        logger.info("Starting Enhanced ADK Agent Testing")
        self.start_time = time.time()

        # Test categories
        test_categories = [
            ("Tool Import Tests", self.test_tool_imports),
            ("Tool Function Tests", self.test_tool_functions),
            ("Agent Configuration Tests", self.test_agent_configuration),
            ("Error Handling Tests", self.test_error_handling),
        ]

        for category_name, test_function in test_categories:
            logger.info(f"Running {category_name}")
            try:
                results = test_function()
                self.test_results.extend(results)
            except Exception as e:
                logger.error(f"Error in {category_name}: {str(e)}")
                self.test_results.append(
                    {
                        "category": category_name,
                        "test": "Category Execution",
                        "status": "FAILED",
                        "error": str(e),
                    }
                )

        return self.generate_report()

    def test_tool_imports(self) -> list[dict[str, Any]]:
        """Test that all tools can be imported correctly."""
        results = []

        try:
            # Test importing the enhanced agent
            from vana_adk_clean.vana_agent.agent import (
                echo_tool,
                file_exists_tool,
                get_health_status_tool,
                get_info_tool,
                help_tool,
                kg_query_tool,
                kg_store_tool,
                list_directory_tool,
                read_file_tool,
                root_agent,
                vector_search_tool,
                web_search_tool,
                write_file_tool,
            )

            results.append(
                {
                    "category": "Tool Imports",
                    "test": "Import Enhanced Agent Tools",
                    "status": "PASSED",
                    "details": "All tools imported successfully",
                }
            )

        except ImportError as e:
            results.append(
                {
                    "category": "Tool Imports",
                    "test": "Import Enhanced Agent Tools",
                    "status": "FAILED",
                    "error": str(e),
                }
            )

        return results

    def test_tool_functions(self) -> list[dict[str, Any]]:
        """Test individual tool functions."""
        results = []

        try:
            from vana_adk_clean.vana_agent.agent import (
                echo_tool,
                get_health_status_tool,
                get_info_tool,
                help_tool,
                kg_query_tool,
                kg_store_tool,
                vector_search_tool,
                web_search_tool,
            )

            # Test echo tool
            echo_result = echo_tool("test message")
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "Echo Tool",
                    "status": "PASSED"
                    if "Echo: test message" in echo_result
                    else "FAILED",
                    "details": f"Result: {echo_result}",
                }
            )

            # Test info tool
            info_result = get_info_tool()
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "Get Info Tool",
                    "status": "PASSED" if "VANA" in info_result else "FAILED",
                    "details": f"Length: {len(info_result)} characters",
                }
            )

            # Test help tool
            help_result = help_tool()
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "Help Tool",
                    "status": "PASSED" if "TOOL COMMANDS" in help_result else "FAILED",
                    "details": f"Length: {len(help_result)} characters",
                }
            )

            # Test vector search tool
            vector_result = vector_search_tool("test query")
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "Vector Search Tool",
                    "status": "PASSED"
                    if "Vector search results" in vector_result
                    else "FAILED",
                    "details": f"Contains results: {'Vector search results' in vector_result}",
                }
            )

            # Test web search tool
            web_result = web_search_tool("test query")
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "Web Search Tool",
                    "status": "PASSED"
                    if "Web search results" in web_result
                    else "FAILED",
                    "details": f"Contains results: {'Web search results' in web_result}",
                }
            )

            # Test knowledge graph query
            kg_result = kg_query_tool("test entity")
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "KG Query Tool",
                    "status": "PASSED"
                    if "Knowledge graph results" in kg_result
                    else "FAILED",
                    "details": f"Contains results: {'Knowledge graph results' in kg_result}",
                }
            )

            # Test knowledge graph store
            kg_store_result = kg_store_tool(
                "test_entity", "test_type", "test observation"
            )
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "KG Store Tool",
                    "status": "PASSED"
                    if "Successfully stored" in kg_store_result
                    else "FAILED",
                    "details": f"Contains success: {'Successfully stored' in kg_store_result}",
                }
            )

            # Test health status
            health_result = get_health_status_tool()
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "Health Status Tool",
                    "status": "PASSED"
                    if "System Health Status" in health_result
                    else "FAILED",
                    "details": f"Contains status: {'System Health Status' in health_result}",
                }
            )

        except Exception as e:
            results.append(
                {
                    "category": "Tool Functions",
                    "test": "Tool Function Testing",
                    "status": "FAILED",
                    "error": str(e),
                }
            )

        return results

    def test_agent_configuration(self) -> list[dict[str, Any]]:
        """Test agent configuration and setup."""
        results = []

        try:
            from vana_adk_clean.vana_agent.agent import root_agent

            # Test agent properties
            results.append(
                {
                    "category": "Agent Configuration",
                    "test": "Agent Name",
                    "status": "PASSED" if root_agent.name == "vana" else "FAILED",
                    "details": f"Agent name: {root_agent.name}",
                }
            )

            # Test agent model
            model_check = hasattr(root_agent, "model") or hasattr(root_agent, "_model")
            results.append(
                {
                    "category": "Agent Configuration",
                    "test": "Agent Model",
                    "status": "PASSED" if model_check else "FAILED",
                    "details": f"Model configured: {model_check}",
                }
            )

            # Test tools count
            tools_count = len(root_agent.tools) if hasattr(root_agent, "tools") else 0
            results.append(
                {
                    "category": "Agent Configuration",
                    "test": "Tools Count",
                    "status": "PASSED" if tools_count >= 10 else "FAILED",
                    "details": f"Tools count: {tools_count}",
                }
            )

        except Exception as e:
            results.append(
                {
                    "category": "Agent Configuration",
                    "test": "Agent Configuration Testing",
                    "status": "FAILED",
                    "error": str(e),
                }
            )

        return results

    def test_error_handling(self) -> list[dict[str, Any]]:
        """Test error handling in tools."""
        results = []

        try:
            from vana_adk_clean.vana_agent.agent import (
                kg_query_tool,
                kg_store_tool,
                vector_search_tool,
                web_search_tool,
            )

            # Test empty query handling
            empty_vector = vector_search_tool("")
            results.append(
                {
                    "category": "Error Handling",
                    "test": "Empty Vector Query",
                    "status": "PASSED" if "Error" in empty_vector else "FAILED",
                    "details": f"Handles empty query: {'Error' in empty_vector}",
                }
            )

            empty_web = web_search_tool("")
            results.append(
                {
                    "category": "Error Handling",
                    "test": "Empty Web Query",
                    "status": "PASSED" if "Error" in empty_web else "FAILED",
                    "details": f"Handles empty query: {'Error' in empty_web}",
                }
            )

            empty_kg = kg_query_tool("")
            results.append(
                {
                    "category": "Error Handling",
                    "test": "Empty KG Query",
                    "status": "PASSED" if "Error" in empty_kg else "FAILED",
                    "details": f"Handles empty query: {'Error' in empty_kg}",
                }
            )

            # Test incomplete KG store
            incomplete_kg = kg_store_tool("", "", "")
            results.append(
                {
                    "category": "Error Handling",
                    "test": "Incomplete KG Store",
                    "status": "PASSED" if "Error" in incomplete_kg else "FAILED",
                    "details": f"Handles incomplete data: {'Error' in incomplete_kg}",
                }
            )

        except Exception as e:
            results.append(
                {
                    "category": "Error Handling",
                    "test": "Error Handling Testing",
                    "status": "FAILED",
                    "error": str(e),
                }
            )

        return results

    def generate_report(self) -> dict[str, Any]:
        """Generate a comprehensive test report."""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASSED"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAILED"])

        end_time = time.time()
        duration = end_time - self.start_time if self.start_time else 0

        report = {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": (passed_tests / total_tests * 100)
                if total_tests > 0
                else 0,
                "duration_seconds": duration,
            },
            "results": self.test_results,
            "recommendations": self.generate_recommendations(),
        }

        return report

    def generate_recommendations(self) -> list[str]:
        """Generate recommendations based on test results."""
        recommendations = []

        failed_tests = [r for r in self.test_results if r["status"] == "FAILED"]

        if not failed_tests:
            recommendations.append(
                "✅ All automated tests passed! Ready for manual testing."
            )
        else:
            recommendations.append(
                f"❌ {len(failed_tests)} tests failed. Review and fix issues before manual testing."
            )

            for test in failed_tests:
                recommendations.append(f"  - Fix {test['test']} in {test['category']}")

        recommendations.extend(
            [
                "🔄 Run manual testing using the ADK web UI",
                "📊 Monitor performance during manual testing",
                "🔧 Consider implementing production integrations for mock tools",
            ]
        )

        return recommendations


def main():
    """Main function to run the tests."""
    tester = ADKAgentTester()
    report = tester.run_all_tests()

    # Print report
    print("\n" + "=" * 60)
    print("ENHANCED ADK AGENT TEST REPORT")
    print("=" * 60)

    summary = report["summary"]
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed']}")
    print(f"Failed: {summary['failed']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Duration: {summary['duration_seconds']:.2f} seconds")

    print("\nDETAILED RESULTS:")
    print("-" * 40)
    for result in report["results"]:
        status_icon = "✅" if result["status"] == "PASSED" else "❌"
        print(
            f"{status_icon} {result['category']} - {result['test']}: {result['status']}"
        )
        if "details" in result:
            print(f"   Details: {result['details']}")
        if "error" in result:
            print(f"   Error: {result['error']}")

    print("\nRECOMMENDATIONS:")
    print("-" * 40)
    for rec in report["recommendations"]:
        print(f"• {rec}")

    print("\n" + "=" * 60)

    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    exit(main())
