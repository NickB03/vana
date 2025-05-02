"""
VANA Dashboard API Server

Exposes alert and health check endpoints for frontend/UI integration.
"""

from flask import Flask, jsonify, request
from dashboard.alerting.alert_manager import AlertManager
from dashboard.monitoring.health_check import HealthCheck

app = Flask(__name__)
alert_manager = AlertManager()
health_check = HealthCheck()

@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Get all active alerts."""
    alerts = alert_manager.get_active_alerts()
    return jsonify({"alerts": alerts})

@app.route("/api/alerts/acknowledge", methods=["POST"])
def acknowledge_alert():
    """Acknowledge an alert by ID."""
    data = request.get_json()
    alert_id = data.get("alert_id")
    if not alert_id:
        return jsonify({"error": "alert_id required"}), 400
    success = alert_manager.acknowledge_alert(alert_id)
    return jsonify({"success": success})

@app.route("/api/alerts/clear", methods=["POST"])
def clear_alert():
    """Clear an alert by ID."""
    data = request.get_json()
    alert_id = data.get("alert_id")
    if not alert_id:
        return jsonify({"error": "alert_id required"}), 400
    success = alert_manager.clear_alert(alert_id)
    return jsonify({"success": success})

@app.route("/api/alerts/history", methods=["GET"])
def get_alert_history():
    """Get recent alert history (active, acknowledged, cleared)."""
    limit = int(request.args.get("limit", 100))
    alerts = alert_manager.get_alert_history(limit=limit)
    return jsonify({"alerts": alerts})

@app.route("/api/health", methods=["GET"])
def get_health():
    """Get current health status."""
    status = health_check.get_health_status()
    return jsonify(status)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)