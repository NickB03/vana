"""
Performance Tracker for Routing Engine

This module tracks routing performance metrics, agent performance,
and provides analytics for routing optimization.
"""

import logging
import time
from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Individual performance metric."""

    timestamp: str
    agent_name: str
    routing_strategy: str
    success: bool
    execution_time: float
    agent_count: int
    error_type: Optional[str] = None


@dataclass
class AgentPerformanceStats:
    """Performance statistics for an agent."""

    agent_name: str
    total_tasks: int
    successful_tasks: int
    failed_tasks: int
    success_rate: float
    average_execution_time: float
    fastest_execution: float
    slowest_execution: float
    total_execution_time: float
    last_used: str
    performance_trend: str  # "improving", "stable", "declining"


@dataclass
class RoutingPerformanceStats:
    """Performance statistics for routing strategies."""

    strategy: str
    usage_count: int
    success_rate: float
    average_execution_time: float
    average_agent_count: float
    efficiency_score: float


class PerformanceTracker:
    """Tracks and analyzes routing performance metrics."""

    def __init__(self, max_history: int = 10000):
        """Initialize the performance tracker.

        Args:
            max_history: Maximum number of metrics to keep in history
        """
        self.max_history = max_history
        self.metrics_history: deque = deque(maxlen=max_history)
        self.agent_stats: Dict[str, AgentPerformanceStats] = {}
        self.routing_stats: Dict[str, RoutingPerformanceStats] = {}
        self.performance_cache: Dict[str, Any] = {}
        self.last_analysis_time = time.time()

    async def record_routing_performance(
        self,
        agent_name: str,
        routing_strategy: str,
        success: bool,
        execution_time: float,
        agent_count: int,
        error_type: Optional[str] = None,
    ):
        """Record a routing performance metric.

        Args:
            agent_name: Primary agent used
            routing_strategy: Routing strategy employed
            success: Whether the routing was successful
            execution_time: Time taken for execution
            agent_count: Number of agents involved
            error_type: Type of error if failed
        """
        metric = PerformanceMetric(
            timestamp=datetime.now().isoformat(),
            agent_name=agent_name,
            routing_strategy=routing_strategy,
            success=success,
            execution_time=execution_time,
            agent_count=agent_count,
            error_type=error_type,
        )

        self.metrics_history.append(metric)

        # Update agent statistics
        await self._update_agent_stats(metric)

        # Update routing strategy statistics
        await self._update_routing_stats(metric)

        # Invalidate cache
        self.performance_cache.clear()

        logger.debug(f"📊 Recorded performance: {agent_name} ({routing_strategy}) - {success} in {execution_time:.2f}s")

    async def _update_agent_stats(self, metric: PerformanceMetric):
        """Update agent performance statistics."""
        agent_name = metric.agent_name

        if agent_name not in self.agent_stats:
            self.agent_stats[agent_name] = AgentPerformanceStats(
                agent_name=agent_name,
                total_tasks=0,
                successful_tasks=0,
                failed_tasks=0,
                success_rate=0.0,
                average_execution_time=0.0,
                fastest_execution=float("inf"),
                slowest_execution=0.0,
                total_execution_time=0.0,
                last_used="",
                performance_trend="stable",
            )

        stats = self.agent_stats[agent_name]

        # Update counters
        stats.total_tasks += 1
        if metric.success:
            stats.successful_tasks += 1
        else:
            stats.failed_tasks += 1

        # Update execution time statistics
        stats.total_execution_time += metric.execution_time
        stats.average_execution_time = stats.total_execution_time / stats.total_tasks
        stats.fastest_execution = min(stats.fastest_execution, metric.execution_time)
        stats.slowest_execution = max(stats.slowest_execution, metric.execution_time)

        # Update success rate
        stats.success_rate = stats.successful_tasks / stats.total_tasks

        # Update last used
        stats.last_used = metric.timestamp

        # Update performance trend
        stats.performance_trend = self._calculate_performance_trend(agent_name)

    async def _update_routing_stats(self, metric: PerformanceMetric):
        """Update routing strategy statistics."""
        strategy = metric.routing_strategy

        if strategy not in self.routing_stats:
            self.routing_stats[strategy] = RoutingPerformanceStats(
                strategy=strategy,
                usage_count=0,
                success_rate=0.0,
                average_execution_time=0.0,
                average_agent_count=0.0,
                efficiency_score=0.0,
            )

        stats = self.routing_stats[strategy]

        # Get all metrics for this strategy
        strategy_metrics = [m for m in self.metrics_history if m.routing_strategy == strategy]

        # Update statistics
        stats.usage_count = len(strategy_metrics)
        successful_metrics = [m for m in strategy_metrics if m.success]
        stats.success_rate = len(successful_metrics) / len(strategy_metrics) if strategy_metrics else 0.0

        if strategy_metrics:
            stats.average_execution_time = sum(m.execution_time for m in strategy_metrics) / len(strategy_metrics)
            stats.average_agent_count = sum(m.agent_count for m in strategy_metrics) / len(strategy_metrics)

            # Calculate efficiency score (success rate / average execution time)
            stats.efficiency_score = stats.success_rate / max(stats.average_execution_time, 0.1)

    def _calculate_performance_trend(self, agent_name: str) -> str:
        """Calculate performance trend for an agent."""
        # Get recent metrics for this agent
        recent_metrics = [m for m in list(self.metrics_history)[-50:] if m.agent_name == agent_name]

        if len(recent_metrics) < 10:
            return "stable"

        # Split into two halves and compare success rates
        mid_point = len(recent_metrics) // 2
        first_half = recent_metrics[:mid_point]
        second_half = recent_metrics[mid_point:]

        first_success_rate = sum(1 for m in first_half if m.success) / len(first_half)
        second_success_rate = sum(1 for m in second_half if m.success) / len(second_half)

        if second_success_rate > first_success_rate + 0.1:
            return "improving"
        elif second_success_rate < first_success_rate - 0.1:
            return "declining"
        else:
            return "stable"

    def get_agent_performance(self, agent_name: str) -> Optional[AgentPerformanceStats]:
        """Get performance statistics for a specific agent."""
        return self.agent_stats.get(agent_name)

    def get_all_agent_performance(self) -> Dict[str, AgentPerformanceStats]:
        """Get performance statistics for all agents."""
        return self.agent_stats.copy()

    def get_routing_performance(self, strategy: str) -> Optional[RoutingPerformanceStats]:
        """Get performance statistics for a specific routing strategy."""
        return self.routing_stats.get(strategy)

    def get_all_routing_performance(self) -> Dict[str, RoutingPerformanceStats]:
        """Get performance statistics for all routing strategies."""
        return self.routing_stats.copy()

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        cache_key = "performance_summary"

        # Check cache
        if cache_key in self.performance_cache:
            cache_time = self.performance_cache[cache_key].get("timestamp", 0)
            if time.time() - cache_time < 60:  # Cache for 1 minute
                return self.performance_cache[cache_key]["data"]

        total_metrics = len(self.metrics_history)
        if total_metrics == 0:
            return {"message": "No performance data available"}

        successful_metrics = [m for m in self.metrics_history if m.success]

        # Overall statistics
        overall_success_rate = len(successful_metrics) / total_metrics
        overall_avg_time = sum(m.execution_time for m in self.metrics_history) / total_metrics

        # Top performing agents
        top_agents = sorted(
            self.agent_stats.values(), key=lambda x: (x.success_rate, -x.average_execution_time), reverse=True
        )[:5]

        # Best routing strategies
        best_strategies = sorted(self.routing_stats.values(), key=lambda x: x.efficiency_score, reverse=True)[:5]

        # Recent performance (last 24 hours)
        recent_cutoff = datetime.now() - timedelta(hours=24)
        recent_metrics = [m for m in self.metrics_history if datetime.fromisoformat(m.timestamp) > recent_cutoff]

        recent_success_rate = 0.0
        if recent_metrics:
            recent_successful = [m for m in recent_metrics if m.success]
            recent_success_rate = len(recent_successful) / len(recent_metrics)

        summary = {
            "overall_statistics": {
                "total_routes": total_metrics,
                "success_rate": overall_success_rate,
                "average_execution_time": overall_avg_time,
                "recent_success_rate": recent_success_rate,
                "recent_routes_count": len(recent_metrics),
            },
            "top_performing_agents": [
                {
                    "name": agent.agent_name,
                    "success_rate": agent.success_rate,
                    "average_time": agent.average_execution_time,
                    "total_tasks": agent.total_tasks,
                    "trend": agent.performance_trend,
                }
                for agent in top_agents
            ],
            "best_routing_strategies": [
                {
                    "strategy": strategy.strategy,
                    "efficiency_score": strategy.efficiency_score,
                    "success_rate": strategy.success_rate,
                    "usage_count": strategy.usage_count,
                }
                for strategy in best_strategies
            ],
            "performance_trends": self._analyze_performance_trends(),
        }

        # Cache the result
        self.performance_cache[cache_key] = {"data": summary, "timestamp": time.time()}

        return summary

    def _analyze_performance_trends(self) -> Dict[str, Any]:
        """Analyze performance trends over time."""
        if len(self.metrics_history) < 20:
            return {"message": "Insufficient data for trend analysis"}

        # Analyze trends over different time periods
        now = datetime.now()
        periods = {
            "last_hour": now - timedelta(hours=1),
            "last_6_hours": now - timedelta(hours=6),
            "last_24_hours": now - timedelta(hours=24),
        }

        trends = {}
        for period_name, cutoff_time in periods.items():
            period_metrics = [m for m in self.metrics_history if datetime.fromisoformat(m.timestamp) > cutoff_time]

            if period_metrics:
                success_rate = sum(1 for m in period_metrics if m.success) / len(period_metrics)
                avg_time = sum(m.execution_time for m in period_metrics) / len(period_metrics)

                trends[period_name] = {
                    "success_rate": success_rate,
                    "average_execution_time": avg_time,
                    "total_routes": len(period_metrics),
                }

        return trends

    def get_agent_recommendations(self) -> List[Dict[str, Any]]:
        """Get recommendations for agent performance optimization."""
        recommendations = []

        for agent_name, stats in self.agent_stats.items():
            if stats.total_tasks < 5:
                continue  # Skip agents with insufficient data

            # Low success rate
            if stats.success_rate < 0.7:
                recommendations.append(
                    {
                        "type": "low_success_rate",
                        "agent": agent_name,
                        "message": f"{agent_name} has low success rate ({stats.success_rate:.1%})",
                        "suggestion": "Investigate common failure patterns and improve error handling",
                    }
                )

            # Slow performance
            if stats.average_execution_time > 30.0:
                recommendations.append(
                    {
                        "type": "slow_performance",
                        "agent": agent_name,
                        "message": f"{agent_name} has slow average execution time ({stats.average_execution_time:.1f}s)",
                        "suggestion": "Optimize agent processing or consider load balancing",
                    }
                )

            # Declining performance
            if stats.performance_trend == "declining":
                recommendations.append(
                    {
                        "type": "declining_performance",
                        "agent": agent_name,
                        "message": f"{agent_name} shows declining performance trend",
                        "suggestion": "Monitor agent health and consider maintenance",
                    }
                )

        return recommendations

    def export_metrics(self, format: str = "json") -> Any:
        """Export performance metrics in specified format."""
        if format == "json":
            return {
                "metrics": [asdict(metric) for metric in self.metrics_history],
                "agent_stats": {name: asdict(stats) for name, stats in self.agent_stats.items()},
                "routing_stats": {name: asdict(stats) for name, stats in self.routing_stats.items()},
                "export_timestamp": datetime.now().isoformat(),
            }
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def clear_old_metrics(self, days: int = 30):
        """Clear metrics older than specified days."""
        cutoff_time = datetime.now() - timedelta(days=days)

        # Filter metrics
        filtered_metrics = [m for m in self.metrics_history if datetime.fromisoformat(m.timestamp) > cutoff_time]

        # Update history
        self.metrics_history.clear()
        self.metrics_history.extend(filtered_metrics)

        # Clear cache
        self.performance_cache.clear()

        logger.info(f"🧹 Cleared metrics older than {days} days. Kept {len(filtered_metrics)} metrics.")


# Global performance tracker instance
_performance_tracker = None


def get_performance_tracker() -> PerformanceTracker:
    """Get the global performance tracker instance."""
    global _performance_tracker
    if _performance_tracker is None:
        _performance_tracker = PerformanceTracker()
    return _performance_tracker
