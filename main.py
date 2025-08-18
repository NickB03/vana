"""
VANA Agent - FastAPI Entry Point

This module provides the FastAPI entry point for the VANA agent using Google ADK.
Automatically detects environment and configures authentication appropriately.
Includes proper ADK memory service initialization for vector search and RAG pipeline.
"""

import os
import uvicorn
import logging
from fastapi import FastAPI, Request
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.memory import VertexAiRagMemoryService, InMemoryMemoryService

# Import our smart environment detection
from lib.environment import setup_environment

# Import MCP server components
from lib.mcp_server.sse_transport import MCPSSETransport

# Import ADK memory service
from lib._shared_libraries.adk_memory_service import get_adk_memory_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup environment-specific configuration
logger.info("Setting up environment configuration...")
environment_type = setup_environment()
logger.info(f"Environment configured: {environment_type}")

# Initialize ADK Memory Service
logger.info("Initializing ADK Memory Service...")
memory_service = get_adk_memory_service()
memory_info = memory_service.get_service_info()
logger.info(f"Memory service initialized: {memory_info['service_type']}")
logger.info(f"Memory service available: {memory_info['available']}")
logger.info(f"Supports persistence: {memory_info['supports_persistence']}")

# Get the directory where main.py is located - this is where the agent files are now located
# Supporting directories are now in lib/ to avoid being treated as agents
AGENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agents")
if os.path.exists(AGENT_DIR):
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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

# Initialize MCP SSE Transport
mcp_transport = MCPSSETransport(None)  # Server will be initialized later

# Add MCP endpoints
@app.get("/mcp/sse")
async def mcp_sse_endpoint(request: Request):
    """MCP Server-Sent Events endpoint"""
    return await mcp_transport.handle_sse_connection(request)

@app.post("/mcp/messages")
async def mcp_messages_endpoint(request: Request):
    """MCP messages endpoint for JSON-RPC communication"""
    return await mcp_transport.handle_message_post(request)

# Add custom routes if needed
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "agent": "vana", "mcp_enabled": True}

@app.get("/info")
async def agent_info():
    """Get agent information."""
    # Get current memory service info
    current_memory_info = memory_service.get_service_info()

    return {
        "name": "VANA",
        "description": "AI assistant with memory, knowledge graph, and search capabilities",
        "version": "1.0.0",
        "adk_integrated": True,
        "mcp_server": True,
        "mcp_endpoints": {
            "sse": "/mcp/sse",
            "messages": "/mcp/messages"
        },
        "memory_service": {
            "type": current_memory_info["service_type"],
            "available": current_memory_info["available"],
            "supports_persistence": current_memory_info["supports_persistence"],
            "supports_semantic_search": current_memory_info["supports_semantic_search"]
        },
        "environment": environment_type
    }

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
