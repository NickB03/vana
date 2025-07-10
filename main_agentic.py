#!/usr/bin/env python3
"""
VANA Agentic AI - Main Entry Point
Uses the new hierarchical agent system with activated specialists.
"""

import os
import sys
import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Load environment variables
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import router as api_router
from lib.logging_config import get_logger

logger = get_logger("main_agentic")

# Import the new agentic team configuration
os.environ["VANA_AGENT_MODULE"] = "agents.vana.team_agentic"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("🚀 Starting VANA Agentic AI Server...")
    logger.info("📊 Phase 1: Hierarchical Agent System Active")
    logger.info(f"🌐 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"🤖 Model: {os.getenv('VANA_MODEL', 'gemini-2.0-flash')}")
    
    # Log agent configuration
    try:
        from agents.vana.team_agentic import root_agent
        logger.info(f"✅ Root Agent: {root_agent.name}")
        logger.info(f"✅ Sub-agents: {len(root_agent.sub_agents)}")
        if root_agent.sub_agents:
            orchestrator = root_agent.sub_agents[0]
            logger.info(f"✅ Orchestrator: {orchestrator.name}")
            logger.info(f"✅ Specialists: {len(orchestrator.sub_agents)}")
    except Exception as e:
        logger.error(f"Failed to load agent configuration: {e}")
    
    yield
    
    logger.info("👋 Shutting down VANA Agentic AI Server...")

# Create FastAPI app
app = FastAPI(
    title="VANA Agentic AI API",
    description="Advanced Multi-Agent AI System with Hierarchical Orchestration",
    version="2.0.0-alpha",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5177",
        "http://localhost:5179",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5179"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "2.0.0-alpha",
        "agent_system": "hierarchical",
        "phase": "1",
        "features": [
            "VANA Chat Agent",
            "Master Orchestrator",
            "5 Active Specialists",
            "Task Complexity Analysis",
            "Intelligent Routing"
        ]
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8081))
    uvicorn.run(
        "main_agentic:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )