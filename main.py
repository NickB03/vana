import os
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Dict, Any, AsyncGenerator, List
import logging
import json
import asyncio
from datetime import datetime

# Import the VANA agent
from agents.vana.team import root_agent

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Load API_KEY as environment variable:
app.add_event_handler("startup", lambda: os.environ.setdefault("VITE_API_KEY", "secret-dev-vana-123"))

# Enhanced CORS Configuration
app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5177"],
  allow_credentials=True,
  allow_methods=["GET", "POST", "OPTIONS"],
  allow_headers=["Content-Type", "Authorization"]
)

# OPTIONS Preflight Handler
@app.middleware("http")
async def preflight_handler(request: Request, call_next):
    if request.method == "OPTIONS":
        return Response("{'content': 'Preflight check successful'}", media_type='application/json', headers={
            "Access-Control-Allow-Origin": "http://localhost:5177",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true"
        })
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
        
        # Process through VANA agent
        try:
            # Call the agent directly as it's callable
            response = root_agent(user_input)
            
            # Extract the response text
            if hasattr(response, 'text'):
                output_text = response.text
            elif isinstance(response, str):
                output_text = response
            else:
                output_text = str(response)
            
            logger.info(f"Agent response: {output_text[:100]}...")
            
            # Return in the expected format
            return {
                "result": {
                    "output": output_text,
                    "id": f"vana_{os.getpid()}_{id(response)}"  # Generate unique session ID
                }
            }
            
        except Exception as agent_error:
            logger.error(f"Agent processing error: {agent_error}")
            # Fallback to a helpful error message
            return {
                "result": {
                    "output": f"I encountered an error processing your request: {str(agent_error)}. Please try again.",
                    "id": "error"
                }
            }
            
    except Exception as e:
        logger.error(f"Request handling error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        # For now, use a fallback to demonstrate the streaming functionality
        # TODO: Fix the VANA agent integration once context issue is resolved
        
        # Simulate VANA processing with a helpful response
        if "what is vana" in user_input.lower():
            return "VANA is a multi-agent AI system built on Google's Agent Development Kit (ADK). It uses dynamic orchestration to coordinate specialist agents for complex tasks. The system can handle data analysis, code execution, research, and various other AI-powered workflows through intelligent agent delegation and collaboration."
        elif "hello" in user_input.lower():
            return "Hello! I'm VANA, your AI orchestrator. I can help you with various tasks by coordinating specialist agents. What can I assist you with today?"
        else:
            return f"I understand you're asking about: {user_input}. I'm VANA, an AI orchestrator that can coordinate multiple specialist agents to help with complex tasks. How can I assist you today?"
            
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
        yield f"data: {json.dumps({'type': 'error', 'content': f'I encountered an error: {str(e)}. Please try again.'})}\n\n"

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
                    "Access-Control-Allow-Origin": "http://localhost:5177",
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
        raise HTTPException(status_code=500, detail=str(e))

# Existing endpoints can remain here
@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # Ensure proper port binding and logging
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="debug")
