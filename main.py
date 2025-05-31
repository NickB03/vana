"""
VANA Agent - FastAPI Entry Point

This module provides the FastAPI entry point for the VANA agent using Google ADK.
Automatically detects environment and configures authentication appropriately.
"""

import os
import uvicorn
import logging
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app

# Import our smart environment detection
from lib.environment import setup_environment

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup environment-specific configuration
logger.info("Setting up environment configuration...")
environment_type = setup_environment()
logger.info(f"Environment configured: {environment_type}")

# Get the directory where main.py is located - this is where the agent files are now located
# Supporting directories are now in lib/ to avoid being treated as agents
AGENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agents")
print(f"Agent directory: {AGENT_DIR}")
print(f"Directory exists: {os.path.exists(AGENT_DIR)}")
if os.path.exists(AGENT_DIR):
    print(f"Agent files in directory: {[f for f in os.listdir(AGENT_DIR) if f.endswith('.py') or f == '__init__.py']}")
    print(f"Directories in agent dir: {[d for d in os.listdir(AGENT_DIR) if os.path.isdir(os.path.join(AGENT_DIR, d)) and not d.startswith('.')]}")

# Session database URL (SQLite for development)
# Use /tmp for Cloud Run compatibility (writable filesystem)
SESSION_DB_URL = "sqlite:////tmp/sessions.db"

# Allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]

# Serve web interface
SERVE_WEB_INTERFACE = True

# Create the FastAPI app using ADK
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_db_url=SESSION_DB_URL,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

# Add custom routes if needed
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "agent": "vana"}

@app.get("/info")
async def agent_info():
    """Get agent information."""
    return {
        "name": "VANA",
        "description": "AI assistant with memory, knowledge graph, and search capabilities",
        "version": "1.0.0",
        "adk_integrated": True
    }

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
