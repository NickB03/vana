import os
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Dict, Any, AsyncGenerator, List
import logging
import json
import asyncio
from datetime import datetime
import uuid
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

# Import the VANA agent
from agents.vana.team import root_agent

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize ADK components
session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="vana",
    session_service=session_service
)

app = FastAPI()

# Load API_KEY from environment (no hardcoded values)
app.add_event_handler("startup", lambda: logger.warning("Ensure VITE_API_KEY is set in environment") if not os.getenv("VITE_API_KEY") else None)

# CORS Configuration - Single source of truth for allowed origins
ALLOWED_ORIGINS = ["http://localhost:5173"]  # Frontend runs on port 5173

app.add_middleware(
  CORSMiddleware,
  allow_origins=ALLOWED_ORIGINS,
  allow_credentials=True,
  allow_methods=["GET", "POST", "OPTIONS"],
  allow_headers=["Content-Type", "Authorization"]
)

# OPTIONS Preflight Handler
@app.middleware("http")
async def preflight_handler(request: Request, call_next):
    if request.method == "OPTIONS":
        origin = request.headers.get("origin")
        if origin in ALLOWED_ORIGINS:
            return Response("{'content': 'Preflight check successful'}", media_type='application/json', headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            })
        return Response(status_code=403)
    return await call_next(request)

# VANA Agent Endpoint - Process requests through the actual VANA orchestrator
@app.post("/run")
async def run_vana(request: Request) -> Dict[str, Any]:
    """Process user input through the VANA orchestrator agent."""
    try:
        # Get request data
        data = await request.json()
        user_input = data.get("input", "")
        
        if not user_input:
            raise HTTPException(status_code=400, detail="No input provided")
        
        logger.info(f"Processing request: {user_input[:50]}...")
        
        # Process through VANA agent using ADK Runner
        try:
            # Create session for this request with secure ID
            session_id = f"session_{uuid.uuid4()}"
            user_id = "api_user"
            
            # Create session first - this is required
            # The session service create_session is already async, so just await it
            session = await session_service.create_session(
                app_name="vana",
                user_id=user_id,
                session_id=session_id
            )
            
            # Create content from user input with explicit user role
            user_message = Content(parts=[Part(text=user_input)], role="user")
            
            # Run the agent and collect response
            output_text = ""
            # Use regular for loop since runner.run() returns a generator
            for event in runner.run(
                user_id=user_id,
                session_id=session_id,
                new_message=user_message
            ):
                if event.is_final_response():
                    # Extract text from the response content
                    if hasattr(event, 'content') and event.content:
                        if hasattr(event.content, 'parts') and event.content.parts:
                            output_text = event.content.parts[0].text
                        elif hasattr(event.content, 'text'):
                            output_text = event.content.text
                        else:
                            output_text = str(event.content)
            
            if not output_text:
                output_text = "I processed your request but couldn't generate a response."
            
            logger.info(f"Agent response: {output_text[:100]}...")
            
            # Return in the expected format
            return {
                "result": {
                    "output": output_text,
                    "id": session_id
                }
            }
            
        except Exception as agent_error:
            logger.error(f"Agent processing error: {agent_error}")
            # Fallback to a helpful error message
            return {
                "result": {
                    "output": "I encountered an error processing your request. Please try again.",
                    "id": f"error_{uuid.uuid4()}"
                }
            }
            
    except Exception as e:
        logger.error(f"Request handling error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Data models for chat completions API
class ChatMessage:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content

class ChatCompletionRequest:
    def __init__(self, messages: List[Dict[str, Any]], stream: bool = False):
        self.messages = [ChatMessage(msg["role"], msg["content"]) for msg in messages]
        self.stream = stream

class AgentStatusTracker:
    """Track agent delegation and status updates for streaming"""
    def __init__(self):
        self.current_status = "thinking"
        self.delegated_agent = None
        self.status_history = []
    
    def update_status(self, status: str, agent: str = None):
        self.current_status = status
        if agent:
            self.delegated_agent = agent
        self.status_history.append({
            "status": status,
            "agent": agent,
            "timestamp": datetime.now().isoformat()
        })

# Global status tracker
status_tracker = AgentStatusTracker()

async def process_vana_agent(user_input: str) -> str:
    """Process input through VANA agent and return response text"""
    try:
        # Create session for this request
        session_id = f"stream_session_{datetime.now().timestamp()}"
        user_id = "api_user"
        
        session = await session_service.create_session(
            app_name="vana",
            user_id=user_id,
            session_id=session_id
        )
        
        # Create content from user input with explicit user role
        user_message = Content(parts=[Part(text=user_input)], role="user")
        
        # Run the agent and collect response
        output_text = ""
        # Use regular for loop since runner.run() returns a generator
        for event in runner.run(
            user_id=user_id,
            session_id=session_id,
            new_message=user_message
        ):
            if event.is_final_response():
                # Extract text from the response content
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts') and event.content.parts:
                        output_text = event.content.parts[0].text
                    elif hasattr(event.content, 'text'):
                        output_text = event.content.text
                    else:
                        output_text = str(event.content)
        
        return output_text if output_text else "I processed your request but couldn't generate a response."
            
    except Exception as e:
        logger.error(f"Agent processing error: {e}")
        return f"I encountered an error processing your request: {str(e)}. Please try again."

async def stream_agent_response(user_input: str, session_id: str = None) -> AsyncGenerator[str, None]:
    """Stream VANA agent response with status updates"""
    try:
        # Initial thinking status
        status_tracker.update_status("analyzing_request")
        yield f"data: {json.dumps({'type': 'status', 'content': 'Analyzing your request...', 'status': 'analyzing_request'})}\n\n"
        
        await asyncio.sleep(0.1)  # Brief pause for UX
        
        # Process through VANA agent
        status_tracker.update_status("processing")
        yield f"data: {json.dumps({'type': 'status', 'content': 'Processing with VANA...', 'status': 'processing'})}\n\n"
        
        # Get response from agent
        output_text = await process_vana_agent(user_input)
        
        # Check if agent was delegated by looking for transfer patterns
        if "transfer_to_agent" in output_text.lower() or "delegating" in output_text.lower():
            status_tracker.update_status("delegating_to_specialist")
            yield f"data: {json.dumps({'type': 'status', 'content': 'Delegating to specialist agent...', 'status': 'delegating_to_specialist'})}\n\n"
            await asyncio.sleep(0.5)
            
            status_tracker.update_status("specialist_working")
            yield f"data: {json.dumps({'type': 'status', 'content': 'Specialist agent analyzing...', 'status': 'specialist_working'})}\n\n"
            await asyncio.sleep(1.0)
            
            status_tracker.update_status("specialist_complete")
            yield f"data: {json.dumps({'type': 'status', 'content': 'Specialist analysis complete...', 'status': 'specialist_complete'})}\n\n"
            await asyncio.sleep(0.3)
        
        # Final response preparation
        status_tracker.update_status("preparing_response")
        yield f"data: {json.dumps({'type': 'status', 'content': 'Preparing response...', 'status': 'preparing_response'})}\n\n"
        
        await asyncio.sleep(0.2)
        
        # Stream the actual response (chunked for better UX)
        status_tracker.update_status("responding")
        words = output_text.split()
        for i in range(0, len(words), 3):  # Stream 3 words at a time
            chunk = " ".join(words[i:i+3])
            if i > 0:
                chunk = " " + chunk
            yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
            await asyncio.sleep(0.05)  # Small delay for streaming effect
        
        # End of stream
        yield f"data: {json.dumps({'type': 'done', 'status': 'complete'})}\n\n"
        
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': 'I encountered an error. Please try again.'})}\n\n"

# OpenAI-compatible chat completions endpoint with streaming support
@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """OpenAI-compatible chat completions API with streaming support"""
    try:
        data = await request.json()
        chat_request = ChatCompletionRequest(
            messages=data.get("messages", []),
            stream=data.get("stream", False)
        )
        
        if not chat_request.messages:
            raise HTTPException(status_code=400, detail="No messages provided")
        
        # Get the latest user message
        user_message = None
        for msg in reversed(chat_request.messages):
            if msg.role == "user":
                user_message = msg.content
                break
        
        if not user_message:
            raise HTTPException(status_code=400, detail="No user message found")
        
        logger.info(f"Chat completion request: {user_message[:50]}...")
        
        if chat_request.stream:
            # Return streaming response
            return StreamingResponse(
                stream_agent_response(user_message),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else "*",
                    "Access-Control-Allow-Credentials": "true"
                }
            )
        else:
            # Non-streaming response (fallback)
            output_text = await process_vana_agent(user_message)
            
            return {
                "id": f"chatcmpl-{os.getpid()}-{int(datetime.now().timestamp())}",
                "object": "chat.completion",
                "created": int(datetime.now().timestamp()),
                "model": "vana",
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": output_text
                    },
                    "finish_reason": "stop"
                }]
            }
            
    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Existing endpoints can remain here
@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # Ensure proper port binding and logging
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="debug")
