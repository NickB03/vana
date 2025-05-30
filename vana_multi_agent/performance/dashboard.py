"""
Real-time Performance Dashboard for VANA Multi-Agent System
Phase 4B: Performance Optimization - Step 4

Provides real-time monitoring and visualization of:
- System performance metrics
- Cache effectiveness
- Agent utilization
- Bottleneck identification
- Performance trends
"""

import time
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from collections import deque, defaultdict
import threading

# Import performance components
from .profiler import performance_profiler
from ..core.intelligent_cache import get_cache_statistics


@dataclass
class PerformanceSnapshot:
    """Snapshot of system performance at a point in time."""
    timestamp: float
    total_operations: int
    success_rate: float
    avg_execution_time: float
    cache_hit_rate: float
    active_agents: int
    bottlenecks: List[str]
    memory_usage: str


class RealTimeMetrics:
    """Real-time metrics collector and aggregator."""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self._metrics_history: deque = deque(maxlen=max_history)
        self._agent_metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self._operation_counts: Dict[str, int] = defaultdict(int)
        self._lock = threading.RLock()
        
        # Performance thresholds
        self.thresholds = {
            "execution_time_warning": 0.1,    # 100ms
            "execution_time_critical": 0.5,   # 500ms
            "cache_hit_rate_warning": 50.0,   # 50%
            "success_rate_warning": 95.0      # 95%
        }
    
    def record_operation(self, operation_type: str, execution_time: float, success: bool, agent: str = None):
        """Record a single operation for metrics."""
        with self._lock:
            timestamp = time.time()
            
            # Update operation counts
            self._operation_counts[operation_type] += 1
            
            # Record agent-specific metrics
            if agent:
                self._agent_metrics[agent].append({
                    "timestamp": timestamp,
                    "operation": operation_type,
                    "execution_time": execution_time,
                    "success": success
                })
    
    def get_current_snapshot(self) -> PerformanceSnapshot:
        """Get current performance snapshot."""
        with self._lock:
            # Get profiler summary
            profiler_summary = performance_profiler.get_performance_summary()
            
            # Get cache statistics
            cache_stats = get_cache_statistics()
            
            # Calculate cache hit rate
            tool_cache_stats = cache_stats.get("tool_cache", {})
            decision_cache_stats = cache_stats.get("decision_cache", {})
            
            total_hits = tool_cache_stats.get("hits", 0) + decision_cache_stats.get("hits", 0)
            total_requests = (
                total_hits + 
                tool_cache_stats.get("misses", 0) + 
                decision_cache_stats.get("misses", 0)
            )
            cache_hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
            
            # Get bottlenecks
            bottlenecks = performance_profiler.get_bottlenecks(top_n=3)
            bottleneck_names = [b["component"] for b in bottlenecks]
            
            # Count active agents
            active_agents = len([agent for agent, metrics in self._agent_metrics.items() 
                               if metrics and time.time() - metrics[-1]["timestamp"] < 300])  # 5 minutes
            
            snapshot = PerformanceSnapshot(
                timestamp=time.time(),
                total_operations=profiler_summary.get("total_executions", 0),
                success_rate=profiler_summary.get("overall_success_rate", 0.0),
                avg_execution_time=profiler_summary.get("average_execution_time", 0.0),
                cache_hit_rate=cache_hit_rate,
                active_agents=active_agents,
                bottlenecks=bottleneck_names,
                memory_usage=cache_stats.get("total_memory_usage", "0 MB")
            )
            
            # Store in history
            self._metrics_history.append(snapshot)
            
            return snapshot
    
    def get_performance_trend(self, duration_minutes: int = 60) -> Dict[str, Any]:
        """Get performance trend over specified duration."""
        with self._lock:
            cutoff_time = time.time() - (duration_minutes * 60)
            recent_snapshots = [
                snapshot for snapshot in self._metrics_history
                if snapshot.timestamp >= cutoff_time
            ]
            
            if not recent_snapshots:
                return {"error": "No data available for specified duration"}
            
            # Calculate trends
            execution_times = [s.avg_execution_time for s in recent_snapshots]
            success_rates = [s.success_rate for s in recent_snapshots]
            cache_hit_rates = [s.cache_hit_rate for s in recent_snapshots]
            
            return {
                "duration_minutes": duration_minutes,
                "data_points": len(recent_snapshots),
                "execution_time": {
                    "current": execution_times[-1] if execution_times else 0,
                    "average": sum(execution_times) / len(execution_times) if execution_times else 0,
                    "min": min(execution_times) if execution_times else 0,
                    "max": max(execution_times) if execution_times else 0,
                    "trend": self._calculate_trend(execution_times)
                },
                "success_rate": {
                    "current": success_rates[-1] if success_rates else 0,
                    "average": sum(success_rates) / len(success_rates) if success_rates else 0,
                    "trend": self._calculate_trend(success_rates)
                },
                "cache_hit_rate": {
                    "current": cache_hit_rates[-1] if cache_hit_rates else 0,
                    "average": sum(cache_hit_rates) / len(cache_hit_rates) if cache_hit_rates else 0,
                    "trend": self._calculate_trend(cache_hit_rates)
                }
            }
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from values."""
        if len(values) < 2:
            return "stable"
        
        # Simple trend calculation
        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        
        if not first_half or not second_half:
            return "stable"
        
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        
        change_percent = ((second_avg - first_avg) / first_avg * 100) if first_avg > 0 else 0
        
        if change_percent > 5:
            return "improving"
        elif change_percent < -5:
            return "declining"
        else:
            return "stable"
    
    def get_agent_performance(self) -> Dict[str, Any]:
        """Get performance metrics for each agent."""
        with self._lock:
            agent_performance = {}
            
            for agent, metrics in self._agent_metrics.items():
                if not metrics:
                    continue
                
                recent_metrics = [m for m in metrics if time.time() - m["timestamp"] < 3600]  # Last hour
                
                if not recent_metrics:
                    continue
                
                execution_times = [m["execution_time"] for m in recent_metrics]
                success_count = sum(1 for m in recent_metrics if m["success"])
                
                agent_performance[agent] = {
                    "total_operations": len(recent_metrics),
                    "success_rate": (success_count / len(recent_metrics) * 100) if recent_metrics else 0,
                    "avg_execution_time": sum(execution_times) / len(execution_times) if execution_times else 0,
                    "last_activity": max(m["timestamp"] for m in recent_metrics) if recent_metrics else 0
                }
            
            return agent_performance
    
    def get_alerts(self) -> List[Dict[str, Any]]:
        """Get current performance alerts."""
        alerts = []
        current_snapshot = self.get_current_snapshot()
        
        # Check execution time
        if current_snapshot.avg_execution_time > self.thresholds["execution_time_critical"]:
            alerts.append({
                "type": "critical",
                "category": "performance",
                "message": f"Average execution time is {current_snapshot.avg_execution_time:.3f}s (critical threshold: {self.thresholds['execution_time_critical']}s)",
                "timestamp": current_snapshot.timestamp
            })
        elif current_snapshot.avg_execution_time > self.thresholds["execution_time_warning"]:
            alerts.append({
                "type": "warning",
                "category": "performance",
                "message": f"Average execution time is {current_snapshot.avg_execution_time:.3f}s (warning threshold: {self.thresholds['execution_time_warning']}s)",
                "timestamp": current_snapshot.timestamp
            })
        
        # Check cache hit rate
        if current_snapshot.cache_hit_rate < self.thresholds["cache_hit_rate_warning"]:
            alerts.append({
                "type": "warning",
                "category": "cache",
                "message": f"Cache hit rate is {current_snapshot.cache_hit_rate:.1f}% (threshold: {self.thresholds['cache_hit_rate_warning']}%)",
                "timestamp": current_snapshot.timestamp
            })
        
        # Check success rate
        if current_snapshot.success_rate < self.thresholds["success_rate_warning"]:
            alerts.append({
                "type": "warning",
                "category": "reliability",
                "message": f"Success rate is {current_snapshot.success_rate:.1f}% (threshold: {self.thresholds['success_rate_warning']}%)",
                "timestamp": current_snapshot.timestamp
            })
        
        # Check for bottlenecks
        if current_snapshot.bottlenecks:
            alerts.append({
                "type": "info",
                "category": "bottlenecks",
                "message": f"Active bottlenecks detected: {', '.join(current_snapshot.bottlenecks)}",
                "timestamp": current_snapshot.timestamp
            })
        
        return alerts


class PerformanceDashboard:
    """Main dashboard interface for real-time performance monitoring."""
    
    def __init__(self):
        self.metrics = RealTimeMetrics()
        self._monitoring_active = False
        self._monitor_thread = None
    
    def start_monitoring(self, interval_seconds: int = 30):
        """Start continuous performance monitoring."""
        if self._monitoring_active:
            return
        
        self._monitoring_active = True
        self._monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval_seconds,),
            daemon=True
        )
        self._monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop continuous performance monitoring."""
        self._monitoring_active = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)
    
    def _monitoring_loop(self, interval_seconds: int):
        """Continuous monitoring loop."""
        while self._monitoring_active:
            try:
                # Take performance snapshot
                snapshot = self.metrics.get_current_snapshot()
                
                # Check for alerts
                alerts = self.metrics.get_alerts()
                if alerts:
                    self._handle_alerts(alerts)
                
                time.sleep(interval_seconds)
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(interval_seconds)
    
    def _handle_alerts(self, alerts: List[Dict[str, Any]]):
        """Handle performance alerts."""
        for alert in alerts:
            if alert["type"] == "critical":
                print(f"🚨 CRITICAL ALERT: {alert['message']}")
            elif alert["type"] == "warning":
                print(f"⚠️ WARNING: {alert['message']}")
            else:
                print(f"ℹ️ INFO: {alert['message']}")
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive dashboard data."""
        current_snapshot = self.metrics.get_current_snapshot()
        performance_trend = self.metrics.get_performance_trend(60)  # Last hour
        agent_performance = self.metrics.get_agent_performance()
        alerts = self.metrics.get_alerts()
        
        return {
            "current_snapshot": asdict(current_snapshot),
            "performance_trend": performance_trend,
            "agent_performance": agent_performance,
            "alerts": alerts,
            "cache_statistics": get_cache_statistics(),
            "system_health": self._assess_system_health(current_snapshot, alerts)
        }
    
    def _assess_system_health(self, snapshot: PerformanceSnapshot, alerts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess overall system health."""
        critical_alerts = [a for a in alerts if a["type"] == "critical"]
        warning_alerts = [a for a in alerts if a["type"] == "warning"]
        
        if critical_alerts:
            health_status = "critical"
            health_score = 25
        elif warning_alerts:
            health_status = "warning"
            health_score = 70
        elif snapshot.success_rate > 95 and snapshot.cache_hit_rate > 70:
            health_status = "excellent"
            health_score = 95
        elif snapshot.success_rate > 90 and snapshot.cache_hit_rate > 50:
            health_status = "good"
            health_score = 85
        else:
            health_status = "fair"
            health_score = 75
        
        return {
            "status": health_status,
            "score": health_score,
            "critical_issues": len(critical_alerts),
            "warnings": len(warning_alerts),
            "recommendations": self._get_health_recommendations(snapshot, alerts)
        }
    
    def _get_health_recommendations(self, snapshot: PerformanceSnapshot, alerts: List[Dict[str, Any]]) -> List[str]:
        """Get health improvement recommendations."""
        recommendations = []
        
        if snapshot.cache_hit_rate < 50:
            recommendations.append("Consider implementing cache warming strategies")
        
        if snapshot.avg_execution_time > 0.1:
            recommendations.append("Investigate performance bottlenecks in slow operations")
        
        if snapshot.success_rate < 95:
            recommendations.append("Review error handling and retry mechanisms")
        
        if len(snapshot.bottlenecks) > 2:
            recommendations.append("Address identified bottlenecks to improve overall performance")
        
        return recommendations


# Global dashboard instance
performance_dashboard = PerformanceDashboard()
