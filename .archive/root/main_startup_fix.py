# This is a minimal fix to the original main.py
# Just wrap the ADK initialization in try-except and move to startup

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

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create app first
app = FastAPI()

# Global variables for ADK components
runner: Optional[Any] = None
adk_processor: Optional[Any] = None
session_service: Optional[Any] = None

# Feature flag for ADK event streaming
USE_ADK_EVENTS = os.getenv('USE_ADK_EVENTS', 'false').lower() == 'true'

# Initialize ADK on startup
@app.on_event("startup")
async def startup_event():
    global runner, adk_processor, session_service
    
    try:
        logger.info("Starting VANA initialization...")
        logger.info(f"GOOGLE_API_KEY present: {bool(os.getenv('GOOGLE_API_KEY'))}")
        
        # Now do the imports that might fail
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai.types import Content, Part
        from agents.vana.team import root_agent
        from lib.response_formatter import ResponseFormatter
        from lib.adk_integration import VANAEventProcessor, create_adk_processor
        
        # Initialize ADK components
        session_service = InMemorySessionService()
        runner = Runner(agent=root_agent, app_name="vana", session_service=session_service)
        
        # Create ADK event processor for new event streaming
        adk_processor = create_adk_processor(runner) if USE_ADK_EVENTS else None
        
        logger.info("✅ VANA initialization complete!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize VANA: {str(e)}")
        logger.error(f"The service will run with limited functionality")
        # Don't crash - let the service run

# Now include all the original code but reference the global variables
# ... (rest of original main.py content goes here)