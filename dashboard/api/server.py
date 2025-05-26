"""
VANA Dashboard API Server

Exposes alert, health check, and agent interaction endpoints for frontend/UI integration.
"""

from flask import Flask, jsonify, request
from dashboard.alerting.alert_manager import AlertManager
from dashboard.monitoring.health_check import HealthCheck
from dashboard.auth.dashboard_auth import requires_auth # Assuming this decorator is available
from dashboard.api.agent_api import process_chat_message, get_interaction_details # Primary agent functions
# from dashboard.api.agent_api import get_agent_statuses, get_agent_activity # Kept for now if UI still uses them
from flask import g # For accessing user context if set by requires_auth

app = Flask(__name__)
alert_manager = AlertManager()
health_check = HealthCheck()

# Optional: Keep mock data routes if other parts of the UI still depend on them.
# If not, they can be removed.
# from dashboard.api.agent_api import get_agent_statuses, get_agent_activity
# @app.route("/api/agent/statuses", methods=["GET"])
# def agent_statuses():
#     return jsonify(get_agent_statuses())
# @app.route("/api/agent/activity/<agent_name>", methods=["GET"])
# def agent_activity(agent_name: str):
#     hours = request.args.get("hours", 24, type=int)
#     return jsonify(get_agent_activity(agent_name, hours))


@app.route("/api/alerts", methods=["GET"])
# @requires_auth(["admin", "viewer", "api"]) 
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
    Expects JSON: {"message": "Hello agent", "session_id": "optional_session_id"}
    user_id is derived from the authentication context.
    """
    # @requires_auth would typically set g.user or similar
    # For now, user_id is hardcoded as auth integration is out of scope for this specific task.
    # user_id = g.user.get("id") if hasattr(g, 'user') and g.user else None
    # if not user_id:
    #     return jsonify({"error": "User ID not found in authentication context"}), 401
    user_id = "test_user_id" # Placeholder for user_id from auth

    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Missing 'message' in request body"}), 400
    
    message = data["message"]
    session_id = data.get("session_id") # Optional

    try:
        # result is expected to be a dict: {"response": "...", "session_id": "..."} or {"error": "...", "session_id": "..."}
        result = process_chat_message(user_id=user_id, message=message, session_id=session_id)
        
        if "error" in result:
            # agent_api.py can suggest a status_code, otherwise default to 500 for agent/processing errors
            status_code = result.get("status_code", 500) 
            # Log the detailed error from result["error"] on the server
            app.logger.error(f"Agent API error for user {user_id}, session {result.get('session_id')}: {result['error']}")
            return jsonify({"error": result["error"], "session_id": result.get("session_id")}), status_code
        
        return jsonify(result), 200
        
    except Exception as e:
        # This catches unexpected errors in process_chat_message or this handler itself
        app.logger.exception(f"Unexpected error in /api/agent/chat for user {user_id}: {e}")
        return jsonify({"error": "An unexpected error occurred while processing your message."}), 500


@app.route("/api/agent/interactions", methods=["GET"])
# @requires_auth(["admin", "user"]) # Or appropriate roles
def get_agent_interactions():
    """
    Retrieves interaction details for a given session.
    Query params: session_id (required), message_id (optional)
    e.g., /api/agent/interactions?session_id=xyz&message_id=abc
    """
    # Optional: If access control per user per session_id is needed,
    # user_id would be extracted from auth context here as well.
    # user_id = g.user.get("id") if hasattr(g, 'user') and g.user else None
    # if not user_id:
    #     return jsonify({"error": "User ID not found in authentication context"}), 401

    session_id = request.args.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing 'session_id' query parameter"}), 400
    
    message_id = request.args.get("message_id") # Optional, currently ignored by agent_api

    try:
        # interaction_logs is expected to be List[Dict]
        interaction_logs = get_interaction_details(session_id=session_id, message_id=message_id)
        
        # It's fine to return an empty list if a session has no logs or session_id is unknown
        return jsonify({"interactions": interaction_logs, "session_id": session_id}), 200

    except Exception as e:
        # This catches unexpected errors in get_interaction_details or this handler
        app.logger.exception(f"Unexpected error in /api/agent/interactions for session {session_id}: {e}")
        return jsonify({"error": "An unexpected error occurred while retrieving interaction details."}), 500

# Optional: Global error handler for unhandled exceptions
# @app.errorhandler(Exception)
# def handle_generic_error(e):
#     app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
#     # Avoid Werkzeug HTML error pages for API calls
#     if request.path.startswith('/api/'):
#         return jsonify(error="An unexpected server error occurred."), 500
#     # For non-API routes, you might want to let the default HTML error page render
#     # or render a custom HTML error page.
#     return e # Let Flask handle it, or return your custom HTML error page.


if __name__ == "__main__":
    # Setup basic logging for the Flask app if not already configured
    if not app.debug: # Don't setup basicConfig if Flask's own debug logger is active
        logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
    
    app.run(host="0.0.0.0", port=5050, debug=True) # debug=True enables Flask's debugger and reloader