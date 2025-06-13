#!/usr/bin/env python3
"""
Comprehensive Test Script for Vector Search Health Monitoring System

This script tests all components of the Vector Search Health Monitoring System:
1. Health Checker
2. Scheduled Monitoring
3. Dashboard Integration
4. Circuit Breaker
5. Error Handling
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def test_health_checker(args):
    """
    Test the Vector Search Health Checker
    
    Args:
        args: Command line arguments
    """
    logger.info("=== Testing Vector Search Health Checker ===")
    
    from tools.vector_search.health_checker import VectorSearchHealthChecker
    
    # Create health checker
    checker = VectorSearchHealthChecker()
    
    # Run health check
    logger.info("Running health check...")
    result = checker.check_health()
    
    # Display result
    logger.info(f"Health status: {result.get('status', 'unknown')}")
    
    # Display checks
    for check_name, check_result in result.get("checks", {}).items():
        logger.info(f"Check '{check_name}': {check_result.get('status', 'unknown')}")
    
    # Get recommendations
    recommendations = checker.get_recommendations(result)
    
    # Display recommendations
    if recommendations:
        logger.info("Recommendations:")
        for i, rec in enumerate(recommendations, 1):
            logger.info(f"{i}. [{rec.get('priority', 'medium')}] {rec.get('title')}: {rec.get('action')}")
    else:
        logger.info("No recommendations - Vector Search is healthy!")
    
    # Generate report
    logger.info("Generating health report...")
    report = checker.generate_report()
    
    # Save report to file
    report_file = f"vector_search_health_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    checker.save_report_to_file(report_file)
    logger.info(f"Report saved to {report_file}")
    
    return result

def test_circuit_breaker(args):
    """
    Test the Circuit Breaker
    
    Args:
        args: Command line arguments
    """
    logger.info("=== Testing Circuit Breaker ===")
    
    from tools.monitoring.circuit_breaker import CircuitBreaker, CircuitOpenError
    
    # Create a test function that fails
    def test_function(succeed=True):
        if not succeed:
            raise ValueError("Simulated failure")
        return "Success!"
    
    # Create circuit breaker
    cb = CircuitBreaker(
        failure_threshold=2,
        recovery_timeout=3,
        name="test-circuit-breaker"
    )
    
    # Test circuit breaker
    logger.info("Testing circuit breaker with alternating success/failure...")
    
    for i in range(6):
        try:
            # Alternate between success and failure
            result = cb.call(test_function, i % 2 == 0)
            logger.info(f"Call {i+1}: {result} (Circuit state: {cb.state.value})")
        except Exception as e:
            logger.info(f"Call {i+1}: Error - {e} (Circuit state: {cb.state.value})")
        
        # Wait a bit between calls
        time.sleep(1)
    
    # Wait for recovery timeout
    logger.info("Waiting for recovery timeout...")
    time.sleep(3)
    
    # Test recovery
    try:
        result = cb.call(test_function, True)
        logger.info(f"Recovery test: {result} (Circuit state: {cb.state.value})")
    except Exception as e:
        logger.info(f"Recovery test: Error - {e} (Circuit state: {cb.state.value})")
    
    return True

def test_scheduled_monitoring(args):
    """
    Test the Scheduled Monitoring
    
    Args:
        args: Command line arguments
    """
    logger.info("=== Testing Scheduled Monitoring ===")
    
    # Import the scheduled monitoring module
    from scripts.scheduled_vector_search_monitor import run_health_check, analyze_history, cleanup_old_data
    
    # Create test directory
    test_dir = "test_health_history"
    os.makedirs(test_dir, exist_ok=True)
    
    # Run health check
    logger.info("Running health check...")
    result = run_health_check(
        store_history=True,
        history_dir=test_dir,
        alert_level="warn",
        alert_method="log"
    )
    
    # Display result
    logger.info(f"Health status: {result.get('status', 'unknown')}")
    
    # Run another health check
    logger.info("Running second health check...")
    result = run_health_check(
        store_history=True,
        history_dir=test_dir,
        alert_level="warn",
        alert_method="log"
    )
    
    # Analyze history
    logger.info("Analyzing history...")
    analysis = analyze_history(test_dir)
    
    if analysis:
        logger.info(f"Analysis results:")
        logger.info(f"Total checks: {analysis.get('total_checks', 0)}")
        logger.info(f"Health percentage: {analysis.get('health_percentage', 0):.2f}%")
    
    # Clean up test directory
    if not args.keep_files:
        logger.info("Cleaning up test files...")
        for file in Path(test_dir).glob("*.json"):
            file.unlink()
        os.rmdir(test_dir)
    
    return True

def test_dashboard_integration(args):
    """
    Test the Dashboard Integration
    
    Args:
        args: Command line arguments
    """
    logger.info("=== Testing Dashboard Integration ===")
    
    from dashboard.monitoring.vector_search_monitor import VectorSearchMonitor
    
    # Create monitor
    monitor = VectorSearchMonitor()
    
    # Run health check
    logger.info("Running health check...")
    result = monitor.run_health_check()
    
    # Display result
    logger.info(f"Health status: {result.get('status', 'unknown')}")
    
    # Get dashboard metrics
    logger.info("Getting dashboard metrics...")
    metrics = monitor.get_dashboard_metrics()
    
    # Display metrics
    logger.info(f"Dashboard metrics:")
    logger.info(f"Status: {metrics.get('status', 'unknown')}")
    logger.info(f"Response time: {metrics.get('response_time', 0):.3f}s")
    logger.info(f"Success rate: {metrics.get('success_rate', 0):.2f}%")
    
    # Get historical data
    logger.info("Getting historical data...")
    historical_data = monitor.get_historical_data(days=7)
    
    # Display historical data
    logger.info(f"Historical data:")
    logger.info(f"Total checks: {historical_data.get('total_checks', 0)}")
    logger.info(f"Health percentage: {historical_data.get('health_percentage', 0):.2f}%")
    
    return True

def test_error_handling(args):
    """
    Test Error Handling
    
    Args:
        args: Command line arguments
    """
    logger.info("=== Testing Error Handling ===")
    
    from tools.vector_search.health_checker import VectorSearchHealthChecker
    
    # Test with invalid environment variables
    logger.info("Testing with invalid environment variables...")
    
    # Save original environment variables
    original_env = {}
    for var in ["GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", "VECTOR_SEARCH_ENDPOINT_ID"]:
        original_env[var] = os.environ.get(var)
        if var in os.environ:
            del os.environ[var]
    
    # Create health checker
    checker = VectorSearchHealthChecker()
    
    # Run health check
    result = checker.check_health()
    
    # Display result
    logger.info(f"Health status with invalid environment: {result.get('status', 'unknown')}")
    
    # Restore environment variables
    for var, value in original_env.items():
        if value is not None:
            os.environ[var] = value
    
    # Test with degraded mode
    logger.info("Testing degraded mode...")
    
    from scripts.scheduled_vector_search_monitor import run_health_check
    
    # Run health check in degraded mode
    result = run_health_check(
        store_history=False,
        degraded_mode=True
    )
    
    # Display result
    logger.info(f"Health status in degraded mode: {result.get('status', 'unknown')}")
    
    return True

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Test Vector Search Health Monitoring System")
    parser.add_argument("--component", choices=["all", "health-checker", "circuit-breaker", "scheduled-monitoring", "dashboard-integration", "error-handling"],
                        default="all", help="Component to test")
    parser.add_argument("--keep-files", action="store_true",
                        help="Keep test files after testing")
    args = parser.parse_args()
    
    # Run tests
    if args.component in ["all", "health-checker"]:
        test_health_checker(args)
    
    if args.component in ["all", "circuit-breaker"]:
        test_circuit_breaker(args)
    
    if args.component in ["all", "scheduled-monitoring"]:
        test_scheduled_monitoring(args)
    
    if args.component in ["all", "dashboard-integration"]:
        test_dashboard_integration(args)
    
    if args.component in ["all", "error-handling"]:
        test_error_handling(args)
    
    logger.info("All tests completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
