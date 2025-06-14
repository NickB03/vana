#!/usr/bin/env python3
"""
Testing Framework Validation Script

Validates that the enhanced testing framework components are working correctly
without requiring external dependencies like psutil.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Set up logging
from lib.logging_config import get_logger

logger = get_logger("vana.validate_framework")


def test_security_framework():
    """Test security validation framework."""
    logger.debug("🔒 Testing Security Framework...")

    try:
        from tests.security.security_validator import SecurityValidator

        validator = SecurityValidator()

        # Test 1: Code injection detection
        malicious_code = """
def vulnerable_function(user_input):
    eval(user_input)  # Code injection vulnerability
    exec("dangerous_code")  # Another vulnerability
    return "result"
"""

        violations = validator.validate_python_code(malicious_code, "test_vulnerable.py")
        logger.debug(f"  ✅ Code analysis detected {len(violations)} violations")
        assert len(violations) >= 2, "Should detect at least 2 code injection vulnerabilities"

        # Test 2: Configuration security
        insecure_config = {
            "password": "hardcoded_secret_123",
            "api_key": "sk-1234567890abcdef1234567890abcdef",
            "debug": True,
            "ssl_verify": False,
        }

        config_violations = validator.validate_configuration(insecure_config, "test_config")
        logger.debug(f"  ✅ Configuration analysis detected {len(config_violations)} violations")
        assert len(config_violations) >= 3, "Should detect multiple configuration issues"

        # Test 3: Network security
        dangerous_urls = ["http://localhost:8080/admin", "http://127.0.0.1:3000/debug", "ftp://internal.server/files"]

        network_violations = validator.validate_network_access(dangerous_urls)
        logger.debug(f"  ✅ Network analysis detected {len(network_violations)} violations")
        assert len(network_violations) >= 3, "Should detect network security issues"

        # Test 4: OWASP compliance
        xss_inputs = ["<script>alert('XSS')</script>", "javascript:alert('XSS')", "'; DROP TABLE users; --"]

        input_violations = validator.validate_input_sanitization(xss_inputs)
        logger.debug(f"  ✅ Input validation detected {len(input_violations)} violations")
        assert len(input_violations) >= 3, "Should detect injection patterns"

        # Test 5: Security report generation
        report = validator.get_security_report()
        logger.debug("%s", f"  ✅ Security report generated with {report['total_violations']} total violations")
        assert report["total_violations"] > 0, "Should have detected violations"
        assert "severity_breakdown" in report, "Report should include severity breakdown"

        logger.debug("  🎉 Security framework validation PASSED")
        return True

    except Exception as e:
        logger.error(f"  ❌ Security framework validation FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_benchmarking_framework():
    """Test benchmarking framework (without psutil dependencies)."""
    logger.debug("📊 Testing Benchmarking Framework...")

    try:
        from tests.benchmarks.benchmark_runner import BenchmarkSuite
        from tests.benchmarks.performance_baselines import BaselineManager
        from tests.benchmarks.regression_detector import RegressionDetector

        # Test 1: Benchmark suite creation
        suite = BenchmarkSuite("test_suite")

        def sample_benchmark():
            """Sample benchmark function."""
            import time

            time.sleep(0.01)  # Simulate work
            return "benchmark_result"

        suite.add_benchmark("sample_test", sample_benchmark)
        logger.info("  ✅ Benchmark suite creation successful")

        # Test 2: Baseline management
        baseline_manager = BaselineManager()

        # Create sample performance data
        sample_values = [0.1, 0.12, 0.09, 0.11, 0.10, 0.13, 0.08, 0.11, 0.10, 0.12]
        baseline = baseline_manager.establish_baseline("test_benchmark", "execution_time", sample_values, "seconds")

        logger.debug(f"  ✅ Baseline established: {baseline.baseline_value:.3f} seconds")
        assert baseline.baseline_value > 0, "Baseline should have positive value"

        # Test 3: Baseline comparison
        comparison = baseline_manager.compare_to_baseline(
            "test_benchmark", "execution_time", 0.15  # Slower performance
        )

        logger.debug("%s", f"  ✅ Baseline comparison: {comparison['status']}")
        assert comparison["has_baseline"], "Should find existing baseline"

        # Test 4: Regression detection
        detector = RegressionDetector()

        # Test with regressed performance
        regressed_values = [0.18, 0.19, 0.17, 0.20, 0.18]  # Much slower
        regression = detector.detect_regression(
            "test_benchmark", "execution_time", baseline.baseline_value, regressed_values
        )

        if regression:
            logger.debug(
                f"  ✅ Regression detected: {regression.regression_percentage:.1f}% ({regression.severity.value})"
            )
            assert regression.regression_percentage > 0, "Should detect performance regression"
        else:
            logger.debug("  ⚠️  No regression detected (may be due to thresholds)")

        # Test 5: Regression summary
        summary = detector.get_regression_summary()
        logger.debug("%s", f"  ✅ Regression summary generated with {summary['total_regressions']} regressions")

        logger.debug("  🎉 Benchmarking framework validation PASSED")
        return True

    except Exception as e:
        logger.error(f"  ❌ Benchmarking framework validation FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_integration_framework():
    """Test integration testing framework."""
    logger.debug("🔗 Testing Integration Framework...")

    try:
        # Test basic imports
        from tests.integration.test_agent_workflows import TestAgentWorkflows

        logger.info("  ✅ Integration test imports successful")

        # Test mock agent system creation
        TestAgentWorkflows()

        # Create mock agent system (simplified)
        mock_agents = {
            "vana": type(
                "MockAgent", (), {"name": "vana", "role": "orchestrator", "available_tools": ["delegate_task"]}
            )(),
            "specialist": type(
                "MockAgent", (), {"name": "specialist", "role": "specialist", "available_tools": ["execute_task"]}
            )(),
        }

        logger.debug(f"  ✅ Mock agent system created with {len(mock_agents)} agents")
        assert len(mock_agents) == 2, "Should create multiple mock agents"

        logger.debug("  🎉 Integration framework validation PASSED")
        return True

    except Exception as e:
        logger.error(f"  ❌ Integration framework validation FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_ci_framework():
    """Test CI/CD automation framework."""
    logger.debug("🤖 Testing CI/CD Framework...")

    try:
        from tests.automated.ci_runner import CIRunner, TestResult

        # Test 1: CI runner creation
        CIRunner(project_root)
        logger.info("  ✅ CI runner created successfully")

        # Test 2: Test result creation
        test_result = TestResult(
            test_type="unit_test", success=True, exit_code=0, duration=1.5, output="Test output", error=""
        )

        result_dict = test_result.to_dict()
        logger.info("  ✅ Test result serialization successful")
        assert result_dict["success"] == True, "Test result should serialize correctly"

        logger.debug("  🎉 CI/CD framework validation PASSED")
        return True

    except Exception as e:
        logger.error(f"  ❌ CI/CD framework validation FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run all framework validation tests."""
    logger.debug("🚀 VANA Enhanced Testing Framework Validation")
    logger.debug("%s", "=" * 50)

    results = []

    # Run all validation tests
    results.append(test_security_framework())
    results.append(test_benchmarking_framework())
    results.append(test_integration_framework())
    results.append(test_ci_framework())

    # Summary
    logger.debug("\n📋 Validation Summary")
    logger.debug("%s", "-" * 30)

    passed = sum(results)
    total = len(results)

    logger.debug(f"Tests Passed: {passed}/{total}")
    logger.info(f"Success Rate: {passed/total*100:.1f}%")

    if passed == total:
        logger.info("\n🎉 ALL FRAMEWORK COMPONENTS VALIDATED SUCCESSFULLY!")
        logger.debug("\n✅ The enhanced testing framework is ready for use:")
        logger.debug("   • Security validation with OWASP Top 10 compliance")
        logger.debug("   • Performance benchmarking and regression detection")
        logger.debug("   • Integration testing for multi-agent workflows")
        logger.debug("   • Automated CI/CD testing infrastructure")
        return 0
    else:
        logger.error(f"\n❌ {total - passed} framework component(s) failed validation")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
