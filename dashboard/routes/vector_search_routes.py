#!/usr/bin/env python3
"""
Vector Search Dashboard Routes

This module provides routes for the Vector Search health dashboard.
"""

import json
import logging
import os
import sys
from datetime import datetime

from flask import Blueprint, jsonify, render_template, request

# Import authentication decorator
from dashboard.auth.dashboard_auth import requires_auth
from dashboard.monitoring.vector_search_monitor import VectorSearchMonitor

# Add the project root to the Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Import the Vector Search Monitor

# Create blueprint
vector_search_bp = Blueprint("vector_search", __name__, url_prefix="/vector-search")

# Create monitor instance
monitor = VectorSearchMonitor()


@vector_search_bp.route("/health")
@requires_auth(["admin", "viewer"])
def health_dashboard():
    """
    Render the Vector Search health dashboard

    Returns:
        Rendered dashboard template
    """
    # Get days parameter (default: 7)
    days = request.args.get("days", default=7, type=int)

    # Run health check
    result = monitor.run_health_check()

    # Get dashboard metrics
    metrics = monitor.get_dashboard_metrics()

    # Get historical data
    historical_data = monitor.get_historical_data(days=days)

    # Get recommendations
    from tools.vector_search.health_checker import VectorSearchHealthChecker

    checker = VectorSearchHealthChecker()
    recommendations = checker.get_recommendations(result)

    # Prepare template data
    template_data = {
        "status": metrics.get("status", "unknown"),
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "response_time": round(metrics.get("response_time", 0), 3),
        "success_rate": round(metrics.get("success_rate", 0), 2),
        "health_percentage": round(historical_data.get("health_percentage", 0), 2),
        "component_status": {},
        "component_details": {},
        "timestamps": json.dumps(historical_data.get("timestamps", [])),
        "response_times": json.dumps(historical_data.get("response_times", [])),
        "success_rates": json.dumps(historical_data.get("success_rates", [])),
        "status_counts": historical_data.get(
            "status_counts",
            {"ok": 0, "warn": 0, "error": 0, "critical": 0, "unknown": 0},
        ),
        "recommendations": recommendations,
    }

    # Add component status
    for check_name, check_result in result.get("checks", {}).items():
        template_data["component_status"][check_name] = check_result.get(
            "status", "unknown"
        )

        # Add component details
        details = check_result.get("details", {})
        if details:
            # Format details as string
            details_str = ", ".join([f"{k}: {v}" for k, v in details.items()])
            template_data["component_details"][check_name] = details_str
        else:
            template_data["component_details"][check_name] = ""

    # Add trend data
    trends = metrics.get("trends", {})

    # Response time trend
    rt_trend = trends.get("response_time", {})
    template_data["response_time_trend"] = rt_trend.get("trend", "stable")
    rt_change = rt_trend.get("change_percent", 0)
    template_data["response_time_change"] = f"({rt_change:.2f}%)" if rt_change else ""

    # Success rate trend
    sr_trend = trends.get("success_rate", {})
    template_data["success_rate_trend"] = sr_trend.get("trend", "stable")
    sr_change = sr_trend.get("change", 0)
    template_data["success_rate_change"] = f"({sr_change:+.2f}%)" if sr_change else ""

    return render_template("vector_search_health.html", **template_data)


@vector_search_bp.route("/api/health")
@requires_auth(["admin", "viewer", "api"])
def health_api():
    """
    API endpoint for Vector Search health data

    Returns:
        JSON response with health data
    """
    # Get days parameter (default: 7)
    days = request.args.get("days", default=7, type=int)

    # Run health check
    result = monitor.run_health_check()

    # Get dashboard metrics
    metrics = monitor.get_dashboard_metrics()

    # Get historical data
    historical_data = monitor.get_historical_data(days=days)

    # Get recommendations
    from tools.vector_search.health_checker import VectorSearchHealthChecker

    checker = VectorSearchHealthChecker()
    recommendations = checker.get_recommendations(result)

    # Create API response
    response = {
        "status": metrics.get("status", "unknown"),
        "last_updated": datetime.now().isoformat(),
        "current": {"result": result, "metrics": metrics},
        "historical": historical_data,
        "recommendations": recommendations,
    }

    return jsonify(response)


@vector_search_bp.route("/api/run-check")
@requires_auth(["admin"])
def run_check_api():
    """
    API endpoint to run a health check

    Returns:
        JSON response with health check result
    """
    # Run health check
    result = monitor.run_health_check()

    return jsonify(
        {"status": "success", "result": result, "timestamp": datetime.now().isoformat()}
    )


def register_routes(app):
    """
    Register Vector Search routes with the Flask app

    Args:
        app: Flask application instance
    """
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Log registration
    logger.info("Registering Vector Search routes")

    # Register blueprint
    app.register_blueprint(vector_search_bp)
