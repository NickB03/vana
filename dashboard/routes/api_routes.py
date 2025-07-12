#!/usr/bin/env python3
"""
API Routes for VANA Dashboard

This module provides API routes for the VANA dashboard, including:
- Agent API endpoints
- Memory API endpoints
- System API endpoints
- Task API endpoints
"""

import logging
import os
import sys

from flask import Blueprint, jsonify, request

from dashboard.api.agent_api import get_agent_activity, get_agent_statuses
from dashboard.api.memory_api import get_memory_metrics_history, get_memory_usage, get_recent_queries
from dashboard.api.system_api import get_service_status, get_system_alerts, get_system_health, get_system_health_history
from dashboard.api.task_api import get_task_details, get_task_summary, get_task_timeline

# Import authentication decorator
from dashboard.auth.dashboard_auth import requires_auth

# Add the project root to the Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Import API modules

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
api_bp = Blueprint("api", __name__, url_prefix="/api")


# Agent API endpoints
@api_bp.route("/agents", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def agents():
    """
    Get status information for all agents

    Returns:
        JSON response with agent status data
    """
    return jsonify(get_agent_statuses())


@api_bp.route("/agents/<agent_name>/activity", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def agent_activity(agent_name):
    """
    Get activity data for a specific agent

    Args:
        agent_name: Name of the agent

    Returns:
        JSON response with agent activity data
    """
    hours = request.args.get("hours", default=24, type=int)
    return jsonify(get_agent_activity(agent_name, hours))


# Memory API endpoints
@api_bp.route("/memory/usage", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def memory_usage():
    """
    Get memory usage data

    Returns:
        JSON response with memory usage data
    """
    return jsonify(get_memory_usage())


@api_bp.route("/memory/history", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def memory_history():
    """
    Get historical memory metrics

    Returns:
        JSON response with historical memory metrics
    """
    hours = request.args.get("hours", default=24, type=int)
    return jsonify(get_memory_metrics_history(hours))


@api_bp.route("/memory/queries", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def memory_queries():
    """
    Get recent memory queries

    Returns:
        JSON response with recent memory queries
    """
    limit = request.args.get("limit", default=10, type=int)
    return jsonify(get_recent_queries(limit))


# System API endpoints
@api_bp.route("/system/services", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def system_services():
    """
    Get service status information

    Returns:
        JSON response with service status data
    """
    return jsonify(get_service_status())


@api_bp.route("/system/health", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def system_health():
    """
    Get system health data

    Returns:
        JSON response with system health data
    """
    return jsonify(get_system_health())


@api_bp.route("/system/health/history", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def system_health_history():
    """
    Get historical system health data

    Returns:
        JSON response with historical system health data
    """
    hours = request.args.get("hours", default=24, type=int)
    return jsonify(get_system_health_history(hours))


@api_bp.route("/system/alerts", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def system_alerts():
    """
    Get system alerts

    Returns:
        JSON response with system alerts
    """
    limit = request.args.get("limit", default=10, type=int)
    return jsonify(get_system_alerts(limit))


# Task API endpoints
@api_bp.route("/tasks/summary", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def task_summary():
    """
    Get task execution summary

    Returns:
        JSON response with task execution summary
    """
    time_range = request.args.get("time_range", default="day")
    return jsonify(get_task_summary(time_range))


@api_bp.route("/tasks", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def tasks():
    """
    Get task details

    Returns:
        JSON response with task details
    """
    task_id = request.args.get("task_id")
    return jsonify(get_task_details(task_id))


@api_bp.route("/tasks/timeline", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def task_timeline():
    """
    Get task execution timeline

    Returns:
        JSON response with task execution timeline
    """
    time_range = request.args.get("time_range", default="day")
    return jsonify(get_task_timeline(time_range))


def register_routes(app):
    """
    Register API routes with the Flask app

    Args:
        app: Flask application instance
    """
    # Log registration
    logger.info("Registering API routes")

    # Register blueprint
    app.register_blueprint(api_bp)
