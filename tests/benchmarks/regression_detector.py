"""
Performance Regression Detector for VANA Testing Framework

Detects performance regressions by comparing current performance metrics
against established baselines and historical trends.

Features:
- Automated regression detection
- Statistical analysis of performance trends
- Configurable regression thresholds
- Regression severity classification
- Detailed regression reporting
"""

import logging
import statistics
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RegressionSeverity(Enum):
    """Severity levels for performance regressions."""

    NONE = "none"
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    CRITICAL = "critical"


@dataclass
class PerformanceRegression:
    """Detected performance regression with detailed analysis."""

    benchmark_name: str
    metric_name: str
    baseline_value: float
    current_value: float
    regression_percentage: float
    severity: RegressionSeverity
    confidence: float
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert regression to dictionary."""
        return {
            "benchmark_name": self.benchmark_name,
            "metric_name": self.metric_name,
            "baseline_value": self.baseline_value,
            "current_value": self.current_value,
            "regression_percentage": self.regression_percentage,
            "severity": self.severity.value,
            "confidence": self.confidence,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


class RegressionDetector:
    """Detects performance regressions using statistical analysis."""

    def __init__(
        self,
        minor_threshold: float = 5.0,
        moderate_threshold: float = 15.0,
        major_threshold: float = 30.0,
        critical_threshold: float = 50.0,
        confidence_threshold: float = 0.8,
    ):
        """
        Initialize regression detector with configurable thresholds.

        Args:
            minor_threshold: Percentage threshold for minor regressions
            moderate_threshold: Percentage threshold for moderate regressions
            major_threshold: Percentage threshold for major regressions
            critical_threshold: Percentage threshold for critical regressions
            confidence_threshold: Minimum confidence level for regression detection
        """
        self.minor_threshold = minor_threshold
        self.moderate_threshold = moderate_threshold
        self.major_threshold = major_threshold
        self.critical_threshold = critical_threshold
        self.confidence_threshold = confidence_threshold

        self.detected_regressions: List[PerformanceRegression] = []

    def detect_regression(
        self,
        benchmark_name: str,
        metric_name: str,
        baseline_value: float,
        current_values: List[float],
        baseline_std_dev: Optional[float] = None,
    ) -> Optional[PerformanceRegression]:
        """
        Detect regression by comparing current values to baseline.

        Args:
            benchmark_name: Name of the benchmark
            metric_name: Name of the metric
            baseline_value: Baseline performance value
            current_values: List of current performance measurements
            baseline_std_dev: Standard deviation of baseline (if available)

        Returns:
            PerformanceRegression if regression detected, None otherwise
        """
        if not current_values:
            return None

        # Calculate current performance statistics
        current_mean = statistics.mean(current_values)
        current_std_dev = statistics.stdev(current_values) if len(current_values) > 1 else 0

        # Calculate regression percentage (assuming higher values are worse)
        if baseline_value == 0:
            return None  # Cannot calculate percentage change

        regression_percentage = ((current_mean - baseline_value) / baseline_value) * 100

        # Determine if this is actually a regression (performance got worse)
        if regression_percentage <= 0:
            return None  # Performance improved or stayed the same

        # Calculate confidence in regression detection
        confidence = self._calculate_confidence(baseline_value, current_values, baseline_std_dev, current_std_dev)

        # Check if confidence meets threshold
        if confidence < self.confidence_threshold:
            return None

        # Determine severity
        severity = self._classify_severity(regression_percentage)

        if severity == RegressionSeverity.NONE:
            return None

        # Create regression object
        regression = PerformanceRegression(
            benchmark_name=benchmark_name,
            metric_name=metric_name,
            baseline_value=baseline_value,
            current_value=current_mean,
            regression_percentage=regression_percentage,
            severity=severity,
            confidence=confidence,
            timestamp=time.time(),
            metadata={
                "current_std_dev": current_std_dev,
                "baseline_std_dev": baseline_std_dev,
                "sample_size": len(current_values),
                "min_current": min(current_values),
                "max_current": max(current_values),
                "median_current": statistics.median(current_values),
            },
        )

        self.detected_regressions.append(regression)

        logger.warning(
            f"Performance regression detected: {benchmark_name}.{metric_name} "
            f"regressed by {regression_percentage:.1f}% (severity: {severity.value})"
        )

        return regression

    def _calculate_confidence(
        self,
        baseline_value: float,
        current_values: List[float],
        baseline_std_dev: Optional[float],
        current_std_dev: float,
    ) -> float:
        """Calculate confidence in regression detection using statistical analysis."""

        # Base confidence on sample size
        sample_size_factor = min(len(current_values) / 10.0, 1.0)  # Max factor of 1.0 at 10+ samples

        # Factor in variability
        if baseline_std_dev is not None and baseline_std_dev > 0:
            # Compare variability between baseline and current
            variability_ratio = current_std_dev / baseline_std_dev
            variability_factor = 1.0 / (1.0 + variability_ratio)  # Lower variability = higher confidence
        else:
            # Use current variability relative to mean
            if len(current_values) > 1 and statistics.mean(current_values) > 0:
                cv = current_std_dev / statistics.mean(current_values)  # Coefficient of variation
                variability_factor = 1.0 / (1.0 + cv)
            else:
                variability_factor = 0.5  # Neutral factor

        # Factor in magnitude of change
        current_mean = statistics.mean(current_values)
        change_magnitude = abs(current_mean - baseline_value) / baseline_value if baseline_value > 0 else 0
        magnitude_factor = min(change_magnitude / 0.1, 1.0)  # Max factor of 1.0 at 10% change

        # Combine factors
        confidence = sample_size_factor * 0.4 + variability_factor * 0.4 + magnitude_factor * 0.2

        return min(confidence, 1.0)

    def _classify_severity(self, regression_percentage: float) -> RegressionSeverity:
        """Classify regression severity based on percentage change."""
        if regression_percentage >= self.critical_threshold:
            return RegressionSeverity.CRITICAL
        elif regression_percentage >= self.major_threshold:
            return RegressionSeverity.MAJOR
        elif regression_percentage >= self.moderate_threshold:
            return RegressionSeverity.MODERATE
        elif regression_percentage >= self.minor_threshold:
            return RegressionSeverity.MINOR
        else:
            return RegressionSeverity.NONE

    def detect_trend_regression(
        self,
        benchmark_name: str,
        metric_name: str,
        historical_values: List[Tuple[float, float]],  # (timestamp, value)
        trend_window: int = 5,
    ) -> Optional[PerformanceRegression]:
        """
        Detect regression based on performance trends over time.

        Args:
            benchmark_name: Name of the benchmark
            metric_name: Name of the metric
            historical_values: List of (timestamp, value) tuples
            trend_window: Number of recent measurements to analyze

        Returns:
            PerformanceRegression if trend regression detected, None otherwise
        """
        if len(historical_values) < trend_window * 2:
            return None  # Not enough data for trend analysis

        # Sort by timestamp
        sorted_values = sorted(historical_values, key=lambda x: x[0])

        # Split into baseline (older) and current (recent) periods
        split_point = len(sorted_values) - trend_window
        baseline_values = [v[1] for v in sorted_values[:split_point]]
        current_values = [v[1] for v in sorted_values[split_point:]]

        if not baseline_values or not current_values:
            return None

        # Calculate baseline statistics
        baseline_mean = statistics.mean(baseline_values)
        baseline_std_dev = statistics.stdev(baseline_values) if len(baseline_values) > 1 else 0

        # Use standard regression detection
        regression = self.detect_regression(
            benchmark_name, metric_name, baseline_mean, current_values, baseline_std_dev
        )

        if regression:
            regression.metadata["trend_analysis"] = True
            regression.metadata["baseline_period_size"] = len(baseline_values)
            regression.metadata["trend_window"] = trend_window

        return regression

    def get_regression_summary(self) -> Dict[str, Any]:
        """Get summary of all detected regressions."""
        if not self.detected_regressions:
            return {"total_regressions": 0, "message": "No regressions detected"}

        # Count by severity
        severity_counts = {severity.value: 0 for severity in RegressionSeverity}
        for regression in self.detected_regressions:
            severity_counts[regression.severity.value] += 1

        # Group by benchmark
        by_benchmark = {}
        for regression in self.detected_regressions:
            if regression.benchmark_name not in by_benchmark:
                by_benchmark[regression.benchmark_name] = []
            by_benchmark[regression.benchmark_name].append(regression)

        return {
            "total_regressions": len(self.detected_regressions),
            "severity_breakdown": severity_counts,
            "affected_benchmarks": len(by_benchmark),
            "benchmarks": {
                name: {"regression_count": len(regressions), "regressions": [r.to_dict() for r in regressions]}
                for name, regressions in by_benchmark.items()
            },
        }

    def get_critical_regressions(self) -> List[PerformanceRegression]:
        """Get list of critical regressions that require immediate attention."""
        return [
            r
            for r in self.detected_regressions
            if r.severity in [RegressionSeverity.CRITICAL, RegressionSeverity.MAJOR]
        ]

    def clear_regressions(self):
        """Clear all detected regressions."""
        self.detected_regressions.clear()
        logger.info("Cleared all detected regressions")

    def configure_thresholds(
        self,
        minor: Optional[float] = None,
        moderate: Optional[float] = None,
        major: Optional[float] = None,
        critical: Optional[float] = None,
        confidence: Optional[float] = None,
    ):
        """Update regression detection thresholds."""
        if minor is not None:
            self.minor_threshold = minor
        if moderate is not None:
            self.moderate_threshold = moderate
        if major is not None:
            self.major_threshold = major
        if critical is not None:
            self.critical_threshold = critical
        if confidence is not None:
            self.confidence_threshold = confidence

        logger.info(
            f"Updated regression thresholds: minor={self.minor_threshold}%, "
            f"moderate={self.moderate_threshold}%, major={self.major_threshold}%, "
            f"critical={self.critical_threshold}%, confidence={self.confidence_threshold}"
        )

    def generate_regression_report(self) -> str:
        """Generate human-readable regression report."""
        if not self.detected_regressions:
            return "No performance regressions detected."

        report_lines = [
            "Performance Regression Report",
            "=" * 30,
            f"Total regressions detected: {len(self.detected_regressions)}",
            "",
        ]

        # Group by severity
        by_severity = {}
        for regression in self.detected_regressions:
            if regression.severity not in by_severity:
                by_severity[regression.severity] = []
            by_severity[regression.severity].append(regression)

        # Report by severity (most severe first)
        severity_order = [
            RegressionSeverity.CRITICAL,
            RegressionSeverity.MAJOR,
            RegressionSeverity.MODERATE,
            RegressionSeverity.MINOR,
        ]

        for severity in severity_order:
            if severity in by_severity:
                regressions = by_severity[severity]
                report_lines.append(f"{severity.value.upper()} Regressions ({len(regressions)}):")
                report_lines.append("-" * 20)

                for regression in regressions:
                    report_lines.append(
                        f"  • {regression.benchmark_name}.{regression.metric_name}: "
                        f"{regression.regression_percentage:.1f}% regression "
                        f"({regression.baseline_value:.3f} → {regression.current_value:.3f}) "
                        f"[confidence: {regression.confidence:.2f}]"
                    )

                report_lines.append("")

        return "\n".join(report_lines)
