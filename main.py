"""
VANA Agent - FastAPI Entry Point

This module provides the FastAPI entry point for the VANA agent using Google ADK.
"""

import os
import uvicorn
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app

# Get the directory where main.py is located
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Session database URL (SQLite for development)
SESSION_DB_URL = "sqlite:///./sessions.db"

# Allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]

# Serve web interface
SERVE_WEB_INTERFACE = True

# Create the FastAPI app using ADK
app: FastAPI = get_fast_api_app(
    agent_dir=AGENT_DIR,
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
