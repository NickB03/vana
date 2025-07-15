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

# Create FastAPI app first
app = FastAPI()

# Global variables for ADK components (will be initialized on startup)
runner: Optional[Any] = None
adk_processor: Optional[Any] = None
session_service: Optional[Any] = None
root_agent: Optional[Any] = None
ResponseFormatter: Optional[Any] = None

# Feature flags
USE_ADK_EVENTS = os.getenv('USE_ADK_EVENTS', 'false').lower() == 'true'

# Initialize ADK components on startup
@app.on_event("startup")
async def startup_event():
    """Initialize ADK components after app starts"""
    global runner, adk_processor, session_service, root_agent, ResponseFormatter
    
    logger.info("=== VANA Starting Up ===")
    logger.info(f"PORT: {os.getenv('PORT', '8081')}")
    logger.info(f"GOOGLE_API_KEY present: {bool(os.getenv('GOOGLE_API_KEY'))}")
    logger.info(f"USE_ADK_EVENTS: {USE_ADK_EVENTS}")
    
    try:
        # Import ADK components
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai.types import Content, Part
        
        # Import VANA components
        from agents.vana.team import root_agent as imported_root_agent
        from lib.response_formatter import ResponseFormatter as imported_formatter
        from lib.adk_integration import VANAEventProcessor, create_adk_processor
        
        # Assign to globals
        root_agent = imported_root_agent
        ResponseFormatter = imported_formatter
        
        # Initialize ADK
        session_service = InMemorySessionService()
        runner = Runner(agent=root_agent, app_name="vana", session_service=session_service)
        
        # Create ADK event processor for new event streaming
        adk_processor = create_adk_processor(runner) if USE_ADK_EVENTS else None
        
        logger.info(f"ADK Event Streaming: {'ENABLED' if USE_ADK_EVENTS else 'DISABLED'}")
        logger.info("✅ ADK initialization complete!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize ADK: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.warning("Service will run with limited functionality")

# Load API_KEY from environment (no hardcoded values)
@app.on_event("startup")
async def check_api_key():
    if not os.getenv("VITE_API_KEY"):
        logger.warning("Ensure VITE_API_KEY is set in environment")

# Enhanced CORS Configuration with pattern matching
class CorsConfig:
    # Explicit allowed origins
    ALLOWED_ORIGINS = [
        "http://localhost:5173",  # Local frontend development
        "http://localhost:8081",  # Local backend serving frontend
        "https://vana-dev-960076421399.us-central1.run.app",  # Production vana-dev
        "https://vana-dev-qqugqgsbcq-uc.a.run.app",  # Production vana-dev (new)
        "https://vana-staging-960076421399.us-central1.run.app",  # Staging environment
        "https://vana-staging-qqugqgsbcq-uc.a.run.app",  # Staging (expected by frontend)
    ]
    
    # Pattern-based origin matching for dynamic deployments
    ALLOWED_ORIGIN_PATTERNS = [
        r"https://vana-staging-.*\.run\.app",  # Any staging deployment
        r"https://vana-production-.*\.run\.app",  # Any production deployment
        r"https://.*\.vercel\.app",  # Vercel preview deployments
    ]
    
    @staticmethod
    def is_origin_allowed(origin: str) -> bool:
        if not origin:
            return False
            
        # Check explicit origins first
        if origin in CorsConfig.ALLOWED_ORIGINS:
            return True
        
        # Check pattern matching
        for pattern in CorsConfig.ALLOWED_ORIGIN_PATTERNS:
            if re.match(pattern, origin):
                return True
        
        return False

# Legacy compatibility
ALLOWED_ORIGINS = CorsConfig.ALLOWED_ORIGINS

# Enhanced CORS middleware with dynamic origin checking
@app.middleware("http")
async def enhanced_cors_handler(request: Request, call_next):
    origin = request.headers.get("origin")
    
    # Handle preflight requests
    if request.method == "OPTIONS":
        if origin and CorsConfig.is_origin_allowed(origin):
            return Response(
                json.dumps({"status": "preflight_success"}),
                media_type="application/json",
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "86400",  # 24 hours
                },
            )
        
        # Log failed preflight for debugging
        logger.warning(f"CORS preflight failed for origin: {origin}")
        return Response(
            json.dumps({"error": "CORS preflight failed", "origin": origin}),
            status_code=403,
            media_type="application/json",
            headers={
                "Content-Type": "application/json"
            }
        )
    
    # Process the request
    response = await call_next(request)
    
    # Add CORS headers to actual responses
    if origin and CorsConfig.is_origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Keep the original CORS middleware as fallback
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # We handle this in our custom middleware
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# VANA Agent Endpoint - Process requests through the actual VANA orchestrator
@app.post("/run")
async def run_vana(request: Request) -> Dict[str, Any]:
    """Process user input through the VANA orchestrator agent."""
    if not runner:
        raise HTTPException(status_code=503, detail="ADK not initialized. Please try again later.")
        
    try:
        # Get request data
        data = await request.json()
        user_input = data.get("input", "")

        if not user_input:
            raise HTTPException(status_code=400, detail="No input provided")

        logger.info(f"Processing request: {user_input[:50]}...")

        # Process through VANA agent using ADK Runner
        try:
            # Import types only when needed
            from google.genai.types import Content, Part
            
            # Create session for this request with secure ID
            session_id = f"session_{uuid.uuid4()}"
            user_id = "api_user"

            # Create session first - this is required
            session = await session_service.create_session(app_name="vana", user_id=user_id, session_id=session_id)

            # Create content from user input with explicit user role
            user_message = Content(parts=[Part(text=user_input)], role="user")

            # Run the agent and collect response
            output_text = ""
            # Use regular for loop since runner.run() returns a generator
            for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
                if event.is_final_response():
                    # Extract text from the response content
                    if hasattr(event, "content") and event.content:
                        if hasattr(event.content, "parts") and event.content.parts:
                            output_text = event.content.parts[0].text
                        elif hasattr(event.content, "text"):
                            output_text = event.content.text
                        else:
                            output_text = str(event.content)

            if not output_text:
                output_text = "I processed your request but couldn't generate a response."

            logger.info(f"Agent response: {output_text[:100]}...")

            # Return in the expected format
            return {"result": {"output": output_text, "id": session_id}}

        except Exception as agent_error:
            logger.error(f"Agent processing error: {agent_error}")
            # Fallback to a helpful error message
            return {
                "result": {
                    "output": "I encountered an error processing your request. Please try again.",
                    "id": f"error_{uuid.uuid4()}",
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
        self.status_history.append({"status": status, "agent": agent, "timestamp": datetime.now().isoformat()})

# Global status tracker
status_tracker = AgentStatusTracker()

async def process_vana_agent(user_input: str, session_id: str = None) -> str:
    """Process input through VANA agent and return response text"""
    if not runner or not session_service:
        return "ADK not initialized. Please try again later."
        
    try:
        # Import types only when needed
        from google.genai.types import Content, Part
        
        # Use provided session_id or create a new one
        if not session_id:
            session_id = f"stream_session_{datetime.now().timestamp()}"
        user_id = "api_user"

        # Check if session exists, otherwise create it
        try:
            session = await session_service.get_session(user_id=user_id, session_id=session_id)
        except:
            session = await session_service.create_session(app_name="vana", user_id=user_id, session_id=session_id)

        # Create content from user input with explicit user role
        user_message = Content(parts=[Part(text=user_input)], role="user")

        # Run the agent and collect response
        output_text = ""
        # Use regular for loop since runner.run() returns a generator
        for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
            if event.is_final_response():
                # Extract text from the response content
                if hasattr(event, "content") and event.content:
                    if hasattr(event.content, "parts") and event.content.parts:
                        output_text = event.content.parts[0].text
                    elif hasattr(event.content, "text"):
                        output_text = event.content.text
                    else:
                        output_text = str(event.content)

        # Format response to ensure clean output
        if output_text and ResponseFormatter:
            output_text = ResponseFormatter.format_response(output_text)
            # Ensure markdown formatting is preserved
            output_text = ResponseFormatter.ensure_markdown_formatting(output_text)
        
        return output_text if output_text else "I processed your request but couldn't generate a response."

    except Exception as e:
        logger.error(f"Agent processing error: {e}")
        return f"I encountered an error processing your request: {str(e)}. Please try again."

thinking_events_queue = []

async def emit_thinking_event(event):
    """Queue thinking events for streaming"""
    thinking_events_queue.append(event)

async def process_vana_agent_with_events(user_input: str, session_id: str = None) -> tuple[str, list]:
    """Process user input through VANA agent with event tracking"""
    
    # Check if ADK is initialized
    if not runner:
        return "ADK not initialized. Please try again later.", []
    
    # Use ADK event processor if available
    if USE_ADK_EVENTS and adk_processor:
        thinking_events = []
        output_text = ""
        
        try:
            # Process with real ADK events
            async for event in adk_processor.process_with_adk_events(user_input, session_id or f"session_{uuid.uuid4()}"):
                if event['type'] == 'content':
                    output_text += event['content']
                elif not event.get('internal'):  # Only collect non-internal events for thinking panel
                    thinking_events.append(event)
                    
            return output_text, thinking_events
            
        except Exception as e:
            logger.error(f"ADK event processing error: {e}")
            import traceback
            logger.error(f"ADK traceback: {traceback.format_exc()}")
            # Fall back to hardcoded implementation
            
    # Fallback: Hardcoded implementation for when ADK events are disabled
    thinking_events = []
    
    try:
        # Add initial thinking event
        thinking_events.append({'type': 'thinking', 'content': 'Understanding your request...', 'status': 'analyzing'})
        
        # Check query for specialist routing and show in thinking panel
        query_lower = user_input.lower()
        if any(word in query_lower for word in ["security", "vulnerable", "safe", "threat"]):
            thinking_events.append({'type': 'thinking', 'agent': 'security_specialist', 'content': 'Assigning Security Specialist for vulnerability analysis...', 'status': 'active'})
        elif any(word in query_lower for word in ["data", "analyze", "statistics", "trend"]):
            thinking_events.append({'type': 'thinking', 'agent': 'data_science_specialist', 'content': 'Assigning Data Science Specialist for analysis...', 'status': 'active'})
        elif any(word in query_lower for word in ["code", "architecture", "design", "refactor"]):
            thinking_events.append({'type': 'thinking', 'agent': 'architecture_specialist', 'content': 'Assigning Architecture Specialist for code review...', 'status': 'active'})
        elif any(word in query_lower for word in ["deploy", "ci/cd", "infrastructure", "docker"]):
            thinking_events.append({'type': 'thinking', 'agent': 'devops_specialist', 'content': 'Assigning DevOps Specialist for deployment analysis...', 'status': 'active'})
        elif any(word in query_lower for word in ["test", "qa", "quality", "coverage"]):
            thinking_events.append({'type': 'thinking', 'agent': 'qa_specialist', 'content': 'Assigning QA Specialist for quality assessment...', 'status': 'active'})
        elif any(word in query_lower for word in ["ui", "ux", "interface", "component", "design"]):
            thinking_events.append({'type': 'thinking', 'agent': 'ui_specialist', 'content': 'Assigning UI/UX Specialist for interface design...', 'status': 'active'})
        else:
            thinking_events.append({'type': 'thinking', 'content': 'Processing your request...', 'status': 'active'})
        
        # Process through normal agent
        output_text = await process_vana_agent(user_input, session_id)
        
        # Add completion event
        thinking_events.append({'type': 'thinking', 'content': 'Finalizing response...', 'status': 'complete'})
        
        return output_text, thinking_events

    except Exception as e:
        logger.error(f"Agent processing error: {e}")
        return f"I encountered an error processing your request: {str(e)}. Please try again.", thinking_events

async def stream_agent_response(user_input: str, session_id: str = None) -> AsyncGenerator[str, None]:
    """Stream VANA agent response with real orchestration events"""
    
    # Check if ADK is initialized
    if not runner:
        yield f"data: {json.dumps({'type': 'error', 'content': 'ADK not initialized. Please try again later.'})}\n\n"
        return
    
    # Use ADK streaming if available
    if USE_ADK_EVENTS and adk_processor:
        try:
            async for sse_event in adk_processor.stream_response(user_input, session_id):
                yield sse_event
        except Exception as e:
            logger.error(f"ADK streaming error: {e}")
            import traceback
            logger.error(f"ADK streaming traceback: {traceback.format_exc()}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'I encountered an error. Please try again.'})}\n\n"
        return
    
    # Fallback: Original hardcoded implementation
    try:
        # Initial thinking status
        status_tracker.update_status("analyzing_request")
        yield f"data: {json.dumps({'type': 'thinking', 'content': 'Understanding your request...', 'status': 'analyzing_request'})}\n\n"

        await asyncio.sleep(0.1)  # Brief pause for UX

        # Don't mention orchestrator activation - just show what's happening
        yield f"data: {json.dumps({'type': 'thinking', 'content': 'Determining best approach...', 'status': 'routing'})}\n\n"
        
        # Process through VANA agent with event tracking
        status_tracker.update_status("processing")
        output_text, thinking_events = await process_vana_agent_with_events(user_input, session_id)
        
        # Stream thinking events
        for event in thinking_events:
            yield f"data: {json.dumps({'type': 'thinking', **event})}\n\n"
            await asyncio.sleep(0.3)  # Small delay between events

        # Final response preparation
        status_tracker.update_status("preparing_response")
        yield f"data: {json.dumps({'type': 'thinking', 'content': 'Finalizing response...', 'status': 'preparing_response'})}\n\n"

        await asyncio.sleep(0.2)

        # Stream the actual response (chunked for better UX)
        words = output_text.split()
        for i in range(0, len(words), 3):  # Stream 3 words at a time
            chunk = " ".join(words[i : i + 3])
            if i > 0:
                chunk = " " + chunk
            yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
            await asyncio.sleep(0.05)  # Small delay for streaming effect

        # End of stream
        yield f"data: {json.dumps({'type': 'done', 'status': 'complete'})}\n\n"

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': 'I encountered an error. Please try again.'})}\n\n"

# New /chat endpoint for frontend SSE streaming
@app.post("/chat")
async def chat_endpoint(request: Request):
    """Streaming chat endpoint for VANA frontend with ThinkingPanel events"""
    try:
        data = await request.json()
        message = data.get("message", "")
        session_id = data.get("session_id")
        stream = data.get("stream", True)
        
        if not message:
            raise HTTPException(status_code=400, detail="No message provided")
        
        if stream:
            return StreamingResponse(
                stream_agent_response(message, session_id),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )
        else:
            # Non-streaming fallback
            output_text = await process_vana_agent(message, session_id)
            return {"type": "content", "content": output_text}
    
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# OpenAI-compatible chat completions endpoint with streaming support
@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """OpenAI-compatible chat completions API with streaming support"""
    if not runner:
        raise HTTPException(status_code=503, detail="ADK not initialized. Please try again later.")
        
    try:
        data = await request.json()
        chat_request = ChatCompletionRequest(messages=data.get("messages", []), stream=data.get("stream", False))

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
                    "Access-Control-Allow-Credentials": "true",
                },
            )
        else:
            # Non-streaming response (fallback)
            output_text = await process_vana_agent(user_message)

            return {
                "id": f"chatcmpl-{os.getpid()}-{int(datetime.now().timestamp())}",
                "object": "chat.completion",
                "created": int(datetime.now().timestamp()),
                "model": "vana",
                "choices": [
                    {"index": 0, "message": {"role": "assistant", "content": output_text}, "finish_reason": "stop"}
                ],
            }

    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Enhanced health check and diagnostics
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "vana-staging",
        "cors_config": {
            "allowed_origins": len(CorsConfig.ALLOWED_ORIGINS),
            "pattern_matching": True,
            "patterns": len(CorsConfig.ALLOWED_ORIGIN_PATTERNS)
        },
        "adk_initialized": runner is not None,
        "api_key_present": bool(os.getenv("GOOGLE_API_KEY"))
    }

@app.get("/diagnostics/cors")
async def cors_diagnostics(request: Request):
    """CORS configuration diagnostics"""
    origin = request.headers.get("origin")
    return {
        "request_origin": origin,
        "origin_allowed": CorsConfig.is_origin_allowed(origin) if origin else False,
        "configured_origins": CorsConfig.ALLOWED_ORIGINS,
        "origin_patterns": CorsConfig.ALLOWED_ORIGIN_PATTERNS,
        "headers": dict(request.headers)
    }

# API-first routing: Serve frontend as fallback only for root path
@app.get("/")
async def serve_frontend():
    """Serve the frontend index.html for the root path"""
    if os.path.exists("vana-ui/dist/index.html"):
        from fastapi.responses import FileResponse
        return FileResponse("vana-ui/dist/index.html")
    else:
        return {"message": "VANA API is running", "status": "ready", "frontend": "not_built"}

# Mount static assets at /assets to avoid route conflicts
if os.path.exists("vana-ui/dist/assets"):
    app.mount("/assets", StaticFiles(directory="vana-ui/dist/assets"), name="assets")
    logger.info("✅ Frontend assets mounted at /assets")

# Mount other static files at /static (favicon, etc.)
if os.path.exists("vana-ui/dist"):
    from fastapi import Response
    import mimetypes
    
    @app.get("/{file_path:path}")
    async def serve_static_files(file_path: str):
        """Serve static files as fallback, but only for actual files"""
        # Don't serve API paths as static files
        if file_path.startswith(('api/', 'run', 'chat', 'health', 'v1/', 'diagnostics/')):
            raise HTTPException(status_code=404, detail="API endpoint not found")
            
        static_file = f"vana-ui/dist/{file_path}"
        if os.path.exists(static_file) and os.path.isfile(static_file):
            # Determine content type
            content_type, _ = mimetypes.guess_type(static_file)
            if content_type is None:
                content_type = "application/octet-stream"
            
            with open(static_file, "rb") as f:
                content = f.read()
            return Response(content=content, media_type=content_type)
        
        # For SPA routing, return index.html for unmatched paths
        if os.path.exists("vana-ui/dist/index.html"):
            from fastapi.responses import FileResponse
            return FileResponse("vana-ui/dist/index.html")
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    logger.info("✅ Frontend SPA routing configured with API precedence")
else:
    logger.warning("⚠️ Frontend build not found at vana-ui/dist - UI will not be available")

if __name__ == "__main__":
    import uvicorn

    # Use PORT env var for CloudRun, default to 8081
    port = int(os.getenv("PORT", "8081"))
    
    # Ensure proper port binding and logging
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")