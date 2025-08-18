#\!/usr/bin/env python3
"""
ADK Memory Test Runner

Comprehensive test runner for the ADK memory integration test suite.
Provides organized execution of unit tests, integration tests, and
performance benchmarks with detailed reporting.
"""

import sys
import os
import time
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Any
import json


class ADKMemoryTestRunner:
    """Test runner for ADK memory integration tests."""
    
    def __init__(self):
        self.test_dir = Path(__file__).parent
        self.project_root = self.test_dir.parent.parent
        self.results = {
            "unit_tests": {},
            "integration_tests": {},
            "performance_tests": {},
            "summary": {}
        }
    
    def setup_environment(self):
        """Setup test environment and dependencies."""
        print("🔧 Setting up test environment...")
        
        # Set environment variables for testing
        test_env = {
            "RAG_CORPUS_RESOURCE_NAME": "projects/analystai-454200/locations/us-central1/ragCorpora/test-corpus",
            "SIMILARITY_TOP_K": "5",
            "VECTOR_DISTANCE_THRESHOLD": "0.7",
            "GOOGLE_CLOUD_PROJECT": "analystai-454200",
            "VERTEX_AI_REGION": "us-central1",
            "PYTHONPATH": str(self.project_root)
        }
        
        for key, value in test_env.items():
            os.environ[key] = value
            print(f"  Set {key}={value}")
        
        print("✅ Environment setup complete")
    
    def run_test_category(self, category: str, test_path: str, extra_args: List[str] = None) -> Dict[str, Any]:
        """Run a category of tests and return results."""
        print(f"\n🧪 Running {category}...")
        
        cmd = [
            "python", "-m", "pytest",
            str(test_path),
            "-v",
            "--tb=short"
        ]
        
        if extra_args:
            cmd.extend(extra_args)
        
        start_time = time.time()
        
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            test_result = {
                "status": "passed" if result.returncode == 0 else "failed",
                "duration_seconds": duration,
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
            
            if result.returncode == 0:
                print(f"✅ {category} completed successfully in {duration:.2f}s")
            else:
                print(f"❌ {category} failed in {duration:.2f}s")
                print(f"Error: {result.stderr}")
            
            return test_result
            
        except subprocess.TimeoutExpired:
            print(f"⏰ {category} timed out after 5 minutes")
            return {
                "status": "timeout",
                "duration_seconds": 300,
                "error": "Test execution timed out"
            }
        except Exception as e:
            print(f"💥 {category} failed with exception: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def run_all_tests(self):
        """Run all test categories."""
        print("🚀 Starting ADK Memory Test Suite")
        print("=" * 50)
        
        self.setup_environment()
        
        # Run test categories
        self.results["unit_tests"] = self.run_test_category(
            "Unit Tests", self.test_dir / "unit"
        )
        self.results["integration_tests"] = self.run_test_category(
            "Integration Tests", self.test_dir / "integration"
        )
        self.results["performance_tests"] = self.run_test_category(
            "Performance Tests", self.test_dir / "performance", ["-s"]
        )
        
        # Generate summary
        total_duration = sum(
            result.get("duration_seconds", 0) 
            for result in self.results.values() 
            if isinstance(result, dict)
        )
        
        passed_categories = sum(
            1 for result in self.results.values() 
            if isinstance(result, dict) and result.get("status") == "passed"
        )
        
        self.results["summary"] = {
            "total_duration_seconds": total_duration,
            "passed_categories": passed_categories,
            "total_categories": 3,
            "overall_status": "passed" if passed_categories == 3 else "failed"
        }
        
        # Print final summary
        print("\n" + "=" * 50)
        print("🏁 Test Suite Complete")
        print(f"⏱️ Total time: {total_duration:.2f} seconds")
        print(f"✅ Passed: {passed_categories}/3 categories")
        
        if self.results["summary"]["overall_status"] == "passed":
            print("🎉 All tests passed! ADK memory integration is ready.")
        else:
            print("⚠️ Some tests failed. Review results before deployment.")
        
        return self.results["summary"]["overall_status"] == "passed"


def main():
    """Main entry point for test runner."""
    parser = argparse.ArgumentParser(description="ADK Memory Test Runner")
    parser.add_argument(
        "--category",
        choices=["unit", "integration", "performance", "all"],
        default="all",
        help="Test category to run"
    )
    
    args = parser.parse_args()
    
    runner = ADKMemoryTestRunner()
    
    if args.category == "all":
        success = runner.run_all_tests()
    else:
        runner.setup_environment()
        category_map = {
            "unit": "unit",
            "integration": "integration", 
            "performance": "performance"
        }
        result = runner.run_test_category(
            f"{args.category.title()} Tests",
            runner.test_dir / category_map[args.category]
        )
        success = result.get("status") == "passed"
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
