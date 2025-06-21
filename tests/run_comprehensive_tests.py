#!/usr/bin/env python3
"""
Comprehensive Test Runner for VANA AI Agent Testing Framework

Runs the complete test suite across all levels and categories,
validates framework functionality, and generates comprehensive reports.
"""

import argparse
import asyncio
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from tests.framework import (
    ADKComplianceValidator,
    AgentIntelligenceValidator,
    PerformanceBenchmarker,
    QueryType,
    ResponseQualityAnalyzer,
    TestDataManager,
    create_test_agent_client,
)


class ComprehensiveTestRunner:
    """Runs comprehensive tests across all framework components"""

    def __init__(self, output_dir: Optional[str] = None):
        """Initialize test runner"""
        if output_dir is None:
            output_dir = project_root / "test_reports"

        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.results = {
            "framework_validation": {},
            "unit_tests": {},
            "agent_tests": {},
            "integration_tests": {},
            "e2e_tests": {},
            "security_tests": {},
            "performance_tests": {},
            "adk_compliance": {},
            "overall_summary": {},
        }

        self.start_time = time.time()

    async def run_all_tests(
        self, include_slow: bool = False, include_network: bool = False
    ) -> Dict[str, Any]:
        """Run all comprehensive tests"""
        print("🚀 Starting Comprehensive VANA AI Agent Testing")
        print("=" * 60)

        try:
            # 1. Validate framework components
            print("\n📋 Phase 1: Framework Validation")
            await self._validate_framework_components()

            # 2. Run pytest test suites
            print("\n🧪 Phase 2: Pytest Test Suites")
            await self._run_pytest_suites(include_slow, include_network)

            # 3. Run framework-specific tests
            print("\n🤖 Phase 3: AI Agent Intelligence Tests")
            await self._run_intelligence_tests()

            # 4. Run ADK compliance validation
            print("\n✅ Phase 4: Google ADK Compliance")
            await self._run_adk_compliance_tests()

            # 5. Run performance benchmarks
            print("\n⚡ Phase 5: Performance Benchmarks")
            await self._run_performance_tests()

            # 6. Generate comprehensive report
            print("\n📊 Phase 6: Report Generation")
            await self._generate_comprehensive_report()

            print("\n🎉 Comprehensive testing completed successfully!")

        except Exception as e:
            print(f"\n❌ Testing failed with error: {e}")
            self.results["overall_summary"]["error"] = str(e)
            raise

        finally:
            self.results["overall_summary"]["total_time"] = (
                time.time() - self.start_time
            )

        return self.results

    async def _validate_framework_components(self):
        """Validate that all framework components are working"""
        print("  🔍 Validating framework components...")

        validation_results = {}

        try:
            # Test TestDataManager
            print("    📁 Testing TestDataManager...")
            data_manager = TestDataManager()
            stats = data_manager.get_statistics()
            validation_results["test_data_manager"] = {
                "status": "success",
                "scenarios_loaded": stats["total_scenarios"],
                "details": stats,
            }
            print(f"      ✅ Loaded {stats['total_scenarios']} test scenarios")

        except Exception as e:
            validation_results["test_data_manager"] = {
                "status": "error",
                "error": str(e),
            }
            print(f"      ❌ TestDataManager error: {e}")

        try:
            # Test AgentTestClient
            print("    🤖 Testing AgentTestClient...")
            client = await create_test_agent_client("vana")
            test_response = await client.query("Test connection")
            validation_results["agent_test_client"] = {
                "status": "success",
                "response_status": test_response.status,
                "execution_time": test_response.execution_time,
            }
            print(f"      ✅ Agent client connected (status: {test_response.status})")

        except Exception as e:
            validation_results["agent_test_client"] = {
                "status": "error",
                "error": str(e),
            }
            print(f"      ❌ AgentTestClient error: {e}")

        try:
            # Test ResponseQualityAnalyzer
            print("    📊 Testing ResponseQualityAnalyzer...")
            analyzer = ResponseQualityAnalyzer()
            test_metrics = analyzer.analyze_response_quality(
                "This is a test response", "What is a test?"
            )
            validation_results["response_quality_analyzer"] = {
                "status": "success",
                "overall_score": test_metrics.overall_score,
                "components": {
                    "accuracy": test_metrics.accuracy,
                    "completeness": test_metrics.completeness,
                    "relevance": test_metrics.relevance,
                    "clarity": test_metrics.clarity,
                },
            }
            print(
                f"      ✅ Quality analysis working (score: {test_metrics.overall_score:.2f})"
            )

        except Exception as e:
            validation_results["response_quality_analyzer"] = {
                "status": "error",
                "error": str(e),
            }
            print(f"      ❌ ResponseQualityAnalyzer error: {e}")

        try:
            # Test ADKComplianceValidator
            print("    🔧 Testing ADKComplianceValidator...")
            adk_validator = ADKComplianceValidator()
            compliance_results = adk_validator.validate_all_agents()
            validation_results["adk_compliance_validator"] = {
                "status": "success",
                "agents_validated": len(compliance_results),
                "compliance_summary": {
                    agent: result.compliant
                    for agent, result in compliance_results.items()
                },
            }
            print(
                f"      ✅ ADK compliance validator working ({len(compliance_results)} agents)"
            )

        except Exception as e:
            validation_results["adk_compliance_validator"] = {
                "status": "error",
                "error": str(e),
            }
            print(f"      ❌ ADKComplianceValidator error: {e}")

        self.results["framework_validation"] = validation_results

    async def _run_pytest_suites(self, include_slow: bool, include_network: bool):
        """Run pytest test suites"""
        print("  🧪 Running pytest test suites...")

        test_commands = [
            ("Unit Tests", ["pytest", "-m", "unit", "-v"]),
            ("Agent Tests", ["pytest", "-m", "agent", "-v"]),
            ("Integration Tests", ["pytest", "-m", "integration", "-v"]),
            ("E2E Tests", ["pytest", "-m", "e2e", "-v"]),
            ("Security Tests", ["pytest", "-m", "security", "-v"]),
        ]

        if include_slow:
            test_commands.append(("Slow Tests", ["pytest", "-m", "slow", "-v"]))

        if include_network:
            test_commands.append(("Network Tests", ["pytest", "-m", "network", "-v"]))

        pytest_results = {}

        for test_name, command in test_commands:
            print(f"    🔬 Running {test_name}...")

            try:
                # Run pytest command
                result = subprocess.run(
                    command,
                    cwd=project_root,
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 minute timeout per test suite
                )

                pytest_results[test_name.lower().replace(" ", "_")] = {
                    "status": "success" if result.returncode == 0 else "failed",
                    "return_code": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "command": " ".join(command),
                }

                if result.returncode == 0:
                    print(f"      ✅ {test_name} passed")
                else:
                    print(f"      ❌ {test_name} failed (code: {result.returncode})")

            except subprocess.TimeoutExpired:
                pytest_results[test_name.lower().replace(" ", "_")] = {
                    "status": "timeout",
                    "error": "Test suite timed out after 5 minutes",
                }
                print(f"      ⏰ {test_name} timed out")

            except Exception as e:
                pytest_results[test_name.lower().replace(" ", "_")] = {
                    "status": "error",
                    "error": str(e),
                }
                print(f"      ❌ {test_name} error: {e}")

        # Store results in appropriate categories
        self.results["unit_tests"] = pytest_results.get("unit_tests", {})
        self.results["agent_tests"] = pytest_results.get("agent_tests", {})
        self.results["integration_tests"] = pytest_results.get("integration_tests", {})
        self.results["e2e_tests"] = pytest_results.get("e2e_tests", {})
        self.results["security_tests"] = pytest_results.get("security_tests", {})

    async def _run_intelligence_tests(self):
        """Run AI agent intelligence tests"""
        print("  🧠 Running AI agent intelligence tests...")

        try:
            # Create test client and validator
            client = await create_test_agent_client("vana")
            data_manager = TestDataManager()
            validator = AgentIntelligenceValidator(client, data_manager)

            intelligence_results = {}

            # Test reasoning consistency
            print("    🎯 Testing reasoning consistency...")
            reasoning_result = await validator.validate_reasoning_consistency(
                QueryType.FACTUAL
            )
            intelligence_results["reasoning_consistency"] = {
                "score": reasoning_result.score,
                "passed": reasoning_result.passed,
                "scenarios_tested": reasoning_result.scenarios_tested,
                "execution_time": reasoning_result.execution_time,
            }
            print(f"      📊 Reasoning consistency: {reasoning_result.score:.2f}")

            # Test tool selection intelligence
            print("    🔧 Testing tool selection intelligence...")
            tool_result = await validator.validate_tool_selection_intelligence()
            intelligence_results["tool_selection"] = {
                "score": tool_result.score,
                "passed": tool_result.passed,
                "scenarios_tested": tool_result.scenarios_tested,
                "execution_time": tool_result.execution_time,
            }
            print(f"      📊 Tool selection: {tool_result.score:.2f}")

            # Test context utilization
            print("    💭 Testing context utilization...")
            context_result = await validator.validate_context_utilization()
            intelligence_results["context_utilization"] = {
                "score": context_result.score,
                "passed": context_result.passed,
                "scenarios_tested": context_result.scenarios_tested,
                "execution_time": context_result.execution_time,
            }
            print(f"      📊 Context utilization: {context_result.score:.2f}")

            # Calculate overall intelligence score
            scores = [reasoning_result.score, tool_result.score, context_result.score]
            overall_intelligence = sum(scores) / len(scores)
            intelligence_results["overall_intelligence"] = overall_intelligence

            print(f"    🎯 Overall Intelligence Score: {overall_intelligence:.2f}")

            self.results["agent_tests"][
                "intelligence_validation"
            ] = intelligence_results

        except Exception as e:
            print(f"      ❌ Intelligence tests error: {e}")
            self.results["agent_tests"]["intelligence_validation"] = {
                "status": "error",
                "error": str(e),
            }

    async def _run_adk_compliance_tests(self):
        """Run Google ADK compliance tests"""
        print("  ✅ Running Google ADK compliance tests...")

        try:
            validator = ADKComplianceValidator()
            compliance_results = validator.validate_all_agents()

            compliance_summary = {
                "total_agents": len(compliance_results),
                "compliant_agents": sum(
                    1 for r in compliance_results.values() if r.compliant
                ),
                "compliance_rate": 0,
                "agent_details": {},
            }

            if compliance_summary["total_agents"] > 0:
                compliance_summary["compliance_rate"] = (
                    compliance_summary["compliant_agents"]
                    / compliance_summary["total_agents"]
                )

            for agent_name, result in compliance_results.items():
                compliance_summary["agent_details"][agent_name] = {
                    "compliant": result.compliant,
                    "score": result.score,
                    "issues_count": len(result.issues),
                    "recommendations_count": len(result.recommendations),
                }

                status = "✅" if result.compliant else "❌"
                print(
                    f"    {status} {agent_name}: {result.score:.2f} ({len(result.issues)} issues)"
                )

            print(
                f"    📊 Overall ADK Compliance: {compliance_summary['compliance_rate']:.2%}"
            )

            self.results["adk_compliance"] = compliance_summary

        except Exception as e:
            print(f"      ❌ ADK compliance tests error: {e}")
            self.results["adk_compliance"] = {"status": "error", "error": str(e)}

    async def _run_performance_tests(self):
        """Run performance benchmark tests"""
        print("  ⚡ Running performance benchmark tests...")

        try:
            client = await create_test_agent_client("vana")
            benchmarker = PerformanceBenchmarker(client)

            performance_results = {}

            # Response time benchmark
            print("    ⏱️ Running response time benchmark...")
            response_benchmark = await benchmarker.benchmark_response_times(
                iterations=3
            )
            performance_results["response_times"] = {
                "avg_response_time": response_benchmark.metrics.avg_response_time,
                "p95_response_time": response_benchmark.metrics.p95_response_time,
                "success_rate": response_benchmark.metrics.success_rate,
                "passed": response_benchmark.passed,
            }
            print(
                f"      📊 Avg response time: {response_benchmark.metrics.avg_response_time:.2f}s"
            )

            # Concurrent load test
            print("    🔄 Running concurrent load test...")
            load_benchmark = await benchmarker.benchmark_concurrent_load(
                query="What time is it?", concurrent_users=3, duration=30
            )
            performance_results["concurrent_load"] = {
                "requests_per_second": load_benchmark.metrics.requests_per_second,
                "success_rate": load_benchmark.metrics.success_rate,
                "avg_cpu_usage": load_benchmark.metrics.avg_cpu_usage,
                "passed": load_benchmark.passed,
            }
            print(
                f"      📊 Throughput: {load_benchmark.metrics.requests_per_second:.2f} req/s"
            )

            self.results["performance_tests"] = performance_results

        except Exception as e:
            print(f"      ❌ Performance tests error: {e}")
            self.results["performance_tests"] = {"status": "error", "error": str(e)}

    async def _generate_comprehensive_report(self):
        """Generate comprehensive test report"""
        print("  📊 Generating comprehensive report...")

        # Calculate overall summary
        total_time = time.time() - self.start_time

        summary = {
            "test_execution_time": total_time,
            "timestamp": time.time(),
            "framework_status": "operational",
            "overall_health": "good",
            "recommendations": [],
        }

        # Analyze results for overall health
        issues = []

        # Check framework validation
        framework_validation = self.results.get("framework_validation", {})
        failed_components = [
            name
            for name, result in framework_validation.items()
            if result.get("status") != "success"
        ]
        if failed_components:
            issues.append(
                f"Framework components failed: {', '.join(failed_components)}"
            )

        # Check intelligence scores
        intelligence = self.results.get("agent_tests", {}).get(
            "intelligence_validation", {}
        )
        overall_intelligence = intelligence.get("overall_intelligence", 0)
        if overall_intelligence < 0.7:
            issues.append(f"AI intelligence score low: {overall_intelligence:.2f}")

        # Check ADK compliance
        adk_compliance = self.results.get("adk_compliance", {})
        compliance_rate = adk_compliance.get("compliance_rate", 0)
        if compliance_rate < 0.8:
            issues.append(f"ADK compliance rate low: {compliance_rate:.2%}")

        # Determine overall health
        if len(issues) == 0:
            summary["overall_health"] = "excellent"
        elif len(issues) <= 2:
            summary["overall_health"] = "good"
        elif len(issues) <= 4:
            summary["overall_health"] = "fair"
        else:
            summary["overall_health"] = "poor"

        summary["issues_found"] = issues
        summary["total_issues"] = len(issues)

        self.results["overall_summary"] = summary

        # Save detailed report
        report_file = (
            self.output_dir / f"comprehensive_test_report_{int(time.time())}.json"
        )
        with open(report_file, "w") as f:
            json.dump(self.results, f, indent=2)

        print(f"    📄 Report saved to: {report_file}")
        print(f"    🎯 Overall Health: {summary['overall_health'].upper()}")
        print(f"    ⏱️ Total Time: {total_time:.2f}s")

        if issues:
            print(f"    ⚠️ Issues Found: {len(issues)}")
            for issue in issues:
                print(f"      - {issue}")


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Run comprehensive VANA AI agent tests"
    )
    parser.add_argument(
        "--include-slow", action="store_true", help="Include slow-running tests"
    )
    parser.add_argument(
        "--include-network",
        action="store_true",
        help="Include tests requiring network access",
    )
    parser.add_argument(
        "--output-dir", type=str, help="Output directory for test reports"
    )

    args = parser.parse_args()

    runner = ComprehensiveTestRunner(args.output_dir)

    try:
        results = await runner.run_all_tests(
            include_slow=args.include_slow, include_network=args.include_network
        )

        # Print final summary
        summary = results["overall_summary"]
        print("\n🎯 FINAL SUMMARY")
        print(f"Overall Health: {summary['overall_health'].upper()}")
        print(f"Total Time: {summary['test_execution_time']:.2f}s")
        print(f"Issues Found: {summary['total_issues']}")

        # Exit with appropriate code
        if summary["overall_health"] in ["excellent", "good"]:
            sys.exit(0)
        else:
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Comprehensive testing failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
