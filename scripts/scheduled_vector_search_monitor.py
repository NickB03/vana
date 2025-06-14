#!/usr/bin/env python3
"""
Scheduled Vector Search Health Monitoring

This script provides a scheduled monitoring service for Vector Search health.
It runs health checks at regular intervals, stores historical data,
and can generate alerts for critical issues.

Usage:
    python scripts/scheduled_vector_search_monitor.py [options]

Options:
    --interval MINUTES    Monitoring interval in minutes (default: 15)
    --no-store            Don't store historical reports
    --alert-level LEVEL   Minimum level to trigger alerts (ok, warn, error, critical)
    --alert-method METHOD Alert method (log, file, both)
    --history-dir DIR     Directory to store historical reports
    --log-file FILE       Log file path
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import schedule

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


def setup_logging(log_file=None):
    """
    Set up logging configuration

    Args:
        log_file: Path to log file (optional)
    """
    handlers = [logging.StreamHandler()]

    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)

        handlers.append(logging.FileHandler(log_file))

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=handlers)


def run_health_check(
    store_history=True, history_dir="health_history", alert_level="error", alert_method="log", degraded_mode=False
):
    """
    Run health check and store results if needed

    Args:
        store_history: Whether to store historical reports
        history_dir: Directory to store historical reports
        alert_level: Minimum level to trigger alerts
        alert_method: Alert method (log, file, both)
        degraded_mode: Whether to run in degraded mode (limited checks)

    Returns:
        Health check result
    """
    from tools.monitoring.circuit_breaker import CircuitBreaker, CircuitOpenError
    from tools.vector_search.health_checker import VectorSearchHealthChecker

    # Create circuit breaker for health check
    health_check_cb = CircuitBreaker(
        failure_threshold=3, recovery_timeout=300, name="vector-search-health-check"  # 5 minutes
    )

    # Fallback function for degraded mode
    def degraded_health_check():
        logger.warning("Running health check in DEGRADED MODE - limited functionality")

        # Create a basic result with limited checks
        result = {
            "timestamp": datetime.now().isoformat(),
            "status": "unknown",
            "checks": {"environment": {"status": "unknown", "details": {"message": "Running in degraded mode"}}},
            "metrics": {},
            "issues": [
                {"severity": "warn", "message": "Health check running in degraded mode due to previous failures"}
            ],
        }

        # Try to check environment variables at minimum
        try:
            # Create health checker
            checker = VectorSearchHealthChecker()

            # Only check environment
            env_check = checker._check_environment()
            result["checks"]["environment"] = env_check

            # Set overall status based on environment check
            result["status"] = env_check.get("status", "unknown")

        except Exception as e:
            logger.error(f"Error in degraded health check: {e}")
            result["status"] = "error"
            result["issues"].append({"severity": "error", "message": f"Error in degraded health check: {str(e)}"})

        return result, None  # No checker object in degraded mode

    try:
        # Use circuit breaker to protect against repeated failures
        @health_check_cb
        def protected_health_check():
            # Create health checker
            checker = VectorSearchHealthChecker()

            # Run health check
            result = checker.check_health()
            return result, checker

        # Run the health check with circuit breaker protection
        if degraded_mode:
            result, checker = degraded_health_check()
        else:
            try:
                result, checker = protected_health_check()
            except CircuitOpenError:
                logger.warning("Circuit breaker open - falling back to degraded mode")
                result, checker = degraded_health_check()

        status = result.get("status", "unknown")
        logger.info(f"Health check completed - Status: {status}")

        # Store historical data if requested
        if store_history:
            try:
                # Create history directory if it doesn't exist
                history_path = Path(history_dir)
                history_path.mkdir(exist_ok=True, parents=True)

                # Save report with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = history_path / f"vector_search_health_{timestamp}.json"

                # Save directly if no checker is available
                if checker is None:
                    with open(filename, "w") as f:
                        json.dump(result, f, indent=2)
                else:
                    checker.save_report_to_file(str(filename))

                logger.info(f"Health report saved to {filename}")
            except Exception as e:
                logger.error(f"Failed to save health report: {e}")

        # Check if alert should be triggered
        alert_levels = {"ok": 0, "warn": 1, "error": 2, "critical": 3, "unknown": 4}

        if alert_levels.get(status, 0) >= alert_levels.get(alert_level, 0):
            trigger_alert(result, checker, alert_method)

        return result

    except Exception as e:
        logger.error(f"Unexpected error in health check: {e}")

        # Create a minimal result for the error
        error_result = {
            "timestamp": datetime.now().isoformat(),
            "status": "error",
            "checks": {},
            "metrics": {},
            "issues": [{"severity": "error", "message": f"Unexpected error in health check: {str(e)}"}],
        }

        # Trigger alert for the error
        trigger_alert(error_result, None, alert_method)

        return error_result


def trigger_alert(result, checker, alert_method="log"):
    """
    Trigger an alert based on health check result

    Args:
        result: Health check result
        checker: Health checker instance (can be None in degraded mode)
        alert_method: Alert method (log, file, both)
    """
    status = result.get("status", "unknown")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Create alert message
    alert_message = f"ALERT: Vector Search Health Status: {status} at {timestamp}\n"

    # Get issues from result
    issues = result.get("issues", [])
    if issues:
        alert_message += "\nIssues:\n"
        for i, issue in enumerate(issues, 1):
            alert_message += f"{i}. [{issue.get('severity', 'unknown')}] {issue.get('message')}\n"

    # Get recommendations if checker is available
    if checker is not None:
        try:
            recommendations = checker.get_recommendations(result)

            if recommendations:
                alert_message += "\nRecommendations:\n"
                for i, rec in enumerate(recommendations, 1):
                    alert_message += f"{i}. [{rec.get('priority', 'medium')}] {rec.get('title')}: {rec.get('action')}\n"
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            alert_message += f"\nError getting recommendations: {str(e)}\n"
    else:
        # Add a note that recommendations are not available in degraded mode
        alert_message += "\nNote: Detailed recommendations not available (running in degraded mode)\n"

    # Log alert
    if alert_method in ["log", "both"]:
        logger.warning(alert_message)

    # Save alert to file
    if alert_method in ["file", "both"]:
        try:
            alerts_dir = Path("alerts")
            alerts_dir.mkdir(exist_ok=True)

            alert_file = alerts_dir / f"vector_search_alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"

            with open(alert_file, "w") as f:
                f.write(alert_message)

                # Add detailed information
                f.write("\nDetailed Health Check Result:\n")
                f.write(json.dumps(result, indent=2))

            logger.info(f"Alert saved to {alert_file}")
        except Exception as e:
            logger.error(f"Error saving alert to file: {e}")
            # Still try to log the alert if file saving fails
            if alert_method != "log":
                logger.warning(alert_message)


def analyze_history(history_dir="health_history", days=7):
    """
    Analyze historical health check data

    Args:
        history_dir: Directory containing historical reports
        days: Number of days to analyze

    Returns:
        Analysis results
    """
    history_path = Path(history_dir)

    if not history_path.exists():
        logger.warning(f"History directory {history_dir} does not exist")
        return None

    # Get all history files
    history_files = list(history_path.glob("vector_search_health_*.json"))

    if not history_files:
        logger.warning(f"No history files found in {history_dir}")
        return None

    # Sort by modification time (newest first)
    history_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    # Limit to files from the last N days
    cutoff_time = time.time() - (days * 24 * 60 * 60)
    recent_files = [f for f in history_files if f.stat().st_mtime >= cutoff_time]

    if not recent_files:
        logger.warning(f"No history files found from the last {days} days")
        return None

    # Load and analyze history files
    status_counts = {"ok": 0, "warn": 0, "error": 0, "critical": 0, "unknown": 0}
    response_times = []
    success_rates = []

    for file_path in recent_files:
        try:
            with open(file_path, "r") as f:
                data = json.load(f)

                # Count statuses
                status = data.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1

                # Collect metrics
                metrics = data.get("metrics", {})
                if "response_time" in metrics:
                    response_times.append(metrics["response_time"])
                if "success_rate" in metrics:
                    success_rates.append(metrics["success_rate"])
        except Exception as e:
            logger.error(f"Error processing history file {file_path}: {e}")

    # Calculate averages
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    avg_success_rate = sum(success_rates) / len(success_rates) if success_rates else 0

    # Create analysis result
    analysis = {
        "total_checks": len(recent_files),
        "status_counts": status_counts,
        "health_percentage": (status_counts.get("ok", 0) / len(recent_files)) * 100 if recent_files else 0,
        "avg_response_time": avg_response_time,
        "avg_success_rate": avg_success_rate,
        "analyzed_days": days,
        "timestamp": datetime.now().isoformat(),
    }

    return analysis


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Scheduled Vector Search Health Monitoring")
    parser.add_argument("--interval", type=int, default=15, help="Monitoring interval in minutes")
    parser.add_argument("--no-store", action="store_true", help="Don't store historical reports")
    parser.add_argument(
        "--alert-level",
        choices=["ok", "warn", "error", "critical"],
        default="error",
        help="Minimum level to trigger alerts",
    )
    parser.add_argument("--alert-method", choices=["log", "file", "both"], default="log", help="Alert method")
    parser.add_argument(
        "--history-dir", type=str, default="health_history", help="Directory to store historical reports"
    )
    parser.add_argument("--log-file", type=str, default=None, help="Log file path")
    parser.add_argument("--degraded-mode", action="store_true", help="Start in degraded mode (limited functionality)")
    parser.add_argument(
        "--adaptive-interval", action="store_true", help="Use adaptive monitoring intervals based on system health"
    )
    parser.add_argument("--retention-days", type=int, default=30, help="Number of days to retain historical data")
    args = parser.parse_args()

    # Set up logging
    setup_logging(args.log_file)

    # Run initial health check
    logger.info(f"Starting Vector Search health monitoring (interval: {args.interval} minutes)")

    # Track consecutive failures for adaptive monitoring
    consecutive_failures = 0
    current_interval = args.interval

    # Run initial health check
    result = run_health_check(
        store_history=not args.no_store,
        history_dir=args.history_dir,
        alert_level=args.alert_level,
        alert_method=args.alert_method,
        degraded_mode=args.degraded_mode,
    )

    # Update failure count based on result
    if result.get("status") in ["error", "critical"]:
        consecutive_failures += 1
    else:
        consecutive_failures = 0

    # Schedule regular health checks with dynamic scheduling
    def scheduled_health_check():
        nonlocal consecutive_failures, current_interval

        # Determine if we should use degraded mode
        use_degraded_mode = args.degraded_mode or consecutive_failures >= 5

        # Run health check
        result = run_health_check(
            store_history=not args.no_store,
            history_dir=args.history_dir,
            alert_level=args.alert_level,
            alert_method=args.alert_method,
            degraded_mode=use_degraded_mode,
        )

        # Update failure count based on result
        if result.get("status") in ["error", "critical"]:
            consecutive_failures += 1
        else:
            consecutive_failures = 0

        # Adjust interval if adaptive monitoring is enabled
        if args.adaptive_interval:
            if consecutive_failures > 3:
                # Increase frequency for repeated failures (minimum 1 minute)
                new_interval = max(1, current_interval // 2)
                if new_interval != current_interval:
                    logger.warning(
                        f"Adjusting monitoring interval due to failures: {current_interval} -> {new_interval} minutes"
                    )
                    current_interval = new_interval

                    # Reschedule with new interval
                    schedule.clear(tag="health_check")
                    schedule.every(current_interval).minutes.do(scheduled_health_check).tag("health_check")
            elif consecutive_failures == 0 and current_interval < args.interval:
                # Gradually return to normal interval
                new_interval = min(args.interval, current_interval * 2)
                if new_interval != current_interval:
                    logger.info(
                        f"Adjusting monitoring interval back toward normal: {current_interval} -> {new_interval} minutes"
                    )
                    current_interval = new_interval

                    # Reschedule with new interval
                    schedule.clear(tag="health_check")
                    schedule.every(current_interval).minutes.do(scheduled_health_check).tag("health_check")

        return result

    # Schedule the health check
    schedule.every(current_interval).minutes.do(scheduled_health_check).tag("health_check")

    # Schedule daily analysis
    schedule.every().day.at("00:00").do(lambda: analyze_and_report_history(args.history_dir)).tag("analysis")

    # Schedule data retention cleanup
    if args.retention_days > 0:
        schedule.every().day.at("01:00").do(lambda: cleanup_old_data(args.history_dir, args.retention_days)).tag(
            "cleanup"
        )

    # Run the scheduling loop
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Sleep for 1 minute between checks
    except KeyboardInterrupt:
        logger.info("Health monitoring stopped by user")


def cleanup_old_data(history_dir="health_history", retention_days=30):
    """
    Clean up old health check data

    Args:
        history_dir: Directory containing historical reports
        retention_days: Number of days to retain data

    Returns:
        Number of files deleted
    """
    logger.info(f"Running data retention cleanup (keeping {retention_days} days of data)...")

    try:
        history_path = Path(history_dir)

        if not history_path.exists():
            logger.warning(f"History directory {history_dir} does not exist")
            return 0

        # Calculate cutoff time
        cutoff_time = time.time() - (retention_days * 24 * 60 * 60)

        # Find files older than cutoff
        old_files = [f for f in history_path.glob("vector_search_health_*.json") if f.stat().st_mtime < cutoff_time]

        # Delete old files
        deleted_count = 0
        for file_path in old_files:
            try:
                file_path.unlink()
                deleted_count += 1
            except Exception as e:
                logger.error(f"Error deleting old file {file_path}: {e}")

        logger.info(f"Deleted {deleted_count} old health check files")

        # Also clean up old analysis files
        analysis_path = Path("analysis")
        if analysis_path.exists():
            old_analysis_files = [
                f for f in analysis_path.glob("vector_search_analysis_*.json") if f.stat().st_mtime < cutoff_time
            ]

            analysis_deleted = 0
            for file_path in old_analysis_files:
                try:
                    file_path.unlink()
                    analysis_deleted += 1
                except Exception as e:
                    logger.error(f"Error deleting old analysis file {file_path}: {e}")

            if analysis_deleted > 0:
                logger.info(f"Deleted {analysis_deleted} old analysis files")

        return deleted_count
    except Exception as e:
        logger.error(f"Error during data cleanup: {e}")
        return 0


def analyze_and_report_history(history_dir="health_history"):
    """Analyze and report on historical health data"""
    logger.info("Running daily health history analysis...")

    analysis = analyze_history(history_dir)

    if analysis:
        # Save analysis report
        analysis_dir = Path("analysis")
        analysis_dir.mkdir(exist_ok=True)

        filename = analysis_dir / f"vector_search_analysis_{datetime.now().strftime('%Y%m%d')}.json"

        with open(filename, "w") as f:
            json.dump(analysis, f, indent=2)

        logger.info(f"Health history analysis saved to {filename}")

        # Log summary
        logger.info("Health history analysis summary:")
        logger.info(f"Total checks: {analysis['total_checks']}")
        logger.info(f"Health percentage: {analysis['health_percentage']:.2f}%")
        logger.info(f"Average response time: {analysis['avg_response_time']:.3f}s")
        logger.info(f"Average success rate: {analysis['avg_success_rate']:.2f}%")

        status_counts = analysis.get("status_counts", {})
        for status, count in status_counts.items():
            logger.info(f"Status '{status}': {count} occurrences")

    return True


if __name__ == "__main__":
    main()
