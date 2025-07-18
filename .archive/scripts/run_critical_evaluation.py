#!/usr/bin/env python3
"""
Critical Functionality Evaluation Runner
Runs ADK-style evaluation tests for critical VANA functionality issues

Usage:
    python scripts/run_critical_evaluation.py
    python scripts/run_critical_evaluation.py --environment prod
    pytest tests/eval/test_critical_functionality.py -v
"""

import asyncio
import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from lib.logging_config import get_logger
from tests.eval.test_critical_functionality import CriticalFunctionalityEvaluator

logger = get_logger("vana.critical_evaluation")


async def main():
    """Run critical functionality evaluation"""
    import argparse

    parser = argparse.ArgumentParser(description="Run critical functionality evaluation")
    parser.add_argument(
        "--environment",
        default="dev",
        choices=["dev", "prod"],
        help="Environment to test (default: dev)",
    )
    parser.add_argument(
        "--output",
        default="tests/results/critical_functionality_report.json",
        help="Output file for results",
    )
    parser.add_argument("--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel("DEBUG")

    logger.info("🚀 Starting Critical Functionality Evaluation")
    logger.info(f"Environment: {args.environment}")
    logger.info("=" * 60)

    # Run evaluation
    evaluator = CriticalFunctionalityEvaluator(environment=args.environment)
    report = await evaluator.run_all_critical_tests()

    # Save results
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    logger.info(f"📄 Results saved to: {output_path}")

    # Print summary
    summary = report["evaluation_summary"]
    print("\n" + "=" * 60)
    print("🎯 CRITICAL FUNCTIONALITY EVALUATION RESULTS")
    print("=" * 60)
    print(f"Environment: {summary['environment']}")
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed_tests']}")
    print(f"Failed: {summary['failed_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1%}")
    print(f"Avg Response Time: {summary['avg_response_time']:.2f}s")
    print(f"Avg Quality Score: {summary['avg_quality_score']:.1%}")

    print("\n📋 TEST DETAILS:")
    for result in report["test_results"]:
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        print(f"{status} {result['test_name']} ({result['response_time']:.2f}s)")
        if not result["passed"] and result["error_message"]:
            print(f"    Error: {result['error_message']}")

    # Exit with error code if any tests failed
    if summary["failed_tests"] > 0:
        print(f"\n🚨 {summary['failed_tests']} critical tests failed!")
        print("These issues must be fixed before production deployment.")
        sys.exit(1)
    else:
        print("\n✅ All critical tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
