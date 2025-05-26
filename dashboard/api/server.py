"""
VANA Dashboard API Server

Exposes alert, health check, and agent interaction endpoints for frontend/UI integration.
"""

from flask import Flask, jsonify, request
from dashboard.alerting.alert_manager import AlertManager
from dashboard.monitoring.health_check import HealthCheck
from dashboard.auth.dashboard_auth import requires_auth # Assuming this decorator is available and functional
from dashboard.api.agent_api import process_chat_message, get_interaction_details, get_agent_statuses, get_agent_activity # Keep existing agent_api imports if still used

app = Flask(__name__)
alert_manager = AlertManager()
health_check = HealthCheck()

# TODO: Determine if get_agent_statuses and get_agent_activity are still needed
# or if they are replaced/complemented by the new agent interaction endpoints.
# For now, keeping them to avoid breaking other parts of the UI.

@app.route("/api/agent/statuses", methods=["GET"])
# @requires_auth(["admin", "viewer"]) # Placeholder for auth
def agent_statuses():
    """Get status of all Vana agents (mock data for now)."""
    # This might be deprecated if the new agent interaction model makes it obsolete
    # or if it refers to a different concept of "agents" than the interactive VanaAgent.
    return jsonify(get_agent_statuses())

@app.route("/api/agent/activity/<agent_name>", methods=["GET"])
# @requires_auth(["admin", "viewer"]) # Placeholder for auth
def agent_activity(agent_name: str):
    """Get activity for a specific Vana agent (mock data for now)."""
    hours = request.args.get("hours", 24, type=int)
    # Similar to agent_statuses, this might be deprecated or changed.
    return jsonify(get_agent_activity(agent_name, hours))


@app.route("/api/alerts", methods=["GET"])
# @requires_auth(["admin", "viewer", "api"]) # Original auth decorator
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

# New Agent Interaction Endpoints

@app.route("/api/agent/chat", methods=["POST"])
# @requires_auth(["user"]) # Adjust roles as needed; user_id might come from auth context
def chat_with_agent():
    """
    Handles chat messages to the VanaAgent.
    Expects JSON: {"user_id": "some_user", "message": "Hello agent", "session_id": "optional_session_id"}
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    user_id = data.get("user_id")
    message = data.get("message")
    session_id = data.get("session_id") # Optional

    if not user_id or not message:
        return jsonify({"error": "user_id and message are required"}), 400

    try:
        response = process_chat_message(user_id=user_id, message=message, session_id=session_id)
        return jsonify(response)
    except Exception as e:
        # Log the exception details here
        return jsonify({"error": "Failed to process chat message", "details": str(e)}), 500

@app.route("/api/agent/interactions", methods=["GET"])
# @requires_auth(["user"]) # Adjust roles as needed
def get_agent_interactions():
    """
    Retrieves interaction details for a given session.
    Query params: session_id (required), message_id (optional)
    e.g., /api/agent/interactions?session_id=xyz&message_id=abc
    """
    session_id = request.args.get("session_id")
    message_id = request.args.get("message_id") # Optional

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    try:
        interactions = get_interaction_details(session_id=session_id, message_id=message_id)
        return jsonify({"interactions": interactions})
    except Exception as e:
        # Log the exception details here
        return jsonify({"error": "Failed to retrieve interaction details", "details": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)