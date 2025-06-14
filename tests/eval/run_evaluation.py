#!/usr/bin/env python3
"""
VANA Evaluation Framework Execution Script
Easy-to-use script for running comprehensive system evaluation

Usage:
    python tests/eval/run_evaluation.py --help
    python tests/eval/run_evaluation.py --agents-only
    python tests/eval/run_evaluation.py --full
    python tests/eval/run_evaluation.py --performance-only
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

# Set working directory to project root
os.chdir(project_root)

from lib.logging_config import get_logger
from tests.eval.agent_evaluator import VANASystemEvaluator
from tests.eval.performance_benchmarks import VANAPerformanceBenchmarks
from tests.eval.test_evaluation import ComprehensiveEvaluationRunner

logger = get_logger("vana.run_evaluation")

# Import coordination testing (Task #9)
try:
    from tests.coordination.coordination_benchmarks import CoordinationBenchmarks
    from tests.coordination.coordination_test_runner import CoordinationTestRunner

    COORDINATION_TESTING_AVAILABLE = True
except ImportError:
    COORDINATION_TESTING_AVAILABLE = False


async def run_agents_only(environment: str = "dev"):
    """Run only agent evaluation"""
    logger.debug("🧪 Running Agent Evaluation Only")
    logger.debug("%s", "=" * 60)

    evaluator = VANASystemEvaluator(environment=environment)
    results = await evaluator.evaluate_all_agents()

    logger.info("\n✅ Agent evaluation completed successfully!")
    return results


async def run_performance_only(environment: str = "dev"):
    """Run only performance benchmarking"""
    logger.debug("⚡ Running Performance Benchmarking Only")
    logger.debug("%s", "=" * 60)

    benchmarks = VANAPerformanceBenchmarks()
    results = await benchmarks.run_comprehensive_benchmarks()

    logger.info("\n✅ Performance benchmarking completed successfully!")
    return results


async def run_coordination_only(environment: str = "dev"):
    """Run only coordination testing (Task #9)"""
    logger.debug("🎯 Running Coordination Testing Only (Task #9)")
    logger.debug("%s", "=" * 60)

    if not COORDINATION_TESTING_AVAILABLE:
        logger.debug("❌ Coordination testing modules not available")
        return {"error": "Coordination testing not available"}

    # Run coordination tests
    test_runner = CoordinationTestRunner()
    test_results = await test_runner.run_all_coordination_tests()

    # Run coordination benchmarks
    benchmarks = CoordinationBenchmarks()
    benchmark_results = await benchmarks.run_all_benchmarks()

    # Combine results
    combined_results = {
        "coordination_tests": test_results,
        "coordination_benchmarks": benchmark_results,
        "overall_metrics": {
            "test_success_rate": test_results["metrics"]["success_rate"],
            "benchmark_success_rate": benchmark_results["benchmark_summary"]["overall_success_rate"],
            "average_response_time": test_results["metrics"]["average_response_time"],
            "performance_grade": benchmark_results["benchmark_summary"]["performance_grade"],
            "task_9_completed": test_results["target_achieved"]
            and benchmark_results["performance_targets"]["success_rate_achieved"],
        },
    }

    logger.info("\n✅ Coordination testing completed successfully!")
    return combined_results


async def run_full_evaluation(environment: str = "dev", skip_discovery: bool = False, skip_performance: bool = False):
    """Run comprehensive evaluation"""
    logger.debug("🎯 Running Comprehensive VANA System Evaluation")
    logger.debug("%s", "=" * 80)

    runner = ComprehensiveEvaluationRunner()
    results = await runner.run_full_evaluation(
        include_discovery=not skip_discovery, include_performance=not skip_performance
    )

    logger.info("\n✅ Comprehensive evaluation completed successfully!")
    return results


def print_usage_examples():
    """Print usage examples"""
    logger.debug("\n📋 USAGE EXAMPLES:")
    logger.debug("%s", "=" * 50)
    logger.debug("# Quick agent evaluation (recommended for first run)")
    logger.debug("python tests/eval/run_evaluation.py --agents-only")
    print()
    logger.debug("# Performance benchmarking only")
    logger.debug("python tests/eval/run_evaluation.py --performance-only")
    print()
    logger.debug("# Coordination testing only (Task #9)")
    logger.debug("python tests/eval/run_evaluation.py --coordination-only")
    print()
    logger.debug("# Full comprehensive evaluation")
    logger.debug("python tests/eval/run_evaluation.py --full")
    print()
    logger.debug("# Full evaluation without system discovery")
    logger.debug("python tests/eval/run_evaluation.py --full --skip-discovery")
    print()
    logger.debug("# Run against production environment")
    logger.debug("python tests/eval/run_evaluation.py --agents-only --env prod")
    print()
    logger.debug("# Environment variables for configuration:")
    logger.debug("%s", "export VANA_DEV_URL='https://your-dev-url.com'")
    logger.debug("%s", "export VANA_BROWSER_HEADLESS='false'  # Show browser")
    logger.debug("%s", "export VANA_RESPONSE_TIME_TARGET='3.0'  # 3 second target")
    logger.debug("%s", "=" * 50)


def validate_environment():
    """Validate that the environment is set up correctly"""
    logger.debug("🔍 Validating Environment...")

    # Check if we're in the right directory
    if not Path("agents").exists() or not Path("tests").exists():
        logger.error("❌ Error: Please run this script from the VANA project root directory")
        logger.debug("   Current directory:", os.getcwd())
        logger.debug("   Expected files: agents/, tests/, pyproject.toml")
        return False

    # Check if required directories exist
    required_dirs = ["tests/eval/evalsets", "tests/results"]

    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            logger.debug(f"📁 Creating missing directory: {dir_path}")
            Path(dir_path).mkdir(parents=True, exist_ok=True)

    # Check if evalsets exist
    evalsets_dir = Path("tests/eval/evalsets")
    evalset_files = list(evalsets_dir.glob("*.json"))

    if not evalset_files:
        logger.error("❌ Error: No evaluation sets found in tests/eval/evalsets/")
        logger.debug("   Expected files: vana_agent_evalset.json, architecture_specialist_evalset.json, etc.")
        return False

    logger.debug(f"✅ Found {len(evalset_files)} evaluation sets")
    logger.debug("✅ Environment validation passed")
    return True


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="VANA System Comprehensive Evaluation Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --agents-only              # Quick agent evaluation
  %(prog)s --performance-only         # Performance benchmarking only  
  %(prog)s --full                     # Complete evaluation
  %(prog)s --full --skip-discovery    # Skip system discovery phase
  %(prog)s --agents-only --env prod   # Test production environment
        """,
    )

    # Execution mode (mutually exclusive)
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        "--agents-only", action="store_true", help="Run only agent evaluation (recommended for first run)"
    )
    mode_group.add_argument("--performance-only", action="store_true", help="Run only performance benchmarking")
    mode_group.add_argument("--coordination-only", action="store_true", help="Run only coordination testing (Task #9)")
    mode_group.add_argument("--full", action="store_true", help="Run comprehensive evaluation")
    mode_group.add_argument("--examples", action="store_true", help="Show usage examples and exit")

    # Configuration options
    parser.add_argument("--env", choices=["dev", "prod"], default="dev", help="Environment to test (default: dev)")
    parser.add_argument("--skip-discovery", action="store_true", help="Skip system discovery phase (only with --full)")
    parser.add_argument(
        "--skip-performance", action="store_true", help="Skip performance benchmarking (only with --full)"
    )
    parser.add_argument("--headless", action="store_true", help="Force headless browser mode")
    parser.add_argument("--show-browser", action="store_true", help="Show browser during testing (non-headless)")

    args = parser.parse_args()

    # Show examples and exit
    if args.examples:
        print_usage_examples()
        return

    # Set browser mode if specified
    if args.headless:
        os.environ["VANA_BROWSER_HEADLESS"] = "true"
    elif args.show_browser:
        os.environ["VANA_BROWSER_HEADLESS"] = "false"

    # Validate environment
    if not validate_environment():
        sys.exit(1)

    try:
        # Execute based on mode
        results = None
        if args.agents_only:
            results = await run_agents_only(args.env)
        elif args.performance_only:
            results = await run_performance_only(args.env)
        elif args.coordination_only:
            results = await run_coordination_only(args.env)
        elif args.full:
            results = await run_full_evaluation(
                environment=args.env, skip_discovery=args.skip_discovery, skip_performance=args.skip_performance
            )

        if results is None:
            logger.debug("❌ No evaluation mode selected")
            return 1

        logger.info(f"\n🎉 Evaluation completed successfully!")
        logger.info(f"📊 Results saved in: tests/results/")

        # Print quick summary
        if isinstance(results, dict):
            if "overall_metrics" in results:
                metrics = results["overall_metrics"]
                if isinstance(metrics, dict):
                    logger.debug(f"\n📈 QUICK SUMMARY:")
                    success_rate = metrics.get("overall_success_rate", metrics.get("test_success_rate", 0))
                    logger.info(f"   Success Rate: {success_rate:.1%}")
                    logger.debug("%s", f"   Avg Response Time: {metrics.get('average_response_time', 0):.2f}s")
                    logger.debug("%s", f"   Performance Grade: {metrics.get('performance_grade', 'N/A')}")

                    # Special handling for coordination testing
                    if "task_9_completed" in metrics:
                        logger.info(
                            "%s",
                            f"   Task #9 Status: {'✅ COMPLETED' if metrics['task_9_completed'] else '❌ INCOMPLETE'}",
                        )

        return 0

    except KeyboardInterrupt:
        logger.debug("\n⚠️ Evaluation interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"\n❌ Evaluation failed: {str(e)}")
        logger.debug(f"💡 Try running with --examples to see usage examples")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
