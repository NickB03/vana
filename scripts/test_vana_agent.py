#!/usr/bin/env python3
"""
Automated Test Runner for Vana Agent

This script simulates a human tester (Juno) asking questions to Vana
and evaluating the responses against expected criteria.
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add the project root to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from google.adk.run import Runner
    from vana.agent import root_agent
except ImportError:
    print("Error: Unable to import ADK modules. Make sure you're in the correct virtual environment.")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("vana_test_results.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VanaTestRunner:
    """Test runner for Vana agent"""
    
    def __init__(self, test_cases_file: str = None):
        """Initialize the test runner"""
        self.runner = Runner(root_agent)
        self.test_cases = []
        self.results = []
        
        if test_cases_file:
            self.load_test_cases(test_cases_file)
    
    def load_test_cases(self, file_path: str) -> None:
        """Load test cases from a JSON file"""
        try:
            with open(file_path, 'r') as f:
                self.test_cases = json.load(f)
            logger.info(f"Loaded {len(self.test_cases)} test cases from {file_path}")
        except Exception as e:
            logger.error(f"Error loading test cases: {str(e)}")
            sys.exit(1)
    
    def run_test(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single test case"""
        test_id = test_case.get("id", "unknown")
        description = test_case.get("description", "No description")
        question = test_case.get("question", "")
        expected_sources = test_case.get("expected_sources", [])
        expected_keywords = test_case.get("expected_keywords", [])
        
        logger.info(f"Running test {test_id}: {description}")
        logger.info(f"Question: {question}")
        
        # Send the question to Vana
        try:
            response = self.runner.run(question)
            response_text = response.text
        except Exception as e:
            logger.error(f"Error running test {test_id}: {str(e)}")
            return {
                "id": test_id,
                "status": "ERROR",
                "description": description,
                "question": question,
                "response": str(e),
                "analysis": f"Test failed due to error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        
        # Analyze the response
        sources_found = self._check_sources(response_text, expected_sources)
        keywords_found = self._check_keywords(response_text, expected_keywords)
        
        # Determine test status
        if sources_found and keywords_found:
            status = "PASS"
            analysis = "Response contains expected sources and keywords."
        else:
            status = "FAIL"
            analysis = "Response missing "
            if not sources_found:
                analysis += "expected sources "
            if not keywords_found:
                analysis += "and expected keywords"
        
        # Record the result
        result = {
            "id": test_id,
            "status": status,
            "description": description,
            "question": question,
            "response": response_text,
            "expected_sources": expected_sources,
            "expected_keywords": expected_keywords,
            "sources_found": sources_found,
            "keywords_found": keywords_found,
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Test {test_id} result: {status}")
        return result
    
    def _check_sources(self, response: str, expected_sources: List[str]) -> bool:
        """Check if the response contains the expected sources"""
        if not expected_sources:
            return True
        
        for source in expected_sources:
            if source.lower() in response.lower():
                return True
        
        return False
    
    def _check_keywords(self, response: str, expected_keywords: List[str]) -> bool:
        """Check if the response contains the expected keywords"""
        if not expected_keywords:
            return True
        
        for keyword in expected_keywords:
            if keyword.lower() not in response.lower():
                return False
        
        return True
    
    def run_all_tests(self) -> List[Dict[str, Any]]:
        """Run all test cases"""
        self.results = []
        
        for test_case in self.test_cases:
            result = self.run_test(test_case)
            self.results.append(result)
        
        return self.results
    
    def generate_report(self, output_file: str = "vana_test_report.json") -> None:
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
                "pass_rate": round(passed / total * 100, 2) if total > 0 else 0
            },
            "results": self.results,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save the report
        try:
            with open(output_file, 'w') as f:
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
            
        except Exception as e:
            logger.error(f"Error saving test report: {str(e)}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Automated Test Runner for Vana Agent")
    parser.add_argument("--test-cases", "-t", type=str, help="Path to test cases JSON file")
    parser.add_argument("--output", "-o", type=str, default="vana_test_report.json", 
                        help="Path to output report file")
    parser.add_argument("--interactive", "-i", action="store_true", 
                        help="Run in interactive mode (ask questions directly)")
    
    args = parser.parse_args()
    
    if args.interactive:
        # Interactive mode
        runner = VanaTestRunner()
        print("=== Vana Agent Interactive Test Mode ===")
        print("Type 'exit' to quit")
        
        while True:
            question = input("\nEnter your question: ")
            if question.lower() == 'exit':
                break
            
            test_case = {
                "id": "interactive",
                "description": "Interactive test",
                "question": question
            }
            
            result = runner.run_test(test_case)
            print("\nVana's response:")
            print("----------------")
            print(result["response"])
            print("----------------")
    
    elif args.test_cases:
        # Batch mode with test cases file
        runner = VanaTestRunner(args.test_cases)
        runner.run_all_tests()
        runner.generate_report(args.output)
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
