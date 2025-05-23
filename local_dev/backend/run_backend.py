#!/usr/bin/env python
"""
Backend server for VANA local development.
This script starts a Flask API server for the VANA backend.
"""

import os
import sys
import logging
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import importlib.util

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("vana-backend")

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Check if agent module is available
try:
    from agent.core import VanaAgent
    from agent.cli import VanaCLI
    logger.info("Agent module loaded successfully")
except ImportError:
    logger.error("Failed to import agent module. Make sure symbolic links are set up correctly.")
    sys.exit(1)

# Initialize agent
try:
    agent_cli = VanaCLI()
    logger.info("Agent initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize agent: {str(e)}")
    sys.exit(1)

# Define routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "message": "VANA backend is running"
    })

@app.route('/api/agent/message', methods=['POST'])
def process_message():
    """Process a message with the agent."""
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({
                "status": "error",
                "message": "Missing required field: message"
            }), 400
        
        message = data['message']
        session_id = data.get('session_id')
        user_id = data.get('user_id', 'web_user')
        
        # Process message with agent
        response = agent_cli.process_message(message)
        
        return jsonify({
            "status": "success",
            "response": response,
            "session_id": agent_cli.session_id
        })
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error processing message: {str(e)}"
        }), 500

@app.route('/api/agent/tools', methods=['GET'])
def get_tools():
    """Get available tools."""
    try:
        tools = agent_cli.agent.get_available_tools()
        return jsonify({
            "status": "success",
            "tools": tools
        })
    except Exception as e:
        logger.error(f"Error getting tools: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error getting tools: {str(e)}"
        }), 500

@app.route('/api/vector-search/health', methods=['GET'])
def vector_search_health():
    """Get Vector Search health status."""
    try:
        # Import the get_health_status function
        from agent.tools.vector_search import get_health_status
        
        # Get health status
        status = get_health_status()
        
        return jsonify({
            "status": "success",
            "health_status": status
        })
    except Exception as e:
        logger.error(f"Error getting Vector Search health status: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error getting Vector Search health status: {str(e)}"
        }), 500

@app.route('/api/vector-search/search', methods=['POST'])
def vector_search():
    """Search using Vector Search."""
    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({
                "status": "error",
                "message": "Missing required field: query"
            }), 400
        
        # Import the vector_search function
        from agent.tools.vector_search import vector_search as vs_search
        
        # Search
        query = data['query']
        limit = data.get('limit', 5)
        results = vs_search(query, limit=limit)
        
        return jsonify({
            "status": "success",
            "results": results
        })
    except Exception as e:
        logger.error(f"Error searching with Vector Search: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error searching with Vector Search: {str(e)}"
        }), 500

@app.route('/api/web-search', methods=['POST'])
def web_search():
    """Search the web."""
    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({
                "status": "error",
                "message": "Missing required field: query"
            }), 400
        
        # Import the web_search function
        from agent.tools.web_search import web_search as ws_search
        
        # Search
        query = data['query']
        limit = data.get('limit', 5)
        results = ws_search(query, limit=limit)
        
        return jsonify({
            "status": "success",
            "results": results
        })
    except Exception as e:
        logger.error(f"Error searching the web: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error searching the web: {str(e)}"
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('BACKEND_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting VANA backend server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
