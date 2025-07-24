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
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
# Environment-aware CORS: permissive for development, restrictive for production
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ALLOWED_ORIGINS = ["*"] if ENVIRONMENT == "development" else [
    "https://vana-ai.com",  # Update with your actual domain when ready
    # Add more allowed origins as needed for production
]

# Enable ADK web interface at /dev-ui
SERVE_WEB_INTERFACE = True

# Create FastAPI app using ADK's official pattern
# Note: get_fast_api_app doesn't accept session_service_uri directly
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

# Remove the default root redirect that ADK adds
# This allows us to serve our custom frontend at root
for route in app.routes:
    if hasattr(route, 'path') and route.path == '/' and hasattr(route, 'response_class'):
        # Remove ADK's root redirect
        app.routes.remove(route)
        break

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

# Serve static files (React build) if they exist
FRONTEND_BUILD_DIR = os.path.join(PROJECT_ROOT, "frontend", "dist")
if os.path.exists(FRONTEND_BUILD_DIR):
    # Mount static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD_DIR, "assets")), name="assets")
    
    # Serve React app at root
    @app.get("/")
    async def serve_root():
        """Serve the React app at root"""
        return FileResponse(os.path.join(FRONTEND_BUILD_DIR, "index.html"))
    
    # Serve index.html for favicon
    @app.get("/favicon.ico")
    async def serve_favicon():
        favicon_path = os.path.join(FRONTEND_BUILD_DIR, "favicon.ico")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        # Return vite.svg as fallback
        vite_svg_path = os.path.join(FRONTEND_BUILD_DIR, "vite.svg")
        if os.path.exists(vite_svg_path):
            return FileResponse(vite_svg_path)
        return {"detail": "Not found"}, 404
    
    # Catch-all route for React Router - must be last
    # This needs to be registered with lower priority than ADK routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React app for all non-API routes"""
        # Skip ADK-specific paths
        if full_path.startswith(("apps/", "run_sse", "list-apps", "debug/", "dev-ui/")):
            # Return 404 to let ADK's error handler take over
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
            
        # Check if requesting a specific static file
        file_path = os.path.join(FRONTEND_BUILD_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # For all other routes, serve index.html (React Router handles client-side routing)
        return FileResponse(os.path.join(FRONTEND_BUILD_DIR, "index.html"))
    
    print("📦 Frontend static files mounted successfully")
else:
    print("⚠️  Frontend build not found. Run 'cd frontend && npm run build' to build the frontend.")

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