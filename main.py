"""
VANA Agent - FastAPI Entry Point

This module provides the FastAPI entry point for the VANA agent using Google ADK.
Automatically detects environment and configures authentication appropriately.
Includes proper ADK memory service initialization for vector search and RAG pipeline.
"""

import os
import uvicorn
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Initialize lazy initialization manager (prevents import hanging)
from lib._shared_libraries.lazy_initialization import lazy_manager
logger.info("Lazy initialization manager ready - services will initialize on first use")

# Get the directory where main.py is located - this is where the agent files are now located
# Supporting directories are now in lib/ to avoid being treated as agents
AGENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agents")
print(f"Agent directory: {AGENT_DIR}")
print(f"Directory exists: {os.path.exists(AGENT_DIR)}")
if os.path.exists(AGENT_DIR):
    print(f"Agent files in directory: {[f for f in os.listdir(AGENT_DIR) if f.endswith('.py') or f == '__init__.py']}")
    print(f"Directories in agent dir: {[d for d in os.listdir(AGENT_DIR) if os.path.isdir(os.path.join(AGENT_DIR, d)) and not d.startswith('.')]}")

    # Check if vana agent can be imported
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        import vana
        print(f"✅ Root level vana module imported successfully: {vana}")
        print(f"✅ Root level vana.agent: {vana.agent}")
    except Exception as e:
        print(f"❌ Failed to import root level vana module: {e}")

    try:
        from agents.vana import agent
        print(f"✅ agents.vana.agent imported successfully: {agent}")
    except Exception as e:
        print(f"❌ Failed to import agents.vana.agent: {e}")

    # Check current working directory and Python path
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python path: {sys.path[:5]}")  # First 5 entries

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

# Import WebUI routes
from lib.webui_routes import router as webui_router

# Add WebUI routes
app.include_router(webui_router)

# Mount static files for React frontend
static_dir = "/app/static"
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    logger.info(f"Mounted static files from {static_dir}")
else:
    logger.warning(f"Static directory {static_dir} not found - React frontend not available")

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

# React Router fallback - serve index.html for client-side routing
@app.get("/dashboard/{path:path}")
async def serve_react_app(path: str):
    """Serve React app for client-side routing"""
    static_dir = "/app/static"
    index_file = os.path.join(static_dir, "index.html")

    if os.path.exists(index_file):
        return FileResponse(index_file)
    else:
        logger.error(f"React index.html not found at {index_file}")
        raise HTTPException(status_code=404, detail="Frontend not available")

@app.get("/dashboard")
async def serve_react_root():
    """Serve React app root"""
    static_dir = "/app/static"
    index_file = os.path.join(static_dir, "index.html")

    if os.path.exists(index_file):
        return FileResponse(index_file)
    else:
        logger.error(f"React index.html not found at {index_file}")
        raise HTTPException(status_code=404, detail="Frontend not available")

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
