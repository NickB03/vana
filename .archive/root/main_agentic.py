#!/usr/bin/env python3
"""
VANA Agentic AI - Main Entry Point
Uses the new hierarchical agent system with activated specialists.
"""

import os
import sys
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Load environment variables
load_dotenv()

from api.endpoints import router as api_router
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import time
from typing import Dict, Any, List

from lib.logging_config import get_logger
from lib.context.specialist_context import create_specialist_context, SpecialistContext

logger = get_logger("main_agentic")

# Import the new agentic team configuration
os.environ["VANA_AGENT_MODULE"] = "agents.vana.team_agentic"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("🚀 Starting VANA Agentic AI Server...")
    logger.info("📊 Phase 2: A2A Protocol & Distributed Architecture Active")
    logger.info(f"🌐 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"🤖 Model: {os.getenv('VANA_MODEL', 'gemini-2.5-flash')}")

    # Initialize A2A Protocol
    try:
        from agents.protocols.a2a_protocol import get_a2a_protocol
        a2a_protocol = await get_a2a_protocol("vana_master")
        app.state.a2a_protocol = a2a_protocol
        
        # Register available specialists
        await register_specialists(a2a_protocol)
        
        logger.info("✅ A2A Protocol initialized")
    except Exception as e:
        logger.error(f"Failed to initialize A2A Protocol: {e}")

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

    # Cleanup A2A Protocol
    try:
        from agents.protocols.a2a_protocol import shutdown_a2a_protocol
        await shutdown_a2a_protocol()
        logger.info("✅ A2A Protocol shutdown complete")
    except Exception as e:
        logger.error(f"Failed to shutdown A2A Protocol: {e}")

    logger.info("👋 Shutting down VANA Agentic AI Server...")


async def register_specialists(a2a_protocol):
    """Register specialist agents with the A2A protocol"""
    base_url = f"http://localhost:{os.getenv('PORT', 8081)}"
    
    specialists = [
        ("architecture_specialist", ["code_analysis", "design_patterns", "refactoring"]),
        ("data_science_specialist", ["data_analysis", "statistics", "ml_guidance"]),
        ("security_specialist", ["vulnerability_scan", "security_review", "threat_analysis"]),
        ("devops_specialist", ["ci_cd", "deployment", "infrastructure"]),
        ("qa_specialist", ["testing", "coverage_analysis", "bug_detection"]),
        ("ui_specialist", ["ui_design", "accessibility", "user_experience"])
    ]
    
    for name, capabilities in specialists:
        await a2a_protocol.register_specialist(
            name=name,
            endpoint=f"{base_url}/specialist/{name}",
            capabilities=capabilities
        )
        logger.info(f"Registered specialist: {name} with capabilities: {capabilities}")


# Create FastAPI app
app = FastAPI(
    title="VANA Agentic AI API",
    description="Advanced Multi-Agent AI System with Hierarchical Orchestration",
    version="2.0.0-alpha",
    lifespan=lifespan,
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
        "http://127.0.0.1:5179",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


# Pydantic models for A2A protocol
class AgentRequest(BaseModel):
    request_id: str
    source_agent: str
    target_agent: str
    task_type: str
    data: Dict[str, Any]
    context: Dict[str, Any] = {}
    priority: int = 1
    timeout: float = 30.0
    # Phase 3 enhancements
    user_id: str = None
    session_id: str = None
    use_enhanced_context: bool = True


class AgentResponse(BaseModel):
    request_id: str
    source_agent: str
    target_agent: str
    success: bool
    data: Any
    error: str = None
    execution_time: float


# A2A Protocol REST Endpoints

@app.post("/specialist/{specialist_name}/execute", response_model=AgentResponse)
async def execute_specialist(specialist_name: str, request: AgentRequest):
    """Execute a task on a specific specialist agent"""
    start_time = time.time()
    
    try:
        # Get the specialist and execute the task
        specialist = await get_specialist(specialist_name)
        if not specialist:
            raise HTTPException(status_code=404, detail=f"Specialist '{specialist_name}' not found")
        
        # Execute the task (this is a simplified version - in a real implementation,
        # this would call the actual specialist agent)
        result = await execute_specialist_task(specialist, request.data, request.context)
        
        execution_time = time.time() - start_time
        
        return AgentResponse(
            request_id=request.request_id,
            source_agent=request.source_agent,
            target_agent=request.target_agent,
            success=True,
            data=result,
            execution_time=execution_time
        )
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Specialist execution failed: {e}")
        
        return AgentResponse(
            request_id=request.request_id,
            source_agent=request.source_agent,
            target_agent=request.target_agent,
            success=False,
            data=None,
            error=str(e),
            execution_time=execution_time
        )


@app.post("/a2a/parallel_execute")
async def parallel_execute(specialists: List[str], request: AgentRequest):
    """Execute a task on multiple specialists in parallel"""
    try:
        a2a_protocol = app.state.a2a_protocol
        
        # Convert request to A2A format
        from agents.protocols.a2a_protocol import A2ARequest
        a2a_request = A2ARequest(
            request_id=request.request_id,
            source_agent=request.source_agent,
            target_agent="parallel",
            task_type=request.task_type,
            data=request.data,
            context=request.context,
            priority=request.priority,
            timeout=request.timeout
        )
        
        # Execute in parallel
        results = await a2a_protocol.parallel_route(a2a_request, specialists)
        
        return {
            "request_id": request.request_id,
            "specialists": specialists,
            "results": [
                {
                    "specialist": result.target_agent,
                    "success": result.success,
                    "data": result.data,
                    "error": result.error,
                    "execution_time": result.execution_time
                }
                for result in results
            ],
            "total_time": max([r.execution_time for r in results], default=0.0)
        }
        
    except Exception as e:
        logger.error(f"Parallel execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/a2a/metrics")
async def get_a2a_metrics():
    """Get A2A protocol performance metrics"""
    try:
        a2a_protocol = app.state.a2a_protocol
        return a2a_protocol.get_performance_metrics()
    except Exception as e:
        logger.error(f"Failed to get A2A metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/a2a/agents")
async def list_agents():
    """List all registered agents and their status"""
    try:
        a2a_protocol = app.state.a2a_protocol
        agents = {}
        
        for name, agent in a2a_protocol.registry.agents.items():
            agents[name] = {
                "name": agent.name,
                "url": agent.url,
                "status": agent.status.value,
                "capabilities": agent.capabilities,
                "load_factor": agent.load_factor,
                "response_time_avg": agent.response_time_avg,
                "success_count": agent.success_count,
                "error_count": agent.error_count,
                "last_seen": agent.last_seen.isoformat()
            }
        
        return {"agents": agents, "total": len(agents)}
        
    except Exception as e:
        logger.error(f"Failed to list agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions

async def get_specialist(specialist_name: str):
    """Get a specialist agent by name"""
    try:
        # Map specialist names to actual implementations
        specialist_map = {
            "architecture_specialist": "agents.specialists.architecture_specialist",
            "data_science_specialist": "agents.specialists.data_science_specialist", 
            "security_specialist": "agents.specialists.security_specialist",
            "devops_specialist": "agents.specialists.devops_specialist",
            "qa_specialist": "agents.specialists.qa_specialist",
            "ui_specialist": "agents.specialists.ui_specialist"
        }
        
        if specialist_name not in specialist_map:
            return None
            
        # For now, return a mock specialist
        return {"name": specialist_name, "module": specialist_map[specialist_name]}
        
    except Exception as e:
        logger.error(f"Failed to get specialist {specialist_name}: {e}")
        return None


async def execute_specialist_task(specialist, data: Dict[str, Any], context: Dict[str, Any]):
    """Execute a task on a specialist agent"""
    # This is a simplified implementation
    # In practice, this would call the actual specialist agent
    
    return {
        "specialist": specialist["name"],
        "task_completed": True,
        "data_processed": len(str(data)),
        "context_used": bool(context),
        "timestamp": time.time()
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "2.0.0-alpha",
        "agent_system": "distributed",
        "phase": "2",
        "features": [
            "VANA Chat Agent",
            "A2A Protocol",
            "Parallel Execution",
            "Distributed Specialists",
            "Fault Tolerance",
            "Performance Monitoring",
        ],
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8081))
    uvicorn.run("main_agentic:app", host="0.0.0.0", port=port, reload=True, log_level="info")
