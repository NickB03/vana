#!/usr/bin/env python3
"""
Comprehensive Test Runner for VANA Testing Framework

Orchestrates all testing components including:
- Performance benchmarking
- Security validation
- Integration testing
- Automated CI/CD testing
- Regression detection
- Comprehensive reporting

Usage:
    python tests/run_comprehensive_tests.py --suite all
    python tests/run_comprehensive_tests.py --suite performance
    python tests/run_comprehensive_tests.py --suite security
"""

import sys
import argparse
import time
import json
from pathlib import Path
from typing import Dict, Any, List

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Import testing framework components
from tests.performance.performance_suite import PerformanceBenchmark, AsyncPerformanceBenchmark
from tests.security.security_validator import SecurityValidator
from tests.automated.ci_runner import CIRunner
from tests.benchmarks.benchmark_runner import BenchmarkRunner, BenchmarkSuite
from tests.benchmarks.performance_baselines import BaselineManager
from tests.benchmarks.regression_detector import RegressionDetector

import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ComprehensiveTestRunner:
    """Orchestrates comprehensive testing across all framework components."""
    
    def __init__(self, project_root: Path, output_dir: Path = None):
        self.project_root = project_root
        self.output_dir = output_dir or (project_root / "test_results")
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize testing components
        self.ci_runner = CIRunner(project_root)
        self.benchmark_runner = BenchmarkRunner(self.output_dir / "benchmarks")
        self.baseline_manager = BaselineManager(self.output_dir / "performance_baselines.json")
        self.regression_detector = RegressionDetector()
        self.security_validator = SecurityValidator()
        
        # Test results
        self.results: Dict[str, Any] = {}
        self.start_time: float = 0
        self.end_time: float = 0
    
    def run_performance_tests(self) -> Dict[str, Any]:
        """Run comprehensive performance testing."""
        logger.info("Starting performance testing suite...")
        
        # Create performance benchmark suite
        perf_suite = self.benchmark_runner.create_suite("vana_performance")
        
        # Add sample benchmarks (these would be replaced with real VANA benchmarks)
        def sample_agent_response():
            """Sample agent response benchmark."""
            time.sleep(0.1)  # Simulate agent processing
            return {"response": "test", "processing_time": 0.1}
        
        def sample_tool_execution():
            """Sample tool execution benchmark."""
            time.sleep(0.05)  # Simulate tool execution
            return {"result": "tool_executed", "execution_time": 0.05}
        
        def sample_memory_search():
            """Sample memory search benchmark."""
            time.sleep(0.02)  # Simulate memory search
            return {"results": ["memory_item_1", "memory_item_2"], "search_time": 0.02}
        
        perf_suite.add_benchmark("agent_response", sample_agent_response)
        perf_suite.add_benchmark("tool_execution", sample_tool_execution)
        perf_suite.add_benchmark("memory_search", sample_memory_search)
        
        # Run benchmarks
        benchmark_results = self.benchmark_runner.run_suite("vana_performance", iterations=10)
        
        # Analyze results and update baselines
        for benchmark_name, result in benchmark_results.items():
            if result.success and result.metrics:
                # Extract execution times
                execution_times = [m.value for m in result.metrics if "execution_time" in m.name]
                
                if execution_times:
                    # Check for regressions
                    baseline = self.baseline_manager.baselines.get_baseline(
                        benchmark_name, f"{benchmark_name}_execution_time"
                    )
                    
                    if baseline:
                        regression = self.regression_detector.detect_regression(
                            benchmark_name,
                            f"{benchmark_name}_execution_time",
                            baseline.baseline_value,
                            execution_times,
                            baseline.metadata.get("std_dev")
                        )
                        
                        if regression:
                            logger.warning(f"Performance regression detected in {benchmark_name}")
                    else:
                        # Establish new baseline
                        self.baseline_manager.establish_baseline(
                            benchmark_name,
                            f"{benchmark_name}_execution_time",
                            execution_times,
                            "seconds"
                        )
        
        performance_summary = {
            "benchmark_results": {name: result.to_dict() for name, result in benchmark_results.items()},
            "baselines_summary": self.baseline_manager.get_baseline_summary(),
            "regressions": self.regression_detector.get_regression_summary()
        }
        
        self.results["performance"] = performance_summary
        logger.info("Performance testing completed")
        return performance_summary
    
    def run_security_tests(self) -> Dict[str, Any]:
        """Run comprehensive security testing."""
        logger.info("Starting security testing suite...")
        
        # Sample code for security analysis
        test_code_samples = [
            # Safe code
            '''
def safe_function(user_input):
    """Safe function with proper validation."""
    if not isinstance(user_input, str):
        raise ValueError("Invalid input type")
    
    sanitized_input = user_input.strip()[:100]  # Limit length
    return f"Processed: {sanitized_input}"
''',
            # Vulnerable code
            '''
def vulnerable_function(user_input):
    """Vulnerable function with security issues."""
    # A02: Hardcoded secret
    api_key = "sk-1234567890abcdef"
    
    # A03: Code injection
    result = eval(user_input)
    
    # A01: File access without validation
    with open(user_input, 'r') as f:
        data = f.read()
    
    return result
'''
        ]
        
        # Analyze code samples
        for i, code in enumerate(test_code_samples):
            self.security_validator.validate_python_code(code, f"test_sample_{i}.py")
        
        # Test configuration security
        test_configs = [
            {"debug": True, "ssl_verify": False},
            {"password": "admin123", "api_key": "secret_key"},
            {"secure_config": True, "encryption": "enabled"}
        ]
        
        for i, config in enumerate(test_configs):
            self.security_validator.validate_configuration(config, f"test_config_{i}")
        
        # Test network security
        test_urls = [
            "https://api.example.com/secure",
            "http://localhost:8080/admin",
            "http://127.0.0.1:3000/debug",
            "https://secure-api.example.com/v1"
        ]
        
        self.security_validator.validate_network_access(test_urls)
        
        # Generate security report
        security_report = self.security_validator.get_security_report()
        
        self.results["security"] = security_report
        logger.info(f"Security testing completed: {security_report['total_violations']} violations found")
        return security_report
    
    def run_integration_tests(self) -> Dict[str, Any]:
        """Run integration tests using CI runner."""
        logger.info("Starting integration testing suite...")
        
        integration_result = self.ci_runner.run_integration_tests()
        
        integration_summary = {
            "success": integration_result.success,
            "duration": integration_result.duration,
            "exit_code": integration_result.exit_code,
            "metadata": integration_result.metadata
        }
        
        self.results["integration"] = integration_summary
        logger.info(f"Integration testing completed: {'PASSED' if integration_result.success else 'FAILED'}")
        return integration_summary
    
    def run_unit_tests(self) -> Dict[str, Any]:
        """Run unit tests using CI runner."""
        logger.info("Starting unit testing suite...")
        
        unit_result = self.ci_runner.run_unit_tests()
        
        unit_summary = {
            "success": unit_result.success,
            "duration": unit_result.duration,
            "exit_code": unit_result.exit_code,
            "metadata": unit_result.metadata
        }
        
        self.results["unit"] = unit_summary
        logger.info(f"Unit testing completed: {'PASSED' if unit_result.success else 'FAILED'}")
        return unit_summary
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all test suites."""
        self.start_time = time.time()
        logger.info("Starting comprehensive test run...")
        
        try:
            # Run all test suites
            self.run_unit_tests()
            self.run_security_tests()
            self.run_performance_tests()
            self.run_integration_tests()
            
        except Exception as e:
            logger.error(f"Test execution failed: {e}")
            self.results["error"] = str(e)
        
        finally:
            self.end_time = time.time()
        
        # Generate comprehensive report
        return self.generate_comprehensive_report()
    
    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report."""
        total_duration = self.end_time - self.start_time if self.end_time > self.start_time else 0
        
        # Calculate overall success
        test_successes = []
        for test_type, result in self.results.items():
            if test_type == "error":
                continue
            
            if test_type in ["unit", "integration"]:
                test_successes.append(result.get("success", False))
            elif test_type == "security":
                # Security passes if no critical violations
                critical_violations = result.get("severity_breakdown", {}).get("critical", 0)
                test_successes.append(critical_violations == 0)
            elif test_type == "performance":
                # Performance passes if no critical regressions
                regressions = result.get("regressions", {})
                critical_regressions = regressions.get("severity_breakdown", {}).get("critical", 0)
                test_successes.append(critical_regressions == 0)
        
        overall_success = all(test_successes) if test_successes else False
        
        comprehensive_report = {
            "timestamp": time.time(),
            "duration": total_duration,
            "overall_success": overall_success,
            "test_results": self.results,
            "summary": {
                "total_test_suites": len([k for k in self.results.keys() if k != "error"]),
                "successful_suites": sum(test_successes),
                "failed_suites": len(test_successes) - sum(test_successes),
                "success_rate": sum(test_successes) / len(test_successes) if test_successes else 0
            }
        }
        
        # Save comprehensive report
        report_file = self.output_dir / f"comprehensive_test_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(comprehensive_report, f, indent=2)
        
        logger.info(f"Comprehensive test report saved to {report_file}")
        logger.info(f"Overall result: {'PASSED' if overall_success else 'FAILED'} "
                   f"({sum(test_successes)}/{len(test_successes)} suites passed)")
        
        return comprehensive_report

def main():
    """Main entry point for comprehensive test runner."""
    parser = argparse.ArgumentParser(description="VANA Comprehensive Test Runner")
    parser.add_argument("--suite", 
                       choices=["all", "unit", "security", "performance", "integration"],
                       default="all",
                       help="Test suite to run")
    parser.add_argument("--project-root", 
                       type=Path, 
                       default=Path(__file__).parent.parent,
                       help="Project root directory")
    parser.add_argument("--output-dir",
                       type=Path,
                       help="Output directory for test results")
    parser.add_argument("--verbose", "-v",
                       action="store_true",
                       help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        runner = ComprehensiveTestRunner(args.project_root, args.output_dir)
        
        if args.suite == "all":
            result = runner.run_all_tests()
        elif args.suite == "unit":
            result = runner.run_unit_tests()
        elif args.suite == "security":
            result = runner.run_security_tests()
        elif args.suite == "performance":
            result = runner.run_performance_tests()
        elif args.suite == "integration":
            result = runner.run_integration_tests()
        
        # Determine exit code
        if args.suite == "all":
            exit_code = 0 if result.get("overall_success", False) else 1
        else:
            exit_code = 0 if result.get("success", False) else 1
        
        sys.exit(exit_code)
        
    except Exception as e:
        logger.error(f"Comprehensive test runner failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
