#!/usr/bin/env python3
"""
Dashboard Authentication Routes

This module provides routes for dashboard authentication.
"""

import logging

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """
    Login route

    Returns:
        Rendered login template or redirect to dashboard
    """
    # Get next URL
    next_url = request.args.get("next", url_for("dashboard.index"))

    # Check if user is already logged in
    if "auth_token" in session:
        # Validate token
        auth = current_app.config.get("AUTH_MANAGER")
        if auth and auth.validate_token(session["auth_token"]):
            return redirect(next_url)

    # Handle login form submission
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        # Validate credentials
        auth = current_app.config.get("AUTH_MANAGER")
        if auth and auth.authenticate(username, password):
            # Generate token
            token = auth.generate_token(username)

            # Store token in session
            session["auth_token"] = token
            session["username"] = username

            # Redirect to next URL
            return redirect(next_url)
        else:
            # Authentication failed
            flash("Invalid username or password", "error")

    # Render login template
    return render_template("auth/login.html")


@auth_bp.route("/logout")
def logout():
    """
    Logout route

    Returns:
        Redirect to login page
    """
    # Revoke token if it exists
    if "auth_token" in session:
        auth = current_app.config.get("AUTH_MANAGER")
        if auth:
            auth.revoke_token(session["auth_token"])

    # Clear session
    session.clear()

    # Redirect to login page
    flash("You have been logged out", "info")
    return redirect(url_for("auth.login"))


@auth_bp.route("/change-password", methods=["GET", "POST"])
def change_password():
    """
    Change password route

    Returns:
        Rendered change password template or redirect to dashboard
    """
    # Check if user is logged in
    if "auth_token" not in session:
        return redirect(url_for("auth.login", next=request.url))

    # Validate token
    auth = current_app.config.get("AUTH_MANAGER")
    if not auth or not auth.validate_token(session["auth_token"]):
        session.clear()
        return redirect(url_for("auth.login", next=request.url))

    # Handle form submission
    if request.method == "POST":
        current_password = request.form.get("current_password")
        new_password = request.form.get("new_password")
        confirm_password = request.form.get("confirm_password")

        # Validate current password
        username = session.get("username")
        if not auth.authenticate(username, current_password):
            flash("Current password is incorrect", "error")
            return render_template("auth/change_password.html")

        # Validate new password
        if new_password != confirm_password:
            flash("New passwords do not match", "error")
            return render_template("auth/change_password.html")

        # Change password
        if auth.change_password(username, new_password):
            # Password changed successfully
            flash("Password changed successfully", "success")

            # Revoke current token
            auth.revoke_token(session["auth_token"])

            # Generate new token
            token = auth.generate_token(username)

            # Update session
            session["auth_token"] = token

            # Redirect to dashboard
            return redirect(url_for("dashboard.index"))
        else:
            # Password change failed
            flash("Failed to change password", "error")

    # Render change password template
    return render_template("auth/change_password.html")


def register_routes(app, auth_manager=None):
    """
    Register authentication routes with the Flask app

    Args:
        app: Flask application instance
        auth_manager: Authentication manager instance
    """
    # Register authentication manager
    if auth_manager:
        app.config["AUTH_MANAGER"] = auth_manager

    # Register blueprint
    app.register_blueprint(auth_bp)
