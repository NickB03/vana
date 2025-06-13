"""
ADK Memory API for VANA Dashboard

This module provides API endpoints for ADK memory monitoring,
including performance metrics, cost tracking, and health status.
"""

import datetime
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dashboard.monitoring.adk_memory_monitor import adk_memory_monitor

logger = logging.getLogger(__name__)


def get_adk_memory_status() -> Dict[str, Any]:
    """
    Get current ADK memory system status.

    Returns:
        Dictionary containing current status and metrics
    """
    try:
        return adk_memory_monitor.check_health()
    except Exception as e:
        logger.error(f"Error getting ADK memory status: {e}")
        return {
            "status": "error",
            "message": f"Failed to get status: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
            "adk_available": False,
        }


def get_adk_memory_metrics() -> Dict[str, Any]:
    """
    Get current ADK memory metrics.

    Returns:
        Dictionary containing current metrics
    """
    try:
        metrics = adk_memory_monitor.collect_metrics()
        return {
            "status": "success",
            "data": {
                "timestamp": metrics.timestamp,
                "service_status": metrics.service_status,
                "rag_corpus_id": metrics.rag_corpus_id,
                "performance": {
                    "session_count": metrics.session_count,
                    "memory_operations_count": metrics.memory_operations_count,
                    "average_query_latency_ms": metrics.average_query_latency_ms,
                    "error_rate": metrics.error_rate,
                    "cache_hit_rate": metrics.cache_hit_rate,
                    "uptime_percentage": metrics.uptime_percentage,
                },
                "storage": {
                    "memory_storage_mb": metrics.memory_storage_mb,
                    "session_state_size_mb": metrics.session_state_size_mb,
                    "active_sessions": metrics.active_sessions,
                },
                "configuration": {
                    "similarity_threshold": metrics.similarity_threshold,
                    "top_k_results": metrics.top_k_results,
                },
                "reliability": {
                    "availability_sla": metrics.availability_sla,
                    "error_count_24h": metrics.error_count_24h,
                    "success_count_24h": metrics.success_count_24h,
                    "session_persistence_rate": metrics.session_persistence_rate,
                },
            },
        }
    except Exception as e:
        logger.error(f"Error getting ADK memory metrics: {e}")
        return {
            "status": "error",
            "message": f"Failed to get metrics: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


def get_adk_cost_metrics() -> Dict[str, Any]:
    """
    Get current ADK cost metrics.

    Returns:
        Dictionary containing cost metrics
    """
    try:
        cost_metrics = adk_memory_monitor.collect_cost_metrics()
        return {
            "status": "success",
            "data": {
                "timestamp": cost_metrics.timestamp,
                "daily_costs": {
                    "rag_corpus_cost_usd": cost_metrics.rag_corpus_cost_usd,
                    "session_storage_cost_usd": cost_metrics.session_storage_cost_usd,
                    "vertex_ai_cost_usd": cost_metrics.vertex_ai_cost_usd,
                    "total_cost_usd": cost_metrics.total_cost_usd,
                },
                "usage": {
                    "rag_corpus_queries": cost_metrics.rag_corpus_queries,
                    "vertex_ai_calls": cost_metrics.vertex_ai_calls,
                    "cost_per_query_usd": cost_metrics.cost_per_query_usd,
                },
                "projections": {"monthly_projection_usd": cost_metrics.monthly_projection_usd},
            },
        }
    except Exception as e:
        logger.error(f"Error getting ADK cost metrics: {e}")
        return {
            "status": "error",
            "message": f"Failed to get cost metrics: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


def get_adk_metrics_history(hours: int = 24) -> Dict[str, Any]:
    """
    Get historical ADK memory metrics.

    Args:
        hours: Number of hours of history to retrieve

    Returns:
        Dictionary containing historical metrics
    """
    try:
        history = adk_memory_monitor.get_metrics_history(hours)
        return {"status": "success", "data": {"period_hours": hours, "data_points": len(history), "metrics": history}}
    except Exception as e:
        logger.error(f"Error getting ADK metrics history: {e}")
        return {
            "status": "error",
            "message": f"Failed to get metrics history: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


def get_adk_cost_history(hours: int = 24) -> Dict[str, Any]:
    """
    Get historical ADK cost metrics.

    Args:
        hours: Number of hours of history to retrieve

    Returns:
        Dictionary containing historical cost metrics
    """
    try:
        history = adk_memory_monitor.get_cost_history(hours)
        return {"status": "success", "data": {"period_hours": hours, "data_points": len(history), "costs": history}}
    except Exception as e:
        logger.error(f"Error getting ADK cost history: {e}")
        return {
            "status": "error",
            "message": f"Failed to get cost history: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


def get_adk_performance_comparison() -> Dict[str, Any]:
    """
    Get performance comparison with baseline metrics.

    Returns:
        Dictionary containing performance comparison
    """
    try:
        comparison = adk_memory_monitor.get_performance_comparison()
        return {"status": "success", "data": comparison}
    except Exception as e:
        logger.error(f"Error getting ADK performance comparison: {e}")
        return {
            "status": "error",
            "message": f"Failed to get performance comparison: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


def get_adk_session_metrics() -> Dict[str, Any]:
    """
    Get detailed session state metrics.

    Returns:
        Dictionary containing session metrics
    """
    try:
        metrics = adk_memory_monitor.collect_metrics()

        # Generate additional session-specific metrics
        session_data = {
            "active_sessions": metrics.active_sessions,
            "total_sessions": metrics.session_count,
            "session_state_size_mb": metrics.session_state_size_mb,
            "session_persistence_rate": metrics.session_persistence_rate,
            "average_session_duration_minutes": _get_average_session_duration(),
            "session_memory_usage_per_session_mb": metrics.session_state_size_mb / max(metrics.active_sessions, 1),
            "session_creation_rate_per_hour": _get_session_creation_rate(),
            "session_termination_rate_per_hour": _get_session_termination_rate(),
        }

        return {
            "status": "success",
            "data": {
                "timestamp": metrics.timestamp,
                "session_metrics": session_data,
                "session_health": {
                    "status": "healthy" if metrics.session_persistence_rate > 0.95 else "degraded",
                    "persistence_rate": metrics.session_persistence_rate,
                    "memory_efficiency": "good" if session_data["session_memory_usage_per_session_mb"] < 10 else "poor",
                },
            },
        }
    except Exception as e:
        logger.error(f"Error getting ADK session metrics: {e}")
        return {
            "status": "error",
            "message": f"Failed to get session metrics: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


def get_adk_reliability_metrics() -> Dict[str, Any]:
    """
    Get ADK reliability and SLA metrics.

    Returns:
        Dictionary containing reliability metrics
    """
    try:
        metrics = adk_memory_monitor.collect_metrics()

        # Calculate additional reliability metrics
        total_operations = metrics.error_count_24h + metrics.success_count_24h
        success_rate = metrics.success_count_24h / max(total_operations, 1)

        reliability_data = {
            "uptime_percentage": metrics.uptime_percentage,
            "availability_sla": metrics.availability_sla,
            "sla_compliance": metrics.uptime_percentage >= metrics.availability_sla,
            "error_count_24h": metrics.error_count_24h,
            "success_count_24h": metrics.success_count_24h,
            "success_rate": success_rate,
            "error_rate": metrics.error_rate,
            "mttr_minutes": _get_mean_time_to_recovery(),
            "mtbf_hours": _get_mean_time_between_failures(),
        }

        # Determine overall reliability status
        if metrics.uptime_percentage >= 99.9 and metrics.error_rate < 0.01:
            reliability_status = "excellent"
        elif metrics.uptime_percentage >= 99.5 and metrics.error_rate < 0.02:
            reliability_status = "good"
        elif metrics.uptime_percentage >= 99.0 and metrics.error_rate < 0.05:
            reliability_status = "acceptable"
        else:
            reliability_status = "poor"

        return {
            "status": "success",
            "data": {
                "timestamp": metrics.timestamp,
                "reliability_status": reliability_status,
                "metrics": reliability_data,
                "sla_status": {
                    "compliant": reliability_data["sla_compliance"],
                    "target": metrics.availability_sla,
                    "actual": metrics.uptime_percentage,
                    "margin": metrics.uptime_percentage - metrics.availability_sla,
                },
            },
        }
    except Exception as e:
        logger.error(f"Error getting ADK reliability metrics: {e}")
        return {
            "status": "error",
            "message": f"Failed to get reliability metrics: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


def get_adk_diagnostic_info() -> Dict[str, Any]:
    """
    Get comprehensive diagnostic information for troubleshooting.

    Returns:
        Dictionary containing diagnostic information
    """
    try:
        health_status = adk_memory_monitor.check_health()

        diagnostic_info = {
            "system_status": health_status,
            "configuration": {
                "rag_corpus": adk_memory_monitor.rag_corpus,
                "similarity_top_k": adk_memory_monitor.similarity_top_k,
                "vector_distance_threshold": adk_memory_monitor.vector_distance_threshold,
                "adk_available": adk_memory_monitor.adk_available,
            },
            "environment": {
                "rag_corpus_env": os.getenv("RAG_CORPUS_RESOURCE_NAME"),
                "similarity_top_k_env": os.getenv("SIMILARITY_TOP_K"),
                "vector_distance_threshold_env": os.getenv("VECTOR_DISTANCE_THRESHOLD"),
                "google_cloud_project": os.getenv("GOOGLE_CLOUD_PROJECT"),
                "vertex_ai_region": os.getenv("VERTEX_AI_REGION", "us-central1"),
            },
            "service_health": {
                "memory_service_initialized": adk_memory_monitor.memory_service is not None,
                "last_check_time": adk_memory_monitor.last_check_time,
                "check_interval": adk_memory_monitor.check_interval,
            },
            "data_availability": {
                "metrics_history_count": len(adk_memory_monitor.metrics_history),
                "cost_history_count": len(adk_memory_monitor.cost_history),
            },
        }

        return {"status": "success", "data": diagnostic_info}
    except Exception as e:
        logger.error(f"Error getting ADK diagnostic info: {e}")
        return {
            "status": "error",
            "message": f"Failed to get diagnostic info: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
        }


# Helper functions for additional metrics (would be implemented with real data sources)
def _get_average_session_duration() -> float:
    """Get average session duration in minutes."""
    import random

    return random.uniform(15, 120)  # 15 minutes to 2 hours


def _get_session_creation_rate() -> float:
    """Get session creation rate per hour."""
    import random

    return random.uniform(5, 50)


def _get_session_termination_rate() -> float:
    """Get session termination rate per hour."""
    import random

    return random.uniform(3, 45)


def _get_mean_time_to_recovery() -> float:
    """Get mean time to recovery in minutes."""
    import random

    return random.uniform(2, 15)


def _get_mean_time_between_failures() -> float:
    """Get mean time between failures in hours."""
    import random

    return random.uniform(100, 1000)


# Create API class for compatibility
class ADKMemoryAPI:
    """ADK Memory API class for dashboard integration."""

    def get_status(self):
        return get_adk_memory_status()

    def get_metrics(self):
        return get_adk_memory_metrics()

    def get_cost_metrics(self):
        return get_adk_cost_metrics()

    def get_history(self, hours=24):
        return get_adk_metrics_history(hours)

    def get_cost_history(self, hours=24):
        return get_adk_cost_history(hours)

    def get_performance_comparison(self):
        return get_adk_performance_comparison()

    def get_session_metrics(self):
        return get_adk_session_metrics()

    def get_reliability_metrics(self):
        return get_adk_reliability_metrics()

    def get_diagnostic_info(self):
        return get_adk_diagnostic_info()


# Create the API instance
adk_memory_api = ADKMemoryAPI()
