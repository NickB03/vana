#!/usr/bin/env python3
"""
Simple backend server for VANA local development.
This script starts a Flask API server with basic endpoints.
"""

import os
import sys
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("vana-backend")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "message": "VANA backend is running"
    })

@app.route('/api/echo', methods=['POST'])
def echo():
    """Echo endpoint."""
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({
                "status": "error",
                "message": "Missing required field: message"
            }), 400
        
        message = data['message']
        
        return jsonify({
            "status": "success",
            "message": f"Echo: {message}"
        })
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error processing message: {str(e)}"
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('BACKEND_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting simple VANA backend server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
