"""
VANA Agent - FastAPI Entry Point

This module provides the FastAPI entry point for the VANA agent using Google ADK.
Automatically detects environment and configures authentication appropriately.
Includes proper ADK memory service initialization for vector search and RAG pipeline.
"""

import logging
import os
import sys

import uvicorn
from fastapi import FastAPI, Request
from google.adk.cli.fast_api import get_fast_api_app

# Configure centralized logging first
from lib.logging_config import setup_logging

setup_logging()
logger = logging.getLogger("vana.main")

# Ensure current directory is in Python path for lib imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Verify lib directory exists for imports
if not os.path.exists(os.path.join(current_dir, "lib")):
    logger.warning("lib directory not found - some imports may fail")

# Import our smart environment detection
from lib.environment import setup_environment

# Import MCP server components
from lib.mcp_server.sse_transport import MCPSSETransport

# Setup environment-specific configuration
logger.info("Setting up environment configuration...")
environment_type = setup_environment()
logger.info(f"Environment configured: {environment_type}")

# Get the directory where main.py is located - this is where the agent files are now located
# Supporting directories are now in lib/ to avoid being treated as agents
AGENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agents")
logger.info(f"Agent directory: {AGENT_DIR}")

# Verify agent directory exists
if not os.path.exists(AGENT_DIR):
    logger.warning(f"Agent directory not found: {AGENT_DIR}")
else:
    logger.info("Agent directory found and accessible")

# Session database URL (SQLite for development)
# Use /tmp for Cloud Run compatibility (writable filesystem)
SESSION_DB_URL = "sqlite:////tmp/sessions.db"

# Allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]

# Serve web interface
SERVE_WEB_INTERFACE = True


# Security guardrail callbacks
def before_tool_callback(_tool_name: str, tool_args: dict, _session):
    """Validate tool arguments before execution."""
    path_arg = tool_args.get("file_path") or tool_args.get("directory_path")
    if path_arg and (".." in path_arg or path_arg.startswith("/")):
        raise ValueError("Invalid path access")


def after_model_callback(_agent_name: str, response: str, _session):
    """Lightweight policy check on model responses."""
    banned = ["malware", "illegal"]
    if any(word in response.lower() for word in banned):
        logger.warning("Policy violation detected in response")


# Create the FastAPI app using ADK
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)
logger.info("FastAPI app created successfully")

# Note: Security guardrails defined above for future integration
# Current ADK version may not support callback parameters

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
    # Get current memory service info (lazy initialization)
    from lib._shared_libraries.lazy_initialization import get_adk_memory_service

    memory_service = get_adk_memory_service()
    current_memory_info = memory_service.get_service_info()

    return {
        "name": "VANA",
        "description": "AI assistant with memory, knowledge graph, and search capabilities",
        "version": "1.0.0",
        "adk_integrated": True,
        "mcp_server": True,
        "mcp_endpoints": {"sse": "/mcp/sse", "messages": "/mcp/messages"},
        "memory_service": {
            "type": current_memory_info["service_type"],
            "available": current_memory_info["available"],
            "supports_persistence": current_memory_info["supports_persistence"],
            "supports_semantic_search": current_memory_info["supports_semantic_search"],
        },
        "environment": environment_type,
    }


if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
