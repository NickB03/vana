"""
Flask Integration App for Dashboard API

This module creates a Flask application that integrates the new dashboard API
with the existing VANA system, providing unified endpoints for both React WebUI
and Streamlit dashboard.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from datetime import datetime

# Import our new API blueprints
from dashboard.api.dashboard_api import dashboard_bp
from dashboard.api.auth_bridge import auth_bridge_bp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_integration_app():
    """Create and configure the Flask integration app"""
    app = Flask(__name__)
    
    # Configure CORS for React frontend
    CORS(app, origins=[
        "http://localhost:3000",  # React development server
        "http://localhost:3001",  # Alternative React port
        "https://vana-qqugqgsbcq-uc.a.run.app",  # Production VANA service
        "https://vana-dev-960076421399.us-central1.run.app"  # Development service
    ])
    
    # Configure app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Register API blueprints
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(auth_bridge_bp)
    
    # Root health check
    @app.route('/health')
    def health_check():
        """Main health check endpoint"""
        return jsonify({
            "service": "vana-dashboard-integration",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "components": {
                "dashboard_api": "operational",
                "auth_bridge": "operational",
                "flask_app": "operational"
            }
        })
    
    # Root endpoint
    @app.route('/')
    def root():
        """Root endpoint with API information"""
        return jsonify({
            "service": "VANA Dashboard Integration API",
            "version": "1.0.0",
            "endpoints": {
                "health": "/health",
                "dashboard": "/api/dashboard/*",
                "auth": "/api/auth/*"
            },
            "documentation": {
                "dashboard_overview": "/api/dashboard/overview",
                "agents": "/api/dashboard/agents",
                "system": "/api/dashboard/system",
                "memory": "/api/dashboard/memory",
                "tasks": "/api/dashboard/tasks",
                "auth_token": "/api/auth/generate-token",
                "validate_token": "/api/auth/validate-token",
                "streamlit_session": "/api/auth/streamlit-session"
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Endpoint not found",
            "message": "The requested endpoint does not exist",
            "available_endpoints": [
                "/health",
                "/api/dashboard/overview",
                "/api/dashboard/agents",
                "/api/dashboard/system", 
                "/api/dashboard/memory",
                "/api/dashboard/tasks",
                "/api/auth/generate-token",
                "/api/auth/validate-token",
                "/api/auth/streamlit-session"
            ]
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }), 500
    
    # Request logging middleware
    @app.before_request
    def log_request_info():
        logger.info(f"Request: {request.method} {request.url}")
        if request.is_json:
            logger.debug(f"Request data: {request.get_json()}")
    
    @app.after_request
    def log_response_info(response):
        logger.info(f"Response: {response.status_code}")
        return response
    
    logger.info("Flask integration app created successfully")
    return app

# Create the app instance
app = create_integration_app()

if __name__ == '__main__':
    # Development server
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting VANA Dashboard Integration API on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
