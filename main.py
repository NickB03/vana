"""
VANA Agent - FastAPI Entry Point

This module provides the FastAPI entry point for the VANA agent using Google ADK.
Automatically detects environment and configures authentication appropriately.
Includes proper ADK memory service initialization for vector search and RAG pipeline.
"""

import os
import sys
import uvicorn
import logging
import time
import psutil
from fastapi import FastAPI, Request
from google.adk.cli.fast_api import get_fast_api_app

# Memory profiling for startup debugging
startup_start_time = time.time()
startup_start_memory = psutil.Process().memory_info().rss / 1024 / 1024
print(f"STARTUP PROFILING: Initial memory usage: {startup_start_memory:.1f}MB")

# Ensure current directory is in Python path for lib imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Debug: Print current directory and lib directory status
print(f"DEBUG: Current working directory: {os.getcwd()}")
print(f"DEBUG: Script directory: {current_dir}")
print(f"DEBUG: Python path: {sys.path[:3]}")
print(f"DEBUG: lib directory exists: {os.path.exists(os.path.join(current_dir, 'lib'))}")
if os.path.exists(os.path.join(current_dir, 'lib')):
    lib_contents = os.listdir(os.path.join(current_dir, 'lib'))
    print(f"DEBUG: lib directory contents: {lib_contents[:5]}")

# Import our smart environment detection
from lib.environment import setup_environment
checkpoint_1_memory = psutil.Process().memory_info().rss / 1024 / 1024
print(f"STARTUP PROFILING: After environment import: {checkpoint_1_memory:.1f}MB (+{checkpoint_1_memory - startup_start_memory:.1f}MB)")

# Import MCP server components
from lib.mcp_server.sse_transport import MCPSSETransport
checkpoint_2_memory = psutil.Process().memory_info().rss / 1024 / 1024
print(f"STARTUP PROFILING: After MCP import: {checkpoint_2_memory:.1f}MB (+{checkpoint_2_memory - checkpoint_1_memory:.1f}MB)")

# Import ADK memory service
from lib._shared_libraries.adk_memory_service import get_adk_memory_service
checkpoint_3_memory = psutil.Process().memory_info().rss / 1024 / 1024
print(f"STARTUP PROFILING: After ADK memory service import: {checkpoint_3_memory:.1f}MB (+{checkpoint_3_memory - checkpoint_2_memory:.1f}MB)")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup environment-specific configuration
logger.info("Setting up environment configuration...")
environment_type = setup_environment()
logger.info(f"Environment configured: {environment_type}")

# Initialize lazy initialization manager (prevents import hanging)
from lib._shared_libraries.lazy_initialization import lazy_manager
logger.info("Lazy initialization manager ready - services will initialize on first use")

# Get the directory where main.py is located - this is where the agent files are now located
# Supporting directories are now in lib/ to avoid being treated as agents
AGENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agents")
logger.debug(f"Agent directory: {AGENT_DIR}")
logger.debug(f"Directory exists: {os.path.exists(AGENT_DIR)}")
if os.path.exists(AGENT_DIR):
    agent_files = [f for f in os.listdir(AGENT_DIR) if f.endswith('.py') or f == '__init__.py']
    agent_dirs = [d for d in os.listdir(AGENT_DIR) if os.path.isdir(os.path.join(AGENT_DIR, d)) and not d.startswith('.')]
    logger.debug(f"Agent files in directory: {agent_files}")
    logger.debug(f"Directories in agent dir: {agent_dirs}")

    # Check if vana agent can be imported
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        import vana
        logger.info("✅ Root level vana module imported successfully")
        logger.debug(f"Root level vana.agent: {vana.agent}")
    except Exception as e:
        logger.error(f"❌ Failed to import root level vana module: {e}")

    try:
        from agents.vana import agent
        logger.info("✅ agents.vana.agent imported successfully")
        logger.debug(f"Agent object: {agent}")
    except Exception as e:
        logger.error(f"❌ Failed to import agents.vana.agent: {e}")

    # Check current working directory and Python path
    logger.debug(f"Current working directory: {os.getcwd()}")
    logger.debug(f"Python path: {sys.path[:5]}")  # First 5 entries

# Session database URL (SQLite for development)
# Use /tmp for Cloud Run compatibility (writable filesystem)
SESSION_DB_URL = "sqlite:////tmp/sessions.db"

# Allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]

# Serve web interface
SERVE_WEB_INTERFACE = True

# Security guardrail callbacks


def before_tool_callback(tool_name: str, tool_args: dict, session):
    """Validate tool arguments before execution."""
    path_arg = tool_args.get("file_path") or tool_args.get("directory_path")
    if path_arg and (".." in path_arg or path_arg.startswith("/")):
        raise ValueError("Invalid path access")


def after_model_callback(agent_name: str, response: str, session):
    """Lightweight policy check on model responses."""
    banned = ["malware", "illegal"]
    if any(word in response.lower() for word in banned):
        logger.warning("Policy violation detected in response")

# Create the FastAPI app using ADK
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_db_url=SESSION_DB_URL,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)
checkpoint_4_memory = psutil.Process().memory_info().rss / 1024 / 1024
startup_end_time = time.time()
total_startup_time = startup_end_time - startup_start_time
total_memory_delta = checkpoint_4_memory - startup_start_memory
print(f"STARTUP PROFILING: After FastAPI app creation: {checkpoint_4_memory:.1f}MB (+{checkpoint_4_memory - checkpoint_3_memory:.1f}MB)")
print(f"STARTUP PROFILING SUMMARY: Total time: {total_startup_time:.2f}s, Total memory: {checkpoint_4_memory:.1f}MB (delta: +{total_memory_delta:.1f}MB)")

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
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
