"""
VANA Multi-Agent System - FastAPI Entry Point

This module provides the FastAPI entry point for the VANA multi-agent system using Google ADK.
It uses the orchestrator agent that coordinates specialized agents for different capabilities.
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

# Add custom routes for multi-agent system
@app.get("/health")
async def health_check():
    """Health check endpoint for multi-agent system."""
    return {
        "status": "healthy", 
        "agent": "vana_multi_agent",
        "architecture": "multi_agent_orchestrator",
        "agents": {
            "orchestrator": "vana",
            "root_agent": "vana_root", 
            "code_agent": "vana_coder",
            "search_agent": "vana_searcher"
        }
    }

@app.get("/info")
async def agent_info():
    """Get multi-agent system information."""
    return {
        "name": "VANA Multi-Agent System",
        "description": "Comprehensive AI assistant with specialized agent coordination for programming, research, file management, and knowledge organization",
        "version": "2.0.0",
        "architecture": "multi_agent",
        "adk_integrated": True,
        "capabilities": {
            "file_operations": "24 comprehensive file system tools",
            "code_execution": "Multi-language programming via ADK built-in tools",
            "web_search": "Real-time search via ADK built-in Google search",
            "vector_search": "Semantic search via Vertex AI",
            "knowledge_graph": "Structured knowledge storage via MCP",
            "documentation": "Context7 integration for library docs"
        },
        "agents": {
            "orchestrator": {
                "name": "VANA Orchestrator",
                "role": "Task coordination and multi-agent management",
                "capabilities": ["agent_routing", "task_decomposition", "result_synthesis"]
            },
            "root_agent": {
                "name": "VANA Root Agent", 
                "role": "File operations and knowledge management",
                "capabilities": ["file_system", "vector_search", "knowledge_graph", "system_monitoring"]
            },
            "code_agent": {
                "name": "VANA Code Execution Agent",
                "role": "Programming and code execution",
                "capabilities": ["code_execution", "debugging", "script_creation", "performance_analysis"]
            },
            "search_agent": {
                "name": "VANA Search Agent",
                "role": "Web search and information retrieval", 
                "capabilities": ["web_search", "research", "information_verification", "source_attribution"]
            }
        }
    }

@app.get("/agents")
async def list_agents():
    """List all available agents in the system."""
    return {
        "total_agents": 4,
        "agents": [
            {
                "id": "vana",
                "name": "VANA Orchestrator",
                "type": "orchestrator",
                "status": "active",
                "description": "Main coordinator for multi-agent tasks"
            },
            {
                "id": "vana_root",
                "name": "VANA Root Agent",
                "type": "specialist",
                "status": "active", 
                "description": "File operations and knowledge management specialist"
            },
            {
                "id": "vana_coder",
                "name": "VANA Code Execution Agent",
                "type": "specialist",
                "status": "active",
                "description": "Programming and code execution specialist"
            },
            {
                "id": "vana_searcher", 
                "name": "VANA Search Agent",
                "type": "specialist",
                "status": "active",
                "description": "Web search and research specialist"
            }
        ]
    }

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
