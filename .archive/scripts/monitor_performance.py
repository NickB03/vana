#!/usr/bin/env python3
"""
Performance Monitoring Script for VANA
Continuously monitors system performance and generates reports
"""

import argparse
import json
import signal
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from agents.vana.enhanced_orchestrator_v2 import advanced_router
from lib._shared_libraries.db_connection_pool import get_connection_manager
from lib._shared_libraries.orchestrator_metrics import get_orchestrator_metrics
from lib._shared_libraries.redis_cache_service import get_redis_cache
from lib.logging_config import get_logger

logger = get_logger("vana.performance_monitor")


class PerformanceMonitor:
    """Continuous performance monitoring"""

    def __init__(self, interval: int = 60, output_dir: str = "performance_logs"):
        self.interval = interval
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.running = False
        self.thread = None
        self.metrics_history = []

    def start(self):
        """Start monitoring"""
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop)
        self.thread.daemon = True
        self.thread.start()
        logger.info(f"Performance monitoring started (interval: {self.interval}s)")

    def stop(self):
        """Stop monitoring"""
        self.running = False
        if self.thread:
            self.thread.join()
        logger.info("Performance monitoring stopped")

    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                metrics = self._collect_metrics()
                self._save_metrics(metrics)
                self._check_alerts(metrics)
                time.sleep(self.interval)
            except Exception as e:
                logger.error(f"Monitoring error: {e}")

    def _collect_metrics(self) -> dict:
        """Collect all performance metrics"""
        timestamp = datetime.now()

        # Get cache statistics
        cache = get_redis_cache()
        cache_stats = cache.get_stats()

        # Get orchestrator metrics
        orchestrator = get_orchestrator_metrics()
        orchestrator_stats = orchestrator.get_summary()

        # Get connection pool stats
        conn_manager = get_connection_manager()
        pool_stats = conn_manager.get_all_stats()

        # Get routing statistics
        routing_stats = {
            "total_routing_decisions": len(advanced_router.routing_history),
            "specialist_performance": dict(advanced_router.specialist_performance),
        }

        # Calculate derived metrics
        cache_efficiency = cache_stats.get("hit_rate", 0) if cache_stats.get("available") else 0
        avg_response_time = orchestrator_stats.get("average_response_time", 0)
        error_rate = (
            orchestrator_stats.get("error_count", 0) / max(orchestrator_stats.get("total_requests", 1), 1)
        ) * 100

        metrics = {
            "timestamp": timestamp.isoformat(),
            "summary": {
                "cache_efficiency": cache_efficiency,
                "avg_response_time_ms": avg_response_time * 1000,
                "error_rate_percent": error_rate,
                "total_requests": orchestrator_stats.get("total_requests", 0),
                "cache_hit_rate": orchestrator_stats.get("cache_hit_rate", 0),
            },
            "cache": cache_stats,
            "orchestrator": orchestrator_stats,
            "connection_pools": pool_stats,
            "routing": routing_stats,
        }

        self.metrics_history.append(metrics)
        # Keep only last 1000 entries
        if len(self.metrics_history) > 1000:
            self.metrics_history = self.metrics_history[-1000:]

        return metrics

    def _save_metrics(self, metrics: dict):
        """Save metrics to file"""
        filename = f"metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = self.output_dir / filename

        with open(filepath, "w") as f:
            json.dump(metrics, f, indent=2)

    def _check_alerts(self, metrics: dict):
        """Check for performance alerts"""
        alerts = []

        # Check cache efficiency
        if metrics["summary"]["cache_efficiency"] < 50:
            alerts.append(f"Low cache efficiency: {metrics['summary']['cache_efficiency']:.1f}%")

        # Check response time
        if metrics["summary"]["avg_response_time_ms"] > 1000:
            alerts.append(f"High response time: {metrics['summary']['avg_response_time_ms']:.0f}ms")

        # Check error rate
        if metrics["summary"]["error_rate_percent"] > 5:
            alerts.append(f"High error rate: {metrics['summary']['error_rate_percent']:.1f}%")

        # Check connection pool
        for pool_name, pool_stats in metrics["connection_pools"].items():
            if pool_stats.get("pool_exhausted_count", 0) > 0:
                alerts.append(f"Connection pool '{pool_name}' exhausted")

        # Log alerts
        for alert in alerts:
            logger.warning(f"PERFORMANCE ALERT: {alert}")

    def generate_report(self) -> dict:
        """Generate performance report from collected metrics"""
        if not self.metrics_history:
            return {"error": "No metrics collected"}

        # Analyze trends
        response_times = [m["summary"]["avg_response_time_ms"] for m in self.metrics_history]
        cache_rates = [m["summary"]["cache_hit_rate"] for m in self.metrics_history]
        error_rates = [m["summary"]["error_rate_percent"] for m in self.metrics_history]

        report = {
            "period": {
                "start": self.metrics_history[0]["timestamp"],
                "end": self.metrics_history[-1]["timestamp"],
                "samples": len(self.metrics_history),
            },
            "response_time": {
                "avg": sum(response_times) / len(response_times),
                "min": min(response_times),
                "max": max(response_times),
                "trend": "increasing" if response_times[-1] > response_times[0] else "decreasing",
            },
            "cache_performance": {
                "avg_hit_rate": sum(cache_rates) / len(cache_rates),
                "min_hit_rate": min(cache_rates),
                "max_hit_rate": max(cache_rates),
            },
            "reliability": {"avg_error_rate": sum(error_rates) / len(error_rates), "max_error_rate": max(error_rates)},
            "specialist_usage": self._analyze_specialist_usage(),
        }

        return report

    def _analyze_specialist_usage(self) -> dict:
        """Analyze specialist usage patterns"""
        if not self.metrics_history:
            return {}

        latest = self.metrics_history[-1]
        specialist_perf = latest["routing"]["specialist_performance"]

        usage = {}
        for specialist, stats in specialist_perf.items():
            if stats["total"] > 0:
                usage[specialist] = {
                    "requests": stats["total"],
                    "success_rate": (stats["success"] / stats["total"]) * 100,
                }

        return usage


def main():
    """Main monitoring function"""
    parser = argparse.ArgumentParser(description="VANA Performance Monitor")
    parser.add_argument("--interval", type=int, default=60, help="Monitoring interval in seconds")
    parser.add_argument("--output", default="performance_logs", help="Output directory")
    parser.add_argument("--duration", type=int, help="Run for specified minutes (optional)")

    args = parser.parse_args()

    # Create monitor
    monitor = PerformanceMonitor(interval=args.interval, output_dir=args.output)

    # Setup signal handlers
    def signal_handler(signum, frame):
        logger.info("Received shutdown signal")
        monitor.stop()
        # Generate final report
        report = monitor.generate_report()
        report_path = Path(args.output) / "final_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        logger.info(f"Final report saved to {report_path}")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Start monitoring
    monitor.start()

    # Run for duration or until interrupted
    if args.duration:
        logger.info(f"Monitoring for {args.duration} minutes...")
        time.sleep(args.duration * 60)
        signal_handler(None, None)
    else:
        logger.info("Monitoring continuously. Press Ctrl+C to stop...")
        while True:
            time.sleep(1)


if __name__ == "__main__":
    main()
