#!/usr/bin/env python3
"""
Juno Test Agent

This script implements a Juno agent that can act as a human tester
for the Vana agent. It runs test cases and analyzes the results.
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Any

# Add the project root to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from google.adk.agents import Agent
    from google.adk.run import Runner

    from vana.agent import root_agent
except ImportError:
    print(
        "Error: Unable to import ADK modules. Make sure you're in the correct virtual environment."
    )
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("juno_test_results.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class JunoTestAgent:
    """Juno Test Agent for testing Vana"""

    def __init__(self, test_cases_file: str = None):
        """Initialize the Juno test agent"""
        # Create Juno agent
        self.juno = Agent(
            name="juno",
            model=os.getenv("MODEL", "gemini-2.0-flash"),
            description="Test Specialist",
            instruction="""You are Juno, the Test Specialist for Project VANA.

            Your responsibilities include:
            1. Testing the Vana agent's capabilities
            2. Analyzing responses for accuracy and completeness
            3. Providing detailed test reports
            4. Identifying areas for improvement

            When testing Vana, you should:
            1. Ask clear, specific questions
            2. Verify that responses contain expected information
            3. Check for proper source attribution
            4. Evaluate the overall quality of responses

            Be thorough, objective, and constructive in your analysis.
            """,
        )

        # Create a runner for Juno
        self.juno_runner = Runner(self.juno)

        # Create a runner for Vana
        self.vana_runner = Runner(root_agent)

        # Load test cases
        self.test_cases = []
        self.results = []

        if test_cases_file:
            self.load_test_cases(test_cases_file)

    def load_test_cases(self, file_path: str) -> None:
        """Load test cases from a JSON file"""
        try:
            with open(file_path) as f:
                self.test_cases = json.load(f)
            logger.info(f"Loaded {len(self.test_cases)} test cases from {file_path}")
        except Exception as e:
            logger.error(f"Error loading test cases: {str(e)}")
            sys.exit(1)

    def run_test(self, test_case: dict[str, Any]) -> dict[str, Any]:
        """Run a single test case"""
        test_id = test_case.get("id", "unknown")
        description = test_case.get("description", "No description")
        question = test_case.get("question", "")
        expected_sources = test_case.get("expected_sources", [])
        expected_keywords = test_case.get("expected_keywords", [])

        logger.info(f"Running test {test_id}: {description}")

        # Juno asks Vana a question
        juno_prompt = f"""
        I need to test Vana's capabilities with the following test case:

        Test ID: {test_id}
        Description: {description}

        I will now ask Vana this question: "{question}"

        Expected sources to be referenced: {', '.join(expected_sources) if expected_sources else 'Any relevant sources'}
        Expected keywords in the response: {', '.join(expected_keywords) if expected_keywords else 'Any relevant information'}
        """

        logger.info(f"Juno's prompt: {juno_prompt}")

        # Get Vana's response to the question
        try:
            vana_response = self.vana_runner.run(question)
            vana_response_text = vana_response.text
        except Exception as e:
            logger.error(f"Error getting Vana's response: {str(e)}")
            return {
                "id": test_id,
                "status": "ERROR",
                "description": description,
                "question": question,
                "vana_response": str(e),
                "juno_analysis": f"Test failed due to error: {str(e)}",
                "timestamp": datetime.now().isoformat(),
            }

        logger.info(f"Vana's response: {vana_response_text}")

        # Juno analyzes Vana's response
        juno_analysis_prompt = f"""
        I asked Vana this question: "{question}"

        Vana's response was:
        ---
        {vana_response_text}
        ---

        Please analyze this response based on the following criteria:

        1. Expected sources to be referenced: {', '.join(expected_sources) if expected_sources else 'Any relevant sources'}
        2. Expected keywords in the response: {', '.join(expected_keywords) if expected_keywords else 'Any relevant information'}
        3. Overall accuracy and completeness
        4. Proper attribution of sources

        Provide a detailed analysis and determine if the test PASSED or FAILED.
        """

        try:
            juno_analysis = self.juno_runner.run(juno_analysis_prompt)
            juno_analysis_text = juno_analysis.text
        except Exception as e:
            logger.error(f"Error getting Juno's analysis: {str(e)}")
            juno_analysis_text = f"Error analyzing response: {str(e)}"

        logger.info(f"Juno's analysis: {juno_analysis_text}")

        # Determine test status based on Juno's analysis
        status = "PASS" if "PASSED" in juno_analysis_text.upper() else "FAIL"

        # Record the result
        result = {
            "id": test_id,
            "status": status,
            "description": description,
            "question": question,
            "vana_response": vana_response_text,
            "juno_analysis": juno_analysis_text,
            "expected_sources": expected_sources,
            "expected_keywords": expected_keywords,
            "timestamp": datetime.now().isoformat(),
        }

        logger.info(f"Test {test_id} result: {status}")
        return result

    def run_all_tests(self) -> list[dict[str, Any]]:
        """Run all test cases"""
        self.results = []

        for test_case in self.test_cases:
            result = self.run_test(test_case)
            self.results.append(result)
            # Add a delay between tests to avoid rate limiting
            time.sleep(2)

        return self.results

    def generate_report(self, output_file: str = "juno_test_report.json") -> None:
        """Generate a test report"""
        if not self.results:
            logger.warning("No test results to report")
            return

        # Calculate summary statistics
        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        errors = sum(1 for r in self.results if r["status"] == "ERROR")

        report = {
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "pass_rate": round(passed / total * 100, 2) if total > 0 else 0,
            },
            "results": self.results,
            "timestamp": datetime.now().isoformat(),
        }

        # Save the report
        try:
            with open(output_file, "w") as f:
                json.dump(report, f, indent=2)
            logger.info(f"Test report saved to {output_file}")

            # Print summary to console
            print("\n=== Test Results Summary ===")
            print(f"Total tests: {total}")
            print(f"Passed: {passed}")
            print(f"Failed: {failed}")
            print(f"Errors: {errors}")
            print(f"Pass rate: {report['summary']['pass_rate']}%")
            print("===========================\n")

            # Generate a detailed report for Juno to present
            juno_report_prompt = f"""
            I have completed testing of the Vana agent with the following results:

            Total tests: {total}
            Passed: {passed}
            Failed: {failed}
            Errors: {errors}
            Pass rate: {report['summary']['pass_rate']}%

            Please provide a detailed analysis of these results, highlighting:

            1. Overall assessment of Vana's performance
            2. Areas where Vana performed well
            3. Areas that need improvement
            4. Recommendations for enhancing Vana's capabilities

            Include specific examples from the test results to support your analysis.
            """

            juno_final_report = self.juno_runner.run(juno_report_prompt)

            # Save Juno's final report
            with open(output_file.replace(".json", "_juno_analysis.md"), "w") as f:
                f.write(juno_final_report.text)

            print("\n=== Juno's Analysis ===")
            print(juno_final_report.text)
            print("=======================\n")

        except Exception as e:
            logger.error(f"Error saving test report: {str(e)}")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Juno Test Agent for Vana")
    parser.add_argument(
        "--test-cases", "-t", type=str, help="Path to test cases JSON file"
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="juno_test_report.json",
        help="Path to output report file",
    )
    parser.add_argument(
        "--single-test", "-s", type=str, help="Run a single test by ID (e.g., TC001)"
    )

    args = parser.parse_args()

    if not args.test_cases:
        parser.print_help()
        sys.exit(1)

    juno = JunoTestAgent(args.test_cases)

    if args.single_test:
        # Run a single test
        test_case = next(
            (tc for tc in juno.test_cases if tc["id"] == args.single_test), None
        )
        if test_case:
            result = juno.run_test(test_case)
            juno.results = [result]
            juno.generate_report(args.output)
        else:
            logger.error(f"Test case {args.single_test} not found")
            sys.exit(1)
    else:
        # Run all tests
        juno.run_all_tests()
        juno.generate_report(args.output)


if __name__ == "__main__":
    main()
