import asyncio
import json
import logging
import os
import re
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

# Set up logging FIRST
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for ADK components (initialized later)
runner: Optional[Any] = None
adk_processor: Optional[Any] = None
root_agent: Optional[Any] = None

# Feature flags
USE_ADK_EVENTS = os.getenv('USE_ADK_EVENTS', 'false').lower() == 'true'
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')

# Create FastAPI app immediately
app = FastAPI()

# Health check endpoint (no ADK required)
@app.get("/health")
async def health():
    """Basic health check that doesn't require ADK"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "vana-staging",
        "adk_initialized": runner is not None,
        "api_key_present": bool(GOOGLE_API_KEY)
    }

# Startup event to initialize ADK components
@app.on_event("startup")
async def startup_event():
    """Initialize ADK components after app starts"""
    global runner, adk_processor, root_agent
    
    logger.info("=== VANA Starting Up ===")
    logger.info(f"PORT: {os.getenv('PORT', '8081')}")
    logger.info(f"GOOGLE_API_KEY present: {bool(GOOGLE_API_KEY)}")
    logger.info(f"USE_ADK_EVENTS: {USE_ADK_EVENTS}")
    
    if not GOOGLE_API_KEY:
        logger.error("❌ GOOGLE_API_KEY not found! ADK features will be disabled.")
        logger.error("Set GOOGLE_API_KEY environment variable for full functionality.")
        return
    
    try:
        # Import ADK components only when needed
        logger.info("Importing ADK components...")
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai.types import Content, Part
        
        # Import VANA components
        logger.info("Importing VANA agents...")
        from agents.vana.team import root_agent as imported_root_agent
        from lib.response_formatter import ResponseFormatter
        from lib.adk_integration import VANAEventProcessor, create_adk_processor
        
        root_agent = imported_root_agent
        
        # Initialize ADK
        logger.info("Initializing ADK components...")
        session_service = InMemorySessionService()
        runner = Runner(agent=root_agent, app_name="vana", session_service=session_service)
        
        if USE_ADK_EVENTS:
            adk_processor = create_adk_processor(runner)
            
        logger.info("✅ ADK initialization complete!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize ADK: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # App continues running without ADK features

# Import the rest of the original main.py content here...
# (Copy all the route handlers, CORS config, etc. from original main.py)

# Enhanced CORS Configuration
class CorsConfig:
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:8081",
        "https://vana-dev-960076421399.us-central1.run.app",
        "https://vana-dev-qqugqgsbcq-uc.a.run.app",
        "https://vana-staging-960076421399.us-central1.run.app",
        "https://vana-staging-qqugqgsbcq-uc.a.run.app",
    ]
    
    ALLOWED_ORIGIN_PATTERNS = [
        r"https://vana-staging-.*\.run\.app",
        r"https://vana-production-.*\.run\.app",
        r"https://.*\.vercel\.app",
    ]
    
    @staticmethod
    def is_origin_allowed(origin: str) -> bool:
        if not origin:
            return False
        if origin in CorsConfig.ALLOWED_ORIGINS:
            return True
        for pattern in CorsConfig.ALLOWED_ORIGIN_PATTERNS:
            if re.match(pattern, origin):
                return True
        return False

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Basic chat endpoint with ADK check
@app.post("/chat")
async def chat_endpoint(request: Request):
    """Chat endpoint with graceful degradation"""
    if not runner:
        return {
            "type": "error",
            "content": "ADK not initialized. Please check server logs for details."
        }
    
    # Add the full chat implementation here
    data = await request.json()
    return {
        "type": "content",
        "content": "Chat endpoint is ready but full implementation needed."
    }

# Root route
@app.get("/")
async def serve_frontend():
    """Serve the frontend index.html for the root path"""
    if os.path.exists("vana-ui/dist/index.html"):
        from fastapi.responses import FileResponse
        return FileResponse("vana-ui/dist/index.html")
    else:
        return {"message": "VANA API is running", "status": "ready", "frontend": "not_built"}

# Mount static files
if os.path.exists("vana-ui/dist/assets"):
    app.mount("/assets", StaticFiles(directory="vana-ui/dist/assets"), name="assets")
    logger.info("✅ Frontend assets mounted at /assets")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8081"))
    logger.info(f"Starting VANA on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")