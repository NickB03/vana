#!/usr/bin/env python3
"""
Test Vector Search Health Checker

This script demonstrates how to use the Vector Search Health Checker
to monitor the health of the Vector Search integration.
"""

import os
import sys
import logging
import argparse
import json
import time
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def display_results(result, checker, args):
    """
    Display health check results

    Args:
        result: Health check result
        checker: Health checker instance
        args: Command line arguments
    """
    # Display health status with color
    status = result.get("status", "unknown")
    status_color = {
        "ok": "\033[92m",  # Green
        "warn": "\033[93m",  # Yellow
        "error": "\033[91m",  # Red
        "critical": "\033[91;1m",  # Bold Red
        "unknown": "\033[94m"  # Blue
    }.get(status, "\033[0m")
    reset_color = "\033[0m"

    logger.info(f"Health status: {status_color}{status}{reset_color}")

    # Display detailed check results if verbose
    if args.verbose:
        logger.info("Detailed check results:")
        for check_name, check_result in result.get("checks", {}).items():
            check_status = check_result.get("status", "unknown")
            status_emoji = "✅" if check_status == "ok" else "⚠️" if check_status == "warn" else "❌"
            logger.info(f"{status_emoji} {check_name}: {check_status}")

            if "details" in check_result:
                for key, value in check_result.get("details", {}).items():
                    logger.info(f"  - {key}: {value}")

    # Get recommendations
    recommendations = checker.get_recommendations(result)

    # Display recommendations
    if recommendations:
        logger.info("Recommendations:")
        for i, rec in enumerate(recommendations, 1):
            priority = rec.get("priority", "medium")
            priority_marker = "🔴" if priority == "high" else "🟠" if priority == "medium" else "🟡"
            logger.info(f"{priority_marker} {rec.get('title')}: {rec.get('action')}")
    else:
        logger.info("No recommendations - Vector Search is healthy!")

    # Display metrics
    if args.verbose and "metrics" in result:
        logger.info("Performance metrics:")
        for metric_name, metric_value in result.get("metrics", {}).items():
            logger.info(f"  - {metric_name}: {metric_value}")

    # Output in JSON format if requested
    if args.output_format == "json":
        print(json.dumps(result, indent=2))

def run_detailed_check(checker, args):
    """
    Run a detailed health check

    Args:
        checker: Health checker instance
        args: Command line arguments
    """
    # Perform health check
    result = checker.check_health()

    # Display results
    display_results(result, checker, args)

    # Generate and save report
    logger.info(f"Generating health report and saving to {args.report_file}...")
    checker.save_report_to_file(args.report_file)

    # Display report summary
    report = checker.generate_report()
    logger.info(f"Report generated with status: {report['current_status']}")

    # Display trends if available
    if "trends" in report and report["trends"]:
        logger.info("Performance trends:")
        for metric_name, trend_data in report["trends"].items():
            trend_symbol = "↗️" if trend_data.get("trend") == "improving" else "↘️" if trend_data.get("trend") == "degrading" else "➡️"
            logger.info(f"  {trend_symbol} {metric_name}: {trend_data.get('trend')} ({trend_data.get('previous')} → {trend_data.get('current')})")

def run_monitor_mode(checker, args):
    """
    Run continuous monitoring

    Args:
        checker: Health checker instance
        args: Command line arguments
    """
    check_count = 0
    try:
        while args.count == 0 or check_count < args.count:
            # Perform health check
            logger.info(f"Performing health check #{check_count + 1}...")
            result = checker.check_health()

            # Display results
            display_results(result, checker, args)

            # Save report if status is not ok
            if result.get("status") != "ok":
                report_file = f"vector_search_health_alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                logger.warning(f"Detected issues! Saving alert report to {report_file}")
                checker.save_report_to_file(report_file)

            check_count += 1

            # Exit if we've reached the count
            if args.count > 0 and check_count >= args.count:
                break

            # Wait for the next interval
            logger.info(f"Waiting {args.interval} seconds until next check...")
            time.sleep(args.interval)

    except KeyboardInterrupt:
        logger.info("Monitoring stopped by user")

    # Generate final report
    logger.info("Generating final health report...")
    checker.save_report_to_file(args.report_file)
    logger.info(f"Final report saved to {args.report_file}")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Test Vector Search Health Checker")
    parser.add_argument("--report-file", type=str,
                        default=f"vector_search_health_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                        help="Path to save the health report")
    parser.add_argument("--verbose", action="store_true",
                        help="Enable verbose output with detailed check results")
    parser.add_argument("--mode", choices=["basic", "detailed", "monitor"], default="basic",
                        help="Test mode: basic (quick check), detailed (comprehensive), or monitor (continuous)")
    parser.add_argument("--interval", type=int, default=300,
                        help="Interval in seconds between checks when using monitor mode")
    parser.add_argument("--count", type=int, default=1,
                        help="Number of checks to perform (unlimited if 0)")
    parser.add_argument("--client", choices=["auto", "basic", "enhanced", "mock"], default="auto",
                        help="Vector Search client to use")
    parser.add_argument("--output-format", choices=["text", "json"], default="text",
                        help="Output format for results")
    args = parser.parse_args()

    # Import the Vector Search Health Checker
    from tools.vector_search.health_checker import VectorSearchHealthChecker

    # Initialize the appropriate Vector Search client based on user choice
    vector_search_client = None
    if args.client != "auto":
        logger.info(f"Initializing {args.client} Vector Search client...")
        if args.client == "basic":
            from tools.vector_search.vector_search_client import VectorSearchClient
            vector_search_client = VectorSearchClient()
        elif args.client == "enhanced":
            from tools.vector_search.enhanced_vector_search_client import EnhancedVectorSearchClient
            vector_search_client = EnhancedVectorSearchClient()
        elif args.client == "mock":
            from tests.mocks.vector_search_mock import MockVectorSearchClient
            vector_search_client = MockVectorSearchClient()

    # Create the health checker
    logger.info("Creating Vector Search Health Checker...")
    checker = VectorSearchHealthChecker(vector_search_client=vector_search_client)

    # Handle different modes
    try:
        if args.mode == "monitor":
            logger.info(f"Starting monitoring mode with {args.interval}s interval...")
            run_monitor_mode(checker, args)
        elif args.mode == "detailed":
            logger.info("Running detailed health check...")
            run_detailed_check(checker, args)
        else:  # basic mode
            logger.info("Performing basic health check...")
            result = checker.check_health()
            display_results(result, checker, args)

            # Save report for basic mode too
            logger.info(f"Saving basic health report to {args.report_file}...")
            checker.save_report_to_file(args.report_file)
            logger.info(f"Report saved to {args.report_file}")
    except Exception as e:
        logger.error(f"Error during health check: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
