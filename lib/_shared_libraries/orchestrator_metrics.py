"""
Simple Metrics Collection for Enhanced Orchestrator
Following ADK synchronous patterns - no async/await
"""

import time
from typing import Dict, List, Optional
from datetime import datetime
import json
from pathlib import Path


class OrchestratorMetrics:
    """
    Simple metrics collection for orchestrator performance.
    Tracks routing decisions, response times, and specialist usage.
    """
    
    def __init__(self, persist_path: Optional[str] = None):
        """
        Initialize metrics collector.
        
        Args:
            persist_path: Optional path to persist metrics
        """
        self.metrics = {
            "total_requests": 0,
            "specialist_calls": {},
            "task_types": {},
            "response_times": [],
            "security_escalations": 0,
            "cache_stats": {
                "hits": 0,
                "misses": 0
            },
            "errors": [],
            "start_time": datetime.now().isoformat()
        }
        self.persist_path = persist_path
    
    def record_request(self, task_type: str, specialist: str, response_time: float) -> None:
        """
        Record a single request metric.
        
        Args:
            task_type: Type of task processed
            specialist: Specialist that handled the request
            response_time: Time taken in seconds
        """
        self.metrics["total_requests"] += 1
        
        # Track specialist usage
        if specialist not in self.metrics["specialist_calls"]:
            self.metrics["specialist_calls"][specialist] = 0
        self.metrics["specialist_calls"][specialist] += 1
        
        # Track task types
        if task_type not in self.metrics["task_types"]:
            self.metrics["task_types"][task_type] = 0
        self.metrics["task_types"][task_type] += 1
        
        # Track response times (keep last 100)
        self.metrics["response_times"].append(response_time)
        if len(self.metrics["response_times"]) > 100:
            self.metrics["response_times"] = self.metrics["response_times"][-100:]
        
        # Check for security escalation
        if specialist == "security_specialist":
            self.metrics["security_escalations"] += 1
        
        # Persist if configured
        if self.persist_path:
            self._persist_metrics()
    
    def record_cache_hit(self) -> None:
        """Record a cache hit"""
        self.metrics["cache_stats"]["hits"] += 1
    
    def record_cache_miss(self) -> None:
        """Record a cache miss"""
        self.metrics["cache_stats"]["misses"] += 1
    
    def record_error(self, error_type: str, details: str) -> None:
        """
        Record an error occurrence.
        
        Args:
            error_type: Type of error
            details: Error details
        """
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": error_type,
            "details": details[:200]  # Limit details length
        }
        self.metrics["errors"].append(error_entry)
        
        # Keep last 50 errors
        if len(self.metrics["errors"]) > 50:
            self.metrics["errors"] = self.metrics["errors"][-50:]
    
    def get_summary(self) -> Dict[str, any]:
        """
        Get a summary of collected metrics.
        
        Returns:
            Dictionary with metric summary
        """
        avg_response_time = (
            sum(self.metrics["response_times"]) / len(self.metrics["response_times"])
            if self.metrics["response_times"] else 0
        )
        
        cache_hit_rate = 0
        total_cache = self.metrics["cache_stats"]["hits"] + self.metrics["cache_stats"]["misses"]
        if total_cache > 0:
            cache_hit_rate = (self.metrics["cache_stats"]["hits"] / total_cache) * 100
        
        return {
            "total_requests": self.metrics["total_requests"],
            "average_response_time": round(avg_response_time, 3),
            "most_used_specialist": max(
                self.metrics["specialist_calls"].items(),
                key=lambda x: x[1]
            )[0] if self.metrics["specialist_calls"] else "none",
            "most_common_task": max(
                self.metrics["task_types"].items(),
                key=lambda x: x[1]
            )[0] if self.metrics["task_types"] else "none",
            "security_escalation_rate": (
                self.metrics["security_escalations"] / self.metrics["total_requests"] * 100
                if self.metrics["total_requests"] > 0 else 0
            ),
            "cache_hit_rate": round(cache_hit_rate, 1),
            "error_count": len(self.metrics["errors"]),
            "uptime_hours": self._calculate_uptime()
        }
    
    def get_specialist_distribution(self) -> Dict[str, float]:
        """
        Get distribution of requests across specialists.
        
        Returns:
            Dictionary with specialist usage percentages
        """
        if self.metrics["total_requests"] == 0:
            return {}
        
        distribution = {}
        for specialist, count in self.metrics["specialist_calls"].items():
            distribution[specialist] = round(
                (count / self.metrics["total_requests"]) * 100, 1
            )
        return distribution
    
    def _calculate_uptime(self) -> float:
        """Calculate uptime in hours"""
        start = datetime.fromisoformat(self.metrics["start_time"])
        uptime = datetime.now() - start
        return round(uptime.total_seconds() / 3600, 2)
    
    def _persist_metrics(self) -> None:
        """Persist metrics to file"""
        if not self.persist_path:
            return
        
        try:
            path = Path(self.persist_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(path, 'w') as f:
                json.dump(self.metrics, f, indent=2)
        except Exception as e:
            # Silently fail - metrics are not critical
            pass
    
    def load_metrics(self) -> bool:
        """
        Load persisted metrics.
        
        Returns:
            True if loaded successfully
        """
        if not self.persist_path or not Path(self.persist_path).exists():
            return False
        
        try:
            with open(self.persist_path, 'r') as f:
                self.metrics = json.load(f)
            return True
        except Exception:
            return False


class MetricsTimer:
    """Simple context manager for timing operations"""
    
    def __init__(self, metrics: OrchestratorMetrics, task_type: str, specialist: str):
        self.metrics = metrics
        self.task_type = task_type
        self.specialist = specialist
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            elapsed = time.time() - self.start_time
            self.metrics.record_request(self.task_type, self.specialist, elapsed)
        
        # Record error if exception occurred
        if exc_type:
            self.metrics.record_error(
                exc_type.__name__,
                str(exc_val) if exc_val else "Unknown error"
            )


# Global metrics instance
_metrics_instance = None


def get_orchestrator_metrics(persist_path: Optional[str] = None) -> OrchestratorMetrics:
    """
    Get the global orchestrator metrics instance.
    
    Args:
        persist_path: Optional path to persist metrics
        
    Returns:
        OrchestratorMetrics instance
    """
    global _metrics_instance
    if _metrics_instance is None:
        _metrics_instance = OrchestratorMetrics(persist_path)
        _metrics_instance.load_metrics()  # Try to load existing metrics
    return _metrics_instance


# Export key components
__all__ = [
    'OrchestratorMetrics',
    'MetricsTimer',
    'get_orchestrator_metrics'
]