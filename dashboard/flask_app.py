#!/usr/bin/env python3
"""
VANA Flask Dashboard Application

This is the Flask-based dashboard application for VANA.
It integrates all dashboard components and provides a web interface
for monitoring and managing the VANA system.
"""

from dashboard.routes.vector_search_routes import (
    register_routes as register_vector_search_routes,
)
from dashboard.routes.auth_routes import register_routes as register_auth_routes
from dashboard.routes.api_routes import register_routes as register_api_routes
from dashboard.auth.dashboard_auth import DashboardAuth
import argparse
import logging
import os
import sys

from flask import Flask, redirect, render_template, url_for

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import authentication manager

# Import route modules

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def create_app(config_name=None):
    """
    Create and configure the Flask application

    Args:
        config: Configuration dictionary

    Returns:
        Flask application instance
    """
    # Create Flask app
    app = Flask(__name__)

    # Configure app
    app.config.from_mapping(
        SECRET_KEY=os.environ.get(
            "DASHBOARD_SECRET_KEY", "dev-key-change-in-production"
        ),
        SESSION_TYPE="filesystem",
        SESSION_PERMANENT=False,
        SESSION_USE_SIGNER=True,
        PERMANENT_SESSION_LIFETIME=86400,  # 24 hours
        TEMPLATES_AUTO_RELOAD=False,
    )

    # Apply additional configuration
    if config_name == "demo":
        app.config.from_object("dashboard.config.demo")
        logger.info("Loaded demo configuration from dashboard.config.demo")
    elif config_name:
        # Placeholder for other named configurations if needed in the future
        logger.warning(
            f"Configuration '{config_name}' not explicitly handled, using defaults."
        )

    # Override with environment variables if they exist, as they take precedence
    app.config.from_prefixed_env(prefix="VANA_DASHBOARD")

    # Create authentication manager if enabled
    auth_enabled = app.config.get(
        "ENABLE_AUTH",
        os.environ.get("DASHBOARD_AUTH_ENABLED", "true").lower() == "true",
    )
    auth_manager = None

    if auth_enabled:
        # Use credentials from app.config if available (e.g., from demo.py)
        demo_username = app.config.get("DEMO_USERNAME")
        demo_password = app.config.get("DEMO_PASSWORD")
        if demo_username and demo_password:
            logger.info("Using demo credentials for authentication from config.")
            # Create a temporary credentials structure for DashboardAuth if using demo credentials
            # This part might need DashboardAuth to be more flexible or to use a different auth mode
            auth_manager = DashboardAuth(
                credentials_data={"users": {demo_username: demo_password}},
                audit_log_file=app.config.get(
                    "LOG_FILE_PATH", os.path.join("logs", "audit", "dashboard_auth.log")
                ),
                token_expiry=int(
                    app.config.get(
                        "TOKEN_EXPIRY",
                        os.environ.get("DASHBOARD_TOKEN_EXPIRY", "86400"),
                    )
                ),
                enable_audit=app.config.get(
                    "ENABLE_AUDIT",
                    os.environ.get("DASHBOARD_AUDIT_ENABLED", "true").lower() == "true",
                ),
            )
        else:
            # Get credentials file path
            credentials_file = os.environ.get(
                "DASHBOARD_CREDENTIALS_FILE",
                os.path.join(os.path.dirname(__file__), "auth", "credentials.json"),
            )
            # Get audit log file path
            audit_log_file = os.environ.get(
                "DASHBOARD_AUDIT_LOG_FILE",
                os.path.join("logs", "audit", "dashboard_auth.log"),
            )
            auth_manager = DashboardAuth(
                credentials_file=credentials_file,
                audit_log_file=audit_log_file,
                token_expiry=int(os.environ.get("DASHBOARD_TOKEN_EXPIRY", "86400")),
                enable_audit=os.environ.get("DASHBOARD_AUDIT_ENABLED", "true").lower()
                == "true",
            )
            logger.info(
                f"Authentication enabled with credentials file: {credentials_file}"
            )
    else:
        logger.warning(
            "Authentication is DISABLED - this is not recommended for production!"
        )

    # Register routes
    register_auth_routes(app, auth_manager)
    register_vector_search_routes(app)
    register_api_routes(app)

    # Register main routes
    @app.route("/")
    def index():
        """Main dashboard index route"""
        return redirect(url_for("vector_search.health"))

    # Register error handlers
    @app.errorhandler(404)
    def page_not_found(e):
        """404 error handler"""
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def server_error(e):
        """500 error handler"""
        logger.error(f"Server error: {e}")
        return render_template("errors/500.html"), 500

    return app


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="VANA Dashboard")
    parser.add_argument(
        "--host", type=str, default="127.0.0.1", help="Host to listen on"
    )
    parser.add_argument("--port", type=int, default=5000, help="Port to listen on")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--no-auth", action="store_true", help="Disable authentication")
    parser.add_argument(
        "--config", type=str, default=None, help="Configuration to use (e.g., 'demo')"
    )
    args = parser.parse_args()

    # Set environment variables
    if args.no_auth:
        os.environ["DASHBOARD_AUTH_ENABLED"] = "false"

    # Create app
    app = create_app(config_name=args.config)

    # Run app
    logger.info(f"Starting VANA Dashboard on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
