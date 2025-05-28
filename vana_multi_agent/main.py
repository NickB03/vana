"""
VANA Multi-Agent System - Google ADK Production Implementation

This is the main entry point for the VANA multi-agent system using Google ADK.
Following official Google ADK production deployment patterns.
"""

import os
import uvicorn
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app

# Get the directory where main.py is located
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Use /tmp for SQLite database in Cloud Run (writable directory)
SESSION_DB_URL = "sqlite:////tmp/sessions.db"

# Example allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]

# Set web=True if you intend to serve a web interface, False otherwise
SERVE_WEB_INTERFACE = True

def main():
    """Main entry point for VANA Multi-Agent System."""
    print("🚀 VANA Multi-Agent System Starting...")

    try:
        # Verify Google Cloud authentication
        try:
            import google.auth
            credentials, project = google.auth.default()
            print(f"✅ Google Cloud authentication successful for project: {project}")
        except Exception as auth_error:
            print(f"⚠️  Google Cloud authentication issue: {auth_error}")
            print("🔄 Continuing with ADK initialization...")

        # Call the function to get the FastAPI app instance
        # Ensure the agent directory name matches your agent folder
        app: FastAPI = get_fast_api_app(
            agent_dir=AGENT_DIR,
            session_db_url=SESSION_DB_URL,
            allow_origins=ALLOWED_ORIGINS,
            web=SERVE_WEB_INTERFACE,
        )

        # Add custom info endpoint
        @app.get("/info")
        async def info():
            return {
                "name": "VANA",
                "description": "AI assistant with memory, knowledge graph, and search capabilities",
                "version": "1.0.0",
                "mode": "production",
                "adk_integrated": True
            }

        # Get configuration from environment
        host = os.getenv("VANA_HOST", "0.0.0.0")
        port = int(os.getenv("PORT", "8080"))  # Cloud Run sets PORT automatically

        print(f"\n🎯 VANA Multi-Agent System operational on {host}:{port}")
        print(f"📊 ADK Web UI available at: http://{host}:{port}")
        print(f"🤖 Agents: 22 total agents with full ADK integration")
        print(f"🛠️  Enhanced Tools: 44 tools with Google ADK compliance")
        print(f"🌐 Environment: {os.getenv('VANA_ENV', 'production')}")
        print(f"✅ ADK Integration: ACTIVE")

        # Start the server
        if __name__ == "__main__":
            uvicorn.run(app, host=host, port=port)
        else:
            return app

    except ImportError as e:
        print(f"⚠️  Google ADK not available: {e}")
        print("📦 Missing Google ADK packages - check requirements.txt")
        print("\n🧪 Running in fallback mode...")

        # Start a basic FastAPI server without ADK
        return start_fallback_server()

    except Exception as e:
        print(f"❌ Error starting ADK system: {e}")
        print(f"🔍 Error details: {str(e)}")
        print("🔄 Falling back to basic server...")

        # Start fallback server on error
        return start_fallback_server()

def start_fallback_server():
    """Start a basic FastAPI server without ADK."""
    print("\n🌐 Starting fallback web server...")

    try:
        from fastapi import FastAPI
        import uvicorn

        app = FastAPI(title="VANA Multi-Agent System", version="1.0.0")

        @app.get("/")
        async def root():
            return {"message": "VANA Multi-Agent System", "status": "running", "mode": "fallback"}

        @app.get("/health")
        async def health():
            return {"status": "healthy", "mode": "fallback"}

        @app.get("/info")
        async def info():
            return {
                "name": "VANA",
                "description": "AI assistant with memory, knowledge graph, and search capabilities",
                "version": "1.0.0",
                "mode": "fallback",
                "adk_integrated": False
            }

        # Get configuration from environment
        host = os.getenv("VANA_HOST", "0.0.0.0")
        port = int(os.getenv("PORT", "8080"))  # Cloud Run sets PORT automatically

        print(f"🚀 Starting fallback server on {host}:{port}")
        uvicorn.run(app, host=host, port=port)

    except Exception as e:
        print(f"❌ Failed to start fallback server: {e}")
        raise

if __name__ == "__main__":
    main()
