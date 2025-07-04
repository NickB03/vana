"""
VANA Custom Web UI
A modern web interface for the VANA multi-agent system
Based on agent.minimax.io design aesthetic
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Add the parent directory to sys.path to import VANA modules
sys.path.append(str(Path(__file__).parent.parent))

# Import VANA components
try:
    from agents.vana.team import VANAOrchestrator
    from lib.logging.structured_logger import logger
except ImportError as e:
    logging.error(f"Failed to import VANA components: {e}")
    # Create a fallback logger
    logger = logging.getLogger(__name__)
    VANAOrchestrator = None

app = FastAPI(title="VANA Web UI", description="Custom web interface for VANA multi-agent system")

# Static files and templates
static_dir = Path(__file__).parent / "static"
templates_dir = Path(__file__).parent / "templates"

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
templates = Jinja2Templates(directory=str(templates_dir))

# Global VANA orchestrator instance
vana_orchestrator: Optional[object] = None

# Connection manager for WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.conversation_history: List[Dict] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connection established. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket connection closed. Total connections: {len(self.active_connections)}")

    async def send_message(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")

    def add_to_history(self, role: str, content: str):
        self.conversation_history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    """Initialize VANA orchestrator on startup"""
    global vana_orchestrator
    try:
        if VANAOrchestrator:
            vana_orchestrator = VANAOrchestrator()
            logger.info("VANA Orchestrator initialized successfully")
        else:
            logger.warning("VANA Orchestrator not available - running in demo mode")
    except Exception as e:
        logger.error(f"Failed to initialize VANA Orchestrator: {e}")

@app.get("/", response_class=HTMLResponse)
async def get_homepage(request: Request):
    """Serve the main chat interface"""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "title": "VANA - AI Agent System"
    })

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "vana_available": vana_orchestrator is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            user_message = message_data.get("message", "")
            if not user_message:
                continue
                
            # Add user message to history
            manager.add_to_history("user", user_message)
            
            # Send acknowledgment
            await manager.send_message(websocket, {
                "type": "user_message_received",
                "message": user_message,
                "timestamp": datetime.now().isoformat()
            })
            
            # Process with VANA or fallback
            if vana_orchestrator:
                await process_with_vana(websocket, user_message)
            else:
                await process_fallback(websocket, user_message)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.send_message(websocket, {
            "type": "error",
            "message": f"An error occurred: {str(e)}"
        })

async def process_with_vana(websocket: WebSocket, user_message: str):
    """Process user message with VANA orchestrator"""
    try:
        # Send typing indicator
        await manager.send_message(websocket, {
            "type": "agent_typing",
            "message": "VANA is thinking..."
        })
        
        # Create a task for VANA processing
        response_content = ""
        
        # Simulate VANA processing with streaming response
        # In a real implementation, this would call the actual VANA orchestrator
        await manager.send_message(websocket, {
            "type": "agent_response_start",
            "agent": "VANA Orchestrator"
        })
        
        # Simulate streaming response
        demo_response = f"I received your message: '{user_message}'. This is a demo response from the VANA system. The orchestrator would process your request using the available agents and tools."
        
        for i, char in enumerate(demo_response):
            response_content += char
            if i % 10 == 0:  # Send chunks every 10 characters
                await manager.send_message(websocket, {
                    "type": "agent_response_chunk",
                    "content": char,
                    "full_content": response_content
                })
                await asyncio.sleep(0.05)  # Simulate realistic typing speed
        
        # Send final response
        await manager.send_message(websocket, {
            "type": "agent_response_complete",
            "content": response_content,
            "agent": "VANA Orchestrator",
            "timestamp": datetime.now().isoformat()
        })
        
        # Add to history
        manager.add_to_history("assistant", response_content)
        
    except Exception as e:
        logger.error(f"Error processing with VANA: {e}")
        await manager.send_message(websocket, {
            "type": "error",
            "message": f"VANA processing error: {str(e)}"
        })

async def process_fallback(websocket: WebSocket, user_message: str):
    """Fallback processing when VANA is not available"""
    await manager.send_message(websocket, {
        "type": "agent_typing",
        "message": "Demo mode active..."
    })
    
    await asyncio.sleep(1)  # Simulate processing time
    
    demo_response = f"Demo Mode: I received your message '{user_message}'. VANA orchestrator is not currently available. This is a fallback response to demonstrate the web interface."
    
    await manager.send_message(websocket, {
        "type": "agent_response_complete",
        "content": demo_response,
        "agent": "Demo Mode",
        "timestamp": datetime.now().isoformat()
    })
    
    manager.add_to_history("assistant", demo_response)

@app.get("/api/history")
async def get_conversation_history():
    """Get conversation history"""
    return {
        "history": manager.conversation_history,
        "total_messages": len(manager.conversation_history)
    }

@app.post("/api/clear")
async def clear_conversation():
    """Clear conversation history"""
    manager.conversation_history.clear()
    return {"status": "cleared"}

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", "8000"))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
