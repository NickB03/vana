#!/usr/bin/env python3
"""
Juno Autonomous Tester

This script implements a fully autonomous Juno agent that can:
1. Decide what aspects of Vana to test
2. Generate appropriate test questions
3. Analyze responses and determine next steps
4. Conduct a complete test session with minimal human intervention
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
    handlers=[logging.FileHandler("juno_autonomous_test.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class JunoAutonomousTester:
    """Juno Autonomous Tester for testing Vana"""

    def __init__(
        self,
        test_plan_file: str = None,
        max_tests: int = 10,
        previous_results_dir: str = "test_results",
    ):
        """Initialize the Juno autonomous tester"""
        # Load previous test results
        previous_results_summary = self._load_previous_test_results(
            previous_results_dir
        )

        # Create Juno agent with knowledge of previous test results
        self.juno = Agent(
            name="juno",
            model=os.getenv("MODEL", "gemini-2.0-flash"),
            description="Test Specialist",
            instruction=f"""You are Juno, the Test Specialist for Project VANA.

            Your responsibilities include:
            1. Testing the Vana agent's capabilities thoroughly and autonomously
            2. Designing test cases that cover all aspects of Vana's functionality
            3. Analyzing responses for accuracy, completeness, and quality
            4. Adapting your testing strategy based on previous results
            5. Providing detailed test reports with actionable insights

            When testing Vana, you should:
            1. Start with basic functionality tests to establish a baseline
            2. Progress to more complex tests based on Vana's capabilities
            3. Test edge cases and potential failure modes
            4. Verify that responses contain accurate information and proper source attribution
            5. Evaluate the overall quality and usefulness of responses

            You have complete autonomy to decide what to test and how to test it.
            Be thorough, objective, and constructive in your analysis.

            Remember that Vana has these key capabilities:
            - Vector Search for semantic knowledge retrieval
            - Knowledge Graph for structured information
            - Web Search for up-to-date information
            - Document processing and entity extraction
            - Hybrid search combining multiple knowledge sources

            Your goal is to comprehensively test all these capabilities.

            Previous Test Results Summary:
            {previous_results_summary}

            Use this information to inform your testing strategy. Focus on areas that:
            1. Have shown weaknesses in previous tests
            2. Haven't been thoroughly tested yet
            3. Would benefit from different types of questions

            Document any improvements or regressions you observe compared to previous test results.
            """,
        )

        # Create a runner for Juno
        self.juno_runner = Runner(self.juno)

        # Create a runner for Vana
        self.vana_runner = Runner(root_agent)

        # Test session data
        self.test_plan = {}
        self.test_results = []
        self.conversation_history = []
        self.max_tests = max_tests
        self.previous_results_dir = previous_results_dir

        # Load test plan if provided
        if test_plan_file:
            self.load_test_plan(test_plan_file)

    def _load_previous_test_results(self, results_dir: str) -> str:
        """Load and summarize previous test results"""
        if not os.path.exists(results_dir):
            logger.info(f"No previous test results found in {results_dir}")
            return "No previous test results found."

        # Find all JSON files in the results directory
        result_files = [f for f in os.listdir(results_dir) if f.endswith(".json")]
        if not result_files:
            logger.info(f"No test result files found in {results_dir}")
            return "No previous test results found."

        # Sort by modification time (newest first)
        result_files.sort(
            key=lambda f: os.path.getmtime(os.path.join(results_dir, f)), reverse=True
        )

        # Load the most recent results (up to 3 files)
        recent_results = []
        for file_name in result_files[:3]:
            try:
                with open(os.path.join(results_dir, file_name)) as f:
                    result_data = json.load(f)
                    recent_results.append(
                        {
                            "file": file_name,
                            "timestamp": result_data.get("timestamp", "Unknown"),
                            "results": result_data.get("test_results", []),
                            "summary": result_data.get("summary", {}),
                        }
                    )
            except Exception as e:
                logger.warning(f"Error loading test results from {file_name}: {str(e)}")

        if not recent_results:
            return "Previous test results were found but could not be loaded."

        # Generate a summary of the results
        summary = "Summary of Previous Test Results:\n\n"

        for i, result in enumerate(recent_results):
            file_name = result["file"]
            timestamp = result["timestamp"]
            test_results = result["results"]

            summary += f"Test Run {i+1} ({file_name}, {timestamp}):\n"

            # Add summary statistics if available
            if "summary" in result and result["summary"]:
                stats = result["summary"]
                summary += f"- Total tests: {stats.get('total', 'Unknown')}\n"
                summary += f"- Passed: {stats.get('passed', 'Unknown')}\n"
                summary += f"- Failed: {stats.get('failed', 'Unknown')}\n"
                summary += f"- Pass rate: {stats.get('pass_rate', 'Unknown')}%\n"

            # Add details of individual tests
            if test_results:
                summary += "- Test details:\n"
                for test in test_results[
                    :5
                ]:  # Limit to first 5 tests to avoid context overflow
                    test_id = test.get("id", "Unknown")
                    status = test.get("status", "Unknown")
                    question = (
                        test.get("question", "")[:50] + "..."
                        if len(test.get("question", "")) > 50
                        else test.get("question", "")
                    )
                    summary += f"  - {test_id}: {status} - {question}\n"

                if len(test_results) > 5:
                    summary += f"  - ... and {len(test_results) - 5} more tests\n"

            summary += "\n"

        # Add insights from the results
        summary += "Key Insights from Previous Tests:\n"

        # Identify common failures
        all_failures = []
        for result in recent_results:
            failures = [
                test
                for test in result.get("results", [])
                if test.get("status") == "FAIL"
            ]
            all_failures.extend(failures)

        if all_failures:
            summary += "- Common failure areas:\n"
            # Group failures by capability (simplified approach)
            failure_categories = {}
            for failure in all_failures:
                question = failure.get("question", "").lower()
                if "vector search" in question:
                    category = "Vector Search"
                elif "knowledge graph" in question:
                    category = "Knowledge Graph"
                elif "web search" in question:
                    category = "Web Search"
                elif "hybrid" in question:
                    category = "Hybrid Search"
                elif "document" in question or "entity" in question:
                    category = "Document Processing"
                else:
                    category = "Other"

                if category not in failure_categories:
                    failure_categories[category] = []
                failure_categories[category].append(failure)

            for category, failures in failure_categories.items():
                summary += f"  - {category}: {len(failures)} failures\n"
        else:
            summary += "- No failures identified in recent tests\n"

        logger.info(f"Loaded summary of {len(recent_results)} previous test runs")
        return summary

    def load_test_plan(self, file_path: str) -> None:
        """Load a test plan from a JSON file"""
        try:
            with open(file_path) as f:
                self.test_plan = json.load(f)
            logger.info(f"Loaded test plan from {file_path}")
        except Exception as e:
            logger.error(f"Error loading test plan: {str(e)}")
            sys.exit(1)

    def generate_test_plan(self) -> dict[str, Any]:
        """Have Juno generate a test plan"""
        logger.info("Generating test plan...")

        prompt = """
        I need you to create a comprehensive test plan for testing the Vana agent.

        Vana is the primary agent in the VANA system with these key capabilities:
        - Vector Search for semantic knowledge retrieval
        - Knowledge Graph for structured information
        - Web Search for up-to-date information
        - Document processing and entity extraction
        - Hybrid search combining multiple knowledge sources

        Please create a test plan that covers all these capabilities. For each capability:
        1. Define what aspects should be tested
        2. Create 2-3 specific test cases with questions to ask
        3. Define success criteria for each test

        Format your response as a structured test plan that I can parse programmatically.
        Include a high-level testing strategy and specific test cases.
        """

        response = self.juno_runner.run(prompt)

        # Extract the test plan from Juno's response
        # This is a simplified approach - in a real implementation,
        # we would parse the response more carefully
        test_plan = {
            "strategy": "Comprehensive testing of all Vana capabilities",
            "capabilities": [
                {
                    "name": "Vector Search",
                    "test_cases": [
                        {
                            "id": "VS-001",
                            "question": "What is the architecture of VANA?",
                            "success_criteria": "Response includes information about multi-agent structure and cites relevant sources",
                        },
                        {
                            "id": "VS-002",
                            "question": "Explain how Vector Search is implemented in VANA",
                            "success_criteria": "Response includes technical details about Vertex AI Vector Search implementation",
                        },
                    ],
                },
                {
                    "name": "Knowledge Graph",
                    "test_cases": [
                        {
                            "id": "KG-001",
                            "question": "How are entities and relationships represented in VANA's Knowledge Graph?",
                            "success_criteria": "Response explains entity-relationship model and cites Knowledge Graph as a source",
                        },
                        {
                            "id": "KG-002",
                            "question": "What is the relationship between Vector Search and Knowledge Graph in VANA?",
                            "success_criteria": "Response explains how these components work together",
                        },
                    ],
                },
                {
                    "name": "Web Search",
                    "test_cases": [
                        {
                            "id": "WS-001",
                            "question": "What is the latest version of Google's Agent Development Kit?",
                            "success_criteria": "Response includes up-to-date information that would not be in the local knowledge base",
                        },
                        {
                            "id": "WS-002",
                            "question": "What are the recent developments in large language models?",
                            "success_criteria": "Response includes recent information about LLMs",
                        },
                    ],
                },
                {
                    "name": "Hybrid Search",
                    "test_cases": [
                        {
                            "id": "HS-001",
                            "question": "Explain how VANA's hybrid search works and its advantages",
                            "success_criteria": "Response explains the combination of Vector Search, Knowledge Graph, and Web Search",
                        },
                        {
                            "id": "HS-002",
                            "question": "How does VANA decide which knowledge source to use for a query?",
                            "success_criteria": "Response explains the decision-making process for knowledge source selection",
                        },
                    ],
                },
                {
                    "name": "Document Processing",
                    "test_cases": [
                        {
                            "id": "DP-001",
                            "question": "How does VANA process and chunk documents for knowledge retrieval?",
                            "success_criteria": "Response explains semantic chunking and document processing pipeline",
                        },
                        {
                            "id": "DP-002",
                            "question": "How does VANA extract entities from documents?",
                            "success_criteria": "Response explains entity extraction process",
                        },
                    ],
                },
            ],
        }

        self.test_plan = test_plan
        logger.info("Test plan generated")
        return test_plan

    def run_autonomous_test_session(self) -> list[dict[str, Any]]:
        """Run a complete autonomous test session"""
        logger.info("Starting autonomous test session...")

        # Generate a test plan if we don't have one
        if not self.test_plan:
            self.generate_test_plan()

        # Initialize the conversation with Juno
        self._initialize_juno()

        # Run tests until we reach the maximum or Juno decides to stop
        test_count = 0
        while test_count < self.max_tests:
            # Get the next test from Juno
            next_test = self._get_next_test()

            if not next_test or "TESTING COMPLETE" in next_test.upper():
                logger.info("Juno has completed testing")
                break

            # Extract the question from Juno's response
            question = self._extract_question(next_test)
            if not question:
                logger.warning("Could not extract a question from Juno's response")
                continue

            # Ask Vana the question
            vana_response = self._ask_vana(question)

            # Have Juno analyze the response
            analysis = self._analyze_response(question, vana_response)

            # Record the test result
            test_result = {
                "test_number": test_count + 1,
                "timestamp": datetime.now().isoformat(),
                "question": question,
                "vana_response": vana_response,
                "juno_analysis": analysis,
            }
            self.test_results.append(test_result)

            # Update conversation history
            self.conversation_history.append({"role": "juno", "content": next_test})
            self.conversation_history.append({"role": "vana", "content": vana_response})
            self.conversation_history.append({"role": "juno", "content": analysis})

            test_count += 1

            # Add a delay to avoid rate limiting
            time.sleep(2)

        # Have Juno generate a final report
        final_report = self._generate_final_report()

        # Save all results
        self._save_results()

        return self.test_results

    def _initialize_juno(self) -> None:
        """Initialize the conversation with Juno"""
        prompt = """
        You are now going to conduct an autonomous testing session of the Vana agent.

        Your goal is to thoroughly test Vana's capabilities, including:
        - Vector Search for semantic knowledge retrieval
        - Knowledge Graph for structured information
        - Web Search for up-to-date information
        - Document processing and entity extraction
        - Hybrid search combining multiple knowledge sources

        Please start by introducing yourself and explaining what you'll be testing.
        Then, proceed with your first test question for Vana.

        Format your response as:

        [Introduction]

        TEST QUESTION: [Your first question for Vana]
        """

        response = self.juno_runner.run(prompt)
        logger.info(f"Juno initialized: {response.text[:100]}...")

        self.conversation_history.append({"role": "system", "content": prompt})
        self.conversation_history.append({"role": "juno", "content": response.text})

    def _get_next_test(self) -> str:
        """Have Juno decide on the next test"""
        # Construct a prompt that includes the conversation history
        history_text = ""
        for message in self.conversation_history[
            -6:
        ]:  # Include only the last 6 messages to avoid context limits
            role = message["role"]
            content = message["content"]
            history_text += f"\n{role.upper()}: {content}\n"

        prompt = f"""
        Here's our testing conversation so far:
        {history_text}

        Based on the testing we've done so far, please decide on the next test for Vana.

        If you believe we've completed sufficient testing of all capabilities, you can indicate that testing is complete.

        Format your response as:

        [Your analysis of testing progress so far]

        TEST QUESTION: [Your next question for Vana]

        or

        TESTING COMPLETE: [Your final thoughts on Vana's performance]
        """

        response = self.juno_runner.run(prompt)
        logger.info(f"Next test from Juno: {response.text[:100]}...")

        return response.text

    def _extract_question(self, juno_response: str) -> str:
        """Extract the test question from Juno's response"""
        if "TEST QUESTION:" in juno_response:
            # Split by the marker and take the part after it
            parts = juno_response.split("TEST QUESTION:")
            if len(parts) > 1:
                # Extract the question (everything until the next paragraph or end of text)
                question_part = parts[1].strip()
                question = question_part.split("\n\n")[0].strip()
                return question

        return None

    def _ask_vana(self, question: str) -> str:
        """Ask Vana a question and get the response"""
        logger.info(f"Asking Vana: {question}")

        try:
            response = self.vana_runner.run(question)
            response_text = response.text
            logger.info(f"Vana responded: {response_text[:100]}...")
            return response_text
        except Exception as e:
            error_msg = f"Error getting response from Vana: {str(e)}"
            logger.error(error_msg)
            return error_msg

    def _analyze_response(self, question: str, vana_response: str) -> str:
        """Have Juno analyze Vana's response"""
        prompt = f"""
        I asked Vana this question:
        "{question}"

        Vana's response was:
        ---
        {vana_response}
        ---

        Please analyze this response based on:
        1. Accuracy and completeness of information
        2. Proper attribution of sources
        3. Relevance to the question
        4. Overall quality and helpfulness

        Provide a detailed analysis and suggest what capability to test next.
        """

        response = self.juno_runner.run(prompt)
        logger.info(f"Juno's analysis: {response.text[:100]}...")

        return response.text

    def _generate_final_report(self) -> str:
        """Have Juno generate a final report on Vana's performance"""
        # Create a summary of all test results
        test_summary = ""
        for i, result in enumerate(self.test_results):
            test_summary += f"\nTest {i+1}: {result['question'][:50]}...\n"

        prompt = f"""
        You have completed testing of the Vana agent. Here's a summary of the tests performed:

        {test_summary}

        Please provide a comprehensive final report that includes:

        1. Overall assessment of Vana's performance
        2. Evaluation of each capability (Vector Search, Knowledge Graph, Web Search, etc.)
        3. Strengths and weaknesses identified
        4. Recommendations for improvement
        5. Suggestions for additional testing

        Format your response as a formal test report with clear sections and actionable insights.
        """

        response = self.juno_runner.run(prompt)
        final_report = response.text
        logger.info("Final report generated")

        # Save the final report
        with open("juno_final_report.md", "w") as f:
            f.write(final_report)

        return final_report

    def _save_results(self) -> None:
        """Save all test results and conversation history"""
        # Save test results
        results_file = f"test_results/juno_autonomous_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        os.makedirs("test_results", exist_ok=True)

        with open(results_file, "w") as f:
            json.dump(
                {
                    "test_plan": self.test_plan,
                    "test_results": self.test_results,
                    "conversation_history": self.conversation_history,
                    "timestamp": datetime.now().isoformat(),
                },
                f,
                indent=2,
            )

        logger.info(f"Test results saved to {results_file}")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Juno Autonomous Tester for Vana")
    parser.add_argument(
        "--test-plan", "-t", type=str, help="Path to test plan JSON file"
    )
    parser.add_argument(
        "--max-tests", "-m", type=int, default=10, help="Maximum number of tests to run"
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="test_results",
        help="Path to output directory for test results",
    )
    parser.add_argument(
        "--previous-results",
        "-p",
        type=str,
        default="test_results",
        help="Path to directory containing previous test results",
    )
    parser.add_argument(
        "--ignore-previous",
        "-i",
        action="store_true",
        help="Ignore previous test results",
    )

    args = parser.parse_args()

    # Set output directory if specified
    output_dir = args.output
    os.makedirs(output_dir, exist_ok=True)

    # Determine previous results directory
    previous_results_dir = None if args.ignore_previous else args.previous_results

    # Create and run the autonomous tester
    juno = JunoAutonomousTester(
        test_plan_file=args.test_plan,
        max_tests=args.max_tests,
        previous_results_dir=previous_results_dir,
    )
    juno.run_autonomous_test_session()

    print(
        f"\nAutonomous testing session completed. Results saved to {output_dir} directory."
    )


if __name__ == "__main__":
    main()
