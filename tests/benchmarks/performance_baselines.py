"""
Performance Baselines Manager for VANA Testing Framework

Manages performance baselines, tracks performance trends, and provides
baseline comparison capabilities for regression detection.

Features:
- Baseline establishment and management
- Performance trend analysis
- Baseline comparison and validation
- Historical performance tracking
- Automated baseline updates
"""

import json
import logging
import statistics
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PerformanceBaseline:
    """Performance baseline for a specific benchmark."""

    benchmark_name: str
    metric_name: str
    baseline_value: float
    unit: str
    confidence_interval: float
    sample_size: int
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert baseline to dictionary."""
        return {
            "benchmark_name": self.benchmark_name,
            "metric_name": self.metric_name,
            "baseline_value": self.baseline_value,
            "unit": self.unit,
            "confidence_interval": self.confidence_interval,
            "sample_size": self.sample_size,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PerformanceBaseline":
        """Create baseline from dictionary."""
        return cls(
            benchmark_name=data["benchmark_name"],
            metric_name=data["metric_name"],
            baseline_value=data["baseline_value"],
            unit=data["unit"],
            confidence_interval=data["confidence_interval"],
            sample_size=data["sample_size"],
            timestamp=data["timestamp"],
            metadata=data.get("metadata", {}),
        )


class PerformanceBaselines:
    """Collection of performance baselines."""

    def __init__(self):
        self.baselines: Dict[str, PerformanceBaseline] = {}

    def add_baseline(self, baseline: PerformanceBaseline):
        """Add a performance baseline."""
        key = f"{baseline.benchmark_name}_{baseline.metric_name}"
        self.baselines[key] = baseline
        logger.info(
            f"Added baseline for {baseline.benchmark_name}.{baseline.metric_name}: {baseline.baseline_value} {baseline.unit}"
        )

    def get_baseline(self, benchmark_name: str, metric_name: str) -> Optional[PerformanceBaseline]:
        """Get baseline for specific benchmark and metric."""
        key = f"{benchmark_name}_{metric_name}"
        return self.baselines.get(key)

    def update_baseline(self, benchmark_name: str, metric_name: str, new_baseline: PerformanceBaseline):
        """Update existing baseline."""
        key = f"{benchmark_name}_{metric_name}"
        if key in self.baselines:
            old_baseline = self.baselines[key]
            logger.info(
                f"Updating baseline for {benchmark_name}.{metric_name}: "
                f"{old_baseline.baseline_value} -> {new_baseline.baseline_value} {new_baseline.unit}"
            )
        self.baselines[key] = new_baseline

    def remove_baseline(self, benchmark_name: str, metric_name: str):
        """Remove baseline for specific benchmark and metric."""
        key = f"{benchmark_name}_{metric_name}"
        if key in self.baselines:
            del self.baselines[key]
            logger.info(f"Removed baseline for {benchmark_name}.{metric_name}")

    def list_baselines(self) -> List[PerformanceBaseline]:
        """Get list of all baselines."""
        return list(self.baselines.values())

    def to_dict(self) -> Dict[str, Any]:
        """Convert baselines to dictionary."""
        return {
            "baselines": {key: baseline.to_dict() for key, baseline in self.baselines.items()},
            "total_baselines": len(self.baselines),
            "last_updated": time.time(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PerformanceBaselines":
        """Create baselines from dictionary."""
        baselines = cls()
        for key, baseline_data in data.get("baselines", {}).items():
            baseline = PerformanceBaseline.from_dict(baseline_data)
            baselines.baselines[key] = baseline
        return baselines


class BaselineManager:
    """Manages performance baselines with persistence and analysis."""

    def __init__(self, baselines_file: Optional[Path] = None):
        self.baselines_file = baselines_file or Path("performance_baselines.json")
        self.baselines = PerformanceBaselines()
        self.load_baselines()

    def load_baselines(self):
        """Load baselines from file."""
        if self.baselines_file.exists():
            try:
                with open(self.baselines_file) as f:
                    data = json.load(f)
                    self.baselines = PerformanceBaselines.from_dict(data)
                logger.info(f"Loaded {len(self.baselines.baselines)} baselines from {self.baselines_file}")
            except Exception as e:
                logger.error(f"Failed to load baselines from {self.baselines_file}: {e}")
                self.baselines = PerformanceBaselines()
        else:
            logger.info(f"No existing baselines file found at {self.baselines_file}")

    def save_baselines(self):
        """Save baselines to file."""
        try:
            with open(self.baselines_file, "w") as f:
                json.dump(self.baselines.to_dict(), f, indent=2)
            logger.info(f"Saved {len(self.baselines.baselines)} baselines to {self.baselines_file}")
        except Exception as e:
            logger.error(f"Failed to save baselines to {self.baselines_file}: {e}")

    def establish_baseline(
        self,
        benchmark_name: str,
        metric_name: str,
        values: List[float],
        unit: str,
        confidence_level: float = 0.95,
    ) -> PerformanceBaseline:
        """Establish baseline from a set of performance measurements."""
        if not values:
            raise ValueError("Cannot establish baseline from empty values")

        # Calculate baseline statistics
        mean_value = statistics.mean(values)
        std_dev = statistics.stdev(values) if len(values) > 1 else 0

        # Calculate confidence interval
        if len(values) > 1:
            # Simple confidence interval calculation
            margin_of_error = 1.96 * (std_dev / (len(values) ** 0.5))  # 95% confidence
            confidence_interval = margin_of_error
        else:
            confidence_interval = 0

        baseline = PerformanceBaseline(
            benchmark_name=benchmark_name,
            metric_name=metric_name,
            baseline_value=mean_value,
            unit=unit,
            confidence_interval=confidence_interval,
            sample_size=len(values),
            timestamp=time.time(),
            metadata={
                "std_dev": std_dev,
                "min_value": min(values),
                "max_value": max(values),
                "median_value": statistics.median(values),
                "confidence_level": confidence_level,
            },
        )

        self.baselines.add_baseline(baseline)
        self.save_baselines()

        return baseline

    def compare_to_baseline(self, benchmark_name: str, metric_name: str, current_value: float) -> Dict[str, Any]:
        """Compare current performance to baseline."""
        baseline = self.baselines.get_baseline(benchmark_name, metric_name)

        if not baseline:
            return {
                "has_baseline": False,
                "message": f"No baseline found for {benchmark_name}.{metric_name}",
            }

        # Calculate performance difference
        difference = current_value - baseline.baseline_value
        percentage_change = (difference / baseline.baseline_value) * 100 if baseline.baseline_value != 0 else 0

        # Determine if this is within acceptable range
        acceptable_threshold = baseline.confidence_interval * 2  # 2x confidence interval
        is_within_range = abs(difference) <= acceptable_threshold

        # Determine performance status
        if is_within_range:
            status = "stable"
        elif difference > 0:
            status = "regression"  # Assuming higher values are worse (e.g., response time)
        else:
            status = "improvement"

        return {
            "has_baseline": True,
            "baseline_value": baseline.baseline_value,
            "current_value": current_value,
            "difference": difference,
            "percentage_change": percentage_change,
            "status": status,
            "is_within_range": is_within_range,
            "acceptable_threshold": acceptable_threshold,
            "unit": baseline.unit,
            "baseline_timestamp": baseline.timestamp,
            "baseline_sample_size": baseline.sample_size,
        }

    def update_baseline_if_needed(
        self,
        benchmark_name: str,
        metric_name: str,
        new_values: List[float],
        unit: str,
        auto_update_threshold: float = 0.1,
    ) -> bool:
        """Update baseline if performance has consistently changed."""
        baseline = self.baselines.get_baseline(benchmark_name, metric_name)

        if not baseline:
            # No existing baseline, establish new one
            self.establish_baseline(benchmark_name, metric_name, new_values, unit)
            return True

        # Calculate new mean
        new_mean = statistics.mean(new_values)

        # Check if change is significant and consistent
        percentage_change = (
            abs((new_mean - baseline.baseline_value) / baseline.baseline_value) if baseline.baseline_value != 0 else 0
        )

        if percentage_change > auto_update_threshold:
            # Significant change detected, update baseline
            logger.info(
                f"Significant performance change detected for {benchmark_name}.{metric_name}: "
                f"{percentage_change:.1%} change, updating baseline"
            )

            new_baseline = self.establish_baseline(benchmark_name, metric_name, new_values, unit)
            new_baseline.metadata["previous_baseline"] = baseline.baseline_value
            new_baseline.metadata["update_reason"] = f"Auto-update due to {percentage_change:.1%} change"

            self.baselines.update_baseline(benchmark_name, metric_name, new_baseline)
            self.save_baselines()
            return True

        return False

    def get_baseline_summary(self) -> Dict[str, Any]:
        """Get summary of all baselines."""
        baselines_list = self.baselines.list_baselines()

        if not baselines_list:
            return {"total_baselines": 0, "message": "No baselines established"}

        # Group by benchmark
        by_benchmark = {}
        for baseline in baselines_list:
            if baseline.benchmark_name not in by_benchmark:
                by_benchmark[baseline.benchmark_name] = []
            by_benchmark[baseline.benchmark_name].append(baseline)

        summary = {
            "total_baselines": len(baselines_list),
            "total_benchmarks": len(by_benchmark),
            "benchmarks": {},
        }

        for benchmark_name, benchmark_baselines in by_benchmark.items():
            summary["benchmarks"][benchmark_name] = {
                "total_metrics": len(benchmark_baselines),
                "metrics": {
                    baseline.metric_name: {
                        "baseline_value": baseline.baseline_value,
                        "unit": baseline.unit,
                        "sample_size": baseline.sample_size,
                        "timestamp": baseline.timestamp,
                    }
                    for baseline in benchmark_baselines
                },
            }

        return summary

    def export_baselines(self, export_path: Path):
        """Export baselines to a different file."""
        with open(export_path, "w") as f:
            json.dump(self.baselines.to_dict(), f, indent=2)
        logger.info(f"Exported baselines to {export_path}")

    def import_baselines(self, import_path: Path, merge: bool = True):
        """Import baselines from a file."""
        with open(import_path) as f:
            data = json.load(f)

        imported_baselines = PerformanceBaselines.from_dict(data)

        if merge:
            # Merge with existing baselines
            for baseline in imported_baselines.list_baselines():
                self.baselines.add_baseline(baseline)
        else:
            # Replace existing baselines
            self.baselines = imported_baselines

        self.save_baselines()
        logger.info(f"Imported {len(imported_baselines.baselines)} baselines from {import_path}")
