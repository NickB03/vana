#!/usr/bin/env python3
"""
Vector Search Health Dashboard Integration

This module provides integration between the Vector Search Health Checker
and the monitoring dashboard. It includes:

1. Data collection from health checks
2. Metrics formatting for dashboard display
3. Alert generation for critical issues
4. Historical data visualization
"""

import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

# Add the project root to the Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorSearchMonitor:
    """Vector Search Health Monitor for Dashboard Integration"""

    def __init__(self, history_dir: str = "health_history", max_history: int = 100):
        """
        Initialize the Vector Search Monitor

        Args:
            history_dir: Directory containing historical health reports
            max_history: Maximum number of historical reports to keep in memory
        """
        self.history_dir = Path(history_dir)
        self.max_history = max_history
        self.history_cache = []
        self.last_check_result = None
        self.last_check_time = None

        # Create history directory if it doesn't exist
        self.history_dir.mkdir(exist_ok=True, parents=True)

        # Load initial history
        self._load_history()

    def run_health_check(self) -> dict[str, Any]:
        """
        Run a health check and return the result

        Returns:
            Health check result
        """
        from tools.vector_search.health_checker import VectorSearchHealthChecker

        # Create health checker
        checker = VectorSearchHealthChecker()

        # Run health check
        result = checker.check_health()

        # Save result
        self.last_check_result = result
        self.last_check_time = datetime.now()

        # Save to history
        self._save_to_history(result)

        return result

    def get_dashboard_metrics(self) -> dict[str, Any]:
        """
        Get formatted metrics for dashboard display

        Returns:
            Dashboard metrics
        """
        if not self.last_check_result:
            self.run_health_check()

        # Extract metrics from last check
        metrics = {
            "status": self.last_check_result.get("status", "unknown"),
            "last_check_time": self.last_check_time.isoformat()
            if self.last_check_time
            else None,
            "response_time": self.last_check_result.get("metrics", {}).get(
                "response_time", 0
            ),
            "success_rate": self.last_check_result.get("metrics", {}).get(
                "success_rate", 0
            ),
            "checks": self.last_check_result.get("checks", {}),
            "issues_count": len(self.last_check_result.get("issues", [])),
            "history_count": len(self.history_cache),
        }

        # Add trend data
        metrics["trends"] = self._calculate_trends()

        return metrics

    def get_health_status_summary(self) -> dict[str, Any]:
        """
        Get a summary of the current health status

        Returns:
            Health status summary
        """
        if not self.last_check_result:
            self.run_health_check()

        # Create summary
        summary = {
            "status": self.last_check_result.get("status", "unknown"),
            "last_check_time": self.last_check_time.isoformat()
            if self.last_check_time
            else None,
            "checks_summary": {},
        }

        # Summarize individual checks
        for check_name, check_result in self.last_check_result.get(
            "checks", {}
        ).items():
            summary["checks_summary"][check_name] = check_result.get(
                "status", "unknown"
            )

        # Add recommendations count
        from tools.vector_search.health_checker import VectorSearchHealthChecker

        checker = VectorSearchHealthChecker()
        recommendations = checker.get_recommendations(self.last_check_result)
        summary["recommendations_count"] = len(recommendations)

        # Add high priority recommendations
        high_priority_recs = [
            rec for rec in recommendations if rec.get("priority") == "high"
        ]
        if high_priority_recs:
            summary["high_priority_recommendations"] = [
                rec.get("title") for rec in high_priority_recs
            ]

        return summary

    def get_historical_data(self, days: int = 7) -> dict[str, Any]:
        """
        Get historical health data for the specified number of days

        Args:
            days: Number of days of history to retrieve

        Returns:
            Historical health data
        """
        # Calculate cutoff time
        cutoff_time = datetime.now() - timedelta(days=days)

        # Filter history by date
        filtered_history = []
        for entry in self.history_cache:
            try:
                timestamp = datetime.fromisoformat(entry.get("timestamp", ""))
                if timestamp >= cutoff_time:
                    filtered_history.append(entry)
            except (ValueError, TypeError):
                # Skip entries with invalid timestamps
                continue

        # Extract status counts
        status_counts = {"ok": 0, "warn": 0, "error": 0, "critical": 0, "unknown": 0}
        for entry in filtered_history:
            status = entry.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1

        # Extract metrics over time
        timestamps = []
        response_times = []
        success_rates = []

        for entry in filtered_history:
            try:
                timestamp = datetime.fromisoformat(entry.get("timestamp", ""))
                timestamps.append(timestamp.isoformat())

                metrics = entry.get("metrics", {})
                response_times.append(metrics.get("response_time", 0))
                success_rates.append(metrics.get("success_rate", 0))
            except (ValueError, TypeError):
                # Skip entries with invalid timestamps
                continue

        # Create historical data
        historical_data = {
            "days": days,
            "total_checks": len(filtered_history),
            "status_counts": status_counts,
            "timestamps": timestamps,
            "response_times": response_times,
            "success_rates": success_rates,
            "health_percentage": (status_counts.get("ok", 0) / len(filtered_history))
            * 100
            if filtered_history
            else 0,
        }

        return historical_data

    def _load_history(self) -> None:
        """Load historical health check data"""
        if not self.history_dir.exists():
            logger.warning(f"History directory {self.history_dir} does not exist")
            return

        # Get all history files
        history_files = list(self.history_dir.glob("vector_search_health_*.json"))

        if not history_files:
            logger.info(f"No history files found in {self.history_dir}")
            return

        # Sort by modification time (newest first)
        history_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

        # Limit to max_history files
        history_files = history_files[: self.max_history]

        # Load history files
        for file_path in history_files:
            try:
                with open(file_path) as f:
                    data = json.load(f)
                    self.history_cache.append(data)
            except Exception as e:
                logger.error(f"Error loading history file {file_path}: {e}")

        logger.info(f"Loaded {len(self.history_cache)} historical health check records")

    def _save_to_history(self, result: dict[str, Any]) -> None:
        """
        Save health check result to history

        Args:
            result: Health check result
        """
        # Add to cache
        self.history_cache.insert(0, result)

        # Trim cache if needed
        if len(self.history_cache) > self.max_history:
            self.history_cache = self.history_cache[: self.max_history]

        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.history_dir / f"vector_search_health_{timestamp}.json"

        try:
            with open(filename, "w") as f:
                json.dump(result, f, indent=2)

            logger.debug(f"Saved health check result to {filename}")
        except Exception as e:
            logger.error(f"Error saving health check result to {filename}: {e}")

    def _calculate_trends(self) -> dict[str, Any]:
        """
        Calculate trends from historical data

        Returns:
            Trend data
        """
        if len(self.history_cache) < 2:
            return {}

        # Get the two most recent entries
        current = self.history_cache[0]
        previous = self.history_cache[1]

        # Extract metrics
        current_metrics = current.get("metrics", {})
        previous_metrics = previous.get("metrics", {})

        # Calculate trends
        trends = {}

        # Response time trend
        current_rt = current_metrics.get("response_time", 0)
        previous_rt = previous_metrics.get("response_time", 0)

        if current_rt != 0 and previous_rt != 0:
            rt_change = (
                ((current_rt - previous_rt) / previous_rt) * 100
                if previous_rt != 0
                else 0
            )
            trends["response_time"] = {
                "current": current_rt,
                "previous": previous_rt,
                "change_percent": rt_change,
                "trend": "improving"
                if current_rt < previous_rt
                else "degrading"
                if current_rt > previous_rt
                else "stable",
            }

        # Success rate trend
        current_sr = current_metrics.get("success_rate", 0)
        previous_sr = previous_metrics.get("success_rate", 0)

        if current_sr != 0 and previous_sr != 0:
            sr_change = current_sr - previous_sr
            trends["success_rate"] = {
                "current": current_sr,
                "previous": previous_sr,
                "change": sr_change,
                "trend": "improving"
                if current_sr > previous_sr
                else "degrading"
                if current_sr < previous_sr
                else "stable",
            }

        return trends


# Example usage
def main():
    """Example usage of the Vector Search Monitor"""
    monitor = VectorSearchMonitor()

    # Run health check
    result = monitor.run_health_check()
    print(f"Health status: {result.get('status')}")

    # Get dashboard metrics
    metrics = monitor.get_dashboard_metrics()
    print(f"Dashboard metrics: {json.dumps(metrics, indent=2)}")

    # Get historical data
    historical_data = monitor.get_historical_data(days=7)
    print(f"Historical data: {json.dumps(historical_data, indent=2)}")


if __name__ == "__main__":
    main()
