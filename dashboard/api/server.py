"""
VANA Dashboard API Server

Exposes alert and health check endpoints for frontend/UI integration.
"""

from flask import Flask, jsonify, request
from dashboard.alerting.alert_manager import AlertManager
from dashboard.monitoring.health_check import HealthCheck
from dashboard.auth.dashboard_auth import requires_auth
from dashboard.api.adk_memory_api import adk_memory_api

app = Flask(__name__)
alert_manager = AlertManager()
health_check = HealthCheck()

@app.route("/api/alerts", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_alerts():
    """Get all active alerts."""
    alerts = alert_manager.get_active_alerts()
    return jsonify({"alerts": alerts})

@app.route("/api/alerts/acknowledge", methods=["POST"])
@requires_auth(["admin", "api"])
def acknowledge_alert():
    """Acknowledge an alert by ID."""
    data = request.get_json()
    alert_id = data.get("alert_id")
    if not alert_id:
        return jsonify({"error": "alert_id required"}), 400
    success = alert_manager.acknowledge_alert(alert_id)
    return jsonify({"success": success})

@app.route("/api/alerts/clear", methods=["POST"])
@requires_auth(["admin", "api"])
def clear_alert():
    """Clear an alert by ID."""
    data = request.get_json()
    alert_id = data.get("alert_id")
    if not alert_id:
        return jsonify({"error": "alert_id required"}), 400
    success = alert_manager.clear_alert(alert_id)
    return jsonify({"success": success})

@app.route("/api/alerts/history", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_alert_history():
    """Get recent alert history (active, acknowledged, cleared)."""
    limit = int(request.args.get("limit", 100))
    alerts = alert_manager.get_alert_history(limit=limit)
    return jsonify({"alerts": alerts})

@app.route("/api/health", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_health():
    """Get current health status."""
    status = health_check.get_health_status()
    return jsonify(status)

# ADK Memory API Endpoints
@app.route("/api/adk-memory/status", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_status():
    """Get ADK memory system status."""
    status = adk_memory_api.get_status()
    return jsonify(status)

@app.route("/api/adk-memory/metrics", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_metrics():
    """Get current ADK memory metrics."""
    metrics = adk_memory_api.get_metrics()
    return jsonify(metrics)

@app.route("/api/adk-memory/costs", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_costs():
    """Get ADK memory cost metrics."""
    costs = adk_memory_api.get_cost_metrics()
    return jsonify(costs)

@app.route("/api/adk-memory/history", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_history():
    """Get ADK memory metrics history."""
    hours = int(request.args.get("hours", 24))
    history = adk_memory_api.get_history(hours)
    return jsonify(history)

@app.route("/api/adk-memory/cost-history", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_cost_history():
    """Get ADK memory cost history."""
    hours = int(request.args.get("hours", 24))
    history = adk_memory_api.get_cost_history(hours)
    return jsonify(history)

@app.route("/api/adk-memory/performance-comparison", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_performance_comparison():
    """Get ADK memory performance comparison."""
    comparison = adk_memory_api.get_performance_comparison()
    return jsonify(comparison)

@app.route("/api/adk-memory/sessions", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_sessions():
    """Get ADK memory session metrics."""
    sessions = adk_memory_api.get_session_metrics()
    return jsonify(sessions)

@app.route("/api/adk-memory/reliability", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_reliability():
    """Get ADK memory reliability metrics."""
    reliability = adk_memory_api.get_reliability_metrics()
    return jsonify(reliability)

@app.route("/api/adk-memory/diagnostics", methods=["GET"])
@requires_auth(["admin", "viewer", "api"])
def get_adk_memory_diagnostics():
    """Get ADK memory diagnostic information."""
    diagnostics = adk_memory_api.get_diagnostic_info()
    return jsonify(diagnostics)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)