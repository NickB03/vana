#!/usr/bin/env python3
"""
VANA Main Entry Point
ADK-compliant FastAPI server following official deployment patterns
"""

import os
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app

# Add the project root to Python path for imports
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not available, rely on system environment

# Get the directory where main.py is located
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
# ADK expects agents to be in a subdirectory
AGENT_DIR = os.path.join(PROJECT_ROOT, "agents")

# CORS configuration for web interface
ALLOWED_ORIGINS = [
    "http://localhost",
    "http://localhost:8080", 
    "http://localhost:8081",
    "*"  # For Cloud Run deployment
]

# Enable web interface for Cloud Run deployment
SERVE_WEB_INTERFACE = True

# Create FastAPI app using ADK's official pattern
# Note: get_fast_api_app doesn't accept session_service_uri directly
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

# Add health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run"""
    agent_status = verify_agent()
    return {
        "status": "healthy" if agent_status else "unhealthy",
        "service": "vana",
        "version": "1.0.0",
        "agent_loaded": agent_status
    }

# Verify agent is available for health checks
def verify_agent():
    """Verify VANA agent is properly loaded"""
    try:
        from agents.vana.agent import root_agent
        print(f"✅ VANA Agent loaded: {root_agent.name}")
        return True
    except Exception as e:
        print(f"❌ Failed to load VANA agent: {e}")
        return False

# Initialize agent verification
if verify_agent():
    print("🚀 VANA FastAPI server ready for Cloud Run deployment")
else:
    print("⚠️ VANA agent verification failed")

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8081
    port = int(os.environ.get("PORT", 8081))
    print(f"🌐 Starting VANA server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)